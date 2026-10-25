// A conta do hospital, sem Foundry (o C41, parte 4; a wiki, "Hospital, Trauma Team e instalação", p. 223–226): a maior DV
// da visita dá o custo (DV10 50eb, DV13 100eb, DV15 500eb, DV17 ou mais 1.000eb; o membro clonado e o cyberware médico de
// reposição já estão incluídos), e o leito custa 100eb por noite. O Trauma Team Prata cobra as cirurgias à parte, pelo
// preço do hospital (a conta inteira); o Executivo inclui a cirurgia (a visita sai de graça; o leito, não). O plano vem
// da ficha (a moradia da wiki, o C22: "Trauma Team Prata" 500eb/mês, "Trauma Team Executivo" 1.000eb/mês), e o mestre
// pode trocar na janela.

export const CUSTO_DA_VISITA = [[17, 1000], [15, 500], [13, 100], [10, 50]];
export const CUSTO_DO_LEITO = 100;
export const DVS_DA_VISITA = [0, 10, 13, 15, 17];
export const MAXIMO_DE_NOITES = 365;
export const PLANOS_DO_TRAUMA_TEAM = { nenhum: 'Sem Trauma Team', prata: 'Trauma Team Prata', executivo: 'Trauma Team Executivo' };

// O custo pela maior DV da visita (abaixo de DV10, nada).
export const custoDaVisita = dv => CUSTO_DA_VISITA.find(([minimo]) => Number(dv) >= minimo)?.[1] ?? 0;

// O plano pela ficha: o nome que a wiki dá e, sem ele, o custo mensal.
export function planoDoTraumaTeam(traumaTeam) {
  const nome = String(traumaTeam?.descricao ?? '').toLowerCase();
  if (nome.includes('executiv')) return 'executivo';
  if (nome.includes('prata') || nome.includes('silver')) return 'prata';
  const custo = Number(traumaTeam?.custo) || 0;
  return custo >= 1000 ? 'executivo' : custo >= 500 ? 'prata' : 'nenhum';
}

// A conta: a visita (de graça no Executivo), o leito e o total.
export function contaDoHospital({ dv = 0, noites = 0, plano = 'nenhum' } = {}) {
  if (!Number.isInteger(noites) || noites < 0 || noites > MAXIMO_DE_NOITES) return { erro: `Noites no leito: de 0 a ${MAXIMO_DE_NOITES}.` };
  if (!Object.hasOwn(PLANOS_DO_TRAUMA_TEAM, plano)) return { erro: 'Escolha o plano do Trauma Team.' };
  const doLivro = custoDaVisita(dv);
  const incluida = plano === 'executivo' && doLivro > 0;
  const visita = incluida ? 0 : doLivro;
  const leito = noites * CUSTO_DO_LEITO;
  return { dv: Number(dv) || 0, noites, plano, doLivro, incluida, visita, leito, total: visita + leito };
}
