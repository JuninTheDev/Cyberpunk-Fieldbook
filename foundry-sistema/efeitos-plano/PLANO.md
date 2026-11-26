# Os efeitos na mesa: o plano (tiro, granadas, briga, som)

**O pedido do usuário (2026-11-26):** "Quero adicionar efeitos mais bonitos para o RPG, por exemplo, quando o
personagem atirar fazer um efeito de tiro com som, granadas com efeito, brigas e etc. Monte uma equipe especializada
nesse tipo de coisa e me entregue um planejamento completo e bem minucioso."

**A base:** o `origin/master` 725911b6 (ciclo 214; o último item do ROADMAP é o C76) e o Foundry 14.369 instalado em
`%LOCALAPPDATA%\FieldbookTeste\foundry14-app`. Os caminhos de código são relativos a `foundry-sistema/scripts/`, menos
quando o texto diz outra coisa. Nada foi implementado: isto é o plano.

**Os anexos** (o detalhe de cada especialista, com `arquivo:linha`, tabelas e fontes):
- [equipe/fx-visual.md](equipe/fx-visual.md): o desenho de cada efeito no canvas;
- [equipe/fx-audio.md](equipe/fx-audio.md): o banco de sons, a mixagem e quem ouve;
- [equipe/fx-coreografia.md](equipe/fx-coreografia.md): os ganchos no combate, o motor, os testes e os itens;
- [equipe/fx-assets.md](equipe/fx-assets.md): as bibliotecas, as licenças, o peso e o servidor.

---

## 1. Em resumo

- **O que a mesa ganha:**
  - o tiro com clarão no cano, o traçante até o alvo e o estampido de cada classe de arma;
  - o impacto que conta o que aconteceu: carne, armadura que segurou, escudo, cobertura, crítico, morte;
  - a rajada, o automático e o supressivo com cadência; a espingarda em cone; as armas de 2077 (o ricochete Power, o
    feixe Tech que atravessa a cobertura, a bala Smart que curva);
  - a granada que voa em arco e explode por tipo (fragmentação, incendiária, fumaça, flashbang, EMP, gás, teia), com a
    fumaça e o fogo ficando no mapa pelo tempo da regra;
  - a briga: o soco, o chute, a lâmina, o Monowire, a Mantis, o Gorilla Arms, o agarrão e o arremessar;
  - o Death Save com o eletrocardiograma, o flatline, a NET (o feixe, o Black ICE), o Sandevistan, o Kerenzikov, o
    Berserk, a recarga, o pente vazio e os veículos.
- **A decisão de arquitetura (a equipe concordou):** o próprio sistema desenha e toca tudo, **sem depender de módulo**.
  - O Foundry 14 já traz o que é preciso: o PIXI 7.4.3 com o `ParticleGenerator`, o `CanvasShakeEffect` (o tremor, que
    se desliga sozinho no modo fotossensível), o `TextureTransitionFilter` (o glitch que o token dinâmico já usa), a luz
    temporária e o áudio com volume por jogador.
  - O Sequencer e o JB2A ficam como **camada opcional**, que troca a textura quando estão ativos. Nada some se eles
    sumirem.
  - Os motivos: o Foundry 14 de teste e o servidor não têm os módulos; o JB2A grátis pesa 1,8 GB e só umas 30 das 2.130
    animações servem para cyberpunk; o `.webm` com transparência aparece **com fundo preto no iPhone e no iPad** (o
    Safari não toca o alfa do WebM).
- **O custo:** 21 itens, do C77 ao C97, uns **22 ciclos** no total. A fase 1 (C77 a C82) já põe o tiro, o impacto e o
  som na mesa, em uns 7 ciclos.
- **A curadoria dos sons é de ouvido:** escolher se "esse tiro soa como uma Malorian" é do mestre. São 6 a 10 horas de
  audição no total, 1 a 2 horas por fase.
- **O peso:** no git, o núcleo da fase 1 fica em cerca de **1,5 MB**; o jogador baixa uns 0,3 MB pré-carregados na
  primeira sessão e o resto no primeiro uso. O banco completo de sons fica em uns 5 MB e as folhas de sprite próprias
  em até 4 MB (seção 7, o teto).
- **As oito decisões da fase 1 foram aceitas em 2026-11-26** (seção 9.1). As outras esperam a fase delas.

---

## 2. A equipe

Quatro especialistas novos em `.claude/agents/`, ao lado da equipe de RPG digital (`rpg-mecanicas`, `rpg-jogabilidade`,
`rpg-mestre`). Eles só aconselham e desenham; não mexem em arquivo sem um pedido explícito.

| Agente | A especialidade | Chame para |
| --- | --- | --- |
| `fx-visual` | O canvas: clarão, traçante, faísca, sangue, explosão, fumaça, glitch, tremor; o PIXI do core, o Sequencer e o JB2A; o desempenho e a acessibilidade | Desenhar ou revisar um efeito visual e o peso dele |
| `fx-audio` | O som: o banco por classe de arma, as camadas, a mixagem, o posicional do Foundry 14, quem ouve, o formato e a licença | Escolher sons, ajustar volume e cadência, decidir quem ouve |
| `fx-coreografia` | O momento de cada efeito no combate, o motor, o socket, a segurança e os testes G3 e G4 | Ligar um efeito novo ao fluxo do combate, dividir o trabalho em itens |
| `fx-assets` | As bibliotecas, as licenças num repositório público, os formatos, o tamanho, o servidor de 1 GB e o backup | Escolher um pacote, conferir uma licença, o orçamento de peso |

Para quem pega um item: o `fx-coreografia` diz onde ligar; o `fx-visual` e o `fx-audio`, o que aparece e o que soa; o
`fx-assets`, de onde vem o arquivo. Uma regra de jogo nova (o desvio da granada, o silenciador) vai para o
`rpg-mecanicas` e para o mestre.

---

## 3. O que existe hoje e o que a equipe achou

**O que existe:** só o texto que sobe em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A ativos, uma
animação de acerto ou de erro, mais o som do Diwako. Tudo sai do `mostrarNaMesa` (`combate/cartao.mjs:78-89`), chamado
logo depois do cartão do resultado (`combate/cartao.mjs:57`). A configuração "Efeitos na mesa" (`configuracoes.mjs:71-74`)
escolhe texto e animação, só o texto, ou nada. O agarrão, as Artes Marciais, a NET, o Neuroport, o Death Save, a recarga,
os perigos e o cyberware não têm efeito nenhum. Os efeitos e os sons sintetizados do NET Architect do Foundry 12
(`foundry-net-architect/scripts/fx.mjs`) não vieram para o sistema.

**O que a equipe achou no código de hoje** (vai para a fase 0, o C77):

