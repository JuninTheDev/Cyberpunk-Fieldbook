// Testes de referência do marcador do ponto de acesso na visão do jogador (foundry-sistema/scripts/netrun/
// regras-da-net.mjs: pontoNaVisao), sem Foundry. O pedido do usuário (2026-11-26): o jogador só vê o marcador "NET" do
// Tile com ele na visão (como as portas do Foundry: a névoa, a escuridão e as paredes escondem); o mestre sempre vê, e a
// cena sem a visão dos tokens mostra para todos.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { pontoNaVisao } from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';

const tile = { x: 1800, y: 800, width: 200, height: 200 };

test('o jogador vê o marcador só com o centro do Tile na visão; a folga vai junto para o teste do Foundry', () => {
  const pedidos = [];
  const visto = (ponto, folga) => { pedidos.push({ ...ponto, folga }); return true; };
  assert.equal(pontoNaVisao(tile, { testar: visto, folga: 20 }), true);
  assert.deepEqual(pedidos, [{ x: 1900, y: 900, folga: 20 }]);
  assert.equal(pontoNaVisao(tile, { testar: () => false }), false);
  // A resposta vira booleano, e sem como testar (o canvas sem visão), não vê.
  assert.equal(pontoNaVisao(tile, { testar: () => 1 }), true);
  assert.equal(pontoNaVisao(tile, { testar: () => undefined }), false);
  assert.equal(pontoNaVisao(tile, {}), false);
  assert.equal(pontoNaVisao(tile), false);
});

test('o mestre sempre vê, e a cena sem a visão dos tokens mostra para todos, sem perguntar ao Foundry', () => {
  let perguntou = false;
  const fora = () => { perguntou = true; return false; };
  assert.equal(pontoNaVisao(tile, { gm: true, testar: fora }), true);
  assert.equal(pontoNaVisao(tile, { visaoDosTokens: false, testar: fora }), true);
  assert.equal(perguntou, false);
  // O jogador, com a visão dos tokens ligada, depende do teste.
  assert.equal(pontoNaVisao(tile, { gm: false, visaoDosTokens: true, testar: fora }), false);
  assert.equal(perguntou, true);
});
