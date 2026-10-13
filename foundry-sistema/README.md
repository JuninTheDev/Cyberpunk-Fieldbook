# Cyberpunk RED — Fieldbook (sistema do Foundry VTT 14)

Sistema próprio de Cyberpunk RED para o **Foundry VTT 14**, feito em volta da wiki da mesa. Não depende do sistema **Cyberpunk RED - CORE**: as regras, a ficha e o combate são daqui, e os módulos da mesa vão virar parte dele.

**Esta é a versão 0.2.0, um protótipo.** O combate do Fluxo de Combate já está dentro do sistema. A campanha continua no Foundry 12 com o CORE 0.92.4 até este sistema estar provado na mesa.

## O que já faz

- **Ficha do personagem**, no visual do modelo de ficha da mesa (Cyberpunk 2077: amarelo, ciano e vermelho sobre o escuro, com as fontes Rajdhani e Share Tech Mono embutidas). A ficha é sempre escura, qualquer que seja o tema do Foundry. Tem estas partes:
  - **Cabeçalho:** o retrato, a Role e o Rank (com a lista das 10 Roles do RED da wiki), o nome, o apelido e os indicadores de HP, Sorte (com os botões da Sorte, abaixo), Eurodólares, IP e Reputação (cada um abre o extrato dele, abaixo).
  - **Perícias:** o painel geral, em três colunas.
    - **Esquerda:** os atributos (clique para rolar) e os vitais (as barras de HP e Humanidade, a EMP de agora, o limite de gravemente ferido, o Death Save e o estado).
    - **Centro:** as perícias com nível, das mais altas para as mais baixas, ou todas, no grupo de cada uma. Na lista completa, dá para acrescentar uma perícia de família (uma Linguagem, um Especialista Local...) e tirá-la.
    - **Direita:** a armadura (o SP de cada local), as armas equipadas com o botão Atacar, o cyberware instalado e as lesões críticas, com o paliativo e o tratamento.
  - **Combate:** as armas com todos os modos de ataque, a armadura vestida, a Iniciativa, a esquiva, o Death Save e a munição.
  - **Equipamento:** os Eurodólares, com as últimas mudanças do extrato; armas, armaduras, munição, equipamento, roupas, drogas, upgrades e veículos.
  - **Cyberware:** a Humanidade e cada peça, com instalar e tirar.
  - **Role:** a Role da wiki (as 10 do RED, desde o Mission Kit), com a habilidade e o resumo, e o que ela soma nas perícias: o Moto do Nomad (o Rank nas seis perícias de veículo). A ficha antiga com Face ou Corpo, as Roles do suplemento de fã que saíram, lê a do RED de onde vinham (Rockerboy e Exec), como a wiki. Os botões da habilidade de Role rolam pela janela de rolagem (Ctrl + clique, direto): o Impacto Carismático do Rockerboy e a Credibilidade da Media (Rank + 1d10), a pechincha do Fixer (COOL + Negociação + Operator + 1d10) e o Backup do Lawman (1d10 até o Rank; vindo, o d6 diz em quantas rodadas chega). As quatro Expertises do Tech perguntam antes a perícia de TECH do teste (TECH + a perícia + os pontos da Expertise + 1d10). O Medtech rola a Cirurgia e a Tecnologia Médica (TECH + a perícia + 1d10), as perícias que só ele tem: o nível vem das especialidades (2 por ponto de Cirurgia, até 10; Farmacêutica + Criossistemas), e o painel de Medicina mostra a conta. Para o Solo, o Tech e o Medtech, as especialidades com os nomes em português, os pontos de cada uma (editáveis) e, no Solo, o efeito de agora. A ficha confere os pontos com o Rank: o total (o Tech ganha 2 por Rank; o Solo e o Medtech, 1) e o máximo em cada especialidade (o Rank). Ela avisa o que passou e o que sobra, sem travar.
  - **NET:** a Interface do Netrunner (o Rank da Role), pelo cyberdeck equipado, como o CORE: as 9 habilidades
    (Scanner, Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus e Zap), a Defesa e a Velocidade, cada uma com o
    valor sem o dado, o custo e o que faz; o dano do Zap (1d6); e as Ações NET por turno pelo Rank (2, 3, 4 ou 5). Os
    cyberdecks e os programas, com o botão Ativo (rezzado) dos que estão num deck: os boosters ativos (Eraser, See Ya,
    Speedy Gonzalvez e Worm) somam +2 na habilidade deles. No combate na NET, os programas de ataque num deck atacam
    (Interface + ATK + 1d10, pela janela) e rolam o dano contra o que atingem, sem crítico: o anti-programa em programa
    ou em Black ICE, o anti-pessoal no cérebro. Os que têm REZ (boosters e defensores) perdem 1 de REZ e voltam ao
    máximo pelos botões, e em 0 desativam. O cartão do dano (o do programa e o do Zap) tem os botões do mestre: no
    cérebro dos alvos marcados (T), direto no HP e sem a armadura (o Shield ativo anula o primeiro dano de programa e se
    desativa; o Armor ativo reduz 4), ou num programa ativo do alvo (perde a REZ, e em 0 desativa).
  - **Vida:** o Lifepath (os 17 campos do criador da wiki, que a importação traz) e as notas.
