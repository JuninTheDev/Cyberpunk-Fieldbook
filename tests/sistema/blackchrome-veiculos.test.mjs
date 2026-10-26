// Testes de referência dos veículos do Black Chrome (o C48, parte 4; foundry-sistema/build/conteudo-blackchrome.mjs e
// scripts/regras-black-chrome.mjs), sem Foundry, pela wiki (system-blackchrome.js, p. 57–84, e o Acesso Nômade, p. 9):
// o tipo, o Acesso Nômade e as proteções de fábrica de cada um, o "não aceita o upgrade" e a frota da família do Nomad.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as BC from '../../foundry-sistema/scripts/regras-black-chrome.mjs';
import { protecoesDoVeiculo } from '../../foundry-sistema/scripts/regras-veiculos.mjs';

const raiz = new URL('../../', import.meta.url);
const { itens: catalogo } = JSON.parse(fs.readFileSync(new URL('foundry-sistema/dados/catalogo.json', raiz), 'utf8'));
const wiki = fs.readFileSync(new URL('system-blackchrome.js', raiz), 'utf8');
// Os veículos da wiki, pelo nome do Foundry: a lista (aéreos ou terrestres), o Acesso Nômade e o "Vem com".
const daWiki = lista => {
  const trecho = wiki.slice(wiki.indexOf(`const ${lista} = [`), wiki.indexOf('];', wiki.indexOf(`const ${lista} = [`)));
  return [...trecho.matchAll(/veiculo\('((?:[^'\\]|\\.)+)', \{[^}]*?acesso: ('—'|\d+)(?:, extras: '([^']*)')?/g)].map(([, en, acesso, extras = '']) => ({ en: en.replace(/\\'/g, "'"), acesso: acesso === "'—'" ? 0 : Number(acesso), extras }));
};
const aereos = daWiki('aereos'), terrestres = daWiki('terrestres');
const doCatalogo = Object.fromEntries(Object.entries(catalogo).filter(([id]) => id.startsWith('black-chrome_vehicles:')).map(([id, item]) => [item.name, { id, ...item.system }]));

test('Veículos do Black Chrome: os 31 da wiki no catálogo, com o tipo (aéreo ou terrestre) e o Acesso Nômade', () => {
  assert.deepEqual([aereos.length, terrestres.length], [8, 23]);
  assert.deepEqual([...aereos, ...terrestres].map(v => v.en).sort(), Object.keys(doCatalogo).sort());
  for (const v of aereos) assert.equal(doCatalogo[v.en].tipo, 'aereo', v.en);
  for (const v of terrestres) assert.equal(doCatalogo[v.en].tipo, 'terrestre', v.en);
  for (const v of [...aereos, ...terrestres]) assert.equal(doCatalogo[v.en].acessoNomade, v.acesso, v.en);
  assert.equal(doCatalogo['Tanson JetBoy Hoverboard'].acessoNomade, 0);
});

test('Veículos do Black Chrome: o "Vem com" de fábrica, o chassi blindado no SP 13 e os vidros à prova de balas', () => {
  for (const v of [...aereos, ...terrestres]) {
    const item = doCatalogo[v.en];
    assert.equal(item.sp, /chassi blindado/.test(v.extras) ? 13 : 0, v.en);
    // A Artemis traz os dois vidros na capota (no texto da wiki, não no "Vem com").
    const vidros = v.en === 'Highway Master Artemis' ? 2 : /dois vidros à prova de balas/.test(v.extras) ? 2 : /vidro à prova de balas/.test(v.extras) ? 1 : 0;
    assert.equal(item.vidros, vidros, v.en);
  }
  // Os vidros de fábrica contam como o upgrade instalado (15 HP, 30 com dois; nunca mais de dois).
  assert.deepEqual(protecoesDoVeiculo([], { vidros: 1 }), { sp: 0, vidro: 15 });
  assert.deepEqual(protecoesDoVeiculo([{ flags: { 'cpr-fieldbook': { catalogo: 'core_upgrades:bulletproof-glass' } } }], { vidros: 2 }), { sp: 0, vidro: 30 });
  assert.deepEqual(protecoesDoVeiculo([]), { sp: 0, vidro: 0 });
});

test('Veículos do Black Chrome: o upgrade que o veículo não aceita, como a wiki', () => {
  const recusam = Object.entries(BC.RECUSAS_DO_VEICULO).map(([id]) => catalogo[id].name).sort();
  const daWikiRecusa = [...aereos, ...terrestres].filter(v => /não aceita o upgrade/.test(v.extras)).map(v => v.en);
  assert.deepEqual(recusam, [...daWikiRecusa, 'Tanson JetBoy Hoverboard'].sort());
  assert.deepEqual(BC.upgradeNoVeiculo('black-chrome_vehicles:sh-45-patroller', 'core_upgrades:seating-upgrade'), { cabe: false, motivo: 'o veículo não aceita este upgrade' });
  assert.equal(BC.upgradeNoVeiculo('black-chrome_vehicles:sh-45-patroller', 'core_upgrades:armored-chassis').cabe, true);
  assert.deepEqual(BC.upgradeNoVeiculo('black-chrome_vehicles:makigai-ebi', 'core_upgrades:heavy-chassis'), { cabe: false, motivo: 'o veículo não aceita este upgrade' });
  assert.deepEqual(BC.upgradeNoVeiculo('black-chrome_vehicles:tanson-jetboy-hoverboard', 'core_upgrades:armored-chassis'), { cabe: false, motivo: 'o veículo não aceita upgrade' });
  assert.equal(BC.upgradeNoVeiculo('core_vehicles:compact-groundcar', 'core_upgrades:seating-upgrade').cabe, true);
});

test('Acesso Nômade: o Nomad põe na frota o veículo com o Acesso até o Rank de Moto; o "—" não entra; os do RED, sem a regra', () => {
  assert.deepEqual(BC.naFrotaDaFamilia({ catalogo: 'black-chrome_vehicles:grundy', acesso: 4, rank: 5 }), { cabe: true, motivo: null });
  assert.equal(BC.naFrotaDaFamilia({ catalogo: 'black-chrome_vehicles:grundy', acesso: 4, rank: 4 }).cabe, true);
  assert.deepEqual(BC.naFrotaDaFamilia({ catalogo: 'black-chrome_vehicles:paladin-500', acesso: 8, rank: 5 }), { cabe: false, motivo: 'o Acesso Nômade do veículo é 8, e o Moto (o Rank de Nomad) é 5' });
  assert.deepEqual(BC.naFrotaDaFamilia({ catalogo: 'black-chrome_vehicles:tanson-jetboy-hoverboard', acesso: 0, rank: 10 }), { cabe: false, motivo: 'o veículo não tem Acesso Nômade' });
  assert.equal(BC.naFrotaDaFamilia({ catalogo: 'core_vehicles:roadbike', acesso: 0, rank: 0 }).cabe, true);
});
