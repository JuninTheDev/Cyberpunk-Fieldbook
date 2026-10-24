// Um ID de montagem só vale na coleção de origem: o ator, o mundo ou o compêndio.
import { SISTEMA } from './config.mjs';
import { cabeNaFundacao } from './regras.mjs';

export const podeConsultarItem = item => Boolean(game.user && item?.testUserPermission(game.user, 'OBSERVER'));
export const itensNoContexto = item => item.actor?.items ?? (item.inCompendium ? [] : game.items?.filter(podeConsultarItem) ?? []);
export const itemDoMundo = item => !item.parent && !item.inCompendium && game.items?.get(item.id) === item;

// As opções da ficha usam os mesmos tipos do inventário. A fundação do mundo não exige estar instalada num ator.
export function destinosDeInstalacao(item) {
  const itens = itensNoContexto(item);
  const tipo = item.type === 'programa' ? 'cyberdeck' : item.type === 'upgrade' ? item.system.alvo : item.type === 'arma' ? 'veiculo' : '';
  if (tipo) return itens.filter(pai => pai.id !== item.id && pai.type === tipo);
  if (item.type !== 'cyberware' || item.system.fundacional) return [];
  const encaixe = i => ({ tipo: i.system.tipo, catalogo: i.getFlag(SISTEMA, 'catalogo') ?? '', slots: i.system.slots, tamanho: i.system.tamanho });
  return itens.filter(pai => pai.id !== item.id && pai.type === 'cyberware' && pai.system.fundacional && cabeNaFundacao({
    fundacao: encaixe(pai), opcao: encaixe(item), usados: itens.filter(i => i.id !== item.id && i.system.instaladoEm === pai.id).reduce((soma, i) => soma + (Number(i.system.tamanho) || 0), 0)
  }).cabe);
}
