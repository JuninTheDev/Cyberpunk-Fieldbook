// C46.3: o módulo de aplicação real, com tokens que conservam a fonte e registram as opções do movimento.
import assert from 'node:assert/strict';
import test from 'node:test';

const SISTEMA = 'cpr-fieldbook';
const colecao = () => {
  const lista = [];
  lista.get = id => lista.find(doc => doc.id === id);
  lista.has = id => Boolean(lista.get(id));
  lista.contents = lista;
  return lista;
};
const propriedade = (objeto, caminho) => caminho.split('.').reduce((valor, parte) => valor?.[parte], objeto);
function mesclar(destino, mudancas) {
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.'), fim = partes.pop();
    const pai = partes.reduce((objeto, parte) => objeto[parte] ??= {}, destino);
    if (fim.startsWith('-=')) delete pai[fim.slice(2)];
    else if (valor && typeof valor === 'object' && Object.hasOwn(valor, '__delete')) delete pai[fim];
    else if (valor && typeof valor === 'object' && !Array.isArray(valor)) mesclar(pai[fim] ??= {}, valor);
    else pai[fim] = structuredClone(valor);
  }
  return destino;
}

async function ambiente(tarefa) {
  const chaves = ['game', 'foundry', 'ui', 'canvas', 'fromUuid', 'fromUuidSync', 'Hooks', 'CONST', 'CONFIG', 'HTMLElement', 'document'];
  const anteriores = Object.fromEntries(chaves.map(chave => [chave, globalThis[chave]]));
  const e = { avisos: [], recados: [], ganchos: {}, docs: new Map(), pedidos: [], colisoes: [], colisao: false,
    visao: { fontes: [], inicializadas: [], destruidas: [], adicionadas: [], testes: [], visivel: true } };
  const gm = { id: 'gm', isGM: true, active: true }, jogador = { id: 'jogador', isGM: false, active: true };
  const intruso = { id: 'intruso', isGM: false, active: true }, usuarios = colecao();
  usuarios.push(gm, jogador, intruso); usuarios.activeGM = gm;
  Object.defineProperty(gm, 'isSelf', { get: () => globalThis.game.user.id === gm.id });
  globalThis.game = { user: gm, users: usuarios, actors: colecao(), scenes: colecao(), paused: false, activeTool: 'select',
    settings: { get: () => false }, system: { api: {} },
    socket: { emit: (canal, dados) => e.pedidos.push({ canal, dados }), on: (canal, tratar) => { e.socket = tratar; } } };
  globalThis.ui = { notifications: { warn: mensagem => e.avisos.push(mensagem), info: mensagem => e.recados.push(mensagem) } };
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, OBSERVER: 2, OWNER: 3 }, TOKEN_DISPOSITIONS: { SECRET: -2 } };
  globalThis.Hooks = { on: (nome, tratar) => { (e.ganchos[nome] ??= []).push(tratar); },
    once: (nome, tratar) => { (e.ganchos[nome] ??= []).push(tratar); } };
  e.disparar = (nome, ...args) => (e.ganchos[nome] ?? []).map(tratar => tratar(...args));
  globalThis.foundry = { utils: { randomID: () => `pedido${e.pedidos.length}`, getProperty: propriedade,
    setProperty: (objeto, caminho, valor) => mesclar(objeto, { [caminho]: valor }), deepClone: structuredClone,
    mergeObject: mesclar, escapeHTML: texto => String(texto) },
  data: { operators: { ForcedDeletion: class { constructor() { this.__delete = true; } } } },
  applications: { api: { ApplicationV2: class {}, DialogV2: { wait: async () => null } } },
  canvas: { placeables: { tokens: {} } } };
  globalThis.fromUuid = async uuid => e.docs.get(uuid) ?? null;
  globalThis.fromUuidSync = uuid => e.docs.get(uuid) ?? null;
  class TokenNaTela {
    constructor(doc) { this.document = doc; this.actor = doc.actor; this.visible = true; this.isVisible = true; this.controlled = false; }
    _canControl(usuario) { return this.document.testUserPermission(usuario, 'OWNER'); }
    _canHUD(usuario) { return this.document.testUserPermission(usuario, 'OWNER'); }
    _canDrag() { return this.controlled; }
    _prepareDragLeftDropUpdates(evento) { return evento?.preparado ?? [[], { movement: {} }]; }
    checkCollision() { return e.colisao; }
    _getVisionBlindedStates() { return { blind: false, burrow: false }; }
    _getVisionSourceData() { return { ...this.document.center, level: this.document.level, radius: 1500, lightRadius: 3000, visionMode: 'basic' }; }
    get center() { return this.document.center; }
  }
  globalThis.foundry.canvas.placeables.Token = TokenNaTela;
  globalThis.foundry.canvas.placeables.tokens.Token = TokenNaTela;
  globalThis.CONFIG = { Token: { objectClass: TokenNaTela }, Canvas: { polygonBackends: {
    move: { testCollision: (origem, destino, opcoes) => { e.colisoes.push({ origem, destino, opcoes }); return e.colisao; } },
    sight: { testCollision: () => e.colisao }
  } } };
  globalThis.CONFIG.Canvas.visionSourceClass = class {
    constructor(opcoes) { this.blinded = {}; Object.assign(this, opcoes); e.visao.fontes.push(this); }
    initialize(dados) { this.data = dados; e.visao.inicializadas.push(this); }
    add() { e.visao.adicionadas.push(this); }
    destroy() { e.visao.destruidas.push(this); }
  };
  globalThis.CONFIG.Canvas.detectionModes = { basicSight: { testVisibility: (fonte, modo, config) => {
    e.visao.testes.push({ fonte, modo, config }); return e.visao.visivel;
  } } };
  globalThis.HTMLElement = class {};
  globalThis.document = { createElement: () => ({ dataset: {}, addEventListener() {}, append() {}, querySelector: () => null }) };

  function ator(id, tipo = 'personagem', dados = {}) {
    const fonte = mesclar({ _id: id, type: tipo, name: id, ownership: { default: 0, jogador: 3 }, flags: {},
      system: tipo === 'veiculo' ? { assentos: 2, velocidade: { combate: 20 } } : { veiculo: '', dirigindo: false } }, dados);
    const doc = { id, uuid: `Actor.${id}`, documentName: 'Actor', _source: fonte, items: colecao(), updates: [],
      getFlag: (escopo, chave) => fonte.flags[escopo]?.[chave],
      testUserPermission: usuario => Boolean(usuario?.isGM || Number(fonte.ownership[usuario?.id] ?? fonte.ownership.default) >= 3),
      canUserModify: usuario => doc.testUserPermission(usuario),
      update: async mudancas => { doc.updates.push(structuredClone(mudancas)); mesclar(fonte, mudancas); return doc; },
      toObject: () => structuredClone(fonte) };
    for (const chave of ['type', 'name', 'system', 'flags', 'ownership']) Object.defineProperty(doc, chave, { get: () => fonte[chave] });
    Object.defineProperty(doc, 'isOwner', { get: () => doc.testUserPermission(globalThis.game.user) });
    globalThis.game.actors.push(doc); e.docs.set(doc.uuid, doc); return doc;
  }
  e.cena = { id: 'tripulacao', uuid: 'Scene.tripulacao', active: true, isView: true, visible: true, tokens: colecao(), walls: colecao(),
    grid: { size: 100, distance: 2, type: 1 }, width: 3000, height: 3000,
    dimensions: { sceneX: 0, sceneY: 0, sceneWidth: 3000, sceneHeight: 3000, width: 3000, height: 3000 },
    testUserPermission: () => true,
    updateEmbeddedDocuments: async (tipo, mudancas, opcoes = {}) => Promise.all(mudancas.map(dados => e.cena.tokens.get(dados._id).update(dados, opcoes))),
    deleteEmbeddedDocuments: async (tipo, ids) => {
      const docs = ids.map(id => e.cena.tokens.get(id)).filter(Boolean);
      for (const doc of docs) e.disparar('preDeleteToken', doc, {}, globalThis.game.user.id);
      for (const doc of docs) { e.cena.tokens.splice(e.cena.tokens.indexOf(doc), 1); e.docs.delete(doc.uuid); }
      for (const doc of docs) e.disparar('deleteToken', doc, {}, globalThis.game.user.id);
      return docs;
    } };
  globalThis.game.scenes.push(e.cena);
  const nivel = { id: 'rua', parent: e.cena };
  e.cena.levels = new Map([[nivel.id, nivel]]);
  globalThis.canvas = { ready: true, scene: e.cena, level: nivel, dimensions: e.cena.dimensions, grid: { size: 100, distance: 2 },
    tokens: { controlled: [], placeables: [], active: true, get: id => e.cena.tokens.get(id)?.object },
    visibility: { tokenVision: false, _createVisibilityTestConfig: (pontos, { object }) => ({ object, level: nivel,
      tests: pontos.map(point => ({ point, level: nivel, los: new Map() })) }) },
    regions: {}, controls: { ruler: { active: false } } };
  function token(id, actor, dados = {}) {
    const fonte = mesclar({ _id: id, actorId: actor.id, actorLink: actor.type !== 'capanga', x: 500, y: 500,
      width: actor.type === 'veiculo' ? 2 : 1, height: actor.type === 'veiculo' ? 2 : 1, elevation: 0, sort: 0,
      texture: { src: `${id}.webp`, scaleX: 1, scaleY: 1 }, lockRotation: true, rotation: 90, flags: {}, hidden: false, disposition: 0, level: 'rua',
      sight: { enabled: false }, detectionModes: {} }, dados);
    const doc = { id, uuid: `${e.cena.uuid}.Token.${id}`, documentName: 'Token', parent: e.cena, actor, _source: fonte, updates: [], moves: [],
      getFlag: (escopo, chave) => fonte.flags[escopo]?.[chave],
      testUserPermission: usuario => actor.testUserPermission(usuario), canUserModify: usuario => actor.testUserPermission(usuario),
      toObject: () => structuredClone(fonte), updateSource: mudancas => mesclar(fonte, mudancas),
      getSize: () => ({ width: fonte.width * 100, height: fonte.height * 100 }),
      getVisibilityTestPoints: () => [{ ...doc.center, elevation: fonte.elevation }],
      update: async (mudancas, opcoes = {}) => {
        doc.updates.push({ mudancas: structuredClone(mudancas), opcoes: { ...opcoes } });
        mesclar(fonte, mudancas); e.disparar('updateToken', doc, mudancas, opcoes, globalThis.game.user.id); return doc;
      },
      move: async (destino, opcoes = {}) => {
        doc.moves.push({ destino: structuredClone(destino), opcoes: { ...opcoes } });
        const ponto = Array.isArray(destino) ? destino.at(-1) : destino;
        await doc.update(ponto, opcoes); e.disparar('moveToken', doc, { destination: ponto, passed: { waypoints: [ponto] } }, opcoes, globalThis.game.user); return true;
      } };
    for (const chave of ['x', 'y', 'width', 'height', 'elevation', 'sort', 'texture', 'rotation', 'flags', 'hidden', 'disposition', 'actorLink', 'actorId', 'lockRotation', 'level', 'sight', 'detectionModes']) Object.defineProperty(doc, chave, { configurable: true, get: () => fonte[chave] });
    Object.defineProperty(doc, 'center', { get: () => ({ x: fonte.x + fonte.width * 50, y: fonte.y + fonte.height * 50 }) });
    Object.defineProperty(doc, 'isOwner', { get: () => doc.testUserPermission(globalThis.game.user) });
    Object.defineProperty(doc, 'isSecret', { get: () => fonte.disposition === -2 && !actor.testUserPermission(globalThis.game.user) });
    doc.object = new TokenNaTela(doc); doc.object.scene = e.cena; doc.object.layer = globalThis.canvas.tokens;
    doc.setFlag = (escopo, chave, valor) => doc.update({ [`flags.${escopo}.${chave}`]: valor });
    doc.unsetFlag = (escopo, chave) => doc.update({ [`flags.${escopo}.-=${chave}`]: null });
    e.cena.tokens.push(doc); globalThis.canvas.tokens.placeables.push(doc.object); e.docs.set(doc.uuid, doc); return doc;
  }
  e.ator = ator; e.token = token; e.gm = gm; e.jogador = jogador; e.intruso = intruso;
  e.carro = token('carro', ator('veiculo', 'veiculo', { ownership: { jogador: 0 } }));
  e.a = token('a', ator('ana'), { x: 400, y: 500 });
  e.b = token('b', ator('bia', 'capanga'), { x: 500, y: 400, width: 2, height: 2, sort: 7, elevation: 3 });
  e.c = token('c', ator('cesar'), { x: 600, y: 400 });
  try {
    e.api = await import('../../foundry-sistema/scripts/tripulacao.mjs');
    e.api.registrarTripulacao();
    await Promise.all(e.disparar('ready'));
    return await tarefa(e);
  } finally {
    if (e.api) await e.api.esperarTripulacao();
    for (const [chave, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; }
  }
}

