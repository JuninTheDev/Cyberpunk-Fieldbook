// A perda de Humanidade rolada à parte (as maquetes do usuário: "Roll humanity" na ficha do cyberware e "Apply" no
// cartão): a fórmula da peça, sem instalar, num cartão com o botão "Aplicar" do mestre, que tira o total da Humanidade
// atual do dono uma vez só. A instalação continua rolando e aplicando sozinha (AtorCPR.instalarCyberware); este é o
// caminho para o que a mesa quiser rolar fora dela (uma peça que já veio instalada, um episódio narrado...).
import { SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));

// O cartão: o título, os dados com o total, a fórmula e a média, e o "Aplicar" (ou o que ele fez).
function conteudo(dados, roll) {
  const fim = dados.aplicado
    ? `<p class="resultado">Aplicada em ${esc(dados.ator)}: Humanidade ${dados.aplicado.antes} → ${dados.aplicado.depois}.</p>`
    : '<div class="botoes"><button type="button" data-cprf-acao="aplicarHumanidade">Aplicar</button></div>';
  return `<div class="${SISTEMA} cartao humanidade"><header><h3>Perda de Humanidade: ${esc(dados.peca)}</h3></header>${dadosDoCartao(roll, { critico: false })}`
    + `<p class="sabor">${esc(dados.formula)} (média ${dados.media}), sem instalar a peça.</p>${fim}</div>`;
}

// modo: o messageMode do Foundry 14 (ItemCPR.rolarHumanidade manda o do seletor do chat; o C33).
export async function rolarPerdaDeHumanidade(item, { modo } = {}) {
  const { formula, media } = item.system.perdaHumanidade ?? {};
  if (item.type !== 'cyberware' || !item.actor || !formula || formula === '0') return null;
  const roll = await new Roll(formula).evaluate();
  const dados = { ator: item.actor.name, atorUuid: item.actor.uuid, peca: item.name, formula, media, total: roll.total, aplicado: null };
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: item.actor }), content: conteudo(dados, roll), rolls: [roll], flags: { [SISTEMA]: { perdaDeHumanidade: dados } }
  }, { messageMode: modo });
}

// O "Aplicar" do cartão (só o mestre): a Humanidade atual do dono cai o total, uma vez (abaixo de 0, a ciberpsicose extrema
// da wiki; o C21); o cartão diz o que mudou e perde o botão.
export async function aplicarPerdaDeHumanidade(mensagem) {
  const dados = mensagem.getFlag(SISTEMA, 'perdaDeHumanidade');
  if (!dados || dados.aplicado || !game.user.isGM) return null;
  const ator = await fromUuid(dados.atorUuid);
  if (!ator) { ui.notifications.warn(`${dados.ator} não existe mais.`); return null; }
  const antes = ator.system.humanidade.value;
  const depois = antes - dados.total;
  await ator.update({ 'system.humanidade.value': depois });
  const aplicado = { ...dados, aplicado: { antes, depois } };
  return mensagem.update({ content: conteudo(aplicado, mensagem.rolls[0]), [`flags.${SISTEMA}.perdaDeHumanidade`]: aplicado });
}
