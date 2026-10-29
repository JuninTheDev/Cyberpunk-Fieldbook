// Veículos são itens do personagem, como no CORE. O ponteiro único escolhe o que está em uso; a frota fica guardada.
import { itemDoCatalogo } from './catalogo.mjs';
import { ARMAS_VEICULARES, prepararArmaVeicular as prepararDados } from './armas-veiculos.mjs';
import { SISTEMA } from './config.mjs';
import { motivoDoAssento } from './regras-tripulacao.mjs';
import { danoNoVeiculo, danoNoVidro } from './regras-veiculos.mjs';
import { itemDoVeiculo, sincronizarVeiculo } from './vinculo-veiculo.mjs';

// Um clique de cada vez por ator: preparar duas vezes não cria duas armas para o mesmo upgrade.
const filas = new Map();
function naFila(ator, tarefa) {
  const chave = ator.uuid;
  const anterior = filas.get(chave) ?? Promise.resolve();
  const atual = anterior.then(tarefa, tarefa);
  filas.set(chave, atual);
  void atual.finally(() => { if (filas.get(chave) === atual) filas.delete(chave); }).catch(() => {});
  return atual;
}

export function veiculoAtivo(ator) {
  const item = ator.items.get(ator.system.veiculo);
  return item?.type === 'veiculo' ? item : null;
}

// O veículo que o ator dirige agora (o em uso, com "Dirigindo" ligado; o C40), ou null.
export function veiculoDirigido(ator) {
  return ator?.system?.dirigindo ? veiculoAtivo(ator) : null;
}

export function usarVeiculo(ator, id = '') {
  if (!ator.isOwner) return null;
  return naFila(ator, () => {
    if (id && ator.items.get(id)?.type !== 'veiculo') return null;
    return ator.update({ 'system.veiculo': id, 'system.dirigindo': false });
  });
}

export function dirigirVeiculo(ator, dirigindo = true) {
  if (!ator.isOwner) return null;
  return naFila(ator, () => ator.update({ 'system.dirigindo': Boolean(dirigindo && veiculoAtivo(ator)) }));
}

// A instalação e a seleção são conferidas novamente depois das janelas de ataque, antes de consumir munição.
// assento: o de quem atira (tripulacao.assentoDaArma; o C46, parte 4: com o token do veículo na cena, só o motorista dele);
// sem ele (a recarga, o dano avulso), o C15: o veículo da arma em uso pelo dono.
export function motivoVeicular(arma, modo, assento = null) {
  const id = arma.system.instaladoEm;
  const regra = arma.getFlag(SISTEMA, 'armaVeicular');
  if (!id && !regra) return '';
  const veiculo = arma.actor?.items.get(id);
  if (veiculo?.type !== 'veiculo') return 'A arma montada está sem veículo.';
  const doAssento = motivoDoAssento(assento ?? { emUso: arma.actor.veiculoAtivo?.id === id });
  if (doAssento) return doAssento;
  if (regra) {
    const upgrade = arma.actor.items.get(regra.upgrade);
    if (upgrade?.type !== 'upgrade' || upgrade.system.alvo !== 'veiculo' || upgrade.system.instaladoEm !== id
      || !Object.hasOwn(ARMAS_VEICULARES, upgrade.getFlag(SISTEMA, 'catalogo'))) return 'O upgrade desta arma não está instalado no veículo.';
    if (regra.soAutofogo && modo !== 'autofogo') return 'A metralhadora de bordo só dispara com Autofogo.';
  }
  return '';
}

export function prepararArma(upgrade) {
  const ator = upgrade.actor;
  if (!ator?.isOwner) return null;
  return naFila(ator, async () => {
    const catalogo = upgrade.getFlag(SISTEMA, 'catalogo');
    const regra = Object.hasOwn(ARMAS_VEICULARES, catalogo) ? ARMAS_VEICULARES[catalogo] : null;
    const id = upgrade.system.instaladoEm;
    if (!regra || upgrade.type !== 'upgrade' || upgrade.system.alvo !== 'veiculo' || ator.items.get(id)?.type !== 'veiculo') return null;
    const existente = ator.items.find(item => item.type === 'arma' && item.getFlag(SISTEMA, 'armaVeicular')?.upgrade === upgrade.id);
    if (existente) {
      // Reaproveita a arma e seu pente quando a instalação muda de veículo.
      if (existente.system.instaladoEm !== id) await existente.update({ 'system.instaladoEm': id });
      return existente;
    }
    const modelo = await itemDoCatalogo(regra.modelo);
    // O catálogo pode demorar: não use um upgrade que saiu ou trocou de veículo durante a espera.
    if (ator.items.get(upgrade.id) !== upgrade || upgrade.system.instaladoEm !== id || ator.items.get(id)?.type !== 'veiculo') return null;
    const dados = prepararDados(upgrade.toObject(), modelo);
    if (!dados) return null;
    return (await ator.createEmbeddedDocuments('Item', [dados]))[0] ?? null;
  });
}

