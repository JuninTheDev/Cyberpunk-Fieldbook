// Wiki, system-rules.js:24, :516 e :535 (p. 173, 177): DEX + Atletismo, linha do lança-granadas, até 25 m.
export const ALCANCE_ARREMESSO = 25;
export const baseArremesso = (dex, atletismo) => Number(dex) + Number(atletismo);

export function dvArremesso(metros, tabela) {
  if (!Number.isFinite(metros) || metros < 0 || metros > ALCANCE_ARREMESSO) return null;
  const distancia = Math.round(metros);
  return tabela?.find(([min, max]) => distancia >= min && distancia <= max)?.[2] ?? null;
}