| # | O achado | Onde | Quem achou |
| --- | --- | --- | --- |
| 1 | **Segurança:** o tipo `'texto'` do socket é aceito de qualquer cliente, sem conferir o remetente. Um jogador, pelo console, faz aparecer qualquer texto no token de qualquer um. O C56 conferiu os outros tipos, e este ficou de fora. | `combate/socket.mjs:122-123` | fx-coreografia |
| 2 | **Vazamento:** o texto do resultado vai a todos os sockets, mesmo com "Quem vê o cartão: só o mestre"; o filtro só acontece em quem recebe, e o jogador vê o "−12 HP" no console (a lição do ciclo 209). | `combate/cartao.mjs:86` | fx-coreografia |
| 3 | **Vazamento:** o texto flutuante só confere o token escondido, e o `createScrollingText` desenha por cima da névoa: um "−12 HP" em cima de um token no escuro mostra ao jogador onde ele está. O C76 já resolveu o mesmo problema no ponto de acesso. | `efeitos.mjs:34`; `client/canvas/groups/interface.mjs:174`; `netrun/ponto-de-acesso.mjs:73` | fx-visual |
| 4 | A animação do Sequencer sai para todos e não respeita o "Quem vê o cartão". | `combate/cartao.mjs:87` | fx-visual |
| 5 | "Efeitos na mesa" vale para o mundo inteiro: quem é fotossensível não tem como desligar só para si. | `configuracoes.mjs:71-74` | fx-visual |
| 6 | O `foundry.canvas.srcExists` está obsoleto no 14 e sai no 16; o certo é o `foundry.utils.srcExists`. | `efeitos.mjs:22` | fx-assets |
| 7 | O Diwako só roda até o Foundry 12: o ramo dele no `efeitos.mjs` nunca toca no 14. Hoje **não há som nenhum** no Foundry 14. | `efeitos.mjs:53-58` | fx-assets |
| 8 | O `instalar.mjs` copia uma lista fixa de pastas: uma pasta nova (`efeitos/`) precisa entrar nela, ou não chega ao servidor, e o erro só aparece lá. | `instalar.mjs:48` | fx-assets, fx-audio |

**Duas armadilhas da API do Foundry 14** que mudam o desenho do som (conferidas no código pelo fx-audio):
- o `playAtPosition` toca no volume máximo para quem está na posição do som, e com o `gmAlways` o mestre e o próprio
  atirador ouvem tudo no máximo (`client/canvas/layers/sounds.mjs:268-274`). Por isso o sistema calcula o posicional ele
  mesmo;
- o som pedido antes do primeiro clique na página fica numa fila e toca tudo de uma vez depois
  (`client/audio/sound.mjs:338-341`). O sistema descarta o efeito enquanto o áudio está travado (`game.audio.locked`).

**O VFX do próprio Foundry 14** (`foundry.canvas.vfx`): ele faz quase tudo isto (ataque, projétil em arco, impacto, som
posicional, tremor), mas o core o marca como experimental e o deixa desligado (`client/config.mjs:1357-1366`). A equipe
recomenda não depender dele agora e desenhar o roteiro no mesmo formato, para migrar quando estabilizar (o C97).

---

## 4. A arquitetura

### 4.1 As peças

| Peça | O que faz | Onde roda | Testado |
| --- | --- | --- | --- |
| `regras-coreografia.mjs` (nova, pura, sem Foundry) | Lê o resultado já resolvido do combate (as `linhas` do cartão: o modo, a classe da arma, a munição, o desfecho e o dano de cada alvo) e devolve um **roteiro**: a lista ordenada dos passos, com o tempo, a posição, a semente e o gancho de som de cada um. Também valida o roteiro, aplica o teto e escolhe o perfil da arma. | qualquer lugar | G3 |
| `catalogo-efeitos.mjs` (novo, puro) | O catálogo lógico: `tiro.pistola-media`, `impacto.carne`, `explosao.frag`, `glitch.quickhack`... Cada chave aponta para uma lista de candidatos, e **o último é sempre `proprio:`** (o desenho do sistema). O JB2A, um pacote pago ou a pasta do servidor entram antes dele. | qualquer lugar | G3 (o `proprio:` obrigatório; o `srcPermitido`) |
| `coreografia.mjs` (novo, o diretor) | Recebe o roteiro, decide quem vê e quando (a cena, a visão, o "Quem vê o cartão", a configuração de cada aparelho), põe na fila deste cliente e chama os tocadores. Nunca segura o combate: uma falha vira um contador, sem erro no console. | cada cliente | G4 |
| `tocador-pixi.mjs` (novo) | As peças visuais P1 a P16 (seção 5.1), desenhadas no `canvas.primary`, que fica sob a névoa. Só o texto vai para a interface, e com o teste de visão. Um contêiner por roteiro, destruído no fim e no `canvasTearDown`. | cada cliente | G4 |
| `sons.mjs` + `regras-sons.mjs` (novos) | O barramento "Efeitos de combate" (um volume próprio e um limitador, pelo `Sound#destination`), as vozes, o pitch e a variação aleatórios, o posicional calculado pelo sistema, a pré-carga. A regra pura escolhe a variação, a camada e o volume. | cada cliente | G3 e G4 |
| `tocador-sequencer.mjs` (novo, opcional) | Traduz o roteiro para um `Sequence` local (`.locally()`, nunca o envio do próprio Sequencer), só com o módulo ativo e fora do WebKit. | cada cliente | G3 (com um `Sequence` falso); o G4 não cobre, como hoje |
| `efeitos.mjs` (existe) | Vira a ponte do que existe: o `textoFlutuante` passa a ser o passo `texto` do tocador PIXI. | | |

### 4.2 Os dois momentos de um ataque

- **O momento A, o disparo:** no clique, antes da janela de defesa. O clarão e o estampido na origem, e a mira (a linha
  tracejada e o retículo no alvo). Não conta o resultado. Só existe se a sua resposta à decisão 2 for "sim" (o C82).
- **O momento B, o desfecho:** quando o cartão do resultado sai (depois da defesa, como hoje). O traçante, o impacto, o
  texto, o glitch, o tremor, a troca da imagem do token dinâmico.

**Um tiro de pistola que acerta, passo a passo** (a regra do tempo do fx-visual: o tiro de um alvo cabe em 600 ms, a
rajada em 1,2 s, a explosão em 1,5 s mais a fumaça que fica):

| Tempo | O que aparece | O que soa |
| --- | --- | --- |
| clique (momento A) | o clarão no cano (50 ms), a luz de 2 m por 0,1 s, a mira no alvo | o corpo do estampido da pistola média (uma de 5 variações, pitch ±4%) |
| defesa | a janela de reação do alvo, como hoje | |
| cartão (momento B), 0 ms | o traçante do cano ao alvo (80 ms) | |
| 80 ms | o impacto: as gotas (sangue estilizado) saindo do lado oposto ao tiro | o impacto em carne |
| 130 ms | o texto "−12 HP" sobe | |
| 200 ms | o glitch e o tremor, se for crítico | a cauda do tiro (o eco da rua) |
| até 1 s | o token dinâmico troca para "ferido" | |

Sem o momento A, o clarão e o estampido vão para o começo do momento B.

### 4.3 Por onde o efeito chega aos outros clientes

