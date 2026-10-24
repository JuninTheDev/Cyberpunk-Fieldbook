// Constantes, tokens e destinos compartilhados pelo ataque, pelos modos e pelo cartão.

import { SISTEMA } from '../config.mjs';
import * as R from '../regras.mjs';
import { techAtravessaVidro } from '../regras-veiculos.mjs';

export const CANAL = `system.${SISTEMA}`;
export const STATUS_SUPRIMIDO = `${SISTEMA}-suprimido`;
// "Em cobertura" (o "Proteger-se" das maquetes; a wiki, p. 182: atrás de algo que para a bala e fora da linha de visão):
// só a marca, a decisão do usuário de 2026-10-16. O tiro contra quem a tem avisa o mestre no cartão, e o mestre decide.
export const STATUS_COBERTURA = `${SISTEMA}-em-cobertura`;

export const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
export const renderizar = (arquivo, dados) => foundry.applications.handlebars.renderTemplate(`systems/${SISTEMA}/templates/chat/${arquivo}`, dados);
export const souOMestreAtivo = () => game.user.isGM && game.users.activeGM?.id === game.user.id;

// "resistir": a resistência ao agarrão (agarrao.mjs); "vontade": a WILL + 1d10 contra o Jack In; "interface": a Interface
// + 1d10 do netrunner contra a expulsão (neuroport.mjs). Todas pela mesma janela de reação.
export const ROTULO = { esquivar: 'esquivou', aguentar: 'aguentou', escudo: 'usou o escudo', escudoHumano: 'interpôs o escudo humano', concentrar: 'rolou a Concentração', resistir: 'rolou a resistência', vontade: 'rolou a Vontade', interface: 'rolou a Interface' };
export const precisaRolar = escolha => ['esquivar', 'concentrar', 'resistir', 'vontade', 'interface'].includes(escolha);

// ---------------- Tokens e distância ----------------
// O token de um ator na cena (o do próprio ataque, se o ator é de um token).
export const tokenNaCena = (ator, cena = canvas.scene) => ator.token ?? cena?.tokens.find(token => token.actorId === ator.id) ?? null;
export const centroDe = token => ({ x: token.x + (token.width * token.parent.grid.size) / 2, y: token.y + (token.height * token.parent.grid.size) / 2 });
// Distância em metros entre dois tokens da mesma cena, pela grade da cena, com a diferença de elevação.
export function distancia(a, b) {
  if (!a || !b || a.parent !== b.parent) return null;
  const plano = a.parent.grid.measurePath([centroDe(a), centroDe(b)]).distance;
  const altura = (Number(a.elevation) || 0) - (Number(b.elevation) || 0);
  return Math.round(Math.sqrt(plano * plano + altura * altura) * 10) / 10;
}

// O jogador que responde por um ator: o dono ativo (de preferência quem tem o ator como personagem).
export function jogadorDe(ator) {
  const donos = game.users.filter(usuario => usuario.active && !usuario.isGM && ator.testUserPermission(usuario, 'OWNER'));
  return donos.find(usuario => usuario.character?.id === ator.id) ?? donos[0] ?? null;
}

// A instalação pode mudar enquanto a janela de rolagem está aberta. A mesma conferência vale no cliente e no mestre.
export function conferirArmaVeicular(arma, modo) {
  const motivo = arma.motivoVeicular(modo);
  if (motivo) ui.notifications.warn(`${arma.name}: ${motivo}`);
  return !motivo;
}

// O token continua dando a posição; só uma escolha explícita muda o destino da pessoa para o carro ou seu vidro.
export function conferirDestinos(alvos, destinos, { modo, local } = {}) {
  if (!destinos || typeof destinos !== 'object' || Array.isArray(destinos)) { ui.notifications.warn('Escolha um destino válido para o ataque.'); return false; }
  for (const [uuid, destino] of Object.entries(destinos)) {
    const token = alvos.find(alvo => alvo.uuid === uuid);
    const veiculo = token?.actor.items.get(destino?.veiculo);
    if (!token || !['veiculo', 'vidro'].includes(destino?.tipo) || veiculo?.type !== 'veiculo'
      || (destino.tipo === 'vidro' && !Object.hasOwn(veiculo.system.janelas, destino.janela))) {
      ui.notifications.warn('O veículo ou vidro escolhido não está mais na ficha do alvo. Escolha o destino novamente.');
      return false;
    }
    if (modo === 'supressivo') { ui.notifications.warn('Fogo supressivo afeta pessoas; escolha a pessoa como destino.'); return false; }
    if (destino.tipo === 'veiculo' && R.LOCAIS_MIRADOS[local]) { ui.notifications.warn('Cabeça, perna e item na mão são locais da pessoa; escolha o corpo para atingir o veículo.'); return false; }
  }
  return true;
}

export function destinoVeicular(ctx, token) {
  const destino = ctx.pedido.destinos?.[token.uuid];
  return destino ? { ...destino, item: token.actor.items.get(destino.veiculo) } : null;
}

// Vidro destruído ou atravessado pela carga Tech não substitui a defesa da pessoa. A espessura é a original (max).
export function destinoEstrutural(ctx, token) {
  const destino = destinoVeicular(ctx, token);
  if (destino?.tipo === 'veiculo') return destino;
  const vidro = destino?.item?.system.janelas[destino.janela];
  return vidro?.hp.value > 0 && !techAtravessaVidro({ carga: ctx.pedido.carga, grossa: ctx.arma.getFlag(SISTEMA, 'arma2077')?.cargaGrossa, max: vidro.hp.max }) ? destino : null;
}

export const combateDe = ator => game.combats.find(combate => combate.started && combate.combatants.some(c => c.actor === ator)) ?? null;
