# NET Architect (módulo do Foundry VTT)

Pontos de acesso à NET em qualquer Tile da cena, para o Foundry VTT 12 (a API usada também existe no 13) e o sistema **Cyberpunk RED - CORE** (v0.92.4).

- **O netrunner conecta pelo token.** Ele clica no marcador **NET** do ponto de acesso, perto dele e com os requisitos.
- **A janela da NET** abre só para o dono do token e para o mestre. A cena continua à vista atrás dela. Ela mostra:
  - o HUD de Interface (rank, Ações NET por turno, Sorte, HP e a situação: fogo, Kraken, Skunk, Wisp);
  - o cyberdeck, com os programas e o REZ de cada um;
  - as habilidades de Interface, com a escolha do alvo;
  - o nó de controle tomado, com os comandos das portas, luzes, sons e tokens ligados a ele;
  - o mapa ramificado da arquitetura e o registro do netrun.
- **O token fica marcado** como "Conectado à NET" para todos: o ícone do status e um anel ciano pulsando.
- **O mestre resolve tudo** pelo socket: Black ICE, demônios, netrunners inimigos, combate e estado. Os jogadores só pedem.
- **O jogador rola os próprios dados.** Cada rolagem do netrunner abre, no computador dele, a janela de rolagem do sistema. Lá ele confere os modificadores, põe Sorte e confirma.
- **As arquiteturas são documentos reutilizáveis:** itens *NET Architecture* do próprio sistema, no compêndio do mundo **Arquiteturas da NET**, com um **editor visual** próprio.

## Instalar e ativar

- **No PC:** feche o Foundry e rode o `atualizar-modulo.bat` da wiki. Ele instala os dois módulos (cpr-2077 e NET Architect). Só este módulo: `node instalar.mjs`, nesta pasta.
- **No servidor:** é instalado sozinho, junto com o cpr-2077, quando a mesa estiver vazia depois de uma publicação.
- **Ativar:** no mundo, *Configurar módulos* → **NET Architect**.
  - Na primeira vez, o mestre ganha o compêndio **Arquiteturas da NET**, escondido dos jogadores, com três exemplos:
    - o armazém da TLB do livro;
    - o apartamento de um fixer;
    - uma clínica de ripperdoc com dois ramos.
- **Animações:** com os módulos **Sequencer** e **JB2A** ativos no mundo, usa as animações deles. Sem eles, desenha um efeito simples.

## Como usar

1. **Criar ou escolher a arquitetura** no **editor visual**. Ele abre pelo botão na configuração do ponto de acesso ou pelo botão "Editor visual" no topo da ficha do item.
   - Os andares ficam numa grade: linhas são andares, colunas são ramos.
   - Clique num **+** para criar um andar.
   - Arraste um andar para mover. Soltar em cima de outro troca os dois.
   - No painel ao lado, cada andar tem seus conteúdos: senha, arquivo e nó de controle (com DV), Black ICE (os 12 do livro), demônio (Imp, Efreet, Balron) ou netrunner inimigo (uma ficha do mundo com Role de netrunning).
   - O andar 1 sai do ponto de acesso. Um ramo novo (B, C…) sai do andar de cima do ramo à esquerda, como na cena que o sistema gera.
   - A ficha do sistema continua funcionando para os andares. Demônios e netrunners inimigos ficam só no editor (o item do sistema não tem esses conteúdos).
2. **Transformar um Tile em ponto de acesso.** Selecione o Tile e clique no botão de rede no HUD dele. Lá você escolhe:
   - nome e arquitetura (do compêndio, dos itens do mundo ou de outro compêndio);
   - alcance (padrão 6 m);
   - DV da arquitetura (vazio: o maior DV dos andares);
   - requisitos: cyberdeck equipado e Interface mínima;
   - se o marcador fica oculto (e o DV do Scanner para achá-lo);
   - se as defesas reiniciam quando ninguém estiver conectado;
   - **nós de controle ligados à cena:** para cada nó de controle da arquitetura, as portas, luzes, sons e tokens (torretas, câmeras, drones) que ele comanda. O botão de mira mostra o objeto no mapa.
3. **Jogadores:**
   - selecionam o próprio token, chegam perto e clicam no marcador **NET**;
   - fora da NET, o HUD do token tem o botão **Scanner** (Ação Carnal) para procurar pontos de acesso, inclusive os ocultos.
4. **Mestre:**
   - **Clique no marcador:** abre o painel do mestre. Com um token selecionado e o ponto vazio, ele oferece conectar esse token.
   - **Shift + clique:** abre a configuração.

## Rolagens do jogador

Com **O jogador rola as próprias rolagens** ligado (padrão), o mestre pede ao dono do netrunner que role e espera.

- **O que o jogador rola:**
  - as ações dele: habilidades, ataques de programa e o Scanner;
  - o que ele responde, mesmo quando foi o mestre quem disparou: a **defesa** contra o ataque de um Black ICE, demônio ou netrunner inimigo, e a **velocidade** contra o Black ICE no andar.
