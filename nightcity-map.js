// Cartografia pública: nenhum marcador, nome ou texto de campanha pertence a este arquivo.
// Os tiles locais usam a grade XYZ do mapa fornecido (256 px, níveis 3 a 7).
(() => {
  const NS = 'http://www.w3.org/2000/svg';
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
    let lastView;

    function tile(z, x, y, parent, wanted) {
      const key = `${z}/${x}/${y}`;
      wanted.add(key);
      if (images.has(key)) return;
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
      image.onload = () => { image.dataset.loaded = 'true'; };
      // Uma peça de detalhe ausente deixa a visão geral por baixo. Nunca usa imagens externas.
      image.onerror = () => {
        image.dataset.failed = 'true';
        image.style.visibility = 'hidden';
        if (z === 3 && !warned && !destroyed && enabled) { warned = true; onError(); }
      };
      image.setAttribute('href', `assets/nightcity-map/tiles/${key}.webp`);
      images.set(key, image);
      parent.append(image);
    }

    function visibleTiles(z, view, parent, wanted) {
      const size = 256 / 2 ** (z - 5);
      const left = view.x * registration.x + registration.offsetX;
      const top = view.y * registration.y + registration.offsetY;
      const right = (view.x + view.width) * registration.x + registration.offsetX;
      const bottom = (view.y + view.height) * registration.y + registration.offsetY;
      const startX = Math.max(0, Math.floor(left / size) - 1);
      const startY = Math.max(0, Math.floor(top / size) - 1);
      const endX = Math.min(levels[z].maxX, Math.floor(right / size) + 1);
      const endY = Math.min(levels[z].maxY, Math.floor(bottom / size) + 1);
      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) tile(z, x, y, parent, wanted);
      }
    }

    function draw() {
      frame = 0;
      if (destroyed || !enabled || !svg.isConnected || !lastView) return;
      const view = lastView;
      const screenScale = Math.min(svg.clientWidth / view.width, svg.clientHeight / view.height);
      const z = Math.max(3, Math.min(7, Math.ceil(5 + Math.log2(Math.max(screenScale, 0.001) / registration.x))));
      group.dataset.level = z;
      const wanted = new Set();
      // A visão geral fica por baixo enquanto chega o detalhe; só baixa a região visível.
      visibleTiles(3, view, overview, wanted);
      if (z !== 3) visibleTiles(z, view, detail, wanted);
      for (const [key, image] of images) {
        if (!wanted.has(key)) { image.remove(); images.delete(key); }
        else {
          // Sobreposição de um pixel da tela evita frestas entre imagens quando
          // as bordas do SVG caem em posições fracionárias, em qualquer zoom.
          const size = 256 / 2 ** (Number(image.dataset.z) - 5);
          image.setAttribute('width', size + registration.x / Math.max(screenScale, 0.001));
          image.setAttribute('height', size + registration.y / Math.max(screenScale, 0.001));
        }
      }
      group.dataset.pending = 'false';
    }

    return {
      setEnabled(value) {
        enabled = value;
        group.dataset.pending = 'false';
        group.style.display = enabled ? '' : 'none';
        if (!enabled) { for (const image of images.values()) image.remove(); images.clear(); }
      },
      update(view) {
        lastView = view;
        if (enabled && !destroyed) {
          group.dataset.pending = 'true';
          if (!frame) frame = requestAnimationFrame(draw);
        }
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        for (const image of images.values()) { image.onload = null; image.onerror = null; }
        images.clear();
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
