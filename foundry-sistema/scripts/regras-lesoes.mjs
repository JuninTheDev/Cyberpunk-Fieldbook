// Wiki, system-rules.js (p. 187): 2d6 na tabela escolhida, repetindo se a lesão já existe.
// CORE 0.92.4, CPRActorSheet._drawCriticalInjuryTable: antes de rolar, confere se a tabela acabou;
// limita as tentativas para uma tabela ou uma sequência de dados que não alcança outra lesão.
import { SISTEMA } from './config.mjs';
import { BONUS_CRITICO, lesaoNaTabela } from './regras.mjs';

export const MAXIMO_ROLAGENS_LESAO = 1000;
export const modoDeLesoesRepetidas = modo => ['off', 'warn'].includes(modo) ? modo : 'reroll';

export function lesoesDisponiveis(faixas, tem = [], excluir = []) {
  const indisponiveis = new Set([...tem, ...excluir]);
  return [...new Set((faixas ?? []).map(([, , id]) => id).filter(id => id && !indisponiveis.has(id)))];
}

// O callback recebe os dados do ambiente: no Foundry, Roll('2d6'); no teste de referência, a sequência conhecida.
export async function sortearLesao({ faixas, tem = [], excluir = [], repetidas = 'reroll', rolar }) {
  const disponiveis = new Set(lesoesDisponiveis(faixas, modoDeLesoesRepetidas(repetidas) === 'reroll' ? tem : [], excluir));
  if (!disponiveis.size) return { motivo: 'esgotada' };
  for (let tentativa = 0; tentativa < MAXIMO_ROLAGENS_LESAO; tentativa++) {
    const roll = await rolar();
    const id = lesaoNaTabela(faixas, roll.total);
    if (disponiveis.has(id)) return { id, roll };
  }
  return { motivo: 'limite' };
}

// As lesões que mudam uma conta (a wiki, system-rules.js, a tabela de lesões; o CORE 0.92.4 só tem o texto delas). A
// correção rápida desliga o efeito até o "Voltou" (tratamento.mjs), como o +1 no Death Save.
export const CRANIO_RACHADO = 'core_critical-injuries-head:cracked-skull';
export const COSTELAS_QUEBRADAS = 'core_critical-injuries-body:broken-ribs';
export const lesaoAtiva = (itens, id) => [...itens ?? []].some(item => item?.type === 'lesao'
  && item.flags?.[SISTEMA]?.catalogo === id && !item.flags?.[SISTEMA]?.corrigida);

// Crânio rachado (`:50`): "Tiros mirados na cabeça multiplicam o dano que passa da armadura por 3 em vez de 2." No
// sistema, a cabeça só vem do ataque mirado (o tiro e o corpo a corpo).
export const vezesNaCabeca = itens => (lesaoAtiva(itens, CRANIO_RACHADO) ? 3 : 2);

// Costelas quebradas (`:33`): "No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus da lesão
// direto no HP." O dano bônus da lesão é o do crítico (p. 187, regras.BONUS_CRITICO).
export const METROS_DAS_COSTELAS = 4;
export const costelasDoem = (itens, metros) => lesaoAtiva(itens, COSTELAS_QUEBRADAS) && Number(metros) > METROS_DAS_COSTELAS;
export const DANO_DAS_COSTELAS = BONUS_CRITICO;

// Os metros a pé do histórico de movimento do turno (o TokenDocument#movementHistory do Foundry 14, que o combate zera a
// cada turno). Cada ponto diz como o token chegou a ele: o 'displace' (quem vai no veículo, client/config.mjs, o mestre
// que reposiciona sem andar) e o 'blink' não são a pé, e começam outro trecho. medir: os pontos de um trecho seguido →
// os metros pela grade da cena (BaseGrid#measurePath, com a regra das diagonais dela).
const SEM_ANDAR = new Set(['displace', 'blink']);
export function metrosAPe(historico = [], medir) {
  let total = 0;
  let trecho = [];
  const fechar = () => { if (trecho.length > 1) total += Number(medir(trecho)) || 0; };
  for (const ponto of historico) {
    if (SEM_ANDAR.has(ponto?.action)) { fechar(); trecho = [ponto]; } else trecho.push(ponto);
  }
  fechar();
  return total;
}
