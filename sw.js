// Wiki dos jogadores sem internet (a wiki instalada no celular): guarda neste aparelho as regras e o que o mestre
// publicou. Com rede, sempre busca primeiro a versão nova (a wiki muda quando o mestre publica); sem rede, ou com a
// rede travada por mais de 4 segundos, usa a última cópia.
// Guarda os arquivos públicos (os mesmos que qualquer jogador baixa) e, da API, só o que é deste aparelho: quem
// entrou (api/eu) e o que o mestre publicou nas campanhas dele (api/visao). Entrar ou sair apaga essas duas.
// A wiki do mestre e o resto da API passam direto.
const CACHE = 'fieldbook-jogadores-v5';
const PUBLICOS = [
  '/jogadores.html', '/mestre.html', '/wiki.css', '/wiki-app.js',
  '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-glossario.js',
  '/system-criacao.js', '/loja-catalogo.js', '/popup.js', '/criador.js', '/conta.js', '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css',
  '/manifest.webmanifest', '/icones/icone-192.png', '/icones/icone-512.png'
];
const PRIVADOS = ['/api/eu', '/api/visao'];
const TROCA_DE_QUEM = ['/api/entrar', '/api/sair', '/api/sair-de-todos', '/api/mestre/entrar', '/api/mestre/sair'];
// O mapa (2,7 MB) e as fontes entram quando forem abertos, não na instalação.
const MAPA = '/nightcity-map-base.webp';
const FONTES = '/cyberpunk-css-main/cyberpunk-css-main/fonts/';
const estatico = url => url.origin === self.location.origin && (url.pathname === MAPA || url.pathname.startsWith(FONTES));
const guardavel = url => url.origin === self.location.origin
  && (PUBLICOS.includes(url.pathname) || PRIVADOS.includes(url.pathname) || estatico(url));
// A visão de cada campanha é guardada separada (?campanha=).
const chave = url => (PRIVADOS.includes(url.pathname) ? url.pathname + url.search : url.pathname);
const limparPrivados = () => caches.open(CACHE).then(cache => cache.keys().then(keys => Promise.all(keys.filter(key => PRIVADOS.includes(new URL(key.url).pathname)).map(key => cache.delete(key)))));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLICOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

const comPrazo = (request, ms = 4000) => Promise.race([fetch(request), new Promise((_, reject) => setTimeout(() => reject(new Error('rede lenta')), ms))]);

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
  // O mapa e as fontes quase nunca mudam e são pesados: vêm do aparelho (e atualizam por trás, para a próxima vez).
  // A primeira vez espera a rede o quanto precisar: com o prazo de 4 segundos, um celular lento nunca terminava de
  // baixar o mapa (e, sem cópia guardada, ficava sem nenhum).
  if (estatico(url)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname).then(cached => {
      const fresh = fetch(request).then(response => { if (response.ok) cache.put(url.pathname, response.clone()); return response; });
      if (!cached) return fresh;
      event.waitUntil(fresh.catch(() => null));
      return cached;
    })));
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
