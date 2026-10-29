// CORE 0.92.4, preventDuplicateCriticalInjuries e _drawCriticalInjuryTable; wiki p. 187 mantém reroll por padrão.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';
import { TABELAS_LESAO } from '../../foundry-sistema/scripts/gerado.mjs';
import { modoDeLesoesRepetidas, sortearLesao } from '../../foundry-sistema/scripts/regras-lesoes.mjs';
import { escolhaDeLesao, escolherLesao, lesaoCritica } from '../../foundry-sistema/scripts/lesoes.mjs';

const S = 'cpr-fieldbook', PERNA = 'core_critical-injuries-body:broken-leg';
const BRACO = 'core_critical-injuries-body:broken-arm';
const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url))).itens;

test('C34.2: modos do CORE; mundo preserva reroll da wiki e exclusão é client ligada por padrão', () => {
  const antes = globalThis.game, registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  try {
    registrarConfiguracoes();
    const lesoes = registros.get('lesoesRepetidas'), excluir = registros.get('confirmarExclusaoItem');
    assert.equal(lesoes.scope, 'world');assert.equal(lesoes.type, String);assert.equal(lesoes.default, 'reroll');assert.equal(lesoes.config, true);
    assert.deepEqual(Object.keys(lesoes.choices), ['off', 'warn', 'reroll']);
    assert.equal(excluir.scope, 'client');assert.equal(excluir.type, Boolean);assert.equal(excluir.default, true);assert.equal(excluir.config, true);
    for (const modo of ['off', 'warn', 'reroll']) assert.equal(modoDeLesoesRepetidas(modo), modo);
    for (const modo of [undefined, null, '', 'outro', '__proto__']) assert.equal(modoDeLesoesRepetidas(modo), 'reroll');
  } finally { if (antes === undefined) delete globalThis.game;else globalThis.game = antes; }
});

test('C34.2: off/warn aceitam a primeira duplicata e continuam rolando com a tabela cheia', async () => {
  const todas = TABELAS_LESAO.corpo.map(f => f[2]);
  for (const repetidas of ['off', 'warn']) {
    let n = 0;const roll = { total: 8 };
    assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: todas, repetidas, rolar: async () => { n++;return roll; } }), { id: PERNA, roll });
    assert.equal(n, 1);
  }
});

test('C34.2: excluir continua absoluto em todos os modos; reroll e valor inválido evitam a existente', async () => {
  for (const repetidas of ['off', 'warn', 'reroll', 'inválido']) {
    const fila = [{ total: 8 }, { total: 6 }];
    const r = await sortearLesao({ faixas: TABELAS_LESAO.corpo, tem: [PERNA], excluir: [PERNA], repetidas, rolar: async () => fila.shift() });
    assert.equal(r.id, BRACO);assert.equal(fila.length, 0);
    let n = 0;
    assert.deepEqual(await sortearLesao({ faixas: TABELAS_LESAO.corpo, excluir: TABELAS_LESAO.corpo.map(f => f[2]), repetidas, rolar: async () => { n++; } }), { motivo: 'esgotada' });
    assert.equal(n, 0);
  }
});

async function comAmbiente(modo, fn) {
  const chaves = ['game', 'foundry', 'fetch', 'Roll', 'ui', 'ChatMessage', 'fromUuid'];
  const anteriores = new Map(chaves.map(c => [c, globalThis[c]]));
  const avisos = [], mensagens = [], itens = [], fila = [];
  let politica = modo, aoRolar, recusada = false, n = 0, rolagens = 0;
  const ator = { name: 'Ferido', uuid: 'Actor.C34', type: 'personagem', isOwner: true, items: itens, system: { hp: { value: 35 } },
    async createEmbeddedDocuments(tipo, dados) {
      assert.equal(tipo, 'Item');if (recusada) return [];
      const criados = dados.map(d => ({ ...structuredClone(d), id: 'lesao' + ++n, getFlag(escopo, chave) { return this.flags?.[escopo]?.[chave]; } }));
      itens.push(...criados);return criados;
    } };
  globalThis.game = { user: { isGM: true }, settings: { get: () => politica } };
  globalThis.fetch = async () => ({ json: async () => ({ itens: catalogo }) });
  globalThis.foundry = { utils: { deepClone: structuredClone }, applications: { handlebars: { renderTemplate: async () => 'Cartão' } } };
  globalThis.ui = { notifications: { warn: aviso => avisos.push(aviso) } };
  globalThis.Roll = class {
    constructor(formula) { assert.equal(formula, '2d6');this.total = fila.shift() ?? 8;this.dice = [{ faces: 6, total: this.total, results: [{ result: 4 }, { result: this.total - 4 }] }]; }
    async evaluate() { rolagens++;await aoRolar?.();return this; }
  };
  globalThis.ChatMessage = { implementation: { getSpeaker: () => ({}), create: async dados => {
    const mensagem = { ...dados, getFlag(escopo, chave) { return this.flags?.[escopo]?.[chave]; }, async update(mudancas) {
      this.flags[S].escolhaDeLesao.escolhida = mudancas[`flags.${S}.escolhaDeLesao.escolhida`];
    } };mensagens.push(mensagem);return mensagem;
  } } };
  globalThis.fromUuid = async () => ator;
  try {
    return await fn({ ator, avisos, mensagens, fila, itens, rolagens: () => rolagens,
      modo: valor => { politica = valor; }, aoRolar: fn => { aoRolar = fn; }, recusar: valor => { recusada = valor; },
      adicionar: id => ator.createEmbeddedDocuments('Item', [catalogo[id]]) });
  } finally { for (const [c, valor] of anteriores) { if (valor === undefined) delete globalThis[c];else globalThis[c] = valor; } }
}

