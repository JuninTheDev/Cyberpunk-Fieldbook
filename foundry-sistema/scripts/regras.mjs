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
// - Armas de 2077 (o suplemento de fã da mesa, como a wiki resume em system-2077.js): o Ricochete das Power, a Carga e
//   a Rajada das Tech e o teste Smart (no fim deste arquivo).

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

// LUCK (RED p. 130, wiki: system-rules.js): "antes de rolar, gaste pontos de LUCK: +1 no teste por ponto"; os pontos são
// a STAT LUCK e voltam no início de cada sessão. Quanto dá para preparar para o próximo teste: de 0 até a Sorte que resta.
export const sorteParaGastar = (pedida, resta) => Math.max(0, Math.min(Math.trunc(Number(pedida) || 0), Number(resta) || 0));

// Os pontos das especialidades de Role por Rank, pelas notas do criador da wiki (system-criacao.js, roleAbilities): o
// Tech ganha 2 por Rank ("cada Rank de Artífice dá +1 em duas especialidades diferentes"), o Medtech 1 ("cada Rank de
// Medicina dá 1 ponto numa especialidade") e o Solo 1, como os 4 do Rank 4 que a wiki dá (ela não diz a regra do Solo
// por Rank). O máximo em cada especialidade é o Rank (o "até 4 em cada" do Rank 4).
export const PONTOS_DE_ROLE_POR_RANK = { solo: 1, tech: 2, medtech: 1 };
export function pontosDeRole(roleId, rank) {
  const porRank = PONTOS_DE_ROLE_POR_RANK[roleId];
  if (!porRank) return null;
  const r = Math.max(0, Number(rank) || 0);
  return { total: porRank * r, max: r };
}
export const moveFinal = (move, mortal) => Math.max(1, Number(move) + (mortal ? PENALIDADE_MOVE_MORTAL : 0));

// Os bônus de Role nas perícias, como o item de Role do CORE (getRoleMods, em cpr-role.js: o Rank nas perícias da lista
// dele). Valem sempre:
// - o Moto do Nomad (wiki, system-catalog.js: "soma o Rank a Dirigir, Pilotar e Tech de veículos terrestres, aéreos e
//   marítimos"; as seis do item Nomad do CORE);
// - a especialização do Face (system-2077.js: "Soma o Rank de Impacto Carismático em" duas perícias).
// O Investigator do Lawman, com a especialização dele, só vale com pista de caso ativo ("O bônus de caso também vale
// em"), e o Netrunner de 2077 só correndo a NET: ficam para a janela de rolagem (ROADMAP, P1).
export const PERICIAS_DO_MOTO = ['drive-land-vehicle', 'pilot-air-vehicle', 'pilot-sea-vehicle', 'land-vehicle-tech', 'air-vehicle-tech', 'sea-vehicle-tech'];
// Pela perícia (ou família): { rotulo, valor }. especializacao: { nome, pericias } (as da wiki, em gerado.mjs).
export function bonusDeRole({ roleId, rank, especializacao = null }) {
  const valor = Math.max(0, Math.trunc(Number(rank) || 0));
  const em = (pericias, rotulo) => Object.fromEntries(pericias.map(id => [id, { rotulo, valor }]));
  if (!valor) return {};
  if (roleId === 'nomad') return em(PERICIAS_DO_MOTO, 'Moto');
  if (roleId === 'face' && especializacao) return em(especializacao.pericias, especializacao.nome);
  return {};
}

// Os bônus de Role que dependem da situação, que a janela de rolagem oferece desligados num teste de perícia:
// - o Investigator do Lawman de 2077: o Rank em Educação e Percepção, e nas perícias da especialização, "quando acha que
//   está lidando com uma pista de um caso ativo" (system-2077.js);
// - o Netrunner de 2077: o Rank de Interface "em todos os testes técnicos enquanto estiver correndo a NET". Qual teste é
//   técnico, a wiki não lista: a janela oferece em todo teste de perícia, e a mesa decide (MIGRATION_STATUS, dúvidas).
export function situacionaisDeRole({ roleId, rank, especializacao = null, periciaId = null }) {
  const valor = Math.max(0, Math.trunc(Number(rank) || 0));
  if (!valor || !periciaId) return [];
  if (roleId === 'lawman' && ['education', 'perception', ...(especializacao?.pericias ?? [])].includes(periciaId)) {
    return [{ id: 'investigator', rotulo: 'Investigator: pista de caso ativo', valor, ligado: false }];
  }
  if (roleId === 'netrunner') return [{ id: 'interface-2077', rotulo: 'Interface: teste técnico correndo a NET', valor, ligado: false }];
  return [];
}

