// O risco da arma no Foundry (o C73; as decisões do usuário de 2026-11-25). A falha crítica da arma (a ruim, ou a que tem
// uma modificação instável) que quebra marca a arma sozinha: a "Quebra" a deixa quebrada, e a "Quebra sem conserto", uma
// relíquia. Quebrada, ela não ataca e o que está nela para (o motivoInoperante do documentos.mjs); o mestre desfaz no
// cartão. O conserto é o teste do Tech (TECH + Tecnologia de Armas contra a DV do preço da arma, pelo pedido de teste do
// C65), com o custo de uma categoria abaixo; na falha, continua quebrada. A relíquia guarda a história e se reforja: o
// nome, a frase, a linha "Reforjada da …" e uma modificação passam para uma arma nova do mesmo tipo (o mestre faz). As
// contas ficam no regras-quebra.mjs.
import { SISTEMA } from './config.mjs';
import { registrarEventos, temIdentidade } from './identidade.mjs';
import { aoResultado, encerrarPedido, pedir } from './pedido-teste.mjs';
import { eventoDeMarco, normalizar as normalizarIdentidade } from './regras-identidade.mjs';
import { modCabe } from './regras-modificacoes.mjs';
import { passou } from './regras-pedido-teste.mjs';
import * as R from './regras-quebra.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));
const TIPO = 'consertoDeArma';
const agora = () => new Date().toISOString();
const anotar = (arma, texto) => (temIdentidade(arma) ? registrarEventos(arma, [eventoDeMarco(texto, { data: agora(), por: 'mestre' })]).catch(erro => console.warn(`${SISTEMA} | o diário de ${arma.name}:`, erro)) : null);
const falar = (arma, html) => ChatMessage.implementation.create({ speaker: { alias: arma.actor?.name ?? 'Mestre' }, content: `<div class="${SISTEMA} cartao quebra-da-arma">${html}</div>` });

// A quebra pela falha da arma do ataque (o cartão do resultado, combate/cartao.mjs): marca a arma e devolve { arma, estado }
// para o cartão (o "Desfazer a quebra" do mestre), ou null.
export async function marcarPelaFalha(arma, efeito, ataque) {
  const estado = R.estadoDaFalha(efeito);
  if (!estado || !arma?.isOwner || arma.type !== 'arma' || arma.estadoDaQuebra === 'reliquia') return null;
  await arma.setFlag(SISTEMA, 'quebra', { estado, quando: agora(), ataque });
  return { arma: arma.uuid, estado, rotulo: R.ESTADOS[estado].rotulo, texto: R.ESTADOS[estado].texto };
}
// O "Desfazer a quebra" do cartão: só a quebra que veio daquele ataque.
export async function desfazerPeloCartao(mensagem) {
  const resumo = mensagem.getFlag(SISTEMA, 'ataque');
  const arma = resumo?.quebra ? await fromUuid(resumo.quebra.arma) : null;
  if (!game.user.isGM || !arma || arma.getFlag(SISTEMA, 'quebra')?.ataque !== resumo.id) return false;
  await arma.unsetFlag(SISTEMA, 'quebra');
  await mensagem.setFlag(SISTEMA, 'quebraDesfeita', true);
  return true;
}

