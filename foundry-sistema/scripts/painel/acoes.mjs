// O que os botões do Painel Tático (o C25) fazem: o mesmo caminho da ficha do personagem (FichaPersonagem). As
// rolagens são as do ator e as dos itens, com a janela de rolagem (Ctrl, ou o "Rolar direto" deste navegador, inverte,
// como na ficha). O ataque vai pelo combate do sistema, com os alvos marcados (o mestre resolve e pede a defesa), e os
// modos de 2077 são os da ficha (combate.acoesDe2077).
import { SISTEMA, STATUS_AGARRAO, USOS } from '../config.mjs';
import { config } from '../configuracoes.mjs';
import { STATUS_SUPRIMIDO } from '../combate.mjs';

const limitar = (valor, min, max) => Math.min(Math.max(valor, min), max);
export const comJanela = evento => Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto'));

// ---------------- Rolagens ----------------
export const rolarAtributo = (evento, actor, chave) => actor.rolarAtributo(chave, { perguntar: comJanela(evento) });
export const rolarPericia = (evento, actor, id) => actor.rolarPericia(id, { perguntar: comJanela(evento) });
export const rolarDeathSave = (evento, actor) => actor.rolarDeathSave({ perguntar: comJanela(evento) });
export const zerarDeathSave = actor => actor.zerarDeathSave();
export const rolarFacedown = (evento, actor) => actor.rolarFacedown({ perguntar: comJanela(evento) });
export const rolarInterface = (evento, actor, habilidade) => actor.rolarInterface(habilidade, { perguntar: comJanela(evento) });

// As rolagens de Role (ROLAGENS_DE_ROLE). A que pede para escolher a perícia (a Especialização de Campo do Tech) abre a
// aba Role da ficha, onde está a escolha.
export async function rolarRole(evento, actor, id) {
  const rolagem = actor.rolagemDeRole(id);
  if (!rolagem) return null;
  if (rolagem.escolherPericia) {
    await actor.sheet.render({ force: true });
    actor.sheet.changeTab('role', 'primary');
    ui.notifications.info(`${rolagem.rotulo}: escolha a perícia na aba Role da ficha.`);
    return null;
  }
  return actor.rolarRole(id, { perguntar: comJanela(evento) });
}

// ---------------- Armas ----------------
// O modo de cada arma fica no painel deste navegador (a ficha tem um botão por modo): o tiro, o mirado (com o local), o
// autofogo, o supressivo e os de 2077 (o ricochete, os dois canos).
const modos = new Map();
const locais = new Map();
const chave = (actor, id) => `${actor.uuid}|${id}`;
export const modoDaArma = (actor, id) => modos.get(chave(actor, id)) ?? 'tiro';
export function alternarModo(actor, id, modo) {
  if (modoDaArma(actor, id) === modo) modos.delete(chave(actor, id)); else modos.set(chave(actor, id), modo);
}
export const localMirado = actor => locais.get(actor.uuid) ?? 'cabeca';
export const definirLocalMirado = (actor, local) => { locais.set(actor.uuid, local); };

export function atacar(evento, actor, id) {
  const arma = actor.items.get(id);
  if (!arma) return null;
  const modo = modoDaArma(actor, id);
  const perguntar = comJanela(evento);
  if (modo === 'mirado') return arma.atacar({ local: localMirado(actor), perguntar });
  return arma.atacar({ modo: modo === 'tiro' ? null : modo, perguntar });
}
export const rolarDano = (evento, actor, id) => actor.items.get(id)?.rolarDano({ perguntar: comJanela(evento) });
export const recarregar = (actor, id) => actor.items.get(id)?.recarregar();

// Trocar a munição: as compatíveis do ator (a carregada primeiro); com uma só, recarrega com ela.
export async function trocarMunicao(actor, id) {
  const arma = actor.items.get(id);
  if (!arma) return null;
  const opcoes = actor.items.filter(item => arma.municaoCompativel(item));
  if (!opcoes.length) { ui.notifications.warn(`${arma.name}: sem munição compatível.`); return null; }
  if (opcoes.length === 1) return arma.recarregar({ municao: opcoes[0] });
  const { DialogV2 } = foundry.applications.api;
  const escolha = await DialogV2.wait({
    window: { title: `Munição: ${arma.name}` }, classes: [SISTEMA, 'painel-tatico-municao'], rejectClose: false,
    content: `<p>Com qual munição recarregar? O que sobrou no pente volta para a munição que estava nele.</p>`,
    buttons: opcoes.map(item => ({ action: item.id, label: `${item.name} (${item.system.quantidade})${item.id === arma.system.carregada ? ' · no pente' : ''}`, default: item.id === arma.system.carregada }))
  });
  const municao = escolha && actor.items.get(escolha);
  return municao ? arma.recarregar({ municao }) : null;
}

