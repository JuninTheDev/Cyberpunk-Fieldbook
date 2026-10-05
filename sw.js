// Wiki dos jogadores sem internet (a wiki instalada no celular): guarda neste aparelho as regras e o que o mestre
// publicou. Com rede, sempre busca primeiro a versão nova (a wiki muda quando o mestre publica); sem rede, ou com a
// rede travada por mais de 4 segundos, usa a última cópia.
// Só guarda arquivos públicos, os mesmos que qualquer jogador baixa. A wiki do mestre, a API e o resto passam direto.
const CACHE = 'fieldbook-jogadores-v2';
const PUBLICOS = [
  '/jogadores.html', '/jogadores.json', '/mestre.html', '/wiki.css', '/wiki-app.js',
  '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-glossario.js',
  '/system-criacao.js', '/loja-catalogo.js', '/popup.js', '/criador.js', '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css',
  '/manifest.webmanifest', '/icones/icone-192.png', '/icones/icone-512.png'
];
// O mapa (5 MB) e as fontes entram quando forem abertos, não na instalação.
const guardavel = url => url.origin === self.location.origin
  && (PUBLICOS.includes(url.pathname) || url.pathname === '/nightcity-map-base.jpg' || url.pathname.startsWith('/cyberpunk-css-main/cyberpunk-css-main/fonts/'));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLICOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

const comPrazo = (request, ms = 4000) => Promise.race([fetch(request), new Promise((_, reject) => setTimeout(() => reject(new Error('rede lenta')), ms))]);

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Abrir a wiki sem rede: a página dos jogadores guardada. Aqui não há prazo (numa rede lenta o mestre cairia na
  // visão dos jogadores), e a resposta da raiz não é guardada (para o mestre ela é a wiki do mestre).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/jogadores.html')));
    return;
  }
  if (!guardavel(url)) return;
  event.respondWith(comPrazo(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(url.pathname, copy));
    }
    return response;
  }).catch(() => caches.match(url.pathname).then(cached => cached || Response.error())));
});
