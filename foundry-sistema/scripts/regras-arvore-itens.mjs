// CORE 0.92.4: hooks/foundry/ui/item-folder-upgraded-display.js. Só a apresentação dos vínculos; não move documentos.
// A lista vem das linhas do diretório. Exigir visibilidade também aqui impede que um pai revele um filho privado.
export function arvoreDeInstalados(itens) {
  const nos = new Map(itens.filter(item => item.visivel === true).map(item => [item.id, {
    id: item.id, nome: item.nome, tipo: item.tipo, filhos: []
  }]));
  const pais = new Map(itens.filter(item => nos.has(item.id) && nos.has(item.instaladoEm) && item.id !== item.instaladoEm)
    .map(item => [item.id, item.instaladoEm]));

  // Uma montagem antiga ou importada pode estar quebrada. Corta uma aresta por ciclo, conservando todos os itens.
  const resolvidos = new Set();
  for (const id of nos.keys()) {
    const caminho = new Set();
    let atual = id;
    while (pais.has(atual) && !resolvidos.has(atual)) {
      if (caminho.has(atual)) { pais.delete(atual); break; }
      caminho.add(atual);
      atual = pais.get(atual);
    }
    for (const visitado of caminho) resolvidos.add(visitado);
  }
  for (const [id, pai] of pais) nos.get(pai).filhos.push(nos.get(id));
  for (const no of nos.values()) {
    const primeiro = { arma: 'municao', upgrade: 'municao', cyberdeck: 'programa', cyberware: 'cyberware' }[no.tipo];
    no.filhos.sort((a, b) => Number(b.tipo === primeiro) - Number(a.tipo === primeiro)
      || a.tipo.localeCompare(b.tipo, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id));
  }
  // As raízes conservam a posição das linhas nativas, inclusive a pasta e a ordenação escolhidas no Foundry.
  return [...nos.values()].filter(no => !pais.has(no.id));
}
