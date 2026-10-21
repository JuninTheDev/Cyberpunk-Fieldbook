// Testes das armas de 2077 na mesa da wiki (Mission Kit p. 31–35) e da espingarda com cartucho: o perfil lido do
// system-2077.js, o que a ficha diz (Rebuild, munição, cromo), as regras sozinhas (mesa-regras.js) e o caminho inteiro
// pela API, com os dados rolados de propósito.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const R = require('./mesa-regras');
const K = require('./mesa-2077');
const { montar } = require('./teste-ajuda');

const wiki = path.join(__dirname, '..');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['system-rules.js', 'system-2077.js', 'loja-catalogo.js']) vm.runInContext(fs.readFileSync(path.join(wiki, file), 'utf8'), sandbox, { filename: file });
const regras = JSON.parse(JSON.stringify(sandbox.systemRules.data));
const armas2077 = K.tabela(JSON.parse(JSON.stringify(sandbox.system2077.data.weapons)));
const itens = JSON.parse(JSON.stringify(sandbox.shopCatalog.itens));
const catalogo = { item: id => itens.find(item => item.id === id) || null, porNome: nome => itens.find(item => item.en === nome || item.nome === nome) || null };

test('perfil de 2077: a classe, as regras de cada arma e o Rebuild, do system-2077.js', () => {
  const chao = K.perfil(armas2077, ['Kang Tao A-22B Chao']);
  assert.deepEqual([chao.classe, chao.balas, chao.danoComMenos, chao.autofogo], ['smart', 3, '2d6', 0]);
  assert.equal(K.perfil(armas2077, ['Kang Tao L-69 Zhuo']).soCartucho, true, 'pente de cartucho Smart: só cartucho');
  assert.equal(K.perfil(armas2077, ['Rostovic DB-4 Igla']).soCartucho, true, 'o pente diz "cartucho"');
  assert.equal(K.perfil(armas2077, ['Kang Tao G-58 Dian']).coronhaRetratil, true);
  assert.deepEqual([K.perfil(armas2077, ['Arasaka Senkoh LX']).autofogo, K.perfil(armas2077, ['Arasaka Senkoh LX']).supressivo], [3, true]);
  assert.equal(K.perfil(armas2077, ['Tsunami Nue']).excelente, true);
  assert.equal(K.perfil(armas2077, ['Pistola pesada']), null, 'arma do livro: sem perfil');
  assert.deepEqual(K.perfil(armas2077, ['Pistola pesada'], 'power'), { classe: 'power', rebuild: true }, 'com o Power Rebuild vira Power');
  assert.equal(K.perfil(armas2077, ['Faca'], 'power', false), null, 'Rebuild só em arma de longo alcance');

  // A ficha da criação: o Rebuild dentro da arma, a munição carregada e o cromo instalado.
  const doc = { resultado: { itens: [
    { uid: 'a', id: 'core_weapons:heavy-pistol', nome: 'Pistola', uso: 'equipado', municao: 'm' },
    { uid: 'r', id: 'armas-2077:power-rebuild', nome: 'Power Rebuild', em: 'a' },
    { uid: 'm', id: 'armas-2077:smart-melhorada-pistola-pesada', nome: 'Smart melhorada' },
    { uid: 'e', id: 'core_weapons:shotgun', nome: 'Espingarda', uso: 'carregando', municao: 'c' },
    { uid: 'c', id: 'core_ammo:shotgun-shell-basic', nome: 'Cartuchos' },
    { uid: 'n', id: 'cyberware-2077:neuroport', nome: 'Neuroport' }
  ] } };
  const fatos = K.daFicha(doc, catalogo);
  assert.equal(fatos.armas.a.rebuild, 'power');
  assert.deepEqual(fatos.armas.a.municao, { cartucho: false, smartMelhorada: true });
  assert.deepEqual(fatos.armas.e.municao, { cartucho: true, smartMelhorada: false });
  assert.deepEqual(fatos.cromo, { conexaoSmart: true, coprocessador: false, bracoForte: false });
  assert.deepEqual(K.municaoDe(catalogo.item('core_ammo:heavy-pistol-smart') || { id: 'core_ammo:shotgun-slug-smart', municao: { variedade: 'shotgunSlug', tipo: 'smart' } }).smartMelhorada, false, 'a Smart do RED não é a melhorada');
  assert.equal(K.daFicha({ resultado: {} }, catalogo).cromo, null, 'sem a lista de itens, a mesa não sabe o cromo');
  // Do Foundry: o Rebuild instalado (dentro) e o cyberware instalado.
  const foundry = K.daFicha({ mesa: { itens: [{ id: 'x', tipo: 'weapon', nome: 'Heavy Pistol', dentro: ['Smart Rebuild'], municao: 'Basic Heavy Pistol Ammo' }, { id: 'y', tipo: 'cyberware', nome: 'Ballistic Coprocessor', instalado: true }, { id: 'z', tipo: 'cyberware', nome: 'Subdermal Grip', instalado: false }] } }, catalogo);
  assert.equal(foundry.armas['foundry:x'].rebuild, 'smart');
  assert.deepEqual(foundry.cromo, { conexaoSmart: false, coprocessador: true, bracoForte: false }, 'o que não está instalado não conta');
});

