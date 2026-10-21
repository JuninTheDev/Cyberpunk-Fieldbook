// A campanha e o crossover como no módulo da mesa (wiki.mjs: tableCampaign, ofTable e importTransferred), com o
// vínculo próprio do 14 da API da wiki (api-personagens.js: linksOf/linkOf e a rota extra === 'ator').
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { SISTEMA } from '../../foundry-sistema/scripts/config.mjs';
import { mudouDeCampanha, pertenceACampanha, prepararAtorTransferido, resolverCampanha, vinculoDaGeracao14 } from '../../foundry-sistema/scripts/wiki-campanha.mjs';

const campanhas = [{ id: 'origem', nome: 'Campanha antiga', mundo: 'antigo' }, { id: 'destino', nome: 'Campanha nova', mundo: 'novo' }];

test('wiki: resolve a campanha configurada, a do mundo e a única, nesta ordem', () => {
  assert.equal(resolverCampanha(campanhas, ' origem ', 'novo'), campanhas[0]);
  assert.equal(resolverCampanha(campanhas, '', 'novo'), campanhas[1]);
  assert.equal(resolverCampanha([campanhas[0]], '', 'outro'), campanhas[0]);
  assert.equal(resolverCampanha(campanhas, undefined, 'antigo'), campanhas[0]);
});

test('wiki: campanha inexistente não usa a do mundo; ambiguidade avisa e lista vazia fica sem filtro', () => {
  assert.deepEqual(resolverCampanha(campanhas, 'apagada', 'novo'), { erro: 'A campanha "apagada" não existe na wiki.', lista: campanhas });
  assert.deepEqual(resolverCampanha(campanhas, '', 'outro'), { erro: 'Este mundo não está ligado a nenhuma campanha da wiki.', lista: campanhas });
  assert.equal(resolverCampanha([], '', 'novo'), null);
  assert.equal(resolverCampanha([], 'apagada', 'novo'), null);
  assert.equal(resolverCampanha(undefined, '', 'novo'), null);
});

test('wiki: a resolução e o filtro conferem com tableCampaign e ofTable do módulo cpr-2077 da mesa', async () => {
  const fonte = fs.readFileSync(new URL('../../foundry-2077/scripts/wiki.mjs', import.meta.url), 'utf8');
  const trecho = fonte.slice(fonte.indexOf('let campaignCache = null;'), fonte.indexOf('const unresolvedHelp ='));
  assert.ok(trecho.includes('async function tableCampaign()'));
  for (const [lista, configurada, mundo] of [[campanhas, 'origem', 'novo'], [campanhas, '', 'novo'], [[campanhas[0]], '', 'outro'], [campanhas, '', 'outro'], [campanhas, 'apagada', 'novo'], [[], 'apagada', 'novo']]) {
    const contexto = vm.createContext({
      MODULE_ID: 'cpr-2077',
      game: { settings: { get: () => configurada }, world: { id: mundo }, user: { isGM: false } },
      wikiFetch: async () => ({ campanhas: lista })
    });
    vm.runInContext(`${trecho}\nglobalThis.resolver = tableCampaign; globalThis.pertence = ofTable;`, contexto);
    const esperado = JSON.parse(JSON.stringify(await contexto.resolver()));
    const campanha = resolverCampanha(lista, configurada, mundo);
    assert.deepEqual(campanha, esperado);
    for (const personagem of [{ campanha: 'origem' }, { campanha: 'destino' }, { campanha: '' }]) {
      assert.equal(pertenceACampanha(personagem, campanha), contexto.pertence(personagem, campanha));
    }
  }
});

test('wiki: o filtro da campanha exclui as outras e sem campanha resolvida mostra todos', () => {
  assert.deepEqual([{ id: 'a', campanha: 'origem' }, { id: 'b', campanha: 'destino' }, { id: 'c' }].filter(doc => pertenceACampanha(doc, campanhas[1])).map(doc => doc.id), ['b']);
  assert.equal(pertenceACampanha({ campanha: 'origem' }, null), true);
  assert.equal(pertenceACampanha({ campanha: 'origem' }, { erro: 'Escolha uma campanha.' }), true);
});

