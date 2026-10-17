// As regras da NET na mesa sem nada do Foundry (os testes rodam este arquivo no Node): o netrunner do ator, o que falta
// para conectar, a distância do token ao ponto de acesso, o alcance (a wiki, "Netrunning": "Precisa estar a até 6 m de um
// ponto de acesso, sem parede no meio (8 m com o upgrade de alcance)"), o mapa que os jogadores enxergam da arquitetura,
// andar por ela e as habilidades de Interface contra os andares.
import { ehFundo, ENTRADA, filhosDe, revelarPathfinder, TIPOS_DE_ANDAR, vizinhos } from '../arquitetura.mjs';
import { SISTEMA } from '../config.mjs';
import { BLACK_ICE, DEMONIOS } from '../gerado.mjs';
import { rezAtual } from '../regras.mjs';
import { diarioDe } from './arquivos.mjs';

// O Range Upgrade (o hardware de cyberdeck do CORE, "8m/yds ... instead of 6m/yds"): 2 a mais no alcance do ponto.
export const RANGE_UPGRADE = 'core_upgrades:range-upgrade';
export const ALCANCE_DO_RANGE_UPGRADE = 2;
// O hardware do deck que a NET olha (pelo catálogo do CORE ou pelo nome): o Range Upgrade, o Insulated Wiring (a wiki: o
// deck não pega fogo por efeito de programa) e a KRASH Barrier (a wiki: imune a efeitos que forçam a desconexão).
const HARDWARE_DA_NET = {
  rangeUpgrade: [RANGE_UPGRADE, 'Range Upgrade'], isolado: ['core_upgrades:insulated-wiring', 'Insulated Wiring'], krash: ['core_upgrades:krash-barrier', 'KRASH Barrier']
};
const temHardware = (instalados, [catalogo, nome]) => instalados.some(item => item.type === 'upgrade' && (item.flags?.[SISTEMA]?.catalogo === catalogo || item.name === nome));

