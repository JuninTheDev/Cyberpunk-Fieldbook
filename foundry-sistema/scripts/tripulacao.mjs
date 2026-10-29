// C46.3: a tripulação pertence ao token, inclusive nos veículos soltos de NPC.
// M17 do master, Tabletop/README.md:104-111 e mesa-api.js:1302-1342. O mestre ativo grava e relê os pedidos na fila.
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { motivoEmbarque, ordemMotorista, posicaoEmbarcada, posicoesDeSaida, veiculoDaDirecao } from './regras-tripulacao.mjs';
import { atorDoItem, itemDoVeiculo } from './vinculo-veiculo.mjs';
import { usarVeiculo, dirigirVeiculo, veiculoDirigido } from './veiculos.mjs';

const CANAL = `system.${SISTEMA}`;
const filas = new Map(), esperando = new Map(), pendentes = new Set();
const mestreAtivo = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const marca = token => token?.getFlag?.(SISTEMA, 'embarcado');
const tripulantes = token => token?.getFlag?.(SISTEMA, 'tripulacao') ?? [];
const dados = token => token?._source ?? token;
const atual = token => token?.parent?.tokens.get(token.id);
const pessoa = token => ['personagem', 'capanga'].includes(token?.actor?.type);
const dono = (token, usuario) => Boolean(usuario?.isGM || token?.actor?.testUserPermission(usuario, 'OWNER'));
const erro = e => console.error(`${SISTEMA} | tripulação`, e);
const acompanhar = promessa => {
  pendentes.add(promessa);
  void promessa.finally(() => pendentes.delete(promessa)).catch(erro);
  return promessa;
};

function naFila(cena, tarefa) {
  const chave = cena.id;
  const proxima = (filas.get(chave) ?? Promise.resolve()).then(tarefa, tarefa);
  filas.set(chave, proxima);
  void proxima.finally(() => { if (filas.get(chave) === proxima) filas.delete(chave); }).catch(() => {});
  return acompanhar(proxima);
}

export async function esperarTripulacao() {
  while (pendentes.size) await Promise.allSettled([...pendentes]);
}

export function veiculoDaTripulacao(token) {
  const veiculo = token?.parent?.tokens?.get(marca(token)?.veiculoId);
  return veiculo?.actor?.type === 'veiculo' && tripulantes(veiculo).includes(token.id) ? veiculo : null;
}

// A proteção é a do veículo desta cena. Fora dele, preserva a seleção legada do C15 na ficha da pessoa.
export function protecaoDoOcupante(token) {
  const veiculo = veiculoDaTripulacao(token);
  return veiculo ? itemDoVeiculo(veiculo.actor) ?? veiculo.actor : token?.actor?.veiculoAtivo ?? null;
}

// ---------------- O resto pelo ator (o C46, parte 4) ----------------
// O estado do veículo de um token: no ligado, o item (a parte 2); no de NPC, o ator do token.
export const estadoDoVeiculo = veiculo => (veiculo ? itemDoVeiculo(veiculo.actor) ?? veiculo.actor ?? null : null);

// O token da pessoa: o pedido, se é dela; sem ele, o do ator sintético ou o dela na cena vista ou na ativa (o embarcado
// primeiro). Fora do Foundry (os testes de regras), nenhum.
export function tokenDaPessoa(ator, token = null) {
  token = token?.document ?? token;
  if (token) return ator && token.actor?.uuid === ator.uuid ? token : null;
  if (!ator) return null;
  if (ator.token) return ator.token;
  const cenas = [globalThis.canvas?.scene, globalThis.game?.scenes?.active].filter(Boolean);
  const dela = cenas.flatMap(cena => cena.tokens.filter(t => t.actorLink && t.actorId === ator.id));
  return dela.find(t => veiculoDaTripulacao(t)) ?? dela[0] ?? null;
}

// O token de veículo em que a pessoa é o motorista (o primeiro da tripulação), ou null.
export function veiculoQueDirige(ator, token = null) {
  const daPessoa = tokenDaPessoa(ator, token), dentro = veiculoDaTripulacao(daPessoa);
  return dentro && tripulantes(dentro)[0] === daPessoa.id ? dentro : null;
}

