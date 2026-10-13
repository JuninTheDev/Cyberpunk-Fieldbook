// Netrunning: o arsenal (programas, ICE e defesas do livro-base, mais os cyberdecks com marca) e os quickhacks do Mission
// Kit e do suplemento de fã aprovados pela mesa. As regras ficam na página Netrunning (system-rules.js).
// Cada item vira um cartão (.entry) que a busca consegue abrir direto.
(() => {
  const table = (headers, rows, className = 'dense') => `<div class="table-wrap${className ? ` ${className}` : ''}"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body) => `<div class="section" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const formula = text => `<p><span class="formula">${text}</span></p>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;
  const entry = ({ name, tag, stats = [], text, extra = '', icon, iconLabel = 'Ícone', tip }) => `<article class="entry" data-toc="${name}"><header><h4>${name}</h4>${tag ? `<span class="entry-tag">${tag}</span>` : ''}</header>${stats.length ? `<div class="entry-stats">${stats.map(([label, value]) => `<span><b>${label}</b> ${value}</span>`).join('')}</div>` : ''}<p>${text}</p>${extra}${icon ? `<p class="entry-icon"><b>${iconLabel}:</b> ${icon}</p>` : ''}${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;
  const grid = entries => `<div class="entry-grid">${entries.map(entry).join('')}</div>`;

  // ---------------- RED: programas (p. 202–204) ----------------
  const programStats = (atk, def, rez, cost) => [['ATK', atk], ['DEF', def], ['REZ', rez], ['Custo', cost]];
  const boosters = [
    { name: 'Eraser', tag: 'Booster', stats: programStats(0, 0, 7, '20eb'), text: '+2 em todos os testes de <b>Cloak</b> enquanto estiver ativo.', icon: 'um globo rosa soltando pequenas bolhas de sabão.', tip: 'quem planta vírus e quer sair sem deixar rastro.' },
    { name: 'See Ya', tag: 'Booster', stats: programStats(0, 0, 7, '20eb'), text: '+2 em todos os testes de <b>Pathfinder</b> enquanto estiver ativo.', icon: 'uma lupa prateada cintilante girando devagar no lugar.', tip: 'um Pathfinder melhor revela mais andares de uma vez e evita abrir a porta errada.' },
    { name: 'Speedy Gonzalvez', tag: 'Booster', stats: programStats(0, 0, 7, '100eb'), text: '+2 de <b>Velocidade</b> enquanto estiver ativo. A velocidade entra no teste de encontrar Black ICE à espreita (Interface + velocidade + 1d10 contra a SPD do ICE).', icon: 'um rastro de poeira que aparece atrás do netrunner quando ele se move.', tip: 'é o que evita tomar o ataque grátis de um Black ICE rápido (Hellhound, Killer, Asp) ao abrir uma porta.' },
    { name: 'Worm', tag: 'Booster', stats: programStats(0, 0, 7, '50eb'), text: '+2 em todos os testes de <b>Backdoor</b> enquanto estiver ativo.', icon: 'um verme mecânico dourado com olhos verde-néon.', tip: 'senhas são a obstrução mais comum; o Worm se paga rápido.' }
  ];
  const defenders = [
    { name: 'Armor', tag: 'Defensor', stats: programStats(0, 0, 7, '50eb'), text: 'Reduz em <b>4</b> todo dano cerebral que você receberia enquanto estiver ativo. Só uma cópia pode rodar por vez, e cada cópia só pode ser usada <b>uma vez por netrun</b>.', icon: 'uma armadura dourada transparente vestida pelo netrunner.', tip: 'o melhor seguro contra Black ICE que causa dano cerebral (Hellhound, Giant, Kraken).' },
    { name: 'Flak', tag: 'Defensor', stats: programStats(0, 0, 7, '50eb'), text: 'Zera o ATK de todos os programas de ataque <b>que não são Black ICE</b> usados contra você enquanto estiver ativo. Uma cópia por vez; cada cópia só uma vez por netrun.', icon: 'uma nuvem de luzes ofuscantes e multicoloridas girando em volta do netrunner.', tip: 'é defesa contra outro netrunner, não contra Black ICE.' },
    { name: 'Shield', tag: 'Defensor', stats: programStats(0, 0, 7, '20eb'), text: 'Impede o <b>primeiro</b> dano cerebral causado por um programa que não é Black ICE. Depois de parar esse dano, o próprio Shield se desativa. Uma cópia por vez; cada cópia só uma vez por netrun.', icon: 'uma barreira de energia prateada e cintilante em volta do netrunner.' }
  ];
  const attackers = [
    { name: 'Banhammer', tag: 'Ataque anti-programa', stats: programStats(1, 0, 0, '50eb'), text: 'Causa <b>3d6 de REZ</b> num programa que não é Black ICE, ou <b>2d6</b> num Black ICE.', icon: 'uma marreta branca gigante e brilhante empunhada pelo netrunner.', tip: 'para derrubar os programas de outro netrunner.' },
    { name: 'Sword', tag: 'Ataque anti-programa', stats: programStats(1, 0, 0, '50eb'), text: 'Causa <b>3d6 de REZ</b> num Black ICE, ou <b>2d6</b> num programa que não é Black ICE.', icon: 'uma katana de energia brilhante que surge da mão do netrunner.', tip: 'a arma padrão contra Black ICE. O PDF traduzido classifica como "anti-pessoal", mas o efeito é contra programas.' },
    { name: 'DeckKRASH', tag: 'Ataque anti-pessoal', stats: programStats(0, 0, 0, '100eb'), text: 'O netrunner inimigo é forçado a uma <b>desconexão insegura</b> e sofre o efeito de todos os Black ICE inimigos ativos que encontrou na arquitetura.', icon: 'uma banana de dinamite de desenho animado arremessada pelo netrunner.', tip: 'a KRASH Barrier deixa o alvo imune.' },
    { name: 'Hellbolt', tag: 'Ataque anti-pessoal', stats: programStats(2, 0, 0, '100eb'), text: 'Causa <b>2d6 direto no cérebro</b> do netrunner inimigo. A menos que o deck seja isolado, ele pega fogo junto com a roupa: o alvo sofre <b>2 de dano no HP</b> ao fim de cada turno até gastar uma Ação Carnal para se apagar. Vários Hellbolts não acumulam o fogo.', icon: 'um relâmpago de fogo carmesim lançado da mão do netrunner.', tip: 'Insulated Wiring anula o fogo.' },
    { name: 'Nervescrub', tag: 'Ataque anti-pessoal', stats: programStats(0, 0, 0, '100eb'), text: 'INT, REF e DEX do netrunner inimigo caem <b>1d6 cada</b> pela próxima hora (mínimo 1). O efeito é psicossomático e não deixa sequela.', icon: 'uma bola cromada lançada pelo netrunner, que se acende com eletricidade.', tip: 'derrubar o REF do netrunner inimigo atrapalha também o que ele fizer no mundo físico.' },
    { name: 'Poison Flatline', tag: 'Ataque anti-pessoal', stats: programStats(0, 0, 0, '100eb'), text: '<b>Destrói</b> um programa que não é Black ICE, escolhido ao acaso, instalado no cyberdeck do netrunner alvo.', icon: 'um disparo em forma de feixe de luz verde-néon saindo do dedo do netrunner.', tip: 'destruído é destruído: o alvo precisa comprar o programa de novo (a Backup Drive salva).' },
    { name: 'Superglue', tag: 'Ataque anti-pessoal', stats: programStats(2, 0, 0, '100eb'), text: 'Por <b>1d6 rodadas</b>, o netrunner inimigo não consegue avançar na arquitetura nem se desconectar com segurança (ainda pode fazer uma desconexão insegura). Cada cópia só uma vez por netrun.', icon: 'uma massa de gosma vermelha e pegajosa disparada da mão do netrunner.', tip: 'prenda o inimigo no andar enquanto o seu Black ICE trabalha.' },
    { name: 'Vrizzbolt', tag: 'Ataque anti-pessoal', stats: programStats(1, 0, 0, '50eb'), text: 'Causa <b>1d6 direto no cérebro</b> e reduz em 1 o total de Ações NET do alvo no próximo turno (mínimo 2).', icon: 'uma dupla hélice de luz néon tremeluzente saindo do dedo do netrunner.' }
  ];

  // ---------------- RED: Black ICE (p. 205–207) ----------------
  const iceStats = (per, spd, atk, def, rez, cost) => [['PER', per], ['SPD', spd], ['ATK', atk], ['DEF', def], ['REZ', rez], ['Custo', cost]];
  const antiPersonnel = [
    { name: 'Asp', tag: 'Black ICE anti-pessoal', stats: iceStats(4, 6, 2, 2, 15, '100eb'), text: '<b>Destrói um programa</b> instalado no cyberdeck do netrunner inimigo, escolhido ao acaso.', icon: 'uma cobra egípcia dourada cuspindo raios de luz verde-néon.', tip: 'barato e rápido (SPD 6): aparece muito e costuma pegar o netrunner de surpresa.' },
    { name: 'Giant', tag: 'Black ICE anti-pessoal', stats: iceStats(2, 2, 8, 4, 25, '1.000eb'), text: 'Causa <b>3d6 direto no cérebro</b> e força uma <b>desconexão insegura</b>: o netrunner sofre o efeito de todos os Black ICE ativos que encontrou na arquitetura, menos o próprio Giant.', icon: 'um par enorme de pés e tornozelos que se ergue acima do netrunner.', tip: 'lento (SPD 2, PER 2): fácil de driblar com Slide, mas devastador se acertar no fim de uma netrun cheia de ICE ativo.' },
    { name: 'Hellhound', tag: 'Black ICE anti-pessoal', stats: iceStats(6, 6, 6, 2, 20, '500eb'), text: 'Causa <b>2d6 direto no cérebro</b>. A menos que o deck seja isolado, ele pega fogo junto com a roupa: <b>2 de dano no HP</b> ao fim de cada turno até gastar uma Ação Carnal para se apagar. Vários efeitos de fogo não acumulam.', icon: 'um lobo enorme de metal preto, com olhos brilhando em branco e fogo correndo em ondas pelo corpo. Fala numa voz metálica irritante, repetindo o nome do netrunner inimigo.', tip: 'o Black ICE "padrão" das arquiteturas sérias. Insulated Wiring apaga metade do problema.' },
    { name: 'Kraken', tag: 'Black ICE anti-pessoal', stats: iceStats(6, 2, 8, 4, 30, '1.000eb'), text: 'Causa <b>3d6 direto no cérebro</b>. Até o fim do próximo turno do netrunner, ele não consegue avançar na arquitetura nem se desconectar com segurança (ainda pode fazer uma desconexão insegura).', icon: 'uma massa de tentáculos laranja e machucados saindo das paredes, com ventosas cobertas de gosma vermelha e pegajosa.', tip: 'o REZ mais alto dos anti-pessoal (30): prepare dois ataques de Sword para derrubá-lo.' },
    { name: 'Liche', tag: 'Black ICE anti-pessoal', stats: iceStats(8, 2, 6, 2, 25, '500eb'), text: 'INT, REF e DEX do netrunner inimigo caem <b>1d6 cada</b> pela próxima hora (mínimo 1). O efeito é psicossomático e não deixa sequela.', icon: 'um esqueleto metálico envolto em túnica preta, com mãos cheias de anéis enegrecidos soltando faíscas.', tip: 'PER 8 torna o Slide quase impossível: é preciso derrubá-lo.' },
    { name: 'Raven', tag: 'Black ICE anti-pessoal', stats: iceStats(6, 4, 4, 2, 15, '50eb'), text: '<b>Desativa</b> um programa Defensor ativo do netrunner, escolhido ao acaso, e depois causa <b>1d6 direto no cérebro</b>.', icon: 'um corvo de armadura de placas empunhando uma lança branca e brilhante.', tip: 'abre caminho para o ICE seguinte arrancando o seu Armor ou Shield.' },
    { name: 'Scorpion', tag: 'Black ICE anti-pessoal', stats: iceStats(2, 6, 2, 2, 15, '100eb'), text: 'O MOVE do netrunner inimigo cai <b>1d6</b> pela próxima hora (mínimo 1). O efeito é psicossomático e não deixa sequela.', icon: 'um pequeno escorpião preto que chia muito alto sempre que o netrunner inimigo fala.', tip: 'fraco na NET, cruel no mundo físico: um netrunner lento não foge do tiroteio.' },
    { name: 'Skunk', tag: 'Black ICE anti-pessoal', stats: iceStats(2, 4, 4, 2, 10, '500eb'), text: 'Até ser desativado, o netrunner atingido faz todos os testes de <b>Slide com −2</b>. Cada Skunk só afeta um netrunner por vez, mas o efeito de vários Skunks acumula.', icon: 'um gambá de desenho animado que anda nas patas traseiras, colado no netrunner.', tip: 'derrube-o primeiro se o plano é fugir dos outros ICE com Slide.' },
    { name: 'Wisp', tag: 'Black ICE anti-pessoal', stats: iceStats(4, 4, 4, 2, 15, '50eb'), text: 'Causa <b>1d6 direto no cérebro</b> e reduz em 1 o total de Ações NET do netrunner no próximo turno (mínimo 2).', icon: 'um orbe de luz com um único olho minúsculo, crepitando de energia.' }
  ];
  const antiProgram = [
    { name: 'Dragon', tag: 'Black ICE anti-programa', stats: iceStats(6, 4, 6, 6, 30, '1.000eb'), text: 'Causa <b>6d6</b> no REZ de um programa. Se o dano bastar para desativá-lo, o programa é <b>destruído</b>.', icon: 'um dragão dourado robótico gigante, envolto em descargas elétricas.', tip: 'DEF 6 e REZ 30: o ICE mais duro do livro. Sem programas ativos, ele passa a perseguir o próprio netrunner.' },
    { name: 'Killer', tag: 'Black ICE anti-programa', stats: iceStats(4, 8, 6, 2, 20, '500eb'), text: 'Causa <b>4d6</b> no REZ de um programa. Se o dano bastar para desativá-lo, o programa é <b>destruído</b>.', icon: 'um samurai robótico de olhos vermelhos empunhando uma katana brilhante.', tip: 'SPD 8: quase sempre acerta o ataque grátis quando a porta abre.' },
    { name: 'Sabertooth', tag: 'Black ICE anti-programa', stats: iceStats(8, 6, 6, 2, 25, '1.000eb'), text: 'Causa <b>6d6</b> no REZ de um programa. Se o dano bastar para desativá-lo, o programa é <b>destruído</b>.', icon: 'um gato imenso e corpulento com dentes brancos brilhantes.' }
  ];

  const demons = [
    { name: 'Imp', tag: 'Demônio', stats: [['REZ', 15], ['Interface', 3], ['Ações NET', 2], ['Valor de combate', 14], ['Custo', '1.000eb']], text: 'O demônio básico: controla câmeras, portas e uma ou outra torreta em arquiteturas pequenas.', icon: 'uma pequena esfera de luz laranja com chifres vermelhos.' },
    { name: 'Efreet', tag: 'Demônio', stats: [['REZ', 25], ['Interface', 4], ['Ações NET', 3], ['Valor de combate', 14], ['Custo', '5.000eb']], text: 'Demônio intermediário, para quem precisa operar vários nós de controle no mesmo turno.', icon: 'um homem negro, alto e forte, vestido em roupas noturnas elegantes, com fez e punhal.' },
    { name: 'Balron', tag: 'Demônio', stats: [['REZ', 30], ['Interface', 7], ['Ações NET', 4], ['Valor de combate', 14], ['Custo', '10.000eb']], text: 'O demônio de quem tem algo muito valioso a esconder: Interface 7 e quatro Ações NET por turno.', icon: 'um monstro humanoide enorme numa armadura futurista, ou coberto de tentáculos verdes brilhantes e sibilantes.', tip: 'o livro avisa: "o cinema do bairro não deveria ter um Balron, a menos que esteja escondendo alguma coisa". Ótimo sinal de que a arquitetura guarda um segredo.' }
  ];

  const hardware = [
    { name: 'Backup Drive', tag: 'Hardware · 2 slots', stats: [['Custo', '100eb']], text: 'Quando um programa que não é Black ICE (ataque, defensor ou booster) seria destruído, ele é "salvo" na Backup Drive no último instante. Com uma Ação Carnal, o netrunner reinstala no deck tudo o que foi salvo, se houver slots livres. Se a drive for removida do deck, o conteúdo se apaga. Programas com uso único por netrun voltam no estado exato em que foram salvos: não dá para "matar" o próprio Armor para recarregá-lo.' },
    { name: 'DNA Lock', tag: 'Hardware · 2 slots', stats: [['Custo', '100eb']], text: 'O deck só abre com a chave biométrica do dono (digital, íris, sangue ou outra, conforme o modelo). Sem ela, é preciso um teste de <b>Eletrônica/Segurança DV17</b>.' },
    { name: 'Hardened Circuitry', tag: 'Hardware · 1 slot', stats: [['Custo', '100eb']], text: 'O deck não pode ser desativado, inutilizado nem destruído por efeitos de EMP, como pulsos de micro-ondas, nem por efeitos de programas Black ICE.' },
    { name: 'Insulated Wiring', tag: 'Hardware · 1 slot', stats: [['Custo', '100eb']], text: 'O deck não pega fogo nem põe fogo na roupa do usuário por efeito de programa.', tip: 'anula o fogo do Hellbolt e do Hellhound (o dano cerebral continua).' },
    { name: 'KRASH Barrier', tag: 'Hardware · 2 slots', stats: [['Custo', '100eb']], text: 'O deck fica imune a qualquer efeito de programa que force o netrunner a se desconectar, com ou sem segurança.', tip: 'anula DeckKRASH e a desconexão do Giant.' },
    { name: 'Range Upgrade', tag: 'Hardware · 1 slot', stats: [['Custo', '100eb']], text: 'O deck se conecta a um ponto de acesso a até <b>8 m</b> de distância, em vez de 6 m.' },
    { name: 'Traje corporal (Bodyweight Suit)', tag: 'Armadura para netrunner', stats: [['SP', '11 (cabeça e corpo)'], ['Custo', '1.000eb']], text: 'Armadura com espaço para guardar o cyberdeck e cabos para os Plugs de Interface. Dá <b>1 slot extra só para hardware</b>.' },
    { name: 'Cyberdeck em Cyberbraço', tag: 'Cyberware', stats: [['Custo', '500eb']], text: 'O cyberdeck vai instalado dentro de um cyberbraço. Dá <b>1 slot extra</b> de programa ou hardware.' }
  ];

  // ---------------- RED: defesas (p. 212–216) ----------------
  const defenseStats = (counter, data) => [['Neutralizar', counter], ...data];
  const activeDefenses = [
    { name: 'Nuvem de enxame de drones', tag: 'Defesa ativa', stats: defenseStats('Eletrônica/Segurança DV17, 5 min', [['MOVE', 8], ['HP', 15]]), text: 'Drones voadores do tamanho de mosquitos, com superfícies cortantes de nanofio. Trate a nuvem como uma única entidade armada com uma <b>arma branca muito pesada</b>.' },
    { name: 'Drone terrestre', tag: 'Defesa ativa', stats: defenseStats('Eletrônica/Segurança DV21, 5 min', [['MOVE', 4], ['HP', 30]]), text: 'Em forma de bola, esteira, rodas ou cobra. Leva 2 entre: pistola muito pesada com 8 balas perfurantes, SMG com 30 balas básicas, câmera de observação.' },
    { name: 'Drone aéreo grande', tag: 'Defesa ativa', stats: defenseStats('Eletrônica/Segurança DV21, 5 min', [['MOVE', 6], ['HP', 20]]), text: 'Leva 2 entre: pistola de dardos com 8 dardos venenosos, pistola muito pesada com 8 balas perfurantes, câmera de observação.' },
    { name: 'Mini drone aéreo', tag: 'Defesa ativa', stats: defenseStats('Eletrônica/Segurança DV17, 5 min', [['MOVE', 6], ['HP', 15]]), text: 'Leva 1 entre: pistola de dardos com 8 dardos venenosos, pistola muito pesada com 8 balas perfurantes, câmera de observação.' },
    { name: 'Drone aranha', tag: 'Defesa ativa', stats: defenseStats('Eletrônica/Segurança DV21, 5 min', [['MOVE', 4], ['HP', 40]]), text: 'Anda em patas. Leva 2 entre: lança-granadas com 2 granadas de gás lacrimogêneo, arma branca muito pesada, SMG pesada com 40 balas básicas, câmera de observação.' }
  ];
  const positionedDefenses = [
    { name: 'Enxame de sangue automatizado', tag: 'Defesa posicionada', stats: defenseStats('Eletrônica/Segurança DV21, 5 min', [['Alcance', 'toda a área defendida']]), text: 'Espalha na sala uma névoa vermelha de nanites. Inalados, eles coagulam a hemoglobina por dentro: toda pessoa de carne na área faz <b>Resistir Tortura/Drogas DV15</b>; quem falhar sofre <b>3d6 direto no HP</b>, sem reduzir armadura. Um ataque único contra todos. Qualquer filtro contra gás bloqueia (Nasal Filters, máscara).' },
    { name: 'Arma branca automatizada', tag: 'Defesa posicionada', stats: defenseStats('Eletrônica/Segurança DV17, 5 min', [['Valor de combate', 14], ['HP', 25]]), text: 'Uma <b>arma branca muito pesada</b> que ataca de um canto da sala: um cortador d\'água industrial, um fio monofilamento. Continua atacando até todos os alvos morrerem, saírem do alcance ou mostrarem o crachá certo.' },
    { name: 'Torreta automatizada', tag: 'Defesa posicionada', stats: defenseStats('Eletrônica/Segurança DV17, 5 min', [['Valor de combate', 14], ['HP', 25]]), text: 'Arma instalada no teto. Quase qualquer arma de longo alcance serve, mas o comum é uma entre: rifle de assalto (25 balas), lança-chamas (4 cartuchos incendiários), pistola de dardos (8 dardos venenosos), pistola muito pesada (8 perfurantes) ou SMG pesada (40 balas). Atira até todos morrerem, saírem do alcance ou mostrarem o crachá certo.' }
  ];
  const environmentalDefenses = [
    { name: 'Câmeras de observação', tag: 'Defesa ambiental', stats: defenseStats('DV9, 1 min', [['HP', 5], ['Detectar', 'Percepção DV17']]), text: 'Veem em pouca luz, infravermelho e UV, e mandam as imagens para um demônio ou para a segurança. Cobrem uma sala ou um corredor inteiro. Disparam quando o alvo entra na sala.' },
    { name: 'Tapete pega-mosca', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 20], ['Detectar', 'Percepção DV17']]), text: 'Rede de nanofios escondida num tapete comum. Quando alguém pisa, os fios se enrolam nos pés e pernas: <b>−1d6 no MOVE</b> até o tapete ser destruído ou a pessoa sair dele.' },
    { name: 'Piso elétrico', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 20], ['Detectar', 'Percepção DV17']]), text: 'Grade ligada ao piso. Quem pisa na área sofre <b>6d6</b> no corpo (a armadura reduz, mas não sofre ablação) e toma o choque de novo no fim de cada turno até sair do piso.' },
    { name: 'Grade laser', tag: 'Defesa ambiental', stats: defenseStats('DV17, 5 min', [['Detectar', 'Percepção DV17']]), text: 'Lasers do teto e das paredes num padrão apertado. Tocar num laser conta como ser atingido por uma <b>arma branca muito pesada</b>. Dispara quando o alvo entra na área ou anda 2 m dentro dela. Se percebida, dá para atravessar com <b>Contorcionismo DV17</b>.', tip: 'o PDF traduzido diz "DV7" para neutralizar, mas os preços do livro só têm DV9, 13, 17 e 21: deve ser DV17.' },
    { name: 'Alçapão com estacas', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['Detectar', 'Percepção DV17']]), text: 'Um trecho do piso é contrapeso de um alçapão. Quem pisa pode se salvar da queda com <b>Atletismo DV15</b> (automático com Grapple Hand ou pistola de gancho à mão). O fundo pode ter nanofios ou estacas: <b>6d6</b> no corpo, reduzidos pela armadura.' },
    { name: 'Gosma', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 10], ['Detectar', 'Percepção DV17']]), text: 'Pulverizadores lançam uma gosma grossa nos pés e pernas de quem entra na área: <b>−2d6 no MOVE</b> até a gosma ser destruída ou a pessoa sair da área.' },
    { name: 'Socadores de teto ou parede', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 20], ['Detectar', 'Percepção DV17']]), text: 'Hastes de aço descem do teto ou saem da parede e esmagam quem está no quadrante da armadilha: <b>6d6</b> no corpo, reduzidos pela armadura.' },
    { name: 'Piso escorregadio', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 10], ['Detectar', 'Percepção DV17']]), text: 'Pulverizadores cobrem o chão com um líquido superliso. Quem fizer uma Ação de Movimento na área precisa de <b>Atletismo DV15</b> ou cai (fica caído).' },
    { name: 'Painéis de atordoamento', tag: 'Defesa ambiental', stats: defenseStats('DV13, 1 min', [['HP', 5], ['Detectar', 'Percepção DV17']]), text: 'Parecem quadros ou lousas na parede. Quando alguém chega a 2 m, soltam uma explosão de luz e som numa área de 10 × 10 m: quem falhar em <b>Resistir Tortura/Drogas DV15</b> sofre as lesões Olho Danificado e Ouvido Danificado por 1 minuto, sem o dano bônus.' },
    { name: 'Câmara de gás do sono', tag: 'Defesa ambiental', stats: defenseStats('DV17, 5 min', [['HP', 60], ['Detectar', 'Percepção DV17']]), text: 'Todas as saídas se fecham hermeticamente e a armadilha entra no topo da iniciativa. No turno dela, todos no espaço rolam <b>Resistir Tortura/Drogas DV13</b>; quem falhar desmaia até levar dano ou alguém gastar uma Ação para acordá-lo. Dá para parar reduzindo o HP dela a 0 antes que todos caiam.' }
  ];

  // ---------------- Quickhacks: Mission Kit (Kit p. 16–17 e 26) e suplemento de fã em revisão (sup. p. 16–20) ----------------
  // Nível de DV → [nome do nível, Rank de Interface que dá acesso a ele].
  const NIVEIS = { 6: ['Simples', 1], 8: ['Padrão', 2], 10: ['Difícil', 3], 12: ['Avançado', 4] };
  const kitHack = (name, dv, duration, text, tip) => ({
    name, tag: `Quickhack ${NIVEIS[dv][0].toLowerCase()} · Mission Kit`,
    stats: [['DV', dv], ['Interface', `Rank ${NIVEIS[dv][1]}+`], ['Duração', duration]], text, tip,
    raw: { name, dv, rank: NIVEIS[dv][1], origem: 'kit' }
  });
  // Os do suplemento de fã que a mesa aprovou (revisão de 2026-10-13). O nível de DV saiu do custo de RAM que tinham (até 2:
  // DV6; 3–4: DV8; 6–8: DV10), e eles funcionam como os do Kit: todo netrunner faz os do nível dele, sem comprar. O preço e
  // a versão excelente do suplemento não valem.
  const fanHack = ({ name, dv, duration, target, alerta = true, text, tip }) => ({
    name, tag: `Quickhack ${NIVEIS[dv][0].toLowerCase()} · suplemento de fã`,
    stats: [['DV', dv], ['Interface', `Rank ${NIVEIS[dv][1]}+`], ['Duração', duration], ['Alvo', target], ...(alerta ? [] : [['Alerta o alvo', 'não']])],
    text, tip,
    raw: { name, dv, rank: NIVEIS[dv][1], origem: 'fa' }
  });
  const kitHacks = [
    kitHack('Impair Movement', 6, '60 s (20 rodadas)', 'O MOVE do alvo cai <b>1</b> por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação de Movimento.'),
    kitHack('Sonic Shock', 6, '60 s (20 rodadas)', 'O alvo sofre a lesão crítica <b>Ouvido Danificado</b>, sem o dano bônus, por 60 segundos (20 rodadas).'),
    kitHack('Overheat', 8, 'até apagar o fogo', 'O alvo pega fogo: sofre <b>4 de dano direto no HP</b> no fim de cada turno dele, até apagar o fogo. O dano passa pela armadura sem ablar. Apagar é uma Ação (CDT 1), e só no turno do alvo.'),
    kitHack('Short Circuit', 8, '60 s (20 rodadas)', 'O mestre escolhe <b>três implantes</b> do alvo, menos cyberbraço, cyberperna, cyberolho, Cyberaudio Suite, Neuroport e Neuroport Cyberdeck Port (as opções instaladas neles, como a Mantis Blade ou o Low Light/Infrared/UV, valem). Eles param por 60 segundos (20 rodadas).'),
    kitHack('Cyberware Malfunction', 10, '60 s (20 rodadas)', 'Você escolhe um implante do alvo, menos o Neuroport e a Neuroport Cyberdeck Port: ele para por 60 segundos (20 rodadas). Um cybermembro parado age como se tivesse a lesão Braço Quebrado ou Perna Quebrada, e as opções instaladas nele também param (um cyberbraço parado leva junto a Mantis Blade).'),
    kitHack('Lure', 10, 'o próximo turno do alvo', 'No começo do próximo turno do alvo, ele faz uma Ação de Movimento que você controla, atrás de um barulho fantasma que só ele ouve. Só funciona se o alvo <b>não sabe</b> que você entrou no Neuroport dele, e é o único quickhack do Kit que <b>não o alerta</b>. Não dá para levá-lo a um perigo óbvio, como um penhasco, uma lâmina girando ou um prédio em chamas.'),
    kitHack('Slow', 10, '60 s (20 rodadas)', 'O MOVE do alvo cai <b>1d6</b> por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação de Movimento.'),
    kitHack('Synapse Burnout', 10, 'instantânea', '<b>3d6 de dano direto no HP</b> do alvo. Passa pela armadura sem ablar.'),
    kitHack('Puppet', 12, 'o próximo turno do alvo', 'Você controla a Ação e a Ação de Movimento do alvo no próximo turno dele: atirar em si mesmo, puxar o pino da granada, atirar no chapa. Sem limite além do que o corpo dele consegue. Os testes usam as STATs e perícias do alvo, não as suas.'),
    kitHack('Shard Ejection', 12, 'instantânea', 'Arranca e ejeta um chip (shard) do alvo para um quadrado vizinho (você escolhe, se houver vários). Não funciona se o Shard Slot tiver tampa, ou até um pedaço de fita adesiva por cima.'),
    kitHack('System Reset', 12, '60 s (20 rodadas)', 'O alvo cai <b>inconsciente</b> por 60 segundos (20 rodadas), ou até sofrer dano, e fica caído (Prone).')
  ];
  const fanHacks = [
    fanHack({ name: 'Reboot Optics', dv: 6, duration: '3 rodadas', target: 'pessoa com cyberolhos', text: 'Embaralha a visão dos cyberópticos do alvo, ou até força uma imagem específica no lugar dela. Na prática, o alvo sofre a lesão <b>Olho Danificado</b> durante o efeito.' }),
    fanHack({ name: 'Request Backup', dv: 8, duration: 'instantânea', target: 'pessoa', alerta: false, text: 'Simula, a partir do alvo hackeado, um pedido de reforço para os aliados mais próximos dele.', tip: 'serve tanto para esvaziar uma sala quanto para atrair inimigos para uma emboscada.' }),
    fanHack({ name: 'Weapon Glitch', dv: 8, duration: '2 rodadas', target: 'arma Smart conectada', text: 'Ataca a arma Smart conectada ao alvo (ou o Ballistic Coprocessor dele) e a <b>trava</b>.' }),
    fanHack({ name: 'Contagion', dv: 8, duration: '2 rodadas', target: 'pessoa', text: 'Desliga a segurança do cyberware e faz substâncias tóxicas vazarem: <b>1d6 direto no HP</b> por rodada. Se espalha: infecta mais um alvo com Neuroport a até 6 m do primeiro.' }),
    fanHack({ name: 'Memory Wipe', dv: 10, duration: 'instantânea', target: 'pessoa', alerta: false, text: 'Um curto-circuito sutil na memória do alvo: ele esquece os <b>últimos três minutos</b> e não grava memórias novas pelos dois minutos seguintes.' })
  ];

  // ---------------- Cyberdecks com marca (sup. p. 14–15) ----------------
  // Os modelos do suplemento de fã, só como a marca de um cyberdeck do RED (revisão de 2026-10-13): a qualidade dá os slots
  // e o preço do RED, e a RAM, o cooling e a especialidade do suplemento saíram. [fabricante, modelo, qualidade, como é]
  const DECKS = { Ruim: { slots: 5, cost: '100eb' }, Padrão: { slots: 7, cost: '500eb' }, Excelente: { slots: 9, cost: '1.000eb' } };
  const deckRows = [
    ['Arasaka', 'Shadow', 'Excelente', 'Topo de linha, usado em infiltração e espionagem corporativa.'],
    ['Arasaka', 'Samurai', 'Excelente', 'Perigoso e eficiente, para os praticantes do bushido.'],
    ['Arasaka', 'Tranquility', 'Excelente', 'Para o dia a dia num futuro pacífico.'],
    ['Militech', 'Paraline', 'Padrão', 'Não é o mais forte, mas faz de tudo, mesmo que devagar.'],
    ['Militech', 'Fortress', 'Excelente', 'Como um datafort antigo: ninguém hackeia sem suar.'],
    ['Militech', 'Hunter MK.1', 'Padrão', 'Presa marcada não sai do seu campo de visão.'],
    ['Militech', 'Hunter MK.2', 'Excelente', 'O primo mais forte do MK.1.'],
    ['Biodyne', 'MK.1', 'Ruim', 'O cyberdeck do pobre: prático e com espaço razoável.'],
    ['Biodyne', 'MK.2', 'Padrão', 'A escolha de quem quer desempenho bruto.'],
    ['Biotechnica', 'Σ MK.1', 'Padrão', 'Coprocessadores rápidos; comum entre runners esquentados.'],
    ['Biotechnica', 'Σ MK.2', 'Padrão', 'Roda frio e suave.'],
    ['Biotechnica', 'Σ MK.3', 'Excelente', 'Processador de ponta, muito espaço e muito eficiente.'],
    ['Fuyutsuki', 'MK.1', 'Padrão', '"Bom o bastante", como descreveu um usuário.'],
    ['Fuyutsuki', 'Tinkerer', 'Padrão', 'Modificado, único e fora do alcance do consumidor comum.'],
    ['NetWatch', 'WatchDog', 'Excelente', 'Difícil de conseguir e mais difícil ainda de manter.'],
    ['NetWatch', 'NetDriver', 'Excelente', 'O sonho de todo netrunner. Cada um é uma relíquia.'],
    ['Raven Microcyber', 'Mycrocyber', 'Excelente', 'Segurança e antirroubo à prova de falhas.'],
    ['Seocho', 'MK.1', 'Padrão', 'Barato e confiável; comum em arrombamentos.'],
    ['Seocho', 'MK.2', 'Padrão', 'Para o ladrão profissional.'],
    ['Stephenson Tech', 'Tech', 'Excelente', 'Pensado para quem faz quickhack o dia inteiro.'],
    ['Tetratronic', 'Rippler', 'Padrão', 'Popular entre quem trabalha no meio da multidão.']
  ];
  const decks = deckRows.map(([maker, model, quality, text]) => ({ maker, model, quality, ...DECKS[quality], text }));
  // A página de quickhacks junta os do Kit e os do suplemento de fã, por nível de DV.
  const hacks = [...kitHacks, ...fanHacks];

  const pages = {
    netArsenal: {
      eyebrow: 'Netrunning / arsenal', title: 'Arsenal da NET',
      lede: 'Tudo o que um netrunner pode carregar ou encontrar numa arquitetura: programas, Black ICE, demônios, upgrades do deck e as defesas que eles controlam. Cada item tem a aparência (o "ícone") para descrever na mesa.',
      html: `${section('Como ler os cartões', '202–205', `${list(['<b>ATK:</b> soma no ataque do programa (Interface + ATK + 1d10). <b>DEF:</b> soma na defesa. <b>REZ:</b> os "pontos de vida" do programa; em 0 ele fica desativado.', '<b>PER:</b> quão difícil é driblar o Black ICE com Slide. <b>SPD:</b> velocidade; um ICE rápido acerta um ataque grátis quando a porta abre.', 'Anti-pessoal afeta netrunners; anti-programa afeta programas (e caça o netrunner se ele não tiver programas ativos).', 'Ativar ou desativar um programa é 1 Ação NET. Black ICE próprio ocupa 2 slots. Instalar ou remover leva 1 hora.'])}${button('netrunning', 'Regras de netrunning')}`)}
        ${section('Programas: boosters', '203', `<p>Melhoram suas habilidades de Interface enquanto estão ativos.</p>${grid(boosters)}`)}
        ${section('Programas: defensores', '203', `<p>Param ou reduzem ataques de programas e de outros netrunners enquanto estão ativos.</p>${grid(defenders)}`)}
        ${section('Programas: ataque', '203–204', `<p>Feitos para danificar ou desativar netrunners e programas. Desativam sozinhos depois de usados.</p>${grid(attackers)}`)}
        ${section('Black ICE anti-pessoal', '206–207', `<p>Caçam o netrunner pela arquitetura até serem desativados ou driblados com Slide.</p>${grid(antiPersonnel)}`)}
        ${section('Black ICE anti-programa', '207', `<p>Caçam os programas ativos do netrunner, escolhendo um ao acaso a cada ataque.</p>${grid(antiProgram)}`)}
        ${section('Demônios', '212', `<p>Black ICE inteligente que opera nós de controle (torretas, drones) contra a equipe no mundo físico. Sabem tudo da própria arquitetura: senhas não os param, sempre vencem disputas de velocidade e não dá para usar Slide contra eles. Sem DEF: defendem com Interface + 1d10. Só usam Zap e Control. No máximo um demônio a cada seis andares. Custos da tabela de segurança residencial (p. 218).</p>${grid(demons)}`)}
        ${section('Upgrades e hardware', '208', `<p>Hardware ocupa os mesmos slots que os programas (1 slot, salvo indicação). Instalar ou remover leva 1 hora.</p>${grid(hardware)}${table(['Cyberdeck', 'Slots', 'Custo'], [['Qualidade ruim', '5', '100eb'], ['Padrão', '7', '500eb'], ['Qualidade excelente', '9', '1.000eb']])}<p class="note-status">Nos anos 2070, todo deck também vem na versão para a Neuroport Cyberdeck Port, pelo mesmo preço. Essa versão não aceita hardware (Kit p. 37).</p>`)}
        ${section('Cyberdecks com marca', 'sup. p. 14–15', `<p>Nos anos 2070, os decks têm fabricante e modelo. Cada um é um cyberdeck do RED da qualidade dele, com os slots e o preço do RED: o nome é a aparência. Os modelos são do suplemento de fã; a RAM, o cooling e as especialidades de lá não valem.</p>${table(['Fabricante', 'Modelo', 'Qualidade', 'Slots', 'Custo', 'Como é'], decks.map(deck => [deck.maker, deck.model, deck.quality, deck.slots, deck.cost, deck.text]))}`)}
        ${section('Defesas ativas', '213', `<p>Pequenos robôs que agem sozinhos dentro de uma área e perseguem o alvo até o perímetro. Precisam de um demônio operando o nó de controle; sem ele, podem ser neutralizados com Eletrônica/Segurança e, depois, controlados com um Agent a até 6 m de um ponto de acesso. Gatilho padrão de todas: entrar na área sem passe ou crachá.</p>${grid(activeDefenses)}`)}
        ${section('Defesas posicionadas', '214', `<p>Sistemas fixos numa sala, cada um com seu nó de controle. Não precisam de demônio: agem sozinhos com o valor de combate + 1d10 e não se esquivam. Gatilho padrão: entrar na sala sem passe ou crachá.</p>${grid(positionedDefenses)}`)}
        ${section('Defesas ambientais', '214–216', `<p>Embutidas no piso, paredes ou teto de um espaço fechado. Mesmo controladas por demônio ou netrunner, só ligam e desligam, e sempre disparam no gatilho.</p>${grid(environmentalDefenses)}`)}
        ${section('Montando a própria segurança', '217–218', `<p>Arquiteturas, programas para arquitetura e defesas só se compram num Night Market de eletrônicos de um Fixer de Rank 4 ou mais.</p>${table(['Andares', 'Nós de controle máx.', 'Portátil?', 'Custo por andar'], [['3 a 6', '2', 'Sim (mochila grande)', '1.000eb'], ['7 a 12', '3', 'Não', '5.000eb'], ['13 a 18', '—', 'Não', '10.000eb']])}${table(['Senha, nó ou arquivo com DV', 'Custo'], [['DV6', '500eb'], ['DV8', '1.000eb'], ['DV10', '5.000eb'], ['DV12', '10.000eb']])}${table(['Defesa neutralizável com Eletrônica/Segurança', 'Custo'], [['DV9', '500eb'], ['DV13', '1.000eb'], ['DV17', '5.000eb'], ['DV21', '10.000eb']])}${list(['Black ICE custa o mesmo preço do cartão. Dois no mesmo andar custam o dobro cada; três, o triplo.', 'Demônios: Imp 1.000eb, Efreet 5.000eb, Balron 10.000eb; um a cada seis andares.', '<b>Exemplo do livro (armazém TLB, 13.500eb):</b> andar 1 Hellhound e Killer; andar 2 senha DV8; andar 3 Hellhound; andar 4 nó de controle DV8 com torreta.'])}`)}`
    },

    quickhacks: {
      eyebrow: 'Netrunning / quickhacks', title: 'Quickhacks',
      lede: 'Os quickhacks que fizeram do netrunner dos anos 2070 algo mais perigoso que uma arma num tiroteio: os 11 do Mission Kit e os 5 do suplemento de fã que a mesa aprovou. Todo netrunner faz os do nível dele pelo Rank de Interface, sem comprar nada.',
      html: `${section('Como funcionam os quickhacks', 'Kit p. 16–17 e 26', `${list([
          'Só dá para hackear quem tem <b>Neuroport</b>. Primeiro o <b>Jack In</b> (Interface + 1d10 contra WILL + 1d10), depois o <b>Breach</b> de cada Passwall, e então o quickhack: <b>Interface + 1d10 contra a DV</b> dele, numa Ação NET.',
          '<b>Um quickhack por alvo por turno</b>, mesmo sobrando Ações NET.',
          'Um quickhack que deu certo <b>alerta o alvo</b> (menos o Lure e os marcados com "Alerta o alvo: não"), que pode tentar te expulsar.',
          'Quais você faz depende do Rank de Interface: <b>Simples (DV6)</b> no Rank 1, <b>Padrão (DV8)</b> no 2, <b>Difíceis (DV10)</b> no 3 e <b>Avançados (DV12)</b> no 4. Não se compram: todo netrunner faz os do nível dele.',
          'Os do <b>suplemento de fã</b> seguem as mesmas regras. O nível de DV saiu do custo de RAM que eles tinham no suplemento; o preço e a versão excelente de lá não valem.'
        ])}<p><button class="action" data-page="netrunning" data-section="quickhacks-no-neuroport" type="button">Jack In, Breach e o Neuroport</button></p>`)}
        ${section('Simples (DV6)', 'Kit p. 16 · sup. p. 16–20', grid(hacks.filter(hack => hack.raw.dv === 6)))}
        ${section('Padrão (DV8)', 'Kit p. 16 · sup. p. 16–20', grid(hacks.filter(hack => hack.raw.dv === 8)))}
        ${section('Difíceis (DV10)', 'Kit p. 16–17 · sup. p. 16–20', grid(hacks.filter(hack => hack.raw.dv === 10)))}
        ${section('Avançados (DV12)', 'Kit p. 17', grid(hacks.filter(hack => hack.raw.dv === 12)))}`
    }
  };

  // data: as listas lidas pelo build do módulo do Foundry (foundry-2077/build): os quickhacks (os do Kit e os do suplemento
  // de fã aprovados) e os cyberdecks com marca.
  window.systemNet = {
    pages,
    data: { quickhacks: { kit: kitHacks, fa: fanHacks }, decks }
  };
})();
