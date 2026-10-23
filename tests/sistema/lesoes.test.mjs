// Wiki, system-rules.js:28–54 e 549: corpo/cabeça em 2d6, sem uma lesão que o alvo já tem.
// CORE 0.92.4, modules/actor/sheet/cpr-actor-sheet.js:1191–1257: esgotamento e limite do reroll.
import assert from 'node:assert/strict';
import test from 'node:test';
import { TABELAS_LESAO } from '../../foundry-sistema/scripts/gerado.mjs';
import { lesoesDisponiveis, sortearLesao } from '../../foundry-sistema/scripts/regras-lesoes.mjs';
import { lesaoCritica } from '../../foundry-sistema/scripts/lesoes.mjs';

const PERNA = 'core_critical-injuries-body:broken-leg';
const MUSCULO = 'core_critical-injuries-body:torn-muscle';
const OLHO = 'core_critical-injuries-head:damaged-eye';

test('C19: lesões disponíveis pertencem à tabela escolhida; as existentes e as excluídas não entram', () => {
  const tem = new Set([PERNA]);
  const excluir = [MUSCULO];
  const corpo = lesoesDisponiveis(TABELAS_LESAO.corpo, tem, excluir);
  const cabeca = lesoesDisponiveis(TABELAS_LESAO.cabeca, [], [OLHO]);
  assert.equal(corpo.length, 9);
  assert.ok(corpo.includes('core_critical-injuries-body:broken-arm'));
  assert.ok(!corpo.includes(PERNA) && !corpo.includes(MUSCULO) && !corpo.includes(OLHO));
  assert.equal(cabeca.length, 10);
  assert.ok(cabeca.includes('core_critical-injuries-head:brain-injury'));
  assert.ok(!cabeca.includes(OLHO) && !cabeca.includes(PERNA));
  assert.deepEqual([...tem], [PERNA]);
  assert.deepEqual(excluir, [MUSCULO]);
});

test('C19: o 2d6 8 dá Perna quebrada no corpo; o 4 dá Olho danificado na cabeça', async () => {
  const oito = { total: 8 }, quatro = { total: 4 };
  assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, rolar: async () => oito }), { id: PERNA, roll: oito });
  assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.cabeca, rolar: async () => quatro }), { id: OLHO, roll: quatro });
});

test('C19: repete lesão existente, lesão excluída e resultado fora da tabela, conservando a rolagem que valeu', async () => {
  const fila = [{ total: 8 }, { total: 9 }, { total: 1 }, { total: 6 }];
  const ultima = fila.at(-1);
  const feito = await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: [PERNA], excluir: [MUSCULO], rolar: async () => fila.shift() });
  assert.deepEqual(feito, { id: 'core_critical-injuries-body:broken-arm', roll: ultima });
  assert.equal(fila.length, 0);
});

test('C19: tabela esgotada não rola; exclusões também podem esgotar a tabela', async () => {
  let chamadas = 0;
  const rolar = async () => { chamadas++; return { total: 8 }; };
  const todas = lesoesDisponiveis(TABELAS_LESAO.corpo);
  assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: todas, rolar }), { motivo: 'esgotada' });
  assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: todas.slice(1), excluir: todas.slice(0, 1), rolar }), { motivo: 'esgotada' });
  assert.deepEqual(await sortearLesao({ faixas: [], rolar }), { motivo: 'esgotada' });
  assert.equal(chamadas, 0);
});

test('C19: mil tentativas repetidas param sem escolher lesão existente, embora a tabela tenha outras', async () => {
  let chamadas = 0;
  const feito = await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: [PERNA], rolar: async () => { chamadas++; return { total: 8 }; } });
  assert.equal(chamadas, 1000);
  assert.deepEqual(feito, { motivo: 'limite' });
});

test('C19: uma lesão disponível na milésima tentativa ainda é aceita', async () => {
  let chamadas = 0;
  const feito = await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: [PERNA], rolar: async () => ({ total: ++chamadas === 1000 ? 6 : 8 }) });
  assert.equal(chamadas, 1000);
  assert.equal(feito.id, 'core_critical-injuries-body:broken-arm');
  assert.equal(feito.roll.total, 6);
});

