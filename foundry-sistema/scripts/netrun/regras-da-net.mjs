// As regras da NET na mesa sem nada do Foundry (os testes rodam este arquivo no Node): o netrunner do ator, o que falta
// para conectar, a distância do token ao ponto de acesso, o alcance (a wiki, "Netrunning": "Precisa estar a até 6 m de um
// ponto de acesso, sem parede no meio (8 m com o upgrade de alcance)"), o mapa que os jogadores enxergam da arquitetura,
// andar por ela e as habilidades de Interface contra os andares.
import { ehFundo, ENTRADA, filhosDe, revelarPathfinder, TIPOS_DE_ANDAR, vizinhos } from '../arquitetura.mjs';
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
export const iceDe = id => BLACK_ICE.find(ice => ice.id === id) ?? null;
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
        // O que o arquivo é (o Eye-Dee) e o que o nó controla (o Control), só depois de feitos.
        if (publico.feito && (conteudo.tipo === 'arquivo' || conteudo.tipo === 'controle')) Object.assign(publico, { nome: conteudo.nome, descricao: conteudo.descricao });
        return publico;
      })
    };
  });
}

// ---------------- Andar e as habilidades contra os andares ----------------
// A wiki ("Ações NET" e "Habilidades de Interface", RED p. 198–201): andar pela arquitetura não é Ação NET e vai até a
// próxima obstrução; as habilidades rolam Interface + 1d10 contra a DV, e passa quem tira mais que ela.
export const conteudosDoNo = (arq, id) => (id === ENTRADA || !arq.nos[id] ? [] : arq.nos[id].conteudos);

// O que há num andar, para o registro: "Senha DV 8, Hellhound".
function nomeDoConteudo(conteudo) {
  if (conteudo.tipo === 'ice') return iceDe(conteudo.ice)?.nome ?? 'Black ICE';
  if (conteudo.tipo === 'demonio') return conteudo.nome || demonioDe(conteudo.demonio).nome;
  if (conteudo.tipo === 'netrunner') return conteudo.nome || 'Netrunner inimigo';
  return `${TIPOS_DE_ANDAR[conteudo.tipo]}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}`;
}
export const resumoDoAndar = (arq, id) => conteudosDoNo(arq, id).map(nomeDoConteudo).join(', ') || 'vazio';

// Por que o netrunner não vai daqui para o destino (null: vai): só aos andares vizinhos; subir é livre; a senha que
// ainda não foi quebrada trava a descida (a obstrução da wiki). O Black ICE e o demônio que seguram vêm com os inimigos.
export function motivoParaNaoAndar(arq, est, corredor, destino) {
  if (!vizinhos(arq, corredor.no).includes(destino)) return 'Só dá para ir a um andar vizinho.';
  if (!filhosDe(arq, corredor.no).includes(destino)) return null;
  const senha = conteudosDoNo(arq, corredor.no).find(conteudo => conteudo.tipo === 'senha' && !est.feitos.includes(conteudo.chave));
  return senha ? `A senha deste andar${senha.dv ? ` (DV ${senha.dv})` : ''} trava a descida: use Backdoor.` : null;
}

// As habilidades de Interface que a janela da NET usa contra os andares, com o alvo de cada uma. O Zap e o Slide vêm com
// os inimigos; o Scanner é fora da NET.
export const HABILIDADES_NA_NET = { pathfinder: 'arquitetura', backdoor: 'senha', eyedee: 'arquivo', control: 'controle', cloak: 'arquitetura', virus: 'fundo' };
const SEM_ALVO = { senha: 'Não há senha trancada neste andar.', arquivo: 'Não há arquivo por identificar neste andar.', controle: 'Não há nó de controle livre neste andar.' };

