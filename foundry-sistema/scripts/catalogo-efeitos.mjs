// O catálogo lógico dos efeitos na mesa (o C78; o plano em foundry-sistema/efeitos-plano/PLANO.md, seção 4.1). Cada
// chave ("tiro.fuzil", "impacto.carne", "explosao.frag") é uma lista de candidatos, na ordem de preferência: um arquivo
// de um módulo (o JB2A), da pasta do mundo ou do próprio sistema, e por último, sempre, o "proprio:" (o desenho e o som
// que o próprio sistema faz). Assim nada some quando um módulo sai ou um arquivo falta: o tocador cai no "proprio:".
// Puro, sem o Foundry: o G3 confere o catálogo inteiro (tests/sistema/coreografia.test.mjs).

export const PROPRIO = 'proprio:';

// O caminho de um arquivo de efeito que o cliente aceita tocar (a seção 3.6 do anexo do fx-coreografia): relativo, dentro
// do servidor (o sistema, um módulo ou um mundo), com uma extensão de mídia. Nunca um endereço de fora (http, //, data:),
// nunca subindo de pasta (..): o jogador dono edita as flags do item dele (a lição do ciclo 207), e um som num endereço
// dele faria a mesa toda revelar o IP.
const PASTAS_PERMITIDAS = /^(systems\/cpr-fieldbook|modules\/[A-Za-z0-9_-]+|worlds\/[A-Za-z0-9_-]+)\//;
const EXTENSOES_PERMITIDAS = /\.(ogg|mp3|wav|webm|webp|png)$/i;
export function srcPermitido(src) {
  if (typeof src !== 'string' || !src || src.length > 300) return false;
  if (/[\\%?#:]|\/\/|\.\.|[\u0000-\u001f]/.test(src)) return false;
  return PASTAS_PERMITIDAS.test(src) && EXTENSOES_PERMITIDAS.test(src);
}

const JB2A = 'modules/JB2A_DnD5e/Library/Generic';
const so = chave => [`${PROPRIO}${chave}`];

// As chaves: o grupo (o que é) e o nome (de quê). O "proprio:" de cada uma tem o nome da própria chave.
export const CATALOGO = Object.freeze(Object.fromEntries([
  // O disparo: o som do tiro de cada classe (o perfil da arma, regras-coreografia.mjs, PERFIS).
  'tiro.pistola-leve', 'tiro.pistola', 'tiro.pistola-pesada', 'tiro.submetralhadora', 'tiro.fuzil', 'tiro.fuzil-de-precisao',
  'tiro.espingarda', 'tiro.arco', 'tiro.lanca-granadas', 'tiro.lanca-foguetes', 'tiro.lanca-chamas', 'tiro.tech',
  'rajada.padrao', 'rajada.submetralhadora', 'rajada.fuzil', 'arremesso.lancar',
  // O corpo a corpo: o golpe (o som e o arco).
  'golpe.corte', 'golpe.contundente', 'golpe.soco', 'golpe.chute', 'golpe.garra', 'golpe.chicote',
  // O desenho do disparo e do caminho.
  'clarao.pequeno', 'clarao.medio', 'clarao.grande', 'clarao.flashbang',
  'tracante.amarelo', 'tracante.laranja', 'tracante.azul',
  'projetil.flecha', 'projetil.granada', 'projetil.foguete', 'projetil.lamina', 'projetil.molotov', 'projetil.chama',
  // O que acontece no alvo.
  'impacto.carne', 'impacto.contundente', 'impacto.estrutura', 'impacto.critico', 'sangue.estilizado',
  'faisca.armadura', 'faisca.escudo', 'faisca.chao', 'faisca.emp',
  // Os explosivos e o que fica.
  'explosao.frag', 'explosao.fogo', 'explosao.leve', 'explosao.emp', 'onda.choque', 'onda.emp',
  'nuvem.fumaca', 'nuvem.gas', 'nuvem.toxina', 'nuvem.sono', 'tela.flash', 'chamas.token', 'anel.teia', 'anel.agarrao',
  // O corpo, a NET e a recarga (as fases seguintes do plano).
  'corpo.flatline', 'corpo.batimento', 'glitch.padrao',
  'recarga.pistola', 'recarga.fuzil', 'recarga.espingarda', 'recarga.padrao'
].map(chave => [chave, so(chave)]).map(([chave, lista]) => [chave, Object.freeze(
  // O JB2A que o sistema já usava (efeitos.mjs): o impacto no acerto e o "Miss" no erro, antes do desenho próprio.
  chave === 'impacto.carne' ? [`${JB2A}/Impact/Impact_07_Regular_Orange_400x400.webm`, ...lista]
    : chave === 'faisca.chao' ? [`${JB2A}/UI/Miss_02_White_200x200.webm`, ...lista]
      : lista)])));

export const temEfeito = chave => Object.hasOwn(CATALOGO, chave);

// Os candidatos de uma chave, na ordem: os do mestre (uma pasta do mundo para aquela chave, a fase 5 do plano), os do
// catálogo, e o "proprio:" no fim. Todo arquivo passa de novo pelo srcPermitido aqui, no cliente que toca. A chave
// desconhecida: nenhum candidato (o tocador não toca nada).
export function candidatosDoEfeito(chave, doMestre = {}) {
  if (!temEfeito(chave)) return [];
  const extras = Array.isArray(doMestre?.[chave]) ? doMestre[chave] : [];
  return [...new Set([...extras, ...CATALOGO[chave]])].filter(src => src === `${PROPRIO}${chave}` || srcPermitido(src));
}

// O que está errado num catálogo (a lista vazia: nada). O G3 confere o do sistema: toda chave no formato "grupo.nome",
// com pelo menos um candidato, o último sendo o "proprio:" dela (e só ele), e os outros com o caminho permitido.
export function conferirCatalogo(catalogo = CATALOGO) {
  const erros = [];
  for (const [chave, lista] of Object.entries(catalogo)) {
    if (!/^[a-z]+\.[a-z0-9-]+$/.test(chave)) erros.push(`${chave}: a chave fora do formato`);
    if (!Array.isArray(lista) || !lista.length) { erros.push(`${chave}: sem candidatos`); continue; }
    if (lista.at(-1) !== `${PROPRIO}${chave}`) erros.push(`${chave}: o último candidato não é o ${PROPRIO}${chave}`);
    for (const src of lista.slice(0, -1)) {
      if (String(src).startsWith(PROPRIO)) erros.push(`${chave}: um ${PROPRIO} antes do fim`);
      else if (!srcPermitido(src)) erros.push(`${chave}: o caminho ${src} não é permitido`);
    }
  }
  return erros;
}
