// C46.2: o módulo de aplicação real, com documentos pequenos que guardam o estado gravado e as permissões.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers';
import test from 'node:test';
import { estadoDoItemVeiculo } from '../../foundry-sistema/scripts/regras-vinculo-veiculo.mjs';
import { receberDanoVeicular, desfazerDanoVeicular } from '../../foundry-sistema/scripts/veiculos.mjs';

const SISTEMA = 'cpr-fieldbook';
const catalogo = JSON.parse(readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const colecao = () => {
  const lista = [];
  lista.get = id => lista.find(documento => documento.id === id);
  lista.has = id => Boolean(lista.get(id));
  lista.contents = lista;
  return lista;
};
function mesclar(destino, mudancas) {
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.'), fim = partes.pop();
    const pai = partes.reduce((objeto, parte) => objeto[parte] ??= {}, destino);
    if (fim.startsWith('-=')) delete pai[fim.slice(2)];
    else if (valor && typeof valor === 'object' && Object.hasOwn(valor, '__delete')) delete pai[fim];
    else if (valor && typeof valor === 'object' && Object.hasOwn(valor, '__replace')) pai[fim] = structuredClone(valor.__replace);
    else if (valor && typeof valor === 'object' && !Array.isArray(valor)) mesclar(pai[fim] ??= {}, valor);
    else pai[fim] = structuredClone(valor);
  }
  return destino;
}
const propriedade = (objeto, caminho) => caminho.split('.').reduce((valor, parte) => valor?.[parte], objeto);
function achatar(objeto, prefixo = '', saida = {}) {
  for (const [chave, valor] of Object.entries(objeto)) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) achatar(valor, caminho, saida);
    else saida[caminho] = valor;
  }
  return saida;
}

