# fx-visual: o que a mesa vê (tiro, impacto, explosão, briga, cyberware, NET)

Especialista: **fx-visual** (equipe de Efeitos: fx-visual, fx-audio, fx-coreografia, fx-assets).
Base lida: o `origin/master` 725911b6 (ciclo 214), o Foundry 14.369 instalado em
`%LOCALAPPDATA%\FieldbookTeste\foundry14-app` e as páginas dos pacotes (fontes no fim). Nenhum arquivo do repositório
foi alterado.

Convenções deste texto:
- **Custo:** P = cabe num ciclo pequeno (até ~150 linhas e um passo de G4); M = um ciclo inteiro (código, G3, G4 e
  mutações); G = dois ciclos ou mais.
- **Peso:** o que o efeito custa no cliente (partículas, passes de filtro, vídeos tocando ao mesmo tempo, luz).
- **Sem módulo** = PIXI 7.4.3 e as classes do core do Foundry 14. **Com módulo** = Sequencer 4.3.1 + JB2A (o grátis
  0.9.4 ou o do Patreon), ou outro pacote dito na linha.
- **Decisão do usuário** marca gosto, compra ou regra de mesa.

---

## 0. Resumo: o que recomendo

1. **O sistema desenha os efeitos sozinho, sem módulo, e o JB2A fica como troca opcional de textura.** O Foundry 14 já
   traz tudo o que um tiro, uma explosão e uma briga precisam: o `ParticleGenerator` (faíscas, sangue, fumaça,
   estilhaços), o `CanvasShakeEffect` (o tremor, que já se desliga no modo fotossensível do core), o
   `TextureTransitionFilter` (o glitch e o holograma que o token dinâmico já usa), a luz temporária (`PointLightSource`)
   e o PIXI para os traçantes. O JB2A grátis tem pouca coisa que serve para cyberpunk (umas 30 de 2.130 animações) e
   pesa 1,5 GB.
2. **Um "diretor" e dois "palcos".** Uma função pura (`regras-efeitos-visuais.mjs`, testável no G3) lê o resultado que
   o mestre já calculou (as `linhas` do `cartaoDoResultado`) e monta um **roteiro** pequeno, em JSON (quem atirou, de
   onde para onde, a classe da arma, o modo, o desfecho de cada alvo). O mestre manda o roteiro pelo socket do sistema,
   e **cada cliente desenha o seu**, com a visão dele e com a preferência dele (reduzido, sem sangue). Um palco desenha
   com o PIXI do core; o outro, com o Sequencer em `.locally()`.
3. **Nada sai antes da defesa.** O roteiro sai na mesma hora do texto flutuante de hoje (`cartao.mjs:78-89`). A única
   exceção que proponho (decisão do usuário) é a **mira** no momento da rolagem: uma linha tracejada e o retículo no
   alvo, que dizem "estou mirando nele", não o resultado.
4. **Respeitar a visão de cada jogador.** Tudo o que conta o resultado (traçante, impacto, sangue, explosão) vai para o
   `canvas.primary`, que fica sob a névoa de guerra. Só o texto vai para a interface, e com o teste de visibilidade que o
   C76 já usou no ponto de acesso (`netrun/ponto-de-acesso.mjs:73`). **Achado:** o texto flutuante de hoje só confere o
   token escondido (`efeitos.mjs:34`), e o `createScrollingText` desenha na interface, por cima da névoa
   (`client/canvas/groups/interface.mjs:174`): um "−12 HP" em cima de um token no escuro mostra ao jogador onde ele
   está. Vale consertar na fase 0.
5. **Acessibilidade de verdade.** Uma configuração **por aparelho** (completo, reduzido, só o texto), que também segue o
   "modo fotossensível" do core (`game.settings.get('core', 'photosensitiveMode')`, `board.mjs:690-692`): sem tremor,
   sem clarão de tela, sem piscar.
6. **Orçamento fixo por evento**, para a rajada de 10 e o supressivo em 8 alvos não travarem um celular: no máximo 6
   traçantes vivos, 300 partículas no PC e 120 no celular ou no reduzido, uma luz temporária por evento e nenhum filtro
   novo por token além do glitch do crítico.
7. **O framework VFX do Foundry 14 (`foundry.canvas.vfx`) ainda não.** Ele faz exatamente isto (ataque, projétil em
   arco, impacto, som posicional, tremor, serializável pelo socket), mas está desligado por padrão e marcado como
   experimental, "likely to change" (`client/config.mjs:1357-1366`). Proponho desenhar o roteiro com o mesmo formato
   dele, para migrar quando estabilizar.

**Decisões que o usuário precisa tomar** (detalhes na seção 11):
- D1. Instalar o JB2A grátis (1,5 GB no servidor e no backup) ou ficar só com os efeitos próprios? Assinar o Patreon?
- D2. Sangue: realista, estilizado (faísca vermelha, sem poça) ou nenhum? E quem escolhe: o mestre para a mesa, ou cada
  jogador para si?
- D3. O clarão do cano ilumina a cena por 0,1 s (e revela quem atira no escuro)?
- D4. A mira aparece na rolagem, antes da defesa?
- D5. Com o cartão do resultado "só para o mestre", os jogadores veem o tiro sem o desfecho, ou nada?
- D6. A granada que erra: o mestre clica onde caiu, ou o sistema sorteia o quique? (é regra; vai junto com o
  rpg-mecanicas)
- D7. A fumaça e o fogo ficam no mapa pelo tempo da regra (1 minuto de jogo), como uma Região?
- D8. As marcas que ficam (queimado no chão, buraco de bala, poça): somem sozinhas, ou ficam até o mestre limpar?
- D9. O tremor de tela vale para todos ou só para quem está perto da explosão?

---

## 1. O que já existe (e os achados)

| Onde | O que faz | Observação |
|---|---|---|
| `foundry-sistema/scripts/efeitos.mjs:30-39` | `textoFlutuante`: o texto sobe em cima do token (`createScrollingText`), nas cores do tema (`CORES`, :16: acerto `0xff2a4a`, erro `0xe8e6d9`, defesa `0x02d7f2`). | Só esconde o token `hidden` (:34). Não testa a visão do jogador; a interface fica por cima da névoa. **Achado 1.** |
| `efeitos.mjs:42-60` | `animar`: no mestre, com Sequencer e JB2A, `Impact_07_Regular_Orange` no acerto e `Miss_02_White` no erro e na defesa, em `atLocation` do alvo, 1,4 × o token; o som do Diwako. | Não há tiro: nada sai do atirador. O "Miss" é texto de D&D. Os dois arquivos existem no JB2A grátis (conferido na árvore do repositório: 203 KB e 44 KB). |
| `combate/cartao.mjs:78-89` | `mostrarNaMesa`: para cada linha, o texto (aqui e pelo socket) e a animação, pela configuração "Efeitos na mesa". | A animação só roda se o alvo não está escondido (:87) e sai pelo Sequencer para todos, com a visão de cada um, mas **sem respeitar o `para`** (quem vê o cartão, :84): com o cartão "só para o mestre", a animação mostra o resultado a todos. **Achado 2.** |
| `combate/socket.mjs:122-123` | O tipo `texto` do socket do sistema. | O canal já existe: o roteiro dos efeitos entra como mais um tipo (`efeito`), com o remetente conferido como os outros (o C56). |
| `configuracoes.mjs:71-74` | "Efeitos na mesa" (mundo): texto e animação, só o texto, nada. | É do mundo: o jogador fotossensível não tem como desligar só para ele. **Achado 3.** |
| `token-dinamico.mjs:56` e `regras-token-dinamico.mjs:116-117` | A troca da imagem do token com a transição do core (glitch, esmaecer, holograma). | O mesmo `TextureTransitionFilter` serve para o "glitch de dano" (seção 3, P9). O token dinâmico já troca a imagem para ferido e caído: o efeito de morte não precisa trocar imagem, só marcar o momento. |
| `marcador-de-turno.mjs` | O marcador sob o token da vez. | Sem relação direta; não mexer. |
| `foundry-net-architect/scripts/fx.mjs` (Foundry 12, só referência) | Feixe e anel na NET; sem Sequencer, um `PIXI.Graphics` num `ticker`, desenhado em `canvas.interface`. | Bom modelo do "efeito simples", mas a interface fica por cima da névoa; no sistema novo vai para o `canvas.primary`. Os arquivos JB2A que ele usa existem no grátis (conferido). |
| `foundry-fluxo-de-combate/scripts/fx.mjs` (Foundry 12) | O mesmo do `efeitos.mjs`, mais antigo. | Só referência. |

O que o resultado já entrega para o diretor dos efeitos, sem mexer nas regras (`modos.mjs` e `documentos.mjs`):

| Campo | De onde | Para que o efeito usa |
|---|---|---|
| `ctx.modo` (`tiro`, `autofogo`, `supressivo`, `cartucho`, `explosivo`, `corpo`, `ricochete`) | `regras.mjs:572` (`classificar`) | O tipo do roteiro. |
| `ctx.arma.system.tipo` (`medPistol`, `heavyPistol`, `vHeavyPistol`, `smg`, `heavySmg`, `shotgun`, `assaultRifle`, `sniperRifle`, `bow`, `grenadeLauncher`, `rocketLauncher`, `lightMelee`, `medMelee`, `heavyMelee`, `vHeavyMelee`, `thrownWeapon`, `unarmed`, `martialArts`) | o item | A classe visual do tiro e do golpe. |
| `ctx.arma.perfil2077` (`classe`: `power`, `tech`, `smart`; `balasPorTiro`, `doisAlvos`, `doisCanos`, `ricocheteia`) | `regras.mjs:1020-1053` | Os traçantes de 2077. |
| `ctx.arma.municaoCarregada.system.tipo` e `.efeito` (`grenade`, `rocket`, `shotgunShell`, `shotgunSlug`, `arrow`; `emp`, `flashbang`, `smoke`, `teargas`, `incendiary`, `poison`, `sleep`, `biotoxin`, `arachnid`, `armorPiercing`, `rubber`, `smart`...) | o item; `regras.mjs:603-613` | A explosão por tipo e a cor do traçante. |
| `linha.resultado` (`acertou`, `errou`, `esquivou`, `fora`, `suprimido`, `firme`, `semDv`...) | `modos.mjs` | O desfecho de cada alvo. |
| `linha.dano` (`hpAntes`, `hpDepois`, `ablado`, `armaduras`, `escudo`, `escudoAblado`, `estase`, `lugar`, `lesoes`) | `documentos.mjs:620-649` | Carne, armadura, escudo, ablação, crítico, morte. |
| `linha.multiplicador` (autofogo) | `modos.mjs:633-635` | Quantas balas "pegaram" no alvo. |
| `linha.veicular`, `linha.cadaver`, `linha.interposicao`, `linha.municao` | `modos.mjs` | Veículo e vidro, escudo humano, efeito da munição. |
| `ctx.tokenAtq`, `ctx.alvos`, `ctx.cena` | `modos.mjs:25-48` | A origem e os destinos. |

