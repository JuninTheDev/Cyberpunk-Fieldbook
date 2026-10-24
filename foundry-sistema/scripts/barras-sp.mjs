// As barras do token acompanham o maior SP atual de cada local (C18). CORE 0.92.4:
// hooks/actor/sync-tracked-armor.js: reduzir abla todas as camadas; aumentar restaura só a peça acompanhada.
import { armaduraDoLocal, armadurasDoLocal, spComVariacao } from './regras-armadura.mjs';

export const BARRAS_SP = { 'armadura.cabeca': 'cabeca', 'armadura.corpo': 'corpo' };
const filas = new WeakMap();
const podeMudar = ator => ator?.isOwner && ['personagem', 'capanga'].includes(ator.type);

// A fila é deste cliente. Duas entradas relativas no mesmo ator leem o SP que ficou após a gravação anterior;
// a permissão e a peça são relidas depois da espera, inclusive quando a operação anterior foi recusada.
export async function mudarSpPelaBarra(ator, local, valor, delta = false) {
  if (!podeMudar(ator) || !['cabeca', 'corpo'].includes(local) || !Number.isSafeInteger(valor)) return [];
  const anterior = filas.get(ator) ?? Promise.resolve();
  let liberar;
  const atual = new Promise(resolve => { liberar = resolve; });
  filas.set(ator, atual);
  await anterior;
  try {
    if (!podeMudar(ator)) return [];
    const principal = armaduraDoLocal(ator.items, local);
    if (!principal) return [];
    const sp = principal.system.sp[local];
    const depois = delta ? spComVariacao(sp, valor) : Math.max(0, Math.min(sp.max, valor));
    const variacao = depois - sp.value;
    if (!variacao) return [];
    const fontes = variacao < 0 ? armadurasDoLocal(ator.items, local) : [principal];
    const mudancas = fontes.map(item => ({ _id: item.id,
      [`system.sp.${local}.value`]: spComVariacao(item.system.sp[local], variacao) }));
    return await ator.updateEmbeddedDocuments('Item', mudancas);
  } finally {
    liberar();
    if (filas.get(ator) === atual) filas.delete(ator);
  }
}
