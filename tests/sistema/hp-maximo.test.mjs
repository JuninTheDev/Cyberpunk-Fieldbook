// Testes do HP dentro do máximo (o C31; foundry-sistema/scripts/regras.mjs, hpDepoisDoMaximo), sem Foundry, pelo CORE
// 0.92.4: com o HP cheio, o máximo que muda leva o atual junto (o _setMaxHp, cpr-character-sheet.js:162-169: "hp.max ===
// hp.value ? maxHp : hp.value"); fora disso, o atual fica, mas nunca acima do máximo (cpr-actor.js:370-374). O máximo é o
// da wiki (regras.hpMaximo: 10 + 5 × (BODY + WILL) / 2, para cima).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { hpDepoisDoMaximo, hpMaximo } from '../../foundry-sistema/scripts/regras.mjs';

test('HP no máximo (C31): cheio, o BODY que sobe leva o atual junto; o que desce também', () => {
  // BODY 6 e WILL 6: 40; BODY 8: 45; BODY 4: 35.
  assert.equal(hpDepoisDoMaximo(40, hpMaximo(6, 6), hpMaximo(8, 6)), 45);
  assert.equal(hpDepoisDoMaximo(45, hpMaximo(8, 6), hpMaximo(6, 6)), 40);
  assert.equal(hpDepoisDoMaximo(40, hpMaximo(6, 6), hpMaximo(4, 6)), 35);
});

test('HP no máximo (C31): ferido, o atual fica; só para no máximo novo quando ele cai abaixo', () => {
  assert.equal(hpDepoisDoMaximo(30, 45, 50), 30, 'o máximo sobe: fica');
  assert.equal(hpDepoisDoMaximo(42, 50, 35), 35, 'o máximo cai abaixo do atual: para nele');
  assert.equal(hpDepoisDoMaximo(30, 45, 35), 30, 'o máximo cai, mas fica acima: fica');
  assert.equal(hpDepoisDoMaximo(0, 45, 50), 0);
  assert.equal(hpDepoisDoMaximo(-3, 45, 50), -3, 'o negativo fica');
});

test('HP no máximo (C31): o gravado acima do máximo de antes não conta como cheio (o ator criado antes dos itens)', () => {
  // A importação da mesa cria o ator com o HP de lá (47 de 50, com o Grafted Muscle) antes dos itens: sem eles, o máximo é 45.
  assert.equal(hpDepoisDoMaximo(47, 45, 50), 47);
  assert.equal(hpDepoisDoMaximo(47, 45, 40), 40, 'mas não passa do máximo novo');
});

test('HP no máximo (C31): o mesmo máximo não muda nada', () => {
  assert.equal(hpDepoisDoMaximo(40, 40, 40), 40);
  assert.equal(hpDepoisDoMaximo(25, 40, 40), 25);
});