| Caminho | Para quê | Por que assim |
| --- | --- | --- |
| **1. O cartão é o evento** | O desfecho (o momento B) | O cartão já leva uma flag `efeito` com o roteiro (`combate/cartao.mjs:56`). Cada cliente toca quando o cartão chega até ele. Vale só para quem vê o cartão, sem socket, sem duplicar e sem confiar em ninguém. |
| **2. O socket, só do mestre ativo** | O disparo (o momento A) e a granada que o mestre marca onde caiu | Um tipo `efeito` novo, aceito só do mestre ativo, com `recipients`. Para todos que veem o atirador (um tiro se ouve). |
| **3. A carona no documento** | O que o próprio dono faz: recarregar, usar um equipamento, carregar a arma Tech | Uma opção a mais no `update` do documento; o fx-coreografia conferiu no código do Foundry que ela chega aos outros clientes (`client/data/client-backend.mjs:310-319`). |
| **4. Um documento que dura** | A fumaça, o fogo, a teia, o anel do agarrão | Uma Região ou uma flag, com o fim no relógio do mundo. Cada cliente desenha a partir do documento (como o anel da NET em `netrun/token.mjs:22-56`), e o desenho sobrevive ao recarregar. |

**Segredo de verdade:** a flag `efeito` do cartão sussurrado chega ao cliente do jogador, como o resto do cartão (a
lição do ciclo 209). O efeito não toca para ele, mas os dados estão lá. Para segredo, o mestre usa "Só o mestre" e o
caminho 2 com `recipients`. Isso vai no README.

### 4.4 As configurações

| Chave | De quem | As opções | O padrão |
| --- | --- | --- | --- |
| `animacoes` (existe, "Efeitos na mesa") | do mundo | ganha o "Reduzido"; passa a ser o **teto** do mundo | texto e animação |
| `efeitosPalco` (nova) | do mundo | o desenho do sistema; o do Sequencer quando houver o arquivo | o do sistema |
| `efeitosSangue` (nova) | do mundo | realista, estilizado, nenhum | estilizado |
| `efeitosMarcas` (nova) | do mundo | somem, ficam | somem |
| `efeitosIntensidade` (nova) | de cada aparelho | automático, completo, reduzido, só o texto | automático: reduzido no celular, no WebKit, no PC lento e **sempre** com o modo fotossensível do core |
| `efeitosSangueAqui` (nova) | de cada aparelho | o da mesa, estilizado, nenhum (só reduz, nunca aumenta) | o da mesa |
| `efeitosVolume` (nova) | de cada aparelho | 0 a 1, o barramento "Efeitos de combate" | 0,7 |
| `efeitosIntensos` (nova) | de cada aparelho | com ou sem os sons e os clarões intensos (o zumbido do flashbang, o Sandevistan) | com |

**O reduzido:** sem tremor, sem clarão de tela (troca por uma borda que acende devagar), sem luz temporária, metade das
partículas, nada piscando mais de 3 vezes por segundo (o limite da WCAG 2.3.1), textos maiores. O "só o texto" custa o
mesmo que hoje.

### 4.5 A personalização (o mestre troca o efeito de uma arma)

O perfil de uma arma sai, nesta ordem (vale o primeiro que existir):
1. a flag do item (o mestre escolheu; guarda só a **chave** de um perfil, nunca um caminho de arquivo);
2. o mapa por item do catálogo, uma configuração do mundo que sobrevive à reimportação da wiki (já liga as duas
   Malorian a um perfil próprio);
3. a classe de 2077 (Power, Tech, Smart) mais o tipo;
4. o tipo do RED (`system.tipo`: `medPistol`, `shotgun`, `assaultRifle`...);
5. o padrão pela perícia.

O mestre cria os perfis numa janela "Efeitos da mesa" (com o "Testar"), e o jogador escolhe numa lista que o mestre
aprovou (combina com o C69, a identidade da arma). O mesmo vale por munição e por tipo de granada. O som do Cyberpunk 2077
(o jogo) nunca entra.

### 4.6 O orçamento de cada evento

Para a rajada de 10 e o supressivo em 8 alvos não travarem um celular:
- no máximo **6 traçantes vivos**, **4 vídeos** (só com o JB2A), **1 luz temporária** e **300 partículas no PC** (120 no
  celular ou no reduzido);
- no máximo **3 nuvens** de fumaça persistentes na cena;
- **16 vozes** de som ao mesmo tempo (10 no celular); a rajada de 10 tiros são 10 corpos curtos e **uma cauda só**; o
  supressivo baixa 5 dB por tiro e varre a área no pan;
- **3,5 s** no máximo por ataque, para o supressivo numa cena cheia não atrasar a mesa;
- a pré-carga: os 12 sons principais e as texturas do núcleo no `ready` (~0,3 MB); as folhas da cena no `canvasReady`;
  o resto no primeiro uso.

---

## 5. O que a mesa vê e ouve

O detalhe de cada linha (a duração, a cor exata, o arquivo do JB2A equivalente, o tamanho) está no anexo do fx-visual
(seções 3 a 8) e no do fx-audio (a seção 3.3, o banco inteiro, com a fonte e a licença de cada som).

### 5.1 As peças visuais (todo efeito é uma combinação delas)

| Peça | O que aparece | Duração |
| --- | --- | --- |
| P1. Clarão do cano | estrela de 4 pontas e brilho redondo na borda do token voltada para o alvo; branco no centro, borda amarela, ciano na Tech | 50 a 90 ms |
| P2. Traçante | cabeça brilhante e cauda de 40 a 140 px, do cano ao ponto final; tempo fixo, para um rifle a 50 m e uma pistola a 3 m lerem igual | 70 a 180 ms |
| P3. Faísca | 6 a 14 riscos curtos que saltam e caem | 150 a 300 ms |
| P4. Sangue | 8 a 16 gotas do lado oposto ao tiro; no estilizado, faíscas vermelhas neon, sem poça | 300 a 500 ms |
| P5. Poeira e lascas | nuvenzinha cinza e pedaços escuros (a bala na parede, no chão, na cobertura) | 400 a 700 ms |
| P6. Anel de choque | círculo fino que se abre e some (laranja na explosão, ciano no EMP, branco no bloqueio) | 200 a 350 ms |
| P7. Bola de fogo | clarão branco de um quadro, bola laranja que cresce, fumaça escura que sobe | 0,6 a 0,9 s + 1,5 s de fumaça |
| P8. Fumaça persistente | nuvem de 10 × 10 m que se mexe devagar (cinza; amarelada no gás lacrimogêneo; verde no veneno) | enquanto durar a regra |
| P9. Glitch no token | deslocamento RGB e faixas, nas cores do tema | 200 a 400 ms |
| P10. Eco | cópias ciano e magenta do token ficando para trás (a esquiva, o Sandevistan) | 250 a 600 ms |
| P11. Retículo e HUD | colchetes que se fecham no alvo e um texto curto ("LOCK", "SP −1", "CRÍTICO", "SUPRIMIDO") | 300 a 600 ms |
| P12. Tremor | a cena treme de 4 a 18 px; nunca no reduzido | 150 a 600 ms |
| P13. Flash de tela | a tela branca (flashbang) ou a vinheta vermelha (Death Save); **proibido** no reduzido e no fotossensível | 100 a 700 ms |
| P14. Luz temporária | o chão acende em volta do cano ou da explosão, só para quem tem visão da área | 80 a 500 ms |
| P15. Texto | o que já existe, mais "SP −1", "CRÍTICO", "FLATLINE", com o teste de visão | 2 s |
| P16. Marca no chão | buraco de bala, queimado, poça | 4 s, ou até o mestre limpar (decisão 11) |

### 5.2 O tiro

