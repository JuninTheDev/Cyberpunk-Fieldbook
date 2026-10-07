// Campanhas, na wiki do mestre. Carregado só pelo index.html; fala com api/campanhas (só o mestre).
//   build(dados, { morana, markdownDocs }) → as campanhas do menu, com as páginas de cada uma. O index.html chama antes
//   de montar a wiki. O Protocolo Morana tem as páginas do index.html; as outras ganham a visão geral, o Publicar,
//   Personagens e códigos, Loja, Notas e os documentos da pasta documentos/<id>/.
//   A página "Campanhas": criar, renomear, cor, mundo do Foundry e apagar (só campanha vazia).
(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const slug = text => String(text || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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

  // A página inicial de cada campanha (o que o botão "Abrir" e a criação abrem).
  const homeOf = id => (id === 'morana' ? 'home' : `inicio-${id}`);
  // Documentos de uma pasta viram páginas .md do menu.
  // O menu mostra o rótulo como HTML: o título vem do .md, então vai escapado.
  const docEntries = (folder, docs, eyebrow) => docs.map(doc => ({ id: `doc-${folder}-${slug(doc.arquivo.split('/').pop().replace(/\.md$/i, ''))}`, label: escapeHtml(doc.titulo), icon: 'MD', doc: { file: doc.arquivo, eyebrow, title: escapeHtml(doc.titulo), lede: '' } }));

  // ---------------- Páginas comuns das campanhas novas ----------------
  const notesPage = {
    eyebrow: 'Campanha / privado neste navegador', title: 'Notas e relógio da cidade',
    lede: 'O relógio de 2077, iniciativa, pistas, promessas e decisões para retomar na próxima sessão. Fica salvo neste navegador, separado para cada campanha.',
    html: `<div class="section"><h3>Relógio da cidade (2077)</h3><p>Avance uma fase a cada uma ou duas sessões. Cada fase muda a segurança e quem está distraído na cidade. Clique num segmento para marcá-lo; clique no último marcado para desmarcar.</p><div class="clock" id="clock-city"></div></div>
      <div class="section"><h3>Bloco de mesa</h3><textarea id="session-note" class="note-area" placeholder="Cena atual, iniciativa, nomes, pistas, dívidas, consequências..."></textarea><p class="note-status" id="note-status">Salvo automaticamente neste navegador.</p><button class="action" id="clear-notes" type="button">Limpar notas</button></div>`
  };
  const overviewPage = item => ({
    eyebrow: 'Campanha / visão geral', title: escapeHtml(item.nome),
    lede: 'Os personagens, os jogadores, o que foi publicado e os documentos desta campanha.',
    html: '<div id="cp-overview">Carregando…</div>'
  });
  async function setupOverview(id, content) {
    const root = content.querySelector('#cp-overview');
    const answer = await api(`api/campanhas/${encodeURIComponent(id)}`);
    if (!root.isConnected) return;
    const item = answer.data.campanha;
    if (!item) { root.innerHTML = `<div class="callout">${escapeHtml(answer.data.erro || 'Não consegui ler a campanha.')}</div>`; return; }
    const docs = item.documentos || [];
    root.innerHTML = `<hr class="rule"><div class="grid">
        <section class="tile"><span class="tag">Personagens</span><h3>${plural(item.personagens, 'personagem', 'personagens')}</h3><p>${plural(item.jogadores, 'jogador', 'jogadores')} com código nesta campanha.</p><button type="button" data-page="personagens">Personagens e códigos</button></section>
        <section class="tile"><span class="tag">Jogadores</span><h3>Visão dos jogadores</h3><p>Resumo, pessoas, lugares e notícias que o grupo já conhece.</p><button type="button" data-page="playerView">Publicar</button></section>
        <section class="tile"><span class="tag">Foundry</span><h3>${item.mundo ? escapeHtml(item.mundo) : 'Sem mundo ligado'}</h3><p>${item.mundo ? 'O mundo desta campanha. A barra da wiki mostra quando ele está aberto.' : 'Diga qual é o mundo do Foundry desta campanha na página Campanhas.'}</p><button type="button" data-page="campanhas">Campanhas</button></section>
      </div>
      <div class="section" data-toc="Documentos"><h3>Documentos</h3>${docs.length
        ? `<ul>${docs.map(doc => `<li><button class="action" type="button" data-page="${escapeHtml(docEntries(id, [doc])[0].id)}">${escapeHtml(doc.titulo)}</button></li>`).join('')}</ul>`
        : `<p>Nenhum documento ainda.</p>`}<p class="note-status">Os documentos são os arquivos .md da pasta <code>documentos/${escapeHtml(id)}/</code> do projeto, com o título na primeira linha (<code># Título</code>). Publique (publicar.bat) para irem para o servidor; a wiki lê os arquivos como estão.</p></div>`;
  }

  // ---------------- Página: Campanhas ----------------
  const managerPage = {
    eyebrow: 'Mestre / campanhas', title: 'Campanhas',
    lede: 'As mesas que acontecem ao mesmo tempo em Night City. Mesmo sistema, mesmas regras e o mesmo universo; personagens, jogadores e segredos separados.',
    html: `<div class="section" data-toc="Como funciona"><h3>Como funciona</h3><ul>
        <li>Cada campanha tem os seus <b>personagens</b>, os seus <b>jogadores</b>, o seu <b>Publicar</b> e as suas <b>regras da loja</b>. As regras do jogo, o catálogo e as <b>Notícias de Night City</b> (no Publicar) são de todas.</li>
        <li>Os jogadores só veem as campanhas em que jogam: de outra, nem o nome. O mesmo código pode jogar em mais de uma (Personagens e códigos → Adicionar jogador de outra campanha).</li>
        <li><b>Nome para os jogadores:</b> o que eles veem no menu e no topo. O nome da campanha pode entregar um segredo (o Protocolo Morana aparece para eles como "Night City, 2077"); vazio, eles veem o nome.</li>
        <li>Para levar um personagem para outra campanha (crossover), use <b>Mover</b> na lista de personagens. Só o mestre move.</li>
        <li><b>Documentos:</b> os arquivos .md de <code>documentos/&lt;id&gt;/</code> no projeto. Os de <code>documentos/night-city/</code> aparecem em todas as campanhas.</li>
        <li><b>Mundo do Foundry:</b> o id da pasta do mundo (o nome em <code>Data/worlds/</code>). Com ele, a barra da wiki diz de qual campanha é a mesa aberta (e só para quem joga nela), e o módulo cpr-2077 desse mundo já sabe qual é a campanha dele. Uma licença abre um mundo por vez: as sessões de campanhas diferentes precisam ser em horários diferentes.</li>
      </ul></div>
      <div class="section" data-toc="Campanhas"><h3>Campanhas</h3><div id="cp-list" class="pv-list">Carregando…</div></div>
      <div class="section" data-toc="Nova campanha"><h3>Nova campanha</h3>
        <form id="cp-new" class="pv-row on"><div class="pv-fields">
          <label class="pv-field"><span>Nome</span><input name="nome" required maxlength="60" placeholder="Nome da campanha"></label>
          <label class="pv-field"><span>Nome para os jogadores</span><input name="nomeJogadores" maxlength="60" placeholder="igual ao nome"></label>
          <label class="pv-field small"><span>Cor</span><input name="cor" type="color" value="#ff3864"></label>
          <label class="pv-field"><span>Mundo do Foundry (opcional)</span><input name="mundo" maxlength="80" placeholder="id do mundo, ex.: sombras-de-pacifica"></label>
        </div><p><button class="action" type="submit">Criar campanha</button> <span class="note-status" id="cp-new-msg" role="status"></span></p>
        <p class="note-status">Começa vazia, com as regras da loja do Protocolo Morana (mude na engrenagem da Loja dela).</p></form></div>`
  };

  // openWorld: o mundo aberto agora no Foundry, quando ainda não é de nenhuma campanha (para ligar com um clique).
  function row(item, total, openWorld = '') {
    const empty = !item.personagens && !item.jogadores;
    return `<form class="pv-row on cp-row" data-cp-id="${escapeHtml(item.id)}" style="border-left-color: ${escapeHtml(item.cor)}">
      <div class="pv-row-head"><b class="cp-name">${escapeHtml(item.nome)}</b><span class="note-status">${escapeHtml(item.id)} · ${plural(item.personagens, 'personagem', 'personagens')} · ${plural(item.jogadores, 'jogador', 'jogadores')} · ${plural((item.documentos || []).length, 'documento', 'documentos')}</span>
        <button type="button" class="action" data-cp-open>Abrir</button>${total > 1 ? `<button type="button" class="pv-remove" data-cp-delete${empty ? '' : ' disabled title="Mova os personagens e tire os jogadores antes de apagar"'}>Apagar</button>` : ''}</div>
      <div class="pv-fields">
        <label class="pv-field"><span>Nome</span><input name="nome" maxlength="60" value="${escapeHtml(item.nome)}"></label>
        <label class="pv-field"><span>Nome para os jogadores</span><input name="nomeJogadores" maxlength="60" value="${escapeHtml(item.nomeJogadores || '')}" placeholder="igual ao nome"></label>
        <label class="pv-field small"><span>Cor</span><input name="cor" type="color" value="${escapeHtml(item.cor)}"></label>
        <label class="pv-field"><span>Mundo do Foundry</span><input name="mundo" maxlength="80" value="${escapeHtml(item.mundo || '')}" placeholder="id do mundo"></label>
      </div><p><button class="action" type="submit">Salvar</button>${openWorld && !item.mundo ? ` <button class="action" type="button" data-cp-world="${escapeHtml(openWorld)}">Usar o mundo aberto agora (${escapeHtml(openWorld)})</button>` : ''} <span class="note-status" data-cp-msg role="status"></span></p></form>`;
  }

  async function setupManager(content) {
    const list = content.querySelector('#cp-list');
    const [answer, state] = await Promise.all([api('api/campanhas'), api('api/estado')]);
    if (!list.isConnected) return;
    const items = answer.data.campanhas || [];
    // O Foundry com um mundo aberto que nenhuma campanha tem ainda: oferece ligar.
    const mesa = state.data.mesa || {};
    const openWorld = mesa.aberta && mesa.mundo && !items.some(item => item.mundo === mesa.mundo) ? mesa.mundo : '';
    list.innerHTML = items.length ? items.map(item => row(item, items.length, openWorld)).join('') : `<div class="callout">${escapeHtml(answer.data.erro || 'Não consegui ler as campanhas.')}</div>`;
    // Nome, cor e mundo mudam o menu: depois de salvar, a wiki recarrega.
    // replaceState não dispara o hashchange (que levaria à página inicial antes de recarregar).
    const reloadAt = page => { history.replaceState(null, '', `#${page}`); location.reload(); };
    list.onsubmit = async event => {
      event.preventDefault();
      const form = event.target.closest('[data-cp-id]');
      const msg = form.querySelector('[data-cp-msg]');
      msg.textContent = 'Salvando…';
      const body = Object.fromEntries(['nome', 'nomeJogadores', 'cor', 'mundo'].map(name => [name, form.elements[name].value.trim()]));
      const saved = await api(`api/campanhas/${encodeURIComponent(form.dataset.cpId)}`, { method: 'PUT', body });
      if (saved.status !== 200) { msg.textContent = saved.data.erro || 'Não consegui salvar.'; return; }
      reloadAt('campanhas');
    };
    list.onclick = async event => {
      const form = event.target.closest('[data-cp-id]');
      if (!form) return;
      if (event.target.closest('[data-cp-open]')) return window.wikiApp.openPage(homeOf(form.dataset.cpId));
      const world = event.target.closest('[data-cp-world]');
      if (world) { form.elements.mundo.value = world.dataset.cpWorld; form.requestSubmit(); return; }
      if (!event.target.closest('[data-cp-delete]')) return;
      const item = items.find(entry => entry.id === form.dataset.cpId) || {};
      const sure = await window.wikiPopup.confirm({ title: 'Apagar campanha', html: `<p>Apagar <b>${escapeHtml(item.nome)}</b>? O Publicar e as regras da loja dela vão para <code>campanhas/apagadas/</code> na pasta de dados.</p><p class="note-status">Os documentos (pasta documentos/${escapeHtml(item.id)}/) ficam no projeto.</p>`, ok: 'Apagar', danger: true });
      if (!sure) return;
      const removed = await api(`api/campanhas/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (removed.status !== 200) return window.wikiPopup.toast(removed.data.erro || 'Não consegui apagar.', { tone: 'bad' });
      reloadAt('campanhas');
    };
    const form = content.querySelector('#cp-new');
    form.onsubmit = async event => {
      event.preventDefault();
      const msg = content.querySelector('#cp-new-msg');
      msg.textContent = 'Criando…';
      const created = await api('api/campanhas', { method: 'POST', body: Object.fromEntries(['nome', 'nomeJogadores', 'cor', 'mundo'].map(name => [name, form.elements[name].value.trim()])) });
      if (created.status !== 201) { msg.textContent = created.data.erro || 'Não consegui criar.'; return; }
      reloadAt(homeOf(created.data.campanha.id));
    };
  }

  // ---------------- Menu ----------------
  function build(data, { morana, markdownDocs }) {
    const list = data && Array.isArray(data.campanhas) ? data.campanhas : null;
    const pages = { campanhas: managerPage, notas: notesPage };
    const pageSetup = { campanhas: setupManager, notas: () => window.wikiApp.setupNotes() };
    const docs = {};
    const known = new Set(Object.values(markdownDocs).map(doc => doc.file));
    const toPages = entries => entries.map(entry => { docs[entry.id] = entry.doc; return { id: entry.id, label: entry.label, icon: entry.icon }; });
    // documentos/night-city/: em todas as campanhas.
    const shared = toPages(docEntries('night-city', (data && data.compartilhados) || [], 'Night City / documento de todas as campanhas'));
    const sharedGroup = shared.length ? [{ group: 'Night City (todas as campanhas)', pages: shared }] : [];
    if (!list) return { campaigns: [morana], pages, pageSetup, markdownDocs: docs };
    const campaigns = list.map(item => {
      const own = toPages(docEntries(item.id, (item.documentos || []).filter(doc => !known.has(doc.arquivo)), `${escapeHtml(item.nome)} / documento`));
      if (item.id === morana.id) {
        // Arquivos novos na pasta do Morana entram no grupo dos documentos completos.
        const groups = morana.groups.map(group => (group.group === 'Documentos completos' ? { ...group, pages: [...group.pages, ...own] } : group));
        return { ...morana, name: item.nome, color: item.cor, groups: [...groups, ...sharedGroup] };
      }
      const home = homeOf(item.id);
      pages[home] = overviewPage(item);
      pageSetup[home] = content => setupOverview(item.id, content);
      return { id: item.id, name: item.nome, color: item.cor, groups: [
        { group: 'Campanha', pages: [{ id: home, label: 'Visão geral', icon: '00' }, { id: 'playerView', label: 'Visão dos jogadores', icon: 'PV' }, { id: 'campanhas', label: 'Campanhas', icon: 'CP' }] },
        { group: 'Personagens dos jogadores', pages: [{ id: 'personagens', label: 'Personagens e códigos', icon: 'PC' }, { id: 'loja', label: 'Loja', icon: 'EB' }] },
        { group: 'Mesa', pages: [{ id: 'notas', label: 'Notas e relógio da cidade', icon: 'N', className: 'session-item' }] },
        ...(own.length ? [{ group: 'Documentos', pages: own }] : []),
        ...sharedGroup
      ] };
    });
    return { campaigns, pages, pageSetup, markdownDocs: docs };
  }

  window.campaignManager = { build, homeOf };
})();
