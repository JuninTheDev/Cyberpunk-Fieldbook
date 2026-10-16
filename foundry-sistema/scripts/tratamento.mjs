// A correção rápida e o tratamento da lesão crítica (a wiki, "Dano e cura", p. 223; as maquetes do usuário: "Quick fix"
// e "Treat"). Quem trata rola TECH + a perícia + 1d10 contra a DV da lesão e precisa superá-la (p. 128). A correção
// rápida tira o efeito pelo resto do dia (1 minuto por tentativa; pode ser em si mesmo) e, na lesão sem tratamento (o
// Músculo rompido, o Objeto estranho alojado), resolve de vez; o tratamento tira de vez (4 horas; não em si mesmo). O
// sistema não tem relógio: a lesão corrigida fica marcada, com os efeitos desligados, e o "Voltou" liga de novo quando o
// dia acaba. As DVs são as da lesão (paliativo e tratamento; 0 = aquela perícia não serve).
import { SISTEMA } from './config.mjs';

// As perícias de cada DV: Primeiros Socorros e Paramédico são perícias; a Cirurgia é a do Medtech (a rolagem de Role).
export const PERICIAS_DO_TRATAMENTO = {
  primeirosSocorros: { id: 'first-aid', rotulo: 'Primeiros Socorros' },
  paramedico: { id: 'paramedic', rotulo: 'Paramédico' },
  cirurgia: { id: 'cirurgia', rotulo: 'Cirurgia', role: true }
};

// A lesão sem tratamento: a correção rápida resolve de vez (a wiki).
export const resolveDeVez = sistema => !sistema.tratamento?.paramedico && !sistema.tratamento?.cirurgia;

// As opções de uma lesão para um tipo ('correcao' ou 'tratamento'): a perícia e a DV, só as que servem.
export function opcoesDaLesao(sistema, tipo) {
  const dvs = tipo === 'correcao' ? sistema.paliativo : sistema.tratamento;
  return Object.entries(dvs ?? {}).filter(([, dv]) => dv > 0).map(([chave, dv]) => ({ chave, ...PERICIAS_DO_TRATAMENTO[chave], dv }));
}

// O que o teste fez: 'curada' (a lesão sai), 'corrigida' (os efeitos desligam até o fim do dia) ou 'falhou'.
export function resultadoDoTratamento({ tipo, total, dv, sistema }) {
  if (!(total > dv)) return 'falhou';
  return tipo === 'tratamento' || resolveDeVez(sistema) ? 'curada' : 'corrigida';
}

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const TITULO = { correcao: 'Correção rápida', tratamento: 'Tratamento' };

// Quem pode tratar: os tokens selecionados de quem clica, o personagem dele e, na correção rápida, o próprio ferido.
function quemPodeTratar(lesao, tipo) {
  const ferido = lesao.actor;
  const lista = [...canvas.tokens?.controlled.map(token => token.actor) ?? [], game.user.character, tipo === 'correcao' ? ferido : null]
    .filter(ator => ator?.isOwner && (tipo === 'correcao' || ator !== ferido));
  return [...new Map(lista.map(ator => [ator.uuid, ator])).values()];
}

// O botão da lesão: escolhe quem trata e a perícia, rola e aplica o resultado; o cartão diz o que aconteceu.
export async function tratarLesao(lesao, tipo) {
  const ferido = lesao.actor;
  if (lesao.type !== 'lesao' || !ferido) return null;
  const opcoes = opcoesDaLesao(lesao.system, tipo);
  if (!opcoes.length) { ui.notifications.warn(`${lesao.name} não tem ${TITULO[tipo].toLowerCase()}.`); return null; }
  const quem = quemPodeTratar(lesao, tipo);
  if (!quem.length) {
    ui.notifications.warn(tipo === 'tratamento' ? 'O tratamento não pode ser em si mesmo: selecione o token de quem trata.' : 'Selecione o token de quem trata.');
    return null;
  }
  const { DialogV2 } = foundry.applications.api;
  const escolha = await DialogV2.prompt({
    window: { title: `${TITULO[tipo]}: ${lesao.name} (${ferido.name})` }, classes: [SISTEMA, 'tratar-lesao'], rejectClose: false,
    content: `<label>Quem trata <select name="quem">${quem.map(ator => `<option value="${ator.uuid}">${esc(ator.name)}</option>`).join('')}</select></label>`
      + `<label>Perícia <select name="opcao">${opcoes.map((opcao, i) => `<option value="${i}">${esc(opcao.rotulo)} DV${opcao.dv}</option>`).join('')}</select></label>`,
    ok: { label: 'Rolar', callback: (evento, botao) => ({ quem: botao.form.elements.quem.value, opcao: Number(botao.form.elements.opcao.value) }) }
  });
  if (!escolha) return null;
  const medico = quem.find(ator => ator.uuid === escolha.quem);
  const opcao = opcoes[escolha.opcao];
  const teste = opcao.role ? await medico.rolarRole(opcao.id) : await medico.rolarPericia(opcao.id);
  if (!teste) {
    if (opcao.role) ui.notifications.warn(`${medico.name} não tem a Cirurgia (a do Medtech).`);
    return null;
  }
  const resultado = resultadoDoTratamento({ tipo, total: teste.total, dv: opcao.dv, sistema: lesao.system });
  const nome = lesao.name;
  if (resultado === 'curada') await lesao.delete();
  if (resultado === 'corrigida') {
    await lesao.updateEmbeddedDocuments('ActiveEffect', lesao.effects.map(efeito => ({ _id: efeito.id, disabled: true })));
    await lesao.setFlag(SISTEMA, 'corrigida', { por: medico.name });
  }
  const frase = {
    curada: `${tipo === 'tratamento' ? 'tratou' : 'resolveu de vez'} ${esc(nome)} de <b>${esc(ferido.name)}</b>`,
    corrigida: `fez a correção rápida de ${esc(nome)} de <b>${esc(ferido.name)}</b>: o efeito sai até o fim do dia`,
    falhou: `não conseguiu ${tipo === 'tratamento' ? 'tratar' : 'a correção rápida de'} ${esc(nome)} de <b>${esc(ferido.name)}</b>`
  }[resultado];
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: medico }),
    content: `<div class="${SISTEMA} cartao tratamento ${resultado}"><p><b>${esc(medico.name)}</b> ${frase} (${esc(opcao.rotulo)} ${teste.total} contra DV${opcao.dv}).</p></div>`,
    flags: { [SISTEMA]: { tratamento: { lesao: nome, ferido: ferido.uuid, medico: medico.uuid, tipo, pericia: opcao.chave, dv: opcao.dv, total: teste.total, resultado } } }
  });
  return resultado;
}

// O "Voltou": o dia acabou, e a lesão corrigida volta a valer (os efeitos ligam de novo).
export async function voltouALesao(lesao) {
  if (!lesao.getFlag(SISTEMA, 'corrigida')) return null;
  await lesao.updateEmbeddedDocuments('ActiveEffect', lesao.effects.map(efeito => ({ _id: efeito.id, disabled: false })));
  return lesao.unsetFlag(SISTEMA, 'corrigida');
}
