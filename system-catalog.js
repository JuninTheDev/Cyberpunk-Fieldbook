(() => {
  const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const expandable = (title, rows) => `<details class="section"><summary>${title} / ${rows.length} entradas</summary>${table(['Implante', 'O que oferece', 'Compatibilidade / nota'], rows)}</details>`;

  const roleRows = [
    ['Rockerboy', 'Artista, agitador ou figura pública que transforma presença e mensagem em influência.', '<b>Impacto Carismático:</b> converte pessoas em fãs e pede favores a fãs. Rolagem: Rank + 1d10; DV 8 para uma pessoa, 10 para até seis, 12 para um grupo maior. O Rank limita o favor: começa com pequenos favores e pode chegar a redes leais dispostas a riscos extremos.'],
    ['Solo', 'Especialista de combate: mercenário, guarda-costas, assassino ou veterano de guerra.', '<b>Consciência de Combate:</b> aloca pontos entre seis vantagens e pode redistribuí-los antes do combate ou com uma ação: iniciativa (+1 por ponto); ataque de precisão (+1 por cada 3 pontos); ponto fraco (+1 dano antes da armadura no primeiro acerto da rodada por ponto); detecção (+1 Percepção por ponto); deflexão (2 pontos reduzem em 1 o primeiro dano sofrido na rodada, até 5); recuperação de falhas (4 pontos ignoram falhas críticas no ataque).'],
    ['Netrunner', 'Hacker que invade arquiteturas locais e enfrenta ICE enquanto a equipe protege o corpo no espaço físico.', '<b>Interface:</b> concede ações de NET e nove habilidades: Breach (romper senhas e Passwalls), Cloak (ocultar ações), Control (operar dispositivos), Eye-Dee (identificar dados), Pathfinder (mapear a arquitetura), Scanner (localizar sistemas), Slide (escapar de ICE), Virus (criar vírus) e Zap (atacar programas e netrunners). Nos anos 2070, também faz quickhacks no Neuroport das pessoas. Ações por turno: 2 nos Ranks 1–3, 3 nos Ranks 4–6, 4 nos Ranks 7–9 e 5 no Rank 10.'],
    ['Tech', 'Inventor, reparador e modificador; mantém máquinas e equipamentos funcionando numa cidade sem cadeia de suprimentos confiável.', '<b>Maker / Artífice:</b> cada avanço concede um Rank em duas especialidades distintas. Field Expertise soma o Rank a testes técnicos relevantes e permite reparos temporários; Upgrade Expertise melhora um item; Fabrication produz itens existentes; Invention projeta um item ou upgrade novo com aprovação do GM.'],
    ['Medtech', 'Médico de rua, cirurgião ou paramédico que trata corpos orgânicos e cibernéticos.', '<b>Medicine:</b> a cada Rank, coloca 1 ponto em uma especialidade. Surgery aumenta a perícia Surgery em 2 por ponto (máximo 10); Pharmaceuticals aumenta Medical Tech e libera fármacos; Cryosystem Operation aumenta Medical Tech e libera cryopumps/cryotanks. Desbloqueia tratamento de lesões críticas, instalação/remoção de cyberware e terapia.'],
    ['Media', 'Jornalista, investigador e publicador que desafia corporações com fontes e reputação.', '<b>Credibility:</b> recebe rumores passivamente (Rank + 1d10, pelo menos duas vezes por semana, se não estiver fora do radar), pode investigar rumores ativamente e publica histórias para uma audiência. O Rank amplia fontes, alcance e credibilidade percebida; evidências verificáveis ajudam o público a acreditar.'],
    ['Exec', 'Operador corporativo com acesso a alojamento, benefícios e uma equipe de funcionários.', '<b>Teamwork:</b> cresce o pacote corporativo conforme o Rank. Ganha equipe nos Ranks 3, 5 e 9 (máximo 3); alojamento nos Ranks 2, 7 e 10; seguro Trauma Team nos Ranks 6 e 8. Membros têm lealdade e são controlados pelo GM, não são autômatos.'],
    ['Lawman', 'Policial ou agente da lei que usa contatos institucionais para trazer apoio.', '<b>Backup / Reforços:</b> como ação, rola 1d10 e obtém resposta se o resultado for igual ou inferior ao Rank. Um d6 determina em quantas rodadas chega o grupo; um 6 chama uma força um nível acima (no Rank 10, dois grupos). O nível define composição, equipamento e proteção.'],
    ['Fixer', 'Intermediário que encontra mercadorias, favores, contatos e oportunidades no mercado clandestino.', '<b>Operator:</b> reúne quatro vantagens que escalam com Rank: contatos/clientes, acesso a categorias de preço e Night Markets, negociação de compras/vendas ou contratos, e familiaridade cultural/idiomas. Haggling é um teste enfrentado de COOL + Trading + Operator + 1d10.'],
    ['Nomad', 'Motorista, piloto, mecânico ou membro de uma família que domina estradas e rotas de abastecimento.', '<b>Moto:</b> soma o Rank a Dirigir, Pilotar e Tech de veículos terrestres, aéreos e marítimos. A cada avanço de Rank, pode adicionar um veículo familiar permitido ou aplicar um upgrade; a oficina familiar abre classes melhores conforme o Rank. Rank 10 traz liderança e maior acesso à frota.']
  ];

  const cyberware = [
    ['Fashionware', [
      ['Biomonitor', 'Mostra sinais vitais e pode conectar-se a um Agent.', 'Pode ser ligado a um Agent.'],
      ['Pigmentação artificial', '+2 Personal Grooming quando combinada com Techhair.', 'Fashionware cosmético.'],
      ['Fio metálico EMP', 'Linhas decorativas sob a pele.', 'Fashionware cosmético.'],
      ['Tatuagens luminosas', '+2 Wardrobe & Style com três ou mais tatuagens.', 'Fashionware cosmético.'],
      ['Lentes de contato mutáveis', 'Muda a cor da íris.', 'Implante ocular cosmético.'],
      ['Relógio subdérmico', 'Relógio de LED integrado sob a pele.', 'Fashionware.'],
      ['Techhair', '+2 Personal Grooming combinado com Pigmentação artificial.', 'Cabelo artificial com cor/luz.']
    ]],
    ['Neuralware', [
      ['Neural Link', 'Pré-requisito para Neuralware; oferece cinco slots de opção.', 'Implante-base.'],
      ['Gravador de Neurodance', 'Grava experiências para chip de memória ou dispositivo externo.', 'Requer Neural Link.'],
      ['Chipware Socket', 'Permite instalar e usar Chipware.', 'Requer Neural Link.'],
      ['Interface Plugs', 'Permite conexão direta com máquinas compatíveis.', 'Requer Neural Link.'],
      ['Kerenzikov', '+2 em Iniciativa, sempre ativo.', 'Speedware; requer Neural Link; só uma peça Speedware instalada.'],
      ['Sandevistan', '+3 em Iniciativa por um minuto quando ativado; recarga de uma hora.', 'Requer Neural Link; ativar exige uma ação; só um Speedware.'],
      ['Analisador químico', 'Analisa substâncias com precisão e compara a um banco de dados.', 'Chipware; requer Chipware Socket.'],
      ['Chip de memória', 'Armazenamento pessoal de dados.', 'Chipware.'],
      ['Olfato aprimorado', 'Permite rastrear uma pessoa pelo cheiro.', 'Chipware; requer Chipware Socket.'],
      ['Pain Editor', 'Ignora penalidades de Seriously Wounded.', 'Chipware; requer Chipware Socket.'],
      ['Skill Chip', 'Eleva uma perícia compatível a nível 3 se ela estiver abaixo disso.', 'Chipware; perícias x2 custam mais; requer Chipware Socket.'],
      ['Tato aprimorado', 'Detecta movimento num raio de 20 m ao tocar uma superfície.', 'Chipware; requer Chipware Socket.']
    ]],
    ['Cyberoptics', [
      ['Cybereye', 'Implante-base para opções ópticas; três slots de opção por olho.', 'Opções que pedem par ocupam os dois olhos.'],
      ['Anti-dazzle', 'Imunidade a efeitos de flashes luminosos.', 'Requer dois Cybereyes; pareado.'],
      ['Chyron Display', 'Projeta uma tela de dados no campo de visão.', 'Requer Cybereye.'],
      ['Cor mutável', 'Altera cor e padrão do olho.', 'Requer Cybereye.'],
      ['Dartgun', 'Dardo de disparo único oculto no olho.', 'Requer Cybereye; ocupa 3 slots.'],
      ['Imagem aprimorada', '+2 Perception, Lip Reading e Conceal/Reveal Object.', 'Requer dois Cybereyes; pareado.'],
      ['Low Light / Infrared / UV', 'Ignora penalidades de escuridão, fumaça ou nevoeiro, conforme modo.', 'Requer dois Cybereyes; pareado; 2 slots por olho.'],
      ['Visão microscópica', 'Ampliação óptica até 400x.', 'Requer Cybereye.'],
      ['Micro Video', 'Grava áudio e vídeo para chip ou Agent vinculado.', 'Requer Cybereye; ocupa 2 slots.'],
      ['Detector de radiação', 'Mostra radiação num raio de 100 m por uma indicação visual.', 'Requer Cybereye.'],
      ['Targeting Scope', '+1 em tiros mirados.', 'Requer Cybereye.'],
      ['TeleOptics', 'Visão detalhada até 800 m; +1 em tiros mirados contra alvos a 51 m ou mais.', 'Requer Cybereye.'],
      ['Virtuality', 'Sobrepõe a interface digital ao campo de visão.', 'Requer dois Cybereyes; pareado.']
    ]],
    ['Cyberaudio', [
      ['Cyberaudio Suite', 'Implante-base com três slots de opção.', 'Só é possível instalar uma Suite.'],
      ['Audição amplificada', '+2 Perception em testes que dependam de audição.', 'Requer Cyberaudio Suite.'],
      ['Audio Recorder', 'Grava áudio para chip de memória ou Agent vinculado.', 'Requer Cyberaudio Suite.'],
      ['Detector de escutas', 'Avisa quando um dispositivo de escuta está a até 2 m.', 'Requer Cyberaudio Suite.'],
      ['Homing Tracer', 'Segue o sinal de um localizador até cerca de 1,6 km.', 'Requer Cyberaudio Suite.'],
      ['Internal Agent', 'Agent integrado; pode aparecer no Chyron se ligado a um Cybereye.', 'Requer Cyberaudio Suite para funções completas.'],
      ['Level Damper', 'Imunidade a efeitos de ruídos intensos.', 'Requer Cyberaudio Suite.'],
      ['Radio Communicator', 'Comunicação por rádio até cerca de 1 km.', 'Requer Cyberaudio Suite.'],
      ['Radio Scanner / Music Player', 'Reproduz música ou sintoniza transmissões próximas.', 'Requer Cyberaudio Suite.'],
      ['Radar Detector', 'Avisa de feixe de radar ativo dentro de 100 m.', 'Requer Cyberaudio Suite.'],
      ['Scrambler / Descrambler', 'Codifica transmissões de saída e decodifica as recebidas.', 'Requer Cyberaudio Suite.'],
      ['Voice Stress Analyzer', '+2 Human Perception e Interrogation.', 'Requer Cyberaudio Suite.']
    ]],
    ['Cyberware interno', [
      ['AudioVox', '+2 Acting e Play Instrument ao cantar.', 'Sintetizador de voz.'],
      ['Implante contraceptivo', 'Previne gravidez.', 'Sem bônus de perícia.'],
      ['Reinforced Antibodies', 'Depois de estabilizado, recupera BODY x 2 HP por dia de descanso.', 'Benefício de recuperação.'],
      ['CyberSnake', 'Arma branca Muito Pesada integrada à garganta; pode ser ocultada.', 'Arma implantada.'],
      ['Gills', 'Permite respirar debaixo d’água.', 'Adaptação respiratória.'],
      ['Grafted Muscle and Bone Lace', '+2 BODY, até máximo 10; recalcula HP, Seriously Wounded e Death Save.', 'Aprimoramento corporal.'],
      ['Oxygen Supply', 'Fornece 30 minutos de oxigênio; recarga leva uma hora em ar ambiente.', 'Sobrevivência em ambiente sem ar.'],
      ['Midnight Lady', 'Implante sexual de personalização corporal.', 'Sem bônus geral de perícia indicado.'],
      ['Mr. Studd', 'Implante sexual de personalização corporal.', 'Sem bônus geral de perícia indicado.'],
      ['Nasal Filters', 'Imunidade a gases tóxicos, fumaça e perigos semelhantes.', 'Proteção interna.'],
      ['Radar / Sonar Implant', 'Varre a área até 50 m; a cobertura bloqueia a varredura.', 'Sensor.'],
      ['Toxin Binders', '+2 Resist Torture/Drugs.', 'Proteção contra toxinas.'],
      ['Vampyres', 'Arma branca Leve implantada na boca; ocultável e pode administrar veneno/biotoxina.', 'Arma implantada.']
    ]],
    ['Cyberware externo', [
      ['Hidden Holster', 'Guarda no corpo uma arma que normalmente pode ser ocultada.', 'Instalação clínica.'],
      ['Skin Weave', 'SP 7 no corpo e na cabeça. Não soma com armadura vestida: vale o maior SP do local, e a ablação atinge todas as fontes.', 'Malha sob a pele, a opção leve; recupera 1 SP por dia de cura natural.'],
      ['Subdermal Armor', 'SP 11 no corpo e na cabeça. Não soma com armadura vestida: vale o maior SP do local, e a ablação atinge todas as fontes.', 'Placas grossas sob a pele, a opção pesada; recupera 1 SP por dia de cura natural.'],
      ['Subdermal Pocket', 'Compartimento oculto sob a pele de aproximadamente 5 x 10 cm.', 'Armazenamento.']
    ]],
    ['Cybermembros: braço e mão', [
      ['Cyberarm', 'Membro-base com quatro slots; inclui mão padrão sem HL ou slot adicional.', 'Implante-base.'],
      ['Standard Hand', 'Mão de reposição com aparência de mão normal.', 'Não ocupa slot; num braço de carne, não conta como peça de cyberware.'],
      ['Big Knucks', 'Arma branca Média oculta nos nós dos dedos.', 'Também pode ser peça única num braço orgânico.'],
      ['Cyberdeck', 'Acomoda um cyberdeck dentro do braço cibernético.', 'Requer Cyberarm; ocupa 3 slots.'],
      ['Grapple Hand', 'Dispara a mão ligada a um cabo de gancho até 30 m.', 'Não funciona como arma; requer Cyberarm.'],
      ['Medscanner', '+2 First Aid e Paramedic ao diagnosticar ferimentos/doenças.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Implanted Grenade Launcher', 'Lançador de granada de tiro único oculto.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Arma branca embutida', 'Instala uma arma branca Leve, Média ou Pesada e permite ocultá-la.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Implanted Shield', 'Escudo balístico embutido substituível quando chega a 0 HP.', 'Requer Cyberarm; ocupa 3 slots.'],
      ['Arma de distância embutida', 'Instala arma de uma mão e permite ocultá-la.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Quick Change Mount', 'Permite remover ou instalar o Cyberarm com uma ação.', 'Montagem de troca rápida.'],
      ['Rippers', 'Arma branca Média: garras de carbo-vidro ocultas.', 'Pode ser peça única num braço orgânico.'],
      ['Scratchers', 'Arma branca Leve: unhas de carbo-vidro ocultas.', 'Pode ser peça única num braço orgânico.'],
      ['Shoulder Cam', 'Câmera de vídeo embutida no ombro.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Slice N’ Dice', 'Arma branca Média de monofilamento embutida no polegar.', 'Pode ser peça única num braço orgânico.'],
      ['Subdermal Grip', 'Permite usar arma inteligente sem Interface Plugs.', 'Requer Neural Link; também pode ser peça única.'],
      ['Techscanner', 'Ajuda a detectar falhas; concede bônus a testes técnicos indicados pela entrada.', 'Requer Cyberarm; ocupa 2 slots.'],
      ['Tool Hand', 'Ferramentas pequenas (ex.: chave de fenda e broca) nos dedos.', 'Pode ser peça única num braço orgânico.'],
      ['Wolvers', 'Arma branca Pesada: garras longas ocultas.', 'Pode ser peça única num braço orgânico.']
    ]],
    ['Cybermembros: perna e pé', [
      ['Cyberleg', 'Membro-base com três slots; pé padrão não ocupa slot nem causa HL.', 'Opções que exigem par precisam de duas pernas.'],
      ['Standard Foot', 'Pé de reposição com aparência de pé normal.', 'Não ocupa slot; numa perna de carne, não conta como peça de cyberware.'],
      ['Grip Foot', 'Remove penalidade de movimento ao escalar.', 'Requer duas Cyberlegs; pareado.'],
      ['Jump Booster', 'Remove penalidade de movimento ao saltar.', 'Requer duas Cyberlegs; ocupa 2 slots; pareado.'],
      ['Roller Skates', 'Aumenta em 6 m o movimento durante uma ação de corrida.', 'Requer duas Cyberlegs; pareado.'],
      ['Foot Blade', 'Arma branca Leve instalada no pé; pode ser ocultada.', 'Pode ser peça única numa perna orgânica.'],
      ['Webbed Toes', 'Remove penalidade de movimento ao nadar.', 'Requer duas Cyberlegs; pareado.'],
      ['EMP Shielding', 'Protege o membro e opções instaladas contra pulsos EMP e efeitos ICE não-black.', 'Requer Cyberarm ou Cyberleg.'],
      ['Plastic Covering', 'Cobertura plástica disponível em cores e padrões.', 'Não ocupa slot.'],
      ['Realskinn Covering', 'Revestimento artificial de pele para o membro.', 'Não ocupa slot.'],
      ['Superchrome', '+2 Wardrobe & Style.', 'Cobertura metálica; não ocupa slot.']
    ]],
    ['Borgware', [
      ['Artificial Shoulder Mount', 'Permite montar dois Cyberarms adicionais abaixo do par de braços principal.', 'Instalação hospitalar.'],
      ['Linear Frame Sigma', 'Eleva BODY para 12 e atualiza HP, Seriously Wounded e Death Save.', 'Exige BODY 6 e Grafted Muscle and Bone Lace.'],
      ['Linear Frame Beta', 'Eleva BODY para 14 e atualiza HP, Seriously Wounded e Death Save.', 'Exige BODY 8 e dois Grafted Muscle and Bone Lace.'],
      ['MultiOptic Mount', 'Permite instalar até cinco Cybereyes adicionais.', 'Instalação hospitalar.'],
      ['Sensor Array', 'Acrescenta cinco slots de opção ao Cyberaudio.', 'Requer Cyberaudio Suite.']
    ]]
  ];

  const cyberwareHTML = `<div class="section"><h3>Regras comuns</h3><p>O RED organiza o cyberware em oito famílias. Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e externo usam slots de categoria. Benefícios repetidos não acumulam salvo indicação específica. A instalação está incluída no custo do implante; registre humanidade, slots e requisitos na ficha.</p><p><b>Nos anos 2070</b> (Kit p. 26), todo cyberware que não seja de grau médico exige o <b>Neuroport</b>, e até o cromo antigo foi adaptado para ele. O Neuroport já traz o Neural Link, os Plugs de Interface (o Personal Link), dois Chipware Sockets, o Biomonitor, o Virtuality e o Chyron. <button class="action" data-page="cyberware2077" type="button">Neuroport e o cromo do Kit</button></p><p>O valor de Humanity Loss, o custo e o local de instalação variam por item. Uma lesão crítica na região impede instalação até ser tratada.</p></div>${cyberware.map(([category, items]) => expandable(category, items)).join('')}<div class="callout"><b>Base de regras:</b> os itens acima são do catálogo RED em português. Sandevistan e Kerenzikov aqui correspondem às entradas Speedware do RED; o Neuroport, Gorilla Arm, Mantis Blade, Monowire e o resto do cromo dos anos 2070 estão na página Cyberware de 2077.</div><button class="action" data-page="cyberware2077" type="button">Abrir Cyberware de 2077</button>`;

  const meleeWeapons = [
    ['Branca Leve', 'Faca, tomahawk', '1d6', '2', 'Varia por arma', 'Sim', '50eb'],
    ['Branca Média', 'Taco, pé de cabra, facão', '2d6', '2', 'Varia por arma', 'Não', '50eb'],
    ['Branca Pesada', 'Cano, espada, taco com espinhos', '3d6', '2', 'Varia por arma', 'Não', '100eb'],
    ['Branca Muito Pesada', 'Motosserra, marreta, naginata', '4d6', '1', 'Varia', 'Não', '500eb']
  ];
  const rangedWeapons = [
    ['Pistola Média', 'Handgun', '2d6', '12', '2', '1', 'Sim', '50eb', '—'],
    ['Pistola Pesada', 'Handgun', '3d6', '8', '2', '1', 'Sim', '100eb', '—'],
    ['Pistola Muito Pesada', 'Handgun', '4d6', '8', '1', '1', 'Não', '100eb', '—'],
    ['SMG', 'Handgun', '2d6', '30', '1', '1', 'Sim', '100eb', 'Autofogo (3), supressão'],
    ['SMG Pesada', 'Handgun', '3d6', '40', '1', '1', 'Não', '100eb', 'Autofogo (3), supressão'],
    ['Espingarda (balote)', 'Shoulder Arms', '5d6', '4', '1', '2', 'Não', '500eb', 'Cartuchos'],
    ['Rifle de Assalto', 'Shoulder Arms', '5d6', '25', '1', '2', 'Não', '500eb', 'Autofogo (4), supressão'],
    ['Rifle Sniper', 'Shoulder Arms', '5d6', '4', '1', '2', 'Não', '500eb', '—'],
    ['Arco / besta', 'Archery', '4d6', '—', '1', '2', 'Não', '100eb', 'Flechas'],
    ['Lança-granadas', 'Heavy Weapons', '6d6', '2', '1', '2', 'Não', '500eb', 'Explosivo'],
    ['Lança-mísseis', 'Heavy Weapons', '8d6', '1', '1', '2', 'Não', '500eb', 'Explosivo']
  ];
  const exoticWeapons = [
    ['Air Pistol', 'Pistola Muito Pesada que dispara bolas de tinta ou ácido.', '100eb'],
    ['Battleglove', 'Manopla pesada com três slots de opção de Cyberarm/Cyberfinger.', '1.000eb'],
    ['Constitution Arms Hurricane', 'Espingarda automática com 2 ROF; exige BODY 11.', '5.000eb'],
    ['Dartgun', 'Pistola Muito Pesada que dispara dardos especiais.', '100eb'],
    ['Lança-chamas', 'Espingarda que dispara cartuchos incendiários; Heavy Weapons.', '500eb'],
    ['Kendachi Mono-Three', 'Arma branca Muito Pesada de duas mãos; ignora armadura abaixo de SP 11.', '5.000eb'],
    ['Malorian Arms 3516', 'Pistola Muito Pesada de Excelente Qualidade; dano 5d6.', '10.000eb'],
    ['Microwave', 'Pistola Muito Pesada que pode desligar cyberware e eletrônicos carregados.', '500eb'],
    ['Militech Cowboy U-56', 'Lança-granadas de 2 ROF; exige BODY 11.', '5.000eb'],
    ['Rhinemetall EMG-86 Railgun', 'Rifle de assalto que ignora armadura abaixo de SP 11; Heavy Weapons e BODY 11.', '5.000eb'],
    ['Shrieker', 'Pistola Muito Pesada que provoca ferimento crítico no ouvido.', '500eb'],
    ['Stun Baton', 'Arma branca Média não letal.', '100eb'],
    ['Stun Gun', 'Pistola Pesada não letal.', '100eb'],
    ['Tsunami Arms Helix', 'Rifle de assalto que só funciona em autofogo, com multiplicador próprio; exige BODY 11.', '5.000eb']
  ];
  const armor = [
    ['Couro', '4', '—', '20eb'],
    ['Kevlar', '7', '—', '50eb'],
    ['Light Armorjack', '11', '—', '100eb'],
    ['Bodyweight Suit', '11', '—', '1.000eb'],
    ['Medium Armorjack', '12', '−2 REF, DEX, MOVE', '100eb'],
    ['Heavy Armorjack', '13', '−2 REF, DEX, MOVE', '500eb'],
    ['Flak', '15', '−4 REF, DEX, MOVE', '500eb'],
    ['Metalgear', '18', '−4 REF, DEX, MOVE', '5.000eb'],
    ['Ballistic Shield', '10 HP', 'Ocupa um braço', '100eb']
  ];

  const gearHTML = `<div class="section"><h3>Armas brancas RED</h3><p>O dano vem da classe da arma; o número de mãos pode variar pelo item. O teste usa a perícia de combate apropriada.</p>${table(['Classe', 'Exemplos', 'Dano', 'CDT (ataques por Ação)', 'Mãos', 'Ocultável', 'Custo de referência'], meleeWeapons)}</div>
    <div class="section"><h3>Armas de longo alcance RED</h3><p>DV de acerto depende da categoria e distância; alcance, cobertura e modos de tiro continuam importantes.</p><p class="note-status">Para fazer dela uma arma Power, Smart ou Tech dos anos 2070, some um Rebuild (1.000eb, 2 slots): veja Armas de 2077.</p>${table(['Arma', 'Perícia', 'Dano', 'Carregador', 'ROF', 'Mãos', 'Ocultável', 'Preço', 'Modo/nota'], rangedWeapons)}</div>
    <div class="section"><h3>Armas exóticas</h3><p>São especializadas; em geral não aceitam acessórios nem munição não básica, salvo quando a entrada disser o contrário.</p>${table(['Modelo', 'Diferença mecânica resumida', 'Preço de referência'], exoticWeapons)}</div>
    <div class="section"><h3>Armaduras RED</h3><p>Compre proteção separadamente para cabeça e corpo. SP não acumula: vale a fonte mais alta por localização. A penalidade de uma armadura mais pesada aplica-se a REF, DEX e MOVE.</p>${table(['Tipo', 'SP', 'Penalidade', 'Preço-base'], armor)}</div>
    <div class="section" data-toc="Munição"><h3>Munição<span class="ref">p. 344–347</span></h3><ul><li>Compre a munição do tipo da arma: bala (pistola média, pesada, muito pesada, balote ou rifle), cartucho de espingarda, flecha, granada ou míssil.</li><li><b>Granadas e mísseis</b> são comprados <b>um a um</b>; o resto, em pacotes de <b>10</b>. O preço abaixo vale para isso.</li><li>Granadas podem ser arremessadas ou disparadas de um lança-granadas.</li><li>Armas exóticas só aceitam munição básica, salvo se a descrição disser o contrário.</li></ul>${table(['Tipo', 'Preço', 'Para', 'Efeito'], [
      ['<b>Básica</b>', '10eb', 'Tudo, exceto granadas e mísseis', 'A munição padrão, sem nada especial.'],
      ['<b>Perfurante</b> (anti-blindagem)', '100eb', 'Tudo, exceto cartuchos de espingarda', 'Quando acerta a armadura, a ablação é de 2 em vez de 1.'],
      ['<b>Biotoxina</b>', '500eb', 'Flechas e granadas', 'Não causa dano: quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre 3d6 direto no HP. Não causa ablação.'],
      ['<b>EMP</b>', '500eb', 'Granadas', 'Não causa dano: quem é atingido faz Cybertech DV15 ou o mestre escolhe 2 cyberwares ou eletrônicos que param por 1 minuto. Um cybermembro parado fica pendurado, como um membro desmembrado.'],
      ['<b>Expansiva</b>', '100eb', 'Flechas, balas e balotes', 'Numa lesão crítica de objeto estranho, a vítima rola de novo na tabela até sair outra lesão e sofre as duas. A segunda não dá dano bônus.'],
      ['<b>Flashbang</b>', '100eb', 'Granadas', 'Não causa dano: quem é atingido faz Resistir a Tortura/Drogas DV15 ou sofre as lesões Olho danificado e Ouvido danificado por 1 minuto, sem dano bônus.'],
      ['<b>Incendiária</b>', '100eb', 'Flechas, balas, granadas e cartuchos', 'Dano que passa pela armadura põe fogo no alvo: 2 de dano direto no HP no fim de cada turno dele, até ele gastar uma Ação para se apagar. Não acumula.'],
      ['<b>Venenosa</b>', '100eb', 'Flechas e granadas', 'Não causa dano: quem é atingido faz Resistir a Tortura/Drogas DV13 ou sofre 2d6 direto no HP. Não causa ablação.'],
      ['<b>Borracha</b>', '10eb', 'Flechas, balas e balotes', 'Não causa lesão crítica nem ablação. Se o dano levaria um alvo com mais de 1 HP a menos de 0, ele fica com 1 HP.'],
      ['<b>Sonífera</b>', '500eb', 'Flechas e granadas', 'Não causa dano: quem é atingido faz Resistir a Tortura/Drogas DV13 ou cai inconsciente por 1 minuto, até sofrer dano ou alguém usar uma Ação para acordá-lo.'],
      ['<b>Inteligente</b>', '500eb', 'Flechas, balas e mísseis', 'Exige o cyberware <b>Luneta de Mira</b> (Targeting Scope); sem ele, a arma não dispara. Errou um tiro único por 4 ou menos? Role de novo contra o mesmo DV, somando <b>10 + 1d10</b> (só a LUCK pode entrar). O alvo pode se esquivar normalmente.'],
      ['<b>Fumaça</b>', '50eb', 'Granadas', 'Cobre de fumaça uma área de 10 × 10 m por 1 minuto. Agir dentro dela costuma ter −4.'],
      ['<b>Gás lacrimogêneo</b>', '50eb', 'Granadas', 'Não causa dano: quem tem olhos de carne faz Resistir a Tortura/Drogas DV13 ou sofre Olho danificado por 1 minuto, sem dano bônus.']
    ])}<p class="note-status">Não confunda: a munição Inteligente do RED usa a Luneta de Mira; a munição Smart melhorada do Mission Kit só funciona em arma Smart (com Smart Rebuild). Veja Armas de 2077.</p></div>
    <div class="section" data-toc="Acessórios de arma"><h3>Acessórios de arma<span class="ref">p. 342–344</span></h3><ul><li>Toda arma de longo alcance <b>não exótica</b> tem <b>3 slots</b> de acessório. O mesmo acessório duas vezes não faz nada.</li><li>Cada acessório é feito para certos tipos de arma e não se adapta fácil a outros.</li><li>Só um carregador por vez. Com baioneta, carregador maior ou arma sob o cano, a arma não se esconde debaixo da roupa.</li></ul>${table(['Acessório', 'Preço', 'Slots', 'Para', 'Efeito'], [
      ['<b>Baioneta</b>', '100eb', '1', 'Armas de Ombro', 'A arma também serve de arma branca leve.'],
      ['<b>Carregador estendido</b>', '100eb', '1', 'Tudo, exceto arcos e bestas', 'Mais munição (veja a tabela de carregadores).'],
      ['<b>Carregador tambor</b>', '500eb', '1', 'Tudo, exceto arcos e bestas', 'Ainda mais munição (veja a tabela de carregadores).'],
      ['<b>Lança-granadas sob o cano</b>', '500eb', '2', 'Armas de Ombro', 'Com as duas mãos, a arma também dispara como lança-granadas, com 1 granada.'],
      ['<b>Espingarda sob o cano</b>', '500eb', '2', 'Armas de Ombro', 'Com as duas mãos, a arma também dispara como espingarda, com 2 cartuchos.'],
      ['<b>Luneta infravermelha</b>', '500eb', '1', 'Todas', 'Zera as penalidades de tiro por escuridão, fumaça e neblina. Distingue carne quente de metal frio, nada além disso.'],
      ['<b>Luneta de precisão</b>', '100eb', '1', 'Todas', 'Vê detalhes a até 800 m. +1 em tiro único ou tiro mirado contra alvo a 51 m ou mais. Não acumula com cyberware óptico.'],
      ['<b>Link de arma inteligente</b> (Smartgun Link)', '500eb', '2', 'Todas', '+1 nos ataques à distância. Leva 1 hora para instalar ou tirar. Exige plugs de interface ou plug subdérmico, que exigem Neural Link. Reconectar com a arma na mão não gasta Ação.']
    ])}<h4>Tabela de carregadores</h4>${table(['Arma', 'Padrão', 'Estendido', 'Tambor'], [['Pistola média', '12', '18', '36'], ['Pistola pesada', '8', '14', '28'], ['Pistola muito pesada', '8', '14', '28'], ['SMG', '30', '40', '50'], ['SMG pesada', '40', '50', '60'], ['Espingarda', '4', '8', '16'], ['Rifle de assalto', '25', '35', '45'], ['Rifle de precisão', '4', '8', '12'], ['Lança-granadas', '2', '4', '6'], ['Lança-mísseis', '1', '2', '3']])}<h4>Qualidade da arma</h4>${table(['Qualidade padrão', 'Qualidade ruim', 'Qualidade excelente'], [['50eb', '20eb', '100eb'], ['100eb', '50eb', '500eb'], ['500eb', '100eb', '1.000eb']])}<p class="note-status">Ruim: emperra numa falha crítica (1 no dado) e precisa de uma Ação para desemperrar. Excelente: +1 no ataque. Armas exóticas são sempre de qualidade padrão.</p></div>
    <div class="section" data-toc="Equipamento médico"><h3>Equipamento médico<span class="ref">p. 149–150 e 351–355</span></h3>${table(['Item', 'Preço', 'Efeito'], [
      ['<b>Airhypo</b>', '50eb', 'Uma Ação aplica uma dose de droga num alvo que aceita; num alvo que não aceita, é um ataque corpo a corpo que aplica a dose em vez de causar dano. Recarregar não gasta Ação.'],
      ['<b>Medscanner</b>', '1.000eb', '+2 em Primeiros Socorros e Paramédico. Não acumula com outro.'],
      ['<b>Bolsa Medtech</b>', '100eb', 'Kit médico completo, de grampeador dérmico a pele em spray. O necessário para usar as suas perícias.'],
      ['<b>Máscara anti-fumaça</b>', '20eb', 'Imune a gases tóxicos, fumaça e tudo o que precise ser inalado.'],
      ['<b>Cryopump</b>', '5.000eb', 'Uma Ação põe um alvo (que aceita ou inconsciente) em estase na bolsa, gastando 1 carga. Por até uma semana, sem Death Saves enquanto a bolsa tiver 1 HP ou mais. A bolsa vale como cobertura de 15 HP; dá para operar através dela. Recarga: 50eb por carga. <b>Só Medtech opera.</b>'],
      ['<b>Cryotank</b>', '5.000eb', 'Com Tecnologia Médica DV13, mantém 1 pessoa em estase pelo tempo que quiser, curando no dobro do ritmo. Vale como cobertura de 30 HP. <b>Só Medtech opera.</b>'],
      ['<b>Frasco de veneno</b>', '100eb', 'Uma Ação passa numa arma branca leve. Por 30 minutos, quem for atingido faz Resistir a Tortura/Drogas DV13 ou sofre 2d6 direto no HP, em vez do dano da arma.'],
      ['<b>Frasco de biotoxina</b>', '500eb', 'Como o veneno, mas DV15 e 3d6 direto no HP.']
    ])}<h4>Farmacêuticos do Medtech</h4><p>O Medtech com a especialização Farmacêutica sintetiza estes com Tecnologia Médica DV13. Aplicar é uma Ação, e só um Medtech sabe aplicar.</p>${table(['Remédio', 'Efeito', 'Limite'], [
      ['<b>Antibiótico</b>', '+2 HP por dia, além da cura normal, durante uma semana.', 'Um efeito por vez.'],
      ['<b>Rapidetox</b>', 'Elimina na hora drogas, venenos e intoxicantes do corpo.', '—'],
      ['<b>Speedheal</b>', 'Cura na hora HP igual a BODY + WILL. Não funciona em quem está Mortalmente Ferido.', '1 por dia.'],
      ['<b>Stim</b>', 'Ignora as penalidades de Gravemente Ferido por 1 hora.', '1 por dia.'],
      ['<b>Surge</b>', 'Fica 24 horas sem precisar dormir.', '1 por semana.']
    ])}<h4>Criossistema do Medtech, por Rank</h4>${table(['Rank', 'Ganha'], [['1', 'Um Cryopump.'], ['2', 'Registro de técnico de Cryotank.'], ['3', 'Um Cryotank.'], ['4', 'Mais 2 Cryotanks; o Cryopump passa a 2 cargas e 2 pessoas.'], ['5', 'Mais 3 Cryotanks; o Cryopump passa a 3 cargas.']])}</div>
    <div class="section" data-toc="Lista de equipamento"><h3>Lista de equipamento<span class="ref">p. 351–355</span></h3><p>Os preços são os do RED, que valem nos anos 2070 (veja a Economia).</p>${table(['Item', 'Preço', 'O que faz'], [
      ['<b>Agent</b>', '100eb', 'Smartphone com IA adaptativa: agenda, chamadas, Data Pool, compras. +2 em Pesquisa em Biblioteca, e +2 em Guarda-roupa e Estilo se você vestir o que ele sugere.'],
      ['<b>Analisador químico</b>', '1.000eb', 'Uma Ação identifica a composição exata de quase qualquer substância.'],
      ['<b>Arma de gancho</b>', '100eb', 'Uma Ação dispara um gancho que prende em cobertura grossa a até 30 m. Aguenta 2× o seu peso e tem 10 HP. Anula a penalidade de movimento ao escalar.'],
      ['<b>Algemas</b>', '50eb', 'Quebram fácil se o seu BODY for maior que 10.'],
      ['<b>Amplificador de bolso</b>', '50eb', 'Som a até 100 m por 6 horas; dois instrumentos.'],
      ['<b>Barraca e camping</b>', '50eb', 'Barraca de uma pessoa, panela recarregável e um garfo-colher que não fere nem mosca.'],
      ['<b>Binóculos</b>', '50eb', 'Ampliam 2 ou 3 vezes.'],
      ['<b>Bolsa Tech</b>', '500eb', 'Ferramentas para consertar eletrônicos e máquinas.'],
      ['<b>Cama inflável e saco de dormir</b>', '20eb', 'Infla sozinha e dobra num pacote de 15 × 15 cm.'],
      ['<b>Câmera de vídeo</b>', '100eb', 'Grava até 12 horas de vídeo e áudio num chip de memória.'],
      ['<b>Carryall</b>', '20eb', 'Bolsas de náilon resistente, de bolsa carteiro a mochilão.'],
      ['<b>Celular descartável</b>', '50eb', 'Para quem não quer ser rastreado.'],
      ['<b>Chips de memória</b>', '10eb', 'Guardam informação de todo tipo.'],
      ['<b>Computador</b>', '50eb', 'Notebook ou desktop, para textos e Data Pool.'],
      ['<b>Corda (60 m)</b>', '20eb', 'Náilon; aguenta 360 kg.'],
      ['<b>Cyberdeck</b>', '100 / 500 / 1.000eb', 'Ruim, padrão ou excelente: 5, 7 ou 9 slots de programas e hardware. Exige plugs de interface e Neural Link.'],
      ['<b>Detector de escutas</b>', '500eb', 'Apita a até 2 m de uma escuta ou grampo.'],
      ['<b>Detector de radar</b>', '500eb', 'Apita se houver um radar ativo a até 100 m.'],
      ['<b>Embaralhador</b> (Scrambler)', '500eb', 'Embaralha as suas comunicações; vem com o desembaralhador.'],
      ['<b>Fita adesiva</b>', '20eb', 'Várias cores; a que brilha no escuro marca túneis e esconderijos.'],
      ['<b>Food stick</b>', '10eb', 'Barra de comida seca, de sabores horríveis. Uma refeição.'],
      ['<b>Guitarra elétrica ou outro instrumento</b>', '500eb', 'Precisa de amplificador para ser ouvido.'],
      ['<b>Gravador de áudio</b>', '100eb', 'Grava até 24 horas de áudio num chip de memória.'],
      ['<b>Kit de arrombamento</b>', '20eb', 'Ferramentas para abrir fechaduras mecânicas.'],
      ['<b>Kit de higiene pessoal</b>', '20eb', 'Escova com pasta, lenços, pente, creme depilatório.'],
      ['<b>Lanterna</b>', '20eb', 'Facho de 100 m; 10 horas por carga.'],
      ['<b>Linear Frame Σ (Sigma)</b>', '1.000eb', 'Exoesqueleto: BODY vira 12 enquanto plugado (sem mudar HP nem Death Save). Exige 1 plug de interface.'],
      ['<b>Linear Frame β (Beta)</b>', '5.000eb', 'Exoesqueleto: BODY vira 14 enquanto plugado (sem mudar HP nem Death Save). Exige 2 plugs de interface.'],
      ['<b>MRE</b>', '10eb', 'Refeição que se aquece sozinha em 2 minutos.'],
      ['<b>Óculos inteligentes</b>', '500eb', '2 slots de opção de cyberolho, que contam como um par.'],
      ['<b>Óculos de realidade virtual</b>', '100eb', 'Projetam o ciberespaço sobre a visão. Recomendados para netrunners.'],
      ['<b>Pastilha brilhante</b> (glow stick)', '10eb', 'Ilumina 4 m por 10 horas. Uso único.'],
      ['<b>Protetor auricular</b>', '1.000eb', 'Imune a surdez e a barulhos perigosos, como o de uma flashbang.'],
      ['<b>Rádio comunicador</b>', '100eb', 'Fone de rádio com 1,6 km de alcance.'],
      ['<b>Rádio scanner / tocador de música</b>', '50eb', 'Música pelo Data Pool e escuta de todas as faixas de rádio a até 1,6 km.'],
      ['<b>Rastreador</b>', '500eb', 'Segue um transmissor a até 1,6 km. Transmissor extra: 50eb.'],
      ['<b>Sinalizador de estrada</b>', '10eb', 'Ilumina 100 m por 1 hora. Uso único.'],
      ['<b>Sintetizador de bateria</b>', '500eb', 'Pads que simulam qualquer bateria. Precisa de amplificador.'],
      ['<b>Techferramenta</b>', '100eb', 'Ferramenta básica de consertos.'],
      ['<b>Techscanner</b>', '1.000eb', '+2 em Tecnologia Básica, Cybertech, Tecnologia de Veículos, Eletrônica/Segurança e Armeiro. Não acumula com outro.'],
      ['<b>Tinta luminosa</b>', '20eb', 'Spray que brilha no escuro, para marcar lugares ou pichar.'],
      ['<b>Visualizador de braindance</b>', '1.000eb', 'Para assistir braindances: a experiência gravada de outra pessoa, com todos os sentidos e emoções.']
    ].sort((a, b) => a[0].replace(/<[^>]+>/g, '').localeCompare(b[0].replace(/<[^>]+>/g, ''), 'pt')))}</div>
    <div class="callout"><b>Importante:</b> a tabela reúne as armas genéricas, classes de armadura e exóticas listadas no resumo de equipamento RED. DV por distância, críticos, autofogo e regras de veículo ficam nas páginas de combate e dano.</div>`;

  window.systemCatalog = {
    // As dez Roles do RED com os ajustes dos anos 2070 do Mission Kit (Kit p. 26), numa página só.
    roles: {
      eyebrow: 'Regras / Roles', title: 'Roles',
      lede: 'Uma Role é a profissão e a habilidade especial que define como o personagem muda o jogo. Valem as dez do RED, com os ajustes dos anos 2070 do Mission Kit: o que cada uma consegue comprar e os quickhacks do Netrunner.',
      html: `<div class="section" data-toc="As dez Roles"><h3>As dez Roles</h3><p>A Role é mais que uma classe de combate: cada habilidade abre uma forma distinta de conseguir influência, resolver problemas ou obter recursos.</p>${table(['Role', 'Quem é', 'O que a habilidade de Role faz'], roleRows)}</div><div class="section" data-toc="Nos anos 2070"><h3>Nos anos 2070<span class="ref">Kit p. 26</span></h3>${table(['Role', 'Habilidade', 'O que muda'], [
          ['<b>Rockerboy</b>', 'Impacto Carismático', 'Consegue itens <b>Caros</b> a partir do Rank 4.'],
          ['<b>Solo</b>', 'Consciência de Combate', 'Sem mudança.'],
          ['<b>Netrunner</b>', 'Interface', 'Faz <b>quickhacks</b> no Neuroport das pessoas, pelo Rank. O Scanner vira Ação NET. No Rank 3, passa direto pelo firewall de fábrica do Neuroport.'],
          ['<b>Tech</b>', 'Maker', 'Sem mudança.'],
          ['<b>Medtech</b>', 'Medicine', 'Sem mudança.'],
          ['<b>Media</b>', 'Credibility', 'Consegue itens <b>Caros</b> a partir do Rank 4.'],
          ['<b>Exec</b>', 'Teamwork', 'Consegue itens <b>Caros</b> a partir do Rank 4.'],
          ['<b>Lawman</b>', 'Backup', 'Consegue os itens <b>Caros do trabalho</b> (armas, armadura e o equipamento que o mestre aceitar) a partir do Rank 4.'],
          ['<b>Fixer</b>', 'Operator', 'Consegue itens <b>Caros</b> desde o Rank 1, <b>Muito Caros</b> no Rank 4, <b>Luxuosos</b> no 7 e <b>Super Luxuosos</b> no 9.'],
          ['<b>Nomad</b>', 'Moto', 'Consegue <b>qualquer veículo</b> e upgrade de veículo desde o Rank 1.']
        ])}<ul><li>Sem um Fixer ou um Night Market, só se compra até <b>Premium</b> (100eb). Estas Roles conseguem, <b>peça por peça</b>, itens das categorias acima, mesmo quando eles não estão à venda.</li><li>Quem não tem esse alcance pode comprar <b>direto do fabricante</b>, pelo dobro do preço.</li><li>As habilidades de Role e os Ranks são os do RED: o item de Role do Foundry é o do sistema.</li></ul><p><button class="action" data-page="economy" type="button">Economia e categorias de preço</button></p></div><div class="section" data-toc="Netrunner"><h3>Netrunner<span class="ref">Kit p. 26</span></h3><ul><li>Faz quickhacks como parte da Interface, sem comprar nada: os <b>Simples (DV6)</b> no Rank 1, os <b>Padrão (DV8)</b> no Rank 2, os <b>Difíceis (DV10)</b> no Rank 3 e os <b>Avançados (DV12)</b> no Rank 4.</li><li>O <b>Scanner</b> deixa de ser Ação Carnal e vira Ação NET.</li><li>No <b>Rank 3</b>, passa direto pelo firewall de fábrica do Neuroport, sem teste (no Rank 1 e no 2, é um teste de Interface contra DV6).</li></ul><p><button class="action" data-page="netrunning" type="button">Netrunning</button> <button class="action" data-page="quickhacks" type="button">Os quickhacks</button></p></div><div class="section" data-toc="Decisão rápida"><h3>Decisão rápida</h3>${table(['Quero…', 'Role que se destaca'], [['liderar fãs, multidões ou uma causa', 'Rockerboy'], ['ter vantagem tática em combate', 'Solo'], ['invadir uma arquitetura NET ou o Neuroport de alguém', 'Netrunner'], ['consertar, aprimorar ou inventar', 'Tech'], ['tratar feridos e cyberware', 'Medtech'], ['investigar e publicar uma história', 'Media'], ['usar equipe e benefícios corporativos', 'Exec'], ['chamar apoio policial', 'Lawman'], ['achar e negociar bens/contatos', 'Fixer'], ['dirigir, pilotar e acessar veículos', 'Nomad']])}</div><div class="callout">As habilidades têm limites, ações e tabelas por Rank. Os resumos acima destacam o uso principal; não substituem as condições de cada ação.</div><p><button class="action" data-page="advancement" type="button">Avanço e Pontos de Melhoria</button></p>`
    },
    cyberware: {
      eyebrow: 'Catálogo / cyberware por família', title: 'Cyberware do RED',
      lede: 'Lista organizada pelos oito grupos do livro-base, que continua valendo nos anos 2070. Pesquise o nome para encontrar a função, o bônus e os requisitos sem sair da wiki.',
      html: cyberwareHTML
    },
    gear: {
      eyebrow: 'Catálogo / equipamento', title: 'Armas, armaduras e equipamento',
      lede: 'Consulta de mesa do livro-base: classes de arma, armas exóticas, armaduras, munição, acessórios, equipamento médico e a lista de equipamento com preços.',
      html: gearHTML
    }
  };
})();