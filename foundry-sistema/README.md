# Cyberpunk RED — Fieldbook (sistema do Foundry VTT 14)

Sistema próprio de Cyberpunk RED para o **Foundry VTT 14**, feito em volta da wiki da mesa. Não depende do sistema **Cyberpunk RED - CORE**: as regras, a ficha e o combate são daqui, e os módulos da mesa vão virar parte dele.

**Esta é a versão 0.2.0, um protótipo.** O combate do Fluxo de Combate já está dentro do sistema. A campanha continua no Foundry 12 com o CORE 0.92.4 até este sistema estar provado na mesa.

## O que já faz

- **Ficha do personagem**, no visual do modelo de ficha da mesa (Cyberpunk 2077: amarelo, ciano e vermelho sobre o escuro, com as fontes Rajdhani e Share Tech Mono embutidas). A ficha é sempre escura, qualquer que seja o tema do Foundry. Tem estas partes:
  - **Cabeçalho:** o retrato, a Role e o Rank (com a lista das 10 Roles do RED da wiki), o nome, o apelido e os indicadores de HP, Sorte (com os botões da Sorte, abaixo, e a Sorte usada na sessão: o máximo menos a que resta, amarela quando já se gastou alguma; ciclo 66), Eurodólares, IP e Reputação (cada um abre o extrato dele, abaixo).
  - **Perícias:** o painel geral, em três colunas.
    - **Esquerda:** os atributos (clique para rolar) e os vitais (as barras de HP e Humanidade, a EMP de agora, o limite de gravemente ferido, o Death Save e o estado).
    - **Centro:** as perícias com nível, das mais altas para as mais baixas, ou todas, no grupo de cada uma. Na lista completa, dá para acrescentar uma perícia de família (uma Linguagem, um Especialista Local...) e tirá-la.
    - **Direita:** a armadura (o SP de cada local), as armas equipadas com o botão Atacar, o cyberware instalado e as lesões críticas, com o paliativo e o tratamento.
  - **As abas no jeito das maquetes do usuário** (ciclo 60, Combate, Equipamento e Cyberware; ciclo 61, Role, NET e Vida): à esquerda, a coluna dos números (os painéis de resumo, com o número principal em grande); à direita, as listas e as tabelas. Estreita (menos de 700 px), tudo numa coluna. A Role mostra a Role em grande à esquerda (o Rank, os pontos distribuídos, o resumo e os botões da habilidade, e as notas da Role em texto livre, ciclo 68) e, à direita, as especialidades com os pontos também em caixas; a NET, a Interface em grande (com a conexão: "Conectar" leva o token do ator ao ponto de acesso mais perto da cena, com as conferências do clique no marcador; conectado, o nome do ponto, "Abrir a NET" e "Desconectar", a desconexão segura; ciclo 69; e, conectado, a arquitetura ao vivo, com os andares como o netrunner os conhece, "?" nos que ainda não viu, e o estado de cada um, hostil, trancado, liberado ou livre, que a ficha acompanha sem reabrir; ciclo 76; e os slots do deck equipado em caixas, ciclo 72) e os cyberdecks à esquerda e, à direita, as habilidades em cartões e os programas (cada um com o estado: guardado, fora do deck; carregado, no deck; ativo, rezzado; ciclo 72); a Vida, o Lifepath em cinco painéis (as origens, os valores, a família, as metas e as pessoas, e o Lifepath da Role) e as notas.
  - **Combate:** à esquerda, a Iniciativa em grande (com "Rolar iniciativa", ciclo 65: entra no combate, que o mestre cria se não houver, e rola na fila pela iniciativa do sistema; quem já rolou naquele combate não rola de novo), os vitais (o HP com a barra, o limite de gravemente ferido, a penalidade, o Death Save, o MOVE e o estado) e a defesa (a esquiva, o Facedown e "Proteger-se", ciclo 79: marca o token "Em cobertura", e o cartão do tiro contra ele avisa o mestre, que decide se a cobertura para a bala; de novo, tira a marca; e "Agarrar" e "Soltar", ciclo 80: o agarrão, abaixo); à direita, as armas com todos os modos de ataque, a armadura vestida, as lesões críticas (com o paliativo, o tratamento e "Tratada") e a munição.
  - **Equipamento:** à esquerda, os Eurodólares em grande, com o extrato e as últimas mudanças, e a munição; à direita, armas, armaduras, equipamento, roupas, drogas, upgrades e veículos.
  - **Cyberware:** à esquerda, a Humanidade em grande, com a barra e o EMP de agora e o de base, e as notas de ciberpsicose (os episódios, em texto livre; ciclo 68); à direita, cada peça, com instalar e tirar, em árvore (ciclo 82): cada fundação com os slots usados e os dela ("1 / 5 slots") e as opções logo abaixo (└); a opção instalada sem a fundação que pede fica marcada "SEM FUNDAÇÃO". Na fundação instalada, "+ OPÇÃO" (ciclo 84) lista as opções do personagem que cabem nela (do mesmo tipo, com o slot livre) e instala a escolhida nela (Shift: a perda de Humanidade pela média); o "+ Fundação" da maquete é o "Instalar" de cada fundação.
  - **Role:** a Role da wiki (as 10 do RED, desde o Mission Kit), com a habilidade e o resumo, e o que ela soma nas perícias: o Moto do Nomad (o Rank nas seis perícias de veículo). A ficha antiga com Face ou Corpo, as Roles do suplemento de fã que saíram, lê a do RED de onde vinham (Rockerboy e Exec), como a wiki. Os botões da habilidade de Role rolam pela janela de rolagem (Ctrl + clique, direto): o Impacto Carismático do Rockerboy e a Credibilidade da Media (Rank + 1d10), a pechincha do Fixer (COOL + Negociação + Operator + 1d10) e o Backup do Lawman (1d10 até o Rank; vindo, o d6 diz em quantas rodadas chega). As quatro Expertises do Tech perguntam antes a perícia de TECH do teste (TECH + a perícia + os pontos da Expertise + 1d10). O Medtech rola a Cirurgia e a Tecnologia Médica (TECH + a perícia + 1d10), as perícias que só ele tem: o nível vem das especialidades (2 por ponto de Cirurgia, até 10; Farmacêutica + Criossistemas), e o painel de Medicina mostra a conta. Para o Solo, o Tech e o Medtech, as especialidades com os nomes em português, os pontos de cada uma (editáveis) e, no Solo, o efeito de agora. A ficha confere os pontos com o Rank: o total (o Tech ganha 2 por Rank; o Solo e o Medtech, 1) e o máximo em cada especialidade (o Rank). Ela avisa o que passou e o que sobra, sem travar.
  - **NET:** a Interface do Netrunner (o Rank da Role), pelo cyberdeck equipado, como o CORE e o Mission Kit: as 10
    habilidades (Scanner, Breach, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus, Zap e Quickhack; o Breach é o
    Backdoor do RED com o nome do Kit, e o Scanner é 1 Ação NET, ciclo 94), a Defesa e a Velocidade, cada uma com o
    valor sem o dado, o custo e o que faz; o dano do Zap (1d6); e as Ações NET por turno pelo Rank (2, 3, 4 ou 5). Os
    cyberdecks e os programas, com o botão Ativo (rezzado) dos que estão num deck: os boosters ativos (Eraser, See Ya,
    Speedy Gonzalvez e Worm) somam +2 na habilidade deles. No combate na NET, os programas de ataque num deck atacam
    (Interface + ATK + 1d10, pela janela) e rolam o dano contra o que atingem, sem crítico: o anti-programa em programa
    ou em Black ICE, o anti-pessoal no cérebro. Os que têm REZ (boosters e defensores) perdem 1 de REZ e voltam ao
    máximo pelos botões, e em 0 desativam. O cartão do dano (o do programa e o do Zap) tem os botões do mestre: no
    cérebro dos alvos marcados (T), direto no HP e sem a armadura (o Shield ativo anula o primeiro dano de programa e se
    desativa; o Armor ativo reduz 4), ou num programa ativo do alvo (perde a REZ, e em 0 desativa). O dano "em Black ICE"
    e o Zap entram também na REZ do Black ICE ou do demônio marcado. Os programas de Black ICE do netrunner (o Black ICE
    próprio: os 12 da wiki, no compêndio de Netrunning) mostram o tipo, PER, SPD, ATK e DEF, e ocupam 2 slots no deck.
  - **Vida:** o Lifepath (os 17 campos do criador da wiki, que a importação traz) e as notas.
