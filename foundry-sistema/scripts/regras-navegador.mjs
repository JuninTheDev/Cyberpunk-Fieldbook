// O navegador de itens e atores (o C43, parte 3; o document browser do CORE 0.93, em fvtt-cyberpunk-red-core-dev:
// src/modules/apps/browser/cpr-document-browser.js, cpr-browser-index.js e item/item-chips.js), a conta pura, sem o
// Foundry: as entradas do índice, os filtros (o nome, o preço, a origem, o tipo e os filtros de cada tipo do
// CPR.browserFilters, config.js:956-1090, nos campos do nosso modelo, dados.mjs), a ordem, os lotes com os cabeçalhos
// dos grupos e os números de cada linha (os chips). O carrinho do jogador fica de fora: a loja da wiki já é o carrinho.
import { ALVOS_UPGRADE, CLASSES_PROGRAMA, ESTILOS_ROUPA, TIPOS_CYBERWARE, TIPOS_ROUPA } from './config.mjs';
import { LUGAR_DA_CIRURGIA } from './regras-cirurgia.mjs';
import { formulaDeDano } from './regras.mjs';

// As linhas entram de 50 em 50 (o BATCH_SIZE, cpr-document-browser.js:29).
export const LOTE = 50;
// Os tipos que não entram (o browserExcludedItemTypes, config.js:1097: skill, criticalInjury e role). Aqui a perícia e a
// Role não são itens: fica a lesão crítica. E o compêndio dela, como o browserIgnoredPacks (config.js:1105-1118).
export const TIPOS_FORA_DO_NAVEGADOR = ['lesao'];
export const COMPENDIOS_FORA_DO_NAVEGADOR = ['cpr-fieldbook.lesoes'];
// O tristate do CORE (o #activateTristateListeners, cpr-document-browser.js:1187): incluídos → só estes → excluídos.
export const PROXIMO_ESTADO = { incluir: 'so', so: 'excluir', excluir: 'incluir' };
export const ROTULOS_DO_ESTADO = { incluir: 'Incluídos', so: 'Só estes', excluir: 'Excluídos' };
export const ORIGENS = { qualquer: 'Qualquer', mundo: 'Mundo', compendio: 'Compêndio' };
// A armadura pelo local e a droga pelo preço, derivadas como no CORE (CPR.armorLocations e CPR.drugTypes,
// config.js:1128-1143): a droga sem preço é farmacêutica, a com preço é de rua.
export const LOCAIS_DA_ARMADURA = { corpo: 'Corpo', cabeca: 'Cabeça', ambos: 'Corpo e cabeça', escudo: 'Escudo' };
export const TIPOS_DE_DROGA = { rua: 'De rua', farmaceutica: 'Farmacêutica' };

// Os números da arma (o CPR.browserWeaponStatFilters, config.js:929-954), também os da arma do cyberware (o campo arma).
const numerosDaArma = (prefixo = 'system.') => [
  { id: 'cdt', tipo: 'faixa', campo: `${prefixo}cdt`, rotulo: 'CDT' },
  { id: 'autofogo', tipo: 'faixa', campo: `${prefixo}autofogo`, rotulo: 'Autofogo' },
  { id: 'dano', tipo: 'dano', campo: `${prefixo}dano`, rotulo: 'Dados de dano' },
  { id: 'ocultavel', tipo: 'booleano', campo: `${prefixo}ocultavel`, rotulo: 'Ocultável' }
];