async function ambiente(tarefa) {
  const chaves = ['game', 'foundry', 'ui', 'canvas', 'fromUuid', 'Actor', 'Folder', 'Hooks', 'CONST', 'CONFIG', 'HTMLElement', 'document'];
  const anteriores = Object.fromEntries(chaves.map(chave => [chave, globalThis[chave]]));
  const e = { avisos: [], recados: [], pedidos: [], ganchos: {}, docs: new Map(), criados: [], pastas: [] };
  const gm = { id: 'gm', isGM: true, active: true }, jogador = { id: 'jogador', isGM: false, active: true };
  const intruso = { id: 'intruso', isGM: false, active: true }, usuarios = colecao();
  usuarios.push(gm, jogador, intruso); usuarios.activeGM = gm;
  Object.defineProperty(gm, 'isSelf', { get: () => globalThis.game.user.id === gm.id });
  globalThis.game = { user: gm, users: usuarios, actors: colecao(), scenes: colecao(), folders: colecao(),
    socket: { emit: (canal, dados) => e.pedidos.push({ canal, dados }), on: (canal, tratar) => { e.socket = tratar; } } };
  globalThis.ui = { notifications: { warn: mensagem => e.avisos.push(mensagem), info: mensagem => e.recados.push(mensagem) } };
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, OWNER: 3 }, FOLDER_DOCUMENT_TYPES: ['Actor'] };
  globalThis.Hooks = { on: (nome, tratar) => { (e.ganchos[nome] ??= []).push(tratar); },
    once: (nome, tratar) => { (e.ganchos[nome] ??= []).push(tratar); } };
  globalThis.foundry = { utils: { randomID: () => `id${e.criados.length + e.pastas.length}`, getProperty: propriedade,
    setProperty: (objeto, chave, valor) => mesclar(objeto, { [chave]: valor }), flattenObject: achatar,
    expandObject: objeto => mesclar({}, objeto), deepClone: structuredClone, duplicate: structuredClone,
    mergeObject: (objeto, outro) => mesclar(objeto, outro) },
  data: { operators: { ForcedReplacement: { create: valor => ({ __replace: valor }) }, ForcedDeletion: class { constructor() { this.__delete = true; } } } },
  applications: { api: { ApplicationV2: class { render() { return this; } } } } };
  globalThis.fromUuid = async uuid => e.docs.get(uuid) ?? null;
  function documento(dados, parent = null) {
    const fonte = structuredClone(dados);
    fonte.prototypeToken ??= { name: fonte.name, texture: { src: fonte.img }, actorLink: false, width: 2, height: 2, bar1: { attribute: 'sdp' } };
    const doc = { parent, actor: parent, _source: fonte, updates: [], isToken: false, documentName: parent ? 'Item' : 'Actor',
      id: fonte._id, uuid: parent ? `${parent.uuid}.Item.${fonte._id}` : `Actor.${fonte._id}`,
      items: colecao(), flags: fonte.flags ??= {},
      getFlag: (escopo, chave) => doc.flags[escopo]?.[chave],
      testUserPermission: usuario => usuario?.isGM || Number(doc.ownership?.[usuario?.id] ?? doc.ownership?.default) >= 3,
      canUserModify: usuario => (parent ?? doc).testUserPermission(usuario),
      toObject: () => structuredClone(fonte),
      update: async (mudancas, opcoes = {}) => {
        doc.updates.push({ mudancas: structuredClone(mudancas), opcoes: { ...opcoes } });
        mesclar(fonte, mudancas); preparar(); return doc;
      },
      setFlag: (escopo, chave, valor) => doc.update({ [`flags.${escopo}.${chave}`]: valor }),
      unsetFlag: (escopo, chave) => doc.update({ [`flags.${escopo}.-=${chave}`]: null }),
      getTokenDocument: async (mudancas = {}) => ({ toObject: () => mesclar({ actorId: doc.id, ...structuredClone(doc.prototypeToken ?? {}) }, mudancas) })
    };
    function preparar() {
      for (const chave of ['name', 'img', 'type', 'system', 'prototypeToken', 'ownership', 'folder']) doc[chave] = structuredClone(fonte[chave]);
      doc.flags = fonte.flags;
      if (parent) {
        const estado = estadoDoItemVeiculo(doc, parent.items);
        if (estado) {
          Object.assign(doc.system, estado.system);
          doc.system.blindagem = { max: doc.system.sp, sp: Math.max(0, doc.system.sp - doc.system.ablacao) };
        }
      } else if (doc.type === 'veiculo') doc.system.blindagem = { max: doc.system.sp, sp: Math.max(0, doc.system.sp - doc.system.ablacao) };
    }
    Object.defineProperty(doc, 'isOwner', { get: () => parent ? parent.testUserPermission(globalThis.game.user) : doc.testUserPermission(globalThis.game.user) });
    preparar(); e.docs.set(doc.uuid, doc); return doc;
  }
  e.dono = documento({ _id: 'dono', type: 'personagem', name: 'Nomad', img: 'nomad.webp', ownership: { default: 0, jogador: 3 }, system: {} });
  globalThis.game.actors.push(e.dono);
  e.item = documento({ ...structuredClone(catalogo['core_vehicles:compact-groundcar']), _id: 'carro' }, e.dono);
  e.dono.items.push(e.item);
  for (const [indice, nome] of ['heavy-chassis', 'seating-upgrade', 'armored-chassis'].entries()) {
    const dados = structuredClone(catalogo[`core_upgrades:${nome}`]); dados.system.instaladoEm = e.item.id;
    e.dono.items.push(documento({ ...dados, _id: `upgrade${indice}` }, e.dono));
  }
  await e.item.update({ 'system.sdp.value': 40, 'system.ablacao': 2 }); e.item.updates.length = 0;
  e.espelho = documento({ _id: 'espelho', type: 'veiculo', name: 'Antigo', img: 'antigo.webp', ownership: { default: 0, jogador: 3 },
    system: { sdp: { value: 40, max: 70 }, assentos: 6, sp: 13, ablacao: 2, velocidade: { combate: 20, narrativa: '' }, tipo: 'terrestre', notas: 'Anotação do mestre' },
    flags: { [SISTEMA]: { veiculoItem: { atorId: e.dono.id, itemId: e.item.id } } } });
  globalThis.game.actors.push(e.espelho);
  await e.item.setFlag(SISTEMA, 'veiculoAtor', e.espelho.id); e.item.updates.length = 0;
  e.cena = { id: 'cena', uuid: 'Scene.cena', name: 'Rua', active: true, visible: true, isView: true, tokens: colecao(), grid: { size: 100, distance: 2 },
    width: 2000, height: 2000, dimensions: { width: 2000, height: 2000, sceneX: 0, sceneY: 0, sceneWidth: 2000, sceneHeight: 2000 },
    testUserPermission: () => e.cena.visible, createEmbeddedDocuments: async (tipo, dados) => dados.map(dado => {
      const token = { ...structuredClone(dado), id: `token${e.cena.tokens.length}`, parent: e.cena };
      e.cena.tokens.push(token); return token;
    }), updateEmbeddedDocuments: async (tipo, dados) => dados.map(dado => mesclar(e.cena.tokens.get(dado._id), dado)) };
  globalThis.game.scenes.push(e.cena);
  globalThis.canvas = { ready: true, scene: e.cena, dimensions: e.cena.dimensions, stage: { pivot: { x: 1000, y: 1000 } },
    app: { screen: { width: 1000, height: 1000 } } };
  globalThis.Actor = { create: async dados => {
    const criado = documento({ ...dados, _id: `novo${e.criados.length}` });
    globalThis.game.actors.push(criado); e.criados.push(criado); return criado;
  } };
  globalThis.Actor.implementation = globalThis.Actor;
  globalThis.Folder = { create: async dados => {
    const pasta = { ...dados, id: `pasta${e.pastas.length}`, getFlag: (escopo, chave) => dados.flags?.[escopo]?.[chave] };
    globalThis.game.folders.push(pasta); e.pastas.push(pasta); return pasta;
  } };
  globalThis.Folder.implementation = globalThis.Folder;
  globalThis.CONFIG = { Folder: { documentClass: globalThis.Folder } };
  e.gm = gm; e.jogador = jogador; e.intruso = intruso;
  try {
    e.api = await import('../../foundry-sistema/scripts/vinculo-veiculo.mjs');
    return await tarefa(e);
  } finally {
    for (const [chave, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; }
  }
}

