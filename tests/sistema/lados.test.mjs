// Os lados do cyberware (o C30): o cyberbraço, a cyberperna e o cyberolho no esquerdo ou no direito, com os ids e os
// nomes da wiki (personagem-cyberware.js, o mesmo que a API e o criador usam), e o lado que vale para a opção que está
// numa fundação; o membro natural (a peça única num braço ou numa perna sem cyberbraço do lado).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ehBaseNatural, ehPecaUnica, fundacaoDoLado, ficaNoMembroNatural, LADOS_DO_CYBERWARE, ladoEfetivo, ladosDoTipo, ladoValido, nomeDoLado, PECAS_UNICAS } from '../../foundry-sistema/scripts/regras.mjs';

const require = createRequire(import.meta.url);
const daWiki = require('../../personagem-cyberware.js');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// O catálogo da loja da wiki (o id, o nome do Foundry e o tipo de cada item), carregado como no navegador.
const daLoja = (() => { const contexto = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(raiz, 'loja-catalogo.js'), 'utf8'), contexto); return contexto.window.shopCatalog.itens; })();

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

test('as peças únicas são as da wiki: as do catálogo da loja que o personagem-cyberware.js marca, por tipo', () => {
  for (const tipo of ['cyberArm', 'cyberLeg']) {
    // A cópia ([...]) traz a lista do contexto da wiki para este (a comparação estrita confere o protótipo).
    const daWikiIds = [...daLoja.filter(item => item.cyber && !item.cyber.base && item.cyber.tipo === tipo && daWiki.pecaUnica(item.en, tipo)).map(item => item.id)].sort();
    assert.deepEqual([...PECAS_UNICAS[tipo]].sort(), daWikiIds, tipo);
  }
  assert.deepEqual(Object.keys(PECAS_UNICAS).sort(), ['cyberArm', 'cyberLeg']);
});

test('a peça única fica no membro natural só com lado e sem fundação do mesmo tipo naquele lado', () => {
  const wolvers = { catalogo: 'core_cyberware:wolvers', tipo: 'cyberArm', lado: 'braco-direito' };
  assert.equal(ficaNoMembroNatural(wolvers, []), true);
  assert.equal(ficaNoMembroNatural(wolvers, ['braco-esquerdo']), true);
  assert.equal(ficaNoMembroNatural(wolvers, ['braco-direito']), false);
  assert.equal(ficaNoMembroNatural({ ...wolvers, lado: '' }, []), false);
  assert.equal(ficaNoMembroNatural({ ...wolvers, lado: 'perna-direita' }, []), false);
  assert.equal(ficaNoMembroNatural({ catalogo: 'cyberware-2077:gorilla-arm', tipo: 'cyberArm', lado: 'braco-direito' }, []), false);
  assert.equal(ficaNoMembroNatural({ catalogo: 'core_cyberware:talon-foot', tipo: 'cyberLeg', lado: 'perna-esquerda' }, []), true);
  assert.equal(ehPecaUnica({ catalogo: 'core_cyberware:wolvers', tipo: 'cyberLeg' }), false);
});

test('a opção com lado só aceita a fundação do mesmo lado (ou uma sem lado); a base natural do Foundry 12 se reconhece', () => {
  const mao = { lado: 'braco-direito', tipo: 'cyberArm' };
  assert.equal(fundacaoDoLado(mao, { lado: 'braco-direito', tipo: 'cyberArm' }), true);
  assert.equal(fundacaoDoLado(mao, { lado: 'braco-esquerdo', tipo: 'cyberArm' }), false);
  assert.equal(fundacaoDoLado(mao, { lado: '', tipo: 'cyberArm' }), true);
  assert.equal(fundacaoDoLado({ lado: '', tipo: 'cyberArm' }, { lado: 'braco-esquerdo', tipo: 'cyberArm' }), true);
  assert.equal(ehBaseNatural({ uid: 'natural:braco-direito', nome: 'qualquer' }), true);
  assert.equal(ehBaseNatural({ uid: '', nome: 'Meat Arm — Braço direito' }), true);
  assert.equal(ehBaseNatural({ uid: '', nome: 'Meat Leg' }), true);
  assert.equal(ehBaseNatural({ uid: 'loja:braco', nome: 'Cyberarm' }), false);
});
