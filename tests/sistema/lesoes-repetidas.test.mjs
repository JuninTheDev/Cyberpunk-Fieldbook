// CORE 0.92.4: preventDuplicateCriticalInjuries e CPRActorSheet._drawCriticalInjuryTable.
// Wiki, system-rules.js:549: o padrão da mesa continua sendo rolar outra lesão.
import assert from 'node:assert/strict';
import test from 'node:test';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';
import { modoDeLesaoRepetida, sortearLesao } from '../../foundry-sistema/scripts/regras-lesoes.mjs';
import { escolherLesao, escolhaDeLesao, lesaoCritica } from '../../foundry-sistema/scripts/lesoes.mjs';
import { TABELAS_LESAO } from '../../foundry-sistema/scripts/gerado.mjs';

const PERNA = 'core_critical-injuries-body:broken-leg';
const BRACO = 'core_critical-injuries-body:broken-arm';
const OLHO = 'core_critical-injuries-head:damaged-eye';
const catalogo = Object.fromEntries([[PERNA, 'Perna quebrada'], [BRACO, 'Braço quebrado'], [OLHO, 'Olho danificado']]
  .map(([id, name]) => [id, { name, type: 'lesao', system: { descricao: name }, effects: id === PERNA ? [{ name: 'Efeito de ' + name }] : [], flags: { 'cpr-fieldbook': { catalogo: id } } }]));

function ambiente(t, { modo = 'rolar', tem = [], fila = [] } = {}) {
  const nomes = ['game', 'foundry', 'fetch', 'Roll', 'ChatMessage', 'ui', 'fromUuid'];
  const anteriores = Object.fromEntries(nomes.map(nome => [nome, globalThis[nome]]));
  t.after(() => { for (const nome of nomes) { if (anteriores[nome] === undefined) delete globalThis[nome]; else globalThis[nome] = anteriores[nome]; } });
  const estado = { modo, fila: [...fila], dados: 0, avisos: [], cartoes: [], mensagens: [], aoRolar: null, aoCriar: null };
  let sequencia = 0;
  const item = dados => ({ ...structuredClone(dados), id: 'lesao-' + (++sequencia), getFlag(escopo, chave) { return this.flags[escopo]?.[chave]; } });
  const ator = { name: 'Ferido', uuid: 'Actor.ferido', type: 'personagem', isOwner: true, system: { hp: { value: 35 } },
    items: tem.map(id => item(catalogo[id])),
    async createEmbeddedDocuments(tipo, dados) {
      assert.equal(tipo, 'Item');
      if (estado.aoCriar) return estado.aoCriar(dados);
      const criados = dados.map(item);
      this.items.push(...criados);
      return criados;
    } };
  globalThis.game = { user: { isGM: true }, settings: { get(escopo, chave) {
    assert.equal(escopo, 'cpr-fieldbook'); assert.equal(chave, 'lesaoRepetida'); return estado.modo;
  } } };
  globalThis.foundry = { utils: { deepClone: structuredClone }, applications: { handlebars: { renderTemplate: async (caminho, dados) => {
    estado.cartoes.push({ caminho, dados }); return JSON.stringify(dados);
  } } } };
  globalThis.fetch = async () => ({ json: async () => ({ itens: catalogo }) });
  globalThis.ui = { notifications: { warn: aviso => estado.avisos.push(aviso) } };
  globalThis.fromUuid = async uuid => uuid === ator.uuid ? ator : null;
  globalThis.Roll = class {
    constructor(formula) { assert.equal(formula, '2d6'); }
    async evaluate() {
      estado.dados++;
      const total = estado.fila.shift();
      assert.ok(Number.isFinite(total), 'não devia pedir outra rolagem');
      this.total = total;
      this.dice = [{ faces: 6, total, results: [{ result: Math.floor(total / 2) }, { result: Math.ceil(total / 2) }] }];
      if (estado.aoRolar) await estado.aoRolar(ator);
      return this;
    }
  };
  globalThis.ChatMessage = { implementation: { getSpeaker: () => ({ actor: 'ferido' }), create: async dados => {
    const mensagem = { ...dados, getFlag: (escopo, chave) => dados.flags[escopo]?.[chave], async update(atualizacao) {
      dados.flags['cpr-fieldbook'].escolhaDeLesao.escolhida = atualizacao['flags.cpr-fieldbook.escolhaDeLesao.escolhida'];
    } };
    estado.mensagens.push(mensagem); return mensagem;
  } } };
  return { estado, ator };
}

