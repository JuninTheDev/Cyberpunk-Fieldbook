# Mesa da wiki (versão de teste)

Um tabuleiro ao vivo dentro da wiki, por campanha. Tem cenas com mapa (imagem ou vídeo) e grade, tiles, tokens dos personagens e das fichas de NPC, névoa, visão pelas paredes com portas, luz e escuridão, régua com a DV por alcance, ping, rolagens do RED, iniciativa, combate (o Fluxo de Combate), chat e áudio (playlists com música e YouTube). O desenho segue o da mesa do Foundry, com as regras e os dados da wiki. A diferença principal: **o servidor decide o que cada pessoa recebe**.

**A meta é substituir o Foundry completamente** (decisão de 2026-10-20). O que falta, em ordem, está no [ROADMAP.md](ROADMAP.md).

Esta pasta é a versão de teste. Ela sobe a wiki de verdade com a mesa junto, com dados de teste, sem mexer nos dados da wiki. O que muda para entrar no projeto está em **Para pôr na wiki**, no fim.

## Como testar

1. Dê dois cliques em **`testar-mesa.bat`**, ou rode `node Tabletop/testar.js`.
   - Na primeira vez, ele cria os dados de teste em `%LOCALAPPDATA%\FieldbookTeste\mesa-wiki`, fora do OneDrive. Quando o formato dos dados de teste muda, ele apaga os antigos e cria de novo.
   - São dois jogadores de mentira (Ana e Bruno), cada um com um personagem (Jax "Ferrugem", Solo; Iris "Nyx", Netrunner), com as armas e a armadura do catálogo da loja.
   - Para as armas de 2077: o Jax tem a Lexington (Power, com o Ricochete) e uma espingarda com cartucho; a Nyx tem a Chao (Smart, com a munição melhorada e o Neuroport) e a Kenshin (Tech, para carregar).
   - Para a ficha de jogo, o Jax tem:
     - 1.250eb e Humanidade 36/40 (EMP 3);
     - um armorjack médio guardado, para trocar;
     - balote para a espingarda;
     - caixas de munição com bala de verdade.
   - A ficha da wiki mostra os mesmos itens que a mesa.
   - São duas cenas: o beco e o diner do Frag Maps, que já estão no Foundry deste computador. O diner tem névoa.
   - No beco ficam dois Guarda-costas e um Netrunner escondido.
   - Com o backup do Foundry neste computador, entram sozinhos:
     - as 13 cenas dele (as com paredes já vêm com a visão ligada);
     - as 5 playlists: Intro, Combate e Fundo, com as músicas, e os dois grupos do yt-jukebox, com 51 vídeos do YouTube;
     - a cena Intro, que toca a música dela.
2. **As cenas do Foundry à mão** (outro backup, ou de novo): com o teste ligado, rode noutra janela:
   ```
   node Tabletop/importar-foundry.js --tar "C:\Users\kouar\Backups\Night City Fieldbook\foundry12-completo-2026-10-12.tar" --mundo edgerunners-storys
   ```
   - **O que vem:** as 13 cenas, com mapas, vídeos, tiles e tokens (35 arquivos, 215 MB), e as playlists, com as 3 músicas.
   - **Opções:**
     - `--listar` só mostra as cenas e as playlists;
     - `--cenas "A; B"` escolhe algumas cenas;
     - `--sem-audio` deixa as playlists de fora;
     - `--substituir` troca as cenas e as playlists já importadas.
3. **Mestre:** neste computador, a wiki fica em `http://localhost:8010` e a mesa em `http://localhost:8010/mesa`.
4. **Jogador:** abra `http://localhost:8010/mesa` numa **janela anônima** (Ctrl+Shift+N) e clique num dos jogadores de teste. Só no teste, o botão **Testar como jogador** faz o mesmo.
5. **A ficha da wiki:** mexa no Jax na mesa e abra a ficha dele na wiki (Personagens). Ela mostra o mesmo de lá, em até 30 segundos:
   - o HP;
   - o dinheiro que você deu;
   - a armadura que ele vestiu;
   - a munição no pente.

   O HP mexido na ficha também volta para a mesa.
6. **Celular na rede de casa:** `$env:HOST='0.0.0.0'; node Tabletop/testar.js`. O terminal mostra o endereço.
7. **Começar de novo:** `testar-mesa.bat --limpar`.
8. **Depois de mudar o código da mesa:** feche a janela do teste (Ctrl+C) e rode de novo. O servidor carrega o código e a página uma vez só, quando liga: até reiniciar, ele entrega a página daquele momento. A página aberta mostra **A mesa foi atualizada** quando o servidor volta com código novo.

