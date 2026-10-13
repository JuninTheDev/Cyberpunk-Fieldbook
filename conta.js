// Conta, no canto direito da barra de cima (as duas wikis): quem está usando a wiki e, para o jogador, o personagem
// escolhido. O retrato dele fica no botão; o menu troca de personagem, cria um novo, abre a ficha e a loja, troca de
// campanha e sai.
//   visitante → "Entrar", com o código que o mestre passou;
//   jogador   → o personagem escolhido (um por campanha, lembrado neste aparelho), os outros dele e "Sair";
//   mestre    → a campanha ativa, os atalhos do mestre, a versão no ar, o backup e "Sair do modo mestre".
// O personagem escolhido vale para a Ficha e a Loja (quando nenhum outro foi aberto) e para o resumo do jogador:
// window.playerAccount, e o evento "wiki:personagem" avisa quando ele muda.
// Pedidos da loja que o mestre aprovou, recusou ou o Foundry entregou desde a última vez que o jogador abriu a Loja
// daquele personagem: número no botão, aviso no menu e, se acontecer com a wiki aberta, um aviso rápido (confere a
// cada minuto).
(() => {
  let app = null;
  let me = null; // api/eu: { papel, jogador, campanhas }; null = sem servidor
  let characters = []; // os do jogador na campanha ativa (o resumo de cada um)
  let state = {}; // o último api/estado (evento wiki:estado)
  let ticket = null;
  let root = null;
  const esc = text => app.escapeHtml(text);
  const store = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* sem armazenamento: escolhe o primeiro */ } }
  };
  // Pedidos já vistos, por personagem (o id do pedido e o estado em que foi visto).
  const ORDER_WORDS = { aprovado: 'aprovado', recusado: 'recusado', entregue: 'entregue na ficha' };
  const orderKey = order => `${order.id}:${order.status}:${order.erro ? 'erro' : ''}`;
  // Na conta (wikiApp.prefs: igual em qualquer aparelho); o que estava só neste aparelho, de antes, ainda vale.
  const seenOrders = id => {
    const value = app.prefs.get(`pedidos:${id}`);
    if (value !== undefined) return value;
    try { return JSON.parse(store.get(`night-city-pedidos-vistos-${id}`) || 'null'); } catch { return null; }
  };
  const setSeenOrders = (id, keys) => app.prefs.set(`pedidos:${id}`, keys);
  const resolved = doc => (doc.pedidos && doc.pedidos.resolvidos) || [];
  const unseenOrders = doc => { const seen = seenOrders(doc.id) || []; return resolved(doc).filter(order => !seen.includes(orderKey(order))); };
  function markOrdersSeen(id) {
    const doc = characters.find(item => item.id === id);
    if (!doc) return;
    setSeenOrders(id, resolved(doc).map(orderKey));
    render();
  }
  let toasted = null; // os já avisados nesta visita (o primeiro carregamento não avisa)
  const ROLES = { rockerboy: 'Rockerboy', solo: 'Solo', netrunner: 'Netrunner', tech: 'Tech', medtech: 'Medtech', media: 'Media', exec: 'Exec', lawman: 'Lawman', fixer: 'Fixer', nomad: 'Nomad', face: 'Rockerboy', corpo: 'Exec' };

  async function api(path, { method = 'GET', body } = {}) {
    try {
      const response = await fetch(path, { method, headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store' });
      let data = {};
      try { data = await response.json(); } catch { /* resposta sem JSON */ }
      return { status: response.status, data };
    } catch {
      return { status: 0, data: { erro: 'Sem conexão com o servidor da wiki.' } };
    }
  }

  // ---------------- Personagem escolhido ----------------
  // A visão dos jogadores sem código (ou sem servidor) tem uma campanha de mentira (real: false).
  const campaign = () => { const item = app.activeCampaign(); return item && item.real !== false ? item : null; };
  // O personagem em uso de cada campanha, na conta (o de antes, deste aparelho, ainda vale até escolher de novo).
  const savedSelection = () => {
    if (!me || !me.jogador || !campaign()) return null;
    const value = app.prefs.get(`personagem:${campaign().id}`);
    return value !== undefined ? value : store.get(`night-city-personagem-${me.jogador.id}-${campaign().id}`);
  };
  function selectedDoc() {
    if (!characters.length) return null;
    const id = savedSelection();
    return characters.find(item => item.id === id) || characters[0];
  }
  const announce = () => document.dispatchEvent(new CustomEvent('wiki:personagem', { detail: selectedDoc() }));
  function select(id) {
    if (!characters.some(item => item.id === id)) return;
    if (campaign()) app.prefs.set(`personagem:${campaign().id}`, id);
    render();
    announce();
  }

  // Quem é, e os personagens dele na campanha ativa.
  async function load() {
    const mine = ticket = {};
    const eu = await api('api/eu');
    if (mine !== ticket) return;
    me = eu.status === 200 ? eu.data : null;
    characters = [];
    if (me && me.papel === 'jogador' && campaign()) {
      const list = await api(`api/personagens?campanha=${encodeURIComponent(campaign().id)}`);
      if (mine !== ticket) return;
      characters = (list.data.personagens || []).filter(item => !item.publico);
      for (const doc of characters) if (seenOrders(doc.id) === null) setSeenOrders(doc.id, resolved(doc).map(orderKey));
      const fresh = characters.flatMap(doc => unseenOrders(doc).map(order => ({ doc, order })));
      if (toasted) fresh.filter(({ order }) => !toasted.has(orderKey(order))).forEach(({ doc, order }) => window.wikiPopup?.toast(`${doc.nome || 'Seu personagem'}: pedido ${ORDER_WORDS[order.status]}${order.erro ? ' (com um aviso do mestre)' : ''}. Veja na Loja.`, { tone: order.status === 'recusado' ? 'bad' : 'ok', ms: 7000 }));
      toasted = new Set(fresh.map(({ order }) => orderKey(order)));
    }
    render();
    announce();
  }

  // ---------------- Desenho ----------------
  const initials = text => String(text || '?').trim().split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase() || '?';
  const avatar = (doc, fallback, size = '') => (doc && doc.retrato
    ? `<span class="account-avatar${size}"><img src="${esc(doc.retrato)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`
    : `<span class="account-avatar${size} account-initials">${esc(initials(fallback))}</span>`);
  const PERSON_ICON = '<span class="account-avatar account-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></span>';
  const hp = doc => (doc.mesa && doc.mesa.hp ? ` · HP ${doc.mesa.hp.atual}/${doc.mesa.hp.max} na mesa` : '');
  const nameOf = doc => `${doc.nome || 'Sem nome'}${doc.apelido ? ` "${doc.apelido}"` : ''}`;

  function buttonHtml() {
    if (!me || me.papel === 'visitante') return `${PERSON_ICON}<span class="account-name"><b>Entrar</b><small>${me ? 'código do jogador' : 'sem conexão'}</small></span>`;
    if (me.papel === 'mestre') return `<span class="account-avatar account-initials account-gm">GM</span><span class="account-name"><b>Mestre</b><small>${esc((app.activeCampaign() || {}).name || '')}</small></span><span class="account-caret" aria-hidden="true"></span>`;
    const doc = selectedDoc();
    const orders = characters.reduce((sum, item) => sum + unseenOrders(item).length, 0);
    // Personagem ainda sem nome (recém-criado): as iniciais do jogador.
    return `${orders ? `<span class="account-dot" title="Pedidos resolvidos pelo mestre">${orders}</span>` : ''}${avatar(doc, (doc && doc.nome) || me.jogador.nome)}<span class="account-name"><b>${esc(doc ? doc.nome || 'Sem nome' : me.jogador.nome)}</b><small>${esc(doc ? me.jogador.nome : 'sem personagem')}</small></span><span class="account-caret" aria-hidden="true"></span>`;
  }

  const section = (title, body) => `<div class="account-section"><p class="account-label">${title}</p>${body}</div>`;
  const install = () => (state.instalar ? '<button type="button" class="account-item" data-install>Instalar no celular</button>' : '');
  const campaignList = (items, active) => (items.length > 1 ? section('Campanha', items.map(item => `<button type="button" class="account-item account-radio" aria-current="${item.id === active}" data-account-campaign="${esc(item.id)}"><span class="account-swatch" style="background:${esc(item.cor || item.color || '#888')}"></span>${esc(item.nome || item.name)}</button>`).join('')) : '');

  function menuHtml() {
    if (!me) return '<p class="account-msg">Sem conexão com o servidor da wiki. As regras continuam na aba Regras.</p>';
    if (me.papel === 'visitante') {
      return `<p class="account-head">Entrar na wiki</p>
        <form class="account-login" data-account-login><label for="account-code">Código do jogador</label><div><input id="account-code" name="codigo" autocomplete="off" placeholder="NC-XXXX-XXXX"><button class="action" type="submit">Entrar</button></div></form>
        <p class="account-msg" data-account-msg role="status"></p>
        <p class="account-note">O código vem do mestre. Este aparelho lembra dele.</p>
        ${install()}${state.login ? '<a class="account-item" href="mestre">Entrar como mestre</a>' : ''}`;
    }
    if (me.papel === 'mestre') {
      const active = app.activeCampaign() || {};
      const shortcuts = [['personagens', 'Personagens e códigos'], ['playerView', 'Visão dos jogadores'], ['campanhas', 'Campanhas'], ['agenda', 'Agenda das mesas']].filter(([id]) => app.hasPage(id));
      const version = state.versao ? `<p class="account-note">No ar: ${esc(state.versao.commit)} · ${new Date(state.versao.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>` : '';
      return `<p class="account-head">Mestre<small>${esc(active.name || '')}</small></p>
        ${campaignList(app.campaigns(), active.id)}
        ${shortcuts.length ? section('Atalhos', shortcuts.map(([id, label]) => `<button type="button" class="account-item" data-account-page="${id}">${label}</button>`).join('')) : ''}
        <div class="account-section">${app.hasPage('playerView') ? `<a class="account-item" href="jogadores.html?campanha=${encodeURIComponent(active.id || '')}" target="_blank" rel="noopener">Abrir a visão dos jogadores</a>` : '<a class="account-item" href="./">Wiki do mestre</a>'}
        ${state.backup ? '<a class="account-item" href="api/backup">Baixar backup</a>' : ''}${install()}
        ${state.modo === 'hospedado' ? '<button type="button" class="account-item account-danger" data-gm-logout>Sair do modo mestre</button>' : ''}${version}</div>`;
    }
    const doc = selectedDoc();
    const here = campaign();
    const rows = characters.map(item => `<button type="button" class="account-item account-character" aria-current="${Boolean(doc && item.id === doc.id)}" data-account-pick="${esc(item.id)}">${avatar(item, item.nome || me.jogador.nome, ' account-avatar-sm')}<span><b>${esc(nameOf(item))}</b><small>${esc(ROLES[item.role] || 'sem Role')}${esc(hp(item))}</small>${unseenOrders(item).length ? `<small class="account-orders">${unseenOrders(item).map(order => `pedido ${ORDER_WORDS[order.status]}`).join(' · ')}: veja na Loja</small>` : ''}</span></button>`).join('');
    return `<p class="account-head">${esc(me.jogador.nome)}<small>${esc(here ? here.name : '')}</small></p>
      ${section('Personagem', `${rows || `<p class="account-note">Nenhum personagem${here ? ` em ${esc(here.name)}` : ''} ainda.</p>`}<button type="button" class="account-item account-new" data-account-new>+ Novo personagem</button>`)}
      ${doc ? `<div class="account-actions"><button type="button" class="action" data-account-open="ficha">Ficha</button><button type="button" class="action" data-account-open="criador">Editar</button><button type="button" class="action" data-account-open="loja">Loja</button></div>` : ''}
      ${campaignList(me.campanhas || [], here && here.id)}
      <div class="account-section">${install()}<button type="button" class="account-item account-danger" data-account-logout>Sair</button><button type="button" class="account-item account-quiet" data-account-logout-all>Sair de todos os aparelhos</button></div>`;
  }

  function render() {
    if (!root) return;
    const button = root.querySelector('.account-button');
    button.innerHTML = buttonHtml();
    button.title = !me || me.papel === 'visitante' ? 'Entrar com o código do jogador' : me.papel === 'mestre' ? 'Mestre: campanha e atalhos' : 'Personagem e conta';
    const menu = root.querySelector('.account-menu');
    // Com o menu aberto, só redesenha se ninguém estiver digitando nele (o código do jogador).
    if (!menu.hidden && !menu.contains(document.activeElement)) menu.innerHTML = menuHtml();
  }
  function openMenu(open = true) {
    const menu = root.querySelector('.account-menu');
    const button = root.querySelector('.account-button');
    if (open) menu.innerHTML = menuHtml();
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    root.classList.toggle('open', open);
    if (open) (menu.querySelector('input') || menu.querySelector('[aria-current="true"]') || menu.querySelector('button, a'))?.focus({ preventScroll: true });
  }

  // ---------------- Ações ----------------
  async function onClick(event) {
    const target = event.target.closest('[data-account-pick], [data-account-new], [data-account-open], [data-account-campaign], [data-account-page], [data-account-logout], [data-account-logout-all]');
    if (!target) return;
    const close = () => openMenu(false);
    if (target.dataset.accountPick) { select(target.dataset.accountPick); close(); return; }
    if (target.dataset.accountOpen) { const doc = selectedDoc(); close(); if (doc) app.openPage(target.dataset.accountOpen, { section: doc.id }); return; }
    if (target.dataset.accountPage) { close(); app.openPage(target.dataset.accountPage); return; }
    if (target.dataset.accountCampaign) { close(); await app.switchCampaign(target.dataset.accountCampaign); return; }
    if ('accountLogout' in target.dataset) { await app.prefs.forget(); await api('api/sair', { method: 'POST', body: {} }); location.reload(); return; }
    // Celular perdido, computador emprestado: todos os aparelhos saem; para voltar, o código de novo.
    if ('accountLogoutAll' in target.dataset) {
      close();
      const sure = await window.wikiPopup.confirm({ title: 'Sair de todos os aparelhos', html: '<p>A wiki sai da sua conta em <b>todos</b> os aparelhos, inclusive neste. Para voltar, entre de novo com o seu código.</p>', ok: 'Sair de todos', danger: true });
      if (!sure) return;
      await app.prefs.forget();
      await api('api/sair-de-todos', { method: 'POST', body: {} });
      location.reload();
      return;
    }
    if ('accountNew' in target.dataset) {
      target.disabled = true;
      const blank = window.characterCreator && window.characterCreator.regras ? window.characterCreator.regras.blank() : {};
      const created = await api('api/personagens', { method: 'POST', body: { ...blank, ...(campaign() ? { campanha: campaign().id } : {}) } });
      target.disabled = false;
      if (created.status !== 201) { window.wikiPopup?.toast(created.data.erro || 'Não consegui criar o personagem.', { tone: 'bad' }); return; }
      close();
      characters = [...characters, created.data.personagem];
      select(created.data.personagem.id);
      app.openPage('criador', { section: created.data.personagem.id });
      load();
    }
  }
  async function onSubmit(event) {
    if (!event.target.closest('[data-account-login]')) return;
    event.preventDefault();
    const message = root.querySelector('[data-account-msg]');
    const answer = await api('api/entrar', { method: 'POST', body: { codigo: event.target.elements.codigo.value.trim() } });
    // Recarrega: o menu e a wiki passam a ter as campanhas do jogador (e o que foi publicado nelas).
    if (answer.status === 200) { location.reload(); return; }
    if (message) message.textContent = answer.data.erro || 'Não deu certo.';
  }

  function start() {
    if (root || !window.wikiApp || !document.querySelector('.topbar')) return;
    app = window.wikiApp;
    root = document.createElement('div');
    root.className = 'account';
    root.innerHTML = '<button type="button" class="account-button" aria-haspopup="dialog" aria-expanded="false"></button><div class="account-menu" role="dialog" aria-label="Conta" hidden></div>';
    document.querySelector('.topbar').append(root);
    root.querySelector('.account-button').addEventListener('click', () => openMenu(root.querySelector('.account-menu').hidden));
    root.querySelector('.account-menu').addEventListener('click', onClick);
    root.querySelector('.account-menu').addEventListener('submit', onSubmit);
    // Fecha ao clicar fora e com Esc.
    document.addEventListener('click', event => { if (!root.contains(event.target) && !root.querySelector('.account-menu').hidden) openMenu(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !root.querySelector('.account-menu').hidden) { openMenu(false); root.querySelector('.account-button').focus(); } });
    document.addEventListener('wiki:estado', event => { state = event.detail || {}; render(); });
    document.addEventListener('wiki:campanha', load);
    // As preferências da conta chegaram (o personagem em uso pode ser outro, escolhido em outro aparelho).
    document.addEventListener('wiki:preferencias', () => { render(); announce(); });
    document.addEventListener('wiki:pagina', event => {
      if (event.detail.id !== 'loja') return;
      const target = event.detail.target && event.detail.target.section;
      markOrdersSeen(target || (selectedDoc() || {}).id);
    });
    // Pedidos resolvidos com a wiki aberta: confere a cada minuto (só o jogador, com a aba à vista).
    setInterval(() => { if (me && me.papel === 'jogador' && document.visibilityState === 'visible') load(); }, 60 * 1000);
    state = { ...(app.status() || {}) };
    // A visão dos jogadores já leu api/eu antes de montar a wiki: desenha logo, e confere em seguida.
    if (window.playerIdentity !== undefined) me = window.playerIdentity;
    render();
    if (location.protocol !== 'file:') load();
  }

  window.playerAccount = {
    selected: () => (selectedDoc() || {}).id || null,
    selectedDoc,
    select,
    refresh: () => load(),
    // O criador salvou (nome, apelido, Role, retrato): atualiza o botão sem perguntar ao servidor.
    update: doc => {
      if (!doc || !characters.some(item => item.id === doc.id)) return;
      const fields = Object.fromEntries(['nome', 'apelido', 'role', 'retrato'].filter(key => key in doc).map(key => [key, doc[key]]));
      characters = characters.map(item => (item.id === doc.id ? { ...item, ...fields } : item));
      render();
    },
    papel: () => (me ? me.papel : null),
    roleName: id => ROLES[id] || '',
    open: () => start() || openMenu(true)
  };
  if (window.wikiApp) start(); else document.addEventListener('wiki:pronta', start);
})();