| O quê | O que aparece | O que soa |
| --- | --- | --- |
| Pistola média, pesada, muito pesada | clarão e traçante que crescem com a classe; a muito pesada solta um sopro de fumaça e treme só para o dono | o estampido de cada classe (de 9 mm ao revólver .50), 4 ou 5 variações |
| SMG, SMG pesada | clarão curto, traçante fino | o estampido curto, a cápsula a cada 3 balas |
| Rifle de assalto | estrela mais longa, traçante de 90 px | o estampido e a cauda longa |
| Rifle de precisão | clarão grande com anel de pressão, traçante de 140 px e um rastro de ar que fica 0,4 s | o estampido mais alto, ouvido de mais longe (500 m) |
| Espingarda com cartucho | 9 bagos num leque de ±12° que morrem em 6 m, desenhado **mesmo no erro**: mostra quem estava no leque, que é o que a regra pergunta | o estampido grave e o "shk-shk" da bomba |
| Espingarda com slug | clarão largo, traçante grosso, impacto mais gordo | o estampido grave |
| Arco e besta | sem clarão; o token recua 3 px; a flecha voa em arco leve e fica cravada 2 s | soltar e zunir |
| Faca arremessada | a lâmina girando | o "whoosh" |
| Arma montada no veículo | clarão maior, tremor de 4 px no veículo | a metralhadora, sempre em rajada |
| **Três balas por tiro** (2077: a Yukimura, a Shingen, a Chao...) | 3 clarões e 3 traçantes a 60 ms um do outro | 3 corpos, uma cauda |
| **Autofogo** (10 balas) | o clarão piscando 5 vezes, 5 traçantes visíveis espalhados; no alvo, tantos impactos quanto o multiplicador; os que erram batem atrás | a cadência de cada classe, uma cauda só no fim |
| **Supressivo** | o atirador varre um arco que cobre os afetados, 10 traçantes em 0,8 s; quem foi suprimido ganha o "SUPRIMIDO" e se encolhe; ninguém sangra | baixa 5 dB por tiro e varre no pan |
| **Erro** | o traçante passa ao lado e segue até a parede (poeira, faísca e o buraco de 4 s); fora do alcance, a bala cai antes do alvo. Nada do "Miss" de D&D de hoje | o zumbido da bala passando e o impacto no concreto ou o ricochete |
| **Esquivou** | como o erro, mais o eco ciano: o corpo "sai" da linha e volta | |
| **Power (ricochete)** | o traçante bate na primeira parede na direção do alvo, faz faíscas grandes e sai um segundo traçante para o alvo | o "ping" metálico no ponto do rebote |
| **Tech** | um feixe ciano contínuo; ao carregar, um anel que se fecha em volta do atirador; atravessando a cobertura, um ponto de calor e o feixe continua do outro lado | a carga subindo (sem som com a "Carga silenciosa"), o "crack" de railgun |
| **Smart** | a bala curva em S, mais lenta para ler a curva, "LOCK" vermelho no alvo; com dois alvos, duas curvas | o bip da trava (só para quem atira) |
| Munição perfurante, expansiva, incendiária, de borracha | o traçante muda de cor e o impacto muda (as faíscas dos dois lados, o sangue maior, a brasa, o quique sem sangue) | |
| Pente vazio | só para quem tentou: "VAZIO" vermelho no token | o clique seco |
| Arma que falhou (o C73) | clarão sem traçante, fumaça saindo da arma, "FALHOU" | |

### 5.3 O impacto (um desfecho por alvo, o primeiro que vale)

| Desfecho | Quando | O que aparece |
| --- | --- | --- |
| Morte | os PV chegam a 0 e o ator morre | sangue, glitch longo, o token perde a cor e o token dinâmico assume a imagem de morto, "FLATLINE" |
| Crítico ou lesão crítica | `dano.lesoes` | o impacto de carne, o glitch, o **hit-stop** (o traçante congela 60 ms antes de bater), "CRÍTICO" e o nome da lesão, o tremor só para o dono do alvo |
| Carne | perdeu PV | o sangue (pela decisão 4), "−N HP" |
| A armadura segurou | perdeu 0 PV e a armadura ablou | faíscas amarelas que voltam para o atirador, um anel ciano que racha, "SP −1" |
| Escudo | `dano.escudo` | um hexágono ciano entre os dois que recebe o tiro e trinca; quebrado, estilhaça |
| Escudo humano | `linha.cadaver` | o impacto no corpo da frente; o alvo de verdade só pisca |
| Cobertura | o mestre aplica o dano na cobertura | as lascas e o buraco (pelo botão do mestre no cartão) |
| Veículo e vidro | `linha.veicular` | a faísca metálica e o furo; no vidro, o estilhaço |

Os androides, os drones e os veículos nunca sangram.

### 5.4 As granadas e os explosivos

| O quê | O que aparece | O que soa | Fica no mapa? |
| --- | --- | --- | --- |
| Arremesso à mão | a granada girando sobe em arco, com a **sombra** no chão mostrando onde cai | o pino, o "whoosh", o quique | |
| Lança-granadas | o clarão de boca, o arco mais baixo e rápido, um rastro fino de fumaça | o "thunk" | |
| Foguete | o sopro de fumaça para trás do atirador, o foguete em linha reta e o rastro que fica 1,5 s | a partida, o chiado do voo | |
| A área | o quadrado de 10 × 10 m em linha tracejada que pisca e some: mostra quem estava dentro | | |
| Fragmentação | o clarão branco, a bola de fogo, a onda de choque, 30 estilhaços, a fumaça escura; **para na parede** (nada vaza para o outro lado) | a explosão; a música abaixa por um instante | o queimado (decisão 11) |
| Incendiária | a bola mais lenta e baixa e as chamas que ficam | o fogo, o estalo no fim do turno | sim, enquanto o fogo dura |
| Fumaça | um "puf" seco e a nuvem que se espalha em 1,5 s | o "puf" | sim, 1 minuto de jogo |
| Flashbang | o clarão enorme; para quem falhou a resistência, a tela branca e o borrão (no reduzido, só a borda) | o estouro e o zumbido (desligável) | |
| EMP | o anel ciano devagar, os arcos elétricos e o glitch em cada token com cyberware desligado | o "vum" elétrico | |
| Gás lacrimogêneo, veneno, sono, biotoxina | como a fumaça, com a cor de cada um | | sim |
| Arachnid (Black Chrome) | a teia que cai sobre cada alvo atingido | | no token, enquanto o estado dura |
| A granada que erra | o botão "Marcar onde caiu" no cartão (só o mestre): a granada voa até o alvo, quica até o ponto clicado e explode ali. Quem a área nova pega continua com o mestre: o efeito só mostra | | |

### 5.5 A briga

O atacante **avança** 15% da distância e volta (o "lunge", 200 ms, só a imagem: nunca o documento do token).

