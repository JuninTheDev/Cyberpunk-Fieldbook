// Testes de referência do Black Chrome no sistema (o C48, parte 1; foundry-sistema/build/conteudo.mjs e
// build/compendios.mjs), sem Foundry: os itens dos pacotes do CORE 0.92.4 (black-chrome/* e dlc/black-chrome-plus) no
// catálogo, pelo id da loja da wiki (e os 31 veículos, desde a parte 4); os quatro compêndios; e o preço da unidade pelo lote da munição.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { idsDosPacks, PACKS_DE_ITENS } from '../../foundry-sistema/build/compendios.mjs';
import { precoDaUnidade } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = new URL('../../', import.meta.url);
const { itens: catalogo } = JSON.parse(fs.readFileSync(new URL('foundry-sistema/dados/catalogo.json', raiz), 'utf8'));
const manifesto = JSON.parse(fs.readFileSync(new URL('foundry-sistema/system.json', raiz), 'utf8'));
const contexto = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('loja-catalogo.js', raiz), 'utf8'), contexto);
const loja = Array.from(contexto.window.shopCatalog.itens);
const doBlackChrome = id => /^(black-chrome_|dlc_black-chrome-plus:)/.test(id);
const PACKS_DO_BLACK_CHROME = ['black-chrome-armas', 'black-chrome-cyberware', 'black-chrome-equipamento', 'black-chrome-veiculos'];

test('Black Chrome: os itens dos pacotes do CORE no catálogo (com os 31 veículos, desde a parte 4), e os 176 da loja todos', () => {
  const contagem = {};
  for (const id of Object.keys(catalogo).filter(doBlackChrome)) contagem[id.split(':')[0]] = (contagem[id.split(':')[0]] || 0) + 1;
  assert.deepEqual(contagem, {
    'black-chrome_weapons': 51, 'black-chrome_armor': 23, 'black-chrome_ammo': 9, 'black-chrome_cyberware': 41, 'black-chrome_gear': 28,
    'black-chrome_clothing': 1, 'black-chrome_upgrades': 5, 'black-chrome_vehicles': 31, 'dlc_black-chrome-plus': 21
  });
  const daLoja = loja.filter(item => (item.tags || []).includes('blackchrome') && doBlackChrome(item.id));
  assert.equal(daLoja.length, 176);
  assert.deepEqual(daLoja.filter(item => !catalogo[item.id]).map(item => item.id), []);
  // Fora da loja: os dois outros modos da ModFire (a wiki só vende o de pistola), as pedras da funda (de graça) e os
  // veículos (a loja não vende veículos do Black Chrome; ficam no compêndio).
  const ids = new Set(daLoja.map(item => item.id));
  assert.deepEqual(Object.keys(catalogo).filter(id => doBlackChrome(id) && !ids.has(id) && !id.startsWith('black-chrome_vehicles:')).sort(),
    ['black-chrome_ammo:rocks', 'black-chrome_weapons:modfire-10x-rifle', 'black-chrome_weapons:modfire-10x-smg']);
  // O livro de cada um, do CORE: o Black Chrome ou o Black Chrome Plus (alguns repetem um item do livro básico).
  assert.ok(Object.entries(catalogo).filter(([id]) => doBlackChrome(id)).every(([id, item]) => ['BC', 'BC+', 'Core'].includes(item.system.fonte.livro)
    && (item.system.fonte.livro !== 'BC+') === id.startsWith('black-chrome_')));
});

test('Black Chrome: os quatro compêndios (armas, cyberware, moda e equipamento, veículos), cada item num só, no manifesto e na pasta do sistema', () => {
  const packs = idsDosPacks();
  assert.deepEqual(PACKS_DO_BLACK_CHROME.map(nome => packs[nome].length), [82, 42, 55, 31]);
  const todos = Object.keys(catalogo).filter(doBlackChrome);
  for (const id of todos) assert.equal(Object.values(packs).filter(ids => ids.includes(id)).length, 1, id);
  // Os do livro básico e de 2077 não levam nada do Black Chrome, e os do Black Chrome não levam nada deles.
  for (const [nome, ids] of Object.entries(packs)) assert.equal(ids.every(doBlackChrome), PACKS_DO_BLACK_CHROME.includes(nome), nome);
  // A luva do pacote de equipamento é cyberware externo (como a Battleglove do CORE): vai com o cyberware.
  assert.deepEqual(packs['black-chrome-cyberware'].filter(id => id.startsWith('black-chrome_gear:')), ['black-chrome_gear:mechaman-smart-glove']);
  // Todo compêndio de itens está no manifesto, com o caminho dele, e na pasta do sistema.
  for (const nome of Object.keys(PACKS_DE_ITENS)) {
    const pack = manifesto.packs.find(p => p.name === nome);
    assert.deepEqual([pack?.path, pack?.type], [`packs/${nome}`, 'Item'], nome);
    assert.ok(manifesto.packFolders[0].packs.includes(nome), nome);
  }
  assert.deepEqual(PACKS_DO_BLACK_CHROME.map(nome => manifesto.packs.find(p => p.name === nome).label), ['Armas do Black Chrome', 'Cyberware do Black Chrome', 'Moda e equipamento do Black Chrome', 'Veículos do Black Chrome']);
});

test('Black Chrome: a munição tem o lote do pacote do CORE (a sucata em 50, a caça pequena em 100, a rede em 1), e o preço da unidade sai dele', () => {
  const unidade = id => precoDaUnidade('municao', catalogo[id].system);
  assert.equal(unidade('dlc_black-chrome-plus:shotgun-slug-junk'), 0.2);
  assert.equal(unidade('dlc_black-chrome-plus:rifle-small-game'), 0.1);
  assert.equal(unidade('black-chrome_ammo:net'), 50);
  assert.equal(unidade('black-chrome_ammo:doberman-500-marking-scent'), 50 / 12);
  // As do livro básico seguem como antes (10 balas; a bateria em 8), e a munição sem lote (de antes do C48), pela variedade.
  assert.deepEqual([unidade('core_ammo:rifle-basic'), unidade('core_ammo:battery-pack')], [1, 50 / 8]);
  assert.deepEqual([precoDaUnidade('municao', { preco: 10, tipo: 'rifle' }), precoDaUnidade('municao', { preco: 100, tipo: 'grenade' }), precoDaUnidade('municao', { preco: 100, tipo: 'grenade', lote: 4 })], [1, 100, 25]);
  // Na loja da wiki, cada munição do Black Chrome tem o lote que o catálogo tem.
  for (const item of loja.filter(item => item.cat === 'municao' && doBlackChrome(item.id))) assert.equal(catalogo[item.id].system.lote, item.lote, item.id);
});
