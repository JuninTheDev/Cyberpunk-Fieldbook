// C41.2: wiki system-rules.js, Escudos/Escudo humano (p. 182–184). O CORE 0.92.4 não automatiza esse estado.
import assert from 'node:assert/strict';
import test from 'node:test';
import { SISTEMA, STATUS_AGARRAO } from '../../foundry-sistema/scripts/config.mjs';
import { danoNoEscudoHumano, desfazerEscudoHumano, escudoHumanoDe, parParaEscudoHumano, usadoComoEscudo } from '../../foundry-sistema/scripts/escudo-humano.mjs';

const colecao = () => { const docs = []; docs.get = id => docs.find(doc => doc.id === id); return docs; };
async function ambiente(tarefa) {
  const chaves = ['CONFIG', 'game', 'fromUuid', 'foundry', 'ui', 'ChatMessage', 'Hooks'], antigos = Object.fromEntries(chaves.map(chave => [chave, globalThis[chave]]));
  const docs = new Map(), gravacoes = [];
  const env = { docs, gravacoes, marcas: [], mensagens: [], avisos: [], sockets: [], handlers: new Map() };
  globalThis.CONFIG = { specialStatusEffects: { DEFEATED: 'dead' } };
  const gm = { id: 'gm', isGM: true, active: true }, jogador = { id: 'jogador', isGM: false, active: true };
  const usuarios = [gm, jogador]; usuarios.activeGM = gm; usuarios.get = id => usuarios.find(u => u.id === id);
  globalThis.game = env.game = { user: gm, users: usuarios, scenes: colecao(), settings: { get: () => 'publico' },
    socket: { emit: (...dados) => env.sockets.push(dados), on: (canal, ouvir) => env.handlers.set(canal, ouvir) } };
  globalThis.fromUuid = async uuid => docs.get(uuid) ?? null;
  globalThis.ui = { notifications: { warn: texto => env.avisos.push(texto) } };
  globalThis.Hooks = { on: () => {} };
  globalThis.foundry = { utils: { escapeHTML: valor => String(valor).replaceAll('<', '&lt;').replaceAll('>', '&gt;') },
    applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: classe => classe, DialogV2: {} } } };
  globalThis.ChatMessage = { implementation: { create: async dados => { env.mensagens.push(dados); return dados; }, getSpeaker: ({ actor }) => ({ actor: actor.id }) } };
  env.ator = (id, type = 'personagem', uuid = `Actor.${id}`) => {
    const ator = { id, uuid, type, name: id, isOwner: true, effects: colecao(), items: colecao(), statuses: new Set(), flags: {},
      testUserPermission: usuario => usuario.isGM || ator.isOwner,
      system: { hp: { value: 30 }, atributos: { body: { valor: 6 } } },
      getFlag: (escopo, chave) => ator.flags[escopo]?.[chave],
      setFlag: async (escopo, chave, valor) => {
        await env.antesDeGravar?.(ator, chave, valor);
        gravacoes.push({ ator, chave, valor: structuredClone(valor) });
        (ator.flags[escopo] ??= {})[chave] = structuredClone(valor);
      } };
    docs.set(uuid, ator); return ator;
  };
  env.cena = id => { const cena = { id, uuid: `Scene.${id}`, tokens: colecao() }; env.game.scenes.push(cena); docs.set(cena.uuid, cena); return cena; };
  env.token = (cena, ator, id) => {
    const token = { id, uuid: `${cena.uuid}.Token.${id}`, name: id, actor: ator, parent: cena };
    cena.tokens.push(token); docs.set(token.uuid, token); return token;
  };
  env.efeito = (ator, papel, dados) => {
    const efeito = { id: papel, parent: ator, disabled: false, statuses: new Set([STATUS_AGARRAO[papel]]),
      flags: { [SISTEMA]: { agarrao: dados } }, getFlag: (escopo, chave) => efeito.flags[escopo]?.[chave],
      setFlag: async (escopo, chave, valor) => { env.marcas.push({ efeito, chave, valor }); (efeito.flags[escopo] ??= {})[chave] = valor; },
      unsetFlag: async (escopo, chave) => { delete efeito.flags[escopo]?.[chave]; },
      delete: async () => { ator.effects.splice(ator.effects.indexOf(efeito), 1); } };
    ator.effects.push(efeito); return efeito;
  };
  env.a = env.ator('portador'); env.b = env.ator('vitima', 'capanga'); env.c = env.cena('c');
  env.ta = env.token(env.c, env.a, 'a'); env.tb = env.token(env.c, env.b, 'b');
  env.ea = env.efeito(env.a, 'agarrando', { outro: env.b.uuid, nome: env.b.name, token: env.ta.uuid, tokenOutro: env.tb.uuid });
  env.eb = env.efeito(env.b, 'agarrado', { outro: env.a.uuid, nome: env.a.name, token: env.tb.uuid, tokenOutro: env.ta.uuid });
  env.ea.flags[SISTEMA].escudoHumano = true;
  env.pv = () => env.b.getFlag(SISTEMA, 'escudoHumanoCadaver');
  env.legado = () => { for (const efeito of [env.ea, env.eb]) { delete efeito.flags[SISTEMA].agarrao.token; delete efeito.flags[SISTEMA].agarrao.tokenOutro; } };
  try { return await tarefa(env); } finally {
    for (const [chave, valor] of Object.entries(antigos)) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; }
  }
}

