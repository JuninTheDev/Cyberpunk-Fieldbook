// O mapa-base é público; os pins do mestre e os dados da campanha continuam protegidos pela API.
// Servidor real em memória e service worker em vm: sem navegador, portas ou acesso à rede.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { criarServidorIsolado } = require('../lib/servidor-isolado');

const raiz = path.resolve(__dirname, '../..');
const TILE = '/assets/nightcity-map/tiles/3/0/0.webp';
const FONTE_SW = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');

test('mapa público: renderer e tiles WebP são acessíveis ao visitante e ao mestre com mesmo ETag e cache revalidado', async t => {
  const wiki = criarServidorIsolado(t), mestre = await wiki.entrarComoMestre();
  for (const arquivo of ['/nightcity-map.js', TILE]) {
    const visitante = await wiki.pedir(arquivo), gm = await wiki.pedir(arquivo, { cookie: mestre });
    assert.equal(visitante.status, 200, arquivo); assert.equal(gm.status, 200, arquivo);
    assert.equal(visitante.headers['cache-control'], 'no-cache'); assert.equal(gm.headers['cache-control'], 'no-cache');
    assert.ok(visitante.headers.etag); assert.equal(visitante.headers.etag, gm.headers.etag);
    assert.equal(visitante.text, gm.text);
    assert.match(visitante.headers['content-type'], arquivo.endsWith('.webp') ? /^image\/webp$/ : /javascript/);
    const confirmado = await wiki.pedir(arquivo, { headers: { 'If-None-Match': visitante.headers.etag } });
    assert.equal(confirmado.status, 304); assert.equal(confirmado.text, '');
    assert.equal(confirmado.headers['cache-control'], 'no-cache'); assert.equal(confirmado.headers.etag, visitante.headers.etag);
  }
});

test('mapa público: HEAD não envia o tile, todos os zooms locais servem e coordenada inexistente retorna 404', async t => {
  const wiki = criarServidorIsolado(t);
  const cabecalho = await wiki.pedir(TILE, { method: 'HEAD' });
  assert.equal(cabecalho.status, 200); assert.equal(cabecalho.text, '');
  assert.equal(Number(cabecalho.headers['content-length']), fs.statSync(path.join(raiz, TILE)).size);
  for (const z of [3, 4, 5, 6, 7]) assert.equal((await wiki.pedir(`/assets/nightcity-map/tiles/${z}/0/0.webp`)).status, 200);
  const ausente = await wiki.pedir('/assets/nightcity-map/tiles/7/9999/9999.webp');
  assert.equal(ausente.status, 404); assert.equal(ausente.headers.etag, undefined);
  assert.equal((await wiki.pedir(TILE, { method: 'POST' })).status, 405);
});

test('mapa público: somente caminho numérico de tile é liberado; pasta, outras extensões e escapes não expõem arquivos do mestre', async t => {
  const wiki = criarServidorIsolado(t);
  for (const url of [
    '/assets/nightcity-map/', '/assets/nightcity-map/tiles/', '/assets/nightcity-map/map_config.js',
    '/assets/nightcity-map/tiles/2/0/0.webp', '/assets/nightcity-map/tiles/8/0/0.webp',
    '/assets/nightcity-map/tiles/3/-1/0.webp', '/assets/nightcity-map/tiles/3/00/0.webp',
    '/assets/nightcity-map/tiles/3/0/a.webp', '/assets/nightcity-map/tiles/3/0/0.png',
    '/assets/nightcity-map/tiles/3/0/0.webp/index.html',
    '/assets/nightcity-map/tiles/3/0/..%5c..%5c..%5c..%5c..%5cindex.html',
    '/assets/nightcity-map/tiles/3/0/..%2f..%2f..%2f..%2f..%2fcampaign-map.js',
    '/index.html', '/campaign-map.js', '/jogadores-mestre.json', '/nightcity-map-reference.webp', '/server.js'
  ]) assert.equal((await wiki.pedir(url)).status, 403, url);
  const mestre = await wiki.entrarComoMestre(), index = await wiki.pedir('/index.html', { cookie: mestre });
  assert.equal(index.status, 200); assert.equal(index.headers['cache-control'], 'private, no-store');
  assert.equal((await wiki.pedir('/index.html', { headers: { 'If-None-Match': index.headers.etag || 'qualquer' } })).status, 403);
});