// O netrunner do ator (a ficha do sistema): a Interface (o Rank da Role de Netrunner), o cyberdeck equipado, os
// programas instalados nele e o hardware dele que a NET olha.
export function netrunnerDo(ator) {
  const deck = ator?.items.find(item => item.type === 'cyberdeck' && item.system.uso === 'equipado') ?? null;
  const instalados = deck ? ator.items.filter(item => item.system?.instaladoEm === deck.id) : [];
  return {
    deck, programas: instalados.filter(item => item.type === 'programa'), rank: Number(ator?.system?.rankDeInterface) || 0,
    ...Object.fromEntries(Object.entries(HARDWARE_DA_NET).map(([chave, hardware]) => [chave, temHardware(instalados, hardware)]))
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
export const rezMaxDe = conteudo => (conteudo.tipo === 'ice' ? iceDe(conteudo.ice)?.rez ?? 0 : conteudo.tipo === 'demonio' ? demonioDe(conteudo.demonio).rez : null);
export const rezDe = (est, conteudo) => est.ices.find(item => item.chave === conteudo.chave)?.rez ?? rezMaxDe(conteudo);

// ---------------- Os inimigos no andar ----------------
// O Black ICE e o demônio têm a REZ da tabela da wiki, menos o dano guardado no estado (est.ices); em 0, caem. O
// netrunner inimigo cai da NET quando o HP dele chega a 0 (est.fora).
const INIMIGOS = ['ice', 'demonio', 'netrunner'];
export const ehInimigo = conteudo => INIMIGOS.includes(conteudo.tipo);
export const inimigoAtivo = (est, conteudo) => (conteudo.tipo === 'netrunner' ? !(est.fora ?? []).includes(conteudo.chave) : rezDe(est, conteudo) > 0);
export const inimigosAtivos = (arq, est, id) => conteudosDoNo(arq, id).filter(conteudo => ehInimigo(conteudo) && inimigoAtivo(est, conteudo));
export function nomeDoInimigo(conteudo) {
  if (conteudo.tipo === 'ice') return iceDe(conteudo.ice)?.nome ?? 'Black ICE';
  if (conteudo.tipo === 'demonio') return conteudo.nome || demonioDe(conteudo.demonio).nome;
  return conteudo.nome || 'Netrunner inimigo';
}
// Quem segura a descida (o NET Architect; a wiki: andar vai "até a próxima obstrução"): o Black ICE ativo, menos o que o
// netrunner driblou com o Slide, e o demônio. O netrunner inimigo não segura.
export const quemSegura = (arq, est, corredor) => inimigosAtivos(arq, est, corredor.no)
  .filter(conteudo => conteudo.tipo === 'demonio' || (conteudo.tipo === 'ice' && !(corredor.escapou ?? []).includes(conteudo.chave)));
// A frase da chegada ao andar: quem segura a descida (o netrunner inimigo não segura; o encontro fala dele), ou null.
export function fraseDaChegada(arq, est, corredor) {
  const seguram = quemSegura(arq, est, corredor);
  if (!seguram.length) return null;
  const nomes = seguram.map(nomeDoInimigo).join(', ').replace(/, ([^,]*)$/, ' e $1');
  return `${nomes} ${seguram.length > 1 ? 'estão' : 'está'} neste andar: o Black ICE e o demônio seguram a descida até caírem.`;
}
// A REZ nova do inimigo (entre 0 e a da tabela), guardada no estado.
export function mudarRez(est, conteudo, rez) {
  const valor = Math.max(0, Math.min(rezMaxDe(conteudo), rez));
  est.ices = [...est.ices.filter(item => item.chave !== conteudo.chave), { chave: conteudo.chave, rez: valor }];
  return valor;
}
// O conteúdo da arquitetura pela chave ("2a.0"), com o andar dele.
export function acharConteudo(arq, chave) {
  for (const no of Object.values(arq.nos)) {
    const conteudo = no.conteudos.find(item => item.chave === chave);
    if (conteudo) return { no, conteudo };
  }
  return null;
}
// O que os jogadores sabem do inimigo que veem: os números da tabela da wiki e a REZ que sobra.
export function inimigoPublico(est, conteudo) {
  if (conteudo.tipo === 'ice') {
    const ice = iceDe(conteudo.ice);
    return { nome: nomeDoInimigo(conteudo), classe: ice?.classe ?? '', per: ice?.per ?? 0, spd: ice?.spd ?? 0, atk: ice?.atk ?? 0, def: ice?.def ?? 0, efeito: ice?.efeito ?? '', rez: rezMaxDe(conteudo), rezAtual: rezDe(est, conteudo) };
  }
  if (conteudo.tipo === 'demonio') {
    const { interface: valor, acoes, valorDeCombate } = demonioDe(conteudo.demonio);
    return { nome: nomeDoInimigo(conteudo), interface: valor, acoes, valorDeCombate, rez: rezMaxDe(conteudo), rezAtual: rezDe(est, conteudo) };
  }
  return { nome: nomeDoInimigo(conteudo), ativo: inimigoAtivo(est, conteudo) };
}

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
        // O inimigo derrubado (a REZ em 0, o netrunner fora da NET) fica "feito".
        if (ehInimigo(conteudo)) Object.assign(publico, { inimigo: inimigoPublico(est, conteudo), feito: !inimigoAtivo(est, conteudo) });
        // O que o arquivo é (o Eye-Dee) e o que o nó controla (o Control), só depois de feitos.
        if (publico.feito && (conteudo.tipo === 'arquivo' || conteudo.tipo === 'controle')) Object.assign(publico, { nome: conteudo.nome, descricao: conteudo.descricao });
        // O diário do arquivo copiado (arquivos.mjs): a janela mostra "Abrir o arquivo" a quem pode abri-lo.
        if (publico.feito && conteudo.tipo === 'arquivo') publico.diario = diarioDe(est, conteudo.chave);
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
const nomeDoConteudo = conteudo => (ehInimigo(conteudo) ? nomeDoInimigo(conteudo) : `${TIPOS_DE_ANDAR[conteudo.tipo]}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}`);
export const resumoDoAndar = (arq, id) => conteudosDoNo(arq, id).map(nomeDoConteudo).join(', ') || 'vazio';

// Por que o netrunner não vai daqui para o destino (null: vai): só aos andares vizinhos; subir é livre; descer, até a
// obstrução (a wiki): a senha que ainda não foi quebrada e o Black ICE ou o demônio que seguram.
export function motivoParaNaoAndar(arq, est, corredor, destino) {
  if (!vizinhos(arq, corredor.no).includes(destino)) return 'Só dá para ir a um andar vizinho.';
  if (!filhosDe(arq, corredor.no).includes(destino)) return null;
  if (corredor.preso > 0) return 'O Kraken te prende: até o fim do seu próximo turno, não dá para avançar.';
  const senha = conteudosDoNo(arq, corredor.no).find(conteudo => conteudo.tipo === 'senha' && !est.feitos.includes(conteudo.chave));
  if (senha) return `A senha deste andar${senha.dv ? ` (DV ${senha.dv})` : ''} trava a descida: use Backdoor.`;
  const preso = quemSegura(arq, est, corredor)[0];
  if (!preso) return null;
  return preso.tipo === 'demonio'
    ? `O demônio ${nomeDoInimigo(preso)} te segura: derrube a REZ dele (o Slide não funciona contra demônios).`
    : `O ${nomeDoInimigo(preso)} deste andar te segura: derrube a REZ dele ou use o Slide.`;
}

// As habilidades de Interface que a janela da NET usa, com o alvo de cada uma: contra os andares e contra os inimigos (o
// Zap, em qualquer um; o Slide, só no Black ICE). O Scanner é fora da NET.
export const HABILIDADES_NA_NET = { pathfinder: 'arquitetura', backdoor: 'senha', eyedee: 'arquivo', control: 'controle', cloak: 'arquitetura', virus: 'fundo', zap: 'inimigo', slide: 'ice' };
const SEM_ALVO = {
  senha: 'Não há senha trancada neste andar.', arquivo: 'Não há arquivo por identificar neste andar.', controle: 'Não há nó de controle livre neste andar.',
  inimigo: 'Não há inimigo ativo neste andar.', ice: 'Não há Black ICE ativo neste andar (o Slide não funciona contra demônios nem netrunners).'
};

// O alvo da habilidade aqui (o pedido, se houver): a senha, o arquivo ou o nó de controle do andar que ainda não foi feito;
// o inimigo ativo (o Zap) ou o Black ICE ativo (o Slide); nenhum (o Pathfinder e o Cloak valem na arquitetura) ou o andar
// mais fundo (o Virus). Devolve { alvo } ou { erro }.
export function alvoDaHabilidade(arq, est, corredor, chave, pedido = '') {
  const tipo = HABILIDADES_NA_NET[chave];
  if (!tipo) return { erro: 'Esta habilidade não se usa na NET.' };
  if (tipo === 'arquitetura') return { alvo: null };
  if (tipo === 'fundo') return ehFundo(arq, corredor.no) ? { alvo: null } : { erro: 'O Virus só vai no andar mais fundo da arquitetura.' };
  const candidatos = tipo === 'inimigo' || tipo === 'ice'
    ? inimigosAtivos(arq, est, corredor.no).filter(conteudo => tipo === 'inimigo' || conteudo.tipo === 'ice')
    : conteudosDoNo(arq, corredor.no).filter(conteudo => conteudo.tipo === tipo && !est.feitos.includes(conteudo.chave));
  const alvo = candidatos.find(conteudo => conteudo.chave === pedido) ?? candidatos[0];
  return alvo ? { alvo } : { erro: SEM_ALVO[tipo] };
}

// O Slide é uma vez por turno (a wiki: "1 Ação NET (1×/turno)"); fora de combate, não há turno.
export const motivoParaNaoSlide = (corredor, emCombate) => (emCombate && corredor.slides > 0 ? 'O Slide é uma vez por turno.' : null);

// O golpe do netrunner num inimigo, o Zap ou o programa de ataque (a wiki: contra a DEF + 1d10 do Black ICE, a Interface
// + 1d10 do demônio ou do netrunner; o empate é da defesa). Acertando, o dano sai da REZ do Black ICE ou do demônio (em 0,
// ele cai); no netrunner inimigo, o motor põe o dano no cérebro dele. Devolve a linha do registro e se acertou.
function resolverGolpe(est, corredor, alvo, { rotulo, ataque, defesa, dano }) {
  const contra = `${rotulo} (${ataque} contra ${defesa})`;
  const nome = nomeDoInimigo(alvo);
  if (ataque <= defesa) return { texto: `${contra}: ${corredor.nome} errou ${alvo.tipo === 'netrunner' ? nome : `o ${nome}`}.`, tipo: 'falha', acertou: false };
  if (alvo.tipo === 'netrunner') return { texto: `${contra}: ${corredor.nome} acertou ${nome}: ${dano} no cérebro.`, tipo: 'ok', acertou: true };
  const rez = mudarRez(est, alvo, rezDe(est, alvo) - dano);
  return { texto: `${contra}: ${corredor.nome} acertou o ${nome}: ${dano} de REZ, ${rez ? `fica com ${rez}` : 'e ele caiu'}.`, tipo: 'ok', acertou: true };
}
// O Zap: o 1d6 (a wiki).
export const resolverZap = (est, corredor, alvo, { total, defesa, dano = 0 }) => resolverGolpe(est, corredor, alvo, { rotulo: 'Zap', ataque: total, defesa, dano });

// O Slide (a wiki: contra a PER + 1d10 do Black ICE; o empate é do ICE): passando, aquele Black ICE não segura mais o
// netrunner, que pode seguir para um andar vizinho (a senha ainda trava).
export function resolverSlide(corredor, alvo, { total, per }) {
  const nome = nomeDoInimigo(alvo);
  if (total <= per) return { texto: `Slide (${total} contra ${per}): o ${nome} não larga ${corredor.nome}.`, tipo: 'falha' };
  corredor.escapou = [...new Set([...(corredor.escapou ?? []), alvo.chave])];
  return { texto: `Slide (${total} contra ${per}): ${corredor.nome} escapou do ${nome} e pode seguir para um andar vizinho.`, tipo: 'ok' };
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

// ---------------- Os ataques dos inimigos e os efeitos (a wiki, "Black ICE", RED p. 204–207) ----------------
// A velocidade no encontro: a Interface + a velocidade + 1d10 do netrunner contra a SPD + 1d10 do Black ICE. A wiki: "Se o
// ICE vencer, você sofre o efeito na hora"; o empate não é vitória (ver as dúvidas).
export function resolverVelocidade(corredor, ice, { meu, dele }) {
  const nome = nomeDoInimigo(ice);
  return dele > meu
    ? { iceVence: true, texto: `Velocidade (${meu} contra ${dele}): o ${nome} foi mais rápido e age na hora.`, tipo: 'falha' }
    : { iceVence: false, texto: `Velocidade (${meu} contra ${dele}): ${corredor.nome} viu o ${nome} a tempo.`, tipo: 'ok' };
}

// O ataque do inimigo na vez dele (a wiki): o Black ICE com o ATK + 1d10; o demônio e o netrunner inimigo com o Zap
// (Interface + 1d10); contra a Interface + 1d10 do netrunner. O empate é da defesa.
export function resolverAtaque(corredor, inimigo, { ataque, defesa }) {
  const nome = nomeDoInimigo(inimigo);
  const quem = `${inimigo.tipo === 'netrunner' ? nome : `O ${nome}`} ${inimigo.tipo === 'ice' ? 'ataca' : 'usa o Zap'} (${ataque} contra ${defesa})`;
  return ataque > defesa
    ? { acertou: true, texto: `${quem} e acerta ${corredor.nome}.`, tipo: 'falha' }
    : { acertou: false, texto: `${quem}, e ${corredor.nome} se defende.`, tipo: 'ok' };
}

// Quem pode atacar o netrunner na vez dele: os inimigos ativos no andar, menos o Black ICE que ele driblou com o Slide (a
// wiki: o Black ICE ataca "até ser desativado ou driblado com Slide").
export const inimigosQueAtacam = (arq, est, corredor) => inimigosAtivos(arq, est, corredor.no)
  .filter(conteudo => conteudo.tipo !== 'ice' || !(corredor.escapou ?? []).includes(conteudo.chave));
// Quem o inimigo ataca na vez dele no combate: os netrunners que ele pode atacar no andar dele.
export const alvosDoInimigo = (arq, est, chave) => est.corredores.filter(corredor => inimigosQueAtacam(arq, est, corredor).some(conteudo => conteudo.chave === chave));

// O efeito de cada Black ICE (a tabela da wiki): o dano no cérebro (a fórmula da tabela), no REZ de um programa ativo (os
// anti-programa; se desativar, destrói), o programa destruído (o Asp), o defensor desativado (o Raven, antes do dano), a
// penalidade de 1 hora (o Liche e o Scorpion, −1d6), o fogo (o Hellhound), a prisão (o Kraken), a Ação NET a menos (o
// Wisp), o −2 no Slide (o Skunk) e a desconexão insegura (o Giant). O Black ICE de fora da tabela: o dano no cérebro.
export const EFEITOS_DO_ICE = {
  asp: { destroiPrograma: true }, giant: { cerebro: true, derruba: true }, hellhound: { cerebro: true, fogo: true }, kraken: { cerebro: true, prende: true },
  liche: { penalidade: ['int', 'ref', 'dex'] }, raven: { desativaDefensor: true, cerebro: true }, scorpion: { penalidade: ['move'] }, skunk: { skunk: true },
  wisp: { cerebro: true, menosAcoes: true }, dragon: { programa: true }, killer: { programa: true }, sabertooth: { programa: true }
};
export const efeitoDoIce = id => EFEITOS_DO_ICE[id] ?? { cerebro: true };
// A prisão do Kraken: "até o fim do próximo turno" (o começo do turno conta 1 e libera no seguinte).
export const PRISAO_DO_KRAKEN = 2;

// O desconectar seguro com o Kraken: só a desconexão insegura.
export const motivoParaNaoDesconectar = corredor => (corredor.preso > 0 ? 'O Kraken te prende: até o fim do seu próximo turno, só a desconexão insegura.' : null);

// O Skunk: −2 no Slide por Skunk ativo que acertou o netrunner (acumula; até ser desativado).
export const penalidadeDoSkunk = (arq, est, corredor) => -2 * (corredor.skunks ?? []).filter(chave => {
  const achado = acharConteudo(arq, chave);
  return achado && inimigoAtivo(est, achado.conteudo);
}).length;

// A desconexão insegura (a wiki: "sofre o efeito de todo Black ICE encontrado e ainda ativo"): o Black ICE que o netrunner
// encontrou neste andar e ainda está ativo, até o driblado com o Slide; menos o que causou a queda (o Giant).
export const iceDaQueda = (arq, est, corredor, exceto = null) => (corredor.engajado ?? [])
  .map(chave => acharConteudo(arq, chave)?.conteudo)
  .filter(conteudo => conteudo?.tipo === 'ice' && conteudo.chave !== exceto && inimigoAtivo(est, conteudo));

// O começo do turno do netrunner: as Ações NET voltam (com o Wisp, 1 a menos, mas a wiki dá no mínimo 2 livres), a prisão
// do Kraken anda e o Slide do turno volta. Devolve as Ações NET já gastas no começo.
export function comecoDoTurno(corredor) {
  const acoes = corredor.menosAcoes ? Math.min(corredor.menosAcoes, Math.max(0, corredor.max - 2)) : 0;
  Object.assign(corredor, { acoes, menosAcoes: 0, preso: Math.max(0, (corredor.preso ?? 0) - 1), slides: 0, programasNaRodada: [] });
  return acoes;
}

// ---------------- Quem rola (o rolagens.mjs do NET Architect) ----------------
// A rolagem do netrunner, com a configuração "O jogador rola as rolagens da NET" ligada: o jogador que pediu a ação; numa
// reação (a velocidade contra o Black ICE, a defesa), o dono conectado, mesmo quando quem pediu foi o mestre. null: o
// mestre rola.
export function quemRolaNaNet({ ligado, pediu, reacao, dono }) {
  if (!ligado) return null;
  if (pediu && !pediu.isGM) return pediu;
  return reacao && dono?.active && !dono.isGM ? dono : null;
}

// A resposta do jogador: o total; na ação, a janela cancelada desfaz a ação (o erro); sem resposta no prazo, ou com a
// janela da reação fechada, o mestre rola (a linha do registro).
export function respostaDoJogador(resposta, { reacao, jogador, netrunner }) {
  if (Number.isFinite(resposta?.total)) return { total: resposta.total };
  if (resposta?.cancelado && !reacao) return { erro: 'Rolagem cancelada: nada aconteceu.' };
  return { registro: `${jogador} ${resposta?.cancelado ? 'fechou a janela' : 'não rolou a tempo'}: o mestre rolou por ${netrunner}.` };
}

// ---------------- O deck na janela (a wiki, "Ações NET", "Programas: ataque" e "Combate na NET") ----------------
// Ativar ou desativar um programa: 1 Ação NET; em combate, cada programa uma vez por rodada. O programa com REZ que está em
// 0 não ativa (o mestre restaura a REZ na ficha). Devolve o motivo de não poder, ou null.
export function motivoParaNaoMudarPrograma(programa, corredor, { emCombate, ativar }) {
  if (emCombate && (corredor.programasNaRodada ?? []).includes(programa.id)) return 'Cada programa só pode ser ativado ou desativado uma vez por rodada.';
  if (ativar && programa.system.rez > 0 && rezAtual(programa.system.rez, programa.system.rezPerdida) === 0) return `${programa.name} está com a REZ em 0.`;
  return null;
}

// O alvo do programa de ataque no andar (a wiki: "Programa anti-pessoal só afeta netrunners; anti-programa só afeta
// programas"): o anti-pessoal, o netrunner inimigo; o anti-programa, o Black ICE e o demônio. O pedido de outra classe é
// recusado. Devolve { alvo } ou { erro }.
export function alvoDoPrograma(arq, est, corredor, programa, pedido = '') {
  const antipessoal = programa.system.classe === 'antipersonnelattacker';
  const ativos = inimigosAtivos(arq, est, corredor.no);
  const candidatos = ativos.filter(conteudo => (conteudo.tipo === 'netrunner') === antipessoal);
  if (pedido && ativos.some(conteudo => conteudo.chave === pedido) && !candidatos.some(conteudo => conteudo.chave === pedido)) {
    return { erro: antipessoal ? `${programa.name} é anti-pessoal: só afeta netrunners.` : `${programa.name} é anti-programa: só afeta o Black ICE e os demônios.` };
  }
  const alvo = candidatos.find(conteudo => conteudo.chave === pedido) ?? candidatos[0];
  return alvo ? { alvo } : { erro: antipessoal ? 'Não há netrunner inimigo ativo neste andar.' : 'Não há Black ICE nem demônio ativo neste andar.' };
}

// O ataque do programa: Interface + ATK + 1d10 contra a defesa do inimigo; acertando, o dano do programa.
export const resolverAtaqueDePrograma = (est, corredor, programa, alvo, { ataque, defesa, dano = 0 }) => resolverGolpe(est, corredor, alvo, { rotulo: programa.name, ataque, defesa, dano });
