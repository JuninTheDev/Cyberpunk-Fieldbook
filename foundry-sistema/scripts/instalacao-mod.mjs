// A instalação da modificação de arma (o C72; decisões do usuário de 2026-11-25): quem instala é o Tech da mesa, com o
// teste da Especialização de Upgrade e Tecnologia de Armas (pelo pedido de teste do C65) contra a DV da categoria de preço
// (regras-modificacoes.instalacaoDaMod), ou o mestre, direto, quando o Tech é um NPC. O jogador não instala sozinho: na
// ficha da modificação, "Pedir a instalação" avisa o mestre, que escolhe o Tech. Passou: a modificação entra na arma e o
// diário dela anota quem instalou. Falhou: ela não entra e não se perde (o Tech tenta de novo outro dia). Tirar também é
// só do mestre (o "Tirar" da ficha; o documentos.mjs recusa o jogador que apaga): ela se destrói.
import { CANAL, souOMestreAtivo } from './combate/apoio.mjs';
import { SISTEMA } from './config.mjs';
import { registrarEventos, temIdentidade } from './identidade.mjs';
import { aoResultado, encerrarPedido, pedir } from './pedido-teste.mjs';
import { eventoDeMarco } from './regras-identidade.mjs';
import { instalacaoDaMod, modCabe } from './regras-modificacoes.mjs';
import { dvDaOficina } from './regras-oficina.mjs';
import { passou } from './regras-pedido-teste.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));
const TIPO = 'instalacaoDeMod';

// A instalação da modificação (o item): { dv, categoria, tempo, teste }, ou null (não é modificação, ou é um defeito).
// A da oficina do mestre (o C99) tem a DV que ele escolheu (a flag "oficina", o formulário guardado).
const dvDaOficinaDe = item => { const oficina = item.getFlag(SISTEMA, 'oficina'); return oficina ? dvDaOficina(oficina.dv) : null; };
export const instalacaoDe = item => (item?.modificacao ? instalacaoDaMod(item.modificacao, item.system.preco, dvDaOficinaDe(item)) : null);
const cabeEm = (arma, mod) => modCabe(arma.paraModificacoes, arma.modificacoes.filter(item => item.id !== mod.id).map(item => item.modificacao), mod.modificacao);
// As armas do dono da modificação em que ela cabe.
export const armasOndeCabe = mod => mod.actor?.items.filter(arma => arma.type === 'arma' && cabeEm(arma, mod).cabe) ?? [];
// Os Techs da mesa: os personagens com a Especialização de Upgrade (a Role Tech, a principal ou a segunda).
export const techsDaMesa = () => game.actors.filter(ator => ator.type === 'personagem' && ator.rolagemDeRole('upgrade'));
export const textoDaRegra = inst => `TECH + Tecnologia de Armas + Especialização de Upgrade + 1d10 contra a DV ${inst.dv} (${inst.categoria}); leva ${inst.tempo}. Na falha, a modificação não entra e não se perde.`;

// O mestre instala (o Tech NPC, ou o teste que passou): a modificação entra na arma, a mesa vê e o diário da arma anota.
export async function instalar(mod, arma, { por = '' } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Quem instala a modificação é o Tech: peça ao mestre.'); return false; }
  if (mod.system.instaladoEm === arma.id) return true;
  await mod.update({ 'system.instaladoEm': arma.id });
  if (mod.system.instaladoEm !== arma.id) return false;
  const quem = por ? ` por ${esc(por)}` : '';
  await ChatMessage.implementation.create({
    speaker: { alias: arma.actor?.name ?? 'Mestre' },
    content: `<div class="${SISTEMA} cartao instalacao-mod"><p><b>${esc(mod.name)}</b> entrou em <b>${esc(arma.nomeDeExibicao)}</b>, instalada${quem}.</p></div>`
  });
  if (temIdentidade(arma)) await registrarEventos(arma, [eventoDeMarco(`Modificação instalada: ${mod.name}${por ? ` (por ${por})` : ''}`, { data: new Date().toISOString(), por: 'mestre' })]).catch(erro => console.warn(`${SISTEMA} | o diário de ${arma.name}:`, erro));
  return true;
}

