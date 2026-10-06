// Regras de ataque e defesa do RED (p. 170–187), como a wiki da mesa resume (system-rules.js).
// Sem Foundry: o teste roda estas funções no Node.
//
// - Tiro: o ataque precisa passar da DV do alcance. Quem tem REF 8+ pode esquivar: DEX + Evasão + 1d10 vira a DV.
// - Corpo a corpo: sempre disputa contra DEX + Evasão + 1d10, para qualquer um.
// - Empate: o defensor vence. Para sair da área de um explosivo, a esquiva tem de passar do ataque.
// - Autofogo: 2d6 × quanto o ataque passou da DV (ou da esquiva), até o máximo da arma.
// - Espingarda com cartucho: um ataque contra DV 13; se acertar, 3d6 em todos à frente, até 6 m.
// - Explosivo: dano em todos numa área de 10 × 10 m em volta do alvo.
// - Fogo supressivo: quem está até 25 m rola WILL + Concentração + 1d10 contra o ataque; quem perder é suprimido.
// - Escudo: recebe o ataque todo, mas quem usa não esquiva.

export const MODOS = {
  corpo: 'Corpo a corpo',
  tiro: 'Tiro',
  autofogo: 'Autofogo',
  supressivo: 'Fogo supressivo',
  cartucho: 'Espingarda com cartucho',
  explosivo: 'Explosivo'
};
export const LOCAIS = { body: 'corpo', head: 'cabeça', leg: 'perna', heldItem: 'item na mão', brain: 'cérebro' };
export const DV_CARTUCHO = 13;
export const ALCANCE_CARTUCHO = 6;
export const RAIO_SUPRESSAO = 25;
export const AREA_EXPLOSIVO = 10;
export const MEDIA_D10 = 5.5;

// O modo do ataque pela rolagem do sistema, pela arma e pela munição carregada.
export function classificar({ rolagem = 'attack', aDistancia = false, tipoDeArma = '', municao = '' }) {
  if (rolagem === 'suppressive') return 'supressivo';
  if (!aDistancia) return 'corpo';
  if (['grenade', 'rocket'].includes(municao) || ['grenadeLauncher', 'rocketLauncher'].includes(tipoDeArma)) return 'explosivo';
  if (municao === 'shotgunShell') return 'cartucho';
  if (rolagem === 'autofire') return 'autofogo';
  return 'tiro';
}

// Quem pode esquivar: no corpo a corpo, todos; de tiros, só com REF 8+ (se a mesa exigir). Sem perna, ninguém.
export function podeEsquivar({ modo, ref = 0, exigeRef8 = true, semPerna = false }) {
  if (semPerna || modo === 'supressivo') return false;
  if (modo === 'corpo') return true;
  return !exigeRef8 || Number(ref) >= 8;
}

// As escolhas do alvo. Uma só = não há o que perguntar (só rolar, se for esquiva ou Concentração).
export function opcoesDeDefesa({ modo, esquiva, escudo = false }) {
  if (modo === 'supressivo') return ['concentrar'];
  const lista = [];
  if (esquiva) lista.push('esquivar');
  if (modo !== 'corpo' || !esquiva) lista.push('aguentar');
  if (escudo) lista.push('escudo');
  return lista;
}

// Na falta de resposta: no corpo a corpo e no fogo supressivo rola-se assim mesmo; nos outros, aguenta.
export function escolhaPadrao(opcoes) {
  if (opcoes.includes('concentrar')) return 'concentrar';
  if (opcoes.length === 1) return opcoes[0];
  return opcoes.includes('aguentar') ? 'aguentar' : opcoes[0];
}

// O ataque pegou? true / false; null quando falta a DV (o mestre decide).
// Na Concentração, true quer dizer que o alvo perdeu (foi suprimido).
export function acertou({ modo, escolha, ataque, defesa = null, dv = null }) {
  if (escolha === 'concentrar') return ataque > defesa;
  if (escolha === 'esquivar') return modo === 'explosivo' ? !(defesa > ataque) : ataque > defesa;
  // Aguentar ou escudo: no corpo a corpo, sem esquiva, o golpe pega; na área (explosivo, cartucho) a DV já passou.
  if (['corpo', 'explosivo', 'cartucho'].includes(modo)) return true;
  if (dv === null || dv === undefined) return null;
  return ataque > dv;
}

// Multiplicador do autofogo: quanto o ataque passou da defesa (no mínimo 1). O sistema limita ao máximo da arma.
export const multiplicadorDeAutofogo = (ataque, defesa) => Math.max(1, Number(ataque) - Number(defesa));

// DV pela distância numa tabela do sistema: faixas [[mín, máx], "DV"] em metros; "N/A" ou além da última faixa é
// fora do alcance.
export function dvPelaDistancia(faixas, distancia) {
  const metros = Math.round(Number(distancia) || 0);
  const faixa = (faixas || []).find(([[min, max]]) => metros >= min && metros <= max);
  if (!faixa) return { dv: null, fora: true };
  const dv = parseInt(faixa[1], 10);
  return Number.isFinite(dv) ? { dv, fora: false } : { dv: null, fora: true };
}

// Tabelas candidatas: o autofogo usa a tabela "(Autofire)" da arma; sem ela, a da SMG (como as pistolas de 2077).
export function tabelasCandidatas(tabela, modo) {
  if (!tabela) return [];
  if (modo !== 'autofogo') return [tabela];
  if (/\(Autofire\)/.test(tabela)) return [tabela];
  return [`${tabela} (Autofire)`, 'DV SMG (Autofire)', tabela];
}

// O mestre deixou o NPC no automático: esquiva quando a esquiva média passa da DV (e sempre no corpo a corpo e na
// área, onde aguentar é levar o dano); senão, o escudo; senão, aguenta.
export function escolhaAutomatica({ opcoes, modo, dv = null, mediaEsquiva = 0 }) {
  if (opcoes.length === 1) return opcoes[0];
  if (opcoes.includes('esquivar') && (['corpo', 'explosivo', 'cartucho'].includes(modo) || dv === null || mediaEsquiva > dv)) return 'esquivar';
  if (opcoes.includes('escudo')) return 'escudo';
  return opcoes.includes('aguentar') ? 'aguentar' : opcoes[0];
}

// O sistema só distingue cabeça, cérebro e corpo na armadura; perna e item na mão contam como corpo.
export const localDoDano = local => (local === 'head' || local === 'brain' ? local : 'body');

// Centro do token dentro do quadrado de lado 2 × metade (em pixels)?
export const dentroDaArea = (centro, ponto, metade) => Math.abs(ponto.x - centro.x) <= metade + 0.5 && Math.abs(ponto.y - centro.y) <= metade + 0.5;

const numero = valor => String(Math.round(valor * 10) / 10).replace('.', ',');
export const formatarMedia = numero;

// Descrição curta do ataque: "Tiro mirado na cabeça", "Autofogo", "Corpo a corpo"…
export function descreverAtaque({ modo, mirado = false, local = 'body' }) {
  const base = MODOS[modo] || 'Ataque';
  if (!mirado) return base;
  return `${modo === 'corpo' ? 'Golpe' : 'Tiro'} mirado ${local === 'heldItem' ? 'no item na mão' : `na ${LOCAIS[local] || local}`}`;
}