test('regras de 2077: modos, balas, dano, carga, segunda chance e o cartucho à frente', () => {
  const chao = { classe: 'medPistol', pericia: 'Handgun', kit: K.perfil(armas2077, ['Kang Tao A-22B Chao']) };
  assert.deepEqual(R.modosDaArma(chao), ['tiro', 'mirado'], 'Smart sem autofogo');
  assert.deepEqual(R.modosDaArma({ classe: 'heavyPistol', kit: { classe: 'power' } }), ['tiro', 'mirado', 'ricochete']);
  assert.deepEqual(R.modosDaArma({ classe: 'smg', kit: { classe: 'power', rebuild: true } }), ['tiro', 'mirado', 'ricochete', 'autofogo', 'supressivo'], 'o Rebuild não tira o autofogo');
  assert.deepEqual(R.modosDaArma({ classe: 'smg', kit: { classe: 'smart', autofogo: 0, supressivo: false } }), ['tiro', 'mirado'], 'a SMG de 2077 sem autofogo nos recursos não faz');
  assert.deepEqual(R.modosDaArma({ classe: 'shotgun', cartucho: true }), ['cartucho'], 'carregada com cartucho');
  assert.deepEqual(R.modosDaArma({ classe: 'shotgun', cartucho: false }), ['tiro', 'mirado'], 'com balote');
  assert.deepEqual(R.modosDaArma({ classe: 'shotgun', cartucho: null }), ['tiro', 'mirado', 'cartucho'], 'sem saber a munição, os dois');
  assert.deepEqual(R.modosDaArma({ classe: 'vHeavyPistol', kit: { classe: 'power', soCartucho: true } }), ['cartucho'], 'a Crusher só dispara cartucho');

  assert.equal(R.balasDoAtaque({ modo: 'tiro', kit: chao.kit, pente: 30 }), 3);
  assert.equal(R.balasDoAtaque({ modo: 'tiro', kit: chao.kit, pente: 2 }), 2, 'com menos no pente, dispara o que tem');
  assert.equal(R.balasDoAtaque({ modo: 'autofogo', kit: chao.kit, pente: 30 }), 10);
  assert.equal(R.balasDoAtaque({ modo: 'tiro', kit: { balasNaCarga: 3 }, pente: 9, carregada: true }), 3, 'a Omaha carregada');
  assert.equal(R.balasDoAtaque({ modo: 'tiro', kit: { balasNaCarga: 3 }, pente: 9 }), 1);
  assert.equal(R.balasDoAtaque({ modo: 'cartucho', kit: { doisCanos: true }, pente: 2, doisCanos: true }), 2);
  assert.equal(R.formulaDoDano({ modo: 'tiro', dano: '3d6', kit: chao.kit, pente: 2 }), '2d6');
  assert.equal(R.formulaDoDano({ modo: 'tiro', dano: '3d6', kit: chao.kit, pente: 30 }), '3d6');
  assert.equal(R.formulaDoDano({ modo: 'mirado', dano: '3d6', kit: { danoMirado: '4d6' } }), '4d6', 'a Unity no tiro mirado');
  assert.equal(R.formulaDoDano({ modo: 'cartucho', dano: '5d6' }), '3d6', 'a espingarda com cartucho: 3d6');
  assert.equal(R.formulaDoDano({ modo: 'cartucho', dano: '4d6', kit: { soCartucho: true, danoFixo: '4d6' } }), '4d6', 'a Zhuo');
  assert.equal(R.formulaDoDano({ modo: 'cartucho', dano: '3d6', kit: { soCartucho: true, doisCanos: true }, doisCanos: true }), '4d6', 'a Palica com os dois canos');

  const combate = { id: 'c1', rodada: 5, vez: 1 };
  assert.equal(R.cargaValida({ combate: 'c1', rodada: 1, vez: 0 }, combate), true);
  assert.equal(R.cargaValida({ combate: 'c1', rodada: 1, vez: 0 }, { ...combate, rodada: 21 }), false, '20 rodadas');
  assert.equal(R.cargaValida({ combate: 'c1', rodada: 1, disparou: { rodada: 5, vez: 1 } }, combate), true, 'a Omaha no turno do tiro');
  assert.equal(R.cargaValida({ combate: 'c1', rodada: 1, disparou: { rodada: 5, vez: 1 } }, { ...combate, vez: 2 }), false, 'e não depois');
  assert.equal(R.cargaValida({ combate: null, rodada: null }, combate), true, 'carregou fora do combate: até disparar');
  assert.equal(R.cargaValida(null, combate), false);

  assert.equal(R.temSegundaChance({ ataque: 15, contra: 20 }), true, 'errou por 5');
  assert.equal(R.temSegundaChance({ ataque: 14, contra: 20 }), false, 'errou por 6');
  assert.equal(R.temSegundaChance({ ataque: 21, contra: 20 }), false, 'acertou');
  assert.equal(R.temSegundaChance({ ataque: 15, contra: null }), false, 'fora do alcance');
  assert.equal(R.multiplicadorDeAutofogo(30, 20, 'smg', 2), 2, 'o máximo da arma de 2077');

  const de = { x: 0, y: 0 };
  const para = { x: 100, y: 0 };
  assert.equal(R.naFrente(de, para, { x: 100, y: 90 }), true, '42°: à frente');
  assert.equal(R.naFrente(de, para, { x: 100, y: 110 }), false, '48°: de lado');
  assert.equal(R.naFrente(de, para, { x: -50, y: 0 }), false, 'atrás');
  assert.equal(R.dvPelaDistancia(regras, 'shotgun', 10, true), 17, 'o autofogo da espingarda usa a tabela da SMG');
  assert.equal(R.acertou({ modo: 'cartucho', escolha: 'aguentar', ataque: 14 }), true, 'a área já pegou');
});

