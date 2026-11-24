// As modificações de armas no Foundry (o C67). As contas ficam no regras-modificacoes.mjs; o item (a flag, a permanência,
// os slots e o ataque), no documentos.mjs; o pente e o "não se esconde", no dados.mjs; o teto, no combate.mjs; o defeito
// que emperra e o dano a mais no cartão, no combate/modos.mjs. Aqui: a arma que sai leva as modificações dela (elas são
// permanentes: não ficam soltas) e a API.
import { SISTEMA } from './config.mjs';
import * as regras from './regras-modificacoes.mjs';

export function registrarModificacoes() {
  Hooks.on('deleteItem', (item, _opcoes, usuario) => {
    if (item.type !== 'arma' || !item.actor || usuario !== game.user.id) return;
    const ids = item.actor.items.filter(outro => outro.type === 'upgrade' && outro.getFlag(SISTEMA, 'mod') && outro.system.instaladoEm === item.id).map(outro => outro.id);
    if (ids.length) item.actor.deleteEmbeddedDocuments('Item', ids);
  });
}

// A API (game.system.api.modificacoes): as contas, e onde uma modificação cabe numa arma de verdade.
export const API = {
  ...regras,
  cabeNaArma: (arma, mod) => regras.modCabe(arma.paraModificacoes, arma.modificacoes.map(item => item.modificacao), mod)
};
