// Regras do RED sem Foundry (o teste roda estas funções no Node): derivados da ficha, ferimentos, dano com armadura,
// crítico do dano, Death Save, Lesão Crítica e a defesa. A defesa é a do Fluxo de Combate (p. 170–187), como a wiki
// da mesa resume:
// - Tiro: o ataque precisa passar da DV do alcance. Quem tem REF 8+ pode esquivar: DEX + Evasão + 1d10 vira a DV.
// - Corpo a corpo: sempre disputa contra DEX + Evasão + 1d10, para qualquer um.
// - Empate: o defensor vence. Para sair da área de um explosivo, a esquiva tem de passar do ataque.
// - Autofogo: 2d6 × quanto o ataque passou da DV (ou da esquiva), até o máximo da arma; gasta 10 balas.
// - Espingarda com cartucho: um ataque contra DV 13; se acertar, 3d6 em todos à frente, até 6 m.
// - Explosivo: dano em todos numa área de 10 × 10 m em volta do alvo.
// - Fogo supressivo: quem está até 25 m rola WILL + Concentração + 1d10 contra o ataque; quem perder é suprimido.
// - Escudo: recebe o ataque todo, mas quem usa não esquiva.

// HP máximo (p. 82): 10 + 5 × (BODY + WILL) / 2, arredondado para cima.
export const hpMaximo = (body, will) => 10 + 5 * Math.ceil((Number(body) + Number(will)) / 2);

// Consciência de Combate do Solo (RED p. 146), pelos pontos de cada habilidade, como a wiki descreve (system-criacao.js)
// e o CORE automatiza (bonusRatio de cada habilidade do item de Role):
// - Reação de Iniciativa: +1 na Iniciativa por ponto;
// - Ataque de Precisão: +1 em todo ataque a cada 3 pontos;
// - Detecção de Ameaça: +1 em Percepção por ponto;
// - Ponto Fraco: +1 no dano (antes da armadura) do primeiro acerto da rodada, por ponto;
// - Deflexão de Dano: −1 no primeiro dano sofrido na rodada, a cada 2 pontos, até 5 (system-catalog.js);
// - Recuperação de Falhas: com 4 pontos, ignora as falhas críticas (1 no dado) ao atacar.
export function consciencia(habilidades = {}) {
  const pontos = nome => Math.max(0, Number(habilidades?.[nome]) || 0);
  return {
    iniciativa: pontos('Initiative Reaction'),
    ataque: Math.floor(pontos('Precision Attack') / 3),
    percepcao: pontos('Threat Detection'),
    pontoFraco: pontos('Spot Weakness'),
    deflexao: Math.min(5, Math.floor(pontos('Damage Deflection') / 2)),
    semFalhaCritica: pontos('Fumble Recovery') >= 4
  };
}

// Mortalmente ferido (wiki, system-rules.js): −6 MOVE, mínimo 1 (vale também para o que as lesões e a armadura tiram).
export const PENALIDADE_MOVE_MORTAL = -6;
export const moveFinal = (move, mortal) => Math.max(1, Number(move) + (mortal ? PENALIDADE_MOVE_MORTAL : 0));

// Estado de ferimento (p. 186): abaixo da metade do HP (arredondada para cima), −2 em tudo; abaixo de 1, −4.
export function estadoDeFerimento(hp, max) {
  if (hp < 1) return { chave: 'mortal', rotulo: 'Mortalmente ferido', penalidade: -4 };
  if (hp < Math.ceil(max / 2)) return { chave: 'grave', rotulo: 'Gravemente ferido', penalidade: -2 };
  if (hp < max) return { chave: 'leve', rotulo: 'Levemente ferido', penalidade: 0 };
  return { chave: 'ileso', rotulo: 'Ileso', penalidade: 0 };
}

// Humanidade máxima: EMP × 10, menos 2 por peça de cyberware instalada com perda de Humanidade (borgware, menos 4). Peça
// sem perda (fashionware, o cyberware grátis de 2077) não reduz. Fonte: a wiki ("cada peça reduz o máximo em 2
// (borgware, em 4). Peças com 0 de perda não reduzem") e o CORE (_calcMaxHumanity, que olha a perda estática da peça).
// cyberware: [{ tipo, perda }] das peças instaladas, com a perda estática (a média do livro).
export const humanidadeMaxima = (emp, cyberware = []) =>
  Number(emp) * 10 - cyberware.reduce((soma, peca) => soma + (peca.tipo === 'borgware' ? 4 : Number(peca.perda) > 0 ? 2 : 0), 0);

