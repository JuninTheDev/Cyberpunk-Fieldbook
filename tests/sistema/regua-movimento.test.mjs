// C44: a régua com Andar e Correr. O CORE 0.92.4 (drag-ruler.js, as faixas walk e run com as cores; cpr-actor.js, o
// MOVE × 2 e o MOVE × 4) e a wiki (system-rules.js:499, :501 e :514), com as contas do Movimento e de Correr do sistema.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { STATUS_AGARRAO } from '../../foundry-sistema/scripts/config.mjs';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';
import { corridaPorEstado, movimentoPorEstado } from '../../foundry-sistema/scripts/regras-estados.mjs';
import { CORES_DA_REGUA, faixaDoGasto, faixasDaRegua, ROTULOS_DA_REGUA } from '../../foundry-sistema/scripts/regras-regua.mjs';
import { faixasDoToken, registrarReguaMovimento } from '../../foundry-sistema/scripts/regua-movimento.mjs';

const ler = relativo => fs.readFileSync(new URL('../../' + relativo, import.meta.url), 'utf8');
const faixasPorEstado = (lista, move, opcoes) => faixasDaRegua(movimentoPorEstado(new Set(lista), move), corridaPorEstado(new Set(lista), move, opcoes));

test('C44 regra: as cores e as faixas são as do drag-ruler.js do CORE (walk até derivedStats.walk, run até derivedStats.run)', () => {
  const regua = ler('cyberpunk-red-core/modules/hooks/external/drag-ruler.js');
  const cor = id => Number(regua.match(new RegExp(`id: "${id}", default: (0x[0-9a-f]+)`, 'i'))[1]);
  assert.equal(CORES_DA_REGUA.andar, cor('walk'));
  assert.equal(CORES_DA_REGUA.correr, cor('run'));
  assert.equal(CORES_DA_REGUA.andar, 0x00ff00);
  assert.equal(CORES_DA_REGUA.correr, 0xff8000);
  assert.ok(regua.includes('{ range: walkSpeed, color: "walk" }') && regua.includes('{ range: runSpeed, color: "run" }'));
  assert.ok(regua.includes('token.actor.system.derivedStats.walk.value') && regua.includes('token.actor.system.derivedStats.run.value'));
  // A terceira cor (longe demais) é outra, diferente das duas.
  assert.equal(new Set(Object.values(CORES_DA_REGUA)).size, 3);
  assert.deepEqual(ROTULOS_DA_REGUA, { andar: 'Andar', correr: 'Correr' });
  const wiki = ler('system-rules.js');
  assert.ok(wiki.includes("['Ação de Movimento', 'Anda até MOVE × 2 m (ou MOVE quadrados no grid).']"));
  assert.ok(wiki.includes("['Correr', 'Uma Ação de Movimento extra (só se já usou a Ação de Movimento no turno).']"));
  // O walk e o run do CORE, rodando o próprio trecho do cpr-actor.js, contra as faixas pelo MOVE preparado.
  const core = ler('cyberpunk-red-core/modules/actor/cpr-actor.js');
  const trecho = core.match(/derivedStats\.walk\.value = [^;]+;\s+derivedStats\.run\.value = [^;]+;/)[0];
  const calcular = vm.runInNewContext('(cprData, derivedStats) => {' + trecho + '}');
  for (const move of [1, 2, 4, 5, 7, 10]) {
    const referencia = { walk: {}, run: {} };
    calcular({ stats: { move: { value: move } } }, referencia);
    assert.deepEqual(faixasPorEstado([], move), { andar: referencia.walk.value, correr: referencia.run.value });
  }
  assert.deepEqual(faixasPorEstado([], 4), { andar: 8, correr: 16 });
});

test('C44 regra: caído e agarrado não andam; quem dirige só tem Andar; agarrando, cego e surdo andam e correm', () => {
  assert.deepEqual(faixasPorEstado(['prone'], 6), { andar: 0, correr: 0 });
  assert.deepEqual(faixasPorEstado([STATUS_AGARRAO.agarrado], 6), { andar: 0, correr: 0 });
  assert.deepEqual(faixasPorEstado(['prone', STATUS_AGARRAO.agarrado], 6, { dirigindo: true }), { andar: 0, correr: 0 });
  assert.deepEqual(faixasPorEstado([], 6, { dirigindo: true }), { andar: 12, correr: 12 });
  for (const status of [STATUS_AGARRAO.agarrando, 'blind', 'deaf']) assert.deepEqual(faixasPorEstado([status], 5), { andar: 10, correr: 20 });
  assert.deepEqual(faixasDaRegua(null, null), { andar: 0, correr: 0 });
});

