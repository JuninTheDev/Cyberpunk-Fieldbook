// Referência: CORE 0.92.4, cyberpunk-red-core/modules/actor/sheet/cpr-actor-sheet.js:1576–1638
// (_splitItem: metade para cima, parte maior que zero e menor que o total, conserva a quantidade).
// Tipos: modules/datamodels/item/{ammo,gear,clothing,drug}-datamodel.js; quantidade inteira >= 0
// em modules/datamodels/item/mixins/stackable-schema.js:9–14. O validador também exige inteiros seguros.
// Wiki, system-catalog.js:188 e system-rules.js:580,586: lote de compra e preço por dose não
// multiplicam as unidades da pilha.
import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPILHAVEIS, parteSugerida } from '../../foundry-sistema/scripts/regras.mjs';
import { divisaoDaPilha, mesmaPilha } from '../../foundry-sistema/scripts/regras-inventario.mjs';

test('C17: só munição, equipamento, roupa e droga têm quantidade em pilha', () => {
  assert.deepEqual([...EMPILHAVEIS].sort(), ['droga', 'equipamento', 'municao', 'roupa']);
  for (const tipo of ['municao', 'equipamento', 'roupa', 'droga']) {
    assert.deepEqual(divisaoDaPilha(tipo, 2, 1), { restante: 1, nova: 1 }, tipo);
  }
});

test('C17: separar sete das 25 balas deixa 18, sem converter unidades em lotes de dez', () => {
  assert.deepEqual(divisaoDaPilha('municao', 25, 7), { restante: 18, nova: 7 });
  assert.deepEqual(divisaoDaPilha('municao', 25, 1), { restante: 24, nova: 1 });
  assert.deepEqual(divisaoDaPilha('municao', 25, 24), { restante: 1, nova: 24 });
});

test('C17: sete doses divididas em quatro deixam três; a sugestão é a metade para cima', () => {
  assert.equal(parteSugerida(7), 4);
  assert.equal(parteSugerida(8), 4);
  assert.equal(parteSugerida(2), 1);
  assert.deepEqual(divisaoDaPilha('droga', 7, 4), { restante: 3, nova: 4 });
  assert.deepEqual(divisaoDaPilha('droga', 7, 3), { restante: 4, nova: 3 });
});

test('C17: equipamento e roupa também conservam unidades ao dividir', () => {
  assert.deepEqual(divisaoDaPilha('equipamento', 5, 2), { restante: 3, nova: 2 });
  assert.deepEqual(divisaoDaPilha('roupa', 6, 4), { restante: 2, nova: 4 });
});

test('C17: o maior inteiro seguro pode ser dividido sem arredondar ou perder unidades', () => {
  assert.deepEqual(divisaoDaPilha('municao', 9007199254740991, 1), { restante: 9007199254740990, nova: 1 });
  assert.deepEqual(divisaoDaPilha('municao', 9007199254740991, 9007199254740990), { restante: 1, nova: 9007199254740990 });
});

test('C17: pilha vazia, unitária ou com total inválido não pode ser dividida', () => {
  const totais = [0, 1, -1, -7, 2.5, '7', '', null, undefined, true, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1];
  for (const tipo of ['municao', 'equipamento', 'roupa', 'droga']) {
    for (const total of totais) {
      assert.equal(divisaoDaPilha(tipo, total, 1), null, `${tipo}: total ${String(total)}`);
    }
  }
});

test('C17: separar zero, tudo, mais do que há ou uma parte inválida não muda a pilha', () => {
  const partes = [0, 7, 8, -1, -7, 1.5, '4', '', null, undefined, true, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1];
  for (const tipo of ['municao', 'equipamento', 'roupa', 'droga']) {
    for (const parte of partes) {
      assert.equal(divisaoDaPilha(tipo, 7, parte), null, `${tipo}: parte ${String(parte)}`);
    }
  }
});

test('C17: arma, proteção, cyberware, upgrade, programa, deck e veículo não viram pilhas', () => {
  for (const tipo of ['arma', 'armadura', 'cyberware', 'upgrade', 'programa', 'cyberdeck', 'veiculo', '', null, undefined]) {
    assert.equal(divisaoDaPilha(tipo, 7, 4), null, String(tipo));
  }
});

