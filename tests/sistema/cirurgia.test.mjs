// Testes de referência da cirurgia do cyberware (o C41, parte 4; foundry-sistema/scripts/regras-cirurgia.mjs), sem
// Foundry: os lugares, as DVs e os custos da wiki ("Hospital, Trauma Team e instalação", p. 223–226), o lugar mínimo da
// peça, quem opera e quem paga, superar a DV (p. 128) e a DV da retirada.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { cirurgiaDeuCerto, HORAS_DA_RETIRADA, LUGAR_DA_CIRURGIA, lugaresDaPeca, pedeCirurgia, planoDaInstalacao, planoDaRetirada } from '../../foundry-sistema/scripts/regras-cirurgia.mjs';

test('Cirurgia (wiki, p. 223–226): as DVs e os custos de cada lugar são os da tabela da wiki', () => {
  const regras = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  const linhas = [['Loja', 'mall'], ['Clínica', 'clinic'], ['Hospital', 'hospital']];
  for (const [nome, lugar] of linhas) {
    const { dv, custo } = LUGAR_DA_CIRURGIA[lugar];
    assert.ok(regras.includes(`['${nome}', 'DV${dv}', '${custo.toLocaleString('pt-BR')}eb']`), `${nome}: DV${dv}, ${custo}eb`);
  }
  assert.ok(regras.includes('Retirar cyberware de um corpo sem destruí-lo: Medtech, mesma DV da instalação, 4 horas; falhar destrói a peça.'));
  assert.equal(HORAS_DA_RETIRADA, 4);
});

test('Cirurgia: a peça se instala no lugar dela ou num melhor; a sem lugar (o notApplicable do CORE) não pede cirurgia', () => {
  assert.deepEqual(lugaresDaPeca('mall'), ['mall', 'clinic', 'hospital']);
  assert.deepEqual(lugaresDaPeca('clinic'), ['clinic', 'hospital']);
  assert.deepEqual(lugaresDaPeca('hospital'), ['hospital']);
  assert.deepEqual(lugaresDaPeca('notApplicable'), []);
  assert.deepEqual(lugaresDaPeca(''), []);
  assert.equal(pedeCirurgia('clinic'), true);
  assert.equal(pedeCirurgia('notApplicable'), false);
});

test('Cirurgia: o ripperdoc cobra o lugar escolhido (se marcado) e precisa do dinheiro; o Medtech rola a DV e não cobra', () => {
  assert.deepEqual(planoDaInstalacao({ local: 'clinic', lugar: 'clinic', dinheiro: 700 }),
    { cirurgia: true, lugar: 'clinic', quem: 'ripperdoc', dv: 15, custo: 500, onde: 'na clínica', rola: false });
  // Um lugar melhor custa o dele e tem a DV dele.
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'hospital', dinheiro: 1000 }).custo, 1000);
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'hospital', dinheiro: 1000 }).dv, 17);
  // Sem cobrar, nada sai; o dinheiro não importa.
  assert.equal(planoDaInstalacao({ local: 'hospital', lugar: 'hospital', cobrar: false, dinheiro: 0 }).custo, 0);
  // O Medtech: rola e não cobra, nem sem dinheiro.
  const medtech = planoDaInstalacao({ local: 'clinic', lugar: 'hospital', quem: 'medtech', dinheiro: 0 });
  assert.deepEqual([medtech.dv, medtech.custo, medtech.rola], [17, 0, true]);
  // Recusas: abaixo do lugar da peça, lugar inválido, quem inválido, dinheiro que não dá (o exato dá).
  assert.equal(planoDaInstalacao({ local: 'clinic', lugar: 'mall', dinheiro: 1000 }).erro, 'Esta peça só se instala na clínica ou melhor (DV15).');
  assert.equal(planoDaInstalacao({ local: 'hospital', lugar: 'clinic', dinheiro: 1000 }).erro, 'Esta peça só se instala no hospital (DV17).');
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'praia', dinheiro: 1000 }).erro, 'Escolha onde instalar: shopping, clínica ou hospital.');
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'mall', quem: 'vizinho', dinheiro: 1000 }).erro, 'Escolha quem opera: o ripperdoc ou um Medtech.');
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'hospital', dinheiro: 999 }).erro, 'Dinheiro insuficiente: tem 999eb, e a instalação no hospital custa 1000eb.');
  assert.equal(planoDaInstalacao({ local: 'mall', lugar: 'mall', dinheiro: 100 }).custo, 100);
  // A peça sem lugar: sem cirurgia, sem custo, sem DV.
  assert.deepEqual(planoDaInstalacao({ local: 'notApplicable', lugar: 'hospital', dinheiro: 0 }), { cirurgia: false, lugar: '', dv: null, custo: 0, onde: 'sem cirurgia' });
});

test('Cirurgia (p. 128): precisa superar a DV; o empate falha', () => {
  assert.equal(cirurgiaDeuCerto({ total: 15, dv: 15 }), false);
  assert.equal(cirurgiaDeuCerto({ total: 16, dv: 15 }), true);
  assert.equal(cirurgiaDeuCerto({ total: 12, dv: 13 }), false);
});

test('Retirada: a DV do lugar onde a peça foi instalada (o que a instalação guardou) ou, sem ele, a do lugar dela', () => {
  assert.deepEqual(planoDaRetirada({ local: 'mall', instaladaEm: 'hospital' }), { lugar: 'hospital', dv: 17, onde: 'no hospital', horas: 4 });
  assert.equal(planoDaRetirada({ local: 'clinic', instaladaEm: '' }).dv, 15);
  // Um lugar guardado abaixo do da peça (ou inválido) não vale: fica o da peça.
  assert.equal(planoDaRetirada({ local: 'hospital', instaladaEm: 'mall' }).dv, 17);
  assert.equal(planoDaRetirada({ local: 'clinic', instaladaEm: 'praia' }).dv, 15);
  assert.equal(planoDaRetirada({ local: 'notApplicable', instaladaEm: '' }), null);
});