- **Antes de rolar,** o inimigo rola primeiro e o título da janela mostra quanto ele tirou. Um aviso diz o que o jogador precisa passar.
- **Na janela do sistema,** o jogador vê o rank, os bônus dos programas e efeitos, e os modificadores; põe Sorte (vem preenchida com a da janela da NET); e confirma. O dado e o cartão saem no nome dele.
- **Cancelar:**
  - numa ação, nada acontece (nem Ação NET, nem Sorte);
  - na defesa e na velocidade, rola assim mesmo, sem os ajustes.
- **Sem resposta** no tempo da configuração (padrão 2 minutos) ou com o jogador desconectado, a janela dele fecha e o mestre rola por ele. O registro da NET avisa.
- **As ações que o próprio mestre faz** pelo painel (com o jogador fora) continuam com o mestre.
- **As rolagens dos inimigos** são sempre do mestre.

## Regras implementadas (RED p. 197–212)

- **Ações NET por turno pela Interface:** 2, 3, 4 ou 5.
  - Em combate, a janela mostra as que sobram no turno e recusa a que passar do limite; elas voltam no turno do netrunner.
  - Fora de combate não há turno: as Ações NET não contam (a janela mostra "livres").
  - O mestre pode passar do limite.
- **Conectar e desconectar:** 1 Ação NET.
  - Andar pela arquitetura não gasta.
  - Ativar ou desativar um programa gasta 1, uma vez por rodada cada.
- **Habilidades** (Interface + 1d10, pela rolagem de Interface do próprio cyberdeck, com os bônus de programas e efeitos que o sistema calcula):

  | Habilidade | Teste | Resultado |
  |---|---|---|
  | **Pathfinder** | revela andares | Tantos quanto o resultado, a partir de onde o netrunner está. Uma obstrução com DV maior aparece, mas o que vem depois dela não. |
  | **Breach** (o Backdoor do RED) | contra o DV da senha | Sem ela, não se desce. Nos anos 2070 (Mission Kit), o Backdoor se chama Breach. |
  | **Eye-Dee** | contra o DV do arquivo | Copia o arquivo para um **diário** (pasta "Arquivos da NET") que o dono do netrunner abre pela janela; o chat avisa com o link. |
  | **Control** | contra o DV do nó | Depois, cada comando gasta 1 Ação NET: os botões das coisas ligadas na cena, ou um comando livre que o mestre narra. |
  | **Zap** | contra a defesa do alvo + 1d10 | 1d6 de REZ (Black ICE, demônio) ou no HP (netrunner inimigo). A defesa é a DEF do ICE, a Interface do demônio ou a rolagem de defesa do netrunner inimigo. |
  | **Slide** | contra PER do ICE + 1d10 | Libera a passagem. Só contra Black ICE (não contra demônios nem netrunners). Cada Skunk ativo que acertou dá −2. |
  | **Cloak** | o resultado vira o DV para achar os rastros | — |
  | **Virus** | só no andar mais fundo | O mestre define o DV na hora, numa janela. |
  | **Scanner** | fora da NET, pelo HUD do token | Acha os pontos de acesso até resultado × 10 m. Um ponto oculto só aparece se o resultado passar do DV do Scanner dele, e só para quem achou. |

- **Inimigos:**
  - **Black ICE:** ao chegar no andar, rola Interface + velocidade contra a SPD do ICE. Se o ICE vencer, o efeito vem na hora.
  - **Demônios:** sempre vencem a velocidade e passam por senhas. Defendem com Interface + 1d10, atacam com Zap (1d6 no cérebro) e não se driblam com Slide.
  - **Netrunners inimigos:** usam a ficha deles (rolagens de defesa e Zap do cyberdeck). O dano sai do HP, e em 0 eles caem da NET.
  - Black ICE e demônios seguram a descida até caírem (ou, o Black ICE, até um Slide).
- **Combate** (desliga em Configurações do módulo):
  - os inimigos encontrados entram na iniciativa com um token escondido no ponto de acesso, e o sistema põe Black ICE e demônios no topo;
  - na vez de cada um, o mestre recebe uma janela para escolher quem ele ataca;
  - em REZ 0, o combatente fica derrotado;
  - quando ninguém mais está na NET, os tokens dos inimigos saem da cena e do combate.
- **Efeitos do Black ICE na ficha** (desliga em Configurações do módulo):

  | Black ICE | Efeito |
  |---|---|
  | Asp | Destrói um programa aleatório. |
  | Giant | 3d6 no cérebro e desconexão insegura (os outros Black ICE ativos atacam). |
  | Hellhound | 2d6 no cérebro e fogo: 2 no HP no fim de cada turno até gastar uma Ação Carnal (botão **Apagar o fogo** na janela). Insulated Wiring no deck evita. |
  | Kraken | 3d6 no cérebro; até o fim do próximo turno, não avança nem desconecta com segurança. |
  | Liche e Scorpion | −1d6 em INT, REF e DEX (Liche) ou no MOVE (Scorpion), como efeito de 1 hora na ficha. |
  | Raven | Desativa um programa defensor e causa 1d6 no cérebro. |
  | Skunk | −2 em Slide enquanto estiver ativo. |
  | Wisp | 1d6 no cérebro e 1 Ação NET a menos no próximo turno (mínimo 2). |
  | Dragon, Killer, Sabertooth | Dano no REZ de um programa ativo; se cair, é destruído. |

  O dano no cérebro sai direto do HP, e o programa Armor ativo tira 4. Um programa destruído sai do deck e ganha "(destruído)" no nome; o mestre apaga se quiser.
