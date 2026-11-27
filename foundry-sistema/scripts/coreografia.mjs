// O diretor dos efeitos na mesa (o C79; o plano em foundry-sistema/efeitos-plano/PLANO.md, seção 4.3, e o anexo
// equipe/fx-coreografia.md, seções 3.5 a 3.8). Cada navegador toca a sua cópia de um evento, uma vez, pela visão dele:
// - o cartão do resultado é o evento (o caminho 1): o mestre grava o evento na flag "efeito" do cartão, e cada cliente
//   toca quando o cartão chega até ele (o createChatMessage). Vale só para quem vê o cartão, sem socket, sem duplicar e
//   sem confiar em ninguém: o autor do cartão é o servidor quem diz;
// - o socket, só do mestre ativo (o caminho 2): o disparo antes da defesa (o C82) e o que o mestre manda à parte, com
//   "recipients" para quem pode ver.
// A regra pura (regras-coreografia.mjs) monta o roteiro; aqui ficam a cena, a visão, o nível deste navegador, a fila e
// os tocadores: o texto em cima do token (efeitos.mjs), desde o C80 o desenho (o palco PIXI, tocador-pixi.mjs) e, desde
// o C81, o som (sons.mjs). O efeito nunca segura o jogo: nada espera por ele, e a falha vira um contador, sem erro no console
// (só o erro de programação vai ao console, para o G4 pegar).
import { SISTEMA } from './config.mjs';
import { textoFlutuante } from './efeitos.mjs';
import * as C from './regras-coreografia.mjs';
import { PALCO, desenhar, registrarPalco } from './tocador-pixi.mjs';
import { SONS, registrarSons, tocarSom } from './sons.mjs';
import { destinatariosDoTexto, textoNaVisao } from './regras.mjs';

const CANAL = `system.${SISTEMA}`;
// Os eventos já tocados neste navegador (o id e a fase), para o mesmo não tocar duas vezes.
const LEMBRAR = 200;
const estado = { fila: [], tocando: null, tocados: [], falhas: 0, recusados: 0, maiorEspera: 0, registro: null };

// O aparelho, para o "Automático": o celular, o Safari (o WebKit, sem o Chrome nem o Edge) e os núcleos.
function aparelho() {
  const { navigator } = globalThis;
  const agente = navigator.userAgent ?? '';
  let fotossensivel = false;
  try { fotossensivel = Boolean(game.settings.get('core', 'photosensitiveMode')); } catch { fotossensivel = false; }
  return {
    fotossensivel, celular: Boolean(navigator.userAgentData?.mobile) || /Mobi|Android|iPhone|iPad/i.test(agente),
    webkit: /AppleWebKit/.test(agente) && !/Chrome|Chromium|Edg\//.test(agente), nucleos: navigator.hardwareConcurrency ?? 8
  };
}

// O nível que vale neste navegador: o menor entre "Efeitos na mesa" (do mestre) e "Efeitos neste navegador".
export function nivelDesteNavegador() {
  return C.nivelDoNavegador(game.settings.get(SISTEMA, 'animacoes'), game.settings.get(SISTEMA, 'efeitosIntensidade'), aparelho());
}

// O token está à vista deste navegador? O mesmo teste do texto (o C77): o mestre vê tudo; o jogador, nunca o escondido,
// e, com a visão dos tokens, só o que está na visão dele.
function visivelAqui(id) {
  const objeto = canvas.tokens?.get(id);
  if (!objeto) return false;
  const visao = canvas.visibility;
  const testar = () => visao.testVisibility(objeto.document.getVisibilityTestPoints(), { tolerance: 0, object: objeto });
  return textoNaVisao({ gm: game.user.isGM, escondido: objeto.document.hidden, visaoDosTokens: visao.tokenVision, proprio: Boolean(objeto.vision?.active), testar });
}

// O token que o mestre escondeu (o hidden), para o jogador: nem a luz do clarão o revela (o C102).
const ocultoAqui = id => !game.user.isGM && Boolean(canvas.tokens?.get(id)?.document.hidden);

function falhou(erro) {
  estado.falhas++;
  if (erro instanceof TypeError || erro instanceof ReferenceError) console.error(`${SISTEMA} | efeito`, erro);
}

// O tiro que errou segue até a parede (regras-coreografia.pararNaParede): a primeira parede que segura o movimento, no
// caminho do traçante prolongado. Todos os navegadores têm as mesmas paredes: o mesmo ponto em todos.
const ALCANCE_DO_ERRO = 10;
function primeiraParede(de, ate) {
  const batida = CONFIG.Canvas.polygonBackends.sight.testCollision(de, ate, { type: 'move', mode: 'closest' });
  return batida ? { x: batida.x, y: batida.y } : null;
}

// Os tocadores de cada passo: o texto e o som (o C81, sons.mjs) aqui, cada um no tempo dele; o desenho vai inteiro para
// o palco (executar).
const TOCADORES = {
  texto: (evento, passo) => textoFlutuante({ cena: evento.cena, token: passo.token, texto: passo.texto, estilo: passo.estilo }),
  som: (evento, passo) => tocarSom(evento, passo)
};

function tocarPasso(evento, passo) {
  try {
    if (!canvas.ready || canvas.scene?.id !== evento.cena) return;
    TOCADORES[passo.passo]?.(evento, passo);
  } catch (erro) { falhou(erro); }
}

