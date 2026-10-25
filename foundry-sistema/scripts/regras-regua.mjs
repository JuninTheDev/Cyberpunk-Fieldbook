// A régua com Andar e Correr (o C44), sem o Foundry. As faixas são as do drag-ruler.js do CORE 0.92.4
// (modules/hooks/external/drag-ruler.js:13-29: "walk" até derivedStats.walk e "run" até derivedStats.run, o MOVE × 2 e o
// MOVE × 4 de cpr-actor.js:349-351), com as contas deste sistema: o Movimento e Correr de regras-estados.mjs. A wiki
// (system-rules.js:499, :501 e :514, p. 168–169): a Ação de Movimento anda até MOVE × 2 m; Correr é outra, depois dela.

// As cores do CORE (o "default" de cada faixa no drag-ruler.js:15-16). A de longe demais não é do CORE (lá, era do módulo
// Drag Ruler), nem do Foundry 14, que não tem faixas de movimento: o vermelho.
export const CORES_DA_REGUA = Object.freeze({ andar: 0x00ff00, correr: 0xff8000, longe: 0xff0000 });
export const ROTULOS_DA_REGUA = Object.freeze({ andar: 'Andar', correr: 'Correr' });

// Os limites, em metros gastos no turno, pelo movimentoPorEstado e pelo corridaPorEstado (o MOVE já preparado):
// andar, o da Ação de Movimento (0: não anda, caído ou agarrado); correr, o total com Correr (igual a andar: não corre,
// como quem dirige; o corridaPorEstado dá o total 0 a quem não corre).
export function faixasDaRegua(movimento, corrida) {
  const andar = Math.max(0, Number(movimento?.metros) || 0);
  const correr = Math.max(andar, Number(corrida?.total) || 0);
  return { andar, correr };
}

// A faixa do que se gastou até um ponto do caminho (o custo do movimento, arredondado como o rótulo da régua): até andar,
// 'andar'; até correr, 'correr'; além, 'longe'. Sem o custo (NaN), nenhuma: o caminho fica como o do Foundry.
export function faixaDoGasto(gasto, { andar = 0, correr = 0 } = {}) {
  if (typeof gasto !== 'number' || Number.isNaN(gasto) || gasto < 0) return null;
  const metros = Math.round(gasto * 100) / 100;
  if (andar > 0 && metros <= andar) return 'andar';
  if (correr > andar && metros <= correr) return 'correr';
  return 'longe';
}
