// A economia das modificações de armas na wiki (o C72, parte 2, do sistema do Foundry 14; as decisões do usuário de
// 2026-11-25): as modificações Caras (500eb) ficam fora da loja da campanha, e o mestre abre um Night Market que libera
// algumas até uma data (o preço é o do catálogo); o teto da campanha só avisa; e o presente do mestre entra sem cobrar.
const assert = require('node:assert/strict');
const test = require('node:test');
const SV = require('../../loja-vitrine');
const characterGame = require('../../personagem-jogo');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const dia = deslocamento => SV.hoje(new Date(Date.now() + deslocamento * 86400000));
const cara = { id: 'mods-armas:supressor', cat: 'modificacoes', preco: 500 };
const premium = { id: 'mods-armas:bipe', cat: 'modificacoes', preco: 100 };

test('C72: a vitrine (só as Caras, até a data), o sorteio e o teto da campanha (as contas)', () => {
  assert.equal(SV.ehModCara(cara), true);
  assert.equal(SV.ehModCara(premium), false);
  assert.equal(SV.ehModCara({ id: 'core_weapons:x', cat: 'armas', preco: 5000 }), false);
  // A vitrine aberta até hoje vale; a de ontem, não; a sem data, não.
  assert.deepEqual(SV.vitrineAberta({ nightMarket: { itens: [cara.id], ate: dia(0) } }), [cara.id]);
  assert.deepEqual(SV.vitrineAberta({ nightMarket: { itens: [cara.id], ate: dia(-1) } }), []);
  assert.deepEqual(SV.vitrineAberta({ nightMarket: { itens: [cara.id], ate: '' } }), []);
  assert.deepEqual(SV.vitrineAberta({}), []);
  // O que o mestre grava: só as Caras do catálogo, sem repetir, com a data.
  const catalogo = id => ({ [cara.id]: cara, [premium.id]: premium })[id];
  assert.deepEqual(SV.limparVitrine({ itens: [cara.id, cara.id, premium.id, 'nao:existe'], ate: dia(3) }, catalogo), { itens: [cara.id], ate: dia(3) });
  assert.deepEqual(SV.limparVitrine({ itens: [cara.id], ate: '25/11' }, catalogo), { itens: [], ate: '' });
  assert.deepEqual(SV.limparVitrine({ itens: [premium.id], ate: dia(3) }, catalogo), { itens: [], ate: '' });
  // Fora da vitrine: a Cara que não está nela nem foi liberada pelo mestre.
  assert.equal(SV.foraDaVitrine(cara, {}), true);
  assert.equal(SV.foraDaVitrine(cara, { liberados: [cara.id] }), false);
  assert.equal(SV.foraDaVitrine(cara, { nightMarket: { itens: [cara.id], ate: dia(0) } }), false);
  assert.equal(SV.foraDaVitrine(premium, {}), false);
  // O sorteio: sem repetir, e não mais do que há.
  assert.deepEqual(SV.sortear(['a', 'b', 'c'], 2, () => 0), ['a', 'b']);
  assert.deepEqual(SV.sortear(['a', 'b', 'c'], 2, n => n - 1), ['c', 'b']);
  assert.deepEqual(SV.sortear(['a'], 2, () => 0), ['a']);
  // O teto da campanha: o padrão é o da regra da casa (+3) e uma lendária por arma; fora do intervalo, o mais perto.
  assert.deepEqual(SV.tetoDaCampanha({}), { arma: 3, lendarias: 1 });
  assert.deepEqual(SV.tetoDaCampanha({ tetoDaArma: 9, lendariasPorArma: -2 }), { arma: 3, lendarias: 0 });
  assert.deepEqual(SV.tetoDaCampanha({ tetoDaArma: '1', lendariasPorArma: 2 }), { arma: 1, lendarias: 2 });
  // Os avisos: o bônus melhor na rolagem acima do teto e as lendárias acima do limite.
  const arma = { teto: { melhor: 3 }, pecas: [{ raridade: 'lendaria' }, { raridade: 'lendaria' }, { raridade: 'rara' }] };
  assert.deepEqual(SV.avisosDoTeto(arma, { tetoDaArma: 2, lendariasPorArma: 1 }), [
    'Passa do teto da campanha: +3 na rolagem, e a campanha vai até +2.', '2 lendárias nesta arma: a campanha deixa 1.'
  ]);
  assert.deepEqual(SV.avisosDoTeto(arma, { lendariasPorArma: 2 }), []);
  assert.deepEqual(SV.avisosDoTeto({ teto: null, pecas: [] }, { tetoDaArma: 0 }), []);
  // No pedido: a modificação de ataque e as armas onde ela passaria do teto.
  const armas = [{ nome: 'Velha Senhora', melhor: 2 }, { nome: 'Faca', melhor: 0 }];
  assert.equal(SV.avisoNoPedido(true, armas, { tetoDaArma: 2 }), 'Teto da campanha (+2): em Velha Senhora, ela passaria do teto.');
  assert.equal(SV.avisoNoPedido(true, armas, {}), '');
  assert.equal(SV.avisoNoPedido(false, armas, { tetoDaArma: 0 }), '');
});

