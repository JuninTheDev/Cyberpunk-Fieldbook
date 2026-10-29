// As opções do Fluxo mantêm nomes, dicas, escolhas e padrões do registro da mesa antiga.
// Fonte: foundry-fluxo-de-combate/scripts/fluxo-de-combate.mjs, Hooks.once('init').
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';

function registrosDaMesa() {
  const registros = new Map();
  const fonte = fs.readFileSync(new URL('../../foundry-fluxo-de-combate/scripts/fluxo-de-combate.mjs', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '');
  vm.runInNewContext(fonte, {
    MODULE_ID: 'cpr-fluxo-de-combate', aoMudarTurno: () => {},
    Hooks: { once: (nome, registrar) => { if (nome === 'init') registrar(); }, on: () => {} },
    game: { settings: { register: (sistema, chave, dados) => registros.set(chave, dados) } }
  });
  return registros;
}

function registrosDoSistema() {
  const registros = new Map();
  const anterior = globalThis.game;
  globalThis.game = { settings: { register: (sistema, chave, dados) => { assert.equal(sistema, 'cpr-fieldbook'); assert.ok(!registros.has(chave), chave); registros.set(chave, dados); } } };
  try { registrarConfiguracoes(); } finally { if (anterior === undefined) delete globalThis.game; else globalThis.game = anterior; }
  return registros;
}

const comparar = dados => ({ ...JSON.parse(JSON.stringify(dados)), type: dados.type.name });
for (const chave of ['ativo', 'rolagemManual', 'dano']) {
  test('a configuração ' + chave + ' conserva o registro real do Fluxo da mesa', () => {
    const mesa = registrosDaMesa();
    const sistema = registrosDoSistema();
    assert.ok(mesa.has(chave), 'a chave precisa existir na fonte');
    assert.deepEqual(comparar(sistema.get(chave)), comparar(mesa.get(chave)));
  });
}

test('quem rola o dano e as rolagens da NET mantêm suas chaves, independentes da janela dos dados do combate', () => {
  const sistema = registrosDoSistema();
  assert.equal(sistema.get('jogadorRolaDano').default, true);
  assert.equal(sistema.get('jogadorRolaDano').name, 'Quem atacou rola o dano');
  assert.equal(sistema.get('netJogadorRola').default, true);
  assert.equal(sistema.get('netJogadorRola').name, 'O jogador rola as rolagens da NET');
  assert.equal(sistema.get('rolagemManual').name, 'O jogador rola os próprios dados');
});
