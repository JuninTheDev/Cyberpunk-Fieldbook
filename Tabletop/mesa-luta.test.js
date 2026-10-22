// Testes da luta na mesa da wiki (M9b): as regras sozinhas (mesa-regras.js) e o caminho pela API: agarrar, escapar,
// estrangular, derrubar, o escudo humano, o arremesso, a arma no chão, o registro do turno e os movimentos das Artes
// Marciais, com os dados rolados de propósito (sem fila, o d10 dá 5 e o d6 dá 3).
const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('./mesa-regras');
const { montar } = require('./teste-ajuda');

test('regras: o agarrão, o escudo humano, as mãos, o arremesso e as formas', () => {
  assert.equal(R.venceuResistido(16, 16), false, 'o empate é de quem resiste');
  assert.equal(R.venceuResistido(17, 16), true);
  assert.deepEqual(R.danoDoAgarrao({ hp: 30, body: 7 }), { hp: 23, desmaiou: false, motivo: null });
  assert.deepEqual(R.danoDoAgarrao({ hp: 5, body: 7, estrangular: true }), { hp: 1, desmaiou: true, motivo: 'abaixoDeZero' }, 'estrangulando abaixo de 0: fica com 1 e desmaia');
  assert.deepEqual(R.danoDoAgarrao({ hp: 0, body: 7, estrangular: true }), { hp: 0, desmaiou: true, motivo: 'abaixoDeZero' }, 'quem já está abaixo de 1 não sobe');
  assert.deepEqual(R.danoDoAgarrao({ hp: 30, body: 7, estrangular: true, vezes: 3 }), { hp: 23, desmaiou: true, motivo: 'tresRodadas' });
  assert.equal(R.danoDoAgarrao({ hp: 5, body: 7 }).hp, -2, 'derrubar pode passar de 0');
  assert.equal(R.vezesEstrangulando(null, { combate: 'c', rodada: 1 }), 1);
  assert.equal(R.vezesEstrangulando({ combate: 'c', rodada: 1, vezes: 1 }, { combate: 'c', rodada: 2 }), 2, 'na rodada seguinte, soma');
  assert.equal(R.vezesEstrangulando({ combate: 'c', rodada: 2, vezes: 2 }, { combate: 'c', rodada: 2 }), 2, 'na mesma rodada, não soma');
  assert.equal(R.vezesEstrangulando({ combate: 'c', rodada: 1, vezes: 2 }, { combate: 'c', rodada: 3 }), 1, 'pulou uma rodada: começa de novo');
  assert.equal(R.vezesEstrangulando({ combate: null, vezes: 2 }, {}), 3, 'fora de combate, toda vez conta');
  assert.equal(R.escudoBloqueia({ modo: 'tiro' }), true);
  assert.equal(R.escudoBloqueia({ modo: 'mirado', local: 'cabeca' }), false, 'não segura o tiro mirado na cabeça');
  assert.equal(R.escudoBloqueia({ modo: 'mirado', local: 'perna' }), true);
  assert.equal(R.escudoBloqueia({ modo: 'corpo' }), false, 'nem o corpo a corpo');
  assert.equal(R.escudoBloqueia({ modo: 'explosivo' }), false, 'nem a área');
  assert.equal(R.maosDaArma({ classe: 'assaultRifle' }), 2);
  assert.equal(R.maosDaArma({ classe: 'heavyPistol' }), 1);
  assert.equal(R.maosDaArma({ classe: 'heavyMelee', maos: 2, distancia: false }, 8), 1, 'BODY 8: a arma branca de duas mãos vai numa');
  assert.equal(R.maosDaArma({ classe: 'heavyMelee', maos: 2, distancia: false }, 7), 2);
  assert.deepEqual(R.modosDaArma({ classe: 'artesMarciais', golpes: ['quebraOssos', 'outro'] }), ['corpo', 'quebraOssos']);
  assert.deepEqual(R.modosDaArma({ classe: 'thrownWeapon', pericia: 'Athletics', nome: 'Kendachi Mono-Star' }), ['arremesso'], 'a de arremesso que não explode');
  assert.deepEqual(R.modosDaArma({ classe: 'thrownWeapon', pericia: 'Athletics', nome: 'Coquetel molotov' }), ['explosivo']);
  assert.equal(R.podeEsquivar({ modo: 'voadora', ref: 2 }), true, 'o golpe é corpo a corpo: todos esquivam');
  assert.equal(R.podeEsquivar({ modo: 'corpo', ref: 9, preso: true }), false, 'o inconsciente e o escudo humano não esquivam');
  assert.equal(R.formaDaPericia('Martial Arts (Karate)'), 'karate');
  assert.equal(R.formaDaPericia('Artes Marciais (Judô)'), 'judo');
  assert.equal(R.formaDaPericia('Caratê'), 'karate');
  assert.equal(R.formaDaPericia('Martial Arts'), null);
  assert.equal(R.ehArtesMarciais('Martial Arts'), true);
  assert.equal(R.ehArtesMarciais('Brawling'), false);
});

