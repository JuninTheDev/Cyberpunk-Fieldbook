// Rolagens: o crítico do d10, os testes (atributo + perícia + 1d10), o /red no chat e o dano, com os cartões do chat.
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { registrarDadoRed } from './dado-red.mjs';
import { perguntarModificador } from './janela-rolagem.mjs';
import { modoDaMesa } from './mesa.mjs';
import { expressaoDoDano, lerComandoRed, MUNICAO_SEM_DANO, sorteParaGastar } from './regras.mjs';
import { danoCriticoConfigurado, resolverCriticoDaArma, retirarMarcadoresDano } from './regras-formulas.mjs';

const renderizar = (arquivo, dados) => foundry.applications.handlebars.renderTemplate(caminho(`templates/chat/${arquivo}`), dados);

// O crítico do d10 do RED (p. 130): um 10 natural soma mais um d10; um 1 natural tira um d10. Uma vez só, sem cadeia.
// O red do CORE 0.93 e o crit antigo são o mesmo modificador; o count negativo conserva o total nativo.
export function registrarCritico() {
  registrarDadoRed();
  // Um Roll.toMessage de macro e o /r do chat passam pela mesma criação nativa. O _preCreate pode aguardar
  // o template (Foundry 14, client/documents/chat-message.mjs:518–561); o hook preCreate é síncrono.
  class MensagemRED extends ChatMessage.implementation {
    async _preCreate(dados, opcoes, usuario) {
      if (await super._preCreate(dados, opcoes, usuario) === false) return false;
      if (this.getFlag(SISTEMA, 'danoDeArma') || this.getFlag(SISTEMA, 'danoDeFormula')) return;
      const roll = this.rolls.find(r => r.dice.some(d => d.options.danoFieldbook));
      const dano = roll?.dice.find(d => d.options.danoFieldbook)?.options.danoFieldbook;
      if (!dano) return;
      const content = await cartaoDeDano(roll, { rotulo: 'Dano', ...dano, paraAplicar: true });
      this.updateSource({ content, [`flags.${SISTEMA}.danoDeFormula`]: { total: roll.total, bonus: dano.bonus, critico: dano.critico, ablacao: dano.ablacao, formula: roll.formula } });
    }
  }
  CONFIG.ChatMessage.documentClass = MensagemRED;
  Hooks.on('chatMessage', (_, mensagem) => {
    if (!lerComandoRed(mensagem)) return true;
    executarComandoRed(mensagem);
    return false;
  });
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
export async function testar(ator, { rotulo, partes = [], modo, falar = true, sabor = '', dados = {}, dado = '1d10', semFalhaCritica = false, sorte: escolhida, falante = '', categoria = '' }) {
  const sorte = escolhida === undefined ? (ator?.sortePreparada ?? 0) : sorteParaGastar(escolhida, ator?.system.sorte.value);
  const usadas = [...partes, ...(sorte ? [{ rotulo: 'Sorte', valor: sorte }] : [])].filter(parte => Number(parte.valor));
  const formula = [`${dado}${semFalhaCritica ? 'xo' : 'crit'}`, ...usadas.map(parte => `${parte.valor < 0 ? '-' : '+'} ${Math.abs(parte.valor)}`)].join(' ');
  const roll = await new Roll(formula).evaluate();
  const critico = semFalhaCritica && criticoDo(roll) === 'falha' ? null : criticoDo(roll);
  const resultado = { roll, total: roll.total, critico, natural: roll.dice[0].results[0].result, sorte };
  if (ator && (sorte || escolhida !== undefined)) await ator.gastarSorte(sorte);
  if (!falar) return resultado;
  const tipo = categoria || (falante || usadas.some(parte => parte.rotulo === 'Interface') ? 'net' : '');
  const content = await renderizar('teste.hbs', { rotulo, sabor, dado: dado !== '1d10' ? dado : null, partes: usadas, total: roll.total, critico, categoria: tipo, dados: dadosDoCartao(roll, { critico: !semFalhaCritica || critico === 'sucesso' }) });
  resultado.mensagem = await ChatMessage.implementation.create({
    speaker: falante ? { alias: falante } : ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: [roll],
    flags: { [SISTEMA]: { teste: { rotulo, total: roll.total, critico, ...dados } } }
  }, { messageMode: modo });
  return resultado;
}

// O comando /red no chat (CORE parse-red-command.js e CPRChat.HandleCPRCommand), pelo tipo do dado: o d10 é um teste do RED
// (o cartão de teste, com o crítico); o d6, um dano (o cartão de dano, com os dois 6 do crítico e a ablação); outro dado
// rola a soma, sem crítico (o "generic" do CORE). O cartão sai no modo do seletor do chat, como o RenderRollCard do CORE
// (cpr-chat.js:235; o C33).
export async function executarComandoRed(mensagem, ator = null) {
  const comando = lerComandoRed(mensagem);
  if (!comando) return null;
  if (comando.tipo === 'teste') return testar(ator, { rotulo: 'Rolagem', partes: comando.partes, sabor: comando.descricao, sorte: 0, dado: comando.dados, modo: modoDaMesa() });
  const roll = await new Roll([`${comando.dados}${comando.tipo === 'dano' ? `dmgab${comando.ablacao}` : ''}`, ...comando.partes.map(parte => `${parte.valor < 0 ? '-' : '+'} ${Math.abs(parte.valor)}`)].join(' ')).evaluate();
  const dano = roll.dice.find(dado => dado.options.danoFieldbook)?.options.danoFieldbook;
  const critico = dano?.critico ?? false;
  const titulo = [comando.tipo === 'dano' ? 'Dano' : 'Rolagem', comando.descricao].filter(Boolean).join(': ');
  const content = comando.tipo === 'dano'
    ? await cartaoDeDano(roll, { rotulo: `${titulo} (ablação ${comando.ablacao})`, ...dano, comparacao: '=', paraAplicar: true })
    : await renderizar('teste.hbs', { rotulo: 'Rolagem', sabor: comando.descricao, dado: comando.dados, partes: comando.partes, total: roll.total, critico: null, dados: dadosDoCartao(roll, { critico: false }) });
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: [roll],
    flags: { [SISTEMA]: { red: { tipo: comando.tipo, dados: comando.dados, total: roll.total, critico, ablacao: comando.ablacao, descricao: comando.descricao },
      ...(dano ? { danoDeFormula: { total: roll.total, bonus: dano.bonus, critico, ablacao: dano.ablacao, formula: roll.formula } } : {}) } }
  }, { messageMode: modoDaMesa() });
}

