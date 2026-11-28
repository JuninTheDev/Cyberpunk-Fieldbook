import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  TAMANHO_DA_ARMA, MUNICAO, TAMANHO_DO_CATALOGO, CLASSE_DO_VEICULO, MORADIAS, EMPILHAVEIS, TAMANHOS_DA_MOCHILA,
  tamanhoDoItem, dimensoes, limiteDaPilha, pilhasNecessarias, juntarPilhas, moradiaDoPersonagem, classeDoVeiculo,
  lugaresDoPersonagem, usoDoLugar, maosDaArma, encaixesDoItem, conferirLugar, arrumar
} from '../../foundry-sistema/scripts/compartilhado/regras-grade.mjs';
import * as regras from '../../foundry-sistema/scripts/regras.mjs';

const catalogo = JSON.parse(fs.readFileSync(new URL('../../foundry-sistema/dados/catalogo.json', import.meta.url), 'utf8')).itens;
const doCatalogo = (id, extra = {}) => ({ id, catalogo: id, ...structuredClone(catalogo[id]), ...extra });
const medida = item => { const t = tamanhoDoItem(item); return t && [t.l, t.a, t.pilha]; };

test('C107: as armas têm o tamanho da tabela do plano, pelo tipo; a natural e a montada não ocupam lugar', () => {
  const esperado = {
    'core_weapons:medium-pistol': [2, 1], 'core_weapons:heavy-pistol': [2, 2], 'core_weapons:very-heavy-pistol': [2, 2],
    'core_weapons:smg': [2, 2], 'core_weapons:heavy-smg': [2, 2], 'core_weapons:shotgun': [4, 2], 'core_weapons:assault-rifle': [5, 2],
    'core_weapons:sniper-rifle': [6, 2], 'core_weapons:rocket-launcher': [6, 2], 'core_weapons:grenade-launcher': [4, 2]
  };
  for (const [id, [l, a]] of Object.entries(esperado)) assert.deepEqual(medida(doCatalogo(id)), [l, a, 1], id);
  // A SMG pesada do CORE é do tipo smg; a heavySmg é a do Black Chrome.
  assert.deepEqual(TAMANHO_DA_ARMA.heavySmg, [3, 2]);
  assert.deepEqual(TAMANHO_DA_ARMA.lightMelee, [1, 2]);
  assert.deepEqual(TAMANHO_DA_ARMA.medMelee, [1, 3]);
  assert.deepEqual(TAMANHO_DA_ARMA.heavyMelee, [1, 4]);
  assert.deepEqual(TAMANHO_DA_ARMA.vHeavyMelee, [2, 4]);
  assert.deepEqual(TAMANHO_DA_ARMA.bow, [4, 2]);
  assert.deepEqual(TAMANHO_DA_ARMA.thrownWeapon, [1, 1]);
  assert.equal(tamanhoDoItem({ type: 'arma', system: { tipo: 'unarmed' } }), null);
  assert.equal(tamanhoDoItem({ type: 'arma', system: { tipo: 'martialArts' } }), null);
  assert.equal(tamanhoDoItem({ ...doCatalogo('core_weapons:assault-rifle'), montada: true }), null);
  // O tipo que o CORE ainda não tem fica no médio, não some.
  assert.deepEqual(medida({ type: 'arma', system: { tipo: 'novo' } }), [2, 2, 1]);
});

test('C107: a munição empilha por tipo, e a granada, a droga e os consumíveis também', () => {
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'medPistol' } }), [1, 1, 30]);
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'rifle' } }), [1, 1, 20]);
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'shotgunSlug' } }), [1, 1, 10]);
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'grenade' } }), [1, 1, 4]);
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'rocket' } }), [2, 1, 1]);
  assert.deepEqual(medida({ type: 'municao', system: { tipo: 'desconhecida' } }), [1, 1, 10]);
  assert.deepEqual(medida({ type: 'droga', system: {} }), [1, 1, 10]);
  assert.deepEqual(medida(doCatalogo('core_gear:road-flare')), [1, 1, 10]);
  assert.deepEqual(medida(doCatalogo('core_gear:agent')), [1, 1, 1]);
  assert.deepEqual(medida(doCatalogo('core_gear:computer')), [2, 2, 1]);
  assert.deepEqual(medida(doCatalogo('core_gear:tent-and-camping-equipment')), [3, 3, 1]);
  // Todo tipo de munição do catálogo está na tabela.
  for (const item of Object.values(catalogo).filter(item => item.type === 'municao')) assert.ok(MUNICAO[item.system.tipo], item.name);
});