function serviceWorker() {
  const origem = 'https://wiki.example', ouvintes = new Map(), stores = new Map();
  const e = { rede: true, fetches: [], precache: [], respostas: new Map(), stores, falharGravacao: false, skipWaiting: 0, claim: 0 };
  const endereco = pedido => new URL(typeof pedido === 'string' ? pedido : pedido.url, origem).href;
  const cacheDe = nome => {
    if (!stores.has(nome)) {
      const respostas = new Map();
      stores.set(nome, {
        respostas,
        match: async pedido => respostas.get(endereco(pedido))?.clone(),
        put: async (pedido, resposta) => {
          if (e.falharGravacao) throw new Error('Quota excedida');
          respostas.delete(endereco(pedido));
          respostas.set(endereco(pedido), resposta.clone());
        },
        keys: async () => [...respostas.keys()].map(url => new Request(url)),
        delete: async pedido => respostas.delete(endereco(pedido)),
        addAll: async urls => {
          e.precache.push(...urls);
          for (const url of urls) respostas.set(endereco(url), new Response('precache ' + url));
        }
      });
    }
    return stores.get(nome);
  };
  const caches = {
    open: async nome => cacheDe(nome), keys: async () => [...stores.keys()], delete: async nome => stores.delete(nome),
    match: async pedido => {
      for (const cache of stores.values()) { const r = await cache.match(pedido); if (r) return r; }
      return undefined;
    }
  };
  vm.runInNewContext(FONTE_SW, {
    self: { location: { origin: origem }, addEventListener: (nome, ouvir) => ouvintes.set(nome, ouvir),
      skipWaiting: async () => { e.skipWaiting++; }, clients: { claim: async () => { e.claim++; } } },
    caches, URL, Response, setTimeout, clearTimeout,
    fetch: async pedido => {
      const url = endereco(pedido); e.fetches.push(url);
      if (!e.rede) throw new Error('Sem internet');
      const resposta = e.respostas.get(url);
      return resposta ? resposta.clone() : new Response('rede ' + new URL(url).pathname, { headers: { 'Content-Type': 'image/webp' } });
    }
  }, { filename: 'sw.js' });
  e.evento = async nome => {
    const pendentes = []; ouvintes.get(nome)({ waitUntil: p => pendentes.push(p) });
    await Promise.all(pendentes);
  };
  e.pedir = async (url, { method = 'GET', mode = 'cors' } = {}) => {
    const pendentes = []; let resposta;
    ouvintes.get('fetch')({ request: { url: endereco(url), method, mode },
      waitUntil: p => pendentes.push(p), respondWith: p => { resposta = p; } });
    const recebida = resposta ? await resposta : null;
    await Promise.all(pendentes);
    return recebida;
  };
  e.cache = () => [...stores.values()][0];
  e.caminhos = async () => (await e.cache().keys()).map(k => new URL(k.url).pathname + new URL(k.url).search);
  return e;
}

test('mapa offline: instalação guarda só renderer leve, nunca baixa os tiles; atualização remove cache antigo', async () => {
  const e = serviceWorker(); e.stores.set('fieldbook-jogadores-v14', {});
  await e.evento('install'); await e.evento('activate');
  assert.ok(e.precache.includes('/nightcity-map.js'));
  assert.equal(e.precache.some(url => url.startsWith('/assets/nightcity-map/tiles/')), false);
  assert.equal(e.precache.includes('/index.html'), false); assert.equal(e.precache.includes('/campaign-map.js'), false);
  assert.equal(e.fetches.length, 0); assert.equal(e.skipWaiting, 1); assert.equal(e.claim, 1);
  assert.equal(e.stores.has('fieldbook-jogadores-v14'), false); assert.equal(e.stores.size, 1);
});

