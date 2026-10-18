// A cada turno do combate (no mestre ativo):
// - o Suprimido sai no fim do próximo turno de quem foi suprimido (ele já gastou o movimento indo para a cobertura);
// - no começo do turno de quem está mortalmente ferido (HP abaixo de 1), o Death Save: o jogador rola no computador
//   dele; o mestre rola pelos NPCs e pelos capangas. Falhou: morto (status e combatente derrotado).
import { jogadorDe, pedir, souOMestreAtivo, STATUS_SUPRIMIDO } from './combate.mjs';
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { fogoNoFimDoTurno } from './municoes.mjs';

// O turno que acabou (combate.previous) veio depois do turno em que a supressão aconteceu?
const depoisDe = (anterior, marca) => anterior.round > marca.rodada || (anterior.round === marca.rodada && anterior.turn > marca.turno);

async function tirarSupressao(combate) {
  const anterior = combate.previous;
  const token = anterior?.tokenId && combate.scene ? combate.scene.tokens.get(anterior.tokenId) : null;
  const ator = token?.actor;
  if (!ator?.statuses.has(STATUS_SUPRIMIDO)) return;
  const marca = ator.getFlag(SISTEMA, 'suprimido');
  if (marca && marca.combate === combate.id && !depoisDe(anterior, marca)) return;
  await ator.toggleStatusEffect(STATUS_SUPRIMIDO, { active: false });
  await ator.unsetFlag(SISTEMA, 'suprimido');
}

async function deathSave(combate) {
  const combatente = combate.combatant;
  const token = combatente?.token;
  const ator = token?.actor;
  const modo = config('deathSave');
  if (!ator || modo === 'nao' || !['personagem', 'capanga'].includes(ator.type) || combatente.isDefeated) return;
  if (ator.system.hp.value >= 1 || ator.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return;
  const jogador = jogadorDe(ator);
  if (!jogador && modo === 'jogadores') return;
  const resultado = (jogador ? await pedir(jogador, 'deathSave', { ator: ator.uuid }) : null) ?? await ator.rolarDeathSave();
  if (!resultado || resultado.passou) return;
  await ator.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true });
  await combatente.update({ defeated: true });
  await ChatMessage.implementation.create({
    content: `<div class="${SISTEMA} cartao morte"><p><b>${foundry.utils.escapeHTML(token.name)}</b> falhou no Death Save e morreu.</p></div>`,
    speaker: ChatMessage.implementation.getSpeaker({ token }), flags: { [SISTEMA]: { morte: ator.uuid } }
  });
}

export function aoMudarTurno(combate, mudancas) {
  if (!souOMestreAtivo() || !combate.started || !('turn' in mudancas || 'round' in mudancas)) return;
  (async () => {
    await tirarSupressao(combate);
    await fogoNoFimDoTurno(combate);
    await deathSave(combate);
  })().catch(erro => console.warn(`${SISTEMA} | turno`, erro));
}

// A ficha mostra o que depende do combate (a carga Tech, que dura 20 rodadas). A cada mudança do combate o Foundry
// já redesenha as fichas de quem está nele (Combat#updateCombatantActors); quando o combate acaba, não: aqui, as fichas
// abertas neste cliente de quem estava nele com arma Tech se redesenham.
export function redesenharFichas(combate) {
  for (const { actor } of combate.combatants) {
    if (actor?.sheet?.rendered && actor.items.some(item => item.perfil2077?.classe === 'tech')) actor.sheet.render();
  }
}
