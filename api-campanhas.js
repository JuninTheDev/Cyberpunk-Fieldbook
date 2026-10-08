// Campanhas: várias mesas no mesmo universo. Carregado pelo api-personagens.js (e o server.js usa a lista para a
// barra da mesa).
//
// Cada campanha tem os seus personagens, os seus jogadores (um código pode estar em mais de uma campanha), o seu
// Publicar e as suas regras da loja. As regras do jogo, o catálogo e as Notícias de Night City são de todas.
// Quem não joga numa campanha não fica sabendo que ela existe: o servidor filtra tudo por campanha.
//
// Na pasta de dados:
//   campanhas.json                    → a lista (nome, cor e o mundo do Foundry de cada uma);
//   campanhas/<id>/publicar.json      → o Publicar: o que o mestre guarda e o que os jogadores veem;
//   campanhas/<id>/regras-loja.json   → o que a loja de criação esconde nesta campanha;
//   noticias-night-city.json          → as notícias que todas as campanhas veem;
//   agenda.json                       → as sessões marcadas de todas as campanhas.
// O que existia antes das campanhas (jogadores.json, jogadores-mestre.json, regras-loja.json, e os personagens e
// códigos sem campanha) é do Protocolo Morana: lido como está e gravado no lugar novo na primeira mudança.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// nomeJogadores: o nome que os jogadores veem (o do mestre pode ser segredo: Morana é o vírus da campanha). Os
// jogadores do Protocolo Morana viam "Night City, 2077" antes das campanhas e continuam vendo.
const FIRST = { id: 'morana', nome: 'Protocolo Morana', nomeJogadores: 'Night City, 2077', cor: '#00ffd2', mundo: '' };
const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RESERVED = new Set(['apagadas', 'night-city', 'todas', 'nova']);
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const PALETTE = ['#00ffd2', '#ff3864', '#f7d038', '#8f7bff', '#4dd0ff', '#ff8a3d'];
const WORLD_RE = /^[a-z0-9_-]{0,80}$/i;
// O que cada lista do Publicar marca para ir aos jogadores. As sessões (o resumo de cada sessão, em ordem) vieram
// depois: um Publicar antigo sem elas vale como lista vazia.
const FLAGS = { npcs: 'revelado', lugares: 'revelado', noticias: 'publicada', sessoes: 'publicada' };
const REQUIRED = ['npcs', 'lugares', 'noticias'];
const emptyView = () => ({ resumo: '', npcs: [], lugares: [], noticias: [], sessoes: [] });
const slug = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

// O que vai para os jogadores: só o revelado, sem a marcação e sem a nota do mestre. As notícias mais novas primeiro;
// as sessões na ordem do painel (da primeira para a última).
// O servidor calcula (não confia no que o navegador mandar como "publicado").
const pick = (items, flag) => (Array.isArray(items) ? items : []).filter(item => item && typeof item === 'object' && item[flag]).map(({ [flag]: _flag, nota: _nota, ...rest }) => rest);
const publishedOf = mestre => ({ resumo: String(mestre.resumo || ''), npcs: pick(mestre.npcs, FLAGS.npcs), lugares: pick(mestre.lugares, FLAGS.lugares), noticias: pick(mestre.noticias, FLAGS.noticias).reverse(), sessoes: pick(mestre.sessoes, FLAGS.sessoes) });

