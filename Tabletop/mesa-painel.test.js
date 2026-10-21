// Testes do Painel Tático (M14): as contas do mesa-painel.js (o estado do retrato, a imagem de cada estado, o efeito,
// o estilo e o código que vem do módulo do Foundry), o retrato pela API da mesa (o dono e o mestre gravam, a imagem que
// o jogador envia) e o retrato que a importação traz do Foundry.
// Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const P = require('./mesa-painel');
const { sleep, montar, fichaJax, fichaNyx } = require('./teste-ajuda');
const { converterAtores } = require('./importar-foundry');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a41d0000000049454e44ae426082', 'hex');
const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64, 0)]);

test('retrato: o estado pelo HP (o nome que a mesa manda) e pelo morto, e a imagem que vale em cada um', () => {
  assert.equal(P.estadoDoRetrato({ estado: 'Gravemente Ferido' }), 'seriouslyWounded');
  assert.equal(P.estadoDoRetrato({ estado: 'Mortalmente Ferido', morto: true }), 'dead');
  assert.equal(P.estadoDoRetrato({ estado: null }), 'notWounded');
  assert.equal(P.estadoDoRetrato({ estado: 'lightlyWounded' }), 'lightlyWounded', 'o nome do Foundry também');
  const imagens = { notWounded: 'a.png', seriouslyWounded: 'c.png' };
  assert.deepEqual(P.imagemDoEstado(imagens, 'seriouslyWounded'), { midia: 'c.png', propria: true, de: 'seriouslyWounded' });
  assert.deepEqual(P.imagemDoEstado(imagens, 'mortallyWounded'), { midia: 'c.png', propria: false, de: 'seriouslyWounded' }, 'sem imagem: a do estado mais leve mais próximo');
  assert.deepEqual(P.imagemDoEstado(imagens, 'lightlyWounded'), { midia: 'a.png', propria: false, de: 'notWounded' });
  assert.deepEqual(P.imagemDoEstado({}, 'dead', '/retrato.png'), { midia: '', reserva: '/retrato.png', propria: false, de: null }, 'sem nenhuma: o retrato da ficha');
  assert.equal(P.efeitoDoRetrato({ estado: 'mortallyWounded', propria: false }), 'mortallyWounded');
  assert.equal(P.efeitoDoRetrato({ estado: 'mortallyWounded', propria: true }), '', 'a imagem própria do estado dispensa o efeito');
  assert.equal(P.efeitoDoRetrato({ estado: 'mortallyWounded', propria: true, modo: 'sempre' }), 'mortallyWounded');
  assert.equal(P.efeitoDoRetrato({ estado: 'dead', propria: false, modo: 'nunca' }), '');
  assert.equal(P.efeitoDoRetrato({ estado: 'notWounded', propria: false, modo: 'sempre' }), '');
  assert.deepEqual(P.normalizarRetrato({ imagens: { notWounded: ' a.png ', dead: 'b.png', outro: 'c.png' }, escala: 900, x: -999, y: '12', espelhar: 1, modo: 'x' }, nome => nome !== 'b.png'),
    { imagens: { notWounded: 'a.png' }, escala: 250, x: -300, y: 12, espelhar: true, modo: 'auto' });
  assert.equal(P.modoDoRetrato(P.normalizarRetrato({ imagens: { notWounded: 'a.png' } })), 'livre');
  assert.equal(P.modoDoRetrato(P.normalizarRetrato({})), 'moldura');
  assert.equal(P.modoDoRetrato(P.normalizarRetrato({ imagens: { notWounded: 'a.png' }, modo: 'moldura' })), 'moldura');
});

test('estilo: o padrão da mesa por baixo, o tema, os botões de HP e o código do Foundry (a fonte de lá vira a da wiki)', () => {
  const mesa = P.normalizarEstilo({ tema: 'arasaka', acento: '#ff1f3d', escala: 120 });
  const meu = P.normalizarEstilo({ escala: 80 }, mesa);
  assert.deepEqual([meu.tema, meu.acento, meu.escala], ['arasaka', '#ff1f3d', 80], 'o que o jogador não mudou vem do mestre');
  assert.deepEqual(P.aplicarTema(meu, 'netrunner').acento, '#b26bff');
  assert.deepEqual(P.passosDeHp('-10 +2, 0 x 2 200'), [-10, 2]);
  assert.deepEqual(P.passosDeHp(''), [-5, -1, 1, 5]);
  assert.deepEqual(P.normalizarEstilo({ secoes: ['armas', 'nada'] }).secoes, ['armas', 'vitais', 'atributos', 'acoes']);
  // Um código feito no módulo do Foundry (com a fonte Tektur e peças que a mesa não tem).
  const doFoundry = 'PT1:' + Buffer.from(JSON.stringify({ tema: 'militech', fonte: 'tektur', ocultos: ['escudo', 'sorte'], retratoAltura: 400 })).toString('base64');
  const lido = P.lerCodigo(doFoundry, { ...P.ESTILO_PADRAO, posicao: 'livre', x: 10, y: 20 });
  assert.deepEqual([lido.tema, lido.fonte, lido.ocultos, lido.retratoAltura, lido.posicao, lido.x], ['militech', 'oxanium', ['sorte'], 400, 'livre', 10], 'a posição fica a de agora');
  assert.deepEqual(P.lerCodigo(P.codigoDoEstilo(meu)).escala, 80, 'ida e volta');
  assert.throws(() => P.lerCodigo('PT1:lixo'), /não é válido/);
  assert.equal(P.variaveisDoEstilo(meu)['--pt-acento-rgb'], '255, 31, 61');
  assert.ok(P.classesDoEstilo({ animacoes: false, compacto: true }).includes('pt-sem-animacao'));
  assert.deepEqual(P.dentroDaTela({ x: -900, y: 2000, largura: 500, altura: 200, telaL: 1366, telaA: 768 }), { x: -440, y: 708 });
});