test('C44 regra: a faixa do gasto: até Andar, até Correr e além; o limite é da faixa; sem custo, nenhuma', () => {
  const faixas = { andar: 8, correr: 16 };
  const casos = [[0, 'andar'], [6, 'andar'], [8, 'andar'], [8.004, 'andar'], [8.01, 'correr'], [10, 'correr'], [16, 'correr'], [16.5, 'longe'], [18, 'longe'], [Infinity, 'longe']];
  for (const [gasto, faixa] of casos) assert.equal(faixaDoGasto(gasto, faixas), faixa, String(gasto));
  for (const gasto of [NaN, undefined, null, '8', -2]) assert.equal(faixaDoGasto(gasto, faixas), null, String(gasto));
  // Caído (nada): até o ponto de partida é longe demais. Quem dirige: Andar e o resto.
  for (const gasto of [0, 2, 20]) assert.equal(faixaDoGasto(gasto, { andar: 0, correr: 0 }), 'longe');
  assert.equal(faixaDoGasto(12, { andar: 12, correr: 12 }), 'andar');
  assert.equal(faixaDoGasto(14, { andar: 12, correr: 12 }), 'longe');
});

test('C44 configuração: "Andar e Correr na régua do token" é deste navegador e vem ligada', () => {
  const registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(`${sistema}.${chave}`, dados) } };
  try { registrarConfiguracoes(); } finally { delete globalThis.game; }
  const dados = registros.get('cpr-fieldbook.reguaAndarCorrer');
  assert.ok(dados, 'a configuração precisa existir');
  assert.equal(dados.type, Boolean);
  assert.equal(dados.default, true);
  assert.equal(dados.scope, 'client');
  assert.equal(dados.config, true);
  assert.equal(dados.name, 'Andar e Correr na régua do token');
});

// A TokenRuler do Foundry 14 (client/canvas/placeables/tokens/ruler.mjs), só com o que o sistema embrulha.
function ambiente({ ligada = true } = {}) {
  class TokenRuler {
    _shouldRenderWaypoint(waypoint) { return !waypoint.intermediate; }
    _getSegmentStyle(waypoint) { return waypoint.actionConfig?.visualize === false ? { width: 0 } : { width: 4, color: 'usuario', alpha: 1 }; }
    _getGridHighlightStyle(waypoint) { return waypoint.unreachable ? { alpha: 0 } : { color: 'usuario', alpha: 0.5 }; }
    _getWaypointLabelContext(waypoint) { return waypoint.previous ? { cost: { total: String(waypoint.measurement.cost), units: 'm' } } : undefined; }
  }
  globalThis.foundry = { canvas: { placeables: { tokens: { TokenRuler } } } };
  const env = { ligada, TokenRuler };
  globalThis.game = { settings: { get: (sistema, chave) => (sistema === 'cpr-fieldbook' && chave === 'reguaAndarCorrer' ? env.ligada : assert.fail(chave)) } };
  const ator = { type: 'personagem', statuses: new Set(), system: { atributos: { move: { valor: 4 } }, dirigindo: false }, veiculoAtivo: null };
  env.ator = ator;
  env.regua = Object.assign(Object.create(TokenRuler.prototype), { token: { actor: ator } });
  return env;
}
const limpar = () => { delete globalThis.foundry; delete globalThis.game; };
const ponto = (cost, extra = {}) => ({ measurement: { cost }, previous: {}, ...extra });

