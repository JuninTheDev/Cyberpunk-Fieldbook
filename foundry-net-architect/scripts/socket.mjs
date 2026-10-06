// Socket com a autoridade do mestre: o jogador pede, o mestre ativo resolve (rolagens, estado da arquitetura,
// efeito no token) e responde. Os pedidos são resolvidos um de cada vez, na ordem em que chegam.
// O estado vai para as flags do Tile, que o Foundry sincroniza com todos; o socket só leva pedidos e avisos.
import { MODULE_ID } from './constantes.mjs';

const CANAL = `module.${MODULE_ID}`;
// O mestre pode precisar responder (o DV de um vírus): espera até 90 s.
const ESPERA_MS = 90000;
const pendentes = new Map();
let tratadores = {};
let avisos = {};
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

export function iniciarSocket(handlers, eventos = {}) {
  tratadores = handlers;
  avisos = eventos;
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

// Aviso para outros clientes (o próprio cliente não recebe o que emite: quem chama trata o seu lado).
export function avisar(evento, dados = {}, para = null) {
  game.socket.emit(CANAL, { tipo: 'aviso', evento, dados, para });
}
