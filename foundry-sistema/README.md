# Cyberpunk RED — Fieldbook (sistema do Foundry VTT 14)

Sistema próprio de Cyberpunk RED para o **Foundry VTT 14**, feito em volta da wiki da mesa. Não depende do sistema **Cyberpunk RED - CORE**: as regras, a ficha e o combate são daqui, e os módulos da mesa vão virar parte dele.

**Esta é a versão 0.2.0, um protótipo.** O combate do Fluxo de Combate já está dentro do sistema. A campanha continua no Foundry 12 com o CORE 0.92.4 até este sistema estar provado na mesa.

## O que já faz

- **Reconhecimento por Reputação (C41, parte 3, ciclo 164):** o botão **Reconhecimento** nas abas Perícias e Combate
  e na ficha do capanga rola um d10 simples ao conhecer alguém. A pessoa já ouviu falar de você se o resultado for
  estritamente menor que o nível; empate falha. Má fama usa a magnitude: Reputação −5 reconhece como nível 5,
  preservando o valor assinado do Facedown. O cartão segue a visibilidade escolhida no chat, com Sorte e recursos
  da ficha preservados. O encontro e o sentido da fama são narrados pela mesa. Valores fora de −10 a 10 são avisados
  antes de rolar, sem limitar ou alterar o campo da ficha.
- **Escudo humano (C41, parte 2, ciclo 163):** quem está Agarrando pode gastar uma Ação para usar a pessoa agarrada
  como escudo. Na reação, **Interpor escudo humano** substitui a esquiva: o agarrado recebe o tiro com sua própria
  armadura, HP, lesões e efeitos da munição. Ele não esquiva de tiros enquanto é usado como escudo. Corpo a corpo e
  tiro mirado na cabeça continuam atingindo quem o segura. Na mesma área de explosão ou cartucho, a vítima recebe
  um único impacto, protegendo o portador. O cartão identifica ambos e Desfazer restaura as perdas do receptor real.
  Morte marcada transforma a proteção em PV iguais ao BODY, registrados uma vez: soltar e agarrar novamente não
  recarrega os PV. Um tiro destruidor perde a sobra; uma explosão destruidora alcança o portador com o dano inteiro,
  como nos escudos comuns. Soltar a pessoa viva é livre; largar o cadáver custa uma Ação. O dano avulso orienta o
  mestre a marcar a vítima, sem repetir a reação. O gasto de ações continua sendo conduzido pela mesa.
- **Correr (C41, parte 1, ciclo 162):** nas abas Perícias e Combate do personagem e na ficha do capanga, **Correr
  (1 Ação)** confirma que o Movimento normal já foi usado e que a Ação está disponível. O cartão registra mais
  MOVE × 2 metros, até MOVE × 4 metros no turno, com o MOVE atual da ficha (armadura, lesões e ferimento incluídos).
  Caído, agarrado ou dirigindo não corre. A confirmação relê a ficha e cancela se o turno mudar enquanto aguarda.
  O gasto de ações continua com a mesa, como nas outras ações da ficha; os atributos e a posição do token são preservados.
- **Lesões críticas repetidas (C34.2, ciclo 161):** a opção do mundo **Lesões críticas repetidas** permite outra cópia
  em **Desligado**; **Avisar e permitir** também cria a cópia, com aviso; **Rolar novamente** busca uma lesão ausente.
  O padrão continua **Rolar novamente**, pela wiki e pelo comportamento anterior do Fieldbook (o CORE começa em
  Desligado). Vale nas tabelas e na escolha do Monowire; exclusões continuam obrigatórias. Lesões certas de golpes,
  quedas e batidas continuam sem duplicar. Rolar ou anunciar a lesão à mão não tira HP.
- **Confirmação ao apagar item (C34.2, ciclo 161):** **Confirmar ao apagar item**, ligada por padrão, é uma preferência
  de cada navegador para as fichas de personagem, capanga e contêiner. Desligada, apaga itens comuns diretamente;
  itens instalados, cyberware no corpo, munição carregada e a decisão sobre o conteúdo continuam exigindo confirmação.
  A ficha relê permissões e montagem depois das esperas. No token solto, a exclusão afeta só sua ficha.
- **SP na barra e armadura monitorada (C34.3, ciclo 160):** nas fichas de personagem e capanga, **Acompanhar**
  escolhe a peça vestida de corpo ou cabeça, a automática (maior SP atual) ou nenhuma. **Mostrar na barra** põe esse
  local na segunda barra do token; atores novos já vêm com o corpo. Baixar o SP pelo HUD abla todas as camadas do
  local; subir repara só a peça monitorada, até seu máximo. O combate continua usando o maior SP vestido do C18.
  Peça guardada ou apagada volta à automática. Exige dono; no token solto, muda só ele.
- **Itens instalados no diretório (C34.3, ciclo 160):** a seta do item expande sua montagem, com os filhos e netos;
  clicar no nome abre a ficha. A expansão fica guardada por usuário. Busca, pastas e permissões continuam valendo,
  e montar ou desmontar atualiza a árvore. Só apresenta os vínculos `instaladoEm`: não move itens nem muda pastas.
- **Imagens padrão por tipo (C34.3, ciclo 160):** os cinco tipos de ator e treze de item usam os ícones locais do
  CORE 0.92.4, inclusive o item em branco da ficha. Imagens explícitas, cópias e texturas próprias são preservadas;
  o CORE não precisa estar instalado. Origem e licença estão em `icones/padrao/ORIGEM.md`.

- **Criação de itens na ficha (C34.2, ciclo 158):** a configuração do mundo **Jogadores podem criar itens**, desligada
  por padrão como no CORE, permite ao dono criar itens em branco nas fichas de personagem e capanga. O mestre pode
  sempre criar. Desligada, os botões somem e a ação recusa a criação mesmo numa ficha aberta anteriormente. Os
  contêineres mantêm suas permissões próprias. A exceção do mestre preserva o botão do C32; o padrão desligado vem
  da configuração `playersCreateInventory` do CORE 0.92.4.

- **Ficha do personagem**, no visual do modelo de ficha da mesa (Cyberpunk 2077: amarelo, ciano e vermelho sobre o escuro, com as fontes Rajdhani e Share Tech Mono embutidas). A ficha é sempre escura, qualquer que seja o tema do Foundry. Tem estas partes:
  - **Cabeçalho:** o retrato, a Role e o Rank (com a lista das 10 Roles do RED da wiki), o nome, o apelido e os indicadores de HP, Sorte (com os botões da Sorte, abaixo, e a Sorte usada na sessão: o máximo menos a que resta, amarela quando já se gastou alguma; ciclo 66), Eurodólares, IP e Reputação (cada um abre o extrato dele, abaixo).
  - **Perícias:** o painel geral, em três colunas.
    - **Esquerda:** os atributos (clique para rolar) e os vitais (as barras de HP e Humanidade, a EMP de agora, o limite de gravemente ferido, o Death Save e o estado).
    - **Centro:** as perícias com nível, das mais altas para as mais baixas, ou todas, no grupo de cada uma. Na lista completa, dá para acrescentar uma perícia de família (uma Linguagem, um Especialista Local...) ou uma própria (o nome e o STAT, como no CORE; no grupo Próprias; C23, ciclo 120), e tirá-la. A migração da mesa traz como própria a perícia do Foundry 12 que não é do livro nem de família.
    - **Direita:** a armadura (o SP de cada local), as armas equipadas com o botão Atacar, o cyberware instalado e as lesões críticas, com o paliativo e o tratamento.
  - **As abas no jeito das maquetes do usuário** (ciclo 60, Combate, Equipamento e Cyberware; ciclo 61, Role, NET e Vida): à esquerda, a coluna dos números (os painéis de resumo, com o número principal em grande); à direita, as listas e as tabelas. Estreita (menos de 700 px), tudo numa coluna. A Role mostra a Role em grande à esquerda (o Rank, os pontos distribuídos, o resumo e os botões da habilidade, e as notas da Role em texto livre, ciclo 68) e, à direita, as especialidades com os pontos também em caixas; a NET, a Interface em grande (com a conexão: "Conectar" leva o token do ator ao ponto de acesso mais perto da cena, com as conferências do clique no marcador; conectado, o nome do ponto, "Abrir a NET" e "Desconectar", a desconexão segura; ciclo 69; e, conectado, a arquitetura ao vivo, com os andares como o netrunner os conhece, "?" nos que ainda não viu, e o estado de cada um, hostil, trancado, liberado ou livre, que a ficha acompanha sem reabrir; ciclo 76; e os slots do deck equipado em caixas, ciclo 72) e os cyberdecks à esquerda e, à direita, as habilidades em cartões e os programas (cada um com o estado: guardado, fora do deck; carregado, no deck; ativo, rezzado; ciclo 72); a Vida, o Lifepath em cinco painéis (as origens, os valores, a família, as metas e as pessoas, e o Lifepath da Role) e as notas.
  - **Combate:** à esquerda, a Iniciativa em grande (com "Rolar iniciativa", ciclo 65: entra no combate, que o mestre cria se não houver, e rola na fila pela iniciativa do sistema; quem já rolou naquele combate não rola de novo), os vitais (o HP com a barra, o limite de gravemente ferido, a penalidade, o Death Save, o MOVE e o estado) e a defesa (a esquiva, o Facedown e "Proteger-se", ciclo 79: marca o token "Em cobertura", e o cartão do tiro contra ele avisa o mestre, que decide se a cobertura para a bala; de novo, tira a marca; e "Agarrar" e "Soltar", ciclo 80: o agarrão, abaixo); à direita, as armas com todos os modos de ataque, a armadura vestida, as lesões críticas (com o paliativo, o tratamento e "Tratada") e a munição.
  - **Equipamento:** à esquerda, os Eurodólares em grande, com o extrato e as últimas mudanças, e a munição; à direita, armas, armaduras, equipamento, roupas, drogas, upgrades e veículos.
  - **Armadura (C18):** personagem e capanga mostram qual armadura fornece o SP de cada local. **−1 SP** abla todas
    as camadas vestidas daquele local; **Consertar** restaura o SP dos locais da armadura escolhida e informa quem
    consertou no chat. Inteira, só avisa. O mestre narra tempo e condições do conserto, conforme a decisão do ciclo 70.
    Skin Weave e Subdermal Armor usam seus itens de armadura separados do compêndio, como no CORE; o item de cyberware
    sozinho não fornece SP. O jogador precisa ser dono; no contêiner, precisa também de "Mudar os itens".
  - **Pilhas (C17):** munição e drogas de mesmo tipo e nome juntam ao soltar na ficha, inclusive do diretório ou
    compêndio. Reordenar na própria ficha não junta. **Dividir** escolhe quantas unidades vão para outra pilha, com a
    metade arredondada para cima como sugestão; vale também para equipamento, roupa, capanga e contêiner. O original
    conserva seu ID e o UID da wiki; a nova pilha tem outro ID, copia sistema e efeitos e conserva o catálogo.
    Cancelar não muda o estoque. O dono pode dividir; no contêiner, o jogador também precisa de "Mudar os itens".
    Como o usuário decidiu seguir literalmente o CORE 0.92.4, equipamento e roupa só juntam se o primeiro homônimo já
    tem upgrades, e os demais dados não entram na comparação. A divisão copia inclusive efeitos ligados; flags de
    uso ficam só no original. O aviso para tirar upgrades não interrompe a divisão, inclusive em munição e droga.
    Ao juntar uma pilha com conteúdo instalado, mantém apenas os upgrades do destino; os da origem saem com ela,
    como no CORE. Criações e remoções recusadas tentam desfazer a operação; se a compensação também for recusada,
    a operação para com erro explícito para conferir as quantidades.
  - **Favoritos (C20, ciclo 139):** a ★ em cada perícia (a mesma do Painel Tático) e nas armas, armaduras e itens do
    inventário (aba Equipamento). O painel Favoritos da aba Combate junta os dois: as perícias com o total (o clique rola;
    Ctrl, direto) e os itens com o botão de cada um (a arma ataca; a droga e o equipamento ligado à mão, "Usar"). A
    perícia favorita sem nível fica também na lista curta do painel geral, como o item preso do CORE na categoria fechada.
  - **Cyberware:** à esquerda, a Humanidade em grande, com a barra e o EMP de agora e o de base, e as notas de ciberpsicose (os episódios, em texto livre; ciclo 68), o estado mental pela EMP de agora (a ciberpsicose da wiki, p. 230–232: de "Sem ciberpsicose" a "Ciberpsicose extrema", com a Humanidade negativa; um cartão para o mestre e os donos quando piora) e o botão "Terapia" (C21, ciclo 145: o Medtech selecionado, não o próprio paciente, rola a Tecnologia Médica contra a DV15 ou 17; a padrão devolve 2d6, a extrema 4d6, até a Humanidade máxima; a de dependência tira o vício, e por um ano o teste contra aquela droga falha sozinho; o custo e os materiais vão no cartão); à direita, cada peça, com instalar e tirar, em árvore (ciclo 82): cada fundação com os slots usados e os dela ("1 / 5 slots") e as opções logo abaixo (└); a opção instalada sem a fundação que pede fica marcada "SEM FUNDAÇÃO". Na fundação instalada, "+ OPÇÃO" (ciclo 84) lista as opções do personagem que cabem nela (do mesmo tipo, com o slot livre) e instala a escolhida nela (Shift: a perda de Humanidade pela média); o "+ Fundação" da maquete é o "Instalar" de cada fundação.
  - **Role:** a Role da wiki (as 10 do RED, desde o Mission Kit), com a habilidade e o resumo, e o que ela soma nas perícias: o Moto do Nomad (o Rank nas seis perícias de veículo). A segunda Role da criação (a regra da mesa "Duas Roles na criação"; C23, ciclo 118) vem da wiki com o Rank e as habilidades dela, e os derivados das duas valem: a Interface do Netrunner, o Moto do Nomad, a Consciência de Combate do Solo e as perícias do Medtech. A aba Role mostra as duas (ciclo 119), cada uma com o Rank, as habilidades e as rolagens dela (o Backup usa o Rank do Lawman, seja a principal ou a segunda); o cabeçalho diz a segunda; o botão "Tirar" a tira, e o painel "Segunda Role" acrescenta outra. A ficha antiga com Face ou Corpo, as Roles do suplemento de fã que saíram, lê a do RED de onde vinham (Rockerboy e Exec), como a wiki. Os botões da habilidade de Role rolam pela janela de rolagem (Ctrl + clique, direto): o Impacto Carismático do Rockerboy e a Credibilidade da Media (Rank + 1d10), a pechincha do Fixer (COOL + Negociação + Operator + 1d10) e o Backup do Lawman (1d10 até o Rank; vindo, o d6 diz em quantas rodadas chega). As quatro Expertises do Tech perguntam antes a perícia de TECH do teste (TECH + a perícia + os pontos da Expertise + 1d10). O Medtech rola a Cirurgia e a Tecnologia Médica (TECH + a perícia + 1d10), as perícias que só ele tem: o nível vem das especialidades (2 por ponto de Cirurgia, até 10; Farmacêutica + Criossistemas), e o painel de Medicina mostra a conta. Para o Solo, o Tech e o Medtech, as especialidades com os nomes em português, os pontos de cada uma (editáveis) e, no Solo, o efeito de agora. A ficha confere os pontos com o Rank: o total (o Tech ganha 2 por Rank; o Solo e o Medtech, 1) e o máximo em cada especialidade (o Rank). Ela avisa o que passou e o que sobra, sem travar.
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
  - **Vida:** a moradia, o estilo de vida, o Trauma Team (cada um com a descrição e o custo mensal em eb) e a moda (C22), com o total por mês ("POR MÊS: N eb, no dia 1º") e o botão "Pagar o mês" (pergunta antes e desconta do dinheiro pelo extrato, com o motivo "Moradia e estilo de vida do mês"; sem total, não aparece); o Lifepath (os 17 campos do criador da wiki, que a importação traz) e as notas.
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
  dos jogadores) traz os 3 exemplos do NET Architect e as da campanha, quando a wiki tiver o documento
  (`documentos/morana/arquiteturas-da-campanha.md`: mudar um andar lá muda o compêndio no próximo build). As da trama
  antiga saíram do master em 2026-10-20 (decisão do usuário); sem o documento, o compêndio fica só com os exemplos. A
  cópia desta branch ainda tem as 4 antigas, até a próxima mescla do master.