---

## 2. A arquitetura proposta

### 2.1. O diretor (regra pura, G3)

`scripts/regras-efeitos-visuais.mjs` (novo, sem `canvas`, sem `game`): recebe um resumo do ataque e devolve o
**roteiro**:

```js
// Exemplo do roteiro de um autofogo que acertou com multiplicador 3 e deixou a armadura em 10.
{
  versao: 1, id: 'pedido-id', cena: 'sceneId', tipo: 'tiro',
  origem: { token: 'tokenId', x, y, elevacao, escondido: false },
  classe: 'assaultRifle', modo: 'autofogo', municao: { tipo: 'basic', efeito: null }, classe2077: null,
  disparos: 10,                     // balas gastas (balasDoModo); o palco desenha no máximo o orçamento
  alvos: [{ token: 'alvoId', x, y, desfecho: 'carne', golpes: 3, critico: false, morte: false,
            ablado: 1, escudo: false, lugar: 'corpo', parede: null }],
  semente: 12345                    // o mesmo sorteio visual em todos os clientes (a mesma "dispersão")
}
```

- **Por que puro:** o G3 testa a tabela inteira (cada classe, cada modo, cada desfecho), as mutações pegam um "carne"
  trocado por "armadura", e o palco fica burro.
- **A semente:** o espalhamento dos traçantes, o ponto de erro e as partículas saem de um sorteio com semente
  (`foundry.dice.MersenneTwister`, o mesmo que o `CanvasShakeEffect` usa, `animation/shake.mjs`). Todos veem a bala
  passar do mesmo lado.
- **O ponto da parede no erro:** calculado no mestre, com
  `CONFIG.Canvas.polygonBackends.sight.testCollision(origem, alem, { type: 'move', mode: 'closest' })` (o `modos.mjs:766`
  já usa o mesmo, com `mode: 'any'`). Vai no roteiro (`parede: {x, y}`), para nenhum cliente precisar recalcular.

### 2.2. Quem dispara e como chega aos outros

1. O mestre ativo resolve o ataque (como hoje) e, em `mostrarNaMesa`, monta o roteiro.
2. Manda `game.socket.emit(CANAL, { tipo: 'efeito', roteiro, para })` e desenha o dele.
3. Cada cliente, ao receber: confere que veio de um mestre (o `remetente`, como o C56), que está na cena, e desenha com o
   **palco** que a configuração dele escolhe.
4. O `para` (quem vê o cartão) decide o que cada um vê (Achado 2 e D5): quem não está em `para` recebe o roteiro
   **sem desfecho** (só o clarão e o traçante que somem no alvo) ou não recebe nada.

**Por que não deixar o Sequencer transmitir** (como o `efeitos.mjs:50` faz hoje): o Sequencer manda o mesmo efeito para
todos; a preferência de cada aparelho (reduzido, sem sangue, celular) e o `para` não entram. Com o roteiro e
`.locally()`, cada cliente escolhe. O custo é o mesmo: um JSON de 1 a 2 KB por ataque.

### 2.3. Os dois palcos

| Palco | Quando | Onde desenha | Pré-carga |
|---|---|---|---|
| **PIXI** (`efeitos/palco-pixi.mjs`) | Sempre disponível; o padrão. | Um `PrimaryCanvasContainer` próprio no `canvas.primary` (sob a névoa e a iluminação, como o `VFXCanvasContainer` do core, `vfx/vfx-canvas-container.mjs`), com `elevation` do alvo e `sort` acima do token. O texto, em `canvas.interface`, com teste de visão. | As texturas próprias (umas 12 PNG pequenas, ou geradas no início com `canvas.app.renderer.generateTexture` de um `PIXI.Graphics`): carregadas no `canvasReady`, < 200 KB no total. |
| **Sequencer** (`efeitos/palco-sequencer.mjs`) | Só se o mundo tem Sequencer **e** a configuração pede, e só para os efeitos com arquivo que existe (`primeiroQueExiste`, `efeitos.mjs:20-26`, já faz isso). | O Sequencer, `.locally()`, com a máscara de visão padrão (sem `.xray()`), `.constrainedByWalls()` nas explosões e na fumaça. | `Sequencer.Preloader.preloadForClients` só dos arquivos da cena de combate, nunca da biblioteca (o próprio Sequencer avisa do custo). |

**A recomendação** é que o palco PIXI seja completo (todos os efeitos deste documento) e o do Sequencer **troque só a
textura** dos passos onde o JB2A é bom (explosão, fumaça, raio da NET, golpe de katana), caindo no PIXI no resto. Assim
o JB2A vira "skin", e o sistema funciona igual sem ele.

### 2.4. As camadas do canvas e a visão

| Camada | O que vai nela | Vê no escuro? |
|---|---|---|
| `canvas.primary` (com `elevation` e `sort`) | Traçante, clarão, impacto, sangue, faísca, explosão, fumaça, golpe. | Não: fica sob a névoa de cada cliente. O jogador vê o pedaço do traçante que passa pela área que ele enxerga (o que é realista: vê a bala chegando de longe). |
| `canvas.interface` | O texto flutuante, o retículo da mira, o marcador da área no instante da explosão. | Sim: por isso cada item testa `canvas.visibility.testVisibility(ponto, { tolerance })` antes de aparecer (o padrão do C76). |
| Luz temporária (`canvas.effects.lightSources`) | O clarão do cano e da explosão iluminando o chão. | Ilumina o que a visão dos tokens alcança; revela o atirador no escuro (D3). |
| Tela (`document.body` ou um sprite em `canvas.stage` com `screenSpace`) | O flash branco da flashbang e o vinheta vermelha do Death Save. | Só para quem está na área (flashbang) ou é dono (Death Save). |

**O token escondido** (`hidden`):
- Atirador escondido: sem clarão e sem luz; o traçante começa **fora** do token (a 1,5 casa, na direção do alvo) para
  não marcar o ponto exato, ou não sai (D5). O mestre vê tudo, com 50% de opacidade.
- Alvo escondido: os jogadores não recebem o impacto (como hoje, `cartao.mjs:87`); o traçante termina no ar.
- Token que o jogador não vê (escuro, parede): o `primary` já esconde o impacto; o texto passa pelo teste de visão.

### 2.5. O que vem do Foundry 14 (conferido no código instalado)

| API | Arquivo | Para quê | Estável? |
|---|---|---|---|
| `foundry.canvas.animation.ParticleGenerator` | `client/canvas/animation/particle-generator.mjs` (4.513 linhas) | Faíscas, sangue, estilhaços, fumaça, poeira, chama. Modo `effect`, área ponto/linha/círculo/anel/cone por `ellipse` com `minAngle`/`maxAngle`, pool de partículas, `fade`, `velocity` polar, `tint` por curva, `blend`, `elevation`, `debug.stats` (para o G4 contar partículas). | Sim: o clima do core usa (`layers/effects/weather-effects.mjs`). |
| `foundry.canvas.animation.CanvasShakeEffect` | `animation/shake.mjs` | O tremor de tela (`target: canvas.stage`) ou de um token (`target: token.mesh`). Para sozinho no modo fotossensível (:348). | Sim. |
| `foundry.canvas.animation.CanvasAnimation` | `animation/canvas-animation.mjs` | Interpolar alpha, escala, posição; o ticker com prioridade. | Sim (o `createScrollingText` usa). |
| `foundry.canvas.rendering.filters.TextureTransitionFilter` | `rendering/filters/transition.mjs:26-38` | `glitch`, `hologram`, `waves`, `swirl`... O "glitch de dano" é a transição para a **mesma** textura: o shader roda e a imagem não muda (a conferir no G4). | Sim (o token dinâmico usa). |
| `PointLightSource` + `add()`/`remove()` | `sources/point-light-source.mjs`, `sources/base-effect-source.mjs:336-352` | A luz de 80 a 150 ms do clarão e da explosão; depois `canvas.perception.update({ refreshLighting: true, refreshVision: true })`. | Sim, mas a atualização da percepção custa: uma por evento, nunca por bala. |
| `canvas.interface.createScrollingText` | `groups/interface.mjs:174` | O texto. Some se o core `scrollingStatusText` estiver desligado (:175). | Sim. |
| `canvas.visibility.testVisibility` | `groups/visibility.mjs` | Não mostrar texto e marcador fora da visão. | Sim (o C76 usa). |
| `canvas.performance.mode` (`CONST.CANVAS_PERFORMANCE_MODES` LOW a MAX) | `board.mjs:962-980` | O orçamento automático: LOW e MED = reduzido. | Sim. |
| Regiões (`RegionDocument`), com os comportamentos `adjustDarknessLevel`, `applyActiveEffect`, `displayScrollingText` | `client/data/region-behaviors/` | A fumaça, o gás e o fogo que ficam (D7). O `MeasuredTemplate` está obsoleto no 14 (`placeables/template.mjs:13-19`, "merged into the functionality of the Region document"). | Sim. |
| `foundry.canvas.vfx` (`VFXEffect`, componentes `singleAttack`, `singleImpact`, `particleGenerator`, `positionalSound`, `shake`, `scrollingText`; caminhos `linear`, `arc`, `weave`; animações `drawBack`, `followPath`, `scale`) | `client/canvas/vfx/` (3.012 linhas) | Tudo isto, num modelo serializável. O `arc` serve para a granada; o `weave`, para a bala Smart. | **Não**: `CONFIG.Canvas.vfx.enabled = false` por padrão (`config.mjs:1366`); `play()` recusa desligado (`vfx-effect.mjs:169`); o aviso diz que classes e configuração "are likely to change". |
| PIXI 7.4.3 com `@pixi/filter-noise`, `filter-color-matrix`, `filter-displacement`, `filter-blur`, `sprite-animated`, `graphics-smooth`, `particle-emitter` | `node_modules/@pixi`, `node_modules/pixi.js/package.json` | O traçante (`Graphics` com linha suave ou um `Mesh` com gradiente), o glitch RGB (matriz de cor + deslocamento), o `AnimatedSprite` para folhas de quadros (alternativa leve ao `.webm`). | Sim. |
| Texturas do core: `ui/particles/drop.png`, `snow.png`, `rain.png` | `public/ui/particles/` | `drop.png` serve de gota de sangue e de faísca alongada; `snow.png`, de bolinha macia para fumaça e brilho. Zero arquivo novo para começar. | Sim. |

