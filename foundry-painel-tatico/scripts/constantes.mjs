// Identificadores do módulo e nomes fixos do sistema e dos outros módulos da mesa.
export const MODULE_ID = 'painel-tatico';
export const SYSTEM_ID = 'cyberpunk-red-core';
// Só personagens e capangas têm o painel (veículos, contêineres, Black ICE e demônios ficam de fora).
export const TIPOS_DE_ATOR = ['character', 'mook'];

// Modos de tiro do sistema: a flag firetype-<arma> do ator, a mesma da ficha.
export const MODOS_DO_SISTEMA = {
  aimed: { nome: 'Mirado', icone: 'fa-crosshairs', dica: 'Tiro mirado: −8 no ataque; acertou, o efeito do local (cabeça: dano ×2).' },
  autofire: { nome: 'Autofogo', icone: 'fa-bars-staggered', dica: 'Autofogo: 10 balas, DV da tabela de autofogo; o dano multiplica pela diferença (até o máximo da arma).' },
  suppressive: { nome: 'Supressivo', icone: 'fa-water', dica: 'Fogo supressivo: 10 balas; quem estiver a até 25 m e à vista testa Concentração ou se protege.' }
};
export const LOCAIS_MIRADOS = { head: 'Cabeça', heldItem: 'Item na mão', leg: 'Perna' };
export const CICLO_DE_EQUIPAR = ['owned', 'carried', 'equipped'];
export const NOMES_DE_EQUIPAR = { owned: 'Guardado', carried: 'Carregado', equipped: 'Equipado' };

// Os outros módulos da mesa.
export const CPR_2077 = 'cpr-2077';
export const FLUXO = 'fluxo-de-combate';
export const FLUXO_SUPRIMIDO = 'fluxo-de-combate-suprimido';
export const NET = 'net-architect';
export const COMBAT_HUD = 'cpr-combat-hud';
