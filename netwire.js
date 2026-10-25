// NetWire no navegador: as Mensagens do jogador (canais da cidade e conversas com os NPCs) e a Caixa do mestre
// (rascunhos, agendadas, as conversas esperando resposta e os canais). O servidor é o api-netwire.js.
//   jogadores.html → página pvMensagens (#pvMensagens/<canal>), setup: netwire.setupPlayer;
//   index.html     → página caixa (#caixa), setup: netwire.setupGm.
// O que o jogador já leu fica na conta (wikiApp.prefs "netwire:<campanha>": a hora da última mensagem vista em cada
// canal); na primeira vez, nada é novidade. O número de não lidas vai no selo do menu (e na aba Mensagens do topo).
(() => {
  const app = () => window.wikiApp;
  const esc = value => app().escapeHtml(String(value ?? ''));
  const lines = value => esc(value).replace(/\n/g, '<br>');
  const when = iso => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const toast = (text, tone) => window.wikiPopup && window.wikiPopup.toast(text, { tone });
  async function api(url, { method = 'GET', body } = {}) {
    try {
      const response = await fetch(url, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, data: await response.json().catch(() => ({})) };
    } catch { return { status: 0, data: { erro: 'Sem conexão com a wiki.' } }; }
  }
  const role = () => ((window.wikiConfig || {}).netwire || '');
  const campaignId = () => (app() && app().activeCampaign() ? app().activeCampaign().id : '');
  const url = (rest = '') => `api/netwire${rest}?campanha=${encodeURIComponent(campaignId())}`;
  const VIRTUAL = id => id === 'handouts' || id === 'n54-news';
  // A página aberta por link direto (#caixa, #pvMensagens/...) é montada antes de o wikiApp existir: espera por ele.
  const whenReady = task => (window.wikiApp ? task() : document.addEventListener('wiki:pronta', task, { once: true }));

  // ---------------- O que é novo ----------------
  let data = null; // a última resposta de api/netwire
  let polled = '';
  const readKey = () => `netwire:${campaignId()}`;
  const readMarks = () => app().prefs.get(readKey());
  const lastOf = (messages, channel) => messages.filter(item => item.canal === channel && item.quando).map(item => item.quando).sort().pop() || '';
  // Não lidas de um canal: as dos outros, mais novas que a última vista. Os canais prontos (handouts e N54) já têm o
  // selo deles em Notícias.
  function unreadIn(channel) {
    if (!data || VIRTUAL(channel)) return 0;
    const seen = (readMarks() || {})[channel] || '';
    return data.mensagens.filter(item => item.canal === channel && item.quando && item.quando > seen && !(item.autor && item.autor.minha)).length;
  }
  function markRead(channel) {
    if (!data) return;
    const last = lastOf(data.mensagens, channel);
    const marks = readMarks() || {};
    if (!last || marks[channel] >= last) return;
    app().prefs.set(readKey(), { ...marks, [channel]: last });
  }
  // Primeira vez nesta conta: tudo o que já existe conta como lido.
  function firstVisit() {
    if (readMarks() !== undefined || !data) return;
    app().prefs.set(readKey(), Object.fromEntries(data.canais.map(channel => [channel.id, lastOf(data.mensagens, channel.id)]).filter(([, last]) => last)));
  }
  let lastBadge = -1;
  function updateBadge() {
    if (role() === 'jogador') {
      const total = data ? data.canais.reduce((sum, channel) => sum + unreadIn(channel.id), 0) : 0;
      if (total !== lastBadge) { lastBadge = total; app().setBadges({ pvMensagens: total }); }
    } else if (role() === 'mestre') {
      const total = data ? (data.aguardando || []).length : 0;
      if (total !== lastBadge) { lastBadge = total; app().setBadges({ caixa: total }); }
    }
  }

  // ---------------- Leitura ----------------
  async function load() {
    if (!campaignId() || (role() === 'jogador' && !(window.playerIdentity && window.playerIdentity.papel === 'jogador'))) return null;
    const answer = await api(url());
    if (answer.status !== 200) return null;
    data = answer.data;
    firstVisit();
    updateBadge();
    return data;
  }
  // Confere a cada 10 s com a tela aberta e a cada 30 s fora dela (só com a aba à vista).
  function poll() {
    if (document.visibilityState !== 'visible' || !app()) return;
    const open = ['pvMensagens', 'caixa'].includes(app().currentPage());
    const before = data && data.atualizado;
    load().then(fresh => {
      if (!fresh || fresh.atualizado === before) return;
      if (open && app().currentPage() === 'pvMensagens') renderPlayer();
      if (open && app().currentPage() === 'caixa') renderGm();
    });
    polled = new Date().toISOString();
  }
  let ticks = 0;
  setInterval(() => {
    ticks += 1;
    const open = app() && ['pvMensagens', 'caixa'].includes(app().currentPage());
    if (open || ticks % 3 === 0) poll();
  }, 10000);
  document.addEventListener('wiki:pronta', () => { if (role()) load(); });
  document.addEventListener('wiki:campanha', () => { data = null; lastBadge = -1; player.canal = ''; gm.view = 'rascunhos'; if (role()) load(); });
  document.addEventListener('wiki:preferencias', () => { if (data) updateBadge(); });

  // ---------------- Mensagens do jogador ----------------
  const player = { root: null, canal: '' };
  const channelLabel = channel => (channel.tipo === 'direto' ? esc(channel.contato && channel.contato.nome ? channel.contato.nome : channel.nome) : `<span class="nw-hash">#</span>${esc(channel.nome)}`);
  function messageHtml(item) {
    const mine = item.autor && item.autor.minha;
    const kind = mine ? ' nw-mine' : item.autor && item.autor.tipo === 'jogador' ? ' nw-player' : '';
    const body = item.titulo !== undefined
      ? `<b>${esc(item.titulo)}</b><div class="md-doc">${app().renderMarkdown(item.texto || '')}</div>`
      : lines(item.texto);
    return `<div class="nw-msg${kind}"><div class="nw-msg-body">${body}</div><div class="nw-msg-foot"><b>${esc(item.autor ? item.autor.nome : '')}</b>${item.quando ? ` - ${esc(when(item.quando))}` : item.data ? ` - ${esc(item.data)}` : ''}</div></div>`;
  }
  function renderPlayer() {
    const root = player.root;
    if (!root || !root.isConnected) return;
    if (!data) {
      const visitor = !(window.playerIdentity && window.playerIdentity.papel === 'jogador');
      root.innerHTML = `<div class="callout">${visitor ? 'Entre com o código que o mestre te passou para receber as mensagens da campanha.' : 'Não consegui ler as mensagens agora.'}</div>`;
      return;
    }
    const channels = data.canais;
    if (!channels.some(channel => channel.id === player.canal)) {
      // Sem canal escolhido: a primeira conversa com novidade, senão a primeira conversa, senão o primeiro canal.
      player.canal = (channels.find(channel => unreadIn(channel.id)) || channels.find(channel => channel.tipo === 'direto') || channels[0] || {}).id || '';
    }
    const current = channels.find(channel => channel.id === player.canal);
    const link = channel => {
      const count = unreadIn(channel.id);
      return `<button type="button" class="nw-channel${count ? ' nw-unread' : ''}" data-nw-canal="${esc(channel.id)}" aria-current="${channel.id === player.canal}">${channel.tipo === 'direto' ? '<span class="nw-dot nw-online" aria-hidden="true"></span>' : ''}<span>${channelLabel(channel)}</span>${count ? `<span class="nw-badge" aria-label="${count} não lida(s)">${count}</span>` : ''}</button>`;
    };
    const group = (title, list) => (list.length ? `<div class="nw-group"><p class="nw-group-title">${title}</p>${list.map(link).join('')}</div>` : '');
    const messages = current ? data.mensagens.filter(item => item.canal === current.id) : [];
    const draft = root.querySelector('[data-nw-texto]') ? root.querySelector('[data-nw-texto]').value : '';
    root.innerHTML = `<div class="nw-app">
      <nav class="nw-list" aria-label="Canais e conversas">${group('Feeds', channels.filter(channel => channel.tipo !== 'direto'))}${group('Direto', channels.filter(channel => channel.tipo === 'direto'))}</nav>
      <section class="nw-feed" aria-live="polite">${current ? `
        <header class="nw-topbar"><div><span class="nw-overline">NetWire_Seed: ${esc(current.id)}</span><h3 class="nw-title">${channelLabel(current)}</h3>${current.contato && current.contato.descricao ? `<p class="nw-contact">${esc(current.contato.descricao)}</p>` : ''}</div></header>
        <div class="nw-feed-body" data-nw-feed>${messages.length ? messages.map(messageHtml).join('') : '<p class="nw-system">— Nenhuma mensagem ainda —</p>'}</div>
        ${current.aceitaResposta ? `<form class="nw-reply" data-nw-reply><div class="nw-reply-field"><label class="nw-label" for="nw-texto">Mensagem</label><div class="nw-field"><textarea id="nw-texto" data-nw-texto rows="3" maxlength="1000" placeholder="Responder a ${esc(current.contato && current.contato.nome ? current.contato.nome : current.nome)}… (Ctrl+Enter envia)">${esc(draft)}</textarea></div></div><button type="submit" class="nw-btn nw-btn--primary nw-btn--xl">Enviar</button><p class="note-status nw-reply-status" data-nw-status role="status"></p></form>` : '<p class="nw-system">— Canal só de leitura —</p>'}` : '<p class="nw-system">— Nenhum canal ainda. O mestre abre as conversas. —</p>'}
      </section></div>`;
    const feed = root.querySelector('[data-nw-feed]');
    if (feed) feed.scrollTop = feed.scrollHeight;
    if (current) { markRead(current.id); updateBadge(); }
  }
  async function sendPlayer(form) {
    const field = form.querySelector('[data-nw-texto]');
    const status = form.querySelector('[data-nw-status]');
    const texto = field.value.trim();
    if (!texto) return;
    form.querySelector('button[type="submit"]').disabled = true;
    const personagem = window.playerAccount ? window.playerAccount.selected() : null;
    const answer = await api(url('/mensagens'), { method: 'POST', body: { canal: player.canal, texto, ...(personagem ? { personagem } : {}) } });
    if (answer.status !== 200) {
      form.querySelector('button[type="submit"]').disabled = false;
      status.textContent = answer.data.erro || 'Não consegui enviar.';
      return;
    }
    field.value = '';
    await load();
    renderPlayer();
    player.root.querySelector('[data-nw-texto]')?.focus();
  }
  function setupPlayer(content, helpers = {}) {
    player.root = content.querySelector('[data-nw-player]');
    if (helpers.target && helpers.target.section) player.canal = helpers.target.section;
    if (data) renderPlayer();
    else if (player.root) player.root.innerHTML = '<p class="nw-system">— Conectando ao NetWire… —</p>';
    whenReady(() => load().then(() => renderPlayer()));
  }

  // ---------------- Caixa do mestre ----------------
  const gm = { root: null, view: 'rascunhos', editing: null, players: [] };
  const channelById = id => (data ? data.canais.find(channel => channel.id === id) : null);
  const STATE_LABEL = { rascunho: 'Rascunho', agendada: 'Agendada', entregue: 'Entregue' };
  const isoToLocal = iso => { if (!iso) return ''; const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  function cardHtml(item) {
    const channel = channelById(item.canal) || { nome: item.canal };
    const tag = channel.tipo === 'direto' ? `DIRETO → ${esc(channel.contato && channel.contato.nome ? channel.contato.nome : channel.nome)}` : `# ${esc(channel.nome)}`;
    const state = item.estado === 'agendada' ? `${item.entregue ? 'Entregue' : 'Agendada'} · ${esc(when(item.quando))}` : STATE_LABEL[item.estado] || '';
    const mine = item.origem === 'jogador';
    return `<article class="nw-pad nw-card" data-nw-msg="${esc(item.id)}">
      <p class="nw-card-head"><span class="nw-card-tag">${tag}</span><b>${esc(item.autor.nome)}</b><span class="nw-badge">${mine ? 'Jogador' : item.origem === 'ia' ? 'IA' : 'Mestre'}</span><span class="nw-card-state">${state}</span></p>
      <div class="nw-msg${mine ? ' nw-player' : ''}"><div class="nw-msg-body">${lines(item.texto)}</div></div>
      ${item.nota ? `<p class="nw-card-note">nota: ${esc(item.nota)}</p>` : ''}
      ${mine ? '' : `<div class="nw-toolbar">${item.estado !== 'entregue' && !item.entregue ? '<button type="button" class="nw-btn nw-btn--primary" data-nw-deliver>Entregar agora</button>' : ''}<button type="button" class="nw-btn" data-nw-edit>Editar</button><button type="button" class="nw-btn" data-nw-delete>Excluir</button></div>`}
    </article>`;
  }
  function composerHtml(preset = {}) {
    const editing = gm.editing && data.mensagens.find(item => item.id === gm.editing);
    const base = editing || preset;
    const options = data.canais.filter(channel => !VIRTUAL(channel.id)).map(channel => `<option value="${esc(channel.id)}"${channel.id === base.canal ? ' selected' : ''}>${channel.tipo === 'direto' ? `Direto: ${esc(channel.contato.nome || channel.nome)}` : `# ${esc(channel.nome)}`}</option>`).join('');
    if (!options) return '<div class="callout">Crie um canal primeiro (em Canais, à esquerda): uma conversa de um NPC com um jogador, ou um canal da cidade.</div>';
    return `<form class="nw-pad nw-composer" data-nw-compose>
      <p class="nw-pad-title">${editing ? 'Editar mensagem' : preset.title || 'Nova mensagem'}</p>
      <div class="nw-row"><label>Canal<select data-nw-field="canal">${options}</select></label><label>Quem fala<input data-nw-field="autor" maxlength="60" placeholder="o contato do canal" value="${esc(base.autor ? base.autor.nome : '')}"></label></div>
      <label class="nw-wide">Mensagem<textarea data-nw-field="texto" rows="4" maxlength="4000" required>${esc(base.texto || '')}</textarea></label>
      <div class="nw-row"><label>Nota (só você vê)<input data-nw-field="nota" maxlength="500" value="${esc(base.nota || '')}"></label><label>Entregar em (para agendar)<input type="datetime-local" data-nw-field="quando" value="${esc(isoToLocal(base.estado === 'agendada' ? base.quando : ''))}"></label></div>
      <div class="nw-toolbar"><button type="submit" class="nw-btn nw-btn--primary" data-nw-as="entregue">Entregar agora</button><button type="submit" class="nw-btn" data-nw-as="agendada">Agendar</button><button type="submit" class="nw-btn" data-nw-as="rascunho">Salvar rascunho</button>${editing ? '<button type="button" class="nw-btn" data-nw-cancel>Cancelar</button>' : ''}</div>
      <p class="note-status" data-nw-status role="status"></p>
    </form>`;
  }
  // ---------------- A IA na Caixa ----------------
  // O pedido à IA (api/netwire/rascunhar): o que volta vira rascunho, com a nota da IA e o custo; nada é entregue.
  const dollars = value => (value < 0.01 ? 'menos de US$ 0,01' : `US$ ${value.toFixed(2).replace('.', ',')}`);
  function aiUsageHtml() {
    const ia = data.ia || {};
    const today = ia.hoje || { pedidos: 0, custo: 0 };
    return `<p class="note-status nw-ai-usage">Hoje: ${today.pedidos} de ${ia.limite || 30} pedidos · ${dollars(today.custo || 0)}</p>`;
  }
  function aiPanelHtml(channelId) {
    const ia = data.ia || {};
    if (!ia.ligada) return '<p class="note-status nw-ai-off">A IA está desligada. Para ligar, ponha a ANTHROPIC_API_KEY no /etc/fieldbook.env do servidor (veja o README).</p>';
    const channels = data.canais.filter(channel => !VIRTUAL(channel.id));
    if (!channels.length) return '';
    const options = channels.map(channel => `<option value="${esc(channel.id)}"${channel.id === channelId ? ' selected' : ''}>${channel.tipo === 'direto' ? `Direto: ${esc(channel.contato.nome || channel.nome)}` : `# ${esc(channel.nome)}`}</option>`).join('');
    const models = (ia.modelos || []).map(model => `<option value="${esc(model.id)}"${model.id === ia.padrao ? ' selected' : ''}>${esc(model.nome)}</option>`).join('');
    return `<form class="nw-pad nw-composer nw-ai" data-nw-ai>
      <p class="nw-pad-title">Rascunhar com IA</p>
      <div class="nw-row"><label>Canal<select data-nw-ai-field="canal">${options}</select></label><label>O quê<select data-nw-ai-field="tipo"><option value="resposta">Responder à conversa</option><option value="nova">Mensagem nova</option></select></label></div>
      <label class="nw-wide">O que você quer (opcional)<textarea data-nw-ai-field="instrucao" rows="2" maxlength="2000" placeholder="Ex.: Wakako marca o encontro no Lizzie's, mas não diz quem paga."></textarea></label>
      <div class="nw-row"><label>Opções<select data-nw-ai-field="quantidade"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></label><label>Modelo<select data-nw-ai-field="modelo">${models}</select></label></div>
      <fieldset class="nw-wide"><legend>Contexto (o que os jogadores já sabem vai sempre)</legend><label class="nw-check"><input type="checkbox" data-nw-ai-ctx="base" checked> Base da campanha</label><label class="nw-check"><input type="checkbox" data-nw-ai-ctx="estado" checked> Estado da campanha</label><label class="nw-check"><input type="checkbox" data-nw-ai-ctx="diario" checked> Diário</label></fieldset>
      <div class="nw-toolbar"><button type="submit" class="nw-btn nw-btn--primary">Rascunhar</button></div>
      <p class="note-status" data-nw-status role="status"></p>${aiUsageHtml()}
    </form>`;
  }
  async function askAi(body, status, button) {
    if (button) button.disabled = true;
    if (status) status.textContent = 'A IA está escrevendo…';
    const answer = await api(url('/rascunhar'), { method: 'POST', body: { campanha: campaignId(), ...body } });
    if (button) button.disabled = false;
    if (answer.status !== 200) {
      if (status) status.textContent = answer.data.erro || 'A IA não respondeu.';
      else toast(answer.data.erro || 'A IA não respondeu.', 'bad');
      await load();
      return;
    }
    const count = (answer.data.mensagens || []).length;
    toast(`${count} rascunho${count === 1 ? '' : 's'} da IA (${dollars(answer.data.uso.custo)}). Confira e entregue em Rascunhos.`, 'ok');
    gm.view = 'rascunhos';
    await load();
    renderGm();
  }

  function channelFormHtml(channel) {
    const base = channel || { tipo: 'direto', contato: {}, para: [], aceitaResposta: true };
    const players = gm.players.map(account => `<label class="nw-check"><input type="checkbox" data-nw-para value="${esc(account.id)}"${(base.para || []).includes(account.id) ? ' checked' : ''}> ${esc(account.nome)}</label>`).join('') || '<span class="note-status">Nenhum jogador nesta campanha ainda.</span>';
    return `<form class="nw-pad nw-composer" data-nw-channel-form="${esc(channel ? channel.id : '')}">
      <p class="nw-pad-title">${channel ? 'Configurar o canal' : 'Novo canal'}</p>
      <div class="nw-row"><label>Nome<input data-nw-cfield="nome" maxlength="40" required value="${esc(base.nome || '')}" placeholder="wakako, kabuki, _grupo"></label><label>Tipo<select data-nw-cfield="tipo"><option value="direto"${base.tipo === 'direto' ? ' selected' : ''}>Conversa direta (um NPC)</option><option value="feed"${base.tipo === 'feed' ? ' selected' : ''}>Canal da cidade (feed)</option></select></label></div>
      <div class="nw-row"><label>Contato (quem fala)<input data-nw-cfield="contatoNome" maxlength="60" value="${esc(base.contato.nome || '')}" placeholder="Wakako Okada"></label><label>Quem é (os jogadores veem)<input data-nw-cfield="descricao" maxlength="300" value="${esc(base.contato.descricao || '')}" placeholder="Fixer · Japantown"></label></div>
      <fieldset class="nw-wide"><legend>Quem recebe (nenhum marcado: todos da campanha)</legend>${players}</fieldset>
      <label class="nw-check"><input type="checkbox" data-nw-cfield="aceitaResposta"${base.aceitaResposta ? ' checked' : ''}> Os jogadores podem responder</label>
      <div class="nw-toolbar"><button type="submit" class="nw-btn nw-btn--primary">${channel ? 'Salvar o canal' : 'Criar o canal'}</button>${channel ? '<button type="button" class="nw-btn" data-nw-channel-delete>Excluir o canal</button>' : ''}</div>
      <p class="note-status" data-nw-status role="status"></p>
    </form>`;
  }
  function renderGm() {
    const root = gm.root;
    if (!root || !root.isConnected) return;
    if (!data) { root.innerHTML = '<div class="callout">Não consegui ler o NetWire desta campanha.</div>'; return; }
    const own = data.mensagens.filter(item => !VIRTUAL(item.canal));
    const drafts = own.filter(item => item.estado === 'rascunho');
    const scheduled = own.filter(item => item.estado === 'agendada' && !item.entregue);
    const waiting = data.aguardando || [];
    const channels = data.canais.filter(channel => !VIRTUAL(channel.id));
    const views = [['rascunhos', 'Rascunhos', drafts.length], ['agendadas', 'Agendadas', scheduled.length], ['esperando', 'Esperando você', waiting.length]];
    const nav = `<nav class="nw-list" aria-label="Caixa e canais">
      <div class="nw-group"><p class="nw-group-title">Caixa</p>${views.map(([id, label, count]) => `<button type="button" class="nw-channel${count && id === 'esperando' ? ' nw-unread' : ''}" data-nw-view="${id}" aria-current="${gm.view === id}"><span>${label}</span>${count ? `<span class="nw-badge">${count}</span>` : ''}</button>`).join('')}</div>
      <div class="nw-group"><p class="nw-group-title">Canais</p>${channels.map(channel => `<button type="button" class="nw-channel${waiting.includes(channel.id) ? ' nw-unread' : ''}" data-nw-view="canal:${esc(channel.id)}" aria-current="${gm.view === `canal:${channel.id}`}">${channel.tipo === 'direto' ? '<span class="nw-dot nw-online" aria-hidden="true"></span>' : ''}<span>${channelLabel(channel)}</span>${waiting.includes(channel.id) ? '<span class="nw-badge">!</span>' : ''}</button>`).join('')}<button type="button" class="nw-channel" data-nw-view="novo-canal" aria-current="${gm.view === 'novo-canal'}"><span>+ Novo canal</span></button></div>
    </nav>`;
    let main = '';
    if (gm.view === 'rascunhos' || gm.view === 'agendadas') {
      const list = gm.view === 'rascunhos' ? drafts : scheduled;
      main = `${gm.view === 'rascunhos' ? aiPanelHtml() : ''}${composerHtml()}<h3 class="nw-section-title">${gm.view === 'rascunhos' ? 'Rascunhos' : 'Agendadas'}</h3>${list.length ? list.slice().reverse().map(cardHtml).join('') : `<p class="nw-system">— Nenhuma ${gm.view === 'rascunhos' ? 'mensagem em rascunho' : 'mensagem agendada'} —</p>`}`;
    } else if (gm.view === 'esperando') {
      main = waiting.length ? waiting.map(id => {
        const channel = channelById(id);
        const last = own.filter(item => item.canal === id && item.entregue).slice(-3);
        return `<section class="nw-pad nw-waiting"><p class="nw-pad-title">${channelLabel(channel)}</p>${last.map(messageHtml).join('')}<div class="nw-toolbar"><button type="button" class="nw-btn nw-btn--primary" data-nw-view="canal:${esc(id)}">Responder como ${esc(channel.contato.nome || channel.nome)}</button>${data.ia && data.ia.ligada ? `<button type="button" class="nw-btn" data-nw-ai-quick="${esc(id)}">Rascunhar resposta com IA</button>` : ''}</div></section>`;
      }).join('') : '<p class="nw-system">— Nenhuma conversa esperando você —</p>';
    } else if (gm.view === 'novo-canal') {
      main = channelFormHtml(null);
    } else if (gm.view.startsWith('canal:')) {
      const channel = channelById(gm.view.slice(6));
      if (!channel) { gm.view = 'rascunhos'; renderGm(); return; }
      const thread = own.filter(item => item.canal === channel.id);
      main = `<header class="nw-topbar"><div><span class="nw-overline">NetWire_Seed: ${esc(channel.id)}</span><h3 class="nw-title">${channelLabel(channel)}</h3>${channel.contato.descricao ? `<p class="nw-contact">${esc(channel.contato.descricao)}</p>` : ''}</div></header>
        <div class="nw-thread">${thread.length ? thread.map(cardHtml).join('') : '<p class="nw-system">— Nenhuma mensagem ainda —</p>'}</div>
        ${composerHtml({ canal: channel.id, title: `Mensagem em ${channel.tipo === 'direto' ? esc(channel.contato.nome || channel.nome) : `#${esc(channel.nome)}`}` })}${aiPanelHtml(channel.id)}${channelFormHtml(channel)}`;
    }
    root.innerHTML = `<div class="nw-app nw-gm">${nav}<section class="nw-feed nw-gm-main">${main}</section></div>`;
  }
  async function loadPlayers() {
    const answer = await api('api/contas');
    gm.players = answer.status === 200 ? (answer.data.contas || []).filter(account => (account.campanhas || []).includes(campaignId())) : [];
  }
  function setupGm(content) {
    gm.root = content.querySelector('[data-nw-gm]');
    gm.editing = null;
    if (data) renderGm();
    else if (gm.root) gm.root.innerHTML = '<p class="nw-system">— Conectando ao NetWire… —</p>';
    whenReady(() => Promise.all([load(), loadPlayers()]).then(() => renderGm()));
  }
  async function saveMessage(form, estado) {
    const field = name => form.querySelector(`[data-nw-field="${name}"]`);
    const status = form.querySelector('[data-nw-status]');
    const local = field('quando').value;
    if (estado === 'agendada' && !local) { status.textContent = 'Escolha quando entregar.'; return; }
    const body = { campanha: campaignId(), canal: field('canal').value, texto: field('texto').value, nota: field('nota').value, estado, autor: { nome: field('autor').value }, ...(estado === 'agendada' ? { quando: new Date(local).toISOString() } : {}) };
    const answer = gm.editing
      ? await api(url(`/mensagens/${encodeURIComponent(gm.editing)}`), { method: 'PUT', body })
      : await api(url('/mensagens'), { method: 'POST', body });
    if (answer.status !== 200) { status.textContent = answer.data.erro || 'Não consegui salvar.'; return; }
    gm.editing = null;
    toast(estado === 'entregue' ? 'Mensagem entregue aos jogadores.' : estado === 'agendada' ? 'Mensagem agendada.' : 'Rascunho salvo.', 'ok');
    await load();
    renderGm();
  }
  async function saveChannel(form) {
    const field = name => form.querySelector(`[data-nw-cfield="${name}"]`);
    const id = form.dataset.nwChannelForm;
    const body = { campanha: campaignId(), nome: field('nome').value, tipo: field('tipo').value, contato: { nome: field('contatoNome').value, descricao: field('descricao').value }, aceitaResposta: field('aceitaResposta').checked, para: [...form.querySelectorAll('[data-nw-para]:checked')].map(box => box.value) };
    const answer = await api(url(id ? `/canais/${encodeURIComponent(id)}` : '/canais'), { method: id ? 'PUT' : 'POST', body });
    if (answer.status !== 200) { form.querySelector('[data-nw-status]').textContent = answer.data.erro || 'Não consegui salvar.'; return; }
    toast(id ? 'Canal salvo.' : 'Canal criado.', 'ok');
    gm.view = `canal:${answer.data.canal.id}`;
    await load();
    renderGm();
  }

  // ---------------- Cliques e envios (as duas telas) ----------------
  document.addEventListener('click', async event => {
    const channelButton = event.target.closest('[data-nw-canal]');
    if (channelButton && player.root && player.root.contains(channelButton)) {
      player.canal = channelButton.dataset.nwCanal;
      try { history.replaceState(null, '', `#pvMensagens/${encodeURIComponent(player.canal)}`); } catch { /* sem history */ }
      renderPlayer();
      return;
    }
    if (!gm.root || !gm.root.contains(event.target)) return;
    const view = event.target.closest('[data-nw-view]');
    if (view) { gm.view = view.dataset.nwView; gm.editing = null; renderGm(); return; }
    const card = event.target.closest('[data-nw-msg]');
    const id = card && card.dataset.nwMsg;
    if (event.target.closest('[data-nw-deliver]') && id) {
      const answer = await api(url(`/mensagens/${encodeURIComponent(id)}`), { method: 'PUT', body: { campanha: campaignId(), estado: 'entregue' } });
      if (answer.status !== 200) { toast(answer.data.erro || 'Não consegui entregar.', 'bad'); return; }
      toast('Mensagem entregue aos jogadores.', 'ok');
      await load(); renderGm();
      return;
    }
    if (event.target.closest('[data-nw-edit]') && id) { gm.editing = id; renderGm(); gm.root.querySelector('[data-nw-compose]')?.scrollIntoView({ block: 'nearest' }); return; }
    if (event.target.closest('[data-nw-cancel]')) { gm.editing = null; renderGm(); return; }
    const quick = event.target.closest('[data-nw-ai-quick]');
    if (quick) { await askAi({ canal: quick.dataset.nwAiQuick, tipo: 'resposta', quantidade: 2 }, null, quick); return; }
    if (event.target.closest('[data-nw-delete]') && id) {
      if (!(await window.wikiPopup.confirm({ title: 'Excluir a mensagem', html: '<p>A mensagem sai do NetWire (os jogadores deixam de ver, se já tinha sido entregue).</p>', ok: 'Excluir', danger: true }))) return;
      await api(url(`/mensagens/${encodeURIComponent(id)}`), { method: 'DELETE' });
      await load(); renderGm();
      return;
    }
    if (event.target.closest('[data-nw-channel-delete]')) {
      const channelId = event.target.closest('[data-nw-channel-form]').dataset.nwChannelForm;
      if (!(await window.wikiPopup.confirm({ title: 'Excluir o canal', html: '<p>O canal e <b>todas as mensagens dele</b> saem do NetWire.</p>', ok: 'Excluir', danger: true }))) return;
      await api(url(`/canais/${encodeURIComponent(channelId)}`), { method: 'DELETE' });
      gm.view = 'rascunhos';
      await load(); renderGm();
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.matches('[data-nw-reply]')) { event.preventDefault(); sendPlayer(event.target); return; }
    if (event.target.matches('[data-nw-compose]')) { event.preventDefault(); saveMessage(event.target, (event.submitter && event.submitter.dataset.nwAs) || 'rascunho'); return; }
    if (event.target.matches('[data-nw-channel-form]')) { event.preventDefault(); saveChannel(event.target); return; }
    if (event.target.matches('[data-nw-ai]')) {
      event.preventDefault();
      const form = event.target;
      const field = name => form.querySelector(`[data-nw-ai-field="${name}"]`).value;
      const context = Object.fromEntries([...form.querySelectorAll('[data-nw-ai-ctx]')].map(box => [box.dataset.nwAiCtx, box.checked]));
      askAi({ canal: field('canal'), tipo: field('tipo'), instrucao: field('instrucao'), quantidade: Number(field('quantidade')), modelo: field('modelo'), contexto: context }, form.querySelector('[data-nw-status]'), form.querySelector('button[type="submit"]'));
    }
  });
  // Ctrl+Enter envia a resposta.
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && event.target.matches('[data-nw-texto]')) { event.preventDefault(); event.target.form.requestSubmit(); }
  });

  window.netwire = { setupPlayer, setupGm, load, unread: () => (data ? data.canais.reduce((sum, channel) => sum + unreadIn(channel.id), 0) : 0), polledAt: () => polled };
})();