// Executa só a resolução real, sem importar os modelos que dependem do Foundry no topo de wiki.mjs.
function campanhaDaFonte(mudar = {}, responder = async () => ({ campanhas })) {
  const fonte = fs.readFileSync(new URL('../../foundry-sistema/scripts/wiki.mjs', import.meta.url), 'utf8');
  const trecho = fonte.slice(fonte.indexOf('let cacheDaCampanha = null;'), fonte.indexOf('const ajudaDaCampanha =')).replace('export async function campanhaDoMundo()', 'async function campanhaDoMundo()');
  assert.ok(trecho.includes('async function campanhaDoMundo()'));
  const estado = { configurada: 'origem', mundo: 'novo', url: 'http://wiki-antiga', agora: 1000, mestreAtivo: false, ...mudar };
  const chamadas = [];
  const gravacoes = [];
  const contexto = vm.createContext({
    SISTEMA, resolverCampanha, Date: { now: () => estado.agora },
    wikiUrl: () => estado.url, souOMestreAtivo: () => estado.mestreAtivo,
    wikiFetch: async rota => {
      const chamada = { rota, url: estado.url, configurada: estado.configurada };
      chamadas.push(chamada);
      return responder(chamada, chamadas.length);
    },
    game: {
      get world() { return { id: estado.mundo }; },
      settings: {
        get: () => estado.configurada,
        set: async (sistema, chave, valor) => { gravacoes.push({ sistema, chave, valor }); estado.configurada = valor; }
      }
    }
  });
  vm.runInContext(`${trecho}\nglobalThis.resolver = campanhaDoMundo;`, contexto);
  return { estado, chamadas, gravacoes, resolver: contexto.resolver };
}

test('wiki: campanhaDoMundo guarda a resposta por 60 segundos e invalida ao trocar configuração, wiki ou mundo', async () => {
  const mesa = campanhaDaFonte();
  assert.equal((await mesa.resolver()).id, 'origem');
  assert.equal(mesa.chamadas.length, 1);
  mesa.estado.agora = 60999;
  assert.equal((await mesa.resolver()).id, 'origem');
  assert.equal(mesa.chamadas.length, 1, '59.999 s ainda usa o cache');
  mesa.estado.agora = 61000;
  await mesa.resolver();
  assert.equal(mesa.chamadas.length, 2, '60 s já pedem a lista de novo');
  mesa.estado.configurada = 'destino';
  assert.equal((await mesa.resolver()).id, 'destino');
  assert.equal(mesa.chamadas.length, 3);
  mesa.estado.url = 'http://outra-wiki';
  await mesa.resolver();
  assert.equal(mesa.chamadas.length, 4);
  mesa.estado.mundo = 'outro';
  await mesa.resolver();
  assert.equal(mesa.chamadas.length, 5);
  assert.ok(mesa.chamadas.every(chamada => chamada.rota === '/api/campanhas'));
});

test('wiki: campanhaDoMundo fixa a campanha única só pelo mestre ativo e usa a chave persistida no cache', async () => {
  for (const mestreAtivo of [false, true]) {
    const mesa = campanhaDaFonte({ configurada: '', mestreAtivo }, async () => ({ campanhas: [campanhas[0]] }));
    assert.equal((await mesa.resolver()).id, 'origem');
    assert.deepEqual(mesa.gravacoes, mestreAtivo ? [{ sistema: SISTEMA, chave: 'wikiCampanha', valor: 'origem' }] : []);
    assert.equal(mesa.estado.configurada, mestreAtivo ? 'origem' : '');
    assert.equal((await mesa.resolver()).id, 'origem');
    assert.equal(mesa.chamadas.length, 1, 'persistir a escolha não causa outra consulta');
  }
});

test('wiki: campanhaDoMundo descarta o GET em voo quando muda a campanha ou o endereço da wiki', async () => {
  for (const trocar of ['configurada', 'url']) {
    let devolver;
    const emVoo = new Promise(resolve => { devolver = resolve; });
    const outraWiki = { ...campanhas[0], nome: 'Campanha de outra wiki' };
    const mesa = campanhaDaFonte({}, async (_chamada, numero) => numero === 1 ? emVoo : { campanhas: trocar === 'url' ? [outraWiki] : campanhas });
    const pendente = mesa.resolver();
    assert.equal(mesa.chamadas.length, 1);
    mesa.estado[trocar] = trocar === 'url' ? 'http://nova-wiki' : 'destino';
    devolver({ campanhas: [campanhas[0]] });
    const esperada = trocar === 'url' ? outraWiki : campanhas[1];
    assert.deepEqual(await pendente, esperada, 'a consulta anterior não vira resposta da configuração nova');
    assert.equal(mesa.chamadas.length, 2, 'a chave nova consulta a wiki nova');
    assert.deepEqual(await mesa.resolver(), esperada);
    assert.equal(mesa.chamadas.length, 2, 'só a resposta da chave nova fica no cache');
  }
});

