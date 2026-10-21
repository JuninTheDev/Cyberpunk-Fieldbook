// A visão pelas paredes da mesa: a mesma conta no servidor (quem vê qual token, quem abre qual porta, por onde o token
// passa) e no navegador (a sombra do que o token não vê). Como no Foundry com a visão dos tokens ligada.
//
// As paredes vêm com os números do Foundry: porta 0 nenhuma, 1 porta, 2 secreta; estado 0 fechada, 1 aberta, 2 trancada;
// visao, luz e movimento 0 não bloqueia, 10 limitada (vê através de uma, não de duas), 20 ou mais bloqueia.
//
// A luz, como no Foundry 12: com a luz global, a cena toda está clara e o token vê tudo o que nenhuma parede tapa. Sem
// ela, o token vê o que está no alcance da visão dele ou iluminado por uma luz (do cenário ou de um token), e a parede
// de luz segura a luz.
//
// As contas olham só as paredes perto do caminho (um índice das paredes por célula do mapa): a cena com milhares de
// paredes continua rápida.
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.mesaVisao = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  const aberta = parede => Boolean(parede.porta) && parede.estado === 1;
  const bloqueiaVista = parede => parede.visao > 0 && !aberta(parede);
  const bloqueiaPasso = parede => parede.movimento > 0 && !aberta(parede);
  // A parede sem o número da luz segura a luz como segura a vista.
  const luzDa = parede => (parede.luz ?? parede.visao);
  const bloqueiaLuz = parede => luzDa(parede) > 0 && !aberta(parede);
  const VISTA = { bloqueia: bloqueiaVista, limitada: parede => parede.visao < 20 };
  const LUZ = { bloqueia: bloqueiaLuz, limitada: parede => luzDa(parede) < 20 };
  const ponta = (parede, i) => ({ x: parede.c[i * 2], y: parede.c[i * 2 + 1] });

  // Os segmentos ab e cd se cruzam de verdade (encostar na ponta não conta: a vista passa rente ao canto).
  function cruza(a, b, c, d) {
    const lado = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0;
  }

  // ---------------- O índice ----------------
  // Cada parede fica nas células que a caixa dela toca, com 1 px de folga (a parede que passa num canto de célula fica
  // nas quatro). A célula tem uns dois vãos médios entre paredes. O índice fica guardado pela lista: o servidor e o
  // navegador trocam a lista inteira quando uma parede entra ou sai, e a porta que abre não muda de lugar.
  const VAZIO = [];
  const indices = new WeakMap();
  const chaveDa = (cx, cy) => (cx + 1048576) * 2097152 + (cy + 1048576);
  function indice(paredes) {
    let idx = indices.get(paredes);
    if (idx) return idx;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const parede of paredes) {
      const [ax, ay, bx, by] = parede.c;
      x0 = Math.min(x0, ax, bx); y0 = Math.min(y0, ay, by); x1 = Math.max(x1, ax, bx); y1 = Math.max(y1, ay, by);
    }
    const area = paredes.length ? Math.max(1, (x1 - x0) * (y1 - y0)) : 1;
    const lado = Math.max(32, Math.sqrt(area / Math.max(1, paredes.length)) * 2);
    const celulas = new Map();
    paredes.forEach((parede, i) => {
      const [ax, ay, bx, by] = parede.c;
      for (let cx = Math.floor((Math.min(ax, bx) - 1) / lado); cx <= Math.floor((Math.max(ax, bx) + 1) / lado); cx += 1) {
        for (let cy = Math.floor((Math.min(ay, by) - 1) / lado); cy <= Math.floor((Math.max(ay, by) + 1) / lado); cy += 1) {
          const chave = chaveDa(cx, cy);
          const lista = celulas.get(chave);
          if (lista) lista.push(i); else celulas.set(chave, [i]);
        }
      }
    });
    idx = { lado, celula: (cx, cy) => celulas.get(chaveDa(cx, cy)) || VAZIO };
    indices.set(paredes, idx);
    return idx;
  }
  // Andar de célula em célula pela reta (Amanatides e Woo): a célula de agora e o t em que cada eixo troca de célula.
  function caminhada(lado, o, dx, dy) {
    const cx = Math.floor(o.x / lado);
    const cy = Math.floor(o.y / lado);
    return {
      cx, cy, passoX: dx > 0 ? 1 : -1, passoY: dy > 0 ? 1 : -1,
      tMX: dx ? (dx > 0 ? (cx + 1) * lado - o.x : o.x - cx * lado) / Math.abs(dx) : Infinity,
      tMY: dy ? (dy > 0 ? (cy + 1) * lado - o.y : o.y - cy * lado) / Math.abs(dy) : Infinity,
      tDX: dx ? lado / Math.abs(dx) : Infinity, tDY: dy ? lado / Math.abs(dy) : Infinity
    };
  }
  const avancar = w => { if (w.tMX < w.tMY) { w.cx += w.passoX; w.tMX += w.tDX; } else { w.cy += w.passoY; w.tMY += w.tDY; } };
  // As paredes que o segmento ab pode cruzar (as das células do caminho), cada uma uma vez.
  function noCaminho(paredes, a, b) {
    const idx = indice(paredes);
    const w = caminhada(idx.lado, a, b.x - a.x, b.y - a.y);
    const fx = Math.floor(b.x / idx.lado);
    const fy = Math.floor(b.y / idx.lado);
    const vistos = new Set();
    const lista = [];
    for (let passos = 0; passos < 1e6; passos += 1) {
      for (const i of idx.celula(w.cx, w.cy)) if (!vistos.has(i)) { vistos.add(i); lista.push(paredes[i]); }
      if ((w.cx === fx && w.cy === fy) || Math.min(w.tMX, w.tMY) > 1) break;
      avancar(w);
    }
    return lista;
  }

  // ---------------- Ver, iluminar, passar ----------------
  // De um ponto se vê o outro: nenhuma parede inteira no caminho, nem duas limitadas. tipo: VISTA (padrão) ou LUZ.
  function enxerga(paredes, de, ate, tipo = VISTA) {
    let limitadas = 0;
    for (const parede of noCaminho(paredes, de, ate)) {
      if (!tipo.bloqueia(parede) || !cruza(de, ate, ponta(parede, 0), ponta(parede, 1))) continue;
      if (!tipo.limitada(parede)) return false;
      limitadas += 1;
      if (limitadas >= 2) return false;
    }
    return true;
  }
  const dentroDoRaio = (a, b, raio) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= raio ** 2;
  // Alguma luz alcança o ponto: dentro do raio dela e sem parede de luz no caminho. luzes: [{ x, y, raio }] em px.
  const iluminado = (paredes, luzes, p) => luzes.some(luz => luz.raio > 0 && dentroDoRaio(luz, p, luz.raio) && enxerga(paredes, luz, p, LUZ));
  // O ponto aparece para quem olha: um olho o vê e ele está claro. olhos: [{ x, y, alcance }] (alcance em px; sem ele,
  // sem limite). ambiente: { global, luzes } (sem ele, a luz global).
  function pontoVisto(olhos, p, paredes, ambiente = {}) {
    const global = ambiente.global !== false;
    let claro = null;
    return olhos.some(olho => {
      if (!enxerga(paredes, olho, p)) return false;
      if (global || dentroDoRaio(olho, p, olho.alcance ?? Infinity)) return true;
      if (claro === null) claro = iluminado(paredes, ambiente.luzes || [], p);
      return claro;
    });
  }
  // O alvo aparece se algum olho vê o centro dele ou um dos quatro pontos em volta (meio corpo para fora da quina já
  // aparece).
  function algumVe(olhos, alvo, paredes, raio, ambiente) {
    const pontos = [{ x: alvo.x, y: alvo.y }, { x: alvo.x - raio, y: alvo.y }, { x: alvo.x + raio, y: alvo.y }, { x: alvo.x, y: alvo.y - raio }, { x: alvo.x, y: alvo.y + raio }];
    return pontos.some(ponto => pontoVisto(olhos, ponto, paredes, ambiente));
  }
  // O caminho do token atravessa parede (ou porta fechada) que bloqueia o passo.
  const atravessa = (paredes, de, ate) => noCaminho(paredes, de, ate).some(parede => bloqueiaPasso(parede) && cruza(de, ate, ponta(parede, 0), ponta(parede, 1)));

  // ---------------- O polígono ----------------
  // O pedaço do segmento dentro da caixa (Liang e Barsky), ou nada.
  function recortar(c, x0, y0, x1, y1) {
    const [ax, ay, bx, by] = c;
    const dx = bx - ax;
    const dy = by - ay;
    let t0 = 0;
    let t1 = 1;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [ax + t0 * dx, ay + t0 * dy, ax + t1 * dx, ay + t1 * dy];
  }
  // Onde a semirreta que sai de o (de dentro da caixa) deixa a caixa.
  function saida(o, dx, dy, x0, y0, x1, y1) {
    const tx = dx > 0 ? (x1 - o.x) / dx : dx < 0 ? (x0 - o.x) / dx : Infinity;
    const ty = dy > 0 ? (y1 - o.y) / dy : dy < 0 ? (y0 - o.y) / dy : Infinity;
    return Math.max(0, Math.min(tx, ty));
  }
  // Onde a semirreta bate na parede (o t ao longo dela), ou null.
  function batida(o, dx, dy, parede) {
    const [x1, y1, x2, y2] = parede.c;
    const sx = x2 - x1;
    const sy = y2 - y1;
    const den = dx * sy - dy * sx;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((x1 - o.x) * sy - (y1 - o.y) * sx) / den;
    const u = ((x1 - o.x) * dy - (y1 - o.y) * dx) / den;
    return t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 ? t : null;
  }
  // Onde o raio para: na primeira parede inteira ou na segunda limitada.
  function parada(batidas) {
    batidas.sort((a, b) => a.t - b.t);
    let limitadas = 0;
    for (const item of batidas) {
      if (item.limitada && (limitadas += 1) < 2) continue;
      return item.t;
    }
    return null;
  }
  // O polígono do que um olho vê (ou do que uma luz ilumina, com tipo LUZ) dentro da cena (largura × altura, mais a
  // margem em volta) e, com raio, dentro do quadrado do raio. Um raio vai para cada ponta de parede (e um pouco antes e
  // depois dela, para passar rente) e para cada canto, e para na primeira parede inteira ou na segunda limitada. O raio
  // anda de célula em célula do índice e para cedo: só olha as paredes perto dele.
  function poligono(paredes, olho, largura, altura, margem = { x: 0, y: 0 }, { tipo = VISTA, raio = Infinity } = {}) {
    let [x0, y0, x1, y1] = [-margem.x, -margem.y, largura + margem.x, altura + margem.y];
    if (raio < Infinity) { x0 = Math.max(x0, olho.x - raio); y0 = Math.max(y0, olho.y - raio); x1 = Math.min(x1, olho.x + raio); y1 = Math.min(y1, olho.y + raio); }
    if (x0 >= x1 || y0 >= y1) return [];
    const o = { x: Math.min(x1, Math.max(x0, olho.x)), y: Math.min(y1, Math.max(y0, olho.y)) };
    const idx = indice(paredes);
    const angulos = [];
    const pontas = new Set();
    const juntar = (x, y) => {
      const chave = `${x},${y}`;
      if (pontas.has(chave)) return;
      pontas.add(chave);
      const angulo = Math.atan2(y - o.y, x - o.x);
      angulos.push(angulo - 0.00005, angulo, angulo + 0.00005);
    };
    // As pontas das paredes dentro da caixa (a que sai da caixa vale onde sai) e os cantos.
    for (const parede of paredes) {
      if (!tipo.bloqueia(parede)) continue;
      const dentro = recortar(parede.c, x0, y0, x1, y1);
      if (dentro) { juntar(dentro[0], dentro[1]); juntar(dentro[2], dentro[3]); }
    }
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) juntar(x, y);
    angulos.sort((a, b) => a - b);
    const marca = new Int32Array(paredes.length);
    let numero = 0;
    const pontos = [];
    let anterior = null;
    for (const angulo of angulos) {
      if (anterior !== null && angulo - anterior < 1e-9) continue;
      anterior = angulo;
      numero += 1;
      const dx = Math.cos(angulo);
      const dy = Math.sin(angulo);
      const tFim = saida(o, dx, dy, x0, y0, x1, y1);
      const w = caminhada(idx.lado, o, dx, dy);
      const batidas = [];
      let fim = tFim;
      for (let passos = 0; passos < 1e6; passos += 1) {
        const tSai = Math.min(w.tMX, w.tMY, tFim);
        for (const i of idx.celula(w.cx, w.cy)) {
          if (marca[i] === numero) continue;
          marca[i] = numero;
          const parede = paredes[i];
          if (!tipo.bloqueia(parede)) continue;
          const t = batida(o, dx, dy, parede);
          if (t !== null && t < tFim) batidas.push({ t, limitada: tipo.limitada(parede) });
        }
        // Batida antes de sair desta célula: nenhuma parede mais longe pode ser mais perto.
        const t = parada(batidas);
        if (t !== null && t <= tSai) { fim = t; break; }
        if (tSai >= tFim) { if (t !== null) fim = t; break; }
        avancar(w);
      }
      pontos.push({ x: o.x + dx * fim, y: o.y + dy * fim });
    }
    return pontos;
  }

  return { aberta, bloqueiaVista, bloqueiaPasso, bloqueiaLuz, VISTA, LUZ, cruza, enxerga, iluminado, pontoVisto, algumVe, atravessa, poligono, indice };
});
