const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const fontes = ['personagem-roles.js', 'personagem-cyberware.js', 'system-criacao.js', 'system-rules.js', 'system-net.js', 'loja-catalogo.js', 'criador.js']
  .map(nome => [nome, fs.readFileSync(path.join(raiz, nome), 'utf8')]);
const puro = valor => JSON.parse(JSON.stringify(valor));
const ARM = 'core_cyberware:cyberarm';
const HAND = 'core_cyberware:tool-hand';
const EYE = 'core_cyberware:cybereye';
const item = (uid, id, qtd = 1) => ({ uid, id, qtd });
const esquerdo = 'braco-esquerdo';
const direito = 'braco-direito';

function elemento() {
  return { innerHTML: '', dataset: {}, clientWidth: 1200, classList: { toggle() {} }, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, scrollIntoView() {} };
}
function alvo(seletor, dataset = {}, value = '') {
  const target = { dataset, value, matches: consulta => consulta === seletor, closest: consulta => consulta === seletor ? target : null };
  return target;
}
function ambiente() {
  let carregado;
  const pedidos = [];
  const salvos = [];
  const contexto = vm.createContext({
    window: { matchMedia: () => ({ matches: true }), scrollTo() {}, scrollY: 0 },
    document: { addEventListener() {}, querySelectorAll: () => [] }, location: { protocol: 'http:' },
    console, setTimeout: () => 1, clearTimeout() {},
    fetch: async (url, opcoes = {}) => {
      let data = {};
      let status = 200;
      if (url === 'api/eu') data = { papel: 'jogador' };
      else if (opcoes.method === 'PUT') {
        const body = JSON.parse(opcoes.body); salvos.push(body);
        data = { personagem: { ...body, versao: 2, atualizado: '2026-01-01T12:00:00Z' } };
      } else if (url.endsWith('/pedidos') && opcoes.method === 'POST') {
        const body = JSON.parse(opcoes.body); pedidos.push(body); status = 201;
        data = { pedido: { id: 'pedido', status: 'pendente', total: 100, itens: body.itens.map(entry => ({ ...entry, nome: entry.id })) } };
      } else if (url.startsWith('api/personagens/')) data = { personagem: carregado };
      return { status, json: async () => data };
    }
  });
  for (const [nome, codigo] of fontes) vm.runInContext(codigo, contexto, { filename: nome });
  const regras = contexto.window.characterCreator.regras;
  const catalogo = contexto.window.shopCatalog.itens;
  const doc = () => ({ ...regras.blank(), id: 'teste', nome: 'V', role: 'solo', metodo: 'pacote' });
  return {
    regras, doc, pedidos, salvos, contexto, catalogo,
    async abrir(personagem) {
      carregado = personagem;
      const root = elemento();
      const nos = Object.fromEntries(['#cc-save', '#cc-summary', '#cc-help', '#cc-step', '#cc-recover'].map(id => [id, elemento()]));
      nos['#cc-help'].firstElementChild = elemento();
      root.querySelector = seletor => nos[seletor] || null;
      await contexto.window.characterCreator.pages.criador.setup({ querySelector: () => root }, {
        target: { section: personagem.id }, escapeHtml: text => String(text ?? ''), rollDice: () => 1,
        storage: { get: () => '', set() {} }, openPage() {}
      });
      return { root, nos };
    }
  };
}
function doisBracos(mundo) {
  return { ...mundo.doc(), itens: [item('left', ARM), item('right', ARM), item('hand', HAND)], montagem: { left: { local: esquerdo }, right: { local: direito }, hand: { em: 'right' } } };
}

