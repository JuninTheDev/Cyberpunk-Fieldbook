// O som dos efeitos na mesa, a conta pura (o C81; o plano em foundry-sistema/efeitos-plano/PLANO.md, seções 4.1, 4.4 e
// 4.6, e o anexo equipe/fx-audio.md, seções 4.1, 4.2, 5.1, 5.2 e 6). Sem o Foundry: o G3 confere tudo
// (tests/sistema/sons.test.mjs). O motor do navegador (sons.mjs) pergunta aqui:
// - se o som toca (a mesa, o volume deste navegador, o áudio travado, o arquivo);
// - qual arquivo do banco, com qual pitch e qual volume (a variação pela semente do evento: todos os navegadores ouvem o
//   mesmo tiro);
// - o volume pela distância até quem ouve (o cosseno do Foundry, sem o "volume 1 na posição exata" dele) e o pan;
// - qual voz sai quando falta voz.
// O banco (efeitos/sons/banco.json) diz os arquivos de cada chave do catálogo (catalogo-efeitos.mjs); o "proprio:" de uma
// chave é o banco do sistema. As paredes e o abafado ficam para o C92.
import { CATALOGO, PROPRIO, candidatosDoEfeito, srcPermitido, temEfeito } from './catalogo-efeitos.mjs';

// "Volume dos efeitos de combate", de cada navegador (o barramento): o padrão é baixo de propósito, porque a mesa
// conversa por voz (o anexo, 5.5).
export const VOLUME_PADRAO = 0.7;
// "Sons na mesa", do mestre: pela distância (o padrão), para todos sem a posição, ou nenhum.
export const SONS_NA_MESA = ['posicional', 'todos', 'nao'];
// Quem não tem quem ouça na cena (o espectador, o jogador com a visão dos tokens e sem fonte de visão): ouve tudo pela
// metade, sem a posição (a recomendação da decisão 13 do PLANO).
export const SEM_OUVINTE = 0.5;
// O teto de vozes nossas tocando ao mesmo tempo (as do Foundry, a música e os sons do mapa, ficam fora).
export const TETO_DE_VOZES = Object.freeze({ pc: 16, celular: 10 });
// O mesmo arquivo de novo em menos disso (ms) é o mesmo som: toca uma vez.
export const REPETIDO_MS = 40;
// O pan nunca leva o som inteiro a um ouvido só.
export const PAN_MAXIMO = 0.6;
// A variação do volume em cada toque (dB, para mais e para menos).
export const VARIACAO_DB = 1.5;

// A categoria de cada som, pelo grupo da chave: o volume da camada (0 a 1, antes do barramento), o pitch (para mais e
// para menos), o raio em metros (null: para todos na cena, sem a posição), o teto de vozes da categoria, a prioridade
// (quem fica quando falta voz) e o contexto do Foundry (environment, o "Ambiente" de cada jogador; interface).
const categoria = (volume, pitch, raio, vozes, prioridade, contexto = 'environment') => Object.freeze({ volume, pitch, raio, vozes, prioridade, contexto });
export const CATEGORIAS = Object.freeze({
  tiro: categoria(0.55, 0.03, 150, 8, 3),
  rajada: categoria(0.55, 0.03, 150, 8, 3),
  arremesso: categoria(0.35, 0.07, 20, 4, 2),
  golpe: categoria(0.45, 0.07, 25, 4, 2),
  impacto: categoria(0.45, 0.07, 40, 4, 2),
  explosao: categoria(0.8, 0.02, 300, 2, 5),
  recarga: categoria(0.25, 0.1, 15, 2, 1),
  corpo: categoria(0.4, 0, null, 2, 4, 'interface'),
  glitch: categoria(0.3, 0, null, 3, 1, 'interface')
});
// A categoria de quem não tem uma (a chave nova de uma fase seguinte): baixa e perto.
export const CATEGORIA_PADRAO = categoria(0.4, 0.05, 40, 3, 1);
// O crítico e a morte são para a mesa toda, sem a posição, na interface (a recomendação da decisão 13 do PLANO).
const GLOBAIS = Object.freeze({ 'impacto.critico': 'interface', 'corpo.flatline': 'interface' });

export function categoriaDoSom(chave) {
  const base = CATEGORIAS[String(chave ?? '').split('.')[0]] ?? CATEGORIA_PADRAO;
  return GLOBAIS[chave] ? { ...base, raio: null, contexto: GLOBAIS[chave], prioridade: Math.max(base.prioridade, 4) } : base;
}