// O veículo da arma ou do C40 tem token na cena?
const temTokenNaCena = (item, cena) => {
  const ligado = item ? atorDoItem(item) : null;
  return Boolean(ligado && cena?.tokens?.some(token => token.actorId === ligado.id));
};

// O veículo que o ator dirige agora (regras-tripulacao.veiculoDaDirecao), para a direção sob pressão, as manobras e a
// batida do C40: o do token de veículo em que ele é o motorista, também o de NPC ou o de outro dono (o estado: o item no
// ligado, o ator no de NPC); dentro como passageiro, nenhum; fora, o do C40 (o item em uso com "Dirigindo"), se esse
// veículo não tem token na cena dele. token: o da pessoa (o do combatente, o do HUD). Devolve o veículo, ou null.
export function veiculoDirigidoPor(ator, token = null) {
  const daPessoa = tokenDaPessoa(ator, token), dentro = veiculoDaTripulacao(daPessoa);
  const doC40 = ator?.items ? veiculoDirigido(ator) : null;
  return veiculoDaDirecao({ tokenId: daPessoa?.id ?? null, dentro: dentro && { ocupantes: tripulantes(dentro), veiculo: estadoDoVeiculo(dentro) },
    proprio: doC40, proprioNaCena: temTokenNaCena(doC40, daPessoa?.parent) });
}

// O assento de quem dispara a arma montada no veículo (regras-tripulacao.motivoDoAssento; veiculos.motivoVeicular confere):
// atirador, quem ataca (o dono ou o motorista); token, o dele. A arma fora de um veículo do C15 (a do cyberware, a solta):
// null.
export function assentoDaArma(arma, atirador = arma?.actor, token = null) {
  const item = arma?.actor?.items?.get(arma.system?.instaladoEm);
  if (item?.type !== 'veiculo') return null;
  const daPessoa = tokenDaPessoa(atirador, token), dentro = veiculoDaTripulacao(daPessoa);
  return { dentro: Boolean(dentro), motorista: Boolean(dentro) && tripulantes(dentro)[0] === daPessoa.id,
    doVeiculo: Boolean(dentro) && itemDoVeiculo(dentro.actor) === item, naCena: temTokenNaCena(item, daPessoa?.parent),
    dono: atirador?.uuid === arma.actor.uuid, emUso: arma.actor.veiculoAtivo?.id === item.id };
}

// As armas montadas no veículo de um token: no ligado, as do item (as do C15, na ficha do dono); o de NPC não tem itens.
export function armasDoVeiculo(veiculo) {
  const item = itemDoVeiculo(veiculo?.actor);
  return item ? item.parent.items.filter(arma => arma.type === 'arma' && arma.system.instaladoEm === item.id) : [];
}

// O motorista dispara uma arma montada do veículo em que está, também a de outro dono (a API e o botão do HUD). O ataque
// é o do combate.mjs, com quem atira e o token dele (a origem: dentro, o token fica no centro do veículo); o assento, o
// pente e o resto se conferem lá e no mestre.
export function atacarDoAssento(token, arma, opcoes = {}) {
  token = atual(token?.document ?? token);
  if (!token || !dono(token, game.user)) { ui.notifications.warn('Esse token não é seu.'); return null; }
  if (arma?.type !== 'arma') { ui.notifications.warn('Escolha uma arma montada do veículo.'); return null; }
  return arma.atacar({ ...opcoes, atirador: token.actor, tokenAtirador: token });
}

const centro = (token, grade) => ({ x: dados(token).x + dados(token).width * grade / 2, y: dados(token).y + dados(token).height * grade / 2, elevation: dados(token).elevation ?? 0 });
const daBorda = (ponto, veiculo) => {
  const g = veiculo.parent.grid.size, v = dados(veiculo);
  const c = centro(veiculo, g);
  // M17, mesa-api.js:1312-1313: raio de metade do veículo + 2 quadrados. Retangular usa o lado maior.
  return Math.max(0, Math.hypot(ponto.x - c.x, ponto.y - c.y) / g - Math.max(v.width, v.height) / 2);
};
const parede = (origem, destino, tipo = 'move', token = null) => {
  // Token#checkCollision (client/canvas/placeables/token.mjs:2761-2770): use o nível da cena, também fora do canvas.
  const level = token?.parent?.levels?.get(dados(token).level);
  if (token?.parent?.levels && !level) return false;
  return Boolean(CONFIG.Canvas.polygonBackends[tipo].testCollision(origem, destino, { type: tipo, mode: 'any', ...(level ? { level } : {}) }));
};

