import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { alteracoesDoVeiculoNoItem, destinoDaEscritaVeicular, estadoDoItemVeiculo, vinculoVeicularValido } from '../../foundry-sistema/scripts/regras-vinculo-veiculo.mjs';

const ler = caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const catalogo = JSON.parse(ler('../../foundry-sistema/dados/catalogo.json')).itens;
const modelo = id => structuredClone(catalogo[id]);
function frota() {
  const item = { ...modelo('core_vehicles:compact-groundcar'), id: 'carro', parent: { id: 'dono' } };
  item.system.sp = 0; item.system.ablacao = 2;
  item.system.janelas = { frente: { nome: 'Frente', hp: { value: 7, max: 15 } } };
  const itens = ['armored-chassis', 'heavy-chassis', 'seating-upgrade', 'bulletproof-glass'].map(id => {
    const upgrade = modelo(`core_upgrades:${id}`);
    upgrade.system.instaladoEm = item.id;
    return upgrade;
  });
  return { item, itens };
}

test('C46.2: o espelho usa os números da wiki e os upgrades do CORE, sem mudar vidro nem montagem', () => {
  // Wiki, system-rules.js:538: carro compacto, 50 SDP, 4 assentos e MOVE20; system-criacao.js:269 e :271: +2 e +20.
  const wiki = ler('../../system-rules.js'), criacao = ler('../../system-criacao.js');
  const core = JSON.parse(ler('../../cyberpunk-red-core/babele/en/cyberpunk-red-core.core_upgrades.json')).entries;
  assert.ok(wiki.includes("['Carro compacto', '50', '4', '20', '30.000eb']"));
  assert.match(criacao, /id: 'Heavy Chassis'.*\+20 SDP/);
  assert.match(criacao, /id: 'Seating Upgrade'.*Mais dois assentos/);
  assert.match(core['Armored Chassis'].description, /SP13/);
  const { item, itens } = frota(), antes = structuredClone({ item, itens });
  assert.deepEqual(estadoDoItemVeiculo(item, itens), {
    name: item.name, img: item.img,
    system: { sdp: { value: 50, max: 70 }, assentos: 6, velocidade: { combate: 20, narrativa: item.system.velocidade.narrativa }, tipo: 'terrestre', sp: 13, ablacao: 2 }
  });
  assert.deepEqual({ item, itens }, antes);
  assert.equal(estadoDoItemVeiculo(item, itens).system.janelas, undefined);
  assert.equal(estadoDoItemVeiculo({ type: 'arma' }, itens), null);
  assert.equal(estadoDoItemVeiculo(null), null);
});

test('C46.2: item já preparado não soma upgrades de novo e ignora os de outro veículo', () => {
  const { item, itens } = frota();
  item._source = { system: structuredClone(item.system) };
  item.system.sdp.max = 70; item.system.assentos = 6;
  const outro = modelo('core_upgrades:heavy-chassis'); outro.system.instaladoEm = 'outro';
  assert.equal(estadoDoItemVeiculo(item, [...itens, outro]).system.sdp.max, 70);
  assert.equal(estadoDoItemVeiculo(item, [...itens, outro]).system.assentos, 6);
  const estado = estadoDoItemVeiculo(item, itens);
  estado.system.sdp.value = 0; estado.system.velocidade.combate = 0;
  assert.equal(item._source.system.sdp.value, 50);
  assert.equal(item._source.system.velocidade.combate, 20);
});

test('C46.2: edição do ator devolve máximos à base do item sem acumular upgrades ou conservar SP do Chassis', () => {
  const { item, itens } = frota();
  const mudancas = alteracoesDoVeiculoNoItem(item, itens, {
    system: { sdp: { value: 60, max: 80 }, assentos: 8, sp: 13, ablacao: 3, velocidade: { combate: 40, narrativa: 'Nova' } },
    name: 'Carro da Nomad', img: 'carro.webp', flags: { proibida: true }
  });
  assert.deepEqual(mudancas, { name: 'Carro da Nomad', img: 'carro.webp', 'system.velocidade.combate': 40,
    'system.velocidade.narrativa': 'Nova', 'system.ablacao': 3, 'system.sdp.max': 60, 'system.assentos': 6, 'system.sdp.value': 60 });
  item.system.sdp = { value: 60, max: mudancas['system.sdp.max'] }; item.system.assentos = mudancas['system.assentos'];
  assert.equal(estadoDoItemVeiculo(item, itens).system.sdp.max, 80);
  assert.equal(estadoDoItemVeiculo(item, itens).system.assentos, 8);
  assert.deepEqual(alteracoesDoVeiculoNoItem(item, itens, estadoDoItemVeiculo(item, itens)), {});
  assert.equal(estadoDoItemVeiculo(item, itens.filter(upgrade => upgrade.name !== 'Armored Chassis')).system.sp, 0);
});

