const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const locais = require('../../personagem-cyberware');

const clone = value => structuredClone(value);
class Collection extends Array { get(id) { return this.find(item => item.id === id); } }
function setAt(target, key, value) {
  const parts = key.split('.');
  const last = parts.pop();
  let parent = target;
  for (const part of parts) parent = parent[part] || (parent[part] = {});
  parent[last] = clone(value);
}
function ambiente() {
  let serial = 0;
  const installed = [];
  const requests = [];
  const charges = [];
  const templates = {};
  for (const [name, type, base] of [['Cyberarm', 'cyberArm', true], ['Cybereye', 'cyberEye', true], ['Cyberleg', 'cyberLeg', true],
    ['Wolvers', 'cyberArm', false], ['Optics', 'cyberEye', false], ['Foot', 'cyberLeg', false], ['Socket', 'neuralWare', false], ['Chip', 'neuralWare', false],
    ['Internal', 'internal', true], ['Biomonitor', 'internal', false]]) {
    templates[name] = { name, type: 'cyberware', system: { type, isFoundational: base, size: 1, installLocation: 'hospital',
      humanityLoss: { static: 7, roll: '2d6' }, installedItems: { list: [], slots: 3, usedSlots: 0 } } };
  }
  const actor = { id: 'actor', name: 'V', documentName: 'Actor', items: new Collection(), flags: { 'cpr-2077': { wiki: { id: 'v', entregues: [] } } },
    system: { stats: {}, derivedStats: {}, installedItems: { list: [] }, roleInfo: {}, wealth: { value: 1000 }, improvementPoints: { value: 70 } },
    get itemTypes() { return Object.fromEntries(['cyberware', 'role', 'armor', 'skill', 'criticalInjury'].map(type => [type, this.items.filter(item => item.type === type)])); },
    getFlag(namespace, key) { return this.flags[namespace]?.[key]; },
    async installItems(items) { installed.push([this.id, ...items.map(item => item.id)]); for (const item of items) if (!this.system.installedItems.list.includes(item.id)) this.system.installedItems.list.push(item.id); return true; },
    async installCyberware() { throw new Error('O importador não pode disparar cirurgia manual nem rolar Humanidade.'); },
    async loseHumanityValue() { throw new Error('O importador não pode cobrar Humanidade.'); },
    async setLedgerProperty(key, value) { charges.push([key, value]); this.system[key].value = value; },
    async createEmbeddedDocuments(type, rows) {
      return rows.map(data => {
        const item = { ...clone(data), id: `item${++serial}`, parent: this };
        item.getFlag = (namespace, key) => item.flags?.[namespace]?.[key];
        Object.defineProperty(item.system, 'isInstalled', { get: () => actor.system.installedItems.list.includes(item.id) || actor.items.some(parent => parent.system.installedItems?.list.includes(item.id)) });
        item.availableInstallSlots = () => item.system.installedItems.slots - item.system.installedItems.list.reduce((sum, id) => sum + (actor.items.get(id)?.system.size || 0), 0);
        item.installItems = async children => {
          if (children.some(child => child.system.size > item.availableInstallSlots())) return false;
          installed.push([item.id, ...children.map(child => child.id)]);
          for (const child of children) if (!item.system.installedItems.list.includes(child.id)) item.system.installedItems.list.push(child.id);
          return true;
        };
        this.items.push(item);
        return item;
      });
    },
    async updateEmbeddedDocuments(type, rows) {
      for (const row of rows) for (const [key, value] of Object.entries(row)) if (key !== '_id') setAt(this.items.get(row._id), key, value);
      return rows.map(row => this.items.get(row._id));
    }
  };
  const pack = { async getIndex() { return Object.keys(templates).map(name => ({ _id: name, name })); },
    async getDocument(name) { return { toObject: () => clone(templates[name]) }; } };
  const context = vm.createContext({ URL, console, game: { packs: new Map([['cyber', pack]]), settings: { get: () => '' } },
    location: { hostname: 'localhost', protocol: 'http:' }, foundry: { utils: { deepClone: clone } },
    async fetch(url, init) { const parsed = new URL(url); requests.push({ path: parsed.pathname, query: parsed.search, method: init.method, body: init.body ? JSON.parse(init.body) : null }); return { ok: true, async json() { return {}; } }; }
  });
  const file = path.resolve(__dirname, '../../foundry-2077/scripts/wiki.mjs');
  vm.runInContext(fs.readFileSync(file, 'utf8').replace(/^export /gm, ''), context, { filename: file });
  const row = (name, uid, local, em) => ({ id: `catalogo:${name}`, uid, nome: name, qtd: 1, cyber: true, foundry: { pack: 'cyber', nome: name },
    ...(local !== undefined ? { local } : {}), ...(em !== undefined ? { em } : {}) });
  return { actor, installed, requests, charges, templates, row,
    dados: entry => context.itemData(entry),
    async criar(entries) { for (const entry of entries) await actor.createEmbeddedDocuments('Item', await context.itemData(entry)); },
    montar: entries => context.assemble(actor, entries),
    pendente: entries => context.pendingAssembly(actor, entries),
    snapshot: () => context.tableSnapshot(actor),
    buscar: url => context.wikiFetch(url),
    entregar: pedido => context.deliverOrder(actor, 'v', pedido),
    porUid: uid => actor.items.find(item => item.getFlag('cpr-2077', 'wikiUid') === uid)
  };
}

