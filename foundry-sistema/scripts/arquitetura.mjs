// A arquitetura da NET (RED p. 209–211; o netarch do CORE, com os demônios e os netrunners inimigos do NET Architect da
// mesa): os andares do item, uma linha por conteúdo no andar (1 a 18) e no ramo (A a H), viram os nós do mapa. O andar 1
// do ramo A sai do ponto de acesso (a entrada); um ramo novo sai do andar de cima do ramo à esquerda, como o CORE desenha
// a cena da arquitetura. Sem nada do Foundry: os testes rodam este arquivo no Node.
export const ENTRADA = 'entrada';
export const RAMOS = 'abcdefgh';
export const ANDAR_MAX = 18;
// O que pode haver num andar, com o nome da wiki ("Montando uma arquitetura").
export const TIPOS_DE_ANDAR = {
  senha: 'Senha', arquivo: 'Arquivo', controle: 'Nó de controle', ice: 'Black ICE', demonio: 'Demônio', netrunner: 'Netrunner inimigo', vazio: 'Andar vazio'
};
// Os que têm DV, o do teste da habilidade: a senha (Backdoor), o arquivo (Eye-Dee) e o nó de controle (Control).
export const COM_DV = ['senha', 'arquivo', 'controle'];
// O DV de arquitetura no RED (a wiki): 6 (básica), 8 (padrão), 10 (incomum), 12 (avançada). Sem DV nos andares, básica.
export const DV_SEM_ANDARES = 6;

// Os nós ({ id: "3b", andar, ramo, conteudos, pai }), os filhos de cada nó, o tamanho do mapa e o DV da arquitetura: o do
// item (dv > 0) ou o maior dos andares.
export function lerArquitetura({ nome = '', andares = [], dv = 0 } = {}) {
  const nos = {};
  const noEm = (numero, ramo) => {
    const id = `${numero}${ramo}`;
    return nos[id] ?? (nos[id] = { id, andar: numero, ramo, conteudos: [] });
  };
  const ordenados = andares.map((linha, indice) => ({ ...linha, indice }))
    .sort((a, b) => Number(a.andar) - Number(b.andar) || String(a.ramo || 'a').localeCompare(String(b.ramo || 'a')) || a.indice - b.indice);
  for (const linha of ordenados) {
    const numero = Number(linha.andar);
    if (!Number.isInteger(numero) || numero < 1 || numero > ANDAR_MAX) continue;
    const ramo = String(linha.ramo ?? '').length === 1 && RAMOS.includes(linha.ramo) ? linha.ramo : 'a';
    const no = noEm(numero, ramo);
    const tipo = TIPOS_DE_ANDAR[linha.tipo] ? linha.tipo : 'vazio';
    no.conteudos.push({
      chave: `${no.id}.${no.conteudos.length}`, indice: linha.indice, tipo, dv: COM_DV.includes(tipo) && Number(linha.dv) > 0 ? Number(linha.dv) : null,
      ice: tipo === 'ice' ? linha.ice || '' : null, demonio: tipo === 'demonio' ? linha.demonio || 'imp' : null, ator: tipo === 'netrunner' ? linha.ator || '' : null,
      nome: linha.nome || '', descricao: linha.descricao || ''
    });
  }
  const lista = Object.values(nos);
  for (const no of lista) no.pai = paiDe(no, nos, lista);
  const filhos = {};
  for (const no of lista) (filhos[no.pai] ??= []).push(no.id);
  for (const ids of Object.values(filhos)) ids.sort((a, b) => nos[a].ramo.localeCompare(nos[b].ramo) || nos[a].andar - nos[b].andar);
  const dvs = lista.flatMap(no => no.conteudos.map(conteudo => conteudo.dv)).filter(Boolean);
  return {
    nome, nos, filhos,
    dv: Number(dv) > 0 ? Number(dv) : dvs.length ? Math.max(...dvs) : DV_SEM_ANDARES,
    colunas: Math.max(1, ...lista.map(no => RAMOS.indexOf(no.ramo) + 1)),
    andares: Math.max(0, ...lista.map(no => no.andar))
  };
}

// O pai de um nó: o andar de cima no mesmo ramo; senão, o andar de cima do ramo à esquerda mais próximo; senão (um buraco
// na numeração), o andar mais fundo acima dele, de preferência no mesmo ramo.
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

export const filhosDe = (arq, id) => arq.filhos[id] ?? [];
export const paiDoNo = (arq, id) => (id === ENTRADA ? null : arq.nos[id]?.pai ?? null);
export const vizinhos = (arq, id) => [paiDoNo(arq, id), ...filhosDe(arq, id)].filter(Boolean);
// O andar mais fundo de um ramo (onde o Virus pode ficar).
export const ehFundo = (arq, id) => id !== ENTRADA && Boolean(arq.nos[id]) && !filhosDe(arq, id).length;

// Pathfinder (RED p. 199): revela tantos andares quanto o resultado, a partir de onde o netrunner está, descendo em
// largura; um andar com um DV maior que o resultado aparece, mas o que vem depois dele não.
export function revelarPathfinder(arq, origem, total) {
  const revelados = [];
  const fila = [...filhosDe(arq, origem)];
  while (fila.length && revelados.length < total) {
    const id = fila.shift();
    revelados.push(id);
    if (!arq.nos[id].conteudos.some(conteudo => conteudo.dv && conteudo.dv > total)) fila.push(...filhosDe(arq, id));
  }
  return revelados;
}

