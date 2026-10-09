// Os outros módulos da mesa, sempre pela API pública deles e só quando estão ligados:
// - cpr-2077: a classe da arma (Power, Tech, Smart), os modos de 2077 (Ricochete, Carga, Rajada, Smart), o aviso do
//   Smart Link, o "esfriando" da carga Tech e a coronha retrátil. Os modos rolam pelo createRoll do sistema, que o
//   cpr-2077 troca; o painel só grava a mesma flag que a ficha grava.
// - Fluxo de Combate: os ataques do painel passam pelo cartão do sistema (CPRChat.RenderRollCard), que o Fluxo pega;
//   o painel mostra se o ataque vai entrar no fluxo (alvo marcado, mestre na mesa) e o status Suprimido.
// - NET Architect: o token conectado ganha o selo NET (ponto de acesso, Ações NET do turno), o botão que abre a janela
//   da NET e o de desconectar; fora da NET, o Scanner do módulo procura os pontos de acesso.
import { CPR_2077, FLUXO, FLUXO_SUPRIMIDO, NET, COMBAT_HUD } from './constantes.mjs';

const ligado = id => { const modulo = game.modules.get(id); return modulo && modulo.active ? modulo : null; };

// ---------------- cpr-2077 ----------------
export function armas2077() {
  const api = ligado(CPR_2077)?.api?.armas2077;
  return api && typeof api.paraHud === 'function' ? api : null;
}
export function info2077(actor, item) {
  const api = armas2077();
  if (!api) return null;
  try { return api.paraHud(actor, item); } catch (error) { console.warn('painel-tatico | cpr-2077', error); return null; }
}

// ---------------- Fluxo de Combate ----------------
export function fluxoLigado() {
  if (!ligado(FLUXO)) return false;
  try { return Boolean(game.settings.get(FLUXO, 'ativo')); } catch { return false; }
}
// O que o Fluxo vai fazer com o próximo ataque: resolver (com alvo e mestre), ou só o cartão do sistema.
export function situacaoDoFluxo(alvos = [...game.user.targets]) {
  if (!fluxoLigado()) return null;
  const api = ligado(FLUXO).api;
  if (api && typeof api.pronto === 'function' && api.pronto(alvos)) return { pronto: true, texto: 'O Fluxo de Combate pede a defesa do alvo.' };
  if (!game.users.activeGM) return { pronto: false, texto: 'Sem mestre na mesa: o ataque sai só com o cartão do sistema.' };
  return { pronto: false, texto: 'Sem alvo marcado: o Fluxo de Combate não pede a defesa (marque com T ou pelo botão de mira).' };
}
export const suprimido = actor => Boolean(ligado(FLUXO) && actor?.statuses?.has(FLUXO_SUPRIMIDO));

// ---------------- NET Architect ----------------
export const netLigado = () => Boolean(ligado(NET));
export const netApi = () => ligado(NET)?.api || null;

// O netrunner na NET: o ponto de acesso (Tile), o nome dele e as Ações NET do turno (só contam em combate).
export function naNet(token) {
  if (!netLigado() || !token || typeof token.getFlag !== 'function') return null;
  const conexao = token.getFlag(NET, 'conexao');
  if (!conexao || !conexao.tile) return null;
  let tile = null;
  try { tile = fromUuidSync(conexao.tile); } catch { tile = null; }
  const ponto = (tile && tile.getFlag(NET, 'pontoDeAcesso')) || {};
  const estado = (tile && tile.getFlag(NET, 'estado')) || {};
  const corredor = (estado.corredores || []).find(item => item.token === token.id) || null;
  const emCombate = Boolean(game.combats?.some(combate => combate.started && combate.combatants.some(c => c.tokenId === token.id)));
  return {
    tile,
    nome: ponto.nome || 'Ponto de acesso',
    acoes: corredor ? Number(corredor.acoes) || 0 : 0,
    max: corredor ? Number(corredor.max) || 0 : 0,
    contaAcoes: emCombate && Boolean(corredor && corredor.max)
  };
}

// ---------------- Combat HUD ----------------
export const combatHudLigado = () => Boolean(ligado(COMBAT_HUD));
