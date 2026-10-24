// CORE 0.92.4: item-folder-upgraded-display.js e CPRActor.createEmbeddedDocuments (criar componentes com novos IDs).
import assert from 'node:assert/strict';
import test from 'node:test';
import { arvoreDeInstalados } from '../../foundry-sistema/scripts/regras-instalados.mjs';
import { destinosDeInstalacao, itemDoMundo, itensNoContexto, podeConsultarItem } from '../../foundry-sistema/scripts/instalados.mjs';
import { abrirConsultaDeInstalado, registrarDiretorioDeItens } from '../../foundry-sistema/scripts/diretorio-itens.mjs';
import { levarItem } from '../../foundry-sistema/scripts/conteiner.mjs';

class Colecao extends Map {
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
}
const colecao = itens => new Colecao(itens.map(i => [i.id, i]));
const item = (id, type = 'upgrade', pai = '', name = id) => ({ id, name, type, system: { instaladoEm: pai },
  testUserPermission: (_u, nivel) => { assert.equal(nivel, 'OBSERVER'); return true; }, getFlag: () => '' });
const ids = floresta => floresta.map(r => [r.id, r.linhas.map(i => [i.id, i.profundidade])]);

test('C34.3: árvore de veículo, arma e acessório usa IDs, inclusive com nomes iguais e entradas fora de ordem', () => {
  const itens = [item('u', 'upgrade', 'a', 'Igual'), item('v', 'veiculo'), item('solto', 'upgrade', '', 'Igual'), item('a', 'arma', 'v', 'Igual')];
  const antes = JSON.stringify(itens);
  assert.deepEqual(ids(arvoreDeInstalados(itens)), [['v', [['a', 0], ['u', 1]]], ['solto', []]]);
  assert.equal(JSON.stringify(itens), antes);
});

test('C34.3: programas vêm antes do hardware e a ordem dentro do tipo usa nome com números', () => {
  const itens = [item('d', 'cyberdeck'), item('h', 'upgrade', 'd', 'AAA'), item('p10', 'programa', 'd', 'Programa 10'), item('p2', 'programa', 'd', 'Programa 2')];
  assert.deepEqual(ids(arvoreDeInstalados(itens)), [['d', [['p2', 0], ['p10', 0], ['h', 0]]]]);
  assert.deepEqual(ids(arvoreDeInstalados([item('w', 'arma'), item('u', 'upgrade', 'w'), item('m', 'municao', 'w')])), [['w', [['m', 0], ['u', 0]]]]);
});

test('C34.3: pai ausente, autorreferência e ciclos continuam visíveis, sem perder descendentes', () => {
  const itens = [item('ausente', 'programa', 'secreto'), item('si', 'upgrade', 'si'), item('a', 'arma', 'b'), item('b', 'upgrade', 'a'), item('c', 'upgrade', 'a')];
  assert.deepEqual(ids(arvoreDeInstalados(itens)), [['ausente', []], ['si', []], ['a', [['c', 0]]], ['b', []]]);
  assert.deepEqual(arvoreDeInstalados([]), []);
});

test('C34.3: uma cadeia longa não usa recursão nem omite itens', () => {
  const itens = Array.from({ length: 2000 }, (_, i) => item(String(i), 'upgrade', i ? String(i - 1) : ''));
  const arvore = arvoreDeInstalados(itens);
  assert.equal(arvore.length, 1); assert.equal(arvore[0].linhas.length, 1999);
  assert.deepEqual(arvore[0].linhas.at(-1), { id: '1999', profundidade: 1998 });
});

async function ambiente(f) {
  const nomes = ['game', 'foundry', 'ui', 'Hooks'], antes = Object.fromEntries(nomes.map(n => [n, globalThis[n]])); let n = 0;
  globalThis.game = { user: { id: 'jogador' }, items: colecao([]) };
  globalThis.foundry = { utils: { randomID: () => 'novo' + ++n } };
  globalThis.ui = { notifications: { warn: () => {} } };
  try { return await f(); } finally { for (const nome of nomes) if (antes[nome] === undefined) delete globalThis[nome]; else globalThis[nome] = antes[nome]; }
}

