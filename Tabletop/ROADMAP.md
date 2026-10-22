# Mesa da wiki: o caminho para substituir o Foundry

**Decisão do usuário (2026-10-20):** a mesa da wiki vai **substituir o Foundry completamente**. O HP mexido na mesa volta para a ficha, e as cenas do Foundry vêm para a mesa.

**Como usar este arquivo:**

- Cada item tem um código (M1, M2…).
- `[x]` é feito; `[~] (sessão)` é reservado, com push antes de começar; `[ ]` está livre.
- A ordem é a recomendada: a Fase 1 é o mínimo para jogar uma sessão sem o Foundry.
- Cada item fecha com teste em `mesa.test.js` (ou na suíte do projeto) e mutações que caem.

**A ordem combinada (2026-10-21):**
1. M9 (feito);
2. M7 (feito);
3. M11 (feito em paralelo, pela sessão tabletop-a9);
4. M23, a mesa limpa (feito; pedido do usuário em 2026-10-21: "antes do M12");
5. M12 (feito);
6. um ensaio no teste, num PC e num celular (o usuário, enquanto a Fase 2 anda: "Fase 2 enquanto você ensaia");
7. o M4, quando o usuário aprovar.

Para desligar o Foundry, da Fase 2 só são obrigatórios o M15, o M16 e o M18 (e o M13, se o grupo tiver netrunner). Os três estão feitos.

## Fase 0: feito

- [x] **M1 · Mesa básica:** cenas com mapa e grade, tokens, névoa pintada pelo mestre, régua com DV por alcance, ping, cursores, rolagens do RED pelo servidor, iniciativa. O servidor filtra o que cada um recebe.
- [x] **M2 · HP do personagem ↔ ficha:**
  - **Onde fica:** o HP da mesa fica em `doc.jogo` (`personagem-jogo.js`).
  - **Até a virada:** vale o mais recente entre a mesa e o Foundry (`doc.mesa`).
  - **Quem mostra:** a ficha, a lista de Personagens e a mesa mostram o mesmo número.
  - **Ficha → mesa:** a mesa confere as fichas a cada 4 segundos.
- [x] **M3 · Importar as cenas do Foundry** (`importar-foundry.js`):
  - **O que vem:** o mapa (imagem ou vídeo), a grade (com o deslocamento), os tiles, os tokens, as paredes com as portas (e a visão ligada, se a cena tinha) e as luzes (guardadas).
  - **Tokens:** o personagem da wiki, a ficha de NPC da wiki ou um token livre com a imagem e o HP do ator.
  - **Testado** com as 13 cenas do backup de 12/10.

## Fase 1: jogar uma sessão sem o Foundry

- [ ] **M4 · Entrar no projeto:**
  - a rota `/mesa` e a API no `server.js`;
  - **Mesa da wiki** na barra lateral (quantos estão nela);
  - o `mesa.test.js` no `tests/validar.js`;
  - o caminho do `require` de `personagem-jogo.js`;
  - os dados em `/srv/fieldbook/dados/mesa/` conferidos no backup.
- [x] **M5 · Editar tiles e tokens no mapa:**
  - **Tiles (mestre, ferramenta T):** pôr (imagem ou vídeo), mover e mudar o tamanho (encaixa na grade; Shift solta), girar, esconder, mudar a transparência, a ordem e apagar.
  - **Tokens:** nome, tamanho, cor e imagem (de NPC e token livre) pelo cartão, em **Aparência**.
  - **Margem:** em volta do mapa, como o padding do Foundry. O token pode esperar ali, fora do mapa; a do Foundry vem na importação.
  - **Testado:** 2 testes e 11 mutações que caem.
- [x] **M6 · Visão pelas paredes** (`mesa-visao.js`, a mesma conta no servidor e no navegador):
  - **Paredes e portas:** o mestre desenha (ferramenta Paredes, W) parede, porta, porta secreta e janela; as do Foundry vêm com o tipo de lá.
  - **Portas:** o jogador abre e fecha a porta que um token dele vê; a trancada e a secreta são do mestre.
  - **Linha de visão:** com a visão ligada, cada jogador vê o que os tokens dele veem. **O servidor nem manda os outros tokens.**
  - **Explorado:** o que o jogador já viu fica na penumbra, guardado no navegador dele; o mestre manda esquecer.
  - **Passo:** parede e porta fechada param o token do jogador (com a visão ligada ou não).
  - **Testado:** 4 testes, 22 mutações que caem, e as 3 cenas com paredes do backup (até 3 ms por cálculo).
  - **Rápido com muitas paredes:** um índice das paredes por célula do mapa; cada raio só olha as paredes perto dele. Com 4000 paredes, o cálculo caiu de 1,1 s para 14 ms; conferido contra a conta antiga em cenas aleatórias.
