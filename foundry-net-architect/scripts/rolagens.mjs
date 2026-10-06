// Rolagens com as classes do próprio sistema (CPRInterfaceRoll, CPRDamageRoll, CPRRoll) e o cartão de chat dele.
// Quem rola é o mestre ativo (autoridade): o cartão sai em nome do netrunner (ou do Black ICE).
// O import usa o mesmo endereço que o sistema carrega, então as classes são as mesmas (instanceof funciona).
import { MODULE_ID, SYSTEM_ID } from './constantes.mjs';

let sistema = null;
async function classes() {
  if (!sistema) {
    const caminho = arquivo => foundry.utils.getRoute(`systems/${SYSTEM_ID}/modules/${arquivo}`);
    const [rolls, chat] = await Promise.all([import(caminho('rolls/cpr-rolls.js')), import(caminho('chat/cpr-chat.js'))]);
    sistema = { rolls, chat: chat.default };
  }
  return sistema;
}

const renderizar = (...args) => (foundry.applications?.handlebars?.renderTemplate ?? renderTemplate)(...args);

// Quem vê as rolagens da NET: todos, ou só o mestre e os donos do netrunner.
function destinatarios(actor) {
  if (game.settings.get(MODULE_ID, 'rolagens') !== 'privadas') return null;
  const ids = game.users.filter(user => user.isGM || (actor && actor.testUserPermission(user, 'OWNER'))).map(user => user.id);
  return [...new Set(ids)];
}

async function postar(cprRoll, { actor = null, token = null, alias = null, item = null } = {}) {
  cprRoll.criticalCard = cprRoll.wasCritical();
  if (actor) cprRoll.entityData = { actor: actor.id, token: token && !token.actorLink ? token.id : null, tokens: [], ...(item ? { item: item.id } : {}) };
  const content = await renderizar(cprRoll.rollCard, cprRoll);
  const speaker = actor ? ChatMessage.getSpeaker({ actor, token }) : { alias: alias || 'NET' };
  if (alias) speaker.alias = alias;
  const whisper = destinatarios(actor);
  await ChatMessage.create({ user: game.user.id, content, speaker, sound: CONFIG.sounds.dice, ...(whisper ? { whisper } : {}), flags: { [MODULE_ID]: { net: true } } });
  return cprRoll;
}

// Sorte gasta na rolagem: soma no resultado (o sistema já conta `luck`) e sai da ficha.
async function gastarSorte(actor, cprRoll, sorte) {
  const disponivel = Number(actor.system?.stats?.luck?.value) || 0;
  const usada = Math.max(0, Math.min(Number(sorte) || 0, disponivel));
  if (!usada) return;
  cprRoll.luck = usada;
  await actor.update({ 'system.stats.luck.value': disponivel - usada });
}

// Habilidade de Interface (pathfinder, backdoor, zap, slide…), ou "speed" e "defense", pelo cyberdeck.
export async function interfaceRoll({ actor, token, deck, role, habilidade, sorte = 0, titulo = '', mods = [] }) {
  const { rolls } = await classes();
  const cprRoll = deck.createRoll(rolls.rollTypes.INTERFACEABILITY, actor, { interfaceAbility: habilidade, cyberdeck: deck, netRoleItem: role });
  if (titulo) cprRoll.rollTitle = titulo;
  if (mods.length) cprRoll.addMod(mods);
  await gastarSorte(actor, cprRoll, sorte);
  await cprRoll.roll();
  await postar(cprRoll, { actor, token, item: deck });
  return cprRoll.resultTotal;
}

