// C43: wiki system-rules.js:457, :463 e :549; modificadores do CORE 0.93 executados como referência.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  danoCriticoConfigurado, lerModificadorDano, parametrosDoDano, resolverCriticoDaArma,
  resultadoRed, retirarMarcadoresDano, sanitizarFormulaDano, separarModificadores
} from '../../foundry-sistema/scripts/regras-formulas.mjs';

const fonte = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const wiki = fonte('system-rules.js');
const wiki2077 = fonte('system-2077.js');
const core = fonte('fvtt-cyberpunk-red-core-dev/src/modules/rolls/cpr-die-extended.js');
const sanitizadorCore = fonte('fvtt-cyberpunk-red-core-dev/src/modules/rolls/sanitize-damage-formula.js');

// Só a infraestrutura do dado é substituída: red, dmg, ab, cd e a separação são os métodos reais do CORE.
class DadoDeReferencia {
  static MODIFIERS = { x: 'explode', xo: 'explodeOnce', kh: 'keep', kl: 'keep', r: 'reroll' };
  constructor({ faces = 6, results = [], modifiers = [] } = {}) {
    Object.assign(this, { faces, results, modifiers, options: {}, extras: [] });
  }
  async roll() {
    assert.ok(this.extras.length, 'o CORE pediu só o dado extra previsto');
    const resultado = { result: this.extras.shift(), active: true };
    this.results.push(resultado);
    return resultado;
  }
}

// A comparação de DiceTerm no Foundry 14 (dice/terms/dice.mjs:493–505).
const compararReferencia = (resultado, comparacao, limite) => ({
  '=': resultado === limite, '<': resultado < limite, '<=': resultado <= limite,
  '>': resultado > limite, '>=': resultado >= limite
})[comparacao];
const DadoCore = vm.runInNewContext(`
  Number.isNumeric = valor => valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
  ${core.replace('export default class CPRDie', 'class CPRDie')}
  CPRDie;
`, { foundry: { dice: { terms: { Die: DadoDeReferencia, DiceTerm: { compareResult: compararReferencia } } } } });
const dadoCore = (faces, resultados, modificadores = []) => new DadoCore({
  faces, modifiers: modificadores, results: resultados.map(resultado => ({ result: resultado, active: true }))
});
const limparCore = vm.runInNewContext(`${sanitizadorCore
  .replace('export function sanitizeDamageFormula', 'function sanitizeDamageFormula')
  .replace('export function stripDamageMarkers', 'function stripDamageMarkers')
  .replace('export default sanitizeDamageFormula;', '')}
  sanitizeDamageFormula;`);

test('C43 red: a wiki soma no 10, subtrai no 1 e não encadeia o dado extra', () => {
  assert.ok(wiki.includes('<b>10 natural:</b> +1d10 extra. <b>1 natural:</b> −1d10. Só uma vez; o dado extra não explode.'));
  assert.deepEqual(resultadoRed(10, 10), { total: 20, critico: 'sucesso', multiplicadorExtra: 1 });
  assert.deepEqual(resultadoRed(1, 10), { total: -9, critico: 'falha', multiplicadorExtra: -1 });
  assert.deepEqual(resultadoRed(1, 1), { total: 0, critico: 'falha', multiplicadorExtra: -1 });
  assert.deepEqual(resultadoRed(6, 10), { total: 6, critico: null, multiplicadorExtra: 0 });
});

test('C43 red: todas as faces do d10 concordam com o método real do CORE 0.93', async () => {
  for (let natural = 1; natural <= 10; natural++) {
    for (const extra of [1, 6, 10]) {
      const dado = dadoCore(10, [natural], ['red']);
      dado.extras = [extra];
      await dado.red('red');
      const resultado = resultadoRed(natural, extra);
      assert.equal(resultado.total, dado.results.reduce((soma, face) => soma + (face.count ?? face.result), 0));
      assert.equal(resultado.critico === 'sucesso', dado.results.some(face => face.cprSuccess));
      assert.equal(resultado.critico === 'falha', dado.results.some(face => face.cprFailure));
      assert.equal(dado.results.length, resultado.multiplicadorExtra ? 2 : 1, 'uma vez só, mesmo no 10 extra');
    }
  }
});

