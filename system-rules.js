// Regras do Cyberpunk RED para consulta na mesa.
// Números conferidos no PDF traduzido do livro-base; "p. N" é a numeração impressa nas páginas.
(() => {
  const table = (headers, rows, className = '') => `<div class="table-wrap${className ? ` ${className}` : ''}"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell === null ? '—' : cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  // ref só com números = página do livro-base (p. 186); com letras = texto livre (sup. p. 7).
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body, className = '') => `<div class="section${className ? ` ${className}` : ''}" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const formula = text => `<p><span class="formula">${text}</span></p>`;
  const en = text => `<span class="en">${text}</span>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;

  // ---------- Dados usados pelas tabelas e pelas ferramentas do Escudo do mestre ----------

  const rangeBands = ['0–6 m', '7–12 m', '13–25 m', '26–50 m', '51–100 m', '101–200 m', '201–400 m', '401–800 m'];
  const rangeBandLimits = [6, 12, 25, 50, 100, 200, 400, 800];
  const rangeDV = [
    { id: 'pistol', name: 'Pistolas (Armas de uma Mão)', dv: [13, 15, 20, 25, 30, 30, null, null] },
    { id: 'smg', name: 'SMG / SMG pesada', dv: [15, 13, 15, 20, 25, 25, 30, null], autofire: [20, 17, 20, 25, 30] },
    { id: 'shotgun', name: 'Espingarda (balote)', dv: [13, 15, 20, 25, 30, 35, null, null] },
    { id: 'assault', name: 'Rifle de assalto', dv: [17, 16, 15, 13, 15, 20, 25, 30], autofire: [22, 20, 17, 20, 25] },
    { id: 'sniper', name: 'Rifle sniper', dv: [30, 25, 25, 20, 15, 16, 17, 20] },
    { id: 'bow', name: 'Arcos e bestas', dv: [15, 13, 15, 17, 20, 22, null, null] },
    { id: 'grenade', name: 'Lança-granadas / arremesso', dv: [16, 15, 15, 17, 20, 22, 25, null] },
    { id: 'rocket', name: 'Lança-mísseis', dv: [17, 16, 15, 15, 20, 20, 25, 30] }
  ];

  // [2d6, lesão, efeito, correção rápida, tratamento]
  const critBody = [
    [2, 'Braço desmembrado', 'O braço se foi. Larga o que estiver nessa mão. Death Save base +1.', '—', 'Cirurgia DV17'],
    [3, 'Mão desmembrada', 'A mão se foi. Larga o que estiver nela. Death Save base +1.', '—', 'Cirurgia DV17'],
    [4, 'Pulmão colapsado', '−2 MOVE (mínimo 1). Death Save base +1.', 'Paramédico DV15', 'Cirurgia DV15'],
    [5, 'Costelas quebradas', 'No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus da lesão direto no HP.', 'Paramédico DV13', 'Paramédico DV15 ou Cirurgia DV13'],
    [6, 'Braço quebrado', 'O braço não pode ser usado. Larga o que estiver nessa mão.', 'Paramédico DV13', 'Paramédico DV15 ou Cirurgia DV13'],
    [7, 'Objeto estranho alojado', 'No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus direto no HP.', 'Primeiros Socorros ou Paramédico DV13', 'A correção rápida resolve de vez'],
    [8, 'Perna quebrada', '−4 MOVE (mínimo 1).', 'Paramédico DV13', 'Paramédico DV15 ou Cirurgia DV13'],
    [9, 'Músculo rompido', '−2 em ataques corpo a corpo.', 'Primeiros Socorros ou Paramédico DV13', 'A correção rápida resolve de vez'],
    [10, 'Lesão na coluna', 'No próximo turno não faz Ação, só Ação de Movimento. Death Save base +1.', 'Paramédico DV15', 'Cirurgia DV15'],
    [11, 'Dedos esmagados', '−4 em todas as ações com essa mão.', 'Paramédico DV13', 'Cirurgia DV15'],
    [12, 'Perna desmembrada', 'A perna se foi. −6 MOVE (mínimo 1) e não pode se esquivar. Death Save base +1.', '—', 'Cirurgia DV17']
  ];
  const critHead = [
    [2, 'Olho perdido', 'O olho se foi. −4 em ataques à distância e Percepção pela visão. Death Save base +1.', '—', 'Cirurgia DV17'],
    [3, 'Lesão cerebral', '−2 em todas as ações. Death Save base +1.', '—', 'Cirurgia DV17'],
    [4, 'Olho danificado', '−2 em ataques à distância e Percepção pela visão.', 'Paramédico DV15', 'Cirurgia DV13'],
    [5, 'Concussão', '−2 em todas as ações.', 'Primeiros Socorros ou Paramédico DV13', 'A correção rápida resolve de vez'],
    [6, 'Mandíbula quebrada', '−4 em todas as ações que envolvem falar.', 'Paramédico DV13', 'Paramédico ou Cirurgia DV13'],
    [7, 'Objeto estranho alojado', 'No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus direto no HP.', 'Primeiros Socorros ou Paramédico DV13', 'A correção rápida resolve de vez'],
    [8, 'Traumatismo cervical', 'Death Save base +1.', 'Paramédico DV13', 'Paramédico ou Cirurgia DV13'],
    [9, 'Crânio rachado', 'Tiros mirados na cabeça multiplicam o dano que passa da armadura por 3 em vez de 2. Death Save base +1.', 'Paramédico DV15', 'Paramédico ou Cirurgia DV15'],
    [10, 'Ouvido danificado', 'Se andar mais de 4 m a pé num turno, não tem Ação de Movimento no próximo. −2 em Percepção pela audição.', 'Paramédico DV13', 'Cirurgia DV13'],
    [11, 'Traqueia esmagada', 'Não consegue falar. Death Save base +1.', '—', 'Cirurgia DV15'],
    [12, 'Orelha perdida', 'Se andar mais de 4 m a pé num turno, não tem Ação de Movimento no próximo. −4 em Percepção pela audição. Death Save base +1.', '—', 'Cirurgia DV17']
  ];

  // [nome, nome em inglês, STAT, grupo, custa x2, básica (mínimo 2 na criação)]
  const skills = [
    ['Concentração', 'Concentration', 'WILL', 'Consciência', false, true],
    ['Esconder/Revelar Objeto', 'Conceal/Reveal Object', 'INT', 'Consciência', false, false],
    ['Leitura Labial', 'Lip Reading', 'INT', 'Consciência', false, false],
    ['Percepção', 'Perception', 'INT', 'Consciência', false, true],
    ['Rastrear', 'Tracking', 'INT', 'Consciência', false, false],
    ['Atletismo', 'Athletics', 'DEX', 'Corpo', false, true],
    ['Contorcionismo', 'Contortionist', 'DEX', 'Corpo', false, false],
    ['Dança', 'Dance', 'DEX', 'Corpo', false, false],
    ['Resistência', 'Endurance', 'WILL', 'Corpo', false, false],
    ['Resistir Tortura/Drogas', 'Resist Torture/Drugs', 'WILL', 'Corpo', false, false],
    ['Furtividade', 'Stealth', 'DEX', 'Corpo', false, true],
    ['Conduzir Veículo Terrestre', 'Drive Land Vehicle', 'REF', 'Controle', false, false],
    ['Pilotar Veículo Aéreo', 'Pilot Air Vehicle', 'REF', 'Controle', true, false],
    ['Pilotar Veículo Marítimo', 'Pilot Sea Vehicle', 'REF', 'Controle', false, false],
    ['Equitação', 'Riding', 'REF', 'Controle', false, false],
    ['Contabilidade', 'Accounting', 'INT', 'Educação', false, false],
    ['Afinidade com Animais', 'Animal Handling', 'INT', 'Educação', false, false],
    ['Burocracia', 'Bureaucracy', 'INT', 'Educação', false, false],
    ['Negócios', 'Business', 'INT', 'Educação', false, false],
    ['Composição', 'Composition', 'INT', 'Educação', false, false],
    ['Criminologia', 'Criminology', 'INT', 'Educação', false, false],
    ['Criptografia', 'Cryptography', 'INT', 'Educação', false, false],
    ['Dedução', 'Deduction', 'INT', 'Educação', false, false],
    ['Educação', 'Education', 'INT', 'Educação', false, true],
    ['Jogos de Azar', 'Gamble', 'INT', 'Educação', false, false],
    ['Linguagem', 'Language', 'INT', 'Educação', false, true],
    ['Pesquisa Bibliotecária', 'Library Search', 'INT', 'Educação', false, false],
    ['Especialista Local', 'Local Expert', 'INT', 'Educação', false, true],
    ['Ciências', 'Science', 'INT', 'Educação', false, false],
    ['Táticas', 'Tactics', 'INT', 'Educação', false, false],
    ['Sobrevivência', 'Wilderness Survival', 'INT', 'Educação', false, false],
    ['Briga', 'Brawling', 'DEX', 'Luta', false, true],
    ['Evasão', 'Evasion', 'DEX', 'Luta', false, true],
    ['Artes Marciais', 'Martial Arts', 'DEX', 'Luta', true, false],
    ['Armas Brancas', 'Melee Weapon', 'DEX', 'Luta', false, false],
    ['Atuação', 'Acting', 'COOL', 'Performance', false, false],
    ['Tocar Instrumento', 'Play Instrument', 'TECH', 'Performance', false, false],
    ['Arquearia', 'Archery', 'REF', 'Armas à distância', false, false],
    ['Disparo Automático', 'Autofire', 'REF', 'Armas à distância', true, false],
    ['Armas de uma Mão', 'Handgun', 'REF', 'Armas à distância', false, false],
    ['Armas Pesadas', 'Heavy Weapons', 'REF', 'Armas à distância', true, false],
    ['Armas de Ombro', 'Shoulder Arms', 'REF', 'Armas à distância', false, false],
    ['Subornar', 'Bribery', 'COOL', 'Sociais', false, false],
    ['Conversação', 'Conversation', 'EMP', 'Sociais', false, true],
    ['Percepção Humana', 'Human Perception', 'EMP', 'Sociais', false, true],
    ['Interrogatório', 'Interrogation', 'COOL', 'Sociais', false, false],
    ['Persuasão', 'Persuasion', 'COOL', 'Sociais', false, true],
    ['Cuidados Pessoais', 'Personal Grooming', 'COOL', 'Sociais', false, false],
    ['Malandragem', 'Streetwise', 'COOL', 'Sociais', false, false],
    ['Negociação', 'Trading', 'COOL', 'Sociais', false, false],
    ['Guarda-roupa e Estilo', 'Wardrobe & Style', 'COOL', 'Sociais', false, false],
    ['Tecnologia de Aeronaves', 'Air Vehicle Tech', 'TECH', 'Técnicas', false, false],
    ['Tecnologia Básica', 'Basic Tech', 'TECH', 'Técnicas', false, false],
    ['Cybertecnologia', 'Cybertech', 'TECH', 'Técnicas', false, false],
    ['Demolições', 'Demolitions', 'TECH', 'Técnicas', true, false],
    ['Tecnologia Eletrônica/Segurança', 'Electronics/Security Tech', 'TECH', 'Técnicas', true, false],
    ['Primeiros Socorros', 'First Aid', 'TECH', 'Técnicas', false, true],
    ['Falsificação', 'Forgery', 'TECH', 'Técnicas', false, false],
    ['Tecnologia de Veículos Terrestres', 'Land Vehicle Tech', 'TECH', 'Técnicas', false, false],
    ['Pintura/Desenho/Escultura', 'Paint/Draw/Sculpt', 'TECH', 'Técnicas', false, false],
    ['Paramédico', 'Paramedic', 'TECH', 'Técnicas', true, false],
    ['Fotografia/Filme', 'Photography/Film', 'TECH', 'Técnicas', false, false],
    ['Arrombamento', 'Pick Lock', 'TECH', 'Técnicas', false, false],
    ['Bater Carteira', 'Pick Pocket', 'TECH', 'Técnicas', false, false],
    ['Tecnologia de Veículos Marítimos', 'Sea Vehicle Tech', 'TECH', 'Técnicas', false, false],
    ['Tecnologia de Armas', 'Weaponstech', 'TECH', 'Técnicas', false, false]
  ];

  // ---------- Tabelas reaproveitadas em mais de uma página ----------

  const dvScale = table(['DV', 'Dificuldade', 'Leitura rápida'], [
    ['9', 'Simples', 'Quase todo mundo faz sem pensar.'],
    ['13', 'Comum', 'A maioria faz sem treinamento especial.'],
    ['15', 'Difícil', 'Complicado sem treinamento ou talento.'],
    ['17', 'Profissional', 'Exige treinamento real.'],
    ['21', 'Heroico', 'Só os melhores dos melhores.'],
    ['24', 'Incrível', 'Entre os melhores da profissão.'],
    ['29', 'Lendário', 'Um feito de que se fala por anos.']
  ], 'dense');

  const woundTable = table(['Estado', 'Quando', 'Efeito', 'Estabilizar'], [
    ['Levemente Ferido', 'Abaixo do HP total', 'Nenhum', 'DV10'],
    ['Gravemente Ferido ' + en('Seriously Wounded'), 'Abaixo de metade do HP (arred. p/ cima)', '−2 em todas as ações', 'DV13'],
    ['Mortalmente Ferido ' + en('Mortally Wounded'), 'Abaixo de 1 HP', '−4 em todas as ações; −6 MOVE (mín. 1); Death Save no início de cada turno; toda vez que sofrer dano de ataque, sofre também uma lesão crítica', 'DV15: volta a 1 HP e fica inconsciente por 1 minuto'],
    ['Morto', 'Falhou um Death Save', 'Não volta mais', '—']
  ], 'dense');

  const deathSave = `<ol><li>No início de cada turno Mortalmente Ferido, role <b>1d10 + penalidade acumulada</b>.</li><li>Resultado <b>menor que o BODY</b> (o Death Save): vive e joga o turno normalmente. Um <b>10 natural sempre falha</b>.</li><li>Cada Death Save rolado soma +1 aos próximos, até alguém estabilizar o personagem de volta a 1 HP (aí volta ao Death Save base).</li><li>Algumas lesões críticas aumentam o Death Save base em +1 de forma permanente até serem tratadas.</li><li><b>Falhou uma vez, morreu.</b></li></ol><div class="callout"><b>Erro de tradução no PDF:</b> a p. 222 diz que você vive se rolar "acima do BODY". O próprio texto diz que um 10 sempre falha, o que só faz sentido rolando <b>abaixo</b>; é também o que diz a p. 188. Use "abaixo".</div>`;

  const coverTable = table(['Material', 'Estrutura grossa', 'Estrutura fina'], [
    ['Aço', '50 HP', '25 HP'],
    ['Pedra', '40 HP', '20 HP'],
    ['Vidro blindado', '30 HP', '15 HP'],
    ['Concreto', '25 HP', '10 HP'],
    ['Madeira', '20 HP', '5 HP'],
    ['Gesso, espuma, plástico', '15 HP', '0 HP (não é cobertura)']
  ], 'dense');

  const rangeTable = `<div class="table-wrap dense range-table"><table><thead><tr><th>Arma</th>${rangeBands.map(band => `<th>${band}</th>`).join('')}</tr></thead><tbody>${rangeDV.map(weapon => `<tr><td>${weapon.name}</td>${weapon.dv.map(dv => `<td class="num">${dv === null ? '—' : dv}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const autofireTable = `<div class="table-wrap dense"><table><thead><tr><th>Autofogo</th>${rangeBands.slice(0, 5).map(band => `<th>${band}</th>`).join('')}<th>Multiplicador máx.</th></tr></thead><tbody><tr><td>SMG / SMG pesada</td>${rangeDV[1].autofire.map(dv => `<td class="num">${dv}</td>`).join('')}<td class="num">×3</td></tr><tr><td>Rifle de assalto</td>${rangeDV[3].autofire.map(dv => `<td class="num">${dv}</td>`).join('')}<td class="num">×4</td></tr></tbody></table></div>`;

  const brawlTable = table(['BODY', 'Dano de Briga / Artes Marciais'], [
    ['4 ou menos', '1d6'],
    ['5 a 6 (ou 4 ou menos com Cyberbraço)', '2d6'],
    ['7 a 10', '3d6'],
    ['11 ou mais', '4d6']
  ], 'dense');

  const critTable = rows => table(['2d6', 'Lesão', 'Efeito', 'Correção rápida', 'Tratamento'], rows.map(([roll, name, effect, quick, treatment]) => [`<b>${roll}</b>`, name, effect, quick, treatment]), 'dense');

  const skillsTable = `<div class="skill-tools"><div class="map-filter-list" id="skill-stat-filter">${['Todas', 'INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'EMP'].map((stat, index) => `<button type="button" class="map-filter" data-skill-stat="${index ? stat : 'all'}" aria-pressed="${index === 0}">${stat}</button>`).join('')}</div><label class="skill-search"><span class="nav-label">Filtrar</span><input id="skill-filter" type="search" placeholder="Nome em português ou inglês" autocomplete="off"></label></div><div class="table-wrap dense"><table id="skill-table"><thead><tr><th>Perícia</th><th>STAT</th><th>Grupo</th><th>Observação</th></tr></thead><tbody>${skills.map(([name, english, stat, group, double, basic]) => `<tr data-stat="${stat}"><td><b>${name}</b> ${en(english)}</td><td class="num">${stat}</td><td>${group}</td><td>${[double ? 'custa x2' : '', basic ? 'básica (mín. 2)' : ''].filter(Boolean).join(' · ') || '—'}</td></tr>`).join('')}</tbody></table></div>`;

  // ---------- Avanço (p. 408–411) ----------

  const ipCostTable = table(['Nível ou Rank', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], [
    ['<b>Perícia</b>', ...Array.from({ length: 10 }, (_, index) => `${20 * (index + 1)}`)],
    ['<b>Perícia difícil (×2)</b>', ...Array.from({ length: 10 }, (_, index) => `${40 * (index + 1)}`)],
    ['<b>Rank de Role</b>', ...Array.from({ length: 10 }, (_, index) => `${60 * (index + 1)}`)]
  ], 'dense');

  const ipEarnTable = table(['IP', 'Grupo', 'Guerreiro', 'Socializador', 'Explorador', 'Intérprete'], [
    ['10', 'Não cumpriu a missão, mas tentou com bravura.', 'Usou perícias de combate com frequência, mesmo sem efeito excepcional.', 'Apoiou e ajudou a equipe, dentro ou fora do jogo.', 'Tentou investigar ou explorar o mundo com frequência, mesmo sem efeito excepcional.', 'Tentou interpretar o personagem com frequência.'],
    ['20', 'Mal cumpriu os objetivos da missão.', 'Usou combate com frequência e eficácia, muitas vezes derrubando oponentes importantes.', 'O apoio ajudou a manter o grupo unido (lista de frases, caderno da campanha etc.).', 'Usou a exploração com eficácia para entender o mundo ou a situação.', 'Ficou no personagem o tempo todo, muitas vezes com eficácia.'],
    ['30', 'Trabalhou bem em conjunto e cumpriu a maioria dos objetivos; todos participaram.', 'Uso frequente e eficaz do combate, derrotando os oponentes mais perigosos de uma luta.', 'Apoio frequente e eficaz que manteve o grupo unido (retratos dos personagens, diários extensos etc.).', 'Exploração e investigação frequentes e eficazes, que avançaram objetivos pessoais e do grupo.', 'Interpretação frequente e eficaz para cumprir um objetivo (atuado, não rolado).'],
    ['40', 'Cumpriu bem a maioria dos objetivos, com forte cooperação.', 'Fez algo fora do comum em combate, derrotando um oponente de um jeito inesperado ou incomum.', 'Fez algo fora do comum que animou ou ajudou o grupo (diários extensos, eventos especiais).', 'Descobriu algo fora do comum ou excepcional explorando e investigando.', 'Fez algo fora do comum interpretando (um discurso esperto, uma interação marcante).'],
    ['50', 'Cumpriu a maioria dos objetivos extremamente bem, com alguns momentos brilhantes.', 'Uso muito eficaz ou esperto do combate, derrotando vários oponentes de jeitos inesperados.', 'Fez algo muito eficaz ou esperto que animou ou ajudou o grupo.', 'Investigação muito eficaz ou esperta que revelou uma pessoa, lugar, pista ou coisa importante.', 'Interpretação muito eficaz ou esperta (interação inteligente, momento importante).'],
    ['60', 'Sucesso forte: todos os objetivos, com vários momentos brilhantes.', 'O combate foi crucial para o personagem: derrotou sozinho um oponente importante ou um nêmesis.', 'O apoio foi parte muito importante do grupo trabalhar junto e cumprir os objetivos.', 'A investigação revelou uma pessoa, lugar, pista ou coisa crucial para o personagem.', 'A interpretação foi crucial para o personagem (mudou o rumo pessoal da sessão).'],
    ['70', 'Sucesso retumbante: todos os objetivos e vários secundários, com forte trabalho em equipe.', 'O combate foi crucial para o grupo inteiro: sem ele, o grupo teria sido derrotado.', 'O apoio foi parte crucial do grupo trabalhar junto e cumprir os objetivos.', 'A investigação revelou algo crucial para o grupo inteiro.', 'A interpretação foi crucial para o grupo inteiro (mudou o rumo da sessão).'],
    ['80', 'Lendário: todos os objetivos e todos os secundários, com cooperação excepcional.', 'Algo realmente incrível em combate: derrubou de um tiro só, venceu um inimigo impossível ou um nêmesis, salvou o grupo.', 'Algo realmente incrível para o grupo trabalhar junto e cumprir os objetivos.', 'A investigação descobriu algo realmente incrível nesta sessão.', 'Algo realmente incrível interpretando: discurso heroico, momento de estrela, influência enorme no resultado.']
  ].map(([ip, ...cells]) => [`<b>${ip}</b>`, ...cells]), 'dense');

  // Questionário de estilo de jogo (p. 409): marque as 5 coisas mais importantes ao jogar.
  const playstyles = {
    Guerreiro: ['Derrotar um inimigo em combate.', 'Ganhar uma ferramenta ou arma poderosa.', 'Provar sua perícia em combate.', 'A emoção da caçada.', 'Montar o personagem ou a ferramenta mais poderosa.', 'Estabelecer uma fortaleza.', 'Ter um nêmesis para vencer.'],
    Explorador: ['Encontrar um lugar novo no mapa.', 'Conhecer alguém novo no mundo.', 'Resolver um enigma difícil.', 'Aprender sobre o mundo e sua história.', 'Estabelecer um lugar ou uma aliança.', 'Contribuir para a história do mundo.'],
    Socializador: ['Relembrar um momento favorito do jogo.', 'Contar a outras pessoas sobre os jogos de que participa.', 'Contribuir para o sucesso do grupo.', 'Juntar-se a outros para vencer um desafio.', 'Fazer amigos fora do jogo.', 'Fazer parte do grupo.'],
    Intérprete: ['Ter uma imagem do seu personagem.', 'Escrever o histórico do personagem.', 'Criar uma família estendida em volta do personagem.', 'Saber dos pets, das coisas favoritas, dos amigos e dos inimigos do personagem.', 'Interpretar o sotaque e os trejeitos do personagem.']
  };
  const playstyleQuiz = `<div class="playstyle-quiz">${Object.entries(playstyles).map(([style, items]) => `<fieldset><legend>${style}</legend>${items.map(item => `<label><input type="checkbox" data-style="${style}"> ${item}</label>`).join('')}</fieldset>`).join('')}</div><p class="note-status" id="playstyle-result">Marque as 5 coisas que você acha mais importantes ao jogar.</p>`;

  function setupAdvancement(content) {
    const result = content.querySelector('#playstyle-result');
    if (!result) return;
    content.querySelector('.playstyle-quiz').addEventListener('change', () => {
      const marked = [...content.querySelectorAll('.playstyle-quiz input:checked')];
      const counts = {};
      marked.forEach(input => { counts[input.dataset.style] = (counts[input.dataset.style] || 0) + 1; });
      const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (!marked.length) { result.textContent = 'Marque as 5 coisas que você acha mais importantes ao jogar.'; return; }
      const [first, second] = ranking;
      const tie = second && second[1] === first[1] ? ' (empate: o jogador escolhe a ordem)' : '';
      result.innerHTML = `${marked.length} de 5 marcadas${marked.length > 5 ? ' — <b>desmarque até ficar com 5</b>' : ''}. Principal: <b>${first[0]}</b> (${first[1]})${second ? ` · secundário: <b>${second[0]}</b> (${second[1]})` : ''}${tie}.`;
    });
  }

  // ---------- Lifepath (p. 44–52) ----------
  // Cada tabela: [id, título, ref, cabeçalhos, itens]; um item é texto ou [texto, detalhe].

  const lifepathTables = [
    ['origem', 'Origem cultural', '45', ['1d10', 'Região', 'Línguas (escolha uma: você começa com ela no nível 4)'], [
      ['América do Norte', 'chinês, cree, crioulo, inglês, francês, navajo, espanhol'],
      ['América do Sul e Central', 'crioulo, inglês, alemão, guarani, maia, português, quéchua, espanhol'],
      ['Europa Ocidental', 'holandês, inglês, francês, alemão, italiano, norueguês, português, espanhol'],
      ['Europa Oriental', 'inglês, finlandês, polonês, romeno, russo, ucraniano'],
      ['Oriente Médio e Norte da África', 'árabe, berbere, inglês, farsi, francês, hebraico, turco'],
      ['África Subsaariana', 'árabe, inglês, francês, hauçá, lingala, oromo, português, suaíli, twi, iorubá'],
      ['Sul da Ásia', 'bengali, dari, inglês, hindi, nepali, cingalês, tâmil, urdu'],
      ['Sudeste Asiático', 'árabe, birmanês, inglês, filipino, hindi, indonésio, khmer, malaio, vietnamita'],
      ['Leste Asiático', 'chinês cantonês, inglês, japonês, coreano, chinês mandarim, mongol'],
      ['Oceania e Ilhas do Pacífico', 'inglês, francês, havaiano, maori, pama-nyungan, taitiano']
    ]],
    ['personalidade', 'Personalidade', '46', ['1d10', 'Como você é'], ['Tímido e reservado.', 'Rebelde, antissocial e violento.', 'Arrogante, orgulhoso e indiferente.', 'Mal-humorado, imprudente e teimoso.', 'Implicante, exigente e nervoso.', 'Estável e sério.', 'Bobo e distraído.', 'Sorrateiro e enganador.', 'Intelectual e fechado.', 'Amigável e extrovertido.']],
    ['roupa', 'Estilo de roupa', '47', ['1d10', 'Estilo'], ['Genérico Chic (padrão, colorido, modular).', 'Roupa de lazer (conforto, agilidade, atletismo).', 'Flash urbano (chamativo, tecnológico, streetwear).', 'Roupa de negócios (liderança, presença, autoridade).', 'Alta moda (exclusivo, de grife, couture).', 'Boêmio (folk, retrô, espírito livre).', 'Bag Lady Chic (sem-teto, esfarrapado, de rua).', 'Cores de gangue (perigoso, violento, rebelde).', 'Couro nômade (do oeste, rústico, tribal).', 'Asia Pop (brilhante, fantasiado, jovem).']],
    ['cabelo', 'Penteado', '47', ['1d10', 'Penteado'], ['Moicano.', 'Longo e bagunçado.', 'Curto e espetado.', 'Selvagem e espalhado.', 'Careca.', 'Listrado.', 'Cores selvagens.', 'Curto e arrumado.', 'Curto e cacheado.', 'Longo e liso.']],
    ['adorno', 'Adorno que você sempre usa', '47', ['1d10', 'Adorno'], ['Tatuagens.', 'Óculos espelhados.', 'Cicatrizes rituais.', 'Luvas com espetos.', 'Argolas no nariz.', 'Piercing na língua ou em outro lugar.', 'Implantes de unha estranhos.', 'Botas com espetos ou saltos.', 'Luvas sem dedos.', 'Lentes de contato estranhas.']],
    ['valor', 'O que você mais valoriza', '48', ['1d10', 'Valor'], ['Dinheiro.', 'Honra.', 'Sua palavra.', 'Honestidade.', 'Conhecimento.', 'Vingança.', 'Amor.', 'Poder.', 'Família.', 'Amizade.']],
    ['pessoas', 'O que você sente pelas pessoas', '48', ['1d10', 'Sentimento'], ['Neutro.', 'Neutro.', 'Gosta de quase todo mundo.', 'Odeia quase todo mundo.', 'Pessoas são ferramentas: use-as para seus fins e descarte.', 'Cada pessoa é um indivíduo valioso.', 'Pessoas são obstáculos a destruir se ficarem no caminho.', 'Pessoas não são confiáveis: não dependa de ninguém.', 'Limpe tudo e deixe as baratas assumirem.', 'As pessoas são maravilhosas.']],
    ['pessoa', 'A pessoa mais valiosa da sua vida', '48', ['1d10', 'Pessoa'], ['Um dos pais.', 'Um irmão ou irmã.', 'Um amor.', 'Um amigo.', 'Você mesmo.', 'Um pet.', 'Professor ou mentor.', 'Uma figura pública.', 'Um herói pessoal.', 'Ninguém.']],
    ['posse', 'A posse mais valiosa', '48', ['1d10', 'Posse'], ['Uma arma.', 'Uma ferramenta.', 'Uma peça de roupa.', 'Uma fotografia.', 'Um livro ou diário.', 'Uma gravação.', 'Um instrumento musical.', 'Uma joia.', 'Um brinquedo.', 'Uma carta.']],
    ['familia', 'Família original', '49', ['1d10', 'Família', 'Como era'], [
      ['Execs corporativos', 'Ricos e poderosos, com empregados, casas de luxo e o melhor de tudo. Segurança particular garantia que você estivesse sempre seguro. Escola particular de grife.'],
      ['Gerentes corporativos', 'Bem de vida: casas grandes, bairros seguros, bons carros. Às vezes, empregados. Ensino particular e corporativo.'],
      ['Técnicos corporativos', 'Classe média: conapts confortáveis ou casas de subúrbio, minivans e escolas técnicas da corporação. Os anos 1950 misturados com <i>1984</i>.'],
      ['Bando nômade', 'Trailers, veículos e kombis como casa. Aprendeu cedo a dirigir e lutar, mas a família sempre cuidou de você. Comida fresca e farta; ensino em casa.'],
      ['"Família" de gangue', 'Um lar selvagem e violento, onde quer que a gangue se instalasse. Fome, frio e medo; talvez nem soubesse quem eram seus pais. A gangue ensinou a lutar, matar e roubar.'],
      ['Zoners de combate', 'Um degrau acima da gangue: um prédio decadente e fortificado na Zona. Fome às vezes, mas cama e refeição com regularidade. Ensino em casa.'],
      ['Sem-teto urbanos', 'Carros, caçambas ou contêineres abandonados, com sorte. Fome, frio e medo, a menos que fosse duro o bastante para brigar pelos restos. A escola da vida.'],
      ['Megaestrutura cheia de ratos', 'Uma das megaestruturas erguidas depois da Guerra: conapt pequeno, ração e scop, cama quente. Talvez uma escola dos moradores ou de uma corp local.'],
      ['Reclaimers', 'Começou na estrada e depois foi reconstruir uma cidade fantasma. Vida de pioneiro: perigosa, mas com comida simples e lugar seguro para dormir.'],
      ['Edgerunners', 'A casa mudava com o "trabalho atual" dos pais: apartamento de luxo, conapt urbano ou uma caçamba, se estivessem fugindo. Comida de gourmet a ração.']
    ]],
    ['infancia', 'Ambiente de infância', '50', ['1d10', 'Onde você cresceu'], ['Na rua, sem supervisão de adultos.', 'Numa zona segura, protegida do resto da cidade.', 'Num grupo nômade em movimento entre cidades.', 'Num grupo nômade de raízes no transporte (navios, aviões, caravanas).', 'Num bairro decadente que já foi de alto nível, agora resistindo aos boosters para sobreviver.', 'No coração da Zona de Combate, num prédio destruído ou numa ocupação.', 'Numa megaestrutura enorme controlada por uma corp ou pela cidade.', 'Nas ruínas de uma cidade abandonada, tomada por reclaimers.', 'Numa nação à deriva: uma cidade flutuante perto da costa, ponto de encontro de todo tipo de gente.', 'Num arranha-céu de luxo corporativo, acima do resto da cidade.']],
    ['crise', 'Crise familiar', '50', ['1d10', 'O que aconteceu'], ['A família perdeu tudo por traição.', 'A família perdeu tudo por má gestão.', 'A família foi exilada ou expulsa da casa, nação ou corporação.', 'A família foi presa, e só você escapou.', 'A família desapareceu. Você é o único que restou.', 'A família foi morta, e você foi o único sobrevivente.', 'A família está envolvida numa conspiração de longo prazo, organização ou associação, como uma família do crime ou um grupo revolucionário.', 'A família se espalhou pelos ventos, por causa de uma desgraça.', 'A família carrega uma rixa hereditária que dura gerações.', 'Você herdou uma dívida da família: precisa pagá-la antes de seguir com a vida.']],
    ['amigo', 'Amigos', '51', ['1d10', 'Quem é o amigo'], ['Como um irmão mais velho para você.', 'Como um irmão mais novo para você.', 'Um professor ou mentor.', 'Um parceiro ou colega de trabalho.', 'Um ex-amante.', 'Um velho inimigo.', 'Como alguém da família para você.', 'Um velho amigo de infância.', 'Alguém que você conheceu na rua.', 'Alguém com um interesse ou objetivo em comum.']],
    ['inimigo-quem', 'Inimigo: quem é', '51', ['1d10', 'Quem'], ['Ex-amigo.', 'Ex-amante.', 'Parente afastado.', 'Inimigo de infância.', 'Alguém que trabalha para você.', 'Alguém para quem você trabalha.', 'Parceiro ou colega de trabalho.', 'Exec corporativo.', 'Funcionário do governo.', 'Boosterganger.']],
    ['inimigo-causa', 'Inimigo: o que causou', '51', ['1d10', 'Causa (decida quem foi o injustiçado)'], ['Um fez o outro perder a pose ou o status.', 'Um causou a perda de um amante, amigo ou parente.', 'Um causou uma grande humilhação pública.', 'Um acusou o outro de covardia ou de outra grande falha pessoal.', 'Um desertou ou traiu o outro.', 'Um recusou uma oferta de emprego ou um envolvimento romântico.', 'Vocês simplesmente não se gostam.', 'Um era rival do outro num romance.', 'Um era rival do outro nos negócios.', 'Um incriminou o outro por um crime que não cometeu.']],
    ['inimigo-recursos', 'Inimigo: o que pode usar contra você', '51', ['1d10', 'Recursos'], ['Só ele mesmo, e não vai sair do caminho por isso.', 'Só ele mesmo.', 'Ele e um amigo próximo.', 'Ele e alguns amigos (1d6 ÷ 2).', 'Ele e alguns amigos (1d10 ÷ 2).', 'Uma gangue inteira (pelo menos 1d10 + 5 pessoas).', 'A polícia local ou outros agentes da lei.', 'Um chefe de gangue poderoso ou uma corporação pequena.', 'Uma corporação poderosa.', 'Uma cidade, governo ou agência inteira.']]
  ];
  // Vingança e amor trágico usam faixas ou ficam fora do formato de 1 a 10 sem repetição.
  const revengeRows = [[1, 2, 'Evitar a escória.'], [3, 4, 'Entrar numa fúria assassina e tentar arrancar a cara do outro.'], [5, 6, 'Prejudicá-lo indiretamente, pelas costas.'], [7, 8, 'Atacá-lo com palavras.'], [9, 9, 'Incriminá-lo por um crime ou transgressão que não cometeu.'], [10, 10, 'Matá-lo ou mutilá-lo.']];
  const loveRows = ['Seu amor morreu num acidente.', 'Seu amor desapareceu misteriosamente.', 'Simplesmente não deu certo.', 'Um objetivo pessoal ou uma vingança ficou entre vocês.', 'Seu amor foi sequestrado.', 'Seu amor enlouqueceu ou virou ciberpsicótico.', 'Seu amor se matou.', 'Seu amor foi morto numa luta.', 'Um rival tirou você da jogada.', 'Seu amor está preso ou exilado.'];
  const goalRows = ['Livrar-se de uma má reputação.', 'Ganhar poder e controle.', 'Sair da rua, custe o que custar.', 'Causar dor e sofrimento a quem cruzar seu caminho.', 'Deixar a vida passada para trás e tentar esquecê-la.', 'Caçar os responsáveis pela sua vida miserável.', 'Pegar o que é seu por direito.', 'Salvar, se possível, alguém do seu passado, como um amor ou alguém da família.', 'Fama e reconhecimento.', 'Ser temido e respeitado.'];

  const asRows = items => items.map((item, index) => [index + 1, index + 1, Array.isArray(item) ? `<b>${item[0]}</b> — ${item[1]}` : item]);
  const rollTables = {};
  lifepathTables.forEach(([id, , , , items]) => { rollTables[`lp-${id}`] = { dado: '1d10', linhas: asRows(items) }; });
  rollTables['lp-vinganca'] = { dado: '1d10', linhas: revengeRows };
  rollTables['lp-amor'] = { dado: '1d10', linhas: asRows(loveRows) };
  rollTables['lp-meta'] = { dado: '1d10', linhas: asRows(goalRows) };

  const rollButtons = buttons => `<div class="roll-buttons">${buttons.join('')}</div>`;
  const rollButton = (id, label = 'Rolar 1d10') => `<button class="action" data-roll="${id}" type="button">${label}</button>`;
  const lifepathButton = (kind, label) => `<button class="action" data-lifepath="${kind}" type="button">${label}</button>`;
  const lifepathTable = ([, , , headers, items]) => table(headers, items.map((item, index) => [`<b>${index + 1}</b>`, ...(Array.isArray(item) ? [`<b>${item[0]}</b>`, item[1]] : [item])]), 'dense');
  const lifepathSection = (id, extra = '') => {
    const entry = lifepathTables.find(item => item[0] === id);
    return section(entry[1], entry[2], `${extra}${lifepathTable(entry)}${rollButtons([rollButton(`lp-${id}`)])}`);
  };

  function setupLifepath(content, { rollTable, rollDice, showRoll }) {
    const pick = id => rollTable(id).html;
    const howMany = () => { const die = rollDice('1d10'); return { die, count: Math.max(0, die - 7) }; };
    const numbered = (count, make) => `<ol>${Array.from({ length: count }, () => `<li>${make()}</li>`).join('')}</ol>`;
    const enemy = () => `<b>${pick('lp-inimigo-quem')}</b> ${pick('lp-inimigo-causa')} Pode usar contra você: ${pick('lp-inimigo-recursos').toLowerCase()} Se vocês se encontrarem: ${pick('lp-vinganca').toLowerCase()}`;
    const group = (singular, plural, none, make) => {
      const { die, count } = howMany();
      return `<span class="roll-value">1d10 = ${die} − 7</span> <b>${count ? `${count} ${count === 1 ? singular : plural}` : none}</b>${count ? numbered(count, make) : ''}`;
    };
    const rolls = {
      amigos: () => group('amigo', 'amigos', 'Nenhum amigo, por enquanto.', () => pick('lp-amigo')),
      inimigos: () => group('inimigo', 'inimigos', 'Nenhum inimigo, por enquanto.', enemy),
      inimigo: () => enemy(),
      amores: () => group('amor trágico', 'amores trágicos', 'Nenhum amor trágico, por enquanto.', () => pick('lp-amor')),
      tudo: () => {
        const line = (label, html) => `<li><b>${label}:</b> ${html}</li>`;
        const counted = (label, make) => { const { count } = howMany(); return line(`${label} (${count})`, count ? numbered(count, make) : 'nenhum.'); };
        return `<ul>${[
          line('Origem cultural', pick('lp-origem')),
          line('Personalidade', pick('lp-personalidade')),
          line('Estilo de roupa', pick('lp-roupa')),
          line('Penteado', pick('lp-cabelo')),
          line('Adorno', pick('lp-adorno')),
          line('Mais valoriza', pick('lp-valor')),
          line('Sente pelas pessoas', pick('lp-pessoas')),
          line('Pessoa mais valiosa', pick('lp-pessoa')),
          line('Posse mais valiosa', pick('lp-posse')),
          line('Família original', pick('lp-familia')),
          line('Infância', pick('lp-infancia')),
          line('Crise familiar', pick('lp-crise')),
          counted('Amigos', () => pick('lp-amigo')),
          counted('Inimigos', enemy),
          counted('Amores trágicos', () => pick('lp-amor')),
          line('Meta de vida', pick('lp-meta'))
        ].join('')}</ul>`;
      }
    };
    content.querySelectorAll('[data-lifepath]').forEach(button => button.addEventListener('click', () => showRoll(button, rolls[button.dataset.lifepath]())));
  }

  // ---------- Night Market (p. 337–339) ----------

  const nightMarketCategories = ['Comida e drogas', 'Eletrônica pessoal', 'Armas e blindagens', 'Cyberware', 'Roupas e fashionware', 'Equipamento de sobrevivência'];
  const nightMarketRows = [
    ['Comida enlatada (10eb)', 'Agent (100eb)', 'Pistola média (50eb)', 'Cyberolho (100eb)', 'Bag Lady Chic', 'Máscara anti-fumaça (20eb)'],
    ['Comida embalada (10eb)', 'Programa ou hardware de cyberdeck de até 100eb', 'Pistola pesada ou muito pesada (100eb)', 'Cyberaudio (500eb)', 'Cores de gangue', 'Protetores auriculares (1.000eb)'],
    ['Comida congelada (10eb)', 'Gravador de áudio (100eb)', 'SMG (100eb)', 'Neural Link (500eb)', 'Genérico Chic', 'Binóculos (50eb)'],
    ['Grãos a granel (20eb)', 'Detector de escutas (500eb)', 'SMG pesada (100eb)', 'Cyberbraço (500eb)', 'Boêmio', 'Carryall (20eb)'],
    ['Prepak genérico, o antigo Kibble (10eb)', 'Analisador químico (1.000eb)', 'Espingarda (500eb)', 'Cyberperna (100eb)', 'Roupa de lazer', 'Lanterna (20eb)'],
    ['Bolsas de Prepak (20eb)', 'Computador (50eb)', 'Rifle de assalto (500eb)', 'Cyberware externo de exatamente 1.000eb', 'Couro nômade', 'Fita adesiva (20eb)'],
    ['Drogas de rua de até 20eb', 'Cyberdeck (500eb)', 'Rifle de precisão (500eb)', 'Cyberware externo de até 500eb', 'Asia Pop', 'Cama inflável e saco de dormir (20eb)'],
    ['Álcool ruim (10eb)', 'Celular descartável (50eb)', 'Arco ou besta (100eb)', 'Cyberware interno de exatamente 1.000eb', 'Flash urbano', 'Kit de arrombamento (20eb)'],
    ['Álcool (20eb)', 'Guitarra ou outro instrumento (500eb)', 'Lança-granadas ou lança-mísseis (500eb)', 'Cyberware interno de até 500eb', 'Roupa de negócios', 'Algemas (50eb)'],
    ['Álcool excelente (100eb)', 'Programa ou hardware de cyberdeck de exatamente 500eb', 'Munição de até 500eb', 'Opção de cyberolho de exatamente 1.000eb', 'Alta moda', 'Bolsa Medtech (100eb)'],
    ['MRE (10eb)', 'Medscanner (1.000eb)', 'Uma arma exótica à escolha do mestre', 'Opção de cyberolho de até 500eb', 'Biomonitor (100eb)', 'Barraca e equipamento de camping (50eb)'],
    ['Frango vivo (50eb)', 'Rastreador (500eb)', 'Arma branca leve (50eb)', 'Opção de cyberaudio de exatamente 1.000eb', 'Pele química (100eb)', 'Corda, 60 m (20eb)'],
    ['Peixe vivo (50eb)', 'Rádio comunicador (100eb)', 'Arma branca média (50eb)', 'Opção de cyberaudio de até 500eb', 'Fio EMP (10eb)', 'Techferramenta (100eb)'],
    ['Frutas frescas (50eb)', 'Techscanner (1.000eb)', 'Arma branca pesada (100eb)', 'Neuralware de exatamente 1.000eb', 'Tatuagem luminosa (100eb)', 'Kit de higiene pessoal (20eb)'],
    ['Legumes frescos (50eb)', 'Óculos inteligentes (500eb)', 'Arma branca muito pesada (100eb)', 'Neuralware de até 500eb', 'Lentes de cor (100eb)', 'Roupa antirradiação (1.000eb)'],
    ['Raízes e tubérculos (20eb)', 'Detector de radar (500eb)', 'Blindagem de até 100eb', 'Opção de cybermembro de exatamente 1.000eb', 'Relógio de pele (100eb)', 'Sinalizador de estrada (10eb)'],
    ['Porco vivo (100eb)', 'Embaralhador (500eb)', 'Blindagem de exatamente 500eb', 'Opção de cybermembro de até 500eb', 'Techhair (100eb)', 'Arma de gancho (100eb)'],
    ['Frutas exóticas (100eb)', 'Rádio scanner ou tocador de música (50eb)', 'Blindagem de exatamente 1.000eb', 'Fashionware à escolha do mestre', 'Genérico Chic', 'Bolsa Tech (500eb)'],
    ['Legumes exóticos (100eb)', 'Visualizador de braindance (1.000eb)', 'Acessório de arma de até 100eb', 'Borgware à escolha do mestre', 'Roupa de lazer', 'Pá ou machado (50eb)'],
    ['Drogas de rua de exatamente 50eb', 'Óculos de realidade virtual (100eb)', 'Acessório de arma de 500eb ou mais', 'Qualquer cyberware à escolha do mestre', 'Cores de gangue', 'Airhypo (50eb)']
  ];
  const nightMarketTable = table(['d100', ...nightMarketCategories], nightMarketRows.map((row, index) => [`<b>${String(index * 5 + 1).padStart(2, '0')}–${index === 19 ? '00' : String(index * 5 + 5).padStart(2, '0')}</b>`, ...row]), 'dense');
  const nightMarketNotes = { 4: 'O cyberware de base que o item exigir também está à venda, e o seu ripperdoc instala de graça.', 5: 'O fashionware é instalado ali mesmo, no mercado.' };

  function setupNightMarket(content, { rollDice, showRoll }) {
    const button = content.querySelector('[data-night-market]');
    if (!button) return;
    button.addEventListener('click', () => {
      const first = rollDice('1d6');
      let second = rollDice('1d6');
      while (second === first) second = rollDice('1d6');
      const parts = [first, second].map(category => {
        const quantity = rollDice('1d10');
        const seen = new Set();
        const items = [];
        while (items.length < quantity) {
          const roll = rollDice('d100');
          const row = Math.ceil(roll / 5) - 1;
          if (seen.has(row)) continue;
          seen.add(row);
          items.push(`<li><small>${roll === 100 ? '00' : roll}</small> ${nightMarketRows[row][category - 1]}</li>`);
        }
        const note = nightMarketNotes[category] ? `<br><small>${nightMarketNotes[category]}</small>` : '';
        return `<p><span class="roll-value">1d6: ${category}</span> <b>${nightMarketCategories[category - 1]}</b>: ${quantity} ${quantity === 1 ? 'item' : 'itens'}${note}</p><ul>${items.join('')}</ul>`;
      });
      showRoll(button, parts.join(''));
    });
  }

  // ---------- Páginas ----------

  const pages = {
    screen: {
      eyebrow: 'Consulta rápida / na mesa', title: 'Escudo do mestre',
      lede: 'As regras que mais aparecem numa sessão, numa tela só. Aperte <b>/</b> para buscar em qualquer página; os chips abaixo pulam direto para cada quadro.',
      html: `<div class="quick-grid">
        ${section('Qual é a DV?', '173', `<div class="dv-finder"><label class="map-control">Arma<select id="dv-weapon">${rangeDV.map(weapon => `<option value="${weapon.id}">${weapon.name}</option>`).join('')}</select></label><label class="map-control">Distância (m)<input id="dv-distance" type="number" min="0" max="800" step="1" value="10" inputmode="numeric"></label></div><div id="dv-result" class="dv-result" aria-live="polite"></div><div id="dv-row"></div>`, 'quick-card wide')}
        ${section('Teste básico', '128–130', `${formula('STAT + Perícia + 1d10 &gt; DV')}${list(['Precisa <b>superar</b> a DV. Teste contra outra pessoa: empate = <b>defensor vence</b>.', '<b>10 natural:</b> +1d10 extra. <b>1 natural:</b> −1d10. Só uma vez; o dado extra não explode.', '<b>Sem a perícia:</b> STAT + 1d10.', '<b>LUCK:</b> antes de rolar, gaste pontos: +1 por ponto. Recarrega a cada sessão.', '<b>Complementar:</b> um bom teste relacionado dá +1 no próximo (não acumula).', '<b>Tempo extra:</b> levar 4× mais tempo dá +1.'])}`, 'quick-card')}
        ${section('Escala de DV', '129', dvScale, 'quick-card')}
        ${section('Seu turno', '168', `${formula('Iniciativa = REF + 1d10')}${list(['<b>1 Ação de Movimento</b> (MOVE × 2 metros) + <b>1 Ação</b>. Pode agir no meio do movimento.', '<b>Correr:</b> a Ação vira outra Ação de Movimento.', '<b>Grátis:</b> sacar arma de fácil acesso, largar arma, sair de veículo.', '<b>Custa Ação:</b> guardar arma, recarregar, equipar/soltar escudo, levantar-se, entrar em veículo.', 'Nunca mais de 2 ataques por Ação; armas de CDT 2 podem ser divididas ao longo do movimento.'])}`, 'quick-card')}
        ${section('Ataques', '172–176', `${formula('Distância: REF + perícia da arma + 1d10 &gt; DV do alcance')}${formula('Corpo a corpo: DEX + perícia + 1d10 vs DEX + Evasão + 1d10')}${list(['Alvo com <b>REF 8+</b> pode trocar a DV do alcance por DEX + Evasão + 1d10 (inclusive contra autofogo, espingarda e explosivos).', '<b>Tiro mirado (−8):</b> cabeça = dano que passa ×2; item na mão = larga; perna = Perna Quebrada se passar 1 de dano.', '<b>Armas brancas e artes marciais</b> ignoram metade do SP (arred. p/ cima). Briga não.', 'Corpo a corpo tem CDT 2 (dois ataques por Ação), exceto armas brancas muito pesadas. Alcance: 2 m.'])}`, 'quick-card')}
        ${section('Ferimentos', '186', woundTable, 'quick-card wide')}
        ${section('Death Save', '188', deathSave, 'quick-card')}
        ${section('Lesão crítica', '187', `<p>Quando <b>dois ou mais dados de dano</b> de um ataque caem <b>6</b>: role 2d6 na tabela (cabeça só em tiro mirado na cabeça). A lesão dá <b>+5 de dano direto no HP</b>, mesmo que o ataque não tenha passado da armadura.</p><div class="crit-roller"><button class="action" type="button" data-crit="body">Rolar corpo (2d6)</button> <button class="action" type="button" data-crit="head">Rolar cabeça (2d6)</button></div><div id="crit-result" class="crit-result" aria-live="polite"></div>`, 'quick-card')}
        ${section('Armadura', '186', `${list(['Dano − SP da armadura no local (corpo, a não ser tiro mirado na cabeça) = dano no HP.', 'Se passou qualquer dano, a armadura daquele local perde <b>1 SP</b> (ablação) até ser reparada.', 'SP não soma: vale o maior do local. A pior penalidade de armadura se aplica uma vez a REF, DEX e MOVE.'])}`, 'quick-card')}
        ${section('Cobertura', '182', `<p>Atrás de algo que para uma bala e fora da linha de visão = coberto. Não existe cobertura parcial. Cada trecho de 2 × 2 m tem HP; em 0 HP é destruído.</p>${coverTable}`, 'quick-card')}
        ${section('Autofogo e supressão', '173–174', `${list(['<b>Autofogo:</b> 1 Ação e 10 balas, perícia Disparo Automático, tabela própria. Dano: <b>2d6 × quanto passou da DV</b>, até ×3 (SMG) ou ×4 (rifle de assalto). Dois 6 = lesão crítica. Não pode mirar.', '<b>Fogo supressivo:</b> 1 Ação e 10 balas. Todo mundo a pé, até 25 m, fora de cobertura e à vista rola WILL + Concentração + 1d10 contra seu REF + Disparo Automático + 1d10. Quem falhar gasta a próxima Ação de Movimento indo para a cobertura.'])}`, 'quick-card')}
        ${section('Facedown', '194', `${formula('COOL + Reputação + 1d10')}<p>Empate: nada acontece. O perdedor escolhe <b>recuar</b> ou sofrer <b>−2 em ações contra esse oponente</b> até derrotá-lo uma vez.</p>`, 'quick-card')}
        ${section('Modificadores comuns', '130', table(['Condição', 'Mod.'], [['Noite ou pouca luz', '−1'], ['Nunca fez isso antes', '−1'], ['Tarefa complexa', '−2'], ['Sem as ferramentas certas', '−2'], ['Dormiu mal / sob tensão extrema', '−2'], ['Exausto / muito bêbado ou sedado', '−4'], ['Fazendo em segredo', '−4'], ['Fumaça, escuridão total', '−4']], 'dense'), 'quick-card')}
        ${section('Estabilizar e curar', '222', `${formula('TECH + Primeiros Socorros ou Paramédico + 1d10')}${list(['Custa 1 Ação. DV10 / 13 / 15 conforme o estado de ferimento.', 'Estabilizado, recupera <b>BODY em HP por dia</b> de descanso.', '<b>Correção rápida:</b> tira o efeito da lesão pelo resto do dia (1 minuto). <b>Tratamento:</b> tira de vez (4 horas, não pode ser em si mesmo).'])}`, 'quick-card')}
      </div>
      <div class="section" data-toc="Páginas completas"><h3>Páginas completas</h3><p>${button('combat', 'Combate')} ${button('damage', 'Dano e cura')} ${button('netrunning', 'Netrunning')} ${button('skills', 'Perícias')} ${button('humanity', 'Humanidade e drogas')}</p></div>`
    },

    skills: {
      eyebrow: 'Consulta rápida / perícias', title: 'Perícias por STAT',
      lede: 'Todas as 66 perícias do RED com a STAT que somam no teste. Filtre por STAT ou digite o nome, em português ou em inglês (útil quando a ficha do jogador está em inglês).',
      html: `${section('Lista de perícias', '81–85', `${skillsTable}<p class="note-status">"Custa x2": cada nível custa 2 pontos. "Básica": todo personagem começa com pelo menos 2.</p>`)}
        ${section('Sem a perícia', '130', '<p>Quem não tem a perícia rola só <b>STAT + 1d10</b>.</p>')}`
    },

    checks: {
      eyebrow: 'Cyberpunk RED / regras', title: 'Testes e dificuldades',
      lede: 'Descreva a ação primeiro; role só quando falhar muda alguma coisa. Tudo no RED se resume a STAT + perícia + 1d10 contra uma DV.',
      html: `${section('Teste de perícia', '128', `${formula('STAT + Perícia + 1d10 &gt; DV')}<p>O mestre escolhe a STAT e a perícia que representam a abordagem. É preciso <b>superar</b> a DV.</p>`)}
        ${section('Teste resistido', '128', `${formula('Atacante: STAT + Perícia + 1d10 vs Defensor: STAT + Perícia + 1d10')}<p>Quando outra pessoa resiste, o teste dela vira a DV. <b>Empate: o defensor vence.</b></p>`)}
        ${section('Escala de DV', '129', dvScale)}
        ${section('Críticos', '130', list(['<b>Sucesso crítico:</b> 10 natural → role mais 1d10 e some.', '<b>Falha crítica:</b> 1 natural → role mais 1d10 e subtraia.', 'A rolagem extra acontece <b>uma vez só</b>; um novo 10 (ou 1) não rola de novo.', 'Um personagem muito bom pode ter sucesso mesmo com falha crítica, e um adversário ainda pode vencer quem tirou crítico.']))}
        ${section('LUCK', '130', '<p>Antes de rolar, gaste pontos de LUCK: <b>+1 no teste por ponto</b>. Você tem pontos iguais à sua STAT LUCK, e eles recarregam no início de cada sessão.</p>')}
        ${section('Bônus e novas tentativas', '130', list(['<b>Perícia complementar:</b> um bom resultado numa perícia relacionada (até de outro personagem) dá +1 na próxima tentativa. Uma vez só e não acumula.', '<b>Tempo extra:</b> aceitar levar 4× mais tempo dá +1.', '<b>Sem a perícia:</b> STAT + 1d10.', '<b>Tentar de novo:</b> só se algo melhorou suas chances: mais tempo, ferramenta melhor ou um teste complementar.']))}
        ${section('Modificadores comuns', '130', table(['Condição', 'Modificador'], [['Iluminação noturna ou fraca', '−1'], ['Nunca fez isso antes', '−1'], ['Tarefa complexa', '−2'], ['Sem as ferramentas ou peças certas', '−2'], ['Dormiu mal na noite anterior', '−2'], ['Sob tensão extrema', '−2'], ['Exausto', '−4'], ['Extremamente bêbado ou sedado', '−4'], ['Tentando fazer em segredo', '−4'], ['Tarefa encoberta por fumaça, escuridão etc.', '−4']], 'dense'))}
        <div class="callout">Consequência interessante numa falha costuma ser melhor que travar a história.</div>`
    },

    combat: {
      eyebrow: 'Cyberpunk RED / regras', title: 'Combate',
      lede: 'Turnos de 3 segundos. Tudo o que você precisa para resolver um tiroteio: ações, alcance, autofogo, corpo a corpo, cobertura, veículos e facedown.',
      html: `${section('Iniciativa e turno', '168', `${formula('Iniciativa = REF + 1d10')}${list(['Ordem decrescente; empates rolam de novo.', 'Cada turno: <b>1 Ação de Movimento + 1 Ação</b>.', 'Pode fazer a Ação no meio do movimento e continuar andando depois.', 'Armas com <b>CDT 2</b> (cadência de tiro) podem ser divididas: mover, atirar, mover, atirar.', 'Nunca mais de 2 ataques por Ação, e não dá para usar duas armas de CDT 1 na mesma Ação.'])}`)}
        ${section('Ações', '168–169', table(['Ação', 'O que faz'], [
          ['Ação de Movimento', 'Anda até MOVE × 2 m (ou MOVE quadrados no grid).'],
          ['Ataque', 'Um ataque corpo a corpo ou à distância.'],
          ['Correr', 'Uma Ação de Movimento extra (só se já usou a Ação de Movimento no turno).'],
          ['Recarregar', 'Recarga completa com um único tipo de munição.'],
          ['Ação mantida', 'Guarda a Ação para um gatilho ou uma posição na fila de iniciativa. Defina a ação e o alvo.'],
          ['Usar perícia', 'Tarefa rápida. Tarefas longas levam várias Ações; rola ao completar.'],
          ['Usar objeto', 'Manipular algo que não pede perícia.'],
          ['Estabilizar', 'Tentar estabilizar alguém (veja Dano e cura).'],
          ['Agarrar / Estrangular / Derrubar / Escudo humano', 'Veja "Agarrar e arremessar".'],
          ['Levantar-se', 'Depois de ser derrubado. Caído, não usa Ação de Movimento.'],
          ['Equipar ou soltar escudo', 'Custa Ação.'],
          ['Entrar em / ligar / manobrar veículo', 'Veja "Veículos".'],
          ['Ações NET', 'Netrunner na arquitetura (veja Netrunning).'],
          ['Não custa Ação', 'Sacar arma de fácil acesso numa mão livre, largar arma, sair de veículo. <b>Guardar</b> a arma custa.']
        ], 'dense'))}
        ${section('Movimento', '169', list(['MOVE × 2 m por Ação de Movimento.', 'Nadar, escalar e salto com corrida custam 2 m de movimento por metro.', 'Salto parado: metade da distância do salto com corrida.', 'Caído (derrubado): precisa da Ação Levantar-se antes de se mover.']))}
        ${section('Ataque à distância', '172', `${formula('REF + perícia da arma + 1d10 &gt; DV pelo alcance')}<p>Alvo com <b>REF 8 ou mais</b> pode, em vez disso, se esquivar: <b>DEX + Evasão + 1d10</b> vira a DV. Empate: defensor vence. A armadura reduz o dano.</p>`)}
        ${section('DV por alcance', '173', `${rangeTable}<p class="note-status">Objetos arremessados usam a linha do lança-granadas, até no máximo 25 m.</p>`)}
        ${section('Tiro mirado', '170', `<p>Com a Ação inteira (CDT 1), <b>−8 no ataque</b> para mirar num ponto:</p>${table(['Alvo', 'Efeito extra se acertar'], [['Cabeça', 'O dano que passa da armadura da cabeça é multiplicado por 2.'], ['Item na mão', 'Se passar 1 ponto de dano da armadura, o alvo larga o item que você escolher.'], ['Perna', 'Se passar 1 ponto de dano, o alvo sofre a lesão crítica Perna Quebrada.']], 'dense')}`)}
        ${section('Autofogo', '173', `${list(['Custa 1 Ação e <b>10 balas</b>. Sem 10 balas no pente, não dá.', 'Usa a perícia <b>Disparo Automático</b> e a tabela abaixo em vez da tabela normal.', 'Dano: <b>2d6 × quanto você passou da DV</b>, até o multiplicador da arma. Se os dois dados caírem 6, também causa lesão crítica.', 'Não pode ser tiro mirado. Alvos com REF 8+ podem se esquivar.'])}${autofireTable}`)}
        ${section('Fogo supressivo', '174', list(['Custa 1 Ação e 10 balas.', 'Todo mundo a pé, até 25 m, fora de cobertura e na sua linha de visão rola <b>WILL + Concentração + 1d10</b> contra seu <b>REF + Disparo Automático + 1d10</b>.', 'Quem falhar usa a próxima Ação de Movimento para ir para a cobertura; se não bastar, gasta a Ação também.']))}
        ${section('Espingarda com cartucho', '174', list(['Um ataque (REF + Armas de Ombro + 1d10) contra <b>DV13</b>.', 'Se acertar, <b>todo alvo à sua frente, até 6 m e à vista, sofre 3d6</b>. Rola o dano uma vez só.', 'Não pode ser tiro mirado. Cada alvo com REF 8+ pode se esquivar.']))}
        ${section('Explosivos', '174', list(['Dano em todos numa área de <b>10 × 10 m</b> (5 × 5 quadrados) centrada no quadrado mirado. Rola o dano uma vez.', 'Se errar a DV, o mestre decide onde caiu dentro dessa área.', 'REF 8+ pode se esquivar individualmente, rolando mais que o teste do atacante, para sair da área.', 'Cobertura que o dano não destrói protege; se destruir, quem estava atrás sofre dano total.']))}
        ${section('Corpo a corpo', '175–176', `${formula('DEX + Armas Brancas + 1d10 vs DEX + Evasão + 1d10')}${list(['CDT 2 (dois ataques por Ação), exceto armas brancas muito pesadas.', 'Alcance de 2 m. Empate: defensor vence.', '<b>Armas brancas ignoram metade do SP</b> (arredondado para cima).', 'Com <b>BODY 8+</b>, dá para usar com uma mão uma arma de duas mãos.'])}${table(['Classe', 'Exemplos', 'Dano', 'CDT', 'Oculta?', 'Custo'], [['Leve', 'Faca de combate, tomahawk', '1d6', '2', 'Sim', '50eb'], ['Média', 'Taco de beisebol, pé de cabra, facão', '2d6', '2', 'Não', '50eb'], ['Pesada', 'Cano de ferro, espada, bastão com espetos', '3d6', '2', 'Não', '100eb'], ['Muito pesada', 'Motosserra, marreta, naginata', '4d6', '1', 'Não', '500eb']], 'dense')}`)}
        ${section('Briga e artes marciais', '176–178', `${brawlTable}${list(['<b>Briga</b> não ignora armadura. Com Cyberbraço, o dano mínimo é 2d6.', '<b>Artes marciais</b> ignoram metade do SP, têm CDT 2 e exigem pelo menos 1 ponto na perícia.', 'Movimentos especiais: <b>DEX + Artes Marciais + 1d10</b> contra DEX + Evasão + 1d10 ou contra uma DV.'])}`)}
        ${section('Movimentos de artes marciais', '178–180', table(['Forma', 'Movimento', 'Requisito', 'Efeito'], [
          ['Todas', 'Recuperação', '—', 'Ao usar Levantar-se, DV13: não gasta a Ação.'],
          ['Aikido', 'Desarme combinado', 'Acertou o mesmo alvo com Briga e Artes Marciais neste turno', 'DV15: o objeto na mão do alvo fica com você ou cai.'],
          ['Aikido', 'Aperto de ferro', 'Alvo agarrado ainda não afetado', 'Ação, DV15: −2 extra para ele escapar e nada de ataques à distância enquanto agarrado.'],
          ['Karatê', 'Combinação quebra-armadura', 'Acertou o mesmo alvo com Arma Branca e Artes Marciais neste turno', 'DV15: a armadura do alvo perde 2 SP extras.'],
          ['Karatê', 'Golpe quebra-ossos', 'WILL 8+', 'No lugar dos 2 ataques, 1 golpe: se acertar, Costelas Quebradas. Com −8 na cabeça: Crânio Rachado.'],
          ['Judô', 'Contra-queda', 'Desviou de todos os ataques corpo a corpo desde seu último turno', 'Ação, DV15: derruba quem o atacou, sem precisar agarrar. Não pode ser evitado.'],
          ['Judô', 'Escape de agarrão', 'Acertou 2 ataques corpo a corpo em quem o agarra neste turno', 'DV15: está livre, e o alvo sofre Braço Quebrado.'],
          ['Taekwondo', 'Ponto de pressão', 'WILL 8+', 'No lugar dos 2 ataques, 1 golpe: se acertar, Lesão na Coluna. Com −8 na cabeça: Lesão Cerebral.'],
          ['Taekwondo', 'Voadora', 'MOVE 8+ e já andou 4 m neste turno', 'Usa Ação e o resto do movimento contra alvo a até 4 m: dano de artes marciais, alvo caído e derrubado de moto ou veículo aberto.']
        ], 'dense'))}
        ${section('Agarrar e arremessar', '177', list(['<b>Agarrar</b> (Ação, precisa de mão livre): os dois rolam DEX + Briga + 1d10. Quem vence agarra ou toma um objeto.', 'Agarrados: <b>−2 em todas as ações</b>; o defensor não usa Ação de Movimento e é arrastado; ninguém usa arma de duas mãos.', 'O atacante solta quando quiser; o defensor escapa com um teste de agarrar vencido (Ação).', '<b>Estrangular</b> (Ação): dano igual ao BODY direto no HP, ignorando armadura. Se levaria abaixo de 0, fica com 1 HP e desmaia. Três rodadas seguidas: desmaia.', '<b>Derrubar</b> (Ação): dano igual ao BODY direto no HP; o alvo cai e o agarrão acaba.', '<b>Arremessar objeto:</b> DEX + Atletismo + 1d10, até 25 m, DV da tabela do lança-granadas. Arma branca arremessada não ignora metade do SP.']))}
        ${section('Cobertura', '182–183', `${list(['Está coberto quem está atrás de algo que para uma bala e fora da linha de visão do atacante.', 'Não existe cobertura parcial: para a bala ou não para.', 'Cada trecho de 2 × 2 m tem HP; em 0 HP é destruído, e o dano que sobra se perde (exceto explosivos).', 'Estrutura grossa só se move com BODY 10+. Aço só é danificado por Briga ou Artes Marciais com Cyberbraço ou BODY 10+.'])}${coverTable}<p class="note-status">Exemplos do livro: porta de cofre 50 HP; bloco de motor 50 HP; rocha 40 HP; janela de banco 30 HP; porta de carro 25 HP; geladeira 25 HP; árvore 20 HP; mesa virada 5 HP; porta de madeira 5 HP; para-brisa comum e baia de escritório 0 HP.</p>`)}
        ${section('Escudos e escudo humano', '183–184', list(['Equipar ou soltar escudo custa Ação e ocupa a mão.', 'Com um escudo com HP, você conta como coberto. Contra um ataque que você vê, pode interpor o escudo: ele recebe o ataque todo, mas você não pode se esquivar.', '<b>Escudo blindado:</b> 10 HP, 100eb.', '<b>Escudo humano:</b> a partir de um agarrão, Ação para usar o agarrado como escudo. Não bloqueia corpo a corpo nem tiro mirado na cabeça, e ele não pode se esquivar. Se morrer, vira escudo com HP igual ao BODY dele.']))}
        ${section('Veículos', '189–192', `${list(['Entrar é Ação; sair é só movimento. Ligar ou parar é Ação: o motorista vai para o <b>topo da fila de iniciativa</b>, o MOVE do veículo passa a ser o dele e ele não usa mais Ações de Movimento.', 'Sem Plugs de Interface, uma mão fica no volante; tirá-la faz perder o controle no início do próximo turno.', '<b>Direção básica:</b> se REF + perícia de controle for maior que 9, não gasta Ação. Se não, gasta a Ação e rola DV10 todo turno; falhar é perder o controle.', '<b>Manobras</b> usam a Ação e a Ação de Movimento; falhar é perder o controle.', '<b>Batida:</b> 6d6 no veículo e no que foi atingido, e todos os envolvidos sofrem a lesão Traumatismo Cervical.', '<b>Desviar de um veículo a pé:</b> DEX + Evasão + 1d10 contra DV13.', 'Veículos têm PDE (pontos de dano estrutural) e não se esquivam. Vidro comum não é cobertura.'])}${table(['Manobra', 'DV'], [['Desviar, curva fechada, parada de emergência', '13'], ['Cavalo de pau, salto', '17'], ['Pouso (aéreo)', '13'], ['Acrobacia (aéreo)', '17']], 'dense')}${table(['Veículo terrestre', 'PDE', 'Assentos', 'MOVE', 'Custo'], [['Moto estradeira', '35', '2', '20', '20.000eb'], ['Superbike', '35', '2', '60', '100.000eb'], ['Carro compacto', '50', '4', '20', '30.000eb'], ['Carro esportivo', '50', '4', '40', '50.000eb'], ['Supercarro', '50', '2', '60', '100.000eb']], 'dense')}`)}
        ${section('Reputação e facedown', '193–194', `${table(['Nível', 'Quem sabe de você'], [['1', 'Quem estava lá.'], ['2', 'Os amigos próximos ouviram a história.'], ['3', 'Todos os colegas e conhecidos.'], ['4', 'Histórias pela área local.'], ['5', 'Gente de fora da área reconhece seu nome.'], ['6', 'Gente de fora da área reconhece seu rosto.'], ['7', 'Saiu uma ou duas notícias sobre você.'], ['8', 'Seus feitos viram manchete com frequência.'], ['9', 'Você está sempre nas screamsheets e na TV.'], ['10', 'Conhecido no mundo todo.']], 'dense')}<p>Ao conhecer alguém novo, role 1d10: <b>abaixo do seu nível de Reputação</b>, a pessoa já ouviu falar de você (para o bem ou para o mal).</p>${formula('Facedown: COOL + Reputação + 1d10 (reputação de covarde conta negativa)')}<p>Empate: nada acontece. O perdedor escolhe <b>recuar</b> ou sofrer <b>−2 em ações contra esse oponente</b> até derrotá-lo uma vez.</p>`)}`
    },

    damage: {
      eyebrow: 'Cyberpunk RED / regras', title: 'Dano, ferimentos e cura',
      lede: 'Da bala até a mesa de cirurgia: armadura, estados de ferimento, Death Save, lesões críticas, estabilização, tratamento e as outras formas de se machucar.',
      html: `${section('Sofrendo dano', '186', `<ol><li>O atacante rola o dano.</li><li>Subtraia o SP da armadura no local (sempre o corpo, a não ser tiro mirado na cabeça). O resto sai do HP.</li><li>Se passou qualquer dano, a armadura desse local perde <b>1 SP</b> até ser reparada.</li></ol><p class="note-status">Veneno, fogo e algumas outras fontes ignoram a armadura.</p>`)}
        ${section('Armaduras', '185', `${table(['Armadura', 'SP', 'Penalidade', 'Custo'], [['Couro', '4', '—', '20eb'], ['Kevlar', '7', '—', '50eb'], ['Blindagem leve (Light Armorjack)', '11', '—', '100eb'], ['Traje corporal (Bodyweight Suit)', '11', '—', '1.000eb'], ['Blindagem média', '12', '−2 REF, DEX, MOVE', '100eb'], ['Blindagem pesada', '13', '−2 REF, DEX, MOVE', '500eb'], ['Flak', '15', '−4 REF, DEX, MOVE', '500eb'], ['Metalgear', '18', '−4 REF, DEX, MOVE', '5.000eb']], 'dense')}<p>Compre para cabeça e corpo. SP não soma: vale o maior do local. A pior penalidade se aplica uma vez.</p>`)}
        ${section('Estados de ferimento', '186', woundTable)}
        ${section('Death Save', '188', deathSave)}
        ${section('Lesões críticas', '187', list(['Acontece quando <b>dois ou mais dados de dano</b> de um ataque corpo a corpo ou à distância caem 6.', 'Role 2d6 e pegue uma lesão que o alvo ainda não tem. Tabela da cabeça só em tiro mirado na cabeça.', 'Toda lesão causa <b>+5 de dano direto no HP</b>, sem ablação e independentemente de o ataque ter passado da armadura.', 'Mortalmente ferido sofre uma lesão crítica a cada ataque que o atinge.']))}
        ${section('Lesões críticas: corpo', '187', critTable(critBody))}
        ${section('Lesões críticas: cabeça', '188', critTable(critHead))}
        ${section('Estabilização e cura natural', '222–223', `${formula('TECH + Primeiros Socorros ou Paramédico + 1d10 &gt; DV10 / 13 / 15')}${list(['Custa uma Ação. A DV depende do estado: levemente, gravemente ou mortalmente ferido.', 'Mortalmente ferido estabilizado volta a <b>1 HP</b> e fica <b>inconsciente por 1 minuto</b> (ainda rola Death Save se for atacado).', 'Estabilizado, recupera <b>HP igual ao BODY por dia inteiro de descanso</b>.'])}`)}
        ${section('Quem cura o quê', '223', table(['Perícia', 'O que faz'], [['Primeiros Socorros', 'Estabiliza e faz correção rápida só das lesões mais comuns. Todo personagem tem pelo menos 2.'], ['Paramédico (x2)', 'Estabiliza e faz correção rápida ou tratamento de quase todas as lesões.'], ['Cirurgia', 'Trata as piores lesões. Só Medtech, pela habilidade de Role Medicina.'], ['Cybertecnologia', 'Não estabiliza. Faz correção rápida e tratamento de lesões em partes cibernéticas (cyberbraço, cyberolho...), na mesma DV.']], 'dense'))}
        ${section('Correção rápida x tratamento', '223', table(['', 'Correção rápida', 'Tratamento'], [['Resultado', 'Tira o efeito pelo resto do dia', 'Tira o efeito de vez'], ['Tempo por tentativa', '1 minuto', '4 horas'], ['Em si mesmo?', 'Pode', 'Não pode']], 'dense'))}
        ${section('Outras formas de se ferir', '180–181', table(['Fonte', 'Regra'], [
          ['Fogo', 'Dano direto no HP no fim do seu turno até gastar uma Ação para se apagar: brando (fogueira) 2, intenso (incêndio) 4, mortal (termite) 6. Não reduz a armadura.'],
          ['Afogamento e asfixia', 'Segura o fôlego por BODY minutos. Depois, no início de cada turno, dano igual ao BODY direto no HP.'],
          ['Eletrocução', '6d6 de dano (a armadura absorve). Repete no fim de cada turno até se afastar da fonte.'],
          ['Queda', 'Cai 40 m por turno; agarrar uma borda: Atletismo DV15. Ao bater (10 m ou mais): 2d6 a cada 10 m (a armadura absorve) e Atletismo DV15 para evitar Perna Quebrada. Duas cyberpernas anulam tudo isso até 30 m.'],
          ['Venenos', 'WILL + Resistir Tortura/Drogas + 1d10 contra DV11 (brando, 1d6 direto no HP), DV13 (intenso, 2d6) ou DV15 (mortal, 3d6).'],
          ['Drogas como arma', 'Mesma rolagem contra DV11 (álcool: embriaguez), DV13 (tiopental: sugestionável) ou DV15 (droga projetada: o que o criador quis).'],
          ['Radiação', 'Baixa: adoece com o tempo, a critério do mestre. Alta: como fogo brando que não se apaga enquanto estiver na zona. Extrema (reator vazando): como fogo mortal.']
        ], 'dense'))}
        ${section('Hospital, Trauma Team e instalação', '223–226', `${table(['Maior DV da visita', 'Custo no hospital'], [['DV10', '50eb'], ['DV13', '100eb'], ['DV15', '500eb'], ['DV17 ou mais', '1.000eb']], 'dense')}${list(['Leito: 100eb por noite. Membro clonado ou cyberware médico de reposição (sem slots e sem perda de Humanidade) já está incluído.', '<b>Trauma Team Prata:</b> 500eb/mês; cirurgias são cobradas à parte, pelo preço do hospital.', '<b>Trauma Team Executivo:</b> 1.000eb/mês; cirurgia incluída.', 'Com Agent e Biomonitor, a TT é chamada sozinha quando o HP fica abaixo do BODY ou há desmembramento. Senão, chamar é uma Ação. Chega em <b>1d6 rodadas</b>, entra no topo da iniciativa, com 5 membros num AV-4.'])}${table(['Instalar cyberware em', 'Cirurgia (Medtech)', 'Custo de instalação'], [['Loja', 'DV13', '100eb'], ['Clínica', 'DV15', '500eb'], ['Hospital', 'DV17', '1.000eb']], 'dense')}<p class="note-status">Retirar cyberware de um corpo sem destruí-lo: Medtech, mesma DV da instalação, 4 horas; falhar destrói a peça.</p>`)}`
    },

    humanity: {
      eyebrow: 'Cyberpunk RED / regras', title: 'Humanidade, terapia e drogas',
      lede: 'O preço do cromo e das drogas de rua, e como pagar para recuperar o que se perdeu.',
      html: `${section('Humanidade e EMP', '80', `${formula('Humanidade = EMP × 10')}${list(['Cyberware causa Perda de Humanidade ao ser instalado.', 'A EMP efetiva é a <b>dezena</b> da Humanidade atual: 44 de Humanidade = EMP 4; caindo para 39, EMP 3.', 'Humanidade <b>abaixo de zero</b>: o personagem entra em ciberpsicose.', 'Cyberware de nível médico (reposição), implantes terapêuticos e modelagem corporal padrão não custam Humanidade.'])}`)}
        ${section('Terapia', '229–230', `${table(['Terapia', 'Efeito', 'Custo', 'Teste (Medtech)'], [['Dependência', 'Livra de um vício. Por 1 ano, falha automaticamente nos testes contra o efeito secundário daquela droga.', '1.000eb', 'Tecnologia Médica DV15; materiais 500eb'], ['Perda de Humanidade padrão', 'Recupera 2d6 de Humanidade.', '500eb', 'Tecnologia Médica DV15; materiais 100eb'], ['Perda de Humanidade extrema', 'Recupera 4d6 de Humanidade.', '1.000eb', 'Tecnologia Médica DV17; materiais 500eb']], 'dense')}${list(['Cada terapia leva <b>uma semana inteira</b>; se falhar, a semana e os materiais se perdem.', 'Não dá para recuperar toda a Humanidade sem tirar cyberware: cada peça reduz o máximo em <b>2</b> (borgware, em <b>4</b>). Peças com 0 de perda não reduzem.', 'Medtech não pode fazer terapia em si mesmo.'])}`)}
        ${section('Drogas de rua', '227–229', `${list(['Tomar é uma Ação com um Airhypo (ou um ataque corpo a corpo contra quem não quer).', 'O efeito primário é automático. Quando ele acaba, role <b>WILL + Resistir Tortura/Drogas + 1d10</b> contra a DV do efeito secundário. Falhar: efeito secundário permanente e vício, até fazer terapia.', 'Doses a mais estendem o efeito primário.'])}${table(['Droga', 'Dose', 'Efeito primário', 'Efeito secundário (DV)'], [['Black Lace', '50eb', '24 h. Ignora o estado Gravemente Ferido. Perde 2d6 de Humanidade (devolvida se passar no teste).', 'DV17: a Humanidade não volta, fica viciado e tem −2 REF quando não está sob efeito.'], ['Blue Glass', '20eb', '4 h. De vez em quando "pisca" (alucina) e perde a Ação do turno.', 'DV15: viciado; pisca cerca de uma vez por hora (sob efeito, fica imune).'], ['Boost', '50eb', '24 h. +2 INT (pode passar de 8).', 'DV17: viciado; −2 INT.'], ['Smash', '10eb', '4 h. +2 em Dança, Contorcionismo, Conversação, Percepção Humana, Persuasão e Atuação.', 'DV15: viciado; −2 nessas mesmas perícias.'], ['Synthcoke', '20eb', '4 h. +1 REF (pode passar de 8), mas paranoia.', 'DV15: viciado; −2 REF quando não está sob efeito.']], 'dense')}`)}`
    },

    netrunning: {
      eyebrow: 'Cyberpunk RED / regras', title: 'Netrunning',
      lede: 'A arquitetura NET é um elevador: um andar de cada vez, com uma surpresa atrás de cada porta. Aqui estão as ações, os testes, os programas e o Black ICE.',
      html: `${section('Do que o netrunner precisa', '197', `${list(['<b>Neural Link</b> com <b>Plugs de Interface</b>, um <b>cyberdeck</b> e <b>óculos de virtualidade</b> (sem eles, fica inconsciente para o mundo físico enquanto conectado).', 'Precisa estar a até <b>6 m</b> de um ponto de acesso, sem parede no meio (8 m com o upgrade de alcance).', 'Só um cyberdeck por vez; trocar de deck é uma Ação Carnal.'])}<p>${button('netArsenal', 'Descrição completa de cada ICE, programa e upgrade')} ${button('net2077', 'Netrunning de 2077')}</p>${table(['Cyberdeck', 'Slots', 'Custo'], [['Qualidade ruim', '5', '100eb'], ['Padrão', '7', '500eb'], ['Qualidade excelente', '9', '1.000eb']], 'dense')}<p class="note-status">Tabela do RED. Em 2077 o cyberdeck é cyberware instalado no Neural Link, com outros modelos e preços: veja a página Suplemento 2077.</p>`)}
        ${section('Ações por turno', '197', `<p>No turno, o netrunner faz <b>uma Ação Carnal</b> (no mundo físico) <b>ou</b> tantas <b>Ações NET</b> quanto a Interface permite. A Ação de Movimento continua disponível nos dois casos.</p>${table(['Rank de Interface', '1–3', '4–6', '7–9', '10'], [['Ações NET', '2', '3', '4', '5']], 'dense')}`)}
        ${section('Ações NET', '198', list(['<b>Conectar / Desconectar</b> (1 Ação NET, a até 6 m do ponto de acesso). Desconectar reinicia as defesas da arquitetura.', '<b>Sair do alcance conectado</b> = desconexão insegura: sofre o efeito de todo Black ICE encontrado e ainda ativo.', '<b>Ativar ou desativar um programa</b>: 1 Ação NET. Cada programa uma vez por rodada.', '<b>Usar uma habilidade de Interface</b>: veja a tabela abaixo.', '<b>Não são Ações NET:</b> andar pela arquitetura (até a próxima obstrução) e copiar arquivos para o deck.']))}
        ${section('Habilidades de Interface', '198–201', `${formula('Interface + 1d10 &gt; DV')}${table(['Habilidade', 'Custo', 'Teste', 'O que faz'], [
          ['Scanner', '1 Ação Carnal', 'Interface + 1d10', 'Acha no mundo físico os pontos de acesso da área; quanto maior, mais longe.'],
          ['Backdoor', '1 Ação NET', 'contra a DV da senha', 'Passa por uma senha.'],
          ['Cloak', '1 Ação NET', 'o resultado vira a DV', 'Esconde seus rastros e seus vírus. Sem Cloak, outro netrunner descobre o que você fez com Pathfinder.'],
          ['Control', '1 Ação NET + 1 por comando', 'contra a DV do nó', 'Toma um nó de controle (câmeras, torretas, portas, drones). Cada nó age uma vez por turno. Tomar de outro: DV = o teste dele.'],
          ['Eye-Dee', '1 Ação NET', 'contra a DV do arquivo', 'Descobre o que é um arquivo e quanto vale.'],
          ['Pathfinder', '1 Ação NET', 'Interface + 1d10', 'Revela o mapa: andares iguais ao resultado, até a primeira obstrução com DV maior.'],
          ['Slide', '1 Ação NET (1×/turno)', 'contra PER do Black ICE + 1d10', 'Foge de um Black ICE não demoníaco para um andar vizinho (não atravessa senha).'],
          ['Virus', 'Ações NET definidas pelo mestre', 'contra a DV do mestre', 'Só no andar mais baixo. Deixa até 2 mudanças que continuam depois de desconectar. DV para remover = o teste.'],
          ['Zap', '1 Ação NET', 'contra DEF do programa + 1d10 ou Interface + 1d10', '1d6 de dano no REZ de um programa ou direto no cérebro de um netrunner.']
        ], 'dense')}`)}
        ${section('Combate na NET', '201', `${formula('Interface + ATK do programa + 1d10 vs Interface + 1d10 (ou DEF do programa + 1d10)')}${list(['Black ICE ataca com <b>ATK + 1d10</b>.', 'Programa anti-pessoal só afeta netrunners; anti-programa só afeta programas.', 'Programa em 0 REZ fica desativado ("derezzed"); religar custa 2 Ações NET (desativar e ativar). Programa destruído precisa ser comprado de novo.', 'Instalar ou desinstalar programa ou hardware leva 1 hora.'])}`)}
        ${section('Programas', '202–204', table(['Programa', 'Classe', 'ATK / DEF / REZ', 'Efeito', 'Custo'], [
          ['Eraser', 'Booster', '0 / 0 / 7', '+2 em Cloak.', '20eb'],
          ['See Ya', 'Booster', '0 / 0 / 7', '+2 em Pathfinder.', '20eb'],
          ['Speedy Gonzalvez', 'Booster', '0 / 0 / 7', '+2 de velocidade.', '100eb'],
          ['Worm', 'Booster', '0 / 0 / 7', '+2 em Backdoor.', '50eb'],
          ['Armor', 'Defensor', '0 / 0 / 7', 'Reduz em 4 todo dano cerebral. Uma cópia ativa por vez; uma vez por netrun.', '50eb'],
          ['Flak', 'Defensor', '0 / 0 / 7', 'Zera o ATK de programas de ataque não Black ICE contra você. Uma vez por netrun.', '50eb'],
          ['Shield', 'Defensor', '0 / 0 / 7', 'Anula o primeiro dano cerebral de programa não Black ICE e se desativa. Uma vez por netrun.', '20eb'],
          ['Banhammer', 'Anti-programa', '1 / 0 / 0', '3d6 REZ em programa não Black ICE; 2d6 em Black ICE.', '50eb'],
          ['Sword', 'Anti-programa', '1 / 0 / 0', '3d6 REZ em Black ICE; 2d6 em programa não Black ICE.', '50eb'],
          ['DeckKRASH', 'Anti-pessoal', '0 / 0 / 0', 'Força uma desconexão insegura do netrunner inimigo.', '100eb'],
          ['Hellbolt', 'Anti-pessoal', '2 / 0 / 0', '2d6 direto no cérebro; o deck pega fogo junto com a roupa (2 de dano no HP por turno até gastar uma Ação Carnal para apagar).', '100eb'],
          ['Nervescrub', 'Anti-pessoal', '0 / 0 / 0', '−1d6 em INT, REF e DEX do alvo por 1 hora.', '100eb'],
          ['Poison Flatline', 'Anti-pessoal', '0 / 0 / 0', 'Destrói um programa não Black ICE aleatório do deck do alvo.', '100eb'],
          ['Superglue', 'Anti-pessoal', '2 / 0 / 0', 'O alvo não avança nem desconecta com segurança por 1d6 rodadas. Uma vez por netrun.', '100eb'],
          ['Vrizzbolt', 'Anti-pessoal', '1 / 0 / 0', '1d6 direto no cérebro e −1 Ação NET no próximo turno do alvo (mínimo 2).', '50eb']
        ], 'dense'))}
        ${section('Black ICE', '204–207', `${list(['Ao encontrar Black ICE à espreita: <b>Interface + bônus de velocidade + 1d10</b> contra <b>SPD do ICE + 1d10</b>. Se o ICE vencer, você sofre o efeito na hora.', 'Depois ele entra no <b>topo da fila de iniciativa</b> e ataca uma vez por turno (ATK + 1d10 contra Interface + 1d10) até ser desativado ou driblado com Slide.', 'Black ICE próprio ocupa <b>2 slots</b> no deck. O mestre joga todos os turnos do Black ICE.'])}${table(['ICE', 'Classe', 'PER', 'SPD', 'ATK', 'DEF', 'REZ', 'Efeito', 'Custo'], [
          ['Asp', 'Anti-pessoal', '4', '6', '2', '2', '15', 'Destrói um programa aleatório do deck.', '100eb'],
          ['Giant', 'Anti-pessoal', '2', '2', '8', '4', '25', '3d6 no cérebro e desconexão insegura (sofre os outros Black ICE ativos).', '1.000eb'],
          ['Hellhound', 'Anti-pessoal', '6', '6', '6', '2', '20', '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).', '500eb'],
          ['Kraken', 'Anti-pessoal', '6', '2', '8', '4', '30', '3d6 no cérebro; até o fim do próximo turno, não avança nem desconecta com segurança.', '1.000eb'],
          ['Liche', 'Anti-pessoal', '8', '2', '6', '2', '25', '−1d6 em INT, REF e DEX por 1 hora.', '500eb'],
          ['Raven', 'Anti-pessoal', '6', '4', '4', '2', '15', 'Desativa um programa defensor aleatório e causa 1d6 no cérebro.', '50eb'],
          ['Scorpion', 'Anti-pessoal', '2', '6', '2', '2', '15', '−1d6 no MOVE por 1 hora.', '100eb'],
          ['Skunk', 'Anti-pessoal', '2', '4', '4', '2', '10', '−2 em Slide até ser desativado (acumula entre Skunks).', '500eb'],
          ['Wisp', 'Anti-pessoal', '4', '4', '4', '2', '15', '1d6 no cérebro e −1 Ação NET no próximo turno (mínimo 2).', '50eb'],
          ['Dragon', 'Anti-programa', '6', '4', '6', '6', '30', '6d6 no REZ de um programa; se desativar, destrói.', '1.000eb'],
          ['Killer', 'Anti-programa', '4', '8', '6', '2', '20', '4d6 no REZ de um programa; se desativar, destrói.', '500eb'],
          ['Sabertooth', 'Anti-programa', '8', '6', '6', '2', '25', '6d6 no REZ de um programa; se desativar, destrói.', '1.000eb']
        ], 'dense')}`)}
        ${section('Demônios', '212', `${table(['Demônio', 'REZ', 'Interface', 'Ações NET', 'Valor de combate'], [['Imp', '15', '3', '2', '14'], ['Efreet', '25', '4', '3', '14'], ['Balron', '30', '7', '4', '14']], 'dense')}${list(['Black ICE inteligente que opera nós de controle (torretas, drones) contra a equipe no mundo físico. Ataca com drones e torretas usando o valor de combate + 1d10.', 'Sabe tudo da própria arquitetura: senhas não o param e ele sempre vence disputas de velocidade. Não tem SPD nem PER, então <b>não dá para usar Slide</b> contra ele.', 'Sem DEF: defende com Interface + 1d10. Só usa Zap e Control.', 'Entra no topo da iniciativa quando detecta um intruso; prioriza os nós de controle e só usa Zap com as ações que sobram.'])}`)}
        ${section('Defesas ativas (drones)', '213', table(['Defesa', 'Armamento', 'MOVE / HP', 'Neutralizar (Eletrônica/Segurança)'], [['Nuvem de enxame', 'Como arma branca muito pesada', '8 / 15', 'DV17, 5 minutos'], ['Drone terrestre', '2 entre: pistola muito pesada (perfurante), SMG, câmera', '4 / 30', 'DV21, 5 minutos'], ['Drone aéreo grande', '2 entre: pistola de dardos (veneno), pistola muito pesada, câmera', '6 / 20', 'DV21, 5 minutos'], ['Mini drone aéreo', '1 entre: pistola de dardos, pistola muito pesada, câmera', '6 / 15', 'DV17, 5 minutos'], ['Drone aranha', '2 entre: lança-granadas (gás lacrimogêneo), arma branca muito pesada, SMG pesada, câmera', '4 / 40', 'DV21, 5 minutos']], 'dense'))}
        ${section('Montando uma arquitetura', '209–211', `${table(['Dificuldade', 'DV de senha, arquivo e nó', 'Interface com chance de vencer', 'Interface que pode morrer'], [['Básica', '6', '2', '—'], ['Padrão', '8', '4', '2 ou menos'], ['Incomum', '10', '6', '4 ou menos'], ['Avançada', '12', '8', '6 ou menos']], 'dense')}${list(['<b>Andares:</b> 3d6. Role 1d10: com 7+, a arquitetura tem um ramo (role de novo para mais). Não ramifica antes do 2º andar; o ramo mais longo tem o "último andar" do vírus.', '<b>Dois primeiros andares (lobby), 1d6:</b> 1 arquivo DV6 · 2 senha DV6 · 3 senha DV8 · 4 Skunk · 5 Wisp · 6 Killer.', '<b>Demais andares:</b> tabela de 3d6 da dificuldade escolhida, no livro (p. 211).', 'Todo nó de controle e arquivo precisa fazer sentido no lugar físico. Quem trabalha no prédio provavelmente sabe as senhas.'])}${table(['Andar', 'Exemplo do livro', 'DV'], [['1', 'Arquivo', 'Eye-Dee 6'], ['2', 'Senha', 'Backdoor 8'], ['3', 'Nó de controle (câmeras)', 'Control 10'], ['4', 'Senha', 'Backdoor 8'], ['5', 'Asp', '—'], ['6', 'Nó de controle (porta de segurança)', 'Control 10'], ['7', 'Hellhound', '—']], 'dense')}`)}
        ${section('Hardware do deck', '208', table(['Hardware', 'Efeito', 'Slots', 'Custo'], [['Backup Drive', 'Salva programas que seriam destruídos; reinstala com uma Ação Carnal.', '2', '100eb'], ['DNA Lock', 'Trava biométrica; abrir sem a chave: Eletrônica/Segurança DV17.', '2', '100eb'], ['Hardened Circuitry', 'Imune a EMP e efeitos que desativam o deck.', '1', '100eb'], ['Insulated Wiring', 'O deck não pega fogo por efeito de programa.', '1', '100eb'], ['KRASH Barrier', 'Imune a efeitos que forçam desconexão.', '2', '100eb'], ['Range Upgrade', 'Conecta a um ponto de acesso a até 8 m.', '1', '100eb']], 'dense'))}
        ${section('Exemplos de vírus', '200', table(['Vírus', 'DV', 'Ações NET'], [['Muda o ícone de um tipo de Black ICE', '6', '1'], ['Desativa um Black ICE até o vírus ser removido', '10', '2'], ['Faz um nó de controle falhar até o vírus ser removido', '10', '2'], ['Apaga todo o Black ICE da arquitetura', '12', '10'], ['Corta pela metade os andares da arquitetura, para sempre', '12', '10']], 'dense'))}
        <div class="callout">Cyberware e aparelhos sem arquitetura NET (agents, câmeras simples) não são hackeados com Interface: usam Cybertecnologia ou Eletrônica/Segurança.</div>${section('Descrições completas', '', `<p>As tabelas acima são para consulta rápida. Aparência, efeito completo e dicas de cada item:</p><p>${button('netArsenal', 'Arsenal do RED')} ${button('net2077', 'Netrunning de 2077')} ${button('quickhacks', 'Quickhacks e daemons')} ${button('os2077', 'Berserk e Sandevistan')}</p>`)}`
    },

    economy: {
      setup: setupNightMarket,
      eyebrow: 'Suplemento 2077 / economia (substitui a do RED)', title: 'Economia de 2077',
      lede: 'A economia de Night City em 2077, pelo suplemento de fã: dinheiro mais fácil de ganhar, custo de vida menor e categorias de preço mais altas. Onde o suplemento não diz nada, vale a regra do RED, e isso está marcado. Acerte as contas no início de cada mês.',
      html: `<div class="callout"><b>Resumo em uma linha:</b> as categorias de preço subiram um degrau, mas quase tudo continua custando os mesmos eurobucks de antes; o que muda é o nome da categoria. Viver ficou mais barato (acabou o Kibble) e o hustle rende 1,5×.</div>
        ${section('Categorias de preço', 'sup. p. 7', `<p>Cada categoria subiu um degrau de valor: <b>Barato deixou de ser 10eb e passou a 20eb</b>, e Super Luxuoso vai a 20.000eb ou mais.</p>${table(['Categoria', 'Em 2077', 'No RED (antes)'], [['Barato (Cheap)', '<b>20eb</b>', '10eb'], ['Cotidiano (Everyday)', '<b>50eb</b>', '20eb'], ['Oneroso (Costly)', '<b>100eb</b>', '50eb'], ['Premium', '<b>500eb</b>', '100eb'], ['Caro (Expensive)', '<b>1.000eb</b>', '500eb'], ['Muito caro (Very Expensive)', '<b>5.000eb</b>', '1.000eb'], ['Luxuoso (Luxury)', '<b>10.000eb</b>', '5.000eb'], ['Super luxuoso (Super Luxury)', '<b>20.000eb ou mais</b>', '10.000eb ou mais']], 'dense')}<p class="note-status">Regra do RED que continua valendo (p. 385): sem um Fixer ou um Night Market, só se compra até Premium, o que em 2077 quer dizer até 500eb. Só o Fixer paga menos que o preço de mercado.</p>`)}
        ${section('Convertendo preços do RED', 'sup. p. 27–50', `<p>O suplemento não traz uma fórmula de conversão, mas as listas dele mostram o padrão: <b>a maioria dos itens mantém o preço em eurobucks do RED e só troca o nome da categoria</b>.</p>${table(['Item', 'No RED', 'No suplemento'], [['Pistola pesada (padrão)', '100eb (Premium)', '100eb (Oneroso)'], ['SMG (padrão)', '100eb (Premium)', '100eb (Oneroso)'], ['Espingarda (padrão)', '500eb (Caro)', '500eb (Premium)'], ['Rifle de assalto (padrão)', '500eb (Caro)', '500eb (Premium)'], ['Kerenzikov', '500eb (Caro)', '500eb (Premium)'], ['<i>Exceção:</i> pistola média (padrão)', '50eb (Oneroso)', '100eb (Oneroso)'], ['<i>Exceção:</i> Biomonitor (item refeito, dá +6 para estabilizar)', '100eb', '1.000eb (Caro)']], 'dense')}<div class="callout"><b>Regra da mesa (tirada das listas do suplemento):</b><br>1. O item está no suplemento? Use o preço dele.<br>2. O item só existe no RED? Mantenha o preço em eurobucks do RED; a categoria passa a ser a que tem esse valor na tabela de 2077 (100eb = Oneroso, 500eb = Premium...).<br>Por isso os preços em eb das outras páginas da wiki continuam valendo em 2077.</div>`)}
        ${section('Preços de referência: armas de 2077', 'sup. p. 32–50', `<p>O suplemento troca as armas genéricas por modelos (Power, Tech e Smart). Faixas de preço por classe, tiradas dos modelos do livro:</p>${table(['Classe', 'Qualidade ruim', 'Padrão', 'Excelente ou exótica'], [
          ['Pistola média', '—', '100eb (Unity; Lexington)', '1.000eb (Yukimura, Chao, Kappa, Kenshin)'],
          ['Pistola pesada', '—', '100eb (Liberty, Tamayura)', '500eb (Nue) · 1.000eb (Omaha, Tech)'],
          ['Pistola muito pesada (revólver)', '—', '50eb (Nova, exótica)', '100eb (Overture)'],
          ['SMG', '—', '100eb (Shigure, Saratoga)', '1.000eb (Senkoh LX, Dian)'],
          ['SMG pesada', '50eb (Pulsar)', '—', '1.000eb (Shingen, Smart)'],
          ['Espingarda', '100eb (Carnage)', '500eb (Tactician) · 100eb (Testera, Satara: de 2 tiros)', '1.000eb (Crusher, Palica)'],
          ['Rifle de assalto', '—', '500eb (Nowaki, Ajax)', '500eb (Masamune) · 1.000eb (Sidewinder, Smart)'],
          ['Metralhadora', '—', '500eb (Defender)', '1.000eb (MA70 HB)'],
          ['Rifle de precisão / sniper', '—', '1.000eb (SOR-22, Achilles, Grad: exóticos)', '1.000eb (Ashura) · 5.000eb (Nekomata)']
        ], 'dense')}<p class="note-status">O suplemento não lista armas brancas, armaduras, arcos nem lança-granadas: para esses, vale o preço em eb do RED.</p>`)}
        ${section('Estilo de vida', 'sup. p. 31', `${table(['Estilo', 'Como é', 'Por mês'], [['<s>Kibble</s>', '<b>Não existe mais em 2077.</b> A marca Continental faliu.', '—'], ['Prepak genérico', 'Substitui o Kibble <b>pelo mesmo preço</b>. Também cobre comprar qualquer item de 10eb ou menos <b>duas vezes por semana</b>. Um bar ou restaurante bom todo fim de semana.', '<b>100eb</b>'], ['Prepak bom', 'Comida de restaurante, quase como a de verdade. Bons bares; um show ou evento por mês.', '600eb'], ['Comida fresca', 'Comida de verdade. Bar executivo, hotel quando precisar, um restaurante de primeira por mês.', '1.500eb']], 'dense')}<p>Quem não está quebrado nem sem casa vive bem acima do antigo Kibble: carne de cultura, leite sintético e anúncios em toda vending machine.</p><p class="note-status">Regra do RED que continua valendo (p. 377): quem não paga o estilo de vida no início do mês tem uma semana; depois, rola um Death Save no início de cada dia sem pagar.</p>`)}
        ${section('Moradia', 'sup. p. 31', `<p><b>Mudança de 2077:</b> uma quitinete num <b>megaprédio</b> ou outro lugar subsidiado ou mais barato custa o mesmo que um contêiner de carga, para alugar e para comprar. Os outros valores não mudaram.</p>${table(['Moradia', 'Aluguel por mês', 'Compra'], [['Na rua / num veículo', '—', '—'], ['Hotel cápsula', '500eb', '—'], ['Contêiner de carga', '1.000eb', '15.000eb'], ['<b>Quitinete em megaprédio</b> (2077)', '<b>1.000eb</b>', '<b>15.000eb</b>'], ['Quitinete (fora de megaprédio)', '1.500eb', '25.000eb'], ['Apartamento de dois quartos', '2.500eb', '35.000eb'], ['Conapt corporativo', 'Dado pela corporação', '—'], ['Conapt de luxo', '7.500eb', '85.000eb'], ['Cobertura de luxo', '15.000eb', 'ver livro'], ['Casa corporativa em Beaverville', 'Dada pela corporação', '200.000eb'], ['Mansão corporativa em Beaverville', 'Dada pela corporação', '500.000eb']], 'dense')}<p class="note-status">Tabela-base do RED, p. 378.</p>`)}
        ${section('Comprar, vender e pechinchar', 'sup. p. 31', list(['Os preços das listas são de item <b>novo de fábrica</b>.', '<b>Usado ou quebrado:</b> de 25% a 50% de desconto. Pechinchar continua valendo, com metade do preço para coisa bem gasta.', '<b>Serviços de 10eb ou menos</b> mantiveram o preço, mas agora ficam abaixo de Barato: dependendo da situação, do lugar e do estilo de vida, podem até sair de graça.', 'Serviços como hospital, terapia, instalação de cyberware e Trauma Team: o suplemento não muda os valores em eb (veja Dano, ferimentos e cura).']))}
        ${section('Night Market', '337–339', `<p>Um mercado improvisado, montado por um fixer, que aparece e some rápido. Cada um vende duas categorias de coisas. Para gerar um:</p>${list(['Role <b>1d6 duas vezes</b> para as duas categorias (role de novo se repetir).', 'Para cada categoria, role <b>1d10</b>: é o número de itens à venda.', 'Para cada item, role <b>d100</b> na coluna da categoria; role de novo se repetir a linha.', '<b>Cyberware:</b> o cyberware de base que o item exigir também está à venda, e o seu ripperdoc instala de graça. <b>Fashionware:</b> instalado ali mesmo.'])}${rollButtons(['<button class="action" data-night-market type="button">Gerar um Night Market</button>'])}<details class="roll-table"><summary>Tabela de itens (d100) / 20 linhas</summary>${nightMarketTable}</details><p class="note-status"><b>Midnight Market:</b> a versão secreta, só para convidados ricos e poderosos, com 1d10 + 5 itens raros escolhidos pelo mestre. Só um fixer de Rank 9 ou mais monta um. Em 2077 não há a Role Fixer: os mercados ficam com fixers NPCs, e a Role Corpo pode montá-los junto com eles.</p>`)}
        ${section('Trabalhos e hustle', '381–384', `${table(['Trabalho (RED)', 'Como é', 'Pagamento por pessoa'], [['Fácil', 'Não se espera resistência armada. Mas nunca se sabe.', '500eb'], ['Típico', 'Resistência armada esperada, mas dá para se preparar.', '1.000eb'], ['Perigoso', 'Resistência esmagadora. Sem muita preparação, você morre.', '2.000eb']], 'dense')}${list(['<b>Hustle:</b> com 7 dias inteiros livres, o personagem trabalha na própria Role e rola 1d6 na tabela da Role, conforme o Rank da habilidade (RED p. 382–384).', '<b>Em 2077 o hustle rende 1,5×</b> o valor da tabela do RED (sup. p. 31). Um resultado de 0eb continua 0.', 'O suplemento não muda o pagamento dos trabalhos.'])}`)}
        ${section('Zonas e autodefesa', 'sup. p. 31', list(['As zonas de combate do RED acabaram: a polícia patrulha a maior parte da cidade e a maioria dos serviços existe em qualquer bairro.', 'O problema do cidadão comum é crime e guerra de gangue. Porte ostensivo de arma e leis de legítima defesa amplas são aceitos.', '<b>Recompensa na hora:</b> abater criminosos rende pagamento quase imediato, vivos ou mortos, desde que o app da NCPD no Agent confirme.', 'Fora da cidade, nas Badlands, ninguém garante nada.']))}
        ${section('Moda: os quatro estilos', 'sup. p. 7–8', `<p>Metade do preço de um visual cobre o básico (parte de baixo, de cima e calçado); a outra metade, o extra e os acessórios do estilo.</p>${table(['Estilo', 'Cara', 'Visual genérico', 'Subestilos'], [['Entropismo', 'Robusto, quadradão, feio, mas funciona. Necessidade acima de estilo.', '100eb (Oneroso)', 'Nomad 500eb · Bohemian 500eb'], ['Kitsch', 'Espalhafatoso e colorido; cyberware à mostra. Estilo acima de substância.', '500eb (Premium)', 'Generic Chic 500eb · Gang Colours 500eb · Leisurewear 500eb · Urban Flash 500eb · Asia Pop 1.000eb'], ['Neomilitarismo', 'Monolítico, prático, dominante. O visual das megacorps.', '1.000eb (Caro)', 'Military/Police 1.000eb · Businesswear 5.000eb · Fashion 5.000eb'], ['Neokitsch', 'Ostensivo, dourado, materiais naturais de verdade. O visual do 0,1%.', '5.000eb (Muito caro)', 'High Fashion 10.000eb']], 'dense')}`)}
        ${section('Cyberware inicial gratuito', 'sup. p. 8', '<p>Todo personagem de 2077 pode começar com, de graça e sem perda de Humanidade: <b>Neural Link</b>, <b>Cyberaudio Suite</b>, <b>Internal Agent</b>, <b>Personal Link</b> (plug de interface no pulso) e <b>dois Chipware Sockets</b>.</p>')}
        ${section('Sono e cansaço', '377', `${list(['Menos de 6 horas de sono num dia: −2 em tudo, por dia sem dormir 6 horas.', 'Dormir mal deixa <b>cansado</b> no dia seguinte: mais −2 em tudo.', 'Dorme mal quem divide um lugar com mais gente que 1 + o número de quartos (hotel cápsula: mais de uma pessoa por cápsula).', 'Na rua: Resistência DV15 para não acordar cansado. No mato: Sobrevivência DV15 (outra pessoa pode rolar por você).'])}<p class="note-status">Regra do RED; o suplemento não muda.</p>`)}`
    },

    creation: {
      eyebrow: 'Cyberpunk RED / criação', title: 'Criação de personagens',
      lede: 'Três caminhos de criação, as fórmulas dos valores derivados e o checklist da ficha.',
      html: `${section('Três métodos', '72–90', table(['Método', 'STATs', 'Perícias', 'Indicado para'], [['Rato de Rua (Streetrat)', 'Role 1d10 e pegue a linha inteira da tabela da Role.', 'Pacote pronto da Role.', 'Começar a jogar rápido.'], ['Edgerunner', 'Role 1d10 para <b>cada</b> STAT na tabela da Role.', 'Perícias da Role; distribua <b>86 pontos</b>, cada uma entre 2 e 6.', 'Equilibrar rapidez e personalização.'], ['Pacote Completo', 'Distribua <b>62 pontos</b>; cada STAT entre 2 e 8.', '<b>86 pontos</b> em qualquer perícia, máximo 6; as básicas com pelo menos 2.', 'Quem quer controlar a ficha inteira.']], 'dense'))}
        ${section('Pontos de STAT por nível', '78', `${table(['Tipo de personagem', 'Pontos'], [['Coadjuvante', '50'], ['Iniciante (padrão)', '62'], ['Coadjuvante maior', '70'], ['Herói menor', '75'], ['Herói maior', '80']], 'dense')}<p class="note-status">O livro recomenda começar com personagens iniciantes (62).</p>`)}
        ${section('Valores derivados', '79–80', `${formula('HP = 10 + 5 × (média de BODY e WILL, arredondada para cima)')}${table(['Média de BODY e WILL', '2', '3', '4', '5', '6', '7', '8', '9', '10'], [['HP', '20', '25', '30', '35', '40', '45', '50', '55', '60']], 'dense')}${list(['<b>Gravemente Ferido:</b> metade do HP, arredondada para cima.', '<b>Death Save:</b> igual ao BODY.', '<b>Humanidade:</b> EMP × 10.'])}`)}
        ${section('Perícias básicas', '88–90', `<p>Todo personagem tem pelo menos nível 2 em: Atletismo, Briga, Concentração, Conversação, Educação, Evasão, Primeiros Socorros, Percepção Humana, Linguagem (Streetslang), Especialista Local (sua área), Percepção, Persuasão e Furtividade.</p><p>Perícias marcadas x2 custam 2 pontos por nível. O Lifepath (Origem Cultural) dá mais 4 níveis de idiomas de graça.</p>${button('skills', 'Ver todas as perícias')}`)}
        ${section('Estatísticas', '72', table(['STAT', 'O que mede'], [['INT', 'Raciocínio, conhecimento e atenção.'], ['REF', 'Reflexos; mira com armas de fogo e direção.'], ['DEX', 'Coordenação; corpo a corpo, esquiva e atletismo.'], ['TECH', 'Habilidade técnica e medicina.'], ['COOL', 'Compostura e presença social.'], ['WILL', 'Força de vontade e resistência.'], ['LUCK', 'Pontos de sorte gastos por sessão.'], ['MOVE', 'Deslocamento: MOVE × 2 m por turno.'], ['BODY', 'Constituição, força, HP e Death Save.'], ['EMP', 'Empatia; define a Humanidade.']], 'dense'))}
        ${section('Lifepath e identidade', '45', '<p>O Lifepath dá origem cultural, personalidade, relações, inimigos e acontecimentos passados. Use os resultados para criar vínculos que apareçam em jogo; não é preciso transformar cada detalhe em obrigação.</p>' + button('lifepath', 'Abrir o Lifepath, com roladores') + button('advancement', 'Avanço e Pontos de Melhoria'))}
        ${section('Checklist da ficha', '', list(['Role e habilidade de Role.', 'STATs, perícias, idiomas e especialidades.', 'HP, Gravemente Ferido, Death Save, Humanidade e MOVE.', 'Armas, munição, armadura e SP de cabeça e corpo.', 'Cyberware, slots ocupados e perda de Humanidade.', 'Equipamento, eurobucks, moradia, estilo de vida e contatos.']))}`
    },

    advancement: {
      eyebrow: 'Cyberpunk RED / avanço', title: 'Avanço e Pontos de Melhoria',
      lede: 'Ao fim de cada sessão, o mestre dá Pontos de Melhoria (IP) e os jogadores os gastam para subir perícias e o Rank da Role. O suplemento de 2077 não muda nada disso.',
      setup: setupAdvancement,
      html: `<div class="callout"><b>No fim da sessão:</b> missão concluída, com ou sem sucesso → todos ganham pela coluna <b>Grupo</b>. Missão ainda em andamento → cada um ganha pela coluna do seu estilo de jogo <b>principal ou secundário</b>. Quem se destacou em outro estilo pode ganhar por ele, se der mais.</div>
        ${section('Gastar Pontos de Melhoria', '411', `<p>O custo depende do nível (ou Rank) <b>que você vai alcançar</b>.</p>${formula('Perícia: 20 × novo nível · perícia difícil (×2): 40 × novo nível · Rank de Role: 60 × novo Rank')}${ipCostTable}${list(['<b>Não dá para pular níveis</b>, mesmo com IP sobrando: compre um de cada vez e passe um tempo no nível novo antes de subir de novo.', 'Começar uma perícia nova é comprar o nível 1: 20 IP, ou 40 se for difícil.', '<b>Exemplos:</b> Pistola de 4 para 5 custa 100 IP; de 5 para 6, mais 120. A Role começa no Rank 4, e subir para o 5 custa 300 IP.'])}`)}
        ${section('Ganhar Pontos de Melhoria', '410–411', `<p>Ache a linha que descreve a sessão na coluna certa. Exemplo do livro: Bob, um Guerreiro, atrai a temida Equipe X para um fogo cruzado e derrota todos. Isso é "uso muito eficaz ou esperto do combate, derrotando vários oponentes de jeitos inesperados": <b>50 IP</b>.</p>${ipEarnTable}`)}
        ${section('Estilos de jogo', '409', `${list(['<b>Guerreiro:</b> gosta de testar a perícia contra adversários. Quer o lutador mais forte do grupo e as melhores armas e habilidades de combate.', '<b>Socializador:</b> foca na experiência do jogo como um todo. Faz piadas, registra as histórias e contribui fora do jogo; costuma apoiar os outros.', '<b>Explorador:</b> gosta de descobrir coisas novas no mundo: amigos, alianças, lugares. Adora enigmas e mistérios fora do combate.', '<b>Intérprete:</b> gosta de interpretar o personagem fiel ao tipo, com históricos elaborados, imagens, adereços e diários. Atua as cenas importantes com discursos e descrições.'])}<p>Cada jogador faz o questionário depois de criar o personagem: marque as 5 coisas que acha mais importantes ao jogar. O grupo com mais marcas é o estilo <b>principal</b>; o segundo, o <b>secundário</b>.</p>${playstyleQuiz}`)}
        ${section('E em 2077?', 'sup.', `<p>O suplemento não muda os Pontos de Melhoria nem os custos. O que muda é o que algumas Roles ganham por Rank: o Face, o Corpo, o Investigador do Lawman e a Interface do Netrunner.</p>${button('roles2077', 'Ver Roles de 2077')}`)}`
    },

    lifepath: {
      eyebrow: 'Cyberpunk RED / Lifepath', title: 'Lifepath',
      lede: 'O passado do personagem em tabelas de 1d10: de onde veio, como é, quem ama, quem o odeia e o que quer. Role cada tabela, escolha o resultado ou role tudo de uma vez.',
      setup: setupLifepath,
      html: `<div class="callout"><b>Rolar ou escolher:</b> em todas as tabelas vale rolar 1d10 ou escolher. Use os resultados como ganchos para a campanha, não como obrigação. Depois deste, cada Role tem um Lifepath próprio no livro, que não está aqui.${rollButtons([lifepathButton('tudo', 'Rolar o Lifepath inteiro')])}</div>
        ${lifepathSection('origem', '<p>Todo mundo fala Streetslang. De onde você vem define a sua outra língua: escolha uma da sua região, ou outra que não esteja na lista.</p>')}
        ${lifepathSection('personalidade')}
        ${lifepathSection('roupa', '<p>É o estilo que você prefere, não uma peça só: a mesma jaqueta pode ser de executivo, de couro nômade ou com as cores da gangue.</p>')}
        ${lifepathSection('cabelo')}
        ${lifepathSection('adorno')}
        ${lifepathSection('valor')}
        ${lifepathSection('pessoas')}
        ${lifepathSection('pessoa')}
        ${lifepathSection('posse')}
        ${lifepathSection('familia')}
        ${lifepathSection('infancia', '<p>Algo pode ter acontecido no caminho: o lugar onde você cresceu pode ser bem diferente da sua família original.</p>')}
        ${lifepathSection('crise')}
        ${section('Amigos', '51', `<p>Role <b>1d10 − 7</b> (mínimo 0) para o número de amigos. Para cada um, role na tabela.</p>${lifepathTable(lifepathTables.find(item => item[0] === 'amigo'))}${rollButtons([lifepathButton('amigos', 'Rolar amigos (1d10 − 7)'), rollButton('lp-amigo', 'Rolar um amigo')])}`)}
        ${section('Inimigos', '51–52', `<p>Role <b>1d10 − 7</b> (mínimo 0) para o número de inimigos. Para cada um, decida quem foi o injustiçado e role uma vez em cada tabela. No fim, a Doce Vingança diz o que acontece quando vocês se encontram.</p><h4>Quem é</h4>${lifepathTable(lifepathTables.find(item => item[0] === 'inimigo-quem'))}<h4>O que causou</h4>${lifepathTable(lifepathTables.find(item => item[0] === 'inimigo-causa'))}<h4>O que pode usar contra você</h4>${lifepathTable(lifepathTables.find(item => item[0] === 'inimigo-recursos'))}<h4>Doce Vingança</h4>${table(['1d10', 'O que vocês vão fazer'], revengeRows.map(([from, to, text]) => [`<b>${from === to ? from : `${from}–${to}`}</b>`, text]), 'dense')}${rollButtons([lifepathButton('inimigos', 'Rolar inimigos (1d10 − 7)'), lifepathButton('inimigo', 'Rolar um inimigo')])}`)}
        ${section('Amores trágicos', '52', `<p>Role <b>1d10 − 7</b> (mínimo 0) para o número de amores que terminaram mal. Para cada um, veja como acabou.</p>${table(['1d10', 'O que aconteceu'], loveRows.map((text, index) => [`<b>${index + 1}</b>`, text]), 'dense')}${rollButtons([lifepathButton('amores', 'Rolar amores trágicos (1d10 − 7)'), rollButton('lp-amor', 'Rolar um')])}`)}
        ${section('Meta de vida', '53', `${table(['1d10', 'O que você quer'], goalRows.map((text, index) => [`<b>${index + 1}</b>`, text]), 'dense')}${rollButtons([rollButton('lp-meta')])}`)}
        ${section('Lifepath em 2077', '', list(['As tabelas são do RED (2045). Em 2077 sobra pouca Zona de Combate: use Pacifica ou Dogtown.', 'Megaestrutura vira um <b>megaprédio</b>, como os de Watson e Heywood.', 'Boosterganger vira qualquer gangue de 2077: Maelstrom, Animals, Tyger Claws, Valentinos, 6th Street.', 'Bando nômade: Aldecaldos, Wraiths ou outro clã das Badlands.']))}`
    }
  };

  window.rollTables = Object.assign(window.rollTables || {}, rollTables);

  window.systemRules = {
    pages,
    data: { rangeBands, rangeBandLimits, rangeDV, critBody, critHead }
  };
})();
