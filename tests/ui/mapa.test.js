// Opcional: node --test tests/ui/mapa.test.js. Só usa os dados, portas e perfil do navegador isolado.
const assert = require('node:assert/strict');
const test = require('node:test');
const { comNavegadorIsolado } = require('../lib/navegador-isolado');

const segredo = 'NOTA-GM-MAPA-NAO-PUBLICAR-713';
const lugarOculto = 'MAPA-LOCAL-OCULTO-829';
const publicados = ['mapa-ui-clinica', 'mapa-ui-mercado'];
const pronto = `document.querySelector('#nightcity-map')?.dataset.source === 'improved'
  && document.querySelectorAll('#nightcity-map-tiles image[data-map-tile]').length > 0`;
const vista = `(() => { const b = document.querySelector('#nightcity-map').viewBox.baseVal;
  return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`;
const tamanho = `(() => { const r = document.querySelector('.campaign-map-canvas').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`;
const recursosPrivados = `performance.getEntriesByType('resource').map(e => new URL(e.name).pathname)
  .filter(p => /campaign-map\\.js$|nightcity-map-reference\\.webp$/.test(p))`;
const visivel = seletor => `(() => { const e = document.querySelector(${JSON.stringify(seletor)});
  return Boolean(e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'); })()`;
const paineis = `['locals', 'layers', 'detail'].filter(n => { const e = document.querySelector('#map-' + n + '-panel');
  return e && !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== 'none'; })`;

