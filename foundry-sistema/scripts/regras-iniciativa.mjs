// C46: a mesa da wiki (master:Tabletop/README.md, "Veículos") deixa o veículo fora da iniciativa: quem age é o
// motorista. O CORE 0.92.4 (modules/combat/cpr-combat.js:68-78) já recusa o contêiner; lá não há ator de veículo.
export const AVISO_INICIATIVA_VEICULO = 'O veículo não entra na iniciativa; quem age é o motorista.';
export const podeEntrarNaIniciativa = tipo => tipo !== 'veiculo';
