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

test('a própria senha no cookie do mestre não vale (sem o limite de tentativas, ela servia para testar senhas)', async t => {
  const servidor = criarServidorIsolado(t);
  for (const cookie of [`gm=${servidor.senha}`, `gm=${encodeURIComponent(servidor.senha)}`]) {
    assert.equal((await servidor.pedir('/api/estado', { cookie })).json.mestre, false);
    assert.equal((await servidor.pedir('/api/contas', { cookie })).status, 403);
    assert.equal((await servidor.pedir('/index.html', { cookie })).status, 403);
  }
  // O cookie assinado continua valendo.
  const assinado = await servidor.entrarComoMestre();
  assert.equal((await servidor.pedir('/api/estado', { cookie: assinado })).json.mestre, true);
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
  // A lista das campanhas, para o menu do mestre, traz os roteiros (o título e os handouts "### H-xx · Título", uma vez
  // cada); o jogador não vê a lista dos roteiros.
  fs.writeFileSync(path.join(pasta, '00-a-campanha.md'), '# A campanha\n\n### H-01 · A mensagem\n\n> Tô viva.\n\n### H-02 · A planta\n\n### H-01 · A mensagem\n');
  const lista = await servidor.pedir('/api/campanhas', { cookie: mestre });
  assert.deepEqual(lista.json.campanhas.find(item => item.id === 'morana').roteiros, [
    { nome: '00-a-campanha', titulo: 'A campanha', handouts: ['H-01', 'H-02'] },
    { nome: 'sessao-02', titulo: 'Sessão 2', handouts: [] },
    { nome: 'sessao-03', titulo: 'Sessão 3', handouts: [] }
  ]);
  const doJogador = await servidor.pedir('/api/campanhas', { cookie: jogador.cookie });
  assert.ok(doJogador.json.campanhas.length && doJogador.json.campanhas.every(item => item.roteiros === undefined));
  // O roteiro com momentos marcados ("- **Momento:** id") ganha a aba Narrar: a lista traz narrar: true; sem a marcação,
  // a chave não vem (o deepEqual de cima).
  fs.writeFileSync(path.join(pasta, 'sessao-04.md'), '# Sessão 4\n\n## A abertura\n\n- **Momento:** abertura\n\n> A chuva cai.\n');
  const comNarrar = (await servidor.pedir('/api/campanhas', { cookie: mestre })).json.campanhas.find(item => item.id === 'morana').roteiros.find(item => item.nome === 'sessao-04');
  assert.deepEqual(comNarrar, { nome: 'sessao-04', titulo: 'Sessão 4', handouts: [], narrar: true });
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

test('a fase 2 da auditoria: a saúde do servidor mostra a última cópia fora dele; o Baixar backup do mestre marca', async t => {
  const backups = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'fieldbook-api-isolada-backups-'));
  t.after(() => require('node:fs').rmSync(backups, { recursive: true, force: true }));
  require('node:fs').writeFileSync(require('node:path').join(backups, 'backup-2026-11-20.tar.gz'), 'backup');
  const servidor = criarServidorIsolado(t, { env: { BACKUPS: backups } });
  const mestre = await servidor.entrarComoMestre();
  const saude = async () => (await servidor.pedir('/api/estado', { cookie: mestre })).json.servidor;
  assert.equal((await saude()).copiaFora, null, 'nenhuma cópia ainda');
  const baixou = await servidor.pedir('/api/backup', { cookie: mestre });
  assert.equal(baixou.status, 200);
  await new Promise(r => setTimeout(r, 100));
  const marcada = (await saude()).copiaFora;
  assert.ok(marcada && Date.now() - Date.parse(marcada) < 60000, `marcada agora: ${marcada}`);
  // Só o mestre baixa (e marca).
  assert.equal((await servidor.pedir('/api/backup')).status, 403);
});

test('a fase 2 da auditoria: o mestre entra com uma sessão por aparelho; sair tira a deste, e sair de todos tira todas', async t => {
  const servidor = criarServidorIsolado(t);
  const tablet = await servidor.entrarComoMestre();
  const pc = await servidor.entrarComoMestre();
  assert.notEqual(tablet, pc, 'uma sessão por aparelho');
  const mestre = async cookie => (await servidor.pedir('/api/estado', { cookie })).json.mestre;
  assert.equal(await mestre(tablet), true);
  assert.equal(await mestre(pc), true);
  // O arquivo guarda o hash, não o identificador do cookie.
  const arquivo = require('node:fs').readFileSync(require('node:path').join(servidor.dados, 'sessoes-mestre.json'), 'utf8');
  assert.ok(!arquivo.includes(decodeURIComponent(tablet.slice(3))));
  // O cookie antigo, a assinatura fixa da senha, não vale mais.
  const assinatura = require('node:crypto').createHmac('sha256', servidor.senha).update('fieldbook-mestre-v1').digest('hex');
  assert.equal(await mestre(`gm=${assinatura}`), false);
  // Sair no tablet: o PC continua.
  assert.equal((await servidor.pedir('/api/mestre/sair', { method: 'POST', cookie: tablet, body: {} })).status, 200);
  assert.equal(await mestre(tablet), false);
  assert.equal(await mestre(pc), true);
  // Sair de todos: só com a sessão do mestre; tira todas.
  const outro = await servidor.entrarComoMestre();
  assert.equal((await servidor.pedir('/api/mestre/sair-de-todos', { method: 'POST', body: {} })).status, 403);
  const todos = await servidor.pedir('/api/mestre/sair-de-todos', { method: 'POST', cookie: pc, body: {} });
  assert.equal(todos.status, 200);
  assert.match(todos.headers['set-cookie'], /gm=;.*Max-Age=0/);
  assert.equal(await mestre(pc), false);
  assert.equal(await mestre(outro), false);
});

