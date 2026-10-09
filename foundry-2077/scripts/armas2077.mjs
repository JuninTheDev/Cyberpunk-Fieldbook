// Armas de 2077 no menu de ataque do próprio sistema. A classe da arma (Power, Tech, Smart) é um campo da ficha do
// item, e os modos de tiro de 2077 entram ao lado de mirar, autofogo e supressivo (na ficha do personagem e no Combat
// HUD; o Token Action HUD rola o modo escolhido):
// - Power: Ricochete. Tiro único, DV da tabela de autofogo (pistolas e SMGs usam a da SMG), um dado a menos de dano,
//   +2 com o Ballistic Coprocessor. Armas que só disparam três balas ou mais não ricocheteiam.
// - Tech: Carga (tiro único que atravessa cobertura: metade da fina, um quarto da grossa; abla 4 de SP sem
//   cobertura e 2 através dela) e Rajada (autofogo carregado com a tabela da SMG, até o máximo da arma; um quarto da
//   cobertura fina, nada da grossa). Depois de uma carga, a arma esfria uma rodada.
// - Smart: só dispara com o cyberware Smart Link. O tiro único é o teste Smart, 10 + 1d10 (12 + 1d10 nos modelos de
//   várias balas e com os dois canos da Palica), no lugar de REF + perícia (ou como modo à parte, pela configuração).
//   A Kappa trava dois alvos a até 4 m; a coronha recolhida da Dian dá −1.
// Tudo passa pela rolagem do sistema (janela de rolagem, munição, Sorte, cartão): o Fluxo de Combate pega o ataque
// com os ajustes de cada modo (`cprRoll.fluxoExtra`), e sem ele o cartão do sistema rola o dano certo pelo botão.
const MODULE_ID = 'cpr-2077';
const SYSTEM_ID = 'cyberpunk-red-core';

export const MODOS = { smart: 'smart', ricochete: 'ricochete', carga: 'cargaTech', rajada: 'rajadaTech' };
const NOMES = { smart: 'Smart', ricochete: 'Ricochete', cargaTech: 'Carga Tech', rajadaTech: 'Rajada Tech' };
const ICONES = { smart: 'fa-satellite-dish', ricochete: 'fa-arrows-turn-to-dots', cargaTech: 'fa-bolt', rajadaTech: 'fa-bolt-lightning' };
const DICAS = {
  smart: 'Teste Smart: 10 + 1d10 (12 + 1d10 com várias balas) no lugar de REF + perícia. Só com o Smart Link.',
  ricochete: 'Tiro único que ricocheteia num alvo atrás de cobertura: DV da tabela de autofogo, um dado a menos de dano. REF 8+ esquiva.',
  cargaTech: 'Tiro único carregado: atravessa cobertura (metade da fina, um quarto da grossa); a armadura perde 4 de SP (2 através de cobertura). Esfria uma rodada.',
  rajadaTech: 'Rajada carregada: autofogo com a tabela da SMG, até o máximo da arma; um quarto da cobertura fina, nada da grossa. Esfria uma rodada.'
};
export const COBERTURAS = {
  none: { rotulo: 'sem cobertura', carga: 1, rajada: 1, ablacao: 4 },
  thin: { rotulo: 'cobertura fina', carga: 0.5, rajada: 0.25, ablacao: 2 },
  thick: { rotulo: 'cobertura grossa', carga: 0.25, rajada: 0, ablacao: 2 }
};
const PARECIDAS_COM_SMG = ['medPistol', 'heavyPistol', 'vHeavyPistol', 'smg', 'heavySmg'];
const TIPOS_DE_ATAQUE = ['attack', 'aimed', 'autofire', 'suppressive'];
const config = chave => game.settings.get(MODULE_ID, chave);
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const umDadoAMenos = formula => String(formula).replace(/^(\d+)d6/, (todo, dados) => `${Math.max(1, Number(dados) - 1)}d6`);

// ---------------- Configurações ----------------
export function registrarConfiguracoes() {
  game.settings.register(MODULE_ID, 'smartAtaque', {
    name: 'Ataque das armas Smart',
    hint: 'O suplemento diz que o ataque Smart é 10 + 1d10 (12 + 1d10 com várias balas), mas não diz se troca REF + perícia ou se é uma opção. Substitui: o tiro único da arma Smart é sempre o teste Smart. Alternativa: o menu de ataque ganha o modo "Smart", e o tiro comum continua REF + perícia.',
    scope: 'world', config: true, type: String, default: 'substitui',
    choices: { substitui: 'Substitui REF + perícia', alternativa: 'É uma alternativa (modo "Smart")' }
  });
  game.settings.register(MODULE_ID, 'smartSemLink', {
    name: 'Arma Smart sem o Smart Link',
    hint: 'As armas Smart só funcionam com o cyberware Smart Link (suplemento p. 30). Sem ele: a arma não dispara, ou dispara como arma comum (REF + perícia, sem o teste Smart).',
    scope: 'world', config: true, type: String, default: 'naoDispara',
    choices: { naoDispara: 'Não dispara', comum: 'Dispara como arma comum' }
  });
  game.settings.register(MODULE_ID, 'cargaEsfria', {
    name: 'A carga Tech esfria uma rodada',
    hint: 'No combate, depois de uma carga (tiro ou rajada), a arma Tech só carrega de novo duas rodadas depois. Fora do combate, não conta.',
    scope: 'world', config: true, type: Boolean, default: true
  });
}