Teste automático (não abre navegador): `node --test Tabletop/` (64 testes).

## O que dá para fazer

**A tela** (a mesa limpa, como o Foundry 14):

- **O mapa ocupa a tela toda.** O resto flutua por cima dele.
- **Barra da direita:** a faixa de ícones (Chat, Combate, Fichas ou Personagem, Áudio e Cena) abre a aba por cima do mapa, e o mapa não encolhe.
  - **Recolher:** clique no ícone da aba aberta, na seta de baixo ou aperte **B**. O navegador lembra.
  - Recolhida, o ícone do Combate ganha uma bolinha quando a iniciativa muda.
- **Chat:** o registro ocupa a aba toda, com a caixa de mensagem embaixo.
  - O botão **Rolar** abre a bandeja: o teste de perícia, os dados e a lesão crítica. **Rolar**, no cartão do token, abre a bandeja com ele.
  - Com a barra recolhida, a caixa fica no canto do mapa, e as mensagens novas aparecem por cima dela e somem em uns 9 segundos. O mouse em cima segura, e o ataque esperando a defesa fica até resolver.
  - Com o chat fora de vista, o ícone dele ganha uma bolinha quando chega mensagem.
- **Canto de cima:** o menu ≡ (voltar para a wiki, a campanha, a conta e os atalhos) e a cena. O mestre troca a cena por ali, e **Levar todos** leva os jogadores para ela.
- **Canto de baixo:** a conexão, quem está na mesa e o som.
- **Ferramentas** (a coluna da esquerda):
  - só com ícone, em grupos: as de todos, as do mestre e as da vista;
  - ao passar o mouse, aparecem o nome, o atalho e como usar;
  - as opções da ferramenta escolhida abrem ao lado, como antes.
- **O token escolhido** (clique nele) ganha um HUD junto dele no mapa, como o Token HUD do Foundry. O HUD some enquanto o token é arrastado.
  - **O HP:** − e +, ou escreva o número; "−5" e "+5" somam.
  - **Os botões:** Atacar, Rolar e Lanterna. O mestre também tem Esconder e Pôr no combate.
  - **O cartão** abre na aba **Token** da barra: as armas e a munição, o ataque e, para o mestre, o dano à mão, a aparência e a nota. Abre pelo botão do HUD ou por um duplo clique no token.
- **Celular:** a barra é a folha que sobe de baixo, pelo botão **Painel**. Ela abre pela metade, com o mapa em cima.
  - **A alça** no alto da folha: tocar troca metade e tela cheia; arrastar para cima enche, e para baixo baixa (da metade, fecha).
  - Com a folha aberta, o HUD do token fica acima dela.
- **A cena inteira** (0 ou a ferramenta Cena) enquadra no que sobra livre: sem a barra aberta, a pastilha e as ferramentas.

**Mestre**

- **Cenas** (aba Cena): crie a cena com um mapa (imagem PNG, JPEG ou WebP, ou vídeo WebM ou MP4) ou só com a grade.
  - **Grade:** quadrada ou sem grade (sem grade, a régua mede em linha reta e o token não encaixa).
  - **Unidade:** "m" nas cenas da mesa, "bit" nas arquiteturas da NET.
  - **Ajuste:** olhando o mapa; a grade fica amarela até você salvar.
  - **Ver** olha uma cena sem levar os jogadores. **Abrir** leva todos para ela.
  - **Cena importada do Foundry:** vem com os tiles (o tile escondido só o mestre vê, pela metade) e com as paredes, as portas, as luzes e a luz da cena.
- **Paredes** (ferramenta W): arraste para desenhar parede, porta, porta secreta ou janela (vê, não passa). A ponta gruda na grade e nas outras paredes; Shift solta.
  - Clique numa parede para trocar o tipo ou apagar (Delete).
  - **Visão pelas paredes** (aba Cena): cada jogador vê só o que os tokens dele veem. **Esquecer o explorado** apaga a penumbra de todos.
- **Portas:** clique no ícone abre e fecha; com Shift, tranca. A porta secreta só você vê.
- **Luz** (aba Cena): **Luz global** deixa a cena toda clara. Sem ela, cada token vê o alcance da visão dele (30 m, se você não mudar) e o que as luzes iluminam. **Escuridão** escurece a tela de todos; as luzes abrem clareiras.
  - **Luzes** (ferramenta L): clique no mapa para pôr uma, com a luz clara, a penumbra (em metros) e a cor; clique numa para escolher, arraste para mover, Delete apaga. A escondida só você vê.
