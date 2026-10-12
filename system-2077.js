// Armas e cyberware de 2077: os do Cyberpunk Edgerunners Mission Kit (oficial, Kit p. 31–37) e os do suplemento de fã
// "Cyberpunk 2077 – A Cyberpunk RED Supplement" (p. 27–50), estes adaptados às regras de Power, Smart e Tech do Kit.
// Um cartão (.entry) por item, no mesmo formato do netrunning.
(() => {
  const table = (headers, rows) => `<div class="table-wrap dense"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body) => `<div class="section" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;
  const entry = ({ name, tag, stats = [], text, extra = '', tip }) => `<article class="entry" data-toc="${name}"><header><h4>${name}</h4>${tag ? `<span class="entry-tag">${tag}</span>` : ''}</header>${stats.length ? `<div class="entry-stats">${stats.map(([label, value]) => `<span><b>${label}</b> ${value}</span>`).join('')}</div>` : ''}<p>${text}</p>${extra}${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;
  const grid = entries => `<div class="entry-grid">${entries.map(entry).join('')}</div>`;

  // Origem de cada item: o Cyberpunk Edgerunners Mission Kit (oficial, 2024) ou o suplemento de fã de 2077 (opcional,
  // com as regras de Power, Smart e Tech do Kit).
  const ORIGENS = { kit: 'Mission Kit', fa: 'suplemento de fã' };

  // ---------------- Armas ----------------
  // [nome, tipo, qualidade, perícia, dano, pente, CDT, mãos, oculta, custo, recursos, descrição, nota, regras]
  // regras: { kit: true } nas do Mission Kit, e o que a arma faz de diferente, lido pelo módulo do Foundry
  // (foundry-2077/build/armas.mjs): balas por ataque, dano com menos balas, dano no tiro mirado, BODY mínimo...
  const weapon = (name, kind, quality, skill, damage, magazine, rof, hands, conceal, cost, features, text, tip, regras = {}) => {
    const { kit = false, ...resto } = regras;
    const origem = kit ? 'kit' : 'fa';
    return {
      name, tag: `${kind} · ${quality} · ${ORIGENS[origem]}`,
      stats: [['Perícia', skill], ['Dano', damage], ['Pente', magazine], ['CDT', rof], ['Mãos', hands], ['Oculta', conceal], ['Custo', cost]],
      text, extra: features ? `<p class="entry-excellent"><b>Recursos:</b> ${features}</p>` : '', tip,
      // Os argumentos crus, para o build do módulo do Foundry (foundry-2077/).
      raw: { name, kind, quality, skill, damage, magazine, rof, hands, conceal, cost, features, text, tip, origem, regras: resto }
    };
  };
  const pistols = [
    weapon('Militech M-10AF Lexington', 'Pistola pesada Power, exótica', 'padrão', 'Armas de uma Mão', '3d6', '21 (pistola pesada)', 2, 1, 'Sim', '1.000eb', '—', 'A pistola preferida da polícia de Night City desde 2030: leve e com pouco coice, boa para derrubar sem necessariamente matar na hora. Pequena o bastante para ter fãs fiéis do porte oculto. Pente de 21.', '', { kit: true, pagina: 33 }),
    weapon('Constitutional Arms Liberty', 'Pistola pesada Power', 'padrão', 'Armas de uma Mão', '3d6', '12 (pistola pesada)', 2, 1, 'Sim', '100eb', '—', 'O cano longo a torna popular para intimidar: usada para ameaçar num <b>facedown</b>, dá +1 no teste.'),
    weapon('Arasaka Tamayura', 'Pistola pesada Power', 'padrão', 'Armas de uma Mão', '3d6', '8 (pistola pesada)', 2, 1, 'Sim', '100eb', '—', 'Fabricada nos anos 2000, é rara de ver: quem usa é das antigas, ou está quebrado.'),
    weapon('Tsunami Nue', 'Pistola pesada Power', 'excelente', 'Armas de uma Mão', '3d6', '10 (pistola pesada)', 2, 1, 'Sim', '500eb', 'Qualidade excelente (+1 no ataque)', 'A preferida de gangues de grife e frequentadores de clube chique para legítima defesa.'),
    weapon('Constitutional Arms Unity', 'Pistola pesada Power, exótica', 'padrão', 'Armas de uma Mão', '3d6 (4d6 no tiro mirado)', '12 (pistola pesada)', 2, 1, 'Sim', '500eb', 'Tiro mirado: 4d6', 'A pistola universal e fácil de achar da Constitutional Arms, que já resolveu incontáveis discussões em Night City: basta um tiro bem colocado para ganhar a briga. Para sempre. No <b>tiro mirado</b>, o dano sobe para <b>4d6</b>.', '', { kit: true, pagina: 33, danoMirado: '4d6' }),
    weapon('Kang Tao A-22B Chao', 'Pistola média Smart, exótica', 'excelente', 'Armas de uma Mão', '3d6 (2d6 com menos de 3 balas)', '30 (pistola média)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; 3 balas por tiro', 'Pistola Smart da Kang Tao. Como a Yukimura do Kit, no tiro único gasta <b>3 balas</b> e causa <b>3d6</b>; com menos de 3 no pente, dispara o que tem e causa 2d6.', 'no suplemento de fã, as três balas Smart davam o teste de 12 + 1d10; com as regras do Kit, a arma Smart dá +1 e as três balas sobem o dano.', { balas: 3, danoComMenos: '2d6' }),
    weapon('Tsunami Kappa', 'Pistola média Smart, exótica', 'excelente', 'Armas de uma Mão', '3d6 (2d6 com menos de 3 balas)', '30 (pistola média)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente; trava em dois alvos; 3 balas por tiro', 'Trava em <b>dois alvos</b> a até 4 m um do outro: se o ataque errar o primeiro, as balas Smart vão para o segundo. No tiro único gasta <b>3 balas</b> e causa <b>3d6</b> (2d6 com menos de 3 no pente).', 'no suplemento de fã, as três balas Smart davam o teste de 12 + 1d10; com as regras do Kit, a arma Smart dá +1 e as três balas sobem o dano.', { balas: 3, danoComMenos: '2d6', doisAlvos: true }),
    weapon('Arasaka JKE-X2 Kenshin', 'Pistola média Tech, exótica', 'excelente', 'Armas de uma Mão', '2d6', '12 (fixo)', 2, 1, 'Sim', '1.000eb', 'Qualidade excelente', 'Pistola Tech da Arasaka, com pente fixo de 12.', 'no suplemento de fã, a carga disparava uma rajada de 2; com as regras do Kit, a carga vale para o próximo ataque, de CDT 1.'),
    weapon('Militech M-76E Omaha', 'Pistola pesada Tech, exótica', 'padrão', 'Armas de uma Mão', '3d6', '9 (pistola pesada)', 2, 1, 'Sim', '500eb', 'Carregada até o fim do turno em que dispara; carregada, CDT 2 e até 3 balas por ataque', 'Parece uma pistola de chumbo comum, mas esconde um trilho eletromagnético: comum no coldre dos corpos do alto escalão, cabe na pasta ou no porta-luvas da limusine. <b>Carregada</b>, fica assim até o fim do turno em que disparou, continua com <b>CDT 2</b> e gasta até <b>3 balas</b> por ataque (com menos de 3 no pente, esvazia).', '', { kit: true, pagina: 34, cargaAteFimDoTurno: true, balasNaCarga: 3, cdtNaCarga: 2 })
  ];
  const revolvers = [
    weapon('Darra Polytechnic DR-5 Nova', 'Pistola muito pesada Power, exótica', 'padrão', 'Armas de uma Mão', '4d6', '6 (fixo)', 1, 1, 'Sim', '50eb', '—', 'Revólver com tambor fixo de 6 balas; não aceita upgrade de pente.'),
    weapon('Malorian Overture', 'Pistola muito pesada Power, exótica', 'excelente', 'Armas de uma Mão', '4d6', '6 (fixo)', 1, 1, 'Sim', '100eb', 'Qualidade excelente (+1 no ataque)', 'Revólver de qualidade excelente com tambor fixo de 6 balas; não aceita upgrade de pente.'),
    weapon('Militech Crusher (207X)', 'Pistola muito pesada Power, exótica', 'padrão', 'Armas de uma Mão', '3d6 (cartucho)', '12 (cartucho)', 1, 1, 'Não', '1.000eb', 'Só cartucho de espingarda', 'Só de ver, o amante de armas se emociona. Lançada em 2020 para combate de perto, virou um ícone da época; a versão de hoje foi atualizada sem perder o visual. É uma <b>pistola muito pesada</b> de 12 tiros que <b>só dispara cartucho</b>: Armas de uma Mão contra DV 13, e 3d6 em todos numa área de 6 m à frente.', '', { kit: true, pagina: 33, soCartucho: true }),
    weapon('Techtronika RT-46 Burya', 'Pistola muito pesada Tech, exótica', 'padrão', 'Armas de uma Mão', '4d6', '4 (pistola muito pesada)', 1, 1, 'Não', '1.000eb', 'Carrega sem gastar a Ação de Movimento; sem cromo no braço, quebra o braço', 'Feia, inconveniente e insegura, e mesmo assim eficiente demais. A pistola eletromagnética neossoviética fura parede sem precisar carregar e é densa como uma estrela de nêutrons. Carrega <b>sem gastar a Ação de Movimento</b>. Quem dispara sem <b>Grafted Muscle and Bone Lace</b> ou um <b>cyberbraço</b> sofre a lesão crítica <b>Braço Quebrado</b> (se ainda não tiver).', '', { kit: true, pagina: 34, cargaSemMovimento: true, lesaoSemCromo: 'Broken Arm' }),
    weapon('Darra Polytechnic DR-12 Quasar', 'Pistola muito pesada Tech, exótica', 'padrão', 'Armas de uma Mão', '4d6', '20 (fixo)', 1, 1, 'Não', '5.000eb', '—', 'Pistola Tech com pente fixo de 20.', 'no suplemento de fã, a carga disparava uma rajada de 10 balas; com as regras do Kit, não há rajada carregada.')
  ];
  const smgs = [
    weapon('Arasaka Shigure', 'SMG Power', 'padrão', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Sim', '100eb', 'Autofogo (3); fogo supressivo', 'Antecessora da Militech Saratoga.'),
    weapon('Militech M221 Saratoga', 'SMG Power', 'padrão', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Sim', '100eb', 'Autofogo (3); fogo supressivo', 'Sucessora da Shigure, de design moderno dos anos 2040. Bem mais popular.'),
    weapon('Darra Polytechnic DS1 Pulsar', 'SMG pesada Power', 'ruim', 'Armas de uma Mão', '3d6', '30 (pistola pesada)', 1, 1, 'Não', '50eb', 'Qualidade ruim; autofogo (3); fogo supressivo', 'Muito popular entre gangueiros iniciantes e Scavengers: compacta e barata.'),
    weapon('Budget Arms Guillotine', 'SMG Power, exótica', 'ruim', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Não', '100eb', 'Qualidade ruim; autofogo (3); fogo supressivo; mira de sniper integrada', 'Vem com uma mira de sniper integrada que não sai. Feita para quem ia se contentar com uma Saratoga.'),
    weapon('Budget Arms Slaught-O-Matic', 'SMG Power, exótica', 'ruim', 'Armas de uma Mão', '2d6', '36 (pistola média)', 1, 1, 'Sim', '20eb', 'Qualidade ruim; autofogo (3); fogo supressivo; sem acessórios', 'Descartável: não aceita acessório, pente novo nem upgrade. Depois da última bala, <b>trava para sempre</b> e vai para o lixo.'),
    weapon('Arasaka Senkoh LX', 'SMG Tech, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (fixo)', 1, 1, 'Não', '1.000eb', 'Qualidade excelente; autofogo (3); fogo supressivo', 'SMG Tech da Arasaka, com pente fixo de 30.', 'no suplemento de fã, a carga disparava as 30 balas numa rajada; com as regras do Kit, não há rajada carregada: carregada, o próximo ataque é de CDT 1.'),
    weapon('Kang Tao G-58 Dian', 'SMG Smart, exótica', 'excelente', 'Armas de uma Mão', '2d6', '30 (pistola média)', 1, 1, 'Não / Sim', '1.000eb', 'Qualidade excelente; autofogo (3); fogo supressivo; coronha retrátil', 'Arma Smart. Com a coronha recolhida dá para esconder, mas os ataques têm −1 até estendê-la de novo (uma Ação).'),
    weapon('Arasaka HJKE-11 Yukimura', 'SMG Smart, exótica', 'padrão', 'Armas de uma Mão', '3d6 (2d6 com menos de 3 balas)', '30 (pistola média)', 1, 1, 'Sim', '500eb', 'Autofogo (3); fogo supressivo; 3 balas por tiro', 'A arma que começou a revolução Smart, lançada pela Arasaka nos anos 2040: com ela, dá para atirar tão mal quanto os soldados de certa ópera espacial do fim do século 20 e acertar assim mesmo. No <b>tiro único</b>, gasta <b>3 balas</b> e causa <b>3d6</b>; com menos de 3 no pente, dispara o que tem e causa 2d6. O autofogo (×3) gasta 10 balas.', '', { kit: true, pagina: 32, balas: 3, danoComMenos: '2d6' }),
    weapon('Arasaka TKI-20 Shingen', 'SMG pesada Smart, exótica', 'padrão', 'Armas de uma Mão', '3d6 (2d6 com menos de 3 balas)', '30 (pistola pesada)', 1, 2, 'Não', '1.000eb', 'Autofogo (4); fogo supressivo; duas mãos; 3 balas por tiro', 'Difícil acreditar que tanto poder de parada, pente e tecnologia caibam num corpo tão pequeno: com o desenho ergonômico, é a arma dos sonhos de todo soldado e mercenário. SMG pesada de <b>duas mãos</b>, com autofogo (×4). No <b>tiro único</b>, gasta <b>3 balas</b> e causa <b>3d6</b>; com menos de 3 no pente, esvazia e causa 2d6.', '', { kit: true, pagina: 33, balas: 3, danoComMenos: '2d6' })
  ];
  const shotguns = [
    weapon('Budget Arms Carnage', 'Espingarda Power', 'ruim', 'Armas de Ombro', '5d6 (balote) / 3d6 (cartucho)', '5 (balote)', 1, 2, 'Não', '100eb', 'Qualidade ruim; balote ou cartucho; com BODY menor que 10, rompe o músculo', 'Há armas sutis, elegantes e precisas como um cirurgião. A Carnage não é nenhuma delas: os projetistas da Budget Arms seguiram uma regra só, quanto maior, melhor. É enorme, causa um dano ridículo e tem um coice que desloca o ombro. Quem dispara sem <b>BODY 10</b> ou mais sofre a lesão crítica <b>Músculo Rompido</b> (se ainda não tiver).', '', { kit: true, pagina: 33, exigeBody: 10, lesao: 'Torn Muscle' }),
    weapon('Constitutional Arms M2038 Tactician', 'Espingarda Power', 'padrão', 'Armas de Ombro', '5d6', '8 (balote)', 1, 2, 'Não', '500eb', 'Cartucho de espingarda', 'Espingarda padrão com pente de 8.'),
    weapon('Techtronika VST-37 Pozhar', 'Espingarda Power, exótica', 'padrão', 'Armas de Ombro', '4d6', '12 (balote)', 1, '2 (1 com BODY 8)', 'Não', '1.000eb', 'Autofogo (2) com −2; com BODY 8+, uma mão e Armas de uma Mão', 'Espingarda exótica de 12 balotes que causa 4d6 em vez de 5d6. Só dispara balote e gasta 6 no autofogo (tabela da SMG), com −2 no teste pelo coice imenso. Com BODY 8 ou mais, usa com uma mão e a perícia Armas de uma Mão.'),
    weapon('Rostovic DB-4 Igla', 'Espingarda Power, exótica', 'padrão', 'Armas de Ombro', '3d6', '2 (cartucho, fixo)', 1, 2, 'Não', '100eb', 'Só cartucho de espingarda', 'Pente fixo de 2. Só dispara no modo cartucho de espingarda. Mesmo exótica, aceita munição especial.'),
    weapon('Rostovic DB-2 Testera', 'Espingarda Power, exótica', 'padrão', 'Armas Pesadas', '4d6', '2 (cartucho, fixo)', 1, 2, 'Não', '100eb', 'Só cartucho; os dois cartuchos juntos: 4d6', 'Usa Armas Pesadas. Só dispara cartucho; dá para disparar os dois de uma vez, e o dano sobe para 4d6. Aceita munição especial.'),
    weapon('Rostovic DB-2 Satara', 'Espingarda Tech, exótica', 'padrão', 'Armas de Ombro', '5d6 (balote) / 3d6 (cartucho)', '2 (um por cano)', 1, 2, 'Não', '500eb', 'Cada cano com a sua munição; aceita munição especial', 'Estranha na aparência e na tecnologia. Os críticos acham pesada e desajeitada demais; quem defende, incluindo oficiais da MaxTac, lembra que a espingarda sérvia não liga para paredes. Dois tiros, um por cano, e <b>cada cano pode ter uma munição diferente</b>. Mesmo exótica, aceita munição especial.', '', { kit: true, pagina: 34 }),
    weapon('Rostovic DB-4 Palica', 'Espingarda Smart, exótica', 'padrão', 'Armas de uma Mão', '3d6 (4d6 com os dois canos)', '2 (cartucho, fixo)', 1, 1, 'Não', '1.000eb', 'Só cartucho; os dois canos de uma vez: 4d6', 'Espingarda Smart de uma mão, com pente fixo de 2. Disparar os <b>dois canos</b> de uma vez gasta os 2 cartuchos e o dano sobe para <b>4d6</b>.', 'no suplemento de fã, os dois canos subiam o teste Smart para 12 + 1d10; com as regras do Kit, sobem o dano, como na Testera.', { doisCanos: true }),
    weapon('Kang Tao L-69 Zhuo', 'Espingarda Smart, exótica', 'padrão', 'Armas de Ombro', '4d6 (cartucho)', '32 (cartucho Smart melhorado)', 1, 2, 'Não', '1.000eb', 'Só cartucho Smart melhorado; 8 cartuchos por ataque', 'Espingarda costuma ser poderosa e desajeitada. A Zhuo não: o radar ultrassensível acha os alvos sozinho, e os oito carregadores sob o cano estão sempre prontos. <b>Só aceita cartucho Smart melhorado</b> e gasta <b>8 cartuchos por ataque</b>; com menos de 8, a trava de segurança não deixa disparar. Pelo tanto de munição, causa <b>4d6</b> em vez dos 3d6 do cartucho.', '', { kit: true, pagina: 33, balas: 8, minimoDeBalas: 8, danoFixo: '4d6', soCartucho: true, soSmartMelhorada: true })
  ];
  const rifles = [
    weapon('Nokota D5 Copperhead', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não', '500eb', 'Autofogo (4); fogo supressivo', 'Rifle de assalto padrão com pente de 30.'),
    weapon('Arasaka Nowaki', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6 (4d6 com menos de 3 balas)', '24 (rifle)', 1, 2, 'Não', '500eb', 'Só tiro único, de 3 balas', 'Antecessor do Masamune. Sem autofogo nem fogo supressivo: no tiro único gasta <b>3 balas</b> e causa 5d6 (com menos de 3, esvazia e causa 4d6). Muito preciso: +1 em tiros únicos entre 13 e 50 m.', 'no suplemento de fã, só disparava rajadas de três e não ricocheteava; com as regras do Kit, as três balas seguem o Masamune.', { balas: 3, danoComMenos: '4d6' }),
    weapon('Militech M251s Ajax', 'Rifle de assalto Power', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não / Sim', '500eb', 'Autofogo (4); fogo supressivo; coronha dobrável', 'Vem com mira red dot, e a coronha dobrável permite esconder. Arma de soldado profissional: lenta, mas precisa, e não trava na lama.'),
    weapon('Arasaka HJSH-18 Masamune', 'Rifle de assalto Power, exótico', 'padrão', 'Armas de Ombro', '5d6 (4d6 com menos de 3 balas)', '24 (rifle)', 1, 2, 'Não', '500eb', 'Autofogo (4); fogo supressivo; 3 balas por tiro', 'Projetado nos anos 2050 pela Arasaka: cada parafuso passou pelo controle de qualidade de uma legião de engenheiros, e dá para sentir. Pente próprio de 24. No <b>tiro único</b>, gasta <b>3 balas</b> e causa <b>5d6</b>; com menos de 3 no pente, esvazia e causa 4d6.', '', { kit: true, pagina: 33, balas: 3, danoComMenos: '4d6' }),
    weapon('Darra Polytechnic DA8 Umbra', 'Rifle de assalto Power, exótico', 'ruim', 'Armas de Ombro', '5d6', '45 (rifle)', 1, 2, 'Não', '100eb', 'Qualidade ruim; autofogo (4); fogo supressivo', 'Feito barato com material mais barato ainda: de quem não pode pagar nem um Copperhead. "Atire, mate, jogue fora."'),
    weapon('Tsunami Kyubi', 'Rifle de assalto Power, exótico', 'excelente', 'Armas de Ombro', '5d6', '20 (rifle)', 1, 2, 'Não', '1.000eb', 'Qualidade excelente', 'Sem autofogo nem supressão. A mira fixa dá +1 em tiros únicos ou mirados entre 13 e 50 m.'),
    weapon('Nokota D5 Sidewinder', 'Rifle de assalto Smart, exótico', 'padrão', 'Armas de Ombro', '5d6', '30 (rifle)', 1, 2, 'Não / Sim', '1.000eb', 'Autofogo (4); fogo supressivo; coronha dobrável', 'Arma Smart. O irmão mais novo e mais esperto do Copperhead, de material melhor, mas longe das armas Smart da Arasaka e da Kang Tao.')
  ];
  const machineGuns = [
    weapon('Constitutional Arms M2067 Defender', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático', '—', '100 (rifle)', 1, 2, 'Não', '500eb', 'Autofogo (4); fogo supressivo; bipé', 'Não faz tiro único: só autofogo (tabela do rifle de assalto). Exige <b>BODY 6</b> ou mais, a menos que esteja montada.'),
    weapon('Midnight Arms MA70 HB', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático (o texto diz Armas Pesadas)', '4d6', '70 (rifle)', 1, 2, 'Não', '1.000eb', 'Autofogo (4); fogo supressivo; bipé', 'Faz tiro único e autofogo. Exige <b>BODY 6</b> ou mais, a menos que esteja montada.'),
    weapon('Militech Mk.31 HMG', 'Metralhadora Power, exótica', 'padrão', 'Disparo Automático', '—', '300', 1, 2, 'Não', 'ver nota', 'Autofogo (4); fogo supressivo; bipé', 'Não faz tiro único: só autofogo. Exige <b>BODY 11</b> ou mais, a menos que esteja montada. Recarregar leva duas Ações, em dois turnos.', 'a tabela do livro repete a da Defender (500eb, pente 100). Defina o preço com a mesa; o suplemento a trata como uma arma bem mais pesada.')
  ];
  const snipers = [
    weapon('Midnight Arms SOR-22', 'Rifle de precisão Power, exótico', 'padrão', 'Armas de Ombro', '6d6 (texto) / 5d6 (tabela)', '12 (texto) / 30 (tabela)', 1, 2, 'Não', '1.000eb', 'Só tiro único; mira de sniper; só munição perfurante', 'Rifle de precisão: sem autofogo nem supressão, um tiro por vez. Exige <b>BODY 6</b> ou mais, a menos que esteja montado, e recarregar leva duas Ações.', 'o texto e a tabela do livro não batem (dano e pente). O texto parece o certo.'),
    weapon('Militech M-179 Achilles', 'Rifle de precisão Tech, exótico', 'padrão', 'Armas de Ombro', '5d6', '9 (fixo)', 1, 2, 'Não', '1.000eb', 'Mira de sniper', 'Sem autofogo nem supressão. O preferido da <b>MaxTac</b> contra ciberpsicóticos, pelo dano e pela penetração de armadura.'),
    weapon('Techtronika SPT32 Grad', 'Rifle de precisão Power, exótico', 'excelente', 'Armas de Ombro', '5d6', '4 (rifle)', 1, 2, 'Não', '500eb', 'Qualidade excelente; ferrolho; aceita munição especial', 'Quando o mundo pediu rifles novos para furar armaduras cada vez mais pesadas, a neossoviética SPT32 Grad foi a primeira a responder; para muitos, é o sniper mais poderoso do mercado. Não tem o capricho das rivais da Arasaka e da Militech, mas, nas mãos de um atirador treinado que dispensa a leitura de vento da arma, é devastadora. Mesmo exótica, aceita munição especial. Depois de cada disparo, é preciso <b>uma Ação para manejar o ferrolho</b> antes de atirar de novo.', '', { kit: true, pagina: 34, ferrolho: true }),
    weapon('Tsunami Nekomata', 'Rifle de precisão Tech', 'padrão', 'Armas de Ombro', '5d6', '4 (rifle)', 1, 2, 'Não', '1.000eb', 'Carregado, vê e atira através de cobertura fina e grossa', 'Uma arma exigente: pede cuidado, manutenção e tempo para aprender, mas vale muito a pena. É quase impossível para um mercenário sem emprego num governo ou numa megacorp pôr as mãos num... quase. <b>Carregado</b>, vê o contorno dos alvos e atira através de cobertura <b>fina e grossa</b>.', '', { kit: true, pagina: 35, cargaGrossa: true }),
    weapon('Tsunami Ashura', 'Rifle sniper Smart, exótico', 'excelente', 'Armas de Ombro', '5d6', '1', 1, 2, 'Não', '1.000eb', 'Qualidade excelente', 'Arma Smart. Com pente de uma bala só, só faz tiro único.')
  ];

  // ---------------- Cyberware ----------------
  // [nome, categoria, instalação, custo, Humanidade, descrição, nota, { kit: true } nos do Mission Kit]
  const ware = (name, category, install, cost, humanity, text, tip, { kit = false } = {}) => {
    const origem = kit ? 'kit' : 'fa';
    return { name, tag: `${category} · ${ORIGENS[origem]}`, stats: [['Instalação', install], ['Custo', cost], ['Perda de Humanidade', humanity]], text, tip, raw: { name, category, install, cost, humanity, text, tip, origem } };
  };
  const neuroport = [
    ware('Neuroport', 'Neuroport (base)', 'Hospital', '1.000eb', 7, 'O pacote de controle do cromo moderno, tão seguro que quase toda criança ganha um: aprender a usar faz parte da escola, e quem não tem fica para trás. Traz o <b>Neural Link</b>, com <b>5 slots de opção</b> de neuralware (nenhum ocupado pelo resto do pacote); o <b>Holophone</b>, um telefone controlado pelo cérebro com acesso limitado à CitiNet; o <b>Biomonitor</b>, com os sinais vitais no HUD; o <b>Virtu</b> (Virtuality, que não roda braindance); o <b>HUD</b> (Chyron), com legendas, transcrições e tradução no campo de visão; <b>dois Shard Slots</b> (Chipware Sockets); e o <b>Personal Link</b> (Interface Plug), um cabo no pulso para ligar direto em computadores. Nada disso ocupa slot nem exige outro cyberware.', '<b>de graça e sem perda de Humanidade na criação do personagem</b>. É pré-requisito de todo cyberware que não seja de grau médico. Comprado depois, custa 1.000eb e perde 7 (2d6).', { kit: true }),
    ware('Neuroport Cyberdeck Port', 'Neuralware (exige Neuroport)', 'Hospital', '100eb', 3, 'Porta na nuca para encaixar um cyberdeck direto no corpo. Em 2070, todo deck tem versão para ela pelo mesmo preço, mas essa versão não aceita hardware. Encaixar ou tirar o deck é uma Ação. Encaixado, você está totalmente conectado ao deck, que ganha o hardware da sua Bodyweight (ou parecida), e o alcance sobe para <b>20 m</b> contra Arquiteturas NET e <b>50 m</b> contra Neuroports. Paredes bloqueiam como sempre. Só uma por pessoa, e só um deck conectado por vez.', '', { kit: true }),
    ware('Ex-Disk', 'Neuralware (exige Neuroport Cyberdeck Port)', 'Hospital', '1.000eb', 3, 'Aumenta a capacidade do cérebro de guardar e processar netrunning. Cada um traz um <b>slot só de hardware</b> de cyberdeck, que vale para o deck da Neuroport Cyberdeck Port. Com <b>dois ou mais</b>, você ganha <b>uma Ação NET a mais</b> por turno enquanto está ligado fisicamente a um Ponto de Acesso pelo Personal Link.', '', { kit: true }),
    ware('Self-ICE', 'Neuralware', 'Hospital', '500eb', 3, 'Contramedida contra quickhacks. Cada instalação (até 3) põe um <b>Passwall</b> no seu Neuroport: quem tenta hackear você gasta uma Ação NET para passar por cada um (Breach). A DV de todos os Passwalls sobe com o número de Self-ICE: <b>DV6</b> com um, <b>DV8</b> com dois e <b>DV10</b> com três.', '', { kit: true })
  ];
  const fashionware = [
    ware('Cyber Panels', 'Fashionware', 'Loja', '500eb', 0, 'Cobre as partes feias do cromo e deixa o conjunto com cara de peça única, com as linhas dos painéis visíveis. Vem com cobertura de plástico; RealSkinn ou Superchrome custam à parte (o RealSkinn interage com Chemskin).'),
    ware('Cybernetic Fashion', 'Fashionware', 'Clínica', '100eb', 0, 'Cibernética decorativa: mandíbula, suporte de máscara facial, substitutos visuais de partes do corpo. Cada peça vem com o suporte e a peça de moda.')
  ];
  const neural = [
    ware('Berserk Implant', 'Neuralware (opção do Neural Link)', 'Clínica', '1.000eb', 7, 'Regula os hormônios de luta ou fuga e solta uma descarga de adrenalina sob comando. Ativado com uma Ação: por <b>60 segundos (20 rodadas)</b> você ignora os efeitos de <b>Gravemente</b> e <b>Mortalmente Ferido</b>, com uma exceção: Mortalmente Ferido continua fazendo Death Saves. Depois, só ativa de novo em 1 hora.', '', { kit: true }),
    ware('David\'s Experimental Sandevistan', 'Neuralware (opção do Neural Link; borgware, speedware)', 'Hospital', '250.000eb', 14, 'Só existem algumas no mundo, e esta custou a vida de pelo menos duas pessoas. Tem certeza? Ocupa dois slots de neuralware; é borgware e speedware (só uma speedware por pessoa). Ativar não gasta Ação, nem em combate, mas custa <b>2d6 de Humanidade</b>. Ativada no começo do combate, você vai para o <b>topo da iniciativa</b>; no meio dele, sobe para o topo na hora. Ativada no seu turno, você ganha <b>uma Ação de Movimento ou outra Ação</b> a mais. Com Humanidade negativa, a perda vira <b>dano direto no HP</b> (passa pela armadura sem ablar) e o personagem entra em <b>ciberpsicose extrema</b>: a ficha vai para o mestre, que joga com o pior dele.', 'a Sandevistan do David, do anime. Super Luxuosa: não se compra na loja.', { kit: true }),
    ware('Adrenaline Converter', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Converte adrenalina em ação imediata: <b>+2 na iniciativa</b>.'),
    ware('Kerenzikov (2077)', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 14, 'Speedware sempre ligado, com reação e movimento melhores: <b>+1 em tiros mirados</b> (acumula com a Targeting Scope).', 'no RED o Kerenzikov dá +2 de iniciativa; no suplemento de fã ele muda de função.'),
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
    ware('Biomonitor (2077)', 'Cyberware interno', 'Clínica', '1.000eb', 3, 'Monitora os sinais vitais e pode mandar os dados à Trauma Team pelo cartão. Guarda químicos médicos que dispara quando você fica Gravemente ou Mortalmente Ferido (definido antes) para tentar te estabilizar sozinho: <b>+6 no teste de estabilização</b>. Leva 24 horas para recarregar.', 'o Neuroport já traz um Biomonitor simples (só os sinais vitais no HUD); este é o do suplemento de fã, com os químicos.'),
    ware('Blood Pump', 'Cyberware interno', 'Hospital', '1.000eb', 7, 'Oxigena o sangue mais rápido: a cura natural fica <b>1,5 vez mais rápida</b>.'),
    ware('Clutch Padding', 'Cyberware interno', 'Clínica', '500eb', 3, 'Reserva de sangue oxigenado liberada em trauma grave: ignora o <b>primeiro aumento da penalidade do Death Save</b>. Depois, 24 horas para recarregar.'),
    ware('Dense Marrow', 'Cyberware interno', 'Hospital', '5.000eb', 14, 'Medula biônica: mais peso e força, à custa de velocidade. Com armas brancas (exceto leves), a CDT não passa de 1, mas o golpe causa <b>1 dado a mais</b> de dano. Incompatível com Microrotors.'),
    ware('Epimorphic Skeleton / Titanium Bones', 'Cyberware interno', 'Clínica', '1.000eb', 14, 'Funciona como o <b>Grafted Muscle and Bone Lace</b> do RED (+2 BODY, até 10).'),
    ware('Feedback Circuit', 'Cyberware interno', 'Clínica', '500eb', 7, 'Capacitores que convertem EMP e corrente elétrica em energia para arma Tech: quando você sofre EMP ou choque, o efeito é anulado e a sua arma Tech fica <b>carregada sem gastar a Ação de Movimento</b>. Depois precisa de uma hora para recarregar.', 'no suplemento de fã, o próximo tiro Tech atravessava 100% da cobertura fina; com as regras do Kit, a carga já faz isso.'),
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
    ware('Gorilla Arm', 'Opção de cyberbraço', 'Hospital', '1.000eb', 14, 'O reforço clássico para trabalho pesado. Ocupa dois slots do cyberbraço. O punho é uma <b>arma branca pesada de qualidade excelente</b> (3d6, CDT 2, +1 no ataque). Nessa mão, você empunha armas como se tivesse <b>BODY 11</b> (inclusive armas de duas mãos com uma só, respeitando a CDT). Com dois, um em cada cyberbraço, também força portas e move cobertura grossa, estrangula e derruba (Choke e Slam) como se tivesse BODY 11.', 'no suplemento de fã eram um par só (Gorilla Arms) e usavam Briga; no Kit, cada braço tem o seu, e o punho é arma branca.', { kit: true }),
    ware('Mantis Blade', 'Opção de cyberbraço', 'Hospital', '500eb', 14, 'Lâminas de braço icônicas, letais e fáceis de esconder. Ocupa dois slots do cyberbraço. <b>Arma branca pesada de uma mão, de qualidade excelente</b> (3d6, CDT 2, +1 no ataque), escondida sem teste e sacada ou guardada <b>sem gastar Ação</b>. Com a lâmina para fora, a mão desse braço não segura nada. Com duas, uma em cada cyberbraço, e as duas para fora, você ignora a penalidade de movimento para escalar.', 'no suplemento de fã eram um par só e davam o salto sobre o alvo; no Kit, cada braço tem a sua.', { kit: true }),
    ware('Monowire', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, 'Chicote de fio monofilamento com um gume de uma molécula, escondido sem teste. <b>Arma branca pesada exótica de uma mão</b> (3d6, CDT 2) que ataca a até <b>6 m</b>. Quando causa uma lesão crítica, quem atacou rola <b>duas vezes</b> na tabela e escolhe a que a vítima sofre.', '', { kit: true }),
    ware('Projectile Launch System', 'Opção de cyberbraço (borgware)', 'Clínica', '1.000eb', 14, 'Um lançador de explosivos na palma da mão (quase literalmente). Borgware; ocupa dois slots do cyberbraço. <b>Lança-foguetes ou lança-granadas de uma mão</b> com um tiro no pente: com foguete, é lança-foguetes; com granada, lança-granadas. Escondido sem teste e sacado ou guardado sem gastar Ação. Não aceita acessório nenhum, só o Smart Rebuild. Aberto, a mão desse braço não segura nada.', '', { kit: true }),
    ware('Ballistic Coprocessor', 'Opção de cyberbraço', 'Clínica', '100eb', 3, 'Liga arma e óptica para acompanhar munição e trajetória: o <b>ricochete</b> das armas Power sai com <b>−2</b> em vez de −4. Pode ser a única peça de cyberware num braço de carne.', 'no suplemento de fã, dava +2 no teste de ricochete; dá no mesmo.'),
    ware('Microgenerator', 'Opção de cyberbraço', 'Clínica', '500eb', 3, '<b>+1 no segundo ataque corpo a corpo</b> depois do primeiro. Exige cyberbraço.'),
    ware('Shock Absorber', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, '<b>+2 no teste de autofogo</b>. Exige cyberbraço e ocupa dois slots.'),
    ware('Smart Link', 'Opção de cyberbraço', 'Clínica', '100eb', 3, 'Liga a arma Smart ao seu sistema como o <b>Subdermal Grip</b>: conta como a conexão que a arma Smart exige, com os dados da arma em tempo real no implante óptico. Pode ser a única peça num braço de carne.', 'no Mission Kit, o Personal Link do Neuroport já faz essa conexão; o Smart Link fica para quem quer a arma ligada sem cabo.'),
    ware('Fortified Ankle / Jump Boost', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tornozelo reforçado com fibras e cápsulas de nanogel: funciona como o <b>Jump Booster</b> do RED. Exige duas cyberpernas, ocupa dois slots, em par.'),
    ware('Jenkins\' Tendons', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tendões artificiais de resposta rápida: <b>+2 de MOVE</b> andando em linha reta. Pode ser a única peça numa perna de carne; em par.'),
    ware('Leeroy Ligament System', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Revisão completa dos ligamentos: <b>+2 de MOVE</b>. Exige duas cyberpernas, ocupa dois slots, em par.'),
    ware('Lynx Paws', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tecido biomecânico nos músculos da perna: <b>+2 em Furtividade</b> para se mover em silêncio. Pode ser a única peça numa perna de carne; em par.'),
    ware('Reinforced Tendons', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'No meio do salto, com uma Ação, você muda a direção ou sobe mais 2 m. Exige duas cyberpernas, ocupa dois slots, em par.')
  ];

  const pages = {
    weapons2077: {
      eyebrow: 'Catálogo / Mission Kit', title: 'Armas de 2077',
      lede: 'Nos anos 2070, as armas Power, Smart e Tech são armas do RED com um Rebuild, um acessório que refaz o miolo da arma. Aqui estão as regras do Cyberpunk Edgerunners Mission Kit (oficial) e as armas com nome e sobrenome: as 13 do Kit e as do suplemento de fã, adaptadas às regras do Kit.',
      html: `<div class="callout"><b>De onde vem cada arma:</b> as marcadas <b>Mission Kit</b> são as do anime, com os números do Kit. As marcadas <b>suplemento de fã</b> são opcionais: os números são os do suplemento de 2077 de Queen Otter, e as regras de Power, Smart e Tech são as do Kit.</div>
        ${section('Rebuilds', 'Kit p. 31–32', `${list(['Um <b>Rebuild</b> transforma uma arma de fogo do RED em arma <b>Power</b>, <b>Smart</b> ou <b>Tech</b>. Cada um custa <b>1.000eb</b> (Muito Caro), ocupa <b>2 slots de acessório</b> e leva <b>1 hora</b> para instalar ou tirar. Só cabe um por arma.', 'Serve em qualquer arma de longo alcance que não seja exótica; o Tech Rebuild não serve em lança-granadas nem em lança-foguetes. Numa arma exótica, o Rebuild entra num slot só, se a arma tiver um livre.', 'As armas desta página já vêm com o Rebuild: o tipo de cada uma diz qual.'])}${button('cyberware2077', 'Cyberware de 2077')}`)}
        ${section('Power', 'Kit p. 31–32', list(['Quando a arma causa uma <b>lesão crítica</b>, o dano bônus da lesão sobe <b>5</b>: 10 em vez de 5.', '<b>Ricochete:</b> você acerta um alvo que sabe onde está, mas que fica atrás de cobertura ou fora da linha de visão, ricocheteando o tiro numa superfície. O ataque tem <b>−4</b>; num <b>tiro mirado</b>, vale só a penalidade do tiro mirado. Precisa de um caminho livre entre o ponto do ricochete e o alvo.', 'O alcance continua sendo a distância entre você e o alvo.', 'Para ricochetear um <b>cartucho</b>, escolha uma superfície a até 6 m de você: ela vira a nova origem do leque, que atinge todos numa área de 6 m na direção que você escolher (com bom senso: o tiro não ricocheteia para trás da superfície).', 'O Ballistic Coprocessor reduz a penalidade do ricochete para −2.']))}
        ${section('Smart', 'Kit p. 32', `${list(['A arma precisa estar <b>conectada</b> a você por um <b>Personal Link</b> (o Interface Plug que vem no Neuroport) ou por um <b>Subdermal Grip</b>. Sem conexão, não dispara.', '<b>+1</b> nos ataques à distância com a arma.', 'Aceita a <b>munição Smart melhorada</b> dos tipos que dispara. Com outra munição, fica só o +1.', 'O Smart Rebuild não vai numa arma com <b>Smartgun Link</b>, e o Smartgun Link não faz de uma arma uma arma Smart.'])}<div class="callout">O <b>Smart Link</b> do suplemento de fã conta como conexão, como o Subdermal Grip.</div>`)}
        ${section('Munição Smart melhorada', 'Kit p. 32', list(['Custa <b>50eb</b> (Oneroso) por 10 flechas, balas, balotes ou cartuchos, e <b>500eb</b> (Caro) por granada ou foguete.', 'Só funciona em arma Smart; uma arma com Smartgun Link não conta.', 'Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra coisa que atrapalhe a visão.', '<b>Segunda chance:</b> se o ataque à distância errar a DV por <b>5 ou menos</b>, você tenta de novo na hora, com <b>14 + 1d10</b> (dá para somar Sorte) no lugar de STAT + perícia + bônus, contra a mesma DV. As penalidades do primeiro tiro continuam valendo.']))}
        ${section('Tech', 'Kit p. 32', `${list(['A mira vê o <b>contorno dos alvos</b> através de cobertura fina.', '<b>Carregar:</b> você gasta a <b>Ação de Movimento</b>, e a arma fica carregada até disparar ou por 60 segundos (20 rodadas).', 'Carregada, o <b>próximo ataque</b> que não seja explosivo é de <b>CDT 1</b>, atravessa <b>cobertura fina</b> e <b>ignora metade do SP</b> do alvo (arredondado para cima). A cobertura atravessada não perde HP: os furos são pequenos demais para estragá-la.', 'Por isso a ficha de armadura do Kit mostra o SP contra corpo a corpo e contra Tech carregada: a metade.'])}<div class="callout">Do suplemento de fã saem a rajada carregada, o "esfriar" depois da carga e as flechettes: as armas Tech usam a munição de sempre.</div>`)}
        ${section('Qualidade das armas', '342', list(['<b>Ruim:</b> emperra numa <b>falha crítica</b> (1 no dado de ataque); é preciso uma Ação para desemperrar.', '<b>Excelente:</b> <b>+1 no ataque</b>.', 'Armas exóticas são sempre de qualidade padrão, a não ser que a descrição diga outra coisa.', 'Armas de longo alcance que não são exóticas têm 3 slots de acessório; com o Rebuild, sobra 1.']))}
        ${section('Pistolas', 'Kit p. 32–34 · sup. p. 32–35', grid(pistols))}
        ${section('Revólveres e pistolas muito pesadas', 'Kit p. 33–34 · sup. p. 35–37', grid(revolvers))}
        ${section('Submetralhadoras', 'Kit p. 32–33 · sup. p. 38–40', grid(smgs))}
        ${section('Espingardas', 'Kit p. 33–34 · sup. p. 40–44', grid(shotguns))}
        ${section('Rifles de assalto', 'Kit p. 33 · sup. p. 44–47', grid(rifles))}
        ${section('Metralhadoras', 'sup. p. 47–48', grid(machineGuns))}
        ${section('Rifles de precisão e sniper', 'Kit p. 34–35 · sup. p. 48–50', grid(snipers))}
        ${section('Veja também', '', `<p>${button('economy', 'Preços por categoria')} ${button('gear', 'Armas genéricas do RED')}</p><p class="note-status">Armas brancas, arcos e lança-granadas seguem o RED. Os de longo alcance aceitam Rebuild como qualquer arma (o Tech não serve em lança-granadas).</p>`)}`
    },

    cyberware2077: {
      eyebrow: 'Catálogo / Mission Kit', title: 'Cyberware de 2077',
      lede: 'Boa parte do cromo do RED continua em uso, só mais bonito, e há muita coisa nova. Aqui está o cyberware dos anos 2070: o do Mission Kit (oficial) e o do suplemento de fã (opcional), com custo, local de instalação e perda de Humanidade. A neuralware de netrunning do suplemento fica na página de Netrunning de 2077.',
      html: `${section('Antes de instalar', 'Kit p. 26 e 36', `${list(['<b>Neuroport:</b> nos anos 2070, todo personagem começa com um, <b>de graça e sem perda de Humanidade</b>. Ele é o pré-requisito de todo cyberware que não seja de grau médico e já traz Neural Link (5 slots), Holophone, Biomonitor, Virtu, HUD, dois Shard Slots e o Personal Link.', 'Onde instalar: <b>Loja</b> (DV13, 100eb), <b>Clínica</b> (DV15, 500eb), <b>Hospital</b> (DV17, 1.000eb). Veja Dano, ferimentos e cura.', 'Cada item diz de onde vem: <b>Mission Kit</b> (oficial) ou <b>suplemento de fã</b> (opcional, adaptado às regras do Kit).', 'Itens do suplemento com o mesmo nome de um do RED (Kerenzikov, TeleOptics, Biomonitor) mudaram: se usar o suplemento, vale a versão dele.'])}<p>${button('os2077', 'Berserk e Sandevistan')} ${button('net2077', 'Neuralware de netrunning')}</p>`)}
        ${section('Neuroport', 'Kit p. 36–37', grid(neuroport))}
        ${section('Fashionware', 'sup. p. 27', grid(fashionware))}
        ${section('Neuralware', 'Kit p. 35 · sup. p. 27', `<p>Opções do Neural Link do Neuroport, que tem 5 slots.</p>${grid(neural)}`)}
        ${section('Cyberópticos', 'sup. p. 27–28', grid(optics))}
        ${section('Cyberware interno', 'sup. p. 28–29', `<p>Sete slots de opção interna disponíveis.</p>${grid(internal)}`)}
        ${section('Cyberware externo e placas', 'sup. p. 29', `<p>Sete slots de opção externa. As placas (Carapace, Countershell...) exigem uma placa base: Skin Weave ou Subdermal Armour.</p>${grid(external)}`)}
        ${section('Cybermembros', 'Kit p. 36–37 e 41 · sup. p. 30', `<p>As opções de cyberbraço exigem um <b>cyberbraço</b>, o do RED: 500eb, Hospital, perda 7 (2d6) e <b>4 slots de opção</b>. Com BODY 4 ou menos, a Briga com ele causa <b>2d6</b>, e ele consegue danificar cobertura de aço.</p>${grid(limbs)}`)}`
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
  const origin = row => ORIGENS[row.origem];
  const weaponType = row => row.kind.replace(/\s+(Power|Tech|Smart)/, '').replace(/, exótic[ao]$/, '');
  pages.weapons2077.setup = compareTable({
    pageId: 'weapons2077', rows: weaponRows, noun: 'armas',
    columns: [['Arma', row => row.name], ['Origem', origin], ['Tipo', weaponType], ['Classe', weaponClass], ['Qualidade', row => row.quality], ['Perícia', row => row.skill.split(' (')[0]],
      ['Dano', row => row.damage, 'numero'], ['CDT', row => String(row.rof), 'numero'], ['Pente', row => row.magazine, 'numero'], ['Mãos', row => String(row.hands), 'numero'],
      ['Oculta', row => row.conceal], ['Preço', row => row.cost, 'numero']],
    filters: [['Origem', origin], ['Classe', weaponClass], ['Tipo', weaponType], ['Perícia', row => row.skill.split(' (')[0]]]
  });
  const cyberRows = Object.values({ neuroport, fashionware, neural, optics, internal, external, limbs }).flat().map(entry => entry.raw);
  const cyberGroup = row => row.category.split(' (')[0];
  pages.cyberware2077.setup = compareTable({
    pageId: 'cyberware2077', rows: cyberRows, noun: 'implantes',
    columns: [['Implante', row => row.name], ['Origem', origin], ['Categoria', row => row.category], ['Instalação', row => row.install], ['Humanidade', row => String(row.humanity), 'numero'], ['Preço', row => row.cost, 'numero']],
    filters: [['Origem', origin], ['Categoria', cyberGroup], ['Instalação', row => row.install]]
  });

  // data: as listas cruas, lidas pelo build do módulo do Foundry (foundry-2077/build).
  window.system2077 = {
    pages,
    data: {
      weapons: { pistols, revolvers, smgs, shotguns, rifles, machineGuns, snipers },
      cyberware: { neuroport, fashionware, neural, optics, internal, external, limbs }
    }
  };
})();
