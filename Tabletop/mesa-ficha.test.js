// Testes da ficha de jogo (M7): a regra sozinha (personagem-jogo.js: o inventário com o uso de cada item, a munição da
// caixa, a armadura vestida, a penalidade, o EMP pela Humanidade, o dinheiro, o IP e a reputação) e o caminho pela API
// da mesa (o ajuste do mestre, o uso do item, a recarga com a munição da ficha, as fichas ao vivo e a lista da wiki).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const G = require('../personagem-jogo');
const { sleep, montar } = require('./teste-ajuda');

const wiki = path.join(__dirname, '..');
const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(wiki, 'loja-catalogo.js'), 'utf8'), sandbox, { filename: 'loja-catalogo.js' });
const itens = JSON.parse(JSON.stringify(sandbox.shopCatalog.itens));
const catalogo = { item: id => itens.find(item => item.id === id) || null, porNome: nome => itens.find(item => item.en === nome || item.nome === nome) || null };

const linha = (uid, id, uso = '', municao = '', qtd = 1) => ({ uid, id, nome: (catalogo.item(id) || {}).nome || id, qtd, uso, ...(municao ? { municao } : {}) });
// O Jax da criação: pistola carregada (8 das 30 da caixa), espingarda com cartucho e uma caixa de balote, armorjack
// leve vestido, um médio guardado (penalidade −2), binóculos, 1.250eb e Humanidade 36/40.
const resultado = () => ({
  stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5, EMP: 4 }, derivados: { hp: 45 },
  humanidade: { max: 40, perda: 4, atual: 36, emp: 3 }, dinheiro: { saldo: 1250, inicial: 2550 },
  pericias: [{ nome: 'Handgun', stat: 'REF', nivel: 6 }, { nome: 'Evasion', stat: 'DEX', nivel: 6 }, { nome: 'Human Perception', stat: 'EMP', nivel: 2 }],
  itens: [
    linha('p', 'core_weapons:heavy-pistol', 'equipado', 'mp', 1), linha('mp', 'core_ammo:heavy-pistol-basic', '', '', 30),
    linha('e', 'core_weapons:shotgun', 'carregando', 'mc', 1), linha('mc', 'core_ammo:shotgun-shell-basic', '', '', 12), linha('mb', 'core_ammo:shotgun-slug-basic', '', '', 8),
    linha('s', 'core_weapons:smg', 'guardado', 'ms', 1), linha('ms', 'core_ammo:medium-pistol-basic', '', '', 40),
    linha('al', 'core_armor:light-armorjack-body', 'equipado'), linha('ac', 'core_armor:light-armorjack-head', 'equipado'), linha('am', 'core_armor:medium-armorjack-body', 'guardado'),
    linha('b', 'core_gear:binoculars', 'carregando'), linha('cw', 'cyberware-2077:neuroport')
  ]
});
const docDe = (extra = {}) => ({ id: 'jax', nome: 'Jax', resultado: resultado(), ...extra });
// Grava como a mesa grava: comJogo por cima do que vale agora.
const gravar = (doc, feito, quando) => { assert.ok(!feito.erro, feito.erro); doc.jogo = G.comJogo(doc, feito.mudancas, quando); return doc; };