test('a fase 2 da auditoria: o jogador tem 30 escritas pesadas por hora (criar, apagar, retrato), e sem disco ninguém grava personagem', async t => {
  const servidor = criarServidorIsolado(t);
  const mestre = await servidor.entrarComoMestre();
  const conta = (await servidor.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome: 'Laço' } })).json.conta;
  await servidor.pedir(`/api/contas/${conta.id}`, { method: 'PUT', cookie: mestre, body: { campanhas: ['morana'] } });
  const login = await servidor.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.codigo } });
  const jogador = servidor.cookieDe(login);
  const estados = [];
  for (let i = 0; i < 16; i++) {
    const criado = await servidor.pedir('/api/personagens', { method: 'POST', cookie: jogador, body: { nome: `Laço ${i}` } });
    estados.push(criado.status);
    if (criado.status !== 201) break;
    estados.push((await servidor.pedir(`/api/personagens/${criado.json.personagem.id}`, { method: 'DELETE', cookie: jogador })).status);
  }
  assert.deepEqual(estados.slice(0, 30), Array.from({ length: 30 }, (_, i) => (i % 2 ? 200 : 201)), 'as 30 primeiras passam');
  assert.equal(estados[30], 429, 'a 31ª espera');
  // O mestre não tem esse limite.
  assert.equal((await servidor.pedir('/api/personagens', { method: 'POST', cookie: mestre, body: { nome: 'Do mestre', dono: conta.id } })).status, 201);
});

test('a fase 2 da auditoria: sem o espaço mínimo em disco, nenhuma escrita de personagem (507), nem do mestre', async t => {
  const servidor = criarServidorIsolado(t, { env: { DISCO_MIN_LIVRE_MB: String(1e12) } });
  const mestre = await servidor.entrarComoMestre();
  const resposta = await servidor.pedir('/api/personagens', { method: 'POST', cookie: mestre, body: { nome: 'Sem disco' } });
  assert.equal(resposta.status, 507);
  assert.match(resposta.json.erro, /sem espaço em disco/);
});

test('a fase 3 da auditoria: as páginas saem com a CSP só avisando (os scripts da própria página pelo hash), e o /api/csp guarda o aviso', async t => {
  const crypto = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const servidor = criarServidorIsolado(t);
  const pagina = await servidor.pedir('/jogadores.html');
  assert.equal(pagina.status, 200);
  const csp = pagina.headers['content-security-policy-report-only'];
  assert.ok(csp, 'só avisando: o cabeçalho que não bloqueia');
  assert.equal(pagina.headers['content-security-policy'], undefined, 'ainda não bloqueia');
  for (const parte of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "img-src 'self' data: blob:", 'report-uri /api/csp']) assert.ok(csp.includes(parte), parte);
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'jogadores.html'), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(inline.length >= 1);
  // O hash do navegador: o HTML com as quebras de linha trocadas por \n (o arquivo é CRLF; o hash dos bytes crus não bate).
  assert.ok(html.includes('\r\n'), 'o jogadores.html é CRLF: é o caso que o teste confere');
  for (const [, codigo] of inline) assert.ok(csp.includes(`'sha256-${crypto.createHash('sha256').update(codigo.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`), 'o hash do script da página');
  // O aviso do navegador vira uma linha no csp-avisos.log, e a saúde do servidor conta.
  const aviso = await servidor.pedir('/api/csp', { method: 'POST', headers: { 'content-type': 'application/csp-report' }, body: JSON.stringify({ 'csp-report': { 'document-uri': 'https://wiki/jogadores.html', 'violated-directive': 'script-src', 'blocked-uri': 'inline', 'line-number': 12, 'script-sample': 'alert(1)' } }) });
  assert.equal(aviso.status, 204);
  await new Promise(r => setTimeout(r, 100));
  const linhas = fs.readFileSync(path.join(servidor.dados, 'csp-avisos.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual([linhas[0].pagina, linhas[0].diretiva, linhas[0].bloqueado, linhas[0].amostra], ['https://wiki/jogadores.html', 'script-src', 'inline', 'alert(1)']);
  const mestre = await servidor.entrarComoMestre();
  assert.equal((await servidor.pedir('/api/estado', { cookie: mestre })).json.servidor.csp, 1);
  // O lixo não grava nada.
  assert.equal((await servidor.pedir('/api/csp', { method: 'POST', body: 'não é JSON' })).status, 204);
  await new Promise(r => setTimeout(r, 100));
  const linhasDoLog = () => fs.readFileSync(path.join(servidor.dados, 'csp-avisos.log'), 'utf8').trim().split('\n').length;
  assert.equal(linhasDoLog(), 1);
  // Um aviso com mais de 16 KB também não (e não conta no limite).
  const aviso1 = amostra => JSON.stringify({ 'csp-report': { 'document-uri': 'https://wiki/index.html', 'violated-directive': 'script-src', 'blocked-uri': 'inline', 'script-sample': amostra } });
  assert.equal((await servidor.pedir('/api/csp', { method: 'POST', body: aviso1('x'.repeat(17000)) })).status, 204);
  await new Promise(r => setTimeout(r, 100));
  assert.equal(linhasDoLog(), 1, 'o aviso grande não grava');
  // E 60 por 10 minutos de cada IP: o válido e o lixo já contaram 2, então destes 60 só 58 gravam.
  for (let i = 0; i < 60; i += 1) assert.equal((await servidor.pedir('/api/csp', { method: 'POST', body: aviso1(`n${i}`) })).status, 204);
  await new Promise(r => setTimeout(r, 200));
  assert.equal(linhasDoLog(), 59, 'o limite por IP');
});
