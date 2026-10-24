// CORE 0.92.4, cpr-mook-skills.hbs: nível; nível + STAT preparado; base + modificadores persistentes da perícia.
// Só a exibição: Role separada, ferimento, Sorte e situacionais continuam sendo resolvidos na rolagem.
export function exibirPericiaDoCapanga({ nivel, atributo, bonus = 0 }, modo = 'base') {
  if (modo === 'nivel') return { valor: nivel, rotulo: 'NÍVEL', dica: 'Só o nível da perícia' };
  const base = nivel + atributo;
  if (modo === 'total') return { valor: base + bonus, rotulo: 'TOTAL', dica: 'Atributo preparado + nível + bônus persistentes da perícia; sem o dado, a Role separada e o ferimento' };
  return { valor: base, rotulo: 'BASE', dica: 'Atributo preparado + nível, sem bônus da perícia' };
}