// ---------------- O que a arma é ----------------
const ehArma = item => Boolean(item && (item.type === 'weapon' || (item.type === 'cyberware' && item.system.isWeapon)));

// O perfil de 2077 de uma arma: pelas flags do compêndio (e da ficha do item); armas importadas antes das flags novas
// caem no texto da descrição, que veio do mesmo suplemento.
export function perfil(item) {
  if (!ehArma(item)) return null;
  const f = item.flags?.[MODULE_ID] || {};
  const texto = String(item.system.description?.value || '');
  const classe = ['power', 'tech', 'smart'].includes(f.classe) ? f.classe : null;
  const definido = valor => valor !== undefined && valor !== null && valor !== '';
  const rajada = definido(f.techRajada) ? Math.max(0, Number(f.techRajada) || 0) : Number((String(f.techModo || '').match(/rajada de (\d)/) || [])[1] || 0);
  const smart = classe === 'smart';
  const semRicochete = definido(f.semRicochete) ? Boolean(f.semRicochete) : /só rajada de três balas/i.test(texto);
  return {
    classe,
    smartMulti: smart && Boolean(f.smartMulti),
    doisAlvos: smart && (definido(f.smartDoisAlvos) ? Boolean(f.smartDoisAlvos) : /dois alvos/i.test(texto)),
    doisCanos: smart && (definido(f.smartDoisCanos) ? Boolean(f.smartDoisCanos) : /dois canos/i.test(texto)),
    coronhaRetratil: definido(f.coronhaRetratil) ? Boolean(f.coronhaRetratil) : /coronha recolhida/i.test(texto),
    coronhaRecolhida: Boolean(f.coronhaRecolhida),
    rajada: classe === 'tech' ? rajada : 0,
    semRicochete,
    ricocheteia: classe === 'power' && Boolean(item.system.isRanged) && item.system.weaponSkill !== 'Autofire' && !semRicochete
  };
}

const instalado = (actor, teste) => (actor?.itemTypes?.cyberware || []).some(item => item.system.isInstalled && teste(item));
export const temSmartLink = actor => instalado(actor, item => item.flags?.[MODULE_ID]?.smartLink || /^smart ?link\b/i.test(item.name.trim()));
const temCoprocessador = actor => instalado(actor, item => item.flags?.[MODULE_ID]?.ballisticCoprocessor || /ballistic coprocessor/i.test(item.name));

// Os modos de 2077 que aparecem no menu de ataque desta arma.
export function modosDaArma(p) {
  if (!p || !p.classe) return [];
  if (p.classe === 'power') return p.ricocheteia ? [MODOS.ricochete] : [];
  if (p.classe === 'tech') return [MODOS.carga, ...(p.rajada ? [MODOS.rajada] : [])];
  return config('smartAtaque') === 'alternativa' ? [MODOS.smart] : [];
}

// Rodada em que a arma Tech pode carregar de novo (null: já pode).
export function esfriaAte(item) {
  const marca = item.getFlag(MODULE_ID, 'carga');
  const combate = game.combat;
  if (!config('cargaEsfria') || !marca || !combate || !combate.started || marca.combate !== combate.id) return null;
  return combate.round <= marca.rodada + 1 ? marca.rodada + 2 : null;
}

// ---------------- O sistema ----------------
let sistema = null;
export async function carregarSistema() {
  const rota = arquivo => foundry.utils.getRoute(`systems/${SYSTEM_ID}/modules/${arquivo}`);
  const [rolls, chat, mods, utils] = await Promise.all([import(rota('rolls/cpr-rolls.js')), import(rota('chat/cpr-chat.js')), import(rota('rolls/cpr-modifiers.js')), import(rota('utils/cpr-systemUtils.js'))]);
  sistema = { rolls, CPRChat: chat.default, CPRMod: mods.default, SystemUtils: utils.default };
  return sistema;
}

// Uma "rolagem" que não sai: a janela do sistema devolve "cancelado", e a ficha e os HUDs param ali.
function bloqueada(motivo) {
  ui.notifications.warn(motivo);
  return { bloqueada2077: true, handleRollDialog: async () => false };
}

// Pergunta própria (cobertura, os dois canos) antes da janela de rolagem do sistema. Ctrl pula as duas.
function antesDaJanela(cprRoll, perguntar) {
  const janela = cprRoll.handleRollDialog.bind(cprRoll);
  cprRoll.handleRollDialog = async (evento, actor, item) => {
    if (!(evento && (evento.ctrlKey || evento.metaKey)) && !(await perguntar(cprRoll))) return false;
    return janela(evento, actor, item);
  };
}

