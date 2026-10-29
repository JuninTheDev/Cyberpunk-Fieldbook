// C46.2, decisão da mesa: o item é o estado; o ator é seu espelho persistido, atualizado pelo mestre ativo.
// CORE 0.92.4, modules/item/types/cpr-vehicle.js:7: o veículo continua sendo item; não há migração nem cópia dos upgrades.
import { SISTEMA } from './config.mjs';
import { alteracoesDoVeiculoNoItem, estadoDoItemVeiculo, vinculoVeicularValido } from './regras-vinculo-veiculo.mjs';

const CANAL = `system.${SISTEMA}`;
const PASTA = 'Veículos dos personagens';
const filas = new Map(), esperando = new Map();
const mestreAtivo = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const marcaDoAtor = ator => ator?.getFlag(SISTEMA, 'veiculoItem');
const erroDoVinculo = erro => console.error(`${SISTEMA} | veículo ligado`, erro);

function naFila(chave, tarefa) {
  const atual = (filas.get(chave) ?? Promise.resolve()).then(tarefa, tarefa);
  filas.set(chave, atual);
  void atual.finally(() => { if (filas.get(chave) === atual) filas.delete(chave); }).catch(() => {});
  return atual;
}

// Os dois documentos e o dono precisam concordar. Uma cópia ou um crossover não pode apontar para a frota anterior.
export function itemDoVeiculo(ator) {
  const marca = marcaDoAtor(ator);
  const item = marca ? game.actors.get(marca.atorId)?.items.get(marca.itemId) : null;
  return vinculoVeicularValido(ator, item) ? item : null;
}

export function atorDoItem(item) {
  const ator = game.actors.get(item?.getFlag(SISTEMA, 'veiculoAtor'));
  return vinculoVeicularValido(ator, item) ? ator : null;
}

const estadoDo = item => estadoDoItemVeiculo(item, item.parent.items);
const achatado = dados => foundry.utils.flattenObject(dados);

// Chamado pelo _preUpdate do ator, que o Foundry 14 aguarda (client/data/client-backend.mjs:238-250), inclusive em lote.
// A gravação no item termina antes do dano/Desfazer devolver. A cópia no ator nunca volta a gravar no item.
export async function gravarNoItemDoVeiculo(ator, mudancas, opcoes, usuario) {
  if (ator.type !== 'veiculo' || opcoes.cprfEspelhoVeiculo) return true;
  const item = itemDoVeiculo(ator);
  if (!item) return true;
  // O Foundry também usa dryRun para validar modifyBatch (client/data/client-backend.mjs:500-543).
  // Nada se grava nessa fase; se houver lote real, o pós-update do mestre encaminha a alteração validada.
  if (opcoes.dryRun) {
    opcoes.cprfVeiculoPendente ??= {};
    opcoes.cprfVeiculoPendente[ator.id] = foundry.utils.deepClone(mudancas);
    return true;
  }
  const escritas = alteracoesDoVeiculoNoItem(item, item.parent.items, mudancas);
  if (Object.keys(escritas).length) {
    if (!ator.canUserModify(usuario, 'update') || !item.canUserModify(usuario, 'update')) {
      ui.notifications.warn('Você precisa ser dono do personagem para mudar o veículo ligado a ele.');
      return false;
    }
    await item.update(escritas);
    // O item pode sair da ficha durante a espera. Não grave uma edição pendente em outro vínculo.
    if (itemDoVeiculo(ator) !== item) return false;
    const fonte = achatado(item.toObject());
    if (Object.entries(escritas).some(([chave, valor]) => fonte[chave] !== valor)) return false;
  }
  // Conserva as notas e as outras opções próprias do ator; os campos compartilhados vêm sempre do item de agora.
  for (const [chave, valor] of Object.entries(achatado(estadoDo(item)))) {
    if (chave.includes('.')) delete mudancas[chave];
    foundry.utils.setProperty(mudancas, chave, valor);
  }
  return true;
}

