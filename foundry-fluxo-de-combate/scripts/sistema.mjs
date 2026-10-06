// O que o módulo usa do sistema Cyberpunk RED - CORE: as classes de rolagem, a janela de rolagem, o cartão de chat,
// as tabelas de DV e de lesão crítica e a aplicação de dano do próprio ator (armadura, ablação, cabeça, escudo).
// O import usa o mesmo endereço que o sistema carrega, então as classes são as mesmas (instanceof funciona) e
// trocar um método estático (CPRChat.RenderRollCard) vale para a ficha, o Token Action HUD e o Combat HUD.
import { MODULE_ID, SYSTEM_ID } from './constantes.mjs';
import { localDoDano } from './regras.mjs';

let cache = null;
export async function cpr() {
  if (!cache) {
    const caminho = arquivo => foundry.utils.getRoute(`systems/${SYSTEM_ID}/modules/${arquivo}`);
    const [rolls, chat, utils] = await Promise.all([import(caminho('rolls/cpr-rolls.js')), import(caminho('chat/cpr-chat.js')), import(caminho('utils/cpr-systemUtils.js'))]);
    cache = { rolls, rollTypes: rolls.rollTypes, CPRChat: chat.default, SystemUtils: utils.default };
  }
  return cache;
}

const renderizar = (...args) => (foundry.applications?.handlebars?.renderTemplate ?? renderTemplate)(...args);
// O "evento" que a janela de rolagem do sistema olha (Ctrl pula a janela).
const EVENTO = { ctrlKey: false, metaKey: false, type: MODULE_ID };

// O sistema avisa "nenhum alvo selecionado" ao criar uma rolagem de dano; no mestre isso é ruído.
function semAvisoDeAlvo(fazer) {
  const proprio = Object.hasOwn(ui.notifications, 'warn');
  const aviso = ui.notifications.warn;
  ui.notifications.warn = () => {};
  try { return fazer(); } finally {
    if (proprio) ui.notifications.warn = aviso;
    else delete ui.notifications.warn;
  }
}

// O cartão de dano sai sem os botões de aplicar: o módulo já aplica (e um segundo clique daria o dano duas vezes).
function semBotoesDeAplicar(html) {
  const modelo = document.createElement('template');
  modelo.innerHTML = html;
  for (const botao of modelo.content.querySelectorAll('a[data-action="applyDamage"]')) {
    const marca = document.createElement('span');
    marca.className = 'fluxo-marca';
    marca.dataset.tooltip = 'Aplicado pelo Fluxo de Combate';
    marca.innerHTML = '<i class="fas fa-shield-halved"></i>';
    botao.replaceWith(marca);
  }
  return modelo.innerHTML;
}

// Cartão de rolagem do sistema, em nome do ator, com o modo de rolagem de quem rola.
export async function postar(cprRoll, { actor, token = null, item = null, limpar = false }) {
  cprRoll.criticalCard = cprRoll.wasCritical();
  cprRoll.entityData = { actor: actor.id, token: token && !token.actorLink ? token.id : null, tokens: [], ...(item ? { item: item.id } : {}) };
  let content = await renderizar(cprRoll.rollCard, cprRoll);
  if (limpar) content = semBotoesDeAplicar(content);
  const dados = { user: game.user.id, content, speaker: ChatMessage.getSpeaker({ actor, token }), sound: CONFIG.sounds.dice, flags: { [MODULE_ID]: { rolagem: true } } };
  ChatMessage.applyRollMode(dados, game.settings.get('core', 'rollMode'));
  return ChatMessage.create(dados);
}

// Fecha a janela de rolagem do sistema aberta para esta rolagem (o tempo acabou).
function fecharJanelaDe(cprRoll) {
  const janela = Object.values(ui.windows).find(app => app.rollData === cprRoll);
  if (janela) janela.closeDialog();
}

// Abre a janela de rolagem do sistema (modificadores, Sorte). Cancelar rola assim mesmo, sem os ajustes:
// a defesa e o dano não se recusam. Devolve false se o tempo acabou antes (o mestre já rolou).
async function janelaDeRolagem(cprRoll, actor, item, pergunta) {
  if (pergunta) pergunta.aoExpirar = () => fecharJanelaDe(cprRoll);
  await cprRoll.handleRollDialog(EVENTO, actor, item);
  if (pergunta && pergunta.expirou) {
    ui.notifications.warn('Demorou demais: o mestre já rolou por você.');
    return false;
  }
  return true;
}

// Sorte gasta na janela: soma no resultado (o sistema já conta `luck`) e sai da ficha.
async function gastarSorte(actor, cprRoll) {
  const disponivel = Number(actor.system?.stats?.luck?.value) || 0;
  cprRoll.luck = Math.max(0, Math.min(Number(cprRoll.luck) || 0, disponivel));
  return cprRoll.luck ? () => actor.update({ 'system.stats.luck.value': disponivel - cprRoll.luck }) : () => null;
}

