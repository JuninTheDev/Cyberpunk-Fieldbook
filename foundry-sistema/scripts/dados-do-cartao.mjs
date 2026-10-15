// Os dados no cartão do chat (no lugar do roll.render do Foundry): cada dado numa caixa, o que se soma além deles e o
// total grande. O primeiro d10 de um teste marca o crítico (o 10 em amarelo; o 1 e o dado que ele tira, em vermelho); no
// dano crítico (seis), os 6 em amarelo. multiplicador: o × do autofogo. Vários Rolls (o Backup: o d10 e o d6) vão
// separados por um ponto, sem o total (total: false). O HTML só leva números.
export function dadosDoCartao(rolls, { critico = true, seis = false, multiplicador = 1, total = true } = {}) {
  const lista = [rolls].flat();
  const grupos = lista.map(roll => {
    const caixas = [];
    roll.dice.forEach((dado, d) => dado.results.forEach((resultado, i) => {
      if (resultado.active === false || resultado.discarded) return;
      const menos = (resultado.count ?? resultado.result) < 0;
      const natural = critico && d === 0 && i === 0 && dado.faces === 10;
      const classe = natural && resultado.result === 10 ? 'maximo' : (natural && resultado.result === 1) || menos ? 'minimo' : seis && resultado.result === 6 ? 'maximo' : '';
      caixas.push(`${caixas.length ? `<i>${menos ? '−' : '+'}</i>` : ''}<span class="dado${classe ? ` ${classe}` : ''}">${resultado.result}</span>`);
    }));
    return caixas.join('');
  });
  const roll = lista[0];
  const resto = roll.total - multiplicador * roll.dice.reduce((soma, dado) => soma + dado.total, 0);
  const vezes = total && multiplicador > 1 ? `<i>×${multiplicador}</i>` : '';
  const mais = total && resto ? `<i class="resto">${resto > 0 ? '+' : '−'}${Math.abs(resto)}</i>` : '';
  return `<div class="dados-do-cartao">${grupos.join('<i>·</i>')}${vezes}${mais}${total ? `<b class="total">${roll.total}</b>` : ''}</div>`;
}
