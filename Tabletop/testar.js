// Mesa da wiki, versão de teste. Sobe a wiki de verdade (o server.js, sem mudar nada nele) com a mesa junto, em
// http://localhost:8010, e dados de teste fora do OneDrive (%LOCALAPPDATA%\FieldbookTeste\mesa-wiki). Não mexe nos dados
// da wiki nem no servidor de casa (porta 8000).
//   · a wiki do mestre fica em /, a mesa em /mesa;
//   · a mesa usa o mesmo api-personagens.js que a wiki (códigos, sessões, personagens, campanhas e a fila de gravação):
//     o HP mexido na mesa aparece na ficha da wiki, e o da ficha aparece na mesa.
//
//   node Tabletop/testar.js            liga (na primeira vez, cria os dados de teste)
//   node Tabletop/testar.js --limpar   apaga os dados de teste e começa de novo
//   $env:HOST='0.0.0.0'                deixa o celular entrar pela rede de casa
//   $env:PORTA='8011'                  outra porta
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const { createRequire, wrap } = require('module');
const os = require('os');
const path = require('path');
const vm = require('vm');

const here = __dirname;
const root = path.resolve(here, '..');
const createTableApi = require('./mesa-api');
const SEMENTE = 5; // muda quando os dados de teste mudam de formato: os antigos são refeitos
// As cenas do Foundry entram sozinhas nos dados de teste quando o backup completo está neste computador.
const BACKUP_FOUNDRY = path.join(process.env.USERPROFILE || '', 'Backups', 'Night City Fieldbook', 'foundry12-completo-2026-10-12.tar');

const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
// A página da mesa (na integração, o server.js entrega estes mesmos arquivos).
const files = {
  '/mesa': path.join(here, 'mesa.html'),
  '/mesa.html': path.join(here, 'mesa.html'),
  '/mesa.js': path.join(here, 'mesa.js'),
  '/mesa-visao.js': path.join(here, 'mesa-visao.js'),
  '/mesa.css': path.join(here, 'mesa.css')
};

// A página da mesa como estava quando o teste ligou. O Node carrega o código do servidor uma vez só: entregar a página
// do disco, editada depois, junta página nova com servidor velho (a operação nova volta "Operação desconhecida"). A
// versão junta a página e o servidor: quando o teste reinicia com código novo, a página aberta avisa para recarregar.
function carregarPagina() {
  const pagina = new Map();
  for (const [rota, arquivo] of Object.entries(files)) pagina.set(rota, { conteudo: fs.readFileSync(arquivo), tipo: contentTypes[path.extname(arquivo)] });
  const hash = crypto.createHash('sha1');
  const codigo = [...new Set(Object.values(files)), ...['mesa-api.js', 'mesa-combate.js', 'mesa-regras.js'].map(nome => path.join(here, nome)), path.join(root, 'personagem-jogo.js')];
  for (const arquivo of codigo) hash.update(fs.readFileSync(arquivo));
  return { pagina, versao: hash.digest('hex').slice(0, 12) };
}

