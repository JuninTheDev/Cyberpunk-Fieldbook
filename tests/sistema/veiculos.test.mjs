import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { protecoesDoVeiculo, danoNoVidro, danoNoVeiculo, techAtravessaVidro } from '../../foundry-sistema/scripts/regras-veiculos.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const vidro = catalogo['core_upgrades:bulletproof-glass'];
const chassis = catalogo['core_upgrades:armored-chassis'];

// Fontes: wiki, system-criacao.js: "O vidro vira cobertura (15 HP); da segunda vez, vidro denso (30 HP)."
// CORE 0.92.4, core/upgrades: Bulletproof Glass e Armored Chassis (RED p. 163).
test('Veículos: as descrições do CORE dão 15 ou 30 HP por janela e SP 13 no chassis, sem blindar o vidro', () => {
  assert.match(vidro.system.descricao, /cover with 15 HP/);
  assert.match(vidro.system.descricao, /second time to upgrade to 30HP/);
  assert.match(vidro.system.descricao, /windows\s+take damage individually/);
  assert.match(chassis.system.descricao, /Armors the vehicle to SP13/);
  assert.match(chassis.system.descricao, /Doesn't affect the\s+glass/);
  assert.deepEqual(protecoesDoVeiculo(), { sp: 0, vidro: 0 });
  assert.deepEqual(protecoesDoVeiculo([vidro]), { sp: 0, vidro: 15 });
  assert.deepEqual(protecoesDoVeiculo([vidro, vidro]), { sp: 0, vidro: 30 });
  assert.deepEqual(protecoesDoVeiculo([vidro, vidro, vidro]), { sp: 0, vidro: 30 });
  assert.deepEqual(protecoesDoVeiculo([chassis]), { sp: 13, vidro: 0 });
  assert.deepEqual(protecoesDoVeiculo([chassis, chassis, vidro]), { sp: 13, vidro: 15 });
});

test('Veículos: o catálogo identifica upgrade renomeado; um item manual usa o nome exato do CORE', () => {
  assert.deepEqual(protecoesDoVeiculo([{ ...vidro, name: 'Vidro da van' }, { ...chassis, name: 'Blindagem da van' }]), { sp: 13, vidro: 15 });
  assert.deepEqual(protecoesDoVeiculo([{ name: ' bulletproof GLASS ' }, { name: 'Armored Chassis' }]), { sp: 13, vidro: 15 });
  assert.deepEqual(protecoesDoVeiculo([{ name: 'Heavy Chassis' }, { name: 'Bulletproof Glass decorativo' }]), { sp: 0, vidro: 0 });
  assert.deepEqual(protecoesDoVeiculo([{ name: 'Bulletproof Glass', flags: { 'cpr-fieldbook': { catalogo: 'outro:vidro' } } }]), { sp: 0, vidro: 0 });
});

// Wiki, system-rules.js, Cobertura (RED p. 182–183): em 0 HP, a cobertura é destruída e a sobra se perde.
test('Vidro blindado: dano 10 deixa 5 dos 15 HP; o ocupante continua protegido', () => {
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 10 }), { antes: 15, depois: 5, perdeu: 10, passou: false });
});

test('Vidro blindado: tiro de dano 20 destrói os 15 HP sem passar os cinco excedentes', () => {
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 20 }), { antes: 15, depois: 0, perdeu: 15, passou: false });
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 15 }), { antes: 15, depois: 0, perdeu: 15, passou: false });
});

// Wiki, Explosivos (RED p. 174): cobertura que sobrevive protege; destruída, o dano total alcança o alvo.
test('Vidro blindado: explosivo de dano 20 destrói 15 HP e passa; sem destruir, protege', () => {
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 20, explosivo: true }), { antes: 15, depois: 0, perdeu: 15, passou: true });
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 15, explosivo: true }), { antes: 15, depois: 0, perdeu: 15, passou: true });
  assert.deepEqual(danoNoVidro({ hp: 15, dano: 10, explosivo: true }), { antes: 15, depois: 5, perdeu: 10, passou: false });
});

// Wiki, Veículos (RED p. 189–192): vidro comum não é cobertura. Um vidro já destruído também não para o tiro.
test('Vidro com zero HP não perde mais HP nem protege o ocupante de tiro ou explosivo', () => {
  assert.deepEqual(danoNoVidro({ hp: 0, dano: 20 }), { antes: 0, depois: 0, perdeu: 0, passou: true });
  assert.deepEqual(danoNoVidro({ hp: 0, dano: 20, explosivo: true }), { antes: 0, depois: 0, perdeu: 0, passou: true });
});

test('Vidro denso: 30 HP recebem dano 20 e conservam 10 HP, inclusive contra explosivo', () => {
  assert.deepEqual(danoNoVidro({ hp: 30, dano: 20 }), { antes: 30, depois: 10, perdeu: 20, passou: false });
  assert.deepEqual(danoNoVidro({ hp: 30, dano: 20, explosivo: true }), { antes: 30, depois: 10, perdeu: 20, passou: false });
});

// Conta confirmada pelo usuário em 2026-10-18; o SP 13 vem do Armored Chassis do CORE.
test('SDP: dano 20 contra SP 13 tira sete SDP e um SP, sem bônus de crítico nem cabeça dobrada', () => {
  assert.deepEqual(danoNoVeiculo({ sdp: 50, dano: 20, sp: 13, bonus: 5, local: 'cabeca' }), {
    antes: 50, depois: 43, perdeu: 7, sp: 13, spEfetivo: 13, passou: true, ablado: 1
  });
  assert.equal(danoNoVeiculo({ sdp: 50, dano: 20, sp: 13, ablacao: 2 }).ablado, 2);
});

test('SDP: dano igual ou menor que o SP não atravessa nem causa ablação; sem SP o dano entra inteiro', () => {
  for (const dano of [0, 12, 13]) assert.deepEqual(danoNoVeiculo({ sdp: 50, dano, sp: 13, ablacao: 2 }), {
    antes: 50, depois: 50, perdeu: 0, sp: 13, spEfetivo: 13, passou: false, ablado: 0
  });
  assert.deepEqual(danoNoVeiculo({ sdp: 50, dano: 20 }), {
    antes: 50, depois: 30, perdeu: 20, sp: 0, spEfetivo: 0, passou: true, ablado: 0
  });
});

test('SDP: armas conservam SP efetivo e ablação; destruir o veículo para em zero', () => {
  assert.deepEqual(danoNoVeiculo({ sdp: 50, dano: 20, sp: 13, ignorarPct: 50, ablacao: 2 }), {
    antes: 50, depois: 37, perdeu: 13, sp: 13, spEfetivo: 7, passou: true, ablado: 2
  });
  assert.deepEqual(danoNoVeiculo({ sdp: 5, dano: 20, sp: 1, ignorarAbaixo: 7, ablacao: 2 }), {
    antes: 5, depois: 0, perdeu: 5, sp: 1, spEfetivo: 0, passou: true, ablado: 1
  });
});

test('Tech carregada atravessa vidro fino; Nekomata também atravessa grosso, pela espessura original', () => {
  assert.equal(techAtravessaVidro({ carga: true, max: 15 }), true);
  assert.equal(techAtravessaVidro({ carga: true, max: 30, hpAtual: 5 }), false);
  assert.equal(techAtravessaVidro({ carga: true, grossa: true, max: 30 }), true);
  assert.equal(techAtravessaVidro({ carga: false, max: 15 }), false);
  assert.equal(techAtravessaVidro({ carga: false, grossa: true, max: 30 }), false);
  assert.equal(techAtravessaVidro({ carga: true, max: 0 }), false);
});
