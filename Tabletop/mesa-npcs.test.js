// Testes das fichas de NPC do mestre (M18): criar, mudar, copiar da wiki e apagar pela API da mesa (só o mestre vê), o
// token que copia a ficha, e a importação dos atores do Foundry (importar-foundry.js: o converterAtores e o token que
// aponta para a ficha que veio do ator).
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { sleep, montar, fichaJax } = require('./teste-ajuda');
const { converter, converterAtores } = require('./importar-foundry');

const capangaDaMaelstrom = () => ({
  nome: 'Capanga da Maelstrom', grupo: 'Maelstrom', hp: 25, stats: { INT: 3, REF: 6, DEX: 5, TECH: 4, COOL: 4, WILL: 4, MOVE: 5, BODY: 6, EMP: 2 },
  // Em português ou em inglês: grava o inglês, como as fichas do livro.
  pericias: [{ nome: 'Armas de uma Mão', base: 12 }, { nome: 'Evasion', base: 9 }, { nome: 'Percepção', base: 8 }, { nome: 'Grito de guerra', base: 4 }, { nome: 'Dança', base: 0 }],
  armas: [{ nome: 'Pistola pesada', dano: '3d6', cdt: 2, pericia: 'Handgun', nota: 'pente de 8' }, { nome: 'Faca', dano: '1d6', pericia: 'Armas Brancas' },
    { nome: 'Pistola da gangue', dano: '4d6', pericia: 'Handgun', classe: 'vHeavyPistol' }],
  sp: { cabeca: 4, corpo: 11 }, notas: 'Cromo vermelho no rosto. Foge com metade do HP.'
});

