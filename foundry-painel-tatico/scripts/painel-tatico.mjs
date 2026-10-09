// Painel Tático: um HUD de combate para o Cyberpunk RED - CORE, com o retrato grande do personagem (um PNG por estado
// de ferimento), editável por cada jogador (tema, cores, fonte, tamanho, posição, seções). Rola tudo pelo caminho
// da ficha do sistema, então os modos de 2077 (cpr-2077) e o Fluxo de Combate valem aqui; mostra a conexão do
// NET Architect.
import { MODULE_ID } from './constantes.mjs';
import { PainelTatico } from './painel.mjs';
import { carregarSistema } from './acoes.mjs';
import { registrarEstilo, estiloAtual, salvarEstilo, JanelaDeEstilo } from './estilo.mjs';
import { JanelaDoRetrato, vistaDoRetrato, retratoDo } from './retrato.mjs';
import { codigoDoEstilo, lerCodigo, normalizarRetrato } from './logica.mjs';
import { combatHudLigado } from './integracoes.mjs';

const painel = new PainelTatico();
const redesenhar = () => painel.agendar();

// A janela de estilo pelo menu das configurações do módulo (o Foundry pede uma classe de janela; ela só abre a de
// estilo, que é uma por navegador).
class MenuDeEstilo extends foundry.applications.api.ApplicationV2 {
  render() { JanelaDeEstilo.abrir(painel); return this; }
}

