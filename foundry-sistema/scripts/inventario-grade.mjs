// O inventário em grade no ator (o C108; o plano em inventario-plano/PLANO.md). A grade acompanha o que o sistema já faz,
// sem barrar nada de antes: o item que chega ganha um lugar do uso dele; o que muda de uso por outro caminho (a ficha, o
// Painel Tático, uma macro, o equipar com a conferência das mãos) muda de lugar junto; o lugar que some ou encolhe (a
// mochila tirada, o veículo que saiu, a moradia nova) manda o que não cabe mais para "Para organizar". Só o caminho novo,
// mover pela grade (moverNaGrade), confere o lugar e recusa com o motivo; ele muda o uso pelo lugar (o corpo equipa).
// Quem faz a mudança é quem mexeu (o cliente do userId): um navegador só, sem corrida entre o mestre e o jogador.
import { SISTEMA } from './config.mjs';
import { arrumar, conferirLugar, gradeParaUso, mudancasDoUso, reconciliar, tamanhoDoItem, usoDoItem, usoDoLugar } from './compartilhado/regras-grade.mjs';
import { arrumarDadosDoAtor, bodyDoAtor, estadoDe, FLAG_DA_GRADE, FLAG_DA_MOCHILA, itemNaRegra, lugaresDoAtor } from './regras-grade-ator.mjs';
import { naFilaDoInventario } from './pilhas.mjs';

const CAMINHO = `flags.${SISTEMA}.${FLAG_DA_GRADE}`;
const ehPersonagem = ator => ator?.documentName === 'Actor' && ator.type === 'personagem';
const itensDe = ator => ator.items.map(itemNaRegra);
const revDe = item => Number(item?.getFlag?.(SISTEMA, FLAG_DA_GRADE)?.rev ?? item?.grade?.rev) || 0;
const mesmoLugar = (a, b) => Boolean(a && b) && a.lugar === b.lugar && a.x === b.x && a.y === b.y && Boolean(a.girado) === Boolean(b.girado);
const ehCarryall = item => item.getFlag(SISTEMA, 'catalogo') === 'core_gear:carryall' || /^carryall$/i.test(String(item.name).trim());
// O ator apagado no meio (a reconciliação que ficou na fila): nada a fazer, nem a avisar.
const existe = ator => (ator.isToken ? Boolean(ator.token?.parent?.tokens.has(ator.token.id)) : game.actors.get(ator.id) === ator);
const avisarErro = ator => erro => { if (existe(ator)) console.warn(`${SISTEMA} | a grade de ${ator.name}:`, erro); };
export const lugaresDe = ator => lugaresDoAtor(ator, itensDe(ator));

// Os lugares reservados por quem está criando vários itens de uma vez: cada um passa pelo preCreate antes de o Foundry
// criar o primeiro, e sem a reserva dois nasceriam no mesmo quadrado. A reserva sai quando o item chega (ou em 10 s).
const reservas = new Map();
function soltar(ator, reserva) {
  const lista = (reservas.get(ator.uuid) ?? []).filter(outra => outra !== reserva);
  if (lista.length) reservas.set(ator.uuid, lista); else reservas.delete(ator.uuid);
}
function reservar(ator, item, grade) {
  const reserva = { item, grade };
  reservas.set(ator.uuid, [...(reservas.get(ator.uuid) ?? []), reserva]);
  setTimeout(() => soltar(ator, reserva), 10000);
}

// O item que chega (a importação, o pedido da loja, o saque, o "+" da ficha, outro ator): o lugar que já traz vale se é
// deste personagem e dá o uso dele; senão, o primeiro lugar livre do uso.
function aoCriar(item, _dados, _opcoes, usuario) {
  const ator = item.parent;
  if (!ehPersonagem(ator) || usuario !== game.user.id) return;
  // Ainda sem _id no preCreate: o id provisório separa os que nascem juntos (senão a reserva de um parece o próprio outro).
  const novo = itemNaRegra(item);
  novo.id ||= `novo:${foundry.utils.randomID()}`;
  if (!tamanhoDoItem(novo)) return;
  const itens = itensDe(ator);
  const outros = [...estadoDe(itens), ...(reservas.get(ator.uuid) ?? [])];
  const grade = gradeParaUso(novo, usoDoItem({ ...novo, grade: null }), lugaresDoAtor(ator, itens), outros, { body: bodyDoAtor(ator) });
  const final = grade ? { ...grade, rev: revDe(novo) + 1 } : novo.grade;
  if (grade) item.updateSource({ [CAMINHO]: final });
  reservar(ator, { ...novo, grade: final }, final);
}
function aoChegar(item) {
  const ator = item.parent;
  if (!ehPersonagem(ator)) return;
  const grade = item.getFlag(SISTEMA, FLAG_DA_GRADE);
  const reserva = (reservas.get(ator.uuid) ?? []).find(outra => mesmoLugar(outra.grade, grade) && outra.item.name === item.name);
  if (reserva) soltar(ator, reserva);
}

