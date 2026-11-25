// A vitrine do Night Market e o teto da campanha (o C72, parte 2, do sistema do Foundry 14; as decisões do usuário de
// 2026-11-25): as modificações Caras (500eb) ficam fora da loja da campanha, e o mestre abre um Night Market que libera
// algumas delas (escolhidas ou sorteadas) até uma data, pelo preço do catálogo; e o teto da campanha (o bônus da arma na
// rolagem e as lendárias por arma) só avisa, na bancada da arma e no pedido. As contas valem no servidor
// (api-personagens.js confere o pedido) e na wiki (criador.js mostra a loja e a bancada). UMD, como o
// personagem-bancada.js: window.shopShowcase no navegador, module.exports no Node.
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.shopShowcase = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // A Cara (500eb) só se compra com um Fixer ou num Night Market (system-modificacoes.js, "O preço").
  const PRECO_DO_CARO = 500;
  const CATEGORIA_DAS_MODS = 'modificacoes';
  const MAXIMO_NA_VITRINE = 12;
  // O teto da regra da casa (regras-modificacoes.TETO_DA_ARMA) e uma lendária por arma (a proposta de 2026-11-23).
  const TETO_DA_ARMA = 3;
  const LENDARIAS_POR_ARMA = 1;

  const ehModCara = item => Boolean(item) && item.cat === CATEGORIA_DAS_MODS && Number(item.preco) >= PRECO_DO_CARO;
  const doDia = valor => (/^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) ? String(valor) : '');
  // Hoje, no relógio de quem confere (AAAA-MM-DD): a vitrine vale até o fim do dia "ate".
  const hoje = (agora = new Date()) => `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const inteiro = (valor, minimo, maximo, padrao) => {
    const numero = Math.trunc(Number(valor));
    return valor === '' || valor === null || valor === undefined || !Number.isFinite(numero) ? padrao : Math.max(minimo, Math.min(maximo, numero));
  };

  // A vitrine aberta das regras da loja: os ids que ela libera hoje (fechada ou vencida: nenhum).
  function vitrineAberta(regras, agora = new Date()) {
    const vitrine = regras && regras.nightMarket;
    if (!vitrine || !doDia(vitrine.ate) || !Array.isArray(vitrine.itens)) return [];
    return vitrine.ate >= hoje(agora) ? vitrine.itens : [];
  }
  // A vitrine que o mestre grava: só as modificações Caras do catálogo (catalogo(id) devolve o item), sem repetir, até
  // MAXIMO_NA_VITRINE, com a data. Sem itens ou sem data, fechada.
  function limparVitrine(entrada, catalogo) {
    const ids = Array.isArray(entrada && entrada.itens) ? entrada.itens.map(String) : [];
    const itens = [...new Set(ids)].filter(id => ehModCara(catalogo(id))).slice(0, MAXIMO_NA_VITRINE);
    const ate = doDia(entrada && entrada.ate);
    return itens.length && ate ? { itens, ate } : { itens: [], ate: '' };
  }
  // A modificação Cara fora da vitrine aberta (e não liberada pelo mestre, um a um): não se compra na loja.
  const foraDaVitrine = (item, regras, agora = new Date()) => ehModCara(item) && !((regras && regras.liberados) || []).includes(item.id) && !vitrineAberta(regras, agora).includes(item.id);
  // O sorteio do mestre: quantos ids da lista, sem repetir. rolar(n): de 0 a n − 1.
  function sortear(ids, quantos, rolar = n => Math.floor(Math.random() * n)) {
    const sobra = [...ids];
    const saiu = [];
    while (saiu.length < quantos && sobra.length) saiu.push(sobra.splice(rolar(sobra.length), 1)[0]);
    return saiu;
  }

  // O teto da campanha nas regras da loja: o bônus da arma na rolagem (0 a +3; o padrão é o da regra da casa) e as
  // lendárias por arma (0 a 3).
  const tetoDaCampanha = regras => ({
    arma: inteiro(regras && regras.tetoDaArma, 0, TETO_DA_ARMA, TETO_DA_ARMA),
    lendarias: inteiro(regras && regras.lendariasPorArma, 0, 3, LENDARIAS_POR_ARMA)
  });
  // Os avisos do teto para a arma (o modelo da bancada, personagem-bancada.js: o teto e as peças com a raridade). Só
  // avisa: os slots e o +3 da regra da casa continuam o limite.
  function avisosDoTeto(modelo, regras) {
    const teto = tetoDaCampanha(regras);
    const avisos = [];
    if (modelo && modelo.teto && modelo.teto.melhor > teto.arma) avisos.push(`Passa do teto da campanha: +${modelo.teto.melhor} na rolagem, e a campanha vai até +${teto.arma}.`);
    const lendarias = ((modelo && modelo.pecas) || []).filter(peca => peca.raridade === 'lendaria').length;
    if (lendarias > teto.lendarias) avisos.push(`${lendarias} lendárias nesta arma: a campanha deixa ${teto.lendarias}.`);
    return avisos;
  }
  // O aviso no pedido: a modificação de ataque (+1 numa situação) e as armas da ficha onde ela passaria do teto.
  // armas: [{ nome, melhor }] (o teto de cada uma, da bancada).
  function avisoNoPedido(ehDeAtaque, armas, regras) {
    if (!ehDeAtaque) return '';
    const teto = tetoDaCampanha(regras);
    const passam = (armas || []).filter(arma => Number(arma.melhor) + 1 > teto.arma).map(arma => arma.nome);
    return passam.length ? `Teto da campanha (+${teto.arma}): em ${passam.join(', ')}, ela passaria do teto.` : '';
  }

  return { PRECO_DO_CARO, MAXIMO_NA_VITRINE, TETO_DA_ARMA, LENDARIAS_POR_ARMA, ehModCara, hoje, vitrineAberta, limparVitrine, foraDaVitrine, sortear, tetoDaCampanha, avisosDoTeto, avisoNoPedido };
});