test('C34.3: mundo inclui só itens consultáveis; ator e compêndio não resolvem IDs no mundo', () => ambiente(() => {
  const publico = item('publico'), secreto = item('secreto'); secreto.testUserPermission = () => false;
  globalThis.game.items = colecao([publico, secreto]);
  assert.equal(podeConsultarItem(secreto), false);
  assert.deepEqual(itensNoContexto(publico), [publico]);
  assert.equal(itemDoMundo(publico), true);
  assert.equal(itemDoMundo({ ...publico }), false, 'ID igual não transforma outra instância em item do mundo');
  const doAtor = { ...publico, actor: { items: colecao([secreto]) }, parent: { documentName: 'Actor' } };
  assert.equal(itensNoContexto(doAtor), doAtor.actor.items);
  assert.deepEqual(itensNoContexto({ ...publico, inCompendium: true }), []);
  assert.equal(itemDoMundo({ ...publico, inCompendium: true }), false);
  globalThis.game.user = null;
  assert.deepEqual(itensNoContexto(publico), []);
}));

test('C34.3: destinos do programa, upgrade e arma ficam no tipo correto e sem nomes de itens ocultos', () => ambiente(() => {
  const deck = item('d', 'cyberdeck'), arma = item('a', 'arma'), veiculo = item('v', 'veiculo'), oculto = item('x', 'cyberdeck'); oculto.testUserPermission = () => false;
  globalThis.game.items = colecao([deck, arma, veiculo, oculto]);
  assert.deepEqual(destinosDeInstalacao(item('p', 'programa')).map(i => i.id), ['d']);
  const up = item('u'); up.system.alvo = 'arma';
  assert.deepEqual(destinosDeInstalacao(up).map(i => i.id), ['a']);
  assert.deepEqual(destinosDeInstalacao(arma).map(i => i.id), ['v']);
  assert.deepEqual(destinosDeInstalacao({ ...up, inCompendium: true }), []);
}));

test('C34.3: opções de cyberware do mundo respeitam fundação, tipo e slots livres', () => ambiente(() => {
  const base = item('base', 'cyberware'); base.system = { fundacional: true, tipo: 'cyberarm', slots: 2 };
  const opcao = item('opcao', 'cyberware'); opcao.system = { tipo: 'cyberarm', tamanho: 2 };
  const ocupada = item('ocupada', 'cyberware', 'base'); ocupada.system.tamanho = 1;
  globalThis.game.items = colecao([base, opcao]);
  assert.deepEqual(destinosDeInstalacao(opcao).map(i => i.id), ['base']);
  globalThis.game.items.set(ocupada.id, ocupada);
  assert.deepEqual(destinosDeInstalacao(opcao), []);
  ocupada.system.instaladoEm = ''; base.system.tipo = 'cybereye';
  assert.deepEqual(destinosDeInstalacao(opcao), []);
  assert.deepEqual(destinosDeInstalacao(base), []);
}));

test('C34.3: consulta abre outra ficha, sem edição, submissão ou ações que mudam o item; relê a permissão', () => ambiente(() => {
  const doc = item('u'); let gravou = 0, mudou = 0;
  class Ficha {
    static DEFAULT_OPTIONS = { actions: { usar: () => {} } };
    constructor(opcoes) { this.options = opcoes; }
    get isEditable() { return true; }
    render(opcoes) { this.renderizou = opcoes.force; }
    _processSubmitData() { gravou++; }
    _onClickAction() { mudou++; }
  }
  doc.sheet = new Ficha({ document: doc }); globalThis.game.items.set(doc.id, doc);
  const consulta = abrirConsultaDeInstalado('u');
  assert.equal(consulta.isEditable, false); assert.equal(consulta.renderizou, true);
  assert.equal(consulta.options.ownershipConfig, false); assert.equal(consulta.options.sheetConfig, false);
  assert.equal(doc.sheet.isEditable, true, 'a ficha original não se torna somente leitura');
  consulta._processSubmitData({}, {}); consulta._onClickAction({}, { dataset: { action: 'usar' } });
  assert.equal(gravou, 0); assert.equal(mudou, 0);
  assert.equal(abrirConsultaDeInstalado('u'), consulta);
  doc.testUserPermission = () => false;
  assert.equal(abrirConsultaDeInstalado('u'), null);
  assert.equal(abrirConsultaDeInstalado('inexistente'), null);
}));

test('C34.3: a árvore registra o gancho do diretório v14', () => ambiente(() => {
  const eventos = [];
  globalThis.Hooks = { on: (nome, funcao) => eventos.push([nome, typeof funcao]) };
  registrarDiretorioDeItens();
  assert.deepEqual(eventos, [['renderItemDirectory', 'function']]);
}));

