// Testes da terapia e da ciberpsicose (o C21; foundry-sistema/scripts/terapia.mjs), sem Foundry, pela wiki ("Humanidade,
// terapia e drogas", system-rules.js): a tabela da Terapia (p. 229–230), o teste que precisa superar a DV, o ganho sem
// passar da Humanidade máxima, a dependência tratada por um ano e o estado mental pela tabela da Ciberpsicose (p.
// 230–232), com a extrema na Humanidade negativa.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comDependenciaTratada, dependenciaTratada, estadoMental, humanidadeDepoisDaTerapia, passouNaTerapia, piorou, TERAPIAS, UM_ANO
} from '../../foundry-sistema/scripts/terapia.mjs';

test('terapia (C21): a tabela da wiki (p. 229–230): as DVs, o ganho, o custo e os materiais', () => {
  assert.deepEqual(TERAPIAS.padrao, { rotulo: 'Perda de Humanidade padrão', dv: 15, ganho: '2d6', custo: 500, materiais: 100 });
  assert.deepEqual(TERAPIAS.extrema, { rotulo: 'Perda de Humanidade extrema', dv: 17, ganho: '4d6', custo: 1000, materiais: 500 });
  assert.deepEqual(TERAPIAS.dependencia, { rotulo: 'Dependência', dv: 15, custo: 1000, materiais: 500 });
});

test('terapia (C21): o teste precisa superar a DV (p. 128): o empate falha', () => {
  assert.equal(passouNaTerapia(16, 15), true);
  assert.equal(passouNaTerapia(15, 15), false);
  assert.equal(passouNaTerapia(17, 17), false);
  assert.equal(passouNaTerapia(18, 17), true);
});

test('terapia (C21): o ganho não passa da Humanidade máxima; quem está acima dela não perde', () => {
  assert.equal(humanidadeDepoisDaTerapia(15, 40, 7), 22);
  assert.equal(humanidadeDepoisDaTerapia(36, 40, 7), 40, 'para na máxima');
  assert.equal(humanidadeDepoisDaTerapia(40, 40, 7), 40);
  assert.equal(humanidadeDepoisDaTerapia(44, 40, 7), 44, 'acima da máxima (a peça tirada depois): fica');
  assert.equal(humanidadeDepoisDaTerapia(-3, 40, 7), 4, 'da negativa');
});

test('terapia (C21): a dependência tratada vale um ano para aquela droga; outra droga ou depois do ano, não', () => {
  const agora = 1000;
  const lista = comDependenciaTratada([], 'core_drugs:boost', agora);
  assert.deepEqual(lista, [{ droga: 'core_drugs:boost', ate: agora + UM_ANO }]);
  assert.equal(UM_ANO, 31536000);
  assert.equal(dependenciaTratada(lista, 'core_drugs:boost', agora + UM_ANO - 1), true);
  assert.equal(dependenciaTratada(lista, 'core_drugs:boost', agora + UM_ANO), false, 'o ano acabou');
  assert.equal(dependenciaTratada(lista, 'core_drugs:smash', agora), false);
  assert.equal(dependenciaTratada(undefined, 'core_drugs:boost', agora), false);
  // Tratar de novo renova o prazo daquela droga e limpa as vencidas.
  const renovada = comDependenciaTratada([...lista, { droga: 'core_drugs:smash', ate: 10 }], 'core_drugs:boost', agora + 500);
  assert.deepEqual(renovada, [{ droga: 'core_drugs:boost', ate: agora + 500 + UM_ANO }]);
});

test('ciberpsicose (C21): o estado mental pela EMP de agora (a tabela da wiki, p. 230–232); a Humanidade negativa é a extrema', () => {
  // EMP base 6 (Humanidade 60): a dezena da Humanidade.
  const estados = [60, 30, 29, 20, 19, 10, 9, 0, -1].map(h => estadoMental(h, 6));
  assert.deepEqual(estados, ['nenhum', 'nenhum', 'limitrofe', 'limitrofe', 'dissociativo', 'dissociativo', 'ciberpsicose', 'ciberpsicose', 'extrema']);
  assert.equal(estadoMental(50, 2), 'limitrofe', 'a EMP de agora não passa da base');
  assert.equal(piorou('nenhum', 'limitrofe'), true);
  assert.equal(piorou('ciberpsicose', 'extrema'), true);
  assert.equal(piorou('dissociativo', 'dissociativo'), false);
  assert.equal(piorou('extrema', 'ciberpsicose'), false, 'melhorar não avisa');
});
