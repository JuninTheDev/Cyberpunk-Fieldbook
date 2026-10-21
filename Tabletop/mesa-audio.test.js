// Testes do áudio da mesa (M11): playlists com música enviada e vídeo do YouTube, o que toca em cada canal, a fila, a
// música da cena e a importação das playlists do Foundry. Rodar: node --test Tabletop/
const assert = require('node:assert/strict');
const test = require('node:test');
const { sleep, montar, fichaJax } = require('./teste-ajuda');
const { youtubeId } = require('./mesa-audio');

const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.from([3, 0, 0, 0, 0, 0, 10]), Buffer.alloc(2000, 0x55)]);
const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(2000, 1)]);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const perto = (valor, esperado, folga, mensagem) => assert.ok(Math.abs(valor - esperado) <= folga, `${mensagem}: ${valor} (esperado ${esperado} ± ${folga})`);

async function playlist(m, nome, extra = {}) {
  const feita = await m.op('audio.playlist.criar', { nome, ...extra });
  assert.equal(feita.status, 200, feita.text);
  return feita.json.resultado.playlist;
}
async function faixas(m, lista, itens) {
  const feitas = await m.op('audio.faixa.criar', { playlist: lista, faixas: itens });
  assert.equal(feitas.status, 200, feitas.text);
  return feitas.json.resultado.faixas;
}
const audioDe = async (m, cookie) => (await m.pedir('/api/mesa/estado', { cookie })).json.audio;

test('o link do YouTube vira o id do vídeo', () => {
  for (const link of ['dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDmrwC&index=2', 'youtu.be/dQw4w9WgXcQ?t=30', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ?si=x']) {
    assert.equal(youtubeId(link), 'dQw4w9WgXcQ', link);
  }
  for (const link of ['', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/playlist?list=PL123', 'https://www.youtube.com/watch?v=curto', 'dQw4w9WgXc']) {
    assert.equal(youtubeId(link), '', link);
  }
});

test('áudio: o mestre monta a playlist com música e YouTube; o jogador só recebe o que toca', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const mp3 = await m.pedir('/api/mesa/midia', { method: 'POST', body: MP3, type: 'audio/mpeg' });
  assert.equal(mp3.status, 200, mp3.text);
  assert.match(mp3.json.midia, /^[a-f0-9]{40}\.mp3$/);
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: OGG, type: 'audio/ogg' })).status, 200);
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: OGG, type: 'audio/mpeg' })).status, 415, 'um OGG dizendo que é MP3 não entra');
  assert.equal((await m.pedir('/api/mesa/midia', { method: 'POST', body: MP3, type: 'audio/mpeg', cookie: ana.cookie })).status, 415, 'só o mestre envia música (o jogador, só a imagem do retrato)');
  const png = (await m.pedir('/api/mesa/midia', { method: 'POST', body: PNG, type: 'image/png' })).json.midia;

  assert.equal((await m.op('audio.playlist.criar', { nome: 'Minha' }, ana.cookie)).status, 403, 'a playlist é do mestre');
  const combate = await playlist(m, 'Combate');
  assert.equal((await m.op('audio.faixa.criar', { playlist: combate, youtube: 'https://example.com/watch?v=dQw4w9WgXcQ' })).status, 400, 'link que não é do YouTube');
  assert.equal((await m.op('audio.faixa.criar', { playlist: combate, midia: png })).status, 400, 'imagem não é música');
  assert.equal((await m.op('audio.faixa.criar', { playlist: combate, midia: `${'0'.repeat(40)}.mp3` })).status, 400, 'música que não subiu');

  const mestre = await m.ouvir();
  const [wushu, video] = await faixas(m, combate, [{ midia: mp3.json.midia, nome: 'Wushu Dolls', volume: 0.2 }, { youtube: 'https://youtu.be/dQw4w9WgXcQ?t=3' }]);
  // O vídeo entra com o id no nome; o título chega depois (o servidor pergunta ao YouTube).
  const comTitulo = await mestre.esperar(item => item.evento === 'audio' && item.data.playlists[0].faixas[1].nome === 'Vídeo dQw4w9WgXcQ');
  assert.ok(comTitulo, 'o título do vídeo chega');
  const doMestre = comTitulo.data.playlists[0];
  assert.deepEqual(doMestre.faixas.map(({ id, nome, volume, repetir, youtube }) => ({ id, nome, volume, repetir, youtube })),
    [{ id: wushu, nome: 'Wushu Dolls', volume: 0.2, repetir: false, youtube: undefined }, { id: video, nome: 'Vídeo dQw4w9WgXcQ', volume: 0.5, repetir: false, youtube: 'dQw4w9WgXcQ' }]);

  const antes = await audioDe(m, ana.cookie);
  assert.deepEqual(antes.canais, { musica: null, ambiente: null });
  assert.equal(antes.playlists, undefined, 'a biblioteca é só do mestre');

  const visao = await m.ouvir(ana.cookie);
  assert.equal((await m.op('audio.tocar', { faixa: wushu }, ana.cookie)).status, 403, 'quem toca é o mestre');
  const tocou = Date.now();
  assert.equal((await m.op('audio.tocar', { faixa: wushu })).status, 200);
  const recebido = (await visao.esperar(item => item.evento === 'audio' && item.data.canais.musica)).data;
  const musica = recebido.canais.musica;
  assert.equal(musica.faixa.nome, 'Wushu Dolls');
  assert.equal(musica.playlist, 'Combate');
  assert.equal(musica.pausa, null);
  perto(musica.inicio, tocou, 1000, 'começou agora, no relógio do servidor');
  perto(recebido.agora, Date.now(), 1000, 'o relógio do servidor vai junto');
  assert.equal(musica.playlistId, undefined, 'o jogador não recebe a fila nem o id da playlist');
  assert.equal(musica.fila, undefined);
  assert.equal(recebido.playlists, undefined);
  const arquivo = await fetch(`${m.mesa.url.replace('localhost', '127.0.0.1')}${musica.faixa.url}`, { headers: { Cookie: ana.cookie } });
  assert.equal(arquivo.status, 200, 'o jogador baixa a música que toca');
  assert.equal(arquivo.headers.get('content-type'), 'audio/mpeg');
  assert.equal((await audioDe(m)).canais.musica.fila, 1, 'o mestre vê quantas faltam na fila');

  // O volume da faixa muda para todos na hora.
  visao.limpar();
  await m.op('audio.faixa.editar', { faixa: wushu, volume: 0.35, nome: 'Wushu Dolls (OST)' });
  const mudou = await visao.esperar(item => item.evento === 'audio');
  assert.equal(mudou.data.canais.musica.faixa.volume, 0.35);
  assert.equal(mudou.data.canais.musica.faixa.nome, 'Wushu Dolls (OST)');
});

