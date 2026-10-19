# Roadmap do sistema Cyberpunk RED — Fieldbook (Foundry 14)

Ordem de trabalho: P0 → P4. Não começa uma prioridade enquanto houver problema crítico conhecido numa acima. Cada
tarefa só fecha com os portões de [QUALITY_GATES.md](QUALITY_GATES.md) passando e o [MIGRATION_STATUS.md](MIGRATION_STATUS.md)
atualizado. Os achados vêm da auditoria de 2026-10-11 e da comparação com o CORE de 2026-10-12 (o que o Foundry 12 da
mesa faz e o sistema não; método e evidências no MIGRATION_STATUS).

## Paridade com o CORE 0.92.4: o plano daqui em diante (2026-10-12)

O pedido do usuário é deixar o sistema "completo" como o Cyberpunk RED - CORE do Foundry 12. Ficam de fora os itens
de compêndio; entram só as partes do sistema.
- **Fontes:** o código do CORE 0.92.4 que a mesa usa (`cyberpunk-red-core/modules` no master) e a comparação do ciclo 22.
- **As listas P0 a P4** mais abaixo ficam como histórico. Os itens abertos delas apontam para os deste plano (→ Cn).
- **Fora deste plano:**
  - o conteúdo: Black Chrome, DLCs, NPCs, arquiteturas e macros do CORE;
  - (voltou ao plano) as armas de 2077 pelo Mission Kit: adiadas pelo usuário em 2026-10-12, entram no plano desde
    2026-10-17 (decisão do usuário, com a "regra só na mesa" da wiki): o C29, parte das armas de 2077.

**As sessões no mesmo plano** (três desde 2026-10-17: KouArt e Codex neste PC, Junin em outro; as instruções para os
agentes de IA ficam no `AGENTS.md` da raiz):
- **Estados:** `[ ]` aberto; `[~] em andamento (sessão, data)`; `[x] feito (ciclo N)`.
- **Antes de começar um item:**
  - rode `git pull`, marque `[~]` com o nome da sessão, commite e envie;
  - não pegue um `[~]` de outra sessão sem combinar com o usuário.
- **A divisão:** por item, cada sessão com o ciclo inteiro do seu. A NET (C8 e C9) é da sessão KouArt; a sessão Codex
  pega itens fora dela (decisão do usuário, 2026-10-17).
- **Uma pasta por sessão** (a worktree ou o clone de cada uma) e um teste com navegador por vez no PC: a trava do
  `tests/rodar.js` (ciclo 86).
- **Ciclos:** seguem a numeração do MIGRATION_STATUS (o próximo é o 131). É um ciclo por item, ou por parte dele, com os
  portões e o registro, e push no fim de cada ciclo.
- **Conflito no ROADMAP ou no MIGRATION_STATUS:** junte as duas versões; nada se apaga.
- **O mesmo número de ciclo nas duas sessões:** antes do commit, `git fetch`. Se a outra sessão já publicou um ciclo com o
  mesmo número, ela fica com ele, e o seu passa para o seguinte ao integrar (o Facedown virou o ciclo 39 assim, depois do
  ciclo 38 da sessão Junin).

### Fase 1: o mínimo para a campanha rodar no Foundry 14 (antes da virada)

- [x] **C1. Migração de dados entre versões do sistema.** Feito no ciclo 38 (sessão Junin, 2026-10-13).
  - **Por quê:** o CORE tem (`modules/system/migrate`, com a versão em `dataModelVersion`). Aqui não há nenhuma, e
    depois da virada uma mudança de campo estragaria os atores do mundo real.
  - **O quê:** a versão dos dados no mundo e os passos em ordem, no mestre ativo (atores, tokens, itens e compêndios
    do mundo), com o aviso e o backup antes; e o `migrateData` dos modelos para as mudanças simples.
  - **Feito:** `scripts/migracao.mjs`, com os dois primeiros passos (o TeleOptics do ciclo 26 e o tipo de cyberware do
    ciclo 7). O `migrateData` fica para quando um campo do modelo mudar de nome ou de formato: o começo do arquivo diz
    quando usar cada um.
- [x] **C2. Capanga (mook) como tipo de ator.** Feito nos ciclos 36 e 37 (sessão KouArt, 2026-10-12).
  - [x] **A ficha:** curta, como a do CORE (perícias com nível, armas, armadura, cyberware): uma página só, ciclo 36.
  - [x] **O token:** solto por padrão, com o próprio HP de cada capanga: ciclo 36. O nome mudado na ficha de um token vai
    para o token na cena, como no CORE.
  - [x] **Arrastar um item** equipa ou instala: ciclo 36.
  - [x] **O combate:** igual ao do personagem (o tiro, a munição e o Death Save de cada token): ciclo 36.
  - [x] **A ficha limitada:** quem tem só a permissão Limitada vê a imagem, o nome e as notas, como no CORE
    (`cpr-mook-sheet-limited.hbs`): ciclo 37. O Observador vê a ficha inteira, sem editar.
- [x] **C3. As Roles do RED e as rolagens delas.** Feito nos ciclos 33 a 35 (sessão KouArt, 2026-10-12).
  - [x] As 10 Roles da wiki (o P0 "As Roles pelo RED"): ciclo 33.
  - A rolagem de cada habilidade, pelo item de Role do CORE (`_createRoleRoll`, `getRoleMods`) e pelo texto da wiki:
    - [x] Impacto Carismático (Rockerboy), Credibilidade (Media), a pechincha do Operator (Fixer) e o Backup (Lawman):
      ciclo 34. O Teamwork (Exec) e o Moto (Nomad) não rolam: o Moto é o bônus nas perícias de veículo (ciclo 33);
    - [x] Maker (Tech): Field, Upgrade, Fabrication e Invention Expertise, cada uma com TECH, uma perícia de TECH a
      escolher e os pontos dela: ciclo 35;
    - [x] Medicine (Medtech): a Cirurgia e a Tecnologia Médica (TECH + a perícia), com o nível que vem das especialidades
      (2 por ponto de Cirurgia, até 10; Farmacêutica + Criossistemas): ciclo 35. A Farmacêutica e os Criossistemas não
      rolam sozinhos, como no item do CORE.
  - [x] Os bônus situacionais na janela de rolagem: as rolagens de Role passam por ela (ciclos 34 e 35).
  - A Interface fica na C5.
- [x] **C4. Facedown:** COOL + Reputação + 1d10 (o `CPRFacedownRoll`). Feito no ciclo 39 (sessão KouArt, 2026-10-13): na
  aba Combate do personagem e no cabeçalho do capanga, pela janela de rolagem, com as penalidades de todas as ações.

### Fase 2: a NET

- [x] **C5. Interface:** Feito no ciclo 40 (sessão KouArt, 2026-10-13).
  - [x] as 9 habilidades (Scanner, Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus e Zap; `CPRInterfaceRoll`),
    com os bônus dos programas (os boosters, quando ativos), a Defesa e o dano do Zap;
  - [x] as Ações de NET pelo Rank;
  - [x] a iniciativa na NET: o netrunner usa a de sempre (REF + 1d10); quem age primeiro contra o Black ICE sai da
    Velocidade (Interface + velocidade + 1d10 contra SPD + 1d10), e o ICE entra no topo da fila. A iniciativa do Black
    ICE e do demônio como atores é o C7.
- [x] **C6. Programas no combate da NET:** Feito nos ciclos 40 a 42 (sessão KouArt, 2026-10-13).
  - [x] rezzar e derrezzar, com a REZ atual (o ativo veio no ciclo 40; a REZ, que perde, volta e em 0 desativa, no 41).
    A defesa de um programa (DEF + 1d10) vai com o Black ICE, no C7: nenhum programa do RED que o netrunner usa tem DEF;
  - [x] o ataque de programa (Interface + ATK + 1d10) e o dano dele contra o que atinge, sem crítico: ciclo 41;
  - [x] aplicar o dano (os botões do mestre no cartão): no cérebro do netrunner, sem a armadura (o Shield e o Armor da
    wiki), ou na REZ de um programa ativo do alvo: ciclo 42. O dano em Black ICE entra no Black ICE, com o C7;
  - [x] os boosters: no build e somando na Interface quando ativos (ciclo 40).
