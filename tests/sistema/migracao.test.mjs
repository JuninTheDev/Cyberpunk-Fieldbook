// Testes de referência da migração dos dados entre versões do sistema (foundry-sistema/scripts/migracao.mjs), sem
// Foundry: os passos, cada um com os dados de antes e de depois, e o plano do que muda em cada documento.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APAGAR, diferenca, migrarDados, PASSOS, passosDepoisDe, planoDeMudanca, planoVazio, VERSAO_DOS_DADOS } from '../../foundry-sistema/scripts/migracao.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

// Um item do catálogo como fica num mundo (com _id, como no toObject), com mudanças.
let contador = 0;
const doCatalogo = (id, mudar = dados => dados) => {
  const dados = structuredClone(catalogo[id]);
  dados._id = `item${String(++contador).padStart(12, '0')}`;
  dados.effects = (dados.effects ?? []).map((efeito, i) => ({ ...efeito, _id: `${dados._id.slice(0, 12)}ef${i}`.padEnd(16, '0') }));
  return mudar(dados);
};
// O efeito que o catálogo dava ao TeleOptics do RED até o ciclo 26 (o do CORE: +1 no mirado e no tiro único, sempre).
const efeitoAntigoDoTeleOptics = _id => ({
  _id, name: 'TeleOptics', img: 'icons/svg/upgrade.svg', type: 'base', disabled: false, transfer: true, description: '',
  system: { changes: [
    { key: 'system.bonus.tiroMirado', type: 'add', value: '1', phase: 'initial', priority: null },
    { key: 'system.bonus.tiroUnico', type: 'add', value: '1', phase: 'initial', priority: null }
  ] }
});
const outroEfeito = _id => ({ _id, name: 'Do mestre', type: 'base', disabled: false, transfer: true, system: { changes: [{ key: 'system.bonus.iniciativa', type: 'add', value: '1', phase: 'initial', priority: null }] } });
const passo = versao => PASSOS.find(p => p.versao === versao);

test('Migração: os passos vão de 1 em 1, sem buraco, cada um com o nome e o que muda; a versão dos dados é a do último', () => {
  assert.deepEqual(PASSOS.map(p => p.versao), PASSOS.map((p, i) => i + 1));
  for (const p of PASSOS) {
    assert.ok(p.nome?.length > 10, `o passo ${p.versao} tem nome`);
    assert.ok(typeof p.item === 'function' || typeof p.ator === 'function', `o passo ${p.versao} muda item ou ator`);
  }
  assert.equal(VERSAO_DOS_DADOS, PASSOS.length);
  assert.deepEqual(passosDepoisDe(0).map(p => p.versao), PASSOS.map(p => p.versao));
  assert.deepEqual(passosDepoisDe(1).map(p => p.versao), PASSOS.slice(1).map(p => p.versao));
  assert.deepEqual(passosDepoisDe(VERSAO_DOS_DADOS), []);
});

test('Migração, passo 1 (TeleOptics pela wiki, ciclo 26): o +1 de sempre do CORE sai do TeleOptics do RED; o efeito que o mestre pôs fica; o mesmo efeito noutro item fica; o TeleOptics do catálogo de hoje não muda', () => {
  assert.deepEqual(catalogo['core_cyberware:teleoptics'].effects, [], 'o catálogo de hoje não tem o efeito');
  const antigo = doCatalogo('core_cyberware:teleoptics', dados => ({ ...dados, effects: [efeitoAntigoDoTeleOptics('efeitoantigo0001'), outroEfeito('efeitodomestre01')] }));
  const depois = migrarDados(antigo, { documento: 'Item', passos: [passo(1)], catalogo });
  assert.deepEqual(depois.effects.map(e => e._id), ['efeitodomestre01']);
  assert.equal(antigo.effects.length, 2, 'os dados de entrada ficam como estavam');
  // O mesmo efeito num cyberware que não é o TeleOptics do RED (o de 2077, outro cyberóptico): fica.
  for (const id of ['cyberware-2077:teleoptics-2077', 'core_cyberware:anti-dazzle']) {
    const outro = doCatalogo(id, dados => ({ ...dados, effects: [efeitoAntigoDoTeleOptics('efeitoantigo0002')] }));
    assert.equal(migrarDados(outro, { documento: 'Item', passos: [passo(1)], catalogo }).effects.length, 1, id);
  }
  // Um efeito do TeleOptics que dá mais que +1 (mudado pelo mestre): fica.
  const mudado = doCatalogo('core_cyberware:teleoptics', dados => {
    const efeito = efeitoAntigoDoTeleOptics('efeitoantigo0003');
    efeito.system.changes[0].value = '2';
    return { ...dados, effects: [efeito] };
  });
  assert.equal(migrarDados(mudado, { documento: 'Item', passos: [passo(1)], catalogo }).effects.length, 1);
  const deHoje = doCatalogo('core_cyberware:teleoptics');
  assert.ok(planoVazio(planoDeMudanca(deHoje, migrarDados(deHoje, { documento: 'Item', catalogo }))));
});