---

## 3. O vocabulário visual (as peças que todos os efeitos usam)

Cada efeito das seções 4 a 9 é uma combinação destas peças. O palco PIXI implementa cada peça uma vez.

| Peça | O que aparece | Duração | Cor | Sem módulo (PIXI) | Com JB2A grátis | Peso |
|---|---|---|---|---|---|---|
| **P1. Clarão do cano** | Estrela de 4 pontas mais um brilho redondo, na borda do token voltada para o alvo, girada na direção do tiro. | 50 a 90 ms | Núcleo branco `#fffbe6`, borda amarela `#fcee09`; Tech ciano `#02d7f2`. | `Sprite` com textura gerada (estrela) + `snow.png` aditivo, escala por classe; alpha 1 → 0. | Não há clarão de cano no JB2A grátis (conferido); fica no PIXI. | 2 sprites. |
| **P2. Traçante** | Cabeça brilhante de 2 a 4 px e cauda de 40 a 140 px que viaja do cano ao ponto final. | 70 a 180 ms (tempo fixo, sem depender da distância; a bala de verdade é instantânea) | Branco-amarelo `#fff3b0` com cauda laranja `#ff9a3c`; Tech `#02d7f2`; Smart `#ff2a4a`. | `Graphics` (linha suave) ou um `Mesh` com textura de gradiente, `blend ADD`. | `Bullet_01_Regular_Orange_30ft` (122 KB), `Bullet_02` (664 KB), `Bullet_03_Regular_Blue` (365 KB), `Snipe_01_Regular_Blue` (499 KB), `LaserShot_01_Regular_Red` (221 KB), com `.stretchTo()`. | 1 objeto por traçante. |
| **P3. Faísca** | 6 a 14 riscos curtos que saltam do ponto e caem. | 150 a 300 ms | `#ffd28a` → `#ff7a1a`. | `ParticleGenerator` (modo `effect`, `drop.png` tingido, velocidade polar 200–500 px/s, cone de 70° de volta para o atirador). | `Impact_08_Regular_Orange` (49 KB), `Impact_09` (112 KB). | 6–14 partículas. |
| **P4. Sangue** | 8 a 16 gotas que saem do lado oposto ao tiro; opcional uma mancha que some. | Gotas 300–500 ms; mancha 4 s | `#8a0a14` a `#c0101e`; estilizado: `#ff2a4a` em faísca. | `ParticleGenerator` (`drop.png`, cone de 50° na direção do tiro, leve gravidade); mancha = sprite com textura própria, alpha 0,7 → 0. | `LiquidSplash02_01_Regular_Red_500x500` (127 KB), `LiquidSplashSide02_01_Regular_Red` (167 KB). | 8–16 partículas + 1 sprite. |
| **P5. Poeira e lascas** | Nuvenzinha cinza e 4 a 8 pedaços escuros (bala na parede, no chão, na cobertura). | 400–700 ms | `#8c8c8c`, lascas `#3a3a3a`. | `ParticleGenerator` (`snow.png` cinza, escala crescente) + lascas. | `SmokePuffSide01_*_Regular_Grey` (104–211 KB). | 10–14 partículas. |
| **P6. Anel de choque** | Círculo fino que se abre e some. | 200–350 ms | Explosão `#ffb347`; EMP `#02d7f2`; bloqueio `#e8e6d9`. | `Graphics.drawCircle` animado (o `efeitoSimples` da NET do Foundry 12 já faz). | `PartSideImpactShockwave01_01_Regular_Blue` (azul: serve ao EMP). | 1 objeto. |
| **P7. Bola de fogo** | Clarão branco de 1 quadro, bola laranja que cresce, fumaça escura que sobe. | 600–900 ms + fumaça 1,5 s | `#ffffff` → `#ffb347` → `#ff5a1f` → `#2a2a2a`. | 2 `ParticleGenerator` (fogo aditivo 40–60; fumaça normal 20–30) + P6 + P12. | `Explosion_01_Orange_400x400` (279 KB), `Explosion_05_Regular_Orange` (336 KB), `ShrapnelBomb01_01_Regular_Black_800x800` (347 KB), `SideExplosion01_0x` (~570 KB). | 60–90 partículas + 1 luz. |
| **P8. Fumaça persistente** | Nuvem que cobre a área, se mexe devagar e se desfaz no fim. | Enquanto durar (regra: 1 minuto de jogo) | `#bfc4c8` a 60%; gás lacrimogêneo `#d9e27a`; veneno/biotoxina `#7bd96a`. | `ParticleGenerator` com área retangular 10 × 10 m, `count` fixo (40–80), vida longa (3–5 s), recriado no `canvasReady` a partir da Região (D7). | `SmokePlumesLoop01_0x_Regular_Grey` (327–380 KB, em laço), `Fumes04_01_Grey_Loop` | 40–80 partículas por nuvem (o maior custo contínuo; limitar a 3 nuvens). |
| **P9. Glitch no token** | O token "falha": deslocamento RGB, faixas horizontais. | 200–400 ms | Vermelho e ciano do tema. | `TextureTransitionFilter.animate(token.mesh, a mesma textura, { type: 'glitch', duration: 300 })`; ou filtro próprio (matriz de cor + deslocamento), só no token. | Token Magic FX tem filtros de glitch e eletricidade, se o usuário quiser (seção 10). | 1 passe de filtro no token, durante o efeito. |
| **P10. Eco (afterimage)** | Cópias da imagem do token, ficando para trás e sumindo. | 250–600 ms | Ciano `#02d7f2` e magenta `#ff2a8a`, 40% → 0. | 2 a 4 `Sprite` com a textura do token (`token.mesh.texture`), `tint`, alpha. | Sem equivalente no JB2A grátis. | 2–4 sprites. |
| **P11. Retículo / HUD** | Colchetes que se fecham no alvo, texto curto em fonte do tema ("LOCK", "SP −1", "CRIT"). | 300–600 ms | Amarelo `#fcee09`; Smart vermelho. | `Graphics` + `PreciseText` na interface, com teste de visão. | `UI/Indicator01_03_Regular_BlueGreen` (115 KB) serve; o `Critical_02_Red` (85 KB) é de D&D. | 3–5 objetos. |
| **P12. Tremor** | A cena treme. | 150–600 ms, 4–18 px | — | `new CanvasShakeEffect({ target: canvas.stage, duration, maxDisplacement, smoothness: 0.6 })` | Sequencer `canvasPan().shake({ duration, strength })` | 0 (move o palco). Desligado no reduzido. |
| **P13. Flash de tela** | A tela branca por um instante (flashbang), vermelha na borda (Death Save). | 100–700 ms | `#ffffff` a 85%; vinheta `#ff2a4a`. | Um `div` por cima do canvas ou sprite em tela; alpha decai. | Sequencer `.screenSpace()`. | 0. **Proibido no reduzido e no fotossensível**: troca por uma borda que acende em 400 ms. |
| **P14. Luz temporária** | O chão acende em volta do cano ou da explosão. | 80–150 ms (tiro), 300–500 ms (explosão) | `#ffcf80`; Tech `#7af3ff`. | `PointLightSource` local, raio 2–3 m (tiro), 8–12 m (explosão). | Igual (o Sequencer não faz luz). | 1 atualização de percepção por evento. Desligada no LOW. |
| **P15. Texto** | O que já existe ("−12 HP", "Esquivou!"), mais "SP −1", "CRÍTICO", "FLATLINE". | 2 s (o padrão do core) | As `CORES` de hoje. | `createScrollingText` com teste de visão. | Igual. | 1 texto. |
| **P16. Marca no chão** | Buraco de bala, queimado, poça. | 4 s a até o mestre limpar (D8) | Escuro, 50–70%. | Sprite no `primary` abaixo dos tokens (`sort` baixo). Persistente = um Tile ou Desenho com flag (D8). | `ScorchedEarth_01_Black_800x800` (1,28 MB). | 1 sprite. |

**Regra do tempo** (para o fx-coreografia confirmar): o tiro inteiro de um alvo cabe em **600 ms**; a rajada, em
**1,2 s**; a explosão, em **1,5 s** (mais a fumaça que fica). O texto entra no instante do impacto, não antes.

---

## 4. Tiro

### 4.1. Por classe de arma (o tiro único que acerta)

O `tipo` do item decide; a munição muda a cor (seção 4.4). As escalas são relativas ao tamanho da casa (`grid.size`).

| Classe (`system.tipo`) | Clarão (P1) | Traçante (P2) | Luz (P14) | Impacto extra | JB2A grátis | Custo |
|---|---|---|---|---|---|---|
| `medPistol` | 0,25 casa, 50 ms | 2 px, cauda 40 px, 80 ms | 2 m | — | `Bullet_01_Regular_Orange` | P |
| `heavyPistol` | 0,35, 60 ms | 3 px, cauda 60 px, 90 ms | 2,5 m | — | `Bullet_01` | P |
| `vHeavyPistol` | 0,45, 70 ms, e um sopro de fumaça (P5 pequeno) | 3 px, cauda 70 px | 3 m | P12 de 4 px para o próprio atirador (só o dono vê) | `Bullet_01` | P |
| `smg` / `heavySmg` (tiro único) | 0,3, 50 ms | 2 px, cauda 50 px, 70 ms | 2 m | — | `Bullet_01` | P |
| `assaultRifle` | 0,45, 60 ms, estrela mais longa | 3 px, cauda 90 px, 100 ms | 3 m | — | `Bullet_01` ou `Bullet_02` | P |
| `sniperRifle` | 0,6, 90 ms, com anel de pressão (P6 branco pequeno) | 4 px, cauda 140 px, 150 ms, e um **rastro de ar** fino que fica 400 ms (linha a 25% que some) | 3 m | P5 maior no erro; P12 6 px no impacto | `Snipe_01_Regular_Blue` (azul: tingir) | P |
| `shotgun` com `shotgunSlug` | 0,55, 80 ms, chama larga | 4 px, cauda 60 px, 90 ms | 3 m | Impacto mais "gordo" (P3 com 14) | `Bullet_02` | P |
| `shotgun` com cartucho (`cartucho`) | ver 4.3 | ver 4.3 | 3 m | — | `Template/Line/Projectile/VolleyProjectileBullet001_001_01_Line_OrangeYellow_30ft` (394 KB) | M |
| `bow` (arco e besta) | sem clarão; a corda: o token recua 3 px | Flecha: um sprite fino (textura própria) que voa a 500 ms por 10 m, com leve arco (caminho `arc` com `peakHeight` 0,05) | — | Fica cravada 2 s no alvo ou no chão no erro | `Arrow01_01_Regular_White_30ft` (256 KB) | P |
| `thrownWeapon` (faca) | — | A faca girando (sprite, 720°/s), 300 ms | — | P3 pequeno na armadura | `Dagger01_01_Regular_White` | P |
| `grenadeLauncher` / `rocketLauncher` | ver 6 | ver 6 | — | — | — | M |
| Arma exótica e montada no veículo | a da classe mais próxima; montada: clarão 0,7 e P12 de 4 px para o veículo | | | | | P |