test('C34.2: lesão repetida é opção do mundo; padrão rolar mantém a regra da wiki', () => {
  const anterior = globalThis.game, registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  try {
    registrarConfiguracoes();
    const opcao = registros.get('lesaoRepetida');
    assert.equal(opcao.sistema, 'cpr-fieldbook'); assert.equal(opcao.scope, 'world');
    assert.equal(opcao.type, String); assert.equal(opcao.config, true); assert.equal(opcao.default, 'rolar');
    assert.deepEqual(Object.keys(opcao.choices), ['permitir', 'avisar', 'rolar']);
  } finally { globalThis.game = anterior; }
});

test('C34.2: modo inválido conserva rolar; permitir e avisar aceitam inclusive tabela já esgotada', async () => {
  for (const modo of [undefined, null, '', 'off', 'invalido', 'toString', '__proto__']) assert.equal(modoDeLesaoRepetida(modo), 'rolar');
  for (const repeticao of ['permitir', 'avisar']) {
    assert.equal(modoDeLesaoRepetida(repeticao), repeticao);
    let rolagens = 0;
    const roll = { total: 8 };
    assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: TABELAS_LESAO.corpo.map(f => f[2]), repeticao,
      rolar: async () => { rolagens++; return roll; } }), { id: PERNA, roll });
    assert.equal(rolagens, 1);
  }
});

test('C34.2: permitir repetida ainda respeita exclusões, tabela escolhida e resultados inválidos', async () => {
  for (const repeticao of ['permitir', 'avisar']) {
    const fila = [{ total: 8 }, { total: 1 }, { total: 6 }];
    const feito = await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: [BRACO], excluir: [PERNA], repeticao, rolar: async () => fila.shift() });
    assert.equal(feito.id, BRACO); assert.equal(feito.roll.total, 6); assert.equal(fila.length, 0);
    assert.deepEqual(await sortearLesao({ faixas: [[8, 8, PERNA]], excluir: [PERNA], repeticao,
      rolar: () => assert.fail('exclusão esgota a tabela mesmo permitindo repetidas') }), { motivo: 'esgotada' });
    assert.equal((await sortearLesao({ faixas: TABELAS_LESAO.cabeca, tem: [OLHO], repeticao, rolar: async () => ({ total: 4 }) })).id, OLHO);
  }
});

test('C34.2: rolar novamente cria a lesão nova, mantém HP e anuncia só o resultado que valeu', async t => {
  const { ator, estado } = ambiente(t, { tem: [PERNA], fila: [8, 6] });
  const feita = await lesaoCritica(ator);
  assert.equal(feita.id, BRACO); assert.equal(estado.dados, 2); assert.ok(feita.item);
  assert.equal(ator.items.length, 2); assert.equal(ator.system.hp.value, 35);
  assert.equal(estado.avisos.length, 0); assert.equal(estado.mensagens.length, 1);
  assert.equal(estado.mensagens[0].rolls[0].total, 6); assert.equal(estado.cartoes[0].dados.repetida, false);
});

for (const modo of ['permitir', 'avisar']) {
  test(`C34.2: ${modo} cria outra lesão com o mesmo catálogo e seus próprios efeitos`, async t => {
    const { ator, estado } = ambiente(t, { modo, tem: [PERNA], fila: [8] });
    const feita = await lesaoCritica(ator);
    assert.equal(feita.id, PERNA); assert.equal(estado.dados, 1); assert.equal(estado.fila.length, 0);
    assert.equal(ator.items.length, 2); assert.notEqual(ator.items[0].id, feita.item.id);
    assert.notEqual(ator.items[0].effects, feita.item.effects); assert.deepEqual(feita.item.effects, catalogo[PERNA].effects);
    assert.equal(ator.system.hp.value, 35); assert.equal(estado.mensagens.length, 1);
    assert.equal(estado.cartoes[0].dados.repetida, true);
    assert.deepEqual(estado.avisos, modo === 'avisar' ? ['Ferido já tem Perna quebrada: a lesão repetida foi aceita.'] : []);
  });
}