test('C46.2 aplicação: os dois ponteiros precisam concordar, inclusive depois de copiar o personagem', async () => ambiente(async e => {
  assert.equal(e.api.itemDoVeiculo(e.espelho), e.item);
  assert.equal(e.api.atorDoItem(e.item), e.espelho);
  e.espelho.flags[SISTEMA].veiculoItem.atorId = 'outro';
  assert.equal(e.api.itemDoVeiculo(e.espelho), null);
  assert.equal(e.api.atorDoItem(e.item), null);
}));

test('C46.2 aplicação: editar o ator grava no item e devolve ao ator o snapshot preparado, sem repetir upgrades', async () => ambiente(async e => {
  const mudancas = { 'system.sdp.value': 35, 'system.sdp.max': 80, 'system.assentos': 8, 'system.ablacao': 3 };
  assert.equal(await e.api.gravarNoItemDoVeiculo(e.espelho, mudancas, {}, e.gm), true);
  assert.equal(e.item._source.system.sdp.value, 35);
  assert.equal(e.item._source.system.sdp.max, 60);
  assert.equal(e.item._source.system.assentos, 6);
  assert.equal(e.item.system.sdp.max, 80);
  assert.equal(e.item.system.assentos, 8);
  assert.equal(e.item.system.blindagem.sp, 10);
  const definitivo = mesclar(structuredClone(e.espelho._source), mudancas);
  assert.deepEqual(definitivo.system.sdp, { value: 35, max: 80 });
  assert.equal(definitivo.system.assentos, 8);
  const antes = e.item.updates.length;
  assert.equal(await e.api.gravarNoItemDoVeiculo(e.espelho, { 'system.sdp.value': 0 }, { cprfEspelhoVeiculo: true }, e.gm), true);
  assert.equal(e.item.updates.length, antes);
  assert.equal(e.item.system.sdp.value, 35);
}));

test('C46.2 aplicação: a permissão do ator não substitui a permissão no personagem dono do item', async () => ambiente(async e => {
  globalThis.game.user = e.jogador; e.dono.ownership.jogador = 0;
  assert.equal(e.espelho.isOwner, true);
  assert.equal(await e.api.gravarNoItemDoVeiculo(e.espelho, { 'system.ablacao': 3 }, {}, e.jogador), false);
  assert.equal(e.item.updates.length, 0);
  assert.equal(e.item.system.ablacao, 2);
}));