// A arena: 100 px = 2 m. Quem atira no quadrado (1, 1); os NPCs a 16 m (DV 20 da pistola).
const solo = (nome, itensDaFicha, extra = {}) => ({
  nome, role: 'solo', stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5, ...(extra.stats || {}) },
  resultado: {
    stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5, ...(extra.stats || {}) }, derivados: { hp: 45 },
    pericias: [['Handgun', 'REF', 6], ['Shoulder Arms', 'REF', 6], ['Evasion', 'DEX', 6]].map(([nome, stat, nivel]) => ({ nome, stat, nivel })),
    itens: itensDaFicha
  }
});
const item = (uid, id, uso = 'equipado', municao = '', em = '') => ({ uid, id, nome: (catalogo.item(id) || {}).nome || id, qtd: 1, uso, ...(municao ? { municao } : {}), ...(em ? { em } : {}) });
async function arena(t, fichaDeQuemAtira, fichaDoOutro = solo('Outro', [])) {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaDeQuemAtira);
  const bruno = await m.jogador('Bruno', fichaDoOutro);
  const cena = (await m.op('cena.criar', { nome: 'Arena', largura: 3000, altura: 2000, grade: { tamanho: 100 } })).json.resultado.cena;
  const atirador = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const npc = async (x, y) => (await m.op('token.criar', { cena, npc: 'mooks:0', x, y })).json.resultado.token;
  const ultima = async cookie => { const registro = (await m.pedir('/api/mesa/estado', { cookie })).json.registro; return registro[registro.length - 1]; };
  const token = async (id, cookie) => (await m.pedir('/api/mesa/estado', { cookie })).json.cena.tokens.find(entrada => entrada.id === id);
  return { m, ana, bruno, cena, atirador, npc, ultima, token };
}