// O mestre tira a modificação da arma (o C72: só ele; na história, o Tech): ela se destrói, e o diário da arma anota.
export async function tirar(mod, { confirmar = true } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre tira a modificação: ela se destrói.'); return false; }
  const ator = mod.actor;
  const arma = ator?.items.get(mod.system.instaladoEm);
  if (arma?.type !== 'arma') return false;
  if (confirmar) {
    const ok = await DialogV2.confirm({
      window: { title: 'Tirar a modificação' }, classes: [SISTEMA, 'tirar-modificacao'], rejectClose: false,
      content: `<p>Tirar <b>${esc(mod.name)}</b> de <b>${esc(arma.nomeDeExibicao)}</b>? Ela se destrói.</p>`
    });
    if (!ok) return false;
  }
  const { id, name: nome } = mod;
  await mod.delete();
  if (ator.items.has(id)) return false;
  if (temIdentidade(arma)) await registrarEventos(arma, [eventoDeMarco(`Modificação tirada: ${nome}`, { data: new Date().toISOString(), por: 'mestre' })]).catch(erro => console.warn(`${SISTEMA} | o diário de ${arma.name}:`, erro));
  return true;
}

// O mestre pede o teste ao Tech (o cartão do C65, com a DV à vista). Devolve a mensagem do cartão, ou null.
export async function pedirTesteDoTech({ mod, arma, tech }) {
  if (!game.user.isGM) throw new Error('Só o mestre pede o teste do Tech.');
  const inst = instalacaoDe(mod);
  if (!inst) { ui.notifications.warn(`${mod.name} não se instala pelo Tech.`); return null; }
  const { cabe, motivo } = cabeEm(arma, mod);
  if (!cabe) { ui.notifications.warn(`${mod.name} não cabe em ${arma.name}: ${motivo}.`); return null; }
  return pedir({
    teste: inst.teste, dv: inst.dv, mostrarDv: true, atores: [tech.uuid], acao: { tipo: TIPO, mod: mod.uuid, arma: arma.uuid },
    motivo: `Instalar ${mod.name} em ${arma.nomeDeExibicao} (${inst.tempo}). Na falha, a modificação não entra e não se perde.`
  });
}

// O resultado do teste (no mestre): passou, instala; falhou, avisa. O pedido se encerra.
async function aoTestar(mensagem, dados, indice) {
  if (dados.acao?.tipo !== TIPO || !game.user.isGM) return;
  const linha = dados.linhas[indice];
  if (linha?.estado !== 'rolou') return;
  const [mod, arma] = await Promise.all([fromUuid(dados.acao.mod), fromUuid(dados.acao.arma)]);
  if (mod && arma) {
    if (passou(linha.total, dados.dv)) await instalar(mod, arma, { por: linha.nome });
    else {
      await ChatMessage.implementation.create({
        speaker: { alias: arma.actor?.name ?? 'Mestre' },
        content: `<div class="${SISTEMA} cartao instalacao-mod falhou"><p><b>${esc(linha.nome)}</b> não conseguiu instalar <b>${esc(mod.name)}</b> em <b>${esc(arma.nomeDeExibicao)}</b>: a modificação não entrou e continua inteira. Dá para tentar de novo outro dia.</p></div>`
      });
    }
  }
  if (dados.aberto && mensagem) await encerrarPedido(mensagem.id);
}

