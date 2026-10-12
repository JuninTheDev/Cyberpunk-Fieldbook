// Cyberpunk RED: 2077 — economia de 2077, armas de 2077 no menu de ataque, API das macros e personagens do criador da wiki.
import { carregarTech, ricochete } from './macros.mjs';
import * as armas2077 from './armas2077.mjs';
import { registerTableSync, registerWikiButtons, registerWikiSettings, registerWikiWatch, wikiApi } from './wiki.mjs';

const MODULE_ID = 'cpr-2077';

// Categorias de preço do suplemento (p. 7): as faixas do RED, um degrau acima.
// Só muda a categoria que a ficha mostra; o preço em eb gravado em cada item continua o mesmo.
const PRICES_2077 = { free: 0, dirtCheap: 10, cheap: 20, everyday: 50, costly: 100, premium: 500, expensive: 1000, veryExpensive: 5000, luxury: 10000, superLuxury: 20000 };

async function applyEconomy() {
  try {
    // Mesmo arquivo (e mesma instância) que o sistema importa: trocar o mapa aqui muda a ficha.
    const { default: CPR } = await import(foundry.utils.getRoute('systems/cyberpunk-red-core/modules/system/config.js'));
    if (!CPR?.itemPriceCategoryMap) throw new Error('o sistema não tem mais CPR.itemPriceCategoryMap');
    Object.assign(CPR.itemPriceCategoryMap, PRICES_2077);
    game.modules.get(MODULE_ID).api.economia2077 = true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Economia de 2077 desligada:`, error);
    Hooks.once('ready', () => ui.notifications.warn('Cyberpunk RED: 2077 — não foi possível aplicar a economia de 2077 nesta versão do sistema. O resto do módulo funciona normalmente.'));
  }
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'economia2077', {
    name: 'Economia de 2077',
    hint: 'Usa as categorias de preço do suplemento (Barato 20eb … Super luxo 20.000eb). Os preços em eb dos itens não mudam, só a categoria mostrada na ficha.',
    scope: 'world', config: true, type: Boolean, default: true, requiresReload: true
  });
  armas2077.registrarConfiguracoes();
  registerWikiSettings();
  registerWikiButtons();
  registerWikiWatch();
  registerTableSync();
  game.modules.get(MODULE_ID).api = { ricochete, carregarTech, armas2077, precos2077: PRICES_2077, economia2077: false, ...wikiApi };
});

Hooks.once('setup', () => {
  if (game.settings.get(MODULE_ID, 'economia2077')) applyEconomy();
});

// Armas de 2077 (Power, Tech, Smart, com as regras do Mission Kit) no menu de ataque do sistema: as regras no
// createRoll dos itens, o cartão do ataque, a ficha do personagem, o Combat HUD e a ficha do item.
Hooks.once('setup', async () => {
  try {
    await armas2077.carregarSistema();
    armas2077.instalarModos();
    armas2077.instalarCartoes();
  } catch (error) {
    console.error(`${MODULE_ID} | armas de 2077 no menu de ataque`, error);
  }
});
Hooks.on('renderActorSheet', armas2077.noMenuDaFicha);
Hooks.on('renderCPRCombatHUD', armas2077.noCombatHud);
Hooks.on('renderItemSheet', armas2077.naFichaDoItem);

// O Fluxo de Combate (foundry-fluxo-de-combate/) substitui o Evasion Workflow. Num mundo que usava o Evasion
// Workflow, com o Fluxo de Combate instalado e desligado, o mestre liga com um clique (e o Evasion Workflow sai da
// lista de módulos ligados). Pergunta uma vez só.
const FLUXO = 'fluxo-de-combate';
const EVASION = 'cpred-evasion-workflow';
Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'fluxoPerguntado', { scope: 'world', config: false, type: Boolean, default: false });
});
Hooks.once('ready', async () => {
  if (!game.user.isGM || (game.users.activeGM && game.users.activeGM !== game.user)) return;
  const fluxo = game.modules.get(FLUXO);
  const usavaEvasion = EVASION in (game.settings.get('core', 'moduleConfiguration') || {});
  if (!fluxo || fluxo.active || !usavaEvasion || game.settings.get(MODULE_ID, 'fluxoPerguntado')) return;
  const ligar = await foundry.applications.api.DialogV2.confirm({
    window: { title: 'Fluxo de Combate', icon: 'fa-solid fa-crosshairs' },
    content: '<p>O módulo <b>Fluxo de Combate</b> está instalado e desligado neste mundo. Ele resolve o ataque, a esquiva e o dano sozinho, no lugar do <b>Evasion Workflow</b>.</p><p>Ligar agora? A página recarrega.</p>',
    yes: { label: 'Ligar e recarregar', icon: 'fa-solid fa-power-off' },
    no: { label: 'Não perguntar de novo' },
    rejectClose: false
  }).catch(() => null);
  if (ligar === null) return;
  await game.settings.set(MODULE_ID, 'fluxoPerguntado', true);
  if (!ligar) return;
  await game.settings.set('core', 'moduleConfiguration', { ...game.settings.get('core', 'moduleConfiguration'), [FLUXO]: true, [EVASION]: false });
  foundry.utils.debouncedReload();
});
