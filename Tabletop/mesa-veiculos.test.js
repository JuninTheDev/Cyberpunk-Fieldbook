// Testes dos veículos (M17): o token do veículo (SDP e assentos), embarcar e descer (quem pode, a distância, o lugar
// cheio, a parede), o motorista que move todos, tirar o veículo da cena e o combate sem ele.
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const { montar, fichaJax, fichaNyx } = require('./teste-ajuda');

test('veículos: embarcar perto, o motorista move todos, descer perto, o cheio, a direção, o combate e tirar da cena', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const cena = (await m.op('cena.criar', { nome: 'Rua', largura: 3000, altura: 2000, grade: { tamanho: 100 } })).json.resultado.cena;
  await m.op('cena.ativar', { cena });
  const moto = (await m.op('npc.salvar', { npc: { nome: 'Yaiba', tipo: 'veiculo', hp: 35, assentos: 3, stats: { MOVE: 60 }, sp: { cabeca: 0, corpo: 0 } } })).json.resultado.id;
  const veiculo = (await m.op('token.criar', { cena, npc: moto, x: 1000, y: 1000 })).json.resultado.token;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 1250, y: 1000 })).json.resultado.token;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 2500, y: 1000 })).json.resultado.token;
  const capanga = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 900, y: 900 })).json.resultado.token;
  const tokens = async (cookie) => Object.fromEntries((await m.pedir('/api/mesa/estado', { cookie })).json.cena.tokens.map(token => [token.id, token]));
  let visto = await tokens(ana.cookie);
  assert.deepEqual([visto[veiculo].veiculo, visto[veiculo].tamanho, visto[veiculo].hp], [{ assentos: 3, ocupantes: [], dirijo: false }, 2, undefined], 'o jogador vê os assentos (o SDP de NPC, não)');
  assert.deepEqual((await tokens())[veiculo].hp, { atual: 35, max: 35 }, 'o mestre vê o SDP');

  // Embarcar: o seu token, perto (até 2 quadrados da borda); o do outro, não.
  assert.equal((await m.op('veiculo.embarcar', { token: jax, veiculo }, bruno.cookie)).status, 403);
  assert.match((await m.op('veiculo.embarcar', { token: nyx, veiculo }, bruno.cookie)).json.erro, /Chegue mais perto/);
  assert.equal((await m.op('veiculo.embarcar', { token: jax, veiculo }, ana.cookie)).status, 200);
  visto = await tokens(ana.cookie);
  assert.deepEqual([visto[jax].dentro, visto[jax].x, visto[jax].y], [veiculo, 1000, 1000], 'quem está dentro fica no lugar do veículo');
  assert.deepEqual(visto[veiculo].veiculo, { assentos: 3, ocupantes: [jax], dirijo: true }, 'o primeiro dirige');
  assert.match((await m.op('veiculo.embarcar', { token: jax, veiculo }, ana.cookie)).json.erro, /Desça do outro/);
  assert.match((await m.op('token.mover', { token: jax, x: 1500, y: 1000 }, ana.cookie)).json.erro, /Desça do veículo/);
  // O mestre embarca a Nyx de longe e o capanga; o quarto não cabe.
  assert.equal((await m.op('veiculo.embarcar', { token: nyx, veiculo })).status, 200);
  assert.equal((await m.op('veiculo.embarcar', { token: capanga, veiculo })).status, 200);
  const outro = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 950, y: 950 })).json.resultado.token;
  assert.match((await m.op('veiculo.embarcar', { token: outro, veiculo })).json.erro, /cheio \(3 assentos\)/);
  assert.match((await m.op('veiculo.embarcar', { token: veiculo, veiculo })).json.erro, /não encontrado/);

  // O motorista move o veículo e todos dentro; o passageiro, não.
  assert.equal((await m.op('token.mover', { token: veiculo, x: 1600, y: 1200 }, bruno.cookie)).status, 403);
  assert.equal((await m.op('token.mover', { token: veiculo, x: 1600, y: 1200 }, ana.cookie)).status, 200);
  visto = await tokens();
  assert.deepEqual([visto[veiculo].x, visto[jax].x, visto[nyx].x, visto[nyx].y], [1600, 1600, 1600, 1200]);
  // A Nyx assume a direção: agora o Bruno move, a Ana não.
  assert.equal((await m.op('veiculo.motorista', { token: nyx }, ana.cookie)).status, 403);
  assert.equal((await m.op('veiculo.motorista', { token: nyx }, bruno.cookie)).status, 200);
  assert.equal((await tokens(bruno.cookie))[veiculo].veiculo.dirijo, true);
  assert.equal((await m.op('token.mover', { token: veiculo, x: 1700, y: 1200 }, ana.cookie)).status, 403);
  assert.equal((await m.op('token.mover', { token: veiculo, x: 1700, y: 1200 }, bruno.cookie)).status, 200);

  // Descer: perto (o jogador); sem lugar dado, ao lado, num lugar livre.
  assert.match((await m.op('veiculo.descer', { token: jax, x: 2600, y: 1200 }, ana.cookie)).json.erro, /Desça perto/);
  assert.equal((await m.op('veiculo.descer', { token: jax, x: 1700, y: 1450 }, ana.cookie)).status, 200);
  visto = await tokens();
  assert.deepEqual([visto[jax].dentro, visto[jax].x, visto[jax].y, visto[veiculo].veiculo.ocupantes], [undefined, 1700, 1450, [nyx, capanga]]);
  assert.match((await m.op('veiculo.descer', { token: jax }, ana.cookie)).json.erro, /não está num veículo/);

  // O combate não põe o veículo (quem age é o motorista).
  await m.op('combate.iniciar', { cena });
  assert.ok(!(await m.pedir('/api/mesa/estado')).json.combate.ordem.some(item => item.token === veiculo));
  // Tirar o veículo da cena: quem estava dentro desce ao lado.
  assert.equal((await m.op('token.apagar', { token: veiculo })).status, 200);
  visto = await tokens();
  assert.deepEqual([visto[nyx].dentro, Math.hypot(visto[nyx].x - 1700, visto[nyx].y - 1200) > 50, visto[capanga].dentro], [undefined, true, undefined]);
});
