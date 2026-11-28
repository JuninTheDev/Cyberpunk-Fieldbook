// O inventário em grade nos dados do ator (o C108; a regra em compartilhado/regras-grade.mjs): como o item e o ator do
// Foundry viram o que a regra lê, e a arrumação que a migração 11 faz nos atores de hoje. Puro: serve ao documento (pelo
// _source) e aos dados do toObject, sem o game.
import { ehArmaMontadaEmItem } from './armas-cyberware.mjs';
import { SISTEMA } from './config.mjs';
import { arrumar, conteinerTemGrade, ENCAIXES, encaixesDoItem, lugaresDoConteiner, lugaresDoPersonagem, tamanhoDoItem, usoDoItem } from './compartilhado/regras-grade.mjs';

// A grade do item: flags.cpr-fieldbook.grade = { lugar, x, y, girado, rev } (e o uso, em "Para organizar"). O tamanho da
// mochila no Carryall: flags.cpr-fieldbook.mochila ('P', 'M' ou 'G'; sem nada, a P).
export const FLAG_DA_GRADE = 'grade';
export const FLAG_DA_MOCHILA = 'mochila';

// O item como a regra o lê, do documento ou dos dados. montada: o que está dentro de outro item (o instaladoEm, a arma do
// cyberware, do acessório e da Combinação) e vai com ele.
export function itemNaRegra(item) {
  const fonte = item?._source ?? item ?? {};
  const flags = fonte.flags?.[SISTEMA] ?? {};
  const system = fonte.system ?? {};
  return {
    id: fonte._id ?? item?.id ?? '', name: fonte.name ?? '', type: fonte.type ?? '', catalogo: flags.catalogo ?? '', system,
    montada: Boolean(system.instaladoEm) || ehArmaMontadaEmItem(fonte), grade: flags[FLAG_DA_GRADE] ?? null, mochila: flags[FLAG_DA_MOCHILA] ?? null
  };
}

// Quem tem grade: o personagem e o contêiner que não é loja (o C109, parte 2). Do documento ou dos dados.
export function temGrade(ator) {
  const fonte = ator?._source ?? ator ?? {};
  return fonte.type === 'personagem' || (fonte.type === 'conteiner' && conteinerTemGrade(fonte.system?.tipo ?? 'loja'));
}
// O uso que o lugar do item deve dar: no contêiner, tudo está guardado; no personagem, o do item (usoDoItem).
export const usoNoAtor = (ator, item) => ((ator?._source ?? ator)?.type === 'conteiner' ? 'guardado' : usoDoItem(item));

// Os lugares do ator pelos itens dele. No contêiner, o "Conteúdo" do tamanho que o mestre escolheu. No personagem, os
// veículos (cada um, um porta-malas) e a mochila do Carryall que está no encaixe das costas. previsto: o Carryall equipado
// que ainda não tem lugar (a migração) conta como posto.
export function lugaresDoAtor(ator, itens, { previsto = false } = {}) {
  if ((ator?._source ?? ator)?.type === 'conteiner') return lugaresDoConteiner((ator?._source ?? ator).system?.grade ?? {});
  const veiculos = itens.filter(item => item.type === 'veiculo' && !item.montada).map(item => ({ id: item.id, nome: item.name, catalogo: item.catalogo, tipo: item.system.tipo ?? '' }));
  const ehCarryall = item => item.catalogo === 'core_gear:carryall' || /^carryall$/i.test(String(item.name).trim());
  const nasCostas = itens.find(item => item.grade?.lugar === 'corpo:mochila')
    ?? (previsto ? itens.filter(item => ehCarryall(item) && !item.grade && usoDoItem(item) === 'equipado').sort((x, y) => (x.id < y.id ? -1 : 1))[0] : null);
  const mochila = nasCostas ? (['P', 'M', 'G'].includes(nasCostas.mochila) ? nasCostas.mochila : 'P') : null;
  const fonte = ator?._source ?? ator ?? {};
  return lugaresDoPersonagem({ moradia: fonte.system?.moradia ?? {}, veiculos, mochila });
}
export const bodyDoAtor = ator => Number((ator?._source ?? ator)?.system?.atributos?.body?.valor) || 0;

// O que a linha do item leva para a wiki (o "Na mesa", o C110): o lugar, o tamanho e, no corpo, os encaixes que ele ocupa
// (a arma de duas mãos, as duas mãos). A wiki desenha a grade com isso, sem os dados do item. Sem tamanho (o montado, o
// cyberware instalado, o veículo), null.
export function gradeParaAWiki(item, body = 0) {
  const tamanho = tamanhoDoItem(item);
  if (!tamanho) return null;
  const grade = item.grade ? { ...item.grade } : null;
  const ocupa = grade && ENCAIXES[grade.lugar] ? encaixesDoItem(item, grade.lugar, body) ?? [grade.lugar] : null;
  return { grade, tamanho, ...(ocupa ? { ocupa } : {}) };
}

// Os outros itens do personagem como o estado da regra: [{ item, grade }].
export const estadoDe = (itens, menos = '') => itens.filter(item => item.id !== menos && item.grade && tamanhoDoItem(item)).map(item => ({ item, grade: item.grade }));

// A migração 11 (o C108; o personagem), a 12 (o C109, parte 2; o contêiner) e o ator criado com os itens dentro: cada
// item que ainda não tem lugar ganha um, sem mudar o uso de nenhum e sem mexer no que já tem lugar. Nos dados (o
// toObject), no lugar; rodar de novo não muda nada. Devolve se mudou.
export function arrumarDadosDoAtor(dados) {
  if (!temGrade(dados)) return false;
  // O item criado dentro do ator (o crossover, uma macro) pode chegar ainda sem _id: vale a posição na lista.
  const itens = (dados.items ?? []).map((item, i) => ({ ...itemNaRegra(item), id: item._id || `#${i}` }));
  const novos = itens.filter(item => !item.grade && tamanhoDoItem(item));
  if (!novos.length) return false;
  const lugares = lugaresDoAtor(dados, itens, { previsto: true });
  const resultado = arrumar(novos.map(item => ({ ...item, uso: usoNoAtor(dados, item) })), lugares, { body: bodyDoAtor(dados), fixos: estadoDe(itens) });
  for (const [i, item] of dados.items.entries()) {
    const grade = resultado[item._id || `#${i}`];
    if (!grade) continue;
    item.flags ??= {};
    item.flags[SISTEMA] ??= {};
    item.flags[SISTEMA][FLAG_DA_GRADE] = { ...grade, rev: 1 };
  }
  return true;
}
export const arrumarPersonagem = dados => dados?.type === 'personagem' && arrumarDadosDoAtor(dados);
export const arrumarConteiner = dados => dados?.type === 'conteiner' && arrumarDadosDoAtor(dados);