test('regras: os movimentos de cada forma e o requisito pelo registro do turno', () => {
  const formas = [{ forma: 'karate', pericia: 'Martial Arts (Karate)', nivel: 4 }, { forma: 'judo', pericia: 'Martial Arts (Judo)', nivel: 0 }];
  const ids = R.movimentosDisponiveis(formas, { will: 6, move: 8 }).map(m => m.id);
  assert.deepEqual(ids, ['recuperacao', 'quebraArmadura', 'quebraOssos'], 'só a forma com pelo menos 1 ponto, e a Recuperação com qualquer uma');
  assert.equal(R.movimentosDisponiveis(formas, { will: 6 }).find(m => m.id === 'quebraOssos').bloqueio, 'Pede WILL 8+.');
  assert.equal(R.movimentosDisponiveis(formas, { will: 8 }).find(m => m.id === 'quebraOssos').bloqueio, '');
  assert.equal(R.passouNoMovimento(15, 15), false, 'precisa superar a DV');
  const feitos = [
    { turno: 3, atacante: 'eu', alvo: 'x', classe: 'briga', corpo: true, acertou: true },
    { turno: 3, atacante: 'eu', alvo: 'x', classe: 'artesMarciais', corpo: true, acertou: true },
    { turno: 3, atacante: 'eu', alvo: 'y', classe: 'lightMelee', corpo: true, acertou: true },
    { turno: 2, atacante: 'y', alvo: 'eu', classe: 'briga', corpo: true, acertou: false, esquivou: true }
  ];
  assert.equal(R.requisitoDoMovimento('desarmeCombinado', { feitos, turno: 3, eu: 'eu', alvo: 'x' }).ok, true);
  assert.equal(R.requisitoDoMovimento('desarmeCombinado', { feitos, turno: 4, eu: 'eu', alvo: 'x' }).ok, false, 'neste turno');
  assert.equal(R.requisitoDoMovimento('quebraArmadura', { feitos, turno: 3, eu: 'eu', alvo: 'x' }).ok, false, 'a arma branca foi no outro alvo');
  assert.equal(R.requisitoDoMovimento('quebraArmadura', { feitos, turno: 3, eu: 'eu', alvo: 'y' }).ok, false, 'sem as Artes Marciais nele');
  assert.equal(R.requisitoDoMovimento('escapeDeAgarrao', { feitos, turno: 3, eu: 'eu', quemAgarra: 'x' }).ok, true, 'dois acertos corpo a corpo em quem agarra');
  assert.equal(R.requisitoDoMovimento('escapeDeAgarrao', { feitos, turno: 3, eu: 'eu', quemAgarra: 'y' }).ok, false);
  assert.equal(R.requisitoDoMovimento('contraQueda', { feitos, turno: 3, eu: 'eu', alvo: 'y', desde: 1 }).ok, true, 'desviou de tudo desde a vez anterior, e o alvo atacou');
  assert.equal(R.requisitoDoMovimento('contraQueda', { feitos, turno: 3, eu: 'eu', alvo: 'x', desde: 1 }).ok, false, 'o alvo não atacou');
  assert.equal(R.requisitoDoMovimento('contraQueda', { feitos, turno: 3, eu: 'eu', alvo: 'y', desde: 2 }).ok, false, 'o ataque foi antes do último turno');
  const pegou = [...feitos, { turno: 2, atacante: 'x', alvo: 'eu', classe: 'briga', corpo: true, acertou: true, esquivou: false }];
  assert.equal(R.requisitoDoMovimento('contraQueda', { feitos: pegou, turno: 3, eu: 'eu', alvo: 'y', desde: 1 }).ok, false, 'um pegou');
  assert.equal(R.requisitoDoMovimento('voadora', { turno: 3, andou: { turno: 3, metros: 4 } }).ok, true);
  assert.equal(R.requisitoDoMovimento('voadora', { turno: 3, andou: { turno: 2, metros: 10 } }).ok, false, 'andou no turno de antes');
  assert.equal(R.requisitoDoMovimento('apertoDeFerro', {}).ok, true, 'sem requisito do turno');
  const errou = [{ turno: 5, atacante: 'eu', alvo: 'z', classe: 'briga', corpo: true, acertou: false }, { turno: 5, atacante: 'eu', alvo: 'z', classe: 'artesMarciais', corpo: true, acertou: true }];
  assert.equal(R.requisitoDoMovimento('desarmeCombinado', { feitos: errou, turno: 5, eu: 'eu', alvo: 'z' }).ok, false, 'o ataque que errou não conta');
});

// O lutador: DEX 7, BODY 6, WILL 8, MOVE 8; as quatro formas com 4, Briga 3, Armas Brancas 3, Evasão 6 e uma faca. O
// Guarda-costas (mooks:0): DEX 5, BODY 6, Briga 11, Evasão 7, Kevlar SP 7, 35 HP.
const fichaLutador = {
  nome: 'Kai "Garra" Okafor', role: 'solo', stats: { REF: 7, DEX: 7, BODY: 6, WILL: 8, MOVE: 8 },
  resultado: {
    stats: { REF: 7, DEX: 7, BODY: 6, WILL: 8, MOVE: 8 }, derivados: { hp: 40 },
    pericias: [['Martial Arts (Karate)', 4], ['Martial Arts (Judo)', 4], ['Martial Arts (Aikido)', 4], ['Martial Arts (Taekwondo)', 4], ['Brawling', 3], ['Melee Weapon', 3], ['Evasion', 6], ['Athletics', 2]].map(([nome, nivel]) => ({ nome, stat: 'DEX', nivel })),
    itens: [{ uid: 'f1', id: 'core_weapons:light-melee', nome: 'Faca', qtd: 1, uso: 'equipado' }]
  }
};
const fichaNyx = { nome: 'Iris "Nyx" Tanaka', role: 'netrunner', stats: { REF: 6, DEX: 5, BODY: 5 }, resultado: { stats: { REF: 6, DEX: 5, BODY: 5 }, derivados: { hp: 40 }, pericias: [{ nome: 'Brawling', stat: 'DEX', nivel: 2 }],
  itens: [{ uid: 'n1', id: 'core_weapons:medium-pistol', nome: 'Pistola média', qtd: 1, uso: 'equipado' }] } };

