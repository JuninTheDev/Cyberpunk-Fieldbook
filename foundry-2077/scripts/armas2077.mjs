// Armas de 2077 no menu de ataque do próprio sistema, com as regras do Cyberpunk Edgerunners Mission Kit (p. 31–35).
// A classe da arma (Power, Smart, Tech) é um campo da ficha do item (as armas do compêndio) ou vem de um Rebuild
// instalado nela:
// - Power: a lesão crítica causa 5 a mais de dano bônus (10). Modo Ricochete: −4 no ataque, contra um alvo atrás de
//   cobertura ou fora da linha de visão (no tiro mirado, vale só a penalidade do mirado; o Ballistic Coprocessor deixa
//   em −2).
// - Smart: +1 nos ataques à distância, e só dispara conectada (o Personal Link do Neuroport, Interface Plugs, Subdermal
//   Grip). Com a munição Smart melhorada, errou a DV por 5 ou menos: segunda
//   chance com 14 + 1d10, que o Fluxo de Combate rola (sem ele, a nota do cartão diz a regra).
// - Tech: Carregar (gasta a Ação de Movimento; dura até disparar ou 20 rodadas). Carregada, o próximo ataque é de
//   CDT 1, atravessa cobertura fina e ignora metade do SP do alvo; a cobertura não perde HP.
// E as regras próprias de cada arma, das flags do compêndio: balas por ataque e o dano com menos balas, o dano do tiro
// mirado, o dano fixo, o BODY mínimo e a lesão sem cromo, o ferrolho, a carga da Omaha, da Burya e da Nekomata, os
// dois canos da Palica, os dois alvos da Kappa e a coronha da Dian.
// Tudo passa pela rolagem do sistema (janela de rolagem, munição, Sorte, cartão): o Fluxo de Combate pega o ataque com
// os ajustes (`cprRoll.fluxoExtra`), e sem ele o botão de dano do cartão leva os ajustes e rola o dano certo.
const MODULE_ID = 'cpr-2077';
const SYSTEM_ID = 'cyberpunk-red-core';

export const MODOS = { ricochete: 'ricochete' };
const NOMES = { ricochete: 'Ricochete' };
const ICONES = { ricochete: 'fa-arrows-turn-to-dots', carga: 'fa-bolt', ferrolho: 'fa-hand-back-fist', coronha: 'fa-ruler-horizontal' };
export const DICAS = {
  power: 'Power (Mission Kit): a lesão crítica causa 10 de dano bônus em vez de 5. Tem o modo Ricochete.',
  smart: 'Smart (Mission Kit): +1 nos ataques à distância; só dispara conectada (Neuroport, Interface Plugs ou Subdermal Grip). Com a munição Smart melhorada, errou a DV por 5 ou menos: segunda chance com 14 + 1d10.',
  tech: 'Tech (Mission Kit): carregar gasta a Ação de Movimento; carregada, o próximo ataque é de CDT 1, atravessa cobertura fina e ignora metade do SP.',
  ricochete: 'Ricochete (Power): −4 no ataque para acertar um alvo atrás de cobertura ou fora da linha de visão; o alcance é a distância até o alvo. Num tiro mirado, use o modo mirado: vale só a penalidade dele.'
};
export const REGRAS = {
  bonusPower: 10, ricochete: -4, ricocheteComCoprocessador: -2, smart: 1, metadeDoSP: 50, duracaoDaCarga: 20,
  segundaChance: { base: 14, margem: 5 }
};
const LESOES = { 'Torn Muscle': 'Músculo Rompido', 'Broken Arm': 'Braço Quebrado' };
const TIPOS_DE_ATAQUE = ['attack', 'aimed', 'autofire', 'suppressive'];
const TIRO_UNICO = ['attack', 'aimed', MODOS.ricochete];
const config = chave => game.settings.get(MODULE_ID, chave);
const sinal = valor => (valor < 0 ? `−${-valor}` : `+${valor}`);
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- Configurações ----------------
export function registrarConfiguracoes() {
  game.settings.register(MODULE_ID, 'conexaoSmart', {
    name: 'Conexão das armas Smart',
    hint: 'No Mission Kit, a arma Smart só dispara conectada pelo Personal Link (o Interface Plug que vem no Neuroport) ou pelo Subdermal Grip (p. 32). Exige a conexão: confere o cyberware instalado (Neuroport, Interface Plugs ou Subdermal Grip). Todo mundo tem o Neuroport: não confere.',
    scope: 'world', config: true, type: String, default: 'exige',
    choices: { exige: 'Exige a conexão instalada', todos: 'Todo mundo tem o Neuroport (não confere)' }
  });
}

// ---------------- O que a arma é ----------------
const ehArma = item => Boolean(item && (item.type === 'weapon' || (item.type === 'cyberware' && item.system.isWeapon)));
const CLASSES = ['power', 'tech', 'smart'];
const numero = valor => Math.max(0, Number(valor) || 0);