**Por que tempo fixo:** um rifle a 50 m e uma pistola a 3 m têm de "ler" igual. 80–150 ms é o que o olho pega como
"tiro". A variação vem da largura, do brilho e da cauda.

### 4.2. Os modos

| Modo | Gatilho | O que aparece | Orçamento | Sem módulo | Com JB2A | Custo |
|---|---|---|---|---|---|---|
| **Tiro único** | `modo: 'tiro'` | P1 + P2 + impacto do desfecho (seção 5) + P15. | 1 traçante, ≤ 30 partículas. | PIXI completo. | Traçante e impacto do JB2A; clarão PIXI. | P |
| **Três balas por tiro (2077)** | `perfil2077.balasPorTiro === 3` (a Yukimura, a Shingen, a Chao, a Kappa, a Masamune, a Nowaki) | 3 clarões e 3 traçantes a 60 ms um do outro, espalhados ±4° (semente). O RED não tem a "rajada de 3" do 2020; isto é o modelo de 2077. | 3 traçantes. | PIXI. | `Bullet_01` × 3 com `.delay`. | P |
| **Autofogo** | `modo: 'autofogo'` (10 balas, `BALAS_RAJADA`, `regras.mjs:568`) | Clarão **piscando** (5 pulsos em 500 ms, um único objeto que muda de escala), 5 traçantes visíveis (1 a cada 2 balas) com espalhamento ±8°, os que erram passam e batem atrás (P5 no chão/parede). No alvo: **tantos impactos quanto o multiplicador** (`linha.multiplicador`, 1 a 3 ou 4), a 80 ms um do outro, e um só texto com o total. Os cartuchos caindo ao lado do atirador (4 pontinhos dourados, opcional). | 6 traçantes vivos, 1 luz, ≤ 120 partículas. | PIXI. | `Bullet_01` × 5; impacto × multiplicador. **5 vídeos ao mesmo tempo**: no celular, cai para PIXI. | M |
| **Fogo supressivo** | `modo: 'supressivo'` (`modos.mjs:769-781`; raio 25 m) | O atirador **varre** um arco que cobre os afetados (do primeiro ao último, pelo ângulo), 10 traçantes em 800 ms. Perto de cada afetado, 1 a 2 P5 no chão (a bala que passou perto). Quem foi **suprimido**: P11 amarelo "SUPRIMIDO" + o token se encolhe 5% por 300 ms (o susto); quem ficou **firme**: um P11 branco curto. Ninguém leva impacto de carne (o supressivo não fere). | 10 traçantes em sequência (máx. 6 vivos), 8 × 12 = 96 partículas, 1 luz. | PIXI. | `VolleyProjectileBullet001_002_01_Line_OrangeYellow_30ft` (1,1 MB) esticado no arco. | M |
| **Erro** | `resultado: 'errou'` ou `'fora'` | O traçante passa **ao lado** do alvo (desvio de 0,4 a 0,7 casa, pela semente) e segue até a parede (`parede` do roteiro, seção 2.1) ou até 1,5 × a distância. Na parede: P5 + P3 pequeno + P16 "buraco" 4 s. Sem parede: some no ar. **Nada de "Miss"**. "Fora do alcance": o traçante perde força e cai no chão antes do alvo (P5 no chão a 80% da distância). | 1 traçante. | PIXI. | Sequencer `.missed()` faz o desvio sozinho (doc oficial), mas sem a parede; prefira o ponto do roteiro. | P |
| **Esquivou** | `resultado: 'esquivou'` | Como o erro, mais **P10** (eco ciano) no alvo: o corpo "sai" da linha e volta. | +3 sprites. | PIXI. | — | P |
| **Ricochete (Power)** | `modo: 'ricochete'` (`perfil2077.ricocheteia`) | O traçante vai do cano até a superfície (o ponto de rebote: o mestre não marca hoje; a primeira parede na direção do alvo pelo `testCollision`, ou o ponto médio), faz P3 grande ali, e um segundo traçante sai do rebote para o alvo. Ricochete com cartucho: o leque sai do ponto de rebote. | 2 traçantes. | PIXI. | `Bullet_01` × 2 encadeados. | M (o ponto de rebote é o difícil; ver risco R6) |
| **Dois canos (Testera)** | `pedido === 'doisCanos'` | Dois clarões lado a lado, dois leques de cartucho. | 2 × 4.3. | PIXI. | | P |
| **Dois alvos (Smart)** | `perfil2077.doisAlvos` | Um traçante curvo para cada alvo, saindo juntos. | 2 traçantes. | PIXI. | | P |

### 4.3. Espingarda com cartucho (o cone)

- **Regra que o efeito conta:** um ataque contra DV 13 (`DV_CARTUCHO`, `regras.mjs:564`); acertando, cada alvo à
  frente, até 6 m (`ALCANCE_CARTUCHO`), leva 3d6 (`modos.mjs:689-705`).
- **Visual:** clarão largo (0,6 casa, 80 ms); **9 bagos** (traçantes curtos de 2 px, cauda 25 px) num leque de ±12° que
  morrem em 6 m; o leque é desenhado **mesmo no erro** (a DV não passou: os bagos se espalham e batem no chão, P5 pequeno
  em 3 pontos). Cada alvo atingido: 2 a 3 impactos pequenos agrupados, um texto.
- **Por que um cone visível:** mostra quem estava no leque, que é o que a regra pergunta à mesa.
- **Sem módulo:** PIXI (9 `Graphics` num só container, 120 ms). **Com JB2A:** o `VolleyProjectileBullet` não tem
  formato de cone: fica no PIXI.
- **Custo:** M.

### 4.4. Munição e armas de 2077 (cor e comportamento)

| Munição / classe | Mudança no visual | Custo |
|---|---|---|
| Básica | O padrão. | — |
| `armorPiercing` | Traçante mais fino e branco-azulado; na armadura, P3 atravessando (faíscas dos dois lados). | P |
| `expansive` | Impacto de carne maior (P4 × 1,5). | P |
| `incendiary` | Traçante laranja-vivo com 3 brasas que caem; no acerto, chama pequena no alvo (P7 mini, sem fumaça) e o status Em Chamas já mostra o resto. | P |
| `rubber` | Traçante curto; impacto sem sangue, um "quique" (P6 branco). | P |
| `smart` (RED, Inteligente) | Traçante que **curva** para o alvo (caminho em arco leve), P11 "LOCK" vermelho no alvo **no momento da resolução**. A segunda tentativa (`linha.segundaTentativa`): o traçante erra, faz uma curva e volta. | M |
| `emp`, `flashbang`, `smoke`, `teargas`, `poison`, `sleep`, `biotoxin`, `arachnid` (de arma) | O traçante normal e, no alvo, a explosão do tipo em tamanho pequeno (seção 6.3). | P (reusa a 6.3) |
| **Power** (`classe: 'power'`) | Traçante mais grosso e laranja; o ricochete (4.2). | P |
| **Tech** (`classe: 'tech'`) | Feixe **ciano contínuo** (não uma bala): uma linha de 3 px que acende de uma vez por 120 ms e apaga; **a carga** (`alternarCarga`, `combate.mjs:218`): a arma "enche" em volta do atirador (anel ciano que se fecha, P6 ao contrário, 400 ms) quando carrega, e o feixe sai mais grosso (6 px) com P6 no alvo. **Atravessa a cobertura:** onde o feixe cruza a parede ou o veículo, um ponto de calor ciano (P3 ciano + P16 incandescente 1 s), e o feixe continua do outro lado. | M |
| **Smart** (`classe: 'smart'`) | Bala que **curva** (caminho `weave`/`arc`: uma curva em S suave, 250 ms, mais lenta que as outras para ler a curva), P11 "LOCK" no alvo, rastro vermelho. Dois alvos: duas curvas. | M |

---

## 5. Impacto (o desfecho de cada alvo)

O diretor escolhe **um** desfecho por linha, nesta ordem de prioridade (o primeiro que vale):

| # | Desfecho | Condição (dos campos do resultado) | O que aparece | Duração | Sem módulo | Com JB2A | Custo |
|---|---|---|---|---|---|---|---|
| 1 | **Morte** | `dano.hpDepois <= 0` e o ator morto ou o Death Save falhou depois (o estado de morto) | P4 forte (ou estilizado), **P9 longo** (600 ms), o token perde a cor (filtro de dessaturação por 1,2 s, depois o token dinâmico assume a imagem de caído), P15 "FLATLINE" vermelho. Sem tremor. | 1,5 s | PIXI + filtro de cor do core | `MarkerSkull_01_Dark_Orange`? **Não** (de fantasia): fica no PIXI. | M |
| 2 | **Crítico / lesão crítica** | `dano.lesoes.length > 0` | O impacto de carne, mais **P9** (glitch 300 ms), **parada de impacto** (o traçante congela 60 ms antes de bater: o "hit-stop"), P11 "CRÍTICO" e o nome da lesão (o texto de hoje já diz "crítico!", `regras.mjs:890`), P12 de 6 px só para o dono do alvo. | 800 ms | PIXI | `UI/Critical_02_Red` (85 KB) só se o usuário gostar (é de D&D) | P |
| 3 | **Carne** | `dano.hpDepois < dano.hpAntes` | P4 (sangue, D2) saindo do lado oposto ao tiro, P3 pequeno se também ablou a armadura, P15 "−N HP". | 500 ms | PIXI | `LiquidSplash02_01_Regular_Red` (127 KB) | P |
| 4 | **Armadura segurou (ablação)** | `dano` com perda 0 e `ablado > 0` | **P3 forte** (faíscas amarelas que voltam para o atirador), um anel ciano que **racha** (P6 em pedaços: 6 arcos que se afastam), P15 ciano "A armadura segurou" + "SP −1" (o `ablado`). | 400 ms | PIXI | `Impact_08_Regular_Orange` (49 KB) | P |
| 5 | **Escudo** | `dano.escudo` | Um hexágono ciano (o escudo balístico) aparece entre o atirador e o alvo, recebe o impacto (P3) e trinca conforme `escudoAblado`; quebrado (`pvEscudo` 0): estilhaça (12 cacos). | 500 ms | PIXI | — | P |
| 6 | **Escudo humano** | `linha.cadaver` | O impacto vai no corpo à frente (P4 no "escudo"), e o alvo de verdade só pisca. | 500 ms | PIXI | | P |
| 7 | **Estase** | `dano.estase` | P6 ciano "gelado" + P3 branco. | 400 ms | PIXI | | P |
| 8 | **Cobertura / objeto** | o mestre aplica o dano à cobertura (o sistema não sabe da cobertura, `modos.mjs:51`) | P5 (lascas) + P16 buraco. Sem gatilho automático: um botão do mestre no cartão ("efeito na cobertura") ou o erro que bateu na parede (4.2). | 500 ms | PIXI | `SmokePuffSide01` | P |
| 9 | **Veículo e vidro** | `linha.veicular` (`tipo: 'veiculo'` ou `'vidro'`) | Veículo: P3 metálico grande (branco-azulado), P16 furo; SDP perdido no texto. Vidro: estilhaço (14 cacos azul-claros que caem), P16 rachadura. | 500 ms | PIXI | | P |

