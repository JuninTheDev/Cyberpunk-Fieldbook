// Lesão Crítica (p. 187): 2d6 na tabela escolhida, sem repetir uma lesão que o alvo já tem; o item entra na ficha com
// os efeitos (Perna quebrada: −4 MOVE) e o cartão sai no chat. No ataque, cabeça só no tiro mirado na cabeça.
// A tabela não altera HP: como o _rollCriticalInjury do CORE, só acrescenta a lesão. O ataque já aplica o dano bônus.
import { itemDoCatalogo } from './catalogo.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { TABELAS_LESAO } from './gerado.mjs';
import { MAXIMO_ROLAGENS_LESAO, sortearLesao } from './regras-lesoes.mjs';

export const PERNA_QUEBRADA = 'core_critical-injuries-body:broken-leg';

const filasDasLesoes = new WeakMap();
const podeReceberLesao = ator => ator?.isOwner && ['personagem', 'capanga'].includes(ator.type);
const lesoesDoAtor = ator => new Set(ator.items.filter(item => item.type === 'lesao').map(item => item.getFlag(SISTEMA, 'catalogo')));

// id: uma lesão certa (a Perna quebrada do tiro na perna). naFicha: false só anuncia.
// No mesmo cliente, dois cliques esperam a criação anterior; o próximo lê as lesões que realmente ficaram na ficha.
export async function lesaoCritica(ator, opcoes = {}) {
  if (!podeReceberLesao(ator)) return null;
  const anterior = filasDasLesoes.get(ator) ?? Promise.resolve();
  let liberar;
  const atual = new Promise(resolve => { liberar = resolve; });
  filasDasLesoes.set(ator, atual);
  await anterior;
  try {
    return await criarLesao(ator, opcoes);
  } finally {
    liberar();
    if (filasDasLesoes.get(ator) === atual) filasDasLesoes.delete(ator);
  }
}

async function criarLesao(ator, { cabeca = false, id = null, naFicha = true, falar = true, excluir = [] } = {}) {
  if (!podeReceberLesao(ator)) return null;
  const tem = lesoesDoAtor(ator);
  let escolhido = id;
  let roll = null;
  if (!escolhido) {
    const faixas = TABELAS_LESAO[cabeca ? 'cabeca' : 'corpo'];
    const sorteio = await sortearLesao({ faixas, tem, excluir, rolar: () => new Roll('2d6').evaluate() });
    if (sorteio.motivo) {
      ui.notifications.warn(sorteio.motivo === 'esgotada'
        ? `${ator.name}: não há lesão disponível na tabela ${cabeca ? 'da cabeça' : 'do corpo'}.`
        : `${ator.name}: nenhuma lesão disponível saiu em ${MAXIMO_ROLAGENS_LESAO} tentativas. Role novamente.`);
      return null;
    }
    escolhido = sorteio.id;
    roll = sorteio.roll;
  }
  const dados = escolhido && !excluir.includes(escolhido) && await itemDoCatalogo(escolhido);
  if (!dados || dados.type !== 'lesao' || !podeReceberLesao(ator)) return null;
  const repetida = lesoesDoAtor(ator).has(escolhido);
  if (!id && repetida) {
    ui.notifications.warn(`${ator.name} passou a ter ${dados.name} durante a rolagem. Role novamente.`);
    return null;
  }
  const [item] = naFicha && !repetida ? await ator.createEmbeddedDocuments('Item', [dados]) : [null];
  if (naFicha && !repetida && !item) {
    ui.notifications.warn(`Não consegui acrescentar ${dados.name} à ficha de ${ator.name}.`);
    return null;
  }
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
  if (!feita) return null;
  const escolhida = feita?.nome ?? dados.opcoes.find(opcao => opcao.id === id).nome;
  await mensagem.update({ content: await cartaoDaEscolha({ ...dados, escolhida }), [`flags.${SISTEMA}.escolhaDeLesao.escolhida`]: escolhida });
  return feita;
}
