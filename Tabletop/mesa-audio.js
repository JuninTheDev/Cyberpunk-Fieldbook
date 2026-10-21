// O áudio na mesa da wiki: as playlists do mestre (músicas enviadas e vídeos do YouTube) e o que toca agora em dois
// canais, a música e o ambiente, como as playlists do Foundry e o yt-jukebox que o mundo usa:
//   · o servidor guarda só o que toca e desde quando (o início, no relógio do servidor). Cada navegador toca sozinho e
//     acerta a posição pelo relógio: quem entra no meio da música ouve do mesmo ponto que os outros;
//   · o volume da faixa é do mestre; o de cada canal, de cada pessoa (fica no navegador dela);
//   · a música acabou: o navegador do mestre avisa (audio.fim) e o servidor passa para a próxima da fila. O aviso
//     repetido (duas abas do mestre) não pula duas, porque leva a faixa e o início que acabaram;
//   · o jogador só recebe o que toca agora: a biblioteca fica com o mestre.
//
// Uma cena pode ter música (no Foundry, a playlist da cena): abrir a cena toca.
'use strict';

const CANAIS = ['musica', 'ambiente'];
const MAX_PLAYLISTS = 60;
const MAX_FAIXAS = 300;
const AUDIO_FILE = /^[a-f0-9]{40}\.(mp3|ogg|m4a|wav|flac|webm)$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
// Volume que a faixa nova recebe: o meio do controle (o do yt-jukebox, 40 de 100, com o volume de cada um em 80%).
const VOLUME_PADRAO = 0.5;

// O vídeo de um link do YouTube (watch?v=, youtu.be/, /embed/, /shorts/, /live/, music.youtube.com) ou o id puro.
function youtubeId(texto) {
  const valor = String(texto || '').trim();
  if (YOUTUBE_ID.test(valor)) return valor;
  let url;
  try { url = new URL(/^[a-z]+:\/\//i.test(valor) ? valor : `https://${valor}`); } catch { return ''; }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/) || [])[1] || '';
  }
  return YOUTUBE_ID.test(id) ? id : '';
}

// O título pelo oEmbed do YouTube (público, sem chave). Sem resposta em 6 segundos, fica o id.
async function tituloDoYoutube(id) {
  const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) return '';
  const data = await response.json();
  return typeof data.title === 'string' ? data.title : '';
}

