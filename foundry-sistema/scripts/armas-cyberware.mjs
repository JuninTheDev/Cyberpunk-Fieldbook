// O cyberware e o acessório que são arma (o C11; o CORE 0.92.4: o isWeapon do cyberware e o secondaryWeapon do
// itemUpgrade, com os campos do attackable e do loadable; o getWeapons do ator diz quando cada um está pronto): os
// Wolvers, a Popup Ranged Weapon, a baioneta, o lança-granadas sob o cano… O cyberware instalado e o acessório instalado
// numa arma do ator têm a sua arma, um item de arma do mesmo ator ligado a ele (a flag armaDoCyberware ou armaDoUpgrade e
// o instaladoEm, como a arma montada num veículo): ela ataca, recarrega e gasta o pente como as outras (combate.mjs), não
// ocupa as mãos (o CORE só conta as armas empunhadas; a do acessório usa as da arma onde está) e fica na aba Combate, fora
// do inventário e da wiki (a wiki conhece o cyberware e o acessório). A do cyberware está pronta com ele instalado; a do
// acessório, com a arma onde ele está equipada. Tirado ou apagado o item (ou a arma do acessório), a arma sai, e as balas
// do pente voltam para a munição delas. A arma se muda na ficha do item, e a dela acompanha.
import { SISTEMA } from './config.mjs';
import { penteComCarregador, sobraDoPente } from './regras.mjs';

export const FLAG_DA_ARMA = 'armaDoCyberware';
export const FLAG_DO_UPGRADE = 'armaDoUpgrade';
const FLAG_DO_TIPO = { cyberware: FLAG_DA_ARMA, upgrade: FLAG_DO_UPGRADE };
// Os campos da arma que vêm do item (o pente atual e a munição carregada são da arma).
const CAMPOS = ['tipo', 'pericia', 'dano', 'cdt', 'aDistancia', 'municoes', 'autofogo', 'supressivo', 'bonusAtaque', 'qualidade', 'falhaCritica', 'ocultavel', 'tabelaDV', 'ignorarArmadura', 'ignorarAbaixo'];
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A arma de um cyberware, a de um acessório, e o id do item de onde ela vem (nos documentos ou nos dados).
export const ehArmaDoCyberware = item => item?.type === 'arma' && Boolean(item.flags?.[SISTEMA]?.[FLAG_DA_ARMA]);
export const ehArmaDoUpgrade = item => item?.type === 'arma' && Boolean(item.flags?.[SISTEMA]?.[FLAG_DO_UPGRADE]);
export const ehArmaMontadaEmItem = item => ehArmaDoCyberware(item) || ehArmaDoUpgrade(item);
export const idDaOrigem = arma => (arma?.type === 'arma' ? arma.flags?.[SISTEMA]?.[FLAG_DA_ARMA] || arma.flags?.[SISTEMA]?.[FLAG_DO_UPGRADE] || '' : '');

// Só dados: a arma que o cyberware ou o acessório dá, ou null (o que não ataca).
export function dadosDaArmaMontada(item) {
  const arma = item?.system?.arma;
  const flag = FLAG_DO_TIPO[item?.type];
  if (!flag || !arma?.ataca) return null;
  const id = item.id ?? item._id ?? '';
  return {
    name: item.name, type: 'arma', img: arma.aDistancia ? 'icons/svg/target.svg' : 'icons/svg/sword.svg',
    system: { ...Object.fromEntries(CAMPOS.map(campo => [campo, structuredClone(arma[campo])])), pente: { value: 0, max: arma.pente }, maos: 0, slots: 0, equipada: false, instaladoEm: id },
    flags: { [SISTEMA]: { [flag]: id } }
  };
}

// O que muda na arma (o update) para ela ficar como a do item. pente: o máximo da arma, sem o do carregador.
export function mudancasDaArma({ name, system, pente = system.pente.max }, item) {
  const dados = dadosDaArmaMontada(item);
  if (!dados) return {};
  const mudancas = {};
  if (name !== dados.name) mudancas.name = dados.name;
  for (const campo of CAMPOS) if (!iguais(system[campo], dados.system[campo])) mudancas[`system.${campo}`] = dados.system[campo];
  if (pente !== dados.system.pente.max) mudancas['system.pente.max'] = dados.system.pente.max;
  return mudancas;
}

// Onde o item dá a arma: o cyberware instalado; o acessório instalado numa arma do ator.
const montado = item => (item?.type === 'cyberware' ? item.system.instalado : item?.type === 'upgrade' && item.actor?.items.get(item.system.instaladoEm)?.type === 'arma');
// A arma onde está o acessório da arma (a arma do acessório), ou null.
export const armaDoAcessorio = arma => (ehArmaDoUpgrade(arma) ? arma.instaladoNo?.instaladoNo ?? null : null);
// A arma do cyberware está pronta sempre; a do acessório, com a arma onde ele está equipada (o equipped do CORE).
export const armaMontadaPronta = arma => ehArmaDoCyberware(arma) || Boolean(armaDoAcessorio(arma)?.system.equipada);

