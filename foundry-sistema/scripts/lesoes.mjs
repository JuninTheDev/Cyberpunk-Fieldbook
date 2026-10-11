// Lesão Crítica (p. 187): 2d6 na tabela do corpo (ou da cabeça, no tiro mirado na cabeça), sem repetir uma lesão que
// o alvo já tem; o item entra na ficha com os efeitos (Perna quebrada: −4 MOVE) e o cartão sai no chat.
import { itemDoCatalogo } from './catalogo.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { TABELAS_LESAO } from './gerado.mjs';
import { lesaoNaTabela } from './regras.mjs';

export const PERNA_QUEBRADA = 'core_critical-injuries-body:broken-leg';

// id: uma lesão certa (a Perna quebrada do tiro na perna). naFicha: false só anuncia.
export async function lesaoCritica(ator, { cabeca = false, id = null, naFicha = true, falar = true } = {}) {
  const tem = new Set(ator.items.filter(item => item.type === 'lesao').map(item => item.getFlag(SISTEMA, 'catalogo')));
  let escolhido = id;
  let roll = null;
  if (!escolhido) {
    const faixas = TABELAS_LESAO[cabeca ? 'cabeca' : 'corpo'];
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      roll = await new Roll('2d6').evaluate();
      escolhido = lesaoNaTabela(faixas, roll.total);
      if (!tem.has(escolhido)) break;
    }
  }
  const dados = escolhido && await itemDoCatalogo(escolhido);
  if (!dados) return null;
  const repetida = tem.has(escolhido);
  const [item] = naFicha && !repetida ? await ator.createEmbeddedDocuments('Item', [dados]) : [null];
  if (falar) {
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/lesao.hbs'), {
      alvo: ator.name, nome: dados.name, descricao: dados.system.descricao, cabeca, repetida, naFicha, dados: roll ? await roll.render() : ''
    });
    await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: roll ? [roll] : [], flags: { [SISTEMA]: { lesao: { id: escolhido, nome: dados.name } } } });
  }
  return { id: escolhido, nome: dados.name, item, roll };
}
