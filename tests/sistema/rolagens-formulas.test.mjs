// C43: integração da regra da wiki (system-rules.js:463, :549; Power, system-2077.js:156) com o cartão.
// A fórmula nativa segue o CORE 0.93, hooks/chat/add-damage-application.js:23–44. O G4 valida o Foundry real.
import assert from 'node:assert/strict';
import test from 'node:test';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';

let rolagens;
async function ambiente(tarefa) {
  const nomes = ['foundry', 'CONFIG', 'Hooks', 'ChatMessage', 'Roll', 'game', 'ui'];
  const anteriores = new Map(nomes.map(nome => [nome, Object.getOwnPropertyDescriptor(globalThis, nome)]));
  const env = { proximos: [], rolls: [], templates: [], mensagens: [], hooks: [], fontes: [], chamadasDoSuper: [], respostaDoSuper: undefined };
  class DadoBase { static MODIFIERS = {}; }
  class MensagemBase {
    constructor({ rolls = [], content = 'Cartão original', flags = {} } = {}) {
      Object.assign(this, { rolls, content, flags });
    }
    static getSpeaker({ actor }) { return { actor: actor?.id, alias: actor?.name }; }
    static async create(dados, opcoes) {
      const mensagem = { id: `mensagem-${env.mensagens.length}`, dados, opcoes };
      env.mensagens.push(mensagem);
      return mensagem;
    }
    async _preCreate(dados, opcoes, usuario) {
      env.chamadasDoSuper.push({ mensagem: this, dados, opcoes, usuario });
      return env.respostaDoSuper;
    }
    getFlag(escopo, chave) { return this.flags[escopo]?.[chave]; }
    updateSource(alteracoes) {
      env.fontes.push(alteracoes);
      for (const [chave, valor] of Object.entries(alteracoes)) {
        if (chave === 'content') this.content = valor;
        else {
          const [, escopo, nome] = chave.split('.');
          this.flags[escopo] ??= {};
          this.flags[escopo][nome] = valor;
        }
      }
    }
  }
  globalThis.foundry = {
    dice: { terms: { Die: DadoBase } },
    applications: {
      api: { DialogV2: {} },
      handlebars: { renderTemplate: async (caminho, dados) => {
        const content = `<article data-cartao="${env.templates.length}">Dano</article>`;
        env.templates.push({ caminho, dados, content });
        return content;
      } }
    }
  };
  globalThis.CONFIG = { Dice: { terms: {}, termTypes: {} }, ChatMessage: { documentClass: MensagemBase } };
  globalThis.Hooks = { on: (nome, executar) => env.hooks.push({ nome, executar }) };
  globalThis.ChatMessage = { implementation: MensagemBase };
  globalThis.game = { settings: { get: () => 'public' } };
  globalThis.ui = { notifications: { warn: () => assert.fail('não se espera aviso nestes casos') } };
  globalThis.Roll = class {
    constructor(formula) {
      assert.ok(env.proximos.length, 'existe uma rolagem determinística preparada');
      const resultados = env.proximos.shift().map(valor => typeof valor === 'number' ? { result: valor, active: true } : valor);
      const total = resultados.filter(resultado => resultado.active).reduce((soma, resultado) => soma + resultado.result, 0);
      Object.assign(this, { formula, total, dice: [{ faces: 6, total, results: resultados, options: {} }] });
      env.rolls.push(this);
    }
    async evaluate() { return this; }
  };
  env.arma = (critico, municao = null, perfil = null) => ({
    name: 'Arma C43', uuid: 'Actor.atirador.Item.arma', actor: { id: 'atirador', name: 'Atirador' },
    system: { dano: '3d6', ...(critico === undefined ? {} : { critico }) },
    municaoCarregada: municao ? { system: municao } : null, perfil2077: perfil
  });
  env.nativa = (dano = null) => ({
    formula: '2d6dmgab2cd10', total: 12,
    dice: [{ faces: 6, total: 12, results: [{ result: 6, active: true }, { result: 6, active: true }],
      options: dano ? { danoFieldbook: dano } : {} }]
  });
  try {
    // janela-rolagem.mjs resolve DialogV2 no topo: o import precisa ocorrer após instalar o ambiente.
    rolagens ??= await import('../../foundry-sistema/scripts/rolagens.mjs');
    return await tarefa(env);
  } finally {
    for (const [nome, descritor] of anteriores) {
      if (descritor) Object.defineProperty(globalThis, nome, descritor);
      else delete globalThis[nome];
    }
  }
}

