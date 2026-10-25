// A cada turno do combate (no mestre ativo):
// - o Suprimido sai no fim do próximo turno de quem foi suprimido (ele já gastou o movimento indo para a cobertura);
// - no começo do turno de quem está mortalmente ferido (HP abaixo de 1), o Death Save: o jogador rola no computador
//   dele; o mestre rola pelos NPCs e pelos capangas. Falhou: morto (status e combatente derrotado);
// - os perigos do ambiente (perigos.mjs, o C38): no fim do turno, a eletrocução e a radiação, junto do fogo; no começo,
//   depois do Death Save, o "Sem ar";
// - a direção sob pressão (direcao.mjs, o C40): no começo do turno, depois do "Sem ar", quem dirige sem passar de 9 em
//   REF + perícia de controle rola DV10.
import { jogadorDe, pedir, souOMestreAtivo, STATUS_SUPRIMIDO } from './combate.mjs';
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { controleNoComecoDoTurno } from './direcao.mjs';
import { semDeathSaveNaEstase } from './cryo.mjs';
import { fogoNoFimDoTurno } from './municoes.mjs';
import { momentoDoTurno, perigosNoComecoDoTurno, perigosNoFimDoTurno } from './perigos.mjs';

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

// combatente: o do momento do turno (perigos.momentoDoTurno), tirado antes dos await do aoMudarTurno.
// O combate pode ter acabado, ou o combatente saído dele, durante esses await: sem ele, não há Death Save do turno.
const noCombate = combatente => Boolean(combatente?.parent && game.combats.get(combatente.parent.id)?.combatants.has(combatente.id));
async function deathSave(combatente) {
  if (!noCombate(combatente)) return;
  const token = combatente?.token;
  const ator = token?.actor;
  const modo = config('deathSave');
  if (!ator || modo === 'nao' || !['personagem', 'capanga'].includes(ator.type) || combatente.isDefeated) return;
  if (ator.system.hp.value >= 1 || ator.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return;
  // Na estase do Cryopump ou do Cryotank, sem Death Save enquanto a bolsa ou o tanque tiver HP (o C41; cryo.mjs).
  if (semDeathSaveNaEstase(ator)) return;
  const jogador = jogadorDe(ator);
  if (!jogador && modo === 'jogadores') return;
  // O Death Save do turno é do fluxo: fica público, fora do modo do seletor do chat (o C33), como o do jogador
  // (combate/socket.mjs).
  const resultado = (jogador ? await pedir(jogador, 'deathSave', { ator: ator.uuid }) : null) ?? await ator.rolarDeathSave({ modo: 'public' });
  if (!resultado || resultado.passou) return;
  // Falhou, morreu, mesmo que o combate tenha acabado durante a rolagem; o combatente só se ainda existe.
  await ator.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true });
  if (noCombate(combatente)) await combatente.update({ defeated: true });
  await ChatMessage.implementation.create({
    content: `<div class="${SISTEMA} cartao morte"><p><b>${foundry.utils.escapeHTML(token.name)}</b> falhou no Death Save e morreu.</p></div>`,
    speaker: ChatMessage.implementation.getSpeaker({ token }), flags: { [SISTEMA]: { morte: ator.uuid } }
  });
}

export function aoMudarTurno(combate, mudancas) {
  if (!souOMestreAtivo() || !combate.started || !('turn' in mudancas || 'round' in mudancas)) return;
  // O momento do turno, já (o combatente do Death Save e os dos perigos): os await abaixo (o Death Save do jogador espera o
  // prazo inteiro) deixam o combate andar.
  const momento = momentoDoTurno(combate);
  (async () => {
    await tirarSupressao(combate);
    await fogoNoFimDoTurno(combate);
    await perigosNoFimDoTurno(momento);
    await deathSave(momento.comeco?.combatente ?? null);
    await perigosNoComecoDoTurno(momento);
    await controleNoComecoDoTurno(momento);
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