**O sangue (D2):**
- **Realista:** gotas vermelho-escuras e mancha de 4 s.
- **Estilizado** (o que recomendo como padrão para mesa mista): faíscas vermelhas neon `#ff2a4a` que saem e somem, sem
  poça. Lê como cyberpunk ("glitch de dano"), não choca.
- **Nenhum:** só P3 e P9.
- Os androides, drones e veículos nunca sangram (o tipo do ator, ou um "sangra" na ficha do capanga: decisão do
  rpg-mecanicas se vale um campo).

**A ordem dentro do impacto** (para o fx-coreografia): traçante chega → hit-stop (só crítico) → faíscas/sangue → texto
50 ms depois → glitch/tremor por último.

---

## 6. Granadas e explosivos

### 6.1. O arremesso e o lançamento

| Peça | O que aparece | Duração | Sem módulo | Com JB2A | Custo |
|---|---|---|---|---|---|
| **Arremesso à mão** | A granada (sprite de 0,25 casa, girando 540°/s) sobe em **arco** até o ponto e uma **sombra** no chão cresce embaixo dela (o efeito 2,5D: a sombra mostra onde cai). | 500–800 ms, pela distância (até 25 m, `ALCANCE_ARREMESSO`) | Caminho em arco próprio (curva de Hermite, como o `generateArcPoints` do core, `vfx/paths/vfx-arc-path.mjs`; `peakHeight` 0,3) | `ThrowBomb01_01_Regular_Black_30ft` (116 KB): é uma bomba de fantasia redonda; serve se tingida | M |
| **Lança-granadas** (`grenadeLauncher`) | Clarão de boca (P1 grande e curto), **"tunk"** (o anel P6 no cano), granada em arco **mais baixo e rápido** (`peakHeight` 0,12, 350–500 ms) com um rastro fino de fumaça. | 400–600 ms | PIXI | `LaunchCannonBall01_01_Regular_Black` (não é bom) | P (reusa) |
| **Foguete** (`rocketLauncher`) | Sopro de fumaça **para trás** do atirador (o backblast, P5 grande em cone), o foguete em **linha reta** com chama na cauda e **rastro de fumaça** que fica 1,5 s e se dispersa. | 300–500 ms o voo; rastro 1,5 s | `ParticleGenerator` com área `line` ao longo do caminho | `Missile02_01_Regular_White_30ft` (1,58 MB) ou `PackhoundMissile01_01_Regular_Blue_30ft` (526 KB, Smart) | M |
| **Marcador da área** | No instante em que cai, o quadrado de **10 × 10 m** (`AREA_EXPLOSIVO`, `regras.mjs:567`, `naArea` em `modos.mjs:708-713`) em linha HUD tracejada amarela, que pisca uma vez e some em 600 ms. Mostra quem estava na área. | 600 ms | `Graphics` na interface (com teste de visão) | — | P |

**O erro e o desvio (D6).** Hoje o sistema diz "errou. O mestre decide onde caiu" (`modos.mjs:730`) e não explode
nada. Visual proposto, por ordem de preferência:
1. **O mestre clica onde caiu** (um retículo no cartão: "Marcar onde caiu"): a granada voa até o ponto do alvo, **quica**
   duas vezes (arcos de 30% e 10% da altura) até o ponto clicado e explode ali. Se a área nova pega alguém, é o mestre
   que aplica (o efeito só mostra).
2. **O sistema sorteia** (direção e distância, por uma regra que o rpg-mecanicas confirme na wiki/CORE): o mesmo quique,
   automático.
3. **Sem desvio:** a granada passa do alvo, quica uma vez e "morre" (fumacinha, sem explosão). Só o visual de "errou".

### 6.2. A explosão (base, a granada de fragmentação)

- **Quadro 0 (0–40 ms):** clarão branco em toda a área (sprite radial a 90%), **P14** de raio 12 m por 400 ms.
- **40–600 ms:** **P7** (bola de fogo do tamanho da área, 10 m), **P6** (onda de choque até 1,3 × a área),
  **estilhaços**: 30 riscos escuros radiais muito rápidos (`ParticleGenerator`, velocidade 800–1.400 px/s, vida 200 ms).
- **600–2.000 ms:** fumaça escura sobe e se desfaz; brasas caem.
- **Tremor (P12):** 12–18 px, 500 ms; com D9, só para quem tem um token a até 20 m.
- **Paredes:** a bola e os estilhaços **param na parede** (o PIXI: máscara com o polígono de visão a partir do centro,
  `CONFIG.Canvas.polygonBackends.sight.create(centro, { type: 'move', radius })`; o Sequencer: `.constrainedByWalls()`,
  documentado). Explosão do outro lado da parede não "vaza".
- **Cada alvo na área:** o impacto da seção 5 a 50–150 ms depois do clarão (pela distância ao centro), quem esquivou:
  P10 (o eco pulando para fora).
- **Marca (D8):** queimado no chão (P16, `ScorchedEarth_01_Black` 1,28 MB, ou textura própria).
- **Peso:** ~90 partículas + 1 luz + 1 tremor. **Custo:** M.

### 6.3. A explosão por tipo

| Tipo (munição) | O que muda na base | Cor | Fica no mapa? | Sem módulo | Com JB2A grátis | Custo |
|---|---|---|---|---|---|---|
| **Fragmentação / básica** (`grenade` sem efeito) | A base (6.2). | Laranja e fumaça escura | Queimado (D8) | PIXI | `Explosion_01_Orange` (279 KB) ou `ShrapnelBomb01_01_Regular_Black` (347 KB) | M |
| **Incendiária** (`incendiary`) | Bola de fogo mais lenta e baixa, **chamas que ficam** na área (8–12 focos de `ParticleGenerator`, cada um com 8 partículas), brasas. O status Em Chamas (`municoes.mjs`, `STATUS_FOGO`) mostra o resto no token. | Laranja-vivo `#ff7a1a`, amarelo | Sim, enquanto o fogo durar (D7): Região com flag | PIXI | `Flames_01_Regular_Orange_200x200` (822 KB) por foco: **caro** (vários vídeos em laço) | M |
| **Fumaça** (`smoke`) | Sem fogo e sem tremor: um "puf" seco (P6 cinza), e a **nuvem persistente P8** se espalha em 1,5 s até cobrir 10 × 10 m. A regra (o −4, `regras.mjs:610`) continua com a mesa. Opcional (D7): a Região aplica o comportamento `adjustDarknessLevel` (escurece a área) para a visão do Foundry. | Cinza claro | Sim, 1 minuto de jogo (`game.time.worldTime`, como o `marca()` de `municoes.mjs`) | PIXI (P8) | `SmokePlumesLoop01_01_Regular_Grey` (380 KB) em laço, `.persist()` + `.tieToDocuments(região)` | M |
| **Flashbang** (`flashbang`) | Clarão branco **enorme** e curto, P6 branco; para os jogadores com token **dentro** da área e que falharam a resistência: **P13** (a tela branca 700 ms que volta devagar) e o canvas fica desfocado (`BlurFilter` em `canvas.stage` por 1,5 s). Reduzido/fotossensível: sem P13, só uma borda branca que acende em 400 ms e um zumbido visual (texto "ATORDOADO"). | Branco | Não | PIXI | `Explosion_02_Blue` tingido de branco | M (o P13 por jogador pede o resultado da resistência no roteiro) |
| **EMP** (`emp`) | Sem fogo: um anel ciano (P6) que se abre devagar, **arcos elétricos** curtos saltando pela área (linhas quebradas em zigue-zague, 6 a 10, 80 ms cada), e **P9 em cada token com cyberware desligado** (o resultado do `escolherEmp`). As luzes da cena piscam? Não (pesado e afeta todos). | Ciano `#02d7f2` e branco | Não | PIXI | `ElectricArc01_01_Regular_Blue` (335 KB), `StaticElectricity_01_Regular_Blue` (257 KB) no token | M |
| **Gás lacrimogêneo** (`teargas`) | Como a fumaça, amarelo-esverdeada, mais baixa e mais rala. | `#d9e27a` | Sim (D7) | PIXI (P8 tingido) | `SmokePlumesLoop` tingido | P (reusa) |
| **Veneno, sono, biotoxina** (`poison`, `sleep`, `biotoxin`) | Como o gás: verde (veneno/biotoxina), violeta pálido (sono). | `#7bd96a`, `#b9a7ff` | Sim (D7) | PIXI | idem | P |
| **Arachnid** (Black Chrome; `arachnid`) | "Puf" e uma **teia** (linhas brancas radiais e em anel, sprite gerado) que cai sobre cada alvo atingido e fica até ele se soltar (o estado da regra). | Branco-pérola | No token (enquanto o estado durar) | PIXI | `Web` (2nd_Level/Web, de fantasia) | M |
| **Shuriken Tornado** (Black Chrome, dano por alvo) | A base com estilhaços em **espiral** (velocidade polar com rotação). | Metal | Não | PIXI | | P |
| **Foguete** (`rocket`) | A base, maior (P12 18 px) e com o **backblast** (6.1). | | | | `Explosion_05_Regular_Orange` | P (reusa) |

