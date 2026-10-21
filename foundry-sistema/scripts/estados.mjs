// Os estados padrão do Foundry, como na mesa com o CORE: só as contas definidas na wiki entram aqui.
import { SISTEMA } from './config.mjs';
import { movimentoPorEstado } from './regras-estados.mjs';

export const movimentoDe = ator => movimentoPorEstado(ator.statuses, ator.system.atributos.move.valor);

// A wiki ("Movimento", p. 169): o dono precisa levantar antes de mover. O mestre conserva os deslocamentos forçados.
// Mesmo gancho da trava do contêiner (conteiner.mjs, registrarConteiner).
export function registrarEstados() {
  Hooks.on('preMoveToken', token => {
    if (game.user.isGM || !['personagem', 'capanga'].includes(token.actor?.type) || !token.actor.statuses.has('prone')) return;
    ui.notifications.info(`${token.name}: está caído; use Levantar-se (1 Ação) antes de mover.`);
    return false;
  });
}

// system-rules.js, combat.html, "Ações" e "Movimento" (p. 168–169): levantar-se gasta a Ação, sem rolagem.
// A Recuperação das Artes Marciais continua no seu fluxo (artes-marciais.mjs).
export async function levantar(ator) {
  if (!ator?.isOwner || !['personagem', 'capanga'].includes(ator.type) || !ator.statuses.has('prone')) return null;
  const acoes = movimentoDe(ator).acoesParaLevantar;
  await ator.toggleStatusEffect('prone', { active: false });
  if (ator.statuses.has('prone')) return null;
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<div class="${SISTEMA} cartao estado"><p><b>${foundry.utils.escapeHTML(ator.name)}</b> levantou-se: gastou ${acoes} Ação.</p></div>`,
    flags: { [SISTEMA]: { estado: { acao: 'levantar', acoes } } }
  });
  return { acoes, movimento: movimentoDe(ator) };
}
