// Os estados padrão do Foundry, como na mesa com o CORE: só as contas definidas na wiki entram aqui.
import { SISTEMA } from './config.mjs';
import { corridaPorEstado, movimentoPorEstado } from './regras-estados.mjs';

export const movimentoDe = ator => movimentoPorEstado(ator.statuses, ator.system.atributos.move.valor);
export const corridaDe = ator => corridaPorEstado(ator.statuses, ator.system.atributos.move.valor,
  { dirigindo: Boolean(ator.system.dirigindo && ator.veiculoAtivo) });

const corridasPendentes = new WeakSet();
const podeCorrer = ator => ator?.isOwner && ['personagem', 'capanga'].includes(ator.type) && fromUuidSync(ator.uuid) === ator;
const turnoAtual = () => { const combate = game.combat; return combate ? `${combate.id}:${combate.round}:${combate.turn}:${combate.combatant?.id ?? ''}` : ''; };

// Wiki, p. 168–169 (system-rules.js:501 e :514): a Ação vira outro Movimento, depois do Movimento normal.
// Como Levantar-se, registra o custo no chat; a mesa confirma o que já gastou no turno. Não muda MOVE nem o token.
// confirmado: true é a confirmação explícita da macro; a ficha sempre pergunta, inclusive com Ctrl ou Rolar direto.
export async function correr(ator, { confirmado = null } = {}) {
  if (!podeCorrer(ator) || corridasPendentes.has(ator)) return null;
  corridasPendentes.add(ator);
  try {
    let corrida = corridaDe(ator);
    if (corrida.bloqueio) { ui.notifications.warn(`${ator.name}: ${corrida.bloqueio}`); return null; }
    const turno = turnoAtual();
    if (confirmado === null) {
      const esc = foundry.utils.escapeHTML;
      confirmado = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'Correr (1 Ação)' }, classes: [SISTEMA, 'correr'], rejectClose: false,
        content: `<p><b>${esc(ator.name)}</b>: já usou sua Ação de Movimento neste turno e ainda tem a Ação disponível?</p><p>Correr gasta <b>1 Ação</b> e permite mais <b>${corrida.metros} m</b> de movimento: até <b>${corrida.total} m no turno</b>.</p>`
      });
    }
    if (confirmado !== true || !podeCorrer(ator)) return null;
    if (turnoAtual() !== turno) { ui.notifications.warn('O turno mudou enquanto a confirmação de Correr estava aberta. Confirme novamente no turno atual.'); return null; }
    corrida = corridaDe(ator);
    if (corrida.bloqueio) { ui.notifications.warn(`${ator.name}: ${corrida.bloqueio}`); return null; }
    const { acoes, metros, total } = corrida;
    const mensagem = await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
      content: `<div class="${SISTEMA} cartao estado"><p><b>${foundry.utils.escapeHTML(ator.name)}</b> correu: gastou ${acoes} Ação para mais <b>${metros} m</b> de movimento, até <b>${total} m no turno</b>.</p><p class="nota">Confirmou que já usou a Ação de Movimento e tinha a Ação disponível.</p></div>`,
      flags: { [SISTEMA]: { estado: { acao: 'correr', acoes, metros, total } } }
    });
    return mensagem ? { acoes, metros, total } : null;
  } finally {
    corridasPendentes.delete(ator);
  }
}

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