test('C34.2: off cria outra cópia sem aviso; warn cria e avisa; reroll escolhe outra', async () => {
  for (const modo of ['off', 'warn', 'reroll']) await comAmbiente(modo, async a => {
    await a.adicionar(PERNA);a.fila.push(8, 6);
    const r = await lesaoCritica(a.ator);
    assert.equal(r.id, modo === 'reroll' ? BRACO : PERNA);assert.equal(a.itens.length, 2);assert.ok(r.item);
    assert.equal(a.avisos.length, modo === 'warn' ? 1 : 0);
    if (modo === 'warn') assert.equal(a.avisos[0], 'Ferido já tem a lesão Perna quebrada.');
    assert.equal(a.rolagens(), modo === 'reroll' ? 2 : 1);assert.equal(a.mensagens.length, 1);assert.equal(a.ator.system.hp.value, 35);
  });
});

test('C34.2: lesão certa continua idempotente e anúncio não cria item nos três modos', async () => {
  for (const modo of ['off', 'warn', 'reroll']) await comAmbiente(modo, async a => {
    await a.adicionar(PERNA);
    const certa = await lesaoCritica(a.ator, { id: PERNA, falar: false });
    assert.equal(certa.item, null);assert.equal(a.itens.length, 1);assert.equal(a.rolagens(), 0);assert.equal(a.avisos.length, 0);
    a.fila.push(8, 6);const anuncio = await lesaoCritica(a.ator, { naFicha: false });
    assert.equal(anuncio.item, null);assert.equal(a.itens.length, 1);assert.equal(a.mensagens.length, 1);
    assert.equal(a.avisos.length, modo === 'warn' ? 1 : 0);
  });
});

test('C34.2: colisão durante a rolagem é permitida em off/warn e recusada em reroll', async () => {
  for (const modo of ['off', 'warn', 'reroll']) await comAmbiente(modo, async a => {
    a.aoRolar(() => a.adicionar(PERNA));const r = await lesaoCritica(a.ator, { falar: false });
    assert.equal(a.itens.length, modo === 'reroll' ? 1 : 2);
    assert.equal(r === null, modo === 'reroll');assert.equal(a.avisos.length, modo === 'off' ? 0 : 1);
  });
});

test('C34.2: relê a opção após o await e não anuncia criação recusada', async () => {
  await comAmbiente('off', async a => {
    await a.adicionar(PERNA);a.aoRolar(() => a.modo('reroll'));
    assert.equal(await lesaoCritica(a.ator), null);assert.equal(a.itens.length, 1);assert.equal(a.mensagens.length, 0);
  });
  await comAmbiente('warn', async a => {
    await a.adicionar(PERNA);a.recusar(true);
    assert.equal(await lesaoCritica(a.ator), null);assert.equal(a.itens.length, 1);assert.equal(a.mensagens.length, 0);
    assert.deepEqual(a.avisos, ['Não consegui acrescentar Perna quebrada à ficha de Ferido.']);
  });
});

test('C34.2: Monowire permite duplicata off/warn na escolha, com prévias silenciosas; reroll recusa a colisão', async () => {
  for (const modo of ['off', 'warn']) await comAmbiente(modo, async a => {
    await a.adicionar(PERNA);a.fila.push(8, 8);await escolhaDeLesao(a.ator);
    assert.equal(a.avisos.length, 0);assert.equal(a.itens.length, 1);
    const cartao = a.mensagens[0];assert.equal(cartao.flags[S].escolhaDeLesao.opcoes.length, 1);
    const feita = await escolherLesao(cartao, PERNA);assert.ok(feita.item);assert.equal(a.itens.length, 2);
    assert.equal(cartao.flags[S].escolhaDeLesao.escolhida, 'Perna quebrada');assert.equal(a.avisos.length, modo === 'warn' ? 1 : 0);
  });
  await comAmbiente('reroll', async a => {
    a.fila.push(8, 6);await escolhaDeLesao(a.ator);await a.adicionar(PERNA);
    const cartao = a.mensagens[0];assert.equal(await escolherLesao(cartao, PERNA), null);
    assert.equal(a.itens.length, 1);assert.equal(cartao.flags[S].escolhaDeLesao.escolhida, '');
  });
});
