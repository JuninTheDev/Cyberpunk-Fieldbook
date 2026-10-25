// NetWire (api-netwire.js): quem vê cada canal e cada mensagem, quem responde onde, a agendada que chega sozinha e o
// que nunca vai para o jogador (rascunho, nota, contas dos outros, a campanha dos outros).
const assert = require('node:assert/strict');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

async function jogador(servidor, mestre, nome, campanhas) {
  const conta = await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome, ...(campanhas ? { campanhas } : {}) } });
  assert.equal(conta.status, 201, conta.text);
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
  assert.equal(login.status, 200, login.text);
  return { cookie: servidor.cookieDe(login), conta: conta.json.conta };
}

// Um canal da cidade (só leitura), a conversa de Wakako com a Ana (que aceita resposta) e mensagens em cada estado.
async function preparar(t) {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const ana = await jogador(servidor, mestre, 'Ana');
  const bia = await jogador(servidor, mestre, 'Bia');
  const canal = async body => {
    const resposta = await servidor.pedir('/api/netwire/canais?campanha=morana', { method: 'POST', cookie: mestre, body });
    assert.equal(resposta.status, 200, resposta.text);
    return resposta.json.canal;
  };
  const kabuki = await canal({ nome: '#kabuki', tipo: 'feed', contato: { nome: 'Kabuki', descricao: 'O bairro' } });
  const wakako = await canal({ nome: 'Wakako Okada', tipo: 'direto', contato: { nome: 'Wakako Okada', descricao: 'Fixer de Japantown' }, aceitaResposta: true, para: [ana.conta.id] });
  const mensagem = async body => {
    const resposta = await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: mestre, body: { campanha: 'morana', ...body } });
    assert.equal(resposta.status, 200, resposta.text);
    return resposta.json.mensagem;
  };
  const passado = new Date(Date.now() - 60000).toISOString();
  const futuro = new Date(Date.now() + 3600000).toISOString();
  const rascunho = await mensagem({ canal: kabuki.id, texto: 'RASCUNHO-SECRETO', estado: 'rascunho', nota: 'NOTA-DO-MESTRE' });
  const chegou = await mensagem({ canal: kabuki.id, texto: 'Apagão na rua 9', estado: 'agendada', quando: passado });
  const depois = await mensagem({ canal: kabuki.id, texto: 'AINDA-NAO', estado: 'agendada', quando: futuro });
  const recado = await mensagem({ canal: wakako.id, texto: 'Tenho um trabalho em Japantown.', estado: 'entregue', nota: 'NOTA-DO-MESTRE', origem: 'ia' });
  return { servidor, mestre, ana, bia, kabuki, wakako, rascunho, chegou, depois, recado };
}

test('NetWire: o jogador vê só os canais dele e só o que já foi entregue, sem nota nem rascunho', async t => {
  const { servidor, ana, bia, kabuki, wakako } = await preparar(t);
  const visao = await servidor.pedir('/api/netwire', { cookie: ana.cookie });
  assert.equal(visao.status, 200, visao.text);
  const canais = visao.json.canais.map(canal => canal.id);
  assert.deepEqual(canais, ['handouts', 'n54-news', kabuki.id, wakako.id]);
  const textos = visao.json.mensagens.filter(item => !['handouts', 'n54-news'].includes(item.canal)).map(item => item.texto);
  assert.deepEqual(textos, ['Apagão na rua 9', 'Tenho um trabalho em Japantown.']);
  for (const segredo of ['RASCUNHO-SECRETO', 'NOTA-DO-MESTRE', 'AINDA-NAO', '"nota"', '"origem"', '"para"', '"estado"', ana.conta.id, bia.conta.id, 'morana']) {
    assert.ok(!visao.text.includes(segredo), `vazou ${segredo}`);
  }
  // A Bia não está na conversa da Wakako com a Ana.
  const daBia = await servidor.pedir('/api/netwire', { cookie: bia.cookie });
  assert.deepEqual(daBia.json.canais.map(canal => canal.id), ['handouts', 'n54-news', kabuki.id]);
  assert.ok(!daBia.text.includes('Japantown'));
});

test('NetWire: o mestre vê tudo, inclusive rascunho, nota e a agendada que ainda não chegou', async t => {
  const { servidor, mestre, rascunho, depois, recado } = await preparar(t);
  const visao = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.equal(visao.status, 200, visao.text);
  const porId = Object.fromEntries(visao.json.mensagens.map(item => [item.id, item]));
  assert.equal(porId[rascunho.id].nota, 'NOTA-DO-MESTRE');
  assert.equal(porId[depois.id].entregue, false);
  assert.equal(porId[recado.id].origem, 'ia');
  assert.deepEqual(visao.json.aguardando, []);
});