test('C43 red: outro dado usa o máximo, aceita o limiar da 0.93 e deixa o d1 simples', async () => {
  for (const [faces, natural, extra, limiar] of [[6, 6, 6, 6], [6, 1, 6, 6], [10, 5, 10, 5], [1, 1, 1, 1]]) {
    const dado = dadoCore(faces, [natural], [`red${limiar}`]);
    dado.extras = [extra];
    await dado.red(`red${limiar}`);
    const resultado = resultadoRed(natural, extra, faces, limiar);
    assert.equal(resultado.total, dado.results.reduce((soma, face) => soma + (face.count ?? face.result), 0));
    assert.equal(dado.results.length, resultado.multiplicadorExtra ? 2 : 1);
  }
});

test('C43 fórmulas: separa dmgab2cd10 preservando cada parâmetro, como o CORE', () => {
  const palavras = { ...DadoDeReferencia.MODIFIERS, red: 'red', crit: 'crit', dmg: 'dmg', ab: 'ab', cd: 'cd' };
  for (const [entrada, esperado] of [
    ['dmgab2cd10', ['dmg', 'ab2', 'cd10']], ['dmg5ab0cd0', ['dmg5', 'ab0', 'cd0']],
    ['xred', ['x', 'red']], ['khred', ['kh', 'red']], ['dmg3>=5cd7', ['dmg3>=5', 'cd7']],
    ['ab2dmg', ['ab2', 'dmg']], ['r1red', ['r1', 'red']], ['dmg5', ['dmg5']],
    ['kh2', ['kh2']], ['estranho', ['estranho']]
  ]) {
    assert.deepEqual(separarModificadores(entrada, palavras), esperado, entrada);
    const tokensDoFoundry = entrada.match(/[A-Za-z]+[^A-Za-z]*/g);
    const separadoPeloCore = tokensDoFoundry.flatMap(token => Array.from(DadoCore._cprSplitFused(token)));
    assert.deepEqual(separarModificadores(entrada, palavras), separadoPeloCore, entrada);
  }
  assert.deepEqual(separarModificadores(['dmgab2', 'cd10']), ['dmg', 'ab2', 'cd10']);
});

test('C43 dmg: o padrão conta dois máximos; número solto é limiar e zero nunca é crítico', () => {
  assert.deepEqual(lerModificadorDano('dmg'), { quantidade: 2, comparacao: '>=', limiar: 6 });
  assert.deepEqual(lerModificadorDano('dmg', 10), { quantidade: 2, comparacao: '>=', limiar: 10 });
  assert.deepEqual(lerModificadorDano('dmg5'), { quantidade: 2, comparacao: '>=', limiar: 5 });
  assert.deepEqual(lerModificadorDano('dmg3>=5'), { quantidade: 3, comparacao: '>=', limiar: 5 });
  assert.deepEqual(lerModificadorDano('dmg0'), { quantidade: 0, comparacao: '>=', limiar: 6 });
  assert.deepEqual(lerModificadorDano('dmg0>=5'), { quantidade: 0, comparacao: '>=', limiar: 5 });
  assert.equal(lerModificadorDano('kh2'), null);
});

