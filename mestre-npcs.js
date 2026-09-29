// Fichas prontas de NPC: as 10 do livro do RED ("Mooks and Grunts", p. 412–416), a Trauma Team (p. 224)
// e variantes para as facções de Night City em 2077.
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
    Tracking: 'Rastrear', Weaponstech: 'Tecnologia de Armas', 'Wilderness Survival': 'Sobrevivência'
  };
  const roleAbilities = ['Interface', 'Moto Family', 'Combat Awareness'];
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
    boss: 'Chefe (Boss) · luta final'
  };

  // weapons: [nome, dano, CDT, perícia do livro, observação]
  const npc = ({ name, book, tier, page, stats, hp, wounded, deathSave, initiative, armor, weapons, skills, gear, extra = '', tip }) => {
    const parsed = parseSkills(skills);
    const base = en => (parsed.find(skill => skill.en === en) || {}).value || '—';
    const roleAbility = parsed.filter(skill => roleAbilities.includes(skill.en));
    const key = highlighted.map(en => parsed.find(skill => skill.en === en)).filter(Boolean)
      .filter((skill, index, all) => all.findIndex(other => skillNames[other.en] === skillNames[skill.en]) === index);
    const weaponRows = weapons.map(([weapon, damage, rof, skill, note]) => [
      `${weapon}${note ? ` <small>${note}</small>` : ''}`, damage, rof,
      `${skillNames[skill]} ${base(skill)}${skill === 'Shoulder Arms' && base('Autofire') !== '—' && /autofogo/.test(note || '') ? ` · autofogo ${base('Autofire')}` : ''}`
    ]);
    return `<article class="entry npc" data-toc="${name}"><header><h4>${name}</h4><span class="entry-tag">${tiers[tier]} · ${book} · p. ${page}</span></header>
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
    faction('Tyger Claws', 'Japantown e Kabuki', ['Boosterganger', 'troque os Rippers por uma katana (arma branca pesada, 3d6, CDT 2, Armas Brancas 11) e o couro por Kevlar (SP 7); adicione Basic Kiroshi Optics. Muitos chegam de moto.'],
      ['Oficial de segurança', 'troque o rifle por uma katana (Armas Brancas 10) e uma Arasaka Shigure (SMG, 2d6, autofogo); a elite troca o Kerenzikov por um Sandevistan.'],
      'A gangue de Wakako. Para Mina Kuroda, a guarda-costas dela, use o tenente com a katana.', 'adaptação'),
    faction('Maelstrom', 'Northside, Watson', ['Boosterganger', 'troque o couro por Light Armorjack (SP 11); mantenha os Rippers ou troque por outra arma cibernética. Óticas vermelhas por toda parte.'],
      ['Oficial de segurança', 'adicione uma arma cibernética à escolha.'],
      'O culto do hospital queimado (Sessão 02): cultistas como capangas e Brakk como Chefe reclaimer com Wolvers.', 'livro, p. 422'),
    faction('Valentinos', 'Heywood', ['Guarda-costas', 'troque a espingarda ruim por uma pistola pesada banhada a ouro (Constitutional Arms Liberty, 3d6, CDT 2).'],
      ['Oficial de segurança', 'troque o rifle por uma espingarda (Constitutional Arms M2038 Tactician, 5d6).'],
      'Honra e família: não atacam quem está sob a palavra de um Valentino, e nunca esquecem uma dívida.', 'adaptação'),
    faction('6th Street', 'Santo Domingo e Heywood', ['Operativo de segurança', 'ex-militares: troque o rifle ruim por um Militech M251s Ajax (5d6, qualidade padrão, não emperra).'],
      ['Oficial de segurança', 'como no livro.'],
      'Lutam em formação: metade dá fogo supressivo enquanto a outra metade flanqueia.', 'adaptação'),
    faction('Animals', 'Pacifica', ['Guarda-costas', 'tire a espingarda; adicione Gorilla Arms (Briga causa 3d6 como uma arma, contra a armadura; +2 em Atletismo).'],
      ['Chefe reclaimer', 'com Gorilla Arms e Grafted Muscle and Bone Lace: BODY 8, PV 45, Gravemente Ferido 23, Death Save 8.'],
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
      ['Outrider como mini-chefe', 'tire Moto e Afinidade com Animais; troque a Light Armorjack por Heavy Armorjack (SP 13, −2 em REF, DEX e MOVE e nas perícias deles, como o Oficial de segurança); rifle Militech M251s Ajax; adicione Mantis Blades (3d6) ou um Militech Falcon Sandevistan. Cada agente conta como 3 personagens.'],
      'Chega 10 minutos depois de um surto ser reportado (ganchos dos personagens). É o relógio da cena, não uma luta para vencer.', 'adaptação'),
    faction('Segurança corporativa', 'Arasaka, Militech, Kang Tao', ['Operativo de segurança', 'de dia: Light Armorjack e SMG ruim no lugar do rifle. À noite: Heavy Armorjack e SMG pesada ruim.'],
      ['Oficial de segurança', 'depois da meia-noite: SMG pesada, Interface Plugs e Smartgun Link. Em 2077, uma SMG Smart (Arasaka TKI-20 Shingen ou Kang Tao G-58 Dian).'],
      'A equipe de Iskra (Sessões 01 e 02) e a segurança do datafort da Militech em Arroyo, onde está a Coleira.', 'livro, p. 417–421 + adaptação')
  ];

  const pages = {
    npcs: {
      eyebrow: 'Na mesa / livro-base p. 399–422', title: 'Fichas de NPC',
      lede: 'As 10 fichas prontas do livro do RED, a Trauma Team e variantes para as facções de Night City em 2077. As bases de perícia já somam STAT + perícia + bônus: role base + 1d10. Esta página só aparece na wiki do mestre.',
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
        ${section('Trauma Team', '224', traumaTeam)}
        ${section('Facções de 2077', '417–422', `<div class="callout">O livro monta os encontros de rua trocando o equipamento destas fichas ("use o Boosterganger, troque o couro por…"). As variantes marcadas com <b>livro</b> vêm das tabelas de encontros (p. 417–422); as marcadas com <b>adaptação</b> seguem o mesmo método para as gangues de 2077. As armas citadas estão em Armas de 2077.</div><div class="entry-grid">${factions.join('')}</div>`)}
        ${section('Fichas da campanha', '', `<p>Os NPCs da campanha já têm fichas completas nos documentos:</p>${list([
          '<b>Equipe de Vega</b> (Vega, dois solos, netrunner e técnico de contenção): Sessão 01, Cena 4.',
          '<b>Iskra Voss</b>: Personagens, "Em combate". A equipe dela usa as fichas da equipe de Vega.',
          '<b>Brakk e os cultistas da Maelstrom</b>: Sessão 02, Cena 2.'
        ])}<p>${button('docSessao01', 'Sessão 01 completa')} ${button('docPersonagens', 'Personagens')} ${button('docSessao02', 'Sessão 02')}</p>`)}`
    }
  };

  window.npcStatBlocks = { pages };
})();