// Cena de 100 px = 2 m. O Kai em (150, 150), o Guarda-costas ao lado (250, 150), a Nyx em (150, 350) e outro capanga
// a 10 m (650, 150).
async function ringue(t) {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaLutador);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const cena = (await m.op('cena.criar', { nome: 'Ringue', largura: 3000, altura: 2000, grade: { tamanho: 100 } })).json.resultado.cena;
  const kai = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const capanga = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 250, y: 150 })).json.resultado.token;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 150, y: 350 })).json.resultado.token;
  const longe = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 650, y: 150 })).json.resultado.token;
  await m.op('cena.ativar', { cena });
  const estado = async cookie => (await m.pedir('/api/mesa/estado', { cookie })).json;
  const token = async (id, cookie) => (await estado(cookie)).cena.tokens.find(item => item.id === id);
  const ultima = async cookie => { const registro = (await estado(cookie)).registro; return registro[registro.length - 1]; };
  return { m, ana, bruno, cena, kai, capanga, nyx, longe, estado, token, ultima };
}

test('agarrar: o empate é de quem resiste; agarrado, −2 em tudo, arrastado e sem arma de duas mãos', async t => {
  const r = await ringue(t);
  // Kai: DEX 7 + Briga 3 + 5 = 15; o Guarda-costas: Briga 11 + 4 = 15. Empate: resistiu.
  r.m.fila.push(5, 4);
  let feito = await r.m.op('luta.agarrar', { token: r.kai, alvo: r.capanga }, r.ana.cookie);
  assert.equal(feito.status, 200, feito.text);
  assert.equal(feito.json.resultado.agarrou, false);
  const cartao = await r.ultima(r.bruno.cookie);
  assert.equal(cartao.tipo, 'luta');
  assert.deepEqual(cartao.luta.rolagens.map(item => item.rolagem.total), [15, 15]);
  assert.match(cartao.luta.frase, /empate é de quem resiste/);
  assert.equal((await r.m.op('luta.agarrar', { token: r.kai, alvo: r.longe }, r.ana.cookie)).status, 400, 'longe demais');
  assert.equal((await r.m.op('luta.agarrar', { token: r.capanga, alvo: r.kai }, r.ana.cookie)).status, 403, 'o capanga não é da Ana');
  // 7 + 3 + 9 = 19 contra 11 + 4 = 15: agarrou.
  r.m.fila.push(9, 4);
  feito = await r.m.op('luta.agarrar', { token: r.kai, alvo: r.capanga }, r.ana.cookie);
  assert.equal(feito.json.resultado.agarrou, true);
  const kai = await r.token(r.kai, r.ana.cookie);
  assert.deepEqual(kai.agarrao, { papel: 'agarrando', outro: r.capanga });
  assert.deepEqual((await r.token(r.capanga, r.bruno.cookie)).agarrao, { papel: 'agarrado', outro: r.kai }, 'todos veem o agarrão');
  await r.m.op('token.mover', { token: r.nyx, x: 250, y: 250 });
  assert.equal((await r.m.op('luta.agarrar', { token: r.nyx, alvo: r.capanga }, r.bruno.cookie)).status, 409, 'já está num agarrão');
  // O teste pelo token tem −2.
  const rolagem = (await r.m.op('rolar', { modo: 'teste', token: r.kai, pericia: 'Athletics' }, r.ana.cookie)).json.resultado.rolagem;
  assert.ok(rolagem.partes.some(parte => parte.rotulo === 'Agarrando' && parte.valor === -2), JSON.stringify(rolagem.partes));
  // O ataque também, e a espingarda (duas mãos) não vai.
  assert.equal((await r.m.op('ataque', { atacante: r.capanga, arma: 'npc:0', modo: 'tiro', alvo: r.kai })).status, 400, 'no agarrão, ninguém usa arma de duas mãos');
  // Estrangular o Guarda-costas: o mestre vê o HP; o jogador, não (é NPC).
  await r.m.op('luta.estrangular', { token: r.kai }, r.ana.cookie);
  assert.deepEqual((await r.ultima()).luta.hp, { antes: 35, depois: 29 });
  assert.equal((await r.ultima(r.ana.cookie)).luta.hp, null, 'o HP do NPC não vai para os jogadores');
  // Quem agarra arrasta: o Kai anda dois quadrados, o Guarda-costas vai junto.
  assert.equal((await r.m.op('token.mover', { token: r.kai, x: 350, y: 350 }, r.ana.cookie)).status, 200);
  assert.deepEqual([(await r.token(r.capanga)).x, (await r.token(r.capanga)).y], [450, 350]);
  // O mestre desfaz o agarrão: os dois saem livres.
  const agarrao = (await r.estado()).registro.find(item => item.tipo === 'luta' && item.luta.resultado === 'agarrou');
  assert.equal((await r.m.op('ataque.desfazer', { entrada: agarrao.id })).status, 200);
  assert.equal((await r.token(r.kai, r.ana.cookie)).agarrao, undefined);
  assert.equal((await r.token(r.capanga)).agarrao, undefined);
});