- [x] **M7 · Ficha de jogo na wiki** (tudo que muda na mesa, em `doc.jogo`, pela regra do `personagem-jogo.js`):
  - **Vai para a ficha:** HP, SP (com a ablação), Sorte, a munição no pente (e qual), as lesões críticas, o Death Save, e agora a Humanidade (o EMP cai junto), o dinheiro, o IP e a reputação.
  - **O mestre muda os números** (aba Fichas → **Ficha**): soma ou tira, com o motivo. Vai para o extrato da ficha (as últimas 30) e para o registro, que só o mestre e o dono veem. O IP dado pela wiki soma no da mesa.
  - **O equipamento:** cada item equipado, carregando ou guardado (o dono e o mestre mudam).
    - A armadura vestida dá o SP e a penalidade (−REF, DEX e MOVE).
    - Uma armadura por local, e quem sai guarda a própria ablação.
    - A arma guardada sai da mesa.
  - **A munição da ficha:**
    - a do pente da montagem sai da caixa (como o Foundry na importação);
    - recarregar gasta a caixa;
    - dá para escolher a munição: o balote tira o cartucho da espingarda, e o que estava no pente volta para a caixa.
    - O mestre acerta a quantidade da munição e do equipamento.
  - **Ao vivo:** a ficha muda na tela do dono e do mestre (evento `fichas`); a ficha da wiki confere a cada 30 segundos e mostra "Na mesa da wiki".
  - **Personagem sem Foundry:** entra na mesa direto da criação (os de teste são assim).
  - **Testado:** 8 testes e 39 mutações que caem, mais a conferência no Edge (mestre, jogadora, cartão, celular e a ficha da wiki).
  - **Depois:** a compra pela loja (M15) e a instalação de cyberware (M16) também mexem na ficha da mesa.
- [x] **M8 · Combate** (o Fluxo de Combate, em `mesa-combate.js` e `mesa-regras.js`):
  - **Ataque:** com a arma da ficha (STAT + perícia + 1d10, e a Sorte), contra a DV pelo alcance medido ou contra a esquiva às cegas do alvo. Tiro, só com REF 8+; corpo a corpo, sempre.
  - **Dano:** com a armadura (SP, ablação; faca e artes marciais com metade do SP), cabeça ×2 e a lesão crítica com dois 6.
  - **Tipos de ataque:** tiro, mirado (−8), autofogo, fogo supressivo (Suprimido), corpo a corpo, briga e explosivo (área de 10 × 10 m).
  - **Mortalmente Ferido:** lesão a cada acerto, Death Save no começo da vez, a morte e a vez pulada.
  - **Desfazer** (o mestre): volta o HP, o SP, as lesões e a bala.
  - **Falta:** a espingarda com cartucho (passou para o M9).
- [x] **M9 · Armas de 2077 e a espingarda com cartucho** (`mesa-2077.js`, `mesa-regras.js`, `mesa-combate.js`), como o `armas2077.mjs` e o Fluxo de Combate do Foundry:
  - **O perfil:** a classe e as regras de cada arma vêm do `system-2077.js` (a mesma lista do build do Foundry). Da ficha vêm o Rebuild instalado, a munição carregada, a qualidade e o cromo.
  - **Power:** o modo Ricochete (−4; −2 com o Ballistic Coprocessor) e a lesão crítica com 10 de dano bônus.
  - **Smart:** +1, a trava sem a conexão, e a segunda chance da munição Smart melhorada (14 + 1d10, com as penalidades do tiro).
  - **Tech:** carregar (no cartão), a metade do SP no tiro carregado e a carga que sai no tiro ou em 20 rodadas (a Omaha fica até o fim do turno).
  - **Cada arma:** balas por tiro e o dano com menos balas, a trava de balas mínimas, o dano fixo e o do tiro mirado, os dois canos, os dois alvos, o ferrolho, a coronha, só Smart melhorada e a lesão de quem não aguenta o coice.
  - **Qualidade excelente:** +1 em qualquer arma.
  - **Cartucho:** DV 13 e 3d6 (rolado uma vez) em todos à frente até 6 m e à vista. "À frente": 45° para cada lado do alvo escolhido.
  - **Desfazer:** volta também a carga e o ferrolho.
  - **Testado:** 11 testes e 75 mutações que caem, mais a conferência no Edge (o cartão e o ataque do Jax e da Nyx de teste, que agora têm armas de 2077).
  - **Falta:** o autofogo com −2 da Pozhar (a regra está só no texto) e a cobertura com HP (hoje é nota no cartão).
