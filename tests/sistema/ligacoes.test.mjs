// Testes de referência dos nós de controle ligados à cena (foundry-sistema/scripts/netrun/ligacoes.mjs), sem Foundry:
// o que a cena tem para ligar e com que nome, as ligações de cada nó e a situação de cada coisa, com os comandos, como o
// ligacoes.mjs do NET Architect da mesa (foundry-net-architect/scripts/ligacoes.mjs).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import test from 'node:test';
import { ligacoesDo, nomeDe, objetosDaCena, situacao } from '../../foundry-sistema/scripts/netrun/ligacoes.mjs';

// Uma coleção como a do Foundry: lista, filter, map e get pelo id.
const colecao = docs => Object.assign([...docs], { get: id => docs.find(doc => doc.id === id) ?? null });
const doc = dados => ({ getFlag: (escopo, chave) => dados.flags?.[escopo]?.[chave], ...dados });
const cena = {
  walls: colecao([doc({ id: 'parede', door: 0, c: [0, 0, 100, 0] }), doc({ id: 'porta', door: 1, ds: 0, c: [100, 200, 300, 200] })]),
  lights: colecao([doc({ id: 'luz', x: 50, y: 60, hidden: false })]),
  sounds: colecao([doc({ id: 'som', path: 'sons/alarme.ogg', hidden: true })]),
  tokens: colecao([doc({ id: 'torreta', name: 'Torreta' }), doc({ id: 'ice', name: 'Hellhound', flags: { 'cpr-fieldbook': { inimigoDaNet: { chave: '1a.0' } } } })])
};

test('Ligações (o NET Architect da mesa): a cena oferece as portas (só a parede com porta), as luzes, os sons e os tokens, menos os inimigos da NET, cada um com um nome legível', () => {
  const objetos = objetosDaCena(cena);
  assert.deepEqual(objetos.porta, [{ id: 'porta', nome: 'Porta 1 (200, 200)' }]);
  assert.deepEqual(objetos.luz, [{ id: 'luz', nome: 'Luz 1 (50, 60)' }]);
  assert.deepEqual(objetos.som, [{ id: 'som', nome: 'Som 1: alarme.ogg' }]);
  assert.deepEqual(objetos.token, [{ id: 'torreta', nome: 'Torreta' }]);
  assert.equal(nomeDe(cena, { tipo: 'luz', id: 'sumiu' }), 'Luz (saiu da cena)');
});

test('Ligações: cada nó com as dele, na ordem em que foram feitas (o índice da janela e do motor)', () => {
  const ponto = { ligacoes: [{ controle: '1a.0', tipo: 'porta', id: 'porta' }, { controle: '2a.0', tipo: 'luz', id: 'luz' }, { controle: '1a.0', tipo: 'token', id: 'torreta' }] };
  assert.deepEqual(ligacoesDo(ponto, '1a.0').map(item => item.id), ['porta', 'torreta']);
  assert.deepEqual(ligacoesDo(ponto, '3a.0'), []);
  assert.deepEqual(ligacoesDo({}, '1a.0'), []);
});

test('Ligações: a situação de cada coisa e os comandos que ela aceita (a porta fechada abre ou tranca; a luz ligada desliga; o token assumido volta)', () => {
  const comandos = s => `${s.texto}: ${s.acoes.map(([acao]) => acao).join(',')}`;
  const porta = ds => comandos(situacao({ ...cena, walls: colecao([doc({ id: 'porta', door: 1, ds, c: [0, 0, 0, 0] })]) }, { tipo: 'porta', id: 'porta' }, {}));
  assert.deepEqual([0, 1, 2].map(porta), ['fechada: abrir,trancar', 'aberta: fechar,trancar', 'trancada: abrir,fechar']);
  assert.equal(comandos(situacao(cena, { tipo: 'luz', id: 'luz' }, {})), 'ligada: desligar');
  assert.equal(comandos(situacao(cena, { tipo: 'som', id: 'som' }, {})), 'desligada: ligar');
  assert.equal(comandos(situacao(cena, { tipo: 'token', id: 'torreta' }, { assumidos: [] })), 'com o dono de sempre: assumir');
  assert.equal(comandos(situacao(cena, { tipo: 'token', id: 'torreta' }, { assumidos: [{ token: 'torreta' }] })), 'sob controle do netrunner: devolver');
  assert.equal(comandos(situacao(cena, { tipo: 'porta', id: 'sumiu' }, {})), 'não está mais na cena: ');
});
