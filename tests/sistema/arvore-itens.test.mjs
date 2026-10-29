// CORE 0.92.4: item-folder-upgraded-display.js, recursiveHTML e _prepareSubList.
import assert from 'node:assert/strict';
import test from 'node:test';
import { arvoreDeInstalados } from '../../foundry-sistema/scripts/regras-arvore-itens.mjs';

const item = (id, tipo, instaladoEm = '', nome = id, visivel = true) => ({ id, tipo, instaladoEm, nome, visivel });
const listar = arvore => {
  const resultado = [], pendentes = [...arvore].reverse();
  while (pendentes.length) { const no = pendentes.pop(); resultado.push(no.id); pendentes.push(...no.filhos.toReversed()); }
  return resultado;
};

test('C34.3: árvore recursiva mantém montagem, raízes e prioridades dos instalados do CORE', () => {
  const itens = [item('arma', 'arma'), item('upgrade', 'upgrade', 'arma'), item('balas', 'municao', 'arma'),
    item('anexo', 'upgrade', 'upgrade'), item('deck', 'cyberdeck'), item('hardware', 'upgrade', 'deck'),
    item('prog-z', 'programa', 'deck', 'Zeta'), item('prog-a', 'programa', 'deck', 'Alfa'),
    item('fundacao', 'cyberware'), item('filho', 'cyberware', 'fundacao'), item('outro', 'upgrade', 'fundacao')];
  const antes = structuredClone(itens);
  const arvore = arvoreDeInstalados(itens);
  assert.deepEqual(arvore.map(no => no.id), ['arma', 'deck', 'fundacao']);
  assert.deepEqual(arvore[0].filhos.map(no => no.id), ['balas', 'upgrade']);
  assert.equal(arvore[0].filhos[1].filhos[0].id, 'anexo');
  assert.deepEqual(arvore[1].filhos.map(no => no.id), ['prog-a', 'prog-z', 'hardware']);
  assert.deepEqual(arvore[2].filhos.map(no => no.id), ['filho', 'outro']);
  assert.deepEqual(itens, antes);
});

test('C34.3: invisíveis não entram na árvore; filho visível sem pai visível conserva a própria linha', () => {
  const arvore = arvoreDeInstalados([item('publico', 'arma'), item('segredo', 'upgrade', 'publico', '<img src=x>', false),
    item('pai-privado', 'cyberdeck', '', 'Não revelar', false), item('orfao-visivel', 'programa', 'pai-privado'),
    { ...item('sem-permissao', 'upgrade', 'publico', 'Não revelar'), visivel: undefined }]);
  assert.deepEqual(listar(arvore), ['publico', 'orfao-visivel']);
  assert.equal(JSON.stringify(arvore).includes('Não revelar'), false);
  assert.equal(JSON.stringify(arvore).includes('pai-privado'), false);
  assert.equal(arvore[0].filhos.length, 0);
});

test('C34.3: órfãos, autorreferência e ciclos conservam cada item uma vez, sem travar a árvore', () => {
  const arvore = arvoreDeInstalados([item('orfao', 'upgrade', 'ausente'), item('solo', 'upgrade', 'solo'),
    item('a', 'upgrade', 'b'), item('b', 'upgrade', 'a'), item('c', 'upgrade', 'b')]);
  assert.deepEqual(arvore.map(no => no.id), ['orfao', 'solo', 'a']);
  assert.deepEqual(listar(arvore), ['orfao', 'solo', 'a', 'b', 'c']);
});

test('C34.3: montagem profunda não depende da pilha recursiva; nomes e IDs são conservados como dados', () => {
  const itens = Array.from({ length: 15000 }, (_, i) => item(String(i), 'upgrade', i ? String(i - 1) : '', '<b>Item ' + i + '</b>'));
  const arvore = arvoreDeInstalados(itens);
  assert.equal(arvore.length, 1);
  assert.equal(listar(arvore).length, itens.length);
  assert.equal(arvore[0].nome, '<b>Item 0</b>');
});