function visivelPara(veiculo, usuario) {
  if (usuario.isGM) return true;
  const secreto = dados(veiculo).disposition === CONST.TOKEN_DISPOSITIONS.SECRET && !veiculo.testUserPermission(usuario, 'OBSERVER');
  if (veiculo.hidden || secreto || !veiculo.parent.active) return false;
  if (usuario.id === game.user.id) return Boolean(veiculo.object?.isVisible);
  if (!veiculo.parent.tokenVision) return true;
  if (canvas.scene?.id !== veiculo.parent.id) return false;
  // O GM não tem as fontes dos tokens que não controla (Token#_isVisionSource, client/canvas/placeables/token.mjs:995).
  // Uma fonte temporária, sem add(), testa os modos reais e a luz sem mudar a visão do mestre.
  // Foundry 14: token.mjs:917-923,1331-1332; canvas/groups/visibility.mjs:869-901,917-948.
  const config = canvas.visibility._createVisibilityTestConfig(veiculo.getVisibilityTestPoints(), { tolerance: 0, object: veiculo.object });
  return veiculo.parent.tokens.some(token => {
    if (!dono(token, usuario) || token.hidden || !token.sight?.enabled || !token.object) return false;
    const fonte = new CONFIG.Canvas.visionSourceClass({ sourceId: `${SISTEMA}.tripulacao.${token.id}`, object: token.object });
    try {
      Object.assign(fonte.blinded, token.object._getVisionBlindedStates());
      fonte.initialize(token.object._getVisionSourceData());
      return Object.entries(token.detectionModes).some(([id, modo]) => CONFIG.Canvas.detectionModes[id]?.testVisibility(fonte, modo, config));
    } finally { fonte.destroy(); }
  });
}

function motorista(veiculo, usuario) {
  return dono(veiculo.parent.tokens.get(tripulantes(veiculo)[0]), usuario);
}

// Foundry 14, client/documents/token.mjs:696 e client/config.mjs:2439-2451: displace não cobra movimento nem cruza
// novamente as paredes; só o veículo faz o trajeto. A textura e lockRotation continuam sendo do C45.
async function deslocar(token, alteracoes) {
  return token.move({ ...alteracoes, action: 'displace' }, { cprfTripulacao: true, animate: false,
    autoRotate: false, showRuler: false, constrainOptions: { ignoreWalls: true, ignoreCost: true } });
}

async function atualizarMotorista(veiculo, anterior) {
  const item = itemDoVeiculo(veiculo.actor);
  if (!item) return;
  const proximo = veiculo.parent.tokens.get(tripulantes(veiculo)[0]);
  if (anterior?.actor?.uuid === item.parent.uuid && anterior.id !== proximo?.id && anterior.actor.system.veiculo === item.id) {
    await dirigirVeiculo(anterior.actor, false);
  }
  if (proximo?.actor?.uuid === item.parent.uuid) {
    if (proximo.actor.system.veiculo !== item.id) await usarVeiculo(proximo.actor, item.id);
    await dirigirVeiculo(proximo.actor, true);
  }
}

async function levarOcupantes(veiculo) {
  for (const [indice, id] of tripulantes(veiculo).entries()) {
    const token = veiculo.parent.tokens.get(id), registro = marca(token);
    if (registro?.veiculoId !== veiculo.id) continue;
    await deslocar(token, posicaoEmbarcada(dados(veiculo), registro.original, veiculo.parent.grid.size, indice));
  }
}

