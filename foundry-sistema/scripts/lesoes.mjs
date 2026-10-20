// Lesão Crítica (p. 187): 2d6 na tabela do corpo (ou da cabeça, no tiro mirado na cabeça), sem repetir uma lesão que
// o alvo já tem; o item entra na ficha com os efeitos (Perna quebrada: −4 MOVE) e o cartão sai no chat.
import { itemDoCatalogo } from './catalogo.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { TABELAS_LESAO } from './gerado.mjs';
import { lesaoNaTabela } from './regras.mjs';

export const PERNA_QUEBRADA = 'core_critical-injuries-body:broken-leg';

// id: uma lesão certa (a Perna quebrada do tiro na perna). naFicha: false só anuncia.
export async function lesaoCritica(ator, { cabeca = false, id = null, naFicha = true, falar = true, excluir = [] } = {}) {
  const tem = new Set(ator.items.filter(item => item.type === 'lesao').map(item => item.getFlag(SISTEMA, 'catalogo')));
  let escolhido = id;
  let roll = null;
  if (!escolhido) {
    const faixas = TABELAS_LESAO[cabeca ? 'cabeca' : 'corpo'];
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      roll = await new Roll('2d6').evaluate();
      escolhido = lesaoNaTabela(faixas, roll.total);
      if (!tem.has(escolhido) && !excluir.includes(escolhido)) break;
    }
  }
  const dados = escolhido && !excluir.includes(escolhido) && await itemDoCatalogo(escolhido);
  if (!dados) return null;
  const repetida = tem.has(escolhido);
  const [item] = naFicha && !repetida ? await ator.createEmbeddedDocuments('Item', [dados]) : [null];
  if (falar) {
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/lesao.hbs'), {
      alvo: ator.name, nome: dados.name, descricao: dados.system.descricao, cabeca, repetida, naFicha, dados: roll ? dadosDoCartao(roll, { critico: false }) : ''
    });
    await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: roll ? [roll] : [], flags: { [SISTEMA]: { lesao: { id: escolhido, nome: dados.name } } } });
  }
  return { id: escolhido, nome: dados.name, item, roll };
}

// Duas lesões para escolher (o Monowire, do Kit: "quem atacou rola duas vezes na tabela e escolhe a que a vítima sofre";
// o C11, parte 2b): as duas rolagens vão num cartão, com um botão do mestre em cada (ele aplica a que quem atacou
// escolher, como o "Rolar a lesão"). Se as duas derem a mesma, fica uma. Devolve as lesões roladas.
const cartaoDaEscolha = dados => foundry.applications.handlebars.renderTemplate(caminho('templates/chat/lesao-escolha.hbs'), dados);
export async function escolhaDeLesao(ator, { cabeca = false, naFicha = true, atacante = '', arma = '' } = {}) {
  const roladas = [];
  for (let vez = 0; vez < 2; vez++) {
    const lesao = await lesaoCritica(ator, { cabeca, naFicha: false, falar: false });
    if (lesao) roladas.push(lesao);
  }
  const opcoes = [...new Map(roladas.map(lesao => [lesao.id, { id: lesao.id, nome: lesao.nome }])).values()];
  if (!opcoes.length) return [];
  const dados = { alvo: ator.uuid, nomeDoAlvo: ator.name, cabeca, naFicha, atacante, arma, opcoes, escolhida: '' };
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content: await cartaoDaEscolha(dados),
    rolls: roladas.map(lesao => lesao.roll).filter(Boolean), flags: { [SISTEMA]: { escolhaDeLesao: dados } }
  });
  return opcoes;
}

// O botão do mestre no cartão das duas lesões: a escolhida entra (pela configuração "Lesão crítica"), e o cartão diz qual.
export async function escolherLesao(mensagem, id) {
  const dados = mensagem.getFlag(SISTEMA, 'escolhaDeLesao');
  if (!game.user.isGM || !dados || dados.escolhida || !dados.opcoes.some(opcao => opcao.id === id)) return null;
  const alvo = await fromUuid(dados.alvo);
  if (!alvo) return null;
  const feita = await lesaoCritica(alvo, { id, cabeca: dados.cabeca, naFicha: dados.naFicha });
  const escolhida = feita?.nome ?? dados.opcoes.find(opcao => opcao.id === id).nome;
  await mensagem.update({ content: await cartaoDaEscolha({ ...dados, escolhida }), [`flags.${SISTEMA}.escolhaDeLesao.escolhida`]: escolhida });
  return feita;
}