// Como no server.js: grava num temporário com nome único e troca, tentando de novo se o Windows segurar o arquivo.
let temporaryCount = 0;
async function writeJsonAtomic(file, data) {
  temporaryCount = (temporaryCount + 1) % 1e6;
  const temporary = `${file}.${process.pid}-${temporaryCount}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  for (let attempt = 1; ; attempt += 1) {
    try { fs.renameSync(temporary, file); return; } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) { fs.rmSync(temporary, { force: true }); throw error; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
const send = (response, status, text, headers = {}) => { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }); response.end(text); };
const hasPlayerCookie = request => /(?:^|;\s*)jogador=[^;]+/.test(request.headers.cookie || '');
const defaultData = () => path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'FieldbookTeste', 'mesa-wiki');

// O server.js de verdade, carregado como nos testes isolados (tests/lib/servidor-isolado.js): o http.createServer dele
// só entrega a função que atende, e o require do api-personagens.js entrega a instância que ele criou (a mesma que a
// mesa usa).
function carregarWiki(dados) {
  const arquivo = path.join(root, 'server.js');
  const carregar = createRequire(arquivo);
  let atender = null;
  let characterApi = null;
  const env = { ...process.env, HOST: '127.0.0.1', PORT: '0', DADOS: dados, MODO: 'local', GM_KEY: '', FOUNDRY_URL: '', FOUNDRY_STATUS: '', BACKUPS: '' };
  const requireDaWiki = nome => {
    if (nome === 'http') return { createServer(fn) { atender = fn; return { listen() { return this; } }; } };
    if (nome === './api-personagens') {
      const real = carregar(nome);
      const embrulho = opcoes => (characterApi = real(opcoes));
      embrulho.ROUTES = real.ROUTES;
      return embrulho;
    }
    return carregar(nome);
  };
  const iniciar = vm.runInNewContext(wrap(fs.readFileSync(arquivo, 'utf8')), {
    Buffer, URL, URLSearchParams, console, setTimeout, clearTimeout, setInterval, clearInterval, fetch, AbortSignal, TextDecoder, TextEncoder,
    process: { env, pid: process.pid, platform: process.platform, cwd: process.cwd }
  }, { filename: arquivo });
  iniciar({}, requireDaWiki, { exports: {} }, arquivo, root);
  if (!atender || !characterApi) throw new Error('O server.js não montou a wiki.');
  return { atender, characterApi };
}

async function iniciar({ porta = Number(process.env.PORTA || 8010), host = process.env.HOST || '127.0.0.1', dados = process.env.DADOS_MESA || defaultData(), limpar = false, semente = true, cenasDoFoundry = true, random, prazoDefesa, silencioso = false, versao: outraVersao } = {}) {
  const infoFile = path.join(dados, 'teste.json');
  const readInfo = () => { try { return JSON.parse(fs.readFileSync(infoFile, 'utf8')); } catch { return null; } };
  const velho = readInfo();
  if (limpar || (semente && velho && velho.semente !== SEMENTE)) fs.rmSync(dados, { recursive: true, force: true });
  fs.mkdirSync(dados, { recursive: true });
  const log = (...args) => { if (!silencioso) console.log(...args); };

  const { atender, characterApi } = carregarWiki(dados);
  // outraVersao: só para os testes simularem o servidor reiniciado com código novo.
  const { pagina, versao: calculada } = carregarPagina();
  const versao = outraVersao || calculada;
  const tableApi = createTableApi({
    dataDir: dados, charactersDir: path.join(dados, 'personagens'), wikiDir: root,
    who: characterApi.who, campaigns: characterApi.campaigns, updateCharacter: characterApi.updateCharacter,
    send, writeJsonAtomic, versao, ...(random ? { random } : {}), ...(prazoDefesa ? { prazoDefesa } : {})
  });

  const server = http.createServer((request, response) => {
    // Só no teste: em casa, o server.js trata "este computador" sempre como mestre. Para ver a visão de um jogador no
    // mesmo computador, quem tem o cookie de jogador (a janela anônima que entrou com um código) passa como se viesse
    // pelo túnel, que é o caminho dos jogadores.
    if (hasPlayerCookie(request) && !request.headers['x-forwarded-for']) request.headers['x-forwarded-for'] = '127.0.0.1';
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { return send(response, 400, 'Endereço inválido.'); }
    if (createTableApi.ROUTES.test(pathname)) return void tableApi(request, response, pathname);
    if (pathname === '/mesa-config.js') {
      const config = { teste: true, contas: (readInfo() || {}).contas || [] };
      return send(response, 200, `window.mesaConfig = ${JSON.stringify(config)};\n`, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    }
    const arquivo = pagina.get(pathname);
    if (!arquivo) return void atender(request, response);
    const etag = `"${versao}"`;
    if (request.headers['if-none-match'] === etag) { response.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }); return response.end(); }
    response.writeHead(200, { 'Content-Type': arquivo.tipo, 'Content-Length': arquivo.conteudo.length, 'Cache-Control': 'no-cache', ETag: etag });
    response.end(request.method === 'HEAD' ? undefined : arquivo.conteudo);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(porta, host, resolve); });
  const url = `http://localhost:${server.address().port}`;

  if (semente && !readInfo()) {
    log('Criando os dados de teste…');
    await seed(url.replace('localhost', '127.0.0.1'), writeJsonAtomic, infoFile, cenasDoFoundry);
  }
  const fechar = async () => {
    tableApi.close();
    await tableApi.flush();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(() => resolve()));
  };
  return { server, url, dados, fechar, contas: (readInfo() || {}).contas || [], tableApi, characterApi, versao };
}

