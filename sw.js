// Wiki dos jogadores sem internet (a wiki instalada no celular): guarda neste aparelho as regras e o que o mestre
// publicou. Com rede, sempre busca primeiro a versão nova (a wiki muda quando o mestre publica); sem rede, ou com a
// rede travada por mais de 4 segundos, usa a última cópia.
// Guarda os arquivos públicos (os mesmos que qualquer jogador baixa) e, da API, só o que é deste aparelho: quem
// entrou (api/eu) e o que o mestre publicou nas campanhas dele (api/visao). Entrar ou sair apaga essas duas.
// A wiki do mestre e o resto da API passam direto.
const CACHE = 'fieldbook-jogadores-v17';
const TILE_VERSION = '20261025';
const PUBLICOS = [
  '/jogadores.html', '/mestre.html', '/wiki.css', '/netwire.css', '/netwire.js', '/wiki-app.js', '/nightcity-map.js',
  '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-blackchrome.js', '/system-glossario.js',
  '/system-criacao.js', '/personagem-roles.js', '/personagem-cyberware.js', '/personagem-jogo.js', '/loja-catalogo.js', '/popup.js', '/criador.js', '/conta.js', '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css',
  '/manifest.webmanifest', '/icones/icone-192.png', '/icones/icone-512.png'
];
const PRIVADOS = ['/api/eu', '/api/visao'];
const TROCA_DE_QUEM = ['/api/entrar', '/api/sair', '/api/sair-de-todos', '/api/mestre/entrar', '/api/mestre/sair'];
// O mapa, seus tiles visíveis e as fontes entram quando forem abertos, não na instalação.
const MAPA = '/nightcity-map-base.webp';
const TILES = /^\/assets\/nightcity-map\/tiles\/[3-7]\/(?:0|[1-9]\d*)\/(?:0|[1-9]\d*)\.webp$/;
const LIMITE_TILES = 768;
const FONTES = '/cyberpunk-css-main/cyberpunk-css-main/fonts/';
const estatico = url => url.origin === self.location.origin && (url.pathname === MAPA || TILES.test(url.pathname) || url.pathname.startsWith(FONTES));
const guardavel = url => url.origin === self.location.origin
  && (PUBLICOS.includes(url.pathname) || PRIVADOS.includes(url.pathname) || estatico(url));
// A visão de cada campanha é guardada separada (?campanha=).
const tileVersionado = url => TILES.test(url.pathname) && url.search === `?v=${TILE_VERSION}`;
const chave = url => (PRIVADOS.includes(url.pathname) || tileVersionado(url) ? url.pathname + url.search : url.pathname);
const limparPrivados = () => caches.open(CACHE).then(cache => cache.keys().then(keys => Promise.all(keys.filter(key => PRIVADOS.includes(new URL(key.url).pathname)).map(key => cache.delete(key)))));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLICOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

const comPrazo = (request, ms = 4000) => Promise.race([fetch(request), new Promise((_, reject) => setTimeout(() => reject(new Error('rede lenta')), ms))]);
// Agrupa as gravações da mesma rajada: enumerar e podar o cache não é trabalho de cada imagem.
// Se outra gravação terminar durante a poda, uma nova rodada mantém o orçamento após a rajada.
let manutencaoTiles = null;
let tilesAlterados = false;
const limitarTiles = cache => {
  tilesAlterados = true;
  if (!manutencaoTiles) manutencaoTiles = (async () => {
    try {
      do {
        await new Promise(resolve => setTimeout(resolve, 40));
        tilesAlterados = false;
        const tiles = (await cache.keys()).filter(key => TILES.test(new URL(key.url).pathname));
        await Promise.all(tiles.slice(0, Math.max(0, tiles.length - LIMITE_TILES)).map(key => cache.delete(key)));
      } while (tilesAlterados);
    } finally { manutencaoTiles = null; }
  })();
  return manutencaoTiles;
};
// A gravação usa uma cópia e nunca segura a resposta da rede. Só os tiles são limitados;
// regras e a visão da campanha continuam guardadas. Cota cheia não impede mostrar a imagem.
const guardarEstatico = async (cache, url, response) => {
  try {
    await cache.put(chave(url), response);
    if (TILES.test(url.pathname)) await limitarTiles(cache);
  } catch { /* cache cheio ou indisponível: o mapa continua vindo da rede */ }
};

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'POST' && url.origin === self.location.origin && TROCA_DE_QUEM.includes(url.pathname)) { event.waitUntil(limparPrivados()); return; }
  if (request.method !== 'GET') return;
  // Abrir a wiki sem rede: a página dos jogadores guardada. Aqui não há prazo (numa rede lenta o mestre cairia na
  // visão dos jogadores), e a resposta da raiz não é guardada (para o mestre ela é a wiki do mestre).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/jogadores.html')));
    return;
  }
  // Tiles da versão conhecida são imutáveis: uma cópia local basta, sem revalidação por imagem.
  // O mapa base, as fontes e tiles sem versão conhecida continuam atualizando por trás.
  // A primeira visita espera a rede, mas a exibição não espera gravação ou limpeza do cache.
  if (estatico(url)) {
    const cache = caches.open(CACHE).catch(() => null);
    const cached = cache.then(store => store ? store.match(chave(url)).catch(() => null) : null);
    const fresh = cached.then(previous => {
      if (previous && tileVersionado(url)) return null;
      return fetch(request).then(response => ({ response, copy: response.ok ? response.clone() : null }));
    });
    // Registra a vida do trabalho durante o próprio evento; nenhum waitUntil depende de um await anterior.
    event.waitUntil(Promise.all([cache, fresh]).then(([store, result]) => {
      if (store && result?.copy) return guardarEstatico(store, url, result.copy);
    }).catch(() => null));
    event.respondWith(cached.then(previous => previous || fresh.then(result => result.response)));
    return;
  }
  if (!guardavel(url)) return;
  event.respondWith(comPrazo(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(chave(url), copy));
    }
    return response;
  }).catch(() => caches.match(chave(url)).then(cached => cached || Response.error())));
});