async function copiarEstado(ator, dados, dono = null) {
  const mudancas = achatado(dados);
  const fonte = achatado(ator.toObject());
  for (const chave of Object.keys(mudancas)) if (mudancas[chave] === fonte[chave]) delete mudancas[chave];
  if (dono && JSON.stringify(ator.toObject().ownership) !== JSON.stringify(dono.toObject().ownership)) {
    // Substituir também retira um dono antigo, como a posse do personagem depois do crossover.
    mudancas.ownership = foundry.data.operators.ForcedReplacement.create(dono.toObject().ownership);
  }
  if (Object.keys(mudancas).length) await ator.update(mudancas, { cprfEspelhoVeiculo: true });
  const prototipo = {};
  if (ator.prototypeToken.name !== dados.name) prototipo.name = dados.name;
  if (ator.prototypeToken.texture.src !== dados.img) prototipo['texture.src'] = dados.img;
  if (dono && !ator.prototypeToken.actorLink) prototipo.actorLink = true;
  if (Object.keys(prototipo).length) await ator.update({ prototypeToken: prototipo }, { cprfEspelhoVeiculo: true });
  // Como os tokens dinâmicos, só documentos concretos do mundo; a imagem do veículo vem do item, não das poses C45.
  for (const cena of game.scenes) {
    const tokens = cena.tokens.filter(token => token.actorId === ator.id && (dono || token.actorLink));
    const atualizacoes = tokens.map(token => ({ _id: token.id,
      ...(token.name !== dados.name ? { name: dados.name } : {}),
      ...(dono && !token.actorLink ? { actorLink: true } : {}),
      ...(token.texture.src !== dados.img ? { 'texture.src': dados.img } : {})
    })).filter(dados => Object.keys(dados).length > 1);
    if (atualizacoes.length) await cena.updateEmbeddedDocuments('Token', atualizacoes);
  }
}

export function sincronizarVeiculo(ator) {
  if (!mestreAtivo() || !ator || ator.isToken) return Promise.resolve(null);
  return naFila(`espelho:${ator.id}`, async () => {
    if (game.actors.get(ator.id) !== ator) return null;
    const item = itemDoVeiculo(ator);
    if (!item) return null;
    await copiarEstado(ator, estadoDo(item), item.parent);
    return ator;
  });
}

function itemAtual(atorId, itemId, usuario) {
  const dono = game.actors.get(atorId), item = dono?.items.get(itemId);
  return dono?.type === 'personagem' && !dono.isToken && !dono.getFlag(SISTEMA, 'saiu') && item?.type === 'veiculo'
    && usuario?.active && dono.testUserPermission(usuario, 'OWNER') ? item : null;
}

function cenaDoPedido(id, usuario) {
  const cena = game.scenes.get(id);
  return cena && (usuario.isGM || cena.active || cena.testUserPermission(usuario, 'OBSERVER')) ? cena : null;
}

function posicaoNaCena(cena, dono, centro) {
  const tamanho = cena.grid.size || 100;
  const pessoa = cena.tokens.find(token => token.actorId === dono.id);
  const x = pessoa ? pessoa._source.x + pessoa.width * tamanho : Number(centro?.x) - tamanho;
  const y = pessoa ? pessoa._source.y : Number(centro?.y) - tamanho;
  const largura = cena.dimensions?.width ?? cena.width, altura = cena.dimensions?.height ?? cena.height;
  return {
    x: Math.max(0, Math.min(largura - 2 * tamanho, Number.isFinite(x) ? x : largura / 2 - tamanho)),
    y: Math.max(0, Math.min(altura - 2 * tamanho, Number.isFinite(y) ? y : altura / 2 - tamanho)),
    elevation: pessoa?.elevation ?? 0, disposition: pessoa?.disposition
  };
}

async function porNaCenaDoMestre(pedido, usuario) {
  // Uma fila para a criação: além do clique duplo, dois pedidos não criam duas pastas nem dois atores para o item.
  return naFila('criar', async () => {
    const reler = () => itemAtual(pedido.atorId, pedido.itemId, usuario);
    let item = reler(), cena = cenaDoPedido(pedido.sceneId, usuario);
    if (!game.user.isGM || !item || !cena) return { erro: 'O veículo, a cena ou a permissão mudou. Abra a ficha e tente de novo.' };
    let ator = atorDoItem(item);
    if (!ator) {
      const pasta = game.folders.find(pasta => pasta.type === 'Actor' && pasta.name === PASTA)
        ?? await CONFIG.Folder.documentClass.create({ name: PASTA, type: 'Actor' });
      item = reler(); cena = cenaDoPedido(pedido.sceneId, usuario);
      if (!pasta || !item || !cena) return { erro: 'O veículo, a cena ou a permissão mudou. Tente de novo.' };
      const estado = estadoDo(item);
      ator = await Actor.implementation.create({ ...estado, type: 'veiculo', folder: pasta.id,
        ownership: item.parent.toObject().ownership,
        flags: { [SISTEMA]: { veiculoItem: { atorId: item.parent.id, itemId: item.id } } },
        prototypeToken: { actorLink: true, name: estado.name, texture: { src: estado.img }, width: 2, height: 2, bar1: { attribute: 'sdp' } }
      }, { cprfCriarVeiculoLigado: true });
      if (!ator) return { erro: 'O Foundry não criou o ator do veículo.' };
      item = reler(); cena = cenaDoPedido(pedido.sceneId, usuario);
      if (!item || !cena) { await ator.delete(); return { erro: 'O veículo, a cena ou a permissão mudou. Tente de novo.' }; }
      try {
        await item.setFlag(SISTEMA, 'veiculoAtor', ator.id);
        if (atorDoItem(item) !== ator) throw new Error('O Foundry não confirmou a ligação do veículo.');
      } catch (erro) { await ator.delete(); throw erro; }
    }
    await copiarEstado(ator, estadoDo(item), item.parent);
    item = reler(); cena = cenaDoPedido(pedido.sceneId, usuario);
    if (!item || !cena || atorDoItem(item) !== ator) return { erro: 'O veículo, a cena ou a permissão mudou. Tente de novo.' };
    let token = cena.tokens.find(token => token.actorId === ator.id);
    if (!token) {
      // Foundry 14, client/documents/actor.mjs:337-373: o parent explícito é a cena vista pelo solicitante.
      const dados = await ator.getTokenDocument({ name: ator.name, texture: { src: ator.img }, actorLink: true,
        ...posicaoNaCena(cena, item.parent, pedido.centro) }, { parent: cena });
      item = reler(); cena = cenaDoPedido(pedido.sceneId, usuario);
      if (!item || !cena || atorDoItem(item) !== ator) return { erro: 'O veículo ou a cena mudou antes de criar o token.' };
      [token] = await cena.createEmbeddedDocuments('Token', [dados.toObject()]);
    }
    return token ? { atorId: ator.id, tokenId: token.id, sceneId: cena.id } : { erro: 'O Foundry não criou o token do veículo.' };
  });
}

