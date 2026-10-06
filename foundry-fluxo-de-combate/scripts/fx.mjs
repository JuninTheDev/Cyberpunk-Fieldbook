// O que a mesa vê quando o ataque se resolve (depois da defesa, nunca antes):
// - um texto que sobe em cima do token ("Esquivou!", "−12 HP") em todos os clientes que estão na cena;
// - com o Sequencer e o JB2A ativos, o impacto no acerto e o "Miss" no erro (o Sequencer já mostra para todos);
// - com o Diwako ligado e os sons de acerto dele configurados, um desses sons no acerto.
// Tudo desliga em Configurações do módulo → Efeitos na mesa.
import { MODULE_ID, DIWAKO } from './constantes.mjs';
import { avisar } from './socket.mjs';

const JB2A = 'modules/JB2A_DnD5e/Library/Generic';
const ANIMACOES = {
  acerto: [`${JB2A}/Impact/Impact_07_Regular_Orange_400x400.webm`],
  erro: [`${JB2A}/UI/Miss_02_White_200x200.webm`],
  defesa: [`${JB2A}/UI/Miss_02_White_200x200.webm`]
};
const CORES = { acerto: 0xff4d6a, erro: 0xd8f3ee, defesa: 0x00ffd2 };
const existe = new Map();
async function primeiroQueExiste(lista = []) {
  const verificar = (foundry.canvas && foundry.canvas.srcExists) || (typeof srcExists === 'function' ? srcExists : null);
  for (const src of lista) {
    if (!existe.has(src)) existe.set(src, verificar ? await verificar(src).catch(() => false) : false);
    if (existe.get(src)) return src;
  }
  return null;
}

export function textoFlutuante({ cena, token, texto, tipo }) {
  if (!canvas.ready || !canvas.scene || canvas.scene.id !== cena || !texto) return;
  const placeable = canvas.tokens.get(token);
  if (!placeable || (placeable.document.hidden && !game.user.isGM)) return;
  canvas.interface.createScrollingText(placeable.center, texto, {
    anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
    direction: CONST.TEXT_ANCHOR_POINTS.TOP,
    distance: placeable.h,
    fontSize: 28,
    fill: CORES[tipo] ?? 0xffffff,
    stroke: 0x000000,
    strokeThickness: 4,
    jitter: 0.25
  });
}

// No mestre: mostra o resultado de um alvo para a mesa.
export async function mostrarResultado(token, resumo) {
  const modo = game.settings.get(MODULE_ID, 'animacoes');
  if (modo === 'nao' || !resumo || !token) return;
  const dados = { cena: token.parent.id, token: token.id, texto: resumo.texto, tipo: resumo.tipo };
  textoFlutuante(dados);
  avisar('texto', dados);
  if (modo !== 'auto' || token.hidden) return;
  const sequencer = game.modules.get('sequencer');
  if (sequencer && sequencer.active && typeof Sequence === 'function') {
    const src = await primeiroQueExiste(ANIMACOES[resumo.tipo]);
    if (src) {
      const grade = token.parent.grid.size;
      const centro = { x: token.x + (token.width * grade) / 2, y: token.y + (token.height * grade) / 2 };
      await new Sequence(MODULE_ID).effect().file(src).atLocation(centro).size(grade * Math.max(token.width, token.height) * 1.4).fadeOut(300).play();
    }
  }
  if (resumo.tipo === 'acerto' && game.modules.get(DIWAKO)?.active) {
    try {
      if (!game.settings.get(DIWAKO, 'hit-sounds')) return;
      const sons = game.settings.get(DIWAKO, 'configured-sounds') || [];
      if (sons.length) foundry.audio.AudioHelper.play({ src: sons[Math.floor(Math.random() * sons.length)], volume: 0.35, autoplay: true, loop: false }, true);
    } catch { /* o Diwako mudou as configurações: sem som */ }
  }
}