function lugarLivre(cena, veiculo, token, original, posicao) {
  const g = cena.grid.size;
  const area = cena.dimensions?.sceneRect ?? { x: 0, y: 0, width: cena.width, height: cena.height };
  const w = original.width * g, h = original.height * g;
  if (posicao.x < area.x || posicao.y < area.y || posicao.x + w > area.x + area.width || posicao.y + h > area.y + area.height) return false;
  if (cena.tokens.some(outro => {
    if (outro.id === token.id) return false;
    const o = dados(outro);
    return posicao.x < o.x + o.width * g && posicao.x + w > o.x && posicao.y < o.y + o.height * g && posicao.y + h > o.y;
  })) return false;
  return !parede(centro(veiculo, g), { x: posicao.x + w / 2, y: posicao.y + h / 2, elevation: dados(veiculo).elevation ?? 0 }, 'move', token);
}

async function sair(token, veiculo, posicao = null) {
  const registro = marca(token);
  if (!registro) return { erro: 'Esse token não está num veículo.' };
  const original = registro.original, cena = token.parent, g = cena.grid.size;
  // Se o veículo saiu sem mestre, a posição atual do ocupante conserva o centro e permite reparar na entrada.
  veiculo ??= { id: registro.veiculoId, parent: cena, ...centro(token, g), width: registro.larguraVeiculo, height: registro.alturaVeiculo };
  if (!veiculo._source) {
    veiculo.x -= veiculo.width * g / 2;
    veiculo.y -= veiculo.height * g / 2;
  }
  const candidatos = posicao ? [posicao] : posicoesDeSaida(dados(veiculo), original, g);
  let lugar = candidatos.find(p => daBorda({ x: p.x + original.width * g / 2, y: p.y + original.height * g / 2 }, veiculo) <= 2
    && lugarLivre(cena, veiculo, token, original, p));
  if (!lugar && !atual(veiculo)) {
    // M17, mesa-api.js:705: sem saída livre, conserva o centro do veículo retirado; nunca deixa a marca órfã.
    const c = centro(veiculo, g);
    lugar = { x: c.x - original.width * g / 2, y: c.y - original.height * g / 2 };
    ui.notifications.info(`${token.name}: sem lugar livre ao lado; ficou no lugar do veículo retirado.`);
  }
  if (!lugar) return { erro: 'Escolha um lugar livre perto do veículo, sem atravessar paredes.' };
  const anterior = cena.tokens.get(tripulantes(veiculo)[0]);
  await deslocar(token, { ...original, ...lugar, [`flags.${SISTEMA}.embarcado`]: new foundry.data.operators.ForcedDeletion() });
  if (marca(token)) return { erro: 'O Foundry não confirmou a saída do veículo.' };
  if (atual(veiculo)) {
    await veiculo.setFlag(SISTEMA, 'tripulacao', tripulantes(veiculo).filter(id => id !== token.id));
    await atualizarMotorista(veiculo, anterior);
    await levarOcupantes(veiculo);
  } else {
    const item = itemDoVeiculo(veiculo.actor);
    if (anterior?.id === token.id && item?.parent.uuid === token.actor?.uuid && token.actor.system.veiculo === item.id) await dirigirVeiculo(token.actor, false);
    else if (registro.itemProprio && token.actor.system.veiculo === registro.itemProprio) await dirigirVeiculo(token.actor, false);
  }
  return { tokenId: token.id };
}

