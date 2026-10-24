// C34.3: a barra mostra a proteção usada pelo C18; o ajuste segue sync-tracked-armor.js do CORE 0.92.4.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mudarSpPelaBarra } from '../../foundry-sistema/scripts/barras-sp.mjs';

const armadura = (id, corpo, max = corpo, cabeca = 0) => ({ id, type: 'armadura', system: { equipada: true, escudo: false,
  sp: { corpo: { value: corpo, max }, cabeca: { value: cabeca, max: cabeca } } } });
const criarAtor = (itens = [armadura('externa', 7, 11, 9), armadura('interna', 1, 7, 7)]) => ({
  isOwner: true, type: 'personagem', items: itens, system: { hp: { value: 35 } }, gravacoes: [],
  async updateEmbeddedDocuments(tipo, mudancas) {
    assert.equal(tipo, 'Item'); this.gravacoes.push(structuredClone(mudancas));
    await Promise.resolve(); await Promise.resolve();
    return mudancas.map(({ _id, ...campos }) => {
      const item = this.items.find(i => i.id === _id);
      for (const [campo, valor] of Object.entries(campos)) item.system.sp[campo.split('.')[2]].value = valor;
      return item;
    });
  }
});
const valores = ator => ator.items.map(i => [i.system.sp.corpo.value, i.system.sp.cabeca.value]);
const terminar = async operacao => {
  // Os mocks só aguardam microtarefas. Se a fila ficou presa, o próximo turno do event loop já prova a falha.
  const terminou = await Promise.race([operacao.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 0))]);
  assert.equal(terminou, true, 'a gravação precisa terminar e liberar a próxima entrada');
};

test('C34.3: reduzir SP 7 para 5 abla duas camadas, para em zero e preserva cabeça e HP', async () => {
  const ator = criarAtor();
  const feita = await mudarSpPelaBarra(ator, 'corpo', 5);
  assert.deepEqual(feita.map(i => i.id), ['externa', 'interna']);
  assert.deepEqual(valores(ator), [[5, 9], [0, 7]]);
  assert.equal(ator.system.hp.value, 35);
});

test('C34.3: delta na cabeça não atinge corpo nem a armadura guardada ou o escudo', async () => {
  const ator = criarAtor([armadura('externa', 11, 11, 9), armadura('pele', 7, 7, 7), armadura('guardada', 18, 18, 18), armadura('escudo', 30, 30, 30)]);
  ator.items[2].system.equipada = false; ator.items[3].system.escudo = true;
  await mudarSpPelaBarra(ator, 'cabeca', -2, true);
  assert.deepEqual(valores(ator), [[11, 7], [7, 5], [18, 18], [30, 30]]);
});

test('C34.3: elevar SP restaura somente a peça de maior SP atual e respeita o máximo dela', async () => {
  const ator = criarAtor([armadura('metalgear', 5, 18), armadura('kevlar', 7, 7)]);
  await mudarSpPelaBarra(ator, 'corpo', 99);
  assert.deepEqual(valores(ator), [[5, 0], [7, 0]]);
  assert.equal(ator.gravacoes.length, 0, 'não escolhe a Metalgear por ter maior máximo');
  ator.items[1].system.sp.corpo.max = 11;
  await mudarSpPelaBarra(ator, 'corpo', 2, true);
  assert.deepEqual(valores(ator), [[5, 0], [9, 0]]);
  await mudarSpPelaBarra(ator, 'corpo', 99, true);
  assert.deepEqual(valores(ator), [[5, 0], [11, 0]]);
});

test('C34.3: empate restaura a primeira peça; zero aceita reparo e reduzir além do zero zera as camadas', async () => {
  const ator = criarAtor([armadura('primeira', 0, 11), armadura('segunda', 0, 18)]);
  await mudarSpPelaBarra(ator, 'corpo', 4);
  assert.deepEqual(valores(ator), [[4, 0], [0, 0]]);
  await mudarSpPelaBarra(ator, 'corpo', -99, true);
  assert.deepEqual(valores(ator), [[0, 0], [0, 0]]);
  await mudarSpPelaBarra(ator, 'corpo', 1, true);
  assert.deepEqual(valores(ator), [[1, 0], [0, 0]]);
});

