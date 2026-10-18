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
// - Armas de 2077 (a wiki, system-2077.js): a Carga e a Rajada das Tech (ainda do suplemento de fã) e, pelo Mission Kit,
//   o Ricochete e o crítico das Power e a arma Smart (no fim deste arquivo).

// HP máximo (p. 82): 10 + 5 × (BODY + WILL) / 2, arredondado para cima.
export const hpMaximo = (body, will) => 10 + 5 * Math.ceil((Number(body) + Number(will)) / 2);

// Wiki, Combate (system-rules.js): cada rodada dura 3 segundos, também ao voltar pelo rastreador.
export const tempoEntreRodadas = (antes, depois) => (Math.max(depois, 1) - Math.max(antes, 1)) * 3;

// Wiki, Corpo a corpo (p. 175–176): BODY 8+ usa a arma branca de duas mãos com uma.
export const maosDaArma = (arma, body = 0) => arma.maos === 2 && arma.aDistancia === false && body >= 8 ? 1 : arma.maos ?? 0;
// CORE 0.92.4 (_getHands e _getFreeHands): duas mãos + os efeitos, menos as armas empunhadas.
// Wiki, Escudos (p. 183–184): cada escudo equipado ocupa uma mão, mesmo sem HP.
export const maosLivres = ({ armas = [], bonus = 0, body = 0, escudos = 0 } = {}) =>
  2 + bonus - escudos - armas.filter(arma => arma.equipada).reduce((soma, arma) => soma + maosDaArma(arma, body), 0);

// Os quatro critFailEffect do CORE 0.92.4. A wiki detalha o emperramento (qualidade ruim) e os dois tipos de quebra.
// O cartão informa a consequência; a moeda e o estado da arma ficam com a mesa.
export const FALHAS_DA_ARMA = {
  jammed: { rotulo: 'Emperra', texto: 'A arma emperrou. Gaste uma Ação para desemperrá-la.' },
  destroyed: { rotulo: 'Quebra', texto: 'A arma quebrou e está sem uso, mas tem conserto.' },
  destroyedBeyondRepair: { rotulo: 'Quebra sem conserto', texto: 'A arma quebrou sem conserto e está sem uso para sempre.' },
  coinToss: { rotulo: 'Cara ou coroa', texto: 'Cara ou coroa: jogue uma moeda para resolver a falha da arma.' }
};
export function falhaDaArma({ qualidade, efeito = 'jammed', critico }) {
  return qualidade === 'poor' && critico === 'falha' && Object.hasOwn(FALHAS_DA_ARMA, efeito)
    ? { efeito, texto: FALHAS_DA_ARMA[efeito].texto } : null;
}

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

// A Role pelo nome que está na ficha ("Nomad") ou pelo id ("nomad"), entre as da wiki. As do suplemento de fã que saíram
// com o Mission Kit (Face, Corpo) são a do RED de onde vinham (antigas: o roleAliases da wiki), como a wiki faz com os
// personagens antigos.
export function acharRole(nome, roles, antigas = {}) {
  const chave = String(nome ?? '').trim().toLowerCase();
  if (!chave) return null;
  const id = antigas[chave] ?? chave;
  return roles.find(role => role.id === id || role.nome.toLowerCase() === chave) ?? null;
}

// Os bônus de Role nas perícias, como o item de Role do CORE (getRoleMods, em cpr-role.js: o Rank nas perícias da lista
// dele). Das 10 Roles do RED, só o Moto do Nomad soma sempre (wiki, system-catalog.js: "soma o Rank a Dirigir, Pilotar e
// Tech de veículos terrestres, aéreos e marítimos"; as seis do item Nomad do CORE). A especialização do Face e o
// Investigator do Lawman eram das Roles de 2077, que saíram com o Mission Kit.
export const PERICIAS_DO_MOTO = ['drive-land-vehicle', 'pilot-air-vehicle', 'pilot-sea-vehicle', 'land-vehicle-tech', 'air-vehicle-tech', 'sea-vehicle-tech'];
// Pela perícia: { rotulo, valor }.
export function bonusDeRole({ roleId, rank }) {
  const valor = Math.max(0, Math.trunc(Number(rank) || 0));
  if (!valor || roleId !== 'nomad') return {};
  return Object.fromEntries(PERICIAS_DO_MOTO.map(id => [id, { rotulo: 'Moto', valor }]));
}

// Facedown (RED p. 194; a wiki, "Reputação e facedown" e o cartão rápido; o CPRFacedownRoll do CORE): COOL + Reputação +
// 1d10, um teste enfrentado. A reputação de covarde conta negativa: a Reputação da ficha pode ser negativa. O que a wiki
// diz do resultado vai no cartão.
export const FACEDOWN = {
  rotulo: 'Facedown', formula: 'COOL + Reputação + 1d10',
  dica: 'Teste enfrentado. Empate: nada acontece. Quem perde recua ou fica com −2 nas ações contra o outro até derrotá-lo uma vez.'
};

// A Interface do Netrunner (a wiki, "Habilidades de Interface", RED p. 198–201 e Kit p. 26–27; o CPR.interfaceAbilities do
// CORE): o Rank de Interface + 1d10 contra a DV, com o custo e o que cada habilidade faz (o cartão). Com o Mission Kit, o
// Backdoor do livro-base se chama Breach (a chave segue a do CORE, "backdoor"), o Scanner é 1 Ação NET, e entra o
// Quickhack, contra o cyberware de quem tem Neuroport. A Defesa e a Velocidade são as outras
// duas rolagens de Interface do CORE: a Defesa contra o ataque na NET ("Combate na NET": ATK + 1d10 contra Interface +
// 1d10) e a Velocidade contra o Black ICE à espreita (a wiki, "Black ICE": Interface + bônus de velocidade + 1d10 contra
// SPD do ICE + 1d10). A chave de cada uma é a do bônus dos programas (system.bonus.interface).
export const HABILIDADES_DE_INTERFACE = [
  { id: 'scanner', rotulo: 'Scanner', custo: '1 Ação NET', dica: 'Acha no mundo físico os pontos de acesso da área; quanto maior, mais longe.' },
  { id: 'backdoor', rotulo: 'Breach', custo: '1 Ação NET', dica: 'Contra a DV da senha ou do Passwall: passa por uma senha da arquitetura ou por um Passwall do Neuroport.' },
  { id: 'cloak', rotulo: 'Cloak', custo: '1 Ação NET', dica: 'O resultado vira a DV: esconde seus rastros e seus vírus.' },
  { id: 'control', rotulo: 'Control', custo: '1 Ação NET + 1 por comando', dica: 'Contra a DV do nó: toma um nó de controle (câmeras, torretas, portas, drones).' },
  { id: 'eyedee', rotulo: 'Eye-Dee', custo: '1 Ação NET', dica: 'Contra a DV do arquivo: descobre o que é um arquivo e quanto vale.' },
  { id: 'pathfinder', rotulo: 'Pathfinder', custo: '1 Ação NET', dica: 'Revela o mapa: andares iguais ao resultado, até a primeira obstrução com DV maior.' },
  { id: 'slide', rotulo: 'Slide', custo: '1 Ação NET (1×/turno)', dica: 'Contra PER do Black ICE + 1d10: foge de um Black ICE não demoníaco para um andar vizinho.' },
  { id: 'virus', rotulo: 'Virus', custo: 'Ações NET definidas pelo mestre', dica: 'Contra a DV do mestre, só no andar mais baixo: deixa até 2 mudanças.' },
  { id: 'zap', rotulo: 'Zap', custo: '1 Ação NET', dica: 'Contra DEF do programa + 1d10 ou Interface + 1d10: 1d6 no REZ de um programa ou direto no cérebro.' },
  { id: 'quickhack', rotulo: 'Quickhack', custo: '1 Ação NET', dica: 'Contra a DV do quickhack: hackeia o cyberware de quem tem Neuroport. O Rank dá os níveis: DV6 no Rank 1, DV8 no 2, DV10 no 3 e DV12 no 4.' },
  { id: 'defesa', rotulo: 'Defesa', custo: 'contra um ataque na NET', dica: 'Contra o ATK do Black ICE ou do programa + 1d10.' },
  { id: 'velocidade', rotulo: 'Velocidade', custo: 'ao encontrar Black ICE', dica: 'Contra SPD do Black ICE + 1d10: se o ICE vencer, você sofre o efeito na hora; depois ele entra no topo da fila de iniciativa.' }
];
// As Ações NET por turno pelo Rank de Interface (a wiki, "Ações por turno", RED p. 197): 2 do Rank 1 ao 3, 3 do 4 ao 6, 4
// do 7 ao 9 e 5 no 10. Sem Interface, nenhuma.
export function acoesDeNet(rank) {
  const r = Math.trunc(Number(rank) || 0);
  if (r < 1) return 0;
  return r >= 10 ? 5 : 2 + Math.floor((r - 1) / 3);
}

