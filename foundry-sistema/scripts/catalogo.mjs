// O catálogo de itens do sistema (dados/catalogo.json, gerado por build/conteudo.mjs), pelo id da loja da wiki
// ("core_weapons:assault-rifle"). Carregado uma vez, na primeira vez que alguém precisa.
import { caminho } from './config.mjs';

let catalogo = null;
export async function carregarCatalogo() {
  catalogo ??= (await (await fetch(caminho('dados/catalogo.json'))).json()).itens;
  return catalogo;
}

// Os dados de um item do catálogo, prontos para criar (uma cópia: quem usa pode mudar à vontade).
export async function itemDoCatalogo(id) {
  const itens = await carregarCatalogo();
  return itens[id] ? foundry.utils.deepClone(itens[id]) : null;
}
