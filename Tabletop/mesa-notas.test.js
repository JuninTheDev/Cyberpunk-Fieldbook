// Testes das notas no mapa (M12): o mestre põe, muda e tira; cada jogador recebe só a nota que pode ver (só o mestre,
// quando um token dele vê o ponto, ou sempre), o link é só de página da wiki, a imagem é imagem, e "Mostrar a todos"
// abre a nota na tela dos jogadores.
const assert = require('node:assert/strict');
const test = require('node:test');
const { montar, fichaJax, fichaNyx, cenaComTokens } = require('./teste-ajuda');

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
const notasDe = async (m, cookie) => (await m.pedir('/api/mesa/estado', { cookie })).json.cena.notas;

test('notas: o mestre põe e muda; o jogador recebe só a que pode ver, sem o "quem vê"', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  assert.equal((await m.op('nota.criar', { cena: ids.cena, x: 400, y: 200 }, ana.cookie)).status, 403, 'só o mestre põe nota');
  const criada = await m.op('nota.criar', { cena: ids.cena, x: 400, y: 200, titulo: 'Bilhete no chão', texto: 'O Sato paga em dobro.\nQueime depois de ler.' });
  assert.equal(criada.status, 200, criada.text);
  const nota = criada.json.resultado.nota;
  const doMestre = (await notasDe(m)).find(item => item.id === nota);
  assert.deepEqual([doMestre.titulo, doMestre.texto, doMestre.mostrar, doMestre.cor], ['Bilhete no chão', 'O Sato paga em dobro.\nQueime depois de ler.', 'mestre', '#f8ef02'], 'começa só para o mestre');
  assert.deepEqual(await notasDe(m, ana.cookie), [], 'só do mestre: o jogador nem recebe');

  // Sempre à vista: chega, sem o "quem vê" nem o nome do arquivo da imagem.
  const visao = await m.ouvir(ana.cookie);
  assert.equal((await m.op('nota.editar', { nota, mostrar: 'sempre' })).status, 200);
  const chegou = await visao.esperar(item => item.evento === 'cena' && item.data.cena.notas.length === 1);
  assert.ok(chegou, 'a cena vai de novo com a nota');
  assert.deepEqual(Object.keys(chegou.data.cena.notas[0]).sort(), ['cor', 'id', 'imagem', 'link', 'texto', 'titulo', 'x', 'y']);
  assert.equal((await m.op('nota.editar', { nota, titulo: 'Outro' }, ana.cookie)).status, 403);

  // O link é de página da wiki: do endereço colado, fica só o #.
  assert.equal((await m.op('nota.editar', { nota, link: 'https://wiki.exemplo.com/#sessao-01' })).status, 200);
  assert.equal((await notasDe(m, ana.cookie))[0].link, '#sessao-01');
  assert.equal((await m.op('nota.editar', { nota, link: '#ficha/abc123' })).status, 200);
  assert.equal((await notasDe(m, ana.cookie))[0].link, '#ficha/abc123');
  assert.equal((await m.op('nota.editar', { nota, link: 'https://outro.site/pagina' })).status, 400, 'link para fora da wiki, não');
  assert.equal((await m.op('nota.editar', { nota, link: 'javascript:alert(1)' })).status, 400);
  assert.equal((await m.op('nota.editar', { nota, link: '' })).status, 200);
  assert.equal((await notasDe(m, ana.cookie))[0].link, '', 'vazio tira o link');

  // A imagem: imagem sim, vídeo não; o jogador recebe o endereço dela.
  const imagem = (await m.pedir('/api/mesa/midia', { method: 'POST', body: png, type: 'image/png' })).json.midia;
  assert.equal((await m.op('nota.editar', { nota, midia: imagem })).status, 200);
  assert.match((await notasDe(m, ana.cookie))[0].imagem, new RegExp(`/api/mesa/midia/${imagem}\\?campanha=`));
  const video = (await m.pedir('/api/mesa/midia', { method: 'POST', body: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(500, 7)]), type: 'video/webm' })).json.midia;
  assert.equal((await m.op('nota.editar', { nota, midia: video })).status, 400, 'a nota não leva vídeo');
  assert.equal((await m.op('nota.editar', { nota, midia: 'f'.repeat(40) + '.png' })).status, 400, 'imagem que não subiu, não');

  // Mover: fica dentro do mapa (e da margem).
  assert.equal((await m.op('nota.editar', { nota, x: 99999, y: -99999 })).status, 200);
  const movida = (await notasDe(m)).find(item => item.id === nota);
  assert.deepEqual([movida.x, movida.y], [2000, 0]);

  // Apagar.
  assert.equal((await m.op('nota.apagar', { nota }, ana.cookie)).status, 403);
  assert.equal((await m.op('nota.apagar', { nota })).status, 200);
  assert.deepEqual(await notasDe(m), []);
  assert.equal((await m.op('nota.editar', { nota, titulo: 'x' })).status, 404);
});