test('ficha da criação: o inventário com o uso, a munição que sobrou na caixa, a armadura vestida e o EMP pela Humanidade', () => {
  const ficha = G.ficha(docDe(), catalogo);
  assert.deepEqual(ficha.itens.map(item => [item.id, item.tipo, item.uso, item.qtd]), [
    ['p', 'arma', 'equipado', 1], ['mp', 'municao', '', 22], ['e', 'arma', 'carregando', 1], ['mc', 'municao', '', 8], ['mb', 'municao', '', 8],
    ['s', 'arma', 'guardado', 1], ['ms', 'municao', '', 10], ['al', 'armadura', 'equipado', 1], ['ac', 'armadura', 'equipado', 1], ['am', 'armadura', 'guardado', 1], ['b', 'item', 'carregando', 1]
  ], 'o cyberware fica na ficha da wiki; o pente montado saiu da caixa (30 − 8, 12 − 4, 40 − 30)');
  assert.deepEqual(ficha.armas.map(arma => arma.id), ['p', 'e'], 'a SMG guardada não vai para a mesa');
  const pistola = ficha.armas[0];
  assert.deepEqual(pistola.pente, { atual: 8, max: 8 });
  assert.equal(pistola.municaoId, 'mp');
  assert.deepEqual(pistola.municoes, [{ id: 'mp', nome: 'Munição de pistola pesada · básica', qtd: 22 }].map(item => ({ ...item, nome: catalogo.item('core_ammo:heavy-pistol-basic').nome })));
  assert.deepEqual(ficha.armas[1].municoes.map(item => item.id), ['mc', 'mb'], 'a espingarda aceita cartucho e balote');
  assert.deepEqual(ficha.sp, { cabeca: { atual: 11, max: 11 }, corpo: { atual: 11, max: 11 } });
  assert.equal(ficha.penalidade, 0);
  assert.equal(ficha.stats.EMP, 3, 'Humanidade 36: EMP 3');
  assert.deepEqual([ficha.dinheiro, ficha.ip, ficha.reputacao], [1250, 0, null]);
  // Munição não tem uso, nem que a ficha grave um.
  const doc = docDe();
  doc.jogo = G.comJogo(doc, { itens: { mp: { uso: 'equipado' }, b: { uso: 'guardado' } } }, '2026-10-21T10:00:00.000Z');
  assert.deepEqual(G.ficha(doc, catalogo).itens.filter(item => ['mp', 'b'].includes(item.id)).map(item => item.uso), ['', 'guardado']);
});

test('vestir a armadura média: tira a leve do corpo, dá a penalidade e guarda a ablação de cada uma', () => {
  const doc = docDe();
  // A leve do corpo levou 3 de ablação na mesa (SP 8), e a da cabeça, 2 (SP 9).
  doc.jogo = G.comJogo(doc, { sp: { corpo: 8, cabeca: 9 } }, '2026-10-21T10:00:00.000Z');
  gravar(doc, G.comUso(doc, catalogo, 'am', 'equipado'), '2026-10-21T10:01:00.000Z');
  let ficha = G.ficha(doc, catalogo);
  assert.equal(ficha.itens.find(item => item.id === 'al').uso, 'carregando', 'só uma armadura por local');
  assert.equal(ficha.itens.find(item => item.id === 'ac').uso, 'equipado', 'a da cabeça fica');
  assert.deepEqual(ficha.sp.corpo, { atual: 12, max: 12 }, 'a média entra inteira');
  assert.deepEqual(ficha.sp.cabeca, { atual: 9, max: 11 }, 'a cabeça, que não mudou, guarda a ablação');
  assert.equal(ficha.penalidade, 2);
  assert.deepEqual([ficha.stats.REF, ficha.stats.DEX, ficha.stats.MOVE, ficha.stats.BODY], [6, 5, 4, 7], 'a penalidade sai de REF, DEX e MOVE');
  // A média leva 2; trocar de volta: a leve volta com os 8 de antes, e a média guarda os 10.
  doc.jogo = G.comJogo(doc, { sp: { ...doc.jogo.sp, corpo: 10 } }, '2026-10-21T10:02:00.000Z');
  gravar(doc, G.comUso(doc, catalogo, 'al', 'equipado'), '2026-10-21T10:03:00.000Z');
  ficha = G.ficha(doc, catalogo);
  assert.equal(ficha.itens.find(item => item.id === 'am').uso, 'carregando');
  assert.deepEqual(ficha.sp.corpo, { atual: 8, max: 11 }, 'trocar de armadura não conserta a ablação');
  assert.equal(ficha.penalidade, 0);
  gravar(doc, G.comUso(doc, catalogo, 'am', 'equipado'), '2026-10-21T10:04:00.000Z');
  assert.deepEqual(G.ficha(doc, catalogo).sp.corpo, { atual: 10, max: 12 });
  // Tirar tudo do corpo: SP 0.
  gravar(doc, G.comUso(doc, catalogo, 'am', 'guardado'), '2026-10-21T10:05:00.000Z');
  assert.deepEqual(G.ficha(doc, catalogo).sp.corpo, { atual: 0, max: 0 });
  // Guardar a pistola tira a arma da mesa; cyberware e munição não têm uso.
  gravar(doc, G.comUso(doc, catalogo, 'p', 'guardado'), '2026-10-21T10:06:00.000Z');
  assert.deepEqual(G.ficha(doc, catalogo).armas.map(arma => arma.id), ['e']);
  assert.ok(G.comUso(doc, catalogo, 'mp', 'equipado').erro);
  assert.ok(G.comUso(doc, catalogo, 'cw', 'equipado').erro);
  assert.ok(G.comUso(doc, catalogo, 'b', 'vestido').erro);
});

