# NET Architect (módulo do Foundry VTT)

Pontos de acesso à NET em qualquer Tile da cena, para o Foundry VTT 12 (a API usada também existe no 13) e o sistema **Cyberpunk RED - CORE** (v0.92.4).

- **O netrunner conecta pelo token.** Ele clica no marcador **NET** do ponto de acesso, perto dele e com os requisitos.
- **A janela da NET** abre só para o dono do token e para o mestre. A cena continua à vista atrás dela. Ela mostra:
  - o HUD de Interface (rank, Ações NET por turno, Sorte e HP);
  - o cyberdeck, com os programas e o REZ de cada um;
  - as habilidades de Interface;
  - o mapa ramificado da arquitetura e o registro do netrun.
- **O token fica marcado** como "Conectado à NET" para todos: o ícone do status e um anel ciano pulsando.
- **O mestre resolve tudo** (rolagens do sistema, Black ICE, estado) pelo socket. Os jogadores só pedem.
- **As arquiteturas são documentos reutilizáveis:** itens *NET Architecture* do próprio sistema, no compêndio do mundo **Arquiteturas da NET**.

## Instalar e ativar

- **No PC:** feche o Foundry e rode o `atualizar-modulo.bat` da wiki. Ele instala os dois módulos (cpr-2077 e NET Architect). Só este módulo: `node instalar.mjs`, nesta pasta.
- **No servidor:** é instalado sozinho, junto com o cpr-2077, quando a mesa estiver vazia depois de uma publicação.
- **Ativar:** no mundo, *Configurar módulos* → **NET Architect**.
  - Na primeira vez, o mestre ganha o compêndio **Arquiteturas da NET**, escondido dos jogadores, com três exemplos:
    - o armazém da TLB do livro;
    - o apartamento de um fixer;
    - uma clínica de ripperdoc com dois ramos.

## Como usar

1. **Criar ou escolher a arquitetura.**
   - Os andares, ramos, DVs e Black ICE se editam na ficha do item *NET Architecture* do sistema.
   - O andar 1 sai do ponto de acesso.
   - Um ramo novo (B, C…) sai do andar de cima do ramo anterior, como na cena que o sistema gera.
   - Dois conteúdos no mesmo andar e ramo (dois Black ICE, por exemplo) ficam no mesmo andar.
2. **Transformar um Tile em ponto de acesso.** Selecione o Tile e clique no botão de rede no HUD dele. Lá você escolhe:
   - nome e arquitetura (do compêndio, dos itens do mundo ou de outro compêndio);
   - alcance (padrão 6 m);
   - DV da arquitetura (vazio: o maior DV dos andares);
   - requisitos: cyberdeck equipado e Interface mínima;
   - se o marcador fica oculto dos jogadores;
   - se as defesas reiniciam quando ninguém estiver conectado.
3. **Jogadores:** selecionam o próprio token, chegam perto e clicam no marcador **NET**.
4. **Mestre:**
   - **Clique no marcador:** abre o painel do mestre. Com um token selecionado e o ponto vazio, ele oferece conectar esse token.
   - **Shift + clique:** abre a configuração.

## Regras implementadas (RED p. 197–207)

- **Ações NET por turno pela Interface:** 2, 3, 4 ou 5.
  - Elas contam em combate e voltam no turno do netrunner.
  - Fora de combate, só são contadas.
  - O mestre pode passar do limite.
- **Conectar e desconectar:** 1 Ação NET.
  - Andar pela arquitetura não gasta.
  - Ativar ou desativar um programa gasta 1, uma vez por rodada cada.
