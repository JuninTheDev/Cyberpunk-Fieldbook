// Testes da mesa da wiki: o servidor de teste de verdade (testar.js), numa porta livre, com dados temporários e dados
// rolados de propósito (a fila "dados"). Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { sleep, montar, fichaJax, fichaNyx, cenaComTokens } = require('./teste-ajuda');

test('o jogador não recebe token escondido, HP de NPC nem nota do mestre', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  const mestre = (await m.pedir('/api/mesa/estado')).json;
  assert.equal(mestre.cena.tokens.length, 4);
  assert.equal(mestre.cena.tokens.find(token => token.id === ids.capanga).notas, 'Trabalha para o Sato.');
  const visao = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json;
  const porId = Object.fromEntries(visao.cena.tokens.map(token => [token.id, token]));
  assert.deepEqual(Object.keys(porId).sort(), [ids.jax, ids.nyx, ids.capanga].sort(), 'o escondido nem chega');
  assert.deepEqual(porId[ids.jax].hp, { atual: 45, max: 45 });
  assert.equal(porId[ids.jax].meu, true);
  assert.equal(porId[ids.jax].move, 6);
  assert.deepEqual(porId[ids.nyx].hp, { atual: 40, max: 40 }, 'o grupo vê o HP dos personagens');
  assert.equal(porId[ids.nyx].move, undefined);
  assert.equal(porId[ids.capanga].hp, undefined, 'HP de NPC não vai');
  assert.equal(porId[ids.capanga].estado, 'Sem ferimentos');
  assert.equal(porId[ids.capanga].notas, undefined);
  assert.equal(porId[ids.capanga].pericias, undefined);
  assert.equal(visao.cenas, undefined, 'a lista de cenas é só do mestre');
  assert.equal(visao.npcs, undefined, 'as fichas de NPC são só do mestre');
  assert.deepEqual(visao.meus.map(ficha => ficha.nome), [fichaJax.nome]);
  assert.notEqual(visao.campanha.id, 'morana', 'o jogador conhece a campanha pelo id público');
  assert.equal(visao.campanha.nome, 'Night City, 2077');
});

test('cada um mexe só no que é seu', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 350, y: 350 }, ana.cookie)).status, 200);
  assert.equal((await m.op('token.mover', { token: ids.nyx, x: 350, y: 350 }, ana.cookie)).status, 403);
  assert.equal((await m.op('token.mover', { token: ids.capanga, x: 350, y: 350 }, ana.cookie)).status, 403);
  assert.equal((await m.op('token.mover', { token: ids.emboscada, x: 350, y: 350 }, ana.cookie)).status, 403);
  assert.equal((await m.op('token.criar', { npc: 'mooks:0' }, ana.cookie)).status, 403);
  assert.equal((await m.op('cena.ativar', { cena: ids.cena }, ana.cookie)).status, 403);
  assert.equal((await m.op('token.editar', { token: ids.jax, nome: 'Outro' }, ana.cookie)).status, 403, 'no próprio token, só o HP');
  assert.equal((await m.op('token.editar', { token: ids.jax, hp: { atual: 30, max: 999 } }, ana.cookie)).status, 200);
  const jax = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.tokens.find(token => token.id === ids.jax);
  assert.deepEqual(jax.hp, { atual: 30, max: 45 }, 'o jogador não muda o máximo');
  assert.deepEqual({ x: jax.x, y: jax.y }, { x: 350, y: 350 });
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 99999, y: -50 }, ana.cookie)).status, 200);
  const preso = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.tokens.find(token => token.id === ids.jax);
  assert.deepEqual({ x: preso.x, y: preso.y }, { x: 2000, y: 0 }, 'fica dentro da cena');
  assert.equal((await m.pedir('/api/mesa/estado', { headers: { 'X-Forwarded-For': '203.0.113.9' } })).status, 401, 'visitante não entra');
  assert.equal((await m.pedir('/api/mesa/op', { method: 'POST', body: 'tipo=token.mover', type: 'text/plain', cookie: ana.cookie })).status, 415, 'só JSON (formulário de outro site não passa)');
});

test('ao vivo: cada um recebe só o que pode ver', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  const mestre = await m.ouvir();
  const visao = await m.ouvir(ana.cookie);
  assert.equal(visao.estado.cena.tokens.length, 3);
  await m.op('token.mover', { token: ids.capanga, x: 1050, y: 750 });
  const andou = await visao.esperar(item => item.evento === 'token' && item.data.id === ids.capanga);
  assert.equal(andou.data.x, 1050);
  assert.equal(andou.data.hp, undefined);
  visao.limpar();
  mestre.limpar();
  await m.op('token.mover', { token: ids.emboscada, x: 1350, y: 350 });
  assert.ok(await mestre.esperar(item => item.evento === 'token' && item.data.id === ids.emboscada), 'o mestre vê o escondido andar');
  await sleep(150);
  assert.equal(visao.eventos.filter(item => item.data && item.data.id === ids.emboscada).length, 0, 'o jogador não fica sabendo');
  await m.op('token.editar', { token: ids.emboscada, escondido: false });
  const apareceu = await visao.esperar(item => item.evento === 'token' && item.data.id === ids.emboscada);
  assert.equal(apareceu.data.x, 1350);
  await m.op('token.editar', { token: ids.emboscada, escondido: true });
  assert.ok(await visao.esperar(item => item.evento === 'token.sumir' && item.data.id === ids.emboscada));
  // Recusada não chega a ninguém.
  visao.limpar();
  await m.op('token.mover', { token: ids.nyx, x: 500, y: 500 }, ana.cookie);
  await sleep(150);
  assert.equal(visao.eventos.filter(item => item.evento === 'token').length, 0);
});