export async function porVeiculoNaCena(item, { sceneId = canvas?.scene?.id, centro = canvas?.scene?._viewPosition } = {}) {
  if (!itemAtual(item?.parent?.id, item?.id, game.user)) return null;
  if (!sceneId) { ui.notifications.warn('Abra uma cena para pôr o veículo nela.'); return null; }
  if (!game.users.activeGM) { ui.notifications.warn('Sem mestre ativo na mesa para pôr o veículo na cena.'); return null; }
  const pedido = { atorId: item.parent.id, itemId: item.id, sceneId, centro };
  let resposta;
  if (mestreAtivo()) resposta = await porNaCenaDoMestre(pedido, game.user);
  else {
    const id = foundry.utils.randomID();
    resposta = await new Promise(resolve => {
      const relogio = setTimeout(() => { esperando.delete(id); resolve({ erro: 'O mestre não respondeu ao pedido do veículo. Tente de novo.' }); }, 15000);
      esperando.set(id, { mestre: game.users.activeGM.id, resolver: resposta => { clearTimeout(relogio); esperando.delete(id); resolve(resposta); } });
      game.socket.emit(CANAL, { tipo: 'veiculoNaCena', id, de: game.user.id, pedido });
    });
  }
  if (resposta?.erro) { ui.notifications.warn(resposta.erro); return null; }
  return resposta ?? null;
}

// Copiar o personagem, arrastar o item ou importar o crossover sempre cria uma posse nova, sem herdar o ator anterior.
export function limparVinculosCopiados(documento, opcoes) {
  if (documento.type === 'veiculo' && documento.documentName === 'Actor' && !opcoes.cprfCriarVeiculoLigado) {
    documento.updateSource({ [`flags.${SISTEMA}.veiculoItem`]: new foundry.data.operators.ForcedDeletion() });
  }
  if (documento.documentName === 'Actor') {
    const itens = documento.toObject().items;
    if (itens?.some(item => item.flags?.[SISTEMA]?.veiculoAtor)) {
      for (const item of itens) if (item.flags?.[SISTEMA]) delete item.flags[SISTEMA].veiculoAtor;
      documento.updateSource({ items: foundry.data.operators.ForcedReplacement.create(itens) });
    }
  } else if (documento.type === 'veiculo') documento.updateSource({ [`flags.${SISTEMA}.veiculoAtor`]: new foundry.data.operators.ForcedDeletion() });
}

async function deixarComoNPC(ator, estado = null) {
  if (!game.actors.has(ator.id) || !marcaDoAtor(ator)) return;
  if (estado) await copiarEstado(ator, estado);
  await ator.update({ [`flags.${SISTEMA}.veiculoItem`]: new foundry.data.operators.ForcedDeletion(), 'prototypeToken.actorLink': false }, { cprfEspelhoVeiculo: true });
  for (const cena of game.scenes) {
    const tokens = cena.tokens.filter(token => token.actorId === ator.id && token.actorLink);
    if (tokens.length) await cena.updateEmbeddedDocuments('Token', tokens.map(token => ({ _id: token.id, actorLink: false })));
  }
  ui.notifications.info(`${ator.name}: o item ou o personagem saiu; o veículo ficou como NPC com o último estado.`);
}

