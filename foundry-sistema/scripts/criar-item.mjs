// CORE 0.92.4: playersCreateInventory (settings.js) e item-create da ficha.
// A permissão é relida na ação: uma ficha aberta pode ter sido desenhada antes de o mestre desligar a opção.
import { config } from './configuracoes.mjs';
import { nomeDoItemNovo } from './regras-inventario.mjs';

export function podeCriarItemNaFicha(ator) {
  return Boolean(ator?.isOwner && ['personagem', 'capanga'].includes(ator.type)
    && (game.user.isGM || config('jogadoresCriamItens')));
}

export async function criarItemNaFicha(ator, tipo) {
  if (!podeCriarItemNaFicha(ator) || !Object.hasOwn(CONFIG.Item.dataModels, tipo)) return null;
  const [criado] = await ator.createEmbeddedDocuments('Item', [{
    name: nomeDoItemNovo(tipo, game.i18n.localize('TYPES.Item.' + tipo)), type: tipo
  }]);
  return criado ?? null;
}
