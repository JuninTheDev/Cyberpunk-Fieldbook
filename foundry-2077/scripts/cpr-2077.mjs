// Cyberpunk RED: 2077 — economia de 2077, API das macros e personagens do criador da wiki.
import { ataqueSmart, cargaTech, ricochete } from './macros.mjs';
import { registerWikiButtons, registerWikiSettings, registerWikiWatch, wikiApi } from './wiki.mjs';

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
  registerWikiSettings();
  registerWikiButtons();
  registerWikiWatch();
  game.modules.get(MODULE_ID).api = { ataqueSmart, ricochete, cargaTech, precos2077: PRICES_2077, economia2077: false, ...wikiApi };
});

Hooks.once('setup', () => {
  if (game.settings.get(MODULE_ID, 'economia2077')) applyEconomy();
});
