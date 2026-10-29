// Testes de referência do cromo do Black Chrome (o C48, parte 3; foundry-sistema/scripts/regras-black-chrome.mjs e
// build/conteudo-blackchrome.mjs), sem Foundry, pela wiki (system-blackchrome.js e system-catalog.js) e pelas decisões do
// usuário de 2026-10-26: os cyberdedos no cyberbraço, pela mão modular, sem gastar os slots dele; o quadro linear externo
// sem mudar o HP nem o Death Save; e a aparência de moda da armadura.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as BC from '../../foundry-sistema/scripts/regras-black-chrome.mjs';
import { PASSOS, VERSAO_DOS_DADOS } from '../../foundry-sistema/scripts/migracao.mjs';
import { ESTILOS_ROUPA } from '../../foundry-sistema/scripts/config.mjs';

const raiz = new URL('../../', import.meta.url);
const { itens: catalogo } = JSON.parse(fs.readFileSync(new URL('foundry-sistema/dados/catalogo.json', raiz), 'utf8'));
const wiki = fs.readFileSync(new URL('system-blackchrome.js', raiz), 'utf8');
const mudancas = id => catalogo[id].effects.flatMap(efeito => efeito.system.changes);

test('Cyberdedos: os 16 da wiki são cyberdedos, e as duas mãos dão 5 e 8 vagas', () => {
  const daWiki = [...wiki.matchAll(/dedo\('([^']+)'/g)].map(([, nome]) => nome).sort();
  const doCatalogo = Object.entries(catalogo).filter(([id]) => BC.ehCyberdedo(id)).map(([, item]) => item.name).sort();
  assert.equal(daWiki.length, 16);
  assert.deepEqual(doCatalogo, daWiki);
  assert.equal(BC.ehCyberdedo('black-chrome_cyberware:modular-finger-cyberhand'), false);
  assert.deepEqual(Object.keys(BC.MAOS_DE_DEDOS).map(id => [catalogo[id]?.name, BC.dedosDaMao(id)]), [['Modular Finger Cyberhand', 5], ['Dynalar Modular Finger Enthusiast Cyberhand', 8]]);
});

test('Cyberdedos: não gastam os slots do braço, exigem a mão e cabem até as vagas dela (o par de alicate/tesoura conta 2)', () => {
  assert.equal(BC.slotsNaFundacao({ catalogo: 'black-chrome_cyberware:lighter-cyberfinger', tamanho: 1 }), 0);
  assert.equal(BC.slotsNaFundacao({ catalogo: 'black-chrome_cyberware:modular-finger-cyberhand', tamanho: 1 }), 1);
  assert.equal(BC.slotsNaFundacao({ catalogo: 'core_cyberware:wolvers', tamanho: 2 }), 2);
  const mao = 'black-chrome_cyberware:modular-finger-cyberhand', entusiasta = 'black-chrome_cyberware:dynalar-modular-finger-enthusiast-cyberhand';
  assert.deepEqual(BC.dedoCabe({ maos: [], dedos: [], tamanho: 1 }), { cabe: false, motivo: 'o cyberdedo exige uma Modular Finger Cyberhand (ou a Enthusiast) naquele braço' });
  assert.deepEqual(BC.dedoCabe({ maos: [mao], dedos: [1, 1, 1, 1], tamanho: 1 }), { cabe: true, motivo: null });
  assert.deepEqual(BC.dedoCabe({ maos: [mao], dedos: [1, 1, 1, 1, 1], tamanho: 1 }), { cabe: false, motivo: 'a mão já tem os 5 cyberdedos que cabem nela' });
  assert.equal(BC.dedoCabe({ maos: [mao], dedos: [1, 1, 1, 1], tamanho: 2 }).cabe, false);
  assert.equal(BC.dedoCabe({ maos: [entusiasta], dedos: [1, 1, 1, 1, 1, 1], tamanho: 2 }).cabe, true);
  assert.equal(catalogo['black-chrome_cyberware:wirecutter-scissors-cyberfingers'].system.tamanho, 2);
});

test('Quadros lineares: o externo põe o BODY no body.quadro (sem mudar o HP nem o Death Save) e pede os Interface Plugs; o interno muda o BODY e pede BODY e enxertos', () => {
  for (const id of Object.keys(BC.QUADROS_EXTERNOS)) {
    assert.equal(catalogo[id]?.type, 'equipamento', id);
    assert.ok(mudancas(id).some(m => m.key === 'system.atributos.body.quadro' && m.type === 'override' && Number(m.value) >= 12), id);
    assert.ok(!mudancas(id).some(m => m.key === 'system.atributos.body.valor'), id);
  }
  for (const id of Object.keys(BC.QUADROS_INTERNOS)) {
    assert.equal(catalogo[id]?.type, 'cyberware', id);
    assert.ok(mudancas(id).some(m => m.key === 'system.atributos.body.valor' && m.type === 'override'), id);
  }
  assert.ok(catalogo[BC.PLUGS] && catalogo[BC.ENXERTO]);
  // O corpo com o quadro: o BODY 12 para tudo, o de antes para o HP e o Death Save; sem quadro, o mesmo.
  assert.deepEqual(BC.corpoComQuadro(6, 12), { valor: 12, daVida: 6 });
  assert.deepEqual(BC.corpoComQuadro(6, 0), { valor: 6, daVida: 6 });
  assert.deepEqual(BC.quadroVeste('core_gear:linear-frame-beta', { plugs: 1 }), { cabe: false, motivo: 'o quadro externo precisa de 2 Interface Plugs instalados (tem 1)' });
  assert.deepEqual(BC.quadroVeste('core_gear:linear-frame-sigma', { plugs: 0 }), { cabe: false, motivo: 'o quadro externo precisa de um Interface Plugs instalado (tem 0)' });
  assert.equal(BC.quadroVeste('black-chrome_gear:el-f4-nt-linear-frame', { plugs: 0 }).cabe, true);
  assert.deepEqual(BC.quadroInstala('black-chrome_cyberware:implanted-vermilion-linear-frame', { body: 7, enxertos: 2 }), { cabe: false, motivo: 'o quadro interno exige BODY 8 (tem 7)' });
  assert.deepEqual(BC.quadroInstala('black-chrome_cyberware:implanted-vermilion-linear-frame', { body: 8, enxertos: 1 }), { cabe: false, motivo: 'o quadro interno exige 2 Grafted Muscle and Bone Lace instalados (tem 1)' });
  assert.equal(BC.quadroInstala('core_cyberware:implanted-linear-frame-sigma', { body: 6, enxertos: 1 }).cabe, true);
  assert.equal(BC.quadroInstala('core_cyberware:wolvers', { body: 2 }).cabe, true);
  // O Fūma Kotarō: +2 em Furtividade, vestido ou implantado.
  for (const id of ['black-chrome_gear:fuma-kotaro-linear-frame', 'black-chrome_cyberware:implanted-fuma-kotaro-linear-frame']) {
    assert.ok(mudancas(id).some(m => m.key === 'system.bonus.pericias.stealth' && m.type === 'add' && m.value === '2'), id);
  }
});

test('Quadros lineares: a migração 9 leva o quadro externo dos mundos para o body.quadro, e só ele', () => {
  assert.ok(VERSAO_DOS_DADOS >= 9);
  const passo = PASSOS.find(p => p.versao === 9);
  const item = (catalogoId, type) => ({ type, flags: { 'cpr-fieldbook': { catalogo: catalogoId } }, effects: [{ system: { changes: [{ key: 'system.atributos.body.valor', type: 'override', value: '12' }] } }] });
  const sigma = item('core_gear:linear-frame-sigma', 'equipamento');
  passo.item(sigma);
  assert.equal(sigma.effects[0].system.changes[0].key, 'system.atributos.body.quadro');
  const implantado = item('core_cyberware:implanted-linear-frame-sigma', 'cyberware');
  passo.item(implantado);
  assert.equal(implantado.effects[0].system.changes[0].key, 'system.atributos.body.valor');
});

test('Aparência de moda: as armaduras da wiki com ela têm o estilo; Guarda-roupa e Estilo passa de 13, Percepção de 15', () => {
  const comModa = Object.entries(catalogo).filter(([, item]) => item.type === 'armadura' && item.system.moda);
  for (const [id, item] of comModa) assert.ok(ESTILOS_ROUPA[item.system.moda], `${id}: ${item.system.moda}`);
  // As da wiki (o texto com a aparência de moda); a Mimic, uma por estilo no catálogo (10).
  const daWiki = [...wiki.matchAll(/coisa\('([^']+)', \{[^}]*?text: `[^`]*\$\{MODA\}/g)].map(([, nome]) => nome.replace(/ \(Generic Chic\)$/, '')).sort();
  assert.deepEqual(daWiki, ['Corporate Island', 'Dirk Combat Jacket', 'Executive Armor', 'Laser Light Street Jacket', 'Mimic Clothing', 'Montage Variable Clothing Line']);
  assert.equal(comModa.filter(([id]) => id.includes('mimic-clothing-')).length, 10);
  assert.equal(comModa.length, 15);
  assert.equal(catalogo['black-chrome_armor:dirk-combat-jacket'].system.moda, 'leisurewear');
  assert.equal(catalogo['black-chrome_armor:shock-armor'].system.moda, undefined);
  assert.deepEqual(BC.DV_DA_MODA, { 'wardrobe-style': 13, perception: 15 });
  assert.equal(BC.percebeuAArmadura({ pericia: 'perception', total: 15 }), false);
  assert.equal(BC.percebeuAArmadura({ pericia: 'perception', total: 16 }), true);
  assert.equal(BC.percebeuAArmadura({ pericia: 'wardrobe-style', total: 14 }), true);
  assert.equal(BC.percebeuAArmadura({ pericia: 'athletics', total: 30 }), false);
});