test('notas "quando vista": debaixo da névoa não chega; com a visão ligada, só quando um token do jogador vê o ponto', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno, { nevoa: true });
  const nota = (await m.op('nota.criar', { cena: ids.cena, x: 950, y: 650, titulo: 'Cofre', mostrar: 'vista' })).json.resultado.nota;
  assert.deepEqual(await notasDe(m, ana.cookie), [], 'debaixo da névoa, não chega');
  const visao = await m.ouvir(ana.cookie);
  await m.op('nevoa.traco', { cena: ids.cena, modo: 'revelar', r: 200, pontos: [{ x: 950, y: 650 }] });
  const revelada = await visao.esperar(item => item.evento === 'notas' && item.data.notas.some(item2 => item2.id === nota));
  assert.ok(revelada, 'revelou: a nota chega pelo evento');

  // A visão ligada e uma parede entre o Jax e a nota: some; o Jax passa pela porta e vê: volta.
  await m.op('nevoa.ligar', { cena: ids.cena, ativa: false });
  await m.op('parede.criar', { cena: ids.cena, paredes: [{ c: [600, 0, 600, 1500] }] });
  assert.equal((await notasDe(m, ana.cookie)).length, 1, 'sem a visão ligada, a parede não esconde (como os tokens)');
  await m.op('cena.editar', { cena: ids.cena, visao: true });
  assert.deepEqual(await notasDe(m, ana.cookie), [], 'atrás da parede, não chega');
  assert.equal((await notasDe(m, bruno.cookie)).length, 0, 'a Nyx também está do outro lado');
  visao.limpar();
  await m.op('token.mover', { token: ids.jax, x: 750, y: 650 });
  assert.ok(await visao.esperar(item => item.evento === 'notas' && item.data.notas.some(item2 => item2.id === nota)), 'o token chegou perto: a nota aparece');
  assert.equal((await notasDe(m, bruno.cookie)).length, 0, 'cada um com os próprios olhos');
  visao.limpar();
  await m.op('token.mover', { token: ids.jax, x: 150, y: 150 });
  assert.ok(await visao.esperar(item => item.evento === 'notas' && item.data.notas.length === 0), 'voltou para trás da parede: some');
  // O mestre vê todas, sempre.
  assert.equal((await notasDe(m)).length, 1);
});

test('Mostrar a todos: a nota abre na tela dos jogadores da campanha, mesmo a que só o mestre vê no mapa', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const ids = await cenaComTokens(m, ana, bruno);
  const nota = (await m.op('nota.criar', { cena: ids.cena, x: 400, y: 200, titulo: 'Foto do alvo', texto: 'Visto pela última vez no Afterlife.' })).json.resultado.nota;
  const telaAna = await m.ouvir(ana.cookie);
  const telaBruno = await m.ouvir(bruno.cookie);
  assert.equal((await m.op('nota.mostrar', { nota }, ana.cookie)).status, 403);
  assert.equal((await m.op('nota.mostrar', { nota })).status, 200);
  for (const tela of [telaAna, telaBruno]) {
    const aberta = await tela.esperar(item => item.evento === 'nota.aberta');
    assert.ok(aberta, 'abriu na tela do jogador');
    assert.deepEqual([aberta.data.titulo, aberta.data.texto, aberta.data.mostrar], ['Foto do alvo', 'Visto pela última vez no Afterlife.', undefined]);
  }
  assert.deepEqual(await notasDe(m, ana.cookie), [], 'no mapa, continua só do mestre');
  assert.equal((await m.op('nota.mostrar', { nota: 'naoexiste' })).status, 404);
});
