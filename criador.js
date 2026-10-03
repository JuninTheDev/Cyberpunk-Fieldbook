// Criador de personagem, fichas e loja inicial (páginas Personagens, Ficha, Criador e Loja).
// Os personagens ficam no servidor (api-personagens.js). As regras vêm de system-criacao.js e
// os itens de loja-catalogo.js. A cada salvamento o criador grava também `resultado`: a ficha
// pronta (perícias com o nome do Foundry, itens com o compêndio, Lifepath em texto), que é o que
// o importador do Foundry lê.
(() => {
  const C = window.systemCreation;
  const shop = window.shopCatalog || { itens: [], categorias: [] };
  const rules = window.systemRules || {};
  if (!C) return;

  const catalog = new Map(shop.itens.map(item => [item.id, item]));
  const statKeys = C.stats;
  const roleById = id => C.roles.find(role => role.id === id);
  const methodById = id => C.methods.find(method => method.id === id);
  const SPECIAL = Object.keys(C.specializedSkills);
  const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const eb = value => `${Math.round(value).toLocaleString('pt-BR')}eb`;

  // Perícias: nome no Foundry → { pt, stat, x2, basica }. As "de escolha" levam o tipo entre parênteses.
  const skillInfo = new Map((rules.data && rules.data.skills || []).filter(([, en]) => !SPECIAL.includes(en) && en !== 'Local Expert')
    .map(([pt, en, stat, grupo, x2, basica]) => [en, { pt, stat, grupo, x2, basica }]));
  skillInfo.set('Language (Streetslang)', { pt: 'Linguagem (Streetslang)', stat: 'INT', grupo: 'Educação', x2: false, basica: true });
  skillInfo.set('Local Expert (Your Home)', { pt: 'Especialista Local (sua casa)', stat: 'INT', grupo: 'Educação', x2: false, basica: true });
  for (const [en, info] of Object.entries(C.specializedSkills)) skillInfo.set(en, { pt: `${info.nome} (escolha um tipo)`, stat: info.stat, grupo: '', x2: Boolean(info.x2), basica: false, especial: true });
  const isX2 = name => Boolean((skillInfo.get(name) || {}).x2);
  const skillPt = name => (skillInfo.get(name) || {}).pt || name;
  const typeLabel = (base, type) => {
    const info = C.specializedSkills[base];
    if (!info || !type) return '';
    return base === 'Language' ? (C.languages[type] || type) : (info.tipos[type] || type);
  };
  const specialName = (base, type) => `${C.specializedSkills[base].nome}: ${typeLabel(base, type) || '—'}`;

  // ---------------- Personagem em branco ----------------
  const blank = () => ({
    nome: '', apelido: '', role: '', especializacao: '', metodo: '', passo: 1,
    stats: {}, sorteio: {}, pericias: {}, tipos: {}, extras: [], lingua: '', casa: '',
    lifepath: { amigos: [], inimigos: [], amores: [] }, escolhas: {}, itens: [], moradia: '', aparencia: '', notas: ''
  });

  // ---------------- Regras ----------------
  const tableOf = doc => C.statTables[(roleById(doc.role) || {}).tabelas];

  // STATs finais conforme o método.
  function computeStats(doc) {
    const table = tableOf(doc);
    if (doc.metodo === 'ratoderua' && table && doc.sorteio.linha) return Object.fromEntries(statKeys.map((stat, index) => [stat, table[doc.sorteio.linha - 1][index]]));
    if (doc.metodo === 'edgerunner' && table) return Object.fromEntries(statKeys.map((stat, index) => [stat, doc.sorteio[stat] ? table[doc.sorteio[stat] - 1][index] : 0]));
    if (doc.metodo === 'pacote') return Object.fromEntries(statKeys.map(stat => [stat, Number(doc.stats[stat]) || 6]));
    return Object.fromEntries(statKeys.map(stat => [stat, 0]));
  }
  const statPoints = stats => statKeys.reduce((sum, stat) => sum + (Number(stats[stat]) || 0), 0);

  // Perícias da tela conforme o método: [nome no Foundry, nível, editável].
  function skillRows(doc) {
    const tables = (roleById(doc.role) || {}).tabelas;
    if (doc.metodo === 'ratoderua') return (C.streetratSkills[tables] || []).map(([name, level]) => [name, level, false]);
    if (doc.metodo === 'edgerunner') return (C.edgerunnerSkills[tables] || []).map(name => [name, Number(doc.pericias[name]) || 2, true]);
    if (doc.metodo === 'pacote') {
      return [...skillInfo.keys()].filter(name => !skillInfo.get(name).especial)
        .map(name => [name, Number(doc.pericias[name]) || (skillInfo.get(name).basica ? 2 : 0), true]);
    }
    return [];
  }
  const skillCost = (name, level) => level * (isX2(name) ? 2 : 1);
  function skillPointsUsed(doc) {
    if (doc.metodo === 'ratoderua') return null;
    const base = skillRows(doc).reduce((sum, [name, level]) => sum + skillCost(name, level), 0);
    const extras = doc.metodo === 'pacote' ? doc.extras.reduce((sum, extra) => sum + extra.nivel * (C.specializedSkills[extra.base] && C.specializedSkills[extra.base].x2 ? 2 : 1), 0) : 0;
    return base + extras;
  }
  const skillBudget = doc => doc.metodo === 'pacote' ? C.completePackage.pontosPericia : C.edgerunnerRules.pontosPericia;

  // Lista final de perícias com o nome do Foundry: as de escolha viram "Science (Chemistry)".
  function finalSkills(doc) {
    const list = [];
    for (const [name, level] of skillRows(doc)) {
      if (C.specializedSkills[name]) list.push({ nome: `${name} (${doc.tipos[name] || '?'})`, base: name, tipo: doc.tipos[name] || '', nivel: level, stat: C.specializedSkills[name].stat });
      else list.push({ nome: name, nivel: level, stat: (skillInfo.get(name) || {}).stat || '' });
    }
    if (doc.metodo === 'pacote') for (const extra of doc.extras) list.push({ nome: `${extra.base} (${extra.tipo || '?'})`, base: extra.base, tipo: extra.tipo, nivel: Number(extra.nivel) || 0, stat: C.specializedSkills[extra.base].stat });
    if (doc.lingua) list.push({ nome: `Language (${doc.lingua})`, base: 'Language', tipo: doc.lingua, nivel: 4, stat: 'INT', gratis: true });
    return list;
  }

  // ---------------- Itens ----------------
  // Pacote da Role (Rato de Rua e Edgerunner) com as escolhas feitas, mais o cyberware grátis de 2077 e o que foi comprado.
  function packageEntries(doc) {
    if (!['ratoderua', 'edgerunner'].includes(doc.metodo)) return [];
    const pack = C.packages[(roleById(doc.role) || {}).tabelas];
    if (!pack) return [];
    const list = [];
    for (const category of ['armas', 'equipamento', 'moda', 'cyberware']) {
      (pack[category] || []).forEach((entry, index) => {
        const key = `${category}:${index}`;
        const option = entry.ou ? Number(doc.escolhas[key]) || 0 : -1;
        const items = entry.ou ? entry.ou[option] || entry.ou[0] : [entry];
        items.forEach(([id, qty], k) => list.push({ uid: `pacote:${key}:${option}:${k}`, id, qtd: qty, origem: 'pacote' }));
      });
    }
    return list;
  }
  function inventory(doc) {
    const free = C.free2077.map(item => ({ uid: `gratis:${item.id}`, id: item.id, qtd: item.qtd, origem: 'gratis2077', nome: item.nome || '' }));
    const freeIds = new Set(free.map(item => item.id));
    // O que o pacote dá e já vem grátis em 2077 não entra duas vezes (nem cobra Humanidade de novo).
    const pack = packageEntries(doc).filter(item => !(freeIds.has(item.id) && (catalog.get(item.id) || {}).cat === 'cyberware'));
    const bought = (doc.itens || []).filter(item => catalog.has(item.id)).map(item => ({ ...item, origem: 'loja' }));
    return [...free, ...pack, ...bought].map(item => ({ ...item, item: catalog.get(item.id) })).filter(entry => entry.item);
  }
  const isFashion = item => item.cat === 'moda' || (item.cyber && item.cyber.tipo === 'fashionware');
  const lineCost = entry => entry.item.preco * (entry.item.lote > 1 ? entry.qtd / entry.item.lote : entry.qtd);

  // Dinheiro: Pacote Completo tem 2.550eb e mais 800eb só de moda (a sobra da moda some); os outros, 500eb.
  function money(doc) {
    const bought = inventory(doc).filter(entry => entry.origem === 'loja');
    const fashion = bought.filter(entry => isFashion(entry.item)).reduce((sum, entry) => sum + lineCost(entry), 0);
    const other = bought.filter(entry => !isFashion(entry.item)).reduce((sum, entry) => sum + lineCost(entry), 0);
    const budget = doc.metodo === 'pacote' ? C.completePackage.dinheiro : C.edgerunnerRules.dinheiro;
    const fashionBudget = doc.metodo === 'pacote' ? C.completePackage.moda : 0;
    const fromFashion = Math.min(fashionBudget, fashion);
    const spent = other + fashion - fromFashion;
    return { inicial: budget, moda: fashionBudget, gastoModa: fashion, usadoModa: fromFashion, gasto: spent, saldo: budget - spent };
  }

  // Humanidade: EMP × 10, menos a perda fixa de cada cyberware (o grátis de 2077 não perde). EMP = Humanidade ÷ 10, para baixo.
  function humanity(doc, stats) {
    const lost = inventory(doc).filter(entry => entry.item.cyber && entry.origem !== 'gratis2077').reduce((sum, entry) => sum + entry.item.cyber.hl * entry.qtd, 0);
    const max = (Number(stats.EMP) || 0) * 10;
    const current = Math.max(0, max - lost);
    return { max, perda: lost, atual: current, emp: Math.floor(current / 10) };
  }

  // Cyberware de opção precisa da base do mesmo tipo (cyberbraço, cyberolho, Neural Link...).
  const NEEDS_BASE = ['neuralWare', 'cyberEye', 'cyberAudioSuite', 'cyberArm', 'cyberLeg', 'borgware'];
  function missingFoundations(doc) {
    const entries = inventory(doc).filter(entry => entry.item.cyber);
    const bases = new Set(entries.filter(entry => entry.item.cyber.base).map(entry => entry.item.cyber.tipo));
    return entries.filter(entry => !entry.item.cyber.base && NEEDS_BASE.includes(entry.item.cyber.tipo) && !bases.has(entry.item.cyber.tipo));
  }

  // ---------------- Lifepath ----------------
  const lifepathFields = [
    ['origem', 'Origem cultural', 'culturalOrigin'], ['personalidade', 'Personalidade', 'personality'], ['roupa', 'Estilo de roupa', 'clothingStyle'],
    ['cabelo', 'Penteado', 'hairStyle'], ['adorno', 'Adorno', 'affectations'], ['valor', 'O que mais valoriza', 'valueMost'],
    ['pessoas', 'O que sente pelas pessoas', 'aboutPeople'], ['pessoa', 'Pessoa mais valiosa', 'valuedPerson'], ['posse', 'Posse mais valiosa', 'valuedPossession'],
    ['familia', 'Família original', 'familyBackground'], ['infancia', 'Ambiente de infância', 'childhoodEnvironment'], ['crise', 'Crise familiar', 'familyCrisis'],
    ['meta', 'Meta de vida', 'lifeGoals']
  ];
  const lpTable = key => (window.rollTables || {})[`lp-${key}`] || { linhas: [] };
  const lpText = (key, value) => {
    const row = lpTable(key).linhas.find(([from, to]) => value >= from && value <= to);
    return row ? strip(row[2]) : '';
  };
  const enemyText = enemy => [lpText('inimigo-quem', enemy.quem), lpText('inimigo-causa', enemy.causa), lpText('inimigo-recursos', enemy.recursos) && `Pode usar: ${lpText('inimigo-recursos', enemy.recursos)}`, lpText('vinganca', enemy.vinganca) && `Se se encontrarem: ${lpText('vinganca', enemy.vinganca)}`].filter(Boolean).join(' ');
  function lifepathTexts(doc) {
    const lp = doc.lifepath || {};
    const texts = {};
    for (const [key, , field] of lifepathFields) texts[field] = lp[key] ? lpText(key, lp[key]) : '';
    if (lp.origem && doc.lingua) texts.culturalOrigin += ` Língua: ${C.languages[doc.lingua] || doc.lingua}.`;
    texts.friends = (lp.amigos || []).map(value => lpText('amigo', value)).join(' | ');
    texts.enemies = (lp.inimigos || []).map(enemyText).join(' | ');
    texts.tragicLoveAffairs = (lp.amores || []).map(value => lpText('amor', value)).join(' | ');
    texts.roleLifepath = lp.roleLifepath || '';
    return texts;
  }

  // ---------------- Moradia ----------------
  function housing(doc) {
    if (doc.role === 'corpo') return { ...C.housing.corpo, tipo: 'corpo' };
    if (doc.role === 'nomad' && doc.moradia === 'familia') return { moradia: 'Com a família do clã', aluguel: 0, estilo: 'Com o clã', custoEstilo: 0, tipo: 'familia' };
    return { ...C.housing.padrao, tipo: 'padrao' };
  }

  // ---------------- Pendências (avisos, não bloqueiam) ----------------
  function pending(doc) {
    const list = [];
    const stats = computeStats(doc);
    const add = (step, text) => list.push({ step, text });
    if (!doc.nome) add(1, 'Dê um nome ao personagem.');
    if (!doc.role) add(1, 'Escolha a Role.');
    if (!doc.metodo) add(1, 'Escolha o método de criação.');
    const role = roleById(doc.role);
    if (role && role.especializacoes && !doc.especializacao) add(1, `Escolha a especialização de ${role.nome}.`);
    if (doc.metodo === 'ratoderua' && !doc.sorteio.linha) add(2, 'Role ou escolha a linha da tabela de STATs.');
    if (doc.metodo === 'edgerunner' && statKeys.some(stat => !doc.sorteio[stat])) add(2, 'Role 1d10 para cada STAT.');
    if (doc.metodo === 'pacote') {
      const points = statPoints(stats);
      if (points !== C.completePackage.pontosStat) add(2, `Use exatamente ${C.completePackage.pontosStat} pontos de STAT (agora: ${points}).`);
      if (statKeys.some(stat => stats[stat] < C.completePackage.statMin || stats[stat] > C.completePackage.statMax)) add(2, `Cada STAT vai de ${C.completePackage.statMin} a ${C.completePackage.statMax}.`);
    }
    if (doc.metodo && doc.metodo !== 'ratoderua') {
      const used = skillPointsUsed(doc);
      const budget = skillBudget(doc);
      if (used !== budget) add(3, `Distribua exatamente ${budget} pontos de perícia (agora: ${used}).`);
      for (const [name, level] of skillRows(doc)) {
        if (level > 6) add(3, `${skillPt(name)} passa de 6.`);
        if ((doc.metodo === 'edgerunner' || (skillInfo.get(name) || {}).basica) && level < 2) add(3, `${skillPt(name)} precisa de pelo menos 2.`);
      }
      for (const extra of doc.extras || []) if (!extra.tipo) add(3, `Escolha o tipo de ${C.specializedSkills[extra.base].nome}.`);
    }
    for (const [name] of skillRows(doc)) if (C.specializedSkills[name] && !doc.tipos[name]) add(3, `Escolha o tipo de ${C.specializedSkills[name].nome}.`);
    if (doc.metodo && !doc.lingua) add(3, 'Escolha a língua da sua origem (4 níveis grátis).');
    if (doc.metodo && !doc.casa) add(3, 'Diga qual é o seu bairro (Especialista Local).');
    const lp = doc.lifepath || {};
    const missingLp = lifepathFields.filter(([key]) => !lp[key]).map(([, label]) => label);
    if (missingLp.length) add(4, `Lifepath sem: ${missingLp.join(', ')}.`);
    const cash = money(doc);
    if (doc.metodo && cash.saldo < 0) add(5, `Gastou ${eb(-cash.saldo)} a mais do que tinha.`);
    for (const entry of missingFoundations(doc)) add(5, `${entry.item.nome} precisa de ${{ neuralWare: 'Neural Link', cyberEye: 'um cyberolho', cyberAudioSuite: 'Cyberaudio Suite', cyberArm: 'um cyberbraço', cyberLeg: 'uma cyberperna', borgware: 'uma base de borgware' }[entry.item.cyber.tipo]}.`);
    const hum = humanity(doc, stats);
    if (doc.metodo && hum.emp <= 0) add(5, 'A Humanidade chegou a zero: ciberpsicose.');
    return list;
  }

  // ---------------- Resultado (o que o Foundry importa) ----------------
  function result(doc) {
    const stats = computeStats(doc);
    const derived = C.derived(stats);
    const hum = humanity(doc, stats);
    const role = roleById(doc.role) || {};
    const spec = (role.especializacoes || []).find(item => item.id === doc.especializacao);
    const cash = money(doc);
    return {
      versaoRegras: 1,
      stats, derivados: derived, humanidade: hum,
      role: role.id ? { id: role.id, nome: role.nome, rank: 4, foundry: role.foundry, especializacao: spec ? { nome: spec.nome, pericias: spec.pericias } : null } : null,
      pericias: finalSkills(doc), casa: doc.casa,
      // renomear: só quando o item tem outro nome em 2077 (o plug de interface vira Personal Link).
      itens: inventory(doc).map(entry => ({ uid: entry.uid, id: entry.id, nome: entry.item.nome, renomear: entry.nome || '', qtd: entry.qtd, origem: entry.origem, foundry: entry.item.foundry, cyber: Boolean(entry.item.cyber), semHumanidade: entry.origem === 'gratis2077' })),
      dinheiro: { saldo: Math.max(0, cash.saldo), inicial: cash.inicial },
      moradia: housing(doc),
      lifepath: lifepathTexts(doc),
      pendencias: pending(doc).map(item => item.text)
    };
  }

  // ---------------- Servidor ----------------
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
  const identity = () => api('api/eu');

  // ---------------- Visual comum ----------------
  let esc = text => String(text);
  const box = (title, body, extra = '') => `<div class="section cc-box"${extra}><h3>${title}</h3>${body}</div>`;
  const roleName = id => (roleById(id) || {}).nome || 'sem Role';
  const offline = '<div class="callout">Os personagens ficam no servidor da wiki. Abra a wiki pelo endereço do servidor (não pelo arquivo).</div>';

  // Cada abertura de página ganha uma ficha; resposta que chega atrasada de uma página antiga é ignorada.
  let renderToken = 0;

  // ================= Página: Personagens =================
  async function setupList(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const [me, list] = await Promise.all([identity(), api('api/personagens')]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const papel = me.data.papel;
    const characters = list.data.personagens || [];
    const mine = characters.filter(item => !item.publico);
    const others = characters.filter(item => item.publico);
    const card = item => `<div class="cc-card"><div><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.metodo ? ` · ${esc((methodById(item.metodo) || {}).nome || '')}` : ''}${papel === 'mestre' && item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}${item.foundry ? ' · <b class="cc-ok">no Foundry</b>' : ''}</small></div>
      <div class="cc-card-actions"><button class="action" type="button" data-cc-open="ficha" data-id="${item.id}">Ficha</button><button class="action" type="button" data-cc-open="criador" data-id="${item.id}">Editar</button><button class="action" type="button" data-cc-open="loja" data-id="${item.id}">Loja</button><button class="action cc-danger" type="button" data-cc-delete="${item.id}">Apagar</button></div></div>`;
    const publicCard = item => `<div class="cc-card"><div><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}</small></div></div>`;

    let who = '';
    if (papel === 'mestre') who = '<p>Você é o <b>mestre</b>: vê e edita todos os personagens.</p>';
    else if (papel === 'jogador') who = `<p>Você entrou como <b>${esc(me.data.jogador.nome)}</b>. <button class="action" type="button" data-cc-logout>Sair</button></p>`;
    else who = `<p>Para criar ou editar o seu personagem, entre com o código que o mestre te passou. Este aparelho lembra dele.</p><form class="cc-login" data-cc-login><input id="cc-code" autocomplete="off" placeholder="NC-XXXX-XXXX" aria-label="Código do jogador"><button class="action" type="submit">Entrar</button></form><p class="cc-msg" id="cc-login-msg"></p>`;

    const canCreate = papel !== 'visitante';
    root.innerHTML = `${box('Quem é você', who)}
      ${canCreate ? box(papel === 'mestre' ? 'Todos os personagens' : 'Meus personagens', `${mine.length ? mine.map(card).join('') : '<p class="note-status">Nenhum personagem ainda.</p>'}<p><button class="action" type="button" data-cc-new>Novo personagem</button></p>`) : ''}
      ${others.length ? box('O grupo', others.map(publicCard).join('')) : ''}
      ${papel === 'mestre' ? box('Códigos dos jogadores', '<div id="cc-accounts">Carregando…</div>') : ''}`;
    if (papel === 'mestre') renderAccounts(root.querySelector('#cc-accounts'));

    root.onclick = async event => {
      const open = event.target.closest('[data-cc-open]');
      if (open) return helpers.openPage(open.dataset.ccOpen, { section: open.dataset.id });
      if (event.target.closest('[data-cc-logout]')) { await api('api/sair', { method: 'POST', body: {} }); return helpers.openPage('personagens', undefined, 'replace'); }
      if (event.target.closest('[data-cc-new]')) {
        const created = await api('api/personagens', { method: 'POST', body: blank() });
        if (created.status === 201) return helpers.openPage('criador', { section: created.data.personagem.id });
        return alert(created.data.erro || 'Não consegui criar o personagem.');
      }
      const remove = event.target.closest('[data-cc-delete]');
      if (remove && confirm('Apagar este personagem? O mestre ainda consegue recuperar o arquivo.')) {
        await api(`api/personagens/${remove.dataset.ccDelete}`, { method: 'DELETE' });
        return helpers.openPage('personagens', undefined, 'replace');
      }
    };
    root.onsubmit = async event => {
      if (!event.target.closest('[data-cc-login]')) return;
      event.preventDefault();
      const code = root.querySelector('#cc-code').value.trim();
      const answer = await api('api/entrar', { method: 'POST', body: { codigo: code } });
      if (answer.status === 200) return helpers.openPage('personagens', undefined, 'replace');
      root.querySelector('#cc-login-msg').textContent = answer.data.erro || 'Não deu certo.';
    };
  }

  // Quadro do mestre: criar, copiar e revogar códigos.
  async function renderAccounts(target) {
    const answer = await api('api/contas');
    const accounts = answer.data.contas || [];
    target.innerHTML = `${accounts.length ? `<div class="table-wrap dense"><table><thead><tr><th>Jogador</th><th>Código</th><th></th></tr></thead><tbody>${accounts.map(account => `<tr><td>${esc(account.nome)}</td><td><code>${esc(account.codigo)}</code></td><td><button class="action" type="button" data-cc-copy="${esc(account.codigo)}">Copiar</button> <button class="action cc-danger" type="button" data-cc-revoke="${account.id}">Revogar</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="note-status">Nenhum código ainda.</p>'}
      <form class="cc-login" data-cc-account><input id="cc-account-name" placeholder="Nome do jogador" aria-label="Nome do jogador"><button class="action" type="submit">Criar código</button></form>
      <p class="note-status">Passe o código ao jogador. Ele entra em Campanha → Personagens. Pelo túnel, o link muda a cada sessão; aí ele digita o código de novo.</p>`;
    target.onclick = async event => {
      const copy = event.target.closest('[data-cc-copy]');
      if (copy) { try { await navigator.clipboard.writeText(copy.dataset.ccCopy); copy.textContent = 'Copiado'; } catch { prompt('Copie o código:', copy.dataset.ccCopy); } return; }
      const revoke = event.target.closest('[data-cc-revoke]');
      if (revoke && confirm('Revogar este código? O jogador perde o acesso; os personagens dele continuam.')) { await api(`api/contas/${revoke.dataset.ccRevoke}`, { method: 'DELETE' }); renderAccounts(target); }
    };
    target.onsubmit = async event => {
      event.preventDefault();
      const name = target.querySelector('#cc-account-name').value.trim();
      if (!name) return;
      await api('api/contas', { method: 'POST', body: { nome: name } });
      renderAccounts(target);
    };
  }

  // ================= Página: Ficha =================
  function sheetHtml(doc, { forPrint = false } = {}) {
    const stats = computeStats(doc);
    const derived = C.derived(stats);
    const hum = humanity(doc, stats);
    const role = roleById(doc.role) || {};
    const spec = (role.especializacoes || []).find(item => item.id === doc.especializacao);
    const cash = money(doc);
    const statCell = stat => `<div class="cc-stat"><span>${stat}</span><b>${stat === 'EMP' && hum.emp !== stats.EMP ? `${hum.emp}<small>/${stats.EMP}</small>` : stats[stat] || '—'}</b></div>`;
    const skills = finalSkills(doc).filter(skill => skill.nivel > 0).sort((a, b) => a.stat.localeCompare(b.stat) || a.nome.localeCompare(b.nome));
    const skillLabel = skill => skill.base ? specialName(skill.base, skill.tipo) : (skill.nome === 'Local Expert (Your Home)' && doc.casa ? `Especialista Local (${doc.casa})` : skillPt(skill.nome));
    const inv = inventory(doc);
    const group = (title, filter) => {
      const rows = inv.filter(filter);
      return rows.length ? `<h4>${title}</h4><ul class="cc-items">${rows.map(entry => `<li><b>${esc(entry.nome || entry.item.nome)}</b>${entry.qtd > 1 ? ` ×${entry.qtd}` : ''}${entry.item.resumo ? ` <small>${esc(entry.item.resumo)}</small>` : ''}${entry.origem === 'gratis2077' ? ' <small class="cc-ok">grátis (2077)</small>' : ''}</li>`).join('')}</ul>` : '';
    };
    const lp = lifepathTexts(doc);
    const lpRows = [...lifepathFields.map(([, label, field]) => [label, lp[field]]), ['Amigos', lp.friends], ['Inimigos', lp.enemies], ['Amores trágicos', lp.tragicLoveAffairs], ['Lifepath da Role', lp.roleLifepath]].filter(([, text]) => text);
    const home = housing(doc);
    return `<div class="cc-sheet">
      <div class="section cc-box" data-toc="Identidade"><h3>${esc(doc.nome || 'Sem nome')}${doc.apelido ? ` <span class="cc-handle">"${esc(doc.apelido)}"</span>` : ''}</h3>
        <p><b>${esc(role.nome || 'Sem Role')}</b> · ${esc(role.habilidade || '')} Rank 4${spec ? ` · ${esc(spec.nome)}` : ''} · ${esc((methodById(doc.metodo) || {}).nome || 'método não escolhido')}${doc.foundry ? ` · <b class="cc-ok">No Foundry desde ${new Date(doc.foundry.importado).toLocaleDateString('pt-BR')}</b>` : ''}</p>
        ${doc.aparencia ? `<p>${esc(doc.aparencia)}</p>` : ''}</div>
      <div class="section cc-box" data-toc="STATs"><h3>STATs</h3><div class="cc-stats">${statKeys.map(statCell).join('')}</div>
        <p class="cc-derived"><span>HP <b>${derived.hp}</b></span><span>Gravemente Ferido <b>${derived.gravemente}</b></span><span>Death Save <b>${derived.deathSave}</b></span><span>Humanidade <b>${hum.atual}/${hum.max}</b></span><span>Andar <b>${derived.andar} m</b></span><span>Correr <b>${derived.correr} m</b></span></p></div>
      <div class="section cc-box" data-toc="Perícias"><h3>Perícias</h3><div class="table-wrap dense"><table><thead><tr><th>Perícia</th><th>STAT</th><th>Nível</th><th>Base</th></tr></thead><tbody>${skills.map(skill => `<tr><td>${esc(skillLabel(skill))}${skill.gratis ? ' <small>(origem)</small>' : ''}</td><td>${skill.stat}</td><td>${skill.nivel}</td><td><b>${skill.nivel + (stats[skill.stat] || 0)}</b></td></tr>`).join('')}</tbody></table></div></div>
      <div class="section cc-box" data-toc="Equipamento"><h3>Equipamento e cyberware</h3>
        ${group('Armas', entry => entry.item.cat === 'armas')}${group('Munição', entry => entry.item.cat === 'municao')}${group('Armaduras', entry => entry.item.cat === 'armaduras')}
        ${group('Cyberware', entry => entry.item.cat === 'cyberware')}${group('Netrunning', entry => entry.item.cat === 'netrunning')}${group('Equipamento', entry => ['equipamento', 'acessorios', 'drogas'].includes(entry.item.cat))}${group('Moda', entry => entry.item.cat === 'moda')}
        <p><b>Dinheiro:</b> ${eb(Math.max(0, cash.saldo))}</p></div>
      <div class="section cc-box" data-toc="Lifepath"><h3>Lifepath</h3>${lpRows.length ? `<dl class="cc-lifepath">${lpRows.map(([label, text]) => `<dt>${label}</dt><dd>${esc(text)}</dd>`).join('')}</dl>` : '<p class="note-status">Ainda não preenchido.</p>'}</div>
      <div class="section cc-box" data-toc="Moradia"><h3>Moradia e estilo de vida</h3><p>${esc(home.moradia || '')}${home.aluguel ? ` · aluguel ${eb(home.aluguel)}/mês` : ''} · ${esc(home.estilo || '')}${home.custoEstilo ? ` (${eb(home.custoEstilo)}/mês)` : ''}. O primeiro mês é de graça.${doc.role === 'nomad' ? ` ${esc(C.housing.nomad.nota)}` : ''}</p></div>
      ${doc.notas ? `<div class="section cc-box" data-toc="Notas"><h3>Notas</h3><p>${esc(doc.notas)}</p></div>` : ''}
      ${forPrint ? '' : ''}</div>`;
  }

  async function setupSheet(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const id = helpers.target && helpers.target.section;
    if (!id) { root.innerHTML = '<p>Escolha um personagem em Personagens.</p>'; return; }
    const answer = await api(`api/personagens/${id}`);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const doc = answer.data.personagem;
    if (!doc) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Personagem não encontrado.')}</div>`; return; }
    if (doc.publico) { root.innerHTML = `<div class="callout">Esta é a ficha de outro jogador: você só vê o nome (<b>${esc(doc.nome)}</b>) e a Role (${esc(roleName(doc.role))}).</div>`; return; }
    root.innerHTML = `<p class="cc-toolbar"><button class="action" type="button" data-cc-edit>Editar</button><button class="action" type="button" data-cc-shop>Loja</button><button class="action" type="button" data-cc-back>Personagens</button></p>${sheetHtml(doc)}`;
    root.onclick = event => {
      if (event.target.closest('[data-cc-edit]')) helpers.openPage('criador', { section: id });
      if (event.target.closest('[data-cc-shop]')) helpers.openPage('loja', { section: id });
      if (event.target.closest('[data-cc-back]')) helpers.openPage('personagens');
    };
  }

  // ================= Loja (componente usado no criador e na página Loja) =================
  const shopState = { cat: 'armas', sub: '', busca: '' };
  function renderShop(target, doc, { onChange, readOnly = false }) {
    const fold = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const draw = () => {
      const cash = money(doc);
      const subs = [...new Set(shop.itens.filter(item => item.cat === shopState.cat).map(item => item.sub))];
      const terms = fold(shopState.busca).split(/\s+/).filter(Boolean);
      const visible = shop.itens.filter(item => (terms.length ? true : item.cat === shopState.cat) && (!shopState.sub || terms.length || item.sub === shopState.sub)
        && terms.every(term => fold(`${item.nome} ${item.en} ${item.sub} ${item.resumo || ''}`).includes(term)));
      const shown = visible.slice(0, 120);
      const owned = new Map();
      for (const entry of inventory(doc)) owned.set(entry.id, (owned.get(entry.id) || 0) + entry.qtd);
      const bought = inventory(doc).filter(entry => entry.origem === 'loja');
      target.innerHTML = `<div class="cc-wallet"><span>Dinheiro: <b class="${cash.saldo < 0 ? 'cc-bad' : ''}">${eb(cash.saldo)}</b> de ${eb(cash.inicial)}</span>${cash.moda ? `<span>Moda: ${eb(cash.usadoModa)} de ${eb(cash.moda)} <small>(só moda e fashionware; a sobra some)</small></span>` : ''}</div>
        ${readOnly ? '<div class="callout">Este personagem já está no Foundry: a loja inicial fechou. Compras durante a sessão chegam numa próxima versão.</div>' : ''}
        <div class="cc-shop-filters"><div class="map-filter-list">${shop.categorias.map(category => `<button type="button" class="map-filter${category.id === shopState.cat && !terms.length ? ' active' : ''}" data-shop-cat="${category.id}">${category.nome}</button>`).join('')}</div>
          <div class="cc-shop-row"><select data-shop-sub aria-label="Grupo"><option value="">Todos os grupos</option>${subs.map(sub => `<option${sub === shopState.sub ? ' selected' : ''}>${esc(sub)}</option>`).join('')}</select><input type="search" data-shop-busca placeholder="Buscar item" value="${esc(shopState.busca)}" aria-label="Buscar item"></div></div>
        <div class="cc-shop-list">${shown.map(item => `<div class="cc-shop-item"><div><b>${esc(item.nome)}</b>${owned.get(item.id) ? ` <small class="cc-ok">tem ${owned.get(item.id)}</small>` : ''}<br><small>${esc([item.sub, item.resumo].filter(Boolean).join(' · '))}</small>${item.desc ? `<br><small class="cc-desc">${esc(item.desc)}</small>` : ''}</div>
          <div class="cc-price">${eb(item.preco)}${item.lote > 1 ? `<small>/${item.lote}</small>` : ''}${readOnly ? '' : `<button class="action" type="button" data-shop-buy="${item.id}">Comprar</button>`}</div></div>`).join('') || '<p class="note-status">Nada encontrado.</p>'}
          ${visible.length > shown.length ? `<p class="note-status">Mostrando ${shown.length} de ${visible.length}: use a busca para achar o resto.</p>` : ''}</div>
        <h4>Comprado na loja</h4>${bought.length ? `<ul class="cc-items">${bought.map(entry => `<li><b>${esc(entry.item.nome)}</b> ×${entry.qtd} · ${eb(lineCost(entry))}${readOnly ? '' : ` <button class="action cc-danger" type="button" data-shop-return="${entry.uid}">Devolver</button>`}</li>`).join('')}</ul>` : '<p class="note-status">Nada ainda.</p>'}
        <p class="cc-msg" id="cc-shop-msg"></p>`;
    };
    target.onclick = event => {
      const cat = event.target.closest('[data-shop-cat]');
      if (cat) { shopState.cat = cat.dataset.shopCat; shopState.sub = ''; shopState.busca = ''; return draw(); }
      if (readOnly) return;
      const buy = event.target.closest('[data-shop-buy]');
      if (buy) {
        const item = catalog.get(buy.dataset.shopBuy);
        const step = item.lote > 1 ? item.lote : 1;
        const existing = (doc.itens || []).find(entry => entry.id === item.id);
        if (existing) existing.qtd += step;
        else (doc.itens = doc.itens || []).push({ uid: `loja:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, id: item.id, qtd: step });
        draw();
        const message = target.querySelector('#cc-shop-msg');
        const cash = money(doc);
        const needs = missingFoundations(doc).find(entry => entry.id === item.id);
        message.textContent = cash.saldo < 0 ? `Sem dinheiro: faltam ${eb(-cash.saldo)}. Devolva algo.` : needs ? `${item.nome} precisa da base certa (veja os avisos).` : `Comprado: ${item.nome}.`;
        return onChange();
      }
      const giveBack = event.target.closest('[data-shop-return]');
      if (giveBack) {
        const entry = (doc.itens || []).find(item => item.uid === giveBack.dataset.shopReturn);
        if (entry) {
          const item = catalog.get(entry.id);
          entry.qtd -= item && item.lote > 1 ? item.lote : 1;
          if (entry.qtd <= 0) doc.itens = doc.itens.filter(other => other !== entry);
        }
        draw();
        return onChange();
      }
    };
    target.onchange = event => {
      if (event.target.matches('[data-shop-sub]')) { shopState.sub = event.target.value; draw(); }
    };
    target.oninput = event => {
      if (!event.target.matches('[data-shop-busca]')) return;
      shopState.busca = event.target.value;
      const position = event.target.selectionStart;
      draw();
      const input = target.querySelector('[data-shop-busca]');
      input.focus();
      try { input.setSelectionRange(position, position); } catch { /* campo sem cursor */ }
    };
    draw();
  }

  // ================= Salvamento =================
  // Salva sozinho depois de um tempo sem mudanças; se a conexão cair, guarda neste aparelho.
  function createSaver(doc, statusEl, storage) {
    let timer = null;
    let saving = false;
    let again = false;
    const draftKey = `rascunho-personagem-${doc.id}`;
    const show = (text, kind = '') => { if (statusEl) { statusEl.textContent = text; statusEl.className = `cc-save ${kind}`; } };
    async function save() {
      if (saving) { again = true; return; }
      saving = true;
      show('Salvando…');
      const body = { ...doc, resultado: result(doc) };
      const answer = await api(`api/personagens/${doc.id}`, { method: 'PUT', body });
      saving = false;
      if (answer.status === 200) {
        doc.versao = answer.data.personagem.versao;
        doc.atualizado = answer.data.personagem.atualizado;
        storage.set(draftKey, '');
        show(`Salvo às ${new Date(doc.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
      } else if (answer.status === 409) {
        show('Este personagem foi alterado em outro lugar. Recarregue a página para ver a versão nova.', 'bad');
        return;
      } else if (!answer.status) {
        storage.set(draftKey, JSON.stringify({ base: doc.versao, doc }));
        show('Sem conexão: as mudanças estão guardadas neste aparelho e vão ser salvas quando voltar.', 'bad');
      } else {
        show(answer.data.erro || 'Não consegui salvar.', 'bad');
      }
      if (again) { again = false; save(); }
    }
    return {
      changed() { show('Mudanças não salvas…'); clearTimeout(timer); timer = setTimeout(save, 1200); },
      now() { clearTimeout(timer); return save(); },
      draft() { try { return JSON.parse(storage.get(draftKey) || 'null'); } catch { return null; } },
      dropDraft() { storage.set(draftKey, ''); }
    };
  }

  // ================= Página: Criador =================
  const steps = ['Identidade', 'STATs', 'Perícias', 'Lifepath', 'Equipamento', 'Moradia', 'Revisão'];

  async function setupCreator(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const id = helpers.target && helpers.target.section;
    if (!id) { root.innerHTML = '<p>Abra um personagem em Personagens, ou crie um novo.</p>'; return; }
    const answer = await api(`api/personagens/${id}`);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Você só pode editar os seus personagens. Entre com o seu código em Personagens.')}</div>`; return; }
    const doc = { ...blank(), ...loaded, lifepath: { ...blank().lifepath, ...(loaded.lifepath || {}) } };
    let step = Math.min(Math.max(Number(doc.passo) || 1, 1), steps.length);

    root.innerHTML = `<div class="cc-steps" role="tablist">${steps.map((name, index) => `<button type="button" class="map-filter" data-step="${index + 1}">${index + 1}. ${name}</button>`).join('')}</div>
      <p class="cc-save" id="cc-save" role="status"></p><div id="cc-recover"></div><div id="cc-step"></div>
      <p class="cc-toolbar"><button class="action" type="button" data-nav="-1">Voltar</button><button class="action" type="button" data-nav="1">Próximo</button><button class="action" type="button" data-cc-sheet>Ver a ficha</button></p>`;
    const saver = createSaver(doc, root.querySelector('#cc-save'), helpers.storage);
    const changed = () => { saver.changed(); markSteps(); };

    // Rascunho que não chegou ao servidor (conexão caiu): oferece recuperar.
    const draft = saver.draft();
    if (draft && draft.base === doc.versao && draft.doc) {
      const recover = root.querySelector('#cc-recover');
      recover.innerHTML = '<div class="callout">Há mudanças deste personagem guardadas neste aparelho que não chegaram ao servidor. <button class="action" type="button" data-cc-recover>Recuperar</button> <button class="action" type="button" data-cc-discard>Descartar</button></div>';
      recover.onclick = event => {
        if (event.target.closest('[data-cc-recover]')) { Object.assign(doc, draft.doc, { versao: doc.versao }); recover.innerHTML = ''; draw(); changed(); }
        if (event.target.closest('[data-cc-discard]')) { saver.dropDraft(); recover.innerHTML = ''; }
      };
    }

    const stepEl = root.querySelector('#cc-step');
    function markSteps() {
      const issues = pending(doc);
      root.querySelectorAll('[data-step]').forEach(button => {
        const n = Number(button.dataset.step);
        button.classList.toggle('active', n === step);
        button.classList.toggle('cc-done', n < steps.length && !issues.some(issue => issue.step === n) && (n !== 1 || Boolean(doc.role)));
      });
    }
    function go(n) {
      step = Math.min(Math.max(n, 1), steps.length);
      doc.passo = step;
      draw();
      changed();
      root.scrollIntoView({ block: 'start' });
    }
    function draw() {
      stepEl.innerHTML = [drawIdentity, drawStats, drawSkills, drawLifepath, drawGear, drawHousing, drawReview][step - 1]();
      if (step === 5 && doc.metodo === 'pacote') renderShop(stepEl.querySelector('#cc-shop'), doc, { onChange: changed, readOnly: Boolean(doc.foundry) });
      markSteps();
    }

    // ---------- 1. Identidade ----------
    function drawIdentity() {
      const role = roleById(doc.role);
      return `${box('Quem é', `<div class="cc-form"><label>Nome<input data-campo="nome" value="${esc(doc.nome)}" maxlength="80"></label><label>Apelido (handle)<input data-campo="apelido" value="${esc(doc.apelido)}" maxlength="80"></label><label class="cc-wide">Aparência e jeito<textarea data-campo="aparencia" rows="2" maxlength="2000">${esc(doc.aparencia)}</textarea></label></div>`)}
        ${box('Role', `<div class="cc-choices">${C.roles.map(item => `<button type="button" class="cc-choice${item.id === doc.role ? ' active' : ''}" data-role="${item.id}"><b>${item.nome}</b><small>${esc(item.habilidade)}</small><span>${esc(item.resumo)}</span></button>`).join('')}</div>
          ${role && role.especializacoes ? `<h4>Especialização de ${role.nome}</h4><div class="cc-choices">${role.especializacoes.map(item => `<button type="button" class="cc-choice${item.id === doc.especializacao ? ' active' : ''}" data-spec="${item.id}"><b>${item.nome}</b><span>Soma o Rank em ${item.pericias.map(skillPt).join(', ')}.</span></button>`).join('')}</div>` : ''}
          <p><button class="action" type="button" data-page="roles2077">Ler Roles de 2077</button></p>`)}
        ${box('Método de criação', `<div class="cc-choices">${C.methods.map(item => `<button type="button" class="cc-choice${item.id === doc.metodo ? ' active' : ''}" data-method="${item.id}"><b>${item.nome}</b><span>${esc(item.resumo)}</span></button>`).join('')}</div>`)}`;
    }

    // ---------- 2. STATs ----------
    function drawStats() {
      if (!doc.role || !doc.metodo) return box('STATs', '<p>Escolha a Role e o método no passo 1.</p>');
      const stats = computeStats(doc);
      const table = tableOf(doc);
      const derived = C.derived(stats);
      let body = '';
      if (doc.metodo === 'ratoderua') {
        const source = (roleById(doc.role) || {}).tabelas;
        body = `<p>Role 1d10 e pegue a linha inteira da tabela de ${esc(roleName(doc.role))}${source !== doc.role ? ` (a do ${esc(source.charAt(0).toUpperCase() + source.slice(1))} do RED)` : ''}, ou clique numa linha para escolher.</p>
          <p><button class="action" type="button" data-roll-row>Rolar 1d10</button></p>
          <div class="table-wrap dense"><table class="cc-pick"><thead><tr><th>1d10</th>${statKeys.map(stat => `<th>${stat}</th>`).join('')}</tr></thead><tbody>${table.map((row, index) => `<tr data-row="${index + 1}" class="${doc.sorteio.linha === index + 1 ? 'cc-picked' : ''}"><td><b>${index + 1}</b></td>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      } else if (doc.metodo === 'edgerunner') {
        body = `<p>Role 1d10 para cada STAT e pegue o valor daquela linha na coluna dela.</p><p><button class="action" type="button" data-roll-each>Rolar todos</button></p>
          <div class="cc-stats">${statKeys.map(stat => `<div class="cc-stat"><span>${stat}</span><b>${stats[stat] || '—'}</b><small>${doc.sorteio[stat] ? `1d10: ${doc.sorteio[stat]}` : ''}</small><button class="action" type="button" data-roll-stat="${stat}">Rolar</button></div>`).join('')}</div>`;
      } else {
        const points = statPoints(stats);
        body = `<p>Distribua <b>${C.completePackage.pontosStat}</b> pontos; cada STAT de ${C.completePackage.statMin} a ${C.completePackage.statMax}. <b class="${points === C.completePackage.pontosStat ? 'cc-ok' : 'cc-bad'}">Usados: ${points}</b></p>
          <div class="cc-stats">${statKeys.map(stat => `<div class="cc-stat"><span>${stat}</span><b>${stats[stat]}</b><div class="cc-step-buttons"><button type="button" class="action" data-stat-minus="${stat}" aria-label="Diminuir ${stat}">−</button><button type="button" class="action" data-stat-plus="${stat}" aria-label="Aumentar ${stat}">+</button></div></div>`).join('')}</div>`;
      }
      return `${box('STATs', body)}${box('Valores derivados', `<p class="cc-derived"><span>HP <b>${derived.hp}</b></span><span>Gravemente Ferido <b>${derived.gravemente}</b></span><span>Death Save <b>${derived.deathSave}</b></span><span>Humanidade <b>${derived.humanidade}</b></span><span>Andar <b>${derived.andar} m</b></span><span>Correr <b>${derived.correr} m</b></span></p><p class="note-status">HP = 10 + 5 × (média de BODY e WILL, para cima). A Humanidade cai com o cyberware no passo 5.</p>`)}`;
    }

    // ---------- 3. Perícias ----------
    function typeSelect(base, current, attr) {
      const info = C.specializedSkills[base];
      const options = base === 'Language' ? Object.entries(C.languages) : Object.entries(info.tipos);
      return `<select ${attr} aria-label="Tipo de ${info.nome}"><option value="">Escolha…</option>${options.map(([en, pt]) => `<option value="${esc(en)}"${en === current ? ' selected' : ''}>${esc(pt)}</option>`).join('')}</select>`;
    }
    function drawSkills() {
      if (!doc.role || !doc.metodo) return box('Perícias', '<p>Escolha a Role e o método no passo 1.</p>');
      const stats = computeStats(doc);
      const rows = skillRows(doc);
      const used = skillPointsUsed(doc);
      const budget = skillBudget(doc);
      const origin = doc.lifepath.origem ? C.originLanguages[doc.lifepath.origem - 1] : null;
      const header = doc.metodo === 'ratoderua'
        ? '<p>No Rato de Rua as perícias vêm prontas. Só escolha os tipos e a língua.</p>'
        : `<p>${doc.metodo === 'edgerunner' ? 'Distribua os pontos entre as 20 perícias da Role, cada uma de 2 a 6.' : 'Distribua os pontos em qualquer perícia, até 6; as básicas (em negrito) começam em 2.'} As marcadas ×2 custam o dobro. <b class="${used === budget ? 'cc-ok' : 'cc-bad'}">Pontos: ${used} de ${budget}</b></p>`;
      const line = ([name, level, editable]) => {
        const info = skillInfo.get(name) || {};
        const special = C.specializedSkills[name];
        return `<tr><td>${info.basica ? `<b>${esc(info.pt)}</b>` : esc(special ? special.nome : info.pt || name)}${info.x2 ? ' <small>×2</small>' : ''}${special ? ` ${typeSelect(name, doc.tipos[name], `data-tipo="${esc(name)}"`)}` : ''}${name === 'Local Expert (Your Home)' ? ` <select data-casa aria-label="Seu bairro"><option value="">Bairro…</option>${C.homeDistricts.map(place => `<option${place === doc.casa ? ' selected' : ''}>${place}</option>`).join('')}</select>` : ''}</td>
          <td>${info.stat || ''}</td><td class="cc-level">${editable ? `<button type="button" class="action" data-skill-minus="${esc(name)}" aria-label="Diminuir">−</button><b>${level}</b><button type="button" class="action" data-skill-plus="${esc(name)}" aria-label="Aumentar">+</button>` : `<b>${level}</b>`}</td><td><b>${level + (stats[info.stat] || 0)}</b></td></tr>`;
      };
      const extras = doc.metodo === 'pacote' ? `<h4>Perícias de escolha extras</h4><p class="note-status">Outras línguas, artes marciais (×2), instrumentos ou ciências.</p>
        ${doc.extras.map((extra, index) => `<div class="cc-extra">${esc(C.specializedSkills[extra.base].nome)} ${typeSelect(extra.base, extra.tipo, `data-extra-tipo="${index}"`)} <span class="cc-level"><button type="button" class="action" data-extra-minus="${index}">−</button><b>${extra.nivel}</b><button type="button" class="action" data-extra-plus="${index}">+</button></span> <button type="button" class="action cc-danger" data-extra-remove="${index}">Tirar</button></div>`).join('')}
        <p>${SPECIAL.map(base => `<button type="button" class="action" data-extra-add="${base}">+ ${C.specializedSkills[base].nome}</button>`).join(' ')}</p>` : '';
      return `${box('Língua da origem (4 níveis grátis)', `<p>${origin ? `Pela sua origem (Lifepath), as opções são: ${origin.map(en => C.languages[en]).join(', ')}. Pode escolher outra.` : 'Role a Origem cultural no Lifepath (passo 4) para ver as línguas da sua região, ou escolha agora.'}</p>${typeSelect('Language', doc.lingua, 'data-lingua')}`)}
        ${box('Perícias', `${header}<div class="table-wrap dense"><table><thead><tr><th>Perícia</th><th>STAT</th><th>Nível</th><th>Base</th></tr></thead><tbody>${rows.map(line).join('')}</tbody></table></div>${extras}`)}`;
    }

    // ---------- 4. Lifepath ----------
    function lpSelect(key, value, attr) {
      return `<select ${attr}><option value="">Escolha…</option>${lpTable(key).linhas.map(([from, to, html]) => `<option value="${from}"${Number(value) === from ? ' selected' : ''}>${from === to ? from : `${from}–${to}`}. ${esc(strip(html)).slice(0, 110)}</option>`).join('')}</select>`;
    }
    function drawLifepath() {
      const lp = doc.lifepath;
      const fields = lifepathFields.map(([key, label]) => `<div class="cc-lp"><label>${label}</label>${lpSelect(key, lp[key], `data-lp="${key}"`)}<button type="button" class="action" data-lp-roll="${key}">Rolar</button></div>`).join('');
      const list = (title, kind, items, render) => `<h4>${title}</h4>${items.length ? items.map((item, index) => `<div class="cc-lp-list">${render(item, index)}<button type="button" class="action cc-danger" data-lp-remove="${kind}:${index}">Tirar</button></div>`).join('') : '<p class="note-status">Nenhum.</p>'}<p><button type="button" class="action" data-lp-count="${kind}">Rolar quantos (1d10 − 7)</button> <button type="button" class="action" data-lp-add="${kind}">Adicionar um</button></p>`;
      return `${box('Lifepath', `<p>Role cada item ou escolha. <button type="button" class="action" data-lp-all>Rolar tudo</button></p><div class="cc-lp-grid">${fields}</div>`)}
        ${box('Relações', `${list('Amigos', 'amigos', lp.amigos, (value, index) => lpSelect('amigo', value, `data-lp-item="amigos:${index}"`))}
          ${list('Inimigos', 'inimigos', lp.inimigos, (enemy, index) => ['quem', 'causa', 'recursos', 'vinganca'].map(part => lpSelect(part === 'vinganca' ? 'vinganca' : `inimigo-${part}`, enemy[part], `data-lp-enemy="${index}:${part}"`)).join(''))}
          ${list('Amores trágicos', 'amores', lp.amores, (value, index) => lpSelect('amor', value, `data-lp-item="amores:${index}"`))}`)}
        ${box('Lifepath da Role e notas', `<label>O livro tem um Lifepath próprio de cada Role. Escreva aqui o seu, se usar.<textarea data-lp-text="roleLifepath" rows="3" maxlength="3000">${esc(lp.roleLifepath || '')}</textarea></label>`)}`;
    }
    const rollLp = key => helpers.rollDice('1d10');
    const newEnemy = () => ({ quem: rollLp(), causa: rollLp(), recursos: rollLp(), vinganca: rollLp() });

    // ---------- 5. Equipamento ----------
    function drawGear() {
      if (!doc.role || !doc.metodo) return box('Equipamento', '<p>Escolha a Role e o método no passo 1.</p>');
      const stats = computeStats(doc);
      const hum = humanity(doc, stats);
      const free = `<p>Em 2077, todo personagem começa de graça e sem perder Humanidade com: ${C.free2077.map(item => `${esc(item.nome || (catalog.get(item.id) || {}).nome)}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')}.</p>`;
      const humanityLine = `<p class="cc-derived"><span>Humanidade <b>${hum.atual}/${hum.max}</b></span><span>Perda <b>${hum.perda}</b></span><span>EMP <b>${hum.emp}</b>${hum.emp !== stats.EMP ? ` <small>(era ${stats.EMP})</small>` : ''}</span></p><p class="note-status">Cada cyberware perde o valor fixo de Humanidade do livro. A EMP é a Humanidade ÷ 10, para baixo.</p>`;
      const warnings = missingFoundations(doc).map(entry => `<li>${esc(entry.item.nome)} precisa da base (${esc(entry.item.sub)}).</li>`).join('');
      if (doc.metodo === 'pacote') {
        return `${box('Cyberware grátis de 2077', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}${box('Loja inicial', '<div id="cc-shop"></div>')}`;
      }
      const pack = C.packages[(roleById(doc.role) || {}).tabelas] || {};
      const label = ([id, qty]) => { const item = catalog.get(id) || {}; return `${esc(item.nome || id)}${qty > 1 ? ` ×${qty}` : ''}`; };
      const categoryBox = (category, title) => `<h4>${title}</h4><ul class="cc-items">${(pack[category] || []).map((entry, index) => {
        if (!entry.ou) return `<li>${label(entry)}${C.free2077.some(free2077 => free2077.id === entry[0]) && category === 'cyberware' ? ' <small class="cc-ok">já vem grátis em 2077</small>' : ''}</li>`;
        const key = `${category}:${index}`;
        const chosen = Number(doc.escolhas[key]) || 0;
        return `<li>${entry.ou.map((option, k) => `<label class="cc-radio"><input type="radio" name="esc-${key}" data-escolha="${key}" value="${k}"${k === chosen ? ' checked' : ''}> ${option.map(label).join(' + ')}</label>`).join(' <small>ou</small> ')}</li>`;
      }).join('')}</ul>`;
      return `${box('Pacote da Role', `<p>No ${esc((methodById(doc.metodo) || {}).nome)} o equipamento vem pronto. Escolha onde houver opção.</p>${categoryBox('armas', 'Armas e armaduras')}${categoryBox('equipamento', 'Equipamento')}${categoryBox('moda', 'Moda')}${categoryBox('cyberware', 'Cyberware')}`)}
        ${box('Cyberware grátis de 2077 e Humanidade', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}
        ${box('Mais 500eb para gastar', '<p>Além do pacote, você ganha 500eb para comprar outros itens ou guardar. Use a loja.</p><p><button type="button" class="action" data-cc-shop>Abrir a loja</button></p>')}`;
    }

    // ---------- 6. Moradia ----------
    function drawHousing() {
      if (!doc.role) return box('Moradia', '<p>Escolha a Role no passo 1.</p>');
      const home = housing(doc);
      const nomad = doc.role === 'nomad' ? `<p><label class="cc-radio"><input type="radio" name="moradia" data-moradia="padrao"${home.tipo === 'padrao' ? ' checked' : ''}> Contêiner ou quitinete na cidade</label> <label class="cc-radio"><input type="radio" name="moradia" data-moradia="familia"${home.tipo === 'familia' ? ' checked' : ''}> Com a família do clã</label></p>` : '';
      return box('Moradia e estilo de vida', `<p><b>${esc(home.moradia)}</b>${home.aluguel ? `: aluguel de ${eb(home.aluguel)} por mês` : ''}.</p><p>Estilo de vida: <b>${esc(home.estilo)}</b>${home.custoEstilo ? ` (${eb(home.custoEstilo)} por mês)` : ''}.</p>${nomad}<p class="note-status">O primeiro mês é de graça. Depois, ${home.aluguel + home.custoEstilo ? `${eb(home.aluguel + home.custoEstilo)} no dia 1º de cada mês` : 'sem custo fixo'}. Em 2077 acabou o Kibble: o Prepak genérico custa o mesmo.</p>
        <label>Notas (aparência da casa, contatos, o que quiser)<textarea data-campo="notas" rows="3" maxlength="5000">${esc(doc.notas)}</textarea></label>`);
    }

    // ---------- 7. Revisão ----------
    function drawReview() {
      const issues = pending(doc);
      return `${box('Pendências', issues.length ? `<ul class="cc-warn">${issues.map(issue => `<li><button type="button" class="cc-link" data-step="${issue.step}">${steps[issue.step - 1]}</button>: ${esc(issue.text)}</li>`).join('')}</ul><p class="note-status">Nada aqui impede de salvar: o mestre importa no Foundry quando achar que está pronto.</p>` : '<p class="cc-ok">Tudo certo. O mestre já pode importar este personagem no Foundry.</p>')}${sheetHtml(doc)}`;
    }

    // ---------- Eventos ----------
    root.onclick = event => {
      const target = event.target;
      const stepButton = target.closest('[data-step]');
      if (stepButton) return go(Number(stepButton.dataset.step));
      const nav = target.closest('[data-nav]');
      if (nav) return go(step + Number(nav.dataset.nav));
      if (target.closest('[data-cc-sheet]')) { saver.now(); return helpers.openPage('ficha', { section: doc.id }); }
      if (target.closest('[data-cc-shop]')) { saver.now(); return helpers.openPage('loja', { section: doc.id }); }
      const role = target.closest('[data-role]');
      if (role) { if (doc.role !== role.dataset.role) { doc.role = role.dataset.role; doc.especializacao = ''; doc.escolhas = {}; doc.tipos = {}; doc.pericias = {}; } draw(); return changed(); }
      const spec = target.closest('[data-spec]');
      if (spec) { doc.especializacao = spec.dataset.spec; draw(); return changed(); }
      const method = target.closest('[data-method]');
      if (method) { if (doc.metodo !== method.dataset.method) { doc.metodo = method.dataset.method; doc.sorteio = {}; doc.pericias = {}; doc.extras = []; doc.escolhas = {}; } draw(); return changed(); }
      // STATs
      if (target.closest('[data-roll-row]')) { doc.sorteio = { linha: helpers.rollDice('1d10') }; draw(); return changed(); }
      const row = target.closest('[data-row]');
      if (row && doc.metodo === 'ratoderua') { doc.sorteio = { linha: Number(row.dataset.row) }; draw(); return changed(); }
      if (target.closest('[data-roll-each]')) { statKeys.forEach(stat => { doc.sorteio[stat] = helpers.rollDice('1d10'); }); draw(); return changed(); }
      const rollStat = target.closest('[data-roll-stat]');
      if (rollStat) { doc.sorteio[rollStat.dataset.rollStat] = helpers.rollDice('1d10'); draw(); return changed(); }
      const statPlus = target.closest('[data-stat-plus]') || target.closest('[data-stat-minus]');
      if (statPlus) {
        const stat = statPlus.dataset.statPlus || statPlus.dataset.statMinus;
        const current = Number(doc.stats[stat]) || 6;
        doc.stats[stat] = Math.min(C.completePackage.statMax, Math.max(C.completePackage.statMin, current + (statPlus.dataset.statPlus ? 1 : -1)));
        draw(); return changed();
      }
      // Perícias
      const skillButton = target.closest('[data-skill-plus]') || target.closest('[data-skill-minus]');
      if (skillButton) {
        const name = skillButton.dataset.skillPlus || skillButton.dataset.skillMinus;
        const info = skillInfo.get(name) || {};
        const min = doc.metodo === 'edgerunner' || info.basica ? 2 : 0;
        const current = Number(doc.pericias[name]) || (doc.metodo === 'edgerunner' || info.basica ? 2 : 0);
        doc.pericias[name] = Math.min(6, Math.max(min, current + (skillButton.dataset.skillPlus ? 1 : -1)));
        draw(); return changed();
      }
      const extraAdd = target.closest('[data-extra-add]');
      if (extraAdd) { doc.extras.push({ base: extraAdd.dataset.extraAdd, tipo: '', nivel: 1 }); draw(); return changed(); }
      const extraButton = target.closest('[data-extra-plus]') || target.closest('[data-extra-minus]');
      if (extraButton) {
        const extra = doc.extras[Number(extraButton.dataset.extraPlus ?? extraButton.dataset.extraMinus)];
        extra.nivel = Math.min(6, Math.max(1, extra.nivel + (extraButton.dataset.extraPlus !== undefined ? 1 : -1)));
        draw(); return changed();
      }
      const extraRemove = target.closest('[data-extra-remove]');
      if (extraRemove) { doc.extras.splice(Number(extraRemove.dataset.extraRemove), 1); draw(); return changed(); }
      // Lifepath
      const lpRoll = target.closest('[data-lp-roll]');
      if (lpRoll) { doc.lifepath[lpRoll.dataset.lpRoll] = rollLp(); draw(); return changed(); }
      if (target.closest('[data-lp-all]')) {
        lifepathFields.forEach(([key]) => { doc.lifepath[key] = rollLp(); });
        const count = () => Math.max(0, helpers.rollDice('1d10') - 7);
        doc.lifepath.amigos = Array.from({ length: count() }, rollLp);
        doc.lifepath.inimigos = Array.from({ length: count() }, newEnemy);
        doc.lifepath.amores = Array.from({ length: count() }, rollLp);
        draw(); return changed();
      }
      const lpCount = target.closest('[data-lp-count]');
      if (lpCount) {
        const kind = lpCount.dataset.lpCount;
        const count = Math.max(0, helpers.rollDice('1d10') - 7);
        doc.lifepath[kind] = Array.from({ length: count }, kind === 'inimigos' ? newEnemy : rollLp);
        draw(); return changed();
      }
      const lpAdd = target.closest('[data-lp-add]');
      if (lpAdd) { const kind = lpAdd.dataset.lpAdd; doc.lifepath[kind].push(kind === 'inimigos' ? newEnemy() : rollLp()); draw(); return changed(); }
      const lpRemove = target.closest('[data-lp-remove]');
      if (lpRemove) { const [kind, index] = lpRemove.dataset.lpRemove.split(':'); doc.lifepath[kind].splice(Number(index), 1); draw(); return changed(); }
      if (target.closest('[data-page]')) return; // links para outras páginas: o motor da wiki cuida
    };
    root.onchange = event => {
      const target = event.target;
      if (target.matches('[data-tipo]')) { doc.tipos[target.dataset.tipo] = target.value; }
      else if (target.matches('[data-lingua]')) { doc.lingua = target.value; }
      else if (target.matches('[data-casa]')) { doc.casa = target.value; }
      else if (target.matches('[data-extra-tipo]')) { doc.extras[Number(target.dataset.extraTipo)].tipo = target.value; }
      else if (target.matches('[data-lp]')) { doc.lifepath[target.dataset.lp] = Number(target.value) || ''; }
      else if (target.matches('[data-lp-item]')) { const [kind, index] = target.dataset.lpItem.split(':'); doc.lifepath[kind][Number(index)] = Number(target.value) || 1; }
      else if (target.matches('[data-lp-enemy]')) { const [index, part] = target.dataset.lpEnemy.split(':'); doc.lifepath.inimigos[Number(index)][part] = Number(target.value) || 1; }
      else if (target.matches('[data-escolha]')) { doc.escolhas[target.dataset.escolha] = Number(target.value); }
      else if (target.matches('[data-moradia]')) { doc.moradia = target.dataset.moradia; }
      else return;
      draw();
      changed();
    };
    // Texto: atualiza sem redesenhar (não perde o cursor).
    root.oninput = event => {
      const target = event.target;
      if (target.matches('[data-campo]')) { doc[target.dataset.campo] = target.value; changed(); }
      if (target.matches('[data-lp-text]')) { doc.lifepath[target.dataset.lpText] = target.value; changed(); }
    };
    draw();
  }

  // ================= Página: Loja =================
  async function setupShopPage(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    shopState.busca = '';
    const root = content.querySelector('#cc-root');
    const [me, list] = await Promise.all([identity(), api('api/personagens')]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const mine = (list.data.personagens || []).filter(item => !item.publico);
    if (!mine.length) { root.innerHTML = `<div class="callout">${me.data.papel === 'visitante' ? 'Entre com o seu código em Personagens para comprar.' : 'Crie um personagem primeiro, em Personagens.'}</div>`; return; }
    const chosen = (helpers.target && helpers.target.section) || mine[0].id;
    root.innerHTML = `<p class="cc-toolbar"><label>Personagem <select data-shop-pc>${mine.map(item => `<option value="${item.id}"${item.id === chosen ? ' selected' : ''}>${esc(item.nome || 'Sem nome')}</option>`).join('')}</select></label> <span class="cc-save" id="cc-save" role="status"></span></p><div id="cc-shop"></div>`;
    root.querySelector('[data-shop-pc]').onchange = event => helpers.openPage('loja', { section: event.target.value }, 'replace');
    const answer = await api(`api/personagens/${chosen}`);
    if (token !== renderToken) return;
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { root.querySelector('#cc-shop').innerHTML = '<div class="callout">Não consegui abrir este personagem.</div>'; return; }
    const doc = { ...blank(), ...loaded };
    if (!doc.metodo) { root.querySelector('#cc-shop').innerHTML = '<div class="callout">Escolha o método de criação no criador antes de comprar: ele define quanto dinheiro você tem.</div>'; return; }
    const saver = createSaver(doc, root.querySelector('#cc-save'), helpers.storage);
    renderShop(root.querySelector('#cc-shop'), doc, { onChange: () => saver.changed(), readOnly: Boolean(doc.foundry) });
  }

  // ---------------- Páginas ----------------
  const holder = '<div id="cc-root">Carregando…</div>';
  window.characterCreator = {
    pages: {
      personagens: { eyebrow: 'Campanha / jogadores', title: 'Personagens', lede: 'Os personagens dos jogadores, salvos na wiki. Crie, edite e consulte; o mestre leva para o Foundry quando estiver pronto.', html: holder, setup: setupList },
      ficha: { eyebrow: 'Personagens / ficha', title: 'Ficha', lede: 'A ficha para consulta durante o jogo.', html: holder, setup: setupSheet, manterAlvo: true },
      criador: { eyebrow: 'Personagens / criador', title: 'Criador de personagem', lede: 'Passo a passo do Cyberpunk RED com as Roles de 2077. Tudo é salvo sozinho; os avisos mostram o que falta, mas não impedem de continuar.', html: holder, setup: setupCreator, manterAlvo: true },
      loja: { eyebrow: 'Personagens / loja', title: 'Loja inicial', lede: 'Compre o equipamento inicial com o dinheiro do personagem. Depois que ele for para o Foundry, a loja inicial fecha.', html: holder, setup: setupShopPage, manterAlvo: true }
    },
    // Para os testes e o importador: as mesmas contas que a tela usa.
    regras: { computeStats, skillPointsUsed, finalSkills, inventory, money, humanity, missingFoundations, pending, result, blank }
  };
})();