- [x] **M9b · Agarrar, arremessar e Artes Marciais** (`mesa-luta.js`; as regras em `mesa-regras.js`; o ataque, o escudo humano e o registro do turno em `mesa-combate.js`), como o C10 e o agarrão da `sistema-v14`:
  - **Agarrar:** DEX + Briga contra DEX + Briga (o empate é de quem resiste, que rola na hora). Agarrados, −2 em tudo para os dois (o ataque, a defesa, o teste pelo token); quem é agarrado não anda e é arrastado; ninguém usa arma de duas mãos.
  - **Agarrando:** Estrangular (o BODY direto no HP; abaixo de 0, fica com 1 e desmaia; três rodadas seguidas, desmaia), Derrubar (o BODY no HP, cai, acaba), Soltar e o **Escudo humano** (os tiros vão no agarrado, que não esquiva; o corpo a corpo e o mirado na cabeça não; morto, é um escudo com HP igual ao BODY). Agarrado: Escapar (o empate é de quem segura).
  - **Caído e inconsciente:** caído não anda até Levantar-se; inconsciente não age nem esquiva. Quem agarra e morre ou desmaia solta.
  - **Arremessar:** a arma branca e as de arremesso do Black Chrome (DEX + Atletismo, a DV do lança-granadas, até 25 m; a branca não ignora metade do SP). A arma fica no chão até pegar (`largada` na ficha).
  - **Artes Marciais:** a arma de cada forma (o dano pelo BODY, metade do SP) e os 8 movimentos: os golpes (Quebra-ossos, Ponto de pressão, Voadora) pelo ataque; Desarme combinado (a arma fica com quem desarmou, marcada na ficha de quem perdeu, ou cai), Aperto de ferro, Combinação quebra-armadura, Contra-queda, Escape de agarrão e Recuperação contra a DV.
  - **O registro do turno:** cada ataque resolvido no combate (quem, em quem, a classe da arma, se pegou, se desviou), a vez de cada um e os metros andados. Os requisitos "neste turno" e "desde o seu último turno" saem dali; o mestre confirma por cima, e fora do combate quem age confirma.
  - **Fica de fora:** a arma tomada não passa para a ficha de quem desarmou (o mestre decide); a mesa não conta as Ações (o golpe no lugar dos 2 ataques); o Braço quebrado não larga a arma sozinho; agarrar com as mãos ocupadas só avisa.
  - **Testado:** 10 testes, 93 mutações que caem, os cenários criador, cyberware, economia, Foundry e contas, e a conferência no Edge (a jogadora agarrando com o escudo humano, o cartão, o chat, o ataque com Arremessar e Agarrar; o mestre com o monge de Karatê e Judô; o celular agarrado).
- [x] **M10 · Chat:** texto para todos, só para o mestre ou sussurro a um jogador (os outros nem recebem), `/r 2d6` rola, e os cartões de rolagem e de ataque no mesmo fio.
- [x] **M11 · Áudio** (`mesa-audio.js` no servidor, `mesa-tocador.js` no navegador), como as playlists do Foundry e o yt-jukebox que o mundo usa:
  - **Playlists do mestre:** música enviada (MP3, OGG, M4A, WAV, FLAC) e vídeo do YouTube (o link; a playlist ou o mix do YouTube traz todas; o título vem pelo oEmbed, sem chave).
  - **Dois canais juntos:** Música e Ambiente. Em ordem ou aleatória, repetir a playlist, repetir a música, o volume da música, pausar, ir para um ponto, próxima.
  - **Sincronia:** o servidor guarda só o que toca e desde quando; cada navegador acerta a posição pelo relógio do servidor (quem chega no meio ouve do mesmo ponto).
  - **Fim da música:** a página do mestre avisa (`audio.fim`, com a faixa e o início), e o servidor passa para a próxima; o aviso repetido não pula duas.
  - **Cada um:** o volume de cada canal fica no aparelho. **♪ Ligar o som** quando o navegador segura o som até o primeiro clique. O jogador só recebe o que toca.
  - **Música da cena:** abrir a cena toca (a que já toca continua).
  - **Importação:** as 3 playlists do Foundry (o volume convertido como o Foundry 12), os 2 grupos do yt-jukebox (51 vídeos) e a música da cena Intro.
  - **Testado:** 5 testes (e 1 no importador), 48 mutações que caem, e no Edge sem janela: o mestre e o jogador no mesmo ponto (2,5 s e 2,5 s), o fim passando para a próxima, o ambiente junto, o YouTube tocando e o celular.
  - **Falta:** os sons de efeito (a granada do mmutons, a porta, o dado), a música avançar sem a página do mestre aberta e o "tocar todas juntas" do Foundry (vira em ordem).
- [x] **M23 · A mesa limpa, como o Foundry 14:**
  - **Por quê:** o mapa ocupava 67% da tela num notebook (1366 × 768).
  - **As escolhas do usuário:**
    - o mapa na tela toda;
    - o topo vira uma pastilha no canto;
    - a barra da direita é uma faixa de ícones que recolhe e passa por cima do mapa;
    - o cartão do token vira HUD junto do token, com a ficha na barra.
  - **Fases:**
    1. moldura (feita: o mapa livre foi de 67% para 93% da tela em 1366, e de 76% para 96% em 1920);
    2. chat (feito): o registro na altura toda, a bandeja de rolagem no botão Rolar, as mensagens no canto do mapa com a barra recolhida;
    3. HUD do token (feito): o HP, Atacar, Rolar, Lanterna e o cartão na aba Token (o duplo clique também abre);
    4. ferramentas (feito): só com ícone, em grupos, e o nome, o atalho e como usar no tooltip; a dica longa saiu do canto;
    5. celular (feito): a folha de baixo abre pela metade, e a alça troca para a tela cheia ou fecha; o HUD fica acima da folha.
  - **Meta:** o mapa com 95% ou mais da tela com a barra recolhida, em 1366 × 768.
    - **Contando só a barra:** passou (96,7% em 1366 e 97,7% em 1920).
    - **Contando tudo que flutua** (a pastilha, as ferramentas e o rodapé): 93,4% em 1366 e 96,1% em 1920.
  - **Testado:** a suíte da mesa e a da wiki passam. Conferido no Edge em 1920, 1366 e no celular (mestre e jogadora), com os scripts `ver-moldura`, `ver-chat`, `ver-hud`, `ver-ferramentas` e `ver-celular`.
  - **Falta (opcional):** a interface esmaecida quando o mouse sai dela, como o `--ui-fade-opacity` do Foundry.
