import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';
import { conferirDestinos, destinoEstrutural, destinoVeicular } from '../../foundry-sistema/scripts/combate/apoio.mjs';
import { receberDanoVeicular, desfazerDanoVeicular } from '../../foundry-sistema/scripts/veiculos.mjs';

// Wiki, system-rules.js:538: veículos têm SDP e não esquivam; :515, DV pelo alcance; :518, autofogo; :521, área.
// O C46 reaproveita o contrato do C15 (veiculos.test.mjs): dano − SP, sem +5 nem lesão, com ablação da munição.
const catalogo = JSON.parse(readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const colecao = () => { const itens = []; itens.get = id => itens.find(item => item.id === id); itens.has = id => Boolean(itens.get(id)); return itens; };

async function ambiente(tarefa) {
  const chaves = ['game', 'foundry', 'ui', 'fromUuid', 'ChatMessage', 'Roll', 'canvas', 'CONFIG'];
  const anteriores = Object.fromEntries(chaves.map(chave => [chave, globalThis[chave]]));
  const e = { docs: new Map(), avisos: [], mensagens: [], formulas: [], dados: [6, 6, 4, 4], perguntas: [] };
  const gm = { id: 'gm', isGM: true, active: true }, usuarios = [gm]; usuarios.activeGM = gm;
  e.config = { ativo: true, dano: 'automatico', resultado: 'publico', animacoes: 'nao', lesaoCritica: 'ficha', area: true, supressao: true };
  globalThis.game = { user: gm, users: usuarios, combats: [], messages: new Map(), settings: { get: (_, chave) => e.config[chave] } };
  globalThis.ui = { notifications: { warn: texto => e.avisos.push(texto) } };
  globalThis.fromUuid = async uuid => e.docs.get(uuid) ?? null;
  globalThis.CONFIG = { specialStatusEffects: { DEFEATED: 'dead' } };
  globalThis.foundry = { utils: { escapeHTML: String, randomID: () => 'id' }, applications: {
    api: { ApplicationV2: class {}, HandlebarsApplicationMixin: classe => classe, DialogV2: {
      prompt: async dados => { e.perguntas.push(dados); return 15; }
    } }, handlebars: { renderTemplate: async () => '<div>resultado</div>' }
  } };
  globalThis.ChatMessage = { implementation: { create: async dados => {
    const mensagem = { ...dados, getFlag: (escopo, chave) => dados.flags?.[escopo]?.[chave],
      update: async mudancas => { if (mudancas[`flags.${SISTEMA}.desfeito`]) dados.flags[SISTEMA].desfeito = true; } };
    e.mensagens.push(mensagem); return mensagem;
  } } };
  globalThis.Roll = class {
    constructor(formula) { this.formula = formula; e.formulas.push(formula); }
    async evaluate() {
      const quantidade = Number(this.formula.match(/^(\d+)d6/)[1]);
      const resultados = e.dados.slice(0, quantidade);
      this.dice = [{ results: resultados.map(result => ({ result, active: true })) }];
      this.total = resultados.reduce((soma, valor) => soma + valor, 0) * Number(this.formula.match(/\* (\d+)/)?.[1] ?? 1);
      return this;
    }
  };
  e.ator = (id, type = 'veiculo', uuid = `Actor.${id}`) => {
    const ator = { id, uuid, type, name: id, isOwner: true, items: colecao(), effects: colecao(), statuses: new Set(),
      system: type === 'veiculo' ? { sdp: { value: 50, max: 50 }, sp: 13, ablacao: 0 } : { atributos: { ref: { valor: 8 } }, consciencia: {} },
      getFlag: () => null, testUserPermission: () => true,
      receberDanoVeicular: dados => receberDanoVeicular(ator, dados), desfazerDanoVeicular: dados => desfazerDanoVeicular(ator, dados),
      update: async mudancas => {
        for (const [chave, valor] of Object.entries(mudancas)) {
          const partes = chave.split('.'), ultima = partes.pop();
          partes.reduce((objeto, parte) => objeto[parte], ator)[ultima] = valor;
        }
      } };
    Object.defineProperty(ator.system, 'blindagem', { get: () => ({ max: ator.system.sp, sp: Math.max(0, ator.system.sp - ator.system.ablacao) }) });
    e.docs.set(uuid, ator); return ator;
  };
  e.cena = { id: 'cena', tokens: colecao(), grid: { size: 100, distance: 2, measurePath: ([a, b]) => ({ distance: Math.hypot(a.x - b.x, a.y - b.y) / 50 }) } };
  globalThis.canvas = { scene: e.cena, ready: false };
  e.token = (ator, id, x, width = 1) => {
    const token = { id, uuid: `Scene.cena.Token.${id}`, name: id, actor: ator, parent: e.cena, x, y: 0, width, height: 1, texture: {} };
    e.cena.tokens.push(token); e.docs.set(token.uuid, token); return token;
  };
  e.atacante = e.ator('atacante', 'personagem'); e.tokenAtq = e.token(e.atacante, 'atacante', 0);
  e.veiculo = e.ator('veiculo', 'veiculo', 'Scene.cena.Token.carro.Actor.veiculo'); e.alvo = e.token(e.veiculo, 'carro', 250, 2);
  gm.targets = new Set([e.alvo]);
  e.arma = { id: 'arma', uuid: 'Actor.atacante.Item.arma', type: 'arma', name: 'Arma', actor: e.atacante, system: { tipo: 'heavyPistol', dano: '4d6', ignorarArmadura: 0, ignorarAbaixo: 0, autofogo: 4 },
    tabelaDaArma: 'DV Pistol', motivoVeicular: () => '', getFlag: () => null, unsetFlag: async () => {}, setFlag: async () => {},
    municaoCarregada: { name: 'Perfurante', system: { efeito: 'armorPiercing', ablacao: 2 }, getFlag: () => null } };
  e.docs.set(e.arma.uuid, e.arma);
  e.pedido = { id: 'ataque', arma: e.arma.uuid, token: e.tokenAtq.uuid, alvos: [e.alvo.uuid], modo: 'tiro', local: 'corpo', total: 30 };
  try {
    const modos = await import('../../foundry-sistema/scripts/combate/modos.mjs');
    const cartao = await import('../../foundry-sistema/scripts/combate/cartao.mjs');
    e.resolver = pedido => modos.resolver({ ...e.pedido, ...pedido }); e.desfazer = cartao.desfazer;
    e.aplicarDano = cartao.aplicarDanoDoCartao; e.rolarLesao = cartao.rolarLesaoDoCartao;
    return await tarefa(e);
  } finally {
    for (const [chave, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[chave]; else globalThis[chave] = valor; }
  }
}

test('C46 combate: o token do veículo é estrutura sem mapa; o destino do item do ocupante continua igual', async () => ambiente(async e => {
  const ctx = { pedido: { destinos: {} } };
  assert.deepEqual(destinoVeicular(ctx, e.alvo), { tipo: 'veiculo', item: e.veiculo });
  assert.equal(destinoEstrutural(ctx, e.alvo).item, e.veiculo);
  const pessoa = e.token(e.atacante, 'ocupante', 400), item = { id: 'frota', type: 'veiculo' };
  e.atacante.items.push(item); ctx.pedido.destinos[pessoa.uuid] = { tipo: 'veiculo', veiculo: item.id };
  assert.equal(destinoVeicular(ctx, pessoa).item, item);
  assert.equal(conferirDestinos([e.alvo], {}, { modo: 'tiro', local: 'corpo' }), true);
  assert.equal(conferirDestinos([e.alvo], {}, { modo: 'supressivo' }), false);
  assert.equal(conferirDestinos([e.alvo], {}, { modo: 'tiro', local: 'cabeca' }), false);
  assert.match(e.avisos[0], /supressivo afeta pessoas/); assert.match(e.avisos[1], /locais da pessoa/);
}));

test('C46 combate: tiro crítico usa DV13 a 6 m, tira 20 − 13 SDP, abla 2 e Desfazer preserva dano posterior no token solto', async () => ambiente(async e => {
  assert.match(catalogo['core_upgrades:armored-chassis'].system.descricao, /vehicle to SP13/);
  const modelo = e.ator('veiculo');
  const resumo = await e.resolver();
  const linha = resumo.linhas[0];
  assert.equal(linha.metros, 6); assert.equal(linha.dv, 13); assert.equal(linha.escolha, 'aguentar'); assert.equal(linha.defesa, null);
  assert.equal(linha.veicular.perdeu, 7); assert.equal(linha.veicular.ablado, 2); assert.equal(linha.dano, null);
  assert.equal(e.veiculo.system.sdp.value, 43); assert.equal(e.veiculo.system.blindagem.sp, 11); assert.equal(e.veiculo.items.length, 0);
  const mensagem = e.mensagens.at(-1);
  assert.deepEqual(mensagem.getFlag(SISTEMA, 'desfazer')[0].lesoes, []);
  await e.veiculo.receberDanoVeicular({ dano: 20 });
  assert.equal(e.veiculo.system.sdp.value, 34);
  assert.equal(await e.desfazer(mensagem), true);
  assert.equal(e.veiculo.system.sdp.value, 41); assert.equal(e.veiculo.system.ablacao, 1);
  assert.equal(modelo.system.sdp.value, 50); assert.equal(modelo.system.ablacao, 0);
}));

test('C46 combate: Tech carregada e arma branca conservam metade do SP; corpo pede DV ao mestre e nunca esquiva', async () => ambiente(async e => {
  let resumo = await e.resolver({ carga: true });
  assert.equal(resumo.linhas[0].veicular.spEfetivo, 7); assert.equal(e.veiculo.system.sdp.value, 37);
  await e.desfazer(e.mensagens.at(-1));
  e.arma.system.ignorarArmadura = 50;
  resumo = await e.resolver({ modo: 'corpo' });
  assert.equal(resumo.linhas[0].dv, 15); assert.equal(resumo.linhas[0].escolha, 'aguentar');
  assert.equal(resumo.linhas[0].veicular.spEfetivo, 7); assert.equal(e.veiculo.system.sdp.value, 37);
  assert.equal(e.perguntas.length, 1); assert.match(e.perguntas[0].content, /mestre define a DV/);
}));

test('C46 combate: autofogo usa sua tabela e 2d6 × 4, sem os cinco do crítico no SDP', async () => ambiente(async e => {
  e.arma.tabelaDaArma = 'DV Assault Rifle'; e.arma.system.tipo = 'assaultRifle';
  const resumo = await e.resolver({ modo: 'autofogo' });
  assert.equal(resumo.linhas[0].dv, 22); assert.equal(resumo.linhas[0].multiplicador, 4);
  assert.deepEqual(e.formulas, ['2d6 * 4']); assert.equal(e.veiculo.system.sdp.value, 15);
  assert.equal(resumo.linhas[0].dano, null); assert.equal(e.veiculo.items.length, 0);
}));

test('C46 combate: granada encontra outro token de veículo na área e aplica dano uma vez em cada SDP, com Desfazer', async () => ambiente(async e => {
  e.arma.tabelaDaArma = 'DV Grenade Launcher';
  const outro = e.ator('segundo'); e.token(outro, 'segundo', 350, 2);
  // Quem atira fica fora dos 5 m em volta do centro da explosão.
  const resumo = await e.resolver({ modo: 'explosivo' });
  assert.equal(resumo.linhas.length, 2); assert.equal(resumo.linhas[0].dv, 16); assert.equal(e.formulas.length, 1);
  for (const linha of resumo.linhas) { assert.equal(linha.escolha, 'aguentar'); assert.equal(linha.veicular.perdeu, 7); assert.equal(linha.dano, null); }
  assert.equal(outro.system.sdp.value, 43);
  await e.desfazer(e.mensagens.at(-1));
  assert.equal(e.veiculo.system.sdp.value, 50); assert.equal(outro.system.sdp.value, 50);
  assert.equal(e.veiculo.system.ablacao, 0); assert.equal(outro.system.ablacao, 0);
}));

test('C46 combate: munições sem dano do C14 não ferem nem aplicam resistência ou estados à estrutura', async () => ambiente(async e => {
  for (const efeito of ['poison', 'biotoxin', 'emp', 'flashbang', 'sleep', 'teargas', 'smoke']) {
    e.arma.municaoCarregada.system.efeito = efeito;
    const resumo = await e.resolver();
    assert.equal(resumo.linhas[0].veicular, null, efeito); assert.equal(resumo.linhas[0].municao, null, efeito);
    assert.match(resumo.linhas[0].notas.join(' '), /não causa dano da arma à estrutura/, efeito);
  }
  assert.equal(e.formulas.length, 0); assert.equal(e.veiculo.system.sdp.value, 50); assert.equal(e.veiculo.system.ablacao, 0);
}));

test('C46 combate: supressivo recusa o alvo veículo e a busca automática deixa seus tokens de fora', async () => ambiente(async e => {
  assert.equal(await e.resolver({ modo: 'supressivo' }), null);
  assert.equal(e.mensagens.length, 0); assert.match(e.avisos[0], /supressivo afeta pessoas/);
  const resumo = await e.resolver({ modo: 'supressivo', alvos: [] });
  assert.deepEqual(resumo.linhas, []); assert.equal(e.veiculo.statuses.size, 0); assert.equal(e.veiculo.system.sdp.value, 50);
}));

test('C46 combate: Dano manual permite aplicar no SDP e desfazer, mas Rolar lesão não aceita veículo', async () => ambiente(async e => {
  e.config.dano = 'manual';
  const mensagem = { getFlag: (_, chave) => chave === 'danoDeArma' ? { arma: e.arma.uuid, total: 20, critico: true, bonus: 5, formula: '4d6' } : undefined };
  const resumo = await e.aplicarDano(mensagem);
  assert.equal(resumo.linhas[0].veicular.perdeu, 7); assert.equal(e.veiculo.system.sdp.value, 43);
  assert.equal(e.veiculo.system.ablacao, 2); assert.equal(resumo.linhas[0].dano, null);
  assert.equal(await e.rolarLesao(mensagem), null); assert.match(e.avisos.at(-1), /Marque o alvo.*lesão/);
  await e.desfazer(e.mensagens.at(-1));
  assert.equal(e.veiculo.system.sdp.value, 50); assert.equal(e.veiculo.system.ablacao, 0);
}));
