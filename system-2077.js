// Armas e cyberware dos anos 2070. As páginas de regra mostram os do Cyberpunk Edgerunners Mission Kit (oficial,
// Kit p. 31–37). Os do suplemento de fã "Cyberpunk 2077 – A Cyberpunk RED Supplement" (p. 27–50) ficam na página
// de revisão (supplement2077) até o mestre decidir quais entram; as listas cruas (data) continuam com todos.
// Um cartão (.entry) por item, no mesmo formato do netrunning.
(() => {
  const table = (headers, rows) => `<div class="table-wrap dense"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const refLabel = ref => /[a-z]/i.test(ref) ? ref : `p. ${ref}`;
  const section = (title, ref, body) => `<div class="section" data-toc="${title}"><h3>${title}${ref ? `<span class="ref">${refLabel(ref)}</span>` : ''}</h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;
  const entry = ({ name, tag, stats = [], text, extra = '', tip }) => `<article class="entry" data-toc="${name}"><header><h4>${name}</h4>${tag ? `<span class="entry-tag">${tag}</span>` : ''}</header>${stats.length ? `<div class="entry-stats">${stats.map(([label, value]) => `<span><b>${label}</b> ${value}</span>`).join('')}</div>` : ''}<p>${text}</p>${extra}${tip ? `<p class="entry-tip"><b>Na mesa:</b> ${tip}</p>` : ''}</article>`;
  const grid = entries => `<div class="entry-grid">${entries.map(entry).join('')}</div>`;

  // Origem de cada item: o Cyberpunk Edgerunners Mission Kit (oficial, 2024) ou o suplemento de fã de 2077 (em revisão,
  // com as notas do que muda pelas regras de Power, Smart e Tech do Kit).
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
    weapon('Techtronika RT-46 Burya', 'Pistola muito pesada Tech, exótica', 'padrão', 'Armas de uma Mão', '4d6', '4 (pistola muito pesada)', 1, 1, 'Não', '1.000eb', 'Carrega sem gastar a Ação de Movimento; sem cromo no braço, quebra o braço', 'Feia, inconveniente e insegura, e mesmo assim eficiente demais. A pistola eletromagnética neossoviética fura parede sem precisar carregar e é densa como uma estrela de nêutrons. Carrega <b>sem gastar a Ação de Movimento</b>. Quem dispara sem <b>Grafted Muscle and Bone Lace</b> ou um <b>cyberbraço</b> sofre a lesão crítica <b>Braço Quebrado</b> (se ainda não tiver).', '', { kit: true, pagina: 34, cargaSemMovimento: true, lesaoSemCromo: 'Broken Arm' })
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
  const snipers = [
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
    ware('Reflex Tuner', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Coprocessador de emergência: depois de ser atingido, <b>+1 para se esquivar</b> pelo resto da rodada.'),
    ware('Stabber', 'Neuralware (opção do Neural Link)', 'Clínica', '500eb', 7, 'Corrige o alinhamento da lâmina no meio do golpe: <b>+1 de dano com armas de lâmina</b>.'),
    ware('Synaptic Accelerator', 'Neuralware (opção do Neural Link)', 'Clínica', '1.000eb', 7, 'Dispara as sinapses em resposta a estímulo negativo: <b>uma vez por hora</b>, pode rolar de novo uma falha crítica num teste físico, e fica com o novo resultado.'),
    ware('Visual Cortex Support', 'Neuralware (opção do Neural Link)', 'Clínica', '1.000eb', 7, 'Melhora o processamento visual: lê lábios automaticamente nos idiomas que conhece e ganha <b>+1 em Percepção</b>.'),
    ware('Memory Boost', 'Neuralware (opção do Neural Link)', 'Clínica', '5.000eb', 14, 'Otimiza a sincronia entre cérebro e cyberware. Em vez de ocupar um slot do Neural Link, <b>dá um slot a mais</b>: com o Neuroport, ficam 6.', 'no suplemento de fã, era neuralware de netrunning; a mesa aprovou como opção do Neural Link para qualquer um.')
  ];
  const internal = [
    ware('Clutch Padding', 'Cyberware interno', 'Clínica', '500eb', 3, 'Reserva de sangue oxigenado liberada em trauma grave: ignora o <b>primeiro aumento da penalidade do Death Save</b>. Depois, 24 horas para recarregar.'),
    ware('Dense Marrow', 'Cyberware interno', 'Hospital', '5.000eb', 14, 'Medula biônica: mais peso e força, à custa de velocidade. Com armas brancas (exceto leves), a CDT não passa de 1, mas o golpe causa <b>1 dado a mais</b> de dano.'),
    ware('Feedback Circuit', 'Cyberware interno', 'Clínica', '500eb', 7, 'Capacitores que convertem EMP e corrente elétrica em energia para arma Tech: quando você sofre EMP ou choque, o efeito é anulado e a sua arma Tech fica <b>carregada sem gastar a Ação de Movimento</b>. Depois precisa de uma hora para recarregar.', 'no suplemento de fã, o próximo tiro Tech atravessava 100% da cobertura fina; com as regras do Kit, a carga já faz isso.'),
    ware('ThreatEvac', 'Cyberware interno', 'Clínica', '1.000eb', 7, 'Coagulantes e inibidores de dor: ao ficar Gravemente Ferido, ativa e você ignora os efeitos do estado de ferimento e das lesões críticas por <b>dois turnos</b>. Não impede o dano extra das lesões. Recarrega em 24 horas.')
  ];
  const external = [
    ware('Optical Camo', 'Cyberware externo', 'Hospital', '1.000eb', 14, 'Dobra a luz visível em volta do corpo e do equipamento. Ativada com uma Ação: você fica <b>invisível</b> no espectro visível: ninguém te vê a olho nu nem por câmera comum (a visão infravermelha ainda vê o seu calor). Dura 3 rodadas ou até desativar (uma Ação). Depois precisa de um minuto para recarregar. Enquanto você está invisível, quem não te vê ataca com <b>−4</b>, a penalidade de escuridão total (RED p. 130); a munição Smart melhorada ignora essa penalidade.', 'ajuste da mesa: o suplemento não dizia o que a invisibilidade faz no combate; o −4 é o da escuridão total do RED.'),
    ware('Painducer', 'Cyberware externo', 'Clínica', '5.000eb', 14, 'Malha que desvia o sinal de dor: ao sofrer dano, você sofre <b>metade na hora e a outra metade no início do seu próximo turno</b>. Só vale para o último dano recebido: se for atingido de novo, o dano anterior entra inteiro e só o último é dividido.')
  ];
  const limbs = [
    ware('Gorilla Arm', 'Opção de cyberbraço', 'Hospital', '1.000eb', 14, 'O reforço clássico para trabalho pesado. Ocupa dois slots do cyberbraço. O punho é uma <b>arma branca pesada de qualidade excelente</b> (3d6, CDT 2, +1 no ataque). Nessa mão, você empunha armas como se tivesse <b>BODY 11</b> (inclusive armas de duas mãos com uma só, respeitando a CDT). Com dois, um em cada cyberbraço, também força portas e move cobertura grossa, estrangula e derruba (Choke e Slam) como se tivesse BODY 11.', '', { kit: true }),
    ware('Mantis Blade', 'Opção de cyberbraço', 'Hospital', '500eb', 14, 'Lâminas de braço icônicas, letais e fáceis de esconder. Ocupa dois slots do cyberbraço. <b>Arma branca pesada de uma mão, de qualidade excelente</b> (3d6, CDT 2, +1 no ataque), escondida sem teste e sacada ou guardada <b>sem gastar Ação</b>. Com a lâmina para fora, a mão desse braço não segura nada. Com duas, uma em cada cyberbraço, e as duas para fora, você ignora a penalidade de movimento para escalar.', '', { kit: true }),
    ware('Monowire', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, 'Chicote de fio monofilamento com um gume de uma molécula, escondido sem teste. <b>Arma branca pesada exótica de uma mão</b> (3d6, CDT 2) que ataca a até <b>6 m</b>. Quando causa uma lesão crítica, quem atacou rola <b>duas vezes</b> na tabela e escolhe a que a vítima sofre.', '', { kit: true }),
    ware('Projectile Launch System', 'Opção de cyberbraço (borgware)', 'Clínica', '1.000eb', 14, 'Um lançador de explosivos na palma da mão (quase literalmente). Borgware; ocupa dois slots do cyberbraço. <b>Lança-foguetes ou lança-granadas de uma mão</b> com um tiro no pente: com foguete, é lança-foguetes; com granada, lança-granadas. Escondido sem teste e sacado ou guardado sem gastar Ação. Não aceita acessório nenhum, só o Smart Rebuild. Aberto, a mão desse braço não segura nada.', '', { kit: true }),
    ware('Ballistic Coprocessor', 'Opção de cyberbraço', 'Clínica', '100eb', 3, 'Liga arma e óptica para acompanhar munição e trajetória: o <b>ricochete</b> das armas Power sai com <b>−2</b> em vez de −4. Pode ser a única peça de cyberware num braço de carne.', 'no suplemento de fã, dava +2 no teste de ricochete; dá no mesmo.'),
    ware('Microgenerator', 'Opção de cyberbraço', 'Clínica', '500eb', 3, '<b>+1 no segundo ataque corpo a corpo</b> depois do primeiro. Exige cyberbraço.'),
    ware('Shock Absorber', 'Opção de cyberbraço', 'Clínica', '1.000eb', 7, '<b>+2 no teste de autofogo</b>. Exige cyberbraço e ocupa dois slots.'),
    ware('Leeroy Ligament System', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Revisão completa dos ligamentos: <b>+2 de MOVE</b>. Exige duas cyberpernas, ocupa dois slots, em par.'),
    ware('Lynx Paws', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'Tecido biomecânico nos músculos da perna: <b>+2 em Furtividade</b> para se mover em silêncio. Pode ser a única peça numa perna de carne; em par.'),
    ware('Reinforced Tendons', 'Opção de cyberperna (par)', 'Clínica', '500eb', 3, 'No meio do salto, com uma Ação, você muda a direção ou sobe mais 2 m. Exige duas cyberpernas, ocupa dois slots, em par.')
  ];
  // Berserk e Sandevistan dos anos 2070 (sup. p. 24–26): os modelos do suplemento de fã, revisados pela mesa, mais caros e
  // mais fracos que no suplemento, e à venda em todo Night Market de cyberware (decisão do mestre, 2026-10-13). O efeito
  // dura 3 rodadas; ativar é uma Ação, e o implante precisa de 1 hora para ser usado de novo.
  const osware = [
    ware('Moore Tech Berserk', 'Neuralware (opção do Neural Link; Berserk)', 'Clínica', '5.000eb', 14, 'O clássico, testado em combate de alto risco. Por 3 rodadas: <b>+1 em BODY e MOVE</b>, <b>+1 de dano</b> corpo a corpo e de arremesso, e você ignora o estado <b>Gravemente Ferido</b>.', 'no suplemento de fã: 1.000eb, +2 em BODY e MOVE, SP 7 e queda de 30 m sem dano.'),
    ware('Biodyne Berserk', 'Neuralware (opção do Neural Link; Berserk)', 'Clínica', '10.000eb', 14, 'O modelo acessível e versátil da BioDyne. Por 3 rodadas: <b>+2 em BODY e MOVE</b>, <b>+1 de dano</b> corpo a corpo e de arremesso, e você ignora o estado <b>Gravemente Ferido</b> e cai até 10 m sem se machucar.', 'no suplemento de fã: 5.000eb, +3 em BODY e MOVE, SP 11, +1 de dano por dado e queda de 30 m.'),
    ware('Zetatech Berserk', 'Neuralware (opção do Neural Link; Berserk)', 'Clínica', '10.000eb', 14, 'Uma máquina de matar magra e cruel. Por 3 rodadas: <b>+1 em BODY e MOVE</b>, <b>+2 de dano</b> corpo a corpo e de arremesso, e você ignora o estado <b>Gravemente Ferido</b>. Enquanto dura, a armadura do corpo não perde SP por ablação.', 'no suplemento de fã: 10.000eb, +3 em BODY e MOVE, SP 12 sem ablação e +3 de dano.'),
    ware('Militech Berserk', 'Neuralware (opção do Neural Link; Berserk)', 'Clínica', '20.000eb', 14, 'O único Berserk oficial da Militech, nanotecnológico e feito para regenerar. Por 3 rodadas: <b>+2 em BODY e MOVE</b>, <b>+2 de dano</b> corpo a corpo e de arremesso, e você ignora os estados <b>Gravemente e Mortalmente Ferido</b> (o Death Save continua). No fim de cada turno, recupera <b>2 HP</b>.', 'no suplemento de fã: 10.000eb, +4 em BODY e MOVE, SP 11, +2 de dano por dado e metade do BODY em HP por turno.'),
    ware('Zetatech Sandevistan', 'Neuralware (opção do Neural Link; Sandevistan, speedware)', 'Clínica', '5.000eb', 14, 'O Sandevistan popular de massa: minimalista, fácil de usar e bom no ar. Por 3 rodadas: <b>+1 em DEX, REF e MOVE</b> e <b>uma Ação de Movimento a mais</b> em cada turno; quedas de até 10 m não machucam.', 'no suplemento de fã: 1.000eb, +2 em DEX, REF e MOVE, uma Ação a mais (para mover ou atacar) e quedas de até 20 m.'),
    ware('Dynalar Sandevistan', 'Neuralware (opção do Neural Link; Sandevistan, speedware)', 'Clínica', '10.000eb', 14, 'O padrão de soldados e mercenários: velocidade e apoio de combate. Por 3 rodadas: <b>+2 em DEX, REF e MOVE</b> e <b>uma Ação de Movimento a mais</b> em cada turno.', 'no suplemento de fã: 5.000eb, e a lesão crítica saía com 5 ou 6 nos dados.'),
    ware('QianT Warp Dancer Sandevistan', 'Neuralware (opção do Neural Link; Sandevistan, speedware)', 'Clínica', '10.000eb', 14, 'Defesa acima de tudo. Por 3 rodadas: <b>+1 em DEX, REF e MOVE</b>, <b>uma Ação de Movimento a mais</b> em cada turno, e você esquiva de ataques à distância qualquer que seja o seu REF.', 'no suplemento de fã: 5.000eb, +2 em DEX, REF e MOVE, e rebatia até dois ataques à distância de volta em quem atirou.'),
    ware('Militech Falcon Sandevistan', 'Neuralware (opção do Neural Link; Sandevistan, speedware)', 'Clínica', '20.000eb', 14, 'O melhor Sandevistan à venda, antes restrito à elite da Militech. Ao ativar, você vai para o <b>topo da iniciativa</b>. Por 3 rodadas: <b>+2 em DEX, REF e MOVE</b> e <b>uma Ação de Movimento a mais</b> em cada turno.', 'no suplemento de fã: 10.000eb, +3 em DEX, REF e MOVE, uma Ação a mais para mover ou atacar, lesão crítica com 5 ou 6 e HP ao matar.')
  ];

  // Os itens do Mission Kit e os do suplemento de fã que a mesa aprovou (revisão de 2026-10-13), juntos: a etiqueta de
  // cada cartão diz de onde vem. Os recusados saíram das listas e só aparecem por nome na página do suplemento.
  const pages = {
    weapons2077: {
      eyebrow: 'Catálogo / armas dos anos 2070', title: 'Armas de 2077',
      lede: 'Nos anos 2070, as armas Power, Smart e Tech são armas do RED com um Rebuild, um acessório que refaz o miolo da arma. Aqui estão as regras delas e as armas com nome e sobrenome: as 13 do Cyberpunk Edgerunners Mission Kit e as 28 do suplemento de fã que a mesa aprovou. As armas do RED continuam valendo e aceitam um Rebuild.',
      html: `<div class="callout"><b>De onde vem cada arma:</b> as marcadas <b>Mission Kit</b> são as do anime, com os números do Kit. As marcadas <b>suplemento de fã</b> passaram pela revisão da mesa: os números são os do suplemento, e as regras de Power, Smart e Tech são as do Kit. A nota de cada uma diz o que mudou.</div>
        ${section('Rebuilds', 'Kit p. 31–32', `${list(['Um <b>Rebuild</b> transforma uma arma de fogo do RED em arma <b>Power</b>, <b>Smart</b> ou <b>Tech</b>. Cada um custa <b>1.000eb</b> (Muito Caro), ocupa <b>2 slots de acessório</b> e leva <b>1 hora</b> para instalar ou tirar. Só cabe um por arma.', 'Serve em qualquer arma de longo alcance que não seja exótica; o Tech Rebuild não serve em lança-granadas nem em lança-foguetes. Numa arma exótica, o Rebuild entra num slot só, se a arma tiver um livre.', 'As armas desta página já vêm com o Rebuild: o tipo de cada uma diz qual.'])}${button('cyberware2077', 'Cyberware de 2077')}`)}
        ${section('Power', 'Kit p. 31–32', list(['Quando a arma causa uma <b>lesão crítica</b>, o dano bônus da lesão sobe <b>5</b>: 10 em vez de 5.', '<b>Ricochete:</b> você acerta um alvo que sabe onde está, mas que fica atrás de cobertura ou fora da linha de visão, ricocheteando o tiro numa superfície. O ataque tem <b>−4</b>; num <b>tiro mirado</b>, vale só a penalidade do tiro mirado. Precisa de um caminho livre entre o ponto do ricochete e o alvo.', 'O alcance continua sendo a distância entre você e o alvo.', 'Para ricochetear um <b>cartucho</b>, escolha uma superfície a até 6 m de você: ela vira a nova origem do leque, que atinge todos numa área de 6 m na direção que você escolher (com bom senso: o tiro não ricocheteia para trás da superfície).', 'O Ballistic Coprocessor reduz a penalidade do ricochete para −2.']))}
        ${section('Smart', 'Kit p. 32', list(['A arma precisa estar <b>conectada</b> a você por um <b>Personal Link</b> (o Interface Plug que vem no Neuroport) ou por um <b>Subdermal Grip</b>. Sem conexão, não dispara.', '<b>+1</b> nos ataques à distância com a arma.', 'Aceita a <b>munição Smart melhorada</b> dos tipos que dispara. Com outra munição, fica só o +1.', 'O Smart Rebuild não vai numa arma com <b>Smartgun Link</b>, e o Smartgun Link não faz de uma arma uma arma Smart.']))}
        ${section('Munição Smart melhorada', 'Kit p. 32', list(['Custa <b>50eb</b> (Oneroso) por 10 flechas, balas, balotes ou cartuchos, e <b>500eb</b> (Caro) por granada ou foguete.', 'Só funciona em arma Smart; uma arma com Smartgun Link não conta.', 'Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra coisa que atrapalhe a visão.', '<b>Segunda chance:</b> se o ataque à distância errar a DV por <b>5 ou menos</b>, você tenta de novo na hora, com <b>14 + 1d10</b> (dá para somar Sorte) no lugar de STAT + perícia + bônus, contra a mesma DV. As penalidades do primeiro tiro continuam valendo.']))}
        ${section('Tech', 'Kit p. 32', list(['A mira vê o <b>contorno dos alvos</b> através de cobertura fina.', '<b>Carregar:</b> você gasta a <b>Ação de Movimento</b>, e a arma fica carregada até disparar ou por 60 segundos (20 rodadas).', 'Carregada, o <b>próximo ataque</b> que não seja explosivo é de <b>CDT 1</b>, atravessa <b>cobertura fina</b> e <b>ignora metade do SP</b> do alvo (arredondado para cima). A cobertura atravessada não perde HP: os furos são pequenos demais para estragá-la.', 'Por isso a ficha de armadura do Kit mostra o SP contra corpo a corpo e contra Tech carregada: a metade.']))}
        ${section('Qualidade das armas', '342', list(['<b>Ruim:</b> emperra numa <b>falha crítica</b> (1 no dado de ataque); é preciso uma Ação para desemperrar.', '<b>Excelente:</b> <b>+1 no ataque</b>.', 'Armas exóticas são sempre de qualidade padrão, a não ser que a descrição diga outra coisa.', 'Armas de longo alcance que não são exóticas têm 3 slots de acessório; com o Rebuild, sobra 1.']))}
        ${section('Pistolas', 'Kit p. 33–34 · sup. p. 32–35', grid(pistols))}
        ${section('Revólveres e pistolas muito pesadas', 'Kit p. 33–34 · sup. p. 35–37', grid(revolvers))}
        ${section('Submetralhadoras', 'Kit p. 32–33 · sup. p. 38–40', grid(smgs))}
        ${section('Espingardas', 'Kit p. 33–34 · sup. p. 40–44', grid(shotguns))}
        ${section('Rifles de assalto', 'Kit p. 33 · sup. p. 44–47', grid(rifles))}
        ${section('Rifles de precisão e sniper', 'Kit p. 34–35 · sup. p. 48–50', grid(snipers))}
        ${section('Veja também', '', `<p>${button('economy', 'Preços por categoria')} ${button('gear', 'Armas genéricas do RED')} ${button('supplement2077', 'O que saiu do suplemento de fã')}</p><p class="note-status">Armas brancas, arcos e lança-granadas seguem o RED. Os de longo alcance aceitam Rebuild como qualquer arma (o Tech não serve em lança-granadas).</p>`)}`
    },

    cyberware2077: {
      eyebrow: 'Catálogo / cyberware dos anos 2070', title: 'Cyberware de 2077',
      lede: 'O cromo do RED continua em uso nos anos 2070, adaptado ao Neuroport. Aqui está o cromo novo: o do Cyberpunk Edgerunners Mission Kit, o do suplemento de fã que a mesa aprovou e os Berserk e Sandevistan dos anos 2070, com custo, local de instalação e perda de Humanidade. O resto está no catálogo do RED.',
      html: `${section('Antes de instalar', 'Kit p. 26 e 36', `${list(['<b>Neuroport:</b> na criação, todo personagem pode instalar um, <b>de graça e sem perda de Humanidade</b>. Ele é o pré-requisito de todo cyberware que não seja de grau médico e já traz Neural Link (5 slots), Holophone, Biomonitor, Virtu, HUD, dois Shard Slots e o Personal Link.', '<b>O cyberware do RED</b> continua valendo, com os mesmos números: até o cromo antigo foi adaptado para funcionar com o Neuroport.', 'Cada item diz de onde vem: <b>Mission Kit</b> (oficial) ou <b>suplemento de fã</b> (aprovado pela mesa, com as regras do Kit).', 'Onde instalar: <b>Loja</b> (DV13, 100eb), <b>Clínica</b> (DV15, 500eb), <b>Hospital</b> (DV17, 1.000eb). Veja Dano, ferimentos e cura.'])}<p>${button('cyberware', 'Cyberware do RED')} ${button('netrunning', 'Netrunning e o Neuroport')}</p>`)}
        ${section('Neuroport', 'Kit p. 36–37', grid(neuroport))}
        ${section('Fashionware', 'sup. p. 27', grid(fashionware))}
        ${section('Neuralware', 'Kit p. 35 · sup. p. 23 e 27', `<p>Opções do Neural Link do Neuroport, que tem 5 slots.</p>${grid(neural)}`)}
        ${section('Berserk e Sandevistan', 'sup. p. 24–26', `<p>Nos anos 2070, os Berserk e Sandevistan de linha são comuns: <b>todo Night Market de cyberware tem um à venda</b>. São os modelos do suplemento de fã, mais caros e mais fracos que lá. Os do Mission Kit (o Berserk Implant e a Sandevistan do David, em Neuralware) valem como no livro.</p>${list(['Cada um é uma opção do <b>Neural Link</b> (1 slot). O <b>Sandevistan</b> é speedware: só cabe um, e ele não soma com o Kerenzikov, a Sandevistan do RED nem a do David.', 'Ativar é uma <b>Ação</b>. O efeito dura <b>3 rodadas</b>, e depois o implante precisa de <b>1 hora</b> para ser usado de novo.', 'Os STATs não passam de 10, e o HP não muda com o BODY.', 'Todos causam <b>14 (4d6)</b> de perda de Humanidade.'])}${grid(osware)}<p><button class="action" data-page="economy" data-section="night-market" type="button">Night Market</button></p>`)}
        ${section('Cyberware interno', 'sup. p. 28–29', `<p>Sete slots de opção interna disponíveis.</p>${grid(internal)}`)}
        ${section('Cyberware externo', 'sup. p. 29', `<p>Sete slots de opção externa disponíveis.</p>${grid(external)}`)}
        ${section('Cybermembros', 'Kit p. 36–37 e 41 · sup. p. 30', `<p>As opções de cyberbraço exigem um <b>cyberbraço</b>, o do RED: 500eb, Hospital, perda 7 (2d6) e <b>4 slots de opção</b>. Com BODY 4 ou menos, a Briga com ele causa <b>2d6</b>, e ele consegue danificar cobertura de aço.</p>${grid(limbs)}`)}`
    },

    // O suplemento de fã de 2077: as regras saíram da mesa, e os itens passaram pela revisão do mestre (2026-10-13).
    // Os aprovados estão nos catálogos com a etiqueta "suplemento de fã"; aqui fica a lista do que saiu e por quê.
    supplement2077: {
      eyebrow: 'Fontes / suplemento de fã', title: 'Suplemento de fã: o que saiu',
      // Na busca, depois das páginas que valem: o Kerenzikov do RED vem antes do Kerenzikov (2077) que saiu.
      prioridade: -60,
      lede: 'O suplemento de fã "Cyberpunk 2077 – A Cyberpunk RED Supplement", de Queen Otter, não é mais usado nas regras da mesa: valem o Cyberpunk Edgerunners Mission Kit e, no que ele não muda, o RED. Os itens dele passaram por uma revisão: os que entraram estão nos catálogos, com a etiqueta "suplemento de fã". Aqui fica o que saiu, e por quê.',
      html: `${section('O que entrou', 'revisão da mesa', `${list([
          '<b>Armas:</b> 28, com as regras de Power, Smart e Tech do Kit.',
          '<b>Cyberware:</b> 17, mais o Memory Boost e o Optical Camo (com um ajuste: −4 para atacar quem não se vê).',
          '<b>Berserk e Sandevistan:</b> os 8 modelos, mais caros e mais fracos, e à venda em todo Night Market de cyberware.',
          '<b>Quickhacks:</b> 5 (Reboot Optics, Request Backup, Weapon Glitch, Contagion e Memory Wipe), como os do Kit: todo netrunner faz os do nível dele, sem comprar.',
          '<b>Cyberdecks:</b> os 21 modelos, só como a marca de um deck do RED (ruim, padrão ou excelente).'
        ])}<p>${button('weapons2077', 'Armas de 2077')} ${button('cyberware2077', 'Cyberware de 2077')} ${button('quickhacks', 'Quickhacks')} ${button('netArsenal', 'Arsenal da NET')}</p>`)}
        ${section('Itens que saíram', 'revisão da mesa', list([
          '<b>Armas:</b> a <b>DR-12 Quasar</b> (sem a rajada de 10 balas, sobra uma pistola Tech de 5.000eb que a Burya do Kit faz por 1.000eb); a <b>Defender</b>, a <b>MA70 HB</b> e a <b>Mk.31 HMG</b> (o RED e o Kit não têm metralhadora, e o suplemento se contradiz na perícia da MA70 e no preço da Mk.31); e a <b>SOR-22</b> (o texto e a tabela não batem, e 6d6 passa do rifle sniper do RED).',
          '<b>Cyberware que repete um do RED</b> (vale o do RED): o <b>Kerenzikov</b>, o <b>TeleOptics</b>, o <b>Pain Editor</b>, o <b>Subdermal Armour</b> e o <b>Biomonitor</b> de 2077; o <b>Epimorphic Skeleton / Titanium Bones</b> (o Grafted Muscle and Bone Lace); o <b>Fortified Ankle / Jump Boost</b> (o Jump Booster); o <b>Smart Link</b> (o Subdermal Grip); o <b>Basic Kiroshi Optics</b> (o Cybereye, com opções de graça); e o <b>Blood Pump</b> (o Reinforced Antibodies).',
          '<b>Adrenaline Converter:</b> +2 de iniciativa sem ser speedware, então somaria com o Kerenzikov.',
          '<b>Skin Weave</b> de 2077 e as placas <b>Carapace</b>, <b>Countershell</b>, <b>Nano-plating</b>, <b>ProxiShield</b> e <b>RangeGuard</b>: o sistema de placas do suplemento, que o RED não tem; quatro dão +1 de SP, e o RED não tem bônus de SP. O <b>Kinetic Frame / Scarab</b> sai pelo mesmo +1 de SP.',
          '<b>Microrotors:</b> quebram a CDT 1 das armas brancas muito pesadas. <b>Jenkins\' Tendons:</b> +2 de MOVE barato, até numa perna de carne, e somariam com o Leeroy.',
          '<b>Quickhacks:</b> o <b>Bait</b> (o Lure do Kit por DV6); o <b>Cripple Legs / Arms</b> (mais forte que o Slow e o Cyberware Malfunction, de DV10); o <b>Detonate Grenade</b> e o <b>Suicide</b> (o Puppet já faz); o <b>Cyberpsychosis</b> (no Kit, a ciberpsicose vem da Humanidade); e o <b>System Collapse</b> (o System Reset por 24 horas, no mesmo DV12).',
          '<b>Daemons</b> (Imp, Efreet e Balron de 2077, ICEpick e Datamine) e <b>White ICE</b> (DataClear, Heaven Pup, Heaven Dog, Heaven Hound e Kami Chip): o RED já tem os Demônios, o Worm faz o que o ICEpick faz, e o Kit protege o Neuroport com o Self-ICE.',
          '<b>Neuralware de netrunning:</b> o <b>RAM Reallocator</b> e o <b>RAM Upgrade</b> (a RAM saiu), o <b>Bioconductor</b> (os quickhacks do Kit não rolam dano crítico) e o <b>Mechatronic Core</b> (no Kit, só se hackeia quem tem Neuroport).',
          '<b>Dos cyberdecks:</b> a RAM, o cooling e as especialidades. Os modelos ficaram como marca.'
        ]))}
        ${section('Regras que saíram', 'sup.', `${list([
          '<b>Roles:</b> o Face e o Corpo (valem as dez Roles do RED), o Lawman com Investigator e o desconto do clã do Nomad.',
          '<b>Economia:</b> as categorias de preço um degrau acima, o fim do Kibble, o aluguel subsidiado do megaprédio, o hustle de 1,5×, o desconto do item usado, as zonas sem combate com a autodefesa e os preços dos quatro estilos de moda.',
          '<b>Netrunning:</b> a rede de três camadas (arquitetura, LocalNet e SubNet), com RAM e cooling; as mudanças na Interface (bônus de netrunning, RAM e slots extras, a fila de ações); o cyberdeck como sistema operacional do Neural Link; o Rating do White ICE contra o Breach; e o mercado de só quatro peças de hardware.',
          '<b>Armas:</b> o teste Smart (10 ou 12 + 1d10), a rajada carregada, o "esfriar" e as flechettes das armas Tech.',
          '<b>Cyberware:</b> o cyberware inicial de graça (Neural Link, Cyberaudio Suite, Internal Agent, Personal Link e dois Chipware Sockets). No Kit, é o Neuroport.',
          '<b>Itens repetidos:</b> as 13 armas do Kit, o Ex-Disk, o Self-ICE, a Gorilla Arms, as Mantis Blades, o Monowire, o Projectile Launch System e cinco quickhacks. Ficou a versão do Kit.'
        ])}<p>${button('roles', 'Roles')} ${button('economy', 'Economia')} ${button('netrunning', 'Netrunning')}</p>`)}`
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

  // As tabelas das páginas: os itens do Kit e os do suplemento de fã aprovados, com a coluna Origem.
  const weaponRows = Object.values({ pistols, revolvers, smgs, shotguns, rifles, snipers }).flat().map(entry => entry.raw);
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
  const cyberRows = Object.values({ neuroport, fashionware, neural, osware, internal, external, limbs }).flat().map(entry => entry.raw);
  const cyberGroup = row => row.category.split(' (')[0];
  pages.cyberware2077.setup = compareTable({
    pageId: 'cyberware2077', rows: cyberRows, noun: 'implantes',
    columns: [['Implante', row => row.name], ['Origem', origin], ['Categoria', row => row.category], ['Instalação', row => row.install], ['Humanidade', row => String(row.humanity), 'numero'], ['Preço', row => row.cost, 'numero']],
    filters: [['Origem', origin], ['Categoria', cyberGroup], ['Instalação', row => row.install]]
  });

  // data: as listas cruas, lidas pelo build do módulo do Foundry (foundry-2077/build).
  // compareTable: a vista de tabela, que as páginas do Black Chrome (system-blackchrome.js) também usam.
  window.system2077 = {
    pages, compareTable,
    data: {
      weapons: { pistols, revolvers, smgs, shotguns, rifles, snipers },
      cyberware: { neuroport, fashionware, neural, osware, internal, external, limbs }
    }
  };
})();
