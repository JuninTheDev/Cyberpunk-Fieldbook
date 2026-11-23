// A auditoria de 2026-11-16: o C55 (quem a arma atinge) e o C56 (o remetente verdadeiro nos pedidos pelo socket).
// C55: o explosivo e o fogo supressivo com um contêiner, um Black ICE ou um demônio por perto davam TypeError no
// resolver (eles não têm perícias nem REF), depois de gastar a bala. A referência do que a arma atinge é a wiki: os
// veículos têm SDP e não esquivam (system-rules.js:538); o Black ICE e o demônio estão na NET; o contêiner é a loja ou o
// saque (o container do CORE, sem HP).
// C56: os ouvintes do socket pegavam quem pediu num campo da mensagem, que o cliente escreve: um jogador, pelo console, se
// passava pelo mestre. O Foundry 14 dá o id verdadeiro de quem mandou como o segundo argumento do ouvinte (o
// handleCustomSocket do servidor). O G4 confere um pedido forjado na NET; aqui, que nenhum ouvinte lê o usuário da
// mensagem. Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ALVOS_DE_ARMA, ALVOS_DO_SUPRESSIVO, ATORES_DA_NET } from '../../foundry-sistema/scripts/config.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const sistema = JSON.parse(ler('foundry-sistema/system.json'));
const corpoDa = (fonte, assinatura) => {
  const inicio = fonte.indexOf(assinatura);
  assert.ok(inicio >= 0, `achei ${assinatura}`);
  return fonte.slice(inicio, fonte.indexOf('\n}', inicio));
};

test('C55: a arma atinge as pessoas e o veículo; o contêiner e os atores da NET, não', () => {
  const tipos = Object.keys(sistema.documentTypes.Actor);
  assert.deepEqual([...ALVOS_DE_ARMA].sort(), ['capanga', 'personagem', 'veiculo']);
  assert.deepEqual(tipos.filter(tipo => !ALVOS_DE_ARMA.includes(tipo)).sort(), ['blackice', 'conteiner', 'demonio'], 'todo tipo de ator do sistema tem lugar');
  for (const tipo of ATORES_DA_NET) assert.equal(ALVOS_DE_ARMA.includes(tipo), false, tipo);
  // O fogo supressivo pede a Concentração (WILL): só as pessoas.
  assert.deepEqual([...ALVOS_DO_SUPRESSIVO].sort(), ['capanga', 'personagem']);
  assert.match(ler('system-rules.js'), /section\('Veículos', '189–192'/, 'a fonte: a seção dos veículos (system-rules.js:538)');
});

test('C55: a área do explosivo, o supressivo sem alvo e os alvos marcados passam pelo filtro', () => {
  const modos = ler('foundry-sistema/scripts/combate/modos.mjs');
  assert.match(corpoDa(modos, 'function naArea('), /ALVOS_DE_ARMA\.includes\(token\.actor\?\.type\)/);
  assert.match(corpoDa(modos, 'function sobFogo('), /!ALVOS_DO_SUPRESSIVO\.includes\(token\.actor\?\.type\)/);
  const combate = ler('foundry-sistema/scripts/combate.mjs');
  assert.match(combate, /const lista = marcados\.filter\(token => ALVOS_DE_ARMA\.includes\(token\.actor\.type\)\);/);
});

test('C56: nenhum ouvinte do socket tira quem pediu da mensagem; todos usam o remetente do Foundry', () => {
  const arquivos = ['combate/socket.mjs', 'netrun/socket.mjs', 'agarrao.mjs', 'artes-marciais.mjs', 'neuroport.mjs', 'tripulacao.mjs', 'vinculo-veiculo.mjs', 'pedido-teste.mjs'];
  for (const arquivo of arquivos) {
    const fonte = ler(`foundry-sistema/scripts/${arquivo}`);
    assert.match(fonte, /game\.socket\.on\(CANAL, (async )?\(mensagem, remetente\) =>/, `${arquivo}: o ouvinte recebe o remetente`);
    assert.doesNotMatch(fonte, /game\.users\.get\(mensagem\./, `${arquivo}: o usuário não vem da mensagem`);
    assert.doesNotMatch(fonte, /=== mensagem\.de\b/, `${arquivo}: a resposta confere o remetente, não o "de" da mensagem`);
  }
  // Os ouvintes do sistema são só esses (um novo entra aqui).
  const todos = fs.readdirSync(new URL('../../foundry-sistema/scripts/', import.meta.url), { recursive: true }).filter(nome => nome.endsWith('.mjs'))
    .filter(nome => ler(`foundry-sistema/scripts/${nome}`).includes('game.socket.on(')).map(nome => nome.replace(/\\/g, '/')).sort();
  assert.deepEqual(todos, [...arquivos].sort());
  // O combate: o pedido e o fim dele só valem vindos de um mestre; a resposta, só de quem recebeu o pedido.
  const combate = ler('foundry-sistema/scripts/combate/socket.mjs');
  assert.match(combate, /mensagem\.tipo === 'pedido' && mensagem\.usuario === game\.user\.id && quem\?\.isGM/);
  assert.match(combate, /mensagem\.tipo === 'expirou' && quem\?\.isGM/);
  assert.match(combate, /if \(espera && espera\.de === remetente\) espera\(mensagem\.resposta\);/);
  assert.match(combate, /\{ de: usuario\.id \}/);
  // A NET: a resposta vai para quem pediu de verdade e só vale vinda de um mestre.
  const net = ler('foundry-sistema/scripts/netrun/socket.mjs');
  assert.match(net, /executar\(mensagem\.op, mensagem\.dados, game\.users\.get\(remetente\)\)/);
  assert.match(net, /usuario: remetente, \.\.\.resposta/);
  assert.match(net, /mensagem\.usuario === game\.user\.id && game\.users\.get\(remetente\)\?\.isGM/);
});
