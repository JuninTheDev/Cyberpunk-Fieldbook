// O Cryopump e o Cryotank (o C41, parte 4; as regras em regras-cryo.mjs). Na aba Combate do ferido, "ESTASE" abre a
// janela: o dispositivo de um Medtech (os tokens selecionados, o personagem do usuário e, para o mestre, os personagens do
// mundo; nunca o próprio ferido), com as cargas do Cryopump e a recarga do vazio. O Cryopump gasta a carga; o Cryotank
// pede Tecnologia Médica DV13. A estase é um efeito no ferido ("Em estase"), com o HP da bolsa ou do tanque: enquanto ele
// tiver 1 HP ou mais, não há Death Save no turno (turnos.mjs), e o dano chega antes nele (AtorCPR.receberDano, como o
// escudo; o Desfazer devolve). No Cryotank, o descanso do C36 cura no dobro (estabilizar.mjs). "SAIR DA ESTASE" tira o
// efeito. Sem relógio: a semana do Cryopump fica no texto.
import { SISTEMA } from './config.mjs';
import { capacidadeDoCryopump, cargasDoCryopump, coberturaDaEstase, COBERTURA_DA_ESTASE, dispositivoCryo, DV_DO_CRYOTANK, estaseDeuCerto, estaseProtege, NOME_DO_DISPOSITIVO, planoDaEstase, pontosDeCriossistemas, RECARGA_DO_CRYOPUMP } from './regras-cryo.mjs';
import { iconeDoEfeito } from './regras-icones.mjs';

export const FLAG_ESTASE = 'estase';
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const catalogo = item => item.getFlag(SISTEMA, 'catalogo') ?? '';
const atorPresente = ator => ['personagem', 'capanga'].includes(ator?.type) && ator.isOwner && fromUuidSync(ator.uuid) === ator;
const ehMedtech = ator => atorPresente(ator) && Boolean(ator.rolagemDeRole?.('tecnologia-medica'));
const emAndamento = new WeakSet();

export const efeitoDaEstase = ator => ator?.effects?.find(efeito => efeito.getFlag(SISTEMA, FLAG_ESTASE)) ?? null;
export const estaseDe = ator => efeitoDaEstase(ator)?.getFlag(SISTEMA, FLAG_ESTASE) ?? null;
// Sem Death Save no turno: a bolsa ou o tanque com 1 HP ou mais.
export const semDeathSaveNaEstase = ator => estaseProtege(estaseDe(ator));

// O que a ficha mostra junto do ferimento: a marca com o HP da cobertura e, para quem edita, "ESTASE" (ferido, fora dela)
// ou "SAIR DA ESTASE".
export function contextoDaEstase(ator, editavel) {
  const estase = estaseDe(ator);
  const ferido = ['leve', 'grave', 'mortal'].includes(ator.system.ferimento?.chave);
  return { mostrar: Boolean(estase) || (editavel && ferido), ativa: Boolean(estase), rotulo: estase ? NOME_DO_DISPOSITIVO[estase.tipo] : '',
    hp: estase?.hp ?? 0, max: estase?.max ?? 0, protege: estaseProtege(estase), por: estase?.medico ?? '', entrar: editavel && !estase && ferido, sair: editavel && Boolean(estase) };
}

// Os dispositivos de quem pode operar: os Cryopumps e Cryotanks no inventário de cada Medtech.
function dispositivosPara(paciente) {
  const medicos = [...(canvas?.tokens?.controlled ?? []).map(token => token.actor), game.user.character,
    ...(game.user.isGM ? game.actors.filter(ator => ator.type === 'personagem') : [])]
    .filter(ator => ehMedtech(ator) && ator.uuid !== paciente.uuid);
  return [...new Map(medicos.map(ator => [ator.uuid, ator])).values()].flatMap(medico => medico.items
    .filter(item => item.type === 'equipamento' && dispositivoCryo(item.name, catalogo(item)))
    .map(item => ({ medico, item, tipo: dispositivoCryo(item.name, catalogo(item)), pontos: pontosDeCriossistemas(medico.system) })));
}