- **Ponto de acesso à NET** (o NET Architect da mesa, dentro do sistema): qualquer Tile vira um, pelo botão no HUD do
  Tile (só o mestre). A configuração escolhe a arquitetura (as do mundo e as dos compêndios), o alcance (6 m, o do RED),
  o DV, os requisitos (o cyberdeck equipado, a Interface mínima), se o ponto é oculto e se as defesas reiniciam sem
  ninguém conectado. O Tile não precisa de imagem: o marcador e o clique não dependem dela (desde 2026-10-18, o sistema não
  põe mais a de terminal, que todos viam mesmo com o ponto oculto; a configuração oferece tirar a que ele já pôs). No
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
  habilidade Breach + 1d10 contra a DV), que passa um por vez. Com os Passwalls passados, o **Quickhack** (ciclo 97) abre
  a escolha entre os do Rank do netrunner (os 11 do Kit e os 5 do suplemento que a mesa aprovou): a habilidade Quickhack +
  1d10 contra a DV dele, um por alvo por rodada de combate. O que dá certo alerta o alvo (menos o Lure e os que dizem que
  não). O sistema aplica o que é número (ciclo 98): o Synapse Burnout tira 3d6 direto do HP; o Overheat põe o alvo em
  chamas (4 no HP no fim de cada turno dele, até tirarem o status no HUD do token); o Impair Movement e o Slow tiram 1 e
  1d6 do MOVE por 20 rodadas (o efeito na ficha, que o Foundry acaba sozinho); e o System Reset deixa o alvo
  inconsciente por 20 rodadas e caído, e o dano o acorda. Os outros vão ao cartão para o mestre narrar. O alvo que
  percebeu **expulsa** (ciclo 99) pelo botão em "No seu Neuroport": com uma Ação, WILL + Concentração + 1d10 contra a
  Interface + 1d10 do netrunner, que resiste pela janela de reação do dono (o empate é dele); expulso, a ligação some
  dos dois lados. O alvo netrunner sempre sabe do Jack In, sem rolar. Em combate (ciclo 100), o Jack In, o Breach e o
  quickhack gastam as Ações NET da rodada (as do Rank; o título do painel mostra quantas foram), e a que passa do
  limite avisa sem rolar. Expulso ou fora do alcance (o netrunner ou o alvo andou), é o **Jack Out inseguro**: a ligação
  some, e o netrunner só entra de novo naquele alvo daqui a 60 minutos do tempo do mundo. Com a **Neuroport Cyberdeck
  Port** instalada (ciclo 101), o cyberdeck equipado tem o botão "Externo" / "Na porta": na porta, o alcance é 20 m
  contra arquiteturas e 50 m contra Neuroports, e o hardware do deck não vale. Com Interface Rank 1 ou 2, o Jack In
  passa antes pelo **firewall de fábrica** (ciclo 102): Interface + 1d10 contra DV6; falhando, não entra, e o cartão vai
  só ao mestre e ao netrunner. O alvo que morre (o status de derrotado; ciclo 103) derruba quem está no Neuroport dele
  (o Jack Out inseguro), e o token que sai da cena leva junto as ligações dele. A **conexão direta** (ciclo 104), pelo
  botão ao lado do Jack In, liga pelo Personal Link no alvo marcado a até 2 m, sem rolar: com o alvo inconsciente ou
  agarrado, ou quando o dono aceita numa janela (o mestre, pelo NPC). Ligado direto, o netrunner tem uma Ação NET a mais
  por turno e os Passwalls passados; a mais de 2 m, ou com o cabo arrancado pela ficha do alvo, cai à força. O
  **Neuroport como arquitetura** (ciclo 105, a versão simples que o usuário escolheu): cada ligação mostra os andares do
  alvo (o Black ICE do deck dele, os Passwalls e o nó de controle do Holophone, DV10), e o cartão do Jack Out inseguro
  diz qual Black ICE do deck age, para o mestre aplicar. Com isso, o C9 terminou.
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
  - **Corpo:** o painel geral da ficha do personagem (sem as armas), a tabela de armas com os ataques, o painel de armadura
    com ablação e conserto, o agarrão (os botões do
    ciclo 81), os itens (equipar, vestir, instalar e o uso de cada um) e as notas;
  - **Perícias (C34.2, ciclo 159):** a configuração **Perícias na ficha do capanga**, de cada navegador, escolhe a última
    coluna: Nível, Base (o padrão: nível + atributo atual, já com a armadura) ou Total (base + bônus persistentes da
    perícia). A escolha vale quando a ficha se redesenha ou reabre. O campo de nível continua editável; a ordem das
    perícias e a rolagem continuam as mesmas. Como no CORE, a coluna Total não soma a Role calculada separadamente,
    ferimento, Sorte ou situacionais; esses entram na rolagem. Bônus já derivados na perícia, como os da família e a
    Detecção de Ameaça, continuam no Total. A ficha do personagem mantém sua exibição;
  - **O token** nasce solto, com o HP na barra: cada capanga na cena tem o próprio HP, a própria munição e o próprio Death
    Save. O nome mudado na ficha de um token vai para o token na cena;
  - **Arrastar um item** para a ficha tenta equipar a arma e o escudo (sem mãos, ficam guardados), veste a armadura e a
    roupa, equipa o cyberdeck, a droga e o equipamento, e
    instala o cyberware rolando a perda de Humanidade (com Shift, a média), como o CORE;
  - **A ficha limitada:** o jogador só com a permissão Limitada vê a imagem, o nome e as notas, como no CORE. Com a de
    Observador, vê a ficha inteira, sem editar.
- **Acessibilidade das fichas:** os controles próprios do personagem, do capanga e do item entram no Tab, inclusive
  os favoritos, os nomes que rolam, os retratos e os atalhos de edição. Enter e espaço acionam o mesmo clique, com
  Ctrl, Shift e os demais modificadores preservados. O foco de teclado tem contorno ciano nessas fichas e nas janelas
  de rolagem e de defesa. Os ícones têm nome para o leitor de tela; favoritos, equipagem e instalação informam seu
  estado, e as abas próprias do item informam a seleção. Os campos sem rótulo visível têm nome acessível.
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

- **Ficha do contêiner** (o container do CORE; o C24, ciclo 122): a loja, o saque, o esconderijo ou um personalizado,
  numa página, no visual da ficha do personagem:
  - **o tipo** liga as permissões dos jogadores, como no CORE: a loja (eles vendem para ela; o estoque infinito fica com o
    mestre), o saque (tudo de graça) e o esconderijo (de graça, e eles põem, criam, apagam e mudam os itens e movem o
    contêiner); no personalizado, o mestre marca cada uma. Só o mestre vê as configurações e muda o nome e a imagem;
  - **os itens** por categoria, com a pilha, o preço ("Unidade: 1 eb (Barato) | Tudo: 20 eb": a munição pelo lote da loja
    da wiki, a categoria pelo glossário dela) e o que está instalado em cada um;
  - **os Eurodólares** do contêiner, com o extrato do mestre (o saque não tem);
  - **pôr:** arrastar um item para a ficha (o mestre, ou o jogador com "Criar e pôr itens"). O da ficha de um ator vai com
    o que está instalado nele e sai de lá; o do compêndio entra em cópia; o mesmo item em pilha soma;
  - **pegar:** nos de graça, o "Pegar" leva o item (ou uma parte da pilha) para o personagem do "Trocar com" (os do
    jogador; o dele primeiro). Com o estoque infinito, o contêiner fica com o item. O jogador não tira arrastando; o
    mestre, sim;
  - **comprar** (o C24, parte 2, ciclo 130): na loja, o "Comprar" (ou "Comprar parte") leva o item pelo preço da unidade
    (a munição pelo lote da loja da wiki; a fração arredonda para cima): sem o dinheiro, avisa e não leva; com ele, os eb
    saem de quem compra e entram na loja, com a linha no extrato dos dois;
  - **vender** (o C24, parte 3, ciclo 132): o jogador arrasta o item da ficha dele para a loja, que oferece o preço da
    pilha vezes a porcentagem do tipo (para baixo), até o dinheiro dela; fechado, o item vai (a arma, descarregada: as
    balas do pente voltam para a munição dele), e os eb saem da loja e entram na ficha, com a linha no extrato dos dois.
    O mestre escolhe pelo "Configurar a compra" que tipos a loja compra e a porcentagem de cada um (os dez do CORE; na
    loja nova, todos a 100%);
  - **a trava:** o jogador que tenta mover o token do contêiner sem "Mover o contêiner" ganha o aviso, e o token fica;
  - **o ator novo** nasce loja, com o token solto e neutro e todos os jogadores donos: como no CORE, a ficha só funciona
    assim (quem pega muda o contêiner). O que o jogador não pode usar não aparece.