// Igualdade literal: cyberpunk-red-core/modules/actor/cpr-actor.js:1252–1279 e
// modules/actor/cpr-container.js:154–181. O CORE compara tipo+nome e, nos tipos upgradable,
// recusa o destino sem upgrades (length === 0), mas aceita o destino com upgrades.
// Em 2026-10-19, o usuário decidiu explicitamente: "Reproduzir literalmente o comportamento do CORE."
// Portanto não se acrescentam critérios de variedade, efeitos, preço, flags ou upgrades da origem.
test('C17: munição e droga de mesmo nome podem juntar apesar de variedade, efeitos, preço e flags diferentes', () => {
  for (const type of ['municao', 'droga']) {
    const origem = {
      type, name: 'Mesmo nome', upgrades: 0,
      system: { quantidade: 7, variedade: 'incendiaria', preco: 100, consumo: 'Primário da origem', instaladoEm: 'base-a' },
      effects: [{ name: 'Efeito da origem', disabled: false }], flags: { 'cpr-fieldbook': { catalogo: 'origem:item' } }
    };
    const destino = {
      type, name: 'Mesmo nome', upgrades: 0,
      system: { quantidade: 2, variedade: 'basica', preco: 10, consumo: 'Primário do destino', instaladoEm: '' },
      effects: [], flags: { 'cpr-fieldbook': { catalogo: 'destino:item' } }
    };
    assert.equal(mesmaPilha(origem, destino), true, type);
    assert.equal(mesmaPilha(destino, origem), true, type);
  }
});

test('C17: equipamento e roupa sem upgrades no destino não juntam, conforme a condição invertida do CORE', () => {
  for (const type of ['equipamento', 'roupa']) {
    const destino = { type, name: 'Mesmo nome', system: { quantidade: 2 }, upgrades: 0 };
    assert.equal(mesmaPilha({ type, name: 'Mesmo nome', system: { quantidade: 3 }, upgrades: 0 }, destino), false, type);
    assert.equal(mesmaPilha({ type, name: 'Mesmo nome', system: { quantidade: 3 }, upgrades: 2 }, destino), false, type);
  }
});

test('C17: equipamento e roupa com upgrades no destino juntam sem exigir upgrades ou estado igual na origem', () => {
  for (const type of ['equipamento', 'roupa']) {
    const origem = { type, name: 'Mesmo nome', system: { quantidade: 3, preco: 10, equipada: false }, effects: [], flags: {} };
    const destino = {
      type, name: 'Mesmo nome', upgrades: 1,
      system: { quantidade: 2, preco: 500, equipada: true, instaladoEm: 'base-b' },
      effects: [{ name: 'Efeito do destino' }], flags: { 'cpr-fieldbook': { catalogo: 'destino:item' } }
    };
    assert.equal(mesmaPilha(origem, destino), true, type);
    assert.equal(mesmaPilha({ ...origem, upgrades: 0 }, destino), true, type);
    assert.equal(mesmaPilha({ ...origem, upgrades: 3 }, { ...destino, upgrades: 2 }), true, type);
  }
});

test('C17: tipo e nome precisam ser exatos; capitalização e espaços diferentes não juntam', () => {
  for (const type of ['municao', 'equipamento', 'roupa', 'droga']) {
    const origem = { type, name: 'Mesmo nome', system: { quantidade: 3 }, upgrades: 1 };
    const destino = { type, name: 'Mesmo nome', system: { quantidade: 2 }, upgrades: 1 };
    assert.equal(mesmaPilha(origem, destino), true, type);
    assert.equal(mesmaPilha(origem, { ...destino, name: 'Mesmo Nome' }), false, type);
    assert.equal(mesmaPilha(origem, { ...destino, name: ' Mesmo nome' }), false, type);
    assert.equal(mesmaPilha(origem, { ...destino, name: 'Mesmo nome ' }), false, type);
    assert.equal(mesmaPilha(origem, { ...destino, type: type === 'municao' ? 'droga' : 'municao' }), false, type);
  }
});

test('C17: tipo não empilhável continua separado mesmo com nome igual e upgrades no destino', () => {
  for (const type of ['arma', 'armadura', 'cyberware', 'upgrade', 'programa', 'cyberdeck', 'veiculo']) {
    const origem = { type, name: 'Mesmo nome', system: { quantidade: 3 }, upgrades: 1 };
    const destino = { type, name: 'Mesmo nome', system: { quantidade: 2 }, upgrades: 2 };
    assert.equal(mesmaPilha(origem, destino), false, type);
  }
});
