// Criação de personagem: regras do RED (p. 72–118) com as Roles de 2077 (suplemento p. 2–8).
// Vai também para os jogadores: só regras, nada da campanha.
// Os itens dos pacotes apontam para o catálogo da loja (loja-catalogo.js) pelo id "pacote:nome-em-ingles".
(() => {
  const stats = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'];

  // Tabelas de STAT por Role (RED p. 74–77): uma linha por resultado de 1d10, na ordem de `stats`.
  // Geradas do texto do livro; a do Fixer fica só como referência (em 2077 o Corpo usa a do Exec).
  const statTables = {
    rockerboy: [[7, 6, 6, 5, 6, 8, 7, 7, 3, 8], [3, 7, 7, 7, 7, 6, 7, 7, 5, 8], [4, 5, 7, 7, 6, 6, 7, 7, 5, 8], [4, 5, 7, 7, 6, 8, 7, 6, 3, 8], [3, 7, 7, 7, 6, 8, 6, 5, 4, 7], [5, 6, 7, 5, 7, 8, 5, 7, 3, 7], [5, 6, 6, 7, 7, 8, 7, 6, 3, 6], [5, 7, 7, 5, 6, 6, 6, 6, 4, 8], [3, 5, 5, 6, 7, 8, 7, 5, 5, 7], [4, 5, 6, 5, 8, 8, 7, 6, 4, 7]],
    solo: [[6, 7, 7, 3, 8, 6, 5, 5, 6, 5], [7, 8, 6, 3, 6, 6, 7, 5, 6, 6], [5, 8, 7, 4, 7, 7, 6, 7, 8, 5], [5, 8, 6, 4, 6, 7, 6, 5, 7, 6], [6, 6, 7, 5, 7, 6, 7, 6, 8, 4], [7, 7, 6, 5, 7, 6, 6, 7, 7, 5], [7, 7, 6, 5, 6, 7, 7, 6, 6, 6], [7, 8, 7, 5, 6, 6, 5, 6, 8, 4], [7, 7, 6, 4, 6, 6, 6, 5, 6, 5], [6, 6, 8, 5, 6, 6, 5, 6, 6, 5]],
    netrunner: [[5, 8, 7, 7, 7, 4, 8, 7, 7, 4], [5, 6, 7, 5, 8, 3, 8, 7, 5, 5], [5, 6, 8, 6, 6, 4, 7, 6, 7, 4], [5, 7, 7, 7, 7, 5, 8, 6, 5, 5], [5, 8, 8, 5, 7, 3, 7, 5, 5, 6], [6, 6, 6, 7, 8, 4, 7, 7, 6, 6], [6, 6, 6, 7, 6, 5, 7, 7, 7, 6], [5, 7, 8, 6, 8, 4, 8, 5, 7, 4], [7, 6, 7, 7, 6, 3, 6, 5, 6, 5], [7, 8, 6, 6, 6, 4, 7, 7, 5, 6]],
    tech: [[6, 7, 7, 8, 4, 4, 5, 5, 7, 6], [7, 6, 6, 7, 5, 3, 7, 7, 5, 5], [8, 6, 5, 7, 5, 4, 7, 7, 5, 7], [7, 8, 7, 8, 4, 4, 6, 5, 6, 7], [6, 6, 7, 6, 4, 3, 7, 7, 6, 6], [8, 7, 5, 6, 3, 3, 7, 6, 6, 7], [8, 6, 7, 8, 4, 4, 7, 6, 7, 6], [8, 8, 7, 8, 5, 4, 6, 5, 6, 6], [6, 6, 7, 8, 3, 3, 5, 7, 7, 7], [8, 8, 5, 6, 4, 4, 6, 5, 6, 6]],
    medtech: [[7, 5, 6, 7, 5, 3, 8, 5, 5, 7], [6, 7, 7, 7, 4, 4, 6, 7, 7, 7], [6, 5, 5, 8, 5, 3, 8, 5, 7, 8], [8, 7, 6, 8, 3, 5, 6, 6, 5, 7], [6, 7, 5, 7, 5, 5, 8, 7, 6, 8], [8, 5, 5, 8, 5, 5, 6, 6, 5, 6], [8, 6, 5, 8, 5, 4, 8, 5, 7, 7], [6, 5, 7, 7, 3, 5, 8, 5, 5, 8], [6, 6, 7, 7, 5, 4, 6, 6, 5, 6], [8, 7, 6, 6, 3, 4, 8, 7, 6, 7]],
    media: [[6, 6, 5, 5, 8, 7, 5, 7, 5, 7], [8, 7, 7, 3, 6, 6, 6, 5, 6, 8], [6, 7, 7, 5, 6, 8, 5, 5, 5, 7], [6, 5, 7, 5, 6, 7, 5, 5, 6, 6], [6, 6, 7, 4, 8, 7, 6, 7, 5, 8], [7, 5, 5, 4, 8, 7, 6, 7, 5, 8], [8, 5, 6, 3, 7, 6, 6, 5, 6, 7], [6, 5, 6, 5, 6, 8, 6, 6, 7, 8], [7, 7, 5, 4, 6, 7, 6, 5, 6, 7], [7, 6, 6, 3, 7, 6, 7, 6, 7, 6]],
    lawman: [[5, 6, 7, 5, 7, 8, 5, 6, 5, 6], [6, 6, 6, 5, 6, 8, 5, 7, 5, 5], [5, 7, 7, 7, 6, 7, 5, 5, 7, 6], [6, 6, 7, 6, 6, 8, 5, 7, 7, 6], [6, 6, 7, 6, 7, 7, 6, 5, 5, 6], [7, 6, 5, 5, 7, 8, 5, 6, 7, 4], [7, 8, 7, 5, 6, 8, 7, 6, 5, 4], [5, 6, 6, 5, 6, 8, 5, 7, 6, 4], [7, 7, 5, 5, 7, 7, 6, 5, 5, 6], [6, 6, 5, 6, 8, 7, 5, 7, 6, 6]],
    exec: [[8, 5, 5, 3, 8, 6, 6, 5, 5, 7], [8, 6, 6, 4, 7, 6, 7, 7, 5, 7], [8, 7, 6, 3, 8, 6, 7, 6, 4, 5], [8, 5, 7, 5, 6, 5, 6, 5, 5, 7], [7, 7, 6, 5, 8, 5, 7, 7, 5, 6], [5, 7, 7, 3, 6, 7, 6, 5, 5, 7], [6, 6, 7, 5, 8, 7, 6, 7, 4, 6], [6, 7, 7, 3, 7, 5, 7, 5, 5, 7], [7, 6, 7, 5, 7, 5, 7, 6, 5, 5], [7, 7, 5, 5, 8, 6, 6, 7, 4, 7]],
    fixer: [[8, 5, 7, 4, 6, 5, 8, 5, 5, 8], [8, 5, 5, 5, 6, 7, 8, 7, 5, 7], [6, 6, 6, 4, 5, 6, 8, 6, 3, 8], [7, 7, 5, 5, 7, 6, 7, 7, 5, 8], [8, 6, 6, 3, 6, 5, 8, 7, 5, 6], [8, 7, 5, 5, 6, 7, 7, 5, 3, 6], [8, 6, 6, 5, 6, 5, 6, 7, 5, 8], [6, 6, 7, 4, 7, 6, 7, 7, 4, 7], [8, 7, 7, 5, 5, 5, 7, 6, 5, 7], [6, 5, 6, 5, 5, 6, 8, 6, 4, 7]],
    nomad: [[6, 6, 8, 3, 6, 7, 6, 6, 6, 4], [5, 7, 6, 5, 8, 8, 8, 7, 5, 4], [5, 8, 6, 3, 8, 7, 6, 5, 6, 5], [5, 8, 7, 4, 8, 6, 7, 7, 7, 5], [6, 6, 6, 3, 6, 7, 6, 7, 7, 4], [7, 6, 8, 4, 6, 7, 6, 5, 6, 5], [6, 7, 8, 4, 6, 6, 7, 5, 7, 5], [5, 7, 8, 3, 8, 6, 7, 5, 5, 5], [6, 7, 6, 4, 8, 6, 6, 6, 6, 6], [5, 6, 7, 4, 7, 8, 7, 7, 7, 4]]
  };

  // As 9 Roles de 2077 (suplemento p. 2–6). `tabelas`: de qual Role do RED vêm as tabelas e os pacotes.
  // `foundry`: o item de Role que o importador põe na ficha.
  const roles = [
    { id: 'face', nome: 'Face', habilidade: 'Impacto Carismático', en: 'Charismatic Impact', tabelas: 'rockerboy', foundry: { pack: 'cpr-2077.roles-2077', nome: 'Face' },
      resumo: 'O representante persuasivo: convence, agita a multidão e consegue favores. Substitui o Rockerboy do RED.',
      especializacoes: [
        { id: 'siren', nome: 'Siren', pericias: ['Conversation', 'Personal Grooming'] },
        { id: 'rockerboy', nome: 'Rockerboy', pericias: ['Play Instrument', 'Streetwise'] },
        { id: 'model', nome: 'Model', pericias: ['Acting', 'Trading'] }
      ] },
    { id: 'solo', nome: 'Solo', habilidade: 'Consciência de Combate', en: 'Combat Awareness', tabelas: 'solo', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Solo' },
      resumo: 'Especialista em combate: mercenário, guarda-costas ou assassino. Igual ao RED.' },
    { id: 'netrunner', nome: 'Netrunner', habilidade: 'Interface', en: 'Interface', tabelas: 'netrunner', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Netrunner' },
      resumo: 'Hacker que corre a NET. Em 2077 soma o Rank nos testes técnicos, ganha RAM e slots extras.' },
    { id: 'corpo', nome: 'Corpo', habilidade: 'Teamwork + Operator', en: 'Teamwork', tabelas: 'exec', foundry: { pack: 'cpr-2077.roles-2077', nome: 'Corpo' },
      resumo: 'O corporativo que suja as mãos. Junta o Exec e o Fixer do RED, sem a equipe do Exec.' },
    { id: 'tech', nome: 'Tech', habilidade: 'Maker', en: 'Maker', tabelas: 'tech', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Tech' },
      resumo: 'Conserta, melhora e inventa: armas, veículos, cyberware. Igual ao RED.' },
    { id: 'medtech', nome: 'Medtech', habilidade: 'Medicine', en: 'Medicine', tabelas: 'medtech', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Medtech' },
      resumo: 'Médico de rua: cirurgia, remédios e criossistemas. Igual ao RED.' },
    { id: 'media', nome: 'Media', habilidade: 'Credibility', en: 'Credibility', tabelas: 'media', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Media' },
      resumo: 'Jornalista que investiga e publica a verdade. Igual ao RED.' },
    { id: 'lawman', nome: 'Lawman', habilidade: 'Investigator', en: 'Investigator', tabelas: 'lawman', foundry: { pack: 'cpr-2077.roles-2077', nome: 'Lawman (2077)' },
      resumo: 'Policial que segue os próprios casos. Em 2077 troca Backup por Investigator.',
      especializacoes: [
        { id: 'street-cop', nome: 'Street Cop', pericias: ['Streetwise', 'Athletics', 'Bribery'] },
        { id: 'undercover', nome: 'Undercover', pericias: ['Acting', 'Stealth', 'Wardrobe & Style'] },
        { id: 'interrogator', nome: 'Interrogator', pericias: ['Interrogation', 'Persuasion', 'Human Perception'] }
      ] },
    { id: 'nomad', nome: 'Nomad', habilidade: 'Moto', en: 'Moto', tabelas: 'nomad', foundry: { pack: 'cyberpunk-red-core.core_roles', nome: 'Nomad' },
      resumo: 'Da estrada e do clã: veículos, contrabando e família. Em 2077, upgrades e reparos pela metade do preço com o clã.' }
  ];

  // Perícias básicas: todo personagem tem no mínimo nível 2 (p. 88–90).
  const basicSkills = ['Athletics', 'Brawling', 'Concentration', 'Conversation', 'Education', 'Evasion', 'First Aid', 'Human Perception',
    'Language (Streetslang)', 'Local Expert (Your Home)', 'Perception', 'Persuasion', 'Stealth'];

  // Rato de Rua (p. 86–87): as 13 básicas e as 7 da Role, com o nível pronto.
  const streetratBasics = {
    rockerboy: [2, 6, 2, 2, 2, 6, 6, 6, 2, 4, 2, 6, 2],
    solo: [2, 2, 2, 2, 2, 6, 6, 2, 2, 2, 6, 2, 2],
    netrunner: [2, 2, 2, 2, 6, 6, 2, 2, 2, 2, 2, 2, 6],
    tech: [2, 2, 2, 2, 6, 6, 6, 2, 2, 2, 2, 2, 2],
    medtech: [2, 2, 2, 6, 6, 6, 2, 6, 2, 2, 2, 2, 2],
    media: [2, 2, 2, 6, 2, 6, 2, 6, 2, 6, 6, 6, 2],
    lawman: [2, 6, 2, 6, 2, 6, 2, 2, 2, 2, 2, 2, 2],
    exec: [2, 2, 2, 6, 6, 6, 2, 6, 2, 2, 2, 6, 2],
    nomad: [2, 6, 2, 2, 2, 6, 6, 2, 2, 2, 4, 2, 6]
  };
  const roleSkills = {
    rockerboy: [['Composition', 6], ['Handgun', 6], ['Melee Weapon', 6], ['Personal Grooming', 4], ['Play Instrument', 6], ['Streetwise', 6], ['Wardrobe & Style', 4]],
    solo: [['Autofire', 6], ['Handgun', 6], ['Interrogation', 6], ['Melee Weapon', 6], ['Resist Torture/Drugs', 6], ['Shoulder Arms', 6], ['Tactics', 6]],
    netrunner: [['Basic Tech', 6], ['Conceal/Reveal Object', 6], ['Cryptography', 6], ['Cybertech', 6], ['Electronics/Security Tech', 6], ['Handgun', 6], ['Library Search', 6]],
    tech: [['Basic Tech', 6], ['Cybertech', 6], ['Electronics/Security Tech', 6], ['Land Vehicle Tech', 6], ['Shoulder Arms', 6], ['Science', 6], ['Weaponstech', 6]],
    medtech: [['Basic Tech', 6], ['Cybertech', 4], ['Deduction', 6], ['Paramedic', 6], ['Resist Torture/Drugs', 4], ['Science', 6], ['Shoulder Arms', 6]],
    media: [['Bribery', 6], ['Composition', 6], ['Deduction', 6], ['Handgun', 6], ['Library Search', 4], ['Lip Reading', 4], ['Photography/Film', 4]],
    lawman: [['Autofire', 6], ['Criminology', 6], ['Deduction', 6], ['Handgun', 6], ['Interrogation', 6], ['Shoulder Arms', 6], ['Tracking', 6]],
    exec: [['Accounting', 6], ['Bureaucracy', 6], ['Business', 6], ['Deduction', 6], ['Handgun', 6], ['Lip Reading', 6], ['Personal Grooming', 4]],
    nomad: [['Animal Handling', 6], ['Drive Land Vehicle', 6], ['Handgun', 6], ['Melee Weapon', 6], ['Tracking', 6], ['Trading', 6], ['Wilderness Survival', 6]]
  };
  // Rato de Rua: [perícia, nível]. Edgerunner: as mesmas 20 perícias, com 86 pontos (p. 88–89).
  const streetratSkills = Object.fromEntries(Object.entries(roleSkills).map(([role, own]) => [role, [...basicSkills.map((skill, index) => [skill, streetratBasics[role][index]]), ...own]]));
  const edgerunnerSkills = Object.fromEntries(Object.entries(streetratSkills).map(([role, list]) => [role, list.map(([skill]) => skill)]));

  // Perícias "escolha 1": o nome no Foundry leva o tipo entre parênteses, vindo de um compêndio próprio.
  // `tipos`: nome no Foundry (entre parênteses) → português.
  const specializedSkills = {
    'Play Instrument': { nome: 'Tocar Instrumento', stat: 'TECH', pack: 'cyberpunk-red-core.core_skills-play-instrument', tipos: { Drums: 'bateria', Guitar: 'guitarra', Piano: 'piano', Singing: 'canto', Violin: 'violino' } },
    Science: { nome: 'Ciência', stat: 'INT', pack: 'cyberpunk-red-core.core_skills-science', tipos: { Anthropology: 'antropologia', Biology: 'biologia', Chemistry: 'química', Geology: 'geologia', History: 'história', Mathematics: 'matemática', Physics: 'física', Zoology: 'zoologia' } },
    'Martial Arts': { nome: 'Artes Marciais', stat: 'DEX', x2: true, pack: 'cyberpunk-red-core.core_skills-martial-arts', tipos: { Aikido: 'aikido', Judo: 'judô', Karate: 'caratê', Taekwondo: 'taekwondo' } },
    Language: { nome: 'Língua', stat: 'INT', pack: 'cyberpunk-red-core.core_skills-languages', tipos: null }
  };

  // Línguas do Foundry (nome em inglês → português) e as da Origem cultural do Lifepath (p. 45), na ordem da tabela.
  const languages = {
    Arabic: 'árabe', Bengali: 'bengali', Berber: 'berbere', Burmese: 'birmanês', 'Cantonese Chinese': 'chinês cantonês', Cree: 'cree', Creole: 'crioulo', Dari: 'dari',
    Dutch: 'holandês', English: 'inglês', Farsi: 'farsi', Filipino: 'filipino', Finnish: 'finlandês', French: 'francês', German: 'alemão', Guarani: 'guarani',
    Hausa: 'hauçá', Hawaiian: 'havaiano', Hebrew: 'hebraico', Hindi: 'hindi', Indonesian: 'indonésio', Italian: 'italiano', Japanese: 'japonês', Khmer: 'khmer',
    Korean: 'coreano', Lingala: 'lingala', Malayan: 'malaio', 'Mandarin Chinese': 'chinês mandarim', Maori: 'maori', Mayan: 'maia', Mongolian: 'mongol', Navajo: 'navajo',
    Nepali: 'nepali', Norwegian: 'norueguês', Oromo: 'oromo', 'Pama-Nyungan': 'pama-nyungan', Polish: 'polonês', Portuguese: 'português', Quechua: 'quéchua',
    Romanian: 'romeno', Russian: 'russo', Sinhalese: 'cingalês', Spanish: 'espanhol', Swahili: 'suaíli', Swedish: 'sueco', Tahitian: 'taitiano', Tamil: 'tâmil',
    Turkish: 'turco', Twi: 'twi', Ukrainian: 'ucraniano', Urdu: 'urdu', Vietnamese: 'vietnamita', Yoruba: 'iorubá'
  };
  const originLanguages = [
    ['Cantonese Chinese', 'Mandarin Chinese', 'Cree', 'Creole', 'English', 'French', 'Navajo', 'Spanish'],
    ['Creole', 'English', 'German', 'Guarani', 'Mayan', 'Portuguese', 'Quechua', 'Spanish'],
    ['Dutch', 'English', 'French', 'German', 'Italian', 'Norwegian', 'Portuguese', 'Spanish'],
    ['English', 'Finnish', 'Polish', 'Romanian', 'Russian', 'Ukrainian'],
    ['Arabic', 'Berber', 'English', 'Farsi', 'French', 'Hebrew', 'Turkish'],
    ['Arabic', 'English', 'French', 'Hausa', 'Lingala', 'Oromo', 'Portuguese', 'Swahili', 'Twi', 'Yoruba'],
    ['Bengali', 'Dari', 'English', 'Hindi', 'Nepali', 'Sinhalese', 'Tamil', 'Urdu'],
    ['Arabic', 'Burmese', 'English', 'Filipino', 'Hindi', 'Indonesian', 'Khmer', 'Malayan', 'Vietnamese'],
    ['Cantonese Chinese', 'English', 'Japanese', 'Korean', 'Mandarin Chinese', 'Mongolian'],
    ['English', 'French', 'Hawaiian', 'Maori', 'Pama-Nyungan', 'Tahitian']
  ];
  // Especialista Local (Sua Casa): o bairro de Night City em 2077.
  const homeDistricts = ['Watson', 'Westbrook', 'City Center', 'Heywood', 'Santo Domingo', 'Pacifica', 'Dogtown', 'Badlands'];

  // ---------------- Pacotes de Rato de Rua e Edgerunner (p. 98, 103 e 117) ----------------
  // Cada entrada é um item ([id, quantidade]) ou uma escolha { ou: [[itens], [itens]] }.
  const w = (name, qty = 1) => [`core_weapons:${name}`, qty];
  const a = (name, qty = 1) => [`core_ammo:${name}`, qty];
  const arm = (name, qty = 1) => [`core_armor:${name}`, qty];
  const g = (name, qty = 1) => [`core_gear:${name}`, qty];
  const prog = name => [`core_programs:${name}`, 1];
  const cw = name => [`core_cyberware:${name}`, 1];
  const cl = (style, piece, qty = 1) => [`core_clothing:${style}-${piece}`, qty];
  const ou = (...options) => ({ ou: options.map(option => (typeof option[0] === 'string' ? [option] : option)) });
  const lightArmor = [arm('light-armorjack-body'), arm('light-armorjack-head')];

  const packages = {
    rockerboy: {
      armas: [w('very-heavy-pistol'), a('very-heavy-pistol-basic', 50), ou(w('heavy-melee'), a('grenade-flashbang')), a('grenade-teargas', 2), ...lightArmor],
      equipamento: [g('agent'), g('computer'), ou(g('electric-guitar-other-instrument'), g('bug-detector')), g('glow-paint', 5), g('pocket-amplifier'), g('radio-scanner-music-player'), g('video-camera')],
      moda: [cl('generic-chic', 'jacket'), cl('generic-chic', 'jewelry', 3), cl('generic-chic', 'top', 4), cl('leisurewear', 'jewelry'), cl('leisurewear', 'mirrorshades'), cl('leisurewear', 'footwear'), cl('urban-flash', 'bottoms'), cl('urban-flash', 'top')],
      cyberware: [cw('audio-recorder'), cw('chemskin'), cw('cyberaudio-suite'), cw('techhair')], humanidade: 9
    },
    solo: {
      armas: [w('assault-rifle'), w('very-heavy-pistol'), ou(w('heavy-melee'), arm('bullet-proof-shield')), a('very-heavy-pistol-basic', 30), a('rifle-basic', 70), ...lightArmor],
      equipamento: [g('agent')],
      moda: [cl('leisurewear', 'footwear', 2), cl('leisurewear', 'jacket', 3), cl('leisurewear', 'mirrorshades'), cl('leisurewear', 'bottoms', 2), cl('leisurewear', 'top', 2)],
      cyberware: [cw('biomonitor'), cw('neural-link'), ou(cw('sandevistan'), cw('wolvers'))], humanidade: 14
    },
    netrunner: {
      // A tradução não traz a quantidade da munição; as outras pistolas do livro vêm com 50.
      armas: [w('very-heavy-pistol'), a('very-heavy-pistol-basic', 50), ...lightArmor],
      equipamento: [g('agent'), g('cyberdeck'), g('virtuality-goggles'), prog('armor'), prog('sword'), ou(prog('see-ya'), prog('eraser')), ou(prog('sword'), prog('vrizzbolt')), ou(prog('worm'), prog('sword'))],
      moda: [cl('generic-chic', 'top', 10), cl('leisurewear', 'footwear', 2), cl('leisurewear', 'jewelry'), cl('leisurewear', 'bottoms', 2), cl('urban-flash', 'jacket')],
      cyberware: [cw('interface-plugs'), cw('neural-link'), cw('shift-tacts')], humanidade: 14
    },
    tech: {
      armas: [ou(w('shotgun'), w('assault-rifle')), ou(a('shotgun-shell-basic', 100), a('rifle-basic', 100)), a('grenade-flashbang'), ...lightArmor],
      equipamento: [g('agent'), g('anti-smog-breathing-mask'), g('disposable-cell-phone'), g('duct-tape', 5), g('flashlight'), g('road-flare', 6), g('tech-bag')],
      moda: [cl('generic-chic', 'bottoms', 8), cl('generic-chic', 'top', 10), cl('leisurewear', 'footwear', 2)],
      cyberware: [cw('cybereye'), cw('microoptics'), cw('skinwatch'), cw('tool-hand')], humanidade: 12
    },
    medtech: {
      armas: [ou(w('shotgun'), w('assault-rifle')), ou(a('shotgun-shell-basic', 100), a('rifle-basic', 100)), ou(a('shotgun-shell-incendiary', 10), a('rifle-incendiary', 10)), a('grenade-smoke', 2), ...lightArmor, arm('bullet-proof-shield')],
      equipamento: [g('agent'), g('airhypo'), g('flashlight'), g('handcuffs'), g('glow-paint'), g('medtech-bag')],
      moda: [cl('generic-chic', 'jacket', 3), cl('leisurewear', 'footwear'), cl('leisurewear', 'bottoms', 3), cl('leisurewear', 'top', 5)],
      cyberware: [cw('biomonitor'), cw('cybereye'), ou(cw('nasal-filters'), cw('toxin-binders')), cw('image-enhance')], humanidade: 12
    },
    media: {
      armas: [ou(w('heavy-pistol'), w('very-heavy-pistol')), ou(a('heavy-pistol-basic', 50), a('very-heavy-pistol-basic', 50)), ...lightArmor],
      equipamento: [g('agent'), g('audio-recorder'), g('binoculars'), ou(g('disposable-cell-phone', 2), g('grapple-gun')), g('flashlight'), g('computer'), g('radio-scanner-music-player'), g('scrambler-descrambler'), g('video-camera')],
      moda: [cl('generic-chic', 'footwear'), cl('generic-chic', 'bottoms'), cl('generic-chic', 'top'), cl('leisurewear', 'jacket'), cl('urban-flash', 'mirrorshades')],
      cyberware: [ou(cw('amplified-hearing'), cw('voice-stress-analyzer')), cw('cyberaudio-suite'), cw('light-tattoo')], humanidade: 10
    },
    lawman: {
      armas: [ou(w('shotgun'), w('assault-rifle')), w('heavy-pistol'), ou(a('shotgun-shell-basic', 100), a('rifle-basic', 100), a('shotgun-slug-basic', 100)), a('heavy-pistol-basic', 30), ou(arm('bullet-proof-shield'), a('grenade-smoke', 2)), ...lightArmor],
      equipamento: [g('agent'), g('flashlight'), g('handcuffs', 2), g('radio-communicator'), g('road-flare', 10)],
      moda: [cl('generic-chic', 'jacket'), cl('generic-chic', 'bottoms', 2), cl('generic-chic', 'top', 3), cl('leisurewear', 'footwear', 2), cl('leisurewear', 'jacket', 2), cl('leisurewear', 'bottoms', 2), cl('leisurewear', 'mirrorshades'), cl('leisurewear', 'top', 2)],
      cyberware: [cw('hidden-holster'), cw('subdermal-pocket')], humanidade: 10
    },
    exec: {
      // A tradução diz "pistola muito pesada", mas dá munição de pistola pesada: ficou a pistola pesada, como no original.
      armas: [w('heavy-pistol'), a('heavy-pistol-basic', 50), ...lightArmor],
      equipamento: [g('radio-communicator', 4), g('scrambler-descrambler')],
      moda: [cl('businesswear', 'footwear'), cl('businesswear', 'jacket'), cl('businesswear', 'bottoms'), cl('businesswear', 'mirrorshades'), cl('businesswear', 'top'), cl('businesswear', 'jewelry', 2)],
      cyberware: [ou(cw('biomonitor'), cw('techhair')), cw('cyberaudio-suite'), cw('internal-agent'), ou(cw('toxin-binders'), cw('nasal-filters'))], humanidade: 12
    },
    nomad: {
      armas: [ou(w('heavy-pistol'), w('very-heavy-pistol')), ou(a('heavy-pistol-basic', 100), a('very-heavy-pistol-basic', 100)), ou(w('heavy-melee'), w('heavy-pistol')), ...lightArmor],
      equipamento: [g('agent'), g('anti-smog-breathing-mask'), g('duct-tape'), g('flashlight'), g('grapple-gun'), g('inflatable-bed-sleep-bag'), g('medtech-bag'), g('radio-communicator', 2), g('rope-60m-yd'), g('techtool'), g('tent-and-camping-equipment')],
      moda: [cl('bohemian', 'jewelry'), cl('nomad-leathers', 'top', 4), cl('nomad-leathers', 'bottoms', 2), cl('nomad-leathers', 'footwear', 2), cl('nomad-leathers', 'jacket'), cl('nomad-leathers', 'hat')],
      cyberware: [ou(cw('interface-plugs'), cw('wolvers')), cw('neural-link')], humanidade: 14
    }
  };

  // ---------------- Regras gerais ----------------
  const methods = [
    { id: 'ratoderua', nome: 'Rato de Rua', resumo: 'Rápido: role 1d10 e pegue a linha inteira de STATs da tabela da Role. Perícias, equipamento, moda e cyberware vêm prontos, e você ganha 500eb para gastar.' },
    { id: 'edgerunner', nome: 'Edgerunner', resumo: 'Role 1d10 para cada STAT na tabela da Role e distribua 86 pontos entre as 20 perícias da Role. Equipamento pronto, mais 500eb.' },
    { id: 'pacote', nome: 'Pacote Completo', resumo: 'Monte tudo: 62 pontos de STAT, 86 de perícia em qualquer perícia, 2.550eb para equipamento e cyberware e 800eb só para moda.' }
  ];
  const completePackage = { pontosStat: 62, statMin: 2, statMax: 8, pontosPericia: 86, periciaMax: 6, dinheiro: 2550, moda: 800 };
  const edgerunnerRules = { pontosPericia: 86, periciaMin: 2, periciaMax: 6, dinheiro: 500 };
  // 2077 (suplemento p. 8): grátis e sem perda de Humanidade. O Personal Link é o plug de interface do pulso.
  const free2077 = [
    { id: 'core_cyberware:neural-link', qtd: 1 }, { id: 'core_cyberware:cyberaudio-suite', qtd: 1 }, { id: 'core_cyberware:internal-agent', qtd: 1 },
    { id: 'core_cyberware:interface-plugs', qtd: 1, nome: 'Personal Link' }, { id: 'core_cyberware:chipware-socket', qtd: 2 }
  ];
  // Moradia e estilo de vida no começo (p. 105 e sup. p. 31): o primeiro mês é de graça.
  const housing = {
    padrao: { moradia: 'Contêiner de carga ou quitinete num megaprédio', aluguel: 1000, estilo: 'Prepak genérico', custoEstilo: 100 },
    corpo: { moradia: 'Conapt corporativo (pago pela corp)', aluguel: 0, estilo: 'Bom (pago no primeiro mês)', custoEstilo: 600 },
    nomad: { nota: 'O Nomad pode morar com a família do clã (veja a habilidade Moto).' }
  };
  // HP = 10 + 5 × (média de BODY e WILL, arredondada para cima); Gravemente Ferido = metade, para cima.
  const derived = values => {
    const hp = 10 + 5 * Math.ceil((values.BODY + values.WILL) / 2);
    return { hp, gravemente: Math.ceil(hp / 2), deathSave: values.BODY, humanidade: values.EMP * 10, andar: values.MOVE * 2, correr: values.MOVE * 4 };
  };

  window.systemCreation = {
    stats, statTables, roles, basicSkills, streetratSkills, edgerunnerSkills, specializedSkills, languages, originLanguages, homeDistricts,
    packages, methods, completePackage, edgerunnerRules, free2077, housing, derived
  };
})();