// Uma perícia do ator (Evasion, Concentration) pela rolagem do próprio item, com os bônus que o sistema calcula
// (STAT, nível, ferimentos, penalidade da armadura, efeitos). Sem o item, só a STAT + 1d10 (destreinado).
export async function rolarPericia({ actor, token = null, pericia, stat, titulo = '', mods = [], janela = false, pergunta = null }) {
  const { rolls, rollTypes } = await cpr();
  const item = actor.itemTypes.skill.find(skill => skill.name === pericia) || null;
  let cprRoll;
  if (item) cprRoll = item.createRoll(rollTypes.SKILL, actor);
  else {
    cprRoll = new rolls.CPRSkillRoll(game.i18n.localize(`CPR.global.stats.${stat}`), actor.getStat(stat), pericia, 0);
    const ferimentos = actor.getWoundStateMods?.() || 0;
    if (ferimentos) cprRoll.addMod([{ value: ferimentos, source: 'Ferimentos' }]);
  }
  if (titulo) cprRoll.rollTitle = titulo;
  if (mods.length) cprRoll.addMod(mods);
  if (janela && !(await janelaDeRolagem(cprRoll, actor, item, pergunta))) return null;
  const descontar = await gastarSorte(actor, cprRoll);
  await cprRoll.roll();
  await descontar();
  await postar(cprRoll, { actor, token, item });
  return { total: cprRoll.resultTotal, natural: cprRoll.initialRoll, sorte: cprRoll.luck };
}

// Dano da arma pela rolagem do sistema: tiro mirado (local), autofogo (2d6 × multiplicador, limitado pela arma),
// munição (ablação, tipo, variedade) e bônus de efeitos e upgrades. O cartão sai sem os botões de aplicar.
export async function rolarDano({ actor, token = null, arma, modo, mirado = false, local = 'body', multiplicador = 1, janela = false, pergunta = null, titulo = '' }) {
  const { rollTypes } = await cpr();
  const tipo = mirado ? rollTypes.AIMED : modo === 'autofogo' ? rollTypes.AUTOFIRE : rollTypes.ATTACK;
  let cprRoll = semAvisoDeAlvo(() => arma.createRoll(rollTypes.DAMAGE, actor, { damageType: tipo }));
  if (mirado) {
    cprRoll.isAimed = true;
    cprRoll.location = local || 'head';
  }
  if (modo === 'autofogo') cprRoll.autofireMultiplier = Math.max(1, Number(multiplicador) || 1);
  if (titulo) cprRoll.rollTitle = titulo;
  if (janela && !(await janelaDeRolagem(cprRoll, actor, arma, pergunta))) return null;
  cprRoll = await arma.confirmRoll(cprRoll);
  await cprRoll.roll();
  await postar(cprRoll, { actor, token, item: arma, limpar: true });
  const critico = cprRoll.wasCritSuccess();
  return {
    total: cprRoll.resultTotal,
    bonus: critico ? Number(cprRoll.bonusDamage ?? 5) : 0,
    critico,
    local: cprRoll.isAimed ? cprRoll.location : 'body',
    autofogo: cprRoll.isAutofire ? Math.min(cprRoll.autofireMultiplier, cprRoll.autofireMultiplierMax || cprRoll.autofireMultiplier) : null,
    extra: foundry.utils.deepClone(cprRoll.rollCardExtraArgs || {}),
    formula: cprRoll.formula,
    faces: [...cprRoll.faces]
  };
}

// Death Save do sistema: d10 + penalidade contra BODY; 10 natural sempre falha. O sistema sobe a penalidade
// quando passa.
export async function rolarDeathSave({ actor, token = null, janela = false, pergunta = null }) {
  const { rollTypes } = await cpr();
  const cprRoll = actor.createRoll(rollTypes.DEATHSAVE);
  if (janela && !(await janelaDeRolagem(cprRoll, actor, null, pergunta))) return null;
  await cprRoll.roll();
  cprRoll.saveResult = actor.processDeathSave(cprRoll);
  await postar(cprRoll, { actor, token });
  return { total: cprRoll.resultTotal, passou: cprRoll.saveResult === game.i18n.localize('CPR.rolls.success') };
}

// ---------------- Dano na ficha (no mestre) ----------------
// O próprio ator aplica (CPRActor._applyDamage: escudo, SP do local, cabeça ×2, ablação, redução de dano, não letal).
// O cartão de aplicação que o sistema posta no fim é capturado aqui: os números vão para o cartão do módulo (e o
// "desfazer" dele), e o do sistema só aparece se a configuração pedir.
const capturas = [];
export async function instalarCapturaDeDano() {
  const { CPRChat } = await cpr();
  const original = CPRChat.RenderDamageApplicationCard;
  if (original.fluxoDeCombate) return;
  const capturar = function (dados) {
    const captura = capturas.find(item => item.actor === dados.actor);
    if (captura) {
      captura.dados = dados;
      if (!game.settings.get(MODULE_ID, 'cartaoDoSistema')) return Promise.resolve(null);
    }
    return original.call(this, dados);
  };
  capturar.fluxoDeCombate = true;
  CPRChat.RenderDamageApplicationCard = capturar;
}

