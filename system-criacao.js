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
      cyberware: [cw('interface-plugs'), cw('neural-link'), cw('shift-tacts')], humanidade: 14,
      // Em 2077, o jogador pode trocar o cyberdeck e os programas do RED pelo deck de 2077 com 3 quickhacks de 100eb do
      // suplemento de fã (sup. p. 16–20). Os do Mission Kit o netrunner já faz pelo Rank de Interface. O resto do pacote não muda.
      kit2077: {
        deck: 'netrunning-2077:militech-hunter-mk-1', escolher: 3,
        quickhacks: [
          ['netrunning-2077:reboot-optics', 'Simples (DV6): embaralha os cyberópticos do alvo (Olho Danificado).'],
          ['netrunning-2077:weapon-glitch', 'Padrão (DV8): trava a arma Smart do alvo.'],
          ['netrunning-2077:bait', 'Simples (DV6): um som no Cyberaudio do alvo atrai ele até você.'],
          ['netrunning-2077:request-backup', 'Padrão (DV8): simula um pedido de reforço do alvo para os aliados dele.']
        ]
      }
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
  // Sub-habilidades da Role no Rank 4, com o nome que o item de Role do Foundry usa (`abilities`).
  // pontos: quantos distribuir; max: o máximo em cada uma. `derivadas`: campos que o Foundry espera calculados
  // (a perícia Cirurgia do Medtech vale 2 por ponto em Cirurgia; Tecnologia Médica, Farmacêutica + Criossistemas).
  const roleAbilities = {
    solo: {
      titulo: 'Consciência de Combate', pagina: 'RED p. 146', pontos: 4, max: 4,
      nota: 'Dá para redistribuir os pontos quando o combate começa (antes da Iniciativa), fora de combate ou, no combate, com uma Ação.',
      itens: [
        { id: 'Initiative Reaction', nome: 'Reação de Iniciativa', desc: '+1 na Iniciativa por ponto.' },
        { id: 'Precision Attack', nome: 'Ataque de Precisão', desc: '+1 em todo ataque a cada 3 pontos.' },
        { id: 'Spot Weakness', nome: 'Ponto Fraco', desc: '+1 no dano (antes da armadura) do primeiro acerto da rodada, por ponto.' },
        { id: 'Threat Detection', nome: 'Detecção de Ameaça', desc: '+1 em Percepção por ponto.' },
        { id: 'Damage Deflection', nome: 'Deflexão de Dano', desc: 'A cada 2 pontos, −1 no primeiro dano sofrido na rodada.' },
        { id: 'Fumble Recovery', nome: 'Recuperação de Falhas', desc: 'Com 4 pontos, ignora as falhas críticas (1 no dado) ao atacar.' }
      ]
    },
    tech: {
      titulo: 'Especialidades de Artífice', pagina: 'RED p. 147–148', pontos: 8, max: 4,
      nota: 'Cada Rank de Artífice dá +1 em duas especialidades diferentes: no Rank 4, são 8 pontos, até 4 em cada.',
      itens: [
        { id: 'Field Expertise', nome: 'Especialização de Campo', desc: 'Soma o Rank aos testes de Tecnologia fora do Artífice e faz reparos temporários como uma Ação.' },
        { id: 'Upgrade Expertise', nome: 'Especialização de Upgrade', desc: 'Melhora um item: menos perda de Humanidade, mais slots, ocultável, qualidade excelente…' },
        { id: 'Fabrication Expertise', nome: 'Especialização de Fabricação', desc: 'Fabrica itens que já existem, com materiais de uma categoria de preço abaixo.' },
        { id: 'Invention Expertise', nome: 'Especialização de Invenção', desc: 'Inventa itens e upgrades novos, com o mestre.' }
      ]
    },
    medtech: {
      titulo: 'Especialidades de Medicina', pagina: 'RED p. 149', pontos: 4, max: 4,
      nota: 'Cada Rank de Medicina dá 1 ponto numa especialidade. Cirurgia e Tecnologia Médica são perícias que só o Medtech tem.',
      itens: [
        { id: 'Surgery', nome: 'Cirurgia', desc: '+2 na perícia Cirurgia por ponto (até 10): lesões críticas graves e instalação de cyberware.' },
        { id: 'Medical Tech (Pharmaceuticals)', nome: 'Farmacêutica', desc: '+1 em Tecnologia Médica por ponto; fabrica fármacos.' },
        { id: 'Medical Tech (Cryosystem Operation)', nome: 'Operação de Criossistemas', desc: '+1 em Tecnologia Médica por ponto; opera cryopumps e cryotanks.' }
      ],
      derivadas: [
        { id: 'Surgery Skill', de: { Surgery: 2 }, max: 10 },
        { id: 'Medical Tech Skill', de: { 'Medical Tech (Pharmaceuticals)': 1, 'Medical Tech (Cryosystem Operation)': 1 } }
      ]
    }
  };

  // Oficina da Família do Nomad (RED p. 161–165): a cada Rank de Moto, um veículo de série ou um upgrade de um
  // veículo da família, do Rank dele ou menor. No Rank 4: 4 escolhas, só da faixa 1–4 e upgrades de Rank 1.
  // Só um veículo da família fica com o Nomad de cada vez. `classe`: para as restrições dos upgrades.
  const nomadMotorpool = {
    pagina: 'RED p. 161–165', escolhas: 4,
    veiculos: [
      { id: 'Compact Groundcar', nome: 'Groundcar Compacto', classe: ['groundcar', 'terrestre'] },
      { id: 'Roadbike', nome: 'Moto Estradeira', classe: ['moto', 'terrestre'] },
      { id: 'Jetski', nome: 'Jetski', classe: ['jetski', 'maritimo'] },
      { id: 'Gyrocopter', nome: 'Girocóptero', classe: ['girocoptero', 'aereo'] }
    ],
    // vezes: quantas vezes no mesmo veículo (0 = sem limite). so/exceto: classes. requer: outro upgrade antes, no mesmo veículo.
    upgrades: [
      { id: 'Bulletproof Glass', nome: 'Vidro blindado', vezes: 2, desc: 'O vidro vira cobertura (15 HP); da segunda vez, vidro denso (30 HP).' },
      { id: 'Communications Center', nome: 'Centro de comunicações', vezes: 1, desc: 'Console com agente, 6 rádios, codificadores, rastreador e gravador.' },
      { id: 'NOS', nome: 'NOS', vezes: 0, desc: 'Uma Ação de Movimento a mais ao dirigir, uma vez por dia por tanque.' },
      { id: 'Onboard Flamethrower', nome: 'Lança-chamas instalado', vezes: 0, desc: 'O motorista dispara com a Ação. Não recarrega dirigindo.' },
      { id: 'Onboard Machine Gun', nome: 'Metralhadora instalada', vezes: 0, desc: 'Rifle de assalto de 30 tiros, com autofogo, virado para a frente.' },
      { id: 'Seating Upgrade', nome: 'Upgrade de assento', vezes: 0, exceto: ['moto', 'jetski', 'girocoptero'], desc: 'Mais dois assentos (podem ser ejetáveis).' },
      { id: 'Smuggling Upgrade', nome: 'Upgrade de contrabando', vezes: 0, exceto: ['moto', 'jetski', 'girocoptero'], desc: 'Dois coldres ocultos e um compartimento escondido (DV17 para achar).' },
      { id: 'Heavy Chassis', nome: 'Chassis pesado', vezes: 1, exceto: ['moto', 'jetski', 'girocoptero'], desc: '+20 SDP e reboca até 10 toneladas.' },
      { id: 'Onboard Melee Weapon', nome: 'Arma branca instalada', vezes: 0, so: ['terrestre', 'maritimo'], desc: 'Arma Branca Muito Pesada montada no veículo.' },
      { id: 'Combat Plow', nome: 'Implemento de combate', vezes: 1, so: ['terrestre', 'maritimo'], exceto: ['moto', 'jetski'], desc: 'Bater de frente não danifica o veículo nem os ocupantes.' },
      { id: 'Deployable Spike Strip', nome: 'Tira de pregos', vezes: 0, so: ['groundcar'], desc: 'Quem passar por cima: Dirigir DV17 ou 4d6 no ponto fraco do veículo.' },
      { id: 'Housing Capacity', nome: 'Capacidade de alojamento', vezes: 1, so: ['groundcar'], requer: 'Heavy Chassis', desc: 'Cama, banheiro, chuveiro e cozinha: o carro vira uma kombi.' }
    ]
  };

  // Bônus de assinatura do Corpo (Teamwork Rank 1 do Exec, RED p. 153): um terno de negócios de graça.
  // Nos pacotes do Rato de Rua e do Edgerunner ele já vem; no Pacote Completo entra aqui.
  const roleFreeItems = {
    corpo: [{ id: 'core_clothing:businesswear-top', qtd: 1 }, { id: 'core_clothing:businesswear-bottoms', qtd: 1 }, { id: 'core_clothing:businesswear-footwear', qtd: 1 }]
  };

  // Moradia, estilo de vida, Trauma Team e moda (RED p. 223 e 377–378, sup. p. 7–8 e 31).
  // O padrão de cada Role tem o primeiro mês de graça. Escolher algo melhor paga a diferença do primeiro mês
  // com o dinheiro inicial; escolher pior não devolve nada (regra da mesa). `roles`: só para essas Roles.
  const housing = {
    moradias: [
      { id: 'rua', nome: 'Na rua ou num veículo', aluguel: 0, desc: 'Sem casa. Na rua, Resistência DV15 para não acordar cansado.' },
      { id: 'capsula', nome: 'Hotel cápsula', aluguel: 500, desc: 'Só uma cápsula para dormir. Com mais de uma pessoa por cápsula, todos dormem mal.' },
      { id: 'conteiner', nome: 'Contêiner de carga', aluguel: 1000, desc: 'Um contêiner adaptado, num pátio ou empilhado.' },
      { id: 'megapredio', nome: 'Quitinete em megaprédio', aluguel: 1000, desc: 'Em 2077 custa o mesmo que o contêiner (sup. p. 31).' },
      { id: 'quitinete', nome: 'Quitinete fora de megaprédio', aluguel: 1500, desc: 'Um cômodo só, num prédio comum.' },
      { id: 'dois-quartos', nome: 'Apartamento de dois quartos', aluguel: 2500, desc: 'Espaço para mais gente dormir bem.' },
      { id: 'conapt-luxo', nome: 'Conapt de luxo', aluguel: 7500, desc: 'Prédio com segurança e serviços.' },
      { id: 'cobertura', nome: 'Cobertura de luxo', aluguel: 15000, desc: 'O topo de um arranha-céu.' },
      { id: 'conapt-corp', nome: 'Conapt corporativo', aluguel: 0, roles: ['corpo'], desc: 'Da corporação, sem aluguel enquanto você trabalhar para ela (Teamwork Rank 2).' },
      { id: 'cla', nome: 'Com a família do clã', aluguel: 0, roles: ['nomad'], desc: 'Mora no comboio ou no acampamento do clã (Moto).' }
    ],
    estilos: [
      { id: 'generico', nome: 'Prepak genérico', custo: 100, desc: 'O antigo Kibble, pelo mesmo preço. Cobre comprar itens de até 10eb duas vezes por semana e um bar bom no fim de semana.' },
      { id: 'bom', nome: 'Prepak bom', custo: 600, desc: 'Comida de restaurante, quase como a de verdade. Bons bares e um show ou evento por mês.' },
      { id: 'fresca', nome: 'Comida fresca', custo: 1500, desc: 'Comida de verdade, bar executivo, hotel quando precisar e um restaurante de primeira por mês.' },
      { id: 'cla', nome: 'Com o clã', custo: 0, roles: ['nomad'], desc: 'O clã divide a comida e o resto.' }
    ],
    traumaTeam: [
      { id: 'nenhum', nome: 'Sem Trauma Team', custo: 0, desc: '' },
      { id: 'prata', nome: 'Trauma Team Prata', custo: 500, desc: 'Chega em 1d6 rodadas. As cirurgias são cobradas à parte, pelo preço do hospital.' },
      { id: 'executivo', nome: 'Trauma Team Executivo', custo: 1000, desc: 'Chega em 1d6 rodadas, com a cirurgia incluída.' }
    ],
    modas: [
      { id: '', nome: 'Nenhum em especial', desc: '' },
      { id: 'entropismo', nome: 'Entropismo', desc: 'Robusto, quadradão, feio, mas funciona. Necessidade acima de estilo.' },
      { id: 'kitsch', nome: 'Kitsch', desc: 'Espalhafatoso e colorido, com cyberware à mostra. Estilo acima de substância.' },
      { id: 'neomilitarismo', nome: 'Neomilitarismo', desc: 'Monolítico, prático, dominante. O visual das megacorps.' },
      { id: 'neokitsch', nome: 'Neokitsch', desc: 'Ostensivo, dourado, materiais naturais de verdade. O visual do 0,1%.' }
    ],
    // O que cada Role tem de graça no primeiro mês (o Corpo: conapt da corporação e Prepak bom).
    padrao: { geral: { moradia: 'conteiner', estilo: 'generico' }, corpo: { moradia: 'conapt-corp', estilo: 'bom' } }
  };
  // Lifepath da Role (RED p. 54–70), tabela por tabela, na ordem do fluxograma do livro. Chave: a Role do RED
  // (`tabelas` de cada Role de 2077). `dado`: 6 ou 10; 0 = escolha, sem rolar. `se`: a tabela só vale quando
  // outra deu aquele resultado (1, 2, 3...). O Fixer não entra: nenhuma Role de 2077 usa as tabelas dele.
  const roleLifepaths = {
    // Rockerboy (p. 54). A Face de 2077 usa este.
    rockerboy: [
      { id: 'tipo', titulo: 'Que tipo de Rockerboy você é?', dado: 10, linhas: ['Músico', 'Poeta de palco', 'Artista de rua', 'Artista performático', 'Comediante', 'Orador', 'Político', 'Rapper', 'DJ', 'Idoru'] },
      { id: 'grupo', titulo: 'Está num grupo ou em carreira solo?', dado: 0, linhas: ['Num grupo', 'Carreira solo'] },
      { id: 'jaGrupo', titulo: 'Já fez parte de um grupo?', dado: 0, linhas: ['Sim, já fiz parte de um grupo', 'Não, sempre fiz carreira solo'], se: { id: 'grupo', valor: 2 } },
      { id: 'saiu', titulo: 'Por que você saiu do grupo?', dado: 6, se: { id: 'jaGrupo', valor: 1 }, linhas: [
        'Você foi um idiota, e o resto do grupo votou pela sua saída.',
        'Foi pego dormindo com o par de outro membro.',
        'O resto do grupo morreu num trágico "acidente".',
        'O resto do grupo foi assassinado ou destruído por inimigos de fora.',
        'O grupo se separou por "diferenças criativas".',
        'Você decidiu seguir sozinho.'] },
      { id: 'local', titulo: 'Onde você se apresenta?', dado: 6, linhas: ['Cafeterias alternativas', 'Clubes privados', 'Barzinhos decadentes', 'Apresentações de guerrilha', 'Casas noturnas pela cidade', 'Num servidor de Data Pool'] },
      { id: 'atras', titulo: 'Quem está atrás de você ou do seu grupo?', dado: 6, linhas: [
        'Um antigo membro do grupo que acha que você o traiu.',
        'Um grupo ou artista rival tentando roubar a sua fatia do mercado.',
        'Inimigos corporativos que não gostam da sua mensagem.',
        'Um crítico ou outro "influencer" tentando derrubar você.',
        'Uma estrela da mídia mais velha que se sente ameaçada pela sua fama.',
        'Um interesse romântico ou figura da mídia que quer vingança por motivos pessoais.'] }
    ],
    // Solo (p. 55).
    solo: [
      { id: 'tipo', titulo: 'Que tipo de Solo você é?', dado: 6, linhas: ['Guarda-costas', 'Mercenário de rua', 'Capanga corporativo que pega serviços por fora', 'Agente corporativo ou freelancer de Black Ops', 'Vigilante local de aluguel', 'Assassino de aluguel'] },
      { id: 'moral', titulo: 'Como é a sua bússola moral?', dado: 6, linhas: [
        'Sempre trabalha pelo bem, tentando acabar com os "bandidos".',
        'Sempre poupa os inocentes (idosos, mulheres, crianças, animais de estimação).',
        'De vez em quando vacila e faz coisas antiéticas ou más, mas é raro.',
        'Implacável e focado no lucro: trabalha para qualquer um e pega qualquer serviço pelo dinheiro.',
        'Disposto a dobrar as regras (e a lei) para fazer o serviço.',
        'Totalmente maligno: faz trabalho ilegal e antiético o tempo todo e, na verdade, se diverte.'] },
      { id: 'territorio', titulo: 'Qual é o seu território de operação?', dado: 6, linhas: ['Uma zona corporativa', 'Zonas de combate', 'A cidade toda', 'O território de uma única corporação', 'O território de um Fixer ou contato em particular', 'Onde o dinheiro levar'] },
      { id: 'atras', titulo: 'Quem está atrás de você?', dado: 6, linhas: [
        'Uma corporação que você pode ter irritado.',
        'Um gangueiro com cyberware que você enfrentou.',
        'Homens da lei corruptos, ou homens da lei que acham, por engano, que você é culpado de algo.',
        'Um Solo rival de outra corporação.',
        'Um Fixer que vê você como ameaça.',
        'Um Solo rival que vê você como seu arqui-inimigo.'] }
    ],
    // Netrunner (p. 56–57).
    netrunner: [
      { id: 'tipo', titulo: 'Que tipo de Netrunner você é?', dado: 6, linhas: [
        'Freelancer que hackeia por contrato.',
        'Corporativo "runner duplo" que hackeia o próprio chefe.',
        'Hacktivista interessado em invadir sistemas e expor os bandidos.',
        'Só gosta de invadir sistemas por diversão.',
        'Faz parte de uma equipe de freelancers.',
        'Hackeia para um Media, político ou Lawman que contrata você quando precisa.'] },
      { id: 'parceiro', titulo: 'Tem um parceiro ou trabalha sozinho?', dado: 0, linhas: ['Tem um parceiro', 'Trabalha sozinho'] },
      { id: 'quemParceiro', titulo: 'Quem é o seu parceiro?', dado: 6, se: { id: 'parceiro', valor: 1 }, linhas: [
        'Alguém da família.',
        'Um velho amigo.',
        'Um possível par romântico, também.',
        'Um parceiro secreto que pode ser uma IA renegada. Talvez.',
        'Um parceiro secreto com ligações com a máfia ou uma gangue.',
        'Um parceiro secreto com ligações corporativas.'] },
      { id: 'local', titulo: 'Como é o seu espaço de trabalho?', dado: 6, linhas: ['Telas por todo lado.', 'Você jura que fica melhor no Virtual.', 'Uma cama suja coberta de fios.', 'Corporativo, modular e funcional.', 'Minimalista, limpo e organizado.', 'Cada canto do espaço está ocupado.'] },
      { id: 'clientes', titulo: 'Quem são alguns dos seus outros clientes?', dado: 6, linhas: [
        'Fixers locais que mandam clientes para você.',
        'Gangueiros locais que também protegem a sua área de trabalho, enquanto você procura ameaças na NET.',
        'Execs corporativos que usam você em trabalhos de "Black Project".',
        'Solos locais ou outros combatentes que usam você para manter seus sistemas pessoais seguros.',
        'Nomads e Fixers locais que usam você para manter os sistemas da família seguros.',
        'Você trabalha para si mesmo, vendendo os dados que encontra na NET.'] },
      { id: 'programas', titulo: 'Onde você consegue seus programas?', dado: 6, linhas: [
        'Escavando nas antigas Zonas abandonadas da cidade.',
        'Rouba de outros Netrunners cujo cérebro você fritou.',
        'Um Fixer local fornece os programas em troca de trabalho de hacker.',
        'Execs corporativos fornecem programas em troca dos seus serviços.',
        'Você tem uma porta dos fundos em alguns armazéns corporativos.',
        'Você vai aos Mercados Noturnos e pechincha programas sempre que pode.'] },
      { id: 'atras', titulo: 'Quem está atrás de você?', dado: 6, linhas: [
        'Você acha que pode ser uma IA renegada ou um fantasma da NET. Seja o que for, é má notícia.',
        'Netrunners rivais que simplesmente não gostam de você.',
        'Corporativos que querem que você trabalhe só para eles.',
        'Lawmen que consideram você um "black hat" ilegal e querem prender você.',
        'Velhos clientes que acham que você os passou para trás.',
        'Um Fixer ou outro cliente que quer os seus serviços só para ele.'] }
    ],
    // Tech (p. 58–59).
    tech: [
      { id: 'tipo', titulo: 'Que tipo de Tech você é?', dado: 10, linhas: ['Técnico de cyberware', 'Mecânico de veículos', 'Faz-tudo', 'Técnico de microeletrônica', 'Armeiro', 'Inventor maluco', 'Mecânico de robôs e drones', 'Mecânico de maquinário pesado', 'Sucateiro', 'Mecânico náutico'] },
      { id: 'parceiro', titulo: 'Tem um parceiro ou trabalha sozinho?', dado: 0, linhas: ['Tem um parceiro', 'Trabalha sozinho'] },
      { id: 'quemParceiro', titulo: 'Quem é o seu parceiro?', dado: 6, se: { id: 'parceiro', valor: 1 }, linhas: [
        'Alguém da família.',
        'Um velho amigo.',
        'Um possível par romântico, também.',
        'Um mentor.',
        'Um parceiro secreto com ligações com a máfia ou uma gangue.',
        'Um parceiro secreto com ligações corporativas.'] },
      { id: 'local', titulo: 'Como é o seu espaço de trabalho?', dado: 6, linhas: [
        'Uma bagunça coberta de papéis de projetos.',
        'Tudo tem código de cores, mas ainda é um pesadelo.',
        'Totalmente digital, com backup todo dia.',
        'Você projeta tudo no seu Agent.',
        'Guarda tudo, para o caso de precisar mais tarde.',
        'Só você entende o seu sistema de arquivos e anotações.'] },
      { id: 'clientes', titulo: 'Quem são seus principais clientes?', dado: 6, linhas: [
        'Fixers locais que mandam clientes para você.',
        'Gangueiros locais que também protegem a sua área de trabalho ou casa.',
        'Execs corporativos que usam você em trabalhos de "Black Project".',
        'Solos locais ou outros combatentes que usam você na manutenção das armas.',
        'Nomads e Fixers locais que trazem "achados" tecnológicos para consertar.',
        'Você trabalha para si mesmo e vende o que inventa ou conserta.'] },
      { id: 'suprimentos', titulo: 'Onde você consegue seus suprimentos?', dado: 6, linhas: [
        'Vasculha os destroços que encontra nas zonas abandonadas da cidade.',
        'Tira equipamento dos corpos depois dos tiroteios.',
        'Um Fixer local traz suprimentos em troca de consertos.',
        'Execs corporativos fornecem coisas em troca dos seus serviços.',
        'Você tem uma porta dos fundos em alguns armazéns corporativos.',
        'Você vai aos Mercados Noturnos e pechincha sempre que pode.'] },
      { id: 'atras', titulo: 'Quem está atrás de você?', dado: 6, linhas: [
        'Gangues da Zona de Combate que querem que você trabalhe só para elas.',
        'Um Tech rival tentando roubar seus clientes.',
        'Corporativos que querem que você trabalhe só para eles.',
        'Um grande fabricante quer derrubar você, porque as suas modificações são uma ameaça.',
        'Um velho cliente que acha que você o passou para trás.',
        'Um Tech rival que quer derrubar você para ficar com os recursos e as peças.'] }
    ],
    // Medtech (p. 60–61).
    medtech: [
      { id: 'tipo', titulo: 'Que tipo de Medtech você é?', dado: 10, linhas: ['Cirurgião', 'Clínico geral', 'Médico de trauma', 'Psiquiatra', 'Terapeuta de ciberpsicose', 'Ripperdoc', 'Operador de sistemas de criogenia', 'Farmacologista', 'Escultor de corpos', 'Médico legista'] },
      { id: 'parceiro', titulo: 'Tem um parceiro ou trabalha sozinho?', dado: 0, linhas: ['Tem um parceiro', 'Trabalha sozinho'] },
      { id: 'quemParceiro', titulo: 'Quem é o seu parceiro (ou parceiros)?', dado: 6, se: { id: 'parceiro', valor: 1 }, linhas: [
        'Uma equipe da Trauma Team.',
        'Um velho amigo.',
        'Um possível par romântico, também.',
        'Alguém da família.',
        'Um parceiro secreto com ligações com a máfia ou uma gangue.',
        'Um parceiro secreto com ligações corporativas.'] },
      { id: 'local', titulo: 'Como é o seu espaço de trabalho?', dado: 6, linhas: [
        'Esterilizado toda manhã, como um relógio.',
        'Não é o mais moderno, mas é confortável para você.',
        'O equipamento de criogenia também serve para gelar as bebidas.',
        'Tudo o que é descartável fica guardado e compactado até ser usado.',
        'Não tão limpo quanto muitos pacientes esperariam.',
        'Meticulosamente organizado, afiado e esterilizado.'] },
      { id: 'clientes', titulo: 'Quem são seus principais clientes?', dado: 6, linhas: [
        'Fixers locais que mandam clientes para você.',
        'Gangues locais que também protegem a sua área de trabalho ou casa em troca de ajuda médica.',
        'Execs corporativos que usam você em "Black Projects" de trabalho médico.',
        'Solos locais ou outros combatentes que procuram você para ter ajuda médica.',
        'Nomads e Fixers locais que trazem clientes feridos.',
        'Paramédicos da Trauma Team.'] },
      { id: 'suprimentos', titulo: 'Onde você consegue seus suprimentos?', dado: 6, linhas: [
        'Vasculha esconderijos de suprimentos médicos que encontra nas zonas abandonadas da cidade.',
        'Tira peças dos corpos depois dos tiroteios.',
        'Um Fixer local traz suprimentos em troca de trabalho médico.',
        'Execs corporativos ou a Trauma Team fornecem suprimentos em troca dos seus serviços.',
        'Você tem uma porta dos fundos em alguns armazéns corporativos ou do hospital.',
        'Você vai aos Mercados Noturnos e pechincha sempre que pode.'] }
    ],
    // Media (p. 62).
    media: [
      { id: 'tipo', titulo: 'Que tipo de Media você é?', dado: 6, linhas: ['Blogueiro', 'Escritor (livros)', 'Cinegrafista', 'Documentarista', 'Repórter investigativo', 'Escritor de rua'] },
      { id: 'publico', titulo: 'Como o seu trabalho chega ao público?', dado: 6, linhas: ['Revista mensal', 'Blog', 'Transmissão de vídeo convencional', 'Canal de notícias', 'Venda de "livros"', 'Screamsheets'] },
      { id: 'etica', titulo: 'Quão ético você é?', dado: 6, linhas: [
        'Jornalismo justo e honesto, com ética forte. Você só publica a verdade verificada.',
        'Reportagem justa e honesta, mas disposto a espalhar boatos se for preciso.',
        'De vez em quando vacila e faz coisas antiéticas, mas é raro. Você tem alguns padrões.',
        'Disposto a quebrar todas as regras para pegar os bandidos. Mas só os bandidos.',
        'Implacável e decidido a ficar grande, mesmo que isso signifique quebrar a lei. Você é um canalha.',
        'Totalmente corrupto: aceita suborno e faz matérias ilegais e antiéticas o tempo todo. A sua caneta vai para quem pagar mais.'] },
      { id: 'historias', titulo: 'Que tipo de história você quer contar?', dado: 6, linhas: ['Intrigas políticas', 'Impacto ecológico', 'Notícias de celebridades', 'Derrubar corporações', 'Editoriais', 'Propaganda'] }
    ],
    // Exec (p. 63–64). O Corpo de 2077 usa este.
    exec: [
      { id: 'corporacao', titulo: 'Para que tipo de corporação você trabalha?', dado: 10, linhas: ['Financeira', 'Mídia e comunicações', 'Cybertecnologia e tecnologia médica', 'Farmacêutica e biotecnologia', 'Alimentos, moda ou outros bens de consumo', 'Produção de energia', 'Eletrônica pessoal e robótica', 'Serviços corporativos', 'Serviços ao consumidor', 'Construção e imobiliária'] },
      { id: 'divisao', titulo: 'Em que divisão você trabalha?', dado: 6, linhas: ['Compras', 'Produção', 'Pesquisa e desenvolvimento', 'Recursos humanos', 'Relações públicas, publicidade e propaganda', 'Fusões e aquisições'] },
      { id: 'etica', titulo: 'Quão boa ou ruim é a sua corporação?', dado: 6, linhas: [
        'Sempre trabalha pelo bem e apoia de verdade as práticas éticas.',
        'Funciona como um negócio justo e honesto o tempo todo.',
        'De vez em quando vacila e faz coisas antiéticas, mas é raro.',
        'Disposta a dobrar as regras para conseguir o que precisa.',
        'Implacável e focada no lucro, disposta a fazer algumas coisas ruins.',
        'Totalmente maligna: faz negócios ilegais e antiéticos o tempo todo.'] },
      { id: 'base', titulo: 'Onde fica a base da sua corporação?', dado: 6, linhas: ['Numa cidade', 'Em várias cidades', 'No estado todo', 'No país todo', 'Internacional, com escritórios em algumas grandes cidades', 'Internacional, com escritórios em toda parte'] },
      { id: 'atras', titulo: 'Quem está atrás do seu grupo?', dado: 6, linhas: [
        'Uma corporação rival do mesmo ramo.',
        'A polícia está de olho em você.',
        'Um Media local quer acabar com você.',
        'Divisões diferentes da sua própria empresa estão brigando entre si.',
        'O governo local não gosta da sua corporação.',
        'Corporações internacionais estão de olho em vocês para uma aquisição hostil.'] },
      { id: 'chefe', titulo: 'Como está a relação com o seu chefe?', dado: 6, linhas: [
        'Seu chefe é seu mentor, mas cuidado com os inimigos dele.',
        'Seu chefe dá carta branca e não quer saber o que você está fazendo.',
        'Seu chefe é obcecado por detalhes e tenta se meter no seu trabalho.',
        'Seu chefe é um psicopata: explosões imprevisíveis, compensadas por uma paranoia silenciosa.',
        'Seu chefe é legal e protege você dos rivais.',
        'Seu chefe se sente ameaçado pela sua ascensão meteórica e planeja apunhalar você pelas costas.'] }
    ],
    // Lawman (p. 65).
    lawman: [
      { id: 'posto', titulo: 'Qual é o seu posto na força policial?', dado: 6, linhas: ['Guarda', 'Ronda comum ou patrulha', 'Investigador criminal', 'Forças especiais', 'Polícia motorizada (batedor)', 'Corregedoria'] },
      { id: 'jurisdicao', titulo: 'Qual é a jurisdição do seu grupo?', dado: 6, linhas: ['Zona corporativa', 'Zona de patrulha comum da cidade', 'Zona de combate', 'Periferia da cidade', 'Zonas de reconstrução', 'Estradas abertas'] },
      { id: 'corrupcao', titulo: 'Quão corrupto é o seu grupo?', dado: 6, linhas: [
        'Policiamento justo e honesto, com ética forte.',
        'Policiamento justo e honesto, mas duro com os infratores.',
        'De vez em quando vacila e faz coisas antiéticas, mas é raro.',
        'Disposto a quebrar as regras para pegar os caras maus.',
        'Implacável e decidido a controlar a Rua, mesmo que isso signifique infringir a lei.',
        'Totalmente corrupto: aceita suborno e faz negócios ilegais e antiéticos o tempo todo.'] },
      { id: 'atras', titulo: 'Quem está atrás do seu grupo?', dado: 6, linhas: ['Crime organizado', 'Gangueiros com cyberware (boostergangs)', 'A corregedoria da polícia', 'Políticos corruptos', 'Contrabandistas', 'Criminosos de rua'] },
      { id: 'alvo', titulo: 'Quem é o alvo principal do seu grupo?', dado: 6, linhas: ['Crime organizado', 'Gangueiros com cyberware (boostergangs)', 'Traficantes de drogas', 'Políticos corruptos', 'Contrabandistas', 'Criminosos de rua'] }
    ],
    // Nomad (p. 68–69).
    nomad: [
      { id: 'tamanho', titulo: 'Qual o tamanho do seu bando?', dado: 6, linhas: ['Uma única tribo ou família extensa', 'Algumas dezenas de membros', 'Quarenta ou cinquenta membros', 'Cem membros ou mais', 'Uma Família de Sangue (centenas de membros)', 'Uma Família Afiliada (várias Famílias de Sangue juntas)'] },
      { id: 'meio', titulo: 'O seu bando é da terra, do ar ou do mar?', dado: 0, linhas: ['Terra', 'Ar', 'Mar'] },
      { id: 'terra', titulo: 'Na terra, o que vocês fazem?', dado: 10, se: { id: 'meio', valor: 1 }, linhas: ['Gangue de estrada (gogang)', 'Transporte de passageiros', 'Chautauqua (escola itinerante)', 'Espetáculo itinerante ou parque de diversões', 'Trabalhadores rurais migrantes', 'Transporte de carga', 'Proteção de comboios', 'Contrabando', 'Exército mercenário', 'Equipe de construção civil'] },
      { id: 'ar', titulo: 'No ar, o que vocês fazem?', dado: 6, se: { id: 'meio', valor: 2 }, linhas: ['Pirataria aérea', 'Transporte de carga', 'Transporte de passageiros', 'Proteção de aeronaves', 'Contrabando', 'Apoio de combate'] },
      { id: 'mar', titulo: 'No mar, o que vocês fazem?', dado: 6, se: { id: 'meio', valor: 3 }, linhas: ['Pirataria', 'Transporte de carga', 'Transporte de passageiros', 'Contrabando', 'Apoio de combate', 'Guerra submarina'] },
      { id: 'funcao', titulo: 'O que você faz pelo seu bando?', dado: 6, linhas: ['Batedor (negociador)', 'Escolta armada (proteção, armas)', 'Piloto de transporte ou motorista', 'Chefe de carga (grande transporte, caminhoneiro)', 'Contrabandista solo', 'Aquisições (combustível, veículos etc.)'] },
      { id: 'filosofia', titulo: 'Qual é a filosofia geral do seu bando?', dado: 6, linhas: [
        'Sempre trabalha pelo bem; o seu grupo acolhe quem só quer se dar bem.',
        'É mais como uma empresa familiar: age com preocupação justa e honesta.',
        'De vez em quando vacila e faz coisas antiéticas, mas é raro.',
        'Disposto a quebrar as regras sempre que elas atrapalham o que o bando precisa.',
        'Implacável e egocêntrico, disposto a fazer coisas más para o bando ir em frente.',
        'Totalmente maligno: aterroriza as estradas, matando e saqueando.'] },
      { id: 'atras', titulo: 'Quem está atrás do seu bando?', dado: 6, linhas: ['Crime organizado', 'Gangueiros com cyberware (boostergangs)', 'Traficantes de drogas', 'Políticos corruptos', 'Bandos nômades rivais do mesmo ramo', 'Policiais corruptos'] }
    ]
  };

  // HP = 10 + 5 × (média de BODY e WILL, arredondada para cima); Gravemente Ferido = metade, para cima.
  const derived = values => {
    const hp = 10 + 5 * Math.ceil((values.BODY + values.WILL) / 2);
    return { hp, gravemente: Math.ceil(hp / 2), deathSave: values.BODY, humanidade: values.EMP * 10, andar: values.MOVE * 2, correr: values.MOVE * 4 };
  };

  window.systemCreation = {
    stats, statTables, roles, basicSkills, streetratSkills, edgerunnerSkills, specializedSkills, languages, originLanguages, homeDistricts,
    packages, methods, completePackage, edgerunnerRules, free2077, housing, derived, roleLifepaths, roleAbilities, nomadMotorpool, roleFreeItems
  };
})();