test('NetWire: o jogador responde só onde pode; a resposta assina com o personagem e espera o mestre', async t => {
  const { servidor, mestre, ana, bia, kabuki, wakako } = await preparar(t);
  const personagem = (await servidor.pedir('/api/personagens', { method: 'POST', cookie: ana.cookie, body: { nome: 'Ricky', apelido: 'Mão Boba' } })).json.personagem;
  const resposta = await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: wakako.id, texto: 'Topo. Quanto paga?', personagem: personagem.id } });
  assert.equal(resposta.status, 200, resposta.text);
  assert.equal(resposta.json.mensagem.autor.nome, 'Mão Boba');
  assert.equal(resposta.json.mensagem.autor.minha, true);
  // Canal só de leitura, canal dos outros, texto vazio.
  assert.equal((await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: kabuki.id, texto: 'oi' } })).status, 403);
  assert.equal((await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: bia.cookie, body: { canal: wakako.id, texto: 'oi' } })).status, 404);
  assert.equal((await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: wakako.id, texto: '   ' } })).status, 400);
  // O personagem de outra pessoa não serve de assinatura: vale o nome da conta.
  const daBia = (await servidor.pedir('/api/personagens', { method: 'POST', cookie: bia.cookie, body: { nome: 'Outro' } })).json.personagem;
  const falsa = await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: wakako.id, texto: 'Sou o outro', personagem: daBia.id } });
  assert.equal(falsa.json.mensagem.autor.nome, 'Ana');
  // O mestre vê a conversa esperando por ele, e a mensagem do jogador não se edita.
  const doMestre = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.deepEqual(doMestre.json.aguardando, [wakako.id]);
  assert.equal((await servidor.pedir(`/api/netwire/mensagens/${resposta.json.mensagem.id}?campanha=morana`, { method: 'PUT', cookie: mestre, body: { campanha: 'morana', texto: 'mudado' } })).status, 409);
  // O jogador não mexe no que é do mestre.
  assert.equal((await servidor.pedir(`/api/netwire/mensagens/${resposta.json.mensagem.id}`, { method: 'DELETE', cookie: ana.cookie })).status, 403);
  assert.equal((await servidor.pedir('/api/netwire/canais', { method: 'POST', cookie: ana.cookie, body: { nome: 'meu' } })).status, 403);
});

test('NetWire: aprovar entrega na hora, e agendar sem data é recusado', async t => {
  const { servidor, mestre, ana, rascunho, kabuki } = await preparar(t);
  assert.equal((await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: mestre, body: { campanha: 'morana', canal: kabuki.id, texto: 'x', estado: 'agendada' } })).status, 400);
  const antes = (await servidor.pedir('/api/visao', { cookie: ana.cookie })).json;
  const aprovada = await servidor.pedir(`/api/netwire/mensagens/${rascunho.id}?campanha=morana`, { method: 'PUT', cookie: mestre, body: { campanha: 'morana', estado: 'entregue' } });
  assert.equal(aprovada.status, 200, aprovada.text);
  assert.equal(aprovada.json.mensagem.estado, 'entregue');
  const visao = await servidor.pedir('/api/netwire', { cookie: ana.cookie });
  assert.ok(visao.text.includes('RASCUNHO-SECRETO'));
  assert.ok(!visao.text.includes('NOTA-DO-MESTRE'));
  // A visão dos jogadores conta a mensagem como novidade (o selo e o aviso "o mestre publicou").
  const depois = (await servidor.pedir('/api/visao', { cookie: ana.cookie })).json;
  assert.ok(depois.atualizado >= antes.atualizado && depois.mensagens >= antes.mensagens, `${antes.atualizado} → ${depois.atualizado}`);
});

test('NetWire: visitante entra, jogador de outra campanha não acha nada, e o jogador não manda mensagem sem parar', async t => {
  const { servidor, mestre, ana, wakako } = await preparar(t);
  assert.equal((await servidor.pedir('/api/netwire')).status, 401);
  const outra = await servidor.pedir('/api/campanhas', { method: 'POST', cookie: mestre, body: { nome: 'Outra mesa' } });
  const fora = await jogador(servidor, mestre, 'Fora', [outra.json.campanha.id]);
  assert.equal((await servidor.pedir('/api/netwire?campanha=morana', { cookie: fora.cookie })).status, 404);
  const dele = await servidor.pedir('/api/netwire', { cookie: fora.cookie });
  assert.equal(dele.status, 200);
  assert.ok(!dele.text.includes('Japantown') && !dele.text.includes(wakako.id));
  const enviar = () => servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: wakako.id, texto: 'oi' } });
  for (let i = 0; i < 12; i++) assert.equal((await enviar()).status, 200);
  assert.equal((await enviar()).status, 429);
});

test('NetWire: apagar o canal leva as mensagens dele junto', async t => {
  const { servidor, mestre, ana, wakako } = await preparar(t);
  assert.equal((await servidor.pedir(`/api/netwire/canais/${wakako.id}?campanha=morana`, { method: 'DELETE', cookie: mestre })).status, 200);
  const visao = await servidor.pedir('/api/netwire', { cookie: ana.cookie });
  assert.ok(!visao.text.includes('Japantown'));
  const doMestre = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.ok(!doMestre.json.mensagens.some(item => item.canal === wakako.id));
});

test('NetWire: o mestre exclui a mensagem do jogador; some para todos e a conversa deixa de esperar o mestre', async t => {
  const { servidor, mestre, ana, wakako } = await preparar(t);
  const enviada = await servidor.pedir('/api/netwire/mensagens', { method: 'POST', cookie: ana.cookie, body: { canal: wakako.id, texto: 'MENSAGEM-DO-JOGADOR' } });
  assert.equal(enviada.status, 200, enviada.text);
  assert.deepEqual((await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre })).json.aguardando, [wakako.id]);
  // O jogador não exclui (nem a dele); o mestre exclui.
  assert.equal((await servidor.pedir(`/api/netwire/mensagens/${enviada.json.mensagem.id}`, { method: 'DELETE', cookie: ana.cookie })).status, 403);
  assert.equal((await servidor.pedir(`/api/netwire/mensagens/${enviada.json.mensagem.id}?campanha=morana`, { method: 'DELETE', cookie: mestre })).status, 200);
  assert.ok(!(await servidor.pedir('/api/netwire', { cookie: ana.cookie })).text.includes('MENSAGEM-DO-JOGADOR'));
  const doMestre = await servidor.pedir('/api/netwire?campanha=morana', { cookie: mestre });
  assert.ok(!doMestre.text.includes('MENSAGEM-DO-JOGADOR'));
  assert.deepEqual(doMestre.json.aguardando, []);
});
