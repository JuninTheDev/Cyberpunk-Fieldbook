// C41.3: wiki system-rules.js:539, p. 193. Aplicação do d10 simples; a regra pura tem seu teste separado.
// Má fama usa o valor absoluto por decisão do usuário. Nenhum recurso, modificador ou estado é escrito.
import assert from 'node:assert/strict';
import test from 'node:test';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';
import { rolarReputacao } from '../../foundry-sistema/scripts/reputacao.mjs';

const AVISO_MUDOU = 'A ficha ou a permissão mudou durante o reconhecimento. Role novamente.';
const AVISO_NIVEL = 'O reconhecimento usa Reputação inteira de −10 a 10. Confira o valor da ficha.';
const promessa = () => { let resolver; const espera = new Promise(resolve => { resolver = resolve; }); return { espera, resolver }; };
const resumo = resultado => resultado && Object.fromEntries(['ator', 'reputacao', 'nivel', 'total', 'reconhecido'].map(chave => [chave, resultado[chave]]));
const foto = ator => structuredClone(Object.fromEntries(Object.entries(ator).filter(([, valor]) => typeof valor !== 'function')));

async function ambiente(tarefa) {
  const nomes = ['game', 'fromUuid', 'ui', 'foundry', 'Roll', 'ChatMessage'];
  const anteriores = Object.fromEntries(nomes.map(nome => [nome, globalThis[nome]]));
  const env = { docs: new Map(), formulas: [], rolagens: [], renderizados: [], pedidos: [], mensagens: [], avisos: [],
    resolvidos: [], falantes: [], configuracoes: [], faces: [], modo: 'public', aoRolar: null, aoRenderizar: null, aoResolver: null };
  globalThis.game = env.game = { user: { id: 'jogador', isGM: false }, users: { activeGM: null }, settings: {
    get: (escopo, chave) => { env.configuracoes.push([escopo, chave]); assert.equal(escopo, 'core'); assert.equal(chave, 'messageMode'); return env.modo; }
  } };
  globalThis.fromUuid = async uuid => { env.resolvidos.push(uuid); await env.aoResolver?.(uuid, env.resolvidos.length); return env.docs.get(uuid) ?? null; };
  globalThis.ui = { notifications: { warn: texto => env.avisos.push(texto) } };
  globalThis.foundry = { applications: { handlebars: { renderTemplate: async (caminho, dados) => {
    env.renderizados.push({ caminho, dados });
    await env.aoRenderizar?.(dados);
    return `<article>${dados.dados}</article>`;
  } } } };
  globalThis.Roll = class {
    constructor(formula) {
      env.formulas.push(formula); this.formula = formula; this.indice = env.rolagens.length; this.total = env.faces.shift() ?? 4;
      this.dice = [{ faces: 10, total: this.total, results: [{ result: this.total, active: true }] }];
      env.rolagens.push(this);
    }
    async evaluate() { await env.aoRolar?.(this); return this; }
  };
  env.criarPadrao = async dados => ({ id: `chat-${env.mensagens.length + 1}`, ...dados });
  env.criar = env.criarPadrao;
  globalThis.ChatMessage = { implementation: {
    getSpeaker: ({ actor }) => {
      env.falantes.push(actor);
      return { actor: actor.id, alias: actor.token?.name ?? actor.name,
        ...(actor.token ? { scene: actor.token.parent.id, token: actor.token.id } : {}) };
    },
    create: async (dados, opcoes) => {
      env.pedidos.push({ dados, opcoes });
      const mensagem = await env.criar(dados, opcoes);
      if (mensagem) env.mensagens.push(mensagem);
      return mensagem;
    }
  } };
  env.ator = (id = 'a', type = 'personagem', uuid = `Actor.${id}`) => {
    const ator = { id, uuid, type, name: `Nome ${id}`, isOwner: true,
      system: { reputacao: 5, hp: { value: 19, max: 40 }, sorte: { value: 5 }, penalidade: -2,
        atributos: { cool: { valor: 8 }, luck: { valor: 5 } }, bonus: { todasAcoes: -2 } },
      _source: { name: `Nome ${id}`, system: { reputacao: 5, hp: { value: 19 }, sorte: { value: 5 } } },
      sortePreparada: 3, effects: [{ id: 'lesao', disabled: false }], items: [{ id: 'equipamento' }],
      statuses: new Set([`${SISTEMA}-agarrado`]), flags: { [SISTEMA]: { exemplo: 'inalterado' } }
    };
    for (const metodo of ['update', 'updateSource', 'setFlag', 'unsetFlag', 'toggleStatusEffect', 'gastarSorte', 'prepararSorte', 'rolarAtributo', 'rolarFacedown']) {
      ator[metodo] = () => assert.fail('Reconhecimento não deve chamar ' + metodo);
    }
    env.docs.set(uuid, ator); return ator;
  };
  env.a = env.ator();
  try { return await tarefa(env); } finally {
    for (const [nome, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor; }
  }
}

test('C41.3 aplicação: 1d10 simples 4 abaixo de 5 reconhece, retorna o cartão real e preserva integralmente o ator', async () => ambiente(async e => {
  const antes = foto(e.a), resultado = await rolarReputacao(e.a);
  assert.deepEqual(resumo(resultado), { ator: 'Actor.a', reputacao: 5, nivel: 5, total: 4, reconhecido: true });
  assert.deepEqual(e.formulas, ['1d10']); assert.equal(resultado.roll, e.rolagens[0]); assert.equal(resultado.mensagem, e.mensagens[0]);
  assert.deepEqual(e.pedidos[0].dados.flags, { [SISTEMA]: { reconhecimento: resumo(resultado) } });
  assert.deepEqual(e.pedidos[0].dados.rolls, [resultado.roll]);
  assert.deepEqual(e.pedidos[0].dados.speaker, { actor: 'a', alias: 'Nome a' }); assert.equal(e.falantes[0], e.a);
  assert.deepEqual(e.pedidos[0].opcoes, { messageMode: 'public' });
  assert.equal(e.renderizados[0].caminho, `systems/${SISTEMA}/templates/chat/reputacao.hbs`);
  assert.deepEqual({ ...e.renderizados[0].dados, dados: undefined }, { ...resumo(resultado), nome: 'Nome a', dados: undefined });
  assert.equal(e.pedidos[0].dados.content, `<article>${e.renderizados[0].dados.dados}</article>`);
  assert.match(e.renderizados[0].dados.dados, /class="total">4</); assert.deepEqual(e.avisos, []);
  assert.equal(e.game.users.activeGM, null); assert.deepEqual(foto(e.a), antes);
}));

test('C41.3 aplicação: má fama −5 usa nível 5 sem mudar o sinal; empate e valor acima não reconhecem', async () => ambiente(async e => {
  for (const [reputacao, face, nivel, reconhecido] of [[-5, 4, 5, true], [-5, 5, 5, false], [5, 5, 5, false], [5, 6, 5, false], [0, 1, 0, false]]) {
    e.a.system.reputacao = reputacao; e.a._source.system.reputacao = reputacao; e.faces = [face];
    const antes = foto(e.a), resultado = await rolarReputacao(e.a);
    assert.deepEqual(resumo(resultado), { ator: 'Actor.a', reputacao, nivel, total: face, reconhecido });
    assert.equal(e.pedidos.at(-1).dados.flags[SISTEMA].reconhecimento.reputacao, reputacao);
    assert.deepEqual(foto(e.a), antes);
  }
  assert.deepEqual(e.formulas, ['1d10', '1d10', '1d10', '1d10', '1d10']); assert.deepEqual(e.avisos, []);
}));

test('C41.3 aplicação: faces 1 e 10 não são críticas; Sorte preparada, COOL, ferimento, lesão e agarrão não entram', async () => ambiente(async e => {
  e.a.system.reputacao = 10; e.a.sortePreparada = 5;
  for (const [face, reconhecido] of [[1, true], [10, false]]) {
    e.faces = [face]; const antes = foto(e.a), resultado = await rolarReputacao(e.a);
    assert.equal(resultado.total, face); assert.equal(resultado.reconhecido, reconhecido);
    assert.equal(resultado.roll.dice.length, 1); assert.equal(resultado.roll.dice[0].results.length, 1);
    assert.doesNotMatch(e.renderizados.at(-1).dados.dados, /maximo|minimo|critico|resto/);
    assert.deepEqual(foto(e.a), antes);
  }
  assert.deepEqual(e.formulas, ['1d10', '1d10']); assert.equal(e.mensagens.length, 2);
}));

test('C41.3 aplicação: recusa tipo, dono, identidade e Reputação inválida antes do dado, inclusive OWNER revogado durante o UUID inicial', async () => ambiente(async e => {
  assert.equal(await rolarReputacao(null), null); assert.equal(await rolarReputacao(undefined), null);
  e.a.isOwner = false; assert.equal(await rolarReputacao(e.a), null); e.a.isOwner = true;
  for (const type of ['conteiner', 'blackice', 'demonio', 'arquitetura', 'outro']) { e.a.type = type; assert.equal(await rolarReputacao(e.a), null); }
  e.a.type = 'personagem';
  e.docs.delete(e.a.uuid); assert.equal(await rolarReputacao(e.a), null);
  e.docs.set(e.a.uuid, { ...e.a }); assert.equal(await rolarReputacao(e.a), null); e.docs.set(e.a.uuid, e.a);
  assert.deepEqual(e.avisos, []);
  const invalidos = [-11, 11, 5.5, NaN, Infinity, -Infinity, '5', null, undefined, true, {}, []];
  for (const reputacao of invalidos) {
    e.a.system.reputacao = reputacao;
    assert.equal(await rolarReputacao(e.a), null);
  }
  assert.deepEqual(e.avisos, invalidos.map(() => AVISO_NIVEL));
  assert.equal(e.formulas.length, 0); assert.equal(e.renderizados.length, 0); assert.equal(e.pedidos.length, 0);
  e.a.system.reputacao = 5; const consultasAntes = e.resolvidos.length;
  e.aoResolver = async () => { e.a.isOwner = false; };
  assert.equal(await rolarReputacao(e.a), null);
  assert.equal(e.resolvidos.length, consultasAntes + 1); assert.equal(e.formulas.length, 0); assert.equal(e.pedidos.length, 0);
  e.aoResolver = null; e.a.isOwner = true;
  assert.equal((await rolarReputacao(e.a)).reconhecido, true);
}));

const alteracoes = {
  dono: e => { e.a.isOwner = false; }, tipo: e => { e.a.type = 'conteiner'; },
  reputacao: e => { e.a.system.reputacao = 6; }, nome: e => { e.a.name = 'Outro nome'; },
  apagado: e => { e.docs.delete(e.a.uuid); }, substituido: e => { e.docs.set(e.a.uuid, { ...e.a }); },
  usuario: e => { e.game.user = { id: 'outro', isGM: true }; }
};

test('C41.3 aplicação: após o dado relê OWNER, tipo, Reputação, nome, existência, identidade e usuário; nunca renderiza o snapshot antigo', async () => {
  for (const [nome, alterar] of Object.entries(alteracoes)) await ambiente(async e => {
    e.aoRolar = async () => alterar(e);
    assert.equal(await rolarReputacao(e.a), null, nome);
    assert.deepEqual(e.avisos, [AVISO_MUDOU], nome); assert.deepEqual(e.formulas, ['1d10'], nome);
    assert.equal(e.renderizados.length, 0, nome); assert.equal(e.pedidos.length, 0, nome);
  });
});

test('C41.3 aplicação: após renderizar repete todas as validações e recusa criar cartão com estado obsoleto', async () => {
  for (const [nome, alterar] of Object.entries(alteracoes)) await ambiente(async e => {
    e.aoRenderizar = async () => alterar(e);
    assert.equal(await rolarReputacao(e.a), null, nome);
    assert.deepEqual(e.avisos, [AVISO_MUDOU], nome); assert.equal(e.renderizados.length, 1, nome); assert.equal(e.pedidos.length, 0, nome);
  });
});

test('C41.3 aplicação: clique duplo no mesmo ator é recusado; outro ator rola enquanto o primeiro aguarda', async () => ambiente(async e => {
  const entrou = promessa(), liberar = promessa(), b = e.ator('b', 'capanga'); b.system.reputacao = 6;
  e.faces = [4, 5]; e.aoRolar = async roll => { if (roll.indice === 0) { entrou.resolver(); await liberar.espera; } };
  const primeira = rolarReputacao(e.a);
  try {
    await entrou.espera;
    assert.equal(await rolarReputacao(e.a), null);
    const outra = await rolarReputacao(b);
    assert.deepEqual(resumo(outra), { ator: 'Actor.b', reputacao: 6, nivel: 6, total: 5, reconhecido: true });
    assert.equal(e.mensagens.length, 1); assert.equal(e.pedidos[0].dados.flags[SISTEMA].reconhecimento.ator, b.uuid);
  } finally { liberar.resolver(); }
  assert.equal((await primeira).reconhecido, true); assert.deepEqual(e.formulas, ['1d10', '1d10']);
  assert.equal(e.mensagens.length, 2); assert.deepEqual(e.avisos, []);
}));

test('C41.3 aplicação: erros no dado, no template e no chat liberam a trava e uma nova chamada funciona', async () => {
  for (const etapa of ['dado', 'template', 'chat']) await ambiente(async e => {
    const erro = new Error(`falha ${etapa}`), falhar = async () => { throw erro; }, antes = foto(e.a);
    if (etapa === 'dado') e.aoRolar = falhar;
    else if (etapa === 'template') e.aoRenderizar = falhar;
    else e.criar = falhar;
    await assert.rejects(rolarReputacao(e.a), esperado => esperado === erro);
    e.aoRolar = null; e.aoRenderizar = null; e.criar = e.criarPadrao;
    assert.deepEqual(resumo(await rolarReputacao(e.a)), { ator: 'Actor.a', reputacao: 5, nivel: 5, total: 4, reconhecido: true });
    assert.equal(e.mensagens.length, 1); assert.deepEqual(foto(e.a), antes);
  });
});

test('C41.3 aplicação: criação de chat cancelada retorna null e libera a chamada seguinte sem escrever no ator', async () => ambiente(async e => {
  const antes = foto(e.a);
  for (const cancelada of [null, false, undefined]) {
    e.criar = async () => cancelada;
    assert.equal(await rolarReputacao(e.a), null);
  }
  assert.equal(e.pedidos.length, 3); assert.equal(e.mensagens.length, 0);
  e.criar = e.criarPadrao;
  assert.equal((await rolarReputacao(e.a)).mensagem.id, 'chat-1');
  assert.equal(e.mensagens.length, 1); assert.deepEqual(foto(e.a), antes);
}));

test('C41.3 aplicação: público, GM, blind e self usam o seletor capturado antes do dado; modo explícito prevalece', async () => ambiente(async e => {
  for (const modo of ['public', 'gm', 'blind', 'self']) {
    e.modo = modo; e.aoRolar = async () => { e.modo = 'outro depois do dado'; };
    await rolarReputacao(e.a);
    assert.deepEqual(e.pedidos.at(-1).opcoes, { messageMode: modo });
  }
  e.modo = 'public'; await rolarReputacao(e.a, { modo: 'blind' });
  assert.deepEqual(e.pedidos.at(-1).opcoes, { messageMode: 'blind' });
  assert.deepEqual(e.configuracoes, Array.from({ length: 5 }, () => ['core', 'messageMode']));
}));

test('C41.3 aplicação: capanga sintético usa UUID e speaker próprios, preservando o modelo com o mesmo id', async () => ambiente(async e => {
  const modelo = e.a; modelo.system.reputacao = 9;
  const a = e.ator('a', 'capanga', 'Scene.c.Token.t.Actor.a'); a.system.reputacao = -5;
  a.token = { id: 't', name: 'Capanga do token', parent: { id: 'c' } };
  const antesModelo = foto(modelo), antesToken = foto(a), resultado = await rolarReputacao(a);
  assert.deepEqual(resumo(resultado), { ator: 'Scene.c.Token.t.Actor.a', reputacao: -5, nivel: 5, total: 4, reconhecido: true });
  assert.deepEqual(e.pedidos[0].dados.speaker, { actor: 'a', alias: 'Capanga do token', scene: 'c', token: 't' });
  assert.equal(e.falantes[0], a); assert.equal(e.pedidos[0].dados.flags[SISTEMA].reconhecimento.ator, a.uuid);
  assert.deepEqual(e.resolvidos, [a.uuid, a.uuid, a.uuid]);
  assert.deepEqual(foto(modelo), antesModelo); assert.deepEqual(foto(a), antesToken);
}));
