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
//
// A luta (M9b; a wiki, "Agarrar e arremessar", p. 177, "Escudos e escudo humano", p. 183–184, e "Movimentos de artes
// marciais", p. 178–180), como o sistema do Foundry 14 (foundry-sistema/scripts/agarrao.mjs e artes-marciais.mjs):
// - Agarrar: os dois rolam DEX + Briga + 1d10, e quem agarra precisa superar (o empate é do defensor). Agarrados, os dois
//   têm −2 em tudo; quem é agarrado não usa a Ação de Movimento e é arrastado; ninguém usa arma de duas mãos.
// - Estrangular e Derrubar: o BODY de quem agarra direto no HP. Escudo humano: o agarrado recebe os tiros e não esquiva.
// - Arremessar: DEX + Atletismo + 1d10 contra a DV do lança-granadas, até 25 m; a arma branca não ignora metade do SP.
// - Artes Marciais: o dano pelo BODY, metade do SP, e os movimentos de cada forma. A mesa confere os requisitos "neste
//   turno" pelo registro do turno (quem acertou o quê, quem desviou, quanto andou).
'use strict';

const MODOS = {
  tiro: 'Tiro', mirado: 'Tiro mirado', ricochete: 'Ricochete', autofogo: 'Autofogo', supressivo: 'Fogo supressivo', cartucho: 'Espingarda com cartucho', corpo: 'Corpo a corpo', explosivo: 'Explosivo',
  arremesso: 'Arremesso', quebraOssos: 'Golpe quebra-ossos', pontoDePressao: 'Ponto de pressão', voadora: 'Voadora'
};
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
// Os golpes das Artes Marciais vão pelo ataque, como o corpo a corpo: alcance de 2 m (a Voadora, 4) e todos esquivam.
const GOLPES = new Set(['quebraOssos', 'pontoDePressao', 'voadora']);
const ehModoCorpo = modo => modo === 'corpo' || GOLPES.has(modo);
// As armas brancas que dá para arremessar (e as de arremesso que não explodem: o Mono-Star, a machadinha e o bumerangue
// do Black Chrome, com Atletismo; a de arremesso continua reduzindo o SP à metade).
const ARMA_BRANCA = new Set(['lightMelee', 'medMelee', 'heavyMelee', 'vHeavyMelee']);
const deArremesso = (arma, classe = classeDaArma(arma)) => classe === 'thrownWeapon' && arma.pericia === 'Athletics' && !/molotov/i.test(arma.nome || '');