- **Programas de ataque:** anti-programa contra Black ICE e demônios, anti-pessoal contra netrunners inimigos. A rolagem é Interface + ATK + 1d10, com o dano do próprio programa.
- **Sair do alcance com a conexão aberta** derruba da NET (desconexão insegura: o Black ICE ativo ataca de graça).
- **Sem ninguém conectado,** a arquitetura reinicia as defesas:
  - Black ICE e demônios voltam com o REZ cheio;
  - senhas e nós voltam a ficar trancados;
  - os tokens assumidos são devolvidos;
  - os arquivos copiados continuam.

Os números do Black ICE e dos demônios são os do livro-base, iguais aos da wiki (o teste confere).

## O que os jogadores sabem

- **No Tile ficam** só os andares revelados e os vizinhos de quem está conectado (como "?").
- **Fica no item da arquitetura,** que só o mestre lê: os DVs e conteúdos escondidos e as descrições dos arquivos e nós ainda não tomados.
- **O compêndio Arquiteturas da NET** nasce sem permissão para jogadores.

## Animação e som

- **Animação:** o feixe de energia do token até o ponto ao conectar, faíscas no alarme do Black ICE e um raio quando um inimigo acerta.
  - Com Sequencer e JB2A, o Sequencer mostra para todos.
  - Sem eles, cada cliente desenha um efeito simples.
- **Som:** bipes sintetizados na hora (sem arquivos de áudio), só para o dono do netrunner e o mestre. Tocam ao conectar, ao desconectar, num acerto, numa falha, no alarme do Black ICE e no dano.

## Configurações do módulo

- **Rolagens da NET no chat:** todos veem, ou só o mestre e o dono do netrunner.
- **O jogador rola as próprias rolagens:** ligado por padrão. Desligado, o mestre rola tudo.
- **Tempo para o jogador rolar:** de 10 a 300 segundos (padrão 120).
- **Efeitos do Black ICE na ficha:** ligado por padrão.
- **Inimigos da NET no combate:** ligado por padrão.
- **Animações da NET:** Sequencer e JB2A se tiver, só o efeito simples, ou desligadas.
- **Sons da NET** e **volume:** por jogador.
- **Abrir o painel do mestre quando alguém conectar:** por mestre.

## Macros

`game.modules.get('net-architect').api` tem:

- `configurar(tile)`, `janela(tile, { gm: true })` e `editor(item)`;
- `conectar(tile, token)`, `desconectar(token, { inseguro })` e `scanner(token)`;
- `estado(tile)` e `ponto(tile)`;
- `arquiteturas()`, `compendio()` e `lerArquitetura(item)`;
- `pedir(operação, dados)` (o mesmo pedido ao mestre que a janela faz).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `scripts/net-architect.mjs` | Entrada: configurações, ganchos do mapa, do combate e dos HUDs, API. |
| `scripts/estado.mjs` | O motor (só no mestre): conectar, andar, habilidades, inimigos, nós de controle, Scanner, gravar o estado. |
| `scripts/efeitos.mjs` | Efeitos do Black ICE na ficha (dano no cérebro, fogo, penalidades, programas destruídos). |
| `scripts/combate.mjs` | Inimigos na iniciativa, tokens escondidos e a vez de cada um. |
| `scripts/ligacoes.mjs` | Portas, luzes, sons e tokens comandados pelos nós de controle. |
| `scripts/arquivos.mjs` | Arquivos do Eye-Dee como diários. |
| `scripts/fx.mjs` | Animações (Sequencer e JB2A, ou simples) e sons sintetizados. |
| `scripts/editor.mjs` | O editor visual de arquitetura (ApplicationV2). |
| `scripts/socket.mjs` | Pedidos do jogador ao mestre ativo, um de cada vez, e as perguntas do mestre ao jogador (rolar). |
| `scripts/rolagens.mjs` | Rolagens e cartões de chat do próprio sistema, e a janela de rolagem no computador do jogador. |
| `scripts/arquitetura.mjs` | Lê o item da arquitetura (andares, ramos, defensores) e converte para o editor. Sem Foundry: os testes rodam no Node. |
| `scripts/janela.mjs` | A janela da NET (ApplicationV2). |
| `scripts/ponto-de-acesso.mjs` | Marcador no mapa, clique, botões nos HUDs e configuração. |
| `scripts/compendio.mjs` | O compêndio do mundo e os exemplos. |
| `scripts/token.mjs` | Os status "Conectado à NET" e "Em chamas" e o anel no token. |
| `instalar.mjs` | Copia o módulo para a pasta do Foundry. |

Os testes ficam em `tests/cenarios/netarquiteto.js`, na wiki. A parte com o Foundry de verdade (mestre e jogador em dois navegadores) só roda com a mesa do servidor vazia.
