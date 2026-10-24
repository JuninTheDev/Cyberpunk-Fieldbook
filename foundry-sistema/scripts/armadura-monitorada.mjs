// A barra do token é um espelho dos itens, não uma segunda fonte de SP.
import { armadurasDoLocal, mudancasDoSPMonitorado } from './regras-armadura.mjs';

const filas = new WeakMap();
const pode = ator => ator?.isOwner && ['personagem', 'capanga'].includes(ator.type);
const localValido = local => ['cabeca', 'corpo'].includes(local);
async function naFila(ator, operacao) {
  const anterior = filas.get(ator) ?? Promise.resolve();
  const atual = anterior.catch(() => {}).then(operacao);
  filas.set(ator, atual);
  try { return await atual; } finally { if (filas.get(ator) === atual) filas.delete(ator); }
}

export function escolherArmaduraMonitorada(ator, local, id = '') {
  if (!pode(ator) || !localValido(local)) return Promise.resolve(null);
  return naFila(ator, async () => {
    if (!pode(ator) || !['', 'nenhuma'].includes(id) && !armadurasDoLocal(ator.items, local).some(item => item.id === id)) return null;
    return ator.update({ [`system.armaduraMonitorada.${local}`]: id });
  });
}

export function mudarSPMonitorado(ator, atributo, valor, delta = false) {
  const local = /^spMonitorado\.(cabeca|corpo)$/.exec(atributo)?.[1];
  if (!pode(ator) || !local) return Promise.resolve(null);
  return naFila(ator, async () => {
    if (!pode(ator)) return null;
    const mudancas = mudancasDoSPMonitorado([...ator.items], local, ator.system.armaduraMonitorada[local], valor, delta);
    if (mudancas.length) await ator.updateEmbeddedDocuments('Item', mudancas.map(({ id, valor: sp }) => ({ _id: id, [`system.sp.${local}.value`]: sp })));
    return ator;
  });
}

export async function mostrarSPNoToken(ator, local) {
  if (!pode(ator) || !localValido(local)) return null;
  const mudanca = { 'bar2.attribute': `spMonitorado.${local}` };
  if (ator.isToken) return ator.token?.update(mudanca) ?? null;
  await ator.prototypeToken.update(mudanca);
  for (const token of ator.getActiveTokens(false, true)) {
    if (token.actor?.uuid === ator.uuid) await token.update(mudanca);
  }
  return ator;
}