// ---------------- Dados de teste ----------------
// Dois jogadores de mentira, cada um com um personagem, e duas cenas. Tudo pela API de verdade, como o mestre e os
// jogadores fariam pela wiki. Os mapas são os do Frag Maps que já estão no Foundry deste computador (com a grade que o
// próprio módulo usa: 100 px, 2 m); sem eles, a cena fica só com a grade. As cenas do Foundry de verdade entram pelo
// importar-foundry.js.
async function seed(url, writeJson, infoFile, cenasDoFoundry = true) {
  const call = async (pathname, { method = 'GET', body, cookie, type } = {}) => {
    const response = await fetch(url + pathname, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': type || 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body)
    });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* sem JSON */ }
    if (!response.ok) throw new Error(`${method} ${pathname}: ${response.status} ${text}`);
    return { data, cookie: (response.headers.get('set-cookie') || '').split(';')[0] };
  };
  const op = (tipo, dadosOp) => call('/api/mesa/op', { method: 'POST', body: { tipo, ...dadosOp } });

  // As armas e as armaduras são do catálogo da loja, montadas como o criador monta (arma carregada, armadura vestida).
  const item = (uid, id, nome, uso, municao = '') => ({ uid, id, nome, qtd: 1, uso, ...(municao ? { municao } : {}) });
  const people = [
    { conta: 'Ana (teste)', personagem: {
      nome: 'Jax "Ferrugem" Moreno', apelido: 'Ferrugem', role: 'solo', metodo: 'pacote',
      stats: { INT: 5, REF: 8, DEX: 7, TECH: 4, COOL: 6, WILL: 6, LUCK: 5, MOVE: 6, BODY: 7, EMP: 4 },
      pericias: [['Handgun', 'REF', 6], ['Shoulder Arms', 'REF', 6], ['Autofire', 'REF', 4], ['Evasion', 'DEX', 6], ['Brawling', 'DEX', 4], ['Melee Weapon', 'DEX', 4], ['Athletics', 'DEX', 4], ['Perception', 'INT', 4], ['Stealth', 'DEX', 4], ['Tactics', 'INT', 4], ['Concentration', 'WILL', 3], ['Interrogation', 'COOL', 4]],
      hp: 45,
      itens: [item('j1', 'core_weapons:heavy-pistol', 'Pistola pesada', 'equipado', 'j8'), item('j2', 'core_weapons:smg', 'SMG', 'carregando', 'j9'), item('j3', 'core_weapons:light-melee', 'Faca de combate', 'carregando'),
        item('j4', 'core_armor:light-armorjack-body', 'Armorjack leve (corpo)', 'equipado'), item('j5', 'core_armor:light-armorjack-head', 'Armorjack leve (cabeça)', 'equipado'),
        item('j8', 'core_ammo:heavy-pistol-basic', 'Munição de pistola pesada', 'carregando'), item('j9', 'core_ammo:medium-pistol-basic', 'Munição de pistola média', 'carregando')]
    } },
    { conta: 'Bruno (teste)', personagem: {
      nome: 'Iris "Nyx" Tanaka', apelido: 'Nyx', role: 'netrunner', metodo: 'pacote',
      stats: { INT: 8, REF: 6, DEX: 6, TECH: 7, COOL: 5, WILL: 7, LUCK: 6, MOVE: 5, BODY: 5, EMP: 5 },
      pericias: [['Interface', 'INT', 6], ['Electronics/Security Tech', 'TECH', 6], ['Cryptography', 'INT', 6], ['Basic Tech', 'TECH', 4], ['Handgun', 'REF', 4], ['Evasion', 'DEX', 4], ['Perception', 'INT', 4], ['Library Search', 'INT', 4], ['Stealth', 'DEX', 4], ['Concentration', 'WILL', 4], ['Conceal/Reveal Object', 'INT', 4]],
      hp: 40,
      itens: [item('n1', 'core_weapons:heavy-pistol', 'Pistola pesada', 'equipado', 'n8'), item('n4', 'core_armor:light-armorjack-body', 'Armorjack leve (corpo)', 'equipado'), item('n8', 'core_ammo:heavy-pistol-basic', 'Munição de pistola pesada', 'carregando')]
    } }
  ];
  const contas = [];
  for (const person of people) {
    const { data: created } = await call('/api/contas', { method: 'POST', body: { nome: person.conta } });
    const { cookie } = await call('/api/entrar', { method: 'POST', body: { codigo: created.conta.codigo } });
    const p = person.personagem;
    const { data: character } = await call('/api/personagens', { method: 'POST', cookie, body: {
      nome: p.nome, apelido: p.apelido, role: p.role, metodo: p.metodo, stats: p.stats,
      resultado: { stats: p.stats, derivados: { hp: p.hp }, pericias: p.pericias.map(([nome, stat, nivel]) => ({ nome, stat, nivel })), itens: p.itens }
    } });
    contas.push({ nome: person.conta, codigo: created.conta.codigo, personagem: p.nome, id: character.personagem.id });
  }

  const fragmaps = path.join(process.env.LOCALAPPDATA || '', 'FoundryVTT', 'Data', 'modules', 'fragmaps-free', 'images');
  const upload = async file => (await call('/api/mesa/midia', { method: 'POST', type: 'image/jpeg', body: fs.readFileSync(path.join(fragmaps, file)) })).data.midia;
  const hasMaps = ['backalley.jpg', 'cyberpunk-diner.jpg'].every(file => fs.existsSync(path.join(fragmaps, file)));
  const grade = { tamanho: 100, metros: 2 };
  const alley = hasMaps
    ? (await op('cena.criar', { nome: 'Beco atrás do clube', imagem: await upload('backalley.jpg'), largura: 3120, altura: 1800, grade })).data.resultado.cena
    : (await op('cena.criar', { nome: 'Rua de teste', largura: 3000, altura: 2000, grade })).data.resultado.cena;
  const diner = hasMaps
    ? (await op('cena.criar', { nome: 'Diner em Watson', imagem: await upload('cyberpunk-diner.jpg'), largura: 1800, altura: 1800, grade, nevoa: true })).data.resultado.cena
    : (await op('cena.criar', { nome: 'Sala com névoa', largura: 1800, altura: 1800, grade, nevoa: true })).data.resultado.cena;
  // Centro do quadrado (coluna, linha) da grade de 100 px.
  const at = (col, row) => ({ x: col * 100 + 50, y: row * 100 + 50 });
  await op('token.criar', { cena: alley, personagem: contas[0].id, ...at(4, 9) });
  await op('token.criar', { cena: alley, personagem: contas[1].id, ...at(5, 10) });
  await op('token.criar', { cena: alley, npc: 'mooks:0', ...at(18, 7) });
  await op('token.criar', { cena: alley, npc: 'mooks:0', ...at(20, 9) });
  await op('token.criar', { cena: alley, npc: 'lieutenants:0', escondido: true, ...at(25, 5) });
  await op('token.criar', { cena: diner, npc: 'lieutenants:2', ...at(12, 4) });
  await op('nevoa.traco', { cena: diner, modo: 'revelar', r: 350, pontos: [at(4, 13), at(7, 13)] });
  await op('cena.ativar', { cena: alley });
  if (cenasDoFoundry && fs.existsSync(BACKUP_FOUNDRY)) {
    try {
      const { importar } = require('./importar-foundry');
      const { cenas } = await importar({ tar: BACKUP_FOUNDRY, mundo: 'edgerunners-storys', mesa: url, silencioso: true });
      console.log(`Cenas do Foundry importadas: ${cenas.filter(cena => cena.status === 'ok').length}.`);
    } catch (error) {
      console.log(`As cenas do Foundry não entraram (${error.message}). Rode o importar-foundry.js à mão.`);
    }
  }
  await writeJson(infoFile, { semente: SEMENTE, criado: new Date().toISOString(), contas });
}