test('C46.2 aplicação: só o mestre ativo persiste o espelho; o SDP e os upgrades chegam sem apagar notas', async () => ambiente(async e => {
  globalThis.game.user = e.jogador;
  await e.api.sincronizarVeiculo(e.espelho);
  assert.equal(e.espelho.updates.length, 0);
  globalThis.game.user = e.gm;
  await e.api.sincronizarVeiculo(e.espelho);
  assert.equal(e.espelho.name, e.item.name);
  assert.deepEqual(e.espelho.system.sdp, { value: 40, max: 70 });
  assert.equal(e.espelho.system.assentos, 6);
  assert.equal(e.espelho.system.sp, 13);
  assert.equal(e.espelho.system.ablacao, 2);
  assert.equal(e.espelho.system.notas, 'Anotação do mestre');
  assert.equal(e.item.updates.length, 0);
  assert.equal(e.espelho.updates.at(-1).opcoes.cprfEspelhoVeiculo, true);
}));

test('C46.2 aplicação: Pôr na cena reaproveita o ator e um único token ligado na cena aberta', async () => ambiente(async e => {
  await e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id, centro: { x: 1000, y: 1000 } });
  await e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id, centro: { x: 1000, y: 1000 } });
  assert.equal(e.criados.length, 0);
  assert.equal(e.cena.tokens.length, 1);
  assert.equal(e.cena.tokens[0].actorId, e.espelho.id);
  assert.equal(e.cena.tokens[0].actorLink, true);
}));

test('C46.2 aplicação: sem mestre o pedido do dono recusa e o estranho não manda pedido', async () => ambiente(async e => {
  globalThis.game.user = e.intruso;
  await e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id });
  assert.equal(e.pedidos.length, 0);
  assert.equal(e.cena.tokens.length, 0);
  globalThis.game.user = e.jogador; globalThis.game.users.activeGM = null;
  await e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id });
  assert.equal(e.pedidos.length, 0);
  assert.equal(e.cena.tokens.length, 0);
  assert.ok(e.avisos.some(mensagem => /mestre/i.test(mensagem)));
}));

test('C46.2 aplicação: dois cliques criam um ator na pasta própria, com os donos do personagem e token perto dele', async () => ambiente(async e => {
  await e.item.unsetFlag(SISTEMA, 'veiculoAtor');
  globalThis.game.actors.splice(globalThis.game.actors.indexOf(e.espelho), 1);
  e.cena.tokens.push({ id: 'pessoa', actorId: e.dono.id, _source: { x: 200, y: 300 }, width: 1, height: 1, elevation: 0 });
  const respostas = await Promise.all([e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id }), e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id })]);
  assert.equal(e.criados.length, 1);
  assert.equal(e.pastas.length, 1);
  const ator = e.criados[0], tokens = e.cena.tokens.filter(token => token.actorId === ator.id);
  assert.deepEqual(ator.ownership, e.dono.toObject().ownership);
  assert.equal(ator.folder, e.pastas[0].id);
  assert.equal(e.pastas[0].type, 'Actor');
  assert.equal(e.api.itemDoVeiculo(ator), e.item);
  assert.equal(e.api.atorDoItem(e.item), ator);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].actorLink, true);
  assert.equal(tokens[0].x, 300);
  assert.equal(tokens[0].y, 300);
  assert.equal(tokens[0].width, 2);
  assert.equal(tokens[0].height, 2);
  assert.equal(tokens[0].bar1.attribute, 'sdp');
  assert.equal(respostas[0].tokenId, respostas[1].tokenId);
}));

