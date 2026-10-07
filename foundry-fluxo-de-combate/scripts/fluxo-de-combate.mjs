// Fluxo de Combate: ataque → defesa → dano, automático, para o sistema Cyberpunk RED - CORE.
// O cliente de quem ataca pega a rolagem do sistema (captura.mjs) e pede ao mestre ativo; o mestre resolve tudo
// (mestre.mjs), perguntando a defesa ao jogador do alvo (defesa.mjs) e o dano a quem atacou; o cartão do resultado
// (cartao.mjs) tem "Desfazer". No combate, o Suprimido sai sozinho e quem está mortalmente ferido rola o Death Save
// (turnos.mjs). Substitui o Evasion Workflow (cpred-evasion-workflow).
import { MODULE_ID, STATUS_SUPRIMIDO, MODULO_ANTIGO } from './constantes.mjs';
import * as regras from './regras.mjs';
import { iniciarSocket, pedir, forcarResposta, souMestreAtivo } from './socket.mjs';
import { instalarCaptura, esconderDe } from './captura.mjs';
import { instalarCapturaDeDano } from './sistema.mjs';
import * as mestre from './mestre.mjs';
import { responderDefesa, responderDano, responderDeathSave } from './defesa.mjs';
import { ligarBotoes } from './cartao.mjs';
import { textoFlutuante } from './fx.mjs';
import { aoMudarTurno } from './turnos.mjs';

Hooks.once('init', () => {
  const registrar = (chave, dados) => game.settings.register(MODULE_ID, chave, { config: true, scope: 'world', ...dados });
  registrar('ativo', {
    name: 'Resolver os ataques', hint: 'Todo ataque com alvo marcado (pela ficha, pelo Token Action HUD ou pelo Combat HUD) pergunta a defesa ao alvo e aplica o dano. Desligado, o sistema funciona como sempre.',
    type: Boolean, default: true
  });
  registrar('rolagemManual', {
    name: 'O jogador rola os próprios dados',
    hint: 'A esquiva, a Concentração, o dano (de quem atacou) e o Death Save abrem a janela de rolagem do sistema no computador do jogador, com modificadores e Sorte. Desligado, o mestre rola por eles sem janela.',
    type: Boolean, default: true
  });
  registrar('exigeRef8', { name: 'Esquivar de tiros exige REF 8+', hint: 'Regra do livro (p. 172). Desligado, todo mundo pode trocar a DV pela Evasão. No corpo a corpo, qualquer um esquiva.', type: Boolean, default: true });
  registrar('defesaDosNpcs', {
    name: 'Defesa dos NPCs', hint: 'Quando um NPC pode escolher (esquivar, aguentar, escudo): o mestre escolhe numa janela (vendo o total do ataque), ou o módulo escolhe pela esquiva média contra a DV.',
    type: String, default: 'mestre', choices: { mestre: 'O mestre escolhe', automatica: 'Automática' }
  });
  registrar('tempo', {
    name: 'Tempo para o jogador responder (segundos)', hint: 'Passou disso, a janela fecha: o alvo aguenta (ou o mestre rola por ele) e quem atacou deixa o dano com o mestre. Depois de 8 s, o mestre ganha um cartão para responder por ele.',
    type: Number, default: 60, range: { min: 10, max: 300, step: 5 }
  });
  registrar('escondeAtaque', { name: 'Esconder o total do ataque até a defesa', hint: 'O cartão do ataque fica só com o mestre e quem atacou até o alvo decidir (para não esquivar sabendo o número). Depois, aparece para todos.', type: Boolean, default: true });
  registrar('dano', {
    name: 'Dano', hint: 'Automático: rolado (por quem atacou, se for jogador) e aplicado na ficha do alvo, com a armadura do local, a cabeça ×2, o escudo e a ablação. Manual: o módulo só resolve a defesa; o dano fica com o botão do sistema.',
    type: String, default: 'automatico', choices: { automatico: 'Automático', manual: 'Manual (botão do sistema)' }
  });
  registrar('lesaoCritica', {
    name: 'Lesão crítica', hint: 'Dois ou mais 6 no dano: rola na tabela do sistema (cabeça só em tiro mirado na cabeça), sem repetir uma que o alvo já tem. Tiro mirado na perna que passa da armadura dá Perna Quebrada.',
    type: String, default: 'ficha', choices: { ficha: 'Na ficha', anunciar: 'Só anunciar', nao: 'Desligada' }
  });
  registrar('mortalmenteFerido', { name: 'Mortalmente ferido sofre lesão a cada acerto', hint: 'Quem já está com HP abaixo de 1 ganha uma lesão crítica a cada ataque que o atinge.', type: Boolean, default: true });
  registrar('deathSave', {
    name: 'Death Save no começo do turno', hint: 'No combate, quem está mortalmente ferido rola o Death Save no começo do turno. Falhou: fica morto (status e combatente derrotado).',
    type: String, default: 'todos', choices: { todos: 'Jogadores e NPCs', jogadores: 'Só os jogadores', nao: 'Desligado' }
  });
  registrar('area', { name: 'Explosivos pegam toda a área', hint: 'Granadas e foguetes que acertam pegam todos os tokens na área de 10 × 10 m em volta do alvo, não só os marcados.', type: Boolean, default: true });
  registrar('supressao', { name: 'Fogo supressivo sem alvo pega todos à vista', hint: 'Sem alvo marcado, o fogo supressivo pega todos a até 25 m e sem parede no meio. Com alvos marcados, só eles.', type: Boolean, default: true });
  registrar('resultado', {
    name: 'Quem vê o cartão do resultado', type: String, default: 'publico',
    choices: { publico: 'Todos', envolvidos: 'O mestre, quem atacou e os donos dos alvos', mestre: 'Só o mestre' }
  });
  registrar('cartaoDoSistema', { name: 'Mostrar também o cartão de dano do sistema', hint: 'O cartão do Fluxo de Combate já traz o dano, a armadura e o HP. Ligado, o sistema posta o cartão dele também.', type: Boolean, default: false });
  registrar('animacoes', {
    name: 'Efeitos na mesa', hint: 'Texto em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A, a animação do acerto e do erro.',
    type: String, default: 'auto', choices: { auto: 'Texto e animação', texto: 'Só o texto', nao: 'Nenhum' }
  });
});