// Os filtros de cada tipo (o CPR.browserFilters, config.js:956-1090), nos campos do nosso modelo. "conjunto" é a lista de
// valores, cada um com o tristate (opcoes: os rótulos do sistema; sem rótulos, os valores que o índice tem); "faixa", o
// mínimo e o máximo (ou "derivar", os valores tirados da entrada); "dano", os dados antes do "d"; "booleano", o tristate
// do campo; "alternancia", o campo e, em "só estes", os filtros de dentro.
export const FILTROS_POR_TIPO = {
  arma: [
    { id: 'tipo', tipo: 'conjunto', campo: 'system.tipo', rotulo: 'Tipo' },
    ...numerosDaArma(),
    { id: 'maos', tipo: 'faixa', campo: 'system.maos', rotulo: 'Mãos' }
  ],
  // O type do CORE é o nosso efeito (basic, armorPiercing...), e o variety, o nosso tipo (heavyPistol, rifle...).
  municao: [
    { id: 'efeito', tipo: 'conjunto', campo: 'system.efeito', rotulo: 'Tipo' },
    { id: 'tipo', tipo: 'conjunto', campo: 'system.tipo', rotulo: 'Variedade' }
  ],
  cyberware: [
    { id: 'tipo', tipo: 'conjunto', campo: 'system.tipo', opcoes: TIPOS_CYBERWARE, rotulo: 'Tipo' },
    { id: 'fundacional', tipo: 'booleano', campo: 'system.fundacional', rotulo: 'Fundacional' },
    { id: 'endurecido', tipo: 'booleano', campo: 'system.endurecido', rotulo: 'Endurecido' },
    // As armas do cyberware não têm mãos (o CORE também tira as Mãos daqui).
    { id: 'arma', tipo: 'alternancia', campo: 'system.arma.ataca', rotulo: 'Arma de cyberware', filtros: numerosDaArma('system.arma.') }
  ],
  roupa: [
    { id: 'tipo', tipo: 'conjunto', campo: 'system.tipo', opcoes: TIPOS_ROUPA, rotulo: 'Tipo' },
    { id: 'estilo', tipo: 'conjunto', campo: 'system.estilo', opcoes: ESTILOS_ROUPA, rotulo: 'Estilo' }
  ],
  armadura: [
    { id: 'local', tipo: 'conjunto', campo: 'localDaArmadura', opcoes: LOCAIS_DA_ARMADURA, rotulo: 'Local' },
    { id: 'sp', tipo: 'faixa', derivar: 'spDaArmadura', rotulo: 'SP / PV' }
  ],
  cyberdeck: [{ id: 'slots', tipo: 'faixa', campo: 'system.slots', rotulo: 'Slots' }],
  droga: [{ id: 'tipo', tipo: 'conjunto', campo: 'tipoDeDroga', opcoes: TIPOS_DE_DROGA, rotulo: 'Tipo' }],
  programa: [{ id: 'classe', tipo: 'conjunto', campo: 'system.classe', opcoes: CLASSES_PROGRAMA, rotulo: 'Classe' }],
  upgrade: [{ id: 'alvo', tipo: 'conjunto', campo: 'system.alvo', opcoes: ALVOS_UPGRADE, rotulo: 'Onde instala' }]
};

// Os campos que o índice pede a cada compêndio (o ITEM_FIELDS, cpr-browser-index.js:41-91, com a regra da linha 35:
// cada caminho system.* que um filtro, um número da linha ou a ordem lê tem de estar aqui; o compêndio só traz estes, e
// o que faltar sai vazio só no compêndio). O servidor monta a projeção com setProperty, campo por campo: um campo que é
// o começo de outro ("system.dano" e "system.dano.blackIce") quebra o índice; por isso vão os objetos inteiros (o dano
// da arma é um texto, e o do programa, um objeto; o sp da armadura é um objeto, e o do veículo, um número).
export const CAMPOS_DO_ITEM = [
  'img', 'system.preco',
  'system.tipo', 'system.cdt', 'system.autofogo', 'system.supressivo', 'system.dano', 'system.bonusAtaque', 'system.pente', 'system.maos', 'system.ocultavel',
  'system.efeito', 'system.ablacao',
  'system.fundacional', 'system.endurecido', 'system.eletronico', 'system.slots', 'system.local', 'system.perdaHumanidade', 'system.arma',
  'system.estilo',
  'system.sp', 'system.escudo', 'system.pvEscudo', 'system.penalidade',
  'system.classe', 'system.atk', 'system.def', 'system.rez', 'system.per', 'system.spd',
  'system.alvo',
  'system.sdp', 'system.assentos', 'system.velocidade',
  'system.andares'
];
export const CAMPOS_DO_ATOR = ['img'];