test('C34.2: só anunciar não cria a repetida; as lesões fixas continuam sem duplicar', async t => {
  const { ator, estado } = ambiente(t, { modo: 'avisar', tem: [PERNA], fila: [8] });
  const anunciada = await lesaoCritica(ator, { naFicha: false });
  assert.equal(anunciada.id, PERNA); assert.equal(anunciada.item, null); assert.equal(ator.items.length, 1);
  assert.equal(estado.cartoes[0].dados.naFicha, false); assert.equal(estado.avisos.length, 1);
  for (const modo of ['permitir', 'avisar', 'rolar']) {
    estado.modo = modo;
    const fixa = await lesaoCritica(ator, { id: PERNA, falar: false });
    assert.equal(fixa.item, null); assert.equal(fixa.id, PERNA); assert.equal(ator.items.length, 1);
  }
  assert.equal(estado.dados, 1); assert.equal(estado.mensagens.length, 1); assert.equal(estado.avisos.length, 1);
});

test('C34.2: mudar para rolar durante o await recusa repetida; a fila libera a tentativa seguinte', async t => {
  const { ator, estado } = ambiente(t, { modo: 'permitir', tem: [PERNA], fila: [8, 6] });
  estado.aoRolar = () => { estado.modo = 'rolar'; estado.aoRolar = null; };
  assert.equal(await lesaoCritica(ator), null);
  assert.equal(ator.items.length, 1); assert.equal(estado.mensagens.length, 0);
  assert.equal(estado.avisos.length, 1); assert.match(estado.avisos[0], /Role novamente/);
  const seguinte = await lesaoCritica(ator);
  assert.equal(seguinte.id, BRACO); assert.equal(ator.items.length, 2); assert.equal(estado.dados, 2);
});

test('C34.2: criação recusada não anuncia nem avisa repetida aceita; uma nova chamada funciona', async t => {
  const { ator, estado } = ambiente(t, { modo: 'avisar', tem: [PERNA], fila: [8, 8] });
  estado.aoCriar = () => [];
  assert.equal(await lesaoCritica(ator), null);
  assert.equal(ator.items.length, 1); assert.equal(estado.mensagens.length, 0);
  assert.deepEqual(estado.avisos, ['Não consegui acrescentar Perna quebrada à ficha de Ferido.']);
  estado.aoCriar = null;
  assert.ok((await lesaoCritica(ator)).item); assert.equal(ator.items.length, 2);
  assert.equal(estado.avisos.length, 2); assert.equal(estado.mensagens.length, 1);
});

test('C34.2: Monowire aceita repetida em Avisar, aplica uma só vez por cartão e avisa apenas na escolha', async t => {
  const { ator, estado } = ambiente(t, { modo: 'avisar', tem: [PERNA], fila: [8, 6] });
  const opcoes = await escolhaDeLesao(ator);
  assert.deepEqual(opcoes.map(p => p.id), [PERNA, BRACO]); assert.equal(ator.items.length, 1);
  assert.equal(estado.avisos.length, 0);
  const cartao = estado.mensagens[0];
  const resultados = await Promise.all([escolherLesao(cartao, PERNA), escolherLesao(cartao, PERNA)]);
  assert.equal(resultados.filter(r => r?.item).length, 1); assert.equal(resultados.filter(r => r === null).length, 1);
  assert.equal(ator.items.length, 2); assert.equal(estado.avisos.length, 1); assert.equal(estado.mensagens.length, 2);
  assert.equal(cartao.getFlag('cpr-fieldbook', 'escolhaDeLesao').escolhida, 'Perna quebrada');
  assert.equal(await escolherLesao(cartao, PERNA), null);
});

test('C34.2: Monowire relê a opção na escolha e conserva o cartão disponível após recusa', async t => {
  const { ator, estado } = ambiente(t, { modo: 'permitir', tem: [PERNA], fila: [8, 6] });
  await escolhaDeLesao(ator);
  const cartao = estado.mensagens[0];
  estado.modo = 'rolar';
  assert.equal(await escolherLesao(cartao, PERNA), null); assert.equal(ator.items.length, 1);
  assert.equal(cartao.getFlag('cpr-fieldbook', 'escolhaDeLesao').escolhida, '');
  const feita = await escolherLesao(cartao, BRACO);
  assert.ok(feita?.item, 'a recusa deve liberar a escolha de outra lesão no mesmo cartão');
  assert.equal(feita.id, BRACO); assert.ok(feita.item); assert.equal(ator.items.length, 2);
  assert.equal(cartao.getFlag('cpr-fieldbook', 'escolhaDeLesao').escolhida, 'Braço quebrado');
});
