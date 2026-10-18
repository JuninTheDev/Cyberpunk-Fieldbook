// Os lados do cyberware (o C30): o cyberbraço, a cyberperna e o cyberolho no esquerdo ou no direito, com os ids e os
// nomes da wiki (personagem-cyberware.js, o mesmo que a API e o criador usam), e o lado que vale para a opção que está
// numa fundação.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { LADOS_DO_CYBERWARE, ladoEfetivo, ladosDoTipo, ladoValido, nomeDoLado } from '../../foundry-sistema/scripts/regras.mjs';

const require = createRequire(import.meta.url);
const daWiki = require('../../personagem-cyberware.js');

test('os lados do cyberware são os da wiki, com os mesmos ids e nomes (cyberbraço, cyberperna e cyberolho)', () => {
  for (const tipo of ['cyberArm', 'cyberLeg', 'cyberEye']) assert.deepEqual(ladosDoTipo(tipo), daWiki.locais(tipo).map(local => [local.id, local.nome]), tipo);
  assert.deepEqual(Object.keys(LADOS_DO_CYBERWARE).sort(), ['cyberArm', 'cyberEye', 'cyberLeg']);
  for (const tipo of ['neuralWare', 'cyberAudioSuite', 'borgware', 'fashionware', 'cyberwareInternal', 'cyberwareExternal']) assert.deepEqual(ladosDoTipo(tipo), [], tipo);
});

test('o lado só vale para o tipo dele: o de outro tipo, um desconhecido e o vazio ficam sem lado', () => {
  assert.equal(ladoValido('braco-esquerdo', 'cyberArm'), 'braco-esquerdo');
  assert.equal(ladoValido('perna-direita', 'cyberArm'), '');
  assert.equal(ladoValido('braco-do-meio', 'cyberArm'), '');
  assert.equal(ladoValido('', 'cyberEye'), '');
  assert.equal(ladoValido('olho-esquerdo', 'neuralWare'), '');
  assert.equal(nomeDoLado('olho-direito'), 'Olho direito');
  assert.equal(nomeDoLado('perna-esquerda'), 'Perna esquerda');
  assert.equal(nomeDoLado(''), '');
});

test('a opção numa fundação fica no lado da fundação; a fundação e a peça solta, no próprio', () => {
  const braco = { lado: 'braco-esquerdo', tipo: 'cyberArm' };
  assert.equal(ladoEfetivo({ lado: 'braco-direito', tipo: 'cyberArm', fundacao: braco }), 'braco-esquerdo');
  assert.equal(ladoEfetivo({ lado: '', tipo: 'cyberArm', fundacao: braco }), 'braco-esquerdo');
  assert.equal(ladoEfetivo(braco), 'braco-esquerdo');
  assert.equal(ladoEfetivo({ lado: 'braco-direito', tipo: 'cyberArm' }), 'braco-direito');
  assert.equal(ladoEfetivo({ lado: 'braco-direito', tipo: 'cyberArm', fundacao: { lado: '', tipo: 'cyberArm' } }), '');
  // A fundação sem lados (o Sensor Array do borgware, com opções de Cyberaudio) não dá lado à opção.
  assert.equal(ladoEfetivo({ lado: '', tipo: 'cyberAudioSuite', fundacao: { lado: '', tipo: 'borgware' } }), '');
});
