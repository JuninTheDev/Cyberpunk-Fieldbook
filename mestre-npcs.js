// Fichas prontas de NPC: as 10 do livro do RED ("Mooks and Grunts", p. 412–416), as 10 do Cyberpunk Edgerunners
// Mission Kit (p. 118–126), a Trauma Team (p. 224) e variantes para as facções de Night City em 2077.
// Só a wiki do mestre carrega este arquivo: o servidor não o entrega aos jogadores.
(() => {
  const table = (headers, rows) => `<div class="table-wrap dense"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body) => `<div class="section" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;
  const entry = ({ name, tag, stats = [], text, extra = '', tip }) => `<article class="entry" data-toc="${name}"><header><h4>${name}</h4>${tag ? `<span class="entry-tag">${tag}</span>` : ''}</header>${stats.length ? `<div class="entry-stats">${stats.map(([label, value]) => `<span><b>${label}</b> ${value}</span>`).join('')}</div>` : ''}<p>${text}</p>${extra}${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;

  // As perícias ficam como no livro (dá para conferir no PDF) e são traduzidas com os nomes da página Perícias.
  const skillNames = {
    'Animal Handling': 'Afinidade com Animais', Archery: 'Arquearia', Athletics: 'Atletismo', Autofire: 'Disparo Automático',
    'Basic Tech': 'Tecnologia Básica', Brawling: 'Briga', 'Combat Awareness': 'Consciência de Combate', 'Conceal/Reveal Object': 'Esconder/Revelar Objeto',
    Concentration: 'Concentração', Conversation: 'Conversação', Criminology: 'Criminologia', Cryptography: 'Criptografia', Deduction: 'Dedução',
    Demolition: 'Demolições', 'Drive Land Vehicle': 'Conduzir Veículo Terrestre', Education: 'Educação', 'Electronics/Security Tech': 'Tecnologia Eletrônica/Segurança',
    Endurance: 'Resistência', Evasion: 'Evasão', 'First Aid': 'Primeiros Socorros', Forgery: 'Falsificação', Handgun: 'Armas de uma Mão',
    'Heavy Weapons': 'Armas Pesadas', 'Human Perception': 'Percepção Humana', Interface: 'Interface', Interrogation: 'Interrogatório',
    'Land Vehicle Tech': 'Tecnologia de Veículos Terrestres', 'Language (Native)': 'Linguagem (nativa)', 'Language (Streetslang)': 'Linguagem (Streetslang)',
    'Library Search': 'Pesquisa Bibliotecária', 'Local Expert (Badlands)': 'Especialista Local (Badlands)', 'Local Expert (Your Home)': 'Especialista Local (a área dele)',
    'Melee Weapon': 'Armas Brancas', 'Melee Weapons': 'Armas Brancas', 'Moto Family': 'Moto', Paramedic: 'Paramédico', Perception: 'Percepção',
    Persuasion: 'Persuasão', 'Pick Lock': 'Arrombamento', 'Resist Torture/Drug': 'Resistir Tortura/Drogas', 'Resist Torture/Drugs': 'Resistir Tortura/Drogas',
    'Science (Chemistry)': 'Ciências (Química)', 'Shoulder Arms': 'Armas de Ombro', Stealth: 'Furtividade', Streetwise: 'Malandragem', Tactics: 'Táticas',
    Tracking: 'Rastrear', Weaponstech: 'Tecnologia de Armas', 'Wilderness Survival': 'Sobrevivência',
    // Do elenco da campanha (o livro não usa).
    Accounting: 'Contabilidade', Acting: 'Atuação', Bribery: 'Subornar', Bureaucracy: 'Burocracia', Business: 'Negócios', Composition: 'Composição',
    Cybertech: 'Cybertecnologia', Demolitions: 'Demolições', 'Language (English)': 'Linguagem (inglês)', 'Language (Japanese)': 'Linguagem (japonês)',
    'Personal Grooming': 'Cuidados Pessoais', 'Photography/Film': 'Fotografia/Filme', 'Science (Biology)': 'Ciências (Biologia)', Trading: 'Negociação',
    'Wardrobe & Style': 'Guarda-roupa e Estilo', Operator: 'Operator', Medicine: 'Medicine', Maker: 'Maker'
  };
  const roleAbilities = ['Interface', 'Moto Family', 'Combat Awareness', 'Operator', 'Medicine', 'Maker'];
  // Perícias que aparecem no cartão sem abrir "Todas as perícias".
  const highlighted = ['Handgun', 'Shoulder Arms', 'Autofire', 'Heavy Weapons', 'Archery', 'Melee Weapon', 'Melee Weapons', 'Brawling', 'Evasion', 'Perception', 'Stealth', 'Athletics'];
  const statNames = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];

  const parseSkills = text => text.split(', ').map(item => {
    const match = item.match(/^(.*?)\s+(\d+(?:\s*\(\d+\))?)$/);
    return match ? { en: match[1], value: match[2] } : { en: item, value: '' };
  });
  const skillLabel = ({ en, value }) => {
    const name = skillNames[en] || en;
    const shown = value ? `${name} ${value}` : `${name} <i>(sem número no livro)</i>`;
    return roleAbilities.includes(en) ? `<b>${shown}</b>` : shown;
  };

  const tiers = {
    mook: 'Capanga (Mook) · conta como 1 personagem',
    lieutenant: 'Tenente (Lieutenant) · conta como 2',
    miniBoss: 'Mini-chefe (Mini Boss) · conta como 3',
    boss: 'Chefe (Boss) · luta final',
    aliado: 'Aliado'
  };

  // weapons: [nome, dano, CDT, perícia do livro, observação]
  const npc = ({ name, book, tier, page, rep, stats, hp, wounded, deathSave, initiative, armor, weapons, skills, gear, extra = '', tip }) => {
    const parsed = parseSkills(skills);
    const base = en => (parsed.find(skill => skill.en === en) || {}).value || '—';
    const roleAbility = parsed.filter(skill => roleAbilities.includes(skill.en));
    const key = highlighted.map(en => parsed.find(skill => skill.en === en)).filter(Boolean)
      .filter((skill, index, all) => all.findIndex(other => skillNames[other.en] === skillNames[skill.en]) === index);
    const weaponRows = weapons.map(([weapon, damage, rof, skill, note]) => [
      `${weapon}${note ? ` <small>${note}</small>` : ''}`, damage, rof,
      `${skillNames[skill]} ${base(skill)}${skill === 'Shoulder Arms' && base('Autofire') !== '—' && /autofogo/.test(note || '') ? ` · autofogo ${base('Autofire')}` : ''}`
    ]);
    return `<article class="entry npc" data-toc="${name}"><header><h4>${name}</h4><span class="entry-tag">${tiers[tier]} · ${book}${page ? ` · p. ${page}` : ''}${rep !== undefined ? ` · REP ${rep}` : ''}</span></header>
      <div class="npc-stats">${stats.map((value, index) => `<span><b>${statNames[index]}</b>${value}</span>`).join('')}</div>
      <div class="entry-stats"><span><b>PV</b> ${hp}</span><span><b>Gravemente Ferido</b> ${wounded}</span><span><b>Death Save</b> ${deathSave}</span><span><b>Iniciativa</b> ${initiative}</span></div>
      <div class="entry-stats"><span><b>Armadura</b> ${armor}</span></div>
      ${table(['Arma', 'Dano', 'CDT', 'Ataque (+1d10)'], weaponRows)}
      <p><b>Destaques:</b> ${[...roleAbility, ...key].map(skillLabel).join(' · ')}</p>
      ${extra}
      <details class="npc-more"><summary>Todas as perícias e o equipamento</summary><p><b>Perícias:</b> ${parsed.map(skillLabel).join(', ')}.</p><p><b>Cyberware e equipamento:</b> ${gear}.</p></details>
      ${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;
  };
  const npcGrid = cards => `<div class="entry-grid npc-grid">${cards.map(npc).join('')}</div>`;

  // ---------------- As fichas do livro (p. 412–416) ----------------
  const mooks = [
    {
      name: 'Guarda-costas', book: 'Bodyguard', tier: 'mook', page: 412,
      stats: [3, 6, 5, 2, 4, 4, 4, 6, 3], hp: 35, wounded: 18, deathSave: 6, initiative: '6 + 1d10',
      armor: 'Kevlar · SP 7 na cabeça e no corpo',
      weapons: [['Espingarda (qualidade ruim)', '5d6', 1, 'Shoulder Arms', 'balote'], ['Pistola muito pesada', '4d6', 1, 'Handgun']],
      skills: 'Athletics 9, Brawling 11, Concentration 6, Conversation 5, Drive Land Vehicle 10, Education 5, Endurance 9, Evasion 7, First Aid 4, Handgun 10, Human Perception 5, Interrogation 6, Language (Native) 5, Language (Streetslang) 5, Local Expert (Your Home) 5, Perception 9, Persuasion 6, Resist Torture/Drug 8, Shoulder Arms 10, Stealth 7',
      gear: 'balotes de espingarda ×25, munição de pistola muito pesada ×25, rádio comunicador',
      tip: 'Seguranças de clube, capangas de fixer, leões de chácara. O livro também faz técnicos com esta ficha, somando Tool Hand e um cybereye MicroOptics (p. 417). A espingarda ruim emperra num 1 no ataque.'
    },
    {
      name: 'Boosterganger', book: 'Boosterganger', tier: 'mook', page: 412,
      stats: [2, 6, 5, 2, 4, 2, 4, 4, 3], hp: 20, wounded: 10, deathSave: 4, initiative: '6 + 1d10',
      armor: 'Couro · SP 4 na cabeça e no corpo',
      weapons: [['Pistola muito pesada (qualidade ruim)', '4d6', 1, 'Handgun'], ['Rippers', '2d6', 2, 'Melee Weapon', 'arma cibernética']],
      skills: 'Athletics 9, Brawling 9, Conceal/Reveal Object 4, Concentration 4, Conversation 5, Drive Land Vehicle 10, Education 4, Endurance 6, Evasion 7, First Aid 4, Handgun 12, Human Perception 5, Interrogation 6, Language (Native) 4, Language (Streetslang) 4, Local Expert (Your Home) 4, Melee Weapon 11, Perception 6, Persuasion 6, Resist Torture/Drugs 4, Stealth 7',
      gear: 'munição de pistola muito pesada ×30, celular descartável, Rippers, Techhair',
      tip: 'A ficha que o livro mais reaproveita: gangues, cultistas, moradores, repórteres e corporativos saem dela trocando o equipamento (veja Facções de 2077). É frágil de propósito. Pela fórmula (10 + 5 × (BODY + WILL) ÷ 2), teria 25 PV; o livro dá 20.'
    },
    {
      name: 'Gangue de estrada', book: 'Road Ganger', tier: 'mook', page: 413,
      stats: [4, 6, 4, 4, 3, 3, 3, 3, 3], hp: 25, wounded: 13, deathSave: 3, initiative: '6 + 1d10',
      armor: 'Couro · SP 4 na cabeça e no corpo',
      weapons: [['Pistola muito pesada', '4d6', 1, 'Handgun'], ['Besta', '4d6', 1, 'Archery'], ['Arma branca leve', '1d6', 2, 'Melee Weapon']],
      skills: 'Archery 10, Athletics 10, Brawling 6, Concentration 5, Conversation 6, Drive Land Vehicle 12, Education 6, Endurance 5, Evasion 6, First Aid 6, Handgun 10, Human Perception 5, Land Vehicle Tech 10, Language (Native) 6, Language (Streetslang) 6, Local Expert (Your Home) 6, Melee Weapon 8, Perception 6, Persuasion 5, Stealth 8, Tracking 8, Wilderness Survival 8',
      gear: 'munição de pistola muito pesada ×20, flechas ×20, corda, lanterna, Neural Link (Interface Plugs)',
      tip: 'Nômades, saqueadores dos Badlands e o ajudante de um Lawman. A besta não faz barulho. Sabe dirigir e consertar o próprio carro (Conduzir 12, Tecnologia de Veículos 10).'
    },
    {
      name: 'Operativo de segurança', book: 'Security Operative', tier: 'mook', page: 413,
      stats: [3, 7, 4, 2, 2, 3, 3, 5, 3], hp: 30, wounded: 15, deathSave: 5, initiative: '7 + 1d10',
      armor: 'Kevlar · SP 7 na cabeça e no corpo',
      weapons: [['Rifle de assalto (qualidade ruim)', '5d6', 1, 'Shoulder Arms', 'autofogo (4), supressão'], ['Pistola muito pesada', '4d6', 1, 'Handgun'], ['Arma branca média', '2d6', 2, 'Melee Weapon', 'cassetete']],
      skills: 'Athletics 8, Autofire 10, Brawling 6, Concentration 7, Conversation 5, Education 5, Evasion 6, First Aid 4, Handgun 10, Human Perception 5, Interrogation 6, Language (Native) 5, Language (Streetslang) 5, Local Expert (Your Home) 5, Melee Weapon 6, Perception 5, Persuasion 4, Resist Torture/Drugs 5, Shoulder Arms 10, Stealth 6',
      gear: 'munição de rifle ×40, munição de pistola muito pesada ×20, rádio comunicador',
      tip: 'Guardas corporativos, a patrulha da NCPD de dia e os solos de um sindicato (p. 417–419). Com o rifle, dá autofogo e fogo supressivo: um par deles prende o grupo atrás da cobertura enquanto os outros avançam.'
    }
  ];

  const lieutenants = [
    {
      name: 'Netrunner', book: 'Netrunner', tier: 'lieutenant', page: 414,
      stats: [7, 5, 4, 7, 4, 5, 5, 3, 4], hp: 30, wounded: 15, deathSave: 3, initiative: '5 + 1d10',
      armor: 'Bodyweight Suit · SP 11 na cabeça e no corpo',
      weapons: [['Pistola muito pesada', '4d6', 1, 'Handgun']],
      skills: 'Interface 4, Athletics 9, Basic Tech 13, Brawling 6, Conceal/Reveal Object 11, Concentration 9, Conversation 6, Cryptography 11, Deduction 11, Education 11, Electronics/Security Tech 11, Evasion 6, First Aid 9, Forgery 13, Handgun 10, Human Perception 6, Language (Native) 9, Language (Streetslang) 9, Local Expert (Your Home) 13, Library Search 9, Perception 11, Persuasion 6, Pick Lock 11, Resist Torture/Drugs 7, Stealth 8',
      gear: 'munição de pistola muito pesada ×50, lanterna, óculos de virtualidade, Neural Link (Interface Plugs)',
      extra: `<p><b>Programas:</b> Banhammer, DeckKRASH, Eraser, Hellbolt, Shield, Sword, Worm.</p>`,
      tip: 'Interface 4 dá <b>3 Ações de NET</b> por turno. Os sete programas cabem num cyberdeck padrão; o que cada um faz está no Arsenal. Fica longe da linha de fogo, atrás dos capangas.'
    },
    {
      name: 'Chefe reclaimer', book: 'Reclaimer Chief', tier: 'lieutenant', page: 414,
      stats: [3, 6, 6, 5, 4, 5, 4, 6, 4], hp: 40, wounded: 20, deathSave: 6, initiative: '6 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Espingarda', '5d6', 1, 'Shoulder Arms', 'balote'], ['Pistola pesada', '3d6', 2, 'Handgun'], ['Arma branca leve', '1d6', 2, 'Melee Weapon'], ['Arma branca pesada', '3d6', 2, 'Melee Weapon']],
      skills: 'Athletics 12, Basic Tech 9, Brawling 8, Concentration 7, Conversation 6, Deduction 7, Drive Land Vehicle 10, Education 5, Electronics/Security Tech 9, Endurance 11, Evasion 8, First Aid 7, Handgun 10, Human Perception 6, Land Vehicle Tech 7, Language (Native) 5, Language (Streetslang) 5, Local Expert (Your Home) 5, Melee Weapon 10, Paramedic 7, Perception 8, Persuasion 6, Pick Lock 7, Resist Torture/Drugs 10, Shoulder Arms 10, Stealth 10, Weaponstech 9, Wilderness Survival 7',
      gear: 'balotes de espingarda ×25, munição de pistola pesada ×25, Agent, arpéu (Grapple Gun), rádio comunicador, barraca e equipamento de acampamento, filtros nasais, Neural Link (Chipware Socket, Tactile Boost)',
      tip: 'Líder durão de sucateiros, reconstrutores e gente que vive nas ruínas. Na Sessão 02 é a base de Brakk, trocando o equipamento de acampamento por Wolvers.'
    },
    {
      name: 'Oficial de segurança', book: 'Security Officer', tier: 'lieutenant', page: 415,
      // Entre parênteses: com a penalidade da Medium Armorjack.
      stats: [4, '8 (6)', '6 (4)', 4, 6, 5, '6 (4)', 7, 4], hp: 40, wounded: 20, deathSave: 7, initiative: '8 + 1d10',
      armor: 'Medium Armorjack · SP 13 na cabeça e no corpo · −2 REF, DEX e MOVE',
      weapons: [['Rifle de assalto', '5d6', 1, 'Shoulder Arms', 'autofogo (4), supressão'], ['Pistola muito pesada', '4d6', 1, 'Handgun'], ['Arma branca média', '2d6', 2, 'Melee Weapon', 'cassetete']],
      skills: 'Athletics 10 (8), Autofire 12 (10), Brawling 10 (8), Concentration 7, Conversation 6, Deduction 6, Drive Land Vehicle 12 (10), Education 6, Evasion 10 (8), First Aid 6, Handgun 10 (8), Human Perception 6, Interrogation 8, Language (Native) 6, Language (Streetslang) 6, Local Expert (Your Home) 6, Melee Weapon 10 (8), Perception 6, Persuasion 8, Resist Torture/Drugs 10, Shoulder Arms 10 (8), Stealth 6 (4), Tactics',
      gear: 'munição de rifle ×50, munição de pistola muito pesada ×30, escudo à prova de balas (10 PV), binóculos, celular descartável, lanterna, algemas ×2, rádio comunicador, scanner de rádio/tocador de música, Neural Link (Kerenzikov)',
      tip: 'Os números entre parênteses já descontam a armadura: use-os enquanto ele estiver de Medium Armorjack. A iniciativa soma REF 6 e +2 do Kerenzikov. O livro dá SP 13 à Medium Armorjack, que na tabela de armaduras tem SP 12. Táticas aparece sem número. É a base de Vega (Sessão 01) e de Iskra Voss.'
    }
  ];

  const bosses = [
    {
      name: 'Outrider', book: 'Outrider', tier: 'miniBoss', page: 415,
      stats: [6, 8, 8, 3, 5, 6, 6, 6, 6], hp: 40, wounded: 20, deathSave: 6, initiative: '8 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Rifle de assalto', '5d6', 1, 'Shoulder Arms', 'autofogo (4), supressão'], ['Pistola muito pesada', '4d6', 1, 'Handgun'], ['Arma branca leve', '1d6', 2, 'Melee Weapons']],
      skills: 'Moto Family 4, Animal Handling 8, Athletics 14, Autofire 12, Basic Tech 5, Brawling 14, Concentration 10, Conversation 6, Criminology 10, Drive Land Vehicle 14, Education 8, Endurance 10, Evasion 14, First Aid 5, Handgun 14, Human Perception 8, Land Vehicle Tech 7, Language (Native) 8, Language (Streetslang) 8, Local Expert (Badlands) 10, Local Expert (Your Home) 8, Melee Weapons 12, Perception 14, Persuasion 7, Resist Torture/Drugs 12, Shoulder Arms 14, Stealth 12, Streetwise 9, Tracking 10',
      gear: 'munição de rifle ×60, munição de pistola muito pesada ×40, algemas ×2, rastreadores, rádio comunicador, Cyberaudio Suite (Amplified Hearing), Cybereye (Targeting Scope, TeleOptics), Neural Link (Interface Plugs)',
      tip: 'Batedor nômade de elite (habilidade Moto 4). O livro também o usa como Lawman caçador de recompensas (p. 422). O Targeting Scope dá +1 em tiros mirados, e ele acerta a 14: mira na cabeça.'
    },
    {
      name: 'Pyro', book: 'Pyro', tier: 'miniBoss', page: 416,
      stats: [5, 8, 6, 7, 4, 4, 6, 5, 3], hp: 35, wounded: 18, deathSave: 5, initiative: '8 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Lança-chamas', '3d6', 1, 'Heavy Weapons', 'cartuchos incendiários'], ['Pistola pesada', '3d6', 2, 'Handgun'], ['Arma branca pesada', '3d6', 2, 'Melee Weapon']],
      skills: 'Combat Awareness 4, Athletics 11, Basic Tech 12, Brawling 10, Concentration 8, Conversation 5, Demolition 13, Drive Land Vehicle 10, Education 7, Evasion 13, First Aid 9, Handgun 14, Heavy Weapons 14, Human Perception 5, Interrogation 10, Language (Native) 7, Language (Streetslang) 7, Local Expert (Your Home) 7, Melee Weapon 13, Perception 12, Persuasion 6, Resist Torture/Drugs 14, Science (Chemistry) 10, Stealth 10, Streetwise 8, Tactics 8',
      gear: 'cartuchos incendiários de espingarda ×8 (para o lança-chamas), munição de pistola muito pesada ×50, granada incendiária ×1, granada de luz ×1, Cyberaudio Suite (Level Dampener), Cybereye ×2 (Anti-Dazzle ×2), filtros nasais',
      extra: `<p class="entry-excellent"><b>Lança-chamas (p. 346):</b> espingarda exótica que só dispara cartuchos incendiários, com Armas Pesadas. Quem sofre dano através da armadura pega fogo e perde <b>4 PV no fim de cada turno</b> até gastar uma Ação para se apagar. Não causa lesão crítica nem permite tiro mirado.</p>`,
      tip: 'Solo com Consciência de Combate 4: antes da luta, reparta os pontos (por exemplo, +4 na iniciativa). Level Dampener e Anti-Dazzle o deixam imune às próprias granadas de luz. O livro dá munição de pistola muito pesada para uma pistola pesada: troque por munição de pistola pesada.'
    }
  ];

  const boss = [
    {
      name: 'Cyberpsycho', book: 'Cyberpsycho', tier: 'boss', page: 416,
      stats: [5, 8, 8, 5, 4, 7, 8, 10, 0], hp: 55, wounded: 28, deathSave: 10, initiative: '8 + 1d10',
      armor: 'Subdermal Armor · SP 11 na cabeça e no corpo',
      weapons: [['Lança-granadas pop-up', '6d6', 1, 'Heavy Weapons', 'granadas perfurantes ×2'], ['SMG pesada pop-up', '3d6', 1, 'Handgun', 'autofogo (3)'], ['Cybersnake', '4d6', 1, 'Melee Weapon'], ['Wolvers', '3d6', 2, 'Melee Weapon']],
      skills: 'Athletics 16, Autofire 14, Basic Tech 11, Brawling 15, Concentration 6, Conversation 2, Drive Land Vehicle 10, Education 7, Endurance 10, Evasion 13, First Aid 6, Handgun 12, Heavy Weapons 14, Human Perception 2, Interrogation 13, Language (Native) 7, Language (Streetslang) 7, Local Expert (Your Home) 7, Melee Weapon 17, Perception 9, Persuasion 6, Resist Torture/Drugs 15, Stealth 10, Tracking 10',
      gear: 'granadas perfurantes ×2, munição de pistola pesada ×100, Cyberarm ×2 (lança-granadas pop-up ×2, SMG pesada pop-up, Wolvers), Cyberleg ×2 (Jump Booster ×2), Cybersnake, Grafted Muscle and Bone Lace, Neural Link (Chipware Socket, Pain Editor), Subdermal Armor',
      tip: 'O livro avisa: é uma luta de chefe, só ponha na mesa se o grupo aguentar. O Pain Editor ignora as penalidades de Gravemente Ferido, e a SMG pesada faz autofogo a 14. Para uma vítima da Fúria de Morana que ainda pode ser salva, use uma ficha mais fraca (Guarda-costas ou Boosterganger) com o implante tomado. Guarde esta para quem já passou do limite.'
    }
  ];

  // ---------------- O elenco do Protocolo Morana ----------------
  // Fichas próprias da campanha, no formato das do livro (bases = STAT + perícia; PV = 10 + 5 × (BODY + WILL) ÷ 2,
  // para cima). O build do módulo do Foundry cria um ator para cada uma, na pasta "Protocolo Morana".
  // ---------------- As fichas do Cyberpunk Edgerunners Mission Kit (Kit p. 118–126) ----------------
  // Mesmo formato das do livro. weapons: [nome, dano, CDT, perícia do livro, observação, molde no Foundry]
  // ("2077:" = a arma do compêndio de 2077; "core:" = o molde do livro-base). `inclui`: o Rank da Role que o Kit já somou
  // na base da perícia (no Foundry, a Role soma sozinha).
  const kitArmor = (nome, sp, metade) => `${nome} · SP ${sp} na cabeça e no corpo (${metade} contra corpo a corpo e Tech carregada)`;
  const kitNpcs = [
    {
      name: 'Falco', book: 'Mission Kit', tier: 'aliado', page: 118, rep: 7,
      stats: [6, 8, 6, 5, 4, 6, 5, 6, 4], hp: 40, wounded: 20, deathSave: 6, initiative: '8 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Techtronika RT-46 Burya', '4d6', 1, 'Handgun', 'Tech; carrega sem gastar a Ação de Movimento', '2077:Techtronika RT-46 Burya']],
      skills: 'Moto Family 6, Athletics 8, Brawling 12, Concentration 6, Conversation 10, Deduction 10, Drive Land Vehicle 20, Education 6, Endurance 10, Evasion 12, First Aid 11, Handgun 14, Human Perception 12, Local Expert (Your Home) 12, Perception 12, Persuasion 8, Resist Torture/Drugs 10, Stealth 10, Streetwise 8, Tracking 12, Wardrobe & Style 8',
      inclui: { 'Drive Land Vehicle': 6 },
      gear: 'Neuroport (com o holophone), EMP Threading (as linhas no rosto), cyberbraço Arasaka (dispara a Burya sem quebrar o braço)',
      tip: 'O nômade motorista da equipe do anime. Nomad 6: o +6 em Conduzir Veículo Terrestre já está na base (20). Na missão The Jacket, é quem tinha a jaqueta.'
    },
    {
      name: 'Dalton Estevan-Luis', book: 'Mission Kit', tier: 'aliado', page: 119, rep: 1,
      stats: [5, 6, 6, 7, 4, 6, 5, 4, 4], hp: 35, wounded: 18, deathSave: 4, initiative: '6 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Constitutional Arms Unity', '3d6', 2, 'Handgun', 'Power; 4d6 no tiro mirado', '2077:Constitutional Arms Unity']],
      skills: 'Maker 4, Athletics 8, Brawling 8, Concentration 8, Conversation 6, Drive Land Vehicle 10, Education 7, Electronics/Security Tech 17, Evasion 12, First Aid 13, Handgun 12, Human Perception 16, Local Expert (Your Home) 7, Perception 7, Persuasion 6, Resist Torture/Drugs 10, Stealth 10, Streetwise 8',
      gear: 'Neuroport (com o holophone), Techhair (cabelo artificial vermelho e azul, programável), cyberbraço de ferramentas Dynalar (a mão se abre em um monte de ferramentas)',
      tip: 'O ladrão da jaqueta na missão The Jacket: um mecânico decente e membro de baixo escalão dos Valentinos, que só queria uma vida melhor. Tech 4: o Kit já somou +4 em Tecnologia Eletrônica/Segurança (17).'
    },
    {
      name: 'Socorrista da Reo Meatwagon', book: 'Mission Kit', tier: 'mook', page: 120, rep: 0,
      stats: [5, 4, 5, 7, 3, 4, 4, 4, 3], hp: 30, wounded: 15, deathSave: 4, initiative: '4 + 1d10',
      armor: kitArmor('Kevlar', 7, 4),
      weapons: [['Constitutional Arms Unity', '3d6', 2, 'Handgun', 'Power; 4d6 no tiro mirado', '2077:Constitutional Arms Unity']],
      skills: 'Medicine 2, Athletics 7, Brawling 7, Evasion 8, Handgun 12, Human Perception 6, Paramedic 12, Perception 8',
      gear: 'Neuroport (com o holophone)',
      tip: 'Gonk da ambulância particular. Medtech 2: ganha a perícia Cirurgia. Só as perícias essenciais estão no Kit.'
    },
    {
      name: 'Policial da NCPD', book: 'Mission Kit', tier: 'mook', page: 120, rep: 1,
      stats: [3, 4, 5, 4, 4, 4, 4, 5, 3], hp: 35, wounded: 18, deathSave: 5, initiative: '4 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Militech M-10AF Lexington', '3d6', 2, 'Handgun', 'Power', '2077:Militech M-10AF Lexington']],
      skills: 'Athletics 10, Brawling 8, Evasion 10, Handgun 12, Human Perception 8, Perception 12',
      gear: 'Neuroport (com o holophone)',
      tip: 'O patrulheiro comum da NCPD, sem Role. A Lexington é a pistola preferida da polícia de Night City desde 2030.'
    },
    {
      name: 'Gonk edgerunner', book: 'Mission Kit', tier: 'mook', page: 121, rep: 1,
      stats: [4, 4, 6, 4, 3, 4, 4, 5, 2], hp: 35, wounded: 18, deathSave: 5, initiative: '4 + 2 + 1d10',
      armor: kitArmor('Kevlar', 7, 4),
      weapons: [['Lâmina longa', '3d6', 2, 'Melee Weapon', 'arma branca', 'core:Heavy Melee'], ['Rostovic DB-2 Satara', '5d6', 1, 'Shoulder Arms', 'Tech; balote 5d6, cartucho 3d6', '2077:Rostovic DB-2 Satara']],
      skills: 'Combat Awareness 2, Athletics 8, Brawling 8, Evasion 10, Human Perception 6, Melee Weapon 13, Perception 7, Shoulder Arms 11, Stealth 10',
      gear: 'Neuroport (com o holophone)',
      tip: 'Mercenário de rua sem futuro. Solo 2: +2 na iniciativa.'
    },
    {
      name: 'Netrunner inimigo', book: 'Mission Kit', tier: 'lieutenant', page: 121, rep: 1,
      stats: [5, 4, 4, 6, 3, 4, 4, 4, 2], hp: 30, wounded: 15, deathSave: 4, initiative: '4 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Constitutional Arms Unity', '3d6', 2, 'Handgun', 'Power; 4d6 no tiro mirado', '2077:Constitutional Arms Unity']],
      skills: 'Interface 3, Athletics 6, Brawling 6, Evasion 8, Handgun 10, Human Perception 8, Perception 8, Stealth 10',
      gear: 'Neuroport com um cyberdeck: faz quickhacks',
      tip: 'Interface 3: faz os quickhacks Simples, Padrão e Difíceis (até DV10) e passa direto pelo firewall de fábrica dos Neuroports. Interface 3 dá 2 Ações NET por turno.'
    },
    {
      name: 'Soldado da Arasaka', book: 'Mission Kit', tier: 'mook', page: 122, rep: 2,
      stats: [4, 7, 5, 3, 5, 6, 5, 6, 3], hp: 40, wounded: 20, deathSave: 6, initiative: '7 + 2 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Arasaka HJSH-18 Masamune', '5d6', 1, 'Shoulder Arms', 'Power; 3 balas no tiro único; autofogo (4)', '2077:Arasaka HJSH-18 Masamune']],
      skills: 'Combat Awareness 2, Athletics 10, Autofire 13, Brawling 10, Evasion 11, Human Perception 9, Perception 10, Shoulder Arms 13, Tactics 10',
      gear: 'Neuroport (com o holophone), Self-ICE ×2: para hackear, um netrunner precisa passar 2 Passwalls (DV8)',
      tip: 'A tropa corporativa. Solo 2: +2 na iniciativa. Os dois Self-ICE seguram um netrunner fraco.'
    },
    {
      name: 'Gonk dos Valentinos', book: 'Mission Kit', tier: 'mook', page: 122, rep: 1,
      stats: [4, 6, 6, 4, 3, 4, 4, 5, 3], hp: 35, wounded: 18, deathSave: 5, initiative: '6 + 2 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Taco de beisebol com pregos', '3d6', 2, 'Melee Weapon', 'arma branca', 'core:Heavy Melee'], ['Militech M-76E Omaha', '3d6', 2, 'Handgun', 'Tech; carregada, CDT 2 e até 3 balas', '2077:Militech M-76E Omaha']],
      skills: 'Combat Awareness 2, Athletics 8, Brawling 10, Evasion 12, Handgun 12, Human Perception 8, Melee Weapon 10, Perception 8',
      gear: 'Neuroport (com o holophone)',
      tip: 'Gangueiro dos Valentinos de Heywood. Solo 2: +2 na iniciativa.'
    },
    {
      name: 'Adam Smasher', book: 'Mission Kit', tier: 'boss', page: 123, rep: 10,
      stats: [6, 8, 8, 6, 5, 8, 8, 17, 0], hp: 75, wounded: '—', deathSave: 17, initiative: '8 + 9 + 1d10 (mas sempre age primeiro)',
      armor: 'Blindagem de borg · SP 18 na cabeça e no corpo (18 também contra corpo a corpo e Tech carregada)',
      weapons: [
        ['Punhos de Adam Smasher', '5d6', 2, 'Brawling', 'ignoram metade do SP', 'core:Very Heavy Melee'],
        ['Lança-foguetes no ombro', '9d6', 1, 'Heavy Weapons', 'Smart; explosivo; 4 foguetes', 'core:Rocket Launcher'],
        ['Autoespingarda pop-up', '6d6', 2, 'Shoulder Arms', 'Power; 16 tiros', 'core:Shotgun'],
        ['Metralhadora de cano rotativo', '2d6', 1, 'Heavy Weapons', 'Power; só autofogo (×5); 80 tiros', 'core:Tsunami Arms Helix']
      ],
      skills: 'Combat Awareness 9, Athletics 14, Autofire 18, Brawling 18, Bureaucracy 10, Conceal/Reveal Object 12, Concentration 16, Conversation 2, Cybertech 16, Drive Land Vehicle 12, Education 10, Electronics/Security Tech 10, Endurance 18, Evasion 18, First Aid 10, Handgun 18, Heavy Weapons 18, Human Perception 3, Interrogation 15, Local Expert (Your Home) 8, Melee Weapon 18, Paramedic 10, Perception 16, Persuasion 8, Resist Torture/Drugs 18, Shoulder Arms 18, Stealth 12, Streetwise 10, Tactics 13, Wardrobe & Style 12',
      gear: 'toda a munição é perfurante (abla 2 em vez de 1). Neuroport; Self-ICE ×3 (3 Passwalls DV10); Self-ICE Regenerator (no começo do turno dele, todo netrunner no Neuroport é expulso e os Passwalls voltam); receptor de comunicação com decodificador (uma Ação e Tecnologia Eletrônica/Segurança DV13: escuta holos e rádios a até 50 m); Jumpboosters (ignora as penalidades de salto); matriz de regeneração da armadura (na primeira vez que fica com 40 PV ou menos, a armadura volta a SP 18); corpo de borg completo (ignora estrangulamento e lesões críticas, inclusive o dano bônus; não respira, não come, não bebe); Berserk Implant (ignora Gravemente e Mortalmente Ferido, mas faz Death Save a 0 PV); a Sandevistan experimental dele (sempre ligada em combate: uma Ação de Movimento ou de ataque a mais por turno, sem custo de Humanidade nem de PV)',
      extra: '<p class="note-status">Para o RED, o Kit sugere somar Low Light/Infrared/UV ×2, Anti-Dazzle ×2, Hardened Shielding em todo o cyberware e um Level Damper, e o que mais o mestre achar que ele precisa. O corpo de borg dele é único.</p>',
      tip: 'O chefe final do anime: o equipamento e o cromo são únicos, refeitos pelos melhores Techs da Arasaka. EMP —: não tem Humanidade a perder. Solo 9.'
    },
    {
      name: 'Maria Torres', book: 'Mission Kit', tier: 'lieutenant', page: 125, rep: 5,
      stats: [6, 8, 8, 6, 6, 6, 6, 7, 5], hp: 45, wounded: 23, deathSave: 7, initiative: '8 + 6 + 1d10',
      armor: kitArmor('Light Armorjack', 11, 6),
      weapons: [['Mantis Blade ×2', '3d6', 1, 'Melee Weapon', 'excelente; sem gastar Ação para sacar', 'core:Heavy Melee'], ['Techtronika RT-46 Burya', '4d6', 1, 'Handgun', 'Tech; carrega sem gastar a Ação de Movimento', '2077:Techtronika RT-46 Burya']],
      skills: 'Combat Awareness 6, Athletics 16, Brawling 14, Bribery 10, Concentration 8, Conversation 7, Drive Land Vehicle 10, Education 8, Endurance 10, Evasion 16, First Aid 8, Handgun 16, Human Perception 9, Interrogation 12, Local Expert (Your Home) 10, Melee Weapon 16, Perception 12, Persuasion 10, Resist Torture/Drugs 12, Stealth 10, Streetwise 12, Tactics 10, Wardrobe & Style 8',
      gear: 'Neuroport (com o holophone), EMP Threading (as linhas no rosto), dois cyberbraços Arasaka com Mantis Blade, Berserk Implant (ativado, ignora Gravemente e Mortalmente Ferido, mas faz Death Save a 0 PV)',
      tip: 'A tenente de Gustavo Orta, dos Valentinos, na missão The Jacket: quer achar Dalton, e tem ordem de matá-lo. Solo 6: +6 na iniciativa.'
    }
  ];

  // A ficha do Black Chrome (p. 153): Rex Royale, o fixer do mercado F (Rex’s Casino Royale). As outras fichas de fixer
  // dos Mercados Noturnos estão nas páginas que faltam no PDF do projeto.
  const bcNpcs = [
    {
      name: 'Rex Royale', book: 'Black Chrome', tier: 'aliado', page: 153, rep: 7,
      stats: [7, 7, 7, 4, 8, 6, 4, 6, 4], hp: 40, wounded: 20, deathSave: 6, initiative: '7 + 1d10',
      armor: 'Subdermal Armor e Corporate Island · SP 11 na cabeça (Subdermal Armor) e 12 no corpo (Corporate Island melhorada por um Tech)',
      weapons: [['Kendachi Mono-Three', '4d6', 1, 'Melee Weapon', 'exótica', 'core:Kendachi Mono-Three'], ['Westwood', '4d6', 1, 'Handgun', 'Black Chrome; excelente, melhorada por um Tech', 'bc:Westwood']],
      skills: 'Operator 8, Athletics 9, Brawling 13, Bribery 12, Conceal/Reveal Object 15, Concentration 8, Conversation 6, Education 9, Evasion 13, First Aid 6, Gamble 17, Handgun 16, Human Perception 6, Language (English) 11, Language (Cantonese Chinese) 11, Language (Italian) 11, Language (Japanese) 11, Language (Korean) 11, Language (Russian) 11, Language (Spanish) 11, Language (Streetslang) 9, Lip Reading 9, Local Expert (Little China) 13, Local Expert (University District) 13, Local Expert (Upper Marina) 13, Melee Weapon 16, Perception 11, Persuasion 14, Resist Torture/Drugs 10, Stealth 9, Streetwise 14, Trading 16, Wardrobe & Style 10',
      gear: '12 balas básicas de pistola muito pesada, Agent, baralho, óculos inteligentes com Image Enhancement e um ônibus TetraCorp America Badger Corporate Bus; implante anticoncepcional, dois Cybereyes com Blindagem reforçada e Low Light/Infrared/UV, dois Shift Tacts, Subdermal Armor',
      tip: 'O fixer do Rex’s Casino Royale, o mercado F do Black Chrome, e o dono da rede de proteção do bairro One Block. Apareceu primeiro no Jumpstart Kit do RED, com o chefe dos capangas dele, o Solo Grant Jung ("Royal"). Prefere receber em favores, e a casa sempre ganha. A Westwood é de qualidade excelente; no Foundry, ela e a Corporate Island vêm do compêndio Black Chrome.'
    }
  ];

  const campaignCast = [
    {
      name: 'Wakako Okada', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [7, 4, 4, 4, 8, 7, 3, 4, 6], hp: 40, wounded: 20, deathSave: 4, initiative: '4 + 1d10',
      armor: 'Kevlar · SP 7 na cabeça e no corpo (sob o quimono)',
      weapons: [['Pistola média', '2d6', 2, 'Handgun', 'escondida na manga']],
      skills: 'Operator 8, Accounting 11, Bribery 14, Bureaucracy 11, Business 13, Concentration 11, Conversation 12, Deduction 11, Education 11, Handgun 8, Human Perception 14, Interrogation 12, Language (English) 11, Language (Japanese) 13, Language (Streetslang) 11, Local Expert (Your Home) 15, Perception 11, Persuasion 15, Personal Grooming 8, Resist Torture/Drugs 11, Streetwise 15, Trading 14, Wardrobe & Style 9',
      gear: 'munição de pistola média ×20, Agent, a rede de contatos de Japantown e Kabuki, a rota do "caminhão de peixe" para fora da cidade',
      tip: 'Não é ficha de combate: quando se irrita, fica mais educada. Operator 8 dá contatos em toda Night City e pechincha (até 20%). Mina Kuroda fica sempre perto. Personagens, "Wakako Okada".'
    },
    {
      name: 'Mina Kuroda', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [5, 7, 7, 3, 6, 6, 6, 7, 3], hp: 45, wounded: 23, deathSave: 7, initiative: '9 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Arma branca pesada', '3d6', 2, 'Melee Weapon', 'katana'], ['Pistola muito pesada', '4d6', 1, 'Handgun', 'escondida']],
      skills: 'Athletics 11, Brawling 12, Concentration 9, Conversation 5, Education 7, Evasion 13, First Aid 5, Handgun 12, Human Perception 8, Interrogation 9, Language (Native) 7, Language (Streetslang) 7, Local Expert (Your Home) 9, Melee Weapon 14, Perception 11, Persuasion 7, Resist Torture/Drugs 10, Stealth 9, Tactics 8',
      gear: 'munição de pistola muito pesada ×20, rádio comunicador, Cybereye (TeleOptics, discreto), Neural Link (Kerenzikov)',
      tip: 'A guarda de Wakako: fica perto dela sem bloquear a saída, observa as mãos e só intervém quando um limite foi cruzado. A iniciativa soma REF 7 e +2 do Kerenzikov. Para um Tyger Claw de elite, troque o Kerenzikov por um Sandevistan (Cyberware de 2077).'
    },
    {
      name: 'Dr. Kenzo Endo', book: 'Protocolo Morana', tier: 'mook', page: null,
      stats: [8, 4, 5, 8, 3, 4, 4, 4, 5], hp: 30, wounded: 15, deathSave: 4, initiative: '4 + 1d10',
      armor: 'Sem armadura',
      weapons: [],
      skills: 'Acting 8, Basic Tech 12, Concentration 8, Conversation 7, Cryptography 14, Cybertech 14, Deduction 12, Education 14, Electronics/Security Tech 15, First Aid 10, Human Perception 6, Language (English) 10, Language (Japanese) 12, Language (Streetslang) 9, Library Search 12, Local Expert (Your Home) 10, Paramedic 10, Perception 10, Persuasion 5, Resist Torture/Drugs 7, Science (Biology) 12, Stealth 7',
      gear: 'a maleta blindada de 2070, presa ao pulso (trava biométrica), implante muscular antigo no pescoço (lote militar de 2069), Agent com as gravações',
      tip: 'Na Sessão 01 começa com 10 PV (Gravemente Ferido: −2 em tudo) e espasmos da Fúria de Morana. Atuação 8 é a mentira ("era só um entregador"): Percepção Humana contra ela revela que ele esconde algo. As travas da maleta estão na Sessão 01, Cena 3.'
    },
    {
      name: 'Dra. Reina Sato', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [8, 5, 5, 8, 7, 8, 5, 5, 4], hp: 45, wounded: 23, deathSave: 5, initiative: '5 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo (o casaco de campo)',
      weapons: [['Pistola pesada', '3d6', 2, 'Handgun']],
      skills: 'Medicine 6, Basic Tech 12, Concentration 12, Conversation 7, Cryptography 13, Cybertech 15, Deduction 14, Education 15, Electronics/Security Tech 14, First Aid 12, Handgun 9, Human Perception 8, Interrogation 11, Language (English) 10, Language (Japanese) 12, Language (Streetslang) 9, Library Search 13, Local Expert (Your Home) 10, Paramedic 14, Perception 12, Persuasion 13, Resist Torture/Drugs 12, Science (Biology) 15, Stealth 9, Tactics 12',
      gear: 'munição de pistola pesada ×30, terminal com o código de Morana e a lista dos sobreviventes de 2070, Medtech Bag, Neural Link (Interface Plugs)',
      tip: 'Prefere convencer a atacar e evita matar quando uma desativação remota resolve. Com acesso a Morana, trava o implante de um sobrevivente da lista (teste de resistência no estágio atual). Sem o vírus, é uma cientista com uma pistola: a força dela está em Iskra. Personagens, "Dra. Reina Sato".'
    },
    {
      name: 'Iskra Voss', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [4, '8 (6)', '6 (4)', 4, 6, 5, '6 (4)', 7, 4], hp: 40, wounded: 20, deathSave: 7, initiative: '8 + 1d10',
      armor: 'Medium Armorjack · SP 13 na cabeça e no corpo · −2 REF, DEX e MOVE',
      weapons: [['Pistola muito pesada', '4d6', 1, 'Handgun', 'inteligente: +1 no ataque (Subdermal Grip)'], ['Arma branca média', '2d6', 2, 'Melee Weapon', 'cassetete']],
      skills: 'Athletics 10 (8), Autofire 12 (10), Brawling 10 (8), Concentration 7, Conversation 6, Deduction 6, Drive Land Vehicle 12 (10), Education 6, Evasion 10 (8), First Aid 6, Handgun 10 (8), Human Perception 6, Interrogation 8, Language (Native) 6, Language (Streetslang) 6, Local Expert (Your Home) 6, Melee Weapon 10 (8), Perception 6, Persuasion 8, Resist Torture/Drugs 10, Shoulder Arms 10 (8), Stealth 6 (4), Tactics 8',
      gear: 'munição de pistola muito pesada ×50, óculos escuros, algemas ×2, rádio comunicador, Cyberarm esquerdo militar (lote de 2069, Subdermal Grip), Cybereye ×2 (Kiroshi de primeira geração), Neural Link (Kerenzikov)',
      tip: 'O Oficial de segurança do livro, como os documentos pedem, com a pistola inteligente no lugar do rifle. Prefere capturar a matar, nunca ameaça duas vezes e recua Gravemente Ferida. Quando Morana está perto, a íris pisca em vermelho. A equipe dela usa as fichas de Operativo de segurança e Netrunner.'
    },
    {
      name: 'Vega', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [4, 8, 6, 4, 6, 5, 6, 7, 4], hp: 40, wounded: 20, deathSave: 7, initiative: '10 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Rifle de assalto', '5d6', 1, 'Shoulder Arms', 'inteligente: +1 no ataque · autofogo (4), supressão'], ['Pistola muito pesada', '4d6', 1, 'Handgun']],
      skills: 'Athletics 10, Autofire 12, Brawling 10, Concentration 7, Conversation 6, Education 6, Evasion 10, First Aid 6, Handgun 10, Human Perception 8, Interrogation 8, Language (Native) 6, Language (Streetslang) 6, Local Expert (Your Home) 6, Perception 8, Persuasion 8, Resist Torture/Drugs 7, Shoulder Arms 11, Stealth 6, Tactics 8',
      gear: 'munição de rifle ×50, munição de pistola muito pesada ×30, rádio comunicador, visor com leitura tática, Neural Link (Kerenzikov, Interface Plugs)',
      tip: 'Sessão 01, Cena 4. Começa oferecendo rendição, mira nas pernas quando pode incapacitar e recua Gravemente Ferida ou quando dois da equipe caem. Pode oferecer o dobro de Wakako. A equipe: dois Operativos de segurança, um Netrunner e um técnico de contenção (Guarda-costas com Tecnologia Básica 11 e a caixa de Faraday).'
    },
    {
      name: 'Brakk', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [3, 6, 6, 5, 4, 5, 4, 6, 4], hp: 40, wounded: 20, deathSave: 6, initiative: '6 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Wolvers', '3d6', 2, 'Melee Weapon', 'arma cibernética'], ['Espingarda', '5d6', 1, 'Shoulder Arms', 'balote'], ['Pistola pesada', '3d6', 2, 'Handgun']],
      skills: 'Athletics 12, Basic Tech 9, Brawling 8, Concentration 7, Conversation 6, Deduction 7, Drive Land Vehicle 10, Education 5, Electronics/Security Tech 9, Endurance 11, Evasion 8, First Aid 7, Handgun 10, Human Perception 6, Land Vehicle Tech 7, Language (Native) 5, Language (Streetslang) 5, Local Expert (Your Home) 5, Melee Weapon 10, Paramedic 7, Perception 8, Persuasion 6, Pick Lock 7, Resist Torture/Drugs 10, Shoulder Arms 10, Stealth 10, Weaponstech 9, Wilderness Survival 7',
      gear: 'balotes de espingarda ×25, munição de pistola pesada ×25, Cyberarm ×2 (Wolvers), Cybereye ×2 (Low Light/Infrared/UV), o rosto quase todo coberto de placas, rádio comunicador',
      tip: 'O Chefe reclaimer do livro com Wolvers, como a Sessão 02 pede. O profeta do culto da Maelstrom que ouve "a voz" no hospital queimado: cobra dízimo, pode virar aliado temporário ou, conectado ao Gatilho, um antagonista que fala com a voz de Morana. Os cultistas: Maelstrom (Facções de 2077).'
    },
    {
      name: 'Tamsin “Fuse” Ilyin', book: 'Protocolo Morana', tier: 'lieutenant', page: null,
      stats: [6, 6, 6, 8, 6, 8, 5, 6, 5], hp: 45, wounded: 23, deathSave: 6, initiative: '6 + 1d10',
      armor: 'Light Armorjack · SP 11 na cabeça e no corpo',
      weapons: [['Espingarda', '5d6', 1, 'Shoulder Arms', 'balote'], ['Pistola pesada', '3d6', 2, 'Handgun']],
      skills: 'Maker 5, Athletics 9, Basic Tech 14, Brawling 9, Concentration 11, Conversation 7, Cryptography 11, Cybertech 13, Deduction 10, Demolitions 12, Education 10, Electronics/Security Tech 15, Evasion 9, First Aid 11, Handgun 10, Human Perception 8, Interrogation 9, Language (English) 9, Language (Streetslang) 9, Local Expert (Your Home) 11, Perception 10, Persuasion 8, Resist Torture/Drugs 13, Shoulder Arms 10, Stealth 9, Tactics 9, Weaponstech 12',
      gear: 'balotes de espingarda ×25, munição de pistola pesada ×25, rádios analógicos, cabos blindados, a lista de expostos escrita à mão. Nenhum implante conectado: arrancou o próprio conector em 2070',
      tip: 'Não faz o teste de resistência a Morana: não tem cromo conectado. Pede que desliguem os implantes antes de entrar no abrigo de Pacifica. Uma cena com Iskra vale mais que um tiroteio. Personagens, "Tamsin".'
    },
    {
      name: 'Tomas Vale', book: 'Protocolo Morana', tier: 'mook', page: null,
      stats: [7, 5, 5, 5, 5, 5, 5, 4, 6], hp: 35, wounded: 18, deathSave: 4, initiative: '5 + 1d10',
      armor: 'Couro · SP 4 na cabeça e no corpo',
      weapons: [['Pistola média', '2d6', 2, 'Handgun']],
      skills: 'Composition 13, Concentration 8, Conversation 10, Cryptography 9, Deduction 11, Education 11, Handgun 7, Human Perception 12, Interrogation 9, Language (English) 9, Language (Streetslang) 9, Library Search 13, Local Expert (Your Home) 11, Perception 11, Persuasion 9, Photography/Film 11, Stealth 9, Streetwise 9',
      gear: 'câmera, Agent com as gravações dos sobreviventes, a senha parcial de um dos servidores',
      tip: 'O jornalista desaparecido: pode estar morto, preso pela Arasaka, escondido com os sobreviventes ou trabalhando sob coação. Personagens, "Jornalista desaparecido".'
    }
  ];

  // ---------------- Trauma Team (p. 224) ----------------
  const traumaTeam = `${list([
    'Chamar a Trauma Team é uma Ação. Com um Agent ligado a um Biomonitor, a chamada é automática quando o cliente fica com PV abaixo do BODY ou sofre uma lesão crítica que arranca parte do corpo.',
    'Role <b>1d6</b>: é o número de rodadas até a chegada. A equipe entra no <b>topo da ordem de iniciativa</b>.',
    'Funciona como os reforços do Lawman: além de SP, PV e MOVE & BODY, cada membro tem um <b>Valor de Combate</b>, que soma <b>+1d10</b> para atacar e para se defender. <b>Não se esquivam de balas.</b>',
    'São 5 pessoas num AV-4 com uma arma pesada montada (Tsunami Arms Helix, p. 347), 4 Cryotanks e uma mesa de cirurgia.',
    'Prioridade: pôr os clientes nos sacos criogênicos no mesmo turno em que chegam e decolar sob fogo de cobertura. Quem atrapalha vira alvo.'
  ])}${table(['Membro', 'Equipamento', 'Valor de Combate', 'SP', 'PV', 'MOVE & BODY'], [
    ['Médico', 'Light Armorjack, Cryopump, pistola pesada, 2 Airhypos com Rapidetox. Usa o Valor de Combate também em Primeiros Socorros, Paramédico, Cirurgia e Tecnologia Médica.', 10, 11, 20, 4],
    ['Assistente médico', 'Kevlar, Cryopump, escudo à prova de balas. Usa o Valor de Combate em Pilotar Veículo Aéreo, Primeiros Socorros, Paramédico e Tecnologia Médica.', 10, 7, 25, 6],
    ['Piloto', 'Kevlar, pistola muito pesada. Usa o Valor de Combate em Tecnologia de Aeronaves, Primeiros Socorros e Pilotar Veículo Aéreo.', 10, 7, 25, 6],
    ['Oficiais de segurança (×2)', 'Gorilas em Heavy Armorjack, com rifles de assalto.', 10, 13, 30, 4]
  ])}<p>${button('damage', 'Planos e preços da Trauma Team')}</p>`;

  // ---------------- Facções de 2077 ----------------
  // [facção, onde, capanga, tenente, na campanha, fonte]
  const faction = (name, where, mook, lieutenant, campaign, source) => entry({
    name, tag: `${where} · ${source}`,
    stats: [['Capanga', mook[0]], ['Tenente', lieutenant[0]]],
    text: `<b>Capangas:</b> ${mook[1]}`,
    extra: `<p><b>Tenente:</b> ${lieutenant[1]}</p>`,
    tip: campaign
  });
  const factions = [
    faction('Tyger Claws', 'Japantown e Kabuki', ['Boosterganger', 'troque os Rippers por uma katana (arma branca pesada, 3d6, CDT 2, Armas Brancas 11) e o couro por Kevlar (SP 7); adicione cyberolhos Kiroshi. Muitos chegam de moto.'],
      ['Oficial de segurança', 'troque o rifle por uma katana (Armas Brancas 10) e uma SMG (2d6, autofogo); a elite troca o Kerenzikov por um Sandevistan.'],
      'A gangue de Wakako. Para Mina Kuroda, a guarda-costas dela, use o tenente com a katana.', 'adaptação'),
    faction('Maelstrom', 'Northside, Watson', ['Boosterganger', 'troque o couro por Light Armorjack (SP 11); mantenha os Rippers ou troque por outra arma cibernética. Óticas vermelhas por toda parte.'],
      ['Oficial de segurança', 'adicione uma arma cibernética à escolha.'],
      'O culto do hospital queimado (Sessão 02): cultistas como capangas e Brakk como Chefe reclaimer com Wolvers.', 'livro, p. 422'),
    faction('Valentinos', 'Heywood', ['Guarda-costas', 'troque a espingarda ruim por uma pistola pesada banhada a ouro (3d6, CDT 2).'],
      ['Oficial de segurança', 'troque o rifle por uma espingarda (5d6).'],
      'Honra e família: não atacam quem está sob a palavra de um Valentino, e nunca esquecem uma dívida.', 'adaptação'),
    faction('6th Street', 'Santo Domingo e Heywood', ['Operativo de segurança', 'ex-militares: troque o rifle ruim por um rifle de assalto de qualidade padrão (5d6, não emperra).'],
      ['Oficial de segurança', 'como no livro.'],
      'Lutam em formação: metade dá fogo supressivo enquanto a outra metade flanqueia.', 'adaptação'),
    faction('Animals', 'Pacifica', ['Guarda-costas', 'tire a espingarda; adicione um cyberbraço com Gorilla Arm (o punho é arma branca pesada excelente: 3d6, CDT 2, +1 no ataque; empunha como BODY 11).'],
      ['Chefe reclaimer', 'com dois Gorilla Arms e Grafted Muscle and Bone Lace: BODY 8, PV 45, Gravemente Ferido 23, Death Save 8.'],
      'Preferem os punhos às armas. Tiro de longe irrita, mas não os faz recuar.', 'adaptação'),
    faction('Voodoo Boys', 'Pacifica', ['Boosterganger', 'guardas do prédio, como no livro.'],
      ['Netrunner', 'como no livro; eles lutam na NET: encha a arquitetura com Black ICE e demônios do Arsenal.'],
      'Querem o netrunner do grupo, não o vírus (veja os ganchos dos personagens).', 'adaptação'),
    faction('Scavengers', 'Watson', ['Boosterganger', 'troque os Rippers por uma arma branca leve (1d6), como os catadores do livro.'],
      ['Chefe reclaimer', 'troque a espingarda por uma serra cirúrgica (arma branca pesada, 3d6); Paramédico 10 para arrancar implantes.'],
      'Colecionam cromo de vivos e de mortos: um personagem inconsciente é um alvo. Se o grupo deixou o corpo de Kobo no depósito, foram eles que o levaram (Sessão 02).', 'livro, p. 419 + adaptação'),
    faction('Mox', 'Kabuki (Lizzie\'s Bar)', ['Guarda-costas', 'como no livro.'],
      ['Oficial de segurança', 'sem o rifle de assalto.'],
      'Protegem quem trabalha na Jig-Jig Street. Quase nunca atacam primeiro: são aliados fáceis, se o grupo respeitar as regras da casa.', 'adaptação'),
    faction('Nômades e Wraiths', 'Badlands', ['Gangue de estrada', 'nômades (livro): troque o couro por Kevlar. Wraiths e saqueadores: troque a besta por um rifle de assalto e o couro por Medium Armorjack; Arquearia vira Armas de Ombro.'],
      ['Outrider', 'como no livro.'],
      'Os Aldecaldos podem ser a saída da cidade; os Wraiths são o preço de pegar a estrada errada.', 'livro, p. 419–421'),
    faction('NCPD', 'toda Night City', ['Operativo de segurança', 'patrulha de dia: metade do grupo, com rifles de assalto, pistolas muito pesadas e cassetete. Pedem documentos a quem anda armado; se alguém discute, chamam 3 policiais de reforço.'],
      ['Oficial de segurança', 'patrulha à noite. Depois da meia-noite, adicione Interface Plugs e Smartgun Link.'],
      'Atiram primeiro e preenchem o relatório depois, se alguém sacar uma arma.', 'livro, p. 417–422'),
    faction('MaxTac', 'toda Night City', ['—', 'a MaxTac não tem capangas.'],
      ['Outrider como mini-chefe', 'tire Moto e Afinidade com Animais; troque a Light Armorjack por Heavy Armorjack (SP 13, −2 em REF, DEX e MOVE e nas perícias deles, como o Oficial de segurança); rifle de assalto; adicione Mantis Blades (3d6) ou um Sandevistan. Cada agente conta como 3 personagens.'],
      'Chega 10 minutos depois de um surto ser reportado (ganchos dos personagens). É o relógio da cena, não uma luta para vencer.', 'adaptação'),
    faction('Segurança corporativa', 'Arasaka, Militech, Kang Tao', ['Operativo de segurança', 'de dia: Light Armorjack e SMG ruim no lugar do rifle. À noite: Heavy Armorjack e SMG pesada ruim.'],
      ['Oficial de segurança', 'depois da meia-noite: SMG pesada, Interface Plugs e Smartgun Link. Em 2077, uma SMG Smart (Arasaka TKI-20 Shingen).'],
      'A equipe de Iskra (Sessões 01 e 02) e a segurança do datafort da Militech em Arroyo, onde está a Coleira.', 'livro, p. 417–421 + adaptação')
  ];

  // ---------------- Encontros de 2077 ----------------
  // Tabelas de encontro do RED (p. 417–425: dia, noite e madrugada), com as gangues trocadas pelas de 2077.
  // Cada linha: [de, até, título, texto, sub-rolagem 1d10 ou null, fichas]. N = número de jogadores.
  const ficha = (name, label = name) => `<a href="#npcs/${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${label}</a>`;
  const boost = mods => `${ficha('Boosterganger')}${mods ? ` (${mods})` : ''}`;
  const ncpdDia = 'Se vocês andam com arma ou armadura à vista, eles param e pedem documentos. Se alguém discute, chamam reforço (3 policiais) para levar vocês. Se alguém vai pegar uma arma, atiram primeiro e preenchem a papelada depois.';
  const pi = [[1, 3, 'Está à frente de vocês, pressionando um informante na esquina sobre o paradeiro de um suspeito.'], [4, 7, 'Está seguindo alguém à frente de vocês.'], [8, 10, 'Para vocês e pergunta se viram a pessoa que ele está seguindo.']];
  const corpos = [[1, 4, 'Estão sendo seguidos por gangers (N) que querem assaltá-los.'], [5, 8, 'Acham que vocês são boosters e atiram à menor provocação.'], [9, 10, 'Acham que vocês são encrenca e chamam a segurança corporativa.']];
  const midia = [[1, 5, 'O alvo da matéria descobre a dupla e começa a briga. Vocês, claro, estão no meio. Role de novo na tabela para saber quem é o alvo.'], [6, 10, 'Ainda não aconteceu nada.']];
  const midiaFicha = `Dupla: ${boost('Kevlar no lugar do couro; pistola pesada no lugar da muito pesada ruim; sem Rippers; + cyberolho MicroVideo, Cyberaudio e Audição Ampliada')}.`;
  const trauma = ['Trauma Team', 'O AV-4 pousa no meio de um tiroteio recente, e os médicos atendem meia dúzia de gangers feridos.', [[1, 5, 'A equipe decide que vocês são curiosos e ignora vocês.'], [6, 10, 'Acham que vocês são parte do problema, e os 2 seguranças abrem fogo com rifles de assalto.']], `${ficha('Trauma Team')}.`];
  const testemunhas = [[1, 4, 'Não notam vocês.'], [5, 8, 'Notam vocês, e um deles manda vocês sumirem.'], [9, 10, 'Decidem que vocês são testemunhas e precisam ser apagados agora.']];
  const viciados = (count, extra) => [`Viciados (${count})`, `Atrás de dinheiro para a droga. ${extra} Facas e porretes, sem armadura.`, null, `${boost('arma branca leve no lugar dos Rippers; sem pistola e sem couro')}.`];
  const cromados = ['Fãs de rock cromado', 'Fãs radicais de uma banda de rock cromado, de couro com espetos e braços cheios de cromo e armas cibernéticas.'];
  const cromadosFicha = `${boost('+ 2 cyberbraços com Superchrome; Wolvers no lugar dos Rippers; Light Armorjack no lugar do couro')}.`;
  const turfWar = sides => `Uma guerra aberta entre as duas maiores gangues da área. Cada lado tem um membro por jogador (mínimo 4), com o equipamento da facção. Armas cibernéticas por todo lado. Escolham um lado ou um alvo. Lados possíveis: ${sides}.`;

  const encounterTables = {
    dia: { label: 'Dia', ref: '417–419', linhas: [
      [1, 5, 'NCPD', `Policiais (metade de N) com rifles de assalto, pistolas muito pesadas, cassetetes e Kevlar. ${ncpdDia}`, null, `${ficha('Operativo de segurança')}; ${ficha('NCPD')}.`],
      [6, 11, 'Segurança corporativa', 'Guardas de baixo escalão (N) patrulhando, com Light Armorjack e SMGs. Se vocês não trabalham para a corp deles, não têm nada que fazer ali. Circulando.', null, `${ficha('Operativo de segurança')} (Light Armorjack no lugar do Kevlar; SMG ruim no lugar do rifle ruim); ${ficha('Segurança corporativa')}.`],
      [12, 13, 'Techs', 'Techs (metade de N) com espingardas e coletes de Kevlar.', [[1, 2, 'Carregando uma caixa de ferramentas para um AV-4.'], [3, 5, 'Consertando um sistema da cidade bem no caminho de vocês.'], [6, 10, 'Vindo na direção de vocês, a caminho do trabalho.']], `${ficha('Guarda-costas')} (+ Tool Hand e cyberolho MicroOptics).`],
      [14, 17, 'Investigador particular', 'Um detetive com pistola muito pesada, cassetete e Medium Armorjack.', pi, `${ficha('Oficial de segurança')} (sem o rifle de assalto e o escudo).`],
      [18, 20, 'Corporativos', 'Corporativos de uma firma local (N), de ternos tecidos com Kevlar e pistolas médias, tentando pegar um táxi.', corpos, `Corporativos: ${boost('sem Rippers; Kevlar no lugar do couro; pistola média no lugar da muito pesada ruim; + Cyberaudio e rádio scanner')}. Gangers: ${ficha('Boosterganger')}.`],
      [21, 27, 'Locais', 'Dois jovens do bairro.', [[1, 5, 'Estão sendo assaltados pela gangue do bairro (N).'], [6, 10, 'Estão levando uma surra de fanáticos anti-cromo (N), pelo "pecado" de ter olhos de grife.']], `Jovens: ${boost('sem Rippers nem pistola')}. Gangue: ${boost('Heavy Armorjack no lugar do couro')}, ou a facção do bairro. Fanáticos: ${boost('arma branca média no lugar dos Rippers; sem Techhair')}.`],
      [28, 32, 'Reclaimers', 'Um grupo bem equipado (N − 2) com um chefe, tentando fazer um gato de um prédio abandonado na rede elétrica.', [[1, 5, 'Ignoram vocês.'], [6, 8, 'O chefe e um deles vêm "dar uma olhada nesses caras que estão nos vigiando".'], [9, 10, 'Estouram um transformador e o quarteirão inteiro apaga. Pânico geral.']], `${ficha('Gangue de estrada')}; chefe: ${ficha('Chefe reclaimer')}.`],
      [33, 37, 'Media', 'Uma dupla de câmera e repórter, de tocaia num prédio atrás de uma matéria quente.', midia, midiaFicha],
      [38, 41, 'Investigador particular', 'Um detetive com pistola muito pesada, cassetete e Medium Armorjack.', [[1, 3, 'Está à frente de vocês, espancando um informante na esquina.'], [4, 7, 'Está arrombando o carro de alguém.'], [8, 10, 'Para vocês e exige respostas sobre o paradeiro do alvo dele.']], `${ficha('Oficial de segurança')} (sem o rifle de assalto e o escudo).`],
      [42, 46, ...trauma],
      [47, 57, 'Catadores', 'Catadores miseráveis (N) revirando ruínas ou lixo perto de um quarteirão queimado. Couro imundo, facas improvisadas e pistolas muito pesadas ruins. Se houver violência, até 6 outros podem vir ajudar.', [[1, 6, 'Pedem dinheiro ou qualquer coisa que vocês possam dar.'], [7, 8, 'Ignoram vocês.'], [9, 10, 'Tentam roubar vocês.']], `${boost('arma branca leve no lugar dos Rippers')}.`],
      [58, 63, 'Nômades na cidade', 'Nômades (N) de couro, com bestas, facas e pistolas muito pesadas. Meio bêbados e querendo briga: implicam com quem acham atraente no grupo. Encarem: eles querem briga.', null, `${ficha('Gangue de estrada')}; ${ficha('Nômades e Wraiths')}.`],
      [64, 70, 'Gangue do bairro', 'Punks de rua de baixo nível (N) da gangue local. Se vocês parecem presa fácil e com dinheiro, partem para cima. Pistolas muito pesadas e Rippers.', null, `${ficha('Boosterganger')}, ou a facção do bairro.`],
      [71, 76, ...viciados('N', 'Se vocês não vestem as cores de uma corp ou de uma gangue, atacam ali mesmo, na rua.')],
      [77, 82, 'Pregadores do fim do mundo', 'Cultistas (N), com facas, porretes e pistolas pesadas à vista, encurralam vocês para pregar que o fim dos tempos chegou. Se vocês desprezarem, tentam enfiar a verdade na porrada.', null, `${boost('Big Knucks no lugar dos Rippers; pistola pesada ruim no lugar da muito pesada ruim; + arma branca leve')}.`],
      [83, 88, 'Caminhão dos Aldecaldos', 'Nômades (metade de N, mínimo 2) com um caminhão quebrado. A maioria encara uma gangue local (N), e o último tenta consertar o motor. Se vocês ignorarem, eles ignoram vocês.', [[1, 6, 'Se vocês oferecerem ajuda, aceitam.'], [7, 10, 'Se vocês oferecerem ajuda, recusam.']], `Nômades: ${ficha('Gangue de estrada')} (Kevlar no lugar do couro). Gangue: ${ficha('Boosterganger')}.`],
      [89, 94, 'Tyger Claws', 'Tyger Claws (N) com SMGs, Rippers, cyberolhos de pouca luz e speedware. Implicam com quem se destaca no grupo, extorquem dinheiro e querem briga.', null, `${boost('SMG ruim no lugar da pistola muito pesada ruim; + cyberolhos Low Light/IR/UV, Neural Link e Kerenzikov')}; ${ficha('Tyger Claws')}.`],
      [95, 100, 'Crime organizado', 'Uma grande operação de um sindicato do crime. Solos (N − 2) com pistolas muito pesadas, espingardas e Heavy Armorjack descarregam contrabando de um caminhão, liderados por um solo veterano.', testemunhas, `Solos: ${ficha('Operativo de segurança')}. Veterano: ${ficha('Oficial de segurança')}. Espingardas no lugar dos rifles de assalto.`]
    ]},
    noite: { label: 'Noite', ref: '419–422', linhas: [
      [1, 5, 'NCPD', `Policiais (metade de N) com rifles de assalto e Medium Armorjack. ${ncpdDia.replace('(3 policiais)', '(3 operativos)')}`, null, `${ficha('Oficial de segurança')}; ${ficha('NCPD')}.`],
      [6, 11, 'Segurança corporativa', 'Guardas (N) patrulhando, com Heavy Armorjack e SMGs pesadas. Se vocês não são corporativos, não têm nada que fazer no território deles. Circulando.', null, `${ficha('Operativo de segurança')} (Heavy Armorjack no lugar do Kevlar; SMG pesada ruim no lugar do rifle ruim); ${ficha('Segurança corporativa')}.`],
      [12, 13, 'Techs corporativos', 'Techs (metade de N) com guarda-costas bem armados (metade de N).', [[1, 2, 'Carregando caixas de peças num AV-4.'], [3, 5, 'Consertando um sistema da cidade bem no caminho de vocês.'], [6, 10, 'Arrumando um carro bonito na beira da rua.']], `Techs: ${ficha('Guarda-costas')} (+ Tool Hand e cyberolho MicroOptics). Seguranças: ${ficha('Guarda-costas')} (Medium Armorjack; espingarda padrão; + Luneta de Mira).`],
      [14, 17, 'Investigador particular', 'Um detetive com um revólver de grosso calibre, um facão e Light Armorjack.', pi, `${ficha('Chefe reclaimer')} (sem barraca nem espingarda; pistola muito pesada no lugar da pesada; arma branca média no lugar da pesada).`],
      [18, 20, 'Corporativos', 'Corporativos de uma firma grande (N), a caminho da estação do metrô, de ternos tecidos com Kevlar e pistolas descartáveis de polímero.', corpos, `Corporativos: ${boost('sem Rippers; Kevlar no lugar do couro; + Cyberaudio e rádio scanner')}. Gangers: ${ficha('Boosterganger')}.`],
      [21, 25, 'Rockerboys', 'Vocês alcançam uma banda (metade de N − 1) a caminho de um show, com solos de segurança (metade de N) e o empresário, um fixer.', [[1, 4, 'Convidam vocês para ir junto.'], [5, 8, 'Mandam os solos "resolver esses caras que estão nos seguindo".'], [9, 10, 'Ignoram vocês.']], `Músicos: ${boost('+ AudioVox e instrumentos')}. Fixer: ${boost('+ Cyberaudio e Agent interno')}. Seguranças: ${ficha('Guarda-costas')}.`],
      [26, 30, 'Media', 'Uma dupla de câmera e repórter, de tocaia num prédio atrás de uma matéria quente.', [[1, 5, 'O alvo da matéria descobre a dupla e começa um tiroteio. Vocês, claro, estão no meio. Role de novo na tabela para saber quem é o alvo.'], [6, 10, 'Ainda não aconteceu nada.']], midiaFicha],
      [31, 33, 'Netrunners brincalhões', 'Um coletivo de netrunners que vive pregando peças está aprontando de novo. Desfazer a peça pede Tecnologia Eletrônica/Segurança DV14.', [[1, 2, 'Três deles armam uma pegadinha com 3 ou 4 objetos domésticos estranhos, mas uma gangue (N) percebe e começa a briga.'], [3, 4, 'Três deles hackearam os postes para piscar no ritmo de um hit pop.'], [5, 6, 'Três deles hackearam os terminais de dados para anunciar um ataque de míssil. O pânico se espalha.'], [7, 8, 'Três deles jogam sacos de eurodólares da janela de uma viatura roubada. O povo se atropela atrás do dinheiro, que é todo falso.'], [9, 10, 'Três deles hackearam os telões do bairro e transmitem notícias falsas.']], `Netrunners: ${boost('base 10 em Tecnologia Eletrônica/Segurança')}. Gangue: ${ficha('Guarda-costas')}.`],
      [34, 40, 'Locais', 'Um adolescente de um bairro corporativo, que fugiu de casa para ver a cidade.', [[1, 4, 'Está sendo assaltado pela gangue do bairro (N).'], [5, 8, 'Está levando uma surra de fanáticos anti-cromo (N), pelo "pecado" de usar fashionware.'], [9, 10, 'Está cercado por um fixer a quem deve e não tem como pagar.']], `Gangue: ${boost('Light Armorjack no lugar do couro')}. Fanáticos: ${boost('arma branca leve no lugar dos Rippers; sem Techhair')}. Fixer: ${ficha('Guarda-costas')} (+ Cyberaudio, Agent interno e Analisador de Estresse Vocal; base 10 em Comércio).`],
      [41, 46, 'Netrunners', 'Dois netrunners com pistolas muito pesadas e Light Armorjack, rondando um pequeno escritório corporativo enquanto invadem a Arquitetura do prédio.', [[1, 5, 'Seguranças (N) descobrem os dois e começa a briga. Vocês, claro, estão no meio.'], [6, 10, 'Acham que vocês são da segurança e usam as 2 torretas do prédio contra vocês.']], `${ficha('Netrunner')} (Light Armorjack no lugar do traje). Seguranças: ${ficha('Operativo de segurança')}. Torretas: torreta automática (RED p. 214).`],
      [47, 52, 'Wraiths', 'Nômades (N) de Medium Armorjack, com facas de combate e rifles. Meio bêbados e querendo briga: implicam com quem acham atraente no grupo. Encarem: eles querem briga.', null, `${ficha('Gangue de estrada')} (rifle de assalto no lugar da besta; Medium Armorjack no lugar do couro; Armas de Ombro no lugar de Arquearia); ${ficha('Nômades e Wraiths')}.`],
      [53, 58, ...viciados('N', 'Se vocês não vestem as cores de uma corp ou de uma gangue, atacam ali mesmo, na rua.')],
      [59, 63, ...trauma],
      [64, 69, `${cromados[0]} (N)`, cromados[1], [[1, 5, 'Ligados de Smash, procuram briga.'], [6, 7, 'Passam por vocês soltando umas grosserias.'], [8, 10, 'Vão com a cara de alguém do grupo e chamam vocês para encher a cara e ir ao show.']], cromadosFicha],
      [70, 72, 'Assassinos', 'Solos (metade de N) com Light Armorjack, espadas e pistola pesada; reflexos turbinados, cyberolhos com IR e cyberpernas. Claramente procurando alguém.', [[1, 5, 'Desviam de vocês e seguem.'], [6, 10, 'Decidem que vocês são testemunhas e precisam ser apagados agora.']], `${ficha('Oficial de segurança')} (+ cyberolhos Low Light/IR/UV e 2 cyberpernas com Jump Boosters; sem o rifle; pistola pesada no lugar da muito pesada).`],
      [73, 77, 'Tyger Claws', 'Tyger Claws (N), mais pesados que os de dia: armas automáticas, armas cibernéticas, cyberolhos e reflexos turbinados. Implicam com quem é atraente no grupo, extorquem dinheiro e querem briga.', null, `${ficha('Guarda-costas')} (SMG pesada no lugar da espingarda ruim; + 2 armas cibernéticas à escolha; cyberolhos Low Light/IR/UV, Neural Link e Kerenzikov); ${ficha('Tyger Claws')}.`],
      [78, 83, 'Equipe de solos', 'Solos (metade de N) com rifles de assalto com Smartgun Link; reflexos e audição turbinados, cyberolhos com IR e mira. Numa operação cinzenta. Só reagem se vocês usam uniforme ou insígnia de uma corp rival.', [[1, 5, 'Desviam de vocês e seguem.'], [6, 10, 'Decidem que vocês são testemunhas e precisam ser apagados agora.']], `${ficha('Oficial de segurança')} (+ Smartgun Link, plugs de interface, Cyberaudio, Audição Ampliada, cyberolhos Low Light/IR/UV e Luneta de Mira num olho).`],
      [84, 90, 'Gangue do bairro', 'Punks de rua de baixo nível (N + 2) da gangue local. Se vocês parecem presa fácil e com dinheiro, partem para cima. Pistolas médias, facas e reflexos turbinados.', null, `${boost('pistola média ruim no lugar da muito pesada ruim; + Neural Link e Kerenzikov')}, ou a facção do bairro.`],
      [91, 93, 'Crime organizado', 'Uma grande operação de um sindicato do crime. Solos cheios de cromo, com armas cibernéticas, pistolas pesadas e rifles de assalto com Smartgun Link, descarregam drogas de um caminhão.', testemunhas, `${ficha('Operativo de segurança')} (metade de N) e 2 ${ficha('Oficial de segurança', 'Oficiais de segurança')}: rifles de assalto com Smartgun Link no lugar dos ruins; + Wolvers, Neural Link, plugs de interface, Smartgun Link e Luneta de Mira.`],
      [94, 100, 'Tiroteio: Maelstrom × Tyger Claws', 'Vocês caem no meio de uma briga grande. Cada lado tem N membros, de Light Armorjack e pistolas muito pesadas, com armas cibernéticas por todo lado e um líder com armamento mais pesado. Escolham um lado ou um alvo.', null, `Capangas: ${boost('Light Armorjack no lugar do couro; Rippers ou outra arma cibernética')}. Líderes: ${ficha('Oficial de segurança')} (+ uma arma cibernética). Facções: ${ficha('Maelstrom')}, ${ficha('Tyger Claws')}.`]
    ]},
    madrugada: { label: 'Madrugada', ref: '422–425', linhas: [
      [1, 10, 'NCPD', 'Policiais (metade de N) com rifles de assalto com Smartgun Link. Ninguém tem o que fazer na rua depois da meia-noite, e eles sabem disso: procuram qualquer pretexto para uma prisão. Arma à vista: considerem-se detidos. Se alguém vai pegar uma arma, atiram e esquecem a papelada.', null, `${ficha('Oficial de segurança')} (+ plugs de interface e Smartgun Link); ${ficha('NCPD')}.`],
      [11, 22, 'Segurança corporativa', 'Guardas (N) patrulhando, com SMGs pesadas com Smartgun Link. "O que vocês estão fazendo na propriedade depois da meia-noite? Coisa boa não é!"', null, `${ficha('Oficial de segurança')} (SMG pesada no lugar dos rifles; + plugs de interface e Smartgun Link); ${ficha('Segurança corporativa')}.`],
      [23, 24, 'Investigador particular', 'Um detetive com um revólver de grosso calibre, um facão e Light Armorjack.', pi, `${ficha('Chefe reclaimer')} (sem barraca nem espingarda; pistola muito pesada no lugar da pesada; arma branca média no lugar da pesada).`],
      [25, 25, 'Media', 'Uma dupla de câmera e repórter atrás de uma história.', [[1, 5, 'O alvo da matéria descobre a dupla e começa um tiroteio. Vocês, claro, estão no meio. Role de novo na tabela para saber quem é o alvo.'], [6, 10, 'Decidem que a história são vocês e passam a seguir o grupo.']], midiaFicha],
      [26, 29, `${cromados[0]} (N + 2)`, cromados[1], [[1, 5, 'Voltando de um show, ligados de Smash, procuram briga.'], [6, 7, 'Passam bêbados por vocês, soltando umas grosserias.'], [8, 10, 'Vão com a cara de alguém do grupo e chamam vocês para a festa depois do show.']], cromadosFicha],
      [30, 39, 'Equipe de edgerunners', 'Um netrunner, um solo e um nômade num carro velho, prestes a invadir um pequeno escritório corporativo. Do lado de fora, 6 seguranças patrulham.', [[1, 5, 'A segurança descobre a equipe e começa a briga. Vocês, claro, estão no meio.'], [6, 10, 'A equipe vê vocês e oferece uma parte do serviço.']], `${ficha('Netrunner')}; solo: ${ficha('Oficial de segurança')}; nômade: ${ficha('Chefe reclaimer')}; seguranças: ${ficha('Operativo de segurança')}.`],
      [40, 42, ...trauma],
      [43, 45, 'Lawman', 'Um Lawman e o ajudante estão na cidade caçando uma gangue de 6 catadores escondida ali. A recompensa pelos 6 é alta.', [[1, 5, 'O tiroteio já começou quando vocês chegam e bloqueia o caminho. O Lawman chama vocês para ajudar.'], [6, 10, 'Os dois fecharam a rua com a polícia local e vão invadir o esconderijo. O Lawman oferece parte da recompensa para vocês entrarem junto e trazerem os 6, vivos ou mortos.']], `Lawman: ${ficha('Outrider')}. Ajudante: ${ficha('Gangue de estrada')}. Catadores: ${ficha('Boosterganger')}.`],
      [46, 58, 'Wraiths', 'Nômades (N + 2) espancando um casal de corporativos por terem olhado torto. Tatuagens luminosas, calças de couro, facas de combate, porretes e rifles. Se vocês ficarem longe deles e das motos, eles ignoram vocês e continuam no casal.', null, `${ficha('Gangue de estrada')} (+ tatuagens luminosas; rifle de assalto no lugar da besta; Armas de Ombro no lugar de Arquearia); ${ficha('Nômades e Wraiths')}. Casal: ${boost('sem Rippers')}.`],
      [59, 63, 'Fanáticos anti-cromo', 'Em força máxima: fanáticos (N) com nunchakus, pistolas e chicotes encurralam vocês. Mais dois, com pistolas de ar e bolas de ácido, ficam atrás para atingir quem tem armadura pesada. "Só um servo dos Demônios de Metal estaria acordado a esta hora!"', null, `${boost('sem couro e sem Techhair; arma branca média no lugar dos Rippers; 2 deles com pistola de ar e 20 bolas de ácido')}.`],
      [64, 73, ...viciados('N + 2', 'Mesmo com as cores de uma corp ou de uma gangue, atacam ali mesmo, na rua. Estão sob Black Lace: ignoram o estado Gravemente Ferido.')],
      [74, 74, 'Crime organizado', 'Uma grande operação de um sindicato do crime. Solos cheios de cromo (N), com armas cibernéticas, pistolas pesadas e rifles de assalto com Smartgun Link, descarregam drogas de um caminhão.', testemunhas, `${ficha('Oficial de segurança')} (+ Wolvers, plugs de interface, Smartgun Link e Luneta de Mira).`],
      [75, 79, 'Guerra de território', turfWar('Tyger Claws, 6th Street, Valentinos, Maelstrom e NCPD'), [[1, 2, 'Tyger Claws: jaquetas de moto blindadas, katanas e pistolas muito pesadas.'], [3, 4, '6th Street: ex-militares, Medium Armorjack e rifles de assalto.'], [5, 6, 'Valentinos: pistolas pesadas banhadas a ouro.'], [7, 8, 'Maelstrom: Light Armorjack e armas cibernéticas por todo lado.'], [9, 10, 'NCPD: uniformes de Medium Armorjack e rifles de assalto.']], `${ficha('Boosterganger')} com as trocas da facção: ${ficha('Tyger Claws')}, ${ficha('6th Street')}, ${ficha('Valentinos')}, ${ficha('Maelstrom')}, ${ficha('NCPD')}.`],
      [80, 87, 'Incendiários', 'Anarquistas radicais com rancor de alguém do bairro. Um ganger cromado com lança-chamas, machado e pistola pesada lidera boosters (N − 3, mínimo 2), cada um com uma granada incendiária, Rippers e pistola muito pesada ruim. Não procuram briga, mas estão queimando o quarteirão e matam quem ficar no caminho.', null, `Lança-chamas: ${ficha('Pyro')}. Boosters: ${boost('+ 1 granada incendiária')}.`],
      [88, 92, 'Guerra de território', turfWar('Animals, Maelstrom, Mox, Voodoo Boys e 6th Street'), [[1, 2, 'Animals: músculos, Gorilla Arms e pouca armadura.'], [3, 4, 'Maelstrom: Light Armorjack e armas cibernéticas por todo lado.'], [5, 6, 'Mox: espingardas e jaquetas de couro.'], [7, 8, 'Voodoo Boys: granadas de gás lacrimogêneo e SMGs.'], [9, 10, '6th Street: ex-militares, Medium Armorjack e rifles de assalto.']], `${ficha('Boosterganger')} com as trocas da facção: ${ficha('Animals')}, ${ficha('Maelstrom')}, ${ficha('Mox')}, ${ficha('Voodoo Boys')}, ${ficha('6th Street')}.`],
      [93, 99, 'Crime organizado', 'Uma grande operação de um sindicato do crime. Seis solos cheios de cromo, com armas cibernéticas, pistolas pesadas e rifles de assalto com Smartgun Link, descarregam drogas de um caminhão.', testemunhas, `6 ${ficha('Oficial de segurança', 'Oficiais de segurança')} (+ Wolvers, plugs de interface, Smartgun Link e Luneta de Mira).`],
      [100, 100, 'Ciberpsicótico', 'Um ciberpsicótico sozinho, cromado até os dentes (quatro cybermembros, Jump Boosters, Popguns, Wolvers e mais), descarregando a fúria num pedestre que passou do limite. Não vai se acalmar, e a MaxTac só chega em 1d6 + 1 rodadas. Pior: ele acabou de notar vocês.', null, `${ficha('Cyberpsycho')}; ${ficha('MaxTac')}.`]
    ]}
  };

  const rangeLabel = (from, to) => {
    const pad = value => value === 100 ? '00' : String(value).padStart(2, '0');
    return from === to ? pad(from) : `${pad(from)}–${pad(to)}`;
  };
  const subList = sub => sub ? `<br><small>1d10: ${sub.map(([from, to, text]) => `<b>${from === to ? from : `${from}–${to}`}</b> ${text}`).join(' ')}</small>` : '';
  const encounterTable = ({ linhas }) => table(['d100', 'Encontro', 'Fichas'], linhas.map(([from, to, title, text, sub, sheets]) => [`<b>${rangeLabel(from, to)}</b>`, `<b>${title}.</b> ${text}${subList(sub)}`, sheets]));

  function setupEncounters(content, { rollDice, showRoll }) {
    content.querySelectorAll('[data-encounter]').forEach(button => button.addEventListener('click', () => {
      const { label, linhas } = encounterTables[button.dataset.encounter];
      const value = rollDice('d100');
      const [, , title, text, sub, sheets] = linhas.find(([from, to]) => value >= from && value <= to);
      let detail = '';
      if (sub) {
        // Guerra de território: um 1d10 para cada lado, sem repetir a gangue.
        const turf = /^Guerra/.test(title);
        const pickSub = () => { const die = rollDice('1d10'); return [die, sub.find(([from, to]) => die >= from && die <= to)]; };
        const first = pickSub();
        let second = turf ? pickSub() : null;
        while (second && second[1] === first[1]) second = pickSub();
        detail = [first, second].filter(Boolean).map(([die, row]) => `<br><span class="roll-value">1d10: ${die}</span> ${row[2]}`).join('');
      }
      showRoll(button, `<span class="roll-value">${label} · d100: ${value === 100 ? '00' : value}</span> <b>${title}.</b> ${text}${detail}<br><small>Fichas: ${sheets}</small>`);
    }));
  }

  const encountersHTML = `${section('Rolar um encontro', '417', `<p>Role d100 (2d10, um deles é a dezena) na tabela do horário. N = número de jogadores. Os botões já rolam o 1d10 do que está acontecendo.</p><div class="roll-buttons">${Object.entries(encounterTables).map(([id, { label }]) => `<button class="action" data-encounter="${id}" type="button">${label}</button>`).join('')}</div>`)}
        ${section('Como usar', '417', list([
          'Cada resultado aponta para uma ficha da página Fichas de NPC, às vezes com trocas de equipamento. Clique no nome para abrir a ficha.',
          'Nem todo encontro precisa virar combate: use como oportunidade de interpretação sempre que der.',
          '<b>Zonas corporativas</b> (City Center, Charter Hill, North Oak): evite resultados acima de 50. Se começar um tiroteio, role 1d10: em tantas rodadas chega a segurança corporativa para matar ou deter quem estiver armado.',
          '<b>Zonas sem lei</b> (Pacifica, Dogtown, Northside à noite): evite resultados abaixo de 50, a não ser num dia parado. Combate é mais provável e a paz, mais difícil.',
          '<b>Gangue do bairro:</b> Tyger Claws em Japantown e Kabuki, Maelstrom em Northside, Valentinos em Heywood, 6th Street em Santo Domingo, Animals e Voodoo Boys em Pacifica, Scavengers em Watson.'
        ]))}
        ${section('Dia', encounterTables.dia.ref, encounterTable(encounterTables.dia))}
        ${section('Noite', encounterTables.noite.ref, encounterTable(encounterTables.noite))}
        ${section('Madrugada', encounterTables.madrugada.ref, encounterTable(encounterTables.madrugada))}
        ${section('O que mudou do livro', '', list([
          'As gangues do RED viraram as de 2077: Iron Sights → Tyger Claws, Steel Vaqueros → Aldecaldos, Roadrunners e Wildman Pack → Wraiths, Piranhas e Red Chrome Legion → a gangue do bairro, Psycho Squad → MaxTac.',
          'Inquisidores → fanáticos anti-cromo; Reckoners → pregadores do fim do mundo; Philharmonic Vampires → netrunners brincalhões; Vilshenko e Scagattalia → um sindicato do crime à escolha do mestre.',
          'Nas guerras de território, os lados foram trocados por gangues de 2077 (no livro: Bozos, Primetime Players, Piranhas e Iron Sights).',
          'O livro sobrepõe o 72 na tabela da noite (assassinos 70–72, Iron Sights 72–77); aqui ficou 70–72 e 73–77.',
          'Media de dia e à noite: o livro só diz o que acontece em 1–5; em 6–10, nada aconteceu ainda.'
        ]))}`;

  const pages = {
    npcs: {
      eyebrow: 'Na mesa / livro-base p. 399–422', title: 'Fichas de NPC',
      lede: 'As 10 fichas prontas do livro do RED, as 10 do Mission Kit, a Trauma Team e variantes para as facções de Night City em 2077. As bases de perícia já somam STAT + perícia + bônus: role base + 1d10. Esta página só aparece na wiki do mestre.',
      html: `${section('Como usar', '399–400 e 412', `${list([
        'Os NPCs não têm Role, habilidade de Role nem LUCK, a não ser quando a ficha diz (Netrunner, Outrider e Pyro).',
        'Arma de <b>qualidade ruim</b> emperra num 1 no dado de ataque; desemperrar custa uma Ação (p. 342).',
        '<b>Gravemente Ferido:</b> −2 em todas as ações. Abaixo de 1 PV, <b>Mortalmente Ferido</b>: Death Save no início de cada turno.',
        'Equipamento pesa tanto quanto número: um capanga com uma Malorian Arms 3516 vira outro problema. Personagens com armas ou cyberware muito fortes podem contar como 2 ou 3 na conta (p. 400).'
      ])}${table(['Tipo', 'Conta como', 'Quando usar'], [
        ['Capanga', '1 personagem', '1ª luta: um por personagem. Contra um grupo muito combativo, até dois por personagem.'],
        ['Tenente', '2 personagens', '2ª luta: um para cada 2 personagens, completando com capangas.'],
        ['Mini-chefe', '3 personagens', '3ª luta: um para cada 3 personagens, com tenentes e capangas até igualar o grupo.'],
        ['Chefe', '—', 'A luta final. O Cyberpsycho é o único do livro.']
      ])}${table(['Grupo', '1ª luta', '2ª luta', '3ª luta'], [
        ['3', '3 capangas (até 6)', '1 tenente + 1 capanga', '1 mini-chefe'],
        ['4', '4 capangas (até 8)', '2 tenentes', '1 mini-chefe + 1 capanga'],
        ['5', '5 capangas (até 10)', '2 tenentes + 1 capanga', '1 mini-chefe + 1 tenente'],
        ['6', '6 capangas (até 12)', '3 tenentes', '2 mini-chefes']
      ])}<p>${button('combat', 'Combate')} ${button('damage', 'Ferimentos e Death Save')} ${button('weapons2077', 'Armas de 2077')}</p>`)}
        ${section('Capangas', '412–413', npcGrid(mooks))}
        ${section('Tenentes', '414–415', npcGrid(lieutenants))}
        ${section('Mini-chefes', '415–416', npcGrid(bosses))}
        ${section('Chefe', '416', npcGrid(boss))}
        ${section('Fichas do Mission Kit', 'Kit p. 118–126', `<div class="callout">As fichas do Cyberpunk Edgerunners Mission Kit, da missão The Jacket e do anime. Todos têm <b>Neuroport</b>: dá para hackear qualquer um com quickhacks. A armadura tem dois SP: contra a maioria dos ataques e contra corpo a corpo e Tech carregada (a metade). As bases de perícia já somam o bônus da Role, quando o Kit diz. No Foundry, estão na pasta <b>Mission Kit</b> do compêndio de NPCs.</div>${npcGrid(kitNpcs)}<p><button class="action" data-page="netrunning" data-section="quickhacks-no-neuroport" type="button">Quickhacks no Neuroport</button> ${button('weapons2077', 'Armas de 2077')}</p>`)}
        ${section('Fichas do Black Chrome', 'BC p. 153', `<div class="callout">Os fixers dos Mercados Noturnos do Black Chrome. O PDF do projeto só tem a ficha de Rex Royale, do mercado F: as dos mercados A a E estão nas páginas que faltam. No Foundry, está na pasta <b>Black Chrome</b> do compêndio de NPCs.</div>${npcGrid(bcNpcs)}<p>${button('bcMercados', 'Mercados Noturnos do Black Chrome')}</p>`)}
        ${section('Trauma Team', '224', traumaTeam)}
        ${section('Facções de 2077', '417–422', `<div class="callout">O livro monta os encontros de rua trocando o equipamento destas fichas ("use o Boosterganger, troque o couro por…"). As variantes marcadas com <b>livro</b> vêm das tabelas de encontros (p. 417–422); as marcadas com <b>adaptação</b> seguem o mesmo método para as gangues de 2077. As armas citadas estão em Armas de 2077.</div><div class="entry-grid">${factions.join('')}</div>`)}
        ${section('Protocolo Morana: o elenco', '', `<p>Os NPCs nomeados da campanha, no formato das fichas do livro. No Foundry, o módulo cpr-2077 traz um ator para cada um, na pasta <b>Protocolo Morana</b> do compêndio de NPCs. A personalidade, os segredos e as falas estão em Personagens.</p>${npcGrid(campaignCast)}<p>${button('docPersonagens', 'Personagens')} ${button('docSessao01', 'Sessão 01 completa')} ${button('docSessao02', 'Sessão 02')}</p>`)}`
    },

    encounters: {
      eyebrow: 'Na mesa / livro-base p. 417–425, adaptado', title: 'Encontros de 2077',
      lede: 'As tabelas de encontro de rua do RED para dia, noite e madrugada, com as gangues de 2077. Role, leia a cena e abra a ficha com um clique.',
      setup: setupEncounters,
      html: encountersHTML
    }
  };

  // data: as fichas cruas, lidas pelo build do módulo do Foundry (foundry-2077/build).
  window.npcStatBlocks = { pages, data: { mooks, lieutenants, bosses, boss, kit: kitNpcs, blackChrome: bcNpcs, campaignCast, skillNames, parseSkills } };
})();