- [x] **M12 · Notas no mapa** (como as notas do diário do Foundry), em `mesa-api.js` e `mesa.js`:
  - **O alfinete:** um ponto no mapa que abre um handout (o título, a imagem, o texto) e, se tiver, uma página da wiki (abre noutra aba).
  - **O mestre:** põe, edita, arrasta e apaga pela ferramenta Notas (J).
  - **Quem vê:**
    - só o mestre;
    - os jogadores, quando um token deles vê o ponto (a névoa e as paredes contam, como no Foundry; o servidor nem manda a que o jogador não vê);
    - os jogadores, sempre.
  - **Mostrar a todos** (o Show Players do Foundry): abre a nota na tela de todos os jogadores, mesmo a que só o mestre vê no mapa.
  - **O link:** só de página da wiki (do endereço colado, fica o #). A imagem: PNG, JPEG, WebP ou SVG.
  - **Importação:** as 13 cenas do backup do Foundry não têm nenhuma nota, e o diário tinha 3 entradas, da trama antiga (saíram com ela). O importador não traz notas.
  - **Testado:** 3 testes e 18 mutações que caem, mais a conferência no Edge (o mestre põe e abre; a jogadora recebe o Mostrar a todos).

## Fase 2: o que os módulos fazem hoje

- [~] **M13 · A NET (o NET Architect e o Neuroport)** (sessão "Continue o roadmap do tabletop", 2026-10-21). As escolhas do usuário: a arquitetura **e** o Neuroport do Mission Kit; as arquiteturas pelo editor da mesa **e** pela importação do Foundry; a defesa e a velocidade do netrunner perguntadas ao jogador (com Sorte e prazo, como a esquiva). Em fases, um commit cada:
  - [x] **Fase 1, a arquitetura e o netrunner** (`mesa-net.js`, `mesa-netrun.js`): as arquiteturas da campanha em `state.arquiteturas` (linhas como as do sistema do Foundry 14: andar, ramo, tipo, DV, Black ICE, demônio, a ficha do netrunner inimigo, o nome e a descrição), só para o mestre; o editor na aba NET (a grade de andares, o +, arrastar troca); gerar pelas tabelas do CORE; os 3 exemplos do NET Architect; a importação do Foundry 12 (o netarch, com os demônios e os netrunners das flags) e do 14 (a arquitetura em linhas), dos itens e dos compêndios do mundo, com o netrunner inimigo apontando para a ficha de NPC que veio do ator. O netrunner no cartão: o rank de Interface pela Role (a principal, a segunda ou a do Foundry), as Ações NET, o deck equipado, os programas e o hardware dele (`personagem-jogo.js` `noDeck`, com a montagem do criador). Os números do Black ICE, dos demônios e dos programas são os da wiki (o teste confere o texto). Testado: 7 testes (e 1 no importador), 54 de 55 mutações que caem (a viva é equivalente: o andar 1 sai da entrada pela regra seguinte também), e a conferência no Edge (a lista com as 5 arquiteturas do Foundry deste PC, o exemplo, o editor, o +, arrastar, o Kraken, gerar a avançada, o cartão da Nyx e o celular).
  - [ ] **Fase 2, o ponto de acesso e a janela da NET:** o tile vira ponto de acesso (o alcance, a parede no meio, o deck, a Interface mínima, oculto), conectar e desconectar, o token "Conectado à NET", a janela (o mapa que o netrunner vê, andar, as habilidades contra os andares, as Ações NET no combate, o registro), sair do alcance.
  - [ ] **Fase 3, os inimigos:** o Black ICE (a velocidade na chegada, o ataque na vez dele e os efeitos de cada um), o demônio, o netrunner inimigo, o Zap, o Slide, a defesa perguntada ao jogador, o combate (os inimigos na iniciativa), o dano no cérebro, o fogo, reiniciar as defesas.
  - [ ] **Fase 4, o deck e a cena:** os programas (ativar, atacar, a REZ, destruído, os boosters e os defensores), os nós de controle ligados a portas, luzes e tokens, o arquivo do Eye-Dee como nota, o Scanner e o Virus.
  - [ ] **Fase 5, o Neuroport (Mission Kit):** o Jack In (com o firewall de fábrica), o Breach dos Passwalls, os quickhacks com os efeitos simples, um por alvo por rodada, a expulsão, o Jack Out inseguro, a conexão direta e as Ações NET fora da arquitetura.
  - **As cenas de arquitetura** (já importadas, com os nós em vídeo) continuam cenas: o mestre abre quando quiser mostrar.
- [x] **M14 · Painel Tático** (`mesa-painel.js`, a regra do módulo do Foundry; o painel em `mesa.js`), em três fases:
  - [x] **Fase 1, o retrato:** uma imagem por estado de ferimento, com o modo, o tamanho, o deslocamento e o espelho (`retrato.salvar`: o dono ou o mestre; fica em `state.retratos` e vai com a ficha, `painel`). O jogador envia só a imagem do retrato (PNG, JPEG ou WebP, até 8 MB). A importação traz o retrato do Painel Tático dos personagens da wiki (o Qyan tem três estados no backup).
  - [x] **Fase 2, o painel:** na base do mapa, como o do Foundry (o retrato em pé, o HP com a roda, a armadura, a Humanidade, a Sorte, o Death Save, os atributos, as armas com ATK e DMG, a iniciativa, o Fim do turno, o Facedown, as perícias com ★). H recolhe; o jogador começa aberto, o mestre recolhido; aberto, o HUD do token some. O jogador passa a própria vez (`combate.proximo` com `vez`). Fica de fora: a ablação à mão no painel (o dano ainda é pelo cartão), a NET (M13) e as Habilidades de Role.
  - [x] **Fase 3, o estilo de cada jogador** (a paleta no painel): os 8 temas e as 5 cores, a fonte (as da wiki: Oxanium, Blender Pro, Share Tech Mono), os cantos, a opacidade, o desfoque, o brilho, as linhas de varredura, as animações, o compacto, a altura e o lado do retrato, os efeitos, o tamanho, a posição (arrastar pela alça; dois cliques voltam para a base), as seções (ordem e quais), as peças e os botões de HP. Fica neste navegador; o mestre define o padrão da mesa (`painel.estiloDaMesa`, sem a posição). O código PT1 é o mesmo do módulo do Foundry (a fonte de lá vira a Oxanium).
  - **Testado:** 5 testes, 30 mutações que caem, e a conferência no Edge com os PNG do Corvo (os estados, o efeito, as perícias, a janela do retrato, H, o mestre com o NPC; o tema, o compacto, o tamanho, o código do Foundry, arrastar e lembrar, voltar para a base).
- [x] **M15 · Loja entrega na wiki** (`personagem-jogo.js` `entrega`, `api-personagens.js`, `criador.js`):
  - **Em jogo:** o personagem entra em jogo quando o mestre põe o token dele numa cena. A mesa grava um `doc.jogo` sem número nenhum. Daí em diante:
    - a criação trava para o jogador (como depois da importação no Foundry; o mestre muda tudo);
    - as compras são pela loja da campanha.
  - **Quem entrega:**
    - o personagem ligado ao Foundry: o Foundry, como antes;
    - o que está só na mesa da wiki: a própria wiki, na hora de aprovar.
  - **A entrega na wiki:** confere o dinheiro (sem dinheiro, fica aprovado com o motivo, e o mestre tenta de novo). Os itens entram em `doc.jogo.compras`, com o encaixe e a munição escolhidos: a arma pedida vem carregada, e o pente sai da caixa. O dinheiro sai, com a linha no extrato.
  - **Onde aparece:** no inventário e no token da mesa (o token pega em até 4 s), na ficha da wiki (armas, armaduras, equipamento) e na loja (o dinheiro da mesa, "a wiki entrega").
  - **Cyberware comprado:** chega sem instalar; o mestre instala pela mesa (M16).
  - **Testado:** 2 testes, 15 mutações que caem, os cenários economia, contas, criador e Foundry, e a conferência no Edge (a loja, a ficha e o criador).
- [x] **M16 · Instalar cyberware na wiki** (`personagem-jogo.js` `instalacao`, a operação `cyber.instalar`, `criador.js`):
  - **Onde:** no painel Fichas, a ficha aberta mostra o cyberware que a loja entregou, cada um com o lugar, a perda e Instalar (com confirmação: não se desfaz).
  - **O lugar:** o shopping (DV13, 100eb), a clínica (DV15, 500eb) ou o hospital (DV17, 1.000eb), as regras da wiki. Só a partir do mínimo que a peça pede, pelo catálogo. O chipware encaixa no soquete: sem lugar e sem preço.
  - **Cobrar:** marcado, o preço sai do dinheiro, com a linha no extrato; sem dinheiro, a mesa recusa. Desmarcado: o Medtech do grupo instala (rola Cirurgia contra a DV na mesa) ou já foi pago.
  - **A Humanidade:** como no Foundry, rolar (o servidor rola a rolagem do catálogo), fixa ou nenhuma. A máxima cai 2 (4 o borgware; nada a peça que não perde Humanidade), e a de agora não passa dela. EMP pela Humanidade, e o aviso de ciberpsicose em 0 ou menos.
  - **A opção espera a base:** o Big Knucks só entra depois do cyberbraço instalado.
  - **Depois:** a peça conta no cromo de 2077 (a conexão Smart, o braço da Burya). O registro mostra os dados, o preço e a Humanidade de agora ao mestre e ao dono. A aba Cyberware da wiki mostra o que espera e o que foi instalado (onde e quanto custou), com a Humanidade da mesa.
  - **Fica de fora:** retirar cyberware (mesma DV, 4 horas; falhar destrói a peça) e escolher o lado da base na hora: o lado é o do pedido.
  - **Testado:** 3 testes, 23 de 24 mutações que caem (a viva é equivalente: o chipware já não tem lugar), os cenários criador, cyberware, Foundry, contas e economia, e a conferência no Edge (o painel do mestre, o registro, a jogadora e a aba Cyberware da wiki).
- [x] **M17 · Veículos** (`veiculo.embarcar`, `veiculo.descer`, `veiculo.motorista`; o veículo leva os ocupantes no `token.mover`):
  - **O veículo:** a ficha de NPC do tipo Veículo ganha os assentos (a moto do Foundry traz os dela); o token tem o SDP no lugar do HP, `veiculo: { assentos, ocupantes }` e 2 quadrados. Não entra na iniciativa.
  - **Ocupantes:** `token.dentro`, no lugar do veículo (o alcance, a visão e o combate contam dali); a página desenha menor, numa roda em volta do centro, por cima. O primeiro dirige (move o veículo); "Dirigir" troca.
  - **Embarcar e descer:** arrastar o token para cima do veículo, ou o cartão; o jogador perto (até 2 quadrados da borda), o mestre de qualquer lugar; descer perto e sem atravessar parede, ou num lugar livre ao lado. Tirar o veículo da cena deixa todos ao lado.
  - **Fica de fora:** as regras de perseguição e de atropelamento, e o tiro no ocupante através do veículo (o mestre resolve).
  - **Testado:** 1 teste, 18 mutações que caem, e a conferência no Edge (arrastar o Jax para a moto, o cartão com os assentos, ela dirigindo, descer pelo cartão).
- [x] **M18 · NPCs do mestre** (`mesa-api.js` `npc.salvar`, `npc.copiar`, `npc.apagar`; `importar-foundry.js` `converterAtores`):
  - **As fichas do mestre:** na aba Fichas, Novo NPC, Editar, ou Copiar uma da wiki para mudar. Nome, grupo, tipo (pessoa, Black ICE, veículo), HP, SP, os STATs, as perícias com a base (em português ou em inglês; grava o inglês), as armas, as notas e a imagem. Ficam no `mesa.json` da campanha (`state.npcs`, até 300), e só o mestre recebe (evento `npcs`).
  - **O token:** copia a ficha ao entrar na cena (as notas viram a nota do mestre; a classe da arma que veio do Foundry vale mais que o nome). Mudar ou apagar a ficha não mexe no token.
  - **A migração dos atores:** 26 mooks: os 12 iguais ao livro já são as fichas da wiki; os 14 outros (as variantes, os feitos à mão e o Cyberpsycho, que mudou do livro) viram fichas do mestre, com as perícias (STAT + nível), as armas (a classe do Foundry), a armadura vestida, o cyberware e o equipamento nas notas. O Black ICE Wisp e a moto também. Qyan e dwa são personagens: entram pela ficha da wiki. Ficam de fora o contêiner (vazio) e o modelo de Black ICE do sistema.
  - **A importação:** as fichas antes das cenas, e o token do ator vira a ficha que veio dele (`npcOrigem`); o mesmo ator não entra duas vezes (`--substituir` troca e mantém o id). `--sem-npcs` deixa de fora.
  - **Fica para o M13 e o M17:** as regras da NET (o Black ICE contra o netrunner) e as do veículo (assentos, perseguição). Até lá, as fichas guardam os números e as notas.
  - **Testado:** 4 testes, 30 mutações que caem, e a conferência no Edge (a lista com as 16 que vieram, editar a da MaxTac, Novo NPC, Copiar, Apagar, Pôr na cena e o editor no celular).
- [x] **M19 · Áreas e desenhos** (`mesa-areas.js`; `desenho.criar`, `desenho.editar`, `desenho.apagar`, `desenho.limpar`; evento `desenhos`):
  - **As formas:** círculo, cone (90° por padrão, como o cartucho), linha (com largura), retângulo e traço livre. Ficam em `scene.desenhos` (até 300 por cena), em px da cena; a ponta encaixa a cada meio quadrado (Shift solta).
  - **Quem:** todos na cena põem e veem; o jogador só na cena aberta, e mexe só nos dele; o mestre mexe em todos e esconde os dele.
  - **A escolhida:** mostra a medida em metros e quem está dentro (o centro do token), com um anel em cada um; arrastar move (o traço livre anda inteiro); Delete apaga.
  - **Fica de fora:** o texto no mapa e as formas do Foundry que não são área (polígono, elipse). A área não aplica dano sozinha: o ataque de área do combate continua pelo cartão.
  - **Testado:** 2 testes, 22 de 24 mutações que caem (as duas vivas são equivalentes: o escondido é sempre do mestre, e o mestre não tem conta), e a conferência no Edge (a explosão em volta do token com quem está dentro, o cone, a linha, o traço livre, mover e apagar).
- [x] **M6b · Luz e escuridão** (como no Foundry 12):
  - **Luz global** (aba Cena): a cena toda clara. Sem ela, cada token vê o alcance da visão dele (30 m, como os tokens do Foundry deste mundo) e o que uma luz ilumina. **O servidor nem manda o token no escuro.**
  - **Luzes:** o mestre põe, move e muda (ferramenta L), com cor e escondida; as do Foundry vêm com a cor. A parede de luz segura a luz.
  - **Tokens:** o alcance e a luz pelo cartão; o jogador acende e apaga a lanterna do próprio token (6 m clara, 12 m de penumbra).
  - **Escuridão:** escurece a tela de todos (o mestre vê mais claro), e as luzes abrem clareiras.
  - **Importação:** a luz global, a escuridão, a visão e a luz dos tokens. As cenas escuras do Foundry (Clínica, Japantown, Casa, as arquiteturas da NET) ficam com a visão ligada.
  - **Falta:** a luz em cone (vira círculo; não há nenhuma neste mundo), os modos de visão (infravermelho, visão no escuro do cyberware) e a animação das luzes.
  - **Testado:** 3 testes, 21 mutações que caem.

## Fase 3: a virada

- [ ] **M20 · A mesa da campanha é a wiki:** uma chave por campanha.
  - Com ela, a API recusa a ficha do Foundry (409, como a trava do "ator antigo").
  - O importador do Foundry para.
  - O `doc.mesa` vira histórico.
- [ ] **M21 · Ensaio:** uma sessão inteira com os jogadores de teste e pelo menos um jogador de verdade, no celular e no computador.
- [ ] **M22 · Desligar o Foundry no servidor:**
  - backup completo antes;
  - o `foundry14.service` desabilitado (libera memória: o servidor tem 1 GB);
  - módulos e sistema arquivados;
  - o README da wiki sem o Foundry.

## Fase 4: a mesa melhor que o Foundry (o plano de 2026-10-22)

**O pedido do usuário (2026-10-22):** melhorar a mesa sempre, com o Foundry VTT e os outros VTTs de inspiração. O plano
saiu de duas análises separadas, a do Claude Code e a do Codex, comparando a mesa com o núcleo do Foundry 13 e 14 (os
níveis de cena, as regiões, a lista de objetos), os módulos mais usados (Monk's TokenBar, Quick Insert, Global Progress
Clocks, FXMaster) e outros VTTs (Owlbear Rodeo 2, Roll20, Alchemy, Fantasy Grounds, Shard).

**Como esta fase anda:**
- **Onde:** na branch `Tabletop`, numa worktree própria (sessão Claude, com o Codex de worker e revisor). O usuário junta
  no `master`. A reserva `[~]` daqui só aparece no `master` depois dessa junção.
- **A ordem combinada:** a frente A (a virada com segurança), a C (as ferramentas do mestre), a B (a mesa narrativa) e a
  D (a atmosfera e o celular). Um item por ciclo, cada um com teste e mutações que caem.
- **Fora daqui:** a NET (o M13 é de outra sessão).

### A. A virada com segurança

- [x] **M24 · O arquivo da mesa nunca se perde** (sessão Claude, com o Codex, 2026-10-22; `mesa-api.js` `lerMesa`,
  `tableOf`, `flushTable`, `openStream`; `mesa.js` `conectar`). Antes, um `mesa.json` que não abria virava uma mesa
  vazia (`catch { /* mesa nova */ }` no `tableOf`), e a próxima gravação apagava a campanha. A escolha do usuário: a
  cópia anterior, senão recusa.
  - **A cópia:** a cada minuto, o mesmo snapshot também vai para o `mesa.anterior.json` (o intervalo vale entre
    reinícios, pela data do arquivo).
  - **O arquivo ruim** (o JSON quebrado, o `null`, o array, o objeto sem a lista de cenas, como `{}`): os bytes ficam
    guardados em `mesa.ilegivel-…json`, a mesa abre a cópia e avisa só o mestre, com a hora da cópia em Brasília (o
    servidor roda em UTC). O "no máximo um minuto" vale enquanto a cópia grava: a falha só dela vai para o log.
  - **O `mesa.json` que sumiu:** a cópia, com o aviso. Mesa nova só quando os dois nunca existiram; a cópia quebrada que
    sobrou recusa, porque havia uma mesa.
  - **Sem cópia boa:** 503, nada é sobrescrito, e a página mostra o motivo no canto da conexão (o `EventSource` não
    entrega o corpo da recusa: a página pede o estado quando a conexão fecha de vez). Consertado, entra sozinha.
  - **O ocupado** (`EBUSY`, `EPERM`, `EACCES`, `EMFILE`, `ENFILE`, `EAGAIN`, no principal ou na cópia): 503 só naquela
    vez, sem guardar a mesa na memória; o pedido seguinte lê de novo.
  - **A gravação que falha:** tenta de novo a cada 5 segundos; o mestre recebe "não conseguiu gravar" uma vez por
    sequência e "voltou a gravar" no fim. A falha só da cópia tenta de novo sem esse aviso.
  - **O stream** confere a mesa antes de responder 200.
  - **Testado:** 16 testes (`mesa-arquivo.test.js`, com as opções `lerArquivo`, `gravarJson`, `copiaACada` e
    `tentarGravarDe`), 23 mutações que caem, e a conferência no Edge (o motivo no canto da conexão e a volta sozinha ao
    "ao vivo"). O Codex escreveu a primeira versão; a revisão do Claude achou a cópia ocupada e a cópia quebrada sem o
    principal, e a revisão do Codex achou o `{}`: os três abriam uma mesa vazia.
  - **Achado no ciclo (não é deste item):** o teste "áudio: pausar, continuar, ir…" (`mesa-audio.test.js`, a pausa em
    0,15 s ± 0,1) cai em parte das rodadas da suíte inteira, com os arquivos em paralelo: 3 de 5 antes do M24, 1 de 5
    depois. Sozinho, passa. Ele mede o relógio de verdade; não foi afrouxado.
- [ ] **M25 · O personagem como fonte única:** o dano, a recarga e a Sorte partem da ficha gravada, e todos os tokens do
  personagem pegam o resultado na hora. Hoje o `dano.aplicar` conta sobre a cópia no token e grava com o `writeSheet`,
  sem atualizar os outros tokens do mesmo personagem (o `writeCharacter`, ao lado, atualiza).
- [ ] **M26 · A ação confirmada no celular:** "enviando", "feito" ou "incerto" em cada pedido, o texto digitado que não
  some, e o pedido repetido depois de uma queda que não gasta a bala nem aplica o dano duas vezes (um id por pedido).
- [ ] **M27 · A conexão lenta no SSE:** a fila de cada conexão com limite (a atividade atrasada cai; a conexão que não
  esvazia recomeça pelo estado inteiro). Hoje o `response.write` ignora a resposta.
- [ ] **M28 · Os critérios de saída da virada,** escritos no M4 e no M20 a M22 e conferidos:
  - a ficha que vive sem o Foundry (o `personagem-jogo.js` ainda lê os STATs e o inventário do `doc.mesa`) e a loja que
    entrega sem ele;
  - o backup com a mídia e as fichas no mesmo ponto;
  - a memória, o tempo de gravação e o tráfego medidos na VM de 1 GB, com o grupo inteiro e os mapas de verdade;
  - o celular que dorme, troca de rede ou volta com a página velha.

### C. As ferramentas do mestre

- [ ] **M29 · Pedir um teste ao grupo** (o Monk's TokenBar): o mestre escolhe os personagens e a perícia, cada jogador
  rola na tela dele, e o mestre vê quem já rolou.
- [ ] **M30 · Estados no token com duração** (os Active Effects do Foundry, os efeitos do Fantasy Grounds): em chamas,
  atordoado, cego, a droga; o ícone no token e o fim sozinho pelas rodadas do combate.
- [ ] **M31 · Passagens entre cenas** (as regiões do Foundry, a versão leve dos níveis de cena do Foundry 14): a escada
  ou o elevador que leva o token para outra cena. Night City é vertical.
- [ ] **M32 · Encontros prontos** (o Fantasy Grounds): os NPCs, as posições e a nota de condução guardados juntos e
  postos na cena de uma vez.
- [ ] **M33 · Desfazer e refazer a edição da cena** (o Owlbear Rodeo): a parede, o tile, a nota e a luz.
- [ ] **M34 · Pausa, seleção em lote e busca rápida** (a pausa do Foundry, a lista de objetos do Foundry 14, o Quick
  Insert): a pausa segura os prazos da defesa.

### B. A mesa narrativa

- [ ] **M35 · O Agent:** as mensagens dos contatos (o fixer, os NPCs), com foto e áudio, no "celular" do personagem; cada
  anexo pode virar pista.
- [ ] **M36 · O acervo das pistas** (o diário do Shard): o que o mestre mostrou fica guardado para o jogador reabrir.
  Hoje o `nota.mostrar` só manda para quem está conectado.
- [ ] **M37 · A cena de diálogo** (as cenas do Alchemy): o fundo e os retratos de quem fala, sem tokens, e o "falar
  como" o NPC, com o balão em cima do token.
- [ ] **M38 · O quadro da missão e os relógios** (o Global Progress Clocks): o objetivo, as pistas e o pagamento; o
  relógio "reforços chegando 3/6", que o mestre mostra ou esconde.
- [ ] **M39 · O registro de cada sessão para a wiki:** o começo, o fim, as decisões e as revelações, exportados para a
  página da campanha. Hoje o registro guarda só as últimas 200 entradas.

### D. A atmosfera e o celular

- [ ] **M40 · Luzes animadas e texto no mapa:** o neon que pisca, a sirene, o pulso (o "Falta" do M6b).
- [ ] **M41 · Clima e partículas** (o FXMaster): a chuva ácida, o smog, a fumaça; desligados no modo leve.
- [ ] **M42 · Sons no mapa e de efeito:** o som com raio, que a parede abafa; a porta, o tiro, a granada (o "Falta" do
  M11).
- [ ] **M43 · O modo leve no celular e a próxima cena pré-carregada:** o mapa em vídeo vira imagem, o canvas com limite
  de resolução, a mídia das cenas antigas sai da memória (hoje fica em `S.imagens`); o mestre prepara a próxima cena.
- [ ] **M44 · Os modos de visão do cyberware:** o infravermelho e a pouca luz (o "Falta" do M6b).
- [ ] **M45 · O `mesa.js` dividido aos poucos:** a conexão e os pedidos primeiro, depois o estado, o desenho e os gestos.

## Para as outras sessões

A `sistema-v14` (o sistema `cpr-fieldbook` para o Foundry 14, plano C1–C28) continua sendo a mesa até a virada (M20–M22). Combinar com o usuário quanto ainda vale investir nela.
