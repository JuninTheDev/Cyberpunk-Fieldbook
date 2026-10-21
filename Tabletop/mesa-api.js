// A mesa da wiki: um tabuleiro ao vivo por campanha. Cenas com mapa e grade, tokens dos personagens e das fichas de
// NPC, névoa, rolagens do RED e iniciativa. Carregada pelo server.js (na versão de teste, pelo Tabletop/testar.js).
//
// O desenho segue o que o Foundry 14 faz (o README desta pasta mostra os arquivos e as linhas):
//   · o servidor é a autoridade: cada mudança chega como uma operação (POST /api/mesa/op); o servidor confere quem
//     pode, aplica, grava e só então manda o resultado a todos (GET /api/mesa/eventos, Server-Sent Events). Operação
//     recusada não chega a ninguém;
//   · o passageiro (cursor, ping, régua) só passa adiante e nunca é gravado (POST /api/mesa/atividade).
// A diferença: o Foundry manda o mesmo pacote a todos e esconde no navegador. Aqui o servidor monta o que cada um vê.
// Token escondido, token debaixo da névoa, HP de NPC, notas do mestre e rolagem secreta nem saem do servidor para quem
// não pode ver, como no Publicar.
//
// O HP dos personagens é o da ficha (personagem-jogo.js): a mesa lê de lá e grava lá (doc.jogo), pela fila do
// api-personagens.js. Assim a ficha, a lista de Personagens e a mesa mostram o mesmo número.
//
// Na pasta de dados: mesa/<campanha>/mesa.json (cenas, tokens, névoa, combate e registro) e mesa/<campanha>/midia/
// (mapas, vídeos, tiles e imagens de token, pelo hash do conteúdo).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const characterGame = require('../personagem-jogo');
const R = require('./mesa-regras');
const K = require('./mesa-2077');
const createCombat = require('./mesa-combate');
const V = require('./mesa-visao');

const ROUTES = /^\/api\/mesa(\/|$)/;
// Uma cena importada do Foundry (paredes, tiles, tokens) passa de 64 KB; o resto é bem menor.
const MAX_BODY = 1024 * 1024;
const MAX_LOG = 200;
const MAX_FOG = 4000;
const MAX_TOKENS = 200;
const MAX_SCENES = 80;
const MAX_TILES = 300;
const MAX_WALLS = 4000;
const MAX_LIGHTS = 300;
const PULSE = 20_000;
const SYNC = 4_000;
// Mapas e tiles: imagem ou vídeo (as cenas animadas do Foundry). SVG só para imagem de token, entregue em caixa de areia.
const MEDIA_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'video/webm': 'webm', 'video/mp4': 'mp4' };
const MEDIA_CONTENT = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', webm: 'video/webm', mp4: 'video/mp4' };
const MEDIA_LIMIT_MB = { png: 80, jpg: 80, webp: 80, svg: 2, webm: 150, mp4: 150 };
const MEDIA_FILE = /^[a-f0-9]{40}\.(png|jpg|webp|svg|webm|mp4)$/;
const VIDEO_FILE = /\.(webm|mp4)$/;
const CHARACTER_ID = /^[a-z0-9]{6,16}$/;
const DICE_RE = /^\s*(\d{1,2})\s*d\s*(\d{1,3})\s*(?:([+-])\s*(\d{1,3}))?\s*$/i;
// A ordem dos STATs nas fichas de NPC (mestre-npcs.js e o build do Foundry).
const STAT_ORDER = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];
const STATS = new Set([...STAT_ORDER, 'LUCK']);
const COLORS = ['#00ffd2', '#ff3158', '#8f7bff', '#4dd0ff', '#ff8a3d', '#57e389', '#f06bd5'];
const GM_COLOR = '#f8ef02';
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const NPC_GROUPS = [['campaignCast', 'Elenco do Protocolo Morana'], ['mooks', 'Capangas'], ['lieutenants', 'Tenentes'], ['bosses', 'Mini-chefes'], ['boss', 'Chefe'], ['kit', 'Mission Kit'], ['blackChrome', 'Black Chrome']];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const int = (value, min, max, fallback = min) => { const n = Math.round(Number(value)); return Number.isFinite(n) ? clamp(n, min, max) : fallback; };
const real = (value, min, max, fallback = min) => { const n = Number(value); return Number.isFinite(n) ? clamp(n, min, max) : fallback; };
const plain = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim();
const line = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
const block = (value, max) => String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').slice(0, max);
const leadingNumber = value => Number.parseInt(String(value), 10) || 0;
const stripTags = value => String(value || '').replace(/<[^>]+>/g, '');
const newId = () => crypto.randomBytes(6).toString('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });

// Os estados de ferimento do RED: abaixo do total, abaixo da metade (arredondada para cima) e abaixo de 1.
function woundState(hp) {
  if (!hp || !hp.max) return null;
  if (hp.atual < 1) return 'Mortalmente Ferido';
  if (hp.atual < Math.ceil(hp.max / 2)) return 'Gravemente Ferido';
  if (hp.atual < hp.max) return 'Levemente Ferido';
  return 'Sem ferimentos';
}
const woundPenalty = state => (state === 'Mortalmente Ferido' ? -4 : state === 'Gravemente Ferido' ? -2 : 0);

// A visão pelas paredes (quem vê qual token, quem abre a porta, por onde o token passa): mesa-visao.js, a mesma conta
// que o navegador usa para a sombra.
const { bloqueiaVista, bloqueiaLuz, algumVe, pontoVisto, atravessa } = V;
// A lanterna do token (no Foundry, a tocha: 20 e 40 pés): o jogador acende e apaga a do próprio token.
const LANTERNA = { claro: 6, penumbra: 12 };
// O alcance da visão que o token tem sem o mestre mudar (o dos tokens do Foundry deste mundo).
const ALCANCE_PADRAO = 30;

// A névoa é uma lista de traços (revelar ou cobrir) aplicados em ordem: vale o último traço que cobre o ponto.
function fogShows(scene, x, y) {
  if (!scene.nevoa || !scene.nevoa.ativa) return true;
  let shown = false;
  for (const stroke of scene.nevoa.tracos) {
    if (stroke.tudo || (x - stroke.x) ** 2 + (y - stroke.y) ** 2 <= stroke.r ** 2) shown = stroke.modo === 'revelar';
  }
  return shown;
}

// O começo do arquivo confere com o tipo declarado (um .png que não é PNG não entra).
function looksLike(head, extension) {
  if (extension === 'png') return head.length > 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === 'jpg') return head.length > 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (extension === 'webp') return head.length > 12 && head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP';
  if (extension === 'webm') return head.length > 4 && head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === 'mp4') return head.length > 12 && head.toString('latin1', 4, 8) === 'ftyp';
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head.toString('utf8'));
}