// O Rebuild instalado na arma (Kit p. 31): a classe que ele dá, ou null.
function rebuildDa(item) {
  if (!item.actor || typeof item.getInstalledItems !== 'function') return null;
  try {
    for (const upgrade of item.getInstalledItems('itemUpgrade')) {
      const marcada = upgrade.flags?.[MODULE_ID]?.rebuild;
      if (CLASSES.includes(marcada)) return marcada;
      const pelo = String(upgrade.name).match(/^(power|smart|tech) rebuild$/i);
      if (pelo) return pelo[1].toLowerCase();
    }
  } catch { /* item sem slots */ }
  return null;
}

// A munição carregada é Smart melhorada?
function municaoDa(item) {
  if (typeof item.getInstalledItems !== 'function') return null;
  try { return item.getInstalledItems('ammo')[0] || null; } catch { return null; }
}
const smartMelhorada = municao => Boolean(municao && (municao.flags?.[MODULE_ID]?.smartMelhorada || /smart melhorada|improved smart/i.test(municao.name)));

// A carga Tech: { carregada, combate, rodada, turno, disparou } na flag "carga" da arma, ou null se já passou.
function cargaDa(item) {
  const c = item.flags?.[MODULE_ID]?.carga;
  if (!c || !c.carregada) return null;
  const combate = typeof game !== 'undefined' && game.combat && game.combat.started ? game.combat : null;
  if (c.combate && combate && c.combate === combate.id) {
    if (combate.round - Number(c.rodada) >= REGRAS.duracaoDaCarga) return null;
    // A Omaha: carregada até o fim do turno em que disparou.
    if (c.disparou && (combate.round !== c.disparou.rodada || combate.turn !== c.disparou.turno)) return null;
    return c;
  }
  // Fora daquele combate: a carga fica até disparar (a Omaha, mais alguns segundos para o segundo tiro do turno).
  if (c.disparou) return Date.now() - Number(c.disparou.em || 0) < 15000 ? c : null;
  return c;
}

// O perfil de 2077 de uma arma, das flags do compêndio (e da ficha do item) e do Rebuild instalado.
export function perfil(item) {
  if (!ehArma(item)) return null;
  const f = item.flags?.[MODULE_ID] || {};
  const rebuild = CLASSES.includes(f.classe) ? null : rebuildDa(item);
  const classe = CLASSES.includes(f.classe) ? f.classe : rebuild;
  const municao = classe === 'smart' ? municaoDa(item) : null;
  const carga = classe === 'tech' ? cargaDa(item) : null;
  return {
    classe,
    rebuild: Boolean(rebuild),
    origem: f.origem || null,
    balas: numero(f.balas),
    danoComMenos: f.danoComMenos || null,
    minimoDeBalas: numero(f.minimoDeBalas),
    danoFixo: f.danoFixo || null,
    danoMirado: f.danoMirado || null,
    exigeBody: numero(f.exigeBody),
    lesao: f.lesao || null,
    lesaoSemCromo: f.lesaoSemCromo || null,
    cargaSemMovimento: Boolean(f.cargaSemMovimento),
    cargaAteFimDoTurno: Boolean(f.cargaAteFimDoTurno),
    balasNaCarga: numero(f.balasNaCarga),
    cdtNaCarga: numero(f.cdtNaCarga),
    cargaGrossa: Boolean(f.cargaGrossa),
    ferrolho: Boolean(f.ferrolho),
    ferrolhoPendente: Boolean(f.ferrolho && f.ferrolhoPendente),
    soSmartMelhorada: Boolean(f.soSmartMelhorada),
    smartMelhorada: smartMelhorada(municao),
    doisAlvos: Boolean(f.doisAlvos),
    doisCanos: Boolean(f.doisCanos),
    coronhaRetratil: Boolean(f.coronhaRetratil),
    coronhaRecolhida: Boolean(f.coronhaRetratil && f.coronhaRecolhida),
    carregada: Boolean(carga),
    carga,
    ricocheteia: classe === 'power' && Boolean(item.system.isRanged) && item.system.weaponSkill !== 'Autofire'
  };
}
// Tem alguma regra própria (mesmo sem classe)?
const temRegras = p => Boolean(p && (p.classe || p.balas || p.danoFixo || p.danoMirado || p.exigeBody || p.lesaoSemCromo || p.ferrolho || p.doisCanos || p.coronhaRetratil));

const instalado = (actor, teste) => (actor?.itemTypes?.cyberware || []).some(item => item.system.isInstalled && teste(item));
// A conexão da arma Smart: o Personal Link (Neuroport, Interface Plugs) ou o Subdermal Grip. O Smart Link do suplemento de
// fã saiu na revisão de 2026-10-13; um item antigo com o nome ou a marca dele continua contando.
export const temConexao = actor => config('conexaoSmart') === 'todos'
  || instalado(actor, item => item.flags?.[MODULE_ID]?.conexaoSmart || /^(neuroport|interface plugs?|personal link|subdermal grip|smart ?link)\b/i.test(item.name.trim()));
const temCoprocessador = actor => instalado(actor, item => item.flags?.[MODULE_ID]?.ballisticCoprocessor || /ballistic coprocessor/i.test(item.name));
// Cromo que aguenta a Burya: Grafted Muscle and Bone Lace (ou o esqueleto do suplemento) ou um cyberbraço.
const temCromoNoBraco = actor => instalado(actor, item => item.system.type === 'cyberArm' && item.system.isFoundational
  || /muscle (and|&) bone lace|epimorphic skeleton|titanium bones|^cyberarm\b/i.test(item.name));

