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