- **Painel Tático** (o módulo painel-tatico da mesa, dentro do sistema; o C25, ciclo 125): a barra na base da tela com o
  token controlado (ou, sem nenhum, o personagem do jogador):
  - **o retrato grande** do personagem, um PNG para cada estado de ferimento (Sem ferimentos, Levemente, Gravemente,
    Mortalmente e Morto), com o efeito automático onde falta a imagem e o FLATLINE do morto; o dono escolhe pelo botão do
    retrato (ou com o botão direito nele), com o tamanho, o deslocamento e o espelho;
  - **os vitais:** o HP (os botões, o número, a roda do mouse), a armadura da cabeça e do corpo (− ablação, + conserto), o
    escudo, a Humanidade, a Sorte e o Death Save (clique rola; botão direito zera a penalidade);
  - **os atributos** (um clique rola), **as armas equipadas** (o dano, o CDT e o pente; o mirado com o local, o autofogo,
    o supressivo e os modos de 2077; os botões de 2077 da ficha; recarregar e trocar a munição; ATK e DMG) e **as
    ações** (a iniciativa, o fim do turno, o Facedown e os painéis de perícias, com a busca e as favoritas, de Role, da NET
    e de equipamento);
  - **o alvo:** o painel mostra o alvo marcado; sem alvo, o ATK vira mira no mapa (Esc cancela);
  - **o estilo de cada jogador** (Configurações → Sistema → Estilo do Painel Tático): o tema, as cores, a fonte, o
    tamanho, a posição (arrastar pela alça), as seções e os botões de HP; o código PT1 leva o visual de um para outro; o
    mestre define o padrão da mesa. A tecla H recolhe e abre.
- **Na ficha, como no CORE** (o C32): o "+" de cada lista (munição, armas, armaduras, equipamento, roupas, drogas, upgrades, veículos, cyberware, cyberdecks, programas e lesões) cria um item em branco do tipo dela ("Arma nova") e abre a ficha dele. A busca do cabeçalho filtra pelo nome, sem diferença de maiúsculas e acentos, as perícias (todas à vista enquanto há texto) e as listas de itens de todas as abas; ela não grava nada no ator e continua quando a ficha se redesenha. Na tabela de armas, além de recarregar, dá para trocar a munição (a sobra do pente volta para a que estava nele) e descarregar (as balas voltam para a munição). Apagar uma arma carregada devolve as balas ao estoque na exclus?o simples e em S? tirar, quando a muni??o est? na ficha; Apagar junto descarta as balas do pente. Apagar um item com algo instalado pergunta se só tira (o que está nele se desinstala e fica solto: o cyberware para de valer e devolve a Humanidade máxima, sem a atual; o programa sai desativado) ou se apaga junto. A ficha do capanga tem a busca, as armas, as lesões e o apagar iguais.
- **Arrastar um item de uma ficha para outra** (da aba Equipamento) leva o item, com o que está instalado nele, e o tira
  da origem, como no CORE (ciclo 122). O cyberware instalado não sai.
- **Barra de macros** (C20, ciclo 139; o hotbarDrop do CORE): arraste da ficha para a barra a linha da arma (aba Combate
  ou Equipamento), o nome de uma perícia ou um item. A arma vira a macro do ataque: no texto dela, escolha o modo (o
  ataque, o mirado, que pergunta o local, o autofogo e o supressivo que a arma tem, os modos de 2077 dela e o dano) e se
  pula a janela de rolagem. A perícia vira a macro do teste; o outro item, a que abre e fecha a ficha dele. A macro rola
  com o token controlado ou, sem nenhum, com o personagem do jogador, e acha a arma pelo nome, como no CORE: a mesma
  macro serve a quem tiver uma arma com esse nome. A mesma arma arrastada de novo reusa a macro. Pela macro:
  `game.system.api.macros.usarArma('Assault Rifle', { modo: 'dano', pularJanela: true })` e
  `game.system.api.macros.rolarPericia('evasion')`.
    Desativar, tirar do deck ou apagar o programa tira o token. Sem mestre na mesa, o token não entra.
- **Cartões do chat** (testes, ataques, dano, Death Save, lesão, Backup, a NET) no visual da maquete do usuário (ciclo 59): a mensagem inteira é o cartão, com o canto cortado e a faixa de cima na cor do tipo (amarelo no teste; vermelho no ataque, no dano, na lesão e na morte; ciano na NET, no Backup e no Death Save que passa). Na linha de cima, o tipo e quem rolou ("TESTE // ATIRADORA"), com a hora. Embaixo, o título grande, o que soma ao d10 ("1D10 · REF +8 · ARMAS DE UMA MÃO +4"), os dados em caixas com o total grande (o 10 do crítico em amarelo; o 1 da falha e o d10 que ele tira, em vermelho; no dano crítico, os 6 em amarelo; o × do autofogo), o crítico numa etiqueta, a regra e os botões. No resultado do ataque, o total do ataque grande, cada alvo com a etiqueta do que aconteceu (acertou, esquivou, errou) e a barra de HP depois do dano; o ataque desfeito fica desbotado, com "DESFEITO". As mensagens que não são do sistema não mudam.
- **Gastar IP** (o C39; a wiki, "Gastar Pontos de Melhoria", p. 411): na ficha do personagem, o "+IP" ao lado de cada perícia e o "SUBIR RANK COM IP" de cada uma das duas Roles sobem um nível por vez, até 10, pelo custo da wiki: 20 × o nível novo na perícia (40 × nas difíceis, as do ×2 do catálogo) e 60 × o Rank novo. A confirmação diz o custo e o saldo ("Armas de uma Mão 4 → 5 por 100 IP? Você tem 230."); sem IP bastante, recusa. A compra desconta o IP, escreve a linha no extrato (o motivo e quem comprou) e avisa no chat. O dono e o mestre compram; o capanga não tem IP. O tempo no nível novo antes de subir de novo fica com o mestre. Pela macro: `game.system.api.avanco.avancarComIp(ator, { pericia: "handgun" })` ou `{ role: "role" }`.
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
- **O `/red` no chat** (o C26, como no CORE): `/red` rola `1d10` com o crítico do sistema, no cartão de teste; com outro dado, `/red 2d6 a2` é um dano (o crítico dos dois 6 e a ablação 2, como o CORE), e `/red 1d20` rola sem crítico. Os modificadores (`+N` e `-N`) somam todos (o CORE só lê o primeiro), e o texto depois de `#` é a descrição.
- **O modo de rolagem do chat** (o C33, como o ChatDataSetup do CORE): as rolagens avulsas (o atributo, a perícia, a Role e o Backup, o Facedown, o dano rolado à parte, o Death Save da ficha, a perda de Humanidade rolada à parte e o `/red`) saem no modo escolhido no seletor do chat do Foundry: pública, só o mestre (o mestre e quem rolou), às cegas (só o mestre vê o resultado; quem rolou vê que rolou) ou só para si. A iniciativa já seguia o modo. O ataque e a defesa (que têm as próprias configurações de quem vê), a NET e os fluxos com cartão próprio (a droga, a terapia, o tratamento, o Death Save do começo do turno, as Artes Marciais, a resistência à munição) continuam públicos.
- **"Mostrar aos jogadores"** (o C33, o cpr-imageContextMenu.js do CORE): o clique direito no retrato das fichas (personagem, capanga, Black ICE, demônio, contêiner, item e arquitetura) abre a imagem, com o nome, para todos na mesa. Só o mestre e o dono têm a opção. A ficha do token solto apagado fecha sozinha (o Foundry 14 já faz).
- **Medir DV na régua pelo HUD do token** (o C26, como no CORE): o botão de alvo na coluna esquerda do HUD do token escolhe a tabela de DV (todas as tabelas de alcance do catálogo, menos a genérica) e grava na flag `cprDvTable` do token; com ela ativa, o rótulo da régua (`TokenRuler`) mostra a DV da distância medida ao lado dos metros (`10 m · DV: 15 Pistol`).
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
  - **As opções do Fluxo (C26):** "Resolver os ataques" vem ligada; desligada, o ataque só rola, sem exigir alvo nem mestre e sem resolver defesa ou dano. "O jogador rola os próprios dados" vem ligada; desligada, não abre a janela de dados na defesa ou no Death Save, e o mestre rola o dano. A escolha de reação continua com o dono do alvo, como na mesa antiga. "Quem atacou rola o dano" continua como opção adicional; as rolagens da NET continuam com a chave própria. "Dano" vem Automático; Manual resolve a defesa e deixa dano, armadura e lesão para o botão Dano da ficha e a aplicação pelo mestre, inclusive em ataques de área.
  - **Estados (C26):** o Caído padrão do Foundry (`prone`) deixa a Ação de Movimento com 0 m, sem alterar o MOVE nem os testes. O jogador dono não move o token caído: recebe um recado para levantar; o mestre move sempre. O botão **Levantar-se (1 Ação)**, no painel Defesa da aba Combate e nos vitais do capanga, remove só Caído e registra o custo no chat. A Recuperação das Artes Marciais continua permitindo levantar sem gastar a Ação ao passar na DV. Agarrado continua sem Movimento depois de se levantar; o −2 do agarrão continua entrando uma única vez. Os demais símbolos padrão ficam com o mestre quando a fonte não define uma conta para eles. A ficha informa a disponibilidade do movimento pessoal a pé; não mantém um contador novo de Ações. Por macro: `game.system.api.estados.levantar(ator)` e `game.system.api.estados.movimentoDe(ator)`.
  - **Atacar:** tiro, ou corpo a corpo com arma branca, Briga ou Artes Marciais.
  - **Briga e Artes Marciais** (ciclo 131; a wiki, p. 176–178): as armas "Unarmed" e "Martial Arts" do compêndio. O dano é o da tabela do BODY de quem bate (1d6 até 4, 2d6 até 6, 3d6 até 10, 4d6 de 11 para cima); com um cyberbraço instalado, a Briga dá pelo menos 2d6. As Artes Marciais atacam com a forma em que o personagem tem mais pontos (ou a escolhida na ficha da arma), pedem pelo menos 1 ponto nela e ignoram metade do SP; a Briga não ignora armadura. A caixa "Dano pelo BODY" da ficha da arma desliga a conta, e o dano volta a ser o do item. O Ataque de Precisão e a Recuperação de Falhas do Solo valem nas duas.
  - **Os movimentos especiais das Artes Marciais** (ciclo 141; a wiki, p. 178–180). Na aba Combate (e na ficha do capanga), o bloco "Artes Marciais" tem um botão para cada movimento das formas em que o personagem tem pelo menos 1 ponto, e a Recuperação. O sistema confere o WILL 8+, o MOVE 8+, o agarrão e o "caído". O requisito "neste turno" (acertou o mesmo alvo com Briga e Artes Marciais, por exemplo) o jogador confirma na janela (decisão do usuário, 2026-10-19).
    - **Os testes contra a DV:** DEX + a forma + 1d10 precisa superar a DV (15; a Recuperação, 13), e o mestre aplica o efeito:
      - a Recuperação levanta (passando, sem gastar a Ação);
      - a Combinação quebra-armadura tira 2 SP da armadura do corpo;
      - a Contra-queda derruba;
      - o Desarme combinado leva ou derruba a arma na mão do alvo;
      - o Aperto de ferro, agarrando, dá −2 a mais na fuga e proíbe o ataque à distância enquanto agarrado;
      - o Escape de agarrão solta e dá Braço quebrado em quem agarrava.
    - **Os golpes:** o Golpe quebra-ossos, o Ponto de pressão e a Voadora vão pela arma de Artes Marciais (o fluxo do ataque, com a forma do movimento). Acertando:
      - o Golpe quebra-ossos dá Costelas quebradas, e o Ponto de pressão, Lesão na coluna; mirados na cabeça, Crânio rachado e Lesão cerebral;
      - a Voadora (até 4 m) derruba, e o "Desfazer" do cartão levanta.
  - **Mirar:** −8, na cabeça (o dano que passa dobra), na perna (se passar dano, Perna quebrada) ou no item na mão (o alvo larga).
  - **Luneta de precisão** na arma: +1 em tiro único ou mirado contra alvo a 51 m ou mais, se o cyberware óptico já não dá o bônus (wiki). Ela entra sozinha quando vale, e a janela de rolagem a traz marcada ou não.
  - **TeleOptics** (pela wiki): +1 no tiro mirado contra alvo a 51 m ou mais. O de 2077 saiu da wiki de 2026-10-17 ("vale o do RED"; ciclo 107): o que um ator ainda tenha conta como o do RED (dois não somam). Como a luneta, entra sozinho quando vale, e a luneta não acumula com ele.
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
- **HP e Humanidade dentro do máximo** (o C31, como o CORE): o atual nunca passa do máximo; a ficha, o Painel, o Desfazer e a cura à mão param nele, no personagem e no capanga. Com o HP cheio, o máximo que muda (o BODY, a WILL, um cyberware ou um efeito que mexe neles) leva o atual junto; ferido, o HP fica, só limitado se o máximo cair abaixo dele. A Humanidade fica na máxima (a EMP que desce a leva; a que sobe, não) e continua podendo ficar negativa. A instalação de cyberware desconta a perda da Humanidade de antes da peça, sem tirar os 2 da máxima duas vezes.
- **Dano na ficha**, com as regras do CORE:
  - **Quem rola:** quem atacou rola o dano no computador dele; se ele não responder, o mestre rola.
  - **SP:** vale o maior SP atual das armaduras vestidas que cobrem o local, sem somar; arma branca ignora metade.
  - **Armadura segura:** se o dano não passa do SP, entra só o bônus do crítico.
  - **Cabeça:** o dano que passa conta ×2.
  - **Escudo:** recebe o ataque todo; só um explosivo passa de um escudo destruído.
  - **Ablação:** quando o dano atravessa, todas as armaduras vestidas do local perdem 1 de SP, ou a ablação da munição
    (a perfurante tira 2; a borracha, a biotoxina e a venenosa não tiram nada), sem cair abaixo de zero. O Desfazer
    restaura em cada item apenas o SP perdido naquele ataque, até o máximo, preservando dano posterior e os IDs de
    peças retiradas depois. Cartões antigos, com uma só armadura, continuam funcionando. Escudos têm sua própria trilha.
  - **Munição de borracha:** não mata (deixa o alvo com 1 HP), não tira SP e não causa lesão crítica.
  - **Munições especiais RED:** o ataque e a área continuam valendo. Biotoxina (DV15, 3d6) e veneno (DV13, 2d6) pedem Resistir a Tortura/Drogas e dão só seu dano direto no HP, sem armadura, ablação ou crítico. O dono do alvo rola no próprio navegador; sem resposta, o mestre rola. Empate na DV falha.
  - **Sonífera, flashbang e gás:** sonífera (DV13) deixa inconsciente e caído; dano ou uma Ação de outra pessoa acorda, sem levantar. Flashbang (DV15) dá Olho e Ouvido danificados; gás (DV13), só Olho danificado em quem tem olhos de carne. As lesões são temporárias, sem dano bônus, e preservam lesões anteriores. Anti-Dazzle em par, proteção dos ouvidos e Nasal Filters protegem contra os efeitos correspondentes; os filtros não imunizam contra flechas venenosas.
  - **Duração:** sono, lesões da flashbang/gás e EMP acabam após 60 segundos do relógio do mundo (20 rodadas de 3 segundos). O cartão também oferece o botão para encerrar o efeito de cada alvo; o Desfazer tira só o que aquele ataque criou.
  - **Incendiária e expansiva:** só dano que atravessa a armadura põe fogo: 2 HP no fim de cada turno, até uma Ação para apagar. O fogo não acumula, inclusive com o da NET. Expansiva que causa Objeto estranho rola outra lesão diferente e aplica as duas, sem um segundo +5 de dano.
  - **Inteligente RED:** exige a Luneta de Mira instalada e operante; sem ela não dispara nem gasta munição. Erro por até 4 contra a defesa usada, inclusive a Evasão rolada, permite uma segunda tentativa de 10 + 1d10, só com Sorte, contra a mesma DV e com nova esquiva. Inclui o mirado, conservando o local e suas consequências, sem repetir −8 ou bônus de mira, e o míssil Inteligente; a repetição não gasta outro projétil. A segunda chance da munição Smart melhorada do Mission Kit fica no C29 do ROADMAP.
  - **EMP:** Cybertech DV15; falhando, o mestre ativo escolhe até dois eletrônicos em uso pelo cartão. A proteção EMP considera a peça, sua fundação e as opções do conjunto. Os itens atingidos ficam inoperantes, incluindo seus efeitos, opções e programas, sem desinstalar, guardar nem mudar Humanidade. Nas fichas dos itens compatíveis, Eletrônico e Protege contra EMP vêm do CORE e podem ser editados. A ficha marca INOPERANTE (EMP); a mesa narra o cybermembro pendurado.
  - **EMP e conexões:** o deck parado bloqueia ações da NET, inclusive as do mestre, e não permite rezzar outro Black ICE; desconectar continua possível. O deck encaixado herda a parada da porta implantada. Neuroport e Self-ICE parados deixam de oferecer conexão e Passwalls; o Personal Link conserva seu acesso quando o Self-ICE volta, também no botão Quickhack da ficha. As janelas abertas reconferem o equipamento antes de resolver, inclusive a Luneta de Mira RED e a ligação da arma Smart do Kit antes de gastar bala, dados ou Sorte.
  - **Fumaça:** o cartão informa a área e a duração da wiki; a mesa continua resolvendo a área de fumaça e suas penalidades.
  - **O dano rolado à parte** (o botão "Dano" da ficha, ciclo 64): o cartão tem os botões do mestre. "Aplicar dano" aplica nos alvos marcados (T), no corpo (a cabeça só pelo tiro mirado), com as mesmas regras do ataque (a armadura, o +5 do crítico, a ablação, a Deflexão, a borracha), e o resultado sai no cartão do ataque, com o "Desfazer". No dano crítico, "Rolar a lesão" rola a tabela do corpo em cada alvo marcado, uma vez por alvo naquele cartão (o alvo cuja lesão a ficha recusou pode ser rolado de novo). O dano rolado dentro do ataque não tem esses botões (o ataque já aplica). Os botões do mestre nos cartões valem um clique por vez: o segundo clique, enquanto o primeiro ainda corre, não faz nada (o clique duplo no "Desfazer" devolvia o HP duas vezes).