test('duas bases iguais preservam UID/local, e opção herda o local da base escolhida', () => {
  const mundo = ambiente();
  const doc = doisBracos(mundo);
  const antes = JSON.stringify(doc);
  const rows = mundo.regras.result(doc).itens;
  assert.equal(rows.find(row => row.uid === 'left').local, esquerdo);
  assert.equal(rows.find(row => row.uid === 'right').local, direito);
  assert.equal(rows.find(row => row.uid === 'hand').local, direito);
  assert.equal(rows.find(row => row.uid === 'hand').em, 'right');
  assert.equal(JSON.stringify(doc), antes);
  const html = mundo.regras.sheetHtml(doc).cyberware;
  assert.match(html, /data-cy-uid="right"/);
  assert.match(html, /data-cy-local="braco-direito" data-cy-em="right"/);
  assert.match(html, /Braço esquerdo/);
  assert.match(html, /Braço direito/);
});

test('legado sem local não recebe lado nem opção numa base arbitrária', () => {
  const mundo = ambiente();
  const doc = { ...mundo.doc(), itens: [item('a', ARM), item('b', ARM), item('hand', HAND)] };
  const parts = mundo.regras.cyberParts(doc);
  assert.equal(parts.bases.filter(base => base.tipo === 'cyberArm').every(base => base.local === ''), true);
  assert.equal(parts.soltos[0].uid, 'hand');
  const html = mundo.regras.sheetHtml(doc).cyberware;
  assert.equal((html.match(/cy-unit cy-unassigned/g) || []).length, 2);
  assert.match(html, /Local não definido/);
  assert.ok(!/class="cy-parte cy-on" data-cy-parte="braco-[12]"/.test(html));
});

test('base removida não redireciona uma opção escolhida para o outro braço', () => {
  const mundo = ambiente();
  const doc = doisBracos(mundo);
  doc.montagem.hand.em = 'base-removida';
  const hand = mundo.regras.assembly(doc).byUid.get('hand');
  assert.equal(hand.em, '-');
  assert.ok(mundo.regras.pending(doc).some(issue => /base específica/.test(issue.text)));
});

test('snapshot com pai explícito prevalece sobre nome legado e não gasta uma cópia errada', () => {
  const mundo = ambiente();
  const doc = { ...mundo.doc(), foundry: { importado: '2026-01-01' }, mesa: { itens: [
    { uid: 'left', tipo: 'cyberware', nome: 'Cyberarm', idCatalogo: ARM, base: true, instalado: true, local: esquerdo, dentro: ['Tool Hand'] },
    { uid: 'right', tipo: 'cyberware', nome: 'Cyberarm', idCatalogo: ARM, base: true, instalado: true, local: direito },
    { uid: 'hand', tipo: 'cyberware', nome: 'Tool Hand', idCatalogo: HAND, instalado: true, pai: { uid: 'right' } }
  ] } };
  const parts = mundo.regras.cyberParts(doc);
  assert.equal(parts.bases.find(base => base.uid === 'left').itens.length, 0);
  assert.equal(parts.bases.find(base => base.uid === 'right').itens[0].uid, 'hand');
});

test('conflito de bases no mesmo local gera pendência e impede nova compra ali', () => {
  const mundo = ambiente();
  const doc = doisBracos(mundo);
  doc.montagem.right.local = esquerdo;
  assert.ok(mundo.regras.pending(doc).some(issue => /mais de uma base/.test(issue.text)));
  const arm = mundo.catalogo.find(entry => entry.id === ARM);
  assert.match(mundo.regras.cyberPurchaseProblem(arm, { local: esquerdo }, mundo.regras.assembly(doc).rows), /Já há uma base/);
});

