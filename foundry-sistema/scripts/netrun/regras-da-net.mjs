// As regras da NET na mesa sem nada do Foundry (os testes rodam este arquivo no Node): o netrunner do ator, o que falta
// para conectar, a distância do token ao ponto de acesso, o alcance (a wiki, "Netrunning": "Precisa estar a até 6 m de um
// ponto de acesso, sem parede no meio (8 m com o upgrade de alcance)") e o mapa que os jogadores enxergam da arquitetura.
import { ENTRADA, vizinhos } from '../arquitetura.mjs';
import { SISTEMA } from '../config.mjs';
import { BLACK_ICE, DEMONIOS } from '../gerado.mjs';

// O Range Upgrade (o hardware de cyberdeck do CORE, "8m/yds ... instead of 6m/yds"): 2 a mais no alcance do ponto.
export const RANGE_UPGRADE = 'core_upgrades:range-upgrade';
export const ALCANCE_DO_RANGE_UPGRADE = 2;
const ehRangeUpgrade = item => item.type === 'upgrade' && (item.flags?.[SISTEMA]?.catalogo === RANGE_UPGRADE || item.name === 'Range Upgrade');

// O netrunner do ator (a ficha do sistema): a Interface (o Rank da Role de Netrunner), o cyberdeck equipado, os
// programas instalados nele e se ele tem o Range Upgrade.
export function netrunnerDo(ator) {
  const deck = ator?.items.find(item => item.type === 'cyberdeck' && item.system.uso === 'equipado') ?? null;
  const instalados = deck ? ator.items.filter(item => item.system?.instaladoEm === deck.id) : [];
  return {
    deck, programas: instalados.filter(item => item.type === 'programa'), rank: Number(ator?.system?.rankDeInterface) || 0,
    rangeUpgrade: instalados.some(ehRangeUpgrade)
  };
}

// O que falta para conectar aqui: o cyberdeck equipado e a Interface mínima do ponto.
export function faltasPara(ponto, ator) {
  const n = netrunnerDo(ator);
  const faltas = [];
  if (ponto.exigeDeck !== false && !n.deck) faltas.push('um cyberdeck equipado');
  const minimo = Number(ponto.rankMinimo) || 0;
  if (minimo > 0 && n.rank < minimo) faltas.push(`Interface ${minimo} (tem ${n.rank})`);
  return faltas;
}

// A distância (nas unidades da cena) do centro do token ao ponto mais próximo do Tile. Do token do Foundry vale o
// _source: no Foundry 14, enquanto o token anda (e no gancho do movimento), o token.x ainda é o de antes, e o _source já
// é o destino.
export function distancia(tile, token) {
  const cena = tile.parent;
  const tamanho = cena.grid.size;
  const { x, y, width, height } = token._source ?? token;
  const centro = { x: x + (width * tamanho) / 2, y: y + (height * tamanho) / 2 };
  const perto = { x: Math.min(Math.max(centro.x, tile.x), tile.x + tile.width), y: Math.min(Math.max(centro.y, tile.y), tile.y + tile.height) };
  return (Math.hypot(centro.x - perto.x, centro.y - perto.y) / tamanho) * cena.grid.distance;
}

// O alcance do ponto (o da configuração; vazio ou 0, um quadrado da cena), com o Range Upgrade do deck do netrunner.
export const alcanceDo = (ponto, cena, netrunner = null) =>
  (Number(ponto.alcance) > 0 ? Number(ponto.alcance) : cena.grid.distance) + (netrunner?.rangeUpgrade ? ALCANCE_DO_RANGE_UPGRADE : 0);

// ---------------- O mapa que os jogadores enxergam ----------------
const iceDe = id => BLACK_ICE.find(ice => ice.id === id) ?? null;
export const demonioDe = id => DEMONIOS.find(demonio => demonio.id === id) ?? DEMONIOS[0];
const rezMaxDe = conteudo => (conteudo.tipo === 'ice' ? iceDe(conteudo.ice)?.rez ?? 0 : conteudo.tipo === 'demonio' ? demonioDe(conteudo.demonio).rez : null);
const rezDe = (est, conteudo) => est.ices.find(item => item.chave === conteudo.chave)?.rez ?? rezMaxDe(conteudo);

// Os andares vistos (com o conteúdo; com est.mapa, todos) e os vizinhos de quem está na NET, sem o conteúdo ("?"). O
// estado (est) é o do Tile: vistos, feitos (as chaves dos conteúdos abertos), ices (a REZ que sobrou) e corredores.
export function vistaPublica(arq, est) {
  const vistos = new Set(est.vistos);
  if (est.mapa) for (const id of Object.keys(arq.nos)) vistos.add(id);
  const feitos = new Set(est.feitos);
  const desconhecidos = new Set();
  for (const corredor of est.corredores) for (const id of vizinhos(arq, corredor.no)) if (id !== ENTRADA && !vistos.has(id)) desconhecidos.add(id);
  return [...vistos, ...desconhecidos].filter(id => arq.nos[id]).map(id => {
    const no = arq.nos[id];
    if (!vistos.has(id)) return { id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: false };
    return {
      id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: true,
      conteudos: no.conteudos.map(conteudo => {
        const publico = { chave: conteudo.chave, tipo: conteudo.tipo, dv: conteudo.dv, feito: feitos.has(conteudo.chave) };
        if (conteudo.tipo === 'ice') publico.inimigo = { nome: iceDe(conteudo.ice)?.nome ?? 'Black ICE', rez: rezMaxDe(conteudo), rezAtual: rezDe(est, conteudo) };
        if (conteudo.tipo === 'demonio') publico.inimigo = { nome: conteudo.nome || demonioDe(conteudo.demonio).nome, rez: rezMaxDe(conteudo), rezAtual: rezDe(est, conteudo) };
        if (conteudo.tipo === 'netrunner') publico.inimigo = { nome: conteudo.nome || 'Netrunner inimigo' };
        return publico;
      })
    };
  });
}
