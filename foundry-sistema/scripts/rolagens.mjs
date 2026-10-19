// Rolagens: o crítico do d10, os testes (atributo + perícia + 1d10) e o dano, com os cartões do chat.
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { perguntarModificador } from './janela-rolagem.mjs';
import { bonusDoCritico, danoCritico, expressaoDoDano, sorteParaGastar } from './regras.mjs';

const renderizar = (arquivo, dados) => foundry.applications.handlebars.renderTemplate(caminho(`templates/chat/${arquivo}`), dados);

// O crítico do d10 do RED (p. 130): um 10 natural soma mais um d10; um 1 natural tira um d10. Uma vez só, sem cadeia.
// Fica no Die do core como o modificador "crit" (1d10crit): a rolagem continua um Roll nativo (o chat, o Dice So Nice
// e o histórico entendem) e o total desconta o dado do 1 pelo `count` negativo, como o core faz no "sf".
export function registrarCritico() {
  foundry.dice.terms.Die.MODIFIERS.crit = async function critico() {
    const primeiro = this.results.find(resultado => resultado.active);
    if (!primeiro) return;
    if (primeiro.result === this.faces) {
      primeiro.exploded = true;
      await this.roll();
    } else if (primeiro.result === 1) {
      const indice = this.results.length;
      await this.roll();
      const extra = this.results[indice];
      extra.count = -extra.result;
      extra.failure = true;
    }
  };
}

// Sucesso crítico, falha crítica ou nada, pelo primeiro d10 da rolagem.
export function criticoDo(roll) {
  const d10 = roll.dice.find(dado => dado.faces === 10);
  const natural = d10?.results[0]?.result;
  return natural === 10 ? 'sucesso' : natural === 1 ? 'falha' : null;
}

// Um teste do RED: 1d10 (com crítico) + as partes fixas (atributo, perícia, bônus, penalidade).
// partes: [{ rotulo, valor }]; as de valor 0 não entram. modo: o messageMode do Foundry 14 ("public", "gm"...).
// semFalhaCritica: o 1 natural não tira um d10 (Recuperação de Falhas do Solo, nos ataques); o 10 ainda soma (o "xo"
// do core: explode uma vez).
// A Sorte entra no teste, +1 por ponto, e sai da Sorte do ator (RED p. 130): a escolhida na janela de rolagem (sorte) ou,
// sem a janela, a que ele preparou na ficha. falante: o nome no cartão de quem não é ator (o Black ICE e o demônio de uma
// arquitetura da NET); sem ele, fala o ator. categoria: o tipo no cartão (ataque, defesa, net); sem ela, é da NET o teste
// de quem não é ator e o da Interface.
export async function testar(ator, { rotulo, partes = [], modo, falar = true, sabor = '', dados = {}, semFalhaCritica = false, sorte: escolhida, falante = '', categoria = '' }) {
  const sorte = escolhida === undefined ? (ator?.sortePreparada ?? 0) : sorteParaGastar(escolhida, ator?.system.sorte.value);
  const usadas = [...partes, ...(sorte ? [{ rotulo: 'Sorte', valor: sorte }] : [])].filter(parte => Number(parte.valor));
  const formula = [semFalhaCritica ? '1d10xo' : '1d10crit', ...usadas.map(parte => `${parte.valor < 0 ? '-' : '+'} ${Math.abs(parte.valor)}`)].join(' ');
  const roll = await new Roll(formula).evaluate();
  const critico = semFalhaCritica && criticoDo(roll) === 'falha' ? null : criticoDo(roll);
  const resultado = { roll, total: roll.total, critico, natural: roll.dice[0].results[0].result, sorte };
  if (ator && (sorte || escolhida !== undefined)) await ator.gastarSorte(sorte);
  if (!falar) return resultado;
  const tipo = categoria || (falante || usadas.some(parte => parte.rotulo === 'Interface') ? 'net' : '');
  const content = await renderizar('teste.hbs', { rotulo, sabor, partes: usadas, total: roll.total, critico, categoria: tipo, dados: dadosDoCartao(roll, { critico: !semFalhaCritica || critico === 'sucesso' }) });
  resultado.mensagem = await ChatMessage.implementation.create({
    speaker: falante ? { alias: falante } : ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: [roll],
    flags: { [SISTEMA]: { teste: { rotulo, total: roll.total, critico, ...dados } } }
  }, { messageMode: modo });
  return resultado;
}

// O dano de uma arma (p. 187): a fórmula da arma (ou outra: 2d6 do autofogo, 3d6 do cartucho), vezes o multiplicador do
// autofogo (regras.expressaoDoDano). Dois ou mais 6 nos dados é crítico (+5 direto no HP, 10 na arma Power de 2077, e
// Lesão Crítica). Com a janela
// (perguntar), o modificador do mestre; fechada, null. paraAplicar: o dano rolado à parte (o botão "Dano" da ficha), com
// os botões do mestre no cartão (combate.aplicarDanoDoCartao e rolarLesaoDoCartao); o do fluxo do ataque, não.
export async function rolarDano(arma, { falar = false, modo, formula = null, multiplicador = 1, perguntar = false, aoAbrir = null, paraAplicar = false } = {}) {
  // A Briga e as Artes Marciais rolam o dano pelo BODY do dono (o C10; ItemCPR.danoDaArma).
  const base = formula || (arma.danoDaArma ?? arma.system.dano) || '0';
  let modificador = 0;
  if (perguntar) {
    const linhas = [`${arma.name}: ${base}${multiplicador > 1 ? ` × ${multiplicador} (autofogo)` : ''}`];
    const escolha = await perguntarModificador({ titulo: `Dano: ${arma.name}`, linhas, aoAbrir });
    if (!escolha) return null;
    modificador = escolha.modificador;
  }
  const expressao = expressaoDoDano(base, { multiplicador, modificador });
  const roll = await new Roll(expressao).evaluate();
  const resultados = roll.dice.flatMap(dado => dado.results.filter(r => r.active).map(r => r.result));
  const critico = danoCritico(resultados);
  const resultado = { roll, total: roll.total, critico, bonus: critico ? bonusDoCritico(arma.perfil2077) : 0, resultados, formula: expressao };
  if (falar) {
    const botoes = paraAplicar ? [{ acao: 'aplicarDano', rotulo: 'Aplicar dano' }, ...(critico ? [{ acao: 'rolarLesao', rotulo: 'Rolar a lesão' }] : [])] : [];
    const content = await renderizar('dano.hbs', { rotulo: `Dano: ${arma.name}${multiplicador > 1 ? ` (×${multiplicador})` : ''}`, total: roll.total, critico, botoes, dados: dadosDoCartao(roll, { seis: critico, multiplicador }) });
    const flags = paraAplicar ? { [SISTEMA]: { danoDeArma: { arma: arma.uuid, total: roll.total, bonus: resultado.bonus, critico, formula: expressao } } } : {};
    resultado.mensagem = await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: arma.actor }), content, rolls: [roll], flags }, { messageMode: modo });
  }
  return resultado;
}
