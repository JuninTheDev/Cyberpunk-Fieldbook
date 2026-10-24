// Reconhecimento (wiki, Reputação e facedown, p. 193–194): um d10 simples abaixo do nível, sem empate favorável.
// Má fama usa a magnitude, por decisão do usuário de 2026-10-24; a Reputação assinada da ficha não muda.
export function nivelDeReconhecimento(reputacao) {
  if (!Number.isInteger(reputacao)) return null; // Também recusa NaN, infinito e valores que exigiriam coerção.
  const nivel = Math.abs(reputacao);
  return nivel <= 10 ? nivel : null;
}

export function reconhecimentoPorReputacao(reputacao, dado) {
  const nivel = nivelDeReconhecimento(reputacao);
  return nivel !== null && Number.isInteger(dado) && dado >= 1 && dado <= 10 && dado < nivel;
}
