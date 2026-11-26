// O risco da arma (o C73 do plano das modificações de armas; as decisões do usuário de 2026-11-25): a quebra que vem da
// falha crítica (a "Quebra" deixa a arma quebrada, com conserto; a "Quebra sem conserto" a torna uma relíquia), o conserto
// pelo teste do Tech (TECH + Tecnologia de Armas contra a DV do preço da arma, com o custo de uma categoria abaixo) e o
// reforjar (a relíquia passa o nome, a frase, a história e uma modificação para uma arma nova do mesmo tipo; os contadores
// voltam a zero). Aqui ficam as contas, sem o Foundry; o item, o cartão e as janelas, no quebra.mjs.
import { eventoDeMarco, nomeDeExibicao, normalizar } from './regras-identidade.mjs';

// Os estados da arma. A quebrada não ataca, e o que está nela para (como no EMP); a relíquia, para sempre.
export const ESTADOS = {
  quebrada: { rotulo: 'Quebrada', texto: 'tem conserto: o Tech conserta' },
  reliquia: { rotulo: 'Relíquia', texto: 'quebrou sem conserto: a história fica' }
};
// A falha da arma (regras.FALHAS_DA_ARMA) que quebra: a "Quebra" e a "Quebra sem conserto".
const PELA_FALHA = { destroyed: 'quebrada', destroyedBeyondRepair: 'reliquia' };
export const estadoDaFalha = efeito => PELA_FALHA[efeito] ?? null;
export const estadoValido = estado => (Object.hasOwn(ESTADOS, estado) ? estado : null);

// As categorias de preço do RED (p. 385; a página "Economia" da wiki), da mais barata à mais cara.
export const CATEGORIAS = [
  { eb: 10, nome: 'Barato' }, { eb: 20, nome: 'Cotidiano' }, { eb: 50, nome: 'Oneroso' }, { eb: 100, nome: 'Premium' },
  { eb: 500, nome: 'Caro' }, { eb: 1000, nome: 'Muito Caro' }, { eb: 5000, nome: 'Luxo' }, { eb: 10000, nome: 'Super Luxo' }
];
// A categoria do preço: a maior que ele alcança (abaixo de 10eb, a Barato).
export function categoriaDoPreco(preco) {
  const eb = Math.max(0, Number(preco) || 0);
  let indice = 0;
  CATEGORIAS.forEach((categoria, i) => { if (eb >= categoria.eb) indice = i; });
  return indice;
}
// A DV do conserto pela categoria de preço da arma: 13 até a Onerosa, 17 na Premium, 21 na Cara, 24 da Muito Cara para cima.
export function dvDoConserto(preco) {
  const indice = categoriaDoPreco(preco);
  return indice <= 2 ? 13 : indice === 3 ? 17 : indice === 4 ? 21 : 24;
}
export const TESTE_DO_CONSERTO = { tipo: 'pericia', id: 'weaponstech' };
// O conserto da arma pelo preço dela: a DV, a categoria, o custo (o preço de uma categoria abaixo; a Barata, sem
// abaixo, custa o dela) e o teste.
export function consertoDaArma(preco) {
  const indice = categoriaDoPreco(preco);
  return {
    dv: dvDoConserto(preco), categoria: CATEGORIAS[indice].nome, custo: CATEGORIAS[Math.max(0, indice - 1)].eb, teste: { ...TESTE_DO_CONSERTO }
  };
}

// O reforjar: a relíquia passa a identidade para a arma nova. velha: { identidade, estado, tipo, modelo, reforjada };
// nova: { identidade, tipo, estado }. Devolve { identidade } (a nova, com o nome, a frase, a aparência, quem fez, o dono
// dela e o marco "Reforjada da …"; os contadores voltam a zero) ou { erro }.
export function reforjar(velha, nova, { data, por = 'mestre' } = {}) {
  if (velha?.estado !== 'reliquia') return { erro: 'só a relíquia (a arma que quebrou sem conserto) se reforja' };
  if (velha.reforjada) return { erro: 'esta relíquia já foi reforjada' };
  if (nova?.estado) return { erro: 'a arma nova está quebrada' };
  if (!velha.tipo || velha.tipo !== nova?.tipo) return { erro: 'a arma nova tem de ser do mesmo tipo' };
  const antiga = normalizar(velha.identidade);
  const atual = normalizar(nova.identidade);
  if (atual.apelido) return { erro: `a arma nova já tem um nome próprio (${atual.apelido})` };
  if (!antiga.apelido) return { erro: 'a relíquia não tem um nome próprio para passar' };
  const marco = eventoDeMarco(`Reforjada da ${nomeDeExibicao(velha.modelo, antiga.apelido)}`, { data, por });
  return {
    identidade: normalizar({
      ...atual, apelido: antiga.apelido, frase: antiga.frase, aparencia: antiga.aparencia, feitaPor: antiga.feitaPor,
      eventos: [...atual.eventos.filter(evento => evento.tipo === 'origem'), marco], avisados: [], antes: null
    })
  };
}
