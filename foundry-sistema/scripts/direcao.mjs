// A direção dos veículos (o C40; a wiki, system-rules.js:538, "Veículos", p. 189–192). O CORE 0.92.4 não automatiza a
// direção nem as manobras; o C15 deixou o veículo em uso e o "Dirigir" (veiculos.mjs). As contas ficam em
// regras-veiculos.mjs; aqui:
// - a direção sob pressão, no começo do turno de quem dirige (turnos.mjs chama, no mestre ativo): REF + a perícia de
//   controle maior que 9, nada; senão, o dono rola DV10 no computador dele (a resistência do perigos.mjs) e o cartão diz se
//   manteve o controle ou o perdeu, com o botão "Batida" do mestre (perigos.mjs abre a janela já na batida);
// - a manobra, pela ficha (o botão "Manobra" na linha do veículo em uso): o motorista rola a perícia de controle contra a
//   DV da manobra, pela janela de rolagem, e o cartão diz se fez a manobra ou perdeu o controle (com o mesmo botão).
// Fica com o mestre: as mãos no volante e os Plugs de Interface, o topo da iniciativa, o MOVE do veículo e o que acontece
// quando se perde o controle.
// O C46, parte 4: o motorista de um token de veículo (o primeiro da tripulação, tripulacao.mjs) dirige aquele veículo,
// também o de NPC ou o de outro dono: a direção sob pressão, a manobra (o botão do HUD do token dele) e a perícia pelo
// tipo daquele veículo.
import { SISTEMA } from './config.mjs';
import { naVezDoAtor, resistir } from './perigos.mjs';
import { superou } from './regras-perigos.mjs';
import * as RV from './regras-veiculos.mjs';
import { tokenDaPessoa, veiculoDirigidoPor } from './tripulacao.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const comHp = ator => ['personagem', 'capanga'].includes(ator?.type);

// O controle de quem dirige agora: o veículo, o tipo dele, a perícia de controle e a soma sem o dado (REF + perícia, com
// as penalidades e os situacionais ligados, como a esquiva da ficha). O veículo é o do token em que ele é o motorista ou,
// fora de um, o em uso com "Dirigindo" (tripulacao.veiculoDirigidoPor; token: o da pessoa, o do combatente ou do HUD).
// Sem veículo dirigido: null.
export function controleDe(ator, { token = null } = {}) {
  const veiculo = comHp(ator) ? veiculoDirigidoPor(ator, token) : null;
  if (!veiculo) return null;
  const tipo = RV.tipoDoVeiculo({ tipo: veiculo.system.tipo, nome: veiculo.name });
  const pericia = RV.periciaDoControle(tipo);
  const soma = ator.partesDaPericia(pericia).partes.reduce((total, parte) => total + parte.valor, 0);
  return { veiculo, tipo, pericia, nomeDaPericia: ator.system.pericia(pericia).nome, soma, token: tokenDaPessoa(ator, token) };
}

// O token do motorista para o botão "Batida": o do combatente, o do ator sintético, o da cena vista; sem token, o ator.
const tokenDe = (ator, token = null) => token ?? ator.token ?? ator.getActiveTokens(false, true)[0] ?? null;
const botaoDaBatida = (ator, token) => `<button type="button" data-cprf-perigo="batida" data-ator="${esc((tokenDe(ator, token) ?? ator).uuid)}">Batida</button>`;
const PERDEU = 'perdeu o controle: o mestre decide o que acontece.';

function cartao(ator, { titulo, notas, perdeu, token = null, flags }) {
  const content = `<div class="${SISTEMA} cartao perigo direcao"><header><h3>${esc(titulo)}: ${esc(ator.name)}</h3><span class="sabor">${esc(RV.PAGINA_DOS_VEICULOS)}</span></header>
    ${notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}${perdeu ? `<div class="botoes">${botaoDaBatida(ator, token)}</div>` : ''}</div>`;
  return ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, flags: { [SISTEMA]: { direcao: flags } } });
}

// ---------------- A direção sob pressão (turnos.mjs, no mestre ativo) ----------------
// O combatente ainda está no combate? (o combate pode ter acabado durante o Death Save do turno). Sem combatente (a chamada
// direta), vale.
const noCombate = combatente => !combatente || Boolean(combatente.parent && game.combats.get(combatente.parent.id)?.combatants.has(combatente.id));

// O começo do turno (o momento.comeco de perigos.momentoDoTurno), depois do Death Save e do "Sem ar", na fila do ator: quem
// dirige (personagem ou capanga, não derrotado) e não passa de 9 em REF + perícia gasta a Ação e rola DV10. Uma vez por
// turno (a marca do turno no ator). Devolve o resumo do controle, ou null.
export function controleNoComecoDoTurno({ comeco = null } = {}) {
  let resumo = null;
  return naVezDoAtor(comeco?.ator, async ator => {
    const combatente = comeco.combatente ?? null;
    if (!noCombate(combatente) || combatente?.isDefeated || ator.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) return;
    const controle = controleDe(ator, { token: combatente?.token ?? null });
    if (!controle) return;
    const { rola, dv } = RV.direcaoSobPressao(controle.soma);
    if (!rola || ator.getFlag(SISTEMA, 'controle') === comeco.turno) return;
    await ator.setFlag(SISTEMA, 'controle', comeco.turno);
    const teste = await resistir(ator, { pericia: controle.pericia, dv, nome: `Direção sob pressão (${controle.veiculo.name})` });
    const manteve = teste?.passou ?? null;
    const notas = [`${controle.nomeDaPericia}: REF + perícia ${controle.soma}, até ${RV.LIMITE_DA_DIRECAO}: gasta a Ação e rola DV${dv} todo turno (${controle.veiculo.name}).`,
      !teste ? 'Sem a rolagem: o mestre decide.' : `${teste.total} contra DV${dv}: ${manteve ? 'gastou a Ação e manteve o controle.' : PERDEU}`];
    const mensagem = await cartao(ator, { titulo: 'Direção sob pressão', notas, perdeu: manteve === false, token: combatente?.token ?? controle.token,
      flags: { tipo: 'controle', ator: ator.uuid, veiculo: controle.veiculo.uuid, turno: comeco.turno, pericia: controle.pericia, soma: controle.soma, total: teste?.total ?? null, dv, manteve } });
    resumo = { mensagem: mensagem.id, pericia: controle.pericia, soma: controle.soma, total: teste?.total ?? null, dv, manteve };
  }).then(() => resumo);
}