test('recarregar: a munição sai da caixa, e trocar de tipo devolve o que estava no pente', () => {
  const doc = docDe();
  assert.match(G.recarga(doc, catalogo, 'p').erro, /pente cheio/);
  doc.jogo = G.comJogo(doc, { armas: { p: { pente: 3 } } }, '2026-10-21T10:00:00.000Z');
  const feito = G.recarga(doc, catalogo, 'p');
  assert.deepEqual([feito.entrou, feito.sobra], [5, 17]);
  gravar(doc, feito, '2026-10-21T10:01:00.000Z');
  let ficha = G.ficha(doc, catalogo);
  assert.equal(ficha.armas[0].pente.atual, 8);
  assert.equal(ficha.itens.find(item => item.id === 'mp').qtd, 17);
  // Balote na espingarda: os 4 cartuchos voltam para a caixa (8 + 4), e entram 4 balotes (sobram 4).
  const troca = G.recarga(doc, catalogo, 'e', 'mb');
  assert.deepEqual([troca.entrou, troca.sobra, troca.municao], [4, 4, catalogo.item('core_ammo:shotgun-slug-basic').nome]);
  gravar(doc, troca, '2026-10-21T10:02:00.000Z');
  ficha = G.ficha(doc, catalogo);
  const espingarda = ficha.armas.find(arma => arma.id === 'e');
  assert.deepEqual([espingarda.municaoId, espingarda.municao, espingarda.pente.atual], ['mb', catalogo.item('core_ammo:shotgun-slug-basic').nome, 4]);
  assert.equal(ficha.itens.find(item => item.id === 'mc').qtd, 12);
  assert.equal(ficha.itens.find(item => item.id === 'mb').qtd, 4);
  // Sem escolher, recarrega com a que já está na arma (o balote), mesmo com o cartucho antes na lista.
  doc.jogo = G.comJogo(doc, { armas: { e: { pente: 2 } } }, '2026-10-21T10:02:30.000Z');
  const mesma = G.recarga(doc, catalogo, 'e');
  assert.deepEqual([mesma.municao, mesma.entrou, mesma.mudancas.itens.mc], [catalogo.item('core_ammo:shotgun-slug-basic').nome, 2, undefined]);
  // Pouca bala: entra o que tem. Sem bala: recusa. Munição que não serve: recusa.
  doc.jogo = G.comJogo(doc, { armas: { e: { pente: 0 } }, itens: { mb: { qtd: 1 } } }, '2026-10-21T10:03:00.000Z');
  assert.deepEqual(G.recarga(doc, catalogo, 'e', 'mb').entrou, 1);
  doc.jogo = G.comJogo(doc, { itens: { mb: { qtd: 0 } } }, '2026-10-21T10:04:00.000Z');
  assert.match(G.recarga(doc, catalogo, 'e', 'mb').erro, /Sem munição/);
  assert.match(G.recarga(doc, catalogo, 'p', 'mb').erro, /não serve/);
  assert.match(G.recarga(doc, catalogo, 'b').erro, /não tem pente/);
});