// As dificuldades da wiki ("Montando uma arquitetura": o DV de senha, arquivo e nó de 6, 8, 10 e 12), com a tabela de
// andares de cada uma (gerado.TABELAS_DA_NET, do CORE).
export const DIFICULDADES = { basica: 'Básica', padrao: 'Padrão', incomum: 'Incomum', avancada: 'Avançada' };

// A geração pelas tabelas (a wiki, RED p. 210–211; o _netarchGenerateFromTables do CORE): 3d6 andares; o 1d10 de novo
// enquanto der 7 ou mais, um ramo a mais a cada vez (até o H); os 2 primeiros andares pela tabela do lobby (1d6) e os
// outros pela da dificuldade (3d6), sem repetir um resultado, menos os de arquivo e de nó de controle. Os ramos entram como
// no CORE: o ramo novo começa no andar 3 (o seguinte no 4...) quando o andar passa do total dividido pelos ramos que
// faltam mais um, e nunca no último resultado. Um resultado com vários Black ICE ("Hellhound ×2, Liche") vira uma linha
// por ICE no mesmo andar; o CORE guarda só o texto. rolar(formula) devolve o total, ou a promessa dele (no Foundry, a
// rolagem; o teste fixa os dados).
export async function gerarAndares({ dificuldade, tabelas, rolar }) {
  const total = await rolar('3d6');
  let ramosAMais = 0;
  while (ramosAMais < RAMOS.length - 1 && (await rolar('1d10')) >= 7) ramosAMais += 1;
  const sortear = async (id, quantos) => {
    const tabela = tabelas[id];
    const saidos = [];
    const vistos = new Set();
    for (let tentativa = 0; saidos.length < quantos && tentativa < 1000; tentativa++) {
      const rolagem = await rolar(tabela.formula);
      const resultado = tabela.resultados.find(r => rolagem >= r.min && rolagem <= r.max);
      if (!resultado || vistos.has(rolagem)) continue;
      if (!resultado.conteudos.every(c => c.tipo === 'arquivo' || c.tipo === 'controle')) vistos.add(rolagem);
      saidos.push({ id, rolagem, resultado });
    }
    return saidos;
  };
  const resultados = [...(await sortear('lobby', 2)), ...(await sortear(dificuldade, total - 2))];
  const andares = [];
  let andar = 1;
  let inicioDoRamo = 3;
  let ramo = 0;
  let faltam = ramosAMais;
  resultados.forEach(({ id, rolagem, resultado }, indice) => {
    if (faltam > 0 && andar > inicioDoRamo && andar > total / (faltam + 1) && indice !== total - 1) {
      andar = inicioDoRamo;
      inicioDoRamo += 1;
      ramo += 1;
      faltam -= 1;
    }
    const descricao = `${id === 'lobby' ? 'Lobby' : DIFICULDADES[id]}, ${rolagem}: ${resultado.rotulo}`;
    for (const conteudo of resultado.conteudos) {
      andares.push({ andar, ramo: RAMOS[ramo], tipo: conteudo.tipo, dv: conteudo.dv ?? 0, ice: conteudo.ice ?? '', demonio: '', ator: '', nome: '', descricao });
    }
    andar += 1;
  });
  return { andares, total, ramosAMais };
}

// A linha nova da ficha: o andar seguinte ao mais fundo do ramo A (ou o 1), uma senha DV 6.
export function novaLinha(andares = []) {
  const doRamoA = andares.filter(linha => (linha.ramo || 'a') === 'a').map(linha => Number(linha.andar) || 0);
  return { andar: Math.min(ANDAR_MAX, (doRamoA.length ? Math.max(...doRamoA) : 0) + 1), ramo: 'a', tipo: 'senha', dv: DV_SEM_ANDARES, ice: '', demonio: '', ator: '', nome: '', descricao: '' };
}

// ---------------- O editor visual no mapa da ficha (o editor.mjs do NET Architect da mesa) ----------------
// A posição no mapa ("3b": o andar e o ramo), só dentro da arquitetura (andar 1 a 18, ramo A a H).
export function lerPosicao(posicao) {
  const texto = String(posicao ?? '');
  const andar = Number(texto.slice(0, -1));
  const ramo = texto.slice(-1);
  return Number.isInteger(andar) && andar >= 1 && andar <= ANDAR_MAX && RAMOS.includes(ramo) && ramo ? { andar, ramo } : null;
}
const naPosicao = (linha, { andar, ramo }) => Number(linha.andar) === andar && (linha.ramo || 'a') === ramo;

// Arrastar um andar: todas as linhas dele vão para a posição nova; em cima de outro andar, os dois trocam.
export function moverAndar(andares, de, para) {
  const origem = lerPosicao(de);
  const destino = lerPosicao(para);
  if (!origem || !destino || de === para || !andares.some(linha => naPosicao(linha, origem))) return andares;
  return andares.map(linha => (naPosicao(linha, origem) ? { ...linha, ...destino } : naPosicao(linha, destino) ? { ...linha, ...origem } : linha));
}

// O "+" de uma célula vazia: o andar novo ali, com uma senha DV 6 (como a linha nova da ficha).
export function criarAndar(andares, posicao) {
  const lugar = lerPosicao(posicao);
  if (!lugar || andares.some(linha => naPosicao(linha, lugar))) return andares;
  return [...andares, { ...novaLinha(andares), ...lugar }];
}