Hooks.once('init', () => {
  registrarEstilo(() => { painel.aplicarEstilo(); redesenhar(); });
  game.settings.registerMenu(MODULE_ID, 'menuDeEstilo', {
    name: 'Estilo do painel', label: 'Abrir o estilo', hint: 'Tema, cores, fonte, tamanho, retrato, posição e seções do painel (cada jogador tem o seu, neste navegador).',
    icon: 'fa-solid fa-palette', type: MenuDeEstilo, restricted: false
  });
  game.settings.register(MODULE_ID, 'ligado', {
    name: 'Mostrar o Painel Tático', hint: 'Neste navegador. A tecla H recolhe e abre.',
    scope: 'client', config: true, type: Boolean, default: true, onChange: redesenhar
  });
  game.settings.register(MODULE_ID, 'personagem', {
    name: 'Sem token selecionado, mostrar o meu personagem', hint: 'O personagem que o mestre deu ao seu usuário (Configurar usuário).',
    scope: 'client', config: true, type: Boolean, default: true, onChange: redesenhar
  });
  game.settings.register(MODULE_ID, 'alvoAntes', {
    name: 'Escolher o alvo antes do ataque', hint: 'Sem alvo marcado, o cursor vira mira ao clicar em ATK (o Fluxo de Combate só pede a defesa com alvo). Clique no chão: ataca sem alvo; Esc cancela.',
    scope: 'client', config: true, type: String, default: 'semAlvo',
    choices: { semAlvo: 'Quando não houver alvo marcado', sempre: 'Sempre', nunca: 'Nunca' }
  });
  game.settings.register(MODULE_ID, 'esconderCombatHud', {
    name: 'Esconder o Combat HUD', hint: 'Com o Cyberpunk RED - Combat HUD também ligado, as duas barras ficariam uma em cima da outra. Este navegador esconde o Combat HUD enquanto o Painel Tático estiver à mostra.',
    scope: 'client', config: true, type: Boolean, default: true, onChange: () => painel.aplicarEstilo()
  });
  game.settings.register(MODULE_ID, 'recolhido', { scope: 'client', config: false, type: Boolean, default: false, onChange: redesenhar });
  game.settings.register(MODULE_ID, 'avisouCombatHud', { scope: 'world', config: false, type: Boolean, default: false });

  game.keybindings.register(MODULE_ID, 'recolher', {
    name: 'Recolher e abrir o Painel Tático', editable: [{ key: 'KeyH' }],
    onDown: () => { painel.alternarRecolhido(); return true; },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  game.modules.get(MODULE_ID).api = {
    get painel() { return painel; },
    atualizar: redesenhar,
    estilo: {
      atual: estiloAtual,
      salvar: salvarEstilo,
      abrir: () => JanelaDeEstilo.abrir(painel),
      codigo: estilo => codigoDoEstilo(estilo ?? estiloAtual()),
      aplicarCodigo: texto => salvarEstilo(lerCodigo(texto, estiloAtual()))
    },
    retrato: {
      abrir: actor => JanelaDoRetrato.abrir(actor),
      ler: retratoDo,
      vista: (actor, token = null) => vistaDoRetrato(actor, token, estiloAtual().efeitos),
      // Para macros e outros módulos: { imagens: { notWounded, lightlyWounded, seriouslyWounded, mortallyWounded, dead }, escala, x, y, espelhar, modo }.
      definir: (actor, dados) => {
        const r = normalizarRetrato({ ...retratoDo(actor), ...dados, imagens: { ...retratoDo(actor).imagens, ...(dados?.imagens || {}) } });
        const imagens = Object.fromEntries(['notWounded', 'lightlyWounded', 'seriouslyWounded', 'mortallyWounded', 'dead'].map(estado => [estado, r.imagens[estado] || '']));
        return actor.setFlag(MODULE_ID, 'retrato', { ...r, imagens });
      }
    },
    // Fixa um ator ou token no painel (null solta).
    fixar: doc => { painel.fixo = doc ? (doc.document || doc).uuid : null; painel.atualizar(); }
  };
});

Hooks.once('ready', async () => {
  try {
    await carregarSistema();
  } catch (error) {
    console.error(`${MODULE_ID} | não consegui carregar as rolagens do sistema`, error);
    ui.notifications.error('Painel Tático: não consegui carregar as rolagens do sistema Cyberpunk RED (veja o console).');
    return;
  }
  painel.montar();
  if (game.user.isGM && combatHudLigado() && !game.settings.get(MODULE_ID, 'avisouCombatHud')) {
    await game.settings.set(MODULE_ID, 'avisouCombatHud', true);
    ui.notifications.info('Painel Tático: o Combat HUD também está ligado. Cada navegador esconde o Combat HUD enquanto o painel estiver à mostra (Configurações → Painel Tático). Para tirar de vez, desligue o Combat HUD em Configurar módulos.', { permanent: true });
  }
});

// Quem aparece: o token controlado, o personagem do jogador.
Hooks.on('controlToken', redesenhar);
Hooks.on('canvasReady', redesenhar);
// A lateral recolhida ou aberta muda o espaço da barra.
Hooks.on('collapseSidebar', () => setTimeout(() => painel.aplicarEstilo(), 50));
Hooks.on('updateUser', (user, mudancas) => { if (user.id === game.user.id && 'character' in mudancas) redesenhar(); });

// O ator, os itens e os efeitos (status) do ator à mostra.
const doPainel = doc => painel.eDeste(doc);
Hooks.on('updateActor', actor => { if (doPainel(actor)) redesenhar(); });
for (const gancho of ['createItem', 'updateItem', 'deleteItem', 'createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect']) {
  Hooks.on(gancho, doc => { if (doPainel(doc)) redesenhar(); });
}
// Andar com o token não muda nada no painel (o resto do token, sim: nome, imagem, a ficha de um token sem vínculo).
const SO_POSICAO = ['_id', 'x', 'y', 'elevation', 'rotation', 'sort'];
Hooks.on('updateToken', (token, mudancas) => { if (doPainel(token) && !Object.keys(mudancas).every(chave => SO_POSICAO.includes(chave))) redesenhar(); });
Hooks.on('deleteToken', token => { if (doPainel(token)) redesenhar(); });

// Combate (iniciativa, turno), alvos e a NET (o estado da conexão fica no Tile do ponto de acesso).
for (const gancho of ['updateCombat', 'createCombatant', 'updateCombatant', 'deleteCombatant', 'combatStart', 'deleteCombat']) Hooks.on(gancho, redesenhar);
Hooks.on('targetToken', user => { if (user.id === game.user.id) redesenhar(); });
Hooks.on('updateTile', (tile, mudancas) => { if (foundry.utils.hasProperty(mudancas, 'flags.net-architect') && painel.token) redesenhar(); });