- **Habilidades** (Interface + 1d10, pela rolagem de Interface do próprio cyberdeck, com os bônus de programas e efeitos que o sistema calcula):

  | Habilidade | Teste | Resultado |
  |---|---|---|
  | **Pathfinder** | revela andares | Tantos quanto o resultado, a partir de onde o netrunner está. Uma obstrução com DV maior aparece, mas o que vem depois dela não. |
  | **Backdoor** | contra o DV da senha | Sem ela, não se desce. |
  | **Eye-Dee** | contra o DV do arquivo | Mostra a descrição do andar. |
  | **Control** | contra o DV do nó | Depois, **Comandar** gasta 1 Ação por comando. |
  | **Zap** | contra DEF do ICE + 1d10 | 1d6 de REZ. |
  | **Slide** | contra PER do ICE + 1d10 | Libera a passagem. |
  | **Cloak** | o resultado vira o DV para achar os rastros | — |
  | **Virus** | só no andar mais fundo | O mestre define o DV na hora, numa janela. |

- **Black ICE:**
  - Ao chegar no andar, rola Interface + velocidade contra a SPD do ICE. Se o ICE vencer, o efeito vem na hora.
  - No turno dele, o mestre clica em **ataca** (ATK + 1d10 contra a defesa de Interface).
  - Dano no cérebro sai do HP (o programa Armor ativo tira 4). Dá para desligar nas configurações.
  - Os anti-programa batem no REZ de um programa ativo.
  - Os outros efeitos vão para o registro, para o mestre aplicar.
- **Programas de ataque anti-programa** atacam o Black ICE com Interface + ATK + 1d10 e o dano do programa contra Black ICE.
- **Sair do alcance com a conexão aberta** derruba da NET (desconexão insegura: o Black ICE ativo ataca de graça).
- **Sem ninguém conectado,** a arquitetura reinicia as defesas: Black ICE com o REZ cheio, senhas e nós trancados. Os arquivos já identificados continuam.

Os números do Black ICE são os do livro-base, iguais aos da wiki (o teste confere).

## O que os jogadores sabem

- **No Tile ficam** só os andares revelados e os vizinhos de quem está conectado (como "?").
- **Fica no item da arquitetura,** que só o mestre lê: os DVs e conteúdos escondidos e as descrições dos arquivos e nós ainda não tomados.
- **O compêndio Arquiteturas da NET** nasce sem permissão para jogadores.

## Configurações do módulo

- **Rolagens da NET no chat:** todos veem, ou só o mestre e o dono do netrunner.
- **Dano do Black ICE direto no HP:** ligado por padrão.
- **Abrir o painel do mestre quando alguém conectar:** por mestre.

## Macros

`game.modules.get('net-architect').api` tem:

- `configurar(tile)` e `janela(tile, { gm: true })`;
- `conectar(tile, token)` e `desconectar(token, { inseguro })`;
- `estado(tile)` e `ponto(tile)`;
- `arquiteturas()`, `compendio()` e `lerArquitetura(item)`.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `scripts/net-architect.mjs` | Entrada: configurações, ganchos do mapa e do combate, API. |
| `scripts/estado.mjs` | O motor (só no mestre): conectar, andar, habilidades, Black ICE, gravar o estado. |
| `scripts/socket.mjs` | Pedidos do jogador ao mestre ativo, um de cada vez. |
| `scripts/rolagens.mjs` | Rolagens e cartões de chat do próprio sistema. |
| `scripts/arquitetura.mjs` | Lê o item da arquitetura (andares, ramos, pais e filhos) e o Pathfinder. Sem Foundry: os testes rodam no Node. |
| `scripts/janela.mjs` | A janela da NET (ApplicationV2). |
| `scripts/ponto-de-acesso.mjs` | Marcador no mapa, clique, botão no HUD do Tile e configuração. |
| `scripts/compendio.mjs` | O compêndio do mundo e os exemplos. |
| `scripts/token.mjs` | O status "Conectado à NET" e o anel no token. |
| `instalar.mjs` | Copia o módulo para a pasta do Foundry. |

Os testes ficam em `tests/cenarios/netarquiteto.js`, na wiki. A parte com o Foundry de verdade (mestre e jogador em dois navegadores) só roda com a mesa do servidor vazia.
