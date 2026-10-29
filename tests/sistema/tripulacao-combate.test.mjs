import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';
import { conferirArmaVeicular, conferirDestinos, destinoEstrutural, destinoVeicular } from '../../foundry-sistema/scripts/combate/apoio.mjs';
import { protecaoDoOcupante } from '../../foundry-sistema/scripts/tripulacao.mjs';
import { desfazerDanoNoVidro, desfazerDanoVeicular, receberDanoNoVidro, receberDanoVeicular } from '../../foundry-sistema/scripts/veiculos.mjs';

// M17, master:Tabletop/mesa-api.js:1315 e README.md:106: a pessoa está no veículo da cena, não na frota dela.
// C15, wiki system-rules.js:536 e :538: cobertura, SDP sem esquiva. Os valores de blindagem vêm do catálogo do CORE.
const catalogo = JSON.parse(readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
function colecao() {
  const lista = [];
  lista.get = id => lista.find(item => item.id === id);
  lista.has = id => Boolean(lista.get(id));
  return lista;
}
function gravar(documento, mudancas) {
  for (const [chave, valor] of Object.entries(mudancas)) {
    const partes = chave.split('.'), fim = partes.pop();
    partes.reduce((objeto, parte) => objeto[parte] ??= {}, documento)[fim] = valor;
  }
  return documento;
}

async function ambiente(tarefa) {
  const nomes = ['game', 'foundry', 'ui', 'fromUuid', 'ChatMessage', 'Roll', 'canvas', 'CONFIG'];
  const anteriores = Object.fromEntries(nomes.map(nome => [nome, globalThis[nome]]));
  const e = { docs: new Map(), avisos: [], mensagens: [] };
  const gm = { id: 'gm', isGM: true, active: true }, usuarios = [gm]; usuarios.activeGM = gm;
  globalThis.game = { user: gm, users: usuarios, actors: colecao(), scenes: colecao(), combats: [], messages: new Map(),
    settings: { get: (_, chave) => ({ ativo: true, dano: 'automatico', resultado: 'publico', animacoes: 'nao', lesaoCritica: 'ficha' })[chave] } };
  globalThis.ui = { notifications: { warn: texto => e.avisos.push(texto) } };
  globalThis.fromUuid = async uuid => e.docs.get(uuid) ?? null;
  globalThis.CONFIG = { specialStatusEffects: { DEFEATED: 'dead' } };
  globalThis.foundry = { utils: { escapeHTML: String, randomID: () => 'id' }, applications: {
    api: { ApplicationV2: class {}, HandlebarsApplicationMixin: classe => classe },
    handlebars: { renderTemplate: async () => '<div>resultado</div>' }
  } };
  globalThis.ChatMessage = { implementation: { create: async dados => {
    const mensagem = { getFlag: (escopo, chave) => dados.flags?.[escopo]?.[chave], update: async mudancas => gravar(dados, mudancas) };
    e.mensagens.push(mensagem); return mensagem;
  } } };
  globalThis.Roll = class {
    constructor(formula) { this.formula = formula; }
    async evaluate() {
      if (e.aoRolar) await e.aoRolar();
      this.dice = [{ results: [6, 6, 4, 4].map(result => ({ result, active: true })) }];
      this.total = 20;
      return this;
    }
  };
  e.ator = (id, type = 'personagem') => {
    const ator = { id, uuid: `Actor.${id}`, documentName: 'Actor', type, name: id, img: 'pessoa.webp', isOwner: true,
      items: colecao(), effects: colecao(), statuses: new Set(), flags: {},
      system: type === 'veiculo' ? { sdp: { value: 50, max: 50 }, sp: 13, ablacao: 0 } : { atributos: { ref: { valor: 8 } }, consciencia: {}, hp: { value: 40, max: 40 } },
      getFlag: (escopo, chave) => ator.flags[escopo]?.[chave], testUserPermission: () => true,
      partesDaPericia: () => ({ partes: [{ valor: 8 }] }),
      receberDanoVeicular: dados => receberDanoVeicular(ator, dados), desfazerDanoVeicular: dados => desfazerDanoVeicular(ator, dados),
      update: async mudancas => gravar(ator, mudancas) };
    Object.defineProperty(ator.system, 'blindagem', { get: () => ({ max: ator.system.sp, sp: Math.max(0, ator.system.sp - ator.system.ablacao) }) });
    e.docs.set(ator.uuid, ator); globalThis.game.actors.push(ator); return ator;
  };
  e.item = (ator, id = 'frota') => {
    const item = { id, uuid: `${ator.uuid}.Item.${id}`, documentName: 'Item', type: 'veiculo', name: `Carro de ${ator.name}`,
      parent: ator, actor: ator, isOwner: true, flags: {},
      system: { sdp: { value: 50, max: 50 }, sp: 13, ablacao: 0, janelas: { frente: { nome: 'Frente', hp: { value: 15, max: 15 } } } },
      getFlag: (escopo, chave) => item.flags[escopo]?.[chave],
      receberDanoVeicular: dados => receberDanoVeicular(item, dados), desfazerDanoVeicular: dados => desfazerDanoVeicular(item, dados),
      receberDanoNoVidro: dados => receberDanoNoVidro(item, dados), desfazerDanoNoVidro: dados => desfazerDanoNoVidro(item, dados),
      update: async mudancas => gravar(item, mudancas) };
    Object.defineProperty(item.system, 'blindagem', { get: () => ({ max: item.system.sp, sp: Math.max(0, item.system.sp - item.system.ablacao) }) });
    ator.items.push(item); e.docs.set(item.uuid, item); return item;
  };
  e.cena = { id: 'cena', tokens: colecao(), grid: { size: 100, distance: 2,
    measurePath: ([a, b]) => ({ distance: Math.hypot(a.x - b.x, a.y - b.y) / 50 }) } };
  globalThis.game.scenes.push(e.cena); globalThis.canvas = { scene: e.cena, ready: false };
  e.token = (ator, id, x = 250, width = 1) => {
    const token = { id, uuid: `Scene.cena.Token.${id}`, name: id, actor: ator, parent: e.cena,
      x, y: 0, width, height: 1, texture: {}, flags: {}, getFlag: (escopo, chave) => token.flags[escopo]?.[chave] };
    e.cena.tokens.push(token); e.docs.set(token.uuid, token); return token;
  };
  e.embarcar = veiculo => {
    e.alvo.flags[SISTEMA] = { embarcado: { veiculoId: veiculo.id } };
    veiculo.flags[SISTEMA] = { tripulacao: [e.alvo.id] };
    return veiculo;
  };
  e.descer = () => {
    delete e.alvo.flags[SISTEMA];
    for (const token of e.cena.tokens) if (token.actor.type === 'veiculo') delete token.flags[SISTEMA];
  };
  e.atacante = e.ator('atacante'); e.tokenAtq = e.token(e.atacante, 'atacante', 0);
  e.pessoa = e.ator('ocupante'); e.alvo = e.token(e.pessoa, 'ocupante');
  e.proprio = e.item(e.pessoa); e.pessoa.system.veiculo = e.proprio.id; e.pessoa.veiculoAtivo = e.proprio;
  e.outroDono = e.ator('outro-dono'); e.deOutro = e.item(e.outroDono);
  e.ligado = e.ator('ligado', 'veiculo');
  e.ligado.flags[SISTEMA] = { veiculoItem: { atorId: e.outroDono.id, itemId: e.deOutro.id } };
  e.deOutro.flags[SISTEMA] = { veiculoAtor: e.ligado.id };
  e.tokenLigado = e.token(e.ligado, 'carro-ligado', 250, 2);
  e.npc = e.ator('npc', 'veiculo'); e.tokenNpc = e.token(e.npc, 'carro-npc', 250, 2);
  gm.targets = new Set([e.alvo]);
  e.arma = { id: 'arma', uuid: `${e.atacante.uuid}.Item.arma`, type: 'arma', name: 'Arma', actor: e.atacante,
    system: { tipo: 'heavyPistol', dano: '4d6', ignorarArmadura: 0, ignorarAbaixo: 0 }, tabelaDaArma: 'DV Pistol',
    motivoVeicular: () => '', getFlag: () => null,
    municaoCarregada: { system: { efeito: 'armorPiercing', ablacao: 2 }, getFlag: () => null } };
  e.docs.set(e.arma.uuid, e.arma);
  e.destinos = (veiculo, item, tipo = 'veiculo') => ({ [e.alvo.uuid]: {
    tipo, veiculo: item.id, tokenVeiculo: veiculo.id, ...(tipo === 'vidro' ? { janela: 'frente' } : {})
  } });
  e.contexto = destinos => ({ pedido: { destinos }, arma: e.arma });
  try {
    const modos = await import('../../foundry-sistema/scripts/combate/modos.mjs');
    const cartao = await import('../../foundry-sistema/scripts/combate/cartao.mjs');
    e.resolver = destinos => modos.resolver({ id: 'ataque', arma: e.arma.uuid, token: e.tokenAtq.uuid,
      alvos: [e.alvo.uuid], modo: 'tiro', local: 'corpo', total: 30, destinos });
    e.desfazer = cartao.desfazer;
    return await tarefa(e);
  } finally {
    for (const [nome, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor;
    }
  }
}

test('C46.3 combate: o NPC protege o ocupante em vez do carro próprio ativo e não oferece janelas', async () => ambiente(async e => {
  e.embarcar(e.tokenNpc);
  const destinos = e.destinos(e.tokenNpc, e.npc), ctx = e.contexto(destinos);
  assert.equal(protecaoDoOcupante(e.alvo), e.npc);
  assert.equal(destinoVeicular(ctx, e.alvo).item, e.npc);
  assert.equal(destinoEstrutural(ctx, e.alvo).item, e.npc);
  assert.equal(conferirDestinos([e.alvo], destinos, { modo: 'tiro', local: 'corpo' }), true);
  assert.equal(conferirDestinos([e.alvo], e.destinos(e.tokenNpc, e.npc, 'vidro')), false);
  assert.equal(conferirDestinos([e.alvo], { [e.alvo.uuid]: { tipo: 'veiculo', veiculo: e.proprio.id } }), false);
  assert.equal(e.avisos.length, 2);
}));

test('C46.3 combate: a escolha usa o item do dono do veículo ligado, mesmo com id igual ao da frota do alvo', async () => ambiente(async e => {
  e.embarcar(e.tokenLigado);
  assert.equal(e.proprio.id, e.deOutro.id);
  assert.notEqual(e.proprio.uuid, e.deOutro.uuid);
  assert.equal(protecaoDoOcupante(e.alvo), e.deOutro);
  const destinos = e.destinos(e.tokenLigado, e.deOutro, 'vidro'), ctx = e.contexto(destinos);
  assert.equal(destinoVeicular(ctx, e.alvo).item, e.deOutro);
  assert.equal(destinoEstrutural(ctx, e.alvo).item, e.deOutro);
  assert.equal(conferirDestinos([e.alvo], destinos), true);
  assert.equal(conferirDestinos([e.alvo], e.destinos(e.tokenNpc, e.deOutro)), false);
  assert.equal(e.avisos.length, 1);
}));

test('C46.3 combate: Descer ou trocar o token do mesmo veículo invalida a escolha antiga sem usar a frota própria', async () => ambiente(async e => {
  e.embarcar(e.tokenLigado);
  const destinos = e.destinos(e.tokenLigado, e.deOutro), ctx = e.contexto(destinos);
  e.descer();
  assert.equal(protecaoDoOcupante(e.alvo), e.proprio);
  assert.equal(destinoVeicular(ctx, e.alvo).item, null);
  assert.equal(conferirDestinos([e.alvo], destinos), false);
  const outroToken = e.token(e.ligado, 'mesmo-carro-outro-token'); e.embarcar(outroToken);
  assert.equal(destinoVeicular(ctx, e.alvo).item, null);
  assert.equal(conferirDestinos([e.alvo], destinos), false);
  assert.equal(await e.resolver(destinos), null);
  assert.equal(e.mensagens.length, 0);
  assert.equal(e.proprio.system.sdp.value, 50); assert.equal(e.deOutro.system.sdp.value, 50);
}));

test('C46.3 combate: tiro no NPC do ocupante tira 20 − SP13, abla 2 e Desfazer alcança o veículo depois de descer', async () => ambiente(async e => {
  assert.match(catalogo['core_upgrades:armored-chassis'].system.descricao, /vehicle to SP13/);
  e.embarcar(e.tokenNpc);
  const resumo = await e.resolver(e.destinos(e.tokenNpc, e.npc));
  assert.equal(resumo.linhas[0].veicular.perdeu, 7); assert.equal(resumo.linhas[0].veicular.ablado, 2);
  assert.equal(resumo.linhas[0].veicular.ator, e.npc.uuid); assert.equal(resumo.linhas[0].dano, null);
  assert.equal(e.npc.system.sdp.value, 43); assert.equal(e.proprio.system.sdp.value, 50); assert.equal(e.pessoa.system.hp.value, 40);
  e.descer();
  assert.equal(await e.desfazer(e.mensagens.at(-1)), true);
  assert.equal(e.npc.system.sdp.value, 50); assert.equal(e.npc.system.ablacao, 0);
  assert.equal(e.avisos.length, 0);
}));

test('C46.3 combate: dano e Desfazer gravam na posse do outro dono, conservando dano posterior e a frota do alvo', async () => ambiente(async e => {
  e.embarcar(e.tokenLigado);
  const resumo = await e.resolver(e.destinos(e.tokenLigado, e.deOutro));
  assert.equal(resumo.linhas[0].veicular.perdeu, 7); assert.equal(resumo.linhas[0].veicular.ator, e.outroDono.uuid);
  assert.equal(resumo.linhas[0].veicular.veiculo, e.deOutro.uuid);
  assert.equal(e.deOutro.system.sdp.value, 43); assert.equal(e.deOutro.system.ablacao, 2);
  assert.equal(e.proprio.system.sdp.value, 50); assert.equal(e.pessoa.system.hp.value, 40);
  assert.equal(e.ligado.system.sdp.value, 50);
  const mensagem = e.mensagens.at(-1);
  assert.equal(mensagem.getFlag(SISTEMA, 'desfazer')[0].ator, e.pessoa.uuid);
  await e.deOutro.receberDanoVeicular({ dano: 20 });
  assert.equal(e.deOutro.system.sdp.value, 34);
  e.descer();
  assert.equal(await e.desfazer(mensagem), true);
  assert.equal(e.deOutro.system.sdp.value, 41); assert.equal(e.deOutro.system.ablacao, 1);
  assert.equal(e.proprio.system.sdp.value, 50); assert.equal(e.proprio.system.ablacao, 0);
  assert.equal(e.avisos.length, 0);
}));

test('C46.3 combate: vidro do outro dono recebe o tiro e Desfazer devolve só o HP dele', async () => ambiente(async e => {
  // Wiki, system-rules.js:536: o tiro destruidor perde a sobra; system-criacao.js:264: vidro blindado com 15 HP.
  const criacao = readFileSync(new URL('../../system-criacao.js', import.meta.url), 'utf8');
  assert.match(criacao, /id: 'Bulletproof Glass'.*cobertura \(15 HP\)/);
  e.embarcar(e.tokenLigado);
  const resumo = await e.resolver(e.destinos(e.tokenLigado, e.deOutro, 'vidro'));
  assert.equal(resumo.linhas[0].veicular.perdeu, 15); assert.equal(resumo.linhas[0].veicular.ator, e.outroDono.uuid);
  assert.equal(resumo.linhas[0].dano, null); assert.equal(e.deOutro.system.janelas.frente.hp.value, 0);
  assert.equal(e.proprio.system.janelas.frente.hp.value, 15); assert.equal(e.pessoa.system.hp.value, 40);
  e.descer();
  assert.equal(await e.desfazer(e.mensagens.at(-1)), true);
  assert.equal(e.deOutro.system.janelas.frente.hp.value, 15); assert.equal(e.proprio.system.janelas.frente.hp.value, 15);
  assert.equal(e.avisos.length, 0);
}));

test('C46.3 combate: descer durante a rolagem cancela o destino antes do dano', async () => ambiente(async e => {
  e.embarcar(e.tokenLigado); e.aoRolar = e.descer;
  const resumo = await e.resolver(e.destinos(e.tokenLigado, e.deOutro));
  assert.equal(resumo.linhas[0].veicular, null);
  assert.equal(e.deOutro.system.sdp.value, 50); assert.equal(e.proprio.system.sdp.value, 50);
  assert.equal(e.pessoa.system.hp.value, 40); assert.equal(e.mensagens.at(-1).getFlag(SISTEMA, 'desfazer').length, 0);
  assert.equal(e.avisos.length, 1); assert.match(e.avisos[0], /Escolha o destino novamente/);
}));

test('C46.3 combate: fora da tripulação, a escolha legada do C15 conserva veículo e janelas próprios', async () => ambiente(async e => {
  for (const tipo of ['veiculo', 'vidro']) {
    const destinos = { [e.alvo.uuid]: { tipo, veiculo: e.proprio.id, ...(tipo === 'vidro' ? { janela: 'frente' } : {}) } };
    assert.equal(conferirDestinos([e.alvo], destinos), true);
    assert.equal(destinoVeicular(e.contexto(destinos), e.alvo).item, e.proprio);
    assert.equal(destinoEstrutural(e.contexto(destinos), e.alvo).item, e.proprio);
  }
  assert.equal(protecaoDoOcupante(e.alvo), e.proprio);
  assert.equal(e.avisos.length, 0);
}));

test('C46.4 combate: a metralhadora do carro de outro dono pelo motorista: o mestre confere o assento e gasta o pente dele', async () => ambiente(async e => {
  // CORE 0.92.4, core_upgrades.json:170: "The driver may fire it using an Action"; o Autofogo gasta 10 balas (regras.mjs).
  const veiculos = await import('../../foundry-sistema/scripts/veiculos.mjs');
  const modos = await import('../../foundry-sistema/scripts/combate/modos.mjs');
  const jogador = { id: 'jogador', isGM: false, active: true };
  const upgrade = { id: 'instalacao', type: 'upgrade', system: { alvo: 'veiculo', instaladoEm: e.deOutro.id },
    getFlag: (escopo, chave) => (escopo === SISTEMA && chave === 'catalogo' ? 'core_upgrades:onboard-machine-gun' : undefined) };
  const arma = { id: 'metralhadora', uuid: `${e.outroDono.uuid}.Item.metralhadora`, type: 'arma', name: 'Onboard Machine Gun', actor: e.outroDono, parent: e.outroDono,
    system: { instaladoEm: e.deOutro.id, aDistancia: true, autofogo: 4, pente: { value: 30, max: 30 } }, tabelaDaArma: 'DV Assault Rifle',
    getFlag: (escopo, chave) => (escopo === SISTEMA && chave === 'armaVeicular' ? { tipo: 'metralhadora', soAutofogo: true, frontal: true, upgrade: upgrade.id } : undefined),
    motivoVeicular: (modo, assento) => veiculos.motivoVeicular(arma, modo, assento), testUserPermission: usuario => Boolean(usuario?.isGM),
    update: async mudancas => gravar(arma, mudancas) };
  e.outroDono.items.push(upgrade, arma); e.docs.set(arma.uuid, arma);
  const pedido = (extra = {}) => ({ id: 'metralhadora', arma: arma.uuid, atirador: e.atacante.uuid, token: e.tokenAtq.uuid, alvos: [], modo: 'autofogo', local: 'corpo', total: 30, destinos: {}, ...extra });
  e.tokenAtq.flags[SISTEMA] = { embarcado: { veiculoId: e.tokenLigado.id } };
  // Passageiro (o segundo da tripulação): recusa antes de gastar o pente.
  e.tokenLigado.flags[SISTEMA] = { tripulacao: [e.alvo.id, e.tokenAtq.id] };
  e.alvo.flags[SISTEMA] = { embarcado: { veiculoId: e.tokenLigado.id } };
  assert.equal(await modos.resolver(pedido(), jogador), null);
  assert.equal(arma.system.pente.value, 30);
  assert.match(e.avisos.at(-1), /Só o motorista dispara a arma montada do veículo/);
  // Motorista: o mestre gasta as 10 balas do Autofogo no pente do dono e resolve.
  e.tokenLigado.flags[SISTEMA].tripulacao = [e.tokenAtq.id, e.alvo.id];
  const resumo = await modos.resolver(pedido(), jogador);
  assert.equal(resumo?.modo, 'autofogo'); assert.equal(resumo?.atacante, e.tokenAtq.name);
  assert.equal(arma.system.pente.value, 20);
  // O mestre que atira pelo motorista já gastou no cliente dele: não gasta de novo.
  assert.ok(await modos.resolver(pedido(), globalThis.game.user));
  assert.equal(arma.system.pente.value, 20);
  // Sem balas bastantes, o mestre recusa; o tiro único não serve à metralhadora; outra arma de outro dono, nada.
  arma.system.pente.value = 5;
  assert.equal(await modos.resolver(pedido(), jogador), null);
  assert.equal(arma.system.pente.value, 5); assert.match(e.avisos.at(-1), /precisa de 10 balas/);
  arma.system.pente.value = 30;
  assert.equal(await modos.resolver(pedido({ modo: 'tiro' }), jogador), null);
  assert.equal(arma.system.pente.value, 30); assert.match(e.avisos.at(-1), /só dispara com Autofogo/);
  assert.equal(await modos.resolver(pedido({ arma: e.arma.uuid }), jogador), null);
  assert.equal(await modos.resolver(pedido({ atirador: e.tokenAtq.uuid }), jogador), null);
  // A arma do cyberware de outro dono não tem assento: nem no mestre nem na conferência.
  const cyber = { id: 'cyber', type: 'cyberware', system: {} };
  const braco = { id: 'braco', uuid: `${e.outroDono.uuid}.Item.braco`, type: 'arma', name: 'Braço armado', actor: e.outroDono, parent: e.outroDono,
    system: { instaladoEm: cyber.id }, getFlag: () => undefined, motivoVeicular: () => '' };
  e.outroDono.items.push(cyber, braco); e.docs.set(braco.uuid, braco);
  assert.equal(await modos.resolver(pedido({ arma: braco.uuid, modo: 'tiro' }), jogador), null);
  assert.equal(conferirArmaVeicular(braco, 'tiro', { atacante: e.atacante, tokenAtq: e.tokenAtq }), false);
  assert.match(e.avisos.at(-1), /de outro dono, só a arma montada do veículo/);
  assert.equal(conferirArmaVeicular(braco, 'tiro', { atacante: e.outroDono, tokenAtq: null }), true);
  // Fora do carro: o motorista que desceu não dispara.
  delete e.tokenAtq.flags[SISTEMA]; e.tokenLigado.flags[SISTEMA].tripulacao = [e.alvo.id];
  assert.equal(await modos.resolver(pedido(), jogador), null);
  assert.equal(arma.system.pente.value, 30); assert.match(e.avisos.at(-1), /Entre no veículo como motorista/);
}));