test('névoa: token debaixo da névoa não sai do servidor', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno, { nevoa: true });
  const visao = await m.ouvir(ana.cookie);
  assert.deepEqual(visao.estado.cena.tokens.map(token => token.id), [ids.jax], 'na névoa, só o próprio token');
  await m.op('nevoa.traco', { cena: ids.cena, modo: 'revelar', r: 200, pontos: [{ x: 950, y: 750 }] });
  assert.ok(await visao.esperar(item => item.evento === 'nevoa' && item.data.tracos.length === 1));
  assert.ok(await visao.esperar(item => item.evento === 'token' && item.data.id === ids.capanga), 'revelou: o capanga chega');
  await m.op('nevoa.traco', { cena: ids.cena, modo: 'cobrir', r: 120, pontos: [{ x: 950, y: 750 }] });
  assert.ok(await visao.esperar(item => item.evento === 'token.sumir' && item.data.id === ids.capanga), 'cobriu de novo: some');
  await m.op('nevoa.tudo', { cena: ids.cena });
  const tudo = await visao.esperar(item => item.evento === 'cena' && item.data.cena.tokens.length === 3);
  assert.ok(tudo, 'revelar tudo mostra os três que não estão escondidos');
  assert.equal((await m.op('nevoa.traco', { cena: ids.cena, pontos: [{ x: 1, y: 1 }] }, ana.cookie)).status, 403);
});

test('visão pelas paredes: cada um vê o que os tokens dele veem, abre a porta que vê e não atravessa parede', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  // Uma parede de cima a baixo em x = 600, com uma porta de 700 a 800. O Jax e a Nyx de um lado, o capanga do outro.
  const criadas = await m.op('parede.criar', { cena: ids.cena, paredes: [{ c: [600, 0, 600, 700] }, { c: [600, 700, 600, 800], porta: 1 }, { c: [600, 800, 600, 1500] }, { c: [5, 5, 5, 5] }] });
  assert.equal(criadas.status, 200, criadas.text);
  assert.equal(criadas.json.resultado.paredes.length, 3, 'parede de um ponto só não entra');
  const porta = criadas.json.resultado.paredes[1];
  assert.equal((await m.op('parede.criar', { cena: ids.cena, paredes: [{ c: [0, 0, 9, 9] }] }, ana.cookie)).status, 403);
  const semVisao = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena;
  assert.equal(semVisao.tokens.length, 3, 'sem a visão ligada, as paredes não escondem');
  assert.deepEqual(semVisao.paredes.map(parede => parede.id), [porta], 'sem a visão, o jogador recebe só as portas');
  await m.op('cena.editar', { cena: ids.cena, visao: true });

  const visaoAna = await m.ouvir(ana.cookie);
  const idsDe = cena => cena.tokens.map(token => token.id).sort();
  assert.deepEqual(idsDe(visaoAna.estado.cena), [ids.jax, ids.nyx].sort(), 'o capanga atrás da parede nem chega');
  assert.equal(visaoAna.estado.cena.paredes.length, 3);
  assert.equal(visaoAna.estado.cena.visao, true);
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 950, y: 650 }, ana.cookie)).status, 409, 'atravessar a parede, não');
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 350, y: 750 }, ana.cookie)).status, 200);
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 800, y: 750 }, ana.cookie)).status, 409, 'porta fechada também bloqueia');

  // Abriu a porta: o capanga, na frente dela, aparece.
  visaoAna.limpar();
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 200);
  const abriu = await visaoAna.esperar(item => item.evento === 'paredes');
  assert.equal(abriu.data.paredes.find(parede => parede.id === porta).estado, 1);
  assert.ok(await visaoAna.esperar(item => item.evento === 'token' && item.data.id === ids.capanga), 'pela porta aberta, o capanga aparece');
  const bruno1 = (await m.pedir('/api/mesa/estado', { cookie: bruno.cookie })).json.cena;
  assert.ok(!bruno1.tokens.some(token => token.id === ids.capanga), 'a Nyx, de onde está, não vê o capanga (cada um com os próprios olhos)');

  // Trancada: fecha, o capanga some, e o jogador não abre nem passa.
  visaoAna.limpar();
  assert.equal((await m.op('porta', { parede: porta, estado: 2 })).status, 200);
  assert.ok(await visaoAna.esperar(item => item.evento === 'token.sumir' && item.data.id === ids.capanga));
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 409, 'trancada, o jogador não abre');
  assert.equal((await m.op('token.mover', { token: ids.jax, x: 800, y: 750 }, ana.cookie)).status, 409);
  assert.equal((await m.op('token.mover', { token: ids.capanga, x: 300, y: 750 })).status, 200, 'o mestre passa por tudo');
  await m.op('token.mover', { token: ids.capanga, x: 950, y: 750 });

  // Porta debaixo da névoa do mestre: não abre, nem com o token do lado.
  await m.op('porta', { parede: porta, estado: 0 });
  await m.op('token.mover', { token: ids.jax, x: 550, y: 750 });
  await m.op('nevoa.ligar', { cena: ids.cena, ativa: true });
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 403, 'debaixo da névoa, a porta não abre');
  await m.op('nevoa.ligar', { cena: ids.cena, ativa: false });
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 200, 'sem a névoa, abre');
  await m.op('porta', { parede: porta, estado: 0 });

  // Porta que nenhum token do jogador vê: a Nyx sozinha, o Jax longe da porta.
  await m.op('token.mover', { token: ids.jax, x: 150, y: 150 });
  await m.op('parede.criar', { cena: ids.cena, paredes: [{ c: [500, 0, 500, 1500] }] });
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 403, 'atrás de outra parede, a porta não abre');

  // Porta secreta: para o jogador, é parede (fechada) ou nada (aberta), e ele não abre.
  await m.op('parede.editar', { parede: porta, porta: 2 });
  const comSecreta = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.paredes;
  assert.deepEqual(comSecreta.find(parede => parede.id === porta), { id: porta, c: [600, 700, 600, 800], porta: 0, estado: 0, visao: 20, luz: 20, movimento: 20 });
  assert.equal((await m.op('porta', { parede: porta }, ana.cookie)).status, 404);
  await m.op('porta', { parede: porta, estado: 1 });
  assert.ok(!(await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.paredes.some(parede => parede.id === porta), 'a secreta aberta não chega');
  const doMestre = (await m.pedir('/api/mesa/estado')).json.cena.paredes;
  assert.equal(doMestre.length, 4);
  assert.equal(doMestre.find(parede => parede.id === porta).porta, 2);

  // Esquecer o explorado: chega a todos; só o mestre manda. Apagar parede.
  visaoAna.limpar();
  assert.equal((await m.op('visao.esquecer', { cena: ids.cena }, ana.cookie)).status, 403);
  await m.op('visao.esquecer', { cena: ids.cena });
  assert.ok(await visaoAna.esperar(item => item.evento === 'visao.esquecer' && item.data.cena === ids.cena));
  assert.equal((await m.op('parede.apagar', { cena: ids.cena, paredes: doMestre.map(parede => parede.id) })).status, 200);
  assert.deepEqual(idsDe((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena), [ids.jax, ids.nyx, ids.capanga].sort(), 'sem paredes, vê tudo (menos o escondido)');
});

