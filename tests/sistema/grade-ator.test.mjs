import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  arrumar, conferirLugar, gradeParaUso, lugaresDoPersonagem, mudancasDoUso, reconciliar, usoDoItem, usoDoLugar
} from '../../foundry-sistema/scripts/compartilhado/regras-grade.mjs';
import { arrumarDadosDoAtor, bodyDoAtor, estadoDe, itemNaRegra, lugaresDoAtor } from '../../foundry-sistema/scripts/regras-grade-ator.mjs';
import { migrarDados, PASSOS, VERSAO_DOS_DADOS } from '../../foundry-sistema/scripts/migracao.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const doCatalogo = (id, extra = {}) => ({ id, catalogo: id, ...structuredClone(catalogo[id]), ...extra });
const noLugar = (lugar, x = 0, y = 0, girado = false) => ({ lugar, x, y, girado });
// Os dados de um item do ator (o toObject), com o _id e as flags.
const dado = (_id, id, { system = {}, flags = {}, name } = {}) => {
  const base = structuredClone(catalogo[id]);
  return { _id, name: name ?? base.name, type: base.type, system: { ...base.system, ...system }, flags: { 'cpr-fieldbook': { catalogo: id, ...flags } }, effects: [] };
};

test('C108: o uso de um item agora: o campo, o equipada ou o lugar (a arma guardada só existe pelo lugar)', () => {
  const rifle = doCatalogo('core_weapons:assault-rifle');
  assert.equal(usoDoItem({ ...rifle, system: { ...rifle.system, equipada: true } }), 'equipado');
  assert.equal(usoDoItem({ ...rifle, system: { ...rifle.system, equipada: false } }), 'carregando');
  assert.equal(usoDoItem({ ...rifle, grade: noLugar('esconderijo') }), 'guardado');
  assert.equal(usoDoItem({ ...rifle, grade: noLugar('veiculo:moto') }), 'guardado');
  assert.equal(usoDoItem({ ...rifle, grade: { ...noLugar('organizar'), uso: 'guardado' } }), 'guardado');
  assert.equal(usoDoItem({ ...rifle, grade: noLugar('corpo:maoPrincipal') }), 'carregando', 'a mão sem o equipada não equipa');
  assert.equal(usoDoItem({ ...rifle, system: { ...rifle.system, equipada: true }, grade: noLugar('esconderijo') }), 'equipado');
  const agent = doCatalogo('core_gear:agent');
  assert.equal(usoDoItem({ ...agent, system: { ...agent.system, uso: 'guardado' }, grade: noLugar('bolsos') }), 'guardado', 'o campo vale mais que o lugar');
  assert.equal(usoDoItem({ ...agent, system: { ...agent.system, uso: 'errado' }, grade: noLugar('esconderijo') }), 'guardado');
  assert.equal(usoDoItem({ type: 'municao', system: {}, grade: noLugar('esconderijo') }), 'guardado');
  assert.equal(usoDoItem({ type: 'municao', system: {}, grade: noLugar('cinto') }), 'carregando');
  assert.equal(usoDoItem({ type: 'municao', system: {} }), 'carregando');
  assert.equal(usoDoItem({ type: 'programa', system: {}, grade: { ...noLugar('organizar'), uso: 'nada' } }), 'carregando');
});

test('C108: o que muda no item para ter o uso: o equipada (a arma e a armadura), o uso (o equipamento, a roupa, a droga e o deck) ou nada', () => {
  assert.deepEqual(mudancasDoUso({ type: 'arma' }, 'equipado'), { 'system.equipada': true });
  assert.deepEqual(mudancasDoUso({ type: 'armadura' }, 'guardado'), { 'system.equipada': false });
  assert.deepEqual(mudancasDoUso({ type: 'arma' }, 'carregando'), { 'system.equipada': false });
  for (const type of ['equipamento', 'roupa', 'droga', 'cyberdeck']) assert.deepEqual(mudancasDoUso({ type }, 'guardado'), { 'system.uso': 'guardado' }, type);
  for (const type of ['municao', 'cyberware', 'programa', 'upgrade']) assert.deepEqual(mudancasDoUso({ type }, 'guardado'), {}, type);
});

