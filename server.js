const { execFile } = require('child_process');
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
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

// O que um jogador (qualquer aparelho que não seja o do mestre) pode baixar.
// Os arquivos de regras não têm notas de campanha; elas ficam no index.html. O que o mestre publica em cada campanha
// não é arquivo: vem pela API (/api/visao), só para quem joga nela.
const playerFiles = new Set([
  '/jogadores.html', '/mestre.html', '/wiki.css', '/wiki-app.js',
  '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-blackchrome.js', '/system-glossario.js',
  '/system-criacao.js', '/personagem-roles.js', '/personagem-cyberware.js', '/loja-catalogo.js', '/popup.js', '/criador.js', '/conta.js',
  '/nightcity-map-base.webp', '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css',
  // A wiki instalada no celular: o manifesto, o service worker (sw.js) e os ícones.
  '/manifest.webmanifest', '/sw.js', '/icones/icone.svg', '/icones/icone-192.png', '/icones/icone-512.png'
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
  let given;
  try { given = decodeURIComponent(cookieKey(request)); } catch { return false; }
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
      result = { url: foundryUrl || null, online: true, mundo: status.world || null, aberta: Boolean(status.active && status.world), usuarios: Number(status.users) || 0, foundry: Number.parseInt(status.version, 10) || null };
    } catch { /* Foundry desligado ou reiniciando */ }
    tableCache = { at: Date.now(), result };
  }
  return tableCache.result;
}

// Saúde do servidor, para o mestre (só no modo hospedado): último backup, disco livre, módulo do Foundry esperando a
// mesa esvaziar e as últimas linhas do registro de publicações (servidor/atualizar.sh).
function serverHealth() {
  if (!hosted) return null;
  let backup = null;
  try {
    const newest = fs.readdirSync(backupDir).filter(name => /^backup-[\w-]+\.tar\.gz$/.test(name)).sort().pop();
    if (newest) { const stat = fs.statSync(path.join(backupDir, newest)); backup = { nome: newest, data: stat.mtime.toISOString(), tamanho: stat.size }; }
  } catch { /* sem pasta de backup */ }
  let disco = null;
  try { const s = fs.statfsSync(dataDir); disco = { livre: s.bavail * s.bsize, total: s.blocks * s.bsize }; } catch { /* sistema sem statfs */ }
  let registro = [];
  try { registro = fs.readFileSync(path.join(dataDir, 'atualizacoes.log'), 'utf8').trim().split('\n').slice(-6).reverse(); } catch { /* ainda sem publicações */ }
  return { backup, disco, moduloPendente: fs.existsSync(path.join(dataDir, '.modulo-pendente')), registro, mesas: tablesInstalled() };
}