test('C46.2 aplicação: o socket valida o dono e a cena; só a resposta do mestre esperado conclui o pedido', async () => ambiente(async e => {
  globalThis.game.user = e.jogador;
  e.api.registrarVinculoVeiculo();
  for (const tratar of e.ganchos.ready) await tratar();
  const pedido = { atorId: e.dono.id, itemId: e.item.id, sceneId: e.cena.id };
  globalThis.game.user = e.gm;
  await e.socket({ tipo: 'veiculoNaCena', id: 'intruso', de: e.intruso.id, pedido });
  assert.match(e.pedidos.at(-1).dados.resposta.erro, /permissão|veículo|cena/i);
  assert.equal(e.cena.tokens.length, 0);
  e.cena.active = false; e.cena.visible = false;
  await e.socket({ tipo: 'veiculoNaCena', id: 'oculta', de: e.jogador.id, pedido });
  assert.ok(e.pedidos.at(-1).dados.resposta.erro);
  assert.equal(e.cena.tokens.length, 0);
  e.cena.active = true; e.cena.visible = true;
  globalThis.game.user = e.jogador;
  let concluido = false;
  const pendente = e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id }).then(resposta => { concluido = true; return resposta; });
  const mensagem = e.pedidos.at(-1).dados;
  assert.equal(mensagem.tipo, 'veiculoNaCena');
  assert.equal(mensagem.de, e.jogador.id);
  await e.socket({ tipo: 'veiculoNaCenaResposta', id: mensagem.id, para: e.jogador.id, de: e.intruso.id, resposta: { atorId: 'errado' } });
  assert.equal(concluido, false);
  globalThis.game.user = e.gm;
  await e.socket(mensagem);
  const resposta = e.pedidos.at(-1).dados;
  globalThis.game.user = e.jogador;
  await e.socket(resposta);
  assert.equal((await pendente).atorId, e.espelho.id);
  assert.equal(e.cena.tokens.length, 1);
}));

test('C46.2 aplicação: apagar o ator retira só a ligação do item e conserva o estado da posse', async () => ambiente(async e => {
  e.api.registrarVinculoVeiculo();
  const antes = structuredClone(e.item._source.system);
  globalThis.game.actors.splice(globalThis.game.actors.indexOf(e.espelho), 1);
  for (const tratar of e.ganchos.deleteActor) await tratar(e.espelho, {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e.item.getFlag(SISTEMA, 'veiculoAtor'), undefined);
  assert.deepEqual(e.item._source.system, antes);
}));

test('C46.2 aplicação: apagar o item com os upgrades deixa NPC com o último estado preparado, sem perder notas', async () => ambiente(async e => {
  e.api.registrarVinculoVeiculo();
  await e.api.porVeiculoNaCena(e.item, { sceneId: e.cena.id });
  await e.item.update({ 'system.sdp.value': 27 });
  const opcoes = {};
  for (const tratar of e.ganchos.preDeleteItem) await tratar(e.item, opcoes);
  e.dono.items.splice(0, e.dono.items.length);
  for (const tratar of e.ganchos.deleteItem) await tratar(e.item, opcoes);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e.espelho.getFlag(SISTEMA, 'veiculoItem'), undefined);
  assert.deepEqual(e.espelho.system.sdp, { value: 27, max: 70 });
  assert.equal(e.espelho.system.assentos, 6);
  assert.equal(e.espelho.system.sp, 13);
  assert.equal(e.espelho.system.ablacao, 2);
  assert.equal(e.espelho.system.notas, 'Anotação do mestre');
  assert.equal(e.espelho.prototypeToken.actorLink, false);
  assert.equal(e.cena.tokens[0].actorLink, false);
  assert.ok(e.recados.some(mensagem => /NPC/.test(mensagem)));
}));

test('C46.2 aplicação: apagar o personagem também deixa o veículo NPC com os últimos números dos upgrades', async () => ambiente(async e => {
  e.api.registrarVinculoVeiculo();
  const opcoes = {};
  for (const tratar of e.ganchos.preDeleteActor) await tratar(e.dono, opcoes);
  globalThis.game.actors.splice(globalThis.game.actors.indexOf(e.dono), 1);
  for (const tratar of e.ganchos.deleteActor) await tratar(e.dono, opcoes);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e.espelho.getFlag(SISTEMA, 'veiculoItem'), undefined);
  assert.deepEqual(e.espelho.system.sdp, { value: 40, max: 70 });
  assert.equal(e.espelho.system.assentos, 6);
  assert.equal(e.espelho.system.sp, 13);
  assert.equal(e.espelho.prototypeToken.actorLink, false);
}));