// Por que a arma do item não ataca nem recarrega agora ('' se pode): o ataque confere antes e depois da rolagem.
export function motivoDaArmaMontada(arma) {
  const id = idDaOrigem(arma);
  const origem = arma.actor?.items.get(id);
  if (!FLAG_DO_TIPO[origem?.type] || arma.system.instaladoEm !== id) return `O ${ehArmaDoUpgrade(arma) ? 'acessório' : 'cyberware'} desta arma não está na ficha.`;
  if (origem.type === 'cyberware' && !origem.system.instalado) return `${origem.name} não está instalado.`;
  if (origem.type === 'upgrade') {
    const hospede = arma.actor.items.get(origem.system.instaladoEm);
    if (hospede?.type !== 'arma') return `${origem.name} não está instalado numa arma.`;
    if (!hospede.system.equipada) return `Equipe ${hospede.name} para usar ${origem.name}.`;
  }
  if (origem.inoperante) return `${origem.name} está inoperante (EMP).`;
  return '';
}

// Um de cada vez por ator: instalar e mudar o item ao mesmo tempo não cria duas armas.
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

// Deixa o ator com a arma do item (pelo id) se ele está montado e ataca, e sem ela se não: cria, acerta ou tira.
export function sincronizarArmaMontada(ator, id) {
  if (!ator?.isOwner) return null;
  return naFila(ator, async () => {
    const item = ator.items.get(id);
    const dados = montado(item) ? dadosDaArmaMontada(item) : null;
    const armas = ator.items.filter(arma => idDaOrigem(arma) === id);
    const fica = dados ? armas[0] ?? null : null;
    for (const arma of armas.filter(arma => arma !== fica)) await tirarArma(arma);
    if (!dados) return null;
    if (!fica) return (await ator.createEmbeddedDocuments('Item', [dados]))[0] ?? null;
    const mudancas = mudancasDaArma({ name: fica.name, system: fica.system, pente: fica._source.system.pente.max }, item);
    if (Object.keys(mudancas).length) await fica.update(mudancas);
    return fica;
  });
}

// Tirado o carregador (o C11, parte 4), o pente que passa do máximo volta ao máximo, e as balas que sobram voltam para a
// munição delas. O máximo sai da fonte e dos carregadores instalados agora (o mesmo do prepareDerivedData da arma).
export function acertarPentes(ator) {
  if (!ator?.isOwner) return null;
  return naFila(ator, async () => {
    for (const arma of ator.items.filter(item => item.type === 'arma')) {
      const max = penteComCarregador(arma._source.system.pente.max, ator.items.filter(item => item.type === 'upgrade' && item.system.instaladoEm === arma.id).map(item => item.system.modificadores.pente));
      const sobra = sobraDoPente({ value: arma.system.pente.value, max });
      if (!sobra) continue;
      const municao = arma.municaoCarregada;
      if (municao) await municao.update({ 'system.quantidade': municao.system.quantidade + sobra });
      await arma.update({ 'system.pente.value': max });
    }
  });
}

// No cliente de quem mudou o item: instalar, tirar, apagar, mudar a arma ou o nome; apagar a arma de um acessório; tirar
// ou apagar um acessório (o pente).
export function registrarArmasDoCyberware() {
  const meu = (item, usuario) => Boolean(item.actor) && usuario === game.user.id;
  const daOrigem = (item, usuario) => Boolean(FLAG_DO_TIPO[item.type]) && meu(item, usuario);
  const sincronizar = item => sincronizarArmaMontada(item.actor, item.id);
  Hooks.on('createItem', (item, _opcoes, usuario) => { if (daOrigem(item, usuario)) sincronizar(item); });
  Hooks.on('updateItem', (item, mudancas, _opcoes, usuario) => {
    const campos = item.type === 'upgrade' ? ['instaladoEm', 'arma'] : ['instalado', 'arma'];
    if (daOrigem(item, usuario) && ('name' in mudancas || campos.some(campo => campo in (mudancas.system ?? {})))) sincronizar(item);
    if (item.type === 'upgrade' && meu(item, usuario) && 'instaladoEm' in (mudancas.system ?? {})) acertarPentes(item.actor);
  });
  Hooks.on('deleteItem', (item, _opcoes, usuario) => {
    if (daOrigem(item, usuario)) sincronizar(item);
    if (item.type === 'upgrade' && meu(item, usuario)) acertarPentes(item.actor);
    // A arma que sai leva a arma dos acessórios dela (eles ficam sem lugar).
    if (item.type === 'arma' && meu(item, usuario)) for (const acessorio of item.actor.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id)) sincronizar(acessorio);
  });
}
