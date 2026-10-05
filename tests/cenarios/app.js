// A wiki instalada (manifesto, ícones e service worker): abre sem internet com as regras e o que o mestre publicou,
// e nunca guarda a wiki do mestre. "Sem internet" de verdade: um servidor só deste teste, desligado no meio.
const { subir } = require('../lib/servidores');

module.exports = async ({ edge, servidores, r }) => {
  const rede = servidores.rede;
  await r.passo('manifesto, ícones e service worker liberados para os jogadores, com o tipo certo', async () => {
    const alvo = rede || servidores.local;
    const manifesto = await fetch(`${alvo}/manifest.webmanifest`);
    const sw = await fetch(`${alvo}/sw.js`);
    const icone = await fetch(`${alvo}/icones/icone-512.png`);
    const dados = await manifesto.json();
    return [manifesto.ok && /manifest\+json/.test(manifesto.headers.get('content-type')) && sw.ok && /javascript/.test(sw.headers.get('content-type')) && sw.headers.get('cache-control') === 'no-cache' && icone.ok && dados.icons.length === 2 && dados.display === 'standalone',
      `${manifesto.status} ${manifesto.headers.get('content-type')} · sw ${sw.status} ${sw.headers.get('cache-control')} · ícone ${icone.status}`];
  });

  const porta = 8770;
  const base = `http://127.0.0.1:${porta}`;
  let servidor = await subir(porta, { HOST: '127.0.0.1', GM_KEY: '', DADOS_PERSONAGENS: servidores.dados });
  try {
    await r.passo('a página dos jogadores registra o service worker e guarda as regras', async () => {
      await edge.ir(`${base}/jogadores.html`, 1500);
      await edge.evaluate('navigator.serviceWorker.ready');
      let chaves = [];
      for (let i = 0; i < 30 && !chaves.includes('/system-rules.js'); i++) {
        await edge.sleep(300);
        chaves = await edge.evaluate(`caches.open('fieldbook-jogadores-v1').then(c => c.keys()).then(ks => ks.map(k => new URL(k.url).pathname))`);
      }
      return [['/jogadores.html', '/system-rules.js', '/wiki-app.js', '/jogadores.json'].every(chave => chaves.includes(chave)), `${chaves.length} arquivos guardados`];
    });
    await r.passo('a wiki do mestre não fica guardada no aparelho', async () => {
      await edge.ir(`${base}/`, 1500); // neste computador a raiz é a wiki do mestre
      await edge.ir(`${base}/jogadores.html`, 800);
      const chaves = await edge.evaluate(`caches.open('fieldbook-jogadores-v1').then(c => c.keys()).then(ks => ks.map(k => new URL(k.url).pathname))`);
      const mestre = chaves.filter(chave => ['/', '/index.html', '/mestre-npcs.js', '/campaign-map.js', '/jogadores-mestre.json'].includes(chave) || chave.endsWith('.md'));
      return [!mestre.length, mestre.join(', ') || 'nada do mestre'];
    });
    await r.passo('sem internet (servidor desligado): a wiki dos jogadores abre e mostra as regras', async () => {
      servidor.kill();
      servidor = null;
      await edge.sleep(800);
      await edge.ir(`${base}/jogadores.html`, 1500);
      const abriu = await edge.evaluate(`!!(window.wikiApp && document.querySelector('#content h2'))`).catch(() => false);
      await edge.evaluate(`wikiApp.openPage('combat')`).catch(() => {});
      await edge.sleep(500);
      const titulo = await edge.evaluate(`(document.querySelector('#content h2') || {}).textContent || ''`).catch(() => '');
      await edge.shot('sem-internet');
      return [abriu && /combate/i.test(titulo), `abriu ${abriu} · página: ${titulo}`];
    });
  } finally {
    if (servidor) servidor.kill();
    // Sem servidor, a página tenta falar com a API e não consegue: esperado neste teste.
    edge.erros.splice(0, edge.erros.length, ...edge.erros.filter(erro => !/127\.0\.0\.1:8770|Failed to fetch|ERR_CONNECTION_REFUSED/.test(erro)));
  }
};
