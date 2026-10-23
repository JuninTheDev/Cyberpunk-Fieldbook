// CORE 0.92.4: settings.js playersCreateInventory, desligado por padrão.
import assert from 'node:assert/strict';
import test from 'node:test';
import { criarItemNaFicha, podeCriarItemNaFicha } from '../../foundry-sistema/scripts/criar-item.mjs';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';

test('C34.2: criar itens exige dono, tipo de ator e a opção atual; mestre dispensa a opção', async () => {
  const antes = { game: globalThis.game, CONFIG: globalThis.CONFIG };
  let permitido = false, chamadas = 0;
  const criado = { id: 'novo' };
  const ator = { type: 'personagem', isOwner: true, createEmbeddedDocuments: async (tipo, dados) => {
    chamadas++;
    assert.equal(tipo, 'Item');
    assert.deepEqual(dados, [{ name: 'Arma nova', type: 'arma' }]);
    return [criado];
  } };
  globalThis.game = { user: { isGM: false }, settings: { get: (sistema, chave) => {
    assert.equal(sistema, 'cpr-fieldbook');
    assert.equal(chave, 'jogadoresCriamItens');
    return permitido;
  } }, i18n: { localize: () => 'Arma' } };
  globalThis.CONFIG = { Item: { dataModels: { arma: {} } } };
  try {
    assert.equal(podeCriarItemNaFicha(ator), false);
    assert.equal(await criarItemNaFicha(ator, 'arma'), null);
    permitido = true;
    for (const type of ['personagem', 'capanga']) {
      ator.type = type;
      assert.equal(podeCriarItemNaFicha(ator), true);
      assert.equal(await criarItemNaFicha(ator, 'arma'), criado);
    }
    // Uma ficha desenhada com a opção ligada não conserva a autorização antiga.
    permitido = false;
    assert.equal(await criarItemNaFicha(ator, 'arma'), null);
    globalThis.game.user.isGM = true;
    assert.equal(await criarItemNaFicha(ator, 'arma'), criado);
    for (const type of ['conteiner', 'blackice', 'demonio', 'inexistente']) {
      ator.type = type;
      assert.equal(await criarItemNaFicha(ator, 'arma'), null);
    }
    ator.type = 'personagem';
    ator.isOwner = false;
    assert.equal(await criarItemNaFicha(ator, 'arma'), null);
    ator.isOwner = true;
    for (const tipo of ['inexistente', 'toString', '__proto__']) assert.equal(await criarItemNaFicha(ator, tipo), null);
    assert.equal(podeCriarItemNaFicha(null), false);
    assert.equal(chamadas, 3);
    ator.createEmbeddedDocuments = async () => [];
    assert.equal(await criarItemNaFicha(ator, 'arma'), null);
  } finally {
    Object.assign(globalThis, antes);
  }
});

test('C34.2: a configuração é do mundo, visível e desligada por padrão como no CORE', () => {
  const antes = globalThis.game;
  const registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  try {
    registrarConfiguracoes();
    const opcao = registros.get('jogadoresCriamItens');
    assert.equal(opcao.sistema, 'cpr-fieldbook');
    assert.equal(opcao.scope, 'world');
    assert.equal(opcao.config, true);
    assert.equal(opcao.type, Boolean);
    assert.equal(opcao.default, false);
  } finally { globalThis.game = antes; }
});


test('C34.2: confirmar ao apagar é uma preferência do navegador, ligada por padrão como no CORE', () => {
  const antes = globalThis.game;
  const registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  try {
    registrarConfiguracoes();
    const opcao = registros.get('confirmarApagarItem');
    assert.equal(opcao.sistema, 'cpr-fieldbook');
    assert.equal(opcao.scope, 'client');
    assert.equal(opcao.config, true);
    assert.equal(opcao.type, Boolean);
    assert.equal(opcao.default, true);
  } finally { globalThis.game = antes; }
});
