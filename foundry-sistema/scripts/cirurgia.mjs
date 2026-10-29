// A instalação e a retirada do cyberware com a cirurgia (o C41, parte 4; regras em regras-cirurgia.mjs). O botão
// "Instalar" da aba Cyberware abre a janela: onde (no mínimo o lugar da peça), quem opera (o ripperdoc, que cobra pelo
// extrato, ou um Medtech, que rola TECH + Cirurgia contra a DV do lugar) e a perda de Humanidade (rolada ou pela média).
// O "Instalado" abre a retirada: só tirar (a peça fica guardada) ou a cirurgia de um Medtech, que destrói a peça se
// falhar. O Shift pula a janela (instala pela média, sem cirurgia; tira sem cirurgia), como antes. O cartão diz o que
// aconteceu.
import { SISTEMA } from './config.mjs';
import { cirurgiaDeuCerto, LUGAR_DA_CIRURGIA, lugaresDaPeca, pedeCirurgia, planoDaInstalacao, planoDaRetirada } from './regras-cirurgia.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const atorPresente = ator => ['personagem', 'capanga'].includes(ator?.type) && ator.isOwner && fromUuidSync(ator.uuid) === ator;
const pecaDoAtor = (ator, item) => item?.type === 'cyberware' && atorPresente(ator) && ator.items.get(item.id) === item;
const podeOperar = ator => atorPresente(ator) && Boolean(ator.rolagemDeRole?.('cirurgia'));
const cirurgiasEmAndamento = new WeakSet();

// Quem opera: os tokens selecionados de quem clica, o personagem dele e, para o mestre, os personagens do mundo; só quem
// tem a Cirurgia (a do Medtech), nunca o próprio paciente.
function medtechsPara(paciente) {
  const lista = [...(canvas?.tokens?.controlled ?? []).map(token => token.actor), game.user.character,
    ...(game.user.isGM ? game.actors.filter(ator => ator.type === 'personagem') : [])]
    .filter(ator => podeOperar(ator) && ator.uuid !== paciente.uuid);
  return [...new Map(lista.map(ator => [ator.uuid, ator])).values()];
}

// Uma cirurgia por peça de cada vez (dois cliques não abrem duas janelas nem cobram duas vezes).
async function umaPorVez(item, fazer) {
  if (cirurgiasEmAndamento.has(item)) return null;
  cirurgiasEmAndamento.add(item);
  try {
    return await fazer();
  } finally {
    cirurgiasEmAndamento.delete(item);
  }
}

async function cartao(ator, falante, frase, dados) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: falante ?? ator }),
    content: `<div class="${SISTEMA} cartao cirurgia ${dados.resultado}"><p>${frase}</p></div>`,
    flags: { [SISTEMA]: { cirurgia: dados } }
  });
}

// "Instalar": a janela, a cirurgia e a instalação (fundacao: a do "+ Opção"). Devolve a perda de Humanidade, false se a
// cirurgia falhou ou null se não instalou (cancelou, não pode ou faltou dinheiro).
export async function instalarComCirurgia(ator, item, { fundacao = null } = {}) {
  if (!pecaDoAtor(ator, item) || item.system.instalado) return null;
  const instalar = ({ rolar, lugar }) => (fundacao ? ator.instalarOpcao(item, fundacao, { rolar, lugar }) : ator.instalarCyberware(item, { rolar, lugar }));
  if (!pedeCirurgia(item.system.local)) return instalar({ rolar: true, lugar: '' });
  return umaPorVez(item, () => executarInstalacao(ator, item, instalar));
}

