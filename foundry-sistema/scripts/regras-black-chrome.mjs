// As regras das armas do Black Chrome (o C48, parte 2), pela wiki (system-blackchrome.js: as armas, p. 85–124, a munição
// do Black Chrome Plus e as palavras-chave, p. 9). Só conta: quem aplica é o combate (combate.mjs e combate/modos.mjs).
// O perfil de cada arma vem do id do catálogo; a arma de um modo da Combinação (armas-cyberware.mjs) usa o da principal.
// Os dados que o CORE traz errados (o dano da Pepper Shaker, os modos da Combinação, a Tomahawk e a Mono-Star de arma
// branca) se corrigem no build (build/conteudo-blackchrome.mjs).

// Granada perfurante (a munição perfurante do RED): a armadura perde 2 de SP em vez de 1.
export const ABLACAO_PERFURANTE = 2;
const KILLCHIP = 'black-chrome_weapons:killchip-100-micro-bomb';
export const LESAO_DO_KILLCHIP = 'core_critical-injuries-head:brain-injury';

// soRajada: só autofogo e fogo supressivo, com as balas do autofogo (a Pepper Shaker: "o autofogo gasta só 6 balas").
// metadeArremessada: "continua reduzindo o SP à metade quando arremessada" (a palavra-chave). emperraJunto: "um
// emperramento trava os dois modos" (a Sternmeyer; nas outras Combinações, emperrar num modo não emperra o outro).
// explosivo: não ataca (arma-se e detona, pela mesa); o dano rolado pelo botão Dano se aplica pelo cartão, com a regra
// dele: direto no HP (o KillChip, com a lesão), granada perfurante, só a cobertura (o Door Cracker) ou o ponto fraco do
// veículo, sem a blindagem e com o dano dobrado (o TR-4).
export const PERFIS_DO_BLACK_CHROME = {
  'black-chrome_weapons:federated-arms-pepper-shaker': { soRajada: true, balasDoAutofogo: 6 },
  'black-chrome_weapons:ranger-combat-boomerang': { metadeArremessada: true },
  'black-chrome_weapons:kendachi-mono-star': { metadeArremessada: true },
  'black-chrome_weapons:utility-tomahawk': { metadeArremessada: true },
  'black-chrome_weapons:sternmeyer-m-04-variable-assault': { emperraJunto: true },
  [KILLCHIP]: { explosivo: { direto: true, lesao: LESAO_DO_KILLCHIP, texto: 'explode quando entra num Chipware Socket: o dano é direto no HP (a armadura não reduz) e causa a Lesão cerebral' } },
  'black-chrome_weapons:gunmart-door-cracker': { explosivo: { soCobertura: true, texto: 'só a seção de 2 × 2 m da cobertura onde está montado sofre o dano' } },
  'black-chrome_weapons:outlet-explosive': { explosivo: { perfurante: true, texto: 'detona como granada perfurante' } },
  'black-chrome_weapons:micro-hydrogen-combustor': { explosivo: { perfurante: true, texto: 'explode como granada perfurante 10 rodadas depois de submerso, e cobre 10 × 10 m de vapor por 1 minuto (−4 para agir sem ver)' } },
  'black-chrome_weapons:tr-4-detonator-fluid': { explosivo: { perfurante: true, pontoFraco: true, texto: 'explode como granada perfurante na próxima partida do veículo, sem a blindagem dele e no ponto fraco (dano dobrado)' } }
};
export const perfilDoBlackChrome = catalogo => PERFIS_DO_BLACK_CHROME[catalogo] ?? null;
export const MODOS_DA_RAJADA = ['autofogo', 'supressivo'];

// Por que a arma não ataca neste modo ('' se ataca).
export function impedimentoDoBlackChrome(perfil, modo) {
  if (perfil?.explosivo) return `é um explosivo: ${perfil.explosivo.texto}. Arme e detone pela mesa; role o dano pelo botão Dano e aplique pelo cartão.`;
  if (perfil?.soRajada && !MODOS_DA_RAJADA.includes(modo)) return 'só faz autofogo e fogo supressivo (não faz tiro único nem mirado).';
  return '';
}

// O dano de um explosivo aplicado pelo cartão: o modo (a granada perfurante é explosivo; o KillChip, não), a ablação, o
// direto no HP com a lesão e o ponto fraco do veículo (o TR-4: sem a blindagem e com o dano dobrado). null: o explosivo
// não fere ninguém (o Door Cracker).
export const PONTO_FRACO = { multiplicador: 2, ignorarPct: 100 };
export function danoDoExplosivo(explosivo) {
  if (!explosivo || explosivo.soCobertura) return null;
  return {
    modo: explosivo.perfurante ? 'explosivo' : 'tiro', ablacao: explosivo.perfurante ? ABLACAO_PERFURANTE : null,
    direto: Boolean(explosivo.direto), lesao: explosivo.lesao ?? null, pontoFraco: Boolean(explosivo.pontoFraco)
  };
}