const LUGARES = lugaresDoPersonagem({ moradia: { descricao: 'Quitinete' }, mochila: 'P' });

test('C108: o lugar acompanha o uso: fica onde está se ainda vale; senão, o primeiro livre do uso, sem mexer nos outros; sem nenhum, "Para organizar" com o uso', () => {
  const rifle = doCatalogo('core_weapons:assault-rifle', { id: 'rifle', name: 'Rifle' });
  const pistola = doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', name: 'Pistola' });
  const outra = doCatalogo('core_weapons:medium-pistol', { id: 'outra', name: 'Outra' });
  // Equipou pela ficha: da costas para as mãos.
  assert.deepEqual(gradeParaUso({ ...rifle, grade: noLugar('costas') }, 'equipado', LUGARES, []), { lugar: 'corpo:maoPrincipal', x: 0, y: 0, girado: false });
  // Já está nas mãos e continua equipado: fica.
  assert.equal(gradeParaUso({ ...rifle, grade: noLugar('corpo:maoPrincipal') }, 'equipado', LUGARES, []), null);
  // Desequipou: vai para as costas; com as costas ocupadas, para a mochila não cabe (5×2 na 4×4) e vai para organizar.
  assert.deepEqual(gradeParaUso({ ...rifle, grade: noLugar('corpo:maoPrincipal') }, 'carregando', LUGARES, []), noLugar('costas'));
  const costasOcupadas = [{ item: doCatalogo('core_weapons:shotgun', { id: 'esc', name: 'Escopeta' }), grade: noLugar('costas') }];
  assert.deepEqual(gradeParaUso({ ...rifle, grade: noLugar('corpo:maoPrincipal') }, 'carregando', LUGARES, costasOcupadas), { ...noLugar('organizar'), uso: 'carregando' });
  // O item novo (sem lugar) não mexe nos outros: a pistola com o coldre ocupado vai para os bolsos.
  assert.deepEqual(gradeParaUso(pistola, 'carregando', LUGARES, [{ item: outra, grade: noLugar('coldre') }]), noLugar('bolsos'));
  assert.deepEqual(gradeParaUso(pistola, 'carregando', LUGARES, [{ item: outra, grade: noLugar('coldre') }, { item: doCatalogo('core_gear:computer', { id: 'pc', name: 'PC' }), grade: noLugar('bolsos', 0, 0) }]), noLugar('bolsos', 2, 0), 'os bolsos 4×2 com o computador (2×2) de lado');
  // O lugar de antes não vale mais (o coldre que outro pegou): sai.
  assert.deepEqual(gradeParaUso({ ...pistola, grade: noLugar('coldre') }, 'carregando', LUGARES, [{ item: outra, grade: noLugar('coldre') }]), noLugar('bolsos'));
  // Guardou: vai ao esconderijo.
  assert.deepEqual(gradeParaUso({ ...pistola, grade: noLugar('coldre') }, 'guardado', LUGARES, []), noLugar('esconderijo'));
  // O que não ocupa lugar: nada.
  assert.equal(gradeParaUso({ ...pistola, montada: true }, 'carregando', LUGARES, []), null);
  // O próprio item na lista dos outros não o atrapalha.
  assert.equal(gradeParaUso({ ...pistola, grade: noLugar('coldre') }, 'carregando', LUGARES, [{ item: pistola, grade: noLugar('coldre') }]), null);
});

