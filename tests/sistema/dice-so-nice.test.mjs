// Testes de referência do C42 (o Dice So Nice), sem Foundry: as cores de dados do CORE 0.92.4
// (cyberpunk-red-core/modules/hooks/external/dice-so-nice-preset.js), registradas no diceSoNiceReady, sem as faces da
// Q-Workshop.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { coresDoDiceSoNice, GRUPO_DO_DSN, registrarDiceSoNice } from '../../foundry-sistema/scripts/dice-so-nice.mjs';

const raiz = new URL('../../', import.meta.url);
const doCore = fs.readFileSync(new URL('cyberpunk-red-core/modules/hooks/external/dice-so-nice-preset.js', raiz), 'utf8');
const langDoCore = JSON.parse(fs.readFileSync(new URL('cyberpunk-red-core/lang/en.json', raiz), 'utf8'));

test('Dice So Nice: as três cores do CORE 0.92.4, com os mesmos nomes, fundos, bordas, material e modos', () => {
  const doPreset = [...doCore.matchAll(/addColorset\(\s*\{([\s\S]*?)\},\s*"(\w+)"/g)].map(([, corpo, modo]) => {
    const campo = chave => corpo.match(new RegExp(`${chave}:\\s*([^,\\n]+)`))?.[1].trim();
    return { name: campo('name')?.replace(/"/g, ''), background: campo('background')?.replace(/"/g, ''), edge: campo('edge')?.replace(/"/g, ''), material: campo('material')?.replace(/"/g, ''), modo };
  });
  assert.equal(doPreset.length, 3);
  const nossas = coresDoDiceSoNice('#123456');
  assert.deepEqual(nossas.map(([cores, modo]) => ({ name: cores.name, edge: cores.edge, material: cores.material, modo })), doPreset.map(({ name, edge, material, modo }) => ({ name, edge, material, modo })));
  // O fundo: a cor do jogador na primeira (game.user.color no CORE) e as cores fixas nas outras.
  assert.equal(doPreset[0].background, 'game.user.color.toString(16)');
  assert.deepEqual(nossas.map(([cores]) => cores.background), ['#123456', doPreset[1].background, doPreset[2].background]);
  // Os nomes do lang do CORE (os dois nomes próprios em inglês, como o pt-BR dele) e o grupo.
  assert.equal(GRUPO_DO_DSN, langDoCore['CPR.module.dsn.groupName']);
  assert.deepEqual(nossas.slice(1).map(([cores]) => cores.description), [langDoCore['CPR.module.dsn.colorsetRed'], langDoCore['CPR.module.dsn.colorsetYellow']]);
  assert.ok(nossas.every(([cores]) => cores.category === GRUPO_DO_DSN));
});

test('Dice So Nice: o registro espera o diceSoNiceReady, põe as três cores com a do jogador e não cria sistema de faces', () => {
  const ganchos = new Map();
  const anteriores = { Hooks: globalThis.Hooks, game: globalThis.game };
  globalThis.Hooks = { once: (nome, funcao) => ganchos.set(nome, funcao) };
  globalThis.game = { user: { color: { css: '#ab12cd' } } };
  try {
    registrarDiceSoNice();
    assert.deepEqual([...ganchos.keys()], ['diceSoNiceReady']);
    const cores = [], sistemas = [];
    ganchos.get('diceSoNiceReady')({ addColorset: (c, modo) => cores.push([c.name, c.background, modo]), addSystem: s => sistemas.push(s), addDicePreset: s => sistemas.push(s) });
    assert.deepEqual(cores, [['user', '#ab12cd', 'preferred'], ['red', '#E64539', 'default'], ['yellow', '#FFF300', 'default']]);
    // As faces da Q-Workshop (os addSystem e addDicePreset do CORE) ficam de fora: a permissão é do projeto do CORE.
    assert.equal(sistemas.length, 0);
    assert.match(fs.readFileSync(new URL('fvtt-cyberpunk-red-core-dev/CREDITS.md', raiz), 'utf8'), /Permission to use CyberpunkRED branded dice themes are graciously provided by Q-Workshop/);
  } finally {
    for (const [nome, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor;
    }
  }
});