// A EMP de agora é a Humanidade / 10 (para baixo), nunca acima da base.
export const empAtual = (humanidade, empBase) => Math.max(0, Math.min(Number(empBase), Math.floor(Number(humanidade) / 10)));

// O dano na ficha, como o sistema oficial aplica (CPRActor#_applyDamage):
// - SP do local: a maior das armaduras equipadas; arma que ignora armadura abaixo de um SP passa direto;
//   arma branca e artes marciais ignoram metade (ignorarPct 50, arredondado como o sistema oficial);
// - se o dano não passa do SP, só o bônus do crítico entra; se passa, o que passou (×2 na cabeça) mais o bônus;
// - dano não letal deixa o alvo com 1 HP; a armadura perde SP (ablação) quando o dano passa.
export function aplicarDano({ dano, bonus = 0, sp = 0, local = 'corpo', ignorarPct = 0, ignorarAbaixo = 0, reducao = 0, letal = true, hpAtual = 0 }) {
  const ignorarTudo = sp < ignorarAbaixo;
  let spEfetivo = ignorarTudo ? 0 : sp;
  if (!ignorarTudo && ignorarPct) spEfetivo = Math.round(sp - sp * (ignorarPct / 100));
  const passou = Number(dano) > spEfetivo;
  const bruto = passou ? (Number(dano) - spEfetivo) * (local === 'cabeca' ? 2 : 1) : 0;
  let recebido = Math.max(Number(bonus) + bruto - Number(reducao), 0);
  if (!letal && recebido >= hpAtual) recebido = Math.max(hpAtual - 1, 0);
  return { spEfetivo, passou, bruto, recebido, ablar: passou && sp > 0 };
}

// Crítico do dano (p. 187): dois ou mais 6 nos dados de dano. Soma 5 de bônus direto no HP e uma Lesão Crítica.
export const BONUS_CRITICO = 5;
export const danoCritico = resultados => resultados.filter(valor => valor === 6).length >= 2;

// Death Save (p. 186): 1d10 + penalidade (a de base, das lesões, e +1 a cada Death Save que passou) contra BODY.
// Passa tirando menos que BODY; o 10 natural sempre falha.
export const passouNoDeathSave = ({ natural, total, body }) => natural !== 10 && total < body;

// Lesão Crítica: o id do item na tabela de 2d6 (faixas [mín, máx, id]).
export const lesaoNaTabela = (faixas, total) => (faixas || []).find(([min, max]) => total >= min && total <= max)?.[2] ?? null;

// ---------------- Modos de ataque ----------------
export const MODOS = { corpo: 'Corpo a corpo', tiro: 'Tiro', autofogo: 'Autofogo', supressivo: 'Fogo supressivo', cartucho: 'Espingarda com cartucho', explosivo: 'Explosivo' };
export const LOCAIS_MIRADOS = { cabeca: 'cabeça', perna: 'perna', item: 'item na mão' };
export const DV_CARTUCHO = 13;
export const ALCANCE_CARTUCHO = 6;
export const RAIO_SUPRESSAO = 25;
export const AREA_EXPLOSIVO = 10;
export const BALAS_RAJADA = 10;
export const MEDIA_D10 = 5.5;

// O modo do ataque: o botão escolhido (autofogo, supressivo) ou o que a arma e a munição no pente dizem.
export function classificar({ pedido = null, aDistancia = true, tipoDeArma = '', municao = '' }) {
  if (pedido === 'autofogo' || pedido === 'supressivo') return pedido;
  if (!aDistancia) return 'corpo';
  if (['grenade', 'rocket'].includes(municao) || ['grenadeLauncher', 'rocketLauncher'].includes(tipoDeArma)) return 'explosivo';
  if (municao === 'shotgunShell') return 'cartucho';
  return 'tiro';
}

// Balas que o modo gasta.
export const balasDoModo = modo => (modo === 'autofogo' || modo === 'supressivo' ? BALAS_RAJADA : 1);