test('áudio: pausar, continuar, ir, a fila, o fim repetido e a playlist que repete', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const fundo = await playlist(m, 'Fundo');
  const [a, b, c] = await faixas(m, fundo, [{ youtube: 'aaaaaaaaaaa', nome: 'A' }, { youtube: 'bbbbbbbbbbb', nome: 'B' }, { youtube: 'ccccccccccc', nome: 'C' }]);
  await m.op('audio.tocar', { faixa: b });
  let canal = (await audioDe(m)).canais.musica;
  assert.equal(canal.faixa.id, b);
  assert.equal(canal.fila, 1, 'em ordem: depois do B, só o C');

  await sleep(150);
  await m.op('audio.pausar', { canal: 'musica' });
  canal = (await audioDe(m)).canais.musica;
  perto(canal.pausa, 0.15, 0.1, 'pausou onde estava');
  const pausa = canal.pausa;
  await sleep(150);
  await m.op('audio.continuar', { canal: 'musica' });
  canal = (await audioDe(m)).canais.musica;
  assert.equal(canal.pausa, null);
  perto((Date.now() - canal.inicio) / 1000, pausa, 0.1, 'continua de onde parou (o tempo pausado não conta)');
  await m.op('audio.ir', { canal: 'musica', posicao: 30 });
  perto((Date.now() - (await audioDe(m)).canais.musica.inicio) / 1000, 30, 0.2, 'foi para os 30 segundos');
  assert.equal((await m.op('audio.ir', { canal: 'outro', posicao: 3 })).status, 400);

  // O fim: só vale para a faixa e o início que tocam. O segundo aviso (outra aba do mestre) não pula outra.
  const inicioB = (await audioDe(m)).canais.musica.inicio;
  assert.equal((await m.op('audio.fim', { canal: 'musica', faixa: b, inicio: inicioB }, ana.cookie)).status, 403, 'o jogador não pula a música');
  await m.op('audio.fim', { canal: 'musica', faixa: b, inicio: inicioB - 1 });
  assert.equal((await audioDe(m)).canais.musica.faixa.id, b, 'outro início: nada muda');
  await m.op('audio.fim', { canal: 'musica', faixa: b, inicio: inicioB });
  assert.equal((await audioDe(m)).canais.musica.faixa.id, c);
  await m.op('audio.fim', { canal: 'musica', faixa: b, inicio: inicioB });
  assert.equal((await audioDe(m)).canais.musica.faixa.id, c, 'o aviso repetido não pula o C');
  const inicioC = (await audioDe(m)).canais.musica.inicio;
  await m.op('audio.fim', { canal: 'musica', faixa: c, inicio: inicioC });
  assert.equal((await audioDe(m)).canais.musica, null, 'em ordem, sem repetir: acabou a playlist, para');

  // Repetindo: depois do C, volta ao A.
  await m.op('audio.playlist.editar', { playlist: fundo, repetir: true });
  await m.op('audio.tocar', { faixa: c });
  await m.op('audio.proxima', { canal: 'musica' });
  assert.equal((await audioDe(m)).canais.musica.faixa.id, a);

  // Aleatória: as três tocam uma vez cada (a fila embaralhada), e na volta a última não repete logo em seguida. Os
  // dados: o primeiro embaralhar dá B, C, A; o da volta não troca nada (A, B, C), e o A acabou de tocar.
  await m.op('audio.playlist.editar', { playlist: fundo, modo: 'aleatorio' });
  m.fila.push(1, 1, 3, 2);
  await m.op('audio.tocar', { playlist: fundo });
  const tocadas = [];
  for (let i = 0; i < 3; i += 1) {
    const atual = (await audioDe(m)).canais.musica;
    tocadas.push(atual.faixa.id);
    await m.op('audio.fim', { canal: 'musica', faixa: atual.faixa.id, inicio: atual.inicio });
  }
  assert.deepEqual(tocadas, [b, c, a], 'as três, cada uma uma vez, na ordem que os dados deram');
  assert.notEqual((await audioDe(m)).canais.musica.faixa.id, tocadas[2], 'a que acabou de tocar não volta em seguida');
  // Uma música escolhida na aleatória: as outras duas, embaralhadas, vêm depois (em ordem, depois do C não viria nada).
  m.fila.push(1);
  await m.op('audio.tocar', { faixa: c });
  assert.equal((await audioDe(m)).canais.musica.fila, 2);
  assert.equal((await m.op('audio.parar', { canal: 'musica' })).status, 200);
  assert.equal((await audioDe(m)).canais.musica, null);
});