// Um caminho com pontos ("system.sp.cabeca.max"), sem o foundry.utils.
export const ler = (fonte, caminho) => caminho.split('.').reduce((valor, chave) => (valor === null || valor === undefined ? undefined : valor[chave]), fonte);
const numero = valor => typeof valor === 'number' && Number.isFinite(valor);

// O compêndio entra no navegador (o isPackEligible, cpr-browser-index.js:264-268): fora os que ficam de fora, o do mundo
// ou o que declara este sistema (os do sistema e os dos módulos de conteúdo dele).
export const compendioElegivel = ({ id, packageType, system } = {}, sistema = 'cpr-fieldbook') =>
  !COMPENDIOS_FORA_DO_NAVEGADOR.includes(id) && (packageType === 'world' || system === sistema);
// Ligado, se o mestre não o desligou (o #isPackActive, cpr-browser-index.js:290-293): por padrão, todos.
export const compendioAtivo = (ativos, id) => (ativos ?? {})[id] !== false;
// Os atores, só o mestre (o #sanitizeMode, cpr-document-browser.js:188-191); o resto abre nos itens.
export const modoDoNavegador = (modo, ehMestre) => (modo === 'ator' && ehMestre ? 'ator' : 'item');
// Arrastar copia o item para a ficha de graça: no CORE, só o mestre (o draggable e o #onDragStart,
// cpr-document-browser.js:308-310 e 1537-1549); o jogador compra pela loja (aqui, a da wiki).
export const podeArrastar = ehMestre => Boolean(ehMestre);

// A armadura pelo local que ela cobre (o #armorLocationFor, cpr-browser-index.js:408-417): no nosso modelo, o local com
// SP máximo acima de 0 (os booleanos isBodyLocation e isHeadLocation do CORE não existem aqui).
export function localDaArmadura(tipo, system = {}) {
  if (tipo !== 'armadura') return undefined;
  if (system.escudo) return 'escudo';
  const cabeca = ler(system, 'sp.cabeca.max') > 0, corpo = ler(system, 'sp.corpo.max') > 0;
  if (cabeca && corpo) return 'ambos';
  if (cabeca) return 'cabeca';
  return corpo ? 'corpo' : undefined;
}
// O SP de cada local que a armadura usa, ou o PV do escudo (o #armorDefenceValues, cpr-document-browser.js:899-915).
export function spDaArmadura(entrada) {
  const s = entrada.system ?? {};
  if (s.escudo) return numero(ler(s, 'pvEscudo.max')) ? [s.pvEscudo.max] : [];
  return ['cabeca', 'corpo'].map(local => ler(s, `sp.${local}.max`)).filter(valor => numero(valor) && valor > 0);
}
// A droga pelo preço (o #drugTypeFor, cpr-browser-index.js:427-432).
export function tipoDeDroga(tipo, system = {}) {
  if (tipo !== 'droga' || !numero(system.preco)) return undefined;
  return system.preco === 0 ? 'farmaceutica' : 'rua';
}
const DERIVADOS = { spDaArmadura };

// A entrada do índice (o #entry, cpr-browser-index.js:349-363), do documento do mundo ou da linha do índice do
// compêndio: a mesma forma, com o local da armadura e o tipo da droga já derivados.
export function entradaDoNavegador(fonte, { uuid, nome, img, classe, tipo, origem, rotuloDaOrigem }) {
  const system = fonte?.system ?? {};
  return { uuid, nome, img, classe, tipo, system, localDaArmadura: localDaArmadura(tipo, system), tipoDeDroga: tipoDeDroga(tipo, system), origem, rotuloDaOrigem };
}

