const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');
const { findRevertedFiles: findRevertedIn, runGit: runGitIn } = require('./revertidos');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
// Por padrão só este computador acessa. Para os jogadores entrarem pela rede: HOST=0.0.0.0.
const host = process.env.HOST || '127.0.0.1';
// Senha do mestre (GM_KEY). Em casa é opcional: serve para o tablet (http://IP:8000/?mestre=senha).
// No servidor da nuvem é obrigatória: o mestre entra por /mestre.
const gmKey = process.env.GM_KEY || '';
// MODO=hospedado: a wiki roda num servidor, atrás do Caddy. Aí "este computador" não é o mestre
// (toda conexão chega do próprio servidor) e só a senha libera a visão do mestre.
const hosted = process.env.MODO === 'hospedado';
// Dados que mudam pela própria wiki (personagens, códigos, Publicar, regras da loja): no servidor ficam
// fora da pasta do git (DADOS=/srv/fieldbook/dados), para a atualização nunca mexer neles.
// DADOS_PERSONAGENS troca só a pasta dos personagens e códigos (os testes usam uma pasta temporária).
const dataDir = path.resolve(process.env.DADOS || root);
const charactersDataDir = path.resolve(process.env.DADOS || process.env.DADOS_PERSONAGENS || root);
// A mesa do Foundry: o link que aparece na wiki e onde perguntar se ela está aberta.
const foundryUrl = String(process.env.FOUNDRY_URL || '').replace(/\/+$/, '');
const foundryStatusUrl = process.env.FOUNDRY_STATUS || (foundryUrl ? 'http://127.0.0.1:30000/api/status' : '');
// Onde o backup diário do servidor grava (servidor/backup.sh): o mestre baixa o mais recente pela wiki.
const backupDir = process.env.BACKUPS ? path.resolve(process.env.BACKUPS) : '';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

// O que um jogador (qualquer aparelho que não seja o do mestre) pode baixar.
// Os arquivos de regras não têm notas de campanha; elas ficam no index.html.
const playerFiles = new Set([
  '/jogadores.html', '/jogadores.json', '/mestre.html', '/wiki.css', '/wiki-app.js',
  '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-glossario.js',
  '/system-criacao.js', '/loja-catalogo.js', '/criador.js',
  '/nightcity-map-base.jpg', '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css'
]);
const playerFolders = ['/cyberpunk-css-main/cyberpunk-css-main/fonts/'];

const isLoopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
const cookieKey = request => ((request.headers.cookie || '').match(/(?:^|;\s*)gm=([^;]+)/) || [])[1] || '';
const sameSecret = (given, expected) => {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
// Pelo túnel do Cloudflare (abrir-online.ps1) toda conexão chega de 127.0.0.1, mas vem de fora de casa.
// O túnel sempre põe estes cabeçalhos: quem os traz é jogador, a não ser que tenha o cookie do mestre.
const viaTunnel = request => Boolean(request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']);
// O cookie guarda uma assinatura da senha, não a senha: trocar a GM_KEY desconecta todos os aparelhos.
const gmToken = gmKey ? crypto.createHmac('sha256', gmKey).update('fieldbook-mestre-v1').digest('hex') : '';
const hasGmCookie = request => {
  if (!gmKey) return false;
  const given = decodeURIComponent(cookieKey(request));
  return sameSecret(given, gmToken) || sameSecret(given, gmKey); // o segundo: cookie antigo, de antes da assinatura
};
const isGameMaster = request => (!hosted && isLoopback(request.socket.remoteAddress) && !viaTunnel(request)) || hasGmCookie(request);
// Atrás do Caddy o endereço de quem chegou vem no X-Forwarded-For (o Caddy descarta o que o visitante mandar).
const clientIp = request => String(request.headers['cf-connecting-ip'] || (request.headers['x-forwarded-for'] || '').split(',')[0] || request.socket.remoteAddress).trim();
const gmCookie = (value, maxAge) => `gm=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${hosted ? '; Secure' : ''}`;

// Senha do mestre errada: 10 tentativas a cada 10 minutos por endereço.
const loginAttempts = new Map();
function tooManyLogins(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.until) { loginAttempts.set(ip, { count: 1, until: now + 10 * 60 * 1000 }); return false; }
  entry.count += 1;
  return entry.count > 10;
}

// O abrir-online.ps1 confere este cabeçalho para saber se o servidor já entende o túnel.
const SERVER_VERSION = { 'X-Wiki-Servidor': '2' };

function send(response, status, text, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...SERVER_VERSION, ...headers });
  response.end(text);
}