test('Smart sem conexão não dispara', async t => {
  const a = await arena(t, solo('Smart', [item('w', 'armas-2077:kang-tao-a-22b-chao', 'equipado', 'am'), item('am', 'armas-2077:smart-melhorada-pistola-media', 'carregando')]));
  const capanga = await a.npc(950, 150);
  const ficha = await a.token(a.atirador, a.ana.cookie);
  const chao = ficha.armas.find(arma => arma.id === 'w');
  assert.deepEqual([chao.kit.classe, chao.smartMelhorada, chao.modos], ['smart', true, ['tiro', 'mirado']]);
  assert.equal(ficha.cromo.conexaoSmart, false, 'o dono vê o cromo (o cartão avisa "sem conexão Smart")');
  assert.equal((await a.token(a.atirador, a.bruno.cookie)).cromo, undefined, 'os outros, não');
  const sem = await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.equal(sem.status, 400, 'sem Neuroport, Interface Plugs nem Subdermal Grip, não dispara');
  assert.match(sem.json.erro, /só dispara conectada/);
});

test('Smart conectada: +1, 3 balas, e errou a DV por 5 ou menos tenta de novo com 14 + 1d10', async t => {
  const a = await arena(t, solo('Smart', [item('w', 'armas-2077:kang-tao-a-22b-chao', 'equipado', 'am'), item('am', 'armas-2077:smart-melhorada-pistola-media', 'carregando'), item('n', 'cyberware-2077:neuroport', '')]));
  const capanga = await a.npc(950, 150);
  // REF 8 + Armas de uma Mão 6 + Smart 1 + excelente 1 + 3 = 19 contra DV 20: errou por 1. Segunda chance: 14 + 7 = 21.
  // Dano 3d6 = 12 contra SP 7: passam 5.
  a.m.fila.push(3, 7, 4, 4, 4);
  const tiro = await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.equal(tiro.status, 200, tiro.text);
  const cartao = await a.ultima();
  assert.ok(cartao.ataque.rolagem.partes.some(parte => parte.rotulo === 'Arma Smart' && parte.valor === 1));
  assert.ok(cartao.ataque.rolagem.partes.some(parte => parte.rotulo === 'Qualidade excelente' && parte.valor === 1), 'a Chao é excelente');
  assert.equal(cartao.ataque.rolagem.total, 19);
  assert.equal(cartao.ataque.alvos[0].segundaChance.total, 21);
  assert.equal(cartao.ataque.alvos[0].acertou, true);
  assert.deepEqual((await a.token(capanga)).hp, { atual: 30, max: 35 });
  assert.equal((await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w').pente.atual, 27, 'gasta 3 balas');
  assert.ok(cartao.ataque.notas.some(nota => /Smart melhorada/.test(nota)));
  // Mirado: −8 no ataque e na segunda chance. 16 − 8 + 10 + 1 (o 10 soma mais 1d10) = 19 contra 20; segunda chance:
  // 14 − 8 + 9 = 15: errou de novo.
  a.m.fila.push(10, 1, 9);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'mirado', local: 'cabeca', alvo: capanga }, a.ana.cookie);
  const mirado = await a.ultima();
  assert.deepEqual([mirado.ataque.rolagem.total, mirado.ataque.alvos[0].segundaChance.total, mirado.ataque.alvos[0].acertou], [19, 15, false]);
  assert.ok(mirado.ataque.alvos[0].segundaChance.partes.some(parte => parte.valor === -8), 'a penalidade do mirado vai junto');
  // 16 + 1 − 3 (o 1 tira 1d10) = 14: errou por 6, sem segunda chance.
  a.m.fila.push(1, 3);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.equal((await a.ultima()).ataque.alvos[0].segundaChance, undefined);
});

