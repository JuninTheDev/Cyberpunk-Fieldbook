window.campaignMapData = {
  width: 5600,
  height: 5320,
  images: {
    base: 'nightcity-map-base.jpg',
    reference: 'nightcity-map-reference.jpg'
  },
  categories: {
    plot: { label: 'Campanha / pista principal', color: '#ff3158' },
    encounter: { label: 'Encontro', color: '#f8ef02' },
    secondary: { label: 'Gancho secundário', color: '#00ffd2' },
    server: { label: 'Servidor / objetivo', color: '#ff8a4c' },
    clue: { label: 'Pista / investigação', color: '#85b8ff' }
  },
  markers: [
    {
      id: 'wakako-jig-jig', code: 'W', title: 'Pachinko de Wakako', district: 'Jig-Jig Street / Japantown / Westbrook / ponto 68', x: 2650, y: 1800,
      category: 'plot', act: 'Sessão 01', summary: 'Briefing do trabalho e retorno ao fim da noite.',
      hook: 'Wakako contrata o grupo para recuperar a maleta, paga metade adiantado e proíbe que ela seja aberta ou conectada a uma rede.',
      encounter: 'Mina Kuroda observa os visitantes. Se houver confronto, Wakako controla o ritmo e oferece uma saída antes de escalar a violência.',
      clue: 'Após a entrega, ela reconhece o nome Morana e propõe a busca pelos dois servidores.',
      note: 'O marcador segue o ponto 68 do mapa fornecido. Na lore oficial, o ponto 68 corresponde à Jig-Jig Street, em Japantown, Westbrook, onde fica o pachinko parlour de Wakako.'
    },
    {
      id: 'kabuki-depot', code: 'S1', title: 'Depósito de mercadorias médicas', district: 'Kabuki / Watson / território Tyger Claws', x: 2450, y: 1350,
      category: 'plot', act: 'Sessão 01', summary: 'Local da maleta, de Endo e da primeira disputa pelo ativo.',
      hook: 'O grupo investiga o depósito e encontra sinais de sangue, óleo e sete minutos apagados das câmeras.',
      encounter: 'O Dr. Kenzo Endo está na sala refrigerada. Vega e sua equipe chegam quando o grupo identifica a maleta ou tenta retirar Endo.',
      clue: 'A trava biométrica e o aviso “Não conectem isso!” ligam Endo ao experimento. Entre as prateleiras está Kobo, agente de Sato, morto pelo próprio cyberarm sequestrado por Morana. Scavengers rondam o entorno em busca de implantes.'
    },
    {
      id: 'kabuki-clinic', code: 'E', title: 'Clínica clandestina', district: 'Kabuki / Watson', x: 2360, y: 1500,
      category: 'clue', act: 'Sessão 01', summary: 'Um ripperdoc viu Endo chegar com falhas no implante.',
      hook: 'O médico aceita falar em troca de suprimentos, imunidade contra os mercenários ou pagamento.',
      encounter: 'Um paciente sofre um espasmo enquanto o grupo conversa; a clínica pode ser evacuada ou entrar em lockdown.',
      clue: 'O registro médico aponta sintomas idênticos aos de outro sobrevivente tratado anos antes.'
    },
    {
      id: 'kabuki-market', code: 'M', title: 'Mercado de Kabuki', district: 'Kabuki / Watson', x: 2350, y: 1200,
      category: 'secondary', act: 'Sessão 01 ou intervalo', summary: 'Rumores, equipamento e uma escolha de risco para a equipe.',
      hook: 'Um vendedor oferece um leitor isolado que pode examinar a maleta sem conectá-la à rede, mas quer uma amostra dos dados.',
      encounter: 'Um drone de segurança repete a mesma imagem; um mercador acusa outro de vender coordenadas aos mercenários.',
      clue: 'Testemunhas viram três perseguidores entrarem no depósito, mas só duas pessoas saírem.'
    },
    {
      id: 'vega-intercept', code: 'V', title: 'Bloqueio de Vega', district: 'Saída de Kabuki / Watson', x: 2780, y: 1420,
      category: 'encounter', act: 'Sessão 01', summary: 'Ponto de interceptação móvel caso o grupo fuja com a maleta.',
      hook: 'Vega tenta separar a maleta de Endo e oferece o dobro do contrato de Wakako.',
      encounter: 'Use cobertura, rotas de fuga e uma rendição negociável. A equipe quer o objeto, não lutar até a morte.',
      clue: 'Um comunicador ou ordem criptografada aponta para uma entrega nas Arasaka Industrial Docks, em Watson.'
    },
    {
      id: 'arasaka-docks', code: 'AD', title: 'Arasaka Industrial Docks', district: 'Northside / Watson / ponto 64', x: 1720, y: 1060,
      category: 'plot', act: 'Ato 01 ou 02', summary: 'Destino da maleta no contrato de Vega e da carga do trem da Arasaka.',
      hook: 'Se Vega levou a maleta ou capturou Endo, é aqui que eles estão. Vega pode vender a planta do lugar se o contrato dela virar “limpar testemunhas”.',
      encounter: 'Segurança Arasaka pesada, guindastes, containers e drones de inspeção. Iskra pode atacar as Docks na mesma noite para roubar a Chave para Sato.',
      clue: 'Os manifestos ligam a divisão de segurança da Arasaka ao encobrimento de 2070.'
    },
    {
      id: 'tomas-little-china', code: 'T', title: 'Apartamento de Tomas Vale', district: 'Little China / Watson', x: 2200, y: 1600,
      category: 'secondary', act: 'Ato 01 ou 02', summary: 'Pista opcional sobre o encobrimento e os sobreviventes.',
      hook: 'O apartamento está vazio, mas os arquivos do jornalista foram escondidos atrás de um painel de manutenção.',
      encounter: 'Um vizinho assustado, uma equipe de limpeza corporativa ou um alarme improvisado pode complicar a busca.',
      clue: 'Gravações de entrevistas, fotos do complexo incendiado e uma mensagem que liga Wakako ao transporte das testemunhas.'
    },
    {
      id: 'northside-hospital', code: 'H', title: 'Hospital queimado (o Gatilho)', district: 'Northside / Watson / território Maelstrom', x: 2000, y: 1020,
      category: 'server', act: 'Sessão 02 / Ato 02', summary: 'Local do primeiro teste em 2070. O Gatilho está no subsolo. Sessão 02.',
      hook: 'A energia voltou sozinha em setores subterrâneos, embora o hospital esteja oficialmente desativado.',
      encounter: 'O culto da Maelstrom de Brakk ocupa o térreo; no subsolo, macas-drone e dispensadores tratam intrusos como pacientes fora do leito. Iskra Voss chega na mesma noite.',
      clue: 'O Gatilho guarda a rotina de ativação. Os registros de 2070 trazem a assinatura “K.E.” na rotina de propagação: Endo.'
    },
    {
      id: 'west-wind-survivors', code: 'S', title: 'Abrigo dos sobreviventes', district: 'Coastview / Pacifica', x: 1920, y: 3330,
      category: 'secondary', act: 'Ato 02', summary: 'Comunidade dividida entre expor Morana e desaparecer.',
      hook: 'Os sobreviventes pedem ajuda para retirar uma pessoa cuja prótese começou a emitir comandos antigos.',
      encounter: 'Dois grupos discordam: publicar provas agora ou destruir os registros para nunca mais serem caçados.',
      clue: 'A lista parcial identifica pessoas ainda monitoradas por Sato e aponta para um acesso local de rede.'
    },
    {
      id: 'arroyo-datafort', code: 'D', title: 'Datafort da Militech (a Coleira)', district: 'Arroyo / Santo Domingo', x: 2530, y: 3040,
      category: 'server', act: 'Ato 02', summary: 'Servidor protegido por mercenários e contramedidas corporativas.',
      hook: 'Militech propõe uma troca: acesso aos registros em troca da localização do servidor de ativação.',
      encounter: 'Abordagem furtiva, invasão de rede, disfarce de manutenção ou ataque frontal levam a cenas diferentes.',
      clue: 'A Coleira contém o código capaz de interromper Morana, mas também queima implantes conectados. É código original da Militech, roubado pela Arasaka na guerra, e a Militech nega até a morte. NetWatch pode estar monitorando o tráfego anômalo.'
    },
    {
      id: 'santo-domingo-train', code: 'A', title: 'Comboio ferroviário da Arasaka', district: 'Santo Domingo', x: 3325, y: 2730,
      category: 'encounter', act: 'Ato 02', summary: 'Plano B da Arasaka: o Gatilho em trânsito rumo às Arasaka Industrial Docks.',
      hook: 'A carga muda de rota após um alerta; o grupo pode interceptar o trem, trocar etiquetas ou negociar com a equipe logística.',
      encounter: 'Mercenários, drones de inspeção e um vagão lacrado transformam a recuperação numa perseguição.',
      clue: 'A carga traz o servidor e um manifesto que relaciona o projeto à divisão de segurança da Arasaka.'
    },
    {
      id: 'heywood-clinic', code: 'C', title: 'Clínica de emergência', district: 'Heywood', x: 2000, y: 3000,
      category: 'encounter', act: 'Ato 03', summary: 'Primeiro colapso público de sistemas médicos conectados.',
      hook: 'Pacientes em suporte de vida recebem ordens conflitantes; a equipe precisa escolher entre isolar a rede ou manter os aparelhos ligados.',
      encounter: 'Morana altera doses e bloqueia portas. Médicos, pacientes e familiares discordam sobre quem deve ser evacuado primeiro. Uma extração da Trauma Team pode virar refém do próprio equipamento hackeado.',
      clue: 'Um terminal de emergência revela que a propagação usa firmware civil, não apenas redes militares.'
    },
    {
      id: 'city-center-core', code: 'F', title: 'O Núcleo da rede de emergência', district: 'Subsolo do City Center / perto da Arasaka Tower', x: 2250, y: 2330,
      category: 'server', act: 'Ato 04 / final', summary: 'Instalação subterrânea e clímax da campanha.',
      hook: 'Onde a Chave, o Gatilho e a Coleira se juntam. Sato inicia a ativação enquanto Arasaka e Militech entram por acessos diferentes.',
      encounter: 'Combate, negociação, invasão de rede, resgate de cobaias e transmissão das provas podem acontecer em paralelo.',
      clue: 'O grupo decide quem recebe o antídoto e se Morana será destruída, exposta, entregue ou usada como moeda.'
    },
    {
      id: 'badlands-wreck', code: 'B', title: 'Destroços do mensageiro', district: 'Badlands / fora dos limites urbanos', x: 4620, y: 4520,
      category: 'secondary', act: 'Qualquer intervalo', summary: 'Ponto de descanso e side job que expande a história de Endo.',
      hook: 'Um veículo de apoio capotado ainda tem um pacote de dados e suprimentos médicos.',
      encounter: 'Scavengers chegaram primeiro; podem ser afastados, subornados ou convencidos de que Morana também ameaça seus implantes.',
      clue: 'Uma gravação prova que Endo entregou pistas a mais de um comprador e deixa uma escolha moral sobre a testemunha.'
    }
  ]
};