test('C107: a armadura guardada vai pelo peso (a penalidade); o escudo, a de cabeça e a roupa têm o tamanho delas', () => {
  assert.deepEqual(medida(doCatalogo('core_armor:kevlar-body')), [3, 3, 1]);
  assert.deepEqual(medida(doCatalogo('core_armor:medium-armorjack-body')), [3, 4, 1]);
  assert.deepEqual(medida(doCatalogo('core_armor:flak-body')), [4, 4, 1]);
  // A pesada começa na penalidade 3 (nenhuma do catálogo tem 3, mas a do mestre pode ter).
  assert.deepEqual(medida({ type: 'armadura', system: { sp: { cabeca: { max: 0 }, corpo: { max: 14 } }, penalidade: 3 } }), [4, 4, 1]);
  assert.deepEqual(medida({ type: 'armadura', system: { sp: { cabeca: { max: 0 }, corpo: { max: 12 } }, penalidade: 1 } }), [3, 4, 1]);
  assert.deepEqual(medida(doCatalogo('core_armor:kevlar-head')), [2, 2, 1]);
  assert.deepEqual(medida(doCatalogo('core_armor:bullet-proof-shield')), [3, 4, 1]);
  assert.deepEqual(medida(doCatalogo('core_armor:bodyweight-suit')), [3, 3, 1]);
  assert.deepEqual(medida({ type: 'roupa', system: { tipo: 'jacket' } }), [2, 2, 1]);
  assert.deepEqual(medida({ type: 'roupa', system: { tipo: 'glasses' } }), [1, 1, 1]);
  assert.deepEqual(medida({ type: 'roupa', system: { tipo: 'jewelry' } }), [1, 1, 1]);
});

test('C107: o cyberware instalado não ocupa lugar; o solto, a opção, a base de membro e a de borgware', () => {
  assert.equal(tamanhoDoItem({ type: 'cyberware', system: { tipo: 'cyberArm', fundacional: true, instalado: true } }), null);
  assert.deepEqual(medida({ type: 'cyberware', system: { tipo: 'cyberArm', fundacional: true, instalado: false } }), [2, 4, 1]);
  assert.deepEqual(medida({ type: 'cyberware', system: { tipo: 'cyberLeg', fundacional: true } }), [2, 4, 1]);
  assert.deepEqual(medida({ type: 'cyberware', system: { tipo: 'borgware', fundacional: true } }), [3, 4, 1]);
  assert.deepEqual(medida({ type: 'cyberware', system: { tipo: 'cyberArm', fundacional: false } }), [1, 1, 1]);
  assert.deepEqual(medida({ type: 'cyberdeck', system: {} }), [2, 2, 1]);
  assert.deepEqual(medida({ type: 'programa', system: {} }), [1, 1, 1]);
  assert.deepEqual(medida({ type: 'upgrade', system: { alvo: 'arma' } }), [1, 1, 1]);
  assert.deepEqual(medida({ type: 'upgrade', system: { alvo: 'veiculo' } }), [3, 3, 1]);
  assert.equal(tamanhoDoItem({ type: 'lesao', system: {} }), null);
  assert.equal(tamanhoDoItem({ type: 'veiculo', system: {} }), null);
  // A arquitetura da NET está nos compêndios do sistema, não no catálogo da wiki (o G4 achou).
  assert.equal(tamanhoDoItem({ type: 'arquitetura', system: {} }), null);
});

test('C107: todo item do catálogo tem tamanho, menos a lesão, o veículo e a arma natural; as tabelas só citam ids que existem', () => {
  const semTamanho = {};
  for (const [id, item] of Object.entries(catalogo)) {
    const tamanho = tamanhoDoItem({ catalogo: id, ...item });
    if (!tamanho) { semTamanho[item.type] = (semTamanho[item.type] ?? 0) + 1; continue; }
    for (const campo of ['l', 'a', 'pilha']) assert.ok(Number.isSafeInteger(tamanho[campo]) && tamanho[campo] >= 1, `${id}: ${campo}`);
  }
  const contar = tipo => Object.values(catalogo).filter(item => item.type === tipo).length;
  assert.deepEqual(semTamanho, { arma: 2, lesao: contar('lesao'), veiculo: contar('veiculo') });
  for (const id of Object.keys(TAMANHO_DO_CATALOGO)) assert.equal(catalogo[id]?.type, 'equipamento', id);
  for (const id of Object.keys(CLASSE_DO_VEICULO)) assert.equal(catalogo[id]?.type, 'veiculo', id);
  // Cada veículo do catálogo tem a classe dele, sem cair no padrão.
  for (const [id, item] of Object.entries(catalogo).filter(([, item]) => item.type === 'veiculo')) assert.ok(CLASSE_DO_VEICULO[id], item.name);
  // Todo tipo de arma do catálogo está na tabela ou é natural.
  for (const item of Object.values(catalogo).filter(item => item.type === 'arma')) assert.ok(TAMANHO_DA_ARMA[item.system.tipo] || ['martialArts', 'unarmed'].includes(item.system.tipo), item.name);
});

test('C107: girar troca a largura pela altura', () => {
  assert.deepEqual(dimensoes({ l: 5, a: 2 }), { l: 5, a: 2 });
  assert.deepEqual(dimensoes({ l: 5, a: 2 }, true), { l: 2, a: 5 });
});