test('mapa offline: tile solicitado fica disponível sem rede e tile ainda não visitado não ganha cópia fictícia', async () => {
  const e = serviceWorker(), primeira = await e.pedir(TILE);
  assert.equal(await primeira.text(), 'rede ' + TILE);
  assert.deepEqual(await e.caminhos(), [TILE]);
  e.rede = false;
  assert.equal(await (await e.pedir(TILE)).text(), 'rede ' + TILE);
  await assert.rejects(e.pedir('/assets/nightcity-map/tiles/3/0/1.webp'), /Sem internet/);
  assert.deepEqual(await e.caminhos(), [TILE]);
});

test('mapa offline: cache responde primeiro e atualiza o tile para a próxima visita; 404 não substitui uma cópia válida', async () => {
  const e = serviceWorker(); await e.pedir(TILE);
  e.respostas.set('https://wiki.example' + TILE, new Response('novo tile'));
  assert.equal(await (await e.pedir(TILE)).text(), 'rede ' + TILE);
  assert.equal(await (await e.pedir(TILE)).text(), 'novo tile');
  e.respostas.set('https://wiki.example' + TILE, new Response('ausente', { status: 404 }));
  assert.equal(await (await e.pedir(TILE)).text(), 'novo tile');
  e.rede = false; assert.equal(await (await e.pedir(TILE)).text(), 'novo tile');
});

test('mapa offline: 404 sem cópia e cota de armazenamento excedida não são guardados nem impedem exibir a resposta da rede', async () => {
  const e = serviceWorker();
  e.respostas.set('https://wiki.example' + TILE, new Response('ausente', { status: 404 }));
  assert.equal((await e.pedir(TILE)).status, 404); assert.deepEqual(await e.caminhos(), []);
  e.respostas.delete('https://wiki.example' + TILE); e.falharGravacao = true;
  assert.equal(await (await e.pedir(TILE)).text(), 'rede ' + TILE); assert.deepEqual(await e.caminhos(), []);
});

test('mapa offline: só 256 tiles recentes ficam guardados; a limitação preserva regras e visões privadas por campanha', async () => {
  const e = serviceWorker(); await e.evento('install');
  await e.cache().put('/api/eu', new Response('identidade'));
  await e.cache().put('/api/visao?campanha=morana', new Response('somente publicado'));
  const tile = i => `/assets/nightcity-map/tiles/7/${Math.floor(i / 108)}/${i % 108}.webp`;
  for (let i = 0; i < 259; i++) await e.pedir(tile(i));
  const caminhos = await e.caminhos(), tiles = caminhos.filter(p => p.startsWith('/assets/nightcity-map/tiles/'));
  assert.equal(tiles.length, 256); assert.equal(tiles.includes(tile(0)), false); assert.equal(tiles.includes(tile(258)), true);
  assert.ok(caminhos.includes('/system-rules.js')); assert.ok(caminhos.includes('/api/eu')); assert.ok(caminhos.includes('/api/visao?campanha=morana'));
  await e.pedir('/api/sair', { method: 'POST' });
  const depois = await e.caminhos();
  assert.equal(depois.some(p => p.startsWith('/api/')), false); assert.equal(depois.filter(p => p.startsWith('/assets/nightcity-map/tiles/')).length, 256);
});

test('mapa offline: caminhos privados, vizinhos dos tiles e outro domínio passam direto sem cache', async () => {
  const e = serviceWorker();
  for (const url of ['/index.html', '/campaign-map.js', '/nightcity-map-reference.webp', '/jogadores-mestre.json',
    '/api/campanhas', '/api/night-city', '/assets/nightcity-map/map_config.js', '/assets/nightcity-map/tiles/8/0/0.webp',
    '/assets/nightcity-map/tiles/3/0/index.html', 'https://outro.example' + TILE]) assert.equal(await e.pedir(url), null, url);
  assert.equal(e.stores.size, 0); assert.equal(e.fetches.length, 0);
  assert.ok(await e.pedir('/index.html', { mode: 'navigate' }));
  assert.equal(e.stores.size, 0);
});
