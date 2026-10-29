// Um pedido da wiki por vez neste navegador. A entrega de cada minuto (`entregarPedidos`) e a do mestre (a janela
// "Personagens da wiki" ou a macro) podiam pegar o mesmo pedido juntas: a segunda ou avisava que ele "já foi resolvido"
// (a wiki, `api-personagens.js`, recusa marcar de novo), ou, se as duas conferissem os itens da ficha antes de qualquer
// uma criá-los, entregava em dobro (os itens e o dinheiro). Quem chega com o pedido em curso espera a mesma entrega; a
// entrega de cada minuto, que leu a lista da wiki antes, pula o que este navegador já está entregando ou já entregou.
// Entregar de novo, à mão, um pedido já entregue continua chegando à wiki (e ela recusa, sem nada em dobro).
export function umaEntregaPorVez(entregar) {
  const emCurso = new Map();
  const entregues = new Set();
  const chave = (wikiId, pedido) => `${wikiId}:${pedido?.id}`;
  const porVez = (ator, wikiId, pedido) => {
    const id = chave(wikiId, pedido);
    if (emCurso.has(id)) return emCurso.get(id);
    const entrega = Promise.resolve().then(() => entregar(ator, wikiId, pedido))
      .then(resultado => { if (resultado?.ok) entregues.add(id); return resultado; })
      .finally(() => emCurso.delete(id));
    emCurso.set(id, entrega);
    return entrega;
  };
  porVez.ocupado = (wikiId, pedido) => emCurso.has(chave(wikiId, pedido)) || entregues.has(chave(wikiId, pedido));
  return porVez;
}
