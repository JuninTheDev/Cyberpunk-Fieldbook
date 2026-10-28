// O que a mesa vê quando o ataque se resolve (depois da defesa, nunca antes), como o fx.mjs do Fluxo de Combate:
// - o texto que sobe em cima do token ("Esquivou!", "−12 HP"), para quem vê o cartão do resultado (combate.mjs manda
//   pelo socket aos outros clientes);
// - com o Sequencer e o JB2A ativos, o impacto no acerto e o "Miss" no erro (o Sequencer já mostra para todos);
// - com o Diwako ligado e os sons de acerto dele configurados, um desses sons no acerto.
// A configuração "Efeitos na mesa" escolhe: texto e animação, só o texto, ou nada.
import { SISTEMA } from './config.mjs';

const JB2A = 'modules/JB2A_DnD5e/Library/Generic';
const ANIMACOES = {
  acerto: [`${JB2A}/Impact/Impact_07_Regular_Orange_400x400.webm`],
  erro: [`${JB2A}/UI/Miss_02_White_200x200.webm`],
  defesa: [`${JB2A}/UI/Miss_02_White_200x200.webm`]
};
// As cores do tema: o vermelho no acerto, o ciano no que a armadura ou o escudo seguraram, o texto no erro.
const CORES = { acerto: 0xff2a4a, erro: 0xe8e6d9, defesa: 0x02d7f2 };
const DIWAKO = 'diwako-cpred-additions';
const existe = new Map();

async function primeiroQueExiste(lista = []) {
  for (const src of lista) {
    if (!existe.has(src)) existe.set(src, await foundry.canvas.srcExists(src).catch(() => false));
    if (existe.get(src)) return src;
  }
  return null;
}

// O texto em cima do token, neste cliente: só para quem está na cena e está em "para" (sem "para", todos). O token
// escondido só aparece para o mestre.
export function textoFlutuante({ cena, token, texto, estilo, para = null }) {
  if (para && !para.includes(game.user.id)) return;
  if (!canvas.ready || canvas.scene?.id !== cena || !texto) return;
  const objeto = canvas.tokens.get(token);
  if (!objeto || (objeto.document.hidden && !game.user.isGM)) return;
  canvas.interface.createScrollingText(objeto.center, texto, {
    anchor: CONST.TEXT_ANCHOR_POINTS.TOP, direction: CONST.TEXT_ANCHOR_POINTS.TOP, distance: objeto.h,
    fontSize: 28, fill: CORES[estilo] ?? 0xffffff, stroke: 0x000000, strokeThickness: 4, jitter: 0.25
  });
}

// No mestre: a animação do Sequencer com o JB2A e o som do Diwako, quando estão ativos.
export async function animar(token, estilo) {
  // O Sequencer é um módulo opcional: a classe dele só existe quando está ativo.
  const Sequencia = globalThis.Sequence;
  if (game.modules.get('sequencer')?.active && typeof Sequencia === 'function') {
    const src = await primeiroQueExiste(ANIMACOES[estilo]);
    if (src) {
      const grade = token.parent.grid.size;
      const centro = { x: token.x + (token.width * grade) / 2, y: token.y + (token.height * grade) / 2 };
      await new Sequencia(SISTEMA).effect().file(src).atLocation(centro).size(grade * Math.max(token.width, token.height) * 1.4).fadeOut(300).play();
    }
  }
  if (estilo === 'acerto' && game.modules.get(DIWAKO)?.active) {
    try {
      if (!game.settings.get(DIWAKO, 'hit-sounds')) return;
      const sons = game.settings.get(DIWAKO, 'configured-sounds') || [];
      if (sons.length) foundry.audio.AudioHelper.play({ src: sons[Math.floor(Math.random() * sons.length)], volume: 0.35, autoplay: true, loop: false }, true);
    } catch { /* o Diwako mudou as configurações: sem som */ }
  }
}
