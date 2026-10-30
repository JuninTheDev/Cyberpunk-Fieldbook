// O combate desarmado (a wiki, "Briga e artes marciais", p. 176–178): todo mundo bate com as mãos, sem precisar de item.
// O soco (Briga) e o golpe das Artes Marciais (com pelo menos 1 ponto numa forma) usam as armas "Unarmed" e "Martial Arts"
// do catálogo, que trazem o resto da regra (o C10: o dano pelo BODY, o cyberbraço na Briga, a metade do SP e a CDT 2). Sem
// a arma na ficha, ela entra na primeira vez, guardada (os punhos não ocupam a mão), e o ataque sai pelo fluxo do combate,
// como o das outras armas (o fluxo pede a arma pelo uuid). O Painel Tático tem os dois ataques e o agarrão (o C51).
import { SISTEMA } from './config.mjs';
import { itemDoCatalogo } from './catalogo.mjs';
import { artesMarciaisLiberadas, danoDesarmado, FAMILIA_ARTES_MARCIAIS, FORMAS_DAS_ARTES_MARCIAIS } from './regras.mjs';
import { formasDe } from './artes-marciais.mjs';

export const DESARMADOS = {
  briga: { tipo: 'unarmed', catalogo: 'core_weapons:unarmed', nome: 'Briga' },
  artes: { tipo: 'martialArts', catalogo: 'core_weapons:martial-arts', nome: 'Artes Marciais' }
};

// A arma desarmada que já está na ficha (nas Artes Marciais, a da família toda, que ataca com a forma de mais pontos, antes
// da de uma forma).
function daFicha(ator, tipo) {
  const armas = ator.items.filter(item => item.type === 'arma' && item.system.tipo === tipo && !item.system.instaladoEm);
  return armas.find(arma => tipo !== 'martialArts' || arma.system.pericia === FAMILIA_ARTES_MARCIAIS) ?? armas[0] ?? null;
}

// A forma de Artes Marciais em que o ator tem mais pontos (pelo menos 1), ou null.
export function melhorForma(ator) {
  const formas = formasDe(ator).filter(f => f.forma && artesMarciaisLiberadas(f.nivel)).sort((a, b) => b.nivel - a.nivel);
  return formas[0] ? { ...formas[0], nome: FORMAS_DAS_ARTES_MARCIAIS[formas[0].forma] } : null;
}

// A arma do ataque desarmado (qual: 'briga' ou 'artes'): a da ficha ou, sem ela, a do catálogo, criada agora (só o dono
// cria). Dois cliques seguidos criam uma só.
const criando = new Map();
export async function armaDesarmada(ator, qual) {
  const d = DESARMADOS[qual];
  if (!d || !ator) return null;
  const existente = daFicha(ator, d.tipo);
  if (existente || !ator.isOwner) return existente;
  const chave = `${ator.uuid}|${qual}`;
  if (!criando.has(chave)) {
    const criar = async () => {
      const dados = await itemDoCatalogo(d.catalogo);
      if (!dados) return null;
      dados.system.equipada = false;
      foundry.utils.setProperty(dados, `flags.${SISTEMA}.desarmado`, true);
      const [criada] = await ator.createEmbeddedDocuments('Item', [dados]);
      return criada ?? null;
    };
    criando.set(chave, criar().finally(() => criando.delete(chave)));
  }
  return criando.get(chave);
}

// O ataque desarmado, com as opções do atacar da arma (perguntar, local, alvo). As Artes Marciais sem ponto numa forma
// avisam (o motivoSemAtaque da arma), sem criar nada.
export async function atacarDesarmado(ator, qual, opcoes = {}) {
  if (qual === 'artes' && !melhorForma(ator)) {
    ui.notifications.warn(`${ator.name}: as Artes Marciais pedem pelo menos 1 ponto numa forma (Aikido, Judô, Karatê ou Taekwondo).`);
    return null;
  }
  const arma = await armaDesarmada(ator, qual);
  if (!arma) { ui.notifications.warn(`${ator.name}: a arma "${DESARMADOS[qual]?.nome ?? qual}" não foi achada no catálogo.`); return null; }
  return arma.atacar(opcoes);
}
export async function rolarDanoDesarmado(ator, qual, opcoes = {}) {
  const arma = await armaDesarmada(ator, qual);
  return arma ? arma.rolarDano(opcoes) : null;
}

// O que o painel mostra de cada ataque: o dano (o da arma da ficha ou, sem ela, o da tabela do BODY) e, nas Artes
// Marciais, a forma (sem forma com pelo menos 1 ponto, artes é null).
export function desarmadoDe(ator) {
  const body = ator.system.atributos?.body?.valor ?? 0;
  const dano = tipo => daFicha(ator, tipo)?.danoDaArma ?? danoDesarmado({ body, tipo, cyberbraco: ator.temCyberbraco });
  const briga = { dano: dano('unarmed') };
  const forma = melhorForma(ator);
  if (!forma) return { briga, artes: null };
  // A arma de uma forma só ataca com ela (regras.formaDasArtesMarciais).
  const arma = daFicha(ator, 'martialArts');
  return { briga, artes: { dano: dano('martialArts'), forma: arma ? ator.system.pericia(arma.periciaDaArma)?.nome ?? forma.nome : forma.nome } };
}