test('Kappa: errou o primeiro alvo, as balas Smart vão para o segundo, a até 4 m', async t => {
  const outro = solo('Esquiva', []);
  const a = await arena(t, solo('Kappa', [item('w', 'armas-2077:tsunami-kappa', 'equipado', 'am'), item('am', 'core_ammo:medium-pistol-basic', 'carregando'), item('n', 'cyberware-2077:neuroport', '')]), outro);
  const esquiva = (await a.m.op('token.criar', { cena: a.cena, personagem: a.bruno.personagem.id, x: 950, y: 150 })).json.resultado.token;
  const capanga = await a.npc(1050, 150);
  const longe = await a.npc(1350, 150);
  assert.equal((await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: esquiva, alvo2: longe }, a.ana.cookie)).status, 400, 'o segundo alvo a mais de 4 m');
  // 14 + Smart 1 + excelente 1 + 6 = 22. O Bruno esquiva com DEX 7 + Evasão 6 + 9 = 22: o empate é dele. As balas vão
  // para o capanga (REF 6, aguenta): 22 contra DV 20, pega. Dano 3d6 = 9 contra SP 7: passam 2.
  a.m.fila.push(6);
  const tiro = await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: esquiva, alvo2: capanga }, a.ana.cookie);
  assert.equal(tiro.status, 200, tiro.text);
  assert.equal(tiro.json.resultado.concluido, false);
  a.m.fila.push(9, 3, 3, 3);
  assert.equal((await a.m.op('ataque.defender', { ataque: tiro.json.resultado.ataque, alvo: esquiva, escolha: 'esquivar' }, a.bruno.cookie)).status, 200);
  const cartao = await a.ultima();
  assert.equal(cartao.pendente, false);
  assert.deepEqual(cartao.ataque.alvos.map(alvo => [alvo.nome, alvo.acertou, Boolean(alvo.redirecionado)]), [['Esquiva', false, false], [cartao.ataque.alvos[1].nome, true, true]]);
  assert.deepEqual((await a.token(capanga)).hp, { atual: 33, max: 35 });
  assert.deepEqual((await a.token(esquiva, a.bruno.cookie)).hp, { atual: 45, max: 45 });
});

test('Power: ricochete com −4 (−2 com o Ballistic Coprocessor) e a lesão crítica com 10 de dano bônus', async t => {
  const a = await arena(t, solo('Power', [item('w', 'armas-2077:militech-m-10af-lexington', 'equipado', 'am'), item('am', 'core_ammo:heavy-pistol-basic', 'carregando')]));
  const capanga = await a.npc(950, 150);
  const lexington = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w');
  assert.deepEqual(lexington.modos, ['tiro', 'mirado', 'ricochete']);
  // 14 − 4 + 9 = 19 contra DV 20: errou.
  a.m.fila.push(9);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'ricochete', alvo: capanga }, a.ana.cookie);
  const ricochete = await a.ultima();
  assert.ok(ricochete.ataque.rolagem.partes.some(parte => parte.rotulo === 'Ricochete' && parte.valor === -4));
  assert.equal(ricochete.ataque.descricao, 'Ricochete');
  assert.equal(ricochete.ataque.alvos[0].acertou, false);
  // Tiro: 14 + 9 = 23. Dano [6, 6, 1] = 13 contra SP 7: passam 6, e a lesão (2d6 = 7) causa 10, não 5.
  a.m.fila.push(9, 6, 6, 1, 3, 4);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.deepEqual((await a.token(capanga)).hp, { atual: 35 - 6 - 10, max: 35 });
  assert.equal((await a.ultima()).ataque.alvos[0].dano.perda, 16);

  const b = await arena(t, solo('Power', [item('w', 'armas-2077:militech-m-10af-lexington', 'equipado', 'am'), item('am', 'core_ammo:heavy-pistol-basic', 'carregando'), item('c', 'cyberware-2077:ballistic-coprocessor', '')]));
  const alvo = await b.npc(950, 150);
  await b.m.op('ataque', { atacante: b.atirador, arma: 'w', modo: 'ricochete', alvo }, b.ana.cookie);
  assert.ok((await b.ultima()).ataque.rolagem.partes.some(parte => parte.rotulo === 'Ricochete (Ballistic Coprocessor)' && parte.valor === -2));
});

