// Motor da wiki: menu, busca por seção, índice "Nesta página", ferramentas de mesa e mapa.
// É o mesmo para a visão do mestre (index.html) e a dos jogadores (jogadores.html).
// O conteúdo da campanha vem de window.wikiConfig; as regras, dos arquivos system-*.js.
(() => {
  const config = window.wikiConfig || {};
  const campaigns = config.campaigns || [];
  const markdownDocs = config.markdownDocs || {};
  const markdownCache = {};
  const storagePrefix = config.storagePrefix || 'night-city';
  const localGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const localSet = (key, value) => { try { if (value === null || value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ } };

  // ---------------- Preferências na conta ----------------
  // Fixadas, grupos recolhidos, barra compacta e recentes acompanham a conta (o jogador, ou o mestre): ficam no
  // servidor (api/eu/preferencias) e numa cópia no aparelho, e valem iguais no celular e no computador. Visitante e
  // wiki sem servidor: só no aparelho. O que o aparelho já tinha e a conta ainda não sobe na primeira vez.
  // O menu da conta e a visão dos jogadores guardam aqui as deles (wikiApp.prefs) e ouvem "wiki:preferencias",
  // quando o servidor responde.
  const SYNCED = ['fixadas', 'grupos-fechados', 'grupos-abertos', 'barra-compacta', 'recentes'];
  const prefs = (() => {
    let owner = localGet('night-city-dono') || 'aparelho'; // a conta do último que entrou neste aparelho
    let server = null; // null = sem conta (ou ainda não leu)
    let pending = {};
    let early = {}; // gravado antes de o servidor responder: entra na conta quando ele responder (se ela ainda não tiver)
    let timer = null;
    const localKey = key => `night-city-pref-${owner}-${key}`;
    // keepalive: o pedido sobrevive à página sendo fechada ou recarregada (o que mudou logo antes não se perde).
    function flush() {
      clearTimeout(timer);
      timer = null;
      const valores = pending;
      pending = {};
      if (!Object.keys(valores).length) return Promise.resolve();
      return fetch('api/eu/preferencias', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valores }), cache: 'no-store', keepalive: true })
        .then(response => {
          // A conta saiu (deste ou de outro aparelho): para de mandar; fica só no aparelho.
          if (response.status === 401) { server = null; pending = {}; return; }
          if (!response.ok) throw new Error(response.status);
        })
        .catch(() => { if (server) pending = { ...valores, ...pending }; }); // sem rede: tenta na próxima mudança
    }
    const schedule = () => { if (server && !timer) timer = setTimeout(flush, 800); };
    const put = (key, value) => { if (!server) { early[key] = value; return; } if (value === null || value === undefined) delete server[key]; else server[key] = value; pending[key] = value === undefined ? null : value; schedule(); };
    return {
      get(key) {
        if (server && key in server) return server[key];
        const raw = localGet(localKey(key));
        if (raw === null) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      },
      set(key, value) { localSet(localKey(key), value === null || value === undefined ? null : JSON.stringify(value)); put(key, value); },
      // As chaves da própria wiki (SYNCED): no servidor como "<prefixo>:<chave>"; no aparelho, com o nome de sempre.
      rawGet: key => (server && `${storagePrefix}:${key}` in server ? server[`${storagePrefix}:${key}`] : undefined),
      rawSet: (key, value) => put(`${storagePrefix}:${key}`, value),
      async load() {
        if (location.protocol === 'file:') return;
        let data = null;
        try { const response = await fetch('api/eu/preferencias', { cache: 'no-store' }); if (response.ok) data = await response.json(); } catch { /* sem rede */ }
        if (!data || !data.dono) return; // visitante: só no aparelho
        owner = data.dono;
        localSet('night-city-dono', owner);
        server = { ...(data.valores || {}) };
        for (const [key, value] of Object.entries(early)) if (!(key in server) && value !== null && value !== undefined) { server[key] = value; pending[key] = value; }
        early = {};
        for (const key of SYNCED) {
          const name = `${storagePrefix}:${key}`;
          const raw = localGet(`${storagePrefix}-${key}`);
          if (name in server) localSet(`${storagePrefix}-${key}`, server[name]);
          else if (raw !== null && raw !== '') { server[name] = raw; pending[name] = raw; }
        }
        schedule();
        document.dispatchEvent(new CustomEvent('wiki:preferencias'));
      },
      loaded: () => Boolean(server),
      flush: () => { if (server) flush(); },
      // Sair da conta: manda o que falta e para de sincronizar (o que vier depois fica só no aparelho).
      forget: () => { const last = server ? flush() : Promise.resolve(); server = null; pending = {}; early = {}; return last; }
    };
  })();
  // Fechar, recarregar ou trocar de aba: manda o que falta.
  window.addEventListener('pagehide', () => prefs.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') prefs.flush(); });
  const storage = {
    get: key => { const synced = SYNCED.includes(key) ? prefs.rawGet(key) : undefined; return synced !== undefined ? synced : localGet(`${storagePrefix}-${key}`); },
    set: (key, value) => { localSet(`${storagePrefix}-${key}`, value); if (SYNCED.includes(key)) prefs.rawSet(key, value); }
  };
  const mapPages = ['campaignMap', ...(config.mapPages || [])];
  const mapData = () => (config.mapData ? config.mapData() : window.campaignMapData);

  const systemSections = [
    { group: 'Na mesa', pages: [
      { id: 'screen', label: 'Escudo do mestre', icon: 'GM' },
      { id: 'skills', label: 'Perícias por STAT', icon: 'SK' },
      { id: 'npcs', label: 'Fichas de NPC', icon: 'NPC' },
      { id: 'encounters', label: 'Encontros de 2077', icon: 'EN' },
      { id: 'glossary', label: 'Glossário', icon: 'G' },
      { id: 'indice', label: 'Índice A–Z', icon: 'AZ' }
    ]},
    { group: 'Regras', pages: [
      { id: 'checks', label: 'Testes e dificuldades', icon: 'R' },
      { id: 'combat', label: 'Combate', icon: 'C' },
      { id: 'damage', label: 'Dano, ferimentos e cura', icon: 'D' },
      { id: 'humanity', label: 'Humanidade e drogas', icon: 'H' },
      { id: 'economy', label: 'Economia', icon: 'EB' },
      { id: 'roles', label: 'Roles', icon: 'F' },
      { id: 'creation', label: 'Criação de personagens', icon: 'P' },
      { id: 'lifepath', label: 'Lifepath', icon: 'LP' },
      { id: 'advancement', label: 'Avanço e Pontos de Melhoria', icon: 'IP' }
    ]},
    { group: 'Netrunning', pages: [
      { id: 'netrunning', label: 'Regras de netrunning', icon: 'N' },
      { id: 'quickhacks', label: 'Quickhacks', icon: 'QH' },
      { id: 'netArsenal', label: 'Arsenal: ICE, programas, upgrades', icon: 'ICE' }
    ]},
    { group: 'Catálogos', pages: [
      { id: 'weapons2077', label: 'Armas de 2077', icon: 'W' },
      { id: 'cyberware2077', label: 'Cyberware de 2077', icon: 'CW' },
      { id: 'cyberware', label: 'Cyberware do RED', icon: 'K' },
      { id: 'gear', label: 'Armas e equipamento do RED', icon: 'E' }
    ]},
    { group: 'Black Chrome', pages: [
      { id: 'bcGuia', label: 'Como usar o Black Chrome', icon: 'BC' },
      { id: 'bcArmas', label: 'Armas', icon: 'BW' },
      { id: 'bcCyberware', label: 'Cyberware', icon: 'BCW' },
      { id: 'bcModa', label: 'Moda e armadura', icon: 'BM' },
      { id: 'bcEquipamento', label: 'Equipamento e apps', icon: 'BE' },
      { id: 'bcQuadros', label: 'Quadros lineares', icon: 'LF' },
      { id: 'bcVeiculos', label: 'Veículos', icon: 'BV' },
      { id: 'bcMercados', label: 'Mercados Noturnos', icon: 'NM' }
    ]},
    { group: 'Fontes', pages: [
      { id: 'supplement2077', label: 'Suplemento de fã', icon: '77' },
      { id: 'sources', label: 'Livros de referência', icon: 'L' }
    ]}
  ];

  // Páginas de regra que viraram parte de outra quando as regras foram unificadas (Mission Kit sobre o RED; do suplemento
  // de fã, só os itens aprovados): o endereço antigo continua abrindo. Cada wiki pode somar os dela (config.aliases).
  const aliases = {
    net2077: { id: 'netrunning', section: 'quickhacks-no-neuroport' },
    roles2077: { id: 'roles', section: 'nos-anos-2070' },
    os2077: { id: 'cyberware2077', section: 'berserk-e-sandevistan' },
    ...(config.aliases || {})
  };
  const pageContent = Object.assign({}, window.systemCatalog || {}, (window.systemRules || {}).pages || {}, (window.systemNet || {}).pages || {}, (window.system2077 || {}).pages || {}, (window.systemBlackChrome || {}).pages || {}, (window.systemGlossary || {}).pages || {}, (window.characterCreator || {}).pages || {}, config.pageContent || {});
  Object.entries(markdownDocs).forEach(([id, doc]) => {
    pageContent[id] = { eyebrow: doc.eyebrow, title: doc.title, lede: doc.lede, html: `<div class="md-doc" id="md-doc">Carregando ${doc.file}…</div>` };
  });
  applyGmNotes(config.gmNotes || []);
  // Índice A–Z: montado na hora a partir do índice de busca (setupIndex).
  pageContent.indice = {
    eyebrow: 'Na mesa / tudo que tem cartão', title: 'Índice A–Z',
    lede: 'Todos os itens da wiki numa lista só: armas, cyberware, programas, ICE, quickhacks, pessoas e fichas. Digite para filtrar e clique para abrir o cartão.',
    html: '<div class="section" data-toc="Filtrar"><h3>Filtrar</h3><label class="skill-search"><input id="index-filter" type="search" placeholder="Nome, tipo ou página" autocomplete="off"></label><p class="note-status" id="index-count"></p></div><div id="index-list"></div>'
  };
  // Uma entrada do menu pode reunir várias páginas em abas (tabs: [{ id, label }]): só a entrada aparece na barra
  // lateral, e cada página ganha a barra de abas no topo. As páginas continuam com o próprio endereço e na busca.
  const withTabs = page => [page.id, ...(page.tabs || []).map(tab => tab.id).filter(id => id !== page.id)];
  const pageWorkspace = Object.fromEntries([
    ...campaigns.flatMap(campaign => campaign.groups.flatMap(group => group.pages.flatMap(page => withTabs(page).map(id => [id, 'campaigns'])))),
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
    let campaignMapBounds = { ...campaignMapView };
    let campaignMapTiles = null;
    let campaignMapCleanup = null;
    let campaignMapUI = null;
    let campaignMapSelected = null;
    let campaignMapQuery = '';

    // ---------------- Campanha ativa ----------------
    // Cada campanha tem as suas páginas (config.campaigns[].groups). A página inicial é config.homePage se a campanha
    // a tiver; senão, a primeira dela. Trocar de campanha muda a cor e o nome no topo e avisa as páginas (evento
    // "wiki:campanha"), que recarregam o que é da campanha (personagens, loja, Publicar).
    const activeCampaign = () => campaigns.find(item => item.id === activeCampaignId) || campaigns[0] || null;
    const pagesOf = campaign => (campaign ? campaign.groups.flatMap(group => group.pages.flatMap(withTabs)) : []);
    // A entrada do menu que tem esta página como aba (a da campanha ativa primeiro); null se a página não é aba.
    function tabHost(id) {
      for (const campaign of [activeCampaign(), ...campaigns].filter(Boolean)) {
        for (const group of campaign.groups) for (const page of group.pages) if (page.tabs && page.tabs.some(tab => tab.id === id)) return page;
      }
      return null;
    }
    // O botão do menu que fica aceso para esta página: o dela, ou o da entrada que a tem como aba.
    const navIdOf = id => (tabHost(id) || { id }).id;
    function homePage() {
      const pages = pagesOf(activeCampaign()).filter(id => pageContent[id]);
      return pages.includes(config.homePage) || !pages.length ? config.homePage || 'home' : pages[0];
    }
    function showCampaign() {
      const campaign = activeCampaign();
      if (!campaign) return;
      document.documentElement.style.setProperty('--campanha-cor', campaign.color || '');
      const meta = document.querySelector('.top-meta');
      if (meta && config.topMeta) meta.textContent = config.topMeta(campaign);
    }
    function setCampaign(id) {
      if (!campaigns.some(item => item.id === id) || id === activeCampaignId) return false;
      activeCampaignId = id;
      storage.set('active-campaign', id);
      // A mesa (relógios e bloco) é de cada campanha: lê a da nova.
      table = null;
      loadTable();
      showCampaign();
      buildNavigation();
      document.dispatchEvent(new CustomEvent('wiki:campanha', { detail: activeCampaign() }));
      return true;
    }

    // ---------------- Barra lateral ----------------
    // Duas áreas, nas abas de cima da barra: Campanhas (os grupos da campanha, o primeiro com o nome dela) e Sistema (os
    // das regras). As fixadas aparecem nas duas. Os grupos recolhem (clique no nome; a conta lembra) e, fechados, mostram
    // quantas páginas têm. Também há os selos de novidade nas páginas (setBadges) e o botão ☰ da barra de cima: no
    // computador deixa a barra compacta (só os ícones); no celular abre a gaveta.
    const narrow = window.matchMedia('(max-width: 820px)');
    const badges = {};
    const readSet = key => { try { return new Set(JSON.parse(storage.get(key) || '[]')); } catch { return new Set(); } };
    const closedGroups = () => readSet('grupos-fechados');
    const openedGroups = () => readSet('grupos-abertos');
    // Começam fechados os grupos das regras que não são de mesa. O que a pessoa abre ou fecha fica como ela deixou.
    const CLOSED_BY_DEFAULT = new Set(['system:Netrunning', 'system:Catálogos', 'system:Black Chrome', 'system:Fontes']);
    const isClosed = (key, closed, opened) => closed.has(key) || (CLOSED_BY_DEFAULT.has(key) && !opened.has(key));
    const compact = () => document.body.classList.contains('sidebar-compact') && !narrow.matches;

    // ---------------- Páginas fixadas ----------------
    // O botão "Fixar" ao lado do título põe a página no grupo Fixadas, no topo da barra lateral (nas duas abas). Até 8; a
    // mais antiga sai quando passa disso.
    const PIN_LIMIT = 8;
    const pinned = () => { try { return JSON.parse(storage.get('fixadas') || '[]').filter(id => pageContent[id]); } catch { return []; } };
    const pinnable = id => Boolean(pageContent[id]) && id !== 'criador';
    // Rótulo e ícone do menu (o mesmo da página no menu dela); página fora do menu usa o título.
    function navEntry(id) {
      for (const group of [...campaigns.flatMap(campaign => campaign.groups), ...systemSections]) {
        const page = group.pages.find(item => item.id === id);
        if (page) return { id, label: page.label, icon: page.icon };
      }
      const host = tabHost(id);
      if (host) return { id, label: `${host.label} › ${host.tabs.find(tab => tab.id === id).label}`, icon: host.icon };
      return { id, label: escapeHtml(String(pageContent[id].title).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()), icon: '★' };
    }
    const pinButton = id => {
      const on = pinned().includes(id);
      return `<button type="button" class="pin-page" data-pin="${id}" aria-pressed="${on}" title="${on ? 'Tirar das fixadas' : 'Fixar no topo da barra lateral'}">${on ? '★ Fixada' : '☆ Fixar'}</button>`;
    };
    function togglePin(id) {
      const list = pinned();
      if (list.includes(id)) list.splice(list.indexOf(id), 1);
      else { list.push(id); if (list.length > PIN_LIMIT) list.shift(); }
      storage.set('fixadas', JSON.stringify(list));
      buildNavigation();
      const button = content.querySelector(`[data-pin="${id}"]`);
      if (button) button.outerHTML = pinButton(id);
    }

    function buildNavigation() {
      const campaign = activeCampaign();
      activeCampaignId = campaign.id;
      // key: a área e o nome original do grupo (o primeiro grupo da campanha aparece com o nome dela). Fixadas: nas duas
      // abas.
      const pins = pinned().map(navEntry);
      const groups = [...(pins.length ? [{ key: 'fixadas', group: 'Fixadas', pages: pins, shared: true }] : []), ...(currentWorkspace === 'campaigns'
        ? campaign.groups.map((group, index) => ({ ...group, key: `campaigns:${group.group}`, group: index === 0 ? campaign.name : group.group, campaignLabel: index === 0 }))
        : systemSections.map(group => ({ ...group, key: `system:${group.group}` })))];
      // Páginas que não existem nesta visão (ex.: só do mestre) somem do menu.
      const visibleGroups = groups.map(group => ({ ...group, pages: group.pages.filter(page => pageContent[page.id]) })).filter(group => group.pages.length);
      const campaignPicker = currentWorkspace === 'campaigns' && campaigns.length > 1
        ? `<label class="campaign-picker"><span class="nav-label">Campanha ativa</span><select id="campaign-picker">${campaigns.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === campaign.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>`
        : '';
      const closed = closedGroups();
      const opened = openedGroups();
      const rail = compact();
      const item = page => `<button class="nav-item ${page.className || ''}" data-page="${page.id}" type="button"${rail ? ` title="${escapeHtml(String(page.label).replace(/<[^>]+>/g, ''))}"` : ''}><span class="nav-icon">${page.icon}</span><span class="nav-text">${page.label}</span>${badges[page.id] ? `<span class="nav-badge" aria-label="${badges[page.id]} novidade(s)">${badges[page.id]}</span>` : ''}</button>`;
      navigation.innerHTML = `${campaignPicker}${visibleGroups.map(group => {
        const key = group.key;
        const shut = isClosed(key, closed, opened) && !group.pages.some(page => page.id === navIdOf(currentPage));
        const news = group.pages.reduce((sum, page) => sum + (badges[page.id] || 0), 0);
        // A contagem do grupo fechado vem do data-count, pelo CSS: o texto do botão fica só com o nome.
        return `<div class="nav-group${shut ? ' collapsed' : ''}${group.shared ? ' nav-pinned' : ''}" data-group-key="${escapeHtml(key)}"><button type="button" class="nav-label nav-group-toggle${group.campaignLabel ? ' nav-campaign' : ''}" aria-expanded="${!shut}" data-count="${group.pages.length}">${escapeHtml(group.group)}${shut && news ? `<span class="nav-badge">${news}</span>` : ''}<span class="nav-chevron" aria-hidden="true"></span></button><div class="nav-items">${group.pages.map(item).join('')}</div></div>`;
      }).join('')}`;
      document.querySelectorAll('.workspace-tab').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.workspace === currentWorkspace)));
      document.getElementById('tab-campaigns').classList.toggle('active', currentWorkspace === 'campaigns');
      document.getElementById('tab-system').classList.toggle('active', currentWorkspace === 'system');
      document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === navIdOf(currentPage)));
    }
    // Selos de novidade: { idDaPágina: quantidade } (0 tira o selo). A visão dos jogadores marca o que o mestre
    // publicou desde a última vez que o jogador abriu a página.
    function setBadges(map) {
      Object.entries(map).forEach(([id, count]) => { if (count > 0) badges[id] = count; else delete badges[id]; });
      buildNavigation();
    }

    // O botão ☰ (criado aqui, nas duas wikis) e o fundo escuro da gaveta do celular.
    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'nav-toggle';
    menuButton.setAttribute('aria-controls', 'navigation');
    menuButton.innerHTML = '<span></span><span></span><span></span>';
    document.querySelector('.topbar')?.prepend(menuButton);
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.append(backdrop);
    const mapMenuClose = document.createElement('button');
    mapMenuClose.type = 'button';
    mapMenuClose.className = 'map-menu-close';
    mapMenuClose.textContent = '× Fechar menu';
    document.querySelector('aside').prepend(mapMenuClose);
    let drawerInvoker = null;
    let mapDrawerAttributes = null;
    function labelMenuButton() {
      const label = narrow.matches ? (document.body.classList.contains('sidebar-open') ? 'Fechar o menu' : 'Abrir o menu') : compact() ? 'Mostrar a barra lateral inteira ( [ )' : 'Deixar a barra lateral compacta ( [ )';
      menuButton.setAttribute('aria-label', label);
      menuButton.title = label;
      menuButton.setAttribute('aria-expanded', String(narrow.matches ? document.body.classList.contains('sidebar-open') : !compact()));
    }
    function setCompact(on) {
      document.body.classList.toggle('sidebar-compact', on);
      storage.set('barra-compacta', on ? '1' : '');
      buildNavigation();
      labelMenuButton();
    }
    function setDrawer(open) {
      const aside = document.querySelector('aside');
      if (open && document.body.classList.contains('map-immersive')) {
        if (!mapDrawerAttributes) {
          drawerInvoker = document.activeElement;
          mapDrawerAttributes = Object.fromEntries(['role', 'aria-modal', 'aria-label'].map(name => [name, aside.getAttribute(name)]));
        }
        aside.setAttribute('role', 'dialog'); aside.setAttribute('aria-modal', 'true'); aside.setAttribute('aria-label', 'Navegação da wiki');
        document.querySelector('main').inert = true;
      }
      document.body.classList.toggle('sidebar-open', open);
      document.querySelector('[data-map-action="menu"]')?.setAttribute('aria-expanded', String(open));
      labelMenuButton();
      if (open) (navigation.querySelector('.nav-item.active') || navigation.querySelector('.nav-item'))?.focus({ preventScroll: true });
      else if (mapDrawerAttributes) {
        document.querySelector('main').inert = false;
        Object.entries(mapDrawerAttributes).forEach(([name, value]) => value === null ? aside.removeAttribute(name) : aside.setAttribute(name, value));
        mapDrawerAttributes = null;
        if (drawerInvoker?.isConnected) drawerInvoker.focus({ preventScroll: true });
        drawerInvoker = null;
      }
    }
    const toggleSidebar = () => (narrow.matches || document.body.classList.contains('map-immersive') ? setDrawer(!document.body.classList.contains('sidebar-open')) : setCompact(!compact()));
    menuButton.addEventListener('click', toggleSidebar);
    mapMenuClose.addEventListener('click', () => setDrawer(false));
    backdrop.addEventListener('click', () => setDrawer(false));
    narrow.addEventListener('change', () => { setDrawer(false); buildNavigation(); labelMenuButton(); });
    document.addEventListener('keydown', event => {
      if (!mapDrawerAttributes) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setDrawer(false); return; }
      if (event.key !== 'Tab') return;
      const items = [...document.querySelector('aside').querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
        .filter(item => !item.disabled && item.getClientRects().length);
      const index = items.indexOf(document.activeElement);
      if (!items.length) return;
      if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
    }, true);
    if (storage.get('barra-compacta') === '1') document.body.classList.add('sidebar-compact');
    // Abreviação das abas para a barra compacta (CAM, SIS, REG).
    document.querySelectorAll('.workspace-tab').forEach(tab => { tab.dataset.short = tab.textContent.trim().slice(0, 3).toUpperCase(); });
    navigation.addEventListener('click', event => {
      const toggle = event.target.closest('.nav-group-toggle');
      if (!toggle) return;
      const group = toggle.closest('.nav-group');
      const key = group.dataset.groupKey;
      const closed = closedGroups();
      const opened = openedGroups();
      const shut = group.classList.toggle('collapsed');
      if (shut) { closed.add(key); opened.delete(key); } else { closed.delete(key); opened.add(key); }
      toggle.setAttribute('aria-expanded', String(!shut));
      storage.set('grupos-fechados', JSON.stringify([...closed]));
      storage.set('grupos-abertos', JSON.stringify([...opened]));
    });

    function setWorkspace(workspace) {
      if (workspace !== 'campaigns' && workspace !== 'system') return;
      currentWorkspace = workspace;
      storage.set('workspace', workspace);
      buildNavigation();
    }

    // ---------------- Endereço: #página ou #página/seção ----------------
    // Trocar de página empilha no histórico (o Voltar do navegador funciona); ir a uma seção só troca o endereço atual.
    const slug = text => foldForSearch(String(text)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let routedHash = null;
    const pageHash = (id, unit) => `#${id}${unit ? `/${slug(unitTitle(unit))}` : ''}`;
    function readHash() {
      let hash = location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* endereço malformado: usa como está */ }
      const [id, section] = hash.split('/');
      return { id, section };
    }
    // mode: 'push' (nova entrada no histórico), 'replace' (troca a atual) ou 'none' (não mexe).
    function writeHash(hash, mode) {
      if (mode === 'none') return;
      routedHash = hash;
      if (location.hash === hash) return;
      try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', hash); } catch { /* navegador sem history API */ }
    }
    function routeFromHash() {
      if (location.hash === routedHash) return;
      routedHash = location.hash;
      const { id, section } = readHash();
      // Página que saiu e virou parte de outra (aliases: #docQuemEQuem → Pessoas e facções, na tabela).
      const alias = !pageContent[id] && aliases[id];
      if (alias) { openPage(alias.id, { section: section || alias.section }, 'replace'); return; }
      if (!pageContent[id]) { openPage(homePage(), undefined, 'replace'); return; }
      openPage(id, section ? { section } : undefined, 'none');
    }
    window.addEventListener('popstate', routeFromHash);
    window.addEventListener('hashchange', routeFromHash);

    // Unidade de destino: por índice (resultado de busca) ou pelo nome da seção no endereço.
    function resolveTarget(target) {
      if (!target) return null;
      const units = searchUnits(content);
      if (target.unit !== undefined) return units[target.unit] || null;
      // Nome exato da seção; senão, a que começa com ele ("neuralware" acha "Neuralware / 12 entradas").
      if (target.section) return units.find(unit => slug(unitTitle(unit)) === target.section) || units.find(unit => slug(unitTitle(unit)).startsWith(target.section)) || null;
      return null;
    }

    // target (opcional): { unit, term } ou { section } abre a página já na seção indicada, com o termo destacado.
    function openPage(id, target, historyMode = 'push') {
      const alias = !pageContent[id] && aliases[id];
      if (alias) return openPage(alias.id, target || (alias.section ? { section: alias.section } : undefined), historyMode);
      const page = pageContent[id];
      if (!page) return;
      stopCampaignMap();
      const targetWorkspace = pageWorkspace[id];
      if (targetWorkspace && targetWorkspace !== currentWorkspace) setWorkspace(targetWorkspace);
      // Página que só existe em outra campanha (um resultado de busca do mestre): troca para ela.
      const owners = campaigns.filter(campaign => pagesOf(campaign).includes(id));
      if (owners.length && !owners.some(campaign => campaign.id === activeCampaignId)) setCampaign(owners[0].id);
      currentPage = id;
      search.value = '';
      // Páginas com manterAlvo (ficha e criador) guardam no endereço o id do que mostram: #ficha/<id>.
      const keepTarget = page.manterAlvo && target && target.section;
      writeHash(keepTarget ? `#${id}/${encodeURIComponent(target.section)}` : pageHash(id), historyMode);
      if (!page.manterAlvo) rememberRecent(id);
      // As abas da entrada do menu (Sessão 01: Resumo, Roteiro completo, Handouts...), no topo da página.
      const host = tabHost(id);
      const tabs = host ? `<nav class="page-tabs" aria-label="Partes de ${escapeHtml(String(host.label).replace(/<[^>]+>/g, ''))}"><span class="page-tabs-label">${host.label}</span>${host.tabs.map(tab => `<button type="button" class="page-tab" data-page="${tab.id}"${tab.id === id ? ' aria-current="page"' : ''}>${tab.label}</button>`).join('')}</nav>` : '';
      // A linha em ciano (o eyebrow) em cima do título, como nos exemplos de 2026.
      content.innerHTML = `${tabs}<header class="page-head"><div class="page-title"><p class="eyebrow">${page.eyebrow || ''}</p><h2 class="cyber-h">${page.title}</h2></div>${pinnable(id) ? pinButton(id) : ''}</header><p class="lede">${page.lede}</p>${page.html}`;
      tocClicked = -1;
      document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === navIdOf(id)));
      // A página aberta sempre aparece no menu (o grupo recolhido abre); no celular, a gaveta fecha.
      navigation.querySelector('.nav-item.active')?.closest('.nav-group.collapsed')?.classList.remove('collapsed');
      if (document.body.classList.contains('sidebar-open')) setDrawer(false);
      document.dispatchEvent(new CustomEvent('wiki:pagina', { detail: { id, target } }));
      const setup = { notes: setupNotes, campaignMap: setupCampaignMap, screen: setupScreen, skills: setupSkills, indice: setupIndex, ...(config.pageSetup || {}) }[id]
        || (mapPages.includes(id) ? setupCampaignMap : null);
      if (setup) setup(content, { recentPages, clockState, openPage, escapeHtml, target });
      // Páginas com lógica própria (filtros, tabelas) trazem setup(content) no arquivo de dados.
      if (typeof page.setup === 'function') page.setup(content, { openPage, storage, escapeHtml, target, rollTable, rollDice, showRoll, linkGlossary });
      linkGlossary(content);
      if (markdownDocs[id]) {
        window.scrollTo({ top: 0 });
        showMarkdownDoc(id, target);
        return;
      }
      buildToc();
      const unit = keepTarget ? null : resolveTarget(target);
      if (unit) focusUnit(unit, target.term);
      else window.scrollTo({ top: 0 });
    }

    // ---------------- Recentes e relógios (para a página inicial) ----------------
    function recentPages() {
      try { return JSON.parse(storage.get('recentes') || '[]'); } catch { return []; }
    }
    // Guarda a página (e a seção, quando há) entre as 8 últimas abertas neste aparelho.
    function rememberRecent(id, unit) {
      if (!pageContent[id] || id === homePage()) return;
      const title = String(pageContent[id].title).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const list = recentPages().filter(item => item.id !== id);
      list.unshift({ id, hash: pageHash(id, unit), title, section: unit ? unitTitle(unit) : '' });
      storage.set('recentes', JSON.stringify(list.slice(0, 8)));
    }
    // Valor atual de cada relógio de config.clocks (as mesmas chaves que setupClock grava).
    function clockState() {
      return Object.entries(config.clocks || {}).map(([name, steps]) => ({ name, steps, value: clockValue(name) }));
    }

    // ---------------- Mesa do mestre: relógios e bloco de notas ----------------
    // Na wiki do mestre pelo servidor (config.tableUrl), ficam no servidor, por campanha: entram no backup e aparecem
    // iguais em qualquer aparelho. Sem servidor, no navegador, como antes (o navegador guarda sempre uma cópia). O que
    // estava só no navegador sobe na primeira vez. Um relógio marcado "Mostrar aos jogadores" aparece no Resumo deles.
    const tableUrl = (campaign = activeCampaignId) => (config.tableUrl && location.protocol !== 'file:' ? config.tableUrl(campaign) : '');
    let table = null; // { campanha, relogios, notas, publicos, atualizado } da campanha ativa
    let tableState = 'local'; // local · carregando · salvo · salvando · erro
    const tablePending = new Map(); // endereço → o que falta mandar
    let tableTimer = null;
    const localClockKey = (name, campaign = activeCampaignId) => `night-city-clock-${name}-${campaign}`;
    const localNotesKey = (campaign = activeCampaignId) => `night-city-fieldbook-notes-${campaign}`;
    const tableHere = () => (table && table.campanha === activeCampaignId ? table : null);
    function clockValue(name) { const here = tableHere(); return here ? Number(here.relogios[name]) || 0 : Number(localGet(localClockKey(name))) || 0; }
    function notesValue() { const here = tableHere(); return here ? here.notas || '' : localGet(localNotesKey()) || ''; }
    function showTableStatus() {
      const status = document.getElementById('note-status');
      if (!status) return;
      status.textContent = { local: 'Salvo automaticamente neste navegador.', carregando: 'Carregando do servidor…', salvo: `Salvo no servidor${table && table.atualizado ? ` às ${new Date(table.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}: entra no backup e aparece em qualquer aparelho seu.`, salvando: 'Salvando no servidor…', erro: 'Sem conexão com o servidor: ficou salvo só neste navegador, e vai na próxima mudança.' }[tableState];
    }
    async function loadTable() {
      const url = tableUrl();
      if (!url) return null;
      const campaign = activeCampaignId;
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        let data = await response.json();
        if (campaign !== activeCampaignId) return null;
        if (!data.atualizado) {
          // Primeira vez com o servidor: os relógios e o bloco que estavam só neste navegador sobem.
          const relogios = Object.fromEntries(Object.keys(config.clocks || {}).map(name => [name, Number(localGet(localClockKey(name, campaign))) || 0]).filter(([, value]) => value));
          const notas = localGet(localNotesKey(campaign)) || '';
          if (Object.keys(relogios).length || notas) {
            const up = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relogios, notas }) });
            if (up.ok) data = await up.json();
          }
        }
        table = { ...data, campanha: campaign };
        tableState = 'salvo';
        document.dispatchEvent(new CustomEvent('wiki:mesa', { detail: table }));
        return table;
      } catch { return null; }
    }
    async function flushTable() {
      tableTimer = null;
      for (const [url, body] of [...tablePending]) {
        tablePending.delete(url);
        try {
          const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
          if (!response.ok) throw new Error(response.status);
          const saved = await response.json();
          if (table && url === tableUrl(table.campanha)) table.atualizado = saved.atualizado;
          tableState = 'salvo';
        } catch {
          // Sem rede: junta com o que vier depois e tenta de novo na próxima mudança.
          const later = tablePending.get(url) || {};
          tablePending.set(url, { ...body, ...later, relogios: { ...(body.relogios || {}), ...(later.relogios || {}) }, publicos: { ...(body.publicos || {}), ...(later.publicos || {}) } });
          tableState = 'erro';
        }
      }
      showTableStatus();
    }
    // Fechar ou recarregar a página com algo por mandar: manda já.
    window.addEventListener('pagehide', () => { if (tablePending.size) { clearTimeout(tableTimer); flushTable(); } });
    // Muda a mesa (só o que mudou): na hora na tela e no navegador; no servidor, logo depois.
    function saveTable(patch) {
      for (const [name, value] of Object.entries(patch.relogios || {})) localSet(localClockKey(name), String(value));
      if (patch.notas !== undefined) localSet(localNotesKey(), patch.notas);
      const here = tableHere();
      const url = tableUrl();
      if (!here || !url) return;
      Object.assign(here.relogios, patch.relogios || {});
      if (patch.notas !== undefined) here.notas = patch.notas;
      for (const [name, value] of Object.entries(patch.publicos || {})) { if (value) here.publicos[name] = value; else delete here.publicos[name]; }
      const before = tablePending.get(url) || {};
      tablePending.set(url, { ...before, ...(patch.notas !== undefined ? { notas: patch.notas } : {}), relogios: { ...(before.relogios || {}), ...(patch.relogios || {}) }, publicos: { ...(before.publicos || {}), ...(patch.publicos || {}) } });
      tableState = 'salvando';
      showTableStatus();
      clearTimeout(tableTimer);
      tableTimer = setTimeout(flushTable, 600);
    }

    // Volta à página atual como estava no endereço (Esc na busca, busca apagada).
    function reopenCurrent() {
      const { id, section } = readHash();
      openPage(currentPage, id === currentPage && section ? { section } : undefined, 'none');
    }

    // Uma "unidade" é o trecho para onde o índice da página e a busca apontam:
    // cada .section e cada cartão de pessoa; nos documentos .md, cada título de seção (# e ##; na busca, também ###).
    // data-unit-skip: blocos montados pela própria página (a tabela comparável), que não são seções do conteúdo.
    const unitSelector = '.section:not([data-unit-skip]), .person';

    // Índice "Nesta página": só as unidades de primeiro nível.
    function pageUnits(container) {
      const doc = container.querySelector('#md-doc');
      if (doc) return [...doc.querySelectorAll(':scope > h3')];
      return [...container.querySelectorAll(unitSelector)].filter(element => !element.parentElement.closest(unitSelector));
    }

    // Busca: também cada cartão (.entry) dentro das seções, para abrir direto num Black ICE ou quickhack. Nos .md, cada
    // ### também (um NPC, uma cena, uma ficha dentro de uma seção grande): a busca e o endereço #pagina/secao vão direto.
    function searchUnits(container) {
      const doc = container.querySelector('#md-doc');
      if (doc) return [...doc.querySelectorAll(':scope > h3, :scope > h4')];
      return [...container.querySelectorAll(`${unitSelector}, .entry`)];
    }

    function unitTitle(element) {
      if (element.dataset.toc) return element.dataset.toc;
      const heading = element.matches('h3, h4') ? element : element.querySelector('h3, summary');
      if (!heading) return '';
      return (heading.firstChild && heading.firstChild.nodeType === Node.TEXT_NODE ? heading.firstChild.textContent : heading.textContent).trim();
    }

    // Nos documentos .md, uma seção é o título mais tudo até o próximo título do mesmo nível (ou de um nível acima).
    // own: só o texto da própria seção, sem as subseções (na busca, cada ### tem a sua entrada).
    function unitBlock(element, own = false) {
      if (!element.matches('#md-doc > h3, #md-doc > h4')) return [element];
      const stop = own || element.matches('h4') ? 'h3, h4' : 'h3';
      const block = [element];
      for (let next = element.nextElementSibling; next && !next.matches(stop); next = next.nextElementSibling) block.push(next);
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

    // Rolagem suave própria: a do navegador (behavior: 'smooth') às vezes é ignorada logo depois de trocar de página.
    // Pula direto se a aba estiver oculta ou se o sistema pedir menos animação; a roda do mouse interrompe.
    let scrollAnimation = 0;
    const stopScrollAnimation = () => { cancelAnimationFrame(scrollAnimation); scrollAnimation = 0; };
    window.addEventListener('wheel', stopScrollAnimation, { passive: true });
    window.addEventListener('touchstart', stopScrollAnimation, { passive: true });
    // topOf: função que mede o destino agora. É medida de novo no fim, porque o layout pode mudar durante a rolagem
    // (fontes terminando de carregar, links do glossário entrando no texto).
    function scrollWindow(topOf, smooth) {
      stopScrollAnimation();
      const clamp = top => Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
      const settle = () => { const final = clamp(topOf()); if (Math.abs(window.scrollY - final) > 2) window.scrollTo(0, final); };
      const target = clamp(topOf());
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!smooth || reduce || document.visibilityState === 'hidden') { window.scrollTo(0, target); return; }
      const start = window.scrollY;
      const distance = target - start;
      const duration = Math.min(450, 160 + Math.abs(distance) / 10);
      const startTime = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - startTime) / duration);
        window.scrollTo(0, start + distance * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) scrollAnimation = requestAnimationFrame(step);
        else { scrollAnimation = 0; settle(); }
      };
      scrollAnimation = requestAnimationFrame(step);
      // Se o navegador não desenhar quadros (aba em segundo plano), pula direto ao destino no fim do tempo previsto.
      const animation = scrollAnimation;
      setTimeout(() => {
        // Nenhum quadro rodou (o id não mudou) e ninguém rolou na mão (a roda zera o id).
        if (scrollAnimation === animation) { stopScrollAnimation(); settle(); }
      }, duration + 150);
    }

    // Altura ocupada no topo pelas barras fixas (a da busca e a "Nesta página", quando existe).
    function stickyHeight() {
      const toc = content.querySelector('.page-toc');
      return toc ? toc.getBoundingClientRect().height + document.querySelector('.topbar').offsetHeight : document.querySelector('.topbar').offsetHeight;
    }

    // A busca pula direto (consulta rápida); os chips do índice rolam suavemente.
    function focusUnit(unit, term, smooth = false) {
      if (!unit) return;
      const details = unit.matches('details') ? unit : unit.closest('details');
      if (details) details.open = true;
      const block = unitBlock(unit);
      if (term) highlightTerm(block, term);
      // Termo dentro de um bloco recolhido do cartão (as perícias de uma ficha, por exemplo): abre o bloco.
      block.forEach(element => element.querySelectorAll('details:not([open])').forEach(inner => { if (inner.querySelector('mark')) inner.open = true; }));
      // Numa seção longa (uma tabela grande, por exemplo), o termo pode estar fora da tela: centraliza nele.
      const firstMark = term ? block.map(element => element.querySelector('mark')).find(Boolean) : null;
      const markIsFar = firstMark && firstMark.getBoundingClientRect().top - unit.getBoundingClientRect().top > window.innerHeight / 2;
      // A rolagem é calculada pela altura real da barra do topo e da barra "Nesta página" (que muda com os chips):
      // assim a seção para logo abaixo delas e o chip certo fica marcado.
      const topOf = () => (markIsFar
        ? firstMark.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2
        : unit.getBoundingClientRect().top + window.scrollY - stickyHeight() - 8);
      scrollWindow(topOf, smooth);
      block.forEach(element => {
        element.classList.remove('flash');
        void element.offsetWidth;
        element.classList.add('flash');
      });
      // A seção vai para o endereço: recarregar ou mandar o link abre aqui.
      writeHash(pageHash(currentPage, unit), 'replace');
      rememberRecent(currentPage, unit);
    }

    // ---------------- Glossário: links automáticos ----------------
    // A primeira menção de cada termo em cada seção (ou cartão) vira um link para o glossário, com a definição no title.
    const glossary = window.systemGlossary;
    const glossarySkipPages = new Set(['glossary', 'playerView', 'notes', ...mapPages]);
    const glossarySkip = 'h1, h2, h3, h4, h5, a, button, summary, code, pre, input, textarea, select, option, label, th, .page-toc, .eyebrow, .entry-tag, .npc-stats, .gloss, .home-desk, .view-switch, .compare-panel, .cy-top';
    let glossaryMatchers = null;
    function buildGlossaryMatchers() {
      const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const loose = new Map();
      const exact = new Map();
      glossary.terms.filter(term => !term.semLink).forEach(term => {
        [term.termo, ...term.formas].forEach(form => (term.exato ? exact : loose).set(term.exato ? form : form.toLocaleLowerCase('pt-BR'), term));
      });
      // Sem letra (nem número, antes) colada: "DV" acha "DV13", mas "MOVE" não acha "REMOVE".
      const build = (map, flags) => map.size ? new RegExp(`(?<![\\p{L}\\p{N}])(${[...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join('|')})(?![\\p{L}])`, flags) : null;
      return [
        { regex: build(loose, 'giu'), lookup: text => loose.get(text.toLocaleLowerCase('pt-BR')) },
        { regex: build(exact, 'gu'), lookup: text => exact.get(text) }
      ].filter(matcher => matcher.regex);
    }
    function linkGlossary(root) {
      if (!glossary || glossarySkipPages.has(currentPage) || !root) return;
      glossaryMatchers = glossaryMatchers || buildGlossaryMatchers();
      const linked = new Map();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const parent = node.parentElement;
        if (!parent || parent.closest(glossarySkip) || !node.data.trim()) return;
        const scope = parent.closest('.entry, .section, .person, #md-doc') || root;
        const scopeTitle = slug(unitTitle(scope) || '');
        if (!linked.has(scope)) linked.set(scope, new Set());
        const used = linked.get(scope);
        const hits = [];
        glossaryMatchers.forEach(({ regex, lookup }) => {
          regex.lastIndex = 0;
          for (let match = regex.exec(node.data); match; match = regex.exec(node.data)) {
            const term = lookup(match[1]);
            if (term) hits.push({ start: match.index, end: match.index + match[1].length, term });
          }
        });
        if (!hits.length) return;
        hits.sort((a, b) => a.start - b.start || b.end - a.end);
        const fragment = document.createDocumentFragment();
        let from = 0;
        hits.forEach(({ start, end, term }) => {
          // Uma vez por termo em cada seção; nunca dentro da seção que é a própria regra do termo.
          if (start < from || used.has(term.id) || (term.pagina === currentPage && slug(term.secao) && scopeTitle.startsWith(slug(term.secao)))) return;
          used.add(term.id);
          fragment.append(node.data.slice(from, start));
          const link = document.createElement('a');
          link.className = 'gloss';
          link.href = `#glossary/${term.id}`;
          link.title = `${term.termo}: ${term.def.replace(/<[^>]+>/g, '')}`;
          link.textContent = node.data.slice(start, end);
          fragment.append(link);
          from = end;
        });
        if (!from) return;
        fragment.append(node.data.slice(from));
        node.replaceWith(fragment);
      });
    }

    // terms: lista de trechos já normalizados (foldForSearch), ou um texto solto.
    function highlightTerm(elements, terms) {
      const needles = (Array.isArray(terms) ? terms : [foldForSearch(String(terms).trim())]).filter(Boolean);
      if (!needles.length) return;
      elements.forEach(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
          if (node.parentElement.closest('mark, select, option, button')) return;
          const characters = Array.from(node.data);
          const ranges = matchRanges(foldForSearch(node.data), needles);
          if (!ranges.length) return;
          const fragment = document.createDocumentFragment();
          let from = 0;
          ranges.forEach(([start, end]) => {
            fragment.append(characters.slice(from, start).join(''));
            const mark = document.createElement('mark');
            mark.textContent = characters.slice(start, end).join('');
            fragment.append(mark);
            from = end;
          });
          fragment.append(characters.slice(from).join(''));
          node.replaceWith(fragment);
        });
      });
    }

    let tocFrame = 0;
    // O chip clicado. Numa página curta, a última seção não chega ao topo, e a rolagem acenderia o chip anterior: no fim
    // da página, com a seção clicada na tela, ele continua aceso, até o leitor rolar por conta própria.
    let tocClicked = -1;
    const releaseToc = () => { tocClicked = -1; };
    window.addEventListener('wheel', releaseToc, { passive: true });
    window.addEventListener('touchstart', releaseToc, { passive: true });
    window.addEventListener('keydown', releaseToc);
    window.addEventListener('scroll', () => {
      if (tocFrame) return;
      tocFrame = requestAnimationFrame(() => {
        tocFrame = 0;
        const toc = content.querySelector('.page-toc');
        if (!toc) return;
        const limit = toc.getBoundingClientRect().bottom + 24;
        let current = -1;
        const units = pageUnits(content);
        units.forEach((unit, index) => { if (unit.getBoundingClientRect().top <= limit) current = index; });
        const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        if (tocClicked > current && atBottom && units[tocClicked] && units[tocClicked].getBoundingClientRect().top < window.innerHeight) current = tocClicked;
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
    // A barra de cima muda de altura sem a janela mudar (a conta entra depois, a busca quebra a linha): a barra lateral e
    // a faixa "Nesta página" grudam logo abaixo dela.
    if (window.ResizeObserver) new ResizeObserver(updateStickyOffset).observe(document.querySelector('.topbar'));

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
        // O DV grande ao lado dos campos (a faixa aparece em cima dele pelo CSS) e, embaixo, uma caixa por faixa, com a
        // da distância acesa, como no exemplo do Escudo.
        document.getElementById('dv-result').innerHTML = dv === null
          ? '<span class="dv-big">Fora de alcance</span>'
          : `<span class="dv-big">DV ${dv}</span><small>Faixa ${data.rangeBands[band]}</small>`;
        const note = document.getElementById('dv-note');
        if (note) note.textContent = [autofire === undefined ? '' : `Autofogo: ${autofire === null ? 'fora de alcance' : `DV ${autofire}`}.`, 'Alvo com REF 8+ pode trocar a DV por DEX + Evasão + 1d10.'].filter(Boolean).join(' ');
        document.getElementById('dv-row').innerHTML = data.rangeBands.map((label, index) => `<div class="${index === band ? 'on' : ''}">${label}<b>${selected.dv[index] === null ? '—' : selected.dv[index]}</b></div>`).join('');
        write('night-city-dv-weapon', weapon.value);
        write('night-city-dv-distance', distance.value);
      };
      weapon.onchange = update;
      distance.oninput = update;
      update();
    }

    // ---------------- Roladores de tabela ----------------
    // Os arquivos de dados registram tabelas em window.rollTables[id] = { dado: '1d10' | '1d6' | '2d6' | 'd100', linhas: [[de, até, html]] }.
    // Um botão data-roll="id" rola a tabela e mostra o resultado logo abaixo dele.
    const rollDie = sides => 1 + Math.floor(Math.random() * sides);
    function rollDice(spec) {
      if (spec === 'd100') return rollDie(100);
      const [count, sides] = String(spec).split('d').map(Number);
      let total = 0;
      for (let i = 0; i < (count || 1); i += 1) total += rollDie(sides);
      return total;
    }
    function rollTable(id) {
      const table = (window.rollTables || {})[id];
      if (!table) return null;
      const value = rollDice(table.dado);
      const row = table.linhas.find(([from, to]) => value >= from && value <= to);
      return { value, dado: table.dado, html: row ? row[2] : '—' };
    }
    function showRoll(button, html) {
      // Botões agrupados em .roll-buttons dividem um só resultado, logo abaixo do grupo.
      const anchor = button.closest('.roll-buttons') || button;
      let output = anchor.nextElementSibling;
      if (!output || !output.classList.contains('roll-result')) {
        output = document.createElement('div');
        output.className = 'roll-result';
        output.setAttribute('role', 'status');
        anchor.after(output);
      }
      output.innerHTML = html;
      output.classList.remove('flash');
      void output.offsetWidth;
      output.classList.add('flash');
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

    // Índice A–Z: cada cartão e cada pessoa das páginas desta visão, por letra, com filtro.
    function setupIndex() {
      searchIndex = searchIndex || buildSearchIndex();
      const items = searchIndex
        .filter(entry => (entry.kind === 'entry' || entry.kind === 'person') && entry.title && !['glossary', 'indice'].includes(entry.id))
        .map(entry => ({ ...entry, key: foldForSearch(`${entry.title} ${entry.tag} ${entry.pageTitle}`) }))
        .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      const letterOf = item => { const first = foldForSearch(item.title).charAt(0).toUpperCase(); return /[A-Z]/.test(first) ? first : '#'; };
      const letters = [...new Set(items.map(letterOf))];
      document.getElementById('index-list').innerHTML = letters.map(letter => `<div class="section index-letter" data-toc="${letter}"><h3>${letter}</h3><div class="index-grid">${items.filter(item => letterOf(item) === letter).map(item => `<button type="button" class="index-item" data-page="${item.id}" data-unit="${item.unit}" data-key="${escapeHtml(item.key)}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml([item.tag, item.pageTitle].filter(Boolean).join(' · '))}</small></button>`).join('')}</div></div>`).join('');
      const input = document.getElementById('index-filter');
      const count = document.getElementById('index-count');
      const apply = () => {
        const needles = foldForSearch(input.value.trim()).split(/\s+/).filter(Boolean);
        let shown = 0;
        content.querySelectorAll('.index-letter').forEach(section => {
          let visible = 0;
          section.querySelectorAll('.index-item').forEach(item => {
            const match = needles.every(needle => item.dataset.key.includes(needle));
            item.hidden = !match;
            if (match) visible += 1;
          });
          section.hidden = !visible;
          shown += visible;
        });
        count.textContent = needles.length ? `${shown} de ${items.length} itens` : `${items.length} itens`;
      };
      input.addEventListener('input', apply);
      apply();
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

    // Links nos textos em Markdown: [texto](#pagina/secao) abre uma página da wiki; [texto](https://...) abre fora, em
    // outra aba; [texto](arquivo.md) e o nome de um documento entre crases (`diario-da-campanha.md`) abrem a página
    // daquele documento. Outro destino (javascript:, data:...) fica só como texto.
    // O documento inteiro, não uma página que mostra só um pedaço dele ou uma visão dele (vista: os handouts de uma
    // sessão, o resumo, as páginas montadas da base da campanha).
    const docPageFor = name => { const base = String(name).split('/').pop(); const ids = Object.keys(markdownDocs).filter(id => markdownDocs[id].file.split('/').pop() === base); return ids.find(id => !markdownDocs[id].vista) || ids[0] || ''; };
    function linkHref(target) {
      const value = target.replace(/&amp;/g, '&');
      if (/^#[\w-]+(\/[\w-]+)?$/.test(value)) return value;
      if (/^https?:\/\/[^\s"'<>]+$/.test(value)) return target;
      const [name, section] = value.split('#');
      const doc = /\.md$/i.test(name) ? docPageFor(name) : '';
      return doc ? `#${doc}${section && /^[\w-]+$/.test(section) ? `/${section}` : ''}` : '';
    }
    function renderInlineMarkdown(text) {
      return escapeHtml(text)
        .replace(/`([^`]+)`/g, (match, code) => { const doc = /\.md$/i.test(code) ? docPageFor(code) : ''; return doc ? `<a href="#${doc}"><code>${code}</code></a>` : `<code>${code}</code>`; })
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, target) => {
          const href = linkHref(target);
          if (!href) return label;
          return `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
        })
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
    const stripDocTitle = text => text.replace(/^﻿?#\s+.*\r?\n/, '');

    // transform pode devolver o texto ou uma Promise (uma página que junta trechos de outros documentos).
    function showMarkdownDoc(id, target) {
      loadMarkdownDoc(id).then(raw => (markdownDocs[id].transform ? markdownDocs[id].transform(raw) : raw)).then(text => {
        const container = document.getElementById('md-doc');
        if (currentPage !== id || !container) return;
        container.innerHTML = renderMarkdown(stripDocTitle(text));
        linkGlossary(container);
        buildToc();
        // Quem quiser acrescentar algo ao documento (os botões dos handouts, na wiki do mestre) faz isto agora, antes da
        // rolagem até a seção pedida.
        document.dispatchEvent(new CustomEvent('wiki:documento', { detail: { id, container, text } }));
        const unit = resolveTarget(target);
        if (unit) focusUnit(unit, target.term);
      }).catch(() => {
        const container = document.getElementById('md-doc');
        if (container) container.innerHTML = `<div class="callout"><b>Não foi possível ler ${escapeHtml(markdownDocs[id].file)}.</b> Os documentos completos são lidos direto dos arquivos .md, e o navegador bloqueia isso quando a wiki é aberta com dois cliques. Abra pelo servidor local: rode <code>node server.js</code> nesta pasta e acesse <code>http://localhost:8000</code>.</div>`;
      });
    }

    function setupClock(name) {
      const element = document.getElementById(`clock-${name}`);
      const steps = (config.clocks || {})[name] || [];
      const render = () => {
        const value = clockValue(name);
        element.innerHTML = steps.map((step, index) => `<button type="button" class="clock-segment" data-clock-index="${index}" aria-pressed="${index < value}"><span>${index + 1}</span>${escapeHtml(step)}</button>`).join('');
      };
      element.onclick = event => {
        const segment = event.target.closest('[data-clock-index]');
        if (!segment) return;
        const index = Number(segment.dataset.clockIndex);
        saveTable({ relogios: { [name]: clockValue(name) === index + 1 ? index : index + 1 } });
        render();
      };
      render();
      // Com o servidor: o relógio pode aparecer para os jogadores (no Resumo deles), com o nome do título do quadro.
      element.parentElement.querySelector(`[data-clock-public="${name}"]`)?.closest('label').remove();
      if (!tableHere()) return;
      const title = (element.closest('.section')?.querySelector('h3')?.textContent || name).trim();
      element.insertAdjacentHTML('afterend', `<label class="clock-public"><input type="checkbox" data-clock-public="${name}"${tableHere().publicos[name] ? ' checked' : ''}> Mostrar aos jogadores (no Resumo deles)</label>`);
      element.parentElement.querySelector(`[data-clock-public="${name}"]`).onchange = event => saveTable({ publicos: { [name]: event.target.checked ? { nome: title, passos: steps } : null } });
    }

    function setupNotes() {
      const input = document.getElementById('session-note');
      // Com o servidor e a mesa ainda não lida: lê e monta de novo.
      if (tableUrl() && !tableHere()) {
        tableState = 'carregando';
        input.disabled = true;
        showTableStatus();
        const page = currentPage;
        loadTable().then(loaded => { if (currentPage === page && document.getElementById('session-note')) { if (!loaded) tableState = 'erro'; input.disabled = false; setupNotes(); } });
        return;
      }
      if (!tableUrl()) tableState = 'local';
      // Um relógio para cada entrada de config.clocks que tenha um elemento #clock-nome na página.
      Object.keys(config.clocks || {}).forEach(name => { if (document.getElementById(`clock-${name}`)) setupClock(name); });
      input.disabled = false;
      input.value = notesValue();
      showTableStatus();
      input.oninput = () => saveTable({ notas: input.value });
      document.getElementById('clear-notes').onclick = () => {
        input.value = '';
        saveTable({ notas: '' });
        if (!tableUrl()) document.getElementById('note-status').textContent = 'Notas removidas deste navegador.';
      };
    }

    function stopCampaignMap() {
      if (document.body.classList.contains('sidebar-open') && document.body.classList.contains('map-immersive')) setDrawer(false);
      if (campaignMapCleanup) { campaignMapCleanup(); campaignMapCleanup = null; }
      campaignMapUI = null;
      document.body.classList.remove('map-immersive');
    }

    function campaignMapLimits() {
      const svg = document.getElementById('nightcity-map');
      const aspect = svg?.clientWidth && svg?.clientHeight ? svg.clientWidth / svg.clientHeight : 1;
      const maxWidth = Math.min(campaignMapBounds.width, campaignMapBounds.height * aspect);
      const minWidth = Math.min(maxWidth, svg?.dataset.source === 'improved' ? maxWidth / 64 : 750);
      return { aspect, maxWidth, minWidth };
    }

    function setCampaignMapView(view) {
      const svg = document.getElementById('nightcity-map');
      if (!svg) return;
      const bounds = campaignMapBounds;
      const { aspect, maxWidth, minWidth } = campaignMapLimits();
      const width = Math.max(minWidth, Math.min(maxWidth, view.width));
      const height = width / aspect;
      const centerX = view.x + view.width / 2;
      const centerY = view.y + (view.height || height) / 2;
      campaignMapView = {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, centerX - width / 2)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, centerY - height / 2)), width, height
      };
      svg.setAttribute('viewBox', `${campaignMapView.x} ${campaignMapView.y} ${width} ${height}`);
      const screenScale = svg.clientWidth / width;
      if (screenScale > 0) svg.querySelectorAll('.map-pin-symbol').forEach(symbol => symbol.setAttribute('transform', `scale(${1 / screenScale})`));
      campaignMapTiles?.update(campaignMapView);
    }

    function resetCampaignMap() {
      const { maxWidth, aspect } = campaignMapLimits();
      setCampaignMapView({ x: campaignMapBounds.x + (campaignMapBounds.width - maxWidth) / 2,
        y: campaignMapBounds.y + (campaignMapBounds.height - maxWidth / aspect) / 2, width: maxWidth, height: maxWidth / aspect });
    }

    function focusCampaignMapMarker(marker) {
      const svg = document.getElementById('nightcity-map');
      if (!svg?.clientWidth || !campaignMapUI) return;
      const rect = svg.getBoundingClientRect();
      const free = campaignMapUI.freeArea();
      const scale = rect.width / campaignMapView.width;
      const x = rect.left + (marker.x - campaignMapView.x) * scale;
      const y = rect.top + (marker.y - campaignMapView.y) * scale;
      const targetX = Math.max(free.left, Math.min(free.right, x));
      const targetY = Math.max(free.top, Math.min(free.bottom, y));
      if (Math.abs(x - targetX) > 0.5 || Math.abs(y - targetY) > 0.5) {
        setCampaignMapView({ ...campaignMapView, x: campaignMapView.x + (x - targetX) / scale,
          y: campaignMapView.y + (y - targetY) / scale });
      }
      // No limite da cartografia, o pan pode não conseguir tirar um ponto de trás
      // da lista. Recolher Locais preserva o zoom e mantém a ficha selecionada.
      campaignMapUI.revealFromList(marker);
    }

    function showCampaignMapMarker(markerId, focus = true, trigger) {
      const marker = mapData()?.markers.find(item => item.id === markerId);
      if (!marker || document.querySelector(`.map-pin[data-map-marker="${CSS.escape(markerId)}"]`)?.classList.contains('filtered-out')) return;
      campaignMapSelected = markerId;
      document.querySelectorAll('.map-pin, .map-marker-card').forEach(item => item.classList.toggle('selected', item.dataset.mapMarker === markerId));
      const category = mapData().categories[marker.category];
      const header = `<p class="eyebrow">${escapeHtml(category?.label || '')}</p><h3 id="map-place-title">${escapeHtml(marker.title)}</h3>${marker.district ? `<p class="map-district">${escapeHtml(marker.district)}</p>` : ''}${marker.act ? `<p><span class="map-act">${escapeHtml(marker.act)}</span></p>` : ''}`;
      // O jogador só recebe o texto publicado; campos privados nunca são copiados para essa visão.
      const sections = marker.detail !== undefined ? renderMarkdown(marker.detail || '')
        : `${marker.summary ? `<div class="map-place-summary">${renderMarkdown(marker.summary)}</div>` : ''}<div class="map-place-sections">${[
          ['Gancho', marker.hook], ['Encontro', marker.encounter], ['Pistas', marker.clue], ['Notas', marker.note]
        ].filter(([, value]) => value).map(([label, value]) => `<details><summary>${label}</summary><div>${renderMarkdown(value)}</div></details>`).join('')}</div>`;
      document.getElementById('map-marker-detail').innerHTML = header + sections;
      campaignMapUI?.open('detail', trigger || document.querySelector(`.map-pin[data-map-marker="${CSS.escape(markerId)}"]`));
      if (focus) focusCampaignMapMarker(marker);
    }

    function applyCampaignMapFilters() {
      const query = foldForSearch(campaignMapQuery.trim());
      let count = 0;
      mapData().markers.forEach(marker => {
        const actMatches = campaignMapAct === 'all' || (marker.act || '') === campaignMapAct;
        const visible = (campaignMapCategory === 'all' || marker.category === campaignMapCategory) && actMatches
          && (!query || foldForSearch(`${marker.title} ${marker.district || ''}`).includes(query));
        const id = CSS.escape(marker.id);
        document.querySelector(`.map-pin[data-map-marker="${id}"]`)?.classList.toggle('filtered-out', !visible);
        document.querySelector(`.map-marker-card[data-map-marker="${id}"]`)?.classList.toggle('hidden', !visible);
        if (visible) count++;
        else if (campaignMapSelected === marker.id) campaignMapUI?.close('detail', false);
      });
      document.getElementById('map-empty').hidden = count > 0;
    }

    function setupCampaignMap(content, { target } = {}) {
      const data = mapData();
      const svg = document.getElementById('nightcity-map');
      if (!data || !svg) return;
      stopCampaignMap();
      document.body.classList.add('map-immersive');
      const stage = svg.closest('.map-stage');
      const pinLayer = document.getElementById('nightcity-map-pins');
      const image = document.getElementById('nightcity-map-image');
      const abort = new AbortController();
      const mobile = window.matchMedia('(max-width: 1024px)');
      const panels = Object.fromEntries(['locals', 'layers', 'detail'].map(name => [name, document.getElementById(`map-${name}-panel`)]));
      const state = { locals: false, layers: false, detail: false };
      const triggers = {};
      const stack = [];
      let expanded = false;
      let cancelGesture = () => {};
      let destroyed = false;
      campaignMapCategory = 'all'; campaignMapAct = 'all'; campaignMapQuery = ''; campaignMapSelected = null;
      const clearSelection = () => {
        campaignMapSelected = null;
        stage.querySelectorAll('.selected').forEach(item => item.classList.remove('selected'));
      };
      function syncPanels() {
        panels.locals.hidden = !state.locals;
        panels.layers.hidden = !state.layers;
        panels.detail.hidden = !state.detail || state.layers;
        panels.detail.classList.toggle('is-expanded', expanded);
        stage.querySelectorAll('[data-map-toggle]').forEach(button => button.setAttribute('aria-expanded', String(state[button.dataset.mapToggle])));
        const expand = panels.detail.querySelector('[data-map-expand]');
        expand.textContent = expanded ? 'Recolher' : 'Expandir';
        expand.setAttribute('aria-expanded', String(expanded));
        const sheet = mobile.matches ? Object.values(panels).find(panel => !panel.hidden) : null;
        stage.classList.toggle('has-sheet', Boolean(sheet));
        stage.style.setProperty('--map-sheet-height', `${sheet ? sheet.getBoundingClientRect().height : 0}px`);
      }
      function close(name, restore = true) {
        const fallback = triggers[name];
        state[name] = false;
        const index = stack.indexOf(name); if (index >= 0) stack.splice(index, 1);
        if (name === 'detail') { clearSelection(); expanded = false; }
        syncPanels();
        if (restore) {
          const trigger = fallback?.isConnected && fallback.getClientRects().length ? fallback : stage.querySelector(`[data-map-toggle="${name}"]`) || svg;
          trigger.focus({ preventScroll: true });
        }
      }
      function open(name, trigger) {
        if (mobile.matches) Object.keys(state).forEach(key => { if (key !== name) state[key] = false; });
        if (name === 'detail') { state.layers = false; expanded = false; }
        state[name] = true;
        triggers[name] = trigger || document.activeElement;
        const index = stack.indexOf(name); if (index >= 0) stack.splice(index, 1);
        stack.push(name);
        syncPanels();
        const first = name === 'locals' ? document.getElementById('map-place-search') : name === 'layers' ? document.getElementById('map-source') : panels.detail.querySelector('[data-map-close]');
        first?.focus({ preventScroll: true });
      }
      campaignMapUI = {
        open, close,
        revealFromList(marker) {
          if (panels.locals.hidden) return;
          const point = svg.createSVGPoint(); point.x = marker.x; point.y = marker.y;
          const p = point.matrixTransform(svg.getScreenCTM()), r = panels.locals.getBoundingClientRect();
          if (p.x >= r.left - 16 && p.x <= r.right + 16 && p.y >= r.top - 16 && p.y <= r.bottom + 16) close('locals', false);
        },
        freeArea() {
          const r = svg.getBoundingClientRect();
          const free = { left: r.left + 30, right: r.right - 30, top: r.top + 84, bottom: r.bottom - 42 };
          for (const [name, panel] of Object.entries(panels)) {
            if (panel.hidden) continue;
            const p = panel.getBoundingClientRect();
            if (mobile.matches) free.bottom = Math.min(free.bottom, p.top - 28);
            else if (name === 'locals') free.left = Math.max(free.left, p.right + 28);
            else free.right = Math.min(free.right, p.left - 28);
          }
          free.right = Math.max(free.left, free.right); free.bottom = Math.max(free.top, free.bottom);
          return free;
        }
      };
      stage.addEventListener('click', event => {
        const toggle = event.target.closest('[data-map-toggle]');
        const shut = event.target.closest('[data-map-close]');
        if (toggle) { const name = toggle.dataset.mapToggle; if (state[name]) close(name); else open(name, toggle); }
        if (shut) close(shut.dataset.mapClose);
        if (event.target.closest('[data-map-expand]')) { expanded = !expanded; syncPanels(); }
      }, { signal: abort.signal });
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || document.body.classList.contains('sidebar-open') || !document.body.classList.contains('map-immersive')) return;
        const name = [...stack].reverse().find(key => !panels[key].hidden);
        if (name) { event.preventDefault(); event.stopImmediatePropagation(); close(name); }
      }, { capture: true, signal: abort.signal });
      const onMobile = () => {
        cancelGesture();
        if (mobile.matches) {
          const latest = [...stack].reverse().find(name => state[name]);
          Object.keys(state).forEach(name => { state[name] = name === latest; });
        }
        syncPanels();
      };
      mobile.addEventListener('change', onMobile);
      campaignMapTiles = window.nightCityMap?.createLayer(svg, { onError: () => {
        if (destroyed) return;
        const status = document.getElementById('map-status');
        status.classList.add('is-error');
        status.textContent = 'Esta região não carregou. Em Camadas, escolha o Mapa base ou tente novamente com conexão.';
      } }) || null;
      const mapSource = document.getElementById('map-source');
      const chooseSource = (source, initial = false) => {
        cancelGesture();
        if (source === 'improved' && !campaignMapTiles) source = 'base';
        if (source !== 'improved' && !data.images[source]) source = campaignMapTiles ? 'improved' : 'base';
        const previous = campaignMapView;
        const wasFull = initial || Math.abs(previous.width - campaignMapLimits().maxWidth) < 1;
        campaignMapBounds = source === 'improved' ? { ...window.nightCityMap.bounds } : { x: 0, y: 0, width: data.width, height: data.height };
        svg.dataset.source = source; mapSource.value = source;
        campaignMapTiles?.setEnabled(source === 'improved');
        image.style.display = source === 'improved' ? 'none' : '';
        if (source !== 'improved') image.setAttribute('href', data.images[source]);
        document.getElementById('map-status').classList.remove('is-error');
        document.getElementById('map-status').textContent = 'Arraste para explorar. Use + e −, a roda do mouse ou dois dedos para ampliar.';
        if (wasFull) resetCampaignMap();
        else setCampaignMapView(previous);
      };
      campaignMapBounds = { x: 0, y: 0, width: data.width, height: data.height };
      chooseSource(localGet('night-city-map-source') || 'improved', true);
      pinLayer.innerHTML = data.markers.map(marker => {
        const category = data.categories[marker.category];
        return `<g class="map-pin" data-map-marker="${escapeHtml(marker.id)}" tabindex="0" role="button" aria-label="${escapeHtml(marker.title)}, ${escapeHtml(marker.district || '')}" transform="translate(${marker.x} ${marker.y})"><title>${escapeHtml(marker.title)}</title><g class="map-pin-symbol"><circle class="pin-core" cx="0" cy="0" r="13" fill="${category.color}"></circle><text class="pin-code" x="0" y="1">${escapeHtml(marker.code)}</text><text class="pin-label" x="19" y="4">${escapeHtml(marker.title)}</text></g></g>`;
      }).join('');
      document.getElementById('map-marker-list').innerHTML = data.markers.map(marker => `<button type="button" class="map-marker-card" data-map-marker="${escapeHtml(marker.id)}"><span class="map-marker-dot" style="background:${data.categories[marker.category].color}"></span><span><strong>${escapeHtml(marker.title)}</strong><small>${escapeHtml(marker.district || '')}${marker.act ? ` / ${escapeHtml(marker.act)}` : ''}</small></span></button>`).join('');
      document.getElementById('map-legend').innerHTML = Object.values(data.categories).map(category => `<span class="map-legend-item"><i class="map-legend-swatch" style="background:${category.color}"></i>${escapeHtml(category.label)}</span>`).join('');
      document.getElementById('map-filters').innerHTML = `<button type="button" class="map-filter" data-map-category="all" aria-pressed="true">Todos</button>${Object.entries(data.categories).map(([id, category]) => `<button type="button" class="map-filter" data-map-category="${escapeHtml(id)}" aria-pressed="false">${escapeHtml(category.label)}</button>`).join('')}`;
      mapSource.onchange = event => { chooseSource(event.target.value); localSet('night-city-map-source', svg.dataset.source); };
      const actFilter = document.getElementById('map-act-filter');
      if (actFilter) actFilter.onchange = event => { campaignMapAct = event.target.value; applyCampaignMapFilters(); };
      document.getElementById('map-place-search').oninput = event => { campaignMapQuery = event.target.value; applyCampaignMapFilters(); };
      document.getElementById('map-filters').onclick = event => {
        const button = event.target.closest('[data-map-category]');
        if (!button) return;
        campaignMapCategory = button.dataset.mapCategory;
        stage.querySelectorAll('.map-filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        applyCampaignMapFilters();
      };
      document.getElementById('map-marker-list').onclick = event => {
        const button = event.target.closest('[data-map-marker]');
        if (button) showCampaignMapMarker(button.dataset.mapMarker, true, button);
      };
      pinLayer.onclick = event => { const pin = event.target.closest('[data-map-marker]'); if (pin) showCampaignMapMarker(pin.dataset.mapMarker, true, pin); };
      pinLayer.onkeydown = event => {
        const pin = event.target.closest('[data-map-marker]');
        if (pin && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showCampaignMapMarker(pin.dataset.mapMarker, true, pin); }
      };
      const zoom = (factor, point) => {
        cancelGesture();
        const view = campaignMapView, limits = campaignMapLimits();
        const width = Math.max(limits.minWidth, Math.min(limits.maxWidth, view.width * factor));
        const height = width / limits.aspect;
        const anchor = point || { x: view.x + view.width / 2, y: view.y + view.height / 2 };
        setCampaignMapView({ x: anchor.x - (anchor.x - view.x) * width / view.width,
          y: anchor.y - (anchor.y - view.y) * height / view.height, width, height });
      };
      stage.querySelectorAll('[data-map-action]').forEach(button => button.onclick = () => {
        if (button.dataset.mapAction === 'menu') return toggleSidebar();
        if (button.dataset.mapAction === 'reset') { cancelGesture(); resetCampaignMap(); return; }
        zoom(button.dataset.mapAction === 'zoom-in' ? 0.72 : 1 / 0.72);
      });
      const mapPoint = (x, y) => { const point = svg.createSVGPoint(); point.x = x; point.y = y; return point.matrixTransform(svg.getScreenCTM().inverse()); };
      const pointers = new Map();
      let gesture = null;
      cancelGesture = () => {
        const ids = [...pointers.keys()]; pointers.clear(); gesture = null; svg.classList.remove('is-dragging');
        ids.forEach(id => { if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id); });
      };
      const beginGesture = () => {
        const points = [...pointers.values()];
        if (!points.length) { gesture = null; svg.classList.remove('is-dragging'); return; }
        const center = points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
        gesture = { center, anchor: mapPoint(center.x, center.y), view: { ...campaignMapView }, scale: svg.clientWidth / campaignMapView.width,
          distance: points.length > 1 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0 };
        svg.classList.add('is-dragging');
      };
      svg.onpointerdown = event => {
        if ((event.pointerType === 'mouse' && event.button !== 0) || event.target.closest('.map-pin')) return;
        event.preventDefault(); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); svg.setPointerCapture(event.pointerId); beginGesture();
      };
      svg.onpointermove = event => {
        if (!pointers.has(event.pointerId) || !gesture) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pointers.values()];
        const center = points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
        const factor = points.length > 1 && gesture.distance > 0 ? gesture.distance / Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)) : 1;
        const limits = campaignMapLimits();
        const width = Math.max(limits.minWidth, Math.min(limits.maxWidth, gesture.view.width * factor));
        const height = width / limits.aspect, scale = width / gesture.view.width;
        setCampaignMapView({ x: gesture.anchor.x - (gesture.anchor.x - gesture.view.x) * scale - (center.x - gesture.center.x) / gesture.scale * scale,
          y: gesture.anchor.y - (gesture.anchor.y - gesture.view.y) * scale - (center.y - gesture.center.y) / gesture.scale * scale, width, height });
      };
      const endDrag = event => { pointers.delete(event.pointerId); beginGesture(); };
      svg.onpointerup = endDrag; svg.onpointercancel = endDrag; svg.onlostpointercapture = endDrag;
      svg.onwheel = event => { event.preventDefault(); zoom(event.deltaY < 0 ? 0.84 : 1 / 0.84, mapPoint(event.clientX, event.clientY)); };
      svg.onkeydown = event => {
        if (event.target !== svg) return;
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
        if (event.key === '+' || event.key === '=') zoom(0.72);
        else if (event.key === '-') zoom(1 / 0.72);
        else if (event.key === 'Home') { cancelGesture(); resetCampaignMap(); }
        else if (event.key.startsWith('Arrow')) { cancelGesture(); setCampaignMapView({ ...campaignMapView,
          x: campaignMapView.x + ({ ArrowLeft: -1, ArrowRight: 1 }[event.key] || 0) * campaignMapView.width * 0.15,
          y: campaignMapView.y + ({ ArrowUp: -1, ArrowDown: 1 }[event.key] || 0) * campaignMapView.height * 0.15 }); }
      };
      let lastWidth = svg.clientWidth, lastHeight = svg.clientHeight;
      const resize = window.ResizeObserver ? new ResizeObserver(() => {
        if (destroyed || !svg.isConnected || !svg.clientWidth || !svg.clientHeight) return;
        if (svg.clientWidth !== lastWidth || svg.clientHeight !== lastHeight) {
          cancelGesture();
          const cx = campaignMapView.x + campaignMapView.width / 2, cy = campaignMapView.y + campaignMapView.height / 2;
          const width = campaignMapView.width / Math.max(1, lastWidth) * svg.clientWidth, height = width * svg.clientHeight / svg.clientWidth;
          lastWidth = svg.clientWidth; lastHeight = svg.clientHeight;
          setCampaignMapView({ x: cx - width / 2, y: cy - height / 2, width, height });
        } else setCampaignMapView(campaignMapView);
        syncPanels();
        const marker = data.markers.find(item => item.id === campaignMapSelected);
        if (marker && !panels.detail.hidden) focusCampaignMapMarker(marker);
      }) : null;
      resize?.observe(svg); Object.values(panels).forEach(panel => resize?.observe(panel));
      campaignMapCleanup = () => {
        destroyed = true; cancelGesture(); abort.abort(); mobile.removeEventListener('change', onMobile); resize?.disconnect();
        campaignMapTiles?.destroy(); campaignMapTiles = null;
      };
      syncPanels(); setCampaignMapView(campaignMapView); applyCampaignMapFilters();
      if (target?.section && data.markers.some(marker => marker.id === target.section)) showCampaignMapMarker(target.section);
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
        if (page.semBusca || (markdownDocs[id] && markdownDocs[id].semBusca)) return;
        if (markdownDocs[id] && !markdownCache[id]) return;
        const holder = document.createElement('div');
        // O texto como a página mostra (com as citações da base, nas páginas que têm transform na hora).
        const docText = () => { const raw = markdownCache[id]; const shown = markdownDocs[id].transform ? markdownDocs[id].transform(raw) : raw; return typeof shown === 'string' ? shown : raw; };
        // Espaço entre as tags para o texto de blocos vizinhos não grudar no trecho exibido.
        holder.innerHTML = (markdownDocs[id] ? `<div id="md-doc">${renderMarkdown(stripDocTitle(docText()))}</div>` : page.html).replace(/></g, '> <');
        const pageTitle = strip(page.title).replace(/\s+/g, ' ').trim();
        const units = searchUnits(holder);
        // O texto de uma seção não inclui os cartões dela: cada cartão é uma entrada própria.
        const ownText = unit => {
          if (!unit.querySelector('.entry')) return unitBlock(unit, true).map(element => element.textContent).join(' ');
          const copy = unit.cloneNode(true);
          copy.querySelectorAll('.entry').forEach(card => card.remove());
          return copy.textContent;
        };
        units.forEach((unit, index) => {
          const parent = unit.matches('.entry') ? unit.parentElement.closest(unitSelector) : null;
          const kind = unit.matches('.entry') ? 'entry' : unit.matches('.person') ? 'person' : 'section';
          const tag = (unit.querySelector('.entry-tag, .role')?.textContent || '').replace(/\s+/g, ' ').trim();
          entries.push({ id, unit: index, kind, tag, pageTitle: parent ? `${pageTitle} › ${unitTitle(parent)}` : pageTitle, title: unitTitle(unit), text: ownText(unit) });
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

    // ---------------- Busca por palavras ----------------
    // Sinônimos e abreviações (já sem acento): buscar qualquer um acha os outros.
    const synonymGroups = [
      ['cdt', 'rof'], ['pv', 'hp'], ['dv', 'dificuldade'], ['eb', 'eddies', 'eurodolar', 'eurodolares'], ['move', 'movimento'],
      ['lesao', 'lesoes', 'injury'], ['ferido', 'wounded'], ['gravemente', 'seriously'], ['mortalmente', 'mortally'],
      ['municao', 'ammo'], ['granada', 'grenade'], ['escudo', 'shield'], ['cobertura', 'cover'], ['iniciativa', 'initiative'],
      ['furtividade', 'stealth'], ['percepcao', 'perception'], ['evasao', 'evasion', 'esquiva', 'esquivar'], ['briga', 'brawling'],
      ['autofogo', 'autofire'], ['supressivo', 'suppressive'], ['mirado', 'aimed'], ['dano', 'damage'], ['cura', 'healing'],
      ['ciberpsicose', 'cyberpsychosis', 'cyberpsicose', 'cyberpsycho'], ['implante', 'implantes', 'cyberware', 'cromo'],
      ['veiculo', 'veiculos', 'vehicle', 'carro', 'carros'], ['preco', 'custo', 'price', 'cost'], ['arma', 'armas', 'weapon']
    ];
    const synonyms = new Map();
    synonymGroups.forEach(group => group.forEach(word => synonyms.set(word, group)));
    const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'com', 'por', 'para', 'the', 'of']);

    // Cada palavra da busca vira as formas aceitas: ela, os sinônimos e o singular ("lesoes" → "lesao", "pistolas" → "pistola").
    function queryTerms(query) {
      const words = foldForSearch(query.trim()).split(/[^a-z0-9]+/).filter(Boolean);
      const useful = words.filter(word => !stopWords.has(word));
      return (useful.length ? useful : words).map(word => {
        const forms = new Set([word, ...(synonyms.get(word) || [])]);
        if (word.length > 4 && word.endsWith('oes')) forms.add(`${word.slice(0, -3)}ao`);
        else if (word.length > 4 && word.endsWith('s')) forms.add(word.slice(0, -1));
        forms.forEach(form => (synonyms.get(form) || []).forEach(other => forms.add(other)));
        return [...forms];
      });
    }

    // Trechos [início, fim] onde as formas aparecem. Formas curtas (até 3 letras) só valem no começo de uma palavra,
    // para "sp" não casar com "espingarda".
    function matchRanges(folded, needles) {
      const ranges = [];
      needles.forEach(needle => {
        for (let at = folded.indexOf(needle); at >= 0; at = folded.indexOf(needle, at + 1)) {
          if (needle.length <= 3 && at > 0 && /[a-z0-9]/.test(folded[at - 1])) continue;
          ranges.push([at, at + needle.length]);
        }
      });
      ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      return ranges.reduce((merged, range) => {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push([...range]);
        return merged;
      }, []);
    }

    let searchFilter = 'all';
    let searchLimit = 60;
    let lastQuery = '';

    function searchPages(query) {
      const terms = queryTerms(query);
      if (!terms.length) { reopenCurrent(); return; }
      stopCampaignMap();
      if (query !== lastQuery) { searchLimit = 60; lastQuery = query; }
      searchIndex = searchIndex || buildSearchIndex();
      const phrase = foldForSearch(query.trim()).replace(/\s+/g, ' ');
      const matches = searchIndex.flatMap(entry => {
        // Cada palavra precisa aparecer (em qualquer forma aceita) no texto ou no título.
        const perTerm = terms.map(forms => ({ text: matchRanges(entry.folded, forms), title: matchRanges(entry.foldedTitle, forms) }));
        if (perTerm.some(found => !found.text.length && !found.title.length)) return [];
        const title = foldForSearch(entry.title || '');
        let score = perTerm.reduce((sum, found) => sum + (found.title.length ? 10 : 2), 0);
        if (title === phrase) score += 100;
        else if (title.startsWith(phrase)) score += 40;
        if (entry.folded.includes(phrase) || entry.foldedTitle.includes(phrase)) score += 20;
        if (entry.unit === null) score -= 5; // texto solto da página por último
        // O glossário define o termo; quem busca o nome de um item quer o cartão do item primeiro.
        if (entry.id === 'glossary') score -= 60;
        // As páginas da base da campanha (Pessoas e facções, Lugares e peças) vêm antes da ficha de combate do mesmo nome.
        // Uma página de regras com prioridade negativa (o que saiu do suplemento de fã) fica depois da regra que vale.
        score += (markdownDocs[entry.id] && markdownDocs[entry.id].prioridade) || (pageContent[entry.id] && pageContent[entry.id].prioridade) || 0;
        const firstText = perTerm.map(found => found.text[0]).filter(Boolean).sort((a, b) => a[0] - b[0])[0];
        return [{ entry, score, at: firstText ? firstText[0] : 0 }];
      }).sort((first, second) => second.score - first.score);

      const workspaceOf = match => pageWorkspace[match.entry.id] === 'system' ? 'system' : 'campaigns';
      const counts = { all: matches.length, system: matches.filter(match => workspaceOf(match) === 'system').length, campaigns: matches.filter(match => workspaceOf(match) === 'campaigns').length };
      if (searchFilter !== 'all' && !counts[searchFilter]) searchFilter = 'all';
      const filtered = searchFilter === 'all' ? matches : matches.filter(match => workspaceOf(match) === searchFilter);
      const shown = filtered.slice(0, searchLimit);
      const allForms = terms.flat();
      const excerpt = ({ entry, at }) => {
        const start = Math.max(0, at - 70);
        const end = Math.min(entry.characters.length, at + 180);
        const ranges = matchRanges(entry.folded.slice(start, end), allForms);
        let html = '';
        let from = 0;
        const piece = (a, b) => escapeHtml(entry.characters.slice(start + a, start + b).join(''));
        ranges.forEach(([a, b]) => { html += `${piece(from, a)}<mark>${piece(a, b)}</mark>`; from = b; });
        html += piece(from, end - start);
        return `${start ? '…' : ''}${html}${end < entry.characters.length ? '…' : ''}`;
      };
      const filterChip = (key, label) => counts[key] ? `<button type="button" class="search-filter${searchFilter === key ? ' active' : ''}" data-search-filter="${key}">${label} <span>${counts[key]}</span></button>` : '';
      content.innerHTML = `<p class="eyebrow">Busca local / ${matches.length} trecho(s)</p><h2>Resultados</h2><p class="lede"><b>↑ ↓</b> escolhem, <b>Enter</b> abre já na seção certa, <b>Esc</b> volta para a página.</p>
        ${matches.length ? `<div class="search-filters">${filterChip('all', 'Tudo')}${filterChip('system', 'Regras')}${filterChip('campaigns', 'Campanha')}</div>` : ''}
        <div class="search-results">${shown.map((match, index) => `<button class="result${index === 0 ? ' selected' : ''}" data-page="${match.entry.id}"${match.entry.unit === null ? '' : ` data-unit="${match.entry.unit}"`} data-terms="${escapeHtml(JSON.stringify(allForms))}" type="button"><small>${escapeHtml(match.entry.pageTitle)}</small><strong>${escapeHtml(match.entry.title || match.entry.pageTitle)}</strong><p>${excerpt(match)}</p></button>`).join('') || '<div class="empty">Nenhuma entrada encontrada. Tente outro nome, em português ou inglês, ou menos palavras.</div>'}</div>
        ${filtered.length > shown.length ? `<button type="button" class="action search-more" data-search-more>Mostrar mais (${filtered.length - shown.length} restantes)</button>` : ''}`;
      document.querySelectorAll('.nav-item').forEach(button => button.classList.remove('active'));
    }

    // Seleção com as setas na lista de resultados.
    function moveSelection(step) {
      const results = [...content.querySelectorAll('.result')];
      if (!results.length) return;
      const current = results.findIndex(result => result.classList.contains('selected'));
      const next = Math.max(0, Math.min(results.length - 1, current + step));
      results.forEach((result, index) => result.classList.toggle('selected', index === next));
      results[next].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', event => {
      const workspaceTab = event.target.closest('[data-workspace]');
      if (workspaceTab) {
        setWorkspace(workspaceTab.dataset.workspace);
        const defaultPage = workspaceTab.dataset.workspace === 'campaigns' ? homePage() : 'screen';
        if (pageWorkspace[currentPage] !== currentWorkspace) openPage(defaultPage);
        return;
      }
      const tocChip = event.target.closest('[data-toc-index]');
      if (tocChip) {
        tocChip.parentElement.querySelectorAll('[data-toc-index]').forEach(chip => chip.classList.toggle('active', chip === tocChip));
        tocClicked = Number(tocChip.dataset.tocIndex);
        focusUnit(pageUnits(content)[tocClicked], undefined, true);
        return;
      }
      const filterButton = event.target.closest('[data-search-filter]');
      if (filterButton) { searchFilter = filterButton.dataset.searchFilter; searchPages(search.value); search.focus(); return; }
      if (event.target.closest('[data-search-more]')) { searchLimit += 60; searchPages(search.value); return; }
      const rollButton = event.target.closest('[data-roll]');
      if (rollButton) {
        const result = rollTable(rollButton.dataset.roll);
        if (result) showRoll(rollButton, `<span class="roll-value">${result.dado}: ${result.value}</span> ${result.html}`);
        return;
      }
      const pin = event.target.closest('[data-pin]');
      if (pin) { togglePin(pin.dataset.pin); return; }
      const critButton = event.target.closest('[data-crit]');
      if (critButton) { rollCritical(critButton.dataset.crit); return; }
      const button = event.target.closest('[data-page]');
      if (button) {
        let terms;
        try { terms = button.dataset.terms ? JSON.parse(button.dataset.terms) : undefined; } catch { terms = undefined; }
        const target = button.dataset.section ? { section: button.dataset.section } : button.dataset.unit === undefined ? undefined : { unit: Number(button.dataset.unit), term: terms };
        openPage(button.dataset.page, target);
      }
    });
    document.addEventListener('keydown', event => {
      const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');
      if ((event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        if (document.body.classList.contains('map-immersive')) {
          stopCampaignMap();
          content.innerHTML = '<p class="eyebrow">Busca na wiki</p><h2>Buscar</h2><p class="lede">Digite um nome ou assunto. Esc retorna ao mapa.</p>';
        }
        search.focus();
        search.select();
      }
      // [ : barra lateral compacta (ou a gaveta, no celular). Esc fecha a gaveta.
      if (event.key === '[' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); toggleSidebar(); }
      if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) { setDrawer(false); if (!document.body.classList.contains('map-immersive')) menuButton.focus(); }
    });
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') { reopenCurrent(); search.blur(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!content.querySelector('.result')) return;
        event.preventDefault();
        moveSelection(event.key === 'ArrowDown' ? 1 : -1);
      }
      if (event.key === 'Enter') {
        const chosen = content.querySelector('.result.selected') || content.querySelector('.result');
        if (chosen) { event.preventDefault(); chosen.click(); search.blur(); }
      }
    });
    // Troca de campanha (o seletor da barra lateral e o menu da conta). A página pode segurar a troca (o Publicar com
    // alterações não publicadas): config.confirmCampaignChange. Na mesma página, se a campanha nova também tem
    // (Personagens, Loja, Publicar): ela se monta de novo para a campanha nova. Senão, a página inicial da campanha.
    async function switchCampaign(wanted) {
      if (wanted === activeCampaignId || !campaigns.some(item => item.id === wanted)) return false;
      if (config.confirmCampaignChange && !(await config.confirmCampaignChange(campaigns.find(item => item.id === wanted)))) return false;
      setCampaign(wanted);
      openPage(pagesOf(activeCampaign()).includes(currentPage) ? currentPage : homePage(), undefined, 'replace');
      return true;
    }
    navigation.addEventListener('change', event => {
      if (event.target.id !== 'campaign-picker') return;
      const wanted = event.target.value;
      event.target.value = activeCampaignId;
      switchCampaign(wanted);
    });
    search.addEventListener('input', () => searchPages(search.value));
    if (!['campaigns', 'system'].includes(currentWorkspace)) currentWorkspace = 'campaigns';
    updateStickyOffset();
    showCampaign();
    buildNavigation();
    labelMenuButton();
    // Abre a página do endereço (link direto, recarregar) ou a inicial.
    if (pageContent[readHash().id] || aliases[readHash().id]) routeFromHash();
    else openPage(homePage(), undefined, 'replace');
    // A mesa do mestre e as preferências da conta chegam do servidor depois da primeira página.
    document.addEventListener('wiki:mesa', () => { if (currentPage === 'home' && !search.value.trim()) openPage('home', undefined, 'none'); });
    document.addEventListener('wiki:preferencias', () => {
      document.body.classList.toggle('sidebar-compact', storage.get('barra-compacta') === '1');
      buildNavigation();
      labelMenuButton();
      const pin = content.querySelector('[data-pin]');
      if (pin) pin.outerHTML = pinButton(pin.dataset.pin);
    });
    loadTable();
    prefs.load();
    // Pré-carrega os documentos para a busca encontrar o texto completo deles.
    if (Object.keys(markdownDocs).length) Promise.allSettled(Object.keys(markdownDocs).filter(id => !markdownDocs[id].semBusca).map(loadMarkdownDoc)).then(() => {
      searchIndex = null;
      if (search.value.trim()) searchPages(search.value);
    });

    // Alerta de arquivo revertido (só a wiki do mestre configura healthUrl): o servidor compara os arquivos com o git.
    function checkHealth() {
      if (!config.healthUrl || location.protocol === 'file:') return;
      fetch(config.healthUrl, { cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          document.getElementById('health-banner')?.remove();
          const reverted = (data && data.revertidos) || [];
          if (!reverted.length) return;
          const banner = document.createElement('div');
          banner.id = 'health-banner';
          banner.className = 'health-banner';
          banner.setAttribute('role', 'alert');
          banner.innerHTML = `<b>Arquivo da campanha voltou para uma versão antiga</b> (provavelmente pelo OneDrive). Não edite ${reverted.length > 1 ? 'esses arquivos' : 'esse arquivo'}; a wiki está mostrando o conteúdo antigo.<ul>${reverted.map(item => `<li><code>${escapeHtml(item.arquivo)}</code> está igual à versão ${escapeHtml(item.commit)}. Para restaurar: <code>git checkout HEAD -- "${escapeHtml(item.arquivo)}"</code></li>`).join('')}</ul>`;
          document.querySelector('main').prepend(banner);
        })
        .catch(() => { /* servidor antigo ou sem rede: sem alerta */ });
    }
    checkHealth();
    setInterval(checkHealth, 5 * 60 * 1000);

    // Barra lateral: a mesa do Foundry (aberta, quem está conectado e o link), entrar ou sair como mestre
    // e, para o mestre, a versão no ar. Tudo vem de config.statusUrl (api/estado).
    let installPrompt = null;
    let lastState = null;
    // A troca de mesa pedida pelo mestre ({ foundry, at }), até a mesa nova responder (ou 3 minutos).
    let tableSwitch = null;
    // O quadro da barra lateral é a mesa (e, para o mestre, a saúde do servidor). Quem está usando a wiki, a versão no
    // ar, o backup, "Instalar no celular" e entrar ou sair ficam no menu da conta (conta.js), que ouve "wiki:estado".
    function drawStatus(state) {
      lastState = state;
      document.dispatchEvent(new CustomEvent('wiki:estado', { detail: { ...(state || {}), instalar: Boolean(installPrompt) } }));
      let box = document.getElementById('side-status');
      if (!state) { box?.remove(); return; }
      if (!box) {
        box = document.createElement('div');
        box.id = 'side-status';
        box.className = 'side-status';
        // No pé da barra lateral, como no exemplo ("Mesa aberta // 3 conectados"), sempre à vista (CSS: sticky).
        document.querySelector('aside')?.append(box);
      }
      const mesa = state.mesa;
      let table = '';
      if (mesa && mesa.url) {
        // Com mais de uma campanha, a mesa aberta diz de qual é (o servidor só conta a quem joga nela).
        const [kind, text] = !mesa.online ? ['off', 'Mesa fora do ar']
          : mesa.aberta ? ['on', `Mesa aberta${mesa.campanha && campaigns.length > 1 ? `: ${mesa.campanha.nome}` : ''}${mesa.usuarios ? ` // ${mesa.usuarios} ${mesa.usuarios > 1 ? 'conectados' : 'conectado'}` : ''}`]
          : ['idle', 'Foundry ligado, sem mundo aberto'];
        // O mestre, no servidor com o Foundry 12 e o 14: qual é a mesa, e o botão para trocar.
        const mesas = state.servidor?.mesas || [];
        if (tableSwitch && ((mesa.online && mesa.foundry === tableSwitch.foundry) || Date.now() - tableSwitch.at > 3 * 60 * 1000)) tableSwitch = null;
        const switcher = mesas.length > 1 ? `<div class="table-switch" role="group" aria-label="Versão do Foundry na mesa"><span>Foundry</span>${mesas.map(foundry => `<button type="button" data-table-switch="${foundry}" aria-pressed="${mesa.online && mesa.foundry === foundry}"${tableSwitch ? ' disabled' : ''} title="${mesa.online && mesa.foundry === foundry ? `A mesa está no Foundry ${foundry}` : `Trocar a mesa para o Foundry ${foundry}`}">${foundry}</button>`).join('')}${tableSwitch ? `<span class="table-switching">ligando o ${tableSwitch.foundry}…</span>` : ''}</div>` : '';
        table = `<div class="table-status table-${kind}" title="${escapeHtml(text)}"><span class="table-dot" aria-hidden="true"></span><span class="table-text">${escapeHtml(text)}</span></div>
          ${switcher}${mesa.online ? `<a class="action table-link" href="${escapeHtml(mesa.url)}" target="_blank" rel="noopener">Entrar na mesa</a>` : ''}`;
      }
      // Saúde do servidor (só para o mestre, no servidor online): em vermelho com backup de mais de 2 dias ou disco quase cheio.
      const health = state.servidor;
      let server = '';
      if (health) {
        const days = health.backup ? (Date.now() - new Date(health.backup.data)) / 86400000 : Infinity;
        const free = health.disco && health.disco.total ? health.disco.livre / health.disco.total : 1;
        const when = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const summary = [health.backup ? `backup ${when(health.backup.data)}` : 'sem backup ainda', health.disco ? `${Math.round(free * 100)}% do disco livre` : '', health.moduloPendente ? 'módulo esperando a mesa vazia' : ''].filter(Boolean).join(' · ');
        server = `<details class="side-server${days > 2 || free < 0.1 ? ' side-server-bad' : ''}"><summary>Servidor: ${escapeHtml(summary)}</summary>${health.backup ? `<p>${escapeHtml(health.backup.nome)}, ${(health.backup.tamanho / 1048576).toFixed(1)} MB</p>` : ''}${health.registro.length ? `<ul>${health.registro.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p>Nenhuma publicação ainda.</p>'}</details>`;
      }
      box.innerHTML = `${table}${server}`;
      box.hidden = !box.innerHTML.trim();
    }
    function checkStatus() {
      if (!config.statusUrl || location.protocol === 'file:') return;
      fetch(config.statusUrl, { cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(drawStatus)
        .catch(() => { /* servidor antigo ou sem rede: sem barra */ });
    }
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-gm-logout]')) return;
      fetch('api/mestre/sair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(() => { location.href = './'; });
    });
    checkStatus();
    setInterval(checkStatus, 60 * 1000);

    // Trocar a mesa entre o Foundry 12 e o 14 (o mestre, no servidor): confirma, e com gente conectada confirma de novo; a
    // barra confere a cada 5 s até a mesa nova responder.
    async function switchTable(foundry) {
      const mesa = (lastState && lastState.mesa) || {};
      if (tableSwitch || (mesa.online && mesa.foundry === foundry)) return;
      const atual = mesa.online && mesa.foundry ? `o Foundry ${mesa.foundry}` : 'o Foundry de agora';
      const sure = await window.wikiPopup.confirm({ title: `Mesa no Foundry ${foundry}`, html: `<p>${atual[0].toUpperCase()}${atual.slice(1)} desliga e o Foundry ${foundry} liga: a mesa fica fora do ar por alguns segundos. Ele continua sendo a mesa mesmo quando o servidor reinicia.</p>`, ok: `Trocar para o ${foundry}` });
      if (!sure) return;
      const send = forcar => fetch('api/mestre/mesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foundry, forcar }) })
        .then(async response => ({ status: response.status, data: await response.json().catch(() => ({})) }))
        .catch(() => ({ status: 0, data: { erro: 'Sem resposta da wiki.' } }));
      let result = await send(false);
      if (result.status === 409 && result.data.confirmar) {
        const force = await window.wikiPopup.confirm({ title: 'Tem gente na mesa', message: `${result.data.erro} Trocar mesmo assim?`, ok: 'Trocar mesmo assim', danger: true });
        if (!force) return;
        result = await send(true);
      }
      if (result.status !== 200) { window.wikiPopup.toast(result.data.erro || 'Não consegui trocar a mesa.', { tone: 'bad', ms: 8000 }); return; }
      if (!result.data.jaEstava) {
        tableSwitch = { foundry, at: Date.now() };
        window.wikiPopup.toast(`Ligando o Foundry ${foundry}: a mesa volta em alguns segundos.`, { tone: 'ok' });
        drawStatus(lastState);
        const poll = setInterval(() => { if (tableSwitch) checkStatus(); else clearInterval(poll); }, 5000);
      }
      checkStatus();
    }
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-table-switch]');
      if (button && !button.disabled) switchTable(Number(button.dataset.tableSwitch));
    });

    // A wiki instalada (celular ou computador): o service worker guarda as regras e o que o mestre publicou para
    // abrir sem internet (sw.js). Quando o navegador deixa instalar, o menu da conta mostra "Instalar no celular".
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker: a wiki funciona igual, só não abre sem rede */ });
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; drawStatus(lastState); });
    function install() {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt.userChoice.finally(() => { installPrompt = null; drawStatus(lastState); });
    }
    document.addEventListener('click', event => { if (event.target.closest('[data-install]')) install(); });

    // Atualiza páginas já carregadas (a visão dos jogadores recebe as novidades do mestre sem recarregar).
    function updatePages(pages) {
      Object.assign(pageContent, pages);
      searchIndex = null;
      if (pages[currentPage] && !search.value.trim()) {
        const scroll = window.scrollY;
        const { id, section } = readHash();
        // Sem rolagem ainda (primeira carga de um link direto): vai à seção do endereço; senão, mantém onde estava.
        if (!scroll && id === currentPage && section) { openPage(currentPage, { section }, 'none'); return; }
        openPage(currentPage, undefined, 'none');
        window.scrollTo({ top: scroll });
      }
    }

    // activeCampaign: { id, name, color, ... } da campanha escolhida no menu (o que cada página da campanha usa).
    // Voltar ao topo: aparece nas páginas longas (regras, documentos), depois de rolar uma tela e meia.
    const toTop = document.createElement('button');
    toTop.type = 'button';
    toTop.className = 'to-top';
    toTop.hidden = true;
    toTop.title = 'Voltar ao topo';
    toTop.setAttribute('aria-label', 'Voltar ao topo');
    toTop.innerHTML = '<span aria-hidden="true"></span>';
    document.body.append(toTop);
    toTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); search.focus({ preventScroll: true }); });
    window.addEventListener('scroll', () => { toTop.hidden = window.scrollY < window.innerHeight * 1.5; }, { passive: true });

    // Agenda: quando é uma sessão marcada, para ler ("sábado, 10 de outubro", "19:00–23:00", "em 2 dias"), e o .ics para
    // o calendário do celular (com lembrete 1 hora antes). item: { id, inicio (ISO), duracao (minutos), titulo, nota }.
    function sessionTime(item, now = new Date()) {
      const start = new Date(item.inicio);
      const end = new Date(start.getTime() + item.duracao * 60000);
      const day = date => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const days = Math.round((day(start) - day(now)) / 86400000);
      const hour = date => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const relative = now >= start && now < end ? 'agora' : end <= now ? 'já passou' : days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
      return { data: start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }), horario: `${hour(start)}–${hour(end)}`, relativo: relative, curto: `${start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${hour(start)}` };
    }
    function downloadSession(item, campaignName) {
      const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const text = value => String(value || '').replace(/\\/g, '\\\\').replace(/[;,]/g, match => `\\${match}`).replace(/\r?\n/g, '\\n');
      // Linhas do .ics: no máximo 75 caracteres; a continuação começa com um espaço.
      const fold = line => (line.match(/.{1,72}/gu) || ['']).join('\r\n ');
      const start = new Date(item.inicio);
      const end = new Date(start.getTime() + item.duracao * 60000);
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cyberpunk Fieldbook//Agenda//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
        `UID:${item.id}@cyberpunk-fieldbook`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
        `SUMMARY:${text(`${campaignName}: ${item.titulo || 'sessão'}`)}`, ...(item.nota ? [`DESCRIPTION:${text(item.nota)}`] : []), `URL:${location.origin}${location.pathname}`,
        'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${text(`${campaignName} em 1 hora`)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([`${lines.map(fold).join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' }));
      link.download = `sessao-${String(item.inicio).slice(0, 10)}.ics`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    // switchCampaign: troca a campanha ativa (pergunta antes, se a página pedir). setBadges: selos de novidade no menu.
    // status: o último /api/estado. hasPage: a página existe nesta wiki (a do mestre tem páginas que a dos jogadores não tem).
    window.wikiApp = { openPage, updatePages, escapeHtml, renderMarkdown, setupMap: setupCampaignMap, setupNotes, currentPage: () => currentPage, activeCampaign, campaigns: () => campaigns, switchCampaign, setBadges, prefs, hasPage: id => Boolean(pageContent[id]), status: () => lastState, install, toggleSidebar, recentPages, clockState, rollTable, rollDice, showRoll, linkGlossary, sessionTime, downloadSession };
    // Quem depende da wiki montada (o menu da conta) começa aqui.
    document.dispatchEvent(new Event('wiki:pronta'));
})();
