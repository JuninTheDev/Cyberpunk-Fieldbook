// C39: aplicação do avanço por IP (wiki, system-rules.js:242-245 e :712). O ambiente imita só as APIs usadas,
// conservando a fonte do ator separada dos valores preparados e devolvendo todos os globais no fim de cada caso.
import assert from 'node:assert/strict';
import test from 'node:test';
import { avancarComIp } from '../../foundry-sistema/scripts/avanco.mjs';
import { PERICIAS, FAMILIAS } from '../../foundry-sistema/scripts/gerado.mjs';

const pistola = PERICIAS.find(pericia => pericia.id === 'handgun');
const getProperty = (objeto, caminho) => caminho.split('.').reduce((valor, chave) => valor?.[chave], objeto);
class ExclusaoForcada {}

function gravar(objeto, caminho, valor) {
  const chaves = caminho.split('.');
  const chave = chaves.pop();
  const pai = chaves.reduce((parte, nome) => parte[nome] ??= {}, objeto);
  if (valor instanceof ExclusaoForcada) delete pai[chave];
  else pai[chave] = structuredClone(valor);
}

async function comAmbiente(conferir) {
  const globais = ['game', 'foundry', 'ui', 'ChatMessage'];
  const originais = new Map(globais.map(nome => [nome, Object.getOwnPropertyDescriptor(globalThis, nome)]));
  const ambiente = { janelas: [], atualizacoes: [], mensagens: [], avisos: [], responder: async () => true };
  const fonte = {
    pericias: {
      handgun: { nivel: 4 }, autofire: { nivel: 0 },
      'martial-arts-karate': { nivel: 0, familia: 'martial-arts', nome: 'Karatê' },
      propria: { nivel: 4, atributo: 'int', nome: 'Tática de rua' }
    },
    role: { nome: 'Fixer', rank: 4 }, roleSecundaria: { nome: 'Netrunner', rank: 4 },
    pontosDeMelhoria: 230, extratos: { pontosDeMelhoria: [] }
  };
  const ator = {
    id: 'avanco', uuid: 'Actor.avanco', type: 'personagem', name: 'Dona <da rua>', isOwner: true,
    _source: { system: fonte }, collection: new Map(),
    system: {
      // O contrato de DadosPersonagem.pericia: a dificuldade vem do catálogo ou da família, nunca do nível.
      pericia(id) {
        const propria = fonte.pericias[id];
        const base = PERICIAS.find(pericia => pericia.id === id);
        const familia = FAMILIAS[propria?.familia];
        return {
          nome: base?.nome ?? (familia ? `${familia.nome} (${propria.nome})` : propria?.nome),
          dificil: Boolean(base?.dificil ?? familia?.dificil)
        };
      }
    },
    async update(dados, opcoes) {
      ambiente.atualizacoes.push({ dados: structuredClone(dados), opcoes });
      for (const [caminho, valor] of Object.entries(dados)) gravar(this._source, caminho, valor);
      return this;
    }
  };
  ator.collection.set(ator.id, ator);
  Object.assign(ambiente, { ator, fonte });
  try {
    globalThis.game = { user: { name: 'Jogadora', isGM: false }, packs: new Map() };
    globalThis.ui = { notifications: { warn: mensagem => ambiente.avisos.push(mensagem) } };
    globalThis.foundry = {
      data: { operators: { ForcedDeletion: ExclusaoForcada } },
      utils: {
        getProperty,
        escapeHTML: texto => String(texto).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      },
      applications: { api: { DialogV2: { confirm: async opcoes => {
        ambiente.janelas.push(opcoes);
        return ambiente.responder(opcoes);
      } } } }
    };
    globalThis.ChatMessage = { implementation: {
      getSpeaker: ({ actor }) => ({ actor: actor.id }),
      create: async dados => { ambiente.mensagens.push(dados); return { id: 'avanco-chat' }; }
    } };
    await conferir(ambiente);
  } finally {
    for (const [nome, descritor] of originais) {
      if (descritor) Object.defineProperty(globalThis, nome, descritor);
      else delete globalThis[nome];
    }
  }
}

function semCompra(ambiente) {
  assert.equal(ambiente.atualizacoes.length, 0, 'nenhuma gravação do avanço');
  assert.equal(ambiente.mensagens.length, 0, 'nenhum anúncio de compra');
}