// Os botões de estado de 2077 (combate.acoesDe2077 dá a ação, como na ficha): a carga Tech, o ferrolho e a coronha.
export function acao2077(actor, id, acao) {
  const arma = actor.items.get(id);
  if (!arma) return null;
  if (acao === 'alternarCarga') return game.system.api.combate.alternarCarga(arma);
  if (acao === 'manejarFerrolho') return arma.unsetFlag(SISTEMA, 'ferrolhoPendente');
  if (acao === 'alternarCoronha') return arma.setFlag(SISTEMA, 'coronhaRecolhida', !arma.coronhaRecolhida);
  return null;
}

// ---------------- Combate ----------------
export const combatenteDe = (actor, token) => game.combat?.combatants.find(c => (token ? c.tokenId === token.id : c.actorId === actor.id)) || null;

// Como o "Rolar iniciativa" da ficha: quem já rolou neste combate não rola de novo (o RED rola uma vez).
export function iniciativa(actor, token) {
  const combatente = combatenteDe(actor, token);
  if (combatente?.initiative !== null && combatente?.initiative !== undefined) return ui.notifications.info(`${actor.name} já tem iniciativa ${combatente.initiative} neste combate.`);
  if (combatente) return game.combat.rollInitiative([combatente.id]);
  if (!game.combat) { ui.notifications.warn('Não há combate nesta cena: o mestre começa um pelo Rastreador de Combate.'); return null; }
  return actor.rollInitiative({ createCombatants: true });
}

export function encerrarTurno(actor, token) {
  const combatente = combatenteDe(actor, token);
  if (game.combat?.started && combatente && game.combat.combatant?.id === combatente.id) return game.combat.nextTurn();
  ui.notifications.warn('Não é o seu turno.');
  return null;
}

// Os selos do topo: suprimido (o fogo supressivo) e agarrado ou agarrando.
export const suprimido = actor => Boolean(actor?.statuses?.has(STATUS_SUPRIMIDO));
export const agarrao = actor => (actor?.statuses?.has(STATUS_AGARRAO.agarrado) ? 'Agarrado' : actor?.statuses?.has(STATUS_AGARRAO.agarrando) ? 'Agarrando' : '');

// ---------------- Recursos ----------------
export const mudarHp = (actor, delta) => actor.update({ 'system.hp.value': limitar(actor.system.hp.value + delta, 0, actor.system.hp.max) });
export function definirHp(actor, valor) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return null;
  return actor.update({ 'system.hp.value': limitar(n, 0, actor.system.hp.max) });
}
export const mudarSorte = (actor, delta) => actor.update({ 'system.sorte.value': limitar(actor.system.sorte.value + delta, 0, actor.system.sorte.max) });

// A armadura que vale em cada local (a de maior SP entre as vestidas; dados.mjs), e o escudo empunhado.
export function armaduraDo(actor, local) {
  if (local === 'escudo') return actor.items.find(item => item.type === 'armadura' && item.system.escudo && item.system.equipada) || null;
  const id = actor.system.armadura?.[local]?.item;
  return id ? actor.items.get(id) : null;
}
// − é a ablação (o tiro gastou SP), + é o conserto, até o máximo. O escudo perde e ganha pontos de vida.
export async function mudarArmadura(actor, local, delta) {
  const armadura = armaduraDo(actor, local);
  if (!armadura) return null;
  const campo = local === 'escudo' ? 'system.pvEscudo' : `system.sp.${local}`;
  const { value, max } = foundry.utils.getProperty(armadura, campo);
  return armadura.update({ [`${campo}.value`]: limitar(value + delta, 0, max) });
}

// ---------------- Equipamento ----------------
// A arma e a armadura: guardada ou equipada (a equipagem confere as mãos, como na ficha). O cyberdeck e o resto do
// inventário: guardado, carregando ou equipado.
export function proximoEstado(actor, id) {
  const item = actor.items.get(id);
  if (!item) return null;
  if (item.type === 'arma' || item.type === 'armadura') return item.update({ 'system.equipada': !item.system.equipada });
  if (!('uso' in item.system)) return null;
  const ordem = ['guardado', 'carregando', 'equipado'].filter(uso => uso in USOS);
  return item.update({ 'system.uso': ordem[(ordem.indexOf(item.system.uso) + 1) % ordem.length] });
}
export const estadoDoItem = item => (item.type === 'arma' || item.type === 'armadura'
  ? (item.system.equipada ? 'equipado' : 'guardado')
  : item.system.uso ?? '');
