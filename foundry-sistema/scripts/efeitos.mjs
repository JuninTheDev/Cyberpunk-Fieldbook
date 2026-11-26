// O que a mesa vê quando o ataque se resolve (depois da defesa, nunca antes), como o fx.mjs do Fluxo de Combate:
// - o texto que sobe em cima do token ("Esquivou!", "−12 HP"), para quem vê o cartão do resultado (o cartao.mjs manda
//   pelo socket só a eles) e vê o token (o C77);
// - com o Sequencer e o JB2A ativos, o impacto no acerto e o "Miss" no erro, também só para quem vê o cartão.
// A configuração "Efeitos na mesa" escolhe: texto e animação, só o texto, ou nada. O som do Diwako saiu no C77: o módulo
// só roda até o Foundry 12. Os efeitos novos (o tiro, o som, as granadas) são os do plano, foundry-sistema/efeitos-plano.
import { SISTEMA } from './config.mjs';
import { textoNaVisao } from './regras.mjs';

const JB2A = 'modules/JB2A_DnD5e/Library/Generic';
const ANIMACOES = {
  acerto: [`${JB2A}/Impact/Impact_07_Regular_Orange_400x400.webm`],
  erro: [`${JB2A}/UI/Miss_02_White_200x200.webm`],
  defesa: [`${JB2A}/UI/Miss_02_White_200x200.webm`]
};
// As cores do tema: o vermelho no acerto, o ciano no que a armadura ou o escudo seguraram, o texto no erro.
const CORES = { acerto: 0xff2a4a, erro: 0xe8e6d9, defesa: 0x02d7f2 };
const existe = new Map();

async function primeiroQueExiste(lista = []) {
  for (const src of lista) {
    // O srcExists do foundry.canvas está obsoleto no 14 e sai no 16: o de agora é o do foundry.utils.
    if (!existe.has(src)) existe.set(src, await foundry.utils.srcExists(src).catch(() => false));
    if (existe.get(src)) return src;
  }
  return null;
}

// O texto em cima do token, neste cliente: só para quem está na cena e está em "para" (sem "para", todos), e só com o
// token na visão dele (regras.textoNaVisao): o escondido e o que está no escuro só aparecem para o mestre.
export function textoFlutuante({ cena, token, texto, estilo, para = null }) {
  if (para && !para.includes(game.user.id)) return;
  if (!canvas.ready || canvas.scene?.id !== cena || !texto) return;
  const objeto = canvas.tokens.get(token);
  if (!objeto) return;
  const visao = canvas.visibility;
  const testar = () => visao.testVisibility(objeto.document.getVisibilityTestPoints(), { tolerance: 0, object: objeto });
  if (!textoNaVisao({ gm: game.user.isGM, escondido: objeto.document.hidden, visaoDosTokens: visao.tokenVision, proprio: Boolean(objeto.vision?.active), testar })) return;
  canvas.interface.createScrollingText(objeto.center, texto, {
    anchor: CONST.TEXT_ANCHOR_POINTS.TOP, direction: CONST.TEXT_ANCHOR_POINTS.TOP, distance: objeto.h,
    fontSize: 28, fill: CORES[estilo] ?? 0xffffff, stroke: 0x000000, strokeThickness: 4, jitter: 0.25
  });
}

// No mestre: a animação do Sequencer com o JB2A, quando estão ativos. O Sequencer manda a animação a todos; com "para"
// (os ids de quem vê o cartão), só a eles (o C77: antes, o "só o mestre" mostrava o resultado na animação para todos).
export async function animar(token, estilo, para = null) {
  // O Sequencer é um módulo opcional: a classe dele só existe quando está ativo.
  const Sequencia = globalThis.Sequence;
  if (!game.modules.get('sequencer')?.active || typeof Sequencia !== 'function') return;
  const src = await primeiroQueExiste(ANIMACOES[estilo]);
  if (!src) return;
  const grade = token.parent.grid.size;
  const centro = { x: token.x + (token.width * grade) / 2, y: token.y + (token.height * grade) / 2 };
  const efeito = new Sequencia(SISTEMA).effect().file(src).atLocation(centro).size(grade * Math.max(token.width, token.height) * 1.4).fadeOut(300);
  if (Array.isArray(para)) efeito.forUsers(para);
  await efeito.play();
}
