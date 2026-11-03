const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

test('o roteiro da sessão fica na pasta de dados e só o mestre lê', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const pasta = path.join(servidor.dados, 'campanhas', 'morana', 'roteiros');
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, 'sessao-02.md'), '# Sessão 2\n\nSó o mestre.\n');
  const lido = await servidor.pedir('/api/campanhas/morana/roteiros/sessao-02', { cookie: mestre });
  assert.equal(lido.status, 200);
  assert.match(lido.headers['content-type'], /text\/markdown/);
  assert.equal(lido.headers['cache-control'], 'private, no-store');
  assert.equal(lido.text, '# Sessão 2\n\nSó o mestre.\n');
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-03', { cookie: mestre })).status, 404);
  // Nome fora do padrão (um caminho para fora da pasta) não lê nada.
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/..%2Fmesa', { cookie: mestre })).status, 404);
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-02', { method: 'DELETE', cookie: mestre })).status, 405);
  // O mestre manda (ou troca) o roteiro pela aba; vazio ou nome fora do padrão, não.
  const enviado = await servidor.pedir('/api/campanhas/morana/roteiros/sessao-03', { method: 'PUT', cookie: mestre, body: { texto: '# Sessão 3\n' } });
  assert.equal(enviado.status, 200);
  assert.equal(fs.readFileSync(path.join(pasta, 'sessao-03.md'), 'utf8'), '# Sessão 3\n');
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-03', { cookie: mestre })).text, '# Sessão 3\n');
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-03', { method: 'PUT', cookie: mestre, body: { texto: '  ' } })).status, 400);
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/..%2Fmesa', { method: 'PUT', cookie: mestre, body: { texto: 'x' } })).status, 400);
  assert.ok(!fs.existsSync(path.join(servidor.dados, 'campanhas', 'morana', 'mesa.md')));
  // Jogador e visitante: não.
  const jogador = await criarJogador(servidor, mestre, 'Ana');
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-02', { cookie: jogador.cookie })).status, 403);
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-02', { method: 'PUT', cookie: jogador.cookie, body: { texto: 'x' } })).status, 403);
  assert.equal((await servidor.pedir('/api/campanhas/morana/roteiros/sessao-02')).status, 403);
  assert.equal(fs.readFileSync(path.join(pasta, 'sessao-02.md'), 'utf8'), '# Sessão 2\n\nSó o mestre.\n');
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

// A Visão dos jogadores lê da base (B6 do worldbuilding): o item do Publicar que vem de um registro guarda o id dele, e
// o servidor monta o que vai para os jogadores com a base de verdade (documentos/morana/base-da-campanha.md) e os pontos
// do mapa do mestre (campaign-map.js).
test('a Visão dos jogadores lê da base: dos registros revelados, só o nome, o "Para os jogadores" e a posição do ponto', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const raiz = path.resolve(__dirname, '../..');
  const arquivoDaBase = path.join(raiz, 'documentos', 'morana', 'base-da-campanha.md');
  const base = require(path.join(raiz, 'campanha-base.js')).ler(fs.readFileSync(arquivoDaBase, 'utf8'));
  const registro = id => base.todos.get(id);
  const mapa = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(raiz, 'campaign-map.js'), 'utf8'), mapa);
  const ponto = id => mapa.window.campaignMapData.markers.find(marker => marker.id === id);
  const pachinko = registro('pachinko-de-wakako');
  const doMapa = ponto(pachinko.campos.mapa);
  const daBase = {
    resumo: '', noticias: [], sessoes: [],
    npcs: [
      { id: 'p-wakako', base: 'wakako-okada', papel: 'Quem contratou o grupo', nota: 'NOTA-DO-MESTRE', revelado: true },
      // O que vier a mais no item não vai: o texto e o Lado são do registro.
      { id: 'p-endo', base: 'endo', nome: 'O mensageiro', texto: 'TEXTO-INJETADO', lado: 'LADO-INJETADO', revelado: true },
      { id: 'p-mina', base: 'mina-kuroda', revelado: false },
      { id: 'p-maleta', base: 'a-maleta', revelado: true },
      { id: 'p-sumiu', base: 'registro-que-nao-existe', revelado: true },
      { id: 'p-digitado', nome: 'Tomas Vale', papel: 'Vizinho', texto: 'Digitado no Publicar.', nota: 'NOTA-DO-MESTRE', revelado: true }
    ],
    lugares: [
      { id: 'l-pachinko', base: 'pachinko-de-wakako', x: 1, y: 1, revelado: true },
      { id: 'l-ricky', base: 'consultorio-do-ricky', x: 2360, y: 1500, revelado: true },
      { id: 'l-armazem', base: 'armazem-de-kabuki', revelado: false }
    ]
  };
  const publicar = mestreView => servidor.pedir('/api/campanhas/morana/publicar', { method: 'POST', cookie: mestre, body: { mestre: mestreView } });
  assert.equal((await publicar(daBase)).status, 200);
  const jogador = await criarJogador(servidor, mestre, 'Ana');
  const visao = await servidor.pedir('/api/visao?campanha=morana', { cookie: jogador.cookie });
  assert.equal(visao.status, 200);
  assert.deepEqual(visao.json.npcs, [
    { id: 'p-wakako', nome: 'Wakako Okada', papel: 'Quem contratou o grupo', texto: registro('wakako-okada').campos.publico },
    { id: 'p-endo', nome: 'O mensageiro', papel: '', texto: registro('endo').campos.publico },
    { id: 'p-digitado', nome: 'Tomas Vale', papel: 'Vizinho', texto: 'Digitado no Publicar.' }
  ]);
  assert.deepEqual(visao.json.lugares, [
    { id: 'l-pachinko', nome: 'Pachinko de Wakako', distrito: pachinko.campos.distrito, x: doMapa.x, y: doMapa.y, texto: pachinko.campos.publico },
    // Sem ponto no mapa: a posição do item.
    { id: 'l-ricky', nome: 'Consultório do Ricky', distrito: registro('consultorio-do-ricky').campos.distrito, x: 2360, y: 1500, texto: registro('consultorio-do-ricky').campos.publico }
  ]);
  // Nunca chegam ao jogador: o registro não revelado, a nota, o texto do mestre, o Lado e as relações do registro, nem
  // o id da base.
  const recebido = JSON.stringify(visao.json);
  const proibidos = ['NOTA-DO-MESTRE', 'TEXTO-INJETADO', 'LADO-INJETADO', 'p-mina', 'l-armazem', 'p-maleta', 'p-sumiu', '"base"',
    registro('wakako-okada').texto, registro('endo').texto, pachinko.texto, registro('wakako-okada').campos.relacoes, registro('wakako-okada').campos.lado];
  assert.deepEqual(proibidos.filter(texto => recebido.includes(JSON.stringify(texto).slice(1, -1))), []);
  // O mestre continua lendo o Publicar como gravou: o id do registro e a nota.
  const doMestre = (await servidor.pedir('/api/campanhas/morana/publicar', { cookie: mestre })).json;
  assert.deepEqual(doMestre.npcs[0], daBase.npcs[0]);
  // A base que muda (o publicar.bat manda o arquivo novo) atualiza a página dos jogadores, quando algum item revelado
  // vem dela.
  const arquivoDoPublicar = path.join(servidor.dados, 'campanhas', 'morana', 'publicar.json');
  const antigo = () => fs.writeFileSync(arquivoDoPublicar, JSON.stringify({ ...JSON.parse(fs.readFileSync(arquivoDoPublicar, 'utf8')), atualizado: '2000-01-01T00:00:00.000Z' }));
  antigo();
  assert.equal((await servidor.pedir('/api/visao?campanha=morana', { cookie: jogador.cookie })).json.atualizado, new Date(fs.statSync(arquivoDaBase).mtimeMs).toISOString());
  assert.equal((await publicar({ ...daBase, npcs: daBase.npcs.slice(-1), lugares: daBase.lugares.map(item => ({ ...item, revelado: false })) })).status, 200);
  antigo();
  const soDigitado = (await servidor.pedir('/api/visao?campanha=morana', { cookie: jogador.cookie })).json;
  assert.equal(soDigitado.atualizado, '2000-01-01T00:00:00.000Z');
  assert.deepEqual(soDigitado.npcs, [{ id: 'p-digitado', nome: 'Tomas Vale', papel: 'Vizinho', texto: 'Digitado no Publicar.' }]);
});