// Toca os passos de um evento, cada um no tempo dele: o desenho vai inteiro para o palco, e o texto sobe no tempo dele.
// Devolve quando o próximo pode começar (ms).
function executar({ evento, passos, nivel, calmo }, degradado = false) {
  const lista = degradado ? C.soTexto(passos) : passos;
  estado.registro?.push({ id: evento.id, fase: evento.fase, nivel, soTexto: degradado, em: Date.now(), passos: lista.map(p => ({ passo: p.passo, token: p.token ?? null, ...(p.parede ? { parede: true } : {}) })) });
  if (!degradado) {
    try { desenhar(evento, lista, { nivel, calmo }); } catch (erro) { falhou(erro); }
  }
  for (const passo of lista.filter(p => TOCADORES[p.passo])) {
    if (passo.t > 0) setTimeout(() => tocarPasso(evento, passo), passo.t);
    else tocarPasso(evento, passo);
  }
  return C.fimDoTocar(lista);
}

// Um evento por vez: o próximo começa quando o anterior acaba (no máximo no teto).
function proximo() {
  if (estado.tocando || !estado.fila.length) return;
  const item = estado.fila.shift();
  estado.tocando = item;
  let espera = 0;
  try { espera = Math.min(executar(item), C.TETO.completo); } catch (erro) { falhou(erro); }
  setTimeout(() => { estado.tocando = null; proximo(); }, espera);
}

// Toca um evento neste navegador: confere o evento, a cena vista, o nível e a visão, e põe na fila. Devolve se entrou.
// rever: o "Rever o efeito" do cartão, que toca de novo o que já tocou (só neste navegador).
export function tocar(evento, { rever = false } = {}) {
  try {
    if (C.validarEvento(evento)) { estado.recusados++; return false; }
    if (!canvas?.ready || canvas.scene?.id !== evento.cena) return false;
    const marca = `${evento.id}:${evento.fase}`;
    if (!rever && estado.tocados.includes(marca)) return false;
    if (!estado.tocados.includes(marca)) estado.tocados.push(marca);
    if (estado.tocados.length > LEMBRAR) estado.tocados.shift();
    const nivel = nivelDesteNavegador();
    const { fotossensivel } = aparelho();
    const casa = canvas.grid?.size ?? 100;
    const roteiro = C.pararNaParede(C.roteiro(evento, { nivel, fotossensivel, casa, agora: game.time.worldTime }), primeiraParede, { alcance: ALCANCE_DO_ERRO * casa });
    const passos = C.passosVisiveis(roteiro, { visivel: visivelAqui, origem: evento.origem?.token ?? null, oculto: ocultoAqui });
    if (!passos.length) return false;
    const { fila, sairam } = C.entrarNaFila(estado.fila, { evento, passos, nivel, calmo: nivel !== 'completo' || fotossensivel });
    estado.fila = fila;
    estado.maiorEspera = Math.max(estado.maiorEspera, fila.length);
    for (const item of sairam) executar(item, true);
    proximo();
    return true;
  } catch (erro) {
    falhou(erro);
    return false;
  }
}

// O caminho 2: o mestre ativo manda o evento pelo socket a quem pode ver (para: os ids; null: todos) e toca o dele (o
// servidor não devolve o socket a quem mandou).
export function emitir(evento, para = null) {
  if (!game.user.isActiveGM || C.validarEvento(evento)) return false;
  const outros = destinatariosDoTexto(para, game.user.id);
  if (!outros) game.socket.emit(CANAL, { tipo: 'efeito', evento });
  else if (outros.length) game.socket.emit(CANAL, { tipo: 'efeito', evento }, { recipients: outros });
  if (!Array.isArray(para) || para.includes(game.user.id)) tocar(evento);
  return true;
}

// O "Rever o efeito" do cartão: toca de novo, só neste navegador, o efeito de um cartão que ele vê.
export function rever(mensagem) {
  const evento = mensagem?.getFlag(SISTEMA, 'efeito');
  if (!evento || !mensagem.author?.isGM || !mensagem.isContentVisible) return false;
  return tocar(evento, { rever: true });
}

export function registrarCoreografia() {
  registrarPalco();
  registrarSons();
  // O caminho 1: o cartão do resultado, só o de um mestre, só para quem vê o cartão. O isContentVisible, e não o visible: o
  // cartão sussurrado que tem rolagem (o dano) é visible para todos, que veem a rolagem escondida, mas não o conteúdo.
  Hooks.on('createChatMessage', mensagem => {
    const evento = mensagem.getFlag(SISTEMA, 'efeito');
    if (evento && mensagem.author?.isGM && mensagem.isContentVisible) tocar(evento);
  });
  // O caminho 2: o socket, só do mestre ativo (o remetente é o que o servidor põe, o segundo argumento: o C56).
  game.socket.on(CANAL, (mensagem, remetente) => {
    const quem = game.users.get(remetente);
    if (mensagem?.tipo === 'efeito' && quem?.isGM && remetente === game.users.activeGM?.id) tocar(mensagem.evento);
  });
}

// A API (game.system.api.efeitos), para as macros e o G4: tocar e emitir, o nível deste navegador, as falhas, e o
// registro de cada evento tocado (só com o gravar ligado).
export const API = {
  tocar, emitir, rever, nivelDesteNavegador, palco: PALCO, sons: SONS,
  gravar(ligado = true) { estado.registro = ligado ? [] : null; estado.maiorEspera = 0; return true; },
  get registro() { return estado.registro; },
  get falhas() { return estado.falhas; },
  get recusados() { return estado.recusados; },
  get maiorEspera() { return estado.maiorEspera; },
  get esperando() { return estado.fila.length; },
  // Tocando ou com algo na fila: o G4 espera ficar livre antes de gravar (o evento de um passo não cai no seguinte).
  get ocupado() { return Boolean(estado.tocando) || estado.fila.length > 0; }
};