test('retrato pela mesa: o dono e o mestre gravam, o outro jogador não; o jogador envia só imagem; vem com a ficha', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const bruno = await m.jogador('Bruno', fichaNyx);
  const id = ana.personagem.id;
  // O jogador envia a imagem do retrato (só imagem, até 8 MB); música, não.
  const enviada = await m.pedir('/api/mesa/midia', { method: 'POST', body: PNG, type: 'image/png', cookie: ana.cookie });
  assert.equal(enviada.status, 200, enviada.text);
  const png = enviada.json.midia;
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: MP3, type: 'audio/mpeg', cookie: ana.cookie })).status, 415);
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: Buffer.alloc(9 * 1024 * 1024, 1), type: 'image/png', cookie: ana.cookie })).status, 413, 'mais de 8 MB, não');
  const mp3 = (await m.pedir('/api/mesa/midia', { method: 'POST', body: MP3, type: 'audio/mpeg' })).json.midia;

  const ouvidoAna = await m.ouvir(ana.cookie);
  const ouvidoBruno = await m.ouvir(bruno.cookie);
  await sleep(20);
  const retrato = { imagens: { notWounded: png, seriouslyWounded: png }, escala: 110, x: 4, y: -6, espelhar: true, modo: 'livre' };
  assert.equal((await m.op('retrato.salvar', { personagem: id, retrato }, bruno.cookie)).status, 403, 'o retrato do personagem de outro, não');
  assert.match((await m.op('retrato.salvar', { personagem: id, retrato: { imagens: { notWounded: 'a'.repeat(40) + '.png' } } }, ana.cookie)).json.erro, /envie de novo/);
  assert.match((await m.op('retrato.salvar', { personagem: id, retrato: { imagens: { notWounded: mp3 } } }, ana.cookie)).json.erro, /é uma imagem/);
  const gravado = await m.op('retrato.salvar', { personagem: id, retrato }, ana.cookie);
  assert.equal(gravado.status, 200, gravado.text);
  const fichas = await ouvidoAna.esperar(item => item.evento === 'fichas' && item.data.meus && item.data.meus[0].painel);
  assert.deepEqual(fichas.data.meus[0].painel, retrato);
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.personagens.find(ficha => ficha.id === id).painel, retrato, 'o mestre também recebe');
  await sleep(100);
  assert.ok(!ouvidoBruno.eventos.some(item => item.evento === 'fichas' && JSON.stringify(item.data).includes(png)), 'o outro jogador nem recebe');
  // O mestre muda (tira tudo): vale o retrato da ficha.
  assert.equal((await m.op('retrato.salvar', { personagem: id, retrato: {} })).status, 200);
  assert.deepEqual((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.meus[0].painel, P.normalizarRetrato({}));
});

test('importação: o retrato do Painel Tático dos personagens da wiki vem do Foundry', () => {
  const atores = new Map([
    ['!actors!q1', { _id: 'q1', name: 'Qyan', type: 'character', flags: { 'cpr-2077': { wiki: { id: 'ppt24g8ww5' } }, 'painel-tatico': { retrato: { imagens: { notWounded: 'corvo2%20sem%20fundo.png', lightlyWounded: 'corvo2%20(ferido)%20sem%20fundo.png', mortallyWounded: '', dead: '' }, escala: 85, x: 0, y: 4, espelhar: false, modo: 'auto' } } } }],
    ['!actors!q2', { _id: 'q2', name: 'Sem wiki', type: 'character', flags: { 'painel-tatico': { retrato: { imagens: { notWounded: 'x.png' } } } } }]
  ]);
  const { retratos, midias } = converterAtores(atores, new Map(), 'mundo');
  assert.deepEqual(retratos, [{ nome: 'Qyan', personagem: 'ppt24g8ww5', retrato: { imagens: { notWounded: 'corvo2 sem fundo.png', lightlyWounded: 'corvo2 (ferido) sem fundo.png' }, escala: 85, x: 0, y: 4, espelhar: false, modo: 'auto' } }]);
  assert.deepEqual([...midias], ['corvo2 sem fundo.png', 'corvo2 (ferido) sem fundo.png'], 'as imagens sobem para a mesa');
});

test('o estilo padrão da mesa: o mestre escolhe (sem a posição), todos recebem; null volta ao da wiki', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const ouvido = await m.ouvir(ana.cookie);
  await sleep(20);
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.estiloDaMesa, null);
  assert.equal((await m.op('painel.estiloDaMesa', { estilo: { tema: 'arasaka' } }, ana.cookie)).status, 403, 'só o mestre');
  const feito = await m.op('painel.estiloDaMesa', { estilo: { ...P.aplicarTema({}, 'netrunner'), escala: 120, posicao: 'livre', x: 300, y: 40, fonte: 'tektur' } });
  assert.equal(feito.status, 200, feito.text);
  const evento = await ouvido.esperar(item => item.evento === 'estiloDaMesa');
  assert.deepEqual([evento.data.estilo.tema, evento.data.estilo.escala, evento.data.estilo.posicao, evento.data.estilo.x, evento.data.estilo.fonte], ['netrunner', 120, 'base', null, 'oxanium']);
  assert.deepEqual((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.estiloDaMesa, evento.data.estilo);
  assert.equal((await m.op('painel.estiloDaMesa', { estilo: null })).status, 200);
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.estiloDaMesa, null);
});