test('escapar, estrangular três vezes até desmaiar, desfazer, derrubar e soltar', async t => {
  const r = await ringue(t);
  // O Guarda-costas agarra a Nyx: Briga 11 + 6 = 17 contra DEX 5 + Briga 2 + 5 = 12.
  r.m.fila.push(6);
  await r.m.op('token.mover', { token: r.capanga, x: 150, y: 250 });
  assert.equal((await r.m.op('luta.agarrar', { token: r.capanga, alvo: r.nyx })).json.resultado.agarrou, true);
  assert.equal((await r.m.op('token.mover', { token: r.nyx, x: 550, y: 550 }, r.bruno.cookie)).status, 409, 'agarrada, a Nyx não anda sozinha');
  // Escapar (os dois com o −2 do agarrão): 5 + 2 − 2 + 9 = 14 contra 11 − 2 + 5 = 14: o empate é de quem segura.
  r.m.fila.push(9);
  assert.equal((await r.m.op('luta.escapar', { token: r.nyx }, r.bruno.cookie)).json.resultado.escapou, false);
  assert.equal((await r.m.op('luta.soltar', { token: r.nyx }, r.bruno.cookie)).status, 403, 'quem é agarrado não solta: escapa');
  // Estrangular (BODY 6, fora de combate toda vez conta): 40 → 34 → 28 → 22, e na terceira desmaia.
  for (const [vez, hp] of [[1, 34], [2, 28]]) {
    const feito = await r.m.op('luta.estrangular', { token: r.capanga });
    assert.equal(feito.json.resultado.hp, hp, `vez ${vez}`);
    assert.equal(feito.json.resultado.desmaiou, false);
  }
  const terceira = await r.m.op('luta.estrangular', { token: r.capanga });
  assert.deepEqual(terceira.json.resultado, { hp: 22, desmaiou: true });
  let nyx = await r.token(r.nyx, r.bruno.cookie);
  assert.equal(nyx.inconsciente, true);
  assert.deepEqual(nyx.hp, { atual: 22, max: 40 });
  assert.equal((await r.m.op('luta.escapar', { token: r.nyx }, r.bruno.cookie)).status, 400, 'inconsciente não age');
  const doc = (await r.m.pedir(`/api/personagens/${r.bruno.personagem.id}`, { cookie: r.bruno.cookie })).json.personagem;
  assert.equal(doc.jogo.hp.atual, 22, 'o HP vai para a ficha');
  assert.equal((await r.m.op('ataque', { atacante: r.nyx, arma: 'briga', alvo: r.capanga }, r.bruno.cookie)).status, 400, 'inconsciente não ataca');
  const entrada = (await r.ultima()).id;
  // Inconsciente, não esquiva nem o corpo a corpo.
  await r.m.op('ataque', { atacante: r.capanga, arma: 'briga', alvo: r.nyx });
  assert.equal((await r.ultima()).ataque.alvos[0].escolha, 'aguentar', 'inconsciente não esquiva');
  // O mestre desfaz a terceira: o HP volta e ela acorda.
  assert.equal((await r.m.op('ataque.desfazer', { entrada })).status, 200);
  nyx = await r.token(r.nyx, r.bruno.cookie);
  assert.equal(nyx.inconsciente, undefined);
  assert.equal(nyx.hp.atual, 28);
  // Derrubar: 28 → 22, caída, e o agarrão acaba.
  assert.equal((await r.m.op('luta.derrubar', { token: r.capanga })).json.resultado.hp, 22);
  nyx = await r.token(r.nyx, r.bruno.cookie);
  assert.equal(nyx.caido, true);
  assert.equal(nyx.agarrao, undefined);
  assert.equal((await r.token(r.capanga)).agarrao, undefined);
  assert.equal((await r.m.op('token.mover', { token: r.nyx, x: 550, y: 550 }, r.bruno.cookie)).status, 409, 'caída, levanta antes');
  assert.equal((await r.m.op('luta.levantar', { token: r.nyx }, r.bruno.cookie)).status, 200);
  assert.equal((await r.m.op('token.mover', { token: r.nyx, x: 550, y: 550 }, r.bruno.cookie)).status, 200);
  // Escapar dá certo: 5 + 2 + 9 = 16 contra 11 + 4 = 15 (sem agarrão, o Guarda-costas agarra de novo antes).
  r.m.fila.push(9);
  await r.m.op('token.mover', { token: r.nyx, x: 150, y: 350 });
  assert.equal((await r.m.op('luta.agarrar', { token: r.capanga, alvo: r.nyx })).json.resultado.agarrou, true);
  r.m.fila.push(9, 2);
  assert.equal((await r.m.op('luta.escapar', { token: r.nyx }, r.bruno.cookie)).json.resultado.escapou, true);
  assert.equal((await r.token(r.nyx, r.bruno.cookie)).agarrao, undefined);
  assert.equal((await r.token(r.capanga)).agarrao, undefined);
  // Quem agarra morre: o agarrão acaba.
  r.m.fila.push(6);
  await r.m.op('luta.agarrar', { token: r.capanga, alvo: r.nyx });
  await r.m.op('token.estado', { token: r.capanga, morto: true });
  assert.equal((await r.token(r.nyx, r.bruno.cookie)).agarrao, undefined, 'quem agarra morreu: o agarrão acaba');
  await r.m.op('token.estado', { token: r.capanga, morto: false });
  // Soltar: só quem agarra (o mestre solta qualquer lado).
  r.m.fila.push(9, 4);
  await r.m.op('luta.agarrar', { token: r.kai, alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.m.op('luta.soltar', { token: r.kai }, r.ana.cookie)).status, 200);
  assert.equal((await r.token(r.capanga)).agarrao, undefined);
});

