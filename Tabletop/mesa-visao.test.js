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

// A conta sem índice (olha todas as paredes), para conferir a do índice em cenas aleatórias.
function enxergaSimples(paredes, de, ate) {
  let limitadas = 0;
  for (const p of paredes) {
    if (!V.bloqueiaVista(p) || !V.cruza(de, ate, { x: p.c[0], y: p.c[1] }, { x: p.c[2], y: p.c[3] })) continue;
    if (p.visao >= 20 || (limitadas += 1) >= 2) return false;
  }
  return true;
}
function cenaAleatoria(semente, n, largura, altura) {
  let s = semente;
  const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const paredes = [];
  for (let i = 0; i < n; i += 1) {
    const x = Math.round(r() * largura); const y = Math.round(r() * altura); const c = 20 + r() * 300; const a = r() < 0.5 ? r() * Math.PI * 2 : Math.round(r() * 4) * Math.PI / 2;
    paredes.push(parede([x, y, Math.round(x + Math.cos(a) * c), Math.round(y + Math.sin(a) * c)], { visao: r() < 0.15 ? 10 : r() < 0.1 ? 0 : 20, porta: r() < 0.1 ? 1 : 0, estado: r() < 0.5 ? 1 : 0 }));
  }
  return { paredes, r };
}

test('com o índice, a mesma resposta que olhando todas as paredes; o polígono bate com os pontos contados', () => {
  for (const [semente, n] of [[3, 8], [5, 120], [9, 600]]) {
    const { paredes, r } = cenaAleatoria(semente, n, 2000, 1200);
    for (let k = 0; k < 400; k += 1) {
      const de = { x: Math.round(r() * 2000), y: Math.round(r() * 1200) };
      const ate = { x: Math.round(r() * 2000), y: Math.round(r() * 1200) };
      assert.equal(V.enxerga(paredes, de, ate), enxergaSimples(paredes, de, ate), `semente ${semente}, de ${JSON.stringify(de)} até ${JSON.stringify(ate)}`);
    }
  }
  // A área do polígono contra os pontos de uma grade que o olho vê (a diferença é só a borda dos pixels).
  const { paredes } = cenaAleatoria(21, 40, 800, 500);
  const olho = { x: 400, y: 250 };
  let vistos = 0;
  for (let x = 1; x < 800; x += 2) for (let y = 1; y < 500; y += 2) if (V.enxerga(paredes, olho, { x, y })) vistos += 1;
  perto(area(V.poligono(paredes, olho, 800, 500)), vistos * 4, vistos * 4 * 0.02);
  // A parede que sai da cena: o canto onde ela sai entra no polígono (senão a sombra come um pedaço do que se vê).
  const saindo = [parede([800, 200, 1400, 800])];
  let vistosAqui = 0;
  for (let x = 1; x < 1000; x += 2) for (let y = 1; y < 1000; y += 2) if (V.enxerga(saindo, { x: 500, y: 500 }, { x, y })) vistosAqui += 1;
  perto(area(V.poligono(saindo, { x: 500, y: 500 }, 1000, 1000)), vistosAqui * 4, vistosAqui * 4 * 0.005);
});

test('a luz: global, alcance do olho, a luz que ilumina e a parede de luz', () => {
  const olho = { x: 100, y: 100, alcance: 200 };
  const longe = { x: 700, y: 100 };
  assert.equal(V.pontoVisto([olho], longe, []), true, 'com a luz global, vê até onde a parede deixa');
  assert.equal(V.pontoVisto([olho], longe, [], { global: false }), false, 'no escuro, só o alcance');
  assert.equal(V.pontoVisto([olho], { x: 250, y: 100 }, [], { global: false }), true, 'dentro do alcance');
  const poste = { x: 700, y: 300, raio: 250 };
  assert.equal(V.pontoVisto([olho], longe, [], { global: false, luzes: [poste] }), true, 'longe, mas iluminado');
  const muroDaLuz = parede([500, 200, 900, 200], { visao: 0, luz: 20 });
  assert.equal(V.pontoVisto([olho], longe, [muroDaLuz], { global: false, luzes: [poste] }), false, 'a parede de luz segura a luz');
  assert.equal(V.enxerga([muroDaLuz, parede([500, 250, 900, 250], { visao: 0, luz: 20 })], { x: 700, y: 100 }, { x: 700, y: 300 }), true, 'e deixa ver através dela (mesmo de duas)');
  assert.equal(V.enxerga([muroDaLuz], { x: 700, y: 100 }, { x: 700, y: 300 }, V.LUZ), false);
  assert.equal(V.pontoVisto([olho], longe, [parede([400, 0, 400, 400])], { global: false, luzes: [poste] }), false, 'iluminado, mas atrás da parede');
  // O polígono da luz fica no quadrado do raio (450 a 950, 50 a 550) e para na parede de luz: embaixo dela, 500 × 350;
  // acima, só as duas frestas nas pontas do muro (triângulos de 50 × 25).
  const pontos = V.poligono([muroDaLuz], poste, 2000, 2000, undefined, { tipo: V.LUZ, raio: 250 });
  perto(area(pontos), 500 * 350 + 2 * (50 * 25 / 2), 1);
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