test('C41.2 estado: par recíproco devolve a vítima e os dois tokens exatos; HP 0 continua vivo e sem PV de escudo', async () => ambiente(async e => {
  e.b.system.hp.value = 0;
  const estado = await escudoHumanoDe(e.a, { cena: e.c });
  assert.equal(estado.ator, e.b); assert.equal(estado.token, e.tb); assert.equal(estado.tokenDoPortador, e.ta); assert.equal(estado.efeito, e.ea);
  assert.equal(estado.morto, false); assert.equal(estado.pv, null); assert.equal(e.pv(), undefined);
  assert.equal(await usadoComoEscudo(e.b, { cena: e.c }), true);
  assert.equal(await usadoComoEscudo(e.a, { cena: e.c }), false);
  assert.equal(e.gravacoes.length, 0);
}));

test('C41.2 estado: marca manual, inativa, unilateral ou apontando outro portador não é escudo', async () => ambiente(async e => {
  for (const valor of [false, undefined, 'true', 1]) {
    e.ea.flags[SISTEMA].escudoHumano = valor;
    assert.equal(await escudoHumanoDe(e.a), null); assert.equal(await usadoComoEscudo(e.b), false);
  }
  e.ea.flags[SISTEMA].escudoHumano = true;
  e.ea.disabled = true; assert.equal(await escudoHumanoDe(e.a), null); e.ea.disabled = false;
  e.eb.disabled = true; assert.equal(await escudoHumanoDe(e.a), null); e.eb.disabled = false;
  e.eb.flags[SISTEMA].agarrao.outro = 'Actor.alheio';
  assert.equal(await escudoHumanoDe(e.a), null); assert.equal(await usadoComoEscudo(e.b), false);
  e.eb.flags[SISTEMA].agarrao.outro = e.a.uuid; e.b.effects.length = 0;
  assert.equal(await escudoHumanoDe(e.a), null);
}));

test('C41.2 estado: ativação pode consultar par sem marca, mas a consulta pública exige escudo ativo', async () => ambiente(async e => {
  delete e.ea.flags[SISTEMA].escudoHumano;
  assert.equal((await parParaEscudoHumano(e.a)).ator, e.b);
  assert.equal(await escudoHumanoDe(e.a), null);
  assert.equal(await usadoComoEscudo(e.b), false);
}));

test('C41.2 estado: recusa ator removido, tipo estranho, mesmo ator e token que pertence a outra identidade', async () => ambiente(async e => {
  e.docs.delete(e.a.uuid); assert.equal(await escudoHumanoDe(e.a), null); e.docs.set(e.a.uuid, e.a);
  e.b.type = 'conteiner'; assert.equal(await escudoHumanoDe(e.a), null); e.b.type = 'capanga';
  e.ea.flags[SISTEMA].agarrao.outro = e.a.uuid; assert.equal(await escudoHumanoDe(e.a), null); e.ea.flags[SISTEMA].agarrao.outro = e.b.uuid;
  e.tb.actor = e.ator('outra'); assert.equal(await escudoHumanoDe(e.a), null);
}));

