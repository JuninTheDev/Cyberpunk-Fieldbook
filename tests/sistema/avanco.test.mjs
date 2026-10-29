// C39: gastar IP pela wiki (system-rules.js:242-245 e :712, p. 411), sem Foundry.
// A tabela abaixo vem da própria página da wiki; os exemplos dela também têm valores explícitos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { avancoComIp } from '../../foundry-sistema/scripts/regras-avanco.mjs';

const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8'), contexto);
const pagina = contexto.window.systemRules.pages.advancement.html;
const tabela = pagina.match(/<table>([\s\S]*?)<\/table>/)[1];
const niveis = [...tabela.matchAll(/<th>(\d+)<\/th>/g)].map(([, nivel]) => Number(nivel));
const custos = [...tabela.matchAll(/<tr><td><b>([^<]+)<\/b><\/td>([\s\S]*?)<\/tr>/g)].map(([, nome, linha]) => ({
  nome, valores: [...linha.matchAll(/<td>(\d+)<\/td>/g)].map(([, valor]) => Number(valor))
}));

function recusado(pedido) {
  const resultado = avancoComIp(pedido);
  assert.equal(resultado.ok, false, JSON.stringify(pedido));
  assert.equal(typeof resultado.motivo, 'string');
  assert.ok(resultado.motivo.trim().length > 0, 'a recusa informa o motivo');
  return resultado;
}

test('Gastar IP: todos os custos e os níveis são os da tabela da wiki (p. 411)', () => {
  assert.equal(niveis.length, 10);
  assert.equal(niveis.at(-1), 10);
  assert.equal(custos.length, 3);
  for (const [indice, pedido] of [{ tipo: 'pericia' }, { tipo: 'pericia', dificil: true }, { tipo: 'role' }].entries()) {
    assert.equal(custos[indice].valores.length, niveis.length);
    for (const [posicao, nivelNovo] of niveis.entries()) {
      const custo = custos[indice].valores[posicao];
      assert.deepEqual(avancoComIp({ ...pedido, nivel: nivelNovo - 1, saldo: custo }), {
        ok: true, nivel: nivelNovo - 1, nivelNovo, custo, saldo: 0
      }, custos[indice].nome + ', nível ' + nivelNovo);
    }
  }
});

test('Gastar IP: Pistola 4 para 5 custa 100, depois 120 para 6; Role 4 para 5 custa 300 (exemplos da wiki)', () => {
  const primeira = avancoComIp({ nivel: 4, saldo: 230 });
  assert.deepEqual(primeira, { ok: true, nivel: 4, nivelNovo: 5, custo: 100, saldo: 130 });
  const segunda = avancoComIp({ nivel: primeira.nivelNovo, saldo: primeira.saldo });
  assert.deepEqual(segunda, { ok: true, nivel: 5, nivelNovo: 6, custo: 120, saldo: 10 });
  assert.deepEqual(avancoComIp({ tipo: 'role', nivel: 4, saldo: 350 }), {
    ok: true, nivel: 4, nivelNovo: 5, custo: 300, saldo: 50
  });
});

test('Gastar IP: começar uma perícia compra o nível 1 por 20, ou 40 se for difícil (wiki, p. 411)', () => {
  assert.deepEqual(avancoComIp({ nivel: 0, saldo: 20 }), { ok: true, nivel: 0, nivelNovo: 1, custo: 20, saldo: 0 });
  assert.deepEqual(avancoComIp({ nivel: 0, dificil: true, saldo: 40 }), {
    ok: true, nivel: 0, nivelNovo: 1, custo: 40, saldo: 0
  });
});

test('Gastar IP: sem saldo suficiente recusa e informa custo e saldo sem fazer a compra', () => {
  for (const pedido of [
    { nivel: 4, saldo: 99 }, { nivel: 4, dificil: true, saldo: 199 },
    { tipo: 'role', nivel: 4, saldo: 299 }, { nivel: 0, saldo: 0 }, { nivel: 0, saldo: -1 }
  ]) {
    const resultado = recusado(pedido);
    const indice = pedido.tipo === 'role' ? 2 : pedido.dificil ? 1 : 0;
    assert.equal(resultado.custo, custos[indice].valores[pedido.nivel]);
    assert.equal(resultado.saldo, pedido.saldo);
  }
});

test('Gastar IP: compra um nível por vez, sem saltos, repetição ou redução (wiki, p. 411)', () => {
  for (const tipo of ['pericia', 'role']) {
    for (const nivelNovo of [0, 3, 4, 6, 10]) recusado({ tipo, nivel: 4, nivelNovo, saldo: 10000 });
    assert.equal(avancoComIp({ tipo, nivel: 4, nivelNovo: 5, saldo: 10000 }).ok, true);
  }
});

test('Gastar IP: o nível 10 é o último da tabela para perícias e Roles (wiki:242 e :697)', () => {
  for (const tipo of ['pericia', 'role']) {
    assert.equal(avancoComIp({ tipo, nivel: 9, saldo: 10000 }).nivelNovo, 10);
    recusado({ tipo, nivel: 10, saldo: 10000 });
    recusado({ tipo, nivel: 10, nivelNovo: 10, saldo: 10000 });
    recusado({ tipo, nivel: 11, saldo: 10000 });
  }
});

test('Gastar IP: tipos desconhecidos, níveis inválidos e saldo que não é inteiro finito são recusados', () => {
  for (const tipo of ['', 'atributo', 'rank', null, 1]) recusado({ tipo, nivel: 4, saldo: 10000 });
  for (const invalido of [-1, 4.5, NaN, Infinity, '4', null]) {
    recusado({ nivel: invalido, saldo: 10000 });
    recusado({ nivel: 4, nivelNovo: invalido, saldo: 10000 });
  }
  for (const saldo of [NaN, Infinity, -Infinity, 100.5, '100', null]) recusado({ nivel: 4, saldo });
});
