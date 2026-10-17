// Testes de referência da parede entre o token e o ponto de acesso e do Scanner (foundry-sistema/scripts/netrun/
// regras-da-net.mjs: paredeNoMeio, paredeEntre e achadosDoScanner), sem Foundry. A wiki ("Netrunning"): "a até 6 m do
// ponto de acesso, sem parede no meio"; o Scanner, "1 Ação Carnal: acha no mundo físico os pontos de acesso da área;
// quanto maior, mais longe" (até o resultado × 10, como o NET Architect da mesa; o oculto, acima do DV do Scanner dele).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { achadosDoScanner, barra, paredeEntre, paredeNoMeio, RAIO_DO_SCANNER } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

// As paredes como o documento da cena: c (as duas pontas), move (0: não barra o movimento; 20: barra), door (0: não é
// porta) e ds (o estado da porta; 1: aberta).
const parede = (c, extra = {}) => ({ c, move: 20, door: 0, ds: 0, ...extra });
const de = { x: 0, y: 0 };
const para = { x: 100, y: 0 };

test('a parede que barra: a comum e a porta fechada ou trancada; a porta aberta e a que não barra o movimento, não', () => {
  assert.equal(barra(parede([0, 0, 1, 1])), true);
  assert.equal(barra(parede([0, 0, 1, 1], { door: 1, ds: 0 })), true);
  assert.equal(barra(parede([0, 0, 1, 1], { door: 2, ds: 2 })), true);
  assert.equal(barra(parede([0, 0, 1, 1], { door: 1, ds: 1 })), false);
  assert.equal(barra(parede([0, 0, 1, 1], { move: 0 })), false);
});

test('a parede no meio: só o cruzamento de verdade conta', () => {
  // Atravessa a linha.
  assert.equal(paredeNoMeio([parede([50, -50, 50, 50])], de, para), true);
  // Em diagonal, também.
  assert.equal(paredeNoMeio([parede([20, 40, 80, -40])], de, para), true);
  // Não chega até a linha, fica atrás do ponto ou ao lado.
  assert.equal(paredeNoMeio([parede([50, 10, 50, 50])], de, para), false);
  assert.equal(paredeNoMeio([parede([150, -50, 150, 50])], de, para), false);
  // Encosta na ponta da parede, ou corre junto da linha: passa.
  assert.equal(paredeNoMeio([parede([50, 0, 50, 50])], de, para), false);
  assert.equal(paredeNoMeio([parede([20, 0, 80, 0])], de, para), false);
  // A porta aberta no meio não barra; a fechada, sim; entre várias, basta uma.
  assert.equal(paredeNoMeio([parede([50, -50, 50, 50], { door: 1, ds: 1 })], de, para), false);
  assert.equal(paredeNoMeio([parede([50, -50, 50, 50], { door: 1, ds: 0 })], de, para), true);
  assert.equal(paredeNoMeio([parede([150, -50, 150, 50]), parede([50, -50, 50, 50])], de, para), true);
  assert.equal(paredeNoMeio([], de, para), false);
});

test('a parede entre o token e o ponto: do centro do token (o destino, no _source) ao centro do Tile', () => {
  // A cena de 100 px por quadrado; o Tile de 200 × 200 em (1800, 800), o centro em (1900, 900); o token de 1 × 1 em
  // (1600, 900), o centro em (1650, 950).
  const cena = walls => ({ grid: { size: 100, distance: 2 }, walls });
  const tile = walls => ({ parent: cena(walls), x: 1800, y: 800, width: 200, height: 200 });
  const token = { x: 1600, y: 900, width: 1, height: 1 };
  assert.equal(paredeEntre(tile([parede([1750, 700, 1750, 1100])]), token), true);
  assert.equal(paredeEntre(tile([parede([1750, 700, 1750, 1100], { door: 1, ds: 1 })]), token), false);
  assert.equal(paredeEntre(tile([parede([1750, 1000, 1750, 1100])]), token), false);
  // O token que anda: vale o destino (o _source), como na distância.
  assert.equal(paredeEntre(tile([parede([1750, 700, 1750, 1100])]), { ...token, _source: { x: 1700, y: 900, width: 1, height: 1 } }), false);
});

test('o Scanner: os pontos até o resultado × 10, do mais perto ao mais longe; o oculto só acima do DV do Scanner dele', () => {
  assert.equal(RAIO_DO_SCANNER, 10);
  const pontos = [
    { nome: 'Longe', longe: 95, oculto: false, dvScanner: 10 },
    { nome: 'Perto', longe: 3, oculto: false, dvScanner: 10 },
    { nome: 'Escondido', longe: 13, oculto: true, dvScanner: 10 },
    { nome: 'Escondido sem DV', longe: 13, oculto: true, dvScanner: null }
  ];
  const nomes = total => achadosDoScanner(pontos, total).map(ponto => ponto.nome).join();
  // 9: até 90; o oculto (DV 10) não.
  assert.equal(nomes(9), 'Perto');
  // 10: até 100; o oculto ainda não (tem de passar do DV).
  assert.equal(nomes(10), 'Perto,Longe');
  // 11: o oculto também (sem DV, o 10 de partida).
  assert.equal(nomes(11), 'Perto,Escondido,Escondido sem DV,Longe');
  assert.equal(nomes(0), '');
});
