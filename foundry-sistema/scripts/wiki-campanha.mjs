// A campanha deste mundo e a ficha inteira que vem de outro mundo pelo crossover da wiki.
// Referência: foundry-2077/scripts/wiki.mjs, tableCampaign, ofTable e importTransferred.
import { SISTEMA } from './config.mjs';

export function resolverCampanha(lista, configurada, mundo) {
  const campanhas = Array.isArray(lista) ? lista : [];
  const id = String(configurada || '').trim();
  const encontrada = id ? campanhas.find(item => item.id === id) : campanhas.find(item => item.mundo && item.mundo === mundo) || (campanhas.length === 1 ? campanhas[0] : null);
  return encontrada || (campanhas.length ? {
    erro: id ? `A campanha "${id}" não existe na wiki.` : 'Este mundo não está ligado a nenhuma campanha da wiki.', lista: campanhas
  } : null);
}

export const pertenceACampanha = (personagem, campanha) => !campanha?.id || personagem.campanha === campanha.id;

// A API da wiki mostra primeiro o vínculo do 12 em "foundry" e no estadoFoundry; aqui vale o do 14.
export const vinculoDaGeracao14 = doc => doc.foundry14 ?? (doc.foundry?.geracao === 14 ? doc.foundry : null);
export const mudouDeCampanha = doc => {
  const vinculo = vinculoDaGeracao14(doc);
  return Boolean(vinculo?.campanha && doc.campanha && vinculo.campanha !== doc.campanha);
};

export function prepararAtorTransferido(transferencia, doc, donoId, campanha, agora) {
  if (!campanha?.id) throw new Error('A campanha deste mundo não está resolvida. Ligue o mundo à campanha da wiki antes de importar o crossover.');
  const origem = vinculoDaGeracao14(doc)?.campanha;
  if (!transferencia?.de || !transferencia.para || transferencia.de === transferencia.para || transferencia.para !== doc.campanha || transferencia.para !== campanha?.id || (origem && origem !== transferencia.de)) {
    throw new Error('A ficha do crossover não corresponde à campanha de origem e à campanha deste mundo. Confira a mudança na wiki.');
  }
  // A rota /ator da wiki só aceita type "character" (o CORE do 12). O envelope identifica o formato do sistema sem
  // transformar os dados nativos: o ator dentro dele continua "personagem", com os IDs dos itens e dos efeitos.
  const envelope = transferencia.ator?.flags?.[SISTEMA]?.crossover;
  const original = envelope?.ator;
  if (envelope?.geracao !== 14 || original?.type !== 'personagem' || !original.system || typeof original.system !== 'object' || Array.isArray(original.system)) {
    throw new Error('Esta ficha de crossover não é deste sistema do Foundry 14. Para trazer a ficha do Foundry 12, use "Importar da mesa".');
  }
  const personagem = original.flags?.[SISTEMA]?.wiki?.id;
  if (personagem && personagem !== doc.id) throw new Error('A ficha do crossover é de outro personagem da wiki. Confira o personagem antes de importar.');
  const dados = structuredClone(original);
  delete dados._id;
  delete dados.folder;
  dados.ownership = { default: 0, ...(donoId ? { [donoId]: 3 } : {}) };
  dados.flags ??= {};
  dados.flags[SISTEMA] ??= {};
  const anterior = dados.flags[SISTEMA].wiki || {};
  delete dados.flags[SISTEMA].saiu;
  dados.flags[SISTEMA].wiki = { ...anterior, id: doc.id, versao: doc.versao, importado: agora, veioDe: transferencia.de };
  return dados;
}
