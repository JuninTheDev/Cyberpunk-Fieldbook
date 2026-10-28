// CORE 0.92.4: cpr-actor-sheet.js, _deleteOwnedItem, e installable-schema.js. A opção só dispensa a pergunta simples;
// instalado (inclusive cyberware no ator e munição em arma) ou conteúdo instalado continuam exigindo confirmação.
export function podeEditarParaApagar(ator, { editavel = false, presente = false, mestre = false } = {}) {
  return Boolean(ator?.isOwner && editavel && presente && ['personagem', 'capanga', 'conteiner'].includes(ator.type)
    && (ator.type !== 'conteiner' || mestre || ator.system.permissoes.apagar));
}

export function podeApagarItem(ator, item, contexto) {
  return Boolean(item && podeEditarParaApagar(ator, contexto) && ator.items.get(item.id) === item);
}

export function lugaresDaInstalacao(item, itens = []) {
  const locais = [];
  if (item.system.instaladoEm) locais.push(itens.find(outro => outro.id === item.system.instaladoEm)?.name || item.system.instaladoEm);
  if (item.type === 'cyberware' && item.system.instalado) locais.push(item.parent?.name || 'personagem');
  if (item.type === 'municao') locais.push(...itens.filter(outro => outro.type === 'arma' && outro.system.carregada === item.id).map(arma => arma.name));
  return [...new Set(locais)];
}

export const pedeConfirmacaoAoApagar = (opcao, locais) => Boolean(opcao || locais.length);