async function executarInstalacao(ator, item, instalar) {
  const lugares = lugaresDaPeca(item.system.local);
  const medicos = medtechsPara(ator);
  const { DialogV2 } = foundry.applications.api;
  const temPerda = item.system.perdaHumanidade.formula && item.system.perdaHumanidade.formula !== '0';
  const escolha = await DialogV2.prompt({
    window: { title: `Instalar ${item.name} (${ator.name})` }, classes: [SISTEMA, 'instalar-cyberware'], rejectClose: false,
    content: `<label>Onde <select name="lugar">${lugares.map(lugar => `<option value="${lugar}">${LUGAR_DA_CIRURGIA[lugar].nome[0].toUpperCase()}${LUGAR_DA_CIRURGIA[lugar].nome.slice(1)}: DV${LUGAR_DA_CIRURGIA[lugar].dv}, ${LUGAR_DA_CIRURGIA[lugar].custo}eb</option>`).join('')}</select></label>`
      + `<label>Quem opera <select name="quem"><option value="">Ripperdoc (cobra o lugar)</option>${medicos.map(medico => `<option value="${medico.uuid}">${esc(medico.name)} (Medtech: TECH + Cirurgia contra a DV, sem cobrar)</option>`).join('')}</select></label>`
      + `<label><input type="checkbox" name="cobrar" checked> Cobrar do ripperdoc pelo extrato (Eurodólares de ${esc(ator.name)}: ${Number(ator.system.dinheiro) || 0}eb)</label>`
      + (temPerda ? `<label>Perda de Humanidade <select name="perda"><option value="rolar">Rolar (${esc(item.system.perdaHumanidade.formula)})</option><option value="media">Pela média (${item.system.perdaHumanidade.media})</option></select></label>` : ''),
    ok: { label: 'Instalar', callback: (evento, botao) => { const campos = botao.form.elements; return { lugar: campos.lugar.value, quem: campos.quem.value, cobrar: campos.cobrar.checked, rolar: campos.perda?.value !== 'media' }; } }
  });
  if (!escolha) return null;
  const medico = escolha.quem ? medicos.find(ator => ator.uuid === escolha.quem) : null;
  if (escolha.quem && !medico) return null;
  const valida = () => pecaDoAtor(ator, item) && !item.system.instalado && (!medico || podeOperar(medico));
  if (!valida()) return null;
  const plano = planoDaInstalacao({ local: item.system.local, lugar: escolha.lugar, quem: medico ? 'medtech' : 'ripperdoc', cobrar: escolha.cobrar, dinheiro: ator.system.dinheiro });
  if (plano.erro) { ui.notifications.warn(plano.erro); return null; }
  const dados = { tipo: 'instalacao', peca: item.name, paciente: ator.uuid, medico: medico?.uuid ?? null, lugar: plano.lugar, dv: plano.dv, total: null, custo: plano.custo, perda: null, resultado: 'instalada' };
  if (medico) {
    // O cartão da cirurgia diz o total: o teste fica público, fora do modo do seletor do chat (o C33), como no tratamento.
    const teste = await medico.rolarRole('cirurgia', { modo: 'public' });
    if (!teste) return null;
    if (!valida()) return null;
    dados.total = teste.total;
    if (!cirurgiaDeuCerto({ total: teste.total, dv: plano.dv })) {
      await cartao(ator, medico, `<b>${esc(medico.name)}</b> não conseguiu instalar ${esc(item.name)} em <b>${esc(ator.name)}</b> ${plano.onde} (Cirurgia ${teste.total} contra DV${plano.dv}): a peça continua inteira.`, { ...dados, resultado: 'falhou' });
      return false;
    }
  }
  if (plano.custo) await ator.mudarComExtrato('dinheiro', { acao: 'subtrair', valor: plano.custo, motivo: `Instalação de ${item.name} ${plano.onde}` });
  const perda = await instalar({ rolar: escolha.rolar, lugar: plano.lugar });
  dados.perda = typeof perda === 'number' ? perda : null;
  const como = medico ? `por <b>${esc(medico.name)}</b> (Cirurgia ${dados.total} contra DV${plano.dv})` : plano.custo ? `pelo ripperdoc: ${plano.custo}eb pelo extrato` : 'pelo ripperdoc, sem cobrar';
  await cartao(ator, medico, `${esc(item.name)} instalado em <b>${esc(ator.name)}</b> ${plano.onde}, ${como}.${dados.perda ? ` Perda de Humanidade: ${dados.perda}.` : ''}`, dados);
  return perda;
}

// "Instalado": a janela da retirada. Devolve 'tirada' (sem cirurgia), 'retirada' (a cirurgia deu certo), 'destruida' (a
// cirurgia falhou e a peça saiu da ficha) ou null.
export async function retirarComCirurgia(ator, item) {
  if (!pecaDoAtor(ator, item) || !item.system.instalado) return null;
  const plano = planoDaRetirada({ local: item.system.local, instaladaEm: item.getFlag(SISTEMA, 'cirurgia')?.lugar ?? '' });
  if (!plano) { await ator.desinstalarCyberware(item); return 'tirada'; }
  return umaPorVez(item, () => executarRetirada(ator, item, plano));
}

async function executarRetirada(ator, item, plano) {
  const medicos = medtechsPara(ator);
  const { DialogV2 } = foundry.applications.api;
  const escolha = await DialogV2.prompt({
    window: { title: `Retirar ${item.name} (${ator.name})` }, classes: [SISTEMA, 'retirar-cyberware'], rejectClose: false,
    content: `<p>Retirar sem destruir é a cirurgia de um Medtech: a DV da instalação (DV${plano.dv}, ${plano.onde}), ${plano.horas} horas. Se falhar, a peça é destruída.</p>`
      + `<label>Como <select name="como"><option value="">Só tirar (a peça fica guardada, sem rolagem)</option>${medicos.map(medico => `<option value="${medico.uuid}">Cirurgia de ${esc(medico.name)} (DV${plano.dv})</option>`).join('')}</select></label>`,
    ok: { label: 'Retirar', callback: (evento, botao) => ({ como: botao.form.elements.como.value }) }
  });
  if (!escolha) return null;
  const valida = () => pecaDoAtor(ator, item) && item.system.instalado;
  if (!escolha.como) {
    if (!valida()) return null;
    await ator.desinstalarCyberware(item);
    return 'tirada';
  }
  const medico = medicos.find(outro => outro.uuid === escolha.como);
  if (!medico || !podeOperar(medico) || !valida()) return null;
  const teste = await medico.rolarRole('cirurgia', { modo: 'public' });
  if (!teste || !valida()) return null;
  const deuCerto = cirurgiaDeuCerto({ total: teste.total, dv: plano.dv });
  const nome = item.name;
  await ator.desinstalarCyberware(item);
  if (!deuCerto) await item.delete();
  const dados = { tipo: 'retirada', peca: nome, paciente: ator.uuid, medico: medico.uuid, lugar: plano.lugar, dv: plano.dv, total: teste.total, resultado: deuCerto ? 'retirada' : 'destruida' };
  await cartao(ator, medico, deuCerto
    ? `<b>${esc(medico.name)}</b> retirou ${esc(nome)} de <b>${esc(ator.name)}</b> sem destruir (Cirurgia ${teste.total} contra DV${plano.dv}, ${plano.horas} horas): a peça fica guardada.`
    : `<b>${esc(medico.name)}</b> não conseguiu retirar ${esc(nome)} de <b>${esc(ator.name)}</b> inteiro (Cirurgia ${teste.total} contra DV${plano.dv}): a peça foi destruída.`, dados);
  return dados.resultado;
}