test('NPC do mestre: cria, muda, copia da wiki e apaga; o jogador não vê nem mexe', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const ouvidoMestre = await m.ouvir('');
  const ouvidoAna = await m.ouvir(ana.cookie);
  await sleep(20);
  assert.equal((await m.op('npc.salvar', { npc: capangaDaMaelstrom() }, ana.cookie)).status, 403, 'só o mestre');
  assert.match((await m.op('npc.salvar', { npc: { ...capangaDaMaelstrom(), nome: ' ' } })).json.erro, /Dê um nome/);
  assert.match((await m.op('npc.salvar', { npc: { ...capangaDaMaelstrom(), armas: [{ nome: 'Faca', dano: 'muito' }] } })).json.erro, /O dano de Faca: use NdM/);

  const criado = await m.op('npc.salvar', { npc: capangaDaMaelstrom() });
  assert.equal(criado.status, 200, criado.text);
  const id = criado.json.resultado.id;
  assert.match(id, /^meu:/);
  const evento = await ouvidoMestre.esperar(item => item.evento === 'npcs');
  const meu = evento.data.meusNpcs.find(npc => npc.id === id);
  assert.deepEqual(meu.pericias.map(item => [item.nome, item.pt, item.base]), [['Handgun', 'Armas de uma Mão', 12], ['Evasion', 'Evasão', 9], ['Perception', 'Percepção', 8], ['Grito de guerra', 'Grito de guerra', 4]]);
  assert.deepEqual(meu.armas.map(arma => [arma.nome, arma.pericia, arma.distancia, arma.cdt]), [['Pistola pesada', 'Handgun', true, 2], ['Faca', 'Melee Weapon', false, 1], ['Pistola da gangue', 'Handgun', true, 1]]);
  assert.deepEqual(evento.data.npcs[0], { id, nome: 'Capanga da Maelstrom', grupo: 'Maelstrom', livro: '', pagina: null, hp: 25, ref: 6, move: 5, proprio: true, tipo: 'pessoa' }, 'as do mestre primeiro na lista');
  assert.ok(evento.data.npcs.some(npc => npc.id === 'mooks:0'), 'e as da wiki depois');
  const estadoAna = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json;
  assert.ok(!('npcs' in estadoAna) && !('meusNpcs' in estadoAna), 'o jogador não recebe as fichas');
  await sleep(100);
  assert.ok(!ouvidoAna.eventos.some(item => item.evento === 'npcs'), 'nem o evento');

  // Mudar: só o que veio muda (o resto fica).
  assert.equal((await m.op('npc.salvar', { id, npc: { nome: 'Capanga da Maelstrom', hp: 30, stats: { ...capangaDaMaelstrom().stats, REF: 7 } } })).status, 200);
  let lista = (await m.pedir('/api/mesa/estado')).json.meusNpcs;
  assert.deepEqual([lista[0].hp, lista[0].stats.REF, lista[0].armas.length, lista[0].notas], [30, 7, 3, 'Cromo vermelho no rosto. Foge com metade do HP.']);
  assert.equal((await m.op('npc.salvar', { id: 'meu:nada', npc: capangaDaMaelstrom() })).status, 404);

  // Copiar a ficha da wiki: a armadura do livro vira números, e a página vai para as notas.
  const copia = await m.op('npc.copiar', { de: 'mooks:0' });
  assert.equal(copia.status, 200, copia.text);
  lista = (await m.pedir('/api/mesa/estado')).json.meusNpcs;
  const guarda = lista.find(npc => npc.id === copia.json.resultado.id);
  assert.deepEqual([guarda.nome, guarda.grupo, guarda.hp, guarda.sp, guarda.armas.length], ['Guarda-costas (cópia)', 'Meus NPCs', 35, { cabeca: 7, corpo: 7 }, 2]);
  assert.equal(guarda.notas, 'Do livro: Bodyguard, p. 412.\nArmadura: Kevlar · SP 7 na cabeça e no corpo.');
  assert.equal(guarda.pericias.find(item => item.nome === 'Handgun').base, 10);
  assert.equal((await m.op('npc.copiar', { de: 'nada' })).status, 404);

  // Apagar.
  assert.equal((await m.op('npc.apagar', { id: guarda.id })).status, 200);
  assert.ok(!(await m.pedir('/api/mesa/estado')).json.meusNpcs.some(npc => npc.id === guarda.id));
  assert.equal((await m.op('npc.apagar', { id: guarda.id })).status, 404);
  // Fica gravado na mesa da campanha.
  await sleep(600);
  const gravado = fs.readdirSync(m.dados, { recursive: true }).find(arquivo => String(arquivo).endsWith('mesa.json'));
  assert.ok(gravado, 'a mesa gravou');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(m.dados, gravado), 'utf8')).npcs.map(npc => npc.id), [id]);
});

test('NPC do mestre na cena: o token copia a ficha (perícias, armas, SP e notas) e rola por ela', async t => {
  const m = await montar(t);
  const cena = (await m.op('cena.criar', { nome: 'Beco', largura: 2000, altura: 1500, grade: { tamanho: 100 } })).json.resultado.cena;
  const id = (await m.op('npc.salvar', { npc: capangaDaMaelstrom() })).json.resultado.id;
  const token = (await m.op('token.criar', { cena, npc: id, x: 450, y: 450 })).json.resultado.token;
  const segundo = (await m.op('token.criar', { cena, npc: id, x: 650, y: 450 })).json.resultado.token;
  const estado = (await m.pedir('/api/mesa/estado')).json;
  const visto = estado.cena.tokens.find(item => item.id === token);
  assert.deepEqual([visto.nome, visto.tipo, visto.npc, visto.hp, visto.notas], ['Capanga da Maelstrom', 'npc', id, { atual: 25, max: 25 }, 'Cromo vermelho no rosto. Foge com metade do HP.']);
  assert.equal(estado.cena.tokens.find(item => item.id === segundo).nome, 'Capanga da Maelstrom 2');
  assert.deepEqual(visto.sp, { cabeca: { atual: 4, max: 4 }, corpo: { atual: 11, max: 11 } });
  assert.deepEqual(visto.armas.map(arma => [arma.nome, arma.classe]), [['Pistola pesada', 'heavyPistol'], ['Faca', 'medMelee'], ['Pistola da gangue', 'vHeavyPistol']], 'a classe que veio (do Foundry) vale mais que o nome');
  const rolagem = await m.op('rolar', { modo: 'teste', token, pericia: 'Handgun' });
  assert.equal(rolagem.status, 200, rolagem.text);
  assert.deepEqual(rolagem.json.resultado.rolagem.partes[0], { rotulo: 'Armas de uma Mão (base)', valor: 12 });
  // Mudar ou apagar a ficha não mexe no token que já está na cena.
  await m.op('npc.salvar', { id, npc: { nome: 'Outro nome', hp: 99 } });
  await m.op('npc.apagar', { id });
  const depois = (await m.pedir('/api/mesa/estado')).json.cena.tokens.find(item => item.id === token);
  assert.deepEqual([depois.nome, depois.hp.max], ['Capanga da Maelstrom', 25]);
  assert.equal((await m.op('token.criar', { cena, npc: id })).status, 404, 'a ficha apagada não põe mais');
});

