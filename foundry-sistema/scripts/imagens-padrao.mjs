// A imagem padrão do documento em branco (o getDefaultArtwork nativo do Foundry 14: vale também no item em branco da ficha
// ou aninhado no ator, sem substituir uma imagem explícita). Desde o C49 (decisão do usuário, 2026-10-26), os ícones neon
// do sistema (regras-icones.mjs); até o ciclo 190, os SVGs do CORE 0.92.4 (o C34.3, em icones/padrao, que ficam no pacote).
import { imagemNeonPadrao } from './regras-icones.mjs';

export const imagemPadrao = (documento, tipo) => imagemNeonPadrao(documento, tipo);