---

## 7. Briga (corpo a corpo)

O gatilho é o mesmo: `modo: 'corpo'`, depois da defesa. O golpe é um **arco** (o "slash") ou um **soco** (o "punch")
desenhado **entre** os dois tokens, mais o impacto da seção 5. Uma regra visual: o atacante **avança** 15% da distância e
volta (o "lunge", 200 ms, só a imagem: `token.mesh` deslocado; nunca o documento).

| Golpe | Gatilho (tipo da arma ou item) | O que aparece | Duração | Cor | Sem módulo | Com JB2A grátis | Custo |
|---|---|---|---|---|---|---|---|
| **Soco / desarmado** | `unarmed`, `armaDesarmada` (`desarmado.mjs:32`) | Lunge + um "punho" de impacto: estrela curta (P1 branco, sem luz) no ponto de contato, 4 linhas de velocidade, P6 branco pequeno. | 300 ms | Branco `#e8e6d9` | PIXI | `UnarmedStrike_01_Regular_Blue_Physical01` (109 KB) tingido | P |
| **Chute / artes marciais** | `martialArts`, movimentos (`artes-marciais.mjs`, `regras.mjs:76-84`) | Arco largo (meia-lua) de 120° na frente do atacante, rastro amarelo. **Voadora** (`voadora`): o atacante "salta" (escala 1,15 e volta) e P10 no caminho; derruba: P5 no chão do alvo. **Quebra-ossos / ponto de pressão**: P9 curto no alvo + texto da lesão. **Contra-queda / desarme**: o objeto (ícone da arma) voa do alvo para o chão ou para o atacante. | 300–500 ms | Amarelo `#fcee09` | PIXI | `FlurryOfBlows_01_Regular_Blue_Physical01` (142 KB) | M (há muitos movimentos) |
| **Lâmina** (`lightMelee`, `medMelee`, `heavyMelee`, `vHeavyMelee` com lâmina; katana, faca, machete) | Arco fino e rápido (um corte), **rastro branco com borda ciano** que some, P3 pequeno na armadura ou P4 na carne. Pesada: arco mais largo, mais lento, P12 4 px. | 200–350 ms | Branco + ciano | PIXI (arco = `Graphics.arc` com espessura que afina) | `MeleeAttack04_Katana01_01` (73 KB), `GenericSlash01_01_Regular_Orange` (58 KB), `Dagger02_01` (708 KB) | P |
| **Contundente** (taco, bastão, martelo) | Arco grosso, P6 branco no impacto, P12 4 px. | 300 ms | Branco | PIXI | `Club01_01_Regular_White`, `MeleeAttack02_Wrench01` | P |
| **Monowire** (cyberware, `armas-cyberware.mjs`) | Uma linha **finíssima e brilhante** que chicoteia (curva que se estica do atacante ao alvo e volta), 1 px, com o brilho só na ponta; o corte: uma linha reta vermelha que atravessa o token por 150 ms. | 300 ms | Ciano-branco, corte `#ff2a4a` | PIXI | `TrailAttack01_01_01_Regular_BlueYellow` (perto) | P |
| **Mantis Blades** | **Dois** arcos cruzados (X), muito rápidos, ciano/verde, e o lunge mais longo (30%: o pulo do 2077). | 350 ms | Verde-ciano `#3dffb0` | PIXI | Katana × 2 | P |
| **Gorilla Arms** | Lunge curto e **onda de choque grande** (P6 duplo), P12 10 px, poeira no chão (P5), o alvo é empurrado 0,2 casa e volta (só a imagem). | 400 ms | Laranja `#ff9a3c` | PIXI | `GroundCrackImpact_01_Regular_Orange` (rachadura no chão) | P |
| **Wolvers / Rippers / Big Knucks** | Como lâmina (3 riscos paralelos) ou como Gorilla, pela categoria. | | | PIXI | | P |
| **Agarrão** (`agarrar`, `agarrao.mjs:77`) | Os dois tokens se aproximam 10% e ficam **ligados** por um anel duplo amarelo que pulsa devagar enquanto o estado durar (o desenho no token, como o `netrun/token.mjs` faz o anel). **Estrangulamento**: o anel aperta e o alvo pisca vermelho a cada turno. | Enquanto durar | Amarelo | PIXI (anel que acompanha os dois tokens; desenhado de novo no `refreshToken`) | `MarkerChainStandard01_01_Regular_Red_Loop` (corrente: de fantasia) | M |
| **Arremessar alguém** (`objetivo` do agarrão; derruba) | O alvo **voa** em arco curto (a imagem, não o documento) até onde cai, P5 no chão, P12 6 px, o status Caído. O documento é movido pelo próprio fluxo (se mover); senão a imagem volta. | 500 ms | | PIXI | | M |
| **Escapar / soltar** | O anel do agarrão estoura (P6). | 200 ms | | PIXI | | P |
| **Bloquear / aparar** (defesa corpo a corpo que segurou; escudo) | O golpe para **antes** do alvo: P3 entre os dois (aço com aço), P6 branco pequeno. | 250 ms | Branco | PIXI | `Impact_08` | P |
| **Escudo humano** (`usarEscudoHumano`) | O corpo agarrado é puxado para a frente (offset 0,3 casa na direção do atirador) enquanto durar. | Enquanto durar | | PIXI | | P |

---

## 8. Os outros

| Efeito | Gatilho | O que aparece | Duração | Sem módulo | Com módulo | Custo |
|---|---|---|---|---|---|---|
| **Recarga** | `recarregar` (`documentos.mjs:1190`) | No token do dono: um anel de **progresso** amarelo que se completa em 600 ms + o pente caindo (sprite pequeno que cai e some). Para todos (é visível na mesa). | 600 ms | PIXI | — | P |
| **Arma vazia / clique** | O aviso "pente vazio" (`combate.mjs:137`) | Só para quem tentou: P11 "VAZIO" vermelho no token, sem clarão. (O som do "clic" é do fx-audio.) | 500 ms | PIXI (local) | — | P |
| **Arma quebrada / falha** (o C73, `marcarPelaFalha`) | `ctx.falhaDaArma` | Clarão sem traçante, P5 (fumaça) saindo da arma, P11 "FALHOU". | 600 ms | PIXI | — | P |
| **Death Save** | `rolarDeathSave` | Para todos: no token, um **eletrocardiograma** (linha verde que corre sobre o token, 1 s). Passou: o pico volta, verde. Falhou: a linha fica reta e vermelha + o efeito de morte (seção 5). Para o dono: P13 de vinheta vermelha nas bordas (no reduzido: só a borda fixa). | 1–1,5 s | PIXI (`Graphics` animado) | `UI/HeartbeatECG01_01_Regular_Green_400x400` (52 KB): ótimo e leve | P |
| **Estabilizar / cura / Speedheal** | `estabilizar` (`estabilizar.mjs:43`), cura, droga | Cruz médica? Não (genérico). Proposta: **partículas verdes subindo** (8, lentas) + linha de ECG estabilizando + P15 "+N HP". Droga: anel da cor da droga. | 800 ms | PIXI | `HeartbeatECG01_02` | P |
| **Cyberware ativado: Sandevistan** (o efeito do item liga: `updateActiveEffect`/a ativação do speedware) | P10 **forte e longo**: 4 ecos ciano/magenta que ficam para trás **a cada movimento** do token enquanto dura (3 rodadas), e um filtro leve de cor no token (tom azulado). Ao ativar: o mundo "para" por 300 ms para quem é dono (canvas dessatura e volta; no reduzido, não). | Ativar 600 ms; o rastro enquanto dura | PIXI (o eco no `refreshToken` de movimento, limitado a 1 eco por 80 ms) | — | M |
| **Kerenzikov** | Na esquiva com Kerenzikov: P10 curto (2 ecos) + um "tique" amarelo. | 300 ms | PIXI | — | P |
| **Berserk** | Ao ativar: o token **pulsa vermelho** (contorno, `OutlineOverlayFilter` do core, `rendering/filters/outline-overlay.mjs`, que já respeita o fotossensível em :167) enquanto dura; cada golpe corpo a corpo com P12 de 4 px. | Enquanto durar | PIXI + filtro do core | — | M |
| **Sandevistan do David (Mission Kit, ciberpsicose)** | O Sandevistan com **glitch** periódico no token (P9 a cada 5 s) e cor vermelha em vez de ciano. | Enquanto durar | PIXI | — | P (reusa) |
| **NET: conectar ao ponto** (o `netrun/`) | Um **feixe** de dados do token ao ponto de acesso: linha ciano pontilhada que **corre** (os pontos andam), 1,2 s; depois um anel fino que pulsa no token enquanto conectado (o `netrun/token.mjs` já desenha o anel). | 1,2 s + enquanto conectado | PIXI (o `efeitoSimples` do Foundry 12 já faz quase isso, mas no primary) | `EnergyBeam_02_Regular_BluePink_30ft` (1 MB) e `EnergyStrandsOverlay_01_Regular_Blue` (o que o NET Architect usa; existem no grátis) | P |
| **NET: quickhack no token** (programa contra o token do mundo real, se houver) | Códigos subindo (texto `0x`, glifos, 6 linhas verdes) em volta do token + P9 curto quando pega. | 600 ms | PIXI (`PreciseText` pequeno) | `Marker/SciFi/MarkerScifiComplete001_001_GreenYellow` (1 MB) | P |
| **NET: Black ICE ataca o netrunner** | No token do netrunner (o corpo, no mundo real): P9 vermelho + faíscas vermelhas (P3) saindo da cabeça (o neuroport) + P15 do dano. | 600 ms | PIXI | `LightningBall_01_Regular_Blue` (o que o NET Architect usa) | P |
| **NET: flatline** | O efeito de morte (seção 5) com **glitch longo** e P15 "FLATLINE". | 1,5 s | PIXI | | P (reusa) |
| **Veículo: batida** | Quando o mestre aplica dano de colisão (sem gatilho hoje: botão no cartão ou macro) | P3 metálico grande + P5 + P12 10 px + vidros (estilhaço) | 600 ms | PIXI | `GroundCrackImpact` | P |
| **Veículo: tiro no veículo** | `linha.veicular` | A seção 5, desfecho 9. | | | | P |
| **Veículo: destruído** | SDP chega a 0 | A explosão base (6.2) do tamanho do veículo, fumaça persistente preta sobre ele (D7). | 1,5 s + fumaça | PIXI | `Explosion_01` | P (reusa) |
| **Tremor de tela** | Explosão, foguete, Gorilla Arms, crítico (só o dono), batida | P12, pela intensidade; D9; nunca no reduzido/fotossensível. | 150–600 ms | `CanvasShakeEffect` (o core já para no fotossensível, `animation/shake.mjs:348`) | Sequencer `canvasPan().shake()` | P |