async function escolher({ titulo, campos }) {
  const { DialogV2 } = foundry.applications.api;
  return DialogV2.wait({
    window: { title: titulo, icon: 'fa-solid fa-crosshairs' },
    content: `<div class="cpr2077-pergunta">${campos}</div>`,
    buttons: [{ action: 'ok', label: 'Continuar', icon: 'fa-solid fa-check', default: true, callback: (evento, botao) => new FormDataExtended(botao.form).object }],
    rejectClose: false
  }).catch(() => null);
}

// Mods do sistema que valem para qualquer ataque (efeitos, ferimentos) e os da própria arma (attackmod, upgrades).
function modsDoAtaque(cprRoll, item, actor) {
  const { CPRMod, SystemUtils } = sistema;
  const filtrados = CPRMod.getAllModifiers(Array.from(actor.allApplicableEffects())).filter(m => !m.isSituational || m.onByDefault);
  cprRoll.addMod(CPRMod.getRelevantMods(filtrados, 'universalAttack'));
  cprRoll.addMod(CPRMod.getRelevantMods(filtrados, 'ranged'));
  cprRoll.addMod(CPRMod.getRelevantMods(filtrados, 'singleShot'));
  cprRoll.addMod(CPRMod.getRelevantMods(filtrados, ['allActions', 'allActionsSpeech', 'allActionsHands']));
  cprRoll.addMod([{ value: actor.getWoundStateMods(), source: SystemUtils.Localize('CPR.rolls.modifiers.sources.woundStatePenalty') }]);
  const melhorias = SystemUtils.hasMixin(item.type, 'upgradable') ? item.getAllUpgradeMods('attackmod').filter(m => !m.isSituational || m.onByDefault) : [];
  cprRoll.addMod(melhorias);
  if (!melhorias.length || melhorias.some(m => m.type !== 'override')) cprRoll.addMod([{ value: Number(item.system.attackmod) || 0, source: item.name, category: 'combat', key: 'bonuses.universalAttack' }]);
}

// O teste Smart: a rolagem de ataque do sistema com "Teste Smart 10" (ou 12) no lugar de REF e a perícia em 0.
function rolagemSmart(item, actor, p) {
  const { rolls } = sistema;
  const base = p.smartMulti ? 12 : 10;
  const cprRoll = new rolls.CPRAttackRoll(item.name, 'Teste Smart', base, 'Smart Link', 0, item.system.weaponType);
  modsDoAtaque(cprRoll, item, actor);
  cprRoll.modo2077 = MODOS.smart;
  const titulo = () => {
    cprRoll.rollTitle = `${item.name} · Smart (${cprRoll.statValue} + 1d10)`;
    cprRoll.fluxoExtra = {
      descricao: cprRoll.statValue === 12 ? 'Ataque Smart (várias balas)' : 'Ataque Smart',
      ...(p.doisAlvos ? { redirecionar: true, notas: ['Trava em dois alvos a até 4 m um do outro: se errar o primeiro, as balas Smart vão para o segundo.'] } : {})
    };
    cprRoll.nota2077 = `Teste Smart: ${cprRoll.statValue} + 1d10 no lugar de REF + perícia${p.doisAlvos ? '. Trava em dois alvos a até 4 m: se errar o primeiro, as balas vão para o segundo' : ''}.`;
  };
  titulo();
  // Palica: disparar os dois canos sobe para 12 + 1d10 e gasta os dois cartuchos.
  if (p.doisCanos && !p.smartMulti) {
    antesDaJanela(cprRoll, async roll => {
      const resposta = await escolher({ titulo: `${item.name}: teste Smart`, campos: `<label class="checkbox"><input type="checkbox" name="doisCanos"> Disparar os dois canos (12 + 1d10, gasta 2 cartuchos)</label>` });
      if (!resposta) return false;
      if (resposta.doisCanos) { roll.statValue = 12; roll.balas2077 = 2; }
      titulo();
      return true;
    });
  }
  return cprRoll;
}

function ricochete(cprRoll, item, actor) {
  if (temCoprocessador(actor)) cprRoll.addMod([{ value: 2, source: 'Ballistic Coprocessor' }]);
  const tabela = PARECIDAS_COM_SMG.includes(item.system.weaponType) ? 'DV SMG (Autofire)' : 'DV Assault Rifle (Autofire)';
  const dano = typeof item.getWeaponDamage === 'function' ? item.getWeaponDamage() : item.system.damage;
  cprRoll.rollTitle = `${item.name} · Ricochete`;
  cprRoll.modo2077 = MODOS.ricochete;
  cprRoll.fluxoExtra = { descricao: 'Ricochete', tabela, formula: umDadoAMenos(dano), notas: ['Ricochete: DV da tabela de autofogo e um dado a menos de dano (suplemento p. 32).'] };
  cprRoll.nota2077 = `Ricochete: DV da tabela ${tabela.replace('DV ', '')}; ${umDadoAMenos(dano)} de dano (um dado a menos). REF 8+ esquiva.`;
}

