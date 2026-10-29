import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { RESISTENCIAS_MUNICAO, podeRepetirComInteligente, vulneraveisAoEmp, municaoPoeFogo, tempoEntreRodadas } from '../../foundry-sistema/scripts/regras.mjs';
import { migrarDados, PASSOS } from '../../foundry-sistema/scripts/migracao.mjs';

// Wiki, Combate (system-rules.js): 3 segundos por rodada; 20 rodadas são o minuto das munições.
test('O relógio do combate: a rodada avança três segundos, vinte avançam um minuto; voltar devolve o tempo', () => {
  assert.equal(tempoEntreRodadas(4, 5), 3);
  assert.equal(tempoEntreRodadas(4, 24), 60);
  assert.equal(tempoEntreRodadas(5, 4), -3);
  assert.equal(tempoEntreRodadas(4, 4), 0);
  assert.equal(tempoEntreRodadas(0, 1), 0);
  assert.equal(tempoEntreRodadas(1, 0), 0);
});

// Wiki, system-catalog.js, Munição (p. 344–347); CORE 0.92.4, descrições dos itens de core/ammo.
test('Munições: a perícia, a DV e os dados próprios da resistência, sem dano da arma', () => {
  assert.deepEqual(RESISTENCIAS_MUNICAO, {
    biotoxin: { pericia: 'resist-torture-drugs', dv: 15, dano: '3d6' },
    poison: { pericia: 'resist-torture-drugs', dv: 13, dano: '2d6' },
    sleep: { pericia: 'resist-torture-drugs', dv: 13 },
    flashbang: { pericia: 'resist-torture-drugs', dv: 15 },
    teargas: { pericia: 'resist-torture-drugs', dv: 13 },
    emp: { pericia: 'cybertech', dv: 15 }
  });
});

test('Incendiária: só o dano que atravessou a armadura põe fogo; crítico e escudo sozinhos não', () => {
  assert.equal(municaoPoeFogo('incendiary', { passou: true, bruto: 1 }), true);
  assert.equal(municaoPoeFogo('incendiary', { passou: false, bruto: 0, bonus: 5 }), false);
  assert.equal(municaoPoeFogo('incendiary', { passou: false, bruto: 0, escudoAblado: 10 }), false);
  assert.equal(municaoPoeFogo('basic', { passou: true, bruto: 12 }), false);
});

// Decisão do usuário, 17-10-2026: tiro mirado também pode repetir, conservando o local (G4 prova a cabeça ×2).
test('Inteligente RED: a margem de quatro inclui o empate e o tiro mirado; sem rajada', () => {
  const base = { efeito: 'smart', modo: 'tiro', local: 'corpo', ataque: 11, contra: 15 };
  assert.equal(podeRepetirComInteligente(base), true);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 15 }), true);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 10 }), false);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 16 }), false);
  assert.equal(podeRepetirComInteligente({ ...base, contra: null }), false);
  assert.equal(podeRepetirComInteligente({ ...base, efeito: 'basic' }), false);
  for (const local of ['cabeca', 'perna', 'item']) assert.equal(podeRepetirComInteligente({ ...base, local }), true);
  for (const modo of ['autofogo', 'supressivo', 'cartucho', 'explosivo', 'smart', 'corpo']) assert.equal(podeRepetirComInteligente({ ...base, modo }), false);
});

// Wiki, system-catalog.js: Inteligente inclui mísseis; CORE core/ammo/ammo.rocket.smart.yaml, p. 346.
test('Inteligente RED: o míssil também repete o lançamento em até quatro, sem liberar granada ou autofogo', () => {
  const base = { efeito: 'smart', modo: 'explosivo', municao: 'rocket', local: 'corpo', ataque: 11, contra: 15 };
  assert.equal(podeRepetirComInteligente(base), true);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 15 }), true);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 10 }), false);
  assert.equal(podeRepetirComInteligente({ ...base, ataque: 16 }), false);
  assert.equal(podeRepetirComInteligente({ ...base, municao: 'grenade' }), false);
  assert.equal(podeRepetirComInteligente({ ...base, modo: 'autofogo' }), false);
});

