// Referência: foundry-2077/scripts/wiki.mjs, sendKey/avisosDaWiki; api-personagens.js, summary/foundryState e a rota
// foundry, que guardam o envio e o vínculo de cada geração separadamente. Sem Foundry nem navegador.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chaveDeEnvioDaWiki, chaveDosAvisosDaWiki, estadoDeEnvioDaWiki, gravarAvisosVistos, lerAvisosVistos, selecionarAvisosDaWiki } from '../../foundry-sistema/scripts/wiki-avisos.mjs';

const antes = '2026-10-20T12:00:00.000Z';
const depois = '2026-10-20T12:05:00.000Z';
const enviado = (mudancas = {}) => ({ id: 'ficha', nome: 'Morana', publico: false, versao: 3, envio: { quando: depois, versao: 3, resultadoHash: 'novo' }, ...mudancas });
const vinculo = (mudancas = {}) => ({ ator: 'ator14', geracao: 14, importado: antes, sincronizado: antes, versao: 2, resultadoHash: 'antigo', ...mudancas });

test('Avisos da wiki: envio sem vínculo do 14 espera mesmo quando o estado e o vínculo do 12 dizem importado', () => {
  assert.equal(estadoDeEnvioDaWiki(enviado()), 'enviado');
  assert.equal(estadoDeEnvioDaWiki(enviado({ estadoFoundry: 'importado', foundry12: { ator: 'ator12', importado: depois }, foundry: { ator: 'ator12', importado: depois } })), 'enviado');
  assert.equal(estadoDeEnvioDaWiki(enviado({ publico: true })), '');
  assert.equal(estadoDeEnvioDaWiki(enviado({ envio: null, estadoFoundry: 'mudou' })), '');
});

test('Avisos da wiki: só um envio posterior ao vínculo do 14 com resultado diferente espera atualização', () => {
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo() })), 'avisado');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo({ sincronizado: depois }) })), '');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo({ sincronizado: '2026-10-20T12:06:00.000Z' }) })), '');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo({ resultadoHash: 'novo' }) })), '', 'reenviar o mesmo resultado não pede atualização');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo({ removido: depois }) })), 'enviado');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: vinculo({ sincronizado: undefined, importado: depois }) })), '');
});

test('Avisos da wiki: vínculo sem hash usa a versão do envio, e não a versão atual da ficha', () => {
  const semHash = vinculo({ resultadoHash: undefined });
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: semHash })), 'avisado');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: semHash, versao: 20, envio: { quando: depois, versao: 2 } })), '');
  assert.equal(estadoDeEnvioDaWiki(enviado({ foundry14: semHash, envio: { quando: antes, versao: 3 } })), '');
});

test('Avisos da wiki: uma chave por envio; a consulta devolve todas as esperas e identifica só as novidades', () => {
  const ficha = enviado();
  const outra = enviado({ id: 'outra', nome: 'Outra' });
  const pedido = { wikiId: ficha.id, nome: ficha.nome, pedido: { id: 'compra', status: 'pendente' } };
  const erro = { wikiId: outra.id, nome: outra.nome, pedido: { id: 'compra2', status: 'aprovado', erro: 'Sem dinheiro' } };
  const resolvido = { wikiId: ficha.id, pedido: { id: 'fim', status: 'entregue' } };
  const dados = { personagens: [ficha, outra, enviado({ id: 'publica', publico: true })], pedidos: [pedido, erro, resolvido] };
  const primeira = selecionarAvisosDaWiki(dados);
  assert.equal(chaveDeEnvioDaWiki(ficha), `ficha:${depois}`);
  assert.deepEqual(primeira.waiting, [ficha, outra]);
  assert.deepEqual(primeira.pedidos, [pedido, erro]);
  assert.deepEqual(primeira.novos, [ficha, outra]);
  assert.deepEqual(primeira.pedidosNovos, [pedido, erro]);
  const segunda = selecionarAvisosDaWiki(dados, primeira.chaves);
  assert.deepEqual(segunda.waiting, [ficha, outra]);
  assert.deepEqual(segunda.pedidos, [pedido, erro]);
  assert.deepEqual(segunda.novos, []);
  assert.deepEqual(segunda.pedidosNovos, []);
  const novoEnvio = enviado({ envio: { ...ficha.envio, quando: '2026-10-20T12:10:00.000Z' } });
  const novoErro = { ...erro, pedido: { ...erro.pedido, erro: 'Outro erro' } };
  const terceira = selecionarAvisosDaWiki({ personagens: [novoEnvio], pedidos: [novoErro] }, primeira.chaves);
  assert.deepEqual(terceira.novos, [novoEnvio]);
  assert.deepEqual(terceira.pedidosNovos, [novoErro]);
});

test('Avisos da wiki: vistos separados por mundo, sem duplicatas, limitados aos últimos 300 e tolerantes ao navegador', () => {
  const dados = new Map();
  const navegador = { getItem: chave => dados.get(chave), setItem: (chave, valor) => dados.set(chave, valor) };
  const mundo = chaveDosAvisosDaWiki('mundo-14');
  const outro = chaveDosAvisosDaWiki('outro-mundo');
  assert.equal(mundo, 'cpr-fieldbook.wiki-avisos:mundo-14');
  assert.notEqual(mundo, outro);
  assert.deepEqual(lerAvisosVistos(navegador, mundo), []);
  gravarAvisosVistos(navegador, mundo, ['primeiro', 'primeiro', 'segundo']);
  assert.deepEqual(lerAvisosVistos(navegador, mundo), ['primeiro', 'segundo']);
  assert.deepEqual(lerAvisosVistos(navegador, outro), []);
  gravarAvisosVistos(navegador, mundo, Array.from({ length: 301 }, (_, i) => `envio-${i}`));
  const vistos = lerAvisosVistos(navegador, mundo);
  assert.equal(vistos.length, 300);
  assert.equal(vistos[0], 'envio-1');
  assert.equal(vistos.at(-1), 'envio-300');
  for (const invalido of ['{', '{}', 'null', '[42,null,"ok"]']) {
    dados.set(mundo, invalido);
    assert.deepEqual(lerAvisosVistos(navegador, mundo), invalido.startsWith('[42') ? ['ok'] : []);
  }
  assert.deepEqual(lerAvisosVistos(null, mundo), []);
  assert.doesNotThrow(() => gravarAvisosVistos(null, mundo, ['sem navegador']));
  const bloqueado = { getItem: () => { throw new Error('Bloqueado'); }, setItem: () => { throw new Error('Bloqueado'); } };
  assert.deepEqual(lerAvisosVistos(bloqueado, mundo), []);
  assert.doesNotThrow(() => gravarAvisosVistos(bloqueado, mundo, ['sem permissão']));
});
