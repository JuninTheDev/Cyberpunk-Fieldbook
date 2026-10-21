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

test('a visão só liga se o Foundry tinha e a cena tem paredes', () => {
  assert.equal(converter(cena({ tokenVision: false }), embutidos(paredes), new Map(), 'mundo').cena.visao, false);
  assert.equal(converter(cena({ tokenVision: true }), embutidos([]), new Map(), 'mundo').cena.visao, false, 'sem paredes, quem não tem token não veria nada');
});