// Os modificadores comuns do livro (RED p. 130), pela tabela "Modificadores comuns" da wiki e pelos bônus de "Bônus e
// novas tentativas" (system-rules.js). A janela de rolagem oferece todos em todo teste.
export const MODIFICADORES_COMUNS = [
  { id: 'pouca-luz', rotulo: 'Iluminação noturna ou fraca', valor: -1 },
  { id: 'nunca-fez', rotulo: 'Nunca fez isso antes', valor: -1 },
  { id: 'complexa', rotulo: 'Tarefa complexa', valor: -2 },
  { id: 'sem-ferramentas', rotulo: 'Sem as ferramentas ou peças certas', valor: -2 },
  { id: 'dormiu-mal', rotulo: 'Dormiu mal na noite anterior', valor: -2 },
  { id: 'tensao', rotulo: 'Sob tensão extrema', valor: -2 },
  { id: 'exausto', rotulo: 'Exausto', valor: -4 },
  { id: 'bebado', rotulo: 'Extremamente bêbado ou sedado', valor: -4 },
  { id: 'segredo', rotulo: 'Tentando fazer em segredo', valor: -4 },
  { id: 'encoberta', rotulo: 'Tarefa encoberta por fumaça, escuridão etc.', valor: -4 },
  { id: 'complementar', rotulo: 'Perícia complementar', valor: 1 },
  { id: 'tempo-extra', rotulo: 'Tempo extra (4× mais tempo)', valor: 1 }
];

// O extrato (o ledger do CORE no Foundry 12: Eurodólares, IP e Reputação): o saldo depois de somar, subtrair ou definir.
// Como no CORE, subtrair sempre tira (um valor negativo também), e somar soma o valor como veio.
export function novoSaldo(saldo, acao, valor) {
  const v = Math.trunc(Number(valor) || 0);
  if (acao === 'definir') return v;
  if (acao === 'subtrair') return Number(saldo) - Math.abs(v);
  return Number(saldo) + v;
}
// Uma linha do extrato: quando, a ação, a diferença, o saldo depois, o motivo e quem mudou.
export const linhaDoExtrato = ({ acao, antes, saldo, motivo = '', usuario = '', quando = new Date().toISOString() }) =>
  ({ quando, acao, delta: Number(saldo) - Number(antes), saldo: Number(saldo), motivo: String(motivo ?? '').trim(), usuario: String(usuario ?? '') });

// O efeito de um equipamento vale com o uso de agora? Pela ativação do item: "equipado" só equipado; "carregando"
// equipado ou carregando (guardado em casa, não); "manual" sempre, e quem decide é o efeito, ligado ou desligado.
export function efeitoValeNoUso(ativacao, uso) {
  if (ativacao === 'equipado') return uso === 'equipado';
  if (ativacao === 'carregando') return uso === 'equipado' || uso === 'carregando';
  return true;
}

// Estado de ferimento (p. 186): abaixo da metade do HP (arredondada para cima), −2 em tudo; abaixo de 1, −4.
export function estadoDeFerimento(hp, max) {
  if (hp < 1) return { chave: 'mortal', rotulo: 'Mortalmente ferido', penalidade: -4 };
  if (hp < Math.ceil(max / 2)) return { chave: 'grave', rotulo: 'Gravemente ferido', penalidade: -2 };
  if (hp < max) return { chave: 'leve', rotulo: 'Levemente ferido', penalidade: 0 };
  return { chave: 'ileso', rotulo: 'Ileso', penalidade: 0 };
}

