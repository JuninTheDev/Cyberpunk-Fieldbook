import assert from 'node:assert/strict';
import test from 'node:test';
import { modoDePericiasDoCapanga, periciaDoCapanga, rotuloDePericiasDoCapanga } from '../../foundry-sistema/scripts/pericias-capanga.mjs';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';

test('C34.2: nível, base e total do capanga são exibições distintas; o total da rolagem é preservado', () => {
  // Nível 4 + DEX efetiva 6 = base 10; bônus +3 e ferimento −2 = total 11.
  const linha = Object.freeze({ id: 'evasion', nivel: 4, total: 11, atributo: 'dex', favorita: true });
  for (const [modo, valor, rotulo] of [['nivel', 4, 'NÍVEL'], ['base', 10, 'BASE'], ['total', 11, 'TOTAL']]) {
    const exibida = periciaDoCapanga(linha, 6, modo);
    assert.equal(exibida.exibicaoCapanga, valor);
    assert.equal(exibida.total, 11);
    assert.equal(exibida.nivel, 4);
    assert.equal(exibida.favorita, true);
    assert.equal(rotuloDePericiasDoCapanga(modo), rotulo);
    assert.ok(exibida.dicaCapanga.length > 0);
  }
  const grupo = { grupo: 'Combate' };
  assert.equal(periciaDoCapanga(grupo, 0, 'total'), grupo);
  assert.equal(periciaDoCapanga({ nivel: 0, total: -2 }, 0, 'total').exibicaoCapanga, -2);
  assert.equal(periciaDoCapanga({ nivel: 0, total: 6 }, 6, 'nivel').exibicaoCapanga, 0);
  for (const modo of [undefined, null, '', 'inexistente', 'toString', '__proto__']) {
    assert.equal(modoDePericiasDoCapanga(modo), 'base');
    assert.equal(periciaDoCapanga(linha, 6, modo).exibicaoCapanga, 10);
    assert.equal(rotuloDePericiasDoCapanga(modo), 'BASE');
  }
});

test('C34.2: exibição do capanga é local, padrão base e atualiza só fichas abertas de capangas', () => {
  const antes = { game: globalThis.game, foundry: globalThis.foundry };
  const registros = new Map(), atualizadas = [];
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  const ficha = (tipo, aberta) => ({ actor: { type: tipo }, rendered: aberta, render: opcoes => atualizadas.push({ tipo, opcoes }) });
  globalThis.foundry = { applications: { instances: new Map([
    ['aberta', ficha('capanga', true)], ['fechada', ficha('capanga', false)], ['personagem', ficha('personagem', true)], ['outra', {}]
  ]) } };
  try {
    registrarConfiguracoes();
    const opcao = registros.get('periciasDoCapanga');
    assert.equal(opcao.sistema, 'cpr-fieldbook');
    assert.equal(opcao.scope, 'client');
    assert.equal(opcao.config, true);
    assert.equal(opcao.type, String);
    assert.equal(opcao.default, 'base');
    assert.deepEqual(Object.keys(opcao.choices), ['nivel', 'base', 'total']);
    opcao.onChange();
    assert.deepEqual(atualizadas, [{ tipo: 'capanga', opcoes: { force: true } }]);
  } finally { Object.assign(globalThis, antes); }
});
