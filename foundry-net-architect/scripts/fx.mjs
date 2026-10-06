// Animação e som da NET. Animações: com o Sequencer e o JB2A ativos, as deles (o Sequencer já mostra para todos);
// sem eles, um efeito simples desenhado em cada cliente. Sons: sintetizados na hora (Web Audio), sem arquivos,
// só para o dono do netrunner e o mestre. Tudo desliga nas Configurações do módulo.
import { MODULE_ID } from './constantes.mjs';
import { avisar } from './socket.mjs';

const JB2A = 'modules/JB2A_DnD5e/Library/Generic';
const ANIMACOES = {
  // Feixe do token até o ponto de acesso, e as faíscas no token.
  conectar: { feixe: [`${JB2A}/Energy/EnergyBeam_02_Regular_BluePink_30ft_1600x400.webm`, `${JB2A}/Energy/EnergyBeam_01_Regular_Blue_30ft_1600x400.webm`], token: [`${JB2A}/Marker/EnergyStrandsOverlay_01_Regular_Blue_600x600.webm`, `${JB2A}/Marker/EnergyStrands_01_Regular_Blue_600x600.webm`] },
  ice: { token: [`${JB2A}/Lightning/LightningBall_01_Regular_Blue_400x400.webm`] },
  dano: { token: [`${JB2A}/Lightning/LightningStrike01_01_Regular_Blue_800x800.webm`, `${JB2A}/UI/Critical_02_Red_200x200.webm`] },
  desconectar: { token: [`${JB2A}/Marker/EnergyStrands_01_Regular_Blue_600x600.webm`] }
};
const existe = new Map();
async function primeiroQueExiste(lista = []) {
  for (const src of lista) {
    const verificar = (foundry.canvas && foundry.canvas.srcExists) || (typeof srcExists === 'function' ? srcExists : null);
    if (!existe.has(src)) existe.set(src, verificar ? await verificar(src).catch(() => false) : false);
    if (existe.get(src)) return src;
  }
  return null;
}

const centroDoToken = token => ({ x: token.x + (token.width * token.parent.grid.size) / 2, y: token.y + (token.height * token.parent.grid.size) / 2 });
const centroDoTile = tile => ({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 });

// Chamado pelo mestre ativo (autoridade): escolhe JB2A (via Sequencer) ou o efeito simples para todos.
export async function animar(tipo, { token, tile = null }) {
  const modo = game.settings.get(MODULE_ID, 'animacoes');
  if (modo === 'nao' || !token) return;
  const sequencer = game.modules.get('sequencer');
  if (modo === 'auto' && sequencer && sequencer.active && typeof Sequence === 'function') {
    try {
      const anim = ANIMACOES[tipo] || {};
      const feixe = tile && anim.feixe ? await primeiroQueExiste(anim.feixe) : null;
      const noToken = anim.token ? await primeiroQueExiste(anim.token) : null;
      if (feixe || noToken) {
        const sequencia = new Sequence(MODULE_ID);
        if (feixe) sequencia.effect().file(feixe).atLocation(centroDoToken(token)).stretchTo(centroDoTile(tile)).fadeIn(150).fadeOut(400).duration(1600);
        if (noToken) sequencia.effect().file(noToken).atLocation(centroDoToken(token)).size(token.parent.grid.size * Math.max(token.width, token.height) * 1.8).fadeOut(400).duration(1500);
        await sequencia.play();
        return;
      }
    } catch (error) { console.warn(`${MODULE_ID} | Sequencer`, error); }
  }
  const dados = { tipo, token: centroDoToken(token), tile: tile ? centroDoTile(tile) : null, cena: token.parent.id };
  efeitoSimples(dados);
  avisar('fx', dados);
}

// Efeito simples (sem módulos): feixe ciano do token ao ponto e um anel que se expande no token.
export function efeitoSimples({ tipo, token, tile, cena }) {
  if (!canvas.ready || canvas.scene?.id !== cena) return;
  const cor = { ice: 0xff2e88, dano: 0xff2e88, desconectar: 0x8a9696 }[tipo] || 0x00ffd2;
  const camada = new PIXI.Container();
  camada.eventMode = 'none';
  (canvas.interface || canvas.stage).addChild(camada);
  const grafico = new PIXI.Graphics();
  camada.addChild(grafico);
  const inicio = performance.now();
  const duracao = tipo === 'conectar' ? 1300 : 900;
  const raio = canvas.grid.size * 0.7;
  const passo = () => {
    const t = Math.min(1, (performance.now() - inicio) / duracao);
    grafico.clear();
    if (tile && tipo === 'conectar') grafico.lineStyle(6 * (1 - t) + 1, cor, 1 - t).moveTo(token.x, token.y).lineTo(tile.x, tile.y);
    grafico.lineStyle(4, cor, 1 - t).drawCircle(token.x, token.y, raio * (0.6 + t));
    if (t >= 1) { canvas.app.ticker.remove(passo); camada.destroy({ children: true }); }
  };
  canvas.app.ticker.add(passo);
}

// ---------------- Sons sintetizados ----------------
let contexto = null;
const NOTAS = {
  conectar: [[440, 0, 0.09], [660, 0.08, 0.09], [880, 0.16, 0.09], [1320, 0.24, 0.16]],
  desconectar: [[880, 0, 0.1], [520, 0.09, 0.1], [300, 0.18, 0.18]],
  sucesso: [[740, 0, 0.08], [1110, 0.08, 0.14]],
  falha: [[220, 0, 0.12, 'sawtooth'], [180, 0.11, 0.18, 'sawtooth']],
  alarme: [[960, 0, 0.12, 'square'], [720, 0.13, 0.12, 'square'], [960, 0.26, 0.12, 'square'], [720, 0.39, 0.16, 'square']],
  dano: [[140, 0, 0.25, 'sawtooth'], [90, 0.05, 0.3, 'square']]
};
export function tocarLocal(nome) {
  if (!game.settings.get(MODULE_ID, 'sons')) return;
  const notas = NOTAS[nome];
  if (!notas) return;
  try {
    contexto = contexto || new (window.AudioContext || window.webkitAudioContext)();
    if (contexto.state === 'suspended') contexto.resume();
    let interface_ = 0.5;
    try { interface_ = game.settings.get('core', 'globalInterfaceVolume'); } catch { /* v13 pode chamar diferente */ }
    const volume = 0.18 * Number(game.settings.get(MODULE_ID, 'volume')) * (Number(interface_) || 0.5);
    if (volume <= 0) return;
    const agora = contexto.currentTime;
    for (const [freq, quando, dura, forma = 'triangle'] of notas) {
      const osc = contexto.createOscillator();
      const ganho = contexto.createGain();
      osc.type = forma;
      osc.frequency.setValueAtTime(freq, agora + quando);
      ganho.gain.setValueAtTime(0.0001, agora + quando);
      ganho.gain.exponentialRampToValueAtTime(volume, agora + quando + 0.015);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + quando + dura);
      osc.connect(ganho).connect(contexto.destination);
      osc.start(agora + quando);
      osc.stop(agora + quando + dura + 0.05);
    }
  } catch (error) { console.warn(`${MODULE_ID} | som`, error); }
}

// No mestre: toca para os donos do ator (e para o próprio mestre).
export function tocar(nome, actor) {
  const para = game.users.filter(user => user.active && !user.isGM && actor && actor.testUserPermission(user, 'OWNER')).map(user => user.id);
  if (para.length) avisar('som', { nome }, para);
  tocarLocal(nome);
}