export function adicionarJanela(veiculo, nome = 'Janela') {
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner) return null;
  const id = foundry.utils.randomID();
  const max = veiculo.system.vidroMax;
  return veiculo.update({ [`system.janelas.${id}`]: { nome: String(nome).trim() || 'Janela', hp: { value: max, max } } }).then(() => id);
}

export function removerJanela(veiculo, id) {
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner || !Object.hasOwn(veiculo.system.janelas, id)) return null;
  return veiculo.update({ [`system.janelas.-=${id}`]: null });
}

// Ao instalar/tirar vidro blindado, o mestre ajusta as janelas existentes sem apagar o dano sofrido por cada uma.
export function ajustarVidros(veiculo) {
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner) return null;
  const max = veiculo.system.vidroMax;
  const mudancas = {};
  for (const [id, janela] of Object.entries(veiculo.system.janelas)) {
    mudancas[`system.janelas.${id}.hp`] = { max, value: Math.max(0, max - Math.max(0, janela.hp.max - janela.hp.value)) };
  }
  return Object.keys(mudancas).length ? veiculo.update(mudancas) : null;
}

export async function receberDanoNoVidro(veiculo, { janela, dano, explosivo = false }) {
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner) return null;
  const vidro = Object.hasOwn(veiculo.system.janelas, janela) ? veiculo.system.janelas[janela] : null;
  if (!vidro) return null;
  const conta = danoNoVidro({ hp: vidro.hp.value, dano, explosivo });
  if (conta.perdeu) await veiculo.update({ [`system.janelas.${janela}.hp.value`]: conta.depois });
  return { veiculo: veiculo.uuid, janela, nome: `${veiculo.name}: ${vidro.nome}`, ...conta };
}

export function desfazerDanoNoVidro(veiculo, { janela, perdeu = 0 }) {
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner) return null;
  const vidro = Object.hasOwn(veiculo.system.janelas, janela) ? veiculo.system.janelas[janela] : null;
  if (!vidro || !perdeu) return null;
  return veiculo.update({ [`system.janelas.${janela}.hp.value`]: Math.min(vidro.hp.max, vidro.hp.value + perdeu) });
}

const estadoVeicular = veiculo => veiculo.documentName === 'Actor' ? itemDoVeiculo(veiculo) ?? veiculo : veiculo;

export async function receberDanoVeicular(veiculo, dados) {
  const item = estadoVeicular(veiculo);
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner || !item.isOwner) return null;
  // C46.2: o espelho pode ainda estar chegando do socket. A conta e a fila usam sempre o item, também pelo ocupante.
  return naFila(item, async () => {
    const conta = danoNoVeiculo({ ...dados, sdp: item.system.sdp.value, sp: item.system.blindagem.sp });
    await item.update({ 'system.sdp.value': conta.depois, 'system.ablacao': item.system.ablacao + conta.ablado });
    if (item !== veiculo) await sincronizarVeiculo(veiculo);
    return { veiculo: veiculo.uuid, nome: item.name, ...conta };
  });
}

export function desfazerDanoVeicular(veiculo, { perdeu = 0, ablado = 0 }) {
  const item = estadoVeicular(veiculo);
  if (veiculo.type !== 'veiculo' || !veiculo.isOwner || !item.isOwner) return null;
  return naFila(item, async () => {
    const resultado = await item.update({ 'system.sdp.value': item.system.sdp.value + perdeu, 'system.ablacao': Math.max(0, item.system.ablacao - ablado) });
    if (item !== veiculo) await sincronizarVeiculo(veiculo);
    return resultado;
  });
}
