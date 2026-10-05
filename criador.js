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
    lifepath: { amigos: [], inimigos: [], amores: [], role: {} }, escolhas: {}, itens: [], moradia: '', estiloVida: '', traumaTeam: '', estiloModa: '', habilidades: {}, oficina: [],
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
  // Pacote da Role (Rato de Rua e Edgerunner) com as escolhas feitas, mais o cyberware grátis de 2077 e o que foi comprado.
  // Kit do Netrunner: o do RED (cyberdeck e programas do pacote) ou o de 2077 (Hunter MK.1 e 3 quickhacks).
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
    const freeIds = new Set(free.map(item => item.id));
    // O que o pacote dá e já vem grátis em 2077 não entra duas vezes (nem cobra Humanidade de novo).
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
      if (left > 0) add(5, `Escolha mais ${left} quickhack${left > 1 ? 's' : ''} do kit de 2077.`);
    }
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
      role: role.id ? { id: role.id, nome: role.nome, rank: 4, foundry: role.foundry, especializacao: spec ? { nome: spec.nome, pericias: spec.pericias } : null, habilidades: roleAbilityRanks(doc) } : null,
      pericias: finalSkills(doc), casa: doc.casa,
      // renomear: só quando o item tem outro nome em 2077 (o plug de interface vira Personal Link).
      itens: inventory(doc).map(entry => ({ uid: entry.uid, id: entry.id, nome: entry.item.nome, renomear: entry.nome || '', qtd: entry.qtd, origem: entry.origem, foundry: entry.item.foundry, cyber: Boolean(entry.item.cyber), semHumanidade: entry.origem === 'gratis2077' })),
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

  // ---------------- Visual comum ----------------
  let esc = text => String(text);
  const box = (title, body, extra = '') => `<div class="section cc-box"${extra}><h3>${title}</h3>${body}</div>`;
  const roleName = id => (roleById(id) || {}).nome || 'sem Role';
  const offline = '<div class="callout">Os personagens ficam no servidor da wiki. Abra a wiki pelo endereço do servidor (não pelo arquivo).</div>';

  // ---------------- Ajuda de cada passo ----------------
  const STAT_MEANING = { INT: 'Raciocínio, conhecimento e atenção.', REF: 'Reflexos: mira com armas de fogo e direção.', DEX: 'Coordenação: corpo a corpo, esquiva e atletismo.', TECH: 'Habilidade técnica e medicina.', COOL: 'Compostura e presença social.', WILL: 'Força de vontade e resistência.', LUCK: 'Pontos de sorte para gastar a cada sessão.', MOVE: 'Deslocamento: MOVE × 2 m por turno.', BODY: 'Constituição e força: HP e Death Save.', EMP: 'Empatia: define a Humanidade.' };
  const HELP = {
    1: ['RED p. 72–73 · Roles de 2077: suplemento p. 2–6', `<p><b>Role</b> é o que o personagem faz em Night City. Cada uma tem uma habilidade especial, que começa no Rank 4. <b>Método</b> é o quanto você quer decidir:</p>
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
  const FOUNDRY_BADGES = { enviado: 'esperando o mestre', 'enviado-mudou': 'enviado, mudou depois', importado: 'no Foundry', mudou: 'mudou depois de importar', avisado: 'esperando o mestre atualizar' };
  const WAITING = ['enviado', 'enviado-mudou', 'avisado'];
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
      avisado: `<p class="cc-wait">Mudou depois da importação. O mestre foi avisado em ${sent} e ainda não atualizou.</p>${button('Avisar o mestre de novo')}`
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
    const [me, list] = await Promise.all([identity(), api('api/personagens')]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const papel = me.data.papel;
    const characters = list.data.personagens || [];
    const mine = characters.filter(item => !item.publico);
    const others = characters.filter(item => item.publico);
    const card = item => `<div class="cc-card">${portraitImg(item.retrato, 'cc-thumb')}<div class="cc-card-text"><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.metodo ? ` · ${esc((methodById(item.metodo) || {}).nome || '')}` : ''}${papel === 'mestre' && item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}${foundryBadge(item)}</small></div>
      <div class="cc-card-actions"><button class="action" type="button" data-cc-open="ficha" data-id="${item.id}">Ficha</button><button class="action" type="button" data-cc-open="criador" data-id="${item.id}">Editar</button><button class="action" type="button" data-cc-open="loja" data-id="${item.id}">Loja</button><button class="action cc-danger" type="button" data-cc-delete="${item.id}">Apagar</button></div></div>`;
    const publicCard = item => `<div class="cc-card">${portraitImg(item.retrato, 'cc-thumb')}<div class="cc-card-text"><strong>${esc(item.nome || 'Sem nome')}</strong>${item.apelido ? ` <span class="cc-handle">"${esc(item.apelido)}"</span>` : ''}<br><small>${esc(roleName(item.role))}${item.donoNome ? ` · de ${esc(item.donoNome)}` : ''}</small></div></div>`;

    let who = '';
    if (papel === 'mestre') who = '<p>Você é o <b>mestre</b>: vê e edita todos os personagens.</p>';
    else if (papel === 'jogador') who = `<p>Você entrou como <b>${esc(me.data.jogador.nome)}</b>. <button class="action" type="button" data-cc-logout>Sair</button></p>`;
    else who = `<p>Para criar ou editar o seu personagem, entre com o código que o mestre te passou. Este aparelho lembra dele.</p><form class="cc-login" data-cc-login><input id="cc-code" autocomplete="off" placeholder="NC-XXXX-XXXX" aria-label="Código do jogador"><button class="action" type="submit">Entrar</button></form><p class="cc-msg" id="cc-login-msg"></p>`;

    const canCreate = papel !== 'visitante';
    const waiting = papel === 'mestre' ? mine.filter(item => WAITING.includes(item.estadoFoundry)) : [];
    const waitingBox = waiting.length ? box('Esperando você no Foundry', `<ul>${waiting.map(item => `<li><b>${esc(item.nome || 'Sem nome')}</b>${item.donoNome ? ` (de ${esc(item.donoNome)})` : ''}: ${item.estadoFoundry === 'avisado' ? 'mudou, atualizar' : 'importar'}. Enviado em ${when(item.envio && item.envio.quando)}.</li>`).join('')}</ul>${GM_FOUNDRY_HELP}`, ' data-cc-waiting') : '';
    root.innerHTML = `${waitingBox}${box('Quem é você', who)}
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
      return rows.length ? `<h4>${title}</h4><ul class="cc-items">${rows.map(entry => `<li><b>${esc(entry.nome || entry.item.nome)}</b>${entry.qtd > 1 ? ` ×${entry.qtd}` : ''}${entry.item.resumo ? ` <small>${esc(entry.item.resumo)}</small>` : ''}${entry.origem === 'gratis2077' ? ' <small class="cc-ok">grátis (2077)</small>' : ''}${entry.origem === 'role' ? ' <small class="cc-ok">bônus da Role</small>' : ''}</li>`).join('')}</ul>` : '';
    };
    const lp = lifepathTexts(doc);
    const lpRows = [...lifepathFields.map(([, label, field]) => [label, lp[field]]), ['Amigos', lp.friends], ['Inimigos', lp.enemies], ['Amores trágicos', lp.tragicLoveAffairs], ['Lifepath da Role', lp.roleLifepath]].filter(([, text]) => text);
    const home = housing(doc);
    // Sub-habilidades e veículos da família: o que a Role tem além do Rank.
    const abilities = abilitySpec(doc);
    const fleet = doc.role === 'nomad' ? motorpool(doc).veiculos : [];
    const roleBox = abilities || fleet.length ? `<div class="section cc-box" data-toc="Role"><h3>${esc(role.habilidade || 'Role')} Rank 4</h3>
      ${abilities ? `<h4>${esc(abilities.titulo)}</h4><ul class="cc-items">${abilities.itens.map(item => `<li><b>${esc(item.nome)}</b> ${Number((doc.habilidades || {})[item.id]) || 0}<small> · ${esc(item.desc)}</small></li>`).join('')}</ul>` : ''}
      ${fleet.length ? `<h4>Veículos da família</h4><ul class="cc-items">${fleet.map(entry => `<li><b>${esc(entry.veiculo.nome)}</b>${entry.upgrades.length ? `: ${entry.upgrades.map(item => esc(item.upgrade.nome)).join(', ')}` : ''}</li>`).join('')}</ul><p class="note-status">Um de cada vez com você; o resto fica com a família.</p>` : ''}</div>` : '';
    return `<div class="cc-sheet">
      <div class="section cc-box cc-identity" data-toc="Identidade">${portraitImg(portraitUrl(doc), 'cc-portrait', doc.nome)}<h3>${esc(doc.nome || 'Sem nome')}${doc.apelido ? ` <span class="cc-handle">"${esc(doc.apelido)}"</span>` : ''}</h3>
        <p><b>${esc(role.nome || 'Sem Role')}</b> · ${esc(role.habilidade || '')} Rank 4${spec ? ` · ${esc(spec.nome)}` : ''} · ${esc((methodById(doc.metodo) || {}).nome || 'método não escolhido')}${doc.foundry ? ` · <b class="cc-ok">No Foundry desde ${new Date(doc.foundry.importado).toLocaleDateString('pt-BR')}</b>` : ''}</p>
        ${doc.aparencia ? `<p>${esc(doc.aparencia)}</p>` : ''}</div>
      ${roleBox}
      <div class="section cc-box" data-toc="STATs"><h3>STATs</h3><div class="cc-stats">${statKeys.map(statCell).join('')}</div>
        <p class="cc-derived"><span>HP <b>${derived.hp}</b></span><span>Gravemente Ferido <b>${derived.gravemente}</b></span><span>Death Save <b>${derived.deathSave}</b></span><span>Humanidade <b>${hum.atual}/${hum.max}</b></span><span>Andar <b>${derived.andar} m</b></span><span>Correr <b>${derived.correr} m</b></span></p></div>
      <div class="section cc-box" data-toc="Perícias"><h3>Perícias</h3><div class="table-wrap dense"><table><thead><tr><th>Perícia</th><th>STAT</th><th>Nível</th><th>Base</th></tr></thead><tbody>${skills.map(skill => `<tr><td>${esc(skillLabel(skill))}${skill.gratis ? ' <small>(origem)</small>' : ''}</td><td>${skill.stat}</td><td>${skill.nivel}</td><td><b>${skill.nivel + (stats[skill.stat] || 0)}</b></td></tr>`).join('')}</tbody></table></div></div>
      <div class="section cc-box" data-toc="Equipamento"><h3>Equipamento e cyberware</h3>
        ${group('Armas', entry => entry.item.cat === 'armas')}${group('Munição', entry => entry.item.cat === 'municao')}${group('Armaduras', entry => entry.item.cat === 'armaduras')}
        ${group('Cyberware', entry => entry.item.cat === 'cyberware')}${group('Netrunning', entry => entry.item.cat === 'netrunning')}${group('Equipamento', entry => ['equipamento', 'acessorios', 'drogas'].includes(entry.item.cat))}${group('Moda', entry => entry.item.cat === 'moda')}
        <p><b>Dinheiro:</b> ${eb(Math.max(0, cash.saldo))}</p></div>
      <div class="section cc-box" data-toc="Lifepath"><h3>Lifepath</h3>${lpRows.length ? `<dl class="cc-lifepath">${lpRows.map(([label, text]) => `<dt>${label}</dt><dd>${esc(text)}</dd>`).join('')}</dl>` : '<p class="note-status">Ainda não preenchido.</p>'}</div>
      <div class="section cc-box" data-toc="Moradia"><h3>Moradia e estilo de vida</h3>
        <dl class="cc-lifepath"><dt>Moradia</dt><dd>${esc(home.moradia)}${home.aluguel ? ` · ${eb(home.aluguel)}/mês` : ' · sem aluguel'}</dd>
          <dt>Estilo de vida</dt><dd>${esc(home.estilo)}${home.custoEstilo ? ` · ${eb(home.custoEstilo)}/mês` : ''}</dd>
          <dt>Trauma Team</dt><dd>${home.traumaTeam ? `${esc(home.traumaTeam.nome)} · ${eb(home.traumaTeam.custo)}/mês` : 'Sem cobertura'}</dd>
          ${home.moda ? `<dt>Moda</dt><dd>${esc(home.moda.nome)}: ${esc(home.moda.desc)}</dd>` : ''}
          <dt>Por mês</dt><dd><b>${eb(home.mensal)}</b>, no dia 1º${home.primeiroMes ? ` · o primeiro mês custou ${eb(home.primeiroMes)} do dinheiro inicial` : ' · o primeiro mês foi de graça'}</dd></dl></div>
      ${doc.notas ? `<div class="section cc-box" data-toc="Notas"><h3>Notas</h3><p>${esc(doc.notas)}</p></div>` : ''}
      ${forPrint ? '' : ''}</div>`;
  }

  async function setupSheet(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    const root = content.querySelector('#cc-root');
    const id = helpers.target && helpers.target.section;
    if (!id) { root.innerHTML = '<p>Escolha um personagem em Personagens.</p>'; return; }
    const [answer, me] = await Promise.all([api(`api/personagens/${id}`), identity()]);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const doc = answer.data.personagem;
    const papel = me.data.papel;
    if (!doc) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Personagem não encontrado.')}</div>`; return; }
    if (doc.publico) { root.innerHTML = `<div class="callout cc-identity">${portraitImg(doc.retrato, 'cc-portrait', doc.nome)}Esta é a ficha de outro jogador: você só vê o nome (<b>${esc(doc.nome)}</b>), a Role (${esc(roleName(doc.role))}) e o retrato.</div>`; return; }
    root.innerHTML = `<p class="cc-toolbar"><button class="action" type="button" data-cc-edit>Editar</button><button class="action" type="button" data-cc-shop>Loja</button><button class="action" type="button" data-cc-back>Personagens</button></p>${foundryBox(doc, papel)}${sheetHtml(doc)}`;
    root.onclick = event => {
      if (event.target.closest('[data-cc-send]')) return sendToGm(doc, papel, root);
      if (event.target.closest('[data-cc-edit]')) helpers.openPage('criador', { section: id });
      if (event.target.closest('[data-cc-shop]')) helpers.openPage('loja', { section: id });
      if (event.target.closest('[data-cc-back]')) helpers.openPage('personagens');
    };
  }

  // ================= Loja (componente usado no criador e na página Loja) =================
  // Regras da loja inicial (o que fica de fora da criação). Vêm do servidor; o mestre muda no quadro da Loja.
  const SHOP_TAG_NAMES = { exotica: 'armas exóticas', excelente: 'qualidade excelente', borgware: 'borgware', 'municao-rara': 'munição inteligente, biotoxina, EMP e sonífera', raro: 'Linear Frame, Cryotank e Cryopump' };
  let shopRules = { teto: 1000, esconder: Object.keys(SHOP_TAG_NAMES), liberados: [], bloqueados: [] };
  async function loadShopRules() {
    const answer = await api('api/loja/regras');
    if (answer.status === 200 && answer.data.regras) shopRules = answer.data.regras;
    return shopRules;
  }
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
    const freeIds = new Set(C.free2077.map(item => item.id));
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
  const addItem = (doc, id, qty) => {
    const existing = (doc.itens || []).find(entry => entry.id === id);
    if (existing) existing.qtd += qty;
    else (doc.itens = doc.itens || []).push({ uid: `loja:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, id, qtd: qty });
  };

  const shopState = { cat: 'armas', sub: '', busca: '', verTudo: false };
  // doc pode faltar (o mestre olhando a loja sem personagem): aí só navega e ajusta as regras.
  function renderShop(target, doc, { onChange = () => {}, readOnly = false, gm = false, onRules } = {}) {
    const fold = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const canBuy = Boolean(doc) && !readOnly;
    const draw = () => {
      const cash = doc ? money(doc) : null;
      const showHidden = gm && shopState.verTudo;
      const available = shop.itens.filter(item => showHidden || !hiddenReason(item));
      const hiddenCount = shop.itens.length - shop.itens.filter(item => !hiddenReason(item)).length;
      const subs = [...new Set(available.filter(item => item.cat === shopState.cat).map(item => item.sub))];
      const terms = fold(shopState.busca).split(/\s+/).filter(Boolean);
      const visible = available.filter(item => (terms.length ? true : item.cat === shopState.cat) && (!shopState.sub || terms.length || item.sub === shopState.sub)
        && terms.every(term => fold(`${item.nome} ${item.en} ${item.sub} ${item.resumo || ''}`).includes(term)));
      const shown = visible.slice(0, 120);
      const owned = new Map();
      if (doc) for (const entry of inventory(doc)) owned.set(entry.id, (owned.get(entry.id) || 0) + entry.qtd);
      const bought = doc ? inventory(doc).filter(entry => entry.origem === 'loja') : [];
      const kit = doc && doc.metodo === 'pacote' && canBuy ? kitFor(doc) : [];
      const kitMain = kit.filter(entry => !isFashion(entry.item));
      const kitFashion = kit.filter(entry => isFashion(entry.item));
      const gmButtons = item => {
        if (!gm) return '';
        const reason = hiddenReason(item);
        return reason
          ? `<small class="cc-bad">fora da criação: ${esc(reason)}</small><button class="action" type="button" data-shop-allow="${item.id}">Liberar</button>`
          : `<button class="action cc-danger" type="button" data-shop-block="${item.id}">Esconder</button>`;
      };
      target.innerHTML = `${cash ? `<div class="cc-wallet"><span>Dinheiro: <b class="${cash.saldo < 0 ? 'cc-bad' : ''}">${eb(cash.saldo)}</b> de ${eb(cash.inicial)}</span>${cash.moda ? `<span>Moda: ${eb(cash.usadoModa)} de ${eb(cash.moda)} <small>(só moda e fashionware; a sobra some)</small></span>` : ''}</div>` : ''}
        ${readOnly && doc ? '<div class="callout">Este personagem já está no Foundry: a loja inicial fechou. Compras durante a sessão chegam numa próxima versão.</div>' : ''}
        ${kit.length ? `<div class="cc-kit"><p><b>Kit sugerido da Role</b>: o pacote de Rato de Rua de ${esc(roleName(doc.role))}, por ${eb(kitCost(kitMain))}${kitFashion.length ? ` e mais ${eb(kitCost(kitFashion))} de moda` : ''}. Compra tudo de uma vez; depois dá para devolver item por item.</p><button class="action" type="button" data-shop-kit>Comprar o kit sugerido</button></div>` : ''}
        <p class="note-status">${hiddenCount} itens avançados ficam fora da loja de criação (acima de ${eb(shopRules.teto)}, ${shopRules.esconder.map(tag => SHOP_TAG_NAMES[tag]).join(', ') || 'nenhuma etiqueta'}). O mestre libera o que quiser.</p>
        ${gm ? `<label class="cc-radio"><input type="checkbox" data-shop-all${shopState.verTudo ? ' checked' : ''}> Ver também os itens fora da criação</label>` : ''}
        <div class="cc-shop-filters"><div class="map-filter-list">${shop.categorias.map(category => `<button type="button" class="map-filter${category.id === shopState.cat && !terms.length ? ' active' : ''}" data-shop-cat="${category.id}">${category.nome}</button>`).join('')}</div>
          <div class="cc-shop-row"><select data-shop-sub aria-label="Grupo"><option value="">Todos os grupos</option>${subs.map(sub => `<option${sub === shopState.sub ? ' selected' : ''}>${esc(sub)}</option>`).join('')}</select><input type="search" data-shop-busca placeholder="Buscar item" value="${esc(shopState.busca)}" aria-label="Buscar item"></div></div>
        <div class="cc-shop-list">${shown.map(item => `<div class="cc-shop-item${hiddenReason(item) ? ' cc-hidden-item' : ''}"><div><b>${esc(item.nome)}</b>${owned.get(item.id) ? ` <small class="cc-ok">tem ${owned.get(item.id)}</small>` : ''}<br><small>${esc([item.sub, item.resumo].filter(Boolean).join(' · '))}</small>${item.desc ? `<br><small class="cc-desc">${esc(item.desc)}</small>` : ''}</div>
          <div class="cc-price">${eb(item.preco)}${item.lote > 1 ? `<small>/${item.lote}</small>` : ''}${canBuy && !hiddenReason(item) ? `<button class="action" type="button" data-shop-buy="${item.id}">Comprar</button>` : ''}${gmButtons(item)}</div></div>`).join('') || '<p class="note-status">Nada encontrado.</p>'}
          ${visible.length > shown.length ? `<p class="note-status">Mostrando ${shown.length} de ${visible.length}: use a busca para achar o resto.</p>` : ''}</div>
        ${doc ? `<h4>Comprado na loja</h4>${bought.length ? `<ul class="cc-items">${bought.map(entry => `<li><b>${esc(entry.item.nome)}</b> ×${entry.qtd} · ${eb(lineCost(entry))}${readOnly ? '' : ` <button class="action cc-danger" type="button" data-shop-return="${entry.uid}">Devolver</button>`}</li>`).join('')}</ul>` : '<p class="note-status">Nada ainda.</p>'}` : ''}
        <p class="cc-msg" id="cc-shop-msg"></p>`;
    };
    // O mestre libera ou esconde um item: grava as regras no servidor na hora.
    async function changeRules(change) {
      const rules = { ...shopRules, liberados: [...shopRules.liberados], bloqueados: [...shopRules.bloqueados] };
      change(rules);
      const answer = await api('api/loja/regras', { method: 'PUT', body: rules });
      if (answer.status === 200) shopRules = answer.data.regras;
      draw();
      if (onRules) onRules();
    }
    target.onclick = event => {
      const cat = event.target.closest('[data-shop-cat]');
      if (cat) { shopState.cat = cat.dataset.shopCat; shopState.sub = ''; shopState.busca = ''; return draw(); }
      const allow = event.target.closest('[data-shop-allow]');
      if (allow) return changeRules(rules => { rules.bloqueados = rules.bloqueados.filter(id => id !== allow.dataset.shopAllow); if (hiddenReason(catalog.get(allow.dataset.shopAllow), rules)) rules.liberados.push(allow.dataset.shopAllow); });
      const block = event.target.closest('[data-shop-block]');
      if (block) return changeRules(rules => { rules.liberados = rules.liberados.filter(id => id !== block.dataset.shopBlock); rules.bloqueados.push(block.dataset.shopBlock); });
      if (!canBuy) return;
      if (event.target.closest('[data-shop-kit]')) {
        const kit = kitFor(doc);
        if (!confirm(`Comprar o kit sugerido (${kit.length} itens, ${eb(kitCost(kit.filter(entry => !isFashion(entry.item))))} mais ${eb(kitCost(kit.filter(entry => isFashion(entry.item))))} de moda)?`)) return;
        for (const entry of kit) addItem(doc, entry.id, entry.qtd);
        draw();
        const cash = money(doc);
        target.querySelector('#cc-shop-msg').textContent = cash.saldo < 0 ? `Kit comprado, mas faltam ${eb(-cash.saldo)}: devolva algo.` : `Kit comprado. Sobram ${eb(cash.saldo)}.`;
        return onChange();
      }
      const buy = event.target.closest('[data-shop-buy]');
      if (buy) {
        const item = catalog.get(buy.dataset.shopBuy);
        addItem(doc, item.id, item.lote > 1 ? item.lote : 1);
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
      if (event.target.matches('[data-shop-all]')) { shopState.verTudo = event.target.checked; draw(); }
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
    const [answer, me] = await Promise.all([api(`api/personagens/${id}`), identity(), loadShopRules()]);
    if (token !== renderToken) return;
    if (!answer.status) { root.innerHTML = offline; return; }
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { root.innerHTML = `<div class="callout">${esc(answer.data.erro || 'Você só pode editar os seus personagens. Entre com o seu código em Personagens.')}</div>`; return; }
    const doc = { ...blank(), ...loaded, lifepath: { ...blank().lifepath, ...(loaded.lifepath || {}) } };
    let step = Math.min(Math.max(Number(doc.passo) || 1, 1), steps.length);
    const papel = me.data.papel;

    root.innerHTML = `<div class="cc-steps" role="tablist">${steps.map((name, index) => `<button type="button" class="map-filter" data-step="${index + 1}">${index + 1}. ${name}</button>`).join('')}</div>
      <p class="cc-save" id="cc-save" role="status"></p><div id="cc-recover"></div>
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
      stepEl.innerHTML = [drawIdentity, drawStats, drawSkills, drawLifepath, drawGear, drawHousing, drawReview][step - 1]();
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
        ${box('Role', `<div class="cc-choices">${C.roles.map(item => `<button type="button" class="cc-choice${item.id === doc.role ? ' active' : ''}" data-role="${item.id}"><b>${item.nome}</b><small>${esc(item.habilidade)}</small><span>${esc(item.resumo)}</span></button>`).join('')}</div>
          ${role && role.especializacoes ? `<h4>Especialização de ${role.nome}</h4><div class="cc-choices">${role.especializacoes.map(item => `<button type="button" class="cc-choice${item.id === doc.especializacao ? ' active' : ''}" data-spec="${item.id}"><b>${item.nome}</b><span>Soma o Rank em ${item.pericias.map(skillPt).join(', ')}.</span></button>`).join('')}</div>` : ''}
          <p><button class="action" type="button" data-page="roles2077">Ler Roles de 2077</button></p>`)}
        ${drawRoleAbilities()}${drawMotorpool()}
        ${box('Método de criação', `<div class="cc-choices">${C.methods.map(item => `<button type="button" class="cc-choice${item.id === doc.metodo ? ' active' : ''}" data-method="${item.id}"><b>${item.nome}</b><span>${esc(item.resumo)}</span></button>`).join('')}</div>`)}`;
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
      const free = `<p>Em 2077, todo personagem começa de graça e sem perder Humanidade com: ${C.free2077.map(item => `${esc(item.nome || (catalog.get(item.id) || {}).nome)}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')}.</p>`;
      const humanityLine = `<p class="cc-derived"><span>Humanidade <b>${hum.atual}/${hum.max}</b></span><span>Perda <b>${hum.perda}</b></span><span>EMP <b>${hum.emp}</b>${hum.emp !== stats.EMP ? ` <small>(era ${stats.EMP})</small>` : ''}</span></p><p class="note-status">Cada cyberware perde o valor fixo de Humanidade do livro. A EMP é a Humanidade ÷ 10, para baixo.</p>`;
      const warnings = missingFoundations(doc).map(entry => `<li>${esc(entry.item.nome)} precisa da base (${esc(entry.item.sub)}).</li>`).join('');
      if (doc.metodo === 'pacote') {
        return `${box('Cyberware grátis de 2077', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}${box('Loja inicial', '<div id="cc-shop"></div>')}`;
      }
      const pack = C.packages[(roleById(doc.role) || {}).tabelas] || {};
      const label = ([id, qty]) => { const item = catalog.get(id) || {}; return `${esc(item.nome || id)}${qty > 1 ? ` ×${qty}` : ''}`; };
      const kit2077 = uses2077Kit(doc, pack);
      const categoryBox = (category, title) => `<h4>${title}</h4><ul class="cc-items">${(pack[category] || []).map((entry, index) => {
        if (kit2077 && category === 'equipamento' && isRedDeckEntry(entry)) return '';
        if (!entry.ou) return `<li>${label(entry)}${C.free2077.some(free2077 => free2077.id === entry[0]) && category === 'cyberware' ? ' <small class="cc-ok">já vem grátis em 2077</small>' : ''}</li>`;
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
        kitBox = box('Kit de Netrunner', `<p>Em 2077 dá para trocar o cyberdeck e os programas do RED pelo deck de 2077 com quickhacks. O resto do pacote não muda.</p>
          <p><label class="cc-radio"><input type="radio" name="kitnet" data-kitnet="red"${kit2077 ? '' : ' checked'}> <b>Kit do RED:</b> Cyberdeck (7 slots) e os programas do pacote, logo abaixo</label>
          <label class="cc-radio"><input type="radio" name="kitnet" data-kitnet="2077"${kit2077 ? ' checked' : ''}> <b>Kit de 2077:</b> ${esc(deck.nome || 'Militech Hunter MK.1')} (deck padrão: RAM 7, 7 slots, −1 de RAM contra alvo marcado) e ${pack.kit2077.escolher} quickhacks de 100eb</label></p>${hacks}`);
      }
      return `${kitBox}${box('Pacote da Role', `<p>No ${esc((methodById(doc.metodo) || {}).nome)} o equipamento vem pronto. Escolha onde houver opção.</p>${categoryBox('armas', 'Armas e armaduras')}${categoryBox('equipamento', 'Equipamento')}${kit2077 ? `<ul class="cc-items"><li>${esc((catalog.get(pack.kit2077.deck) || {}).nome || '')} <small class="cc-ok">kit de 2077</small></li>${chosenQuickhacks(doc, pack).map(id => `<li>${esc((catalog.get(id) || {}).nome || id)} <small class="cc-ok">kit de 2077</small></li>`).join('')}</ul>` : ''}${categoryBox('moda', 'Moda')}${categoryBox('cyberware', 'Cyberware')}`)}
        ${box('Cyberware grátis de 2077 e Humanidade', free + humanityLine + (warnings ? `<ul class="cc-warn">${warnings}</ul>` : ''))}
        ${box('Mais 500eb para gastar', '<p>Além do pacote, você ganha 500eb para comprar outros itens ou guardar. Use a loja.</p><p><button type="button" class="action" data-cc-shop>Abrir a loja</button></p>')}`;
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
      return `${box('Quanto custa', `${total}<p class="note-status">No dia 1º de cada mês, o aluguel, o estilo de vida e o Trauma Team saem do dinheiro. Em 2077 acabou o Kibble: o Prepak genérico custa o mesmo.</p>`)}
        ${box('Moradia', `<div class="cc-options">${homes}</div>`)}
        ${box('Estilo de vida', `<div class="cc-options">${lives}</div>`)}
        ${box('Trauma Team', `<div class="cc-options">${traumas}</div><p class="note-status">Com Agent e Biomonitor, a Trauma Team é chamada sozinha quando o HP fica abaixo do BODY ou há desmembramento (RED p. 223).</p>`)}
        ${box('Estilo de moda', `<p>O visual do personagem nas quatro modas de 2077 (suplemento p. 7–8). Ajuda a escolher as roupas na loja e a descrever o personagem.</p>${modas}`)}
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
        });
        return;
      }
      if (target.closest('[data-skill-suggest]')) {
        if (!confirm('Trocar os níveis das perícias pelos sugeridos para a Role? Os que você pôs serão substituídos.')) return;
        applySuggested(doc); draw(); return changed();
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
  async function setupShopPage(content, helpers) {
    esc = helpers.escapeHtml;
    const token = ++renderToken;
    shopState.busca = '';
    const root = content.querySelector('#cc-root');
    const [me, list] = await Promise.all([identity(), api('api/personagens'), loadShopRules()]);
    if (token !== renderToken) return;
    if (!me.status) { root.innerHTML = offline; return; }
    const gm = me.data.papel === 'mestre';
    const mine = (list.data.personagens || []).filter(item => !item.publico);
    const chosen = (helpers.target && helpers.target.section) || (mine[0] || {}).id;
    const board = gm ? `<div class="section cc-box"><h3>Regras da loja de criação</h3><p>O que fica de fora quando os jogadores montam o personagem. Os itens um a um você libera ou esconde na lista abaixo.</p>
      <div class="cc-rules"><label>Teto de preço por item <input type="number" min="0" step="50" data-rule-teto value="${shopRules.teto}"></label>
      ${Object.entries(SHOP_TAG_NAMES).map(([tag, name]) => `<label class="cc-radio"><input type="checkbox" data-rule-tag="${tag}"${shopRules.esconder.includes(tag) ? ' checked' : ''}> Esconder ${esc(name)}</label>`).join('')}</div>
      <p><button class="action" type="button" data-rule-save>Salvar regras</button> <span class="cc-save" id="cc-rules-msg"></span></p>
      <p class="note-status">${shopRules.liberados.length} liberados e ${shopRules.bloqueados.length} escondidos um a um.</p></div>` : '';
    const picker = mine.length ? `<p class="cc-toolbar"><label>Personagem <select data-shop-pc>${mine.map(item => `<option value="${item.id}"${item.id === chosen ? ' selected' : ''}>${esc(item.nome || 'Sem nome')}</option>`).join('')}</select></label> <span class="cc-save" id="cc-save" role="status"></span></p>` : '';
    root.innerHTML = `${board}${picker}<div id="cc-shop"></div>`;
    if (gm) {
      root.querySelector('[data-rule-save]').onclick = async () => {
        const rules = { ...shopRules, teto: Number(root.querySelector('[data-rule-teto]').value) || 0, esconder: [...root.querySelectorAll('[data-rule-tag]:checked')].map(input => input.dataset.ruleTag) };
        const answer = await api('api/loja/regras', { method: 'PUT', body: rules });
        if (answer.status === 200) { shopRules = answer.data.regras; helpers.openPage('loja', chosen ? { section: chosen } : undefined, 'replace'); }
        else root.querySelector('#cc-rules-msg').textContent = answer.data.erro || 'Não consegui salvar.';
      };
    }
    const shopEl = root.querySelector('#cc-shop');
    if (!mine.length) {
      if (!gm) { shopEl.innerHTML = `<div class="callout">${me.data.papel === 'visitante' ? 'Entre com o seu código em Personagens para comprar.' : 'Crie um personagem primeiro, em Personagens.'}</div>`; return; }
      return renderShop(shopEl, null, { gm });
    }
    root.querySelector('[data-shop-pc]').onchange = event => helpers.openPage('loja', { section: event.target.value }, 'replace');
    const answer = await api(`api/personagens/${chosen}`);
    if (token !== renderToken) return;
    const loaded = answer.data.personagem;
    if (!loaded || loaded.publico) { shopEl.innerHTML = '<div class="callout">Não consegui abrir este personagem.</div>'; return; }
    const doc = { ...blank(), ...loaded };
    if (!doc.metodo) {
      if (gm) return renderShop(shopEl, null, { gm });
      shopEl.innerHTML = '<div class="callout">Escolha o método de criação no criador antes de comprar: ele define quanto dinheiro você tem.</div>';
      return;
    }
    const saver = createSaver(doc, root.querySelector('#cc-save'), helpers.storage);
    renderShop(shopEl, doc, { onChange: () => saver.changed(), readOnly: Boolean(doc.foundry), gm });
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
    regras: { computeStats, skillPointsUsed, finalSkills, inventory, money, humanity, missingFoundations, pending, result, blank, applySuggested, rollRoleLp, roleLpText }
  };
})();