test('C43 dmg: os parâmetros e o crítico concordam com o método real do CORE, sem mudar os resultados', () => {
  for (const faces of [6, 10]) {
    for (const modificador of ['dmg', 'dmg0', 'dmg5', 'dmg3>=5', 'dmg2>=9', 'dmg2=6', 'dmg2<4', 'dmg2<=4', 'dmg2>4']) {
      for (const resultados of [[6, 6], [5, 6], [5, 5, 6], [1, 3], [10, 10]]) {
        const dado = dadoCore(faces, resultados, [modificador]);
        dado.dmg(modificador);
        const parametros = lerModificadorDano(modificador, faces);
        assert.deepEqual(parametros, {
          quantidade: dado.options.cprDamageCrit.count,
          comparacao: dado.options.cprDamageCrit.op, limiar: dado.options.cprDamageCrit.threshold
        }, modificador);
        assert.equal(danoCriticoConfigurado(resultados, parametros).critico, dado.options.cprDamageIsCrit, modificador);
        assert.deepEqual(dado.results.map(resultado => resultado.result), resultados, 'dmg não muda dados nem total');
      }
    }
  }
});

test('C43 ab e cd: dmgab2cd10 usa ablação 2, bônus 10 e soma só o bônus no crítico', () => {
  const parametros = parametrosDoDano('dmgab2cd10');
  assert.deepEqual(parametros, { quantidade: 2, comparacao: '>=', limiar: 6, ablacao: 2, bonus: 10 });
  assert.deepEqual(danoCriticoConfigurado([6, 6], parametros), { critico: true, bonus: 10 });
  assert.deepEqual(danoCriticoConfigurado([6, 5], parametros), { critico: false, bonus: 0 });
});

test('C43 ab e cd: ausência, valores nus e zeros preservam o padrão e as sentinelas do CORE', () => {
  for (const [modificadores, ablacao, bonus] of [
    [['dmg'], 1, 5], [['dmg', 'ab', 'cd'], 1, 5], [['dmg', 'ab0', 'cd0'], 0, 0],
    [['cd10', 'ab2', 'dmg'], 2, 10], [['dmg', 'ab2', 'ab0', 'cd10', 'cd0'], 0, 0]
  ]) {
    const dado = dadoCore(6, [6, 6], modificadores);
    for (const modificador of modificadores) {
      if (modificador.startsWith('dmg')) dado.dmg(modificador);
      else if (modificador.startsWith('ab')) dado.ab(modificador);
      else dado.cd(modificador);
    }
    const parametros = parametrosDoDano(modificadores);
    assert.equal(parametros.ablacao, ablacao);
    assert.equal(parametros.bonus, bonus);
    assert.equal(parametros.ablacao, dado.options.cprAblation ?? 1);
    assert.equal(parametros.bonus, dado.options.cprCritBonus ?? 5);
  }
  assert.equal(parametrosDoDano(['ab2', 'cd10']), null, 'os companheiros não tornam uma rolagem comum em dano');
  assert.equal(parametrosDoDano([]), null);
  assert.deepEqual(danoCriticoConfigurado([6, 6], parametrosDoDano('dmgcd0')), { critico: true, bonus: 0 });
});

test('C43 arma: padrão da wiki exige dois seis, sem contar outros máximos ou o multiplicador do autofogo', () => {
  assert.ok(wiki.includes('Quando <b>dois ou mais dados de dano</b> de um ataque caem <b>6</b>'));
  assert.ok(wiki.includes('A lesão dá <b>+5 de dano direto no HP</b>'));
  assert.deepEqual(danoCriticoConfigurado([6, 6]), { critico: true, bonus: 5 });
  assert.deepEqual(danoCriticoConfigurado([6, 5]), { critico: false, bonus: 0 });
  assert.deepEqual(danoCriticoConfigurado([10, 10]), { critico: false, bonus: 0 });
  assert.deepEqual(danoCriticoConfigurado([3, 3]), { critico: false, bonus: 0 });
});

test('C43 arma: crítico em três seis recusa dois, aceita três e preserva o bônus escolhido', () => {
  const parametros = resolverCriticoDaArma({ critico: { seis: 3, bonus: 8 } });
  assert.deepEqual(parametros, { quantidade: 3, bonus: 8, comparacao: '=', limiar: 6 });
  assert.deepEqual(danoCriticoConfigurado([6, 6, 5], parametros), { critico: false, bonus: 0 });
  assert.deepEqual(danoCriticoConfigurado([6, 6, 6], parametros), { critico: true, bonus: 8 });
});