| Golpe | O que aparece | O que soa |
| --- | --- | --- |
| Soco, desarmado | a estrela curta no contato, as linhas de velocidade | o soco (sem voz humana, pela decisão 18) |
| Chute, Artes Marciais | a meia-lua amarela; a Voadora salta e derruba; o Quebra-ossos dá o glitch e o nome da lesão; o desarme faz o ícone da arma voar | o chute, a queda |
| Lâmina leve, média, pesada | o arco fino com rastro branco e borda ciano; a pesada, mais larga e com tremor | o corte |
| Contundente | o arco grosso, o anel branco, o tremor | a pancada |
| Monowire | a linha finíssima que chicoteia até 6 m e o corte vermelho atravessando o token | o assobio do fio |
| Mantis Blades | dois arcos cruzados em X, verde-ciano, e o lunge mais longo | as lâminas saindo e o corte duplo |
| Gorilla Arms | a onda de choque grande, a poeira, o alvo empurrado e de volta | o soco pesado e o servo |
| Agarrão | os dois tokens ligados por um anel amarelo que pulsa enquanto dura; o estrangulamento aperta | o agarrão |
| Arremessar alguém | o alvo voa em arco curto, a poeira, o tremor, o Caído | a queda |
| Bloquear, aparar | o golpe para antes do alvo, com faísca entre os dois | aço com aço |

### 5.6 O resto

| O quê | O que aparece | O que soa |
| --- | --- | --- |
| Recarga | um anel de progresso amarelo e o pente caindo | a recarga de cada classe |
| Death Save | o eletrocardiograma no token; passou, o pico volta verde; falhou, a linha fica reta e vermelha e vem a morte | o batimento (só o dono); o flatline (a mesa toda) |
| Estabilizar, cura, Speedheal | partículas verdes subindo, o ECG estabilizando, "+N HP" | |
| Sandevistan | ecos ciano e magenta a cada passo enquanto dura; ao ativar, o mundo "para" 0,3 s só para o dono | o tempo desacelerando (desligável) |
| Kerenzikov | dois ecos e um "tique" amarelo na esquiva | |
| Berserk | o contorno vermelho pulsando; cada golpe com tremor | |
| NET: conectar | o feixe de dados do token ao ponto de acesso, depois o anel que já existe | só para quem está na NET e o mestre (decisão 15) |
| NET: Black ICE no netrunner | glitch vermelho e faíscas saindo do neuroport, o dano | o alarme, o raio |
| NET: flatline | a morte com glitch longo e "FLATLINE" | os sons sintetizados do NET Architect servem de base, sem arquivo |
| Veículo: batida, destruído | faíscas metálicas, poeira, vidro, tremor; destruído, a explosão do tamanho do veículo e a fumaça preta | o metal, o vidro, a explosão |
| Interface | | a vez de jogar e a rolagem, quase mudos; o tema de combate "Night City" oferecido no lugar do "Épico" (decisão 21) |

---

## 6. Os itens do ROADMAP (C77 a C97)

**Os números são provisórios.** Pelo protocolo, quem pega um item puxa o `master`, reserva o número `[~]` e faz o push
antes de começar; se outra sessão já usou o número, este passa para o seguinte. Os itens mexem no combate: o trabalho
vai numa worktree própria, não na pasta do usuário (o `AGENTS.md`). O C89 (a NET) é da sessão KouArt.

**Pronto, para cada item:** o G1 a G4 passando, o teste de referência (G3) e o passo novo no cenário (G4), numa cena e
com atores próprios (a lição do ciclo 200); as mutações que cabem ao item (o anexo do fx-coreografia, seção 6.3, tem 13,
cada uma ligada ao teste que tem de cair); o README, o ROADMAP, o MIGRATION_STATUS e o QUALITY_GATES; o `system.json`
na versão `0.3.<ciclo>`.

**Custo:** P = um ciclo pequeno; M = um ciclo inteiro; G = dois ciclos ou mais.

### Fase 0: os consertos e a segurança

- [ ] **C77. Os consertos do que existe:** **P**; depende de nada; risco baixo.
  - o `'texto'` do socket só do mestre ativo (achado 1); o texto só para quem está no `para`, com `recipients` (achado 2);
  - o texto flutuante com o teste de visão, como o C76 (achado 3); a animação de hoje respeitando o `para` (achado 4);
  - o `foundry.utils.srcExists` (achado 6); o ramo do Diwako fora (achado 7);
  - a pasta `efeitos/` na lista do `instalar.mjs`, com o `efeitos/CREDITOS` e o `efeitos/LICENCAS.csv` vazios, e um
    teste do instalador (achado 8).
  - Testa: o G4 com o jogador sem visão (nenhum texto); o socket falso de um jogador (ignorado); o passo do ciclo 29 sem
    mudança.

### Fase 1: o tiro e o impacto com som (a mesa já sente a diferença no fim dela)

- [x] **C78. A regra pura da coreografia e o catálogo:** feito no ciclo 217; **M**; depende do C77; risco baixo (sem Foundry).
  - o `regras-coreografia.mjs`: o evento v1, os perfis por classe (todos os tipos do catálogo: 198 armas), o roteiro de
    todos os modos (mesmo os que só tocam nas fases seguintes), os níveis, o teto, a validação;
  - o `catalogo-efeitos.mjs` com o `proprio:` obrigatório e o `srcPermitido`.
  - Testa: os 17 testes do G3 do anexo do fx-coreografia (seção 6.1) e o teste do catálogo.
- [x] **C79. O diretor, o transporte e as configurações:** feito no ciclo 218; **M**; depende do C78; risco médio (mexe no texto que o passo do
  ciclo 29 confere).
  - o `coreografia.mjs` com os caminhos 1 e 2 (seção 4.3), a fila deste cliente, o teto e a falha que vira contador;
  - as configurações da seção 4.4, com a "Efeitos na mesa" ganhando o "Reduzido" sem quebrar quem já usa;
  - o tocador só com o passo `texto`: a paridade com hoje, nada novo aparece ainda.
  - Testa: o G4 sem duplicar entre os clientes, quem vê o cartão, desligado, o arquivo que some, o escondido, a outra
    cena.
- [ ] **C80. O palco PIXI: o tiro e o impacto:** **G**; depende do C79; risco médio (o peso no PC fraco e no celular; o
  Edge sem janela do G4 desenha o PIXI de verdade).
  - as peças P1 a P5, P9, P11, P14 a P16; o tiro único de cada classe; o erro com a parede; a esquiva com o eco; os
    impactos da seção 5.3; o "Rever o efeito" no cartão.
  - Testa: o G4 com os passos reais, dez rajadas seguidas (o contêiner destruído, o número de filhos de volta), e o G4
    inteiro **duas vezes** (os passos antigos com `animacoes: 'auto'` passam a desenhar: uma instável nova pode aparecer).
- [ ] **C81. O motor de som e o banco da fase 1:** **M**, mais 1 a 2 horas de audição com o usuário; depende do C79; risco
  baixo.
  - o `sons.mjs` e o `regras-sons.mjs`; o barramento, as vozes, o pitch, o volume de cada aparelho; o áudio travado
    descartado; a pré-carga;
  - o posicional simples (pela distância, sem paredes ainda); o escondido só para o mestre;
  - o banco da fase 1: cerca de 40 eventos e 120 arquivos (o tiro único das 11 classes do RED, a cauda externa, os
    impactos em carne, armadura e concreto, o erro, o pente vazio, a recarga), em Ogg Opus mono, cerca de 1,5 MB;
  - o `build/sons.mjs` (os masters fora do git, a normalização, o Opus, o `banco.json`, o `LICENCAS.csv`), com o ffmpeg no
    PC.
  - Testa: o G3 (a escolha da variação, o volume, o `LICENCAS.csv` com uma linha por arquivo e só licenças permitidas);
    o G4 (o som pedido uma vez por cliente; desligado com o volume 0).