async function executar(pedido, usuario) {
  const cena = game.scenes.get(pedido.cenaId);
  if (!cena || !usuario?.active || (!usuario.isGM && !cena.active)) return { erro: 'A cena ou a permissão mudou.' };
  return naFila(cena, async () => {
    const token = cena.tokens.get(pedido.tokenId), veiculo = cena.tokens.get(pedido.veiculoId);
    if (!token || !dono(token, usuario) && !(pedido.acao === 'mover' && token.actor?.type === 'veiculo' && motorista(token, usuario))) return { erro: 'Esse token não é seu.' };
    if (pedido.acao === 'embarcar') {
      if (veiculo?.actor?.type !== 'veiculo') return { erro: 'O veículo saiu da cena.' };
      if (!usuario.isGM && cena.tokenVision && canvas.scene?.id !== cena.id) return { erro: 'O mestre precisa abrir esta cena para conferir a visão do veículo.' };
      const motivo = motivoEmbarque({ tipo: token.actor?.type, dono: dono(token, usuario), mestre: usuario.isGM,
        visivel: visivelPara(veiculo, usuario), dentro: Boolean(marca(token)), ocupantes: tripulantes(veiculo),
        assentos: veiculo.actor.system.assentos, distancia: daBorda(centro(token, cena.grid.size), veiculo) });
      if (motivo) return { erro: motivo };
      if (!usuario.isGM && parede(centro(token, cena.grid.size), centro(veiculo, cena.grid.size), 'move', veiculo)) return { erro: 'Há uma parede entre você e o veículo.' };
      const original = Object.fromEntries(['width', 'height', 'sort', 'elevation'].map(chave => [chave, dados(token)[chave]]));
      const item = itemDoVeiculo(veiculo.actor);
      const ids = [...tripulantes(veiculo), token.id];
      await veiculo.setFlag(SISTEMA, 'tripulacao', ids);
      try {
        await deslocar(token, { ...posicaoEmbarcada(dados(veiculo), original, cena.grid.size, ids.length - 1),
          [`flags.${SISTEMA}.embarcado`]: { veiculoId: veiculo.id, original, larguraVeiculo: veiculo.width, alturaVeiculo: veiculo.height,
            itemProprio: item?.parent.uuid === token.actor.uuid ? item.id : '' } });
        if (!atual(token) || !atual(veiculo) || !dono(token, usuario) || marca(token)?.veiculoId !== veiculo.id) throw new Error('O token ou a permissão mudou durante o embarque.');
      } catch (e) {
        if (atual(token) && marca(token)) await sair(token, veiculo);
        if (atual(veiculo)) await veiculo.setFlag(SISTEMA, 'tripulacao', tripulantes(veiculo).filter(id => id !== token.id));
        return { erro: e.message };
      }
      await atualizarMotorista(veiculo, null);
      return { tokenId: token.id, veiculoId: veiculo.id };
    }
    const dentro = veiculoDaTripulacao(token);
    if (pedido.acao === 'descer') {
      if (pedido.posicao && (!Number.isFinite(pedido.posicao.x) || !Number.isFinite(pedido.posicao.y))) return { erro: 'Escolha uma posição válida.' };
      return sair(token, dentro, pedido.posicao);
    }
    if (pedido.acao === 'dirigir') {
      if (!dentro) return { erro: 'Embarque antes de dirigir.' };
      const anterior = cena.tokens.get(tripulantes(dentro)[0]);
      await dentro.setFlag(SISTEMA, 'tripulacao', ordemMotorista(tripulantes(dentro), token.id));
      await atualizarMotorista(dentro, anterior);
      await levarOcupantes(dentro);
      return { tokenId: token.id };
    }
    if (pedido.acao === 'mover' && token.actor?.type === 'veiculo' && (usuario.isGM || motorista(token, usuario))) {
      const p = pedido.posicao;
      if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) return { erro: 'Escolha uma posição válida.' };
      // O mestre executa pelo motorista, mas conserva as paredes do caminho do veículo.
      // Fora do canvas, o Foundry não constrange o trajeto (client/documents/token.mjs:1806-1815).
      if (!token.rendered && parede(centro(token, cena.grid.size), centro({ ...dados(token), x: p.x, y: p.y }, cena.grid.size), 'move', token)) return { erro: 'Há uma parede no caminho do veículo.' };
      await token.move({ x: p.x, y: p.y, action: 'walk' }, { cprfTripulacao: true, constrainOptions: { ignoreWalls: false } });
      await levarOcupantes(token);
      return { tokenId: token.id };
    }
    return { erro: 'A tripulação ou a permissão mudou.' };
  });
}