// Os modos de 2077 que aparecem no menu de ataque desta arma.
export const modosDaArma = p => (p && p.ricocheteia ? [MODOS.ricochete] : []);

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

// Pergunta própria (os dois canos) antes da janela de rolagem do sistema. Ctrl pula as duas.
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

// ---------------- O ataque ----------------
// O que este ataque leva de 2077: as notas do cartão, o dano (fórmula, metade do SP) e o que o Fluxo recebe.
function kitDe(cprRoll) {
  if (!cprRoll.kit2077) cprRoll.kit2077 = { notas: [], formula: null, metadeDoSP: false, carga: false };
  return cprRoll.kit2077;
}
function nota(cprRoll, texto) { kitDe(cprRoll).notas.push(texto); }

// O sistema gasta 1 bala por tiro (10 no autofogo); as armas de 2077 gastam o que a regra delas diz.
function gastar(item, cprRoll, balas) {
  cprRoll.balas2077 = balas;
  const consumo = item.bulletConsumption;
  if (typeof consumo === 'function' && !consumo.cpr2077) {
    const novo = function (roll) { return roll && roll.balas2077 ? roll.balas2077 : consumo.call(this, roll); };
    novo.cpr2077 = true;
    item.bulletConsumption = novo;
  }
}

function ricochete(cprRoll, item, actor) {
  const coprocessador = temCoprocessador(actor);
  cprRoll.addMod([{ value: coprocessador ? REGRAS.ricocheteComCoprocessador : REGRAS.ricochete, source: coprocessador ? 'Ricochete (Ballistic Coprocessor)' : 'Ricochete' }]);
  cprRoll.rollTitle = `${item.name} · Ricochete`;
  cprRoll.modo2077 = MODOS.ricochete;
  cprRoll.fluxoExtra = { ...(cprRoll.fluxoExtra || {}), descricao: 'Ricochete' };
  nota(cprRoll, `Ricochete: ${sinal(coprocessador ? REGRAS.ricocheteComCoprocessador : REGRAS.ricochete)} no ataque; o alcance é a distância até o alvo, e precisa de um caminho livre do ponto do ricochete até ele.`);
}

// Ajustes de todo ataque com arma de 2077 (o tipo do sistema ou o Ricochete).
function ajustes(cprRoll, item, actor, p, type) {
  const extra = cprRoll.fluxoExtra = { ...(cprRoll.fluxoExtra || {}), notas: [...((cprRoll.fluxoExtra && cprRoll.fluxoExtra.notas) || [])] };
  const kit = kitDe(cprRoll);
  const pente = Number(item.system.magazine?.value) || 0;
  const tiroUnico = TIRO_UNICO.includes(type);
  // O +1 da qualidade excelente (as armas importadas antes da correção do compêndio vieram sem ele) e a coronha.
  if (item.system.quality === 'excellent' && !(Number(item.system.attackmod) >= 1)) cprRoll.addMod([{ value: 1, source: 'Qualidade excelente' }]);
  if (p.coronhaRecolhida) cprRoll.addMod([{ value: -1, source: 'Coronha recolhida' }]);

  if (p.classe === 'smart' && item.system.isRanged) {
    cprRoll.addMod([{ value: REGRAS.smart, source: 'Arma Smart' }]);
    if (p.smartMelhorada) {
      extra.segundaChance = true;
      nota(cprRoll, `Munição Smart melhorada: ignora escuridão, fumaça e neblina. Errou a DV por ${REGRAS.segundaChance.margem} ou menos: tenta de novo com ${REGRAS.segundaChance.base} + 1d10 (mais Sorte) contra a mesma DV, com as penalidades deste tiro.`);
    }
    if (p.doisAlvos) {
      extra.redirecionar = true;
      nota(cprRoll, 'Trava em dois alvos a até 4 m um do outro: se errar o primeiro, as balas Smart vão para o segundo.');
    }
  }

  // Balas por tiro (Yukimura, Shingen, Masamune, Zhuo): com menos no pente, dispara o que tem com o dano menor.
  if (p.balas > 1 && tiroUnico) {
    const balas = p.danoComMenos ? Math.min(p.balas, pente) : p.balas;
    gastar(item, cprRoll, Math.max(1, balas));
    if (p.danoComMenos && pente < p.balas) {
      kit.formula = p.danoComMenos;
      nota(cprRoll, `Só ${pente} ${pente === 1 ? 'bala' : 'balas'} no pente: dispara o que tem e causa ${p.danoComMenos}.`);
    } else nota(cprRoll, `Gasta ${p.balas} balas no tiro.`);
  }
  if (p.danoFixo && type !== 'autofire') kit.formula = kit.formula || p.danoFixo;
  if (p.danoMirado && type === 'aimed') {
    kit.formula = p.danoMirado;
    nota(cprRoll, `Tiro mirado: ${p.danoMirado} de dano.`);
  }

  // A carga Tech: o próximo ataque (que não seja explosivo) ignora metade do SP e atravessa cobertura fina.
  if (p.classe === 'tech' && p.carregada && type !== 'suppressive') {
    kit.carga = true;
    kit.metadeDoSP = true;
    extra.ignorarSP = REGRAS.metadeDoSP;
    extra.descricao = extra.descricao || 'Tiro Tech carregado';
    if (p.balasNaCarga > 1 && tiroUnico) gastar(item, cprRoll, Math.max(1, Math.min(p.balasNaCarga, pente)));
    const cobertura = p.cargaGrossa ? 'cobertura fina e grossa' : 'cobertura fina';
    nota(cprRoll, `Carregada: ${p.cdtNaCarga ? `continua CDT ${p.cdtNaCarga}${p.balasNaCarga ? ` e gasta até ${p.balasNaCarga} balas por ataque` : ''}` : 'CDT 1'}; atravessa ${cobertura} (a cobertura não perde HP) e ignora metade do SP do alvo.`);
    cprRoll.rollTitle = `${cprRoll.rollTitle || item.name} · carregada`;
  }

  // BODY mínimo (Carnage) e cromo no braço (Burya): o atirador sofre a lesão crítica, se ainda não tem.
  const lesao = (nome, motivo) => {
    const ja = (actor.itemTypes?.criticalInjury || []).some(l => l.name === nome);
    if (ja) return;
    nota(cprRoll, `${actor.name} ${motivo}: sofre a lesão crítica ${LESOES[nome] || nome} (${nome}).`);
    ui.notifications.warn(`${item.name}: ${actor.name} ${motivo} e sofre a lesão crítica ${LESOES[nome] || nome}.`);
  };
  const body = Number(actor.system?.stats?.body?.value) || 0;
  if (p.exigeBody && body < p.exigeBody && p.lesao) lesao(p.lesao, `tem BODY ${body} (a arma pede ${p.exigeBody})`);
  if (p.lesaoSemCromo && !temCromoNoBraco(actor)) lesao(p.lesaoSemCromo, 'não tem Grafted Muscle and Bone Lace nem cyberbraço');
  if (p.ferrolho) nota(cprRoll, 'Depois do tiro, gaste uma Ação para manejar o ferrolho antes de atirar de novo.');

  if (kit.formula) extra.formula = kit.formula;
  extra.notas.push(...kit.notas);
  if (!extra.notas.length) delete extra.notas;
  if (!Object.keys(extra).length) delete cprRoll.fluxoExtra;
  cprRoll.modo2077 = cprRoll.modo2077 || (kit.notas.length || kit.formula || kit.metadeDoSP ? type : null);
}