test('C43 arma: sem campos novos o bônus é 5, ou 10 para a Power da wiki', () => {
  assert.ok(wiki2077.includes('o dano bônus da lesão sobe <b>5</b>: 10 em vez de 5.'));
  assert.deepEqual(resolverCriticoDaArma(), { quantidade: 2, bonus: 5, comparacao: '=', limiar: 6 });
  assert.equal(resolverCriticoDaArma({}, null, { classe: 'power' }).bonus, 10);
  assert.equal(resolverCriticoDaArma({ critico: { seis: 2, bonus: null } }, null, { classe: 'power' }).bonus, 10);
  assert.equal(resolverCriticoDaArma({ critico: { seis: 2, bonus: 7 } }, null, { classe: 'power' }).bonus, 7);
});

test('C43 munição: a substituição opcional troca a regra inteira, sem tocar na arma', () => {
  const arma = Object.freeze({ critico: Object.freeze({ seis: 3, bonus: 8 }) });
  assert.deepEqual(resolverCriticoDaArma(arma, { critico: { substitui: false, seis: 1, bonus: 10 } }),
    { quantidade: 3, bonus: 8, comparacao: '=', limiar: 6 });
  const parametros = resolverCriticoDaArma(arma, { critico: { substitui: true, seis: 1, bonus: 10 } });
  assert.deepEqual(parametros, { quantidade: 1, bonus: 10, comparacao: '=', limiar: 6 });
  assert.deepEqual(danoCriticoConfigurado([6, 5], parametros), { critico: true, bonus: 10 });
  assert.equal(arma.critico.seis, 3);
  assert.equal(arma.critico.bonus, 8);
});

test('C43 arma e munição: zero seis desliga o crítico, bônus zero preserva o crítico sem dano extra', () => {
  for (const parametros of [
    resolverCriticoDaArma({ critico: { seis: 0, bonus: 5 } }),
    resolverCriticoDaArma({}, { critico: { substitui: true, seis: 0, bonus: 5 } })
  ]) assert.deepEqual(danoCriticoConfigurado([6, 6, 6, 6], parametros), { critico: false, bonus: 0 });
  for (const parametros of [
    resolverCriticoDaArma({ critico: { seis: 2, bonus: 0 } }),
    resolverCriticoDaArma({}, { critico: { substitui: true, seis: 2, bonus: 0 } })
  ]) assert.deepEqual(danoCriticoConfigurado([6, 6], parametros), { critico: true, bonus: 0 });
});

test('C43 campo de dano: retira só marcadores do dado e preserva os outros termos, como o CORE', () => {
  for (const [formula, esperada] of [
    ['3d6kh2dmg5ab0cd10red', '3d6kh2'], ['2d6dmgab2cd10 + 2', '2d6 + 2'],
    ['d10red + 3d6dmg3>=5kh2', 'd10 + 3d6kh2'],
    ['2d6[red] + @stats.body + 1d4ab0cd0', '2d6[red] + @stats.body + 1d4'],
    ['3d6kh2 + @ab2 + 5[cd10]', '3d6kh2 + @ab2 + 5[cd10]'],
    ['2D6DMGAB2CD10', '2D6'], ['(2d6dmg + 1d4red) * 2', '(2d6 + 1d4) * 2'],
    ['', ''], [null, null], [undefined, undefined]
  ]) {
    const original = limparCore(formula);
    assert.equal(retirarMarcadoresDano(formula), esperada);
    assert.equal(sanitizarFormulaDano(formula).formula, original.cleaned);
    assert.deepEqual(sanitizarFormulaDano(formula).removidos, Array.from(original.removed));
  }
  assert.deepEqual(sanitizarFormulaDano('1d10red + 2d6cd10dmgab2'), {
    formula: '1d10 + 2d6', removidos: ['dmg', 'ab', 'cd', 'red']
  });
});
