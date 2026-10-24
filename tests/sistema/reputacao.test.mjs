// C41.3: wiki system-rules.js:539, p. 193–194; má fama absoluta confirmada pelo usuário em 2026-10-24.
// O CORE 0.92.4 oferece Facedown e ledger; o reconhecimento não tem um fluxo automatizado de referência no CORE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { nivelDeReconhecimento, reconhecimentoPorReputacao } from '../../foundry-sistema/scripts/regras-reputacao.mjs';

test('C41.3 fonte: ao conhecer alguém novo, a wiki pede 1d10 abaixo da própria Reputação, separado do Facedown', () => {
  const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
  const regra = wiki.split('\n').find(linha => linha.includes("section('Reputação e facedown', '193–194'"));
  assert.ok(regra);
  assert.ok(regra.includes('Ao conhecer alguém novo, role 1d10: <b>abaixo do seu nível de Reputação</b>'));
  assert.ok(regra.includes('a pessoa já ouviu falar de você (para o bem ou para o mal).'));
  assert.ok(regra.includes('Facedown: COOL + Reputação + 1d10 (reputação de covarde conta negativa)'));
});

test('C41.3 nível: aceita zero e os dez níveis da tabela como números inteiros', () => {
  for (const nivel of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) assert.equal(nivelDeReconhecimento(nivel), nivel);
});

test('C41.3 má fama: −5 reconhece como 5 e todos os negativos válidos usam magnitude, inclusive zero', () => {
  for (const [reputacao, nivel] of [[-0, 0], [-1, 1], [-2, 2], [-3, 3], [-4, 4], [-5, 5], [-6, 6], [-7, 7], [-8, 8], [-9, 9], [-10, 10]]) {
    assert.equal(nivelDeReconhecimento(reputacao), nivel);
  }
  assert.equal(reconhecimentoPorReputacao(-5, 4), true);
  assert.equal(reconhecimentoPorReputacao(-5, 5), false);
});

const reputacoesInvalidas = [11, -11, 100, -100, 1.5, -1.5, 10.1, -10.1, NaN, Infinity, -Infinity,
  Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, '5', '-5', '', ' ', true, false, null, undefined, [], [5], {}, 5n, Symbol('5')];

test('C41.3 nível: fora da tabela, fracionário, infinito, NaN e tipos coercíveis são inválidos, sem arredondar nem limitar', () => {
  for (const reputacao of reputacoesInvalidas) assert.equal(nivelDeReconhecimento(reputacao), null);
  const armadilha = { valueOf: () => assert.fail('Não deve converter objeto em Reputação') };
  assert.equal(nivelDeReconhecimento(armadilha), null);
});

test('C41.3 reconhecimento: tabela completa de um d10 simples, empate falha; zero e um nunca, dez só com 1–9', () => {
  const sucessos = [[], [], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8, 9]];
  for (let nivel = 0; nivel <= 10; nivel++) {
    for (const reputacao of [nivel, -nivel]) {
      for (const dado of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        assert.equal(reconhecimentoPorReputacao(reputacao, dado), sucessos[nivel].includes(dado), `Reputação ${reputacao}, d10 ${dado}`);
      }
    }
  }
});

test('C41.3 dado: só um resultado inteiro de 1 a 10; zero, negativos, críticos estendidos e outros tipos nunca reconhecem', () => {
  const invalidos = [0, -1, 11, 12, 20, 1.5, 9.5, NaN, Infinity, -Infinity, '1', '', true, false, null, undefined, [], [1], {}, 1n, Symbol('1')];
  for (const dado of invalidos) assert.equal(reconhecimentoPorReputacao(10, dado), false);
  const armadilha = { valueOf: () => assert.fail('Não deve converter objeto em dado') };
  assert.equal(reconhecimentoPorReputacao(10, armadilha), false);
});

test('C41.3 reconhecimento: Reputação inválida nunca tem sucesso, mesmo com dado válido', () => {
  for (const reputacao of reputacoesInvalidas) {
    for (const dado of [1, 5, 10]) assert.equal(reconhecimentoPorReputacao(reputacao, dado), false);
  }
});
