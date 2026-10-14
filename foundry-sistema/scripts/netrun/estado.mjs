// O motor da NET (o estado.mjs do NET Architect da mesa), sempre no mestre ativo: conecta e desconecta os netrunners e
// grava no Tile o estado público da arquitetura (os andares que os jogadores enxergam, quem está onde, o registro). Andar,
// as habilidades, os inimigos e o combate vêm nas próximas partes do C8. No Tile só vai o que os jogadores podem ver; o
// resto fica no item da arquitetura.
import { ENTRADA, lerArquitetura } from '../arquitetura.mjs';
import { SISTEMA } from '../config.mjs';
import { acoesDeNet } from '../regras.mjs';
import { FLAG_CONEXAO, FLAG_ESTADO, FLAG_PONTO, STATUS_CONECTADO } from './constantes.mjs';
import { alcanceDo, distancia, faltasPara, netrunnerDo, vistaPublica } from './regras-da-net.mjs';
import { erro } from './socket.mjs';

const LOG_MAX = 60;

// ---------------- Leitura ----------------
export const pontoDoTile = tile => tile?.getFlag(SISTEMA, FLAG_PONTO) ?? null;
export const estadoDoTile = tile => tile?.getFlag(SISTEMA, FLAG_ESTADO) ?? null;
export const conexaoDoToken = token => token?.getFlag(SISTEMA, FLAG_CONEXAO) ?? null;

export async function arquiteturaDoPonto(ponto) {
  if (!ponto?.arquitetura) throw erro('Este ponto de acesso ainda não tem arquitetura: o mestre escolhe na configuração.');
  const item = await fromUuid(ponto.arquitetura);
  if (item?.type !== 'arquitetura') throw erro('A arquitetura deste ponto de acesso não foi encontrada (apagada do compêndio?).');
  return lerArquitetura({ nome: item.name, andares: item.system.andares, dv: Number(ponto.dv) || item.system.dv });
}

// As Ações NET contam em combate (as do Rank, por turno); fora de combate, não.
export const emCombate = token => game.combats.some(combate => combate.started && combate.combatants.some(item => item.tokenId === token.id && item.sceneId === token.parent.id));

// ---------------- Estado ----------------
const estadoNovo = (ponto, arq) => ({ v: 1, arquitetura: ponto.arquitetura, nome: arq.nome, dv: arq.dv, mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [], nos: [], log: [] });

function registrar(est, texto, tipo = 'info') {
  est.log = [...est.log, { t: Date.now(), texto, tipo }].slice(-LOG_MAX);
}

async function gravar(tile, arq, est) {
  est.nos = vistaPublica(arq, est);
  await tile.update({ [`flags.${SISTEMA}.${FLAG_ESTADO}`]: est });
  return est;
}

// Tudo o que um pedido precisa: o Tile, o token, o ponto, a arquitetura, o estado e o corredor (o netrunner na NET).
async function contexto(dados, usuario, { precisaCorredor = true } = {}) {
  const tile = await fromUuid(dados.tile);
  if (tile?.documentName !== 'Tile') throw erro('Ponto de acesso não encontrado.');
  const ponto = pontoDoTile(tile);
  if (!ponto?.ativo) throw erro('Este Tile não é um ponto de acesso à NET ativo.');
  const token = dados.token ? tile.parent.tokens.get(dados.token) : null;
  if (dados.token && !token) throw erro('O token não está nesta cena.');
  if (token && !usuario.isGM && !token.actor?.testUserPermission(usuario, 'OWNER')) throw erro('Você não controla este token.');
  const arq = await arquiteturaDoPonto(ponto);
  let est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est || est.arquitetura !== ponto.arquitetura) est = estadoNovo(ponto, arq);
  Object.assign(est, { dv: arq.dv, nome: arq.nome });
  const corredor = token ? est.corredores.find(item => item.token === token.id) : null;
  if (precisaCorredor && !corredor) throw erro('Este netrunner não está conectado a este ponto de acesso.');
  return { tile, token, ponto, arq, est, corredor, ator: token?.actor ?? null, usuario, havia: est.corredores.length, desmarcar: [] };
}

// Sem ninguém conectado, a arquitetura reinicia as defesas (RED p. 198): o Black ICE e os demônios de volta, as senhas e
// os nós trancados. Os arquivos copiados continuam.
function reiniciarDefesas(ctx) {
  const { est, arq } = ctx;
  est.ices = [];
  est.fora = [];
  est.feitos = est.feitos.filter(chave => Object.values(arq.nos).some(no => no.conteudos.some(conteudo => conteudo.chave === chave && conteudo.tipo === 'arquivo')));
  registrar(est, 'Ninguém na NET: a arquitetura reiniciou as defesas (o Black ICE e os demônios de volta, as senhas e os nós trancados).', 'info');
}

// Tira um corredor da NET.
function retirar(ctx, corredor, { inseguro = false, motivo = '' } = {}) {
  registrar(ctx.est, `${corredor.nome} desconectou${inseguro ? ' de forma insegura' : ''}${motivo ? ` (${motivo})` : ''}.`, inseguro ? 'falha' : 'info');
  ctx.est.corredores = ctx.est.corredores.filter(item => item.token !== corredor.token);
  ctx.desmarcar.push(corredor.token);
}

