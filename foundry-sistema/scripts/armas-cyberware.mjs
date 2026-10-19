// O cyberware que é arma (o C11; o isWeapon do cyberware do CORE 0.92.4, com os campos do attackable e do loadable): os
// Wolvers, as Rippers, a Popup Ranged Weapon… O cyberware instalado num ator tem a sua arma, um item de arma do mesmo
// ator ligado a ele (a flag armaDoCyberware e o instaladoEm, como a arma montada num veículo): ela ataca, recarrega e gasta
// o pente como as outras (combate.mjs), não ocupa as mãos (o CORE só conta as armas empunhadas) e fica na aba Combate,
// fora do inventário e da wiki (a wiki conhece o cyberware). Desinstalado ou apagado o cyberware, a arma sai, e as balas do
// pente voltam para a munição delas. A arma do cyberware se muda na ficha do cyberware, e a dela acompanha.
import { SISTEMA } from './config.mjs';

export const FLAG_DA_ARMA = 'armaDoCyberware';
// Os campos da arma que vêm do cyberware (o pente atual e a munição carregada são da arma).
const CAMPOS = ['tipo', 'pericia', 'dano', 'cdt', 'aDistancia', 'municoes', 'autofogo', 'supressivo', 'bonusAtaque', 'qualidade', 'falhaCritica', 'ocultavel', 'tabelaDV', 'ignorarArmadura', 'ignorarAbaixo'];
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A arma de um cyberware (nos documentos ou nos dados).
export const ehArmaDoCyberware = item => item?.type === 'arma' && Boolean(item.flags?.[SISTEMA]?.[FLAG_DA_ARMA]);

// Só dados: a arma que o cyberware dá, ou null (o cyberware que não ataca).
export function dadosDaArmaDoCyberware(cyberware) {
  const arma = cyberware?.system?.arma;
  if (cyberware?.type !== 'cyberware' || !arma?.ataca) return null;
  const id = cyberware.id ?? cyberware._id ?? '';
  return {
    name: cyberware.name, type: 'arma', img: arma.aDistancia ? 'icons/svg/target.svg' : 'icons/svg/sword.svg',
    system: { ...Object.fromEntries(CAMPOS.map(campo => [campo, structuredClone(arma[campo])])), pente: { value: 0, max: arma.pente }, maos: 0, slots: 0, equipada: false, instaladoEm: id },
    flags: { [SISTEMA]: { [FLAG_DA_ARMA]: id } }
  };
}

// O que muda na arma (o update) para ela ficar como a do cyberware. pente: o máximo da arma, sem o do carregador.
export function mudancasDaArma({ name, system, pente = system.pente.max }, cyberware) {
  const dados = dadosDaArmaDoCyberware(cyberware);
  if (!dados) return {};
  const mudancas = {};
  if (name !== dados.name) mudancas.name = dados.name;
  for (const campo of CAMPOS) if (!iguais(system[campo], dados.system[campo])) mudancas[`system.${campo}`] = dados.system[campo];
  if (pente !== dados.system.pente.max) mudancas['system.pente.max'] = dados.system.pente.max;
  return mudancas;
}

// Por que a arma do cyberware não ataca nem recarrega agora ('' se pode): o ataque confere antes e depois da rolagem.
export function motivoDaArmaDoCyberware(arma) {
  const id = arma.getFlag(SISTEMA, FLAG_DA_ARMA);
  const cyberware = arma.actor?.items.get(id);
  if (cyberware?.type !== 'cyberware' || arma.system.instaladoEm !== id) return 'O cyberware desta arma não está na ficha.';
  if (!cyberware.system.instalado) return `${cyberware.name} não está instalado.`;
  if (cyberware.inoperante) return `${cyberware.name} está inoperante (EMP).`;
  return '';
}

// Um de cada vez por ator: instalar e mudar o cyberware ao mesmo tempo não cria duas armas.
const filas = new Map();
function naFila(ator, tarefa) {
  const chave = ator.uuid;
  const anterior = filas.get(chave) ?? Promise.resolve();
  const atual = anterior.then(tarefa, tarefa);
  filas.set(chave, atual);
  void atual.finally(() => { if (filas.get(chave) === atual) filas.delete(chave); }).catch(() => {});
  return atual;
}

// As balas do pente voltam para a munição delas, e a arma sai.
async function tirarArma(arma) {
  const municao = arma.municaoCarregada;
  if (municao && arma.system.pente.value) await municao.update({ 'system.quantidade': municao.system.quantidade + arma.system.pente.value });
  await arma.delete();
}

// Deixa o ator com a arma do cyberware (pelo id) se ele está instalado e ataca, e sem ela se não: cria, acerta ou tira.
export function sincronizarArmaDoCyberware(ator, id) {
  if (!ator?.isOwner) return null;
  return naFila(ator, async () => {
    const cyberware = ator.items.get(id);
    const dados = cyberware?.type === 'cyberware' && cyberware.system.instalado ? dadosDaArmaDoCyberware(cyberware) : null;
    const armas = ator.items.filter(item => item.type === 'arma' && item.getFlag(SISTEMA, FLAG_DA_ARMA) === id);
    const fica = dados ? armas[0] ?? null : null;
    for (const arma of armas.filter(arma => arma !== fica)) await tirarArma(arma);
    if (!dados) return null;
    if (!fica) return (await ator.createEmbeddedDocuments('Item', [dados]))[0] ?? null;
    const mudancas = mudancasDaArma({ name: fica.name, system: fica.system, pente: fica._source.system.pente.max }, cyberware);
    if (Object.keys(mudancas).length) await fica.update(mudancas);
    return fica;
  });
}

// No cliente de quem mudou o cyberware: instalar, tirar, apagar, mudar a arma ou o nome.
export function registrarArmasDoCyberware() {
  const doCyberware = (item, usuario) => item.type === 'cyberware' && item.actor && usuario === game.user.id;
  Hooks.on('createItem', (item, _opcoes, usuario) => { if (doCyberware(item, usuario)) sincronizarArmaDoCyberware(item.actor, item.id); });
  Hooks.on('updateItem', (item, mudancas, _opcoes, usuario) => {
    if (doCyberware(item, usuario) && ('name' in mudancas || ['instalado', 'arma'].some(campo => campo in (mudancas.system ?? {})))) sincronizarArmaDoCyberware(item.actor, item.id);
  });
  Hooks.on('deleteItem', (item, _opcoes, usuario) => { if (doCyberware(item, usuario)) sincronizarArmaDoCyberware(item.actor, item.id); });
}
