// Arquitetura da NET a partir do item `netarch` do sistema: cada andar (andar + ramo) vira um nó, com os
// conteúdos dele (senha, arquivo, nó de controle, Black ICE). O andar 1 do ramo "a" sai do ponto de acesso
// ("entrada"); um ramo novo sai do andar de cima do ramo anterior, como o sistema desenha a cena da arquitetura.
// Sem nada do Foundry: os testes rodam este arquivo direto no Node.
import { CONTEUDO, ICE_PREFIXO } from './constantes.mjs';

export const ENTRADA = 'entrada';
const RAMOS = 'abcdefgh';

export function lerArquitetura(item, { dv: dvForcado } = {}) {
  const andares = [...((item.system && item.system.floors) || [])]
    .sort((a, b) => Number(a.floor) - Number(b.floor) || String(a.branch || 'a').localeCompare(String(b.branch || 'a')) || (a.index || 0) - (b.index || 0));
  const nos = {};
  for (const andar of andares) {
    const numero = Number(andar.floor);
    if (!Number.isInteger(numero) || numero < 1) continue;
    const ramo = andar.branch && RAMOS.includes(andar.branch) ? andar.branch : 'a';
    const id = `${numero}${ramo}`;
    const no = nos[id] || (nos[id] = { id, andar: numero, ramo, conteudos: [] });
    const tipo = CONTEUDO[andar.content] || 'vazio';
    const dv = Number(andar.dv);
    const ice = tipo === 'ice' && String(andar.blackice || '').startsWith(ICE_PREFIXO) ? andar.blackice.slice(ICE_PREFIXO.length) : '';
    no.conteudos.push({ chave: `${id}.${no.conteudos.length}`, tipo, dv: tipo === 'ice' || !dv ? null : dv, ice: tipo === 'ice' ? ice : null, descricao: andar.description || '' });
  }
  const lista = Object.values(nos);
  for (const no of lista) no.pai = paiDe(no, nos, lista);
  const filhos = {};
  for (const no of lista) (filhos[no.pai] || (filhos[no.pai] = [])).push(no.id);
  for (const ids of Object.values(filhos)) ids.sort((a, b) => nos[a].ramo.localeCompare(nos[b].ramo) || nos[a].andar - nos[b].andar);
  const dvs = lista.flatMap(no => no.conteudos.map(conteudo => conteudo.dv)).filter(Boolean);
  return {
    nome: item.name,
    dv: Number(dvForcado) || (dvs.length ? Math.max(...dvs) : 6),
    nos,
    filhos,
    colunas: Math.max(1, ...lista.map(no => RAMOS.indexOf(no.ramo) + 1)),
    andares: Math.max(0, ...lista.map(no => no.andar))
  };
}

// O andar de cima no mesmo ramo; senão, o andar de cima do ramo anterior mais próximo;
// senão (buraco na numeração), o andar mais fundo acima dele, preferindo o mesmo ramo.
function paiDe(no, nos, lista) {
  if (no.andar === 1) return ENTRADA;
  const acima = nos[`${no.andar - 1}${no.ramo}`];
  if (acima) return acima.id;
  for (let i = RAMOS.indexOf(no.ramo) - 1; i >= 0; i--) {
    const outro = nos[`${no.andar - 1}${RAMOS[i]}`];
    if (outro) return outro.id;
  }
  const candidatos = lista.filter(outro => outro.andar < no.andar && outro.ramo <= no.ramo)
    .sort((a, b) => (b.ramo === no.ramo) - (a.ramo === no.ramo) || b.andar - a.andar || b.ramo.localeCompare(a.ramo));
  return candidatos.length ? candidatos[0].id : ENTRADA;
}

export const filhosDe = (arq, id) => arq.filhos[id] || [];
export const paiDoNo = (arq, id) => (id === ENTRADA ? null : (arq.nos[id] || {}).pai || null);
export const vizinhos = (arq, id) => [paiDoNo(arq, id), ...filhosDe(arq, id)].filter(Boolean);
export const ehFundo = (arq, id) => id !== ENTRADA && Boolean(arq.nos[id]) && !filhosDe(arq, id).length;

// Pathfinder (RED p. 199): revela tantos andares quanto o resultado, a partir de onde o netrunner está,
// descendo em largura; um andar com obstrução de DV maior que o resultado aparece, mas o que vem depois não.
export function revelarPathfinder(arq, origem, total) {
  const revelados = [];
  const fila = [...filhosDe(arq, origem)];
  while (fila.length && revelados.length < total) {
    const id = fila.shift();
    revelados.push(id);
    const barra = arq.nos[id].conteudos.some(conteudo => conteudo.dv && conteudo.dv > total);
    if (!barra) fila.push(...filhosDe(arq, id));
  }
  return revelados;
}

// Posição de cada nó no desenho: coluna = ramo, linha = andar (a entrada fica na linha 0).
export const coluna = no => (no.id === ENTRADA ? 0 : RAMOS.indexOf(no.ramo));