test('escudo humano: o tiro vai no agarrado, que não esquiva; o mirado na cabeça e o corpo a corpo não; morto, segura até o BODY', async t => {
  const r = await ringue(t);
  r.m.fila.push(9, 4);
  await r.m.op('luta.agarrar', { token: r.kai, alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.m.op('luta.escudo', { token: r.kai, ligar: true }, r.ana.cookie)).status, 200);
  // O outro capanga atira no Kai com a pistola muito pesada: Armas de uma Mão 10 + 8 = 18 contra a DV 15 (o escudo está a
  // 8 m). O escudo humano aguenta: 4d6 = 16 contra o SP 7.
  r.m.fila.push(8, 4, 4, 4, 4);
  const tiro = await r.m.op('ataque', { atacante: r.longe, arma: 'npc:1', modo: 'tiro', alvo: r.kai });
  assert.equal(tiro.status, 200, tiro.text);
  let cartao = await r.ultima();
  assert.equal(cartao.ataque.alvos.length, 1);
  assert.equal(cartao.ataque.alvos[0].token, r.capanga, 'o tiro foi no escudo humano');
  assert.equal(cartao.ataque.alvos[0].escolha, 'aguentar', 'o escudo humano não esquiva');
  assert.ok(cartao.ataque.alvos[0].acertou);
  assert.ok((await r.token(r.capanga)).hp.atual < 35);
  const kaiHp = (await r.token(r.kai, r.ana.cookie)).hp.atual;
  assert.equal(kaiHp, 40, 'o Kai não sofreu nada');
  // O tiro mirado na cabeça passa por cima do escudo (e erra: 10 − 8 + 5 contra a DV 15).
  await r.m.op('ataque', { atacante: r.longe, arma: 'npc:1', modo: 'mirado', local: 'cabeca', alvo: r.kai });
  cartao = await r.ultima();
  assert.equal(cartao.ataque.alvos[0].token, r.kai, 'o mirado na cabeça vai no Kai');
  assert.equal((await r.token(r.capanga)).hp.atual, 26, 'o escudo levou 9');
  // Morto, o agarrado vira escudo com HP igual ao BODY dele (6).
  await r.m.op('token.estado', { token: r.capanga, morto: true });
  assert.equal((await r.token(r.kai)).agarrao.escudoHp, 6);
  // 18 contra a DV 15 (o Kai a 10 m): 4d6 = 8 no escudo de 6 HP.
  r.m.fila.push(8, 2, 2, 2, 2);
  await r.m.op('ataque', { atacante: r.longe, arma: 'npc:1', modo: 'tiro', alvo: r.kai });
  cartao = await r.ultima();
  assert.equal(cartao.ataque.alvos[0].token, r.kai);
  assert.equal(cartao.ataque.alvos[0].atrasDoCorpo, 'Guarda-costas');
  assert.deepEqual(cartao.ataque.alvos[0].escudo, { total: 8, antes: 6, depois: 0, quebrou: true });
  assert.equal((await r.token(r.kai, r.ana.cookie)).hp.atual, kaiHp, 'o que sobra se perde');
  assert.equal((await r.token(r.kai)).agarrao, undefined, 'o escudo quebrou: o agarrão acaba');
});

test('arremessar a faca: DEX + Atletismo contra a DV do lança-granadas; sem metade do SP; a faca fica no chão até pegar', async t => {
  const r = await ringue(t);
  // A Nyx a 4 m: DV 16 (até 6 m). DEX 7 + Atletismo 2 + 8 = 17. A faca: 1d6 = 6, sem armadura nela.
  r.m.fila.push(8, 6);
  const arremesso = await r.m.op('ataque', { atacante: r.kai, arma: 'f1', modo: 'arremesso', alvo: r.nyx }, r.ana.cookie);
  assert.equal(arremesso.status, 200, arremesso.text);
  const cartao = await r.ultima();
  assert.equal(cartao.ataque.descricao, 'Arremesso');
  assert.equal(cartao.ataque.alvos[0].dv, 16);
  assert.ok(cartao.ataque.rolagem.partes.some(parte => /Atletismo/.test(parte.rotulo)), JSON.stringify(cartao.ataque.rolagem.partes));
  assert.equal((await r.token(r.nyx, r.bruno.cookie)).hp.atual, 34);
  const faca = (await r.token(r.kai, r.ana.cookie)).armas.find(arma => arma.id === 'f1');
  assert.equal(faca.largada, true);
  const doc = (await r.m.pedir(`/api/personagens/${r.ana.personagem.id}`, { cookie: r.ana.cookie })).json.personagem;
  assert.equal(doc.jogo.armas.f1.largada, true, 'a ficha guarda');
  await r.m.op('token.ficha', { token: r.kai });
  assert.equal((await r.token(r.kai, r.ana.cookie)).armas.find(arma => arma.id === 'f1').largada, true, 'e a mesa lê de lá');
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'f1', modo: 'corpo', alvo: r.capanga }, r.ana.cookie)).status, 400, 'no chão, não ataca');
  // O desfazer devolve a faca; arremessada de novo, o Kai pega.
  await r.m.op('ataque.desfazer', { entrada: cartao.id });
  assert.equal((await r.token(r.kai, r.ana.cookie)).armas.find(arma => arma.id === 'f1').largada, undefined);
  // No Guarda-costas (SP 7): o 6 da faca não passa (corpo a corpo, a metade do SP deixaria passar 2).
  r.m.fila.push(9, 6);
  await r.m.op('ataque', { atacante: r.kai, arma: 'f1', modo: 'arremesso', alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.ultima()).ataque.alvos[0].dano.passou, 0, 'arremessada, a arma branca não ignora metade do SP');
  assert.equal((await r.m.op('arma.pegar', { token: r.kai, arma: 'f1' }, r.ana.cookie)).status, 200);
  assert.equal((await r.token(r.kai, r.ana.cookie)).armas.find(arma => arma.id === 'f1').largada, undefined);
  assert.equal((await r.m.op('arma.pegar', { token: r.kai, arma: 'f1' }, r.ana.cookie)).status, 400, 'já está na mão');
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'f1', modo: 'arremesso', alvo: r.longe }, r.ana.cookie)).status, 200, 'o outro a 10 m: dá');
  await r.m.op('arma.pegar', { token: r.kai, arma: 'f1' }, r.ana.cookie);
  await r.m.op('token.mover', { token: r.longe, x: 1450, y: 150 });
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'f1', modo: 'arremesso', alvo: r.longe }, r.ana.cookie)).status, 400, 'a 26 m, longe demais');
});