test('compra inicial exige lado e cria unidades e montagens distintas', async () => {
  const mundo = ambiente();
  const doc = mundo.doc();
  const target = elemento();
  mundo.regras.renderShop(target, doc);
  await target.onclick({ target: alvo('[data-shop-buy]', { shopBuy: ARM }) });
  assert.equal(doc.itens.length, 0, 'sem lado, não compra uma base em local implícito');
  target.onchange({ target: alvo('[data-shop-local]', { shopLocal: ARM }, esquerdo) });
  await target.onclick({ target: alvo('[data-shop-buy]', { shopBuy: ARM }) });
  target.onchange({ target: alvo('[data-shop-local]', { shopLocal: ARM }, direito) });
  await target.onclick({ target: alvo('[data-shop-buy]', { shopBuy: ARM }) });
  assert.equal(doc.itens.length, 2);
  assert.notEqual(doc.itens[0].uid, doc.itens[1].uid);
  assert.deepEqual(puro(doc.itens.map(entry => entry.qtd)), [1, 1]);
  assert.deepEqual(puro(doc.itens.map(entry => doc.montagem[entry.uid].local)), [esquerdo, direito]);
  target.onchange({ target: alvo('[data-shop-local]', { shopLocal: ARM }, esquerdo) });
  await target.onclick({ target: alvo('[data-shop-buy]', { shopBuy: ARM }) });
  assert.equal(doc.itens.length, 2, 'não compra outra base no braço já ocupado');
  target.onchange({ target: alvo('[data-shop-local]', { shopLocal: HAND }, direito) });
  await target.onclick({ target: alvo('[data-shop-buy]', { shopBuy: HAND }) });
  const hand = doc.itens.find(entry => entry.id === HAND);
  assert.equal(doc.montagem[hand.uid].em, doc.itens[1].uid);
  assert.equal(mundo.regras.result(doc).itens.find(entry => entry.uid === hand.uid).local, direito);
});

test('pedido mantém bases esquerda/direita em linhas independentes e não instala nada', async () => {
  const mundo = ambiente();
  const doc = { ...mundo.doc(), foundry: { importado: '2026-01-01' }, mesa: { dinheiro: 10000, itens: [] } };
  const target = elemento();
  mundo.regras.renderCampaignShop(target, doc);
  await target.onclick({ target: alvo('[data-pedido-por]', { pedidoPor: ARM }) });
  await target.onclick({ target: alvo('[data-pedido-por]', { pedidoPor: ARM }) });
  target.onchange({ target: alvo('[data-pedido-local]', { pedidoLocal: '0' }, esquerdo) });
  target.onchange({ target: alvo('[data-pedido-local]', { pedidoLocal: '1' }, direito) });
  await target.onclick({ target: alvo('[data-pedido-enviar]') });
  assert.equal(mundo.pedidos.length, 1);
  assert.deepEqual(mundo.pedidos[0].itens.map(entry => [entry.id, entry.qtd, entry.local]), [[ARM, 1, esquerdo], [ARM, 1, direito]]);
  assert.deepEqual(doc.mesa.itens, []);
  assert.equal(doc.montagem === undefined || Object.keys(doc.montagem).length === 0, true);
});

test('opções iguais podem ser pedidas para bases manuais distintas com foundry:id', async () => {
  const mundo = ambiente();
  const doc = { ...mundo.doc(), foundry: { importado: '2026-01-01' }, mesa: { dinheiro: 10000, itens: [
    { id: 'base-l', tipo: 'cyberware', nome: 'Cyberarm — Braço esquerdo', nomeCatalogo: 'Cyberarm', idCatalogo: ARM, local: esquerdo, instalado: true, base: true },
    { id: 'base-r', tipo: 'cyberware', nome: 'Cyberarm — Braço direito', nomeCatalogo: 'Cyberarm', idCatalogo: ARM, local: direito, instalado: true, base: true }
  ] } };
  const antes = JSON.stringify(doc.mesa);
  const target = elemento();
  mundo.regras.renderCampaignShop(target, doc);
  await target.onclick({ target: alvo('[data-pedido-por]', { pedidoPor: HAND }) });
  await target.onclick({ target: alvo('[data-pedido-por]', { pedidoPor: HAND }) });
  target.onchange({ target: alvo('[data-pedido-em]', { pedidoEm: '0' }, 'foundry:base-r') });
  target.onchange({ target: alvo('[data-pedido-em]', { pedidoEm: '1' }, 'foundry:base-l') });
  await target.onclick({ target: alvo('[data-pedido-enviar]') });
  assert.deepEqual(mundo.pedidos[0].itens.map(entry => [entry.qtd, entry.em, entry.local]), [[1, 'foundry:base-r', direito], [1, 'foundry:base-l', esquerdo]]);
  assert.equal(JSON.stringify(doc.mesa), antes);
});