test('luz e escuridão: sem a luz global, o token vê o alcance dele e o que uma luz ilumina', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  // Grade de 100 px = 2 m: 50 px por metro. O Jax em (150, 150), o capanga a 1000 px (20 m), a Nyx a 100 px.
  const ids = await cenaComTokens(m, ana, bruno);
  await m.op('cena.editar', { cena: ids.cena, visao: true, luz: { global: false, escuridao: 0.6 } });
  const idsDe = cena => cena.tokens.map(token => token.id).sort();
  const estado = cookie => m.pedir('/api/mesa/estado', { cookie }).then(r => r.json.cena);
  let cena = await estado(ana.cookie);
  assert.deepEqual(cena.luz, { global: false, escuridao: 0.6 });
  assert.deepEqual(idsDe(cena), [ids.jax, ids.nyx, ids.capanga].sort(), 'o alcance padrão (30 m) chega no capanga a 20 m');
  assert.equal(cena.tokens.find(token => token.id === ids.jax).alcance, 30);
  await m.op('token.mover', { token: ids.capanga, x: 1900, y: 1400 });
  assert.ok(!idsDe(await estado(ana.cookie)).includes(ids.capanga), 'a 43 m, no escuro, não vê');
  await m.op('token.mover', { token: ids.capanga, x: 950, y: 750 });
  assert.equal((await m.op('token.editar', { token: ids.jax, alcance: 10 }, ana.cookie)).status, 403, 'o alcance é do mestre');
  await m.op('token.editar', { token: ids.jax, alcance: 10 });
  assert.ok(!idsDe(await estado(ana.cookie)).includes(ids.capanga), 'com 10 m de alcance, o capanga a 20 m some');

  // Um poste perto do capanga: iluminado, ele aparece (de longe, como no Foundry).
  const visaoAna = await m.ouvir(ana.cookie);
  const poste = (await m.op('luz.criar', { cena: ids.cena, x: 1000, y: 800, claro: 2, penumbra: 5, cor: '#ff7300' })).json.resultado.luz;
  assert.equal((await m.op('luz.criar', { cena: ids.cena, x: 1, y: 1, claro: 2 }, ana.cookie)).status, 403);
  cena = await estado(ana.cookie);
  assert.ok(idsDe(cena).includes(ids.capanga), 'o poste ilumina o capanga');
  assert.deepEqual(cena.luzes.map(({ x, y, claro, penumbra, cor }) => ({ x, y, claro, penumbra, cor })), [{ x: 1000, y: 800, claro: 100, penumbra: 250, cor: '#ff7300' }]);
  assert.equal(cena.luzes[0].id, undefined, 'o jogador não recebe o id (não mexe na luz)');
  await m.op('luz.editar', { luz: poste, escondido: true });
  cena = await estado(ana.cookie);
  assert.deepEqual([cena.luzes.length, idsDe(cena).includes(ids.capanga)], [0, false], 'luz escondida não ilumina nem chega');
  await m.op('luz.editar', { luz: poste, escondido: false, penumbra: 0.5, claro: 0.5 });
  assert.ok(!idsDe(await estado(ana.cookie)).includes(ids.capanga), 'luz pequena não alcança o capanga');

  // A lanterna: o jogador acende a do próprio token (só a lanterna); a luz anda com o token e chega a todos.
  visaoAna.limpar();
  assert.equal((await m.op('token.editar', { token: ids.jax, luz: { claro: 50, penumbra: 60 } }, ana.cookie)).status, 403, 'só a lanterna');
  assert.equal((await m.op('token.editar', { token: ids.nyx, luz: { claro: 6, penumbra: 12 } }, ana.cookie)).status, 403, 'a do outro, não');
  assert.equal((await m.op('token.editar', { token: ids.jax, luz: { claro: 6, penumbra: 12 } }, ana.cookie)).status, 200);
  const comLanterna = await visaoAna.esperar(item => item.evento === 'luzes' && item.data.luzes.some(luz => luz.token));
  assert.ok(comLanterna, 'a luz da lanterna chega');
  const visaoBruno = await m.ouvir(bruno.cookie);
  assert.ok(visaoBruno.estado.cena.luzes.some(luz => luz.token && luz.x === 150), 'o Bruno vê a lanterna do Jax');
  visaoBruno.limpar();
  await m.op('token.mover', { token: ids.jax, x: 350, y: 150 }, ana.cookie);
  assert.ok(await visaoBruno.esperar(item => item.evento === 'luzes' && item.data.luzes.some(luz => luz.token && luz.x === 350)), 'a luz anda com o token');
  // A Nyx, com 0 m de alcance, vê o capanga quando a lanterna do Jax o ilumina (e não vê quando apaga).
  await m.op('token.editar', { token: ids.nyx, alcance: 0 });
  await m.op('token.mover', { token: ids.capanga, x: 650, y: 150 });
  assert.ok(idsDe(await estado(bruno.cookie)).includes(ids.capanga), 'na luz da lanterna do outro, aparece');
  await m.op('token.editar', { token: ids.jax, luz: { claro: 0, penumbra: 0 } }, ana.cookie);
  assert.ok(!idsDe(await estado(bruno.cookie)).includes(ids.capanga), 'apagou: some');

  // A luz do token escondido não chega ao jogador; a parede que só segura a luz chega (ele desenha a luz com ela).
  await m.op('token.editar', { token: ids.emboscada, luz: { claro: 4, penumbra: 8 } });
  assert.ok(!(await estado(ana.cookie)).luzes.some(luz => luz.x === 1450), 'a luz do escondido não chega');
  assert.ok((await m.pedir('/api/mesa/estado')).json.cena.luzes.some(luz => luz.x === 1450), 'o mestre vê');
  await m.op('parede.criar', { cena: ids.cena, paredes: [{ c: [1700, 0, 1700, 300], visao: 0, luz: 20 }] });
  assert.ok((await estado(ana.cookie)).paredes.some(parede => parede.visao === 0 && parede.luz === 20), 'a parede só de luz chega ao jogador');

  // A luz global de volta: vê até onde a parede deixa.
  await m.op('cena.editar', { cena: ids.cena, luz: { global: true } });
  cena = await estado(bruno.cookie);
  assert.deepEqual(cena.luz, { global: true, escuridao: 0.6 }, 'a escuridão fica como estava');
  assert.ok(idsDe(cena).includes(ids.capanga));
  assert.equal((await m.op('luz.apagar', { luz: poste })).status, 200);
  assert.equal((await m.op('luz.apagar', { luz: poste })).status, 404);
});