function aplicarCobertura(cprRoll, item, p, modo, chave) {
  const c = COBERTURAS[chave] || COBERTURAS.none;
  const rajada = modo === MODOS.rajada;
  const fracao = rajada ? c.rajada : c.carga;
  cprRoll.cobertura2077 = chave;
  cprRoll.rollTitle = `${item.name} · ${rajada ? `Rajada Tech (até ×${p.rajada})` : 'Carga Tech'}${chave === 'none' ? '' : ` através de ${c.rotulo}`}`;
  cprRoll.fluxoExtra = {
    descricao: rajada ? 'Carga Tech (rajada)' : 'Carga Tech',
    ...(rajada ? { tabela: 'DV SMG (Autofire)', multiplicadorMax: p.rajada } : {}),
    ablacao: c.ablacao,
    fracao,
    notas: [`Carga Tech ${chave === 'none' ? 'sem cobertura' : `através de ${c.rotulo}`}: chega ${Math.round(fracao * 100)}% do dano, e a armadura perde ${c.ablacao} de SP se o dano passar.`]
  };
  cprRoll.nota2077 = `${rajada ? `Rajada carregada (tabela de autofogo da SMG, até ×${p.rajada})` : 'Carga Tech'} ${chave === 'none' ? 'sem cobertura' : `através de ${c.rotulo}`}: chega ${Math.round(fracao * 100)}% do dano; a armadura perde ${c.ablacao} de SP se o dano passar. A arma esfria uma rodada.`;
}

function cargaTech(cprRoll, item, p, modo) {
  cprRoll.modo2077 = modo;
  aplicarCobertura(cprRoll, item, p, modo, 'none');
  antesDaJanela(cprRoll, async roll => {
    const opcoes = Object.entries(COBERTURAS).map(([chave, c]) => `<option value="${chave}">${chave === 'none' ? 'Sem cobertura' : `Atrás de ${c.rotulo}`}</option>`).join('');
    const resposta = await escolher({ titulo: `${item.name}: ${NOMES[modo]}`, campos: `<label>O alvo está <select name="cobertura">${opcoes}</select></label>` });
    if (!resposta) return false;
    aplicarCobertura(roll, item, p, modo, resposta.cobertura);
    return true;
  });
}

// Dano pelo botão do cartão (ou pelo Combat HUD) num modo de 2077: "ricochete", "cargaTech:thin", "rajadaTech:none".
function danoDoModo(original, item, actor, extraData, p) {
  const [modo, chave = 'none'] = String((extraData && extraData.damageType) || '').split(':');
  if (!Object.values(MODOS).includes(modo)) return undefined;
  let cprRoll;
  if (modo === MODOS.rajada) {
    cprRoll = original.call(item, 'damage', actor, { damageType: 'autofire' });
    if (p.rajada) cprRoll.autofireMultiplierMax = p.rajada;
  } else cprRoll = original.call(item, 'damage', actor, { damageType: 'attack' });
  if (!cprRoll) return cprRoll;
  if (modo === MODOS.ricochete) {
    cprRoll.formula = umDadoAMenos(cprRoll.formula);
    cprRoll.rollTitle = `${item.name} · Ricochete (um dado a menos)`;
  }
  if (modo === MODOS.carga || modo === MODOS.rajada) {
    const c = COBERTURAS[chave] || COBERTURAS.none;
    const fracao = modo === MODOS.rajada ? c.rajada : c.carga;
    cprRoll.rollCardExtraArgs.ablationValue = c.ablacao;
    cprRoll.rollTitle = `${item.name} · ${NOMES[modo]}${fracao < 1 ? ` (${c.rotulo}: chega ${Math.round(fracao * 100)}% do dano)` : ''}`;
  }
  return cprRoll;
}

// Ajustes que valem para todo ataque com arma de 2077: o +1 da qualidade excelente (as armas importadas antes da
// correção do compêndio vieram sem ele) e o −1 da coronha recolhida.
function ajustesGerais(cprRoll, item, p) {
  if (item.system.quality === 'excellent' && !(Number(item.system.attackmod) >= 1)) cprRoll.addMod([{ value: 1, source: 'Qualidade excelente' }]);
  if (p.coronhaRetratil && p.coronhaRecolhida) cprRoll.addMod([{ value: -1, source: 'Coronha recolhida' }]);
  if (!p.doisCanos) return;
  // Palica com os dois canos (escolhidos na pergunta antes da janela): o sistema gasta um cartucho por tiro; aqui, dois.
  const consumo = item.bulletConsumption;
  if (typeof consumo === 'function' && !consumo.cpr2077) {
    const novo = function (roll) { return roll && roll.balas2077 ? roll.balas2077 : consumo.call(this, roll); };
    novo.cpr2077 = true;
    item.bulletConsumption = novo;
  }
}

