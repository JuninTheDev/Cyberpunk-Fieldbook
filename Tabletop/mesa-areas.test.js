// Testes das áreas e dos desenhos no mapa (M19): a conta de quem está dentro de cada forma (mesa-areas.js) e o caminho
// pela API da mesa (quem põe, quem muda, quem apaga, o escondido do mestre, a cena aberta).
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const A = require('./mesa-areas');
const { sleep, montar, fichaJax, fichaNyx } = require('./teste-ajuda');

const grade = { tamanho: 100, metros: 2, unidade: 'm' };

test('áreas: quem está dentro do círculo, do cone, da linha e do retângulo; o traço livre pega o clique perto', () => {
  const circulo = { tipo: 'circulo', x: 500, y: 500, dist: 250 };
  assert.ok(A.contem(circulo, { x: 700, y: 600 }));
  assert.ok(!A.contem(circulo, { x: 700, y: 700 }));
  // Cone de 90° para a direita: 45° para cada lado.
  const cone = { tipo: 'cone', x: 0, y: 0, dist: 300, angulo: 0, abertura: 90 };
  assert.ok(A.contem(cone, { x: 200, y: 190 }), 'dentro dos 45°');
  assert.ok(!A.contem(cone, { x: 150, y: 200 }), 'fora dos 45°');
  assert.ok(!A.contem(cone, { x: -100, y: 0 }), 'atrás');
  assert.ok(!A.contem(cone, { x: 290, y: 100 }), 'longe demais');
  assert.ok(A.contem({ ...cone, angulo: 350 }, { x: 200, y: 30 }), 'o ângulo dá a volta');
  // Linha de 400 de comprimento e 100 de largura, para baixo.
  const linha = { tipo: 'linha', x: 0, y: 0, dist: 400, angulo: 90, largura: 100 };
  assert.ok(A.contem(linha, { x: 40, y: 380 }));
  assert.ok(!A.contem(linha, { x: 60, y: 200 }), 'fora da largura');
  assert.ok(!A.contem(linha, { x: 0, y: 420 }), 'depois do fim');
  assert.ok(!A.contem(linha, { x: 0, y: -10 }), 'antes do começo');
  assert.ok(A.contem({ tipo: 'retangulo', x: 100, y: 100, w: 200, h: 50 }, { x: 300, y: 150 }));
  assert.ok(!A.contem({ tipo: 'retangulo', x: 100, y: 100, w: 200, h: 50 }, { x: 300, y: 151 }));
  const livre = { tipo: 'livre', x: 0, y: 0, pontos: [[0, 0], [100, 0], [100, 100]], espessura: 4 };
  assert.ok(!A.contem(livre, { x: 50, y: 0 }), 'o traço não é área');
  assert.ok(A.acerta(livre, { x: 50, y: 6 }, 6), 'o clique perto da linha pega');
  assert.ok(!A.acerta(livre, { x: 50, y: 30 }, 6));
  assert.equal(A.contorno(cone, 4).length, 6, 'a ponta e o arco');
  assert.equal(A.descrever({ tipo: 'circulo', dist: 500 }, grade), 'Círculo de 10 m de raio');
  assert.equal(A.descrever({ tipo: 'cone', dist: 300, abertura: 90 }, grade), 'Cone de 6 m (90°)');
  assert.equal(A.descrever({ tipo: 'linha', dist: 1000, largura: 50 }, grade), 'Linha de 20 m × 1 m');
});