test('o mestre muda o dinheiro, o IP, a reputação e a Humanidade, com o extrato', () => {
  const doc = docDe({ ip: { ganhos: [{ qtd: 10 }] }, avanco: [{ custo: 4 }] });
  assert.equal(G.valores(doc).ip, 6, 'sem a mesa: o que o mestre deu menos o avanço');
  const pago = G.ajuste(doc, 'dinheiro', { delta: 500, motivo: 'pagamento do fixer', quando: '2026-10-21T10:00:00.000Z' });
  assert.deepEqual([pago.antes, pago.depois], [1250, 1750]);
  gravar(doc, pago, '2026-10-21T10:00:00.000Z');
  assert.match(G.ajuste(doc, 'dinheiro', { delta: -2000 }).erro, /Só tem 1750eb/);
  gravar(doc, G.ajuste(doc, 'ip', { delta: 3 }), '2026-10-21T10:01:00.000Z');
  gravar(doc, G.ajuste(doc, 'reputacao', { delta: 15 }), '2026-10-21T10:02:00.000Z');
  assert.equal(G.valores(doc).reputacao, 10, 'a reputação vai até 10');
  assert.match(G.ajuste(doc, 'reputacao', { valor: 10 }).erro, /Nada mudou/);
  gravar(doc, G.ajuste(doc, 'humanidade', { delta: 20 }), '2026-10-21T10:03:00.000Z');
  assert.equal(G.ficha(doc, catalogo).humanidade.atual, 40, 'a Humanidade não passa da máxima');
  gravar(doc, G.ajuste(doc, 'humanidade', { delta: -12 }), '2026-10-21T10:04:00.000Z');
  const ficha = G.ficha(doc, catalogo);
  assert.deepEqual([ficha.dinheiro, ficha.ip, ficha.reputacao, ficha.humanidade.atual, ficha.stats.EMP], [1750, 9, 10, 28, 2]);
  assert.deepEqual(ficha.extrato.map(item => [item.campo, item.antes, item.depois]), [['dinheiro', 1250, 1750], ['ip', 6, 9], ['reputacao', 0, 10], ['humanidade', 36, 40], ['humanidade', 40, 28]]);
  assert.equal(ficha.extrato[0].motivo, 'pagamento do fixer');
  assert.ok(G.ajuste(doc, 'hp', { delta: 1 }).erro);
  // O extrato guarda as últimas 30.
  for (let i = 0; i < 35; i += 1) gravar(doc, G.ajuste(doc, 'dinheiro', { delta: 1 }), `2026-10-21T11:${String(i).padStart(2, '0')}:00.000Z`);
  assert.equal(doc.jogo.extrato.length, 30, 'a ficha não cresce sem fim');
  assert.equal(G.ficha(doc, catalogo).extrato[29].depois, 1785);
});