test('C46.2: a edição limita SDP ao máximo e nunca grava derivações, janelas ou flags no item', () => {
  const { item, itens } = frota(), antes = structuredClone(item);
  assert.deepEqual(alteracoesDoVeiculoNoItem(item, itens, {
    'system.sdp.max': 10, 'system.sdp.value': 99, 'system.assentos': -10,
    'system.sp': 1, 'system.ablacao': -2, 'system.blindagem.sp': 99, 'system.notas': 'Do ator',
    'system.janelas.frente.hp.value': 15, 'flags.cpr-fieldbook.veiculoAtor': 'errado'
  }), { 'system.ablacao': 0, 'system.sdp.max': 0, 'system.assentos': 0, 'system.sdp.value': 20 });
  assert.deepEqual(alteracoesDoVeiculoNoItem(item, itens, { 'system.sdp.max': 30 }), { 'system.sdp.max': 10, 'system.sdp.value': 30 });
  assert.deepEqual(item, antes);
  assert.deepEqual(alteracoesDoVeiculoNoItem({ type: 'arma' }, itens, { name: 'Não' }), {});
});

test('C46.2: nome, imagem, tipo e velocidades acompanham o item, com o estado próprio do NPC preservado', () => {
  const item = modelo('core_vehicles:helicopter'); item.id = 'heli';
  assert.equal(estadoDoItemVeiculo(item).system.tipo, 'aereo');
  assert.deepEqual(alteracoesDoVeiculoNoItem(item, [], { name: 'Helicóptero', img: 'heli.webp',
    'system.tipo': 'maritimo', 'system.sp': 20, 'system.sdp.value': -1 }), {
    name: 'Helicóptero', img: 'heli.webp', 'system.tipo': 'maritimo', 'system.sp': 20, 'system.sdp.value': 0
  });
  assert.deepEqual(alteracoesDoVeiculoNoItem(item, [], { 'system.tipo': 'invalido' }), {});
});

test('C46.2: só a ligação recíproca grava no item; cópia, token solto e vínculo antigo gravam no ator', () => {
  const { item } = frota();
  item.flags['cpr-fieldbook'].veiculoAtor = 'espelho';
  const ator = { id: 'espelho', type: 'veiculo', flags: { 'cpr-fieldbook': { veiculoItem: { atorId: 'dono', itemId: item.id } } } };
  assert.equal(vinculoVeicularValido(ator, item), true);
  assert.equal(destinoDaEscritaVeicular(ator, item), 'item');
  for (const [campo, valor] of [['atorId', 'copia'], ['itemId', 'outro']]) {
    const antigo = ator.flags['cpr-fieldbook'].veiculoItem[campo];
    ator.flags['cpr-fieldbook'].veiculoItem[campo] = valor;
    assert.equal(destinoDaEscritaVeicular(ator, item), 'ator', campo);
    ator.flags['cpr-fieldbook'].veiculoItem[campo] = antigo;
  }
  item.parent.id = 'personagem-copiado';
  assert.equal(destinoDaEscritaVeicular(ator, item), 'ator');
  item.parent.id = 'dono';
  for (const documento of [ator, item.parent]) {
    documento.isToken = true;
    assert.equal(destinoDaEscritaVeicular(ator, item), 'ator');
    documento.isToken = false;
  }
  item.flags['cpr-fieldbook'].veiculoAtor = 'outro';
  assert.equal(destinoDaEscritaVeicular(ator, item), 'ator');
  assert.equal(destinoDaEscritaVeicular(ator, null), 'ator');
  assert.equal(destinoDaEscritaVeicular({ type: 'veiculo' }, item), 'ator');
  assert.equal(vinculoVeicularValido({ type: 'veiculo' }, { type: 'veiculo', parent: {} }), false);
});