// Munição que não causa dano (a tabela de munição da wiki, system-catalog.js, com o texto dela): quem é pego sofre só o
// efeito, que o mestre resolve pelo cartão. As outras munições especiais causam o dano da arma.
export const MUNICAO_SEM_DANO = {
  biotoxin: 'quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre 3d6 direto no HP.',
  emp: 'quem é atingido faz Cybertech DV15 ou o mestre escolhe 2 cyberwares ou eletrônicos que param por 1 minuto.',
  flashbang: 'quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre as lesões Olho danificado e Ouvido danificado por 1 minuto, sem dano bônus.',
  poison: 'quem é atingido faz Resistir a Tortura/Drogas DV13 ou sofre 2d6 direto no HP.',
  sleep: 'quem é atingido faz Resistir a Tortura/Drogas DV13 ou cai inconsciente por 1 minuto, até sofrer dano ou alguém usar uma Ação para acordá-lo.',
  smoke: 'Cobre de fumaça uma área de 10 × 10 m por 1 minuto. Agir dentro dela costuma ter −4.',
  teargas: 'quem tem olhos de carne faz Resistir a Tortura/Drogas DV13 ou sofre Olho danificado por 1 minuto, sem dano bônus.'
};

// O local do corpo que a armadura protege: só cabeça e corpo têm SP; perna e item na mão contam como corpo.
export const localDaArmadura = local => (local === 'cabeca' ? 'cabeca' : 'corpo');

// ---------------- Defesa (do Fluxo de Combate) ----------------
// Quem pode esquivar: no corpo a corpo, todos; de tiros, só com REF 8+. Sem perna, ninguém.
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

// O mestre deixou o NPC no automático: esquiva quando a esquiva média passa da DV (e sempre no corpo a corpo e na
// área, onde aguentar é levar o dano); senão, o escudo; senão, aguenta.
export function escolhaAutomatica({ opcoes, modo, dv = null, mediaEsquiva = 0 }) {
  if (opcoes.length === 1) return opcoes[0];
  if (opcoes.includes('esquivar') && (['corpo', 'explosivo', 'cartucho'].includes(modo) || dv === null || mediaEsquiva > dv)) return 'esquivar';
  if (opcoes.includes('escudo')) return 'escudo';
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

// Multiplicador do autofogo: quanto o ataque passou da defesa (no mínimo 1), até o máximo da arma.
export const multiplicadorDeAutofogo = (ataque, defesa, maximo = Infinity) => Math.min(maximo || Infinity, Math.max(1, Number(ataque) - Number(defesa)));

// DV pela distância numa tabela: faixas [mín, máx, DV] em metros; além da última faixa é fora do alcance.
export function dvPelaDistancia(faixas, distancia) {
  const metros = Math.round(Number(distancia) || 0);
  const faixa = (faixas || []).find(([min, max]) => metros >= min && metros <= max);
  return faixa ? { dv: faixa[2], fora: false } : { dv: null, fora: true };
}

// Tabelas candidatas: o autofogo usa a tabela "(Autofire)" da arma; sem ela, a da SMG.
export function tabelasCandidatas(tabela, modo) {
  if (!tabela) return [];
  if (modo !== 'autofogo') return [tabela];
  if (/\(Autofire\)/.test(tabela)) return [tabela];
  return [`${tabela} (Autofire)`, 'DV SMG (Autofire)', tabela];
}

// Centro do token dentro do quadrado de lado 2 × metade (em pixels)?
export const dentroDaArea = (centro, ponto, metade) => Math.abs(ponto.x - centro.x) <= metade + 0.5 && Math.abs(ponto.y - centro.y) <= metade + 0.5;

// Descrição curta do ataque: "Tiro mirado na cabeça", "Autofogo", "Corpo a corpo"…
export function descreverAtaque({ modo, local = 'corpo' }) {
  const base = MODOS[modo] || 'Ataque';
  if (!LOCAIS_MIRADOS[local]) return base;
  return `${modo === 'corpo' ? 'Golpe' : 'Tiro'} mirado ${local === 'item' ? 'no item na mão' : `na ${LOCAIS_MIRADOS[local]}`}`;
}
