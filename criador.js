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
  const descOf = en => ((rules.data && rules.data.skillDescriptions) || {})[en] || '';
  const skillInfo = new Map((rules.data && rules.data.skills || []).filter(([, en]) => !SPECIAL.includes(en) && en !== 'Local Expert')
    .map(([pt, en, stat, grupo, x2, basica]) => [en, { pt, stat, grupo, x2, basica, desc: descOf(en) }]));
  skillInfo.set('Language (Streetslang)', { pt: 'Linguagem (Streetslang)', stat: 'INT', grupo: 'Educação', x2: false, basica: true, desc: 'A gíria das ruas de Night City, que todo mundo fala.' });
  skillInfo.set('Local Expert (Your Home)', { pt: 'Especialista Local (sua casa)', stat: 'INT', grupo: 'Educação', x2: false, basica: true, desc: descOf('Local Expert') });
  for (const [en, info] of Object.entries(C.specializedSkills)) skillInfo.set(en, { pt: `${info.nome} (escolha um tipo)`, stat: info.stat, grupo: '', x2: Boolean(info.x2), basica: false, especial: true, desc: descOf(en) });
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
    stats: {}, sorteio: {}, pericias: {}, tipos: {}, extras: [], lingua: '', casa: '', kitNet: 'red', quickhacks: [],
    lifepath: { amigos: [], inimigos: [], amores: [], role: {} }, escolhas: {}, itens: [], moradia: '', estiloVida: '', traumaTeam: '', estiloModa: '', habilidades: {}, oficina: [], montagem: {},
    aparencia: '', notas: ''
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

  // As 20 perícias da Role (as do Edgerunner) e o "Distribuir sugerido": os níveis do Rato de Rua dela, que fecham os 86 pontos.
  const suggestedSkills = doc => new Set(C.edgerunnerSkills[(roleById(doc.role) || {}).tabelas] || []);
  function applySuggested(doc) {
    const list = C.streetratSkills[(roleById(doc.role) || {}).tabelas] || [];
    const oldExtras = doc.extras || [];
    doc.pericias = {};
    if (doc.metodo === 'pacote') doc.extras = [];
    for (const [name, level] of list) {
      if (doc.metodo === 'pacote' && C.specializedSkills[name]) doc.extras.push({ base: name, tipo: (oldExtras.find(extra => extra.base === name) || {}).tipo || doc.tipos[name] || '', nivel: level });
      else doc.pericias[name] = level;
    }
  }

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
  // Pacote da Role (Rato de Rua e Edgerunner) com as escolhas feitas, mais o Neuroport de graça e o que foi comprado.
  // Kit do Netrunner: o do RED (cyberdeck e programas do pacote) ou o do suplemento de fã (Hunter MK.1 e 3 quickhacks).
  const isRedDeckEntry = entry => (entry.ou ? entry.ou.flat() : [entry]).every(([id]) => id === 'core_gear:cyberdeck' || id.startsWith('core_programs:'));
  const uses2077Kit = (doc, pack) => Boolean(pack && pack.kit2077 && doc.kitNet === '2077');
  const chosenQuickhacks = (doc, pack) => (doc.quickhacks || []).filter(id => pack.kit2077.quickhacks.some(([option]) => option === id)).slice(0, pack.kit2077.escolher);
  function packageEntries(doc) {
    if (!['ratoderua', 'edgerunner'].includes(doc.metodo)) return [];
    const pack = C.packages[(roleById(doc.role) || {}).tabelas];
    if (!pack) return [];
    const list = [];
    const kit2077 = uses2077Kit(doc, pack);
    for (const category of ['armas', 'equipamento', 'moda', 'cyberware']) {
      (pack[category] || []).forEach((entry, index) => {
        if (kit2077 && category === 'equipamento' && isRedDeckEntry(entry)) return;
        const key = `${category}:${index}`;
        const option = entry.ou ? Number(doc.escolhas[key]) || 0 : -1;
        const items = entry.ou ? entry.ou[option] || entry.ou[0] : [entry];
        items.forEach(([id, qty], k) => list.push({ uid: `pacote:${key}:${option}:${k}`, id, qtd: qty, origem: 'pacote' }));
      });
      if (kit2077 && category === 'equipamento') {
        list.push({ uid: 'pacote:kit2077:deck', id: pack.kit2077.deck, qtd: 1, origem: 'pacote' });
        for (const id of chosenQuickhacks(doc, pack)) list.push({ uid: `pacote:kit2077:${id}`, id, qtd: 1, origem: 'pacote' });
      }
    }
    return list;
  }
  // Itens que a Role dá (o terno de negócios do Corpo): só no Pacote Completo, porque os pacotes já trazem.
  const roleFree = doc => (doc.metodo === 'pacote' && C.roleFreeItems[doc.role]) || [];
  function inventory(doc) {
    const free = [
      ...C.free2077.map(item => ({ uid: `gratis:${item.id}`, id: item.id, qtd: item.qtd, origem: 'gratis2077', nome: item.nome || '' })),
      ...roleFree(doc).map(item => ({ uid: `role:${item.id}`, id: item.id, qtd: item.qtd, origem: 'role', nome: '' }))
    ];
    const freeIds = new Set([...free.map(item => item.id), ...C.neuroportIncludes]);
    // O que o pacote dá e já vem no Neuroport (Neural Link, Interface Plugs...) não entra duas vezes (nem cobra Humanidade de novo).
    const pack = packageEntries(doc).filter(item => !(freeIds.has(item.id) && (catalog.get(item.id) || {}).cat === 'cyberware'));
    const bought = (doc.itens || []).filter(item => catalog.has(item.id)).map(item => ({ ...item, origem: 'loja' }));
    return [...free, ...pack, ...bought].map(item => ({ ...item, item: catalog.get(item.id) })).filter(entry => entry.item);
  }
  const isFashion = item => item.cat === 'moda' || (item.cyber && item.cyber.tipo === 'fashionware');
  const lineCost = entry => entry.item.preco * (entry.item.lote > 1 ? entry.qtd / entry.item.lote : entry.qtd);

  // Dinheiro: Pacote Completo tem 2.550eb e mais 800eb só de moda (a sobra da moda some); os outros, 500eb.
  // A moradia e o estilo de vida melhores que o padrão (e o Trauma Team) cobram o primeiro mês daqui.
  function money(doc) {
    const bought = inventory(doc).filter(entry => entry.origem === 'loja');
    const fashion = bought.filter(entry => isFashion(entry.item)).reduce((sum, entry) => sum + lineCost(entry), 0);
    const other = bought.filter(entry => !isFashion(entry.item)).reduce((sum, entry) => sum + lineCost(entry), 0);
    const budget = doc.metodo === 'pacote' ? C.completePackage.dinheiro : C.edgerunnerRules.dinheiro;
    const fashionBudget = doc.metodo === 'pacote' ? C.completePackage.moda : 0;
    const fromFashion = Math.min(fashionBudget, fashion);
    const home = doc.role ? housing(doc).primeiroMes : 0;
    const spent = other + fashion - fromFashion + home;
    return { inicial: budget, moda: fashionBudget, gastoModa: fashion, usadoModa: fromFashion, moradia: home, gasto: spent, saldo: budget - spent };
  }

  // Humanidade: EMP × 10, menos a perda fixa de cada cyberware (o Neuroport de graça não perde). EMP = Humanidade ÷ 10, para baixo.
  function humanity(doc, stats) {
    const lost = inventory(doc).filter(entry => entry.item.cyber && entry.origem !== 'gratis2077').reduce((sum, entry) => sum + entry.item.cyber.hl * entry.qtd, 0);
    const max = (Number(stats.EMP) || 0) * 10;
    const current = Math.max(0, max - lost);
    return { max, perda: lost, atual: current, emp: Math.floor(current / 10) };
  }
  // Ciberpsicose (p. 230–232): com EMP 2 já começa. Sem EMP ainda (STATs por distribuir), nada a dizer.
  function cyberpsychosis(hum) {
    if (!hum.max) return '';
    if (hum.max - hum.perda < 0) return 'Humanidade negativa: ciberpsicose extrema. O personagem passa para o mestre até a Humanidade voltar a ser positiva.';
    if (hum.emp <= 0) return 'EMP 0: ciberpsicose. O personagem mostra com força pelo menos 5 traços de psicopatia.';
    if (hum.emp === 1) return 'EMP 1: ciberpsicose limítrofe. O personagem mostra com força pelo menos 3 traços de psicopatia.';
    if (hum.emp === 2) return 'EMP 2: transtorno dissociativo limítrofe. Mais cromo leva à ciberpsicose.';
    return '';
  }

  // Cyberware de opção precisa da base do mesmo tipo (cyberbraço, cyberolho, Neural Link...).
  const NEEDS_BASE = ['neuralWare', 'cyberEye', 'cyberAudioSuite', 'cyberArm', 'cyberLeg', 'borgware'];
  function missingFoundations(doc) {
    const entries = inventory(doc).filter(entry => entry.item.cyber);
    const bases = new Set(entries.filter(entry => entry.item.cyber.base).map(entry => entry.item.cyber.tipo));
    return entries.filter(entry => !entry.item.cyber.base && NEEDS_BASE.includes(entry.item.cyber.tipo) && !bases.has(entry.item.cyber.tipo));
  }

  // ---------------- Montagem (como na ficha do Foundry) ----------------
  // Cada item do inventário tem um uso (equipado, carregando, guardado) e, conforme o tipo, um lugar: a arma tem a
  // munição carregada; o acessório fica numa arma; programa e hardware, num cyberdeck; a opção de cyberware, numa
  // base (cyberbraço, cyberolho…). O que o jogador não mexeu sai montado sozinho, e doc.montagem guarda só o que ele
  // mudou: { [uid]: { uso, municao, em } }, com '-' para "nenhuma" (descarregada, solto). Personagens antigos não têm
  // nada e ficam com o padrão. Uma escolha que deixou de valer (o item saiu, não cabe mais) volta ao padrão.
  const USOS = { equipado: 'Equipado', carregando: 'Carregando', guardado: 'Guardado' };
  const kindOf = item => item.arma ? 'arma' : item.municao ? 'municao' : item.armadura ? 'armadura' : item.acessorio ? 'acessorio' : item.deck ? 'deck'
    : item.programa || item.hardware ? 'deckItem' : item.cyber ? (item.cyber.base ? 'cyberBase' : 'cyberOpcao') : item.roupa ? 'roupa' : 'item';
  // Acessório: arma de distância, que não seja exótica, com slots; com classe no nome, só naquela classe;
  // os de cano (lança-granadas e espingarda embaixo do cano) só em arma de duas mãos.
  const UNDERBARREL = /Underbarrel/;
  const accessoryFits = (acc, weapon) => {
    const a = weapon.item.arma;
    if (!a.distancia || a.exotica || !a.slots) return false;
    if (acc.item.acessorio.classe && acc.item.acessorio.classe !== a.classe) return false;
    return !UNDERBARREL.test(acc.item.en || '') || a.maos >= 2;
  };
  const ammoFits = (ammo, weapon) => weapon.item.arma.municao.includes(ammo.item.municao.variedade);
  // Slots que o item ocupa: o tamanho de cada cópia vezes a quantidade (dois Swords são dois programas no deck).
  const sizeOf = entry => (entry.item.acessorio ? entry.item.acessorio.tamanho : entry.item.programa ? entry.item.programa.tamanho : entry.item.hardware ? entry.item.hardware.tamanho : entry.item.cyber ? entry.item.cyber.tamanho : 0) * Math.max(1, entry.qtd || 1);
  const capacityOf = entry => entry.item.arma ? entry.item.arma.slots : entry.item.deck ? entry.item.deck.slots : entry.item.cyber && entry.item.cyber.base ? entry.item.cyber.slots : 0;
  const parentFits = (child, parent) => {
    const kind = kindOf(child.item);
    if (kind === 'acessorio') return kindOf(parent.item) === 'arma' && accessoryFits(child, parent);
    if (kind === 'deckItem') return kindOf(parent.item) === 'deck';
    if (kind === 'cyberOpcao') return kindOf(parent.item) === 'cyberBase' && parent.item.cyber.tipo === child.item.cyber.tipo;
    return false;
  };
  // A armadura cobre a cabeça, o corpo ou as duas; o escudo é à parte.
  const armorLocations = item => [...(item.armadura.corpo ? ['corpo'] : []), ...(item.armadura.cabeca ? ['cabeca'] : [])];

  function assembly(doc, inv = inventory(doc)) {
    const overrides = doc.montagem || {};
    const rows = inv.map(entry => ({ ...entry, tipo: kindOf(entry.item), uso: '', municao: '', em: '' }));
    const byUid = new Map(rows.map(row => [row.uid, row]));
    const used = new Map();
    const free = parent => capacityOf(parent) - (used.get(parent.uid) || 0);
    const place = (child, parent) => { child.em = parent.uid; used.set(parent.uid, (used.get(parent.uid) || 0) + sizeOf(child)); };
    const childKinds = ['acessorio', 'deckItem', 'cyberOpcao'];
    // 1. Lugares escolhidos pelo jogador (só os que ainda valem), depois os do padrão: o primeiro que couber.
    for (const row of rows.filter(item => childKinds.includes(item.tipo))) {
      const chosen = (overrides[row.uid] || {}).em;
      if (chosen === '-') { row.em = '-'; continue; }
      const parent = chosen && byUid.get(chosen);
      if (parent && parentFits(row, parent) && free(parent) >= sizeOf(row)) place(row, parent);
    }
    for (const row of rows.filter(item => childKinds.includes(item.tipo) && !item.em)) {
      // Cyberware interno, externo e fashionware vai no próprio corpo: no Foundry, as bases já vêm na ficha.
      if (row.tipo === 'cyberOpcao' && !NEEDS_BASE.includes(row.item.cyber.tipo)) continue;
      const parent = rows.find(item => parentFits(row, item) && free(item) >= sizeOf(row));
      if (parent) place(row, parent);
    }
    // 2. Munição carregada em cada arma de distância: a escolhida, ou a compatível (de preferência a básica).
    for (const row of rows.filter(item => item.tipo === 'arma' && item.item.arma.distancia && item.item.arma.pente)) {
      const chosen = (overrides[row.uid] || {}).municao;
      const pick = chosen === '-' ? null : byUid.get(chosen);
      const compatible = rows.filter(item => item.tipo === 'municao' && ammoFits(item, row));
      row.municao = chosen === '-' ? '-' : (pick && pick.tipo === 'municao' && ammoFits(pick, row) ? pick : compatible.find(item => item.item.municao.tipo === 'basic') || compatible[0] || {}).uid || '';
    }
    // 3. Uso. Armaduras: uma por local (a escolhida ou, sem escolha, a de maior SP); escudo e o resto, carregando.
    for (const row of rows) {
      const chosen = (overrides[row.uid] || {}).uso;
      const fallback = { arma: 'equipado', roupa: 'equipado', item: 'carregando', armadura: 'carregando', deck: 'carregando' }[row.tipo] || '';
      row.uso = fallback && USOS[chosen] ? chosen : fallback;
    }
    // Para cada local: a armadura que o jogador vestiu; sem escolha nenhuma ali, a de maior SP; se ele tirou todas,
    // nenhuma. Uma armadura que cobre os dois locais (Bodyweight Suit) vestida no corpo vale também para a cabeça.
    const armors = rows.filter(row => row.tipo === 'armadura' && !row.item.armadura.escudo);
    const worn = new Set();
    for (const location of ['corpo', 'cabeca']) {
      const covering = armors.filter(row => armorLocations(row.item).includes(location));
      if (covering.some(row => worn.has(row))) continue;
      const chosen = covering.find(row => (overrides[row.uid] || {}).uso === 'equipado');
      const untouched = !covering.some(row => (overrides[row.uid] || {}).uso);
      const winner = chosen || (untouched ? [...covering].sort((a, b) => b.item.armadura[location] - a.item.armadura[location])[0] : null);
      if (winner) worn.add(winner);
    }
    for (const row of armors) row.uso = worn.has(row) ? 'equipado' : (overrides[row.uid] || {}).uso === 'guardado' ? 'guardado' : 'carregando';
    // O primeiro cyberdeck fica equipado (é o deck ativo no Foundry), a não ser que o jogador escolha outro.
    const decks = rows.filter(row => row.tipo === 'deck');
    if (decks.length && !decks.some(row => (overrides[row.uid] || {}).uso === 'equipado')) decks[0].uso = (overrides[decks[0].uid] || {}).uso || 'equipado';
    // Penalidade da armadura (RED p. 97): a maior das armaduras vestidas, em REF, DEX e MOVE.
    const penalty = Math.max(0, ...rows.filter(row => row.tipo === 'armadura' && row.uso === 'equipado').map(row => row.item.armadura.penalidade || 0));
    const sp = location => Math.max(0, ...armors.filter(row => row.uso === 'equipado' && armorLocations(row.item).includes(location)).map(row => row.item.armadura[location]));
    return { rows, byUid, used, free, penalidade: penalty, sp: { corpo: sp('corpo'), cabeca: sp('cabeca') } };
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
  // Lifepath da Role (p. 54–70): as respostas ficam em lifepath.role, { idDaTabela: resultado }. Uma tabela
  // condicional só vale quando a anterior que ela segue está valendo e deu o resultado certo.
  const roleLpTables = doc => C.roleLifepaths[(roleById(doc.role) || {}).tabelas] || [];
  function roleLpActive(doc) {
    const answers = (doc.lifepath && doc.lifepath.role) || {};
    const active = new Set();
    return roleLpTables(doc).filter(table => {
      if (table.se && !(active.has(table.se.id) && Number(answers[table.se.id]) === table.se.valor)) return false;
      active.add(table.id);
      return true;
    });
  }
  function rollRoleLp(doc, roll) {
    doc.lifepath.role = {};
    for (const table of roleLpTables(doc)) {
      if (roleLpActive(doc).includes(table)) doc.lifepath.role[table.id] = roll(table.dado || table.linhas.length);
    }
  }
  const roleLpMissing = doc => roleLpActive(doc).filter(table => !((doc.lifepath && doc.lifepath.role) || {})[table.id]);
  function roleLpText(doc) {
    const answers = (doc.lifepath && doc.lifepath.role) || {};
    return roleLpActive(doc).filter(table => table.linhas[answers[table.id] - 1])
      .map(table => { const answer = table.linhas[answers[table.id] - 1]; return `${table.titulo} ${answer}${/[.!?]$/.test(answer) ? '' : '.'}`; }).join('\n');
  }

  function lifepathTexts(doc) {
    const lp = doc.lifepath || {};
    const texts = {};
    for (const [key, , field] of lifepathFields) texts[field] = lp[key] ? lpText(key, lp[key]) : '';
    if (lp.origem && doc.lingua) texts.culturalOrigin += ` Língua: ${C.languages[doc.lingua] || doc.lingua}.`;
    texts.friends = (lp.amigos || []).map(value => lpText('amigo', value)).join(' | ');
    texts.enemies = (lp.inimigos || []).map(enemyText).join(' | ');
    texts.tragicLoveAffairs = (lp.amores || []).map(value => lpText('amor', value)).join(' | ');
    // Vai para o campo Role Lifepath do Foundry: as respostas das tabelas da Role e, depois, as notas do jogador.
    texts.roleLifepath = [roleLpText(doc), lp.roleLifepath || ''].filter(Boolean).join('\n\n');
    return texts;
  }

  // ---------------- Moradia ----------------
  // Moradia, estilo de vida, Trauma Team e moda. O padrão da Role tem o primeiro mês de graça; o que for melhor
  // paga a diferença do primeiro mês (o que for pior não devolve). Opção que não serve para a Role volta ao padrão.
  // Personagens antigos guardavam moradia 'padrao' ou 'familia' (Nomad com o clã).
  const allowedFor = (option, role) => !option.roles || option.roles.includes(role);
  const housingBase = doc => C.housing.padrao[doc.role] || C.housing.padrao.geral;
  function housing(doc) {
    const H = C.housing;
    const base = housingBase(doc);
    const pick = (list, id, fallback) => list.find(item => item.id === id && allowedFor(item, doc.role)) || list.find(item => item.id === fallback);
    const home = pick(H.moradias, { padrao: '', familia: 'cla' }[doc.moradia] ?? doc.moradia, base.moradia);
    const life = pick(H.estilos, doc.estiloVida || (doc.moradia === 'familia' ? 'cla' : ''), base.estilo);
    const trauma = pick(H.traumaTeam, doc.traumaTeam, 'nenhum');
    const fashion = H.modas.find(item => item.id === (doc.estiloModa || '')) || H.modas[0];
    const baseHome = H.moradias.find(item => item.id === base.moradia);
    const baseLife = H.estilos.find(item => item.id === base.estilo);
    return {
      tipo: home.id, moradia: home.nome, aluguel: home.aluguel, estiloId: life.id, estilo: life.nome, custoEstilo: life.custo,
      traumaTeam: trauma.custo ? { id: trauma.id, nome: trauma.nome, custo: trauma.custo } : null,
      moda: fashion.id ? { id: fashion.id, nome: fashion.nome, desc: fashion.desc } : null,
      mensal: home.aluguel + life.custo + trauma.custo,
      primeiroMes: Math.max(0, home.aluguel - baseHome.aluguel) + Math.max(0, life.custo - baseLife.custo) + trauma.custo
    };
  }

  // ---------------- Sub-habilidades da Role ----------------
  // doc.habilidades: { nome no Foundry: pontos }. Só Solo, Tech e Medtech têm (C.roleAbilities).
  const abilitySpec = doc => C.roleAbilities[doc.role] || null;
  const abilityPoints = doc => { const spec = abilitySpec(doc); return spec ? spec.itens.reduce((sum, item) => sum + (Number((doc.habilidades || {})[item.id]) || 0), 0) : 0; };
  // Os Ranks que vão para o item de Role do Foundry, com as derivadas (perícias Cirurgia e Tecnologia Médica do Medtech).
  function roleAbilityRanks(doc) {
    const spec = abilitySpec(doc);
    if (!spec) return [];
    const ranks = spec.itens.map(item => ({ nome: item.id, rank: Math.min(spec.max, Math.max(0, Number((doc.habilidades || {})[item.id]) || 0)) }));
    const byName = Object.fromEntries(ranks.map(entry => [entry.nome, entry.rank]));
    for (const derived of spec.derivadas || []) {
      const value = Object.entries(derived.de).reduce((sum, [name, factor]) => sum + (byName[name] || 0) * factor, 0);
      ranks.push({ nome: derived.id, rank: derived.max ? Math.min(derived.max, value) : value });
    }
    return ranks;
  }

  // ---------------- Oficina da Família (Nomad) ----------------
  // doc.oficina: as escolhas na ordem, 'v:<veículo>' ou 'u:<número da escolha do veículo>:<upgrade>'.
  // Cada escolha só vale se fizer sentido com as de antes; a que deixou de valer vira pendência.
  const MP = () => C.nomadMotorpool;
  const vehicleById = id => MP().veiculos.find(vehicle => vehicle.id === id);
  const upgradeById = id => MP().upgrades.find(upgrade => upgrade.id === id);
  function upgradeFits(upgrade, vehicle, installed) {
    const classes = vehicle.classe;
    if (upgrade.so && !upgrade.so.some(cls => classes.includes(cls))) return false;
    if (upgrade.exceto && upgrade.exceto.some(cls => classes.includes(cls))) return false;
    if (upgrade.vezes && installed.filter(id => id === upgrade.id).length >= upgrade.vezes) return false;
    return !upgrade.requer || installed.includes(upgrade.requer);
  }
  function motorpool(doc) {
    const vehicles = [];
    const valid = (doc.oficina || []).slice(0, MP().escolhas).map((value, index) => {
      const [kind, first, second] = String(value || '').split(':');
      if (kind === 'v' && vehicleById(first) && !vehicles.some(entry => entry.veiculo.id === first)) { vehicles.push({ escolha: index, veiculo: vehicleById(first), upgrades: [] }); return true; }
      const target = kind === 'u' && vehicles.find(entry => entry.escolha === Number(first));
      const upgrade = upgradeById(second);
      if (target && upgrade && upgradeFits(upgrade, target.veiculo, target.upgrades.map(entry => entry.upgrade.id))) { target.upgrades.push({ escolha: index, upgrade }); return true; }
      return false;
    });
    return { veiculos: vehicles, validas: valid, feitas: valid.filter(Boolean).length };
  }
  // O que dá para escolher na linha `index`, a partir das escolhas válidas de antes.
  function motorpoolChoices(doc, index) {
    const before = motorpool({ oficina: (doc.oficina || []).slice(0, index) });
    const options = MP().veiculos.filter(vehicle => !before.veiculos.some(entry => entry.veiculo.id === vehicle.id)).map(vehicle => ({ value: `v:${vehicle.id}`, label: `Veículo: ${vehicle.nome}` }));
    for (const target of before.veiculos) {
      const installed = target.upgrades.map(entry => entry.upgrade.id);
      for (const upgrade of MP().upgrades) {
        if (upgradeFits(upgrade, target.veiculo, installed)) options.push({ value: `u:${target.escolha}:${upgrade.id}`, label: `Upgrade no ${target.veiculo.nome}: ${upgrade.nome}` });
      }
    }
    return options;
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
    const spec = abilitySpec(doc);
    if (spec && abilityPoints(doc) !== spec.pontos) add(1, `${spec.titulo}: distribua ${spec.pontos} pontos (agora: ${abilityPoints(doc)}).`);
    if (doc.role === 'nomad') {
      const pool = motorpool(doc);
      if (pool.feitas < MP().escolhas) add(1, `Oficina da Família: falta${MP().escolhas - pool.feitas > 1 ? 'm' : ''} ${MP().escolhas - pool.feitas} escolha${MP().escolhas - pool.feitas > 1 ? 's' : ''} (veículos ou upgrades).`);
    }
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
    const missingRole = roleLpMissing(doc).length;
    if (missingRole) add(4, `Lifepath da Role: falta${missingRole > 1 ? 'm' : ''} ${missingRole} pergunta${missingRole > 1 ? 's' : ''}.`);
    const netPack = C.packages[(roleById(doc.role) || {}).tabelas];
    if (['ratoderua', 'edgerunner'].includes(doc.metodo) && uses2077Kit(doc, netPack)) {
      const left = netPack.kit2077.escolher - chosenQuickhacks(doc, netPack).length;
      if (left > 0) add(5, `Escolha mais ${left} quickhack${left > 1 ? 's' : ''} do kit do suplemento de fã.`);
    }
    const cash = money(doc);
    if (doc.metodo && cash.saldo < 0) add(5, `Gastou ${eb(-cash.saldo)} a mais do que tinha.`);
    for (const entry of missingFoundations(doc)) add(5, `${entry.item.nome} precisa de ${{ neuralWare: 'Neural Link', cyberEye: 'um cyberolho', cyberAudioSuite: 'Cyberaudio Suite', cyberArm: 'um cyberbraço', cyberLeg: 'uma cyberperna', borgware: 'uma base de borgware' }[entry.item.cyber.tipo]}.`);
    const hum = humanity(doc, stats);
    const psychosis = doc.metodo ? cyberpsychosis(hum) : '';
    if (psychosis) add(5, psychosis);
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
      role: role.id ? { id: role.id, nome: role.nome, rank: 4, foundry: role.foundry, especializacao: spec ? { nome: spec.nome, pericias: spec.pericias } : null, habilidades: roleAbilityRanks(doc) } : null,
      pericias: finalSkills(doc), casa: doc.casa,
      // renomear: só quando o item tem outro nome em 2077 (o plug de interface vira Personal Link).
      // A montagem vai junto: uso (equipado, carregando, guardado), a munição da arma e onde cada item fica (uid do pai).
      itens: assembly(doc).rows.map(row => ({ uid: row.uid, id: row.id, nome: row.item.nome, renomear: row.nome || '', qtd: row.qtd, origem: row.origem, foundry: row.item.foundry, cyber: Boolean(row.item.cyber), semHumanidade: row.origem === 'gratis2077',
        uso: row.uso, municao: row.municao === '-' ? '' : row.municao, em: row.em === '-' ? '' : row.em })),
      // Veículos da família do Nomad, com os upgrades de cada um (instalados no Foundry).
      veiculos: doc.role === 'nomad' ? motorpool(doc).veiculos.map(entry => ({
        uid: `familia:${entry.escolha}`, nome: entry.veiculo.nome, familia: true, foundry: { pack: 'cyberpunk-red-core.core_vehicles', nome: entry.veiculo.id },
        upgrades: entry.upgrades.map(item => ({ uid: `familia:${item.escolha}`, nome: item.upgrade.nome, foundry: { pack: 'cyberpunk-red-core.core_upgrades', nome: item.upgrade.id } }))
      })) : [],
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
  // A campanha escolhida no menu da wiki (o mestre troca no seletor; o jogador, se joga em mais de uma).
  // A visão dos jogadores sem código (ou sem servidor) tem uma campanha de mentira (real: false): aí não filtra.
  const activeCampaign = () => {
    const campaign = window.wikiApp && window.wikiApp.activeCampaign ? window.wikiApp.activeCampaign() : null;
    return campaign && campaign.real !== false ? campaign : null;
  };
  const campaignQuery = (id = (activeCampaign() || {}).id) => (id ? `?campanha=${encodeURIComponent(id)}` : '');

  // ---------------- Visual comum ----------------
  let esc = text => String(text);
  const box = (title, body, extra = '') => `<div class="section cc-box"${extra}><h3>${title}</h3>${body}</div>`;
  const roleName = id => (roleById(id) || {}).nome || 'sem Role';
  const offline = '<div class="callout">Os personagens ficam no servidor da wiki. Abra a wiki pelo endereço do servidor (não pelo arquivo).</div>';

  // ---------------- Ajuda de cada passo ----------------
  const STAT_MEANING = { INT: 'Raciocínio, conhecimento e atenção.', REF: 'Reflexos: mira com armas de fogo e direção.', DEX: 'Coordenação: corpo a corpo, esquiva e atletismo.', TECH: 'Habilidade técnica e medicina.', COOL: 'Compostura e presença social.', WILL: 'Força de vontade e resistência.', LUCK: 'Pontos de sorte para gastar a cada sessão.', MOVE: 'Deslocamento: MOVE × 2 m por turno.', BODY: 'Constituição e força: HP e Death Save.', EMP: 'Empatia: define a Humanidade.' };
  const HELP = {
    1: ['RED p. 72–73 · anos 2070: Mission Kit p. 26', `<p><b>Role</b> é o que o personagem faz em Night City. Cada uma tem uma habilidade especial, que começa no Rank 4. <b>Método</b> é o quanto você quer decidir:</p>
      <ul><li><b>Rato de Rua:</b> 1 dado para os STATs; perícias e equipamento vêm prontos. O mais rápido.</li><li><b>Edgerunner:</b> 1 dado para cada STAT, 86 pontos nas 20 perícias da Role e as opções do pacote da Role.</li><li><b>Pacote Completo:</b> você distribui 62 pontos de STAT e 86 de perícia, e compra o equipamento com 2.550eb.</li></ul>`],
    2: ['RED p. 72–80', `<p>STATs são os atributos. Num teste, você soma <b>STAT + perícia + 1d10</b>.</p><dl class="cc-help-stats">${Object.entries(STAT_MEANING).map(([stat, text]) => `<dt>${stat}</dt><dd>${text}</dd>`).join('')}</dl><p>HP, Gravemente Ferido, Death Save e Humanidade saem dos STATs: veja Valores derivados, logo abaixo.</p>`],
    3: ['RED p. 81–90', `<p>Num teste: <b>STAT + perícia + 1d10</b> contra uma dificuldade (DV). A coluna Base já soma a STAT.</p>
      <ul><li>As 13 <b>básicas</b> (em negrito) todo personagem tem, no nível 2 pelo menos.</li><li>Perícias <b>×2</b> custam 2 pontos por nível.</li><li>Na criação, o nível máximo é 6.</li><li>A <b>língua da origem</b> vem de graça, no nível 4.</li></ul>
      <p>Não sabe por onde começar? <b>Distribuir sugerido</b> põe os níveis do Rato de Rua da sua Role, e você ajusta a partir deles.</p>`],
    4: ['RED p. 45–53', '<p>O Lifepath conta de onde o personagem veio: origem, família, amigos, inimigos e amores. Role ou escolha cada item.</p><p>Os resultados são ganchos para o mestre usar em jogo. Nenhum deles obriga nada.</p>'],
    5: ['RED p. 98–117 · cyberware grátis: suplemento p. 8', `<ul><li><b>Rato de Rua e Edgerunner:</b> o pacote da Role, escolhendo nas linhas com opções, e mais 500eb.</li><li><b>Pacote Completo:</b> 2.550eb para a loja e mais 800eb só para moda. A loja de criação mostra só itens iniciais.</li>
      <li><b>Cyberware custa Humanidade:</b> a cada 10 pontos perdidos, a EMP cai 1. As opções precisam de uma base, como o cyberbraço para as armas de braço.</li></ul>`],
    6: ['RED p. 223 e 377–378 · suplemento p. 7–8 e 31', `<p>Onde o personagem mora, como vive e se tem Trauma Team. No dia 1º de cada mês, o aluguel, o estilo de vida e o Trauma Team saem do dinheiro.</p>
      <ul><li>O <b>padrão</b> da sua Role tem o primeiro mês de graça.</li><li>Escolher algo <b>melhor</b> paga a diferença do primeiro mês com o dinheiro inicial. Escolher pior não devolve nada.</li><li>O <b>Trauma Team</b> paga o primeiro mês inteiro.</li><li>Quem não paga o estilo de vida tem uma semana; depois, Death Save no começo de cada dia sem pagar.</li></ul>`],
    7: ['', '<p>Cada pendência leva ao passo certo. Nada impede de salvar nem de enviar. Quando estiver pronto, <b>envie para o mestre</b>: o Foundry dele avisa, e ele importa.</p>']
  };

  // ---------------- Resumo fixo ----------------
  function summaryHtml(doc) {
    const stats = computeStats(doc);
    const derived = C.derived(stats);
    const hum = humanity(doc, stats);
    const cash = money(doc);
    const used = skillPointsUsed(doc);
    const issues = pending(doc).length;
    const points = statPoints(stats);
    const value = (text, bad) => `<dd${bad ? ' class="cc-bad"' : ''}>${text}</dd>`;
    const rows = doc.metodo ? [
      ['STATs', doc.metodo === 'pacote' ? value(`${points} de ${C.completePackage.pontosStat}`, points !== C.completePackage.pontosStat) : value(points ? `${points} pontos` : 'a rolar', !points)],
      ['Perícias', used === null ? value('prontas') : value(`${used} de ${skillBudget(doc)}`, used !== skillBudget(doc))],
      ['HP', value(points ? derived.hp : '—')],
      ['Humanidade', value(points ? `${hum.atual}/${hum.max}` : '—')],
      ['EMP', value(points ? hum.emp : '—', points && hum.emp !== stats.EMP)],
      ['Dinheiro', value(eb(cash.saldo), cash.saldo < 0)],
      ...(doc.metodo === 'pacote' ? [['Moda', value(`${eb(Math.max(0, cash.moda - cash.usadoModa))} sobrando`)]] : []),
      ...(doc.role ? [['Por mês', value(eb(housing(doc).mensal))]] : [])
    ] : [];
    const title = `${esc(doc.nome || 'Sem nome')}${doc.apelido ? ` "${esc(doc.apelido)}"` : ''}`;
    const short = doc.metodo ? `HP ${points ? derived.hp : '—'} · ${eb(cash.saldo)} · ${issues ? `${issues} pendência${issues > 1 ? 's' : ''}` : 'tudo certo'}` : 'escolha Role e método';
    return `<summary><b>${title}</b> <small>${short}</small></summary>
      <p class="cc-summary-role">${esc(roleName(doc.role))}${doc.metodo ? ` · ${esc((methodById(doc.metodo) || {}).nome || '')}` : ''}</p>
      ${rows.length ? `<dl>${rows.map(([label, dd]) => `<dt>${label}</dt>${dd}`).join('')}</dl>` : ''}
      <p>${issues ? `<button type="button" class="cc-link" data-step="7">${issues} pendência${issues > 1 ? 's' : ''}</button>` : '<span class="cc-ok">Sem pendências</span>'}</p>`;
  }

  // ---------------- Levar para o Foundry ----------------
  // O servidor diz em que pé está (estadoFoundry): novo · enviado · enviado-mudou · importado · mudou · avisado.
  // "Enviar para o mestre" faz o Foundry dele avisar; quem importa é sempre o mestre.
  const when = iso => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const FOUNDRY_BADGES = { enviado: 'esperando o mestre', 'enviado-mudou': 'enviado, mudou depois', importado: 'no Foundry', mudou: 'mudou depois de importar', avisado: 'esperando o mestre atualizar', 'outra-mesa': 'veio de outra campanha: falta trazer para o Foundry desta' };
  const WAITING = ['enviado', 'enviado-mudou', 'avisado', 'outra-mesa'];
  const foundryBadge = item => (FOUNDRY_BADGES[item.estadoFoundry] ? ` · <b class="${item.estadoFoundry === 'importado' ? 'cc-ok' : 'cc-wait'}">${FOUNDRY_BADGES[item.estadoFoundry]}</b>` : '');
  const GM_FOUNDRY_HELP = '<p class="note-status"><b>Mestre:</b> no Foundry, aba Atores → <b>Importar da wiki</b>. Para um ator que já veio da wiki, <b>Atualizar da wiki</b> no topo da ficha dele. Com o módulo atualizado (<code>atualizar-modulo.bat</code>), o Foundry avisa sozinho quando alguém envia.</p>';
  function foundryBox(doc, papel) {
    const state = doc.estadoFoundry || 'novo';
    const sent = doc.envio ? when(doc.envio.quando) : '';
    const since = doc.foundry ? new Date(doc.foundry.importado).toLocaleDateString('pt-BR') : '';
    const actor = doc.foundry && doc.foundry.nomeAtor ? ` (ator <b>${esc(doc.foundry.nomeAtor)}</b>)` : '';
    const button = label => `<p><button class="action" type="button" data-cc-send>${label}</button></p>`;
    const issues = pending(doc).length;
    const text = {
      novo: `<p>Ainda não foi enviado ao mestre. Quando estiver pronto, envie: o Foundry do mestre avisa, e ele importa com um clique. Dá para continuar mudando depois.</p>${issues ? `<p class="note-status">Ainda há ${issues} pendência${issues > 1 ? 's' : ''}. Dá para enviar assim mesmo, se o mestre combinou.</p>` : ''}${button('Enviar para o mestre')}`,
      enviado: `<p class="cc-wait">Enviado em ${sent}. Esperando o mestre importar no Foundry.</p>${button('Avisar o mestre de novo')}`,
      'enviado-mudou': `<p class="cc-wait">Enviado em ${sent}, mas mudou depois disso.</p><p class="note-status">O mestre importa o que estiver aqui na hora. Envie de novo para ele saber que mudou.</p>${button('Enviar de novo')}`,
      importado: `<p class="cc-ok">No Foundry desde ${since}${actor}.</p><p class="note-status">Se mudar algo aqui, este quadro mostra um botão para avisar o mestre, que atualiza a ficha no Foundry.</p>`,
      mudou: `<p class="cc-wait">No Foundry desde ${since}${actor}, mas mudou na wiki depois disso.</p>${button('Avisar o mestre de novo')}`,
      avisado: `<p class="cc-wait">Mudou depois da importação. O mestre foi avisado em ${sent} e ainda não atualizou.</p>${button('Avisar o mestre de novo')}`,
      'outra-mesa': `<p class="cc-wait">Este personagem veio de outra campanha. A ficha dele está no Foundry da mesa antiga${actor}; o mestre traz para o Foundry desta campanha.</p>`
    }[state] || '';
    return box('Levar para o Foundry', `${text}<p class="cc-msg" data-cc-send-msg role="status"></p>${papel === 'mestre' ? GM_FOUNDRY_HELP : ''}`, ' data-cc-foundry');
  }
  // Envia e redesenha o quadro. `before` salva o que estiver pendente (no criador).
  async function sendToGm(doc, papel, scope, before) {
    const holder = scope.querySelector('[data-cc-foundry]');
    const button = holder && holder.querySelector('[data-cc-send]');
    if (button) { button.disabled = true; button.textContent = 'Enviando…'; }
    if (before) await before();
    const answer = await api(`api/personagens/${doc.id}/enviar`, { method: 'POST', body: {} });
    if (answer.status !== 200) {
      const current = scope.querySelector('[data-cc-foundry]');
      const again = current && current.querySelector('[data-cc-send]');
      if (again) { again.disabled = false; again.textContent = 'Tentar de novo'; }
      const msg = current && current.querySelector('[data-cc-send-msg]');
      if (msg) msg.textContent = answer.data.erro || 'Não consegui enviar.';
      return;
    }
    doc.envio = answer.data.envio;
    doc.estadoFoundry = answer.data.estadoFoundry;
    const fresh = scope.querySelector('[data-cc-foundry]');
    if (fresh) fresh.outerHTML = foundryBox(doc, papel);
  }

  // ---------------- Retrato ----------------
  // A imagem enviada (servida pela API da wiki) vale no lugar do link colado.
  const portraitUrl = doc => doc.retrato || (/^https:\/\//.test(doc.retratoLink || '') ? doc.retratoLink : '');
  const portraitImg = (url, cls, alt = '') => (url ? `<img class="${cls}" src="${esc(url)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer">` : '');
  // Reduz para no máximo 512 px no maior lado, em WebP (ou JPEG, se o navegador não gerar WebP).
  async function shrinkImage(file, max = 512) {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Não consegui ler esta imagem.')); img.src = url; });
      const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL('image/webp', 0.85);
      return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Cada abertura de página ganha uma ficha; resposta que chega atrasada de uma página antiga é ignorada.
  let renderToken = 0;

  // ================= Página: Personagens =================
  async function setupList(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const campaign = activeCampaign();
    const [me, list] = await Promise.all([identity(), api(`api/personagens${campaignQuery()}`)]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const papel = me.data.papel;
    // As campanhas desta pessoa (o mestre: todas). Mover só aparece com mais de uma.
    const campaignsOfMe = me.data.campanhas || [];
    const characters = list.data.personagens || [];
    const mine = characters.filter(item => !item.publico);
    const others = characters.filter(item => item.publico);
    // O jogador escolhe com qual personagem está (o retrato no botão da conta, a Ficha e a Loja abrem nele).
    const inUse = papel === 'jogador' && window.playerAccount ? window.playerAccount.selected() : null;
    const card = item => `<div class="cc-card${item.id === inUse ? ' cc-selected' : ''}" data-cc-card="${item.id}">${portraitImg(item.retrato, 'cc-thumb')}<div class="cc-card-text"><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.metodo ? ` · ${esc((methodById(item.metodo) || {}).nome || '')}` : ''}${papel === 'mestre' && item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}${foundryBadge(item)}${item.mesa && item.mesa.hp ? ` · <b class="${item.mesa.hp.atual < item.mesa.hp.max ? 'cc-bad' : 'cc-ok'}">HP ${item.mesa.hp.atual}/${item.mesa.hp.max} na mesa</b>` : ''}${item.pedidos && item.pedidos.pendentes ? ' · <b class="cc-wait">pedido esperando o mestre</b>' : ''}${item.temAnotacoes ? ' · anotações' : ''}</small></div>
      <div class="cc-card-actions">${papel === 'jogador' ? `<span class="cc-in-use">Em uso</span><button class="action cc-use" type="button" data-cc-select="${item.id}">Usar</button>` : ''}<button class="action" type="button" data-cc-open="ficha" data-id="${item.id}">Ficha</button><button class="action" type="button" data-cc-open="criador" data-id="${item.id}">Editar</button><button class="action" type="button" data-cc-open="loja" data-id="${item.id}">Loja</button>${papel === 'mestre' && campaignsOfMe.length > 1 ? `<button class="action" type="button" data-cc-move="${item.id}">Mover</button>` : ''}<button class="action cc-danger" type="button" data-cc-delete="${item.id}">Apagar</button></div></div>`;
    const publicCard = item => `<div class="cc-card">${portraitImg(item.retrato, 'cc-thumb')}<div class="cc-card-text"><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}</small></div></div>`;

    let who = '';
    const campaignName = campaign ? esc(campaign.name) : '';
    if (papel === 'mestre') who = `<p>Você é o <b>mestre</b>: vê e edita todos os personagens.${campaign && campaignsOfMe.length > 1 ? ` Esta lista é de <b>${campaignName}</b>; troque de campanha no menu.` : ''}</p>`;
    else if (papel === 'jogador') who = campaignsOfMe.length ? '' : '<p>Você ainda não está em nenhuma campanha. Fale com o mestre.</p>';
    else who = `<p>Para criar ou editar o seu personagem, entre com o código que o mestre te passou. Este aparelho lembra dele.</p><form class="cc-login" data-cc-login><input id="cc-code" autocomplete="off" placeholder="NC-XXXX-XXXX" aria-label="Código do jogador"><button class="action" type="submit">Entrar</button></form><p class="cc-msg" id="cc-login-msg"></p>`;

    const canCreate = papel === 'mestre' || (papel === 'jogador' && campaignsOfMe.length > 0);
    const waiting = papel === 'mestre' ? mine.filter(item => WAITING.includes(item.estadoFoundry)) : [];
    const waitingBox = waiting.length ? box('Esperando você no Foundry', `<ul>${waiting.map(item => `<li><b>${esc(item.nome || 'Sem nome')}</b>${item.donoNome ? ` (de ${esc(item.donoNome)})` : ''}: ${item.estadoFoundry === 'outra-mesa' ? 'veio de outra campanha, trazer para o Foundry desta.' : `${item.estadoFoundry === 'avisado' ? 'mudou, atualizar' : 'importar'}. Enviado em ${when(item.envio && item.envio.quando)}.`}</li>`).join('')}</ul>${GM_FOUNDRY_HELP}`, ' data-cc-waiting') : '';
    // Pedidos da campanha esperando o mestre (aprova na Loja do personagem) ou o Foundry (entrega quando o mundo abrir).
    const withOrders = mine.filter(item => item.pedidos && (item.pedidos.pendentes || item.pedidos.aprovados));
    const ordersBox = papel === 'mestre' && withOrders.length ? box('Pedidos da campanha', `<ul>${withOrders.map(item => `<li><b>${esc(item.nome || 'Sem nome')}</b>${item.donoNome ? ` (de ${esc(item.donoNome)})` : ''}: ${[item.pedidos.pendentes ? `${item.pedidos.pendentes} esperando você` : '', item.pedidos.aprovados ? `${item.pedidos.aprovados} aprovado${item.pedidos.aprovados > 1 ? 's' : ''}, esperando o Foundry entregar` : ''].filter(Boolean).join(' · ')} <button class="action" type="button" data-cc-open="loja" data-id="${item.id}">Abrir</button></li>`).join('')}</ul><p class="note-status">Aprove ou recuse na Loja do personagem (ou na janela Personagens da wiki, no Foundry). O Foundry entrega o que foi aprovado assim que o mundo estiver aberto.</p>`, ' data-cc-orders-gm') : '';
    // Para o mestre preparar a sessão: as anotações que os jogadores escreveram nas fichas, as mais novas primeiro.
    const withNotes = papel === 'mestre' ? mine.filter(item => item.temAnotacoes).sort((x, y) => String(y.anotacoesEm || '').localeCompare(String(x.anotacoesEm || ''))) : [];
    const notesBoxGm = withNotes.length ? box('Anotações dos jogadores', `<ul class="cc-notes-list">${withNotes.map(item => `<li><b>${esc(item.nome || 'Sem nome')}</b><small class="note-status">${item.donoNome ? `de ${esc(item.donoNome)} · ` : ''}${when(item.anotacoesEm)}</small><span>${esc(item.anotacoesTrecho)}${item.anotacoesTrecho.length >= 220 ? '…' : ''}</span><button class="action" type="button" data-cc-open="ficha" data-id="${item.id}">Abrir a ficha</button></li>`).join('')}</ul>`, ' data-cc-notes-gm') : '';
    root.innerHTML = `${waitingBox}${ordersBox}${notesBoxGm}${who ? box(papel === 'jogador' ? 'Sem campanha' : 'Quem é você', who) : ''}
      ${canCreate ? box(papel === 'mestre' ? (campaign && campaignsOfMe.length > 1 ? `Personagens de ${campaignName}` : 'Todos os personagens') : 'Meus personagens', `${mine.length ? mine.map(card).join('') : '<p class="note-status">Nenhum personagem ainda.</p>'}<p><button class="action" type="button" data-cc-new>Novo personagem</button></p>`) : ''}
      ${others.length ? box('O grupo', others.map(publicCard).join('')) : ''}
      ${papel === 'mestre' ? box(campaign && campaignsOfMe.length > 1 ? `Códigos dos jogadores de ${campaignName}` : 'Códigos dos jogadores', '<div id="cc-accounts">Carregando…</div>') : ''}`;
    if (papel === 'mestre') renderAccounts(root.querySelector('#cc-accounts'), campaign, campaignsOfMe);

    root.onclick = async event => {
      const open = event.target.closest('[data-cc-open]');
      if (open) return helpers.openPage(open.dataset.ccOpen, { section: open.dataset.id });
      const use = event.target.closest('[data-cc-select]');
      if (use && window.playerAccount) return window.playerAccount.select(use.dataset.ccSelect);
      if (event.target.closest('[data-cc-new]')) {
        const created = await api('api/personagens', { method: 'POST', body: { ...blank(), ...(campaign ? { campanha: campaign.id } : {}) } });
        if (created.status === 201) {
          if (papel === 'jogador' && window.playerAccount) { await window.playerAccount.refresh(); window.playerAccount.select(created.data.personagem.id); }
          return helpers.openPage('criador', { section: created.data.personagem.id });
        }
        return wikiPopup.toast(created.data.erro || 'Não consegui criar o personagem.', { tone: 'bad' });
      }
      // Crossover: o mestre leva o personagem para outra campanha (o dono passa a jogar nela também).
      const move = event.target.closest('[data-cc-move]');
      if (move) {
        const item = characters.find(entry => entry.id === move.dataset.ccMove) || {};
        const options = campaignsOfMe.filter(entry => entry.id !== item.campanha).map(entry => ({ value: entry.id, label: entry.nome }));
        const imported = item.foundry && item.foundry.importado;
        const target = await wikiPopup.choose({ title: 'Mover para outra campanha', label: 'Campanha', options, ok: 'Mover',
          html: `<p>Levar <b>${esc(item.nome || 'Sem nome')}</b> para outra campanha. Ele sai desta lista e passa a aparecer só para os jogadores da campanha nova.</p>${item.donoNome ? `<p class="note-status">${esc(item.donoNome)} passa a jogar na campanha nova também (sem sair desta).</p>` : ''}${imported ? '<p class="note-status">No Foundry, o ator continua no mundo desta campanha. No mundo da campanha nova, <b>Importar da wiki</b> traz a ficha como ela está (veja o aviso lá).</p>' : ''}` });
        if (!target) return;
        const answer = await api(`api/personagens/${item.id}/campanha`, { method: 'POST', body: { campanha: target } });
        if (answer.status !== 200) return wikiPopup.toast(answer.data.erro || 'Não consegui mover.', { tone: 'bad' });
        const destination = (options.find(option => option.value === target) || {}).label || target;
        wikiPopup.toast(`${item.nome || 'Personagem'} agora é de ${destination}.${answer.data.donoEntrou ? ` ${answer.data.donoEntrou} entrou nessa campanha.` : ''}`, { tone: 'ok', ms: 6000 });
        return helpers.openPage('personagens', undefined, 'replace');
      }
      const remove = event.target.closest('[data-cc-delete]');
      if (remove) {
        const item = characters.find(entry => entry.id === remove.dataset.ccDelete) || {};
        const sure = await wikiPopup.confirm({ title: 'Apagar personagem', html: `<p>Apagar <b>${esc(item.nome || 'Sem nome')}</b>? Sai da lista de personagens.</p><p class="note-status">O mestre ainda consegue recuperar o arquivo.</p>`, ok: 'Apagar', danger: true });
        if (!sure) return;
        const answer = await api(`api/personagens/${remove.dataset.ccDelete}`, { method: 'DELETE' });
        if (answer.status !== 200) return wikiPopup.toast(answer.data.erro || 'Não consegui apagar.', { tone: 'bad' });
        wikiPopup.toast(item.nome ? `Personagem ${item.nome} apagado.` : 'Personagem apagado.', { tone: 'ok' });
        if (window.playerAccount) await window.playerAccount.refresh();
        return helpers.openPage('personagens', undefined, 'replace');
      }
    };
    root.onsubmit = async event => {
      if (!event.target.closest('[data-cc-login]')) return;
      event.preventDefault();
      const code = root.querySelector('#cc-code').value.trim();
      const answer = await api('api/entrar', { method: 'POST', body: { codigo: code } });
      // Recarrega: o menu passa a ter as campanhas do jogador (e o que foi publicado nelas).
      if (answer.status === 200) return location.reload();
      root.querySelector('#cc-login-msg').textContent = answer.data.erro || 'Não deu certo.';
    };
  }

  // Quadro do mestre: criar, copiar e revogar códigos. Com mais de uma campanha, mostra os jogadores da campanha
  // escolhida no menu: o código novo já entra nela, e um jogador de outra campanha pode entrar nesta também.
  async function renderAccounts(target, campaign = null, campaignList = []) {
    const answer = await api('api/contas');
    const all = answer.data.contas || [];
    const several = Boolean(campaign) && campaignList.length > 1;
    const accounts = several ? all.filter(account => (account.campanhas || []).includes(campaign.id)) : all;
    const outside = several ? all.filter(account => !(account.campanhas || []).includes(campaign.id)) : [];
    const nameOf = id => (campaignList.find(entry => entry.id === id) || {}).nome || id;
    const elsewhere = account => (account.campanhas || []).filter(id => id !== (campaign && campaign.id));
    target.innerHTML = `${accounts.length ? `<div class="table-wrap dense"><table><thead><tr><th>Jogador</th><th>Código</th>${several ? '<th>Também joga em</th>' : ''}<th>Último acesso</th><th></th></tr></thead><tbody>${accounts.map(account => `<tr><td>${esc(account.nome)}</td><td><code>${esc(account.codigo)}</code></td>${several ? `<td>${esc(elsewhere(account).map(nameOf).join(', ') || '—')}</td>` : ''}<td>${account.ultimoAcesso ? `${when(account.ultimoAcesso)}<br><small class="note-status" title="${esc((account.aparelhos || []).join(', '))}">${(account.aparelhos || []).length} aparelho${(account.aparelhos || []).length === 1 ? '' : 's'}</small>` : '<small class="note-status">ainda não entrou</small>'}</td><td><button class="action" type="button" data-cc-copy="${esc(account.codigo)}">Copiar</button> ${(account.aparelhos || []).length ? `<button class="action" type="button" data-cc-disconnect="${account.id}">Desconectar</button> ` : ''}<button class="action" type="button" data-cc-newcode="${account.id}">Novo código</button> ${several && elsewhere(account).length ? `<button class="action cc-danger" type="button" data-cc-leave="${account.id}">Tirar desta campanha</button>` : `<button class="action cc-danger" type="button" data-cc-revoke="${account.id}">Revogar</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note-status">Nenhum código ainda.</p>'}
      <form class="cc-login" data-cc-account><input id="cc-account-name" placeholder="Nome do jogador" aria-label="Nome do jogador"><button class="action" type="submit">Criar código</button></form>
      ${outside.length ? `<form class="cc-login" data-cc-join><select id="cc-join" aria-label="Jogador de outra campanha">${outside.map(account => `<option value="${account.id}">${esc(account.nome)} (${esc(account.campanhas.map(nameOf).join(', '))})</option>`).join('')}</select><button class="action" type="submit">Adicionar jogador de outra campanha</button></form>` : ''}
      <p class="note-status">Passe o código ao jogador. Ele entra em Campanha → Personagens${several ? ' e vê só as campanhas em que joga; o mesmo código serve para todas' : ''}. Pelo túnel, o link muda a cada sessão; aí ele digita o código de novo.</p>`;
    const setCampaigns = async (account, list) => {
      const saved = await api(`api/contas/${account.id}`, { method: 'PUT', body: { campanhas: list } });
      if (saved.status !== 200) wikiPopup.toast(saved.data.erro || 'Não consegui mudar.', { tone: 'bad' });
      renderAccounts(target, campaign, campaignList);
    };
    target.onclick = async event => {
      // Desconectar: sai de todos os aparelhos (entra de novo com o mesmo código). Novo código: o antigo para de valer.
      const disconnect = event.target.closest('[data-cc-disconnect]');
      const renew = event.target.closest('[data-cc-newcode]');
      if (disconnect || renew) {
        const account = all.find(entry => entry.id === (disconnect || renew).dataset[disconnect ? 'ccDisconnect' : 'ccNewcode']) || {};
        const sure = await wikiPopup.confirm(disconnect
          ? { title: 'Desconectar', html: `<p><b>${esc(account.nome)}</b> sai da wiki em todos os aparelhos. Para voltar, entra de novo com o mesmo código.</p>`, ok: 'Desconectar' }
          : { title: 'Novo código', html: `<p><b>${esc(account.nome)}</b> ganha um código novo, e <code>${esc(account.codigo)}</code> para de valer (todos os aparelhos saem).</p><p class="note-status">Os personagens e as campanhas dele continuam. Passe o código novo a ele.</p>`, ok: 'Trocar o código', danger: true });
        if (!sure) return;
        const answer = await api(`api/contas/${account.id}/${disconnect ? 'desconectar' : 'novo-codigo'}`, { method: 'POST', body: {} });
        if (answer.status !== 200) { wikiPopup.toast(answer.data.erro || 'Não deu certo.', { tone: 'bad' }); return; }
        wikiPopup.toast(disconnect ? `${account.nome} saiu de todos os aparelhos.` : `Código novo de ${account.nome}: ${answer.data.conta.codigo}`, { tone: 'ok', ms: 8000 });
        renderAccounts(target, campaign, campaignList);
        return;
      }
      const leave = event.target.closest('[data-cc-leave]');
      if (leave) {
        const account = accounts.find(entry => entry.id === leave.dataset.ccLeave);
        const sure = await wikiPopup.confirm({ title: 'Tirar desta campanha', html: `<p><b>${esc(account.nome)}</b> deixa de ver ${esc(campaign.name)} (o código continua valendo em ${esc(elsewhere(account).map(nameOf).join(', '))}).</p><p class="note-status">Os personagens dele nesta campanha continuam salvos; ele só perde o acesso a eles.</p>`, ok: 'Tirar', danger: true });
        if (sure) await setCampaigns(account, elsewhere(account));
        return;
      }
      const copy = event.target.closest('[data-cc-copy]');
      if (copy) {
        const account = accounts.find(entry => entry.codigo === copy.dataset.ccCopy) || {};
        try { await navigator.clipboard.writeText(copy.dataset.ccCopy); copy.textContent = 'Copiado'; wikiPopup.toast(`Código de ${account.nome || 'jogador'} copiado.`, { tone: 'ok', ms: 2500 }); }
        catch { wikiPopup.copy({ title: `Código de ${account.nome || 'jogador'}`, message: 'Passe este código ao jogador. Ele entra em Campanha → Personagens.', value: copy.dataset.ccCopy }); }
        return;
      }
      const revoke = event.target.closest('[data-cc-revoke]');
      if (revoke) {
        const account = accounts.find(entry => entry.id === revoke.dataset.ccRevoke) || {};
        const sure = await wikiPopup.confirm({ title: 'Revogar código', html: `<p><b>${esc(account.nome || 'O jogador')}</b> perde o acesso à wiki com o código <code>${esc(account.codigo || '')}</code>.</p><p class="note-status">Os personagens continuam salvos; um código novo devolve o acesso.</p>`, ok: 'Revogar', danger: true });
        if (!sure) return;
        await api(`api/contas/${revoke.dataset.ccRevoke}`, { method: 'DELETE' });
        wikiPopup.toast(`Código de ${account.nome || 'jogador'} revogado.`, { tone: 'ok' });
        renderAccounts(target, campaign, campaignList);
      }
    };
    target.onsubmit = async event => {
      event.preventDefault();
      if (event.target.closest('[data-cc-join]')) {
        const account = outside.find(entry => entry.id === target.querySelector('#cc-join').value);
        if (account) await setCampaigns(account, [...account.campanhas, campaign.id]);
        return;
      }
      const name = target.querySelector('#cc-account-name').value.trim();
      if (!name) return;
      await api('api/contas', { method: 'POST', body: { nome: name, ...(campaign ? { campanhas: [campaign.id] } : {}) } });
      renderAccounts(target, campaign, campaignList);
    };
  }

  // ================= Página: Ficha =================
  // ================= Ficha =================
  // A ficha mostra o mesmo desenho com duas fontes: a criação (antes da importação) ou a mesa (depois, o Foundry manda
  // e o módulo devolve o estado do ator em doc.mesa). sheetModel junta as duas no mesmo formato.
  const SKILL_GROUPS = ['Consciência', 'Corpo', 'Controle', 'Educação', 'Luta', 'Performance', 'Armas à distância', 'Sociais', 'Técnicas'];
  const SPECIAL_GROUP = { Language: 'Educação', Science: 'Educação', 'Martial Arts': 'Luta', 'Play Instrument': 'Performance' };
  const SPECIAL_RE = /^(Language|Science|Martial Arts|Play Instrument) \((.*)\)$/;
  // Nome da perícia na ficha, a partir do nome do Foundry ("Science (Biology)" → "Ciência: biologia").
  function skillLabelOf(doc, name) {
    if (name === 'Local Expert (Your Home)') return doc.casa ? `Especialista Local (${doc.casa})` : skillPt(name);
    if (skillInfo.has(name) && !skillInfo.get(name).especial) return skillPt(name); // Linguagem (Streetslang) é perícia comum
    const special = String(name).match(SPECIAL_RE);
    return special ? specialName(special[1], special[2] === '?' ? '' : special[2]) : skillPt(name);
  }
  const groupOfSkill = name => {
    if (skillInfo.has(name) && skillInfo.get(name).grupo) return skillInfo.get(name).grupo;
    const special = String(name).match(SPECIAL_RE);
    return special ? SPECIAL_GROUP[special[1]] : 'Educação';
  };
  // Ataque: arma de distância com REF, corpo a corpo com DEX (+ o nível da perícia da arma).
  const attackStat = ranged => ranged ? 'REF' : 'DEX';

  function sheetModel(doc) {
    if (doc.mesa && doc.foundry) return tableModel(doc);
    const stats = computeStats(doc);
    const derived = C.derived(stats);
    const hum = humanity(doc, stats);
    const mont = assembly(doc);
    const rows = mont.rows;
    const nameOf = row => row.nome || row.item.nome;
    const skills = finalSkills(doc).filter(skill => skill.nivel > 0);
    const levelOf = name => (skills.find(skill => skill.nome === name) || {}).nivel || 0;
    const penalty = stat => (['REF', 'DEX'].includes(stat) ? mont.penalidade : 0);
    const inside = row => rows.filter(item => item.em === row.uid).map(nameOf);
    const ammoName = uid => { const row = mont.byUid.get(uid); return row ? nameOf(row) : ''; };
    const loose = row => !row.em || row.em === '-';
    return {
      fonte: 'criacao', stats, empMostrada: hum.emp, penalidade: mont.penalidade,
      hp: { atual: derived.hp, max: derived.hp }, gravemente: derived.gravemente, deathSave: derived.deathSave,
      humanidade: { atual: hum.atual, max: hum.max }, sorte: { atual: stats.LUCK || 0, max: stats.LUCK || 0 }, sp: mont.sp,
      andar: derived.andar, correr: derived.correr, dinheiro: Math.max(0, money(doc).saldo), ip: null, reputacao: null, lesoes: [],
      armas: rows.filter(row => row.tipo === 'arma').map(row => {
        const a = row.item.arma;
        const stat = attackStat(a.distancia);
        const loaded = row.municao && row.municao !== '-';
        return { nome: nameOf(row), qtd: row.qtd, pericia: skillPt(a.pericia), base: (stats[stat] || 0) - penalty(stat) + levelOf(a.pericia), stat, dano: a.dano, cdt: a.cdt, maos: a.maos,
          pente: a.distancia && a.pente ? `${loaded ? a.pente : 0}/${a.pente}` : '', municao: loaded ? ammoName(row.municao) : '', dentro: inside(row), uso: row.uso };
      }),
      armaduras: rows.filter(row => row.tipo === 'armadura').map(row => ({ nome: nameOf(row), cabeca: row.item.armadura.cabeca, corpo: row.item.armadura.corpo, escudo: row.item.armadura.escudo, uso: row.uso })),
      pericias: skills.map(skill => ({ label: skill.base ? specialName(skill.base, skill.tipo) : skillLabelOf(doc, skill.nome), grupo: skill.base ? SPECIAL_GROUP[skill.base] : groupOfSkill(skill.nome), stat: skill.stat, nivel: skill.nivel, base: skill.nivel + (stats[skill.stat] || 0) - penalty(skill.stat), origem: skill.gratis })),
      cyber: rows.filter(row => row.tipo === 'cyberBase').map(row => ({ nome: nameOf(row), dentro: inside(row) })),
      noCorpo: rows.filter(row => row.tipo === 'cyberOpcao' && !NEEDS_BASE.includes(row.item.cyber.tipo)).map(nameOf),
      semBase: rows.filter(row => row.tipo === 'cyberOpcao' && NEEDS_BASE.includes(row.item.cyber.tipo) && loose(row)).map(nameOf),
      decks: rows.filter(row => row.tipo === 'deck').map(row => ({ nome: nameOf(row), ativo: row.uso === 'equipado', dentro: inside(row) })),
      outros: rows.filter(row => ['item', 'municao', 'roupa'].includes(row.tipo) || (['acessorio', 'deckItem'].includes(row.tipo) && loose(row)))
        .map(row => ({ nome: nameOf(row), qtd: row.qtd, uso: row.tipo === 'municao' ? '' : row.uso, roupa: row.tipo === 'roupa', origem: row.origem })),
      veiculos: doc.role === 'nomad' ? motorpool(doc).veiculos.map(entry => ({ nome: entry.veiculo.nome, dentro: entry.upgrades.map(item => item.upgrade.nome) })) : [],
      habilidades: (abilitySpec(doc) || { itens: [] }).itens.map(item => [item.nome, Number((doc.habilidades || {})[item.id]) || 0, item.desc])
    };
  }

  // A ficha da mesa: o que o Foundry mandou (nomes e números do Foundry).
  function tableModel(doc) {
    const m = doc.mesa;
    const stats = m.stats || {};
    const level = name => ((m.pericias || []).find(skill => skill.nome === name) || {}).nivel || 0;
    const items = m.itens || [];
    const cyberNames = new Set(items.filter(item => item.tipo === 'cyberware' && item.base).flatMap(item => item.dentro || []));
    const deckNames = new Set(items.filter(item => item.tipo === 'cyberdeck').flatMap(item => item.dentro || []));
    const weaponInside = new Set(items.filter(item => item.tipo === 'weapon').flatMap(item => item.dentro || []));
    const vehicleInside = new Set(items.filter(item => item.tipo === 'vehicle').flatMap(item => item.dentro || []));
    const uso = item => ({ equipped: 'equipado', carried: 'carregando', owned: 'guardado' })[item.uso] || '';
    const spec = abilitySpec(doc);
    const abilityName = name => ((spec && spec.itens.find(item => item.id === name)) || {}).nome || name;
    const body = Number(stats.BODY) || 0;
    const will = Number(stats.WILL) || 0;
    return {
      fonte: 'mesa', quando: m.quando || m.recebido, stats, empMostrada: stats.EMP, penalidade: 0,
      hp: m.hp || { atual: 0, max: 0 }, gravemente: Math.ceil((m.hp?.max || 0) / 2), deathSave: body,
      humanidade: m.humanidade || { atual: 0, max: 0 }, sorte: m.sorte || { atual: 0, max: 0 }, sp: m.sp || { cabeca: 0, corpo: 0 },
      andar: (Number(stats.MOVE) || 0) * 2, correr: (Number(stats.MOVE) || 0) * 4, dinheiro: m.dinheiro || 0, ip: m.ip ?? null, reputacao: m.reputacao ?? null, lesoes: m.lesoes || [], vontade: will,
      armas: items.filter(item => item.tipo === 'weapon').map(item => {
        const stat = attackStat(item.distancia);
        return { nome: item.nome, qtd: 1, pericia: skillPt(item.pericia), base: (Number(stats[stat]) || 0) + level(item.pericia), stat, dano: item.dano, cdt: item.cdt, maos: item.maos,
          pente: item.pente && item.pente.max ? `${item.pente.atual}/${item.pente.max}` : '', municao: item.municao || '', dentro: (item.dentro || []).filter(name => name !== item.municao), uso: uso(item) };
      }),
      armaduras: items.filter(item => item.tipo === 'armor').map(item => ({ nome: item.nome, cabeca: item.cabeca, corpo: item.corpo, escudo: 0, uso: uso(item) })),
      pericias: (m.pericias || []).map(skill => ({ label: skillLabelOf(doc, skill.nome), grupo: groupOfSkill(skill.nome), stat: skill.stat, nivel: skill.nivel, base: skill.nivel + (Number(stats[skill.stat]) || 0) })),
      cyber: items.filter(item => item.tipo === 'cyberware' && item.base).map(item => ({ nome: item.nome, dentro: item.dentro || [] })),
      noCorpo: items.filter(item => item.tipo === 'cyberware' && !item.base && item.instalado && !cyberNames.has(item.nome)).map(item => item.nome),
      semBase: items.filter(item => item.tipo === 'cyberware' && !item.base && !item.instalado).map(item => item.nome),
      decks: items.filter(item => item.tipo === 'cyberdeck').map(item => ({ nome: item.nome, ativo: item.uso === 'equipped', dentro: item.dentro || [] })),
      outros: items.filter(item => ['gear', 'ammo', 'clothing', 'drug'].includes(item.tipo) || (['program', 'itemUpgrade'].includes(item.tipo) && !deckNames.has(item.nome) && !weaponInside.has(item.nome) && !vehicleInside.has(item.nome)))
        .map(item => ({ nome: item.nome, qtd: item.qtd, uso: item.tipo === 'ammo' ? '' : uso(item), roupa: item.tipo === 'clothing' })),
      veiculos: items.filter(item => item.tipo === 'vehicle').map(item => ({ nome: item.nome, dentro: item.dentro || [] })),
      habilidades: ((m.role || {}).habilidades || []).filter(([name]) => !/Skill$/.test(name)).map(([name, rank]) => [abilityName(name), rank, ''])
    };
  }

  function sheetHtml(doc) {
    const model = sheetModel(doc);
    const mesa = model.fonte === 'mesa';
    const role = roleById(doc.role) || {};
    const spec = (role.especializacoes || []).find(item => item.id === doc.especializacao);
    const lp = lifepathTexts(doc);
    const lpRows = [...lifepathFields.map(([, label, field]) => [label, lp[field]]), ['Amigos', lp.friends], ['Inimigos', lp.enemies], ['Amores trágicos', lp.tragicLoveAffairs], ['Lifepath da Role', lp.roleLifepath]].filter(([, text]) => text);
    const bar = (now, max) => max ? ` <span class="cc-bar" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, Math.round(now / max * 100)))}%"></span></span>` : '';
    const vital = (label, value, extra = '', bad = false) => `<div class="cc-vital${bad ? ' cc-vital-bad' : ''}"><span>${label} </span><b>${value}</b>${extra}</div>`;
    const usoTag = uso => uso && uso !== 'equipado' && USOS[uso] ? ` <small class="cc-mount-note">${USOS[uso].toLowerCase()}</small>` : '';
    const names = list => list.map(name => esc(name)).join(', ');
    const statCell = stat => `<div class="cc-stat"><span>${stat}</span><b>${stat === 'EMP' && !mesa && model.empMostrada !== model.stats.EMP ? `${model.empMostrada}<small>/${model.stats.EMP}</small>` : model.stats[stat] || '—'}</b></div>`;
    const hurt = model.hp.atual < model.hp.max;
    const rank = mesa && doc.mesa.role ? doc.mesa.role.rank : 4;
    const source = mesa
      ? `<p class="cc-source cc-ok">Na mesa: a ficha do Foundry${model.quando ? `, atualizada em ${when(model.quando)}` : ''}. Os números agora mudam lá.</p>`
      : `<p class="cc-source">Ficha da criação.${doc.foundry ? ' O Foundry ainda não mandou a ficha da mesa.' : ' Depois que o mestre importar no Foundry, esta ficha passa a mostrar a mesa.'}</p>`;

    const vitals = `<div class="section cc-box" data-toc="Vitais"><h3>Vitais</h3><div class="cc-vitals">
        ${vital('HP', mesa ? `${model.hp.atual}/${model.hp.max}` : model.hp.max, bar(model.hp.atual, model.hp.max), hurt)}
        ${vital('Gravemente Ferido', model.gravemente)}${vital('Death Save', model.deathSave)}
        ${vital('Humanidade', `${model.humanidade.atual}/${model.humanidade.max}`, bar(model.humanidade.atual, model.humanidade.max))}
        ${vital('Sorte', mesa ? `${model.sorte.atual}/${model.sorte.max}` : model.sorte.max)}
        ${vital('SP cabeça', model.sp.cabeca)}${vital('SP corpo', model.sp.corpo)}
        ${vital('Andar', `${model.andar} m`)}${vital('Correr', `${model.correr} m`)}
        ${vital('Dinheiro', eb(model.dinheiro))}${model.ip !== null ? vital('Pontos de Melhoria', model.ip) : ''}${model.reputacao !== null ? vital('Reputação', model.reputacao) : ''}</div>
        ${model.lesoes.length ? `<p class="cc-warn">Lesões críticas: ${names(model.lesoes)}.</p>` : ''}
        <h4>STATs</h4><div class="cc-stats">${statKeys.map(statCell).join('')}</div>
        ${model.penalidade ? `<p class="cc-warn">Com a armadura vestida: −${model.penalidade} em REF, DEX e MOVE (já descontado no ataque e nas perícias).</p>` : ''}</div>`;

    const worn = model.armaduras.filter(item => item.uso === 'equipado');
    const armorText = item => [item.cabeca ? `SP ${item.cabeca} na cabeça` : '', item.corpo ? `SP ${item.corpo} no corpo` : '', item.escudo ? `escudo ${item.escudo} HP` : ''].filter(Boolean).join(', ');
    const weaponNote = arma => [arma.pente ? (arma.municao ? `carregada com ${arma.municao}` : 'descarregada') : '', arma.dentro.length ? `com ${arma.dentro.join(', ')}` : ''].filter(Boolean).join(' · ');
    const weaponRow = arma => `<tr><td><b>${esc(arma.nome)}</b>${arma.qtd > 1 ? ` ×${arma.qtd}` : ''}${usoTag(arma.uso)}<br><small>${esc(weaponNote(arma))}</small></td>
        <td><b>${arma.base}</b> <small>${arma.stat} + ${esc(arma.pericia)}</small></td><td>${esc(arma.dano || '')}</td><td>${arma.cdt || ''}</td><td>${arma.pente || '—'}</td><td>${arma.maos || 1}</td></tr>`;
    const carried = model.armaduras.filter(item => item.uso !== 'equipado');
    const combat = `<div class="section cc-box" data-toc="Combate"><h3>Combate</h3>
      ${model.armas.length ? `<div class="table-wrap dense"><table class="cc-weapons"><thead><tr><th>Arma</th><th>Ataque</th><th>Dano</th><th>CDT</th><th>Pente</th><th>Mãos</th></tr></thead><tbody>${model.armas.map(weaponRow).join('')}</tbody></table></div>` : '<p class="note-status">Nenhuma arma.</p>'}
      <p><b>Armadura:</b> ${worn.length ? worn.map(item => `${esc(item.nome)} <small>(${armorText(item)})</small>`).join(' · ') : 'nenhuma vestida'}${carried.length ? ` <small>· carregando: ${names(carried.map(item => item.nome))}</small>` : ''}</p></div>`;

    const abilityTitle = (abilitySpec(doc) || {}).titulo || 'Sub-habilidades';
    const roleBox = model.habilidades.length || model.veiculos.length || spec ? `<div class="section cc-box" data-toc="Role"><h3>${esc(role.habilidade || 'Role')} Rank ${rank}${spec ? ` · ${esc(spec.nome)}` : ''}</h3>
      ${spec ? `<p>Especialização: soma o Rank em ${spec.pericias.map(skillPt).join(', ')}.</p>` : ''}
      ${model.habilidades.length ? `${abilityTitle !== role.habilidade ? `<h4>${esc(abilityTitle)}</h4>` : ''}<ul class="cc-items">${model.habilidades.map(([name, value, desc]) => `<li><b>${esc(name)}</b> ${value}${desc ? `<small> · ${esc(desc)}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${model.veiculos.length ? `<h4>Veículos da família</h4><ul class="cc-items">${model.veiculos.map(item => `<li><b>${esc(item.nome)}</b>${item.dentro.length ? `: ${names(item.dentro)}` : ''}</li>`).join('')}</ul><p class="note-status">Um de cada vez com você; o resto fica com a família.</p>` : ''}</div>` : '';

    const byGroup = SKILL_GROUPS.map(group => [group, model.pericias.filter(skill => skill.grupo === group).sort((a, b) => a.label.localeCompare(b.label, 'pt'))]).filter(([, list]) => list.length);
    const skillRow = skill => `<tr><td>${esc(skill.label)}${skill.origem ? ' <small>(origem)</small>' : ''}</td><td><small>${skill.stat}</small></td><td>${skill.nivel}</td><td><b>${skill.base}</b></td></tr>`;
    const skills = `<div class="section cc-box" data-toc="Perícias"><h3>Perícias</h3><div class="cc-skill-groups">${byGroup.map(([group, list]) => `<div class="cc-skill-group"><h4>${group}</h4><table class="cc-skill-table"><tbody>${list.map(skillRow).join('')}</tbody></table></div>`).join('')}</div>
      <p class="note-status">Nível e, em negrito, a base do teste (STAT + nível). Some 1d10.</p></div>`;

    const tree = list => `<ul class="cc-tree">${list.map(item => `<li><b>${esc(item.nome)}</b>${item.ativo ? ' <small class="cc-ok">deck ativo</small>' : ''}${item.dentro.length ? `<ul>${item.dentro.map(name => `<li>${esc(name)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`;
    const nothingCyber = !model.cyber.length && !model.noCorpo.length && !model.decks.length;
    const cyber = `<div class="section cc-box" data-toc="Cyberware"><h3>Cyberware e netrunning</h3>
      ${model.cyber.length ? tree(model.cyber) : ''}${model.noCorpo.length ? `<p><b>No corpo:</b> ${names(model.noCorpo)}.</p>` : ''}
      ${model.semBase.length ? `<p class="cc-warn">Sem base, fora do corpo: ${names(model.semBase)}.</p>` : ''}
      ${model.decks.length ? `<h4>Cyberdeck</h4>${tree(model.decks)}` : ''}${nothingCyber ? '<p class="note-status">Nenhum.</p>' : ''}</div>`;

    const clothes = model.outros.filter(item => item.roupa);
    const gear = model.outros.filter(item => !item.roupa);
    const itemLine = item => `<li><b>${esc(item.nome)}</b>${item.qtd > 1 ? ` ×${item.qtd}` : ''}${usoTag(item.uso)}${item.origem === 'gratis2077' ? ' <small class="cc-ok">grátis (Neuroport)</small>' : ''}${item.origem === 'role' ? ' <small class="cc-ok">bônus da Role</small>' : ''}</li>`;
    const equipment = `<div class="section cc-box" data-toc="Equipamento"><h3>Equipamento</h3>
      ${gear.length ? `<ul class="cc-items cc-columns">${gear.map(itemLine).join('')}</ul>` : '<p class="note-status">Nada além das armas.</p>'}
      ${clothes.length ? `<h4>Moda</h4><ul class="cc-items cc-columns">${clothes.map(itemLine).join('')}</ul>` : ''}</div>`;

    let homeBox;
    if (mesa && doc.mesa.moradia) {
      const m = doc.mesa.moradia;
      const line = (label, item) => `<dt>${label}</dt><dd>${esc(item.descricao || '—')}${item.custo ? ` · ${eb(item.custo)}/mês` : ''}</dd>`;
      const total = (m.housing?.custo || 0) + (m.lifeStyle?.custo || 0) + (m.traumaTeam?.custo || 0);
      homeBox = `<dl class="cc-lifepath">${line('Moradia', m.housing || {})}${line('Estilo de vida', m.lifeStyle || {})}${line('Trauma Team', m.traumaTeam || {})}<dt>Por mês</dt><dd><b>${eb(total)}</b>, no dia 1º</dd></dl>`;
    } else {
      const home = housing(doc);
      homeBox = `<dl class="cc-lifepath"><dt>Moradia</dt><dd>${esc(home.moradia)}${home.aluguel ? ` · ${eb(home.aluguel)}/mês` : ' · sem aluguel'}</dd>
          <dt>Estilo de vida</dt><dd>${esc(home.estilo)}${home.custoEstilo ? ` · ${eb(home.custoEstilo)}/mês` : ''}</dd>
          <dt>Trauma Team</dt><dd>${home.traumaTeam ? `${esc(home.traumaTeam.nome)} · ${eb(home.traumaTeam.custo)}/mês` : 'Sem cobertura'}</dd>
          ${home.moda ? `<dt>Moda</dt><dd>${esc(home.moda.nome)}: ${esc(home.moda.desc)}</dd>` : ''}
          <dt>Por mês</dt><dd><b>${eb(home.mensal)}</b>, no dia 1º${home.primeiroMes ? ` · o primeiro mês custou ${eb(home.primeiroMes)} do dinheiro inicial` : ' · o primeiro mês foi de graça'}</dd></dl>`;
    }

    return `<div class="cc-sheet">
      <div class="section cc-box cc-identity" data-toc="Identidade">${portraitImg(portraitUrl(doc), 'cc-portrait', doc.nome)}<h3>${esc(doc.nome || 'Sem nome')}${doc.apelido ? ` <span class="cc-handle">"${esc(doc.apelido)}"</span>` : ''}</h3>
        <p><b>${esc(role.nome || 'Sem Role')}</b> · ${esc(role.habilidade || '')} Rank ${rank}${spec ? ` · ${esc(spec.nome)}` : ''} · ${esc((methodById(doc.metodo) || {}).nome || 'método não escolhido')}${doc.foundry ? ` · <b class="cc-ok">No Foundry desde ${new Date(doc.foundry.importado).toLocaleDateString('pt-BR')}</b>` : ''}</p>
        ${doc.aparencia ? `<p>${esc(doc.aparencia)}</p>` : ''}${source}</div>
      ${vitals}${combat}${roleBox}${skills}${cyber}${equipment}
      <div class="section cc-box" data-toc="Moradia"><h3>Moradia e estilo de vida</h3>${homeBox}</div>
      <div class="section cc-box" data-toc="Lifepath"><h3>Lifepath</h3>${lpRows.length ? `<dl class="cc-lifepath">${lpRows.map(([label, text]) => `<dt>${label}</dt><dd>${esc(text)}</dd>`).join('')}</dl>` : '<p class="note-status">Ainda não preenchido.</p>'}</div>
      ${doc.notas ? `<div class="section cc-box" data-toc="Notas"><h3>Notas</h3><p>${esc(doc.notas)}</p></div>` : ''}</div>`;
  }

  // O quadro de anotações da ficha: só o dono e o mestre leem (pistas, contatos, dívidas, o que o NPC prometeu).
  const notesBox = (doc, papel) => box('Anotações', `<p class="note-status">Pistas, contatos, dívidas, o que o NPC prometeu. ${papel === 'mestre' ? 'O jogador escreve aqui; você também pode.' : 'Só você e o mestre leem.'} Fica salvo sozinho, em qualquer aparelho.</p><textarea class="note-area cc-notes" data-cc-notes rows="8" placeholder="Ex.: Brakk quer 500eb até sexta. A senha do depósito é 4471.">${esc((doc.anotacoes || {}).texto || '')}</textarea><p class="note-status" data-cc-notes-status>${doc.anotacoes && doc.anotacoes.atualizado ? `Salvo em ${when(doc.anotacoes.atualizado)}${doc.anotacoes.por ? ` (${esc(doc.anotacoes.por)})` : ''}.` : ''}</p>`, ' data-cc-notes-box data-toc="Anotações"');

  // Histórico de versões (só o mestre): como o personagem estava antes de cada rodada de edição, e Restaurar.
  const HISTORY_FIELDS = { nome: 'nome', apelido: 'apelido', role: 'Role', especializacao: 'especialização', metodo: 'método', stats: 'STATs', sorteio: 'sorteio dos STATs', pericias: 'perícias', tipos: 'tipos de perícia', extras: 'perícias extras', lingua: 'língua', casa: 'bairro', itens: 'itens', quickhacks: 'quickhacks', kitNet: 'kit NET', escolhas: 'escolhas', habilidades: 'habilidade da Role', oficina: 'oficina', montagem: 'montagem', moradia: 'moradia', estiloVida: 'estilo de vida', traumaTeam: 'Trauma Team', estiloModa: 'moda', lifepath: 'Lifepath', avanco: 'avanço', aparencia: 'aparência', notas: 'notas', retratoLink: 'link do retrato' };
  const historyBox = () => box('Histórico de versões', '<p class="note-status">Antes de cada rodada de edição, a wiki guarda como o personagem estava (no máximo uma a cada 10 minutos; ficam as últimas 30). Restaurar volta o que o jogador preenche (STATs, perícias, itens, Lifepath...) daquela versão. Foundry, ficha da mesa, pedidos, Pontos de Melhoria, retrato e anotações ficam como estão agora, e a versão de agora também vai para o histórico.</p><div data-cc-history>Carregando…</div>', ' data-cc-history-box data-toc="Histórico de versões"');
  async function drawHistory(root, id) {
    const holder = root.querySelector('[data-cc-history]');
    if (!holder) return;
    const answer = await api(`api/personagens/${id}/versoes`);
    if (!holder.isConnected) return;
    const versions = answer.data.versoes || [];
    if (answer.status !== 200) { holder.innerHTML = `<p class="cc-msg">${esc(answer.data.erro || 'Não consegui ler o histórico.')}</p>`; return; }
    const changes = item => (item.diferencas.length ? `muda: ${item.diferencas.map(field => HISTORY_FIELDS[field] || field).join(', ')}` : 'igual à de agora');
    holder.innerHTML = versions.length
      ? `<ul class="cc-history">${versions.map(item => `<li><b>v${esc(item.versao)}</b> · ${esc(when(item.guardada))} · ${esc(item.nome || 'sem nome')}${item.role ? ` (${esc(roleName(item.role))})` : ''} · <span class="note-status">${esc(changes(item))}</span> ${item.diferencas.length ? `<button class="action" type="button" data-cc-restore="${esc(item.id)}" data-cc-restore-v="${esc(item.versao)}">Restaurar</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="note-status">Nenhuma versão guardada ainda: a primeira entra no próximo salvamento.</p>';
  }

  async function setupSheet(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const id = (helpers.target && helpers.target.section) || (window.playerAccount && window.playerAccount.selected());
    if (!id) { root.innerHTML = '<p>Escolha um personagem em Personagens (ou no menu da conta, no canto de cima).</p>'; return; }
    const [answer, me] = await Promise.all([api(`api/personagens/${id}`), identity()]);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const doc = answer.data.personagem;
    const papel = me.data.papel;
    if (!doc) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Personagem não encontrado.')}</div>`; return; }
    if (doc.publico) { root.innerHTML = `<div class="callout cc-identity">${portraitImg(doc.retrato, 'cc-portrait', doc.nome)}Esta é a ficha de outro jogador: você só vê o nome (<b>${esc(doc.nome)}</b>), a Role (${esc(roleName(doc.role))}) e o retrato.</div>`; return; }
    root.innerHTML = `<p class="cc-toolbar"><button class="action" type="button" data-cc-edit>Editar</button><button class="action" type="button" data-cc-shop>Loja</button><button class="action" type="button" data-cc-print>Imprimir ou salvar em PDF</button><button class="action" type="button" data-cc-back>Personagens</button></p>${foundryBox(doc, papel)}<div data-cc-sheet-body>${sheetHtml(doc)}</div>${notesBox(doc, papel)}${papel === 'mestre' ? historyBox() : ''}`;
    if (papel === 'mestre') drawHistory(root, id);
    // Anotações: salvam sozinhas (um instante depois de parar de digitar), sem mudar a versão do personagem.
    const notes = root.querySelector('[data-cc-notes]');
    if (notes) {
      let timer = null;
      const status = root.querySelector('[data-cc-notes-status]');
      notes.oninput = () => {
        status.textContent = 'Salvando…';
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const answer = await api(`api/personagens/${id}/anotacoes`, { method: 'PUT', body: { texto: notes.value } });
          status.textContent = answer.status === 200 ? `Salvo às ${new Date(answer.data.anotacoes.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : (answer.data.erro || 'Não consegui salvar.');
          status.classList.toggle('cc-bad', answer.status !== 200);
        }, 900);
      };
    }
    // Personagem no Foundry: a ficha da mesa muda durante a sessão; confere a cada 30 segundos enquanto a página estiver aberta.
    if (doc.foundry) {
      let seen = (doc.mesa || {}).recebido || '';
      const refresh = setInterval(async () => {
        if (token !== renderToken || !document.body.contains(root)) return clearInterval(refresh);
        const fresh = await api(`api/personagens/${id}`);
        const next = fresh.status === 200 && fresh.data.personagem;
        if (!next || ((next.mesa || {}).recebido || '') === seen) return;
        seen = (next.mesa || {}).recebido || '';
        Object.assign(doc, next);
        const body = root.querySelector('[data-cc-sheet-body]');
        if (body) body.innerHTML = sheetHtml(doc);
      }, 30000);
    }
    root.onclick = async event => {
      if (event.target.closest('[data-cc-print]')) return window.print();
      if (event.target.closest('[data-cc-send]')) return sendToGm(doc, papel, root);
      const restore = event.target.closest('[data-cc-restore]');
      if (restore) {
        const sure = await window.wikiPopup.confirm({ title: 'Restaurar versão', html: `<p>Voltar <b>${esc(doc.nome || 'este personagem')}</b> para a versão <b>v${esc(restore.dataset.ccRestoreV)}</b>?</p><p class="note-status">A versão de agora vai para o histórico (dá para voltar). Quem estiver com o criador aberto precisa recarregar.</p>`, ok: 'Restaurar' });
        if (!sure) return;
        const answer = await api(`api/personagens/${id}/versoes/${encodeURIComponent(restore.dataset.ccRestore)}/restaurar`, { method: 'POST', body: {} });
        if (answer.status !== 200) return window.wikiPopup.toast(answer.data.erro || 'Não consegui restaurar.', { tone: 'bad' });
        window.wikiPopup.toast(`Versão v${answer.data.restaurada} restaurada.`);
        return setupSheet(content, helpers);
      }
      if (event.target.closest('[data-cc-edit]')) helpers.openPage('criador', { section: id });
      if (event.target.closest('[data-cc-shop]')) helpers.openPage('loja', { section: id });
      if (event.target.closest('[data-cc-back]')) helpers.openPage('personagens');
    };
  }

  // ================= Loja (componente usado no criador e na página Loja) =================
  // Regras da loja inicial (o que fica de fora da criação). Vêm do servidor; o mestre muda na engrenagem da Loja.
  const SHOP_TAG_NAMES = { exotica: 'armas exóticas', excelente: 'qualidade excelente', borgware: 'borgware', 'municao-rara': 'munição inteligente, biotoxina, EMP e sonífera', raro: 'Linear Frame, Cryotank e Cryopump', blackchrome: 'itens do Black Chrome' };
  // Cada campanha tem as suas: as carregadas são as da campanha do personagem aberto (ou da escolhida no menu).
  let shopRules = { teto: 1000, esconder: Object.keys(SHOP_TAG_NAMES).filter(tag => tag !== 'blackchrome'), liberados: [], bloqueados: [] };
  let shopRulesCampaign = null;
  async function loadShopRules(campaignId = (activeCampaign() || {}).id) {
    const answer = await api(`api/loja/regras${campaignQuery(campaignId)}`);
    if (answer.status === 200 && answer.data.regras) { shopRules = answer.data.regras; shopRulesCampaign = answer.data.campanha || null; }
    return shopRules;
  }
  const saveShopRules = rules => api(`api/loja/regras${campaignQuery(shopRulesCampaign)}`, { method: 'PUT', body: rules });
  // Por que um item fica fora da criação ('' = está à venda).
  function hiddenReason(item, rules = shopRules) {
    if (rules.bloqueados.includes(item.id)) return 'escondido pelo mestre';
    if (rules.liberados.includes(item.id)) return '';
    if (item.preco > rules.teto) return `acima de ${eb(rules.teto)}`;
    const tag = (item.tags || []).find(name => rules.esconder.includes(name));
    return tag ? SHOP_TAG_NAMES[tag] : '';
  }

  // Kit sugerido do Pacote Completo: o pacote de Rato de Rua da Role, com a primeira opção de cada escolha.
  function suggestedKit(doc) {
    const pack = C.packages[(roleById(doc.role) || {}).tabelas];
    if (!pack) return [];
    const freeIds = new Set([...C.free2077.map(item => item.id), ...C.neuroportIncludes]);
    const list = [];
    for (const category of ['armas', 'equipamento', 'moda', 'cyberware']) {
      for (const entry of pack[category] || []) {
        for (const [id, qty] of entry.ou ? entry.ou[0] : [entry]) {
          const item = catalog.get(id);
          if (!item || (category === 'cyberware' && freeIds.has(id)) || roleFree(doc).some(free => free.id === id)) continue;
          list.push({ id, qtd: qty, item });
        }
      }
    }
    return list;
  }
  const kitCost = entries => entries.reduce((sum, entry) => sum + entry.item.preco * (entry.item.lote > 1 ? entry.qtd / entry.item.lote : entry.qtd), 0);
  // O kit à venda: sem o que a loja de criação esconde, e com a moda só até caber nos 800eb de moda
  // (a roupa de negócios do Exec, por exemplo, passaria).
  function kitFor(doc) {
    let fashion = 0;
    return suggestedKit(doc).filter(entry => !hiddenReason(entry.item)).filter(entry => {
      if (!isFashion(entry.item)) return true;
      const cost = kitCost([entry]);
      if (fashion + cost > C.completePackage.moda) return false;
      fashion += cost;
      return true;
    });
  }
  // Armas, armaduras, cyberdecks e bases de cyberware entram uma por linha: cada uma tem a sua montagem
  // (o segundo cyberbraço recebe outras opções). Munição e o resto somam na mesma linha.
  const addItem = (doc, id, qty) => {
    const item = catalog.get(id);
    if (item && ['arma', 'armadura', 'deck', 'cyberBase'].includes(kindOf(item))) {
      for (let i = 0; i < qty; i++) (doc.itens = doc.itens || []).push({ uid: `loja:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, id, qtd: 1 });
      return;
    }
    const existing = (doc.itens || []).find(entry => entry.id === id);
    if (existing) existing.qtd += qty;
    else (doc.itens = doc.itens || []).push({ uid: `loja:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, id, qtd: qty });
  };

  const shopState = { cat: 'armas', sub: '', busca: '', verTudo: false, painel: '', mostrar: 60 };
  // Peças comuns às duas lojas, no visual do exemplo da Loja: os chips de categoria com a contagem, a busca, os chips de
  // grupo, a grade de cartões (nome, etiquetas, números, preço e o botão) e, ao lado, a gaveta com o dinheiro e o pedido.
  // Numa coluna estreita (o passo 5 do criador, o celular) a gaveta vai para cima e cada quadro dela abre e fecha pelo título.
  const fold = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const NARROW_SHOP = 960;
  const narrowShop = target => target.clientWidth > 0 && target.clientWidth < NARROW_SHOP;
  const PAGE = 60;
  // Os grupos se juntam pelo nome base: "Pistolas" mostra também as do Black Chrome (o cartão traz a etiqueta do livro).
  const subKey = sub => String(sub || '').replace(/ \((Black Chrome|Black Chrome Plus)\)$/, '');
  function drawerBox(target, id, title, html, attrs = '') {
    const narrow = narrowShop(target);
    const open = !narrow || shopState.painel === id;
    return `<section class="shop-box"><button type="button" class="shop-box-head${narrow && open ? ' active' : ''}" data-shop-painel="${id}" aria-expanded="${open}">${title}</button>
      <div class="cc-shop-panel" data-painel="${id}"${attrs}${open ? '' : ' hidden'}>${html}</div></section>`;
  }
  // Na coluna estreita, o título do quadro abre e fecha (um aberto por vez); na larga, os quadros ficam sempre abertos.
  function togglePanel(target, id) {
    if (!narrowShop(target)) return;
    shopState.painel = shopState.painel === id ? '' : id;
    for (const panel of target.querySelectorAll('[data-painel]')) panel.hidden = panel.dataset.painel !== shopState.painel;
    for (const tab of target.querySelectorAll('[data-shop-painel]')) {
      const on = tab.dataset.shopPainel === shopState.painel;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-expanded', String(on));
    }
  }
  // Os itens que passam pelos filtros (categoria e grupo, ou a busca em todas as categorias), e a barra dos filtros.
  function shopFilter(items) {
    const terms = fold(shopState.busca).split(/\s+/).filter(Boolean);
    const counts = {};
    for (const item of items) counts[item.cat] = (counts[item.cat] || 0) + 1;
    if (!counts[shopState.cat] && !terms.length) shopState.cat = (shop.categorias.find(category => counts[category.id]) || { id: shopState.cat }).id;
    const subs = [...new Set(items.filter(item => item.cat === shopState.cat).map(item => subKey(item.sub)))];
    if (shopState.sub && !subs.includes(shopState.sub)) shopState.sub = '';
    const visible = items.filter(item => (terms.length || item.cat === shopState.cat) && (!shopState.sub || terms.length || subKey(item.sub) === shopState.sub)
      && terms.every(term => fold(`${item.nome} ${item.en} ${item.sub} ${item.livro || ''} ${item.resumo || ''}`).includes(term)));
    const chip = (attr, value, label, active, count = '') => `<button type="button" class="map-filter shop-chip${active ? ' active' : ''}" ${attr}="${esc(value)}">${label}${count !== '' ? `<b>${count}</b>` : ''}</button>`;
    const filters = `<div class="cc-shop-filters">
      <div class="map-filter-list shop-rail">${shop.categorias.filter(category => counts[category.id]).map(category => chip('data-shop-cat', category.id, category.nome, category.id === shopState.cat && !terms.length, counts[category.id])).join('')}</div>
      <div class="cc-shop-row"><input type="search" class="shop-search" data-shop-busca placeholder="Buscar em todas as categorias" value="${esc(shopState.busca)}" aria-label="Buscar item"></div>
      ${terms.length ? `<p class="shop-hint">Buscando em todas as categorias: ${visible.length} ${visible.length === 1 ? 'item' : 'itens'}.</p>`
        : subs.length > 1 ? `<div class="map-filter-list shop-rail shop-subs">${chip('data-shop-sub', '', 'Todos', !shopState.sub)}${subs.map(sub => chip('data-shop-sub', sub, esc(sub), sub === shopState.sub)).join('')}</div>` : ''}</div>`;
    return { visible, shown: visible.slice(0, shopState.mostrar), filters };
  }
  const moreButton = (visible, shown) => (visible.length > shown.length ? `<p class="shop-more"><button type="button" class="action cc-ghost" data-shop-mais>Mostrar mais (${shown.length} de ${visible.length})</button></p>` : '');

  // ---------------- O cartão do item ----------------
  const INSTALL_PT = { mall: 'Shopping', clinic: 'Clínica', hospital: 'Hospital', none: '—' };
  const shopTag = (text, color) => `<span class="shop-tag" style="--k2:${color}">${esc(text)}</span>`;
  function itemTags(item) {
    const tags = (item.tags || []);
    const out = [];
    if (item.arma && item.arma.oculta) out.push(shopTag('oculta', 'var(--c)'));
    if (/\(excelente\)/i.test(item.nome) || tags.includes('excelente')) out.push(shopTag('excelente', 'var(--c)'));
    if (/\(ruim\)/i.test(item.nome)) out.push(shopTag('ruim', 'var(--mu)'));
    if ((item.arma && item.arma.exotica) || tags.includes('exotica')) out.push(shopTag('exótica', 'var(--r)'));
    if (tags.includes('borgware')) out.push(shopTag('borgware', 'var(--r)'));
    if (item.foundry && /^cpr-2077\./.test(item.foundry.pack)) out.push(shopTag('2077', 'var(--y)'));
    if (item.livro) out.push(shopTag(item.livro, 'var(--y)'));
    return out.join('');
  }
  // Os números do cartão (quatro, no máximo), conforme o tipo do item.
  function itemStats(item) {
    const cells = [];
    const cell = (label, value) => cells.push(`<div><small>${label}</small><b>${esc(String(value))}</b></div>`);
    if (item.arma) {
      const a = item.arma;
      cell('Dano', a.dano || '—'); cell('CDT', a.cdt || '—'); cell('Pente', a.distancia && a.pente ? a.pente : '—'); cell('Mãos', a.maos || 1);
    } else if (item.armadura) {
      const a = item.armadura;
      if (a.escudo) cell('Escudo', `${a.escudo} HP`);
      else { cell('SP corpo', a.corpo || '—'); cell('SP cabeça', a.cabeca || '—'); }
      cell('Penalidade', a.penalidade ? `−${a.penalidade}` : '—');
    } else if (item.cyber) {
      const c = item.cyber;
      cell('Humanidade', `${c.hl}${c.rolagem && c.rolagem !== '0' ? ` (${c.rolagem})` : ''}`);
      cell('Instala', INSTALL_PT[c.instalacao] || c.instalacao || '—');
      cell(c.base ? 'Slots' : 'Ocupa', c.base ? c.slots : c.tamanho);
    } else if (item.programa) {
      const p = item.programa;
      cell('ATK', p.atk || '—'); cell('DEF', p.def || '—'); cell('REZ', p.rez || '—'); cell('Ocupa', p.tamanho ?? 1);
    } else if (item.deck) cell('Slots', item.deck.slots);
    else if (item.acessorio) cell('Ocupa', `${item.acessorio.tamanho} slot${item.acessorio.tamanho > 1 ? 's' : ''}`);
    else if (item.hardware) cell('Ocupa', `${item.hardware.tamanho} slot${item.hardware.tamanho > 1 ? 's' : ''}`);
    if (item.lote > 1) cell('Lote', item.lote);
    return cells.length ? `<div class="shop-stats">${cells.slice(0, 4).join('')}</div>` : '';
  }
  const priceOf = (item, bad = false) => `<span class="cc-shop-preco shop-price${bad ? ' cc-bad' : ''}">${Math.round(item.preco).toLocaleString('pt-BR')}<small>eb${item.lote > 1 ? ` / ${item.lote}` : ''}</small></span>`;
  // Linha de baixo do nome: o grupo, o livro (se o grupo não diz) e, nas armas, a perícia; o resumo só quando não há números.
  const subLine = item => [item.sub, item.livro && !String(item.sub).includes(item.livro) ? item.livro : '', item.arma && item.arma.pericia ? skillPt(item.arma.pericia) : '',
    itemStats(item) ? '' : item.resumo].filter(Boolean).join(' · ');
  const shopCard = (item, { open, badges = '', notes = '', foot = '', extraClass = '' }) => `<article class="cc-shop-item shop-card${item.desc ? ' cc-has-desc' : ''}${open ? ' cc-open' : ''}${extraClass}" data-shop-row="${item.id}">
    <header class="cc-shop-info"><b>${esc(item.nome)}</b>${badges}</header>
    ${itemTags(item) ? `<div class="shop-tags">${itemTags(item)}</div>` : ''}
    <small class="cc-shop-sub">${esc(subLine(item))}</small>${notes}
    ${itemStats(item)}
    ${item.desc ? `<p class="cc-desc">${esc(item.desc)}</p>` : ''}
    <footer class="shop-foot">${foot}</footer></article>`;
  const badge = (text, kind) => `<small class="cc-badge cc-${kind}">${text}</small>`;
  // Redesenha guardando a rolagem da página (comprar um item lá embaixo não volta para o topo).
  function keepingScroll(target, paint, reset) {
    const y = window.scrollY;
    paint();
    if (!reset) window.scrollTo(0, y);
    // No celular as categorias rolam de lado: a escolhida fica à vista.
    const chips = target.querySelector('.cc-shop-filters .map-filter-list');
    const active = chips && chips.querySelector('.active');
    if (active && chips.scrollWidth > chips.clientWidth) chips.scrollLeft += active.getBoundingClientRect().left - chips.getBoundingClientRect().left - 8;
  }
  // Eventos comuns: categoria, grupo, busca, mostrar mais, abrir quadro da gaveta e abrir a descrição do cartão. true = já tratou.
  function shopCommonClick(event, target, draw, openRows) {
    const cat = event.target.closest('[data-shop-cat]');
    if (cat) { shopState.cat = cat.dataset.shopCat; shopState.sub = ''; shopState.busca = ''; shopState.mostrar = PAGE; draw(true); return true; }
    const sub = event.target.closest('[data-shop-sub]');
    if (sub) { shopState.sub = sub.dataset.shopSub; shopState.mostrar = PAGE; draw(); return true; }
    if (event.target.closest('[data-shop-mais]')) { shopState.mostrar += PAGE; draw(); return true; }
    const tab = event.target.closest('[data-shop-painel]');
    if (tab) { togglePanel(target, tab.dataset.shopPainel); return true; }
    const row = event.target.closest('[data-shop-row]');
    if (row && !event.target.closest('button, select, input, a, textarea')) {
      const id = row.dataset.shopRow;
      if (openRows.has(id)) openRows.delete(id); else openRows.add(id);
      row.classList.toggle('cc-open', openRows.has(id));
      return true;
    }
    return false;
  }
  function shopSearchInput(event, target, draw) {
    if (!event.target.matches('[data-shop-busca]')) return false;
    shopState.busca = event.target.value;
    shopState.mostrar = PAGE;
    const position = event.target.selectionStart;
    draw();
    const input = target.querySelector('[data-shop-busca]');
    input.focus();
    try { input.setSelectionRange(position, position); } catch { /* campo sem cursor */ }
    return true;
  }

  // ================= Loja inicial (antes do Foundry) =================
  // doc pode faltar (o mestre olhando a loja sem personagem): aí só navega e ajusta as regras.
  function renderShop(target, doc, { onChange = () => {}, readOnly = false, gm = false, onRules } = {}) {
    const canBuy = Boolean(doc) && !readOnly;
    const openRows = new Set();
    const paint = () => {
      const cash = doc ? money(doc) : null;
      const showHidden = gm && shopState.verTudo;
      const available = shop.itens.filter(item => showHidden || !hiddenReason(item));
      const hiddenCount = shop.itens.length - shop.itens.filter(item => !hiddenReason(item)).length;
      const { visible, shown, filters } = shopFilter(available);
      const owned = new Map();
      if (doc) for (const entry of inventory(doc)) owned.set(entry.id, (owned.get(entry.id) || 0) + entry.qtd);
      const bought = doc ? inventory(doc).filter(entry => entry.origem === 'loja') : [];
      const kit = doc && doc.metodo === 'pacote' && canBuy ? kitFor(doc) : [];
      const kitMain = kit.filter(entry => !isFashion(entry.item));
      const kitFashion = kit.filter(entry => isFashion(entry.item));
      // O que sobra para este item: a moda gasta primeiro a verba de moda.
      const spare = item => (!cash ? Infinity : isFashion(item) ? cash.saldo + Math.max(0, cash.moda - cash.usadoModa) : cash.saldo);
      const foot = item => {
        const reason = hiddenReason(item);
        const buy = canBuy && !reason ? `<button class="action" type="button" data-shop-buy="${item.id}">Comprar</button>` : '';
        const rule = gm ? (reason
          ? `<button class="action cc-ghost" type="button" data-shop-allow="${item.id}">Liberar</button>`
          : `<button class="action cc-ghost cc-ghost-danger" type="button" data-shop-block="${item.id}" title="Tirar da loja de criação">Esconder</button>`) : '';
        return `${priceOf(item, item.preco > spare(item))}<span class="shop-buttons">${rule}${buy}</span>`;
      };
      const boughtList = bought.length
        ? `<ul class="cc-items cc-bought">${bought.map(entry => `<li><span><b>${esc(entry.item.nome)}</b> ×${entry.qtd}<small>${esc(entry.item.sub)}</small></span><span class="shop-line-end"><b>${eb(lineCost(entry))}</b>${readOnly ? '' : `<button class="action cc-ghost cc-ghost-danger" type="button" data-shop-return="${entry.uid}">Devolver</button>`}</span></li>`).join('')}</ul>`
        : '<p class="note-status">Nada comprado ainda.</p>';
      const wallet = cash ? `<section class="shop-box shop-wallet-box"><div class="cc-wallet shop-wallet"><span class="wl-main"><small>Dinheiro: </small><b class="${cash.saldo < 0 ? 'cc-bad' : ''}">${eb(cash.saldo)}</b><small> de ${eb(cash.inicial)}</small></span>${cash.moda ? `<span class="wl-sub" title="Só moda e fashionware; a sobra some">Moda: <b>${eb(cash.usadoModa)}</b> de ${eb(cash.moda)}</span>` : ''}${cash.moradia ? `<span class="wl-sub">Moradia (1º mês): <b>${eb(cash.moradia)}</b></span>` : ''}</div></section>` : '';
      target.innerHTML = `<div class="shop-layout${doc ? '' : ' shop-solo'}${narrowShop(target) ? ' shop-narrow' : ''}">
        <div class="shop-main">
          ${readOnly && doc ? '<div class="callout">Este personagem já está no Foundry: a loja inicial fechou. Compras durante a sessão chegam numa próxima versão.</div>' : ''}
          ${kit.length ? `<div class="cc-kit shop-kit"><span><b>Kit sugerido</b> (Rato de Rua de ${esc(roleName(doc.role))}): ${eb(kitCost(kitMain))}${kitFashion.length ? ` + ${eb(kitCost(kitFashion))} de moda` : ''}. Depois dá para devolver item por item.</span><button class="action" type="button" data-shop-kit>Comprar o kit</button></div>` : ''}
          ${filters}
          ${hiddenCount && !showHidden ? `<p class="note-status shop-note">${hiddenCount} itens avançados ficam fora da loja de criação (acima de ${eb(shopRules.teto)}, ${shopRules.esconder.map(tag => SHOP_TAG_NAMES[tag]).join(', ') || 'nenhuma etiqueta'}). O mestre libera o que quiser.</p>` : ''}
          <div class="cc-shop-list shop-grid">${shown.map(item => {
            const reason = hiddenReason(item);
            const has = owned.get(item.id);
            return shopCard(item, { open: openRows.has(item.id), extraClass: `${reason ? ' cc-hidden-item' : ''}${has ? ' shop-in' : ''}`, badges: has ? badge(`tem ${has}`, 'ok') : '', notes: gm && reason ? `<small class="cc-bad shop-reason">fora da criação: ${esc(reason)}</small>` : '', foot: foot(item) });
          }).join('') || '<p class="shop-empty">Nada encontrado.</p>'}</div>
          ${moreButton(visible, shown)}
        </div>
        ${doc ? `<div class="shop-drawer cc-shop-bar">${wallet}<p class="cc-shop-msg" id="cc-shop-msg" role="status"></p>
          ${drawerBox(target, 'comprado', `Comprados <b class="cc-count">${bought.length}</b>`, boughtList, ' data-cc-bought')}</div>` : ''}
      </div>`;
    };
    const draw = (reset = false) => keepingScroll(target, paint, reset);
    const say = (text, bad = false) => { const el = target.querySelector('#cc-shop-msg'); if (el) { el.textContent = text; el.classList.toggle('cc-bad', bad); } };
    // O mestre libera ou esconde um item: grava as regras no servidor na hora.
    async function changeRules(change) {
      const rules = { ...shopRules, liberados: [...shopRules.liberados], bloqueados: [...shopRules.bloqueados] };
      change(rules);
      const answer = await saveShopRules(rules);
      if (answer.status === 200) shopRules = answer.data.regras;
      draw();
      if (onRules) onRules();
    }
    target.onclick = async event => {
      if (shopCommonClick(event, target, draw, openRows)) return;
      const allow = event.target.closest('[data-shop-allow]');
      if (allow) return changeRules(rules => { rules.bloqueados = rules.bloqueados.filter(id => id !== allow.dataset.shopAllow); if (hiddenReason(catalog.get(allow.dataset.shopAllow), rules)) rules.liberados.push(allow.dataset.shopAllow); });
      const block = event.target.closest('[data-shop-block]');
      if (block) return changeRules(rules => { rules.liberados = rules.liberados.filter(id => id !== block.dataset.shopBlock); rules.bloqueados.push(block.dataset.shopBlock); });
      if (!canBuy) return;
      if (event.target.closest('[data-shop-kit]')) {
        const kit = kitFor(doc);
        const cash = money(doc);
        const main = kitCost(kit.filter(entry => !isFashion(entry.item)));
        const fashion = kitCost(kit.filter(entry => isFashion(entry.item)));
        const sure = await wikiPopup.confirm({
          title: 'Comprar o kit sugerido',
          html: `<p>O pacote de Rato de Rua de <b>${esc(roleName(doc.role))}</b>, ${kit.length} itens. Depois dá para devolver item por item.</p>
            <ul class="popup-list">${kit.map(entry => `<li><span class="popup-item">${esc(entry.item.nome)}${entry.qtd > 1 ? ` ×${entry.qtd}` : ''}${isFashion(entry.item) ? ' <small>moda</small>' : ''}</span><span class="popup-price">${eb(kitCost([entry]))}</span></li>`).join('')}</ul>
            <p class="popup-total"><span>Kit: <b>${eb(main)}</b>${fashion ? ` + <b>${eb(fashion)}</b> de moda` : ''}</span><span>Você tem: <b class="${cash.saldo < main ? 'cc-bad' : ''}">${eb(cash.saldo)}</b></span></p>`,
          ok: `Comprar (${eb(main + fashion)})`
        });
        if (!sure) return;
        for (const entry of kit) addItem(doc, entry.id, entry.qtd);
        draw();
        const after = money(doc);
        say(after.saldo < 0 ? `Kit comprado, mas faltam ${eb(-after.saldo)}: devolva algo.` : `Kit comprado. Sobram ${eb(after.saldo)}.`, after.saldo < 0);
        return onChange();
      }
      const buy = event.target.closest('[data-shop-buy]');
      if (buy) {
        const item = catalog.get(buy.dataset.shopBuy);
        addItem(doc, item.id, item.lote > 1 ? item.lote : 1);
        draw();
        const cash = money(doc);
        const needs = missingFoundations(doc).find(entry => entry.id === item.id);
        say(cash.saldo < 0 ? `Sem dinheiro: faltam ${eb(-cash.saldo)}. Devolva algo.` : needs ? `${item.nome} precisa da base certa (veja os avisos).` : `Comprado: ${item.nome}.`, cash.saldo < 0 || Boolean(needs));
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
    target.onchange = null;
    target.oninput = event => shopSearchInput(event, target, draw);
    draw(true);
    return { redraw: () => draw() };
  }

  // ================= Loja da campanha (depois do Foundry) =================
  // O jogador monta um pedido com qualquer item do catálogo; o mestre aprova ou recusa; o Foundry do mestre entrega
  // (cria os itens na ficha, desconta o dinheiro, carrega a arma e encaixa o acessório ou o programa onde o jogador
  // escolheu). Cyberware chega sem instalar: o mestre instala pela ficha do Foundry, que cobra e rola a Humanidade.
  // O dinheiro e os itens de onde escolher vêm da ficha da mesa (doc.mesa).
  const ORDER_STATUS = { pendente: 'esperando o mestre', aprovado: 'aprovado, esperando o Foundry entregar', entregue: 'entregue', recusado: 'recusado', cancelado: 'cancelado' };
  const ORDER_CHIP = { pendente: ['Pendente', 'var(--y)'], aprovado: ['Aprovado', 'var(--c)'], entregue: ['Entregue', 'var(--g)'], recusado: ['Recusado', 'var(--r)'], cancelado: ['Cancelado', 'var(--mu)'] };
  const statusChip = status => { const [label, color] = ORDER_CHIP[status] || [status, 'var(--mu)']; return `<span class="shop-status" style="--k:${color}">${label}</span>`; };
  const carts = new Map(); // o pedido em montagem, por personagem (fica enquanto a página estiver aberta)
  let catalogByEn = null;
  const catalogEntryOf = name => {
    if (!catalogByEn) catalogByEn = new Map([...shop.itens].reverse().map(item => [item.en, item]));
    return catalogByEn.get(name) || null;
  };
  const cartCost = line => { const item = catalog.get(line.id); return item ? item.preco * (item.lote > 1 ? line.qtd / item.lote : line.qtd) : 0; };
  const ONE_PER_LINE = ['arma', 'armadura', 'deck', 'cyberBase'];

  function renderCampaignShop(target, doc, { gm = false } = {}) {
    const cart = carts.get(doc.id) || [];
    carts.set(doc.id, cart);
    const openRows = new Set();
    const mesa = doc.mesa || null;
    // Itens da ficha (com uid da wiki) como "linhas" da montagem, para conferir onde cada coisa encaixa.
    const tableRows = ((mesa && mesa.itens) || []).filter(item => item.uid).map(item => ({ uid: item.uid, nome: item.nome, item: catalogEntryOf(item.nome), qtd: 1, dentro: item.dentro || [] })).filter(row => row.item);
    const freeIn = row => capacityOf(row) - row.dentro.reduce((sum, name) => sum + (catalogEntryOf(name) ? sizeOf({ item: catalogEntryOf(name), qtd: 1 }) : 0), 0);
    // Quantos de cada item a ficha da mesa já tem (pelo nome do Foundry).
    const onSheet = new Map();
    for (const entry of (mesa && mesa.itens) || []) {
      const item = catalogEntryOf(entry.nome);
      if (item) onSheet.set(item.id, (onSheet.get(item.id) || 0) + (Number(entry.qtd) || 1));
    }
    // O mestre que abre a loja com pedido esperando já cai na lista de pedidos.
    if (gm && !shopState.painel && (doc.pedidos || []).some(pedido => pedido.status === 'pendente')) shopState.painel = 'pedidos';
    const paint = () => {
      const { visible, shown, filters } = shopFilter(shop.itens);
      const total = cart.reduce((sum, line) => sum + cartCost(line), 0);
      const money = mesa ? Number(mesa.dinheiro) || 0 : null;
      const left = money === null ? null : money - total;
      const inCart = new Map();
      for (const line of cart) inCart.set(line.id, (inCart.get(line.id) || 0) + line.qtd);
      // Onde cada linha do pedido pode ir: um item da ficha ou outra linha do pedido ("@N").
      const lineRows = cart.map((line, index) => ({ uid: `@${index}`, nome: (catalog.get(line.id) || {}).nome, item: catalog.get(line.id), qtd: line.qtd, dentro: [] }));
      const placeSelect = (line, index) => {
        const child = { item: catalog.get(line.id), qtd: line.qtd };
        const kind = kindOf(child.item);
        if (!['acessorio', 'deckItem'].includes(kind)) return '';
        const parents = [...tableRows.filter(row => parentFits(child, row) && freeIn(row) >= sizeOf(child)), ...lineRows.filter(row => row.uid !== `@${index}` && parentFits(child, row))];
        return `<label class="cc-mount-field">${kind === 'acessorio' ? 'Encaixar em' : 'Instalar em'} <select data-pedido-em="${index}"><option value="">solto, no inventário</option>${parents.map(row => `<option value="${esc(row.uid)}"${row.uid === line.em ? ' selected' : ''}>${esc(row.nome)}${row.uid.startsWith('@') ? ' (deste pedido)' : ''}</option>`).join('')}</select></label>`;
      };
      const ammoSelect = (line, index) => {
        const weapon = { item: catalog.get(line.id), qtd: 1 };
        if (kindOf(weapon.item) !== 'arma' || !weapon.item.arma.distancia || !weapon.item.arma.pente) return '';
        const ammo = [...tableRows.filter(row => kindOf(row.item) === 'municao' && ammoFits(row, weapon)), ...lineRows.filter(row => kindOf(row.item) === 'municao' && ammoFits(row, weapon))];
        return `<label class="cc-mount-field">Munição <select data-pedido-municao="${index}"><option value="">descarregada</option>${ammo.map(row => `<option value="${esc(row.uid)}"${row.uid === line.municao ? ' selected' : ''}>${esc(row.nome)}${row.uid.startsWith('@') ? ' (deste pedido)' : ''}</option>`).join('')}</select></label>`;
      };
      const cartBox = cart.length ? `<ul class="cc-items cc-cart">${cart.map((line, index) => {
        const item = catalog.get(line.id) || {};
        return `<li><div class="shop-line"><span><b>${esc(item.nome || line.id)}</b> ×${line.qtd}<small>${esc(item.sub || '')}${item.lote > 1 ? ` · ${eb(item.preco)} por ${item.lote}` : ` · ${eb(item.preco || 0)} cada`}</small></span><b>${eb(cartCost(line))}</b></div>
          ${item.cyber ? '<small class="cc-wait">O mestre instala pela ficha (Humanidade e instalação).</small>' : ''}
          <div class="cc-mount-controls">${ammoSelect(line, index)}${placeSelect(line, index)}<span class="shop-stepper"><button type="button" data-pedido-menos="${index}" aria-label="Menos">−</button><button type="button" data-pedido-mais="${index}" aria-label="Mais">+</button></span><button type="button" class="action cc-ghost cc-ghost-danger" data-pedido-tirar="${index}">Tirar</button></div></li>`;
      }).join('')}</ul>
        <div class="shop-total"><span>Total</span><b>${eb(total)}</b></div>
        ${left !== null ? `<div class="shop-total shop-after"><span>Saldo após o pedido</span><span class="${left < 0 ? 'cc-bad' : ''}">${eb(left)}</span></div>` : ''}
        <div class="cc-cart-send"><label>Recado para o mestre (opcional)<textarea data-pedido-nota rows="3" maxlength="300">${esc(target.dataset.nota || '')}</textarea></label><button type="button" class="action shop-send" data-pedido-enviar>Enviar pedido · ${eb(total)}</button></div>`
        : '<p class="note-status">Nada no pedido ainda: use Adicionar nos cartões.</p>';
      const orders = (doc.pedidos || []).slice().reverse();
      const waiting = orders.filter(pedido => pedido.status === 'pendente').length;
      const going = orders.filter(pedido => pedido.status === 'aprovado').length;
      const orderLine = pedido => `<li class="cc-order cc-order-${pedido.status}"><div class="shop-line"><span><b>${pedido.itens.map(item => `${esc(item.nome)}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')}</b><small>${when(pedido.criado)} · ${eb(pedido.total)} · <span class="cc-order-status">${ORDER_STATUS[pedido.status] || pedido.status}</span></small></span>${statusChip(pedido.status)}</div>
        ${pedido.motivo || pedido.nota || pedido.erro || (pedido.avisos || []).length ? `<small>${pedido.nota ? `“${esc(pedido.nota)}”` : ''}${pedido.motivo ? ` Motivo: ${esc(pedido.motivo)}.` : ''}${(pedido.avisos || []).length ? ` ${esc(pedido.avisos.join(' '))}` : ''}${pedido.erro ? ` <span class="cc-bad">${esc(pedido.erro)}</span>` : ''}</small>` : ''}
        ${pedido.status === 'pendente' || (gm && pedido.status === 'aprovado') ? `<div class="cc-mount-controls">${pedido.status === 'pendente' ? `${gm ? `<button type="button" class="action" data-pedido-aprovar="${pedido.id}">Aprovar</button>` : ''}<button type="button" class="action cc-ghost cc-ghost-danger" data-pedido-${gm ? 'recusar' : 'cancelar'}="${pedido.id}">${gm ? 'Recusar' : 'Cancelar'}</button>` : ''}${gm && pedido.status === 'aprovado' ? `${pedido.erro ? `<button type="button" class="action" data-pedido-aprovar="${pedido.id}">Tentar de novo</button>` : ''}<button type="button" class="action cc-ghost cc-ghost-danger" data-pedido-recusar="${pedido.id}">Recusar</button>` : ''}</div>` : ''}</li>`;
      const alert = waiting ? `<span class="cc-tab-alert">${waiting} ${gm ? 'para aprovar' : 'com o mestre'}</span>` : going ? `<span class="cc-tab-alert cc-tab-alert-go">${going} a caminho</span>` : '';
      const foot = item => {
        const qty = inCart.get(item.id) || 0;
        const tooMuch = left !== null && !qty && item.preco > left;
        if (qty) return `${priceOf(item)}<span class="shop-stepper"><button type="button" data-pedido-card-menos="${item.id}" aria-label="Diminuir">−</button><b>${qty}</b><button type="button" data-pedido-por="${item.id}" aria-label="Aumentar">+</button></span>`;
        return `${priceOf(item, tooMuch)}${tooMuch ? '<button class="action" type="button" disabled>Sem saldo</button>' : `<button class="action" type="button" data-pedido-por="${item.id}">Adicionar</button>`}`;
      };
      target.innerHTML = `<div class="shop-layout${narrowShop(target) ? ' shop-narrow' : ''}">
        <div class="shop-main">
          ${filters}
          <div class="cc-shop-list shop-grid">${shown.map(item => shopCard(item, {
            open: openRows.has(item.id),
            extraClass: inCart.get(item.id) ? ' shop-in' : '',
            badges: (onSheet.get(item.id) ? badge(`na ficha ${onSheet.get(item.id)}`, 'ok') : '') + (inCart.get(item.id) ? badge(`no pedido ${inCart.get(item.id)}`, 'wait') : ''),
            foot: foot(item)
          })).join('') || '<p class="shop-empty">Nada encontrado.</p>'}</div>
          ${moreButton(visible, shown)}
        </div>
        <div class="shop-drawer cc-shop-bar">
          <section class="shop-box shop-wallet-box"><div class="cc-wallet shop-wallet"><span class="wl-main"><small>Dinheiro na mesa: </small><b>${money === null ? '—' : eb(money)}</b></span>${money === null ? '<span class="wl-sub">Chega quando o mestre abrir o mundo no Foundry.</span>' : ''}</div></section>
          <p class="cc-shop-msg" data-pedido-msg role="status"></p>
          ${drawerBox(target, 'pedido', `Seu pedido <b class="cc-count">${cart.length}</b>${total ? ` · <span class="${money !== null && total > money ? 'cc-bad' : ''}">${eb(total)}</span>` : ''}`, `<p class="note-status shop-howto">Cada pedido passa pelo mestre. Aprovado, o Foundry entrega: os itens entram na ficha, o dinheiro sai, a arma vem carregada e o acessório ou o programa vai onde você escolher. Cyberware chega sem instalar.</p>${cartBox}`, ' data-cc-cart')}
          ${drawerBox(target, 'pedidos', `Pedidos <b class="cc-count">${orders.length}</b>${alert}`, orders.length ? `<ul class="cc-items cc-orders">${orders.map(orderLine).join('')}</ul>` : '<p class="note-status">Nenhum pedido enviado ainda.</p>', ' data-cc-orders')}
        </div>
      </div>`;
    };
    const draw = (reset = false) => keepingScroll(target, paint, reset);
    const message = (text, bad = false) => { const el = target.querySelector('[data-pedido-msg]'); if (el) { el.textContent = text; el.classList.toggle('cc-bad', bad); } };
    async function act(path, body = {}) {
      const answer = await api(`api/personagens/${doc.id}/pedidos/${path}`, { method: 'POST', body });
      if (answer.status !== 200) return message(answer.data.erro || 'Não consegui.', true);
      const fresh = await api(`api/personagens/${doc.id}`);
      if (fresh.status === 200) doc.pedidos = fresh.data.personagem.pedidos;
      draw();
    }
    target.onclick = async event => {
      if (shopCommonClick(event, target, draw, openRows)) return;
      const add = event.target.closest('[data-pedido-por]');
      if (add) {
        const item = catalog.get(add.dataset.pedidoPor);
        const step = item.lote > 1 ? item.lote : 1;
        const existing = cart.find(line => line.id === item.id && !ONE_PER_LINE.includes(kindOf(item)));
        if (existing) existing.qtd += step; else cart.push({ id: item.id, qtd: step, em: '', municao: '' });
        draw();
        return message(`No pedido: ${item.nome}.`);
      }
      // O − do cartão: tira uma unidade (ou um lote) da última linha deste item.
      const cardLess = event.target.closest('[data-pedido-card-menos]');
      if (cardLess) {
        const item = catalog.get(cardLess.dataset.pedidoCardMenos);
        const step = item.lote > 1 ? item.lote : 1;
        let at = -1;
        cart.forEach((line, index) => { if (line.id === item.id) at = index; });
        if (at >= 0) { cart[at].qtd -= step; if (cart[at].qtd <= 0) removeLine(at); }
        return draw();
      }
      const index = name => Number((event.target.closest(`[data-pedido-${name}]`) || {}).dataset?.[`pedido${name[0].toUpperCase()}${name.slice(1)}`]);
      if (event.target.closest('[data-pedido-mais]') || event.target.closest('[data-pedido-menos]')) {
        const plus = Boolean(event.target.closest('[data-pedido-mais]'));
        const line = cart[index(plus ? 'mais' : 'menos')];
        const item = catalog.get(line.id);
        const step = item.lote > 1 ? item.lote : 1;
        line.qtd = Math.max(step, line.qtd + (plus ? step : -step));
        return draw();
      }
      if (event.target.closest('[data-pedido-tirar]')) { removeLine(index('tirar')); return draw(); }
      if (event.target.closest('[data-pedido-enviar]')) {
        const nota = (target.querySelector('[data-pedido-nota]') || {}).value || '';
        const answer = await api(`api/personagens/${doc.id}/pedidos`, { method: 'POST', body: { itens: cart, nota } });
        if (answer.status !== 201) return message(answer.data.erro || 'Não consegui enviar o pedido.', true);
        cart.length = 0;
        target.dataset.nota = '';
        doc.pedidos = [...(doc.pedidos || []), answer.data.pedido];
        shopState.painel = 'pedidos';
        draw();
        return message('Pedido enviado. O mestre aprova, e o Foundry entrega na ficha.');
      }
      const approve = event.target.closest('[data-pedido-aprovar]');
      if (approve) return act(`${approve.dataset.pedidoAprovar}/aprovar`);
      const refuse = event.target.closest('[data-pedido-recusar]');
      if (refuse) {
        const pedido = (doc.pedidos || []).find(entry => entry.id === refuse.dataset.pedidoRecusar) || { itens: [] };
        const motivo = await askRefusal(doc.nome, pedido);
        if (motivo !== null) return act(`${refuse.dataset.pedidoRecusar}/recusar`, { motivo });
        return;
      }
      const cancel = event.target.closest('[data-pedido-cancelar]');
      if (cancel) return act(`${cancel.dataset.pedidoCancelar}/cancelar`);
    };
    // Tirar uma linha: as referências a linhas do pedido ("@N") andam junto.
    function removeLine(removed) {
      cart.splice(removed, 1);
      for (const line of cart) for (const field of ['em', 'municao']) {
        const ref = String(line[field] || '').match(/^@(\d+)$/);
        if (ref) line[field] = Number(ref[1]) === removed ? '' : Number(ref[1]) > removed ? `@${Number(ref[1]) - 1}` : line[field];
      }
    }
    target.onchange = event => {
      if (event.target.matches('[data-pedido-em]')) { cart[Number(event.target.dataset.pedidoEm)].em = event.target.value; return draw(); }
      if (event.target.matches('[data-pedido-municao]')) { cart[Number(event.target.dataset.pedidoMunicao)].municao = event.target.value; return draw(); }
    };
    target.oninput = event => {
      if (event.target.matches('[data-pedido-nota]')) { target.dataset.nota = event.target.value; return; }
      shopSearchInput(event, target, draw);
    };
    draw(true);
    return { redraw: () => draw() };
  }
  const askRefusal = (nome, pedido) => wikiPopup.prompt({
    title: 'Recusar o pedido',
    html: `<p>${esc(nome || 'Personagem')}: ${pedido.itens.map(item => `${esc(item.nome)}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')} (${eb(pedido.total || 0)}).</p>`,
    label: 'Motivo (opcional, o jogador vê)', placeholder: 'Ex.: não tem na loja da Afterlife', maxlength: 200, ok: 'Recusar', danger: true
  });

  // ================= Loja do mestre (sem personagem escolhido) =================
  // O catálogo inteiro em linhas, com a situação de cada item na loja de criação (à venda ou escondido, e por quê) e os
  // botões Esconder e Liberar, que gravam as regras na hora.
  const VIEWS = { todos: 'Todos', venda: 'À venda na criação', fora: 'Fora da criação' };
  function renderGmCatalog(target, { onRules } = {}) {
    let view = 'todos';
    const paint = () => {
      const pool = shop.itens.filter(item => view === 'todos' || (view === 'venda') === !hiddenReason(item));
      const { visible, shown, filters } = shopFilter(pool);
      const row = item => {
        const reason = hiddenReason(item);
        return `<div class="shop-row cc-shop-item${item.desc ? ' cc-has-desc' : ''}" data-shop-row="${item.id}">
          <span class="cc-shop-info"><b>${esc(item.nome)}</b>${itemTags(item) ? `<span class="shop-tags">${itemTags(item)}</span>` : ''}</span>
          <span class="cc-shop-sub shop-row-details">${esc([item.sub, item.resumo].filter(Boolean).join(' · '))}</span>
          ${priceOf(item)}
          <span class="shop-status" style="--k:${reason ? 'var(--r)' : 'var(--c)'}">${reason ? `Escondido // ${esc(reason)}` : 'Visível'}</span>
          ${reason ? `<button class="action cc-ghost" type="button" data-shop-allow="${item.id}">Liberar</button>` : `<button class="action cc-ghost cc-ghost-danger" type="button" data-shop-block="${item.id}">Esconder</button>`}
          ${item.desc ? `<small class="cc-desc">${esc(item.desc)}</small>` : ''}</div>`;
      };
      target.innerHTML = `${filters}<div class="map-filter-list shop-rail shop-views">${Object.entries(VIEWS).map(([id, label]) => `<button type="button" class="map-filter shop-chip${id === view ? ' active' : ''}" data-shop-view="${id}">${label}</button>`).join('')}</div>
        <div class="shop-rows cc-shop-list"><div class="shop-row shop-row-head"><span>Item</span><span class="shop-row-details">Detalhes</span><span>Preço</span><span>Situação</span><span></span></div>${shown.map(row).join('') || '<p class="shop-empty">Nada encontrado.</p>'}</div>
        ${moreButton(visible, shown)}`;
    };
    const draw = (reset = false) => keepingScroll(target, paint, reset);
    const openRows = new Set();
    async function changeRules(change) {
      const rules = { ...shopRules, liberados: [...shopRules.liberados], bloqueados: [...shopRules.bloqueados] };
      change(rules);
      const answer = await saveShopRules(rules);
      if (answer.status === 200) shopRules = answer.data.regras;
      draw();
      if (onRules) onRules();
    }
    target.onclick = event => {
      const pick = event.target.closest('[data-shop-view]');
      if (pick) { view = pick.dataset.shopView; shopState.mostrar = PAGE; return draw(); }
      if (shopCommonClick(event, target, draw, openRows)) return;
      const allow = event.target.closest('[data-shop-allow]');
      if (allow) return changeRules(rules => { rules.bloqueados = rules.bloqueados.filter(id => id !== allow.dataset.shopAllow); if (hiddenReason(catalog.get(allow.dataset.shopAllow), rules)) rules.liberados.push(allow.dataset.shopAllow); });
      const block = event.target.closest('[data-shop-block]');
      if (block) return changeRules(rules => { rules.liberados = rules.liberados.filter(id => id !== block.dataset.shopBlock); rules.bloqueados.push(block.dataset.shopBlock); });
    };
    target.onchange = null;
    target.oninput = event => shopSearchInput(event, target, draw);
    draw(true);
    return { redraw: () => draw() };
  }

  // Os pedidos esperando o mestre em todos os personagens da campanha, com Aprovar e Recusar.
  async function renderGmOrders(target, list) {
    const pending = list.filter(item => item.pedidos && (item.pedidos.pendentes || item.pedidos.aprovados));
    const answers = await Promise.all(pending.map(item => api(`api/personagens/${item.id}/pedidos`).then(answer => ({ item, pedidos: (answer.data && answer.data.pedidos) || [] }))));
    const open = answers.flatMap(({ item, pedidos }) => pedidos.filter(pedido => pedido.status === 'pendente' || pedido.status === 'aprovado').map(pedido => ({ item, pedido })));
    open.sort((a, b) => (a.pedido.status === b.pedido.status ? String(a.pedido.criado).localeCompare(String(b.pedido.criado)) : a.pedido.status === 'pendente' ? -1 : 1));
    const count = open.filter(entry => entry.pedido.status === 'pendente').length;
    const card = ({ item, pedido }) => `<div class="shop-order" style="--k:${(ORDER_CHIP[pedido.status] || [])[1] || 'var(--y)'}"><header><span>${esc(item.nome || 'Sem nome')}${item.donoNome ? ` <small>de ${esc(item.donoNome)}</small>` : ''}</span>${statusChip(pedido.status)}</header>
      <div class="shop-order-items">${pedido.itens.map(entry => `${esc(entry.nome)}${entry.qtd > 1 ? ` ×${entry.qtd}` : ''}`).join(' · ')} // ${eb(pedido.total)}</div>
      ${pedido.nota ? `<p>${esc(pedido.nota)}</p>` : ''}${pedido.erro ? `<p class="cc-bad">${esc(pedido.erro)}</p>` : ''}
      <div class="shop-order-actions">${pedido.status === 'pendente' || pedido.erro ? `<button type="button" class="action" data-gm-aprovar="${item.id}:${pedido.id}">${pedido.status === 'pendente' ? 'Aprovar' : 'Tentar de novo'}</button>` : '<small class="note-status">Esperando o Foundry entregar.</small>'}
        <button type="button" class="action cc-ghost cc-ghost-danger" data-gm-recusar="${item.id}:${pedido.id}">Recusar</button>
        <button type="button" class="action cc-ghost" data-gm-abrir="${item.id}">Abrir a loja</button></div></div>`;
    target.innerHTML = `<h4 class="shop-panel-title">Pedidos da campanha<span>${count} ${count === 1 ? 'pendente' : 'pendentes'}</span></h4>
      ${open.length ? open.map(card).join('') : '<p class="note-status">Nenhum pedido esperando você.</p>'}<p class="cc-shop-msg" data-gm-msg role="status"></p>`;
    return open;
  }

  // ================= Salvamento =================
  // Salva sozinho depois de um tempo sem mudanças; se a conexão cair, guarda neste aparelho.
  function createSaver(doc, statusEl, storage, onSaved = () => {}) {
    let timer = null;
    let chain = Promise.resolve();
    let queued = false;
    let stopped = false;
    const draftKey = `rascunho-personagem-${doc.id}`;
    const show = (text, kind = '') => { if (statusEl) { statusEl.textContent = text; statusEl.className = `cc-save ${kind}`; } };
    // Um salvamento por vez; o que chega enquanto um está em curso vira um só, depois dele.
    function save() {
      if (queued) return chain;
      queued = true;
      chain = chain.then(() => { queued = false; return stopped ? null : saveOnce(); });
      return chain;
    }
    async function saveOnce() {
      show('Salvando…');
      const body = { ...doc, resultado: result(doc) };
      const answer = await api(`api/personagens/${doc.id}`, { method: 'PUT', body });
      if (answer.status === 200) {
        doc.versao = answer.data.personagem.versao;
        doc.atualizado = answer.data.personagem.atualizado;
        doc.estadoFoundry = answer.data.personagem.estadoFoundry;
        // O botão da conta mostra o nome e o retrato do personagem em uso.
        if (window.playerAccount) window.playerAccount.update(answer.data.personagem);
        storage.set(draftKey, '');
        onSaved();
        show(`Salvo às ${new Date(doc.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
      } else if (answer.status === 409) {
        show('Este personagem foi alterado em outro lugar. Recarregue a página para ver a versão nova.', 'bad');
        stopped = true;
        return;
      } else if (!answer.status) {
        storage.set(draftKey, JSON.stringify({ base: doc.versao, doc }));
        show('Sem conexão: as mudanças estão guardadas neste aparelho e vão ser salvas quando voltar.', 'bad');
      } else {
        show(answer.data.erro || 'Não consegui salvar.', 'bad');
      }
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
    const [answer, me] = await Promise.all([api(`api/personagens/${id}`), identity()]);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Você só pode editar os seus personagens. Entre com o seu código em Personagens.')}</div>`; return; }
    // A loja de criação segue as regras da campanha do personagem.
    await loadShopRules(loaded.campanha);
    if (token !== renderToken) return;
    const doc = { ...blank(), ...loaded, lifepath: { ...blank().lifepath, ...(loaded.lifepath || {}) } };
    if (C.roleAliases[doc.role]) doc.role = C.roleAliases[doc.role];
    let step = Math.min(Math.max(Number(doc.passo) || 1, 1), steps.length);
    let mountTab = 'armas'; // aba aberta no quadro Montagem (passo 5)
    // Guarda só o que o jogador mudou na montagem (o resto sai do padrão).
    const setMount = (uid, field, value) => { doc.montagem = doc.montagem || {}; doc.montagem[uid] = { ...(doc.montagem[uid] || {}), [field]: value }; };
    const papel = me.data.papel;
    // Depois de importado no Foundry, o Foundry manda: o que é regra fica só para ver. Continuam abertos nome, apelido,
    // retrato, aparência, notas e Lifepath (o servidor garante o mesmo).
    const locked = Boolean(doc.foundry && doc.foundry.importado);
    const lockBox = html => (locked ? `<fieldset disabled class="cc-locked">${html}</fieldset>` : html);

    root.innerHTML = `<div class="cc-steps" role="tablist">${steps.map((name, index) => `<button type="button" class="map-filter" data-step="${index + 1}">${index + 1}. ${name}</button>`).join('')}</div>
      <p class="cc-save" id="cc-save" role="status"></p><div id="cc-recover"></div>
      ${locked ? '<div class="callout cc-locked-note"><b>Este personagem já está no Foundry.</b> STATs, perícias, Role, equipamento e moradia agora mudam lá, pelo mestre; a ficha mostra a mesa. Aqui você ainda muda o nome, o retrato, a aparência, as notas e o Lifepath.</div>' : ''}
      <div class="cc-layout"><div class="cc-main"><div id="cc-help"></div><div id="cc-step"></div>
      <p class="cc-toolbar"><button class="action" type="button" data-nav="-1">Voltar</button><button class="action" type="button" data-nav="1">Próximo</button><button class="action" type="button" data-cc-sheet>Ver a ficha</button></p></div>
      <div class="cc-summary" role="complementary" aria-label="Resumo do personagem"><details id="cc-summary"></details></div></div>`;
    // Depois de cada salvamento o servidor diz se o personagem mudou desde o envio: o quadro da revisão acompanha.
    const refreshFoundry = () => { const holder = root.querySelector('#cc-step [data-cc-foundry]'); if (holder && !holder.querySelector('[data-cc-send]:disabled')) holder.outerHTML = foundryBox(doc, papel); };
    const saver = createSaver(doc, root.querySelector('#cc-save'), helpers.storage, refreshFoundry);
    const changed = () => { saver.changed(); markSteps(); drawSummary(); };
    // Resumo: aberto em tela larga, recolhido no celular; o jogador abre e fecha à vontade.
    const summaryEl = root.querySelector('#cc-summary');
    summaryEl.open = window.matchMedia('(min-width: 1000px)').matches;
    const drawSummary = () => { summaryEl.innerHTML = summaryHtml(doc); };
    // Ajuda: aberta até o jogador fechar (fica lembrado neste aparelho).
    const helpEl = root.querySelector('#cc-help');
    const drawHelp = () => {
      const [page, text] = HELP[step];
      helpEl.innerHTML = `<details class="cc-help"${helpers.storage.get('criador-ajuda') === 'fechada' ? '' : ' open'}><summary>Como funciona${page ? ` <small>${page}</small>` : ''}</summary>${text}</details>`;
      helpEl.firstElementChild.addEventListener('toggle', event => helpers.storage.set('criador-ajuda', event.target.open ? '' : 'fechada'));
    };

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
      const html = [drawIdentity, drawStats, drawSkills, drawLifepath, drawGear, drawHousing, drawReview][step - 1]();
      stepEl.innerHTML = [2, 3, 5].includes(step) ? lockBox(html) : html;
      if (step === 5 && doc.metodo === 'pacote') renderShop(stepEl.querySelector('#cc-shop'), doc, { onChange: changed, readOnly: Boolean(doc.foundry) });
      if (helpEl.dataset.step !== String(step)) { helpEl.dataset.step = String(step); drawHelp(); }
      if (helpers.linkGlossary) helpers.linkGlossary(stepEl);
      markSteps();
      drawSummary();
    }

    // ---------- 1. Identidade ----------
    function drawIdentity() {
      const role = roleById(doc.role);
      return `${box('Quem é', `<div class="cc-form"><label>Nome<input data-campo="nome" value="${esc(doc.nome)}" maxlength="80"></label><label>Apelido (handle)<input data-campo="apelido" value="${esc(doc.apelido)}" maxlength="80"></label><label class="cc-wide">Aparência e jeito<textarea data-campo="aparencia" rows="2" maxlength="2000">${esc(doc.aparencia)}</textarea></label></div>`)}
        ${box('Retrato', `<div class="cc-portrait-edit">${portraitImg(portraitUrl(doc), 'cc-portrait', doc.nome) || '<div class="cc-portrait cc-portrait-empty">sem retrato</div>'}
          <div class="cc-portrait-tools"><p><label class="action cc-file">Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp" data-portrait-file></label>${portraitUrl(doc) ? ' <button type="button" class="action cc-danger" data-portrait-remove>Tirar retrato</button>' : ''}</p>
          <label>Ou cole um link de imagem (https)<input data-campo="retratoLink" value="${esc(doc.retratoLink || '')}" maxlength="500" placeholder="https://…" inputmode="url"></label>
          <p class="cc-msg" data-portrait-msg role="status"></p>
          <p class="note-status">A imagem é reduzida para 512 px antes de ir para a wiki. Se houver imagem enviada, ela vale no lugar do link. O retrato vai para a ficha e o token no Foundry.</p></div></div>`)}
        ${lockBox(`${box('Role', `<div class="cc-choices">${C.roles.map(item => `<button type="button" class="cc-choice${item.id === doc.role ? ' active' : ''}" data-role="${item.id}"><b>${item.nome}</b><small>${esc(item.habilidade)}</small><span>${esc(item.resumo)}</span></button>`).join('')}</div>
          ${role && role.especializacoes ? `<h4>Especialização de ${role.nome}</h4><div class="cc-choices">${role.especializacoes.map(item => `<button type="button" class="cc-choice${item.id === doc.especializacao ? ' active' : ''}" data-spec="${item.id}"><b>${item.nome}</b><span>Soma o Rank em ${item.pericias.map(skillPt).join(', ')}.</span></button>`).join('')}</div>` : ''}
          <p><button class="action" type="button" data-page="roles2077">Ler as Roles nos anos 2070</button></p>`)}
        ${drawRoleAbilities()}${drawMotorpool()}
        ${box('Método de criação', `<div class="cc-choices">${C.methods.map(item => `<button type="button" class="cc-choice${item.id === doc.metodo ? ' active' : ''}" data-method="${item.id}"><b>${item.nome}</b><span>${esc(item.resumo)}</span></button>`).join('')}</div>`)}`)}`;
    }
    // Sub-habilidades (Solo, Tech, Medtech): − e + em cada uma, até o máximo, com os pontos que faltam.
    function drawRoleAbilities() {
      const spec = abilitySpec(doc);
      if (!spec) return '';
      const used = abilityPoints(doc);
      const rows = spec.itens.map(item => {
        const value = Number((doc.habilidades || {})[item.id]) || 0;
        return `<tr><td><b>${esc(item.nome)}</b><br><small class="cc-desc">${esc(item.desc)}</small></td><td><span class="cc-level"><button type="button" class="action" data-hab-minus="${esc(item.id)}"${value <= 0 ? ' disabled' : ''} aria-label="Menos ${esc(item.nome)}">−</button><b>${value}</b><button type="button" class="action" data-hab-plus="${esc(item.id)}"${value >= spec.max || used >= spec.pontos ? ' disabled' : ''} aria-label="Mais ${esc(item.nome)}">+</button></span></td></tr>`;
      }).join('');
      const derived = (spec.derivadas || []).length ? `<p class="note-status">No Foundry: ${roleAbilityRanks(doc).filter(entry => spec.derivadas.some(item => item.id === entry.nome)).map(entry => `${entry.nome === 'Surgery Skill' ? 'perícia Cirurgia' : 'perícia Tecnologia Médica'} ${entry.rank}`).join(' · ')}.</p>` : '';
      return box(`${esc(spec.titulo)} <small>${spec.pagina}</small>`, `<p class="cc-points${used !== spec.pontos ? ' cc-bad' : ''}">Pontos: ${used} de ${spec.pontos}${spec.max < spec.pontos ? ` · até ${spec.max} em cada` : ''}</p>
        <div class="table-wrap dense"><table class="cc-abilities"><tbody>${rows}</tbody></table></div><p class="note-status">${esc(spec.nota)}</p>${derived}`, ' data-cc-abilities');
    }
    // Oficina da Família do Nomad: 4 escolhas, cada uma um veículo ou um upgrade num veículo já escolhido.
    function drawMotorpool() {
      if (doc.role !== 'nomad') return '';
      const pool = motorpool(doc);
      const rows = Array.from({ length: MP().escolhas }, (_, index) => {
        const current = (doc.oficina || [])[index] || '';
        const options = motorpoolChoices(doc, index);
        const stale = current && !options.some(option => option.value === current);
        return `<label class="cc-motorpool-row">Escolha ${index + 1}<select data-oficina="${index}"><option value="">— escolha —</option>${stale ? `<option value="${esc(current)}" selected>(não vale mais) ${esc(current)}</option>` : ''}${options.map(option => `<option value="${esc(option.value)}"${option.value === current ? ' selected' : ''}>${esc(option.label)}</option>`).join('')}</select></label>`;
      }).join('');
      const fleet = pool.veiculos.length ? `<h4>Veículos da família</h4><ul class="cc-items">${pool.veiculos.map(entry => `<li><b>${esc(entry.veiculo.nome)}</b>${entry.upgrades.length ? `: ${entry.upgrades.map(item => esc(item.upgrade.nome)).join(', ')}` : ''}</li>`).join('')}</ul>` : '';
      const upgradeHelp = `<details class="cc-help-inline"><summary>O que cada upgrade faz</summary><dl class="cc-lifepath">${MP().upgrades.map(item => `<dt>${esc(item.nome)}</dt><dd>${esc(item.desc)}</dd>`).join('')}</dl></details>`;
      return box(`Oficina da Família <small>${MP().pagina}</small>`, `<p>A cada Rank de Moto, o Nomad ganha um veículo de série da família ou um upgrade num veículo dela. No Rank 4: <b>${MP().escolhas} escolhas</b>, entre o Groundcar Compacto, a Moto Estradeira, o Jetski e o Girocóptero, e os upgrades de Rank 1.</p>
        <div class="cc-motorpool">${rows}</div>${fleet}<p class="note-status">Só um veículo da família fica com você de cada vez: troca com a família de um dia para o outro. Destruído, a família conserta em uma semana, por 500eb.</p>${upgradeHelp}`, ' data-cc-motorpool');
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
          <div class="cc-stats">${statKeys.map(stat => `<div class="cc-stat"><span title="${STAT_MEANING[stat]}">${stat}</span><b>${stats[stat] || '—'}</b><small>${doc.sorteio[stat] ? `1d10: ${doc.sorteio[stat]}` : ''}</small><button class="action" type="button" data-roll-stat="${stat}">Rolar</button></div>`).join('')}</div>`;
      } else {
        const points = statPoints(stats);
        body = `<p>Distribua <b>${C.completePackage.pontosStat}</b> pontos; cada STAT de ${C.completePackage.statMin} a ${C.completePackage.statMax}. <b class="${points === C.completePackage.pontosStat ? 'cc-ok' : 'cc-bad'}">Usados: ${points}</b></p>
          <div class="cc-stats">${statKeys.map(stat => `<div class="cc-stat"><span title="${STAT_MEANING[stat]}">${stat}</span><b>${stats[stat]}</b><div class="cc-step-buttons"><button type="button" class="action" data-stat-minus="${stat}" aria-label="Diminuir ${stat}">−</button><button type="button" class="action" data-stat-plus="${stat}" aria-label="Aumentar ${stat}">+</button></div></div>`).join('')}</div>`;
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
      const suggested = doc.metodo === 'pacote' ? suggestedSkills(doc) : new Set();
      // No Pacote Completo, as 20 perícias da Role vêm primeiro e destacadas.
      if (suggested.size) rows.sort((a, b) => Number(suggested.has(b[0])) - Number(suggested.has(a[0])));
      const suggestButton = `<button class="action" type="button" data-skill-suggest>Distribuir sugerido</button>`;
      const header = doc.metodo === 'ratoderua'
        ? '<p>No Rato de Rua as perícias vêm prontas. Só escolha os tipos e a língua.</p>'
        : `<p>${doc.metodo === 'edgerunner' ? 'Distribua os pontos entre as 20 perícias da Role, cada uma de 2 a 6.' : `Distribua os pontos em qualquer perícia, até 6; as básicas (em negrito) começam em 2. As ${suggested.size} sugeridas para ${esc(roleName(doc.role))} vêm primeiro.`} As marcadas ×2 custam o dobro. <b class="${used === budget ? 'cc-ok' : 'cc-bad'}">Pontos: ${used} de ${budget}</b></p><p>${suggestButton} <small class="note-status">Põe os níveis do Rato de Rua da Role (86 pontos certinhos).</small></p>`;
      const line = ([name, level, editable]) => {
        const info = skillInfo.get(name) || {};
        const special = C.specializedSkills[name];
        return `<tr${suggested.has(name) ? ' class="cc-suggested"' : ''}><td>${info.basica ? `<b>${esc(info.pt)}</b>` : esc(special ? special.nome : info.pt || name)}${info.x2 ? ' <small>×2</small>' : ''}${suggested.has(name) ? ' <small class="cc-tag">sugerida</small>' : ''}${special ? ` ${typeSelect(name, doc.tipos[name], `data-tipo="${esc(name)}"`)}` : ''}${name === 'Local Expert (Your Home)' ? ` <select data-casa aria-label="Seu bairro"><option value="">Bairro…</option>${C.homeDistricts.map(place => `<option${place === doc.casa ? ' selected' : ''}>${place}</option>`).join('')}</select>` : ''}${info.desc ? `<small class="cc-desc">${esc(info.desc)}</small>` : ''}</td>
          <td>${info.stat || ''}</td><td class="cc-level">${editable ? `<button type="button" class="action" data-skill-minus="${esc(name)}" aria-label="Diminuir">−</button><b>${level}</b><button type="button" class="action" data-skill-plus="${esc(name)}" aria-label="Aumentar">+</button>` : `<b>${level}</b>`}</td><td><b>${level + (stats[info.stat] || 0)}</b></td></tr>`;
      };
      const specialSuggested = doc.metodo === 'pacote' ? (C.streetratSkills[(roleById(doc.role) || {}).tabelas] || []).filter(([name]) => C.specializedSkills[name]) : [];
      const extras = doc.metodo === 'pacote' ? `<h4>Perícias de escolha extras</h4><p class="note-status">Outras línguas, artes marciais (×2), instrumentos ou ciências.${specialSuggested.length ? ` Sugerida para ${esc(roleName(doc.role))}: ${specialSuggested.map(([name, level]) => `${esc(C.specializedSkills[name].nome)} (${level})`).join(', ')}.` : ''}</p>
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
        ${drawRoleLifepath()}
        ${box('Notas do Lifepath', `<label>O que mais quiser contar da história do personagem. Vai junto para o Foundry, depois do Lifepath da Role.<textarea data-lp-text="roleLifepath" rows="3" maxlength="3000">${esc(lp.roleLifepath || '')}</textarea></label>`)}`;
    }
    async function uploadPortrait(file) {
      const msg = root.querySelector('[data-portrait-msg]');
      if (!file) return;
      if (msg) msg.textContent = 'Enviando…';
      try {
        const imagem = await shrinkImage(file);
        const answer = await api(`api/personagens/${doc.id}/retrato`, { method: 'POST', body: { imagem } });
        if (answer.status !== 200) throw new Error(answer.data.erro || 'Não consegui enviar.');
        doc.retrato = answer.data.retrato;
        if (window.playerAccount) window.playerAccount.update({ id: doc.id, retrato: doc.retrato });
        draw(); changed();
      } catch (error) {
        const current = root.querySelector('[data-portrait-msg]');
        if (current) current.textContent = error.message;
      }
    }
    function drawRoleLifepath() {
      const role = roleById(doc.role);
      if (!role) return box('Lifepath da Role', '<p>Escolha a Role no passo 1 para ver as perguntas dela.</p>');
      const answers = doc.lifepath.role || {};
      const source = role.tabelas !== role.id ? ` O ${esc(role.nome)} de 2077 usa as tabelas do ${role.tabelas === 'exec' ? 'Exec' : 'Rockerboy'} do RED.` : '';
      const field = table => table.dado
        ? `<select data-rlp="${table.id}" aria-label="${esc(table.titulo)}"><option value="">Escolha…</option>${table.linhas.map((line, index) => `<option value="${index + 1}"${Number(answers[table.id]) === index + 1 ? ' selected' : ''}>${index + 1}. ${esc(line)}</option>`).join('')}</select><button type="button" class="action" data-rlp-roll="${table.id}">Rolar 1d${table.dado}</button>`
        : `<div class="cc-rlp-pick">${table.linhas.map((line, index) => `<button type="button" class="map-filter${Number(answers[table.id]) === index + 1 ? ' active' : ''}" data-rlp-pick="${table.id}:${index + 1}">${esc(line)}</button>`).join('')}</div>`;
      return box(`Lifepath da Role: ${esc(role.nome)}`, `<p>Perguntas próprias da Role (RED p. 54–70). Role cada uma ou escolha; algumas só aparecem depois de outra.${source} <button type="button" class="action" data-rlp-all>Rolar tudo da Role</button></p>
        <div class="cc-lp-grid cc-rlp">${roleLpActive(doc).map(table => `<div class="cc-lp"><label>${esc(table.titulo)}</label>${field(table)}</div>`).join('')}</div>`);
    }
    const rollLp = key => helpers.rollDice('1d10');
    const newEnemy = () => ({ quem: rollLp(), causa: rollLp(), recursos: rollLp(), vinganca: rollLp() });

    // ---------- 5. Equipamento ----------
    function drawGear() {
      if (!doc.role || !doc.metodo) return box('Equipamento', '<p>Escolha a Role e o método no passo 1.</p>');
      const stats = computeStats(doc);
      const hum = humanity(doc, stats);
      const free = `<p>Nos anos 2070 (Mission Kit), todo personagem começa com o <b>Neuroport</b>, de graça e sem perder Humanidade. Ele já traz o Neural Link (5 slots), o Personal Link (Interface Plugs), dois Shard Slots, o Biomonitor, o Virtu e o HUD, e é o que todo cyberware que não seja de grau médico exige.</p>`;
      const humanityLine = `<p class="cc-derived"><span>Humanidade <b>${hum.atual}/${hum.max}</b></span><span>Perda <b>${hum.perda}</b></span><span>EMP <b>${hum.emp}</b>${hum.emp !== stats.EMP ? ` <small>(era ${stats.EMP})</small>` : ''}</span></p><p class="note-status">Cada cyberware perde o valor fixo de Humanidade do livro. A EMP é a Humanidade ÷ 10, para baixo.</p>${cyberpsychosis(hum) ? `<p class="note-status cc-bad" data-cc-psicose>${esc(cyberpsychosis(hum))} <button class="cc-link" type="button" data-page="humanity">Ciberpsicose</button></p>` : ''}`;
      const warnings = missingFoundations(doc).map(entry => `<li>${esc(entry.item.nome)} precisa da base (${esc(entry.item.sub)}).</li>`).join('');
      if (doc.metodo === 'pacote') {
        return `${box('Neuroport e Humanidade', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}${box('Loja inicial', '<div id="cc-shop"></div>')}${drawAssembly()}`;
      }
      const pack = C.packages[(roleById(doc.role) || {}).tabelas] || {};
      const label = ([id, qty]) => { const item = catalog.get(id) || {}; return `${esc(item.nome || id)}${qty > 1 ? ` ×${qty}` : ''}`; };
      const kit2077 = uses2077Kit(doc, pack);
      const categoryBox = (category, title) => `<h4>${title}</h4><ul class="cc-items">${(pack[category] || []).map((entry, index) => {
        if (kit2077 && category === 'equipamento' && isRedDeckEntry(entry)) return '';
        if (!entry.ou) return `<li>${label(entry)}${(C.free2077.some(free2077 => free2077.id === entry[0]) || C.neuroportIncludes.includes(entry[0])) && category === 'cyberware' ? ' <small class="cc-ok">já vem no Neuroport</small>' : ''}</li>`;
        const key = `${category}:${index}`;
        const chosen = Number(doc.escolhas[key]) || 0;
        return `<li>${entry.ou.map((option, k) => `<label class="cc-radio"><input type="radio" name="esc-${key}" data-escolha="${key}" value="${k}"${k === chosen ? ' checked' : ''}> ${option.map(label).join(' + ')}</label>`).join(' <small>ou</small> ')}</li>`;
      }).join('')}</ul>`;
      let kitBox = '';
      if (pack.kit2077) {
        const chosen = chosenQuickhacks(doc, pack);
        const deck = catalog.get(pack.kit2077.deck) || {};
        const hacks = kit2077 ? `<h4>Quickhacks: ${chosen.length} de ${pack.kit2077.escolher}</h4><div class="cc-hacks">${pack.kit2077.quickhacks.map(([id, text]) => {
          const on = chosen.includes(id);
          return `<label class="cc-radio"><input type="checkbox" data-quickhack="${id}"${on ? ' checked' : ''}${!on && chosen.length >= pack.kit2077.escolher ? ' disabled' : ''}> <b>${esc((catalog.get(id) || {}).nome || id)}</b> <small>${esc(text)}</small></label>`;
        }).join('')}</div>` : '';
        kitBox = box('Kit de Netrunner', `<p>Dá para trocar o cyberdeck e os programas do RED pelo deck do suplemento de fã, com quickhacks dele. Os do Mission Kit o netrunner já faz pelo Rank de Interface. O resto do pacote não muda.</p>
          <p><label class="cc-radio"><input type="radio" name="kitnet" data-kitnet="red"${kit2077 ? '' : ' checked'}> <b>Kit do RED:</b> Cyberdeck (7 slots) e os programas do pacote, logo abaixo</label>
          <label class="cc-radio"><input type="radio" name="kitnet" data-kitnet="2077"${kit2077 ? ' checked' : ''}> <b>Kit do suplemento de fã:</b> ${esc(deck.nome || 'Militech Hunter MK.1')} (7 slots) e ${pack.kit2077.escolher} quickhacks de 100eb</label></p>${hacks}`);
      }
      return `${kitBox}${box('Pacote da Role', `<p>No ${esc((methodById(doc.metodo) || {}).nome)} o equipamento vem pronto. Escolha onde houver opção.</p>${categoryBox('armas', 'Armas e armaduras')}${categoryBox('equipamento', 'Equipamento')}${kit2077 ? `<ul class="cc-items"><li>${esc((catalog.get(pack.kit2077.deck) || {}).nome || '')} <small class="cc-ok">kit de 2077</small></li>${chosenQuickhacks(doc, pack).map(id => `<li>${esc((catalog.get(id) || {}).nome || id)} <small class="cc-ok">kit de 2077</small></li>`).join('')}</ul>` : ''}${categoryBox('moda', 'Moda')}${categoryBox('cyberware', 'Cyberware')}`)}
        ${box('Neuroport e Humanidade', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}
        ${box('Mais 500eb para gastar', '<p>Além do pacote, você ganha 500eb para comprar outros itens ou guardar. Use a loja.</p><p><button type="button" class="action" data-cc-shop>Abrir a loja</button></p>')}
        ${drawAssembly()}`;
    }

    // ---------- 5. Montagem ----------
    // Como o equipamento vai estar no Foundry: o que está equipado, a munição em cada arma, os acessórios,
    // o cyberware em cada base e os programas no cyberdeck. Sai pronto; o jogador só muda o que quiser.
    function drawAssembly() {
      if (!doc.role || !doc.metodo) return '';
      const mont = assembly(doc);
      const rows = mont.rows;
      const label = row => `${esc(row.nome || row.item.nome)}${row.qtd > 1 ? ` ×${row.qtd}` : ''}`;
      const usoSelect = row => `<select data-mont-uso="${row.uid}" aria-label="Uso">${Object.entries(USOS).map(([id, name]) => `<option value="${id}"${row.uso === id ? ' selected' : ''}>${name}</option>`).join('')}</select>`;
      const slotsText = row => `<small class="cc-slots${mont.free(row) < 0 ? ' cc-bad' : ''}">${capacityOf(row) - mont.free(row)} de ${capacityOf(row)} slots</small>`;
      const children = parent => rows.filter(row => row.em === parent.uid);
      // Mover um item para outro pai que caiba (ou soltar).
      const moveSelect = (row, parents, looseLabel = 'tirar') => `<select data-mont-em="${row.uid}" aria-label="Onde fica"><option value="-"${row.em === '-' || !row.em ? ' selected' : ''}>${looseLabel}</option>${parents.filter(parent => parentFits(row, parent) && (parent.uid === row.em || mont.free(parent) >= sizeOf(row))).map(parent => `<option value="${parent.uid}"${parent.uid === row.em ? ' selected' : ''}>${label(parent)}</option>`).join('')}</select>`;
      const addSelect = (parent, candidates, text) => {
        const options = candidates.filter(row => row.em !== parent.uid && parentFits(row, parent) && mont.free(parent) >= sizeOf(row));
        return options.length ? `<select data-mont-em-para="${parent.uid}" aria-label="${text}"><option value="">${text}…</option>${options.map(row => `<option value="${row.uid}">${label(row)}${row.em && row.em !== '-' ? ' (tirar de onde está)' : ''}</option>`).join('')}</select>` : '';
      };
      const tabs = [['armas', 'Armas', 'arma'], ['armadura', 'Armadura e roupa', ['armadura', 'roupa']], ['cyberware', 'Cyberware', ['cyberBase', 'cyberOpcao']], ['net', 'Netrunning', ['deck', 'deckItem']], ['outros', 'Outros', ['item', 'municao']]];
      const count = kinds => rows.filter(row => [].concat(kinds).includes(row.tipo)).length;
      let body = '';
      if (mountTab === 'armas') {
        const weapons = rows.filter(row => row.tipo === 'arma');
        const accessories = rows.filter(row => row.tipo === 'acessorio');
        body = weapons.map(weapon => {
          const a = weapon.item.arma;
          const ammo = rows.filter(row => row.tipo === 'municao' && ammoFits(row, weapon));
          const loaded = a.distancia && a.pente ? `<label class="cc-mount-field">Munição <select data-mont-municao="${weapon.uid}"><option value="-"${!weapon.municao || weapon.municao === '-' ? ' selected' : ''}>descarregada</option>${ammo.map(row => `<option value="${row.uid}"${weapon.municao === row.uid ? ' selected' : ''}>${label(row)}</option>`).join('')}</select></label>${ammo.length ? '' : ' <small class="cc-wait">sem munição compatível no inventário</small>'}` : '';
          const attached = children(weapon).map(row => `<li>${label(row)} <button type="button" class="action cc-danger" data-mont-soltar="${row.uid}">Tirar</button></li>`).join('');
          const slots = a.slots && a.distancia && !a.exotica ? `<div class="cc-mount-children">${slotsText(weapon)}${attached ? `<ul class="cc-items">${attached}</ul>` : ''}${addSelect(weapon, accessories, 'Encaixar acessório')}</div>` : '';
          return `<div class="cc-mount-row"><div><b>${label(weapon)}</b><br><small>${esc([a.dano, `CDT ${a.cdt}`, a.pente ? `pente ${a.pente}` : '', `${a.maos} mão${a.maos > 1 ? 's' : ''}`].filter(Boolean).join(' · '))}</small></div><div class="cc-mount-controls">${usoSelect(weapon)}${loaded}</div>${slots}</div>`;
        }).join('') || '<p class="note-status">Nenhuma arma.</p>';
        const loose = accessories.filter(row => !row.em || row.em === '-');
        if (loose.length) body += `<p class="note-status">Acessórios soltos (vão para o inventário): ${loose.map(label).join(', ')}.</p>`;
      } else if (mountTab === 'armadura') {
        const armors = rows.filter(row => row.tipo === 'armadura' && !row.item.armadura.escudo);
        const location = (loc, title) => {
          const covering = armors.filter(row => armorLocations(row.item).includes(loc));
          const current = covering.find(row => row.uso === 'equipado');
          return covering.length ? `<div class="cc-mount-row"><div><b>${title}</b> <small>SP ${mont.sp[loc]}</small></div><div class="cc-options">${[...covering, null].map(row => `<label class="cc-radio"><input type="radio" name="mont-${loc}" data-mont-armadura="${loc}" value="${row ? row.uid : '-'}"${row === (current || null) ? ' checked' : ''}> ${row ? `${label(row)} <small>SP ${row.item.armadura[loc]}${row.item.armadura.penalidade ? ` · −${row.item.armadura.penalidade} REF/DEX/MOVE` : ''}</small>` : 'Nenhuma'}</label>`).join('')}</div></div>` : '';
        };
        const shields = rows.filter(row => row.tipo === 'armadura' && row.item.armadura.escudo).map(row => `<div class="cc-mount-row"><div><b>${label(row)}</b><br><small>Escudo, ${row.item.armadura.escudo} HP</small></div><div class="cc-mount-controls">${usoSelect(row)}</div></div>`).join('');
        const clothes = rows.filter(row => row.tipo === 'roupa');
        body = `${location('corpo', 'Corpo')}${location('cabeca', 'Cabeça')}${shields}
          ${mont.penalidade ? `<p class="cc-warn">Armadura pesada: −${mont.penalidade} em REF, DEX e MOVE enquanto vestida (RED p. 97).</p>` : ''}
          ${clothes.length ? `<h4>Roupas</h4><div class="cc-options">${clothes.map(row => `<label class="cc-radio"><input type="checkbox" data-mont-vestir="${row.uid}"${row.uso === 'equipado' ? ' checked' : ''}> Vestindo: ${label(row)}</label>`).join('')}</div>` : ''}` || '<p class="note-status">Nenhuma armadura nem roupa.</p>';
      } else if (mountTab === 'cyberware') {
        const bases = rows.filter(row => row.tipo === 'cyberBase' && NEEDS_BASE.includes(row.item.cyber.tipo));
        const options = rows.filter(row => row.tipo === 'cyberOpcao');
        body = bases.map(base => `<div class="cc-mount-row"><div><b>${label(base)}</b></div><div class="cc-mount-children">${slotsText(base)}${children(base).length ? `<ul class="cc-items">${children(base).map(row => `<li>${label(row)} <small>${sizeOf(row)} slot${sizeOf(row) > 1 ? 's' : ''}</small> ${bases.filter(other => other.item.cyber.tipo === row.item.cyber.tipo).length > 1 ? moveSelect(row, bases, 'tirar') : ''}</li>`).join('')}</ul>` : ''}${addSelect(base, options, 'Instalar opção')}</div></div>`).join('');
        const withoutBase = options.filter(row => NEEDS_BASE.includes(row.item.cyber.tipo) && (!row.em || row.em === '-'));
        if (withoutBase.length) body += `<p class="cc-warn">Sem base (não instala no Foundry): ${withoutBase.map(label).join(', ')}. Compre ou escolha a base do mesmo tipo.</p>`;
        const body2 = options.filter(row => !NEEDS_BASE.includes(row.item.cyber.tipo));
        if (body2.length) body += `<p class="note-status">No corpo (interno, externo e fashionware, sem base): ${body2.map(label).join(', ')}.</p>`;
        if (!body) body = '<p class="note-status">Nenhum cyberware com opções.</p>';
      } else if (mountTab === 'net') {
        const decks = rows.filter(row => row.tipo === 'deck');
        const items = rows.filter(row => row.tipo === 'deckItem');
        body = decks.map(deck => `<div class="cc-mount-row"><div><b>${label(deck)}</b>${deck.uso === 'equipado' ? ' <small class="cc-ok">deck ativo</small>' : ''}</div><div class="cc-mount-controls">${usoSelect(deck)}</div><div class="cc-mount-children">${slotsText(deck)}${children(deck).length ? `<ul class="cc-items">${children(deck).map(row => `<li>${label(row)} <small>${sizeOf(row)} slot${sizeOf(row) > 1 ? 's' : ''}</small> ${decks.length > 1 ? moveSelect(row, decks) : `<button type="button" class="action cc-danger" data-mont-soltar="${row.uid}">Tirar</button>`}</li>`).join('')}</ul>` : ''}${addSelect(deck, items, 'Instalar programa ou hardware')}</div></div>`).join('');
        const loose = items.filter(row => !row.em || row.em === '-');
        if (loose.length) body += `<p class="note-status">Fora do deck (vão para o inventário): ${loose.map(label).join(', ')}.</p>`;
        if (!body) body = '<p class="note-status">Nenhum cyberdeck nem programa.</p>';
      } else {
        const gear = rows.filter(row => row.tipo === 'item');
        const ammo = rows.filter(row => row.tipo === 'municao');
        body = `${gear.map(row => `<div class="cc-mount-row"><div><b>${label(row)}</b></div><div class="cc-mount-controls">${usoSelect(row)}</div></div>`).join('')}${ammo.length ? `<p class="note-status">Munição: ${ammo.map(label).join(', ')}. O que estiver carregado sai do total no Foundry.</p>` : ''}` || '<p class="note-status">Nada aqui.</p>';
      }
      return box('Montagem', `<p>Como o equipamento chega no Foundry: o que está equipado, a munição de cada arma, os acessórios, o cyberware em cada base e os programas no cyberdeck. Já vem montado; mude o que quiser.</p>
        <div class="map-filter-list cc-mount-tabs">${tabs.map(([id, name, kinds]) => `<button type="button" class="map-filter${id === mountTab ? ' active' : ''}" data-mont-tab="${id}">${name} <small>${count(kinds)}</small></button>`).join('')}</div>
        <div class="cc-mount">${body}</div>`, ' data-cc-mount');
    }

    // ---------- 6. Moradia ----------
    function drawHousing() {
      if (!doc.role) return box('Moradia', '<p>Escolha a Role no passo 1.</p>');
      const H = C.housing;
      const home = housing(doc);
      const base = housingBase(doc);
      const baseHome = H.moradias.find(item => item.id === base.moradia);
      const baseLife = H.estilos.find(item => item.id === base.estilo);
      // Cada opção mostra o preço por mês e, se for melhor que o padrão, quanto sai do dinheiro inicial no primeiro mês.
      const tag = (item, cost, baseCost, isBase) => isBase ? ' <small class="cc-ok">padrão da Role: 1º mês grátis</small>' : cost > baseCost ? ` <small class="cc-wait">+${eb(cost - baseCost)} no 1º mês</small>` : '';
      const option = (name, attr, item, checked, price, note) => `<label class="cc-radio cc-option"><input type="radio" name="${name}" ${attr}="${item.id}"${checked ? ' checked' : ''}> <b>${esc(item.nome)}</b> <small>${price}</small>${note}${item.desc ? `<small class="cc-desc">${esc(item.desc)}</small>` : ''}</label>`;
      const homes = H.moradias.filter(item => allowedFor(item, doc.role)).map(item => option('moradia', 'data-moradia', item, item.id === home.tipo, item.aluguel ? `${eb(item.aluguel)}/mês` : 'sem aluguel', tag(item, item.aluguel, baseHome.aluguel, item.id === base.moradia))).join('');
      const lives = H.estilos.filter(item => allowedFor(item, doc.role)).map(item => option('estilo-vida', 'data-estilo-vida', item, item.id === home.estiloId, item.custo ? `${eb(item.custo)}/mês` : 'sem custo', tag(item, item.custo, baseLife.custo, item.id === base.estilo))).join('');
      const traumaId = (home.traumaTeam || {}).id || 'nenhum';
      const traumas = H.traumaTeam.map(item => option('trauma', 'data-trauma', item, item.id === traumaId, item.custo ? `${eb(item.custo)}/mês` : '', item.custo ? ` <small class="cc-wait">${eb(item.custo)} no 1º mês</small>` : '')).join('');
      const modaId = (home.moda || {}).id || '';
      const modas = `<select data-moda aria-label="Estilo de moda">${H.modas.map(item => `<option value="${item.id}"${item.id === modaId ? ' selected' : ''}>${esc(item.nome)}</option>`).join('')}</select>${home.moda ? `<p class="note-status">${esc(home.moda.desc)}</p>` : ''}`;
      const cash = money(doc);
      const total = `<p class="cc-derived cc-housing-total"><span>Por mês <b>${eb(home.mensal)}</b></span><span>1º mês <b>${home.primeiroMes ? eb(home.primeiroMes) : 'grátis'}</b></span>${doc.metodo ? `<span>Dinheiro depois disso <b class="${cash.saldo < 0 ? 'cc-bad' : ''}">${eb(cash.saldo)}</b></span>` : ''}</p>`;
      return `${lockBox(`${box('Quanto custa', `${total}<p class="note-status">No dia 1º de cada mês, o aluguel, o estilo de vida e o Trauma Team saem do dinheiro. No Mission Kit, viver de Kibble ou em hotel cápsula também custa Humanidade todo mês.</p>`)}
        ${box('Moradia', `<div class="cc-options">${homes}</div>`)}
        ${box('Estilo de vida', `<div class="cc-options">${lives}</div>`)}
        ${box('Trauma Team', `<div class="cc-options">${traumas}</div><p class="note-status">Com Agent e Biomonitor, a Trauma Team é chamada sozinha quando o HP fica abaixo do BODY ou há desmembramento (RED p. 223).</p>`)}
        ${box('Estilo de moda', `<p>O visual do personagem nas quatro modas do suplemento de fã (p. 7–8, opcional). Ajuda a escolher as roupas na loja e a descrever o personagem.</p>${modas}`)}`)}
        ${box('Notas', `<label>Aparência da casa, contatos, o que quiser<textarea data-campo="notas" rows="3" maxlength="5000">${esc(doc.notas)}</textarea></label>`)}`;
    }

    // ---------- 7. Revisão ----------
    function drawReview() {
      const issues = pending(doc);
      return `${box('Pendências', issues.length ? `<ul class="cc-warn">${issues.map(issue => `<li><button type="button" class="cc-link" data-step="${issue.step}">${steps[issue.step - 1]}</button>: ${esc(issue.text)}</li>`).join('')}</ul><p class="note-status">Nada aqui impede de salvar nem de enviar: o mestre decide quando importar.</p>` : '<p class="cc-ok">Tudo certo. Envie para o mestre no quadro abaixo.</p>')}${foundryBox(doc, papel)}${sheetHtml(doc)}`;
    }

    // ---------- Eventos ----------
    root.onclick = event => {
      const target = event.target;
      const stepButton = target.closest('[data-step]');
      if (stepButton) return go(Number(stepButton.dataset.step));
      const nav = target.closest('[data-nav]');
      if (nav) return go(step + Number(nav.dataset.nav));
      if (target.closest('[data-cc-send]')) return sendToGm(doc, papel, stepEl, () => saver.now());
      if (target.closest('[data-cc-sheet]')) { saver.now(); return helpers.openPage('ficha', { section: doc.id }); }
      if (target.closest('[data-cc-shop]')) { saver.now(); return helpers.openPage('loja', { section: doc.id }); }
      const role = target.closest('[data-role]');
      if (role) { if (doc.role !== role.dataset.role) { doc.role = role.dataset.role; doc.especializacao = ''; doc.escolhas = {}; doc.tipos = {}; doc.pericias = {}; doc.lifepath.role = {}; doc.habilidades = {}; doc.oficina = []; } draw(); return changed(); }
      // Montagem: abas e "Tirar" (o item fica solto no inventário).
      const mountTabButton = target.closest('[data-mont-tab]');
      if (mountTabButton) { mountTab = mountTabButton.dataset.montTab; return draw(); }
      const loosen = target.closest('[data-mont-soltar]');
      if (loosen) { setMount(loosen.dataset.montSoltar, 'em', '-'); draw(); return changed(); }
      // Sub-habilidades da Role: até o máximo de cada uma e o total de pontos.
      const habPlus = target.closest('[data-hab-plus]');
      const habMinus = target.closest('[data-hab-minus]');
      if (habPlus || habMinus) {
        const abilitySpecNow = abilitySpec(doc);
        const name = (habPlus || habMinus).dataset[habPlus ? 'habPlus' : 'habMinus'];
        const value = Number((doc.habilidades = doc.habilidades || {})[name]) || 0;
        if (habPlus && abilitySpecNow && value < abilitySpecNow.max && abilityPoints(doc) < abilitySpecNow.pontos) doc.habilidades[name] = value + 1;
        if (habMinus && value > 0) doc.habilidades[name] = value - 1;
        draw(); return changed();
      }
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
      if (target.closest('[data-portrait-remove]')) {
        api(`api/personagens/${doc.id}/retrato`, { method: 'DELETE' }).then(answer => {
          if (answer.status !== 200) { const msg = root.querySelector('[data-portrait-msg]'); if (msg) msg.textContent = answer.data.erro || 'Não consegui tirar.'; return; }
          doc.retrato = null; doc.retratoLink = ''; draw(); changed();
          if (window.playerAccount) window.playerAccount.update({ id: doc.id, retrato: '' });
        });
        return;
      }
      if (target.closest('[data-skill-suggest]')) {
        wikiPopup.confirm({ title: 'Distribuir o sugerido', html: `<p>Os níveis das perícias viram os sugeridos para <b>${esc(roleName(doc.role))}</b>.</p><p class="note-status">Os níveis que você pôs serão substituídos.</p>`, ok: 'Trocar pelos sugeridos' })
          .then(sure => { if (sure) { applySuggested(doc); draw(); changed(); } });
        return;
      }
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
        rollRoleLp(doc, sides => helpers.rollDice(`1d${sides}`));
        draw(); return changed();
      }
      if (target.closest('[data-rlp-all]')) { rollRoleLp(doc, sides => helpers.rollDice(`1d${sides}`)); draw(); return changed(); }
      const rlpRoll = target.closest('[data-rlp-roll]');
      if (rlpRoll) {
        const table = roleLpTables(doc).find(item => item.id === rlpRoll.dataset.rlpRoll);
        if (table) doc.lifepath.role = { ...doc.lifepath.role, [table.id]: helpers.rollDice(`1d${table.dado}`) };
        draw(); return changed();
      }
      const rlpPick = target.closest('[data-rlp-pick]');
      if (rlpPick) { const [id, value] = rlpPick.dataset.rlpPick.split(':'); doc.lifepath.role = { ...doc.lifepath.role, [id]: Number(value) }; draw(); return changed(); }
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
      else if (target.matches('[data-rlp]')) { doc.lifepath.role = { ...doc.lifepath.role, [target.dataset.rlp]: Number(target.value) || '' }; }
      else if (target.matches('[data-lp-item]')) { const [kind, index] = target.dataset.lpItem.split(':'); doc.lifepath[kind][Number(index)] = Number(target.value) || 1; }
      else if (target.matches('[data-lp-enemy]')) { const [index, part] = target.dataset.lpEnemy.split(':'); doc.lifepath.inimigos[Number(index)][part] = Number(target.value) || 1; }
      else if (target.matches('[data-escolha]')) { doc.escolhas[target.dataset.escolha] = Number(target.value); }
      else if (target.matches('[data-kitnet]')) { doc.kitNet = target.dataset.kitnet; }
      else if (target.matches('[data-mont-uso]')) { setMount(target.dataset.montUso, 'uso', target.value); }
      else if (target.matches('[data-mont-municao]')) { setMount(target.dataset.montMunicao, 'municao', target.value); }
      else if (target.matches('[data-mont-em]')) { setMount(target.dataset.montEm, 'em', target.value); }
      else if (target.matches('[data-mont-em-para]')) { if (!target.value) return; setMount(target.value, 'em', target.dataset.montEmPara); }
      else if (target.matches('[data-mont-armadura]')) {
        const location = target.dataset.montArmadura;
        for (const row of assembly(doc).rows.filter(item => item.tipo === 'armadura' && !item.item.armadura.escudo && armorLocations(item.item).includes(location))) setMount(row.uid, 'uso', row.uid === target.value ? 'equipado' : 'carregando');
      }
      else if (target.matches('[data-mont-vestir]')) { setMount(target.dataset.montVestir, 'uso', target.checked ? 'equipado' : 'carregando'); }
      else if (target.matches('[data-oficina]')) { const list = Array.from({ length: MP().escolhas }, (_, index) => (doc.oficina || [])[index] || ''); list[Number(target.dataset.oficina)] = target.value; doc.oficina = list; }
      else if (target.matches('[data-campo="retratoLink"]')) { doc.retratoLink = target.value.trim(); }
      else if (target.matches('[data-portrait-file]')) { uploadPortrait(target.files && target.files[0]); return; }
      else if (target.matches('[data-quickhack]')) {
        const id = target.dataset.quickhack;
        const list = (doc.quickhacks || []).filter(item => item !== id);
        doc.quickhacks = target.checked ? [...list, id] : list;
      }
      else if (target.matches('[data-moradia]')) { doc.moradia = target.dataset.moradia; }
      else if (target.matches('[data-estilo-vida]')) { doc.estiloVida = target.dataset.estiloVida; }
      else if (target.matches('[data-trauma]')) { doc.traumaTeam = target.dataset.trauma; }
      else if (target.matches('[data-moda]')) { doc.estiloModa = target.value; }
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
  const ruleCount = () => `${shopRules.liberados.length} liberados e ${shopRules.bloqueados.length} escondidos um a um (botões Liberar e Esconder no catálogo).`;

  async function setupShopPage(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    shopState.busca = '';
    shopState.painel = '';
    shopState.mostrar = PAGE;
    const root = content.querySelector('#cc-root');
    const [me, list] = await Promise.all([identity(), api(`api/personagens${campaignQuery()}`), loadShopRules()]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const gm = me.data.papel === 'mestre';
    const mine = (list.data.personagens || []).filter(item => !item.publico);
    const inUse = window.playerAccount && window.playerAccount.selected();
    const wanted = helpers.target && helpers.target.section;
    // O mestre começa na visão dele (pedidos, regras e catálogo) e escolhe um personagem para ver a loja daquele.
    const chosen = wanted || (gm ? '' : mine.some(item => item.id === inUse) ? inUse : (mine[0] || {}).id);
    // O título e a linha de baixo mudam com o modo (loja inicial, loja da campanha, visão do mestre).
    const head = content.querySelector('.page-head');
    const setHead = (title, line) => {
      if (!head) return;
      head.querySelector('h2').innerHTML = title;
      head.querySelector('.eyebrow').textContent = line;
    };
    const picker = mine.length || gm ? `<label class="shop-picker"><span>${gm ? 'Ver a loja de' : 'Personagem'}</span><select data-shop-pc>${gm ? `<option value=""${chosen ? '' : ' selected'}>Visão do mestre</option>` : ''}${mine.map(item => `<option value="${item.id}"${item.id === chosen ? ' selected' : ''}>${esc(item.nome || 'Sem nome')}</option>`).join('')}</select></label><span class="cc-save" id="cc-save" role="status"></span>` : '';
    root.innerHTML = `${picker ? `<div class="cc-shop-top">${picker}</div>` : ''}<div id="cc-shop"></div>`;
    const select = root.querySelector('[data-shop-pc]');
    if (select) select.onchange = event => helpers.openPage('loja', event.target.value ? { section: event.target.value } : undefined, 'replace');
    const shopEl = root.querySelector('#cc-shop');
    if (gm && !chosen) {
      setHead('Loja <span class="h2-sub">// mestre</span>', 'Pedidos, regras e catálogo da campanha');
      return setupGmShop(shopEl, mine, helpers, token);
    }
    if (!mine.length) { shopEl.innerHTML = `<div class="callout">${me.data.papel === 'visitante' ? 'Entre com o seu código em Personagens para comprar.' : 'Crie um personagem primeiro, em Personagens.'}</div>`; return; }
    const answer = await api(`api/personagens/${chosen}`);
    if (token !== renderToken) return;
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { shopEl.innerHTML = '<div class="callout">Não consegui abrir este personagem.</div>'; return; }
    const doc = { ...blank(), ...loaded };
    if (C.roleAliases[doc.role]) doc.role = C.roleAliases[doc.role];
    if (!doc.metodo) {
      if (gm) { setHead('Loja', 'Catálogo // sem método de criação'); renderShop(shopEl, null, { gm }); return; }
      shopEl.innerHTML = '<div class="callout">Escolha o método de criação no criador antes de comprar: ele define quanto dinheiro você tem.</div>';
      return;
    }
    // Depois do Foundry: a loja da campanha (pedidos que o mestre aprova).
    if (doc.foundry && doc.foundry.importado) {
      setHead('Loja', `Loja da campanha // pedidos para o mestre${doc.nome ? ` // ${doc.nome}` : ''}`);
      renderCampaignShop(shopEl, doc, { gm });
      return;
    }
    setHead('Loja', `Loja inicial // criação do personagem${doc.nome ? ` // ${doc.nome}` : ''}`);
    const saver = createSaver(doc, root.querySelector('#cc-save'), helpers.storage);
    renderShop(shopEl, doc, { onChange: () => saver.changed(), readOnly: Boolean(doc.foundry), gm });
  }

  // A visão do mestre: os pedidos da campanha, as regras da loja inicial (fora do redesenho do catálogo, para o que ele
  // digita não se perder) e o catálogo com os botões Esconder e Liberar.
  async function setupGmShop(target, list, helpers, token) {
    target.innerHTML = `<div class="shop-gm">
      <div class="shop-g2">
        <section class="shop-panel" data-gm-orders><h4 class="shop-panel-title">Pedidos da campanha</h4><p class="note-status">Carregando os pedidos…</p></section>
        <section class="shop-panel cc-rules-panel" data-cc-rules><h4 class="shop-panel-title">Regras da loja inicial<span>${esc((activeCampaign() || {}).name || 'campanha atual')}</span></h4>
          <p class="note-status">O que fica de fora quando os jogadores montam o personagem. A loja da campanha (depois do Foundry) mostra tudo: lá, cada pedido passa por você.</p>
          <label class="shop-field">Teto de preço por item (eb)<input type="number" min="0" step="50" data-rule-teto value="${shopRules.teto}"></label>
          <span class="shop-label">Escondido na criação</span>
          <div class="map-filter-list shop-toggles">${Object.entries(SHOP_TAG_NAMES).map(([tag, name]) => `<button type="button" class="map-filter shop-chip" data-rule-tag="${tag}" aria-pressed="${shopRules.esconder.includes(tag)}">${esc(name)}</button>`).join('')}</div>
          <div class="cc-toolbar"><button class="action" type="button" data-rule-save>Salvar regras</button><span class="cc-save" id="cc-rules-msg" role="status"></span></div>
          <p class="note-status" data-rule-count>${ruleCount()}</p>
        </section>
      </div>
      <section class="shop-panel shop-catalog-panel"><h4 class="shop-panel-title">Catálogo com controles do mestre<span>${shop.itens.length} itens</span></h4><div data-gm-catalog></div></section>
    </div>`;
    const rulesBox = target.querySelector('[data-cc-rules]');
    const ordersBox = target.querySelector('[data-gm-orders]');
    const onRules = () => { rulesBox.querySelector('[data-rule-count]').textContent = ruleCount(); };
    const catalogView = renderGmCatalog(target.querySelector('[data-gm-catalog]'), { onRules });
    rulesBox.onclick = async event => {
      const tag = event.target.closest('[data-rule-tag]');
      if (tag) { tag.setAttribute('aria-pressed', String(tag.getAttribute('aria-pressed') !== 'true')); return; }
      if (!event.target.closest('[data-rule-save]')) return;
      const rules = { ...shopRules, teto: Number(rulesBox.querySelector('[data-rule-teto]').value) || 0, esconder: [...rulesBox.querySelectorAll('[data-rule-tag][aria-pressed="true"]')].map(button => button.dataset.ruleTag) };
      const answer = await saveShopRules(rules);
      const status = rulesBox.querySelector('#cc-rules-msg');
      if (answer.status !== 200) { status.textContent = answer.data.erro || 'Não consegui salvar.'; status.className = 'cc-save bad'; return; }
      shopRules = answer.data.regras;
      status.textContent = 'Regras salvas.';
      status.className = 'cc-save ok';
      onRules();
      catalogView.redraw();
    };
    // Aprovar, recusar ou abrir a loja do personagem; depois, os pedidos de novo.
    const refresh = async () => {
      const fresh = await api(`api/personagens${campaignQuery()}`);
      if (token !== renderToken) return [];
      return renderGmOrders(ordersBox, (fresh.data.personagens || []).filter(item => !item.publico));
    };
    let open = await renderGmOrders(ordersBox, list);
    ordersBox.onclick = async event => {
      const pick = event.target.closest('[data-gm-aprovar], [data-gm-recusar], [data-gm-abrir]');
      if (!pick) return;
      if (pick.dataset.gmAbrir) return helpers.openPage('loja', { section: pick.dataset.gmAbrir });
      const [cid, pid] = (pick.dataset.gmAprovar || pick.dataset.gmRecusar).split(':');
      const entry = open.find(item => item.item.id === cid && item.pedido.id === pid);
      let body = {};
      if (pick.dataset.gmRecusar) {
        const motivo = await askRefusal(entry && entry.item.nome, (entry && entry.pedido) || { itens: [] });
        if (motivo === null) return;
        body = { motivo };
      }
      const answer = await api(`api/personagens/${cid}/pedidos/${pid}/${pick.dataset.gmAprovar ? 'aprovar' : 'recusar'}`, { method: 'POST', body });
      if (answer.status !== 200) { const msg = ordersBox.querySelector('[data-gm-msg]'); if (msg) { msg.textContent = answer.data.erro || 'Não consegui.'; msg.classList.add('cc-bad'); } return; }
      open = await refresh();
    };
  }

  // O personagem em uso mudou (no menu da conta): a lista de Personagens marca o novo.
  document.addEventListener('wiki:personagem', event => {
    const id = event.detail && event.detail.id;
    document.querySelectorAll('[data-cc-card]').forEach(card => card.classList.toggle('cc-selected', card.dataset.ccCard === id));
  });

  // ---------------- Páginas ----------------
  const holder = '<div id="cc-root">Carregando…</div>';
  window.characterCreator = {
    pages: {
      personagens: { eyebrow: 'Campanha / jogadores', title: 'Personagens', lede: 'Os personagens dos jogadores, salvos na wiki. Crie, edite e consulte; o mestre leva para o Foundry quando estiver pronto.', html: holder, setup: setupList },
      ficha: { eyebrow: 'Personagens / ficha', title: 'Ficha', lede: 'A ficha para consulta durante o jogo.', html: holder, setup: setupSheet, manterAlvo: true },
      criador: { eyebrow: 'Personagens / criador', title: 'Criador de personagem', lede: 'Passo a passo do Cyberpunk RED nos anos 2070 (Mission Kit). Tudo é salvo sozinho; os avisos mostram o que falta, mas não impedem de continuar.', html: holder, setup: setupCreator, manterAlvo: true },
      loja: { eyebrow: 'Personagens / loja', title: 'Loja', lede: 'Antes do Foundry, monta o equipamento da criação. Depois, vira pedidos que o mestre aprova e o Foundry entrega na ficha.', html: holder, setup: setupShopPage, manterAlvo: true }
    },
    // Para os testes e o importador: as mesmas contas que a tela usa.
    regras: { computeStats, skillPointsUsed, finalSkills, inventory, money, humanity, missingFoundations, pending, result, blank, applySuggested, rollRoleLp, roleLpText }
  };
})();