// O estado dos filtros (o #emptyFilterState, cpr-document-browser.js:114-129). Os tristates por tipo e por filtro;
// "promovidos", os tipos que um filtro de dentro pôs em "só estes" (não o clique na caixa do tipo).
export const estadoVazio = () => ({
  nome: '', preco: { min: null, max: null }, origem: 'qualquer',
  tipos: {}, conjuntos: {}, faixas: {}, booleanos: {}, alternancias: {}, promovidos: new Set()
});

// O estado de um tristate da caixa de um tipo: o do tipo (grupo "tipo"), o de um valor de um conjunto, o de um booleano
// ou o de uma alternância.
export function estadoDoTristate(estado, { grupo, tipo, filtro, valor }) {
  if (grupo === 'tipo') return estado.tipos[tipo] ?? 'incluir';
  if (grupo === 'conjunto') return estado.conjuntos[tipo]?.[filtro]?.[valor] ?? 'incluir';
  if (grupo === 'booleano') return estado.booleanos[tipo]?.[filtro] ?? 'incluir';
  return estado.alternancias[tipo]?.[filtro] ?? 'incluir';
}

// Algum filtro de dentro do tipo em "só estes" (o #typeHasOnlyChild, cpr-document-browser.js:1311-1318).
const temFilhoSo = (estado, tipo) => Object.values(estado.conjuntos[tipo] ?? {}).some(valores => Object.values(valores).includes('so'))
  || Object.values(estado.booleanos[tipo] ?? {}).includes('so') || Object.values(estado.alternancias[tipo] ?? {}).includes('so');

// Muda um tristate (o #applyTristate, cpr-document-browser.js:1243-1301): o filtro de dentro em "só estes" põe a caixa
// do tipo em "só estes" também; quando não sobra nenhum de dentro em "só estes", a caixa que o filtro promoveu volta a
// "incluídos", e a que o mestre pôs em "só estes" com o clique fica.
export function aplicarTristate(estado, alvo, novo) {
  const { grupo, tipo, filtro, valor } = alvo;
  if (grupo === 'tipo') {
    estado.tipos[tipo] = novo;
    estado.promovidos.delete(tipo);
    return estado;
  }
  if (grupo === 'conjunto') ((estado.conjuntos[tipo] ??= {})[filtro] ??= {})[valor] = novo;
  else if (grupo === 'booleano') (estado.booleanos[tipo] ??= {})[filtro] = novo;
  else (estado.alternancias[tipo] ??= {})[filtro] = novo;
  if (novo === 'so') {
    const soPeloClique = estado.tipos[tipo] === 'so' && !estado.promovidos.has(tipo);
    estado.tipos[tipo] = 'so';
    if (!soPeloClique) estado.promovidos.add(tipo);
  } else if (estado.promovidos.has(tipo) && !temFilhoSo(estado, tipo)) {
    estado.tipos[tipo] = 'incluir';
    estado.promovidos.delete(tipo);
  }
  return estado;
}

// O mínimo ou o máximo de uma faixa (o campo vazio é sem limite).
export function mudarFaixa(estado, tipo, filtro, limite, texto) {
  const faixa = ((estado.faixas[tipo] ??= {})[filtro] ??= { min: null, max: null });
  faixa[limite] = texto === '' || texto === null || texto === undefined || !Number.isFinite(Number(texto)) ? null : Number(texto);
  return estado;
}

// O tristate de uma lista de valores (o #tristatePredicate, cpr-document-browser.js:1007-1017): "só estes" vale como
// lista branca (qualquer um dos valores marcados); sem "só estes", "excluídos" vale como lista negra. null: sem filtro.
function predicadoDoTristate(estados, ler) {
  if (!estados) return null;
  const valores = entrada => [ler(entrada)].flat();
  const so = Object.keys(estados).filter(valor => estados[valor] === 'so');
  if (so.length) return entrada => valores(entrada).some(valor => so.includes(valor));
  const fora = Object.keys(estados).filter(valor => estados[valor] === 'excluir');
  if (fora.length) return entrada => !valores(entrada).some(valor => fora.includes(valor));
  return null;
}
// Os dados de um dano: o número antes do "d" (o #dieCount, cpr-document-browser.js:947-950); fixo ou vazio, 0.
export const dadosDoDano = dano => Number(String(dano ?? '').match(/^\s*(\d+)\s*d/i)?.[1] ?? 0);
const dentro = ({ min, max }, valor) => numero(valor) && (min === null || valor >= min) && (max === null || valor <= max);