// A penalidade do ferimento que entra nos testes. O Editor de Dor (supressão de dor) tira só a de gravemente ferido; a
// de mortalmente ferido continua. Fontes: a wiki ("Pain Editor: Ignora penalidades de Seriously Wounded", system-catalog.js)
// e o CORE (CPRActor#getWoundStateMods).
export const penalidadeDoFerimento = (ferimento, supressaoDeDor = false) => (supressaoDeDor && ferimento?.chave === 'grave' ? 0 : ferimento?.penalidade ?? 0);

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
// A fórmula do dano: a da arma (ou outra: 2d6 do autofogo, 3d6 do cartucho), vezes o multiplicador do autofogo, mais o
// modificador do mestre da janela de rolagem, que entra depois da multiplicação (como o CORE soma os modificadores no
// dano do autofogo). Uma fórmula com mais termos vai entre parênteses na multiplicação ("(3d6 + 2) * 3").
export function expressaoDoDano(base, { multiplicador = 1, modificador = 0 } = {}) {
  const expressao = multiplicador > 1 ? `${/^\d+d\d+$/.test(base) ? base : `(${base})`} * ${multiplicador}` : base;
  return modificador ? `${expressao} ${modificador < 0 ? '-' : '+'} ${Math.abs(modificador)}` : expressao;
}

// Death Save (p. 186): 1d10 + penalidade (a de base, das lesões, e +1 a cada Death Save que passou) contra BODY.
// Passa tirando menos que BODY; o 10 natural sempre falha.
export const passouNoDeathSave = ({ natural, total, body }) => natural !== 10 && total < body;

// Lesão Crítica: o id do item na tabela de 2d6 (faixas [mín, máx, id]).
export const lesaoNaTabela = (faixas, total) => (faixas || []).find(([min, max]) => total >= min && total <= max)?.[2] ?? null;

// ---------------- Modos de ataque ----------------
export const MODOS = {
  corpo: 'Corpo a corpo', tiro: 'Tiro', autofogo: 'Autofogo', supressivo: 'Fogo supressivo', cartucho: 'Espingarda com cartucho', explosivo: 'Explosivo',
  ricochete: 'Ricochete', carga: 'Carga Tech', rajadaTech: 'Rajada Tech'
};
// Os modos que só valem pelo botão (os de 2077 e os de rajada): a arma e a munição não os escolhem sozinhas.
const MODOS_PEDIDOS = ['autofogo', 'supressivo', 'ricochete', 'carga', 'rajadaTech'];
export const LOCAIS_MIRADOS = { cabeca: 'cabeça', perna: 'perna', item: 'item na mão' };
// Os modos que são um tiro só (o tiro, o mirado, os de 2077 de um tiro): no CORE, os que levam o bônus de tiro único.
export const ehTiroUnico = modo => !['autofogo', 'supressivo', 'rajadaTech', 'cartucho', 'explosivo'].includes(modo);
// "A 51 m ou mais": a distância dos bônus de longe (a luneta e os TeleOptics, wiki).
export const LONGE = 51;
export const deLonge = metros => metros !== null && metros !== undefined && Number(metros) >= LONGE;
// A luneta de precisão (wiki: "+1 em tiro único ou tiro mirado contra alvo a 51 m ou mais. Não acumula com cyberware
// óptico"; no CORE, +1 situacional): vale com o alvo a 51 m ou mais, se o cyberware óptico já não dá o bônus nesse tiro.
export const LUNETA = { valor: 1, metros: LONGE };
export const ehLuneta = (nome, catalogo = '') => catalogo === 'core_upgrades:sniping-scope' || /^sniping scope$/i.test(String(nome).trim());
export const lunetaVale = ({ metros, bonusOptico = 0 }) => deLonge(metros) && !(Number(bonusOptico) > 0);
// TeleOptics (cyberóptico), pela wiki (decisão do usuário, 2026-10-12; o CORE dava +1 no mirado e no tiro único, sempre):
// o do RED dá "+1 em tiros mirados contra alvos a 51 m ou mais"; o de 2077, "+1 em tiro único ou mirado" contra alvos a
// 51 m ou mais ("instalar mais de um não soma, e não acumula com a Sniping Scope da arma").
export const TELEOPTICS = {
  'core_cyberware:teleoptics': { nome: 'TeleOptics', tiroUnico: false },
  'cyberware-2077:teleoptics-2077': { nome: 'TeleOptics (2077)', tiroUnico: true }
};
// Qual TeleOptics é o item, pelo id do catálogo ou pelo nome; null se não é um.
export const tipoDeTeleOptics = (nome, catalogo = '') => (TELEOPTICS[catalogo] ? catalogo : Object.keys(TELEOPTICS).find(id => TELEOPTICS[id].nome.toLowerCase() === String(nome).trim().toLowerCase()) ?? null);
// Os TeleOptics (os tipos) que servem neste tiro: o do RED no mirado; o de 2077 no tiro único ou no mirado. Cada tipo,
// uma vez.
export const teleopticsNoTiro = (tipos, { mirado }) => [...new Set(tipos.filter(Boolean))].filter(tipo => mirado || TELEOPTICS[tipo]?.tiroUnico);
export const DV_CARTUCHO = 13;
export const ALCANCE_CARTUCHO = 6;
export const RAIO_SUPRESSAO = 25;
export const AREA_EXPLOSIVO = 10;
export const BALAS_RAJADA = 10;
export const MEDIA_D10 = 5.5;