// A munição sucata do Black Chrome Plus (o efeito "junk" do build): "causa 1d6 a menos em quem tem SP 1 ou mais". O 1d6
// se rola uma vez por ataque e sai antes da armadura, só de quem tem SP no local atingido.
export const MUNICAO_SUCATA = 'junk';
export const MENOS_DA_SUCATA = '1d6';
export const danoComMenos = (dano, sp, menos = 0) => (Number(sp) >= 1 && menos > 0 ? Math.max(0, Number(dano) - menos) : Number(dano));

// O texto da falha da arma numa Combinação: o modo emperrado, e o outro também só na que emperra junto.
export const falhaNaCombinacao = (texto, { emperraJunto = false } = {}) => `${texto} ${emperraJunto ? 'Emperram os dois modos da arma.' : 'Só este modo: o outro modo da arma continua funcionando.'}`;

// A munição do Black Chrome com a regra no catálogo: a Shuriken Tornado rola o dano separado para cada alvo e, como a
// expansiva, o Objeto estranho alojado vira duas lesões; a Arachnid não causa dano (o efeito "arachnid" do build, em
// regras.MUNICAO_SEM_DANO).
export const SHURIKEN_TORNADO = 'black-chrome_ammo:grenade-shuriken-tornado';
export const danoPorAlvo = catalogo => catalogo === SHURIKEN_TORNADO;
export const lesaoDupla = ({ efeito, catalogo }) => efeito === 'expansive' || catalogo === SHURIKEN_TORNADO;

// ---------------- O cromo (o C48, parte 3) ----------------
// Os cyberdedos (p. 23–26): cada um exige uma Modular Finger Cyberhand (até 5) ou a Dynalar Enthusiast (até 8). Decisão do
// usuário (2026-10-26): ficam no cyberbraço, como na wiki e na loja, mas não gastam os slots dele: a mão naquele braço (ou
// no membro natural daquele lado) dá as vagas. O dedo padrão que vem com a mão não conta; os que se compram, sim (o par de
// alicate/tesoura, 2).
export const MAOS_DE_DEDOS = {
  'black-chrome_cyberware:modular-finger-cyberhand': 5,
  'black-chrome_cyberware:dynalar-modular-finger-enthusiast-cyberhand': 8
};
export const ehCyberdedo = catalogo => /^black-chrome_cyberware:.+-cyberfingers?$/.test(catalogo ?? '');
export const dedosDaMao = catalogo => MAOS_DE_DEDOS[catalogo] ?? 0;
// Os slots que a opção gasta na fundação: o cyberdedo, nenhum.
export const slotsNaFundacao = ({ catalogo = '', tamanho = 0 }) => (ehCyberdedo(catalogo) ? 0 : Number(tamanho) || 0);
// O cyberdedo cabe? maos: os catálogos das mãos daquele braço; dedos: os tamanhos dos outros dedos nele.
export function dedoCabe({ maos = [], dedos = [], tamanho = 1 }) {
  const vagas = maos.reduce((soma, mao) => soma + dedosDaMao(mao), 0);
  if (!vagas) return { cabe: false, motivo: 'o cyberdedo exige uma Modular Finger Cyberhand (ou a Enthusiast) naquele braço' };
  const usados = dedos.reduce((soma, dedo) => soma + (Number(dedo) || 0), 0);
  if (usados + (Number(tamanho) || 0) > vagas) return { cabe: false, motivo: `a mão já tem os ${vagas} cyberdedos que cabem nela` };
  return { cabe: true, motivo: null };
}