test('C46.2 aplicação: a sincronização retira um dono antigo do ator espelho', async () => ambiente(async e => {
  await e.espelho.update({ 'ownership.intruso': 3 });
  await e.api.sincronizarVeiculo(e.espelho);
  assert.deepEqual(e.espelho.ownership, e.dono.ownership);
  assert.equal(e.espelho.ownership.intruso, undefined);
}));

test('C46.2 aplicação: cópia de personagem, item transferido e cópia do veículo não levam vínculos antigos', async () => ambiente(async e => {
  const original = [{ _id: e.item.id, type: 'veiculo', flags: { [SISTEMA]: { veiculoAtor: e.espelho.id, catalogo: 'core_vehicles:compact-groundcar' } } }];
  const dados = { items: structuredClone(original) };
  const copia = { documentName: 'Actor', type: 'personagem', toObject: () => structuredClone(dados), updateSource: mudancas => mesclar(dados, mudancas) };
  e.api.limparVinculosCopiados(copia, {});
  assert.equal(dados.items[0].flags[SISTEMA].veiculoAtor, undefined);
  assert.equal(dados.items[0].flags[SISTEMA].catalogo, 'core_vehicles:compact-groundcar');
  assert.equal(original[0].flags[SISTEMA].veiculoAtor, e.espelho.id);
  for (const [documentName, chave] of [['Item', 'veiculoAtor'], ['Actor', 'veiculoItem']]) {
    const fonte = { flags: { [SISTEMA]: { [chave]: 'antigo', outra: true } } };
    const doc = { type: 'veiculo', documentName, toObject: () => structuredClone(fonte), updateSource: mudancas => mesclar(fonte, mudancas) };
    e.api.limparVinculosCopiados(doc, {});
    assert.equal(fonte.flags[SISTEMA][chave], undefined);
    assert.equal(fonte.flags[SISTEMA].outra, true);
  }
}));

test('C46.2 aplicação: o token do ligado conserva actorLink mesmo no arrasto e na edição à mão; NPC pode ser solto', async () => ambiente(async e => {
  e.api.registrarVinculoVeiculo();
  const token = { actorId: e.espelho.id, actorLink: false, updateSource: mudancas => mesclar(token, mudancas) };
  for (const tratar of e.ganchos.preCreateToken) tratar(token);
  assert.equal(token.actorLink, true);
  const mudancas = { actorLink: false };
  for (const tratar of e.ganchos.preUpdateToken) tratar(token, mudancas);
  assert.equal(mudancas.actorLink, true);
  const tokenNPC = { actorId: 'npc', actorLink: false };
  for (const actorLink of [false, undefined]) {
    const entrando = { actorId: e.espelho.id, ...(actorLink === undefined ? {} : { actorLink }) };
    for (const tratar of e.ganchos.preUpdateToken) tratar(tokenNPC, entrando);
    assert.equal(entrando.actorLink, true, 'Trocar o ator do token para o veículo ligado força a ligação');
  }
  const saindo = { actorId: 'npc', actorLink: false };
  for (const tratar of e.ganchos.preUpdateToken) tratar(token, saindo);
  assert.equal(saindo.actorLink, false, 'Trocar o ator do token para NPC permite o estado solto');
  await e.item.unsetFlag(SISTEMA, 'veiculoAtor');
  const npc = { actorLink: false };
  for (const tratar of e.ganchos.preUpdateToken) tratar(token, npc);
  assert.equal(npc.actorLink, false);
}));