---

## 9. Desempenho

### 9.1. O que custa no cliente (do mais caro ao mais barato)

1. **Vídeos (`.webm`) tocando ao mesmo tempo.** Cada efeito do JB2A é um `HTMLVideoElement` decodificando. No celular,
   o decodificador de hardware aguenta poucos de uma vez; acima disso, o vídeo trava ou cai para software. Uma rajada de
   10 com 10 `Bullet_02` (664 KB cada) é o pior caso. **Regra:** no máximo 4 vídeos ao mesmo tempo; o resto, PIXI.
2. **Filtros** (cada filtro é mais um passe de render do objeto). O glitch em 8 tokens ao mesmo tempo (um supressivo
   com todos críticos) são 8 passes. **Regra:** filtro só no crítico e na morte, no máximo 3 tokens com filtro ao mesmo
   tempo; o resto, só partículas.
3. **Atualização da percepção** (a luz temporária). **Regra:** uma luz por evento (a rajada inteira acende uma vez e
   pisca a intensidade sem atualizar a percepção de novo), nenhuma no LOW e no reduzido.
4. **Partículas.** Baratas com o pool do `ParticleGenerator`. **Regra:** 300 vivas no PC, 120 no celular/reduzido; o
   diretor corta pela metade quando passa (o roteiro leva o orçamento).
5. **Sprites e `Graphics`** (traçantes, anéis, texto): desprezíveis nas quantidades daqui.

### 9.2. Os casos limite

| Caso | Sem orçamento | Com o orçamento proposto (PC) | Celular / reduzido |
|---|---|---|---|
| **Rajada de 10, 1 alvo, multiplicador 3** | 10 clarões, 10 traçantes, 10 luzes, 3 impactos | 1 clarão piscando, 5 traçantes (máx. 6 vivos), 1 luz, 3 impactos (≈ 60 partículas), 1 texto. ≈ 1,0 s. | 1 clarão, 3 traçantes, sem luz, 1 impacto maior com "×3", 1 texto. |
| **Supressivo, 8 afetados** | 10 traçantes + 8 × (P5 + texto + filtro) | 10 traçantes em sequência (6 vivos), 8 × 12 partículas = 96, 8 textos escalonados 80 ms, 1 luz. ≈ 1,4 s. | 5 traçantes, 8 × 6 = 48, textos, sem luz. |
| **Granada em 6 alvos, todos feridos, 1 crítico** | 6 explosões, 6 filtros | 1 explosão (≈ 90 partículas), 6 impactos (6 × 12 = 72), 1 filtro (o crítico), 1 luz, 1 tremor. Total ≈ 160. | Explosão com 40, impactos de 6, sem filtro, sem tremor, sem luz. |
| **3 nuvens de fumaça na cena** | 3 × 80 partículas contínuas | 3 × 50 = 150 contínuas (pausa fora da tela: o `ParticleGenerator` tem a área de visão). | 3 × 20, ou a nuvem vira um sprite estático semitransparente. |
| **Dois ataques seguidos** | Sobreposição | A fila única do mestre (`naFila`, `combate/socket.mjs:93-98`) já serializa; o palco aceita o próximo roteiro e **encurta** o anterior (corta a fumaça residual). | Igual. |

### 9.3. A pré-carga

- **Palco PIXI:** as texturas próprias (≤ 200 KB) no `canvasReady`. Sem atraso no primeiro tiro.
- **Palco Sequencer:** só os arquivos das classes de arma que estão nas fichas dos tokens da cena, no `canvasReady` do
  combate (`Sequencer.Preloader.preloadForClients`, só no mestre, uma vez por cena). Nunca a biblioteca.
- **O primeiro tiro sem pré-carga** (o vídeo ainda baixando): o palco espera no máximo 300 ms; passou, desenha no PIXI.
  O efeito atrasado depois do texto é pior que o efeito simples na hora.

### 9.4. O servidor (1 GB de RAM, 49 GB de disco)

- O servidor só **serve arquivos**: não desenha nada. O custo é disco, banda e o backup.
- **JB2A grátis:** 1.576 MB só de `.webm` (2.130 arquivos, contados na árvore do repositório). Somado ao backup diário
  (3,1 GB no primeiro), se o backup levar a pasta de módulos. Cada jogador baixa só o que toca (o navegador guarda em
  cache). **O sistema sem JB2A não muda nada no servidor.**
- **Texturas próprias:** < 1 MB no pacote do sistema.

### 9.5. Como testar (para o G3 e o G4)

- **G3:** o diretor inteiro (classe × modo × desfecho → roteiro), o orçamento (rajada de 10 → 5 traçantes; reduzido → 3),
  o `para` (sem desfecho para quem não vê o cartão), a semente (o mesmo roteiro dá o mesmo espalhamento).
- **G4:** um tiro, uma rajada e uma granada numa cena: confere que o container do palco ganhou e **perdeu** os filhos
  (sem vazamento: o número de filhos volta a 0), que o `debugStats` do `ParticleGenerator` ficou no orçamento, que o
  texto não aparece para o jogador sem visão do token, e que o reduzido não chama o `CanvasShakeEffect`. O Edge sem
  janela atrasa animações (a lição do C52 no QUALITY_GATES): conferir por eventos (o fim do roteiro), não por relógio.

---

## 10. Os pacotes de fora (pesquisados em 2026-11-26)

| Pacote | Versão / Foundry 14 | O que serve para cyberpunk | Peso / custo | Recomendação |
|---|---|---|---|---|
| **Sequencer** | 4.3.1 (tag do GitHub e página do Foundry), verificado no 14 | O motor: `.stretchTo()`, `.missed()`, `.locally()`, `.forUsers()`, máscara de visão por padrão (`.xray()` desliga), `.constrainedByWalls()` (explosões e fumaça param na parede, com `level` no 14), `.persist()` + `.tieToDocuments()`, `canvasPan().shake()`, `Sequencer.Preloader`. | Grátis; leve. | **Opcional e suportado**, como hoje. Usar sempre com `.locally()` a partir do roteiro. |
| **JB2A grátis** (`JB2A_DnD5e`) | 0.9.4, verificado no 14 | Bala (3), Snipe, laser, míssil, explosão (5 + estilhaço + lateral), impacto (12), fumaça (puff, plumes em laço, linha), faísca elétrica e arco, ECG (2), splash vermelho, katana, slash, soco. ~30 arquivos de 2.130. | **1,5 GB**; licença CC BY-NC-SA 4.0 (uso não comercial: ok para a mesa). | **Decisão do usuário (D1).** Se instalar, o palco Sequencer usa a lista da seção 4–8. |
| **JB2A Patreon** | Mesma base, todas as cores | As mesmas animações em todas as cores (traçante vermelho, ciano; explosão azul para EMP) e mais variações. Não confirmei armas de fogo novas no Patreon (a página não lista). | Pago (os níveis não carregaram na página); não usar junto com o grátis. | Só se o usuário gostar do grátis e quiser as cores. |
| **Automated Animations** | 8.0.7, verificado no 14 | Liga animações a itens pelo nome. | Grátis; depende do Sequencer e do JB2A. | **Não recomendo**: dispara na rolagem (antes da defesa), duplicaria o gatilho do sistema e é feito para D&D. |
| **Token Magic FX** | 0.8.4, verificado no 14.363 | Filtros no token: glitch, eletricidade, onda de choque, distorção (bom para NET, EMP, Sandevistan). | Grátis; filtros custam passe de render. | Opcional para o mestre; o sistema não depende. |
| **FXMaster** | 8.4.2, Foundry 13–14 | Clima e filtros de cena inteira (chuva, neblina, relâmpago): ambiente de Night City, não ataque. | Grátis (+ Patreon). | Fora do escopo dos ataques; bom para o clima da cena. |
| **Eskie Effects (grátis)** | 1.12.0, Foundry 12–14.999 | "+100" efeitos para o Sequencer, retículos e sobreposições de tela; não confirmei armas de fogo. | Grátis. | Avaliar com o fx-assets. |
| **Kenney Particle Pack** | — | 80 texturas de partícula 512 × 512 (fumaça, faísca, clarão, luz), CC0. | Grátis, CC0: pode ir **dentro do sistema**. | **Recomendo** como fonte das texturas próprias do palco PIXI (o fx-assets confirma a lista). |
| **Deadlands Gun Enchantments** | — | Referência: som e animação por tipo de arma, com o Sequencer (é do SWADE). | — | Só referência de desenho. |

---

## 11. As decisões do usuário (com a minha recomendação)

| # | Decisão | Opções | Recomendo | Por quê |
|---|---|---|---|---|
| D1 | JB2A | (a) nenhum; (b) grátis; (c) Patreon | **(a) agora**, (b) depois se quiser | O palco PIXI faz tudo; o JB2A grátis tem pouco de cyberpunk e pesa 1,5 GB no servidor e no backup. |
| D2 | Sangue | realista, estilizado, nenhum; o mestre decide para a mesa ou cada um para si | **Estilizado** como padrão do mundo, e cada jogador pode **reduzir** (nunca aumentar) | Mesa mista; o estilizado combina com o neon. |
| D3 | O clarão ilumina a cena | sim (revela quem atira no escuro), não | **Sim**, menos no LOW e no reduzido | É a regra da ficção (o clarão denuncia), e a luz só aparece para quem tem visão da área. |
| D4 | A mira antes da defesa | sim (linha tracejada e retículo na rolagem), não | **Sim** | A defesa pode levar até `tempo + 15 s`; a mira dá retorno sem contar o resultado. |
| D5 | Cartão "só o mestre" | jogadores veem o tiro sem desfecho; não veem nada | **Tiro sem desfecho** | O tiro aconteceu e todos ouviram; o resultado é que é segredo. |
| D6 | Granada que erra | o mestre clica onde caiu; o sistema sorteia; só "passa e morre" | **O mestre clica** (com o sorteio como botão) | Hoje a regra do sistema é "o mestre decide" (`modos.mjs:730`); o sorteio precisa da regra conferida (rpg-mecanicas). |
| D7 | Fumaça, gás e fogo no mapa | ficam pelo tempo da regra (Região); só o "puf" | **Ficam** (Região com flag e o fim no relógio do mundo) | A fumaça é tática (o −4): o mapa precisa mostrar onde está. |
| D8 | Marcas que ficam | somem em 4 s; ficam até limpar (Tile/Desenho) | **Somem** | Marca persistente vira lixo no mapa e documento a mais. |
| D9 | Tremor | todos; só quem está perto; ninguém | **Só quem tem token a até 20 m**, nunca no reduzido | Tremor para quem está longe parece bug. |
| D10 | O padrão do aparelho | completo, reduzido, só o texto | **Completo no PC, reduzido no celular** (pelo `canvas.performance.mode` e pelo toque), sempre ajustável | Os celulares da mesa. |