// O conserto da arma (o mestre): a quebrada volta a funcionar, e o diário anota.
export async function consertar(arma, { por = '' } = {}) {
  if (!game.user.isGM || arma?.estadoDaQuebra !== 'quebrada') return false;
  await arma.unsetFlag(SISTEMA, 'quebra');
  await falar(arma, `<p><b>${esc(arma.nomeDeExibicao)}</b> foi consertada${por ? ` por ${esc(por)}` : ''}.</p>`);
  await anotar(arma, `Consertada${por ? ` por ${por}` : ''}`);
  return true;
}
// O teste do conserto pedido ao Tech (o cartão do C65, com a DV à vista).
export function pedirConserto({ arma, tech }) {
  if (!game.user.isGM) throw new Error('Só o mestre pede o conserto.');
  if (arma?.estadoDaQuebra !== 'quebrada') { ui.notifications.warn(`${arma?.name ?? 'A arma'} não está quebrada.`); return null; }
  const conserto = R.consertoDaArma(arma.system.preco);
  return pedir({
    teste: conserto.teste, dv: conserto.dv, mostrarDv: true, atores: [tech.uuid], acao: { tipo: TIPO, arma: arma.uuid },
    motivo: `Consertar ${arma.nomeDeExibicao} (custa ${conserto.custo}eb, uma categoria abaixo). Na falha, continua quebrada.`
  });
}
async function aoTestar(mensagem, dados, indice) {
  if (dados.acao?.tipo !== TIPO || !game.user.isGM) return;
  const linha = dados.linhas[indice];
  if (linha?.estado !== 'rolou') return;
  const arma = await fromUuid(dados.acao.arma);
  if (arma) {
    if (passou(linha.total, dados.dv)) await consertar(arma, { por: linha.nome });
    else await falar(arma, `<p><b>${esc(linha.nome)}</b> não conseguiu consertar <b>${esc(arma.nomeDeExibicao)}</b>: ela continua quebrada.</p>`);
  }
  if (dados.aberto && mensagem) await encerrarPedido(mensagem.id);
}
// A janela do mestre: o personagem que conserta (o Tech primeiro) e o jeito (o teste, ou direto, com o Tech NPC).
export async function abrirConserto(arma) {
  if (!game.user.isGM || arma?.estadoDaQuebra !== 'quebrada') return null;
  const conserto = R.consertoDaArma(arma.system.preco);
  const personagens = game.actors.filter(ator => ator.type === 'personagem')
    .sort((a, b) => Number(Boolean(b.rolagemDeRole('upgrade'))) - Number(Boolean(a.rolagemDeRole('upgrade'))) || a.name.localeCompare(b.name, 'pt-BR'));
  const escolha = await DialogV2.wait({
    window: { title: 'Consertar a arma', icon: 'fa-solid fa-screwdriver-wrench' }, classes: [SISTEMA, 'conserto-da-arma', 'themed', 'theme-dark'], rejectClose: false,
    content: `<p><b>${esc(arma.nomeDeExibicao)}</b> (de ${esc(arma.actor?.name)}). TECH + Tecnologia de Armas + 1d10 contra a DV ${conserto.dv} (${esc(conserto.categoria)}); custa ${conserto.custo}eb. Na falha, continua quebrada.</p>
      <div class="form-group"><label>Quem conserta <select name="tech">${personagens.map(ator => `<option value="${ator.id}">${esc(ator.name)}</option>`).join('')}</select></label></div>`,
    buttons: [
      { action: 'teste', label: 'Pedir o teste', icon: 'fa-solid fa-dice-d10', default: true, callback: (evento, botao) => ({ jeito: 'teste', tech: botao.form.elements.tech?.value }) },
      { action: 'direto', label: 'Consertada (o Tech NPC)', icon: 'fa-solid fa-check', callback: () => ({ jeito: 'direto' }) },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ]
  });
  if (!escolha || typeof escolha !== 'object') return null;
  if (escolha.jeito === 'direto') return consertar(arma);
  const tech = game.actors.get(escolha.tech);
  return tech ? pedirConserto({ arma, tech }) : null;
}