test('C44 régua: a linha, a grade e o rótulo pela faixa do gasto; a linha muda de cor no último ponto de cada faixa', () => {
  const env = ambiente();
  try {
    registrarReguaMovimento();
    registrarReguaMovimento();
    const { regua } = env;
    assert.deepEqual(faixasDoToken(regua.token), { andar: 8, correr: 16 });
    assert.deepEqual([6, 8, 10, 16, 18].map(c => regua._getSegmentStyle(ponto(c)).color), [0x00ff00, 0x00ff00, 0xff8000, 0xff8000, 0xff0000]);
    assert.deepEqual(regua._getSegmentStyle(ponto(10, { actionConfig: { visualize: false } })), { width: 0 });
    assert.deepEqual([0, 8, 12, 20].map(c => regua._getGridHighlightStyle(ponto(c)).color), [0x00ff00, 0x00ff00, 0xff8000, 0xff0000]);
    assert.equal(regua._getGridHighlightStyle(ponto(4)).alpha, 0.5);
    assert.deepEqual(regua._getGridHighlightStyle(ponto(4, { unreachable: true })), { alpha: 0 });
    // O rótulo: uma vez só, mesmo registrando duas vezes; além de Correr, só os metros.
    assert.equal(regua._getWaypointLabelContext(ponto(6), {}).cost.units, 'm · Andar');
    assert.equal(regua._getWaypointLabelContext(ponto(12), {}).cost.units, 'm · Correr');
    assert.equal(regua._getWaypointLabelContext(ponto(20), {}).cost.units, 'm');
    assert.equal(regua._getWaypointLabelContext({ measurement: { cost: 0 } }, {}), undefined);
    // O ponto intermediário: desenha o último de cada faixa (8 antes de 10; 16 antes de 18), não os outros.
    const intermediario = (c, proximo) => ({ intermediate: true, measurement: { cost: c }, next: { measurement: { cost: proximo } } });
    assert.deepEqual([[6, 8], [8, 10], [10, 12], [16, 18], [18, 20]].map(([c, p]) => regua._shouldRenderWaypoint(intermediario(c, p))), [false, true, false, true, false]);
    assert.equal(regua._shouldRenderWaypoint({ intermediate: false, measurement: { cost: 2 } }), true);
    assert.equal(regua._shouldRenderWaypoint({ intermediate: true, measurement: { cost: 8 } }), false);
    // Sem o custo (a régua montada sem o movimento planejado, como a do C26): como o Foundry.
    assert.equal(regua._getSegmentStyle(ponto(NaN)).color, 'usuario');
    assert.equal(regua._getWaypointLabelContext(ponto(NaN), {}).cost.units, 'm');
  } finally { limpar(); }
});

test('C44 régua: caído, só vermelho e sem rótulo; o MOVE preparado da ficha; desligada, o contêiner e o Black ICE ficam como o Foundry', () => {
  const env = ambiente();
  try {
    registrarReguaMovimento();
    const { regua, ator } = env;
    ator.statuses.add('prone');
    assert.deepEqual([0, 2, 6].map(c => regua._getGridHighlightStyle(ponto(c)).color), [0xff0000, 0xff0000, 0xff0000]);
    assert.equal(regua._getWaypointLabelContext(ponto(2), {}).cost.units, 'm');
    ator.statuses.clear();
    ator.system.atributos.move.valor = 1;
    assert.equal(regua._getWaypointLabelContext(ponto(4), {}).cost.units, 'm · Correr');
    ator.system.dirigindo = true;
    ator.veiculoAtivo = { id: 'moto' };
    assert.deepEqual(faixasDoToken(regua.token), { andar: 2, correr: 2 });
    assert.equal(regua._getWaypointLabelContext(ponto(4), {}).cost.units, 'm');
    ator.system.dirigindo = false;
    env.ligada = false;
    assert.equal(faixasDoToken(regua.token), null);
    assert.equal(regua._getSegmentStyle(ponto(2)).color, 'usuario');
    assert.equal(regua._getGridHighlightStyle(ponto(2)).color, 'usuario');
    assert.equal(regua._getWaypointLabelContext(ponto(2), {}).cost.units, 'm');
    env.ligada = true;
    for (const type of ['conteiner', 'blackice', 'demonio']) {
      ator.type = type;
      assert.equal(regua._getSegmentStyle(ponto(2)).color, 'usuario', type);
    }
    regua.token = { actor: null };
    assert.equal(regua._getGridHighlightStyle(ponto(2)).color, 'usuario');
  } finally { limpar(); }
});