test('EMP: eletrônicos em uso; a blindagem protege a fundação e as opções do mesmo conjunto', () => {
  const item = (id, tipo, sistema) => ({ id, type: tipo, system: sistema });
  const itens = [
    item('braco', 'cyberware', { eletronico: true, instalado: true }),
    item('mao', 'cyberware', { eletronico: true, instalado: true, instaladoEm: 'braco' }),
    item('blindagem', 'cyberware', { eletronico: false, endurecido: true, instalado: true, instaladoEm: 'braco' }),
    item('outro', 'cyberware', { eletronico: true, instalado: true }),
    item('solto', 'cyberware', { eletronico: true, instalado: false }),
    item('agent', 'equipamento', { eletronico: true, uso: 'carregando' }),
    item('guardado', 'equipamento', { eletronico: true, uso: 'guardado' }),
    item('deck-guardado', 'cyberdeck', { eletronico: true, uso: 'guardado' }),
    item('hardware-guardado', 'upgrade', { eletronico: true, instaladoEm: 'deck-guardado' }),
    item('hardware-solto', 'upgrade', { eletronico: true, instaladoEm: 'apagado' }),
    item('endurecido', 'cyberdeck', { eletronico: true, endurecido: true, uso: 'equipado' }),
    item('roupa', 'roupa', { eletronico: false, uso: 'equipado' })
  ];
  assert.deepEqual(vulneraveisAoEmp(itens).map(i => i.id), ['outro', 'agent']);
  itens.find(i => i.id === 'blindagem').system.instalado = false;
  assert.deepEqual(vulneraveisAoEmp(itens).map(i => i.id), ['braco', 'mao', 'outro', 'agent']);
});

test('EMP: a migração recupera a proteção antiga sem sobrescrever a eletrônica do equipamento ou a edição já migrada', () => {
  const sistema = 'cpr-fieldbook';
  const catalogo = { escudo: { system: { eletronico: false, endurecido: true } }, agent: { system: { eletronico: true, endurecido: false } } };
  const dados = { items: [
    { type: 'cyberware', system: { eletronico: true, endurecido: false }, flags: { [sistema]: { catalogo: 'escudo' } } },
    { type: 'equipamento', system: { eletronico: false }, flags: { [sistema]: { catalogo: 'agent' } } },
    { type: 'cyberware', system: { eletronico: true, endurecido: false }, flags: { [sistema]: { catalogo: 'escudo', eletronicaMigrada: true } } }
  ] };
  const migrar = entrada => migrarDados(entrada, { documento: 'Actor', passos: [PASSOS.find(p => p.versao === 5)], catalogo });
  const novo = migrar(dados);
  assert.deepEqual(novo.items.map(i => [i.system.eletronico, i.system.endurecido]), [[false, true], [false, false], [true, false]]);
  assert.deepEqual(migrar(novo), novo);
  assert.equal(dados.items[0].system.endurecido, false);
});

test('Catálogo EMP: preserva o electronic e o providesHardening do CORE, inclusive a blindagem não eletrônica', () => {
  const { itens } = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8'));
  for (const [id, eletronico, endurecido] of [
    ['core_cyberware:hardened-shielding-cyber-arm', false, true],
    ['core_cyberware:hardened-shielding-cyber-leg', true, true],
    ['core_cyberware:cybereye', true, false], ['core_gear:agent', true, false], ['core_gear:cyberdeck', true, false],
    ['core_armor:light-armorjack-body', false, false]
  ]) {
    assert.equal(itens[id].system.eletronico, eletronico, id);
    assert.equal(itens[id].system.endurecido, endurecido, id);
    assert.equal(itens[id].flags['cpr-fieldbook'].eletronicaMigrada, true, id);
  }
});
