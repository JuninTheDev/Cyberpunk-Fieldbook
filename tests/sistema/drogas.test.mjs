// Testes de referência do "Usar" a droga (foundry-sistema/scripts/drogas.mjs), sem Foundry: a tabela das drogas de rua da
// wiki ("Humanidade e drogas", p. 227–229), o primário e o vício de cada droga do catálogo e a regra de superar a DV.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DROGAS_DE_RUA, efeitosDaDroga, resultadoDoSecundario } from '../../foundry-sistema/scripts/drogas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

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