// Quantos estão em estase neste dispositivo (os atores do mundo e os tokens soltos da cena).
function ocupadosNo(item) {
  const atores = [...game.actors, ...(canvas?.scene?.tokens ?? []).filter(token => !token.actorLink).map(token => token.actor)].filter(Boolean);
  return new Set(atores.filter(ator => estaseDe(ator)?.dispositivo === item.uuid).map(ator => ator.uuid)).size;
}

const descricao = ({ medico, item, tipo, pontos }) => (tipo === 'cryotank'
  ? `${item.name} de ${medico.name} (Tecnologia Médica DV${DV_DO_CRYOTANK}; cobertura ${COBERTURA_DA_ESTASE.cryotank} HP)`
  : `${item.name} de ${medico.name} (${cargasDoCryopump(item.getFlag(SISTEMA, 'cargas'), pontos)}/${capacidadeDoCryopump(pontos).cargas} ${capacidadeDoCryopump(pontos).cargas === 1 ? 'carga' : 'cargas'}; cobertura ${COBERTURA_DA_ESTASE.cryopump} HP)`);

async function umaVez(ator, fazer) {
  if (emAndamento.has(ator)) return null;
  emAndamento.add(ator);
  try {
    return await fazer();
  } finally {
    emAndamento.delete(ator);
  }
}

async function cartao(falante, frase, dados) {
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: falante }),
    content: `<div class="${SISTEMA} cartao estase ${dados.resultado}"><p>${frase}</p></div>`, flags: { [SISTEMA]: { estase: dados } }
  });
}

// "ESTASE": a janela e a estase. Devolve 'estase', 'falhou' ou null.
export function porEmEstase(paciente) {
  if (!atorPresente(paciente) || estaseDe(paciente)) return null;
  return umaVez(paciente, () => executarEstase(paciente));
}

async function executarEstase(paciente) {
  const opcoes = dispositivosPara(paciente);
  if (!opcoes.length) { ui.notifications.warn('Nenhum Cryopump ou Cryotank de um Medtech: selecione o token do Medtech que tem um (só o Medtech opera).'); return null; }
  const { DialogV2 } = foundry.applications.api;
  const escolha = await DialogV2.prompt({
    window: { title: `Estase: ${paciente.name}` }, classes: [SISTEMA, 'por-em-estase'], rejectClose: false,
    content: `<p>O alvo aceita ou está inconsciente (o mestre confere). Na estase, sem Death Saves enquanto a bolsa ou o tanque tiver HP; eles valem como cobertura. O Cryopump segura por até uma semana; o Cryotank, pelo tempo que quiser, curando no dobro.</p>`
      + `<label>Dispositivo <select name="dispositivo">${opcoes.map((opcao, i) => `<option value="${i}">${esc(descricao(opcao))}</option>`).join('')}</select></label>`
      + `<label><input type="checkbox" name="recarregar"> Recarregar o Cryopump vazio antes (${RECARGA_DO_CRYOPUMP}eb por carga, do Medtech)</label>`,
    ok: { label: 'Pôr em estase', callback: (evento, botao) => ({ indice: Number(botao.form.elements.dispositivo.value), recarregar: botao.form.elements.recarregar.checked }) }
  });
  if (!escolha) return null;
  const opcao = opcoes[escolha.indice];
  const valida = () => atorPresente(paciente) && !estaseDe(paciente) && opcao && ehMedtech(opcao.medico) && opcao.medico.items.get(opcao.item.id) === opcao.item;
  if (!valida()) return null;
  const { medico, item, tipo, pontos } = opcao;
  const plano = planoDaEstase({ tipo, cargas: item.getFlag(SISTEMA, 'cargas'), pontos, ocupados: ocupadosNo(item), recarregar: escolha.recarregar, dinheiro: medico.system.dinheiro });
  if (plano.erro) { ui.notifications.warn(plano.erro); return null; }
  const dados = { tipo, paciente: paciente.uuid, medico: medico.uuid, dispositivo: item.uuid, hp: plano.hp, total: null, recarga: plano.recarga, cargas: plano.cargasDepois, resultado: 'estase' };
  if (plano.rola) {
    // O teste sai público, como a terapia e o tratamento (o C33).
    const teste = await medico.rolarRole('tecnologia-medica', { sabor: `Cryotank: ${paciente.name} em estase, contra a DV${DV_DO_CRYOTANK}`, modo: 'public' });
    if (!teste || !valida()) return null;
    dados.total = teste.total;
    if (!estaseDeuCerto(teste.total)) {
      await cartao(medico, `<b>${esc(medico.name)}</b> não conseguiu pôr <b>${esc(paciente.name)}</b> em estase no ${esc(item.name)} (Tecnologia Médica ${teste.total} contra DV${DV_DO_CRYOTANK}).`, { ...dados, resultado: 'falhou' });
      return 'falhou';
    }
  } else {
    if (plano.recarga) await medico.mudarComExtrato('dinheiro', { acao: 'subtrair', valor: plano.recarga, motivo: `Recarga do ${item.name}: ${plano.recarregadas} ${plano.recarregadas === 1 ? 'carga' : 'cargas'}` });
    await item.setFlag(SISTEMA, 'cargas', plano.cargasDepois);
  }
  await paciente.createEmbeddedDocuments('ActiveEffect', [{
    name: `Em estase (${NOME_DO_DISPOSITIVO[tipo]})`, img: iconeDoEfeito('estase'),
    flags: { [SISTEMA]: { [FLAG_ESTASE]: { tipo, hp: plano.hp, max: plano.hp, dispositivo: item.uuid, medico: medico.name } } }
  }]);
  const como = plano.rola ? ` (Tecnologia Médica ${dados.total} contra DV${DV_DO_CRYOTANK})`
    : `: ${plano.recarga ? `recarregou ${plano.recarregadas} (${plano.recarga}eb) e ` : ''}gastou 1 carga (${plano.cargasDepois} ${plano.cargasDepois === 1 ? 'resta' : 'restam'})`;
  await cartao(medico, `<b>${esc(medico.name)}</b> pôs <b>${esc(paciente.name)}</b> em estase no ${esc(item.name)}${como}. Sem Death Saves enquanto ${tipo === 'cryotank' ? 'o tanque' : 'a bolsa'} tiver HP (cobertura ${plano.hp} HP).`, dados);
  return 'estase';
}