test('C46.3 aplicação: dois embarques concorrentes cabem e o terceiro é recusado sem perder a tripulação', async () => ambiente(async e => {
  // M17, Tabletop/mesa-api.js:1309-1315: os assentos limitam o embarque e a ordem decide quem dirige.
  await Promise.all([e.api.embarcar(e.a, e.carro), e.api.embarcar(e.b, e.carro)]);
  await e.api.embarcar(e.c, e.carro);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['a', 'b']);
  assert.equal(e.c.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.equal(e.api.veiculoDaTripulacao(e.a), e.carro);
  e.a.actor.veiculoAtivo = { id: 'veiculo-antigo', type: 'veiculo' };
  assert.equal(e.api.protecaoDoOcupante(e.a), e.carro.actor);
  await e.api.dirigir(e.b);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['b', 'a']);
  assert.equal(e.a.actor.system.dirigindo, false);
  assert.equal(e.b.actor.system.dirigindo, false);
}));

test('C46.3 aplicação: mover o carro acompanha a fonte nova, sem custo de MOVE nem alteração da imagem do C45', async () => ambiente(async e => {
  await e.api.embarcar(e.a, e.carro);
  const textura = structuredClone(e.a.texture), rotacao = e.a.rotation;
  const centroAntes = e.a.center;
  // Enquanto anima, o preparado pode continuar na origem (QUALITY_GATES, Token andando no Foundry 14).
  Object.defineProperty(e.carro, 'x', { get: () => 500 });
  Object.defineProperty(e.carro, 'y', { get: () => 500 });
  await e.carro.update({ x: 1100, y: 900, elevation: 5 });
  await e.api.esperarTripulacao();
  assert.equal(e.a.center.x - centroAntes.x, 600);
  assert.equal(e.a.center.y - centroAntes.y, 400);
  assert.equal(e.a.elevation, 5);
  assert.deepEqual(e.a.texture, textura);
  assert.equal(e.a.rotation, rotacao);
  assert.equal(e.a.lockRotation, true);
  const movimento = e.a.moves.at(-1);
  assert.equal(movimento.destino.action, 'displace');
  assert.equal(movimento.opcoes.autoRotate, false);
  assert.equal(movimento.opcoes.constrainOptions.ignoreWalls, true);
  assert.equal(movimento.opcoes.constrainOptions.ignoreCost, true);
}));