test('Tech: carregar, o tiro carregado ignora metade do SP, a carga sai, e o desfazer devolve', async t => {
  const a = await arena(t, solo('Tech', [item('w', 'armas-2077:arasaka-jke-x2-kenshin', 'equipado', 'am'), item('am', 'core_ammo:medium-pistol-basic', 'carregando')]));
  const capanga = await a.npc(950, 150);
  assert.equal((await a.m.op('arma.carregar', { token: a.atirador, arma: 'w' }, a.bruno.cookie)).status, 403, 'só o dono carrega');
  assert.equal((await a.m.op('arma.carregar', { token: a.atirador, arma: 'w' }, a.ana.cookie)).status, 200);
  assert.match((await a.ultima(a.bruno.cookie)).texto, /carrega .*gasta a Ação de Movimento/, 'todos ficam sabendo');
  let kenshin = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w');
  assert.equal(kenshin.carregada, true);
  const doc = (await a.m.pedir(`/api/personagens/${a.ana.personagem.id}`, { cookie: a.ana.cookie })).json.personagem;
  assert.ok(doc.jogo.armas.w.carga, 'a carga fica na ficha');
  // Excelente: 14 + 1 + 8 = 23 contra DV 20. Dano 2d6 = 10 contra metade do SP 7 (4): passam 6.
  a.m.fila.push(8, 5, 5);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  const cartao = await a.ultima();
  assert.ok(cartao.ataque.rolagem.partes.some(parte => parte.rotulo === 'Qualidade excelente' && parte.valor === 1));
  assert.equal(cartao.ataque.alvos[0].dano.spEfetivo, 4);
  assert.deepEqual((await a.token(capanga)).hp, { atual: 29, max: 35 });
  kenshin = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w');
  assert.equal(kenshin.carregada, false, 'disparou: a carga saiu');
  // O mestre desfaz: o HP, a bala e a carga voltam.
  assert.equal((await a.m.op('ataque.desfazer', { entrada: cartao.id })).status, 200);
  kenshin = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w');
  assert.deepEqual([kenshin.carregada, kenshin.pente.atual], [true, kenshin.pente.max]);
  assert.deepEqual((await a.token(capanga)).hp, { atual: 35, max: 35 });
  // Descarregar.
  await a.m.op('arma.carregar', { token: a.atirador, arma: 'w' }, a.ana.cookie);
  assert.equal((await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w').carregada, false);
  assert.equal((await a.m.op('arma.carregar', { token: a.atirador, arma: 'nada' }, a.ana.cookie)).status, 400);
  // A ficha guarda a carga junto com o pente: gravar a carga depois de um tiro não devolve a bala.
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  await a.m.op('arma.carregar', { token: a.atirador, arma: 'w' }, a.ana.cookie);
  assert.equal((await a.m.op('token.ficha', { token: a.atirador })).status, 200);
  kenshin = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'w');
  assert.deepEqual([kenshin.carregada, kenshin.pente.atual], [true, kenshin.pente.max - 1], 'lido de novo da ficha');
});

test('a Omaha fica carregada até o fim do turno, com 3 balas; a coronha da Dian; a Zhuo só com Smart melhorada', async t => {
  const a = await arena(t, solo('Armas', [
    item('o', 'armas-2077:militech-m-76e-omaha', 'equipado', 'ao'), item('ao', 'core_ammo:heavy-pistol-basic', 'carregando'),
    item('d', 'armas-2077:kang-tao-g-58-dian', 'carregando', 'ad'), item('ad', 'core_ammo:medium-pistol-basic', 'carregando'),
    item('z', 'armas-2077:kang-tao-l-69-zhuo', 'carregando', 'az'), item('az', 'core_ammo:shotgun-shell-basic', 'carregando'),
    item('x', 'core_weapons:heavy-pistol-excellent', 'carregando', 'ax'), item('ax', 'core_ammo:heavy-pistol-basic', 'carregando'),
    item('n', 'cyberware-2077:neuroport', '')
  ]));
  const capanga = await a.npc(950, 150);
  await a.m.op('arma.carregar', { token: a.atirador, arma: 'o' }, a.ana.cookie);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'o', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  let omaha = (await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'o');
  assert.deepEqual([omaha.carregada, omaha.pente.atual], [true, 6], 'carregada: 3 balas, e continua carregada para o segundo tiro');
  assert.ok((await a.ultima()).ataque.notas.some(nota => /continua CDT 2/.test(nota)));

  assert.equal((await a.m.op('arma.coronha', { token: a.atirador, arma: 'd' }, a.ana.cookie)).status, 200);
  await a.m.op('token.ficha', { token: a.atirador });
  assert.equal((await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'd').coronha, true, 'a coronha fica na ficha');
  await a.m.op('ataque', { atacante: a.atirador, arma: 'd', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.ok((await a.ultima()).ataque.rolagem.partes.some(parte => parte.rotulo === 'Coronha recolhida' && parte.valor === -1));
  assert.equal((await a.m.op('arma.coronha', { token: a.atirador, arma: 'o' }, a.ana.cookie)).status, 400, 'a Omaha não tem coronha retrátil');

  const zhuo = await a.m.op('ataque', { atacante: a.atirador, arma: 'z', modo: 'cartucho', alvo: capanga }, a.ana.cookie);
  assert.equal(zhuo.status, 400);
  assert.match(zhuo.json.erro, /só aceita munição Smart melhorada/);

  await a.m.op('ataque', { atacante: a.atirador, arma: 'x', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.ok((await a.ultima()).ataque.rolagem.partes.some(parte => parte.rotulo === 'Qualidade excelente'), 'a arma excelente do livro também tem +1');
});

test('NPC do Mission Kit: a Omaha com o perfil, a carga sem registro para os jogadores, e no combate ela sai quando a vez passa', async t => {
  const a = await arena(t, solo('Alguém', []));
  const gonk = (await a.m.op('token.criar', { cena: a.cena, npc: 'kit:7', x: 950, y: 150 })).json.resultado.token;
  const capanga = await a.npc(1150, 150);
  const omahaDe = async () => (await a.token(gonk)).armas.find(arma => /Omaha/.test(arma.nome));
  assert.equal((await omahaDe()).kit.classe, 'tech', 'a arma da ficha do livro vem com o perfil pelo nome');
  assert.equal((await a.m.op('combate.iniciar', { cena: a.cena, tokens: [gonk, capanga] })).status, 200);
  const antes = await a.ultima(a.bruno.cookie);
  assert.equal((await a.m.op('arma.carregar', { token: gonk, arma: (await omahaDe()).id })).status, 200);
  assert.equal((await omahaDe()).carregada, true);
  assert.deepEqual(await a.ultima(a.bruno.cookie), antes, 'a carga do NPC não vai para o registro');
  await a.m.op('ataque', { atacante: gonk, arma: (await omahaDe()).id, modo: 'tiro', alvo: capanga });
  assert.equal((await omahaDe()).carregada, true, 'a Omaha fica carregada até o fim do turno');
  await a.m.op('combate.proximo');
  assert.equal((await omahaDe()).carregada, false, 'a vez passou: a carga saiu');
});

test('espingarda com cartucho: DV 13, e 3d6 (rolado uma vez) em todos à frente até 6 m e à vista', async t => {
  const a = await arena(t, solo('Espingarda', [item('w', 'core_weapons:shotgun', 'equipado', 'am'), item('am', 'core_ammo:shotgun-shell-basic', 'carregando')]));
  const frente = await a.npc(350, 150);
  const diagonal = await a.npc(350, 250);
  const lado = await a.npc(150, 350);
  const longe = await a.npc(550, 150);
  const atras = await a.npc(350, 350);
  const arma = (await a.token(a.atirador, a.ana.cookie)).armas.find(entrada => entrada.id === 'w');
  assert.deepEqual(arma.modos, ['cartucho'], 'carregada com cartucho');
  // Uma parede entre quem atira e o NPC em (350, 350), que está a 4 m e à frente (45°).
  await a.m.op('parede.criar', { cena: a.cena, paredes: [{ c: [200, 400, 400, 200] }] });
  // REF 8 + Armas de Ombro 6 + 2 = 16 contra DV 13: acertou. Dano 3d6 = 12 contra SP 7: passam 5 em cada um (o dano é
  // rolado uma vez: o segundo não rola os dados do meio).
  a.m.fila.push(2, 4, 4, 4);
  const tiro = await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'cartucho', alvo: frente }, a.ana.cookie);
  assert.equal(tiro.status, 200, tiro.text);
  const cartao = await a.ultima();
  assert.equal(cartao.ataque.descricao, 'Espingarda com cartucho');
  assert.equal(cartao.ataque.dv, 13);
  assert.deepEqual(cartao.ataque.alvos.map(alvo => alvo.token).sort(), [frente, diagonal].sort(), 'o de lado, o longe e o atrás da parede ficam fora');
  for (const id of [frente, diagonal]) assert.deepEqual((await a.token(id)).hp, { atual: 30, max: 35 });
  for (const id of [lado, longe, atras]) assert.deepEqual((await a.token(id)).hp, { atual: 35, max: 35 });
  assert.equal((await a.token(a.atirador, a.ana.cookie)).armas.find(entrada => entrada.id === 'w').pente.atual, arma.pente.max - 1);
  // 14 − 5 + 3 = 12: errou o cartucho, ninguém leva.
  a.m.fila.push(3);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'cartucho', alvo: frente, mod: -5 }, a.ana.cookie);
  const errou = await a.ultima();
  assert.deepEqual([errou.ataque.errou, errou.ataque.alvos.length], [true, 0]);
  assert.equal((await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'cartucho', alvo: lado }, a.ana.cookie)).status, 200, 'mirar no de lado: ele fica à frente');
  assert.equal((await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'mirado', alvo: frente }, a.ana.cookie)).json.resultado.concluido, true, 'mirado não existe com cartucho: vira cartucho');
  assert.equal((await a.ultima()).ataque.modo, 'cartucho');
});

