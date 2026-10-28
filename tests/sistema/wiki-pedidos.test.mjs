// Referência: a entrega dos pedidos da wiki (foundry-sistema/scripts/wiki.mjs, entregarPedido e entregarPedidos) e a rota
// "entregue" de api-personagens.js, que recusa marcar de novo um pedido ("Este pedido já foi resolvido."). O registro do
// ciclo 186 (MIGRATION_STATUS) achou a corrida: a entrega de cada minuto e a do mestre pegavam o mesmo pedido juntas.
// Sem Foundry nem navegador: a entrega é uma função de mentira que só termina quando o teste deixa.
import assert from 'node:assert/strict';
import test from 'node:test';
import { umaEntregaPorVez } from '../../foundry-sistema/scripts/wiki-pedidos.mjs';

function entregaDeMentira() {
  const chamadas = [];
  const soltar = [];
  const entregar = (ator, wikiId, pedido) => new Promise((resolver, rejeitar) => {
    chamadas.push([ator, wikiId, pedido.id]);
    soltar.push({ resolver, rejeitar });
  });
  return { chamadas, soltar, entregar };
}
const pedido = { id: 'p1', status: 'aprovado' };
// O limite de cada teste: sem a trava, a segunda entrega fica esperando uma resposta que não vem (vira falha, não trava).

test('Pedidos da wiki: duas entregas do mesmo pedido ao mesmo tempo viram uma, e as duas recebem o mesmo resultado', { timeout: 2000 }, async () => {
  const { chamadas, soltar, entregar } = entregaDeMentira();
  const porVez = umaEntregaPorVez(entregar);
  const primeira = porVez('ator', 'ficha', pedido);
  const segunda = porVez('ator', 'ficha', { ...pedido });
  await Promise.resolve();
  assert.equal(chamadas.length, 1, 'a segunda espera a primeira, sem chegar à ficha nem à wiki');
  assert.equal(porVez.ocupado('ficha', pedido), true);
  soltar[0].resolver({ ok: true, notas: [] });
  assert.deepEqual(await primeira, { ok: true, notas: [] });
  assert.equal(await segunda, await primeira);
});

test('Pedidos da wiki: pedidos diferentes, ou do mesmo id em outro personagem, não esperam um pelo outro', { timeout: 2000 }, async () => {
  const { chamadas, soltar, entregar } = entregaDeMentira();
  const porVez = umaEntregaPorVez(entregar);
  const entregas = [porVez('a', 'ficha', pedido), porVez('a', 'ficha', { id: 'p2' }), porVez('b', 'outra', pedido)];
  await Promise.resolve();
  assert.deepEqual(chamadas.map(c => c.join(':')), ['a:ficha:p1', 'a:ficha:p2', 'b:outra:p1']);
  for (const { resolver } of soltar) resolver({ ok: true, notas: [] });
  await Promise.all(entregas);
});

test('Pedidos da wiki: entregue aqui, a entrega de cada minuto pula; entregar de novo à mão ainda chega à wiki', { timeout: 2000 }, async () => {
  const { chamadas, soltar, entregar } = entregaDeMentira();
  const porVez = umaEntregaPorVez(entregar);
  const feita = porVez('ator', 'ficha', pedido);
  await Promise.resolve();
  soltar[0].resolver({ ok: true, notas: [] });
  await feita;
  assert.equal(porVez.ocupado('ficha', pedido), true, 'a lista que a entrega de cada minuto leu antes ainda o tem como aprovado');
  const deNovo = porVez('ator', 'ficha', pedido);
  await Promise.resolve();
  assert.equal(chamadas.length, 2, 'à mão, chega à wiki, que recusa sem nada em dobro');
  soltar[1].rejeitar(new Error('Este pedido já foi resolvido.'));
  await assert.rejects(deNovo, /já foi resolvido/);
});

test('Pedidos da wiki: a entrega que falha (sem dinheiro ou com erro) não fica como entregue e pode ser tentada de novo', { timeout: 2000 }, async () => {
  const { chamadas, soltar, entregar } = entregaDeMentira();
  const porVez = umaEntregaPorVez(entregar);
  const semDinheiro = porVez('ator', 'ficha', pedido);
  const junto = porVez('ator', 'ficha', pedido);
  await Promise.resolve();
  soltar[0].resolver({ ok: false, notas: ['Dinheiro insuficiente na mesa: 10eb de 110eb.'] });
  assert.equal((await semDinheiro).ok, false);
  assert.equal(await junto, await semDinheiro);
  assert.equal(porVez.ocupado('ficha', pedido), false);
  const caiu = porVez('ator', 'ficha', pedido);
  const caiuJunto = porVez('ator', 'ficha', pedido);
  await Promise.resolve();
  soltar[1].rejeitar(new Error('A wiki não respondeu.'));
  await assert.rejects(caiu, /não respondeu/);
  await assert.rejects(caiuJunto, /não respondeu/);
  assert.equal(porVez.ocupado('ficha', pedido), false);
  const outra = porVez('ator', 'ficha', pedido);
  await Promise.resolve();
  assert.equal(chamadas.length, 3);
  soltar[2].resolver({ ok: true, notas: [] });
  assert.equal((await outra).ok, true);
});