test('os seis locais do contrato mantêm flag anatômica, nome do catálogo e local cirúrgico do CORE', async () => {
  const env = ambiente();
  for (const [type, name] of [['cyberArm', 'Cyberarm'], ['cyberEye', 'Cybereye'], ['cyberLeg', 'Cyberleg']]) {
    for (const local of locais.locais(type)) {
      const [data] = await env.dados(env.row(name, local.id, local.id));
      assert.equal(data.flags['cpr-2077'].wikiLocal, local.id);
      assert.equal(data.flags['cpr-2077'].wikiNomeCatalogo, name);
      assert.equal(data.flags['cpr-2077'].wikiCatalogId, `catalogo:${name}`);
      assert.equal(data.name, `${name} — ${local.nome}`);
      assert.equal(data.system.installLocation, 'hospital');
      assert.deepEqual(data.system.humanityLoss, { static: 7, roll: '2d6' });
    }
  }
});

test('local inválido ou de outra família é recusado; legado sem local não ganha lado', async () => {
  const env = ambiente();
  for (const local of ['centro', 'olho-direito', { lado: 'direito' }]) await assert.rejects(env.dados(env.row('Cyberarm', 'x', local)), /inválido ou incompatível/);
  const [legacy] = await env.dados(env.row('Cyberarm', 'antigo'));
  assert.equal(legacy.name, 'Cyberarm');
  assert.equal(legacy.flags['cpr-2077'].wikiLocal, '');
});

test('duas bases iguais recebem locais diferentes e a opção vai para o braço explicitamente escolhido', async () => {
  const env = ambiente();
  const entries = [env.row('Cyberarm', 'esquerdo', 'braco-esquerdo'), env.row('Cyberarm', 'direito', 'braco-direito'), env.row('Wolvers', 'w', 'braco-direito', 'direito')];
  await env.criar(entries);
  assert.deepEqual(Array.from(await env.montar(entries)), []);
  const left = env.porUid('esquerdo');
  const right = env.porUid('direito');
  const option = env.porUid('w');
  assert.deepEqual(right.system.installedItems.list, [option.id]);
  assert.deepEqual(left.system.installedItems.list, []);
  const snapshot = env.snapshot().itens;
  const actual = snapshot.find(item => item.uid === 'w');
  assert.equal(actual.local, 'braco-direito');
  assert.equal(actual.pai.id, right.id);
  assert.equal(actual.pai.uid, 'direito');
  assert.equal(actual.instalado, true);
  assert.equal(snapshot.find(item => item.uid === 'direito').idCatalogo, 'catalogo:Cyberarm');
  assert.deepEqual(Array.from(snapshot.find(item => item.uid === 'direito').dentroIds), [option.id]);
  assert.deepEqual(Array.from(snapshot.find(item => item.uid === 'direito').dentroUids), ['w']);
  const count = env.installed.length;
  await env.montar(entries);
  assert.equal(env.installed.length, count, 'reaplicar montagem não instala nem cobra duas vezes');
  assert.deepEqual(env.charges, []);
});

test('em vazio preserva opção solta mesmo com local planejado e base compatível disponível', async () => {
  const env = ambiente();
  const bases = [env.row('Cybereye', 'left', 'olho-esquerdo'), env.row('Cybereye', 'right', 'olho-direito')];
  const option = env.row('Optics', 'op', 'olho-direito', '');
  const unknown = env.row('Optics', 'sem-lado');
  await env.criar([...bases, option, unknown]);
  const notes = await env.montar([...bases, option, unknown]);
  assert.equal(env.porUid('op').system.isInstalled, false);
  assert.equal(env.porUid('sem-lado').system.isInstalled, false);
  assert.deepEqual(Array.from(notes), []);
  assert.deepEqual(Array.from(env.pendente([...bases, option, unknown])), [], 'opção guardada não vira instalação pendente');
  const snapshot = env.snapshot().itens.find(item => item.uid === 'op');
  assert.equal(snapshot.local, '');
  assert.equal(snapshot.localPlanejado, 'olho-direito');
  assert.equal(snapshot.pai, null);
});