test('C34.3: sem peça, sem mudança ou com entrada inválida, não grava', async () => {
  const ator = criarAtor();
  for (const valor of [NaN, Infinity, 1.5, '3', Number.MAX_SAFE_INTEGER + 1]) assert.deepEqual(await mudarSpPelaBarra(ator, 'corpo', valor), []);
  for (const local of ['escudo', 'perna', 'constructor', undefined]) assert.deepEqual(await mudarSpPelaBarra(ator, local, 1), []);
  await mudarSpPelaBarra(ator, 'corpo', 0, true);
  await mudarSpPelaBarra(ator, 'corpo', 7);
  assert.equal(ator.gravacoes.length, 0);
  assert.deepEqual(await mudarSpPelaBarra(criarAtor([]), 'corpo', 5), []);
});

test('C34.3: observador, contêiner e ator ausente não podem ajustar; capanga dono pode', async () => {
  assert.deepEqual(await mudarSpPelaBarra(null, 'corpo', 5), []);
  for (const [tipo, dono] of [['personagem', false], ['conteiner', true], ['blackice', true]]) {
    const ator = criarAtor(); ator.type = tipo; ator.isOwner = dono;
    assert.deepEqual(await mudarSpPelaBarra(ator, 'corpo', 5), []);
    assert.equal(ator.gravacoes.length, 0);
    assert.deepEqual(valores(ator), [[7, 9], [1, 7]]);
  }
  const capanga = criarAtor(); capanga.type = 'capanga';
  await mudarSpPelaBarra(capanga, 'corpo', -1, true);
  assert.deepEqual(valores(capanga), [[6, 9], [0, 7]]);
});

test('C34.3: duas entradas relativas simultâneas acumulam sem perder a segunda ablação', async () => {
  const ator = criarAtor();
  await terminar(Promise.all([mudarSpPelaBarra(ator, 'corpo', -1, true), mudarSpPelaBarra(ator, 'corpo', -1, true)]));
  assert.deepEqual(valores(ator), [[5, 9], [0, 7]]);
  assert.equal(ator.gravacoes.length, 2);
});

test('C34.3: após esperar, a próxima entrada relê a peça vestida e a permissão', async () => {
  for (const revogar of [false, true]) {
    const ator = criarAtor(), gravar = ator.updateEmbeddedDocuments;
    ator.updateEmbeddedDocuments = async function (...args) {
      const feito = await gravar.apply(this, args);
      this.items[0].system.equipada = false;
      if (revogar) this.isOwner = false;
      return feito;
    };
    await terminar(Promise.all([mudarSpPelaBarra(ator, 'corpo', -1, true), mudarSpPelaBarra(ator, 'corpo', 2, true)]));
    assert.deepEqual(valores(ator), revogar ? [[6, 9], [0, 7]] : [[6, 9], [2, 7]]);
    assert.equal(ator.gravacoes.length, revogar ? 1 : 2);
  }
});

test('C34.3: recusa vazia ou erro libera a fila para outra tentativa', async () => {
  for (const falhar of [false, true]) {
    const ator = criarAtor(), gravar = ator.updateEmbeddedDocuments;
    ator.updateEmbeddedDocuments = async () => { if (falhar) throw Error('recusada'); return []; };
    const tentativa = mudarSpPelaBarra(ator, 'corpo', -1, true);
    if (falhar) await assert.rejects(tentativa, /recusada/);
    else assert.deepEqual(await tentativa, []);
    assert.deepEqual(valores(ator), [[7, 9], [1, 7]]);
    ator.updateEmbeddedDocuments = gravar;
    await terminar(mudarSpPelaBarra(ator, 'corpo', -1, true));
    assert.deepEqual(valores(ator), [[6, 9], [0, 7]], 'nova tentativa precisa terminar e gravar');
  }
});

