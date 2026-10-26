// O tema do sistema no resto do Foundry (o C43, parte 3; o "Theme Foundry" do CORE 0.93, SystemUtils.SetTheme em
// fvtt-cyberpunk-red-core-dev/src/modules/utils/cpr-systemUtils.js:110-140): a configuração deste navegador liga ou
// desliga o atributo no <html>, e o styles/tema-foundry.css troca as variáveis de tema do Foundry pela paleta do sistema.
export const ATRIBUTO_DO_TEMA = 'data-cprf-tema-foundry';

export function aplicarTemaNoFoundry(ligado, documento = globalThis.document) {
  documento?.documentElement?.toggleAttribute(ATRIBUTO_DO_TEMA, Boolean(ligado));
}