// ---------------- A manobra (a ficha) ----------------
async function escolherManobra(ator, controle) {
  const lista = RV.manobrasDo(controle.tipo);
  const opcoes = lista.map(m => `<option value="${m.id}">${esc(m.nome)} (DV${m.dv})</option>`).join('');
  const escolha = await DialogV2.wait({
    window: { title: `Manobra: ${ator.name}`, icon: 'fa-solid fa-car-burst' },
    classes: [SISTEMA, 'manobra-de-veiculo', 'themed', 'theme-dark'],
    position: { width: 400 },
    rejectClose: false,
    content: `<div class="form-group"><label>Manobra <select name="manobra">${opcoes}</select></label></div>
      <p class="nota">${esc(controle.veiculo.name)}: ${esc(controle.nomeDaPericia)}. Usa a Ação e a Ação de Movimento; falhar é perder o controle.</p>
      <p class="nota">${esc(RV.PAGINA_DOS_VEICULOS)}</p>`,
    buttons: [
      { action: 'rolar', label: 'Rolar', icon: 'fa-solid fa-dice-d10', default: true, callback: (evento, botao) => botao.form.elements.manobra.value },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ]
  });
  return typeof escolha === 'string' && escolha !== 'cancelar' ? escolha : null;
}

// O controle de agora ainda é o da escolha? (as janelas ficam abertas: o "Dirigir" desligado, outro veículo em uso, o
// tipo trocado na ficha do item, o motorista que desceu ou passou a direção). Se não, avisa e devolve null.
function oMesmoControle(ator, antes) {
  const agora = controleDe(ator, { token: antes.token });
  if (agora && agora.veiculo.uuid === antes.veiculo.uuid && agora.tipo === antes.tipo) return agora;
  ui.notifications.warn(`${ator.name}: o veículo em uso, o "Dirigir" ou o tipo do veículo mudou com a janela aberta; a manobra não foi feita.`);
  return null;
}

// A manobra de quem dirige (a API game.system.api.veiculos.manobra, o botão da ficha e o do HUD do motorista): manobra, a
// chave de regras-veiculos.MANOBRAS (sem ela, a janela das manobras do tipo do veículo); perguntar, a janela de rolagem (a
// Sorte e os situacionais); token, o da pessoa (o do HUD). O próprio motorista rola, no computador dele. O controle é
// conferido de novo depois de cada janela. Devolve o resumo, com o id do cartão; recusada, null.
export async function manobra(ator, id = null, { perguntar = true, token = null } = {}) {
  if (!ator?.isOwner) { ui.notifications.warn('Manobra: só quem controla o personagem rola a manobra.'); return null; }
  const controle = controleDe(ator, { token });
  if (!controle) { ui.notifications.warn(`${ator.name}: para uma manobra, escolha o veículo em uso e ligue "Dirigir".`); return null; }
  const escolhida = id ?? await escolherManobra(ator, controle);
  if (!escolhida) return null;
  const m = RV.manobrasDo(controle.tipo).find(item => item.id === escolhida);
  if (!m) { ui.notifications.warn(`${ator.name}: a manobra "${escolhida}" não vale para ${controle.veiculo.name}.`); return null; }
  if (!oMesmoControle(ator, controle)) return null;
  const resultado = await ator.rolarPericia(controle.pericia, { perguntar, sabor: `Manobra: ${m.nome}: supere a DV${m.dv}`, modo: 'public' });
  if (!resultado || !oMesmoControle(ator, controle)) return null;
  const passou = superou(resultado.total, m.dv);
  const notas = [`${controle.veiculo.name}: ${controle.nomeDaPericia} ${resultado.total} contra DV${m.dv}: ${passou ? 'fez a manobra (usou a Ação e a Ação de Movimento).' : PERDEU}`];
  const mensagem = await cartao(ator, { titulo: `Manobra: ${m.nome}`, notas, perdeu: !passou, token: controle.token,
    flags: { tipo: 'manobra', ator: ator.uuid, veiculo: controle.veiculo.uuid, manobra: m.id, pericia: controle.pericia, total: resultado.total, dv: m.dv, passou } });
  return { mensagem: mensagem.id, manobra: m.id, pericia: controle.pericia, tipo: controle.tipo, total: resultado.total, dv: m.dv, passou };
}

export const API = { manobra, controleDe, controleNoComecoDoTurno, regras: RV };