- **Notas** (ferramenta J): clique no mapa para pôr um alfinete.
  - **O que ele abre:** um handout (título, texto e imagem) e, se quiser, uma página da wiki. Cole o endereço da página: fica o que vem do # em diante.
  - **Quem vê:** só você; os jogadores, quando um token deles vê o ponto (a névoa e as paredes contam); ou os jogadores, sempre.
  - Clique numa nota para editar, arraste para mover, Delete apaga.
  - **Mostrar a todos** abre a nota na tela de todos os jogadores, mesmo a que só você vê no mapa.
- **Tiles** (ferramenta T): **Pôr um tile** envia a imagem ou o vídeo para o meio da tela.
  - Clique para escolher e arraste para mover; o quadrado amarelo no canto muda o tamanho. A grade encaixa; Shift solta.
  - Na barra: transparência, girar, esconder dos jogadores, para a frente ou para trás, e apagar (Delete).
- **Margem** (aba Cena, em quadrados): a faixa em volta do mapa onde o token pode esperar, fora dele. A das cenas do Foundry vem junto.
- **Em jogo e a loja da campanha:** pôr o token de um personagem numa cena põe ele em jogo.
  - A criação trava para o jogador, como depois da importação no Foundry.
  - As compras viram pedidos na Loja da wiki. Você aprova lá (Personagens → Loja), e a wiki entrega na hora: confere o dinheiro, desconta, registra no extrato e põe os itens na ficha e no token (em até 4 segundos), com a arma carregada.
  - Sem dinheiro, o pedido fica aprovado com o motivo, e você tenta de novo depois.
  - O personagem ligado ao Foundry continua recebendo pelo Foundry.
- **Ficha de jogo** (aba Fichas → **Ficha**, em cada personagem):
  - **Os números:** a Humanidade (com o EMP), o dinheiro, os Pontos de Melhoria e a reputação.
  - **Mudar:** escolha o número, ponha quanto soma ou tira e o motivo ("pagamento do fixer", "terapia"). Vai para o extrato da ficha e para o registro, que só você e o dono do personagem veem.
  - **Limites:** o dinheiro não fica negativo; a reputação vai de 0 a 10; a Humanidade não passa da máxima.
  - **O inventário:** o uso de cada item (equipado, carregando, guardado) e a quantidade da munição e do equipamento (a granada que foi, a caixa que o grupo achou).
- **Tokens** (aba Fichas): ponha os personagens da campanha e as fichas de NPC da wiki (o livro, o Mission Kit, o Black Chrome e o elenco do Protocolo Morana).
  - O NPC entra escondido, se você quiser.
  - Também há o token livre: um drone, um carro, uma porta.
- **Cartão do token** (aba Token): mexa no HP (−5, −1, +1, +5 ou o número), esconda ou mostre, veja as armas do NPC, escreva uma nota (só sua), **Atualizar da ficha** e tire da cena.
  - **Aparência:** nome, tamanho (1 × 1 a 4 × 4), cor, imagem, alcance da visão e a luz que o token leva. O personagem usa o retrato da ficha.
- **Névoa** (ferramenta N): pinte para revelar; com Alt, cobre. Revelar tudo e Cobrir tudo ficam na aba Cena.
- **Combate:** a iniciativa (REF + 1d10) sai para todos os tokens não escondidos.
  - Empates rolam de novo.
  - **Próximo** passa a vez e conta as rodadas. Quem morreu perde a vez; o Mortalmente Ferido faz o Death Save no começo da vez.
  - Para corrigir uma iniciativa, mude o número.
- **Ataque do NPC:** pelo cartão do token, como o jogador. Quando o NPC é atacado, a pergunta da defesa abre para você.
  - A defesa que um jogador ainda não decidiu aparece na aba Chat, com o total, e você pode decidir por ele.
  - **Dano à mão**, **Estabilizar**, **Marcar morto** e **Tirar Suprimido** ficam no cartão.
  - **Desfazer** no cartão do ataque volta o HP, o SP, as lesões, a bala, a carga Tech e o ferrolho.
