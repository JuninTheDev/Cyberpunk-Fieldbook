# Painel Tático (módulo do Foundry VTT)

Um HUD de combate para o Foundry VTT 12 (a API usada também existe no 13) e o sistema **Cyberpunk RED - CORE** (v0.92.4). Faz o mesmo que o *Cyberpunk RED - Combat HUD*, com três diferenças:
- **o retrato grande do personagem**, um PNG para cada estado de ferimento;
- **o visual que cada jogador escolhe**;
- **a ligação com os outros módulos da mesa:** cpr-2077, Fluxo de Combate e NET Architect.

## O que tem na barra

- **Retrato.**
  - Um PNG com fundo transparente, em pé sobre a barra e saindo por cima dela.
  - Pode haver uma imagem para cada estado: Sem ferimentos, Levemente Ferido, Gravemente Ferido, Mortalmente Ferido e Morto.
  - **Estado sem imagem própria:** usa a do estado mais leve, com um efeito automático:
    - tinta vermelha;
    - falha de sinal;
    - pulso no Mortalmente Ferido;
    - cinza com FLATLINE no Morto.
  - **Morto** é o status de derrotado. O Fluxo de Combate põe esse status quando o Death Save falha.
  - **Sem nenhum PNG configurado:** a imagem da ficha aparece num quadro dentro da barra.
- **Topo da barra:**
  - nome, apelido, Role e rank;
  - o estado de ferimento;
  - os selos: *Seu turno*, *Suprimido* (do Fluxo de Combate) e *NET* (do NET Architect);
  - as ferramentas: fixar o personagem, retrato, estilo e recolher.
- **Vitais.**
  - **HP:** botões configuráveis (−5 −1 +1 +5) e o número editável. A roda do mouse soma ±1 (com Shift, ±5). Uma marca na barra mostra onde começa o Gravemente Ferido.
  - **Armadura da cabeça e do corpo:** − gasta (ablação) e + conserta.
  - **Escudo, Humanidade e Sorte.** A Humanidade baixa fica vermelha.
  - **Death Save:** clique rola; botão direito zera a penalidade.
- **Atributos:** os dez, e um clique rola.
- **Armas equipadas:**
  - dano, ROF e pente (vermelho quando vazio);
  - os modos do sistema: mirado (com o local), autofogo e supressivo;
  - **com o cpr-2077:**
    - a classe da arma (Power, Tech, Smart);
    - o modo Ricochete das armas Power;
    - os botões de estado: Carregar (Tech), Manejar o ferrolho (Grad) e a coronha (Dian);
    - os avisos: sem conexão Smart, munição errada;
    - a coronha retrátil;
  - recarregar e trocar a munição;
  - **ATK** e **DMG**.
- **Ações:**
  - Iniciativa (mostra o valor);
  - Fim do turno (só no seu turno);
  - Facedown;
  - os painéis Perícias, Role e NET. As perícias têm busca, e a ★ põe a perícia na barra das favoritas.
- **Equipamento:** o painel da chave inglesa troca entre guardado, carregado e equipado (armas, armaduras e cyberdecks).

Toda rolagem segue o caminho da ficha do sistema: a janela de rolagem, a munição, a Sorte e o cartão no chat. **Ctrl** no clique pula a janela.

## Ligação com os outros módulos

- **Fluxo de Combate:**
  - O ATK do painel sai pelo cartão do sistema, então o Fluxo pede a defesa do alvo como faria pela ficha.
  - O painel mostra o alvo marcado e um ícone de corrente: verde quando o Fluxo vai resolver, amarelo quando falta alvo ou mestre.
  - **Sem alvo marcado,** o cursor vira mira ao clicar em ATK:
    - clique no token: escolhe o alvo;
    - clique no chão: ataca sem alvo;
    - Esc: cancela.
  - O fogo supressivo não pede alvo (ele pega a área).
- **cpr-2077:**
  - Os botões de modo de 2077 gravam a mesma marca que a ficha grava.
  - A rolagem passa pelo `createRoll` que o cpr-2077 troca. A carga Tech, os dois canos da Palica e o +1 da arma Smart funcionam igual à ficha.
- **NET Architect:**
  - **Conectado:** aparece o selo NET (com as Ações NET do turno, em combate). Ele abre a janela da NET, e o painel NET tem o botão Desconectar.
  - **Fora da NET:** o painel NET tem o Scanner (procura pontos de acesso) e as rolagens livres de Interface.
- **Combat HUD:** se ele também estiver ligado, cada navegador o esconde enquanto o Painel Tático estiver à mostra (Configurações → Painel Tático). O mestre recebe um aviso uma vez.

## Retrato de cada estado

O dono do personagem configura de duas formas: pelo botão de retrato do painel, ou com o botão direito no retrato. A janela mostra:
- os cinco estados, cada um com o campo do caminho ou endereço da imagem e o botão de escolher o arquivo;
- uma prévia com a barra embaixo, onde dá para ver cada estado;
- **Modo:**
  - automático;
  - PNG livre (sai da barra);
  - moldura (dentro da barra);
