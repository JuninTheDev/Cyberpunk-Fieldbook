// Testes de referência dos dados nos cartões do chat (foundry-sistema/scripts/dados-do-cartao.mjs), sem Foundry: um Roll
// de mentira com os dados ({ faces, results }) e o total, como o Foundry 14 monta (o crítico do d10 do RED, p. 130, soma
// mais um d10 no 10 e tira um d10 no 1, pelo count negativo; ver rolagens.registrarCritico).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { dadosDoCartao } from '../../foundry-sistema/scripts/dados-do-cartao.mjs';

const roll = (dados, total) => ({
  total, dice: dados.map(({ faces, resultados }) => {
    const results = resultados.map(r => (typeof r === 'number' ? { result: r, active: true } : { active: true, ...r }));
    return { faces, results, total: results.filter(r => r.active).reduce((soma, r) => soma + (r.count ?? r.result), 0) };
  })
});
const d10 = (...resultados) => ({ faces: 10, resultados });
const d6 = (...resultados) => ({ faces: 6, resultados });
// O cartão sem as tags, para comparar: cada caixa entre colchetes (com a marca), o resto e o total.
const lido = html => html.replace('<div class="dados-do-cartao">', '').replace('</div>', '')
  .replace(/<span class="dado( (maximo|minimo))?">(\d+)<\/span>/g, (_, __, marca, valor) => `[${valor}${marca ? `:${marca}` : ''}]`)
  .replace(/<i class="resto">([^<]+)<\/i>/g, ' $1').replace(/<i>([^<]+)<\/i>/g, ' $1 ').replace(/<b class="total">(\d+)<\/b>/, ' = $1').replace(/\s+/g, ' ').trim();

test('Dados no cartão: o d10 e o que soma além dele, com o total (o teste comum)', () => {
  assert.equal(lido(dadosDoCartao(roll([d10(5)], 19))), '[5] +14 = 19');
  assert.equal(dadosDoCartao(roll([d10(5)], 19)), '<div class="dados-do-cartao"><span class="dado">5</span><i class="resto">+14</i><b class="total">19</b></div>');
});

test('Dados no cartão: o crítico do d10 (RED p. 130): o 10 marcado e o d10 a mais; o 1 e o d10 que ele tira, marcados e com o menos', () => {
  assert.equal(lido(dadosDoCartao(roll([d10({ result: 10, exploded: true }, 4)], 27))), '[10:maximo] + [4] +13 = 27');
  assert.equal(lido(dadosDoCartao(roll([d10(1, { result: 6, count: -6, failure: true })], 4))), '[1:minimo] − [6:minimo] +9 = 4');
  // Sem o crítico (o Death Save, a tabela da lesão, o Backup): o 10 e o 1 não se marcam.
  assert.equal(lido(dadosDoCartao(roll([d10(10)], 12), { critico: false })), '[10] +2 = 12');
  assert.equal(lido(dadosDoCartao(roll([d10(1)], 1), { critico: false })), '[1] = 1');
});

test('Dados no cartão: o dano (os 6 do crítico marcados, só com o crítico), o × do autofogo e o modificador depois dele', () => {
  assert.equal(lido(dadosDoCartao(roll([d6(6, 6, 3)], 15), { seis: true })), '[6:maximo] + [6:maximo] + [3] = 15');
  assert.equal(lido(dadosDoCartao(roll([d6(6, 2, 3)], 11))), '[6] + [2] + [3] = 11');
  // (2d6) × 3 + 2: 4 + 5 = 9, × 3 = 27, + 2 = 29 (regras.expressaoDoDano: o modificador entra depois da multiplicação).
  assert.equal(lido(dadosDoCartao(roll([d6(4, 5)], 29), { multiplicador: 3 })), '[4] + [5] ×3 +2 = 29');
  assert.equal(lido(dadosDoCartao(roll([d6(4, 5)], 7))), '[4] + [5] −2 = 7');
});

test('Dados no cartão: vários Rolls (o Backup: o d10 e o d6) separados, sem o total; os dados descartados não aparecem', () => {
  assert.equal(lido(dadosDoCartao([roll([d10(3)], 3), roll([d6(5)], 5)], { critico: false, total: false })), '[3] · [5]');
  // O Foundry marca o descartado (o kh, o kl) como discarded e inativo.
  assert.equal(lido(dadosDoCartao(roll([d10(7, { result: 2, active: false }, { result: 9, discarded: true, active: false })], 7))), '[7] = 7');
});