- **Ficha do item:** o mesmo tema escuro, com as mesmas fontes e cores, no jeito da maquete "Item Sheets" do usuário (ciclo 62). No alto, o tipo na cor dele (vermelho na arma e na lesão; ciano no cyberware, no programa e no cyberdeck; amarelo no resto), o nome, o resumo (a perícia e o alcance da arma, o SP da armadura, a classe do programa e onde ele está...) e as etiquetas (a qualidade, o uso; cheias, as que valem agora: equipado, vestido, instalado, ativo). Embaixo, as abas Detalhes (os campos em células: o rótulo pequeno em cima e o valor grande embaixo; o uso de equipamento, roupa, droga e cyberdeck em três botões lado a lado; no programa, a REZ atual, "Rodar" (num deck: liga e desliga, como o "Ativo" da aba NET) e "Restaurar REZ", ciclo 75; na arma de um personagem, "Atacar" e "Recarregar", ciclo 74, pelo fluxo da ficha dele; na armadura, o SP de cada local em caixas, com o "−1" (sem passar de 0), ciclo 74, e "Consertar", ciclo 70: o SP de cada local volta ao máximo, e o cartão "CONSERTO" diz no chat quem consertou, para o mestre narrar; inteira, só avisa), Descrição e Efeitos (com o botão de ligar e desligar dos efeitos à mão). A ficha da arquitetura da NET continua a dela.
- **Arquitetura da NET** (o netarch do CORE, com o que o NET Architect da mesa junta): um item com os andares, um conteúdo
  por linha (o andar, de 1 a 18, e o ramo, de A a H; a senha, o arquivo e o nó de controle com o DV; o Black ICE e o
  demônio pelo modelo da wiki; o netrunner inimigo pela ficha), o DV da arquitetura (o maior dos andares, ou o do item)
  e o mapa na ficha: o ramo novo sai do andar de cima do ramo à esquerda. O mapa é também o editor visual (ciclo 90,
  como o do NET Architect da mesa): arrastar um andar leva todas as linhas dele para outra célula (em cima de outro
  andar, os dois trocam), e o "+" de uma célula vazia cria ali uma senha DV 6. O botão **Gerar pelas tabelas** troca os
  andares pelos das tabelas do livro, como o CORE: 3d6 andares, um ramo a mais a cada 7+ no 1d10, os 2 primeiros
  andares pelo lobby e
  os outros pela tabela da dificuldade escolhida (básica, padrão, incomum, avançada), sem repetir um resultado (menos
  arquivo e nó de controle); cada Black ICE de um resultado vira uma linha. O compêndio **Arquiteturas da NET** (escondido
  dos jogadores) traz as 4 da campanha, do documento da wiki (`documentos/morana/arquiteturas-da-campanha.md`: mudar um
  andar lá muda o compêndio no próximo build), e os 3 exemplos do NET Architect.
- **Ponto de acesso à NET** (o NET Architect da mesa, dentro do sistema): qualquer Tile vira um, pelo botão no HUD do
  Tile (só o mestre). A configuração escolhe a arquitetura (as do mundo e as dos compêndios), o alcance (6 m, o do RED),
  o DV, os requisitos (o cyberdeck equipado, a Interface mínima), se o ponto é oculto e se as defesas reiniciam sem
  ninguém conectado; o Tile sem imagem ganha a de terminal (o Foundry não mostra aos jogadores um Tile sem imagem). No
  mapa, o marcador "NET" fica sobre o Tile (o oculto, só para o mestre). O jogador seleciona o token e clica no
  marcador: perto o bastante (o Range Upgrade no deck soma 2 m), sem parede no meio (ciclo 91: a linha do centro do
  token ao centro do Tile não cruza parede que barra o movimento; a porta aberta passa) e com os requisitos, conecta, e
  o mestre ativo confere tudo de novo. O token conectado ganha o status "Conectado à NET" e um anel ciano. A **janela
  da NET** mostra quem está na NET e onde, o mapa que os jogadores enxergam (o andar 1 como "?") e o registro, com o
  botão **Desconectar**. Sair do alcance derruba da NET (a desconexão insegura); apagar o token ou o Tile também tira o
  netrunner. Fora da NET, o
  botão **Scanner** do HUD do token (ciclo 91, como o NET Architect da mesa) acha os pontos de acesso da cena até o
  resultado × 10 m; o oculto, só com o resultado acima do DV do Scanner dele, e aí ele aparece para quem achou. O chat
  conta só ao mestre e ao jogador.
- **O Neuroport** (a NET de 2077, do Mission Kit; ciclo 95): na aba NET, o netrunner faz o **Jack In** no alvo marcado
  (T) que tem Neuroport, à vista e a até 6 m (8 m com o Range Upgrade): Interface + 1d10 contra a WILL + 1d10 do alvo,
  que resiste pela janela de reação do dono (pelo NPC, o mestre rola). Falhando, entra assim mesmo, e o alvo percebe.
  A aba lista as ligações, com o **Jack Out** de cada uma, e a ficha do alvo mostra quem ele percebeu (o mestre vê
  todos). O cartão vai ao mestre e aos donos do netrunner, e aos do alvo quando ele percebe. No alvo com Self-ICE (ciclo
  96), cada ligação mostra os Passwalls (um por Self-ICE, até 3; a DV de todos é 6, 8 ou 10) e o **Breach** (a
  habilidade Breach + 1d10 contra a DV), que passa um por vez. Os quickhacks e a expulsão são as próximas partes do C9.
- **O visual da janela da NET** (ciclo 58, no jeito de um terminal de netrunner):
  - no topo, a conexão, a arquitetura e o netrunner: a Interface, a Sorte preparada, as Ações NET (um losango por ação,
    aceso enquanto sobra; fora de combate, só o contorno) e a desconexão insegura; os avisos (o fogo, o Kraken, o Skunk,
    o Wisp) logo abaixo, lado a lado;
  - no meio, o mapa num fundo quadriculado: cada andar na cor do que manda nele (vermelho, o inimigo ativo, pulsando;
    amarelo, a senha; verde, o nó de controle; roxo, o arquivo; ciano, livre; cinza, limpo ou sem sinal), a barra de
    REZ dos inimigos, a etiqueta de quem está no andar e um cabo até o andar de onde se chega (reto, ou em degrau quando
    vem de um ramo à esquerda), com os dados correndo. Para o mestre, o que os jogadores não viram fica apagado, com
    "OCULTO";
  - ao lado, quem está na NET, o painel do mestre, o andar escolhido (cada conteúdo com o ícone, a situação e a barra de
    REZ) e o deck;
  - embaixo, as habilidades de Interface com a base da rolagem (o que a rolagem soma ao 1d10: a Interface, os programas
    ativos, as penalidades e os situacionais ligados na ficha; no Slide, o Skunk; o Zap e o Slide em vermelho) e o
    registro, com a hora de cada linha (as do Black ICE em rosa, as que passam em verde, as que falham em vermelho);
  - a janela abre em 1060 × 780 e o mapa, o painel e o registro rolam por dentro; estreita (menos de 860 px), fica tudo
    numa coluna. Com "reduzir movimento" no sistema, nada se anima.