test('ficha do Foundry: a armadura e a munição pelos itens, e o Foundry mais recente apaga a mesa', () => {
  const mesa = {
    recebido: '2026-10-21T09:00:00.000Z', hp: { atual: 40, max: 45 }, stats: { REF: 8, EMP: 4 }, humanidade: { atual: 33, max: 40 }, sp: { cabeca: 11, corpo: 9 },
    dinheiro: 900, ip: 12, reputacao: 3,
    itens: [
      { id: 'w1', nome: 'Heavy Pistol', tipo: 'weapon', uso: 'equipped', dano: '3d6', cdt: 2, pericia: 'Handgun', distancia: true, pente: { atual: 5, max: 8 }, municao: 'Heavy Pistol (Basic)', dentroIds: ['a1'] },
      { id: 'a1', nome: 'Heavy Pistol (Basic)', tipo: 'ammo', qtd: 14, uso: '' },
      { id: 'r1', nome: 'Light Armorjack (Body)', tipo: 'armor', uso: 'equipped', cabeca: 0, corpo: 9 },
      { id: 'r2', nome: 'Light Armorjack (Head)', tipo: 'armor', uso: 'equipped', cabeca: 11, corpo: 0 },
      { id: 'w2', nome: 'SMG', tipo: 'weapon', uso: 'owned', dano: '2d6', pericia: 'Handgun', distancia: true, pente: { atual: 30, max: 30 } }
    ]
  };
  const doc = { id: 'jax', resultado: resultado(), mesa, foundry: { ator: 'x' } };
  let ficha = G.ficha(doc, catalogo);
  assert.deepEqual(ficha.armas.map(arma => [arma.id, arma.municaoId, arma.pente.atual]), [['foundry:w1', 'foundry:a1', 5]]);
  assert.deepEqual(ficha.armas[0].municoes, [{ id: 'foundry:a1', nome: 'Heavy Pistol (Basic)', qtd: 14 }], 'a munição do Foundry já é a que sobrou');
  assert.deepEqual(ficha.sp, { cabeca: { atual: 11, max: 11 }, corpo: { atual: 9, max: 9 } });
  assert.deepEqual([ficha.dinheiro, ficha.ip, ficha.reputacao, ficha.stats.EMP, ficha.penalidade], [900, 12, 3, 4, 0], 'o EMP e os STATs são os do Foundry');
  // A mesa da wiki recarrega e paga: vale por cima do Foundry.
  gravar(doc, G.recarga(doc, catalogo, 'foundry:w1'), '2026-10-21T10:00:00.000Z');
  gravar(doc, G.ajuste(doc, 'humanidade', { delta: -5 }), '2026-10-21T10:01:00.000Z');
  ficha = G.ficha(doc, catalogo);
  assert.deepEqual([ficha.armas[0].pente.atual, ficha.itens.find(item => item.id === 'foundry:a1').qtd, ficha.humanidade.atual, ficha.stats.EMP], [8, 11, 28, 2]);
  // O Foundry manda de novo depois: vale o dele inteiro.
  doc.mesa = { ...mesa, recebido: '2026-10-21T11:00:00.000Z' };
  ficha = G.ficha(doc, catalogo);
  assert.deepEqual([ficha.armas[0].pente.atual, ficha.itens.find(item => item.id === 'foundry:a1').qtd, ficha.humanidade.atual, ficha.stats.EMP], [5, 14, 33, 4]);
  // A munição renomeada no Foundry (o catálogo não conhece) serve na arma em que está; a de outra arma, não.
  const renomeada = { ...mesa, itens: [...mesa.itens.map(item => (item.id === 'a1' ? { ...item, nome: 'Balas do Ripperdoc' } : item.id === 'w1' ? { ...item, municao: 'Balas do Ripperdoc' } : item)), { id: 'a2', nome: 'Outra caixa estranha', tipo: 'ammo', qtd: 5 }] };
  assert.deepEqual(G.ficha({ id: 'jax', mesa: renomeada }, catalogo).armas[0].municoes.map(item => item.id), ['foundry:a1']);
  // A penalidade da armadura pesada não sai de novo dos STATs do Foundry (ele já aplicou).
  const pesada = { ...mesa, itens: [...mesa.itens.filter(item => item.id !== 'r1'), { id: 'r3', nome: 'Flak (Body)', tipo: 'armor', uso: 'equipped', cabeca: 0, corpo: 15 }] };
  const comFlak = G.ficha({ id: 'jax', mesa: pesada }, catalogo);
  assert.equal(catalogo.porNome('Flak (Body)').armadura.penalidade, 4);
  assert.deepEqual([comFlak.sp.corpo.max, comFlak.penalidade, comFlak.stats.REF], [15, 0, 8]);
  // O Foundry antigo, sem o SP de cada armadura: vale o SP que ele mandou.
  const antigo = { ...mesa, itens: mesa.itens.map(({ cabeca, corpo, ...item }) => item) };
  assert.deepEqual(G.ficha({ id: 'jax', mesa: antigo }, catalogo).sp, { cabeca: { atual: 11, max: 11 }, corpo: { atual: 9, max: 9 } });
});

