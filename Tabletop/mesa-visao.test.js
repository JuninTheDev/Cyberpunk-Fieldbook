// A conta da visão (mesa-visao.js): o que o servidor usa para esconder tokens e o navegador para desenhar a sombra.
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const V = require('./mesa-visao');

// A área do polígono (fórmula do laço), para conferir quanto da cena o olho vê.
const area = pontos => Math.abs(pontos.reduce((soma, p, i) => { const q = pontos[(i + 1) % pontos.length]; return soma + p.x * q.y - q.x * p.y; }, 0)) / 2;
const parede = (c, extra = {}) => ({ c, porta: 0, estado: 0, visao: 20, movimento: 20, ...extra });
const perto = (valor, esperado, folga = 1) => assert.ok(Math.abs(valor - esperado) <= folga, `${valor} devia ser ${esperado}`);

test('o polígono: a cena inteira sem paredes, cortado pela parede, atravessando uma limitada e parando na segunda', () => {
  const olho = { x: 500, y: 400 };
  perto(area(V.poligono([], olho, 1000, 800)), 800000);
  perto(area(V.poligono([parede([700, 0, 700, 800])], olho, 1000, 800)), 700 * 800);
  perto(area(V.poligono([parede([700, 0, 700, 800], { visao: 10 })], olho, 1000, 800)), 800000);
  perto(area(V.poligono([parede([700, 0, 700, 800], { visao: 10 }), parede([800, 0, 800, 800], { visao: 10 })], olho, 1000, 800)), 800 * 800);
  perto(area(V.poligono([parede([700, 0, 700, 800], { porta: 1, estado: 1 })], olho, 1000, 800)), 800000, 1);
  perto(area(V.poligono([parede([700, 0, 700, 800], { porta: 1, estado: 2 })], olho, 1000, 800)), 700 * 800);
  perto(area(V.poligono([parede([700, 0, 700, 800], { visao: 0 })], olho, 1000, 800)), 800000, 1);
  // Um quarto fechado de 200 × 200 em volta do olho: vê só o quarto.
  const quarto = [parede([400, 300, 600, 300]), parede([600, 300, 600, 500]), parede([600, 500, 400, 500]), parede([400, 500, 400, 300])];
  perto(area(V.poligono(quarto, olho, 1000, 800)), 200 * 200);
  // O olho na margem, fora do mapa: vê o mapa e a margem.
  perto(area(V.poligono([], { x: -50, y: 400 }, 1000, 800, { x: 100, y: 0 })), 1200 * 800);
  // A mesma sala com uma fresta (a parede de baixo vai só até 590): a vista escapa por ela.
  const fresta = [...quarto.slice(0, 2), parede([590, 500, 400, 500]), quarto[3]];
  assert.ok(area(V.poligono(fresta, olho, 1000, 800)) > 200 * 200 + 1000);
});

test('enxergar, ver o token pela quina e atravessar', () => {
  const muro = parede([600, 0, 600, 700]);
  assert.equal(V.enxerga([muro], { x: 100, y: 100 }, { x: 900, y: 100 }), false);
  assert.equal(V.enxerga([muro], { x: 100, y: 750 }, { x: 900, y: 750 }), true, 'por baixo do muro');
  assert.equal(V.enxerga([muro], { x: 100, y: 700 }, { x: 900, y: 700 }), true, 'rente à ponta passa');
  assert.equal(V.enxerga([parede([600, 0, 600, 700], { visao: 10 })], { x: 100, y: 100 }, { x: 900, y: 100 }), true, 'uma limitada deixa ver');
  assert.equal(V.enxerga([parede([600, 0, 600, 700], { visao: 10 }), parede([700, 0, 700, 700], { visao: 10 })], { x: 100, y: 100 }, { x: 900, y: 100 }), false, 'duas, não');
  // O alvo com o centro atrás da quina, mas o corpo para fora: aparece.
  assert.equal(V.algumVe([{ x: 100, y: 690 }], { x: 900, y: 690 }, [muro], 40), true);
  assert.equal(V.algumVe([{ x: 100, y: 100 }], { x: 900, y: 100 }, [muro], 40), false);
  assert.equal(V.algumVe([], { x: 900, y: 750 }, [], 40), false, 'sem olho, não vê nada');
  assert.equal(V.atravessa([muro], { x: 100, y: 100 }, { x: 900, y: 100 }), true);
  assert.equal(V.atravessa([parede([600, 0, 600, 700], { movimento: 0 })], { x: 100, y: 100 }, { x: 900, y: 100 }), false, 'janela: vê, não passa; cortina: passa');
  assert.equal(V.atravessa([parede([600, 0, 600, 700], { porta: 1, estado: 1 })], { x: 100, y: 100 }, { x: 900, y: 100 }), false, 'porta aberta passa');
});