test('a música da cena toca quando a cena abre; o que some do áudio para de tocar', async t => {
  const m = await montar(t);
  const ana = await m.jogador('Ana', fichaJax);
  const beco = (await m.op('cena.criar', { nome: 'Beco', largura: 1000, altura: 1000 })).json.resultado.cena;
  const clinica = (await m.op('cena.criar', { nome: 'Clínica', largura: 1000, altura: 1000 })).json.resultado.cena;
  const chuva = await playlist(m, 'Chuva', { canal: 'ambiente' });
  const [garoa, tempestade] = await faixas(m, chuva, [{ youtube: 'ggggggggggg', nome: 'Garoa', repetir: true }, { youtube: 'ttttttttttt', nome: 'Tempestade' }]);
  const trilha = await playlist(m, 'Trilha');
  const [tema] = await faixas(m, trilha, [{ youtube: 'mmmmmmmmmmm', nome: 'Tema' }]);

  assert.equal((await m.op('cena.editar', { cena: clinica, musica: { playlist: chuva, faixa: tema } })).status, 404, 'a faixa tem que ser da playlist');
  assert.equal((await m.op('cena.editar', { cena: clinica, musica: { playlist: chuva, faixa: garoa } })).status, 200);
  await m.op('cena.editar', { cena: beco, musica: { playlist: trilha } });
  await m.op('audio.tocar', { faixa: tema });
  const temaAntes = (await audioDe(m)).canais.musica.inicio;

  const visao = await m.ouvir(ana.cookie);
  await m.op('cena.ativar', { cena: clinica });
  assert.ok(await visao.esperar(item => item.evento === 'audio' && item.data.canais.ambiente && item.data.canais.ambiente.faixa.nome === 'Garoa'), 'o jogador ouve a garoa ao abrir a cena');
  const estado = (await m.pedir('/api/mesa/estado')).json;
  assert.deepEqual(estado.cena.musica, { playlist: chuva, faixa: garoa }, 'o mestre vê a música da cena');
  assert.equal(estado.audio.canais.ambiente.faixa.id, garoa, 'abrir a cena toca a garoa, no canal de ambiente');
  assert.equal(estado.audio.canais.musica.inicio, temaAntes, 'a música de outro canal continua');
  assert.equal((await m.pedir('/api/mesa/estado', { cookie: ana.cookie })).json.cena.musica, undefined, 'o jogador não sabe qual música a cena tem');
  const garoaInicio = estado.audio.canais.ambiente.inicio;
  await sleep(20);
  await m.op('cena.ativar', { cena: clinica });
  assert.equal((await audioDe(m)).canais.ambiente.inicio, garoaInicio, 'abrir de novo não recomeça');
  await m.op('cena.ativar', { cena: beco });
  assert.equal((await audioDe(m)).canais.musica.inicio, temaAntes, 'a playlist da cena já está tocando: segue');

  // A playlist muda de canal: o que tocava vai junto.
  await m.op('audio.playlist.editar', { playlist: chuva, canal: 'musica' });
  let audio = await audioDe(m);
  assert.equal(audio.canais.ambiente, null);
  assert.equal(audio.canais.musica.faixa.id, garoa);
  // A faixa que sai para de tocar e sai da cena.
  await m.op('audio.faixa.apagar', { faixa: garoa });
  audio = await audioDe(m);
  assert.equal(audio.canais.musica, null);
  await m.op('audio.proxima', { canal: 'musica' });
  assert.equal((await audioDe(m)).canais.musica, null, 'a música apagada não deixa a fila dela tocando');
  assert.deepEqual((await m.pedir('/api/mesa/estado')).json.cena.musica, { playlist: trilha, faixa: null }, 'o beco continua com a trilha');
  await m.op('cena.ativar', { cena: clinica });
  assert.equal((await m.pedir('/api/mesa/estado')).json.cena.musica, null, 'a clínica perdeu a garoa');
  await m.op('cena.editar', { cena: clinica, musica: { playlist: chuva } });
  await m.op('audio.tocar', { faixa: tempestade });
  await m.op('audio.playlist.apagar', { playlist: chuva });
  audio = await audioDe(m);
  assert.equal(audio.canais.musica, null, 'a playlist que sai para de tocar');
  assert.equal((await m.pedir('/api/mesa/estado')).json.cena.musica, null, 'e sai da cena');
  assert.deepEqual(audio.playlists.map(item => item.nome), ['Trilha']);
});