// O mesmo cartão no dano da ficha, no /red e nas fórmulas dmg (CORE 0.93, hooks/chat/add-damage-application.js:23–44).
async function cartaoDeDano(roll, { rotulo, critico, bonus = 0, quantidade = 2, comparacao = '=', limiar = 6, paraAplicar = false, multiplicador = 1, semLesao = false }) {
  const botoes = paraAplicar ? [{ acao: 'aplicarDano', rotulo: 'Aplicar dano' }, ...(critico && !semLesao ? [{ acao: 'rolarLesao', rotulo: 'Rolar a lesão' }] : [])] : [];
  const regraDoCritico = quantidade === 2 && comparacao === '=' && limiar === 6 ? 'dois ou mais 6' : `${quantidade} ou mais dados ${comparacao} ${limiar}`;
  return renderizar('dano.hbs', { rotulo, total: roll.total, critico, bonus, regraDoCritico, semLesao, botoes, dados: dadosDoCartao(roll, { seis: critico, multiplicador }) });
}

// O dano de uma arma (p. 187): a fórmula da arma (ou outra: 2d6 do autofogo, 3d6 do cartucho), vezes o multiplicador do
// autofogo (regras.expressaoDoDano). Dois ou mais 6 nos dados é crítico (+5 direto no HP, 10 na arma Power de 2077, e
// Lesão Crítica). Com a janela
// (perguntar), o modificador do mestre; fechada, null. paraAplicar: o dano rolado à parte (o botão "Dano" da ficha), com
// os botões do mestre no cartão (combate.aplicarDanoDoCartao e rolarLesaoDoCartao); o do fluxo do ataque, não.
export async function rolarDano(arma, { falar = false, modo, formula = null, multiplicador = 1, perguntar = false, aoAbrir = null, paraAplicar = false, arremesso = false, modoDoArremesso = null } = {}) {
  // A Briga e as Artes Marciais rolam o dano pelo BODY do dono (o C10; ItemCPR.danoDaArma).
  const base = retirarMarcadoresDano(formula || (arma.danoDaArma ?? arma.system.dano) || '0');
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
  const regra = resolverCriticoDaArma(arma.system, arma.municaoCarregada?.system, arma.perfil2077);
  // Wiki, system-catalog.js:197: borracha não causa lesão. O C14 já a impede por efeito da munição;
  // não converta isso em seis:0, que mudaria o bônus antigo (tests/cenarios/v14.js, passo da borracha).
  const efeito = arma.municaoCarregada?.system.efeito;
  const semLesao = efeito === 'rubber' || Boolean(MUNICAO_SEM_DANO[efeito]);
  const { critico, bonus } = danoCriticoConfigurado(resultados, regra);
  const resultado = { roll, total: roll.total, critico, bonus, resultados, formula: expressao };
  if (falar) {
    const content = await cartaoDeDano(roll, { rotulo: `Dano: ${arma.name}${arremesso ? ' (arremesso)' : ''}${multiplicador > 1 ? ` (×${multiplicador})` : ''}`, ...regra, bonus, critico, paraAplicar, multiplicador, semLesao });
    const flags = paraAplicar ? { [SISTEMA]: { danoDeArma: { arma: arma.uuid, total: roll.total, bonus: resultado.bonus, critico, formula: expressao, ...(semLesao ? { semLesao: true } : {}), ...(arremesso ? { arremesso: true, modoDoArremesso } : {}) } } } : {};
    resultado.mensagem = await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: arma.actor }), content, rolls: [roll], flags }, { messageMode: modo });
  }
  return resultado;
}