test('C41.2 tokens: remover qualquer token, passar outra cena ou separar o par invalida ambos os sentidos', async () => ambiente(async e => {
  const outra = e.cena('outra');
  assert.equal(await escudoHumanoDe(e.a, { cena: outra }), null);
  for (const token of [e.ta, e.tb]) {
    e.c.tokens.splice(e.c.tokens.indexOf(token), 1);
    assert.equal(await escudoHumanoDe(e.a), null); assert.equal(await usadoComoEscudo(e.b), false);
    e.c.tokens.push(token);
  }
  e.tb.parent = outra; outra.tokens.push(e.tb);
  assert.equal(await escudoHumanoDe(e.a), null);
}));

test('C41.2 tokens: vínculos novos toleram outros tokens vinculados, mas nunca substituem UUID removido ou contraditório', async () => ambiente(async e => {
  const a2 = e.token(e.c, e.a, 'a2'), b2 = e.token(e.c, e.b, 'b2');
  assert.equal((await escudoHumanoDe(e.a)).token, e.tb);
  assert.equal(await usadoComoEscudo(e.b, { cena: e.c, token: e.tb.uuid }), true);
  assert.equal(await usadoComoEscudo(e.b, { cena: e.c, token: b2.uuid }), false);
  e.eb.flags[SISTEMA].agarrao.tokenOutro = a2.uuid;
  assert.equal(await escudoHumanoDe(e.a), null);
  e.eb.flags[SISTEMA].agarrao.tokenOutro = e.ta.uuid;
  e.eb.flags[SISTEMA].agarrao.token = b2.uuid;
  assert.equal(await escudoHumanoDe(e.a), null);
  e.eb.flags[SISTEMA].agarrao.token = e.tb.uuid;
  e.docs.delete(e.tb.uuid);
  assert.equal(await escudoHumanoDe(e.a), null);
}));

test('C41.2 tokens: legado só aceita token único na cena, sem escolha arbitrária por ordem', async () => ambiente(async e => {
  e.legado();
  assert.equal((await escudoHumanoDe(e.a)).token, e.tb);
  const a2 = e.token(e.c, e.a, 'a2');
  assert.equal(await escudoHumanoDe(e.a, { cena: e.c }), null);
  e.c.tokens.splice(e.c.tokens.indexOf(a2), 1);
  const outra = e.cena('outra'); e.token(outra, e.a, 'a3'); e.token(outra, e.b, 'b3');
  assert.equal(await escudoHumanoDe(e.a), null);
  assert.equal((await escudoHumanoDe(e.a, { cena: e.c })).token, e.tb);
}));

test('C41.2 tokens: capanga sintético usa sua própria identidade e nunca o modelo de mesmo id', async () => ambiente(async e => {
  const modelo = e.ator('vitima', 'capanga'), sintetico = e.ator('vitima', 'capanga', 'Scene.c.Token.b.Actor.vitima');
  e.b = sintetico; e.tb.actor = sintetico; e.ea.flags[SISTEMA].agarrao.outro = sintetico.uuid;
  e.eb = e.efeito(sintetico, 'agarrado', { outro: e.a.uuid, token: e.tb.uuid, tokenOutro: e.ta.uuid });
  sintetico.statuses.add('dead');
  const estado = await escudoHumanoDe(e.a);
  assert.equal(estado.ator, sintetico); assert.equal(estado.token, e.tb);
  assert.deepEqual(sintetico.getFlag(SISTEMA, 'escudoHumanoCadaver'), { value: 6, max: 6 });
  assert.equal(modelo.getFlag(SISTEMA, 'escudoHumanoCadaver'), undefined);
}));