const destino = () => ({ isOwner: true, uuid: 'Actor.destino', items: colecao([]),
  async createEmbeddedDocuments(tipo, dados, opcoes) {
    assert.equal(tipo, 'Item'); assert.equal(opcoes.keepId, true);
    return dados.map(d => { const i = { ...structuredClone(d), id: d._id }; this.items.set(i.id, i); return i; });
  },
  async deleteEmbeddedDocuments(_tipo, ids) { for (const id of ids) this.items.delete(id); }
});
const fonte = (id, type, pai = '') => {
  const i = item(id, type, pai);
  i.system.equipada = true;
  i.toObject = () => ({ _id: i.id, name: i.name, type: i.type, folder: 'pastaDoMundo', system: structuredClone(i.system), effects: [{ name: 'Efeito da fonte' }] });
  return i;
};

test('C34.3: copiar modelo do mundo leva três níveis, remapeia IDs e conserva a origem', () => ambiente(async () => {
  const v = fonte('v', 'veiculo'), a = fonte('a', 'arma', 'v'), u = fonte('u', 'upgrade', 'a');
  globalThis.game.items = colecao([v, a, u]); const ator = destino();
  const criado = await levarItem(v, ator, { manterNaOrigem: true });
  assert.equal(ator.items.size, 3); assert.equal(globalThis.game.items.size, 3);
  const filhos = ator.items.filter(i => i.type === 'arma' || i.type === 'upgrade');
  const arma = filhos.find(i => i.type === 'arma'), up = filhos.find(i => i.type === 'upgrade');
  assert.notEqual(criado.id, 'v'); assert.notEqual(arma.id, 'a'); assert.notEqual(up.id, 'u');
  assert.equal(criado.system.instaladoEm, ''); assert.equal(arma.system.instaladoEm, criado.id); assert.equal(up.system.instaladoEm, arma.id);
  assert.equal(u.system.instaladoEm, 'a'); assert.equal(a.system.instaladoEm, 'v');
  for (const i of ator.items.values()) { assert.equal(i.folder, undefined); assert.equal(i.system.equipada, false); assert.deepEqual(i.effects, [{ name: 'Efeito da fonte' }]); }
}));

test('C34.3: arrastar componente o solta do pai; origem sem acesso e filhos ocultos não são copiados', () => ambiente(async () => {
  const v = fonte('v', 'veiculo'), a = fonte('a', 'arma', 'v'), u = fonte('u', 'upgrade', 'a'); u.testUserPermission = () => false;
  globalThis.game.items = colecao([v, a, u]); const ator = destino();
  const criado = await levarItem(a, ator, { manterNaOrigem: true });
  assert.equal(ator.items.size, 1); assert.equal(criado.system.instaladoEm, '');
  a.testUserPermission = () => false;
  assert.equal(await levarItem(a, ator, { manterNaOrigem: true }), null);
  assert.equal(ator.items.size, 1);
}));

test('C34.3: criação parcial da árvore desfaz as cópias sem tocar o modelo', () => ambiente(async () => {
  const v = fonte('v', 'veiculo'), a = fonte('a', 'arma', 'v'); globalThis.game.items = colecao([v, a]);
  const ator = destino(), criar = ator.createEmbeddedDocuments;
  ator.createEmbeddedDocuments = function (tipo, dados, opcoes) { return criar.call(this, tipo, dados.slice(0, 1), opcoes); };
  await assert.rejects(levarItem(v, ator, { manterNaOrigem: true }), /criar todos/);
  assert.equal(ator.items.size, 0); assert.equal(globalThis.game.items.size, 2);
}));

test('C34.3: uma montagem antiga com ciclo é copiada uma vez por ID, com a raiz solta', () => ambiente(async () => {
  const a = fonte('a', 'arma', 'u'), u = fonte('u', 'upgrade', 'a');
  const mundo = colecao([a, u]), filtrar = mundo.filter; let leituras = 0;
  mundo.filter = function (f) {
    const visiveis = filtrar.call(this, f), filtrarVisiveis = visiveis.filter.bind(visiveis);
    visiveis.filter = fn => { assert.ok(++leituras < 20, 'a travessia precisa terminar sem revisitar o ciclo'); return filtrarVisiveis(fn); };
    return visiveis;
  };
  globalThis.game.items = mundo; const ator = destino();
  const raiz = await levarItem(a, ator, { manterNaOrigem: true });
  assert.equal(ator.items.size, 2); assert.equal(raiz.system.instaladoEm, '');
  assert.equal(ator.items.find(i => i.type === 'upgrade').system.instaladoEm, raiz.id);
  assert.equal(a.system.instaladoEm, 'u');
}));