// Os programas no combate da NET (a wiki, "Como ler os cartões", "Programas: ataque" e "Combate na NET"; o CORE): o ataque
// é Interface + ATK + 1d10, contra a Interface + 1d10 do netrunner (a Defesa) ou a DEF + 1d10 do programa. O programa de
// ataque desativa sozinho depois de usado; o anti-programa só afeta programas (o dano padrão em programa, o outro em Black
// ICE) e o anti-pessoal só afeta netrunners (no cérebro). Na NET não há crítico (o CORE).
export const DANO_DE_PROGRAMA = {
  antiprogramattacker: [{ id: 'padrao', rotulo: 'em programa' }, { id: 'blackIce', rotulo: 'em Black ICE' }],
  antipersonnelattacker: [{ id: 'padrao', rotulo: 'no cérebro' }]
};
export const programaDeAtaque = classe => Boolean(DANO_DE_PROGRAMA[classe]);
// Onde o dano de cada um entra (os botões do mestre no cartão): o anti-pessoal no cérebro; o anti-programa num programa e,
// o "em Black ICE", na REZ do Black ICE ou do demônio marcado; o Zap do netrunner, nos três (o NET Architect da mesa: "Zap
// vale contra qualquer inimigo"). O Zap do demônio (ele só usa Zap e Control) vai no intruso: no cérebro ou num programa.
// O Black ICE, pela classe: o anti-pessoal no cérebro, o anti-programa num programa.
export const ONDE_O_DANO_ENTRA = {
  antipersonnelattacker: { padrao: ['cerebro'] },
  antiprogramattacker: { padrao: ['programa'], blackIce: ['rez'] },
  zap: ['cerebro', 'programa', 'rez'],
  zapDoDemonio: ['cerebro', 'programa'],
  blackIce: { antipersonnel: ['cerebro'], antiprogram: ['programa'] }
};
// O dano no cérebro (a wiki, "Combate na NET" e os defensores; o _applyDamage "brain" do CORE): direto no HP, sem a
// armadura e sem crítico. O Shield ativo anula o primeiro dano cerebral de programa que não é Black ICE (o Zap não é
// programa) e se desativa; o Armor ativo reduz em 4 todo dano cerebral. Quem chama diz se o Shield vale (shield).
export const REDUCAO_DO_ARMOR = 4;
export function danoNoCerebro({ dano, shield = false, armor = false }) {
  const bruto = Math.max(0, Math.trunc(Number(dano) || 0));
  if (shield && bruto > 0) return { recebido: 0, shield: true, reduzido: 0 };
  const reduzido = armor ? Math.min(REDUCAO_DO_ARMOR, bruto) : 0;
  return { recebido: bruto - reduzido, shield: false, reduzido };
}

// A fórmula de dano que vale ('0' e vazio não rolam: o efeito do programa é outro, como o do DeckKRASH).
export const formulaDeDano = formula => (formula && String(formula).trim() !== '0' ? String(formula).trim() : '');
// A REZ são os "pontos de vida" do programa: a do catálogo menos a perdida, nunca abaixo de 0. Em 0, ele desativa.
export const rezAtual = (rez, perdida) => Math.max(0, (Number(rez) || 0) - Math.max(0, Number(perdida) || 0));

// O Black ICE e o demônio (a wiki, "Black ICE", "Como ler os cartões" e "Demônios", RED p. 204–212; o blackIce e o demon
// do CORE): os números que rolam (o número + 1d10, o createStatRoll do CORE) e o que cada um enfrenta. A REZ não rola, e
// as Ações NET do demônio só contam.
export const NUMEROS_DA_NET = {
  blackice: [
    { id: 'per', rotulo: 'PER', dica: 'Contra o Slide do netrunner (Interface + 1d10): quão difícil é driblar o ICE.' },
    { id: 'spd', rotulo: 'SPD', dica: 'Ao ser encontrado à espreita, contra a Interface + velocidade + 1d10 do netrunner: se o ICE vencer, o netrunner sofre o efeito na hora.' },
    { id: 'atk', rotulo: 'ATK', dica: 'O ataque, uma vez por turno: contra a Interface + 1d10 do netrunner.' },
    { id: 'def', rotulo: 'DEF', dica: 'A defesa: contra o ataque do programa (Interface + ATK + 1d10) ou o Zap.' }
  ],
  demonio: [
    { id: 'interface', rotulo: 'Interface', dica: 'Sem DEF: defende com Interface + 1d10. Só usa Zap e Control.' },
    { id: 'valorDeCombate', rotulo: 'Valor de combate', dica: 'Ataca com os drones e as torretas dos nós de controle: valor de combate + 1d10.' }
  ]
};
// A iniciativa do Black ICE e do demônio (a wiki: "entra no topo da fila de iniciativa"; o CPRCombat do CORE): não rolam e
// ficam com 1 a mais que a maior iniciativa dos outros, ou 30 se ninguém rolou ainda. O CORE soma ainda a SPD (ou a
// Interface) a esse número (ver as dúvidas no MIGRATION_STATUS).
export const INICIATIVA_SEM_FILA = 30;
export function iniciativaNoTopo(outras = []) {
  const rolaram = outras.filter(Number.isFinite);
  return rolaram.length ? Math.max(...rolaram) + 1 : INICIATIVA_SEM_FILA;
}
// A ficha pelo modelo da wiki (gerado.BLACK_ICE ou gerado.DEMONIOS): o nome, os números e a REZ cheia. É o "configurar
// pelo programa" do Black ICE do CORE, com a tabela da wiki no lugar do programa (o CORE 0.92.4 não traz programas de
// Black ICE).
export function fichaDoModelo({ id, nome, rez, ...numeros }) {
  return { name: nome, system: { modelo: id, ...numeros, rez: { value: rez, max: rez } } };
}
// A REZ do Black ICE e do demônio depois do dano (o _applyDamage deles no CORE): sem armadura nem crítico, e nunca abaixo
// de 0, como a dos programas. Em 0, ele é desativado (a wiki: "REZ: os pontos de vida do programa; em 0 ele fica
// desativado").
export const rezDepoisDoDano = (rez, dano) => Math.max(0, (Number(rez) || 0) - Math.max(0, Math.trunc(Number(dano) || 0)));

