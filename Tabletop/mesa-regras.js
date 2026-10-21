// As regras de combate do RED na mesa da wiki (p. 170–188), as mesmas do Fluxo de Combate do Foundry
// (foundry-fluxo-de-combate/scripts/regras.mjs) e do texto da wiki (system-rules.js). Sem rede nem arquivo: o teste roda
// estas funções direto.
//
// - Tiro: o ataque precisa passar da DV do alcance. Quem tem REF 8+ pode esquivar: DEX + Evasão + 1d10 vira a DV.
// - Corpo a corpo: sempre contra DEX + Evasão + 1d10, para qualquer um. Alcance de 2 m.
// - Empate: o defensor vence. Para sair da área de um explosivo, a esquiva tem de passar do ataque.
// - Autofogo: 10 balas, perícia Disparo Automático, tabela própria; dano 2d6 × quanto passou, até o máximo da arma.
// - Explosivo: contra a DV do alcance do alvo; acertou, pega todos numa área de 10 × 10 m em volta dele.
// - Fogo supressivo: quem está até 25 m rola WILL + Concentração + 1d10 contra o ataque; quem perde fica Suprimido.
// - Armadura: o dano que passa do SP sai do HP (cabeça ×2) e a armadura perde 1 SP. Armas brancas e artes marciais
//   ignoram metade do SP (arredondado para cima); briga não.
// - Lesão crítica: dois ou mais 6 nos dados de dano; +5 de dano direto, mesmo sem passar da armadura.
// - Death Save: 1d10 + penalidade menor que o BODY; 10 natural sempre falha.
// - Espingarda com cartucho: um ataque contra DV 13; se acertar, 3d6 (rolado uma vez) em todos à frente, até 6 m e à
//   vista. Não pode ser mirado; REF 8+ esquiva.
//
// Os anos 2070 (Cyberpunk Edgerunners Mission Kit, p. 31–35), como o módulo do Foundry aplica
// (foundry-2077/scripts/armas2077.mjs). O perfil de cada arma (arma.kit) vem de mesa-2077.js.
// - Power: a lesão crítica causa 10 de dano bônus em vez de 5. Ricochete: −4 no ataque (−2 com o Ballistic
//   Coprocessor) contra um alvo atrás de cobertura ou fora da linha de visão.
// - Smart: +1 nos ataques à distância, e só dispara conectada. Com a munição Smart melhorada, errou a DV (ou a esquiva)
//   por 5 ou menos: 14 + 1d10 contra o mesmo número, com as penalidades do primeiro tiro.
// - Tech: carregar gasta a Ação de Movimento e dura até disparar ou 20 rodadas; carregada, o próximo ataque (menos o
//   fogo supressivo) ignora metade do SP e atravessa cobertura fina.
// - E as regras de cada arma: balas por tiro (e o dano com menos balas), trava de balas mínimas, dano fixo, dano no tiro
//   mirado, os dois canos, os dois alvos, o ferrolho, a coronha recolhida (−1) e a lesão de quem não aguenta o coice.
'use strict';

const MODOS = { tiro: 'Tiro', mirado: 'Tiro mirado', ricochete: 'Ricochete', autofogo: 'Autofogo', supressivo: 'Fogo supressivo', cartucho: 'Espingarda com cartucho', corpo: 'Corpo a corpo', explosivo: 'Explosivo' };
const LOCAIS = { corpo: 'corpo', cabeca: 'cabeça', perna: 'perna', item: 'item na mão' };
// A linha da tabela de DV por alcance (system-rules.js) de cada classe de arma do catálogo.
const ALCANCE = { medPistol: 'pistol', heavyPistol: 'pistol', vHeavyPistol: 'pistol', smg: 'smg', heavySmg: 'smg', assaultRifle: 'assault', shotgun: 'shotgun', sniperRifle: 'sniper', bow: 'bow', grenadeLauncher: 'grenade', thrownWeapon: 'grenade', rocketLauncher: 'rocket' };
const CORPO_A_CORPO = new Set(['lightMelee', 'medMelee', 'heavyMelee', 'vHeavyMelee', 'briga', 'artesMarciais']);
const AUTOFOGO_MAX = { smg: 3, heavySmg: 3, assaultRifle: 4 };
const EXPLOSIVO = new Set(['grenadeLauncher', 'rocketLauncher', 'thrownWeapon']);
const RAIO_SUPRESSAO = 25;
const AREA_EXPLOSIVO = 10;
const BALAS_AUTOFOGO = 10;
const MIRADO = -8;
const MEDIA_D10 = 5.5;
const DV_CARTUCHO = 13;
const ALCANCE_CARTUCHO = 6;
const DANO_CARTUCHO = '3d6';
// "À sua frente": até 45° para cada lado da linha até o alvo escolhido.
const ABERTURA_CARTUCHO = 45;
const TIRO_UNICO = new Set(['tiro', 'mirado', 'ricochete', 'cartucho']);
const KIT = {
  bonusPower: 10, ricochete: -4, ricocheteComCoprocessador: -2, smart: 1, excelente: 1, coronha: -1, duracaoDaCarga: 20,
  segundaChance: { base: 14, margem: 5 }, redirecionamento: 4, doisCanos: { balas: 2, dano: '4d6' }
};
// As lesões que as armas de 2077 causam em quem atira (o nome do livro → o da tabela da wiki).
const LESOES_DO_KIT = { 'Torn Muscle': 'Músculo rompido', 'Broken Arm': 'Braço quebrado' };