test('C107: as pilhas têm teto por item da grade; juntar enche o destino e deixa o resto', () => {
  assert.equal(limiteDaPilha({ type: 'municao', system: { tipo: 'rifle' } }), 20);
  assert.equal(limiteDaPilha({ type: 'droga', system: {} }), 10);
  assert.equal(limiteDaPilha({ type: 'arma', system: { tipo: 'thrownWeapon' } }), 1);
  assert.equal(limiteDaPilha({ type: 'cyberdeck', system: {} }), 1);
  assert.deepEqual(pilhasNecessarias(70, 30), [30, 30, 10]);
  assert.deepEqual(pilhasNecessarias(30, 30), [30]);
  assert.deepEqual(pilhasNecessarias(0, 30), []);
  assert.deepEqual(pilhasNecessarias(3, 0), [1, 1, 1]);
  assert.deepEqual(juntarPilhas(20, 15, 30), { destino: 30, origem: 5 });
  assert.deepEqual(juntarPilhas(5, 10, 30), { destino: 15, origem: 0 });
  assert.equal(juntarPilhas(5, 30, 30), null);
  assert.equal(juntarPilhas(0, 10, 30), null);
});

test('C107: o que se repete do sistema continua igual (o EMPILHAVEIS e o maosDaArma do regras.mjs)', () => {
  assert.deepEqual(EMPILHAVEIS, regras.EMPILHAVEIS);
  for (const item of Object.values(catalogo).filter(item => item.type === 'arma')) {
    for (const body of [0, 4, 7, 8, 12]) {
      const arma = { maos: item.system.maos, aDistancia: item.system.aDistancia };
      assert.equal(maosDaArma(arma, body), regras.maosDaArma(arma, body), `${item.name}, BODY ${body}`);
    }
  }
});