test('Artes Marciais: a arma de cada forma, os golpes, e o Golpe quebra-ossos com a lesão', async t => {
  const r = await ringue(t);
  const kai = await r.token(r.kai, r.ana.cookie);
  assert.deepEqual(Object.fromEntries(kai.luta.artes.map(arma => [arma.id, arma.modos])), {
    'artes:karate': ['corpo', 'quebraOssos'], 'artes:judo': ['corpo'], 'artes:aikido': ['corpo'], 'artes:taekwondo': ['corpo', 'pontoDePressao', 'voadora']
  });
  assert.ok(kai.luta.artes.every(arma => arma.dano === '2d6'), 'o dano pelo BODY 6');
  assert.equal((await r.token(r.nyx, r.bruno.cookie)).luta, undefined, 'sem Artes Marciais, nada');
  assert.equal((await r.token(r.kai, r.bruno.cookie)).luta, undefined, 'só o dono e o mestre');
  // Karatê: DEX 7 + 4 + 5 = 16 contra a esquiva 7 + 5 = 12. Dano 2d6 = 6 contra metade do SP 7 (4): passam 2; as
  // Costelas quebradas, +5.
  const golpe = await r.m.op('ataque', { atacante: r.kai, arma: 'artes:karate', modo: 'quebraOssos', alvo: r.capanga }, r.ana.cookie);
  assert.equal(golpe.status, 200, golpe.text);
  const cartao = await r.ultima();
  assert.equal(cartao.ataque.descricao, 'Golpe quebra-ossos');
  assert.ok(cartao.ataque.rolagem.partes[0].rotulo.includes('Artes Marciais (Karatê)'), cartao.ataque.rolagem.partes[0].rotulo);
  assert.equal(cartao.ataque.alvos[0].dano.passou, 2);
  assert.ok(cartao.ataque.alvos[0].dano.lesoes.some(lesao => lesao.nome === 'Costelas quebradas'));
  const capanga = await r.token(r.capanga);
  assert.equal(capanga.hp.atual, 35 - 2 - 5);
  assert.ok(capanga.lesoes.includes('Costelas quebradas'));
  // Na cabeça: −8 e o Crânio rachado (o dano que passa ×2). 7 + 4 − 8 + 9 = 12 contra 12: o empate é do defensor.
  r.m.fila.push(9, 5);
  await r.m.op('ataque', { atacante: r.kai, arma: 'artes:karate', modo: 'quebraOssos', local: 'cabeca', alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.ultima()).ataque.descricao, 'Golpe quebra-ossos na cabeça');
  assert.equal((await r.ultima()).ataque.alvos[0].acertou, false);
  // O Ponto de pressão não é do Karatê (vira o corpo a corpo); a Voadora fora de combate pede a confirmação.
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'artes:karate', modo: 'pontoDePressao', alvo: r.capanga }, r.ana.cookie)).status, 200);
  assert.equal((await r.ultima()).ataque.modo, 'corpo', 'o modo que a arma não tem vira o corpo a corpo');
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'artes:taekwondo', modo: 'voadora', alvo: r.capanga }, r.ana.cookie)).status, 409);
  const voadora = await r.m.op('ataque', { atacante: r.kai, arma: 'artes:taekwondo', modo: 'voadora', alvo: r.capanga, confirmado: true }, r.ana.cookie);
  assert.equal(voadora.status, 200, voadora.text);
  assert.equal((await r.token(r.capanga)).caido, true, 'a Voadora derruba');
});