// O capanga (o mook do CORE) equipa ou instala o que recebe, como o handleMookDraggedItem do CORE: o cyberware é
// instalado, e o que se equipa no CORE (o "equippable": arma, armadura, roupa, cyberdeck, droga e equipamento) entra
// equipado. O resto (munição, programa, upgrade, veículo, lesão) fica como veio.
export const AO_RECEBER_CAPANGA = {
  arma: { 'system.equipada': true }, armadura: { 'system.equipada': true },
  roupa: { 'system.uso': 'equipado' }, cyberdeck: { 'system.uso': 'equipado' }, droga: { 'system.uso': 'equipado' }, equipamento: { 'system.uso': 'equipado' },
  cyberware: 'instalar'
};

// As rolagens de habilidade de Role do RED, como o item de Role do CORE (_createRoleRoll, nas habilidades com hasRoll) e
// o texto da wiki (system-catalog.js, "As dez Roles do RED"):
// - Rockerboy, Impacto Carismático: "Rolagem: Rank + 1d10; DV 8 para uma pessoa, 10 para até seis, 12 para um grupo
//   maior";
// - Media, Credibilidade: os rumores, "Rank + 1d10, pelo menos duas vezes por semana";
// - Fixer, Operator: "Haggling é um teste enfrentado de COOL + Trading + Operator + 1d10" (o "Haggle" do item do CORE);
// - Lawman, Backup: "rola 1d10 e obtém resposta se o resultado for igual ou inferior ao Rank" (regras.backup). O item do
//   CORE não rola o Backup; a wiki diz como;
// - Tech, Artífice: as quatro Expertises ("Field Expertise soma o Rank a testes técnicos relevantes e permite reparos
//   temporários; Upgrade Expertise melhora um item; Fabrication produz itens existentes; Invention projeta um item ou
//   upgrade novo com aprovação do GM"). No item do CORE, cada uma rola TECH + uma perícia de TECH a escolher ("varying") +
//   os pontos dela;
// - Medtech, Medicina: a Cirurgia e a Tecnologia Médica, as perícias que só o Medtech tem (o "Surgery Skill" e o "Medical
//   Tech Skill" do item do CORE): TECH + a perícia + 1d10, com o nível que vem das especialidades (periciasDerivadas).
// O Netrunner (a Interface) fica no C5 do ROADMAP. O Solo, o Exec e o Nomad não rolam a habilidade de Role.
// Os campos: habilidade (o rótulo do Rank, quando não é o da rolagem), pericia (a perícia do teste), especialidade (os
// pontos dela no lugar do Rank), escolherPericia (uma perícia do atributo, a escolher), derivada (o nível no lugar do Rank),
// atributo e backup.
const EXPERTISE = { atributo: 'tech', escolherPericia: true, formula: 'TECH + perícia + pontos + 1d10' };
export const ROLAGENS_DE_ROLE = {
  rockerboy: [{ id: 'impacto-carismatico', rotulo: 'Impacto Carismático', formula: 'Rank + 1d10', dica: 'DV 8 para uma pessoa, 10 para até seis, 12 para um grupo maior.' }],
  media: [{ id: 'credibilidade', rotulo: 'Credibilidade', formula: 'Rank + 1d10', dica: 'Os rumores: pelo menos duas vezes por semana, se não estiver fora do radar.' }],
  fixer: [{ id: 'pechinchar', rotulo: 'Pechinchar', formula: 'COOL + Negociação + Operator + 1d10', habilidade: 'Operator', pericia: 'trading', dica: 'Teste enfrentado.' }],
  lawman: [{ id: 'backup', rotulo: 'Backup', formula: '1d10 até o Rank', backup: true, dica: 'Vem se o d10 for igual ou menor que o Rank; um d6 diz em quantas rodadas.' }],
  tech: [
    { id: 'campo', rotulo: 'Especialização de Campo', especialidade: 'Field Expertise', ...EXPERTISE, dica: 'Testes técnicos fora do Artífice e reparos temporários (como uma Ação).' },
    { id: 'upgrade', rotulo: 'Especialização de Upgrade', especialidade: 'Upgrade Expertise', ...EXPERTISE, dica: 'Melhorar um item.' },
    { id: 'fabricacao', rotulo: 'Especialização de Fabricação', especialidade: 'Fabrication Expertise', ...EXPERTISE, dica: 'Fabricar um item que já existe.' },
    { id: 'invencao', rotulo: 'Especialização de Invenção', especialidade: 'Invention Expertise', ...EXPERTISE, dica: 'Inventar um item ou upgrade novo, com o mestre.' }
  ],
  medtech: [
    { id: 'cirurgia', rotulo: 'Cirurgia', derivada: 'Surgery Skill', atributo: 'tech', formula: 'TECH + Cirurgia + 1d10', dica: 'Lesões críticas graves e instalação de cyberware.' },
    { id: 'tecnologia-medica', rotulo: 'Tecnologia Médica', derivada: 'Medical Tech Skill', atributo: 'tech', formula: 'TECH + Tecnologia Médica + 1d10', dica: 'Fabricar fármacos e operar cryopumps e cryotanks.' }
  ]
};
// As perícias que vêm das especialidades de Role, como as derivadas do criador da wiki (system-criacao.js, roleAbilities;
// roleAbilityRanks, em criador.js): a Cirurgia do Medtech é 2 por ponto em Cirurgia, até 10, e a Tecnologia Médica, 1 por
// ponto em Farmacêutica e em Criossistemas. Como na Consciência de Combate do Solo, os pontos valem como estão na ficha (ela
// avisa quando passam do Rank). { id: nível }.
export function periciasDerivadas(derivadas = [], habilidades = {}) {
  return Object.fromEntries(derivadas.map(({ id, de, max = null }) => {
    const soma = Object.entries(de).reduce((total, [especialidade, fator]) => total + Math.max(0, Number(habilidades?.[especialidade]) || 0) * fator, 0);
    return [id, max === null ? soma : Math.min(max, soma)];
  }));
}
// O Backup do Lawman (wiki): "rola 1d10 e obtém resposta se o resultado for igual ou inferior ao Rank. Um d6 determina em
// quantas rodadas chega o grupo; um 6 chama uma força um nível acima (no Rank 10, dois grupos)". O 6 é o do d6.
export function backup({ d10, rank, d6 = null }) {
  const veio = Number(d10) <= Number(rank);
  return { veio, rodadas: veio ? d6 : null, acima: veio && d6 === 6, grupos: veio ? (Number(rank) >= 10 ? 2 : 1) : 0 };
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
// A arma Power (o Kit, p. 31): "o dano bônus da lesão sobe 5: 10 em vez de 5".
export const BONUS_CRITICO_POWER = 10;
export const bonusDoCritico = perfil => (perfil?.classe === 'power' ? BONUS_CRITICO_POWER : BONUS_CRITICO);
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
  ricochete: 'Ricochete'
};
// Os modos que só valem pelo botão (os de 2077 e os de rajada): a arma e a munição não os escolhem sozinhas.
const MODOS_PEDIDOS = ['autofogo', 'supressivo', 'ricochete'];
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
// "+1 em tiros mirados contra alvos a 51 m ou mais". O de 2077 saiu da wiki de 2026-10-17 ("Cyberware que repete um do
// RED (vale o do RED): o Kerenzikov, o TeleOptics, ..."; C29): o item de 2077 que um ator ainda tenha, pelo id antigo do
// catálogo ou pelo nome, é o do RED.
export const TELEOPTICS = {
  'core_cyberware:teleoptics': { nome: 'TeleOptics', tiroUnico: false }
};
const TELEOPTICS_DO_RED = { 'cyberware-2077:teleoptics-2077': 'core_cyberware:teleoptics', 'teleoptics (2077)': 'core_cyberware:teleoptics' };
// Qual TeleOptics é o item, pelo id do catálogo ou pelo nome; null se não é um.
export const tipoDeTeleOptics = (nome, catalogo = '') => {
  if (TELEOPTICS[catalogo]) return catalogo;
  const chave = String(nome).trim().toLowerCase();
  return TELEOPTICS_DO_RED[catalogo] ?? TELEOPTICS_DO_RED[chave] ?? Object.keys(TELEOPTICS).find(id => TELEOPTICS[id].nome.toLowerCase() === chave) ?? null;
};
// Os TeleOptics (os tipos) que servem neste tiro: o do RED, no mirado. Cada tipo, uma vez.
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

