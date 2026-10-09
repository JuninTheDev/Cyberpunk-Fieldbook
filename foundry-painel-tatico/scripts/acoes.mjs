// O que os botões do painel fazem. Toda rolagem passa pelo mesmo caminho da ficha do sistema:
//   createRoll → janela de rolagem → confirmRoll (munição) → roll → Death Save / Sorte → CPRChat.RenderRollCard
// Por isso o cpr-2077 (os modos de 2077 trocam o createRoll) e o Fluxo de Combate (pega o RenderRollCard) valem aqui
// sem nada especial. Ctrl (ou Cmd) no clique pula a janela de rolagem, como na ficha.
import { SYSTEM_ID, CICLO_DE_EQUIPAR } from './constantes.mjs';
import { armas2077 } from './integracoes.mjs';

let sistema = null;
export async function carregarSistema() {
  const rota = arquivo => foundry.utils.getRoute(`systems/${SYSTEM_ID}/modules/${arquivo}`);
  const [rolls, chat, utils, config] = await Promise.all([
    import(rota('rolls/cpr-rolls.js')), import(rota('chat/cpr-chat.js')), import(rota('utils/cpr-systemUtils.js')), import(rota('system/config.js'))
  ]);
  sistema = { rolls, CPRChat: chat.default, SystemUtils: utils.default, CPR: config.default };
  return sistema;
}
export const cpr = () => sistema;

const limitar = (valor, min, max) => Math.min(Math.max(valor, min), max);
const eventoDeRolagem = evento => ({ type: 'click', ctrlKey: Boolean(evento && evento.ctrlKey), metaKey: Boolean(evento && evento.metaKey) });

// O fim de toda rolagem. `token`: o TokenDocument (o Fluxo de Combate mede a distância a partir dele).
export async function rolar({ evento, actor, item = null, cprRoll, token = null }) {
  if (!cprRoll || !sistema) return null;
  if (!(await cprRoll.handleRollDialog(eventoDeRolagem(evento), actor, item))) return null;
  if (item) {
    cprRoll = await item.confirmRoll(cprRoll);
    if (!cprRoll) return null;
  }
  await cprRoll.roll();
  if (cprRoll instanceof sistema.rolls.CPRDeathSaveRoll) cprRoll.saveResult = actor.processDeathSave(cprRoll);
  if (Number.isInteger(cprRoll.luck) && cprRoll.luck > 0) {
    const sorte = actor.system.stats.luck.value;
    await actor.update({ 'system.stats.luck.value': sorte - Math.min(sorte, cprRoll.luck) });
  }
  cprRoll.entityData = { actor: actor.id, token: token ? token.id : null, tokens: sistema.SystemUtils.getUserTargetedOrSelected('targeted') };
  if (item) cprRoll.entityData.item = item.id;
  return sistema.CPRChat.RenderRollCard(cprRoll);
}

// ---------------- Rolagens ----------------
export const rolarAtributo = (evento, actor, token, stat) => rolar({ evento, actor, token, cprRoll: actor.createRoll(sistema.rolls.rollTypes.STAT, stat) });

export function rolarPericia(evento, actor, token, id) {
  const pericia = actor.items.get(id);
  if (!pericia) return null;
  return rolar({ evento, actor, token, item: pericia, cprRoll: pericia.createRoll(sistema.rolls.rollTypes.SKILL, actor) });
}

export const modoDaArma = (actor, id) => actor.getFlag(SYSTEM_ID, `firetype-${id}`) || 'attack';
export const localMirado = actor => actor.getFlag(SYSTEM_ID, 'aimedLocation') || 'head';

export function atacar(evento, actor, token, id) {
  const arma = actor.items.get(id);
  if (!arma) return null;
  const modo = modoDaArma(actor, id);
  const cprRoll = arma.createRoll(modo, actor);
  // O sistema começa o tiro mirado sempre na cabeça: aqui vale o local escolhido no painel.
  if (cprRoll && modo === 'aimed') cprRoll.location = localMirado(actor);
  return rolar({ evento, actor, token, item: arma, cprRoll });
}