test('Carnage sem BODY 10 rompe o músculo de quem atira; o ferrolho da Grad trava até gastar a Ação', async t => {
  const a = await arena(t, solo('Coice', [item('w', 'armas-2077:budget-arms-carnage', 'equipado', 'am'), item('am', 'core_ammo:shotgun-slug-basic', 'carregando'),
    item('g', 'armas-2077:techtronika-spt32-grad', 'carregando', 'ar'), item('ar', 'core_ammo:rifle-basic', 'carregando')]));
  const capanga = await a.npc(950, 150);
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  const cartao = await a.ultima();
  assert.ok(cartao.ataque.notas.some(nota => /BODY 7/.test(nota)));
  const lesao = regras.critBody.find(linha => linha[0] === 9)[1];
  assert.deepEqual((await a.token(a.atirador, a.ana.cookie)).lesoes, [lesao], 'Músculo rompido');
  await a.m.op('ataque', { atacante: a.atirador, arma: 'w', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.deepEqual((await a.token(a.atirador, a.ana.cookie)).lesoes, [lesao], 'a lesão não repete');
  assert.equal((await a.m.op('ataque.desfazer', { entrada: cartao.id })).status, 200);

  assert.equal((await a.m.op('ataque', { atacante: a.atirador, arma: 'g', modo: 'tiro', alvo: capanga }, a.ana.cookie)).status, 200);
  assert.equal((await a.token(a.atirador, a.ana.cookie)).armas.find(arma => arma.id === 'g').ferrolho, true);
  await a.m.op('token.ficha', { token: a.atirador });
  const travada = await a.m.op('ataque', { atacante: a.atirador, arma: 'g', modo: 'tiro', alvo: capanga }, a.ana.cookie);
  assert.equal(travada.status, 400);
  assert.match(travada.json.erro, /ferrolho/);
  assert.equal((await a.m.op('arma.ferrolho', { token: a.atirador, arma: 'g' }, a.ana.cookie)).status, 200);
  assert.equal((await a.m.op('ataque', { atacante: a.atirador, arma: 'g', modo: 'tiro', alvo: capanga }, a.ana.cookie)).status, 200, 'manejou: atira de novo');
});
