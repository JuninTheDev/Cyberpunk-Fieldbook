// O marcador de turno (o C43, parte 2; o "Token Marker" do CORE 0.93, settings.js e cpr.js): a configuração do mundo
// escolhe o desenho que o Foundry 14 põe sob o token da vez quando a mesa não escolheu outro (o
// CONFIG.Combat.fallbackTurnMarker; o marcador das configurações do combate continua valendo por cima). Os quatro do
// CORE (icones/marcadores, GPL v3) e o do próprio Foundry. Mudou, a cena é desenhada de novo.
import { caminho } from './config.mjs';

export const MARCADORES_DE_TURNO = {
  padrao: { rotulo: 'O do sistema (padrão)', arquivo: 'turn-marker_default.svg' },
  'sem-desenho': { rotulo: 'Sem o desenho', arquivo: 'turn-marker_no-graphic.svg' },
  'sem-sombra': { rotulo: 'Sem a sombra', arquivo: 'turn-marker_no-shade.svg' },
  'sem-centro': { rotulo: 'Sem o desenho nem a sombra', arquivo: 'turn-marker_no-center.svg' },
  foundry: { rotulo: 'O do Foundry', arquivo: null }
};

// O caminho do marcador escolhido; o do Foundry (ou uma escolha que não existe mais) volta ao original dele.
export function caminhoDoMarcador(escolha, original) {
  const arquivo = MARCADORES_DE_TURNO[escolha]?.arquivo;
  return arquivo ? caminho(`icones/marcadores/${arquivo}`) : original;
}

let original = null;
export function aplicarMarcadorDeTurno(escolha) {
  original ??= CONFIG.Combat.fallbackTurnMarker;
  CONFIG.Combat.fallbackTurnMarker = caminhoDoMarcador(escolha, original);
  return CONFIG.Combat.fallbackTurnMarker;
}