// Balas que o modo gasta. Das armas de 2077 (perfil2077, mais abaixo): o autofogo da Lexington gasta o que a arma diz;
// os dois canos de uma vez, dois cartuchos.
export function balasDoModo(modo, { autofogo = BALAS_RAJADA, doisCanos = false } = {}) {
  if (doisCanos) return 2;
  if (modo === 'autofogo') return autofogo;
  return modo === 'supressivo' ? BALAS_RAJADA : 1;
}

// As balas por tiro de 2077 (a wiki: a Yukimura, a Shingen, a Chao, a Kappa, a Masamune e a Nowaki gastam 3; a Zhuo, 8
// cartuchos), como o foundry-2077 do Foundry 12: o tiro único (o tiro, o mirado, o ricochete e o cartucho) gasta as
// balas do modelo. Com o dano com menos balas, "com menos de 3 no pente, dispara o que tem" (pelo menos 1) e causa o
// dano menor; sem ele (a Zhuo), precisa de todas. null: o modo gasta o de sempre (balasDoModo).
export const MODOS_DE_TIRO_UNICO = ['tiro', 'ricochete', 'cartucho'];
export function balasPorTiro({ modo, perfil, pente = 0, doisCanos = false }) {
  const porTiro = perfil?.balasPorTiro ?? 1;
  if (porTiro <= 1 || doisCanos || !MODOS_DE_TIRO_UNICO.includes(modo)) return null;
  if (!perfil.danoComMenos) return { balas: porTiro, danoComMenos: null };
  const balas = Math.max(1, Math.min(porTiro, Number(pente) || 0));
  return { balas, danoComMenos: balas < porTiro ? perfil.danoComMenos : null };
}

// Munição que não causa dano (a tabela de munição da wiki, system-catalog.js, com o texto dela): quem é pego sofre só o
// efeito. Os testes e os estados são aplicados por municoes.mjs; a fumaça continua com a mesa.
export const MUNICAO_SEM_DANO = {
  biotoxin: 'quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre 3d6 direto no HP.',
  emp: 'quem é atingido faz Cybertech DV15 ou o mestre escolhe 2 cyberwares ou eletrônicos que param por 1 minuto.',
  flashbang: 'quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre as lesões Olho danificado e Ouvido danificado por 1 minuto, sem dano bônus.',
  poison: 'quem é atingido faz Resistir a Tortura/Drogas DV13 ou sofre 2d6 direto no HP.',
  sleep: 'quem é atingido faz Resistir a Tortura/Drogas DV13 ou cai inconsciente por 1 minuto, até sofrer dano ou alguém usar uma Ação para acordá-lo.',
  smoke: 'Cobre de fumaça uma área de 10 × 10 m por 1 minuto. Agir dentro dela costuma ter −4.',
  teargas: 'quem tem olhos de carne faz Resistir a Tortura/Drogas DV13 ou sofre Olho danificado por 1 minuto, sem dano bônus.'
};

// Munição RED, p. 344–347 (system-catalog.js). O dano da toxina é próprio, sem crítico, armadura ou multiplicador.
export const RESISTENCIAS_MUNICAO = {
  biotoxin: { pericia: 'resist-torture-drugs', dv: 15, dano: '3d6' },
  poison: { pericia: 'resist-torture-drugs', dv: 13, dano: '2d6' },
  sleep: { pericia: 'resist-torture-drugs', dv: 13 },
  flashbang: { pericia: 'resist-torture-drugs', dv: 15 },
  teargas: { pericia: 'resist-torture-drugs', dv: 13 },
  emp: { pericia: 'cybertech', dv: 15 }
};
export const municaoPoeFogo = (efeito, dano) => efeito === 'incendiary' && dano.passou && dano.bruto > 0;
// Decisão do usuário, 17-10-2026: inclui mirado; a segunda tentativa mantém o local e só soma Sorte ao 10 + 1d10.
export const podeRepetirComInteligente = ({ efeito, modo, ataque, contra, municao = '' }) => efeito === 'smart'
  && (modo === 'tiro' || (modo === 'explosivo' && municao === 'rocket'))
  && Number.isFinite(contra) && ataque <= contra && ataque >= contra - 4;

// O electronic e o providesHardening do CORE. A blindagem protege a peça e as opções do mesmo conjunto, mesmo
// quando ela própria não é eletrônica (Hardened Shielding). Não muda instalação, uso nem Humanidade ao desligar.
export function vulneraveisAoEmp(itens) {
  const upgradeEmUso = item => {
    const pai = itens.find(outro => outro.id === item.system.instaladoEm);
    return Boolean(pai) && pai.system.uso !== 'guardado';
  };
  const emUso = item => item.type === 'cyberware' ? item.system.instalado
    : item.type === 'armadura' ? item.system.equipada
      : item.type === 'upgrade' ? upgradeEmUso(item) : ['carregando', 'equipado'].includes(item.system.uso);
  const ativos = itens.filter(emUso);
  const conjunto = item => item.system.instaladoEm || item.id;
  return ativos.filter(item => item.system.eletronico && !ativos.some(outro => outro.system.endurecido && conjunto(outro) === conjunto(item)));
}

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

// Agarrar (a wiki, "Agarrar e arremessar", p. 177): os dois rolam DEX + Briga + 1d10, e quem agarra precisa superar a
// resistência (o teste resistido: empate é do defensor, p. 128). Agarrados, os dois têm −2 em todas as ações.
export const AGARRAO = { penalidade: -2 };
export const venceuOAgarrao = (ataque, defesa) => Number(ataque) > Number(defesa);

