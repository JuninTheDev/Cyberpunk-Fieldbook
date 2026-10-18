// CORE 0.92.4, core/upgrades/itemupgrade.onboard.*.yaml (p. 163–164); wiki, system-criacao.js, upgrades do Nomad.
// A arma usa o modelo do catálogo; as restrições da instalação ficam na flag para o ataque e a recarga conferirem.
export const ARMAS_VEICULARES = Object.freeze({
  'core_upgrades:onboard-machine-gun': Object.freeze({
    modelo: 'core_weapons:assault-rifle', tipo: 'metralhadora', soAutofogo: true, frontal: true, semRecargaDirigindo: true
  }),
  'core_upgrades:onboard-flamethrower': Object.freeze({
    modelo: 'core_weapons:flamethrower', tipo: 'lanca-chamas', soAutofogo: false, frontal: false, semRecargaDirigindo: true
  }),
  'core_upgrades:onboard-melee-weapon': Object.freeze({
    modelo: 'core_weapons:very-heavy-melee', tipo: 'arma-branca', soAutofogo: false, frontal: false, semRecargaDirigindo: false
  })
});

// Só prepara dados: a criação do documento e a munição ficam com quem chamou. Não altera o upgrade nem o catálogo.
export function prepararArmaVeicular(upgrade, modelo) {
  const id = upgrade?.flags?.['cpr-fieldbook']?.catalogo;
  const regra = Object.hasOwn(ARMAS_VEICULARES, id) ? ARMAS_VEICULARES[id] : null;
  if (!regra || upgrade.type !== 'upgrade' || upgrade.system?.alvo !== 'veiculo' || !upgrade.system.instaladoEm
    || modelo?.type !== 'arma' || !modelo.system) return null;
  const arma = structuredClone(modelo);
  delete arma._id;
  delete arma.id;
  arma.name = upgrade.name;
  Object.assign(arma.system, { equipada: false, maos: 0, slots: 0, instaladoEm: upgrade.system.instaladoEm });
  const { tipo, soAutofogo, frontal, semRecargaDirigindo } = regra;
  arma.flags ??= {};
  arma.flags['cpr-fieldbook'] ??= {};
  arma.flags['cpr-fieldbook'].armaVeicular = { tipo, soAutofogo, frontal, semRecargaDirigindo, upgrade: upgrade.id ?? upgrade._id ?? '' };
  if (soAutofogo) {
    arma.system.pente = { value: 0, max: 30 };
    arma.system.supressivo = false;
  }
  return arma;
}