test('Gastar IP na ficha: confirmação, débito, extrato e chat respeitam o estado atual do ator', async t => {
  await t.test('Pistola 4 para 5: um update grava nível, saldo e extrato; o chat anuncia a compra', () => comAmbiente(async ambiente => {
    const { ator, fonte } = ambiente;
    const antiga = { quando: '2026-10-01T00:00:00.000Z', acao: 'somar', delta: 230, saldo: 230, motivo: 'Sessão', usuario: 'Mestre' };
    fonte.extratos.pontosDeMelhoria.push(antiga);
    const resultado = await avancarComIp(ator, { pericia: 'handgun' });
    assert.deepEqual(resultado, { ok: true, nivel: 4, nivelNovo: 5, custo: 100, saldo: 130 });
    assert.equal(fonte.pericias.handgun.nivel, 5);
    assert.equal(fonte.pontosDeMelhoria, 130);
    assert.equal(ambiente.atualizacoes.length, 1);
    const [atualizacao] = ambiente.atualizacoes;
    assert.deepEqual(atualizacao.opcoes, { cprfExtrato: true });
    assert.deepEqual(Object.keys(atualizacao.dados).sort(), [
      'system.extratos.pontosDeMelhoria', 'system.pericias.handgun.nivel', 'system.pontosDeMelhoria'
    ]);
    assert.equal(fonte.extratos.pontosDeMelhoria.length, 2);
    assert.deepEqual(fonte.extratos.pontosDeMelhoria[0], antiga);
    const [linha] = fonte.extratos.pontosDeMelhoria.slice(-1);
    assert.equal(Number.isNaN(Date.parse(linha.quando)), false);
    assert.deepEqual({ ...linha, quando: '' }, {
      quando: '', acao: 'subtrair', delta: -100, saldo: 130, motivo: `${pistola.nome} 4 → 5`, usuario: 'Jogadora'
    });
    assert.equal(ambiente.janelas.length, 1);
    assert.ok(ambiente.janelas[0].content.includes(`${pistola.nome} 4 → 5 por 100 IP? Você tem 230.`));
    assert.equal(ambiente.mensagens.length, 1);
    const [mensagem] = ambiente.mensagens;
    assert.deepEqual(mensagem.speaker, { actor: ator.id });
    assert.deepEqual(mensagem.flags['cpr-fieldbook'].avanco, {
      ator: ator.uuid, motivo: `${pistola.nome} 4 → 5`, custo: 100, saldo: 130
    });
    assert.ok(mensagem.content.includes('Dona &lt;da rua&gt;'));
    assert.ok(mensagem.content.includes('100 IP'));
    assert.ok(mensagem.content.includes('130 IP'));
    assert.equal(ambiente.avisos.length, 0);
  }));

  for (const role of ['role', 'roleSecundaria']) {
    await t.test(`${role}: Rank 4 para 5 custa 300 IP e preserva a outra Role`, () => comAmbiente(async ambiente => {
      const { ator, fonte } = ambiente;
      fonte.pontosDeMelhoria = 350;
      const outra = role === 'role' ? 'roleSecundaria' : 'role';
      const preservada = structuredClone(fonte[outra]);
      const resultado = await avancarComIp(ator, { role });
      assert.equal(resultado.custo, 300);
      assert.equal(fonte[role].rank, 5);
      assert.deepEqual(fonte[outra], preservada);
      assert.equal(fonte.pontosDeMelhoria, 50);
      assert.equal(fonte.extratos.pontosDeMelhoria[0].motivo, `${fonte[role].nome} 4 → 5`);
      assert.equal(ambiente.atualizacoes[0].dados[`system.${role}.rank`], 5);
      assert.equal(ambiente.mensagens.length, 1);
    }));
  }

  for (const [pericia, custo] of [['autofire', 40], ['martial-arts-karate', 40], ['handgun', 20]]) {
    await t.test(`${pericia}: compra inicial usa a dificuldade resolvida do catálogo ou da família`, () => comAmbiente(async ambiente => {
      const { ator, fonte } = ambiente;
      if (pericia === 'handgun') delete fonte.pericias.handgun;
      const resultado = await avancarComIp(ator, { pericia });
      assert.equal(resultado.nivel, 0);
      assert.equal(resultado.nivelNovo, 1);
      assert.equal(resultado.custo, custo);
      assert.equal(fonte.pericias[pericia].nivel, 1);
      assert.equal(fonte.pontosDeMelhoria, 230 - custo);
      assert.equal(fonte.extratos.pontosDeMelhoria[0].delta, -custo);
    }));
  }

  await t.test('cancelar não muda nada e libera a confirmação para outra tentativa', () => comAmbiente(async ambiente => {
    const antes = structuredClone(ambiente.fonte);
    ambiente.responder = async () => false;
    assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
    assert.deepEqual(ambiente.fonte, antes);
    semCompra(ambiente);
    ambiente.responder = async () => true;
    assert.equal((await avancarComIp(ambiente.ator, { pericia: 'handgun' })).nivelNovo, 5);
    assert.equal(ambiente.janelas.length, 2);
    assert.equal(ambiente.atualizacoes.length, 1);
  }));

  await t.test('IP insuficiente recusa antes da janela, com aviso e sem mudar a fonte', () => comAmbiente(async ambiente => {
    ambiente.fonte.pontosDeMelhoria = 99;
    const antes = structuredClone(ambiente.fonte);
    assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
    assert.deepEqual(ambiente.fonte, antes);
    assert.equal(ambiente.janelas.length, 0);
    assert.equal(ambiente.avisos.length, 1);
    assert.match(ambiente.avisos[0], /100.*99/);
    semCompra(ambiente);
  }));

  for (const [nome, preparar] of [
    ['capanga', ambiente => { ambiente.ator.type = 'capanga'; }],
    ['observador', ambiente => { ambiente.ator.isOwner = false; }],
    ['ator apagado', ambiente => { ambiente.ator.collection.delete(ambiente.ator.id); }],
    ['compêndio travado', ambiente => { ambiente.ator.pack = 'pacote'; globalThis.game.packs.set('pacote', { locked: true }); }]
  ]) {
    await t.test(`${nome}: não oferece compra nem altera IP`, () => comAmbiente(async ambiente => {
      preparar(ambiente);
      const antes = structuredClone(ambiente.fonte);
      assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
      assert.deepEqual(ambiente.fonte, antes);
      assert.equal(ambiente.janelas.length, 0);
      semCompra(ambiente);
    }));
  }

  for (const [nome, preparar] of [
    ['mestre', () => { globalThis.game.user.isGM = true; }],
    ['ator do token solto', ambiente => { ambiente.ator.parent = { actor: ambiente.ator }; delete ambiente.ator.collection; }],
    ['compêndio destravado', ambiente => { ambiente.ator.pack = 'pacote'; globalThis.game.packs.set('pacote', { locked: false }); }]
  ]) {
    await t.test(`${nome}: pode avançar um personagem que controla`, () => comAmbiente(async ambiente => {
      preparar(ambiente);
      assert.equal((await avancarComIp(ambiente.ator, { pericia: 'handgun' })).nivelNovo, 5);
      assert.equal(ambiente.atualizacoes.length, 1);
    }));
  }

  for (const [nome, escolha, mudar, avisa = true] of [
    ['saldo', { pericia: 'handgun' }, ambiente => { ambiente.fonte.pontosDeMelhoria = 400; }],
    ['nível da perícia', { pericia: 'handgun' }, ambiente => { ambiente.fonte.pericias.handgun.nivel = 5; }],
    ['nome da perícia própria', { pericia: 'propria' }, ambiente => { ambiente.fonte.pericias.propria.nome = 'Outra'; }],
    ['dificuldade da família', { pericia: 'martial-arts-karate' }, ambiente => { ambiente.fonte.pericias['martial-arts-karate'].familia = 'language'; }],
    ['nome da Role', { role: 'role' }, ambiente => { ambiente.fonte.role.nome = 'Solo'; }],
    ['Rank da segunda Role', { role: 'roleSecundaria' }, ambiente => { ambiente.fonte.roleSecundaria.rank = 5; }],
    ['permissão', { pericia: 'handgun' }, ambiente => { ambiente.ator.isOwner = false; }, false],
    ['ator removido', { pericia: 'handgun' }, ambiente => { ambiente.ator.collection.clear(); }, false],
    ['compêndio travado', { pericia: 'handgun' }, ambiente => { ambiente.ator.pack = 'pacote'; globalThis.game.packs.set('pacote', { locked: true }); }, false]
  ]) {
    await t.test(`${nome} muda durante a confirmação: não aplica a compra antiga`, () => comAmbiente(async ambiente => {
      ambiente.fonte.pontosDeMelhoria = 400;
      if (nome === 'saldo') ambiente.fonte.pontosDeMelhoria = 350;
      let depoisDaMudanca;
      ambiente.responder = async () => {
        mudar(ambiente);
        depoisDaMudanca = structuredClone(ambiente.fonte);
        return true;
      };
      assert.equal(await avancarComIp(ambiente.ator, escolha), null);
      assert.deepEqual(ambiente.fonte, depoisDaMudanca);
      assert.equal(ambiente.janelas.length, 1);
      assert.equal(ambiente.avisos.length, avisa ? 1 : 0);
      semCompra(ambiente);
    }));
  }

  await t.test('linha que chega ao extrato durante a confirmação é preservada', () => comAmbiente(async ambiente => {
    const outra = { quando: '2026-10-22T00:00:00.000Z', acao: 'definir', delta: 0, saldo: 230, motivo: 'Conferência', usuario: 'Mestre' };
    ambiente.responder = async () => { ambiente.fonte.extratos.pontosDeMelhoria.push(outra); return true; };
    await avancarComIp(ambiente.ator, { pericia: 'handgun' });
    assert.equal(ambiente.fonte.extratos.pontosDeMelhoria.length, 2);
    assert.deepEqual(ambiente.fonte.extratos.pontosDeMelhoria[0], outra);
    assert.equal(ambiente.fonte.extratos.pontosDeMelhoria[1].delta, -100);
  }));

  await t.test('clique duplo no mesmo ator abre uma janela e compra uma vez; terminado, pode subir de novo', () => comAmbiente(async ambiente => {
    let confirmar;
    ambiente.responder = () => new Promise(resolve => { confirmar = resolve; });
    const primeira = avancarComIp(ambiente.ator, { pericia: 'handgun' });
    const segunda = avancarComIp(ambiente.ator, { pericia: 'handgun' });
    assert.equal(await segunda, null);
    assert.equal(ambiente.janelas.length, 1);
    semCompra(ambiente);
    confirmar(true);
    assert.equal((await primeira).nivelNovo, 5);
    assert.equal(ambiente.atualizacoes.length, 1);
    assert.equal(ambiente.mensagens.length, 1);
    ambiente.responder = async () => true;
    assert.equal((await avancarComIp(ambiente.ator, { pericia: 'handgun' })).nivelNovo, 6);
    assert.equal(ambiente.fonte.pontosDeMelhoria, 10);
    assert.equal(ambiente.atualizacoes.length, 2);
    assert.equal(ambiente.mensagens.length, 2);
  }));

  for (const [nome, aplicar] of [
    ['update recusado', async () => undefined],
    ['update sem gravação', async ator => ator]
  ]) {
    await t.test(`${nome}: preserva a fonte e não anuncia uma compra`, () => comAmbiente(async ambiente => {
      const antes = structuredClone(ambiente.fonte);
      ambiente.ator.update = dados => {
        ambiente.atualizacoes.push({ dados });
        return aplicar(ambiente.ator);
      };
      assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
      assert.deepEqual(ambiente.fonte, antes);
      assert.ok(ambiente.atualizacoes.length >= 1);
      assert.equal(ambiente.mensagens.length, 0);
    }));
  }

  for (const [nome, escolher, persistente] of [
    ['só o nível', caminho => caminho === 'system.pericias.handgun.nivel', false],
    ['só o saldo e o extrato', caminho => caminho !== 'system.pericias.handgun.nivel', false],
    ['só o nível e o saldo, sem a linha', caminho => caminho !== 'system.extratos.pontosDeMelhoria', false],
    ['gancho persistente que tira o nível do update', caminho => caminho !== 'system.pericias.handgun.nivel', true]
  ]) {
    await t.test(`gravação parcial (${nome}): devolve nível, IP e extrato ao estado anterior`, () => comAmbiente(async ambiente => {
      const antes = structuredClone(ambiente.fonte);
      const gravarNormal = ambiente.ator.update;
      let primeira = true;
      ambiente.ator.update = async function(dados, opcoes) {
        if (!primeira && !persistente) return gravarNormal.call(this, dados, opcoes);
        primeira = false;
        const parte = Object.fromEntries(Object.entries(dados).filter(([caminho]) => escolher(caminho)));
        return gravarNormal.call(this, parte, opcoes);
      };
      assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
      assert.deepEqual(ambiente.fonte, antes, 'a compensação devolve os três campos da compra');
      assert.equal(ambiente.atualizacoes.length, 2, 'uma tentativa de compra e uma compensação');
      assert.equal(ambiente.mensagens.length, 0);
    }));
  }

  await t.test('perícia nova com só o nível gravado: a compensação devolve a entrada a ausente', () => comAmbiente(async ambiente => {
    delete ambiente.fonte.pericias.handgun;
    const antes = structuredClone(ambiente.fonte);
    const gravarNormal = ambiente.ator.update;
    let primeira = true;
    ambiente.ator.update = async function(dados, opcoes) {
      if (!primeira) return gravarNormal.call(this, dados, opcoes);
      primeira = false;
      return gravarNormal.call(this, { 'system.pericias.handgun.nivel': dados['system.pericias.handgun.nivel'] }, opcoes);
    };
    assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
    assert.deepEqual(ambiente.fonte, antes);
    assert.equal(Object.hasOwn(ambiente.fonte.pericias, 'handgun'), false);
    assert.equal(ambiente.atualizacoes.length, 2);
    assert.equal(ambiente.mensagens.length, 0);
  }));

  for (const falha of ['retorno undefined', 'erro']) {
    await t.test(`compensação recusada (${falha}): avisa para conferir os campos e não anuncia compra`, () => comAmbiente(async ambiente => {
      const gravarNormal = ambiente.ator.update;
      let primeira = true;
      ambiente.ator.update = async function(dados, opcoes) {
        if (primeira) {
          primeira = false;
          return gravarNormal.call(this, { 'system.pericias.handgun.nivel': dados['system.pericias.handgun.nivel'] }, opcoes);
        }
        ambiente.atualizacoes.push({ dados, opcoes });
        if (falha === 'erro') throw new Error('Compensação recusada');
        return undefined;
      };
      assert.equal(await avancarComIp(ambiente.ator, { pericia: 'handgun' }), null);
      assert.equal(ambiente.fonte.pericias.handgun.nivel, 5, 'a compensação foi realmente recusada');
      assert.equal(ambiente.fonte.pontosDeMelhoria, 230);
      assert.equal(ambiente.fonte.extratos.pontosDeMelhoria.length, 0);
      assert.equal(ambiente.atualizacoes.length, 2);
      assert.equal(ambiente.avisos.length, 1);
      assert.match(ambiente.avisos[0], /Não foi possível devolver todo/);
      assert.equal(ambiente.mensagens.length, 0);
    }));
  }

  await t.test('outra linha após o update não invalida a compra cuja própria linha permanece no extrato', () => comAmbiente(async ambiente => {
    const gravarNormal = ambiente.ator.update;
    const outra = { quando: '2026-10-22T00:00:00.000Z', acao: 'definir', delta: 0, saldo: 130, motivo: 'Conferência posterior', usuario: 'Mestre' };
    ambiente.ator.update = async function(dados, opcoes) {
      const atualizado = await gravarNormal.call(this, dados, opcoes);
      ambiente.fonte.extratos.pontosDeMelhoria.push(outra);
      return atualizado;
    };
    assert.equal((await avancarComIp(ambiente.ator, { pericia: 'handgun' })).nivelNovo, 5);
    assert.equal(ambiente.fonte.pontosDeMelhoria, 130);
    assert.equal(ambiente.fonte.extratos.pontosDeMelhoria.length, 2);
    assert.equal(ambiente.fonte.extratos.pontosDeMelhoria[0].delta, -100);
    assert.deepEqual(ambiente.fonte.extratos.pontosDeMelhoria[1], outra);
    assert.equal(ambiente.atualizacoes.length, 1);
    assert.equal(ambiente.avisos.length, 0);
    assert.equal(ambiente.mensagens.length, 1);
  }));

  await t.test('erro na gravação libera o ator para uma nova tentativa', () => comAmbiente(async ambiente => {
    const gravarNormal = ambiente.ator.update;
    ambiente.ator.update = async () => { throw new Error('Gravação recusada'); };
    await assert.rejects(avancarComIp(ambiente.ator, { pericia: 'handgun' }), /Gravação recusada/);
    assert.equal(ambiente.mensagens.length, 0);
    ambiente.ator.update = gravarNormal;
    assert.equal((await avancarComIp(ambiente.ator, { pericia: 'handgun' })).nivelNovo, 5);
    assert.equal(ambiente.janelas.length, 2);
  }));
});
