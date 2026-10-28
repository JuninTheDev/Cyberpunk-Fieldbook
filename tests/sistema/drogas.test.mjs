// Testes de referência do "Usar" a droga (foundry-sistema/scripts/drogas.mjs), sem Foundry: a tabela das drogas de rua da
// wiki ("Humanidade e drogas", p. 227–229), o primário e o vício de cada droga do catálogo e a regra de superar a DV.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DROGAS_DE_RUA, DURACAO_DAS_DROGAS, prazoDaDroga, efeitosDaDroga, resultadoDoSecundario } from '../../foundry-sistema/scripts/drogas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

test('C16: a duração da wiki (24 ou 4 horas) e do Stim (CORE, uma hora), estendida por cada dose', () => {
  const wiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  for (const [nome, horas] of [['Black Lace', 24], ['Blue Glass', 4], ['Boost', 24], ['Smash', 4], ['Synthcoke', 4]]) {
    assert.ok(wiki.includes(`['${nome}', '${nome === 'Black Lace' || nome === 'Boost' ? 50 : nome === 'Smash' ? 10 : 20}eb', '${horas} h.`));
  }
  assert.deepEqual(DURACAO_DAS_DROGAS, { 'black-lace': 86400, 'blue-glass': 14400, boost: 86400, smash: 14400, synthcoke: 14400, stim: 3600 });
  assert.equal(prazoDaDroga('core_drugs:boost', 100), 86500);
  assert.equal(prazoDaDroga('core_drugs:boost', 200, 86500), 172900);
  assert.equal(prazoDaDroga('core_drugs:smash', 200, 100), 14600);
  assert.equal(prazoDaDroga('core_drugs:stim', 0), 3600);
  assert.equal(prazoDaDroga('core_drugs:speedheal', 100), null);
  assert.equal(prazoDaDroga('outra:boost', 100), null);
  assert.equal(prazoDaDroga('wiki_drugs:boost', 100), null);
  assert.equal(prazoDaDroga('core_drugs:boost', -100), 86300);
  assert.equal(prazoDaDroga('core_drugs:boost', -100, 0), 86400);
  assert.match(catalogo['core_drugs:stim'].system.descricao, /Seriously Wounded for one hour/);
});

test('Drogas de rua (wiki, p. 227–229): a DV do efeito secundário, o vício que só vale fora do efeito e a Humanidade do Black Lace', () => {
  const tabela = Object.entries(DROGAS_DE_RUA).map(([id, d]) => `${id.split(':')[1]} ${d.dv}${d.vicioForaDoEfeito ? ' fora' : ''}${d.humanidade ? ` ${d.humanidade}` : ''}`).join(', ');
  assert.equal(tabela, 'black-lace 17 fora 2d6, blue-glass 15, boost 17, smash 15, synthcoke 15 fora');
  // Todas estão no catálogo.
  assert.ok(Object.keys(DROGAS_DE_RUA).every(id => catalogo[id]?.type === 'droga'));
});

test('Drogas (o catálogo): o efeito primário é o do "consumo" (no Synthcoke, não o "Addicted Primary" do CORE), e o vício, o "Addiction"', () => {
  const nomes = id => {
    const { primario, vicio } = efeitosDaDroga(catalogo[id].effects ?? [], catalogo[id].system.consumo);
    return `${primario?.name ?? '-'} | ${vicio?.name ?? '-'}`;
  };
  assert.equal(nomes('core_drugs:synthcoke'), 'Synthcoke Primary | Synthcoke Addiction');
  assert.equal(nomes('core_drugs:black-lace'), 'Black Lace Primary | Black Lace Addiction');
  assert.equal(nomes('core_drugs:boost'), 'Boost Primary | Boost Addiction');
  assert.equal(nomes('core_drugs:stim'), 'Stim | -');
  assert.equal(nomes('core_drugs:speedheal'), '- | -');
});

test('Drogas (wiki, p. 128 e 227): o teste do efeito secundário precisa superar a DV; empatar vicia', () => {
  assert.equal(resultadoDoSecundario(18, 17), 'passou');
  assert.equal(resultadoDoSecundario(17, 17), 'viciou');
  assert.equal(resultadoDoSecundario(9, 15), 'viciou');
});