// ---------------- Alerta de arquivo revertido ----------------
// O OneDrive já voltou arquivos da campanha para versões antigas: revertidos.js compara com o git.
const runGit = args => runGitIn(root, args);

let healthCache = { at: 0, result: null };
async function health() {
  if (hosted) return null; // no servidor ninguém edita a pasta: ela só recebe o que vem do GitHub
  if (Date.now() - healthCache.at > 30_000) healthCache = { at: Date.now(), result: await findRevertedIn(root) };
  return healthCache.result;
}

// ---------------- Estado: versão no ar e mesa do Foundry ----------------
// A versão é o último commit da pasta (no servidor, o que veio do GitHub): o publicar.bat espera ela mudar.
let versionCache = { at: 0, result: null };
async function version() {
  if (Date.now() - versionCache.at > 15_000) {
    const [commit, data] = ((await runGit(['log', '-1', '--format=%h%x09%cI'])) || '').trim().split('\t');
    versionCache = { at: Date.now(), result: commit ? { commit, data } : null };
  }
  return versionCache.result;
}
// O Foundry responde em /api/status se tem mundo aberto e quantos estão conectados.
let tableCache = { at: 0, result: null };
async function tableStatus() {
  if (!foundryStatusUrl) return null;
  if (Date.now() - tableCache.at > 15_000) {
    let result = { url: foundryUrl || null, online: false };
    try {
      const response = await fetch(foundryStatusUrl, { signal: AbortSignal.timeout(2500), cache: 'no-store' });
      const status = await response.json();
      result = { url: foundryUrl || null, online: true, mundo: status.world || null, aberta: Boolean(status.active && status.world), usuarios: Number(status.users) || 0 };
    } catch { /* Foundry desligado ou reiniciando */ }
    tableCache = { at: Date.now(), result };
  }
  return tableCache.result;
}

// ---------------- Pasta de dados ----------------
// O que a wiki grava (Publicar) fica na pasta de dados. Na primeira vez num servidor novo, começa
// com a cópia que veio no git.
const dataFile = name => path.join(dataDir, name);
if (dataDir !== root) {
  fs.mkdirSync(dataDir, { recursive: true });
  for (const name of ['jogadores.json', 'jogadores-mestre.json']) {
    if (!fs.existsSync(dataFile(name)) && fs.existsSync(path.join(root, name))) fs.copyFileSync(path.join(root, name), dataFile(name));
  }
}
const dataFiles = new Set(['/jogadores.json', '/jogadores-mestre.json']);

function readJsonBody(request, limit = 10_000) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return reject(Object.assign(new Error('Envie JSON.'), { status: 415 }));
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; if (body.length > limit) { reject(Object.assign(new Error('Grande demais.'), { status: 413 })); request.destroy(); } });
    request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(Object.assign(new Error('JSON inválido.'), { status: 400 })); } });
    request.on('error', reject);
  });
}
const sendJson = (response, status, data, headers = {}) => send(response, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers });

// Entrar e sair como mestre (a tela é o mestre.html).
async function gmLogin(request, response) {
  if (!gmKey) return sendJson(response, 400, { erro: 'Esta wiki não tem senha do mestre (GM_KEY).' });
  const ip = clientIp(request);
  if (tooManyLogins(ip)) return sendJson(response, 429, { erro: 'Muitas tentativas. Espere 10 minutos.' });
  let senha = '';
  try { senha = String((await readJsonBody(request)).senha || ''); } catch (error) { return sendJson(response, error.status || 400, { erro: error.message }); }
  if (!sameSecret(senha, gmKey)) return sendJson(response, 403, { erro: 'Senha incorreta.' });
  loginAttempts.delete(ip);
  return sendJson(response, 200, { ok: true }, { 'Set-Cookie': gmCookie(gmToken, 31536000) });
}

