import assert from 'node:assert/strict';
import test from 'node:test';
import { maosDaArma, maosLivres } from '../../foundry-sistema/scripts/regras.mjs';

// CORE 0.92.4, cpr-actor.js: _getHands, _getFreeHands e canHoldWeapon.
// Duas mãos + bonuses.hands; só as armas empunhadas com handsReq entram na soma.
test('Mãos livres: duas mãos, descontando só as armas equipadas (CORE)', () => {
  assert.equal(maosLivres(), 2);
  assert.equal(maosLivres({ armas: [{ equipada: false, maos: 2 }] }), 2);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 1 }] }), 1);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 1 }, { equipada: true, maos: 1 }] }), 0);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 2 }] }), 0);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 0 }, { equipada: true }] }), 2);
});

test('Mãos livres: bônus dos efeitos e excesso já existente, sem esconder o negativo (CORE)', () => {
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 2 }], bonus: 2 }), 2);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 1 }], bonus: -1 }), 0);
  assert.equal(maosLivres({ armas: [{ equipada: true, maos: 2 }, { equipada: true, maos: 1 }] }), -1);
});

test('BODY 8+: arma branca de duas mãos usa uma; arma de tiro e zero mãos preservam a exigência (wiki, p. 175–176)', () => {
  const branca = { maos: 2, aDistancia: false, equipada: true };
  assert.equal(maosDaArma(branca, 7), 2);
  assert.equal(maosDaArma(branca, 8), 1);
  assert.equal(maosDaArma({ maos: 2, aDistancia: true }, 14), 2);
  assert.equal(maosDaArma({ maos: 0, aDistancia: false }, 8), 0);
  assert.equal(maosDaArma({ maos: 1, aDistancia: false }, 8), 1);
  assert.equal(maosLivres({ armas: [branca], body: 8 }), 1);
});

test('Escudo equipado ocupa uma mão, somada às armas (wiki, p. 183–184)', () => {
  assert.equal(maosLivres({ escudos: 1 }), 1);
  assert.equal(maosLivres({ escudos: 2 }), 0);
  assert.equal(maosLivres({ escudos: 1, armas: [{ equipada: true, maos: 1 }] }), 0);
  assert.equal(maosLivres({ escudos: 1, armas: [{ equipada: true, maos: 2, aDistancia: false }], body: 8 }), 0);
});