// Os atores de mentira, como o Foundry 12 grava: a pasta, os itens de cada ator e as flags do cpr-2077.
const ator = (id, extra) => [`!actors!${id}`, { _id: id, prototypeToken: { texture: { src: 'icons/svg/mystery-man.svg' } }, ...extra }];
const item = (atorId, id, extra) => [`!actors.items!${atorId}.${id}`, { _id: id, ...extra }];
const atoresDeMentira = () => new Map([
  ator('a1', { name: 'Agente da MaxTac', type: 'mook', folder: 'p1', flags: { 'cpr-2077': { base: 'Outrider', variante: true } },
    prototypeToken: { texture: { src: 'tokens/maxtac%20agente.webp' } },
    system: { stats: { int: { value: 6 }, ref: { value: 8 }, dex: { value: 8 }, tech: { value: 3 }, cool: { value: 5 }, will: { value: 6 }, move: { value: 6 }, body: { value: 6 }, emp: { value: 6 } },
      derivedStats: { hp: { value: 12, max: 40 } }, information: { description: '<p><b>Mini-chefe</b> · conta como 3</p><p>Chega 10 minutos depois.</p>', notes: '' } } }),
  item('a1', 'i1', { type: 'skill', name: 'Shoulder Arms', system: { stat: 'ref', level: 6 } }),
  item('a1', 'i2', { type: 'skill', name: 'Acting', system: { stat: 'cool', level: 0 } }),
  item('a1', 'i3', { type: 'weapon', name: 'Militech M251s Ajax', system: { damage: '5d6', rof: 1, weaponSkill: 'Shoulder Arms', isRanged: true, weaponType: 'assaultRifle' } }),
  item('a1', 'i4', { type: 'armor', name: 'Heavy Armorjack (Body)', system: { equipped: 'equipped', bodyLocation: { sp: 13 }, headLocation: { sp: 0 } } }),
  item('a1', 'i5', { type: 'armor', name: 'Heavy Armorjack (Head)', system: { equipped: 'equipped', bodyLocation: { sp: 0 }, headLocation: { sp: 13 } } }),
  item('a1', 'i6', { type: 'armor', name: 'Kevlar guardado', system: { equipped: 'owned', bodyLocation: { sp: 20 }, headLocation: { sp: 20 } } }),
  item('a1', 'i7', { type: 'cyberware', name: 'Internal (7 Option Slots)', system: { isInstalled: true } }),
  item('a1', 'i8', { type: 'cyberware', name: 'Sandevistan', system: { isInstalled: true } }),
  item('a1', 'i9', { type: 'gear', name: 'Algemas', system: {} }),
  ator('a2', { name: 'Guarda-costas (Bodyguard)', type: 'mook', flags: { 'cpr-2077': { base: 'Guarda-costas', variante: false, diferencasDoLivro: [] } }, system: {} }),
  ator('a3', { name: 'Cyberpsycho', type: 'mook', flags: { 'cpr-2077': { base: 'Cyberpsycho', variante: false, diferencasDoLivro: ['Concentration'] } }, system: { stats: {}, derivedStats: { hp: { max: 55 } } } }),
  ator('a4', { name: 'Qyan', type: 'character', flags: { 'cpr-2077': { wiki: { id: 'ppt24g8ww5' } } }, system: {} }),
  ator('a5', { name: 'Black ICE', type: 'blackIce', system: { stats: { per: 0, spd: 0, atk: 0, def: 0, rez: { value: 10, max: 10 } }, notes: '<p>This Actor is used for creating Black ICE Actors</p>' } }),
  ator('a6', { name: 'Wisp', type: 'blackIce', folder: 'p2', img: 'systems/cyberpunk-red-core/icons/netrunning/Wisp.png', prototypeToken: { texture: { src: 'systems/cyberpunk-red-core/icons/netrunning/Wisp.png' } },
    system: { class: 'antipersonnel', stats: { per: 4, spd: 4, atk: 4, def: 2, rez: { value: 15, max: 15 } }, notes: '<p>1d6 no cérebro.</p>' } }),
  ator('a7', { name: 'Yaiba Kusanagi CT-3X', type: 'cyberpunk-red-vehicles.vehicle', system: { sdp: { value: 35, max: 35 }, sp: { value: 0, max: 0 }, seats: 2, speedCombat: 60, speedNarrative: '300 MPH', vehicleType: 'land', notes: '<p>Moto esportiva.</p>' } }),
  ator('a8', { name: 'Container', type: 'container', system: {} })
]);
const pastas = new Map([['!folders!p1', { name: 'Facções de 2077' }], ['!folders!p2', { name: 'NET Architect' }]]);