// A classe da arma: a do catálogo, se veio; senão, pelo nome e pela perícia (as fichas do livro e as armas do Foundry
// sem par no catálogo).
function classeDaArma({ classe = '', nome = '', pericia = '', distancia = true } = {}) {
  if (classe) return classe;
  const texto = `${nome}`.toLowerCase();
  if (/artes marciais|martial/.test(texto) || pericia === 'Martial Arts') return 'artesMarciais';
  if (/desarmad|soco|briga|unarmed/.test(texto) || pericia === 'Brawling') return 'briga';
  if (/lança-granadas|lanca-granadas|grenade launcher/.test(texto)) return 'grenadeLauncher';
  if (/granada|grenade/.test(texto)) return 'thrownWeapon';
  if (/míssil|missil|foguete|rocket/.test(texto)) return 'rocketLauncher';
  if (/sniper|precisão|precisao/.test(texto)) return 'sniperRifle';
  if (/espingarda|shotgun|escopeta/.test(texto)) return 'shotgun';
  if (/rifle de assalto|assault|fuzil/.test(texto)) return 'assaultRifle';
  if (/smg|submetralhadora/.test(texto)) return 'smg';
  if (/arco|besta|\bbow\b|crossbow/.test(texto)) return 'bow';
  if (/pistola|pistol|revólver|revolver/.test(texto)) return 'heavyPistol';
  if (pericia === 'Handgun') return 'heavyPistol';
  if (pericia === 'Shoulder Arms') return 'assaultRifle';
  if (pericia === 'Heavy Weapons') return 'grenadeLauncher';
  if (pericia === 'Archery') return 'bow';
  if (pericia === 'Autofire') return 'smg';
  if (/Melee/.test(pericia) || !distancia) return 'medMelee';
  return 'heavyPistol';
}
const ehCorpoACorpo = classe => CORPO_A_CORPO.has(classe);
const ehExplosivo = classe => EXPLOSIVO.has(classe);

// O máximo do autofogo: o da arma de 2077 (o perfil diz; 0 = não faz) ou o da classe (a arma com Rebuild também).
const autofogoDe = (arma, classe = classeDaArma(arma)) => (arma.kit && arma.kit.autofogo !== undefined ? arma.kit.autofogo : AUTOFOGO_MAX[classe] || 0);
// Os modos que a arma permite. arma.kit: o perfil de 2077 (com o autofogo e o fogo supressivo de cada arma);
// arma.cartucho: a munição carregada é cartucho (true), outra (false) ou não se sabe (null: a espingarda faz os dois).
function modosDaArma(arma) {
  const classe = classeDaArma(arma);
  if (ehCorpoACorpo(classe)) return ['corpo'];
  if (ehExplosivo(classe)) return ['explosivo'];
  const kit = arma.kit || null;
  if ((kit && kit.soCartucho) || (classe === 'shotgun' && arma.cartucho === true)) return ['cartucho'];
  const modos = ['tiro', 'mirado'];
  if (kit && kit.classe === 'power' && arma.pericia !== 'Autofire') modos.push('ricochete');
  if (autofogoDe(arma, classe)) modos.push('autofogo');
  if (kit && kit.supressivo !== undefined ? kit.supressivo : AUTOFOGO_MAX[classe]) modos.push('supressivo');
  if (classe === 'shotgun' && arma.cartucho !== true && arma.cartucho !== false) modos.push('cartucho');
  return modos;
}