- **Na NET** (o motor do NET Architect, no mestre ativo): o jogador anda pelo mapa da janela (clica no andar e em "Ir
  para cá"; andar não é Ação NET, e a senha trava a descida) e usa as habilidades de Interface contra os andares: o
  Pathfinder revela o mapa até a obstrução com DV maior, o Breach quebra a senha, o Eye-Dee identifica o arquivo (e,
  ciclo 89, o copia para um diário na pasta "Arquivos da NET", que o dono do netrunner abre pela janela, com o aviso
  no chat), o Control toma o nó de controle (e manda os comandos, que o mestre narra; e, ciclo 85, comanda o que o
  mestre ligou a ele na configuração do ponto: as portas, que abrem, fecham e trancam, as luzes e os sons, que ligam e
  desligam, e os tokens, que o jogador assume até desconectar, 1 Ação NET por comando, como o NET Architect da mesa),
  o Cloak esconde os rastros e o Virus, no andar mais fundo, tem a DV e as Ações NET que o mestre põe. Passa quem tira
  mais que a DV. Em combate, as Ações NET contam (as do Rank por turno, de volta no turno do netrunner); a desconexão
  insegura sai sem gastar. Por enquanto
  quem rola é o mestre, com a Sorte preparada na ficha. O mestre vê a arquitetura inteira, age pelo netrunner
  escolhido, revela andares e zera as Ações NET. O Black ICE e o demônio do andar seguram a descida até caírem (o Black
  ICE também pelo Slide, uma vez por turno em combate, contra a PER + 1d10 dele); o Zap tira 1d6 da REZ deles (contra a
  DEF + 1d10 do Black ICE ou a Interface + 1d10 do demônio, que o mestre rola no nome deles), e o mestre ajusta a REZ
  pelo painel dele. Ao chegar ao andar, o Black ICE disputa a velocidade e, vencendo, age na hora; o mestre faz os
  inimigos atacarem pelo painel dele (o Black ICE com o ATK + 1d10; o demônio e o netrunner inimigo, com o Zap). Cada
  Black ICE faz o efeito da tabela da wiki na ficha: o dano no cérebro (o Armor reduz), nos programas (o destruído fica
  com "(destruído)" no nome, fora do deck), o fogo do Hellhound (2 no HP no fim do turno, até "Apagar o fogo"), o Liche
  e o Scorpion (1 hora), o Kraken, o Wisp, o Skunk e o Giant; o Insulated Wiring e a KRASH Barrier no deck valem. A
  desconexão insegura traz o efeito do Black ICE do andar. No deck da janela, o netrunner ativa e desativa os programas
  (1 Ação NET; em combate, cada um uma vez por rodada; com a REZ em 0, não ativa) e ataca com o programa de ataque ativo
  (1 Ação NET: Interface + ATK + 1d10 contra a defesa do alvo; o anti-programa no Black ICE e no demônio, o anti-pessoal
  no netrunner inimigo), que desativa depois de usado. Os inimigos encontrados entram na iniciativa da cena (sem
  combate, num novo, sem começar), com um token escondido no ponto de acesso (o Black ICE e o demônio no topo); a REZ do
  token e a da NET andam juntas (em 0, o inimigo fica derrotado), e na vez de cada um o mestre escolhe numa janela quem
  ele ataca, ou pula. Eles saem do combate quando a arquitetura reinicia. As rolagens do netrunner (as habilidades, o
  ataque dos programas, a velocidade e a defesa) abrem a janela de rolagem no computador do jogador, com os
  modificadores e a Sorte; cancelar a janela desfaz a ação, e sem resposta no prazo o mestre rola.
- **Ficha do capanga** (o mook do CORE), para os NPCs descartáveis. O tipo de ator "Capanga" tem os dados do personagem
  (as regras e o combate são os mesmos), numa página só:
  - **Cabeçalho:** o retrato, o nome, o HP, a SP, a iniciativa e a esquiva, e se a ficha é a do ator (o modelo dos
    tokens) ou a de um token na cena;
  - **Corpo:** o painel geral da ficha do personagem (sem as armas), a tabela de armas com os ataques, o agarrão (os botões do
    ciclo 81), os itens (equipar, vestir, instalar e o uso de cada um) e as notas;
  - **O token** nasce solto, com o HP na barra: cada capanga na cena tem o próprio HP, a própria munição e o próprio Death
    Save. O nome mudado na ficha de um token vai para o token na cena;
  - **Arrastar um item** para a ficha tenta equipar a arma e o escudo (sem mãos, ficam guardados), veste a armadura e a
    roupa, equipa o cyberdeck, a droga e o equipamento, e
    instala o cyberware rolando a perda de Humanidade (com Shift, a média), como o CORE;
  - **A ficha limitada:** o jogador só com a permissão Limitada vê a imagem, o nome e as notas, como no CORE. Com a de
    Observador, vê a ficha inteira, sem editar.
- **Ficha do Black ICE e do demônio** (o blackIce e o demon do CORE), os atores da NET, numa página só, no visual da ficha
  do personagem:
  - **Black ICE:** a REZ, PER, SPD, ATK e DEF (clique para rolar o número + 1d10, pela janela do modificador do mestre;
    Ctrl + clique, direto), a classe, o dano, o custo e o efeito. **Demônio:** a REZ, as Ações NET, a Interface e o Valor
    de combate (os dois últimos rolam);
  - **o modelo da wiki:** a lista do cabeçalho preenche o nome e os números pela tabela da wiki (os 12 Black ICE e os 3
    demônios do RED);
  - **o token** nasce solto, com a REZ na barra: cada um na cena tem a própria REZ. O nome mudado na ficha de um token vai
    para o token;
  - **a iniciativa:** não rolam; entram no topo da fila, com 1 a mais que a maior dos outros (30, sem ninguém), cada um
    acima de quem já está nela. A arma não os atinge: com só eles marcados, o ataque avisa e não rola.
  - **o dano:** o botão da ficha do Black ICE rola o dano do efeito (sem crítico), com os botões do mestre no cartão: o
    anti-pessoal no cérebro dos alvos marcados (o Shield não para Black ICE; o Armor reduz 4), o anti-programa num
    programa ativo deles (desativado, o cartão avisa que é destruído, e o mestre apaga). O demônio tem o botão do Zap
    (1d6), no cérebro do intruso ou num programa dele. Na REZ do Black ICE ou do demônio marcado entram o dano "em Black
    ICE" dos programas anti-programa e o Zap do netrunner; em 0, ele é desativado.
  - **o Black ICE próprio do netrunner:** ativar um programa de Black ICE (do compêndio de Netrunning) num deck faz o mestre
    ativo pôr o token dele ao lado do token do netrunner, solto, com os números e a REZ do programa (o ator fica na pasta
    "Black ICE rezzado"). A REZ que o token perde volta para o programa, e em 0 o programa desativa e o token sai.
    Desativar, tirar do deck ou apagar o programa tira o token. Sem mestre na mesa, o token não entra.
- **Cartões do chat** (testes, ataques, dano, Death Save, lesão, Backup, a NET) no visual da maquete do usuário (ciclo 59): a mensagem inteira é o cartão, com o canto cortado e a faixa de cima na cor do tipo (amarelo no teste; vermelho no ataque, no dano, na lesão e na morte; ciano na NET, no Backup e no Death Save que passa). Na linha de cima, o tipo e quem rolou ("TESTE // ATIRADORA"), com a hora. Embaixo, o título grande, o que soma ao d10 ("1D10 · REF +8 · ARMAS DE UMA MÃO +4"), os dados em caixas com o total grande (o 10 do crítico em amarelo; o 1 da falha e o d10 que ele tira, em vermelho; no dano crítico, os 6 em amarelo; o × do autofogo), o crítico numa etiqueta, a regra e os botões. No resultado do ataque, o total do ataque grande, cada alvo com a etiqueta do que aconteceu (acertou, esquivou, errou) e a barra de HP depois do dano; o ataque desfeito fica desbotado, com "DESFEITO". As mensagens que não são do sistema não mudam.
- **Extrato de Eurodólares, IP e Reputação**, como o ledger do CORE no Foundry 12. O botão de cada um no cabeçalho da ficha abre a janela dele:
  - **o menu:** a quantia e o motivo, com Somar, Subtrair e Definir. Como no CORE, Subtrair sempre tira (um valor negativo também), e perder mais do que tem deixa o saldo negativo, com um aviso;
  - **o histórico,** do mais novo para o mais antigo: a data, a mudança, o saldo depois, o motivo e quem mudou. Uma mudança feita por fora (uma macro, outro módulo) entra como "mudança direta";
  - **o mestre** tira uma linha e escolhe, como no CORE, se a mudança também é desfeita;
  - **as linhas que entram sozinhas:** o dinheiro inicial da importação da wiki, os valores migrados do Foundry 12 e as compras da loja da wiki ("Compra na wiki: …", o texto do módulo da mesa).

  Por macro: `ator.mudarComExtrato('dinheiro', { acao: 'somar', valor: 100, motivo: 'Pagamento do fixer' })` (`'subtrair'`, `'definir'`; os campos são `dinheiro`, `pontosDeMelhoria` e `reputacao`) e `game.system.api.abrirExtrato(ator, campo)`.
- **Rolagens nativas do Foundry 14**, com o crítico do d10 como o modificador `crit` (`1d10crit + 12`):
  - um 10 natural soma mais um d10;
  - um 1 natural tira um d10;
  - uma vez só.

  Funcionam no chat, em macros e no Dice So Nice.
- **Janela de rolagem** (como a do CORE): o clique no atributo ou na perícia abre a janela antes do teste. Ela mostra as partes fixas e o total sem o dado, que acompanha o que se marca, e oferece:
  - os **situacionais**, que não somam sozinhos: os do cyberware, do equipamento e das lesões (Amplified Hearing e Image Enhance na Percepção pela audição ou pela visão, o Olho danificado, os Dedos esmagados em todas as ações com as mãos, o Agent em Guarda-roupa e Estilo...), ligados ou não como no CORE;
  - os **modificadores comuns** do livro (RED p. 130, a tabela da wiki: pouca luz −1, tarefa complexa −2, exausto −4, tempo extra +1...);
  - o **modificador do mestre** e a **Sorte** (vem com a preparada na ficha).

  **Ctrl + clique** rola direto, com a Sorte preparada e os situacionais ligados por padrão; a configuração "Rolar direto" (deste navegador) inverte. Os botões de ataque da ficha também abrem a janela, antes de gastar a bala (cancelar não gasta nem rola); na iniciativa, ela abre para quem tem um situacional de iniciativa (o Sandevistan, +3 já marcado). No computador do jogador, o que o mestre pede também abre a janela: a esquiva e a Concentração (a janela completa), o dano que ele rola e o Death Save do começo do turno (estes, só com o que vai ser rolado e o modificador do mestre: a Sorte é só dos testes); quando o prazo do pedido acaba, a janela fecha e o mestre segue. Na ficha, o botão do dano e o do Death Save abrem a mesma janela. Pelos NPCs, o mestre rola direto.
- **Testes:** atributo (STAT + 1d10) ou perícia (STAT + perícia + 1d10). Entram:
  - o bônus dos efeitos;
  - a penalidade de ferimento (−2 gravemente; −4 mortalmente, que também tira 6 de MOVE, com mínimo 1);
  - as lesões (−2 em todas as ações da Concussão, por exemplo);
  - a armadura pesada, que tira de REF, DEX e MOVE;
  - o bônus da Role na perícia (o Moto do Nomad), que aparece no cartão como uma parte ("Moto +4");
  - a **Sorte** preparada na ficha (RED p. 130: antes de rolar, +1 por ponto). Os botões − e + no indicador da Sorte escolhem quantos pontos vão no próximo teste (atributo, perícia, ataque ou defesa), e eles saem da Sorte quando ele rola. O ↺ é o começo da sessão: a Sorte volta ao máximo (a LUCK).
- **Ataque, defesa e dano** (o Fluxo de Combate dentro do sistema). Marque os alvos (T) e use os botões da arma:
  - **Atacar:** tiro, ou corpo a corpo com arma branca.
  - **Mirar:** −8, na cabeça (o dano que passa dobra), na perna (se passar dano, Perna quebrada) ou no item na mão (o alvo larga).
  - **Luneta de precisão** na arma: +1 em tiro único ou mirado contra alvo a 51 m ou mais, se o cyberware óptico já não dá o bônus (wiki). Ela entra sozinha quando vale, e a janela de rolagem a traz marcada ou não.
  - **TeleOptics** (pela wiki): o do RED, +1 no tiro mirado contra alvo a 51 m ou mais; o de 2077, +1 no tiro único ou no mirado, a 51 m ou mais (dois não somam). Como a luneta, entra sozinho quando vale, e a luneta não acumula com ele.
  - **Autofogo:** a perícia Autofogo contra a tabela de autofogo. O dano é 2d6 × quanto passou, até o máximo da arma. Gasta 10 balas.
  - **Supressivo:** sem alvo marcado, pega todos a até 25 m e à vista. Cada um rola WILL + Concentração contra o ataque, e quem perde fica **Suprimido** até o fim do próximo turno dele. Gasta 10 balas.
  - **Espingarda com cartucho** (pela munição): um ataque contra DV 13. Se acertar, cada alvo a até 6 m leva 3d6, rolados uma vez.
  - **Explosivo** (lança-granadas, foguete ou granada no pente): o ataque contra a DV do alcance do alvo. Se acertar, todos na área de 10 × 10 m levam o mesmo dano, menos quem esquivar passando do ataque.
- **A defesa, como no Fluxo de Combate:**
  - o total do ataque fica só com o mestre e quem atacou até a defesa; depois aparece para todos (com "Esconder o total do ataque" desligado, todos o veem desde o começo, também na janela de reação);
  - quem controla cada alvo recebe a janela de reação no computador dele ("Você está sendo atacado!", como a "Ataque!" do Fluxo): quem ataca e quem é atacado, a arma e a distância, e cada escolha (Esquivar, Aguentar, Escudo) com a conta (a esquiva e a média dela, a DV do alcance, os PV do escudo), sem o total do ataque. Ele escolhe e rola a própria Evasão;
  - de tiro, só esquiva quem tem REF 8+; no corpo a corpo, todos; sem perna, ninguém; empate é do defensor;
  - o **Reflex Tuner** (2077): no combate, quem o tem e é atingido ganha +1 para se esquivar pelo resto da rodada (na conta da janela de reação e na esquiva); o "Desfazer" do ataque tira o +1;
  - pelos NPCs, o mestre escolhe na mesma janela, vendo o total (fechada sem escolher, o sistema escolhe), ou o sistema decide pela esquiva média;
  - um ataque por vez: o mestre resolve um ataque inteiro (a defesa, o dano e o cartão) antes de começar o próximo, como o Fluxo. O "Desfazer" não espera a fila;
  - passados 8 s sem resposta, o mestre ganha um cartão para responder pelo jogador. A barra da janela mostra o tempo que resta; quando ele acaba, ou quando o jogador fecha a janela no X, vale a escolha padrão (aguentar; a Concentração no fogo supressivo; no corpo a corpo, a esquiva), rolada direto, e o cartão do resultado anota.
- **Dano na ficha**, com as regras do CORE:
  - **Quem rola:** quem atacou rola o dano no computador dele; se ele não responder, o mestre rola.
  - **SP:** vale a maior armadura equipada no local; arma branca ignora metade.
  - **Armadura segura:** se o dano não passa do SP, entra só o bônus do crítico.
  - **Cabeça:** o dano que passa conta ×2.
  - **Escudo:** recebe o ataque todo; só um explosivo passa de um escudo destruído.
  - **Ablação:** a armadura perde 1 de SP, ou a ablação da munição (a perfurante tira 2; a borracha, a biotoxina e a venenosa não tiram nada).
  - **Munição de borracha:** não mata (deixa o alvo com 1 HP), não tira SP e não causa lesão crítica.
  - **Munição que não causa dano** (biotoxina, veneno, EMP, flashbang, sonífera, fumaça e gás lacrimogêneo): o ataque e a área valem, mas ninguém leva o dano da arma. O cartão diz o efeito, com o texto da wiki, e o mestre resolve.
  - **O dano rolado à parte** (o botão "Dano" da ficha, ciclo 64): o cartão tem os botões do mestre. "Aplicar dano" aplica nos alvos marcados (T), no corpo (a cabeça só pelo tiro mirado), com as mesmas regras do ataque (a armadura, o +5 do crítico, a ablação, a Deflexão, a borracha), e o resultado sai no cartão do ataque, com o "Desfazer". No dano crítico, "Rolar a lesão" rola a tabela do corpo em cada alvo marcado, uma vez por alvo naquele cartão. O dano rolado dentro do ataque não tem esses botões (o ataque já aplica).
- **Lesão Crítica** (dois 6 no dano):
  - **Tabelas:** 2d6 na tabela do corpo, ou na da cabeça no tiro mirado na cabeça, sem repetir uma que o alvo já tem.
  - **Na ficha:** a lesão entra com os efeitos (Perna quebrada: −4 MOVE, mínimo 1) e o texto da wiki, com o paliativo e o tratamento.
  - **Mortalmente ferido:** quem já está com HP abaixo de 1 ganha uma lesão a cada acerto.
  - **Correção rápida e tratamento** (ciclo 77; a wiki, p. 128 e 223), na aba Combate e na ficha da lesão: quem trata (o token selecionado de quem clica, o personagem dele ou, na correção, o próprio ferido) escolhe a perícia e rola TECH + a perícia + 1d10, que precisa superar a DV da lesão (Primeiros Socorros ou Paramédico; no tratamento, Paramédico ou a Cirurgia do Medtech). A correção rápida tira o efeito até o fim do dia (a lesão fica "CORRIGIDA", e o "Voltou" liga o efeito de novo; o sistema não tem relógio) e, na lesão sem tratamento, resolve de vez; o tratamento tira a lesão e não pode ser em si mesmo. O cartão "TRATAMENTO" diz quem tratou, o total e a DV.
- **Agarrar** (ciclo 80; a wiki, "Agarrar e arremessar", p. 177; o "Grapple" das maquetes), na aba Combate: com o alvo marcado (T), quem agarra rola DEX + Briga + 1d10 (a janela de rolagem; Ctrl + clique, direto), e o alvo resiste na janela de reação do dono ("Estão agarrando você!": só "Resistir", com a conta da Briga e sem o total, como a esquiva; o prazo e o "responder por ele" do mestre valem igual); pelo NPC, o mestre rola. Quem agarra precisa superar: o empate é do defensor (o teste resistido, p. 128). Vencendo, os dois ficam marcados ("Agarrando" e "Agarrado", no HUD do token), com −2 em todas as ações (a parte "Agarrão" de cada teste), e o cartão lembra que o agarrado não usa a Ação de Movimento e é arrastado, e que ninguém usa arma de duas mãos (o sistema não impede). A Defesa da aba Combate (e o painel "Agarrão" da ficha do capanga) mostra com quem e os botões de cada lado. Quem agarra: "Soltar" (tira as duas marcas), "Estrangular" (ciclo 81: o BODY dele direto no HP do outro, sem a armadura; se levaria abaixo de 0, o outro fica com 1 e desmaia, com a marca de inconsciente; na terceira rodada seguida do mesmo combate, desmaia; fora de combate, toda vez conta) e "Derrubar" (o BODY direto no HP; o outro fica caído, e o agarrão acaba). Quem é agarrado: "Escapar" (DEX + Briga + 1d10 contra o de quem agarra, que resiste na janela de reação do dono, "Estão escapando do seu agarrão!"; o empate é de quem segura). A marca tirada pelo HUD leva a do outro junto. Pela API: `game.system.api.agarrao.agarrar(ator, { alvo })`, `soltar(ator)`, `estrangular(ator)`, `derrubar(ator)` e `escapar(ator)`.
- **Facedown** (o `CPRFacedownRoll` do CORE e a wiki, RED p. 194): COOL + Reputação + 1d10, um teste enfrentado, pela
  janela de rolagem (Ctrl + clique, direto). Na aba Combate do personagem e no cabeçalho do capanga, onde a Reputação também
  se edita. Entram as penalidades de todas as ações (o ferimento e as lesões), e a Reputação de covarde conta negativa. O
  cartão lembra a regra da wiki: no empate, nada acontece; quem perde recua ou fica com −2 nas ações contra o outro.
- **Death Save:** 1d10 + penalidades contra BODY.
  - **Penalidades:** a de base vem das lesões; a outra sobe 1 a cada sucesso e se zera na ficha quando o personagem estabiliza.
  - **Quando:** no combate, no começo do turno de quem está mortalmente ferido. O jogador rola no computador dele.
  - **Falhou:** morto, com o status e o combatente derrotado.
- **Consciência de Combate do Solo**, pelos pontos de cada habilidade da Role, como a wiki descreve:
  - **Reação de Iniciativa:** +1 na iniciativa por ponto.
  - **Ataque de Precisão:** +1 em todo ataque a cada 3 pontos.
  - **Detecção de Ameaça:** +1 em Percepção por ponto.
  - **Ponto Fraco:** +1 no dano (antes da armadura) do primeiro acerto da rodada, por ponto.
  - **Deflexão de Dano:** −1 no primeiro dano sofrido na rodada a cada 2 pontos, até 5.
  - **Recuperação de Falhas:** com 4 pontos, o 1 natural do ataque não tira um d10.

  A rodada é a do combate de que o personagem participa. Fora de combate, o Ponto Fraco e a Deflexão valem toda vez.
- **Desfazer:** o cartão do resultado tem o botão, só para o mestre. Devolve o HP, o SP e o escudo, tira as lesões e o Suprimido, e devolve o Ponto Fraco e a Deflexão que o ataque gastou (e a carga Tech da arma).
- **Munição:** cada tiro sai do pente, e **↻** recarrega com a munição compatível da ficha. O ataque de um jogador sem mestre na mesa para antes de gastar a bala.
- **Falha crítica da arma** (C13, ciclo 88): na ficha da arma de qualidade ruim, "Na falha crítica" escolhe Emperra,
  Quebra, Quebra sem conserto ou Cara ou coroa. O resultado do ataque mostra a consequência numa falha crítica efetiva,
  mesmo quando acerta. A Recuperação de Falhas do Solo a suprime. O padrão é Emperra, inclusive nas armas antigas.
  O aviso informa a mesa; a moeda e o estado da arma são resolvidos à mão.
- **Armas de 2077** (o suplemento de fã da mesa, como a página de 2077 da wiki descreve). A classe aparece ao lado do nome da arma, e os modos são botões na linha dela:
  - **Power, Ricochete:** tiro único num alvo atrás de cobertura, com a perícia da arma e a DV da tabela de autofogo (pistolas e SMGs: a da SMG; as outras, a do rifle de assalto). Rola um dado a menos de dano, e o Ballistic Coprocessor instalado dá +2. As que só disparam rajadas ou cartucho não ricocheteiam.
  - **Tech, Carga e Rajada:** a janela pergunta a cobertura do alvo. A carga deixa passar tudo, metade da fina ou um quarto da grossa; a rajada (o autofogo carregado, com a tabela da SMG e o multiplicador até o da arma), tudo ou um quarto da fina. Se o dano passar da armadura, ela perde 4 de SP (2 através de cobertura). A rajada gasta as balas que a arma diz (a Kenshin 2, a Senkoh o pente todo). Depois de uma carga, a arma esfria uma rodada: a ficha mostra até quando.
  - **Smart:** sem o cyberware Smart Link instalado, não dispara (a ficha avisa). Com ele, o tiro é o teste Smart, 10 + 1d10 (12 + 1d10 nos modelos de várias balas), no lugar de REF + perícia; o bônus da arma e as penalidades continuam, e o autofogo e o mirado são REF + perícia.
  - **Regras de cada modelo:**
    - **Dois canos:** o botão dispara os dois de uma vez e gasta 2 cartuchos. A Palica sobe o teste Smart para 12 + 1d10; a Testera causa 4d6.
    - **Kappa:** com dois alvos marcados, se o tiro Smart não pegar o primeiro, as balas vão para o segundo, a até 4 m dele.
    - **Dian:** o botão Recolher recolhe a coronha. Dá para esconder a arma, mas os ataques têm −1 até estender.
    - **Lexington:** o autofogo gasta 7 balas.
    - **O resto** (a carga da Satara, a Burya, o supressivo da Senkoh, o +1 entre 13 e 50 m), o mestre resolve: a descrição da arma diz.
- **Inventário** (aba Equipamento): equipamento, roupas e drogas, com a quantidade (− e +, sem passar de 0; nas drogas, as doses; ciclo 67) e o uso (equipado, carregando ou guardado; o botão da linha passa de um para o outro). O equipamento de ativação à mão que tem efeito ganha o "Usar" (na linha e na ficha do item; ciclo 71), que liga e desliga os efeitos dele.
  - **Mãos livres** (C12, ciclo 87): equipar arma ou escudo confere se cabe nas duas mãos mais os bônus dos efeitos.
    Cada arma ocupa as mãos que pede; com BODY 8+, a arma branca de duas mãos ocupa uma. Cada escudo equipado ocupa
    uma, mesmo sem HP. Sem mãos livres, o item fica guardado e o aviso diz qual foi recusado; guardar libera as mãos.
    Vale na ficha do personagem, na caixa da ficha do item e ao arrastar para personagem ou capanga, inclusive de
    uma origem já equipada. A criação e a importação preservam o estado recebido dos itens.
  - **Efeitos do equipamento** valem conforme o uso, como no CORE: o Agent (+2 em Pesquisa em Biblioteca) e o Techscanner valem equipados ou carregando; o Medscanner e o Linear Frame, só equipados.
  - **Drogas** vêm com os efeitos desligados. Quem usa liga o efeito na ficha do item (o Boost dá +2 INT).
  - **"Usar" a droga** (ciclo 78; a wiki, "Drogas de rua", p. 227–229), na linha do inventário e na ficha da droga: gasta a dose e liga o efeito primário (sob efeito, a dose a mais estende); o Black Lace tira 2d6 de Humanidade. Quando o efeito acaba ("Acabou"), quem tomou rola WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário (Black Lace e Boost 17; Blue Glass, Smash e Synthcoke 15): superando, nada fica, e o Black Lace devolve a Humanidade; senão, o vício liga e fica até a terapia ("VICIADO"). No Black Lace e no Synthcoke, o −2 do vício vale só fora do efeito: enquanto o primário dura, ele fica suspenso. As outras drogas (Speedheal, Stim...) não têm efeito secundário: "Usar" gasta a dose e liga o efeito, se houver.
  - **Roupas** guardam o tipo e o estilo, com os nomes da loja da wiki.
  - **Netrunning:** o cyberdeck (os slots, com os programas instalados nele e quantos slots ocupam) e os programas (classe, ATK, DEF, REZ, o dano e o deck onde estão). Só aparece na ficha de quem tem um dos dois. O combate na NET fica na aba NET.
  - **Upgrades e acessórios:** cada um diz onde instala (arma, cyberdeck ou veículo), quantos slots ocupa e em que item está. Instalado numa arma, o carregador estendido ou tambor troca o tamanho do pente (o rifle de assalto vai de 25 a 35 ou 45, como a tabela de carregadores da wiki), e o Smartgun Link dá +1 no ataque (o mesmo acessório duas vezes não soma). O hardware ocupa slots do deck.
  - **Veículos:** SDP, assentos, MOVE (a velocidade de combate) e a velocidade narrativa. Os upgrades instalados somam SDP e assentos (o Chassis pesado dá +20 SDP; o Upgrade de assento, +2 assentos). Os da família do Nomad vêm marcados.
- **Compêndios**, na pasta "Cyberpunk RED — Fieldbook": Armas, Armaduras, Munição, Cyberware, Equipamento, Roupas, Drogas, Netrunning (cyberdecks, programas e os 12 Black ICE da wiki, o Black ICE próprio do netrunner), Upgrades e acessórios, Veículos, Armas de 2077, Cyberware de 2077, Netrunning de 2077, Lesões críticas, Personagens de exemplo e Arquiteturas da NET (estas duas, escondidas dos jogadores). Os exemplos são um Solo e um Capanga, com armas carregadas, armadura vestida e cyberware instalado, prontos para testar o combate.
- **Cyberware:**
  - **Instalar** desconta a Humanidade pela perda rolada (Shift: pela média).
  - **Fundação e opções** (ciclo 82; a wiki: "Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e externo usam slots de categoria"): cada fundação tem os slots de opção dela (o Neural Link 5, o Cybereye 3, o Cyberaudio Suite 3, o Cyberarm 4, o Cyberleg 3, o Sensor Array 5; de 2077, o Neuroport 5, as Basic Kiroshi Optics 2, o Skin Weave 2 e o Subdermal Armour 1; as outras, os do CORE), e cada opção ocupa o tamanho dela. A opção instalada entra na fundação instalada do mesmo tipo em que ainda cabe (a que ela já aponta, se cabe; senão, a primeira); o Sensor Array recebe as opções do Cyberaudio, e as placas base de 2077, só as opções de placa. Sem nenhuma, a opção entra assim mesmo, sem fundação, com um recado; a fashionware e o cyberware interno e externo não pedem fundação. Tirar a fundação deixa as opções dela instaladas, sem fundação. Na ficha do cyberware, os slots da fundação (ou os que a opção ocupa) se editam, e o alto diz em qual fundação a opção está; na opção instalada, o seletor "Fundação" (ciclo 84) a muda entre as instaladas em que ela cabe, ou a deixa sem fundação.
  - **Rolar Humanidade** (na ficha do cyberware de um personagem; ciclo 73): rola a perda da peça sem instalar, num cartão "HUMANIDADE" com o "Aplicar" do mestre, que tira o total da Humanidade atual do dono uma vez (o cartão passa a dizer o que mudou). Para o que a mesa quiser rolar fora da instalação, como uma peça que já veio instalada.
  - **Humanidade máxima:** 10 × EMP, menos 2 por peça instalada que tem perda de Humanidade (borgware, menos 4). Peça sem perda, como o cyberware grátis de 2077, não reduz.
  - Os efeitos do cyberware só valem instalado. O Kerenzikov, por exemplo, dá +2 na iniciativa.
  - **Tirar** não devolve a Humanidade perdida: o máximo volta a subir (a peça deixa de contar), e a Humanidade perdida só volta com terapia, como na wiki e no CORE.
  - **Editor de Dor:** tira só a penalidade de gravemente ferido (−2); a de mortalmente ferido (−4) continua.
- **Janela "Personagens da wiki"** (só o mestre; botão no alto da aba de Atores): cada personagem da wiki com o que dá para fazer neste mundo, que é importar (como foi criado; "Importar de novo" quando o ator do Foundry 14 sumiu), importar da mesa (como está na ficha da mesa) ou abrir a ficha, com o dono no Foundry escolhido na linha. Cada personagem diz onde está: neste mundo; o ator do Foundry 14 apagado ou em outro mundo; no Foundry 12; e de qual Foundry é a ficha da mesa. Cada Foundry tem o seu vínculo na wiki (este manda `geracao: 14`): importar aqui não tira o do 12, e o ator importado que é apagado avisa a wiki. Também mostra os pedidos da loja que esperam o mestre, com Aprovar (entrega na hora) e Recusar (com o motivo, que o jogador vê). Os avisos da última importação ficam no alto. Pela macro: `game.system.api.abrirJanelaDaWiki()`.
- **Importar da wiki:** `game.system.api.wiki.importarPersonagem(id)` cria o ator a partir do personagem feito no criador da wiki:
  - STATs, HP, Humanidade, perícias (com Linguagem e Especialista Local), Role com as sub-habilidades (Face e Corpo, que saíram, entram como Rockerboy e Exec), e dinheiro (no extrato, a linha "Dinheiro inicial (criador da wiki)");
  - o apelido e o Lifepath (em texto, como o criador da wiki monta);
  - armas carregadas, armaduras vestidas e cyberware instalado;
  - equipamento, roupas e drogas, com a quantidade e o uso da montagem da wiki (equipado, carregando ou guardado);
  - o cyberdeck, com os programas e o hardware instalados nele, e os acessórios nas armas, como a montagem da wiki (com o carregador maior, a arma entra com o pente maior cheio);
  - os veículos da família do Nomad, com os upgrades instalados e o SDP cheio.

  A wiki marca o personagem como "no Foundry".
- **Na mesa:** a cada mudança num personagem que veio da wiki (HP, dinheiro, munição, itens, lesões…), o mestre ativo manda a ficha de volta, 4 s depois da última mudança, e a wiki a mostra no lugar da ficha da criação. O formato é o mesmo do módulo cpr-2077 do Foundry 12, então a wiki não muda. Pela macro: `game.system.api.wiki.mandarFicha(ator)`; para mandar já o que está esperando, `mandarPendentes()`.
- **Importar da mesa** (a migração do Foundry 12): `game.system.api.wiki.importarDaMesa(id, donoId)` monta o ator pela ficha "Na mesa" que o Foundry 12 mandou para a wiki, com o estado de jogo:
  - HP, Humanidade, Sorte, dinheiro, IP, reputação, a Role (Face e Corpo entram como Rockerboy e Exec), as perícias e as lesões (pelo nome do CORE). No extrato, o dinheiro, o IP e a reputação entram com a linha "Migrado da ficha da mesa do Foundry 12": o histórico do ledger do Foundry 12 não vem, porque a ficha "Na mesa" só manda o saldo;
  - os itens como estavam: equipados ou guardados, o pente carregado e com qual munição, o SP que sobrou, o cyberware instalado, o que está dentro do deck, da arma e do veículo, e a opção de cyberware na fundação dela (ciclo 83);
  - cada item acha o catálogo pelo uid da wiki (da criação, de um pedido, da família do Nomad) ou, sem uid, pelo nome do CORE. O que não achar vira aviso;
  - os STATs base vêm da criação: a ficha da mesa manda os de agora, já com a armadura e as lesões, que aqui voltam pelos itens.
- **Pedidos da loja:** o jogador pede na loja da wiki e o mestre aprova na página do personagem, na wiki. A cada minuto, o mestre ativo entrega o aprovado: cria os itens (no lugar e com a munição que o jogador pediu), desconta o dinheiro (no extrato, "Compra na wiki: " e os itens) e marca o pedido como entregue. O cyberware chega sem instalar (instale pela ficha, que rola a Humanidade). Sem dinheiro na mesa, o pedido fica aprovado com o erro, e a wiki mostra "Tentar de novo". Cada item leva o uid do pedido, então nada sai em dobro. Pela macro: `game.system.api.wiki.entregarPedidos()`. Tudo o que a loja da wiki vende existe aqui (o CORE e o 2077, o do Mission Kit e o do suplemento de fã), **menos o Black Chrome**, que ainda falta. Um item que não existir vira aviso e não conta como entregue para a wiki.
  - **Só o ator ligado:** entrega e manda a ficha só o ator ligado ao personagem na wiki (o da última importação). Uma cópia antiga no mundo, ou o mundo antigo do Foundry 12 aberto depois da migração, a wiki recusa (409 "ator antigo"), e o sistema para de mandar sem avisar.
- **Migração dos dados entre versões do sistema** (o `dataModelVersion` e o MigrationRunner do CORE): o mundo guarda a versão dos dados numa configuração escondida. Quando o mestre ativo entra num mundo com dados de uma versão anterior, o sistema confere os itens e os atores do mundo, os tokens não ligados e os compêndios do mundo:
  - se algum passo muda alguma coisa, pergunta antes, com o que muda, os passos e o aviso do backup. "Depois" deixa os dados como estão, e ele pergunta de novo da próxima vez;
  - migrado, grava a versão e deixa o registro no chat, só para os mestres (os passos e o que mudou). O compêndio trancado abre só durante a migração;
  - se nada muda (o mundo novo), só grava a versão, sem perguntar. Dados de uma versão mais nova que a do sistema só avisam;
  - se um documento falha, para e avisa, e o mundo fica na versão de antes. Os passos só mexem no formato antigo, então rodar de novo não estraga nada;
  - o quarto passo (ciclo 83): a fundação de antes do ciclo 82 ganha os slots do catálogo, e cada opção já instalada vai na primeira fundação instalada do mesmo ator em que cabe (a decisão do usuário de 2026-10-16); a que não couber fica sem fundação, marcada na ficha;
  - o terceiro passo (ciclo 40): os boosters de Interface que vieram do catálogo antes do efeito ganham o +2 na
    habilidade deles;
  - os dois primeiros passos: o TeleOptics do RED sem o +1 de sempre do CORE (desde o ciclo 26 vale a regra da wiki, pela distância) e o tipo do cyberware que a ficha do item trocava por Fashionware até o ciclo 7. Pela macro: `game.system.api.migracao.migrarMundo()`. Passo novo: veja o começo de `scripts/migracao.mjs`.

## Configurações (Configurações → Sistema)

As mesmas do Fluxo de Combate, com os mesmos padrões:
- **Esquivar de tiros exige REF 8+** (padrão: sim).
- **Quem atacou rola o dano** (padrão: sim).
- **Tempo para o jogador responder** (padrão: 60 s).
- **Defesa dos NPCs:** o mestre escolhe, ou automática (padrão: o mestre).
- **Lesão crítica:** na ficha, só anunciar, ou desligada (padrão: na ficha).
- **Mortalmente ferido sofre lesão a cada acerto** (padrão: sim).
- **Death Save no começo do turno:** jogadores e NPCs, só jogadores, ou desligado (padrão: todos).
- **Explosivos pegam toda a área** (padrão: sim).
- **Fogo supressivo sem alvo pega todos à vista** (padrão: sim).
- **Esconder o total do ataque até a defesa** (padrão: sim).
- **Quem vê o cartão do resultado:** todos, os envolvidos (o mestre, quem atacou e os donos dos alvos) ou só o mestre (padrão: todos). O texto em cima do token segue o cartão.
- **Efeitos na mesa:** o texto em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A, a animação do acerto e do erro; só o texto; ou nada (padrão: texto e animação).

As do módulo cpr-2077, para as armas de 2077, com os mesmos padrões:
- **Ataque das armas Smart:** substitui REF + perícia, ou é uma alternativa, com o botão Smart (padrão: substitui).
- **Arma Smart sem o Smart Link:** não dispara, ou dispara como arma comum (padrão: não dispara).
- **A carga Tech esfria uma rodada** (padrão: sim).

A do NET Architect:
- **O jogador rola as rolagens da NET** (padrão: sim): as rolagens do netrunner abrem a janela de rolagem no computador do jogador; sem resposta no tempo para o jogador responder, o mestre rola. Desligado, o mestre rola sempre, com a Sorte preparada na ficha.
- **Inimigos da NET no combate** (padrão: sim): o Black ICE, os demônios e os netrunners inimigos (com ficha) encontrados entram na iniciativa, com um token escondido no ponto de acesso; na vez deles, o mestre escolhe quem atacar.

E as da wiki:
- **Endereço da wiki** (padrão: vazio). Vazio, o sistema deduz como o cpr-2077: `wiki.<domínio>` quando a mesa abre em `mesa.<domínio>` (o servidor), ou `http://localhost:8000` com tudo no mesmo computador.
- **Mandar a ficha para a wiki** (de cada navegador; padrão: sim): veja "Na mesa".

E a do navegador de cada um:
- **Rolar direto, sem a janela de rolagem** (padrão: não, como no CORE): ligado, o clique rola na hora e Ctrl + clique abre a janela.

## Ainda não faz

- **Os NPCs prontos do CORE** (o capanga se faz à mão, com a ficha de capanga) e o Painel Tático.
- **O Black Chrome** (176 itens da loja da wiki): o importador e os pedidos avisam e não entregam.
- **As regras de 2077 do Mission Kit:** os botões das armas Power, Smart e Tech ainda seguem o suplemento de fã; o
  Rebuild e a munição Smart melhorada ainda não têm regra. Os itens já existem, com a classe e as regras guardadas na
  flag `arma2077`.
- **O cyberware que é arma** (Wolvers, Mantis Blade, Gorilla Arm).
- **Os opcionais de Role da wiki** (o Investigator do Lawman, o desconto do clã do Nomad): ficam com o mestre.
- **Da wiki:** o retrato, o "Atualizar da wiki" (importar de novo hoje cria outro ator) e a campanha de cada mundo (a janela mostra os personagens de todas as campanhas).
- **Interface:** ícones próprios (hoje, os genéricos do Foundry).
- **Regras de lesão que não são números:** o Crânio rachado (×3 na cabeça) e o dano de novo das Costelas quebradas. Por enquanto, estão só no texto da lesão.

## Instalar

- **No PC, para experimentar:** `node instalar.mjs`, nesta pasta.
  - **Onde instala:** em `%LOCALAPPDATA%\FoundryVTT\Data\systems\cpr-fieldbook` (`FOUNDRY_DATA=...` troca a pasta).
  - **Compêndios:** na primeira vez, ou quando o catálogo muda, o instalador gera os compêndios em `packs/` (fora do git) com o npx, e para isso precisa de internet.
  - **Foundry aberto:** feche e abra de novo para ele ver o sistema. Depois, crie um mundo novo com o sistema **Cyberpunk RED — Fieldbook**.
- **Endereço da wiki:** com a mesa em `mesa.<domínio>`, o sistema deduz sozinho. Senão, ou para outro endereço, em *Configurações → Sistema → Endereço da wiki*.

## Conteúdo

`dados/catalogo.json` e `scripts/gerado.mjs` são gerados por `node build/conteudo.mjs`. Não edite à mão.

- **Fonte:** o build baixa os compêndios-fonte do CORE **v0.92.4** do GitLab para `.cache/` (fora do git) e converte para este sistema:
  - 100 armas, 18 armaduras, 55 munições e 107 cyberwares, com os efeitos;
  - 51 itens de equipamento, 90 roupas e 10 drogas; 3 cyberdecks e 15 programas; 51 upgrades; 14 veículos;
  - 22 lesões críticas e as duas tabelas, com o nome e o texto em português das tabelas da wiki;
  - as 61 perícias, com os nomes em português da tabela da wiki;
  - as 13 tabelas de DV.
- **2077:** `build/conteudo-2077.mjs` converte o 2077 da própria wiki (`system-2077.js` e `system-net.js`): o do **Mission Kit** (a base) e o do suplemento de fã adaptado. São os mesmos dados de que o módulo cpr-2077 gera os compêndios do Foundry 12, com as regras de conversão dele:
  - 46 armas, os 3 Rebuilds e as 9 munições Smart melhorada do Kit;
  - 61 cyberwares (com o Neuroport e as opções do Kit) e a droga Immunoblockers;
  - 21 cyberdecks, 22 quickhacks (os 11 do Kit não se compram) e 5 daemons.

  A classe de cada arma (Power, Tech ou Smart), a origem (Kit ou fã) e as regras próprias dela ficam na flag `arma2077`, que os modos de 2077 leem (`regras.mjs`, `perfil2077`). Os modos ainda seguem o suplemento de fã (ROADMAP).
- **Os mesmos ids da loja da wiki** (`core_weapons:assault-rifle`, `armas-2077:arasaka-hjke-11-yukimura`): é por eles que o importador acha cada item.
- **Efeitos situacionais** do CORE (Audição Amplificada, Image Enhance, as lesões de olho, ouvido, mão e mandíbula, o Agent, a iniciativa do Sandevistan) entram como efeitos à parte, que não somam sozinhos: a janela de rolagem os oferece, e o rolar direto usa os ligados por padrão. A luneta de precisão não vira efeito: a regra dela, pela distância do alvo, está nas regras do ataque. O build lista o que fica de fora.

## Migração da mesa do Foundry 12

O procedimento completo está no [MIGRATION_STATUS.md](MIGRATION_STATUS.md). As ferramentas:
- **Personagens:** `game.system.api.wiki.importarDaMesa(id, donoId)`, pela ficha "Na mesa" (acima).
- **Cenas, diários e playlists:** `node foundry-sistema/migracao/pacote-das-cenas.mjs --data <pasta Data do Foundry 12> --mundo <id> --saida <pasta>`.
  - Gera o módulo `arquivo-da-mesa`, com uma Aventura e os arquivos que as cenas usam: mapas, vídeos, músicas e os retratos dos tokens.
  - Os caminhos passam a apontar para dentro do módulo, então nada depende do sistema CORE, dos módulos antigos nem da pasta do mundo antigo.
  - Os tokens vêm sem ator. Atores, itens, combates e macros ficam de fora.
  - O script só lê o mundo: copia os bancos antes de abrir. No Foundry 14, copie o módulo para `Data/modules`, ligue-o no mundo novo e importe a Aventura.
- **Backup antes:** `sudo bash servidor/backup-completo.sh`, no servidor.

## Teste

- **Regras (rápido, sem Foundry):** `node --test "tests/sistema/*.test.mjs"`. Inclui o conteúdo gerado conferido contra as tabelas da própria wiki.
- **Lint:** `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/lib/trava.js tests/cenarios/v14.js`.
- **No Foundry 14:** `node tests/rodar.js v14`, na raiz da wiki. Sobe o Foundry 14 do PC sem janela, num mundo vazio e numa pasta própria (`%LOCALAPPDATA%\FieldbookTeste\foundry14`), e confere estes pontos, com dados fixos onde a conta importa:
  - os compêndios, a ficha e o crítico do d10;
  - o catálogo, o cyberware e a recarga, e o inventário (o efeito do equipamento pelo uso, a droga ligada na ficha do item, a quantidade com − e + até o 0, o "Usar" do equipamento ligado à mão, os acessórios na arma e o hardware no deck);
  - a ficha do item no jeito da maquete: numa pistola, o tipo na cor dele, o resumo, a etiqueta da qualidade, as três abas (a troca pelo clique) e as células; num cyberdeck, o uso pelos três botões, que grava;
  - mãos livres (C12): limite exato, recusa na ficha e no item, a caixa que volta ao estado gravado, o drop de uma
    origem equipada, as mãos do cyberware, BODY 7 e 8, o escudo sem HP e guardar mesmo num excesso antigo;
  - falha da arma (C13): padrão e seletor salvo, os quatro efeitos no cartão e na flag, inclusive acertando; sem aviso
    na arma padrão/excelente, na rolagem comum e com a Recuperação de Falhas do Solo; o ataque do jogador, com o total
    escondido, conferido nos dois clientes;
  - "Consertar" na ficha da armadura: o SP gasto volta ao máximo e o cartão "CONSERTO" diz quem consertou; inteira, o aviso, sem outra mensagem;
  - "Rolar Humanidade" na ficha do cyberware e "Aplicar" no cartão: a perda rolada sem instalar, tirada uma vez da Humanidade do dono pelo botão do mestre;
  - "Atacar" e "Recarregar" na ficha da arma (a janela no clique, direto com Ctrl; o pente cheio da munição carregada) e o SP da armadura em caixas, com o "−1" até o 0;
  - "Rodar" e "Restaurar REZ" na ficha do programa: sem o "Rodar" fora do deck; no deck, liga e desliga; a REZ perdida volta;
  - "Usar" a droga: o Black Lace (a dose, o primário, os 7 de Humanidade, o teste de 18 contra DV17 que os devolve) e o Boost (+2 INT; o teste de 15 contra DV17 vicia: −2 INT e a marca);
  - a correção rápida e o tratamento da Perna quebrada por um Medtech de teste: a correção (14 contra DV13) tira o −4 de MOVE até o "Voltou"; o tratamento empatado (15 contra DV15) falha, e o de 16 tira a lesão;
  - o tiro com crítico, ablação e Lesão Crítica, e o Desfazer;
  - o dano rolado à parte pelos botões do cartão: "Aplicar dano" no alvo marcado (com a armadura, e o Desfazer) e, no crítico, os +5 sem a lesão e "Rolar a lesão" uma vez por alvo;
  - "Rolar iniciativa" na aba Combate: sem combate, o do mestre cria um, põe o token na fila e rola; de novo no mesmo combate, o aviso;
  - "Agarrar" no Capanga (o empate é dele; vencendo, os dois com −2 e a ficha mostra; "Soltar" tira as duas marcas) e no Alvo do jogador, pela janela de reação dele (só "Resistir", com a conta da Briga e sem o total, que aparece depois);
  - o resto do agarrão: Estrangular três vezes (o BODY direto no HP; na terceira, desmaia) e com o HP baixo (abaixo de 0: fica com 1 e desmaia), Derrubar (caído, e o agarrão acaba), os botões de cada lado e Escapar (o empate é de quem segura; vencendo, as marcas saem); a fuga do Capanga na janela de reação do jogador ("Estão escapando do seu agarrão!", com o −2 do agarrão na conta);
  - "Proteger-se" na aba Combate: a marca "Em cobertura" no token, o aviso ao mestre no cartão do tiro (que acerta do mesmo jeito) e o botão que tira a marca;
  - o mirado na cabeça e na perna;
  - o autofogo, o explosivo em área, o cartucho, a munição de borracha e a que não causa dano;
  - o Reflex Tuner: o +1 na esquiva depois de atingido, o "Desfazer" que o tira e o fim na rodada seguinte;
  - o escudo (com a janela do mestre para a defesa de um NPC, que mostra o total e, fechada no X, deixa o sistema escolher, e o explosivo que passa do escudo destruído), o corpo a corpo com esquiva e a armadura pesada;
  - a Consciência de Combate do Solo (com o Ponto Fraco e a Deflexão por rodada e o Desfazer) e o MOVE do mortalmente ferido;
  - a defesa e o ataque de um jogador num segundo navegador: a janela de reação (o texto sem o total, a conta da esquiva, a DV e a barra do tempo), o X e o tempo esgotado valendo a escolha padrão, o dano rolado por ele, o ataque dele sem mestre na mesa e o mestre respondendo por ele quando demora;
  - o que a mesa vê do ataque: um ataque por vez no mestre, quem vê o cartão do resultado (todos, os envolvidos, só o mestre), o texto em cima do token nos dois navegadores, os efeitos desligados e o total à vista;
  - o fogo supressivo, a parede que bloqueia a linha de visão e os turnos (o Suprimido saindo e o Death Save que passa e depois falha);
  - o Facedown: pela janela, com Ctrl + clique, gravemente ferido e no capanga, com a Reputação de covarde;
  - a NET: a Interface (as 12 rolagens, os boosters ativos, as Ações NET, os slots do deck em caixas e o estado de cada programa), os programas (o ataque, o dano sem crítico, a REZ) e o dano aplicado pelo mestre (no cérebro, com o Armor e o Shield, e num programa);
  - o ponto de acesso à NET, nos dois navegadores: a configuração pelo HUD do Tile (as arquiteturas do mundo e do compêndio, a imagem de terminal), o marcador (o oculto, só para o mestre), o jogador a 7 m que não conecta (nem pedindo direto ao mestre) e que conecta com o Range Upgrade (a flag, o status, o anel e a janela com o andar 1 como "?"), a queda ao sair do alcance, o "Desconectar" da janela, o reinício só pelo mestre e o token e o Tile apagados;
  - "Conectar" e "Desconectar" na aba NET da ficha: a 7 m, o aviso de longe demais; com o Range Upgrade, conecta no ponto mais perto (o nome dele na ficha e a arquitetura ao vivo, que acompanha o netrunner descer) e sai com segurança;
  - andar e as habilidades na NET, no navegador do jogador: o "?" do andar 1 que vira a senha ao chegar, a senha que trava a descida, o Breach que o mestre rola (o empate com a DV não passa), o Eye-Dee com o arquivo, o Pathfinder que para no nó de DV maior, o Control e o comando, o Virus no andar mais fundo com a DV e as Ações NET do mestre, e o mestre que vê o andar escondido e o revela; o visual da janela (o andar com a cor da senha e depois limpo, o cabo em degrau do ramo B, a base do Backdoor no botão, as Ações NET livres, a hora no registro e os ícones do cabeçalho da janela);
  - o deck na janela da NET, em combate: o Sword ativado ataca o Hellhound e tira da REZ dele, desativa e não religa na mesma rodada; sem Ação NET, o Hellbolt não ataca; na rodada seguinte, o Hellbolt acerta o cérebro da netrunner inimiga (a ficha dela); o Sword contra ela é recusado;
  - a wiki no Foundry 12 e no 14: com o personagem ligado a um ator do 12, a janela da wiki mostra o ator do 14 apagado e "Importar de novo"; importado, cada Foundry fica com o seu vínculo, e a ficha da mesa vale dos dois atores (de um terceiro, não);
  - o jogador rola na NET, na janela de rolagem dele: a velocidade, o Zap cancelado (não acontece), o Zap com Sorte (que sai da ficha), o ataque do Sword, e a defesa que ele não rola no prazo (o mestre rola, o registro avisa e a janela fecha);
  - o combate na NET: o Hellhound e a netrunner inimiga encontrados entram num combate novo, com o token escondido no ponto de acesso e o Hellhound no topo; na vez dele, a janela do mestre ataca o netrunner; na dela, o mestre pula; o Zap tira da REZ e o token acompanha; a REZ do token em 0 derruba o Hellhound (derrotado, sem a janela da vez), e a netrunner inimiga que o mestre marca derrotada também fica sem ela; a desconexão e o Tile apagado tiram os inimigos;
  - o encontro e o ataque dos inimigos: o Wisp que vence a velocidade e age na hora, o Hellhound que ataca (o dano e o fogo), o Skunk (−2 no cartão do Slide), o Wisp tirando 1 Ação NET e o fogo queimando 2 no HP em combate, e "Apagar o fogo";
  - os efeitos do Black ICE: o Killer que destrói o Armor ativo, o Asp que destrói o Sword, o Liche (−4 por 1 hora), o Kraken que prende, a KRASH Barrier que segura o Giant e o Giant que derruba, com o efeito do Black ICE do andar na queda;
  - os inimigos no andar: o Hellhound, com os números da wiki, segura a descida; o Zap (a DEF do Hellhound rolada no nome dele) tira da REZ; o Slide passa, e de volta ao andar o Hellhound segura de novo; o Imp segura e não se dribla; o mestre derruba a REZ dele pelo painel;
  - as Ações NET em combate (o texto e os losangos acesos na janela): o Virus de 2 Ações e o Cloak gastam as 3 do Rank 4, o Cloak seguinte e o desconectar seguro são recusados, a rodada seguinte as devolve e a desconexão insegura sai sem gastar;
  - a arquitetura pelas tabelas: a padrão com os dados fixos (o resultado que não repete, o ramo B do andar 3 e os dois Hellhound no mesmo andar);
  - o compêndio das arquiteturas: as 7 (as 4 da campanha e os 3 exemplos), escondidas do jogador, e O Gatilho no mapa;
  - a arquitetura da NET: a ficha com os andares da clínica de ripperdoc e o mapa (o ramo B sai do andar 2), o andar novo, a linha que vira Black ICE e a linha tirada;
  - o programa de Black ICE do netrunner: o Hellhound do compêndio de Netrunning instalado no deck (2 slots), com o tipo e os números na aba NET e na ficha do item;
  - o Black ICE rezzado: o Hellhound ativado no deck põe o token ao lado do netrunner (pelo mestre, também quando o jogador ativa no computador dele), a REZ que o token perde volta para o programa, e desativar ou zerar a REZ tira o token;
  - o dano do Black ICE e na REZ dele: o Hellhound pela ficha no cérebro (o Shield ativo não o para, o Armor reduz), o Killer num programa (o aviso de que o destrói), o Sword em Black ICE e o Zap na REZ do Black ICE e do demônio da cena, e o Zap do demônio só no intruso;
  - o Black ICE e o demônio: o token solto com a REZ na barra, o modelo da wiki (o Hellhound e o Efreet), as rolagens pela janela e com Ctrl + clique, a REZ e o nome na ficha do token, a iniciativa no topo da fila (sozinho e no "rolar todos") e a arma que não os atinge;
  - o capanga: o token solto, a ficha de uma página, os itens do compêndio arrastados para ela (equipados ou instalados, a Humanidade rolada e, com Shift, a média), o tiro que muda só o HP do capanga atingido, o outro capanga recarregando e atirando com a própria munição, o Death Save só de quem caiu, o nome novo na ficha do token e, no navegador do jogador, a ficha limitada (só a imagem, o nome e as notas; o Observador vê tudo, sem editar);
  - a importação de um Solo, de um Netrunner (com os programas no deck) e de um Nomad (com os veículos da família) feitos no criador da wiki de teste, e os erros dela (personagem que não existe, wiki fora do ar, jogador tentando importar); na ficha do Solo, as abas Combate, Equipamento, Cyberware e Role em duas colunas (a Iniciativa, o dinheiro, a Humanidade e a Role em grande; as armas, as lesões, a munição, o cyberware e as especialidades com as caixas dos pontos) e a Vida em cinco painéis;
  - a Sorte preparada na ficha (e a usada na sessão, no cabeçalho: antes, depois do teste e depois do ↺) e o visual dos cartões do chat (os dados em caixas com o total, o tipo na linha de cima e a cor da faixa);
  - a janela de rolagem do jogador, no computador dele: a esquiva com o modificador do mestre e a Sorte, a janela que fecha quando o mestre responde por ele no fim do prazo, o dano com o modificador e o Death Save pedido pelo mestre;
  - a janela de rolagem: as partes, os situacionais (do cyberware e das lesões), os modificadores comuns, o modificador do mestre e a Sorte, com o total ao vivo; o que se marca entra no teste; cancelar não rola; Ctrl + clique e o "Rolar direto"; no ataque, a luneta marcada a 51 m ou mais e desmarcada perto, cancelar sem gastar bala e o que se marca entrando no ataque; na iniciativa, o Sandevistan (+3) pela janela e direto;
  - as Roles do RED: as rolagens de Role pela aba Role (o Impacto Carismático pela janela, a pechincha com Ctrl + clique, o Backup que vem e o que não vem, a Especialização de Campo com a perícia escolhida e a Cirurgia do Medtech pelas especialidades); o Moto do Nomad importado da wiki de teste; um personagem antigo com a Role Face entra como Rockerboy pela importação e pela migração, e a ficha com "Face" lê o Rockerboy; na aba Role, o Impacto Carismático sem bônus e o Moto do Nomad no total da ficha;
  - o extrato: somar, subtrair e definir com o motivo, a mudança direta, o saldo negativo com o aviso, o mestre tirando linhas (só a linha ou desfazendo a mudança) e as linhas da importação, da migração e da loja;
  - a migração dos dados: o mundo novo fica na versão atual sem pergunta; um mundo da versão 0 com o TeleOptics antigo (num ator, num token não ligado e num compêndio trancado) e um Cyberaudio que virou Fashionware: a pergunta, o "Depois" que não muda nada, o "Migrar agora" que muda só isso e tranca o compêndio de novo, o registro no chat, a segunda vez sem pergunta e o aviso dos dados de uma versão mais nova;
  - os nós de controle ligados à cena (ciclo 85): a porta, a luz e a torreta ligadas pela configuração do ponto; quem toma o nó vê só as dele, abre a porta, apaga a luz e assume a torreta, que volta ao dono de sempre na desconexão;
  - os arquivos do Eye-Dee (ciclo 89): o diário na pasta "Arquivos da NET", a permissão do dono, o aviso no chat, o "Abrir o arquivo" (no jogador e no mestre), o mesmo diário depois do "Reiniciar" e um novo no lugar do apagado;
  - o editor visual da arquitetura (ciclo 90): o "+" que cria o andar, o andar arrastado que troca com outro e o que vai para a célula vazia, e a ficha do compêndio trancado sem nada disso;
  - o Breach nos Passwalls (ciclo 96): o Capanga com dois Self-ICE (DV 8); o Breach pela ficha com 7 não passa, com 9 passa um e com 10 passa o último; depois, o botão sai e o Breach avisa;
  - o Jack In no Neuroport (ciclo 95): o Alvo do jogador resiste com a Vontade pela janela dele e percebe; o Capanga (o mestre rola) não percebe; as ligações nas duas fichas (o jogador não vê quem ele não percebeu), o Jack Out pela ficha, o cartão para o dono do alvo que percebeu e as recusas sem rolar (sem Neuroport, longe, sem ver o alvo);
  - a parede e o Scanner (ciclo 91): a porta fechada no meio (o aviso do clique e a recusa da operação) e aberta (conecta); o Scanner do HUD do token com 9 (só o ponto a 3 m) e com 12 (também o oculto a 13 m, que passa a aparecer ao jogador), com o chat só ao mestre e a ele;
  - nenhum aviso de compatibilidade do Foundry 14 nem erro vindo do sistema, nos dois navegadores.

Da pasta de dados do Foundry do PC só sai a licença. `FOUNDRY14_APP=...` e `FOUNDRY14_DADOS=...` trocam o programa e a pasta de onde vem a licença.

## Licença

As regras de dano, o conteúdo convertido e as tabelas vêm do [Cyberpunk RED - CORE](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) (The Project Red Team), que é GPL-3. Por isso este sistema também é GPL-3: se um dia for publicado, vai com o código-fonte e a mesma licença. O ícone do Suprimido veio do Fluxo de Combate.

Cyberpunk RED é da R. Talsorian Games. Este é conteúdo de fã sem fins comerciais, dentro da Homebrew Content Policy da R. Talsorian, não endossado por ela.