- **Áudio** (aba Áudio), como as playlists do Foundry e o yt-jukebox:
  - **Playlists:** crie a playlist e ponha as músicas.
    - **Enviar música:** MP3, OGG, M4A, WAV ou FLAC.
    - **Link do YouTube:** o link de um vídeo vira uma música (o título chega sozinho, um pouco depois). O link de uma playlist do YouTube, ou de um mix, traz todas as músicas dela.
  - **Canais:** cada playlist toca no canal dela, **Música** ou **Ambiente**, e os dois tocam juntos (a trilha e a chuva).
  - **Tocar:** **▶** na música toca para todos; **▶** na playlist toca a playlist inteira.
    - **Ordem:** em ordem ou aleatória, e **No fim, começar de novo**.
    - **Controle:** em **Tocando agora**, pausar, continuar, ir para um ponto (arrastando a barra), próxima e parar.
  - **Cada música (⋯):**
    - o volume dela, para todos;
    - **Repetir esta música** (o ambiente, um tema);
    - subir, descer, mover para outra playlist, renomear e apagar.
  - **Música da cena** (aba Cena): a música, ou a playlist inteira, que toca quando a cena abre. Se ela já está tocando, continua de onde está.
  - **Quem avança:** a sua página. Quando a música acaba, ela pede a próxima; deixe a mesa aberta enquanto toca.
  - **Quem chega no meio** ouve do mesmo ponto que os outros.
- **Ping com Shift:** traz a tela de todos para o ponto.
- **Seu cursor e sua régua** podem ficar só com você (aba Cena → Você).

**Jogador**

- Vê só a cena aberta e arrasta o próprio token (as setas movem um quadrado).
- **Ao arrastar:** a distância aparece contra o MOVE (anda MOVE × 2 m, corre o dobro), em verde, amarelo ou vermelho.
- **Régua** (R): quadrados, metros e a DV por alcance de pistola, SMG, espingarda, rifle de assalto e sniper (a tabela da wiki).
- **Aba Personagem:** os STATs e as perícias da ficha. Tocar numa perícia rola STAT + perícia + 1d10.
  - **Os números:** a Humanidade (com o EMP), o dinheiro, o IP e a reputação; só o mestre muda.
  - **O inventário:** cada item equipado, carregando ou guardado.
    - A armadura vestida dá o SP, e a pesada tira de REF, DEX e MOVE (já nos números).
    - Vestir outra no mesmo local tira a que estava, e cada uma guarda a própria ablação.
    - A arma guardada (em casa, no carro) não aparece no ataque.
- **Recarregar** (cartão do token): a munição sai da caixa da ficha. Com mais de uma que serve, escolha qual: o balote tira o cartucho da espingarda, e o que estava no pente volta para a caixa. Sem munição, não recarrega.
- **Só para o mestre:** a rolagem fica só entre o jogador e o mestre.
- **Visão:** com a visão ligada, vê o que o token dele vê; o que já viu fica na penumbra. No escuro, vê o alcance do token e o que está iluminado; **Acender a lanterna** (cartão do token) ilumina em volta dele, para todos. Clique na porta abre e fecha. Parede e porta fechada param o token (a linha do arrasto fica vermelha).
- **Atacar** (cartão do token): a arma da ficha, o modo (tiro, mirado, ricochete, autofogo, supressivo, cartucho, corpo a corpo, explosivo), o alvo (na lista ou no mapa), o local e a Sorte. A prévia mostra a DV pelo alcance e os ajustes da arma.
- **Armas de 2077** (Mission Kit, como o módulo do Foundry aplica): a arma mostra a classe embaixo do nome (**Power**, **Smart** ou **Tech**, ou "Rebuild" quando é um Rebuild instalado).
  - **Power:** o modo **Ricochete** (−4; −2 com o Ballistic Coprocessor), e a lesão crítica causa 10 de dano bônus em vez de 5.
  - **Smart:** +1 no ataque à distância, e só dispara com o Neuroport, Interface Plugs ou Subdermal Grip instalado (o cartão avisa "sem conexão Smart"). Com a munição **Smart melhorada**, errou a DV (ou a esquiva) por 5 ou menos: o servidor rola a segunda chance, 14 + 1d10 com as penalidades do tiro.
  - **Tech:** **carregar** no cartão (gasta a Ação de Movimento; a Burya, não). Carregada, o próximo ataque ignora metade do SP; a carga sai no tiro ou em 20 rodadas (a Omaha fica até o fim do turno).
  - **As regras de cada arma:** balas por tiro (e o dano com menos balas), a trava de balas mínimas, o dano fixo, o dano do tiro mirado (a Unity), os dois canos (a Palica), o segundo alvo a até 4 m (a Kappa), o ferrolho (a Grad: **manejar o ferrolho** antes do próximo tiro), a coronha recolhida (a Dian, −1), só Smart melhorada (a Zhuo) e a lesão de quem não aguenta o coice (a Carnage sem BODY 10, a Burya sem braço reforçado).
  - **Qualidade excelente:** +1 no ataque, em qualquer arma.
