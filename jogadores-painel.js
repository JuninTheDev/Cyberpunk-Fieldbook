// Painel do mestre para a visão dos jogadores: escolhe o que foi revelado e publica. Carregado só pelo index.html.
// Cada campanha tem o seu Publicar (api/campanhas/<id>/publicar): o mestre lê e grava tudo, inclusive o que ainda
// está escondido, e o servidor manda aos jogadores dessa campanha só o que foi revelado, sem as notas do mestre.
// As Notícias de Night City (api/night-city) são o mural que todas as campanhas veem.
(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const slug = text => String(text || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

  // Como cada lista aparece no painel e o que vai para os jogadores. nightCity é de todas as campanhas.
  const newsFields = [['titulo', 'Título', 'input'], ['data', 'Quando (texto livre)', 'input'], ['texto', 'Texto', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']];
  const kinds = {
    npcs: { flag: 'revelado', flagLabel: 'Revelado', fields: [['nome', 'Nome', 'input'], ['papel', 'Como o grupo conhece', 'input'], ['texto', 'O que o grupo sabe (aceita **negrito** e listas)', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { nome: '', papel: '', texto: '', nota: '', revelado: false } },
    lugares: { flag: 'revelado', flagLabel: 'No mapa', fields: [['nome', 'Nome', 'input'], ['distrito', 'Bairro / distrito', 'input'], ['x', 'X', 'number'], ['y', 'Y', 'number'], ['texto', 'O que o grupo sabe', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { nome: '', distrito: '', x: 2800, y: 2660, texto: '', nota: '', revelado: false } },
    // Sessões: o resumo de cada uma, na ordem do painel (a última aparece no Resumo dos jogadores).
    sessoes: { flag: 'publicada', flagLabel: 'Publicada', fields: [['titulo', 'Título (ex.: Sessão 03: Kabuki)', 'input'], ['data', 'Quando (texto livre)', 'input'], ['texto', 'O que aconteceu, como o grupo viu (aceita **negrito** e listas)', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { titulo: '', data: '', texto: '', nota: '', publicada: false } },
    noticias: { flag: 'publicada', flagLabel: 'Publicada', fields: newsFields, empty: { titulo: '', data: '', texto: '', nota: '', publicada: false } },
    nightCity: { flag: 'publicada', flagLabel: 'Publicada', fields: newsFields, empty: { titulo: '', data: '', texto: '', nota: '', publicada: false }, shared: true }
  };

  let state = null;
  let campaign = null;
  // O que mudou desde a última publicação: a campanha, o mural de todas, ou os dois.
  const dirty = { campanha: false, nightCity: false };

  const page = {
    eyebrow: 'Campanha / visão dos jogadores', title: 'Visão dos jogadores',
    lede: 'O que os jogadores desta campanha veem na página deles: o resumo, as sessões, as pessoas que conheceram, os lugares no mapa e as notícias. Marque o que foi revelado e clique em Publicar. A página dos jogadores se atualiza sozinha em até 15 segundos.',
    html: `<div class="section" data-toc="Como funciona"><h3>Como funciona</h3>
        <ul><li>Os jogadores entram com o código deles (em Personagens) e veem <b>só as campanhas em que jogam</b>. O que você publica aqui vai só para os jogadores de <b id="pv-campaign-name">esta campanha</b>.</li>
        <li>As <b>Notícias de Night City</b>, no fim desta página, vão para os jogadores de todas as campanhas: é o mesmo universo. Cuidado para não contar nelas o que é segredo de uma campanha.</li>
        <li>As regras (Escudo do mestre, combate, netrunning, armas, cyberware...) aparecem para os jogadores também, sem as notas de campanha.</li>
        <li>Itens desmarcados ficam guardados aqui, mas <b>não são enviados</b> aos jogadores. As notas do mestre nunca são.</li></ul>
        <p id="pv-status" class="note-status">Carregando…</p>
        <p><a class="action pv-link" id="pv-open" href="jogadores.html" target="_blank" rel="noopener">Abrir a visão dos jogadores</a></p></div>
      <div class="section" data-toc="O que o grupo sabe"><h3>O que o grupo sabe</h3><p class="note-status">Resumo na página inicial dos jogadores. Aceita títulos (##), **negrito** e listas.</p><textarea id="pv-resumo" class="note-area" rows="8"></textarea></div>
      <div class="section" data-toc="Sessões"><h3>Sessões</h3><p class="note-status">Uma por sessão, na ordem em que aconteceram. Os jogadores leem na página Sessões; a última também aparece no Resumo deles.</p><div id="pv-sessoes" class="pv-list"></div><button class="action" type="button" data-pv-add="sessoes">Adicionar sessão</button></div>
      <div class="section" data-toc="Pessoas"><h3>Pessoas</h3><div id="pv-npcs" class="pv-list"></div><button class="action" type="button" data-pv-add="npcs">Adicionar pessoa</button></div>
      <div class="section" data-toc="Lugares no mapa"><h3>Lugares no mapa</h3><p class="note-status">X e Y usam as coordenadas do mapa de Night City (5600 × 5320). No Protocolo Morana, dá para copiar a posição de um pino do mapa do mestre, na lista do lugar.</p><div id="pv-lugares" class="pv-list"></div><button class="action" type="button" data-pv-add="lugares">Adicionar lugar</button></div>
      <div class="section" data-toc="Notícias e handouts"><h3>Notícias e handouts</h3><p class="note-status">Boletins, mensagens, bilhetes desta campanha. Os mais recentes aparecem primeiro para os jogadores.</p><div id="pv-noticias" class="pv-list"></div><button class="action" type="button" data-pv-add="noticias">Adicionar notícia</button></div>
      <div class="section pv-shared" data-toc="Notícias de Night City"><h3>Notícias de Night City</h3><p class="note-status">O mural de <b>todas as campanhas</b>: boletins do N54, eleição, apagões, o que a cidade inteira sabe. Uma notícia publicada aqui aparece para todos os jogadores, de qualquer campanha.</p><div id="pv-nightCity" class="pv-list"></div><button class="action" type="button" data-pv-add="nightCity">Adicionar notícia de Night City</button></div>
      <div class="pv-savebar"><span id="pv-dirty" class="note-status">Sem alterações.</span><button class="action" type="button" id="pv-save">Publicar</button></div>`
  };

  function setStatus(text) {
    const status = document.getElementById('pv-status');
    if (status) status.innerHTML = text;
  }

  function markDirty(kind) {
    if (kind) dirty[kinds[kind] && kinds[kind].shared ? 'nightCity' : 'campanha'] = true;
    else { dirty.campanha = false; dirty.nightCity = false; }
    const any = dirty.campanha || dirty.nightCity;
    const label = document.getElementById('pv-dirty');
    if (label) label.textContent = any ? `Há alterações não publicadas${dirty.campanha && dirty.nightCity ? ' (na campanha e em Night City)' : dirty.nightCity ? ' (em Night City, para todas as campanhas)' : ''}.` : 'Sem alterações.';
    document.querySelector('.pv-savebar')?.classList.toggle('pending', any);
  }

  // Os pinos do mapa do mestre só existem no Protocolo Morana (campaign-map.js).
  const markers = () => (campaign && campaign.id === 'morana' && window.campaignMapData && window.campaignMapData.markers) || [];
  function pinOptions() {
    return `<option value="">Copiar posição de um pino…</option>${markers().map(marker => `<option value="${escapeHtml(marker.id)}">${escapeHtml(`${marker.code} · ${marker.title}`)}</option>`).join('')}`;
  }

  function renderList(kind) {
    const container = document.getElementById(`pv-${kind}`);
    if (!container) return;
    const { fields, flag, flagLabel } = kinds[kind];
    container.innerHTML = state[kind].map((item, index) => `<div class="pv-row${item[flag] ? ' on' : ''}" data-kind="${kind}" data-index="${index}">
        <div class="pv-row-head"><label class="pv-toggle"><input type="checkbox" data-field="${flag}" ${item[flag] ? 'checked' : ''}> ${flagLabel}</label>${kind === 'lugares' && markers().length ? `<select data-pv-pin>${pinOptions()}</select>` : ''}<button type="button" class="pv-remove" data-pv-remove>Remover</button></div>
        <div class="pv-fields">${fields.map(([field, label, type]) => type === 'textarea' || type === 'secret'
          ? `<label class="pv-field wide${type === 'secret' ? ' secret' : ''}"><span>${label}</span><textarea data-field="${field}" rows="${type === 'secret' ? 2 : 3}">${escapeHtml(item[field])}</textarea></label>`
          : `<label class="pv-field${type === 'number' ? ' small' : ''}"><span>${label}</span><input data-field="${field}" type="${type === 'number' ? 'number' : 'text'}" value="${escapeHtml(item[field])}"></label>`).join('')}</div>
      </div>`).join('') || '<p class="note-status">Nada aqui ainda.</p>';
  }

  function render() {
    document.getElementById('pv-resumo').value = state.resumo || '';
    Object.keys(kinds).forEach(renderList);
  }

  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(response => response.ok ? response.json() : response.json().catch(() => ({})).then(data => Promise.reject(new Error(data.erro || response.status))));

  async function save() {
    // Garante um id estável para cada item (usado pela busca e pelo mapa dos jogadores).
    Object.keys(kinds).forEach(kind => state[kind].forEach(item => { if (!item.id) item.id = `${slug(item.nome || item.titulo)}-${Math.random().toString(36).slice(2, 6)}`; }));
    const target = campaign;
    setStatus('Publicando…');
    try {
      let atualizado = null;
      if (dirty.campanha || !dirty.nightCity) atualizado = (await post(`api/campanhas/${encodeURIComponent(target.id)}/publicar`, { mestre: { resumo: state.resumo || '', npcs: state.npcs, lugares: state.lugares, noticias: state.noticias, sessoes: state.sessoes } })).atualizado;
      if (dirty.nightCity) atualizado = (await post('api/night-city', { noticias: state.nightCity })).atualizado;
      if (target !== campaign) return; // trocou de campanha no meio
      markDirty();
      setStatus(`<b>Publicado</b> às ${new Date(atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Os jogadores veem a mudança em até 15 segundos.`);
    } catch (error) {
      setStatus(`<b>Não foi possível publicar:</b> ${escapeHtml(error.message)}`);
    }
  }

  function setup() {
    const root = document.getElementById('content');
    campaign = window.wikiApp.activeCampaign();
    state = null;
    markDirty();
    if (location.protocol === 'file:') {
      setStatus('<b>Abra a wiki pelo servidor</b> (node server.js e http://localhost:8000) para usar este painel: ele lê e grava no servidor.');
      return;
    }
    const eyebrow = root.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = `${campaign.name} / visão dos jogadores`;
    const name = document.getElementById('pv-campaign-name');
    if (name) name.textContent = campaign.name;
    document.getElementById('pv-open').href = `jogadores.html?campanha=${encodeURIComponent(campaign.id)}`;
    const target = campaign;
    const read = path => fetch(path, { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error(response.status)));
    Promise.all([read(`api/campanhas/${encodeURIComponent(campaign.id)}/publicar`), read('api/night-city')])
      .then(([data, news]) => {
        if (target !== campaign || !document.getElementById('pv-resumo')) return;
        state = { resumo: data.resumo || '', sessoes: data.sessoes || [], npcs: data.npcs || [], lugares: data.lugares || [], noticias: data.noticias || [], nightCity: news.noticias || [] };
        render();
        markDirty();
        setStatus(data.atualizado ? `Última publicação de ${escapeHtml(campaign.name)}: ${new Date(data.atualizado).toLocaleString('pt-BR')}.` : `${escapeHtml(campaign.name)} ainda não publicou nada.`);
      })
      .catch(() => setStatus('<b>Não consegui ler o Publicar no servidor.</b> Confira se o servidor está rodando e se você entrou como mestre.'));

    root.oninput = event => {
      if (!state) return;
      if (event.target.id === 'pv-resumo') { state.resumo = event.target.value; markDirty('npcs'); return; }
      const row = event.target.closest('.pv-row');
      const field = event.target.dataset.field;
      if (!row || !field) return;
      const item = state[row.dataset.kind][Number(row.dataset.index)];
      item[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      if (event.target.type === 'checkbox') row.classList.toggle('on', event.target.checked);
      markDirty(row.dataset.kind);
    };
    root.onchange = event => {
      if (!state || !event.target.matches('[data-pv-pin]') || !event.target.value) return;
      const marker = markers().find(item => item.id === event.target.value);
      const row = event.target.closest('.pv-row');
      if (!marker || !row) return;
      const item = state.lugares[Number(row.dataset.index)];
      Object.assign(item, { x: marker.x, y: marker.y, distrito: item.distrito || marker.district, nome: item.nome || marker.title });
      renderList('lugares');
      markDirty('lugares');
    };
    root.onclick = event => {
      if (!state) return;
      const add = event.target.closest('[data-pv-add]');
      if (add) { state[add.dataset.pvAdd].push({ ...kinds[add.dataset.pvAdd].empty }); renderList(add.dataset.pvAdd); markDirty(add.dataset.pvAdd); return; }
      const remove = event.target.closest('[data-pv-remove]');
      if (remove) {
        const row = remove.closest('.pv-row');
        if (remove.dataset.confirm !== 'yes') { remove.dataset.confirm = 'yes'; remove.textContent = 'Clique de novo para remover'; return; }
        state[row.dataset.kind].splice(Number(row.dataset.index), 1);
        renderList(row.dataset.kind);
        markDirty(row.dataset.kind);
        return;
      }
      if (event.target.id === 'pv-save') save();
    };
  }

  window.addEventListener('beforeunload', event => { if (dirty.campanha || dirty.nightCity) { event.preventDefault(); event.returnValue = ''; } });
  // Trocar de campanha com alterações não publicadas aqui: pergunta antes (o index.html liga em confirmCampaignChange).
  function confirmLeave(next) {
    const open = window.wikiApp && window.wikiApp.currentPage() === 'playerView';
    if (!open || !(dirty.campanha || dirty.nightCity)) return Promise.resolve(true);
    return window.wikiPopup.confirm({ title: 'Alterações não publicadas', html: `<p>Há alterações não publicadas em <b>${escapeHtml(campaign.name)}</b>. Trocar para ${escapeHtml(next ? next.name : 'a outra campanha')} descarta essas alterações.</p>`, ok: 'Trocar mesmo assim', cancel: 'Ficar e publicar', danger: true });
  }
  // Bloco de mesa → rascunho de sessão (botão nas Notas): uma sessão nova, não publicada, no Publicar da campanha
  // ativa, com o texto do bloco. O mestre revisa (o bloco tem segredos) e marca Publicada quando quiser.
  // data-session-draft="#id": o texto vem de outro campo (as notas da aba de uma sessão); data-session-title: o título.
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-session-draft]');
    if (!button) return;
    const source = button.dataset.sessionDraft ? document.querySelector(button.dataset.sessionDraft) : document.getElementById('session-note');
    const text = ((source || {}).value || '').trim();
    if (!text) { window.wikiPopup.toast('O bloco de mesa está vazio.', { tone: 'bad' }); return; }
    const active = window.wikiApp.activeCampaign();
    const url = `api/campanhas/${encodeURIComponent(active.id)}/publicar`;
    button.disabled = true;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status);
      const { atualizado: _date, ...mestre } = await response.json();
      const sessoes = mestre.sessoes || [];
      const titulo = button.dataset.sessionTitle || `Sessão ${String(sessoes.length + 1).padStart(2, '0')}`;
      sessoes.push({ id: `${slug(titulo)}-${Date.now().toString(36)}`, titulo, data: new Date().toLocaleDateString('pt-BR'), texto: text, nota: 'Rascunho tirado do bloco de mesa: revise (o bloco tem segredos) antes de publicar.', publicada: false });
      await post(url, { mestre: { ...mestre, sessoes } });
      window.wikiPopup.toast(`Rascunho "${titulo}" criado em Visão dos jogadores → Sessões (ainda não publicado).`, { tone: 'ok', ms: 7000 });
    } catch (error) {
      window.wikiPopup.toast(`Não consegui criar o rascunho: ${error.message}`, { tone: 'bad' });
    } finally {
      button.disabled = false;
    }
  });

  // ---------------- Handouts: entregar pela página do documento ----------------
  // Na página "Handouts e textos" (documentos/morana/handouts-da-campanha.md) e nas abas Handouts de cada sessão (as
  // páginas com "entregar" no documento), cada citação de um H-xx ganha dois botões:
  // Entregar aos jogadores (publica na hora em Notícias e handouts do Protocolo Morana) e Só preparar (fica no Publicar,
  // sem publicar, para revisar). O título é a linha "Para os jogadores" do documento; o código H-xx vai na nota do
  // mestre, que nunca sai para os jogadores, e é por ela que a página sabe o que já foi preparado ou entregue.
  // A campanha onde o handout é entregue: a do documento ("entregar: 'morana'").
  const handoutCampaign = id => (((window.wikiConfig || {}).markdownDocs || {})[id] || {}).entregar || '';
  // As citações de cada H-xx no texto do .md, na ordem da página: [{ code, base, parts: [{ label, text }] }].
  // label: a linha em negrito logo antes da citação ("**Parte 1**", "**Versão A · ...**"), quando houver.
  function parseHandouts(source) {
    const list = [];
    let current = null;
    let block = null;
    let label = '';
    for (const line of source.replace(/\r/g, '').split('\n')) {
      const heading = line.match(/^#{2,3}\s+(H-\d+)\s+·\s+(.+)$/);
      if (heading) { current = { code: heading[1], base: heading[2].trim(), parts: [] }; list.push(current); block = null; label = ''; continue; }
      if (/^#{1,3}\s/.test(line)) { current = null; block = null; continue; }
      if (!current) continue;
      if (line.startsWith('>')) {
        if (!block) { block = { label, lines: [] }; current.parts.push(block); label = ''; }
        block.lines.push(line);
        continue;
      }
      block = null;
      const title = line.match(/^- \*\*Para os jogadores:\*\*\s*(.+)$/);
      if (title) { current.base = title[1].trim(); continue; }
      const bold = line.match(/^\*\*(.+)\*\*\s*$/);
      if (bold) label = bold[1].trim();
      else if (line.trim()) label = '';
    }
    return list.map(item => ({ ...item, parts: item.parts.map(part => ({ label: part.label, text: part.lines.join('\n') })) }));
  }
  // "Parte 1" entra no título (são entregas diferentes); "Versão A" não (só uma versão vai para a mesa).
  const handoutTitle = (item, part) => (part.label && /^Parte\b/i.test(part.label) ? `${item.base} · ${part.label}` : item.base);
  const handoutKey = (code, index) => `Handout ${code}#${index + 1}`;
  const publishUrl = campaign => `api/campanhas/${encodeURIComponent(campaign)}/publicar`;
  let handoutCache = { campaign: '', list: [] };

  // As mensagens do NetWire desta campanha (para saber o que já foi mandado por lá).
  const netwireOf = async campaign => { try { return await (await fetch(`api/netwire?campanha=${encodeURIComponent(campaign)}`, { cache: 'no-store' })).json(); } catch { return { canais: [], mensagens: [] }; } };
  async function handoutStatus(campaign, root) {
    let noticias = [];
    try { noticias = (await (await fetch(publishUrl(campaign), { cache: 'no-store' })).json()).noticias || []; } catch { return; }
    const sent = (await netwireOf(campaign)).mensagens || [];
    root.querySelectorAll('[data-handout]').forEach(row => {
      const key = `${handoutKey(row.dataset.handout, Number(row.dataset.part))} `;
      const found = noticias.find(item => String(item.nota || '').startsWith(key));
      const byNetwire = sent.find(item => String(item.nota || '').startsWith(key));
      const status = row.querySelector('[data-handout-status]');
      status.textContent = [found ? (found.publicada ? 'Entregue: os jogadores veem.' : 'Preparado no Publicar, ainda não entregue.') : '', byNetwire ? 'Mandado pelo NetWire.' : ''].filter(Boolean).join(' ');
      status.classList.toggle('cc-ok', Boolean((found && found.publicada) || byNetwire));
    });
  }
  // Mandar pelo NetWire: o handout vira um arquivo anexo, numa mensagem do contato do canal que o mestre escolhe (a
  // conversa da Wakako, por exemplo). Chega na hora e conta como não lida. O código H-xx vai na nota (só o mestre vê).
  async function sendByNetwire(row, item, index, part) {
    const campaign = handoutCache.campaign;
    const titulo = handoutTitle(item, part);
    const key = handoutKey(item.code, index);
    const netwire = await netwireOf(campaign);
    const channels = (netwire.canais || []).filter(channel => !channel.virtual);
    if (!channels.length) { window.wikiPopup.toast('Crie um canal na Caixa do NetWire primeiro (a conversa de um contato, por exemplo).', { tone: 'bad', ms: 6000 }); return; }
    if ((netwire.mensagens || []).some(message => String(message.nota || '').startsWith(`${key} `))) { window.wikiPopup.toast(`${item.code} já foi mandado pelo NetWire.`); return; }
    const label = channel => (channel.tipo === 'direto' ? `Direto: ${(channel.contato && channel.contato.nome) || channel.nome}` : `# ${channel.nome}`);
    const canal = await window.wikiPopup.choose({
      title: `Mandar ${item.code} pelo NetWire`,
      html: `<p>Os jogadores do canal recebem <b>${escapeHtml(titulo)}</b> como um arquivo, numa mensagem do contato dele:</p><div class="md-doc handout-preview">${window.wikiApp.renderMarkdown(part.text)}</div><p class="note-status">Confira os campos entre colchetes antes. Chega na hora.</p>`,
      label: 'Canal', options: channels.map(channel => ({ value: channel.id, label: label(channel) })),
      value: (channels.find(channel => channel.tipo === 'direto') || channels[0]).id, ok: 'Mandar'
    });
    if (!canal) return;
    row.querySelectorAll('button').forEach(element => { element.disabled = true; });
    try {
      await post(`api/netwire/mensagens?campanha=${encodeURIComponent(campaign)}`, { campanha: campaign, canal, estado: 'entregue', texto: '', anexo: { titulo, texto: part.text }, nota: `${key} · do documento Handouts e textos, mandado pelo NetWire.` });
      window.wikiPopup.toast(`${item.code} mandado pelo NetWire: os jogadores do canal recebem agora.`, { tone: 'ok', ms: 6000 });
      await handoutStatus(campaign, row.closest('#md-doc') || document);
    } catch (error) {
      window.wikiPopup.toast(`Não consegui mandar ${item.code}: ${error.message}`, { tone: 'bad' });
    } finally {
      row.querySelectorAll('button').forEach(element => { element.disabled = false; });
    }
  }

  document.addEventListener('wiki:documento', event => {
    const campaign = handoutCampaign(event.detail.id);
    if (!campaign) return;
    const { container, text } = event.detail;
    const list = parseHandouts(text);
    handoutCache = { campaign, list };
    for (const item of list) {
      const heading = [...container.querySelectorAll('h3, h4')].find(element => element.textContent.trim().startsWith(`${item.code} `));
      if (!heading) continue;
      const quotes = [];
      for (let next = heading.nextElementSibling; next && !next.matches('h3, h4'); next = next.nextElementSibling) if (next.matches('blockquote')) quotes.push(next);
      if (quotes.length !== item.parts.length) continue; // o texto mudou de um jeito que a página não entende: sem botões
      quotes.forEach((quote, index) => {
        const part = item.parts[index];
        const which = item.parts.length > 1 ? ` (${escapeHtml(part.label || String(index + 1))})` : '';
        quote.insertAdjacentHTML('afterend', `<p class="handout-send" data-handout="${item.code}" data-part="${index}"><button class="action" type="button" data-handout-deliver>Entregar aos jogadores${which}</button><button class="action handout-prepare" type="button" data-handout-prepare>Só preparar</button><button class="action ghost" type="button" data-handout-netwire>Mandar pelo NetWire</button><span class="note-status" data-handout-status></span></p>`);
      });
    }
    handoutStatus(campaign, container);
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-handout-deliver], [data-handout-prepare], [data-handout-netwire]');
    if (!button) return;
    const row = button.closest('[data-handout]');
    const item = handoutCache.list.find(entry => entry.code === row.dataset.handout);
    const index = Number(row.dataset.part);
    const part = item && item.parts[index];
    if (!part) return;
    if ('handoutNetwire' in button.dataset) { await sendByNetwire(row, item, index, part); return; }
    const deliver = 'handoutDeliver' in button.dataset;
    const titulo = handoutTitle(item, part);
    if (deliver) {
      const sure = await window.wikiPopup.confirm({ title: `Entregar ${item.code}`, html: `<p>Os jogadores do Protocolo Morana passam a ver, em Notícias e handouts, <b>${escapeHtml(titulo)}</b>:</p><div class="md-doc handout-preview">${window.wikiApp.renderMarkdown(part.text)}</div><p class="note-status">Confira os campos entre colchetes antes. Para editar primeiro, use Só preparar.</p>`, ok: 'Entregar' });
      if (!sure) return;
    }
    row.querySelectorAll('button').forEach(element => { element.disabled = true; });
    try {
      const response = await fetch(publishUrl(handoutCache.campaign), { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status);
      const { atualizado: _date, ...mestre } = await response.json();
      const noticias = mestre.noticias || [];
      const key = handoutKey(item.code, index);
      const existing = noticias.find(entry => String(entry.nota || '').startsWith(`${key} `));
      if (existing && (!deliver || existing.publicada)) {
        window.wikiPopup.toast(existing.publicada ? `${item.code} já foi entregue.` : `${item.code} já está preparado no Publicar.`);
      } else {
        if (existing) existing.publicada = true;
        else noticias.push({ id: `${slug(item.code)}-${index + 1}-${Date.now().toString(36)}`, titulo, data: '', texto: part.text, nota: `${key} · do documento Handouts e textos. Tudo o que está aqui fica com o mestre.`, publicada: deliver });
        const saved = await post(publishUrl(handoutCache.campaign), { mestre: { ...mestre, noticias } });
        if (saved.erro) throw new Error(saved.erro);
        window.wikiPopup.toast(deliver ? `${item.code} entregue: os jogadores veem em Notícias e handouts.` : `${item.code} preparado em Visão dos jogadores → Notícias e handouts (ainda não entregue).`, { tone: 'ok', ms: 6000 });
      }
      await handoutStatus(handoutCache.campaign, row.closest('#md-doc') || document);
    } catch (error) {
      window.wikiPopup.toast(`Não consegui entregar ${item.code}: ${error.message}`, { tone: 'bad' });
    } finally {
      row.querySelectorAll('button').forEach(element => { element.disabled = false; });
    }
  });

  window.playerManager = { page, setup, confirmLeave, parseHandouts };
})();
