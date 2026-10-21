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
'use strict';

const MODOS = { tiro: 'Tiro', mirado: 'Tiro mirado', autofogo: 'Autofogo', supressivo: 'Fogo supressivo', corpo: 'Corpo a corpo', explosivo: 'Explosivo' };
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

// Os modos que a arma permite.
function modosDaArma(arma) {
  const classe = classeDaArma(arma);
  if (ehCorpoACorpo(classe)) return ['corpo'];
  if (ehExplosivo(classe)) return ['explosivo'];
  const modos = ['tiro', 'mirado'];
  if (AUTOFOGO_MAX[classe]) modos.push('autofogo', 'supressivo');
  return modos;
}

// A DV pela distância (m). Autofogo usa a linha própria (5 faixas). null = fora do alcance.
function dvPelaDistancia(regras, classe, metros, autofogo = false) {
  const linha = (regras.rangeDV || []).find(item => item.id === ALCANCE[classe]);
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
  if (modo === 'corpo' || modo === 'explosivo') return true; // explosivo: a DV do alvo já passou antes da área
  if (dv === null || dv === undefined) return false;
  return ataque > dv;
}
const multiplicadorDeAutofogo = (ataque, defesa, classe) => Math.max(1, Math.min(AUTOFOGO_MAX[classe] || 3, Number(ataque) - Number(defesa)));

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
  classeDaArma, ehCorpoACorpo, ehExplosivo, modosDaArma, dvPelaDistancia, podeEsquivar, opcoesDeDefesa, escolhaPadrao, acertou,
  multiplicadorDeAutofogo, lerDados, danoDeBriga, contaDoDano, sobreviveu, spDaFicha, descreverAtaque
};