- **Espingarda com cartucho:** um ataque contra DV 13; se acertar, 3d6 (rolado uma vez) em todos à frente, até 6 m e à vista (a parede tapa). "À frente" é até 45° para cada lado da linha até o alvo escolhido. REF 8+ esquiva. Com cartucho no pente, a espingarda só faz cartucho; com balote, só tiro; sem saber a munição (NPC), os dois.
- **Defender:** quando alguém ataca o token dele, a pergunta aparece na tela, sem o total do ataque: esquivar (REF 8+ contra tiro; corpo a corpo, sempre) ou aguentar. Sem resposta em 60 segundos, aguenta.
- **Chat** (embaixo do registro): para todos, só para o mestre ou sussurro a um jogador. `/r 2d6` rola.
- **Notas:** um clique no alfinete (com a ferramenta Mover) abre a nota: o handout e, se tiver, a página da wiki. Esc fecha. O jogador só vê o alfinete que o mestre deixou ver; o "quando um token vê" aparece quando o token chega perto, como no Foundry.
- **Som:** ouve o que o mestre toca.
  - **Ligar:** o navegador só toca som depois de um clique na página. Até lá, o canto de baixo mostra **♪ Ligar o som**, e o primeiro clique liga. No celular também.
  - **Topo:** o botão mostra a música que toca e abre a aba Áudio.
  - **Volume:** a aba Áudio tem o volume da música e o do ambiente, que ficam só no aparelho dele.
  - **Vídeo:** o do YouTube aparece num quadro no canto da tela. O **–** esconde o quadro, e a música continua.
  - **O que ele não vê:** as playlists do mestre; recebe só o que está tocando.

**Rolagens**

- **Quem rola:** o servidor rola, pela ficha que está no servidor.
  - A ficha é a que o Foundry mandou para a wiki ("Na mesa"); sem ela, a da criação.
  - Ninguém escolhe o próprio número.
- **Regras do RED:**
  - 10 natural rola mais 1d10 e soma, e 1 natural rola e subtrai, uma vez só (p. 130);
  - Gravemente Ferido tira 2 de tudo, e Mortalmente Ferido, 4;
  - dois 6 nos dados de dano avisam a lesão crítica (+5 direto no HP);
  - **Lesão crítica** rola 2d6 na tabela do corpo ou da cabeça.
- **NPC:** a ficha do livro já traz a base (STAT + perícia), e a rolagem usa a base.

## Como a mesa do Foundry funciona

Analisei o Foundry 14.369, o mesmo da mesa do servidor, em `%LOCALAPPDATA%\FieldbookTeste\foundry14-app`, com o REA (análise estática dos arquivos instalados, sem rodar o Foundry).

- **Evidências:**
  - o cliente, com 17 arquivos (socket, documentos, canvas, tokens, névoa, ping, chat, dados, combate): `ev_44c81248a312fcb5…`;
  - o servidor, com 6 arquivos: `ev_485bc8df9fb5168e…`.
- **Pastas e versão:** os caminhos abaixo são relativos à pasta do Foundry. O servidor (`dist/`) vem minificado, então cito o trecho em vez da linha.

