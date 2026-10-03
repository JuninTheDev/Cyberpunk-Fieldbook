// Visão dos jogadores: notas do mestre, painel de publicação, página dos jogadores e controle de acesso.
// Mexe em jogadores.json e jogadores-mestre.json: faz cópia antes e restaura no fim.
const fs = require('fs');
const net = require('net');
const path = require('path');
const { abrir, buscar, semRolagemLateral } = require('../lib/wiki');

module.exports = async ({ edge, servidores, r }) => {
  const arquivos = ['jogadores.json', 'jogadores-mestre.json'].map(nome => path.join(servidores.raiz, nome));
  const copias = arquivos.map(arquivo => fs.readFileSync(arquivo));
  try {
    await edge.ir(`${servidores.local}/`);
    for (const pagina of ['humanity', 'netrunning', 'creation', 'cyberware', 'netArsenal', 'quickhacks']) {
      await r.passo(`mestre: notas de campanha em ${pagina}`, async () => {
        await abrir(edge, pagina, 150);
        const n = await edge.evaluate(`document.querySelectorAll('#content .gm-note').length`);
        return [n > 0, `${n} notas`];
      });
    }
    await r.passo('mestre: Armas de 2077 tem 46 armas', async () => {
      await abrir(edge, 'weapons2077');
      const n = await edge.evaluate(`document.querySelectorAll('#content .entry').length`);
      return [n === 46, `${n} cartões`];
    });

    await abrir(edge, 'playerView', 1200);
    await r.passo('painel: carrega pessoas, lugares e notícias', async () => {
      const n = await edge.evaluate(`['npcs', 'lugares', 'noticias'].map(k => document.querySelectorAll('#pv-' + k + ' .pv-row').length)`);
      return [n[0] > 0 && n[1] > 0, n.join(' / ')];
    });
    await r.passo('painel: publicar revela um NPC sem vazar a nota do mestre', async () => {
      const resultado = await edge.evaluate(`(async () => {
        const row = [...document.querySelectorAll('#pv-npcs .pv-row')].find(row => !row.classList.contains('on'));
        const nome = row.querySelector('input[data-field="nome"]').value;
        row.querySelector('input[data-field="revelado"]').click();
        const nota = row.querySelector('textarea[data-field="nota"]');
        nota.value = 'SEGREDO-DE-TESTE'; nota.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('pv-save').click();
        await new Promise(r => setTimeout(r, 1200));
        const pub = await (await fetch('jogadores.json', { cache: 'no-store' })).text();
        return { nome, publicado: JSON.parse(pub).npcs.some(n => n.nome === nome), vazou: pub.includes('SEGREDO-DE-TESTE') };
      })()`);
      return [resultado.publicado && !resultado.vazou, JSON.stringify(resultado)];
    });

    if (!servidores.rede) return;
    await edge.ir(`${servidores.rede}/`, 2500);
    await r.passo('jogador: abre a visão dos jogadores', async () => {
      const estado = await edge.evaluate(`({ titulo: document.title, pagina: wikiApp.currentPage() })`);
      return [/Jogadores/.test(estado.titulo) && estado.pagina === 'pvHome', JSON.stringify(estado)];
    });
    await r.passo('jogador: mapa mostra os lugares revelados', async () => {
      await abrir(edge, 'pvMap', 900);
      const n = await edge.evaluate(`document.querySelectorAll('.map-pin').length`);
      return [n > 0, `${n} pinos`];
    });
    await r.passo('jogador: regras sem notas de campanha nem segredos', async () => {
      await edge.evaluate(`document.querySelector('#tab-system').click()`);
      const vazamentos = [];
      for (const pagina of ['humanity', 'netrunning', 'creation', 'cyberware', 'netArsenal', 'quickhacks', 'weapons2077', 'cyberware2077', 'supplement2077', 'economy', 'screen']) {
        await abrir(edge, pagina, 120);
        const v = await edge.evaluate(`document.querySelectorAll('#content .gm-note').length + '/' + /morana|kobo|iskra|sato\\b|na campanha/i.test(document.getElementById('content').textContent)`);
        if (v !== '0/false') vazamentos.push(`${pagina}:${v}`);
      }
      return [!vazamentos.length, vazamentos.join(' ') || 'nenhum'];
    });
    await r.passo('jogador: busca por "Morana" não acha nada', async () => {
      const n = (await buscar(edge, 'Morana')).length;
      await buscar(edge, '');
      return [n === 0, `${n} resultados`];
    });
    await r.passo('jogador: notícia publicada pelo mestre aparece sozinha (até 20 s)', async () => {
      await edge.evaluate(`document.querySelector('#tab-campaigns').click()`);
      await abrir(edge, 'pvNews', 200);
      const antes = await edge.evaluate(`document.querySelectorAll('#content .section h3').length`);
      const mestre = JSON.parse(fs.readFileSync(arquivos[1], 'utf8'));
      mestre.noticias.push({ id: 'teste-automatico', titulo: 'Notícia de teste', data: 'agora', texto: 'Teste.', publicada: true });
      const pick = (list, flag) => list.filter(item => item[flag]).map(({ [flag]: _f, nota: _n, ...rest }) => rest);
      const publicado = { resumo: mestre.resumo, npcs: pick(mestre.npcs, 'revelado'), lugares: pick(mestre.lugares, 'revelado'), noticias: pick(mestre.noticias, 'publicada').reverse() };
      const resposta = await fetch(`${servidores.local}/api/jogadores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mestre, publicado }) });
      for (let i = 0; i < 40; i++) {
        await edge.sleep(500);
        const depois = await edge.evaluate(`document.querySelectorAll('#content .section h3').length`);
        if (depois > antes) return [resposta.status === 200, `apareceu em ~${(i + 1) / 2} s`];
      }
      return [false, 'não apareceu'];
    });
    // Com .pipe, conexões que caíam no meio deixavam o jogadores.json aberto, e o Publicar dava 500 (EPERM).
    await r.passo('publicar funciona depois de 300 conexões que caem no meio', async () => {
      const { hostname, port } = new URL(servidores.local);
      for (let i = 0; i < 300; i += 1) {
        await new Promise(resolve => {
          const socket = net.connect(Number(port), hostname, () => {
            socket.write('GET /jogadores.json HTTP/1.1\r\nHost: x\r\n\r\n');
            setTimeout(() => { socket.destroy(); resolve(); }, i % 3);
          });
          socket.on('error', resolve);
        });
      }
      await edge.sleep(500);
      const temporarios = () => fs.readdirSync(path.dirname(arquivos[0])).filter(nome => /^jogadores.*\.tmp$/.test(nome));
      const antes = temporarios();
      const mestre = JSON.parse(fs.readFileSync(arquivos[1], 'utf8'));
      const publicado = JSON.parse(fs.readFileSync(arquivos[0], 'utf8'));
      const resposta = await fetch(`${servidores.local}/api/jogadores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mestre, publicado }) });
      const sobras = temporarios().filter(nome => !antes.includes(nome));
      return [resposta.status === 200 && !sobras.length, `HTTP ${resposta.status}${resposta.status === 200 ? '' : `: ${await resposta.text()}`}${sobras.length ? ` | sobrou ${sobras.join(', ')}` : ''}`];
    });
    await edge.celular(true);
    await r.passo('jogador no celular: sem rolagem lateral', async () => { await abrir(edge, 'pvPeople', 400); return [await semRolagemLateral(edge), '']; });
    await edge.celular(false);

    // ---------------- Controle de acesso (sem navegador) ----------------
    const status = async (url, options = {}) => (await fetch(url, { redirect: 'manual', ...options })).status;
    const liberados = ['/', '/jogadores.html', '/jogadores.json', '/wiki-app.js', '/wiki.css', '/system-2077.js', '/nightcity-map-base.jpg', '/cyberpunk-css-main/cyberpunk-css-main/fonts/Oxanium.woff2'];
    const bloqueados = ['/index.html', '/jogadores-mestre.json', '/jogadores-painel.js', '/mestre-npcs.js', '/campaign-map.js', '/server.js', '/personagens-da-campanha.md', '/.git/config', '/cyberpunk-css-main/cyberpunk-css-main/fonts/..%5C..%5C..%5Cindex.html', '/%2e%2e/%2e%2e/Windows/win.ini'];
    await r.passo('acesso: arquivos dos jogadores liberados pela rede', async () => {
      const ruins = [];
      for (const caminho of liberados) { const s = await status(servidores.rede + caminho); if (s !== 200) ruins.push(`${caminho}=${s}`); }
      return [!ruins.length, ruins.join(' ') || `${liberados.length} ok`];
    });
    await r.passo('acesso: arquivos do mestre bloqueados pela rede', async () => {
      const ruins = [];
      for (const caminho of bloqueados) { const s = await status(servidores.rede + caminho); if (s !== 403) ruins.push(`${caminho}=${s}`); }
      return [!ruins.length, ruins.join(' ') || `${bloqueados.length} bloqueados`];
    });
    await r.passo('acesso: jogador não publica', async () => { const s = await status(`${servidores.rede}/api/jogadores`, { method: 'POST', body: '{}' }); return [s === 403, s]; });
    await r.passo('acesso: senha do mestre libera a wiki do mestre por cookie', async () => {
      const errada = await status(`${servidores.rede}/?mestre=errada`);
      const login = await fetch(`${servidores.rede}/?mestre=${servidores.senhaMestre}`, { redirect: 'manual' });
      const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
      const pagina = await (await fetch(`${servidores.rede}/`, { headers: { cookie } })).text();
      const falso = await status(`${servidores.rede}/index.html`, { headers: { cookie: 'gm=chute' } });
      return [errada === 403 && login.status === 302 && pagina.includes('jogadores-painel.js') && falso === 403, `errada ${errada} | login ${login.status} | cookie falso ${falso}`];
    });
    await r.passo('acesso: quem chega pelo túnel do Cloudflare é jogador', async () => {
      const headers = { 'CF-Connecting-IP': '203.0.113.5' };
      const raiz = await (await fetch(`${servidores.local}/`, { headers })).text();
      const index = await status(`${servidores.local}/index.html`, { headers });
      return [/Jogadores/.test(raiz.match(/<title>[^<]*/)?.[0] || '') && index === 403, `index.html ${index}`];
    });
  } finally {
    arquivos.forEach((arquivo, i) => fs.writeFileSync(arquivo, copias[i]));
  }
};
