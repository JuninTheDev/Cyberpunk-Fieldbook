// O motor de som dos efeitos na mesa (o C81; o plano em foundry-sistema/efeitos-plano/PLANO.md, seção 4.1, e o anexo
// equipe/fx-audio.md, seções 2, 4 e 5). Cada navegador toca o passo "som" do roteiro do diretor (coreografia.mjs) pela
// visão dele, com o áudio do Foundry 14, sem módulo:
// - o barramento "Efeitos de combate": um GainNode com o volume deste navegador e um limitador (o DynamicsCompressor),
//   antes do volume "Ambiente" (ou "Interface") do jogador. O Sound#destination do Foundry é público, e o _createNodes não
//   o troca se ele já existe: o som vai ao barramento sem mexer no núcleo;
// - o pitch: o SomDeEfeito põe o playbackRate na fonte (o Sound do Foundry não tem a opção);
// - o volume pela distância e o pan, calculados aqui (regras-sons.mjs), sem o Sound#playAtPosition, que dá o volume 1
//   ao mestre e a quem atira;
// - o áudio travado (antes do primeiro clique neste navegador, ou o contexto suspenso sem o gesto): o som se descarta. O
//   Sound#load do Foundry esperaria o clique e tocaria tudo junto depois;
// - as vozes: o teto de 16 (10 no celular), o teto de cada categoria e a prioridade;
// - o banco (efeitos/sons/banco.json), lido no ready, e a pré-carga dos primeiros sons depois do primeiro clique.
// A falha vira um contador, sem erro no console (só o erro de programação vai ao console, para o G4 pegar).
import { SISTEMA } from './config.mjs';
import * as R from './regras-sons.mjs';

const estado = {
  banco: R.BANCO_VAZIO, barramentos: new Map(), vozes: new Map(), ultimas: new Map(), ultimos: new Map(), proxima: 1,
  contagem: { tocados: 0, desligado: 0, mudo: 0, travado: 0, semArquivo: 0, longe: 0, repetido: 0, cheio: 0, cortados: 0 },
  falhas: 0, registro: null, preCarregados: 0
};

function falhou(erro) {
  estado.falhas++;
  if (erro instanceof TypeError || erro instanceof ReferenceError) console.error(`${SISTEMA} | som`, erro);
}

// O Sound do Foundry com o pitch: o playbackRate da fonte, posto a cada play (a fonte nasce de novo em cada um).
let SomDeEfeito = null;
function classeDoSom() {
  SomDeEfeito ??= class extends foundry.audio.Sound {
    taxa = 1;
    _createNodes() {
      super._createNodes();
      if (this.sourceNode?.playbackRate) this.sourceNode.playbackRate.value = this.taxa;
    }
  };
  return SomDeEfeito;
}

// O volume deste navegador ("Volume dos efeitos de combate") e o da mesa ("Sons na mesa").
const volumeAqui = () => { try { return Number(game.settings.get(SISTEMA, 'efeitosVolume')); } catch { return R.VOLUME_PADRAO; } };
const sonsNaMesa = () => { try { return game.settings.get(SISTEMA, 'efeitosSons'); } catch { return 'posicional'; } };
const celular = () => Boolean(globalThis.navigator?.userAgentData?.mobile) || /Mobi|Android|iPhone|iPad/i.test(globalThis.navigator?.userAgent ?? '');

// O barramento de um contexto do Foundry (environment ou interface): nasce no primeiro som depois do desbloqueio.
function barramento(nome) {
  if (estado.barramentos.has(nome)) return estado.barramentos.get(nome);
  const contexto = game.audio?.[nome];
  if (!contexto || game.audio.locked) return null;
  const entrada = contexto.createGain();
  entrada.gain.value = volumeAqui();
  // O limitador: segura a rajada e a explosão por cima da voz da mesa (o anexo, 4.1).
  const limitador = contexto.createDynamicsCompressor();
  limitador.threshold.value = -14;
  limitador.ratio.value = 4;
  limitador.attack.value = 0.003;
  limitador.release.value = 0.15;
  entrada.connect(limitador);
  limitador.connect(contexto.gainNode ?? contexto.destination);
  const novo = { contexto, entrada, limitador };
  estado.barramentos.set(nome, novo);
  return novo;
}