test('C107: o esconderijo vem da moradia da wiki, pelo nome, pelo id ou pelo aluguel', () => {
  // As moradias da wiki (system-criacao.js) são as da tabela, com o mesmo aluguel.
  const wiki = fs.readFileSync(new URL('../../system-criacao.js', import.meta.url), 'utf8');
  const daWiki = [...wiki.matchAll(/\{ id: '([^']+)', nome: '([^']+)', aluguel: (\d+)/g)].map(([, id, nome, aluguel]) => ({ id, nome, aluguel: Number(aluguel) }));
  assert.equal(daWiki.length, Object.keys(MORADIAS).length);
  for (const { id, nome, aluguel } of daWiki) {
    assert.equal(MORADIAS[id]?.aluguel, aluguel, id);
    assert.equal(moradiaDoPersonagem({ descricao: nome, custo: 99999 }), id, nome);
  }
  assert.equal(moradiaDoPersonagem({ descricao: 'Quitinete', custo: 0 }), 'quitinete');
  assert.equal(moradiaDoPersonagem({ descricao: 'dois-quartos' }), 'dois-quartos');
  assert.equal(moradiaDoPersonagem({ descricao: 'Cube Hotel' }), 'capsula');
  assert.equal(moradiaDoPersonagem({ descricao: 'Casa da avó', custo: 2600 }), 'dois-quartos');
  assert.equal(moradiaDoPersonagem({ descricao: 'Barraco', custo: 300 }), 'capsula');
  assert.equal(moradiaDoPersonagem({ descricao: 'Casa da avó', custo: 0 }), 'conteiner');
  assert.equal(moradiaDoPersonagem({}), 'conteiner');
  assert.equal(moradiaDoPersonagem({ descricao: 'Na rua ou num veículo' }), 'rua');
  assert.equal(moradiaDoPersonagem({ descricao: 'Conapt corporativo', custo: 0 }), 'conapt-corp');
  assert.equal(moradiaDoPersonagem({ descricao: 'Com a família do clã' }), 'cla');
});

test('C107: os lugares do personagem: os encaixes, as listas, as grades fixas, a mochila, o esconderijo e os porta-malas', () => {
  const lugares = lugaresDoPersonagem({
    moradia: { descricao: 'Quitinete', custo: 1500 }, mochila: 'M',
    veiculos: [{ id: 'm1', nome: 'Harvey', catalogo: 'black-chrome_vehicles:harvey-100' }, { id: 'h1', nome: 'Prancha', catalogo: 'black-chrome_vehicles:tanson-jetboy-hoverboard' },
      { id: 'x1', nome: 'Lancha velha', tipo: 'maritimo' }, { id: 'x2', nome: 'Caminhão', catalogo: 'core_vehicles:aerozep' }]
  });
  const porId = Object.fromEntries(lugares.map(lugar => [lugar.id, lugar]));
  assert.deepEqual(lugares.map(lugar => lugar.id), ['corpo:maoPrincipal', 'corpo:maoSecundaria', 'corpo:cabeca', 'corpo:tronco', 'corpo:deck', 'corpo:mochila', 'coldre', 'costas',
    'corpo:roupa', 'corpo:emUso', 'bolsos', 'cinto', 'mochila', 'esconderijo', 'veiculo:m1', 'veiculo:x1', 'veiculo:x2', 'organizar']);
  assert.deepEqual([porId.bolsos.l, porId.bolsos.a], [4, 2]);
  assert.deepEqual([porId.cinto.l, porId.cinto.a], [6, 1]);
  assert.deepEqual([porId.mochila.l, porId.mochila.a], [6, 5]);
  assert.deepEqual([porId.esconderijo.l, porId.esconderijo.a], [8, 6]);
  assert.deepEqual([porId['veiculo:m1'].l, porId['veiculo:m1'].a, porId['veiculo:m1'].nome], [4, 2, 'Porta-malas: Harvey']);
  assert.deepEqual([porId['veiculo:x1'].l, porId['veiculo:x1'].a], [6, 4]);
  assert.deepEqual([porId['veiculo:x2'].l, porId['veiculo:x2'].a], [12, 10]);
  assert.equal(porId.coldre.uso, 'carregando');
  assert.equal(porId['corpo:tronco'].uso, 'equipado');
  assert.equal(porId.esconderijo.uso, 'guardado');
  assert.equal(porId.organizar.uso, null);
  assert.deepEqual(TAMANHOS_DA_MOCHILA, { P: { l: 4, a: 4 }, M: { l: 6, a: 5 }, G: { l: 8, a: 6 } });
  const semNada = lugaresDoPersonagem({ moradia: { descricao: 'Na rua ou num veículo' } }).map(lugar => lugar.id);
  assert.ok(!semNada.includes('mochila') && !semNada.includes('esconderijo'));
  assert.equal(classeDoVeiculo({ tipo: 'terrestre' }), 'carro');
  assert.equal(classeDoVeiculo({ tipo: 'aereo' }), 'carro');
  assert.equal(classeDoVeiculo({ catalogo: 'core_vehicles:roadbike', tipo: 'maritimo' }), 'moto');
});

test('C107: o lugar decide o uso; "Para organizar" fica com o que o item tinha', () => {
  for (const lugar of ['corpo:maoPrincipal', 'corpo:tronco', 'corpo:roupa', 'corpo:emUso', 'corpo:mochila']) assert.equal(usoDoLugar(lugar), 'equipado', lugar);
  for (const lugar of ['coldre', 'costas', 'bolsos', 'cinto', 'mochila']) assert.equal(usoDoLugar(lugar), 'carregando', lugar);
  for (const lugar of ['esconderijo', 'veiculo:abc']) assert.equal(usoDoLugar(lugar), 'guardado', lugar);
  assert.equal(usoDoLugar('organizar', 'guardado'), 'guardado');
  assert.equal(usoDoLugar('organizar', 'equipado'), 'equipado');
});

test('C107: os encaixes: as duas mãos da arma longa, a armadura inteira, o coldre, as costas, o deck e a mochila', () => {
  const rifle = doCatalogo('core_weapons:assault-rifle');
  const pistola = doCatalogo('core_weapons:heavy-pistol');
  const espada = doCatalogo('core_weapons:sword');
  const granada = { name: 'Granada', type: 'arma', system: { tipo: 'thrownWeapon', maos: 1, aDistancia: true } };
  const escudo = doCatalogo('core_armor:bullet-proof-shield');
  const inteira = doCatalogo('core_armor:bodyweight-suit');
  const capacete = doCatalogo('core_armor:kevlar-head');
  assert.ok(espada.system, 'a espada do catálogo');
  assert.deepEqual(encaixesDoItem(rifle, 'corpo:maoSecundaria'), ['corpo:maoPrincipal', 'corpo:maoSecundaria']);
  assert.deepEqual(encaixesDoItem(pistola, 'corpo:maoSecundaria'), ['corpo:maoSecundaria']);
  // A arma branca de duas mãos vai numa mão só com o BODY 8 (o maosDaArma).
  assert.deepEqual(encaixesDoItem(espada, 'corpo:maoPrincipal', 4), ['corpo:maoPrincipal', 'corpo:maoSecundaria']);
  assert.deepEqual(encaixesDoItem(espada, 'corpo:maoPrincipal', 8), ['corpo:maoPrincipal']);
  assert.deepEqual(encaixesDoItem(escudo, 'corpo:maoSecundaria'), ['corpo:maoSecundaria']);
  assert.equal(encaixesDoItem(escudo, 'corpo:tronco'), null);
  assert.equal(encaixesDoItem(doCatalogo('core_gear:agent'), 'corpo:maoPrincipal'), null);
  assert.deepEqual(encaixesDoItem(inteira, 'corpo:tronco'), ['corpo:cabeca', 'corpo:tronco']);
  assert.deepEqual(encaixesDoItem(inteira, 'corpo:cabeca'), ['corpo:cabeca', 'corpo:tronco']);
  assert.deepEqual(encaixesDoItem(capacete, 'corpo:cabeca'), ['corpo:cabeca']);
  assert.equal(encaixesDoItem(capacete, 'corpo:tronco'), null);
  assert.equal(encaixesDoItem(doCatalogo('core_armor:kevlar-body'), 'corpo:cabeca'), null);
  assert.deepEqual(encaixesDoItem(pistola, 'coldre'), ['coldre']);
  assert.equal(encaixesDoItem(rifle, 'coldre'), null);
  assert.equal(encaixesDoItem(granada, 'coldre'), null);
  assert.deepEqual(encaixesDoItem(rifle, 'costas'), ['costas']);
  assert.deepEqual(encaixesDoItem(espada, 'costas', 12), ['costas']);
  assert.deepEqual(encaixesDoItem(doCatalogo('core_weapons:heavy-melee'), 'costas'), ['costas']);
  assert.equal(encaixesDoItem(pistola, 'costas'), null);
  assert.deepEqual(encaixesDoItem({ name: 'Deck', type: 'cyberdeck', system: {} }, 'corpo:deck'), ['corpo:deck']);
  assert.equal(encaixesDoItem(pistola, 'corpo:deck'), null);
  assert.deepEqual(encaixesDoItem(doCatalogo('core_gear:carryall'), 'corpo:mochila'), ['corpo:mochila']);
  assert.deepEqual(encaixesDoItem({ name: ' carryall ', type: 'equipamento', system: {} }, 'corpo:mochila'), ['corpo:mochila']);
  assert.equal(encaixesDoItem(doCatalogo('core_gear:tech-bag'), 'corpo:mochila'), null);
  assert.equal(encaixesDoItem({ type: 'arma', system: { tipo: 'unarmed', maos: 1 } }, 'corpo:maoPrincipal'), null);
  assert.equal(encaixesDoItem(pistola, 'bolsos'), null);
});

const LUGARES = lugaresDoPersonagem({ moradia: { descricao: 'Quitinete' }, mochila: 'P' });
const comGrade = (item, lugar, x = 0, y = 0, girado = false) => ({ item, grade: { lugar, x, y, girado } });

test('C107: conferir a grade: a borda, o quadrado ocupado, girar para caber e o próprio item que muda de lugar', () => {
  const rifle = doCatalogo('core_weapons:assault-rifle', { id: 'rifle', name: 'Rifle' });
  const faca = doCatalogo('core_weapons:light-melee', { id: 'faca', name: 'Faca' });
  const agent = doCatalogo('core_gear:agent', { id: 'agent', name: 'Agent' });
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'bolsos', x: 0, y: 0 }), 'Rifle passa da borda de Bolsos.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'mochila', x: 0, y: 0 }), 'Rifle passa da borda de Mochila.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'mochila', x: 0, y: 0, girado: true }), 'Rifle passa da borda de Mochila.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: 3, y: 4 }), null);
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: 4, y: 4 }), 'Rifle passa da borda de Esconderijo.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: 0, y: 5 }), 'Rifle passa da borda de Esconderijo.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: -1, y: 0 }), 'Rifle passa da borda de Esconderijo.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: 0, y: -1 }), 'Rifle passa da borda de Esconderijo.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'esconderijo', x: 0.5, y: 0 }), 'Rifle passa da borda de Esconderijo.');
  // A faca (1×2) só entra no cinto (6×1) deitada.
  assert.equal(conferirLugar(LUGARES, [], faca, { lugar: 'cinto', x: 0, y: 0 }), 'Faca passa da borda de Cinto.');
  assert.equal(conferirLugar(LUGARES, [], faca, { lugar: 'cinto', x: 4, y: 0, girado: true }), null);
  assert.equal(conferirLugar(LUGARES, [], faca, { lugar: 'cinto', x: 5, y: 0, girado: true }), 'Faca passa da borda de Cinto.');
  const noEsconderijo = [comGrade(rifle, 'esconderijo', 0, 0)];
  assert.equal(conferirLugar(LUGARES, noEsconderijo, agent, { lugar: 'esconderijo', x: 4, y: 1 }), 'Esconderijo: Rifle já está ali.');
  assert.equal(conferirLugar(LUGARES, noEsconderijo, agent, { lugar: 'esconderijo', x: 5, y: 1 }), null);
  assert.equal(conferirLugar(LUGARES, noEsconderijo, agent, { lugar: 'esconderijo', x: 0, y: 2 }), null);
  // O rifle girado (2×5) ocupa as colunas 0 e 1, linhas 0 a 4.
  const girado = [comGrade(rifle, 'esconderijo', 0, 0, true)];
  assert.equal(conferirLugar(LUGARES, girado, agent, { lugar: 'esconderijo', x: 2, y: 4 }), null);
  assert.equal(conferirLugar(LUGARES, girado, agent, { lugar: 'esconderijo', x: 1, y: 4 }), 'Esconderijo: Rifle já está ali.');
  assert.equal(conferirLugar(LUGARES, girado, agent, { lugar: 'esconderijo', x: 2, y: 0 }), null);
  assert.equal(conferirLugar(LUGARES, girado, agent, { lugar: 'esconderijo', x: 0, y: 5 }), null);
  // Mover o rifle um quadrado não colide com ele mesmo; noutro lugar, o rifle não ocupa o esconderijo.
  assert.equal(conferirLugar(LUGARES, noEsconderijo, rifle, { lugar: 'esconderijo', x: 1, y: 0 }), null);
  assert.equal(conferirLugar(LUGARES, [comGrade(rifle, 'costas')], agent, { lugar: 'esconderijo', x: 0, y: 0 }), null);
  assert.equal(conferirLugar(LUGARES, [{ item: rifle, grade: null }], agent, { lugar: 'esconderijo', x: 0, y: 0 }), null);
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'veiculo:nenhum', x: 0, y: 0 }), 'Esse lugar não existe para este personagem.');
  assert.equal(conferirLugar(LUGARES, [], { id: 'l', name: 'Braço quebrado', type: 'lesao', system: {} }, { lugar: 'bolsos', x: 0, y: 0 }), 'Braço quebrado não ocupa lugar no inventário.');
});