function predicadoDoFiltro(estado, tipo, def) {
  if (def.tipo === 'conjunto') return predicadoDoTristate(estado.conjuntos[tipo]?.[def.id], entrada => ler(entrada, def.campo));
  if (def.tipo === 'faixa' || def.tipo === 'dano') {
    const faixa = estado.faixas[tipo]?.[def.id];
    if (!faixa || (faixa.min === null && faixa.max === null)) return null;
    // O #damagePredicate (cpr-document-browser.js:925-936) compara os dados; o #rangePredicate (:855-878), o número,
    // ou qualquer um dos valores derivados.
    if (def.tipo === 'dano') return entrada => { const dados = dadosDoDano(ler(entrada, def.campo)); return (faixa.min === null || dados >= faixa.min) && (faixa.max === null || dados <= faixa.max); };
    if (def.derivar) return entrada => DERIVADOS[def.derivar](entrada).some(valor => dentro(faixa, valor));
    return entrada => dentro(faixa, ler(entrada, def.campo));
  }
  // O #booleanPredicate e o #togglePredicate (cpr-document-browser.js:961-990): "só estes" pede o campo ligado (na
  // alternância, também os filtros de dentro); "excluídos", desligado.
  const atual = def.tipo === 'booleano' ? estado.booleanos[tipo]?.[def.id] : estado.alternancias[tipo]?.[def.id];
  if (!atual || atual === 'incluir') return null;
  if (atual === 'excluir') return entrada => !ler(entrada, def.campo);
  const deDentro = def.tipo === 'alternancia' ? (def.filtros ?? []).map(filho => predicadoDoFiltro(estado, tipo, filho)).filter(Boolean) : [];
  return entrada => Boolean(ler(entrada, def.campo)) && deDentro.every(passa => passa(entrada));
}

// Os predicados do estado (o #buildPredicates, cpr-document-browser.js:718-787): o tipo, o nome, o preço, a origem e os
// filtros de cada tipo, cada um só nas entradas do tipo dele.
function predicados(estado) {
  const lista = [];
  const doTipo = predicadoDoTristate(estado.tipos, entrada => entrada.tipo);
  if (doTipo) lista.push(doTipo);
  const nome = estado.nome.trim().toLowerCase();
  if (nome) lista.push(entrada => entrada.nome.toLowerCase().includes(nome));
  const { min, max } = estado.preco;
  if (min !== null || max !== null) lista.push(entrada => dentro({ min, max }, ler(entrada, 'system.preco')));
  if (estado.origem === 'mundo') lista.push(entrada => entrada.origem === 'mundo');
  else if (estado.origem === 'compendio') lista.push(entrada => entrada.origem !== 'mundo');
  for (const [tipo, defs] of Object.entries(FILTROS_POR_TIPO)) {
    for (const def of defs) {
      const passa = predicadoDoFiltro(estado, tipo, def);
      if (passa) lista.push(entrada => entrada.tipo !== tipo || passa(entrada));
    }
  }
  return lista;
}

