// Wiki, Equipamento: Medscanner e Techscanner dão +2 e não acumulam com outro do mesmo tipo.
// O catálogo identifica também o scanner instalado num cyberbraço, mesmo que alguém o renomeie.
import { EMPILHAVEIS, parteValida } from './regras.mjs';

// CORE 0.92.4, CPRActorSheet._splitItem: duas pilhas, com uma parte entre 1 e total - 1.
// A quantidade é de unidades (balas ou doses), mesmo quando o preço é por lote.
export function divisaoDaPilha(tipo, total, parte) {
  if (!EMPILHAVEIS.includes(tipo) || !Number.isSafeInteger(total) || !Number.isSafeInteger(parte) || !parteValida(parte, total)) return null;
  return { restante: total - parte, nova: parte };
}

// CORE, CPRActor.automaticallyStackItems. Decisão do usuário no C17: reproduzir literalmente, inclusive a condição
// invertida dos upgrades: equipamento/roupa só juntam se a pilha encontrada já tem upgrades. Outros dados não entram.
export function mesmaPilha(origem, destino) {
  return EMPILHAVEIS.includes(origem.type) && origem.type === destino.type && origem.name === destino.name
    && (!['equipamento', 'roupa'].includes(origem.type) || destino.upgrades > 0);
}

export function tipoDeScanner({ name = '', catalogo = '', type }) {
  if (!['equipamento', 'cyberware'].includes(type)) return null;
  const id = catalogo ? catalogo.match(/^core_(?:gear|cyberware):(medscanner|techscanner)$/)?.[1] : name.toLowerCase();
  return ['medscanner', 'techscanner'].includes(id) ? id : null;
}

// Uma origem estável entre as ativas: desligar ou guardar a primeira deixa a segunda valer imediatamente.
export function scannerPreferido(candidatos, tipo) {
  return candidatos.filter(c => c.tipo === tipo && c.ativo).map(c => c.id).sort()[0] ?? null;
}

// Wiki, Equipamento; alcance de 100 m confirmado pelo usuário no C16. O flare é de uso único e dura uma hora.
export const LUZES = { flashlight: { alcance: 100 }, 'road-flare': { alcance: 100, segundos: 3600, descartavel: true } };
export function luzDoItem({ name = '', catalogo = '', type }) {
  if (type !== 'equipamento') return null;
  const id = catalogo ? catalogo.match(/^core_gear:(flashlight|road-flare)$/)?.[1] : { Flashlight: 'flashlight', 'Road Flare': 'road-flare' }[name];
  return LUZES[id] ?? null;
}
export const efeitoDaLuz = (nome, alcance) => ({ name: nome, type: 'base', transfer: true, disabled: true,
  system: { changes: [{ key: 'token.light.bright', type: 'upgrade', value: String(alcance), phase: 'initial', priority: null }] } });

// O nome do item em branco do "+" de cada lista da ficha (o C32): o "New {item}" do CORE (en.json:16, no
// _createInventoryItem, cpr-actor-sheet.js:1693-1702) em português, com o gênero do tipo ("Arma nova", "Equipamento novo").
const FEMININOS = ['arma', 'armadura', 'municao', 'lesao', 'roupa', 'droga', 'arquitetura'];
export const nomeDoItemNovo = (tipo, rotulo) => `${rotulo} ${FEMININOS.includes(tipo) ? 'nova' : 'novo'}`;

// A busca da ficha (o C32; o filter-contents do CORE, cpr-actor-sheet.js:1660-1683, com o cprSheetContentFilter,
// register-helpers.js:977-987): sem texto, tudo passa; com texto, o nome que o contém, sem diferença de maiúsculas. Como a
// busca do Painel Tático, sem os espaços das pontas; e sem os acentos ("evasao" acha "Evasão").
const semAcento = texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function passaNaBusca(nome, busca) {
  const filtro = semAcento(busca).trim();
  return !filtro || semAcento(nome).includes(filtro);
}

// Descarregar a arma (o C32; o unload do CORE, cpr-loadable.js:57-62): o pente vai a 0, e as balas dele voltam para o
// estoque da munição que estava nele.
export const descarga = (pente, estoque) => ({ pente: 0, estoque: (Number(estoque) || 0) + Math.max(0, Number(pente) || 0) });
// Antes de apagar a arma, ela descarrega (o unloadAmmo do CORE, ligado por padrão no deleteEmbeddedDocuments,
// cpr-actor.js:288-327, e que só vale sem o deleteInstalled): na confirmação simples e no "só tirar", com bala no pente e a
// munição carregada na ficha. No "apagar junto", as balas do pente saem com a arma (o estoque fica).
export const descarregaAoApagar = ({ tipo, pente, municaoNaFicha, junto = false }) => tipo === 'arma' && Number(pente) > 0 && Boolean(municaoNaFicha) && !junto;

// Apagar um item com o que está instalado nele (o C32; a pergunta do CORE, cpr-container.js:11-21, e o _deleteOwnedItem,
// cpr-actor-sheet.js:1057-1073): junto, o item e tudo o que está nele, nos andares de baixo; senão, só o item, e o que
// estava direto nele fica solto. itens: [{ id, instaladoEm, propria }]; propria é a arma do cyberware ou do acessório, que
// sai com ele pelo gancho (armas-cyberware.mjs, com as balas de volta) e fica fora das duas listas.
export function apagarComInstalados(id, itens, junto) {
  const dentro = pai => itens.filter(item => item.instaladoEm === pai && item.id !== pai && !item.propria).map(item => item.id);
  if (!junto) return { apagar: [id], soltar: dentro(id) };
  const apagar = [id];
  for (let i = 0; i < apagar.length; i++) apagar.push(...dentro(apagar[i]).filter(filho => !apagar.includes(filho)));
  return { apagar, soltar: [] };
}

// Recolher e expandir as listas da ficha (o C34; o _expandButton do CORE, cpr-actor-sheet.js:433-453): as recolhidas de
// um ator são uma lista de ids (o tipo dos itens, "arma"; o grupo de perícias, "pericias-Luta"), como o collapsedSections do
// CORE. Recolher põe; expandir tira; sem nenhuma, null (o ator sai da flag do usuário).
export function alternarRecolhida(recolhidas, lista) {
  const novas = recolhidas.includes(lista) ? recolhidas.filter(outra => outra !== lista) : [...recolhidas, lista];
  return novas.length ? novas : null;
}
// As linhas da lista completa de perícias, de grupo em grupo: o cabeçalho ganha o id da lista dele, e a perícia do grupo
// recolhido, a marca. A favorita fica à vista, como o item preso do CORE (cpr-actor-sheet.js:441: o "favorite" não se
// esconde). A busca (passaNaBusca) não abre o grupo: no CORE, o filtro só tira a linha (cpr-skills-category.hbs:35-36).
export const listaDoGrupo = grupo => `pericias-${grupo}`;
export function marcarRecolhidas(linhas, recolhidas) {
  let recolhido = false;
  return linhas.map(linha => {
    if (linha.grupo) {
      recolhido = recolhidas.includes(listaDoGrupo(linha.grupo));
      return { ...linha, lista: listaDoGrupo(linha.grupo) };
    }
    return { ...linha, recolhida: recolhido && !linha.favorita };
  });
}
