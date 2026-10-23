// Configurações do mundo (Configurações → Sistema), as mesmas do Fluxo de Combate, com os mesmos padrões da mesa.
import { SISTEMA } from './config.mjs';

export const config = chave => game.settings.get(SISTEMA, chave);

export function registrarConfiguracoes() {
  const registrar = (chave, dados) => game.settings.register(SISTEMA, chave, { config: true, scope: 'world', ...dados });
  // As chaves e os textos são os de foundry-fluxo-de-combate/scripts/fluxo-de-combate.mjs, no init.
  registrar('jogadoresCriamItens', {
    name: 'Jogadores podem criar itens', hint: 'Permite criar itens em branco nas fichas de personagem e capanga que o jogador pode editar. O mestre pode sempre criar; os contêineres usam suas próprias permissões.',
    type: Boolean, default: false
  });
  registrar('ativo', {
    name: 'Resolver os ataques', hint: 'Todo ataque com alvo marcado (pela ficha, pelo Token Action HUD ou pelo Combat HUD) pergunta a defesa ao alvo e aplica o dano. Desligado, o sistema funciona como sempre.',
    type: Boolean, default: true
  });
  registrar('rolagemManual', {
    name: 'O jogador rola os próprios dados',
    hint: 'A esquiva, a Concentração, o dano (de quem atacou) e o Death Save abrem a janela de rolagem do sistema no computador do jogador, com modificadores e Sorte. Desligado, o mestre rola por eles sem janela.',
    type: Boolean, default: true
  });
  registrar('dano', {
    name: 'Dano', hint: 'Automático: rolado (por quem atacou, se for jogador) e aplicado na ficha do alvo, com a armadura do local, a cabeça ×2, o escudo e a ablação. Manual: o módulo só resolve a defesa; o dano fica com o botão do sistema.',
    type: String, default: 'automatico', choices: { automatico: 'Automático', manual: 'Manual (botão do sistema)' }
  });
  registrar('exigeRef8', { name: 'Esquivar de tiros exige REF 8+', hint: 'Regra do livro (p. 172). Desligado, todo mundo pode trocar a DV pela Evasão. No corpo a corpo, qualquer um esquiva.', type: Boolean, default: true });
  registrar('jogadorRolaDano', { name: 'Quem atacou rola o dano', hint: 'O jogador que atacou rola o dano no computador dele (os dados aparecem para ele). Desligado, ou sem resposta, o mestre rola.', type: Boolean, default: true });
  registrar('tempo', {
    name: 'Tempo para o jogador responder (segundos)', hint: 'A janela de reação mostra o tempo numa barra. Passou dele, vale a escolha padrão (aguentar; a Concentração no fogo supressivo; no corpo a corpo, a esquiva), rolada direto. Depois de 8 s, o mestre ganha um cartão para responder por ele.',
    type: Number, default: 60, range: { min: 10, max: 300, step: 5 }
  });
  registrar('defesaDosNpcs', {
    name: 'Defesa dos NPCs', hint: 'Quando um NPC pode escolher (esquivar, aguentar, escudo): o mestre escolhe numa janela (vendo o total do ataque), ou o sistema escolhe pela esquiva média contra a DV.',
    type: String, default: 'mestre', choices: { mestre: 'O mestre escolhe', automatica: 'Automática' }
  });
  registrar('lesaoCritica', {
    name: 'Lesão crítica', hint: 'Dois ou mais 6 no dano: rola na tabela (cabeça só em tiro mirado na cabeça), pela opção de lesões repetidas. Tiro mirado na perna que passa da armadura dá Perna quebrada.',
    type: String, default: 'ficha', choices: { ficha: 'Na ficha', anunciar: 'Só anunciar', nao: 'Desligada' }
  });
  // CORE 0.92.4: preventDuplicateCriticalInjuries (off/warn/reroll). O padrão é o da wiki, não o off do CORE.
  registrar('lesaoRepetida', {
    name: 'Lesões repetidas ao rolar na tabela', hint: 'Rolar novamente (padrão da wiki): procura uma lesão que o alvo ainda não tem. Desligado: aceita outra cópia, com seus efeitos. Avisar: também aceita, mas avisa. Vale para os sorteios e a escolha do Monowire; lesões fixas, como a Perna quebrada do tiro mirado, continuam sem duplicar.',
    type: String, default: 'rolar', choices: { permitir: 'Desligado (aceitar repetida)', avisar: 'Avisar e aceitar', rolar: 'Rolar novamente' }
  });
  registrar('mortalmenteFerido', { name: 'Mortalmente ferido sofre lesão a cada acerto', hint: 'Quem já está com HP abaixo de 1 ganha uma lesão crítica a cada ataque que o atinge.', type: Boolean, default: true });
  registrar('deathSave', {
    name: 'Death Save no começo do turno', hint: 'No combate, quem está mortalmente ferido rola o Death Save no começo do turno. Falhou: fica morto (status e combatente derrotado).',
    type: String, default: 'todos', choices: { todos: 'Jogadores e NPCs', jogadores: 'Só os jogadores', nao: 'Desligado' }
  });
  registrar('area', { name: 'Explosivos pegam toda a área', hint: 'Granadas e foguetes que acertam pegam todos os tokens na área de 10 × 10 m em volta do alvo, não só os marcados.', type: Boolean, default: true });
  registrar('supressao', { name: 'Fogo supressivo sem alvo pega todos à vista', hint: 'Sem alvo marcado, o fogo supressivo pega todos a até 25 m e sem parede no meio. Com alvos marcados, só eles.', type: Boolean, default: true });
  registrar('escondeAtaque', {
    name: 'Esconder o total do ataque até a defesa', hint: 'O cartão do ataque fica só com o mestre e quem atacou até o alvo decidir (para não esquivar sabendo o número). Depois, aparece para todos. Desligado, todos o veem desde o começo, e a janela de reação do alvo mostra o total.',
    type: Boolean, default: true
  });
  registrar('resultado', {
    name: 'Quem vê o cartão do resultado', hint: 'O cartão com a defesa, o dano e o Desfazer, e o texto em cima do token.',
    type: String, default: 'publico', choices: { publico: 'Todos', envolvidos: 'O mestre, quem atacou e os donos dos alvos', mestre: 'Só o mestre' }
  });
  registrar('animacoes', {
    name: 'Efeitos na mesa', hint: 'Texto em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A, a animação do acerto e do erro.',
    type: String, default: 'auto', choices: { auto: 'Texto e animação', texto: 'Só o texto', nao: 'Nenhum' }
  });
  // As das armas de 2077 do cpr-2077 do Foundry 12 saíram com o Mission Kit: as do ataque Smart (o teste Smart e a arma
  // sem o Smart Link) no ciclo 110, e a da carga Tech que esfria uma rodada no ciclo 115.
  registrar('netJogadorRola', {
    name: 'O jogador rola as rolagens da NET', hint: 'As rolagens do netrunner na NET (as habilidades de Interface, o ataque dos programas, a velocidade contra o Black ICE e a defesa) abrem a janela de rolagem no computador do dono dele, com os modificadores e a Sorte. Sem resposta no tempo para o jogador responder, o mestre rola. Desligado, o mestre rola sempre, com a Sorte preparada na ficha.',
    type: Boolean, default: true
  });
  registrar('netNoCombate', {
    name: 'Inimigos da NET no combate', hint: 'O Black ICE, os demônios e os netrunners inimigos (com ficha) encontrados na NET entram na iniciativa da cena, com um token escondido no ponto de acesso (o Black ICE e o demônio no topo). A REZ do token e a da NET andam juntas. Na vez deles, o mestre escolhe quem atacar.',
    type: Boolean, default: true
  });
  // A iniciativa crítica do CORE ("criticalInitiative", settings.js): desligada por padrão para manter o 1d10 sem explosão
  // que a mesa já usava; ligada, a iniciativa usa 1d10crit (o 10 soma um d10 e o 1 tira um d10).
  registrar('iniciativaCritica', {
    name: 'Iniciativa explode no 10 e no 1?', hint: 'Desligado (o padrão da mesa): a iniciativa rola 1d10 sem crítico. Ligado (como o padrão do CORE): um 10 natural soma mais um d10 e um 1 natural tira um d10.',
    type: Boolean, default: false
  });
  // A versão dos dados do mundo (migracao.mjs), escondida, como o "dataModelVersion" do CORE. 0: de antes da migração.
  game.settings.register(SISTEMA, 'versaoDosDados', { scope: 'world', config: false, type: Number, default: 0 });
  // CORE 0.92.4, settings.js: mookSheetSkillDisplay, por navegador, base por padrão.
  game.settings.register(SISTEMA, 'periciasDoCapanga', {
    name: 'Exibição das perícias do capanga', hint: 'A última coluna da lista mostra o nível, a base (atributo + nível) ou o total com bônus e penalidades. O nível continua editável; a rolagem usa sempre o total.',
    scope: 'client', config: true, type: String, default: 'base',
    choices: { nivel: 'Nível', base: 'Base (atributo + nível)', total: 'Total (com bônus e penalidades)' },
    onChange: () => {
      for (const ficha of foundry.applications.instances.values()) {
        if (ficha.actor?.type === 'capanga' && ficha.rendered) ficha.render({ force: true });
      }
    }
  });
  // CORE 0.92.4, settings.js: deleteItemConfirmation, por navegador, ligada por padrão.
  game.settings.register(SISTEMA, 'confirmarApagarItem', {
    name: 'Confirmar ao apagar item', hint: 'Pergunta antes de apagar um item da ficha de personagem ou capanga. Mesmo desligada, a escolha do que fazer com os itens instalados continua aparecendo.',
    scope: 'client', config: true, type: Boolean, default: true
  });
  // Deste navegador, como o "invertRollCtrlFunction" do CORE.
  game.settings.register(SISTEMA, 'rolarDireto', {
    name: 'Rolar direto, sem a janela de rolagem', hint: 'Só neste navegador. Desligado (o padrão, como no CORE), o clique no atributo ou na perícia abre a janela de rolagem, e Ctrl + clique rola direto. Ligado, é o contrário. O teste direto usa a Sorte preparada na ficha e os situacionais ligados por padrão.',
    scope: 'client', config: true, type: Boolean, default: false
  });
}