test('C46.3 aplicação: descer devolve as dimensões e a ordem originais e limpa as duas marcas', async () => ambiente(async e => {
  // M17, Tabletop/README.md:108: Descer procura lugar livre ao lado; a figura menor só vale dentro.
  const original = { width: e.b.width, height: e.b.height, sort: e.b.sort, elevation: e.b.elevation };
  await e.api.embarcar(e.b, e.carro);
  assert.equal(e.b.width, original.width / 2);
  assert.equal(e.b.height, original.height / 2);
  await e.api.descer(e.b);
  assert.equal(e.b.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), []);
  assert.deepEqual({ width: e.b.width, height: e.b.height, sort: e.b.sort, elevation: e.b.elevation }, original);
  assert.equal(e.api.veiculoDaTripulacao(e.b), null);
}));

test('C46.3 aplicação: o motorista do próprio veículo ligado ativa o C40 e descer o desliga', async () => ambiente(async e => {
  const item = { id: 'posse', uuid: `${e.a.actor.uuid}.Item.posse`, type: 'veiculo', documentName: 'Item', parent: e.a.actor,
    actor: e.a.actor, system: { janelas: { frente: { nome: 'Frente', hp: { value: 15, max: 15 } } } },
    flags: { [SISTEMA]: { veiculoAtor: e.carro.actor.id } },
    getFlag: (escopo, chave) => escopo === SISTEMA && chave === 'veiculoAtor' ? e.carro.actor.id : undefined };
  e.a.actor.items.push(item); e.docs.set(item.uuid, item);
  await e.carro.actor.update({ [`flags.${SISTEMA}.veiculoItem`]: { atorId: e.a.actor.id, itemId: item.id } });
  await e.api.embarcar(e.a, e.carro);
  assert.equal(e.a.actor.system.veiculo, item.id);
  assert.equal(e.a.actor.system.dirigindo, true);
  assert.equal(e.api.protecaoDoOcupante(e.a), item);
  await e.api.embarcar(e.b, e.carro);
  await e.api.dirigir(e.b);
  assert.equal(e.a.actor.system.dirigindo, false);
  assert.equal(e.b.actor.system.dirigindo, false);
  await e.api.dirigir(e.a);
  assert.equal(e.a.actor.system.dirigindo, true);
  await e.api.descer(e.a);
  assert.equal(e.a.actor.system.dirigindo, false);
}));