// O token conectado: a flag da conexão e o status "Conectado à NET" (que todos veem).
async function marcarToken(token, tile, ligado) {
  if (ligado) await token.setFlag(SISTEMA, FLAG_CONEXAO, { tile: tile.uuid, desde: Date.now() });
  else await token.unsetFlag(SISTEMA, FLAG_CONEXAO);
  await token.actor?.toggleStatusEffect(STATUS_CONECTADO, { active: ligado });
}

// Fecha a operação: o reinício das defesas (sem ninguém mais na NET), a gravação e os tokens que saíram.
async function concluir(ctx) {
  const { est, tile, arq, ponto } = ctx;
  if (ctx.havia > 0 && !est.corredores.length && ponto.reiniciar !== false) reiniciarDefesas(ctx);
  await gravar(tile, arq, est);
  for (const id of ctx.desmarcar) {
    const token = tile.parent.tokens.get(id);
    if (token) await marcarToken(token, tile, false);
  }
}

// O token apagado da cena sai da NET (no mestre ativo).
export async function removerCorredorApagado(tileUuid, tokenId) {
  const tile = await fromUuid(tileUuid);
  const est = foundry.utils.deepClone(estadoDoTile(tile));
  if (!est?.corredores.some(item => item.token === tokenId)) return;
  const ponto = pontoDoTile(tile);
  const arq = await arquiteturaDoPonto(ponto);
  const ctx = { tile, ponto, arq, est, havia: est.corredores.length, desmarcar: [] };
  retirar(ctx, est.corredores.find(item => item.token === tokenId), { motivo: 'o token saiu da cena' });
  ctx.desmarcar = [];
  await concluir(ctx);
}

// O Tile apagado com gente na NET: os tokens saem dela (a flag e o status), no mestre ativo.
export async function soltarTokens(tile) {
  for (const corredor of estadoDoTile(tile)?.corredores ?? []) {
    const token = tile.parent?.tokens.get(corredor.token);
    if (token) await marcarToken(token, tile, false);
  }
}

// ---------------- Operações (o que o socket chama, no mestre ativo) ----------------
export const operacoes = {
  async conectar(dados, usuario) {
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    const { tile, token, ponto, est, ator } = ctx;
    if (!token || !ator) throw erro('Escolha um token com ficha para conectar.');
    if (ctx.corredor) return { jaConectado: true };
    const outra = conexaoDoToken(token);
    if (outra && outra.tile !== tile.uuid) throw erro('Este netrunner já está conectado em outro ponto de acesso.');
    const faltas = faltasPara(ponto, ator);
    if (faltas.length && !usuario.isGM) throw erro(`Para conectar aqui falta ${faltas.join(' e ')}.`);
    const n = netrunnerDo(ator);
    const longe = distancia(tile, token);
    const alcance = alcanceDo(ponto, tile.parent, n);
    if (longe > alcance + 0.01 && !usuario.isGM) throw erro(`Longe demais do ponto de acesso: ${longe.toFixed(1)} ${tile.parent.grid.units || 'm'} (alcance ${alcance}).`);
    const dono = game.users.find(user => !user.isGM && user.active && ator.testUserPermission(user, 'OWNER'))
      ?? game.users.find(user => !user.isGM && ator.testUserPermission(user, 'OWNER')) ?? usuario;
    est.corredores = [...est.corredores, {
      token: token.id, ator: ator.id, nome: token.name, img: token.texture?.src || ator.img, usuario: dono.id, no: ENTRADA,
      acoes: emCombate(token) ? 1 : 0, max: acoesDeNet(n.rank), engajado: [], escapou: [], programasNaRodada: [], preso: 0
    }];
    registrar(est, `${token.name} conectou em ${ponto.nome || 'um ponto de acesso'}.`, 'info');
    await concluir(ctx);
    await marcarToken(token, tile, true);
    return { conectado: true };
  },

  async desconectar(dados, usuario) {
    const ctx = await contexto(dados, usuario);
    retirar(ctx, ctx.corredor, { inseguro: Boolean(dados.inseguro), motivo: dados.motivo || '' });
    await concluir(ctx);
    return { desconectado: true };
  },

  // O mestre volta a arquitetura ao começo (ninguém conectado): as defesas, o mapa e o registro.
  async reiniciar(dados, usuario) {
    if (!usuario.isGM) throw erro('Só o mestre reinicia a arquitetura.');
    const ctx = await contexto(dados, usuario, { precisaCorredor: false });
    if (ctx.est.corredores.length) throw erro('Tem netrunner conectado: desconecte antes de reiniciar.');
    const est = estadoNovo(ctx.ponto, ctx.arq);
    registrar(est, 'O mestre reiniciou a arquitetura.', 'info');
    await gravar(ctx.tile, ctx.arq, est);
    return { reiniciado: true };
  }
};
