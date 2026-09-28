(() => {
  const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const expandable = (title, rows) => `<details class="section"><summary>${title} / ${rows.length} entradas</summary>${table(['Implante', 'O que oferece', 'Compatibilidade / nota'], rows)}</details>`;

  const roleRows = [
    ['Rockerboy', 'Artista, agitador ou figura pública que transforma presença e mensagem em influência.', '<b>Impacto Carismático:</b> converte pessoas em fãs e pede favores a fãs. Rolagem: Rank + 1d10; DV 8 para uma pessoa, 10 para até seis, 12 para um grupo maior. O Rank limita o favor: começa com pequenos favores e pode chegar a redes leais dispostas a riscos extremos.'],
    ['Solo', 'Especialista de combate: mercenário, guarda-costas, assassino ou veterano de guerra.', '<b>Consciência de Combate:</b> aloca pontos entre seis vantagens e pode redistribuí-los antes do combate ou com uma ação: iniciativa (+1 por ponto); ataque de precisão (+1 por cada 3 pontos); ponto fraco (+1 dano antes da armadura no primeiro acerto da rodada por ponto); detecção (+1 Percepção por ponto); deflexão (2 pontos reduzem em 1 o primeiro dano sofrido na rodada, até 5); recuperação de falhas (4 pontos ignoram falhas críticas no ataque).'],
    ['Netrunner', 'Hacker que invade arquiteturas locais e enfrenta ICE enquanto a equipe protege o corpo no espaço físico.', '<b>Interface:</b> concede ações de NET e oito habilidades: Backdoor (romper senhas), Cloak (ocultar ações), Control (operar dispositivos), Eye-Dee (identificar dados), Pathfinder (mapear a arquitetura), Scanner (localizar sistemas), Slide (escapar de ICE) e Virus (criar vírus). Ações por turno: 2 nos Ranks 1–3, 3 nos Ranks 4–6, 4 nos Ranks 7–9 e 5 no Rank 10.'],
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
      ['Subdermal Armor', 'Proteção corporal SP 7; não acumula com armadura vestida; recupera 1 SP por descanso.', 'Cobertura de corpo e cabeça.'],
      ['Subdermal Armor (reforçada)', 'Proteção corporal SP 11; não acumula com armadura vestida; recupera 1 SP por descanso.', 'Versão mais pesada.'],
      ['Subdermal Pocket', 'Compartimento oculto sob a pele de aproximadamente 5 x 10 cm.', 'Armazenamento.']
    ]],
    ['Cybermembros: braço e mão', [
      ['Cyberarm', 'Membro-base com quatro slots; inclui mão padrão sem HL ou slot adicional.', 'Implante-base.'],
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

  const cyberwareHTML = `<div class="section"><h3>Regras comuns</h3><p>O RED organiza o cyberware em oito famílias. Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e externo usam slots de categoria. Benefícios repetidos não acumulam salvo indicação específica. A instalação está incluída no custo do implante; registre humanidade, slots e requisitos na ficha.</p><p>O valor de Humanity Loss, o custo e o local de instalação variam por item. Uma lesão crítica na região impede instalação até ser tratada.</p></div>${cyberware.map(([category, items]) => expandable(category, items)).join('')}<div class="section"><h3>Morana e implantes conectados</h3><p>Na campanha, Morana pode interferir em implantes conectados, sistemas médicos, armas inteligentes e drones. Mostre sinais, ofereça uma reação e preserve a agência do jogador; falhas temporárias, escolhas difíceis e consequências claras são preferíveis a controle total do personagem.</p><p>Teste de resistência sugerido: <span class="formula">WILL + Concentração + 1d10 &gt; DV 13 / 15 / 17</span> (Programa / Enxame / Entidade).</p></div><div class="callout"><b>Base de regras:</b> os itens acima são do catálogo RED em português. Sandevistan e Kerenzikov aqui correspondem às entradas Speedware do RED; Gorilla Arms, Mantis Blades, Monowire e a conversão de 2077 estão separados na página Suplemento 2077.</div><button class="action" data-page="supplement2077" type="button">Abrir suplemento 2077</button>`;

  const meleeWeapons = [
    ['Branca Leve', 'Faca, tomahawk', '1d6', '2', 'Varia por arma', 'Sim', '50eb'],
    ['Branca Média', 'Taco, pé de cabra, facão', '2d6', '2', 'Varia por arma', 'Não', '50eb'],
    ['Branca Pesada', 'Cano, espada, taco com espinhos', '3d6', '2', 'Varia por arma', 'Não', '100eb'],
    ['Branca Muito Pesada', 'Motosserra, marreta, naginata', '4d6', '1', 'Varia', 'Não', '500eb']
  ];
  const rangedWeapons = [
    ['Pistola Média', 'Handgun', '2d6', '12', '2', '1', 'Sim', '50eb', '100eb', '—'],
    ['Pistola Pesada', 'Handgun', '3d6', '8', '2', '1', 'Sim', '100eb', '100eb', '—'],
    ['Pistola Muito Pesada', 'Handgun', '4d6', '8', '1', '1', 'Não', '100eb', '50–100eb', '—'],
    ['SMG', 'Handgun', '2d6', '30', '1', '1', 'Sim', '100eb', '100eb', 'Autofogo (3), supressão'],
    ['SMG Pesada', 'Handgun', '3d6', '40', '1', '1', 'Não', '100eb', '50eb (ruim) · 1.000eb (Smart)', 'Autofogo (3), supressão'],
    ['Espingarda (balote)', 'Shoulder Arms', '5d6', '4', '1', '2', 'Não', '500eb', '500eb', 'Cartuchos'],
    ['Rifle de Assalto', 'Shoulder Arms', '5d6', '25', '1', '2', 'Não', '500eb', '500eb', 'Autofogo (4), supressão'],
    ['Rifle Sniper', 'Shoulder Arms', '5d6', '4', '1', '2', 'Não', '500eb', '1.000eb (exóticos)', '—'],
    ['Arco / besta', 'Archery', '4d6', '—', '1', '2', 'Não', '100eb', 'igual ao RED', 'Flechas'],
    ['Lança-granadas', 'Heavy Weapons', '6d6', '2', '1', '2', 'Não', '500eb', 'igual ao RED', 'Explosivo'],
    ['Lança-mísseis', 'Heavy Weapons', '8d6', '1', '1', '2', 'Não', '500eb', 'igual ao RED', 'Explosivo']
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
    <div class="section"><h3>Armas de longo alcance RED</h3><p>DV de acerto depende da categoria e distância; alcance, cobertura e modos de tiro continuam importantes.</p><p class="note-status">"Preço 2077": faixa dos modelos de qualidade padrão no suplemento. Modelos e exceções na página Economia de 2077.</p>${table(['Arma', 'Perícia', 'Dano', 'Carregador', 'ROF', 'Mãos', 'Ocultável', 'Preço RED', 'Preço 2077', 'Modo/nota'], rangedWeapons)}</div>
    <div class="section"><h3>Armas exóticas</h3><p>São especializadas; em geral não aceitam acessórios nem munição não básica, salvo quando a entrada disser o contrário.</p>${table(['Modelo', 'Diferença mecânica resumida', 'Preço de referência'], exoticWeapons)}</div>
    <div class="section"><h3>Armaduras RED</h3><p>Compre proteção separadamente para cabeça e corpo. SP não acumula: vale a fonte mais alta por localização. A penalidade de uma armadura mais pesada aplica-se a REF, DEX e MOVE.</p>${table(['Tipo', 'SP', 'Penalidade', 'Preço-base'], armor)}</div>
    <div class="section"><h3>Munição e acessórios</h3><ul><li><b>Munição básica:</b> 10 unidades custam 10eb; escolha projétil compatível com a classe da arma. Cartuchos, flechas, granadas e mísseis seguem tipos próprios.</li><li><b>Munição especial:</b> incendiária, anti-blindagem, tóxica e outros tipos alteram o efeito e têm disponibilidade/custo próprios.</li><li><b>Acessórios:</b> armas de longo alcance não exóticas têm slots; acessórios consomem esses espaços e são específicos de certos tipos de arma.</li><li><b>Autofogo:</b> use o DV de autofogo e o multiplicador da arma; não trate como vários disparos comuns.</li><li><b>Tiro mirado:</b> pode escolher localização, mas usa penalidade específica.</li></ul></div>
    <div class="section"><h3>Outros equipamentos</h3>${table(['Grupo', 'Uso / o que registrar'], [
      ['Agent e comunicações', 'Mensagens, dados pessoais e contato; registre conectividade e vínculo com cyberware.'],
      ['Cyberdeck / programas', 'Plataforma para netrunning, slots disponíveis e programas carregados.'],
      ['Ferramentas Tech', 'Ferramenta compatível com o reparo, criação ou perícia técnica pretendida.'],
      ['Medtech / primeiros socorros', 'Kit, tempo e perícia necessários para estabilização e tratamento.'],
      ['Consumíveis', 'Munição, medicamentos, cargas e quantidade disponível.'],
      ['Veículos', 'Categoria, ocupantes, condição, upgrades e acesso/família que o fornece.'],
      ['Moda e moradia', 'Fashionware, roupas, aluguel e estilo de vida têm entradas próprias no mercado/economia.']
    ])}</div>
    <div class="callout"><b>Importante:</b> a tabela reúne as armas genéricas, classes de armadura e exóticas listadas no resumo de equipamento RED. DV por distância, críticos, autofogo, munição especial e regras de veículo usam as páginas específicas de combate/equipamento.</div>`;

  window.systemCatalog = {
    roles: {
      eyebrow: 'Cyberpunk RED / guia de Roles', title: 'Roles: conceito e habilidade',
      lede: 'Uma Role é a profissão e a habilidade especial que define como o personagem altera o jogo. Estas descrições são da versão RED; as alterações do suplemento 2077 ficam na página separada.',
      html: `<div class="section"><h3>As dez Roles do RED</h3><p>A Role é mais que uma classe de combate: cada habilidade abre uma forma distinta de conseguir influência, resolver problemas ou obter recursos.</p>${table(['Role', 'Quem é', 'O que a habilidade de Role faz'], roleRows)}</div><div class="section"><h3>Decisão rápida</h3>${table(['Quero…', 'Role que se destaca'], [['liderar fãs, multidões ou uma causa', 'Rockerboy'], ['ter vantagem tática em combate', 'Solo'], ['invadir uma arquitetura NET', 'Netrunner'], ['consertar, aprimorar ou inventar', 'Tech'], ['tratar feridos e cyberware', 'Medtech'], ['investigar e publicar uma história', 'Media'], ['usar equipe e benefícios corporativos', 'Exec'], ['chamar apoio policial', 'Lawman'], ['achar e negociar bens/contatos', 'Fixer'], ['dirigir, pilotar e acessar veículos', 'Nomad']])}</div><div class="callout">As habilidades têm limites, ações e tabelas por Rank. Os resumos acima destacam o uso principal; não substituem as condições de cada ação.</div>`
    },
    cyberware: {
      eyebrow: 'Cyberpunk RED / catálogo por família', title: 'Cyberware: catálogo RED',
      lede: 'Lista organizada pelos oito grupos do livro-base. Pesquise o nome para encontrar a função, o bônus e os requisitos sem sair da wiki.',
      html: cyberwareHTML
    },
    gear: {
      eyebrow: 'Cyberpunk RED / catálogo de equipamento', title: 'Armas, armaduras e equipamento',
      lede: 'Consulta de mesa das classes de arma, armas exóticas, proteção e grupos de equipamento do livro-base.',
      html: gearHTML
    }
  };
})();