test('nem uma base única autoriza instalar opção sem em; o UID explícito autoriza', async () => {
  const env = ambiente();
  const base = env.row('Cyberarm', 'base', 'braco-direito');
  const option = env.row('Wolvers', 'op', 'braco-direito', '');
  await env.criar([base, option]);
  await env.montar([base, option]);
  assert.equal(env.porUid('op').system.isInstalled, false);
  await env.montar([base, { ...option, em: 'base' }]);
  assert.ok(env.porUid('base').system.installedItems.list.includes(env.porUid('op').id));
  assert.equal(env.porUid('op').getFlag('cpr-2077', 'wikiEm'), 'base');
});

test('cyberware do corpo continua usando a base nativa sem exigir UID artificial', async () => {
  const env = ambiente();
  const [body] = await env.actor.createEmbeddedDocuments('Item', [env.templates.Internal]);
  await env.actor.installItems([body]);
  const biomonitor = env.row('Biomonitor', 'bio', '', '');
  await env.criar([biomonitor]);
  await env.montar([biomonitor]);
  assert.ok(body.system.installedItems.list.includes(env.porUid('bio').id));
  assert.equal(env.snapshot().itens.find(item => item.uid === 'bio').instalado, true);
});

test('pai explicitamente ausente, ambíguo ou sem espaço não recai em outro membro', async () => {
  for (const situation of ['ausente', 'ambiguo', 'cheio']) {
    const env = ambiente();
    const baseUid = situation === 'ambiguo' ? 'igual' : 'direito';
    const entries = [env.row('Cyberarm', baseUid, 'braco-direito'), env.row('Cyberarm', situation === 'ambiguo' ? 'igual' : 'esquerdo', 'braco-esquerdo'),
      env.row('Wolvers', 'op', undefined, situation === 'ausente' ? 'inexistente' : baseUid)];
    await env.criar(entries);
    if (situation === 'cheio') env.porUid('direito').system.installedItems.slots = 0;
    const notes = await env.montar(entries);
    assert.equal(env.porUid('op').system.isInstalled, false);
    assert.ok(notes.some(note => /encaixe escolhido/.test(note)));
  }
});

test('referência foundry:id permite escolher uma base manual sem wikiUid', async () => {
  const env = ambiente();
  const [manual] = await env.actor.createEmbeddedDocuments('Item', [env.templates.Cyberarm]);
  manual.flags = { 'cpr-2077': { wikiLocal: 'braco-direito' } };
  await env.actor.installItems([manual]);
  const option = env.row('Wolvers', 'op', 'braco-direito', `foundry:${manual.id}`);
  await env.criar([option]);
  await env.montar([option]);
  assert.ok(manual.system.installedItems.list.includes(env.porUid('op').id));
  assert.equal(env.snapshot().itens.find(item => item.uid === 'op').pai.id, manual.id);
});

test('bases duplicadas no mesmo lado ficam sem instalar, em vez de inventar outro lado', async () => {
  const env = ambiente();
  const entries = [env.row('Cyberleg', 'a', 'perna-direita'), env.row('Cyberleg', 'b', 'perna-direita')];
  await env.criar(entries);
  const notes = await env.montar(entries);
  assert.equal(env.installed.length, 0);
  assert.equal(notes.length, 2);
  assert.ok(env.snapshot().itens.every(item => item.local === '' && item.localPlanejado === 'perna-direita'));
});

test('snapshot usa pai real após instalação manual em outro lado e conserva a intenção original', async () => {
  const env = ambiente();
  const entries = [env.row('Cyberarm', 'esq', 'braco-esquerdo'), env.row('Cyberarm', 'dir', 'braco-direito'), env.row('Wolvers', 'op', 'braco-direito', 'dir')];
  await env.criar(entries);
  await env.montar(entries.slice(0, 2));
  await env.porUid('esq').installItems([env.porUid('op')]); // a escolha manual no CORE é a fonte da instalação real
  const option = env.snapshot().itens.find(item => item.uid === 'op');
  assert.equal(option.local, 'braco-esquerdo');
  assert.equal(option.localPlanejado, 'braco-direito');
  assert.equal(option.pai.uid, 'esq');
  assert.equal(option.emPlanejado, 'dir');
  const count = env.installed.length;
  const notes = await env.montar(entries);
  assert.equal(env.installed.length, count, 'uma peça instalada não é movida por fora da ficha');
  assert.ok(notes.some(note => /instalado em outro local/.test(note)));
  assert.ok(env.pendente(entries).some(note => /ajuste pela ficha/.test(note)));
});