export function rolarDano(evento, actor, token, id) {
  const arma = actor.items.get(id);
  if (!arma) return null;
  const modo = modoDaArma(actor, id);
  const cprRoll = arma.createRoll(sistema.rolls.rollTypes.DAMAGE, actor, { damageType: modo });
  if (cprRoll && modo === 'aimed') cprRoll.location = localMirado(actor);
  return rolar({ evento, actor, token, item: arma, cprRoll });
}

export const rolarDeathSave = (evento, actor, token) => rolar({ evento, actor, token, cprRoll: actor.createRoll(sistema.rolls.rollTypes.DEATHSAVE) });
export const rolarFacedown = (evento, actor, token) => rolar({ evento, actor, token, cprRoll: actor.createRoll(sistema.rolls.rollTypes.FACEDOWN) });

export function rolarHabilidade(evento, actor, token, { role: id, nome, tipo }) {
  const role = actor.items.get(id);
  if (!role) return null;
  return rolar({ evento, actor, token, item: role, cprRoll: role.createRoll(sistema.rolls.rollTypes.ROLEABILITY, actor, { rollSubType: tipo, subRoleName: nome }) });
}

export function deckEquipado(actor) {
  return actor.itemTypes.cyberdeck.find(deck => deck.system.equipped === 'equipped') || null;
}
export function roleDaNet(actor) {
  return actor.itemTypes.role.find(role => role.id === actor.system.roleInfo?.activeNetRole) || null;
}
export function rolarInterface(evento, actor, token, habilidade) {
  const deck = deckEquipado(actor);
  const role = roleDaNet(actor);
  if (!deck || !role) { ui.notifications.warn('Para as habilidades de Interface: um cyberdeck equipado e a Role de netrunner ativa na ficha.'); return null; }
  return rolar({ evento, actor, token, item: deck, cprRoll: deck.createRoll(sistema.rolls.rollTypes.INTERFACEABILITY, actor, { interfaceAbility: habilidade, cyberdeck: deck, netRoleItem: role }) });
}

// ---------------- Combate ----------------
export const combatenteDe = (actor, token) => game.combat?.combatants.find(c => (token ? c.tokenId === token.id : c.actorId === actor.id)) || null;

export async function iniciativa(actor, token) {
  const combatente = combatenteDe(actor, token);
  if (combatente) return game.combat.rollInitiative([combatente.id]);
  if (!game.combat) { ui.notifications.warn('Não há combate nesta cena: o mestre começa um pelo Rastreador de Combate.'); return null; }
  return actor.rollInitiative({ createCombatants: true });
}

export async function encerrarTurno(actor, token) {
  const combatente = combatenteDe(actor, token);
  if (game.combat?.started && combatente && game.combat.combatant?.id === combatente.id) return game.combat.nextTurn();
  ui.notifications.warn('Não é o seu turno.');
  return null;
}

// ---------------- Recursos ----------------
export async function mudarHp(actor, delta) {
  const hp = actor.system.derivedStats.hp;
  return actor.update({ 'system.derivedStats.hp.value': limitar(hp.value + delta, 0, hp.max) });
}
export async function definirHp(actor, valor) {
  const hp = actor.system.derivedStats.hp;
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return null;
  return actor.update({ 'system.derivedStats.hp.value': limitar(n, 0, hp.max) });
}
export async function mudarSorte(actor, delta) {
  const sorte = actor.system.stats.luck;
  return actor.update({ 'system.stats.luck.value': limitar(sorte.value + delta, 0, sorte.max) });
}