test('C19: a API recusa observador, contêiner, arquitetura e ator ausente antes de ler itens ou rolar', async () => {
  for (const ator of [null, { type: 'personagem', isOwner: false }, { type: 'conteiner', isOwner: true }, { type: 'arquitetura', isOwner: true }]) {
    assert.equal(await lesaoCritica(ator, { id: PERNA, falar: false }), null);
  }
});

test('C19: duas chamadas simultâneas leem a criação anterior, sem duplicar id forçado nem alterar HP', async () => {
  const globais = { fetch: globalThis.fetch, foundry: globalThis.foundry };
  const itens = [];
  const dados = { name: 'Perna quebrada', type: 'lesao', system: {}, flags: { 'cpr-fieldbook': { catalogo: PERNA } } };
  globalThis.fetch = async () => ({ json: async () => ({ itens: { [PERNA]: dados } }) });
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  const ator = {
    name: 'Ferido', type: 'capanga', isOwner: true, system: { hp: { value: 30 } },
    items: { filter: teste => itens.filter(teste) },
    async createEmbeddedDocuments(tipo, novos) {
      assert.equal(tipo, 'Item');
      // A criação assíncrona não aparece na coleção até terminar: reler antes do await sozinho não basta.
      await Promise.resolve();
      const criados = novos.map(novo => ({ ...novo, getFlag: (escopo, chave) => novo.flags[escopo]?.[chave] }));
      itens.push(...criados);
      return criados;
    }
  };
  try {
    const [primeira, segunda] = await Promise.all([
      lesaoCritica(ator, { id: PERNA, falar: false }),
      lesaoCritica(ator, { id: PERNA, falar: false })
    ]);
    assert.equal(itens.length, 1);
    assert.equal(primeira.item, itens[0]);
    assert.equal(segunda.id, PERNA);
    assert.equal(segunda.item, null);
    assert.equal(segunda.roll, null);
    assert.equal(ator.system.hp.value, 30);
  } finally {
    globalThis.fetch = globais.fetch;
    if (globais.foundry === undefined) delete globalThis.foundry;
    else globalThis.foundry = globais.foundry;
  }
});

test('C19: uma lesão recebida durante o sorteio não cria duplicata nem anuncia resultado falso', async () => {
  const globais = { fetch: globalThis.fetch, foundry: globalThis.foundry, Roll: globalThis.Roll, ui: globalThis.ui, game: globalThis.game };
  const itens = [], avisos = [];
  globalThis.game = { settings: { get: () => 'rolar' } };
  const dados = { name: 'Perna quebrada', type: 'lesao', system: {}, flags: { 'cpr-fieldbook': { catalogo: PERNA } } };
  globalThis.fetch = async () => ({ json: async () => ({ itens: { [PERNA]: dados } }) });
  globalThis.foundry = { utils: { deepClone: structuredClone } };
  globalThis.ui = { notifications: { warn: aviso => avisos.push(aviso) } };
  globalThis.Roll = class {
    constructor(formula) { assert.equal(formula, '2d6'); this.total = 8; }
    async evaluate() {
      // Simula outro cliente criando a mesma lesão enquanto os dados do primeiro ainda são avaliados.
      itens.push({ type: 'lesao', getFlag: () => PERNA });
      return this;
    }
  };
  const ator = { name: 'Ferido', type: 'personagem', isOwner: true, items: { filter: teste => itens.filter(teste) },
    createEmbeddedDocuments: () => assert.fail('não pode criar uma lesão que acabou de chegar') };
  try {
    assert.equal(await lesaoCritica(ator, { falar: false }), null);
    assert.equal(itens.length, 1);
    assert.deepEqual(avisos, ['Ferido passou a ter Perna quebrada durante a rolagem. Role novamente.']);
    // A recusa libera a fila e não muda o comportamento do id forçado já presente.
    const repetida = await lesaoCritica(ator, { id: PERNA, falar: false });
    assert.equal(repetida.id, PERNA);
    assert.equal(repetida.item, null);
  } finally {
    globalThis.fetch = globais.fetch;
    for (const chave of ['foundry', 'Roll', 'ui', 'game']) {
      if (globais[chave] === undefined) delete globalThis[chave];
      else globalThis[chave] = globais[chave];
    }
  }
});