- **Lesão Crítica** (dois 6 no dano; também rolada à mão):
  - **Tabelas:** 2d6 na tabela do corpo, ou na da cabeça no tiro mirado na cabeça; por padrão, sem repetir uma que o alvo
    já tem. A opção **Lesões críticas repetidas** permite duplicatas com ou sem aviso (C34.2, ciclo 161).
  - **Rolar lesão (C19):** nas abas Perícias e Combate e na ficha de capanga, escolhe corpo ou cabeça, rola 2d6 e
    acrescenta a lesão com efeitos e cartão. Essa rolagem não altera HP; o dano é resolvido à parte. Fechar a escolha
    não rola nem cria. Em **Rolar novamente**, a tabela esgotada ou uma sequência sem lesão nova avisa e para. Correção, tratamento e "Voltou"
    também estão disponíveis no painel geral e no capanga.
  - **Parte cibernética (C19):** na janela de correção ou tratamento, marque a opção para usar Cybertecnologia na DV
    escolhida. O teste usa TECH + Cybertecnologia + 1d10, inclusive no lugar da Cirurgia, conservando a DV da tabela.
  - **Paliativo (C19):** suspende também o aumento do Death Save até o "Voltou", conforme a decisão do usuário.
    Desliga só os efeitos que estavam ativos; o retorno preserva efeitos antes desligados e os acrescentados depois.
    A lesão já corrigida recusa outra correção, mas ainda aceita tratamento definitivo. Marcas antigas continuam
    aceitas. O dono pode operar; o observador só lê, e as permissões são conferidas também nas APIs.
  - **Na ficha:** a lesão entra com os efeitos (Perna quebrada: −4 MOVE, mínimo 1) e o texto da wiki, com o paliativo e o tratamento.
  - **Mortalmente ferido:** quem já está com HP abaixo de 1 ganha uma lesão a cada acerto.
  - **Correção rápida e tratamento** (ciclo 77; a wiki, p. 128 e 223), na aba Combate e na ficha da lesão: quem trata (o token selecionado de quem clica, o personagem dele ou, na correção, o próprio ferido) escolhe a perícia e rola TECH + a perícia + 1d10, que precisa superar a DV da lesão (Primeiros Socorros ou Paramédico; no tratamento, Paramédico ou a Cirurgia do Medtech). A correção rápida tira o efeito até o fim do dia (a lesão fica "CORRIGIDA", e o "Voltou" liga o efeito de novo; o sistema não tem relógio) e, na lesão sem tratamento, resolve de vez; o tratamento tira a lesão e não pode ser em si mesmo. O cartão "TRATAMENTO" diz quem tratou, o total e a DV.
- **Agarrar** (ciclo 80; a wiki, "Agarrar e arremessar", p. 177; o "Grapple" das maquetes), na aba Combate: com o alvo marcado (T), quem agarra rola DEX + Briga + 1d10 (a janela de rolagem; Ctrl + clique, direto), e o alvo resiste na janela de reação do dono ("Estão agarrando você!": só "Resistir", com a conta da Briga e sem o total, como a esquiva; o prazo e o "responder por ele" do mestre valem igual); pelo NPC, o mestre rola. Quem agarra precisa superar: o empate é do defensor (o teste resistido, p. 128). Vencendo, os dois ficam marcados ("Agarrando" e "Agarrado", no HUD do token), com −2 em todas as ações (a parte "Agarrão" de cada teste), e o cartão lembra que o agarrado não usa a Ação de Movimento e é arrastado, e que ninguém usa arma de duas mãos (o sistema não impede). A Defesa da aba Combate (e o painel "Agarrão" da ficha do capanga) mostra com quem e os botões de cada lado. Quem agarra: "Soltar" (tira as duas marcas), "Estrangular" (ciclo 81: o BODY dele direto no HP do outro, sem a armadura; se levaria abaixo de 0, o outro fica com 1 e desmaia, com a marca de inconsciente; na terceira rodada seguida do mesmo combate, desmaia; fora de combate, toda vez conta) e "Derrubar" (o BODY direto no HP; o outro fica caído, e o agarrão acaba). Quem é agarrado: "Escapar" (DEX + Briga + 1d10 contra o de quem agarra, que resiste na janela de reação do dono, "Estão escapando do seu agarrão!"; o empate é de quem segura). A marca tirada pelo HUD leva a do outro junto. Pela API: `game.system.api.agarrao.agarrar(ator, { alvo })`, `soltar(ator)`, `estrangular(ator)`, `derrubar(ator)` e `escapar(ator)`.
- **Facedown** (o `CPRFacedownRoll` do CORE e a wiki, RED p. 194): COOL + Reputação + 1d10, um teste enfrentado, pela
  janela de rolagem (Ctrl + clique, direto). Na aba Combate do personagem e no cabeçalho do capanga, onde a Reputação também
  se edita. Entram as penalidades de todas as ações (o ferimento e as lesões), e a Reputação de covarde conta negativa. O
  cartão lembra a regra da wiki: no empate, nada acontece; quem perde recua ou fica com −2 nas ações contra o outro.
- **Death Save:** 1d10 + penalidades contra BODY.
  - **Penalidades:** a de base vem das lesões que não estão corrigidas; a outra sobe 1 a cada sucesso e se zera na ficha quando o personagem estabiliza.
  - **Quando:** no combate, no começo do turno de quem está mortalmente ferido. O jogador rola no computador dele.
  - **Falhou:** morto, com o status e o combatente derrotado.
- **Perigos do ambiente** (o C38; a wiki, "Outras formas de se ferir", p. 180–181): o mestre seleciona os tokens (ou
  marca os alvos) e abre a janela "Perigo do ambiente" pelo `/perigo` no chat (que aceita `/perigo fogo intenso` e
  `/perigo queda 25`) ou pelo botão de aviso no HUD do token. O cartão tem o Desfazer, só para o mestre.
  - **Fogo:** brando 2, intenso 4, mortal 6 direto no HP no fim de cada turno, até "Apagar fogo" (uma Ação); não acumula,
    vale o maior;
  - **Afogamento e asfixia:** o cartão diz o fôlego (BODY minutos); quando acaba, "Sem ar": o BODY direto no HP no começo
    de cada turno, até "Respirou";
  - **Eletrocução:** 6d6 (a armadura absorve) agora e no fim de cada turno, até "Afastou-se";
  - **Queda:** 2d6 a cada 10 m (a armadura absorve) e o Atletismo DV15; falhou, a Perna Quebrada com os +5 no HP; duas
    cyberpernas anulam até 30 m;
  - **Veneno e droga como arma:** WILL + Resistir Tortura/Drogas contra DV11, 13 ou 15, no computador do dono; o veneno
    tira 1d6, 2d6 ou 3d6 direto no HP, e a droga diz o efeito;
  - **Radiação:** baixa, só o cartão; alta 2 e extrema 6 no fim de cada turno, até "Saiu da zona" (não se apaga);
  - **Batida de veículo** (o C40): os tokens selecionados estão no veículo que bateu, e os alvos marcados (T) foram
    atingidos. Todos ganham o Traumatismo Cervical com os +5 no HP; o veículo de quem dirige leva 6d6 (o SDP menos o SP);
    quem está a pé rola DEX + Evasão contra DV13 e, se falhar, leva 6d6 (a armadura absorve).