test('a página é a do servidor que está no ar, com a versão, e todos os arquivos dela chegam', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const versao = (await m.pedir('/api/mesa/estado')).json.versao;
  assert.match(versao, /^[a-f0-9]{12}$/);
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.versao, versao, 'o jogador recebe a mesma versão');
  const html = await m.pedir('/mesa');
  assert.equal(html.status, 200);
  // Cada script e folha de estilo que a página pede chega (o mesa-visao.js faltava no servidor antigo).
  const pedidos = [...html.text.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map(achado => achado[1]);
  assert.ok(pedidos.includes('/mesa-visao.js'));
  for (const caminho of pedidos) assert.equal((await m.pedir(caminho)).status, 200, caminho);
  const js = await m.pedir('/mesa.js');
  assert.equal(js.text, fs.readFileSync(path.join(__dirname, 'mesa.js'), 'utf8'));
  assert.equal((await m.pedir('/mesa.js', { headers: { 'If-None-Match': `"${versao}"` } })).status, 304, 'o navegador reaproveita a página da mesma versão');
});

test('rolagens: o servidor rola, com o crítico do RED, o ferimento e a lesão crítica', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  m.fila.push(10, 4);
  const critico = (await m.op('rolar', { modo: 'teste', token: ids.jax, pericia: 'Handgun' }, ana.cookie)).json.resultado.rolagem;
  assert.equal(critico.critico, 'sucesso');
  assert.equal(critico.total, 8 + 6 + 10 + 4, 'REF 8 + Armas de uma Mão 6 + 10 + 4');
  assert.deepEqual(critico.partes.map(parte => [parte.rotulo, parte.valor]), [['REF', 8], ['Armas de uma Mão', 6]]);
  m.fila.push(1, 3);
  const falha = (await m.op('rolar', { modo: 'teste', token: ids.jax, pericia: 'Handgun' }, ana.cookie)).json.resultado.rolagem;
  assert.equal(falha.critico, 'falha');
  assert.equal(falha.total, 8 + 6 + 1 - 3);
  await m.op('token.editar', { token: ids.jax, hp: { atual: 20, max: 45 } });
  m.fila.push(5);
  const ferido = (await m.op('rolar', { modo: 'teste', token: ids.jax, pericia: 'Handgun', mod: 1 }, ana.cookie)).json.resultado.rolagem;
  assert.equal(ferido.total, 8 + 6 - 2 + 1 + 5, 'Gravemente Ferido tira 2');
  assert.ok(ferido.partes.some(parte => parte.rotulo === 'Gravemente Ferido' && parte.valor === -2));
  m.fila.push(7);
  const npc = (await m.op('rolar', { modo: 'teste', token: ids.capanga, pericia: 'Handgun' })).json.resultado.rolagem;
  assert.equal(npc.total, 10 + 7, 'a ficha do livro já traz a base (Handgun 10)');
  assert.equal((await m.op('rolar', { modo: 'teste', token: ids.capanga, pericia: 'Handgun' }, ana.cookie)).status, 403, 'o jogador não rola pelo NPC');
  m.fila.push(6, 6, 2);
  const dano = (await m.op('rolar', { modo: 'dados', expressao: '3d6' }, ana.cookie)).json.resultado.rolagem;
  assert.deepEqual([dano.total, dano.lesao], [14, true], 'dois 6 no dano: lesão crítica');
  m.fila.push(3, 4);
  const lesao = (await m.op('rolar', { modo: 'lesao', local: 'corpo' })).json.resultado.rolagem;
  assert.equal(lesao.total, 7);
  assert.ok(lesao.lesao && lesao.lesao.nome, 'a lesão vem da tabela da wiki');
  assert.equal((await m.op('rolar', { modo: 'dados', expressao: '99d6' }, ana.cookie)).status, 400);
  // Rolagem "só para o mestre": o Bruno não recebe; o mestre e a própria Ana recebem.
  await m.op('rolar', { modo: 'dados', expressao: '1d10', secreta: true, rotulo: 'x' }, ana.cookie);
  const doBruno = (await m.pedir('/api/mesa/estado', { cookie: bruno.cookie })).json.registro;
  const daAna = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.registro;
  const doMestre = (await m.pedir('/api/mesa/estado')).json.registro;
  assert.equal(doBruno.filter(item => item.secreta).length, 0);
  assert.equal(daAna.filter(item => item.secreta).length, 1);
  assert.equal(doMestre.filter(item => item.secreta).length, 1);
  assert.equal(doBruno.some(item => item.autor.conta), false, 'o id da conta de quem rolou não vai');
});