// O modo do ataque: o botão escolhido (autofogo, supressivo, os de 2077) ou o que a arma e a munição no pente dizem.
export function classificar({ pedido = null, aDistancia = true, tipoDeArma = '', municao = '' }) {
  if (MODOS_PEDIDOS.includes(pedido)) return pedido;
  if (!aDistancia) return 'corpo';
  if (['grenade', 'rocket'].includes(municao) || ['grenadeLauncher', 'rocketLauncher'].includes(tipoDeArma)) return 'explosivo';
  if (municao === 'shotgunShell') return 'cartucho';
  return 'tiro';
}

// Balas que o modo gasta. Das armas de 2077 (perfil2077, mais abaixo): a rajada Tech e o autofogo da Lexington gastam
// o que a arma diz; os dois canos de uma vez, dois cartuchos.
export function balasDoModo(modo, { rajadaTech = BALAS_RAJADA, autofogo = BALAS_RAJADA, doisCanos = false } = {}) {
  if (doisCanos) return 2;
  if (modo === 'rajadaTech') return rajadaTech;
  if (modo === 'autofogo') return autofogo;
  return modo === 'supressivo' ? BALAS_RAJADA : 1;
}

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

// A conta de uma perícia de defesa (a esquiva, a Concentração) pelas partes que o teste vai usar, para a janela de reação:
// "DEX 7 + Evasão 2 − Gravemente ferido 2 + 1d10" e a média (o d10 vale 5,5).
export function contaDaDefesa(partes) {
  const texto = partes.map((parte, i) => `${i ? (parte.valor < 0 ? ' − ' : ' + ') : ''}${parte.rotulo} ${i ? Math.abs(parte.valor) : parte.valor}`).join('');
  return { texto: `${texto} + 1d10`, media: partes.reduce((soma, parte) => soma + parte.valor, 0) + MEDIA_D10 };
}