test('C46.2 aplicação: dano pelo ocupante e no ator usam a mesma fila e o SDP do item, mesmo com o espelho atrasado', async () => ambiente(async e => {
  // A conta do C15 (regras-veiculos.mjs:27-35): 24 − SP13 = 11; depois da AP, 24 − SP11 = 13; sem +5 ou lesão.
  await e.item.update({ 'system.sdp.value': 43, 'system.ablacao': 0 });
  await e.espelho.update({ 'system.sdp.value': 43, 'system.ablacao': 0 });
  const [ocupante, direto] = await Promise.all([
    receberDanoVeicular(e.item, { dano: 24, ablacao: 2 }),
    receberDanoVeicular(e.espelho, { dano: 24, ablacao: 2 })
  ]);
  assert.equal(ocupante.antes, 43);
  assert.equal(ocupante.depois, 32);
  assert.equal(direto.antes, 32);
  assert.equal(direto.depois, 19);
  assert.equal(direto.sp, 11);
  assert.equal(direto.veiculo, e.espelho.uuid);
  assert.equal(e.item.system.sdp.value, 19);
  assert.equal(e.item.system.ablacao, 4);
  assert.equal(e.espelho.system.sdp.value, 19);
  await receberDanoVeicular(e.item, { dano: 10 });
  assert.equal(e.item.system.sdp.value, 18);
  assert.equal(e.espelho.system.sdp.value, 19, 'O espelho ainda não recebeu o dano posterior do item');
  await desfazerDanoVeicular(e.espelho, direto);
  assert.equal(e.item.system.sdp.value, 31, 'Desfaz só os 13 do ataque direto, conservando o dano posterior');
  assert.equal(e.item.system.ablacao, 3);
  assert.equal(e.espelho.system.sdp.value, 31);
}));

test('C46.2 aplicação: dryRun valida o lote sem gravar; o pós-update real encaminha o estado ao item e sincroniza', async () => ambiente(async e => {
  e.api.registrarVinculoVeiculo();
  globalThis.game.user = e.jogador;
  const mudancas = { 'system.sdp.value': 35, 'system.sdp.max': 80, 'system.assentos': 8, 'system.ablacao': 3 };
  const antes = structuredClone(mudancas), estadoAntes = structuredClone(e.item._source.system), opcoes = { dryRun: true };
  assert.equal(await e.api.gravarNoItemDoVeiculo(e.espelho, mudancas, opcoes, e.jogador), true);
  assert.deepEqual(mudancas, antes, 'A validação do Foundry conserva as mudanças originais do lote');
  assert.equal(e.item.updates.length, 0);
  assert.equal(e.espelho.updates.length, 0);
  assert.deepEqual(e.item._source.system, estadoAntes);
  assert.ok(opcoes.cprfVeiculoPendente[e.espelho.id]);
  await e.espelho.update(mudancas);
  globalThis.game.user = e.gm;
  for (const tratar of e.ganchos.updateActor) await tratar(e.espelho, mudancas, { cprfVeiculoPendente: opcoes.cprfVeiculoPendente }, e.jogador.id);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e.item._source.system.sdp.value, 35);
  assert.equal(e.item._source.system.sdp.max, 60);
  assert.equal(e.item._source.system.assentos, 6);
  assert.equal(e.item._source.system.ablacao, 3);
  assert.deepEqual(e.espelho.system.sdp, { value: 35, max: 80 });
  assert.equal(e.espelho.system.assentos, 8);
}));

test('C46.2 aplicação: o veículo conserva a imagem do item e recusa as poses e o botão do C45', async () => ambiente(async e => {
  const dinamico = await import('../../foundry-sistema/scripts/token-dinamico.mjs');
  e.espelho.flags[SISTEMA].tokenDinamico = { ativo: true, imagens: { 'parado-0': 'pose.webp' }, base: 'base.webp' };
  const token = { actor: e.espelho, actorId: e.espelho.id, rotation: 0, texture: { src: e.item.img } };
  assert.equal(dinamico.imagemPara(token), null);
  assert.deepEqual(await dinamico.aplicarNoAtor(e.espelho), []);
  assert.equal(dinamico.abrirTokenDinamico(e.espelho), null);
  assert.equal(await dinamico.salvarConjunto(e.espelho, { ativo: true, imagens: { 'parado-0': 'nova.webp' } }), null);
  assert.equal(e.espelho.updates.length, 0);
  globalThis.HTMLElement = class {};
  const botoes = [], coluna = { querySelector: () => null, append: botao => botoes.push(botao) };
  globalThis.document = { createElement: () => ({ dataset: {}, addEventListener() {} }) };
  const elemento = new globalThis.HTMLElement(); elemento.querySelector = () => coluna;
  dinamico.registrarTokenDinamico();
  for (const tratar of e.ganchos.renderTokenHUD) tratar({ document: token }, elemento);
  assert.equal(botoes.length, 0);
  assert.equal(token.texture.src, e.item.img);
}));