test('snapshot não inventa um pai ou lado quando uma peça está ligada a duas bases', async () => {
  const env = ambiente();
  const entries = [env.row('Cyberarm', 'esq', 'braco-esquerdo'), env.row('Cyberarm', 'dir', 'braco-direito'), env.row('Wolvers', 'op')];
  await env.criar(entries);
  await env.montar(entries.slice(0, 2));
  await env.porUid('esq').installItems([env.porUid('op')]);
  await env.porUid('dir').installItems([env.porUid('op')]);
  const option = env.snapshot().itens.find(item => item.uid === 'op');
  assert.equal(option.pai, null);
  assert.equal(option.local, '');
  assert.equal(option.pais.length, 2);
});

test('pedido conserva local/pai planejado, entrega guardado e não faz cirurgia nem cobra Humanidade', async () => {
  const env = ambiente();
  const items = [env.row('Cyberarm', 'pedido:p:0', 'braco-direito'), env.row('Wolvers', 'pedido:p:1', 'braco-direito', 'pedido:p:0')];
  const order = { id: 'p', total: 200, itens: items };
  assert.equal((await env.entregar(order)).ok, true);
  assert.equal(env.installed.length, 0);
  assert.deepEqual(env.charges, [['wealth', 800]]);
  assert.equal(env.actor.system.improvementPoints.value, 70);
  const option = env.snapshot().itens.find(item => item.uid === 'pedido:p:1');
  assert.equal(option.instalado, false);
  assert.equal(option.local, '');
  assert.equal(option.localPlanejado, 'braco-direito');
  assert.equal(option.pai, null);
  assert.equal(option.emPlanejado, 'pedido:p:0');
  assert.equal(env.porUid('pedido:p:0').name, 'Cyberarm — Braço direito');
  await env.entregar(order);
  assert.equal(env.actor.items.length, 2);
  assert.equal(env.charges.length, 1);
});

test('montagem muda flag e rótulo da base existente, sem reinstalar ou cobrar novamente', async () => {
  const env = ambiente();
  const entry = env.row('Cyberarm', 'base');
  await env.criar([entry]);
  await env.montar([entry]);
  env.porUid('base').flags.outroModulo = { manual: true };
  env.porUid('base').flags['cpr-2077'].anotacaoManual = 'preservar';
  const updated = { ...entry, local: 'braco-esquerdo' };
  assert.ok(env.pendente([updated]).some(line => /local → Braço esquerdo/.test(line)));
  const count = env.installed.length;
  await env.montar([updated]);
  assert.equal(env.porUid('base').name, 'Cyberarm — Braço esquerdo');
  const snapshot = env.snapshot().itens[0];
  assert.equal(snapshot.local, 'braco-esquerdo');
  assert.equal(snapshot.uid, 'base');
  assert.equal(snapshot.nomeCatalogo, 'Cyberarm');
  assert.equal(snapshot.idCatalogo, 'catalogo:Cyberarm');
  assert.equal(env.porUid('base').flags['cpr-2077'].anotacaoManual, 'preservar');
  assert.deepEqual(env.porUid('base').flags.outroModulo, { manual: true });
  await env.montar([{ ...updated, local: 'braco-direito' }]);
  assert.equal(env.porUid('base').name, 'Cyberarm — Braço direito', 'mudar lado não acumula sufixos');
  await env.montar([{ ...updated, local: '' }]);
  assert.equal(env.porUid('base').name, 'Cyberarm');
  assert.equal(env.snapshot().itens[0].nomeCatalogo, 'Cyberarm');
  assert.equal(env.snapshot().itens[0].idCatalogo, 'catalogo:Cyberarm');
  assert.equal(env.installed.length, count);
  assert.equal(env.charges.length, 0);
});

test('montagem recusa relabel que colocaria duas bases instaladas no mesmo local', async () => {
  const env = ambiente();
  const entries = [env.row('Cybereye', 'esq', 'olho-esquerdo'), env.row('Cybereye', 'dir', 'olho-direito')];
  await env.criar(entries);
  await env.montar(entries);
  await assert.rejects(env.montar([entries[0], { ...entries[1], local: 'olho-esquerdo' }]), /Duas bases instaladas/);
  assert.equal(env.porUid('dir').getFlag('cpr-2077', 'wikiLocal'), 'olho-direito');
});

test('entrega e leitura de detalhe anunciam locais=1, sem contaminar outros endpoints', async () => {
  const env = ambiente();
  await env.buscar('/api/personagens/v');
  const query = new URLSearchParams(env.requests.at(-1).query);
  assert.equal(query.get('roles'), '2');
  assert.equal(query.get('locais'), '1');
  await env.buscar('/api/personagens/v/mesa');
  assert.equal(env.requests.at(-1).query, '');
  env.requests.length = 0;
  await env.entregar({ id: 'p', total: 0, itens: [] });
  assert.ok(env.requests.every(request => request.path.endsWith('/entregue') && request.query === ''));
});