test('snapshot usa pai e UIDs para opções iguais, e separa local planejado de instalação', () => {
  const mundo = ambiente();
  const doc = { ...mundo.doc(), foundry: { importado: '2026-01-01' }, mesa: { stats: {}, itens: [
    { id: 'r', uid: 'right', tipo: 'cyberware', nome: 'Cyberarm — Braço direito', idCatalogo: ARM, base: true, instalado: true, local: direito, dentroUids: ['hand-r'] },
    { id: 'l', uid: 'left', tipo: 'cyberware', nome: 'Cyberarm — Braço esquerdo', idCatalogo: ARM, base: true, instalado: true, local: esquerdo, dentroUids: ['hand-l'] },
    { id: 'hr', uid: 'hand-r', tipo: 'cyberware', nome: 'Tool Hand', idCatalogo: HAND, instalado: true, pai: { uid: 'right' } },
    { id: 'hl', uid: 'hand-l', tipo: 'cyberware', nome: 'Tool Hand', idCatalogo: HAND, instalado: true, pai: { uid: 'left' } },
    { id: 'e', tipo: 'cyberware', nome: 'Cybereye', idCatalogo: EYE, base: true, instalado: false, local: '', localPlanejado: 'olho-direito' }
  ] } };
  const parts = mundo.regras.cyberParts(doc);
  assert.equal(parts.bases.find(base => base.local === esquerdo).itens[0].uid, 'hand-l');
  assert.equal(parts.bases.find(base => base.local === direito).itens[0].uid, 'hand-r');
  assert.equal(parts.esperando[0].local, '');
  assert.equal(parts.esperando[0].localPlanejado, 'olho-direito');
  const html = mundo.regras.sheetHtml(doc).cyberware;
  assert.match(html, /Olho direito \(planejado\)/);
  assert.ok(!/class="cy-parte cy-on" data-cy-parte="olho-1"/.test(html));
  assert.ok(!/class="cy-parte cy-on" data-cy-parte="olho-2"/.test(html));
});

test('clique no slot transmite local e UID da base exata à loja', () => {
  const mundo = ambiente();
  const target = alvo('[data-cy-loja]', { cyLoja: 'cyberArm', cyBase: '0', cyLocal: direito, cyEm: 'foundry:base-r', cyNome: 'Braço direito' });
  const closest = target.closest;
  target.closest = seletor => seletor === '.cy-screen' ? {} : closest(seletor);
  let slot;
  assert.equal(mundo.regras.cyberClick({ target }, recebido => { slot = recebido; }), true);
  assert.deepEqual(puro(slot), { tipo: 'cyberArm', base: false, nome: 'Braço direito', local: direito, em: 'foundry:base-r' });
});

test('Montagem troca lado e base por UID, salva e preserva o bloqueio após importar', async () => {
  const mundo = ambiente();
  const doc = { ...doisBracos(mundo), metodo: 'ratoderua', passo: 5 };
  const { root, nos } = await mundo.abrir(doc);
  await root.onclick({ target: alvo('[data-mont-tab]', { montTab: 'cyberware' }) });
  assert.match(nos['#cc-step'].innerHTML, /data-mont-local="left"/);
  assert.match(nos['#cc-step'].innerHTML, /data-mont-em="hand"/);
  root.onchange({ target: alvo('[data-mont-em]', { montEm: 'hand' }, 'left') });
  await root.onclick({ target: alvo('[data-cc-sheet]') });
  const salvo = mundo.salvos[0];
  assert.equal(salvo.montagem.hand.em, 'left');
  assert.equal(salvo.resultado.itens.find(entry => entry.uid === 'hand').local, esquerdo);
  const importado = { ...doc, foundry: { importado: '2026-01-01' } };
  const locked = await mundo.abrir(importado);
  await locked.root.onclick({ target: alvo('[data-mont-tab]', { montTab: 'cyberware' }) });
  assert.match(locked.nos['#cc-step'].innerHTML, /<fieldset disabled class="cc-locked">[\s\S]*data-mont-local="left"/);
});
