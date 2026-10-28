// A terapia e a ciberpsicose (o C21; a wiki, "Humanidade, terapia e drogas": Terapia, p. 229–230, e Ciberpsicose, p.
// 230–232). O CORE 0.92.4 só avisa quando a Humanidade chega a 0 ao instalar cyberware ("Cyberpsychosis has set in"); as
// regras vêm da wiki.
// A terapia: um Medtech (não em si mesmo) rola TECH + Tecnologia Médica + 1d10 e precisa superar a DV (p. 128). A de perda
// de Humanidade padrão (DV15) devolve 2d6; a extrema (DV17), 4d6; as duas sem passar da Humanidade máxima (cada peça
// instalada tira 2 do máximo; o borgware, 4). A de dependência (DV15) livra de um vício e, por um ano, quem se tratou falha
// sozinho no teste contra o efeito secundário daquela droga. Cada terapia leva uma semana; se falhar, a semana e os
// materiais se perdem. O custo e os materiais vão no cartão: quem paga é a mesa.
// A ciberpsicose: o estado mental pela EMP de agora (a dezena da Humanidade), e a extrema com a Humanidade negativa (o
// personagem passa para o mestre até a Humanidade ficar positiva). O cartão avisa quando o estado piora.
import { SISTEMA } from './config.mjs';
import { empAtual } from './regras.mjs';

// ---------------- As contas (o teste roda estas no Node) ----------------
export const TERAPIAS = {
  padrao: { rotulo: 'Perda de Humanidade padrão', dv: 15, ganho: '2d6', custo: 500, materiais: 100 },
  extrema: { rotulo: 'Perda de Humanidade extrema', dv: 17, ganho: '4d6', custo: 1000, materiais: 500 },
  dependencia: { rotulo: 'Dependência', dv: 15, custo: 1000, materiais: 500 }
};
// Um ano de jogo, em segundos (o relógio do mundo): a terapia de dependência vale por ele.
export const UM_ANO = 365 * 24 * 3600;

// O teste da terapia: precisa superar a DV.
export const passouNaTerapia = (total, dv) => total > dv;

// A Humanidade depois do ganho: sem passar da máxima (quem já está acima dela não perde nada).
export const humanidadeDepoisDaTerapia = (atual, max, ganho) => Math.max(atual, Math.min(max, atual + ganho));

// O estado mental pela tabela da wiki: pela EMP de agora; a Humanidade negativa, extrema.
export const ESTADOS_MENTAIS = {
  nenhum: { rotulo: 'Sem ciberpsicose', efeito: 'Nenhum: sem ciberpsicose nem transtorno dissociativo.' },
  limitrofe: { rotulo: 'Transtorno dissociativo limítrofe', efeito: 'O jogador interpreta o distanciamento (assistir à própria vida como a um filme chato).' },
  dissociativo: { rotulo: 'Ciberpsicose limítrofe', efeito: 'Transtorno dissociativo, ciberpsicose limítrofe: mostra com força pelo menos 3 traços da lista de Hare.' },
  ciberpsicose: { rotulo: 'Ciberpsicose', efeito: 'Mostra com força pelo menos 5 traços da lista de Hare.' },
  extrema: { rotulo: 'Ciberpsicose extrema', efeito: 'O personagem passa para o mestre, que o interpreta pelas piores tendências dele, até a Humanidade ficar positiva de novo.' }
};
export const ORDEM_DOS_ESTADOS = ['nenhum', 'limitrofe', 'dissociativo', 'ciberpsicose', 'extrema'];
export const TRACOS_DE_HARE = ['Senso grandioso de si mesmo', 'Necessidade de estímulo', 'Astúcia e manipulação', 'Falta de remorso ou culpa', 'Insensibilidade e falta de empatia', 'Pouco controle do próprio comportamento', 'Impulsividade', 'Não aceitar a responsabilidade pelos próprios atos', 'Versatilidade criminal'];
export function estadoMental(humanidade, empBase) {
  if (Number(humanidade) < 0) return 'extrema';
  const emp = empAtual(humanidade, empBase);
  return emp >= 3 ? 'nenhum' : emp === 2 ? 'limitrofe' : emp === 1 ? 'dissociativo' : 'ciberpsicose';
}
// Piorou: do estado de antes para um mais grave (o cartão avisa).
export const piorou = (antes, depois) => ORDEM_DOS_ESTADOS.indexOf(depois) > ORDEM_DOS_ESTADOS.indexOf(antes);