- **Ficha do item:** o mesmo tema escuro, com as mesmas fontes e cores.
- **Ficha do capanga** (o mook do CORE), para os NPCs descartáveis. O tipo de ator "Capanga" tem os dados do personagem
  (as regras e o combate são os mesmos), numa página só:
  - **Cabeçalho:** o retrato, o nome, o HP, a SP, a iniciativa e a esquiva, e se a ficha é a do ator (o modelo dos
    tokens) ou a de um token na cena;
  - **Corpo:** o painel geral da ficha do personagem (sem as armas), a tabela de armas com os ataques, os itens (equipar,
    vestir, instalar e o uso de cada um) e as notas;
  - **O token** nasce solto, com o HP na barra: cada capanga na cena tem o próprio HP, a própria munição e o próprio Death
    Save. O nome mudado na ficha de um token vai para o token na cena;
  - **Arrastar um item** para a ficha já equipa a arma, a armadura, a roupa, o cyberdeck, a droga e o equipamento, e
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
- **Cartões do chat** (testes, ataques, dano, Death Save) no mesmo visual: a mensagem inteira fica escura, com a borda amarela (vermelha no dano e na morte), as partes do teste em etiquetas e o total grande. As mensagens que não são do sistema não mudam.
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
- **Lesão Crítica** (dois 6 no dano):
  - **Tabelas:** 2d6 na tabela do corpo, ou na da cabeça no tiro mirado na cabeça, sem repetir uma que o alvo já tem.
  - **Na ficha:** a lesão entra com os efeitos (Perna quebrada: −4 MOVE, mínimo 1) e o texto da wiki, com o paliativo e o tratamento.
  - **Mortalmente ferido:** quem já está com HP abaixo de 1 ganha uma lesão a cada acerto.
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
- **Inventário** (aba Equipamento): equipamento, roupas e drogas, com a quantidade e o uso (equipado, carregando ou guardado; o botão da linha passa de um para o outro).
  - **Efeitos do equipamento** valem conforme o uso, como no CORE: o Agent (+2 em Pesquisa em Biblioteca) e o Techscanner valem equipados ou carregando; o Medscanner e o Linear Frame, só equipados.
  - **Drogas** vêm com os efeitos desligados. Quem usa liga o efeito na ficha do item (o Boost dá +2 INT).
  - **Roupas** guardam o tipo e o estilo, com os nomes da loja da wiki.
  - **Netrunning:** o cyberdeck (os slots, com os programas instalados nele e quantos slots ocupam) e os programas (classe, ATK, DEF, REZ, o dano e o deck onde estão). Só aparece na ficha de quem tem um dos dois. O combate na NET fica na aba NET.
  - **Upgrades e acessórios:** cada um diz onde instala (arma, cyberdeck ou veículo), quantos slots ocupa e em que item está. Instalado numa arma, o carregador estendido ou tambor troca o tamanho do pente (o rifle de assalto vai de 25 a 35 ou 45, como a tabela de carregadores da wiki), e o Smartgun Link dá +1 no ataque (o mesmo acessório duas vezes não soma). O hardware ocupa slots do deck.
  - **Veículos:** SDP, assentos, MOVE (a velocidade de combate) e a velocidade narrativa. Os upgrades instalados somam SDP e assentos (o Chassis pesado dá +20 SDP; o Upgrade de assento, +2 assentos). Os da família do Nomad vêm marcados.