test('C46.3 aplicação: apagar o token do carro desembarca todos sem apagar os atores nem os ocupantes', async () => ambiente(async e => {
  await e.api.embarcar(e.a, e.carro);
  await e.api.embarcar(e.b, e.carro);
  const atores = [...globalThis.game.actors], fonteB = e.b.getFlag(SISTEMA, 'embarcado').original;
  await e.cena.deleteEmbeddedDocuments('Token', [e.carro.id]);
  await e.api.esperarTripulacao();
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.equal(e.b.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.equal(e.a.width, 1);
  assert.equal(e.b.width, fonteB.width);
  assert.deepEqual(globalThis.game.actors.slice(), atores);
  assert.equal(e.cena.tokens.includes(e.a), true);
  assert.equal(e.cena.tokens.includes(e.b), true);
}));

test('C46.3 aplicação: o jogador pede pelo socket e só o mestre ativo grava a tripulação do NPC', async () => ambiente(async e => {
  globalThis.game.user = e.jogador;
  const promessa = e.api.embarcar(e.a, e.carro);
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  const pedido = e.pedidos.at(-1).dados;
  assert.equal(pedido.tipo, 'tripulacaoPedido');
  globalThis.game.user = e.gm;
  await e.socket(pedido);
  const resposta = e.pedidos.at(-1).dados;
  assert.equal(resposta.tipo, 'tripulacaoResposta');
  globalThis.game.user = e.jogador;
  await e.socket(resposta);
  assert.ok(await promessa);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['a']);
  assert.equal(e.carro.actor.testUserPermission(e.jogador, 'OWNER'), false);
}));