---

## 12. As configurações propostas

| Chave | Escopo | Opções | Padrão |
|---|---|---|---|
| `animacoes` (existe) | mundo | texto e animação, só o texto, nada | texto e animação |
| `efeitosPalco` (nova) | mundo | o do sistema; o do Sequencer quando houver arquivo | o do sistema |
| `efeitosSangue` (nova) | mundo | realista, estilizado, nenhum | estilizado |
| `efeitosIntensidade` (nova) | **cliente** | automático, completo, reduzido, só o texto | automático (LOW/MED ou toque = reduzido; `photosensitiveMode` do core = reduzido sempre) |
| `efeitosSangueAqui` (nova) | cliente | o da mesa, estilizado, nenhum (só reduz) | o da mesa |
| `efeitosMarcas` (nova) | mundo | somem, ficam | somem |

**O modo reduzido** (o que muda): sem P12 (tremor), sem P13 (flash de tela; troca pela borda que acende devagar), sem
P14 (luz), P9 só na morte e com 150 ms, partículas pela metade, nenhum piscar acima de 3 vezes por segundo (o limite das
diretrizes de fotossensibilidade, WCAG 2.3.1), textos maiores e mais longos (2,5 s).

---

## 13. As fases (o que cada ciclo entrega)

| Fase | O que | Custo | Depende de |
|---|---|---|---|
| **0. Consertos** | Achado 1 (o texto testa a visão, como o C76); Achado 2 (a animação respeita o `para`); Achado 3 (a intensidade por aparelho + o fotossensível do core). | P | — |
| **1. O diretor e o palco PIXI do tiro** | `regras-efeitos-visuais.mjs` (G3), o tipo `efeito` no socket, o palco PIXI: P1, P2, P3, P4, P5, P15, P16; tiro único por classe; erro com a parede; esquiva com eco. | M | fase 0 |
| **2. Rajada, supressivo, cartucho** | O orçamento; o autofogo com o multiplicador; o leque do supressivo; o cone do cartucho; as munições (4.4). | M | 1 |
| **3. Explosivos** | Arremesso e lançamento em arco, foguete, a explosão base com paredes, os tipos (6.3), a fumaça e o fogo por Região (D7), o marcador da área, o desvio (D6, com o rpg-mecanicas). | G | 1 |
| **4. Briga** | O lunge, os arcos de lâmina e contundente, o soco, o cyberware de braço, o agarrão e o arremesso, o bloqueio. | M | 1 |
| **5. 2077, cyberware, NET, Death Save, veículos** | Tech, Smart, Power, Sandevistan/Kerenzikov/Berserk, os efeitos da NET no token, ECG, batida. | M | 1, 2 |
| **6. O palco Sequencer** | A troca de textura pela lista desta seção, com `.locally()`, a pré-carga da cena e a queda para o PIXI. | P–M | 1 a 5 (cada fase pode já deixar o mapa de arquivos) |
| **7. (futuro)** | Migrar o roteiro para o `foundry.canvas.vfx` quando o Foundry tirar o "experimental". | M | estabilidade do core |

**A divisão com a equipe:**
- **fx-coreografia:** a ordem e o tempo de cada passo do roteiro (a regra do tempo da seção 3, a mira antes da defesa,
  o encadeamento com a fila do mestre).
- **fx-audio:** cada passo do roteiro tem um gancho de som (`clarao`, `voo`, `impacto.carne`, `impacto.armadura`,
  `explosao.frag`...); o som posicional do core (`Sound#playAtPosition` com `walls`, como o componente
  `positionalSound` do VFX, `vfx/components/vfx-positional-sound-component.mjs:78-82`) casa com o ponto do roteiro.
- **fx-assets:** as texturas próprias (estrela do clarão, gradiente do traçante, gota, lasca, granada, foguete, teia) e
  a lista final do JB2A, se D1 for sim.

---

## 14. Os riscos

| # | Risco | Chance | Efeito | Como evitar |
|---|---|---|---|---|
| R1 | O efeito revela o que o jogador não devia ver (token no escuro, cartão secreto). | Alta, se não cuidar (já acontece com o texto, Achado 1) | Quebra o segredo da mesa. | Tudo no `primary`; texto com `testVisibility`; o `para` no roteiro; teste no G4 com um jogador sem visão. |
| R2 | A rajada ou o supressivo travam o celular. | Média | A mesa espera. | O orçamento no roteiro; o automático no celular; contar no G4. |
| R3 | Vazamento de objetos PIXI (container que não é destruído), a cena fica pesada com o tempo. | Média | Queda de FPS na sessão longa. | Um container por roteiro, `destroy({ children: true })` no fim e no `canvasTearDown`; o G4 confere o número de filhos. |
| R4 | O framework VFX do core muda numa versão 14.x. | — (não usamos) | — | Só na fase 7, com o G4 cobrindo. |
| R5 | O JB2A muda o nome de um arquivo. | Baixa | O efeito some. | O `primeiroQueExiste` (`efeitos.mjs:20-26`) já cai para o seguinte; aqui, cai para o PIXI. |
| R6 | O ricochete e o "atravessa a cobertura" pedem pontos que o sistema não tem (a superfície do rebote, a parede atravessada). | Alta | O efeito fica genérico. | Usar a primeira parede do `testCollision` e, sem parede, o ponto médio; o rpg-mecanicas diz se vale o mestre marcar. |
| R7 | A luz temporária causa um "piscar" da visão (a percepção recalculada) em PC fraco. | Média | Engasgo de 1 quadro. | Uma por evento, desligada no LOW. |
| R8 | Sangue realista incomoda alguém da mesa. | Média | Desconforto. | D2: estilizado por padrão; cada um pode reduzir. |
| R9 | Fotossensibilidade (flashbang, EMP, crítico piscando). | Baixa, grave | Crise em quem tem. | O reduzido automático com o `photosensitiveMode` do core; nada pisca mais de 3 vezes por segundo em nenhum modo. |
| R10 | A fumaça persistente (Região) fica órfã depois do minuto. | Média | Nuvem eterna. | O fim no relógio do mundo, como o `marca()` de `municoes.mjs`; o mestre limpa no cartão ("Encerrar efeitos" já existe para os estados). |
| R11 | O efeito de "lunge" ou "arremessar" mexer no documento do token. | Baixa | Briga com o movimento e com o token dinâmico (C45/C52). | Só a imagem (`token.mesh`), nunca `update`; testar junto do andar do token dinâmico, que é das instáveis conhecidas. |
| R12 | O G4 no Edge sem janela atrasa as animações. | Alta | Teste instável. | Conferir por evento (o fim do roteiro), nunca por tempo (a lição do C52). |

---

## 15. Fontes

**Código (conferido):**
- O sistema: `foundry-sistema/scripts/efeitos.mjs`, `combate/cartao.mjs:78-89`, `combate/socket.mjs:93-98` e `:122-123`,
  `combate/modos.mjs:613-781`, `regras.mjs:564-613`, `:887-895`, `:1020-1053`, `documentos.mjs:620-649`,
  `configuracoes.mjs:71-74`, `netrun/ponto-de-acesso.mjs:73`, `token-dinamico.mjs:56`, `regras-token-dinamico.mjs:116-117`,
  `ROADMAP.md` (C45, C52, C76).
- O Foundry 14.369: `client/canvas/vfx/` (`vfx-effect.mjs:169`, `_module.mjs:25`, `components/`, `paths/vfx-arc-path.mjs`),
  `client/config.mjs:1357-1366`, `client/canvas/animation/particle-generator.mjs`, `animation/shake.mjs:348`,
  `groups/interface.mjs:174-175`, `rendering/filters/transition.mjs:26-38`, `rendering/filters/outline-overlay.mjs:167`,
  `sources/base-effect-source.mjs:336-352`, `board.mjs:690-692` e `:962-980`, `placeables/template.mjs:13-19`,
  `client/data/region-behaviors/`, `public/ui/particles/`, `node_modules/pixi.js/package.json` (7.4.3).
- A árvore do JB2A grátis pela API do GitHub (2.130 `.webm`, 1.576 MB; os tamanhos citados saem dela).

**Web:**
- [Sequencer no Foundry](https://foundryvtt.com/packages/sequencer) (4.3.1, verificado no 14)
- [Sequencer no GitHub](https://github.com/fantasycalendar/FoundryVTT-Sequencer) e a documentação
  [`docs/api/effect.md`](https://github.com/fantasycalendar/FoundryVTT-Sequencer/blob/master/docs/api/effect.md)
  (`xray`, `missed`, `locally`, `forUsers`, `aboveLighting`, `constrainedByWalls`, `tieToDocuments`),
  [`docs/api/canvas-pan.md`](https://github.com/fantasycalendar/FoundryVTT-Sequencer/blob/master/docs/api/canvas-pan.md)
  (`shake`) e [`docs/preloader.md`](https://github.com/fantasycalendar/FoundryVTT-Sequencer/blob/master/docs/preloader.md)
- [JB2A grátis no Foundry](https://foundryvtt.com/packages/JB2A_DnD5e) (0.9.4, verificado no 14, mais de 1,5 GB) e
  [no GitHub](https://github.com/Jules-Bens-Aa/JB2A_DnD5e) (CC BY-NC-SA 4.0)
- [JB2A no Patreon](https://www.patreon.com/JB2A)
- [Automated Animations](https://foundryvtt.com/packages/autoanimations) (8.0.7, verificado no 14)
- [Token Magic FX](https://foundryvtt.com/packages/tokenmagic) (0.8.4, verificado no 14.363)
- [FXMaster](https://foundryvtt.com/packages/fxmaster) (8.4.2, Foundry 13–14)
- [Eskie Effects grátis](https://foundryvtt.com/packages/eskie-effects-free) (1.12.0, Foundry 12–14.999)
- [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) (CC0, 80 arquivos)
- [Deadlands Gun Enchantments](https://foundryvtt.com/packages/deadlands-gun-enchantments) (referência de desenho por tipo de arma)