// Os dois canos da Palica: pergunta antes da janela; dois cartuchos e o dano sobe para 4d6.
function doisCanos(cprRoll, item) {
  antesDaJanela(cprRoll, async roll => {
    if ((Number(item.system.magazine?.value) || 0) < 2) return true;
    const resposta = await escolher({ titulo: `${item.name}: os dois canos`, campos: '<label class="checkbox"><input type="checkbox" name="doisCanos"> Disparar os dois canos (gasta 2 cartuchos, 4d6)</label>' });
    if (!resposta) return false;
    if (resposta.doisCanos) {
      gastar(item, roll, 2);
      const kit = kitDe(roll);
      kit.formula = '4d6';
      kit.notas.push('Os dois canos de uma vez: 4d6.');
      roll.fluxoExtra = { ...(roll.fluxoExtra || {}), formula: '4d6', notas: [...((roll.fluxoExtra && roll.fluxoExtra.notas) || []), 'Os dois canos de uma vez: 4d6.'] };
      roll.modo2077 = roll.modo2077 || 'attack';
    }
    return true;
  });
}

// Dano pelo botão do cartão (ou pelo Fluxo, ou pelo Combat HUD). O botão leva os ajustes do ataque no tipo:
// "attack;f=2d6", "aimed;f=4d6", "attack;sp=50". Arma Power: dano bônus da lesão crítica 10.
function rolagemDeDano(original, item, actor, extraData, p) {
  const [base, ...partes] = String((extraData && extraData.damageType) || 'attack').split(';');
  const tipo = base === MODOS.ricochete ? 'attack' : base;
  const cprRoll = original.call(item, 'damage', actor, { ...(extraData || {}), damageType: tipo });
  if (!cprRoll) return cprRoll;
  const opcoes = Object.fromEntries(partes.map(parte => parte.split('=')));
  if (p.classe === 'power') cprRoll.bonusDamage = REGRAS.bonusPower;
  if (tipo !== 'autofire') {
    const formula = opcoes.f || (p.danoFixo) || (tipo === 'aimed' && p.danoMirado) || null;
    if (formula) cprRoll.formula = formula;
  }
  if (opcoes.sp) {
    cprRoll.rollCardExtraArgs.ignoreArmorPercent = Math.max(Number(cprRoll.rollCardExtraArgs.ignoreArmorPercent) || 0, Number(opcoes.sp) || 0);
    cprRoll.rollTitle = `${item.name} · carregada (ignora metade do SP)`;
  }
  return cprRoll;
}