function criarRolagem(original, item, type, actor, extraData) {
  const p = perfil(item);
  if (!p || !sistema || !actor) return undefined;
  if (type === 'damage') return p.classe ? danoDoModo(original, item, actor, extraData, p) : undefined;
  const nosso = Object.values(MODOS).includes(type);
  if (!nosso && !TIPOS_DE_ATAQUE.includes(type)) return undefined;
  if (!p.classe) return nosso ? bloqueada(`${item.name} não é uma arma de 2077 (Power, Tech ou Smart): não tem o modo ${NOMES[type]}.`) : undefined;
  const link = temSmartLink(actor);
  if (p.classe === 'smart' && !link && config('smartSemLink') === 'naoDispara') return bloqueada(`${item.name} é uma arma Smart: só dispara com o Smart Link instalado.`);
  let modo = type;
  if (type === 'attack' && p.classe === 'smart' && link && config('smartAtaque') === 'substitui') modo = MODOS.smart;
  let cprRoll;
  switch (modo) {
    case MODOS.smart:
      if (p.classe !== 'smart') return bloqueada(`${item.name} não é uma arma Smart.`);
      if (!link) return bloqueada(`${item.name}: o teste Smart precisa do Smart Link instalado.`);
      cprRoll = rolagemSmart(item, actor, p);
      break;
    case MODOS.ricochete:
      if (!p.ricocheteia) return bloqueada(`${item.name} não ricocheteia: só armas Power que fazem tiro único (as que disparam três balas ou mais não ricocheteiam com precisão).`);
      cprRoll = original.call(item, 'attack', actor);
      if (cprRoll) ricochete(cprRoll, item, actor);
      break;
    case MODOS.carga:
    case MODOS.rajada: {
      if (p.classe !== 'tech') return bloqueada(`${item.name} não é uma arma Tech.`);
      if (modo === MODOS.rajada && !p.rajada) return bloqueada(`${item.name} só faz a carga em tiro único.`);
      const rodada = esfriaAte(item);
      if (rodada) return bloqueada(`${item.name} ainda está esfriando: carrega de novo na rodada ${rodada}.`);
      cprRoll = original.call(item, modo === MODOS.rajada ? 'autofire' : 'attack', actor);
      if (cprRoll) cargaTech(cprRoll, item, p, modo);
      break;
    }
    default:
      cprRoll = original.call(item, type, actor, extraData);
  }
  if (cprRoll) ajustesGerais(cprRoll, item, p);
  return cprRoll;
}

// Troca o createRoll dos itens do sistema (o mesmo método que a ficha, o Combat HUD e o Token Action HUD chamam).
export function instalarModos() {
  const prototipo = CONFIG.Item.documentClass.prototype;
  const original = prototipo.createRoll;
  if (original.cpr2077) return;
  const novo = function (type, actor, extraData = []) {
    try {
      const nossa = criarRolagem(original, this, type, actor, extraData);
      if (nossa !== undefined) return nossa;
    } catch (error) {
      console.error(`${MODULE_ID} | modo de 2077`, error);
    }
    return original.call(this, type, actor, extraData);
  };
  novo.cpr2077 = true;
  prototipo.createRoll = novo;
}

// ---------------- Cartão do ataque ----------------
// No cartão: o botão de dano leva o modo (o dano sai com um dado a menos, a ablação certa) e uma nota diz a regra.
// A carga Tech marca a rodada (para esfriar).
const pendentes = [];
export function instalarCartoes() {
  const { CPRChat } = sistema;
  const anterior = CPRChat.RenderRollCard;
  if (anterior.cpr2077) return;
  const novo = function (cprRoll) {
    if (!cprRoll || !cprRoll.modo2077) return anterior.call(this, cprRoll);
    const marca = { item: cprRoll.entityData && cprRoll.entityData.item, modo: cprRoll.modo2077, cobertura: cprRoll.cobertura2077, nota: cprRoll.nota2077 || '' };
    pendentes.push(marca);
    marcarCarga(cprRoll);
    const criado = anterior.call(this, cprRoll);
    Promise.resolve(criado).finally(() => { const i = pendentes.indexOf(marca); if (i >= 0) pendentes.splice(i, 1); });
    return criado;
  };
  novo.cpr2077 = true;
  CPRChat.RenderRollCard = novo;
  Hooks.on('preCreateChatMessage', (mensagem, dados, opcoes, usuario) => {
    if (usuario !== game.user.id || !pendentes.length) return;
    const conteudo = String(mensagem.content || '');
    const marca = pendentes.find(m => !m.usada && conteudo.includes(`data-item-id="${m.item}"`));
    if (!marca) return;
    marca.usada = true;
    const modelo = document.createElement('template');
    modelo.innerHTML = conteudo;
    const botao = modelo.content.querySelector('a[data-action="rollDamage"]');
    if (botao) botao.dataset.attackType = marca.cobertura ? `${marca.modo}:${marca.cobertura}` : marca.modo;
    const cartao = modelo.content.querySelector('.rollcard') || modelo.content.firstElementChild;
    if (cartao && marca.nota) cartao.insertAdjacentHTML('beforeend', `<div class="cpr2077-modo-nota"><i class="fa-solid ${ICONES[marca.modo] || 'fa-gun'}"></i> ${esc(marca.nota)}</div>`);
    mensagem.updateSource({ content: modelo.innerHTML, [`flags.${MODULE_ID}.modo`]: marca.modo });
  });
}