// A DV pela distância (m). Autofogo usa a linha própria (5 faixas); a arma sem ela usa a da SMG (como a espingarda de
// 2077 com autofogo). null = fora do alcance.
function dvPelaDistancia(regras, classe, metros, autofogo = false) {
  const linhas = regras.rangeDV || [];
  let linha = linhas.find(item => item.id === ALCANCE[classe]);
  if (autofogo && !(linha && Array.isArray(linha.autofire))) linha = linhas.find(item => item.id === 'smg');
  if (!linha) return null;
  const tabela = autofogo ? linha.autofire : linha.dv;
  if (!Array.isArray(tabela)) return null;
  const faixa = (regras.rangeBandLimits || []).findIndex(limite => metros <= limite);
  if (faixa < 0 || faixa >= tabela.length) return null;
  return tabela[faixa] ?? null;
}

// Quem pode esquivar: no corpo a corpo, todos; de tiros, só com REF 8+. Sem perna, ninguém.
function podeEsquivar({ modo, ref = 0, semPerna = false }) {
  if (semPerna || modo === 'supressivo') return false;
  if (modo === 'corpo') return true;
  return Number(ref) >= 8;
}
function opcoesDeDefesa({ modo, esquiva }) {
  if (modo === 'supressivo') return ['concentrar'];
  if (modo === 'corpo') return esquiva ? ['esquivar'] : ['aguentar'];
  return esquiva ? ['esquivar', 'aguentar'] : ['aguentar'];
}
const escolhaPadrao = opcoes => (opcoes.includes('concentrar') ? 'concentrar' : opcoes.length === 1 ? opcoes[0] : opcoes.includes('aguentar') ? 'aguentar' : opcoes[0]);

// Pegou? Na Concentração, true = o alvo perdeu (ficou suprimido). dv null num tiro = fora do alcance (erra).
function acertou({ modo, escolha, ataque, defesa = null, dv = null }) {
  if (escolha === 'concentrar') return ataque > defesa;
  if (escolha === 'esquivar') return modo === 'explosivo' ? !(defesa > ataque) : ataque > defesa;
  // Explosivo e cartucho: a DV já passou antes da área.
  if (modo === 'corpo' || modo === 'explosivo' || modo === 'cartucho') return true;
  if (dv === null || dv === undefined) return false;
  return ataque > dv;
}
// maximo: o da arma de 2077 (o perfil); sem ele, o da classe.
const multiplicadorDeAutofogo = (ataque, defesa, classe, maximo = 0) => Math.max(1, Math.min(maximo || AUTOFOGO_MAX[classe] || 3, Number(ataque) - Number(defesa)));

// ---------------- Os anos 2070 ----------------
// A munição Smart melhorada dá a segunda chance? Só quando o ataque não passou e ficou a até 5 do número.
function temSegundaChance({ ataque, contra }) {
  if (contra === null || contra === undefined || !Number.isFinite(Number(contra))) return false;
  const falta = Number(contra) - Number(ataque);
  return falta >= 0 && falta <= KIT.segundaChance.margem;
}
// Quantas balas o ataque gasta (arma com pente). pente: o que tem antes do tiro.
function balasDoAtaque({ modo, kit = null, pente = 0, carregada = false, doisCanos = false }) {
  if (modo === 'autofogo' || modo === 'supressivo') return BALAS_AUTOFOGO;
  if (!kit || !TIRO_UNICO.has(modo)) return 1;
  if (doisCanos && kit.doisCanos) return KIT.doisCanos.balas;
  if (kit.balas > 1) return kit.danoComMenos ? Math.max(1, Math.min(kit.balas, pente)) : kit.balas;
  if (carregada && kit.balasNaCarga > 1) return Math.max(1, Math.min(kit.balasNaCarga, pente));
  return 1;
}
// Os dados do dano: os da arma, os 3d6 do cartucho (a arma que só dispara cartucho já diz o dela) ou os que a regra da
// arma pede. pente: o que tem antes do tiro.
function formulaDoDano({ modo, dano, kit = null, pente = 0, doisCanos = false }) {
  let formula = modo === 'cartucho' && !(kit && kit.soCartucho) ? DANO_CARTUCHO : dano;
  if (!kit) return formula;
  if (kit.balas > 1 && kit.danoComMenos && TIRO_UNICO.has(modo) && pente < kit.balas) formula = kit.danoComMenos;
  else if (kit.danoFixo && modo !== 'autofogo') formula = kit.danoFixo;
  if (kit.danoMirado && modo === 'mirado') formula = kit.danoMirado;
  if (doisCanos && kit.doisCanos) formula = KIT.doisCanos.dano;
  return formula;
}
// A carga da arma Tech ainda vale? No combate em que carregou: 20 rodadas, até disparar; a que fica até o fim do turno
// (a Omaha) vale até a vez passar. Fora dele: até disparar (a Omaha, mais alguns segundos para o segundo tiro).
// combate: { id, rodada, vez } ou null.
function cargaValida(carga, combate, agora = Date.now()) {
  if (!carga || typeof carga !== 'object') return false;
  if (carga.combate && combate && carga.combate === combate.id) {
    if (Number(combate.rodada) - Number(carga.rodada) >= KIT.duracaoDaCarga) return false;
    return carga.disparou ? carga.disparou.rodada === combate.rodada && carga.disparou.vez === combate.vez : true;
  }
  return carga.disparou ? agora - Number(carga.disparou.em || 0) < 15000 : true;
}
// O ponto está "à frente" de quem atira, na direção do alvo escolhido?
function naFrente(de, para, ponto, abertura = ABERTURA_CARTUCHO) {
  const ax = para.x - de.x;
  const ay = para.y - de.y;
  const bx = ponto.x - de.x;
  const by = ponto.y - de.y;
  const na = Math.hypot(ax, ay);
  const nb = Math.hypot(bx, by);
  if (!na || !nb) return true;
  return (ax * bx + ay * by) / (na * nb) >= Math.cos(abertura * Math.PI / 180) - 1e-9;
}