test('C41.2 cadáver: DEFEATED captura BODY preparado uma única vez; não regenera ao consultar, reativar ou mudar BODY', async () => ambiente(async e => {
  e.b.statuses.add('dead'); e.b.system.atributos.body.valor = 8;
  assert.deepEqual((await escudoHumanoDe(e.a)).pv, { value: 8, max: 8 });
  e.b.system.atributos.body.valor = 12;
  await danoNoEscudoHumano(e.b, 3);
  assert.deepEqual((await escudoHumanoDe(e.a)).pv, { value: 5, max: 8 });
  delete e.ea.flags[SISTEMA].escudoHumano;
  assert.equal(await escudoHumanoDe(e.a), null);
  e.ea.flags[SISTEMA].escudoHumano = true;
  assert.deepEqual((await escudoHumanoDe(e.a)).pv, { value: 5, max: 8 });
  assert.equal(e.gravacoes.filter(g => g.valor.value === 8).length, 1);
}));

test('C41.2 cadáver: PV zero preserva a identidade e não reinicializa; reviver não transforma HP0 em cadáver', async () => ambiente(async e => {
  e.b.statuses.add('dead'); e.b.flags[SISTEMA] = { escudoHumanoCadaver: { value: 0, max: 6 } };
  const estado = await escudoHumanoDe(e.a);
  assert.equal(estado.morto, true); assert.deepEqual(estado.pv, { value: 0, max: 6 });
  e.b.statuses.clear(); e.b.system.hp.value = 0;
  assert.equal((await escudoHumanoDe(e.a)).morto, false); assert.equal((await escudoHumanoDe(e.a)).pv, null);
  assert.equal(await danoNoEscudoHumano(e.b, 4), null); assert.equal(e.gravacoes.length, 0);
}));

test('C41.2 permissões: jogador, mesmo dono, consulta prévia sem escrever e nunca aplica dano ou desfaz PV', async () => ambiente(async e => {
  e.b.statuses.add('dead'); e.game.user.isGM = false;
  assert.deepEqual((await escudoHumanoDe(e.a)).pv, { value: 6, max: 6 });
  assert.equal(e.pv(), undefined); assert.equal(await danoNoEscudoHumano(e.b, 2), null); assert.equal(await desfazerEscudoHumano(e.b, 2), null);
  e.b.flags[SISTEMA] = { escudoHumanoCadaver: { value: 2, max: 6 } }; e.b.isOwner = false;
  assert.deepEqual((await escudoHumanoDe(e.a)).pv, { value: 2, max: 6 });
  assert.equal(e.gravacoes.length, 0);
}));

test('C41.2 dano: tiro perde a sobra, explosão passa inteira ao destruir; PV nunca fica negativo e HP vivo não muda', async () => ambiente(async e => {
  e.b.statuses.add('dead');
  assert.deepEqual(await danoNoEscudoHumano(e.b, 20), { antes: 6, depois: 0, perdeu: 6, max: 6, passou: false });
  assert.deepEqual(await danoNoEscudoHumano(e.b, 20, { explosivo: true }), { antes: 0, depois: 0, perdeu: 0, max: 6, passou: true });
  assert.equal(e.b.system.hp.value, 30);
  await desfazerEscudoHumano(e.b, 6);
  assert.deepEqual(await danoNoEscudoHumano(e.b, 2, { explosivo: true }), { antes: 6, depois: 4, perdeu: 2, max: 6, passou: false });
  assert.deepEqual(await danoNoEscudoHumano(e.b, 4, { explosivo: true }), { antes: 4, depois: 0, perdeu: 4, max: 6, passou: true });
}));

test('C41.2 desfazer: devolve só a diferença e limita ao máximo capturado, preservando ataque posterior', async () => ambiente(async e => {
  e.b.statuses.add('dead');
  const primeiro = await danoNoEscudoHumano(e.b, 3);
  await danoNoEscudoHumano(e.b, 2);
  assert.deepEqual(await desfazerEscudoHumano(e.b, primeiro.perdeu), { antes: 1, depois: 4, recuperou: 3, max: 6 });
  assert.deepEqual(await desfazerEscudoHumano(e.b, 99), { antes: 4, depois: 6, recuperou: 2, max: 6 });
  assert.deepEqual(await desfazerEscudoHumano(e.b, -2), { antes: 6, depois: 6, recuperou: 0, max: 6 });
  e.b.statuses.clear(); await danoNoEscudoHumano(e.b, 1);
  assert.deepEqual(e.pv(), { value: 6, max: 6 });
}));