function marcarCarga(cprRoll) {
  if (![MODOS.carga, MODOS.rajada].includes(cprRoll.modo2077) || !game.combat || !game.combat.started) return;
  const dono = cprRoll.entityData || {};
  const actor = (dono.token && game.actors.tokens[dono.token]) || game.actors.get(dono.actor);
  const item = actor && actor.items.get(dono.item);
  if (item && item.isOwner) item.setFlag(MODULE_ID, 'carga', { combate: game.combat.id, rodada: game.combat.round }).catch(() => {});
}

// ---------------- Ataque pronto (macros) ----------------
// O mesmo caminho da ficha e do Combat HUD: createRoll → janela → munição → rolagem → Sorte → cartão.
export async function atacarComModo({ actor, token = null, arma, modo }) {
  const { CPRChat, SystemUtils } = sistema;
  let cprRoll = arma.createRoll(modo, actor);
  if (!cprRoll) return null;
  if (!(await cprRoll.handleRollDialog({ type: 'click', ctrlKey: false, metaKey: false }, actor, arma))) return null;
  cprRoll = await arma.confirmRoll(cprRoll);
  await cprRoll.roll();
  if (Number.isInteger(cprRoll.luck) && cprRoll.luck > 0) {
    const sorte = actor.system.stats.luck.value;
    await actor.update({ 'system.stats.luck.value': sorte - Math.min(sorte, cprRoll.luck) });
  }
  const doc = token && (token.document || token);
  cprRoll.entityData = { actor: actor.id, token: doc && !doc.actorLink ? doc.id : null, tokens: SystemUtils.getUserTargetedOrSelected('targeted'), item: arma.id };
  return CPRChat.RenderRollCard(cprRoll);
}

// ---------------- Menu de ataque: ficha do personagem ----------------
function pilulas(item, p, actor) {
  const partes = [`<span class="text-pill cpr2077-classe cpr2077-${p.classe}" data-tooltip="${esc(DICAS[p.classe === 'power' ? 'ricochete' : p.classe === 'tech' ? 'cargaTech' : 'smart'])}">${p.classe === 'power' ? 'Power' : p.classe === 'tech' ? 'Tech' : 'Smart'}</span>`];
  if (p.classe === 'smart') {
    if (!temSmartLink(actor)) partes.push(`<span class="text-pill cpr2077-alerta" data-tooltip="As armas Smart só funcionam com o cyberware Smart Link.">Sem Smart Link</span>`);
    else partes.push(`<span class="text-pill" data-tooltip="${esc(DICAS.smart)}">Smart ${p.smartMulti ? 12 : 10} + 1d10</span>`);
  }
  if (p.coronhaRetratil) partes.push(`<a class="text-pill cpr2077-coronha${p.coronhaRecolhida ? ' cpr2077-ativa' : ''}" data-item-id="${item.id}" data-tooltip="Clique para ${p.coronhaRecolhida ? 'estender (uma Ação)' : 'recolher (dá para esconder; −1 nos ataques)'}">Coronha ${p.coronhaRecolhida ? 'recolhida (−1)' : 'estendida'}</a>`);
  const rodada = p.classe === 'tech' ? esfriaAte(item) : null;
  if (rodada) partes.push(`<span class="text-pill cpr2077-alerta" data-tooltip="Depois de uma carga, a arma Tech esfria uma rodada.">Esfriando: carga na rodada ${rodada}</span>`);
  return partes.join('');
}

// Os modos de 2077 ficam na segunda linha da arma, ao lado da munição: a coluna de modos do sistema (mirar,
// autofogo, supressivo) tem altura fixa e não cabe mais nada.
function itemDoMenu(actor, item, modo, rotulo = NOMES[modo]) {
  const ativo = actor.getFlag(SYSTEM_ID, `firetype-${item.id}`) === modo;
  return `<a class="cpr2077-modo${ativo ? ' cpr2077-ativa' : ''}" data-fire-mode="${modo}" data-item-id="${item.id}" data-tooltip="${esc(DICAS[modo])}"><i class="far ${ativo ? 'fa-circle-dot' : 'fa-circle'}"></i> ${rotulo}</a>`;
}

// A tabela de DV de um modo: Ricochete e Rajada usam a de autofogo; os outros, a da arma.
function tabelaDoModo(item, modo) {
  if (modo === MODOS.ricochete) return PARECIDAS_COM_SMG.includes(item.system.weaponType) ? 'DV SMG (Autofire)' : 'DV Assault Rifle (Autofire)';
  if (modo === MODOS.rajada) return 'DV SMG (Autofire)';
  return item.system.dvTable || null;
}

