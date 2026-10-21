// A visão pelas paredes da mesa: a mesma conta no servidor (quem vê qual token, quem abre qual porta, por onde o token
// passa) e no navegador (a sombra do que o token não vê). Como no Foundry com a visão dos tokens ligada, sem alcance nem
// escuridão: o token vê tudo o que nenhuma parede tapa.
//
// As paredes vêm com os números do Foundry: porta 0 nenhuma, 1 porta, 2 secreta; estado 0 fechada, 1 aberta, 2 trancada;
// visao e movimento 0 não bloqueia, 10 limitada (vê através de uma, não de duas), 20 ou mais bloqueia.
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.mesaVisao = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  const aberta = parede => Boolean(parede.porta) && parede.estado === 1;
  const bloqueiaVista = parede => parede.visao > 0 && !aberta(parede);
  const bloqueiaPasso = parede => parede.movimento > 0 && !aberta(parede);
  const ponta = (parede, i) => ({ x: parede.c[i * 2], y: parede.c[i * 2 + 1] });

  // Os segmentos ab e cd se cruzam de verdade (encostar na ponta não conta: a vista passa rente ao canto).
  function cruza(a, b, c, d) {
    const lado = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0;
  }
  // De um ponto se vê o outro: nenhuma parede inteira no caminho, nem duas limitadas.
  function enxerga(paredes, de, ate) {
    let limitadas = 0;
    for (const parede of paredes) {
      if (!bloqueiaVista(parede) || !cruza(de, ate, ponta(parede, 0), ponta(parede, 1))) continue;
      if (parede.visao >= 20) return false;
      limitadas += 1;
      if (limitadas >= 2) return false;
    }
    return true;
  }
  // O alvo aparece se algum olho vê o centro dele ou um dos quatro pontos em volta (meio corpo para fora da quina já
  // aparece).
  function algumVe(olhos, alvo, paredes, raio) {
    const pontos = [{ x: alvo.x, y: alvo.y }, { x: alvo.x - raio, y: alvo.y }, { x: alvo.x + raio, y: alvo.y }, { x: alvo.x, y: alvo.y - raio }, { x: alvo.x, y: alvo.y + raio }];
    return olhos.some(olho => pontos.some(ponto => enxerga(paredes, olho, ponto)));
  }
  // O caminho do token atravessa parede (ou porta fechada) que bloqueia o passo.
  const atravessa = (paredes, de, ate) => paredes.some(parede => bloqueiaPasso(parede) && cruza(de, ate, ponta(parede, 0), ponta(parede, 1)));

  // O polígono do que um olho vê dentro da cena (largura × altura, mais a margem em volta): um raio para cada ponta de
  // parede (e um pouco antes e depois dela, para passar rente), parando na primeira parede inteira ou na segunda limitada.
  function poligono(paredes, olho, largura, altura, margem = { x: 0, y: 0 }) {
    const [x0, y0, x1, y1] = [-margem.x, -margem.y, largura + margem.x, altura + margem.y];
    const bordas = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].map(c => ({ c, visao: 20 }));
    const segmentos = [...paredes.filter(bloqueiaVista), ...bordas];
    const angulos = [];
    for (const segmento of segmentos) {
      for (let i = 0; i < 2; i += 1) {
        const p = ponta(segmento, i);
        const angulo = Math.atan2(p.y - olho.y, p.x - olho.x);
        angulos.push(angulo - 0.00005, angulo, angulo + 0.00005);
      }
    }
    angulos.sort((a, b) => a - b);
    const pontos = [];
    let anterior = null;
    for (const angulo of angulos) {
      if (anterior !== null && angulo - anterior < 1e-9) continue;
      anterior = angulo;
      const dx = Math.cos(angulo);
      const dy = Math.sin(angulo);
      const batidas = [];
      for (const segmento of segmentos) {
        const [x1, y1, x2, y2] = segmento.c;
        const sx = x2 - x1;
        const sy = y2 - y1;
        const den = dx * sy - dy * sx;
        if (Math.abs(den) < 1e-12) continue;
        const t = ((x1 - olho.x) * sy - (y1 - olho.y) * sx) / den;
        const u = ((x1 - olho.x) * dy - (y1 - olho.y) * dx) / den;
        if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9) batidas.push({ t, limitada: segmento.visao < 20 });
      }
      batidas.sort((a, b) => a.t - b.t);
      let limitadas = 0;
      let fim = null;
      for (const batida of batidas) {
        if (batida.limitada && (limitadas += 1) < 2) continue;
        fim = batida.t;
        break;
      }
      if (fim !== null) pontos.push({ x: olho.x + dx * fim, y: olho.y + dy * fim });
    }
    return pontos;
  }

  return { aberta, bloqueiaVista, bloqueiaPasso, cruza, enxerga, algumVe, atravessa, poligono };
});
