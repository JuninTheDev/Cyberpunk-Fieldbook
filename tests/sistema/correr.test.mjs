// C41: wiki combat.html, p. 168–169/189, e CORE 0.92.4 walk/run. Sem alterar o orçamento de ações ou o token.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { SISTEMA, STATUS_AGARRAO } from '../../foundry-sistema/scripts/config.mjs';
import { corridaPorEstado, movimentoPorEstado } from '../../foundry-sistema/scripts/regras-estados.mjs';
import * as estados from '../../foundry-sistema/scripts/estados.mjs';

test('C41 regra: Correr é uma Ação de Movimento extra; metros e total conferem com walk/run reais do CORE', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes("['Correr', 'Uma Ação de Movimento extra (só se já usou a Ação de Movimento no turno).']"));
  assert.ok(wiki.includes('MOVE × 2 m por Ação de Movimento.'));
  assert.ok(wiki.includes('ele não usa mais Ações de Movimento.'));
  const core = fs.readFileSync(new URL('../../cyberpunk-red-core/modules/actor/cpr-actor.js', import.meta.url), 'utf8');
  const trecho = core.match(/derivedStats\.walk\.value = [^;]+;\s+derivedStats\.run\.value = [^;]+;/)[0];
  const calcular = vm.runInNewContext('(cprData, derivedStats) => {' + trecho + '}');
  for (const move of [6, 0, 1, 2, 6.5]) {
    const referencia = { walk: {}, run: {} };
    calcular({ stats: { move: { value: move } } }, referencia);
    assert.deepEqual(corridaPorEstado(new Set(), move), { metros: move * 2, total: move * 4, acoes: 1, bloqueio: null });
    assert.equal(corridaPorEstado(new Set(), move).metros, referencia.walk.value);
    assert.equal(corridaPorEstado(new Set(), move).total, referencia.run.value);
  }
  assert.deepEqual(corridaPorEstado(new Set(), 6), { metros: 12, total: 24, acoes: 1, bloqueio: null });
});

test('C41 regra: caído, agarrado e dirigindo impedem correr, nesta prioridade, sem modificar estados nem o movimento anterior', () => {
  const caido = 'Está caído: levante-se antes de correr.';
  const agarrado = 'Está agarrado: não pode usar Ação de Movimento.';
  const dirigindo = 'Quem dirige não usa Ações de Movimento.';
  for (const [lista, opcoes, bloqueio] of [
    [['prone'], {}, caido], [[STATUS_AGARRAO.agarrado], {}, agarrado], [[], { dirigindo: true }, dirigindo],
    [['prone', STATUS_AGARRAO.agarrado], { dirigindo: true }, caido], [[STATUS_AGARRAO.agarrado], { dirigindo: true }, agarrado],
    [['prone'], { dirigindo: true }, caido]
  ]) {
    const statuses = new Set(lista), antes = [...statuses];
    assert.deepEqual(corridaPorEstado(statuses, 6, opcoes), { metros: 0, total: 0, acoes: 1, bloqueio });
    assert.deepEqual([...statuses], antes);
  }
  for (const status of [STATUS_AGARRAO.agarrando, 'blind', 'deaf']) assert.deepEqual(corridaPorEstado(new Set([status]), 5), { metros: 10, total: 20, acoes: 1, bloqueio: null });
  assert.deepEqual(movimentoPorEstado(new Set(), 6), { caido: false, metros: 12, acoesParaLevantar: 0 });
  assert.deepEqual(movimentoPorEstado(new Set(['prone']), 6), { caido: true, metros: 0, acoesParaLevantar: 1 });
});