function criarRolagem(original, item, type, actor, extraData) {
  const p = perfil(item);
  if (!p || !sistema || !actor) return undefined;
  if (type === 'damage') return temRegras(p) ? rolagemDeDano(original, item, actor, extraData, p) : undefined;
  const nosso = type === MODOS.ricochete;
  if (!nosso && !TIPOS_DE_ATAQUE.includes(type)) return undefined;
  if (!temRegras(p)) return nosso ? bloqueada(`${item.name} não é uma arma Power: não tem o modo Ricochete.`) : undefined;
  if (p.classe === 'smart' && item.system.isRanged && !temConexao(actor)) return bloqueada(`${item.name} é uma arma Smart: só dispara conectada (o Personal Link do Neuroport, Interface Plugs ou Subdermal Grip).`);
  if (p.ferrolhoPendente) return bloqueada(`${item.name}: gaste uma Ação para manejar o ferrolho antes de atirar de novo (botão "Manejar o ferrolho").`);
  const pente = Number(item.system.magazine?.value) || 0;
  if (p.minimoDeBalas && item.system.isRanged && pente < p.minimoDeBalas) return bloqueada(`${item.name} só dispara com ${p.minimoDeBalas} no pente (tem ${pente}): é a trava de segurança.`);
  if (p.soSmartMelhorada && municaoDa(item) && !p.smartMelhorada) return bloqueada(`${item.name} só aceita munição Smart melhorada.`);
  let cprRoll;
  if (nosso) {
    if (!p.ricocheteia) return bloqueada(`${item.name} não ricocheteia: só armas Power de longo alcance que fazem tiro único.`);
    cprRoll = original.call(item, 'attack', actor);
    if (cprRoll) ricochete(cprRoll, item, actor);
  } else cprRoll = original.call(item, type, actor, extraData);
  if (!cprRoll) return cprRoll;
  ajustes(cprRoll, item, actor, p, type);
  if (p.doisCanos && TIRO_UNICO.includes(type)) doisCanos(cprRoll, item);
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
      console.error(`${MODULE_ID} | regras de 2077`, error);
    }
    return original.call(this, type, actor, extraData);
  };
  novo.cpr2077 = true;
  prototipo.createRoll = novo;
}

// ---------------- Cartão do ataque ----------------
// No cartão: o botão de dano leva os ajustes (fórmula, metade do SP) e uma nota diz a regra. Disparar gasta a carga
// Tech (a Omaha fica carregada até o fim do turno) e trava o ferrolho.
const pendentes = [];
export function instalarCartoes() {
  const { CPRChat } = sistema;
  const anterior = CPRChat.RenderRollCard;
  if (anterior.cpr2077) return;
  const novo = function (cprRoll) {
    if (!cprRoll || !cprRoll.modo2077) return anterior.call(this, cprRoll);
    const kit = cprRoll.kit2077 || { notas: [] };
    const base = cprRoll.modo2077 === MODOS.ricochete ? 'attack' : cprRoll.modo2077;
    const tipo = [base, kit.formula ? `f=${kit.formula}` : '', kit.metadeDoSP ? `sp=${REGRAS.metadeDoSP}` : ''].filter(Boolean).join(';');
    const marca = { item: cprRoll.entityData && cprRoll.entityData.item, tipo, modo: cprRoll.modo2077, notas: kit.notas };
    pendentes.push(marca);
    depoisDoTiro(cprRoll);
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
    if (botao && marca.tipo !== botao.dataset.attackType) botao.dataset.attackType = marca.tipo;
    const cartao = modelo.content.querySelector('.rollcard') || modelo.content.firstElementChild;
    const icone = marca.modo === MODOS.ricochete ? ICONES.ricochete : /sp=/.test(marca.tipo) ? ICONES.carga : 'fa-gun';
    if (cartao && marca.notas.length) cartao.insertAdjacentHTML('beforeend', marca.notas.map(texto => `<div class="cpr2077-modo-nota"><i class="fa-solid ${icone}"></i> ${esc(texto)}</div>`).join(''));
    mensagem.updateSource({ content: modelo.innerHTML, [`flags.${MODULE_ID}.modo`]: marca.modo });
  });
}

function armaDoTiro(cprRoll) {
  const dono = cprRoll.entityData || {};
  const actor = (dono.token && game.actors.tokens[dono.token]) || game.actors.get(dono.actor);
  return actor && actor.items.get(dono.item);
}

function depoisDoTiro(cprRoll) {
  const item = armaDoTiro(cprRoll);
  if (!item || !item.isOwner) return;
  const p = perfil(item);
  const mudancas = {};
  if (cprRoll.kit2077?.carga && p?.carga) {
    const combate = game.combat && game.combat.started ? game.combat : null;
    if (p.cargaAteFimDoTurno) {
      if (!p.carga.disparou) mudancas[`flags.${MODULE_ID}.carga.disparou`] = { rodada: combate ? combate.round : null, turno: combate ? combate.turn : null, em: Date.now() };
    } else mudancas[`flags.${MODULE_ID}.-=carga`] = null;
  }
  if (p?.ferrolho) mudancas[`flags.${MODULE_ID}.ferrolhoPendente`] = true;
  if (Object.keys(mudancas).length) item.update(mudancas).catch(() => {});
}