Hooks.once('setup', () => {
  if (!CONFIG.statusEffects.some(status => status.id === STATUS_SUPRIMIDO)) {
    CONFIG.statusEffects.push({ id: STATUS_SUPRIMIDO, name: 'Suprimido', img: `modules/${MODULE_ID}/icones/suprimido.svg` });
  }
});

const desfazer = mensagem => pedir('desfazer', { mensagem: mensagem.id || mensagem });

Hooks.once('ready', async () => {
  iniciarSocket(mestre.operacoes, { texto: textoFlutuante }, { defender: responderDefesa, dano: responderDano, deathSave: responderDeathSave });
  try {
    await instalarCaptura();
    await instalarCapturaDeDano();
  } catch (error) {
    console.error(`${MODULE_ID} | não consegui ligar o módulo às rolagens do sistema`, error);
    ui.notifications.error('Fluxo de Combate: não consegui ligar o módulo às rolagens do sistema (veja o console).');
  }
  game.modules.get(MODULE_ID).api = {
    pedir,
    desfazer,
    regras,
    // No mestre: o último ataque resolvido.
    get ultimo() { return mestre.ultimo; },
    // Para macros (as de 2077 do cpr-2077): o Fluxo resolve? Ligado, com mestre e com algum alvo marcado.
    pronto: (alvos = [...game.user.targets]) => Boolean(game.settings.get(MODULE_ID, 'ativo') && game.users.activeGM && alvos.length),
    // Esconder o total do cartão do macro até a defesa? E para quem sussurrar (o mestre e quem atacou).
    esconderDe: (alvos = [...game.user.targets]) => esconderDe(alvos),
    sussurro: () => [...new Set([...game.users.filter(user => user.isGM).map(user => user.id), game.user.id])],
    // O mesmo pedido que o cartão do ataque faz. `extra`: { descricao, tabela, formula, multiplicadorMax, ablacao,
    // fracao, notas } (veja o README). `revelar`: o mestre mostra o cartão do macro para todos depois da defesa.
    atacar: ({ token, arma, total, alvos = [...game.user.targets], rolagem = 'attack', local = null, mensagem = null, revelar = false, extra = {} }) => {
      const doc = token.document || token;
      return pedir('ataque', {
        id: foundry.utils.randomID(), usuario: game.user.id, cena: doc.parent.id, token: doc.id, arma: arma.id, rolagem, total, local,
        alvos: alvos.map(alvo => (alvo.document || alvo).id).filter(id => id !== doc.id),
        mensagem: mensagem && mensagem.id ? mensagem.id : mensagem, revelar, extra
      });
    }
  };
  if (souMestreAtivo()) avisarModuloAntigo();
});

// Dois módulos para o mesmo ataque pediriam a esquiva duas vezes: o mestre desliga o Evasion Workflow com um clique.
async function avisarModuloAntigo() {
  if (!game.modules.get(MODULO_ANTIGO)?.active) return;
  const desligar = await foundry.applications.api.DialogV2.confirm({
    window: { title: 'Evasion Workflow ligado', icon: 'fa-solid fa-triangle-exclamation' },
    content: '<p>O <b>Evasion Workflow</b> ainda está ligado neste mundo e faz o mesmo que o <b>Fluxo de Combate</b>. Os dois juntos pedem a esquiva duas vezes.</p><p>Desligar o Evasion Workflow agora? A página recarrega.</p>',
    yes: { label: 'Desligar e recarregar', icon: 'fa-solid fa-power-off' },
    no: { label: 'Agora não' },
    rejectClose: false
  }).catch(() => false);
  if (!desligar) return;
  await game.settings.set('core', 'moduleConfiguration', { ...game.settings.get('core', 'moduleConfiguration'), [MODULO_ANTIGO]: false });
  foundry.utils.debouncedReload();
}

Hooks.on('renderChatMessage', (mensagem, html) => {
  if (!mensagem.flags || !mensagem.flags[MODULE_ID]) return;
  ligarBotoes(mensagem, html, { desfazer, forcar: (id, escolha) => forcarResposta(id, { escolha }) });
});

Hooks.on('updateCombat', aoMudarTurno);
