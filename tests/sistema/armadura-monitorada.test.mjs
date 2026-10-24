import assert from 'node:assert/strict';
import test from 'node:test';
import { armaduraDoLocal, armaduraMonitoradaDoLocal, mudancasDoSPMonitorado } from '../../foundry-sistema/scripts/regras-armadura.mjs';
import { escolherArmaduraMonitorada, mudarSPMonitorado, mostrarSPNoToken } from '../../foundry-sistema/scripts/armadura-monitorada.mjs';

const pecas = () => [
  { id: 'forte', type: 'armadura', system: { equipada: true, sp: { corpo: { value: 11, max: 13 }, cabeca: { value: 0, max: 0 } } } },
  { id: 'leve', type: 'armadura', system: { equipada: true, sp: { corpo: { value: 4, max: 7 }, cabeca: { value: 5, max: 7 } } } },
  { id: 'guardada', type: 'armadura', system: { equipada: false, sp: { corpo: { value: 18, max: 18 }, cabeca: { value: 18, max: 18 } } } }
];
test('C34.3: monitorar não altera o maior SP; inválida/guardada/incompatível volta à automática', () => {
  const itens = pecas();
  assert.equal(armaduraMonitoradaDoLocal(itens, 'corpo', 'leve').id, 'leve');
  assert.equal(armaduraDoLocal(itens, 'corpo').id, 'forte');
  for (const id of ['', 'apagada', 'guardada']) assert.equal(armaduraMonitoradaDoLocal(itens, 'corpo', id).id, 'forte');
  assert.equal(armaduraMonitoradaDoLocal(itens, 'cabeca', 'forte').id, 'leve');
  assert.equal(armaduraMonitoradaDoLocal(itens, 'corpo', 'nenhuma'), null);
  assert.equal(armaduraMonitoradaDoLocal(itens, 'errado'), null);
});
test('C34.3: baixar a barra abla todas as camadas; subir repara só a monitorada e respeita limites', () => {
  const itens = pecas(), antes = structuredClone(itens);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'leve', 2), [{ id: 'forte', valor: 9 }, { id: 'leve', valor: 2 }]);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'leve', -1, true), [{ id: 'forte', valor: 10 }, { id: 'leve', valor: 3 }]);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'leve', 99), [{ id: 'leve', valor: 7 }]);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'leve', -99), [{ id: 'forte', valor: 7 }, { id: 'leve', valor: 0 }]);
  for (const valor of [NaN, Infinity, 1.5, '3']) assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', '', valor), []);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'nenhuma', -1, true), []);
  assert.deepEqual(mudancasDoSPMonitorado(itens, 'corpo', 'leve', 4), []);
  assert.deepEqual(itens, antes);
});
test('C34.3: APIs recusam observador/outros tipos e serializam duas edições do mesmo ator', async () => {
  const itens = pecas();
  const ator = { type: 'capanga', isOwner: true, items: itens, system: { armaduraMonitorada: { corpo: 'leve' } },
    update: async dados => dados,
    updateEmbeddedDocuments: async (tipo, dados) => {
      assert.equal(tipo, 'Item');
      await new Promise(r => setTimeout(r, 1));
      for (const d of dados) itens.find(i => i.id === d._id).system.sp.corpo.value = d['system.sp.corpo.value'];
    } };
  await Promise.all([mudarSPMonitorado(ator, 'spMonitorado.corpo', -1, true), mudarSPMonitorado(ator, 'spMonitorado.corpo', -1, true)]);
  assert.deepEqual(itens.map(i => i.system.sp.corpo.value), [9, 2, 18]);
  assert.equal(await escolherArmaduraMonitorada(ator, 'corpo', 'guardada'), null);
  assert.equal(await escolherArmaduraMonitorada(ator, 'corpo', 'outro'), null);
  assert.deepEqual(await escolherArmaduraMonitorada(ator, 'corpo', 'nenhuma'), { 'system.armaduraMonitorada.corpo': 'nenhuma' });
  for (const a of [null, { ...ator, isOwner: false }, { ...ator, type: 'conteiner' }]) {
    assert.equal(await escolherArmaduraMonitorada(a, 'corpo', 'leve'), null);
    assert.equal(await mudarSPMonitorado(a, 'spMonitorado.corpo', -1, true), null);
    assert.equal(await mostrarSPNoToken(a, 'corpo'), null);
  }
  assert.equal(await escolherArmaduraMonitorada(ator, 'foo', ''), null);
  assert.equal(await mudarSPMonitorado(ator, 'spMonitorado.foo', 1), null);
});