// ---------------- Pela API da mesa ----------------
const fichaJax = {
  nome: 'Jax "Ferrugem" Moreno', apelido: 'Ferrugem', role: 'solo', stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5, EMP: 4 }, resultado: resultado()
};
const fichaNyx = { nome: 'Iris "Nyx" Tanaka', apelido: 'Nyx', role: 'netrunner', stats: { REF: 6, INT: 8 }, resultado: { stats: { REF: 6, INT: 8 }, derivados: { hp: 40 }, pericias: [] } };

async function mesaComDois(t) {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const cena = (await m.op('cena.criar', { nome: 'Beco', largura: 2000, altura: 1500, grade: { tamanho: 100 } })).json.resultado.cena;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const capanga = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 650, y: 150 })).json.resultado.token;
  const token = async (id, cookie) => (await m.pedir('/api/mesa/estado', { cookie })).json.cena.tokens.find(item => item.id === id);
  const minha = async cookie => (await m.pedir('/api/mesa/estado', { cookie })).json.meus[0];
  return { m, ana, bruno, cena, jax, capanga, token, minha };
}

test('mesa: o mestre muda o dinheiro e a Humanidade; o dono vê no registro, o outro jogador não', async t => {
  const a = await mesaComDois(t);
  const ouvidoAna = await a.m.ouvir(a.ana.cookie);
  const ouvidoBruno = await a.m.ouvir(a.bruno.cookie);
  await sleep(20);
  const pago = await a.m.op('personagem.ajustar', { personagem: a.ana.personagem.id, campo: 'dinheiro', delta: 500, motivo: 'pagamento do fixer' });
  assert.equal(pago.status, 200, pago.text);
  assert.deepEqual(pago.json.resultado, { antes: 1250, depois: 1750 });
  const registro = await ouvidoAna.esperar(item => item.evento === 'registro' && /Dinheiro/.test(item.data.texto));
  assert.equal(registro.data.texto, 'Ferrugem: Dinheiro +500eb (pagamento do fixer). Agora: 1.750eb.');
  const fichas = await ouvidoAna.esperar(item => item.evento === 'fichas');
  assert.equal(fichas.data.meus[0].jogo.dinheiro, 1750, 'a ficha chega ao vivo para o dono');
  await sleep(100);
  assert.ok(!ouvidoBruno.eventos.some(item => item.evento === 'registro' && /Dinheiro/.test(item.data.texto)), 'o outro jogador nem recebe');
  assert.ok(!ouvidoBruno.eventos.some(item => item.evento === 'fichas'), 'a ficha do outro não vai para ele');
  // A Humanidade baixa o EMP, e o teste de EMP cai junto.
  assert.equal((await a.m.op('personagem.ajustar', { personagem: a.ana.personagem.id, campo: 'humanidade', delta: -8 })).status, 200);
  const ficha = await a.minha(a.ana.cookie);
  assert.deepEqual([ficha.jogo.humanidade.atual, ficha.stats.EMP, ficha.pericias.find(item => item.nome === 'Human Perception').base], [28, 2, 4]);
  // O jogador não muda o próprio dinheiro; o número volta para a wiki (a ficha e a lista).
  assert.equal((await a.m.op('personagem.ajustar', { personagem: a.ana.personagem.id, campo: 'dinheiro', delta: 9999 }, a.ana.cookie)).status, 403);
  assert.equal((await a.m.op('personagem.ajustar', { personagem: a.ana.personagem.id, campo: 'dinheiro', delta: -5000 })).status, 400);
  const lista = (await a.m.pedir('/api/personagens', { cookie: a.ana.cookie })).json.personagens;
  assert.equal(lista.find(item => item.id === a.ana.personagem.id).numeros.eb, 1750);
  const naWiki = (await a.m.pedir(`/api/personagens/${a.ana.personagem.id}`, { cookie: a.ana.cookie })).json.personagem;
  assert.deepEqual([naWiki.jogo.dinheiro, naWiki.jogo.humanidade, naWiki.jogo.extrato.length], [1750, 28, 2]);
  // O IP que o mestre dá pela wiki soma no da mesa, que já conta.
  assert.equal((await a.m.op('personagem.ajustar', { personagem: a.ana.personagem.id, campo: 'ip', delta: 5 })).status, 200);
  assert.equal((await a.m.pedir(`/api/personagens/${a.ana.personagem.id}/ip`, { method: 'POST', body: { qtd: 3, motivo: 'sessão 2' } })).status, 200);
  assert.equal((await a.minha(a.ana.cookie)).jogo.ip, 8);
});

