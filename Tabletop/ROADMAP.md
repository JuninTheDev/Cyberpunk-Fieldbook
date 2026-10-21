# Mesa da wiki: o caminho para substituir o Foundry

**Decisão do usuário (2026-10-20):** a mesa da wiki vai **substituir o Foundry completamente**. O HP mexido na mesa volta para a ficha, e as cenas do Foundry vêm para a mesa.

**Como usar este arquivo:**

- Cada item tem um código (M1, M2…).
- `[x]` é feito; `[~] (sessão)` é reservado, com push antes de começar; `[ ]` está livre.
- A ordem é a recomendada: a Fase 1 é o mínimo para jogar uma sessão sem o Foundry.
- Cada item fecha com teste em `mesa.test.js` (ou na suíte do projeto) e mutações que caem.

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
  - **Limite:** cena com milhares de paredes fica lenta (4000 paredes: 1,7 s por cálculo). As do Foundry deste mundo têm no máximo 201.
- [ ] **M7 · Ficha de jogo na wiki** (tudo que muda na mesa, em `doc.jogo`):
  - **Já vai para a ficha:** HP, SP (com a ablação), Sorte, a munição no pente, as lesões críticas e o Death Save.
  - **Falta:** Humanidade, dinheiro, IP e reputação.
  - **O equipamento:** equipado, carregado e guardado.
  - **Personagem sem Foundry:** o que nunca foi para o Foundry entra na mesa direto da criação.
- [x] **M8 · Combate** (o Fluxo de Combate, em `mesa-combate.js` e `mesa-regras.js`):
  - **Ataque:** com a arma da ficha (STAT + perícia + 1d10, e a Sorte), contra a DV pelo alcance medido ou contra a esquiva às cegas do alvo. Tiro, só com REF 8+; corpo a corpo, sempre.
  - **Dano:** com a armadura (SP, ablação; faca e artes marciais com metade do SP), cabeça ×2 e a lesão crítica com dois 6.
  - **Tipos de ataque:** tiro, mirado (−8), autofogo, fogo supressivo (Suprimido), corpo a corpo, briga e explosivo (área de 10 × 10 m).
  - **Mortalmente Ferido:** lesão a cada acerto, Death Save no começo da vez, a morte e a vez pulada.
  - **Desfazer** (o mestre): volta o HP, o SP, as lesões e a bala.
  - **Falta:** a espingarda com cartucho (passou para o M9).
- [ ] **M9 · Modos de 2077 e Artes Marciais:**
  - Smart, Tech, Power e ricochete (as macros de hoje);
  - a espingarda com cartucho (a área do chumbo);
  - os movimentos das Artes Marciais (o C10 da `sistema-v14`).
- [x] **M10 · Chat:** texto para todos, só para o mestre ou sussurro a um jogador (os outros nem recebem), `/r 2d6` rola, e os cartões de rolagem e de ataque no mesmo fio.
- [ ] **M11 · Áudio:** as playlists e a música da cena (o mundo tem 3 playlists, 4 faixas, e as músicas soltas em `Data/`). O mestre toca para todos, com o volume de cada um.
- [ ] **M12 · Notas no mapa:** um ponto no mapa que abre um handout ou um documento da wiki (os diários do Foundry viram documentos da campanha).

## Fase 2: o que os módulos fazem hoje

- [ ] **M13 · NET Architect:**
  - o ponto de acesso num tile e a janela da NET para o netrunner;
  - o Black ICE no combate e as ações de Interface;
  - as cenas de arquitetura (já importadas, com os nós em vídeo).
- [ ] **M14 · Painel Tático:** o HUD com o retrato por estado de ferimento, o ATK pela ficha e o estilo de cada jogador.
- [ ] **M15 · Loja entrega na wiki:** o pedido aprovado entra direto na ficha de jogo. Hoje é o Foundry que entrega.
- [ ] **M16 · Instalar cyberware na wiki:** cobra a instalação e rola a perda de Humanidade (hoje é pela ficha do Foundry).
- [ ] **M17 · Veículos:** SDP, assentos e o veículo como token.
- [ ] **M18 · NPCs do mestre:**
  - criar e editar NPC próprio, além das fichas da wiki;
  - migrar os atores do mundo: 26 mooks, Qyan, Black ICE, veículo e contêiner.
- [ ] **M19 · Áreas e desenhos:** cone, círculo e linha (área de efeito), e desenho livre no mapa.
- [ ] **M6b · Luz e escuridão:** o alcance da visão, as luzes do Foundry (já guardadas) e a escuridão da cena. Sem isso, a cena fica toda iluminada: a visão só para nas paredes.

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

## Para as outras sessões

A `sistema-v14` (o sistema `cpr-fieldbook` para o Foundry 14, plano C1–C28) continua sendo a mesa até a virada (M20–M22). Combinar com o usuário quanto ainda vale investir nela.
