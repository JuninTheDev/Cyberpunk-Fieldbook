// Socket com a autoridade do mestre: o cliente de quem atacou avisa o ataque, o mestre ativo resolve tudo (defesa,
// dano, ficha) um ataque de cada vez, e pergunta ao jogador do alvo (ou de quem atacou) quando é a vez dele rolar.
// O mestre também pode responder no lugar de um jogador que não responde (botões no cartão "esperando").
import { MODULE_ID } from './constantes.mjs';

const CANAL = `module.${MODULE_ID}`;
// Um ataque pode esperar a defesa e o dano (até 5 min cada pela configuração): o pedido espera até 12 min.
const ESPERA_MS = 720000;
const pendentes = new Map();
const perguntas = new Map();
// No jogador: as perguntas abertas agora, para fechar a janela da que o mestre desistiu de esperar.
const respondendo = new Map();
let tratadores = {};
let avisos = {};
let respondedores = {};
let fila = Promise.resolve();

export const souMestreAtivo = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM === game.user);

// Erro com mensagem para o jogador (sem rastro de pilha no aviso).
export class ErroFluxo extends Error {}
export const erro = mensagem => new ErroFluxo(mensagem);

function naFila(tarefa) {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => {});
  return resultado;
}

async function executar(op, dados, usuario) {
  const tratador = tratadores[op];
  if (!tratador) throw erro(`Operação desconhecida: ${op}.`);
  if (!usuario) throw erro('Usuário desconhecido.');
  return tratador(dados || {}, usuario);
}

export function iniciarSocket(handlers, eventos = {}, respostas = {}) {
  tratadores = handlers;
  avisos = eventos;
  respondedores = respostas;
  game.socket.on(CANAL, async mensagem => {
    if (!mensagem || typeof mensagem !== 'object') return;
    if (mensagem.tipo === 'pedido') {
      if (!souMestreAtivo()) return;
      const usuario = game.users.get(mensagem.usuario);
      let resposta;
      try {
        resposta = { ok: true, dados: await naFila(() => executar(mensagem.op, mensagem.dados, usuario)) };
      } catch (error) {
        if (!(error instanceof ErroFluxo)) console.error(`${MODULE_ID} | ${mensagem.op}`, error);
        resposta = { ok: false, erro: error.message || String(error) };
      }
      game.socket.emit(CANAL, { tipo: 'resposta', id: mensagem.id, usuario: mensagem.usuario, ...resposta });
      return;
    }
    if (mensagem.tipo === 'resposta' && mensagem.usuario === game.user.id) {
      const pendente = pendentes.get(mensagem.id);
      if (!pendente) return;
      pendentes.delete(mensagem.id);
      clearTimeout(pendente.relogio);
      if (mensagem.ok) pendente.resolve(mensagem.dados);
      else pendente.reject(erro(mensagem.erro));
      return;
    }
    // O mestre pergunta a este jogador (rolar a esquiva, por exemplo) e espera a resposta.
    if (mensagem.tipo === 'pergunta' && mensagem.para === game.user.id) {
      const pergunta = { id: mensagem.id, expirou: false, aoExpirar: null };
      respondendo.set(mensagem.id, pergunta);
      let resposta;
      try { resposta = { ok: true, dados: await respondedores[mensagem.op]?.(mensagem.dados, pergunta) }; } catch (error) { console.error(`${MODULE_ID} | pergunta ${mensagem.op}`, error); resposta = { ok: false, erro: error.message }; }
      respondendo.delete(mensagem.id);
      if (!pergunta.expirou) game.socket.emit(CANAL, { tipo: 'resposta-pergunta', id: mensagem.id, de: game.user.id, ...resposta });
      return;
    }
    if (mensagem.tipo === 'pergunta-expirou' && mensagem.para === game.user.id) {
      const pergunta = respondendo.get(mensagem.id);
      if (!pergunta) return;
      pergunta.expirou = true;
      try { pergunta.aoExpirar?.(); } catch (error) { console.warn(`${MODULE_ID} | pergunta expirou`, error); }
      return;
    }
    if (mensagem.tipo === 'resposta-pergunta') {
      const pendente = perguntas.get(mensagem.id);
      if (!pendente) return;
      perguntas.delete(mensagem.id);
      clearTimeout(pendente.relogio);
      pendente.resolve(mensagem.ok ? mensagem.dados : null);
      return;
    }
    if (mensagem.tipo === 'aviso' && (!mensagem.para || mensagem.para.includes(game.user.id))) {
      try { await avisos[mensagem.evento]?.(mensagem.dados); } catch (error) { console.error(`${MODULE_ID} | aviso ${mensagem.evento}`, error); }
    }
  });
}

// Pede ao mestre ativo. No próprio mestre, resolve aqui mesmo (na mesma fila).
export function pedir(op, dados = {}) {
  if (souMestreAtivo()) return naFila(() => executar(op, dados, game.user));
  if (!game.users.activeGM) return Promise.reject(erro('Nenhum mestre conectado: o Fluxo de Combate precisa do mestre para resolver o ataque.'));
  const id = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(() => {
      pendentes.delete(id);
      reject(erro('O mestre não respondeu a tempo.'));
    }, ESPERA_MS);
    pendentes.set(id, { resolve, reject, relogio });
    game.socket.emit(CANAL, { tipo: 'pedido', id, op, dados, usuario: game.user.id });
  });
}

// No mestre: pergunta a um jogador e espera a resposta (null se ele não responder a tempo; aí a janela dele fecha).
// A promessa leva o id, para o mestre poder responder no lugar dele (forcarResposta).
export function perguntarAoJogador(usuarioId, op, dados = {}, espera = 120000) {
  const id = foundry.utils.randomID();
  const promessa = new Promise(resolve => {
    const relogio = setTimeout(() => {
      perguntas.delete(id);
      game.socket.emit(CANAL, { tipo: 'pergunta-expirou', id, para: usuarioId });
      resolve(null);
    }, espera);
    perguntas.set(id, { resolve, relogio, para: usuarioId });
    game.socket.emit(CANAL, { tipo: 'pergunta', id, para: usuarioId, op, dados });
  });
  promessa.id = id;
  return promessa;
}

// No mestre: responde no lugar do jogador e fecha a janela dele. false se a pergunta já tinha acabado.
export function forcarResposta(id, resposta) {
  const pendente = perguntas.get(id);
  if (!pendente) return false;
  perguntas.delete(id);
  clearTimeout(pendente.relogio);
  game.socket.emit(CANAL, { tipo: 'pergunta-expirou', id, para: pendente.para });
  pendente.resolve({ ...resposta, forcada: true });
  return true;
}

// Aviso para outros clientes (o próprio cliente não recebe o que emite: quem chama trata o seu lado).
export function avisar(evento, dados = {}, para = null) {
  game.socket.emit(CANAL, { tipo: 'aviso', evento, dados, para });
}
