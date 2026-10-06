// Arquitetura da NET a partir do item `netarch` do sistema: cada andar (andar + ramo) vira um nó, com os
// conteúdos dele (senha, arquivo, nó de controle, Black ICE). O andar 1 do ramo "a" sai do ponto de acesso
// ("entrada"); um ramo novo sai do andar de cima do ramo anterior, como o sistema desenha a cena da arquitetura.
// Demônios e netrunners inimigos ficam nas flags do item (o item do sistema não tem esses conteúdos).
// Sem nada do Foundry: os testes rodam este arquivo direto no Node.
import { CONTEUDO, CONTEUDO_DO_TIPO, ICE_PREFIXO, MODULE_ID } from './constantes.mjs';

export const ENTRADA = 'entrada';
export const RAMOS = 'abcdefgh';
export const ANDAR_MAX = 18;

const defensoresDo = item => (item.flags && item.flags[MODULE_ID] && item.flags[MODULE_ID].defensores) || [];

export function lerArquitetura(item, { dv: dvForcado } = {}) {
  const andares = [...((item.system && item.system.floors) || [])]
    .sort((a, b) => Number(a.floor) - Number(b.floor) || String(a.branch || 'a').localeCompare(String(b.branch || 'a')) || (a.index || 0) - (b.index || 0));
  const nos = {};
  const noEm = (numero, ramo) => {
    const id = `${numero}${ramo}`;
    return nos[id] || (nos[id] = { id, andar: numero, ramo, conteudos: [] });
  };
  for (const andar of andares) {
    const numero = Number(andar.floor);
    if (!Number.isInteger(numero) || numero < 1) continue;
    const no = noEm(numero, andar.branch && RAMOS.includes(andar.branch) ? andar.branch : 'a');
    const tipo = CONTEUDO[andar.content] || 'vazio';
    const dv = Number(andar.dv);
    const ice = tipo === 'ice' && String(andar.blackice || '').startsWith(ICE_PREFIXO) ? andar.blackice.slice(ICE_PREFIXO.length) : '';
    no.conteudos.push({ chave: `${no.id}.${no.conteudos.length}`, tipo, dv: tipo === 'ice' || !dv ? null : dv, ice: tipo === 'ice' ? ice : null, descricao: andar.description || '' });
  }
  for (const def of defensoresDo(item)) {
    const numero = Number(def.andar);
    if (!Number.isInteger(numero) || numero < 1) continue;
    const no = noEm(numero, def.ramo && RAMOS.includes(def.ramo) ? def.ramo : 'a');
    const tipo = def.tipo === 'netrunner' ? 'netrunner' : 'demonio';
    no.conteudos.push({ chave: `def:${def.id}`, tipo, dv: null, ice: null, demonio: tipo === 'demonio' ? def.modelo || 'imp' : null, ator: tipo === 'netrunner' ? def.ator || '' : null, nome: def.nome || '', descricao: def.descricao || '' });
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

// ---------------- Editor visual ----------------
// O modelo do editor: um andar por posição, com a lista de conteúdos. A volta separa o que vai para os andares
// do item do sistema (`system.floors`) e o que vai para as flags (demônios e netrunners inimigos).
export function andaresDoItem(item) {
  const arq = lerArquitetura(item);
  return Object.values(arq.nos).sort((a, b) => a.andar - b.andar || a.ramo.localeCompare(b.ramo)).map(no => ({
    andar: no.andar,
    ramo: no.ramo,
    conteudos: no.conteudos.map(c => ({ tipo: c.tipo, dv: c.dv, ice: c.ice || '', demonio: c.demonio || '', ator: c.ator || '', nome: c.nome || '', descricao: c.descricao || '' }))
  }));
}

export function itemDosAndares(andares) {
  const floors = [];
  const defensores = [];
  const ordenados = [...andares].sort((a, b) => a.andar - b.andar || a.ramo.localeCompare(b.ramo));
  for (const no of ordenados) {
    for (const c of no.conteudos) {
      if (c.tipo === 'demonio' || c.tipo === 'netrunner') {
        defensores.push({
          id: `${no.andar}${no.ramo}-${defensores.length + 1}`, tipo: c.tipo, andar: no.andar, ramo: no.ramo,
          modelo: c.tipo === 'demonio' ? c.demonio || 'imp' : '', ator: c.tipo === 'netrunner' ? c.ator || '' : '',
          nome: c.nome || '', descricao: c.descricao || ''
        });
        continue;
      }
      if (!CONTEUDO_DO_TIPO[c.tipo]) continue;
      const dv = Number(c.dv);
      floors.push({
        floor: String(no.andar), branch: no.ramo, content: CONTEUDO_DO_TIPO[c.tipo],
        dv: c.tipo === 'ice' || !dv ? 'N/A' : String(Math.max(4, Math.min(20, dv))),
        blackice: c.tipo === 'ice' ? (c.ice ? `${ICE_PREFIXO}${c.ice}` : '--') : '--',
        description: c.descricao || '', index: floors.length
      });
    }
  }
  return { floors, defensores };
}
