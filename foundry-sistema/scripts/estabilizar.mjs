// Estabilizar e descansar (o C36; a wiki, system-rules.js:552, p. 222–223; a conta em regras-estabilizar.mjs). O CORE
// 0.92.4 não tem nenhum dos dois. Estabilizar é como a correção rápida da lesão (tratamento.mjs): quem estabiliza (os tokens
// selecionados de quem clica, o personagem dele e o próprio ferido) rola TECH + Primeiros Socorros ou Paramédico + 1d10 e
// precisa superar a DV do estado de ferimento. Passou: o ferido fica marcado como estabilizado; o mortalmente ferido volta
// a 1 HP, com o Death Save de base, e fica inconsciente por 1 minuto. Com 1 HP, o Death Save do turno (turnos.mjs) já não
// roda. O dano novo (o HP que cai) tira a marca: ele "ainda rola Death Save se for atacado" (:552), e a cura natural pede
// estabilizar de novo. Descansar (o mestre ou o dono): por dia inteiro, o estabilizado recupera HP igual ao BODY (× 2 com o
// Reinforced Antibodies) e 1 SP em cada local do Skin Weave e do Subdermal Armor instalados; sem a marca, recusa.
import { SISTEMA } from './config.mjs';
import { naVezDoAtor } from './perigos.mjs';
import { curaNaFicha, curaNatural, dvDeEstabilizar, ehAnticorpos, implanteDeSp, PERICIAS_DE_ESTABILIZAR, resultadoDeEstabilizar, spDepoisDoDescanso } from './regras-estabilizar.mjs';

export const FLAG_ESTABILIZADO = 'estabilizado';
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const catalogo = item => item.getFlag(SISTEMA, 'catalogo') ?? '';
const atorPresente = ator => ['personagem', 'capanga'].includes(ator?.type) && ator.isOwner && fromUuidSync(ator.uuid) === ator;
export const estaEstabilizado = ator => Boolean(ator?.getFlag(SISTEMA, FLAG_ESTABILIZADO));
// A marca e os botões da ficha (regras-estabilizar.curaNaFicha).
export const contextoDaCura = (ator, editavel) => curaNaFicha({ ferimento: ator.system.ferimento.chave, estabilizado: estaEstabilizado(ator), editavel });

// Um por ator neste cliente, também durante a janela: o clique duplo não rola duas vezes nem descansa duas vezes.
const emAndamento = new Set();
async function naVez(ator, tarefa) {
  if (!atorPresente(ator) || emAndamento.has(ator.uuid)) return null;
  emAndamento.add(ator.uuid);
  try {
    return await tarefa(ator);
  } finally {
    emAndamento.delete(ator.uuid);
  }
}

// Quem pode estabilizar: os tokens selecionados de quem clica, o personagem dele e o próprio ferido (a wiki não proíbe; a
// correção rápida, da mesma perícia, pode ser em si mesmo).
function quemPodeEstabilizar(ferido) {
  const lista = [...canvas.tokens?.controlled.map(token => token.actor) ?? [], game.user.character, ferido].filter(atorPresente);
  return [...new Map(lista.map(ator => [ator.uuid, ator])).values()];
}