// O Jack In (a wiki, "Quickhacks no Neuroport", Kit p. 16–17 e 26–27): entra no Neuroport de um alvo à vista, no alcance,
// com Interface + 1d10 contra WILL + 1d10 do alvo. Falhando (o teste resistido: o empate é do alvo), entra assim mesmo,
// mas o alvo percebe. O alcance do deck externo é 6 m, 8 m com o Range Upgrade ("Do que o netrunner precisa").
export const JACK_IN = { alcance: 6, rangeUpgrade: 2 };
// O deck na Neuroport Cyberdeck Port (a wiki, "Do que o netrunner precisa": "20 m contra arquiteturas NET e 50 m contra
// Neuroports [...] ela não aceita hardware"): o alcance da porta, sem o Range Upgrade.
export const DECK_NA_PORTA = { arquitetura: 20, neuroport: 50 };
export const alcanceDoJackIn = ({ rangeUpgrade = false, naPorta = false } = {}) => (naPorta ? DECK_NA_PORTA.neuroport : JACK_IN.alcance + (rangeUpgrade ? JACK_IN.rangeUpgrade : 0));
export const percebeuOJackIn = (ataque, defesa) => !(Number(ataque) > Number(defesa));
// O firewall de fábrica (a wiki, "Firewall de fábrica", Kit p. 26: "Todo Neuroport tem um. Com Interface Rank 1 ou 2, o
// Jack In pede antes um teste de Interface contra DV6; falhar não alerta o alvo. Do Rank 3 em diante, o netrunner passa
// direto"): passa com o total acima da DV.
export const FIREWALL_DE_FABRICA = { dv: 6, rankSemTeste: 3 };
export const pedeOFirewall = rankDeInterface => Number(rankDeInterface) < FIREWALL_DE_FABRICA.rankSemTeste;
export const passouOFirewall = total => Number(total) > FIREWALL_DE_FABRICA.dv;
// "Outro netrunner sempre sabe quando entraram no Neuroport dele" (a wiki): o alvo com Interface percebe sem rolar.
export const sabeDoJackIn = rankDeInterfaceDoAlvo => Number(rankDeInterfaceDoAlvo) > 0;

// O Breach nos Passwalls (a wiki: "passa um Passwall (um por Self-ICE do alvo), Interface contra a DV dele: 6 com um
// Self-ICE, 8 com dois, 10 com três"; o Self-ICE vai até 3). O Breach passa um por vez, com o resultado acima da DV, e
// o quickhack só vem depois de todos.
export const DV_DO_PASSWALL = { 1: 6, 2: 8, 3: 10 };
export function passwallsDoAlvo(selfIces) {
  const quantos = Math.max(0, Math.min(3, Math.trunc(Number(selfIces)) || 0));
  return { quantos, dv: DV_DO_PASSWALL[quantos] ?? null };
}
export const passouOPasswall = (total, dv) => Number(total) > Number(dv);
// Pelo Personal Link, todos os Passwalls são ignorados, inclusive o Self-ICE que volta depois do EMP (Kit p. 27).
export const passwallsPassados = (ligacao, quantos) => ligacao?.direta ? quantos : Math.min(ligacao?.passados ?? 0, quantos);

// O quickhack (a wiki: "depois de passar todos os Passwalls, Interface contra a DV do quickhack. Um quickhack por alvo
// por turno: errou o Puppet, não dá para tentar o Overheat no mesmo alvo nesse turno"; "O Rank dá os níveis: DV6 no Rank
// 1, DV8 no 2, DV10 no 3 e DV12 no 4"): o netrunner faz os do Rank dele para baixo; passa com o resultado acima da DV. A
// vez é por rodada de combate (fora de combate, não conta); errado ou certo, o quickhack daquela rodada já foi.
export const fazOQuickhack = (rankDeInterface, rankDoQuickhack) => Number(rankDoQuickhack) >= 1 && Number(rankDeInterface) >= Number(rankDoQuickhack);
export const passouOQuickhack = (total, dv) => Number(total) > Number(dv);
export const jaFezOQuickhack = (ultimo, agora) => Boolean(agora?.combate && ultimo?.combate === agora.combate && ultimo.rodada === agora.rodada);

// O que o sistema aplica dos quickhacks que dão certo (os cartões do Kit, p. 16; a decisão do usuário: "o sistema aplica o
// que é número"), pelo id do catálogo: o dano direto no HP (dano), o fogo por turno (fogo), o MOVE a menos (move) e o
// inconsciente e caído até sofrer dano; "60 segundos" são 20 rodadas. O resto vai ao cartão.
export const EFEITOS_DE_QUICKHACK = {
  'synapse-burnout': { dano: '3d6' },
  overheat: { fogo: 4 },
  'impair-movement': { move: '1', rodadas: 20 },
  slow: { move: '1d6', rodadas: 20 },
  'system-reset': { inconsciente: true, caido: true, ateDano: true, rodadas: 20 }
};

// A expulsão (a wiki: "o alvo que percebe [...] tenta te expulsar com uma Ação: WILL + Concentração + 1d10 contra a sua
// Interface + 1d10"): o empate é do netrunner, que defende ("Teste contra outra pessoa: empate = o defensor vence").
export const expulsou = (total, defesa) => Number(total) > Number(defesa);

// As Ações NET fora da arquitetura (a wiki: "Cada Neuroport é uma Ação NET"; o Breach e o quickhack, 1 Ação NET cada): em
// combate, as da rodada contam até as do Rank (acoesDeNet); fora de combate, não contam. registro: { combate, rodada,
// usadas }; agora: { combate, rodada } ou null.
export const acoesNetNaRodada = (registro, agora) => (agora?.combate && registro?.combate === agora.combate && registro.rodada === agora.rodada ? Number(registro.usadas) || 0 : 0);
export const semAcaoNet = (registro, agora, max) => Boolean(agora?.combate) && acoesNetNaRodada(registro, agora) >= Number(max);

// O Jack Out inseguro (a wiki: "Você fica ligado até ser expulso, sair do alcance, fazer o Jack Out ou o alvo morrer.
// Desligado de qualquer jeito que não o Jack Out, é um Jack Out inseguro [...] e você só entra de novo nesse alvo em 60
// minutos"): o bloqueio daquele alvo, pelo tempo do mundo (em segundos). bloqueios: [{ alvo, ate }].
export const JACK_OUT_INSEGURO = { segundos: 3600 };

// O Neuroport como arquitetura NET (a wiki, Kit p. 26–27: "Sem Self-ICE nem Black ICE, tem um andar só: o nó de controle
// do Holophone (DV10). Cada Passwall (Self-ICE) e cada Black ICE é um andar a mais"; o Black ICE é o do cyberdeck ligado
// a ele). Os andares de cima para baixo, como nos exemplos da wiki: o Black ICE do deck, os Passwalls e o Holophone (o
// dono pode trocar a ordem; o mestre narra). A decisão do usuário de 2026-10-17: sem descer os andares.
export const HOLOPHONE = { dv: 10 };
export function andaresDoNeuroport({ blackIce = [], selfIce = 0 } = {}) {
  const { quantos, dv } = passwallsDoAlvo(selfIce);
  return [...blackIce.map(nome => `Black ICE: ${nome} (do deck)`), ...Array.from({ length: quantos }, () => `Passwall (DV${dv})`), `Nó de controle: Holophone (DV${HOLOPHONE.dv})`];
}

