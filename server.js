const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
// Por padrão só este computador acessa. Para os jogadores entrarem pela rede: HOST=0.0.0.0.
const host = process.env.HOST || '127.0.0.1';
// Senha opcional para abrir a visão do mestre de outro aparelho (tablet): GM_KEY=senha
// e, no tablet, acesse uma vez http://IP:8000/?mestre=senha.
const gmKey = process.env.GM_KEY || '';

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
  '/jogadores.html', '/jogadores.json', '/wiki.css', '/wiki-app.js',
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
const isGameMaster = request => (isLoopback(request.socket.remoteAddress) && !viaTunnel(request)) || (gmKey !== '' && sameSecret(decodeURIComponent(cookieKey(request)), gmKey));

// O abrir-online.ps1 confere este cabeçalho para saber se o servidor já entende o túnel.
const SERVER_VERSION = { 'X-Wiki-Servidor': '2' };

function send(response, status, text, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...SERVER_VERSION, ...headers });
  response.end(text);
}

// ---------------- Alerta de arquivo revertido ----------------
// A pasta fica no OneDrive, que já voltou arquivos da campanha para versões antigas sem avisar.
// Um arquivo modificado que é idêntico a uma versão antiga do git (e não à atual) foi revertido.
const runGit = args => new Promise(resolve => {
  execFile('git', args, { cwd: root, maxBuffer: 20 * 1024 * 1024, windowsHide: true }, (error, stdout) => resolve(error ? null : stdout));
});
// Hash que o git daria ao conteúdo; com e sem CRLF, porque commits antigos guardaram CRLF.
const blobHash = buffer => crypto.createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');

async function findRevertedFiles() {
  const status = await runGit(['status', '--porcelain', '-z']);
  if (status === null) return null; // sem git ou fora de um repositório: sem alerta
  const modified = status.split('\0').filter(line => /^( M|M |MM)/.test(line)).map(line => line.slice(3));
  const reverted = [];
  for (const file of modified) {
    let raw;
    try { raw = fs.readFileSync(path.join(root, file)); } catch { continue; }
    const head = (await runGit(['rev-parse', `HEAD:${file}`]) || '').trim();
    const hashes = new Set([blobHash(raw), blobHash(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'))]);
    if (hashes.has(head)) continue; // só o fim de linha mudou
    for (const hash of hashes) {
      const commits = (await runGit(['log', '--all', '--format=%h', `--find-object=${hash}`, '--', file]) || '').trim().split('\n').filter(Boolean);
      if (commits.length) { reverted.push({ arquivo: file, commit: commits[commits.length - 1] }); break; }
    }
  }
  return reverted;
}

let healthCache = { at: 0, result: null };
async function health() {
  if (Date.now() - healthCache.at > 30_000) healthCache = { at: Date.now(), result: await findRevertedFiles() };
  return healthCache.result;
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
      await writeJsonAtomic(path.join(root, 'jogadores-mestre.json'), { ...mestre, atualizado });
      await writeJsonAtomic(path.join(root, 'jogadores.json'), { ...publicado, atualizado });
    } catch (error) {
      return send(response, 500, `Não consegui gravar os arquivos: ${error.message}`);
    }
    send(response, 200, JSON.stringify({ ok: true, atualizado }), { 'Content-Type': 'application/json; charset=utf-8' });
  });
}

// Personagens dos jogadores, códigos de acesso e o importador do Foundry (api-personagens.js).
const characterApi = require('./api-personagens')({ root, isGameMaster, send, writeJsonAtomic, sameSecret });

http.createServer((request, response) => {
  let url;
  let pathname;
  try {
    url = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(response, 400, 'Bad request');
  }

  // Tablet do mestre: /?mestre=senha grava um cookie e libera a visão do mestre neste aparelho.
  if (gmKey && url.searchParams.has('mestre')) {
    if (!sameSecret(url.searchParams.get('mestre'), gmKey)) return send(response, 403, 'Senha do mestre incorreta.');
    response.writeHead(302, { ...SERVER_VERSION, 'Cache-Control': 'private, no-store', 'Set-Cookie': `gm=${encodeURIComponent(gmKey)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`, Location: '/' });
    return response.end();
  }

  const gameMaster = isGameMaster(request);

  if (pathname === '/api/saude') {
    if (!gameMaster) return send(response, 403, 'Só o mestre.');
    return health().then(reverted => send(response, 200, JSON.stringify({ git: reverted !== null, revertidos: reverted || [] }), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' }));
  }
  if (/^\/api\/(eu|entrar|sair|contas|personagens)(\/|$)/.test(pathname)) return void characterApi(request, response, pathname);
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

  fs.stat(filePath, (error, stats) => {
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
    const stream = fs.createReadStream(filePath);
    try {
      pipeline(stream, response, () => {});
    } catch {
      stream.destroy();
    }
  });
}).listen(port, host, () => {
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
