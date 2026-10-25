// Testes de referência de estabilizar e da cura natural (o C36; foundry-sistema/scripts/regras-estabilizar.mjs), sem
// Foundry, pela wiki: a seção "Estabilização e cura natural" (system-rules.js:552, p. 222–223), a coluna "Estabilizar" dos
// estados de ferimento (:208-212), o Death Save (:215), "Quem cura o quê" (:553) e o catálogo (system-catalog.js:74, :88 e
// :89). Os valores esperados saem do texto da wiki, lido aqui. O CORE 0.92.4 não tem nenhum dos dois.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { curaNaFicha, curaNatural, dvDeEstabilizar, ehAnticorpos, implanteDeSp, PERICIAS_DE_ESTABILIZAR, resultadoDeEstabilizar, spDepoisDoDescanso } from '../../foundry-sistema/scripts/regras-estabilizar.mjs';
import { estadoDeFerimento, hpMaximo } from '../../foundry-sistema/scripts/regras.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const wiki = ler('system-rules.js');
const catalogoDaWiki = ler('system-catalog.js');

test('Estabilizar (wiki, :208-212 e :552): a DV pelo estado de ferimento, 10, 13 ou 15; ileso não tem o que estabilizar', () => {
  assert.match(wiki, /formula\('TECH \+ Primeiros Socorros ou Paramédico \+ 1d10 &gt; DV10 \/ 13 \/ 15'\)/);
  assert.match(wiki, /'Custa uma Ação\. A DV depende do estado: levemente, gravemente ou mortalmente ferido\.'/);
  const linhas = {
    leve: /\['Levemente Ferido', [^\n]*?'DV(\d+)'\]/,
    grave: /\['Gravemente Ferido ' \+ en\('Seriously Wounded'\), [^\n]*?'DV(\d+)'\]/,
    mortal: /\['Mortalmente Ferido ' \+ en\('Mortally Wounded'\), [^\n]*?'DV(\d+): volta a 1 HP e fica inconsciente por 1 minuto'\]/
  };
  const daWiki = Object.fromEntries(Object.entries(linhas).map(([chave, regex]) => [chave, Number(regex.exec(wiki)?.[1])]));
  assert.deepEqual(daWiki, { leve: 10, grave: 13, mortal: 15 });
  // Pelo estado de ferimento da ficha (regras.estadoDeFerimento), com o máximo de BODY 4 e WILL 6: 35.
  const max = hpMaximo(4, 6);
  assert.equal(max, 35);
  for (const [hp, chave] of [[34, 'leve'], [18, 'leve'], [17, 'grave'], [1, 'grave'], [0, 'mortal'], [-3, 'mortal']]) {
    assert.equal(estadoDeFerimento(hp, max).chave, chave, `HP ${hp}`);
    assert.equal(dvDeEstabilizar(estadoDeFerimento(hp, max).chave), daWiki[chave], `HP ${hp}`);
  }
  assert.equal(dvDeEstabilizar(estadoDeFerimento(35, max).chave), null);
  assert.equal(dvDeEstabilizar('outro'), null);
});