// O alvo da habilidade aqui: a senha, o arquivo ou o nó de controle do andar que ainda não foi feito (o pedido, se houver),
// nenhum (o Pathfinder e o Cloak valem na arquitetura) ou o andar mais fundo (o Virus). Devolve { alvo } ou { erro }.
export function alvoDaHabilidade(arq, est, corredor, chave, pedido = '') {
  const tipo = HABILIDADES_NA_NET[chave];
  if (!tipo) return { erro: 'Esta habilidade não se usa contra os andares.' };
  if (tipo === 'arquitetura') return { alvo: null };
  if (tipo === 'fundo') return ehFundo(arq, corredor.no) ? { alvo: null } : { erro: 'O Virus só vai no andar mais fundo da arquitetura.' };
  const candidatos = conteudosDoNo(arq, corredor.no).filter(conteudo => conteudo.tipo === tipo && !est.feitos.includes(conteudo.chave));
  const alvo = candidatos.find(conteudo => conteudo.chave === pedido) ?? candidatos[0];
  return alvo ? { alvo } : { erro: SEM_ALVO[tipo] };
}

// As Ações NET (a wiki): em combate, as do Rank por turno; fora de combate, não contam. O mestre passa do limite. Gasta e
// devolve null, ou devolve o motivo de não poder.
export function gastarAcoes(corredor, { emCombate, mestre = false, quantas = 1 }) {
  if (!emCombate) return null;
  if (!mestre && corredor.acoes + quantas > corredor.max) return `Sem Ações NET neste turno (${corredor.acoes} de ${corredor.max}).`;
  corredor.acoes += quantas;
  return null;
}

// O resultado da habilidade (Interface + 1d10 > DV): o que muda no estado (os andares vistos, os conteúdos feitos, os
// rastros do Cloak) e a linha do registro ({ texto, tipo }). O Pathfinder revela até a obstrução com DV maior que o total;
// o resultado do Cloak vira a DV dos rastros; o Virus é contra a DV do mestre.
export function resolverHabilidade(arq, est, corredor, { chave, alvo = null, total, dvVirus = 0, texto = '' }) {
  const nome = corredor.nome;
  if (chave === 'pathfinder') {
    const revelados = revelarPathfinder(arq, corredor.no, total).filter(id => !est.vistos.includes(id));
    est.vistos = [...est.vistos, ...revelados];
    return revelados.length
      ? { texto: `Pathfinder (${total}): ${nome} revelou ${revelados.length} andar${revelados.length > 1 ? 'es' : ''}.`, tipo: 'ok' }
      : { texto: `Pathfinder (${total}): nada novo à vista.`, tipo: 'falha' };
  }
  if (chave === 'cloak') {
    corredor.rastro = total;
    return { texto: `Cloak (${total}): ${nome} escondeu os rastros (DV ${total} para achá-los).`, tipo: 'ok' };
  }
  if (chave === 'virus') {
    return total > dvVirus
      ? { texto: `Virus (${total} contra DV ${dvVirus}): ${nome} deixou o vírus “${texto}” (DV ${total} para tirá-lo).`, tipo: 'ok' }
      : { texto: `Virus (${total} contra DV ${dvVirus}): o vírus não pegou.`, tipo: 'falha' };
  }
  const dv = alvo.dv ?? 0;
  const contra = `${{ backdoor: 'Backdoor', eyedee: 'Eye-Dee', control: 'Control' }[chave]} (${total} contra DV ${dv})`;
  if (total <= dv) return { texto: `${contra}: ${nome} não passou ${{ backdoor: 'a senha', eyedee: 'o arquivo', control: 'o nó de controle' }[chave]}.`, tipo: 'falha' };
  est.feitos = [...est.feitos, alvo.chave];
  const oQue = chave === 'backdoor' ? '' : [alvo.nome, alvo.descricao].filter(Boolean).join(': ').replace(/[.!?…\s]+$/, '');
  return { texto: `${contra}: ${nome} ${{ backdoor: 'quebrou a senha', eyedee: 'identificou o arquivo', control: 'tomou o nó de controle' }[chave]}${oQue ? ` (${oQue})` : ''}.`, tipo: 'ok' };
}