test('o registro do turno: Desarme combinado, Combinação quebra-armadura, Contra-queda, Voadora e Escape de agarrão', async t => {
  const r = await ringue(t);
  await r.m.op('combate.iniciar', { tokens: [r.kai, r.capanga] });
  await r.m.op('combate.iniciativa', { token: r.kai, valor: 30 });
  await r.m.op('combate.iniciativa', { token: r.capanga, valor: 1 });
  // A vez é do Kai? Volta até ser.
  let combate = (await r.estado()).combate;
  while (combate.vez !== r.kai) { await r.m.op('combate.proximo'); combate = (await r.estado()).combate; }
  // Sem os dois acertos neste turno, o Desarme combinado não vai; o cartão diz o que falta.
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.capanga }, r.ana.cookie)).status, 409);
  let mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'desarmeCombinado');
  assert.deepEqual([mov.pronto, mov.alvos], [false, []]);
  // Briga (7 + 3 + 5 = 15 contra 12) e Aikido (16 contra 12) no Guarda-costas: os dois pegam.
  await r.m.op('ataque', { atacante: r.kai, arma: 'briga', alvo: r.capanga }, r.ana.cookie);
  await r.m.op('ataque', { atacante: r.kai, arma: 'artes:aikido', alvo: r.capanga }, r.ana.cookie);
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'desarmeCombinado');
  assert.deepEqual([mov.pronto, mov.alvos], [true, [r.capanga]]);
  // DV 15: 7 + 4 + 5 = 16. A pistola muito pesada (a primeira na mão) fica com o Kai.
  const desarme = await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.capanga, arma: 'npc:1' }, r.ana.cookie);
  assert.equal(desarme.status, 200, desarme.text);
  assert.equal(desarme.json.resultado.passou, true);
  let capanga = await r.token(r.capanga);
  assert.deepEqual([capanga.armas[1].largada, capanga.armas[1].com], [true, 'Kai "Garra" Okafor']);
  assert.equal((await r.m.op('ataque', { atacante: r.capanga, arma: 'npc:1', modo: 'tiro', alvo: r.kai })).status, 400, 'a pistola está com o Kai');
  // A faca e o Karatê no mesmo alvo: a Combinação quebra-armadura tira 2 SP do Kevlar (7, menos a ablação dos acertos).
  await r.m.op('ataque', { atacante: r.kai, arma: 'f1', alvo: r.capanga }, r.ana.cookie);
  await r.m.op('ataque', { atacante: r.kai, arma: 'artes:karate', alvo: r.capanga }, r.ana.cookie);
  const antes = (await r.token(r.capanga)).sp.corpo.atual;
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'quebraArmadura', alvo: r.capanga }, r.ana.cookie)).json.resultado.passou, true);
  assert.equal((await r.token(r.capanga)).sp.corpo.atual, antes - 2);
  // A vez do Guarda-costas: ele ataca o Kai na briga (11 + 5 = 16) e o Kai desvia (7 + 6 + 5 = 18).
  await r.m.op('combate.proximo');
  await r.m.op('ataque', { atacante: r.capanga, arma: 'briga', alvo: r.kai });
  assert.equal((await r.ultima()).ataque.alvos[0].escolha, 'esquivar');
  assert.equal((await r.ultima()).ataque.alvos[0].acertou, false);
  // De novo a vez do Kai: desviou de tudo desde o último turno. A Contra-queda derruba o Guarda-costas.
  await r.m.op('combate.proximo');
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'contraQueda');
  assert.deepEqual([mov.pronto, mov.alvos], [true, [r.capanga]]);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'contraQueda', alvo: r.capanga }, r.ana.cookie)).json.resultado.passou, true);
  assert.equal((await r.token(r.capanga)).caido, true);
  // A Voadora: pede 4 m andados neste turno.
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'artes:taekwondo', modo: 'voadora', alvo: r.capanga }, r.ana.cookie)).status, 409);
  await r.m.op('token.mover', { token: r.kai, x: 150, y: 350 }, r.ana.cookie);
  await r.m.op('token.mover', { token: r.kai, x: 150, y: 250 }, r.ana.cookie);
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'voadora');
  assert.equal(mov.pronto, true, mov.falta);
  assert.equal((await r.m.op('ataque', { atacante: r.kai, arma: 'artes:taekwondo', modo: 'voadora', alvo: r.capanga }, r.ana.cookie)).status, 200);
  // O Escape de agarrão: o Guarda-costas agarra o Kai (o mestre, na vez do Kai: 11 + 9 = 20 contra 7 + 3 + 5 = 15).
  await r.m.op('token.estado', { token: r.capanga, caido: false });
  r.m.fila.push(9);
  assert.equal((await r.m.op('luta.agarrar', { token: r.capanga, alvo: r.kai })).json.resultado.agarrou, true);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'escapeDeAgarrao' }, r.ana.cookie)).status, 409, 'pede 2 acertos em quem agarra');
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'escapeDeAgarrao');
  assert.match(mov.falta, /tem 1/, 'a Voadora conta como um');
  // Uma briga que erra (7 + 3 − 2 + 2 = 10 contra a esquiva 7 − 2 + 5 = 10) não conta.
  r.m.fila.push(2);
  await r.m.op('ataque', { atacante: r.kai, arma: 'briga', alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.ultima()).ataque.alvos[0].acertou, false);
  assert.match((await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'escapeDeAgarrao').falta, /tem 1/, 'o erro não conta');
  await r.m.op('ataque', { atacante: r.kai, arma: 'briga', alvo: r.capanga }, r.ana.cookie);
  // DV 15, com o −2 do agarrão: 7 + 4 − 2 + 9 = 18.
  r.m.fila.push(9);
  const escape = await r.m.op('luta.movimento', { token: r.kai, movimento: 'escapeDeAgarrao' }, r.ana.cookie);
  assert.equal(escape.json.resultado.passou, true, escape.text);
  capanga = await r.token(r.capanga);
  assert.equal(capanga.agarrao, undefined);
  assert.ok(capanga.lesoes.includes('Braço quebrado'));
  const { hp } = (await r.ultima()).luta;
  assert.deepEqual([hp.depois, capanga.hp.atual], [hp.antes - 5, hp.antes - 5], 'a lesão: +5 direto no HP');
  assert.equal((await r.token(r.kai, r.ana.cookie)).agarrao, undefined);
  // A vez do Guarda-costas: agora ele pega o Kai (11 + 10 + 5 contra 7 + 6 + 2). Na vez do Kai, a Contra-queda não vale.
  await r.m.op('combate.proximo');
  r.m.fila.push(10, 5, 2);
  await r.m.op('ataque', { atacante: r.capanga, arma: 'briga', alvo: r.kai });
  assert.equal((await r.ultima()).ataque.alvos[0].acertou, true);
  await r.m.op('combate.proximo');
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'contraQueda');
  assert.deepEqual([mov.pronto, mov.alvos], [false, []], 'um ataque pegou desde o último turno');
  // Na rodada seguinte, ele ataca e o Kai desvia: o ataque que pegou foi antes do último turno do Kai, e não conta mais.
  await r.m.op('combate.proximo');
  await r.m.op('ataque', { atacante: r.capanga, arma: 'briga', alvo: r.kai });
  assert.equal((await r.ultima()).ataque.alvos[0].escolha, 'esquivar');
  await r.m.op('combate.proximo');
  mov = (await r.token(r.kai, r.ana.cookie)).luta.movimentos.find(item => item.id === 'contraQueda');
  assert.deepEqual([mov.pronto, mov.alvos], [true, [r.capanga]], 'desde o último turno');
});