// Filtra e ordena (o #applyFilters, cpr-document-browser.js:661-709): pela ordem dos tipos (a do system.json; o tipo
// desconhecido no fim), e no tipo pelo nome; os upgrades, antes pelo item onde instalam.
export function filtrarEntradas(entradas, estado, ordemDosTipos = []) {
  const lista = predicados(estado);
  const ordem = entrada => { const i = ordemDosTipos.indexOf(entrada.tipo); return i === -1 ? ordemDosTipos.length : i; };
  const doGrupo = (a, b) => (a.tipo === 'upgrade' && b.tipo === 'upgrade' ? String(ler(a, 'system.alvo') ?? '').localeCompare(String(ler(b, 'system.alvo') ?? ''), 'pt-BR') : 0)
    || a.nome.localeCompare(b.nome, 'pt-BR');
  return entradas.filter(entrada => lista.every(passa => passa(entrada))).sort((a, b) => ordem(a) - ordem(b) || doGrupo(a, b));
}

// O próximo lote, com o cabeçalho do grupo onde o tipo muda (o #appendBatch, cpr-document-browser.js:1469-1507): o
// cabeçalho conta também a partir do lote anterior (ultimoTipo); a posição da linha dá a cor alternada.
export function proximoLote(resultados, feitos, ultimoTipo = null, tamanho = LOTE) {
  const itens = [];
  let tipo = ultimoTipo;
  resultados.slice(feitos, feitos + tamanho).forEach((entrada, i) => {
    if (entrada.tipo !== tipo) { tipo = entrada.tipo; itens.push({ cabecalho: true, tipo }); }
    itens.push({ entrada, par: (feitos + i) % 2 === 0 });
  });
  return { itens, feitos: Math.min(resultados.length, feitos + tamanho), ultimoTipo: tipo, acabou: feitos + tamanho >= resultados.length };
}

// Os números de cada linha (o buildItemChips, item-chips.js:292-301), nos campos do nosso modelo e na ordem do CORE:
// primeiro os das partes do modelo (o mixinChips, :148-178: o ataque, o pente, o ocultável, o eletrônico), depois os
// do tipo (o OWN_CHIP_BUILDERS, :221-281). O que não vale (zero, vazio) não aparece.
const se = (condicao, texto) => (condicao ? texto : null);
const positivo = (rotulo, valor) => se(numero(valor) && valor > 0, `${rotulo} ${valor}`);
const comSinal = valor => (valor > 0 ? `+${valor}` : String(valor));
// O attackableChips (:129-135): o dano, a CDT (o ROF), o autofogo, o supressivo e o bônus de ataque. O dano "0" é sem dano
// (regras.formulaDeDano, regras.mjs:277; o build grava "0" no dano contra Black ICE dos programas, conteudo.mjs:169).
const daArma = s => [
  se(Boolean(formulaDeDano(s.dano)), `Dano ${s.dano}`), positivo('CDT', s.cdt), se(numero(s.autofogo) && s.autofogo > 0, `Autofogo (${s.autofogo})`),
  se(Boolean(s.supressivo), 'Fogo supressivo'), se(numero(s.bonusAtaque) && s.bonusAtaque !== 0, `Ataque ${comSinal(s.bonusAtaque)}`)
];
// A arma do cyberware e do acessório (o C11): o ataque, o pente e o ocultável, como o mixin da arma do CORE.
const daArmaMontada = arma => (arma?.ataca ? [...daArma(arma), positivo('Pente', arma.pente), se(Boolean(arma.ocultavel), 'Ocultável')] : []);
const eletronicos = s => [se(Boolean(s.eletronico), 'Eletrônico'), se(Boolean(s.endurecido), 'Endurecido')];
const spDoLocal = (rotulo, recurso) => se(numero(recurso?.max) && recurso.max > 0, `${rotulo} ${recurso?.value ?? recurso?.max}/${recurso?.max}`);
const CHIPS = {
  arma: s => [...daArma(s), positivo('Pente', s.pente?.max), se(Boolean(s.ocultavel), 'Ocultável'), positivo('Mãos', s.maos)],
  armadura: s => [...eletronicos(s), s.escudo ? null : spDoLocal('SP cabeça', s.sp?.cabeca), s.escudo ? null : spDoLocal('SP corpo', s.sp?.corpo),
    s.escudo ? spDoLocal('PV do escudo', s.pvEscudo) : null, se(numero(s.penalidade) && s.penalidade !== 0, `Penalidade ${s.penalidade}`)],
  municao: s => [positivo('Ablação', s.ablacao)],
  cyberware: s => {
    const formula = s.perdaHumanidade?.formula;
    const perda = formula && String(formula) !== '0' ? formula : s.perdaHumanidade?.media;
    return [...daArmaMontada(s.arma), ...eletronicos(s), se(Boolean(perda) && String(perda) !== '0', `Humanidade ${perda}`), se(Boolean(s.fundacional), 'Fundacional'),
      se(Boolean(LUGAR_DA_CIRURGIA[s.local]), `Instala: ${LUGAR_DA_CIRURGIA[s.local]?.nome}`), positivo('Slots', s.slots)];
  },
  equipamento: s => [se(Boolean(s.ocultavel), 'Ocultável'), ...eletronicos(s)],
  roupa: s => eletronicos(s),
  cyberdeck: s => [...eletronicos(s), positivo('Slots', s.slots)],
  // O ATK, a DEF e a REZ aparecem também com 0 (o "number" do CORE); PER, SPD e o dano, só no Black ICE.
  programa: s => [numero(s.atk) ? `ATK ${s.atk}` : null, numero(s.def) ? `DEF ${s.def}` : null, numero(s.rez) ? `REZ ${s.rez}` : null,
    ...(s.classe === 'blackice' ? [positivo('PER', s.per), positivo('SPD', s.spd), se(Boolean(formulaDeDano(s.dano?.blackIce)), `Dano ${s.dano?.blackIce}`)] : [])],
  upgrade: s => [...daArmaMontada(s.arma), ...eletronicos(s)],
  veiculo: s => [positivo('Assentos', s.assentos), positivo('SDP', s.sdp?.max), positivo('MOVE', s.velocidade?.combate)],
  // Os andares: cada andar e ramo é um andar do netarch do CORE (o floors).
  arquitetura: s => [se(Array.isArray(s.andares) && s.andares.length > 0, `${new Set((s.andares ?? []).map(a => `${a.andar}${a.ramo}`)).size} andares`)]
};
export const chipsDoItem = entrada => (CHIPS[entrada.tipo]?.(entrada.system ?? {}) ?? []).filter(Boolean);