export async function aplicarDano(actor, { total, bonus = 0, local = 'body', extra = {}, escudo = false }) {
  const captura = { actor, dados: null };
  capturas.push(captura);
  const hpAntes = Number(actor.system.derivedStats.hp.value);
  try {
    await actor._applyDamage(
      Number(total) || 0, Number(bonus) || 0, localDoDano(local),
      Number(extra.ablationValue ?? 1), extra.ammoVariety, Number(extra.ignoreArmorPercent) || 0, Number(extra.ignoreBelowSP) || 0,
      extra.ammoType !== 'rubber',
      { damageReductionRole: true, damageReductionAE: true, useShield: Boolean(escudo), brainDamageReduction: true }
    );
  } finally {
    capturas.splice(capturas.indexOf(captura), 1);
  }
  const d = captura.dados || {};
  return {
    hpAntes,
    hpDepois: Number(actor.system.derivedStats.hp.value),
    perdeu: Number(d.hpReduction) || 0,
    sp: d.armorData ? Number(d.armorData.value) || 0 : 0,
    temArmadura: Boolean(d.armorData && d.armorData.equipped),
    ablacao: Number(d.ablation) || 0,
    escudo: Number(d.shieldAblation) || 0,
    local: localDoDano(local),
    reducao: Number(d.totalDamageReduction) || 0
  };
}

// Desfaz o que _applyDamage fez (o "reverter" do próprio sistema: HP, SP do local e HP do escudo).
export async function desfazerDano(actor, { perdeu = 0, local = 'body', ablacao = 0, escudo = 0 }) {
  await actor._reverseDamage(perdeu, local, ablacao, escudo);
}

// ---------------- Lesão crítica (no mestre) ----------------
// Rola na tabela do sistema (cabeça só em tiro mirado na cabeça), sem repetir uma lesão que o alvo já tem, põe o item
// na ficha (com os efeitos dele) e posta o cartão de lesão do sistema. `nome` põe uma lesão certa (Perna Quebrada).
// `naFicha: false` só anuncia.
export async function lesaoCritica(actor, { token = null, cabeca = false, nome = null, naFicha = true } = {}) {
  const { SystemUtils, rolls } = await cpr();
  const pack = game.packs.get(game.settings.get(SYSTEM_ID, 'criticalInjuryRollTableCompendium'));
  const tabelas = pack ? await pack.getDocuments() : [];
  const tabela = tabelas.find(t => (cabeca ? /head/i : /body/i).test(t.name)) || tabelas[0];
  if (!tabela) return null;
  const compendio = SystemUtils.GetCompendiumIdByLabel(tabela.name);
  const tem = new Set(actor.itemTypes.criticalInjury.map(item => item.name));
  let resultado = nome;
  let rolagem = null;
  if (!resultado) {
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      const sorteio = await tabela.draw({ displayChat: false });
      const texto = sorteio.results[0] && (sorteio.results[0].text || sorteio.results[0].name);
      if (!texto) break;
      resultado = texto;
      rolagem = sorteio.roll;
      if (!tem.has(texto)) break;
    }
  }
  if (!resultado) return null;
  const doc = await SystemUtils.GetCompendiumDoc(compendio, resultado);
  if (!doc) return { nome: resultado, item: null };
  let item = null;
  if (naFicha && !(nome && tem.has(nome))) {
    [item] = await actor.createEmbeddedDocuments('Item', [{ name: doc.name, type: doc.type, img: doc.img, system: foundry.utils.duplicate(doc.system), effects: doc.effects.map(efeito => efeito.toObject()) }]);
  }
  if (rolagem) {
    const cprRoll = new rolls.CPRTableRoll(doc.name, rolagem, `systems/${SYSTEM_ID}/templates/chat/cpr-critical-injury-rollcard.hbs`);
    cprRoll.rollCardExtraArgs.tableName = tabela.name;
    cprRoll.rollCardExtraArgs.itemName = doc.name;
    cprRoll.rollCardExtraArgs.itemImg = doc.img;
    await postar(cprRoll, { actor, token });
  }
  return { nome: doc.name, item };
}

// ---------------- Tabelas de DV ----------------
// Como o sistema e o Diwako: primeiro uma tabela do mundo com o nome, depois o compêndio de DV configurado.
const tabelasDeDv = new Map();
export async function faixasDaTabela(nome) {
  if (!nome) return null;
  if (tabelasDeDv.has(nome)) return tabelasDeDv.get(nome);
  let tabela = game.tables.getName(nome);
  if (!tabela) {
    const pack = game.packs.get(game.settings.get(SYSTEM_ID, 'dvRollTableCompendium')) || game.packs.get(`${SYSTEM_ID}.internal_dv-tables`);
    const entrada = pack ? (await pack.getIndex()).getName(nome) : null;
    tabela = entrada ? await pack.getDocument(entrada._id) : null;
  }
  const faixas = tabela ? tabela.results.contents.map(resultado => [resultado.range, resultado.text]) : null;
  tabelasDeDv.set(nome, faixas);
  return faixas;
}