// O botão "Estabilizar": escolhe quem estabiliza e a perícia, rola e aplica; o cartão diz o que aconteceu.
export function estabilizar(ferido) { return naVez(ferido, executarEstabilizar); }
async function executarEstabilizar(ferido) {
  const ferimento = ferido.system.ferimento;
  const dv = dvDeEstabilizar(ferimento.chave);
  if (!dv) { ui.notifications.info(`${ferido.name} não está ferido: não há o que estabilizar.`); return null; }
  if (estaEstabilizado(ferido)) { ui.notifications.info(`${ferido.name} já está estabilizado.`); return null; }
  const quem = quemPodeEstabilizar(ferido);
  const escolha = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Estabilizar: ${ferido.name} (${ferimento.rotulo})` }, classes: [SISTEMA, 'estabilizar'], rejectClose: false,
    content: `<label>Quem estabiliza <select name="quem">${quem.map(ator => `<option value="${ator.uuid}">${esc(ator.name)}</option>`).join('')}</select></label>`
      + `<label>Perícia <select name="pericia">${PERICIAS_DE_ESTABILIZAR.map((pericia, i) => `<option value="${i}">${esc(pericia.rotulo)} DV${dv}</option>`).join('')}</select></label>`
      + '<p class="dica">Uma Ação: TECH + a perícia + 1d10 precisa superar a DV.</p>',
    ok: { label: 'Rolar', callback: (evento, botao) => ({ quem: botao.form.elements.quem.value, pericia: Number(botao.form.elements.pericia.value) }) }
  });
  if (!escolha) return null;
  const medico = quem.find(ator => ator.uuid === escolha.quem);
  const pericia = PERICIAS_DE_ESTABILIZAR[escolha.pericia];
  // Antes e depois de rolar, de novo (como o tratamento): o ferido, quem estabiliza e o estado de ferimento (a DV).
  const valida = () => atorPresente(ferido) && atorPresente(medico) && Boolean(pericia) && ferido.system.ferimento.chave === ferimento.chave && !estaEstabilizado(ferido);
  if (!valida()) return null;
  // O cartão diz o total: o teste fica público, fora do modo do seletor do chat (o C33).
  const teste = await medico.rolarPericia(pericia.id, { modo: 'public' });
  if (!teste || !valida()) return null;
  // A gravação na fila do ator (perigos.naVezDoAtor), com os ticks dos perigos do turno, que também mudam o HP.
  const resultado = await naVezDoAtor(ferido, async atual => {
    if (!valida()) return null;
    const conta = resultadoDeEstabilizar({ ferimento: ferimento.chave, total: teste.total, hp: atual.system.hp.value });
    if (!conta.passou) return conta;
    await atual.update({
      [`flags.${SISTEMA}.${FLAG_ESTABILIZADO}`]: { por: medico.name, ferimento: ferimento.chave },
      ...(conta.hp === atual.system.hp.value ? {} : { 'system.hp.value': conta.hp }),
      ...(conta.zerarDeathSave ? { 'system.deathSave.penalidade': 0 } : {})
    });
    // Uma gravação que um gancho cortou não se anuncia.
    if (!estaEstabilizado(atual)) return null;
    if (conta.inconsciente) await inconscientePorUmMinuto(atual);
    return conta;
  });
  if (!resultado) return null;
  const contra = `${esc(pericia.rotulo)} ${teste.total} contra DV${resultado.dv}`;
  const frase = !resultado.passou ? `não conseguiu estabilizar <b>${esc(ferido.name)}</b> (${contra}).`
    : `estabilizou <b>${esc(ferido.name)}</b> (${contra}): ${resultado.inconsciente ? 'volta a 1 HP e fica inconsciente por 1 minuto' : 'recupera HP pelo descanso'}.`;
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: medico }),
    content: `<div class="${SISTEMA} cartao estabilizar ${resultado.passou ? 'estabilizado' : 'falhou'}"><p><b>${esc(medico.name)}</b> ${frase}</p></div>`,
    flags: { [SISTEMA]: { estabilizar: { ferido: ferido.uuid, medico: medico.uuid, ferimento: ferimento.chave, pericia: pericia.chave, dv: resultado.dv, total: teste.total, resultado: resultado.passou ? 'estabilizado' : 'falhou' } } }
  });
  return resultado.passou ? 'estabilizado' : 'falhou';
}

// Inconsciente por 1 minuto (:552): o estado do Foundry com a duração de 60 segundos no relógio do mundo (como as drogas,
// drogas.mjs; no combate, as rodadas de 3 segundos, iniciativa.mjs). O Foundry o acaba sozinho (a expiração nativa: o
// DadosEfeito.isSuppressed devolve null). O efeito de uma estabilização anterior sai antes.
async function inconscientePorUmMinuto(ator) {
  const anteriores = ator.effects.filter(efeito => efeito.getFlag(SISTEMA, FLAG_ESTABILIZADO)).map(efeito => efeito.id);
  if (anteriores.length) await ator.deleteEmbeddedDocuments('ActiveEffect', anteriores);
  const efeito = await ActiveEffect.implementation.fromStatusEffect('unconscious', { parent: ator });
  efeito.updateSource({ name: 'Estabilizado: inconsciente', duration: { value: 60, units: 'seconds' }, [`flags.${SISTEMA}`]: { [FLAG_ESTABILIZADO]: true } });
  await ActiveEffect.implementation.create(efeito.toObject(), { parent: ator });
}

// O botão "Descansar": quantos dias inteiros; o estabilizado recupera o HP e o SP dos implantes; o cartão diz o que voltou.
export function descansar(ator) { return naVez(ator, executarDescanso); }
async function executarDescanso(ator) {
  const recusar = () => { ui.notifications.warn(`${ator.name} não está estabilizado: a cura natural é de quem foi estabilizado (Estabilizar, junto do ferimento).`); return null; };
  if (!estaEstabilizado(ator)) return recusar();
  const dias = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Descansar: ${ator.name}` }, classes: [SISTEMA, 'descansar'], rejectClose: false,
    content: '<label>Dias inteiros de descanso <input type="number" name="dias" value="1" min="1" step="1" autofocus></label>'
      + '<p class="dica">Por dia: HP igual ao BODY (× 2 com o Reinforced Antibodies), até o máximo; 1 SP em cada local do Skin Weave e do Subdermal Armor.</p>',
    ok: { label: 'Descansar', callback: (evento, botao) => Number(botao.form.elements.dias.value) }
  });
  if (!dias) return null;
  if (!Number.isSafeInteger(dias) || dias < 1) { ui.notifications.warn('Os dias de descanso são um número inteiro, de 1 para cima.'); return null; }
  // Depois da janela, de novo e na fila do ator (com os ticks dos perigos): o dano durante a pergunta tira a marca.
  const feito = await naVezDoAtor(ator, atual => (!atorPresente(atual) ? null : estaEstabilizado(atual) ? gravarDescanso(atual, dias) : 'recusou'));
  if (feito === 'recusou') return recusar();
  if (!feito) return null;
  const { cura, body, max, anticorpos, armaduras } = feito;
  const conta = `${cura.porDia} por dia: o BODY ${body}${anticorpos ? ` × 2, com o ${esc(anticorpos)}` : ''}`;
  const partes = [cura.recuperado ? `HP ${cura.antes} → ${cura.depois} de ${max} (${conta})` : `HP no máximo (${max})`,
    ...armaduras.map(({ nome, locais }) => `${esc(nome)}: ${locais.map(l => `${l.local === 'cabeca' ? 'cabeça' : 'corpo'} ${l.antes} → ${l.depois}`).join(', ')}`)];
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<div class="${SISTEMA} cartao descanso"><p><b>${esc(ator.name)}</b> descansou ${dias} ${dias === 1 ? 'dia' : 'dias'}: ${partes.join('; ')}.</p></div>`,
    flags: { [SISTEMA]: { descanso: { ator: ator.uuid, dias, porDia: cura.porDia, hp: [cura.antes, cura.depois], anticorpos: Boolean(anticorpos),
      sp: armaduras.map(({ nome, locais }) => ({ item: nome, ...Object.fromEntries(locais.map(l => [l.local, [l.antes, l.depois]])) })) } } }
  });
  return cura;
}

// O HP pelo BODY (× 2 com o Reinforced Antibodies instalado) e o SP do item de armadura de cada implante instalado (o Skin
// Weave, o Subdermal Armor), cada local até o máximo dele.
async function gravarDescanso(ator, dias) {
  const body = ator.system.atributos.body.valor, max = ator.system.hp.max;
  const instalados = ator.items.filter(item => item.type === 'cyberware' && item.system.instalado);
  const anticorpos = instalados.find(item => ehAnticorpos(item.name, catalogo(item)))?.name ?? '';
  const cura = curaNatural({ dias, body, hp: ator.system.hp.value, max, anticorpos: Boolean(anticorpos) });
  const implantes = new Set(instalados.map(item => implanteDeSp(item.name, catalogo(item))).filter(Boolean));
  const armaduras = ator.items.filter(item => item.type === 'armadura' && implantes.has(implanteDeSp(item.name, catalogo(item)))).map(item => ({
    id: item.id, nome: item.name,
    locais: ['cabeca', 'corpo'].map(local => ({ local, antes: item.system.sp[local].value, depois: spDepoisDoDescanso(item.system.sp[local], dias) })).filter(l => l.depois !== l.antes)
  })).filter(armadura => armadura.locais.length);
  if (cura.recuperado) await ator.update({ 'system.hp.value': cura.depois });
  if (armaduras.length) {
    await ator.updateEmbeddedDocuments('Item', armaduras.map(({ id, locais }) => ({ _id: id, ...Object.fromEntries(locais.map(l => [`system.sp.${l.local}.value`, l.depois])) })));
  }
  return { cura, body, max, anticorpos, armaduras };
}

// O dano novo tira a marca (:552, "ainda rola Death Save se for atacado"): o HP que cai, na mesma gravação, no cliente que
// muda o HP (o mesmo gatilho da sonífera, municoes.mjs, e do System Reset, neuroport.mjs).
export function registrarEstabilizar() {
  Hooks.on('preUpdateActor', (ator, mudancas) => {
    const hp = foundry.utils.getProperty(mudancas, 'system.hp.value');
    if (hp === undefined || !(Number(ator.system.hp.value) > Number(hp)) || !estaEstabilizado(ator)) return;
    foundry.utils.setProperty(mudancas, `flags.${SISTEMA}.${FLAG_ESTABILIZADO}`, new foundry.data.operators.ForcedDeletion());
  });
}
