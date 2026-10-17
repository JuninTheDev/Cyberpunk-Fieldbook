const assert = require('node:assert/strict');
const test = require('node:test');
const CW = require('../../personagem-cyberware');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const arm = (uid, local = '') => ({ uid, id: 'core_cyberware:cyberarm', qtd: 1, local });
const hand = (uid, em) => ({ uid, id: 'core_cyberware:tool-hand', qtd: 1, em });
async function preparar(t, dados = {}) {
  const wiki = criarServidorIsolado(t);
  const mestre = await wiki.entrarComoMestre();
  const created = await wiki.pedir('/api/personagens', { method: 'POST', cookie: mestre, body: { nome: 'Cromo', role: 'tech', ...dados } });
  assert.equal(created.status, 201, created.text);
  const doc = created.json.personagem;
  const url = `/api/personagens/${doc.id}`;
  return { wiki, mestre, doc, url };
}
async function importar(ctx, itens = []) {
  const { wiki, mestre, url } = ctx;
  const vinculo = await wiki.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator: 'ator-cromo', nomeAtor: 'Cromo' } });
  assert.equal(vinculo.status, 200, vinculo.text);
  const mesa = await wiki.pedir(`${url}/mesa`, { method: 'PUT', cookie: mestre, body: { ator: 'ator-cromo', itens } });
  assert.equal(mesa.status, 200, mesa.text);
}
const pedir = (ctx, itens) => ctx.wiki.pedir(`${ctx.url}/pedidos`, { method: 'POST', cookie: ctx.mestre, body: { itens } });

test('locais distinguem lados, validam família e não atribuem lado a dados antigos', () => {
  assert.equal(CW.normalizar(undefined, 'cyberArm'), '');
  assert.equal(CW.nome(''), 'Local não definido');
  assert.equal(CW.locais('cyberArm').length, 2);
  assert.equal(CW.normalizar('olho-direito', 'cyberEye'), 'olho-direito');
  assert.throws(() => CW.normalizar('braco-direito', 'cyberEye'), /compatível/);
  assert.throws(() => CW.normalizar('direita'), /desconhecido/);
  assert.throws(() => CW.normalizar({ id: 'braco-direito' }), /válido/);
  assert.deepEqual(CW.locais('neuralWare'), []);
});

test('montagem salva os dois braços e a opção herda o lado da base pelo UID', async t => {
  const ctx = await preparar(t, {
    itens: [arm('a'), arm('b'), hand('h', 'b')],
    montagem: { a: { local: 'braco-esquerdo' }, b: { local: 'braco-direito' }, h: { em: 'b' } },
    resultado: { itens: [arm('a'), arm('b'), hand('h', 'b')] }
  });
  const itens = ctx.doc.resultado.itens;
  assert.equal(itens.find(item => item.uid === 'a').local, 'braco-esquerdo');
  assert.equal(itens.find(item => item.uid === 'b').local, 'braco-direito');
  assert.equal(itens.find(item => item.uid === 'h').local, 'braco-direito');
  assert.equal(itens.find(item => item.uid === 'h').em, 'b');
});

test('montagem rejeita base duplicada no mesmo lado e local incompatível sem alterar a versão', async t => {
  const ctx = await preparar(t, { itens: [arm('a'), arm('b')] });
  for (const montagem of [
    { a: { local: 'braco-esquerdo' }, b: { local: 'braco-esquerdo' } },
    { a: { local: 'olho-direito' } },
    { a: { local: 'nunca' } }
  ]) {
    const resposta = await ctx.wiki.pedir(ctx.url, { method: 'PUT', cookie: ctx.mestre, body: { ...ctx.doc, montagem } });
    assert.equal(resposta.status, 400, resposta.text);
  }
  const depois = await ctx.wiki.pedir(ctx.url, { cookie: ctx.mestre });
  assert.equal(depois.json.personagem.versao, 1);
});

test('montagem não trata uma opção ou ela mesma como base de outra opção', async t => {
  const ctx = await preparar(t);
  for (const alvo of ['h1', 'h2']) {
    const resposta = await ctx.wiki.pedir(ctx.url, { method: 'PUT', cookie: ctx.mestre, body: {
      ...ctx.doc, itens: [hand('h1', ''), hand('h2', alvo)], montagem: { h2: { em: alvo } }
    } });
    assert.equal(resposta.status, 400, resposta.text);
  }
});