// O item que muda. Com a grade nas mudanças (o moverNaGrade, a reconciliação, o arrumar), confere se o resto do sistema
// deixou: a arma e o escudo que a conferência das mãos não deixou equipar (o _preUpdate, que roda antes) não vão para a
// mão. Sem a grade, se o uso mudou (ou o item entrou noutro, ou saiu), o lugar acompanha.
const MUDA_O_USO = ['equipada', 'uso', 'instaladoEm', 'instalado'];
function aoMudar(item, mudancas, _opcoes, usuario) {
  const ator = item.parent;
  if (!ehPersonagem(ator) || usuario !== game.user.id) return;
  // A grade que se apaga (o _del) ou se limpa (null) não é um lugar pedido.
  const pedida = foundry.utils.getProperty(mudancas, CAMINHO);
  const lugarPedido = typeof pedida?.lugar === 'string' ? pedida : null;
  const doUso = Object.keys(mudancas.system ?? {}).some(campo => MUDA_O_USO.includes(campo));
  if (!lugarPedido && !doUso) return;
  const system = foundry.utils.mergeObject(foundry.utils.deepClone(item._source.system), mudancas.system ?? {}, { inplace: false });
  const depois = { ...itemNaRegra({ ...item._source, system }), grade: lugarPedido ?? itemNaRegra(item).grade };
  if (lugarPedido) {
    if (['arma', 'armadura'].includes(item.type) && usoDoLugar(lugarPedido.lugar, lugarPedido.uso) === 'equipado' && !system.equipada) delete foundry.utils.getProperty(mudancas, `flags.${SISTEMA}`)[FLAG_DA_GRADE];
    return;
  }
  if (!tamanhoDoItem(depois)) {
    if (item.getFlag(SISTEMA, FLAG_DA_GRADE)) foundry.utils.setProperty(mudancas, CAMINHO, null);
    return;
  }
  const itens = itensDe(ator);
  const grade = gradeParaUso(depois, usoDoItem(depois), lugaresDoAtor(ator, itens), estadoDe(itens, item.id), { body: bodyDoAtor(ator) });
  if (grade) foundry.utils.setProperty(mudancas, CAMINHO, { ...grade, rev: revDe(item) + 1 });
}

// Grava as grades novas, com o rev de cada item mais 1.
async function gravar(ator, grades) {
  const atualizacoes = Object.entries(grades).filter(([id]) => ator.items.has(id))
    .map(([id, grade]) => ({ _id: id, [CAMINHO]: { ...grade, rev: revDe(ator.items.get(id)) + 1 } }));
  if (atualizacoes.length) await ator.updateEmbeddedDocuments('Item', atualizacoes);
  return atualizacoes.length;
}