module.exports = function createAudio(ctx) {
  const { newId, fail, int, line, real, isGm, mediaUrl, mediaExists, random, tableOf, save, broadcast } = ctx;
  const buscarTitulo = ctx.buscarTitulo || tituloDoYoutube;

  const audioDe = state => {
    if (!state.audio || typeof state.audio !== 'object') state.audio = {};
    if (!Array.isArray(state.audio.playlists)) state.audio.playlists = [];
    if (!state.audio.canais || typeof state.audio.canais !== 'object') state.audio.canais = {};
    for (const canal of CANAIS) if (state.audio.canais[canal] === undefined) state.audio.canais[canal] = null;
    return state.audio;
  };
  const playlistDe = (audio, id) => audio.playlists.find(item => item.id === String(id || '')) || null;
  function faixaArg(audio, id) {
    for (const playlist of audio.playlists) {
      const faixa = playlist.faixas.find(item => item.id === String(id || ''));
      if (faixa) return { playlist, faixa };
    }
    throw fail(404, 'Faixa não encontrada.');
  }
  function playlistArg(audio, id) {
    const playlist = playlistDe(audio, id);
    if (!playlist) throw fail(404, 'Playlist não encontrada.');
    return playlist;
  }
  const canalArg = value => {
    if (!CANAIS.includes(value)) throw fail(400, 'Canal desconhecido (música ou ambiente).');
    return value;
  };
  const cleanCanal = value => (value === 'ambiente' ? 'ambiente' : 'musica');
  const cleanModo = value => (value === 'aleatorio' ? 'aleatorio' : 'sequencia');
  const nivel = (value, fallback) => Math.round(real(value, 0, 1, fallback) * 100) / 100;

  // Uma faixa: arquivo da mesa (MP3, OGG, M4A, WAV, FLAC) ou vídeo do YouTube (o link ou o id). semNome: o YouTube
  // ainda vai dar o título.
  function cleanFaixa(campaignId, input, { estrito = true } = {}) {
    const youtube = input.youtube ? youtubeId(input.youtube) : '';
    const midia = String(input.midia || '');
    if (!youtube && !(AUDIO_FILE.test(midia) && mediaExists(campaignId, midia))) {
      if (!estrito) return null;
      throw fail(400, input.youtube ? 'Esse link não é de um vídeo do YouTube.' : 'Música não encontrada: envie de novo.');
    }
    const nome = line(input.nome, 120);
    return {
      id: newId(), nome: nome || (youtube || 'Música'), ...(youtube ? { youtube } : { midia }),
      volume: nivel(input.volume, VOLUME_PADRAO), repetir: Boolean(input.repetir), ...(youtube && !nome ? { semNome: true } : {})
    };
  }

  // ---------------- O que toca ----------------
  function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = random(i + 1);
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }
  // Depois desta faixa: em ordem, as que vêm depois dela; aleatória, as outras embaralhadas.
  function filaDepois(playlist, faixa) {
    if (playlist.modo === 'aleatorio') return embaralhar(playlist.faixas.filter(item => item !== faixa).map(item => item.id));
    return playlist.faixas.slice(playlist.faixas.indexOf(faixa) + 1).map(item => item.id);
  }
  function tocar(audio, playlist, faixa, { posicao = 0, fila } = {}) {
    audio.canais[playlist.canal] = { playlist: playlist.id, faixa: faixa.id, inicio: Date.now() - Math.round(posicao * 1000), pausa: null, fila: fila || filaDepois(playlist, faixa) };
  }
  // A playlist inteira: em ordem, da primeira; aleatória, de qualquer uma.
  function tocarPlaylist(audio, playlist) {
    if (!playlist.faixas.length) throw fail(400, 'Essa playlist está vazia.');
    const ordem = playlist.modo === 'aleatorio' ? embaralhar(playlist.faixas.map(item => item.id)) : playlist.faixas.map(item => item.id);
    tocar(audio, playlist, playlist.faixas.find(item => item.id === ordem[0]), { fila: ordem.slice(1) });
  }
  // A próxima da fila. Acabou a fila: a playlist que repete começa de novo; a que não repete para.
  function proxima(audio, canal) {
    const atual = audio.canais[canal];
    const playlist = atual && playlistDe(audio, atual.playlist);
    if (!playlist) { audio.canais[canal] = null; return; }
    let fila = atual.fila.filter(id => playlist.faixas.some(item => item.id === id));
    if (!fila.length && playlist.repetir && playlist.faixas.length) {
      fila = playlist.modo === 'aleatorio' ? embaralhar(playlist.faixas.map(item => item.id)) : playlist.faixas.map(item => item.id);
      // Na aleatória, a que acabou de tocar não volta logo em seguida.
      if (fila.length > 1 && fila[0] === atual.faixa) fila.push(fila.shift());
    }
    if (!fila.length) { audio.canais[canal] = null; return; }
    const [id, ...resto] = fila;
    tocar(audio, playlist, playlist.faixas.find(item => item.id === id), { fila: resto });
  }
  const posicaoDe = atual => (atual.pausa !== null ? atual.pausa : Math.max(0, (Date.now() - atual.inicio) / 1000));
  // Faixa ou playlist que saiu: o canal que tocava dela para.
  function pararOQueSumiu(audio) {
    for (const canal of CANAIS) {
      const atual = audio.canais[canal];
      const playlist = atual && playlistDe(audio, atual.playlist);
      if (atual && (!playlist || !playlist.faixas.some(item => item.id === atual.faixa) || playlist.canal !== canal)) audio.canais[canal] = null;
    }
  }

  // ---------------- O que cada um recebe ----------------
  // A origem (o id no Foundry ou no YouTube) só para o mestre: o importador acha por ela o que já importou.
  const faixaView = (viewer, campaignId, faixa) => ({
    id: faixa.id, nome: faixa.nome, volume: faixa.volume, repetir: faixa.repetir,
    ...(faixa.youtube ? { youtube: faixa.youtube } : { url: mediaUrl(viewer, campaignId, faixa.midia) }),
    ...(isGm(viewer) && faixa.origem ? { origem: faixa.origem } : {})
  });
  // agora: o relógio do servidor, para o navegador acertar a posição. O mestre recebe as playlists.
  function audioFor(viewer, state, campaignId) {
    const audio = audioDe(state);
    const gm = isGm(viewer);
    const canais = {};
    for (const canal of CANAIS) {
      const atual = audio.canais[canal];
      const playlist = atual && playlistDe(audio, atual.playlist);
      const faixa = playlist && playlist.faixas.find(item => item.id === atual.faixa);
      canais[canal] = faixa ? {
        faixa: faixaView(viewer, campaignId, faixa), playlist: playlist.nome, inicio: atual.inicio, pausa: atual.pausa,
        ...(gm ? { playlistId: playlist.id, fila: atual.fila.length } : {})
      } : null;
    }
    return {
      agora: Date.now(), canais,
      ...(gm ? { playlists: audio.playlists.map(playlist => ({ id: playlist.id, nome: playlist.nome, canal: playlist.canal, modo: playlist.modo, repetir: playlist.repetir, origem: playlist.origem || null, faixas: playlist.faixas.map(faixa => faixaView(viewer, campaignId, faixa)) })) } : {})
    };
  }

  // ---------------- A música da cena ----------------
  // { playlist, faixa }: a faixa, ou a playlist inteira (sem faixa). null tira.
  function musicaArg(state, input) {
    if (!input) return null;
    const audio = audioDe(state);
    const playlist = playlistArg(audio, input.playlist);
    if (!input.faixa) return { playlist: playlist.id, faixa: null };
    const faixa = playlist.faixas.find(item => item.id === String(input.faixa));
    if (!faixa) throw fail(404, 'Faixa não encontrada nessa playlist.');
    return { playlist: playlist.id, faixa: faixa.id };
  }
  // Abrir a cena toca a música dela. O que já toca dela continua de onde está (abrir de novo não recomeça).
  function aoAbrirCena(state, scene) {
    if (!scene.musica) return false;
    const audio = audioDe(state);
    const playlist = playlistDe(audio, scene.musica.playlist);
    const faixa = playlist && scene.musica.faixa ? playlist.faixas.find(item => item.id === scene.musica.faixa) : null;
    if (!playlist || !playlist.faixas.length || (scene.musica.faixa && !faixa)) return false;
    const atual = audio.canais[playlist.canal];
    if (atual && atual.pausa === null && atual.playlist === playlist.id && (!faixa || atual.faixa === faixa.id)) return false;
    if (faixa) tocar(audio, playlist, faixa); else tocarPlaylist(audio, playlist);
    return true;
  }

  // ---------------- Os títulos do YouTube ----------------
  // O link colado vira faixa na hora (com o id no nome); o título chega depois, três de cada vez.
  const titulos = [];
  let buscando = 0;
  function pedirTitulos(campaignId, faixas) {
    for (const faixa of faixas) if (faixa.semNome) titulos.push({ campaignId, id: faixa.id, youtube: faixa.youtube });
    while (buscando < 3 && titulos.length) {
      const pedido = titulos.shift();
      buscando += 1;
      buscarTitulo(pedido.youtube).catch(() => '').then(titulo => {
        buscando -= 1;
        const table = tableOf(pedido.campaignId);
        const audio = audioDe(table.state);
        const achada = audio.playlists.flatMap(playlist => playlist.faixas).find(item => item.id === pedido.id);
        if (achada && achada.semNome) {
          delete achada.semNome;
          if (titulo) {
            achada.nome = line(titulo, 120);
            save(table);
            broadcast(pedido.campaignId, { audio: true });
          }
        }
        pedirTitulos(pedido.campaignId, []);
      });
    }
  }

  // ---------------- Operações (todas do mestre) ----------------
  const operations = {
    'audio.playlist.criar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      if (audio.playlists.length >= MAX_PLAYLISTS) throw fail(400, `Até ${MAX_PLAYLISTS} playlists.`);
      const playlist = { id: newId(), nome: line(body.nome, 60) || 'Playlist', canal: cleanCanal(body.canal), modo: cleanModo(body.modo), repetir: Boolean(body.repetir), faixas: [] };
      audio.playlists.push(playlist);
      return { audio: true, resultado: { playlist: playlist.id } };
    } },
    'audio.playlist.editar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      const playlist = playlistArg(audio, body.playlist);
      if (body.nome !== undefined) playlist.nome = line(body.nome, 60) || playlist.nome;
      if (body.modo !== undefined) playlist.modo = cleanModo(body.modo);
      if (body.repetir !== undefined) playlist.repetir = Boolean(body.repetir);
      // Trocar o canal: o que tocava dela muda de canal junto.
      if (body.canal !== undefined && cleanCanal(body.canal) !== playlist.canal) {
        const antes = playlist.canal;
        const tocava = audio.canais[antes] && audio.canais[antes].playlist === playlist.id ? audio.canais[antes] : null;
        playlist.canal = cleanCanal(body.canal);
        if (tocava) { audio.canais[antes] = null; audio.canais[playlist.canal] = tocava; }
      }
      return { audio: true };
    } },
    'audio.playlist.apagar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      const playlist = playlistArg(audio, body.playlist);
      audio.playlists = audio.playlists.filter(item => item !== playlist);
      for (const scene of state.cenas) if (scene.musica && scene.musica.playlist === playlist.id) scene.musica = null;
      pararOQueSumiu(audio);
      return { audio: true, cenas: true };
    } },
    // Uma faixa ou várias (a playlist do YouTube que o navegador do mestre abriu): { playlist, faixas: [...] }.
    'audio.faixa.criar': { mestre: true, run({ state, body, campaignId }) {
      const audio = audioDe(state);
      const playlist = playlistArg(audio, body.playlist);
      const entrada = Array.isArray(body.faixas) ? body.faixas : [body];
      if (playlist.faixas.length + entrada.length > MAX_FAIXAS) throw fail(400, `Até ${MAX_FAIXAS} músicas por playlist.`);
      const novas = entrada.map(item => cleanFaixa(campaignId, item && typeof item === 'object' ? item : {}));
      playlist.faixas.push(...novas);
      pedirTitulos(campaignId, novas);
      return { audio: true, resultado: { faixas: novas.map(faixa => faixa.id) } };
    } },
    'audio.faixa.editar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      const { playlist, faixa } = faixaArg(audio, body.faixa);
      if (body.nome !== undefined) { faixa.nome = line(body.nome, 120) || faixa.nome; delete faixa.semNome; }
      if (body.volume !== undefined) faixa.volume = nivel(body.volume, faixa.volume);
      if (body.repetir !== undefined) faixa.repetir = Boolean(body.repetir);
      // Mudar de lugar: para outra playlist (no fim) ou para cima e para baixo na mesma.
      if (body.playlist !== undefined && String(body.playlist) !== playlist.id) {
        const destino = playlistArg(audio, body.playlist);
        if (destino.faixas.length >= MAX_FAIXAS) throw fail(400, `Até ${MAX_FAIXAS} músicas por playlist.`);
        playlist.faixas = playlist.faixas.filter(item => item !== faixa);
        destino.faixas.push(faixa);
        for (const scene of state.cenas) if (scene.musica && scene.musica.faixa === faixa.id) scene.musica = null;
        pararOQueSumiu(audio);
      } else if (body.mover === 'cima' || body.mover === 'baixo') {
        const i = playlist.faixas.indexOf(faixa);
        const j = body.mover === 'cima' ? i - 1 : i + 1;
        if (j >= 0 && j < playlist.faixas.length) [playlist.faixas[i], playlist.faixas[j]] = [playlist.faixas[j], playlist.faixas[i]];
      }
      return { audio: true };
    } },
    'audio.faixa.apagar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      const { playlist, faixa } = faixaArg(audio, body.faixa);
      playlist.faixas = playlist.faixas.filter(item => item !== faixa);
      for (const scene of state.cenas) if (scene.musica && scene.musica.faixa === faixa.id) scene.musica = null;
      pararOQueSumiu(audio);
      return { audio: true, cenas: true };
    } },

    // { faixa } toca a faixa (e a fila segue a playlist dela); { playlist } toca a playlist inteira. Toca no canal da
    // playlist, no lugar do que tocava nele.
    'audio.tocar': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      if (body.faixa) {
        const { playlist, faixa } = faixaArg(audio, body.faixa);
        tocar(audio, playlist, faixa, { posicao: real(body.posicao, 0, 86400, 0) });
      } else {
        tocarPlaylist(audio, playlistArg(audio, body.playlist));
      }
      return { audio: true };
    } },
    'audio.pausar': { mestre: true, run({ state, body }) {
      const atual = audioDe(state).canais[canalArg(body.canal)];
      if (!atual) throw fail(400, 'Nada tocando nesse canal.');
      if (atual.pausa === null) atual.pausa = Math.round(posicaoDe(atual) * 1000) / 1000;
      return { audio: true };
    } },
    'audio.continuar': { mestre: true, run({ state, body }) {
      const atual = audioDe(state).canais[canalArg(body.canal)];
      if (!atual) throw fail(400, 'Nada tocando nesse canal.');
      if (atual.pausa !== null) { atual.inicio = Date.now() - Math.round(atual.pausa * 1000); atual.pausa = null; }
      return { audio: true };
    } },
    // Ir para um ponto da música (em segundos).
    'audio.ir': { mestre: true, run({ state, body }) {
      const atual = audioDe(state).canais[canalArg(body.canal)];
      if (!atual) throw fail(400, 'Nada tocando nesse canal.');
      const posicao = real(body.posicao, 0, 86400, 0);
      if (atual.pausa !== null) atual.pausa = posicao; else atual.inicio = Date.now() - Math.round(posicao * 1000);
      return { audio: true };
    } },
    'audio.parar': { mestre: true, run({ state, body }) {
      audioDe(state).canais[canalArg(body.canal)] = null;
      return { audio: true };
    } },
    'audio.proxima': { mestre: true, run({ state, body }) {
      proxima(audioDe(state), canalArg(body.canal));
      return { audio: true };
    } },
    // O navegador do mestre viu a música acabar. Só vale para a faixa e o início que estão tocando: o segundo aviso
    // (outra aba do mestre) chega atrasado e não pula outra.
    'audio.fim': { mestre: true, run({ state, body }) {
      const audio = audioDe(state);
      const canal = canalArg(body.canal);
      const atual = audio.canais[canal];
      if (!atual || atual.faixa !== String(body.faixa || '') || atual.inicio !== Number(body.inicio) || atual.pausa !== null) return {};
      proxima(audio, canal);
      return { audio: true };
    } },

    // Uma playlist inteira de uma vez (o importador do Foundry: as playlists e a biblioteca do yt-jukebox). A mesma do
    // mesmo mundo duas vezes só com substituir; as faixas que já vieram antes mantêm o id (a música da cena aponta
    // para elas). resultado.faixas: o id de cada faixa pela origem dela.
    'audio.importar': { mestre: true, run({ state, body, campaignId }) {
      const audio = audioDe(state);
      const input = body.playlist && typeof body.playlist === 'object' ? body.playlist : {};
      const origem = input.origem && typeof input.origem === 'object' && input.origem.id ? { mundo: line(input.origem.mundo, 80), id: line(input.origem.id, 60) } : null;
      const anterior = origem ? audio.playlists.find(item => item.origem && item.origem.id === origem.id && item.origem.mundo === origem.mundo) : null;
      if (anterior && !body.substituir) throw fail(409, `A playlist "${anterior.nome}" já foi importada deste mundo.`);
      if (!anterior && audio.playlists.length >= MAX_PLAYLISTS) throw fail(400, `Até ${MAX_PLAYLISTS} playlists.`);
      const playlist = { id: anterior ? anterior.id : newId(), nome: line(input.nome, 60) || 'Playlist', canal: cleanCanal(input.canal), modo: cleanModo(input.modo), repetir: Boolean(input.repetir), faixas: [], origem };
      const porOrigem = {};
      for (const item of (Array.isArray(input.faixas) ? input.faixas : []).slice(0, MAX_FAIXAS)) {
        const faixa = item && typeof item === 'object' ? cleanFaixa(campaignId, item, { estrito: false }) : null;
        if (!faixa) continue;
        const de = line(item.origem, 60);
        const antiga = de && anterior ? anterior.faixas.find(velha => velha.origem === de) : null;
        if (antiga) faixa.id = antiga.id;
        if (de) { faixa.origem = de; porOrigem[de] = faixa.id; }
        playlist.faixas.push(faixa);
      }
      if (anterior) audio.playlists[audio.playlists.indexOf(anterior)] = playlist; else audio.playlists.push(playlist);
      pararOQueSumiu(audio);
      pedirTitulos(campaignId, playlist.faixas);
      return { audio: true, resultado: { playlist: playlist.id, faixas: porOrigem, total: playlist.faixas.length } };
    } }
  };

  return { operations, audioFor, musicaArg, aoAbrirCena, audioDe };
};
module.exports.youtubeId = youtubeId;
module.exports.AUDIO_FILE = AUDIO_FILE;