// Os dados do dano. "3d6" → { quantos: 3, faces: 6, bonus: 0 }.
function lerDados(texto) {
  const m = String(texto || '').match(/^\s*(\d{1,2})\s*d\s*(\d{1,3})\s*(?:([+-])\s*(\d{1,3}))?/i);
  return m ? { quantos: Number(m[1]), faces: Number(m[2]), bonus: (m[3] === '-' ? -1 : 1) * Number(m[4] || 0) } : null;
}
// Dano da briga e das artes marciais pelo BODY (p. 176).
const danoDeBriga = (body, cyberbraco = false) => (body >= 11 ? '4d6' : body >= 7 ? '3d6' : body >= 5 || cyberbraco ? '2d6' : '1d6');

// O dano contra a armadura de um local. dados: os valores rolados; total já com bônus e multiplicador.
function contaDoDano({ dados, total, sp, local = 'corpo', metadeDoSp = false, autofogo = false }) {
  const spEfetivo = metadeDoSp ? Math.ceil(sp / 2) : sp;
  const passou = Math.max(0, total - spEfetivo);
  const seis = dados.filter(valor => valor === 6).length;
  return {
    total, spEfetivo, passou,
    hp: passou * (local === 'cabeca' ? 2 : 1),
    ablacao: passou > 0 ? 1 : 0,
    // No autofogo, os dois dados 6; nos outros, dois ou mais 6.
    lesao: autofogo ? seis >= 2 && dados.length === 2 : seis >= 2
  };
}

// Death Save: 1d10 + penalidade menor que o BODY; 10 natural falha.
const sobreviveu = ({ dado, penalidade = 0, body = 0 }) => dado !== 10 && dado + penalidade < body;

// SP da ficha do livro: "Kevlar · SP 7 na cabeça e no corpo" → 7 nos dois.
function spDaFicha(texto) {
  const m = String(texto || '').match(/SP\s*(\d+)/i);
  const sp = m ? Number(m[1]) : 0;
  return { cabeca: { atual: sp, max: sp }, corpo: { atual: sp, max: sp } };
}

function descreverAtaque({ modo, local = 'corpo' }) {
  if (modo === 'mirado') return `Tiro mirado ${local === 'item' ? 'no item na mão' : `na ${LOCAIS[local] || local}`}`;
  return MODOS[modo] || 'Ataque';
}

module.exports = {
  MODOS, LOCAIS, ALCANCE, AUTOFOGO_MAX, RAIO_SUPRESSAO, AREA_EXPLOSIVO, BALAS_AUTOFOGO, MIRADO, MEDIA_D10,
  DV_CARTUCHO, ALCANCE_CARTUCHO, DANO_CARTUCHO, ABERTURA_CARTUCHO, TIRO_UNICO, KIT, LESOES_DO_KIT,
  classeDaArma, ehCorpoACorpo, ehExplosivo, autofogoDe, modosDaArma, dvPelaDistancia, podeEsquivar, opcoesDeDefesa, escolhaPadrao, acertou,
  multiplicadorDeAutofogo, lerDados, danoDeBriga, contaDoDano, sobreviveu, spDaFicha, descreverAtaque,
  temSegundaChance, balasDoAtaque, formulaDoDano, cargaValida, naFrente
};