test('NPC com Artes Marciais: a forma pela perícia da ficha do mestre, e o golpe que pede WILL 8', async t => {
  const r = await ringue(t);
  const salvo = await r.m.op('npc.salvar', { npc: { nome: 'Monge da Tyger Claws', hp: 30, stats: { DEX: 7, WILL: 5, BODY: 8, MOVE: 6, REF: 6 }, pericias: [{ nome: 'Martial Arts (Karate)', base: 13 }, { nome: 'Evasion', base: 12 }] } });
  assert.equal(salvo.status, 200, salvo.text);
  const monge = (await r.m.op('token.criar', { cena: r.cena, npc: salvo.json.resultado.id, x: 250, y: 250 })).json.resultado.token;
  const visto = await r.token(monge);
  assert.deepEqual(visto.luta.artes.map(arma => [arma.id, arma.dano, arma.modos]), [['artes:karate', '3d6', ['corpo', 'quebraOssos']]]);
  assert.equal(visto.luta.movimentos.find(item => item.id === 'quebraOssos').bloqueio, 'Pede WILL 8+.');
  const golpe = await r.m.op('ataque', { atacante: monge, arma: 'artes:karate', modo: 'quebraOssos', alvo: r.kai });
  assert.equal(golpe.status, 400);
  assert.match(golpe.json.erro, /WILL 8/);
  // O soco de Karatê vale: a base da ficha (13) + 5.
  await r.m.op('ataque', { atacante: monge, arma: 'artes:karate', alvo: r.kai });
  assert.equal((await r.ultima()).ataque.rolagem.total, 18);
});

test('Aperto de ferro e Recuperação; o mestre confirma por cima do registro', async t => {
  const r = await ringue(t);
  r.m.fila.push(9, 4);
  await r.m.op('luta.agarrar', { token: r.kai, alvo: r.capanga }, r.ana.cookie);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'escapeDeAgarrao' }, r.ana.cookie)).status, 400, 'o Kai não está agarrado');
  // DV 15, com o −2 do agarrão: 7 + 4 − 2 + 9 = 18.
  r.m.fila.push(9);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'apertoDeFerro' }, r.ana.cookie)).json.resultado.passou, true);
  assert.equal((await r.token(r.capanga)).agarrao.apertoDeFerro, true);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'apertoDeFerro' }, r.ana.cookie)).status, 409, 'já está');
  // No Aperto de ferro: nada de ataque à distância, e −2 a mais para escapar.
  assert.equal((await r.m.op('ataque', { atacante: r.capanga, arma: 'npc:1', modo: 'tiro', alvo: r.kai })).status, 400);
  await r.m.op('luta.escapar', { token: r.capanga });
  const partes = (await r.ultima()).luta.rolagens[0].rolagem.partes;
  assert.ok(partes.some(parte => parte.rotulo === 'Aperto de ferro' && parte.valor === -2), JSON.stringify(partes));
  assert.ok(partes.some(parte => parte.rotulo === 'Agarrado' && parte.valor === -2), 'e o −2 do agarrão');
  // Recuperação (DV 13): 7 + 4 + 5 = 16, levanta sem a Ação.
  await r.m.op('luta.soltar', { token: r.kai }, r.ana.cookie);
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'recuperacao' }, r.ana.cookie)).status, 400, 'não está caído');
  await r.m.op('token.estado', { token: r.kai, caido: true });
  const recuperacao = await r.m.op('luta.movimento', { token: r.kai, movimento: 'recuperacao' }, r.ana.cookie);
  assert.equal(recuperacao.json.resultado.passou, true);
  assert.match((await r.ultima()).luta.frase, /sem gastar a Ação/);
  assert.equal((await r.token(r.kai, r.ana.cookie)).caido, undefined);
  // Em combate, o requisito vem do registro; o mestre confirma por cima (o acerto resolvido à mão).
  await r.m.op('combate.iniciar', { tokens: [r.kai, r.capanga] });
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.capanga, confirmado: true }, r.ana.cookie)).status, 409, 'o jogador não confirma no combate');
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.capanga, confirmado: true })).status, 200, 'o mestre confirma');
  // Fora do combate, o jogador confirma: o Kai desarma a Nyx (a pistola na mão dela), e a pistola fica com ele.
  await r.m.op('combate.encerrar');
  await r.m.op('token.mover', { token: r.nyx, x: 150, y: 250 });
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.nyx }, r.ana.cookie)).status, 409, 'fora do combate, confirme');
  assert.equal((await r.m.op('luta.movimento', { token: r.kai, movimento: 'desarmeCombinado', alvo: r.nyx, confirmado: true }, r.ana.cookie)).json.resultado.passou, true);
  await r.m.op('token.ficha', { token: r.nyx });
  const pistola = (await r.token(r.nyx, r.bruno.cookie)).armas.find(arma => arma.id === 'n1');
  assert.deepEqual([pistola.largada, pistola.com], [true, 'Kai "Garra" Okafor'], 'a ficha da Nyx guarda com quem está');
  assert.equal((await r.m.op('arma.pegar', { token: r.nyx, arma: 'n1' }, r.bruno.cookie)).status, 403, 'com o Kai: só o mestre devolve');
  assert.equal((await r.m.op('arma.pegar', { token: r.nyx, arma: 'n1' })).status, 200);
  assert.equal((await r.token(r.nyx, r.bruno.cookie)).armas.find(arma => arma.id === 'n1').largada, undefined);
});