// O "Volume dos efeitos de combate" mudou: o barramento muda na hora.
export function aplicarVolume(valor = volumeAqui()) {
  for (const { entrada } of estado.barramentos.values()) entrada.gain.value = Math.max(0, Math.min(1, Number(valor) || 0));
}

// O áudio travado neste navegador, para o contexto do som: antes do primeiro gesto (o Foundry ainda não tem os
// contextos), ou com o contexto suspenso sem um gesto que o deixe voltar. A tecla Shift já destrava o Foundry, mas o
// navegador só dá a ativação da página com um clique ou uma tecla de verdade: o contexto nasce suspenso, e o Foundry não o
// retoma. Depois de um gesto assim, o contexto volta aqui, e o som toca.
function travadoAqui(nome) {
  const contexto = game.audio?.[nome];
  if (game.audio?.locked || !contexto || contexto.state === 'closed') return true;
  if (contexto.state === 'running') return false;
  const ativado = globalThis.navigator?.userActivation?.hasBeenActive ?? true;
  if (!ativado) return true;
  contexto.resume().catch(falhou);
  return false;
}

// Quem ouve neste navegador: os tokens que o Foundry dá como ouvintes (com visão, ou os controlados); o mestre sem nenhum
// ouve do centro da tela, e não da origem do som (a armadilha do gmAlways).
function ouvintes() {
  const lista = canvas.sounds?.getListenerPositions?.() ?? [];
  if (lista.length || !game.user.isGM) return lista;
  const centro = canvas.stage?.pivot;
  return centro ? [{ x: centro.x, y: centro.y }] : [];
}

// Abre uma voz (corta as que saem) e a devolve; null se a nova não entra.
function vozPara(cat, chave) {
  const vivas = [...estado.vozes.values()].map(v => ({ id: v.id, categoria: v.categoria, prioridade: v.prioridade, inicio: v.inicio }));
  const nova = { categoria: chave.split('.')[0], prioridade: cat.prioridade };
  const { entra, cortar } = R.abrirVoz(vivas, nova, celular() ? R.TETO_DE_VOZES.celular : R.TETO_DE_VOZES.pc);
  for (const id of cortar) {
    const voz = estado.vozes.get(id);
    estado.vozes.delete(id);
    estado.contagem.cortados++;
    voz?.som.stop({ fade: 30 }).catch(falhou);
  }
  if (!entra) return null;
  const voz = { id: estado.proxima++, ...nova, inicio: performance.now(), som: null };
  estado.vozes.set(voz.id, voz);
  return voz;
}