// Grava primeiro num arquivo temporário e depois troca: nunca fica um JSON pela metade.
// No Windows a troca falha se outro programa (o OneDrive, por exemplo) estiver com o arquivo aberto
// naquele instante: tenta de novo por até 2 segundos e, se desistir, apaga o temporário.
async function writeJsonAtomic(file, data) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  for (let attempt = 1; ; attempt += 1) {
    try {
      fs.renameSync(temporary, file);
      return;
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
        fs.rmSync(temporary, { force: true });
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

function publishPlayerView(request, response) {
  // Só JSON: um formulário de outro site aberto no navegador do mestre não consegue mandar isso sem permissão.
  if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return send(response, 415, 'Envie JSON (Content-Type: application/json).');
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 2_000_000) { send(response, 413, 'Conteúdo grande demais.'); request.destroy(); }
  });
  request.on('end', async () => {
    let payload;
    try { payload = JSON.parse(body); } catch { return send(response, 400, 'JSON inválido.'); }
    const { mestre, publicado } = payload || {};
    const lists = ['npcs', 'lugares', 'noticias'];
    if (!mestre || !publicado || !lists.every(key => Array.isArray(mestre[key]) && Array.isArray(publicado[key]))) {
      return send(response, 400, 'Formato inesperado: faltam as listas npcs, lugares e noticias.');
    }
    const atualizado = new Date().toISOString();
    try {
      await writeJsonAtomic(dataFile('jogadores-mestre.json'), { ...mestre, atualizado });
      await writeJsonAtomic(dataFile('jogadores.json'), { ...publicado, atualizado });
    } catch (error) {
      return send(response, 500, `Não consegui gravar os arquivos: ${error.message}`);
    }
    send(response, 200, JSON.stringify({ ok: true, atualizado }), { 'Content-Type': 'application/json; charset=utf-8' });
  });
}

// Personagens dos jogadores, códigos de acesso e o importador do Foundry (api-personagens.js).
const characterApi = require('./api-personagens')({ dataDir: charactersDataDir, isGameMaster, send, writeJsonAtomic, sameSecret, foundryUrl });