- **Direção e manobras** (o C40; a wiki, "Veículos", p. 189–192): com o veículo em uso e "Dirigindo" ligado.
  - **Direção sob pressão:** no combate, no começo do turno, quem tem REF + perícia de controle de 9 ou menos gasta a Ação
    e rola DV10, no computador dele; falhou, perdeu o controle, e o mestre decide (o cartão tem o botão "Batida").
  - **Manobra:** o botão na linha do veículo abre as manobras do tipo dele (desviar, curva fechada e parada de emergência
    DV13; cavalo de pau e salto DV17; no aéreo, pouso DV13 e acrobacia DV17), pela janela de rolagem.
  - **A perícia de controle** vem do tipo do veículo (Conduzir, Pilotar Aéreo ou Pilotar Marítimo). Na ficha do veículo,
    "Tipo" fica "Pelo nome" (os 14 do CORE) ou escolhe terrestre, aéreo ou marítimo.
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
- **Armas de 2077** (a página de 2077 da wiki: as três classes pelo Mission Kit, a Smart desde o ciclo 110, a Power desde o 114 e a Tech desde o 115). A classe aparece ao lado do nome da arma, e os modos são botões na linha dela:
  - **Power** (o Mission Kit, ciclo 114): a lesão crítica causa 10 de dano bônus (no lugar de 5). O botão **Ricochete** acerta um alvo atrás de cobertura ou fora da linha de visão: −4 no ataque (−2 com o Ballistic Coprocessor instalado); num tiro mirado, só a penalidade dele. O alcance, a DV e o dano são os da arma. Com cartucho, o leque de 6 m sai da superfície do ricochete: o sistema não confere os 6 m de quem atira, e o mestre confere quem está no leque e o caminho livre.
  - **Tech** (o Mission Kit, ciclo 115): o botão **Carregar** (gasta a Ação de Movimento) deixa a arma carregada até disparar ou por 20 rodadas (fora do combate, até disparar); o chat avisa, e o botão vira "Carregada" (clicado, descarrega). Carregada, o próximo ataque que não seja explosivo nem fogo supressivo é de CDT 1, ignora metade do SP do alvo (arredondada para cima) e atravessa cobertura fina, que não perde HP (a grossa, o mestre decide). O "Desfazer" do mestre devolve a carga.
  - **Smart** (o Mission Kit, ciclo 110): só dispara ligada pelo Personal Link (os Interface Plugs; o Neuroport já os traz) ou pelo Subdermal Grip instalados. Sem a ligação, a ficha avisa e o ataque não gasta bala. Com ela, +1 em todo ataque à distância da arma (o tiro, o mirado, o autofogo), somado a REF + perícia. O Smart Link de 2077 de um personagem antigo vale o Subdermal Grip.
  - **Munição Smart melhorada** (o Kit, ciclo 112): só na arma Smart ligada. As penalidades de visão da janela de rolagem (a pouca luz e a tarefa encoberta por fumaça, escuridão etc.) não contam, e o cartão diz quais saíram. O ataque à distância que erra a DV (ou a esquiva) por 5 ou menos tem a segunda chance na hora: 14 + 1d10 no lugar de REF + perícia + os bônus, com as penalidades do primeiro tiro. Quem atacou rola, no computador dele, pela janela de rolagem (com a Sorte); sem resposta, o mestre rola. No cartucho e no explosivo, a segunda chance é contra a DV da área.
  - **Balas por tiro** (a wiki, ciclo 113): o tiro único (o tiro, o mirado, o ricochete e o cartucho) gasta as balas do modelo: 3 na Yukimura, na Shingen, na Chao, na Kappa, na Masamune e na Nowaki. Com menos no pente, dispara o que tem e causa o dano menor (2d6; 4d6 na Masamune e na Nowaki). A Zhuo gasta 8 cartuchos Smart melhorados e causa 4d6; com menos de 8 não dispara, e só carrega a munição Smart melhorada. A dica do "Atacar" diz quantas balas, e o cartão, quantas saíram.
  - **Regras de cada modelo:**
    - **Dois canos:** o botão dispara os dois de uma vez e gasta 2 cartuchos. Na Palica e na Testera, o dano sobe para 4d6.
    - **Kappa:** com dois alvos marcados, se o tiro (não o mirado) não pegar o primeiro, as balas vão para o segundo, a até 4 m dele.
    - **Dian:** o botão Recolher recolhe a coronha. Dá para esconder a arma, mas os ataques têm −1 até estender.
    - **Unity:** no tiro mirado, o dano é 4d6.
    - **Carnage e Burya:** quem dispara a Carnage sem BODY 10, ou a Burya sem Grafted Muscle and Bone Lace nem cyberbraço, sofre a lesão crítica Músculo rompido ou Braço quebrado (se ainda não tiver), pela configuração "Lesão crítica"; o "Desfazer" a tira.
    - **Grad:** depois de cada tiro, o botão "Manejar o ferrolho" (uma Ação) libera o próximo; antes, ela não dispara.
    - **A carga de cada uma:** a Burya carrega sem gastar a Ação de Movimento; a Omaha fica carregada até o fim do turno em que disparou, com CDT 2 e até 3 balas por ataque; a Nekomata atravessa cobertura fina e grossa.
    - **O resto** (o +1 entre 13 e 50 m da Nowaki, o supressivo da Senkoh), o mestre resolve: a descrição da arma diz.
- **Inventário** (aba Equipamento): equipamento, roupas e drogas, com a quantidade (− e +, sem passar de 0; nas drogas, as doses; ciclo 67) e o uso (equipado, carregando ou guardado; o botão da linha passa de um para o outro). O equipamento de ativação à mão que tem efeito ganha o "Usar" (na linha e na ficha do item; ciclo 71), que liga e desliga os efeitos dele.
  - **Mãos livres** (C12, ciclo 87): equipar arma ou escudo confere se cabe nas duas mãos mais os bônus dos efeitos.
    Cada arma ocupa as mãos que pede; com BODY 8+, a arma branca de duas mãos ocupa uma. Cada escudo equipado ocupa
    uma, mesmo sem HP. Sem mãos livres, o item fica guardado e o aviso diz qual foi recusado; guardar libera as mãos.
    Vale na ficha do personagem, na caixa da ficha do item e ao arrastar para personagem ou capanga, inclusive de
    uma origem já equipada. A criação e a importação preservam o estado recebido dos itens.
  - **Efeitos do equipamento** valem conforme o uso, como no CORE: o Agent (+2 em Pesquisa em Biblioteca) e o Techscanner valem equipados ou carregando; o Medscanner e o Linear Frame, só equipados. Medscanner e Techscanner não acumulam com outro do mesmo tipo, inclusive o instalado no cyberbraço. Guardar ou desligar o primeiro deixa a outra cópia valer; os outros bônus continuam.
  - **Luzes:** Usar liga e desliga a lanterna e o sinalizador no token, com alcance de 100 m. Duas fontes não somam alcance, e uma luz original maior continua valendo. A cor, o ângulo e a luz salva na cena são preservados. Lanternas de antes do C16 também funcionam. O sinalizador gasta uma unidade e apaga após uma hora; esgotado, não pode ser reutilizado. A carga da bateria da lanterna continua sob controle do mestre.
  - **Drogas** vêm com os efeitos desligados. Usar toma uma dose e liga o primário (o Boost dá +2 INT).
  - **"Usar" a droga** (ciclo 78; a wiki, "Drogas de rua", p. 227–229), na linha do inventário e na ficha da droga: gasta a dose e liga o efeito primário (sob efeito, a dose a mais estende); o Black Lace tira 2d6 de Humanidade. Quando o efeito acaba ("Acabou"), quem tomou rola WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário (Black Lace e Boost 17; Blue Glass, Smash e Synthcoke 15): superando, nada fica, e o Black Lace devolve a Humanidade; senão, o vício liga e fica até a terapia ("VICIADO"). No Black Lace e no Synthcoke, o −2 do vício vale só fora do efeito: enquanto o primário dura, ele fica suspenso. As outras drogas (Speedheal, Stim...) não têm efeito secundário: "Usar" gasta a dose e liga o efeito, se houver.
  - **Duração (C16):** o relógio do mundo encerra Black Lace e Boost após 24 horas; Blue Glass, Smash e Synthcoke após 4 horas; Stim após uma hora. Cada dose adicional soma a duração ao prazo restante, sem duplicar o bônus. O encerramento automático é resolvido apenas pelo mestre ativo, uma vez por fim, inclusive ao voltar ao mundo e nos capangas soltos de cenas não vistas. Uma dose tomada após o prazo resolve primeiro o secundário anterior. O Black Lace devolve apenas a Humanidade que realmente retirou. Cliques simultâneos no mesmo cliente entram em fila. O estoque de um contêiner não toma drogas. Tomadas antigas sem prazo conservam o botão Acabou; os efeitos narrativos, as curas e as restrições médicas continuam com o mestre.
  - **Roupas** guardam o tipo e o estilo, com os nomes da loja da wiki.
  - **Netrunning:** o cyberdeck (os slots, com os programas instalados nele e quantos slots ocupam) e os programas (classe, ATK, DEF, REZ, o dano e o deck onde estão). Só aparece na ficha de quem tem um dos dois. O combate na NET fica na aba NET.
  - **Upgrades e acessórios:** cada um diz onde instala (arma, cyberdeck ou veículo), quantos slots ocupa e em que item está. Instalado numa arma, o carregador estendido ou tambor troca o tamanho do pente (o rifle de assalto vai de 25 a 35 ou 45, como a tabela de carregadores da wiki), e o Smartgun Link dá +1 nos ataques à distância, com os plugs de interface ou o plug subdérmico instalados (o mesmo acessório duas vezes não soma). Na arma, o que não cabe nos slots (3 na de longo alcance que não é exótica) e o segundo carregador são recusados, com o aviso (o C11, parte 4, ciclo 136); a montagem que vem da wiki entra como veio. Tirado o carregador, o pente que passa do máximo volta a ele, e as balas a mais voltam para a munição. O hardware ocupa slots do deck.
  - **O acessório que é arma** (o C11, parte 3, ciclo 135; o secondaryWeapon do CORE): a baioneta (arma branca leve, 1d6), o lança-granadas sob o cano (6d6, uma granada) e a espingarda sob o cano (5d6, dois cartuchos), instalados numa arma, dão a arma deles na aba Combate, marcada "Em <a arma>", pronta só com a arma onde estão equipada e sem mãos a mais. Ela ataca, recarrega e gasta o pente como as outras, e fica fora do inventário e da ficha que volta para a wiki. Tirado o acessório, ou apagada a arma onde ele está, a arma dele sai, e as balas do pente voltam. A ficha do acessório de arma tem o "É arma" e os campos, como a do cyberware.
  - **Veículos:** SDP, assentos, MOVE (a velocidade de combate) e a velocidade narrativa. Os upgrades instalados somam SDP e assentos (o Chassis pesado dá +20 SDP; o Upgrade de assento, +2 assentos). Os da família do Nomad vêm marcados. A ficha seleciona um único veículo em uso e permite marcar quando o personagem dirige. Trocar o veículo encerra a direção; os demais ficam na frota.
    O Chassis blindado dá SP13, com ablação própria. Ao atacar o token do ocupante, escolha a pessoa, o veículo ou uma janela registrada: o dano ao SDP usa dano menos SP, sem +5 ou lesão crítica, e o veículo não esquiva. Cada janela conserva seu HP: vidro blindado tem 15 HP ou 30 com a segunda instalação. O tiro que destrói o vidro perde a sobra; a explosão que o destrói passa inteira para o ocupante. Tech carregada atravessa vidro fino sem danificá-lo; a Nekomata também atravessa o grosso. Nesse caso, a pessoa conserva sua defesa e armadura. A espessura usa o máximo original da janela. O cartão permite desfazer pela diferença.
    No upgrade instalado, **Preparar arma** cria uma única arma vinculada à instalação: metralhadora (30 balas, só Autofogo, voltada para a frente), lança-chamas ou arma branca muito pesada. Elas aparecem sob o veículo, sem ocupar mãos. Metralhadora e lança-chamas não recarregam enquanto o personagem dirige. Na ficha do veículo, adicione as janelas e use **Ajustar vidros** ao mudar os upgrades; o ajuste conserva o dano de cada janela. **Dirigir** controla a restrição de recarga. Mãos no volante, iniciativa, MOVE, manobras, orientação e condições descritivas de instalação continuam com o mestre.