test('C108: o lugar que some ou encolhe manda para "Para organizar" o que não cabe mais, com o uso; o mexido por último fica', () => {
  const semMochila = lugaresDoPersonagem({ moradia: { descricao: 'Quitinete' } });
  const pc = doCatalogo('core_gear:computer', { id: 'pc', name: 'Computador', grade: { ...noLugar('mochila'), rev: 3 } });
  const faca = doCatalogo('core_weapons:light-melee', { id: 'faca', name: 'Faca', grade: { ...noLugar('bolsos'), rev: 1 } });
  const rifle = doCatalogo('core_weapons:assault-rifle', { id: 'rifle', name: 'Rifle', grade: { ...noLugar('veiculo:moto'), rev: 2 } });
  const solto = doCatalogo('core_gear:agent', { id: 'solto', name: 'Agent', grade: { ...noLugar('organizar'), uso: 'carregando' } });
  assert.deepEqual(reconciliar([pc, faca, rifle, solto], semMochila), {
    pc: { ...noLugar('organizar'), uso: 'carregando' }, rifle: { ...noLugar('organizar'), uso: 'guardado' }
  });
  // Dois no mesmo quadrado (o mestre e o jogador ao mesmo tempo): o de rev maior fica; empatados, o de id menor.
  const agentA = doCatalogo('core_gear:agent', { id: 'a', name: 'Agent', grade: { ...noLugar('bolsos'), rev: 1 } });
  const agentB = doCatalogo('core_gear:agent', { id: 'b', name: 'Agent', grade: { ...noLugar('bolsos'), rev: 2 } });
  assert.deepEqual(Object.keys(reconciliar([agentA, agentB], LUGARES)), ['a']);
  assert.deepEqual(Object.keys(reconciliar([{ ...agentB, grade: { ...agentB.grade, rev: 1 } }, agentA], LUGARES)), ['b']);
  assert.deepEqual(reconciliar([faca], LUGARES), {});
  // O que não ocupa lugar fica de fora.
  assert.deepEqual(reconciliar([{ ...faca, montada: true, grade: noLugar('veiculo:sumiu') }], LUGARES), {});
});

test('C108: o arrumar com os fixos não mexe neles nem cai em cima deles', () => {
  const pistola = doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', name: 'Pistola', uso: 'carregando' });
  const agent = doCatalogo('core_gear:agent', { id: 'agent', name: 'Agent', uso: 'carregando' });
  const fixo = { item: doCatalogo('core_weapons:medium-pistol', { id: 'fixa', name: 'Fixa' }), grade: noLugar('coldre') };
  const ocupa = { item: doCatalogo('core_gear:computer', { id: 'pc', name: 'PC' }), grade: noLugar('bolsos') };
  const resultado = arrumar([pistola, agent], LUGARES, { fixos: [fixo, ocupa] });
  assert.deepEqual(resultado, { pistola: noLugar('bolsos', 2, 0), agent: noLugar('cinto') });
  assert.equal(resultado.fixa, undefined);
  assert.deepEqual(arrumar([pistola], LUGARES, { fixos: [{ item: fixo.item, grade: null }] }).pistola, noLugar('coldre'), 'o fixo sem lugar não ocupa');
  // Sem uso conhecido, o que não cabe vai a "Para organizar" como carregando (o padrão do sistema).
  const tenda = doCatalogo('core_gear:tent-and-camping-equipment', { id: 'tenda', name: 'Tenda', uso: undefined });
  assert.deepEqual(arrumar([tenda], lugaresDoPersonagem({ moradia: { descricao: 'Na rua ou num veículo' } })).tenda, { ...noLugar('organizar'), uso: 'carregando' });
  assert.deepEqual(arrumar([{ ...tenda, uso: 'guardado' }], lugaresDoPersonagem({ moradia: { descricao: 'Na rua ou num veículo' } })).tenda, { ...noLugar('organizar'), uso: 'guardado' });
});

test('C108: o item do Foundry como a regra o lê, do documento (o _source) ou dos dados; o que está dentro de outro não ocupa lugar', () => {
  const dados = dado('i1', 'core_weapons:heavy-pistol', { flags: { grade: { ...noLugar('coldre'), rev: 2 } } });
  const regra = itemNaRegra(dados);
  assert.deepEqual([regra.id, regra.name, regra.type, regra.catalogo, regra.montada, regra.grade, regra.mochila], ['i1', 'Heavy Pistol', 'arma', 'core_weapons:heavy-pistol', false, { ...noLugar('coldre'), rev: 2 }, null]);
  assert.deepEqual(itemNaRegra({ _source: dados, id: 'outro' }).id, 'i1');
  assert.equal(itemNaRegra({ ...dados, system: { ...dados.system, instaladoEm: 'veiculo1' } }).montada, true);
  assert.equal(itemNaRegra({ ...dados, flags: { 'cpr-fieldbook': { armaDoCyberware: 'cyber1' } } }).montada, true);
  assert.equal(itemNaRegra({ ...dados, flags: { 'cpr-fieldbook': { armaDoUpgrade: 'up1' } } }).montada, true);
  assert.equal(itemNaRegra(dado('p1', 'core_programs:armor', { system: { instaladoEm: 'deck1' } })).montada, true);
  assert.equal(itemNaRegra(dado('c1', 'core_gear:carryall', { flags: { mochila: 'G' } })).mochila, 'G');
});

