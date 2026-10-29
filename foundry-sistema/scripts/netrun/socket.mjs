// O socket da NET (o socket.mjs do NET Architect): o jogador pede, o mestre ativo resolve e responde. Os pedidos entram um
// de cada vez, na ordem em que chegam. O estado vai nas flags do Tile, que o Foundry sincroniza com todos; o socket só leva
// os pedidos. O canal é o do sistema (o mesmo do combate), com tipos próprios ("net-pedido", "net-resposta"): o "pedido"
// do combate vai do mestre para o jogador.
import { souOMestreAtivo } from '../combate.mjs';
import { SISTEMA } from '../config.mjs';

const CANAL = `system.${SISTEMA}`;
// O pedido pode esperar o próprio jogador rolar na janela de rolagem (as próximas partes do C8): até 6 minutos.
const ESPERA_MS = 360000;
const pendentes = new Map();
let tratadores = {};
let fila = Promise.resolve();

// O erro que vira aviso para quem pediu (sem a pilha no console).
export class ErroNet extends Error {}
export const erro = mensagem => new ErroNet(mensagem);

function naFila(tarefa) {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.catch(() => {});
  return resultado;
}

function executar(op, dados, usuario) {
  const tratador = tratadores[op];
  if (!tratador) throw erro(`Operação da NET desconhecida: ${op}.`);
  if (!usuario) throw erro('Usuário desconhecido.');
  return tratador(dados ?? {}, usuario);
}

export function iniciarSocketDaNet(operacoes) {
  tratadores = operacoes;
  game.socket.on(CANAL, async mensagem => {
    if (mensagem?.tipo === 'net-pedido') {
      if (!souOMestreAtivo()) return;
      let resposta;
      try {
        resposta = { ok: true, dados: await naFila(() => executar(mensagem.op, mensagem.dados, game.users.get(mensagem.usuario))) };
      } catch (falha) {
        if (!(falha instanceof ErroNet)) console.error(`${SISTEMA} | NET: ${mensagem.op}`, falha);
        resposta = { ok: false, erro: falha.message || String(falha) };
      }
      game.socket.emit(CANAL, { tipo: 'net-resposta', id: mensagem.id, usuario: mensagem.usuario, ...resposta });
    } else if (mensagem?.tipo === 'net-resposta' && mensagem.usuario === game.user.id) {
      const pendente = pendentes.get(mensagem.id);
      if (!pendente) return;
      pendentes.delete(mensagem.id);
      clearTimeout(pendente.relogio);
      if (mensagem.ok) pendente.resolve(mensagem.dados);
      else pendente.reject(erro(mensagem.erro));
    }
  });
}

// Pede ao mestre ativo; no próprio mestre, resolve aqui mesmo (na mesma fila).
export function pedir(op, dados = {}) {
  if (souOMestreAtivo()) return naFila(() => executar(op, dados, game.user));
  if (!game.users.activeGM) return Promise.reject(erro('Nenhum mestre na mesa: as ações na NET precisam do mestre para resolver.'));
  const id = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(() => {
      pendentes.delete(id);
      reject(erro('O mestre não respondeu a tempo. Tente de novo.'));
    }, ESPERA_MS);
    pendentes.set(id, { resolve, reject, relogio });
    game.socket.emit(CANAL, { tipo: 'net-pedido', id, op, dados, usuario: game.user.id });
  });
}
