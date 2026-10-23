// Testes de referência dos veículos fora do dano (o C40; foundry-sistema/scripts/regras-veiculos.mjs), sem Foundry: a
// direção, as manobras e a batida da wiki (system-rules.js:538, "Veículos", p. 189–192).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  direcaoSobPressao, manobrasDo, periciaDoControle, tipoDoVeiculo, DANO_DA_BATIDA, DV_DA_DIRECAO, DV_DESVIAR_A_PE, LESAO_DA_BATIDA, LIMITE_DA_DIRECAO, MANOBRAS,
  PERICIA_DE_DESVIAR, TIPOS_DE_VEICULO
} from '../../foundry-sistema/scripts/regras-veiculos.mjs';

const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
const secao = (() => {
  const inicio = wiki.indexOf("section('Veículos', '189–192'");
  assert.ok(inicio >= 0, 'a seção "Veículos" (p. 189–192) da wiki');
  return wiki.slice(inicio, wiki.indexOf("section('Reputação e facedown'", inicio));
})();
const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;

test('a wiki (p. 189–192): a direção básica, as manobras, a batida e o desvio a pé ainda dizem isto', () => {
  assert.ok(secao.includes('<b>Direção básica:</b> se REF + perícia de controle for maior que 9, não gasta Ação. Se não, gasta a Ação e rola DV10 todo turno; falhar é perder o controle.'));
  assert.ok(secao.includes('<b>Manobras</b> usam a Ação e a Ação de Movimento; falhar é perder o controle.'));
  assert.ok(secao.includes('<b>Batida:</b> 6d6 no veículo e no que foi atingido, e todos os envolvidos sofrem a lesão Traumatismo Cervical.'));
  assert.ok(secao.includes('<b>Desviar de um veículo a pé:</b> DEX + Evasão + 1d10 contra DV13.'));
  const [, limite, dv] = /maior que (\d+), não gasta Ação\. Se não, gasta a Ação e rola DV(\d+)/.exec(secao).map(Number);
  assert.deepEqual([LIMITE_DA_DIRECAO, DV_DA_DIRECAO], [limite, dv]);
  assert.equal(/Batida:<\/b> (\d+d6)/.exec(secao)[1], DANO_DA_BATIDA);
  assert.equal(Number(/a pé:<\/b> DEX \+ Evasão \+ 1d10 contra DV(\d+)/.exec(secao)[1]), DV_DESVIAR_A_PE);
  assert.equal(PERICIA_DE_DESVIAR, 'evasion');
  // A lesão: o Traumatismo Cervical do catálogo (a tabela da cabeça do CORE).
  assert.equal(catalogo[LESAO_DA_BATIDA]?.type, 'lesao');
  assert.equal(catalogo[LESAO_DA_BATIDA].name, 'Traumatismo cervical');
});

