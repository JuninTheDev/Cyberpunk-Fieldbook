// O importador real, com documentos e fetch simulados: não carrega o Foundry nem abre rede/processos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const clone = value => structuredClone(value);
const names = { solo: 'Solo', netrunner: 'Netrunner', tech: 'Tech', medtech: 'Medtech', fixer: 'Fixer' };
const abilities = {
  solo: ['Initiative Reaction', 'Precision Attack'],
  tech: ['Field Expertise', 'Upgrade Expertise', 'Fabrication Expertise', 'Invention Expertise'],
  medtech: ['Surgery', 'Medical Tech (Pharmaceuticals)', 'Medical Tech (Cryosystem Operation)', 'Surgery Skill', 'Medical Tech Skill']
};
function role(id, rank, ranks = {}) {
  return { id, nome: names[id], rank, foundry: { pack: 'cyberpunk-red-core.core_roles', nome: names[id] },
    habilidades: (abilities[id] || []).map(nome => ({ nome, rank: ranks[nome] || 0 })) };
}
function personagem(roles = [role('solo', 4), role('netrunner', 1)]) {
  return { id: 'personagem1', nome: 'V', versao: 1, role: roles[0].id,
    resultado: { stats: Object.fromEntries(['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'LUCK', 'EMP'].map(key => [key, 6])),
      derivados: { hp: 40 }, humanidade: { emp: 6, atual: 60, max: 60 },
      role: roles[0], roles, pericias: [], itens: [], veiculos: [], dinheiro: { saldo: 500 }, moradia: {}, lifepath: {} } };
}
function setAt(target, key, value) {
  const parts = key.split('.');
  const last = parts.pop();
  let parent = target;
  for (const part of parts) parent = parent[part] || (parent[part] = {});
  parent[last] = clone(value);
}
class Collection extends Array {
  get(id) { return this.find(item => item.id === id); }
}

function ambiente(initial = personagem()) {
  let doc = clone(initial);
  let serial = 0;
  const requests = [];
  const notices = [];
  const dialogs = [];
  const actors = new Map();
  const hooks = new Map();
  const timers = new Map();
  let timerId = 0;
  const fire = (event, value) => { for (const fn of hooks.get(event) || []) fn(value); };
  const options = { unchecked: [], missing: [], failCreate: '', failUpdate: false, skipUpdate: false, failSelection: false, failMark: false };
  const mutations = [];
  const ledger = [];
  const templates = Object.fromEntries(Object.entries(names).map(([id, name]) => [name, { name, type: 'role',
    system: { rank: 4, mainRoleAbility: id === 'netrunner' ? 'Interface' : name, abilities: (abilities[id] || []).map(name => ({ name, rank: 0, hasRoll: true })), bonuses: [], description: { value: '' } } }]));

  function itemOf(data, actor, keepId = false) {
    const item = { ...clone(data), id: keepId && data._id ? data._id : `item${++serial}`, parent: actor };
    item.getFlag = (namespace, name) => item.flags?.[namespace]?.[name];
    item.toObject = () => clone({ _id: item.id, name: item.name, type: item.type, system: item.system, flags: item.flags || {} });
    return item;
  }
  function actorOf(data) {
    const actor = {
      id: `actor${++serial}`, name: data.name, documentName: 'Actor', flags: clone(data.flags || {}), items: new Collection(),
      system: { stats: {}, derivedStats: { hp: {}, humanity: {} }, roleInfo: { activeRole: '', activeNetRole: '' }, installedItems: { list: [] },
        lifestyle: {}, lifepath: {}, wealth: { value: 0 }, improvementPoints: { value: 37 }, reputation: { value: 0 } },
      get itemTypes() { return Object.fromEntries(['role', 'armor', 'skill', 'criticalInjury', 'cyberware'].map(type => [type, this.items.filter(item => item.type === type)])); },
      getFlag(namespace, name) { return this.flags[namespace]?.[name]; },
      async setFlag(namespace, name, value) { setAt(this.flags, `${namespace}.${name}`, value); fire('updateActor', this); },
      async update(update) {
        if (options.failSelection && 'system.roleInfo.activeRole' in update) { options.failSelection = false; throw new Error('Falha na seleção das Roles'); }
        for (const [key, value] of Object.entries(update)) setAt(this, key, value);
        fire('updateActor', this);
      },
      async createEmbeddedDocuments(type, rows, createOptions = {}) {
        const created = [];
        for (const data of rows) {
          if (data.name === options.failCreate) throw new Error(`Falha ao criar ${data.name}`);
          const item = itemOf(data, this, createOptions.keepId);
          this.items.push(item);
          created.push(item);
          mutations.push(['create', item.id]);
          // O CORE escolhe a primeira Role como ativa, inclusive para a NET. O importador precisa corrigir isso.
          if (item.type === 'role') {
            if (!this.system.roleInfo.activeRole) this.system.roleInfo.activeRole = item.name;
            if (!this.system.roleInfo.activeNetRole) this.system.roleInfo.activeNetRole = item.id;
          }
          fire('createItem', item);
        }
        return created;
      },
      async updateEmbeddedDocuments(type, rows) {
        if (options.skipUpdate) return [];
        for (const row of rows) {
          const item = this.items.get(row._id);
          if (!item) throw new Error(`Item ausente: ${row._id}`);
          for (const [key, value] of Object.entries(row)) if (key !== '_id') setAt(item, key, value);
          mutations.push(['update', item.id]);
          fire('updateItem', item);
          if (options.failUpdate) { options.failUpdate = false; throw new Error('Falha ao atualizar Role'); }
        }
        return rows.map(row => this.items.get(row._id));
      },
      async deleteEmbeddedDocuments(type, ids) {
        for (const id of ids) { const at = this.items.findIndex(item => item.id === id); if (at >= 0) { const [item] = this.items.splice(at, 1); fire('deleteItem', item); } mutations.push(['delete', id]); }
      },
      async delete() { actors.delete(this.id); },
      async setMaxHumanity() {},
      setLedgerProperty(key, value) { ledger.push([key, value]); setAt(this.system, `${key}.value`, value); }
    };
    actors.set(actor.id, actor);
    return actor;
  }

  const pack = {
    async getIndex() { return Object.keys(templates).filter(name => !options.missing.includes(name)).map(name => ({ name, _id: name })); },
    async getDocument(name) { return { toObject: () => clone(templates[name]) }; }
  };
  const game = { settings: { get: (namespace, key) => key === 'wikiMesa' ? true : '', async set() {} }, world: { id: 'teste' }, actors, packs: new Map([['cyberpunk-red-core.core_roles', pack]]),
    user: { id: 'mestre', isGM: true }, users: [] };
  const context = vm.createContext({ URL, console, game,
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    Hooks: { on(event, fn) { hooks.set(event, [...hooks.get(event) || [], fn]); }, once() {} },
    location: { hostname: 'localhost', protocol: 'http:' },
    CONST: { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } },
    CONFIG: { Actor: { documentClass: { async create(data) { return actorOf(data); } } } },
    foundry: { utils: { deepClone: clone } },
    ui: { notifications: Object.fromEntries(['info', 'warn', 'error'].map(level => [level, message => { notices.push([level, message]); }])) },
    Dialog: { async prompt(spec) {
      dialogs.push(spec.content);
      const form = Object.fromEntries([...spec.content.matchAll(/name="(\w+)" checked/g)].map(([, name]) => [name, { checked: !options.unchecked.includes(name) }]));
      return spec.callback([{ querySelector: () => form }]);
    } },
    async fetch(url, init) {
      const parsed = new URL(url);
      const body = init.body ? JSON.parse(init.body) : undefined;
      requests.push({ path: parsed.pathname, query: parsed.search, method: init.method, body });
      let response = {};
      let ok = true;
      if (parsed.pathname === '/api/campanhas') response = { campanhas: [] };
      else if (parsed.pathname === `/api/personagens/${doc.id}` && init.method === 'GET') {
        assert.equal(parsed.searchParams.get('roles'), '2', 'o módulo anuncia suporte ao contrato de duas Roles');
        response = { personagem: clone(doc) };
      } else if (parsed.pathname.endsWith('/foundry') && options.failMark) { ok = false; response = { erro: 'Wiki indisponível' }; }
      return { ok, status: ok ? 200 : 503, async json() { return response; } };
    }
  });
  const arquivo = path.resolve(__dirname, '../../foundry-2077/scripts/wiki.mjs');
  const source = fs.readFileSync(arquivo, 'utf8').replace(/^export /gm, '');
  vm.runInContext(`${source}\nglobalThis.api = wikiApi;`, context, { filename: arquivo });
  return { api: context.api, requests, notices, dialogs, actors, options, mutations, ledger, templates, timers,
    registrarSync() { context.registerTableSync(); },
    setDoc(value) { doc = clone(value); }, getDoc() { return clone(doc); },
    async importar() { return (await context.api.importarPersonagem(doc.id, 'jogador', null)).actor; },
    async manual(actor, id) { return (await actor.createEmbeddedDocuments('Item', [templates[names[id]]]))[0]; }
  };
}
const marcacoes = env => env.requests.filter(request => request.path.endsWith('/foundry'));
const roleItem = (actor, name) => actor.itemTypes.role.find(item => item.name === name);

test('importa duas Roles com Ranks da mesa, principal estável e Interface na Role Netrunner', async () => {
  const env = ambiente(personagem([role('solo', 8, { 'Initiative Reaction': 3 }), role('netrunner', 2)]));
  const actor = await env.importar();
  assert.equal(actor.itemTypes.role.length, 2);
  assert.equal(roleItem(actor, 'Solo').system.rank, 8);
  assert.equal(roleItem(actor, 'Solo').system.abilities[0].rank, 3);
  assert.equal(roleItem(actor, 'Netrunner').system.rank, 2);
  assert.equal(actor.system.roleInfo.activeRole, 'Solo');
  assert.equal(actor.system.roleInfo.activeNetRole, roleItem(actor, 'Netrunner').id);
  assert.equal(actor.getFlag('cpr-2077', 'wiki').rolePrincipal, 'solo');
  assert.equal(actor.system.improvementPoints.value, 37);
  assert.ok(env.ledger.every(([key]) => key !== 'improvementPoints'), 'Ranks da criação não cobram IP');
  const sent = env.requests.find(request => request.path.endsWith('/mesa')).body;
  assert.deepEqual(sent.roles.map(entry => [entry.id, entry.rank]), [['solo', 8], ['netrunner', 2]]);
  assert.equal(sent.role.id, 'solo');
});

test('personagem legado com resultado.role singular continua importando uma Role', async () => {
  const doc = personagem([role('tech', 4, { 'Field Expertise': 4 })]);
  delete doc.resultado.roles;
  const env = ambiente(doc);
  const actor = await env.importar();
  assert.equal(actor.itemTypes.role.length, 1);
  assert.equal(roleItem(actor, 'Tech').system.abilities[0].rank, 4);
  assert.equal(actor.system.roleInfo.activeNetRole, '');
});

test('snapshot inclui Roles manuais e não troca a principal quando activeRole muda', async () => {
  const env = ambiente();
  const actor = await env.importar();
  await env.manual(actor, 'fixer');
  actor.system.roleInfo.activeRole = 'Netrunner';
  const snapshot = env.api.fichaDaMesa(actor);
  assert.equal(snapshot.role.nome, 'Solo');
  assert.equal(snapshot.role.id, 'solo');
  assert.equal(snapshot.roles.length, 3);
  assert.deepEqual(Array.from(snapshot.roles, entry => entry.id), ['solo', 'netrunner', 'fixer']);
  assert.equal(snapshot.itens.length, 0, 'Roles têm sua própria lista, sem duplicação no equipamento');
});

test('atualizar aplica Ranks e sub-habilidades de ambas, sem duplicar itens numa segunda atualização', async () => {
  const env = ambiente(personagem([role('solo', 4), role('tech', 1)]));
  const actor = await env.importar();
  const ids = actor.itemTypes.role.map(item => item.id);
  const updated = personagem([role('solo', 6, { 'Initiative Reaction': 2 }), role('tech', 3, { 'Field Expertise': 2, 'Upgrade Expertise': 1 })]);
  updated.versao = 2;
  env.setDoc(updated);
  await env.api.atualizarDaWiki(actor);
  assert.equal(roleItem(actor, 'Solo').system.rank, 6);
  assert.equal(roleItem(actor, 'Solo').system.abilities[0].rank, 2);
  assert.equal(roleItem(actor, 'Tech').system.rank, 3);
  assert.equal(roleItem(actor, 'Tech').system.abilities[1].rank, 1);
  assert.deepEqual(actor.itemTypes.role.map(item => item.id), ids);
  const mutations = env.mutations.length;
  const dialogs = env.dialogs.length;
  await env.api.atualizarDaWiki(actor);
  assert.equal(env.mutations.length, mutations);
  assert.equal(env.dialogs.length, dialogs);
  assert.equal(actor.getFlag('cpr-2077', 'wiki').versao, 2);
});

test('reaproveita Role manual sem passar a tratá-la como propriedade do importador', async () => {
  const env = ambiente(personagem([role('solo', 4)]));
  const actor = await env.importar();
  const manual = await env.manual(actor, 'tech');
  env.setDoc(personagem([role('solo', 4), role('tech', 2)]));
  await env.api.atualizarDaWiki(actor);
  assert.equal(roleItem(actor, 'Tech').id, manual.id);
  assert.equal(roleItem(actor, 'Tech').system.rank, 2);
  assert.equal(manual.getFlag('cpr-2077', 'wikiRole'), undefined);
  env.setDoc(personagem([role('solo', 4)]));
  await env.api.atualizarDaWiki(actor);
  assert.ok(actor.items.get(manual.id), 'a Role manual permanece quando a wiki deixa de listá-la');
});

test('retira somente a antiga Role da wiki, com a retirada explícita na revisão', async () => {
  const env = ambiente();
  const actor = await env.importar();
  const old = roleItem(actor, 'Netrunner').id;
  const manual = await env.manual(actor, 'fixer');
  env.setDoc(personagem([role('solo', 4), role('tech', 1)]));
  await env.api.atualizarDaWiki(actor);
  assert.match(env.dialogs.at(-1), /Retirar Role da wiki: Netrunner/);
  assert.equal(actor.items.get(old), undefined);
  assert.ok(actor.items.get(manual.id));
  assert.equal(roleItem(actor, 'Tech').system.rank, 1);
});

test('compêndio ausente ou sub-habilidade inválida impedem importação antes de criar o ator', async () => {
  for (const fault of ['compendio', 'habilidade']) {
    const doc = personagem();
    if (fault === 'habilidade') doc.resultado.roles[1].habilidades = [{ nome: 'Inexistente', rank: 1 }];
    const env = ambiente(doc);
    if (fault === 'compendio') env.options.missing.push('Netrunner');
    await assert.rejects(env.importar(), /não encontrada|sub-habilidade/);
    assert.equal(env.actors.size, 0);
    assert.equal(env.mutations.length, 0);
    assert.equal(marcacoes(env).length, 0);
  }
});

test('Ranks fora de 1–10 e duas entradas da mesma Role são recusados antes de criar ator', async () => {
  for (const roles of [[role('solo', 0)], [role('solo', 11)], [role('solo', 2.5)], [role('solo', 4), role('solo', 1)]]) {
    const env = ambiente(personagem(roles));
    await assert.rejects(env.importar(), /Rank precisa|válidas e diferentes/);
    assert.equal(env.actors.size, 0);
  }
});

test('falha ao criar a segunda Role desfaz a primeira e retira o ator incompleto', async () => {
  const env = ambiente();
  env.options.failCreate = 'Netrunner';
  await assert.rejects(env.importar(), /Não foi possível aplicar as Roles/);
  assert.equal(env.actors.size, 0);
  assert.equal(marcacoes(env).length, 0);
});

test('falha de sub-habilidade ao atualizar não muda a ficha nem marca sincronização', async () => {
  const env = ambiente();
  const actor = await env.importar();
  const doc = env.getDoc();
  doc.resultado.roles[0].habilidades.push({ nome: 'Inexistente', rank: 1 });
  env.setDoc(doc);
  const before = env.mutations.length;
  env.requests.length = 0;
  await env.api.atualizarDaWiki(actor);
  assert.equal(env.mutations.length, before);
  assert.equal(marcacoes(env).length, 0);
  assert.ok(env.notices.some(([level, text]) => level === 'error' && /sub-habilidade/.test(text)));
});

test('erro durante update restaura Ranks e sub-habilidades e mantém atualização pendente', async () => {
  const env = ambiente();
  const actor = await env.importar();
  const before = actor.itemTypes.role.map(item => item.toObject());
  env.setDoc(personagem([role('solo', 7, { 'Initiative Reaction': 3 }), role('netrunner', 2)]));
  env.requests.length = 0;
  env.options.failUpdate = true;
  await assert.rejects(env.api.atualizarDaWiki(actor), /Roles anteriores foram restauradas/);
  assert.deepEqual(actor.itemTypes.role.map(item => item.toObject()), before);
  assert.equal(marcacoes(env).length, 0);
});

test('erro após retirar uma Role restaura seu documento e ID', async () => {
  const env = ambiente();
  const actor = await env.importar();
  const old = roleItem(actor, 'Netrunner').toObject();
  env.setDoc(personagem([role('solo', 4), role('tech', 1)]));
  env.requests.length = 0;
  env.options.failSelection = true;
  await assert.rejects(env.api.atualizarDaWiki(actor), /Roles anteriores foram restauradas/);
  assert.deepEqual(actor.items.get(old._id).toObject(), old);
  assert.equal(roleItem(actor, 'Tech'), undefined);
  assert.equal(marcacoes(env).length, 0);
});

test('hook que cancela update silenciosamente não produz sincronização falsa', async () => {
  const env = ambiente();
  const actor = await env.importar();
  env.setDoc(personagem([role('solo', 8), role('netrunner', 2)]));
  env.requests.length = 0;
  env.options.skipUpdate = true;
  await assert.rejects(env.api.atualizarDaWiki(actor), /não ficou igual/);
  assert.equal(roleItem(actor, 'Solo').system.rank, 4);
  assert.equal(marcacoes(env).length, 0);
});

test('sync automático não manda estado parcial durante uma mudança de Roles que falha', async () => {
  const env = ambiente();
  env.registrarSync();
  const actor = await env.importar();
  assert.equal(env.timers.size, 1, 'o ator importado tinha uma sincronização agendada');
  env.setDoc(personagem([role('solo', 8), role('netrunner', 2)]));
  env.requests.length = 0;
  env.options.failUpdate = true;
  await assert.rejects(env.api.atualizarDaWiki(actor), /Roles anteriores foram restauradas/);
  assert.equal(env.timers.size, 0, 'o agendamento anterior foi cancelado, e os hooks não agendaram estado parcial');
  assert.equal(env.requests.filter(request => request.path.endsWith('/mesa')).length, 0);
  assert.equal(marcacoes(env).length, 0);
});

test('desmarcar Roles na revisão preserva os dados e não registra sincronização', async () => {
  const env = ambiente();
  const actor = await env.importar();
  env.setDoc(personagem([role('solo', 9), role('netrunner', 3)]));
  env.requests.length = 0;
  env.options.unchecked = ['roles'];
  await env.api.atualizarDaWiki(actor);
  assert.equal(roleItem(actor, 'Solo').system.rank, 4);
  assert.equal(roleItem(actor, 'Netrunner').system.rank, 1);
  assert.equal(marcacoes(env).length, 0);
  assert.ok(env.notices.some(([level, text]) => level === 'warn' && /continua pendente/.test(text)));
});

test('falha ao registrar a atualização na API não anuncia sucesso', async () => {
  const env = ambiente();
  const actor = await env.importar();
  env.setDoc(personagem([role('solo', 5), role('netrunner', 2)]));
  env.options.failMark = true;
  env.notices.length = 0;
  await assert.rejects(env.api.atualizarDaWiki(actor), /Wiki indisponível/);
  assert.ok(!env.notices.some(([level, text]) => level === 'info' && /atualizado da wiki/.test(text)));
});

test('GET detalhe usado pela montagem também anuncia o contrato roles=2', async () => {
  const env = ambiente();
  const actor = await env.importar();
  env.requests.length = 0;
  await env.api.montagemPendente(actor);
  assert.equal(env.requests.length, 1);
  const query = new URLSearchParams(env.requests[0].query);
  assert.equal(query.get('roles'), '2');
  assert.equal(query.get('locais'), '1');
});