async function pedir(acao, token, veiculo = null, posicao = null) {
  token = atual(token?.document ?? token);
  veiculo = veiculo?.document ?? veiculo;
  if (!token || !dono(token, game.user) && !(acao === 'mover' && motorista(token, game.user))) return null;
  if (acao === 'embarcar' && (!veiculo || veiculo.parent !== token.parent || !visivelPara(veiculo, game.user))) {
    ui.notifications.warn('Você não vê esse veículo.'); return null;
  }
  const mestre = game.users.activeGM;
  if (!mestre) { ui.notifications.warn('Sem mestre ativo na mesa para cuidar da tripulação.'); return null; }
  const pedido = { acao, cenaId: token.parent.id, tokenId: token.id, veiculoId: veiculo?.id, posicao };
  let resposta;
  if (mestreAtivo()) resposta = await executar(pedido, game.user);
  else resposta = await acompanhar(new Promise(resolve => {
    const id = foundry.utils.randomID();
    const relogio = setTimeout(() => { esperando.delete(id); resolve({ erro: 'O mestre não respondeu ao pedido da tripulação.' }); }, 15000);
    esperando.set(id, { mestre: mestre.id, resolver: r => { clearTimeout(relogio); esperando.delete(id); resolve(r); } });
    game.socket.emit(CANAL, { tipo: 'tripulacaoPedido', id, de: game.user.id, pedido });
  }));
  if (resposta?.erro) { ui.notifications.warn(resposta.erro); return null; }
  return resposta;
}

export const embarcar = (token, veiculo) => pedir('embarcar', token, veiculo);
export const descer = (token, posicao = null) => pedir('descer', token, null, posicao);
export const dirigir = token => pedir('dirigir', token);

function veiculoNoDestino(token, posicao) {
  const g = token.parent.grid.size, p = centro({ ...dados(token), ...posicao }, g);
  return token.parent.tokens.find(v => v.actor?.type === 'veiculo' && v.id !== token.id && visivelPara(v, game.user)
    && p.x >= dados(v).x && p.x <= dados(v).x + v.width * g && p.y >= dados(v).y && p.y <= dados(v).y + v.height * g);
}

// O mesmo caminho para arrasto e macros: o alcance de embarcar usa a origem, nunca o destino pedido pelo jogador.
export async function arrastar(token, posicao) {
  token = atual(token?.document ?? token);
  if (!token || !Number.isFinite(posicao?.x) || !Number.isFinite(posicao?.y)) return null;
  if (marca(token)) {
    const veiculo = veiculoDaTripulacao(token), g = token.parent.grid.size, p = centro({ ...dados(token), ...posicao }, g);
    if (veiculo && p.x >= dados(veiculo).x && p.x <= dados(veiculo).x + veiculo.width * g && p.y >= dados(veiculo).y && p.y <= dados(veiculo).y + veiculo.height * g) return null;
    const original = marca(token).original;
    return descer(token, { x: p.x - original.width * g / 2, y: p.y - original.height * g / 2 });
  }
  if (token.actor?.type === 'veiculo') return pedir('mover', token, null, posicao);
  const veiculo = veiculoNoDestino(token, posicao);
  return veiculo ? embarcar(token, veiculo) : null;
}

async function entrarPeloHud(veiculo) {
  const candidatos = canvas.tokens.controlled.map(t => t.document).filter(t => pessoa(t) && !marca(t) && dono(t, game.user));
  if (!candidatos.length) { ui.notifications.info('Selecione o token do personagem ou capanga que vai entrar.'); return; }
  let token = candidatos[0];
  if (candidatos.length > 1) {
    const esc = foundry.utils.escapeHTML;
    const id = await foundry.applications.api.DialogV2.wait({ window: { title: 'Entrar no veículo' }, classes: [SISTEMA, 'tripulacao'],
      content: `<label>Quem entra? <select name="ocupante">${candidatos.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>`,
      buttons: [{ action: 'entrar', label: 'Entrar', default: true, callback: (e, b) => b.form.elements.ocupante.value }], rejectClose: false }).catch(() => null);
    token = candidatos.find(t => t.id === id);
  }
  if (token) await embarcar(token, veiculo);
}

// A janela de rolagem, como a ficha (ficha-personagem.mjs): Ctrl + clique faz o contrário do "Rolar direto".
const comJanela = evento => Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto'));