// Liga e desliga o modo, como os modos do sistema (a flag firetype-<arma> do ator). Como o sistema faz no autofogo,
// a régua de medir do token passa a mostrar a DV da tabela do modo.
export async function alternarModo(actor, itemId, modo) {
  const chave = `firetype-${itemId}`;
  const desligando = actor.getFlag(SYSTEM_ID, chave) === modo;
  if (desligando) await actor.unsetFlag(SYSTEM_ID, chave);
  else await actor.setFlag(SYSTEM_ID, chave, modo);
  const item = actor.items.get(itemId);
  const token = canvas.tokens?.controlled.find(t => t.actor?.id === actor.id) ?? actor.getActiveTokens()[0];
  const tabela = item && tabelaDoModo(item, desligando ? null : modo);
  if (token && token.isOwner && tabela && sistema) await sistema.SystemUtils.SetDvTable(token, tabela).catch(() => {});
}

export function noMenuDaFicha(sheet, html) {
  const actor = sheet.actor;
  const raiz = html && (html[0] || html);
  if (!actor || !raiz || !raiz.querySelectorAll) return;
  for (const linha of raiz.querySelectorAll('.weapon-grid[data-item-id]')) {
    const item = actor.items.get(linha.dataset.itemId);
    const p = perfil(item);
    if (!p || !p.classe) continue;
    const info = linha.querySelector('.weapon-info');
    if (info) info.insertAdjacentHTML('afterbegin', pilulas(item, p, actor));
    const municao = linha.querySelector('.weapon-ammo');
    const modos = modosDaArma(p);
    if (municao && modos.length) {
      const rotulos = { [MODOS.ricochete]: 'Ricochete', [MODOS.carga]: 'Carga', [MODOS.rajada]: `Rajada ×${p.rajada}`, [MODOS.smart]: 'Smart' };
      municao.insertAdjacentHTML('beforeend', `<span class="cpr2077-modos">${modos.map(modo => itemDoMenu(actor, item, modo, rotulos[modo])).join('')}</span>`);
    }
  }
  if (!sheet.isEditable) return;
  for (const botao of raiz.querySelectorAll('.cpr2077-modo')) {
    botao.addEventListener('click', evento => { evento.preventDefault(); alternarModo(actor, botao.dataset.itemId, botao.dataset.fireMode); });
  }
  for (const botao of raiz.querySelectorAll('.cpr2077-coronha')) {
    botao.addEventListener('click', evento => {
      evento.preventDefault();
      const item = actor.items.get(botao.dataset.itemId);
      if (item) item.setFlag(MODULE_ID, 'coronhaRecolhida', !item.getFlag(MODULE_ID, 'coronhaRecolhida'));
    });
  }
}

// ---------------- Menu de ataque: Combat HUD ----------------
// Os botões usam o data-action "fire-mode" do próprio HUD (ele grava a mesma flag e rola pelo createRoll).
export function noCombatHud(app, html) {
  const actor = app.actor;
  const raiz = html && (html[0] || html);
  if (!actor || !raiz || !raiz.querySelectorAll) return;
  for (const caixa of raiz.querySelectorAll('.chud-weapon-buttons')) {
    const id = (caixa.querySelector('[data-item-id]') || {}).dataset?.itemId;
    const item = id && actor.items.get(id);
    const p = perfil(item);
    if (!p || !p.classe) continue;
    const ativo = actor.getFlag(SYSTEM_ID, `firetype-${id}`);
    const botoes = modosDaArma(p).map(modo => `<button type="button" class="chud-toggle cpr2077-chud${ativo === modo ? ' active' : ''}" data-action="fire-mode" data-item-id="${id}" data-mode="${modo}" title="${esc(`${NOMES[modo]}: ${DICAS[modo]}`)}"><i class="fa-solid ${ICONES[modo]}"></i></button>`).join('');
    if (botoes) caixa.insertAdjacentHTML('afterbegin', botoes);
    if (p.classe === 'smart' && !temSmartLink(actor)) caixa.insertAdjacentHTML('afterbegin', '<span class="cpr2077-chud-alerta" title="As armas Smart só funcionam com o cyberware Smart Link.">sem Smart Link</span>');
  }
}