test('iniciativa: REF + 1d10, empate rola de novo, e a vez passa', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  // Jax (REF 8) tira 2 = 10; Nyx (REF 6) tira 1 = 7; capanga (REF 6) tira 4 = 10. Empate de 10: desempate 3 × 7.
  m.fila.push(2, 1, 4, 3, 7);
  await m.op('combate.iniciar', { cena: ids.cena });
  const combate = (await m.pedir('/api/mesa/estado')).json.combate;
  assert.deepEqual(combate.ordem.map(item => [item.token, item.iniciativa]), [[ids.capanga, 10], [ids.jax, 10], [ids.nyx, 7]]);
  assert.equal(combate.ordem.some(item => item.token === ids.emboscada), false, 'o escondido fica fora, a não ser que o mestre peça');
  assert.equal(combate.vez, ids.capanga);
  await m.op('combate.proximo');
  await m.op('combate.proximo');
  await m.op('combate.proximo');
  const volta = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.combate;
  assert.deepEqual([volta.rodada, volta.vez], [2, ids.capanga]);
  await m.op('combate.iniciativa', { token: ids.nyx, valor: 30 });
  const corrigido = (await m.pedir('/api/mesa/estado')).json.combate;
  assert.equal(corrigido.ordem[0].token, ids.nyx);
  assert.equal(corrigido.vez, ids.capanga, 'corrigir a iniciativa não troca de quem é a vez');
  await m.op('token.apagar', { token: ids.capanga });
  assert.equal((await m.pedir('/api/mesa/estado')).json.combate.ordem.length, 2, 'token apagado sai do combate');
  // O jogador passa só a própria vez (o Fim do turno do Painel Tático): apagado o capanga, a vez é do Jax.
  assert.equal((await m.pedir('/api/mesa/estado')).json.combate.vez, ids.jax);
  assert.equal((await m.op('combate.proximo', {}, bruno.cookie)).status, 403, 'na vez de outro, não');
  assert.equal((await m.op('combate.proximo', { vez: ids.nyx }, ana.cookie)).status, 409, 'o clique atrasado não pula ninguém');
  assert.equal((await m.op('combate.proximo', { vez: ids.jax }, ana.cookie)).status, 200);
  assert.equal((await m.pedir('/api/mesa/estado')).json.combate.vez, ids.nyx);
  assert.equal((await m.op('combate.proximo', {}, ana.cookie)).status, 403, 'passada a vez, não passa a do outro');
});

test('chat: para todos, só para o mestre ou sussurro a um jogador (os outros nem recebem)', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const carla = await m.jogador('Carla', { ...fichaNyx, nome: 'Rook' });
  await m.op('cena.criar', { nome: 'Sala' });
  const visaoBruno = await m.ouvir(bruno.cookie);
  const visaoCarla = await m.ouvir(carla.cookie);
  assert.equal((await m.op('chat', { texto: 'Bom dia, choom.', para: 'todos' }, ana.cookie)).status, 200);
  assert.equal((await m.op('chat', { texto: 'Vou trair o grupo.', para: 'mestre' }, ana.cookie)).status, 200);
  assert.equal((await m.op('chat', { texto: 'Cobre a porta dos fundos.', para: bruno.conta.id }, ana.cookie)).status, 200);
  assert.equal((await m.op('chat', { texto: '   ' }, ana.cookie)).status, 400);
  assert.equal((await m.op('chat', { texto: 'oi', para: 'conta-que-nao-existe' }, ana.cookie)).status, 404);
  assert.ok(await visaoBruno.esperar(item => item.evento === 'registro' && item.data.texto === 'Cobre a porta dos fundos.'), 'o Bruno recebe o sussurro');
  await sleep(150);
  const textos = visao => visao.eventos.filter(item => item.evento === 'registro').map(item => item.data.texto);
  assert.deepEqual(textos(visaoCarla), ['Bom dia, choom.'], 'a Carla só vê o que é para todos');
  assert.deepEqual(textos(visaoBruno), ['Bom dia, choom.', 'Cobre a porta dos fundos.']);
  const doMestre = (await m.pedir('/api/mesa/estado')).json.registro.map(item => item.texto);
  assert.deepEqual(doMestre, ['Bom dia, choom.', 'Vou trair o grupo.', 'Cobre a porta dos fundos.'], 'o mestre vê tudo');
  const daAna = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.registro.map(item => item.texto);
  assert.equal(daAna.length, 3, 'quem escreveu vê as próprias mensagens');
});