- [x] **C7. Black ICE e demônio como atores:** Feito nos ciclos 43 a 46 (sessão KouArt, 2026-10-13).
  - [x] **as fichas:** Black ICE com PER, SPD, ATK, DEF e REZ; demônio com REZ, Interface, Ações de NET e Combat Number;
    com as rolagens (o número + 1d10), o token solto com a REZ na barra e o modelo da wiki (os 12 Black ICE e os 3
    demônios do RED): ciclo 43;
  - [x] a iniciativa: no topo da fila, pela wiki e pelo CORE (sem somar a SPD, que o CORE soma; ver as dúvidas no
    MIGRATION_STATUS): ciclo 43;
  - [x] o dano: o do Black ICE no netrunner (no cérebro, sem o Shield, ou num programa, que o anti-programa destrói) e o
    dos programas e do Zap na REZ do Black ICE e do demônio, com o Zap do demônio: ciclo 44;
  - [x] os programas de Black ICE do netrunner (o Black ICE próprio, de 2 slots): os 12 da tabela da wiki no compêndio de
    Netrunning, com o tipo, PER e SPD no programa: ciclo 45;
  - [x] o token "rezzado" pelo programa de Black ICE do netrunner, ao ativá-lo no deck, pelo mestre ativo, com a REZ do
    token voltando para o programa: ciclo 46.