if (require.main === module) {
  const limpar = process.argv.includes('--limpar');
  iniciar({ limpar }).then(({ url, dados, fechar, contas }) => {
    const host = process.env.HOST || '127.0.0.1';
    console.log(`\nWiki de teste: ${url}   ·   Mesa: ${url}/mesa`);
    console.log(`Dados de teste em ${dados} (apague com --limpar).\n`);
    console.log('Mestre: abra os endereços neste computador.');
    console.log('Jogador: abra numa janela anônima (Ctrl+Shift+N) e entre com um código:');
    for (const conta of contas) console.log(`  ${conta.nome.padEnd(14)} ${conta.codigo}   ${conta.personagem}`);
    if (host !== '127.0.0.1') {
      const addresses = Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address);
      for (const address of addresses) console.log(`No celular (mesma rede): http://${address}:${new URL(url).port}/mesa`);
    } else {
      console.log('\nPara o celular entrar pela rede de casa: $env:HOST=\'0.0.0.0\'; node Tabletop/testar.js');
    }
    console.log('Cenas do Foundry: node Tabletop/importar-foundry.js --tar "<backup do Foundry>.tar" --mundo <mundo>');
    console.log('\nCtrl+C desliga.');
    let closing = false;
    const stop = () => { if (closing) return; closing = true; fechar().then(() => process.exit(0)); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }).catch(error => {
    console.error(error.code === 'EADDRINUSE' ? `A porta já está em uso: feche a outra mesa de teste ou use $env:PORTA='8011'.` : error);
    process.exit(1);
  });
}

module.exports = { iniciar };