test('C43 integração: dano da arma em três seis recusa dois ativos e publica bônus 9 com três', async () => ambiente(async e => {
  const arma = e.arma({ seis: 3, bonus: 9 });
  e.proximos.push([6, 6, { result: 6, active: false }], [6, 6, 6]);
  const sem = await rolagens.rolarDano(arma, { falar: true, paraAplicar: true, modo: 'gm' });
  assert.equal(sem.total, 12);
  assert.equal(sem.critico, false);
  assert.equal(sem.bonus, 0);
  assert.deepEqual(sem.resultados, [6, 6], 'o dado descartado não completa o crítico');
  assert.deepEqual(e.templates[0].dados.botoes.map(botao => botao.acao), ['aplicarDano']);
  const com = await rolagens.rolarDano(arma, { falar: true, paraAplicar: true, modo: 'gm' });
  assert.equal(com.total, 18);
  assert.equal(com.critico, true);
  assert.equal(com.bonus, 9);
  assert.equal(e.templates[1].caminho, `systems/${SISTEMA}/templates/chat/dano.hbs`);
  assert.equal(e.templates[1].dados.total, 18);
  assert.equal(e.templates[1].dados.bonus, 9);
  assert.equal(e.templates[1].dados.critico, true);
  assert.deepEqual(e.templates[1].dados.botoes.map(botao => botao.acao), ['aplicarDano', 'rolarLesao']);
  const mensagem = e.mensagens[1];
  assert.equal(com.mensagem, mensagem);
  assert.equal(mensagem.dados.rolls[0], com.roll);
  assert.equal(mensagem.dados.content, e.templates[1].content);
  assert.deepEqual(mensagem.opcoes, { messageMode: 'gm' });
  assert.deepEqual(mensagem.dados.speaker, { actor: 'atirador', alias: 'Atirador' });
  assert.deepEqual(mensagem.dados.flags[SISTEMA].danoDeArma,
    { arma: arma.uuid, total: 18, bonus: 9, critico: true, formula: '3d6' });
}));

test('C43 integração: munição carregada em dois seis e bônus 7 substitui a arma em três seis', async () => ambiente(async e => {
  const arma = e.arma({ seis: 3, bonus: 9 }, { critico: { substitui: true, seis: 2, bonus: 7 } });
  const antes = structuredClone(arma);
  e.proximos.push([6, 6], [6, 6]);
  const com = await rolagens.rolarDano(arma, { falar: true, paraAplicar: true });
  assert.equal(com.critico, true);
  assert.equal(com.bonus, 7);
  assert.equal(e.templates[0].dados.bonus, 7);
  assert.equal(e.mensagens[0].dados.flags[SISTEMA].danoDeArma.bonus, 7);
  assert.deepEqual(arma, antes, 'resolver o crítico não grava nos itens');
  arma.municaoCarregada.system.critico.substitui = false;
  const sem = await rolagens.rolarDano(arma);
  assert.equal(sem.critico, false);
  assert.equal(sem.bonus, 0);
}));

test('C43 integração: armas sem campos novos preservam bônus 5 e Power 10', async () => ambiente(async e => {
  for (const [critico, perfil, bonus] of [[undefined, null, 5], [undefined, { classe: 'power' }, 10], [{ seis: 2, bonus: null }, { classe: 'power' }, 10]]) {
    e.proximos.push([6, 6]);
    const resultado = await rolagens.rolarDano(e.arma(critico, null, perfil), { falar: true, paraAplicar: true });
    assert.equal(resultado.critico, true);
    assert.equal(resultado.bonus, bonus);
    assert.equal(e.templates.at(-1).dados.bonus, bonus);
    assert.equal(e.mensagens.at(-1).dados.flags[SISTEMA].danoDeArma.bonus, bonus);
  }
}));

test('C43 integração: zero seis impede crítico, bônus zero conserva a lesão no cartão', async () => ambiente(async e => {
  e.proximos.push([6, 6, 6], [6, 6, 6]);
  const sem = await rolagens.rolarDano(e.arma({ seis: 0, bonus: 9 }), { falar: true, paraAplicar: true });
  assert.equal(sem.critico, false);
  assert.equal(sem.bonus, 0);
  assert.deepEqual(e.templates[0].dados.botoes.map(botao => botao.acao), ['aplicarDano']);
  const com = await rolagens.rolarDano(e.arma({ seis: 2, bonus: 0 }), { falar: true, paraAplicar: true });
  assert.equal(com.critico, true);
  assert.equal(com.bonus, 0);
  assert.equal(e.templates[1].dados.bonus, 0);
  assert.deepEqual(e.templates[1].dados.botoes.map(botao => botao.acao), ['aplicarDano', 'rolarLesao']);
  assert.equal(e.mensagens[1].dados.flags[SISTEMA].danoDeArma.critico, true);
  assert.equal(e.mensagens[1].dados.flags[SISTEMA].danoDeArma.bonus, 0);
}));

test('C43 integração: marcadores antigos no dano são retirados antes do Roll, prevalecendo os campos da arma', async () => ambiente(async e => {
  const arma = e.arma({ seis: 3, bonus: 9 });
  arma.system.dano = '3d6dmgab2cd10red';
  e.proximos.push([6, 6], [6, 6]);
  const armazenado = await rolagens.rolarDano(arma);
  assert.equal(arma.system.dano, '3d6dmgab2cd10red', 'a limpeza de execução não grava no item');
  assert.equal(armazenado.roll.formula, '3d6');
  assert.equal(armazenado.formula, '3d6');
  assert.equal(armazenado.critico, false);
  const avulso = await rolagens.rolarDano(arma, { formula: '3d6kh2dmg5ab0cd10red + 2' });
  assert.equal(avulso.roll.formula, '3d6kh2 + 2');
  assert.equal(avulso.formula, '3d6kh2 + 2');
  assert.equal(avulso.critico, false);
}));