// versao: a da página e do servidor juntos (quem carrega a mesa calcula). A página aberta compara a cada conexão e, se
// mudou (o servidor reiniciou com código novo), pede para recarregar.
module.exports = function createTableApi({ dataDir, charactersDir, wikiDir, who, campaigns, updateCharacter = null, send, writeJsonAtomic, random = faces => crypto.randomInt(faces), prazoDefesa = 60_000, versao = '' }) {
  const json = (response, status, data) => send(response, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' });
  const tableDir = id => path.join(dataDir, 'mesa', id);
  const die = faces => random(faces) + 1;
  const pool = (count, faces) => Array.from({ length: count }, () => die(faces));

  // ---------------- Campanha e quem é quem ----------------
  // Os jogadores conhecem cada campanha pelo id público (o mesmo pedaço de hash do api-personagens.js).
  const publicId = id => crypto.createHash('sha1').update(`fieldbook-campanha:${id}`).digest('hex').slice(0, 12);
  const idFor = (viewer, id) => (viewer.papel === 'mestre' ? id : publicId(id));
  function campaignFor(identity, wanted) {
    const list = campaigns.list();
    const text = String(wanted || '');
    const id = text ? (list.find(item => item.id === text) || list.find(item => publicId(item.id) === text) || { id: '' }).id
      : identity.papel === 'mestre' ? campaigns.first : identity.campanhas[0];
    return id && identity.campanhas.includes(id) ? id : null;
  }
  const viewerOf = identity => ({ papel: identity.papel, conta: identity.conta ? identity.conta.id : null, nome: identity.papel === 'mestre' ? 'Mestre' : line(identity.conta && identity.conta.nome, 40) || 'Jogador' });
  const isGm = viewer => viewer.papel === 'mestre';
  const colorOfAccount = account => COLORS[Number.parseInt(crypto.createHash('sha1').update(String(account || '')).digest('hex').slice(0, 6), 16) % COLORS.length];
  const colorOf = viewer => (isGm(viewer) ? GM_COLOR : colorOfAccount(viewer.conta));

  // ---------------- Dados da wiki ----------------
  // As perícias e as tabelas de lesão crítica (system-rules.js), as fichas de NPC (mestre-npcs.js) e as armas de 2077
  // (system-2077.js), lidas dos mesmos arquivos que a wiki carrega, como faz o build do módulo do Foundry. Só o servidor
  // lê as fichas de NPC.
  const emptyWiki = { skills: new Map(), critBody: [], critHead: [], npcs: [], armas2077: new Map(), regras: { rangeDV: [], rangeBandLimits: [] } };
  let wikiCache = { key: '', data: emptyWiki };
  function wikiData() {
    const files = ['system-rules.js', 'mestre-npcs.js', 'system-2077.js'].map(file => path.join(wikiDir, file));
    let key;
    try { key = files.map(file => fs.statSync(file).mtimeMs).join(':'); } catch { return wikiCache.data; }
    if (key === wikiCache.key) return wikiCache.data;
    const sandbox = {};
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    try {
      for (const file of files) vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 5000 });
    } catch (error) {
      console.error(`Mesa: não leu os dados da wiki (${error.message}).`);
      return wikiCache.data;
    }
    // Pelo JSON: os objetos saem do contexto do vm e viram objetos comuns (as funções ficam para trás).
    const rules = JSON.parse(JSON.stringify((sandbox.systemRules && sandbox.systemRules.data) || {}));
    const npcData = JSON.parse(JSON.stringify((sandbox.npcStatBlocks && sandbox.npcStatBlocks.data) || {}));
    const armas2077 = K.tabela(JSON.parse(JSON.stringify((sandbox.system2077 && sandbox.system2077.data && sandbox.system2077.data.weapons) || {})));
    const names = npcData.skillNames || {};
    const skills = new Map((rules.skills || []).map(([pt, en, stat]) => [en, { pt, stat }]));
    skills.set('Language (Streetslang)', { pt: 'Linguagem (Streetslang)', stat: 'INT' });
    skills.set('Local Expert (Your Home)', { pt: 'Especialista Local (sua casa)', stat: 'INT' });
    const ptOf = en => (skills.get(en) || {}).pt || names[en] || en;
    const npcs = [];
    for (const [group, label] of NPC_GROUPS) {
      (Array.isArray(npcData[group]) ? npcData[group] : []).forEach((card, index) => {
        if (!card || !card.name) return;
        npcs.push({
          id: `${group}:${index}`, nome: card.name, grupo: label, livro: card.book || '', pagina: card.page || null, hp: Number(card.hp) || 0,
          stats: Object.fromEntries(STAT_ORDER.map((stat, i) => [stat, leadingNumber((card.stats || [])[i])])),
          // As fichas do livro já trazem a base (STAT + perícia).
          pericias: String(card.skills || '').split(', ').map(item => item.match(/^(.*?)\s+(\d+)/)).filter(Boolean)
            .map(([, en, base]) => ({ nome: en, pt: ptOf(en), base: Number(base) })).sort((a, b) => b.base - a.base || a.pt.localeCompare(b.pt, 'pt')),
          armas: (Array.isArray(card.weapons) ? card.weapons : []).map(([nome, dano, cdt, pericia, nota]) => ({ nome: line(nome, 80), dano: line(dano, 20), cdt: Number(cdt) || 1, pericia: line(pericia, 60), nota: line(nota, 120) })),
          armadura: stripTags(card.armor)
        });
      });
    }
    const table = rows => (Array.isArray(rows) ? rows : []).map(row => row.map((cell, i) => (i ? stripTags(cell) : Number(cell))));
    wikiCache = { key, data: { skills, ptOf, critBody: table(rules.critBody), critHead: table(rules.critHead), npcs, armas2077, regras: { rangeDV: rules.rangeDV || [], rangeBandLimits: rules.rangeBandLimits || [] } } };
    return wikiCache.data;
  }

  // ---------------- Personagens ----------------
  // Lidos do mesmo lugar que o api-personagens.js grava (um arquivo por personagem); gravados só pela fila dele
  // (updateCharacter). Guardados pela data do arquivo: a mesa confere as fichas a cada poucos segundos.
  const characterCache = new Map();
  function readCharacter(campaignId, id) {
    if (!CHARACTER_ID.test(String(id))) return null;
    const file = path.join(charactersDir, `${id}.json`);
    let doc;
    try {
      const { mtimeMs } = fs.statSync(file);
      const cached = characterCache.get(id);
      if (cached && cached.mtimeMs === mtimeMs) doc = cached.doc;
      else { doc = JSON.parse(fs.readFileSync(file, 'utf8')); characterCache.set(id, { mtimeMs, doc }); }
    } catch { return null; }
    return doc && doc.id === id && (doc.campanha || campaigns.first) === campaignId ? doc : null;
  }
  function readCharacters(campaignId) {
    let files = [];
    try { files = fs.readdirSync(charactersDir).filter(file => /^[a-z0-9]{6,16}\.json$/.test(file)); } catch { return []; }
    return files.map(file => readCharacter(campaignId, file.slice(0, -5))).filter(Boolean)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  }
  const portraitOf = doc => {
    if (doc.retrato) return `/${String(doc.retrato).replace(/^\/+/, '')}`;
    return /^https:\/\/[^\s"'<>]+$/.test(doc.retratoLink || '') ? doc.retratoLink : '';
  };
  // A ficha que a mesa usa: a que o Foundry mandou (doc.mesa), se já mandou; senão, a da criação (doc.resultado). Os
  // STATs são os de agora (personagem-jogo.js): o EMP pela Humanidade e a penalidade da armadura vestida.
  function sheetOf(doc, ficha = characterGame.ficha(doc, catalog())) {
    const wiki = wikiData();
    const fromTable = doc.mesa && typeof doc.mesa === 'object' ? doc.mesa : null;
    const created = doc.resultado && typeof doc.resultado === 'object' ? doc.resultado : {};
    const stats = {};
    for (const [key, value] of Object.entries(ficha.stats)) if (STATS.has(key)) stats[key] = value;
    const hp = ficha.hp;
    const list = Array.isArray(fromTable && fromTable.pericias) ? fromTable.pericias : Array.isArray(created.pericias) ? created.pericias : [];
    const pericias = list.filter(item => item && item.nome && Number(item.nivel) > 0).map(item => {
      const stat = String(item.stat || (wiki.skills.get(item.nome) || {}).stat || '').toUpperCase();
      return { nome: String(item.nome), pt: wiki.ptOf ? wiki.ptOf(item.nome) : item.nome, stat, nivel: Number(item.nivel), base: Number(item.nivel) + (stats[stat] || 0) };
    }).sort((a, b) => b.base - a.base || a.pt.localeCompare(b.pt, 'pt'));
    return { stats, hp, pericias, fonte: fromTable ? 'mesa' : 'criacao' };
  }
  // O catálogo da loja (loja-catalogo.js, o mesmo da wiki): as armas e armaduras da criação e a classe das armas.
  let catalogCache = { mtime: 0, porId: new Map(), porNome: new Map() };
  function catalog() {
    const file = path.join(wikiDir, 'loja-catalogo.js');
    try {
      const { mtimeMs } = fs.statSync(file);
      if (mtimeMs !== catalogCache.mtime) {
        const text = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        const porNome = new Map();
        for (const item of data.itens || []) for (const nome of [item.nome, item.en]) if (nome && !porNome.has(plain(nome))) porNome.set(plain(nome), item);
        catalogCache = { mtime: mtimeMs, porId: new Map((data.itens || []).map(item => [item.id, item])), porNome };
      }
    } catch { /* sem catálogo: as armas vêm sem classe e sem pente */ }
    return { item: id => catalogCache.porId.get(id) || null, porNome: nome => catalogCache.porNome.get(plain(nome)) || null };
  }
  // O que a mesa guarda no token do personagem (cópia da ficha de jogo, conferida a cada poucos segundos). As armas levam
  // o perfil de 2077 e a munição carregada; o cromo diz se a arma Smart dispara (mesa-2077.js).
  function combatFields(doc) {
    const catalogo = catalog();
    const ficha = characterGame.ficha(doc, catalogo);
    const fatos = K.daFicha(doc, catalogo);
    const armas2077 = wikiData().armas2077;
    // A munição carregada é a de agora (a recarga pode ter trocado o cartucho pelo balote, ou posto a Smart melhorada).
    const caixas = new Map(ficha.itens.filter(item => item.tipo === 'municao').map(item => [item.id, item]));
    const fatoDe = arma => {
      const fato = fatos.armas[arma.id] || null;
      if (!fato || !arma.pente) return fato;
      const caixa = caixas.get(arma.municaoId);
      return { ...fato, municao: caixa ? K.municaoDe(catalogo.item(caixa.catalogo), caixa.nome) : arma.municao ? K.municaoDe(catalogo.porNome(arma.municao), arma.municao) : null };
    };
    return {
      hp: ficha.hp, sp: ficha.sp, sorte: ficha.sorte, humanidade: ficha.humanidade, lesoes: ficha.lesoes, deathSave: ficha.deathSave, morto: ficha.morto, cromo: fatos.cromo,
      armas: ficha.armas.map(arma => K.comPerfil({ ...arma, classe: R.classeDaArma(arma) }, armas2077, fatoDe(arma)))
    };
  }
  // O cartão do personagem (vai só para o dono e para o mestre): a ficha de rolar e a ficha de jogo, com o que o mestre
  // muda à mão, o inventário com o uso de cada item e as últimas mudanças.
  const characterCard = doc => {
    const ficha = characterGame.ficha(doc, catalog());
    const sheet = sheetOf(doc, ficha);
    return { id: doc.id, nome: line(doc.nome, 80) || 'Sem nome', apelido: line(doc.apelido, 80), retrato: portraitOf(doc), hp: sheet.hp, stats: sheet.stats, pericias: sheet.pericias, fonte: sheet.fonte,
      jogo: { humanidade: ficha.humanidade, dinheiro: ficha.dinheiro, ip: ficha.ip, reputacao: ficha.reputacao, sorte: ficha.sorte, sp: ficha.sp, penalidade: ficha.penalidade,
        itens: ficha.itens.map(({ catalogo, variedade, ...item }) => item), extrato: ficha.extrato.slice(-10), mesa: Boolean(characterGame.jogoValido(doc)) } };
  };

  // ---------------- Estado de cada mesa ----------------
  const tables = new Map();
  const emptyState = () => ({ formato: 1, cenaAtiva: null, cenas: [], combate: null, registro: [] });
  function tableOf(id) {
    let table = tables.get(id);
    if (table) return table;
    const file = path.join(tableDir(id), 'mesa.json');
    let stored = null;
    try { stored = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* mesa nova */ }
    const state = { ...emptyState(), ...(stored && typeof stored === 'object' ? stored : {}) };
    if (!Array.isArray(state.cenas)) state.cenas = [];
    if (!Array.isArray(state.registro)) state.registro = [];
    // Paredes de antes da visão vêm sem id: ganham um (a porta é aberta pelo id).
    for (const scene of state.cenas) for (const item of [...(scene.paredes || []), ...(scene.luzes || [])]) if (!item.id) item.id = newId();
    combatFlow.cancelarPendentes(state);
    // pendentes: os ataques esperando a defesa (só na memória: o servidor que reinicia cancela).
    table = { id, file, state, seq: 0, timer: null, writing: Promise.resolve(), pendentes: new Map() };
    tables.set(id, table);
    return table;
  }
  // Grava um pouco depois da última mudança (arrastar um token não vira dez gravações), sempre uma de cada vez.
  function flushTable(table) {
    clearTimeout(table.timer);
    table.timer = null;
    const snapshot = JSON.parse(JSON.stringify(table.state));
    table.writing = table.writing.then(async () => {
      fs.mkdirSync(path.dirname(table.file), { recursive: true });
      await writeJsonAtomic(table.file, snapshot);
    }).catch(error => console.error(`Mesa: não gravou ${table.file} (${error.message}).`));
    return table.writing;
  }
  const save = table => { clearTimeout(table.timer); table.timer = setTimeout(() => flushTable(table), 400); };
  const sceneById = (state, id) => state.cenas.find(scene => scene.id === id) || null;
  function findToken(state, id) {
    for (const scene of state.cenas) {
      const token = scene.tokens.find(item => item.id === id);
      if (token) return { scene, token };
    }
    return { scene: null, token: null };
  }

  // ---------------- O que cada um vê ----------------
  const mediaUrl = (viewer, campaignId, name) => (name ? `/api/mesa/midia/${name}?campanha=${encodeURIComponent(idFor(viewer, campaignId))}` : '');
  // Metros para pixels da cena (a grade diz quanto vale um quadrado).
  const emPx = (scene, metros) => (Number(metros) || 0) / (scene.grade.metros || 2) * scene.grade.tamanho;
  // Os olhos de quem olha na cena: os tokens dele, mesmo caído (sem token, com a visão ligada, não vê ninguém), com o
  // alcance da visão em px.
  const olhosDe = (viewer, scene) => scene.tokens.filter(item => item.dono && item.dono === viewer.conta)
    .map(item => ({ x: item.x, y: item.y, alcance: emPx(scene, item.alcance ?? ALCANCE_PADRAO) }));
  const luzDaCena = scene => ({ global: !scene.luz || scene.luz.global !== false, escuridao: (scene.luz && scene.luz.escuridao) || 0 });
  // As luzes que cada um recebe, em px: as do cenário (a escondida, só o mestre) e as dos tokens que ele pode saber que
  // estão ali (não escondidos e fora da névoa; os dele, sempre). Uma luz no escuro se vê de longe, como no Foundry.
  function lightsFor(viewer, scene) {
    const gm = isGm(viewer);
    const doCenario = (scene.luzes || []).filter(luz => gm || !luz.escondido)
      .map(luz => ({ x: luz.x, y: luz.y, claro: emPx(scene, luz.claro), penumbra: emPx(scene, luz.penumbra), cor: luz.cor, alpha: luz.alpha ?? 0.5, ...(gm ? { id: luz.id, metros: { claro: luz.claro, penumbra: luz.penumbra }, ...(luz.escondido ? { escondido: true } : {}) } : {}) }));
    const dosTokens = scene.tokens.filter(token => token.luz && (token.luz.claro || token.luz.penumbra)
      && (gm || (token.dono && token.dono === viewer.conta) || (!token.escondido && fogShows(scene, token.x, token.y))))
      .map(token => ({ x: token.x, y: token.y, claro: emPx(scene, token.luz.claro), penumbra: emPx(scene, token.luz.penumbra), token: true }));
    return [...doCenario, ...dosTokens];
  }
  // O que a visão precisa saber da luz para quem olha: a luz global e as luzes (com o raio maior de cada uma).
  const ambienteDe = (viewer, scene) => ({ global: luzDaCena(scene).global, luzes: lightsFor(viewer, scene).map(luz => ({ x: luz.x, y: luz.y, raio: Math.max(luz.claro, luz.penumbra) })) });
  // A arma como o dono e o mestre veem: com os modos que ela faz e se a carga Tech ainda vale (mesa-regras.js).
  const armaParaVer = (arma, campaignId) => ({ ...arma, modos: R.modosDaArma(arma), carregada: R.cargaValida(arma.carga, tableOf(campaignId).state.combate) });
  function tokenFor(viewer, scene, token, campaignId) {
    const gm = isGm(viewer);
    const mine = Boolean(token.dono) && token.dono === viewer.conta;
    if (!gm && !mine && (token.escondido || !fogShows(scene, token.x, token.y))) return null;
    if (!gm && !mine && scene.visao && !algumVe(olhosDe(viewer, scene), token, scene.paredes || [], (token.tamanho || 1) * scene.grade.tamanho * 0.4, ambienteDe(viewer, scene))) return null;
    const view = { id: token.id, nome: token.nome, x: token.x, y: token.y, tamanho: token.tamanho, cor: token.cor, imagem: token.imagem || mediaUrl(viewer, campaignId, token.midia), tipo: token.tipo, meu: mine, estado: woundState(token.hp) };
    // O grupo vê o HP dos personagens; de NPC e de token livre, só o estado de ferimento. Morto e Suprimido, todos veem.
    if (gm || mine || token.tipo === 'pj') view.hp = token.hp;
    if (token.morto) view.morto = true;
    if (token.suprimido) view.suprimido = true;
    // A ficha de combate (SP, armas com o pente, Sorte, lesões, Death Save): o dono e o mestre.
    if (gm || mine) {
      Object.assign(view, {
        move: token.move ?? null, personagem: token.personagem || null, escondido: Boolean(token.escondido),
        alcance: token.alcance ?? ALCANCE_PADRAO, luz: token.luz || { claro: 0, penumbra: 0 },
        sp: token.sp || null, armas: (token.armas || []).map(arma => armaParaVer(arma, campaignId)), lesoes: token.lesoes || [], deathSave: token.deathSave || 0,
        ...(token.sorte ? { sorte: token.sorte } : {}), ...(token.humanidade ? { humanidade: token.humanidade } : {}), ...(token.cromo ? { cromo: token.cromo } : {})
      });
    }
    if (gm) {
      Object.assign(view, { notas: token.notas || '', dono: token.dono || null, ref: token.ref ?? null });
      if (token.tipo === 'npc') Object.assign(view, { npc: token.npc, stats: token.stats, pericias: token.pericias });
    }
    return view;
  }
  function sceneFor(viewer, scene, campaignId, connection) {
    const luzes = lightsFor(viewer, scene);
    if (connection) connection.luzesVistas = JSON.stringify(luzes);
    const tokens = [];
    const seen = new Map();
    for (const token of scene.tokens) {
      const view = tokenFor(viewer, scene, token, campaignId);
      if (!view) continue;
      tokens.push(view);
      seen.set(token.id, JSON.stringify(view));
    }
    if (connection) connection.vistos = seen;
    const gm = isGm(viewer);
    return {
      id: scene.id, nome: scene.nome, largura: scene.largura, altura: scene.altura, grade: scene.grade, margem: margemDe(scene),
      imagem: mediaUrl(viewer, campaignId, scene.imagem), video: VIDEO_FILE.test(scene.imagem || ''),
      nevoa: { ativa: Boolean(scene.nevoa && scene.nevoa.ativa), tracos: (scene.nevoa && scene.nevoa.tracos) || [] },
      // Tile escondido (no Foundry, o que o mestre ainda não revelou) só vai para o mestre.
      tiles: (scene.tiles || []).filter(tile => gm || !tile.escondido).map(({ midia, ...tile }) => ({ ...tile, imagem: mediaUrl(viewer, campaignId, midia), video: VIDEO_FILE.test(midia || '') })),
      tokens, visao: Boolean(scene.visao), paredes: wallsFor(viewer, scene),
      luz: luzDaCena(scene), luzes,
      ...(gm ? { origem: scene.origem || null } : {})
    };
  }
  // As paredes: o mestre recebe todas (para ver e editar). O jogador recebe as portas (para abrir e fechar) e, com a
  // visão ligada, as paredes que bloqueiam a vista agora; a porta secreta fechada chega como parede (ele não sabe que é
  // porta) e, aberta, não chega.
  function wallsFor(viewer, scene) {
    const paredes = scene.paredes || [];
    if (isGm(viewer)) return paredes.map(({ id, c, porta, estado, visao, luz, movimento }) => ({ id, c, porta, estado, visao, luz, movimento }));
    return paredes.filter(parede => parede.porta === 1 || (scene.visao && (bloqueiaVista(parede) || bloqueiaLuz(parede))))
      .map(({ id, c, porta, estado, visao, luz, movimento }) => ({ id, c, porta: porta === 1 ? 1 : 0, estado: porta === 1 ? estado : 0, visao, luz, movimento }));
  }
  const scenesList = state => state.cenas.map(scene => ({ id: scene.id, nome: scene.nome, tokens: scene.tokens.length, ativa: scene.id === state.cenaAtiva }));
  function combatFor(viewer, state, campaignId) {
    const combat = state.combate;
    if (!combat) return null;
    if (!isGm(viewer) && combat.cena !== state.cenaAtiva) return null;
    const scene = sceneById(state, combat.cena);
    const ordem = [];
    for (const entry of combat.ordem) {
      const token = scene && scene.tokens.find(item => item.id === entry.token);
      const view = token && tokenFor(viewer, scene, token, campaignId);
      if (!view) continue;
      ordem.push({ token: entry.token, nome: view.nome, imagem: view.imagem, cor: view.cor, iniciativa: entry.iniciativa, meu: view.meu, morto: Boolean(view.morto), mortal: Boolean(token.hp && token.hp.atual < 1), ...(isGm(viewer) ? { escondido: Boolean(token.escondido) } : {}) });
    }
    const current = combat.ordem[combat.vez];
    const vez = current && ordem.some(entry => entry.token === current.token) ? current.token : null;
    return { cena: combat.cena, rodada: combat.rodada, vez, ordem, deathSave: combat.deathSave && combat.deathSave === vez ? combat.deathSave : null };
  }
  // Rolagem secreta: o mestre e quem rolou. Ataque esperando a defesa: o mestre e quem atacou (o alvo decide às cegas).
  // Sussurro (para): o mestre, quem escreveu e as contas da lista.
  const canSeeEntry = (viewer, entry) => isGm(viewer) || (Boolean(entry.autor.conta) && entry.autor.conta === viewer.conta)
    || (Array.isArray(entry.para) ? entry.para.includes(viewer.conta) : !entry.secreta && !entry.pendente);
  // O HP de NPC não vai para os jogadores, nem pelo cartão do ataque: o dano e a armadura sim, o HP antes e depois não.
  const hpVisivel = (viewer, tipo, dono) => isGm(viewer) || tipo === 'pj' || (Boolean(dono) && dono === viewer.conta);
  const semHp = dano => (dano ? { ...dano, hp: null } : dano);
  function entryFor(viewer, entry) {
    const { conta, ...autor } = entry.autor;
    const { desfazer, ...resto } = entry;
    if (resto.ataque && Array.isArray(resto.ataque.alvos)) {
      resto.ataque = { ...resto.ataque, alvos: resto.ataque.alvos.map(({ dono, ...alvo }) => (hpVisivel(viewer, alvo.tipo, dono) ? alvo : { ...alvo, dano: semHp(alvo.dano) })) };
    }
    if (resto.tipo === 'dano' && !hpVisivel(viewer, resto.alvoTipo, resto.alvoDono)) resto.dano = semHp(resto.dano);
    delete resto.alvoDono;
    return { ...resto, ...(isGm(viewer) && desfazer && !entry.desfeito ? { podeDesfazer: true } : {}), autor: { ...autor, meu: isGm(viewer) ? autor.papel === 'mestre' : Boolean(conta) && conta === viewer.conta } };
  }
  const sceneIdOf = (connection, state) => (isGm(connection.viewer) && connection.cena && sceneById(state, connection.cena) ? connection.cena : state.cenaAtiva);

  function stateFor(connection) {
    const { viewer } = connection;
    const state = tableOf(connection.campanha).state;
    const scene = sceneById(state, sceneIdOf(connection, state));
    const campaign = campaigns.get(connection.campanha) || { nome: connection.campanha, cor: COLORS[0] };
    const gm = isGm(viewer);
    const fichas = cardsFor(viewer, readCharacters(connection.campanha));
    connection.fichasVistas = JSON.stringify(fichas);
    return {
      conexao: connection.id || null, versao,
      eu: { papel: viewer.papel, nome: viewer.nome, cor: connection.cor, conta: viewer.conta },
      campanha: { id: idFor(viewer, connection.campanha), nome: gm ? campaign.nome : campaign.nomeJogadores || campaign.nome, cor: campaign.cor },
      cena: scene ? sceneFor(viewer, scene, connection.campanha, connection) : null,
      combate: combatFor(viewer, state, connection.campanha),
      registro: state.registro.filter(entry => canSeeEntry(viewer, entry)).map(entry => entryFor(viewer, entry)),
      // As defesas que esperam esta pessoa (quem reconecta no meio de um ataque ainda responde).
      defesas: combatFlow.perguntasPara(viewer, connection.campanha),
      presenca: presenceOf(connection.campanha),
      ...(gm ? {
        cenas: scenesList(state), cenaAtiva: state.cenaAtiva,
        personagens: fichas,
        npcs: wikiData().npcs.map(({ id, nome, grupo, livro, pagina, hp, stats }) => ({ id, nome, grupo, livro, pagina, hp, ref: stats.REF, move: stats.MOVE }))
      } : { meus: fichas })
    };
  }
  // As fichas que cada um recebe: o mestre, todas as da campanha; o jogador, as dele.
  const cardsFor = (viewer, docs, cards = null) => docs.filter(doc => isGm(viewer) || (doc.dono && doc.dono === viewer.conta)).map(doc => (cards ? cards.get(doc.id) : characterCard(doc)));
  // Uma ficha mudou (pela mesa, pela wiki ou pelo Foundry): quem vê manda de novo só para quem recebe aquela ficha.
  function sendCards(campaignId) {
    const docs = readCharacters(campaignId);
    let cards = null;
    for (const connection of connections.values()) {
      if (connection.campanha !== campaignId) continue;
      cards = cards || new Map(docs.map(doc => [doc.id, characterCard(doc)]));
      const lista = cardsFor(connection.viewer, docs, cards);
      const texto = JSON.stringify(lista);
      if (connection.fichasVistas === texto) continue;
      connection.fichasVistas = texto;
      sendEvent(connection, 'fichas', isGm(connection.viewer) ? { personagens: lista } : { meus: lista });
    }
  }

  // ---------------- Conexões ao vivo ----------------
  const connections = new Map();
  function sendEvent(connection, event, data) {
    const { response } = connection;
    if (response.destroyed || response.writableEnded) return;
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  function presenceOf(campaignId) {
    const people = new Map();
    for (const connection of connections.values()) {
      if (connection.campanha !== campaignId) continue;
      const key = isGm(connection.viewer) ? 'mestre' : connection.viewer.conta;
      if (!people.has(key)) people.set(key, { nome: connection.viewer.nome, papel: connection.viewer.papel, cor: connection.cor, conta: connection.viewer.conta });
    }
    return [...people.values()];
  }
  function broadcastPresence(campaignId) {
    const list = presenceOf(campaignId);
    for (const connection of connections.values()) if (connection.campanha === campaignId) sendEvent(connection, 'presenca', list);
  }
  function openStream(request, response, identity, campaignId) {
    response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'private, no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write('retry: 2000\n\n');
    const viewer = viewerOf(identity);
    const connection = { id: newId(), campanha: campaignId, viewer, cor: colorOf(viewer), response, cena: null, vistos: new Map() };
    connections.set(connection.id, connection);
    sendEvent(connection, 'estado', stateFor(connection));
    broadcastPresence(campaignId);
    // O pulso mantém a conexão aberta no Caddy e no túnel, e confere de novo quem é quem: o jogador desconectado pela
    // wiki (ou tirado da campanha) sai da mesa em até 20 segundos.
    const pulse = setInterval(() => {
      const now = who(request);
      if (now.papel !== viewer.papel || (now.conta ? now.conta.id : null) !== viewer.conta || !now.campanhas.includes(campaignId)) return response.end();
      response.write(': pulso\n\n');
    }, PULSE);
    const close = () => {
      clearInterval(pulse);
      if (connections.delete(connection.id)) broadcastPresence(campaignId);
    };
    request.on('close', close);
    response.on('close', close);
    response.on('error', close);
  }
  function diffTokens(connection, state) {
    const scene = sceneById(state, sceneIdOf(connection, state));
    const seen = new Map();
    if (scene) {
      for (const token of scene.tokens) {
        const view = tokenFor(connection.viewer, scene, token, connection.campanha);
        if (!view) continue;
        const text = JSON.stringify(view);
        seen.set(token.id, text);
        if (connection.vistos.get(token.id) !== text) sendEvent(connection, 'token', view);
      }
    }
    for (const id of connection.vistos.keys()) if (!seen.has(id)) sendEvent(connection, 'token.sumir', { id });
    connection.vistos = seen;
    // As luzes dos tokens andam com eles.
    const luzes = scene ? JSON.stringify(lightsFor(connection.viewer, scene)) : '[]';
    if (scene && connection.luzesVistas !== luzes) sendEvent(connection, 'luzes', { cena: scene.id, luzes: JSON.parse(luzes) });
    connection.luzesVistas = luzes;
  }
  // Depois de cada operação: para cada conexão da campanha, só o que mudou para ela.
  function broadcast(campaignId, effects) {
    const state = tableOf(campaignId).state;
    for (const connection of connections.values()) {
      if (connection.campanha !== campaignId) continue;
      const { viewer } = connection;
      const lost = connection.cena && !sceneById(state, connection.cena);
      if (lost) connection.cena = null;
      const sceneId = sceneIdOf(connection, state);
      const full = lost || (effects.ativa && !connection.cena) || (effects.cena && effects.cena === sceneId);
      if (full) {
        const scene = sceneById(state, sceneId);
        if (!scene) connection.vistos = new Map();
        sendEvent(connection, 'cena', { cena: scene ? sceneFor(viewer, scene, campaignId, connection) : null });
      } else {
        if (effects.nevoa && effects.nevoa.cena === sceneId) sendEvent(connection, 'nevoa', effects.nevoa);
        if (effects.paredes && effects.paredes === sceneId) sendEvent(connection, 'paredes', { cena: sceneId, paredes: wallsFor(viewer, sceneById(state, sceneId)) });
        if (effects.tokens || effects.nevoa || effects.paredes) diffTokens(connection, state);
      }
      if (effects.cenas && isGm(viewer)) sendEvent(connection, 'cenas', { cenas: scenesList(state), cenaAtiva: state.cenaAtiva });
      if (effects.combate || ((effects.tokens || effects.nevoa || effects.paredes || full) && state.combate)) sendEvent(connection, 'combate', combatFor(viewer, state, campaignId));
      if (effects.registro && canSeeEntry(viewer, effects.registro)) sendEvent(connection, 'registro', entryFor(viewer, effects.registro));
      // Um cartão que mudou (o ataque resolvido, o desfeito): troca no lugar; quem não tinha, recebe agora.
      if (effects.registroTroca && canSeeEntry(viewer, effects.registroTroca)) sendEvent(connection, 'registro.troca', entryFor(viewer, effects.registroTroca));
      if (effects.registroLimpo) sendEvent(connection, 'registro.limpo', {});
      if (effects.esquecer) sendEvent(connection, 'visao.esquecer', { cena: effects.esquecer });
    }
    if (effects.fichas) sendCards(campaignId);
  }

  // ---------------- Operações ----------------
  const canControl = (viewer, token) => isGm(viewer) || (Boolean(token.dono) && token.dono === viewer.conta);
  function sceneArg(state, id) {
    const scene = sceneById(state, id ? String(id) : state.cenaAtiva);
    if (!scene) throw fail(404, id ? 'Cena não encontrada.' : 'Abra uma cena antes.');
    return scene;
  }
  function lightArg(state, id) {
    for (const scene of state.cenas) {
      const luz = (scene.luzes || []).find(item => item.id === String(id || ''));
      if (luz) return { scene, luz };
    }
    throw fail(404, 'Luz não encontrada.');
  }
  function tileArg(state, id) {
    for (const scene of state.cenas) {
      const tile = (scene.tiles || []).find(item => item.id === String(id || ''));
      if (tile) return { scene, tile };
    }
    throw fail(404, 'Tile não encontrado.');
  }
  function wallArg(state, id) {
    for (const scene of state.cenas) {
      const parede = (scene.paredes || []).find(item => item.id === String(id || ''));
      if (parede) return { scene, parede };
    }
    throw fail(404, 'Parede não encontrada.');
  }
  function tokenArg(state, viewer, id) {
    const found = findToken(state, String(id || ''));
    if (!found.token) throw fail(404, 'Token não encontrado.');
    if (!isGm(viewer) && found.scene.id !== state.cenaAtiva) throw fail(404, 'Token não encontrado.');
    return found;
  }
  // tipo: quadrada ou nenhuma (no Foundry, a cena sem grade: mede em linha reta e não encaixa).
  // metros e unidade: quanto vale um quadrado (2 m nas cenas da mesa; nas arquiteturas da NET, 8 "bit").
  function cleanGrid(input = {}, current = {}) {
    const size = int(input.tamanho ?? current.tamanho, 30, 400, 100);
    const tipo = input.tipo ?? current.tipo;
    return {
      tamanho: size,
      tipo: tipo === 'nenhuma' ? 'nenhuma' : 'quadrada',
      metros: Math.round(real(input.metros ?? current.metros, 0.1, 1000, 2) * 10) / 10,
      unidade: line(input.unidade ?? current.unidade, 8) || 'm',
      visivel: tipo === 'nenhuma' ? false : input.visivel === undefined ? current.visivel !== false : Boolean(input.visivel),
      x: int(input.x ?? current.x, 0, size - 1, 0),
      y: int(input.y ?? current.y, 0, size - 1, 0)
    };
  }
  function mediaArg(campaignId, value, { optional = true } = {}) {
    const name = String(value || '');
    if (!name) { if (optional) return ''; throw fail(400, 'Falta a imagem.'); }
    if (!MEDIA_FILE.test(name) || !fs.existsSync(path.join(tableDir(campaignId), 'midia', name))) throw fail(400, 'Mapa ou imagem não encontrado: envie de novo.');
    return name;
  }
  // A margem em volta do mapa (o padding do Foundry): o token pode ficar ali, fora do mapa, como numa sala de espera.
  const margemDe = scene => scene.margem || { x: 0, y: 0 };
  const cleanMargem = (input = {}) => ({ x: int(input.x, 0, 4000, 0), y: int(input.y, 0, 4000, 0) });
  // Um ponto dentro do mapa ou da margem.
  function naCena(scene, x, y) {
    const margem = margemDe(scene);
    return { x: Math.round(clamp(x, -margem.x, scene.largura + margem.x)), y: Math.round(clamp(y, -margem.y, scene.altura + margem.y)) };
  }
  const numero = (value, fallback) => (value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) ? fallback : Number(value));
  const cleanTile = (campaignId, scene, input) => ({
    id: newId(), midia: mediaArg(campaignId, input.midia, { optional: false }),
    x: Math.round(real(input.x, -scene.largura, scene.largura * 2, 0)), y: Math.round(real(input.y, -scene.altura, scene.altura * 2, 0)),
    largura: Math.round(real(input.largura, 1, 16000, 100)), altura: Math.round(real(input.altura, 1, 16000, 100)),
    rotacao: Math.round(real(input.rotacao, -360, 360, 0)), alpha: Math.round(real(input.alpha, 0, 1, 1) * 100) / 100, escondido: Boolean(input.escondido)
  });
  // Paredes e luzes com os números do Foundry, nas coordenadas do mapa. porta: 0 nenhuma, 1 porta, 2 secreta; estado:
  // 0 fechada, 1 aberta, 2 trancada; visao e movimento: 0 não bloqueia, 10 limitada, 20 bloqueia. As luzes ficam
  // guardadas (a visão da mesa ainda não usa alcance nem escuridão).
  const cleanWall = input => ({
    id: newId(), c: (Array.isArray(input.c) ? input.c : []).slice(0, 4).map(value => Math.round(real(value, -50000, 50000, 0))),
    porta: int(input.porta, 0, 2, 0), estado: int(input.estado, 0, 2, 0),
    movimento: int(input.movimento, 0, 30, 20), visao: int(input.visao, 0, 30, 20), luz: int(input.luz, 0, 30, 20)
  });
  // A luz da cena: global (a cena toda clara) e a escuridão (de 0, dia, a 1, noite fechada).
  const cleanLuzDaCena = (input = {}, atual = {}) => ({ global: input.global === undefined ? atual.global !== false : Boolean(input.global), escuridao: Math.round(real(input.escuridao ?? atual.escuridao, 0, 1, 0) * 100) / 100 });
  // A luz que o token leva, em metros.
  const cleanLuzDoToken = (input = {}) => ({ claro: Math.round(real(input.claro, 0, 60, 0) * 10) / 10, penumbra: Math.round(real(input.penumbra, 0, 60, 0) * 10) / 10 });
  const cleanLight = input => ({
    id: newId(), x: Math.round(real(input.x, -50000, 50000, 0)), y: Math.round(real(input.y, -50000, 50000, 0)),
    claro: real(input.claro, 0, 1000, 0), penumbra: real(input.penumbra, 0, 1000, 0), angulo: real(input.angulo, 0, 360, 360),
    cor: COLOR_RE.test(input.cor || '') ? input.cor : null, alpha: Math.round(real(input.alpha, 0, 1, 0.5) * 100) / 100, escondido: Boolean(input.escondido)
  });
  // Ficha de NPC da wiki pelo nome (o "base" que o cpr-2077 grava no ator do Foundry, ou o nome do token).
  const presetByName = name => { const wanted = plain(name); return wanted ? wikiData().npcs.find(npc => plain(npc.nome) === wanted) || null : null; };
  // Um token novo: de um personagem da campanha, de uma ficha de NPC da wiki ou livre (com imagem e HP, se vierem).
  // fallback: na importação, personagem ou ficha que não existe vira token livre em vez de erro.
  function buildToken(scene, campaignId, input, { fallback = false } = {}) {
    const base = {
      id: newId(), ...naCena(scene, numero(input.x, scene.largura / 2), numero(input.y, scene.altura / 2)),
      tamanho: int(input.tamanho, 1, 4, 1), escondido: Boolean(input.escondido), notas: '', midia: input.midia ? mediaArg(campaignId, input.midia) : '',
      alcance: Math.round(real(numero(input.alcance, ALCANCE_PADRAO), 0, 1000, ALCANCE_PADRAO)), luz: cleanLuzDoToken(input.luz)
    };
    if (input.personagem) {
      const doc = readCharacter(campaignId, String(input.personagem));
      if (doc) {
        if (scene.tokens.some(item => item.personagem === doc.id)) throw fail(409, `${line(doc.nome, 80) || 'Esse personagem'} já está nesta cena.`);
        const sheet = sheetOf(doc);
        return { ...base, midia: '', tipo: 'pj', nome: line(doc.nome, 40) || 'Personagem', personagem: doc.id, dono: doc.dono || null, imagem: portraitOf(doc), cor: colorOfAccount(doc.dono), ref: sheet.stats.REF ?? null, move: sheet.stats.MOVE ?? null, ...combatFields(doc) };
      }
      if (!fallback) throw fail(404, 'Personagem não encontrado nesta campanha.');
    }
    const preset = input.npc ? wikiData().npcs.find(item => item.id === String(input.npc)) : input.npcNome ? presetByName(input.npcNome) : null;
    if (input.npc && !preset && !fallback) throw fail(404, 'Ficha de NPC não encontrada.');
    if (preset) {
      const count = scene.tokens.filter(item => item.npc === preset.id).length;
      const nome = input.nome ? line(input.nome, 40) : count ? `${preset.nome} ${count + 1}` : preset.nome;
      // A armadura da ficha do livro ("SP 7 na cabeça e no corpo") e as armas com a classe (a linha da DV por alcance).
      // NPC do livro não conta bala.
      const armas = preset.armas.map((arma, index) => K.comPerfil({ id: `npc:${index}`, nome: arma.nome, dano: arma.dano, cdt: arma.cdt, pericia: arma.pericia, nota: arma.nota,
        distancia: !/Melee|Brawling|Martial/i.test(arma.pericia), classe: R.classeDaArma({ nome: arma.nome, pericia: arma.pericia, distancia: !/Melee|Brawling|Martial/i.test(arma.pericia) }), pente: null }, wikiData().armas2077));
      return { ...base, tipo: 'npc', nome, npc: preset.id, dono: null, imagem: '', cor: '#ff3158', hp: { atual: preset.hp, max: preset.hp }, ref: preset.stats.REF, move: preset.stats.MOVE, stats: preset.stats, pericias: preset.pericias,
        armas, sp: R.spDaFicha(preset.armadura), lesoes: [], deathSave: 0, morto: false };
    }
    const livre = input.livre && typeof input.livre === 'object' ? input.livre : input;
    const hp = int(livre.hp, 0, 999, 0);
    return { ...base, tipo: 'livre', nome: line(livre.nome, 40) || 'Token', dono: null, imagem: '', cor: COLOR_RE.test(livre.cor || '') ? livre.cor : '#a9aeaa', hp: hp ? { atual: hp, max: hp } : null, ref: int(livre.ref, 0, 20, 0), move: livre.move ? int(livre.move, 0, 20, 0) : null,
      armas: [], sp: { cabeca: { atual: 0, max: 0 }, corpo: { atual: 0, max: 0 } }, lesoes: [], deathSave: 0, morto: false };
  }
  // O que mudou num personagem vai para a ficha dele (doc.jogo), pela fila do api-personagens.js. Os NPCs e os tokens
  // livres guardam no próprio token (quem chama já mudou o token).
  // writing: a conferência das fichas pula quem está sendo gravado (senão leria a ficha de antes e voltaria o token).
  const writing = new Map();
  async function gravando(personagem, fn) {
    writing.set(personagem, (writing.get(personagem) || 0) + 1);
    try { return await fn(); } finally {
      const left = writing.get(personagem) - 1;
      if (left > 0) writing.set(personagem, left); else writing.delete(personagem);
    }
  }
  async function writeSheet(campaignId, token, mudancas) {
    if (token.tipo !== 'pj' || !updateCharacter) return;
    await gravando(token.personagem, async () => {
      const done = await updateCharacter(token.personagem, doc => {
        if ((doc.campanha || campaigns.first) !== campaignId) return { status: 404, data: { erro: 'Personagem de outra campanha.' } };
        doc.jogo = characterGame.comJogo(doc, mudancas);
        return null;
      });
      if (done && done.status) console.error(`Mesa: a ficha de ${token.nome} não foi gravada (${done.data && done.data.erro}).`);
    });
  }
  // Uma mudança que parte da ficha gravada (não da cópia no token): o ajuste do mestre, o uso de um item, a recarga.
  // conta(doc) devolve { mudancas, ... } ou { erro }; o erro volta para quem pediu. Depois, os tokens do personagem
  // pegam a ficha nova.
  async function writeCharacter(campaignId, personagem, conta) {
    if (!updateCharacter) throw fail(409, 'A ficha dos personagens não está ligada a esta mesa.');
    const feito = await gravando(personagem, async () => {
      let resultado = null;
      const done = await updateCharacter(personagem, doc => {
        if ((doc.campanha || campaigns.first) !== campaignId) return { status: 404, data: { erro: 'Personagem não encontrado nesta campanha.' } };
        resultado = conta(doc);
        if (resultado.erro) return { status: resultado.status || 400, data: { erro: resultado.erro } };
        doc.jogo = characterGame.comJogo(doc, resultado.mudancas);
        return null;
      });
      if (done && done.status) throw fail(done.status, (done.data && done.data.erro) || 'A ficha não foi gravada.');
      return { ...resultado, doc: done.doc };
    });
    refreshTokensOf(campaignId, feito.doc);
    return feito;
  }
  function refreshTokensOf(campaignId, doc) {
    let changed = false;
    for (const scene of tableOf(campaignId).state.cenas) {
      for (const token of scene.tokens) {
        if (token.tipo !== 'pj' || token.personagem !== doc.id) continue;
        Object.assign(token, combatFields(doc), { imagem: portraitOf(doc), dono: doc.dono || null });
        changed = true;
      }
    }
    return changed;
  }
  // O personagem pelo id, só se for da campanha (e, para o jogador, só se for dele).
  function characterArg(campaignId, viewer, id) {
    const doc = readCharacter(campaignId, String(id || ''));
    if (!doc) throw fail(404, 'Personagem não encontrado nesta campanha.');
    if (!isGm(viewer) && !(doc.dono && doc.dono === viewer.conta)) throw fail(403, 'Esse personagem é de outro jogador.');
    return doc;
  }
  function addEntry(state, entry) {
    const full = { id: newId(), quando: new Date().toISOString(), secreta: false, ...entry };
    state.registro.push(full);
    if (state.registro.length > MAX_LOG) state.registro.splice(0, state.registro.length - MAX_LOG);
    return full;
  }
  const authorOf = (viewer, color) => ({ nome: viewer.nome, papel: viewer.papel, conta: viewer.conta, cor: color });
  const systemEntry = (state, texto) => addEntry(state, { tipo: 'sistema', autor: { nome: 'Mesa', papel: 'sistema', conta: null, cor: '#a9aeaa' }, texto });

  // REF de quem rola a iniciativa: a ficha de agora (personagem), a ficha do livro (NPC) ou o que o mestre pôs.
  function refOf(campaignId, token) {
    if (token.tipo === 'pj') {
      const doc = readCharacter(campaignId, token.personagem);
      const ref = doc ? sheetOf(doc).stats.REF : undefined;
      return Number.isFinite(ref) ? ref : Number(token.ref) || 0;
    }
    if (token.tipo === 'npc') return Number(token.stats && token.stats.REF) || 0;
    return Number(token.ref) || 0;
  }
  // Iniciativa = REF + 1d10, em ordem decrescente; empates rolam de novo (RED p. 168).
  function sortInitiative(list) {
    const groups = new Map();
    for (const entry of list) groups.set(entry.iniciativa, [...(groups.get(entry.iniciativa) || []), entry]);
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (let tries = 0; tries < 20 && new Set(group.map(entry => entry.desempate)).size < group.length; tries += 1) {
        for (const entry of group) entry.desempate = die(10);
      }
    }
    list.sort((a, b) => b.iniciativa - a.iniciativa || (b.desempate || 0) - (a.desempate || 0));
  }
  function rollInitiative(campaignId, token) {
    const ref = refOf(campaignId, token);
    const dado = die(10);
    return { token: token.id, iniciativa: ref + dado, ref, dado, desempate: 0 };
  }
  // Mexer na ordem sem trocar de quem é a vez.
  function keepTurn(combat, change) {
    const current = combat.ordem[combat.vez] && combat.ordem[combat.vez].token;
    change();
    const index = combat.ordem.findIndex(entry => entry.token === current);
    combat.vez = index >= 0 ? index : clamp(combat.vez, 0, Math.max(0, combat.ordem.length - 1));
  }
  function dropFromCombat(state, tokenId) {
    const combat = state.combate;
    if (!combat || !combat.ordem.some(entry => entry.token === tokenId)) return false;
    const index = combat.ordem.findIndex(entry => entry.token === tokenId);
    combat.ordem.splice(index, 1);
    if (index < combat.vez) combat.vez -= 1;
    if (combat.vez >= combat.ordem.length) combat.vez = 0;
    if (!combat.ordem.length) state.combate = null;
    return true;
  }

  // Quem rola: o token (o mestre, qualquer um; o jogador, o dele) ou um personagem dele sem token na cena.
  function rollSource(state, viewer, campaignId, body) {
    if (body.token) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Você só rola pelo seu token.');
      if (token.tipo === 'npc') return { nome: token.nome, tipo: 'npc', stats: token.stats || {}, pericias: token.pericias || [], hp: token.hp };
      const doc = token.tipo === 'pj' ? readCharacter(campaignId, token.personagem) : null;
      return { nome: token.nome, tipo: token.tipo, sheet: doc ? sheetOf(doc) : null, hp: token.hp };
    }
    if (body.personagem) {
      const doc = readCharacter(campaignId, String(body.personagem));
      if (!doc || (!isGm(viewer) && doc.dono !== viewer.conta)) throw fail(404, 'Personagem não encontrado.');
      const sheet = sheetOf(doc);
      return { nome: line(doc.nome, 80) || 'Personagem', tipo: 'pj', sheet, hp: sheet.hp };
    }
    return null;
  }
  // Teste do RED: STAT + perícia + 1d10. 10 natural rola mais 1d10 e soma; 1 natural rola mais 1d10 e subtrai, uma
  // vez só (p. 130). Gravemente Ferido tira 2 de tudo; Mortalmente Ferido, 4.
  function skillCheck(viewer, source, body) {
    const wiki = wikiData();
    const parts = [];
    let label;
    const statName = String(body.stat || '').toUpperCase();
    if (source && body.pericia) {
      const en = String(body.pericia);
      if (source.tipo === 'npc') {
        const skill = source.pericias.find(item => item.nome === en);
        if (!skill) throw fail(400, 'Essa ficha não tem essa perícia.');
        parts.push({ rotulo: `${skill.pt} (base)`, valor: skill.base });
        label = skill.pt;
      } else {
        const sheet = source.sheet || { stats: {}, pericias: [] };
        const skill = sheet.pericias.find(item => item.nome === en);
        const stat = (skill && skill.stat) || (wiki.skills.get(en) || {}).stat || '';
        if (!stat) throw fail(400, 'Perícia desconhecida.');
        label = skill ? skill.pt : wiki.ptOf ? wiki.ptOf(en) : en;
        parts.push({ rotulo: stat, valor: sheet.stats[stat] || 0 }, { rotulo: label, valor: skill ? skill.nivel : 0 });
      }
    } else if (source && STATS.has(statName)) {
      const value = source.tipo === 'npc' ? source.stats[statName] : source.sheet ? source.sheet.stats[statName] : 0;
      parts.push({ rotulo: statName, valor: Number(value) || 0 });
      label = statName;
    } else {
      label = line(body.rotulo, 60) || 'Teste';
      if (isGm(viewer) && body.base !== undefined) parts.push({ rotulo: 'Base', valor: int(body.base, -20, 50, 0) });
    }
    const wound = source && woundState(source.hp);
    if (woundPenalty(wound)) parts.push({ rotulo: wound, valor: woundPenalty(wound) });
    const mod = int(body.mod, -30, 30, 0);
    if (mod) parts.push({ rotulo: 'Modificador', valor: mod });
    const first = die(10);
    const extra = first === 10 ? die(10) : first === 1 ? -die(10) : 0;
    return { tipo: 'teste', rotulo: label, partes: parts, dado: first, extra, critico: first === 10 ? 'sucesso' : first === 1 ? 'falha' : null, total: parts.reduce((sum, part) => sum + part.valor, 0) + first + extra };
  }
  // Dados livres (o dano, quase sempre). Dois ou mais 6 nos dados de dano de um ataque: lesão crítica (p. 187).
  function freeRoll(body) {
    const match = String(body.expressao || '').match(DICE_RE);
    if (!match) throw fail(400, 'Use o formato NdM, como 3d6 ou 1d10+2.');
    const count = Number(match[1]);
    const faces = Number(match[2]);
    if (count < 1 || count > 20 || faces < 2 || faces > 100) throw fail(400, 'De 1 a 20 dados, de 2 a 100 faces.');
    const bonus = (match[3] === '-' ? -1 : 1) * Number(match[4] || 0) + int(body.mod, -30, 30, 0);
    const dados = pool(count, faces);
    const sixes = faces === 6 ? dados.filter(value => value === 6).length : 0;
    return { tipo: 'dados', rotulo: `${count}d${faces}${bonus ? `${bonus > 0 ? '+' : ''}${bonus}` : ''}`, dados, bonus, total: dados.reduce((sum, value) => sum + value, 0) + bonus, ...(faces === 6 && count >= 2 ? { lesao: sixes >= 2 } : {}) };
  }
  function criticalInjury(body) {
    const head = body.local === 'cabeca';
    const rows = head ? wikiData().critHead : wikiData().critBody;
    const dados = pool(2, 6);
    const total = dados[0] + dados[1];
    const row = rows.find(item => item[0] === total);
    return { tipo: 'lesao', rotulo: `Lesão crítica (${head ? 'cabeça' : 'corpo'})`, dados, total, lesao: row ? { nome: row[1], efeito: row[2], correcao: row[3], tratamento: row[4] } : null };
  }

  // A recarga do personagem: a munição sai da caixa da ficha (personagem-jogo.js).
  async function recarregar(campaignId, personagem, arma, municao) {
    const feito = await writeCharacter(campaignId, personagem, doc => characterGame.recarga(doc, catalog(), arma, municao));
    return { arma: feito.arma, municao: feito.municao, entrou: feito.entrou, sobra: feito.sobra };
  }
  // O texto do registro quando o mestre muda um número da ficha.
  const NOME_DO_CAMPO = { dinheiro: 'Dinheiro', ip: 'Pontos de Melhoria', reputacao: 'Reputação', humanidade: 'Humanidade' };
  const comSinal = n => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
  function textoDoAjuste(nome, campo, feito) {
    const motivo = (feito.mudancas.extrato[feito.mudancas.extrato.length - 1] || {}).motivo;
    const diferenca = feito.depois - feito.antes;
    const humanidade = campo === 'humanidade' ? characterGame.ficha(feito.doc).humanidade : null;
    const agora = campo === 'dinheiro' ? `${feito.depois.toLocaleString('pt-BR')}eb` : humanidade ? `${humanidade.atual}/${humanidade.max} (EMP ${Math.max(0, Math.floor(humanidade.atual / 10))})` : String(feito.depois);
    return `${nome}: ${NOME_DO_CAMPO[campo]} ${comSinal(diferenca)}${campo === 'dinheiro' ? 'eb' : ''}${motivo ? ` (${motivo})` : ''}. Agora: ${agora}.`;
  }

  const combatFlow = createCombat({
    prazo: prazoDefesa, die, pool, newId, fail, int, line, isGm, canControl, tokenArg, sceneById, tokenFor, readCharacter, sheetOf, writeSheet, recarregar,
    addEntry, systemEntry, authorOf, entryFor, canSeeEntry, connections, sendEvent, broadcast, save, tableOf,
    regras: () => wikiData().regras, ptOf: en => (wikiData().ptOf ? wikiData().ptOf(en) : en),
    critTables: () => ({ corpo: wikiData().critBody, cabeca: wikiData().critHead })
  });

  // mestre: só o mestre. local: só mexe na conexão de quem pediu (não grava nem avisa ninguém).
  const OPERATIONS = {
    'cena.criar': { mestre: true, run({ state, body, campaignId }) {
      if (state.cenas.length >= MAX_SCENES) throw fail(400, `Até ${MAX_SCENES} cenas: apague uma antes.`);
      const scene = { id: newId(), nome: line(body.nome, 60) || 'Cena sem nome', imagem: mediaArg(campaignId, body.imagem), largura: int(body.largura, 200, 16000, 3000), altura: int(body.altura, 200, 16000, 2000), grade: cleanGrid(body.grade), margem: cleanMargem(body.margem), luz: cleanLuzDaCena(body.luz), nevoa: { ativa: Boolean(body.nevoa), tracos: [] }, tokens: [], tiles: [], paredes: [], luzes: [] };
      state.cenas.push(scene);
      const first = !state.cenaAtiva;
      if (first) state.cenaAtiva = scene.id;
      return { cenas: true, ativa: first, resultado: { cena: scene.id } };
    } },
    // Uma cena inteira de uma vez (o importador do Foundry): mapa, grade, tiles, tokens, paredes e luzes. A mesma cena
    // do mesmo mundo duas vezes só com substituir (troca a anterior).
    'cena.importar': { mestre: true, run({ state, body, campaignId }) {
      const input = body.cena && typeof body.cena === 'object' ? body.cena : {};
      const origem = input.origem && typeof input.origem === 'object' && input.origem.id ? { sistema: 'foundry', mundo: line(input.origem.mundo, 80), id: line(input.origem.id, 40) } : null;
      const anterior = origem ? state.cenas.find(item => item.origem && item.origem.id === origem.id && item.origem.mundo === origem.mundo) : null;
      if (anterior && !body.substituir) throw fail(409, `A cena "${anterior.nome}" já foi importada deste mundo.`);
      if (!anterior && state.cenas.length >= MAX_SCENES) throw fail(400, `Até ${MAX_SCENES} cenas: apague uma antes.`);
      const scene = {
        id: anterior ? anterior.id : newId(), nome: line(input.nome, 60) || 'Cena importada', imagem: mediaArg(campaignId, input.imagem),
        largura: int(input.largura, 200, 16000, 3000), altura: int(input.altura, 200, 16000, 2000), grade: cleanGrid(input.grade), margem: cleanMargem(input.margem),
        nevoa: { ativa: Boolean(input.nevoa), tracos: [] }, visao: Boolean(input.visao), luz: cleanLuzDaCena(input.luz), tokens: [], tiles: [], paredes: [], luzes: [], origem
      };
      scene.tiles = (Array.isArray(input.tiles) ? input.tiles : []).slice(0, MAX_TILES).map(tile => cleanTile(campaignId, scene, tile));
      scene.paredes = (Array.isArray(input.paredes) ? input.paredes : []).slice(0, MAX_WALLS).map(cleanWall).filter(wall => wall.c.length === 4);
      scene.luzes = (Array.isArray(input.luzes) ? input.luzes : []).slice(0, MAX_LIGHTS).map(cleanLight);
      for (const item of (Array.isArray(input.tokens) ? input.tokens : []).slice(0, MAX_TOKENS)) {
        try { scene.tokens.push(buildToken(scene, campaignId, item, { fallback: true })); } catch (error) { if (!error.status) throw error; }
      }
      if (anterior) {
        state.cenas[state.cenas.indexOf(anterior)] = scene;
        if (state.combate && state.combate.cena === scene.id) state.combate = null;
      } else {
        state.cenas.push(scene);
      }
      return { cenas: true, cena: scene.id, combate: Boolean(anterior), resultado: { cena: scene.id, tokens: scene.tokens.length, tiles: scene.tiles.length, paredes: scene.paredes.length, luzes: scene.luzes.length } };
    } },
    'cena.editar': { mestre: true, run({ state, body, campaignId }) {
      const scene = sceneArg(state, body.cena);
      if (body.nome !== undefined) scene.nome = line(body.nome, 60) || scene.nome;
      if (body.imagem !== undefined) scene.imagem = mediaArg(campaignId, body.imagem);
      if (body.largura !== undefined) scene.largura = int(body.largura, 200, 16000, scene.largura);
      if (body.altura !== undefined) scene.altura = int(body.altura, 200, 16000, scene.altura);
      if (body.grade) scene.grade = cleanGrid(body.grade, scene.grade);
      if (body.visao !== undefined) scene.visao = Boolean(body.visao);
      if (body.luz && typeof body.luz === 'object') scene.luz = cleanLuzDaCena(body.luz, luzDaCena(scene));
      if (body.margem !== undefined) scene.margem = cleanMargem(body.margem);
      for (const token of scene.tokens) Object.assign(token, naCena(scene, token.x, token.y));
      return { cena: scene.id, cenas: true };
    } },
    'cena.apagar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      state.cenas = state.cenas.filter(item => item !== scene);
      const wasActive = state.cenaAtiva === scene.id;
      if (wasActive) state.cenaAtiva = state.cenas.length ? state.cenas[0].id : null;
      const hadCombat = Boolean(state.combate && state.combate.cena === scene.id);
      if (hadCombat) state.combate = null;
      return { cenas: true, ativa: wasActive, combate: hadCombat };
    } },
    'cena.ativar': { mestre: true, run({ state, body }) {
      state.cenaAtiva = sceneArg(state, body.cena).id;
      return { cenas: true, ativa: true, combate: true };
    } },
    // O mestre olha uma cena sem levar os jogadores (no Foundry, ver a cena sem ativar).
    'cena.ver': { mestre: true, local: true, run({ state, body, connection, campaignId }) {
      if (!connection) throw fail(409, 'Conexão da mesa não encontrada: recarregue a página.');
      connection.cena = body.cena ? sceneArg(state, body.cena).id : null;
      const scene = sceneById(state, sceneIdOf(connection, state));
      if (!scene) connection.vistos = new Map();
      sendEvent(connection, 'cena', { cena: scene ? sceneFor(connection.viewer, scene, campaignId, connection) : null });
      return {};
    } },

    'token.criar': { mestre: true, run({ state, body, campaignId }) {
      const scene = sceneArg(state, body.cena);
      if (scene.tokens.length >= MAX_TOKENS) throw fail(400, `Até ${MAX_TOKENS} tokens por cena.`);
      const token = buildToken(scene, campaignId, { ...body, livre: body.livre && typeof body.livre === 'object' ? body.livre : {} });
      scene.tokens.push(token);
      return { tokens: true, cenas: true, resultado: { token: token.id } };
    } },
    'token.mover': { run({ state, viewer, body }) {
      const { scene, token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      const x = Number(body.x);
      const y = Number(body.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw fail(400, 'Posição inválida.');
      const destino = naCena(scene, x, y);
      // O jogador não atravessa parede nem porta fechada (o mestre passa por tudo, como no Foundry).
      if (!isGm(viewer) && atravessa(scene.paredes || [], token, destino)) throw fail(409, 'Uma parede bloqueia o caminho.');
      token.x = destino.x;
      token.y = destino.y;
      return { tokens: true };
    } },
    'token.editar': { async run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      if (!canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
      // O jogador muda só o HP atual do próprio token, como na ficha, e acende ou apaga a lanterna. O resto é do mestre.
      if (!isGm(viewer) && Object.keys(body).some(key => !['tipo', 'token', 'hp', 'luz', 'conexao'].includes(key))) throw fail(403, 'No seu token, você muda só o HP e a lanterna.');
      if (body.luz !== undefined) {
        const luz = cleanLuzDoToken(body.luz);
        const apagada = !luz.claro && !luz.penumbra;
        if (!isGm(viewer) && !apagada && (luz.claro !== LANTERNA.claro || luz.penumbra !== LANTERNA.penumbra)) throw fail(403, 'No seu token, só a lanterna.');
        token.luz = luz;
      }
      if (body.hp && typeof body.hp === 'object') {
        const current = token.hp || { atual: 0, max: 0 };
        // O máximo do personagem é o da ficha; o de NPC e de token livre, o mestre muda aqui.
        const max = isGm(viewer) && token.tipo !== 'pj' ? int(body.hp.max, 0, 999, current.max) : current.max;
        if (max || isGm(viewer)) token.hp = { atual: Math.min(int(body.hp.atual, -99, 999, current.atual), max || 999), max };
        // O HP do personagem volta para a ficha (doc.jogo), pela fila do api-personagens.js.
        if (token.tipo === 'pj' && updateCharacter && token.hp) {
          const atual = token.hp.atual;
          const done = await updateCharacter(token.personagem, doc => {
            if ((doc.campanha || campaigns.first) !== campaignId) return { status: 404, data: { erro: 'Personagem de outra campanha.' } };
            doc.jogo = characterGame.comHp(doc, atual);
            return null;
          });
          if (done && done.status) console.error(`Mesa: o HP de ${token.nome} não voltou para a ficha (${done.data && done.data.erro}).`);
        }
      }
      if (isGm(viewer)) {
        if (body.nome !== undefined) token.nome = line(body.nome, 40) || token.nome;
        if (body.escondido !== undefined) token.escondido = Boolean(body.escondido);
        if (body.cor !== undefined && COLOR_RE.test(body.cor)) token.cor = body.cor;
        if (body.tamanho !== undefined) token.tamanho = int(body.tamanho, 1, 4, token.tamanho);
        // A imagem: o personagem usa o retrato da ficha; o NPC e o token livre, a que o mestre mandar ('' tira).
        if (body.midia !== undefined && token.tipo !== 'pj') token.midia = mediaArg(campaignId, body.midia);
        if (body.notas !== undefined) token.notas = block(body.notas, 2000);
        if (body.alcance !== undefined) token.alcance = Math.round(real(body.alcance, 0, 1000, token.alcance ?? ALCANCE_PADRAO));
      }
      return { tokens: true };
    } },
    // Traz da ficha de agora o nome, o retrato, o HP máximo, o REF e o MOVE (o Foundry pode ter mudado a ficha).
    'token.ficha': { mestre: true, run({ state, viewer, body, campaignId }) {
      const { token } = tokenArg(state, viewer, body.token);
      const doc = token.tipo === 'pj' ? readCharacter(campaignId, token.personagem) : null;
      if (!doc) throw fail(404, 'Este token não vem de um personagem da campanha.');
      const sheet = sheetOf(doc);
      Object.assign(token, { nome: line(doc.nome, 40) || token.nome, imagem: portraitOf(doc), dono: doc.dono || null, ref: sheet.stats.REF ?? token.ref, move: sheet.stats.MOVE ?? token.move, ...combatFields(doc) });
      return { tokens: true };
    } },
    'token.apagar': { mestre: true, run({ state, viewer, body }) {
      const { scene, token } = tokenArg(state, viewer, body.token);
      scene.tokens = scene.tokens.filter(item => item !== token);
      return { tokens: true, cenas: true, combate: dropFromCombat(state, token.id) };
    } },

    // Tiles (no Foundry, os objetos do cenário): o mestre põe, mexe, gira, esconde e tira. A cena inteira vai de novo a
    // todos (tile muda pouco, e o escondido só o mestre recebe).
    // Luzes do cenário (no Foundry, as luzes ambiente): o mestre põe, muda e tira. Em metros, como as do Foundry.
    'luz.criar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      if ((scene.luzes || []).length >= MAX_LIGHTS) throw fail(400, `Até ${MAX_LIGHTS} luzes por cena.`);
      const luz = cleanLight(body);
      scene.luzes = [...(scene.luzes || []), luz];
      return { cena: scene.id, resultado: { luz: luz.id } };
    } },
    'luz.editar': { mestre: true, run({ state, body }) {
      const { scene, luz } = lightArg(state, body.luz);
      const nova = cleanLight({ ...luz, ...body });
      Object.assign(luz, { x: nova.x, y: nova.y, claro: nova.claro, penumbra: nova.penumbra, cor: body.cor === null ? null : nova.cor, alpha: nova.alpha, escondido: nova.escondido });
      return { cena: scene.id };
    } },
    'luz.apagar': { mestre: true, run({ state, body }) {
      const { scene, luz } = lightArg(state, body.luz);
      scene.luzes = scene.luzes.filter(item => item !== luz);
      return { cena: scene.id };
    } },
    'tile.criar': { mestre: true, run({ state, body, campaignId }) {
      const scene = sceneArg(state, body.cena);
      if ((scene.tiles || []).length >= MAX_TILES) throw fail(400, `Até ${MAX_TILES} tiles por cena.`);
      const tile = cleanTile(campaignId, scene, body);
      scene.tiles = [...(scene.tiles || []), tile];
      return { cena: scene.id, resultado: { tile: tile.id } };
    } },
    'tile.editar': { mestre: true, run({ state, body }) {
      const { scene, tile } = tileArg(state, body.tile);
      if (body.x !== undefined) tile.x = Math.round(real(body.x, -scene.largura, scene.largura * 2, tile.x));
      if (body.y !== undefined) tile.y = Math.round(real(body.y, -scene.altura, scene.altura * 2, tile.y));
      if (body.largura !== undefined) tile.largura = Math.round(real(body.largura, 1, 16000, tile.largura));
      if (body.altura !== undefined) tile.altura = Math.round(real(body.altura, 1, 16000, tile.altura));
      if (body.rotacao !== undefined) tile.rotacao = Math.round(real(body.rotacao, -360, 360, tile.rotacao));
      if (body.alpha !== undefined) tile.alpha = Math.round(real(body.alpha, 0, 1, tile.alpha) * 100) / 100;
      if (body.escondido !== undefined) tile.escondido = Boolean(body.escondido);
      // Para a frente (desenhado por último) ou para trás (primeiro).
      if (body.ordem === 'frente' || body.ordem === 'tras') {
        scene.tiles = scene.tiles.filter(item => item !== tile);
        if (body.ordem === 'frente') scene.tiles.push(tile); else scene.tiles.unshift(tile);
      }
      return { cena: scene.id };
    } },
    'tile.apagar': { mestre: true, run({ state, body }) {
      const { scene, tile } = tileArg(state, body.tile);
      scene.tiles = scene.tiles.filter(item => item !== tile);
      return { cena: scene.id };
    } },

    'nevoa.ligar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      scene.nevoa = { ...(scene.nevoa || { tracos: [] }), ativa: Boolean(body.ativa) };
      return { cena: scene.id };
    } },
    'nevoa.traco': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      if (!scene.nevoa || !scene.nevoa.ativa) throw fail(400, 'Ligue a névoa desta cena antes.');
      const modo = body.modo === 'cobrir' ? 'cobrir' : 'revelar';
      const r = int(body.r, 10, 3000, 100);
      const points = (Array.isArray(body.pontos) ? body.pontos : []).slice(0, 60).filter(point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
      if (!points.length) throw fail(400, 'Nenhum ponto.');
      if (scene.nevoa.tracos.length + points.length > MAX_FOG) throw fail(400, 'A névoa desta cena ficou detalhada demais: use Revelar tudo ou Cobrir tudo e pinte de novo.');
      const strokes = points.map(point => ({ modo, x: Math.round(clamp(Number(point.x), 0, scene.largura)), y: Math.round(clamp(Number(point.y), 0, scene.altura)), r }));
      scene.nevoa.tracos.push(...strokes);
      return { nevoa: { cena: scene.id, tracos: strokes } };
    } },
    'nevoa.limpar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      scene.nevoa = { ativa: true, tracos: [] };
      return { cena: scene.id };
    } },
    'nevoa.tudo': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      scene.nevoa = { ativa: true, tracos: [{ modo: 'revelar', tudo: true }] };
      return { cena: scene.id };
    } },

    // Paredes: o mestre desenha, muda e apaga. A porta (porta 1) o jogador abre e fecha se um token dele a vê e ela
    // não está trancada (estado 2); a secreta (porta 2) e o trinco são do mestre, como no Foundry.
    'parede.criar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      const novas = (Array.isArray(body.paredes) ? body.paredes : []).slice(0, 200).map(cleanWall).filter(wall => wall.c.length === 4 && (wall.c[0] !== wall.c[2] || wall.c[1] !== wall.c[3]));
      if (!novas.length) throw fail(400, 'Nenhuma parede.');
      if ((scene.paredes || []).length + novas.length > MAX_WALLS) throw fail(400, `Até ${MAX_WALLS} paredes por cena.`);
      scene.paredes = [...(scene.paredes || []), ...novas];
      return { paredes: scene.id, resultado: { paredes: novas.map(wall => wall.id) } };
    } },
    'parede.editar': { mestre: true, run({ state, body }) {
      const { scene, parede } = wallArg(state, body.parede);
      if (body.porta !== undefined) parede.porta = int(body.porta, 0, 2, parede.porta);
      if (body.estado !== undefined) parede.estado = int(body.estado, 0, 2, parede.estado);
      if (body.visao !== undefined) parede.visao = int(body.visao, 0, 30, parede.visao);
      if (body.movimento !== undefined) parede.movimento = int(body.movimento, 0, 30, parede.movimento);
      if (!parede.porta) parede.estado = 0;
      return { paredes: scene.id };
    } },
    'parede.apagar': { mestre: true, run({ state, body }) {
      const scene = sceneArg(state, body.cena);
      const ids = new Set((Array.isArray(body.paredes) ? body.paredes : [body.parede]).map(String));
      const antes = (scene.paredes || []).length;
      scene.paredes = (scene.paredes || []).filter(wall => !ids.has(wall.id));
      if (scene.paredes.length === antes) throw fail(404, 'Parede não encontrada.');
      return { paredes: scene.id };
    } },
    // O que cada jogador já explorou fica no navegador dele (como a exploração da névoa do Foundry): o mestre manda
    // todos esquecerem (o resetFog).
    'visao.esquecer': { mestre: true, run({ state, body }) {
      return { esquecer: sceneArg(state, body.cena).id };
    } },
    'porta': { run({ state, viewer, body }) {
      const { scene, parede } = wallArg(state, body.parede);
      if (!parede.porta) throw fail(400, 'Isso não é uma porta.');
      if (isGm(viewer)) {
        parede.estado = body.estado === undefined ? (parede.estado === 1 ? 0 : 1) : int(body.estado, 0, 2, parede.estado);
        return { paredes: scene.id };
      }
      if (scene.id !== state.cenaAtiva || parede.porta !== 1) throw fail(404, 'Porta não encontrada.');
      if (parede.estado === 2) throw fail(409, 'A porta está trancada.');
      // O meio da porta fica na própria porta: ela não tapa a si mesma (encostar não conta).
      const meio = { x: (parede.c[0] + parede.c[2]) / 2, y: (parede.c[1] + parede.c[3]) / 2 };
      if (!fogShows(scene, meio.x, meio.y) || (scene.visao && !pontoVisto(olhosDe(viewer, scene), meio, scene.paredes, ambienteDe(viewer, scene)))) throw fail(403, 'Nenhum token seu vê essa porta.');
      parede.estado = parede.estado === 1 ? 0 : 1;
      return { paredes: scene.id };
    } },

    'combate.iniciar': { mestre: true, run({ state, body, campaignId }) {
      const scene = sceneArg(state, body.cena);
      const wanted = Array.isArray(body.tokens) && body.tokens.length ? new Set(body.tokens.map(String)) : null;
      const chosen = scene.tokens.filter(token => (wanted ? wanted.has(token.id) : body.escondidos || !token.escondido));
      if (!chosen.length) throw fail(400, 'Não há tokens para o combate nesta cena.');
      const ordem = chosen.map(token => rollInitiative(campaignId, token));
      sortInitiative(ordem);
      // turnos: conta as vezes que passaram (o Suprimido sai no fim da vez seguinte de quem foi suprimido).
      state.combate = { id: newId(), cena: scene.id, rodada: 1, vez: 0, ordem, turnos: 0, inicioDaVez: 0, deathSave: null };
      combatFlow.aoPassarAVez(state, null);
      return { combate: true, registro: systemEntry(state, 'Começou o combate. Rodada 1.') };
    } },
    'combate.proximo': { mestre: true, run({ state }) {
      const combat = state.combate;
      if (!combat) throw fail(400, 'Não há combate.');
      const anterior = combat.ordem[combat.vez] && combat.ordem[combat.vez].token;
      const scene = sceneById(state, combat.cena);
      const morto = entry => { const token = scene && scene.tokens.find(item => item.id === entry.token); return Boolean(token && token.morto); };
      let entry = null;
      // Quem morreu perde a vez.
      for (let passos = 0; passos < combat.ordem.length; passos += 1) {
        combat.vez += 1;
        if (combat.vez >= combat.ordem.length) {
          combat.vez = 0;
          combat.rodada += 1;
          entry = systemEntry(state, `Rodada ${combat.rodada}.`);
        }
        if (!morto(combat.ordem[combat.vez])) break;
      }
      combatFlow.aoPassarAVez(state, anterior);
      const atual = combat.deathSave && scene && scene.tokens.find(item => item.id === combat.deathSave);
      const aviso = atual ? systemEntry(state, `${atual.nome} está Mortalmente Ferido: Death Save no começo da vez.`) : null;
      return { combate: true, tokens: true, ...(aviso || entry ? { registro: aviso || entry } : {}) };
    } },
    'combate.anterior': { mestre: true, run({ state }) {
      const combat = state.combate;
      if (!combat) throw fail(400, 'Não há combate.');
      if (combat.vez > 0) combat.vez -= 1;
      else if (combat.rodada > 1) { combat.rodada -= 1; combat.vez = combat.ordem.length - 1; }
      return { combate: true };
    } },
    'combate.iniciativa': { mestre: true, run({ state, body }) {
      const combat = state.combate;
      const entry = combat && combat.ordem.find(item => item.token === String(body.token));
      if (!entry) throw fail(404, 'Esse token não está no combate.');
      keepTurn(combat, () => { entry.iniciativa = int(body.valor, -20, 99, entry.iniciativa); entry.desempate = 0; sortInitiative(combat.ordem); });
      return { combate: true };
    } },
    'combate.adicionar': { mestre: true, run({ state, viewer, body, campaignId }) {
      const combat = state.combate;
      if (!combat) throw fail(400, 'Não há combate.');
      const { scene, token } = tokenArg(state, viewer, body.token);
      if (scene.id !== combat.cena) throw fail(400, 'O token está em outra cena.');
      if (combat.ordem.some(item => item.token === token.id)) throw fail(409, `${token.nome} já está no combate.`);
      keepTurn(combat, () => { combat.ordem.push(rollInitiative(campaignId, token)); sortInitiative(combat.ordem); });
      return { combate: true };
    } },
    'combate.remover': { mestre: true, run({ state, body }) {
      if (!dropFromCombat(state, String(body.token))) throw fail(404, 'Esse token não está no combate.');
      return { combate: true };
    } },
    'combate.encerrar': { mestre: true, run({ state }) {
      if (!state.combate) throw fail(400, 'Não há combate.');
      state.combate = null;
      return { combate: true, registro: systemEntry(state, 'O combate acabou.') };
    } },

    // O servidor rola: ninguém escolhe o próprio resultado, e a conta usa a ficha que está no servidor.
    rolar: { async run({ state, viewer, body, campaignId, color }) {
      const source = rollSource(state, viewer, campaignId, body);
      let rolagem;
      if (body.modo === 'teste') rolagem = skillCheck(viewer, source, body);
      else if (body.modo === 'dados') rolagem = freeRoll(body);
      else if (body.modo === 'lesao') rolagem = criticalInjury(body);
      else throw fail(400, 'Rolagem desconhecida.');
      // Sorte (RED p. 99): soma ao teste o que o personagem gastar, até o que tem. Só pelo token dele.
      const sorte = int(body.sorte, 0, 20, 0);
      if (sorte && body.modo === 'teste') {
        const { token } = body.token ? findToken(state, String(body.token)) : { token: null };
        if (!token || token.tipo !== 'pj' || !token.sorte) throw fail(400, 'Para gastar Sorte, role pelo token do personagem.');
        if (sorte > token.sorte.atual) throw fail(400, `Sorte insuficiente (tem ${token.sorte.atual}).`);
        token.sorte = { ...token.sorte, atual: token.sorte.atual - sorte };
        rolagem.partes.push({ rotulo: 'Sorte', valor: sorte });
        rolagem.total += sorte;
        await writeSheet(campaignId, token, { sorte: token.sorte.atual });
      }
      const entry = addEntry(state, { tipo: 'rolagem', autor: authorOf(viewer, color), secreta: Boolean(body.secreta), quem: source ? source.nome : null, rolagem });
      return { registro: entry, tokens: Boolean(sorte), resultado: entryFor(viewer, entry) };
    } },
    // Chat: { texto, para: 'todos' | 'mestre' | id da conta de um jogador (sussurro) }.
    chat: { run({ state, viewer, body, campaignId, color }) {
      const texto = block(body.texto, 1000).trim();
      if (!texto) throw fail(400, 'Escreva a mensagem.');
      const destino = String(body.para || 'todos');
      let para = null;
      let paraNome = '';
      if (destino === 'mestre') { para = []; paraNome = 'Mestre'; }
      else if (destino !== 'todos') {
        const account = presenceOf(campaignId).find(pessoa => pessoa.conta && pessoa.conta === destino) || readCharacters(campaignId).some(doc => doc.dono === destino) && { conta: destino, nome: '' };
        if (!account) throw fail(404, 'Essa pessoa não está nesta campanha.');
        para = [destino];
        paraNome = account.nome || 'Jogador';
      }
      const entry = addEntry(state, { tipo: 'chat', autor: authorOf(viewer, color), texto, ...(para ? { para, paraNome } : {}) });
      return { registro: entry };
    } },
    'registro.limpar': { mestre: true, run({ state }) {
      state.registro = [];
      return { registroLimpo: true };
    } },

    // A ficha de jogo. O mestre muda o dinheiro, os Pontos de Melhoria, a reputação ou a Humanidade: { personagem,
    // campo, delta (soma) ou valor (troca), motivo }. Vai para o extrato da ficha e para o registro, que só o mestre e
    // o dono veem.
    'personagem.ajustar': { mestre: true, async run({ state, viewer, body, campaignId }) {
      const doc = characterArg(campaignId, viewer, body.personagem);
      const campo = String(body.campo || '');
      const feito = await writeCharacter(campaignId, doc.id, atual => characterGame.ajuste(atual, campo, { delta: body.delta, valor: body.valor, motivo: line(body.motivo, 200) }));
      const entry = addEntry(state, { tipo: 'sistema', autor: { nome: 'Mesa', papel: 'sistema', conta: null, cor: '#a9aeaa' }, texto: textoDoAjuste(line(doc.apelido, 40) || line(doc.nome, 40) || 'Personagem', campo, feito), para: doc.dono ? [doc.dono] : [] });
      return { tokens: true, fichas: true, registro: entry, resultado: { antes: feito.antes, depois: feito.depois } };
    } },
    // Equipar, carregar ou guardar um item: { personagem, item, uso }. O jogador, no personagem dele; o mestre, em
    // todos. A armadura muda o SP e a penalidade; a arma guardada sai da mesa.
    'item.uso': { async run({ viewer, body, campaignId }) {
      const doc = characterArg(campaignId, viewer, body.personagem);
      await writeCharacter(campaignId, doc.id, atual => characterGame.comUso(atual, catalog(), String(body.item || ''), String(body.uso || '')));
      return { tokens: true, fichas: true };
    } },
    // O mestre acerta a quantidade de um item (a granada que foi, a munição que o grupo achou): { personagem, item, qtd }.
    'item.qtd': { mestre: true, async run({ viewer, body, campaignId }) {
      const doc = characterArg(campaignId, viewer, body.personagem);
      const id = String(body.item || '');
      const qtd = Number(body.qtd);
      if (!Number.isInteger(qtd) || qtd < 0 || qtd > 99999) throw fail(400, 'Quantidade de 0 a 99999.');
      await writeCharacter(campaignId, doc.id, atual => (characterGame.ficha(atual, catalog()).itens.some(item => item.id === id) ? { mudancas: { itens: { [id]: { qtd } } } } : { erro: 'Esse item não está na ficha.' }));
      return { tokens: true, fichas: true };
    } },
    // Ataque, defesa, dano, Death Save, estabilizar, recarregar: mesa-combate.js.
    ...combatFlow.operations
  };

  // ---------------- Rotas ----------------
  function readJson(request, limit = MAX_BODY) {
    return new Promise((resolve, reject) => {
      if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) return reject(fail(415, 'Envie JSON (Content-Type: application/json).'));
      let body = '';
      request.setEncoding('utf8');
      request.on('data', chunk => {
        body += chunk;
        if (body.length > limit) { reject(fail(413, 'Conteúdo grande demais.')); request.destroy(); }
      });
      request.on('end', () => {
        try { const data = JSON.parse(body || '{}'); resolve(data && typeof data === 'object' && !Array.isArray(data) ? data : {}); } catch { reject(fail(400, 'JSON inválido.')); }
      });
      request.on('error', reject);
    });
  }
  // A conexão ao vivo de quem pede (para o cursor e o "ver cena"), só se for da mesma pessoa e da mesma campanha.
  function connectionOf(id, viewer, campaignId) {
    const connection = connections.get(String(id || ''));
    return connection && connection.campanha === campaignId && connection.viewer.papel === viewer.papel && connection.viewer.conta === viewer.conta ? connection : null;
  }

  async function runOperation(request, response, identity, campaignId) {
    const body = await readJson(request);
    const viewer = viewerOf(identity);
    const operation = Object.hasOwn(OPERATIONS, body.tipo) ? OPERATIONS[body.tipo] : null;
    if (!operation) return json(response, 400, { erro: 'Operação desconhecida.' });
    if (operation.mestre && !isGm(viewer)) return json(response, 403, { erro: 'Só o mestre.' });
    const table = tableOf(campaignId);
    const connection = connectionOf(body.conexao, viewer, campaignId);
    const effects = await operation.run({ table, state: table.state, viewer, body, campaignId, connection, color: connection ? connection.cor : colorOf(viewer) });
    if (operation.local) return json(response, 200, { ok: true });
    table.seq += 1;
    save(table);
    broadcast(campaignId, effects);
    return json(response, 200, { ok: true, seq: table.seq, ...(effects.resultado !== undefined ? { resultado: effects.resultado } : {}) });
  }

  // Cursor, ping e régua: passam para quem está na mesma cena e não ficam gravados.
  async function relayActivity(request, response, identity, campaignId) {
    const body = await readJson(request, 8 * 1024);
    const viewer = viewerOf(identity);
    const connection = connectionOf(body.conexao, viewer, campaignId);
    if (!connection) return json(response, 409, { erro: 'Conexão da mesa não encontrada: recarregue a página.' });
    const state = tableOf(campaignId).state;
    const sceneId = sceneIdOf(connection, state);
    const point = value => (value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y)) ? { x: Math.round(Number(value.x)), y: Math.round(Number(value.y)) } : null);
    const message = { de: connection.id, nome: viewer.nome, cor: connection.cor, cena: sceneId };
    if (body.cursor !== undefined) message.cursor = point(body.cursor);
    if (body.ping) {
      message.ping = point(body.ping);
      // Puxar todos para o ping (no Foundry, Shift no ping do mestre).
      if (message.ping && body.ping.puxar && isGm(viewer)) message.ping.puxar = true;
    }
    if (body.regua !== undefined) message.regua = Array.isArray(body.regua) ? body.regua.slice(0, 2).map(point).filter(Boolean) : null;
    for (const other of connections.values()) {
      if (other !== connection && other.campanha === campaignId && sceneIdOf(other, state) === sceneId) sendEvent(other, 'atividade', message);
    }
    return json(response, 200, { ok: true });
  }

  // Mapas, vídeos, tiles e imagens de token, guardados pelo hash do conteúdo (o mesmo arquivo duas vezes ocupa um só).
  // Vai direto para o disco enquanto chega: o servidor tem 1 GB de memória e um mapa do Foundry passa de 60 MB.
  function receiveMedia(request, response, campaignId) {
    return new Promise(resolve => {
      const type = String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const extension = MEDIA_TYPES[type];
      if (!extension) { json(response, 415, { erro: 'Envie PNG, JPEG, WebP, SVG, WebM ou MP4.' }); return resolve(); }
      const limit = MEDIA_LIMIT_MB[extension] * 1024 * 1024;
      const folder = path.join(tableDir(campaignId), 'midia');
      fs.mkdirSync(folder, { recursive: true });
      const temporary = path.join(folder, `.envio-${newId()}.tmp`);
      const out = fs.createWriteStream(temporary);
      const hash = crypto.createHash('sha1');
      let size = 0;
      let head = Buffer.alloc(0);
      let done = false;
      // Recusado: fecha e apaga o temporário antes de responder (no Windows, arquivo aberto não se apaga).
      const finish = (status, data) => {
        if (done) return;
        done = true;
        const reply = () => { json(response, status, data); resolve(); };
        if (status === 200) return reply();
        const apagar = () => fs.rm(temporary, { force: true }, reply);
        if (out.closed) return apagar();
        out.once('close', apagar);
        out.destroy();
      };
      request.on('data', chunk => {
        if (done) return;
        size += chunk.length;
        if (size > limit) { finish(413, { erro: `Arquivo grande demais (até ${MEDIA_LIMIT_MB[extension]} MB).` }); request.resume(); return; }
        if (head.length < 2048) head = Buffer.concat([head, chunk]).subarray(0, 2048);
        hash.update(chunk);
        if (!out.write(chunk)) { request.pause(); out.once('drain', () => request.resume()); }
      });
      request.on('error', () => finish(400, { erro: 'O envio caiu no meio.' }));
      out.on('error', error => finish(500, { erro: `Não gravou o arquivo (${error.message}).` }));
      request.on('end', () => {
        if (done) return;
        out.end(() => {
          if (done) return;
          if (!looksLike(head, extension)) return finish(415, { erro: 'O arquivo não parece ser o que diz ser.' });
          const name = `${hash.digest('hex')}.${extension}`;
          const file = path.join(folder, name);
          try {
            if (fs.existsSync(file)) fs.rmSync(temporary, { force: true });
            else fs.renameSync(temporary, file);
          } catch (error) {
            return finish(500, { erro: `Não gravou o arquivo (${error.message}).` });
          }
          finish(200, { midia: name });
        });
      });
    });
  }
  // Com Range: o navegador pede o vídeo aos pedaços (o Safari só toca vídeo assim).
  function serveMedia(request, response, campaignId, name) {
    if (!MEDIA_FILE.test(name)) return json(response, 404, { erro: 'Arquivo não encontrado.' });
    const file = path.join(tableDir(campaignId), 'midia', name);
    fs.stat(file, (error, stats) => {
      if (error || !stats.isFile()) return json(response, 404, { erro: 'Arquivo não encontrado.' });
      const extension = name.split('.').pop();
      const headers = {
        'Content-Type': MEDIA_CONTENT[extension], 'Cache-Control': 'private, max-age=31536000, immutable', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff',
        // SVG aberto direto no navegador não roda script nenhum.
        ...(extension === 'svg' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {})
      };
      let start = 0;
      let end = stats.size - 1;
      let status = 200;
      const range = /^bytes=(\d*)-(\d*)$/.exec(String(request.headers.range || ''));
      if (range && (range[1] || range[2])) {
        if (range[1]) { start = Number(range[1]); if (range[2]) end = Math.min(Number(range[2]), end); } else start = Math.max(0, stats.size - Number(range[2]));
        if (start > end) { response.writeHead(416, { 'Content-Range': `bytes */${stats.size}` }); return response.end(); }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
      }
      headers['Content-Length'] = end - start + 1;
      response.writeHead(status, headers);
      if (request.method === 'HEAD' || response.destroyed) return response.end();
      fs.createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
    });
  }

  async function route(request, response, pathname) {
    const identity = who(request);
    if (identity.papel === 'visitante') return json(response, 401, { erro: 'Entre com o seu código para usar a mesa.' });
    const query = new URL(request.url, 'http://localhost').searchParams;
    const campaignId = campaignFor(identity, query.get('campanha'));
    if (!campaignId) return json(response, 404, { erro: 'Campanha não encontrada.' });
    const method = request.method;
    if (pathname === '/api/mesa/estado' && method === 'GET') {
      const viewer = viewerOf(identity);
      return json(response, 200, stateFor({ id: null, campanha: campaignId, viewer, cor: colorOf(viewer), cena: null, vistos: new Map() }));
    }
    if (pathname === '/api/mesa/eventos' && method === 'GET') return openStream(request, response, identity, campaignId);
    if (pathname === '/api/mesa/op' && method === 'POST') return runOperation(request, response, identity, campaignId);
    if (pathname === '/api/mesa/atividade' && method === 'POST') return relayActivity(request, response, identity, campaignId);
    if (pathname === '/api/mesa/midia' && method === 'POST') {
      if (identity.papel !== 'mestre') return json(response, 403, { erro: 'Só o mestre.' });
      return receiveMedia(request, response, campaignId);
    }
    const media = pathname.match(/^\/api\/mesa\/midia\/([^/]+)$/);
    if (media && (method === 'GET' || method === 'HEAD')) return serveMedia(request, response, campaignId, media[1]);
    return json(response, 404, { erro: 'Rota da mesa não encontrada.' });
  }

  // A ficha mudou fora da mesa (o Foundry mandou o HP, o mestre mexeu na wiki): a cada poucos segundos, os tokens dos
  // personagens das cenas que alguém está vendo pegam o HP, o nome do dono e o retrato de agora.
  function syncCharacters() {
    const campaignsOnline = new Set([...connections.values()].map(connection => connection.campanha));
    for (const campaignId of campaignsOnline) {
      const table = tableOf(campaignId);
      let changed = false;
      for (const scene of table.state.cenas) {
        for (const token of scene.tokens) {
          if (token.tipo !== 'pj' || writing.has(token.personagem)) continue;
          const doc = readCharacter(campaignId, token.personagem);
          if (!doc) continue;
          const fresh = { ...combatFields(doc), imagem: portraitOf(doc), dono: doc.dono || null };
          if (Object.keys(fresh).some(key => JSON.stringify(fresh[key]) !== JSON.stringify(token[key]))) {
            Object.assign(token, fresh);
            changed = true;
          }
        }
      }
      if (changed) { save(table); broadcast(campaignId, { tokens: true }); }
      // As fichas de jogo (o dinheiro, a Humanidade, o inventário) também mudam fora da mesa.
      sendCards(campaignId);
    }
  }
  const syncTimer = setInterval(syncCharacters, SYNC);
  syncTimer.unref();

  async function handle(request, response, pathname) {
    try {
      await route(request, response, pathname);
    } catch (error) {
      if (response.headersSent) return void response.destroy();
      if (error.status) return void json(response, error.status, { erro: error.message });
      console.error('Mesa:', error);
      json(response, 500, { erro: 'Erro na mesa.' });
    }
  }
  // Grava já o que estiver esperando (ao desligar o servidor e nos testes).
  handle.flush = () => Promise.all([...tables.values()].map(flushTable));
  // Quantos estão na mesa da wiki de cada campanha (para a barra lateral, quando a mesa entrar no server.js).
  handle.connected = campaignId => presenceOf(campaignId).length;
  handle.close = () => { clearInterval(syncTimer); for (const connection of connections.values()) connection.response.end(); };
  handle.syncCharacters = syncCharacters;
  return handle;
};
module.exports.ROUTES = ROUTES;