test('mapa imersivo mantém navegação e coordenadas, funciona no celular e protege a visão do jogador', { timeout: 180000 }, async t => {
  await comNavegadorIsolado(t, async ({ base, comando, avaliar, ate, captura: capturar, esperar }) => {
    // O mapa já ocupa a viewport. Capturar além dela pode redimensionar temporariamente
    // a janela no Chromium e disparar o ResizeObserver da câmera durante o próprio teste.
    const captura = (nome, seletor) => capturar(nome, seletor, { captureBeyondViewport: false });
    const avaliarOriginal = avaliar;
    avaliar = async expressao => {
      try { return await avaliarOriginal(expressao); }
      catch (erro) { throw new Error(`${erro.message}\nTrecho: ${expressao.slice(0, 220)}`, { cause: erro }); }
    };
    const navegar = async url => {
      await comando('Page.navigate', { url: base + url });
      await ate('!!window.wikiApp');
    };
    const clicar = async seletor => {
      assert.equal(await avaliar(visivel(seletor)), true, `O controle deve estar visível: ${seletor}`);
      await avaliar(`document.querySelector(${JSON.stringify(seletor)}).scrollIntoView({ block: 'nearest' })`);
      await avaliar(`document.querySelector(${JSON.stringify(seletor)}).focus({ preventScroll: true })`);
      await avaliar(`document.querySelector(${JSON.stringify(seletor)}).click()`);
    };
    const abrirPainel = async nome => {
      if (!await avaliar(visivel(`#map-${nome}-panel`))) await clicar(`[data-map-toggle="${nome}"]`);
      await ate(visivel(`#map-${nome}-panel`));
    };
    const fecharPainel = async nome => {
      if (await avaliar(visivel(`#map-${nome}-panel`))) await clicar(`[data-map-close="${nome}"]`);
      await ate(`!(${visivel(`#map-${nome}-panel`)})`);
    };
    const tecla = async (key, code, windowsVirtualKeyCode, modifiers = 0) => {
      await comando('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, modifiers });
      await comando('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, modifiers });
    };
    const conferirTela = async () => {
      const info = await avaliar(`(() => { const r = document.querySelector('.campaign-map-canvas').getBoundingClientRect(), v = document.querySelector('#nightcity-map').viewBox.baseVal;
        return { x: r.x, y: r.y, w: r.width, h: r.height, iw: innerWidth, ih: innerHeight,
          aspecto: v.width / v.height, svgAspecto: document.querySelector('#nightcity-map').clientWidth / document.querySelector('#nightcity-map').clientHeight,
          overflow: document.documentElement.scrollWidth > innerWidth + 1, overflowY: document.documentElement.scrollHeight > innerHeight + 1 }; })()`);
      assert.ok(Math.abs(info.x) <= 1 && Math.abs(info.y) <= 1 && Math.abs(info.w - info.iw) <= 2 && Math.abs(info.h - info.ih) <= 2, JSON.stringify(info));
      assert.ok(Math.abs(info.aspecto - info.svgAspecto) < 0.0001, 'O viewBox deve acompanhar o formato da tela, sem esticar o mapa.');
      assert.equal(info.overflow, false, 'O mapa imersivo não cria rolagem horizontal.');
      assert.equal(info.overflowY, false, 'O mapa imersivo não cria rolagem vertical da página.');
    };
    const pinDesobstruido = id => avaliar(`(() => {
      const pin = document.querySelector('.map-pin[data-map-marker="${id}"]'), p = new DOMPoint(0, 0).matrixTransform(pin.getScreenCTM());
      const livre = ['locals', 'layers', 'detail'].every(n => { const e = document.querySelector('#map-' + n + '-panel');
        if (!e || e.hidden || !e.getClientRects().length) return true; const r = e.getBoundingClientRect();
        return p.x < r.left - 14 || p.x > r.right + 14 || p.y < r.top - 14 || p.y > r.bottom + 14; });
      return livre && p.x >= 14 && p.y >= 14 && p.x <= innerWidth - 14 && p.y <= innerHeight - 14;
    })()`);
    const carregar = async () => {
      // O zoom rápido troca lotes de imagens; sua fila HTTP pode exceder o prazo genérico de um controle.
      for (let i = 0; i < 160; i++) {
        const estado = await avaliar(`(() => { const grupo = document.querySelector('#nightcity-map-tiles'), tiles = [...grupo.querySelectorAll('image[data-map-tile]')];
          return { pronto: grupo.dataset.pending === 'false' && tiles.length > 0 && tiles.every(t => t.dataset.loaded === 'true' && !t.dataset.failed),
            falhas: tiles.filter(t => t.dataset.failed).map(t => t.dataset.mapTile) }; })()`);
        assert.deepEqual(estado.falhas, [], 'Nenhum tile visível pode falhar ao carregar.');
        if (estado.pronto) return;
        await esperar(100);
      }
      throw new Error('Os tiles visíveis não terminaram o desenho e o carregamento em 16 segundos.');
    };
    const fonte = async nome => {
      await abrirPainel('layers');
      await avaliar(`(() => { const s = document.getElementById('map-source'); s.value = ${JSON.stringify(nome)};
        s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await ate(`document.getElementById('nightcity-map').dataset.source === ${JSON.stringify(nome)}`);
    };
    const zoom = async vezes => {
      for (let i = 0; i < vezes; i++) await clicar('[data-map-action="zoom-in"]');
    };
    const decodificar = () => avaliar(`(async () => {
      const svg = document.querySelector('#nightcity-map'), grupo = document.querySelector('#nightcity-map-tiles');
      const tiles = [...grupo.querySelectorAll('image[data-map-tile]')].sort((a, b) => Number(b.dataset.z) - Number(a.dataset.z)).slice(0, 4);
      const imagens = await Promise.all(tiles.map(async tile => {
        const url = new URL(tile.getAttribute('href'), location.href), r = await fetch(url);
        if (!r.ok) throw Error('Tile indisponível: ' + url.pathname + ' (' + r.status + ')');
        const bitmap = await createImageBitmap(await r.blob());
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const contexto = canvas.getContext('2d'); contexto.drawImage(bitmap, 0, 0);
        const dados = contexto.getImageData(0, 0, canvas.width, canvas.height).data, cores = new Set();
        for (let i = 0; i < dados.length; i += 64) cores.add(dados[i] + ',' + dados[i + 1] + ',' + dados[i + 2]);
        const resultado = { url: url.pathname, versao: url.searchParams.get('v'), origem: url.origin === location.origin, largura: bitmap.width,
          altura: bitmap.height, cores: cores.size, z: Number(tile.dataset.z), x: Number(tile.dataset.x), y: Number(tile.dataset.y) };
        bitmap.close(); return resultado;
      }));
      return { fonte: svg.dataset.source, nivel: Number(grupo.dataset.level), imagens };
    })()`);

    // A fixture passa pela mesma API de publicação e contas usada pela mesa, em dados temporários próprios.
    const conta = await avaliar(`(async () => {
      const api = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw Error(url + ': ' + r.status + ' ' + await r.text()); return r.json(); };
      await api('/api/campanhas/morana/publicar', { mestre: { resumo: 'Grupo dos testes do mapa', npcs: [], noticias: [], lugares: [
        { id: 'mapa-ui-clinica', nome: 'Clínica pública do teste', distrito: 'Watson', x: 2450, y: 1350, texto: 'O grupo conhece esta clínica.', revelado: true, nota: ${JSON.stringify(segredo)} },
        { id: 'mapa-ui-mercado', nome: 'Mercado público do teste', distrito: 'Westbrook', x: 2650, y: 1800, texto: 'O grupo conhece este mercado.', revelado: true, nota: ${JSON.stringify(segredo)} },
        { id: 'mapa-ui-oculto', nome: ${JSON.stringify(lugarOculto)}, distrito: 'SEGREDO', x: 1720, y: 1060, texto: 'Encontro ainda não revelado.', revelado: false, nota: ${JSON.stringify(segredo)} }
      ] } });
      return (await api('/api/contas', { nome: 'Jogador do mapa', campanhas: ['morana'] })).conta;
    })()`);
    assert.ok(conta.codigo, 'A conta do jogador deve vir da API real.');

    await t.test('mapa ocupa a tela sem seleção ou painéis iniciais; tiles e três fontes conservam as coordenadas', async () => {
      await avaliar(`wikiApp.openPage('campaignMap')`);
      await ate(pronto);
      await ate(`Array.from(document.querySelectorAll('#nightcity-map-tiles image[data-map-tile]')).some(i => i.dataset.loaded === 'true')`);
      await carregar();
      const inicial = await decodificar();
      assert.equal(await avaliar(`document.getElementById('map-source').value`), 'improved');
      assert.deepEqual(await avaliar(`Array.from(document.getElementById('map-source').options, o => o.value)`), ['improved', 'base', 'reference']);
      assert.equal(inicial.fonte, 'improved');
      assert.equal(await avaliar(`document.body.classList.contains('map-immersive')`), true);
      await conferirTela();
      assert.equal(await avaliar(visivel('.topbar')), false);
      assert.equal(await avaliar(visivel('aside')), false);
      assert.equal(await avaliar(visivel('.page-head')), false);
      assert.equal(await avaliar(visivel('#content > .lede')), false);
      assert.deepEqual(await avaliar(paineis), []);
      assert.equal(await avaliar(`document.querySelectorAll('.map-pin.selected, .map-marker-card.selected').length`), 0);
      assert.equal(await avaliar(`document.querySelectorAll('.map-overlay:not([hidden])').length`), 0);
      assert.equal(await avaliar(`getComputedStyle(document.querySelector('#nightcity-map-tiles')).display !== 'none'`), true);
      assert.ok(inicial.imagens.length > 0);
      assert.ok(inicial.imagens.every(i => i.origem && /^\/assets\/nightcity-map\/tiles\/\d+\/\d+\/\d+\.webp$/.test(i.url)
        && i.versao === '20261025' && i.largura > 0 && i.altura > 0 && Number.isInteger(i.z) && Number.isInteger(i.x) && Number.isInteger(i.y)), JSON.stringify(inicial));
      assert.ok(inicial.imagens.some(i => i.cores > 4), 'As imagens devem conter o mapa, com variação de pixels; não um fundo vazio.');
      const pinos = await avaliar(`Array.from(document.querySelectorAll('#nightcity-map-pins .map-pin'), p => ({ id: p.dataset.mapMarker, transform: p.getAttribute('transform') }))`);
      assert.ok(pinos.length >= 3);
      const dados = await avaliar(`JSON.stringify(window.campaignMapData.markers)`);
      await carregar();
      await captura('mapa-imersivo-geral', '.campaign-map-canvas');
      for (const nome of ['base', 'reference', 'improved']) {
        await fonte(nome);
        if (nome === 'improved') await ate(pronto);
        else assert.ok((await avaliar(`document.querySelector('#nightcity-map-image').getAttribute('href')`)).endsWith(`nightcity-map-${nome}.webp`));
        assert.deepEqual(await avaliar(`Array.from(document.querySelectorAll('#nightcity-map-pins .map-pin'), p => ({ id: p.dataset.mapMarker, transform: p.getAttribute('transform') }))`), pinos,
          `Trocar para ${nome} conserva as coordenadas de todos os marcadores.`);
        assert.equal(await avaliar(`JSON.stringify(window.campaignMapData.markers)`), dados);
      }
      await fecharPainel('layers');
      await carregar();
    });

    await t.test('zoom rapido pede apenas o detalhe final, limita a fila e preserva o detalhe anterior durante a rede lenta', async () => {
      await zoom(3); await carregar();
      const nivelInicial = await avaliar(`Number(document.querySelector('#nightcity-map-tiles').dataset.level)`);
      assert.ok(nivelInicial > 3 && nivelInicial < 7, 'A medicao comeca com detalhe real carregado, antes do zoom maximo.');
      await comando('Network.setCacheDisabled', { cacheDisabled: true });
      await comando('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 350000, uploadThroughput: 350000 });
      try {
        await avaliar(`(() => {
          const grupo = document.querySelector('#nightcity-map-tiles'), svg = document.querySelector('#nightcity-map');
          const anteriores = [...grupo.querySelectorAll('image[data-map-tile]')].filter(i => Number(i.dataset.z) === ${nivelInicial} && i.dataset.loaded === 'true');
          const centro = { x: innerWidth / 2, y: innerHeight / 2 };
          const centrais = anteriores.filter(i => { const r = i.getBoundingClientRect(); return r.left <= centro.x && r.right >= centro.x && r.top <= centro.y && r.bottom >= centro.y; });
          if (!centrais.length) throw Error('A fixture precisa de um tile de detalhe carregado no centro da camera.');
          const vistos = new Set([...grupo.querySelectorAll('image[href]')].map(i => i.getAttribute('href')));
          const dados = { pico: 0, niveis: [], urls: [], preservado: 0, perdeuAntes: false, amostras: 0 };
          const medir = () => {
            const imagens = [...grupo.querySelectorAll('image[data-map-tile]')];
            const voando = imagens.filter(i => i.hasAttribute('href') && !i.dataset.loaded && !i.dataset.failed);
            dados.pico = Math.max(dados.pico, voando.length); dados.amostras++;
            for (const i of imagens) {
              const url = i.getAttribute('href');
              if (!url || vistos.has(url)) continue;
              vistos.add(url); dados.urls.push(url); dados.niveis.push(Number(i.dataset.z));
            }
            if (voando.some(i => Number(i.dataset.z) > ${nivelInicial})) {
              const livre = centrais.some(i => { const r = i.getBoundingClientRect(); return i.isConnected && i.dataset.loaded === 'true'
                && getComputedStyle(i).visibility !== 'hidden' && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; });
              if (livre) dados.preservado++; else dados.perdeuAntes = true;
            }
          };
          const observador = new MutationObserver(medir);
          observador.observe(grupo, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'data-loaded', 'data-failed', 'data-pending'] });
          const intervalo = setInterval(medir, 10); medir();
          window.__mapaMedicao = { dados, parar() { medir(); observador.disconnect(); clearInterval(intervalo); return dados; } };
        })()`);
        // Cada passo atravessa frames de renderizacao, sem dar os 120 ms de repouso entre cliques.
        await avaliar(`(async () => { for (let i = 0; i < 5; i++) {
          document.querySelector('[data-map-action="zoom-in"]').click();
          await new Promise(r => setTimeout(r, 40));
        } })()`);
        await ate(`window.__mapaMedicao.dados.preservado > 0`);
        await carregar();
        await captura('mapa-performance-final', '.campaign-map-canvas');
        const medicao = await avaliar(`window.__mapaMedicao.parar()`);
        const nivelFinal = await avaliar(`Number(document.querySelector('#nightcity-map-tiles').dataset.level)`);
        assert.equal(nivelFinal, 7);
        assert.deepEqual([...new Set(medicao.niveis.filter(z => z !== 3))], [nivelFinal], JSON.stringify(medicao));
        assert.ok(medicao.pico > 6 && medicao.pico <= 24, 'A fila SVG deve explorar a rede sem superar 24 imagens em voo: ' + JSON.stringify(medicao));
        assert.ok(medicao.preservado > 0 && !medicao.perdeuAntes, 'O detalhe carregado continua visivel ate chegar a substituicao: ' + JSON.stringify(medicao));
        assert.ok(medicao.urls.length > 24, 'A regiao final exige mais tiles que o limite de voo, exercitando a fila: ' + JSON.stringify(medicao));
        assert.ok(medicao.urls.every(href => { const u = new URL(href, base); return /^\/assets\/nightcity-map\/tiles\/\d+\/\d+\/\d+\.webp$/.test(u.pathname) && u.searchParams.get('v') === '20261025'; }));
        t.diagnostic('Zoom rapido: niveis ' + [...new Set(medicao.niveis)] + ', pico ' + medicao.pico + ', ' + medicao.urls.length + ' tiles.');
      } finally {
        await avaliar(`window.__mapaMedicao?.parar(); delete window.__mapaMedicao`);
        await comando('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await comando('Network.setCacheDisabled', { cacheDisabled: false });
      }
      await clicar('[data-map-action="reset"]'); await carregar();
    });

    await t.test('ultrawide conserva proporcao, preenche a tela e carrega detalhe sem rolagem', async () => {
      try {
        await comando('Emulation.setDeviceMetricsOverride', { width: 3440, height: 1440, deviceScaleFactor: 1, mobile: false });
        await clicar('[data-map-action="reset"]'); await carregar();
        await conferirTela();
        await captura('mapa-ultrawide-geral', '.campaign-map-canvas');
        await zoom(12); await carregar();
        await conferirTela();
        const detalhe = await decodificar();
        assert.equal(detalhe.nivel, 7);
        assert.ok(detalhe.imagens.some(i => i.z === 7 && i.cores > 4));
        await captura('mapa-ultrawide-detalhe', '.campaign-map-canvas');
      } finally {
        await comando('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
        await clicar('[data-map-action="reset"]'); await carregar();
      }
    });

    let fator;
    await t.test('zoom chega ao nível de detalhe 6+, pan usa o mouse e trocar fonte no zoom máximo conserva o centro', async () => {
      const antes = await avaliar(vista), nivelAntes = await avaliar(`Number(document.querySelector('#nightcity-map-tiles').dataset.level)`);
      await zoom(1); await ate(`document.querySelector('#nightcity-map').viewBox.baseVal.width < ${antes.width}`);
      const primeiro = await avaliar(vista); fator = primeiro.width / antes.width;
      assert.ok(fator > 0 && fator < 1);
      await zoom(11); await ate(`Number(document.querySelector('#nightcity-map-tiles').dataset.level) >= 6`);
      await carregar();
      const ampliado = await decodificar();
      assert.ok(ampliado.nivel >= 6 && ampliado.nivel > nivelAntes, JSON.stringify({ nivelAntes, ampliado }));
      assert.ok(ampliado.imagens.some(i => i.z >= 6), 'O zoom deve carregar imagens de outro nível, além de ampliar a imagem anterior.');
      const centroAntes = await avaliar(vista);
      await fonte('base');
      const centroBase = await avaliar(vista);
      assert.ok(Math.abs(centroAntes.x + centroAntes.width / 2 - centroBase.x - centroBase.width / 2) < 0.1);
      assert.ok(Math.abs(centroAntes.y + centroAntes.height / 2 - centroBase.y - centroBase.height / 2) < 0.1,
        'A troca de camada conserva o centro mesmo quando o mapa-base limita o zoom.');
      await fonte('improved'); await zoom(12);
      await fecharPainel('layers');
      await avaliar(`document.querySelector('.campaign-map-canvas').scrollIntoView({ block: 'center' })`);
      const r = await avaliar(tamanho), panAntes = await avaliar(vista);
      const x = r.x + r.width * .35, y = Math.max(10, r.y + r.height * .65);
      await comando('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await comando('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= 4; i++) await comando('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + i * 15, y: y + i * 7, button: 'left', buttons: 1 });
      await comando('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 60, y: y + 28, button: 'left', buttons: 0, clickCount: 1 });
      await ate(`(() => { const v = document.querySelector('#nightcity-map').viewBox.baseVal; return v.x !== ${panAntes.x} || v.y !== ${panAntes.y}; })()`);
      const panDepois = await avaliar(vista);
      assert.equal(panDepois.width, panAntes.width, 'Arrastar muda a posição, sem mudar o zoom.');
      await carregar();
      await captura('mapa-melhorado-detalhe', '.campaign-map-canvas');
    });

    await t.test('Locais busca por título e distrito, filtros não escolhem pinos e seleção abre ficha sem mudar o zoom', async () => {
      await clicar('[data-map-action="reset"]');
      await abrirPainel('locals');
      assert.equal(await avaliar(visivel('#map-detail-panel')), false);
      const buscar = async texto => {
        await avaliar(`(() => { const s = document.querySelector('#map-place-search'); s.value = ${JSON.stringify(texto)};
          s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        const info = await avaliar(`({ esperados: window.campaignMapData.markers.filter(m => (m.title + ' ' + m.district).toLocaleLowerCase().includes(${JSON.stringify(texto.toLocaleLowerCase())})).map(m => m.id).sort(),
          cards: Array.from(document.querySelectorAll('.map-marker-card'), e => ({ id: e.dataset.mapMarker, visivel: !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none' })).filter(e => e.visivel).map(e => e.id).sort() })`);
        assert.ok(info.esperados.length > 0, 'A busca deve encontrar ao menos um local da fixture.');
        assert.deepEqual(info.cards, info.esperados, `Busca de locais: ${texto}`);
        assert.equal(await avaliar(`document.querySelectorAll('.map-pin.selected').length`), 0, 'Buscar não seleciona o primeiro resultado.');
      };
      await buscar('Kabuki'); await buscar('Watson'); await buscar('');
      const filtro = await avaliar(`(() => { const d = window.campaignMapData, quantidade = d.markers.length;
        return Object.keys(d.categories).find(c => d.markers.filter(m => m.category === c).length < quantidade); })()`);
      assert.ok(filtro, 'A fixture do mestre deve oferecer um filtro que retire ao menos um marcador.');
      await clicar(`[data-map-category="${filtro}"]`);
      const filtrados = await avaliar(`({ esperados: window.campaignMapData.markers.filter(m => m.category === ${JSON.stringify(filtro)}).map(m => m.id).sort(),
        pinos: Array.from(document.querySelectorAll('.map-pin:not(.filtered-out)'), p => p.dataset.mapMarker).sort(),
        cards: Array.from(document.querySelectorAll('.map-marker-card:not(.hidden)'), p => p.dataset.mapMarker).sort(),
        pressed: document.querySelector('[data-map-category="${filtro}"]').getAttribute('aria-pressed') })`);
      assert.equal(filtrados.pressed, 'true');
      assert.deepEqual(filtrados.pinos, filtrados.esperados);
      assert.deepEqual(filtrados.cards, filtrados.esperados);
      await clicar('[data-map-category="all"]');
      assert.equal(await avaliar(`document.querySelectorAll('.map-pin:not(.filtered-out)').length`), await avaliar(`window.campaignMapData.markers.length`));
      assert.equal(await avaliar(`document.querySelectorAll('.map-pin.selected').length`), 0, 'Filtrar não seleciona o primeiro resultado.');
      assert.equal(await avaliar(visivel('#map-detail-panel')), false);
      await carregar();
      await captura('mapa-imersivo-locais', '.campaign-map-canvas');
      const antes = await avaliar(vista);
      await clicar('.map-marker-card[data-map-marker="kabuki-depot"]');
      await ate(visivel('#map-detail-panel'));
      const depois = await avaliar(vista);
      assert.equal(depois.width, antes.width, 'Selecionar um local não amplia o mapa.');
      assert.equal(depois.height, antes.height);
      assert.equal(await pinDesobstruido('kabuki-depot'), true, 'A seleção deve ficar fora dos painéis.');
      assert.equal(await avaliar(visivel('#map-locals-panel')), true, 'Locais e ficha podem coexistir no computador.');
      assert.match(await avaliar(`document.querySelector('#map-place-title').textContent`), /Armazém de Kabuki/);
      assert.equal(await avaliar(visivel('#map-detail-panel [data-map-expand]')), false, 'Expandir só é oferecido quando muda a altura da ficha móvel.');
      assert.ok(await avaliar(`document.querySelectorAll('.map-place-sections details').length`) >= 3);
      assert.equal(await avaliar(`document.querySelectorAll('.map-place-sections details[open]').length`), 0, 'As seções da ficha começam recolhidas.');
      await clicar('.map-place-sections details summary');
      assert.equal(await avaliar(`document.querySelector('.map-place-sections details').open`), true);
      await carregar(); await captura('mapa-imersivo-ficha', '.campaign-map-canvas');
      await abrirPainel('layers');
      assert.equal(await avaliar(visivel('#map-detail-panel')), false, 'Camadas suspende a ficha.');
      await fecharPainel('layers');
      await fecharPainel('detail'); await fecharPainel('locals');
    });

    await t.test('em 1025×768 o ponto junto ao limite recolhe Locais quando necessário para revelar Arasaka sem zoom', async () => {
      await comando('Emulation.setDeviceMetricsOverride', { width: 1025, height: 768, deviceScaleFactor: 1, mobile: false });
      await avaliar(`wikiApp.openPage('campaignMap')`); await ate(pronto);
      await clicar('[data-map-action="reset"]'); await abrirPainel('locals');
      const antes = await avaliar(vista);
      await clicar('.map-marker-card[data-map-marker="arasaka-docks"]');
      await ate(visivel('#map-detail-panel'));
      const depois = await avaliar(vista);
      assert.equal(depois.width, antes.width);
      assert.equal(depois.height, antes.height);
      assert.equal(await pinDesobstruido('arasaka-docks'), true, 'No limite da câmera, a lista deve sair do caminho do pino.');
      assert.equal(await avaliar(visivel('#map-locals-panel')), false);
      assert.match(await avaliar(`document.querySelector('#map-place-title').textContent`), /Arasaka Industrial Docks/);
      assert.equal(await avaliar(visivel('#map-detail-panel [data-map-expand]')), false);
      await conferirTela(); await carregar(); await captura('mapa-imersivo-limite-1025', '.campaign-map-canvas');
      await comando('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    });

    await t.test('endereço do marcador abre seu detalhe e voltar/repetir setup não acumula ações de zoom', async () => {
      await navegar('/index.html#campaignMap/kabuki-depot');
      await ate(pronto);
      await ate(`document.querySelector('.map-pin[data-map-marker="kabuki-depot"]')?.classList.contains('selected')`);
      await ate(visivel('#map-detail-panel'));
      assert.match(await avaliar(`document.querySelector('#map-marker-detail').textContent`), /Armazém de Kabuki/);
      const dentro = await avaliar(`(() => { const m = window.campaignMapData.markers.find(m => m.id === 'kabuki-depot'), v = document.querySelector('#nightcity-map').viewBox.baseVal;
        return m.x >= v.x && m.x <= v.x + v.width && m.y >= v.y && m.y <= v.y + v.height; })()`);
      assert.equal(dentro, true, 'O marcador do endereço deve estar dentro da área enquadrada.');
      await avaliar(`wikiApp.openPage('home')`);
      await ate(`!document.querySelector('#nightcity-map')`);
      assert.equal(await avaliar(`document.body.classList.contains('map-immersive')`), false);
      assert.equal(await avaliar(visivel('.topbar')), true, 'Sair do mapa restaura o cabeçalho normal.');
      assert.equal(await avaliar(visivel('aside')), true);
      await avaliar(`wikiApp.openPage('campaignMap'); wikiApp.setupMap(); wikiApp.setupMap()`);
      await ate(pronto);
      assert.equal(await avaliar(`document.querySelectorAll('#nightcity-map').length`), 1);
      assert.deepEqual(await avaliar(paineis), []);
      assert.equal(await avaliar(`document.querySelectorAll('.map-pin.selected').length`), 0);
      const antes = await avaliar(vista); await zoom(1);
      const depois = await avaliar(vista);
      assert.ok(Math.abs(depois.width / antes.width - fator) < 0.0001, 'Um clique mantém o mesmo fator após voltar e repetir setup: não há handlers duplicados.');
    });

    await t.test('menu imersivo prende Tab no drawer, Esc devolve o foco e a preferência compacta; CtrlK suspende o mapa e Esc restaura', async () => {
      await avaliar(`wikiApp.openPage('home'); if (!document.body.classList.contains('sidebar-compact')) wikiApp.toggleSidebar()`);
      const preferencia = await avaliar(`Object.fromEntries(Object.keys(localStorage).filter(k => k.endsWith('barra-compacta')).map(k => [k, localStorage.getItem(k)]))`);
      await avaliar(`wikiApp.openPage('campaignMap')`); await ate(pronto);
      await clicar('[data-map-action="menu"]');
      await ate(visivel('aside'));
      assert.deepEqual(await avaliar(`({ role: document.querySelector('aside').getAttribute('role'), modal: document.querySelector('aside').getAttribute('aria-modal'), inert: document.querySelector('main').inert })`),
        { role: 'dialog', modal: 'true', inert: true });
      const focoExtremo = ultimo => avaliar(`(() => { const itens = Array.from(document.querySelector('aside').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(e => e.getClientRects().length && !e.closest('[inert]'));
        const e = itens[${ultimo ? 'itens.length - 1' : '0'}]; e.focus(); return { total: itens.length, ultimo: document.activeElement === itens.at(-1), primeiro: document.activeElement === itens[0] }; })()`);
      assert.ok((await focoExtremo(true)).total > 1);
      await tecla('Tab', 'Tab', 9);
      assert.equal(await avaliar(`(() => { const itens = Array.from(document.querySelector('aside').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(e => e.getClientRects().length && !e.closest('[inert]')); return document.activeElement === itens[0]; })()`), true,
        'Tab do último controle volta ao primeiro no menu modal.');
      await tecla('Tab', 'Tab', 9, 8);
      assert.equal(await avaliar(`(() => { const itens = Array.from(document.querySelector('aside').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(e => e.getClientRects().length && !e.closest('[inert]')); return document.activeElement === itens.at(-1); })()`), true);
      await tecla('Escape', 'Escape', 27);
      await ate(`!(${visivel('aside')})`);
      assert.equal(await avaliar(`document.activeElement?.matches('[data-map-action="menu"]')`), true);
      assert.equal(await avaliar(`document.querySelector('main').inert`), false);
      assert.equal(await avaliar(`document.body.classList.contains('sidebar-compact')`), true);
      assert.deepEqual(await avaliar(`Object.fromEntries(Object.keys(localStorage).filter(k => k.endsWith('barra-compacta')).map(k => [k, localStorage.getItem(k)]))`), preferencia);
      await tecla('k', 'KeyK', 75, 2);
      await ate(`document.activeElement === document.querySelector('#search') && !document.body.classList.contains('map-immersive')`);
      await comando('Input.insertText', { text: 'Kabuki' });
      await ate(`document.querySelector('#content .result')`);
      await tecla('Escape', 'Escape', 27);
      await ate(pronto);
      assert.equal(await avaliar(`document.body.classList.contains('map-immersive')`), true);
      assert.deepEqual(await avaliar(paineis), []);
      await conferirTela();
      await avaliar(`wikiApp.openPage('home')`);
      assert.equal(await avaliar(visivel('.topbar')), true);
      assert.equal(await avaliar(`document.body.classList.contains('sidebar-compact')`), true);
      assert.equal(await avaliar(`document.querySelector('aside').hasAttribute('aria-modal')`), false, 'O drawer devolve os atributos normais do menu.');
      await avaliar(`wikiApp.toggleSidebar(); wikiApp.openPage('campaignMap')`); await ate(pronto);
    });

    await t.test('celular mantém um painel por vez, ficha recolhida/expandida, rotação e pinch sem cobrir a seleção', async () => {
      await comando('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await comando('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      await clicar('[data-map-action="reset"]');
      await avaliar(`document.querySelector('.campaign-map-canvas').scrollIntoView({ block: 'center' })`);
      await esperar(150);
      await conferirTela();
      const r = await avaliar(tamanho), antes = await avaliar(vista), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      assert.ok(r.width > 200 && r.height > 200, 'O mapa deve continuar visível em tela pequena.');
      const pontos = distancia => [{ x: cx - distancia, y: cy, id: 1 }, { x: cx + distancia, y: cy, id: 2 }];
      await comando('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pontos(22) });
      for (const distancia of [32, 44, 58]) await comando('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pontos(distancia) });
      await comando('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await ate(`document.querySelector('#nightcity-map').viewBox.baseVal.width < ${antes.width}`);
      await abrirPainel('locals');
      assert.deepEqual(await avaliar(paineis), ['locals']);
      const zoomAntes = await avaliar(vista);
      await clicar('.map-marker-card[data-map-marker="wakako-jig-jig"]');
      await ate(visivel('#map-detail-panel'));
      assert.deepEqual(await avaliar(paineis), ['detail']);
      assert.match(await avaliar(`document.querySelector('#map-marker-detail').textContent`), /Pachinko de Wakako/);
      assert.equal((await avaliar(vista)).width, zoomAntes.width, 'A ficha móvel revela o pino por deslocamento, sem ampliar.');
      assert.equal(await pinDesobstruido('wakako-jig-jig'), true);
      const recolhida = await avaliar(`document.querySelector('#map-detail-panel').getBoundingClientRect().height / innerHeight`);
      assert.ok(recolhida >= .35 && recolhida <= .55, 'A ficha começa próxima de metade da altura da tela: ' + recolhida);
      assert.equal(await avaliar(`document.querySelector('#map-detail-panel [data-map-expand]').getAttribute('aria-expanded')`), 'false');
      await carregar(); await captura('mapa-imersivo-movel-ficha', '.campaign-map-canvas');
      await clicar('#map-detail-panel [data-map-expand]');
      assert.equal(await avaliar(`document.querySelector('#map-detail-panel [data-map-expand]').getAttribute('aria-expanded')`), 'true');
      const expandida = await avaliar(`document.querySelector('#map-detail-panel').getBoundingClientRect().height / innerHeight`);
      assert.ok(expandida >= .65 && expandida <= .85 && expandida > recolhida, 'Expandir usa cerca de 80% da altura: ' + expandida);
      assert.equal((await avaliar(vista)).width, zoomAntes.width);
      assert.equal(await pinDesobstruido('wakako-jig-jig'), true, 'O pino deve continuar revelado acima da ficha expandida.');
      await carregar(); await captura('mapa-imersivo-movel-expandido', '.campaign-map-canvas');
      await abrirPainel('layers'); assert.deepEqual(await avaliar(paineis), ['layers']);
      await fecharPainel('layers');
      assert.ok((await avaliar(paineis)).length <= 1);
      await comando('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
      await esperar(150); await conferirTela();
      const encaixados = await avaliar(`['locals', 'layers', 'detail'].every(n => { const e = document.querySelector('#map-' + n + '-panel');
        if (!e || e.hidden || !e.getClientRects().length) return true; const r = e.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1; })`);
      assert.equal(encaixados, true, 'Girar o aparelho não deixa um painel fora da tela.');
      await carregar();
      await captura('mapa-imersivo-movel-paisagem', '.campaign-map-canvas');
      await comando('Emulation.setTouchEmulationEnabled', { enabled: false });
      await comando('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    });

    await t.test('jogador recebe somente locais revelados, sem dados/scripts do mestre, e conserva fontes públicas e coordenadas', async () => {
      const papel = await avaliar(`(async () => {
        await fetch('/api/mestre/sair', { method: 'POST' });
        const r = await fetch('/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: ${JSON.stringify(conta.codigo)} }) });
        if (!r.ok) throw Error('Login de jogador falhou: ' + await r.text());
        return (await (await fetch('/api/eu')).json()).papel;
      })()`);
      assert.equal(papel, 'jogador');
      await navegar('/jogadores.html#pvMap/mapa-ui-mercado');
      await ate(pronto);
      await ate(`document.querySelector('.map-pin[data-map-marker="mapa-ui-mercado"]')?.classList.contains('selected')`);
      assert.match(await avaliar(`document.querySelector('#map-marker-detail').textContent`), /Mercado público do teste/);
      const publico = await avaliar(`(async () => {
        const r = await fetch('/api/visao'); if (!r.ok) throw Error('Visão: ' + r.status);
        const dados = await r.json(); return { texto: JSON.stringify(dados), lugares: dados.lugares };
      })()`);
      assert.deepEqual(publico.lugares.map(l => l.id).sort(), publicados);
      assert.ok(!publico.texto.includes(segredo) && !publico.texto.includes(lugarOculto), 'A API deve retirar segredos antes de enviar os dados.');
      const publicoDOM = await avaliar(`({ fontes: Array.from(document.querySelector('#map-source').options, o => o.value),
        pinos: Array.from(document.querySelectorAll('#nightcity-map-pins .map-pin'), p => p.dataset.mapMarker).sort(),
        dados: JSON.stringify(window.playerMapData), texto: document.body.textContent, mestre: typeof window.campaignMapData,
        scripts: Array.from(document.scripts, s => s.src).filter(s => /campaign-map\\.js/.test(s)) })`);
      assert.deepEqual(publicoDOM.fontes, ['improved', 'base']);
      assert.deepEqual(publicoDOM.pinos, publicados);
      assert.equal(publicoDOM.mestre, 'undefined');
      assert.deepEqual(publicoDOM.scripts, []);
      assert.deepEqual(await avaliar(recursosPrivados), [], 'A página do jogador não deve requisitar o mapa ou os scripts privados.');
      for (const texto of [publicoDOM.dados, publicoDOM.texto]) assert.ok(!texto.includes(segredo) && !texto.includes(lugarOculto));
      const pinos = await avaliar(`Array.from(document.querySelectorAll('#nightcity-map-pins .map-pin'), p => p.getAttribute('transform'))`);
      assert.deepEqual(pinos, ['translate(2450 1350)', 'translate(2650 1800)']);
      await fonte('base'); await fonte('improved'); await ate(pronto);
      assert.deepEqual(await avaliar(`Array.from(document.querySelectorAll('#nightcity-map-pins .map-pin'), p => p.getAttribute('transform'))`), pinos);
      await fecharPainel('layers'); await abrirPainel('locals');
      await clicar('.map-marker-card[data-map-marker="mapa-ui-mercado"]');
      const detalhe = await avaliar(`document.querySelector('#map-marker-detail').textContent`);
      assert.match(detalhe, /Mercado público do teste/);
      assert.match(detalhe, /O grupo conhece este mercado/);
      assert.ok(!detalhe.includes(segredo));
      assert.equal(await avaliar(`fetch('/campaign-map.js').then(r => r.status)`), 403, 'O servidor continua protegendo o script privado.');
      await navegar('/jogadores.html#pvMap/mapa-ui-mercado');
      await ate(pronto);
      await ate(`document.querySelector('.map-pin[data-map-marker="mapa-ui-mercado"]')?.classList.contains('selected')`);
      assert.match(await avaliar(`document.querySelector('#map-marker-detail').textContent`), /Mercado público do teste/);
      await avaliar(`wikiApp.openPage('pvHome'); wikiApp.openPage('pvMap'); wikiApp.setupMap()`);
      await ate(pronto);
      assert.deepEqual(await avaliar(`Array.from(document.querySelectorAll('.map-pin'), p => p.dataset.mapMarker).sort()`), publicados);
      assert.deepEqual(await avaliar(paineis), []);
      assert.equal(await avaliar(`document.querySelectorAll('.map-pin.selected').length`), 0);
      await comando('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await esperar(150);
      await conferirTela();
      await abrirPainel('locals'); await clicar('.map-marker-card[data-map-marker="mapa-ui-mercado"]');
      await ate(visivel('#map-detail-panel'));
      assert.deepEqual(await avaliar(paineis), ['detail']);
      assert.equal(await pinDesobstruido('mapa-ui-mercado'), true);
      await carregar();
      await captura('mapa-jogador-celular', '.campaign-map-canvas');
    });
  });
});