// A base de agora: o arquivo que mudou (o publicar.bat mandou outro) vale na próxima leitura, sem publicar de novo. Os
// pontos do mapa do mestre são só do Protocolo Morana, e sem o arquivo da base o item dela não vai. As campanhas e os
// documentos ficam na pasta temporária do servidor isolado.
test('a Visão dos jogadores lê a base de agora, e os pontos do mapa são só do Protocolo Morana', async t => {
  const { dados } = criarServidorIsolado(t);
  const { createCampaigns } = require('../../api-campanhas');
  const docs = path.join(dados, 'documentos');
  const writeJsonAtomic = async (arquivo, valor) => { fs.mkdirSync(path.dirname(arquivo), { recursive: true }); fs.writeFileSync(arquivo, JSON.stringify(valor)); };
  const campaigns = createCampaigns({ dataDir: path.join(dados, 'direto'), writeJsonAtomic, docsDir: docs });
  const escreverBase = (campanha, publico, quando) => {
    const arquivo = path.join(docs, campanha, 'base-da-campanha.md');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, ['## Lugares', '### Bar Azul', '- **Distrito:** Watson', '- **Mapa:** wakako-jig-jig', `- **Para os jogadores:** ${publico}`, ''].join('\n'));
    fs.utimesSync(arquivo, quando, quando);
  };
  const mapa = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../campaign-map.js'), 'utf8'), mapa);
  const ponto = mapa.window.campaignMapData.markers.find(marker => marker.id === 'wakako-jig-jig');
  for (const id of ['morana', 'outra']) await campaigns.writePublish(id, { resumo: '', npcs: [], noticias: [], lugares: [{ id: 'l1', base: 'bar-azul', x: 10, y: 20, revelado: true }] });
  assert.deepEqual(campaigns.readPublish('morana').publicado.lugares, []);
  assert.equal(campaigns.readPublish('morana').daBase, null);
  const antes = new Date('2026-01-01T00:00:00.000Z');
  const depois = new Date('2026-02-01T00:00:00.000Z');
  escreverBase('morana', 'O bar de antes.', antes);
  escreverBase('outra', 'O bar da outra.', antes);
  assert.deepEqual(campaigns.readPublish('morana').publicado.lugares, [{ id: 'l1', nome: 'Bar Azul', distrito: 'Watson', x: ponto.x, y: ponto.y, texto: 'O bar de antes.' }]);
  assert.equal(campaigns.readPublish('morana').daBase, antes.toISOString());
  // Na outra campanha, o ponto do mapa do Morana não vale: fica a posição do item.
  assert.deepEqual(campaigns.readPublish('outra').publicado.lugares, [{ id: 'l1', nome: 'Bar Azul', distrito: 'Watson', x: 10, y: 20, texto: 'O bar da outra.' }]);
  escreverBase('morana', 'O bar de depois.', depois);
  assert.equal(campaigns.readPublish('morana').publicado.lugares[0].texto, 'O bar de depois.');
  assert.equal(campaigns.readPublish('morana').daBase, depois.toISOString());
});