// O reforjar (o mestre): a relíquia passa a identidade e, se couber, uma modificação para a arma nova (do mesmo ator, do
// mesmo tipo, sem nome próprio). mod: o id de uma modificação da relíquia, ou ''. Devolve a arma nova, ou null.
export async function reforjar(reliquia, nova, { mod = '' } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre reforja.'); return null; }
  const plano = R.reforjar(
    { estado: reliquia.estadoDaQuebra, reforjada: reliquia.getFlag(SISTEMA, 'quebra')?.reforjada ?? null, tipo: reliquia.system.tipo, modelo: reliquia.name, identidade: reliquia.getFlag(SISTEMA, 'arma') },
    { estado: nova?.estadoDaQuebra ?? null, tipo: nova?.system.tipo, identidade: nova?.getFlag(SISTEMA, 'arma') },
    { data: agora() }
  );
  if (plano.erro) { ui.notifications.warn(`Reforjar: ${plano.erro}.`); return null; }
  const peca = mod ? reliquia.modificacoes.find(item => item.id === mod) : null;
  if (mod && !peca) { ui.notifications.warn('Reforjar: a modificação não está na relíquia.'); return null; }
  if (peca) {
    const { cabe, motivo } = modCabe(nova.paraModificacoes, nova.modificacoes.map(item => item.modificacao), peca.modificacao);
    if (!cabe) { ui.notifications.warn(`Reforjar: ${peca.name} não cabe em ${nova.name}: ${motivo}.`); return null; }
  }
  await nova.setFlag(SISTEMA, 'arma', { ...plano.identidade, dono: normalizarIdentidade(nova.getFlag(SISTEMA, 'arma')).dono });
  if (peca) await peca.update({ 'system.instaladoEm': nova.id }, { reforjar: true });
  await reliquia.setFlag(SISTEMA, 'quebra', { ...reliquia.getFlag(SISTEMA, 'quebra'), reforjada: { em: nova.id, quando: agora() } });
  await anotar(reliquia, `Reforjada em ${nova.nomeDeExibicao}`);
  await falar(nova, `<p><b>${esc(reliquia.nomeDeExibicao)}</b> foi reforjada: o nome, a história${peca ? ` e ${esc(peca.name)}` : ''} passam para <b>${esc(nova.nomeDeExibicao)}</b>.</p>`);
  return nova;
}
// A janela do reforjar: a arma nova (as do mesmo tipo no ator, sem nome próprio) e a modificação que passa.
export async function abrirReforjar(reliquia) {
  if (!game.user.isGM || reliquia?.estadoDaQuebra !== 'reliquia') return null;
  const novas = reliquia.actor?.items.filter(item => item.type === 'arma' && item.id !== reliquia.id && item.system.tipo === reliquia.system.tipo && !item.estadoDaQuebra && !item.identidade.apelido) ?? [];
  if (!novas.length) { ui.notifications.warn(`Reforjar: ${reliquia.actor?.name ?? 'o personagem'} não tem uma arma nova do mesmo tipo (sem nome próprio).`); return null; }
  const mods = reliquia.modificacoes.filter(item => item.modificacao.tipo !== 'defeito');
  const escolha = await DialogV2.wait({
    window: { title: 'Reforjar a relíquia', icon: 'fa-solid fa-hammer' }, classes: [SISTEMA, 'reforjar-reliquia', 'themed', 'theme-dark'], rejectClose: false,
    content: `<p><b>${esc(reliquia.nomeDeExibicao)}</b>: o nome, a frase e a história passam para a arma nova; os contadores voltam a zero.</p>
      <div class="form-group"><label>A arma nova <select name="nova">${novas.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label></div>
      <div class="form-group"><label>Uma modificação <select name="mod"><option value="">Nenhuma</option>${mods.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label></div>`,
    buttons: [
      { action: 'reforjar', label: 'Reforjar', icon: 'fa-solid fa-hammer', default: true, callback: (evento, botao) => ({ nova: botao.form.elements.nova.value, mod: botao.form.elements.mod.value }) },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ]
  });
  if (!escolha || typeof escolha !== 'object') return null;
  return reforjar(reliquia, reliquia.actor.items.get(escolha.nova), { mod: escolha.mod });
}

export function registrarQuebra() {
  aoResultado(aoTestar);
}

export const API = { ...R, marcarPelaFalha, desfazerPeloCartao, consertar, pedirConserto, abrirConserto, reforjar, abrirReforjar };