test('C46.3 aplicação: pedido remoto relê o dono quando chega à fila e não usa a permissão anterior', async () => ambiente(async e => {
  let liberar, chegou;
  const bloqueio = new Promise(resolve => { liberar = resolve; });
  const naEspera = new Promise(resolve => { chegou = resolve; });
  const atualizar = e.a.update;
  e.a.update = async (mudancas, opcoes) => {
    if (Object.hasOwn(mudancas, `flags.${SISTEMA}.embarcado`)) { chegou(); await bloqueio; }
    return atualizar(mudancas, opcoes);
  };
  const primeiro = e.api.embarcar(e.a, e.carro);
  await naEspera;
  const segundo = e.socket({ tipo: 'tripulacaoPedido', id: 'remoto', de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.b.id, veiculoId: e.carro.id } });
  e.b.actor.ownership.jogador = 0;
  liberar();
  await Promise.all([primeiro, segundo]);
  assert.equal(e.b.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['a']);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /token não é seu/);
}));

test('C46.3 aplicação: copiar tokens não duplica tripulação nem o tamanho reduzido do ocupante', async () => ambiente(async e => {
  await e.api.embarcar(e.b, e.carro);
  const clone = e.token('copia', e.b.actor, e.b.toObject());
  e.disparar('preCreateToken', clone, clone.toObject(), {}, e.gm.id);
  assert.equal(clone.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.equal(clone.width, 2);
  assert.equal(clone.height, 2);
  assert.equal(clone.sort, 7);
  assert.equal(clone.elevation, 3);
  const cloneVeiculo = e.token('copia-carro', e.carro.actor, e.carro.toObject());
  e.disparar('preCreateToken', cloneVeiculo, cloneVeiculo.toObject(), {}, e.gm.id);
  assert.equal(cloneVeiculo.getFlag(SISTEMA, 'tripulacao'), undefined);
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['b']);
}));

test('C46.3 aplicação: o mestre recusa o pedido remoto para veículo escondido', async () => ambiente(async e => {
  await e.carro.update({ hidden: true });
  await e.socket({ tipo: 'tripulacaoPedido', id: 'escondido', de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.a.id, veiculoId: e.carro.id } });
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /não vê/);
}));

test('C46.3 aplicação: o mestre recusa disposição secreta sem usar sua própria visão de GM', async () => ambiente(async e => {
  await e.carro.update({ disposition: -2 });
  assert.equal(e.carro.isSecret, false);
  await e.socket({ tipo: 'tripulacaoPedido', id: 'secreto', de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.a.id, veiculoId: e.carro.id } });
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /não vê/);
}));

test('C46.3 aplicação: o pedido remoto da cena que deixou de estar ativa não embarca ninguém', async () => ambiente(async e => {
  e.cena.active = false;
  await e.socket({ tipo: 'tripulacaoPedido', id: 'cena-antiga', de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.a.id, veiculoId: e.carro.id } });
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /cena ou a permissão mudou/);
}));

test('C46.3 aplicação: o arrasto interceptado usa o mesmo embarque e não grava um movimento solto', async () => ambiente(async e => {
  const evento = { preparado: [[{ _id: e.a.id }], { movement: { [e.a.id]: { waypoints: [{ x: 550, y: 550 }] } } }] };
  const [updates, opcoes] = e.a.object._prepareDragLeftDropUpdates(evento);
  assert.deepEqual(updates, []);
  assert.deepEqual(opcoes.movement, {});
  await e.api.esperarTripulacao();
  assert.deepEqual(e.carro.getFlag(SISTEMA, 'tripulacao'), ['a']);
  assert.equal(e.api.veiculoDaTripulacao(e.a), e.carro);
  const antes = e.a.toObject();
  assert.deepEqual(e.disparar('preMoveToken', e.a, { destination: { x: 2500, y: 2500 } }, {}), [false]);
  await e.api.esperarTripulacao();
  assert.deepEqual(e.a.toObject(), antes);
}));

test('C46.3 aplicação: só o motorista ganha o controle do NPC, sem mudar sua propriedade', async () => ambiente(async e => {
  await e.api.embarcar(e.a, e.carro);
  globalThis.game.user = e.jogador;
  assert.equal(e.carro.object._canControl(e.jogador), true);
  assert.equal(e.carro.object._canControl(e.intruso), false);
  assert.equal(e.carro.testUserPermission(e.jogador, 'OWNER'), false);
  assert.deepEqual(e.carro.actor.ownership, { default: 0, jogador: 0 });
}));

