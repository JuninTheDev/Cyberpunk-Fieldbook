// Armas e cyberware de 2077 (suplemento de fã "Cyberpunk 2077 – A Cyberpunk RED Supplement", p. 27–50).
// Um cartão (.entry) por item, no mesmo formato do netrunning.
(() => {
  const table = (headers, rows) => `<div class="table-wrap dense"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body) => `<div class="section" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;
  const entry = ({ name, tag, stats = [], text, extra = '', tip }) => `<article class="entry" data-toc="${name}"><header><h4>${name}</h4>${tag ? `<span class="entry-tag">${tag}</span>` : ''}</header>${stats.length ? `<div class="entry-stats">${stats.map(([label, value]) => `<span><b>${label}</b> ${value}</span>`).join('')}</div>` : ''}<p>${text}</p>${extra}${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;
  const grid = entries => `<div class="entry-grid">${entries.map(entry).join('')}</div>`;

  // ---------------- Armas ----------------
  // [nome, tipo, qualidade, perícia, dano, pente, CDT, mãos, oculta, custo, recursos, descrição, nota]
  const weapon = (name, kind, quality, skill, damage, magazine, rof, hands, conceal, cost, features, text, tip) => ({
    name, tag: `${kind} · ${quality}`,
    stats: [['Perícia', skill], ['Dano', damage], ['Pente', magazine], ['CDT', rof], ['Mãos', hands], ['Oculta', conceal], ['Custo', cost]],
    text, extra: features ? `<p class="entry-excellent"><b>Recursos:</b> ${features}</p>` : '', tip,
    // Os argumentos crus, para o build do módulo do Foundry (foundry-2077/).
    raw: { name, kind, quality, skill, damage, magazine, rof, hands, conceal, cost, features, text, tip }
  });
  const pistols = [
    weapon('Militech M-10AF Lexington', 'Pistola média Power, exótica', 'padrão', 'Armas de uma Mão', '2d6', '21 (pistola média)', 2, 1, 'Sim', '100eb', 'Autofogo (2); usa só 7 balas por rajada', 'Pistola média exótica com pente de 21 balas e dois slots de acessório. Tem autofogo (2) gastando só 7 balas por ataque, com a tabela de autofogo da SMG; com menos de 7 balas no pente, não dá. Não faz fogo supressivo. Mesmo sendo exótica, aceita munição especial.'),
    weapon('Constitutional Arms Liberty', 'Pistola pesada Power', 'padrão', 'Armas de uma Mão', '3d6', '12 (pistola pesada)', 2, 1, 'Sim', '100eb', '—', 'O cano longo a torna popular para intimidar: usada para ameaçar num <b>facedown</b>, dá +1 no teste.'),
    weapon('Arasaka Tamayura', 'Pistola pesada Power', 'padrão', 'Armas de uma Mão', '3d6', '8 (pistola pesada)', 2, 1, 'Sim', '100eb', '—', 'Fabricada nos anos 2000, é rara de ver: quem usa é das antigas, ou está quebrado.'),
    weapon('Tsunami Nue', 'Pistola pesada Power', 'excelente', 'Armas de uma Mão', '3d6', '10 (pistola pesada)', 2, 1, 'Sim', '500eb', 'Qualidade excelente (+1 no ataque)', 'A preferida de gangues de grife e frequentadores de clube chique para legítima defesa.'),
    weapon('Constitutional Arms Unity', 'Pistola média Power', 'padrão', 'Armas de uma Mão', '2d6', '12 (pistola média)', 2, 1, 'Sim', '100eb', '—', 'Dizem que é a cara de Night City: a arma mais comum da cidade.'),
    weapon('Arasaka HJKE-11 Yukimura', 'Pistola média Smart, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (pistola média)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; smartgun link (exige Smart Link)', 'Dispara três balas Smart: o teste Smart passa a <b>12 + 1d10</b> em vez de 10 + 1d10.'),
    weapon('Kang Tao A-22B Chao', 'Pistola média Smart, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (pistola média)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; smartgun link (exige Smart Link)', 'Pistola Smart da Kang Tao. O livro repete a descrição da Yukimura (três balas Smart, 12 + 1d10); os números da tabela são os mesmos.'),
    weapon('Tsunami Kappa', 'Pistola média Smart, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (pistola média)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; smartgun link (exige Smart Link)', 'Trava em <b>dois alvos</b> a até 4 m um do outro e redireciona as balas Smart para o segundo. Dispara três balas Smart (12 + 1d10).'),
    weapon('Arasaka JKE-X2 Kenshin', 'Pistola média Tech, exótica', 'excelente', 'Armas de uma Mão', '2d6', '12 (sem upgrade)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; carga Tech (rajada de 2)', 'Pente de 12 que não aceita upgrade. Na carga Tech (rajada), dispara 2 balas.'),
    weapon('Militech M-76E Omaha', 'Pistola pesada Tech, exótica', 'excelente', 'Armas de uma Mão', '3d6', '9 (sem upgrade)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; carga Tech (rajada de 3)', 'Pente de 9 que não aceita upgrade. Na carga Tech (rajada), dispara 3 balas.')
  ];
  const revolvers = [
    weapon('Darra Polytechnic DR-5 Nova', 'Pistola muito pesada Power, exótica', 'padrão', 'Armas de uma Mão', '4d6', '6 (fixo)', 1, 1, 'Sim', '50eb', '—', 'Revólver com tambor fixo de 6 balas; não aceita upgrade de pente.'),
    weapon('Malorian Overture', 'Pistola muito pesada Power, exótica', 'excelente', 'Armas de uma Mão', '4d6', '6 (fixo)', 1, 1, 'Sim', '100eb', 'Qualidade excelente (+1 no ataque)', 'Revólver de qualidade excelente com tambor fixo de 6 balas; não aceita upgrade de pente.'),
    weapon('Techtronika RT-46 Burya', 'Pistola muito pesada Tech, exótica', 'padrão', 'Armas Pesadas (a tabela diz Armas de uma Mão)', '5d6', '4 (fixo)', 1, 1, 'Não', '5.000eb', 'Carga Tech (tiro único) sempre ligada', 'Arma de borg russa: 5d6 por tiro, e todo disparo já é uma carga Tech. Exige <b>BODY 11</b>, ou BODY 10 com Gorilla Arms ou Shock Absorber. Recarregar leva duas Ações, em dois turnos.', 'o texto diz que usa Armas Pesadas; a tabela do livro diz Armas de uma Mão. Combine com a mesa.'),
    weapon('Darra Polytechnic DR-12 Quasar', 'Pistola muito pesada Tech, exótica', 'padrão', 'Armas de uma Mão', '4d6', '20 (fixo)', 1, 1, 'Não', '5.000eb', 'Carga Tech (rajada de 3)', 'Pente fixo de 20. A carga Tech (rajada) exige 10 balas no pente e gasta essas 10.')
  ];
  const smgs = [
    weapon('Arasaka Shigure', 'SMG Power', 'padrão', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Sim', '100eb', 'Autofogo (3); fogo supressivo', 'Antecessora da Militech Saratoga.'),
    weapon('Militech M221 Saratoga', 'SMG Power', 'padrão', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Sim', '100eb', 'Autofogo (3); fogo supressivo', 'Sucessora da Shigure, de design moderno dos anos 2040. Bem mais popular.'),
    weapon('Darra Polytechnic DS1 Pulsar', 'SMG pesada Power', 'ruim', 'Armas de uma Mão', '3d6', '30 (pistola pesada)', 1, 1, 'Não', '50eb', 'Qualidade ruim; autofogo (3); fogo supressivo', 'Muito popular entre gangueiros iniciantes e Scavengers: compacta e barata.'),
    weapon('Budget Arms Guillotine', 'SMG Power, exótica', 'ruim', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Não', '100eb', 'Qualidade ruim; autofogo (3); fogo supressivo; mira de sniper integrada', 'Vem com uma mira de sniper integrada que não sai. Feita para quem ia se contentar com uma Saratoga.'),
    weapon('Budget Arms Slaught-O-Matic', 'SMG Power, exótica', 'ruim', 'Armas de uma Mão', '2d6', '36 (pistola média)', 1, 1, 'Sim', '20eb', 'Qualidade ruim; autofogo (3); fogo supressivo; sem acessórios', 'Descartável: não aceita acessório, pente novo nem upgrade. Depois da última bala, <b>trava para sempre</b> e vai para o lixo.'),
    weapon('Arasaka Senkoh LX', 'SMG Tech, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (sem upgrade)', 1, 1, 'Não', '1.000eb', 'Qualidade excelente; carga Tech (rajada de 3); fogo supressivo', 'Na carga Tech (rajada), dispara as 30 balas do pente, o que permite usar fogo supressivo.'),
    weapon('Kang Tao G-58 Dian', 'SMG Smart, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Não / Sim', '1.000eb', 'Qualidade excelente; autofogo (3); fogo supressivo; coronha retrátil', 'Exige Smart Link. Com a coronha recolhida dá para esconder, mas os ataques têm −1 até estendê-la de novo (uma Ação).'),
    weapon('Arasaka TKI-20 Shingen', 'SMG pesada Smart, exótica', 'excelente', 'Armas de uma Mão', '3d6', '30 (pistola média)', 1, 1, 'Não', '1.000eb', 'Qualidade excelente; autofogo (3); fogo supressivo', 'Exige Smart Link. Dispara três balas Smart: 12 + 1d10 em vez de 10 + 1d10.')
  ];
  const shotguns = [
    weapon('Budget Arms Carnage', 'Espingarda Power', 'ruim', 'Armas de Ombro', '5d6', '5 (balote)', 1, 2, 'Não', '100eb', 'Qualidade ruim; cartucho de espingarda', 'O coice é tão mal compensado que é preciso <b>BODY 5</b> ou mais para disparar.'),
    weapon('Constitutional Arms M2038 Tactician', 'Espingarda Power', 'padrão', 'Armas de Ombro', '5d6', '8 (balote)', 1, 2, 'Não', '500eb', 'Cartucho de espingarda', 'Espingarda padrão com pente de 8.'),
    weapon('Militech Crusher, edição 2077', 'Espingarda Power, exótica', 'padrão', 'Armas de Ombro', '4d6', '12 (balote)', 1, '2 (1 com BODY 8)', 'Não', '1.000eb', 'Autofogo (2); com BODY 8+, uma mão e Armas de uma Mão', 'Causa 4d6 em vez de 5d6. Só dispara balote e gasta 6 no autofogo (tabela da SMG). Com BODY 8 ou mais, usa com uma mão e a perícia Armas de uma Mão. Um clássico dos anos 2020 repaginado.'),
    weapon('Techtronika VST-37 Pozhar', 'Espingarda Power, exótica', 'padrão', 'Armas de Ombro', '4d6', '12 (balote)', 1, '2 (1 com BODY 8)', 'Não', '1.000eb', 'Autofogo (2) com −2; com BODY 8+, uma mão e Armas de uma Mão', 'Como a Crusher, mas o coice imenso dá −2 no teste de autofogo.'),
    weapon('Rostovic DB-4 Igla', 'Espingarda Power, exótica', 'padrão', 'Armas de Ombro', '3d6', '2 (cartucho, fixo)', 1, 2, 'Não', '100eb', 'Só cartucho de espingarda', 'Pente fixo de 2. Só dispara no modo cartucho de espingarda. Mesmo exótica, aceita munição especial.'),
    weapon('Rostovic DB-2 Testera', 'Espingarda Power, exótica', 'padrão', 'Armas Pesadas', '4d6', '2 (cartucho, fixo)', 1, 2, 'Não', '100eb', 'Só cartucho; os dois cartuchos juntos: 4d6', 'Usa Armas Pesadas. Só dispara cartucho; dá para disparar os dois de uma vez, e o dano sobe para 4d6. Aceita munição especial.'),
    weapon('Rostovic DB-2 Satara', 'Espingarda Tech, exótica', 'padrão', 'Armas de Ombro', '3d6 / 4d6', '2 (cartucho, fixo)', 1, 2, 'Não', '100eb', 'Só cartucho; carga Tech (tiro único)', 'Só dispara cartucho. Na carga Tech, dispara os dois cartuchos e causa 4d6 em vez de 3d6.'),
    weapon('Rostovic DB-4 Palica', 'Espingarda Smart, exótica', 'padrão', 'Armas de uma Mão', '3d6', '2 (cartucho, fixo)', 1, 1, 'Não', '1.000eb', 'Só cartucho; os dois canos aumentam o teste Smart', 'Exige Smart Link e usa Armas de uma Mão. Disparar os dois canos sobe o teste Smart para 12 + 1d10.'),
    weapon('Kang Tao L-69 Zhuo', 'Espingarda Smart, exótica', 'excelente', 'Armas Pesadas', '— (ver texto)', '4 (cartucho)', 1, 2, 'Não', '100eb', 'Só cartucho de espingarda', 'Exige Smart Link. Cada cartucho dispara 8 balas Smart: 12 + 1d10 em vez de 10 + 1d10.', 'a tabela do livro não traz dano e dá 100eb para uma arma excelente Smart; confira com a mesa.')
  ];
  const rifles = [
    weapon('Nokota D5 Copperhead', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não', '500eb', 'Autofogo (4); fogo supressivo', 'Rifle de assalto padrão com pente de 30.'),
    weapon('Arasaka Nowaki', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6', '24 (rifle)', 1, 2, 'Não', '500eb', 'Só rajada de três balas', 'Antecessor do Masamune. Sem autofogo nem fogo supressivo: só dispara em rajadas de três. Muito preciso: +1 em tiros únicos entre 13 e 50 m.'),
    weapon('Militech M251s Ajax', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não / Sim', '500eb', 'Autofogo (4); fogo supressivo; coronha dobrável', 'Vem com mira red dot, e a coronha dobrável permite esconder. Arma de soldado profissional: lenta, mas precisa, e não trava na lama.'),
    weapon('Arasaka HJSH-18 Masamune', 'Rifle de assalto Power', 'excelente', 'Armas de Ombro', '5d6', '24 (rifle)', 1, 2, 'Não', '500eb', 'Só rajada de três balas; funciona debaixo d\'água', 'Sucessor do Nowaki: sem autofogo nem supressão, só rajadas de três; +1 em tiros únicos entre 13 e 50 m. Feito para combate subaquático e dispara normalmente embaixo d\'água.'),
    weapon('Darra Polytechnic DA8 Umbra', 'Rifle de assalto Power, exótico', 'ruim', 'Armas de Ombro', '5d6', '45 (rifle)', 1, 2, 'Não', '100eb', 'Qualidade ruim; autofogo (4); fogo supressivo', 'Feito barato com material mais barato ainda: de quem não pode pagar nem um Copperhead. "Atire, mate, jogue fora."'),
    weapon('Tsunami Kyubi', 'Rifle de assalto Power, exótico', 'excelente', 'Armas de Ombro', '5d6', '20 (rifle)', 1, 2, 'Não', '1.000eb', 'Qualidade excelente', 'Sem autofogo nem supressão. A mira fixa dá +1 em tiros únicos ou mirados entre 13 e 50 m.'),
    weapon('Nokota D5 Sidewinder', 'Rifle de assalto Smart, exótico', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não / Sim', '1.000eb', 'Autofogo (4); fogo supressivo; coronha dobrável', 'Exige Smart Link. O irmão mais novo e mais esperto do Copperhead, de material melhor, mas longe das armas Smart da Arasaka e da Kang Tao.')
  ];
  const machineGuns = [
    weapon('Constitutional Arms M2067 Defender', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático', '—', '100 (rifle)', 1, 2, 'Não', '500eb', 'Autofogo (4); fogo supressivo; bipé', 'Não faz tiro único: só autofogo (tabela do rifle de assalto). Exige <b>BODY 6</b> ou mais, a menos que esteja montada.'),
    weapon('Midnight Arms MA70 HB', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático (o texto diz Armas Pesadas)', '4d6', '70 (rifle)', 1, 2, 'Não', '1.000eb', 'Autofogo (4); fogo supressivo; bipé', 'Faz tiro único e autofogo. Exige <b>BODY 6</b> ou mais, a menos que esteja montada.'),
    weapon('Militech Mk.31 HMG', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático', '—', '300', 1, 2, 'Não', 'ver nota', 'Autofogo (4); fogo supressivo; bipé', 'Não faz tiro único: só autofogo. Exige <b>BODY 11</b> ou mais, a menos que esteja montada. Recarregar leva duas Ações, em dois turnos.', 'a tabela do livro repete a da Defender (500eb, pente 100). Defina o preço com a mesa; o suplemento a trata como uma arma bem mais pesada.')
  ];
  const snipers = [
    weapon('Midnight Arms SOR-22', 'Rifle de precisão Power, exótico', 'padrão', 'Armas de Ombro', '6d6 (texto) / 5d6 (tabela)', '12 (texto) / 30 (tabela)', 1, 2, 'Não', '1.000eb', 'Só tiro único; mira de sniper; só munição perfurante', 'Rifle de precisão: sem autofogo nem supressão, um tiro por vez. Exige <b>BODY 6</b> ou mais, a menos que esteja montado, e recarregar leva duas Ações.', 'o texto e a tabela do livro não batem (dano e pente). O texto parece o certo.'),
    weapon('Militech M-179 Achilles', 'Rifle de precisão Tech, exótico', 'padrão', 'Armas de Ombro', '5d6', '9 (sem upgrade)', 1, 2, 'Não', '1.000eb', 'Carga Tech (tiro único); mira de sniper', 'Sem autofogo nem supressão. O preferido da <b>MaxTac</b> contra ciberpsicóticos, pelo dano e pela penetração de armadura.'),
    weapon('Techtronika SPT32 Grad', 'Rifle sniper Power, exótico', 'padrão', 'Armas Pesadas', '6d6', '4', 1, 2, 'Não', '1.000eb', 'Mira de sniper; só munição perfurante', 'Usa Armas Pesadas e causa 6d6. Exige <b>BODY 11</b> ou mais, a menos que esteja montado. Recarregar leva duas Ações, em dois turnos.'),
    weapon('Tsunami Nekomata', 'Rifle sniper Tech, exótico', 'excelente', 'Armas de Ombro', '5d6', '4 (sem upgrade)', 1, 2, 'Não', '5.000eb', 'Qualidade excelente; carga Tech (tiro único); mira de sniper', 'O sniper Tech de ponta.'),
    weapon('Tsunami Ashura', 'Rifle sniper Smart, exótico', 'excelente', 'Armas de Ombro', '5d6', '1', 1, 2, 'Não', '1.000eb', 'Qualidade excelente', 'Exige Smart Link. Com pente de uma bala só, só faz tiro único.')
  ];

  // ---------------- Cyberware ----------------
  const ware = (name, category, install, cost, humanity, text, tip) => ({ name, tag: category, stats: [['Instalação', install], ['Custo', cost], ['Perda de Humanidade', humanity]], text, tip, raw: { name, category, install, cost, humanity, text, tip } });
  const fashionware = [
    ware('Cyber Panels', 'Fashionware', 'Loja', '500eb', 0, 'Cobre as partes feias do cromo e deixa o conjunto com cara de peça única, com as linhas dos painéis visíveis. Vem com cobertura de plástico; RealSkinn ou Superchrome custam à parte (o RealSkinn interage com Chemskin).'),
    ware('Cybernetic Fashion', 'Fashionware', 'Clínica', '100eb', 0, 'Cibernética decorativa: mandíbula, suporte de máscara facial, substitutos visuais de partes do corpo. Cada peça vem com o suporte e a peça de moda.')
  ];
  const neural = [
    ware('Adrenaline Converter', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Converte adrenalina em ação imediata: <b>+2 na iniciativa</b>.'),
    ware('Kerenzikov (2077)', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 14, 'Speedware sempre ligado, com reação e movimento melhores: <b>+1 em tiros mirados</b> (acumula com a Targeting Scope).', 'no RED o Kerenzikov dá +2 de iniciativa; em 2077 ele muda de função.'),
    ware('Reflex Tuner', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Coprocessador de emergência: depois de ser atingido, <b>+1 para se esquivar</b> pelo resto da rodada.'),
    ware('Stabber', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Corrige o alinhamento da lâmina no meio do golpe: <b>+1 de dano com armas de lâmina</b>.'),
    ware('Synaptic Accelerator', 'Neuralware (opção do Neural Link)', 'Clínica', '1.000eb', 7, 'Dispara as sinapses em resposta a estímulo negativo: <b>uma vez por hora</b>, pode rolar de novo uma falha crítica num teste físico, e fica com o novo resultado.'),
    ware('Visual Cortex Support', 'Neuralware (opção do Neural Link)', 'Clínica', '1.000eb', 7, 'Melhora o processamento visual: lê lábios automaticamente nos idiomas que conhece e ganha <b>+1 em Percepção</b>.')
  ];
  const optics = [
    ware('Basic Kiroshi Optics', 'Cyberóptico (base)', 'Clínica', '100eb (o par)', 14, 'Par de olhos artificiais com <b>Scan Mode</b>, zoom de 4×, Chyron e Virtuality embutidos. Dois slots de opção para cyberolho.'),
    ware('TeleOptics (2077)', 'Cyberóptico (opção)', 'Clínica', '500eb', 3, 'Zoom de até 27×. Contra alvos a 51 m ou mais, <b>+1 em tiro único ou mirado</b>. Instalar mais de um não soma, e não acumula com a Sniping Scope da arma. Exige cyberolho.')
  ];
  const internal = [
    ware('Biomonitor (2077)', 'Cyberware interno', 'Clínica', '1.000eb', 3, 'Monitora os sinais vitais e pode mandar os dados à Trauma Team pelo cartão. Guarda químicos médicos que dispara quando você fica Gravemente ou Mortalmente Ferido (definido antes) para tentar te estabilizar sozinho: <b>+6 no teste de estabilização</b>. Leva 24 horas para recarregar.'),
    ware('Blood Pump', 'Cyberware interno', 'Hospital', '1.000eb', 7, 'Oxigena o sangue mais rápido: a cura natural fica <b>1,5 vez mais rápida</b>.'),
    ware('Clutch Padding', 'Cyberware interno', 'Clínica', '500eb', 3, 'Reserva de sangue oxigenado liberada em trauma grave: ignora o <b>primeiro aumento da penalidade do Death Save</b>. Depois, 24 horas para recarregar.'),
    ware('Dense Marrow', 'Cyberware interno', 'Hospital', '5.000eb', 14, 'Medula biônica: mais peso e força, à custa de velocidade. Com armas brancas (exceto leves), a CDT não passa de 1, mas o golpe causa <b>1 dado a mais</b> de dano. Incompatível com Microrotors.'),
    ware('Epimorphic Skeleton / Titanium Bones', 'Cyberware interno', 'Clínica', '1.000eb', 14, 'Funciona como o <b>Grafted Muscle and Bone Lace</b> do RED (+2 BODY, até 10).'),
    ware('Feedback Circuit', 'Cyberware interno', 'Clínica', '500eb', 7, 'Capacitores que convertem EMP e corrente elétrica em energia para arma Tech: quando você sofre EMP ou choque, o efeito é anulado e o <b>próximo tiro com arma Tech atravessa 100% da cobertura fina</b>. Depois precisa de uma hora para esfriar.'),
    ware('Kinetic Frame / Scarab', 'Cyberware interno', 'Hospital', '1.000eb', 7, 'Reforço e travamento do esqueleto: <b>+1 de SP</b> se você não se moveu.'),
    ware('Microrotors', 'Cyberware interno', 'Clínica', '1.000eb', 7, 'Rotores nos ombros: <b>+1 na CDT</b> com armas brancas muito pesadas.'),
    ware('ThreatEvac', 'Cyberware interno', 'Clínica', '1.000eb', 7, 'Coagulantes e inibidores de dor: ao ficar Gravemente Ferido, ativa e você ignora os efeitos do estado de ferimento e das lesões críticas por <b>dois turnos</b>. Não impede o dano extra das lesões. Recarrega em 24 horas.')
  ];
  const external = [
    ware('Skin Weave', 'Cyberware externo (placa base)', 'Hospital', '500eb', 7, 'Placa base com <b>SP 7</b> no corpo e na cabeça e <b>dois slots de placa</b>, que não ocupam os slots de cyberware externo. As opções de placa param de funcionar se todo o SP for ablado.', 'o suplemento não dá o SP das placas base, então vale o do livro-base: SP 7 aqui e SP 11 no Subdermal Armour. O Skin Weave troca 4 de SP por um slot a mais.'),
    ware('Subdermal Armour (2077)', 'Cyberware externo (placa base)', 'Hospital', '1.000eb', 14, 'Placa base com <b>SP 11</b> no corpo e na cabeça e <b>um slot de placa</b>, que não ocupa slot de cyberware externo. A opção de placa para se todo o SP for ablado.', 'o SP é o do Subdermal Armor do livro-base, porque o suplemento não dá o das placas base. Comparado ao Skin Weave: +4 de SP e um slot a menos.'),
    ware('Carapace', 'Opção de placa', 'Hospital', '500eb', 7, 'Placas extras nas laterais e nas costas: <b>+1 de SP</b> contra ataques de lado ou de trás. Exige Skin Weave ou Subdermal Armour.'),
    ware('Countershell', 'Opção de placa', 'Hospital', '1.000eb', 14, 'Placa de fluido não newtoniano que endurece com o impacto: quando você sofreria uma <b>lesão crítica</b>, ignora a lesão e sofre só o dano. Para funcionar de novo, a placa base precisa se recuperar naturalmente. Exige Skin Weave ou Subdermal Armour.'),
    ware('Nano-plating', 'Opção de placa', 'Hospital', '500eb', 7, 'Placa de nanopartículas ativada por trauma e movimento: <b>+1 de SP</b> depois de ser atingido ou de se mover, até o início do seu próximo turno. Exige Skin Weave ou Subdermal Armour.'),
    ware('ProxiShield', 'Opção de placa', 'Clínica', '1.000eb', 7, 'Malha reativa nas partes mais atingidas em corpo a corpo: <b>+1 de SP contra ataques corpo a corpo</b>. Exige Skin Weave ou Subdermal Armour.'),
    ware('RangeGuard', 'Opção de placa', 'Hospital', '500eb', 7, 'Placa reativa contra projéteis rápidos: <b>+1 de SP contra ataques à distância</b>. Exige Skin Weave ou Subdermal Armour.'),
    ware('Optical Camo', 'Cyberware externo', 'Hospital', '1.000eb', 14, 'Dobra a luz visível em volta do corpo e do equipamento. Ativada com uma Ação: você fica <b>invisível</b> no espectro visível, impossível de ver a olho nu ou pelo scan nesse modo. Dura 3 rodadas ou até desativar (uma Ação). Depois precisa de um minuto para recarregar.'),
    ware('Pain Editor (2077)', 'Cyberware externo', 'Clínica', '1.000eb', 14, 'Versão interna do chipware Pain Editor do RED (ignora as penalidades de Gravemente Ferido).'),
    ware('Painducer', 'Cyberware externo', 'Clínica', '5.000eb', 14, 'Malha que desvia o sinal de dor: ao sofrer dano, você sofre <b>metade na hora e a outra metade no início do seu próximo turno</b>. Só vale para o último dano recebido: se for atingido de novo, o dano anterior entra inteiro e só o último é dividido.')
  ];
  const limbs = [
    ware('Ballistic Coprocessor', 'Opção de cyberbraço', 'Clínica', '100eb', 3, 'Liga arma e óptica para acompanhar munição e trajetória: <b>+2 no teste de ricochete</b>. Pode ser a única peça de cyberware num braço de carne.'),
    ware('Gorilla Arms', 'Cyberbraços (par)', 'Clínica', '500eb (o par)', '7 (uma vez)', 'Músculos sintéticos de liga com memória de forma. Ataques de <b>Briga</b> contam como ataque de arma contra armadura e causam <b>3d6</b>; +2 em Atletismo com os braços. Com RealSkinn, dá para esconder sem teste. Exige dois cyberbraços, em par.'),
    ware('Mantis Blades', 'Cyberbraços (par)', 'Clínica', '500eb (o par)', '7 (uma vez)', 'Lâminas de carbovidro retráteis no antebraço: <b>arma branca pesada (3d6, CDT 2)</b>, escondida sem teste com RealSkinn. Com a lâmina estendida, a mão do braço não segura nada. Com as duas estendidas, você pode <b>saltar</b> num alvo ao alcance como parte do ataque. Exige dois cyberbraços, em par.'),
    ware('Microgenerator', 'Opção de cyberbraço', 'Clínica', '500eb', 3, '<b>+1 no segundo ataque corpo a corpo</b> depois do primeiro. Exige cyberbraço.'),
    ware('Monowire', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, 'Fio monofilamento de chicote, com um gume de uma molécula: <b>arma branca média (2d6, CDT 2)</b>, escondida sem teste. <b>Abla 1 de armadura</b> acertando ou não. Serve para agarrar e estrangular (metade do dano rolado direto no HP). Pode ser a única peça num braço de carne.'),
    ware('Projectile Launch System', 'Opção de cyberbraço', 'Clínica', '500eb', 7, 'Lança-mísseis integrado: um <b>lança-mísseis exótico</b>, escondido com RealSkinn. Recarregar leva duas Ações, em dois turnos. Exige cyberbraço e ocupa dois slots.'),
    ware('Shock Absorber', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, '<b>+2 no teste de autofogo</b>. Exige cyberbraço e ocupa dois slots.'),
    ware('Smart Link', 'Opção de cyberbraço', 'Clínica', '100eb', 3, 'Permite usar <b>armas Smart</b> e liga o implante óptico ao sistema da arma, com dados em tempo real. Pode ser a única peça num braço de carne.'),
    ware('Fortified Ankle / Jump Boost', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tornozelo reforçado com fibras e cápsulas de nanogel: funciona como o <b>Jump Booster</b> do RED. Exige duas cyberpernas, ocupa dois slots, em par.'),
    ware('Jenkins\' Tendons', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tendões artificiais de resposta rápida: <b>+2 de MOVE</b> andando em linha reta. Pode ser a única peça numa perna de carne; em par.'),
    ware('Leeroy Ligament System', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Revisão completa dos ligamentos: <b>+2 de MOVE</b>. Exige duas cyberpernas, ocupa dois slots, em par.'),
    ware('Lynx Paws', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tecido biomecânico nos músculos da perna: <b>+2 em Furtividade</b> para se mover em silêncio. Pode ser a única peça numa perna de carne; em par.'),
    ware('Reinforced Tendons', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'No meio do salto, com uma Ação, você muda a direção ou sobe mais 2 m. Exige duas cyberpernas, ocupa dois slots, em par.')
  ];

  const pages = {
    weapons2077: {
      eyebrow: 'Catálogo / suplemento 2077', title: 'Armas de 2077',
      lede: 'As armas modernas de 2077 são modelos com nome e sobrenome, divididas em três tipos: Power (pólvora, com ricochete), Tech (railgun, com carga) e Smart (guiadas, com Smart Link). Aqui estão as regras de cada tipo e os 46 modelos do suplemento.',
      html: `${section('Os três tipos', 'sup. p. 31–32', `${list(['<b>Power:</b> a arma de fogo clássica, com calibre para ricochetear. Todas têm o modo alternativo <b>Ricochete</b>.', '<b>Tech:</b> railgun miniaturizado. Todas são exóticas, não aceitam pente maior e usam flechettes equivalentes à munição perfurante das Power (no preço e na ablação). Todas têm a <b>carga Tech</b>.', '<b>Smart:</b> balas guiadas. Exigem o cyberware <b>Smart Link</b>.'])}${button('cyberware2077', 'Ver Smart Link e o resto do cyberware')}`)}
        ${section('Ricochete (Power)', 'sup. p. 32', list(['Acerta um alvo atrás de cobertura, se você sabe onde ele está, ricocheteando <b>um tiro único</b>. Armas que não disparam menos de três balas não ricocheteiam com precisão.', 'Usa a perícia da arma, mas a DV vem da <b>tabela de autofogo</b> em vez da de alcance (pistolas usam a linha da SMG).', 'Alvos com REF 8+ podem se esquivar.', 'Se acertar, role <b>um dado a menos</b> de dano.', 'O Ballistic Coprocessor dá +2 no teste de ricochete.']))}
        ${section('Carga Tech', 'sup. p. 32', `${list(['<b>Tiro único:</b> como parte da Ação de ataque, você segura o gatilho e carrega os capacitores para um tiro mais forte. Depois, a arma precisa de uma rodada para esfriar antes da próxima carga.', 'A carga atravessa <b>cobertura fina</b>: metade do dano fica na cobertura e metade passa para o alvo. Atravessa <b>25% da cobertura grossa</b>. Nos dois casos, se causar dano, a armadura perde 2 de SP.', 'Contra um alvo sem cobertura, se causar dano, a armadura perde <b>4 de SP</b> em vez de 2.', '<b>Rajada:</b> como parte do ataque, carrega um autofogo mais forte, com a tabela de autofogo da SMG. Atravessa só 25% da cobertura fina; abla 2 (ou 4 sem cobertura) se causar dano.'])}`)}
        ${section('Armas Smart', 'sup. p. 30 e 32–50', `${list(['Só funcionam com o cyberware <b>Smart Link</b> (100eb).', 'Pelas descrições das armas, o ataque Smart é um <b>teste de 10 + 1d10</b>; os modelos que disparam várias balas Smart sobem para <b>12 + 1d10</b>.'])}<div class="callout">O suplemento não tem um parágrafo com a regra geral das armas Smart: o "10 + 1d10" sai das descrições das próprias armas. Combine com a mesa se ele substitui REF + perícia ou é uma alternativa a ele.</div>`)}
        ${section('Qualidade das armas', '342', list(['<b>Ruim:</b> emperra numa <b>falha crítica</b> (1 no dado de ataque); é preciso uma Ação para desemperrar.', '<b>Excelente:</b> <b>+1 no ataque</b>.', 'Armas exóticas são sempre de qualidade padrão, a não ser que a descrição diga outra coisa.', 'Armas de longo alcance que não são exóticas têm 3 slots de acessório.']))}
        ${section('Pistolas', 'sup. p. 32–35', grid(pistols))}
        ${section('Revólveres e pistolas muito pesadas', 'sup. p. 35–37', grid(revolvers))}
        ${section('Submetralhadoras', 'sup. p. 38–40', grid(smgs))}
        ${section('Espingardas', 'sup. p. 40–44', grid(shotguns))}
        ${section('Rifles de assalto', 'sup. p. 44–47', grid(rifles))}
        ${section('Metralhadoras', 'sup. p. 47–48', grid(machineGuns))}
        ${section('Rifles de precisão e sniper', 'sup. p. 48–50', grid(snipers))}
        ${section('Veja também', '', `<p>${button('economy', 'Preços de 2077 por classe')} ${button('gear', 'Armas genéricas do RED')}</p><p class="note-status">O suplemento não traz armas brancas, arcos nem lança-granadas: para esses, vale o RED.</p>`)}`
    },

    cyberware2077: {
      eyebrow: 'Catálogo / suplemento 2077', title: 'Cyberware de 2077',
      lede: 'Boa parte do cromo do RED continua em uso, só mais bonito, e há muita coisa nova. Aqui está o cyberware novo do suplemento, com custo, local de instalação e perda de Humanidade. A neuralware de netrunning fica na página de Netrunning de 2077.',
      html: `${section('Antes de instalar', 'sup. p. 8 e 27', `${list(['Em 2077, quase todo mundo tem algum cromo desde cedo. Todo personagem pode começar com, de graça e sem perda de Humanidade: <b>Neural Link</b>, <b>Cyberaudio Suite</b>, <b>Internal Agent</b>, <b>Personal Link</b> e <b>dois Chipware Sockets</b>.', 'O Neural Link tem um único slot de <b>sistema operacional</b>: Cyberdeck, Berserk ou Sandevistan.', 'Onde instalar: <b>Loja</b> (DV13, 100eb), <b>Clínica</b> (DV15, 500eb), <b>Hospital</b> (DV17, 1.000eb). Veja Dano, ferimentos e cura.', 'Itens com o mesmo nome de um do RED (Kerenzikov, TeleOptics, Biomonitor) mudaram: vale a versão de 2077.'])}<p>${button('os2077', 'Berserk e Sandevistan')} ${button('net2077', 'Neuralware de netrunning')}</p>`)}
        ${section('Fashionware', 'sup. p. 27', grid(fashionware))}
        ${section('Neuralware', 'sup. p. 27', `<p>Opções do Neural Link. Todas exigem Neural Link.</p>${grid(neural)}`)}
        ${section('Cyberópticos', 'sup. p. 27–28', grid(optics))}
        ${section('Cyberware interno', 'sup. p. 28–29', `<p>Sete slots de opção interna disponíveis.</p>${grid(internal)}`)}
        ${section('Cyberware externo e placas', 'sup. p. 29', `<p>Sete slots de opção externa. As placas (Carapace, Countershell...) exigem uma placa base: Skin Weave ou Subdermal Armour.</p>${grid(external)}`)}
        ${section('Cybermembros', 'sup. p. 30', grid(limbs))}`
    },

    roles2077: {
      eyebrow: 'Suplemento 2077 / Roles', title: 'Roles de 2077',
      lede: 'Em 2077 são nove Roles: Face, Solo, Netrunner, Corpo, Tech, Medtech, Media, Lawman e Nomad. O Rockerboy vira uma especialização do Face, o Exec e o Fixer se juntam no Corpo, e o Lawman troca os reforços por investigação.',
      html: `${section('Resumo', 'sup. p. 2–6', table(['Role', 'Habilidade', 'Em relação ao RED'], [
          ['<b>Face</b>', 'Impacto Carismático', 'Substitui o Rockerboy. Nova tabela de influência e três especializações: Siren, Rockerboy e Model.'],
          ['<b>Solo</b>', 'Consciência de Combate', 'Igual.'],
          ['<b>Netrunner</b>', 'Interface', 'Soma o Rank nos testes técnicos de netrunning, ganha RAM e slots extras, e ações extras fora de uma Arquitetura entram numa fila.'],
          ['<b>Corpo</b>', 'Teamwork + Operator', 'Junta o Exec e o Fixer, sem a equipe do Exec e com o Grease mais curto.'],
          ['<b>Tech</b>, <b>Medtech</b>, <b>Media</b>', 'Maker, Medicine, Credibility', 'Iguais.'],
          ['<b>Lawman</b>', 'Investigator', 'Perde Backup (os reforços) e ganha Investigator.'],
          ['<b>Nomad</b>', 'Moto', 'Upgrades e reparos pela metade do preço com o clã.']
        ]))}
        ${section('Face', 'sup. p. 3–4', `<p>O representante persuasivo: nas ruas, nos lençóis e nas reuniões corporativas. Convence o outro lado a baixar as armas, agita a multidão ou distrai o alvo por umas horas.</p>${list(['<b>Teste de Impacto Carismático:</b> Rank + 1d10, e precisa superar o DV: <b>8</b> para uma pessoa, <b>10</b> para um grupo pequeno (até 6 pessoas), <b>12</b> para um grupo enorme.', 'O Rank define quem você consegue influenciar e o tamanho do favor.'])}<h4>Especializações</h4>${table(['Especialização', 'Soma o Rank de Impacto Carismático em'], [['<b>Siren</b>', 'Conversação e Cuidados Pessoais'], ['<b>Rockerboy</b>', 'Tocar Instrumento e Manha (Streetwise)'], ['<b>Model</b>', 'Atuação e Comércio (Trading)']])}<h4>O que o Face consegue, por Rank</h4>${table(['Rank', 'Quem você influencia', 'Uma pessoa (DV8)', 'Grupo pequeno, até 6 (DV10)', 'Grupo enorme (DV12)'], [
          ['<b>1–2</b>', 'Gente da rua', 'Um pequeno favor: pagar um drink ou uma refeição, dar uma carona.', 'Um grupo para pedir pequenos favores e bater papo; gente para você na rua para fazer amizade.', 'Nem pense: você ainda não tem grupos enormes de amigos.'],
          ['<b>3–4</b>', 'Quem está por dentro', 'Um grande favor: ir para a cama com você, falar bem de você.', 'Andam com você regularmente e trazem bebida, drogas e outros mimos de festa.', 'Uma rede local forte: passam informação e apoio de bom grado.'],
          ['<b>5–6</b>', 'Quem <i>é</i> o "por dentro"', 'Cometer um crime menor por você, furtar algo pequeno ou ajudar numa briga.', 'Viram a sua comitiva: sempre por perto, fazem favores e cuidam das suas necessidades.', 'Amigos pela cidade inteira, às vezes em cidades vizinhas, que conseguem grandes favores em troca da sua companhia ou atenção.'],
          ['<b>7–8</b>', 'Celebridades e figurões médios', 'Arriscar a vida por você sem pedir muito em troca.', 'Cometer um crime menor por você, furtar algo pequeno ou ajudar numa briga.', 'Redes sólidas e leais: passam informação o tempo todo, vêm ajudar se estiverem por perto e se unem.'],
          ['<b>9</b>', 'Grandes celebridades, figurões e senadores', 'Cometer um crime grave: roubar algo caro, quebrar joelhos, ameaçar alguém.', 'Cometer um crime grave por você: roubar algo caro, quebrar joelhos, ameaçar alguém.', 'Recorrer à rede para quase tudo: uma gangue, extrações, eliminações e apoio.'],
          ['<b>10</b>', 'Quase todo mundo', 'Arriscar a vida por você, seja qual for o perigo.', 'Arriscar a vida por você, como guarda-costas e soldados.', 'Um exército pessoal à disposição: você mexe os pauzinhos com poucos holos.']
        ])}`)}
        ${section('Solo', 'sup. p. 5', '<p>Sem mudanças: os Solos de 2077 são como os do RED. Consciência de Combate funciona igual.</p>')}
        ${section('Netrunner', 'sup. p. 5', `<p>O deck agora faz parte do runner: um sistema operacional dedicado, sem precisar se plugar num ponto de acesso. Por isso a Interface mudou em alguns pontos.</p>${list(['<b>Bônus de netrunning:</b> soma o Rank de Interface em <b>todos os testes técnicos</b> enquanto estiver correndo a NET.', '<b>RAM extra:</b> metade do Rank de Interface, arredondada para baixo (mínimo 1).', '<b>Slots extras:</b> um slot de programa ou daemon nos Ranks <b>3, 6 e 9</b> (máximo 3).', '<b>Ações de NET:</b> as de sempre, mas, <b>fora de uma Arquitetura</b>, mais de uma ação de NET no mesmo alvo (objeto ou pessoa) entra numa <b>fila</b>. A RAM dela já sai do total, e ela acontece no início do seu próximo turno.'])}<p>${button('net2077', 'Netrunning de 2077 completo')} ${button('quickhacks', 'Quickhacks e daemons')}</p>`)}
        ${section('Corpo', 'sup. p. 5–6', `<p>O corporativo que não tem medo de sujar as mãos: terno e gravata, um pé no brilho das corps e outro na rua. Junta as habilidades do Exec (Teamwork) e do Fixer (Operator) do RED, com estas mudanças:</p><h4>Teamwork (do Exec)</h4>${list(['<b>Signing Bonus</b>, <b>Corporate Housing</b> e <b>Corporate Health Insurance</b>: iguais.', '<b>Team Members: removido.</b> O Corpo tem colegas de equipe da corporação enquanto eles não pisarem na bola, e não há amor entre eles.'])}<h4>Operator (do Fixer)</h4>${list(['<b>Contacts</b> e <b>Haggle</b>: iguais.', '<b>Reach:</b> igual, menos para montar Night Markets, que o Corpo só faz junto com fixers. Fixers não gostam muito de Corpos, e o Corpo <b>não pode agenciar trabalhos</b> como um fixer: a rua não aceita.', '<b>Grease:</b> um grupo nos Ranks <b>1, 4 e 7</b>, escolhido entre Corpos, Gangues, Edgerunners, Mercadores, Nômades e Netrunners. Funciona também com indivíduos de fora desses grupos.'])}`)}
        ${section('Tech, Medtech e Media', 'sup. p. 6', '<p>Pouca coisa mudou: ferro é ferro, cromo sempre vai precisar de instalação e carne de pontos, e as megacorps vão continuar enterrando o que a Media quer desenterrar. Maker, Medicine e Credibility funcionam como no RED.</p>')}
        ${section('Lawman', 'sup. p. 6', `<p>Pedir reforço não é coisa para o policial que segue os próprios casos e mete o nariz onde não deve, ainda mais com a polícia em estilo corporativo. O Lawman <b>perde Backup</b> e ganha <b>Investigator</b>.</p>${list(['<b>Casos ativos:</b> 1 no Rank 1, 2 no Rank 4 e 3 no Rank 7.', '<b>Trocar de caso:</b> só no tempo livre, levando mais ou menos um dia para se familiarizar.', '<b>Bônus de caso:</b> soma o Rank de Investigator nos testes de <b>Educação</b> e <b>Percepção</b> quando acha que está lidando com uma pista de um caso ativo. Se o mestre disser que não tem relação, o Lawman sabe que não é pertinente. Vale por sessão até o Rank de Investigator.'])}<h4>Especializações</h4>${table(['Especialização', 'O bônus de caso também vale em'], [['<b>Street Cop</b>', 'Manha (Streetwise), Atletismo e Suborno'], ['<b>Undercover</b>', 'Atuação, Furtividade e Guarda-roupa e Estilo'], ['<b>Interrogator</b>', 'Interrogatório, Persuasão e Percepção Humana']])}`)}
        ${section('Nomad', 'sup. p. 6', '<p>Levar coisas de A para B sempre vai ser preciso, e o Nomad é quem faz acontecer. <b>Mudança:</b> com o próprio clã, upgrades e reparos saem pela <b>metade do preço</b>, se ele não tiver estragado a relação.</p>')}
        ${section('Veja também', '', `<p>${button('roles', 'Roles do RED')} ${button('advancement', 'Avanço e Pontos de Melhoria')}</p>`)}`
    },

    // Resumo do suplemento (antes ficava no index.html).
    supplement2077: {
      eyebrow: 'Variante comunitária / não oficial', title: '2077: suplemento de fã',
      lede: 'O arquivo fornecido é um suplemento de Queen Otter para adaptar RED à era de 2077. Use como conjunto opcional de regras; ele modifica partes do livro-base e não é uma publicação oficial.',
      html: `<div class="callout"><b>Compatibilidade:</b> escolha com o grupo se esta variante está ativa. As alterações abaixo substituem regras RED específicas; não some as duas versões automaticamente.</div>
      <div class="section"><h3>Roles na variante</h3><p>Nove Roles em 2077: Face, Solo, Netrunner, Corpo, Tech, Medtech, Media, Lawman e Nomad. O Rockerboy vira especialização do Face, o Exec e o Fixer viram o Corpo, e o Lawman troca Backup por Investigator.</p><button class="action" data-page="roles2077" type="button">Roles de 2077 completo</button></div>
      <div class="section"><h3>Interface, RAM e ação de NET</h3><p>Na versão do suplemento, Interface também fornece bônus de Netrunner em ações técnicas de netrunning. RAM adicional é calculada pelo rank, e novos slots de programa/Daemon aparecem em marcos da habilidade.</p><p>Fora de uma NET Architecture, ações de NET adicionais feitas contra o mesmo alvo entram numa fila para o turno seguinte; o custo de RAM fica reservado. Isso muda o ritmo do hacking em comparação ao livro-base.</p><button class="action" data-page="net2077" type="button">Netrunning de 2077 completo</button> <button class="action" data-page="quickhacks" type="button">Quickhacks e daemons</button></div>
      <div class="section"><h3>Rede da cidade em 2077</h3><div class="table-wrap"><table><thead><tr><th>Conceito</th><th>Uso na mesa</th></tr></thead><tbody><tr><td>Citinet</td><td>Rede pública ampla da cidade e camada de serviços conectados.</td></tr><tr><td>Localnet</td><td>Rede privada que liga pessoas, feeds e dispositivos de um grupo ou local.</td></tr><tr><td>Subnet</td><td>Segmento conectado a uma rede maior; pode concentrar câmeras, portas, luzes e torretas.</td></tr><tr><td>NET Architecture</td><td>Sistema de servidores com andares e defesas próprias, ainda usado para infraestrutura crítica.</td></tr></tbody></table></div><p>Acesso a uma Localnet é uma via de ataque e também uma via de exposição: um runner pode alcançar feeds e sistemas conectados, mas a rede pode conter Black ICE e outros participantes.</p></div>
      <div class="section"><h3>Operating Systems e chrome inicial</h3><p>O suplemento trata o cyberdeck como cyberware integrado ao Neural Link e organiza Operating Systems como opções do implante. As linhas citadas incluem Berserk, Cyberdeck e Sandevistan; cada uma ocupa a opção correspondente e segue seus próprios efeitos.</p><p>Como pacote inicial opcional de 2077, o texto propõe Neural Link, Cyberaudio Suite, Internal Agent, Personal Link e dois Chipware Sockets sem custo e sem Humanity Loss inicial. Isso é uma regra desta variante, não a criação padrão do livro-base.</p><button class="action" data-page="os2077" type="button">Modelos de Berserk e Sandevistan</button></div>
      <div class="section"><h3>Armas e cyberware de 2077</h3><p>O suplemento troca as armas genéricas por modelos (Power, Tech e Smart) e traz cyberware novo: Gorilla Arms, Mantis Blades, Monowire, Optical Camo, placas e muito mais.</p><button class="action" data-page="weapons2077" type="button">Armas de 2077</button> <button class="action" data-page="cyberware2077" type="button">Cyberware de 2077</button></div>
      <div class="section"><h3>Economia e estilo</h3><p>As categorias de preço sobem um degrau (Barato passa a 20eb), mas as listas do suplemento mantêm quase todos os preços em eurobucks do RED e só trocam o nome da categoria. O Kibble some, o Prepak genérico custa 100eb, o hustle rende 1,5× e a moda se divide em quatro estilos: Entropismo, Kitsch, Neomilitarismo e Neokitsch.</p><button class="action" data-page="economy" type="button">Abrir a economia de 2077</button></div>
      <div class="callout">Para uma ficha de campanha, marque cada regra adotada como <b>RED</b> ou <b>2077 opcional</b>. Isso evita diferenças de Role, cyberware, custo e netrunning no meio de uma sessão.</div>`
    }
  };

  // ---------------- Tabela comparável (Cartões | Tabela) ----------------
  // O wiki-app.js chama page.setup(content, { openPage, storage, escapeHtml }) depois de montar a página.
  const slug = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const firstNumber = text => { const match = String(text).replace(/\.(?=\d{3})/g, '').match(/\d+/); return match ? Number(match[0]) : -1; };
  // columns: [rótulo, valor(linha), tipo de ordenação ('texto' | 'numero')]; filters: [rótulo, valor(linha)]
  function compareTable({ pageId, rows, columns, filters, noun }) {
    return (content, { openPage, storage, escapeHtml, target }) => {
      const storageKey = `vista-${pageId}`;
      const state = { sort: null, desc: false, filters: Object.fromEntries(filters.map(([label]) => [label, ''])) };
      const cardParts = [...content.querySelectorAll(':scope > .section')];
      const bar = document.createElement('div');
      bar.className = 'view-switch';
      bar.innerHTML = `<span class="page-toc-label">Ver como</span><button type="button" data-view="cards">Cartões</button><button type="button" data-view="table">Tabela</button>`;
      const panel = document.createElement('div');
      panel.className = 'section compare-panel';
      panel.dataset.unitSkip = '';
      panel.hidden = true;
      panel.innerHTML = `<h3>Comparar</h3><div class="compare-filters">${filters.map(([label, valueOf]) => {
        const options = [...new Set(rows.map(valueOf))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        return `<label>${label}<select data-filter="${escapeHtml(label)}"><option value="">Todas</option>${options.map(option => `<option>${escapeHtml(option)}</option>`).join('')}</select></label>`;
      }).join('')}<span class="note-status compare-count"></span></div><div class="table-wrap dense"><table class="compare-table"><thead><tr>${columns.map(([label], index) => `<th><button type="button" data-sort="${index}">${label}</button></th>`).join('')}</tr></thead><tbody></tbody></table></div><p class="note-status">Clique no cabeçalho para ordenar e numa linha para abrir o cartão.</p>`;
      content.querySelector('.lede').after(bar, panel);

      const render = () => {
        let list = rows.filter(row => filters.every(([label, valueOf]) => !state.filters[label] || valueOf(row) === state.filters[label]));
        if (state.sort !== null) {
          const [, valueOf, type] = columns[state.sort];
          list = [...list].sort((a, b) => {
            const order = type === 'numero' ? firstNumber(valueOf(a)) - firstNumber(valueOf(b)) : String(valueOf(a)).localeCompare(String(valueOf(b)), 'pt-BR');
            return state.desc ? -order : order;
          });
        }
        panel.querySelector('tbody').innerHTML = list.map(row => `<tr data-card="${escapeHtml(slug(row.name))}">${columns.map(([, valueOf]) => `<td>${escapeHtml(valueOf(row))}</td>`).join('')}</tr>`).join('');
        panel.querySelector('.compare-count').textContent = `${list.length} de ${rows.length} ${noun}`;
        panel.querySelectorAll('[data-sort]').forEach(button => {
          const active = Number(button.dataset.sort) === state.sort;
          button.classList.toggle('active', active);
          button.dataset.dir = active ? (state.desc ? '▼' : '▲') : '';
        });
      };
      const setView = view => {
        const table = view === 'table';
        panel.hidden = !table;
        cardParts.forEach(part => { part.hidden = table; });
        const toc = content.querySelector('.page-toc');
        if (toc) toc.hidden = table;
        bar.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
        storage.set(storageKey, view);
        if (table) render();
      };
      bar.addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (button) setView(button.dataset.view); });
      panel.addEventListener('change', event => { const select = event.target.closest('[data-filter]'); if (select) { state.filters[select.dataset.filter] = select.value; render(); } });
      panel.addEventListener('click', event => {
        const sortButton = event.target.closest('[data-sort]');
        if (sortButton) {
          const index = Number(sortButton.dataset.sort);
          // Primeiro clique: números do maior para o menor, textos de A a Z.
          state.desc = state.sort === index ? !state.desc : columns[index][2] === 'numero';
          state.sort = index;
          render();
          return;
        }
        const row = event.target.closest('tr[data-card]');
        if (row) { storage.set(storageKey, 'cards'); openPage(pageId, { section: row.dataset.card }); }
      });
      // buildToc roda depois do setup: espera o próximo instante para esconder a barra "Nesta página" na vista de tabela.
      // Abrindo direto num cartão (busca, link, índice), mostra os cartões.
      setTimeout(() => setView(!target && storage.get(storageKey) === 'table' ? 'table' : 'cards'), 0);
    };
  }

  const weaponRows = Object.values({ pistols, revolvers, smgs, shotguns, rifles, machineGuns, snipers }).flat().map(entry => entry.raw);
  const weaponClass = row => /smart/i.test(row.kind) ? 'Smart' : /tech/i.test(row.kind) ? 'Tech' : 'Power';
  const weaponType = row => row.kind.replace(/\s+(Power|Tech|Smart)/, '').replace(/, exótic[ao]$/, '');
  pages.weapons2077.setup = compareTable({
    pageId: 'weapons2077', rows: weaponRows, noun: 'armas',
    columns: [['Arma', row => row.name], ['Tipo', weaponType], ['Classe', weaponClass], ['Qualidade', row => row.quality], ['Perícia', row => row.skill.split(' (')[0]],
      ['Dano', row => row.damage, 'numero'], ['CDT', row => String(row.rof), 'numero'], ['Pente', row => row.magazine, 'numero'], ['Mãos', row => String(row.hands), 'numero'],
      ['Oculta', row => row.conceal], ['Preço', row => row.cost, 'numero']],
    filters: [['Classe', weaponClass], ['Tipo', weaponType], ['Perícia', row => row.skill.split(' (')[0]]]
  });
  const cyberRows = Object.values({ fashionware, neural, optics, internal, external, limbs }).flat().map(entry => entry.raw);
  const cyberGroup = row => row.category.split(' (')[0];
  pages.cyberware2077.setup = compareTable({
    pageId: 'cyberware2077', rows: cyberRows, noun: 'implantes',
    columns: [['Implante', row => row.name], ['Categoria', row => row.category], ['Instalação', row => row.install], ['Humanidade', row => String(row.humanity), 'numero'], ['Preço', row => row.cost, 'numero']],
    filters: [['Categoria', cyberGroup], ['Instalação', row => row.install]]
  });

  // data: as listas cruas, lidas pelo build do módulo do Foundry (foundry-2077/build).
  window.system2077 = {
    pages,
    data: {
      weapons: { pistols, revolvers, smgs, shotguns, rifles, machineGuns, snipers },
      cyberware: { fashionware, neural, optics, internal, external, limbs }
    }
  };
})();
