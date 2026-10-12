// Campanhas, na wiki do mestre. Carregado só pelo index.html; fala com api/campanhas (só o mestre).
//   build(dados, { morana, markdownDocs }) → as campanhas do menu, com as páginas de cada uma. O index.html chama antes
//   de montar a wiki. O Protocolo Morana tem as páginas do index.html; as outras ganham a visão geral, o Publicar,
//   Personagens e códigos, Loja, Notas e os documentos da pasta documentos/<id>/.
//   A página "Campanhas": criar, renomear, cor, mundo do Foundry e apagar (só campanha vazia).
//   A página "Agenda das mesas": as sessões marcadas de todas as campanhas, com aviso de horário cruzado.
//   extraPages(campanha, defs) → as abas montadas de cada sessão (Handouts, NPCs, Notas) e as fichas do elenco.
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
    eyebrow: 'Mesa do mestre / só você vê', title: 'Notas e relógio da cidade',
    lede: 'O relógio de 2077, iniciativa, pistas, promessas e decisões para retomar na próxima sessão. Fica salvo no servidor, com o backup, separado para cada campanha. No fim da sessão, o bloco vira o rascunho do resumo para os jogadores.',
    html: `<div class="section"><h3>Relógio da cidade (2077)</h3><p>Avance uma fase a cada uma ou duas sessões. Cada fase muda a segurança e quem está distraído na cidade. Clique num segmento para marcá-lo; clique no último marcado para desmarcar.</p><div class="clock" id="clock-city"></div></div>
      <div class="section"><h3>Bloco de mesa</h3><textarea id="session-note" class="note-area" placeholder="Cena atual, iniciativa, nomes, pistas, dívidas, consequências..."></textarea><p class="note-status" id="note-status">Salvo automaticamente neste navegador.</p><button class="action" id="clear-notes" type="button">Limpar notas</button> <button class="action" data-session-draft type="button" title="Cria uma sessão não publicada, com este bloco, em Visão dos jogadores → Sessões">Virar rascunho de sessão</button></div>`
  };
  const overviewPage = item => ({
    eyebrow: 'Campanha / visão geral', title: escapeHtml(item.nome),
    lede: 'Os personagens, os jogadores, o que foi publicado e os documentos desta campanha.',
    html: '<div id="cp-overview">Carregando…</div>'
  });
  async function setupOverview(id, content) {
    const root = content.querySelector('#cp-overview');
    const [answer, agenda] = await Promise.all([api(`api/campanhas/${encodeURIComponent(id)}`), api('api/agenda')]);
    if (!root.isConnected) return;
    const item = answer.data.campanha;
    const next = (agenda.data.sessoes || []).find(session => session.campanha === id && Date.parse(session.inicio) + session.duracao * 60000 > Date.now());
    if (!item) { root.innerHTML = `<div class="callout">${escapeHtml(answer.data.erro || 'Não consegui ler a campanha.')}</div>`; return; }
    const docs = item.documentos || [];
    root.innerHTML = `<hr class="rule"><div class="grid">
        <section class="tile"><span class="tag">Personagens</span><h3>${plural(item.personagens, 'personagem', 'personagens')}</h3><p>${plural(item.jogadores, 'jogador', 'jogadores')} com código nesta campanha.</p><button type="button" data-page="personagens">Personagens e códigos</button></section>
        <section class="tile"><span class="tag">Jogadores</span><h3>Visão dos jogadores</h3><p>Resumo, pessoas, lugares e notícias que o grupo já conhece.</p><button type="button" data-page="playerView">Publicar</button></section>
        <section class="tile"><span class="tag">Agenda</span><h3>${next ? escapeHtml(window.wikiApp.sessionTime(next).curto) : 'Nenhuma sessão marcada'}</h3><p>${next ? `${escapeHtml(window.wikiApp.sessionTime(next).relativo)}${next.titulo ? ` · ${escapeHtml(next.titulo)}` : ''}. Os jogadores veem no Resumo.` : 'Marque a próxima: os jogadores veem no Resumo e põem no calendário.'}</p><button type="button" data-page="agenda">Agenda das mesas</button></section>
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

  // ---------------- Página: Agenda das mesas ----------------
  const agendaPage = {
    eyebrow: 'Mestre / agenda', title: 'Agenda das mesas',
    lede: 'As sessões marcadas de todas as campanhas. Uma licença do Foundry abre um mundo por vez: a agenda avisa quando dois horários se cruzam. Os jogadores de cada campanha veem as próximas sessões dela no Resumo e podem pôr no calendário.',
    html: `<div class="section" data-toc="Próximas sessões"><h3>Próximas sessões</h3><div id="ag-list" class="pv-list">Carregando…</div></div>
      <div class="section" data-toc="Marcar sessão"><h3>Marcar sessão</h3><form id="ag-new" class="pv-row on"><div class="pv-fields" id="ag-new-fields"></div><p><button class="action" type="submit">Marcar</button> <span class="note-status" id="ag-new-msg" role="status"></span></p></form>
        <p class="note-status">A data e a hora são as deste aparelho; cada jogador vê no horário do aparelho dele.</p></div>
      <div class="section" data-toc="Já passaram"><h3>Já passaram</h3><div id="ag-past">…</div></div>`
  };
  // "2026-10-10T19:00" no horário deste aparelho (o que o campo datetime-local usa) ↔ ISO.
  const localInput = iso => { if (!iso) return ''; const date = new Date(iso); const pad = n => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; };
  const endOf = item => Date.parse(item.inicio) + item.duracao * 60000;
  function sessionFields(item, campaigns) {
    return `<label class="pv-field"><span>Campanha</span><select name="campanha">${campaigns.map(campaign => `<option value="${escapeHtml(campaign.id)}"${campaign.id === item.campanha ? ' selected' : ''}>${escapeHtml(campaign.nome)}</option>`).join('')}</select></label>
      <label class="pv-field"><span>Quando</span><input name="inicio" type="datetime-local" required value="${escapeHtml(localInput(item.inicio))}"></label>
      <label class="pv-field small"><span>Horas</span><input name="horas" type="number" min="0.5" max="24" step="0.5" value="${(item.duracao || 240) / 60}"></label>
      <label class="pv-field"><span>Título (opcional)</span><input name="titulo" maxlength="80" value="${escapeHtml(item.titulo || '')}" placeholder="Sessão 3: o hospital"></label>
      <label class="pv-field"><span>Nota para os jogadores (opcional)</span><input name="nota" maxlength="300" value="${escapeHtml(item.nota || '')}" placeholder="No Discord; tragam a ficha atualizada"></label>`;
  }
  const sessionBody = form => ({ campanha: form.elements.campanha.value, inicio: form.elements.inicio.value ? new Date(form.elements.inicio.value).toISOString() : '', duracao: Math.round(Number(form.elements.horas.value) * 60), titulo: form.elements.titulo.value.trim(), nota: form.elements.nota.value.trim() });
  // A próxima da mesma campanha, uma semana depois da última marcada (a mesa costuma ter dia fixo).
  function suggestion(campaign, sessions) {
    const last = sessions.filter(item => item.campanha === campaign).pop();
    if (!last) return '';
    let start = Date.parse(last.inicio) + 7 * 86400000;
    while (start < Date.now()) start += 7 * 86400000;
    return new Date(start).toISOString();
  }
  async function setupAgenda(content) {
    const list = content.querySelector('#ag-list');
    const [agenda, answer] = await Promise.all([api('api/agenda'), api('api/campanhas')]);
    if (!list.isConnected) return;
    const campaigns = answer.data.campanhas || [];
    const byId = id => campaigns.find(item => item.id === id) || { nome: id, cor: '#888888' };
    let sessions = agenda.data.sessoes || [];
    if (agenda.status !== 200) { list.innerHTML = `<div class="callout">${escapeHtml(agenda.data.erro || 'Não consegui ler a agenda.')}</div>`; return; }
    const draw = () => {
      const now = Date.now();
      const future = sessions.filter(item => endOf(item) > now);
      const past = sessions.filter(item => endOf(item) <= now).reverse().slice(0, 20);
      list.innerHTML = future.length ? future.map(item => {
        const when = window.wikiApp.sessionTime(item);
        const clash = (item.conflitos || []).map(id => sessions.find(other => other.id === id)).filter(Boolean);
        return `<form class="pv-row on ag-row" data-ag-id="${escapeHtml(item.id)}" style="border-left-color: ${escapeHtml(byId(item.campanha).cor)}">
          <div class="pv-row-head"><b>${escapeHtml(when.data)}, ${escapeHtml(when.horario)}</b><span class="note-status">${escapeHtml(byId(item.campanha).nome)} · ${escapeHtml(when.relativo)}</span><button type="button" class="pv-remove" data-ag-delete>Desmarcar</button></div>
          ${clash.length ? `<div class="callout ag-clash">Cruza com ${clash.map(other => `<b>${escapeHtml(byId(other.campanha).nome)}</b> (${escapeHtml(window.wikiApp.sessionTime(other).curto)})`).join(' e ')}. ${clash.some(other => other.campanha !== item.campanha) ? 'O Foundry abre um mundo por vez: uma das duas precisa mudar de horário.' : 'A mesma campanha marcada duas vezes no mesmo horário.'}</div>` : ''}
          <div class="pv-fields">${sessionFields(item, campaigns)}</div><p><button class="action" type="submit">Salvar</button> <span class="note-status" data-ag-msg role="status"></span></p></form>`;
      }).join('') : '<p>Nenhuma sessão marcada.</p>';
      content.querySelector('#ag-past').innerHTML = past.length ? `<ul class="ag-past">${past.map(item => `<li data-ag-id="${escapeHtml(item.id)}">${escapeHtml(window.wikiApp.sessionTime(item).curto)} · <b>${escapeHtml(byId(item.campanha).nome)}</b>${item.titulo ? ` · ${escapeHtml(item.titulo)}` : ''} <button type="button" class="pv-remove" data-ag-delete>Tirar</button></li>`).join('')}</ul><p class="note-status">Saem sozinhas seis meses depois.</p>` : '<p>Nenhuma ainda.</p>';
    };
    const newForm = content.querySelector('#ag-new');
    const active = (window.wikiApp.activeCampaign() || {}).id;
    const fresh = campaign => ({ campanha: campaign, inicio: suggestion(campaign, sessions), duracao: 240 });
    newForm.querySelector('#ag-new-fields').innerHTML = sessionFields(fresh(campaigns.some(item => item.id === active) ? active : (campaigns[0] || {}).id), campaigns);
    // Trocar a campanha do formulário novo sugere o dia dela (se a data ainda é a sugerida ou está vazia).
    let suggested = newForm.elements.inicio.value;
    newForm.elements.campanha.onchange = () => {
      if (newForm.elements.inicio.value && newForm.elements.inicio.value !== suggested) return;
      suggested = localInput(suggestion(newForm.elements.campanha.value, sessions));
      newForm.elements.inicio.value = suggested;
    };
    const after = (saved, message, okText) => {
      if (![200, 201].includes(saved.status)) { message.textContent = saved.data.erro || 'Não consegui salvar.'; return false; }
      sessions = saved.data.sessoes || sessions;
      draw();
      const mine = saved.data.sessao && sessions.find(item => item.id === saved.data.sessao.id);
      window.wikiPopup.toast(mine && (mine.conflitos || []).length ? `${okText}, mas cruza com outra sessão: veja o aviso.` : okText, { tone: mine && (mine.conflitos || []).length ? 'bad' : undefined });
      return true;
    };
    newForm.onsubmit = async event => {
      event.preventDefault();
      const message = content.querySelector('#ag-new-msg');
      message.textContent = 'Marcando…';
      if (after(await api('api/agenda', { method: 'POST', body: sessionBody(newForm) }), message, 'Sessão marcada')) {
        message.textContent = '';
        newForm.elements.titulo.value = '';
        newForm.elements.nota.value = '';
        suggested = localInput(suggestion(newForm.elements.campanha.value, sessions));
        newForm.elements.inicio.value = suggested;
      }
    };
    list.onsubmit = async event => {
      event.preventDefault();
      const form = event.target.closest('[data-ag-id]');
      const message = form.querySelector('[data-ag-msg]');
      message.textContent = 'Salvando…';
      after(await api(`api/agenda/${encodeURIComponent(form.dataset.agId)}`, { method: 'PUT', body: sessionBody(form) }), message, 'Sessão salva');
    };
    // Desmarcar: nas próximas e nas que já passaram (cada lista com o seu clique; o #content é de todas as páginas).
    const onDelete = async event => {
      if (!event.target.closest('[data-ag-delete]')) return;
      const id = event.target.closest('[data-ag-id]').dataset.agId;
      const item = sessions.find(entry => entry.id === id) || {};
      const sure = await window.wikiPopup.confirm({ title: 'Desmarcar sessão', html: `<p>Desmarcar a sessão de <b>${escapeHtml(byId(item.campanha).nome)}</b> (${escapeHtml(window.wikiApp.sessionTime(item).curto)})? Os jogadores deixam de ver.</p>`, ok: 'Desmarcar', danger: true });
      if (!sure) return;
      const removed = await api(`api/agenda/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (removed.status !== 200) return window.wikiPopup.toast(removed.data.erro || 'Não consegui desmarcar.', { tone: 'bad' });
      sessions = removed.data.sessoes || sessions.filter(entry => entry.id !== id);
      draw();
    };
    list.onclick = onDelete;
    content.querySelector('#ag-past').onclick = onDelete;
    draw();
  }

  // ---------------- Abas montadas: Handouts, NPCs e Notas ----------------
  // Cada sessão (e o elenco) ganha abas que não são um documento só:
  //   handouts: os H-xx da sessão, tirados de Handouts e textos (o mesmo texto, com os botões de entregar);
  //   npcs:     as fichas que o mestre escolhe num seletor com todas as fichas da wiki (a página Fichas de NPC). A
  //             escolha fica na mesa do servidor (paginas.<chave>.npcs); sem escolha, a página mostra a sugestão;
  //   notas:    o que aconteceu na sessão (paginas.<chave>.notas), com o modelo de campos do diário da campanha.
  const tableUrl = campaign => `api/campanhas/${encodeURIComponent(campaign)}/mesa`;
  const readPageData = async (campaign, key) => ((await api(tableUrl(campaign))).data.paginas || {})[key] || {};
  const savePageData = (campaign, key, data) => api(tableUrl(campaign), { method: 'PUT', body: { paginas: { [key]: data } } });

  // Os H-xx pedidos, na ordem pedida, como seções (##) da página (a barra "Nesta página" lista cada um).
  function pickHandouts(source, codes) {
    const sections = {};
    let current = null;
    for (const line of source.replace(/\r/g, '').split('\n')) {
      const heading = line.match(/^###\s+(H-\d+)\s+·/);
      if (heading) { current = heading[1]; sections[current] = [line.replace(/^###/, '##')]; continue; }
      if (/^#{1,3}\s/.test(line)) { current = null; continue; }
      if (current) sections[current].push(line);
    }
    const intro = '# Handouts\n\nOs documentos desta sessão. Todos estão em [Handouts e textos](handouts-da-campanha.md), com os textos para ler em voz alta e a tabela de por onde cada informação chega. Embaixo de cada citação, os botões entregam aos jogadores.';
    return [intro, ...codes.filter(code => sections[code]).map(code => sections[code].join('\n'))].join('\n\n');
  }

  // Todas as fichas da página Fichas de NPC (o livro, as facções e o elenco): nome → { html, grupo }.
  let npcCards = null;
  function allNpcCards() {
    if (npcCards) return npcCards;
    npcCards = new Map();
    const source = window.npcStatBlocks && window.npcStatBlocks.pages.npcs;
    if (!source) return npcCards;
    const holder = document.createElement('div');
    holder.innerHTML = source.html;
    holder.querySelectorAll('.section[data-toc]').forEach(section => section.querySelectorAll('article.entry[data-toc]').forEach(card => {
      if (!npcCards.has(card.dataset.toc)) npcCards.set(card.dataset.toc, { html: card.outerHTML, grupo: section.dataset.toc });
    }));
    return npcCards;
  }
  const npcPage = def => ({
    eyebrow: def.eyebrow || 'Mesa do mestre / fichas', title: def.title, semBusca: true,
    lede: def.lede || 'As fichas que você quer à mão nesta sessão. O seletor tem todas as fichas de Fichas de NPC (o livro, as facções de 2077 e o elenco); a mesma ficha pode entrar mais de uma vez (dois solos, por exemplo). Fica salvo no servidor.',
    html: '<div class="section" data-toc="Fichas"><h3>Fichas</h3><div class="np-bar"><select data-np-select aria-label="Ficha para adicionar"></select><button class="action" type="button" data-np-add>Adicionar</button><button class="action np-secondary" type="button" data-np-reset hidden>Voltar à sugestão</button></div><p class="note-status" data-np-summary>Carregando…</p><div class="entry-grid npc-grid" data-np-cards></div></div>'
  });
  async function setupNpcPage(content, campaign, def) {
    const root = content.querySelector('[data-np-cards]');
    const select = content.querySelector('[data-np-select]');
    const summary = content.querySelector('[data-np-summary]');
    const reset = content.querySelector('[data-np-reset]');
    const cards = allNpcCards();
    const groups = [...new Set([...cards.values()].map(card => card.grupo))];
    select.innerHTML = `<option value="">Escolha uma ficha…</option>${groups.map(group => `<optgroup label="${escapeHtml(group)}">${[...cards].filter(([, card]) => card.grupo === group).map(([name]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</optgroup>`).join('')}`;
    const saved = await readPageData(campaign, def.key);
    if (!root.isConnected) return;
    let chosen = Array.isArray(saved.npcs);
    let names = chosen ? saved.npcs : [...def.npcs];
    const draw = () => {
      root.innerHTML = names.map(name => (cards.get(name) ? cards.get(name).html : `<article class="entry" data-toc="${escapeHtml(name)}"><header><h4>${escapeHtml(name)}</h4></header><p class="note-status">Esta ficha não existe mais em Fichas de NPC.</p></article>`)).join('');
      root.querySelectorAll(':scope > article.entry').forEach((card, index) => card.querySelector('header').insertAdjacentHTML('beforeend', `<button type="button" class="np-remove" data-np-remove="${index}" title="Tirar desta página" aria-label="Tirar ${escapeHtml(names[index])}">×</button>`));
      window.wikiApp.linkGlossary(root);
      summary.textContent = names.length ? `${names.length === 1 ? '1 ficha' : `${names.length} fichas`}${chosen ? '' : ' · a sugestão desta página: mude à vontade'}.` : 'Nenhuma ficha. Escolha no seletor acima.';
      reset.hidden = JSON.stringify(names) === JSON.stringify(def.npcs);
    };
    const save = async () => {
      chosen = true;
      const answer = await savePageData(campaign, def.key, { npcs: names });
      if (answer.status !== 200) window.wikiPopup.toast(answer.data.erro || 'Não consegui salvar as fichas.', { tone: 'bad' });
    };
    content.querySelector('[data-np-add]').onclick = () => {
      if (!select.value) return;
      names = [...names, select.value];
      select.value = '';
      draw();
      save();
    };
    reset.onclick = () => { names = [...def.npcs]; draw(); save(); };
    root.onclick = event => {
      const button = event.target.closest('[data-np-remove]');
      if (!button) return;
      names = names.filter((_, index) => index !== Number(button.dataset.npRemove));
      draw();
      save();
    };
    draw();
  }

  // O modelo das notas: os campos da sessão no diário da campanha (o bloco "### Sessão N: ..." do .md).
  const diaryCache = {};
  async function diaryTemplate(fileName, heading) {
    if (!fileName || !heading) return '';
    if (diaryCache[fileName] === undefined) {
      try { diaryCache[fileName] = await (await fetch(encodeURI(fileName), { cache: 'no-store' })).text(); } catch { diaryCache[fileName] = ''; }
    }
    const lines = diaryCache[fileName].replace(/\r/g, '').split('\n');
    const start = lines.findIndex(line => line.startsWith(`### ${heading}`));
    if (start < 0) return '';
    const fields = [];
    for (const line of lines.slice(start + 1)) {
      if (/^#{1,3}\s/.test(line)) break;
      if (line.startsWith('- ')) fields.push(line.replace(/\*\*/g, ''));
    }
    return fields.join('\n');
  }
  const sessionNotesPage = def => ({
    eyebrow: def.eyebrow || 'Mesa do mestre / só você vê', title: def.title, semBusca: true,
    lede: 'O que aconteceu na sessão, as decisões do grupo e as pontas soltas. Salva sozinho no servidor, com o backup, em qualquer aparelho. No fim, passe o essencial para o diário da campanha e para o resumo dos jogadores.',
    html: `<div class="section" data-toc="Notas"><h3>Notas da sessão</h3><textarea class="note-area" id="sn-${def.key}" data-sn-text rows="16" placeholder="Carregando…"></textarea><p class="note-status" data-sn-status></p><p><button class="action" type="button" data-sn-template hidden>Usar o modelo do diário</button> <button class="action" type="button" data-session-draft="#sn-${def.key}" data-session-title="${escapeHtml(def.sessionTitle || '')}" title="Cria uma sessão não publicada, com estas notas, em Visão dos jogadores → Sessões">Virar rascunho de sessão</button></p></div>`
  });
  async function setupSessionNotes(content, campaign, def) {
    const area = content.querySelector('[data-sn-text]');
    const status = content.querySelector('[data-sn-status]');
    const templateButton = content.querySelector('[data-sn-template]');
    const [saved, template] = await Promise.all([readPageData(campaign, def.key), diaryTemplate(def.diarioFile, def.diario)]);
    if (!area.isConnected) return;
    area.value = saved.notas || '';
    area.placeholder = template || 'O que aconteceu, as decisões do grupo, as pontas soltas…';
    status.textContent = saved.notas ? 'Salvo no servidor.' : '';
    templateButton.hidden = !template;
    let timer = null;
    const persist = () => {
      status.textContent = 'Salvando…';
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const answer = await savePageData(campaign, def.key, { notas: area.value });
        status.textContent = answer.status === 200 ? `Salvo no servidor às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : (answer.data.erro || 'Não consegui salvar.');
      }, 800);
    };
    area.oninput = persist;
    templateButton.onclick = () => { area.value = area.value.trim() ? `${area.value.trimEnd()}\n\n${template}` : template; area.focus(); persist(); };
  }

  // defs: [{ kind: 'handouts' | 'npcs' | 'notas', id, title, ... }] → { pages, pageSetup, markdownDocs } para juntar à wiki.
  function extraPages(campaign, defs) {
    const pages = {};
    const pageSetup = {};
    const docs = {};
    for (const def of defs) {
      if (def.kind === 'handouts') docs[def.id] = { file: def.file, eyebrow: def.eyebrow || 'Para entregar / handouts da sessão', title: def.title, lede: def.lede || 'Os documentos que o grupo pode encontrar nesta sessão, prontos para entregar.', transform: text => pickHandouts(text, def.handouts), semBusca: true, vista: true, entregar: campaign };
      if (def.kind === 'npcs') { pages[def.id] = npcPage(def); pageSetup[def.id] = content => setupNpcPage(content, campaign, def); }
      if (def.kind === 'notas') { pages[def.id] = sessionNotesPage(def); pageSetup[def.id] = content => setupSessionNotes(content, campaign, def); }
    }
    return { pages, pageSetup, markdownDocs: docs };
  }

  // ---------------- Menu ----------------
  function build(data, { morana, markdownDocs }) {
    const list = data && Array.isArray(data.campanhas) ? data.campanhas : null;
    const pages = { campanhas: managerPage, notas: notesPage, agenda: agendaPage };
    const pageSetup = { campanhas: setupManager, notas: () => window.wikiApp.setupNotes(), agenda: setupAgenda };
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
        // Arquivos novos na pasta do Morana (que ainda não estão nas abas) entram num grupo próprio.
        const groups = own.length ? [...morana.groups, { group: 'Outros documentos', pages: own }] : morana.groups;
        return { ...morana, name: item.nome, color: item.cor, groups: [...groups, ...sharedGroup] };
      }
      const home = homeOf(item.id);
      pages[home] = overviewPage(item);
      pageSetup[home] = content => setupOverview(item.id, content);
      // O mesmo desenho do Protocolo Morana: a campanha em cima, a mesa (o que se usa durante e entre as sessões) e os
      // personagens dos jogadores.
      return { id: item.id, name: item.nome, color: item.cor, groups: [
        { group: 'Campanha', pages: [{ id: home, label: 'Visão geral', icon: '00' }] },
        { group: 'Mesa', pages: [{ id: 'notas', label: 'Notas e relógio da cidade', icon: 'N' }, { id: 'playerView', label: 'Visão dos jogadores', icon: 'PV' }, { id: 'agenda', label: 'Agenda das mesas', icon: 'AG' }, { id: 'campanhas', label: 'Campanhas', icon: 'CP' }] },
        { group: 'Personagens dos jogadores', pages: [{ id: 'personagens', label: 'Personagens e códigos', icon: 'PC' }, { id: 'loja', label: 'Loja', icon: 'EB' }] },
        ...(own.length ? [{ group: 'Documentos', pages: own }] : []),
        ...sharedGroup
      ] };
    });
    return { campaigns, pages, pageSetup, markdownDocs: docs };
  }

  window.campaignManager = { build, homeOf, extraPages };
})();