http.createServer((request, response) => {
  let url;
  let pathname;
  try {
    url = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(response, 400, 'Bad request');
  }

  // Tablet do mestre em casa: /?mestre=senha grava um cookie e libera a visão do mestre neste aparelho.
  // No servidor, senha no endereço ficaria no histórico e nos registros: lá o mestre entra por /mestre.
  if (gmKey && url.searchParams.has('mestre')) {
    if (hosted) { response.writeHead(302, { ...SERVER_VERSION, Location: '/mestre' }); return response.end(); }
    if (!sameSecret(url.searchParams.get('mestre'), gmKey)) return send(response, 403, 'Senha do mestre incorreta.');
    response.writeHead(302, { ...SERVER_VERSION, 'Cache-Control': 'private, no-store', 'Set-Cookie': gmCookie(gmToken, 31536000), Location: '/' });
    return response.end();
  }

  const gameMaster = isGameMaster(request);

  if (pathname === '/api/mestre/entrar' && request.method === 'POST') return void gmLogin(request, response);
  if (pathname === '/api/mestre/sair' && request.method === 'POST') return sendJson(response, 200, { ok: true }, { 'Set-Cookie': gmCookie('', 0) });
  // Estado para a barra lateral: a mesa do Foundry, a versão no ar e se este aparelho é o do mestre.
  if (pathname === '/api/estado') {
    return Promise.all([version(), tableStatus()]).then(([versao, mesa]) => sendJson(response, 200, { modo: hosted ? 'hospedado' : 'local', mestre: gameMaster, login: Boolean(gmKey), versao, mesa, backup: gameMaster && Boolean(backupDir) }));
  }
  if (pathname === '/mestre') pathname = '/mestre.html';
  // Backup mais recente (dados da wiki e mundos do Foundry), para o mestre guardar uma cópia fora do servidor.
  if (pathname === '/api/backup') {
    if (!gameMaster) return send(response, 403, 'Só o mestre.');
    let newest = '';
    try { newest = fs.readdirSync(backupDir).filter(name => /^backup-[\w-]+\.tar\.gz$/.test(name)).sort().pop() || ''; } catch { /* sem pasta de backup */ }
    if (!newest) return send(response, 404, 'Nenhum backup ainda (o servidor faz um por dia).');
    const file = path.join(backupDir, newest);
    response.writeHead(200, { ...SERVER_VERSION, 'Content-Type': 'application/gzip', 'Content-Length': fs.statSync(file).size, 'Content-Disposition': `attachment; filename="${newest}"`, 'Cache-Control': 'private, no-store' });
    return void pipeline(fs.createReadStream(file), response, () => {});
  }

  if (pathname === '/api/saude') {
    if (!gameMaster) return send(response, 403, 'Só o mestre.');
    return health().then(reverted => send(response, 200, JSON.stringify({ git: reverted !== null, revertidos: reverted || [] }), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' }));
  }
  if (/^\/api\/(eu|entrar|sair|contas|personagens|loja)(\/|$)/.test(pathname)) return void characterApi(request, response, pathname);
  if (pathname === '/api/jogadores') {
    if (request.method !== 'POST') return send(response, 405, 'Use POST.');
    if (!gameMaster) return send(response, 403, 'Só o mestre publica.');
    return publishPlayerView(request, response);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'Método não permitido.');

  if (pathname === '/') pathname = gameMaster ? '/index.html' : '/jogadores.html';

  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) return send(response, 403, 'Forbidden');
  // Confere a lista dos jogadores no caminho já resolvido: no Windows, "fonts/..\..\index.html" escaparia da pasta.
  const servedPath = `/${path.relative(root, filePath).split(path.sep).join('/')}`;
  const playerFile = playerFiles.has(servedPath) || playerFolders.some(folder => servedPath.startsWith(folder));
  if (!gameMaster && !playerFile) {
    return send(response, 403, 'Área do mestre. A visão dos jogadores fica em /jogadores.html');
  }
  // O que o Publicar grava vem da pasta de dados (no servidor, fora da pasta do git).
  const sourcePath = dataFiles.has(servedPath) ? dataFile(servedPath.slice(1)) : filePath;

  fs.stat(sourcePath, (error, stats) => {
    if (error || !stats.isFile()) return send(response, 404, 'Not found');
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      ...SERVER_VERSION,
      'Content-Length': stats.size,
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      // Os dados publicados mudam durante a sessão, e arquivo do mestre não pode ficar no cache do túnel
      // (senão o Cloudflare entregaria a cópia a um jogador): nunca guardar em cache.
      ...(extension === '.json' || !playerFile ? { 'Cache-Control': 'private, no-store' } : {})
    });
    if (request.method === 'HEAD') return response.end();
    // A conexão pode ter caído enquanto o stat rodava: aí o arquivo nem é aberto
    // (o pipeline lança erro com a resposta já fechada, e isso derrubava o servidor).
    if (response.destroyed) return;
    // pipeline fecha o arquivo mesmo se a conexão cair no meio. Com .pipe, o arquivo ficava aberto,
    // e o Windows então não deixava o Publicar trocar o jogadores.json (EPERM).
    const stream = fs.createReadStream(sourcePath);
    try {
      pipeline(stream, response, () => {});
    } catch {
      stream.destroy();
    }
  });
}).listen(port, host, () => {
  if (hosted) {
    console.log(`Wiki hospedada na porta ${port} (atrás do Caddy). Dados em ${dataDir}.`);
    if (!gmKey) console.log('\x1b[31mATENÇÃO: sem GM_KEY ninguém entra como mestre.\x1b[0m');
    if (foundryUrl) console.log(`Mesa do Foundry: ${foundryUrl}`);
    return;
  }
  console.log(`Wiki do mestre: http://localhost:${port}`);
  health().then(reverted => {
    for (const { arquivo, commit } of reverted || []) {
      console.log(`\x1b[31mATENÇÃO: ${arquivo} voltou para uma versão antiga (${commit}), provavelmente pelo OneDrive.\n  Não edite. Para restaurar: git checkout HEAD -- "${arquivo}"\x1b[0m`);
    }
  });
  if (host === '127.0.0.1') {
    console.log('Só este computador acessa. Para os jogadores entrarem pela rede, rode com HOST=0.0.0.0.');
    return;
  }
  const addresses = Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address);
  addresses.forEach(address => console.log(`Jogadores na rede: http://${address}:${port}  (só a visão dos jogadores)`));
  console.log(gmKey ? `Mestre em outro aparelho: http://IP:${port}/?mestre=SUA_SENHA` : 'Para usar a visão do mestre em outro aparelho, rode também com GM_KEY=uma-senha.');
});
