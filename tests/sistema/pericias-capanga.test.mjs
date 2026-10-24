// CORE 0.92.4: settings.js mookSheetSkillDisplay e templates/actor/mook/cpr-mook-skills.hbs.
import assert from 'node:assert/strict';
import test from 'node:test';
import { exibirPericiaDoCapanga } from '../../foundry-sistema/scripts/regras-pericias-capanga.mjs';
import { registrarConfiguracoes } from '../../foundry-sistema/scripts/configuracoes.mjs';

test('C34.2: capanga mostra nível, base ou total persistente; Role separada e ferimento não alteram a exibição', () => {
  const pericia = { nivel: 4, atributo: 7, bonus: 2, role: { valor: 3 }, penalidade: -2, sorte: 2, situacional: 5, total: 14 };
  for (const [modo, esperado, rotulo] of [['nivel', 4, 'NÍVEL'], ['base', 11, 'BASE'], ['total', 13, 'TOTAL']]) {
    const exibicao = exibirPericiaDoCapanga(pericia, modo);
    assert.equal(exibicao.valor, esperado);
    assert.equal(exibicao.rotulo, rotulo);
    assert.ok(exibicao.dica.length);
  }
  assert.equal(pericia.total, 14);
});

test('C34.2: base usa atributo já preparado; total mantém bônus de família e bônus negativos', () => {
  assert.equal(exibirPericiaDoCapanga({ nivel: 4, atributo: 6, bonus: 2 }, 'base').valor, 10);
  assert.equal(exibirPericiaDoCapanga({ nivel: 4, atributo: 6, bonus: 2 }, 'total').valor, 12);
  assert.equal(exibirPericiaDoCapanga({ nivel: 3, atributo: 5, bonus: 3 }, 'total').valor, 11);
  assert.equal(exibirPericiaDoCapanga({ nivel: 0, atributo: 5, bonus: -2 }, 'total').valor, 3);
  assert.equal(exibirPericiaDoCapanga({ nivel: 0, atributo: 5 }, 'total').valor, 5);
  for (const modo of [undefined, 'invalido']) {
    assert.equal(exibirPericiaDoCapanga({ nivel: 4, atributo: 7, bonus: 2 }, modo).valor, 11);
    assert.equal(exibirPericiaDoCapanga({ nivel: 4, atributo: 7 }, modo).rotulo, 'BASE');
  }
});

test('C34.2: a escolha é do cliente, visível e com padrão Base como o CORE', () => {
  const anterior = globalThis.game;
  const registros = new Map();
  globalThis.game = { settings: { register: (sistema, chave, dados) => registros.set(chave, { sistema, ...dados }) } };
  try {
    registrarConfiguracoes();
    const opcao = registros.get('periciasDoCapanga');
    assert.equal(opcao.sistema, 'cpr-fieldbook');
    assert.equal(opcao.scope, 'client');
    assert.equal(opcao.config, true);
    assert.equal(opcao.type, String);
    assert.equal(opcao.default, 'base');
    assert.deepEqual(opcao.choices, { nivel: 'Nível', base: 'Base', total: 'Total' });
  } finally { if (anterior === undefined) delete globalThis.game; else globalThis.game = anterior; }
});