// C46.4: as armas montadas do veículo, para o motorista: a escolha e o ataque (a metralhadora só com Autofogo, o C15).
async function escolherArmaDoAssento(token, evento) {
  const armas = armasDoVeiculo(veiculoDaTripulacao(token));
  if (!armas.length) return null;
  const esc = foundry.utils.escapeHTML;
  const id = await foundry.applications.api.DialogV2.wait({ window: { title: 'Armas do veículo' }, classes: [SISTEMA, 'tripulacao', 'armas-do-veiculo'],
    content: `<label>Arma <select name="arma">${armas.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></label>`,
    buttons: [{ action: 'atacar', label: 'Atacar', default: true, callback: (e, b) => b.form.elements.arma.value }], rejectClose: false }).catch(() => null);
  const arma = armas.find(a => a.id === id);
  if (!arma) return null;
  return atacarDoAssento(token, arma, { modo: arma.getFlag(SISTEMA, 'armaVeicular')?.soAutofogo ? 'autofogo' : null, perguntar: comJanela(evento) });
}

function botaoNoHud(app, elemento) {
  const token = app.object?.document, coluna = elemento.querySelector('.col.left');
  if (!token || !coluna) return;
  const botao = (classe, titulo, icone, acao) => {
    if (coluna.querySelector(`.${SISTEMA}-${classe}`)) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = `control-icon ${SISTEMA}-${classe}`; b.title = titulo; b.setAttribute('aria-label', titulo);
    b.innerHTML = `<i class="fa-solid ${icone}" inert></i>`;
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); acompanhar(Promise.resolve(acao(e))); });
    coluna.append(b);
  };
  if (token.actor?.type === 'veiculo' && visivelPara(token, game.user)) botao('entrar', 'Entrar', 'fa-right-to-bracket', () => entrarPeloHud(token));
  if (marca(token) && dono(token, game.user)) {
    botao('descer', 'Descer', 'fa-right-from-bracket', () => descer(token));
    botao('dirigir', veiculoDaTripulacao(token) && tripulantes(veiculoDaTripulacao(token))[0] === token.id ? 'Dirigindo' : 'Dirigir', 'fa-car', () => dirigir(token));
    // C46.4: o motorista faz a manobra do C40 pelo veículo do token e dispara as armas montadas dele.
    const veiculo = veiculoQueDirige(token.actor, token);
    if (veiculo) {
      botao('manobra', 'Manobra', 'fa-car-burst', e => game.system.api.veiculos.manobra(token.actor, null, { token, perguntar: comJanela(e) }));
      if (armasDoVeiculo(veiculo).length) botao('armas', 'Armas do veículo', 'fa-crosshairs', e => escolherArmaDoAssento(token, e));
    }
  }
}

function integrarArrasto() {
  const proto = CONFIG.Token.objectClass.prototype;
  const preparar = proto._prepareDragLeftDropUpdates, controlar = proto._canControl, hud = proto._canHUD;
  // Foundry 14, client/canvas/placeables/token.mjs:5102-5133: cada caminho é separado antes da gravação em lote.
  proto._prepareDragLeftDropUpdates = function(evento) {
    const [updates, opcoes] = preparar.call(this, evento);
    const manter = updates.filter(update => {
      const token = this.layer.get(update._id)?.document;
      const destino = opcoes.movement?.[update._id]?.waypoints.at(-1);
      if (!token || !destino || (!marca(token) && !(pessoa(token) && veiculoNoDestino(token, destino))
        && !(token.actor?.type === 'veiculo' && !game.user.isGM && motorista(token, game.user)))) return true;
      delete opcoes.movement[update._id];
      acompanhar(arrastar(token, destino));
      return false;
    });
    return [manter, opcoes];
  };
  proto._canControl = function(usuario, evento) {
    if (this.document.actor?.type === 'veiculo' && !usuario.isGM && visivelPara(this.document, usuario) && motorista(this.document, usuario)
      && this.layer.active && !canvas.regions._placementContext && !this.layer._draggedToken && game.activeTool === 'select') return true;
    return controlar.call(this, usuario, evento);
  };
  proto._canHUD = function(usuario, evento) {
    // O HUD de veículo visível permite Entrar sem conceder edição do ator nem posse do token.
    if (this.document.actor?.type === 'veiculo' && visivelPara(this.document, usuario) && this.layer.active
      && !canvas.regions._placementContext && !this.layer._draggedToken && !canvas.controls.ruler.active) return true;
    return hud.call(this, usuario, evento);
  };
}