- **Compêndios**, na pasta "Cyberpunk RED — Fieldbook": Armas, Armaduras, Munição, Cyberware, Equipamento, Roupas, Drogas, Netrunning (cyberdecks, programas e os 12 Black ICE da wiki, o Black ICE próprio do netrunner), Upgrades e acessórios, Veículos, Armas de 2077, Cyberware de 2077, Netrunning de 2077, Lesões críticas, Personagens de exemplo e Arquiteturas da NET (estas duas, escondidas dos jogadores). Os exemplos são um Solo e um Capanga, com armas carregadas, armadura vestida e cyberware instalado, prontos para testar o combate.
- **Cyberware:**
  - **Instalar** desconta a Humanidade pela perda rolada (Shift: pela média).
  - **Fundação e opções** (ciclo 82; a wiki: "Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e externo usam slots de categoria"): cada fundação tem os slots de opção dela (o Neural Link 5, o Cybereye 3, o Cyberaudio Suite 3, o Cyberarm 4, o Cyberleg 3, o Sensor Array 5; de 2077, o Neuroport 5; as outras, os do CORE; o Kiroshi e as placas de 2077 saíram com a wiki de 2026-10-17, ciclo 108), e cada opção ocupa o tamanho dela. A opção instalada entra na fundação instalada do mesmo tipo em que ainda cabe (a que ela já aponta, se cabe; senão, a do lado dela, ou a primeira; ciclo 126); o Sensor Array recebe as opções do Cyberaudio. Sem nenhuma, a opção entra assim mesmo, sem fundação, com um recado; a fashionware e o cyberware interno e externo não pedem fundação. Tirar a fundação deixa as opções dela instaladas, sem fundação. Na ficha do cyberware, os slots da fundação (ou os que a opção ocupa) se editam, e o alto diz em qual fundação a opção está; na opção instalada, o seletor "Fundação" (ciclo 84) a muda entre as instaladas em que ela cabe, ou a deixa sem fundação.
  - **O lado** (ciclo 121; a wiki do master de 2026-10-17, `personagem-cyberware.js`): o cyberbraço, a cyberperna e o cyberolho ficam no esquerdo ou no direito, com os ids da wiki (`braco-esquerdo`, `olho-direito`…). A fundação e a peça solta escolhem o lado na ficha do item; a opção numa fundação fica no lado da fundação (a ficha mostra, sem seletor), e trocar o lado da fundação leva as opções junto. O alto da ficha do item e a aba Cyberware mostram o lado.
  - **O membro natural** (ciclo 126; a wiki do master de 2026-10-18): a peça única (os Wolvers, as Rippers, o Talon Foot e as outras da lista da wiki, `regras.PECAS_UNICAS`) com lado e sem cyberbraço ou cyberperna instalado daquele lado fica no braço ou na perna natural, sem pedir fundação. Cabe uma por membro: a primeira, na ordem da ficha; as outras pedem uma fundação. A aba Cyberware e o alto da ficha do item mostram "braço natural" ou "perna natural", e instalar avisa onde a peça ficou. A opção com lado só entra na fundação do mesmo lado (ou numa sem lado); o cyberbraço que passa para o lado da peça a tira do natural, e ela pede a fundação.
  - **O cyberware que é arma** (o C11, parte 1, ciclo 133; o isWeapon do CORE): os doze do compêndio do CORE que atacam (os Wolvers, as Rippers, as Scratchers, o Big Knucks, o Slice 'N Dice, o Talon Foot, os Vampyres, a Cybersnake, o Dartgun e as Popup Melee, Ranged e Grenade Launcher) trazem a arma deles. Os quatro do Kit também, desde o ciclo 134 (a parte 2a): a Gorilla Arm e a Mantis Blade, arma branca pesada excelente (3d6, CDT 2, +1 no ataque); o Monowire (3d6, CDT 2); o Projectile Launch System, lança-foguetes de um tiro (8d6) que carrega foguete ou granada. Das regras próprias deles (a parte 2b, ciclo 138; decisão do usuário: só o que é conta), o Projectile Launch System com granada é lança-granadas (6d6, a DV do lança-granadas), e o Monowire, na lesão crítica, rola duas lesões num cartão, em que o mestre aplica a que quem atacou escolher; os 6 m dele vão como nota no ataque. Instalado, o cyberware ganha a sua arma na aba Combate (e no Painel Tático), marcada "Cyberware", sempre pronta e sem ocupar as mãos: ataca, mira, recarrega e gasta o pente como as outras. Ela fica fora do inventário e da ficha que volta para a wiki. Com o EMP no cyberware, ela não ataca. Desinstalado, desligado ("É arma") ou apagado o cyberware, a arma sai, e as balas do pente voltam para a munição delas. A ficha do cyberware tem o "É arma" e os campos da arma (a perícia, o dano, o CDT, o bônus, o pente, a armadura ignorada, à distância), e a arma acompanha o que muda nela.
  - **Rolar Humanidade** (na ficha do cyberware de um personagem; ciclo 73): rola a perda da peça sem instalar, num cartão "HUMANIDADE" com o "Aplicar" do mestre, que tira o total da Humanidade atual do dono uma vez (o cartão passa a dizer o que mudou). Para o que a mesa quiser rolar fora da instalação, como uma peça que já veio instalada.
  - **Humanidade máxima:** 10 × EMP, menos 2 por peça instalada que tem perda de Humanidade (borgware, menos 4). Peça sem perda, como o cyberware grátis de 2077, não reduz.
  - Os efeitos do cyberware só valem instalado. O Kerenzikov, por exemplo, dá +2 na iniciativa.
  - **Tirar** não devolve a Humanidade perdida: o máximo volta a subir (a peça deixa de contar), e a Humanidade perdida só volta com terapia, como na wiki e no CORE.
  - **Editor de Dor:** tira só a penalidade de gravemente ferido (−2); a de mortalmente ferido (−4) continua.
- **Janela "Personagens da wiki"** (só o mestre; botão no alto da aba de Atores): cada personagem da wiki com o que dá para fazer neste mundo, que é importar (como foi criado; "Importar de novo" quando o ator do Foundry 14 sumiu), importar da mesa (como está na ficha da mesa) ou abrir a ficha, com o dono no Foundry escolhido na linha. Cada personagem diz onde está: neste mundo; o ator do Foundry 14 apagado ou em outro mundo; no Foundry 12; e de qual Foundry é a ficha da mesa. Cada Foundry tem o seu vínculo na wiki (este manda `geracao: 14`): importar aqui não tira o do 12, e o ator importado que é apagado avisa a wiki. Também mostra os pedidos da loja que esperam o mestre, com Aprovar (entrega na hora) e Recusar (com o motivo, que o jogador vê). Os avisos da última importação ficam no alto. Pela macro: `game.system.api.abrirJanelaDaWiki()`.
- **Campanha da wiki de cada mundo** (C27): a janela, as importações, a ficha que volta à wiki e os pedidos usam a
  campanha configurada no sistema; sem configuração, a que tem este "Mundo do Foundry" na wiki ou, havendo uma só, ela
  (o mestre ativo grava essa escolha). A janela mostra o nome da campanha. Com várias e sem correspondência, mostra
  todas com o nome de cada campanha e a orientação para escolher; os pedidos ficam bloqueados, inclusive pelas macros.
  Uma wiki sem a API de campanhas continua funcionando sem filtro. Pela macro: `game.system.api.wiki.campanhaDoMundo()`.
- **Crossover entre mundos do sistema** (C27): ao mover um personagem de campanha na wiki, o mestre ativo do mundo
  antigo manda o ator completo quando consulta a lista ou entrega pedidos (também na verificação de cada minuto).
  O ator fica no mundo antigo, marcado como saiu, sem mandar a ficha nem receber pedidos. Na campanha nova,
  **Importar** traz HP, dinheiro, extratos, itens e efeitos como estavam, preservando os IDs dos itens e os vínculos
  entre eles, e escolhe o dono deste mundo. Só depois de vincular o novo ator na wiki a transferência é apagada.
  Sem a ficha antiga, a importação usa a criação da wiki e informa isso nos avisos.
  O transporte usa a rota existente da wiki, com um envelope identificado do Fieldbook. Ele é exclusivo entre mundos
  deste sistema: não deve ser consumido pelo importador do Foundry 12. A ficha bruta do CORE é recusada aqui; para
  migrar do 12, use **Importar da mesa**. Uma transferência existente de outro formato é preservada e vira aviso.
- **Atualizar da wiki:** na linha do personagem que já está neste mundo e no topo da ficha, o mestre abre a revisão por grupos: STATs, perícias, Roles e sub-habilidades, itens novos, Lifepath, moradia e estilo de vida, retrato e montagem de itens soltos. Só aplica o que estiver marcado; cancelar conserva a ficha. HP, Humanidade, dinheiro e Sorte atuais ficam como estão, e o histórico dos UIDs impede repor equipamento gasto ou perdido. Roles manuais são preservadas; se não houver espaço para as da wiki, o grupo explica o conflito. Grupos desmarcados ou com falha continuam pendentes. O ator que foi para outra campanha (o crossover) não atualiza. Pela macro: `game.system.api.wiki.atualizarDaWiki(ator)`.
- **Retrato da wiki:** a importação da criação e a migração da mesa copiam a imagem para a pasta do mundo e a aplicam à ficha e ao protótipo do token. Uma atualização também muda os tokens ligados. Se o download de um link HTTPS com extensão de imagem falhar, usa o link; uma imagem privada da wiki que não puder copiar vira aviso. Tirar o retrato na wiki preserva a imagem escolhida na mesa.
- **Avisos de envio:** ao entrar e a cada minuto, o mestre ativo consulta os personagens enviados e os pedidos que esperam revisão, avisa uma vez por envio neste navegador e mundo e abre a janela. O botão "Avisos de envio" consulta mesmo com os avisos automáticos desligados; pela macro, `game.system.api.wiki.avisosDaWiki({ manual: true })`. Usa o vínculo do Foundry 14 mesmo quando o personagem também tem o do 12. Os pedidos aprovados continuam sendo entregues com os avisos desligados.
- **Importar da wiki:** `game.system.api.wiki.importarPersonagem(id)` cria o ator a partir do personagem feito no criador da wiki:
  - STATs, HP, Humanidade, perícias (com Linguagem e Especialista Local), Role com as sub-habilidades (Face e Corpo, que saíram, entram como Rockerboy e Exec) e a segunda Role, se tiver (o sistema pede as duas à wiki), e dinheiro (no extrato, a linha "Dinheiro inicial (criador da wiki)");
  - o apelido, o Lifepath (em texto, como o criador da wiki monta) e a moradia, o estilo de vida, o Trauma Team e a moda (C22);
  - armas carregadas, armaduras vestidas e cyberware instalado, com o lado de cada peça (o sistema pede à wiki o `locais=1`: sem ele, a wiki recusa o personagem com lado; ciclo 121);
  - equipamento, roupas e drogas, com a quantidade e o uso da montagem da wiki (equipado, carregando ou guardado);
  - o cyberdeck, com os programas e o hardware instalados nele, e os acessórios nas armas, como a montagem da wiki (com o carregador maior, a arma entra com o pente maior cheio);
  - os veículos da família do Nomad, com os upgrades instalados e o SDP cheio.

  A wiki marca o personagem como "no Foundry".
- **Na mesa:** a cada mudança num personagem que veio da wiki (HP, dinheiro, munição, itens, lesões…), o mestre ativo manda a ficha de volta, 4 s depois da última mudança, e a wiki a mostra no lugar da ficha da criação. O formato é o mesmo do módulo cpr-2077 do Foundry 12, então a wiki não muda. O cyberware vai com o lado (`local` no instalado, `localPlanejado` no que espera instalar), o tipo, o tamanho e os slots (`cyber`) e os ids do que está dentro (`dentroIds`), que a aba Cyberware da wiki desenha (ciclo 121); a peça única no membro natural vai com `natural: true`, como na montagem da wiki (ciclo 126). Pela macro: `game.system.api.wiki.mandarFicha(ator)`; para mandar já o que está esperando, `mandarPendentes()`.
- **Importar da mesa** (a migração do Foundry 12): `game.system.api.wiki.importarDaMesa(id, donoId)` monta o ator pela ficha "Na mesa" que o Foundry 12 mandou para a wiki, com o estado de jogo:
  - HP, Humanidade, Sorte, dinheiro, IP, reputação, a Role (Face e Corpo entram como Rockerboy e Exec), as perícias, a moradia, o estilo de vida e o Trauma Team (e a moda, da criação da wiki; C22) e as lesões (pelo nome do CORE). No extrato, o dinheiro, o IP e a reputação entram com a linha "Migrado da ficha da mesa do Foundry 12": o histórico do ledger do Foundry 12 não vem, porque a ficha "Na mesa" só manda o saldo;
  - os itens como estavam: equipados ou guardados, o pente carregado e com qual munição, o SP que sobrou, o cyberware instalado, o que está dentro do deck, da arma e do veículo, e a opção de cyberware na fundação dela (ciclo 83), com o lado (o instalado na mesa ou, sem ele, o planejado na wiki; ciclo 121). A base Meat Arm ou Meat Leg do Foundry 12 não entra: a peça dela fica no membro natural do lado (ciclo 126);
  - cada item acha o catálogo pelo uid da wiki (da criação, de um pedido, da família do Nomad) ou, sem uid, pelo nome do CORE. O que não achar vira aviso;
  - os STATs base vêm da criação: a ficha da mesa manda os de agora, já com a armadura e as lesões, que aqui voltam pelos itens.
- **Pedidos da loja:** o jogador pede na loja da wiki e o mestre aprova na página do personagem, na wiki. A cada minuto, o mestre ativo entrega o aprovado: cria os itens (no lugar e com a munição que o jogador pediu), desconta o dinheiro (no extrato, "Compra na wiki: " e os itens) e marca o pedido como entregue. O cyberware chega sem instalar (instale pela ficha, que rola a Humanidade). Sem dinheiro na mesa, o pedido fica aprovado com o erro, e a wiki mostra "Tentar de novo". Cada item leva o uid do pedido, então nada sai em dobro. Pela macro: `game.system.api.wiki.entregarPedidos()`. Tudo o que a loja da wiki vende existe aqui (o CORE e o 2077, o do Mission Kit e o do suplemento de fã), **menos o Black Chrome**, que ainda falta. Um item que não existir vira aviso e não conta como entregue para a wiki.
  - **Só o ator ligado:** entrega e manda a ficha só o ator ligado ao personagem na wiki (o da última importação). Uma cópia antiga no mundo, ou o mundo antigo do Foundry 12 aberto depois da migração, a wiki recusa (409 "ator antigo"), e o sistema para de mandar sem avisar.
- **Migração dos dados entre versões do sistema** (o `dataModelVersion` e o MigrationRunner do CORE): o mundo guarda a versão dos dados numa configuração escondida. Quando o mestre ativo entra num mundo com dados de uma versão anterior, o sistema confere os itens e os atores do mundo, os tokens não ligados e os compêndios do mundo:
  - se algum passo muda alguma coisa, pergunta antes, com o que muda, os passos e o aviso do backup. "Depois" deixa os dados como estão, e ele pergunta de novo da próxima vez;
  - migrado, grava a versão e deixa o registro no chat, só para os mestres (os passos e o que mudou). O compêndio trancado abre só durante a migração;
  - se nada muda (o mundo novo), só grava a versão, sem perguntar. Dados de uma versão mais nova que a do sistema só avisam;
  - se um documento falha, para e avisa, e o mundo fica na versão de antes. Os passos só mexem no formato antigo, então rodar de novo não estraga nada;
  - o oitavo passo (ciclo 135): o mesmo para o acessório que é arma (a baioneta e as armas sob o cano);
  - o sétimo passo (ciclo 134): o mesmo para os quatro do Kit, no mundo que já passou do sexto;
  - o sexto passo (ciclo 133): o cyberware do catálogo que é arma (os Wolvers…) ganha a arma que o catálogo passou a trazer, uma vez (a marca `armaMigrada`: o "É arma" desligado depois não volta);
  - o quarto passo (ciclo 83): a fundação de antes do ciclo 82 ganha os slots do catálogo, e cada opção já instalada vai na primeira fundação instalada do mesmo ator em que cabe (a decisão do usuário de 2026-10-16); a que não couber fica sem fundação, marcada na ficha;
  - o terceiro passo (ciclo 40): os boosters de Interface que vieram do catálogo antes do efeito ganham o +2 na
    habilidade deles;
  - os dois primeiros passos: o TeleOptics do RED sem o +1 de sempre do CORE (desde o ciclo 26 vale a regra da wiki, pela distância) e o tipo do cyberware que a ficha do item trocava por Fashionware até o ciclo 7. Pela macro: `game.system.api.migracao.migrarMundo()`. Passo novo: veja o começo de `scripts/migracao.mjs`.

## Configurações (Configurações → Sistema)

As opções de combate, com os padrões da mesa:
- **Resolver os ataques** (padrão: sim). Desligado, só a rolagem do ataque.
- **O jogador rola os próprios dados** (padrão: sim). Desligado, a reação continua, mas sem janela pessoal dos dados; o dano fica com o mestre.
- **Dano:** Automático ou Manual (botão do sistema), padrão Automático.
- **Esquivar de tiros exige REF 8+** (padrão: sim).
- **Quem atacou rola o dano** (padrão: sim).
- **Tempo para o jogador responder** (padrão: 60 s).
- **Defesa dos NPCs:** o mestre escolhe, ou automática (padrão: o mestre).
- **Lesão crítica:** na ficha, só anunciar, ou desligada (padrão: na ficha).
- **Lesões críticas repetidas:** desligado (permite outra cópia), avisar e permitir, ou rolar novamente (padrão;
  opção do mundo). Lesões certas de golpes e perigos continuam idempotentes.
- **Mortalmente ferido sofre lesão a cada acerto** (padrão: sim).
- **Death Save no começo do turno:** jogadores e NPCs, só jogadores, ou desligado (padrão: todos).
- **Explosivos pegam toda a área** (padrão: sim).
- **Fogo supressivo sem alvo pega todos à vista** (padrão: sim).
- **Esconder o total do ataque até a defesa** (padrão: sim).
- **Quem vê o cartão do resultado:** todos, os envolvidos (o mestre, quem atacou e os donos dos alvos) ou só o mestre (padrão: todos). O texto em cima do token segue o cartão.
- **Efeitos na mesa:** o texto em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A, a animação do acerto e do erro; só o texto; ou nada (padrão: texto e animação).

As três do módulo cpr-2077 para as armas de 2077 saíram com o Mission Kit: as duas do ataque Smart no ciclo 110 e a da carga Tech que esfria uma rodada no 115.

A do NET Architect:
- **O jogador rola as rolagens da NET** (padrão: sim): as rolagens do netrunner abrem a janela de rolagem no computador do jogador; sem resposta no tempo para o jogador responder, o mestre rola. Desligado, o mestre rola sempre, com a Sorte preparada na ficha.
- **Inimigos da NET no combate** (padrão: sim): o Black ICE, os demônios e os netrunners inimigos (com ficha) encontrados entram na iniciativa, com um token escondido no ponto de acesso; na vez deles, o mestre escolhe quem atacar.
- **Iniciativa explode no 10 e no 1?** (padrão: não): desligado, mantém o `1d10` sem crítico que a mesa já usava; ligado (como o padrão do `criticalInitiative` do CORE), a iniciativa rola `1d10crit` (o 10 soma mais um d10 e o 1 tira um d10).

E as da wiki:
- **Endereço da wiki** (padrão: vazio). Vazio, o sistema deduz como o cpr-2077: `wiki.<domínio>` quando a mesa abre em `mesa.<domínio>` (o servidor), ou `http://localhost:8000` com tudo no mesmo computador.
- **Campanha da wiki** (padrão: vazio): o id na página Campanhas. Vazio, resolve pelo Mundo do Foundry cadastrado na
  wiki ou pela campanha única; a escolha é consultada de novo a cada minuto e ao mudar a configuração ou o endereço.
- **Mandar a ficha para a wiki** (de cada navegador; padrão: sim): veja "Na mesa".
- **Avisos da wiki** (de cada navegador; padrão: sim): avisa o mestre sobre novos envios e pedidos pendentes. Desligar não suspende a entrega dos pedidos aprovados.

E a do navegador de cada um:
- **Confirmar ao apagar item:** ligada por padrão. Itens instalados e a decisão sobre conteúdo continuam exigindo
  confirmação nas fichas de personagem, capanga e contêiner.
- **Rolar direto, sem a janela de rolagem** (padrão: não, como no CORE): ligado, o clique rola na hora e Ctrl + clique abre a janela.
- **O Painel Tático** (ciclo 125): mostrar o painel (padrão: sim), sem token selecionado mostrar o meu personagem (padrão: sim), escolher o alvo antes do ataque (padrão: quando não houver alvo marcado) e o estilo do painel.

## Ainda não faz

- **Os NPCs prontos do CORE** (o capanga se faz à mão, com a ficha de capanga).
- **O Black Chrome** (176 itens da loja da wiki): o importador e os pedidos avisam e não entregam.
- **As regras de 2077 do Mission Kit:** as três classes seguem o Kit (a Smart desde o ciclo 110, a munição Smart
  melhorada desde o 112, as balas por tiro desde o 113, a Power desde o 114 e a Tech desde o 115). As regras próprias
  dos modelos também, desde o 116. O Rebuild ainda não tem regra. Os itens já existem, com a classe e as regras guardadas na
  flag `arma2077`.
- **A mão e o BODY do cyberware que é arma do Kit** (decisão do usuário, 2026-10-19): a mão do braço que não segura nada com a Mantis Blade ou o Projectile Launch System para fora e o BODY 11 da Gorilla Arm ficam com o mestre.
- **Os opcionais de Role da wiki** (o Investigator do Lawman, o desconto do clã do Nomad): ficam com o mestre.
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
  - 41 armas, os 3 Rebuilds e as 9 munições Smart melhorada do Kit;
  - 37 cyberwares (com o Neuroport e as opções do Kit) e a droga Immunoblockers;
  - 21 cyberdecks e 16 quickhacks (os 11 do Kit e os 5 do suplemento; não se compram).
  - São os 112 itens de 2077 da loja da wiki de 2026-10-17 (o Mission Kit e o que a revisão do suplemento de fã deixou;
    eram 157), e mais os quickhacks (ciclo 106).

  A classe de cada arma (Power, Tech ou Smart), a origem (Kit ou fã) e as regras próprias dela ficam na flag `arma2077`, que os modos de 2077 leem (`regras.mjs`, `perfil2077`). As três classes seguem o Kit (ROADMAP).
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
  - o C16: prazos e doses adicionais, empate no secundário, retorno ao mundo, o capanga de outra cena, a Humanidade realmente perdida e o estoque que não toma drogas; scanners duplicados e implantados; a lanterna antiga e o sinalizador com prazo, nos clientes do mestre e do jogador, conservando a luz original;
  - a ficha do item no jeito da maquete: numa pistola, o tipo na cor dele, o resumo, a etiqueta da qualidade, as três abas (a troca pelo clique) e as células; num cyberdeck, o uso pelos três botões, que grava;
  - mãos livres (C12): limite exato, recusa na ficha e no item, a caixa que volta ao estado gravado, o drop de uma
    origem equipada, as mãos do cyberware, BODY 7 e 8, o escudo sem HP e guardar mesmo num excesso antigo;
  - falha da arma (C13): padrão e seletor salvo, os quatro efeitos no cartão e na flag, inclusive acertando; sem aviso
    na arma padrão/excelente, na rolagem comum e com a Recuperação de Falhas do Solo; o ataque do jogador, com o total
    escondido, conferido nos dois clientes;
  - "Consertar" na ficha da armadura: o SP gasto volta ao máximo e o cartão "CONSERTO" diz quem consertou; inteira, o aviso, sem outra mensagem;
  - armadura (C18): maior SP atual por local, todas as camadas abladas, Desfazer por diferença, fichas de personagem e
    capanga, ataque perfurante em token solto e permissões no navegador do jogador, inclusive estoque protegido;
  - "Rolar Humanidade" na ficha do cyberware e "Aplicar" no cartão: a perda rolada sem instalar, tirada uma vez da Humanidade do dono pelo botão do mestre;
  - "Atacar" e "Recarregar" na ficha da arma (a janela no clique, direto com Ctrl; o pente cheio da munição carregada) e o SP da armadura em caixas, com o "−1" até o 0;
  - "Rodar" e "Restaurar REZ" na ficha do programa: sem o "Rodar" fora do deck; no deck, liga e desliga; a REZ perdida volta;
  - "Usar" a droga: o Black Lace (a dose, o primário, os 7 de Humanidade, o teste de 18 contra DV17 que os devolve) e o Boost (+2 INT; o teste de 15 contra DV17 vicia: −2 INT e a marca);
  - a correção rápida e o tratamento da Perna quebrada por um Medtech de teste: a correção (14 contra DV13) tira o −4 de MOVE até o "Voltou"; o tratamento empatado (15 contra DV15) falha, e o de 16 tira a lesão;
  - o tiro com crítico, ablação e Lesão Crítica, e o Desfazer;
  - lesões fora do ataque (C19): rolagem nas duas fichas sem alterar HP, cancelamento, repetição e tabela esgotada,
    paliativo cervical, Cybertecnologia, efeitos anteriores, token solto, permissões, concorrência, criação recusada e
    DV alterada durante a janela ou a rolagem; escolha do Monowire preservada quando a criação é recusada, permitindo tentar novamente;
  - o dano rolado à parte pelos botões do cartão: "Aplicar dano" no alvo marcado (com a armadura, e o Desfazer) e, no crítico, os +5 sem a lesão e "Rolar a lesão" uma vez por alvo, de novo depois de a ficha recusar a lesão;
  - o clique duplo no "Desfazer" (o segundo no meio do primeiro): o HP volta uma vez só;
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
  - o ponto de acesso à NET, nos dois navegadores: a configuração pelo HUD do Tile (as arquiteturas do mundo e do compêndio; o Tile sem imagem fica sem, e o com a de terminal do sistema perde a imagem), o marcador (o oculto, só para o mestre), o jogador a 7 m que não conecta (nem pedindo direto ao mestre) e que conecta com o Range Upgrade (a flag, o status, o anel e a janela com o andar 1 como "?"), a queda ao sair do alcance, o "Desconectar" da janela, o reinício só pelo mestre e o token e o Tile apagados;
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
  - o compêndio das arquiteturas: os 3 exemplos e as do documento da campanha, se houver, escondidas do jogador, e o Apartamento de um fixer no mapa;
  - a arquitetura da NET: a ficha com os andares da clínica de ripperdoc e o mapa (o ramo B sai do andar 2), o andar novo, a linha que vira Black ICE e a linha tirada;
  - o programa de Black ICE do netrunner: o Hellhound do compêndio de Netrunning instalado no deck (2 slots), com o tipo e os números na aba NET e na ficha do item;
  - o Black ICE rezzado: o Hellhound ativado no deck põe o token ao lado do netrunner (pelo mestre, também quando o jogador ativa no computador dele), a REZ que o token perde volta para o programa, e desativar ou zerar a REZ tira o token;
  - o dano do Black ICE e na REZ dele: o Hellhound pela ficha no cérebro (o Shield ativo não o para, o Armor reduz), o Killer num programa (o aviso de que o destrói), o Sword em Black ICE e o Zap na REZ do Black ICE e do demônio da cena, e o Zap do demônio só no intruso;
  - o Black ICE e o demônio: o token solto com a REZ na barra, o modelo da wiki (o Hellhound e o Efreet), as rolagens pela janela e com Ctrl + clique, a REZ e o nome na ficha do token, a iniciativa no topo da fila (sozinho e no "rolar todos") e a arma que não os atinge;
  - o Painel Tático (ciclo 125): a barra do token controlado (vazia sem token), o retrato por estado de ferimento, os vitais pelos botões, as rolagens (o atributo, a busca das perícias, a favorita), o tiro mirado na perna, o "Trocar a munição", os painéis de Equipamento e de Role, o estilo (o tema e o código PT1), recolher e o painel do jogador;
  - os acessórios (ciclo 136): no rifle de 3 slots, o carregador estendido entra, o tambor não (um carregador por vez), o Smartgun Link enche os 3 e a baioneta já não cabe; a montagem da wiki entra como veio, também pelo "Importar da mesa" (o rifle do Foundry 12 com dois carregadores volta com os dois); e, no passo dos acessórios, o Smartgun Link só com os plugs de interface e o pente que volta a 25 com as 10 balas de volta;
  - o acessório que é arma (ciclo 135): na Atiradora, a baioneta e o lança-granadas sob o cano no fuzil equipado (na aba Combate, fora do inventário e da wiki, sem mãos a mais); o golpe da baioneta (1d6), a recarga, a recusa com o fuzil guardado, a baioneta tirada e o fuzil apagado (a granada volta);
  - as regras do Kit que são conta (ciclo 138): o Projectile Launch System com granada (6d6, a DV do lança-granadas) e com foguete (8d6, a do lança-foguetes); o Monowire com a nota dos 6 m e, no crítico, o cartão das duas lesões, em que o botão do mestre aplica a escolhida;
  - o cyberware que é arma do Kit (ciclo 134): na Atiradora, a Mantis Blade instalada dá a arma excelente (+1) e acerta o Capanga com 3d6; o Projectile Launch System dá o lança-foguetes de um tiro, que carrega a granada;
  - o cyberware que é arma (ciclo 133): na Atiradora, os Wolvers e a Popup Ranged Weapon instalados dão a arma (na aba Combate, fora do inventário e da wiki, sem mãos); o golpe dos Wolvers (DEX + Armas Brancas, 3d6), a recusa com o EMP, a recarga, o dano novo no cyberware, e a arma que sai ao tirar (as 12 balas voltam), ao desligar e ao apagar; no capanga, a tabela de armas sem a arma na lista de itens; no navegador do jogador, as Rippers que ele instala dão uma arma só, que sai quando ele tira;
  - a loja que compra (ciclo 132): o "Configurar a compra" do mestre (os dez tipos, a porcentagem, a arma fora) e, no navegador do jogador, a venda do Agent a 50%, a da pistola carregada (descarregada), a da loja sem dinheiro bastante (todo o dela) e a recusa da faca;
  - a loja que vende (ciclo 130): comprar a pistola (o dinheiro e o extrato dos dois), sem o dinheiro (o aviso), uma parte das balas pelo preço da unidade, o estoque infinito e, no navegador do jogador, a compra para o personagem dele;
  - o contêiner (ciclo 122): o ator novo (a loja, o token solto e neutro, os jogadores donos), as permissões de cada tipo, o dinheiro com o extrato, a ficha do mestre, o item do compêndio e o da ficha (com o carregador), a pilha, o preço, pegar uma parte e tudo, o estoque infinito, o mestre arrastando entre as fichas e, no navegador do jogador, a trava, a ficha sem as configurações, as recusas e o esconderijo (pôr, criar e apagar);
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
  - os compêndios (ciclo 106): os de 2077 com os tamanhos da loja da wiki de 2026-10-17 (53, 38 e 37);
  - o Neuroport como arquitetura (ciclo 105): os andares do Capanga com um Self-ICE e um deck com o Hellhound, como no exemplo da wiki; o Jack Out inseguro com o Hellhound no cartão e, com ele sem REZ, sem;
  - a conexão direta (ciclo 104): em combate, o Capanga acordado e solto recusa pela janela do mestre; inconsciente, liga sem ele perceber, com os Passwalls passados e uma Ação NET a mais; agarrado, liga e ele percebe; a mais de 2 m, cai à força; no Alvo, o jogador aceita na janela dele e depois arranca o cabo pela ficha;
  - o alvo que morre e o token que sai da cena (ciclo 103): o token do netrunner apagado tira as duas ligações dele e os invasores dos dois alvos; o Capanga morto derruba o netrunner, com o bloqueio de 60 minutos; e o alvo que sai da cena também;
  - o firewall de fábrica (ciclo 102): em combate, o netrunner de Rank 2 não passa (5 contra DV 6), sem ligação e sem a Vontade do alvo, e a Ação NET vai; passa (8) e entra; no Rank 3, o Jack In rola sem o firewall;
  - o deck na porta (ciclo 101): a 16 m, o deck externo não alcança; sem a porta, o deck não tem o botão; com ela, o deck encaixado pela ficha leva o alcance a 50 m, o Jack In entra, e andando a 16 m continua ligado;
  - as Ações NET e o Jack Out inseguro (ciclo 100): em combate, o netrunner de Rank 1 faz o Jack In e um quickhack, a ficha mostra 2/2, e o terceiro avisa sem rolar; na rodada seguinte, voltam; fora do alcance, ele cai do Neuroport e só entra de novo passados os 60 minutos; o alvo que anda para longe também o derruba;
  - a expulsão (ciclo 99): o Capanga netrunner sabe do Jack In sem rolar; o mestre tenta expulsar pela ficha dele, e o netrunner do jogador resiste com a Interface pela janela de reação, no empate; o jogador expulsa pela ficha do Alvo o netrunner do mestre, e a ligação some dos dois lados; quem não se percebeu não é expulso, e só o mestre vê quem o alvo não percebeu, sem o botão;
  - os efeitos dos quickhacks (ciclo 98): o Impair Movement e o Slow tiram o MOVE por 20 rodadas; o Overheat põe o fogo, que queima 4 no fim do turno do alvo; o System Reset deixa inconsciente e caído, a cura não acorda e o dano acorda;
  - os quickhacks (ciclo 97): antes dos Passwalls, avisa; no Rank 2, os 8 dos Ranks 1 e 2; o Lure passa sem alertar, o Synapse Burnout pela janela da ficha alerta e tira os 3d6 do HP, e o Puppet não passa da DV 12;
  - o Breach nos Passwalls (ciclo 96): o Capanga com dois Self-ICE (DV 8); o Breach pela ficha com 7 não passa, com 9 passa um e com 10 passa o último; depois, o botão sai e o Breach avisa;
  - o Jack In no Neuroport (ciclo 95): o Alvo do jogador resiste com a Vontade pela janela dele e percebe; o Capanga (o mestre rola) não percebe; as ligações nas duas fichas (o jogador não vê quem ele não percebeu), o Jack Out pela ficha, o cartão para o dono do alvo que percebeu e as recusas sem rolar (sem Neuroport, longe, sem ver o alvo);
  - a parede e o Scanner (ciclo 91): a porta fechada no meio (o aviso do clique e a recusa da operação) e aberta (conecta); o Scanner do HUD do token com 9 (só o ponto a 3 m) e com 12 (também o oculto a 13 m, que passa a aparecer ao jogador), com o chat só ao mestre e a ele;
  - gastar IP (o C39): Armas de uma Mão 4 → 5 → 6 por 100 e 120, a recusa sem saldo, as duas Roles 4 → 5 por 300, o extrato e os cartões, o cancelar, o clique duplo, o saldo que muda durante a confirmação e a compra recusada que volta inteira;
  - a ficha do C32: os "+" das listas (o item novo, do tipo e com o nome certos, aberto), a busca nas duas abas (com e sem acento, depois de uma mudança no ator, sem gravar nada), trocar e descarregar a munição, e o apagar com o que está instalado ("Só tirar" e "Apagar junto" na arma, no deck e na fundação, as balas de volta ao estoque);
  - o HP e a Humanidade dentro do máximo (o C31): o criado acima do máximo, o HP cheio que acompanha o Grafted Muscle e o BODY, o ferido que fica, o gravado pela ficha e pelo update que para no máximo, o Desfazer depois da cura, a Humanidade pela EMP e o capanga de token solto;
  - a mesa e o chat do C33: o teste de Percepção do mestre e do jogador em cada modo do seletor do chat (quem recebe, às cegas e o total que cada um vê), as rolagens avulsas às cegas, o "Mostrar aos jogadores" no retrato de cada ficha (só o mestre e o dono) e a ficha do token solto que fecha ao apagar;
  - as conveniências do C26: o `/red` no chat pelo `ui.chat.processMessage` (o total com o crítico e a descrição), a tabela de DV escolhida no HUD do token (`cprDvTable`) e mostrada no rótulo da régua pela distância, e a iniciativa com a configuração "Iniciativa explode no 10 e no 1?" desligada e ligada;
  - a acessibilidade das fichas: a favorita por Enter, espaço e clique no ícone, com a flag e o estado anunciado; a
    Percepção abre a mesma janela pelos três caminhos, sem rolar ao cancelar; nomes acessíveis e o contorno ciano do
    foco de teclado; as abas do item por teclado e clique, com a seleção anunciada, e o nome do campo interno das notas;
  - nenhum aviso de compatibilidade do Foundry 14 nem erro vindo do sistema, nos dois navegadores.

- **O ensaio de uma sessão** (ciclo 123): `node tests/rodar.js ensaio` (só chamado pelo nome). O procedimento da migração da campanha e uma sessão, de ponta a ponta, num mundo só: o grupo da wiki com a ficha da mesa do Foundry 12, o "Importar da mesa" pela janela, a conferência das fichas, dois jogadores nos navegadores deles, a cena, o combate, a NET, o Death Save, o saque, o pagamento e a ficha de volta na wiki. As capturas ficam em `tests/.saida/ensaio-*`. Rode antes de uma sessão, depois de atualizar o sistema.

Da pasta de dados do Foundry do PC só sai a licença. `FOUNDRY14_APP=...` e `FOUNDRY14_DADOS=...` trocam o programa e a pasta de onde vem a licença.

## Licença

As regras de dano, o conteúdo convertido e as tabelas vêm do [Cyberpunk RED - CORE](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) (The Project Red Team), que é GPL-3. Por isso este sistema também é GPL-3: se um dia for publicado, vai com o código-fonte e a mesma licença. O ícone do Suprimido veio do Fluxo de Combate.

Cyberpunk RED é da R. Talsorian Games. Este é conteúdo de fã sem fins comerciais, dentro da Homebrew Content Policy da R. Talsorian, não endossado por ela.