// ---------------- O banco ----------------
// O banco do sistema: { versao: 1, sons: { 'tiro.pistola': ['systems/cpr-fieldbook/efeitos/sons/tiro/pistola-1.ogg', ...] } }.
export const BANCO_VAZIO = Object.freeze({ versao: 1, sons: Object.freeze({}) });
export const PASTA_DO_BANCO = 'systems/cpr-fieldbook/efeitos/sons/';
const AUDIO = /\.(ogg|mp3|wav)$/i;
export const ehAudio = src => typeof src === 'string' && AUDIO.test(src);

// O que está errado num banco (a lista vazia: nada). Toda chave do catálogo, uma lista de arquivos de áudio com o
// caminho permitido e sem repetir. sistema: o banco que vai no git (só a pasta do banco do sistema).
export function conferirBanco(banco, { sistema = false } = {}) {
  if (!banco || typeof banco !== 'object' || banco.versao !== 1 || !banco.sons || typeof banco.sons !== 'object' || Array.isArray(banco.sons)) return ['o banco tem de ser { versao: 1, sons: {} }'];
  const erros = [];
  for (const [chave, lista] of Object.entries(banco.sons)) {
    if (!temEfeito(chave)) erros.push(`${chave}: a chave não está no catálogo`);
    if (!Array.isArray(lista) || !lista.length) { erros.push(`${chave}: sem arquivos`); continue; }
    if (new Set(lista).size !== lista.length) erros.push(`${chave}: um arquivo repetido`);
    for (const src of lista) {
      if (!srcPermitido(src) || !ehAudio(src)) erros.push(`${chave}: o arquivo ${src} não é um áudio com o caminho permitido`);
      else if (sistema && !src.startsWith(PASTA_DO_BANCO)) erros.push(`${chave}: o arquivo ${src} fora de ${PASTA_DO_BANCO}`);
    }
  }
  return erros;
}

// Os arquivos de um som: os candidatos do catálogo, na ordem; vale o primeiro grupo que existe (os de áudio que vêm antes
// do "proprio:", como o pacote do mestre, ou o banco do sistema no "proprio:"). Sem nada: a lista vazia (não toca).
export function arquivosDoSom(chave, banco = BANCO_VAZIO, doMestre = {}) {
  const candidatos = candidatosDoEfeito(chave, doMestre);
  const deFora = candidatos.filter(src => src !== `${PROPRIO}${chave}` && ehAudio(src));
  if (deFora.length) return deFora;
  const doBanco = banco?.sons?.[chave];
  return Array.isArray(doBanco) ? doBanco.filter(src => srcPermitido(src) && ehAudio(src)) : [];
}

