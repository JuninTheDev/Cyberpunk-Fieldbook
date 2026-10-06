// A cada turno do combate (no mestre ativo):
// - o Suprimido sai no fim do próximo turno de quem foi suprimido (ele já gastou o movimento indo para a cobertura);
// - no começo do turno de quem está mortalmente ferido (HP abaixo de 1), o Death Save: o jogador rola (com a janela
//   do sistema); o mestre rola pelos NPCs. Falhou: morto (status e combatente derrotado).
import { MODULE_ID, STATUS_SUPRIMIDO, TIPOS_DE_ATOR } from './constantes.mjs';
import { souMestreAtivo, perguntarAoJogador } from './socket.mjs';
import { rolarDeathSave } from './sistema.mjs';
import { jogadorDe } from './mestre.mjs';

const config = chave => game.settings.get(MODULE_ID, chave);

// O turno que acabou (combate.previous) veio depois do turno em que a supressão aconteceu?
const depoisDe = (anterior, marca) => anterior.round > marca.rodada || (anterior.round === marca.rodada && anterior.turn > marca.turno);

async function tirarSupressao(combate) {
  const anterior = combate.previous;
  const token = anterior && anterior.tokenId && combate.scene ? combate.scene.tokens.get(anterior.tokenId) : null;
  const actor = token && token.actor;
  if (!actor || !actor.statuses.has(STATUS_SUPRIMIDO)) return;
  const marca = actor.getFlag(MODULE_ID, 'suprimido');
  if (marca && marca.combate === combate.id && !depoisDe(anterior, marca)) return;
  await actor.toggleStatusEffect(STATUS_SUPRIMIDO, { active: false });
  await actor.unsetFlag(MODULE_ID, 'suprimido');
}

async function deathSave(combate) {
  const combatente = combate.combatant;
  const token = combatente && combatente.token;
  const actor = token && token.actor;
  const modo = config('deathSave');
  if (!actor || modo === 'nao' || !TIPOS_DE_ATOR.includes(actor.type) || combatente.isDefeated) return;
  if (Number(actor.system.derivedStats.hp.value) >= 1 || actor.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return;
  const jogador = jogadorDe(actor);
  if (!jogador && modo === 'jogadores') return;
  let resultado = null;
  if (jogador) {
    resultado = await perguntarAoJogador(jogador.id, 'deathSave', {
      token: token.uuid, janela: Boolean(config('rolagemManual')),
      aviso: `${token.name} está mortalmente ferido: role o Death Save (precisa tirar menos que BODY ${actor.getStat('body')}).`
    }, ((Number(config('tempo')) || 60) + 15) * 1000);
  }
  if (!resultado) resultado = await rolarDeathSave({ actor, token, janela: false });
  if (!resultado || resultado.passou) return;
  await actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true });
  await combatente.update({ defeated: true });
  await ChatMessage.create({ content: `<div class="fluxo-cartao fluxo-morte"><p><i class="fa-solid fa-skull"></i> <b>${token.name}</b> falhou no Death Save e morreu.</p></div>`, speaker: ChatMessage.getSpeaker({ token }) });
}

export function aoMudarTurno(combate, mudancas) {
  if (!souMestreAtivo() || !combate.started || !('turn' in mudancas || 'round' in mudancas)) return;
  (async () => {
    await tirarSupressao(combate);
    await deathSave(combate);
  })().catch(error => console.warn(`${MODULE_ID} | turno`, error));
}