test('cursor, ping e régua passam adiante e não ficam gravados', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  await cenaComTokens(m, ana, bruno);
  const mestre = await m.ouvir();
  const visao = await m.ouvir(ana.cookie);
  const atividade = (corpo, cookie) => m.pedir('/api/mesa/atividade', { method: 'POST', body: corpo, cookie });
  assert.equal((await atividade({ conexao: mestre.estado.conexao, cursor: { x: 321, y: 654 } })).status, 200);
  const cursor = await visao.esperar(item => item.evento === 'atividade' && item.data.cursor);
  assert.deepEqual(cursor.data.cursor, { x: 321, y: 654 });
  assert.equal(cursor.data.nome, 'Mestre');
  await atividade({ conexao: visao.estado.conexao, ping: { x: 10, y: 20, puxar: true } }, ana.cookie);
  const ping = await mestre.esperar(item => item.evento === 'atividade' && item.data.ping);
  assert.equal(ping.data.ping.puxar, undefined, 'só o mestre puxa todos');
  assert.equal((await atividade({ conexao: mestre.estado.conexao, cursor: { x: 1, y: 1 } }, ana.cookie)).status, 409, 'a conexão de outra pessoa não serve');
  await m.mesa.tableApi.flush();
  const gravado = fs.readFileSync(path.join(m.dados, 'mesa', 'morana', 'mesa.json'), 'utf8');
  assert.equal(/"(cursor|ping|regua)"\s*:/.test(gravado), false, 'cursor, ping e régua não vão para o arquivo');
});

test('outra campanha não existe para quem não joga nela, e o mapa é só da campanha', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const nova = await m.pedir('/api/campanhas', { method: 'POST', body: { nome: 'Corpo e Alma' } });
  assert.equal(nova.status, 201, nova.text);
  const id = nova.json.campanha.id;
  assert.equal((await m.pedir(`/api/mesa/estado?campanha=${id}`, { cookie: ana.cookie })).status, 404);
  assert.equal((await m.pedir(`/api/mesa/estado?campanha=${id}`)).status, 200, 'o mestre vê todas');
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: PNG, type: 'image/svg+xml', cookie: ana.cookie })).status, 415, 'o jogador manda só a imagem do retrato (sem SVG, vídeo ou música)');
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: Buffer.from('não é png'), type: 'image/png' })).status, 415);
  const enviado = await m.pedir(`/api/mesa/midia?campanha=${id}`, { method: 'POST', body: PNG, type: 'image/png' });
  assert.equal(enviado.status, 200, enviado.text);
  await m.pedir(`/api/mesa/op?campanha=${id}`, { method: 'POST', body: { tipo: 'cena.criar', nome: 'Mapa', imagem: enviado.json.midia, largura: 400, altura: 400 } });
  const cena = (await m.pedir(`/api/mesa/estado?campanha=${id}`)).json.cena;
  assert.equal((await m.pedir(cena.imagem)).status, 200);
  assert.equal((await m.pedir(cena.imagem, { cookie: ana.cookie })).status, 404, 'o mapa da outra campanha não abre para a Ana');
  for (const fora of ['..%2F..%2Fcontas-jogadores.json', '%2E%2E', 'contas-jogadores.json']) {
    assert.equal((await m.pedir(`/api/mesa/midia/${fora}?campanha=${id}`)).status, 404, `nada fora da pasta de mapas (${fora})`);
  }
});

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a41d0000000049454e44ae426082', 'hex');

test('mídia: vídeo e SVG sobem, o vídeo vem aos pedaços e o SVG não roda script', async t => {
  const m = await montar(t);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(5000, 7)]);
  const video = await m.pedir('/api/mesa/midia', { method: 'POST', body: webm, type: 'video/webm' });
  assert.equal(video.status, 200, video.text);
  assert.match(video.json.midia, /^[a-f0-9]{40}\.webm$/);
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: webm, type: 'video/mp4' })).status, 415, 'um WebM dizendo que é MP4 não entra');
  const pedaco = await fetch(`${m.mesa.url.replace('localhost', '127.0.0.1')}/api/mesa/midia/${video.json.midia}`, { headers: { Range: 'bytes=0-3' } });
  assert.equal(pedaco.status, 206);
  assert.equal(pedaco.headers.get('content-range'), 'bytes 0-3/5004');
  assert.deepEqual([...Buffer.from(await pedaco.arrayBuffer())], [0x1a, 0x45, 0xdf, 0xa3]);
  const svg = await m.pedir('/api/mesa/midia', { method: 'POST', body: Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), type: 'image/svg+xml' });
  assert.equal(svg.status, 200, svg.text);
  const aberto = await fetch(`${m.mesa.url.replace('localhost', '127.0.0.1')}/api/mesa/midia/${svg.json.midia}`);
  assert.match(aberto.headers.get('content-security-policy') || '', /sandbox/);
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: Buffer.alloc(3 * 1024 * 1024, 32), type: 'image/svg+xml' })).status, 413, 'SVG até 2 MB');
  assert.equal(fs.readdirSync(path.join(m.dados, 'mesa', 'morana', 'midia')).filter(nome => nome.endsWith('.tmp')).length, 0, 'envio recusado não deixa temporário');
});

