// As áreas e os desenhos no mapa (M19), como os Measured Templates e os Drawings do Foundry: círculo, cone, linha,
// retângulo e o traço livre. A conta de quem está dentro de uma área (o centro do token) e o tamanho em metros, para a
// página (mesa.js) e os testes. As medidas ficam em px da cena; a grade diz quanto vale um quadrado.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MesaAreas = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const TIPOS = ['circulo', 'cone', 'linha', 'retangulo', 'livre'];
  const NOMES = { circulo: 'Círculo', cone: 'Cone', linha: 'Linha', retangulo: 'Retângulo', livre: 'Traço livre' };
  // O cone do RED (a espingarda com cartucho, o lança-chamas): 90° de abertura, 45° para cada lado.
  const ABERTURA_PADRAO = 90;
  const rad = graus => (graus * Math.PI) / 180;
  // A diferença entre dois ângulos, de 0 a 180°.
  const diferenca = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };

  // O ponto (o centro de um token) está na área?
  function contem(area, ponto) {
    if (!area || !ponto) return false;
    const dx = ponto.x - area.x;
    const dy = ponto.y - area.y;
    const longe = Math.hypot(dx, dy);
    if (area.tipo === 'circulo') return longe <= area.dist + 1e-6;
    if (area.tipo === 'cone') {
      if (longe > area.dist + 1e-6) return false;
      if (longe < 1e-6) return true;
      return diferenca((Math.atan2(dy, dx) * 180) / Math.PI, area.angulo || 0) <= (area.abertura || ABERTURA_PADRAO) / 2 + 1e-6;
    }
    if (area.tipo === 'linha') {
      const a = rad(area.angulo || 0);
      const ao = dx * Math.cos(a) + dy * Math.sin(a);
      const lado = -dx * Math.sin(a) + dy * Math.cos(a);
      return ao >= -1e-6 && ao <= area.dist + 1e-6 && Math.abs(lado) <= (area.largura || 0) / 2 + 1e-6;
    }
    if (area.tipo === 'retangulo') return dx >= -1e-6 && dy >= -1e-6 && dx <= area.w + 1e-6 && dy <= area.h + 1e-6;
    return false;
  }

  // Os pontos do contorno (para desenhar e para escolher com o clique), em px da cena.
  function contorno(area, passos = 24) {
    if (area.tipo === 'circulo') return Array.from({ length: passos * 2 }, (_, i) => { const a = (i / (passos * 2)) * Math.PI * 2; return { x: area.x + Math.cos(a) * area.dist, y: area.y + Math.sin(a) * area.dist }; });
    if (area.tipo === 'cone') {
      const meio = rad(area.angulo || 0);
      const abre = rad(area.abertura || ABERTURA_PADRAO) / 2;
      const arco = Array.from({ length: passos + 1 }, (_, i) => { const a = meio - abre + (2 * abre * i) / passos; return { x: area.x + Math.cos(a) * area.dist, y: area.y + Math.sin(a) * area.dist }; });
      return [{ x: area.x, y: area.y }, ...arco];
    }
    if (area.tipo === 'linha') {
      const a = rad(area.angulo || 0);
      const meia = (area.largura || 0) / 2;
      const nx = -Math.sin(a) * meia;
      const ny = Math.cos(a) * meia;
      const fim = { x: area.x + Math.cos(a) * area.dist, y: area.y + Math.sin(a) * area.dist };
      return [{ x: area.x + nx, y: area.y + ny }, { x: fim.x + nx, y: fim.y + ny }, { x: fim.x - nx, y: fim.y - ny }, { x: area.x - nx, y: area.y - ny }];
    }
    if (area.tipo === 'retangulo') return [{ x: area.x, y: area.y }, { x: area.x + area.w, y: area.y }, { x: area.x + area.w, y: area.y + area.h }, { x: area.x, y: area.y + area.h }];
    if (area.tipo === 'livre') return (area.pontos || []).map(([x, y]) => ({ x, y }));
    return [];
  }

  // O clique pegou o desenho? A área: dentro dela. O traço livre: perto da linha (tolerancia em px da cena).
  function acerta(area, ponto, tolerancia = 6) {
    if (area.tipo !== 'livre') return contem(area, ponto);
    const pontos = contorno(area);
    for (let i = 1; i < pontos.length; i += 1) {
      const a = pontos[i - 1];
      const b = pontos[i];
      const lx = b.x - a.x;
      const ly = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((ponto.x - a.x) * lx + (ponto.y - a.y) * ly) / (lx * lx + ly * ly || 1)));
      if (Math.hypot(ponto.x - (a.x + t * lx), ponto.y - (a.y + t * ly)) <= tolerancia + (area.espessura || 0) / 2) return true;
    }
    return false;
  }

  // O tamanho como a mesa mostra: em metros (a grade diz quanto vale um quadrado).
  const metros = (px, grade) => Math.round((px / (grade.tamanho || 100)) * (grade.metros || 2) * 10) / 10;
  function descrever(area, grade) {
    const u = grade.unidade || 'm';
    if (area.tipo === 'circulo') return `Círculo de ${metros(area.dist, grade)} ${u} de raio`;
    if (area.tipo === 'cone') return `Cone de ${metros(area.dist, grade)} ${u} (${Math.round(area.abertura || ABERTURA_PADRAO)}°)`;
    if (area.tipo === 'linha') return `Linha de ${metros(area.dist, grade)} ${u} × ${metros(area.largura, grade)} ${u}`;
    if (area.tipo === 'retangulo') return `Retângulo de ${metros(area.w, grade)} × ${metros(area.h, grade)} ${u}`;
    return 'Traço livre';
  }

  return { TIPOS, NOMES, ABERTURA_PADRAO, contem, contorno, acerta, metros, descrever };
});