- **Compêndios**, na pasta "Cyberpunk RED — Fieldbook": Armas, Armaduras, Munição, Cyberware, Equipamento, Roupas, Drogas, Netrunning (cyberdecks e programas), Upgrades e acessórios, Veículos, Armas de 2077, Cyberware de 2077, Netrunning de 2077, Lesões críticas e Personagens de exemplo. Os exemplos são um Solo e um Capanga, com armas carregadas, armadura vestida e cyberware instalado, prontos para testar o combate.
- **Cyberware:**
  - **Instalar** desconta a Humanidade pela perda rolada (Shift: pela média).
  - **Humanidade máxima:** 10 × EMP, menos 2 por peça instalada que tem perda de Humanidade (borgware, menos 4). Peça sem perda, como o cyberware grátis de 2077, não reduz.
  - Os efeitos do cyberware só valem instalado. O Kerenzikov, por exemplo, dá +2 na iniciativa.
  - **Tirar** não devolve a Humanidade perdida: o máximo volta a subir (a peça deixa de contar), e a Humanidade perdida só volta com terapia, como na wiki e no CORE.
  - **Editor de Dor:** tira só a penalidade de gravemente ferido (−2); a de mortalmente ferido (−4) continua.
- **Janela "Personagens da wiki"** (só o mestre; botão no alto da aba de Atores): cada personagem da wiki com o que dá para fazer neste mundo, que é importar (como foi criado), importar da mesa (como está no Foundry 12) ou abrir a ficha, com o dono no Foundry escolhido na linha. Também mostra os pedidos da loja que esperam o mestre, com Aprovar (entrega na hora) e Recusar (com o motivo, que o jogador vê). Os avisos da última importação ficam no alto. Pela macro: `game.system.api.abrirJanelaDaWiki()`.
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
  - os itens como estavam: equipados ou guardados, o pente carregado e com qual munição, o SP que sobrou, o cyberware instalado, o que está dentro do deck, da arma e do veículo;
  - cada item acha o catálogo pelo uid da wiki (da criação, de um pedido, da família do Nomad) ou, sem uid, pelo nome do CORE. O que não achar vira aviso;
  - os STATs base vêm da criação: a ficha da mesa manda os de agora, já com a armadura e as lesões, que aqui voltam pelos itens.
- **Pedidos da loja:** o jogador pede na loja da wiki e o mestre aprova na página do personagem, na wiki. A cada minuto, o mestre ativo entrega o aprovado: cria os itens (no lugar e com a munição que o jogador pediu), desconta o dinheiro (no extrato, "Compra na wiki: " e os itens) e marca o pedido como entregue. O cyberware chega sem instalar (instale pela ficha, que rola a Humanidade). Sem dinheiro na mesa, o pedido fica aprovado com o erro, e a wiki mostra "Tentar de novo". Cada item leva o uid do pedido, então nada sai em dobro. Pela macro: `game.system.api.wiki.entregarPedidos()`. Tudo o que a loja da wiki vende existe aqui (o CORE e o 2077, o do Mission Kit e o do suplemento de fã), **menos o Black Chrome**, que ainda falta. Um item que não existir vira aviso e não conta como entregue para a wiki.
  - **Só o ator ligado:** entrega e manda a ficha só o ator ligado ao personagem na wiki (o da última importação). Uma cópia antiga no mundo, ou o mundo antigo do Foundry 12 aberto depois da migração, a wiki recusa (409 "ator antigo"), e o sistema para de mandar sem avisar.