test('mesa: o dono veste a armadura e guarda a arma; o token muda o SP, a penalidade e as armas', async t => {
  const a = await mesaComDois(t);
  const pessoaErrada = await a.m.op('item.uso', { personagem: a.ana.personagem.id, item: 'am', uso: 'equipado' }, a.bruno.cookie);
  assert.equal(pessoaErrada.status, 403, 'só o dono ou o mestre');
  const vestiu = await a.m.op('item.uso', { personagem: a.ana.personagem.id, item: 'am', uso: 'equipado' }, a.ana.cookie);
  assert.equal(vestiu.status, 200, vestiu.text);
  const token = await a.token(a.jax, a.ana.cookie);
  assert.deepEqual(token.sp.corpo, { atual: 12, max: 12 });
  const ficha = await a.minha(a.ana.cookie);
  assert.deepEqual([ficha.stats.REF, ficha.pericias.find(item => item.nome === 'Handgun').base, ficha.jogo.penalidade], [6, 12, 2], 'a penalidade da armadura média');
  assert.equal(ficha.jogo.itens.find(item => item.id === 'al').uso, 'carregando');
  assert.equal((await a.m.op('item.uso', { personagem: a.ana.personagem.id, item: 'p', uso: 'guardado' }, a.ana.cookie)).status, 200);
  assert.deepEqual((await a.token(a.jax, a.ana.cookie)).armas.map(arma => arma.id), ['e'], 'a pistola guardada sai da mesa');
  const ataque = await a.m.op('ataque', { atacante: a.jax, arma: 'p', modo: 'tiro', alvo: a.capanga }, a.ana.cookie);
  assert.equal(ataque.status, 400, 'não ataca com arma guardada');
  // O mestre acerta a quantidade (os binóculos que quebraram).
  assert.equal((await a.m.op('item.qtd', { personagem: a.ana.personagem.id, item: 'b', qtd: 0 }, a.ana.cookie)).status, 403);
  assert.equal((await a.m.op('item.qtd', { personagem: a.ana.personagem.id, item: 'b', qtd: 0 })).status, 200);
  assert.equal((await a.minha(a.ana.cookie)).jogo.itens.find(item => item.id === 'b').qtd, 0);
  assert.equal((await a.m.op('item.qtd', { personagem: a.ana.personagem.id, item: 'zz', qtd: 1 })).status, 400);
});

test('mesa: recarregar com o balote tira o cartucho da espingarda', async t => {
  const a = await mesaComDois(t);
  let espingarda = (await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'e');
  assert.deepEqual([espingarda.cartucho, espingarda.modos.includes('cartucho')], [true, true]);
  assert.deepEqual(espingarda.municoes.map(item => [item.id, item.qtd]), [['mc', 8], ['mb', 8]]);
  const troca = await a.m.op('arma.recarregar', { token: a.jax, arma: 'e', municao: 'mb' }, a.ana.cookie);
  assert.equal(troca.status, 200, troca.text);
  assert.deepEqual([troca.json.resultado.entrou, troca.json.resultado.sobra], [4, 4]);
  espingarda = (await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'e');
  assert.deepEqual([espingarda.cartucho, espingarda.modos.includes('cartucho'), espingarda.municaoId], [false, false, 'mb'], 'com balote, só tiro');
  assert.deepEqual(espingarda.municoes.map(item => [item.id, item.qtd]), [['mc', 12], ['mb', 4]], 'os cartuchos voltaram para a caixa');
  // O NPC recarrega de graça (não conta bala).
  assert.equal((await a.m.op('arma.recarregar', { token: a.capanga, arma: 'npc:0' })).status, 400, 'a arma do NPC do livro não tem pente');
});
