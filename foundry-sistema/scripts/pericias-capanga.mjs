// CORE 0.92.4: mookSheetSkillDisplay (settings.js) e cpr-mook-skills.hbs.
// Muda só o número mostrado na lista; total e nível continuam os da ficha e da rolagem.
const ROTULOS = { nivel: 'NÍVEL', base: 'BASE', total: 'TOTAL' };
const DICAS = { nivel: 'Nível da perícia', base: 'Atributo + nível, sem os modificadores', total: 'Total da rolagem, sem o dado' };

export function modoDePericiasDoCapanga(modo) {
  return Object.hasOwn(ROTULOS, modo) ? modo : 'base';
}

export function periciaDoCapanga(linha, atributo, modo) {
  if (linha.grupo) return linha;
  modo = modoDePericiasDoCapanga(modo);
  const valores = { nivel: linha.nivel, base: atributo + linha.nivel, total: linha.total };
  return { ...linha, exibicaoCapanga: valores[modo], dicaCapanga: DICAS[modo] };
}

export const rotuloDePericiasDoCapanga = modo => ROTULOS[modoDePericiasDoCapanga(modo)];
