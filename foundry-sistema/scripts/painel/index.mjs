// O Painel Tático dentro do sistema (o C25; o módulo painel-tatico da mesa do Foundry 12): um HUD de combate com o
// retrato grande do personagem (um PNG por estado de ferimento), editável por cada jogador (tema, cores, fonte, tamanho,
// posição, seções). Rola tudo pelo caminho da ficha. As configurações (deste navegador) e a tecla H, para recolher.
import { SISTEMA } from '../config.mjs';
import { PainelTatico } from './painel.mjs';
import { registrarEstilo, estiloAtual, salvarEstilo, JanelaDeEstilo } from './estilo.mjs';
import { JanelaDoRetrato, vistaDoRetrato, retratoDo } from './retrato.mjs';
import { codigoDoEstilo, ESTADOS, lerCodigo, normalizarRetrato } from './logica.mjs';

const painel = new PainelTatico();
const redesenhar = () => painel.agendar();

// A janela de estilo pelo menu das configurações do sistema (o Foundry pede uma classe de janela; ela só abre a de
// estilo, que é uma por navegador).
class MenuDoPainel extends foundry.applications.api.ApplicationV2 {
  render() { JanelaDeEstilo.abrir(painel); return this; }
}

// No init do sistema (sistema.mjs): as configurações e a tecla agora; o painel monta no ready.
export function registrarPainel() {
  registrarEstilo(() => { painel.aplicarEstilo(); redesenhar(); });
  game.settings.registerMenu(SISTEMA, 'menuDoPainel', {
    name: 'Estilo do Painel Tático', label: 'Abrir o estilo', hint: 'Tema, cores, fonte, tamanho, retrato, posição e seções do painel (cada jogador tem o seu, neste navegador).',
    icon: 'fa-solid fa-palette', type: MenuDoPainel, restricted: false
  });
  game.settings.register(SISTEMA, 'painelLigado', {
    name: 'Mostrar o Painel Tático', hint: 'Neste navegador. A tecla H recolhe e abre.',
    scope: 'client', config: true, type: Boolean, default: true, onChange: redesenhar
  });
  game.settings.register(SISTEMA, 'painelPersonagem', {
    name: 'Painel Tático: sem token selecionado, mostrar o meu personagem', hint: 'O personagem que o mestre deu ao seu usuário (Configurar usuário).',
    scope: 'client', config: true, type: Boolean, default: true, onChange: redesenhar
  });
  game.settings.register(SISTEMA, 'painelAlvoAntes', {
    name: 'Painel Tático: escolher o alvo antes do ataque', hint: 'Sem alvo marcado, o cursor vira mira ao clicar em ATK (o mestre só resolve o ataque com alvo). Esc cancela.',
    scope: 'client', config: true, type: String, default: 'semAlvo',
    choices: { semAlvo: 'Quando não houver alvo marcado', sempre: 'Sempre', nunca: 'Nunca' }
  });
  game.settings.register(SISTEMA, 'painelRecolhido', { scope: 'client', config: false, type: Boolean, default: false, onChange: redesenhar });

  game.keybindings.register(SISTEMA, 'painelRecolher', {
    name: 'Recolher e abrir o Painel Tático', editable: [{ key: 'KeyH' }],
    onDown: () => { painel.alternarRecolhido(); return true; },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  Hooks.once('ready', () => {
    painel.montar();
    // Para macros e testes: o painel, o estilo e o retrato de cada ator.
    game.system.api.painel = {
      get painel() { return painel; },
      atualizar: redesenhar,
      estilo: { atual: estiloAtual, salvar: salvarEstilo, abrir: () => JanelaDeEstilo.abrir(painel), codigo: estilo => codigoDoEstilo(estilo ?? estiloAtual()), aplicarCodigo: texto => salvarEstilo(lerCodigo(texto, estiloAtual())) },
      retrato: {
        abrir: actor => JanelaDoRetrato.abrir(actor),
        ler: retratoDo,
        vista: (actor, token = null) => vistaDoRetrato(actor, token, estiloAtual().efeitos),
        // { imagens: { notWounded, lightlyWounded, seriouslyWounded, mortallyWounded, dead }, escala, x, y, espelhar, modo }.
        definir: (actor, dados) => {
          const r = normalizarRetrato({ ...retratoDo(actor), ...dados, imagens: { ...retratoDo(actor).imagens, ...(dados?.imagens || {}) } });
          return actor.setFlag(SISTEMA, 'retrato', { ...r, imagens: Object.fromEntries(ESTADOS.map(estado => [estado, r.imagens[estado] || ''])) });
        }
      },
      // Fixa um ator ou token no painel (null solta).
      fixar: doc => { painel.fixo = doc ? (doc.document || doc).uuid : null; painel.atualizar(); }
    };
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
  // Andar com o token não muda nada no painel (a conexão na NET e o resto do token, sim).
  const SO_POSICAO = ['_id', 'x', 'y', 'elevation', 'rotation', 'sort', '_movementHistory'];
  Hooks.on('updateToken', (token, mudancas) => { if (doPainel(token) && !Object.keys(mudancas).every(chave => SO_POSICAO.includes(chave))) redesenhar(); });
  Hooks.on('deleteToken', token => { if (doPainel(token)) redesenhar(); });

  // Combate (iniciativa, turno), alvos e a NET (o estado da conexão fica no Tile do ponto de acesso).
  for (const gancho of ['updateCombat', 'createCombatant', 'updateCombatant', 'deleteCombatant', 'combatStart', 'deleteCombat']) Hooks.on(gancho, redesenhar);
  Hooks.on('targetToken', user => { if (user.id === game.user.id) redesenhar(); });
  Hooks.on('updateTile', (tile, mudancas) => { if (foundry.utils.hasProperty(mudancas, `flags.${SISTEMA}`) && painel.token) redesenhar(); });
}
