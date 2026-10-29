// A cirurgia do cyberware, sem Foundry (o C41, parte 4; a wiki, "Hospital, Trauma Team e instalação", p. 223–226, e a
// instalação da ficha da wiki, personagem-jogo.js). A peça diz o lugar mínimo (o installLocation do CORE: shopping,
// clínica ou hospital); instala-se ali ou num lugar melhor, pagando ao ripperdoc o custo do lugar, ou com um Medtech do
// grupo, que rola TECH + Cirurgia contra a DV do lugar em vez de pagar (decisão do usuário, 2026-10-25). A cirurgia que
// falha não instala, e a peça fica inteira. Retirar sem destruir é a mesma DV da instalação, em 4 horas; falhar destrói
// a peça. A peça sem lugar (o "notApplicable" do CORE) não pede cirurgia.

export const LUGARES_DA_CIRURGIA = ['mall', 'clinic', 'hospital'];
export const LUGAR_DA_CIRURGIA = {
  mall: { nome: 'shopping', onde: 'no shopping', dv: 13, custo: 100 },
  clinic: { nome: 'clínica', onde: 'na clínica', dv: 15, custo: 500 },
  hospital: { nome: 'hospital', onde: 'no hospital', dv: 17, custo: 1000 }
};
export const HORAS_DA_RETIRADA = 4;

// Os lugares em que a peça se instala: o mínimo dela e os melhores; vazio, sem cirurgia.
export const lugaresDaPeca = local => (LUGARES_DA_CIRURGIA.includes(local) ? LUGARES_DA_CIRURGIA.slice(LUGARES_DA_CIRURGIA.indexOf(local)) : []);
export const pedeCirurgia = local => lugaresDaPeca(local).length > 0;

// Precisa superar a DV, como os outros testes (p. 128).
export const cirurgiaDeuCerto = ({ total, dv }) => Number(total) > Number(dv);

// O plano da instalação: o lugar escolhido (no mínimo o da peça), quem opera ('ripperdoc' ou 'medtech') e se cobra.
// O ripperdoc cobra o custo do lugar, e o dinheiro precisa dar (como na wiki); o Medtech rola a DV e não cobra.
export function planoDaInstalacao({ local, lugar, quem = 'ripperdoc', cobrar = true, dinheiro = 0 }) {
  const lugares = lugaresDaPeca(local);
  if (!lugares.length) return { cirurgia: false, lugar: '', dv: null, custo: 0, onde: 'sem cirurgia' };
  if (!LUGARES_DA_CIRURGIA.includes(lugar)) return { erro: 'Escolha onde instalar: shopping, clínica ou hospital.' };
  const minimo = LUGAR_DA_CIRURGIA[local];
  if (!lugares.includes(lugar)) return { erro: `Esta peça só se instala ${minimo.onde}${local === 'hospital' ? '' : ' ou melhor'} (DV${minimo.dv}).` };
  if (!['ripperdoc', 'medtech'].includes(quem)) return { erro: 'Escolha quem opera: o ripperdoc ou um Medtech.' };
  const { onde, dv, custo: doLugar } = LUGAR_DA_CIRURGIA[lugar];
  const custo = quem === 'ripperdoc' && cobrar ? doLugar : 0;
  if (custo > (Number(dinheiro) || 0)) return { erro: `Dinheiro insuficiente: tem ${Number(dinheiro) || 0}eb, e a instalação ${onde} custa ${custo}eb.` };
  return { cirurgia: true, lugar, quem, dv, custo, onde, rola: quem === 'medtech' };
}

// A retirada com cirurgia: a DV do lugar em que a peça foi instalada (o que a instalação guardou) ou, sem ele, a do lugar
// mínimo da peça. Sem cirurgia (a peça sem lugar), null.
export function planoDaRetirada({ local, instaladaEm = '' }) {
  const lugar = lugaresDaPeca(local).includes(instaladaEm) ? instaladaEm : local;
  if (!pedeCirurgia(lugar)) return null;
  return { lugar, dv: LUGAR_DA_CIRURGIA[lugar].dv, onde: LUGAR_DA_CIRURGIA[lugar].onde, horas: HORAS_DA_RETIRADA };
}
