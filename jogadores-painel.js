// Painel do mestre para a visão dos jogadores: escolhe o que foi revelado e publica.
// Carregado só pelo index.html. Lê e grava pelo servidor (node server.js):
//   jogadores-mestre.json → tudo, inclusive o que ainda está escondido (só o mestre acessa);
//   jogadores.json        → só o que foi revelado (é o que a página dos jogadores lê).
(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const slug = text => String(text || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

  // Como cada lista aparece no painel e o que vai para os jogadores.
  const kinds = {
    npcs: { flag: 'revelado', flagLabel: 'Revelado', fields: [['nome', 'Nome', 'input'], ['papel', 'Como o grupo conhece', 'input'], ['texto', 'O que o grupo sabe (aceita **negrito** e listas)', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { nome: '', papel: '', texto: '', nota: '', revelado: false } },
    lugares: { flag: 'revelado', flagLabel: 'No mapa', fields: [['nome', 'Nome', 'input'], ['distrito', 'Bairro / distrito', 'input'], ['x', 'X', 'number'], ['y', 'Y', 'number'], ['texto', 'O que o grupo sabe', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { nome: '', distrito: '', x: 2800, y: 2660, texto: '', nota: '', revelado: false } },
    noticias: { flag: 'publicada', flagLabel: 'Publicada', fields: [['titulo', 'Título', 'input'], ['data', 'Quando (texto livre)', 'input'], ['texto', 'Texto', 'textarea'], ['nota', 'Nota do mestre (nunca vai para os jogadores)', 'secret']], empty: { titulo: '', data: '', texto: '', nota: '', publicada: false } }
  };

  let state = null;
  let dirty = false;

  const page = {
    eyebrow: 'Protocolo Morana / visão dos jogadores', title: 'Visão dos jogadores',
    lede: 'O que os jogadores podem ver na página deles: o resumo, as pessoas que conheceram, os lugares no mapa e as notícias. Marque o que foi revelado e clique em Publicar. A página dos jogadores se atualiza sozinha em até 15 segundos.',
    html: `<div class="section" data-toc="Como funciona"><h3>Como funciona</h3>
        <ul><li>Os jogadores abrem <b>http://IP-deste-computador:8000</b> no celular ou tablet. O servidor só entrega a visão dos jogadores para quem vem de outro aparelho: esta wiki do mestre, os documentos e os segredos ficam bloqueados.</li>
        <li>As regras (Escudo do mestre, combate, netrunning, armas, cyberware...) aparecem para os jogadores também, sem as notas de campanha.</li>
        <li>Itens desmarcados ficam guardados aqui, mas <b>não são enviados</b> aos jogadores.</li></ul>
        <p id="pv-status" class="note-status">Carregando…</p>
        <p><a class="action pv-link" href="jogadores.html" target="_blank" rel="noopener">Abrir a visão dos jogadores</a></p></div>
      <div class="section" data-toc="O que o grupo sabe"><h3>O que o grupo sabe</h3><p class="note-status">Resumo na página inicial dos jogadores. Aceita títulos (##), **negrito** e listas.</p><textarea id="pv-resumo" class="note-area" rows="8"></textarea></div>
      <div class="section" data-toc="Pessoas"><h3>Pessoas</h3><div id="pv-npcs" class="pv-list"></div><button class="action" type="button" data-pv-add="npcs">Adicionar pessoa</button></div>
      <div class="section" data-toc="Lugares no mapa"><h3>Lugares no mapa</h3><p class="note-status">X e Y usam as mesmas coordenadas do mapa do mestre (5600 × 5320). Para copiar a posição de um pino do mapa do mestre, escolha-o na lista do lugar.</p><div id="pv-lugares" class="pv-list"></div><button class="action" type="button" data-pv-add="lugares">Adicionar lugar</button></div>
      <div class="section" data-toc="Notícias e handouts"><h3>Notícias e handouts</h3><p class="note-status">Boletins do N54, mensagens, bilhetes. Os mais recentes aparecem primeiro para os jogadores.</p><div id="pv-noticias" class="pv-list"></div><button class="action" type="button" data-pv-add="noticias">Adicionar notícia</button></div>
      <div class="pv-savebar"><span id="pv-dirty" class="note-status">Sem alterações.</span><button class="action" type="button" id="pv-save">Publicar</button></div>`
  };

  function setStatus(text) {
    const status = document.getElementById('pv-status');
    if (status) status.innerHTML = text;
  }

  function markDirty(value = true) {
    dirty = value;
    const label = document.getElementById('pv-dirty');
    if (label) label.textContent = value ? 'Há alterações não publicadas.' : 'Sem alterações.';
    document.querySelector('.pv-savebar')?.classList.toggle('pending', value);
  }

  function pinOptions() {
    const markers = (window.campaignMapData && window.campaignMapData.markers) || [];
    return `<option value="">Copiar posição de um pino…</option>${markers.map(marker => `<option value="${escapeHtml(marker.id)}">${escapeHtml(`${marker.code} · ${marker.title}`)}</option>`).join('')}`;
  }

  function renderList(kind) {
    const container = document.getElementById(`pv-${kind}`);
    if (!container) return;
    const { fields, flag, flagLabel } = kinds[kind];
    container.innerHTML = state[kind].map((item, index) => `<div class="pv-row${item[flag] ? ' on' : ''}" data-kind="${kind}" data-index="${index}">
        <div class="pv-row-head"><label class="pv-toggle"><input type="checkbox" data-field="${flag}" ${item[flag] ? 'checked' : ''}> ${flagLabel}</label>${kind === 'lugares' ? `<select data-pv-pin>${pinOptions()}</select>` : ''}<button type="button" class="pv-remove" data-pv-remove>Remover</button></div>
        <div class="pv-fields">${fields.map(([field, label, type]) => type === 'textarea' || type === 'secret'
          ? `<label class="pv-field wide${type === 'secret' ? ' secret' : ''}"><span>${label}</span><textarea data-field="${field}" rows="${type === 'secret' ? 2 : 3}">${escapeHtml(item[field])}</textarea></label>`
          : `<label class="pv-field${type === 'number' ? ' small' : ''}"><span>${label}</span><input data-field="${field}" type="${type === 'number' ? 'number' : 'text'}" value="${escapeHtml(item[field])}"></label>`).join('')}</div>
      </div>`).join('') || '<p class="note-status">Nada aqui ainda.</p>';
  }

  function render() {
    document.getElementById('pv-resumo').value = state.resumo || '';
    Object.keys(kinds).forEach(renderList);
  }

  // O que os jogadores recebem: só itens revelados, sem a marcação interna e sem a nota do mestre.
  function published() {
    const pick = (kind, flag) => state[kind].filter(item => item[flag]).map(({ [flag]: _flag, nota: _nota, ...rest }) => rest);
    return { atualizado: new Date().toISOString(), resumo: state.resumo || '', npcs: pick('npcs', 'revelado'), lugares: pick('lugares', 'revelado'), noticias: pick('noticias', 'publicada').reverse() };
  }

  function save() {
    // Garante um id estável para cada item (usado pela busca e pelo mapa dos jogadores).
    Object.keys(kinds).forEach(kind => state[kind].forEach(item => { if (!item.id) item.id = `${slug(item.nome || item.titulo)}-${Math.random().toString(36).slice(2, 6)}`; }));
    const body = JSON.stringify({ mestre: state, publicado: published() });
    setStatus('Publicando…');
    fetch('api/jogadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then(response => response.ok ? response.json() : response.text().then(text => Promise.reject(new Error(text || response.status))))
      .then(result => {
        markDirty(false);
        setStatus(`<b>Publicado</b> às ${new Date(result.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Os jogadores veem a mudança em até 15 segundos.`);
      })
      .catch(error => setStatus(`<b>Não foi possível publicar:</b> ${escapeHtml(error.message)}`));
  }

  function setup() {
    const root = document.getElementById('content');
    if (location.protocol === 'file:') {
      setStatus('<b>Abra a wiki pelo servidor</b> (node server.js e http://localhost:8000) para usar este painel: ele lê e grava arquivos no computador.');
      return;
    }
    fetch('jogadores-mestre.json', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(response.status)))
      .then(data => {
        state = { resumo: data.resumo || '', npcs: data.npcs || [], lugares: data.lugares || [], noticias: data.noticias || [] };
        render();
        markDirty(false);
        setStatus(data.atualizado ? `Última publicação: ${new Date(data.atualizado).toLocaleString('pt-BR')}.` : 'Ainda não publicado.');
      })
      .catch(() => setStatus('<b>Não encontrei jogadores-mestre.json.</b> Confira se o servidor está rodando nesta pasta.'));

    root.oninput = event => {
      if (!state) return;
      if (event.target.id === 'pv-resumo') { state.resumo = event.target.value; markDirty(); return; }
      const row = event.target.closest('.pv-row');
      const field = event.target.dataset.field;
      if (!row || !field) return;
      const item = state[row.dataset.kind][Number(row.dataset.index)];
      item[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      if (event.target.type === 'checkbox') row.classList.toggle('on', event.target.checked);
      markDirty();
    };
    root.onchange = event => {
      if (!state || !event.target.matches('[data-pv-pin]') || !event.target.value) return;
      const marker = (window.campaignMapData.markers || []).find(item => item.id === event.target.value);
      const row = event.target.closest('.pv-row');
      if (!marker || !row) return;
      const item = state.lugares[Number(row.dataset.index)];
      Object.assign(item, { x: marker.x, y: marker.y, distrito: item.distrito || marker.district, nome: item.nome || marker.title });
      renderList('lugares');
      markDirty();
    };
    root.onclick = event => {
      if (!state) return;
      const add = event.target.closest('[data-pv-add]');
      if (add) { state[add.dataset.pvAdd].push({ ...kinds[add.dataset.pvAdd].empty }); renderList(add.dataset.pvAdd); markDirty(); return; }
      const remove = event.target.closest('[data-pv-remove]');
      if (remove) {
        const row = remove.closest('.pv-row');
        if (remove.dataset.confirm !== 'yes') { remove.dataset.confirm = 'yes'; remove.textContent = 'Clique de novo para remover'; return; }
        state[row.dataset.kind].splice(Number(row.dataset.index), 1);
        renderList(row.dataset.kind);
        markDirty();
        return;
      }
      if (event.target.id === 'pv-save') save();
    };
  }

  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.playerManager = { page, setup };
})();