// ---------------- Troca de mesa: o Foundry 12 ou o 14 (só no servidor) ----------------
// Os dois usam a mesma porta e o mesmo endereço, e só um roda por vez (o foundry14.service tem Conflicts com o
// foundry.service). O mestre troca pela barra lateral: a wiki liga um (que continua ligado quando o servidor reinicia) e
// desliga o outro, pelo sudo que o servidor/instalar-foundry14.sh libera só para estes comandos. A mesa no ar é a versão
// que o próprio Foundry responde em /api/status.
const MESAS = { 12: 'foundry.service', 14: 'foundry14.service' };
const systemdDir = process.env.SYSTEMD_DIR || '/etc/systemd/system';
// O comando do systemctl, numa lista em JSON (os testes usam um de mentira).
const systemctl = (() => {
  try { const lista = JSON.parse(process.env.MESA_SYSTEMCTL || ''); if (Array.isArray(lista) && lista.length) return lista.map(String); } catch { /* o padrão */ }
  return ['sudo', '-n', '/usr/bin/systemctl'];
})();
const tablesInstalled = () => (hosted ? Object.keys(MESAS).map(Number).filter(foundry => fs.existsSync(path.join(systemdDir, MESAS[foundry]))) : []);
const runSystemctl = args => new Promise((resolve, reject) => {
  execFile(systemctl[0], [...systemctl.slice(1), ...args], { timeout: 60_000 }, (error, stdout, stderr) => (error ? reject(new Error(String(stderr || error.message).trim())) : resolve()));
});
let switching = false;
async function switchTable(request, response) {
  let body;
  try { body = await readJsonBody(request); } catch (error) { return sendJson(response, error.status || 400, { erro: error.message }); }
  const alvo = Number(body.foundry);
  const outra = alvo === 12 ? 14 : 12;
  if (!MESAS[alvo]) return sendJson(response, 400, { erro: 'Escolha o Foundry 12 ou o 14.' });
  if (!tablesInstalled().includes(alvo) || !tablesInstalled().includes(outra)) return sendJson(response, 400, { erro: `O Foundry ${tablesInstalled().includes(alvo) ? outra : alvo} não está instalado no servidor.` });
  if (switching) return sendJson(response, 409, { erro: 'A mesa já está trocando.' });
  // Quem está na mesa agora (sem o estado guardado): trocar derruba quem está jogando, então pede confirmação.
  tableCache.at = 0;
  const mesa = await tableStatus();
  if (mesa && mesa.online && mesa.foundry === alvo) return sendJson(response, 200, { ok: true, foundry: alvo, jaEstava: true });
  if (mesa && mesa.usuarios > 0 && !body.forcar) {
    return sendJson(response, 409, { erro: `${mesa.usuarios} ${mesa.usuarios > 1 ? 'pessoas conectadas' : 'pessoa conectada'} na mesa agora: trocar derruba quem está jogando.`, usuarios: mesa.usuarios, confirmar: true });
  }
  switching = true;
  try {
    await runSystemctl(['enable', '--now', MESAS[alvo]]);
    await runSystemctl(['disable', MESAS[outra]]);
  } catch (error) {
    return sendJson(response, 500, { erro: `O servidor não deixou trocar a mesa (${error.message}). Na primeira vez, rode no servidor: sudo bash /srv/fieldbook/wiki/servidor/instalar-foundry14.sh` });
  } finally {
    switching = false;
    tableCache.at = 0;
  }
  console.log(`Mesa trocada para o Foundry ${alvo} pelo mestre.`);
  return sendJson(response, 200, { ok: true, foundry: alvo });
}