test('Migração, passo 2 (o tipo do cyberware, ciclo 7): o que a ficha trocou por Fashionware volta ao tipo do catálogo; o Fashionware de verdade, o borgware, o item sem catálogo e os outros tipos ficam', () => {
  const tipoDepois = (id, tipo, mudar = dados => dados) => {
    const dados = doCatalogo(id, d => { d.system.tipo = tipo; return mudar(d); });
    return migrarDados(dados, { documento: 'Item', passos: [passo(2)], catalogo }).system.tipo;
  };
  // Os quatro tipos que a ficha não conhecia até o ciclo 7.
  assert.equal(tipoDepois('core_cyberware:amplified-hearing', 'fashionware'), 'cyberAudioSuite');
  assert.equal(tipoDepois('core_cyberware:anti-dazzle', 'fashionware'), 'cyberEye');
  assert.equal(tipoDepois('core_cyberware:audiovox', 'fashionware'), 'cyberwareInternal');
  assert.equal(tipoDepois('core_cyberware:subdermal-armor', 'fashionware'), 'cyberwareExternal');
  // A ficha conhecia o borgware: o Fashionware nele foi escolha de alguém.
  assert.equal(tipoDepois('core_cyberware:artificial-shoulder-mount', 'fashionware'), 'fashionware');
  assert.equal(tipoDepois('core_cyberware:biomonitor', 'fashionware'), 'fashionware');
  assert.equal(tipoDepois('core_cyberware:amplified-hearing', 'neuralWare'), 'neuralWare');
  assert.equal(tipoDepois('core_cyberware:amplified-hearing', 'fashionware', d => { delete d.flags['cpr-fieldbook'].catalogo; return d; }), 'fashionware');
});

test('Migração no ator: os itens dele passam por todos os passos; o plano tem só o que muda (o efeito que sai do TeleOptics, o tipo do Cyberaudio), e rodar de novo não muda nada', () => {
  const teleoptics = doCatalogo('core_cyberware:teleoptics', dados => ({ ...dados, effects: [efeitoAntigoDoTeleOptics('efeitoantigo0004')] }));
  const audio = doCatalogo('core_cyberware:amplified-hearing', dados => { dados.system.tipo = 'fashionware'; return dados; });
  const rifle = doCatalogo('core_weapons:assault-rifle');
  const ator = { _id: 'ator000000000001', name: 'Antigo', type: 'personagem', system: { hp: { value: 30, max: 40 } }, items: [teleoptics, audio, rifle], effects: [], flags: {} };
  const depois = migrarDados(ator, { documento: 'Actor', catalogo });
  const plano = planoDeMudanca(ator, depois);
  assert.deepEqual(plano.campos, {});
  assert.deepEqual(Object.keys(plano.colecoes), ['Item']);
  const { apagar, criar, mudar } = plano.colecoes.Item;
  assert.deepEqual([apagar, criar], [[], []]);
  assert.deepEqual(mudar.map(m => m._id).sort(), [teleoptics._id, audio._id].sort());
  const doTeleOptics = mudar.find(m => m._id === teleoptics._id).plano;
  assert.deepEqual(doTeleOptics.campos, {});
  assert.deepEqual(doTeleOptics.colecoes.ActiveEffect, { apagar: ['efeitoantigo0004'], criar: [], mudar: [] });
  assert.deepEqual(mudar.find(m => m._id === audio._id).plano, { campos: { system: { tipo: 'cyberAudioSuite' } }, colecoes: {} });
  // De novo, nos dados já migrados: nada.
  assert.ok(planoVazio(planoDeMudanca(depois, migrarDados(depois, { documento: 'Actor', catalogo }))));
});

test('Plano de mudança: o campo que muda vai por dentro do objeto, a lista vai inteira, o campo que some vai como apagar; nas coleções, o que sai, o que entra (com ou sem _id) e o que muda', () => {
  assert.deepEqual(diferenca({ a: 1, b: { c: 2, d: 3 }, e: [1, 2], f: 'x' }, { a: 1, b: { c: 2, d: 4 }, e: [1, 2, 3] }), { b: { d: 4 }, e: [1, 2, 3], f: APAGAR });
  assert.deepEqual(diferenca({ habilidades: { 'Velha': 2 } }, { habilidades: { 'Nova': 2 } }), { habilidades: { Velha: APAGAR, Nova: 2 } });
  assert.deepEqual(diferenca({ a: { b: 1 } }, { a: { b: 1 } }), {});
  const antes = { name: 'Ator', items: [{ _id: 'i1', name: 'Fica', effects: [] }, { _id: 'i2', name: 'Sai', effects: [] }, { _id: 'i3', name: 'Muda', system: { n: 1 }, effects: [] }], effects: [] };
  const depois = { name: 'Ator', items: [{ _id: 'i1', name: 'Fica', effects: [] }, { _id: 'i3', name: 'Muda', system: { n: 2 }, effects: [] }, { _id: 'i4', name: 'Entra' }, { name: 'Novo' }], effects: [] };
  assert.deepEqual(planoDeMudanca(antes, depois), {
    campos: {},
    colecoes: { Item: { apagar: ['i2'], criar: [{ _id: 'i4', name: 'Entra' }, { name: 'Novo' }], mudar: [{ _id: 'i3', plano: { campos: { system: { n: 2 } }, colecoes: {} } }] } }
  });
});