// A terapia de dependência vale por um ano para aquela droga (o catálogo; sem ele, o nome): a lista na flag do paciente.
export const chaveDaDroga = ({ catalogo, nome }) => catalogo || nome;
export const dependenciaTratada = (lista, chave, agora) => (lista ?? []).some(item => item.droga === chave && item.ate > agora);
export const comDependenciaTratada = (lista, chave, agora) => [...(lista ?? []).filter(item => item.droga !== chave && item.ate > agora), { droga: chave, ate: agora + UM_ANO }];

// ---------------- No Foundry ----------------
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
export const FLAG_DEPENDENCIAS = 'terapiasDeDependencia';
const TIPOS_COM_HUMANIDADE = ['personagem', 'capanga'];

// Quem pode fazer a terapia: os tokens selecionados de quem clica e o personagem dele, com a Tecnologia Médica (a do
// Medtech), menos o paciente (o Medtech não faz terapia em si mesmo).
function quemPodeTratar(paciente) {
  const lista = [...(canvas.tokens?.controlled.map(token => token.actor) ?? []), game.user.character]
    .filter(ator => ator?.isOwner && ator.uuid !== paciente.uuid && ator.rolagemDeRole?.('tecnologia-medica'));
  return [...new Map(lista.map(ator => [ator.uuid, ator])).values()];
}
const viciosDe = paciente => paciente.items.filter(item => item.type === 'droga' && item.getFlag(SISTEMA, 'viciado'));

// O botão "Terapia" da aba Cyberware: escolhe quem trata, a terapia e (na de dependência) o vício; rola a Tecnologia
// Médica contra a DV; passando, devolve a Humanidade (sem passar da máxima) ou tira o vício. O cartão diz o que aconteceu,
// com o custo e os materiais.
export async function fazerTerapia(paciente) {
  if (!TIPOS_COM_HUMANIDADE.includes(paciente?.type)) return null;
  const quem = quemPodeTratar(paciente);
  if (!quem.length) { ui.notifications.warn('A terapia é de um Medtech (a Tecnologia Médica), e não em si mesmo: selecione o token de quem trata.'); return null; }
  const vicios = viciosDe(paciente);
  const tipos = Object.entries(TERAPIAS).filter(([chave]) => chave !== 'dependencia' || vicios.length);
  const { DialogV2 } = foundry.applications.api;
  const escolha = await DialogV2.prompt({
    window: { title: `Terapia: ${paciente.name}` }, classes: [SISTEMA, 'terapia'], rejectClose: false,
    content: `<label>Quem trata <select name="quem">${quem.map(ator => `<option value="${ator.uuid}">${esc(ator.name)}</option>`).join('')}</select></label>`
      + `<label>Terapia <select name="tipo">${tipos.map(([chave, t]) => `<option value="${chave}">${esc(t.rotulo)} (DV${t.dv}${t.ganho ? `, +${t.ganho} de Humanidade` : ''})</option>`).join('')}</select></label>`
      + (vicios.length ? `<label>Vício (na de dependência) <select name="vicio">${vicios.map(droga => `<option value="${droga.id}">${esc(droga.name)}</option>`).join('')}</select></label>` : '')
      + '<p class="dica">Uma semana inteira; se falhar, a semana e os materiais se perdem.</p>',
    ok: { label: 'Rolar', callback: (evento, botao) => ({ quem: botao.form.elements.quem.value, tipo: botao.form.elements.tipo.value, vicio: botao.form.elements.vicio?.value ?? '' }) }
  });
  if (!escolha) return null;
  const medico = quem.find(ator => ator.uuid === escolha.quem);
  const terapia = TERAPIAS[escolha.tipo];
  const droga = escolha.tipo === 'dependencia' ? paciente.items.get(escolha.vicio) : null;
  if (!medico || !terapia || (escolha.tipo === 'dependencia' && !droga)) return null;
  // O cartão da terapia diz o total: o teste fica público, fora do modo do seletor do chat (o C33).
  const teste = await medico.rolarRole('tecnologia-medica', { sabor: `Terapia de ${terapia.rotulo} em ${paciente.name}, contra a DV${terapia.dv}`, modo: 'public' });
  if (!teste) return null;
  const passou = passouNaTerapia(teste.total, terapia.dv);
  const contra = `Tecnologia Médica ${teste.total} contra DV${terapia.dv}`;
  const custo = `Custo: ${terapia.custo}eb; materiais: ${terapia.materiais}eb; uma semana.`;
  const rolls = [];
  let frase;
  if (!passou) frase = `não conseguiu a terapia de ${esc(terapia.rotulo)} de <b>${esc(paciente.name)}</b> (${contra}): a semana e os materiais se perdem.`;
  else if (terapia.ganho) {
    const roll = await new Roll(terapia.ganho).evaluate();
    rolls.push(roll);
    const { value: antes, max } = paciente.system.humanidade;
    const depois = humanidadeDepoisDaTerapia(antes, max, roll.total);
    await paciente.update({ 'system.humanidade.value': depois });
    frase = `fez a terapia de ${esc(terapia.rotulo)} de <b>${esc(paciente.name)}</b> (${contra}): ${terapia.ganho} = ${roll.total}; Humanidade ${antes} → ${depois}${depois < antes + roll.total ? ` (a máxima é ${max})` : ''}.`;
  } else {
    await livrarDoVicio(paciente, droga);
    frase = `livrou <b>${esc(paciente.name)}</b> do vício em ${esc(droga.name)} (${contra}): por um ano, falha sozinho no teste contra o efeito secundário dela.`;
  }
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: medico }), rolls,
    content: `<div class="${SISTEMA} cartao terapia ${passou ? 'passou' : 'falhou'}"><p><b>${esc(medico.name)}</b> ${frase}</p><p class="sabor">${custo}</p></div>`,
    flags: { [SISTEMA]: { terapia: { paciente: paciente.uuid, medico: medico.uuid, tipo: escolha.tipo, droga: droga?.name ?? null, dv: terapia.dv, total: teste.total, passou, ganho: rolls[0]?.total ?? null } } }
  });
  return passou;
}

