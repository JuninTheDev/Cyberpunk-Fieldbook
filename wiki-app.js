// Motor da wiki: menu, busca por seção, índice "Nesta página", ferramentas de mesa e mapa.
// É o mesmo para a visão do mestre (index.html) e a dos jogadores (jogadores.html).
// O conteúdo da campanha vem de window.wikiConfig; as regras, dos arquivos system-*.js.
(() => {
  const config = window.wikiConfig || {};
  const campaigns = config.campaigns || [];
  const markdownDocs = config.markdownDocs || {};
  const markdownCache = {};
  const storagePrefix = config.storagePrefix || 'night-city';
  const storage = {
    get: key => { try { return localStorage.getItem(`${storagePrefix}-${key}`); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(`${storagePrefix}-${key}`, value); } catch { /* armazenamento indisponível */ } }
  };
  const mapPages = ['campaignMap', ...(config.mapPages || [])];
  const mapData = () => (config.mapData ? config.mapData() : window.campaignMapData);

  const systemSections = [
    { group: 'Na mesa', pages: [
      { id: 'screen', label: 'Escudo do mestre', icon: 'GM' },
      { id: 'skills', label: 'Perícias por STAT', icon: 'SK' }
    ]},
    { group: 'Regras do RED', pages: [
      { id: 'checks', label: 'Testes e dificuldades', icon: 'R' },
      { id: 'combat', label: 'Combate', icon: 'C' },
      { id: 'damage', label: 'Dano, ferimentos e cura', icon: 'D' },
      { id: 'humanity', label: 'Humanidade e drogas', icon: 'H' },
      { id: 'economy', label: 'Economia de 2077', icon: 'EB' },
      { id: 'creation', label: 'Criação de personagens', icon: 'P' }
    ]},
    { group: 'Netrunning', pages: [
      { id: 'netrunning', label: 'Regras do RED', icon: 'N' },
      { id: 'netArsenal', label: 'Arsenal: ICE, programas, upgrades', icon: 'ICE' },
      { id: 'net2077', label: 'Netrunning de 2077', icon: '77' },
      { id: 'quickhacks', label: 'Quickhacks e daemons', icon: 'QH' },
      { id: 'os2077', label: 'Berserk e Sandevistan', icon: 'OS' }
    ]},
    { group: 'Catálogos', pages: [
      { id: 'weapons2077', label: 'Armas de 2077', icon: 'W' },
      { id: 'cyberware2077', label: 'Cyberware de 2077', icon: 'CW' },
      { id: 'roles', label: 'Roles', icon: 'F' },
      { id: 'cyberware', label: 'Cyberware do RED', icon: 'K' },
      { id: 'gear', label: 'Armas e equipamento do RED', icon: 'E' }
    ]},
    { group: 'Variante 2077 e fontes', pages: [
      { id: 'supplement2077', label: 'Suplemento 2077', icon: '77' },
      { id: 'sources', label: 'Livros de referência', icon: 'L' }
    ]}
  ];

  const pageContent = Object.assign({}, window.systemCatalog || {}, (window.systemRules || {}).pages || {}, (window.systemNet || {}).pages || {}, (window.system2077 || {}).pages || {}, config.pageContent || {});
  Object.entries(markdownDocs).forEach(([id, doc]) => {
    pageContent[id] = { eyebrow: doc.eyebrow, title: doc.title, lede: doc.lede, html: `<div class="md-doc" id="md-doc">Carregando ${doc.file}…</div>` };
  });
  applyGmNotes(config.gmNotes || []);
  const pageWorkspace = Object.fromEntries([
    ...campaigns.flatMap(campaign => campaign.groups.flatMap(group => group.pages.map(page => [page.id, 'campaigns']))),
    ...systemSections.flatMap(group => group.pages.map(page => [page.id, 'system']))
  ]);

  // Notas de campanha só existem na visão do mestre: entram aqui, no fim da seção ou do cartão indicado.
  function applyGmNotes(notes) {
    const byPage = {};
    notes.forEach(note => (byPage[note.page] = byPage[note.page] || []).push(note));
    Object.entries(byPage).forEach(([id, pageNotes]) => {
      const page = pageContent[id];
      if (!page) return;
      const holder = document.createElement('div');
      holder.innerHTML = page.html;
      pageNotes.forEach(note => {
        const target = note.name ? holder.querySelector(`[data-toc="${CSS.escape(note.name)}"]`) : holder;
        if (target) target.insertAdjacentHTML('beforeend', note.html);
        else console.warn('Nota do mestre sem destino:', note.page, note.name);
      });
      page.html = holder.innerHTML;
    });
  }

    const navigation = document.getElementById('navigation');
    const content = document.getElementById('content');
    const search = document.getElementById('search');
    let currentPage = 'home';
    let currentWorkspace = storage.get('workspace') || 'campaigns';
    let activeCampaignId = storage.get('active-campaign') || (campaigns[0] || {}).id;
    let campaignMapCategory = 'all';
    let campaignMapAct = 'all';
    let campaignMapView = { x: 0, y: 0, width: 5600, height: 5320 };

    function buildNavigation() {
      const campaign = campaigns.find(item => item.id === activeCampaignId) || campaigns[0];
      activeCampaignId = campaign.id;
      const groups = currentWorkspace === 'campaigns'
        ? campaign.groups.map((group, index) => ({ ...group, group: index === 0 ? campaign.name : group.group }))
        : systemSections;
      // Páginas que não existem nesta visão (ex.: só do mestre) somem do menu.
      const visibleGroups = groups.map(group => ({ ...group, pages: group.pages.filter(page => pageContent[page.id]) })).filter(group => group.pages.length);
      const campaignPicker = currentWorkspace === 'campaigns' && campaigns.length > 1
        ? `<label class="campaign-picker"><span class="nav-label">Campanha ativa</span><select id="campaign-picker">${campaigns.map(item => `<option value="${item.id}" ${item.id === campaign.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select></label>`
        : '';
      navigation.innerHTML = `${campaignPicker}${visibleGroups.map(group => `<div class="nav-group"><div class="nav-label">${group.group}</div>${group.pages.map(page => `<button class="nav-item ${page.className || ''}" data-page="${page.id}" type="button"><span class="nav-icon">${page.icon}</span>${page.label}</button>`).join('')}</div>`).join('')}`;
      document.querySelectorAll('.workspace-tab').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.workspace === currentWorkspace)));
      document.getElementById('tab-campaigns').classList.toggle('active', currentWorkspace === 'campaigns');
      document.getElementById('tab-system').classList.toggle('active', currentWorkspace === 'system');
    }

    function setWorkspace(workspace) {
      if (workspace !== 'campaigns' && workspace !== 'system') return;
      currentWorkspace = workspace;
      storage.set('workspace', workspace);
      buildNavigation();
    }

    // target (opcional): { unit, term } abre a página já na seção indicada, com o termo destacado.
    function openPage(id, target) {
      const page = pageContent[id];
      if (!page) return;
      const targetWorkspace = pageWorkspace[id];
      if (targetWorkspace && targetWorkspace !== currentWorkspace) setWorkspace(targetWorkspace);
      currentPage = id;
      search.value = '';
      content.innerHTML = `<p class="eyebrow">${page.eyebrow}</p><h2 class="cyber-h">${page.title}</h2><p class="lede">${page.lede}</p>${page.html}`;
      document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === id));
      const setup = { notes: setupNotes, campaignMap: setupCampaignMap, screen: setupScreen, skills: setupSkills, ...(config.pageSetup || {}) }[id];
      if (setup) setup();
      if (markdownDocs[id]) {
        window.scrollTo({ top: 0 });
        showMarkdownDoc(id, target);
        return;
      }
      buildToc();
      if (target && target.unit !== undefined) focusUnit(searchUnits(content)[target.unit], target.term);
      else window.scrollTo({ top: 0 });
    }

    // Uma "unidade" é o trecho para onde o índice da página e a busca apontam:
    // cada .section e cada cartão de pessoa; nos documentos .md, cada título de seção.
    const unitSelector = '.section, .person';

    // Índice "Nesta página": só as unidades de primeiro nível.
    function pageUnits(container) {
      const doc = container.querySelector('#md-doc');
      if (doc) return [...doc.querySelectorAll(':scope > h3')];
      return [...container.querySelectorAll(unitSelector)].filter(element => !element.parentElement.closest(unitSelector));
    }

    // Busca: também cada cartão (.entry) dentro das seções, para abrir direto num Black ICE ou quickhack.
    function searchUnits(container) {
      const doc = container.querySelector('#md-doc');
      if (doc) return [...doc.querySelectorAll(':scope > h3')];
      return [...container.querySelectorAll(`${unitSelector}, .entry`)];
    }

    function unitTitle(element) {
      if (element.dataset.toc) return element.dataset.toc;
      const heading = element.matches('h3') ? element : element.querySelector('h3, summary');
      if (!heading) return '';
      return (heading.firstChild && heading.firstChild.nodeType === Node.TEXT_NODE ? heading.firstChild.textContent : heading.textContent).trim();
    }

    // Nos documentos .md, uma seção é o título mais tudo até o próximo título do mesmo nível.
    function unitBlock(element) {
      if (!element.matches('#md-doc > h3')) return [element];
      const block = [element];
      for (let next = element.nextElementSibling; next && !next.matches('h3'); next = next.nextElementSibling) block.push(next);
      return block;
    }

    function buildToc() {
      content.querySelector('.page-toc')?.remove();
      const units = pageUnits(content);
      if (units.length < 4) return;
      const toc = document.createElement('nav');
      toc.className = 'page-toc';
      toc.setAttribute('aria-label', 'Nesta página');
      toc.innerHTML = `<span class="page-toc-label">Nesta página</span>${units.map((unit, index) => `<button type="button" data-toc-index="${index}">${escapeHtml(unitTitle(unit))}</button>`).join('')}`;
      content.querySelector('.lede').after(toc);
    }

    // A busca pula direto (consulta rápida); os chips do índice rolam suavemente.
    function focusUnit(unit, term, smooth = false) {
      if (!unit) return;
      const details = unit.matches('details') ? unit : unit.closest('details');
      if (details) details.open = true;
      const block = unitBlock(unit);
      if (term) highlightTerm(block, term);
      // Numa seção longa (uma tabela grande, por exemplo), o termo pode estar fora da tela: centraliza nele.
      const firstMark = term ? block.map(element => element.querySelector('mark')).find(Boolean) : null;
      const markIsFar = firstMark && firstMark.getBoundingClientRect().top - unit.getBoundingClientRect().top > window.innerHeight / 2;
      if (markIsFar) firstMark.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
      else unit.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      block.forEach(element => {
        element.classList.remove('flash');
        void element.offsetWidth;
        element.classList.add('flash');
      });
    }

    function highlightTerm(elements, term) {
      const needle = foldForSearch(term.trim());
      const size = Array.from(needle).length;
      if (!size) return;
      elements.forEach(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
          if (node.parentElement.closest('mark, select, option, button')) return;
          const characters = Array.from(node.data);
          const folded = foldForSearch(node.data);
          let from = 0;
          let at = folded.indexOf(needle);
          if (at < 0) return;
          const fragment = document.createDocumentFragment();
          while (at >= 0) {
            fragment.append(characters.slice(from, at).join(''));
            const mark = document.createElement('mark');
            mark.textContent = characters.slice(at, at + size).join('');
            fragment.append(mark);
            from = at + size;
            at = folded.indexOf(needle, from);
          }
          fragment.append(characters.slice(from).join(''));
          node.replaceWith(fragment);
        });
      });
    }

    let tocFrame = 0;
    window.addEventListener('scroll', () => {
      if (tocFrame) return;
      tocFrame = requestAnimationFrame(() => {
        tocFrame = 0;
        const toc = content.querySelector('.page-toc');
        if (!toc) return;
        const limit = toc.getBoundingClientRect().bottom + 24;
        let current = -1;
        pageUnits(content).forEach((unit, index) => { if (unit.getBoundingClientRect().top <= limit) current = index; });
        toc.querySelectorAll('[data-toc-index]').forEach(chip => {
          const active = Number(chip.dataset.tocIndex) === current;
          if (active && !chip.classList.contains('active')) toc.scrollTo({ left: chip.offsetLeft - toc.clientWidth / 3, behavior: 'smooth' });
          chip.classList.toggle('active', active);
        });
      });
    }, { passive: true });

    function updateStickyOffset() {
      document.documentElement.style.setProperty('--topbar-h', `${document.querySelector('.topbar').offsetHeight}px`);
    }
    window.addEventListener('resize', updateStickyOffset);

    function setupScreen() {
      const data = window.systemRules && window.systemRules.data;
      const weapon = document.getElementById('dv-weapon');
      const distance = document.getElementById('dv-distance');
      if (!data || !weapon) return;
      const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
      const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ } };
      if (read('night-city-dv-weapon')) weapon.value = read('night-city-dv-weapon');
      if (read('night-city-dv-distance')) distance.value = read('night-city-dv-distance');
      const update = () => {
        const selected = data.rangeDV.find(item => item.id === weapon.value) || data.rangeDV[0];
        const meters = Math.max(0, Number(distance.value) || 0);
        const band = data.rangeBandLimits.findIndex(limit => meters <= limit);
        const dv = band < 0 ? null : selected.dv[band];
        const autofire = selected.autofire ? (band < 0 ? null : selected.autofire[band] ?? null) : undefined;
        document.getElementById('dv-result').innerHTML = dv === null
          ? '<span class="dv-big">Fora de alcance</span>'
          : `<span class="dv-big">DV ${dv}</span><span>${data.rangeBands[band]}</span>${autofire !== undefined ? `<span>Autofogo: ${autofire === null ? 'fora de alcance' : `DV ${autofire}`}</span>` : ''}<span class="note-status">Alvo com REF 8+ pode trocar a DV por DEX + Evasão + 1d10.</span>`;
        document.getElementById('dv-row').innerHTML = `<div class="table-wrap dense"><table><thead><tr>${data.rangeBands.map((label, index) => `<th class="${index === band ? 'current' : ''}">${label}</th>`).join('')}</tr></thead><tbody><tr>${selected.dv.map((value, index) => `<td class="num ${index === band ? 'current' : ''}">${value === null ? '—' : value}</td>`).join('')}</tr></tbody></table></div>`;
        write('night-city-dv-weapon', weapon.value);
        write('night-city-dv-distance', distance.value);
      };
      weapon.onchange = update;
      distance.oninput = update;
      update();
    }

    function rollCritical(kind) {
      const data = window.systemRules && window.systemRules.data;
      const output = document.getElementById('crit-result');
      if (!data || !output) return;
      const rows = kind === 'head' ? data.critHead : data.critBody;
      const first = 1 + Math.floor(Math.random() * 6);
      const second = 1 + Math.floor(Math.random() * 6);
      const [roll, name, effect, quick, treatment] = rows.find(row => row[0] === first + second);
      output.innerHTML = `<p class="crit-roll">${kind === 'head' ? 'Cabeça' : 'Corpo'}: ${first} + ${second} = <b>${roll}</b></p><h4>${name}</h4><p>${effect}</p><p><b>Correção rápida:</b> ${quick}<br><b>Tratamento:</b> ${treatment}</p><p class="note-status">+5 de dano direto no HP. Se o alvo já tem essa lesão, role de novo.</p>`;
    }

    function setupSkills() {
      const table = document.getElementById('skill-table');
      const filter = document.getElementById('skill-filter');
      const chips = document.getElementById('skill-stat-filter');
      if (!table) return;
      let stat = 'all';
      const apply = () => {
        const needle = foldForSearch(filter.value.trim());
        table.querySelectorAll('tbody tr').forEach(row => {
          row.hidden = (stat !== 'all' && row.dataset.stat !== stat) || (needle && !foldForSearch(row.textContent).includes(needle));
        });
      };
      chips.onclick = event => {
        const chip = event.target.closest('[data-skill-stat]');
        if (!chip) return;
        stat = chip.dataset.skillStat;
        chips.querySelectorAll('[data-skill-stat]').forEach(item => item.setAttribute('aria-pressed', String(item === chip)));
        apply();
      };
      filter.oninput = apply;
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    }

    function renderInlineMarkdown(text) {
      return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<i>$2</i>');
    }

    // Conversor mínimo para os documentos da campanha: títulos, parágrafos, listas, tabelas, citações e linhas.
    function renderMarkdown(source) {
      const lines = source.replace(/\r/g, '').split('\n');
      const isBlockStart = line => /^(#{1,4}\s|\||>|\s*[-*]\s+|\s*\d+\.\s+|---+\s*$)/.test(line);
      const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      let html = '';
      let index = 0;
      while (index < lines.length) {
        const line = lines[index];
        let match;
        if (!line.trim()) { index++; continue; }
        if ((match = line.match(/^(#{1,4})\s+(.*)$/))) {
          const tag = ['h3', 'h3', 'h4', 'h5'][match[1].length - 1];
          html += `<${tag} class="md-h${match[1].length}">${renderInlineMarkdown(match[2])}</${tag}>`;
          index++;
        } else if (/^---+\s*$/.test(line)) {
          html += '<hr class="rule">';
          index++;
        } else if (line.startsWith('|')) {
          const rows = [];
          while (index < lines.length && lines[index].startsWith('|')) rows.push(lines[index++]);
          const body = rows.slice(1).filter(row => !/^\|[\s:|-]+\|?\s*$/.test(row));
          html += `<div class="table-wrap"><table><thead><tr>${cells(rows[0]).map(cell => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${cells(row).map(cell => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        } else if (line.startsWith('>')) {
          const quote = [];
          while (index < lines.length && lines[index].startsWith('>')) quote.push(lines[index++].replace(/^>\s?/, ''));
          html += `<blockquote>${quote.map(item => item.trim() ? renderInlineMarkdown(item) : '').join('<br>').replace(/(<br>){2,}/g, '<br><br>')}</blockquote>`;
        } else if ((match = line.match(/^\s*([-*]|\d+\.)\s+/))) {
          const ordered = /\d/.test(match[1]);
          const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
          const items = [];
          while (index < lines.length && pattern.test(lines[index])) items.push(lines[index++].replace(pattern, ''));
          const tag = ordered ? 'ol' : 'ul';
          html += `<${tag}>${items.map(item => `<li>${renderInlineMarkdown(item.replace(/^\[ \]\s*/, '☐ ').replace(/^\[x\]\s*/i, '☑ '))}</li>`).join('')}</${tag}>`;
        } else {
          const paragraph = [];
          while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
          html += `<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`;
        }
      }
      return html;
    }

    function loadMarkdownDoc(id) {
      if (markdownCache[id]) return Promise.resolve(markdownCache[id]);
      return fetch(encodeURI(markdownDocs[id].file), { cache: 'no-store' })
        .then(response => { if (!response.ok) throw new Error(response.status); return response.text(); })
        .then(text => (markdownCache[id] = text));
    }

    // O primeiro título do arquivo repete o título da página.
    const stripDocTitle = text => text.replace(/^﻿?#\s+.*\n/, '');

    function showMarkdownDoc(id, target) {
      loadMarkdownDoc(id).then(text => {
        const container = document.getElementById('md-doc');
        if (currentPage !== id || !container) return;
        container.innerHTML = renderMarkdown(stripDocTitle(text));
        buildToc();
        if (target && target.unit !== undefined) focusUnit(searchUnits(content)[target.unit], target.term);
      }).catch(() => {
        const container = document.getElementById('md-doc');
        if (container) container.innerHTML = `<div class="callout"><b>Não foi possível ler ${escapeHtml(markdownDocs[id].file)}.</b> Os documentos completos são lidos direto dos arquivos .md, e o navegador bloqueia isso quando a wiki é aberta com dois cliques. Abra pelo servidor local: rode <code>node server.js</code> nesta pasta e acesse <code>http://localhost:8000</code>.</div>`;
      });
    }

    function setupClock(name, storageKey) {
      const element = document.getElementById(`clock-${name}`);
      const steps = (config.clocks || {})[name] || [];
      const read = () => { try { return Number(localStorage.getItem(storageKey)) || 0; } catch { return 0; } };
      const render = () => {
        const value = read();
        element.innerHTML = steps.map((step, index) => `<button type="button" class="clock-segment" data-clock-index="${index}" aria-pressed="${index < value}"><span>${index + 1}</span>${escapeHtml(step)}</button>`).join('');
      };
      element.onclick = event => {
        const segment = event.target.closest('[data-clock-index]');
        if (!segment) return;
        const index = Number(segment.dataset.clockIndex);
        const next = read() === index + 1 ? index : index + 1;
        try { localStorage.setItem(storageKey, String(next)); } catch { /* armazenamento indisponível */ }
        render();
      };
      render();
    }

    function setupNotes() {
      // Um relógio para cada entrada de config.clocks que tenha um elemento #clock-nome na página.
      Object.keys(config.clocks || {}).forEach(name => {
        if (document.getElementById(`clock-${name}`)) setupClock(name, `night-city-clock-${name}-${activeCampaignId}`);
      });
      const input = document.getElementById('session-note');
      const status = document.getElementById('note-status');
      const key = `night-city-fieldbook-notes-${activeCampaignId}`;
      input.value = localStorage.getItem(key) || '';
      input.addEventListener('input', () => {
        localStorage.setItem(key, input.value);
        status.textContent = 'Salvo automaticamente neste navegador.';
      });
      document.getElementById('clear-notes').addEventListener('click', () => {
        input.value = '';
        localStorage.removeItem(key);
        status.textContent = 'Notas removidas deste navegador.';
      });
    }

    function setCampaignMapView(view) {
      const svg = document.getElementById('nightcity-map');
      if (!svg) return;
      campaignMapView = view;
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    }

    function focusCampaignMapMarker(marker, zoomIn = true) {
      const width = zoomIn ? Math.min(campaignMapView.width, 2400) : campaignMapView.width;
      const height = width * (mapData().height / mapData().width);
      setCampaignMapView({
        x: Math.max(0, Math.min(mapData().width - width, marker.x - width / 2)),
        y: Math.max(0, Math.min(mapData().height - height, marker.y - height / 2)),
        width,
        height
      });
    }

    function showCampaignMapMarker(markerId, focus = true) {
      const marker = mapData().markers.find(item => item.id === markerId);
      if (!marker) return;
      document.querySelectorAll('.map-pin, .map-marker-card').forEach(item => item.classList.toggle('selected', item.dataset.mapMarker === markerId));
      const category = mapData().categories[marker.category];
      // Na visão dos jogadores, o ponto traz só um texto público (detail); na do mestre, os campos completos.
      if (marker.detail !== undefined) { document.getElementById('map-marker-detail').innerHTML = `<p class="eyebrow">${category.label}</p><h3>${escapeHtml(marker.title)}</h3><p class="map-district">${escapeHtml(marker.district || '')}</p>${renderMarkdown(marker.detail || '')}`; if (focus) focusCampaignMapMarker(marker); return; }
      document.getElementById('map-marker-detail').innerHTML = `<p class="eyebrow">${category.label}</p><h3>${marker.title}</h3><p class="map-district">${marker.district}</p><p><span class="map-act">${marker.act}</span></p><p>${marker.summary}</p><p><b>Gancho:</b> ${marker.hook}</p><p><b>Encontro:</b> ${marker.encounter}</p><p><b>Pista:</b> ${marker.clue}</p>${marker.note ? `<div class="callout"><b>Nota de continuidade:</b> ${marker.note}</div>` : ''}`;
      if (focus) focusCampaignMapMarker(marker);
    }

    function applyCampaignMapFilters() {
      let firstVisible = null;
      mapData().markers.forEach(marker => {
        const actMatches = campaignMapAct === 'all' || (marker.act || '').includes(campaignMapAct);
        const visible = (campaignMapCategory === 'all' || marker.category === campaignMapCategory) && actMatches;
        document.querySelector(`.map-pin[data-map-marker="${marker.id}"]`)?.classList.toggle('filtered-out', !visible);
        document.querySelector(`.map-marker-card[data-map-marker="${marker.id}"]`)?.classList.toggle('hidden', !visible);
        if (visible && !firstVisible) firstVisible = marker;
      });
      const selected = mapData().markers.find(marker => document.querySelector(`.map-pin[data-map-marker="${marker.id}"]`)?.classList.contains('selected'));
      if (selected && !document.querySelector(`.map-marker-card[data-map-marker="${selected.id}"]`)?.classList.contains('hidden')) return;
      if (firstVisible) showCampaignMapMarker(firstVisible.id, false);
      else document.getElementById('map-marker-detail').innerHTML = '<h3>Nenhum ponto neste filtro</h3><p>Altere o ato ou o tipo de local para ver outras operações.</p>';
    }

    function setupCampaignMap() {
      const data = mapData();
      if (!data) return;
      const svg = document.getElementById('nightcity-map');
      const pinLayer = document.getElementById('nightcity-map-pins');
      const markerList = document.getElementById('map-marker-list');
      const image = document.getElementById('nightcity-map-image');
      const escapeText = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
      campaignMapCategory = 'all';
      campaignMapAct = 'all';
      campaignMapView = { x: 0, y: 0, width: data.width, height: data.height };
      image.setAttribute('href', data.images.base);
      const mapSource = document.getElementById('map-source');
      const actFilter = document.getElementById('map-act-filter');
      if (mapSource) mapSource.value = 'base';
      pinLayer.innerHTML = data.markers.map(marker => {
        const category = data.categories[marker.category];
        return `<g class="map-pin" data-map-marker="${marker.id}" tabindex="0" role="button" aria-label="${escapeText(marker.title)}, ${escapeText(marker.district)}" transform="translate(${marker.x} ${marker.y})"><title>${escapeText(marker.title)} — ${escapeText(marker.district)}</title><circle class="pin-core" cx="0" cy="0" r="62" fill="${category.color}"></circle><text class="pin-code" x="0" y="2">${escapeText(marker.code)}</text><text class="pin-label" x="82" y="14">${escapeText(marker.title)}</text></g>`;
      }).join('');
      markerList.innerHTML = data.markers.map(marker => `<button type="button" class="map-marker-card" data-map-marker="${marker.id}"><span class="map-marker-dot" style="background:${data.categories[marker.category].color}"></span><span><strong>${escapeText(marker.title)}</strong><small>${escapeText(marker.district)}${marker.act ? ` / ${escapeText(marker.act)}` : ''}</small></span></button>`).join('');
      document.getElementById('map-legend').innerHTML = Object.entries(data.categories).map(([id, category]) => `<span class="map-legend-item"><i class="map-legend-swatch" style="background:${category.color}"></i>${escapeText(category.label)}</span>`).join('');
      document.getElementById('map-filters').innerHTML = `<button type="button" class="map-filter" data-map-category="all" aria-pressed="true">Todos</button>${Object.entries(data.categories).map(([id, category]) => `<button type="button" class="map-filter" data-map-category="${id}" aria-pressed="false">${escapeText(category.label)}</button>`).join('')}`;
      if (actFilter) actFilter.value = 'all';
      setCampaignMapView(campaignMapView);

      if (mapSource) mapSource.onchange = event => image.setAttribute('href', data.images[event.target.value]);
      if (actFilter) actFilter.onchange = event => { campaignMapAct = event.target.value; applyCampaignMapFilters(); };
      document.getElementById('map-filters').onclick = event => {
        const button = event.target.closest('[data-map-category]');
        if (!button) return;
        campaignMapCategory = button.dataset.mapCategory;
        document.querySelectorAll('.map-filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        applyCampaignMapFilters();
      };
      document.getElementById('map-marker-list').onclick = event => {
        const button = event.target.closest('[data-map-marker]');
        if (button) showCampaignMapMarker(button.dataset.mapMarker);
      };
      pinLayer.onclick = event => {
        const pin = event.target.closest('[data-map-marker]');
        if (pin) showCampaignMapMarker(pin.dataset.mapMarker);
      };
      pinLayer.onkeydown = event => {
        const pin = event.target.closest('[data-map-marker]');
        if (pin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showCampaignMapMarker(pin.dataset.mapMarker); }
      };
      document.querySelectorAll('[data-map-action]').forEach(button => button.onclick = () => {
        if (button.dataset.mapAction === 'reset') return setCampaignMapView({ x: 0, y: 0, width: data.width, height: data.height });
        const factor = button.dataset.mapAction === 'zoom-in' ? 0.72 : 1 / 0.72;
        const width = Math.max(750, Math.min(data.width, campaignMapView.width * factor));
        const height = width * (data.height / data.width);
        const centerX = campaignMapView.x + campaignMapView.width / 2;
        const centerY = campaignMapView.y + campaignMapView.height / 2;
        setCampaignMapView({ x: Math.max(0, Math.min(data.width - width, centerX - width / 2)), y: Math.max(0, Math.min(data.height - height, centerY - height / 2)), width, height });
      });

      let dragStart = null;
      svg.onpointerdown = event => {
        if (event.target.closest('.map-pin')) return;
        dragStart = { x: event.clientX, y: event.clientY, view: { ...campaignMapView } };
        svg.classList.add('is-dragging');
        svg.setPointerCapture(event.pointerId);
      };
      svg.onpointermove = event => {
        if (!dragStart) return;
        const rect = svg.getBoundingClientRect();
        const dx = (event.clientX - dragStart.x) * dragStart.view.width / rect.width;
        const dy = (event.clientY - dragStart.y) * dragStart.view.height / rect.height;
        setCampaignMapView({ ...dragStart.view, x: Math.max(0, Math.min(data.width - dragStart.view.width, dragStart.view.x - dx)), y: Math.max(0, Math.min(data.height - dragStart.view.height, dragStart.view.y - dy)) });
      };
      const endDrag = () => { dragStart = null; svg.classList.remove('is-dragging'); };
      svg.onpointerup = endDrag;
      svg.onpointercancel = endDrag;
      svg.onwheel = event => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 0.84 : 1 / 0.84;
        const width = Math.max(750, Math.min(data.width, campaignMapView.width * factor));
        const height = width * (data.height / data.width);
        const centerX = campaignMapView.x + campaignMapView.width / 2;
        const centerY = campaignMapView.y + campaignMapView.height / 2;
        setCampaignMapView({ x: Math.max(0, Math.min(data.width - width, centerX - width / 2)), y: Math.max(0, Math.min(data.height - height, centerY - height / 2)), width, height });
      };
      applyCampaignMapFilters();
    }

    // Normaliza caractere por caractere para manter as posições do texto original no trecho exibido.
    function foldForSearch(text) {
      return Array.from(text, character => character.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').charAt(0) || character).join('');
    }

    // Índice de busca por seção: cada unidade de cada página vira uma entrada.
    let searchIndex = null;

    function buildSearchIndex() {
      const entries = [];
      const strip = html => String(html).replace(/<[^>]*>/g, ' ');
      Object.entries(pageContent).forEach(([id, page]) => {
        if (markdownDocs[id] && !markdownCache[id]) return;
        const holder = document.createElement('div');
        // Espaço entre as tags para o texto de blocos vizinhos não grudar no trecho exibido.
        holder.innerHTML = (markdownDocs[id] ? `<div id="md-doc">${renderMarkdown(stripDocTitle(markdownCache[id]))}</div>` : page.html).replace(/></g, '> <');
        const pageTitle = strip(page.title).replace(/\s+/g, ' ').trim();
        const units = searchUnits(holder);
        // O texto de uma seção não inclui os cartões dela: cada cartão é uma entrada própria.
        const ownText = unit => {
          if (!unit.querySelector('.entry')) return unitBlock(unit).map(element => element.textContent).join(' ');
          const copy = unit.cloneNode(true);
          copy.querySelectorAll('.entry').forEach(card => card.remove());
          return copy.textContent;
        };
        units.forEach((unit, index) => {
          const parent = unit.matches('.entry') ? unit.parentElement.closest(unitSelector) : null;
          entries.push({ id, unit: index, pageTitle: parent ? `${pageTitle} › ${unitTitle(parent)}` : pageTitle, title: unitTitle(unit), text: ownText(unit) });
        });
        pageUnits(holder).forEach(unit => unitBlock(unit).forEach(element => element.remove()));
        const mapTerms = mapPages.includes(id) && mapData() ? mapData().markers.map(marker => [marker.title, marker.district, marker.act, marker.summary, marker.hook, marker.encounter, marker.clue, marker.detail].filter(Boolean).join(' ')).join(' ') : '';
        entries.push({ id, unit: null, pageTitle, title: '', text: `${strip(page.eyebrow)} ${pageTitle} ${strip(page.lede)} ${holder.textContent} ${mapTerms}` });
      });
      return entries.map(entry => {
        const text = entry.text.replace(/\s+/g, ' ').trim();
        return { ...entry, characters: Array.from(text), folded: foldForSearch(text), foldedTitle: foldForSearch(`${entry.pageTitle} ${entry.title}`) };
      });
    }

    function searchPages(query) {
      const needle = foldForSearch(query.trim());
      if (!needle) { openPage(currentPage); return; }
      searchIndex = searchIndex || buildSearchIndex();
      const size = Array.from(needle).length;
      const matches = searchIndex.flatMap(entry => {
        const at = entry.folded.indexOf(needle);
        if (at < 0) return [];
        // Título da seção primeiro, depois o texto das seções, por último o texto solto da página.
        return [{ entry, at, score: entry.foldedTitle.includes(needle) ? 0 : entry.unit === null ? 2 : 1 }];
      }).sort((first, second) => first.score - second.score);
      const shown = matches.slice(0, 60);
      const excerpt = ({ entry, at }) => {
        const start = Math.max(0, at - 70);
        const end = Math.min(entry.characters.length, at + size + 110);
        const slice = (from, to) => escapeHtml(entry.characters.slice(from, to).join(''));
        return `${start ? '…' : ''}${slice(start, at)}<mark>${slice(at, at + size)}</mark>${slice(at + size, end)}${end < entry.characters.length ? '…' : ''}`;
      };
      content.innerHTML = `<p class="eyebrow">Busca local / ${matches.length} trecho(s)${matches.length > shown.length ? ` · mostrando ${shown.length}` : ''}</p><h2>Resultados</h2><p class="lede"><b>Enter</b> abre o primeiro resultado já na seção certa. <b>Esc</b> volta para a página.</p><div class="search-results">${shown.map(match => `<button class="result" data-page="${match.entry.id}"${match.entry.unit === null ? '' : ` data-unit="${match.entry.unit}"`} data-term="${escapeHtml(query.trim())}" type="button"><small>${escapeHtml(match.entry.pageTitle)}</small><strong>${escapeHtml(match.entry.title || match.entry.pageTitle)}</strong><p>${excerpt(match)}</p></button>`).join('') || '<div class="empty">Nenhuma entrada encontrada. Tente outro nome, em português ou inglês.</div>'}</div>`;
      document.querySelectorAll('.nav-item').forEach(button => button.classList.remove('active'));
    }

    document.addEventListener('click', event => {
      const workspaceTab = event.target.closest('[data-workspace]');
      if (workspaceTab) {
        setWorkspace(workspaceTab.dataset.workspace);
        const defaultPage = workspaceTab.dataset.workspace === 'campaigns' ? (config.homePage || 'home') : 'screen';
        if (pageWorkspace[currentPage] !== currentWorkspace) openPage(defaultPage);
        return;
      }
      const tocChip = event.target.closest('[data-toc-index]');
      if (tocChip) { focusUnit(pageUnits(content)[Number(tocChip.dataset.tocIndex)], undefined, true); return; }
      const critButton = event.target.closest('[data-crit]');
      if (critButton) { rollCritical(critButton.dataset.crit); return; }
      const button = event.target.closest('[data-page]');
      if (button) openPage(button.dataset.page, button.dataset.unit === undefined ? undefined : { unit: Number(button.dataset.unit), term: button.dataset.term });
    });
    document.addEventListener('keydown', event => {
      const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');
      if ((event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        search.focus();
        search.select();
      }
    });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') { openPage(currentPage); search.blur(); }
      if (event.key === 'Enter') {
        const first = content.querySelector('.result');
        if (first) { event.preventDefault(); first.click(); search.blur(); }
      }
    });
    navigation.addEventListener('change', event => {
      if (event.target.id !== 'campaign-picker') return;
      activeCampaignId = event.target.value;
      storage.set('active-campaign', activeCampaignId);
      buildNavigation();
      openPage(campaigns.find(campaign => campaign.id === activeCampaignId).groups[0].pages[0].id);
    });
    search.addEventListener('input', () => searchPages(search.value));
    if (!['campaigns', 'system'].includes(currentWorkspace)) currentWorkspace = 'campaigns';
    updateStickyOffset();
    buildNavigation();
    openPage(config.homePage || 'home');
    // Pré-carrega os documentos para a busca encontrar o texto completo deles.
    if (Object.keys(markdownDocs).length) Promise.allSettled(Object.keys(markdownDocs).map(loadMarkdownDoc)).then(() => {
      searchIndex = null;
      if (search.value.trim()) searchPages(search.value);
    });

    // Atualiza páginas já carregadas (a visão dos jogadores recebe as novidades do mestre sem recarregar).
    function updatePages(pages) {
      Object.assign(pageContent, pages);
      searchIndex = null;
      if (pages[currentPage] && !search.value.trim()) {
        const scroll = window.scrollY;
        openPage(currentPage);
        window.scrollTo({ top: scroll });
      }
    }

    window.wikiApp = { openPage, updatePages, escapeHtml, renderMarkdown, setupMap: setupCampaignMap, currentPage: () => currentPage };
})();