const escapar = valor => String(valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fixture() {
  const ator = {
    id: 'v', uuid: 'Actor.v', name: 'V <em>corredor</em>', type: 'personagem', isOwner: true, statuses: new Set(), veiculoAtivo: null,
    _source: { system: { atributos: { move: { valor: 9 } } } },
    system: { atributos: { move: { valor: 6 } }, dirigindo: false, hp: { value: 30, max: 30 }, sorte: { value: 5 } },
    effects: [{ id: 'efeito', disabled: false }]
  };
  for (const metodo of ['update', 'updateSource', 'setFlag', 'unsetFlag', 'toggleStatusEffect']) ator[metodo] = () => assert.fail('Correr não deve escrever no ator: ' + metodo);
  return ator;
}

async function ambiente(tarefa) {
  const nomes = ['foundry', 'game', 'ui', 'ChatMessage', 'fromUuidSync'];
  const anteriores = Object.fromEntries(nomes.map(nome => [nome, globalThis[nome]]));
  const ator = fixture();
  const env = { ator, presente: ator, dialogos: [], pedidos: [], mensagens: [], avisos: [], confirmar: async () => true, criar: async dados => ({ id: 'chat', ...dados }) };
  globalThis.game = env.game = { combat: null, user: { isGM: false }, users: { activeGM: null } };
  globalThis.fromUuidSync = uuid => uuid === ator.uuid ? env.presente : null;
  globalThis.ui = { notifications: { warn: texto => env.avisos.push(texto) } };
  globalThis.foundry = { utils: { escapeHTML: escapar }, applications: { api: { DialogV2: { confirm: async dados => { env.dialogos.push(dados); return env.confirmar(dados); } } } } };
  globalThis.ChatMessage = { implementation: {
    getSpeaker: ({ actor }) => ({ actor: actor.id, ...(actor.token ? { token: actor.token.id } : {}) }),
    create: async dados => { env.pedidos.push(dados); const msg = await env.criar(dados); if (msg) env.mensagens.push(msg); return msg; }
  } };
  try { return await tarefa(env); } finally {
    for (const [nome, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor; }
  }
}
const flags = env => env.pedidos.at(-1)?.flags?.[SISTEMA]?.estado;
const numeros = resultado => resultado && ({ acoes: resultado.acoes, metros: resultado.metros, total: resultado.total });

test('C41 API: corridaDe usa MOVE preparado e só trata como motorista quem dirige um veículo ainda ativo', () => {
  assert.equal(typeof estados.corridaDe, 'function');
  const ator = fixture();
  assert.deepEqual(estados.corridaDe(ator), { metros: 12, total: 24, acoes: 1, bloqueio: null });
  ator.system.dirigindo = true;
  assert.equal(estados.corridaDe(ator).bloqueio, null);
  ator.veiculoAtivo = { id: 'carro' };
  assert.deepEqual(estados.corridaDe(ator), { metros: 0, total: 0, acoes: 1, bloqueio: 'Quem dirige não usa Ações de Movimento.' });
  ator.system.dirigindo = false;
  assert.equal(estados.corridaDe(ator).metros, 12);
  ator.system.atributos.move.valor = 2;
  assert.equal(estados.corridaDe(ator).metros, 4);
  assert.equal(ator._source.system.atributos.move.valor, 9);
});

test('C41 API: confirmado à mão cria cartão sem mestre, rolagem, gasto de recursos ou alteração do ator', async () => ambiente(async env => {
  const { ator } = env, antes = structuredClone({ sistema: ator.system, fonte: ator._source, efeitos: ator.effects, estados: [...ator.statuses] });
  assert.deepEqual(numeros(await estados.correr(ator, { confirmado: true })), { acoes: 1, metros: 12, total: 24 });
  assert.equal(env.dialogos.length, 0);
  assert.equal(env.mensagens.length, 1);
  assert.deepEqual(flags(env), { acao: 'correr', acoes: 1, metros: 12, total: 24 });
  assert.deepEqual(env.pedidos[0].speaker, { actor: 'v' });
  assert.match(env.pedidos[0].content, /&lt;em&gt;corredor&lt;\/em&gt;/);
  assert.equal('rolls' in env.pedidos[0], false);
  assert.deepEqual({ sistema: ator.system, fonte: ator._source, efeitos: ator.effects, estados: [...ator.statuses] }, antes);
}));

test('C41 API: confirmação padrão lembra Movimento já usado e custo da Ação; cancelar, fechar ou negar não anuncia', async () => ambiente(async env => {
  for (const resposta of [false, null, undefined]) {
    env.confirmar = async () => resposta;
    assert.equal(await estados.correr(env.ator), null);
  }
  assert.equal(env.pedidos.length, 0);
  assert.equal(env.dialogos.length, 3);
  for (const d of env.dialogos) {
    assert.equal(d.rejectClose, false);
    const texto = d.content.replace(/<[^>]*>/g, ' ');
    assert.match(texto, /já\s+(usou|gastou).*Ação de Movimento/is);
    assert.match(texto, /(vai|usar|usa|gasta|gastará).*Ação/is);
  }
  assert.equal(await estados.correr(env.ator, { confirmado: false }), null);
  assert.equal(env.dialogos.length, 3);
  env.confirmar = async () => true;
  assert.deepEqual(numeros(await estados.correr(env.ator)), { acoes: 1, metros: 12, total: 24 });
}));

test('C41 API: valores verdadeiros que não são a confirmação booleana não autorizam Correr', async () => ambiente(async env => {
  for (const resposta of ['true', 1, {}, []]) {
    assert.equal(await estados.correr(env.ator, { confirmado: resposta }), null);
    env.confirmar = async () => resposta;
    assert.equal(await estados.correr(env.ator), null);
  }
  assert.equal(env.pedidos.length, 0);
  assert.equal(env.dialogos.length, 4);
}));

test('C41 API: recusa não dono, tipo alheio e identidade ausente ou trocada antes de abrir a pergunta', async () => ambiente(async env => {
  const { ator } = env;
  assert.equal(await estados.correr(null), null);
  ator.isOwner = false;
  assert.equal(await estados.correr(ator), null);
  ator.isOwner = true;
  for (const type of ['conteiner', 'blackice', 'demonio', 'outro']) { ator.type = type; assert.equal(await estados.correr(ator), null); }
  ator.type = 'capanga';
  env.presente = null;
  assert.equal(await estados.correr(ator), null);
  env.presente = { ...ator };
  assert.equal(await estados.correr(ator), null);
  assert.equal(env.dialogos.length, 0);
  assert.equal(env.pedidos.length, 0);
  env.presente = ator;
  ator.uuid = 'Scene.c.Token.t.Actor.v'; ator.token = { id: 't' };
  assert.deepEqual(numeros(await estados.correr(ator, { confirmado: true })), { acoes: 1, metros: 12, total: 24 });
  assert.deepEqual(env.pedidos[0].speaker, { actor: 'v', token: 't' });
}));

test('C41 API: estados impeditivos e direção são recusados com aviso antes da pergunta', async () => ambiente(async env => {
  for (const estado of ['prone', STATUS_AGARRAO.agarrado]) {
    env.ator.statuses.add(estado);
    assert.equal(await estados.correr(env.ator), null);
    env.ator.statuses.delete(estado);
  }
  env.ator.system.dirigindo = true; env.ator.veiculoAtivo = { id: 'carro' };
  assert.equal(await estados.correr(env.ator), null);
  assert.equal(env.avisos.length, 3);
  assert.equal(env.dialogos.length, 0);
  assert.equal(env.pedidos.length, 0);
}));

test('C41 API: após confirmar, relê dono e identidade e não usa a permissão de antes da espera', async () => ambiente(async env => {
  for (const revogar of [() => { env.ator.isOwner = false; }, () => { env.presente = null; }, () => { env.presente = { ...env.ator }; }, () => { env.ator.type = 'conteiner'; }]) {
    env.ator.isOwner = true; env.ator.type = 'personagem'; env.presente = env.ator;
    env.confirmar = async () => { revogar(); return true; };
    assert.equal(await estados.correr(env.ator), null);
  }
  assert.equal(env.pedidos.length, 0);
}));

test('C41 API: MOVE alterado na espera vai para o resultado e cartão; impedimento ou veículo que surgiu cancela com aviso', async () => ambiente(async env => {
  env.confirmar = async () => { env.ator.system.atributos.move.valor = 4; return true; };
  assert.deepEqual(numeros(await estados.correr(env.ator)), { acoes: 1, metros: 8, total: 16 });
  assert.deepEqual(flags(env), { acao: 'correr', acoes: 1, metros: 8, total: 16 });
  for (const mudar of [() => env.ator.statuses.add('prone'), () => env.ator.statuses.add(STATUS_AGARRAO.agarrado), () => { env.ator.system.dirigindo = true; env.ator.veiculoAtivo = { id: 'carro' }; }]) {
    env.ator.statuses.clear(); env.ator.system.dirigindo = false; env.ator.veiculoAtivo = null;
    env.confirmar = async () => { mudar(); return true; };
    assert.equal(await estados.correr(env.ator), null);
  }
  assert.equal(env.avisos.length, 3);
  assert.equal(env.pedidos.length, 1);
}));

test('C41 API: começar, acabar ou mudar combate, rodada ou turno durante a confirmação cancela com aviso', async () => ambiente(async env => {
  const combate = { id: 'combate', round: 2, turn: 0, combatant: { id: 'ativo' } };
  const casos = [[null, combate], [combate, null], [combate, { ...combate, id: 'outro' }], [combate, { ...combate, round: 3 }], [combate, { ...combate, turn: 1 }],
    [combate, { ...combate, combatant: { id: 'outro' } }], [combate, { ...combate, combatant: null }]];
  for (const [antes, depois] of casos) {
    env.game.combat = antes;
    env.confirmar = async () => { env.game.combat = depois; return true; };
    assert.equal(await estados.correr(env.ator), null);
  }
  assert.equal(env.avisos.length, casos.length);
  assert.equal(env.pedidos.length, 0);
  env.game.combat = { ...combate };
  env.confirmar = async () => { env.game.combat = { ...combate }; return true; };
  assert.deepEqual(numeros(await estados.correr(env.ator)), { acoes: 1, metros: 12, total: 24 });
}));

test('C41 API: dois cliques simultâneos aguardam uma confirmação; cancelar libera a próxima tentativa', async () => ambiente(async env => {
  let responder;
  env.confirmar = () => new Promise(resolve => { responder = resolve; });
  const primeira = estados.correr(env.ator);
  for (let i = 0; i < 10 && !responder; i++) await Promise.resolve();
  assert.equal(typeof responder, 'function');
  assert.equal(await estados.correr(env.ator, { confirmado: true }), null);
  assert.equal(env.dialogos.length, 1);
  assert.equal(env.pedidos.length, 0);
  responder(false);
  assert.equal(await primeira, null);
  env.confirmar = async () => true;
  assert.deepEqual(numeros(await estados.correr(env.ator)), { acoes: 1, metros: 12, total: 24 });
}));

test('C41 API: erro da janela, erro ou recusa do chat liberam a trava; sem cartão gravado o resultado é null', async () => ambiente(async env => {
  env.confirmar = async () => { throw new Error('falha da janela'); };
  await estados.correr(env.ator).catch(() => null);
  env.confirmar = async () => true;
  env.criar = async () => { throw new Error('falha do chat'); };
  await estados.correr(env.ator).catch(() => null);
  env.criar = async () => null;
  assert.equal(await estados.correr(env.ator), null);
  env.criar = async dados => ({ id: 'chat', ...dados });
  assert.deepEqual(numeros(await estados.correr(env.ator)), { acoes: 1, metros: 12, total: 24 });
  assert.equal(env.mensagens.length, 1);
}));
