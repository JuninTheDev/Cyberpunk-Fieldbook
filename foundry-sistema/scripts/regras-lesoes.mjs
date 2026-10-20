// Wiki, system-rules.js (p. 187): 2d6 na tabela escolhida, repetindo se a lesão já existe.
// CORE 0.92.4, CPRActorSheet._drawCriticalInjuryTable: antes de rolar, confere se a tabela acabou;
// limita as tentativas para uma tabela ou uma sequência de dados que não alcança outra lesão.
import { lesaoNaTabela } from './regras.mjs';

export const MAXIMO_ROLAGENS_LESAO = 1000;

export function lesoesDisponiveis(faixas, tem = [], excluir = []) {
  const indisponiveis = new Set([...tem, ...excluir]);
  return [...new Set((faixas ?? []).map(([, , id]) => id).filter(id => id && !indisponiveis.has(id)))];
}

// O callback recebe os dados do ambiente: no Foundry, Roll('2d6'); no teste de referência, a sequência conhecida.
export async function sortearLesao({ faixas, tem = [], excluir = [], rolar }) {
  const disponiveis = new Set(lesoesDisponiveis(faixas, tem, excluir));
  if (!disponiveis.size) return { motivo: 'esgotada' };
  for (let tentativa = 0; tentativa < MAXIMO_ROLAGENS_LESAO; tentativa++) {
    const roll = await rolar();
    const id = lesaoNaTabela(faixas, roll.total);
    if (disponiveis.has(id)) return { id, roll };
  }
  return { motivo: 'limite' };
}