// ---------------- Para outros HUDs (o Painel Tático) ----------------
// O que a linha da arma mostra: a classe, os modos (com o ativo), o teste Smart e os avisos (sem Smart Link,
// esfriando, coronha). Os modos ligam e desligam por alternarModo, que grava a mesma flag da ficha.
const ROTULOS_CURTOS = { power: 'Power', tech: 'Tech', smart: 'Smart' };
export function paraHud(actor, item) {
  const p = perfil(item);
  if (!actor || !p || !p.classe) return null;
  const ativo = actor.getFlag(SYSTEM_ID, `firetype-${item.id}`);
  const rotulos = { [MODOS.ricochete]: 'Ricochete', [MODOS.carga]: 'Carga', [MODOS.rajada]: `Rajada ×${p.rajada}`, [MODOS.smart]: 'Smart' };
  const link = temSmartLink(actor);
  const alertas = [];
  if (p.classe === 'smart' && !link) alertas.push({ texto: 'sem Smart Link', dica: 'As armas Smart só funcionam com o cyberware Smart Link.' });
  const rodada = p.classe === 'tech' ? esfriaAte(item) : null;
  if (rodada) alertas.push({ texto: `esfriando: rodada ${rodada}`, dica: 'Depois de uma carga, a arma Tech esfria uma rodada.' });
  return {
    classe: p.classe,
    rotulo: ROTULOS_CURTOS[p.classe],
    dica: DICAS[p.classe === 'power' ? 'ricochete' : p.classe === 'tech' ? 'cargaTech' : 'smart'],
    smart: p.classe === 'smart' && link ? `${p.smartMulti ? 12 : 10} + 1d10` : null,
    modos: modosDaArma(p).map(modo => ({ modo, nome: NOMES[modo], rotulo: rotulos[modo], dica: DICAS[modo], icone: ICONES[modo], ativo: ativo === modo })),
    alertas,
    coronha: p.coronhaRetratil ? { recolhida: p.coronhaRecolhida } : null
  };
}
export const alternarCoronha = item => item.setFlag(MODULE_ID, 'coronhaRecolhida', !item.getFlag(MODULE_ID, 'coronhaRecolhida'));

// ---------------- Ficha do item: a classe de 2077 ----------------
// Campos no próprio formulário da ficha (flags.cpr-2077.*): o sistema salva sozinho, como os outros.
export function naFichaDoItem(sheet, html) {
  const item = sheet.item;
  const raiz = html && (html[0] || html);
  if (!ehArma(item) || !raiz || !raiz.querySelector) return;
  const ancora = (raiz.querySelector('select[name="system.weaponType"]') || {}).closest?.('li') || raiz.querySelector('.item-settings-tab ol.items-list > li:last-child');
  if (!ancora) return;
  const p = perfil(item);
  const editavel = sheet.isEditable;
  const linha = (rotulo, campo, dica = '') => `<li class="item flexrow cpr2077-ficha"><div class="item flexrow setting-name text-nowrap"${dica ? ` data-tooltip="${esc(dica)}"` : ''}>${rotulo}</div><div class="item flexrow setting-value text-nowrap item-end">${campo}</div></li>`;
  const caixa = (nome, marcado, dica, rotulo) => linha(rotulo, editavel ? `<input type="checkbox" name="flags.${MODULE_ID}.${nome}" data-dtype="Boolean"${marcado ? ' checked' : ''}>` : (marcado ? 'Sim' : 'Não'), dica);
  const classes = { '': 'Nenhuma', power: 'Power', tech: 'Tech', smart: 'Smart' };
  let html2 = linha('Classe (2077)', editavel
    ? `<select name="flags.${MODULE_ID}.classe">${Object.entries(classes).map(([valor, rotulo]) => `<option value="${valor}"${(p.classe || '') === valor ? ' selected' : ''}>${rotulo}</option>`).join('')}</select>`
    : classes[p.classe || ''], 'Power: ricochete. Tech: carga e rajada. Smart: teste Smart, só com o Smart Link.');
  if (p.classe === 'smart') {
    html2 += caixa('smartMulti', p.smartMulti, 'Os modelos que disparam várias balas Smart: o teste sobe para 12 + 1d10.', 'Várias balas Smart (12 + 1d10)');
    html2 += caixa('smartDoisAlvos', p.doisAlvos, 'Como a Tsunami Kappa: trava dois alvos a até 4 m; se errar o primeiro, as balas vão para o segundo.', 'Trava em dois alvos');
    html2 += caixa('smartDoisCanos', p.doisCanos, 'Como a Rostovic Palica: disparar os dois canos sobe o teste para 12 + 1d10.', 'Dois canos');
  }
  if (p.classe === 'tech') html2 += linha('Rajada da carga (×)', editavel ? `<input type="number" name="flags.${MODULE_ID}.techRajada" data-dtype="Number" min="0" max="6" value="${p.rajada}">` : String(p.rajada), 'Multiplicador máximo da rajada carregada (0: só tiro único).');
  if (p.classe === 'power') html2 += caixa('semRicochete', p.semRicochete, 'Armas que não disparam menos de três balas não ricocheteiam com precisão.', 'Não ricocheteia (só rajadas)');
  if (p.classe) {
    html2 += caixa('coronhaRetratil', p.coronhaRetratil, 'Coronha que recolhe para esconder a arma; recolhida, −1 nos ataques.', 'Coronha retrátil');
    if (p.coronhaRetratil) html2 += caixa('coronhaRecolhida', p.coronhaRecolhida, '−1 nos ataques até estender de novo (uma Ação).', 'Coronha recolhida agora');
  }
  ancora.insertAdjacentHTML('afterend', html2);
}