// ---------------- Carregar, ferrolho e coronha ----------------
// Carregar a arma Tech: gasta a Ação de Movimento (a Burya, não) e fica até disparar ou 20 rodadas. De novo: descarrega.
export async function alternarCarga(actor, item, { semMovimento = false } = {}) {
  const p = perfil(item);
  if (!p || p.classe !== 'tech') { ui.notifications.warn(`${item?.name || 'Esta arma'} não é uma arma Tech.`); return null; }
  if (p.carregada) return item.unsetFlag(MODULE_ID, 'carga');
  const combate = game.combat && game.combat.started ? game.combat : null;
  await item.setFlag(MODULE_ID, 'carga', { carregada: true, combate: combate ? combate.id : null, rodada: combate ? combate.round : null, turno: combate ? combate.turn : null, disparou: null });
  const custo = p.cargaSemMovimento || semMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento';
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="cpr2077-carga"><i class="fa-solid fa-bolt"></i> <b>${esc(actor.name)}</b> carrega <b>${esc(item.name)}</b> (${custo}). O próximo ataque é de CDT ${p.cdtNaCarga || 1}, atravessa ${p.cargaGrossa ? 'cobertura fina e grossa' : 'cobertura fina'} e ignora metade do SP.</div>`,
    flags: { [MODULE_ID]: { carga: item.id } }
  });
}
export const manejarFerrolho = item => item.unsetFlag(MODULE_ID, 'ferrolhoPendente');
export const alternarCoronha = item => item.setFlag(MODULE_ID, 'coronhaRecolhida', !item.getFlag(MODULE_ID, 'coronhaRecolhida'));

// Os botões de estado de uma arma (carga, ferrolho, coronha), para a ficha, o Combat HUD e o Painel Tático.
export function acoesDaArma(item, p = perfil(item)) {
  if (!p) return [];
  const lista = [];
  if (p.classe === 'tech') {
    lista.push({
      chave: 'carga', icone: ICONES.carga, ativo: p.carregada, rotulo: p.carregada ? 'Carregada' : 'Carregar',
      dica: p.carregada ? 'Carregada: o próximo ataque é de CDT 1, atravessa cobertura fina e ignora metade do SP. Clique para descarregar.' : `Carregar a arma (${p.cargaSemMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento'}).`
    });
  }
  if (p.ferrolho && p.ferrolhoPendente) lista.push({ chave: 'ferrolho', icone: ICONES.ferrolho, ativo: true, rotulo: 'Manejar o ferrolho', dica: 'Depois do tiro, uma Ação para manejar o ferrolho antes de atirar de novo. Clique quando gastar a Ação.' });
  if (p.coronhaRetratil) lista.push({ chave: 'coronha', icone: ICONES.coronha, ativo: p.coronhaRecolhida, rotulo: `Coronha ${p.coronhaRecolhida ? 'recolhida (−1)' : 'estendida'}`, dica: p.coronhaRecolhida ? 'Clique para estender (uma Ação).' : 'Clique para recolher (dá para esconder; −1 nos ataques).' });
  return lista;
}
export function acao(actor, item, chave) {
  if (chave === 'carga') return alternarCarga(actor, item);
  if (chave === 'ferrolho') return manejarFerrolho(item);
  if (chave === 'coronha') return alternarCoronha(item);
  return null;
}

