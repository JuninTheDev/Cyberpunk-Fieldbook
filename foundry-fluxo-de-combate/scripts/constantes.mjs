// Identificadores do módulo e nomes fixos do sistema (os itens do CPR guardam o nome em inglês em qualquer idioma).
export const MODULE_ID = 'fluxo-de-combate';
export const SYSTEM_ID = 'cyberpunk-red-core';
export const STATUS_SUPRIMIDO = `${MODULE_ID}-suprimido`;
export const MODULO_ANTIGO = 'cpred-evasion-workflow';
export const DIWAKO = 'diwako-cpred-additions';

export const PERICIAS = { evasao: 'Evasion', concentracao: 'Concentration' };
export const ITENS = { reflexTuner: 'Reflex Tuner', pernaQuebrada: 'Broken Leg', pernaDesmembrada: 'Dismembered Leg' };
// Só personagens e capangas se defendem pelo módulo (veículos, contêineres, Black ICE e demônios ficam com o mestre).
export const TIPOS_DE_ATOR = ['character', 'mook'];