test('o HP do personagem volta para a ficha, e o da ficha volta para a mesa', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  // A Ana leva dano pela mesa: a ficha e a lista de Personagens passam a mostrar 30.
  assert.equal((await m.op('token.editar', { token: ids.jax, hp: { atual: 30, max: 45 } }, ana.cookie)).status, 200);
  const ficha = (await m.pedir(`/api/personagens/${ana.personagem.id}`, { cookie: ana.cookie })).json.personagem;
  assert.equal(ficha.jogo.hp.atual, 30);
  const lista = (await m.pedir('/api/personagens', { cookie: ana.cookie })).json.personagens;
  assert.deepEqual(lista.find(item => item.id === ana.personagem.id).numeros.hp, { atual: 30, max: 45 });
  // Salvar a ficha pela wiki não apaga o HP da mesa.
  assert.equal((await m.pedir(`/api/personagens/${ana.personagem.id}`, { method: 'PUT', cookie: ana.cookie, body: { ...ficha, aparencia: 'Jaqueta nova' } })).status, 200);
  assert.equal((await m.pedir(`/api/personagens/${ana.personagem.id}`, { cookie: ana.cookie })).json.personagem.jogo.hp.atual, 30);
  // O Foundry manda a ficha com HP 12 (mais recente): a mesa pega na próxima conferência e avisa a Ana.
  const visao = await m.ouvir(ana.cookie);
  await sleep(20);
  assert.equal((await m.pedir(`/api/personagens/${ana.personagem.id}/mesa`, { method: 'PUT', body: { hp: { atual: 12, max: 45 }, stats: { REF: 8 } } })).status, 200);
  m.mesa.tableApi.syncCharacters();
  const veio = await visao.esperar(item => item.evento === 'token' && item.data.id === ids.jax && item.data.hp.atual === 12);
  assert.ok(veio, 'o HP do Foundry chegou à mesa');
  assert.equal(veio.data.estado, 'Gravemente Ferido');
  // O mestre não muda o máximo de um personagem pela mesa (é o da ficha).
  await m.op('token.editar', { token: ids.jax, hp: { atual: 40, max: 99 } });
  const depois = (await m.pedir('/api/mesa/estado')).json.cena.tokens.find(token => token.id === ids.jax);
  assert.deepEqual(depois.hp, { atual: 40, max: 45 });
  // Com a ficha do Foundry já lá, o HP da mesa mudado depois é o que vale (na mesa, na lista e na próxima conferência).
  m.mesa.tableApi.syncCharacters();
  const conferido = (await m.pedir('/api/mesa/estado')).json.cena.tokens.find(token => token.id === ids.jax);
  assert.deepEqual(conferido.hp, { atual: 40, max: 45 }, 'o mais recente vale');
  const listaDepois = (await m.pedir('/api/personagens', { cookie: ana.cookie })).json.personagens;
  assert.deepEqual(listaDepois.find(item => item.id === ana.personagem.id).numeros.hp, { atual: 40, max: 45 });
});

test('editar o mapa: tiles, a aparência do token e a margem fora do mapa', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const imagem = (await m.pedir('/api/mesa/midia', { method: 'POST', body: PNG, type: 'image/png' })).json.midia;
  const cena = (await m.op('cena.criar', { nome: 'Doca', largura: 1000, altura: 800, grade: { tamanho: 100 }, margem: { x: 200, y: 100 } })).json.resultado.cena;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: -150, y: 50 })).json.resultado.token;
  const drone = (await m.op('token.criar', { cena, livre: { nome: 'Drone' }, x: -500, y: 0 })).json.resultado.token;
  const tokens = () => m.pedir('/api/mesa/estado').then(r => Object.fromEntries(r.json.cena.tokens.map(token => [token.id, token])));
  let porId = await tokens();
  assert.deepEqual([porId[jax].x, porId[jax].y], [-150, 50], 'na margem, fora do mapa');
  assert.deepEqual([porId[drone].x, porId[drone].y], [-200, 0], 'até a margem, não além');
  assert.equal((await m.op('token.mover', { token: jax, x: 1300, y: -400 }, ana.cookie)).status, 200);
  porId = await tokens();
  assert.deepEqual([porId[jax].x, porId[jax].y], [1200, -100]);
  await m.op('cena.editar', { cena, margem: { x: 0, y: 0 } });
  porId = await tokens();
  assert.deepEqual([porId[jax].x, porId[jax].y, porId[drone].x], [1000, 0, 0], 'sem margem, volta para o mapa');

  // A aparência: tamanho, cor e imagem (a do personagem é o retrato da ficha).
  assert.equal((await m.op('token.editar', { token: drone, tamanho: 2, cor: '#123456', midia: imagem })).status, 200);
  assert.equal((await m.op('token.editar', { token: drone, midia: 'naoexiste.png' })).status, 400);
  await m.op('token.editar', { token: jax, midia: imagem });
  porId = await tokens();
  assert.deepEqual([porId[drone].tamanho, porId[drone].cor], [2, '#123456']);
  assert.match(porId[drone].imagem, new RegExp(`/api/mesa/midia/${imagem}`));
  assert.ok(!porId[jax].imagem.includes(imagem), 'o personagem continua com o retrato da ficha');

  // Tiles: pôr, mexer, esconder, ordem e tirar.
  await m.op('cena.ativar', { cena });
  const criado = await m.op('tile.criar', { cena, midia: imagem, x: 100, y: 100, largura: 300, altura: 200 });
  assert.equal(criado.status, 200, criado.text);
  const tile = criado.json.resultado.tile;
  const outro = (await m.op('tile.criar', { cena, midia: imagem, x: 500, y: 500, largura: 50, altura: 50 })).json.resultado.tile;
  assert.equal((await m.op('tile.criar', { cena, midia: imagem }, ana.cookie)).status, 403);
  assert.equal((await m.op('tile.editar', { tile, x: 5 }, ana.cookie)).status, 403);
  const visaoAna = await m.ouvir(ana.cookie);
  assert.equal(visaoAna.estado.cena.tiles.length, 2);
  await m.op('tile.editar', { tile, x: 150, y: 120, largura: 320, altura: 180, rotacao: 45, alpha: 0.5, escondido: true, ordem: 'frente' });
  const mudou = await visaoAna.esperar(item => item.evento === 'cena' && item.data.cena.tiles.length === 1);
  assert.ok(mudou, 'o tile escondido sai da cena do jogador');
  const doMestre = (await m.pedir('/api/mesa/estado')).json.cena.tiles;
  assert.deepEqual(doMestre.map(item => item.id), [outro, tile], 'para a frente: desenhado por último');
  assert.deepEqual((({ x, y, largura, altura, rotacao, alpha, escondido }) => ({ x, y, largura, altura, rotacao, alpha, escondido }))(doMestre[1]), { x: 150, y: 120, largura: 320, altura: 180, rotacao: 45, alpha: 0.5, escondido: true });
  await m.op('tile.editar', { tile, ordem: 'tras' });
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.cena.tiles.map(item => item.id), [tile, outro]);
  assert.equal((await m.op('tile.apagar', { tile })).status, 200);
  assert.equal((await m.op('tile.apagar', { tile })).status, 404);
  assert.equal((await m.pedir('/api/mesa/estado')).json.cena.tiles.length, 1);
});