test('C108: os lugares do ator: a moradia, um porta-malas por veículo e a mochila do Carryall nas costas, com o tamanho dele', () => {
  const ator = { type: 'personagem', system: { moradia: { custo: 2500, descricao: 'Apartamento de dois quartos' }, atributos: { body: { valor: 7 } } } };
  const itens = [
    dado('v1', 'core_vehicles:roadbike', { name: 'Moto' }), dado('c1', 'core_gear:carryall', { flags: { mochila: 'M', grade: noLugar('corpo:mochila') } }),
    dado('v2', 'core_vehicles:compact-groundcar', { system: { instaladoEm: 'outro' } })
  ].map(itemNaRegra);
  const porId = Object.fromEntries(lugaresDoAtor(ator, itens).map(lugar => [lugar.id, lugar]));
  assert.deepEqual([porId.esconderijo.l, porId.esconderijo.a], [10, 8]);
  assert.deepEqual([porId['veiculo:v1'].nome, porId['veiculo:v1'].l, porId['veiculo:v1'].a], ['Porta-malas: Moto', 4, 2]);
  assert.equal(porId['veiculo:v2'], undefined);
  assert.deepEqual([porId.mochila.l, porId.mochila.a], [6, 5]);
  assert.equal(bodyDoAtor(ator), 7);
  assert.equal(bodyDoAtor({ _source: ator }), 7);
  assert.equal(bodyDoAtor({}), 0);
  // Sem tamanho, a P; o Carryall fora das costas não faz mochila; o equipado ainda sem lugar só conta como previsto.
  const semTamanho = [dado('c1', 'core_gear:carryall', { flags: { grade: noLugar('corpo:mochila') } })].map(itemNaRegra);
  assert.deepEqual(['l', 'a'].map(k => lugaresDoAtor(ator, semTamanho).find(lugar => lugar.id === 'mochila')[k]), [4, 4]);
  const nosBolsos = [dado('c1', 'core_gear:carryall', { flags: { grade: noLugar('bolsos') } })].map(itemNaRegra);
  assert.equal(lugaresDoAtor(ator, nosBolsos).find(lugar => lugar.id === 'mochila'), undefined);
  const equipado = [dado('c1', 'core_gear:carryall', { system: { uso: 'equipado' }, flags: { mochila: 'G' } })].map(itemNaRegra);
  assert.equal(lugaresDoAtor(ator, equipado).find(lugar => lugar.id === 'mochila'), undefined);
  assert.deepEqual(['l', 'a'].map(k => lugaresDoAtor(ator, equipado, { previsto: true }).find(lugar => lugar.id === 'mochila')[k]), [8, 6]);
  assert.deepEqual(estadoDe([...itens, itemNaRegra(dado('x', 'core_gear:agent'))], 'c1').map(({ item }) => item.id), []);
});

// Um personagem de hoje (antes do C108), nos dados do toObject.
const personagemDeHoje = () => ({
  _id: 'ator000000000108', name: 'Hoje', type: 'personagem', system: { moradia: { custo: 500, descricao: 'Hotel cápsula' }, atributos: { body: { valor: 6 } } }, effects: [], flags: {},
  items: [
    dado('arma1', 'core_weapons:assault-rifle', { system: { equipada: true } }), dado('arma2', 'core_weapons:heavy-pistol'),
    dado('mochila1', 'core_gear:carryall', { system: { uso: 'equipado' }, flags: { mochila: 'M' } }), dado('pc1', 'core_gear:computer'),
    dado('tenda1', 'core_gear:tent-and-camping-equipment', { system: { uso: 'guardado' } }), dado('agent1', 'core_gear:agent'),
    dado('prog1', 'core_programs:armor', { system: { instaladoEm: 'deck1' } }), dado('moto1', 'core_vehicles:roadbike', { name: 'Moto' }),
    dado('capacete1', 'core_armor:kevlar-head', { flags: { grade: { ...noLugar('veiculo:moto1'), rev: 4 } } })
  ]
});

