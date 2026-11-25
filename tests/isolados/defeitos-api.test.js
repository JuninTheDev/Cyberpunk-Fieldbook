// Os defeitos escondidos das armas (o C71 do sistema do Foundry 14) no servidor da wiki: só o mestre lê e grava, ficam
// num arquivo da campanha à parte (o NetWire manda o mesa.json para a IA, e o defeito não pode ir junto) e a chave é o
// uuid da arma no Foundry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

async function criarJogador(servidor, mestre, nome) {
  const resposta = await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome } });
  assert.equal(resposta.status, 201);
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: resposta.json.conta.codigo } });
  assert.equal(login.status, 200);
  return { cookie: servidor.cookieDe(login), conta: resposta.json.conta };
}

test('C71: o defeito escondido da arma fica no servidor, só para o mestre, fora do mesa.json', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const rota = '/api/campanhas/morana/defeitos';
  const chave = 'Actor.abc123.Item.def456';
  assert.deepEqual((await servidor.pedir(rota, { cookie: mestre })).json, { defeitos: {}, atualizado: null });
  const gravado = await servidor.pedir(rota, { method: 'PUT', cookie: mestre, body: { chave, defeito: { mod: 'gatilho-sensivel', nome: 'Gatilho sensível', arma: 'Velha Senhora · Very Heavy Pistol', ator: 'Vex', extra: 'x' } } });
  assert.equal(gravado.status, 200);
  const lido = (await servidor.pedir(rota, { cookie: mestre })).json.defeitos[chave];
  assert.deepEqual(Object.keys(lido), ['mod', 'nome', 'arma', 'ator', 'quando']);
  assert.equal(lido.mod, 'gatilho-sensivel');
  assert.equal(lido.arma, 'Velha Senhora · Very Heavy Pistol');
  // No arquivo próprio da campanha, e não no mesa.json (que o NetWire manda para a IA).
  const arquivo = path.join(servidor.dados, 'campanhas', 'morana', 'defeitos.json');
  assert.ok(fs.existsSync(arquivo));
  assert.ok(!JSON.stringify((await servidor.pedir('/api/campanhas/morana/mesa', { cookie: mestre })).json).includes('gatilho'));
  // A chave e o defeito fora do formato não gravam.
  assert.equal((await servidor.pedir(rota, { method: 'PUT', cookie: mestre, body: { chave: '../mesa', defeito: { mod: 'gatilho-sensivel' } } })).status, 400);
  assert.equal((await servidor.pedir(rota, { method: 'PUT', cookie: mestre, body: { chave, defeito: { mod: 'Gatilho Sensível!' } } })).status, 400);
  assert.equal((await servidor.pedir(rota, { method: 'DELETE', cookie: mestre })).status, 405);
  // O jogador (mesmo o dono da arma) e o visitante: não leem nem gravam.
  const jogador = await criarJogador(servidor, mestre, 'Ana');
  assert.equal((await servidor.pedir(rota, { cookie: jogador.cookie })).status, 403);
  assert.equal((await servidor.pedir(rota, { method: 'PUT', cookie: jogador.cookie, body: { chave, defeito: null } })).status, 403);
  assert.equal((await servidor.pedir(rota)).status, 403);
  // Revelado, o mestre apaga (defeito null).
  assert.equal((await servidor.pedir(rota, { method: 'PUT', cookie: mestre, body: { chave, defeito: null } })).status, 200);
  assert.deepEqual((await servidor.pedir(rota, { cookie: mestre })).json.defeitos, {});
  assert.equal((await servidor.pedir('/api/campanhas/nao-existe/defeitos', { cookie: mestre })).status, 404);
  // O Foundry do mestre fala de outra origem: a leitura, a gravação e a recusa levam o CORS (sem ele, o navegador bloqueia).
  const doFoundry = { origin: 'http://localhost:30000' };
  assert.equal((await servidor.pedir(rota, { cookie: mestre, headers: doFoundry })).headers['access-control-allow-origin'], 'http://localhost:30000');
  assert.equal((await servidor.pedir(rota, { method: 'PUT', cookie: mestre, headers: doFoundry, body: { chave, defeito: null } })).headers['access-control-allow-credentials'], 'true');
  const recusa = await servidor.pedir(rota, { method: 'PUT', cookie: mestre, headers: doFoundry, body: { chave: '../x', defeito: null } });
  assert.deepEqual([recusa.status, recusa.headers['access-control-allow-origin'], recusa.json.erro], [400, 'http://localhost:30000', 'A chave do defeito é o uuid da arma.']);
});