test('a tabela das manobras da wiki (p. 190) é a do código: os nomes, as DVs e as só do aéreo', () => {
  const tabela = /table\(\['Manobra', 'DV'\], \[(.*?)\], 'dense'\)/.exec(secao);
  assert.ok(tabela, 'a tabela "Manobra | DV"');
  const linhas = [...tabela[1].matchAll(/\['([^']+)', '(\d+)'\]/g)].map(([, nomes, dv]) => [nomes, Number(dv)]);
  assert.equal(linhas.length, 4);
  const lidas = linhas.flatMap(([nomes, dv]) => {
    const aereo = / \(aéreo\)$/.test(nomes);
    return nomes.replace(/ \(aéreo\)$/, '').split(', ').map(nome => ({ nome: nome.toLowerCase(), dv, aereo }));
  });
  assert.deepEqual(Object.values(MANOBRAS).map(m => ({ nome: m.nome.toLowerCase(), dv: m.dv, aereo: m.aereo })), lidas);
});

test('o tipo do veículo: o campo manda; vazio, os 14 do CORE pelo nome; sem nada, terrestre', () => {
  const terrestres = ['Roadbike', 'Superbike', 'Compact Groundcar', 'High Performance Groundcar', 'Super Groundcar'];
  const maritimos = ['Jetski', 'Speedboat', 'Cabin Cruiser', 'Yacht'];
  const aereos = ['Gyrocopter', 'Helicopter', 'AV-4 Multipurpose Aerodyne', 'AV-9 Super Aerodyne', 'Aerozep'];
  for (const nome of terrestres) assert.equal(tipoDoVeiculo({ nome }), 'terrestre', nome);
  for (const nome of maritimos) assert.equal(tipoDoVeiculo({ nome }), 'maritimo', nome);
  for (const nome of aereos) assert.equal(tipoDoVeiculo({ nome }), 'aereo', nome);
  // Os 14 são todos os veículos do catálogo do CORE.
  const doCore = Object.values(catalogo).filter(item => item.type === 'veiculo').map(item => item.name).sort();
  assert.deepEqual(doCore, [...terrestres, ...maritimos, ...aereos].sort());
  // Sem diferença de maiúsculas nem dos espaços nas pontas.
  assert.equal(tipoDoVeiculo({ nome: '  helicopter ' }), 'aereo');
  // Sem nome conhecido, terrestre; o campo manda sobre o nome.
  assert.equal(tipoDoVeiculo({ nome: 'Van do Rocco' }), 'terrestre');
  assert.equal(tipoDoVeiculo({}), 'terrestre');
  assert.equal(tipoDoVeiculo({ tipo: 'aereo', nome: 'Van do Rocco' }), 'aereo');
  assert.equal(tipoDoVeiculo({ tipo: 'maritimo', nome: 'Helicopter' }), 'maritimo');
  assert.equal(tipoDoVeiculo({ tipo: 'terrestre', nome: 'Yacht' }), 'terrestre');
  assert.equal(tipoDoVeiculo({ tipo: '', nome: 'Yacht' }), 'maritimo');
  assert.equal(tipoDoVeiculo({ tipo: 'submarino', nome: 'Yacht' }), 'maritimo');
  assert.deepEqual(Object.keys(TIPOS_DE_VEICULO), ['', 'terrestre', 'aereo', 'maritimo']);
  assert.equal(TIPOS_DE_VEICULO[''], 'Pelo nome');
});

test('a perícia de controle pelo tipo: Conduzir Veículo Terrestre, Pilotar Veículo Aéreo, Pilotar Veículo Marítimo', () => {
  assert.equal(periciaDoControle('terrestre'), 'drive-land-vehicle');
  assert.equal(periciaDoControle('aereo'), 'pilot-air-vehicle');
  assert.equal(periciaDoControle('maritimo'), 'pilot-sea-vehicle');
  assert.equal(periciaDoControle(''), 'drive-land-vehicle');
  assert.equal(periciaDoControle('constructor'), 'drive-land-vehicle');
});

test('a direção sob pressão: REF + perícia 9 rola DV10; 10 não rola', () => {
  assert.deepEqual(direcaoSobPressao(9), { rola: true, dv: 10 });
  assert.deepEqual(direcaoSobPressao(10), { rola: false, dv: 10 });
  assert.deepEqual(direcaoSobPressao(0), { rola: true, dv: 10 });
  assert.deepEqual(direcaoSobPressao(15), { rola: false, dv: 10 });
  assert.equal(direcaoSobPressao('9').rola, true);
});

test('as manobras por tipo: as cinco do chão para todos; o pouso e a acrobacia só no aéreo', () => {
  const doChao = [['desviar', 13], ['curvaFechada', 13], ['paradaDeEmergencia', 13], ['cavaloDePau', 17], ['salto', 17]];
  for (const tipo of ['terrestre', 'maritimo']) assert.deepEqual(manobrasDo(tipo).map(m => [m.id, m.dv]), doChao, tipo);
  assert.deepEqual(manobrasDo('aereo').map(m => [m.id, m.dv]), [...doChao, ['pouso', 13], ['acrobacia', 17]]);
  assert.deepEqual(manobrasDo('aereo').map(m => m.nome), ['Desviar', 'Curva fechada', 'Parada de emergência', 'Cavalo de pau', 'Salto', 'Pouso', 'Acrobacia']);
});
