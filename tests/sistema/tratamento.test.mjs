// Testes de referência da correção rápida e do tratamento da lesão crítica (foundry-sistema/scripts/tratamento.mjs), sem
// Foundry: as DVs das linhas da tabela da wiki ("Dano e cura", p. 187 e 223) e a regra de superar a DV (p. 128).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { opcoesDaLesao, resolveDeVez, resultadoDoTratamento } from '../../foundry-sistema/scripts/tratamento.mjs';

// As lesões como o catálogo as traz (paliativo e tratamento; 0 = aquela perícia não serve).
const PERNA_QUEBRADA = { paliativo: { primeirosSocorros: 0, paramedico: 13 }, tratamento: { paramedico: 15, cirurgia: 13 } };
const MUSCULO_ROMPIDO = { paliativo: { primeirosSocorros: 13, paramedico: 13 }, tratamento: { paramedico: 0, cirurgia: 0 } };
const BRACO_DESMEMBRADO = { paliativo: { primeirosSocorros: 0, paramedico: 0 }, tratamento: { paramedico: 0, cirurgia: 17 } };
const lido = opcoes => opcoes.map(opcao => `${opcao.rotulo} DV${opcao.dv}`).join(', ');

test('Correção rápida e tratamento (wiki, p. 187): as perícias e as DVs de cada lesão, só as que servem', () => {
  assert.equal(lido(opcoesDaLesao(PERNA_QUEBRADA, 'correcao')), 'Paramédico DV13');
  assert.equal(lido(opcoesDaLesao(PERNA_QUEBRADA, 'tratamento')), 'Paramédico DV15, Cirurgia DV13');
  assert.equal(lido(opcoesDaLesao(MUSCULO_ROMPIDO, 'correcao')), 'Primeiros Socorros DV13, Paramédico DV13');
  assert.equal(lido(opcoesDaLesao(MUSCULO_ROMPIDO, 'tratamento')), '');
  assert.equal(lido(opcoesDaLesao(BRACO_DESMEMBRADO, 'correcao')), '');
  assert.equal(lido(opcoesDaLesao(BRACO_DESMEMBRADO, 'tratamento')), 'Cirurgia DV17');
  // A Cirurgia é a rolagem de Role do Medtech; as outras, perícias.
  assert.deepEqual(opcoesDaLesao(PERNA_QUEBRADA, 'tratamento').map(opcao => [opcao.id, Boolean(opcao.role)]), [['paramedic', false], ['cirurgia', true]]);
});

test('Correção rápida e tratamento (wiki, p. 128 e 223): precisa superar a DV; a correção tira o efeito até o fim do dia, e na lesão sem tratamento resolve de vez; o tratamento cura', () => {
  // Empatar com a DV não basta.
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 13, dv: 13, sistema: PERNA_QUEBRADA }), 'falhou');
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 14, dv: 13, sistema: PERNA_QUEBRADA }), 'corrigida');
  assert.equal(resultadoDoTratamento({ tipo: 'correcao', total: 14, dv: 13, sistema: MUSCULO_ROMPIDO }), 'curada');
  assert.equal(resultadoDoTratamento({ tipo: 'tratamento', total: 15, dv: 15, sistema: PERNA_QUEBRADA }), 'falhou');
  assert.equal(resultadoDoTratamento({ tipo: 'tratamento', total: 16, dv: 15, sistema: PERNA_QUEBRADA }), 'curada');
  assert.equal(resolveDeVez(MUSCULO_ROMPIDO), true);
  assert.equal(resolveDeVez(PERNA_QUEBRADA), false);
});