test('C107: conferir os encaixes e as listas: a mão ocupada, as duas mãos, a armadura inteira e o que cada lista aceita', () => {
  const rifle = doCatalogo('core_weapons:assault-rifle', { id: 'rifle', name: 'Rifle' });
  const pistola = doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', name: 'Pistola' });
  const outra = doCatalogo('core_weapons:medium-pistol', { id: 'outra', name: 'Outra pistola' });
  const inteira = doCatalogo('core_armor:bodyweight-suit', { id: 'traje', name: 'Traje' });
  const capacete = doCatalogo('core_armor:kevlar-head', { id: 'capacete', name: 'Capacete' });
  const jaqueta = { id: 'jaqueta', name: 'Jaqueta', type: 'roupa', system: { tipo: 'jacket' } };
  assert.equal(conferirLugar(LUGARES, [], pistola, { lugar: 'corpo:maoPrincipal' }), null);
  assert.equal(conferirLugar(LUGARES, [comGrade(pistola, 'corpo:maoPrincipal')], outra, { lugar: 'corpo:maoPrincipal' }), 'Mão principal: já tem Pistola.');
  assert.equal(conferirLugar(LUGARES, [comGrade(pistola, 'corpo:maoPrincipal')], outra, { lugar: 'corpo:maoSecundaria' }), null);
  // O rifle pede as duas mãos: a pistola na secundária barra, e o rifle numa mão barra a pistola na outra.
  assert.equal(conferirLugar(LUGARES, [comGrade(pistola, 'corpo:maoSecundaria')], rifle, { lugar: 'corpo:maoPrincipal' }), 'Mão secundária: já tem Pistola.');
  assert.equal(conferirLugar(LUGARES, [comGrade(rifle, 'corpo:maoPrincipal')], pistola, { lugar: 'corpo:maoSecundaria' }), 'Mão secundária: já tem Rifle.');
  assert.equal(conferirLugar(LUGARES, [comGrade(rifle, 'corpo:maoPrincipal')], rifle, { lugar: 'corpo:maoSecundaria' }), null);
  assert.equal(conferirLugar(LUGARES, [comGrade(capacete, 'corpo:cabeca')], inteira, { lugar: 'corpo:tronco' }), 'Cabeça: já tem Capacete.');
  assert.equal(conferirLugar(LUGARES, [comGrade(inteira, 'corpo:tronco')], capacete, { lugar: 'corpo:cabeca' }), 'Cabeça: já tem Traje.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'coldre' }), 'Coldre: não serve para Rifle.');
  assert.equal(conferirLugar(LUGARES, [comGrade(pistola, 'bolsos')], outra, { lugar: 'coldre' }), null);
  assert.equal(conferirLugar(LUGARES, [comGrade(pistola, 'coldre')], outra, { lugar: 'coldre' }), 'Coldre: já tem Pistola.');
  assert.equal(conferirLugar(LUGARES, [], jaqueta, { lugar: 'corpo:roupa' }), null);
  assert.equal(conferirLugar(LUGARES, [comGrade({ ...jaqueta, id: 'j2' }, 'corpo:roupa')], jaqueta, { lugar: 'corpo:roupa' }), null);
  assert.equal(conferirLugar(LUGARES, [], pistola, { lugar: 'corpo:roupa' }), 'Roupa: não serve para Pistola.');
  assert.equal(conferirLugar(LUGARES, [], doCatalogo('core_gear:agent', { id: 'a' }), { lugar: 'corpo:emUso' }), null);
  assert.equal(conferirLugar(LUGARES, [], doCatalogo('core_gear:carryall', { id: 'c', name: 'Carryall' }), { lugar: 'corpo:emUso' }), 'Em uso: não serve para Carryall.');
  assert.equal(conferirLugar(LUGARES, [], jaqueta, { lugar: 'corpo:emUso' }), 'Em uso: não serve para Jaqueta.');
  assert.equal(conferirLugar(LUGARES, [], rifle, { lugar: 'organizar' }), null);
});

// Confere o resultado do arrumar item por item, como se cada um chegasse por vez: nenhum lugar ilegal, nenhuma colisão.
function conferirArrumacao(itens, lugares, resultado, body = 0) {
  const estado = [];
  for (const item of itens) {
    const grade = resultado[item.id];
    if (!tamanhoDoItem(item)) { assert.equal(grade, undefined, item.name); continue; }
    assert.ok(grade, item.name);
    assert.equal(conferirLugar(lugares, estado, item, grade, { body }), null, `${item.name} em ${grade.lugar}`);
    assert.equal(usoDoLugar(grade.lugar, item.uso), item.uso, `${item.name}: o uso não muda`);
    estado.push({ item, grade });
  }
}

test('C107: arrumar põe cada item num lugar do uso dele, sem colisão, e o que não cabe vai para "Para organizar"', () => {
  const lugares = lugaresDoPersonagem({ moradia: { descricao: 'Hotel cápsula' }, mochila: 'P', veiculos: [{ id: 'moto', nome: 'Moto', catalogo: 'core_vehicles:roadbike' }] });
  const itens = [
    doCatalogo('core_weapons:assault-rifle', { id: 'rifle', uso: 'carregando' }),
    doCatalogo('core_weapons:sniper-rifle', { id: 'precisao', uso: 'carregando' }),
    doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', uso: 'equipado' }),
    doCatalogo('core_weapons:medium-pistol', { id: 'reserva', uso: 'carregando' }),
    doCatalogo('core_weapons:smg', { id: 'smg', uso: 'equipado' }),
    doCatalogo('core_weapons:shotgun', { id: 'escopeta', uso: 'equipado' }),
    doCatalogo('core_gear:carryall', { id: 'mochila', uso: 'equipado' }),
    doCatalogo('core_armor:kevlar-body', { id: 'colete', uso: 'equipado' }),
    doCatalogo('core_armor:kevlar-head', { id: 'capacete', uso: 'equipado' }),
    doCatalogo('core_gear:agent', { id: 'agent', uso: 'carregando' }),
    doCatalogo('core_gear:flashlight', { id: 'lanterna', uso: 'equipado' }),
    { id: 'jaqueta', name: 'Jaqueta', type: 'roupa', system: { tipo: 'jacket' }, uso: 'equipado' },
    { id: 'municao', name: 'Balas', type: 'municao', system: { tipo: 'medPistol' }, uso: 'carregando' },
    doCatalogo('core_armor:flak-body', { id: 'flak', uso: 'guardado' }),
    doCatalogo('core_armor:metalgear-body', { id: 'metal', uso: 'guardado' }),
    doCatalogo('core_gear:tent-and-camping-equipment', { id: 'barraca', uso: 'guardado' }),
    { id: 'lesao', name: 'Costela quebrada', type: 'lesao', system: {}, uso: '' },
    { id: 'braco', name: 'Cyberbraço', type: 'cyberware', system: { tipo: 'cyberArm', fundacional: true, instalado: true } }
  ];
  const resultado = arrumar(itens, lugares);
  const lugar = id => resultado[id]?.lugar;
  assert.equal(lugar('escopeta'), 'corpo:maoPrincipal');
  // A escopeta (a maior das equipadas) pega as duas mãos; a pistola e a SMG equipadas ficam sem mão e não viram
  // "carregando".
  assert.equal(lugar('pistola'), 'organizar');
  assert.equal(lugar('smg'), 'organizar');
  assert.equal(lugar('mochila'), 'corpo:mochila');
  assert.equal(lugar('colete'), 'corpo:tronco');
  assert.equal(lugar('capacete'), 'corpo:cabeca');
  assert.equal(lugar('lanterna'), 'corpo:emUso');
  assert.equal(lugar('jaqueta'), 'corpo:roupa');
  assert.equal(lugar('precisao'), 'costas');
  assert.equal(lugar('rifle'), 'organizar');
  assert.equal(lugar('reserva'), 'coldre');
  assert.equal(lugar('agent'), 'bolsos');
  assert.equal(lugar('municao'), 'bolsos');
  assert.equal(lugar('metal'), 'organizar');
  assert.equal(lugar('flak'), 'organizar');
  assert.equal(lugar('barraca'), 'esconderijo');
  assert.equal(resultado.lesao, undefined);
  assert.equal(resultado.braco, undefined);
  conferirArrumacao(itens, lugares, resultado);
  // A ordem de chegada não muda nada.
  const ao = [...itens].reverse();
  assert.deepEqual(arrumar(ao, lugares), resultado);
  assert.deepEqual(arrumar([...itens.slice(7), ...itens.slice(0, 7)], lugares), resultado);
});

test('C107: arrumar enche as grades do maior para o menor, deita o que só cabe deitado e usa o porta-malas depois do esconderijo', () => {
  const lugares = lugaresDoPersonagem({ moradia: { descricao: 'Hotel cápsula' }, mochila: 'P', veiculos: [{ id: 'moto', nome: 'Moto', catalogo: 'core_vehicles:roadbike' }] });
  const caixa = (id, tipo) => ({ id, name: id, type: 'municao', system: { tipo }, uso: 'carregando' });
  const itens = [
    ...Array.from({ length: 8 }, (_, i) => caixa(`b${i}`, 'rifle')),
    caixa('foguete', 'rocket'),
    doCatalogo('core_weapons:light-melee', { id: 'faca', name: 'Faca', uso: 'carregando' }),
    doCatalogo('core_armor:kevlar-body', { id: 'g1', name: 'Colete 1', uso: 'guardado' }),
    doCatalogo('core_armor:kevlar-body', { id: 'g2', name: 'Colete 2', uso: 'guardado' }),
    doCatalogo('core_gear:computer', { id: 'pc', name: 'Computador', uso: 'guardado' })
  ];
  const resultado = arrumar(itens, lugares);
  conferirArrumacao(itens, lugares, resultado);
  // A faca é a primeira arma: vai para o coldre (arma de uma mão).
  assert.deepEqual(resultado.faca, { lugar: 'coldre', x: 0, y: 0, girado: false });
  // O foguete (2×1) entra primeiro nos bolsos; as 8 caixas enchem os 6 quadrados que sobram e passam ao cinto.
  assert.deepEqual(resultado.foguete, { lugar: 'bolsos', x: 0, y: 0, girado: false });
  assert.equal(Object.values(resultado).filter(grade => grade.lugar === 'bolsos').length, 7);
  assert.equal(Object.values(resultado).filter(grade => grade.lugar === 'cinto').length, 2);
  // O esconderijo da cápsula (4×3) leva um colete 3×3; o outro colete não cabe na moto (4×2) e vai para organizar; o
  // computador 2×2 vai para a moto.
  assert.deepEqual(resultado.g1, { lugar: 'esconderijo', x: 0, y: 0, girado: false });
  assert.equal(resultado.g2.lugar, 'organizar');
  assert.deepEqual(resultado.pc, { lugar: 'veiculo:moto', x: 0, y: 0, girado: false });
  // Sem mochila: a pistola pega o coldre; a lança (1×3) só entra nos bolsos (4×2) deitada; a granada não vai ao coldre;
  // as flechas enchem o resto dos bolsos e passam ao cinto.
  const semMochila = lugaresDoPersonagem({ moradia: { descricao: 'Na rua ou num veículo' } });
  const pistola = doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', name: 'Pistola', uso: 'carregando' });
  const lanca = { id: 'lanca', name: 'Lança', type: 'arma', system: { tipo: 'medMelee', maos: 1, aDistancia: false }, uso: 'carregando' };
  const granada = { id: 'granada', name: 'Granada', type: 'arma', system: { tipo: 'thrownWeapon', maos: 1, aDistancia: true }, uso: 'carregando' };
  const flechas = Array.from({ length: 8 }, (_, i) => caixa(`p${i}`, 'arrow'));
  const todos = [granada, ...flechas, lanca, pistola];
  const deitada = arrumar(todos, semMochila);
  conferirArrumacao(todos, semMochila, deitada);
  assert.deepEqual(deitada.pistola, { lugar: 'coldre', x: 0, y: 0, girado: false });
  assert.deepEqual(deitada.lanca, { lugar: 'bolsos', x: 0, y: 0, girado: true });
  assert.deepEqual(deitada.granada, { lugar: 'bolsos', x: 3, y: 0, girado: false });
  assert.equal(Object.values(deitada).filter(grade => grade.lugar === 'cinto').length, 4);
});

test('C107: arrumar desempata o mesmo tamanho pelo nome, e só depois pelo id', () => {
  const lugares = lugaresDoPersonagem({});
  const beta = { id: 'a', name: 'Beta', type: 'droga', system: {}, uso: 'carregando' };
  const alfa = { id: 'b', name: 'Alfa', type: 'droga', system: {}, uso: 'carregando' };
  const gemeo = { id: 'c', name: 'Alfa', type: 'droga', system: {}, uso: 'carregando' };
  const resultado = arrumar([beta, gemeo, alfa], lugares);
  assert.deepEqual([resultado.b.x, resultado.c.x, resultado.a.x], [0, 1, 2]);
  assert.deepEqual(new Set(Object.values(resultado).map(grade => grade.lugar)), new Set(['bolsos']));
});

test('C107: arrumar respeita o BODY na mão: com BODY 8 a arma branca pesada fica numa mão só', () => {
  const lugares = lugaresDoPersonagem({});
  const espada = doCatalogo('core_weapons:sword', { id: 'espada', name: 'Espada', uso: 'equipado' });
  const pistola = doCatalogo('core_weapons:heavy-pistol', { id: 'pistola', name: 'Pistola', uso: 'equipado' });
  assert.equal(arrumar([espada, pistola], lugares, { body: 4 }).pistola.lugar, 'organizar');
  assert.equal(arrumar([espada, pistola], lugares, { body: 8 }).pistola.lugar, 'corpo:maoSecundaria');
});