test('C41.2 fila: dois danos simultâneos e consulta de inicialização não perdem atualização nem reinicializam BODY', async () => ambiente(async e => {
  e.b.statuses.add('dead');
  await Promise.all([escudoHumanoDe(e.a), danoNoEscudoHumano(e.b, 2), danoNoEscudoHumano(e.b, 3)]);
  assert.deepEqual(e.pv(), { value: 1, max: 6 });
  await Promise.all([desfazerEscudoHumano(e.b, 2), danoNoEscudoHumano(e.b, 1)]);
  assert.deepEqual(e.pv(), { value: 2, max: 6 });
}));

test('C41.2 revalidação: remover par durante inicialização não devolve escudo obsoleto', async () => ambiente(async e => {
  e.b.statuses.add('dead');
  e.antesDeGravar = async () => { e.a.effects.length = 0; };
  assert.equal(await escudoHumanoDe(e.a), null);
  assert.equal(await usadoComoEscudo(e.b), false);
}));

test('C41.2 fila: permissão revogada ou ator apagado durante espera impede próxima mutação; falha libera a fila', async () => ambiente(async e => {
  e.b.statuses.add('dead');
  e.antesDeGravar = async () => { e.game.user.isGM = false; };
  const resultados = await Promise.all([danoNoEscudoHumano(e.b, 1), danoNoEscudoHumano(e.b, 2)]);
  assert.equal(resultados[1], null); assert.deepEqual(e.pv(), { value: 5, max: 6 });
  e.game.user.isGM = true; e.antesDeGravar = async () => { throw new Error('gravação recusada'); };
  await assert.rejects(danoNoEscudoHumano(e.b, 1), /gravação recusada/);
  e.antesDeGravar = null;
  assert.equal((await danoNoEscudoHumano(e.b, 1)).depois, 4);
  e.docs.delete(e.b.uuid);
  assert.equal(await danoNoEscudoHumano(e.b, 1), null); assert.equal(await desfazerEscudoHumano(e.b, 1), null);
}));

test('C41.2 ativação: usa o par real, custa uma Ação em cartão escapado e não rola; repetir ou clicar duas vezes não duplica', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  delete e.ea.flags[SISTEMA].escudoHumano;
  e.ta.name = '<img portador>'; e.tb.name = '<img vitima>';
  e.a.rolarPericia = () => assert.fail('Ativar escudo humano não rola Briga');
  const [primeira, segunda] = await Promise.all([agar.usarEscudoHumano(e.a), agar.usarEscudoHumano(e.a)]);
  assert.equal(primeira.acoes, 1); assert.equal(primeira.acao, 'escudoHumano'); assert.equal(segunda, null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), true);
  assert.equal(e.mensagens.length, 1);
  assert.equal(e.mensagens[0].flags[SISTEMA].agarrao.acoes, 1);
  assert.match(e.mensagens[0].content, /&lt;img portador&gt;/); assert.match(e.mensagens[0].content, /&lt;img vitima&gt;/);
  assert.equal(e.mensagens[0].content.includes('<img'), false);
  assert.equal(await agar.usarEscudoHumano(e.a), null); assert.equal(e.mensagens.length, 1);
}));

test('C41.2 ativação: qualquer outro escudo equipado bloqueia, mesmo sem PV; guardado e armadura comum não bloqueiam', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  delete e.ea.flags[SISTEMA].escudoHumano;
  const escudo = { type: 'armadura', system: { escudo: true, equipada: true, pvEscudo: { value: 0 } } };
  e.a.items.push(escudo);
  assert.equal(await agar.usarEscudoHumano(e.a), null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), undefined); assert.equal(e.mensagens.length, 0); assert.equal(e.avisos.length, 1);
  escudo.system.equipada = false;
  e.a.items.push({ type: 'armadura', system: { escudo: false, equipada: true } });
  assert.equal((await agar.usarEscudoHumano(e.a)).acoes, 1);
}));

