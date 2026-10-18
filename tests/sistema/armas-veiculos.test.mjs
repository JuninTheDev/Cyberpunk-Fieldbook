import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { ARMAS_VEICULARES, prepararArmaVeicular } from '../../foundry-sistema/scripts/armas-veiculos.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const upgrade = (tipo, id = 'instalacao') => ({ ...structuredClone(catalogo[`core_upgrades:onboard-${tipo}`]), id,
  system: { ...structuredClone(catalogo[`core_upgrades:onboard-${tipo}`].system), instaladoEm: 'carro' } });
const preparar = tipo => {
  const acessorio = upgrade(tipo);
  const regra = ARMAS_VEICULARES[acessorio.flags['cpr-fieldbook'].catalogo];
  return prepararArmaVeicular(acessorio, catalogo[regra.modelo]);
};

// CORE: itemupgrade.onboard.machine.gun.yaml, p. 163; wiki: system-criacao.js, Nomad, Metralhadora instalada.
test('Metralhadora instalada: rifle com 30 balas, só autofogo e disparo frontal, sem recarregar dirigindo', () => {
  const arma = preparar('machine-gun');
  assert.equal(arma.name, 'Onboard Machine Gun');
  assert.equal(arma.type, 'arma');
  assert.equal(arma.system.tipo, 'assaultRifle');
  assert.equal(arma.system.dano, '5d6');
  assert.equal(arma.system.autofogo, 4);
  assert.equal(arma.system.supressivo, false);
  assert.deepEqual(arma.system.pente, { value: 0, max: 30 });
  assert.deepEqual(arma.flags['cpr-fieldbook'].armaVeicular, {
    tipo: 'metralhadora', soAutofogo: true, frontal: true, semRecargaDirigindo: true, upgrade: 'instalacao'
  });
});

// CORE: itemupgrade.onboard.flamethrower.yaml, p. 163; wiki: system-criacao.js e system-catalog.js, Lança-chamas.
test('Lança-chamas instalado: conserva a arma exótica do CORE e aceita outra orientação, sem recarregar dirigindo', () => {
  const arma = preparar('flamethrower');
  assert.equal(arma.system.tipo, 'shotgun');
  assert.equal(arma.system.pericia, 'heavy-weapons');
  assert.equal(arma.system.dano, '5d6');
  assert.deepEqual(arma.system.pente, { value: 0, max: 4 });
  assert.deepEqual(arma.system.municoes, ['shotgunShell']);
  assert.equal(arma.flags['cpr-fieldbook'].catalogo, 'core_weapons:flamethrower');
  assert.deepEqual(arma.flags['cpr-fieldbook'].armaVeicular, {
    tipo: 'lanca-chamas', soAutofogo: false, frontal: false, semRecargaDirigindo: true, upgrade: 'instalacao'
  });
});

// CORE: itemupgrade.onboard.melee.weapon.yaml, p. 164; wiki: system-rules.js, Corpo a corpo, Muito pesada.
test('Arma branca instalada: muito pesada de 4d6, CDT 1 e metade do SP, sem restrição de recarga ou frente', () => {
  const arma = preparar('melee-weapon');
  assert.equal(arma.system.tipo, 'vHeavyMelee');
  assert.equal(arma.system.pericia, 'melee-weapon');
  assert.equal(arma.system.aDistancia, false);
  assert.equal(arma.system.dano, '4d6');
  assert.equal(arma.system.cdt, 1);
  assert.equal(arma.system.ignorarArmadura, 50);
  assert.deepEqual(arma.flags['cpr-fieldbook'].armaVeicular, {
    tipo: 'arma-branca', soAutofogo: false, frontal: false, semRecargaDirigindo: false, upgrade: 'instalacao'
  });
});

test('Arma do veículo: fica instalada no carro, sem mãos, acessórios ou equipamento humano', () => {
  for (const tipo of ['machine-gun', 'flamethrower', 'melee-weapon']) {
    const arma = preparar(tipo);
    assert.equal(arma.system.instaladoEm, 'carro');
    assert.equal(arma.system.maos, 0);
    assert.equal(arma.system.slots, 0);
    assert.equal(arma.system.equipada, false);
  }
});

test('A arma nova não copia a identidade do modelo e guarda a identidade exata da instalação', () => {
  const acessorio = upgrade('machine-gun');
  const modelo = { ...structuredClone(catalogo['core_weapons:assault-rifle']), _id: 'modelo', id: 'modelo-derivado' };
  const arma = prepararArmaVeicular(acessorio, modelo);
  assert.equal('_id' in arma, false);
  assert.equal('id' in arma, false);
  assert.equal(arma.flags['cpr-fieldbook'].armaVeicular.upgrade, 'instalacao');
  delete acessorio.id;
  acessorio._id = 'instalacao-serializada';
  assert.equal(prepararArmaVeicular(acessorio, modelo).flags['cpr-fieldbook'].armaVeicular.upgrade, 'instalacao-serializada');
  delete acessorio._id;
  assert.equal(prepararArmaVeicular(acessorio, modelo).flags['cpr-fieldbook'].armaVeicular.upgrade, '');
});

test('A preparação e as edições da arma não alteram o catálogo, os efeitos ou o upgrade original', () => {
  const acessorio = upgrade('flamethrower');
  const modelo = structuredClone(catalogo['core_weapons:flamethrower']);
  modelo.system.equipada = true;
  modelo.effects = [{ name: 'Efeito do modelo', changes: [{ value: 1 }] }];
  modelo.flags.outro = { valor: 1 };
  const antes = structuredClone({ acessorio, modelo });
  const arma = prepararArmaVeicular(acessorio, modelo);
  assert.deepEqual({ acessorio, modelo }, antes);
  assert.equal(arma.system.equipada, false);
  assert.deepEqual(arma.effects, modelo.effects);
  assert.deepEqual(arma.flags['cpr-fieldbook'].origem, modelo.flags['cpr-fieldbook'].origem);
  arma.system.pente.value = 3;
  arma.system.municoes.push('outra');
  arma.effects[0].changes[0].value = 2;
  arma.flags.outro.valor = 3;
  arma.flags['cpr-fieldbook'].origem.id = 'outro';
  assert.deepEqual({ acessorio, modelo }, antes);
});

test('Só um upgrade veicular conhecido e instalado pode preparar uma arma válida', () => {
  const acessorio = upgrade('machine-gun');
  const modelo = catalogo['core_weapons:assault-rifle'];
  const recusados = [null, {}, { ...acessorio, type: 'arma' },
    { ...acessorio, flags: {} },
    { ...acessorio, flags: { 'cpr-fieldbook': { catalogo: 'core_upgrades:onboard-rocket-pod' } } },
    { ...acessorio, flags: { 'cpr-fieldbook': { catalogo: 'constructor' } } },
    { ...acessorio, system: { ...acessorio.system, alvo: 'arma' } },
    { ...acessorio, system: { ...acessorio.system, instaladoEm: '' } }];
  for (const recusado of recusados) assert.equal(prepararArmaVeicular(recusado, modelo), null);
  for (const invalido of [null, {}, { type: 'equipamento', system: {} }, { type: 'arma' }]) {
    assert.equal(prepararArmaVeicular(acessorio, invalido), null);
  }
});