// O texto que sobe em cima do token quando o ataque se resolve (como o Fluxo de Combate): o HP perdido (e "crítico!"
// com lesão), o que a armadura ou o escudo seguraram, ou o resultado sem dano. estilo: a cor ("acerto", "erro",
// "defesa"). Sem texto (sem DV: o mestre decide): null.
export function textoNoToken({ resultado, dano = null }) {
  if (dano) {
    const perdeu = dano.hpAntes - dano.hpDepois;
    if (perdeu > 0) return { texto: `−${perdeu} HP${dano.lesoes?.length ? ' · crítico!' : ''}`, estilo: 'acerto' };
    return { texto: dano.escudo ? 'No escudo' : 'A armadura segurou', estilo: 'defesa' };
  }
  const texto = { esquivou: 'Esquivou!', errou: 'Errou', fora: 'Fora do alcance', suprimido: 'Suprimido!', firme: 'Firme', acertou: 'Acertou' }[resultado];
  return texto ? { texto, estilo: resultado === 'suprimido' || resultado === 'acertou' ? 'acerto' : 'erro' } : null;
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

// Tabelas candidatas: o autofogo usa a tabela "(Autofire)" da arma; sem ela, a da SMG. O ricochete e a rajada Tech têm
// a tabela de autofogo deles (mais abaixo), qualquer que seja a da arma.
export function tabelasCandidatas(tabela, modo, tipoDeArma = '') {
  if (modo === 'ricochete') return [tabelaDoRicochete(tipoDeArma)];
  if (modo === 'rajadaTech') return [TABELA_DA_RAJADA_TECH];
  if (!tabela) return [];
  if (modo !== 'autofogo') return [tabela];
  if (/\(Autofire\)/.test(tabela)) return [tabela];
  return [`${tabela} (Autofire)`, 'DV SMG (Autofire)', tabela];
}

// Centro do token dentro do quadrado de lado 2 × metade (em pixels)?
export const dentroDaArea = (centro, ponto, metade) => Math.abs(ponto.x - centro.x) <= metade + 0.5 && Math.abs(ponto.y - centro.y) <= metade + 0.5;

// Descrição curta do ataque: "Tiro mirado na cabeça", "Autofogo", "Tiro Smart", "Carga Tech através de cobertura fina",
// "Espingarda com cartucho (Smart), os dois canos"…
export function descreverAtaque({ modo, local = 'corpo', smart = false, cobertura = null, doisCanos = false }) {
  const base = MODOS[modo] || 'Ataque';
  if (LOCAIS_MIRADOS[local]) return `${modo === 'corpo' ? 'Golpe' : 'Tiro'} mirado ${local === 'item' ? 'no item na mão' : `na ${LOCAIS_MIRADOS[local]}`}`;
  const texto = `${smart ? (modo === 'tiro' ? 'Tiro Smart' : `${base} (Smart)`) : base}${doisCanos ? ', os dois canos' : ''}`;
  return COBERTURAS[cobertura] && cobertura !== 'nenhuma' ? `${texto} através de ${COBERTURAS[cobertura].rotulo}` : texto;
}

// ---------------- Armas de 2077 ----------------
// As regras do suplemento de fã que a mesa usa (wiki, system-2077.js: "Os três tipos", "Ricochete (Power)", "Carga Tech"
// e "Armas Smart", sup. p. 30–32), com as escolhas do cpr-2077 do Foundry 12 onde o texto não diz:
// - Power, Ricochete: um tiro único que ricocheteia num alvo atrás de cobertura. Usa a perícia da arma, mas a DV vem da
//   tabela de autofogo (pistolas e SMGs: a linha da SMG; as outras, a do rifle de assalto); REF 8+ esquiva; um dado a
//   menos de dano; o Ballistic Coprocessor dá +2. As armas que não disparam menos de três balas não ricocheteiam.
// - Tech, Carga: o tiro único carregado atravessa a cobertura (metade do dano passa da fina, um quarto da grossa) e, se
//   causar dano, a armadura perde 4 de SP (2 através de cobertura). Rajada: o autofogo carregado, com a tabela de
//   autofogo da SMG e o multiplicador até a "rajada de N" da arma, que atravessa um quarto da cobertura fina e nada da
//   grossa. Depois de uma carga, a arma esfria uma rodada.
// - Smart: só dispara com o cyberware Smart Link. O tiro é o teste Smart, 10 + 1d10 (12 + 1d10 nos modelos de várias
//   balas Smart), no lugar de REF + perícia; a wiki manda combinar com a mesa se substitui ou é uma alternativa (uma
//   configuração do mundo).
// - As regras próprias de alguns modelos, pelo texto de cada arma: os dois canos de uma vez (a Palica sobe o teste
//   Smart para 12 + 1d10; a Testera causa 4d6), gastando os dois cartuchos; os dois alvos da Kappa (se o tiro Smart não
//   pega o primeiro, as balas vão para o segundo, a até 4 m dele); a coronha recolhida da Dian (−1 nos ataques); o
//   autofogo da Lexington, com 7 balas.
export const TABELA_DA_RAJADA_TECH = 'DV SMG (Autofire)';
export const ALCANCE_DOS_DOIS_ALVOS = 4;
export const PENALIDADE_CORONHA = -1;
// As balas Smart mudam para o segundo alvo? Só a até 4 m do primeiro (com meio metro de folga para a grade, como o
// Fluxo de Combate do Foundry 12). Sem distância (outra cena), não.
export const mudaDeAlvo = metros => metros !== null && metros !== undefined && Number(metros) <= ALCANCE_DOS_DOIS_ALVOS + 0.5;
const PARECIDAS_COM_SMG = ['medPistol', 'heavyPistol', 'vHeavyPistol', 'smg', 'heavySmg'];
export const tabelaDoRicochete = tipoDeArma => (PARECIDAS_COM_SMG.includes(tipoDeArma) ? 'DV SMG (Autofire)' : 'DV Assault Rifle (Autofire)');
export const BONUS_COPROCESSADOR = 2;

// O dano do ricochete: um dado a menos, no mínimo um ("3d6" → "2d6").
export const umDadoAMenos = formula => String(formula).replace(/^(\d+)d6/, (todo, dados) => `${Math.max(1, Number(dados) - 1)}d6`);

// O que chega ao alvo em cada carga, pela cobertura, e o SP que a armadura perde se o dano passar dela.
export const COBERTURAS = {
  nenhuma: { rotulo: 'sem cobertura', carga: 1, rajadaTech: 1, ablacao: 4 },
  fina: { rotulo: 'cobertura fina', carga: 0.5, rajadaTech: 0.25, ablacao: 2 },
  grossa: { rotulo: 'cobertura grossa', carga: 0.25, rajadaTech: 0, ablacao: 2 }
};
// O dano que atravessa: a fração do rolado, para baixo; o resto fica na cobertura.
export const atravessarCobertura = (total, fracao) => (fracao >= 1 ? Number(total) : Math.floor(Number(total) * fracao));

// A rodada em que a arma Tech carrega de novo, ou null se já pode: carregou na rodada R, esfria na R + 1 e carrega na
// R + 2. marca: { combate, rodada } da última carga; combate: o de agora ({ id, rodada }), ou null fora de combate.
export function rodadaDaProximaCarga(marca, combate) {
  if (!marca || !combate || marca.combate !== combate.id) return null;
  return combate.rodada <= marca.rodada + 1 ? marca.rodada + 2 : null;
}

// O perfil de 2077 de uma arma, pela flag arma2077 do conteúdo (build/conteudo-2077.mjs); null nas outras armas.
// doisCanos: o que muda ao disparar os dois de uma vez ({ teste } da Palica, { dano } da Testera), ou null. As que só
// disparam cartucho não ricocheteiam (o ricochete é um tiro único).
export function perfil2077(flag, { aDistancia = true, pericia = '', municoes = [] } = {}) {
  const classe = ['power', 'tech', 'smart'].includes(flag?.classe) ? flag.classe : null;
  if (!classe) return null;
  const smart = classe === 'smart';
  const soCartucho = municoes.length > 0 && municoes.every(tipo => tipo === 'shotgunShell');
  return {
    classe,
    ricocheteia: classe === 'power' && Boolean(aDistancia) && pericia !== 'autofire' && !flag.semRicochete && !soCartucho,
    rajadaTech: classe === 'tech' ? Math.max(0, Number(flag.techRajada) || 0) : 0,
    balasDaRajadaTech: Number(flag.techBalas) || BALAS_RAJADA,
    balasDoAutofogo: Number(flag.balasDoAutofogo) || BALAS_RAJADA,
    smart: smart ? (flag.smartVariasBalas ? 12 : 10) : 0,
    doisCanos: smart && flag.smartDoisCanos ? { teste: 12 } : flag.doisCartuchosDano ? { dano: String(flag.doisCartuchosDano) } : null,
    doisAlvos: smart && Boolean(flag.smartDoisAlvos),
    coronhaRetratil: Boolean(flag.coronhaRetratil)
  };
}

// O cyberware que as regras de 2077 procuram: pelo id do catálogo (vale depois de renomear) ou pelo nome.
export const ehSmartLink = (nome, catalogo = '') => catalogo === 'cyberware-2077:smart-link' || /^smart ?link\b/i.test(String(nome).trim());
export const ehCoprocessador = (nome, catalogo = '') => catalogo === 'cyberware-2077:ballistic-coprocessor' || /ballistic coprocessor/i.test(String(nome));
// Reflex Tuner (wiki, system-2077.js): "depois de ser atingido, +1 para se esquivar pelo resto da rodada".
export const REFLEX_TUNER = 1;
export const ehReflexTuner = (nome, catalogo = '') => catalogo === 'cyberware-2077:reflex-tuner' || /^reflex tuner\b/i.test(String(nome).trim());

// O valor do teste Smart neste ataque (10 ou 12), ou 0. Pelo botão "Smart" (pedido "smart", na configuração
// "alternativa") ou, na "substitui", em todo tiro e cartucho não mirado da arma Smart; o autofogo, o supressivo e o
// mirado continuam REF + perícia, como no Foundry 12. Os dois canos da Palica (pedido "doisCanos") são sempre o teste
// Smart, com o valor deles.
export function testeSmart({ perfil, modo, local = 'corpo', pedido = null, smartLink = false, smartAtaque = 'substitui' }) {
  if (perfil?.classe !== 'smart' || !smartLink) return 0;
  if (pedido === 'doisCanos' && perfil.doisCanos?.teste) return perfil.doisCanos.teste;
  if (pedido === 'smart') return perfil.smart;
  return smartAtaque === 'substitui' && ['tiro', 'cartucho'].includes(modo) && !LOCAIS_MIRADOS[local] ? perfil.smart : 0;
}

// O que impede o ataque com uma arma de 2077 (o aviso, depois do nome da arma), ou null. pelaMunicao: o modo que a
// arma e a munição dariam sozinhas ("tiro", "cartucho", "explosivo"); smartLink: o atacante tem o Smart Link
// instalado; smartSemLink: a configuração ("naoDispara" ou "comum").
export function impedimento2077({ modo, perfil, pelaMunicao = 'tiro', cobertura = 'nenhuma', pedido = null, smartLink = false, smartSemLink = 'naoDispara' }) {
  if (perfil?.classe === 'smart' && !smartLink && smartSemLink === 'naoDispara') return 'arma Smart, só dispara com o cyberware Smart Link instalado.';
  if (pedido === 'smart' || (pedido === 'doisCanos' && perfil?.doisCanos?.teste)) {
    if (perfil?.classe !== 'smart') return 'não é uma arma Smart.';
    if (!smartLink) return 'o teste Smart precisa do Smart Link instalado.';
  }
  if (pedido === 'doisCanos' && !perfil?.doisCanos) return 'não dispara os dois canos de uma vez.';
  if (modo === 'ricochete') {
    if (!perfil?.ricocheteia) return 'só as armas Power de tiro único ricocheteiam (as que disparam três balas ou mais, não).';
    if (pelaMunicao !== 'tiro') return 'o ricochete é um tiro único: com cartucho ou explosivo, não.';
  }
  if (modo === 'carga' || modo === 'rajadaTech') {
    if (perfil?.classe !== 'tech') return 'não é uma arma Tech.';
    if (modo === 'rajadaTech' && !perfil.rajadaTech) return 'só faz a carga em tiro único.';
    if (pelaMunicao !== 'tiro') return 'a carga com cartucho (a da Satara: os dois cartuchos, 4d6) ainda não está no sistema; combine com a mesa.';
    if (!COBERTURAS[cobertura]) return `cobertura desconhecida (${cobertura}).`;
    if (!COBERTURAS[cobertura][modo]) return `a rajada Tech não atravessa ${COBERTURAS[cobertura].rotulo}: nada chegaria ao alvo.`;
  }
  return null;
}