function guardarVeiculos(documento, opcoes) {
  const itens = documento.documentName === 'Actor' ? documento.items : [documento];
  opcoes.cprfVeiculosApagados ??= {};
  for (const item of itens) {
    const ator = atorDoItem(item);
    if (ator) opcoes.cprfVeiculosApagados[ator.id] = estadoDo(item);
  }
}

function agendarDono(dono) {
  if (!mestreAtivo() || dono?.isToken || dono?.type !== 'personagem') return;
  for (const item of dono.items) {
    const ator = atorDoItem(item);
    if (!ator) continue;
    if (dono.getFlag(SISTEMA, 'saiu')) {
      naFila(`espelho:${ator.id}`, async () => {
        await deixarComoNPC(ator, estadoDo(item));
        await item.unsetFlag(SISTEMA, 'veiculoAtor');
      }).catch(erroDoVinculo);
    } else sincronizarVeiculo(ator).catch(erroDoVinculo);
  }
}

export function registrarVinculoVeiculo() {
  // O item continua sendo o estado mesmo quando alguém arrasta o ator e pede um token solto.
  Hooks.on('preCreateToken', token => {
    if (itemDoVeiculo(game.actors.get(token.actorId))) token.updateSource({ actorLink: true });
  });
  Hooks.on('preUpdateToken', (token, mudancas) => {
    if (itemDoVeiculo(game.actors.get(mudancas.actorId ?? token.actorId))) mudancas.actorLink = true;
  });
  for (const gancho of ['createItem', 'updateItem', 'deleteItem']) Hooks.on(gancho, item => agendarDono(item.parent));
  Hooks.on('updateActor', (ator, mudancas, opcoes, usuarioId) => {
    if (!mestreAtivo() || opcoes.cprfEspelhoVeiculo) return;
    if (ator.type === 'personagem') agendarDono(ator);
    else if (marcaDoAtor(ator)) {
      const pendente = opcoes.cprfVeiculoPendente?.[ator.id];
      if (!pendente) sincronizarVeiculo(ator).catch(erroDoVinculo);
      else naFila(`espelho:${ator.id}`, async () => {
        await gravarNoItemDoVeiculo(ator, pendente, {}, game.users.get(usuarioId));
        const item = itemDoVeiculo(ator);
        if (item) await copiarEstado(ator, estadoDo(item), item.parent);
      }).catch(erroDoVinculo);
    }
  });
  // Guarda os números antes da remoção, inclusive quando upgrades e veículo saem no mesmo lote.
  Hooks.on('preDeleteItem', guardarVeiculos);
  Hooks.on('preDeleteActor', guardarVeiculos);
  Hooks.on('deleteItem', (item, opcoes) => {
    if (!mestreAtivo()) return;
    const ator = game.actors.get(item.getFlag(SISTEMA, 'veiculoAtor'));
    const marca = marcaDoAtor(ator);
    if (marca?.atorId === item.parent?.id && marca.itemId === item.id) {
      naFila(`espelho:${ator.id}`, () => deixarComoNPC(ator, opcoes.cprfVeiculosApagados?.[ator.id] ?? estadoDo(item))).catch(erroDoVinculo);
    }
  });
  Hooks.on('deleteActor', (ator, opcoes) => {
    if (!mestreAtivo()) return;
    const item = itemDoVeiculo(ator);
    if (item) item.unsetFlag(SISTEMA, 'veiculoAtor').catch(erroDoVinculo);
    for (const [id, estado] of Object.entries(opcoes.cprfVeiculosApagados ?? {})) {
      const veiculo = game.actors.get(id);
      if (marcaDoAtor(veiculo)?.atorId === ator.id) naFila(`espelho:${id}`, () => deixarComoNPC(veiculo, estado)).catch(erroDoVinculo);
    }
  });
  Hooks.once('ready', () => {
    game.socket.on(CANAL, async mensagem => {
      if (mensagem.tipo === 'veiculoNaCena' && mestreAtivo()) {
        const resposta = await porNaCenaDoMestre(mensagem.pedido ?? {}, game.users.get(mensagem.de)).catch(erro => ({ erro: erro.message }));
        game.socket.emit(CANAL, { tipo: 'veiculoNaCenaResposta', id: mensagem.id, para: mensagem.de, de: game.user.id, resposta });
      } else if (mensagem.tipo === 'veiculoNaCenaResposta' && mensagem.para === game.user.id) {
        const espera = esperando.get(mensagem.id);
        if (espera?.mestre === mensagem.de) espera.resolver(mensagem.resposta);
      }
    });
    if (!mestreAtivo()) return;
    for (const ator of game.actors) {
      if (!marcaDoAtor(ator)) continue;
      if (itemDoVeiculo(ator)) sincronizarVeiculo(ator).catch(erroDoVinculo);
      else deixarComoNPC(ator).catch(erroDoVinculo);
    }
  });
}