test('wiki: a mudança de campanha usa o vínculo do 14, mesmo quando a wiki mostra o do 12', () => {
  const antigo = { campanha: 'destino', ator: 'ator12' };
  const atual = { campanha: 'origem', ator: 'ator14', geracao: 14 };
  const doc = { campanha: 'destino', foundry: antigo, foundry12: antigo, foundry14: atual, estadoFoundry: 'importado' };
  assert.equal(vinculoDaGeracao14(doc), atual);
  assert.equal(mudouDeCampanha(doc), true);
  assert.equal(mudouDeCampanha({ ...doc, foundry: atual, foundry14: { campanha: 'destino' }, estadoFoundry: 'outra-mesa' }), false);
  assert.equal(vinculoDaGeracao14({ foundry: atual }), atual);
  assert.equal(vinculoDaGeracao14({ foundry: antigo }), null);
  assert.equal(mudouDeCampanha({ campanha: 'destino', foundry: antigo }), false);
  assert.equal(mudouDeCampanha({ campanha: '', foundry14: atual }), false);
  assert.equal(mudouDeCampanha({ campanha: 'destino', foundry14: {} }), false);
});

const agora = '2026-10-20T16:00:00.000Z';
const doc = { id: 'pessoa', versao: 9, campanha: 'destino', foundry14: { geracao: 14, campanha: 'origem' } };
const ficha = () => ({
  _id: 'atorAntigo000001', name: 'A viajante', type: 'personagem', folder: 'pastaAntiga00001', ownership: { default: 1, donoAntigo: 3 },
  img: 'worlds/antigo/retrato.webp', prototypeToken: { actorLink: true, texture: { src: 'worlds/antigo/retrato.webp' } },
  system: {
    hp: { value: 11, max: 40 }, humanidade: { value: 26, max: 40 }, sorte: { value: 2, max: 6 }, dinheiro: 127,
    ip: 34, reputacao: 3, extratos: { dinheiro: [{ antes: 200, saldo: 127, motivo: 'Clínica' }], ip: [{ antes: 30, saldo: 34, motivo: 'Sessão' }] }
  },
  flags: { [SISTEMA]: { saiu: { para: 'destino', quando: 'ontem' }, wiki: { id: 'pessoa', versao: 2, importado: 'antes', entregues: ['pedido-antigo'], retrato: 'antigo' }, doMestre: { nota: 'Preservar' } }, outroModulo: { memoria: 7 } },
  items: [
    { _id: 'arma000000000001', type: 'arma', system: { pente: { value: 3, max: 12 }, carregada: 'balas00000000001' }, flags: { [SISTEMA]: { wikiUid: 'arma-wiki' } } },
    { _id: 'balas00000000001', type: 'municao', system: { quantidade: 17 } },
    { _id: 'base000000000001', type: 'cyberware', system: { instalado: true, lado: 'braco-esquerdo', fundacional: true } },
    { _id: 'opcao00000000001', type: 'cyberware', system: { instalado: true, instaladoEm: 'base000000000001', lado: 'braco-esquerdo' }, effects: [{ _id: 'itemEfeito000001', disabled: true }] },
    { _id: 'lesao00000000001', type: 'lesao', flags: { [SISTEMA]: { correcao: { efeitos: ['efeito0000000001'] } } }, system: { corrigida: true } }
  ],
  effects: [{ _id: 'efeito0000000001', name: 'Ferida', disabled: true, system: { changes: [{ key: 'system.bonus.deathSave', value: '1' }] } }]
});
const transferenciaDe = ator => ({ de: 'origem', para: 'destino', quando: '2026-10-20T15:00:00.000Z', ator: { name: ator.name, type: 'character', flags: { [SISTEMA]: { crossover: { geracao: 14, ator } } } } });