// Os avisos de uma arma: sem conexão Smart, munição errada, ferrolho.
function alertasDa(actor, item, p) {
  const lista = [];
  if (p.classe === 'smart' && item.system.isRanged && !temConexao(actor)) lista.push({ texto: 'sem conexão Smart', dica: 'A arma Smart só dispara conectada: o Personal Link do Neuroport, Interface Plugs ou Subdermal Grip.' });
  if (p.soSmartMelhorada && municaoDa(item) && !p.smartMelhorada) lista.push({ texto: 'só Smart melhorada', dica: 'Esta arma só aceita munição Smart melhorada.' });
  return lista;
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
const ROTULOS = { power: 'Power', tech: 'Tech', smart: 'Smart' };
function pilulas(actor, item, p) {
  const partes = [`<span class="text-pill cpr2077-classe cpr2077-${p.classe}" data-tooltip="${esc(DICAS[p.classe])}">${ROTULOS[p.classe]}${p.rebuild ? ' (Rebuild)' : ''}</span>`];
  if (p.classe === 'smart' && p.smartMelhorada) partes.push(`<span class="text-pill" data-tooltip="${esc(DICAS.smart)}">Smart melhorada</span>`);
  for (const alerta of alertasDa(actor, item, p)) partes.push(`<span class="text-pill cpr2077-alerta" data-tooltip="${esc(alerta.dica)}">${esc(alerta.texto)}</span>`);
  for (const a of acoesDaArma(item, p)) partes.push(`<a class="text-pill cpr2077-acao${a.ativo ? ' cpr2077-ativa' : ''}" data-acao2077="${a.chave}" data-item-id="${item.id}" data-tooltip="${esc(a.dica)}"><i class="fa-solid ${a.icone}"></i> ${esc(a.rotulo)}</a>`);
  return partes.join('');
}

// Os modos de 2077 ficam na segunda linha da arma, ao lado da munição: a coluna de modos do sistema (mirar,
// autofogo, supressivo) tem altura fixa e não cabe mais nada.
function itemDoMenu(actor, item, modo) {
  const ativo = actor.getFlag(SYSTEM_ID, `firetype-${item.id}`) === modo;
  return `<a class="cpr2077-modo${ativo ? ' cpr2077-ativa' : ''}" data-fire-mode="${modo}" data-item-id="${item.id}" data-tooltip="${esc(DICAS[modo])}"><i class="far ${ativo ? 'fa-circle-dot' : 'fa-circle'}"></i> ${NOMES[modo]}</a>`;
}

// Liga e desliga o modo, como os modos do sistema (a flag firetype-<arma> do ator). O ricochete usa a tabela de DV
// da própria arma (o alcance é a distância até o alvo).
export async function alternarModo(actor, itemId, modo) {
  const chave = `firetype-${itemId}`;
  if (actor.getFlag(SYSTEM_ID, chave) === modo) return actor.unsetFlag(SYSTEM_ID, chave);
  return actor.setFlag(SYSTEM_ID, chave, modo);
}

export function noMenuDaFicha(sheet, html) {
  const actor = sheet.actor;
  const raiz = html && (html[0] || html);
  if (!actor || !raiz || !raiz.querySelectorAll) return;
  for (const linha of raiz.querySelectorAll('.weapon-grid[data-item-id]')) {
    const item = actor.items.get(linha.dataset.itemId);
    const p = perfil(item);
    if (!p || !temRegras(p)) continue;
    const info = linha.querySelector('.weapon-info');
    if (info && p.classe) info.insertAdjacentHTML('afterbegin', pilulas(actor, item, p));
    else if (info) info.insertAdjacentHTML('afterbegin', acoesDaArma(item, p).map(a => `<a class="text-pill cpr2077-acao${a.ativo ? ' cpr2077-ativa' : ''}" data-acao2077="${a.chave}" data-item-id="${item.id}" data-tooltip="${esc(a.dica)}">${esc(a.rotulo)}</a>`).join(''));
    const municao = linha.querySelector('.weapon-ammo');
    const modos = modosDaArma(p);
    if (municao && modos.length) municao.insertAdjacentHTML('beforeend', `<span class="cpr2077-modos">${modos.map(modo => itemDoMenu(actor, item, modo)).join('')}</span>`);
  }
  if (!sheet.isEditable) return;
  for (const botao of raiz.querySelectorAll('.cpr2077-modo')) {
    botao.addEventListener('click', evento => { evento.preventDefault(); alternarModo(actor, botao.dataset.itemId, botao.dataset.fireMode); });
  }
  for (const botao of raiz.querySelectorAll('[data-acao2077]')) {
    botao.addEventListener('click', evento => {
      evento.preventDefault();
      const item = actor.items.get(botao.dataset.itemId);
      if (item) acao(actor, item, botao.dataset.acao2077);
    });
  }
}

// ---------------- Menu de ataque: Combat HUD ----------------
// O Ricochete usa o data-action "fire-mode" do próprio HUD (ele grava a mesma flag e rola pelo createRoll); a carga
// e o ferrolho são botões nossos.
export function noCombatHud(app, html) {
  const actor = app.actor;
  const raiz = html && (html[0] || html);
  if (!actor || !raiz || !raiz.querySelectorAll) return;
  for (const caixa of raiz.querySelectorAll('.chud-weapon-buttons')) {
    const id = (caixa.querySelector('[data-item-id]') || {}).dataset?.itemId;
    const item = id && actor.items.get(id);
    const p = perfil(item);
    if (!p || !temRegras(p)) continue;
    const ativo = actor.getFlag(SYSTEM_ID, `firetype-${id}`);
    const modos = modosDaArma(p).map(modo => `<button type="button" class="chud-toggle cpr2077-chud${ativo === modo ? ' active' : ''}" data-action="fire-mode" data-item-id="${id}" data-mode="${modo}" title="${esc(`${NOMES[modo]}: ${DICAS[modo]}`)}"><i class="fa-solid ${ICONES[modo]}"></i></button>`);
    const acoes = acoesDaArma(item, p).filter(a => a.chave !== 'coronha').map(a => `<button type="button" class="chud-toggle cpr2077-chud${a.ativo ? ' active' : ''}" data-acao2077="${a.chave}" data-item-id="${id}" title="${esc(`${a.rotulo}: ${a.dica}`)}"><i class="fa-solid ${a.icone}"></i></button>`);
    if (modos.length || acoes.length) caixa.insertAdjacentHTML('afterbegin', [...modos, ...acoes].join(''));
    for (const alerta of alertasDa(actor, item, p)) caixa.insertAdjacentHTML('afterbegin', `<span class="cpr2077-chud-alerta" title="${esc(alerta.dica)}">${esc(alerta.texto)}</span>`);
  }
  for (const botao of raiz.querySelectorAll('[data-acao2077]')) {
    botao.addEventListener('click', evento => {
      evento.preventDefault();
      evento.stopPropagation();
      const item = actor.items.get(botao.dataset.itemId);
      if (item) acao(actor, item, botao.dataset.acao2077);
    });
  }
}

// ---------------- Para outros HUDs (o Painel Tático) ----------------
// O que a linha da arma mostra: a classe, os modos (com o ativo), a munição Smart melhorada, os avisos e os botões de
// estado (carga, ferrolho, coronha), que ligam e desligam por acao().
export function paraHud(actor, item) {
  const p = perfil(item);
  if (!actor || !p || !temRegras(p)) return null;
  const ativo = actor.getFlag(SYSTEM_ID, `firetype-${item.id}`);
  return {
    classe: p.classe,
    rotulo: p.classe ? `${ROTULOS[p.classe]}${p.rebuild ? ' (Rebuild)' : ''}` : '',
    dica: p.classe ? DICAS[p.classe] : '',
    smart: p.classe === 'smart' && p.smartMelhorada ? { texto: 'Smart melhorada', dica: DICAS.smart } : null,
    modos: modosDaArma(p).map(modo => ({ modo, nome: NOMES[modo], rotulo: NOMES[modo], dica: DICAS[modo], icone: ICONES[modo], ativo: ativo === modo })),
    alertas: alertasDa(actor, item, p),
    acoes: acoesDaArma(item, p),
    carregada: p.carregada
  };
}

// ---------------- Ficha do item: a classe de 2077 ----------------
// Campos no próprio formulário da ficha (flags.cpr-2077.*): o sistema salva sozinho, como os outros.
export function naFichaDoItem(sheet, html) {
  const item = sheet.item;
  const raiz = html && (html[0] || html);
  if (!ehArma(item) || !raiz || !raiz.querySelector) return;
  const ancora = (raiz.querySelector('select[name="system.weaponType"]') || {}).closest?.('li') || raiz.querySelector('.item-settings-tab ol.items-list > li:last-child');
  if (!ancora) return;
  const p = perfil(item);
  const f = item.flags?.[MODULE_ID] || {};
  const editavel = sheet.isEditable;
  const linha = (rotulo, campo, dica = '') => `<li class="item flexrow cpr2077-ficha"><div class="item flexrow setting-name text-nowrap"${dica ? ` data-tooltip="${esc(dica)}"` : ''}>${rotulo}</div><div class="item flexrow setting-value text-nowrap item-end">${campo}</div></li>`;
  const caixa = (nome, marcado, dica, rotulo) => linha(rotulo, editavel ? `<input type="checkbox" name="flags.${MODULE_ID}.${nome}" data-dtype="Boolean"${marcado ? ' checked' : ''}>` : (marcado ? 'Sim' : 'Não'), dica);
  const texto = (nome, valor, dica, rotulo) => linha(rotulo, editavel ? `<input type="text" name="flags.${MODULE_ID}.${nome}" value="${esc(valor || '')}" placeholder="—">` : esc(valor || '—'), dica);
  const classes = { '': p.rebuild ? `Pelo Rebuild (${ROTULOS[p.classe]})` : 'Nenhuma', power: 'Power', tech: 'Tech', smart: 'Smart' };
  let html2 = linha('Classe (2077)', editavel
    ? `<select name="flags.${MODULE_ID}.classe">${Object.entries(classes).map(([valor, rotulo]) => `<option value="${valor}"${(CLASSES.includes(f.classe) ? f.classe : '') === valor ? ' selected' : ''}>${rotulo}</option>`).join('')}</select>`
    : (CLASSES.includes(f.classe) ? classes[f.classe] : classes['']), 'Power: ricochete e lesão crítica +5. Smart: +1, precisa da conexão. Tech: carregar. Um Rebuild instalado também dá a classe.');
  if (item.system.isRanged) {
    html2 += linha('Balas por tiro', editavel ? `<input type="number" name="flags.${MODULE_ID}.balas" data-dtype="Number" min="0" max="10" value="${p.balas || 0}">` : String(p.balas || 0), 'Como a Yukimura e o Masamune: o tiro único gasta este tanto de balas (0 ou 1: uma).');
    if (p.balas > 1) html2 += texto('danoComMenos', p.danoComMenos, 'O dano quando há menos balas no pente que o tiro pede (vazio: não dispara com menos).', 'Dano com menos balas');
    html2 += texto('danoMirado', p.danoMirado, 'Como a Unity: o dano do tiro mirado (vazio: o da arma).', 'Dano no tiro mirado');
  }
  if (p.classe === 'smart') html2 += caixa('doisAlvos', p.doisAlvos, 'Como a Tsunami Kappa: trava dois alvos a até 4 m; se errar o primeiro, as balas vão para o segundo.', 'Trava em dois alvos');
  if (p.classe === 'tech') html2 += caixa('cargaSemMovimento', p.cargaSemMovimento, 'Como a Burya: carrega sem gastar a Ação de Movimento.', 'Carrega sem a Ação de Movimento');
  html2 += caixa('coronhaRetratil', p.coronhaRetratil, 'Coronha que recolhe para esconder a arma; recolhida, −1 nos ataques.', 'Coronha retrátil');
  if (p.coronhaRetratil) html2 += caixa('coronhaRecolhida', p.coronhaRecolhida, '−1 nos ataques até estender de novo (uma Ação).', 'Coronha recolhida agora');
  ancora.insertAdjacentHTML('afterend', html2);
}