test('Estabilizar (wiki, :553): Primeiros Socorros e Paramédico estabilizam, pelas perícias do tratamento; a Cybertecnologia não', () => {
  assert.match(wiki, /\['Primeiros Socorros', 'Estabiliza e faz correção rápida/);
  assert.match(wiki, /\['Paramédico \(x2\)', 'Estabiliza e faz correção rápida ou tratamento/);
  assert.match(wiki, /\['Cybertecnologia', 'Não estabiliza\./);
  assert.deepEqual(PERICIAS_DE_ESTABILIZAR.map(({ chave, id, rotulo, role }) => ({ chave, id, rotulo, role: Boolean(role) })), [
    { chave: 'primeirosSocorros', id: 'first-aid', rotulo: 'Primeiros Socorros', role: false },
    { chave: 'paramedico', id: 'paramedic', rotulo: 'Paramédico', role: false }
  ]);
});

test('Estabilizar (p. 128 e :552): precisa superar a DV, o empate falha; o mortal estabilizado volta a 1 HP, inconsciente, com o Death Save de base', () => {
  assert.match(wiki, /'Mortalmente ferido estabilizado volta a <b>1 HP<\/b> e fica <b>inconsciente por 1 minuto<\/b> \(ainda rola Death Save se for atacado\)\.'/);
  assert.match(wiki, /Cada Death Save rolado soma \+1 aos próximos, até alguém estabilizar o personagem de volta a 1 HP \(aí volta ao Death Save base\)\./);
  assert.deepEqual(resultadoDeEstabilizar({ ferimento: 'grave', total: 13, hp: 15 }), { dv: 13, passou: false, hp: 15 });
  assert.deepEqual(resultadoDeEstabilizar({ ferimento: 'grave', total: 14, hp: 15 }), { dv: 13, passou: true, hp: 15, inconsciente: false, zerarDeathSave: false });
  assert.deepEqual(resultadoDeEstabilizar({ ferimento: 'leve', total: 10, hp: 30 }), { dv: 10, passou: false, hp: 30 });
  assert.equal(resultadoDeEstabilizar({ ferimento: 'leve', total: 11, hp: 30 }).passou, true);
  assert.deepEqual(resultadoDeEstabilizar({ ferimento: 'mortal', total: 15, hp: -2 }), { dv: 15, passou: false, hp: -2 });
  assert.deepEqual(resultadoDeEstabilizar({ ferimento: 'mortal', total: 16, hp: -2 }), { dv: 15, passou: true, hp: 1, inconsciente: true, zerarDeathSave: true });
  assert.equal(resultadoDeEstabilizar({ ferimento: 'mortal', total: 16, hp: 0 }).hp, 1);
  assert.equal(resultadoDeEstabilizar({ ferimento: 'ileso', total: 30, hp: 35 }), null);
});

test('Cura natural (:552 e system-catalog.js:74): por dia inteiro, HP igual ao BODY; BODY × 2 com o Reinforced Antibodies; até o máximo', () => {
  assert.match(wiki, /'Estabilizado, recupera <b>HP igual ao BODY por dia inteiro de descanso<\/b>\.'/);
  assert.match(catalogoDaWiki, /\['Reinforced Antibodies', 'Depois de estabilizado, recupera BODY x 2 HP por dia de descanso\.'/);
  assert.deepEqual(curaNatural({ dias: 2, body: 4, hp: 15, max: 35 }), { dias: 2, porDia: 4, antes: 15, depois: 23, recuperado: 8 });
  assert.deepEqual(curaNatural({ dias: 2, body: 4, hp: 15, max: 35, anticorpos: true }), { dias: 2, porDia: 8, antes: 15, depois: 31, recuperado: 16 });
  assert.deepEqual(curaNatural({ dias: 2, body: 6, hp: 1, max: 40 }), { dias: 2, porDia: 6, antes: 1, depois: 13, recuperado: 12 });
  assert.equal(curaNatural({ dias: 3, body: 4, hp: 30, max: 35, anticorpos: true }).depois, 35, 'não passa do máximo');
  assert.equal(curaNatural({ dias: 1, body: 4, hp: 35, max: 35 }).recuperado, 0);
  assert.equal(curaNatural({ dias: 1, body: 6, hp: -2, max: 40 }).depois, 4, 'do negativo, soma o BODY');
  for (const dias of [0, -1, 1.5, NaN, '2']) assert.equal(curaNatural({ dias, body: 4, hp: 15, max: 35 }), null, `dias ${String(dias)}`);
});

test('Cura natural (system-catalog.js:88-89): o Skin Weave e o Subdermal Armor recuperam 1 SP por dia, em cada local, até o máximo', () => {
  for (const nome of ['Skin Weave', 'Subdermal Armor']) {
    assert.match(catalogoDaWiki, new RegExp(`\\['${nome}', 'SP \\d+ no corpo e na cabeça\\.[^\\]]*recupera 1 SP por dia de cura natural\\.'\\]`));
  }
  assert.equal(spDepoisDoDescanso({ value: 6, max: 7 }, 2), 7);
  assert.equal(spDepoisDoDescanso({ value: 4, max: 7 }, 2), 6);
  assert.equal(spDepoisDoDescanso({ value: 7, max: 7 }, 1), 7);
  assert.equal(spDepoisDoDescanso({ value: 0, max: 11 }, 3), 3);
  assert.equal(spDepoisDoDescanso({ value: 0, max: 0 }, 2), 0, 'o local sem SP fica');
});

test('Cura natural: os implantes pelo id do catálogo do CORE ou pelo nome (o Enhanced Antibodies do CORE é o Reinforced Antibodies da wiki)', () => {
  // A loja da wiki põe o texto do Reinforced Antibodies no Enhanced Antibodies do CORE.
  assert.match(ler('loja-catalogo.js'), /\{"id":"core_cyberware:enhanced-antibodies","en":"Enhanced Antibodies",[^}]*\},"nome":"Anticorpos reforçados","cat":"cyberware","sub":"Cyberware interno","desc":"Depois de estabilizado, recupera BODY x 2 HP por dia de descanso\./);
  const { itens } = JSON.parse(ler('foundry-sistema/dados/catalogo.json'));
  assert.equal(itens['core_cyberware:enhanced-antibodies']?.name, 'Enhanced Antibodies');
  assert.ok(ehAnticorpos('Enhanced Antibodies', 'core_cyberware:enhanced-antibodies'));
  for (const nome of ['Reinforced Antibodies', 'enhanced antibodies', ' Anticorpos reforçados ']) assert.ok(ehAnticorpos(nome), nome);
  assert.ok(!ehAnticorpos('Toxin Binders', 'core_cyberware:toxin-binders'));
  // O cyberware e o item de armadura dele, no catálogo, com o mesmo nome.
  for (const id of ['skin-weave', 'subdermal-armor']) {
    assert.equal(itens[`core_cyberware:${id}`]?.type, 'cyberware');
    assert.equal(itens[`core_armor:${id}`]?.type, 'armadura');
    assert.equal(itens[`core_armor:${id}`].name, itens[`core_cyberware:${id}`].name);
    assert.equal(implanteDeSp(itens[`core_cyberware:${id}`].name, `core_cyberware:${id}`), id);
    assert.equal(implanteDeSp(itens[`core_armor:${id}`].name, `core_armor:${id}`), id);
    assert.equal(implanteDeSp(itens[`core_armor:${id}`].name), id, 'sem o catálogo, pelo nome');
  }
  assert.equal(implanteDeSp('Subdermal Armour'), 'subdermal-armor');
  assert.equal(implanteDeSp('Light Armorjack', 'core_armor:light-armorjack'), null);
  assert.equal(implanteDeSp('Skin Weave Plus'), null);
});

test('Estabilizar na ficha: a marca para todos; Estabilizar, ferido e sem a marca; Descansar, ferido ou estabilizado; os botões só para quem edita', () => {
  assert.deepEqual(curaNaFicha({ ferimento: 'grave', editavel: true }), { mostrar: true, estabilizado: false, estabilizar: true, descansar: true });
  assert.deepEqual(curaNaFicha({ ferimento: 'grave' }), { mostrar: true, estabilizado: false, estabilizar: false, descansar: false });
  assert.deepEqual(curaNaFicha({ ferimento: 'mortal', estabilizado: true, editavel: true }), { mostrar: true, estabilizado: true, estabilizar: false, descansar: true });
  assert.deepEqual(curaNaFicha({ ferimento: 'leve', estabilizado: true }), { mostrar: true, estabilizado: true, estabilizar: false, descansar: false });
  assert.deepEqual(curaNaFicha({ ferimento: 'ileso', editavel: true }), { mostrar: false, estabilizado: false, estabilizar: false, descansar: false });
  assert.deepEqual(curaNaFicha({ ferimento: 'ileso', estabilizado: true, editavel: true }), { mostrar: true, estabilizado: true, estabilizar: false, descansar: true });
});
