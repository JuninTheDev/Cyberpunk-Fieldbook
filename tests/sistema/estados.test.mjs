// Estados do Foundry pelas regras da wiki (system-rules.js, "Seu turno", "Movimento" e "Agarrar", p. 168–177).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { movimentoPorEstado } from '../../foundry-sistema/scripts/regras-estados.mjs';
import { STATUS_AGARRAO } from '../../foundry-sistema/scripts/config.mjs';
import { levantar, registrarEstados } from '../../foundry-sistema/scripts/estados.mjs';

test('Caído (wiki, p. 168–169): não usa Movimento e levantar-se custa uma Ação, sem mudar o MOVE', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes('Custa Ação:</b> guardar arma, recarregar, equipar/soltar escudo, levantar-se, entrar em veículo.'));
  assert.ok(wiki.includes('Caído (derrubado): precisa da Ação Levantar-se antes de se mover.'));
  assert.ok(wiki.includes('MOVE × 2 m por Ação de Movimento.'));
  const estados = new Set(['prone']);
  assert.deepEqual(movimentoPorEstado(estados, 6), { caido: true, metros: 0, acoesParaLevantar: 1 });
  assert.deepEqual([...estados], ['prone']);
  assert.deepEqual(movimentoPorEstado(new Set(), 6), { caido: false, metros: 12, acoesParaLevantar: 0 });
});

test('Agarrado continua sem Movimento depois de se levantar; quem agarra conserva o seu Movimento (wiki, p. 177)', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  assert.ok(wiki.includes('o defensor não usa Ação de Movimento e é arrastado'));
  assert.deepEqual(movimentoPorEstado(new Set([STATUS_AGARRAO.agarrado]), 5), { caido: false, metros: 0, acoesParaLevantar: 0 });
  assert.deepEqual(movimentoPorEstado(new Set(['prone', STATUS_AGARRAO.agarrado]), 5), { caido: true, metros: 0, acoesParaLevantar: 1 });
  assert.deepEqual(movimentoPorEstado(new Set([STATUS_AGARRAO.agarrando]), 5), { caido: false, metros: 10, acoesParaLevantar: 0 });
});

test('Símbolos sem regra de Movimento na fonte não recebem uma conta inventada', () => {
  for (const status of ['blind', 'deaf', 'poison', 'stun', 'unconscious']) {
    assert.deepEqual(movimentoPorEstado(new Set([status]), 4), { caido: false, metros: 8, acoesParaLevantar: 0 });
  }
});

test('Levantar-se exige dono, personagem ou capanga e o estado caído antes de mudar qualquer dado', async () => {
  for (const ator of [null, { isOwner: false }, { isOwner: true, type: 'conteiner' }, { isOwner: true, type: 'personagem', statuses: new Set() }]) {
    assert.equal(await levantar(ator), null);
  }
});

test('Caído: o gancho do movimento recusa o dono, informa o custo e deixa o mestre mover, sem afetar outros estados', () => {
  const anteriores = { Hooks: globalThis.Hooks, game: globalThis.game, ui: globalThis.ui };
  const avisos = [];
  let mover;
  globalThis.Hooks = { on: (nome, fn) => { assert.equal(nome, 'preMoveToken'); mover = fn; } };
  globalThis.game = { user: { isGM: false } };
  globalThis.ui = { notifications: { info: mensagem => avisos.push(mensagem) } };
  try {
    registrarEstados();
    for (const type of ['personagem', 'capanga']) {
      const token = { name: 'Caído', actor: { type, isOwner: true, statuses: new Set(['prone']) } };
      assert.equal(mover(token), false);
      assert.equal(avisos.at(-1), 'Caído: está caído; use Levantar-se (1 Ação) antes de mover.');
      globalThis.game.user.isGM = true;
      assert.equal(mover(token), undefined);
      globalThis.game.user.isGM = false;
      token.actor.statuses.clear();
      assert.equal(mover(token), undefined);
    }
    assert.equal(mover({}), undefined);
    assert.equal(mover({ actor: { type: 'conteiner', statuses: new Set(['prone']) } }), undefined);
    assert.equal(mover({ actor: { type: 'personagem', statuses: new Set(['blind', 'unconscious']) } }), undefined);
    assert.equal(avisos.length, 2);
  } finally {
    for (const [nome, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor; }
  }
});