// A conexão direta pelo Personal Link (a wiki, "Conexão direta", Kit p. 27): "Ligado direto, você ganha uma Ação NET a
// mais por turno e passa direto por todos os Passwalls"; "Se você ou o alvo se afastar mais de 2 m (1 quadrado) [...] você
// é desligado à força". Num alvo que não quer, "só se ele estiver inconsciente ou contido sem poder resistir"; a decisão do
// usuário de 2026-10-17: sem rolar, com o alvo inconsciente ou agarrado, ou quando o dono aceita.
export const CONEXAO_DIRETA = { alcance: 2, acoesNet: 1 };
export const acoesNetComDireta = (acoesDoRank, direta) => Number(acoesDoRank) + (direta ? CONEXAO_DIRETA.acoesNet : 0);
// O alcance de uma ligação: a direta, os 2 m do cabo; a outra, o do deck (netrunner: { rangeUpgrade, naPorta }).
export const alcanceDaLigacao = (ligacao, netrunner = {}) => (ligacao?.direta ? CONEXAO_DIRETA.alcance : alcanceDoJackIn(netrunner));
export const bloqueioDoAlvo = (bloqueios, alvo, agora) => (bloqueios ?? []).find(bloqueio => bloqueio.alvo === alvo && Number(bloqueio.ate) > Number(agora)) ?? null;

// Estrangular e Derrubar (a mesma página): o BODY de quem agarra direto no HP, sem a armadura. Estrangulando, "se levaria
// abaixo de 0, fica com 1 HP e desmaia" (quem já está abaixo de 1 não sobe), e na terceira rodada seguida desmaia.
// motivo: 'abaixoDeZero' ou 'tresRodadas' quando desmaia.
export function danoDoAgarrao({ hp, body, estrangular = false, vezes = 1 }) {
  const resto = Number(hp) - Number(body);
  if (estrangular && resto < 0) return { hp: Math.min(Number(hp), 1), desmaiou: true, motivo: 'abaixoDeZero' };
  const tres = estrangular && vezes >= 3;
  return { hp: resto, desmaiou: tres, motivo: tres ? 'tresRodadas' : null };
}
// As rodadas seguidas estrangulando: a de agora conta com a anterior se ela foi na rodada de antes, no mesmo combate; na
// mesma rodada, não conta outra. Fora de combate não há rodada: toda vez conta.
export function vezesEstrangulando(anterior, { combate = null, rodada = null } = {}) {
  if (!anterior?.vezes) return 1;
  if (!combate || !anterior.combate) return combate || anterior.combate ? 1 : anterior.vezes + 1;
  if (anterior.combate !== combate) return 1;
  if (anterior.rodada === rodada) return anterior.vezes;
  return anterior.rodada === rodada - 1 ? anterior.vezes + 1 : 1;
}