- **Ajustes:** tamanho, deslocamento para os lados e para cima, e espelhar.

O retrato fica no ator: todos que veem o painel daquele personagem veem o mesmo retrato.

**Para os jogadores escolherem o arquivo,** o mestre precisa liberar em *Configurar permissões* → "Usar o navegador de arquivos" e "Enviar arquivos". Sem essa permissão, o jogador cola o endereço da imagem: um link de um site ou um caminho que o mestre já subiu (por exemplo, `retratos/vex-ok.png`).

Dica: imagens de corpo inteiro ou da cintura para cima, com umas 600 px de altura, ficam leves e nítidas.

## Estilo de cada jogador

O botão de paleta abre o estilo. Também abre em *Configurações* → *Painel Tático* → *Abrir o estilo*. O estilo vale para este navegador.
- **Tema:** Morana, Arasaka, Militech, Netrunner, Kang Tao, Nômade, Clássico (as cores do Combat HUD) ou Monocromático. Também dá para escolher cores à mão.
- **Aparência:**
  - fonte: Tektur, Jost, Rubik, Bruno Ace, Modesto Condensed ou Signika (só as que já vêm no Foundry e no sistema);
  - cantos: chanfrados, retos ou arredondados;
  - opacidade e desfoque do fundo;
  - brilho neon, linhas de varredura, animações e modo compacto.
- **Retrato:**
  - a altura;
  - o lado (esquerda ou direita);
  - os efeitos de ferimento: sempre, nunca ou só nos estados sem imagem própria.
- **Tamanho e posição:**
  - o tamanho do painel;
  - a posição: na base da tela, ou onde o jogador arrastar pela alça (dois cliques na alça voltam para a base);
  - na base, a distância até a borda de baixo. O painel fica centrado entre a barra de ferramentas e a lateral; sem espaço, as seções quebram linha.
- **Seções e peças:**
  - a ordem de Vitais, Atributos, Armas e Ações, e qual delas aparece;
  - esconder armadura, escudo, Humanidade, Sorte, Death Save, nome, favoritas, alvo ou as imagens das armas;
  - os números dos botões de HP.
- **Compartilhar:** *Copiar código* gera um texto `PT1:…` com o visual (sem a posição). Outro jogador cola em *Aplicar o código colado*.
- **Mestre:** *Usar como padrão da mesa*. Quem não mudou o próprio estilo passa a ver o do mestre, e *Voltar ao padrão da mesa* desfaz o estilo de um jogador.

## Configurações (por navegador)

- **Mostrar o Painel Tático:** a tecla **H** recolhe e abre. A tecla muda em *Configurar controles*.
- **Sem token selecionado, mostrar o meu personagem.** É o personagem que o mestre deu ao usuário.
- **Escolher o alvo antes do ataque:** quando não houver alvo, sempre ou nunca.
- **Esconder o Combat HUD.**

O painel mostra o token controlado de quem é dono. Sem nenhum, mostra o personagem do jogador. O alfinete fixa um personagem até soltar.

## Instalar

- **No PC:** feche o Foundry e rode o `atualizar-modulo.bat` da wiki. Só este módulo: `node instalar.mjs`, nesta pasta.
- **No servidor:** é instalado sozinho quando a mesa está vazia depois de uma publicação.
- **Ativar:** *Configurar módulos* → **Painel Tático**.

## Para macros e outros módulos

`game.modules.get('painel-tatico').api`:
- `painel`: o painel; `atualizar()`: desenha de novo.
- `fixar(actorOuToken)`: fixa um personagem; `fixar(null)` solta.
- `estilo.atual()`, `estilo.salvar(estilo)`, `estilo.abrir()`, `estilo.codigo()` e `estilo.aplicarCodigo('PT1:…')`.
- `retrato.abrir(actor)`, `retrato.ler(actor)` e `retrato.vista(actor)`.
- `retrato.definir(actor, { imagens: { notWounded, lightlyWounded, seriouslyWounded, mortallyWounded, dead }, escala, x, y, espelhar, modo })`.

O hook `painelTaticoDesenhado(painel, elemento)` roda a cada desenho, para quem quiser acrescentar coisas na barra.

## Arquivos

- `scripts/painel-tatico.mjs`: configurações, tecla H, ganchos e API.
- `scripts/painel.mjs`: a barra e os painéis.
- `scripts/acoes.mjs`: as rolagens e os recursos, pelo caminho da ficha.
- `scripts/retrato.mjs`: o retrato e a janela dele.
- `scripts/estilo.mjs`: o estilo e a janela dele.
- `scripts/integracoes.mjs`: cpr-2077, Fluxo de Combate e NET Architect.
- `scripts/alvo.mjs`: a mira.
- `scripts/logica.mjs`: as contas sem Foundry (o teste roda no Node).

O teste é `tests/cenarios/painel.js`, na raiz da wiki.
