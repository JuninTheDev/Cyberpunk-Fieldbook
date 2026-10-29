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
  if (!['correcao', 'tratamento'].includes(tipo)) return [];
  const dvs = tipo === 'correcao' ? sistema.paliativo : sistema.tratamento;
  return Object.entries(dvs ?? {}).filter(([chave, dv]) => Object.hasOwn(PERICIAS_DO_TRATAMENTO, chave) && dv > 0)
    .map(([chave, dv]) => ({ chave, ...PERICIAS_DO_TRATAMENTO[chave], dv }));
}

// Wiki, "Quem cura o quê", p. 223: Cybertecnologia substitui a perícia em partes cibernéticas, na mesma DV.
export const opcaoParaParteCibernetica = (opcao, cibernetica = false) => cibernetica
  ? { ...opcao, chave: 'cybertecnologia', id: 'cybertech', rotulo: 'Cybertecnologia', role: false } : opcao;

// O paliativo suspende também o +1 no Death Save, sem apagar a regra do item (decisão do usuário, 2026-10-20).
export const penalidadeDeDeathSave = itens => [...itens].filter(item => item.type === 'lesao' && item.system.aumentaDeathSave
  && !item.flags?.[SISTEMA]?.corrigida).length;

// O que o teste fez: 'curada' (a lesão sai), 'corrigida' (os efeitos desligam até o fim do dia) ou 'falhou'.
export function resultadoDoTratamento({ tipo, total, dv, sistema }) {
  if (!(total > dv)) return 'falhou';
  return tipo === 'tratamento' || resolveDeVez(sistema) ? 'curada' : 'corrigida';
}

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const TITULO = { correcao: 'Correção rápida', tratamento: 'Tratamento' };
const atorPresente = ator => ['personagem', 'capanga'].includes(ator?.type) && ator.isOwner && fromUuidSync(ator.uuid) === ator;
const podeMudar = lesao => lesao?.type === 'lesao' && lesao.isOwner && atorPresente(lesao.actor) && lesao.actor.items.get(lesao.id) === lesao;
const podeTratar = (lesao, tipo) => ['correcao', 'tratamento'].includes(tipo) && podeMudar(lesao)
  && (tipo !== 'correcao' || !lesao.getFlag(SISTEMA, 'corrigida'));
const tratamentosEmAndamento = new WeakSet();

// Quem pode tratar: os tokens selecionados de quem clica, o personagem dele e, na correção rápida, o próprio ferido.
function quemPodeTratar(lesao, tipo) {
  const ferido = lesao.actor;
  const lista = [...canvas.tokens?.controlled.map(token => token.actor) ?? [], game.user.character, tipo === 'correcao' ? ferido : null]
    .filter(ator => atorPresente(ator) && (tipo === 'correcao' || ator.uuid !== ferido.uuid));
  return [...new Map(lista.map(ator => [ator.uuid, ator])).values()];
}

// O botão da lesão: escolhe quem trata e a perícia, rola e aplica o resultado; o cartão diz o que aconteceu.
export async function tratarLesao(lesao, tipo) {
  if (!podeTratar(lesao, tipo)) return null;
  if (tratamentosEmAndamento.has(lesao)) return null;
  tratamentosEmAndamento.add(lesao);
  try {
    return await executarTratamento(lesao, tipo);
  } finally {
    tratamentosEmAndamento.delete(lesao);
  }
}

// Um segundo paliativo não pode observar os efeitos já desligados antes de a primeira marca terminar de gravar.
async function executarTratamento(lesao, tipo) {
  const ferido = lesao.actor;
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
      + `<label>Perícia <select name="opcao">${opcoes.map((opcao, i) => `<option value="${i}">${esc(opcao.rotulo)} DV${opcao.dv}</option>`).join('')}</select></label>`
      + '<label><input type="checkbox" name="cibernetica"> Parte cibernética: usar Cybertecnologia na DV escolhida</label>',
    ok: { label: 'Rolar', callback: (evento, botao) => ({ quem: botao.form.elements.quem.value, opcao: Number(botao.form.elements.opcao.value), cibernetica: botao.form.elements.cibernetica.checked }) }
  });
  if (!escolha) return null;
  const medico = quem.find(ator => ator.uuid === escolha.quem);
  const original = opcoes[escolha.opcao];
  const valida = () => podeTratar(lesao, tipo) && atorPresente(medico) && (tipo === 'correcao' || medico.uuid !== ferido.uuid)
    && original && opcoesDaLesao(lesao.system, tipo).some(opcao => opcao.chave === original.chave && opcao.dv === original.dv);
  if (!valida()) return null;
  const opcao = opcaoParaParteCibernetica(original, escolha.cibernetica);
  // O cartão do tratamento diz o total: o teste fica público, fora do modo do seletor do chat (o C33).
  const teste = opcao.role ? await medico.rolarRole(opcao.id, { modo: 'public' }) : await medico.rolarPericia(opcao.id, { modo: 'public' });
  if (!teste) {
    if (opcao.role) ui.notifications.warn(`${medico.name} não tem a Cirurgia (a do Medtech).`);
    return null;
  }
  if (!valida()) return null;
  const resultado = resultadoDoTratamento({ tipo, total: teste.total, dv: opcao.dv, sistema: lesao.system });
  const nome = lesao.name;
  if (resultado === 'curada') await lesao.delete();
  if (resultado === 'corrigida') {
    const efeitos = lesao.effects.filter(efeito => efeito.active).map(efeito => efeito.id);
    if (efeitos.length) await lesao.updateEmbeddedDocuments('ActiveEffect', efeitos.map(id => ({ _id: id, disabled: true })));
    await lesao.setFlag(SISTEMA, 'corrigida', { por: medico.name, efeitos });
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
  if (!podeMudar(lesao)) return null;
  const corrigida = lesao.getFlag(SISTEMA, 'corrigida');
  if (!corrigida) return null;
  // A marca anterior ao C19 não guardava IDs: nela, conserva o comportamento antigo de religar todos.
  const efeitos = lesao.effects.filter(efeito => !Array.isArray(corrigida.efeitos) || corrigida.efeitos.includes(efeito.id));
  if (efeitos.length) await lesao.updateEmbeddedDocuments('ActiveEffect', efeitos.map(efeito => ({ _id: efeito.id, disabled: false })));
  return lesao.unsetFlag(SISTEMA, 'corrigida');
}