| O que o Foundry faz | Onde está | O que a mesa da wiki faz |
|---|---|---|
| Toda mudança é um pedido `modifyDocument` pelo socket, com `{type, action, operation}`, que espera a resposta. | `client/data/client-backend.mjs:704-728`, `client/helpers/socket-interface.mjs:15-25` | `POST /api/mesa/op` com `{tipo, ...}`, que espera a resposta. |
| O servidor aplica. Erro vira `broadcast = false`. Quem pediu recebe a resposta, e os outros recebem o mesmo pacote. | `dist/database/backend/server-backend.mjs`: `s.result?.length&&s.broadcast&&e.broadcast.emit("modifyDocument",s)` | O mesmo fluxo: recusado não chega a ninguém. Mas cada um recebe **o que pode ver**, não o mesmo pacote. |
| Os outros clientes ouvem `modifyDocument` e `modifyDocumentBatch` e aplicam a mudança. | `client/data/client-backend.mjs:595-639` | Eventos `token`, `token.sumir`, `cena`, `nevoa`, `combate`, `registro`, por Server-Sent Events. |
| Arrastar um token vira um `update` com os pontos do caminho. O token anima ao receber. | `client/canvas/placeables/token.mjs:5102-5134` e `4003-4040`, `placeable-object.mjs:1482` | `token.mover` ao soltar. O token desliza na tela de todos. |
| Shift solta fora da grade. | `token.mjs:5142` (`snap: !event.shiftKey`) | Igual. |
| Cursor, régua, alvos e ping são "atividade": `userActivity`, volátil (descartada se a conexão engasgar), guardada só na memória do servidor e repassada. Quem chega pede `getUserActivity`. | `client/documents/user.mjs:207-226`, `dist/components/activity.mjs`, `client/canvas/board.mjs:1514-1520` | `POST /api/mesa/atividade`, nunca gravada, só para quem está na mesma cena. O teste confere que não vai para o arquivo. |
| Ping: Shift traz todos ("pull"); Alt é alerta. | `client/canvas/board.mjs:1868-1889` | Shift do mestre traz todos. Segurar o clique faz ping. |
| Névoa: exploração por usuário, com `shareFog`, `syncFog` e `resetFog`. | `client/canvas/perception/fog.mjs:329-330, 798, 886` | O mestre pinta a névoa (traços em ordem). O servidor usa os mesmos traços para decidir quais tokens cada jogador recebe. |
| Pausa só do mestre: o servidor confere `isGM`. | `client/game.mjs:1747`, `dist/components/activity.mjs` | Cada operação diz se é só do mestre, e o servidor confere de novo a cada pedido. |
| Grade: 2 m por quadrado (o sistema da mesa) e diagonal valendo 1 quadrado (padrão "equidistante"; o sistema não troca). | `client/game.mjs:1621-1640`, `system.json` do `cpr-fieldbook` e do CORE | Régua e movimento contam assim. |
| Socket só por websocket (socket.io). | `client/game.mjs:479` | Server-Sent Events e `fetch`, sem pacote novo, como o resto da wiki. |

**O que é observação, o que é inferência e o que fica de fora:**

- **Observado no código:**
  - o fluxo pedido → servidor → resposta a quem pediu → o mesmo pacote aos outros;
  - a atividade volátil e fora do banco;
  - os eventos de névoa e de pausa;
  - o padrão da diagonal.
- **Inferido:** que o jogador recebe os dados dos tokens escondidos e o navegador só não desenha. O servidor repassa o mesmo pacote a todos, e nos testes do Painel Tático o token escondido aparecia com `visible === true` no jogador até o primeiro redesenho. Não rodei o Foundry para capturar o tráfego.
- **Fora da análise:**
  - a checagem de permissão dentro do `modifyDocument` do servidor (`server-document.mjs`) não foi seguida passo a passo;
  - o código da visão, das paredes e da luz não foi analisado. A visão da mesa usa os números que o Foundry 12 grava em cada parede (`door`, `ds`, `sight`, `move`, conferidos nas 13 cenas do backup) e o comportamento que conheço do Foundry (a parede "limitada" só bloqueia a segunda): é inferência, não evidência do REA.
- **Nada foi copiado do Foundry:** a mesa da wiki é código novo, escrito para a wiki. A análise serviu para entender o desenho.

## O que é diferente de propósito

- **O servidor filtra para cada pessoa.**
  - O jogador nem recebe estas coisas: token escondido, token debaixo da névoa ou atrás da parede (o dele, sim), HP de NPC (só o estado de ferimento), nota do mestre, perícias e armas do NPC, a lista de cenas, as fichas de NPC, a porta secreta (para ele, é parede), o total do ataque antes de defender, o sussurro para outro e a rolagem "só para o mestre" de outro jogador.
  - É o mesmo princípio do Publicar.
  - Se o mestre esconde um token ou cobre a névoa, o jogador recebe `token.sumir`.
  - **A exceção, de propósito:** a luz de um token não escondido chega ao jogador mesmo com o token fora da vista dele. Uma lanterna no escuro se vê de longe, como no Foundry. O token em si não chega.
  - Se um jogador é desconectado pela wiki ou sai da campanha, a mesa dele fecha em até 20 segundos.
- **O servidor rola.** A conta usa a ficha do servidor.
- **As regras do RED e os dados da wiki:**
  - as perícias e a DV por alcance vêm do `system-rules.js`;
  - as fichas de NPC vêm do `mestre-npcs.js`, que só o servidor lê;
  - os personagens são os da campanha, com o retrato, o HP e a ficha do Foundry quando ela existe.
- **Sem pacote novo:** Server-Sent Events em vez de socket.io, como o resto da wiki (Node puro).

## A ficha de jogo e a ficha da wiki

- **Onde fica:** o que muda na mesa vai para a ficha do personagem (`doc.jogo`), pela mesma fila de gravação da wiki:
  - o HP, o SP com a ablação, a Sorte, as lesões, o Death Save;
  - a Humanidade, o dinheiro, o IP e a reputação, com o extrato do mestre;
  - o pente e a munição de cada arma, e o uso e a quantidade de cada item.