// O máximo do autofogo: o da arma de 2077 (o perfil diz; 0 = não faz) ou o da classe (a arma com Rebuild também).
const autofogoDe = (arma, classe = classeDaArma(arma)) => (arma.kit && arma.kit.autofogo !== undefined ? arma.kit.autofogo : AUTOFOGO_MAX[classe] || 0);
// Os modos que a arma permite. arma.kit: o perfil de 2077 (com o autofogo e o fogo supressivo de cada arma);
// arma.cartucho: a munição carregada é cartucho (true), outra (false) ou não se sabe (null: a espingarda faz os dois).
// arma.golpes: os golpes da forma de Artes Marciais (a arma de Artes Marciais que a mesa monta).
function modosDaArma(arma) {
  const classe = classeDaArma(arma);
  if (classe === 'artesMarciais') return ['corpo', ...(Array.isArray(arma.golpes) ? arma.golpes.filter(golpe => GOLPES.has(golpe)) : [])];
  if (ehCorpoACorpo(classe)) return ARMA_BRANCA.has(classe) ? ['corpo', 'arremesso'] : ['corpo'];
  if (deArremesso(arma, classe)) return ['arremesso'];
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

// Quem pode esquivar: no corpo a corpo, todos; de tiros, só com REF 8+. Sem perna, ninguém; nem o inconsciente, nem o
// escudo humano.
function podeEsquivar({ modo, ref = 0, semPerna = false, preso = false }) {
  if (semPerna || preso || modo === 'supressivo') return false;
  if (ehModoCorpo(modo)) return true;
  return Number(ref) >= 8;
}
function opcoesDeDefesa({ modo, esquiva }) {
  if (modo === 'supressivo') return ['concentrar'];
  if (ehModoCorpo(modo)) return esquiva ? ['esquivar'] : ['aguentar'];
  return esquiva ? ['esquivar', 'aguentar'] : ['aguentar'];
}
const escolhaPadrao = opcoes => (opcoes.includes('concentrar') ? 'concentrar' : opcoes.length === 1 ? opcoes[0] : opcoes.includes('aguentar') ? 'aguentar' : opcoes[0]);

// Pegou? Na Concentração, true = o alvo perdeu (ficou suprimido). dv null num tiro = fora do alcance (erra).
function acertou({ modo, escolha, ataque, defesa = null, dv = null }) {
  if (escolha === 'concentrar') return ataque > defesa;
  if (escolha === 'esquivar') return modo === 'explosivo' ? !(defesa > ataque) : ataque > defesa;
  // Explosivo e cartucho: a DV já passou antes da área.
  if (ehModoCorpo(modo) || modo === 'explosivo' || modo === 'cartucho') return true;
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
  if ((modo === 'quebraOssos' || modo === 'pontoDePressao') && local === 'cabeca') return `${MODOS[modo]} na cabeça`;
  return MODOS[modo] || 'Ataque';
}

// ---------------- Agarrar e arremessar (p. 177) e o escudo humano (p. 183–184) ----------------
// penalidade: a de quem agarra e a de quem é agarrado, em todas as ações. apertoDeFerro: a mais para escapar (Aikido).
const AGARRAO = { penalidade: -2, apertoDeFerro: -2 };
const ALCANCE_ARREMESSO = 25;
// O teste resistido (p. 128): quem age precisa superar; o empate é de quem resiste.
const venceuResistido = (ataque, defesa) => Number(ataque) > Number(defesa);
// Estrangular e Derrubar: o BODY de quem agarra direto no HP, sem a armadura. Estrangulando, "se levaria abaixo de 0, fica
// com 1 HP e desmaia" (quem já está abaixo de 1 não sobe), e na terceira rodada seguida desmaia. motivo: 'abaixoDeZero'
// ou 'tresRodadas' quando desmaia.
function danoDoAgarrao({ hp, body, estrangular = false, vezes = 1 }) {
  const resto = Number(hp) - Number(body);
  if (estrangular && resto < 0) return { hp: Math.min(Number(hp), 1), desmaiou: true, motivo: 'abaixoDeZero' };
  const tres = estrangular && vezes >= 3;
  return { hp: resto, desmaiou: tres, motivo: tres ? 'tresRodadas' : null };
}
// As rodadas seguidas estrangulando: a de agora conta com a anterior se ela foi na rodada de antes, no mesmo combate; na
// mesma rodada, não conta outra. Fora de combate não há rodada: toda vez conta.
function vezesEstrangulando(anterior, { combate = null, rodada = null } = {}) {
  if (!anterior || !anterior.vezes) return 1;
  if (!combate || !anterior.combate) return combate || anterior.combate ? 1 : anterior.vezes + 1;
  if (anterior.combate !== combate) return 1;
  if (anterior.rodada === rodada) return anterior.vezes;
  return anterior.rodada === rodada - 1 ? anterior.vezes + 1 : 1;
}
// O escudo humano segura os tiros num alvo só: não o corpo a corpo, nem o tiro mirado na cabeça (nem a área, que pega
// todos, nem o fogo supressivo).
const escudoBloqueia = ({ modo, local = 'corpo' }) => ['tiro', 'ricochete', 'autofogo'].includes(modo) || (modo === 'mirado' && local !== 'cabeca');
// As mãos de uma arma: a do catálogo; sem ela, pela classe. Com BODY 8+, a arma branca de duas mãos vai numa (p. 175).
const DUAS_MAOS = new Set(['assaultRifle', 'shotgun', 'sniperRifle', 'bow', 'grenadeLauncher', 'rocketLauncher']);
function maosDaArma(arma, body = 0) {
  const maos = Number(arma.maos) || (DUAS_MAOS.has(classeDaArma(arma)) ? 2 : 1);
  return maos >= 2 && arma.distancia === false && Number(body) >= 8 ? 1 : maos;
}

// ---------------- Artes Marciais (p. 176–180) ----------------
// As formas pelo nome da perícia: o do Foundry, que a criação grava ("Martial Arts (Karate)"), o da ficha do mestre
// ("Artes Marciais (Judô)") ou só a forma ("Karatê"). Sem a forma ("Martial Arts"), só a Recuperação.
const FORMAS = { aikido: 'Aikido', karate: 'Karatê', judo: 'Judô', taekwondo: 'Taekwondo' };
const NOMES_DAS_FORMAS = { aikido: 'aikido', karate: 'karate', carate: 'karate', judo: 'judo', taekwondo: 'taekwondo', 'tae kwon do': 'taekwondo' };
const semAcento = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function formaDaPericia(nome) {
  const texto = semAcento(nome);
  const dentro = texto.match(/\(([^)]*)\)/);
  return NOMES_DAS_FORMAS[(dentro ? dentro[1] : texto).replace(/[-_]/g, ' ').trim()] || null;
}
const ehArtesMarciais = nome => /martial arts|artes marciais/.test(semAcento(nome)) || Boolean(formaDaPericia(nome));
// As lesões dos golpes e do Escape de agarrão (os nomes da tabela da wiki).
const LESOES_DOS_GOLPES = { costelas: 'Costelas quebradas', cranio: 'Crânio rachado', coluna: 'Lesão na coluna', cerebro: 'Lesão cerebral', braco: 'Braço quebrado' };
const ALCANCE_DA_VOADORA = 4;
const ANDOU_DA_VOADORA = 4;
const SP_DA_QUEBRA = 2;
// Cada movimento: a forma (null: todas), a DV (dv) ou o golpe (pelo ataque, golpe: true), o alvo, o agarrão que pede
// ('agarrando' ou 'agarrado'), o WILL e o MOVE mínimos e o requisito "neste turno" (requisito: o que a mesa confere no
// registro do turno; texto: como a wiki diz).
const MOVIMENTOS = {
  recuperacao: { forma: null, nome: 'Recuperação', dv: 13, caido: true, efeito: 'Ao se levantar, passando na DV 13, não gasta a Ação.' },
  desarmeCombinado: { forma: 'aikido', nome: 'Desarme combinado', dv: 15, alvo: true, requisito: 'brigaEArtes', texto: 'Acertou o mesmo alvo com Briga e com Artes Marciais neste turno.', efeito: 'O objeto na mão do alvo fica com você ou cai.' },
  apertoDeFerro: { forma: 'aikido', nome: 'Aperto de ferro', dv: 15, agarrao: 'agarrando', efeito: 'Uma Ação: −2 a mais para o agarrado escapar, e nada de ataques à distância enquanto agarrado.' },
  quebraArmadura: { forma: 'karate', nome: 'Combinação quebra-armadura', dv: 15, alvo: true, requisito: 'brancaEArtes', texto: 'Acertou o mesmo alvo com Arma Branca e com Artes Marciais neste turno.', efeito: `A armadura do corpo do alvo perde ${SP_DA_QUEBRA} SP a mais.` },
  quebraOssos: { forma: 'karate', nome: 'Golpe quebra-ossos', golpe: true, will: 8, lesoes: { corpo: LESOES_DOS_GOLPES.costelas, cabeca: LESOES_DOS_GOLPES.cranio }, efeito: 'No lugar dos 2 ataques, 1 golpe: acertando, Costelas quebradas; mirado na cabeça (−8), Crânio rachado.' },
  contraQueda: { forma: 'judo', nome: 'Contra-queda', dv: 15, alvo: true, requisito: 'desviou', texto: 'Desviou de todos os ataques corpo a corpo desde o seu último turno.', efeito: 'Uma Ação: derruba quem o atacou, sem precisar agarrar. Não pode ser evitado.' },
  escapeDeAgarrao: { forma: 'judo', nome: 'Escape de agarrão', dv: 15, agarrao: 'agarrado', requisito: 'doisEmQuemAgarra', texto: 'Acertou 2 ataques corpo a corpo em quem o agarra neste turno.', efeito: 'Fica livre, e quem o agarrava sofre Braço quebrado.' },
  pontoDePressao: { forma: 'taekwondo', nome: 'Ponto de pressão', golpe: true, will: 8, lesoes: { corpo: LESOES_DOS_GOLPES.coluna, cabeca: LESOES_DOS_GOLPES.cerebro }, efeito: 'No lugar dos 2 ataques, 1 golpe: acertando, Lesão na coluna; mirado na cabeça (−8), Lesão cerebral.' },
  voadora: { forma: 'taekwondo', nome: 'Voadora', golpe: true, move: 8, alcance: ALCANCE_DA_VOADORA, derruba: true, requisito: 'andou', texto: `Já andou ${ANDOU_DA_VOADORA} m neste turno.`, efeito: `Usa a Ação e o resto do movimento contra alvo a até ${ALCANCE_DA_VOADORA} m: o dano das Artes Marciais, e o alvo cai (e sai da moto ou do veículo aberto).` }
};
// As formas do personagem, com a perícia (o nome dela e o nível; o NPC só tem a base): [{ forma, pericia, nivel }].
// A Recuperação vale com qualquer forma; os outros movimentos, só com a forma deles. "Exigem pelo menos 1 ponto".
// Devolve os movimentos que ele pode usar, com o bloqueio de WILL ou MOVE que falta.
function movimentosDisponiveis(formas = [], { will = 0, move = 0 } = {}) {
  const porForma = new Map();
  for (const f of formas) if (Number(f.nivel) >= 1 && (!porForma.has(f.forma) || f.nivel > porForma.get(f.forma).nivel)) porForma.set(f.forma, f);
  const melhor = [...porForma.values()].sort((a, b) => b.nivel - a.nivel)[0];
  return Object.entries(MOVIMENTOS).flatMap(([id, m]) => {
    const f = m.forma ? porForma.get(m.forma) : melhor;
    if (!f) return [];
    const falta = [m.will && Number(will) < m.will && `WILL ${m.will}+`, m.move && Number(move) < m.move && `MOVE ${m.move}+`].filter(Boolean).join(' e ');
    return [{ id, ...m, pericia: f.pericia, formaDele: f.forma, nomeDaForma: FORMAS[f.forma] || 'Artes Marciais', bloqueio: falta ? `Pede ${falta}.` : '' }];
  });
}
// Superar a DV (a wiki, "Teste básico").
const passouNoMovimento = (total, dv) => Number(total) > Number(dv);

