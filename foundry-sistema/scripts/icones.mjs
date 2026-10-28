// Os ícones próprios nos estados do token (o C49, parte 1; o mapa em regras-icones.mjs): cada estado registrado (os do
// Foundry e os do sistema) troca a imagem pela neon, pelo id. Roda no setup e no ready, depois de todos os módulos
// registrarem os seus; o "derrotado" do rastreador de combate também.
import { iconeDoEstado, iconeNeon } from './regras-icones.mjs';

export function aplicarIconesDosEstados() {
  for (const estado of CONFIG.statusEffects) {
    const icone = iconeDoEstado(estado.id);
    if (icone) estado.img = icone;
  }
  CONFIG.controlIcons.defeated = iconeNeon('morto');
}