async function repararCena(cena) {
  for (const token of cena.tokens) if (marca(token) && !veiculoDaTripulacao(token)) {
    const resposta = await sair(token, null);
    if (resposta.erro) ui.notifications.info(`${token.name}: ${resposta.erro}`);
  }
  for (const veiculo of cena.tokens.filter(t => t.actor?.type === 'veiculo')) {
    const ids = tripulantes(veiculo).filter(id => marca(cena.tokens.get(id))?.veiculoId === veiculo.id);
    if (ids.length !== tripulantes(veiculo).length) await veiculo.setFlag(SISTEMA, 'tripulacao', ids);
    await atualizarMotorista(veiculo, null);
    await levarOcupantes(veiculo);
  }
}

export function registrarTripulacao() {
  integrarArrasto();
  Hooks.on('renderTokenHUD', botaoNoHud);
  Hooks.on('preCreateToken', token => {
    // Duplicar token não duplica a tripulação nem herda o tamanho reduzido de um ocupante.
    const original = marca(token)?.original;
    token.updateSource({ ...original, [`flags.${SISTEMA}.embarcado`]: new foundry.data.operators.ForcedDeletion(),
      [`flags.${SISTEMA}.tripulacao`]: new foundry.data.operators.ForcedDeletion() });
  });
  Hooks.on('preMoveToken', (token, movimento, opcoes) => {
    if (mestreAtivo() && opcoes.cprfTripulacao) return;
    if (marca(token) || pessoa(token) && veiculoNoDestino(token, movimento.destination)) {
      acompanhar(arrastar(token, movimento.destination));
      return false;
    }
    if (token.actor?.type === 'veiculo' && !game.user.isGM) {
      if (motorista(token, game.user)) acompanhar(arrastar(token, movimento.destination));
      else ui.notifications.warn('Só o motorista move o veículo.');
      return false;
    }
  });
  Hooks.on('updateToken', (token, alteracoes, opcoes) => {
    if (!mestreAtivo() || opcoes.cprfTripulacao || token.actor?.type !== 'veiculo' || !tripulantes(token).length) return;
    if (['x', 'y', 'elevation', 'width', 'height', 'sort'].some(chave => chave in alteracoes)) naFila(token.parent, () => levarOcupantes(token));
  });
  Hooks.on('deleteToken', token => {
    if (!mestreAtivo()) return;
    naFila(token.parent, async () => {
      if (token.actor?.type === 'veiculo') {
        for (const id of tripulantes(token)) {
          const ocupante = token.parent.tokens.get(id);
          if (marca(ocupante)?.veiculoId === token.id) {
            const resposta = await sair(ocupante, token);
            if (resposta.erro) ui.notifications.info(`${ocupante.name}: ${resposta.erro}`);
          }
        }
      } else {
        const veiculo = veiculoDaTripulacao(token);
        if (!veiculo) return;
        await veiculo.setFlag(SISTEMA, 'tripulacao', tripulantes(veiculo).filter(id => id !== token.id));
        await atualizarMotorista(veiculo, token);
        await levarOcupantes(veiculo);
      }
    });
  });
  Hooks.once('ready', () => {
    game.socket.on(CANAL, async mensagem => {
      if (mensagem.tipo === 'tripulacaoPedido' && mestreAtivo()) {
        const resposta = await executar(mensagem.pedido ?? {}, game.users.get(mensagem.de)).catch(e => ({ erro: e.message }));
        game.socket.emit(CANAL, { tipo: 'tripulacaoResposta', id: mensagem.id, para: mensagem.de, de: game.user.id, resposta });
      } else if (mensagem.tipo === 'tripulacaoResposta' && mensagem.para === game.user.id) {
        const espera = esperando.get(mensagem.id);
        if (espera?.mestre === mensagem.de) espera.resolver(mensagem.resposta);
      }
    });
    if (mestreAtivo()) for (const cena of game.scenes) naFila(cena, () => repararCena(cena));
  });
  Hooks.on('updateUser', () => {
    if (mestreAtivo()) for (const cena of game.scenes) naFila(cena, () => repararCena(cena));
  });
}