// A janela do mestre: a arma, o Tech e o jeito (o teste do Tech da mesa ou direto, o Tech NPC). de: o jogador que pediu.
export async function abrirInstalacao({ mod, arma = null, de = null } = {}) {
  if (!game.user.isGM) return pedirInstalacao(mod);
  const inst = instalacaoDe(mod);
  if (!inst || !mod.actor) { ui.notifications.warn(`${mod.name} não se instala pelo Tech${inst ? ': ela precisa estar com o dono da arma' : ''}.`); return null; }
  const armas = armasOndeCabe(mod);
  if (!armas.length) { ui.notifications.warn(`${mod.name} não cabe em nenhuma arma de ${mod.actor.name}.`); return null; }
  const techs = techsDaMesa();
  const techInicial = techs.find(ator => ator.id === mod.actor.id) ?? techs[0];
  const opcoes = (lista, atual) => lista.map(item => `<option value="${item.id}"${item.id === atual?.id ? ' selected' : ''}>${esc(item.nomeDeExibicao ?? item.name)}</option>`).join('');
  const escolha = await DialogV2.wait({
    window: { title: 'Instalar a modificação', icon: 'fa-solid fa-screwdriver-wrench' },
    classes: [SISTEMA, 'instalacao-da-mod', 'themed', 'theme-dark'],
    position: { width: 460 },
    rejectClose: false,
    content: `${de ? `<p><b>${esc(de)}</b> pede a instalação.</p>` : ''}<p><b>${esc(mod.name)}</b> (de ${esc(mod.actor.name)}). ${esc(textoDaRegra(inst))}</p>
      <div class="form-group"><label>Na arma <select name="arma">${opcoes(armas, armas.find(item => item.id === arma?.id) ?? armas[0])}</select></label></div>
      <div class="form-group"><label>O Tech da mesa <select name="tech">${techs.length ? opcoes(techs, techInicial) : '<option value="">Nenhum personagem Tech</option>'}</select></label></div>`,
    buttons: [
      { action: 'tech', label: 'Pedir o teste ao Tech', icon: 'fa-solid fa-dice-d10', default: true, callback: (evento, botao) => ({ jeito: 'tech', arma: botao.form.elements.arma.value, tech: botao.form.elements.tech.value }) },
      { action: 'direto', label: 'Instalar sem teste (Tech NPC)', icon: 'fa-solid fa-check', callback: (evento, botao) => ({ jeito: 'direto', arma: botao.form.elements.arma.value }) },
      { action: 'recusar', label: de ? 'Recusar' : 'Cancelar', icon: 'fa-solid fa-xmark' }
    ]
  });
  if (!escolha || typeof escolha !== 'object') return null;
  const alvo = mod.actor.items.get(escolha.arma);
  if (!alvo) return null;
  if (escolha.jeito === 'direto') return instalar(mod, alvo, { por: '' });
  const tech = game.actors.get(escolha.tech);
  if (!tech) { ui.notifications.warn('Nenhum personagem Tech na mesa: instale sem teste (o Tech NPC).'); return null; }
  return pedirTesteDoTech({ mod, arma: alvo, tech });
}

// O jogador pede a instalação: escolhe a arma (quando há mais de uma onde cabe; a bancada da arma já diz qual) e avisa o
// mestre ativo.
export async function pedirInstalacao(mod, { arma: daBancada = null } = {}) {
  if (game.user.isGM) return abrirInstalacao({ mod, arma: daBancada });
  if (!mod?.isOwner || !instalacaoDe(mod)) return null;
  const armas = armasOndeCabe(mod);
  if (!armas.length) { ui.notifications.warn(`${mod.name} não cabe em nenhuma arma de ${mod.actor?.name ?? 'ninguém'}.`); return null; }
  if (!game.users.activeGM) { ui.notifications.warn('Nenhum mestre conectado: a instalação espera o mestre (o teste do Tech).'); return null; }
  let arma = armas.find(item => item.id === daBancada?.id) ?? armas[0];
  if (armas.length > 1 && !daBancada) {
    const id = await DialogV2.prompt({
      window: { title: 'Pedir a instalação' }, classes: [SISTEMA, 'pedir-instalacao'], rejectClose: false,
      content: `<label>Em qual arma <select name="arma">${armas.map(item => `<option value="${item.id}">${esc(item.nomeDeExibicao)}</option>`).join('')}</select></label>`,
      ok: { label: 'Pedir ao mestre', callback: (evento, botao) => botao.form.elements.arma.value }
    });
    arma = armas.find(item => item.id === id);
    if (!arma) return null;
  }
  game.socket.emit(CANAL, { tipo: TIPO, acao: 'pedir', mod: mod.uuid, arma: arma.uuid });
  ui.notifications.info(`Pedido ao mestre: instalar ${mod.name} em ${arma.nomeDeExibicao} (o teste do Tech).`);
  return true;
}

// O pedido do jogador chega ao mestre ativo: vale só de quem é dono da modificação.
async function receberPedido({ mod: uuid, arma: armaUuid }, remetente) {
  const quem = game.users.get(remetente);
  const mod = await fromUuid(uuid);
  if (!quem || !mod?.actor?.testUserPermission(quem, 'OWNER')) return;
  const arma = await fromUuid(armaUuid);
  return abrirInstalacao({ mod, arma: arma?.actor?.id === mod.actor.id ? arma : null, de: quem.name });
}

export function registrarInstalacao() {
  aoResultado(aoTestar);
}
export function registrarSocketDaInstalacao() {
  game.socket.on(CANAL, (mensagem, remetente) => {
    if (mensagem?.tipo !== TIPO || mensagem.acao !== 'pedir' || !souOMestreAtivo()) return;
    receberPedido(mensagem, remetente).catch(erro => console.error(`${SISTEMA} | instalação da modificação`, erro));
  });
}

export const API = { instalacaoDe, armasOndeCabe, techsDaMesa, instalar, tirar, pedirTesteDoTech, abrirInstalacao, pedirInstalacao };