// A linha da lista (o #toRow, cpr-document-browser.js:267-320): a imagem, o nome, o tipo, os números, o preço com a
// categoria (regras.categoriaDoPreco, a mesma do contêiner) e a origem (o nome do compêndio ou "Mundo").
export function linhaDoNavegador(entrada, { rotuloDoTipo = entrada.tipo, categoria = () => '', ehMestre = false } = {}) {
  const preco = ler(entrada, 'system.preco');
  const item = entrada.classe === 'Item';
  return {
    uuid: entrada.uuid, classe: entrada.classe, tipo: entrada.tipo, nome: entrada.nome, img: entrada.img, rotuloDoTipo,
    chips: item ? chipsDoItem(entrada) : [], origem: entrada.rotuloDaOrigem,
    preco: item && numero(preco) ? `${preco.toLocaleString('pt-BR')} eb` : '', categoria: item && numero(preco) ? categoria(preco) : '',
    arrastavel: podeArrastar(ehMestre)
  };
}

// As opções de um conjunto: as do sistema, ou os valores que as entradas do tipo têm (sem rótulos no sistema, o valor é o
// rótulo), em ordem alfabética (o #dynamicChoices, cpr-document-browser.js:613-638).
export function opcoesDoConjunto(def, entradas, tipo) {
  if (def.opcoes) return Object.entries(def.opcoes);
  const valores = new Set(entradas.filter(entrada => entrada.tipo === tipo).map(entrada => ler(entrada, def.campo)).filter(valor => valor !== undefined && valor !== null && valor !== ''));
  return [...valores].map(valor => [String(valor), String(valor)]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
}
