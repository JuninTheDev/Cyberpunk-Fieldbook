// Cyberpunk RED: 2077 — os anos 2070 do Mission Kit: armas de 2077 no menu de ataque, API das macros e personagens do
// criador da wiki.
import { carregarTech, ricochete } from './macros.mjs';
import * as armas2077 from './armas2077.mjs';
import { registerTableSync, registerWikiButtons, registerWikiSettings, registerWikiWatch, wikiApi } from './wiki.mjs';

const MODULE_ID = 'cpr-2077';

// Os preços seguem as categorias do RED, como no Mission Kit: a economia do suplemento de fã (as categorias um degrau
// acima) saiu. Um mundo que tinha a configuração antiga só fica com ela gravada, sem uso.

Hooks.once('init', () => {
  armas2077.registrarConfiguracoes();
  registerWikiSettings();
  registerWikiButtons();
  registerWikiWatch();
  registerTableSync();
  game.modules.get(MODULE_ID).api = { ricochete, carregarTech, armas2077, ...wikiApi };
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