test('C108: a migração 11 dá um lugar a cada item sem lugar, sem mudar o uso e sem mexer no que já tem; rodar de novo não muda nada', () => {
  const dados = personagemDeHoje();
  assert.equal(arrumarDadosDoAtor(dados), true);
  const grade = id => dados.items.find(item => item._id === id).flags['cpr-fieldbook'].grade;
  assert.deepEqual(grade('arma1'), { ...noLugar('corpo:maoPrincipal'), rev: 1 });
  assert.deepEqual(grade('arma2'), { ...noLugar('coldre'), rev: 1 });
  assert.deepEqual(grade('mochila1'), { ...noLugar('corpo:mochila'), rev: 1 });
  // O Carryall equipado já faz a mochila M (6×5) nesta mesma arrumação; o computador (2×2) vai antes aos bolsos.
  assert.deepEqual(grade('pc1'), { ...noLugar('bolsos'), rev: 1 });
  assert.deepEqual(grade('tenda1'), { ...noLugar('esconderijo'), rev: 1 });
  assert.deepEqual(grade('agent1'), { ...noLugar('bolsos', 2, 0), rev: 1 });
  assert.equal(grade('prog1'), undefined, 'o programa no deck não ocupa lugar');
  assert.equal(grade('moto1'), undefined, 'o veículo é um lugar');
  assert.deepEqual(grade('capacete1'), { ...noLugar('veiculo:moto1'), rev: 4 }, 'o que já tem lugar fica');
  // Ninguém mudou de uso, e o resultado é válido item por item.
  const lugares = lugaresDoAtor(dados, dados.items.map(itemNaRegra));
  const estado = [];
  for (const item of dados.items.map(itemNaRegra).filter(item => item.grade)) {
    assert.equal(conferirLugar(lugares, estado, item, item.grade, { body: 6 }), null, item.name);
    const antes = personagemDeHoje().items.map(itemNaRegra).find(outro => outro.id === item.id);
    assert.equal(usoDoLugar(item.grade.lugar, item.grade.uso), usoDoItem({ ...antes, grade: antes.grade ?? item.grade }), `${item.name}: o uso`);
    estado.push({ item, grade: item.grade });
  }
  const copia = structuredClone(dados);
  assert.equal(arrumarDadosDoAtor(copia), false);
  assert.deepEqual(copia, dados);
  // Só o personagem: o capanga e o contêiner ficam como estão.
  for (const type of ['capanga', 'conteiner']) {
    const outro = { ...personagemDeHoje(), type };
    assert.equal(arrumarDadosDoAtor(outro), false);
    assert.deepEqual(outro, { ...personagemDeHoje(), type });
  }
});

test('C108: o ator criado com os itens dentro, ainda sem _id, arruma pela posição na lista', () => {
  const dados = personagemDeHoje();
  for (const item of dados.items) delete item._id;
  assert.equal(arrumarDadosDoAtor(dados), true);
  assert.deepEqual(dados.items[1].flags['cpr-fieldbook'].grade, { ...noLugar('coldre'), rev: 1 });
  assert.deepEqual(dados.items[5].flags['cpr-fieldbook'].grade, { ...noLugar('bolsos', 2, 0), rev: 1 });
});

test('C108: a migração 11 está nos passos, e o mundo vai à versão 11 dos dados', () => {
  const passo = PASSOS.find(outro => outro.versao === 11);
  assert.ok(passo && passo.ator === arrumarDadosDoAtor && !passo.item);
  assert.equal(VERSAO_DOS_DADOS, 11);
  const depois = migrarDados(personagemDeHoje(), { documento: 'Actor', passos: [passo], catalogo });
  assert.deepEqual(depois.items.find(item => item._id === 'arma2').flags['cpr-fieldbook'].grade, { ...noLugar('coldre'), rev: 1 });
  // O item do mundo, sozinho, não passa pelo passo (não é de um personagem).
  const solto = dado('solto', 'core_gear:agent');
  assert.deepEqual(migrarDados(solto, { documento: 'Item', passos: [passo], catalogo }), solto);
});
