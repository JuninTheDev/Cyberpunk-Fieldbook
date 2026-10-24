// CORE 0.92.4, hooks/foundry/ui/item-folder-upgraded-display.js: componentes por tipo e nome,
// com programas primeiro no deck, cyberware na fundação e munição na arma. O vínculo daqui é instaladoEm.
export function arvoreDeInstalados(itens) {
  const porId = new Map([...itens].map(item => [item.id, item]));
  const pais = new Map([...porId.values()].filter(item => item.system?.instaladoEm !== item.id && porId.has(item.system?.instaladoEm))
    .map(item => [item.id, item.system.instaladoEm]));
  // Um vínculo antigo quebrado não esconde um item. Num ciclo, os participantes voltam à raiz;
  // os demais componentes continuam ligados a eles. Não altera os documentos.
  const prontos = new Set();
  for (const id of porId.keys()) {
    const caminho = [], posicoes = new Map(); let atual = id;
    while (pais.has(atual) && !prontos.has(atual) && !posicoes.has(atual)) {
      posicoes.set(atual, caminho.length); caminho.push(atual); atual = pais.get(atual);
    }
    if (posicoes.has(atual)) for (const membro of caminho.slice(posicoes.get(atual))) pais.delete(membro);
    for (const membro of caminho) prontos.add(membro);
  }
  const filhos = new Map([...porId.keys()].map(id => [id, []]));
  for (const [id, pai] of pais) filhos.get(pai).push(porId.get(id));
  const nomes = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  for (const [id, lista] of filhos) {
    const tipo = porId.get(id).type;
    const primeiro = tipo === 'cyberdeck' ? 'programa' : tipo === 'cyberware' ? 'cyberware' : ['arma', 'upgrade'].includes(tipo) ? 'municao' : '';
    lista.sort((a, b) => Number(b.type === primeiro) - Number(a.type === primeiro)
      || nomes.compare(a.type, b.type) || nomes.compare(a.name, b.name));
  }
  return [...porId.values()].filter(item => !pais.has(item.id)).map(raiz => {
    const linhas = [], pilha = filhos.get(raiz.id).toReversed().map(item => ({ id: item.id, profundidade: 0 }));
    while (pilha.length) {
      const linha = pilha.pop(); linhas.push(linha);
      pilha.push(...filhos.get(linha.id).toReversed().map(item => ({ id: item.id, profundidade: linha.profundidade + 1 })));
    }
    return { id: raiz.id, linhas };
  });
}