// Armadura: −1 é a ablação (o tiro gastou SP), +1 é o conserto. A armadura que a ficha acompanha; sem ela, a primeira
// equipada no local. O escudo perde e ganha pontos de vida.
export function armaduraDo(actor, local) {
  const chave = local.charAt(0).toUpperCase() + local.slice(1);
  const id = actor.system.externalData?.[`currentArmor${chave}`]?.id;
  let armadura = id ? actor.items.get(id) : null;
  if (!armadura || armadura.system.equipped !== 'equipped') [armadura] = actor.getEquippedArmors(local);
  return armadura || null;
}
export async function mudarArmadura(actor, local, delta) {
  const armadura = armaduraDo(actor, local);
  if (!armadura) return null;
  if (local === 'shield') {
    const pv = armadura.system.shieldHitPoints;
    await armadura.update({ 'system.shieldHitPoints.value': limitar(pv.value + delta, 0, pv.max) });
  } else {
    const campo = `${local}Location`;
    const { sp, ablation } = armadura.system[campo];
    await armadura.update({ [`system.${campo}.ablation`]: limitar(ablation - delta, 0, sp) });
  }
  return actor.updateTrackedArmor(local, armadura.id);
}

// ---------------- Armas ----------------
// Os modos do sistema gravam a flag como a ficha; o autofogo troca a régua de DV do token para a tabela de autofogo
// (como a ficha faz). Os modos de 2077 vão pelo cpr-2077 (ele também troca a régua).
export async function alternarModo(actor, token, id, modo) {
  const api = armas2077();
  if (api && Object.values(api.MODOS || {}).includes(modo)) return api.alternarModo(actor, id, modo);
  const atual = actor.getFlag(SYSTEM_ID, `firetype-${id}`);
  if (modo === 'autofire' && token) await reguaDeAutofogo(actor, token, id, atual === modo).catch(() => {});
  if (atual === modo) return actor.unsetFlag(SYSTEM_ID, `firetype-${id}`);
  return actor.setFlag(SYSTEM_ID, `firetype-${id}`, modo);
}
async function reguaDeAutofogo(actor, token, id, desligando) {
  const arma = actor.items.get(id);
  if (!arma || !token.object || !token.isOwner) return;
  const atual = arma.system.dvTable || token.getFlag(SYSTEM_ID, 'cprDvTable')?.name;
  if (!atual) return;
  const base = String(atual).replace(' (Autofire)', '');
  const tabelas = await sistema.SystemUtils.GetDvTables();
  const autofogo = tabelas.find(tabela => tabela.name.includes(base) && tabela.name.includes('Autofire'));
  if (!autofogo) return;
  await sistema.SystemUtils.SetDvTable(token.object, desligando ? base : autofogo.name);
}

export const definirLocalMirado = (actor, local) => actor.setFlag(SYSTEM_ID, 'aimedLocation', local);
export const recarregar = (actor, id) => actor.items.get(id)?.reload?.();
export const trocarMunicao = (actor, id) => actor.items.get(id)?.load?.();

// Guardado → carregado → equipado, com os avisos da ficha (mãos livres, um cyberdeck só).
export async function proximoEstado(actor, id) {
  const item = actor.items.get(id);
  if (!item || item.type === 'cyberware') return null;
  let proximo = CICLO_DE_EQUIPAR[(CICLO_DE_EQUIPAR.indexOf(item.system.equipped) + 1) % CICLO_DE_EQUIPAR.length];
  if (proximo === 'equipped') {
    if (item.type === 'weapon' && typeof actor.canHoldWeapon === 'function' && !actor.canHoldWeapon(item)) ui.notifications.warn(sistema.SystemUtils.Localize('CPR.messages.warningTooManyHands'));
    if (item.type === 'cyberdeck' && actor.itemTypes.cyberdeck.some(deck => deck.id !== item.id && deck.system.equipped === 'equipped')) {
      ui.notifications.error(sistema.SystemUtils.Localize('CPR.messages.errorTooManyCyberdecks'));
      proximo = 'owned';
    }
  }
  return item.update({ 'system.equipped': proximo });
}