// ---------------- Pasta de dados ----------------
// O que a wiki grava (Publicar, campanhas) fica na pasta de dados. Na primeira vez num servidor novo, o Publicar do
// Protocolo Morana começa com a cópia que veio no git (jogadores.json e jogadores-mestre.json, de antes das campanhas).
const dataFile = name => path.join(dataDir, name);
if (dataDir !== root) {
  fs.mkdirSync(dataDir, { recursive: true });
  for (const name of ['jogadores.json', 'jogadores-mestre.json']) {
    if (!fs.existsSync(dataFile(name)) && fs.existsSync(path.join(root, name))) fs.copyFileSync(path.join(root, name), dataFile(name));
  }
}

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
// Cada gravação usa o seu temporário: duas ao mesmo tempo no mesmo arquivo não se atropelam.
let temporaryCount = 0;
async function writeJsonAtomic(file, data) {
  temporaryCount = (temporaryCount + 1) % 1e6;
  const temporary = `${file}.${process.pid}-${temporaryCount}.tmp`;
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

// Personagens dos jogadores, códigos de acesso, campanhas (com o Publicar de cada uma) e o importador do Foundry
// (api-personagens.js e api-campanhas.js).
const { ROUTES: characterApiRoutes } = require('./api-personagens');
const characterApi = require('./api-personagens')({ dataDir: charactersDataDir, legacyDir: dataDir, docsDir: path.join(root, 'documentos'), isGameMaster, send, writeJsonAtomic, sameSecret, foundryUrl, catalogFile: path.join(root, 'loja-catalogo.js'), secureCookies: hosted });

// A mesa na barra lateral, para cada um. Mundo ligado a uma campanha (o "mundo do Foundry" dela): quem joga nela vê
// a mesa aberta e o nome da campanha; quem não joga vê o Foundry sem mundo aberto (não fica sabendo de outra mesa).
// O id do mundo e a versão do Foundry só o mestre vê.
function tableFor(identity, mesa) {
  if (!mesa) return null;
  const { mundo, foundry: _versao, ...rest } = mesa;
  const campaign = mesa.aberta ? characterApi.campaigns.byWorld(mundo) : null;
  const card = campaign ? characterApi.campaignCard(campaign, identity) : null;
  if (identity.papel === 'mestre') return { ...mesa, campanha: card };
  if (!campaign) return rest;
  return identity.campanhas.includes(campaign.id) ? { ...rest, campanha: card } : { ...rest, aberta: false, usuarios: 0 };
}

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
  // Trocar a mesa entre o Foundry 12 e o 14 (só o mestre, só no servidor).
  if (pathname === '/api/mestre/mesa' && request.method === 'POST') {
    if (!gameMaster) return sendJson(response, 403, { erro: 'Só o mestre.' });
    if (!hosted) return sendJson(response, 400, { erro: 'A troca de mesa é só no servidor.' });
    return void switchTable(request, response);
  }
  // Estado para a barra lateral: a mesa do Foundry, a versão no ar e se este aparelho é o do mestre.
  if (pathname === '/api/estado') {
    return Promise.all([version(), tableStatus()]).then(([versao, mesa]) => sendJson(response, 200, { modo: hosted ? 'hospedado' : 'local', mestre: gameMaster, login: Boolean(gmKey), versao, mesa: tableFor(characterApi.who(request), mesa), backup: gameMaster && Boolean(backupDir), servidor: gameMaster ? serverHealth() : null }));
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
  if (characterApiRoutes.test(pathname)) return void characterApi(request, response, pathname);
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
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) return send(response, 404, 'Not found');
    const extension = path.extname(filePath).toLowerCase();
    // Os dados publicados mudam durante a sessão, e arquivo do mestre não pode ficar no cache do túnel
    // (senão o Cloudflare entregaria a cópia a um jogador): nunca guardar em cache. As imagens do mestre (o mapa de
    // referência, 2,7 MB) ficam só no navegador dele ("private") e são conferidas a cada vez.
    // O resto (o que os jogadores baixam): o navegador guarda e confere a cada vez (no-cache); se o arquivo não mudou,
    // a resposta é um 304 sem corpo, em vez de baixar o mapa de novo a cada abertura.
    const image = ['.webp', '.jpg', '.jpeg', '.png', '.svg'].includes(extension);
    const cacheControl = extension === '.json' || (!playerFile && !image) ? 'private, no-store' : playerFile ? 'no-cache' : 'private, no-cache';
    const etag = `W/"${stats.size.toString(36)}-${Math.round(stats.mtimeMs).toString(36)}"`;
    const cacheable = cacheControl !== 'private, no-store';
    if (cacheable && request.headers['if-none-match'] === etag) {
      response.writeHead(304, { ...SERVER_VERSION, ETag: etag, 'Cache-Control': cacheControl });
      return response.end();
    }
    response.writeHead(200, {
      ...SERVER_VERSION,
      'Content-Length': stats.size,
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Cache-Control': cacheControl,
      ...(cacheable ? { ETag: etag } : {})
    });
    if (request.method === 'HEAD') return response.end();
    // A conexão pode ter caído enquanto o stat rodava: aí o arquivo nem é aberto
    // (o pipeline lança erro com a resposta já fechada, e isso derrubava o servidor).
    if (response.destroyed) return;
    // pipeline fecha o arquivo mesmo se a conexão cair no meio. Com .pipe, o arquivo ficava aberto,
    // e o Windows então não deixava trocar o arquivo depois (o Publicar dava EPERM).
    const stream = fs.createReadStream(filePath);
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