test('C46.3 aplicação: a saída consulta as paredes da cena do veículo quando o mestre olha outra cena', async () => ambiente(async e => {
  await e.api.embarcar(e.a, e.carro);
  e.cena.isView = false;
  e.carro.object = null;
  globalThis.canvas.scene = { id: 'outra-cena' };
  globalThis.canvas.level = { id: 'outro-nivel' };
  e.colisoes.length = 0;
  await e.api.descer(e.a);
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.ok(e.colisoes.length > 0);
  assert.equal(e.colisoes.at(-1).opcoes.level, e.cena.levels.get('rua'));
}));

test('C46.3 aplicação: mover o carro fora do canvas continua recusando a parede da própria cena', async () => ambiente(async e => {
  await e.api.embarcar(e.a, e.carro);
  e.cena.isView = false;
  e.carro.object = null;
  globalThis.canvas.scene = { id: 'outra-cena' };
  globalThis.canvas.level = { id: 'outro-nivel' };
  e.colisao = true;
  const antes = e.carro.toObject(), ocupante = e.a.toObject();
  assert.equal(await e.api.arrastar(e.carro, { x: 1000, y: 1000 }), null);
  assert.deepEqual(e.carro.toObject(), antes);
  assert.deepEqual(e.a.toObject(), ocupante);
  assert.equal(e.colisoes.at(-1).opcoes.level, e.cena.levels.get('rua'));
}));

test('C46.3 aplicação: a visão remota usa detector nativo e fonte temporária sem selecionar o token do jogador', async () => ambiente(async e => {
  e.cena.tokenVision = true;
  await e.a.update({ 'sight.enabled': true, detectionModes: { basicSight: { enabled: true, range: 30 } } });
  assert.equal(e.a.object.vision, undefined);
  const pedido = id => ({ tipo: 'tripulacaoPedido', id, de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.a.id, veiculoId: e.carro.id } });
  await e.socket(pedido('visivel'));
  assert.equal(e.api.veiculoDaTripulacao(e.a), e.carro);
  assert.equal(e.visao.fontes.length, 1);
  assert.equal(e.visao.inicializadas.length, 1);
  assert.equal(e.visao.destruidas.length, 1);
  assert.equal(e.visao.adicionadas.length, 0);
  assert.equal(e.visao.testes[0].fonte.object, e.a.object);
  assert.equal(e.visao.testes[0].config.object, e.carro.object);
  assert.deepEqual(e.visao.testes[0].modo, { enabled: true, range: 30 });
  assert.equal(e.a.object.vision, undefined);
  await e.api.descer(e.a);
  e.visao.visivel = false;
  await e.socket(pedido('sem-visao'));
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /não vê/);
  assert.equal(e.visao.destruidas.length, 2);
  assert.equal(e.visao.adicionadas.length, 0);
}));

test('C46.3 aplicação: com visão de token o mestre em outra cena recusa antes de testar a luz errada', async () => ambiente(async e => {
  e.cena.tokenVision = true;
  globalThis.canvas.scene = { id: 'outra-cena' };
  await e.socket({ tipo: 'tripulacaoPedido', id: 'outra-visao', de: e.jogador.id,
    pedido: { acao: 'embarcar', cenaId: e.cena.id, tokenId: e.a.id, veiculoId: e.carro.id } });
  assert.equal(e.a.getFlag(SISTEMA, 'embarcado'), undefined);
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /mestre precisa abrir esta cena/);
  assert.equal(e.visao.fontes.length, 0);
}));

// ---------------- C46.4: o resto pelo ator ----------------
// O item de veículo de outro dono ligado ao ator do token (a parte 2: os dois ponteiros e o dono concordam).
async function posseLigada(e, dono, veiculo, id = 'posse') {
  const item = { id, uuid: `${dono.uuid}.Item.${id}`, type: 'veiculo', documentName: 'Item', name: `Carro de ${dono.name}`, parent: dono, actor: dono,
    system: { janelas: {} }, flags: { [SISTEMA]: { veiculoAtor: veiculo.actor.id } }, getFlag: (escopo, chave) => item.flags[escopo]?.[chave] };
  dono.items.push(item); e.docs.set(item.uuid, item);
  await veiculo.actor.update({ [`flags.${SISTEMA}.veiculoItem`]: { atorId: dono.id, itemId: id } });
  return item;
}
// A metralhadora de bordo do C15 instalada no item (armas-veiculos.mjs: só Autofogo; o upgrade instalado no mesmo item).
function metralhadoraNo(dono, posse) {
  const upgrade = { id: 'instalacao', type: 'upgrade', system: { alvo: 'veiculo', instaladoEm: posse.id },
    getFlag: (escopo, chave) => (escopo === SISTEMA && chave === 'catalogo' ? 'core_upgrades:onboard-machine-gun' : undefined) };
  const arma = { id: 'metralhadora', uuid: `${dono.uuid}.Item.metralhadora`, type: 'arma', name: 'Onboard Machine Gun', parent: dono, actor: dono,
    system: { instaladoEm: posse.id }, ataques: [], atacar: opcoes => { arma.ataques.push(opcoes); return 'atacou'; },
    getFlag: (escopo, chave) => (escopo === SISTEMA && chave === 'armaVeicular' ? { tipo: 'metralhadora', soAutofogo: true, upgrade: upgrade.id } : undefined) };
  dono.items.push(upgrade, arma);
  return arma;
}