test('C72: o presente do mestre na entrega da wiki entra sem cobrar, com a recompensa no extrato', () => {
  const doc = { jogo: { dinheiro: 30, extrato: [] } };
  const pedido = { id: 'p1', total: 0, presente: true, valor: 500, itens: [{ uid: 'pedido:p1:0', id: cara.id, nome: 'Supressor', qtd: 1 }] };
  const feito = characterGame.entrega(doc, pedido, '2026-11-25T12:00:00.000Z');
  assert.equal(feito.erro, undefined);
  assert.equal(feito.mudancas.dinheiro, 30);
  assert.equal(feito.mudancas.extrato.at(-1).motivo, 'Recompensa do mestre: Supressor');
  assert.equal(feito.mudancas.compras.at(-1).id, cara.id);
  // Mesmo que o total venha com o preço: o presente não cobra.
  assert.equal(characterGame.entrega(doc, { ...pedido, total: 500 }).mudancas.dinheiro, 30);
  // A ficha que não diz o dinheiro: o presente entra, e o dinheiro e o extrato não mudam.
  const semDinheiro = characterGame.entrega({}, pedido);
  assert.equal(semDinheiro.erro, undefined);
  assert.deepEqual(Object.keys(semDinheiro.mudancas), ['compras']);
  // A compra de sempre continua cobrando, e sem dinheiro não passa.
  const compra = characterGame.entrega(doc, { ...pedido, presente: false, total: 20 });
  assert.equal(compra.mudancas.dinheiro, 10);
  assert.match(compra.mudancas.extrato.at(-1).motivo, /^Compra na loja: Supressor/);
  assert.match(characterGame.entrega(doc, { ...pedido, presente: false, total: 500 }).erro, /Dinheiro insuficiente/);
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
  const regras = async mudar => {
    const atual = (await wiki.pedir('/api/loja/regras', { cookie: mestre })).json.regras;
    return wiki.pedir('/api/loja/regras', { method: 'PUT', cookie: mestre, body: { ...atual, ...mudar } });
  };
  const pedir = (cookie, itens, extra = {}) => wiki.pedir(`${url}/pedidos`, { method: 'POST', cookie, body: { itens, ...extra } });
  return { wiki, mestre, jogador, url, regras, pedir };
}

test('C72: as regras da loja guardam a vitrine (só as Caras do catálogo) e o teto; o jogador lê', async t => {
  const ctx = await preparar(t);
  const padrao = (await ctx.wiki.pedir('/api/loja/regras', { cookie: ctx.jogador })).json.regras;
  assert.deepEqual([padrao.nightMarket, padrao.tetoDaArma, padrao.lendariasPorArma], [{ itens: [], ate: '' }, 3, 1]);
  const gravada = await ctx.regras({ nightMarket: { itens: ['mods-armas:supressor', 'mods-armas:bipe', 'mods-armas:compensador', 'mods-armas:supressor'], ate: dia(2) }, tetoDaArma: 7, lendariasPorArma: 2 });
  assert.equal(gravada.status, 200, gravada.text);
  assert.deepEqual(gravada.json.regras.nightMarket, { itens: ['mods-armas:supressor', 'mods-armas:compensador'], ate: dia(2) });
  assert.deepEqual([gravada.json.regras.tetoDaArma, gravada.json.regras.lendariasPorArma], [3, 2]);
  const lida = (await ctx.wiki.pedir('/api/loja/regras', { cookie: ctx.jogador })).json.regras;
  assert.deepEqual(lida.nightMarket, { itens: ['mods-armas:supressor', 'mods-armas:compensador'], ate: dia(2) });
  // O jogador não grava.
  assert.equal((await ctx.wiki.pedir('/api/loja/regras', { method: 'PUT', cookie: ctx.jogador, body: lida })).status, 403);
  // As regras de antes (sem os campos novos) continuam: a vitrine fechada e o teto da regra da casa.
  const antigas = await ctx.wiki.pedir('/api/loja/regras', { method: 'PUT', cookie: ctx.mestre, body: { teto: 1000, esconder: [], liberados: [], bloqueados: [] } });
  assert.deepEqual([antigas.json.regras.nightMarket, antigas.json.regras.tetoDaArma, antigas.json.regras.lendariasPorArma], [{ itens: [], ate: '' }, 3, 1]);
});

test('C72: a modificação Cara só se compra com a vitrine aberta (ou liberada); o mestre pede o que quiser', async t => {
  const ctx = await preparar(t);
  const supressor = [{ id: 'mods-armas:supressor', qtd: 1 }];
  const fechado = await ctx.pedir(ctx.jogador, supressor);
  assert.deepEqual([fechado.status, fechado.json.erro], [400, 'Supressor só se compra num Night Market aberto pelo mestre.']);
  // A Premium não precisa do Night Market.
  assert.equal((await ctx.pedir(ctx.jogador, [{ id: 'mods-armas:bipe', qtd: 1 }])).status, 201);
  // Vencida: fechada.
  await ctx.regras({ nightMarket: { itens: ['mods-armas:supressor'], ate: dia(-1) } });
  assert.equal((await ctx.pedir(ctx.jogador, supressor)).status, 400);
  // Aberta até hoje: passa, com o preço do catálogo.
  await ctx.regras({ nightMarket: { itens: ['mods-armas:supressor'], ate: dia(0) } });
  const aberto = await ctx.pedir(ctx.jogador, supressor);
  assert.equal(aberto.status, 201, aberto.text);
  assert.equal(aberto.json.pedido.total, 500);
  // A outra Cara, fora da vitrine, não passa; liberada pelo mestre, passa.
  assert.equal((await ctx.pedir(ctx.jogador, [{ id: 'mods-armas:compensador', qtd: 1 }])).status, 400);
  await ctx.regras({ liberados: ['mods-armas:compensador'] });
  assert.equal((await ctx.pedir(ctx.jogador, [{ id: 'mods-armas:compensador', qtd: 1 }])).status, 201);
  // O mestre, com tudo fechado.
  await ctx.regras({ nightMarket: { itens: [], ate: '' }, liberados: [] });
  assert.equal((await ctx.pedir(ctx.mestre, [{ id: 'mods-armas:cano-de-troca', qtd: 1 }])).status, 201);
});

test('C72: o presente é só do mestre: entra sem cobrar, com o valor anotado; o do jogador cobra', async t => {
  const ctx = await preparar(t);
  const bipe = [{ id: 'mods-armas:bipe', qtd: 2 }];
  const doJogador = await ctx.pedir(ctx.jogador, bipe, { presente: true });
  assert.equal(doJogador.status, 201, doJogador.text);
  assert.deepEqual([doJogador.json.pedido.total, doJogador.json.pedido.presente, doJogador.json.pedido.valor], [200, undefined, undefined]);
  const doMestre = await ctx.pedir(ctx.mestre, bipe, { presente: true, nota: 'Pelo trabalho no Kabuki' });
  assert.equal(doMestre.status, 201, doMestre.text);
  assert.deepEqual([doMestre.json.pedido.total, doMestre.json.pedido.presente, doMestre.json.pedido.valor, doMestre.json.pedido.por], [0, true, 200, 'mestre']);
  // Só o true vale (um "sim" em texto não é presente).
  assert.equal((await ctx.pedir(ctx.mestre, bipe, { presente: 'sim' })).json.pedido.total, 200);
  const lista = (await ctx.wiki.pedir(`${ctx.url}/pedidos`, { cookie: ctx.jogador })).json.pedidos;
  assert.deepEqual(lista.map(p => [p.total, Boolean(p.presente)]), [[200, false], [0, true], [200, false]]);
});