test('pedido mantém unidades, locais e base escolhida; servidor calcula preço', async t => {
  const ctx = await preparar(t);
  await importar(ctx);
  const resposta = await pedir(ctx, [arm('ignorado', 'braco-esquerdo'), arm('ignorado', 'braco-direito'), { ...hand('ignorado', '@1'), preco: 1 }]);
  assert.equal(resposta.status, 201, resposta.text);
  const pedido = resposta.json.pedido;
  assert.equal(pedido.status, 'pendente');
  assert.equal(pedido.itens[0].local, 'braco-esquerdo');
  assert.equal(pedido.itens[1].local, 'braco-direito');
  assert.equal(pedido.itens[2].local, 'braco-direito');
  assert.equal(pedido.itens[2].em, pedido.itens[1].uid);
  assert.ok(pedido.itens[2].preco > 1);
  assert.equal(pedido.total, pedido.itens.reduce((sum, item) => sum + item.preco * item.qtd, 0));
});

test('pedido pode escolher uma base manual por ID estável sem confundir nomes iguais', async t => {
  const ctx = await preparar(t);
  await importar(ctx, ['esquerdo', 'direito'].map(lado => ({ id: lado, nome: 'Cyberarm', tipo: 'cyberware', base: true, instalado: true, cyber: { tipo: 'cyberArm' }, local: `braco-${lado}` })));
  const resposta = await pedir(ctx, [hand('h', 'foundry:direito')]);
  assert.equal(resposta.status, 201, resposta.text);
  assert.equal(resposta.json.pedido.itens[0].local, 'braco-direito');
  assert.equal(resposta.json.pedido.itens[0].em, 'foundry:direito');
});

test('pedido rejeita dados de local inválidos, duplicação e conflito entre opção e base', async t => {
  const ctx = await preparar(t);
  await importar(ctx, [{ id: 'right', uid: 'b', nome: 'Cyberarm', tipo: 'cyberware', base: true, cyber: { tipo: 'cyberArm' }, local: 'braco-direito' }]);
  const invalidos = [
    [{ ...arm('a', 'braco-direito'), qtd: 2 }],
    [arm('a', 'olho-direito')],
    [arm('a', 'invalido')],
    [arm('a', 'braco-direito'), arm('b', 'braco-direito')],
    [{ id: 'core_gear:agent', qtd: 1, local: 'braco-direito' }],
    [{ ...hand('h', 'b'), local: 'braco-esquerdo' }],
    [hand('h', 'foundry:sumiu')]
  ];
  for (const itens of invalidos) {
    const resposta = await pedir(ctx, itens);
    assert.equal(resposta.status, 400, resposta.text);
  }
  const lista = await ctx.wiki.pedir(`${ctx.url}/pedidos`, { cookie: ctx.mestre });
  assert.deepEqual(lista.json.pedidos, []);
});

test('pedidos antigos sem local continuam válidos e não recebem lado inventado', async t => {
  const ctx = await preparar(t);
  await importar(ctx);
  const resposta = await pedir(ctx, [{ id: 'core_cyberware:cyberarm', qtd: 2 }]);
  assert.equal(resposta.status, 201, resposta.text);
  assert.equal(resposta.json.pedido.itens[0].qtd, 2);
  assert.equal(resposta.json.pedido.itens[0].local, undefined);
});

test('helper de locais é servido também ao visitante e está nos dois documentos HTML', async t => {
  const { wiki, mestre } = await preparar(t);
  assert.equal((await wiki.pedir('/personagem-cyberware.js')).status, 200);
  for (const pagina of ['/index.html', '/jogadores.html']) {
    const resposta = await wiki.pedir(pagina, { cookie: mestre });
    assert.match(resposta.text, /src="personagem-cyberware\.js"/);
  }
});

test('importador declara suporte aos locais antes de ler uma ficha com lados definidos', async t => {
  const ctx = await preparar(t, { itens: [arm('a')], montagem: { a: { local: 'braco-direito' } } });
  const headers = { Origin: 'http://localhost:30000' };
  assert.equal((await ctx.wiki.pedir(ctx.url, { cookie: ctx.mestre, headers })).status, 409);
  assert.equal((await ctx.wiki.pedir(`${ctx.url}?locais=1`, { cookie: ctx.mestre, headers })).status, 200);
  assert.equal((await ctx.wiki.pedir(ctx.url, { cookie: ctx.mestre })).status, 200);
});