test('C46.4 aplicação: o motorista dirige o carro do token (o NPC e o de outro dono); o passageiro não; fora, o C40 de hoje', async () => ambiente(async e => {
  // Wiki, system-rules.js:538; M17, mesa-api.js:691-693: o primeiro da tripulação dirige.
  await e.api.embarcar(e.a, e.carro); await e.api.embarcar(e.c, e.carro);
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), e.carro.actor);
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor), e.carro.actor);
  assert.equal(e.api.veiculoQueDirige(e.a.actor), e.carro);
  assert.equal(e.api.veiculoDirigidoPor(e.c.actor, e.c), null);
  assert.equal(e.api.veiculoQueDirige(e.c.actor, e.c), null);
  // Quem não está no token pedido (o token de outro ator) não dirige por ele.
  assert.equal(e.api.veiculoDirigidoPor(e.c.actor, e.a), null);
  // Assumir a direção troca quem dirige; o NPC continua sem o "Dirigindo" do C40 em ninguém.
  await e.api.dirigir(e.c);
  assert.equal(e.api.veiculoDirigidoPor(e.c.actor, e.c), e.carro.actor);
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), null);
  assert.deepEqual([e.a.actor.system.dirigindo, e.c.actor.system.dirigindo], [false, false]);
  // No ligado de outro dono, o estado é o item (a parte 2).
  const posse = await posseLigada(e, e.b.actor, e.carro);
  assert.equal(e.api.veiculoDirigidoPor(e.c.actor, e.c), posse);
  // Passageira com o próprio carro do C40 em "Dirigindo": dentro de outro, não dirige o dela.
  const moto = { id: 'moto', uuid: `${e.a.actor.uuid}.Item.moto`, type: 'veiculo', parent: e.a.actor, actor: e.a.actor, system: {}, flags: {}, getFlag: () => undefined };
  e.a.actor.items.push(moto);
  await e.a.actor.update({ 'system.veiculo': 'moto', 'system.dirigindo': true });
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), null);
  // Fora de qualquer veículo: o C40 de hoje, o item em uso.
  await e.api.descer(e.a);
  await e.a.actor.update({ 'system.veiculo': 'moto', 'system.dirigindo': true });
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), moto);
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor), moto);
}));

test('C46.4 aplicação: o veículo do C40 com token na cena se dirige de dentro; sem o token, como antes', async () => ambiente(async e => {
  const posse = await posseLigada(e, e.a.actor, e.carro);
  await e.a.actor.update({ 'system.veiculo': posse.id, 'system.dirigindo': true });
  e.a.actor.veiculoAtivo = posse;
  // A dona fora do token do próprio carro, na mesma cena: não dirige.
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), null);
  // Dentro, como motorista: o item (embarcar liga o "Dirigindo" do C40).
  await e.api.embarcar(e.a, e.carro);
  assert.equal(e.a.actor.system.dirigindo, true);
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), posse);
  await e.api.descer(e.a);
  // Sem o token do carro na cena: o C40 de hoje.
  await e.cena.deleteEmbeddedDocuments('Token', [e.carro.id]);
  await e.api.esperarTripulacao();
  await e.a.actor.update({ 'system.dirigindo': true });
  assert.equal(e.api.veiculoDirigidoPor(e.a.actor, e.a), posse);
}));