// No computador do jogador: a rolagem do netrunner com a janela de rolagem do sistema (modificadores, Sorte,
// confirmar ou cancelar), o dado e o cartão no chat em nome dele. Devolve { total } ou { cancelado: true }.
// Numa rolagem obrigatória (defesa, velocidade), cancelar a janela rola assim mesmo, sem os ajustes.
export async function rolarComJanela({ actor, token, deck, role, habilidade = null, programa = null, titulo = '', mods = [], sorte = 0, obrigatoria = false, pergunta = null }) {
  const { rolls } = await classes();
  const cprRoll = programa
    ? deck.createRoll(rolls.rollTypes.CYBERDECKPROGRAM, actor, { cyberdeckId: deck.id, programId: programa.id, executionType: 'atk', netRoleItem: role })
    : deck.createRoll(rolls.rollTypes.INTERFACEABILITY, actor, { interfaceAbility: habilidade, cyberdeck: deck, netRoleItem: role });
  if (titulo) cprRoll.rollTitle = titulo;
  if (mods.length) cprRoll.addMod(mods);
  const disponivel = Number(actor.system && actor.system.stats && actor.system.stats.luck && actor.system.stats.luck.value) || 0;
  cprRoll.luck = Math.max(0, Math.min(Number(sorte) || 0, disponivel));
  // O mestre cansou de esperar (e rolou): a janela fecha sozinha e nada sai daqui.
  if (pergunta) pergunta.aoExpirar = () => { const janela = Object.values(ui.windows).find(app => app.rollData === cprRoll); if (janela) janela.closeDialog(); };
  const seguir = await cprRoll.handleRollDialog({ ctrlKey: false, metaKey: false, type: MODULE_ID }, actor, deck);
  if (pergunta && pergunta.expirou) { ui.notifications.warn('Demorou demais: o mestre já rolou por você.'); return { cancelado: true }; }
  if (!seguir && !obrigatoria) return { cancelado: true };
  cprRoll.luck = Math.max(0, Math.min(Number(cprRoll.luck) || 0, disponivel));
  await cprRoll.roll();
  if (cprRoll.luck) await actor.update({ 'system.stats.luck.value': disponivel - cprRoll.luck });
  await postar(cprRoll, { actor, token, item: deck });
  return { total: cprRoll.resultTotal };
}

// O pedido do mestre chega aqui (no jogador): acha a ficha e rola.
export async function responderRolagem(dados, pergunta = null) {
  const token = await fromUuid(dados.token);
  const actor = token && token.actor;
  if (!actor) return null;
  const deck = actor.items.get(dados.deck);
  const role = actor.items.get(dados.role);
  if (!deck || !role) return null;
  if (dados.aviso) ui.notifications.info(dados.aviso);
  return rolarComJanela({ actor, token, deck, role, habilidade: dados.habilidade, programa: dados.programa ? actor.items.get(dados.programa) : null, titulo: dados.titulo, mods: dados.mods || [], sorte: dados.sorte, obrigatoria: dados.obrigatoria, pergunta });
}

// Ataque de um programa instalado no deck (Interface + ATK do programa + 1d10).
export async function ataqueDePrograma({ actor, token, deck, role, programa, sorte = 0 }) {
  const { rolls } = await classes();
  const cprRoll = deck.createRoll(rolls.rollTypes.CYBERDECKPROGRAM, actor, { cyberdeckId: deck.id, programId: programa.id, executionType: 'atk', netRoleItem: role });
  await gastarSorte(actor, cprRoll, sorte);
  await cprRoll.roll();
  await postar(cprRoll, { actor, token, item: deck });
  return cprRoll.resultTotal;
}

// Rolagem do Black ICE (ou de outro lado sem ficha): 1d10 + o valor (ATK, DEF, PER, SPD).
export async function rolagemDoIce({ nome, rotulo, valor }) {
  const { rolls } = await classes();
  const cprRoll = new rolls.CPRRoll(`${nome}: ${rotulo}`, '1d10');
  cprRoll.addMod([{ value: Number(valor) || 0, source: rotulo }]);
  await cprRoll.roll();
  await postar(cprRoll, { alias: nome });
  return cprRoll.resultTotal;
}

// Dano (Zap, programa, efeito do Black ICE). O sistema avisa "nenhum alvo marcado" ao montar a rolagem de dano:
// aqui o alvo é da NET, então o aviso fica de fora.
export async function dano({ titulo, formula, actor = null, token = null, alias = null }) {
  const { rolls } = await classes();
  const aviso = ui.notifications.warn;
  let cprRoll;
  try {
    ui.notifications.warn = () => {};
    cprRoll = new rolls.CPRDamageRoll(titulo, formula, 'program');
  } finally {
    ui.notifications.warn = aviso;
  }
  if (typeof cprRoll.setNetCombat === 'function') cprRoll.setNetCombat(titulo);
  await cprRoll.roll();
  await postar(cprRoll, { actor, token, alias });
  return cprRoll.resultTotal;
}