// Toca o passo "som" de um evento neste navegador. Devolve o que tocou (ou o motivo de não tocar), para o registro.
export function tocarSom(evento, passo) {
  const chave = passo?.chave;
  try {
    const cat = R.categoriaDoSom(chave);
    const sortear = R.sorteador(R.sementeDoPasso(evento, passo));
    const arquivos = R.arquivosDoSom(chave, estado.banco);
    const mesa = sonsNaMesa();
    const metro = canvas.dimensions?.distancePixels ?? 50;
    const { volume, pan, posicional, semOuvinte } = R.volumeDoSom({ chave, origem: passo.para, ouvintes: mesa === 'posicional' ? ouvintes() : [], metro, sonsNaMesa: mesa, sorteio: sortear() });
    const motivo = R.motivoParaNaoTocar({ sonsNaMesa: mesa, volumeAqui: volumeAqui(), travado: travadoAqui(cat.contexto), arquivos, volume });
    const indice = motivo ? -1 : R.escolherVariacao(arquivos.length, sortear(), estado.ultimas.get(chave) ?? -1);
    const src = indice >= 0 ? arquivos[indice] : null;
    const agora = performance.now();
    const fim = (dados) => { estado.registro?.push({ evento: evento?.id ?? null, chave, ...dados }); return dados; };
    if (motivo) { estado.contagem[motivo]++; return fim({ motivo }); }
    if (R.repetido(estado.ultimos, src, agora)) { estado.contagem.repetido++; return fim({ motivo: 'repetido', src }); }
    const destino = barramento(cat.contexto);
    if (!destino) { estado.contagem.travado++; return fim({ motivo: 'travado' }); }
    const voz = vozPara(cat, chave);
    if (!voz) { estado.contagem.cheio++; return fim({ motivo: 'cheio', src }); }
    estado.ultimas.set(chave, indice);
    estado.ultimos.set(src, agora);
    const taxa = R.pitchDoSom(cat, sortear());
    const Classe = classeDoSom();
    const som = new Classe(src, { context: destino.contexto });
    som.taxa = taxa;
    som.destination = destino.entrada;
    if (pan) {
      const panner = destino.contexto.createStereoPanner();
      panner.pan.value = pan;
      som.effects = [panner];
    }
    voz.som = som;
    estado.contagem.tocados++;
    const largar = () => { if (estado.vozes.get(voz.id) === voz) estado.vozes.delete(voz.id); };
    som.load()
      .then(() => {
        if (som.failed) { largar(); estado.falhas++; return null; }
        if (estado.vozes.get(voz.id) !== voz) return null;
        return som.play({ volume, onended: largar });
      })
      .catch(erro => { largar(); falhou(erro); });
    return fim({ src, volume, taxa, pan, posicional, semOuvinte: Boolean(semOuvinte), contexto: cat.contexto });
  } catch (erro) {
    falhou(erro);
    return { chave, motivo: 'falha' };
  }
}

// Para tudo o que toca (a troca de cena).
function pararTudo() {
  for (const voz of estado.vozes.values()) voz.som?.stop({ fade: 30 }).catch(falhou);
  estado.vozes.clear();
}

// Troca o banco deste navegador (o do sistema no ready; o G4 e as macros, com um banco próprio). O banco que não passa
// na conferência não entra. Devolve os erros (a lista vazia: entrou).
export function usarBanco(banco) {
  const erros = R.conferirBanco(banco);
  if (!erros.length) {
    estado.banco = banco;
    estado.ultimas.clear();
  }
  return erros;
}

// A pré-carga (o anexo, 7.3): a primeira variação de cada som do banco, depois do primeiro clique, até 12 arquivos.
async function preCarregar() {
  const primeiros = R.chavesDeSom().map(chave => R.arquivosDoSom(chave, estado.banco)[0]).filter(Boolean).slice(0, 12);
  for (const src of primeiros) {
    try {
      await foundry.audio.AudioHelper.preloadSound(src);
      estado.preCarregados++;
    } catch (erro) { falhou(erro); }
  }
}

export function registrarSons() {
  Hooks.on('canvasTearDown', pararTudo);
  fetch(foundry.utils.getRoute(`${R.PASTA_DO_BANCO}banco.json`))
    .then(resposta => (resposta.ok ? resposta.json() : R.BANCO_VAZIO))
    .then(banco => { if (usarBanco(banco).length) estado.falhas++; })
    .catch(falhou)
    .finally(() => game.audio?.unlock?.then(preCarregar).catch(falhou));
}

// O que o G4 e as macros conferem: as contagens (o que tocou e por que não tocou), as vozes vivas, o banco, as falhas e o
// registro de cada som pedido (só com o gravar ligado).
export const SONS = {
  tocar: tocarSom, usarBanco, aplicarVolume,
  gravar(ligado = true) { estado.registro = ligado ? [] : null; return true; },
  get registro() { return estado.registro; },
  get contagem() { return { ...estado.contagem }; },
  get vozes() { return estado.vozes.size; },
  get banco() { return estado.banco; },
  get falhas() { return estado.falhas; },
  get preCarregados() { return estado.preCarregados; },
  get barramento() { const b = estado.barramentos.get('environment'); return b ? { volume: b.entrada.gain.value } : null; }
};