// ---------------- O registro do turno ----------------
// Cada ataque resolvido em combate: { turno, atacante, alvo, classe, corpo (foi corpo a corpo), acertou, esquivou }. turno: o
// número da vez (combate.turnos), que muda a cada vez passada. andou: { turno, metros } do token.
// O requisito de um movimento: { ok, falta }. eu: o token; alvo: o escolhido; quemAgarra: quem segura o eu; desde: o turno
// em que a vez anterior do eu começou (o "desde o seu último turno"; null: desde o começo do combate).
function requisitoDoMovimento(id, { feitos = [], turno, eu, alvo = null, quemAgarra = null, andou = null, desde = null } = {}) {
  const m = MOVIMENTOS[id];
  if (!m || !m.requisito) return { ok: true, falta: '' };
  const meus = feitos.filter(feito => feito.turno === turno && feito.atacante === eu && feito.acertou);
  const acertouCom = classes => meus.some(feito => feito.alvo === alvo && classes(feito.classe));
  if (m.requisito === 'brigaEArtes' || m.requisito === 'brancaEArtes') {
    const outra = m.requisito === 'brigaEArtes' ? classe => classe === 'briga' : classe => ARMA_BRANCA.has(classe);
    const ok = Boolean(alvo) && acertouCom(outra) && acertouCom(classe => classe === 'artesMarciais');
    return { ok, falta: ok ? '' : `Pede: ${m.texto.charAt(0).toLowerCase()}${m.texto.slice(1)}` };
  }
  if (m.requisito === 'doisEmQuemAgarra') {
    const quantos = meus.filter(feito => feito.alvo === quemAgarra && feito.corpo).length;
    return { ok: quantos >= 2, falta: quantos >= 2 ? '' : `Pede 2 acertos corpo a corpo em quem o agarra neste turno (tem ${quantos}).` };
  }
  if (m.requisito === 'desviou') {
    const contra = feitos.filter(feito => feito.alvo === eu && feito.corpo && (desde === null || feito.turno > desde));
    if (!contra.length) return { ok: false, falta: 'Ninguém o atacou corpo a corpo desde o seu último turno.' };
    if (contra.some(feito => !feito.esquivou)) return { ok: false, falta: 'Não desviou de todos os ataques corpo a corpo desde o seu último turno.' };
    const ok = contra.some(feito => feito.atacante === alvo);
    return { ok, falta: ok ? '' : 'A Contra-queda é contra quem o atacou.' };
  }
  if (m.requisito === 'andou') {
    const metros = andou && andou.turno === turno ? Number(andou.metros) || 0 : 0;
    return { ok: metros >= ANDOU_DA_VOADORA, falta: metros >= ANDOU_DA_VOADORA ? '' : `Pede ${ANDOU_DA_VOADORA} m andados neste turno (andou ${metros} m).` };
  }
  return { ok: false, falta: 'Requisito desconhecido.' };
}