// ---------------- O sorteio ----------------
// Um número de 0 a 1 por semente (o mulberry32): o mesmo em todos os navegadores.
const hash = texto => [...String(texto)].reduce((soma, letra) => Math.imul(soma ^ letra.charCodeAt(0), 2654435761) >>> 0, 2166136261);
export function sorteador(semente) {
  let a = hash(semente);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A semente de um passo: o evento, a chave e o tempo dele no roteiro (os dois tiros de um mesmo evento soam diferentes).
export const sementeDoPasso = (evento, passo) => `${evento?.id ?? ''}:${evento?.fase ?? ''}:${passo?.chave ?? ''}:${passo?.t ?? 0}`;

// A variação: pela semente, sem repetir a última deste navegador (ultima: o índice dela, ou -1).
export function escolherVariacao(quantas, sorteio, ultima = -1) {
  if (!(quantas >= 1)) return -1;
  const escolhida = Math.min(quantas - 1, Math.floor(sorteio * quantas));
  return quantas > 1 && escolhida === ultima ? (escolhida + 1) % quantas : escolhida;
}
// O pitch (o playbackRate): 1 mais ou menos o da categoria.
export const pitchDoSom = (cat, sorteio) => 1 + (sorteio * 2 - 1) * (cat?.pitch ?? 0);
// A variação do volume: ±1,5 dB.
export const variacaoDoVolume = sorteio => 10 ** (((sorteio * 2 - 1) * VARIACAO_DB) / 20);

// ---------------- Quem ouve ----------------
// O volume pela distância (0 a 1): o cosseno do PointSoundSource do Foundry (point-sound-source.mjs, getVolumeMultiplier),
// o maior entre os ouvintes; fora do raio, 0. O próprio ponto do som é 1, e nunca passa do volume da camada (a armadilha
// do Sound#playAtPosition, que dava o volume 1 ao mestre e a quem atira). raio em pixels.
export function atenuacao(distancia, raio) {
  if (!(raio > 0) || !Number.isFinite(distancia) || distancia > raio) return 0;
  return (Math.cos(Math.PI * (distancia / raio)) + 1) * 0.5;
}
export function ouvirDe(origem, ouvintes, raio) {
  let melhor = { volume: 0, pan: 0 };
  for (const ouvinte of ouvintes ?? []) {
    if (!Number.isFinite(ouvinte?.x) || !Number.isFinite(ouvinte?.y)) continue;
    const volume = atenuacao(Math.hypot(origem.x - ouvinte.x, origem.y - ouvinte.y), raio);
    if (volume > melhor.volume) melhor = { volume, pan: Math.max(-PAN_MAXIMO, Math.min(PAN_MAXIMO, (origem.x - ouvinte.x) / raio)) };
  }
  return melhor;
}

// O volume de um som neste navegador, antes do barramento: a camada, a variação, e a distância (no posicional, com
// ouvinte e com o som num ponto) ou o fixo (para todos; o sem ouvinte, pela metade). metro: os pixels de um metro.
export function volumeDoSom({ chave, origem = null, ouvintes = [], metro = 50, sonsNaMesa = 'posicional', sorteio = 0.5 }) {
  const cat = categoriaDoSom(chave);
  const base = cat.volume * variacaoDoVolume(sorteio);
  if (sonsNaMesa !== 'posicional' || cat.raio === null || !origem || !Number.isFinite(origem.x) || !Number.isFinite(origem.y)) return { volume: base, pan: 0, posicional: false };
  const validos = (ouvintes ?? []).filter(o => Number.isFinite(o?.x) && Number.isFinite(o?.y));
  if (!validos.length) return { volume: base * SEM_OUVINTE, pan: 0, posicional: false, semOuvinte: true };
  const { volume, pan } = ouvirDe(origem, validos, cat.raio * metro);
  return { volume: base * volume, pan, posicional: true };
}

// O som toca neste navegador? null (toca) ou o motivo: a mesa sem som, o volume deste navegador no zero, o áudio
// ainda travado (o navegador antes do primeiro clique: o Sound#load do Foundry esperaria e tocaria tudo junto depois),
// nenhum arquivo, longe demais.
export function motivoParaNaoTocar({ sonsNaMesa = 'posicional', volumeAqui = VOLUME_PADRAO, travado = false, arquivos = [], volume = 1 } = {}) {
  if (sonsNaMesa === 'nao' || !SONS_NA_MESA.includes(sonsNaMesa)) return 'desligado';
  if (!(volumeAqui > 0)) return 'mudo';
  if (travado) return 'travado';
  if (!arquivos.length) return 'semArquivo';
  if (!(volume > 0.001)) return 'longe';
  return null;
}

// ---------------- As vozes ----------------
// Cabe mais uma voz? vivas: [{ id, categoria, prioridade, inicio }]. Cheia a categoria, sai a mais velha dela; cheio o
// teto, sai a mais velha de menor prioridade, se não for de prioridade maior que a nova; senão, a nova não entra.
export function abrirVoz(vivas, nova, teto = TETO_DE_VOZES.pc) {
  const cat = CATEGORIAS[nova.categoria] ?? CATEGORIA_PADRAO;
  const cortar = [];
  const restantes = [...vivas].sort((a, b) => a.inicio - b.inicio);
  const mesma = restantes.filter(v => v.categoria === nova.categoria);
  if (mesma.length >= cat.vozes) {
    cortar.push(mesma[0].id);
    restantes.splice(restantes.indexOf(mesma[0]), 1);
  }
  if (restantes.length >= teto) {
    const menor = Math.min(...restantes.map(v => v.prioridade));
    if (menor > nova.prioridade) return { entra: false, cortar: [] };
    const sai = restantes.find(v => v.prioridade === menor);
    cortar.push(sai.id);
  }
  return { entra: true, cortar };
}

// O mesmo arquivo há menos de REPETIDO_MS (o mesmo evento por dois caminhos): não toca de novo.
export const repetido = (ultimos, src, agora) => Number.isFinite(ultimos?.get?.(src)) && agora - ultimos.get(src) < REPETIDO_MS;

// As chaves de som do catálogo (para a pré-carga e o G3).
export const chavesDeSom = () => Object.keys(CATALOGO).filter(chave => Object.hasOwn(CATEGORIAS, chave.split('.')[0]));