- **Migração dos dados entre versões do sistema** (o `dataModelVersion` e o MigrationRunner do CORE): o mundo guarda a versão dos dados numa configuração escondida. Quando o mestre ativo entra num mundo com dados de uma versão anterior, o sistema confere os itens e os atores do mundo, os tokens não ligados e os compêndios do mundo:
  - se algum passo muda alguma coisa, pergunta antes, com o que muda, os passos e o aviso do backup. "Depois" deixa os dados como estão, e ele pergunta de novo da próxima vez;
  - migrado, grava a versão e deixa o registro no chat, só para os mestres (os passos e o que mudou). O compêndio trancado abre só durante a migração;
  - se nada muda (o mundo novo), só grava a versão, sem perguntar. Dados de uma versão mais nova que a do sistema só avisam;
  - se um documento falha, para e avisa, e o mundo fica na versão de antes. Os passos só mexem no formato antigo, então rodar de novo não estraga nada;
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

E as da wiki:
- **Endereço da wiki** (padrão: vazio). Vazio, o sistema deduz como o cpr-2077: `wiki.<domínio>` quando a mesa abre em `mesa.<domínio>` (o servidor), ou `http://localhost:8000` com tudo no mesmo computador.
- **Mandar a ficha para a wiki** (de cada navegador; padrão: sim): veja "Na mesa".

E a do navegador de cada um:
- **Rolar direto, sem a janela de rolagem** (padrão: não, como no CORE): ligado, o clique rola na hora e Ctrl + clique abre a janela.

## Ainda não faz

