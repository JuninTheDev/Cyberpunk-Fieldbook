// Socket com a autoridade do mestre: o jogador pede, o mestre ativo resolve (rolagens, estado da arquitetura,
// efeito no token) e responde. Os pedidos são resolvidos um de cada vez, na ordem em que chegam.
// O estado vai para as flags do Tile, que o Foundry sincroniza com todos; o socket só leva pedidos e avisos.
import { MODULE_ID } from './constantes.mjs';

const CANAL = `module.${MODULE_ID}`;
// O pedido pode esperar o mestre (o DV de um vírus) e o próprio jogador rolar na janela do sistema (até 5 min
// pela configuração): espera até 6 min.
const ESPERA_MS = 360000;
const pendentes = new Map();
let tratadores = {};
let avisos = {};
let respondedores = {};
const perguntas = new Map();
// No jogador: as perguntas abertas agora, para fechar a janela da que o mestre desistiu de esperar.
const respondendo = new Map();
let fila = Promise.resolve();

export const souMestreAtivo = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM === game.user);

// Erro com mensagem para o jogador (sem rastro de pilha no aviso).
export class ErroNet extends Error {}
export const erro = mensagem => new ErroNet(mensagem);

function naFila(tarefa) {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => {});
  return resultado;
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
        const dados = await naFila(() => executar(mensagem.op, mensagem.dados, usuario));
        resposta = { ok: true, dados };
      } catch (error) {
        if (!(error instanceof ErroNet)) console.error(`${MODULE_ID} | ${mensagem.op}`, error);
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
    // O mestre pergunta a este jogador (rolar a defesa, por exemplo) e espera a resposta.
    if (mensagem.tipo === 'pergunta' && mensagem.para === game.user.id) {
      const pergunta = { expirou: false, aoExpirar: null };
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

async function executar(op, dados, usuario) {
  const tratador = tratadores[op];
  if (!tratador) throw erro(`Operação desconhecida: ${op}.`);
  if (!usuario) throw erro('Usuário desconhecido.');
  return tratador(dados || {}, usuario);
}

// Pede ao mestre ativo. No próprio mestre, resolve aqui mesmo (na mesma fila).
export function pedir(op, dados = {}) {
  if (souMestreAtivo()) return naFila(() => executar(op, dados, game.user));
  if (!game.users.activeGM) return Promise.reject(erro('Nenhum mestre conectado: as ações na NET precisam do mestre para resolver as rolagens.'));
  const id = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(() => {
      pendentes.delete(id);
      reject(erro('O mestre não respondeu a tempo. Tente de novo.'));
    }, ESPERA_MS);
    pendentes.set(id, { resolve, reject, relogio });
    game.socket.emit(CANAL, { tipo: 'pedido', id, op, dados, usuario: game.user.id });
  });
}

// No mestre: pergunta a um jogador e espera a resposta (null se ele não responder a tempo; aí a janela dele fecha).
export function perguntarAoJogador(usuarioId, op, dados = {}, espera = 120000) {
  return new Promise(resolve => {
    const id = foundry.utils.randomID();
    const relogio = setTimeout(() => {
      perguntas.delete(id);
      game.socket.emit(CANAL, { tipo: 'pergunta-expirou', id, para: usuarioId });
      resolve(null);
    }, espera);
    perguntas.set(id, { resolve, relogio });
    game.socket.emit(CANAL, { tipo: 'pergunta', id, para: usuarioId, op, dados });
  });
}

// Aviso para outros clientes (o próprio cliente não recebe o que emite: quem chama trata o seu lado).
export function avisar(evento, dados = {}, para = null) {
  game.socket.emit(CANAL, { tipo: 'aviso', evento, dados, para });
}