- [ ] **C82. O disparo antes da defesa:** **P** (a decisão 2 foi "sim"); depende do C80 e do C81; risco baixo.
  - o momento A no `resolver` (`combate/modos.mjs`, depois da `:139`) pelo caminho 2: o clarão, o estampido e a mira; o
    desfecho sem um segundo clarão.
  - Testa: o G4 (o disparo antes da janela de reação abrir no jogador; o atirador escondido só no mestre).

### Fase 2: a rajada e as armas de 2077

- [ ] **C83. O autofogo, o supressivo, o cartucho e as munições:** **M**, mais uma leva de sons; depende do C80 e do C81;
  risco médio (o tempo e a mixagem são de ouvido).
  - o autofogo com o multiplicador e a cadência; o supressivo que varre; o cone do cartucho; as munições (perfurante,
    expansiva, incendiária, borracha, Smart); as classes Power (o ricochete), Tech (o feixe, a carga, o "atravessa") e
    Smart (a curva, a trava); as três balas por tiro; os dois canos.
  - Testa: o G3 (os roteiros e o orçamento); o G4 (o supressivo em 8 alvos dentro do teto de 3,5 s).

### Fase 3: as granadas

- [ ] **C84. O explosivo e os lançadores:** **M**; depende do C83; risco médio (o "onde caiu" é uma ferramenta nova na cena).
  - o arco do arremesso, o lança-granadas, o foguete com o rastro; a explosão com a onda, o tremor e a parede que segura;
    os impactos pela distância do centro; o Molotov e a Shuriken Tornado;
  - no erro (`combate/modos.mjs:729-735`), o botão "Marcar onde caiu" (decisão 9). A regra de quem é atingido não muda.
  - Testa: o G3 (o roteiro da explosão); o G4 (a explosão no ponto marcado, nos dois navegadores).
- [ ] **C85. As granadas que duram:** **G**; depende do C84; risco médio (a Região, o fim no relógio do mundo pelo
  `expirarTemporarios` de `municoes.mjs:240`, o desenho que sobrevive ao recarregar).
  - a fumaça, o gás, o veneno, o sono, a biotoxina (a nuvem de 10 × 10 m por 1 minuto); o flashbang na tela de quem falhou;
    o EMP e o glitch nos tokens com cyberware desligado; a incendiária (as chamas enquanto vale o "Em chamas"); a
    Arachnid.
  - Testa: o G4 (a nuvem some no fim do minuto e quando o mestre apaga a Região; recarregar a página redesenha).

### Fase 4: a briga

- [ ] **C86. O corpo a corpo:** **M**, mais uma leva de sons; depende do C80 e do C81; risco baixo.
  - as armas brancas pelo peso; a Briga e as Artes Marciais (a Voadora, `combate/modos.mjs:534`); as cyberarmas (a garra,
    a Mantis, o Monowire até 6 m, a Gorilla); a arma branca arremessada; o lunge só no desenho.
  - Testa: o G4 (um soco e um corte; o `x`/`y` do documento do token sem mudar depois do lunge; o andar do token dinâmico,
    que é das instáveis conhecidas, junto).
- [ ] **C87. O agarrão e os movimentos sem ataque:** **P**; depende do C86; risco baixo.
  - os cartões do `agarrao.mjs` (`:163`) e do `artes-marciais.mjs` (`:106`) ganham a flag `efeito`; agarrar, resistir,
    tomar o objeto, escapar, estrangular, derrubar, o escudo humano; o anel persistente; **o texto em cima do token, que
    esses cartões não têm hoje**.
  - Testa: o G4 (agarrou e derrubou nos dois navegadores; o anel some no "Soltar").

### Fase 5: o corpo, a NET, o cyberware e os veículos

- [ ] **C88. O corpo e a morte:** **M**; depende do C80 e do C81; risco baixo.
  - o mortalmente ferido; a lesão crítica (também a do botão "Rolar a lesão", `combate/cartao.mjs:180`); o Death Save
    (`turnos.mjs:201`); o fogo no fim do turno; os perigos (a queda, a eletrocução, a batida, `perigos.mjs:356` e `:389`).
  - Testa: o G4 (o Death Save que falha: o flatline nos dois).
- [ ] **C89. A NET e o Neuroport** (sessão KouArt): **M**; depende do C79; risco médio (os passos da NET no G4 são muitos e
  sensíveis).
  - conectar, desconectar (seguro e inseguro), o Black ICE, o dano no cérebro, o Zap, o programa de ataque, o Scanner;
    o Jack In, o Breach, o quickhack e a expulsão (`neuroport.mjs:261`); os sons sintetizados do NET Architect
    (`foundry-net-architect/scripts/fx.mjs:75-120`) como base, sem arquivo.
  - Testa: o G4 (as linhas novas do log tocam uma vez; os sons só para os donos do netrunner e o mestre).
- [ ] **C90. O cyberware, o equipamento e a munição:** **P**; depende do C80; risco baixo.
  - a recarga e a descarga (`documentos.mjs:1209` e `:1217`), o usar do equipamento (`documentos.mjs:967`) e a droga, a
    carga da arma Tech (`combate.mjs:218`), a lâmina da arma popup, o Sandevistan, o Kerenzikov e o Berserk, pela carona
    no documento (caminho 3).
  - Testa: o G4 (a recarga toca nos dois); o G3 (as chaves aceitas da carona).
- [ ] **C91. Os veículos:** **M**; depende do C84; risco médio (a origem no token do veículo; a tripulação do C46).
  - a arma montada; o dano na estrutura e no vidro; a batida e a manobra perdida (`direcao.mjs:109`); o veículo destruído.
  - Testa: o G4 (o tiro do motorista sai do veículo).

### Fase 6: quem ouve, a personalização e o acabamento

- [ ] **C92. Quem ouve, por inteiro:** **G**, mais uma leva de sons; depende do C81; risco médio a alto (o posicional copia
  a lógica do núcleo, `client/audio/sound.mjs:487-507`, e um 14.x novo pode mudá-la).
  - as paredes e o som abafado através delas; o pan; o silenciador (decisão 14); o fallback de quem não tem token na cena;
    as caudas por lugar (externo, interno, rua); o tema de combate "Night City" (decisão 21); a cópia AAC, se alguém usar
    Safari (decisão 8).
  - Testa: o G4 (o volume calculado atrás de uma parede é menor; o mestre não ouve no máximo).
- [ ] **C93. Os perfis do mestre:** **M**; depende do C83 e do C85; risco médio (a ida e a volta da wiki).
  - a janela "Efeitos da mesa" (os perfis, o "Testar", o padrão de cada classe); o perfil por item do catálogo e por item;
    por munição e por tipo de granada; o jogador escolhe na lista (decisão 16).
  - Testa: o G3 (a ordem dos cinco níveis da seção 4.5); o G4 (o perfil do catálogo vale depois de reimportar da wiki; o
    caminho de arquivo posto numa flag pelo jogador é ignorado).
