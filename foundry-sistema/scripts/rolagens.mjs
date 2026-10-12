// Rolagens: o crítico do d10, os testes (atributo + perícia + 1d10) e o dano, com os cartões do chat.
import { caminho, SISTEMA } from './config.mjs';
import { BONUS_CRITICO, danoCritico } from './regras.mjs';

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
// A Sorte que o ator preparou na ficha entra no teste, +1 por ponto, e sai da Sorte dele (RED p. 130).
export async function testar(ator, { rotulo, partes = [], modo, falar = true, sabor = '', dados = {}, semFalhaCritica = false }) {
  const sorte = ator?.sortePreparada ?? 0;
  const usadas = [...partes, ...(sorte ? [{ rotulo: 'Sorte', valor: sorte }] : [])].filter(parte => Number(parte.valor));
  const formula = [semFalhaCritica ? '1d10xo' : '1d10crit', ...usadas.map(parte => `${parte.valor < 0 ? '-' : '+'} ${Math.abs(parte.valor)}`)].join(' ');
  const roll = await new Roll(formula).evaluate();
  const critico = semFalhaCritica && criticoDo(roll) === 'falha' ? null : criticoDo(roll);
  const resultado = { roll, total: roll.total, critico, natural: roll.dice[0].results[0].result, sorte };
  if (sorte) await ator.gastarSortePreparada();
  if (!falar) return resultado;
  const content = await renderizar('teste.hbs', { rotulo, sabor, partes: usadas, total: roll.total, critico, dados: await roll.render() });
  resultado.mensagem = await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: [roll],
    flags: { [SISTEMA]: { teste: { rotulo, total: roll.total, critico, ...dados } } }
  }, { messageMode: modo });
  return resultado;
}

// O dano de uma arma (p. 187): a fórmula da arma (ou outra: 2d6 do autofogo, 3d6 do cartucho), vezes o multiplicador do
// autofogo. Dois ou mais 6 nos dados é crítico (+5 direto no HP e Lesão Crítica).
export async function rolarDano(arma, { falar = false, modo, formula = null, multiplicador = 1 } = {}) {
  const base = formula || arma.system.dano || '0';
  // "2d6 * 3"; uma fórmula com mais termos vai entre parênteses ("(3d6 + 2) * 3").
  const expressao = multiplicador > 1 ? `${/^\d+d\d+$/.test(base) ? base : `(${base})`} * ${multiplicador}` : base;
  const roll = await new Roll(expressao).evaluate();
  const resultados = roll.dice.flatMap(dado => dado.results.filter(r => r.active).map(r => r.result));
  const critico = danoCritico(resultados);
  const resultado = { roll, total: roll.total, critico, bonus: critico ? BONUS_CRITICO : 0, resultados, formula: expressao };
  if (falar) {
    const content = await renderizar('dano.hbs', { rotulo: `Dano: ${arma.name}${multiplicador > 1 ? ` (×${multiplicador})` : ''}`, total: roll.total, critico, dados: await roll.render() });
    resultado.mensagem = await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: arma.actor }), content, rolls: [roll] }, { messageMode: modo });
  }
  return resultado;
}
