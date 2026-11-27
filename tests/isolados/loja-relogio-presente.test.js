// O relógio da vitrine e o presente do mestre (o C100, do sistema do Foundry 14; as decisões do usuário de 2026-11-26):
// o prazo do Night Market conta pelo dia no fuso da mesa, no relógio do servidor (o GET das regras manda o "agora"); o
// presente do mestre nasce aprovado (o Foundry entrega; na mesa da wiki, a entrega é na hora).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const SV = require('../../loja-vitrine');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const ler = arquivo => fs.readFileSync(path.join(__dirname, '../..', arquivo), 'utf8');

test('C100: o dia da vitrine é o do fuso da mesa, em qualquer relógio', () => {
  assert.equal(SV.FUSO_DA_MESA, 'America/Sao_Paulo');
  // 01h30 em UTC do dia 27 ainda é 22h30 do dia 26 em São Paulo.
  assert.equal(SV.hoje(new Date('2026-11-27T01:30:00Z')), '2026-11-26');
  assert.equal(SV.hoje(new Date('2026-11-27T03:00:00Z')), '2026-11-27');
  // Num relógio de outro fuso (o servidor em UTC, um navegador em Tóquio), o dia continua o da mesa.
  const fuso = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    assert.equal(new Date('2026-11-26T20:00:00Z').getDate(), 27);
    assert.equal(SV.hoje(new Date('2026-11-26T20:00:00Z')), '2026-11-26');
  } finally {
    if (fuso === undefined) delete process.env.TZ; else process.env.TZ = fuso;
  }
  const vitrine = { nightMarket: { itens: ['mods-armas:supressor'], ate: '2026-11-26' } };
  assert.deepEqual(SV.vitrineAberta(vitrine, new Date('2026-11-27T02:59:00Z')), ['mods-armas:supressor']);
  assert.deepEqual(SV.vitrineAberta(vitrine, new Date('2026-11-27T03:00:00Z')), []);
  const cara = { id: 'mods-armas:supressor', cat: 'modificacoes', preco: 500 };
  assert.equal(SV.foraDaVitrine(cara, vitrine, new Date('2026-11-27T02:59:00Z')), false);
  assert.equal(SV.foraDaVitrine(cara, vitrine, new Date('2026-11-27T03:00:00Z')), true);
});

test('C100: a loja da wiki conta pelo relógio do servidor, e a de criação esconde as Caras', () => {
  const criador = ler('criador.js');
  assert.match(criador, /const server = answer\.status === 200 \? Date\.parse\(answer\.data\.agora \|\| ''\) : NaN;\r?\n    if \(Number\.isFinite\(server\)\) shopClock = server - Date\.now\(\);/);
  // Toda conta da vitrine na wiki passa o agora do servidor.
  const chamadas = criador.match(/SV\.(vitrineAberta|foraDaVitrine)\([^)]*\)/g) || [];
  assert.ok(chamadas.length >= 4);
  assert.deepEqual(chamadas.filter(chamada => !/, shopNow\(\)$/.test(chamada)), []);
  assert.match(criador, /if \(rules\.liberados\.includes\(item\.id\)\) return '';\r?\n[^\n]*\r?\n    if \(SV && SV\.ehModCara\(item\)\) return 'só no Night Market';/);
});

async function preparar(t) {
  const wiki = criarServidorIsolado(t);
  const mestre = await wiki.entrarComoMestre();
  const conta = await wiki.pedir('/api/contas', { method: 'POST', cookie: mestre, body: { nome: 'Ana' } });
  assert.equal(conta.status, 201, conta.text);
  const login = await wiki.pedir('/api/entrar', { method: 'POST', body: { codigo: conta.json.conta.codigo } });
  const jogador = wiki.cookieDe(login);
  const criado = await wiki.pedir('/api/personagens', { method: 'POST', cookie: jogador, body: { nome: 'Vex', role: 'solo' } });
  assert.equal(criado.status, 201, criado.text);
  const url = `/api/personagens/${criado.json.personagem.id}`;
  // Em jogo: o Foundry importou o personagem.
  assert.equal((await wiki.pedir(`${url}/foundry`, { method: 'PUT', cookie: mestre, body: { ator: 'ator-vex', nomeAtor: 'Vex' } })).status, 200);
  assert.equal((await wiki.pedir(`${url}/mesa`, { method: 'PUT', cookie: mestre, body: { ator: 'ator-vex', itens: [] } })).status, 200);
  const pedir = (cookie, itens, extra = {}) => wiki.pedir(`${url}/pedidos`, { method: 'POST', cookie, body: { itens, ...extra } });
  return { wiki, mestre, jogador, url, pedir };
}

test('C100: o GET das regras manda o agora do servidor', async t => {
  const ctx = await preparar(t);
  const antes = Date.now();
  const lida = await ctx.wiki.pedir('/api/loja/regras', { cookie: ctx.jogador });
  assert.equal(lida.status, 200, lida.text);
  const agora = Date.parse(lida.json.agora);
  assert.ok(agora >= antes - 1000 && agora <= Date.now() + 1000, lida.json.agora);
});

test('C100: o presente do mestre nasce aprovado (o Foundry entrega); o pedido do jogador espera o mestre', async t => {
  const ctx = await preparar(t);
  const bipe = [{ id: 'mods-armas:bipe', qtd: 1 }];
  const presente = await ctx.pedir(ctx.mestre, bipe, { presente: true });
  assert.equal(presente.status, 201, presente.text);
  assert.deepEqual([presente.json.pedido.status, presente.json.pedido.presente, presente.json.pedido.total, presente.json.pedido.erro], ['aprovado', true, 0, '']);
  assert.equal(presente.json.pedido.decidido, presente.json.pedido.criado);
  // Aprovar de novo não tem o que aprovar; o Foundry entrega como qualquer aprovado.
  const deNovo = await ctx.wiki.pedir(`${ctx.url}/pedidos/${presente.json.pedido.id}/aprovar`, { method: 'POST', cookie: ctx.mestre, body: {} });
  assert.equal(deNovo.status, 400);
  const entregue = await ctx.wiki.pedir(`${ctx.url}/pedidos/${presente.json.pedido.id}/entregue`, { method: 'POST', cookie: ctx.mestre, body: { ator: 'ator-vex' } });
  assert.equal(entregue.status, 200, entregue.text);
  assert.equal(entregue.json.pedido.status, 'entregue');
  // O do jogador (e o do mestre sem o presente) esperam.
  assert.equal((await ctx.pedir(ctx.jogador, bipe, { presente: true })).json.pedido.status, 'pendente');
  assert.equal((await ctx.pedir(ctx.mestre, bipe)).json.pedido.status, 'pendente');
});

test('C100: na mesa da wiki, o presente e o aprovar entregam pela mesma conta', () => {
  const api = ler('api-personagens.js');
  assert.match(api, /doc\.pedidos = \[\.\.\.ordersOf\(doc\), pedido\]\.slice\(-50\);\r?\n            if \(presente\) deliverInWiki\(doc, pedido, criado\);/);
  assert.match(api, /Object\.assign\(pedido, \{ status: 'aprovado', decidido: now, erro: '' \}\);\r?\n            \/\/ Na mesa da wiki, a entrega é agora\.\r?\n            deliverInWiki\(doc, pedido, now\);/);
});
