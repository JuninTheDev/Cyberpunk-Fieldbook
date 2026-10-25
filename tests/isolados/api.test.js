const assert = require('node:assert/strict');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

test('cookie do mestre malformado não interrompe a wiki nem concede acesso', async t => {
  const { pedir } = criarServidorIsolado(t);
  for (const valor of ['%', '%E0%A4%A', '%FF']) {
    const cookie = `gm=${valor}`;
    const estado = await pedir('/api/estado', { cookie });
    assert.equal(estado.status, 200);
    assert.equal(estado.json.mestre, false);
    assert.equal((await pedir('/api/contas', { cookie })).status, 403);
    assert.equal((await pedir('/index.html', { cookie })).status, 403);
  }
  assert.equal((await pedir('/api/eu')).json.papel, 'visitante');
});

test('cookie do jogador malformado é tratado como visitante, inclusive em /api/estado', async t => {
  const { pedir } = criarServidorIsolado(t);
  for (const valor of ['%', '%E0%A4%A', '%FF']) {
    const cookie = `jogador=${valor}`;
    const eu = await pedir('/api/eu', { cookie });
    assert.equal(eu.status, 200);
    assert.equal(eu.json.papel, 'visitante');
    assert.equal((await pedir('/api/estado', { cookie })).status, 200);
    assert.equal((await pedir('/api/personagens', { method: 'POST', cookie, body: { nome: 'Sem acesso' } })).status, 401);
  }
});

test('login assinado do mestre continua válido e um cookie adulterado é recusado', async t => {
  const servidor = criarServidorIsolado(t);
  const cookie = await servidor.entrarComoMestre();
  assert.ok(cookie.startsWith('gm='));
  assert.ok(!cookie.includes(servidor.senha));
  const estado = await servidor.pedir('/api/estado', { cookie });
  assert.equal(estado.json.mestre, true);
  assert.equal((await servidor.pedir('/api/contas', { cookie: `${cookie}0` })).status, 403);
  assert.equal((await servidor.pedir('/api/contas', { cookie: `${cookie}; jogador=%` })).status, 200);
  assert.equal((await servidor.pedir('/api/mestre/entrar', { method: 'POST', body: { senha: 'errada' } })).status, 403);
});

async function criarJogador(servidor, mestre, nome) {
  const resposta = await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome } });
  assert.equal(resposta.status, 201);
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: resposta.json.conta.codigo } });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'], /HttpOnly.*Secure/);
  return { cookie: servidor.cookieDe(login), conta: resposta.json.conta };
}

test('sessão do jogador continua válida ao lado de cookie do mestre malformado', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const jogador = await criarJogador(servidor, mestre, 'Ana');
  const eu = await servidor.pedir('/api/eu', { cookie: `gm=%; ${jogador.cookie}` });
  assert.equal(eu.status, 200);
  assert.equal(eu.json.papel, 'jogador');
  assert.equal(eu.json.jogador.nome, 'Ana');
});

test('API protege autoria e versão da ficha sem navegador ou servidor de rede', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const ana = await criarJogador(servidor, mestre, 'Ana');
  const bruno = await criarJogador(servidor, mestre, 'Bruno');
  const criada = await servidor.pedir('/api/personagens', {
    method: 'POST', cookie: ana.cookie,
    body: { nome: 'V', role: 'solo', dono: bruno.conta.id, versao: 99, stats: { INT: 6 }, notas: 'Pista particular' }
  });
  assert.equal(criada.status, 201);
  const ficha = criada.json.personagem;
  assert.equal(ficha.dono, ana.conta.id);
  assert.equal(ficha.versao, 1);
  const url = `/api/personagens/${ficha.id}`;
  const resumo = await servidor.pedir(url, { cookie: bruno.cookie });
  assert.equal(resumo.status, 200);
  assert.equal(resumo.json.personagem.publico, true);
  assert.equal(resumo.json.personagem.stats, undefined);
  assert.equal(resumo.json.personagem.notas, undefined);
  assert.equal((await servidor.pedir(url, { method: 'PUT', cookie: bruno.cookie, body: { ...ficha, nome: 'Outro dono' } })).status, 403);
  const atualizada = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: { ...ficha, nome: 'V atualizado' } });
  assert.equal(atualizada.status, 200);
  assert.equal(atualizada.json.personagem.versao, 2);
  const antiga = await servidor.pedir(url, { method: 'PUT', cookie: ana.cookie, body: { ...ficha, nome: 'Edição antiga' } });
  assert.equal(antiga.status, 409);
  assert.equal(antiga.json.personagem.nome, 'V atualizado');
});

test('instâncias de teste não compartilham dados ou sessões', async t => {
  const primeira = criarServidorIsolado(t);
  const segunda = criarServidorIsolado(t);
  assert.notEqual(primeira.dados, segunda.dados);
  const jogador = await criarJogador(primeira, await primeira.entrarComoMestre(), 'Só na primeira');
  assert.equal((await primeira.pedir('/api/eu', { cookie: jogador.cookie })).json.papel, 'jogador');
  assert.equal((await segunda.pedir('/api/eu', { cookie: jogador.cookie })).json.papel, 'visitante');
  const contas = await segunda.pedir('/api/contas', { cookie: await segunda.entrarComoMestre() });
  assert.deepEqual(contas.json.contas, []);
});

test('o resumo do personagem traz a Humanidade (EMP × 10 sem ficha da mesa), para o cartão do Início', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const jogador = await criarJogador(servidor, mestre, 'Ana');
  const criado = await servidor.pedir('/api/personagens', { method: 'POST', cookie: jogador.cookie, body: { nome: 'Ricky', stats: { EMP: 6 } } });
  assert.equal(criado.status, 201, criado.text);
  const lista = await servidor.pedir('/api/personagens', { cookie: jogador.cookie });
  const meu = lista.json.personagens.find(item => item.id === criado.json.personagem.id);
  assert.deepEqual(meu.numeros.humanidade, { atual: 60, max: 60 });
  // Sem EMP ainda: nada (o cartão não mostra a barra).
  const vazio = await servidor.pedir('/api/personagens', { method: 'POST', cookie: jogador.cookie, body: { nome: 'Sem STATs' } });
  const semEmp = (await servidor.pedir('/api/personagens', { cookie: jogador.cookie })).json.personagens.find(item => item.id === vazio.json.personagem.id);
  assert.equal(semEmp.numeros.humanidade, null);
});
