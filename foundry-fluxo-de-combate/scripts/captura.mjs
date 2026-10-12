// No cliente de quem ataca: pega o ataque direto da rolagem do sistema (CPRChat.RenderRollCard, por onde passam a
// ficha, o Token Action HUD e o Combat HUD), com o total, o modo, a arma e os alvos marcados. Nada de ler o HTML
// do chat. Antes de o cartão ir para o chat:
// - marca o cartão com o id do ataque;
// - esconde o total dos jogadores (só o mestre e quem atacou veem) até o alvo decidir, se a configuração pedir;
// - troca o botão "rolar dano" por uma marca do módulo (o dano sai sozinho; um clique a mais daria dano em dobro).
//   Sem o botão, o Diwako e o Evasion Workflow também não respondem a este ataque (eles procuram esse botão).
// Depois, pede ao mestre ativo que resolva.
import { MODULE_ID, DIWAKO } from './constantes.mjs';
import { cpr } from './sistema.mjs';
import { pedir } from './socket.mjs';

const pendentes = [];

export async function instalarCaptura() {
  const { CPRChat, rolls } = await cpr();
  const original = CPRChat.RenderRollCard;
  if (original.fluxoDeCombate) return;
  const comFluxo = function (cprRoll) {
    let ataque = null;
    try { ataque = lerAtaque(cprRoll, rolls); } catch (error) { console.warn(`${MODULE_ID} | ataque`, error); }
    if (!ataque) return original.call(this, cprRoll);
    pendentes.push(ataque);
    const criado = original.call(this, cprRoll);
    Promise.resolve(criado).then(mensagem => {
      tirar(ataque);
      if (mensagem) resolver(ataque, mensagem);
    }, error => { tirar(ataque); console.warn(`${MODULE_ID} | cartão do ataque`, error); });
    return criado;
  };
  comFluxo.fluxoDeCombate = true;
  CPRChat.RenderRollCard = comFluxo;
  Hooks.on('preCreateChatMessage', marcarCartao);
}

const tirar = ataque => { const i = pendentes.indexOf(ataque); if (i >= 0) pendentes.splice(i, 1); };

function tipoDaRolagem(cprRoll, rolls) {
  if (cprRoll instanceof rolls.CPRSuppressiveFireRoll) return 'suppressive';
  if (cprRoll instanceof rolls.CPRAutofireRoll) return 'autofire';
  if (cprRoll instanceof rolls.CPRAimedAttackRoll) return 'aimed';
  return 'attack';
}

function lerAtaque(cprRoll, rolls) {
  if (!(cprRoll instanceof rolls.CPRAttackRoll)) return null;
  if (!game.settings.get(MODULE_ID, 'ativo') || !game.users.activeGM) return null;
  const entidade = cprRoll.entityData || {};
  const actor = (entidade.token && game.actors.tokens[entidade.token]) || game.actors.get(entidade.actor);
  const arma = actor && actor.items.get(entidade.item);
  if (!arma) return null;
  const token = (entidade.token && canvas.scene && canvas.scene.tokens.get(entidade.token)) || actor.getActiveTokens(false, true)[0] || null;
  if (!token) return null;
  const rolagem = tipoDaRolagem(cprRoll, rolls);
  const alvos = (entidade.tokens || []).map(alvo => alvo.document || alvo).filter(alvo => alvo && alvo.id !== token.id && alvo.parent === token.parent);
  if (!alvos.length && rolagem !== 'suppressive') return null;
  return {
    id: foundry.utils.randomID(),
    usuario: game.user.id,
    cena: token.parent.id,
    token: token.id,
    arma: arma.id,
    rolagem,
    total: cprRoll.resultTotal,
    natural: cprRoll.initialRoll,
    local: rolagem === 'aimed' ? cprRoll.location || 'head' : null,
    municao: (typeof arma._getLoadedAmmoProp === 'function' && arma._getLoadedAmmoProp('variety')) || null,
    alvos: alvos.map(alvo => alvo.id),
    esconder: esconderDe(alvos),
    // Ajustes de quem montou a rolagem (as regras do Mission Kit no cpr-2077: carga Tech, munição Smart melhorada).
    // A segunda chance da Smart melhorada leva as penalidades deste tiro.
    extra: cprRoll.fluxoExtra ? { ...cprRoll.fluxoExtra, ...(cprRoll.fluxoExtra.segundaChance ? { penalidades: penalidadesDe(cprRoll) } : {}) } : null
  };
}

// A soma dos modificadores negativos do ataque (ferimentos, ricochete, mirado, os da janela).
const penalidadesDe = cprRoll => (cprRoll.mods || []).reduce((soma, mod) => soma + Math.min(0, Number(mod.value) || 0), 0);

// Esconde o total quando algum alvo é de um jogador (que ainda vai decidir). Alvos do mestre: ele pode ver.
export function esconderDe(alvos) {
  if (!game.settings.get(MODULE_ID, 'escondeAtaque')) return false;
  return alvos.map(alvo => alvo.document || alvo).some(alvo => alvo.actor && game.users.some(user => user.active && !user.isGM && user.id !== game.user.id && alvo.actor.testUserPermission(user, 'OWNER')));
}

function marcarCartao(mensagem, dados, opcoes, usuarioId) {
  if (usuarioId !== game.user.id || !pendentes.length) return;
  const conteudo = String(mensagem.content || '');
  const ataque = pendentes.find(item => !item.marcado && conteudo.includes(`data-item-id="${item.arma}"`));
  if (!ataque) return;
  ataque.marcado = true;
  const mudancas = { [`flags.${MODULE_ID}.ataque`]: ataque.id, content: semBotaoDeDano(conteudo) };
  // Sussurrado para o mestre e para quem atacou até a defesa; depois o mestre mostra para todos.
  if (ataque.esconder && !(mensagem.whisper && mensagem.whisper.length)) {
    mudancas.whisper = [...new Set([...game.users.filter(user => user.isGM).map(user => user.id), game.user.id])];
    ataque.revelar = true;
  }
  mensagem.updateSource(mudancas);
}

function semBotaoDeDano(html) {
  const modelo = document.createElement('template');
  modelo.innerHTML = html;
  const botao = modelo.content.querySelector('a[data-action="rollDamage"]');
  if (!botao) return html;
  if (game.settings.get(MODULE_ID, 'dano') === 'manual') {
    // O dano fica com o botão do sistema; só o Diwako deixa de anunciar acerto e erro antes da defesa.
    const icone = botao.querySelector('[data-tooltip]');
    if (icone && game.modules.get(DIWAKO)?.active) icone.dataset.tooltip = `${icone.dataset.tooltip}​`;
    return modelo.innerHTML;
  }
  const marca = document.createElement('span');
  marca.className = 'fluxo-marca';
  marca.dataset.tooltip = 'Fluxo de Combate: a defesa e o dano saem sozinhos';
  marca.innerHTML = '<i class="fas fa-shield-halved"></i>';
  botao.replaceWith(marca);
  return modelo.innerHTML;
}

function resolver(ataque, mensagem) {
  const { marcado, esconder, ...dados } = ataque;
  pedir('ataque', { ...dados, mensagem: mensagem.id })
    .catch(error => ui.notifications.warn(`Fluxo de Combate: ${error.message}`));
}