test('importar as playlists do Foundry: a mesma duas vezes só com substituir, e as faixas mantêm o id', async t => {
  const m = await montar(t);
  const mp3 = (await m.pedir('/api/mesa/midia', { method: 'POST', body: MP3, type: 'audio/mpeg' })).json.midia;
  const playlist = {
    nome: 'Intro', canal: 'musica', modo: 'sequencia', origem: { mundo: 'edgerunners-storys', id: 'plIntro' },
    faixas: [{ nome: 'Intro hyper', midia: mp3, volume: 0.1, repetir: true, origem: 'somHyper' }, { nome: 'Sem arquivo', midia: '', origem: 'somFalta' }, { nome: 'Storm II', youtube: 'uuMXysKmoYM', origem: 'uuMXysKmoYM' }]
  };
  const feita = await m.op('audio.importar', { playlist });
  assert.equal(feita.status, 200, feita.text);
  const { resultado } = feita.json;
  assert.equal(resultado.total, 2, 'a música sem arquivo fica de fora');
  assert.deepEqual(Object.keys(resultado.faixas).sort(), ['somHyper', 'uuMXysKmoYM']);
  assert.equal((await m.op('audio.importar', { playlist })).status, 409, 'a mesma playlist do mesmo mundo duas vezes, não');
  const outra = await m.op('audio.importar', { playlist: { ...playlist, nome: 'Intro (nova)' }, substituir: true });
  assert.equal(outra.status, 200);
  assert.deepEqual(outra.json.resultado, resultado, 'com substituir, troca e mantém os ids');
  const audio = await audioDe(m);
  assert.deepEqual(audio.playlists.map(item => [item.nome, item.origem, item.faixas.map(faixa => [faixa.nome, faixa.origem, faixa.repetir, faixa.volume])]),
    [['Intro (nova)', { mundo: 'edgerunners-storys', id: 'plIntro' }, [['Intro hyper', 'somHyper', true, 0.1], ['Storm II', 'uuMXysKmoYM', false, 0.5]]]]);

  // A cena importada com a música da playlist importada; música que não existe fica de fora.
  const cena = { nome: 'Intro', largura: 1920, altura: 1080, grade: { tamanho: 100 }, origem: { mundo: 'edgerunners-storys', id: 'cenaIntro' }, musica: { playlist: resultado.playlist, faixa: resultado.faixas.somHyper } };
  const importada = (await m.op('cena.importar', { cena })).json.resultado.cena;
  const semMusica = (await m.op('cena.importar', { cena: { ...cena, origem: { mundo: 'edgerunners-storys', id: 'outra' }, musica: { playlist: 'naoexiste' } } })).json.resultado.cena;
  await m.op('cena.ativar', { cena: semMusica });
  assert.equal((await audioDe(m)).canais.musica, null);
  await m.op('cena.ativar', { cena: importada });
  assert.equal((await audioDe(m)).canais.musica.faixa.nome, 'Intro hyper', 'abrir a cena importada toca a música dela');
  // Importada de novo noutro canal: o que tocava dela no canal antigo para.
  await m.op('audio.importar', { playlist: { ...playlist, canal: 'ambiente' }, substituir: true });
  assert.deepEqual((await audioDe(m)).canais, { musica: null, ambiente: null });
  assert.equal((await m.op('audio.importar', { playlist }, (await m.jogador('Ana', fichaJax)).cookie)).status, 403);
});