// "SAIR DA ESTASE": tira o efeito; o cartão diz como ficou a cobertura.
export async function sairDaEstase(paciente) {
  const efeito = efeitoDaEstase(paciente);
  if (!atorPresente(paciente) || !efeito) return null;
  const estase = efeito.getFlag(SISTEMA, FLAG_ESTASE);
  await efeito.delete();
  await cartao(paciente, `<b>${esc(paciente.name)}</b> saiu da estase do ${NOME_DO_DISPOSITIVO[estase.tipo]} (cobertura ${estase.hp}/${estase.max} HP).`, { tipo: estase.tipo, paciente: paciente.uuid, resultado: 'saiu' });
  return 'saiu';
}

// O dano na cobertura da estase (AtorCPR.receberDano): grava o HP novo e devolve o que ela segurou e se o dano passa.
export async function danoNaEstase(ator, { dano, explosivo }) {
  const efeito = efeitoDaEstase(ator);
  const estase = efeito?.getFlag(SISTEMA, FLAG_ESTASE);
  if (!estaseProtege(estase)) return null;
  const conta = coberturaDaEstase({ hp: estase.hp, dano, explosivo });
  await efeito.update({ [`flags.${SISTEMA}.${FLAG_ESTASE}.hp`]: conta.hp });
  return { ...conta, rotulo: estase.tipo === 'cryotank' ? 'O Cryotank' : 'A bolsa do Cryopump' };
}

// O Desfazer do dano: a cobertura volta pela diferença, até o máximo.
export async function desfazerDanoNaEstase(ator, absorveu) {
  const efeito = efeitoDaEstase(ator);
  const estase = efeito?.getFlag(SISTEMA, FLAG_ESTASE);
  if (!estase || !absorveu) return;
  await efeito.update({ [`flags.${SISTEMA}.${FLAG_ESTASE}.hp`]: Math.min(estase.max, estase.hp + absorveu) });
}

export const API = { porEmEstase, sairDaEstase, estaseDe };