- [ ] **C94. O Sequencer e o JB2A como opção:** **P**; depende do C80; risco médio (o G4 não cobre).
  - o `tocador-sequencer.mjs`, sempre `.locally()`, desligado no WebKit; os candidatos do JB2A no catálogo (a lista do
    anexo do fx-visual, seção 10).
  - Testa: o G3 (a tradução, com um `Sequence` falso); a nota de "sem teste no G4" no MIGRATION_STATUS.
- [ ] **C95. As folhas de sprite no estilo 2077:** **G** (é arte); depende do C80; risco médio (a qualidade artística).
  - a explosão, a bola de fogo, a fumaça, o sangue, as faíscas elétricas, o EMP, o holograma e o glitch, o clarão em 3
    ângulos, os estilhaços: cerca de 16 folhas `.webp` de até 1024 × 1024, até 4 MB no total, com a ferramenta da decisão
    20.
  - Testa: o G3 (cada folha no catálogo e no `CREDITOS`); o G4 (a folha carrega e é solta quando a cena troca).
- [ ] **C96. O polimento:** **P**; depende do C80; risco baixo.
  - o token dinâmico que espera o impacto para trocar a imagem (decisão 17); o reduzido automático no celular; a pré-carga
    por cena; a medição do custo num PC fraco e num celular de verdade.
  - Testa: o G4 (o token troca depois do impacto e nunca depois de 3 s; o C45 e o C52 sem instáveis novas).
- [ ] **C97. O VFX do Foundry 14** (só se você quiser, e só quando o core tirar o "experimental"): **P**, uma prova; risco
  alto (`client/config.mjs:1359-1365`).
  - um terceiro tocador com o `foundry.canvas.vfx`, atrás de uma configuração desligada.
  - Testa: o G4 de que, desligado, nada muda.

**A ordem que entrega valor cedo:** C77 → C78 → C79 → **C80 e C81** (o tiro com impacto e som na mesa) → C82 → C83 →
C84 → C85 (as granadas) → C86 → C87 (a briga) → C88, C90, C91 → C92 a C96. O C89 (a NET) pode correr em paralelo depois
do C79, na sessão KouArt.

---

## 7. Os arquivos, as licenças e o peso

**A regra do git público** (o repositório é público, conferido na auditoria de 2026-11-16): no git só entra **CC0**,
**CC-BY** (com o crédito no `efeitos/CREDITOS`) ou o que é **nosso**. Nenhum arquivo entra sem a linha dele no
`efeitos/LICENCAS.csv`, e o G3 confere.

| Fonte | Pode ir no git? |
| --- | --- |
| Kenney (Sci-fi, Impact, Interface, UI, Digital Audio; o Particle Pack com 80 texturas) | sim, CC0 |
| The Free Firearm Sound Library (OpenGameArt) | sim, CC0 |
| BigSoundBank, Freesound filtrado por CC0 ou CC-BY | sim (o crédito de cada arquivo) |
| jsfxr, ChipTone, Audacity, Effekseer, Blender (feito por nós) | sim, é nosso |
| CC-BY-SA, NC, ND (Q009, Tabletop Audio) | não |
| Sonniss GDC (a licença 2.0, de 27/08/2026, proíbe distribuir os sons, editados ou não) | não; no máximo no servidor, fora do git (área cinzenta) |
| Pixabay ("standalone" proibido) | não |
| JB2A (CC BY-NC-SA, e a JB2A pede que ninguém copie os arquivos), PSFX, Patreons | não; só como módulo instalado no servidor |
| O som do Cyberpunk 2077 (o jogo) | nunca |

**Onde cada coisa fica:**

| Lugar | O que vai | No backup diário? |
| --- | --- | --- |
| `foundry-sistema/efeitos/` (servido em `systems/cpr-fieldbook/efeitos/`) | o núcleo: texturas, folhas próprias, sons CC0, CC-BY e nossos, o `CREDITOS` e o `LICENCAS.csv` | não precisa: o git é a cópia, e o push instala |
| `Data/modules/<pacote>` no servidor | o Sequencer, o JB2A grátis (1,8 GB), o JB2A Patreon (mais de 9 GB), se você quiser | **não**: o `backup.sh` deixa o `modules/` de fora |
| `Data/efeitos-mesa/` no servidor (pasta nova) | os poucos sons pagos ou não redistribuíveis, escolhidos a dedo | sim, nos 3 pacotes guardados sem compressão: **teto de 100 MB**; o JB2A Patreon nunca vai para lá |

**Os formatos:**
- o som em **Ogg Opus mono**, 64 kbps (cerca de 8 KB por segundo); evitar o MP3 no tiro (o atraso do começo desencontra o
  som do clarão); uma cópia AAC (`.m4a`) só se alguém jogar no Safari (decisão 8);
- as animações próprias em **folhas `.webp`** de até 1024 × 1024 (tocam em todo navegador, o iPhone inclusive); no
  máximo umas 6 folhas carregadas ao mesmo tempo (cerca de 24 MB de memória de vídeo);
- o `.webm` do JB2A só fora do WebKit.

**O orçamento no git:**

| O quê | O peso |
| --- | --- |
| hoje, o `foundry-sistema/` inteiro | 5,4 MB |
| o núcleo da fase 1 (os sons e as texturas) | cerca de 1,5 MB |
| o banco completo de sons (cerca de 420 arquivos) | cerca de 5 MB (12 MB com a cópia AAC) |
| as folhas de sprite próprias (o C95) | até 4 MB |

**Uma diferença entre os especialistas para você resolver (decisão 7):** o fx-assets propôs um teto de **6 MB** para os
efeitos no git, e o banco completo do fx-audio mais as folhas somam uns **9 MB**. As saídas: subir o teto para uns 10 MB
(o servidor e o jogador aguentam: o navegador baixa cada arquivo uma vez só e depois só confirma pelo ETag), ou cortar o
banco para 3 variações por som em vez de 5 (cerca de 3 MB). A equipe acha o teto de 10 MB razoável. Para o histórico do
git não inchar: os masters ficam fora do git, cada leva de sons vai num ciclo só, e nenhum `.webp` se refaz dez vezes.

---

## 8. Os riscos

| Risco | Como evitar |
| --- | --- |
| O efeito revela o que o jogador não devia ver (o token no escuro, o cartão secreto) | tudo no `canvas.primary`, sob a névoa; o texto com o teste de visão; o `para` no roteiro; um passo do G4 com um jogador sem visão |
| A rajada ou o supressivo travam o celular | o orçamento por evento (seção 4.6); o reduzido automático; contar os objetos no G4 |
| Vazamento de objetos PIXI: a cena fica pesada numa sessão longa | um contêiner por roteiro, destruído no fim e no `canvasTearDown`; o G4 confere o número de filhos |
| Uma instável nova no G4 (o Edge sem janela atrasa as animações) | conferir pelo fim do roteiro, nunca pelo tempo (a lição do C52); rodar o G4 duas vezes no C80 |
| O mestre ouvindo tudo no máximo (o `gmAlways`) | o posicional calculado pelo sistema |
| A fila do autoplay tocando tudo de uma vez | descartar com o `game.audio.locked` e o aviso "clique para ligar o som" |
| Um som com licença errada no git público | o `LICENCAS.csv` conferido pelo G3 |
| O som cansa em 20 minutos; a explosão tampa a voz do mestre | o volume padrão baixo; nada de som em rolagem de perícia; o limitador do barramento; a interface quase muda |
| Fotossensibilidade (flashbang, EMP, crítico piscando) | o reduzido automático com o modo fotossensível do core; nada pisca mais de 3 vezes por segundo em nenhum nível |
| O sangue incomoda alguém da mesa | o estilizado como padrão; cada jogador reduz no aparelho dele |
| A fumaça fica órfã depois do minuto | o fim no relógio do mundo e o desenho que segue o documento (a Região), nunca um estado guardado no cliente |
| O lunge ou o arremessar mexem no documento do token e brigam com o token dinâmico | só a imagem (`token.mesh`), nunca um `update` |
| Um módulo de terceiros quebra no Foundry 15 | o sistema nunca exige módulo: todo efeito termina no `proprio:` |
| O PIXI 7 trocado pelo PIXI 8 num Foundry futuro | o núcleo é nosso e o G4 cobre; o pior caso é cair para o texto flutuante de hoje |
| A flag do perfil se perde na reimportação da wiki | o mapa por item do catálogo como rede (seção 4.5) |
| A pasta nova não chega ao servidor | a pasta no `instalar.mjs` e o teste do instalador no C77 |

