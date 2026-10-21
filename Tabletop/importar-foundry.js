// Traz as cenas de um mundo do Foundry para a mesa da wiki: o mapa (imagem ou vídeo), a grade, os tiles, os tokens, as
// paredes e as luzes (estas guardadas para a visão). Cada token vira o personagem da wiki (ator que veio da wiki), a ficha
// de NPC da wiki (o "base" que o cpr-2077 grava no ator) ou um token livre com a imagem e o HP do ator.
//
// Lê o banco do Foundry com o classic-level do próprio Foundry instalado (nada novo para instalar), numa cópia (o Foundry
// pode estar aberto), e manda tudo pela API da mesa, como o mestre faria. Não muda nada no Foundry.
//
//   node Tabletop/importar-foundry.js --tar "C:\Users\...\foundry12-completo-2026-10-12.tar" --mundo edgerunners-storys
//   node Tabletop/importar-foundry.js --dados /srv/foundry14/data/Data --mundo protocolo --mesa https://wiki.SEUDOMINIO --senha "..."
//
// Opções:
//   --mesa URL        a wiki com a mesa (padrão: http://127.0.0.1:8010, a de teste)
//   --campanha ID     a campanha (padrão: a primeira)
//   --listar          só mostra as cenas do mundo
//   --cenas "A; B"    só estas cenas (pelo nome)
//   --substituir      troca as cenas já importadas deste mundo
//   --foundry-app DIR a pasta do Foundry instalado (de onde vem o classic-level)
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TIPOS = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', webm: 'video/webm', mp4: 'video/mp4', m4v: 'video/mp4' };
// O tipo pelo começo do arquivo: no Foundry há WebP salvo como .jpeg e .png (o Foundry e o navegador não ligam; a
// mesa confere). Sem reconhecer, vale a extensão.
function tipoDe(arquivo, caminho) {
  const cabeca = Buffer.alloc(16);
  const fd = fs.openSync(arquivo, 'r');
  try { fs.readSync(fd, cabeca, 0, 16, 0); } finally { fs.closeSync(fd); }
  if (cabeca.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (cabeca[0] === 0xff && cabeca[1] === 0xd8 && cabeca[2] === 0xff) return 'image/jpeg';
  if (cabeca.toString('latin1', 0, 4) === 'RIFF' && cabeca.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (cabeca.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  if (cabeca.toString('latin1', 4, 8) === 'ftyp') return 'video/mp4';
  return TIPOS[path.extname(caminho).slice(1).toLowerCase()];
}

function argumentos(lista) {
  const opcoes = {};
  for (let i = 0; i < lista.length; i += 1) {
    const chave = lista[i].replace(/^--/, '');
    if (!lista[i].startsWith('--')) continue;
    if (lista[i + 1] === undefined || lista[i + 1].startsWith('--')) opcoes[chave] = true;
    else { opcoes[chave] = lista[i + 1]; i += 1; }
  }
  return opcoes;
}

// O classic-level do Foundry instalado (o 12 tem binário N-API, que roda em qualquer Node; o 14 também traz o dele).
function classicLevel(pasta) {
  const candidatas = [pasta, pasta && path.join(pasta, 'resources', 'app'),
    'C:\\Program Files\\Foundry Virtual Tabletop\\resources\\app', path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste', 'foundry14-app'),
    '/srv/foundry14/app', '/srv/foundry/app', '/opt/foundryvtt/resources/app'].filter(Boolean);
  for (const candidata of candidatas) {
    const modulo = path.join(candidata, 'node_modules', 'classic-level');
    if (fs.existsSync(path.join(modulo, 'package.json'))) return require(modulo).ClassicLevel;
  }
  throw new Error('Não achei o Foundry instalado (o classic-level). Diga onde ele está com --foundry-app.');
}
async function lerBanco(ClassicLevel, pasta) {
  const banco = new ClassicLevel(pasta, { valueEncoding: 'json' });
  await banco.open();
  const tudo = new Map();
  for await (const [chave, valor] of banco.iterator()) tudo.set(chave, valor);
  await banco.close();
  return tudo;
}

// ---------------- De onde vêm os arquivos: o .tar do backup ou a pasta Data do Foundry ----------------
// No Windows, o tar do sistema: o do Git Bash (GNU) lê "C:" como outro computador.
const TAR = process.platform === 'win32' && fs.existsSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'))
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
function origemTar(tar, mundo, trabalho) {
  const membros = execFileSync(TAR, ['-tf', tar], { maxBuffer: 512 * 1024 * 1024, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const sufixo = `worlds/${mundo}/world.json`;
  const achado = membros.find(membro => membro === sufixo || membro.endsWith(`/${sufixo}`));
  if (!achado) throw new Error(`O mundo "${mundo}" não está neste .tar.`);
  const prefixo = achado.slice(0, achado.length - sufixo.length);
  const existe = new Set(membros.map(membro => membro.replace(/\/$/, '')));
  const extrair = lista => {
    if (!lista.length) return;
    const arquivoLista = path.join(trabalho, `lista-${Date.now()}.txt`);
    fs.writeFileSync(arquivoLista, lista.join('\n'));
    // Membro que falta não para o resto (o tar avisa e segue): quem chama confere arquivo por arquivo.
    spawnSync(TAR, ['-xf', tar, '-C', path.join(trabalho, 'arquivos'), '-T', arquivoLista], { stdio: 'ignore' });
  };
  fs.mkdirSync(path.join(trabalho, 'arquivos'), { recursive: true });
  extrair([`${prefixo}worlds/${mundo}/data/scenes`, `${prefixo}worlds/${mundo}/data/actors`]);
  const base = path.join(trabalho, 'arquivos', prefixo);
  return {
    banco: nome => path.join(base, 'worlds', mundo, 'data', nome),
    buscar(caminhos) { extrair(caminhos.filter(caminho => existe.has(`${prefixo}${caminho}`)).map(caminho => `${prefixo}${caminho}`)); },
    arquivo: caminho => path.join(base, caminho)
  };
}
function origemDados(dados, mundo, trabalho) {
  if (!fs.existsSync(path.join(dados, 'worlds', mundo, 'world.json'))) throw new Error(`O mundo "${mundo}" não está em ${dados}.`);
  // O banco é copiado: com o Foundry aberto, ele fica trancado.
  for (const nome of ['scenes', 'actors']) {
    const de = path.join(dados, 'worlds', mundo, 'data', nome);
    if (fs.existsSync(de)) fs.cpSync(de, path.join(trabalho, nome), { recursive: true, filter: origem => path.basename(origem) !== 'LOCK' });
  }
  return { banco: nome => path.join(trabalho, nome), buscar() {}, arquivo: caminho => path.join(dados, caminho) };
}

// ---------------- Da cena do Foundry para a da mesa ----------------
// O caminho de um arquivo dentro da pasta Data (o Foundry guarda com %20 e às vezes com barra dobrada).
function caminhoDe(src) {
  if (!src || /^(https?:|data:)/i.test(src)) return '';
  let texto = String(src);
  try { texto = decodeURIComponent(texto); } catch { /* fica como está */ }
  return texto.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.?\//, '');
}
const resto = (a, n) => ((a % n) + n) % n;

function converter(cena, embutidos, atores, mundo) {
  const grid = typeof cena.grid === 'object' && cena.grid ? cena.grid : { size: cena.grid, distance: cena.gridDistance, units: cena.gridUnits, type: cena.gridType };
  const tamanho = Number(grid.size) || 100;
  const tipo = Number(grid.type ?? 1);
  const avisos = [];
  if (tipo > 1) avisos.push('grade hexagonal virou quadrada');
  const largura = Number(cena.width) || 1000;
  const altura = Number(cena.height) || 1000;
  const padding = Number(cena.padding) || 0;
  const fundo = cena.background || { src: cena.img, offsetX: cena.shiftX, offsetY: cena.shiftY };
  const deslocX = Number(fundo.offsetX) || 0;
  const deslocY = Number(fundo.offsetY) || 0;
  // Onde o mapa começa no canvas do Foundry: a margem arredondada para a grade, menos o deslocamento do fundo
  // (common/grid/square.mjs:917 e foundry.js:21511 do Foundry 12). Tudo da cena é trazido para a coordenada do mapa.
  const origemX = Math.ceil((padding * largura) * (1 / tamanho)) * tamanho - deslocX;
  const origemY = Math.ceil((padding * altura) * (1 / tamanho)) * tamanho - deslocY;
  const midias = new Set();
  const usar = src => { const caminho = caminhoDe(src); if (caminho) midias.add(caminho); return caminho; };
  const deltaDe = token => [...embutidos.deltas.entries()].find(([chave]) => chave.startsWith(`${cena._id}.${token._id}.`))?.[1] || null;

  const tokens = embutidos.tokens.map(token => {
    const ator = atores.get(`!actors!${token.actorId}`) || null;
    const flags = (ator && ator.flags && ator.flags['cpr-2077']) || {};
    const delta = deltaDe(token);
    const hpAtor = ator && ator.system && ator.system.derivedStats && ator.system.derivedStats.hp;
    const hpDelta = delta && delta.system && delta.system.derivedStats && delta.system.derivedStats.hp;
    const w = Number(token.width) || 1;
    const h = Number(token.height) || 1;
    return {
      nome: token.name || (ator && ator.name) || 'Token',
      x: token.x - origemX + (w * tamanho) / 2, y: token.y - origemY + (h * tamanho) / 2,
      tamanho: Math.max(1, Math.min(4, Math.round(Math.max(w, h)))), escondido: Boolean(token.hidden),
      midia: usar(token.texture && token.texture.src),
      personagem: token.actorLink && flags.wiki && flags.wiki.id ? flags.wiki.id : undefined,
      npcNome: flags.base || undefined,
      hp: Number((hpDelta && hpDelta.max) || (hpAtor && hpAtor.max)) || undefined
    };
  });
  const tiles = embutidos.tiles.filter(tile => tile.texture && tile.texture.src).map(tile => ({
    midia: usar(tile.texture.src), x: tile.x - origemX, y: tile.y - origemY, largura: tile.width, altura: tile.height,
    rotacao: tile.rotation || 0, alpha: tile.alpha ?? 1, escondido: Boolean(tile.hidden)
  }));
  const paredes = embutidos.paredes.filter(parede => Array.isArray(parede.c) && parede.c.length === 4).map(parede => ({
    c: [parede.c[0] - origemX, parede.c[1] - origemY, parede.c[2] - origemX, parede.c[3] - origemY],
    porta: parede.door || 0, estado: parede.ds || 0, movimento: parede.move ?? 20, visao: parede.sight ?? 20, luz: parede.light ?? 20
  }));
  const luzes = embutidos.luzes.map(luz => ({
    x: luz.x - origemX, y: luz.y - origemY, claro: (luz.config && luz.config.bright) || 0, penumbra: (luz.config && luz.config.dim) || 0,
    angulo: (luz.config && luz.config.angle) || 360, cor: (luz.config && luz.config.color) || null, escondido: Boolean(luz.hidden)
  }));
  return {
    avisos, midias,
    cena: {
      nome: cena.name || 'Cena', imagem: usar(fundo.src), largura, altura,
      // A margem do Foundry (o padding, arredondado para a grade, mais o deslocamento do fundo): o token que estava
      // fora do mapa continua lá.
      margem: { x: origemX + deslocX + Math.abs(deslocX), y: origemY + deslocY + Math.abs(deslocY) },
      grade: { tamanho, tipo: tipo === 0 ? 'nenhuma' : 'quadrada', metros: Number(grid.distance) || 2, unidade: grid.units || 'm', visivel: tipo !== 0, x: resto(deslocX, tamanho), y: resto(deslocY, tamanho) },
      // A visão pelas paredes liga como no Foundry (tokenVision), se a cena tem paredes: sem elas, quem não tem token
      // na cena não veria nada.
      nevoa: false, visao: Boolean(cena.tokenVision) && paredes.length > 0, tokens, tiles, paredes, luzes, origem: { mundo, id: cena._id }
    }
  };
}

// ---------------- A mesa ----------------
function cliente(mesa, cookie, campanha) {
  const comCampanha = caminho => `${mesa}${caminho}${campanha ? `${caminho.includes('?') ? '&' : '?'}campanha=${encodeURIComponent(campanha)}` : ''}`;
  return async (caminho, { method = 'GET', body, tipo } = {}) => {
    const response = await fetch(comCampanha(caminho), {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': tipo || 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body)
    });
    const texto = await response.text();
    let dados = null;
    try { dados = JSON.parse(texto); } catch { /* sem JSON */ }
    return { status: response.status, dados, texto };
  };
}

async function importar(opcoes) {
  const mundo = opcoes.mundo;
  if (!mundo || (!opcoes.tar && !opcoes.dados)) throw new Error('Use --tar <backup.tar> ou --dados <pasta Data do Foundry>, e --mundo <id do mundo>.');
  const mesa = String(opcoes.mesa || 'http://127.0.0.1:8010').replace(/\/+$/, '');
  const trabalho = fs.mkdtempSync(path.join(os.tmpdir(), 'mesa-imp-'));
  const log = opcoes.silencioso ? () => {} : console.log;
  try {
    const ClassicLevel = classicLevel(opcoes['foundry-app']);
    log(`Lendo o mundo "${mundo}"…`);
    const fonte = opcoes.tar ? origemTar(opcoes.tar, mundo, trabalho) : origemDados(opcoes.dados, mundo, trabalho);
    const banco = await lerBanco(ClassicLevel, fonte.banco('scenes'));
    const atores = fs.existsSync(fonte.banco('actors')) ? await lerBanco(ClassicLevel, fonte.banco('actors')) : new Map();
    const de = (colecao, cenaId) => [...banco.entries()].filter(([chave]) => chave.startsWith(`!scenes.${colecao}!${cenaId}.`)).map(([, valor]) => valor);
    let cenas = [...banco.entries()].filter(([chave]) => chave.startsWith('!scenes!')).map(([, valor]) => valor)
      .sort((a, b) => (a.navOrder ?? a.sort ?? 0) - (b.navOrder ?? b.sort ?? 0) || String(a.name).localeCompare(String(b.name), 'pt'));
    if (opcoes.cenas) {
      const quero = new Set(String(opcoes.cenas).split(';').map(nome => nome.trim().toLowerCase()).filter(Boolean));
      cenas = cenas.filter(cena => quero.has(String(cena.name).toLowerCase()));
    }
    const convertidas = cenas.map(cena => converter(cena, {
      tokens: de('tokens', cena._id), tiles: de('tiles', cena._id), paredes: de('walls', cena._id), luzes: de('lights', cena._id),
      deltas: new Map([...banco.entries()].filter(([chave]) => chave.startsWith(`!scenes.tokens.delta!${cena._id}.`)).map(([chave, valor]) => [chave.slice('!scenes.tokens.delta!'.length), valor]))
    }, atores, mundo));
    if (opcoes.listar) {
      for (const { cena, avisos } of convertidas) {
        log(`${cena.nome.padEnd(34)} ${cena.largura}×${cena.altura}  grade ${cena.grade.tipo === 'nenhuma' ? 'nenhuma' : `${cena.grade.tamanho}px = ${cena.grade.metros} ${cena.grade.unidade}`}  ${cena.tokens.length} tokens, ${cena.tiles.length} tiles, ${cena.paredes.length} paredes, ${cena.luzes.length} luzes${avisos.length ? `  (${avisos.join('; ')})` : ''}`);
      }
      return { cenas: convertidas.map(item => item.cena) };
    }

    // Quem manda é o mestre: em casa, este computador; no servidor, com a senha.
    let cookie = opcoes.cookie || '';
    if (opcoes.senha) {
      const entrada = await fetch(`${mesa}/api/mestre/entrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: opcoes.senha }) });
      if (!entrada.ok) throw new Error(`A senha do mestre não entrou (${entrada.status}).`);
      cookie = (entrada.headers.get('set-cookie') || '').split(';')[0];
    }
    const pedir = cliente(mesa, cookie, opcoes.campanha);
    const estado = await pedir('/api/mesa/estado');
    if (estado.status !== 200 || !estado.dados || estado.dados.eu.papel !== 'mestre') throw new Error(`A mesa em ${mesa} não respondeu como mestre (${estado.status}). No servidor, use --senha.`);

    // Os arquivos: todos de uma vez do .tar; depois, um envio por arquivo (o mesmo arquivo em duas cenas sobe uma vez).
    const todas = [...new Set(convertidas.flatMap(item => [...item.midias]))];
    log(`${convertidas.length} cenas, ${todas.length} arquivos.`);
    fonte.buscar(todas);
    const enviados = new Map();
    for (const caminho of todas) {
      const arquivo = fonte.arquivo(caminho);
      if (!fs.existsSync(arquivo)) { log(`  não achei: ${caminho}`); continue; }
      const tipo = tipoDe(arquivo, caminho);
      if (!tipo) { log(`  pulado (tipo desconhecido): ${caminho}`); continue; }
      const envio = await pedir('/api/mesa/midia', { method: 'POST', body: fs.readFileSync(arquivo), tipo });
      if (envio.status !== 200) { log(`  não subiu: ${caminho} (${(envio.dados && envio.dados.erro) || envio.status})`); continue; }
      enviados.set(caminho, envio.dados.midia);
    }
    const trocar = caminho => (caminho && enviados.get(caminho)) || '';
    const resultado = [];
    for (const { cena, avisos } of convertidas) {
      const pronta = {
        ...cena, imagem: trocar(cena.imagem),
        tiles: cena.tiles.map(tile => ({ ...tile, midia: trocar(tile.midia) })).filter(tile => tile.midia),
        tokens: cena.tokens.map(token => ({ ...token, midia: trocar(token.midia) }))
      };
      const resposta = await pedir('/api/mesa/op', { method: 'POST', body: { tipo: 'cena.importar', cena: pronta, substituir: Boolean(opcoes.substituir) } });
      if (resposta.status === 409) { log(`  ${cena.nome}: já importada (use --substituir para trocar).`); resultado.push({ nome: cena.nome, status: 'ja' }); continue; }
      if (resposta.status !== 200) throw new Error(`${cena.nome}: ${(resposta.dados && resposta.dados.erro) || resposta.texto}`);
      const r = resposta.dados.resultado;
      const semMapa = cena.imagem && !pronta.imagem ? ' · SEM O MAPA' : '';
      log(`  ${cena.nome}: ${r.tokens} tokens, ${r.tiles} tiles, ${r.paredes} paredes, ${r.luzes} luzes${semMapa}${avisos.length ? ` (${avisos.join('; ')})` : ''}`);
      resultado.push({ nome: cena.nome, status: 'ok', ...r });
    }
    return { cenas: resultado };
  } finally {
    fs.rmSync(trabalho, { recursive: true, force: true });
  }
}

if (require.main === module) {
  importar(argumentos(process.argv.slice(2))).then(() => {
    console.log('Pronto.');
  }).catch(error => {
    console.error(`Não importou: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { importar, converter, caminhoDe };