// Os quadros lineares (p. 51–55; os do RED, system-catalog.js). O externo (vestido, um equipamento) pede Interface Plugs
// (o Sigma, 1; o Beta e os do Black Chrome, 2; o EL-F4-NT, nenhum) e, decisão do usuário (2026-10-26), como a wiki: "o
// BODY maior não aumenta o HP nem muda o Death Save" (o efeito vai em body.quadro, e o HP sai do BODY sem ele). O
// interno (cyberware) pede BODY e Grafted Muscle and Bone Lace (o Sigma, BODY 6 e um; o Beta e os do Black Chrome, BODY 8
// e dois) e muda o HP, como o cromo.
export const QUADROS_EXTERNOS = {
  'core_gear:linear-frame-sigma': { plugs: 1 }, 'core_gear:linear-frame-beta': { plugs: 2 },
  'black-chrome_gear:fuma-kotaro-linear-frame': { plugs: 2 }, 'black-chrome_gear:lf-001-swat-linear-frame': { plugs: 2 },
  'black-chrome_gear:vermilion-linear-frame': { plugs: 2 }, 'black-chrome_gear:el-f4-nt-linear-frame': { plugs: 0 }
};
export const QUADROS_INTERNOS = {
  'core_cyberware:implanted-linear-frame-sigma': { body: 6, enxertos: 1 }, 'core_cyberware:implanted-linear-frame-beta': { body: 8, enxertos: 2 },
  'black-chrome_cyberware:implanted-fuma-kotaro-linear-frame': { body: 8, enxertos: 2 },
  'black-chrome_cyberware:implanted-lf-001-swat-linear-frame': { body: 8, enxertos: 2 },
  'black-chrome_cyberware:implanted-vermilion-linear-frame': { body: 8, enxertos: 2 }
};
export const PLUGS = 'core_cyberware:interface-plugs';
export const ENXERTO = 'core_cyberware:grafted-muscle-and-bone-lace';
// O quadro externo veste? plugs: os Interface Plugs instalados.
export function quadroVeste(catalogo, { plugs = 0 } = {}) {
  const precisa = QUADROS_EXTERNOS[catalogo]?.plugs ?? 0;
  return plugs >= precisa ? { cabe: true, motivo: null } : { cabe: false, motivo: `o quadro externo precisa de ${precisa === 1 ? 'um Interface Plugs instalado' : `${precisa} Interface Plugs instalados`} (tem ${plugs})` };
}
// O quadro interno instala? body: o BODY de agora; enxertos: os Grafted Muscle and Bone Lace instalados.
export function quadroInstala(catalogo, { body = 0, enxertos = 0 } = {}) {
  const pede = QUADROS_INTERNOS[catalogo];
  if (!pede) return { cabe: true, motivo: null };
  if (body < pede.body) return { cabe: false, motivo: `o quadro interno exige BODY ${pede.body} (tem ${body})` };
  if (enxertos < pede.enxertos) return { cabe: false, motivo: `o quadro interno exige ${pede.enxertos === 1 ? 'um Grafted Muscle and Bone Lace instalado' : `${pede.enxertos} Grafted Muscle and Bone Lace instalados`} (tem ${enxertos})` };
  return { cabe: true, motivo: null };
}
// O BODY de cada coisa com o quadro externo ligado: o quadro (body.quadro) vale para tudo, menos o HP e o Death Save.
export const corpoComQuadro = (body, quadro = 0) => ({ valor: Number(quadro) > 0 ? Number(quadro) : Number(body), daVida: Number(body) });

// A aparência de moda (p. 27–35; a palavra-chave): a armadura parece roupa daquele estilo, e só Guarda-roupa e Estilo DV13
// ou Percepção DV15 percebem que é armadura.
export const DV_DA_MODA = { 'wardrobe-style': 13, perception: 15 };
// Passa quem tira mais que a DV (como os testes de resistência do sistema).
export const percebeuAArmadura = ({ pericia, total }) => Number(total) > (DV_DA_MODA[pericia] ?? Infinity);

// ---------------- Os veículos (o C48, parte 4) ----------------
// O "não aceita o upgrade" da wiki (p. 57–84): os girocópteros e o Range Trike não aceitam o upgrade de assentos, o Ebi não
// aceita o chassi pesado, e o JetBoy não faz upgrade nenhum ("Nomad e Tech não fazem upgrade; pintura pode", e o sistema
// não tem a pintura). O "não aceita alguns upgrades" do EconoCompact, do Destination e do Molly fica com a mesa (as
// páginas faltam no PDF do projeto).
const ASSENTOS = 'core_upgrades:seating-upgrade', CHASSI_PESADO = 'core_upgrades:heavy-chassis';
export const RECUSAS_DO_VEICULO = {
  'black-chrome_vehicles:sh-45-patroller': [ASSENTOS], 'black-chrome_vehicles:sh-45-patroller-law': [ASSENTOS],
  'black-chrome_vehicles:tanson-bellhop': [ASSENTOS], 'black-chrome_vehicles:diego-motors-range-trike': [ASSENTOS],
  'black-chrome_vehicles:makigai-ebi': [CHASSI_PESADO], 'black-chrome_vehicles:tanson-jetboy-hoverboard': '*'
};
export function upgradeNoVeiculo(veiculo, upgrade) {
  const recusa = RECUSAS_DO_VEICULO[veiculo];
  if (recusa === '*') return { cabe: false, motivo: 'o veículo não aceita upgrade' };
  if (recusa?.includes(upgrade)) return { cabe: false, motivo: 'o veículo não aceita este upgrade' };
  return { cabe: true, motivo: null };
}
// O Acesso Nômade (p. 9): o Nomad põe na frota da família o veículo com o Acesso igual ou menor que o Rank de Moto (o da
// Role Nomad). Só os veículos do Black Chrome têm; o "—" (o JetBoy, 0) não entra na frota.
export const ehVeiculoDoBlackChrome = catalogo => /^black-chrome_vehicles:/.test(catalogo ?? '');
export function naFrotaDaFamilia({ catalogo, acesso = 0, rank = 0 }) {
  if (!ehVeiculoDoBlackChrome(catalogo)) return { cabe: true, motivo: null };
  if (!acesso) return { cabe: false, motivo: 'o veículo não tem Acesso Nômade' };
  if (rank < acesso) return { cabe: false, motivo: `o Acesso Nômade do veículo é ${acesso}, e o Moto (o Rank de Nomad) é ${rank}` };
  return { cabe: true, motivo: null };
}
