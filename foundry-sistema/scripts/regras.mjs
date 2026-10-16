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

// A Interface do Netrunner (a wiki, "Habilidades de Interface", RED p. 198–201; o CPR.interfaceAbilities do CORE): o Rank de
// Interface + 1d10 contra a DV, com o custo e o que cada habilidade faz (o cartão). A Defesa e a Velocidade são as outras
// duas rolagens de Interface do CORE: a Defesa contra o ataque na NET ("Combate na NET": ATK + 1d10 contra Interface +
// 1d10) e a Velocidade contra o Black ICE à espreita (a wiki, "Black ICE": Interface + bônus de velocidade + 1d10 contra
// SPD do ICE + 1d10). A chave de cada uma é a do bônus dos programas (system.bonus.interface).
export const HABILIDADES_DE_INTERFACE = [
  { id: 'scanner', rotulo: 'Scanner', custo: '1 Ação Carnal', dica: 'Acha no mundo físico os pontos de acesso da área; quanto maior, mais longe.' },
  { id: 'backdoor', rotulo: 'Backdoor', custo: '1 Ação NET', dica: 'Contra a DV da senha: passa por uma senha.' },
  { id: 'cloak', rotulo: 'Cloak', custo: '1 Ação NET', dica: 'O resultado vira a DV: esconde seus rastros e seus vírus.' },
  { id: 'control', rotulo: 'Control', custo: '1 Ação NET + 1 por comando', dica: 'Contra a DV do nó: toma um nó de controle (câmeras, torretas, portas, drones).' },
  { id: 'eyedee', rotulo: 'Eye-Dee', custo: '1 Ação NET', dica: 'Contra a DV do arquivo: descobre o que é um arquivo e quanto vale.' },
  { id: 'pathfinder', rotulo: 'Pathfinder', custo: '1 Ação NET', dica: 'Revela o mapa: andares iguais ao resultado, até a primeira obstrução com DV maior.' },
  { id: 'slide', rotulo: 'Slide', custo: '1 Ação NET (1×/turno)', dica: 'Contra PER do Black ICE + 1d10: foge de um Black ICE não demoníaco para um andar vizinho.' },
  { id: 'virus', rotulo: 'Virus', custo: 'Ações NET definidas pelo mestre', dica: 'Contra a DV do mestre, só no andar mais baixo: deixa até 2 mudanças.' },
  { id: 'zap', rotulo: 'Zap', custo: '1 Ação NET', dica: 'Contra DEF do programa + 1d10 ou Interface + 1d10: 1d6 no REZ de um programa ou direto no cérebro.' },
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

// Agarrar (a wiki, "Agarrar e arremessar", p. 177): os dois rolam DEX + Briga + 1d10, e quem agarra precisa superar a
// resistência (o teste resistido: empate é do defensor, p. 128). Agarrados, os dois têm −2 em todas as ações.
export const AGARRAO = { penalidade: -2 };
export const venceuOAgarrao = (ataque, defesa) => Number(ataque) > Number(defesa);
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
// externo usam slots de categoria". A opção vai numa fundação do mesmo tipo, menos: o Sensor Array, que "acrescenta cinco
// slots de opção ao Cyberaudio" (recebe as opções do Cyberaudio), e as placas base de 2077 (Skin Weave e Subdermal Armour),
// que recebem só as opções de placa ("não ocupam os slots de cyberware externo"). Cada item: { tipo, catalogo, slots,
// tamanho } (catalogo: o id do catálogo, quando há).
export const TIPOS_DE_CATEGORIA = ['fashionware', 'cyberwareInternal', 'cyberwareExternal'];
const ENCAIXE_DA_FUNDACAO = { 'core_cyberware:sensor-array': 'cyberAudioSuite', 'cyberware-2077:skin-weave': 'placa', 'cyberware-2077:subdermal-armour-2077': 'placa' };
const OPCOES_DE_PLACA = ['cyberware-2077:carapace', 'cyberware-2077:countershell', 'cyberware-2077:nano-plating', 'cyberware-2077:proxishield', 'cyberware-2077:rangeguard'];
export const encaixeDaFundacao = ({ tipo, catalogo = '' }) => ENCAIXE_DA_FUNDACAO[catalogo] ?? tipo;
export const encaixeDaOpcao = ({ tipo, catalogo = '' }) => (OPCOES_DE_PLACA.includes(catalogo) ? 'placa' : tipo);
// A opção pede uma fundação? As de categoria, não; as de placa, sim.
export const pedeFundacao = opcao => encaixeDaOpcao(opcao) === 'placa' || !TIPOS_DE_CATEGORIA.includes(opcao.tipo);
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
