// O conversor da cena do Foundry 12 (importar-foundry.js), sem o banco: uma cena de mentira com margem, paredes e porta.
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const { converter } = require('./importar-foundry');

// Margem de 25% numa cena de 1000 × 800 com grade de 100: o mapa começa em (300, 200) no canvas do Foundry.
const cena = (extra = {}) => ({ _id: 'cena1', name: 'Clínica', width: 1000, height: 800, padding: 0.25, grid: { size: 100, type: 1, distance: 2, units: 'm' }, background: { src: 'mapas/clinica.webp' }, ...extra });
const embutidos = paredes => ({ tokens: [], tiles: [], luzes: [], deltas: new Map(), paredes });
const paredes = [{ c: [300, 200, 400, 200] }, { c: [400, 200, 400, 300], door: 1, ds: 2, sight: 10, move: 0 }];

test('as paredes vêm para a coordenada do mapa, com porta, trinco e o quanto bloqueiam', () => {
  const { cena: convertida } = converter(cena({ tokenVision: true }), embutidos(paredes), new Map(), 'mundo');
  assert.deepEqual(convertida.paredes, [
    { c: [0, 0, 100, 0], porta: 0, estado: 0, movimento: 20, visao: 20, luz: 20 },
    { c: [100, 0, 100, 100], porta: 1, estado: 2, movimento: 0, visao: 10, luz: 20 }
  ]);
  assert.equal(convertida.visao, true, 'a cena com a visão dos tokens ligada no Foundry chega com a visão ligada');
});

test('a margem do Foundry vem junto, e o token que estava nela fica fora do mapa', () => {
  const comToken = { ...embutidos([]), tokens: [{ name: 'Drone', x: 100, y: 250, width: 1, height: 1 }] };
  const { cena: convertida } = converter(cena(), comToken, new Map(), 'mundo');
  assert.deepEqual(convertida.margem, { x: 300, y: 200 });
  assert.deepEqual([convertida.tokens[0].x, convertida.tokens[0].y], [-150, 100]);
  const deslocada = converter(cena({ background: { src: 'mapas/clinica.webp', offsetX: 40, offsetY: -30 } }), embutidos([]), new Map(), 'mundo').cena;
  assert.deepEqual(deslocada.margem, { x: 340, y: 230 }, 'com o fundo deslocado, a margem cresce para os dois lados');
});

const iluminada = { environment: { darknessLevel: 0, globalLight: { enabled: true, darkness: { max: 1 } } } };
test('a visão só liga se o Foundry tinha e ela muda alguma coisa (paredes ou escuro)', () => {
  assert.equal(converter(cena({ tokenVision: false }), embutidos(paredes), new Map(), 'mundo').cena.visao, false);
  assert.equal(converter(cena({ tokenVision: true, ...iluminada }), embutidos([]), new Map(), 'mundo').cena.visao, false, 'clara e sem paredes: quem não tem token só deixaria de ver');
  assert.equal(converter(cena({ tokenVision: true }), embutidos([]), new Map(), 'mundo').cena.visao, true, 'no escuro, mesmo sem paredes (o alcance dos tokens)');
});

test('a luz da cena, a visão e a luz dos tokens, e as luzes com a transparência', () => {
  const comTudo = { ...embutidos([]), tokens: [{ name: 'Jax', x: 300, y: 200, sight: { enabled: true, range: 30 }, light: { bright: 6, dim: 12 } }, { name: 'ICE', x: 400, y: 200, sight: { enabled: false, range: 0 }, light: { bright: 0, dim: 0 } }],
    luzes: [{ x: 500, y: 400, config: { bright: 3, dim: 7, angle: 60, color: '#ff7300', alpha: 0.4 } }] };
  const { cena: convertida, avisos } = converter(cena({ environment: { darknessLevel: 0.7, globalLight: { enabled: true, darkness: { max: 0.5 } } } }), comTudo, new Map(), 'mundo');
  assert.deepEqual(convertida.luz, { global: false, escuridao: 0.7 }, 'a luz global só vale até a escuridão máxima dela');
  assert.deepEqual(convertida.tokens.map(({ alcance, luz }) => ({ alcance, luz })), [{ alcance: 30, luz: { claro: 6, penumbra: 12 } }, { alcance: 0, luz: { claro: 0, penumbra: 0 } }]);
  assert.deepEqual((({ x, y, claro, penumbra, cor, alpha }) => ({ x, y, claro, penumbra, cor, alpha }))(convertida.luzes[0]), { x: 200, y: 200, claro: 3, penumbra: 7, cor: '#ff7300', alpha: 0.4 });
  assert.ok(avisos.includes('luz em cone virou círculo'));
  assert.deepEqual(converter(cena({ globalLight: true, darkness: 0.2, globalLightThreshold: 0.5 }), embutidos([]), new Map(), 'mundo').cena.luz, { global: true, escuridao: 0.2 }, 'o formato de antes do Foundry 12');
});