test('C43 integração: borracha mantém o bônus anterior, bloqueia a lesão e registra o veto no cartão', async () => ambiente(async e => {
  const arma = e.arma(undefined, { efeito: 'rubber' });
  e.proximos.push([6, 6]);
  const resultado = await rolagens.rolarDano(arma, { falar: true, paraAplicar: true });
  assert.equal(resultado.critico, true, 'o cálculo anterior da borracha é preservado');
  assert.equal(resultado.bonus, 5);
  assert.equal(e.templates[0].dados.semLesao, true);
  assert.deepEqual(e.templates[0].dados.botoes.map(botao => botao.acao), ['aplicarDano']);
  assert.equal(e.mensagens[0].dados.flags[SISTEMA].danoDeArma.semLesao, true);
}));

test('C43 integração: mensagem dmg cria o cartão e a flag preservando o Roll, os demais dados e a chamada do Foundry', async () => ambiente(async e => {
  rolagens.registrarCritico();
  const dano = Object.freeze({ quantidade: 2, comparacao: '>=', limiar: 6, critico: true, bonus: 10, ablacao: 2 });
  const roll = e.nativa(dano), outro = e.nativa();
  const originais = [outro, roll];
  const mensagem = new globalThis.CONFIG.ChatMessage.documentClass({ rolls: originais, flags: { [SISTEMA]: { outra: 'preservada' } } });
  const dados = { content: 'Cartão original', rolls: originais }, opcoes = { messageMode: 'blind', exemplo: 1 }, usuario = { id: 'autor' };
  await mensagem._preCreate(dados, opcoes, usuario);
  assert.equal(e.chamadasDoSuper.length, 1);
  assert.equal(e.chamadasDoSuper[0].mensagem, mensagem);
  assert.equal(e.chamadasDoSuper[0].dados, dados);
  assert.equal(e.chamadasDoSuper[0].opcoes, opcoes);
  assert.equal(e.chamadasDoSuper[0].usuario, usuario);
  assert.equal(mensagem.rolls, originais);
  assert.equal(mensagem.rolls[0], outro);
  assert.equal(mensagem.rolls[1], roll);
  assert.equal(roll.dice[0].options.danoFieldbook, dano);
  assert.equal(mensagem.content, e.templates[0].content);
  assert.equal(mensagem.flags[SISTEMA].outra, 'preservada');
  assert.deepEqual(mensagem.flags[SISTEMA].danoDeFormula,
    { total: 12, bonus: 10, critico: true, ablacao: 2, formula: '2d6dmgab2cd10' });
  assert.equal(e.templates[0].dados.total, 12);
  assert.equal(e.templates[0].dados.bonus, 10);
  assert.equal(e.templates[0].dados.critico, true);
  assert.deepEqual(e.templates[0].dados.botoes.map(botao => botao.acao), ['aplicarDano', 'rolarLesao']);
  assert.deepEqual(opcoes, { messageMode: 'blind', exemplo: 1 });
  assert.equal(e.fontes.length, 1);
}));

test('C43 integração: recusa do _preCreate original cancela antes de renderizar ou alterar a mensagem dmg', async () => ambiente(async e => {
  rolagens.registrarCritico();
  e.respostaDoSuper = false;
  const mensagem = new globalThis.CONFIG.ChatMessage.documentClass({ rolls: [e.nativa({ critico: true, bonus: 10, ablacao: 2 })] });
  assert.equal(await mensagem._preCreate({}, { messageMode: 'gm' }, { id: 'autor' }), false);
  assert.equal(e.chamadasDoSuper.length, 1);
  assert.equal(mensagem.content, 'Cartão original');
  assert.deepEqual(mensagem.flags, {});
  assert.deepEqual(e.templates, []);
  assert.deepEqual(e.fontes, []);
}));

test('C43 integração: rolagem sem dmg e cartões de dano existentes conservam conteúdo e flags', async () => ambiente(async e => {
  rolagens.registrarCritico();
  for (const [dano, flags] of [
    [null, {}],
    [{ critico: true, bonus: 10, ablacao: 2 }, { [SISTEMA]: { danoDeArma: { total: 12, bonus: 5 } } }],
    [{ critico: true, bonus: 10, ablacao: 2 }, { [SISTEMA]: { danoDeFormula: { total: 12, bonus: 5 } } }]
  ]) {
    const antes = structuredClone(flags), roll = e.nativa(dano);
    const mensagem = new globalThis.CONFIG.ChatMessage.documentClass({ rolls: [roll], flags });
    await mensagem._preCreate({}, {}, {});
    assert.equal(mensagem.rolls[0], roll);
    assert.equal(mensagem.content, 'Cartão original');
    assert.deepEqual(mensagem.flags, antes);
  }
  assert.equal(e.chamadasDoSuper.length, 3);
  assert.deepEqual(e.templates, []);
  assert.deepEqual(e.fontes, []);
}));