test('importação: os atores que não são a ficha da wiki viram fichas do mestre; o resto fica de fora, com o motivo', () => {
  const { npcs, fora, midias } = converterAtores(atoresDeMentira(), pastas, 'mundo');
  assert.deepEqual(npcs.map(({ npc, origem }) => [npc.nome, npc.tipo, npc.grupo, origem.id]), [
    ['Agente da MaxTac', 'pessoa', 'Facções de 2077', 'a1'], ['Cyberpsycho', 'pessoa', 'Do Foundry', 'a3'], ['Wisp', 'ice', 'NET Architect', 'a6'], ['Yaiba Kusanagi CT-3X', 'veiculo', 'Do Foundry', 'a7']
  ]);
  assert.deepEqual(fora, [
    'Black ICE: modelo vazio do sistema', 'Container: contêiner (a mesa não tem, e ele está vazio)', 'Guarda-costas (Bodyguard): é a ficha da wiki "Guarda-costas"', 'Qyan: personagem (entra pela ficha da wiki)'
  ]);
  const maxtac = npcs[0].npc;
  assert.deepEqual([maxtac.hp, maxtac.stats.REF, maxtac.sp], [40, 8, { cabeca: 13, corpo: 13 }], 'o HP máximo e a maior armadura vestida em cada lugar (a guardada não conta)');
  assert.deepEqual(maxtac.pericias, [{ nome: 'Shoulder Arms', base: 14 }], 'a base é STAT + nível; nível 0 fica de fora');
  assert.deepEqual(maxtac.armas, [{ nome: 'Militech M251s Ajax', dano: '5d6', cdt: 1, pericia: 'Shoulder Arms', distancia: true, classe: 'assaultRifle' }]);
  assert.equal(maxtac.notas, 'Mini-chefe · conta como 3\nChega 10 minutos depois.\n\nCyberware no Foundry: Sandevistan.\n\nEquipamento no Foundry: Algemas.', 'sem os slots de base do CORE');
  assert.equal(maxtac.midia, 'tokens/maxtac agente.webp');
  assert.deepEqual([...midias], ['tokens/maxtac agente.webp', 'systems/cyberpunk-red-core/icons/netrunning/Wisp.png'], 'o ícone padrão do Foundry não sobe');
  assert.deepEqual([npcs[2].npc.hp, npcs[2].npc.stats, npcs[2].npc.pericias.map(item => `${item.nome} ${item.base}`)], [15, { REF: 4 }, ['ATK 4', 'DEF 2', 'PER 4']]);
  assert.equal(npcs[2].npc.notas, 'Black ICE (antipersonnel): PER 4 · SPD 4 · ATK 4 · DEF 2 · REZ 15.\n\n1d6 no cérebro.');
  assert.deepEqual([npcs[3].npc.hp, npcs[3].npc.stats], [35, { MOVE: 60 }]);
  assert.match(npcs[3].npc.notas, /^Veículo \(terrestre\): SDP 35 · SP 0 · 2 assentos · MOVE 60 \(300 MPH\)\.\n\nMoto esportiva\.$/);
});