// ---------------- Fundação e opções do cyberware ----------------
// A wiki (system-catalog.js): "Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e
// externo usam slots de categoria". A opção vai numa fundação do mesmo tipo, menos o Sensor Array, que "acrescenta cinco
// slots de opção ao Cyberaudio" (recebe as opções do Cyberaudio). As placas de 2077 (o Skin Weave e as opções de placa)
// saíram com a wiki de 2026-10-17 ("o sistema de placas do suplemento, que o RED não tem"; C29), e o Kiroshi de 2077
// "vale o Cybereye". Cada item: { tipo, catalogo, slots, tamanho } (catalogo: o id do catálogo, quando há).
export const TIPOS_DE_CATEGORIA = ['fashionware', 'cyberwareInternal', 'cyberwareExternal'];
const ENCAIXE_DA_FUNDACAO = { 'core_cyberware:sensor-array': 'cyberAudioSuite' };
export const encaixeDaFundacao = ({ tipo, catalogo = '' }) => ENCAIXE_DA_FUNDACAO[catalogo] ?? tipo;
export const encaixeDaOpcao = ({ tipo }) => tipo;
// A opção pede uma fundação? As de categoria, não.
export const pedeFundacao = opcao => !TIPOS_DE_CATEGORIA.includes(opcao.tipo);
// A opção cabe na fundação? O encaixe bate e sobram slots (usados: o tamanho das opções que já estão nela).
export function cabeNaFundacao({ fundacao, opcao, usados = 0 }) {
  if (encaixeDaFundacao(fundacao) !== encaixeDaOpcao(opcao)) return { cabe: false, motivo: 'encaixe' };
  if (usados + (Number(opcao.tamanho) || 0) > (Number(fundacao.slots) || 0)) return { cabe: false, motivo: 'slots' };
  return { cabe: true, motivo: null };
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

// Tabelas candidatas: o autofogo usa a tabela "(Autofire)" da arma; sem ela, a da SMG. O ricochete usa a da arma (o
// Kit: "o alcance continua sendo a distância entre você e o alvo").
export function tabelasCandidatas(tabela, modo) {
  if (!tabela) return [];
  if (modo !== 'autofogo') return [tabela];
  if (/\(Autofire\)/.test(tabela)) return [tabela];
  return [`${tabela} (Autofire)`, 'DV SMG (Autofire)', tabela];
}

// Centro do token dentro do quadrado de lado 2 × metade (em pixels)?
export const dentroDaArea = (centro, ponto, metade) => Math.abs(ponto.x - centro.x) <= metade + 0.5 && Math.abs(ponto.y - centro.y) <= metade + 0.5;

// Descrição curta do ataque: "Tiro mirado na cabeça", "Autofogo", "Carga Tech através de cobertura fina", "Espingarda com
// cartucho, os dois canos"…
// ricochete: o do tiro mirado e o do cartucho (o tiro é o modo "ricochete"); carga: o ataque da arma Tech carregada.
export function descreverAtaque({ modo, local = 'corpo', doisCanos = false, ricochete = null, carga = null }) {
  const base = MODOS[modo] || 'Ataque';
  const ricocheteou = `${ricochete || modo === 'ricochete' ? ', ricochete' : ''}${carga ? ', carregado' : ''}`;
  if (LOCAIS_MIRADOS[local]) return `${modo === 'corpo' ? 'Golpe' : 'Tiro'} mirado ${local === 'item' ? 'no item na mão' : `na ${LOCAIS_MIRADOS[local]}`}${ricocheteou}`;
  return `${base}${doisCanos ? ', os dois canos' : ''}${modo === 'ricochete' ? ricocheteou.replace(', ricochete', '') : ricocheteou}`;
}

// ---------------- Armas de 2077 ----------------
// As regras de 2077 da mesa (wiki, system-2077.js): as do Mission Kit, com as escolhas do foundry-2077 do Foundry 12 (o
// cpr-2077) onde o texto não diz:
// - Power, pelo Mission Kit (a wiki de 2026-10-17, "Power", Kit p. 31–32; C29, ciclo 114): a lesão crítica causa 10 de
//   dano bônus (no lugar de 5). O Ricochete acerta um alvo atrás de cobertura ou fora da linha de visão: −4 no ataque
//   (−2 com o Ballistic Coprocessor); num tiro mirado, só a penalidade dele; o alcance e a DV são os da arma até o alvo,
//   e o dano é o de sempre. Com cartucho, o leque de 6 m sai da superfície do ricochete, a até 6 m de quem atira. Saiu
//   o ricochete do suplemento (a DV da tabela de autofogo e um dado a menos de dano).
// - Tech, pelo Mission Kit (a wiki de 2026-10-17, "Tech", Kit p. 32; C29, ciclo 115): carregar gasta a Ação de
//   Movimento, e a arma fica carregada até disparar ou por 20 rodadas (60 segundos). Carregada, o próximo ataque que não
//   seja explosivo (nem o fogo supressivo, como o foundry-2077) é de CDT 1, atravessa cobertura fina (que não perde HP)
//   e ignora metade do SP do alvo, arredondada para cima. Saíram a carga e a rajada do suplemento (a cobertura que
//   segurava parte do dano, a ablação de 4 e 2, a arma que esfria uma rodada).
// - Smart, pelo Mission Kit (a wiki de 2026-10-17, "Smart", Kit p. 32; C29, ciclo 110): "A arma precisa estar conectada
//   a você por um Personal Link (o Interface Plug que vem no Neuroport) ou por um Subdermal Grip. Sem conexão, não
//   dispara"; "+1 nos ataques à distância com a arma". O Smart Link de 2077 saiu da wiki ("vale o do RED": o Subdermal
//   Grip). Saiu o teste Smart do suplemento (10 ou 12 + 1d10 no lugar de REF + perícia).
// - As regras próprias de alguns modelos, pelo texto de cada arma: os dois canos de uma vez (a Palica e a Testera: o
//   dano sobe para 4d6), gastando os dois cartuchos; os dois alvos da Kappa (se o tiro não pega o primeiro, as balas
//   Smart vão para o segundo, a até 4 m dele); a coronha recolhida da Dian (−1 nos ataques); o autofogo da Lexington,
//   com 7 balas (a do suplemento: a do Kit não tem autofogo). E, pelo Kit (C29, ciclo 116), o dano do tiro mirado da
//   Unity, as lesões de quem dispara a Carnage sem BODY 10 e a Burya sem cromo no braço, o ferrolho da Grad e a carga da
//   Burya, da Omaha e da Nekomata.
export const ALCANCE_DOS_DOIS_ALVOS = 4;
export const PENALIDADE_CORONHA = -1;
// As balas Smart mudam para o segundo alvo? Só a até 4 m do primeiro (com meio metro de folga para a grade, como o
// Fluxo de Combate do Foundry 12). Sem distância (outra cena), não.
export const mudaDeAlvo = metros => metros !== null && metros !== undefined && Number(metros) <= ALCANCE_DOS_DOIS_ALVOS + 0.5;
// A penalidade do ricochete: −4 (−2 com o Ballistic Coprocessor); num tiro mirado, só a do mirado (0 aqui).
export const PENALIDADE_RICOCHETE = -4;
export const PENALIDADE_RICOCHETE_COM_COPROCESSADOR = -2;
export const penalidadeDoRicochete = ({ coprocessador = false, mirado = false } = {}) => (mirado ? 0 : coprocessador ? PENALIDADE_RICOCHETE_COM_COPROCESSADOR : PENALIDADE_RICOCHETE);

// A carga Tech (o Kit): dura 20 rodadas (60 segundos) e ignora metade do SP (a porcentagem do aplicarDano, que arredonda
// a metade para cima: SP 11 conta 6).
export const CARGA_TECH = { rodadas: 20, ignorarPct: 50 };
// A carga ainda vale? marca: { combate, rodada } de quando carregou (combate null fora dele), e o disparou ({ rodada,
// turno }) da Omaha, que fica carregada até o fim do turno em que disparou; combate: o de agora ({ id, rodada, turno }),
// ou null. No mesmo combate, até 20 rodadas depois; fora dele, até disparar (como o foundry-2077; a Omaha fora do combate
// também acaba no tiro: não há turno).
export function cargaValida(marca, combate) {
  if (!marca) return false;
  const mesmo = Boolean(marca.combate && combate && marca.combate === combate.id);
  if (marca.disparou) return mesmo && combate.rodada === marca.disparou.rodada && combate.turno === marca.disparou.turno;
  if (mesmo) return combate.rodada - Number(marca.rodada) < CARGA_TECH.rodadas;
  return true;
}
// As balas do ataque carregado da Omaha: até 3 por ataque (com menos no pente, esvazia), no tiro único. null: as de
// sempre.
export function balasDaCarga({ modo, perfil, pente = 0 }) {
  if (!(perfil?.balasNaCarga > 1) || !MODOS_DE_TIRO_UNICO.includes(modo)) return null;
  return Math.max(1, Math.min(perfil.balasNaCarga, Number(pente) || 0));
}
// O que a carga atravessa: a fina; a da Nekomata, a fina e a grossa.
export const coberturaDaCarga = perfil => (perfil?.cargaGrossa ? 'cobertura fina e grossa' : 'cobertura fina');

// As regras de quem dispara (a wiki, o texto de cada arma): a Carnage, "quem dispara sem BODY 10 ou mais sofre a lesão
// crítica Músculo Rompido (se ainda não tiver)"; a Burya, "quem dispara sem Grafted Muscle and Bone Lace ou um cyberbraço
// sofre a lesão crítica Braço Quebrado (se ainda não tiver)". As lesões, pelo nome da wiki, no catálogo do CORE.
const LESOES_2077 = { 'Torn Muscle': 'Músculo rompido', 'Broken Arm': 'Braço quebrado' };
export const nomeDaLesao2077 = nome => LESOES_2077[nome] ?? nome;
export const idDaLesao2077 = nome => `core_critical-injuries-body:${String(nome).trim().toLowerCase().replace(/\s+/g, '-')}`;
// O cromo que aguenta a Burya, como o foundry-2077: o Grafted Muscle and Bone Lace (ou um esqueleto) ou um cyberbraço
// (a fundação do braço).
export const ehCromoNoBraco = ({ nome = '', catalogo = '', tipo = '', fundacional = false }) => catalogo === 'core_cyberware:grafted-muscle-and-bone-lace'
  || (tipo === 'cyberArm' && Boolean(fundacional)) || /muscle (and|&) bone lace|epimorphic skeleton|titanium bones|^cyberarm\b/i.test(String(nome));
// As lesões que quem dispara sofre: [{ id, nome, motivo }]. body: o BODY dele; cromo: tem o cromo no braço; tem: as lesões que
// ele já tem (os ids do catálogo).
export function lesoesDoAtirador({ perfil, body = 0, cromo = false, tem = [] }) {
  const lesoes = [];
  if (perfil?.exigeBody && perfil.lesao && Number(body) < perfil.exigeBody) lesoes.push({ id: idDaLesao2077(perfil.lesao), nome: nomeDaLesao2077(perfil.lesao), motivo: `tem BODY ${body} (a arma pede ${perfil.exigeBody})` });
  if (perfil?.lesaoSemCromo && !cromo) lesoes.push({ id: idDaLesao2077(perfil.lesaoSemCromo), nome: nomeDaLesao2077(perfil.lesaoSemCromo), motivo: 'não tem Grafted Muscle and Bone Lace nem cyberbraço' });
  return lesoes.filter(lesao => !tem.includes(lesao.id));
}
// Os ataques que gastam a carga: todos menos o explosivo e o fogo supressivo.
export const gastaACarga = modo => !['explosivo', 'supressivo', 'corpo'].includes(modo);

// O perfil de 2077 de uma arma, pela flag arma2077 do conteúdo (build/conteudo-2077.mjs); null nas outras armas.
// smart: é arma Smart; doisCanos: o dano dos dois de uma vez ({ dano } da Palica e da Testera), ou null. Ricocheteia a
// Power de longo alcance, menos a de Disparo Automático, como o foundry-2077 (o cartucho também, desde o Kit).
export function perfil2077(flag, { aDistancia = true, pericia = '', municoes = [] } = {}) {
  const classe = ['power', 'tech', 'smart'].includes(flag?.classe) ? flag.classe : null;
  if (!classe) return null;
  const smart = classe === 'smart';
  return {
    classe,
    ricocheteia: classe === 'power' && Boolean(aDistancia) && pericia !== 'autofire',
    balasDoAutofogo: Number(flag.balasDoAutofogo) || BALAS_RAJADA,
    smart,
    doisCanos: flag.doisCartuchosDano ? { dano: String(flag.doisCartuchosDano) } : null,
    doisAlvos: smart && Boolean(flag.doisAlvos),
    coronhaRetratil: Boolean(flag.coronhaRetratil),
    // As balas por tiro (balasPorTiro), o dano com menos no pente, o mínimo no pente (a trava da Zhuo), o dano fixo (os
    // 4d6 do cartucho da Zhuo) e a munição que ela aceita.
    balasPorTiro: Math.max(1, Number(flag.balas) || 1),
    danoComMenos: flag.danoComMenos ? String(flag.danoComMenos) : null,
    minimoDeBalas: Number(flag.minimoDeBalas) || 0,
    danoFixo: flag.danoFixo ? String(flag.danoFixo) : null,
    soSmartMelhorada: Boolean(flag.soSmartMelhorada),
    // As regras de cada modelo: o dano do tiro mirado (a Unity), o BODY e a lesão (a Carnage), a lesão sem cromo no braço
    // (a Burya), o ferrolho (a Grad) e as da carga (a Burya carrega sem a Ação de Movimento; a Omaha, até o fim do turno,
    // com CDT 2 e até 3 balas; a Nekomata atravessa a cobertura grossa também).
    danoMirado: flag.danoMirado ? String(flag.danoMirado) : null,
    exigeBody: Number(flag.exigeBody) || 0,
    lesao: flag.lesao ? String(flag.lesao) : null,
    lesaoSemCromo: flag.lesaoSemCromo ? String(flag.lesaoSemCromo) : null,
    ferrolho: Boolean(flag.ferrolho),
    cargaSemMovimento: Boolean(flag.cargaSemMovimento),
    cargaAteFimDoTurno: Boolean(flag.cargaAteFimDoTurno),
    balasNaCarga: Number(flag.balasNaCarga) || 0,
    cdtNaCarga: Number(flag.cdtNaCarga) || 0,
    cargaGrossa: Boolean(flag.cargaGrossa)
  };
}

// A arma Smart (o Kit): +1 nos ataques à distância.
export const BONUS_SMART = 1;
// A ligação que a arma Smart pede: o Personal Link (o Interface Plug; o Neuroport já o traz) ou o Subdermal Grip, pelo
// id do catálogo ou pelo nome. O Smart Link de 2077 de um ator de antes (a wiki: "o Smart Link (o Subdermal Grip)") vale
// o Subdermal Grip.
const LIGACOES_SMART = ['cyberware-2077:neuroport', 'core_cyberware:interface-plugs', 'core_cyberware:subdermal-grip', 'cyberware-2077:smart-link'];
export const ehLigacaoSmart = (nome, catalogo = '') => LIGACOES_SMART.includes(catalogo) || /^(neuroport|interface plugs?|personal link|subdermal grip|smart ?link)\b/i.test(String(nome).trim());
// A munição Smart melhorada (o Kit, p. 32; a flag arma2077 da munição): só vale na arma Smart (a do Smartgun Link não
// conta). Ignora as penalidades que atrapalham a visão (dos modificadores comuns, a pouca luz e a tarefa encoberta por
// fumaça, escuridão etc.). E o ataque à distância que errar a DV por 5 ou menos tem a segunda chance, na hora:
// 14 + 1d10 (com a Sorte) no lugar de STAT + perícia + bônus, contra a mesma DV, com as penalidades do primeiro tiro.
export const SEGUNDA_CHANCE = { base: 14, margem: 5 };
export const PENALIDADES_DE_VISAO = ['pouca-luz', 'encoberta'];
export const smartMelhoradaVale = ({ perfil, municao }) => Boolean(perfil?.smart && municao?.smartMelhorada);
const ROTULOS_DE_VISAO = new Set(MODIFICADORES_COMUNS.filter(modificador => PENALIDADES_DE_VISAO.includes(modificador.id)).map(modificador => modificador.rotulo));
export const ehPenalidadeDeVisao = parte => ROTULOS_DE_VISAO.has(parte.rotulo);
// Errou por 5 ou menos? contra: a DV, ou a esquiva que faz as vezes dela (p. 172). Sem número (o mestre decide), não.
export function cabeSegundaChance({ ataque, contra }) {
  if (contra === null || contra === undefined) return false;
  const faltou = contra - ataque;
  return faltou >= 0 && faltou <= SEGUNDA_CHANCE.margem;
}
// As partes da segunda chance: a base no lugar de STAT + perícia + bônus, e as penalidades do primeiro tiro.
export const partesDaSegundaChance = (partes = []) => [{ rotulo: 'Segunda chance', valor: SEGUNDA_CHANCE.base }, ...partes.filter(parte => parte.valor < 0)];
export const ehCoprocessador = (nome, catalogo = '') => catalogo === 'cyberware-2077:ballistic-coprocessor' || /ballistic coprocessor/i.test(String(nome));
// Reflex Tuner (wiki, system-2077.js): "depois de ser atingido, +1 para se esquivar pelo resto da rodada".
export const REFLEX_TUNER = 1;
export const ehReflexTuner = (nome, catalogo = '') => catalogo === 'cyberware-2077:reflex-tuner' || /^reflex tuner\b/i.test(String(nome).trim());

// O que impede o ataque com uma arma de 2077 (o aviso, depois do nome da arma), ou null. pelaMunicao: o modo que a
// arma e a munição dariam sozinhas ("tiro", "cartucho", "explosivo"); ligadaSmart: o atacante tem a ligação da arma
// Smart (ehLigacaoSmart) instalada.
// pente: as balas no pente (a trava da Zhuo); municao: a carregada ({ smartMelhorada }), ou null; ferrolhoPendente: a
// Grad que ainda não manejou o ferrolho depois do tiro.
export function impedimento2077({ modo, perfil, pelaMunicao = 'tiro', pedido = null, ligadaSmart = false, pente = null, municao = null, ferrolhoPendente = false }) {
  if (perfil?.ferrolho && ferrolhoPendente) return 'gaste uma Ação para manejar o ferrolho antes de atirar de novo (o botão "Manejar o ferrolho").';
  if (perfil?.classe === 'smart' && !ligadaSmart) return 'arma Smart, só dispara ligada pelo Personal Link (o Interface Plug do Neuroport) ou pelo Subdermal Grip.';
  if (perfil?.minimoDeBalas && pente !== null && pente < perfil.minimoDeBalas) return `só dispara com ${perfil.minimoDeBalas} no pente (tem ${pente}): é a trava de segurança.`;
  if (perfil?.soSmartMelhorada && municao && !municao.smartMelhorada) return 'só aceita munição Smart melhorada.';
  if (pedido === 'doisCanos' && !perfil?.doisCanos) return 'não dispara os dois canos de uma vez.';
  if (modo === 'ricochete' || pedido === 'ricochete') {
    if (!perfil?.ricocheteia) return 'só as armas Power de longo alcance ricocheteiam.';
    if (pelaMunicao === 'explosivo') return 'o ricochete é de bala ou de cartucho: explosivo, não.';
  }
  return null;
}