module.exports = {
  MODOS, LOCAIS, ALCANCE, AUTOFOGO_MAX, RAIO_SUPRESSAO, AREA_EXPLOSIVO, BALAS_AUTOFOGO, MIRADO, MEDIA_D10,
  DV_CARTUCHO, ALCANCE_CARTUCHO, DANO_CARTUCHO, ABERTURA_CARTUCHO, TIRO_UNICO, KIT, LESOES_DO_KIT,
  classeDaArma, ehCorpoACorpo, ehExplosivo, autofogoDe, modosDaArma, dvPelaDistancia, podeEsquivar, opcoesDeDefesa, escolhaPadrao, acertou,
  multiplicadorDeAutofogo, lerDados, danoDeBriga, contaDoDano, sobreviveu, spDaFicha, descreverAtaque,
  temSegundaChance, balasDoAtaque, formulaDoDano, cargaValida, naFrente,
  GOLPES, ehModoCorpo, ARMA_BRANCA, deArremesso, AGARRAO, ALCANCE_ARREMESSO, venceuResistido, danoDoAgarrao, vezesEstrangulando, escudoBloqueia, DUAS_MAOS, maosDaArma,
  FORMAS, formaDaPericia, ehArtesMarciais, LESOES_DOS_GOLPES, ALCANCE_DA_VOADORA, ANDOU_DA_VOADORA, SP_DA_QUEBRA, MOVIMENTOS, movimentosDisponiveis, passouNoMovimento,
  requisitoDoMovimento
};
