// O token de quem está na NET (o token.mjs do NET Architect): o status "Conectado à NET" (o ícone que todos veem no
// token, posto pelo mestre) e um anel ciano pulsando em volta, desenhado em cada cliente pela flag da conexão do token.
import { SISTEMA } from '../config.mjs';
import { FLAG_CONEXAO, ICONE_CONECTADO, STATUS_CONECTADO, STATUS_EM_CHAMAS } from './constantes.mjs';
import { iconeDoEstado } from '../regras-icones.mjs';

export function registrarStatusDaNet() {
  if (!CONFIG.statusEffects.some(efeito => efeito.id === STATUS_CONECTADO)) CONFIG.statusEffects.push({ id: STATUS_CONECTADO, name: 'Conectado à NET', img: ICONE_CONECTADO });
  if (!CONFIG.statusEffects.some(efeito => efeito.id === STATUS_EM_CHAMAS)) CONFIG.statusEffects.push({ id: STATUS_EM_CHAMAS, name: 'Em chamas', img: iconeDoEstado(STATUS_EM_CHAMAS) });
}

const aneis = new Set();
let pulsando = false;
function pulsar() {
  const t = performance.now() / 520;
  for (const anel of aneis) {
    if (anel.destroyed) aneis.delete(anel);
    else anel.alpha = 0.55 + 0.4 * Math.sin(t);
  }
}

export function desenharAnel(token) {
  if (!token || token.destroyed) return;
  const ligado = Boolean(token.document.getFlag(SISTEMA, FLAG_CONEXAO));
  let anel = token.children.find(filho => filho[SISTEMA]);
  if (!ligado) {
    if (anel) {
      aneis.delete(anel);
      anel.destroy();
    }
    return;
  }
  if (!anel || anel.destroyed) {
    anel = new PIXI.Graphics();
    anel[SISTEMA] = true;
    anel.eventMode = 'none';
    token.addChild(anel);
    aneis.add(anel);
  }
  // O refreshToken vem a cada passo da animação: só redesenha se o tamanho mudou.
  const [w, h] = [token.w, token.h];
  if (anel.tamanho === `${w}x${h}`) return;
  anel.tamanho = `${w}x${h}`;
  const raio = Math.max(w, h) / 2 + Math.max(4, w * 0.06);
  anel.clear();
  anel.lineStyle(Math.max(3, w * 0.045), 0x00ffd2, 0.95).drawCircle(w / 2, h / 2, raio);
  anel.lineStyle(Math.max(1, w * 0.02), 0xff2e88, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    anel.moveTo(w / 2 + Math.cos(a) * (raio - 4), h / 2 + Math.sin(a) * (raio - 4)).lineTo(w / 2 + Math.cos(a) * (raio + 6), h / 2 + Math.sin(a) * (raio + 6));
  }
  if (!pulsando) {
    canvas.app.ticker.add(pulsar);
    pulsando = true;
  }
}

export function pararPulso() {
  if (pulsando) canvas.app?.ticker?.remove(pulsar);
  pulsando = false;
  aneis.clear();
}