test('C46.4 aplicação: a metralhadora do carro de outro dono: o motorista dispara; o passageiro, o dono de fora e outro carro, não', async () => ambiente(async e => {
  // CORE 0.92.4, core_upgrades.json:170: "The driver may fire it using an Action"; o C15 (só Autofogo) continua valendo.
  const veiculos = await import('../../foundry-sistema/scripts/veiculos.mjs');
  const dono = e.c.actor, posse = await posseLigada(e, dono, e.carro), arma = metralhadoraNo(dono, posse);
  dono.veiculoAtivo = posse;
  const motivo = (atirador, token, modo = 'autofogo') => veiculos.motivoVeicular(arma, modo, e.api.assentoDaArma(arma, atirador, token));
  assert.deepEqual(e.api.armasDoVeiculo(e.carro), [arma]);
  await e.api.embarcar(e.a, e.carro); await e.api.embarcar(e.b, e.carro);
  assert.equal(motivo(e.a.actor, e.a), '');
  assert.equal(motivo(e.a.actor, e.a, 'tiro'), 'A metralhadora de bordo só dispara com Autofogo.');
  assert.equal(motivo(e.b.actor, e.b), 'Só o motorista dispara a arma montada do veículo.');
  // O dono de fora, com o carro em uso e o token dele na cena: entra para usar; o C15 sem assento continua.
  assert.equal(motivo(dono, e.c), 'Entre no veículo como motorista para usar a arma montada.');
  assert.equal(veiculos.motivoVeicular(arma, 'autofogo'), '');
  // O motorista de outro carro não usa as armas deste.
  const van = e.token('van', e.ator('van', 'veiculo'), { x: 1500, y: 1500 });
  await e.api.descer(e.a); await e.a.update({ x: 1400, y: 1500 }); await e.api.embarcar(e.a, van);
  assert.equal(e.api.veiculoQueDirige(e.a.actor, e.a), van);
  assert.equal(motivo(e.a.actor, e.a), 'Esta arma montada é de outro veículo.');
  assert.deepEqual(e.api.armasDoVeiculo(van), []);
  // Sem a arma no veículo (a do cyberware, a solta): nenhum assento.
  assert.equal(e.api.assentoDaArma({ ...arma, system: { instaladoEm: '' } }, e.a.actor, e.a), null);
}));

test('C46.4 aplicação: o HUD do motorista ganha Manobra e Armas do veículo; o passageiro, não; os cliques levam o token', async () => ambiente(async e => {
  const posse = await posseLigada(e, e.c.actor, e.carro), arma = metralhadoraNo(e.c.actor, posse);
  const manobras = [];
  globalThis.game.system.api.veiculos = { manobra: (...argumentos) => { manobras.push(argumentos); return null; } };
  globalThis.foundry.applications.api.DialogV2.wait = async () => arma.id;
  const hud = token => {
    const coluna = { botoes: [], append: botao => coluna.botoes.push(botao),
      querySelector: seletor => coluna.botoes.find(botao => `.${botao.className.split(' ')[1]}` === seletor) ?? null };
    globalThis.document = { createElement: () => { const botao = { dataset: {}, setAttribute() {}, addEventListener: (tipo, tratar) => { botao.clique = tratar; } }; return botao; } };
    e.disparar('renderTokenHUD', { object: { document: token } }, { querySelector: seletor => (seletor === '.col.left' ? coluna : null) });
    return Object.fromEntries(coluna.botoes.map(botao => [botao.className.split(' ')[1].replace(`${SISTEMA}-`, ''), botao]));
  };
  await e.api.embarcar(e.a, e.carro); await e.api.embarcar(e.b, e.carro);
  const doMotorista = hud(e.a);
  assert.deepEqual(Object.keys(doMotorista), ['descer', 'dirigir', 'manobra', 'armas']);
  assert.deepEqual(Object.keys(hud(e.b)), ['descer', 'dirigir']);
  const clique = { preventDefault() {}, stopPropagation() {}, ctrlKey: false };
  doMotorista.manobra.clique(clique); await e.api.esperarTripulacao();
  assert.equal(manobras.length, 1);
  assert.equal(manobras[0][0], e.a.actor); assert.equal(manobras[0][1], null); assert.equal(manobras[0][2].token, e.a);
  doMotorista.armas.clique(clique); await e.api.esperarTripulacao();
  assert.equal(arma.ataques.length, 1);
  assert.equal(arma.ataques[0].atirador, e.a.actor); assert.equal(arma.ataques[0].tokenAtirador, e.a); assert.equal(arma.ataques[0].modo, 'autofogo');
  // Sem arma montada (o carro de NPC sem o item), a Manobra fica e as armas não.
  await e.carro.actor.update({ [`flags.${SISTEMA}.veiculoItem`]: { atorId: 'ninguem', itemId: 'nada' } });
  assert.deepEqual(Object.keys(hud(e.a)), ['descer', 'dirigir', 'manobra']);
}));

test('C46.4 aplicação: o motorista do carro de NPC não corre; o passageiro corre', async () => ambiente(async e => {
  // Wiki, system-rules.js:538: quem dirige não usa mais Ações de Movimento; :501: Correr é uma Ação de Movimento extra.
  const estados = await import('../../foundry-sistema/scripts/estados.mjs');
  for (const token of [e.a, e.c]) {
    token.actor.statuses = new Set(); token.actor.veiculoAtivo = null;
    await token.actor.update({ 'system.atributos.move.valor': 6 });
  }
  await e.api.embarcar(e.a, e.carro); await e.api.embarcar(e.c, e.carro);
  assert.equal(estados.corridaDe(e.a.actor).bloqueio, 'Quem dirige não usa Ações de Movimento.');
  assert.deepEqual(estados.corridaDe(e.c.actor), { metros: 12, total: 24, acoes: 1, bloqueio: null });
  await e.api.descer(e.a);
  assert.equal(estados.corridaDe(e.a.actor).bloqueio, null);
}));
