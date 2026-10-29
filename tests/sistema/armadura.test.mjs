// CORE 0.92.4: modules/actor/cpr-actor.js:943–961, 1377–1388 e 1564–1627.
// Wiki: system-rules.js, Armadura (p. 186), e system-catalog.js:88–89: SP maior do local, sem soma;
// a ablação atinge todas as fontes, inclusive os itens de armadura da Skin Weave e Subdermal Armor.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { armaduraDoLocal, armadurasDoLocal, spComVariacao } from '../../foundry-sistema/scripts/regras-armadura.mjs';

const armadura = (id, corpo, cabeca = 0, max = corpo) => ({ id, type: 'armadura', system: { equipada: true, escudo: false, sp: { corpo: { value: corpo, max }, cabeca: { value: cabeca, max: cabeca } } } });

test('C18: vale SP 7 atual, e não a Metalgear ablada a SP 5 nem a soma 12', () => {
  const metalgear = armadura('metalgear', 5, 0, 18), kevlar = armadura('kevlar', 7);
  assert.equal(armaduraDoLocal([metalgear, kevlar], 'corpo').id, 'kevlar');
  assert.equal(armaduraDoLocal([metalgear, kevlar], 'corpo').system.sp.corpo.value, 7);
});

test('C18: cabeça e corpo escolhem fontes diferentes; empate conserva a primeira', () => {
  const corpo = armadura('corpo', 11), cabeca = armadura('cabeca', 0, 9), empate = armadura('empate', 11);
  assert.equal(armaduraDoLocal([corpo, cabeca, empate], 'corpo').id, 'corpo');
  assert.equal(armaduraDoLocal([corpo, cabeca, empate], 'cabeca').id, 'cabeca');
});

test('C18: armadura guardada, escudo e cyberware não substituem uma fonte vestida', () => {
  const itens = [armadura('guardada', 18), armadura('escudo', 30), armadura('cyberware', 30), armadura('vestida', 4)];
  itens[0].system.equipada = false; itens[1].system.escudo = true; itens[2].type = 'cyberware';
  assert.deepEqual(armadurasDoLocal(itens, 'corpo').map(i => i.id), ['vestida']);
  assert.equal(armaduraDoLocal(itens, 'corpo').id, 'vestida');
});

test('C18: todas as camadas do local recebem ablação, sem alterar o outro local ou os dados de entrada', () => {
  const itens = [armadura('externa', 11), armadura('interna', 4), armadura('quase-gasta', 1), armadura('cabeca', 0, 7)];
  const antes = JSON.stringify(itens);
  assert.deepEqual(armadurasDoLocal(itens, 'corpo').map(i => [i.id, spComVariacao(i.system.sp.corpo, -2)]), [['externa', 9], ['interna', 2], ['quase-gasta', 0]]);
  assert.equal(JSON.stringify(itens), antes);
});

test('C18: uma fonte de SP zero ainda cobre o local, mas nada protege um local sem fonte', () => {
  const gasta = armadura('gasta', 0, 0, 11);
  assert.equal(armaduraDoLocal([gasta], 'corpo').id, 'gasta');
  assert.equal(armaduraDoLocal([gasta], 'cabeca'), null);
  assert.equal(armaduraDoLocal([], 'corpo'), null);
  for (const local of ['perna', 'item', 'escudo', 'outro']) assert.deepEqual(armadurasDoLocal([gasta], local), []);
});

test('C18: ablação para em zero e restauração por diferença para no máximo', () => {
  assert.equal(spComVariacao({ value: 1, max: 11 }, -2), 0);
  assert.equal(spComVariacao({ value: 0, max: 11 }, -1), 0);
  assert.equal(spComVariacao({ value: 9, max: 11 }, 1), 10);
  assert.equal(spComVariacao({ value: 10, max: 11 }, 2), 11);
  assert.equal(spComVariacao({ value: 11, max: 11 }, 1), 11);
});

test('C18: Skin Weave e Subdermal Armor usam os itens de armadura do CORE, com SP 7 e 11 nos dois locais', () => {
  const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url))).itens;
  for (const [nome, sp] of [['skin-weave', 7], ['subdermal-armor', 11]]) {
    const item = catalogo['core_armor:' + nome];
    assert.equal(item.type, 'armadura');
    assert.deepEqual(item.system.sp, { cabeca: { value: sp, max: sp }, corpo: { value: sp, max: sp } });
    assert.equal(catalogo['core_cyberware:' + nome].type, 'cyberware');
  }
});
