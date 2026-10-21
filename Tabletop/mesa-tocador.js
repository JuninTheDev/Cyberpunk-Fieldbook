// O tocador da mesa, no navegador: toca o que o servidor diz que toca agora nos dois canais (a música e o ambiente) e
// acerta a posição pelo relógio do servidor, como o yt-jukebox: quem entra no meio ouve do mesmo ponto que os outros.
//   · arquivo (MP3, OGG…): num <audio>;
//   · vídeo do YouTube: no player do YouTube (a API de iframe, pelo youtube-nocookie), no quadro do canto da tela;
//   · o volume de cada canal é de quem ouve; o da faixa, do mestre;
//   · o navegador só deixa tocar som depois que a pessoa clica na página: até lá, o tocador fica "bloqueado" e a página
//     mostra o botão de ligar o som.
// Nada aqui decide o que toca: a música acabou, o tocador avisa (aoTerminar), e a página do mestre pede a próxima.
(() => {
  'use strict';
  const CANAIS = ['musica', 'ambiente'];
  // O nível do controle (0 a 1) vira ganho como no Foundry (o nível elevado a 1,5): o meio do controle soa como o meio.
  const ganho = nivel => Math.min(1, Math.max(0, nivel)) ** 1.5;
  // Quanto a posição pode escorregar antes de o tocador corrigir, em segundos (o YouTube demora mais para pular).
  const FOLGA = { arquivo: 1.5, youtube: 2.5 };
  // Os estados do player do YouTube (YT.PlayerState).
  const YT_FIM = 0;
  const YT_TOCANDO = 1;
  const YT_CARREGANDO = 3;
  // Os erros do YouTube que são do vídeo (não existe, ou o dono não deixa tocar fora do YouTube): pular é o certo.
  const ERROS_DO_VIDEO = { 100: 'Esse vídeo do YouTube não existe mais (ou é privado).', 101: 'O dono desse vídeo não deixa tocar fora do YouTube.', 150: 'O dono desse vídeo não deixa tocar fora do YouTube.' };

  let api = null;
  function carregarYoutube() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (!api) {
      api = new Promise((resolve, reject) => {
        const anterior = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { try { if (anterior) anterior(); } catch { /* do outro */ } resolve(window.YT); };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => { api = null; reject(new Error('O YouTube não carregou (sem internet?).')); };
        document.head.append(script);
        setTimeout(() => { if (!(window.YT && window.YT.Player)) { api = null; reject(new Error('O YouTube não respondeu.')); } }, 20000);
      });
    }
    return api;
  }

  // caixa: o quadro do YouTube (com um [data-canal] para cada canal). aoTerminar(canal, alvo) e aoErro(canal, alvo,
  // texto): a página decide o que fazer. aoMudar(): algo que a página mostra mudou (bloqueado, duração).
  function criar({ caixa, aoTerminar = () => {}, aoErro = () => {}, aoMudar = () => {} }) {
    let desvio = 0;
    let bloqueado = false;
    const canais = {};
    for (const nome of CANAIS) canais[nome] = { nome, alvo: null, nivel: 0.8, fonte: null, chave: '', audio: null, yt: null, ytPronto: null, avisado: '', conferir: null };

    const agora = () => Date.now() + desvio;
    const pausado = alvo => alvo.pausa !== null && alvo.pausa !== undefined;
    function duracaoDe(c) {
      if (c.fonte === 'arquivo' && c.audio && Number.isFinite(c.audio.duration)) return c.audio.duration;
      if (c.fonte === 'youtube' && c.yt && c.yt.getDuration && c.chave) return c.yt.getDuration() || 0;
      return 0;
    }
    // Onde a música deveria estar agora (a que repete dá a volta).
    function posicaoAlvo(c) {
      const alvo = c.alvo;
      if (!alvo) return 0;
      let posicao = pausado(alvo) ? alvo.pausa : Math.max(0, (agora() - alvo.inicio) / 1000);
      const duracao = duracaoDe(c);
      if (alvo.faixa.repetir && duracao > 0) posicao %= duracao;
      return posicao;
    }
    function mudarBloqueio(valor) {
      if (bloqueado === valor) return;
      bloqueado = valor;
      aoMudar();
    }
    // A música acabou: avisa uma vez por faixa e início.
    function terminou(c) {
      const marca = c.alvo ? `${c.alvo.faixa.id}@${c.alvo.inicio}` : '';
      if (!marca || c.avisado === marca) return;
      c.avisado = marca;
      aoTerminar(c.nome, c.alvo);
    }
    const volumeDe = c => Math.min(1, (c.alvo ? c.alvo.faixa.volume : 0) * c.nivel);

    // ---------------- Arquivo ----------------
    function elementoDe(c) {
      if (c.audio) return c.audio;
      const el = new Audio();
      el.preload = 'auto';
      el.addEventListener('loadedmetadata', () => { acertarArquivo(c); aoMudar(); });
      el.addEventListener('ended', () => { if (c.fonte === 'arquivo' && c.alvo && !c.alvo.faixa.repetir) terminou(c); });
      el.addEventListener('playing', () => mudarBloqueio(false));
      el.addEventListener('error', () => { if (c.fonte === 'arquivo' && c.alvo && el.getAttribute('src')) aoErro(c.nome, c.alvo, `A música "${c.alvo.faixa.nome}" não abriu.`); });
      c.audio = el;
      return el;
    }
    function tocarArquivo(c) {
      const faixa = c.alvo.faixa;
      const el = elementoDe(c);
      const chave = `arquivo:${faixa.id}:${faixa.url}`;
      if (c.chave !== chave) { c.chave = chave; el.src = faixa.url; }
      el.loop = Boolean(faixa.repetir);
      el.volume = ganho(volumeDe(c));
      acertarArquivo(c);
    }
    function acertarArquivo(c) {
      const el = c.audio;
      const alvo = c.alvo;
      if (!el || !alvo || c.fonte !== 'arquivo') return;
      const posicao = posicaoAlvo(c);
      const duracao = duracaoDe(c);
      const parado = pausado(alvo);
      // Quem entra depois do fim (ou o tocador que ficou para trás) não toca o fim de novo.
      if (!parado && duracao > 0 && !alvo.faixa.repetir && posicao >= duracao - 0.25) { el.pause(); terminou(c); return; }
      // Parado (pausado, ou para começar a tocar agora), acerta de perto; tocando, só se escorregou muito (pular a cada
      // pouco faz o som picotar).
      if (el.readyState >= 1 && Math.abs(el.currentTime - posicao) > (parado || el.paused ? 0.3 : FOLGA.arquivo)) { try { el.currentTime = posicao; } catch { /* ainda carregando */ } }
      if (parado) { if (!el.paused) el.pause(); return; }
      if (el.paused) el.play().then(() => mudarBloqueio(false)).catch(error => { if (error && error.name === 'NotAllowedError') mudarBloqueio(true); });
    }
    function pararArquivo(c) {
      if (!c.audio) return;
      c.audio.pause();
      c.audio.removeAttribute('src');
      c.audio.load();
    }

    // ---------------- YouTube ----------------
    const chaveYoutube = alvo => `youtube:${alvo.faixa.id}:${alvo.faixa.youtube}`;
    async function tocarYoutube(c) {
      const faixa = c.alvo.faixa;
      let YT;
      try { YT = await carregarYoutube(); } catch (error) { if (c.alvo) aoErro(c.nome, c.alvo, error.message); return; }
      // Mudou enquanto o YouTube carregava: quem chamou depois cuida.
      if (!c.alvo || c.alvo.faixa.youtube !== faixa.youtube) return;
      if (!c.yt) {
        const host = document.createElement('div');
        caixa.querySelector(`[data-canal="${c.nome}"]`).append(host);
        c.ytPronto = new Promise(resolve => {
          c.yt = new YT.Player(host, {
            host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
            playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, iv_load_policy: 3, origin: location.origin },
            events: {
              onReady: () => resolve(),
              onStateChange: event => estadoYoutube(c, event.data),
              onError: event => erroYoutube(c, Number(event.data))
            }
          });
        });
      }
      await c.ytPronto;
      if (!c.alvo || c.fonte !== 'youtube') return;
      const chave = chaveYoutube(c.alvo);
      if (c.chave !== chave) {
        c.chave = chave;
        const opcoes = { videoId: c.alvo.faixa.youtube, startSeconds: posicaoAlvo(c) };
        if (pausado(c.alvo)) c.yt.cueVideoById(opcoes);
        else { c.yt.loadVideoById(opcoes); conferirBloqueio(c); }
      }
      c.yt.setVolume(Math.round(100 * volumeDe(c)));
      acertarYoutube(c);
    }
    // Sem tocar em alguns segundos, o navegador segurou o som (o YouTube fica parado no começo).
    function conferirBloqueio(c) {
      clearTimeout(c.conferir);
      c.conferir = setTimeout(() => {
        if (c.fonte !== 'youtube' || !c.alvo || pausado(c.alvo) || !c.yt || !c.yt.getPlayerState) return;
        const estado = c.yt.getPlayerState();
        if (estado !== YT_TOCANDO && estado !== YT_CARREGANDO && estado !== YT_FIM) mudarBloqueio(true);
      }, 3500);
    }
    function acertarYoutube(c) {
      const yt = c.yt;
      const alvo = c.alvo;
      if (!yt || !alvo || c.fonte !== 'youtube' || !yt.getPlayerState || c.chave !== chaveYoutube(alvo)) return;
      const estado = yt.getPlayerState();
      const posicao = posicaoAlvo(c);
      const duracao = duracaoDe(c);
      const parado = pausado(alvo);
      if (!parado && duracao > 0 && !alvo.faixa.repetir && posicao >= duracao - 0.5) { yt.pauseVideo(); terminou(c); return; }
      if (estado !== YT_CARREGANDO && Math.abs((yt.getCurrentTime() || 0) - posicao) > (parado ? 0.5 : FOLGA.youtube)) yt.seekTo(posicao, true);
      if (parado) { if (estado === YT_TOCANDO || estado === YT_CARREGANDO) yt.pauseVideo(); return; }
      if (estado !== YT_TOCANDO && estado !== YT_CARREGANDO) yt.playVideo();
    }
    function estadoYoutube(c, estado) {
      if (estado === YT_TOCANDO) mudarBloqueio(false);
      if (estado === YT_TOCANDO || estado === YT_CARREGANDO) aoMudar();
      if (estado !== YT_FIM || !c.alvo || c.fonte !== 'youtube') return;
      if (c.alvo.faixa.repetir) { c.yt.seekTo(0, true); c.yt.playVideo(); } else terminou(c);
    }
    function erroYoutube(c, codigo) {
      if (!c.alvo || c.fonte !== 'youtube') return;
      aoErro(c.nome, c.alvo, ERROS_DO_VIDEO[codigo] || 'O YouTube não tocou esse vídeo.');
      if (ERROS_DO_VIDEO[codigo]) terminou(c);
    }
    function pararYoutube(c) {
      clearTimeout(c.conferir);
      if (c.yt && c.yt.stopVideo) c.yt.stopVideo();
    }

    // ---------------- O que a página chama ----------------
    function sincronizar(c) {
      const fonte = !c.alvo ? null : c.alvo.faixa.youtube ? 'youtube' : 'arquivo';
      if (c.fonte !== fonte) {
        if (c.fonte === 'arquivo') pararArquivo(c);
        if (c.fonte === 'youtube') pararYoutube(c);
        c.fonte = fonte;
        c.chave = '';
      }
      if (fonte === 'arquivo') tocarArquivo(c);
      if (fonte === 'youtube') tocarYoutube(c);
    }
    function mostrarCaixa() {
      if (!caixa) return;
      let algum = false;
      for (const c of Object.values(canais)) {
        const lugar = caixa.querySelector(`[data-canal="${c.nome}"]`);
        if (lugar) lugar.hidden = c.fonte !== 'youtube';
        algum = algum || c.fonte === 'youtube';
      }
      caixa.hidden = !algum;
    }
    // audio: o que o servidor mandou ({ agora, canais }).
    function aplicar(audio) {
      if (!audio) return;
      if (Number.isFinite(audio.agora)) desvio = audio.agora - Date.now();
      for (const nome of CANAIS) {
        canais[nome].alvo = (audio.canais && audio.canais[nome]) || null;
        sincronizar(canais[nome]);
      }
      mostrarCaixa();
      aoMudar();
    }
    // No clique da pessoa (o navegador só deixa tocar dentro dele). Passa pelo acerto: o <audio> segurado ficou no
    // ponto em que carregou, e tocar dali começaria atrasado em relação aos outros.
    function liberar() {
      for (const c of Object.values(canais)) {
        if (!c.alvo || pausado(c.alvo)) continue;
        if (c.fonte === 'arquivo') acertarArquivo(c);
        if (c.fonte === 'youtube' && c.yt && c.yt.playVideo) { acertarYoutube(c); conferirBloqueio(c); }
      }
    }
    function volume(nome, nivel) {
      const c = canais[nome];
      if (!c) return;
      c.nivel = Math.min(1, Math.max(0, Number(nivel) || 0));
      if (c.fonte === 'arquivo' && c.audio) c.audio.volume = ganho(volumeDe(c));
      if (c.fonte === 'youtube' && c.yt && c.yt.setVolume && c.chave) c.yt.setVolume(Math.round(100 * volumeDe(c)));
    }
    function estado(nome) {
      const c = canais[nome];
      return { alvo: c.alvo, posicao: posicaoAlvo(c), duracao: duracaoDe(c), pausado: Boolean(c.alvo && pausado(c.alvo)), fonte: c.fonte, nivel: c.nivel };
    }
    // A posição escorrega (a aba ficou em segundo plano, a rede engasgou): confere de tempos em tempos.
    setInterval(() => {
      for (const c of Object.values(canais)) {
        if (c.fonte === 'arquivo') acertarArquivo(c);
        if (c.fonte === 'youtube') acertarYoutube(c);
      }
    }, 3000);
    return { aplicar, liberar, volume, estado, get bloqueado() { return bloqueado; } };
  }

  // Os vídeos de uma playlist do YouTube (até 200; o mix "RD…" também), por um player escondido, como o yt-jukebox:
  // sem chave da API do YouTube. video: o vídeo do link, que o mix precisa para começar.
  async function videosDaPlaylist(lista, video = '') {
    const YT = await carregarYoutube();
    return new Promise((resolve, reject) => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px;';
      document.body.append(host);
      let player = null;
      let tentativas = 0;
      const fim = (ids, erro) => {
        clearInterval(espera);
        try { if (player && player.destroy) player.destroy(); } catch { /* já saiu */ }
        host.remove();
        if (erro) reject(erro); else resolve(ids);
      };
      // getPlaylist volta vazio até o player carregar a lista: pergunta a cada meio segundo, por até 10 segundos.
      const espera = setInterval(() => {
        tentativas += 1;
        const ids = player && player.getPlaylist ? player.getPlaylist() : null;
        if (ids && ids.length) fim(ids.filter(id => /^[A-Za-z0-9_-]{11}$/.test(id)));
        else if (tentativas > 20) fim(null, new Error('O YouTube não abriu essa playlist (privada, ou o link está errado?).'));
      }, 500);
      player = new YT.Player(host, {
        host: 'https://www.youtube-nocookie.com', ...(video ? { videoId: video } : {}),
        playerVars: { listType: 'playlist', list: lista, origin: location.origin },
        events: { onError: () => fim(null, new Error('O YouTube não abriu essa playlist.')) }
      });
    });
  }

  window.MesaTocador = { criar, ganho, videosDaPlaylist, CANAIS };
})();