test('C41.2 ativação: sem dono ou mestre não emite; socket não aceita usuário inativo ou sem OWNER', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  const { naFila } = await import('../../foundry-sistema/scripts/combate.mjs');
  delete e.ea.flags[SISTEMA].escudoHumano;
  const gm = e.game.user, jogador = e.game.users.get('jogador');
  e.game.user = jogador; e.a.isOwner = false;
  assert.equal(await agar.usarEscudoHumano(e.a), null); assert.equal(e.sockets.length, 0);
  e.a.isOwner = true; e.game.users.activeGM = null;
  assert.equal(await agar.usarEscudoHumano(e.a), null); assert.equal(e.sockets.length, 0);
  e.game.users.activeGM = gm; e.game.user = gm; agar.registrarAgarrao();
  const ouvir = e.handlers.get(`system.${SISTEMA}`), mensagem = { tipo: 'agarrao', acao: 'escudoHumano', pedido: { ator: e.a.uuid }, de: jogador.id };
  jogador.active = false; ouvir(mensagem); await naFila(() => null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), undefined);
  jogador.active = true; e.a.isOwner = false; ouvir(mensagem); await naFila(() => null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), undefined); assert.equal(e.mensagens.length, 0);
}));

test('C41.2 ativação: OWNER revogado durante leitura do par ou após setFlag cancela sem gastar Ação e desfaz a marca', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  const { naFila } = await import('../../foundry-sistema/scripts/combate.mjs');
  delete e.ea.flags[SISTEMA].escudoHumano; agar.registrarAgarrao();
  const ouvir = e.handlers.get(`system.${SISTEMA}`), mensagem = { tipo: 'agarrao', acao: 'escudoHumano', pedido: { ator: e.a.uuid }, de: 'jogador' };
  globalThis.fromUuid = async uuid => { if (uuid === e.b.uuid) e.a.isOwner = false; return e.docs.get(uuid) ?? null; };
  ouvir(mensagem); await naFila(() => null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), undefined); assert.equal(e.mensagens.length, 0);
  assert.equal(e.marcas.length, 0);
  e.a.isOwner = true; globalThis.fromUuid = async uuid => e.docs.get(uuid) ?? null;
  const gravar = e.ea.setFlag;
  e.ea.setFlag = async (...args) => { await gravar(...args); e.a.isOwner = false; };
  ouvir(mensagem); await naFila(() => null);
  assert.equal(e.ea.getFlag(SISTEMA, 'escudoHumano'), undefined); assert.equal(e.mensagens.length, 0);
}));

test('C41.2 soltar: pessoa viva é livre; cadáver custa uma Ação e mantém PV para reutilização', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  assert.equal(await agar.soltar(e.a), true);
  assert.equal(e.mensagens[0].flags[SISTEMA].agarrao.acoes, 0);
  assert.match(e.mensagens[0].content, /livre/);
  e.a.effects.push(e.ea); e.b.statuses.add('dead');
  await danoNoEscudoHumano(e.b, 2);
  assert.equal(await agar.soltar(e.a), true);
  assert.equal(e.mensagens[1].flags[SISTEMA].agarrao.acoes, 1);
  assert.match(e.mensagens[1].content, /1 Ação/); assert.deepEqual(e.pv(), { value: 4, max: 6 });
}));

test('C41.2 soltar: relê dono e identidade após consultar o escudo antes de apagar a marca', async () => ambiente(async e => {
  const agar = await import('../../foundry-sistema/scripts/agarrao.mjs');
  globalThis.fromUuid = async uuid => { if (uuid === e.b.uuid) e.a.isOwner = false; return e.docs.get(uuid) ?? null; };
  assert.equal(await agar.soltar(e.a), null);
  assert.equal(e.a.effects.includes(e.ea), true); assert.equal(e.mensagens.length, 0);
}));