// dataDir: a pasta dos personagens e códigos. legacyDir: onde o Publicar gravava antes das campanhas (no servidor e
// no PC é a mesma; nos testes, os personagens ficam numa pasta temporária).
function createCampaigns({ dataDir, legacyDir = dataDir, writeJsonAtomic }) {
  const listFile = path.join(dataDir, 'campanhas.json');
  const newsFile = path.join(dataDir, 'noticias-night-city.json');
  const folder = id => path.join(dataDir, 'campanhas', id);
  const readFile = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

  // ---------------- Lista ----------------
  const clean = item => ({ id: item.id, nome: String(item.nome || item.id).slice(0, 60), nomeJogadores: String(item.nomeJogadores ?? (item.id === FIRST.id ? FIRST.nomeJogadores : '')).trim().slice(0, 60), cor: COLOR_RE.test(item.cor || '') ? item.cor : FIRST.cor, mundo: WORLD_RE.test(item.mundo || '') ? String(item.mundo || '') : '', criada: item.criada || null });
  function list() {
    const data = readFile(listFile);
    const items = data && Array.isArray(data.campanhas) ? data.campanhas.filter(item => item && ID_RE.test(item.id)).map(clean) : [];
    return items.length ? items : [clean(FIRST)];
  }
  const get = id => list().find(item => item.id === id) || null;
  const save = items => writeJsonAtomic(listFile, { campanhas: items });

  async function create({ nome, nomeJogadores, cor, mundo }) {
    const name = String(nome || '').trim().slice(0, 60);
    if (!name) throw Object.assign(new Error('Dê um nome à campanha.'), { status: 400 });
    if (cor && !COLOR_RE.test(cor)) throw Object.assign(new Error('Cor inválida (use #rrggbb).'), { status: 400 });
    if (mundo && !WORLD_RE.test(mundo)) throw Object.assign(new Error('O mundo do Foundry é o id da pasta do mundo (letras, números e hífen).'), { status: 400 });
    const items = list();
    const base = slug(name) || 'campanha';
    let id = RESERVED.has(base) ? `${base}-2` : base;
    for (let n = 2; items.some(item => item.id === id); n += 1) id = `${base.slice(0, 36)}-${n}`;
    // Sem cor escolhida: a primeira da paleta que nenhuma outra campanha usa.
    const color = cor || PALETTE.find(option => !items.some(item => item.cor.toLowerCase() === option)) || PALETTE[items.length % PALETTE.length];
    const campaign = clean({ id, nome: name, nomeJogadores: nomeJogadores || '', cor: color, mundo, criada: new Date().toISOString() });
    await save([...items, campaign]);
    return campaign;
  }
  async function update(id, fields) {
    const items = list();
    const campaign = items.find(item => item.id === id);
    if (!campaign) return null;
    if (fields.nome !== undefined) { const name = String(fields.nome).trim().slice(0, 60); if (!name) throw Object.assign(new Error('Dê um nome à campanha.'), { status: 400 }); campaign.nome = name; }
    if (fields.nomeJogadores !== undefined) campaign.nomeJogadores = String(fields.nomeJogadores).trim().slice(0, 60);
    if (fields.cor !== undefined) { if (!COLOR_RE.test(fields.cor)) throw Object.assign(new Error('Cor inválida (use #rrggbb).'), { status: 400 }); campaign.cor = fields.cor; }
    if (fields.mundo !== undefined) { if (!WORLD_RE.test(fields.mundo)) throw Object.assign(new Error('O mundo do Foundry é o id da pasta do mundo (letras, números e hífen).'), { status: 400 }); campaign.mundo = String(fields.mundo); }
    await save(items);
    return campaign;
  }
  // Apaga a campanha da lista e guarda a pasta dela em campanhas/apagadas/ (quem chama confere que está vazia).
  async function remove(id) {
    const items = list();
    if (!items.some(item => item.id === id)) return false;
    await save(items.filter(item => item.id !== id));
    if (fs.existsSync(folder(id))) {
      const trash = path.join(dataDir, 'campanhas', 'apagadas');
      fs.mkdirSync(trash, { recursive: true });
      fs.renameSync(folder(id), path.join(trash, `${id}-${Date.now()}`));
    }
    return true;
  }
  // A campanha do mundo do Foundry aberto (pelo id do mundo que o Foundry informa).
  const byWorld = world => (world ? list().find(item => item.mundo && item.mundo === world) || null : null);

  // ---------------- Publicar ----------------
  const withoutDate = data => { if (!data || typeof data !== 'object') return null; const { atualizado: _date, ...rest } = data; return rest; };
  function readPublish(id) {
    const data = readFile(path.join(folder(id), 'publicar.json'));
    if (data && data.mestre) return { mestre: { ...emptyView(), ...data.mestre }, publicado: { ...emptyView(), ...(data.publicado || publishedOf(data.mestre)) }, atualizado: data.atualizado || null };
    if (id === FIRST.id) {
      // Antes das campanhas: o Publicar gravava jogadores-mestre.json (tudo) e jogadores.json (o revelado).
      const mestre = readFile(path.join(legacyDir, 'jogadores-mestre.json'));
      const publicado = readFile(path.join(legacyDir, 'jogadores.json'));
      if (mestre || publicado) return { mestre: { ...emptyView(), ...withoutDate(mestre || publicado) }, publicado: { ...emptyView(), ...withoutDate(publicado || publishedOf(mestre)) }, atualizado: (publicado || mestre).atualizado || null };
    }
    return { mestre: emptyView(), publicado: emptyView(), atualizado: null };
  }
  async function writePublish(id, mestre) {
    if (!mestre || typeof mestre !== 'object' || !REQUIRED.every(key => Array.isArray(mestre[key]))) {
      throw Object.assign(new Error('Formato inesperado: faltam as listas npcs, lugares e noticias.'), { status: 400 });
    }
    const state = { resumo: String(mestre.resumo || ''), npcs: mestre.npcs, lugares: mestre.lugares, noticias: mestre.noticias, sessoes: Array.isArray(mestre.sessoes) ? mestre.sessoes : [] };
    const atualizado = new Date().toISOString();
    fs.mkdirSync(folder(id), { recursive: true });
    await writeJsonAtomic(path.join(folder(id), 'publicar.json'), { atualizado, mestre: state, publicado: publishedOf(state) });
    return atualizado;
  }

  // ---------------- Notícias de Night City (todas as campanhas) ----------------
  function readNews() {
    const data = readFile(newsFile);
    const mestre = data && Array.isArray(data.mestre) ? data.mestre : [];
    return { mestre, publicado: pick(mestre, 'publicada').reverse(), atualizado: (data && data.atualizado) || null };
  }
  async function writeNews(items) {
    if (!Array.isArray(items)) throw Object.assign(new Error('Formato inesperado: falta a lista de notícias.'), { status: 400 });
    const atualizado = new Date().toISOString();
    await writeJsonAtomic(newsFile, { atualizado, mestre: items });
    return atualizado;
  }

  // ---------------- Regras da loja ----------------
  // Sem arquivo: o Protocolo Morana usa o regras-loja.json de antes das campanhas (que ficava junto dos personagens);
  // as outras, o padrão de quem chama.
  const readShopRules = id => readFile(path.join(folder(id), 'regras-loja.json')) || (id === FIRST.id ? readFile(path.join(dataDir, 'regras-loja.json')) : null);
  async function writeShopRules(id, rules) {
    fs.mkdirSync(folder(id), { recursive: true });
    await writeJsonAtomic(path.join(folder(id), 'regras-loja.json'), rules);
  }

  // ---------------- Mesa do mestre ----------------
  // Os relógios (o valor de cada um), o bloco de notas e quais relógios os jogadores veem (com o nome e os passos,
  // que o servidor não conhece de outro jeito). Antes ficavam só no navegador do mestre; aqui entram no backup.
  //   campanhas/<id>/mesa.json → { relogios: { nome: valor }, notas, publicos: { nome: { nome, passos } }, atualizado }
  const emptyTable = () => ({ relogios: {}, notas: '', publicos: {}, atualizado: null });
  const readTable = id => ({ ...emptyTable(), ...(readFile(path.join(folder(id), 'mesa.json')) || {}) });
  async function writeTable(id, patch) {
    if (!patch || typeof patch !== 'object') throw Object.assign(new Error('Mande { relogios, notas, publicos }.'), { status: 400 });
    const table = readTable(id);
    for (const [name, value] of Object.entries(patch.relogios || {})) {
      if (!/^[\w-]{1,40}$/.test(name)) continue;
      table.relogios[name] = Math.max(0, Math.min(99, Math.round(Number(value)) || 0));
    }
    if (patch.notas !== undefined) table.notas = String(patch.notas).slice(0, 50000);
    for (const [name, value] of Object.entries(patch.publicos || {})) {
      if (!/^[\w-]{1,40}$/.test(name)) continue;
      if (!value) { delete table.publicos[name]; continue; }
      table.publicos[name] = { nome: String(value.nome || name).slice(0, 80), passos: (Array.isArray(value.passos) ? value.passos : []).slice(0, 20).map(step => String(step).slice(0, 80)) };
    }
    table.atualizado = new Date().toISOString();
    fs.mkdirSync(folder(id), { recursive: true });
    await writeJsonAtomic(path.join(folder(id), 'mesa.json'), table);
    return table;
  }
  // O que os jogadores veem: os relógios marcados, com o valor de agora.
  const publicClocks = id => { const table = readTable(id); return Object.entries(table.publicos).map(([name, clock]) => ({ id: name, nome: clock.nome, passos: clock.passos, valor: table.relogios[name] || 0 })); };

  // ---------------- Agenda das mesas ----------------
  // As sessões marcadas de todas as campanhas num arquivo só: uma licença do Foundry abre um mundo por vez, então o
  // mestre precisa ver os horários juntos. Os jogadores de cada campanha veem as próximas sessões dela.
  //   agenda.json → { sessoes: [{ id, campanha, inicio (ISO), duracao (minutos), titulo, nota, criada }], atualizado,
  //                   porCampanha: { id: quando mudou a agenda dela } } (a visão dos jogadores de cada uma se atualiza)
  const agendaFile = path.join(dataDir, 'agenda.json');
  const AGENDA_KEEP = 180 * 24 * 60 * 60 * 1000; // sessões que acabaram há mais de 6 meses saem na próxima gravação
  const endOf = item => Date.parse(item.inicio) + item.duracao * 60000;
  function readAgenda() {
    const data = readFile(agendaFile) || {};
    const items = (Array.isArray(data.sessoes) ? data.sessoes : []).filter(item => item && item.id && !Number.isNaN(Date.parse(item.inicio)) && Number(item.duracao) > 0);
    return { sessoes: items.sort((a, b) => a.inicio.localeCompare(b.inicio)), atualizado: data.atualizado || null, porCampanha: data.porCampanha && typeof data.porCampanha === 'object' ? data.porCampanha : {} };
  }
  const saveAgenda = (items, touched) => {
    const atualizado = new Date().toISOString();
    const changed = { ...readAgenda().porCampanha, ...Object.fromEntries(touched.map(id => [id, atualizado])) };
    return writeJsonAtomic(agendaFile, { sessoes: items.filter(item => Date.now() - endOf(item) < AGENDA_KEEP), atualizado, porCampanha: changed }).then(() => atualizado);
  };
  const fail = text => Object.assign(new Error(text), { status: 400 });
  function cleanSession(input, base = {}) {
    if (!input || typeof input !== 'object') throw fail('Mande { campanha, inicio, duracao, titulo, nota }.');
    const start = new Date(input.inicio ?? base.inicio ?? '');
    if (Number.isNaN(start.getTime())) throw fail('Diga a data e a hora da sessão.');
    const campaign = String(input.campanha ?? base.campanha ?? '');
    if (!get(campaign)) throw fail('Campanha não encontrada.');
    const minutes = Math.round(Number(input.duracao ?? base.duracao ?? 240));
    if (!(minutes >= 30 && minutes <= 24 * 60)) throw fail('A duração vai de 30 minutos a 24 horas.');
    return { id: base.id || crypto.randomBytes(5).toString('hex'), campanha: campaign, inicio: start.toISOString(), duracao: minutes, titulo: String(input.titulo ?? base.titulo ?? '').trim().slice(0, 80), nota: String(input.nota ?? base.nota ?? '').trim().slice(0, 300), criada: base.criada || new Date().toISOString() };
  }
  // Sessões que se cruzam no horário: de outra campanha (o Foundry só abre um mundo por vez) ou da mesma (marcada duas vezes).
  const clashes = (item, items) => items.filter(other => other.id !== item.id && Date.parse(other.inicio) < endOf(item) && Date.parse(item.inicio) < endOf(other)).map(other => other.id);
  // Para o mestre: todas (das campanhas que existem), com os choques de horário.
  function agendaView() {
    const { sessoes, atualizado } = readAgenda();
    const items = sessoes.filter(item => get(item.campanha));
    return { sessoes: items.map(item => ({ ...item, conflitos: clashes(item, items) })), atualizado };
  }
  async function addSession(input) {
    const item = cleanSession(input);
    await saveAgenda([...readAgenda().sessoes, item], [item.campanha]);
    return item;
  }
  async function updateSession(id, input) {
    const items = readAgenda().sessoes;
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return null;
    const before = items[index].campanha;
    items[index] = cleanSession(input, items[index]);
    await saveAgenda(items, [before, items[index].campanha]);
    return items[index];
  }
  async function removeSession(id) {
    const items = readAgenda().sessoes;
    const gone = items.find(item => item.id === id);
    if (!gone) return false;
    await saveAgenda(items.filter(item => item.id !== id), [gone.campanha]);
    return true;
  }
  // Para os jogadores de uma campanha: as próximas (até 5), sem o id da campanha.
  const agendaUpdated = id => readAgenda().porCampanha[id] || null;
  const upcoming = id => readAgenda().sessoes.filter(item => item.campanha === id && endOf(item) > Date.now()).slice(0, 5).map(({ id: sid, inicio, duracao, titulo, nota }) => ({ id: sid, inicio, duracao, titulo, nota }));

  return { first: FIRST.id, list, get, create, update, remove, byWorld, readPublish, writePublish, readNews, writeNews, readShopRules, writeShopRules, readTable, writeTable, publicClocks, readAgenda, agendaView, addSession, updateSession, removeSession, upcoming, agendaUpdated, validId: id => ID_RE.test(String(id || '')) };
}

module.exports = { createCampaigns, publishedOf };
