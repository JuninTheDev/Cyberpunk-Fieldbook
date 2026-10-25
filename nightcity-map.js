// Cartografia pública: nenhum marcador, nome ou texto de campanha pertence a este arquivo.
// Os tiles locais usam a grade XYZ do mapa fornecido (256 px, níveis 3 a 7).
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  // Ao substituir a cartografia, trocar esta versão também no servidor e no service worker.
  const TILE_VERSION = '20261025';
  const MAX_LOADING = 24;
  const ZOOM_SETTLE_MS = 120;
  const width = 7168;
  const height = 6912;
  // Registro dos mesmos pontos geográficos nas duas imagens. O espaço dos lugares publicados
  // continua sendo 5600 × 5320; só a cartografia muda de escala e enquadramento.
  const registration = { x: 1.2417435565, y: 1.2423296961, offsetX: 89.8348954, offsetY: 44.6123878 };
  const bounds = {
    x: -registration.offsetX / registration.x,
    y: -registration.offsetY / registration.y,
    width: width / registration.x,
    height: height / registration.y
  };
  const levels = {
    3: { maxX: 6, maxY: 6 }, 4: { maxX: 13, maxY: 13 },
    5: { maxX: 27, maxY: 26 }, 6: { maxX: 55, maxY: 53 }, 7: { maxX: 111, maxY: 107 }
  };

  function createLayer(svg, { onError = () => {} } = {}) {
    const group = document.createElementNS(NS, 'g');
    group.id = 'nightcity-map-tiles';
    group.setAttribute('aria-hidden', 'true');
    group.setAttribute('pointer-events', 'none');
    group.setAttribute('transform', `matrix(${1 / registration.x} 0 0 ${1 / registration.y} ${bounds.x} ${bounds.y})`);
    const clip = document.createElementNS(NS, 'clipPath');
    clip.id = 'nightcity-map-tile-clip';
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    clip.append(rect);
    const overview = document.createElementNS(NS, 'g');
    const detail = document.createElementNS(NS, 'g');
    overview.setAttribute('clip-path', 'url(#nightcity-map-tile-clip)');
    detail.setAttribute('clip-path', 'url(#nightcity-map-tile-clip)');
    group.append(clip, overview, detail);
    svg.insertBefore(group, svg.querySelector('#nightcity-map-pins'));
    const images = new Map();
    let enabled = false;
    let destroyed = false;
    let warned = false;
    let frame = 0;
    let settleTimer = 0;
    let loading = 0;
    let queue = [];
    let screenScale = 1;
    let detailLevel = 0;
    let lastView;

    function remove(entry) {
      entry.state = 'removed';
      entry.image.onload = null;
      entry.image.onerror = null;
      entry.image.removeAttribute('href');
      entry.image.remove();
      images.delete(entry.key);
    }

    function pending() {
      group.dataset.pending = String(Boolean(frame || settleTimer || [...images.values()].some(entry =>
        entry.required && (entry.state === 'queued' || entry.state === 'loading'))));
    }

    function prune() {
      // O detalhe anterior continua visível até a nova região terminar de chegar.
      const replacing = frame || settleTimer || [...images.values()].some(entry => entry.required
        && (entry.state === 'queued' || entry.state === 'loading'));
      for (const entry of images.values()) {
        if (entry.required || entry.state === 'loading') continue;
        if (replacing && entry.z !== 3 && entry.state === 'loaded' && intersects(entry, lastView)) continue;
        remove(entry);
      }
    }

    function pump() {
      if (!enabled || destroyed) return;
      while (loading < MAX_LOADING && queue.length) {
        const entry = queue.shift();
        if (!entry.required || entry.state !== 'queued') continue;
        entry.state = 'loading';
        loading++;
        const finish = failed => {
          if (destroyed || entry.state !== 'loading') return;
          loading--;
          entry.state = failed ? 'failed' : 'loaded';
          entry.image.dataset[failed ? 'failed' : 'loaded'] = 'true';
          if (failed) {
            entry.image.style.visibility = 'hidden';
            if (entry.z === 3 && !warned && enabled) { warned = true; onError(); }
          }
          prune();
          pump();
          pending();
        };
        entry.image.onload = () => finish(false);
        entry.image.onerror = () => finish(true);
        entry.image.setAttribute('href', `assets/nightcity-map/tiles/${entry.key}.webp?v=${TILE_VERSION}`);
      }
      pending();
    }

    function tile(z, x, y, parent, distance) {
      const key = `${z}/${x}/${y}`;
      if (images.has(key)) {
        const entry = images.get(key);
        entry.required = true;
        entry.distance = distance;
        return;
      }
      const image = document.createElementNS(NS, 'image');
      const size = 256 / 2 ** (z - 5);
      image.dataset.mapTile = key;
      image.dataset.z = z;
      image.dataset.x = x;
      image.dataset.y = y;
      image.setAttribute('x', x * size);
      image.setAttribute('y', y * size);
      image.setAttribute('width', size);
      image.setAttribute('height', size);
      image.setAttribute('preserveAspectRatio', 'none');
      images.set(key, { key, z, x, y, size, image, state: 'queued', required: true, distance, scale: 0 });
      parent.append(image);
    }

    function region(view) {
      return { left: view.x * registration.x + registration.offsetX,
        top: view.y * registration.y + registration.offsetY,
        right: (view.x + view.width) * registration.x + registration.offsetX,
        bottom: (view.y + view.height) * registration.y + registration.offsetY };
    }

    function intersects(entry, view) {
      const r = region(view), { x, y, size } = entry;
      return x * size < r.right && (x + 1) * size > r.left && y * size < r.bottom && (y + 1) * size > r.top;
    }

    function visibleTiles(z, view, parent) {
      const size = 256 / 2 ** (z - 5);
      const { left, top, right, bottom } = region(view);
      // Não disputa a rede com uma borda inteira de imagens fora da tela.
      const startX = Math.max(0, Math.floor(left / size));
      const startY = Math.max(0, Math.floor(top / size));
      const endX = Math.min(levels[z].maxX, Math.ceil(right / size) - 1);
      const endY = Math.min(levels[z].maxY, Math.ceil(bottom / size) - 1);
      const centerX = (left + right) / (2 * size), centerY = (top + bottom) / (2 * size);
      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          tile(z, x, y, parent, (x + .5 - centerX) ** 2 + (y + .5 - centerY) ** 2);
        }
      }
    }

    function draw() {
      frame = 0;
      if (destroyed || !enabled || !svg.isConnected || !lastView) return;
      const view = lastView;
      screenScale = Math.min(svg.clientWidth / view.width, svg.clientHeight / view.height);
      const z = Math.max(3, Math.min(7, Math.ceil(5 + Math.log2(Math.max(screenScale, 0.001) / registration.x))));
      group.dataset.level = z;
      for (const entry of images.values()) entry.required = false;
      // A cidade aparece primeiro; o detalhe só é pedido quando o zoom assenta.
      visibleTiles(3, view, overview);
      if (!settleTimer) {
        if (z !== detailLevel) {
          // Só promove nós na troca de nível, sem reorganizar centenas deles a cada pan.
          for (const entry of images.values()) if (entry.z === z && z !== 3) detail.append(entry.image);
          detailLevel = z;
        }
        if (z !== 3) visibleTiles(z, view, detail);
      }
      prune();
      for (const entry of images.values()) {
        if (entry.scale !== screenScale) {
          // Sobreposição de um pixel da tela evita frestas entre imagens quando
          // as bordas do SVG caem em posições fracionárias, em qualquer zoom.
          entry.image.setAttribute('width', entry.size + registration.x / Math.max(screenScale, 0.001));
          entry.image.setAttribute('height', entry.size + registration.y / Math.max(screenScale, 0.001));
          entry.scale = screenScale;
        }
      }
      // Uma fila só: visão geral antes do detalhe e, em cada nível, centro antes das bordas.
      queue = [...images.values()].filter(entry => entry.required && entry.state === 'queued')
        .sort((a, b) => (a.z === 3 ? 0 : 1) - (b.z === 3 ? 0 : 1) || a.distance - b.distance);
      pump();
    }

    return {
      setEnabled(value) {
        enabled = value;
        group.dataset.pending = 'false';
        group.style.display = enabled ? '' : 'none';
        if (!enabled) {
          cancelAnimationFrame(frame); frame = 0;
          clearTimeout(settleTimer); settleTimer = 0;
          queue = []; loading = 0;
          for (const entry of images.values()) remove(entry);
        }
      },
      update(view) {
        const scaleChanged = !lastView || view.width !== lastView.width || view.height !== lastView.height;
        const viewChanged = scaleChanged || view.x !== lastView.x || view.y !== lastView.y;
        lastView = view;
        if (enabled && !destroyed) {
          if (viewChanged) {
            queue = [];
            for (const entry of images.values()) if (entry.state === 'queued') entry.required = false;
          }
          if (scaleChanged) {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
              settleTimer = 0;
              if (!destroyed && enabled && !frame) frame = requestAnimationFrame(draw);
            }, ZOOM_SETTLE_MS);
          }
          group.dataset.pending = 'true';
          if (!frame) frame = requestAnimationFrame(draw);
        }
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        clearTimeout(settleTimer);
        queue = [];
        for (const entry of images.values()) remove(entry);
        group.remove();
      }
    };
  }

  function renderPage(data, { empty = false } = {}) {
    const reference = Boolean(data?.images?.reference);
    const acts = [...new Set((data?.markers || []).map(marker => marker.act).filter(Boolean))];
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const close = (name, label) => `<button type="button" class="map-icon-button" data-map-close="${name}" aria-label="Fechar ${label}">×</button>`;
    return `<div class="map-stage">
      <div class="campaign-map-canvas" id="campaign-map-canvas"><svg id="nightcity-map" role="group" tabindex="0" aria-label="Mapa interativo de Night City" aria-describedby="map-status"><image id="nightcity-map-image" x="0" y="0" width="${Number(data?.width) || 5600}" height="${Number(data?.height) || 5320}" preserveAspectRatio="none"></image><g id="nightcity-map-pins"></g></svg></div>
      <nav class="map-corner map-top-left" aria-label="Navegação do mapa"><button type="button" data-map-action="menu" aria-controls="navigation" aria-expanded="false">☰ <span>Menu</span></button><button type="button" data-map-toggle="locals" aria-controls="map-locals-panel" aria-expanded="false">⌖ <span>Locais</span></button></nav>
      <div class="map-corner map-top-right"><button type="button" data-map-toggle="layers" aria-controls="map-layers-panel" aria-expanded="false">▱ <span>Camadas</span></button></div>
      <div class="map-corner map-bottom-left map-zoom-controls" aria-label="Controles de zoom"><button type="button" data-map-action="zoom-in" aria-label="Aumentar zoom" title="Aumentar zoom">+</button><button type="button" data-map-action="zoom-out" aria-label="Diminuir zoom" title="Diminuir zoom">−</button><button type="button" data-map-action="reset" aria-label="Centralizar mapa" title="Centralizar mapa">⌖</button></div>
      <section class="map-overlay map-locals-panel" id="map-locals-panel" aria-labelledby="map-locals-title" hidden><header class="map-panel-header"><h3 id="map-locals-title">Locais</h3>${close('locals', 'locais')}</header><div class="map-panel-body"><label class="map-control">Buscar local<input id="map-place-search" type="search" placeholder="Nome ou distrito" autocomplete="off"></label>
        ${acts.length ? `<label class="map-control">Ato / sessão<select id="map-act-filter"><option value="all">Toda a campanha</option>${acts.map(act => `<option value="${escape(act)}">${escape(act)}</option>`).join('')}</select></label>` : ''}
        <div class="map-filter-list" id="map-filters" aria-label="Filtrar locais"></div><p id="map-empty" role="status"${empty ? '' : ' hidden'}>${empty ? 'Os lugares aparecem conforme o grupo os descobre.' : 'Nenhum local neste filtro.'}</p><div class="map-marker-list" id="map-marker-list"></div></div></section>
      <section class="map-overlay map-layers-panel" id="map-layers-panel" aria-labelledby="map-layers-title" hidden><header class="map-panel-header"><h3 id="map-layers-title">Camadas</h3>${close('layers', 'camadas')}</header><div class="map-panel-body"><label class="map-control">Versão do mapa<select id="map-source"><option value="improved">Mapa detalhado</option><option value="base">Mapa base</option>${reference ? '<option value="reference">Mapa com referências originais</option>' : ''}</select></label><div class="map-legend" id="map-legend"></div></div></section>
      <section class="map-overlay map-detail-panel" id="map-detail-panel" aria-labelledby="map-place-title" hidden><header class="map-panel-header"><span>Local selecionado</span><div class="map-panel-actions"><button type="button" data-map-expand aria-expanded="false">Expandir</button>${close('detail', 'ficha do local')}</div></header><div class="map-panel-body map-marker-detail" id="map-marker-detail"><h3 id="map-place-title">Local selecionado</h3></div></section>
      <p class="map-status" id="map-status" role="status">Arraste para explorar. Use + e −, a roda do mouse ou dois dedos para ampliar.</p><small class="map-credits">Night City · CD PROJEKT RED / Piggyback</small>
    </div>`;
  }

  window.nightCityMap = { bounds, createLayer, renderPage };
})();