test('áreas pela mesa: todos na cena põem e veem; o autor muda e apaga as dele; o escondido é só do mestre', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const cena = (await m.op('cena.criar', { nome: 'Beco', largura: 2000, altura: 1500, grade: { tamanho: 100 } })).json.resultado.cena;
  await m.op('cena.ativar', { cena });
  const ouvidoBruno = await m.ouvir(bruno.cookie);
  await sleep(20);
  // A Ana põe a explosão da granada (10 m: 500 px na grade de 2 m).
  const granada = await m.op('desenho.criar', { cena, desenho: { tipo: 'circulo', x: 800, y: 600, dist: 500, cor: '#ff8a3d', escondido: true } }, ana.cookie);
  assert.equal(granada.status, 200, granada.text);
  const id = granada.json.resultado.desenho;
  const chegou = await ouvidoBruno.esperar(item => item.evento === 'desenhos');
  assert.deepEqual(chegou.data.desenhos.map(({ id: _, ...d }) => d), [{ tipo: 'circulo', x: 800, y: 600, cor: '#ff8a3d', escondido: false, dist: 500, angulo: 0, meu: false }], 'o jogador não esconde; o outro vê e não mexe');
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.desenhos[0].meu, true);
  assert.equal((await m.op('desenho.editar', { desenho: id, mudancas: { x: 100 } }, bruno.cookie)).status, 403, 'o do outro, não');
  assert.equal((await m.op('desenho.apagar', { desenho: id }, bruno.cookie)).status, 403);
  assert.equal((await m.op('desenho.editar', { desenho: id, mudancas: { x: 900, dist: 99999, tipo: 'cone' } }, ana.cookie)).status, 200);
  let desenhos = (await m.pedir('/api/mesa/estado')).json.cena.desenhos;
  assert.deepEqual([desenhos[0].tipo, desenhos[0].x, desenhos[0].dist], ['circulo', 900, 20000], 'a forma não muda; a medida tem limite');

  // O mestre: o cone escondido (só ele vê), o traço livre que anda inteiro, e o retângulo.
  const cone = (await m.op('desenho.criar', { cena, desenho: { tipo: 'cone', x: 200, y: 200, dist: 300, angulo: 45, abertura: 400, escondido: true } })).json.resultado.desenho;
  const traco = (await m.op('desenho.criar', { cena, desenho: { tipo: 'livre', pontos: [[10, 10], [50, 60], [90, 20]], espessura: 99 } })).json.resultado.desenho;
  assert.match((await m.op('desenho.criar', { cena, desenho: { tipo: 'livre', pontos: [[10, 10]] } })).json.erro, /dois pontos/);
  assert.match((await m.op('desenho.criar', { cena, desenho: { tipo: 'estrela' } })).json.erro, /Escolha a forma/);
  desenhos = (await m.pedir('/api/mesa/estado')).json.cena.desenhos;
  assert.deepEqual(desenhos.find(d => d.id === cone).abertura, 180, 'a abertura vai até 180°');
  assert.equal(desenhos.find(d => d.id === traco).espessura, 40);
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.desenhos.some(d => d.id === cone), false, 'o escondido não vai para o jogador');
  assert.equal((await m.op('desenho.editar', { desenho: cone, mudancas: { x: 1 } }, ana.cookie)).status, 403, 'nem o jogador mexe no escondido');
  assert.equal((await m.op('desenho.editar', { desenho: traco, mudancas: { dx: 100, dy: -5 } })).status, 200);
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.cena.desenhos.find(d => d.id === traco).pontos, [[110, 5], [150, 55], [190, 15]]);
  assert.equal((await m.op('desenho.editar', { desenho: id, mudancas: { cor: '#00ffd2' } })).status, 200, 'o mestre muda o de qualquer um');

  // O jogador só desenha na cena aberta.
  const outra = (await m.op('cena.criar', { nome: 'Outra', largura: 1000, altura: 1000 })).json.resultado.cena;
  assert.equal((await m.op('desenho.criar', { cena: outra, desenho: { tipo: 'circulo', dist: 100 } }, ana.cookie)).status, 403);
  // Apagar de uma vez: o jogador, os dele; o mestre, todos.
  await m.op('desenho.criar', { cena, desenho: { tipo: 'linha', x: 0, y: 0, dist: 300, angulo: 0 } }, bruno.cookie);
  assert.equal((await m.op('desenho.limpar', { cena, todos: true }, ana.cookie)).status, 200, 'o jogador pedindo todos apaga só os dele');
  desenhos = (await m.pedir('/api/mesa/estado')).json.cena.desenhos;
  assert.deepEqual(desenhos.map(d => d.tipo).sort(), ['cone', 'linha', 'livre'], 'só os da Ana saíram');
  assert.equal((await m.op('desenho.limpar', { cena }, bruno.cookie)).status, 200);
  assert.equal((await m.pedir('/api/mesa/estado')).json.cena.desenhos.length, 2, 'os do mestre ficam');
  assert.equal((await m.op('desenho.limpar', { cena, todos: true })).status, 200);
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.cena.desenhos, []);
});
