// CORE 0.92.4, CPRActor.getEquippedArmors e _ablateArmor; wiki, system-rules.js (Armadura, p. 186)
// e system-catalog.js (Skin Weave/Subdermal Armor): o SP não soma, mas todas as fontes do local sofrem ablação.
export function armadurasDoLocal(itens, local) {
  if (!['cabeca', 'corpo'].includes(local)) return [];
  return [...itens].filter(item => item.type === 'armadura' && item.system.equipada && !item.system.escudo && item.system.sp[local].max > 0);
}

// No empate, conserva o primeiro da ficha. O que vale é o SP atual, depois da ablação, e não o máximo original.
export function armaduraDoLocal(itens, local) {
  return armadurasDoLocal(itens, local).reduce((melhor, item) => item.system.sp[local].value > (melhor?.system.sp[local].value ?? -1) ? item : melhor, null);
}

export const spComVariacao = ({ value, max }, delta) => Math.max(0, Math.min(max, value + delta));