// Depois que um lugar some ou encolhe: o que não cabe mais vai para "Para organizar".
export function reconciliarAtor(ator) {
  return naFilaDoInventario([ator], async () => {
    if (!ehPersonagem(ator) || !ator.isOwner || !existe(ator)) return 0;
    const itens = itensDe(ator);
    return gravar(ator, reconciliar(itens, lugaresDoAtor(ator, itens), { body: bodyDoAtor(ator) }));
  });
}
// O ator criado com os itens dentro (o crossover, uma macro): os itens não passam pelo preCreate de cada um; os que chegam
// sem lugar ganham o seu antes de o ator nascer, como na migração.
function aoCriarAtor(ator, _dados, _opcoes, usuario) {
  if (usuario !== game.user.id || ator.type !== 'personagem' || !ator._source.items?.length) return;
  const dados = ator.toObject();
  if (arrumarDadosDoAtor(dados)) ator.updateSource({ items: dados.items });
}
// A mochila (o Carryall nas costas, e o tamanho dela) e os veículos fazem lugares: mudou um deles, confere tudo.
function mexeNosLugares(item, mudancas) {
  if (item.type === 'veiculo') return !mudancas || foundry.utils.hasProperty(mudancas, 'system.tipo');
  return ehCarryall(item) && (!mudancas || foundry.utils.hasProperty(mudancas, CAMINHO) || foundry.utils.hasProperty(mudancas, `flags.${SISTEMA}.${FLAG_DA_MOCHILA}`));
}
function depoisDoItem(item, mudancas, usuario) {
  if (usuario !== game.user.id || !ehPersonagem(item.parent) || !mexeNosLugares(item, mudancas)) return;
  reconciliarAtor(item.parent).catch(avisarErro(item.parent));
}

// Mover pela grade: destino { lugar, x, y, girado }. Confere o lugar, muda o uso pelo lugar (o corpo equipa; o resto do
// sistema ainda confere as mãos) e sobe o rev. Devolve { ok, motivo }.
export function moverNaGrade(item, destino) {
  const ator = item.parent;
  return naFilaDoInventario([ator], async () => {
    if (!ehPersonagem(ator) || !ator.isOwner || !ator.items.has(item.id)) return { ok: false, motivo: 'Este item não está num personagem seu.' };
    const documento = ator.items.get(item.id);
    const atual = itemNaRegra(documento);
    const itens = itensDe(ator);
    const pedido = { lugar: destino?.lugar, x: Number(destino?.x) || 0, y: Number(destino?.y) || 0, girado: Boolean(destino?.girado) };
    const motivo = conferirLugar(lugaresDoAtor(ator, itens), estadoDe(itens, item.id), atual, pedido, { body: bodyDoAtor(ator) });
    if (motivo) { ui.notifications.warn(motivo); return { ok: false, motivo }; }
    const uso = usoDoLugar(pedido.lugar, usoDoItem(atual));
    const grade = { ...pedido, ...(pedido.lugar === 'organizar' ? { uso } : {}), rev: revDe(documento) + 1 };
    await documento.update({ ...mudancasDoUso(atual, uso), [CAMINHO]: grade });
    const ficou = ator.items.get(item.id)?.getFlag(SISTEMA, FLAG_DA_GRADE);
    return mesmoLugar(ficou, pedido) ? { ok: true, motivo: '' } : { ok: false, motivo: `${documento.name} não foi para lá: a mesa não deixou.` };
  });
}

// O botão "Arrumar": tudo de novo, do maior para o menor, sem mudar o uso de nenhum item.
export function arrumarAtor(ator) {
  return naFilaDoInventario([ator], async () => {
    if (!ehPersonagem(ator) || !ator.isOwner) return 0;
    const itens = itensDe(ator);
    const resultado = arrumar(itens.map(item => ({ ...item, uso: usoDoItem(item) })), lugaresDoAtor(ator, itens), { body: bodyDoAtor(ator) });
    return gravar(ator, Object.fromEntries(Object.entries(resultado).filter(([id, grade]) => !mesmoLugar(itens.find(item => item.id === id)?.grade, grade))));
  });
}

export const API = { moverNaGrade, arrumarAtor, reconciliarAtor, lugaresDe, itemNaRegra };

export function registrarInventarioGrade() {
  Hooks.on('preCreateItem', aoCriar);
  Hooks.on('createItem', aoChegar);
  Hooks.on('preUpdateItem', aoMudar);
  Hooks.on('updateItem', (item, mudancas, _opcoes, usuario) => depoisDoItem(item, mudancas, usuario));
  Hooks.on('deleteItem', (item, _opcoes, usuario) => depoisDoItem(item, null, usuario));
  Hooks.on('preCreateActor', aoCriarAtor);
  Hooks.on('updateActor', (ator, mudancas, _opcoes, usuario) => {
    if (usuario === game.user.id && ehPersonagem(ator) && foundry.utils.hasProperty(mudancas, 'system.moradia')) reconciliarAtor(ator).catch(avisarErro(ator));
  });
}