// Só a fronteira do Foundry é simulada: metadados das barras, delegação e descoberta dos atributos do modelo.
const foundryAntes = globalThis.foundry;
globalThis.foundry = { documents: { TokenDocument: class {
  constructor(dados) { Object.assign(this, dados); }
  getBarAttribute(nome, opcoes) { return { nativa: true, nome, opcoes }; }
  static getTrackedAttributes(tipo) {
    assert.ok(['personagem', 'capanga'].includes(tipo));
    return { bar: [['hp'], ['humanidade'], ['sorte'], ['armadura', 'corpo']], value: [['atributos', 'ref', 'valor']] };
  }
} } };
const { TokenCPR, registrarBarrasDeSp } = await import('../../foundry-sistema/scripts/token.mjs');
globalThis.foundry = foundryAntes;

test('C34.3: ambas as barras e a prévia alternativa leem SP e máximo do próprio ator do token', () => {
  for (const tipo of ['personagem', 'capanga']) {
    const token = new TokenCPR({ actor: { type: tipo, isOwner: true, system: { armadura: { cabeca: { sp: 9, max: 11 }, corpo: { sp: 7, max: 18 } } } },
      bar1: { attribute: 'armadura.corpo' }, bar2: { attribute: 'armadura.cabeca' } });
    assert.deepEqual(token.getBarAttribute('bar1'), { attribute: 'armadura.corpo', type: 'bar', value: 7, max: 18, editable: true });
    assert.deepEqual(token.getBarAttribute('bar2'), { attribute: 'armadura.cabeca', type: 'bar', value: 9, max: 11, editable: true });
    token.actor.system.armadura.corpo.sp = 5;
    assert.equal(token.getBarAttribute('bar2', { alternative: 'armadura.corpo' }).value, 5, 'prévia não pode ler a cabeça nem um valor antigo');
    token.actor.isOwner = false;
    assert.equal(token.getBarAttribute('bar1').editable, false);
    token.actor.system.armadura.corpo = { sp: 0, max: 0, item: null };
    assert.equal(token.getBarAttribute('bar1').value, 0);
    assert.equal(token.getBarAttribute('bar1').max, 0);
  }
});

test('C34.3: HP e outras barras delegam com opções intactas; SP sem ator válido não aparece', () => {
  const token = new TokenCPR({ bar1: { attribute: 'hp' } }), opcoes = { alternative: 'rez' };
  assert.deepEqual(token.getBarAttribute('bar1', opcoes), { nativa: true, nome: 'bar1', opcoes });
  assert.equal(token.getBarAttribute('bar2', { alternative: 'armadura.corpo' }), null);
  token.actor = { type: 'blackice' };
  assert.equal(token.getBarAttribute('bar2', { alternative: 'armadura.cabeca' }), null);
  assert.equal(token.getBarAttribute('bar1', { alternative: 'constructor' }).nativa, true);
});

test('C34.3: o registro conserva as barras e valores nativos e não oferece SP ao Black ICE', () => {
  const configAntes = globalThis.CONFIG;
  globalThis.CONFIG = { Token: {}, Actor: { trackableAttributes: { blackice: { bar: ['rez'] } } } };
  try {
    registrarBarrasDeSp();
    assert.equal(globalThis.CONFIG.Token.documentClass, TokenCPR);
    for (const tipo of ['personagem', 'capanga']) {
      assert.deepEqual(globalThis.CONFIG.Actor.trackableAttributes[tipo], {
        bar: ['hp', 'humanidade', 'sorte', 'armadura.corpo', 'armadura.cabeca'], value: ['atributos.ref.valor']
      });
    }
    assert.deepEqual(globalThis.CONFIG.Actor.trackableAttributes.blackice, { bar: ['rez'] });
  } finally { globalThis.CONFIG = configAntes; }
});