test('importação: o token do ator vira a ficha do mestre que veio dele; sem ela, a da wiki pelo nome', async t => {
  const m = await montar(t);
  const atores = atoresDeMentira();
  const { npcs } = converterAtores(atores, pastas, 'mundo');
  for (const { npc, origem } of npcs) assert.equal((await m.op('npc.salvar', { npc: { ...npc, midia: '' }, origem })).status, 200);
  const repetido = await m.op('npc.salvar', { npc: { ...npcs[0].npc, midia: '' }, origem: npcs[0].origem });
  assert.equal(repetido.status, 409, 'o mesmo ator não entra duas vezes');
  const antes = (await m.pedir('/api/mesa/estado')).json.meusNpcs.find(npc => npc.origem && npc.origem.id === 'a1');
  assert.equal((await m.op('npc.salvar', { npc: { ...npcs[0].npc, midia: '', hp: 45 }, origem: npcs[0].origem, substituir: true })).status, 200);
  const trocado = (await m.pedir('/api/mesa/estado')).json.meusNpcs.find(npc => npc.origem && npc.origem.id === 'a1');
  assert.deepEqual([trocado.id, trocado.hp], [antes.id, 45], 'substituir troca a ficha e mantém o id');

  const cena = { _id: 'c1', name: 'Beco', width: 1000, height: 800, padding: 0, grid: { size: 100, type: 1, distance: 2, units: 'm' }, background: { src: '' } };
  const tokens = [{ _id: 't1', name: 'MaxTac', actorId: 'a1', x: 100, y: 100, width: 1, height: 1 }, { _id: 't2', name: 'Guarda', actorId: 'a2', x: 300, y: 100, width: 1, height: 1 }];
  const { cena: convertida } = converter(cena, { tokens, tiles: [], paredes: [], luzes: [], deltas: new Map() }, atores, 'mundo');
  assert.deepEqual(convertida.tokens.map(token => [token.npcOrigem, token.npcNome]), [[{ mundo: 'mundo', id: 'a1' }, 'Outrider'], [{ mundo: 'mundo', id: 'a2' }, 'Guarda-costas']]);
  const importada = await m.op('cena.importar', { cena: convertida });
  assert.equal(importada.status, 200, importada.text);
  await m.op('cena.ativar', { cena: importada.json.resultado.cena });
  const [maxtac, guarda] = (await m.pedir('/api/mesa/estado')).json.cena.tokens;
  assert.deepEqual([maxtac.nome, maxtac.npc, maxtac.hp.max, maxtac.sp.corpo.max], ['MaxTac', trocado.id, 45, 13], 'a ficha que veio do ator (não a do Outrider da wiki)');
  assert.deepEqual([guarda.nome, guarda.npc], ['Guarda', 'mooks:0'], 'o ator igual ao livro: a ficha da wiki');
});