- **Quem mostra:** a mesa, a ficha da wiki (com "Na mesa da wiki" em cima) e a lista de Personagens mostram o mesmo número.
  - A mesa muda na hora para o dono e para o mestre.
  - A ficha da wiki aberta confere a cada 30 segundos.
- **A regra** fica num arquivo só, `personagem-jogo.js`, usado pelos três:
  - os máximos são os da ficha (a do Foundry, se ele já mandou; senão, a da criação);
  - o que vale é o mais recente entre a mesa da wiki e o Foundry.
  - **Atenção:** quando o Foundry manda a ficha depois, vale a dele inteira, e o que a mesa mudou antes deixa de valer.
- **O EMP de agora** é a Humanidade ÷ 10, para baixo (como o CORE do Foundry). O teste de EMP cai junto.
- **A penalidade da armadura pesada** sai dos STATs da ficha da criação, na mesa e na wiki. A ficha do Foundry já vem com os STATs dele.
- **Até a virada:** o Foundry continua mandando a ficha. Se mudar lá, a mesa pega em até 4 segundos. O que mudou na mesa não volta para o Foundry: ele vai ser desligado.
- **Máximo:** o HP máximo do personagem não muda pela mesa. Ele é o da ficha (BODY e WILL).

## O que esta versão ainda não tem

Está no [ROADMAP.md](ROADMAP.md), em ordem. O mais importante:

- **NET** (o NET Architect), os **veículos** e os **NPCs próprios** do mestre (Fase 2).
- **Cyberware:** a instalação, com a perda de Humanidade (M16), ainda passa pelo Foundry. O cyberware comprado na loja da campanha chega à ficha sem instalar, e na mesa o mestre ajusta a Humanidade à mão.
- **Artes Marciais:** os movimentos especiais esperam o agarrar e a conta de quem acertou o quê no turno. O golpe de artes marciais já ignora metade do SP.
- **Cobertura:** a mesa não conta o HP da cobertura. O que atravessa cobertura (a carga Tech, o ricochete) aparece como nota no cartão, e o mestre decide.
- **Luz em cone e modos de visão:** a luz em cone vira círculo, e não há visão no escuro do cyberware (o mestre aumenta o alcance no cartão).
- **Imagem do mapa:** o mapa inteiro vai para os jogadores, e a névoa e a sombra da visão só cobrem na tela, como no Foundry.

## Arquivos fora desta pasta (mudados para a ficha de jogo)

Não muda nada para quem não usa a mesa: sem `doc.jogo`, tudo funciona como antes. A suíte do projeto passa:
- `node tests/validar.js`: 181 verificações e as regressões;
- `node tests/rodar.js criador cyberware foundry contas`: 65/65, 16/16, 29/29 e 36/36.

- **`personagem-jogo.js` (novo):** a regra da ficha de jogo, compartilhada pela wiki, pela API e pela mesa:
  - o HP, o SP, a Sorte, a Humanidade (e o EMP), o dinheiro, o IP e a reputação;
  - o inventário com o uso e a quantidade, e a armadura vestida com a penalidade;
  - por arma: o pente, a munição carregada, a carga Tech, o ferrolho e a coronha. Gravar um deles não apaga os outros;
  - as contas da mesa: vestir ou guardar (`comUso`), recarregar com a munição da caixa (`recarga`) e o ajuste do mestre com o extrato (`ajuste`).
- **`api-personagens.js`:**
  - `jogo` entra nos campos do servidor (o jogador não grava, e salvar a ficha não apaga);
  - o HP, o IP e o dinheiro da lista saem do `personagem-jogo.js`;
  - o IP dado pela wiki soma no da mesa, quando ela já conta;
  - `updateCharacter` exportado, para a mesa gravar pela fila.
- **`criador.js`:** a ficha mostra o que a mesa da wiki mudou (`sheetModel`, com a linha "Na mesa da wiki" e as mudanças do mestre) e confere a cada 30 segundos, com ou sem Foundry.
- **`index.html`, `jogadores.html`, `server.js` (`playerFiles`), `sw.js` (o cache passou para `v14`):** carregam o `personagem-jogo.js`.

## Para pôr na wiki

O M4 do roadmap. Quando você aprovar o teste:

1. **`server.js`:**
   - criar a mesa com `require('./Tabletop/mesa-api')({ dataDir, charactersDir: path.join(charactersDataDir, 'personagens'), wikiDir: root, who: characterApi.who, campaigns: characterApi.campaigns, updateCharacter: characterApi.updateCharacter, send, writeJsonAtomic })`;
   - ligar a rota `ROUTES` antes da `characterApiRoutes`;
   - pôr `/mesa` → `mesa.html` e acrescentar `mesa.html`, `mesa.js`, `mesa-visao.js`, `mesa-tocador.js` e `mesa.css` em `playerFiles` (eles não têm segredo);
   - o YouTube: a página carrega `https://www.youtube.com/iframe_api` e o player de `youtube-nocookie.com`. Se a wiki ganhar uma Content-Security-Policy, ela precisa deixar esses dois (hoje não há nenhuma);
   - não carregar o `mesa-config.js`: ele só existe no teste;
   - entregar a página da mesa carregada na memória quando o servidor liga, e passar a `versao` (como o `testar.js`): página nova com servidor velho dá "Operação desconhecida".
2. **Barra lateral:** o quadro **Mesa** ganha **Mesa da wiki**, com quantos estão nela (`mesa.connected(campanha)`).
3. **`sw.js`:** já não guarda nada de `/api/mesa/`. O `/api/mesa/eventos` é uma conexão aberta e passa direto.
4. **`api-personagens.js`:** exportar `idFor` e `realId`. A mesa usa a mesma conta do id público, que hoje está repetida em `mesa-api.js`.
5. **Testes:** levar o `mesa.test.js` para `tests/isolados/` e ligar no `tests/validar.js`.
6. **Servidor:**
   - os dados ficam em `/srv/fieldbook/dados/mesa/` (215 MB só com as 13 cenas). Confira se o `backup.sh` leva essa pasta e se cabe no disco;
   - o Caddy repassa Server-Sent Events sem configuração nova;
   - as cenas entram com o `importar-foundry.js --dados /srv/foundry14/data/Data --mundo protocolo --mesa https://wiki.SEUDOMINIO --senha …`, rodado no servidor (ele usa o classic-level do Foundry de lá).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `mesa-api.js` | O servidor da mesa: operações, permissões, o filtro de cada pessoa, os eventos ao vivo, as rolagens, o chat, as paredes, a mídia (imagem, vídeo, SVG; com Range) e a ficha de jogo dos personagens (o HP, o ajuste do mestre, o uso dos itens, as fichas ao vivo). |
| `mesa-combate.js`, `mesa-regras.js` | O combate: o caminho (quem ataca, quem defende, o que vai para a ficha) e as regras puras do RED e do Mission Kit (DV, armadura, autofogo, cartucho, Death Save, Power, Smart, Tech). |
| `mesa-2077.js` | O perfil de 2077 de cada arma (do `system-2077.js`, como o build do Foundry) e o que a ficha diz dela e do cromo: o Rebuild, a munição carregada, a qualidade, a conexão Smart. |
| `mesa-audio.js` | O áudio no servidor: as playlists, o que toca em cada canal e desde quando, a fila, a música da cena, o título do YouTube e a importação das playlists. |
| `mesa-tocador.js` | O tocador no navegador: toca o arquivo num `<audio>` e o YouTube no player dele, acerta a posição pelo relógio do servidor e avisa quando o navegador segura o som. |
| `mesa-visao.js` | A conta da visão e da luz (quem vê o quê, a porta, o passo, o que a luz alcança, o polígono da sombra), com o índice das paredes. Vai para o servidor e para o navegador. |
| `mesa.html`, `mesa.js`, `mesa.css` | A página da mesa: canvas (mapa ou vídeo, tiles, grade, névoa, visão, portas, tokens), ferramentas, painel (Rolagens com o chat, Combate, Fichas/Personagem, Áudio, Cena) e celular. Vão para os jogadores: nada de segredo aqui. |
| `importar-foundry.js` | Traz as cenas, as playlists e a biblioteca do yt-jukebox de um mundo do Foundry (de um backup `.tar` ou da pasta Data) pela API da mesa. |
| `testar.js`, `testar-mesa.bat` | A wiki de verdade (o `server.js`, sem mudar nada nele) com a mesa junto e dados de teste. |
| `mesa.test.js`, `mesa-combate.test.js`, `mesa-2077.test.js`, `mesa-ficha.test.js`, `mesa-notas.test.js`, `mesa-visao.test.js`, `mesa-audio.test.js`, `importar-foundry.test.js`, `teste-ajuda.js` | 64 testes, com dados rolados de propósito e o título do YouTube sem ir à internet. |
| `ROADMAP.md` | O caminho até substituir o Foundry. |