- [x] **C8. Arquiteturas e o NET Architect dentro do sistema:** Feito nos ciclos 47 a 56, 85 e 89 a 91 (sessão KouArt,
  2026-10-13 a 2026-10-17). Em partes:
  - [x] o tipo de item arquitetura, com os andares (um conteúdo por linha: a senha, o arquivo e o nó de controle com o
    DV; o Black ICE, o demônio e o netrunner inimigo), os ramos, o DV e o mapa na ficha, como o `netarch` do CORE e o
    NET Architect: ciclo 47;
  - [x] o compêndio "Arquiteturas da NET", escondido dos jogadores: as 4 da campanha, do documento da wiki (como o build do
    cpr-2077 o lê), e os 3 exemplos do NET Architect: ciclo 48;
  - [x] a geração pelas tabelas do CORE (3d6 andares, os ramos, o lobby, a dificuldade), com um Black ICE por linha nos
    resultados de vários ICE: ciclo 49;
  - [x] o ponto de acesso nos tiles (o botão no HUD, a configuração, o marcador, o oculto) e a conexão do token (o
    alcance, com o Range Upgrade; o deck e a Interface mínima; o status e o anel), com a janela da NET mínima (quem está
    na NET, o mapa que os jogadores enxergam, o registro e o "Desconectar") e a queda ao sair do alcance: ciclo 50;
  - [x] o motor no mestre para andar e para as habilidades contra os andares (o Pathfinder, o Backdoor, o Eye-Dee, o
    Control com os comandos, o Cloak e o Virus), com as Ações NET em combate, e a janela da NET com o mapa clicável, o
    andar escolhido, as habilidades e o painel do mestre: ciclo 51;
  - [x] os inimigos no andar, que seguram a descida (o Black ICE até cair ou até o Slide; o demônio até cair), o Zap e
    o Slide contra eles (o mestre rola a defesa e a PER no nome deles) e a REZ deles no estado e no painel do mestre:
    ciclo 52;
  - [x] os ataques dos inimigos e os efeitos de cada Black ICE (a velocidade na chegada, o ataque na vez dele pelo
    painel do mestre, o dano no cérebro e nos programas, o fogo do Hellhound, o Liche e o Scorpion, o Kraken, o Wisp, o
    Skunk, o Giant e a KRASH Barrier, a desconexão insegura com o efeito): ciclo 53;
  - [x] o deck na janela (ativar e desativar, 1 Ação NET, cada programa uma vez por rodada; atacar com o programa de
    ataque ativo, o anti-programa no Black ICE e no demônio e o anti-pessoal no netrunner inimigo; o programa desativa
    depois de usado): ciclo 54;
  - [x] o combate na NET (os inimigos encontrados na iniciativa, com um token escondido; a vez deles pela janela do
    mestre; a REZ do token e a do estado juntas; a saída no reinício e com o Tile apagado; a frase da chegada sem o
    netrunner inimigo entre quem segura a descida): ciclo 55;
  - [x] o jogador rolando as próprias rolagens, pela janela de rolagem dele (a configuração "O jogador rola as rolagens
    da NET"; o mestre rola sem resposta no prazo): ciclo 56;
  - [x] os nós de controle ligados à cena (as portas, as luzes, os sons e os tokens, pela configuração do ponto, e os
    comandos na janela do netrunner que toma o nó): ciclo 85;
  - [x] os arquivos do Eye-Dee (o diário na pasta "Arquivos da NET", que o dono do netrunner abre pela janela, e o
    aviso no chat): ciclo 89;
  - [x] o editor visual (no mapa da ficha da arquitetura: arrastar move ou troca o andar, o "+" cria um): ciclo 90;
  - [x] o Scanner (achar o ponto oculto, com o DV da configuração, pelo HUD do token) e a parede entre o token e o
    ponto (a wiki: "sem parede no meio"): ciclo 91.
- [x] **C9. A NET de 2077 (Mission Kit):** feito (sessão KouArt, ciclos 95 a 105, 2026-10-17 e 18). Decisão do usuário (2026-10-17):
  "rolagens e efeitos simples". O Jack In, o Breach e o Quickhack rolam como o Agarrar (o alvo rola a defesa pela janela
  do dono), e a ligação aparece nas duas fichas. O sistema aplica o que é número: o dano direto do Synapse Burnout, o
  fogo do Overheat, o MOVE do Impair Movement e do Slow, o inconsciente e caído do System Reset. O resto (Puppet, Lure,
  Short Circuit) vai ao chat, e o mestre narra.
  - [x] o Jack In e o Jack Out (a WILL do alvo pela janela de reação, a ligação nas duas fichas, o alcance do deck
    externo e o alvo à vista): ciclo 95;
  - [x] o Breach nos Passwalls do Self-ICE: ciclo 96;
  - [x] os quickhacks (a DV pelo Rank, um por alvo por rodada, o alerta e o Synapse Burnout): ciclo 97;
  - [x] os outros efeitos simples dos quickhacks (o fogo do Overheat, o MOVE do Impair Movement e do Slow, o System
    Reset): ciclo 98;
  - [x] a expulsão (a WILL + Concentração + 1d10 do alvo que percebeu, contra a Interface + 1d10 do netrunner) e o
    alvo netrunner que sempre sabe do Jack In: ciclo 99;
  - [x] as Ações NET fora da arquitetura (o Jack In e o quickhack em combate) e o Jack Out inseguro (sair do alcance,
    os 60 minutos): ciclo 100;
  - [x] o deck na Neuroport Cyberdeck Port (20 m contra arquiteturas, 50 m contra Neuroports): ciclo 101;
  - [x] o firewall de fábrica (a wiki: com Interface Rank 1 ou 2, o Jack In pede antes Interface contra DV6, e falhar
    não alerta; do Rank 3 em diante, passa direto): ciclo 102;
  - [x] o Neuroport como arquitetura NET (o nó de controle do Holophone, DV10; o Black ICE do deck ligado a ele, que
    age no Jack Out inseguro; o vírus de quem chega ao fundo). Decisão do usuário (2026-10-17): simples, o painel com os
    andares e, no Jack Out inseguro, o cartão diz qual Black ICE do deck do alvo age; o mestre aplica, sem descer
    andares: ciclo 105;
  - [x] a conexão direta pelo Personal Link (uma Ação NET a mais, passa direto pelos Passwalls; a mais de 2 m, desliga
    à força): ciclo 104. Decisão do usuário (2026-10-17): sem rolar, com o alvo inconsciente ou agarrado, ou quando o
    dono aceita (o mestre, pelo NPC); o firewall de fábrica vale (não é um Passwall);
  - [x] o alvo que morre (o Jack Out inseguro de quem está nele) e a ligação de quem saiu da cena (o token apagado):
    ciclo 103;
  - (saiu) a RAM e o Cooling dos decks: desde a revisão da wiki de 2026-10-16, os decks com marca são cyberdecks do RED
    da qualidade deles (ciclo 93).

### Fase 3: combate e itens que ainda não agem

- [~] **C10. Briga e Artes Marciais:** em andamento (sessão Junin, 2026-10-19). O dano pelo BODY e os golpes das Artes Marciais, com o Ataque de Precisão e a
  Recuperação de Falhas.
- [ ] **C11. Cyberware e upgrade que atacam:**
  - o cyberware que é arma (Wolvers, Mantis Blade, Gorilla Arm, o lança-granadas embutido). No CORE, o cyberware é
    `attackable` e `loadable`;
  - a arma sob o cano e a baioneta (o upgrade que ataca);
  - nos acessórios: o limite de slots, os plugs do Smartgun Link e o pente que fica acima do máximo quando o carregador
    sai.
- [x] **C12. Mãos livres:** feito no ciclo 87 (sessão Codex, 2026-10-17).
  - Duas mãos mais os bônus dos efeitos, menos as mãos das armas e dos escudos equipados.
  - BODY 8+ usa arma branca de duas mãos com uma.
  - Sem mãos, a nova equipagem é recusada nas fichas e no drop; guardar libera as mãos.
- [x] **C13. A falha crítica de cada arma:** feito no ciclo 88 (sessão Codex, 2026-10-17).
  - Na arma ruim, o `critFailEffect` do CORE: Emperra, Quebra, Quebra sem conserto e Cara ou coroa, pelo seletor da ficha.
  - O cartão informa a consequência da falha efetiva, inclusive acertando; o Solo pode suprimi-la.
  - A moeda e o estado da arma ficam com a mesa.
- [x] **C14. Munições especiais:** feito no ciclo 111 (sessão Codex, 2026-10-18).
  - Resistências por alvo, no navegador do dono; toxinas, sono, flashbang e gás com dano, duração e proteções próprios.
  - Incendiária sem acumular fogo; expansiva com outra lesão; Inteligente RED com segunda tentativa, nova esquiva e um
    projétil só, incluindo mirado e míssil. A Smart melhorada do Kit fica no C29.
  - EMP nos eletrônicos em uso: proteção do conjunto, escolha do mestre, estado inoperante, minuto e Desfazer, sem
    mudar instalação ou Humanidade; deck, porta e Neuroport respeitam a parada e as janelas abertas a reconferem.
- [x] **C15. Veículos no combate:** feito (ciclo 117, sessão Codex).
  - dano no SDP menos SP, com ablação da munição e sem bônus ou lesão crítica; Desfazer pela diferença;
  - armas instaladas vinculadas ao upgrade e ao veículo, preparação única e recarga impedida enquanto dirige;
  - vidro blindado por janela (15/30 HP), cobertura e explosivos; Tech conserva a cobertura que atravessa;
  - um veículo em uso por vez, inclusive entre os da família; a ida e volta da wiki conserva os vínculos por ID.

### Fase 4: ficha e inventário

- [x] **C16. Usar droga** (o `snort` do CORE): feito no ciclo 124 (sessão Codex, 2026-10-18).
  - gasta a dose, liga o efeito pela duração, e vêm o efeito secundário e o vício;
  - também: o Medscanner e o Techscanner que não acumulam, e a luz da lanterna no token.
  - os prazos persistem e expiram pelo relógio e ao voltar ao mundo; doses adicionais estendem sem duplicar o bônus;
  - scanners não acumulam também com o implante. Lanterna e sinalizador têm alcance de 100 m (decisão do usuário);
    o sinalizador gasta uma unidade e dura uma hora. A luz original do token é preservada.
- [x] **C17. Pilhas:** feito no ciclo 129 (sessão Codex, 2026-10-19), pelo `stackable` do CORE 0.92.4.
  - juntar ao soltar, inclusive do diretório e compêndio: o primeiro item de mesmo tipo e nome, com a condição literal
    de upgrades do CORE (decisão do usuário; equipamento e roupa só juntam se o destino tem upgrades);
  - dividir munição, equipamento, roupa e droga nas fichas de personagem, capanga e contêiner, com a metade para cima
    como sugestão. O original conserva o ID e o UID; a cópia tem outro ID, sistema e efeitos, com o catálogo;
  - permissões, cancelamento, consumo durante a criação e recuperação de operações recusadas conferidos no Foundry.
    Ao juntar conteúdo instalado, ficam só os upgrades do destino, como no CORE (ver as dúvidas).
- [~] **C18. Armadura:** em andamento (sessão Codex, 2026-10-19). Qual armadura conta em cada local, e ablar e consertar com um clique.
- [ ] **C19. Lesão crítica fora do ataque:** rolar na tabela à mão, e o paliativo e o tratamento com a DV.
- [ ] **C20. Macros e favoritos:** arrastar arma, perícia ou item para a barra, e os favoritos na aba Combate.
- [ ] **C21. Cyberware:**
  - a base com os slots das opções (instalar dentro da base, como a montagem da wiki): ciclos 82 a 84;
  - a terapia, que devolve Humanidade até o máximo;
  - a ciberpsicose.
- [ ] **C22. Moradia, estilo de vida, moda e Trauma Team** (o `lifestyle` do CORE). A wiki guarda, e o cpr-2077 manda na
  ficha "Na mesa".
- [x] **C23. Mais de uma Role, e perícias novas:** feito (ciclos 118 a 120, sessão KouArt). Por partes:
  - [x] a segunda Role da criação (a wiki de 2026-10-17, "Duas Roles na criação", regra da mesa; o criador guarda a
    `roleSecundaria`, com o Rank, as habilidades, o Lifepath e a oficina) no modelo, nos derivados das duas (a Interface
    do Netrunner, o Moto do Nomad, a Consciência de Combate do Solo, as perícias do Medtech), no import da wiki (o
    `?roles=2`), no envio da ficha e na migração da mesa (a lista `roles`): ciclo 118;
  - [x] a ficha: a aba Role com as duas (o Rank, as habilidades e as rolagens de cada uma) e o cabeçalho: ciclo 119 (o
    painel acrescenta a segunda, e o "Tirar" a tira);
  - [x] a Role ativa, como no CORE: resolvida pelo desenho (decisão do usuário, 2026-10-18: a principal no cabeçalho, as
    duas na aba Role, a Interface do Netrunner, seja ele a principal ou a segunda; sem o seletor);
  - [x] as perícias novas, como no CORE (o nome e o STAT): ciclo 120 (o "+ PERÍCIA", o grupo Próprias e a migração da
    mesa).

### Fase 5: mestre e mesa

- [~] **C24. Contêiner** (o ator `container` do CORE; em andamento, sessão KouArt, 2026-10-18). Por partes, um ciclo cada:
  - [x] o ator e a ficha: os tipos (loja, saque, esconderijo, personalizado) com as permissões do CORE, os itens por
    categoria com o preço, o dinheiro com o extrato, as configurações do mestre, pôr e pegar de graça (inteiro ou uma
    parte), o estoque infinito e a trava (o jogador não move o token sem a permissão): ciclo 122;
  - [x] a loja que vende: comprar (inteiro ou uma parte) pelo preço, o dinheiro de quem compra e o registro das trocas nos
    dois extratos: ciclo 130;
  - [ ] a loja que compra: o jogador arrasta o item para a loja; a oferta pela porcentagem de cada tipo (o "Configurar a
    loja" do CORE), até o dinheiro da loja.
- [x] **C25. O Painel Tático dentro do sistema:** feito (ciclo 125, sessão KouArt, 2026-10-18; o pedido do usuário para a primeira
  sessão da Morana no Foundry 14): o HUD com o retrato por estado de ferimento, os vitais, os atributos, as armas, as
  ações, os painéis e o estilo de cada jogador, como o módulo da mesa.
- [ ] **C26. Conveniências:**
  - o `/red` no chat (rolagem com o crítico do d10);
  - o DV no HUD do token e na régua;
  - a iniciativa crítica como configuração;
  - os estados do CORE (caído, agarrado…);
  - as chaves do Fluxo que faltam: "Resolver os ataques", "O jogador rola os próprios dados" e "Dano: manual".

### Fase 6: plataforma e wiki

- [ ] **C27. O resto do cpr-2077:**
  - "Atualizar da wiki", o retrato e os avisos de envio;
  - a campanha da wiki de cada mundo, e o crossover;
  - o histórico do ledger na migração. Pede mudar o cpr-2077; é decisão do usuário.
- [ ] **C28. A sistema-v14 no master**, com a instalação automática no Foundry 14 do servidor. Hoje é à mão, pelo
  `servidor/instalar-sistema-v14.sh`.
- [x] **C29. A wiki do master de 2026-10-17 ("uma regra só na mesa": o Mission Kit sobre o RED).** O que os testes de
  referência acusaram na integração do ciclo 93 (QUALITY_GATES, "Falhas conhecidas desde a integração do master").
  Decisão do usuário (2026-10-17): depois do C9, o catálogo de 2077 pela loja vem primeiro:
  - [x] a NET (da sessão KouArt): o Scanner como 1 Ação NET, o Breach no lugar do Backdoor, a 10ª habilidade de
    Interface (o Quickhack) e o texto novo do ponto de acesso: ciclo 94;
  - [x] as Roles: as do RED pelo criador novo e os situacionais de Role: ciclo 109 (o sistema já seguia o criador; os
    testes de referência ganharam o texto novo). A segunda Role da criação vai com o C23;
  - [x] o TeleOptics de 2077, que saiu da wiki (o passo 1 da migração e o passo da janela de rolagem): ciclo 107 (o de
    2077 vale o do RED, como diz a revisão da wiki);
  - [x] a fundação e as opções sem os cyberópticos e as placas de 2077: ciclo 108 (sem o encaixe das placas; o
    Neuroport é a única fundação de 2077);
  - [x] o catálogo de 2077: a loja da wiki, os tamanhos dos compêndios e o efeito de falha das armas: ciclo 106 (o
    catálogo já era o da loja nova desde o build do ciclo 94; os testes de referência ganharam os números da wiki nova);
  - [x] as armas de 2077 pelo Mission Kit (decisão do usuário, 2026-10-17: entram no plano; 2026-10-18: agora, sessão
    KouArt), nos ciclos 110 a 116: os modos Power, Smart e Tech e as regras de cada modelo pela wiki, o teste Smart sem o Smart Link e os dois
    canos. Os testes que falham desde o ciclo 32 voltam a passar. Por partes, um ciclo cada:
    - [x] Smart: a ligação (o Personal Link do Neuroport ou o Subdermal Grip), o +1 e o fim do teste Smart; os dois canos
      da Palica pelo dano; os dois alvos da Kappa no tiro comum: ciclo 110 (saíram as duas configurações do ataque Smart);
    - [x] a munição Smart melhorada (a segunda chance com 14 + 1d10; sem as penalidades de visão): ciclo 112 (quem atacou
      rola, no computador dele; na área, contra a DV dela);
    - [x] as balas por tiro (as 3 balas e o dano com menos; a Zhuo): ciclo 113;
    - [x] Power: o ricochete com −4 (−2 com o Ballistic Coprocessor) e a lesão crítica com 10 de dano bônus: ciclo 114 (o
      cartucho ricocheteia da superfície; saíram a tabela de autofogo e o dado a menos do suplemento);
    - [x] Tech: carregar na Ação de Movimento, CDT 1, a cobertura fina e a metade do SP: ciclo 115 (o botão Carregar;
      saíram a carga e a rajada do suplemento, a janela da cobertura e a configuração da arma que esfria);
    - [x] o resto das regras de cada modelo (o tiro mirado da Unity, o BODY e a lesão da Carnage, a Burya, o ferrolho da
      Grad, a Nekomata, a Omaha): ciclo 116 (a Lexington do Kit não tem regra própria nem autofogo).
- [x] **C30. Os lados do cyberware e o membro natural (a wiki do master de 2026-10-17 e 18):** feito (ciclos 121 e 126,
  sessão Junin, 2026-10-18). A wiki recusava (409) importar no Foundry 14 o personagem com lado no cyberware até o
  importador declarar o suporte (`?locais=1`, desde o ciclo 121). Por partes:
  - [x] o lado de cyberbraço, cyberperna e cyberolho (esquerdo ou direito; `personagem-cyberware.js` da wiki) no
    modelo, na ficha do item, no import da wiki (o `?locais=1`) e no envio da ficha (o `local`, e o `cyber` com o tipo,
    o tamanho e os slots, como o cpr-2077): ciclo 121 (também a migração da mesa e os `dentroIds`);
  - [x] o membro natural: a peça única (Wolvers, Talon Foot e as outras da lista da wiki) num braço ou numa perna sem
    cyberbraço ou cyberperna daquele lado, uma por membro, sem fundação (a wiki manda `natural: true`; o CORE usa a
    base Meat Arm ou Meat Leg): ciclo 126 (também a opção que só entra na fundação do lado dela e a migração da mesa
    sem a Meat Arm e a Meat Leg).

**Pronto, para cada item:**
- G1 a G4 passando, com teste de referência da regra (G3) e passo novo no cenário (G4);
- o MIGRATION_STATUS com o ciclo.

No fim de tudo, uma sessão de teste com a mesa.

## P0: dados, integridade das regras e compatibilidade básica

- [x] **Servidor da mesa real fora do alcance do sistema v14.** O `servidor/atualizar-modulo.sh` rodava todo
  `foundry-*/instalar.mjs` com a pasta de dados do Foundry 12 do servidor, e o `servidor/atualizar.sh` disparava isso a
  cada mudança em `foundry-*/`. Agora os dois ignoram o `foundry-sistema/`. (Ciclo 0)
- [x] **`instalar.mjs` só instala num Foundry 14**, pela versão no log do Foundry ao lado da pasta Data (ou
  `FOUNDRY_VERSAO=14`). (Ciclo 0)
- [x] **Trabalho guardado no branch `sistema-v14`**, sem push. (Ciclo 0)
- [x] **Humanidade máxima pelo cyberware instalado** (desvio de regra): 10 × EMP, menos 2 por peça com perda de
  Humanidade maior que 0, menos 4 por borgware. Fonte: wiki (system-rules.js, "cada peça reduz o máximo em 2") e o
  CORE (`_calcMaxHumanity`). (Ciclo 1)
- [x] **Munição** (desvio de regra, achado ao escrever o teste da borracha): o conversor transformava a ablação 0 do
  CORE em 1 (borracha, biotoxina, veneno, fumaça, gás lacrimogêneo e paintball), e a borracha causava lesão crítica.
  Fonte: a tabela de munição da wiki (system-catalog.js): a borracha "não causa lesão crítica nem ablação", e a
  biotoxina e a venenosa "não causam ablação". (Ciclo 4)
- [x] **Tipo do cyberware trocado ao salvar a ficha do item** (dados, achado no ciclo 7): as chaves de
  `TIPOS_CYBERWARE` não eram as do catálogo (`cyberEye`, `cyberAudioSuite`, `cyberwareInternal`, `cyberwareExternal`).
  O select mostrava a primeira opção, e mudar qualquer campo gravava o tipo como `fashionware`. Agora as chaves batem, e
  a ficha do item garante o valor atual entre as opções de todo select. (Ciclo 7)
- [x] **Munição que não causa dano** (Ciclo 5): a wiki diz que biotoxina, veneno, EMP, flashbang, sonífera e gás
  lacrimogêneo "não causam dano", e a fumaça só cobre a área, mas o sistema aplicava o dano da arma. Agora quem é pego
  não leva dano, e o cartão diz o efeito com o texto da wiki. Os testes de resistência automáticos ficam para o P2.
- [x] **Bônus de Role nas perícias que valem sempre** (desvio de regra, achado na comparação com o CORE; Ciclo 23): no
  Foundry 12, o item de Role soma o Rank em perícias, e aqui nada somava. Quem migrasse ficava com essas perícias menores
  que na mesa. Fonte: a wiki (system-catalog.js e system-2077.js) e os itens de Role do CORE e do cpr-2077
  (`foundry-2077/build/roles.mjs`):
  - **Nomad, Moto:** o Rank em Conduzir Veículo Terrestre, Pilotar Veículo Aéreo e Marítimo, e Tecnologia de Veículos
    Terrestres, de Aeronaves e Marítimos;
  - **Face, a especialização:** o Rank em duas perícias (Siren: Conversação e Cuidados Pessoais; Rockerboy: Tocar
    Instrumento e Manha; Model: Atuação e Comércio);
  - **a especialização vem da wiki:** a importação e a migração guardam a escolhida (o `resultado.role.especializacao`
    do criador; a ficha "Na mesa" não a manda), e a aba Role a mostra e troca;
  - **ficam para a janela de rolagem (P1), porque são situacionais:** o Investigator do Lawman (o Rank em Educação e
    Percepção, e nas perícias da especialização, com pista de caso ativo) e o Netrunner de 2077 (o Rank de Interface nos
    testes técnicos enquanto corre a NET). No Foundry 12, o do Lawman se marca na janela de rolagem.
- [x] **Editor de Dor** (desvio de regra, achado na revisão de 2026-10-12): zerava também o −4 de mortalmente ferido.
  Fonte: a wiki ("Pain Editor: Ignora penalidades de Seriously Wounded", system-catalog.js) e o CORE
  (`getWoundStateMods`). Agora tira só o −2 de gravemente ferido. (Ciclo 31)
- [x] **Desinstalar cyberware devolvia a Humanidade** (desvio de regra, achado na revisão de 2026-10-12): dava para
  tirar e pôr de novo para rolar a perda outra vez. Fonte: a wiki ("Humanidade, terapia e drogas": cada peça reduz o
  máximo, e a Humanidade volta pela terapia) e o CORE (`uninstallCyberware` só recalcula o máximo). (Ciclo 31)
- [x] **O master na branch** (Mission Kit, Black Chrome, visual novo): o build quebrava no grupo `neuroport` do Kit, e
  os testes de regra caíam para 29 de 31. Agora o conversor de 2077 segue o Kit. (Ciclo 31)
- [ ] **As armas de 2077 pelo Mission Kit** (adiado pelo usuário em 2026-10-12; fora do plano de paridade) (desvio de regra desde a integração da revisão, ciclos 31 e 32): a wiki
  trocou as regras do suplemento de fã pelas do Kit, e os modos dos ciclos 17 e 18 ainda seguem o suplemento:
  - os modos de cada classe: a Power (+5 na lesão crítica e o Ricochete a −4, −2 com o Ballistic Coprocessor), a Smart
    (+1, e só dispara conectada pelo Personal Link ou pelo Subdermal Grip) e a Tech (Carregar gasta a Ação de Movimento;
    carregada, o próximo ataque é de CDT 1, atravessa cobertura fina e ignora metade do SP);
  - as regras de cada arma que a wiki guarda em `regras` (as balas por tiro e o dano com menos, a carga da Burya e da
    Omaha, o BODY mínimo, a lesão de quem dispara sem cromo) e o +1 em tiro único entre 13 e 50 m (Nowaki, Masamune,
    Kyubi);
  - os Rebuilds e a segunda chance da munição Smart melhorada.

  As armas já entram com a classe, a origem e as regras próprias na flag `arma2077` (Ciclos 12 e 31). O
  `foundry-2077/scripts/armas2077.mjs` do master tem a implementação do Foundry 12.
- [x] **As Roles pelo RED** (→ C3) (desvio de regra desde a integração da revisão, ciclo 32; Ciclo 33): a wiki do master
  voltou às 10 Roles do RED. O Face e o Corpo viraram Rockerboy e Exec, e as especializações de 2077 saíram do criador:
  - fica o Moto do Nomad (o texto do RED na wiki e o item do CORE); saem a especialização do Face e os situacionais de
    2077 (o Investigator do Lawman, a Interface do Netrunner);
  - a Role antiga (Face, Corpo) vira a do RED de onde vinha, pelo `roleAliases` da wiki: na importação, na migração e
    na ficha que já tinha "Face";
  - os opcionais da wiki (o Investigator, o desconto do clã do Nomad) ficam com o mestre (MIGRATION_STATUS, dúvidas).

## P1: bugs, testes de regressão e confiabilidade

- [x] **Portões de qualidade** (Ciclo 2):
  - testes unitários das regras puras com `node --test`: rolagem, dano, armadura, lesão, Death Save, defesa, autofogo e área;
  - ESLint com versão exata pelo npx, sem node_modules;
  - o cenário do Foundry 14 falhar com aviso de compatibilidade vindo do sistema;
  - teste da parede no fogo supressivo;
  - versão exata e hash conferido do que o build baixa (js-yaml da CDN, foundryvtt-cli do npm).
- [x] **Combate** (Ciclo 3):
  - as habilidades do Solo (Consciência de Combate) como a wiki descreve: Reação de Iniciativa, Ataque de Precisão,
    Ponto Fraco, Deflexão de Dano, Recuperação de Falhas e Detecção de Ameaça. O Ponto Fraco e a Deflexão valem uma vez
    por rodada do combate, e o Desfazer devolve o que o ataque gastou;
  - −6 MOVE (mínimo 1) do mortalmente ferido;
  - o ataque de um jogador sem mestre na mesa para antes de gastar a bala e de rolar.
- [x] **Lacunas de teste** (Ciclo 6): escudo (com o explosivo que passa do escudo destruído), "responder pelo
  jogador", corpo a corpo com esquiva, armadura pesada, janela do mestre para a defesa de NPC e os erros da importação.
  A munição de borracha ganhou teste no ciclo 4.
- [x] **A janela de rolagem nos testes de atributo e de perícia** (achado na comparação com o CORE; Ciclo 24): no Foundry
  12, todo teste passa pela janela do CORE, e os três módulos da mesa dependem dela (o Fluxo, o NET Architect e o Painel
  Tático: "confere os modificadores, põe Sorte e confirma"; Ctrl pula). Agora a ficha abre a janela, com:
  - o modificador avulso (o que o mestre manda somar);
  - os modificadores comuns do livro, pela tabela da wiki (RED p. 130, system-rules.js): noite ou pouca luz e nunca fez
    antes (−1); tarefa complexa, sem as ferramentas certas, dormiu mal e tensão extrema (−2); exausto, muito bêbado ou
    sedado, em segredo e encoberta por fumaça ou escuridão (−4); perícia complementar e tempo extra (+1);
  - os efeitos situacionais, ligados ou não na hora: os que hoje ficam de fora (Audição Amplificada, Image Enhance, o
    Sandevistan ligado, Dedos esmagados), o Investigator do Lawman e o Netrunner de 2077 (P0, acima);
  - a Sorte na própria janela (vem com a preparada na ficha, ciclo 20).
- [x] **A janela de rolagem no ataque e na iniciativa** (Ciclo 25): os botões de ataque da ficha abrem a janela antes de
  gastar a bala; a luneta de precisão (+1 em tiro único ou mirado a 51 m ou mais, wiki) vem marcada quando vale e entra
  sozinha sem a janela; a iniciativa de quem tem um situacional (o Sandevistan, +3 ligado por padrão, como o CORE) abre
  a janela, e sem ela o +3 entra.
- [x] **A janela de rolagem no resto** (Ciclo 27): no computador do jogador, a esquiva e a Concentração que o mestre
  pede (dentro do prazo: a janela fecha quando ele desiste ou responde por ele), o dano que ele rola e o Death Save do
  começo do turno; na ficha, o botão do dano e o do Death Save. Com isso, o P1 fecha.

## P2: fichas, inventário, equipamento, armas e combate

- [x] **Tipos de item que o importador descartava** (bloqueador da migração da campanha):
  - [x] equipamento, roupa e droga, com a quantidade, o uso da montagem da wiki e os efeitos do equipamento pelo uso
    (Ciclo 8);
  - [x] cyberdeck e programa, com os programas no deck (Ciclo 9);
  - [x] acessório de arma e hardware de cyberdeck (os upgrades), no lugar da montagem (Ciclo 10);
  - [x] veículo (os da família do Nomad, com os upgrades) (Ciclo 11);
  - [x] o conteúdo de 2077 que a loja da wiki vende: armas-2077, netrunning-2077 e cyberware-2077 (Ciclo 12).
- [x] **Volta da ficha para a wiki e pedidos da loja** (bloqueador da migração):
  - [x] a ficha volta para a wiki a cada mudança ("Na mesa"), no formato do cpr-2077 (Ciclo 13);
  - [x] a entrega dos pedidos da loja aprovados pelo mestre (Ciclo 14).
- [x] **O estado de jogo da campanha** (bloqueador da migração): "Importar da mesa" monta o ator pela ficha que o
  Foundry 12 manda para a wiki (Ciclo 15). Procedimento no MIGRATION_STATUS.
- [x] **Da wiki, a janela "Personagens da wiki"** (botão na aba de Atores): Importar, Importar da mesa, abrir a ficha,
  aprovar e recusar pedidos (Ciclo 16).
- [x] **Da wiki, o Foundry 12 e o 14 juntos** (o pedido do usuário de 2026-10-15): cada Foundry com o seu vínculo na
  wiki (o 14 manda `geracao: 14`); a janela diz onde o personagem está e importa de novo quando o ator do 14 sumiu; o
  ator apagado avisa a wiki (Ciclo 57; a parte da wiki também no master, para o usuário publicar).
- [ ] **Da wiki, o resto:** (→ C27) "Atualizar da wiki" (hoje, importar de novo cria outro ator), os avisos de envio, o retrato e
  a campanha da wiki de cada mundo (a janela lista os personagens de todas as campanhas).
- [x] **A mesa no servidor e a migração** (Ciclo 31):
  - o endereço da wiki deduzido de `mesa.<domínio>`, como o cpr-2077;
  - só o ator ligado ao personagem entrega pedidos e manda a ficha (a wiki recusa o "ator antigo");
  - o pacote das cenas: as cenas, os diários e as playlists do mundo do Foundry 12 num módulo, com os arquivos.
- [ ] **Black Chrome** (conteúdo: fora do plano de paridade) (bloqueador da migração para quem tiver os itens): os 176 itens da loja.
  - Converter dos compêndios do CORE (`black-chrome_*` e `dlc_black-chrome-plus`): armas com Combinação, cyberdedos, Linear Frames, moda, equipamento e veículos.
  - Mais as regras novas (dano direto no HP, Combinação).
  - Hoje o importador e os pedidos avisam e não entregam.
- [x] **Inventário:** (C16, ciclo 124) usar uma droga (gasta a dose, liga o efeito pela duração e pede o teste de vício); o Medscanner
  e o Techscanner que, pela wiki, não acumulam com outro; a luz da lanterna e do sinalizador no token.
- [x] **Na rolagem, a Sorte** (Ciclo 20): os pontos preparados na ficha entram no próximo teste, +1 cada, e saem da
  Sorte; o ↺ do começo da sessão.
- [ ] **Na rolagem, o resto:** (→ C4 e C10; o Facedown no ciclo 39) Briga e Artes Marciais (dano pelo BODY), com o Ataque de Precisão e a Recuperação de
  Falhas do Solo; Facedown (COOL + Reputação + 1d10, como o CORE).
- [x] **As rolagens das Roles** (→ C3; ciclos 34 e 35, com as Roles do RED) (o CORE rola pelo item de Role; aqui só o Solo tinha efeito):
  - Impacto Carismático do Face (Rank + 1d10 contra DV 8, 10 ou 12) e Credibilidade da Media (Rank + 1d10);
  - Barganha do Corpo (o Operator do Fixer: COOL + Comércio + Rank + 1d10, teste enfrentado);
  - as especialidades do Tech (Field, Upgrade, Fabrication e Invention Expertise);
  - Cirurgia e Tecnologia Médica do Medtech: só ele tem as duas perícias, que hoje não existem para rolar (TECH + 2 por
    ponto de Cirurgia; TECH + os pontos de Farmacêutica e de Criossistemas, como a wiki e o CORE 0.92.3).
- [ ] **Na ficha, o que o CORE e o Painel Tático têm:** (→ C18, C19 e C20) consertar a armadura com um clique (hoje, só editando o SP na
  ficha do item); rolar uma lesão crítica à mão (uma queda, uma explosão fora do ataque); macros na barra (arrastar
  uma arma ou uma perícia).
- [x] **Inventário, o resto do CORE:** (→ C17, ciclo 129) juntar itens iguais ao soltar na ficha e dividir uma pilha,
  conforme a decisão de reproduzir literalmente o CORE. As mãos livres foram feitas no ciclo 87 (C12).
- [x] **A ficha nova** (Ciclo 19), no visual do modelo de ficha da mesa: o painel geral em três colunas, as abas
  Combate, Equipamento, Cyberware, Role, NET e Vida, o apelido e o Lifepath (com a importação da wiki), as perícias de
  família pela ficha e o tema escuro com as fontes embutidas, também na ficha do item. A aba Role mostra as
  especialidades (Solo, Tech, Medtech) com os nomes em português e os pontos editáveis, o que dá para redistribuir a
  Consciência de Combate.
- [x] **A ficha, o resto do visual e da Role** (Ciclo 20): os cartões do chat no visual da ficha e a conferência dos
  pontos de Role pelo Rank.
- [x] **O visual novo** (o pedido do usuário de 2026-10-15, com as maquetes dele em `Exemplos/`, fora do git): feito
  pela sessão KouArt, ciclos 58 a 62, em partes, cada uma com os mesmos textos e ganchos que os testes leem. As funções
  das maquetes que o sistema não tem ficaram como pergunta ao usuário (MIGRATION_STATUS, dúvidas):
  - [x] a janela da NET, além da maquete (que não cobre tudo): o topo com a conexão e o netrunner (a Interface, a Sorte
    preparada, as Ações NET em losangos e a desconexão insegura); os avisos lado a lado; o mapa com a cor do que manda
    em cada andar e um cabo até o andar de onde se chega; ao lado, quem está na NET, o painel do mestre, o andar
    escolhido (com a barra de REZ) e o deck; embaixo, as habilidades com a base da rolagem e o registro com a hora:
    ciclo 58;
  - [x] os cartões do chat: a mensagem inteira como o cartão da maquete (a faixa na cor do tipo, o tipo e quem rolou na
    linha de cima), os dados em caixas com o total grande (no lugar do bloco de rolagem do Foundry), o crítico numa
    etiqueta, e no resultado do ataque as etiquetas de cada alvo e a barra de HP: ciclo 59;
  - [x] a ficha, parte 1: as abas Combate, Equipamento e Cyberware em duas colunas (à esquerda os números em grande:
    a Iniciativa e os vitais, os Eurodólares e a munição, a Humanidade; à direita as listas), e as lesões críticas
    também na aba Combate: ciclo 60;
  - [x] a ficha, parte 2: as abas Role (a Role em grande à esquerda; as especialidades com os pontos em caixas), NET
    (a Interface em grande e os cyberdecks à esquerda; as habilidades em cartões e os programas) e Vida (o Lifepath em
    cinco painéis): ciclo 61;
  - [x] as fichas dos itens: o tipo na cor dele, o resumo e as etiquetas no alto; as abas Detalhes, Descrição e
    Efeitos; os campos em células; o uso em três botões (a ficha da arquitetura não mudou): ciclo 62.
- [x] **As funções das maquetes que o sistema não tem** (todas, até o ciclo 84) (a decisão do usuário de 2026-10-15: "cada um vira um item"; a
  lista da dúvida no MIGRATION_STATUS). Cada uma é um ciclo, com os portões; as que tocam regra seguem a wiki
  (`system-rules.js`), e as que a contrariam esperam a decisão da mesa, sem mudar a regra antes. As marcas: (interface)
  é só a ficha ou o cartão chamando o que o sistema já faz; (regra: …) diz o que a wiki tem; (decisão da mesa) é o que
  a wiki não tem ou contraria.
  - **No chat:**
    - [x] "Aplicar dano" no cartão do dano rolado à parte: nos alvos marcados (T), no corpo, com a armadura e o +5 do
      crítico, como o fluxo do ataque faz, e o "Desfazer": ciclo 64;
    - [x] "Rolar a lesão" no cartão do dano crítico rolado à parte: a tabela do corpo (p. 187) em cada alvo marcado,
      uma vez por alvo: ciclo 64;
    - [x] "Adicionar ao combate" no cartão da iniciativa: coberto pelo "Rolar iniciativa" da ficha, que põe o ator na
      fila e rola lá (o Foundry já não deixa uma iniciativa solta para adicionar): ciclo 65;
    - [x] "Aplicar" na perda de Humanidade rolada à parte: o botão do mestre no cartão tira o total da Humanidade atual do
      dono uma vez, e o cartão diz o que mudou (a instalação continua aplicando sozinha): ciclo 73;
    - [x] ~~"+ Sorte" no cartão do teste já rolado~~: não entra (a decisão do usuário de 2026-10-15: a Sorte só antes
      de rolar, como a wiki);
    - [x] ~~"Rolar de novo" no cartão do teste~~: não entra (a decisão do usuário de 2026-10-15: o RED não tem).
  - **Na ficha:**
    - [x] "Rolar iniciativa" na aba Combate: entra no combate (o do mestre cria um, se não houver) e rola na fila, pela
      iniciativa do sistema; quem já rolou naquele combate não rola de novo: ciclo 65;
    - [x] ~~o local do acerto (cabeça, corpo, aleatório)~~: não entra (a decisão do usuário de 2026-10-15: o acerto é no
      corpo, e a cabeça só pelo tiro mirado, −8, como a wiki; o "Mirar" da ficha já faz);
    - [x] "Proteger-se" (a cobertura, p. 182; a decisão do usuário de 2026-10-16: só a marca): o botão na Defesa da aba
      Combate marca o token "Em cobertura", e o cartão do tiro contra ele avisa o mestre, que decide: ciclo 79;
    - [x] "Agarrar" (a wiki, "Agarrar e arremessar", p. 177; a decisão do usuário de 2026-10-16: o alvo resiste pela
      janela do dono, como a esquiva): DEX + Briga + 1d10 dos dois lados, o empate do defensor; agarrados, os dois com
      −2 em todas as ações; "Soltar": ciclo 80;
    - [x] o resto do agarrão (a mesma página): Estrangular (o BODY de quem agarra direto no HP; abaixo de 0, fica com 1
      e desmaia; três rodadas seguidas, desmaia), Derrubar (o BODY, o alvo cai e o agarrão acaba), Escapar (o teste de
      agarrar vencido, uma Ação) e os botões na ficha do capanga: ciclo 81;
    - [x] a correção rápida e o tratamento da lesão, na aba Combate e na ficha da lesão (wiki, p. 128 e 223: TECH + a
      perícia + 1d10 superando a DV da lesão; a correção tira o efeito até o fim do dia, com o "Voltou", e na lesão sem
      tratamento resolve de vez; o tratamento cura e não pode ser em si mesmo): ciclo 77;
    - [x] a Sorte usada na sessão no cabeçalho (o máximo menos a que resta; o ↺ zera): ciclo 66;
    - [x] a quantidade com − e + no inventário (equipamento, roupas e drogas; sem passar de 0): ciclo 67;
    - [x] "Usar" a droga (ciclo 78; regra, conferida na wiki em 2026-10-16: ao tomar, WILL + Resistir Tortura/Drogas + 1d10 contra a
      DV do efeito secundário, e falhar dá o efeito secundário e o vício; algumas custam Humanidade, como o Black Lace,
      2d6; doses a mais estendem o efeito primário): gasta a dose, liga o efeito primário e rola o secundário;
    - [x] "Usar" no equipamento de ativação à mão (liga e desliga os efeitos dele; na linha do inventário e na ficha do
      item; nenhum dos 46 do catálogo tem efeito, vale para os feitos à mão): ciclo 71;
    - [x] a fundação e as opções do cyberware, parte 1 (a wiki, `system-catalog.js` e `system-2077.js`): os slots de
      cada fundação no catálogo, o encaixe (o mesmo tipo; o Sensor Array recebe as do Cyberaudio; as placas base de 2077,
      as de placa), a opção que entra na fundação ao instalar e a árvore na aba Cyberware: ciclo 82;
    - [x] a fundação e as opções do cyberware, parte 2: a migração (a decisão do usuário de 2026-10-16: cada opção já
      instalada na primeira fundação compatível do mesmo ator, os slots das fundações pelo catálogo, e a que não couber
      "sem fundação", marcada na ficha) e a importação da wiki (a opção na fundação dela, pelo criador e pela ficha "Na
      mesa"): ciclo 83;
    - [x] a fundação e as opções do cyberware, parte 3: "+ Opção" na fundação e a escolha da fundação na ficha da opção
      (o "Instalar opção" da maquete); o "+ Fundação" é o "Instalar" de cada fundação: ciclo 84;
    - [x] as notas de ciberpsicose na aba Cyberware e as notas da Role (dois campos de texto novos no personagem, vazios
      por padrão): ciclo 68;
    - [x] "Conectar" e "Desconectar" na aba NET: o token do ator no ponto de acesso mais perto, com as conferências do
      clique no marcador (a arquitetura, o deck e o Rank, o alcance), "Abrir a NET" e a desconexão segura: ciclo 69;
    - [x] os slots do deck em caixas (no painel da Interface) e o estado de cada programa (guardado, carregado, ativo);
      o "Rodar" é o botão "Ativo" de sempre: ciclo 72;
    - [x] a arquitetura onde o netrunner está, ao vivo, na aba NET (os andares como ele os conhece, com o estado de
      cada um; a ficha se redesenha quando o estado do ponto muda): ciclo 76.
  - **Na ficha do item:**
    - [x] "Consertar" na armadura: o SP volta ao máximo, e o chat diz que o personagem consertou (a wiki só diz "até
      ser reparada", p. 186; a decisão do usuário de 2026-10-16: o mestre narra o conserto): ciclo 70;
    - [x] "Atacar" e "Recarregar" na ficha da arma de um personagem (o fluxo da ficha dele) e o SP de cada local da
      armadura em caixas, com o "−1" (o "Ablate"; sem passar de 0): ciclo 74. Os "acertos recebidos" das maquetes ficam
      de fora: o sistema não os conta (o SP gasto já diz);
    - [x] "Rodar" e "Restaurar REZ" na ficha do programa (liga e desliga no deck, como o "Ativo" da aba NET; a REZ
      atual e a volta ao máximo): ciclo 75;
    - [x] "Rolar Humanidade" no cyberware de um ator (a perda rolada sem instalar, no cartão do "Aplicar"): ciclo 73;
    - [x] "Instalar opção" no cyberware: o seletor da fundação na ficha da opção, ciclo 84. "Usar" a droga na ficha dela: ciclo 78.
      A correção rápida e o tratamento na ficha da lesão: ciclo 77. O "Largar" do equipamento não entra (a decisão do
      usuário de 2026-10-16: o botão do uso e o ✕ já cobrem).
- [x] **Extrato de Eurodólares, IP e Reputação** (Ciclo 21), como o ledger do CORE no Foundry 12: o botão de cada um no
  cabeçalho abre a janela com o menu (somar, subtrair, definir, com o motivo) e o histórico (quem mudou, a mudança
  direta); o mestre tira linhas, desfazendo ou não a mudança; a importação, a migração e a loja da wiki escrevem as
  linhas delas.
- [ ] **Na migração, o histórico do ledger do Foundry 12:** (→ C27) a ficha "Na mesa" só manda o saldo, e o extrato começa com
  ele. Trazer o histórico exige que o módulo da mesa (cpr-2077) mande as `transactions`, o que mexe no Foundry 12 da
  campanha (decisão do usuário).
- [x] **Do Fluxo de Combate** (pedido do usuário, 2026-10-12: "trabalhe melhor no fluxo de combate", com o módulo
  `foundry-fluxo-de-combate/` de exemplo):
  - [x] a janela de reação do alvo no visual do sistema, como a "Ataque!" do Fluxo: quem ataca e quem é atacado, a
    arma e a distância, cada escolha com a conta (a esquiva média, a DV, os PV do escudo) e a barra do tempo; fechada
    no X ou sem resposta no tempo, vale a escolha padrão, rolada direto (Ciclo 28);
  - [x] um ataque por vez no mestre (a fila), como o Fluxo (Ciclo 29);
  - [x] as configurações do Fluxo que faltavam: quem vê o cartão do resultado e esconder ou não o total do ataque até a
    defesa (Ciclo 29);
  - [x] texto e animação no token: o texto para quem vê o cartão; a animação com o Sequencer e o JB2A, e o som do
    Diwako, quando estão ativos (Ciclo 29);
  - [x] o Reflex Tuner (wiki: depois de ser atingido, +1 para se esquivar pelo resto da rodada) (Ciclo 30).
- [ ] **Do Fluxo de Combate, as chaves que faltam** (→ C26) (opções; o comportamento padrão delas já é o do sistema):
  "Resolver os ataques" (liga e desliga a automação), "O jogador rola os próprios dados" (desligada, o mestre rola a
  defesa e o Death Save; o dano já tem "Quem atacou rola o dano") e "Dano: manual".
- [ ] **Acessórios:** (→ C11) o limite de slots (hoje a ficha só mostra "5 de 3"); os plugs que o Smartgun Link exige; a arma sob o cano (lança-granadas e espingarda) como
  segunda arma; o pente que fica acima do máximo quando o carregador sai.
- [x] **Veículos no combate:** (C15, ciclo 117) o dano no SDP, as armas instaladas (metralhadora, lança-chamas), o vidro blindado como
  cobertura, e a regra de que só um veículo da família fica com o Nomad por vez.
- [x] **Armas de 2077, os modos de cada classe** (bloqueador da migração, Ciclo 17; pelo suplemento de fã, e o Kit
  está no P0): o Ricochete da Power (DV da tabela
  de autofogo, um dado a menos, +2 do Ballistic Coprocessor); a Carga e a Rajada Tech (a janela pergunta a cobertura, o
  que atravessa, a ablação 4 ou 2, as balas da rajada de cada arma, a arma que esfria uma rodada); o teste Smart (10 ou
  12 + 1d10, só com o Smart Link), com as três configurações do cpr-2077 (os mesmos padrões).
- [x] **Armas de 2077, as regras de cada modelo que o texto deixa claras** (Ciclo 18): os dois canos da Palica (teste
  Smart 12 + 1d10) e da Testera (4d6), com 2 cartuchos; os dois alvos da Kappa; a coronha recolhida da Dian (−1, pelo
  botão da ficha); as 7 balas do autofogo da Lexington. As que só disparam cartucho não mostram o Ricochete.
- [ ] **Cyberware que é arma** (→ C11) (Wolvers, Mantis Blade, Gorilla Arm, o lança-granadas embutido): hoje é só cyberware e
  não ataca.
- [x] **Efeitos das munições especiais:** (C14, ciclo 111) os testes de resistência da biotoxina, do veneno, da sonífera, do flashbang e
  do gás; o fogo da incendiária; a segunda lesão da expansiva; a munição inteligente; o EMP, que desliga os itens
  eletrônicos (o CORE marca cada item e tem a macro "Get EMP'd").

## P3: Netrunning, cyberware, NPCs e ferramentas do mestre

- [x] **NET:** (→ C5 a C8, feitos nos ciclos 40 a 56, 85 e 89 a 91) o NET Architect dentro do sistema (Interface, programas, Black ICE, dano no cérebro).
- [ ] **Cyberware:** (→ C21) base e slots ao instalar (com as opções na base, como a montagem da wiki: ciclos 82 a 84), terapia e ciberpsicose.
- [ ] **NET de 2077:** (→ C9) a RAM e o Cooling do deck, os quickhacks e os daemons.
- [x] **NPCs:** (→ C2 e C7, feitos nos ciclos 36 e 37 e 43 a 46) ficha de capanga (mook), Black ICE e demônios como atores.
- [ ] **Ferramentas do mestre:** (→ C24 e C25) o Painel Tático dentro do sistema (feito no ciclo 125); o contêiner do CORE (loja, saque e esconderijo, com
  o registro das trocas).
- [ ] **Conteúdo fora do livro básico:** (conteúdo: fora do plano de paridade) o Black Chrome e os DLCs do CORE 0.92.4, as tabelas de arquitetura da NET e as
  macros e cenas do CORE. A loja da wiki não vende esses itens; se o mestre deu algum no Foundry 12, a migração avisa
  item a item. Converter o que a mesa usar.

## P4: refatoração, desempenho, acessibilidade e documentação

- [ ] Dividir o `combate.mjs` (pedidos pelo socket, modos, cartão).
- [ ] Tradução para inglês (hoje, o arquivo `en` aponta para o português).
- [ ] Acessibilidade das fichas: teclado e leitor de tela (desde o ciclo 19, a ficha é sempre escura).
- [ ] Ícones próprios no lugar dos genéricos do Foundry.
- [ ] Conveniências do CORE: (→ C26) a régua que mostra o DV da arma pela distância e o DV no HUD do token (o ataque já calcula
  o DV sozinho); "Hardened" (Danger Gal Dossier p. 150, fora da wiki: só se a mesa quiser).

## Fora do plano: o que só existe no CORE 0.93

A pasta `fvtt-cyberpunk-red-core-dev/` é a 0.93, de desenvolvimento; a mesa usa a 0.92.4. Pelo CHANGELOG, isto entrou
depois e a mesa não tem: o navegador de documentos com o carrinho de compras (a loja da wiki faz esse papel), os
modificadores `red` e `dmg` nas fórmulas, o crítico configurável por arma e munição (aqui a munição já diz o que não
causa lesão), a Sorte caseira do JonJon, os marcadores de turno e o tema estendido ao Foundry. Entram só se o usuário
pedir.

## Decisões tomadas

- **2026-10-18, dano no SDP (C15):** o usuário confirmou dano menos SP, ablação normal da munição quando atravessa,
  Chassis blindado SP13 e ausência de bônus ou lesão crítica no SDP. O vidro segue a cobertura da wiki.

- **2026-10-17, mãos livres (C12):** o usuário confirmou seguir a wiki para BODY 8+ empunhar arma branca de duas
  mãos com uma e para o escudo ocupar uma mão; a conta básica segue o CORE 0.92.4.

- **2026-10-11, migração da campanha:** pela ficha "Na mesa" que o Foundry 12 manda para a wiki ("Importar da
  mesa"), e não pela conversão dos atores do Foundry 12. Decisão do usuário.

- **2026-10-12, TeleOptics:** a regra da wiki, e não a do CORE: o do RED dá +1 no tiro mirado contra alvo a 51 m ou mais;
  o de 2077, +1 no tiro único ou no mirado, a 51 m ou mais. O CORE (a mesa do Foundry 12) dava +1 no mirado e no tiro
  único, sempre. Decisão do usuário (Ciclo 26).

- **2026-10-11, arma branca contra SP ímpar:** vale SP efetivo 6 para SP 11, como o CORE e o Fluxo de Combate (o que a
  mesa usa hoje). A wiki diz "ignoram metade do SP (arredondado p/ cima)", e o texto também cabe na leitura 5.
  Decisão do usuário.