test('wiki: o crossover conserva a ficha completa, os IDs internos e o extrato, troca o dono e renova o vínculo', () => {
  const original = ficha();
  const transferencia = transferenciaDe(original);
  const antes = structuredClone(transferencia);
  const dados = prepararAtorTransferido(transferencia, doc, 'donoNovo', campanhas[1], agora);
  assert.equal(dados._id, undefined);
  assert.equal(dados.folder, undefined);
  assert.deepEqual(dados.ownership, { default: 0, donoNovo: 3 });
  assert.equal(dados.type, 'personagem');
  assert.deepEqual(dados.system, original.system);
  assert.deepEqual(dados.items, original.items);
  assert.deepEqual(dados.effects, original.effects);
  assert.deepEqual(dados.prototypeToken, original.prototypeToken);
  assert.equal(dados.flags[SISTEMA].saiu, undefined);
  assert.deepEqual(dados.flags[SISTEMA].wiki, { id: 'pessoa', versao: 9, importado: agora, entregues: ['pedido-antigo'], retrato: 'antigo', veioDe: 'origem' });
  assert.deepEqual(dados.flags[SISTEMA].doMestre, { nota: 'Preservar' });
  assert.deepEqual(dados.flags.outroModulo, { memoria: 7 });
  assert.deepEqual(transferencia, antes, 'a ficha que veio da wiki não muda');
  dados.items[3].system.instaladoEm = '';
  dados.effects[0].disabled = false;
  dados.system.extratos.dinheiro[0].saldo = 0;
  assert.deepEqual(transferencia, antes, 'os dados internos também são cópias');
});

test('wiki: sem dono novo o crossover deixa só a permissão padrão; sem flags cria o vínculo', () => {
  const original = ficha();
  delete original.flags;
  const dados = prepararAtorTransferido(transferenciaDe(original), doc, '', campanhas[1], agora);
  assert.deepEqual(dados.ownership, { default: 0 });
  assert.deepEqual(dados.flags, { [SISTEMA]: { wiki: { id: 'pessoa', versao: 9, importado: agora, veioDe: 'origem' } } });
});

test('wiki: crossover de outra geração pede Importar da mesa e não transforma CORE em personagem', () => {
  const transferencia = transferenciaDe(ficha());
  for (const invalida of [
    { ...transferencia, ator: { type: 'character', system: { stats: {}, ledger: [] } } },
    transferenciaDe({ ...ficha(), type: 'character' }),
    { ...transferencia, ator: { type: 'character', flags: { [SISTEMA]: { crossover: { geracao: 12, ator: ficha() } } } } },
    transferenciaDe({ ...ficha(), system: null }),
    transferenciaDe({ ...ficha(), system: [] })
  ]) assert.throws(() => prepararAtorTransferido(invalida, doc, '', campanhas[1], agora), /Foundry 14.*Importar da mesa/);
});

test('wiki: crossover recusa destino, personagem, mundo ou origem que não conferem', () => {
  const transferencia = transferenciaDe(ficha());
  const antes = structuredClone(transferencia);
  for (const [invalida, personagem, campanha] of [
    [{ ...transferencia, para: 'outro' }, doc, campanhas[1]],
    [transferencia, { ...doc, campanha: 'outro' }, campanhas[1]],
    [transferencia, doc, campanhas[0]],
    [{ ...transferencia, de: 'destino' }, doc, campanhas[1]],
    [{ ...transferencia, de: 'outro' }, doc, campanhas[1]],
    [{ ...transferencia, de: '' }, doc, campanhas[1]],
    [{ ...transferencia, para: '' }, doc, campanhas[1]],
    [null, doc, campanhas[1]]
  ]) assert.throws(() => prepararAtorTransferido(invalida, personagem, '', campanha, agora), /campanha de origem.*campanha deste mundo/);
  assert.throws(() => prepararAtorTransferido(transferencia, doc, '', null, agora), /campanha deste mundo não está resolvida/);
  const outraFicha = ficha();
  outraFicha.flags[SISTEMA].wiki.id = 'outro-personagem';
  assert.throws(() => prepararAtorTransferido(transferenciaDe(outraFicha), doc, '', campanhas[1], agora), /outro personagem da wiki/);
  assert.deepEqual(transferencia, antes);
});