---

## 9. As suas decisões

Cada uma vem com a recomendação da equipe. Responda "aceito as recomendações" ou mude as que quiser.

### 9.1 Antes de começar (seguram a fase 1)

**Decididas em 2026-11-26:** o usuário aceitou as oito recomendações ("Aceito todas"). Fica aberto só o que a decisão 8
pergunta: se alguém joga no Safari (o iPhone, o iPad ou o Mac). Até a resposta, não se gera a cópia AAC; a pergunta volta
no C92.

| # | A pergunta | A recomendação |
| --- | --- | --- |
| 1 | **A base:** o sistema desenha e toca tudo sozinho, com o Sequencer e o JB2A só como opção? Instalar o JB2A grátis no servidor agora? | Sim à base própria. O JB2A **não** por agora (1,8 GB, pouco de cyberpunk, fundo preto no iPhone); dá para pôr depois, no C94. |
| 2 | **O tiro sai no clique** (o clarão, o estampido e a mira antes da janela de defesa) **ou tudo depois do resultado?** | No clique (o C82). Sem isso, entre o clique e o efeito passam os segundos da defesa. A mira não conta o resultado. |
| 3 | **Quem vê e ouve:** o disparo para todos que veem o atirador, e o desfecho só para quem vê o cartão? E o tiro de um token escondido? | Sim: um tiro se ouve, o resultado é que pode ser segredo. Com o cartão "só o mestre", os jogadores veem o tiro sem o desfecho. O token escondido: só o mestre vê e ouve. |
| 4 | **O sangue:** realista, estilizado (faíscas vermelhas neon, sem poça) ou nenhum? | Estilizado no mundo, e cada jogador pode reduzir no aparelho dele. |
| 5 | **O tremor e o clarão de tela:** ligados por padrão? | Ligados, só para quem tem token a até 20 m, cada um desliga, e desligados sempre no modo fotossensível. |
| 6 | **De onde vêm os sons:** 100% CC0, CC-BY e feitos por nós no git, ou comprar um pacote para o servidor? Pode usar som gerado por IA nas lacunas (o Sandevistan, o Black ICE)? | 100% livre e nosso por agora; um pacote pago só se o CC0 não ficar bom no tiro. A IA: só depois de conferir os termos do gerador. |
| 7 | **O teto do peso no git:** 10 MB com o banco completo, ou 6 MB com 3 variações por som? | 10 MB. |
| 8 | **Alguém joga no iPhone, no iPad ou no Safari do Mac?** E quem faz a curadoria de ouvido (1 a 2 horas por fase)? | Se ninguém usa Safari, a cópia AAC sai (−7 MB, uma etapa a menos no build). A curadoria é sua: o agente baixa, corta e normaliza, você escolhe. |

### 9.2 Podem esperar a fase delas

| # | A pergunta | A recomendação | A fase |
| --- | --- | --- | --- |
| 9 | **A granada que erra:** o mestre clica onde caiu, ou uma regra de desvio sorteada? | O mestre clica (a wiki hoje diz "o mestre decide onde caiu"). Uma regra de desvio é regra nova: só com a fonte na wiki e o `rpg-mecanicas`. | C84 |
| 10 | A fumaça, o gás e o fogo ficam no mapa pelo tempo da regra (1 minuto de jogo), como uma Região? E a fumaça escurece a visão do Foundry? | Ficam (a fumaça é tática: o −4). Escurecer a visão: opcional, desligado. | C85 |
| 11 | As marcas no chão (o queimado, o buraco de bala) somem ou ficam até o mestre limpar? | Somem em 4 s: marca persistente vira lixo no mapa. | C80 |
| 12 | O clarão do cano ilumina a cena por 0,1 s (e revela quem atira no escuro)? | Sim, menos no reduzido: o clarão denuncia, e a luz só aparece para quem tem visão da área. | C80 |
| 13 | O som posicional (mais baixo longe e atrás da parede) ou para todos igual? E quem não tem token na cena? | O posicional no tiro, na explosão e no golpe; o de interface no crítico e no flatline. Sem token: tudo a 50%. | C81 e C92 |
| 14 | **O silenciador:** um acessório (regra nova, o `rpg-mecanicas`) ou um campo "Silenciada" que o mestre marca? O RED não tem silenciador no catálogo. | É escolha de regra: sua. | C92 |
| 15 | A NET no mapa: o som só para quem está na NET e o mestre, e o glitch para todos que veem o token? | Sim. | C89 |
| 16 | Quem escolhe o efeito da arma: só o mestre, ou o jogador numa lista que o mestre aprovou? | O mestre cria os perfis e o jogador escolhe na lista (nunca um arquivo). | C93 |
| 17 | O token dinâmico troca para "ferido" só depois do impacto (até 1 s mais tarde)? | Sim. | C96 |
| 18 | **A voz humana** (o grunhido na briga, o grito na morte)? | Sem voz: fica repetitivo e é o que mais cansa. | C86 |
| 19 | Com "Resolver os ataques" desligado: só o disparo, ou nenhum efeito? | Só o disparo, pedido ao mestre e conferido por ele. | C82 |
| 20 | **Compras:** o EmberGen (cerca de US$ 300 no 1º ano, preço não confirmado) para as folhas de sprite, ou o Blender e o Effekseer (grátis, mais lentos)? O JB2A Patreon (preço não confirmado)? O Make it Shiny Cyberpunk (o único com cara de 2077, mas parado no Foundry 13)? | Blender e Effekseer primeiro; nenhum Patreon agora; o Make it Shiny só depois de alguém testar no 14. | C95 |
| 21 | O tema de combate "Night City" (a sua vez, o próximo, o início) oferecido no lugar do "Épico" do Foundry? É de cada jogador. | Oferecer, sem trocar sozinho. | C92 |
| 22 | O flatline para a mesa toda, e o batimento do Death Save só para o dono? Os sons intensos (o zumbido do flashbang, o Sandevistan) ligados por padrão? | Sim aos dois, com o "Sem os intensos" em cada aparelho. | C85 e C88 |
| 23 | Usar o VFX experimental do Foundry 14? | Agora não; uma prova depois, atrás de uma configuração (o C97). | C97 |