// Tira o vício (a flag e o efeito do vício) e marca a dependência tratada por um ano.
async function livrarDoVicio(paciente, droga) {
  const efeito = droga.effects.find(e => / Addiction$/.test(e.name));
  if (efeito && !efeito.disabled) await efeito.update({ disabled: true });
  await droga.unsetFlag(SISTEMA, 'viciado');
  const chave = chaveDaDroga({ catalogo: droga.getFlag(SISTEMA, 'catalogo'), nome: droga.name });
  return paciente.setFlag(SISTEMA, FLAG_DEPENDENCIAS, comDependenciaTratada(paciente.getFlag(SISTEMA, FLAG_DEPENDENCIAS), chave, game.time.worldTime));
}

// O aviso da ciberpsicose (o "Cyberpsychosis has set in" do CORE): quando o estado mental piora, um cartão para o mestre e
// os donos do personagem, com o efeito da tabela. Chamado pelo AtorCPR no cliente de quem mudou a Humanidade.
export function avisarCiberpsicose(ator, antes) {
  const depois = estadoMental(ator.system.humanidade.value, ator.system.atributos.emp.valor);
  if (!piorou(antes, depois)) return null;
  const estado = ESTADOS_MENTAIS[depois];
  const tracos = ['dissociativo', 'ciberpsicose'].includes(depois) ? `<p class="sabor">Traços de Hare: ${TRACOS_DE_HARE.join('; ')}.</p>` : '';
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    whisper: game.users.filter(usuario => usuario.isGM || ator.testUserPermission(usuario, 'OWNER')).map(usuario => usuario.id),
    content: `<div class="${SISTEMA} cartao ciberpsicose ${depois}"><p><b>${esc(ator.name)}</b>: Humanidade ${ator.system.humanidade.value} (EMP ${ator.system.empAtual}). <b>${esc(estado.rotulo)}.</b> ${esc(estado.efeito)}</p>${tracos}</div>`,
    flags: { [SISTEMA]: { ciberpsicose: { antes, depois, humanidade: ator.system.humanidade.value } } }
  });
}