test('importar uma cena: tiles escondidos só para o mestre, tokens viram personagem, ficha de NPC ou livre', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const mapa = (await m.pedir('/api/mesa/midia', { method: 'POST', body: PNG, type: 'image/png' })).json.midia;
  const cena = {
    nome: 'Beco BG', imagem: mapa, largura: 1920, altura: 1080, grade: { tamanho: 80, tipo: 'quadrada', metros: 2, unidade: 'm', x: 20, y: 78 },
    tiles: [{ midia: mapa, x: 10, y: 20, largura: 100, altura: 50 }, { midia: mapa, x: 300, y: 300, largura: 40, altura: 40, escondido: true }],
    paredes: [{ c: [0, 0, 100, 0], porta: 1 }], luzes: [{ x: 50, y: 50, claro: 3, penumbra: 7 }],
    tokens: [
      { nome: 'Jax', personagem: ana.personagem.id, x: 120, y: 120 },
      { nome: 'Guarda-costas (Bodyguard)', npcNome: 'Guarda-costas', x: 300, y: 120 },
      { nome: 'Dr. Kenzo Endo', npcNome: 'Dr. Kenzo Endo', midia: mapa, hp: 30, x: 500, y: 120 },
      { nome: 'Qyan', personagem: 'naoexiste1', midia: mapa, hp: 40, x: 700, y: 120 }
    ],
    origem: { mundo: 'edgerunners-storys', id: 'cenaFoundry01' }
  };
  const feita = await m.op('cena.importar', { cena });
  assert.equal(feita.status, 200, feita.text);
  assert.deepEqual(feita.json.resultado, { cena: feita.json.resultado.cena, tokens: 4, tiles: 2, paredes: 1, luzes: 1 });
  assert.equal((await m.op('cena.importar', { cena })).status, 409, 'a mesma cena do mesmo mundo duas vezes, não');
  assert.equal((await m.op('cena.importar', { cena, substituir: true })).status, 200, 'com substituir, troca');
  await m.op('cena.ativar', { cena: feita.json.resultado.cena });
  const doMestre = (await m.pedir('/api/mesa/estado')).json;
  assert.equal(doMestre.cenas.length, 1, 'substituir não duplica');
  assert.equal(doMestre.cena.tiles.length, 2);
  assert.deepEqual(doMestre.cena.paredes.map(({ c, porta, estado, visao, movimento }) => ({ c, porta, estado, visao, movimento })), [{ c: [0, 0, 100, 0], porta: 1, estado: 0, visao: 20, movimento: 20 }], 'o mestre recebe as paredes');
  // A luz de 3 m clara e 7 m de penumbra, na grade de 80 px = 2 m: 120 e 280 px.
  assert.deepEqual(doMestre.cena.luzes.map(({ x, y, claro, penumbra, cor, alpha, metros }) => ({ x, y, claro, penumbra, cor, alpha, metros })), [{ x: 50, y: 50, claro: 120, penumbra: 280, cor: null, alpha: 0.5, metros: { claro: 3, penumbra: 7 } }], 'as luzes, em px (e em metros, para o mestre mudar)');
  assert.deepEqual(doMestre.cena.luz, { global: true, escuridao: 0 }, 'sem a luz do Foundry, a cena toda clara');
  assert.equal(doMestre.cena.visao, false, 'a visão só liga se a cena do Foundry tinha (visao)');
  assert.deepEqual(doMestre.cena.tokens.map(token => [token.nome, token.tipo]), [[fichaJax.nome, 'pj'], ['Guarda-costas (Bodyguard)', 'npc'], ['Dr. Kenzo Endo', 'livre'], ['Qyan', 'livre']]);
  assert.match(doMestre.cena.tokens[2].imagem, /^\/api\/mesa\/midia\/[a-f0-9]{40}\.png\?campanha=morana$/);
  assert.deepEqual(doMestre.cena.tokens[3].hp, { atual: 40, max: 40 });
  const daAna = (await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena;
  assert.equal(daAna.tiles.length, 1, 'o tile escondido não vai para o jogador');
  assert.deepEqual(daAna.paredes.map(parede => parede.porta), [1], 'o jogador recebe a porta, para abrir');
  assert.equal(daAna.luzes.length, 1, 'a luz do cenário chega ao jogador (ele vê o brilho)');
  assert.equal(daAna.grade.tipo, 'quadrada');
  assert.equal((await m.op('cena.importar', { cena }, ana.cookie)).status, 403);
});