- **Os NPCs prontos do CORE** (o capanga se faz à mão, com a ficha de capanga), o dano do Black ICE e o dano na REZ dele (o C7,
  parte 2), o programa de Black ICE do netrunner, as arquiteturas (o NET Architect) e o Painel Tático.
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
- **Lint:** `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/cenarios/v14.js`.
- **No Foundry 14:** `node tests/rodar.js v14`, na raiz da wiki. Sobe o Foundry 14 do PC sem janela, num mundo vazio e numa pasta própria (`%LOCALAPPDATA%\FieldbookTeste\foundry14`), e confere estes pontos, com dados fixos onde a conta importa:
  - os compêndios, a ficha e o crítico do d10;
  - o catálogo, o cyberware e a recarga, e o inventário (o efeito do equipamento pelo uso, a droga ligada na ficha do item, os acessórios na arma e o hardware no deck);
  - o tiro com crítico, ablação e Lesão Crítica, e o Desfazer;
  - o mirado na cabeça e na perna;
  - o autofogo, o explosivo em área, o cartucho, a munição de borracha e a que não causa dano;
  - o Reflex Tuner: o +1 na esquiva depois de atingido, o "Desfazer" que o tira e o fim na rodada seguinte;
  - o escudo (com a janela do mestre para a defesa de um NPC, que mostra o total e, fechada no X, deixa o sistema escolher, e o explosivo que passa do escudo destruído), o corpo a corpo com esquiva e a armadura pesada;
  - a Consciência de Combate do Solo (com o Ponto Fraco e a Deflexão por rodada e o Desfazer) e o MOVE do mortalmente ferido;
  - a defesa e o ataque de um jogador num segundo navegador: a janela de reação (o texto sem o total, a conta da esquiva, a DV e a barra do tempo), o X e o tempo esgotado valendo a escolha padrão, o dano rolado por ele, o ataque dele sem mestre na mesa e o mestre respondendo por ele quando demora;
  - o que a mesa vê do ataque: um ataque por vez no mestre, quem vê o cartão do resultado (todos, os envolvidos, só o mestre), o texto em cima do token nos dois navegadores, os efeitos desligados e o total à vista;
  - o fogo supressivo, a parede que bloqueia a linha de visão e os turnos (o Suprimido saindo e o Death Save que passa e depois falha);
  - o Facedown: pela janela, com Ctrl + clique, gravemente ferido e no capanga, com a Reputação de covarde;
  - a NET: a Interface (as 11 rolagens, os boosters ativos, as Ações NET), os programas (o ataque, o dano sem crítico, a REZ) e o dano aplicado pelo mestre (no cérebro, com o Armor e o Shield, e num programa);
  - o Black ICE e o demônio: o token solto com a REZ na barra, o modelo da wiki (o Hellhound e o Efreet), as rolagens pela janela e com Ctrl + clique, a REZ e o nome na ficha do token, a iniciativa no topo da fila (sozinho e no "rolar todos") e a arma que não os atinge;
  - o capanga: o token solto, a ficha de uma página, os itens do compêndio arrastados para ela (equipados ou instalados, a Humanidade rolada e, com Shift, a média), o tiro que muda só o HP do capanga atingido, o outro capanga recarregando e atirando com a própria munição, o Death Save só de quem caiu, o nome novo na ficha do token e, no navegador do jogador, a ficha limitada (só a imagem, o nome e as notas; o Observador vê tudo, sem editar);
  - a importação de um Solo, de um Netrunner (com os programas no deck) e de um Nomad (com os veículos da família) feitos no criador da wiki de teste, e os erros dela (personagem que não existe, wiki fora do ar, jogador tentando importar);
  - a Sorte preparada na ficha e o visual dos cartões do chat;
  - a janela de rolagem do jogador, no computador dele: a esquiva com o modificador do mestre e a Sorte, a janela que fecha quando o mestre responde por ele no fim do prazo, o dano com o modificador e o Death Save pedido pelo mestre;
  - a janela de rolagem: as partes, os situacionais (do cyberware e das lesões), os modificadores comuns, o modificador do mestre e a Sorte, com o total ao vivo; o que se marca entra no teste; cancelar não rola; Ctrl + clique e o "Rolar direto"; no ataque, a luneta marcada a 51 m ou mais e desmarcada perto, cancelar sem gastar bala e o que se marca entrando no ataque; na iniciativa, o Sandevistan (+3) pela janela e direto;
  - as Roles do RED: as rolagens de Role pela aba Role (o Impacto Carismático pela janela, a pechincha com Ctrl + clique, o Backup que vem e o que não vem, a Especialização de Campo com a perícia escolhida e a Cirurgia do Medtech pelas especialidades); o Moto do Nomad importado da wiki de teste; um personagem antigo com a Role Face entra como Rockerboy pela importação e pela migração, e a ficha com "Face" lê o Rockerboy; na aba Role, o Impacto Carismático sem bônus e o Moto do Nomad no total da ficha;
  - o extrato: somar, subtrair e definir com o motivo, a mudança direta, o saldo negativo com o aviso, o mestre tirando linhas (só a linha ou desfazendo a mudança) e as linhas da importação, da migração e da loja;
  - a migração dos dados: o mundo novo fica na versão atual sem pergunta; um mundo da versão 0 com o TeleOptics antigo (num ator, num token não ligado e num compêndio trancado) e um Cyberaudio que virou Fashionware: a pergunta, o "Depois" que não muda nada, o "Migrar agora" que muda só isso e tranca o compêndio de novo, o registro no chat, a segunda vez sem pergunta e o aviso dos dados de uma versão mais nova;
  - nenhum aviso de compatibilidade do Foundry 14 nem erro vindo do sistema, nos dois navegadores.

Da pasta de dados do Foundry do PC só sai a licença. `FOUNDRY14_APP=...` e `FOUNDRY14_DADOS=...` trocam o programa e a pasta de onde vem a licença.

## Licença

As regras de dano, o conteúdo convertido e as tabelas vêm do [Cyberpunk RED - CORE](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) (The Project Red Team), que é GPL-3. Por isso este sistema também é GPL-3: se um dia for publicado, vai com o código-fonte e a mesma licença. O ícone do Suprimido veio do Fluxo de Combate.

Cyberpunk RED é da R. Talsorian Games. Este é conteúdo de fã sem fins comerciais, dentro da Homebrew Content Policy da R. Talsorian, não endossado por ela.
