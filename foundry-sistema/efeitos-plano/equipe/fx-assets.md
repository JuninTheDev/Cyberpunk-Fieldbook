# Efeitos da mesa: os arquivos, as licenças e o orçamento (fx-assets)

Especialista: **fx-assets**. Lido no origin/master 725911b6 (`foundry-sistema/scripts/efeitos.mjs`, `dice-so-nice.mjs`,
`configuracoes.mjs`, `instalar.mjs`, `system.json`, `servidor/backup.sh`, `backup-completo.sh`, `atualizar-sistema.sh`,
`servicos.sh`, `instalar.sh`, `servidor/README.md`) e no Foundry 14.369 local (`FieldbookTeste/foundry14-app`).
Pesquisa feita em 2026-11-26. Nenhum arquivo do repositório foi alterado.

## 1. O que já existe e o que o Foundry 14 oferece

### 1.1 O sistema hoje

- `efeitos.mjs`:
  - o texto flutuante sobre o token, desenhado pelo próprio Foundry (`canvas.interface.createScrollingText`), sem
    arquivo nenhum;
  - com o Sequencer e o JB2A grátis, **três arquivos** do `JB2A_DnD5e`: o `Impact_07_Regular_Orange_400x400.webm`
    (208 KB) no acerto e o `Miss_02_White_200x200.webm` no erro e na defesa. A animação sai só do cliente do mestre;
    o Sequencer a mostra para todos;
  - o som de acerto do Diwako (`diwako-cpred-additions`).
- A configuração **"Efeitos na mesa"** (`animacoes`): "Texto e animação", "Só o texto" ou "Nenhum".
- O Dice So Nice: só as cores de dados do CORE (`dice-so-nice.mjs`).
- **Três problemas pequenos** para o primeiro ciclo dos efeitos:
  1. `foundry.canvas.srcExists` está **obsoleto desde o 14 e sai no 16**. O próprio Foundry avisa: "Please use
     foundry.utils.srcExists" (`client/canvas/loader.mjs:800`). Troque pelo `foundry.utils.srcExists`.
  2. O Diwako **não roda no Foundry 14**. Ele é para o Foundry 10 a 12, verificado no 12, e depende do sistema
     `cyberpunk-red-core` ([página](https://foundryvtt.com/packages/diwako-cpred-additions)). No 14, o ramo do som
     nunca roda: hoje **não há som de tiro nenhum no v14**.
  3. O `instalar.mjs` copia **só uma lista fixa de pastas** (`scripts`, `templates`, `styles`, `fontes`, `lang`,
     `icones`, `dados`, `packs`). Uma pasta nova de arquivos (`efeitos/`) precisa entrar nessa lista. Sem isso, ela
     não chega ao servidor, e o erro não aparece.

### 1.2 O que o Foundry 14.369 já traz e dispensa arquivo

Conferido no app local:

- **PIXI 7.4.3**, com `@pixi/particle-emitter` (`PIXI.particles.Emitter`), `sprite-animated`, `spritesheet`,
  `graphics-smooth`, `mesh` e os filtros alpha, blur, color-matrix, displacement e noise.
  - O Foundry usa o emissor de partículas no clima (`client/canvas/containers/elements/particles/particle-effect.mjs`).
- **GSAP** (`public/scripts/greensock`), para as curvas de animação.
- Cerca de **59 classes de shader e filtro** em `client/canvas/rendering`. Dá para escrever um filtro GLSL próprio no
  mesmo molde, como o glitch.
- **Os formatos aceitos** (`common/constants.mjs`):
  - vídeo: `webm`, `mp4`, `m4v` e `ogv`;
  - áudio: `ogg`, `opus`, `mp3`, `m4a`, `aac`, `wav`, `flac` e `webm`.
- **O som:**
  - o `AudioHelper.preloadSound` guarda o som já decodificado no cache;
  - o `game.audio.preload(src)` também manda os outros clientes pré-carregarem, pelo socket `preloadAudio`.
- **Os navegadores mínimos** (`client/helpers/client-issues.mjs`): Chrome 146, Firefox 138 e **Safari 18.4**. Isso
  importa para o Ogg Opus (seção 4).
- **O cache:** o servidor do Foundry manda `Cache-Control: no-cache` em todo GET (`dist/server/express.mjs`):
  - o navegador guarda o arquivo, mas confirma a cada pedido (ETag, resposta 304, sem baixar de novo);
  - a compressão do Foundry começa em 10 KB e não muda vídeo nem áudio, que já vêm comprimidos;
  - no Caddy, a `mesa.` é só `reverse_proxy`, sem `encode`. Para estes arquivos, isso não faz diferença.

## 2. As bibliotecas

A coluna "Foundry 14" vem da página de cada pacote em foundryvtt.com, lida em 2026-11-26.

| Pacote | O que cobre para o Cyberpunk | Foundry 14 | Licença | Tamanho | Preço |
|---|---|---|---|---|---|
| **Sequencer** 4.3.1 | O motor que toca os `.webm`, as sprite sheets (`.json`) e os sons, para todos, no lugar certo. Desde a 4.3, tem o `.motion()` para mover o token só na tela. | **Sim**, 13 a 14, verificado no 14 ([página](https://foundryvtt.com/packages/sequencer); [versões](https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases): a 4.2.0 é a grande versão para o v14) | O GitHub não reconhece a licença ("Other"). Não importa: só se usa, não se copia. | ~2 MB | Grátis |
| **JB2A grátis** (`JB2A_DnD5e`) 0.9.4 | Tem a pasta `Weapon_Attacks/Ranged` com `Bullet_01/02/03` (laranja, azul), `LaserShot_01` (azul, verde, laranja, vermelho), flechas e virotes. `Muzzle_Flash` só tem uma cor (amarelo, 2 arquivos). `Explosion` tem 5 explosões, `ShrapnelBomb` e `SideExplosion`. `Impact` tem 29, `Smoke` tem 29 (fumaça e vapor). `Liquid` tem respingo vermelho (`LiquidSplash02_Red`, serve de sangue). Também há `Unarmed_Attacks` (soco), `Lightning`, `Screen_Overlay` e `Marker`. Quase tudo é numa cor só. Não tem glitch nem holograma. | **Sim**, 10 em diante, verificado no 14 ([página](https://foundryvtt.com/packages/JB2A_DnD5e)) | **CC BY-NC-SA 4.0** ([repositório](https://github.com/Jules-Bens-Aa/JB2A_DnD5e)). A JB2A pede que o conteúdo só se distribua pelo GitHub e pelo Patreon ([wiki](https://jules-bens-aa.github.io/jb2a-wiki/getting-started/our-patreon/)). | **~1,8 GB** (o repositório tem 1.808.944 KB; a página diz "over 1.5 GB"). Cada arquivo tem de 0,03 a 1,1 MB: a bala de 30 ft tem 125 a 680 KB, a explosão 285 a 620 KB. | Grátis |
| **JB2A Patreon** (`jb2a_patreon`) | Todas as cores e variações dos mesmos efeitos, e mais efeitos. Instala por um manifesto privado do Patreon. | Sem página pública. Segue o grátis, que está verificado no 14. | A do Patreon: não se redistribui. | **"Mais de 9 GB"** ([wiki](https://jules-bens-aa.github.io/jb2a-wiki/getting-started/our-patreon/)) | Assinatura mensal. **Não consegui ler os preços** (a página do Patreon não abriu): confira antes de assinar. |
| **Make it Shiny: Cyberpunk Animated Assets** 1.3.0 | O mais perto do 2077: efeitos de quickhack e, desde a 1.3.0, armas de fogo, lança-chamas, granadas, armas tech (micro-ondas, railgun, laser), lança-foguetes, monofio e chicote, e espada de energia. Também tokens de robôs e veículos. | **Não confirmado**: 11 em diante, verificado no 13, sem atualização há 1 ano e 4 meses ([página](https://foundryvtt.com/packages/make-it-shiny-cyberpunk-animated-assets)) | Pago, pelo Patreon do autor. Não se redistribui. | Não informado | Patreon (preço não informado) |
| **Eskie Effects (grátis)** 1.12.0 | Mais de 100 efeitos, miras, máscaras e sobreposições de tela. É mais de magia e de cinema; a página não fala de armas de fogo. | **Sim**, 12 a 14.999, verificado no 14.359 ([página](https://foundryvtt.com/packages/eskie-effects-free)) | Não informada na página | Não informado | Grátis; as variações vêm pelo Patreon |
| **Jinker's Animated Art** 0.94 | Arte animada para mapas vistos de cima (`.webm` transparente): cenário, não combate | **Sim**, até o 14, verificado no 14 ([página](https://foundryvtt.com/packages/jaamod)) | Não informada | Não informado | Grátis |
| **NRSAP** (Nachtrose Sci-Fi) | Ficção científica simples | **Não**: verificado no 11, sem atualização há 3 anos ([página](https://foundryvtt.com/packages/nrsap)) | Não informada | Não informado | Grátis |
| **Automated Animations** 8.0.7 | Toca o JB2A sozinho pelo nome do item. **O Cyberpunk RED não está entre os 22 sistemas que ele conhece.** | **Sim**, até o 14, verificado no 14 ([página](https://foundryvtt.com/packages/autoanimations)) | Não informada na página | Pequeno | Grátis |
| **FXMaster** 8.4.2 | Clima e partículas da cena (chuva, neblina, nuvens, raios) e filtros de cor. Serve para o clima de Night City, não para o tiro. | **Sim**, 13 a 14 ([página](https://foundryvtt.com/packages/fxmaster)) | Não reconhecida pelo GitHub | Pequeno | Grátis, com o FXMaster+ no Patreon |
| **Token Magic FX** 0.8.4 | Filtros no token: shockwave, distorção, glow, bulge, zap, filme antigo, blur e outros. A página não cita glitch. | **Sim**, 14, verificado no 14.363 ([página](https://foundryvtt.com/packages/tokenmagic)) | GPL-3.0 | Pequeno | Grátis |
| **FX Bus** 0.8.0 | Tremor, pulso e giro da tela, oscilação de token e tile, laço entre tokens e preto e branco. Sem arquivo e sem mudar dado do mundo. | **Sim**, 13 em diante, verificado no 14 ([página](https://foundryvtt.com/packages/fxbus)) | Não informada | Pequeno | Grátis |
| **Dice So Nice** 6.4.5 | Os dados 3D. Já está integrado. Pode ganhar efeitos especiais (partícula e som) no crítico do d10. | **Sim**, 14 em diante, verificado no 14.370 ([página](https://foundryvtt.com/packages/dice-so-nice)) | AGPL | ~10 MB | Grátis |
| **PSFX** (Peri's Sound Effects) 0.19.0 | Sons de ataques de armas e magias, em `.ogg`, alguns sincronizados com o JB2A | **Sim**, 11 em diante, verificado no 14 ([página](https://foundryvtt.com/packages/psfx)) | Licença própria em PDF ([repositório](https://github.com/JimHPerry/psfx)). **Não se copia para o nosso git.** | ~36 MB | Grátis |
| **Diwako CPRED additions** 0.10.1 | O som de acerto e a animação de acerto e erro | **Não**: só do 10 ao 12 ([página](https://foundryvtt.com/packages/diwako-cpred-additions)) | Não informada | Não informado | Grátis |

**A leitura:**

- Só o **Sequencer** e o **JB2A** estão verificados no 14 e cobrem o tiro, o laser, a explosão e o impacto.
- Nenhum pacote verificado no 14 tem o visual 2077: neon, glitch, interface de quickhack. O único que tem (Make it
  Shiny) está parado no 13 e é pago.
- **O JB2A no Safari aparece com um quadrado preto** (seção 4). Isso vale para o iPhone e o iPad inteiros, em todos os
  navegadores, e para o Mac no Safari.

## 3. Os sons: de onde vêm e se podem ir para o git público

| Fonte | Licença | No git público? | Observação |
|---|---|---|---|
| **Kenney** ([Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds), Impact Sounds, Interface Sounds, UI Audio, Digital Audio) | **CC0** (a página diz "Creative Commons CC0") | **Sim** | Não tem tiro realista. Tem os bipes, a interface, o laser, os impactos e o "digital" para a NET e para o glitch. O crédito não é obrigatório, mas vai no CREDITOS. |
| **The Free Firearm Sound Library** ([OpenGameArt](https://opengameart.org/content/the-free-firearm-sound-library)) | **CC0** | **Sim** | Rifle, espingarda, pistola e revólver. Os arquivos brutos ficam no site dos autores, e o link pode ter mudado. |
| **Gunshots** de kurt ([OpenGameArt](https://opengameart.org/content/gunshots)) | CC0 | Sim | Quatro arquivos, com eco e vários tiros em cada. Precisa cortar. |
| **Freesound** (filtro CC0 ou CC-BY) | Por arquivo: CC0, CC-BY ou CC-BY-NC | **CC0 e CC-BY sim**, com o crédito de cada arquivo no CREDITOS. **CC-BY-NC e CC-BY-SA, não.** | Cada arquivo tem a licença dele. Anote o autor e o link na hora de baixar. |
| Michel Baradari (OpenGameArt), "chaingun, pistol, rifle, shotgun shots" | CC-BY 3.0 | Sim, com crédito | Citado na busca; confira a página antes de usar. |
| Q009's weapon sounds (OpenGameArt) | CC-BY-SA 3.0 | **Evite** | O "SA" obriga as versões editadas a sair com a mesma licença. |
| **Sonniss GDC Bundle** | Licença 2.0 de 27/08/2026 ([texto](https://sonniss.com/gdc-bundle-license/)). Pode usar em projetos ilimitados, sem crédito. **É proibido distribuir, publicar ou fornecer os arquivos "como efeitos sonoros", editados ou não.** Também é proibido treinar IA com eles. | **Não** | Pode ficar no servidor, fora do git (seção 5). É área cinzenta: o navegador do jogador baixa o arquivo, como num jogo publicado, que a licença permite. |
| **Pixabay** ([resumo da licença](https://pixabay.com/service/license-summary/)) | Grátis, sem crédito. **Proibido distribuir "standalone"**, sem esforço criativo. | **Não** | Só no servidor, ou mixado num som nosso. |
| **Tabletop Audio** ([sobre](https://tabletopaudio.com/about.html)) | As faixas são **CC BY-NC-ND 4.0**. Os sons do SoundPad são só para uso no site. | **Não** | É ambiente de 10 minutos, não efeito de tiro. Pode servir como música da cena pela playlist do Foundry. |
| **Michael Ghelfi** ([módulo grátis](https://foundryvtt.com/packages/michaelghelfi), [MGS Toolbox](https://foundryvtt.com/packages/mgs-toolbox)) | O módulo grátis tem ambiente e música. Os 3.000 efeitos (armas, magia, criaturas) vêm por streaming no MGS Toolbox e **precisam do Patreon**. | **Não** | Só como camada opcional: o mestre toca pelo Toolbox. O sistema não chama os efeitos deles. |
| **Syrinscape** | Assinatura | **Não** | O SyrinControl antigo foi abandonado. A ponte para o v14 é de terceiros ([post do nitromoon](https://www.patreon.com/cw/nitromoon)). Não recomendo. |
| **PSFX** | Licença própria | **Não** | Pode ser um módulo opcional ao lado (seção 6). |
| **Feitos por nós** (jsfxr, ChipTone, Audacity) | Nossa | **Sim** | Seção 7. |

**A regra para o git público:** entra só o que é **CC0**, **CC-BY** (com o crédito no `CREDITOS`) ou **nosso**. Não entram
CC-BY-SA, NC, ND, Sonniss, Pixabay, Patreon nem PSFX.

**Para conferir:** o papel desta equipe diz que o repositório é público. Uma nota antiga da memória do projeto
(2026-10) dizia "privado". O plano supõe **público**, o caso mais restritivo. Se for privado, a regra continua: o push
instala no servidor, e uma licença como a da Sonniss não pode depender de o repositório continuar fechado.

## 4. Os formatos e onde tocam

| Formato | Chrome e Edge (PC) | Firefox (PC) | Chrome Android | **Safari: Mac, e todo navegador no iPhone e no iPad** | Tamanho típico |
|---|---|---|---|---|---|
| `.webm` VP9 com alfa (o JB2A) | Sim | Sim | Teve um erro no alfa, corrigido no Canary em 2024 ([Jake Archibald](https://jakearchibald.com/2024/video-with-transparency/)). Hoje deve tocar: **teste num celular**. | **Não: toca com fundo preto.** O alfa no WebM está "chegando, mas vai demorar" (atualizado em 08/2026, [rotato](https://rotato.app/blog/transparent-videos-for-the-web)). | 0,1 a 1 MB por efeito de 400 px |
| `.mov` HEVC com alfa | Não | Não | Não | Sim | Cerca de 3× o VP9 (3,4 MB contra 1,1 MB no teste do Jake) |
| **Sprite sheet `.webp`** com alfa + `.json` (PIXI `Spritesheet` e `AnimatedSprite`, ou o Sequencer desde a 3.4) | Sim | Sim | Sim | **Sim** | 60 a 250 KB por folha de 1024×1024 com 12 a 16 quadros, em WebP com perda (qualidade 80) |
| PNG ou WebP solto (textura de partícula) | Sim | Sim | Sim | Sim | 2 a 20 KB cada |
| **Ogg Opus** (som) | Sim | Sim | Sim | No Safari 18.4 em diante, o mínimo do Foundry 14 ([MDN/caniuse](https://caniuse.com/vorbis)). Há relatos de falha com alguns Opus de 48 kHz no 18.5 ([frequal](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html)). **Teste no iPhone.** | Mono, 64 a 96 kbps: **~8 a 12 KB por segundo** |
| `.m4a` AAC (som) | Sim | Sim | Sim | Sim | Cerca de 1,3× o Opus, com a mesma qualidade |

**As consequências:**

1. **Um núcleo feito só de `.webm` deixa o iPhone e o iPad com quadrados pretos.**
   - Não adianta o Sequencer gerar a sprite sheet do `.webm` na hora: o vídeo já chega sem o alfa no Safari.
   - O núcleo tem de ser **gerado no código** (PIXI) ou de **sprite sheets `.webp`**, que tocam em todo lugar.
   - O `.webm` do JB2A fica como camada opcional, **desligada no WebKit**. O teste é o user agent do WebKit, que pega
     o iPhone inteiro, já que o Chrome do iPhone também é WebKit.
2. **Som:** Opus em `.ogg`, mono, 48 kHz, 64 a 96 kbps.
   - Se o teste no iPhone falhar, uma escolha no código decide pelo `canPlayType('audio/ogg; codecs=opus')`: com
     "não", toca a cópia `.m4a`. Ela só se gera se o teste falhar.
   - Evite o MP3 no tiro: o atraso do começo (padding do codificador) desencontra o som do clarão.
3. **A memória da placa de vídeo:** uma folha de 2048×2048 ocupa 16 MB na GPU; uma de 1024×1024, 4 MB.
   - Use **1024×1024 no máximo**. No celular, é o limite que não engasga.
   - Deixe no máximo cerca de 6 folhas carregadas ao mesmo tempo (~24 MB) e solte as que a cena não usa.
4. **A memória do som:** um som decodificado ocupa ~384 KB por segundo, em estéreo de ponto flutuante a 48 kHz.
   - Quarenta sons de 1 s ocupam ~15 MB de RAM: pré-carregue só os cerca de 12 mais usados (pistola, rifle, impacto,
     soco, erro). O resto carrega no primeiro uso.

## 5. Onde cada arquivo fica

| Lugar | O que vai | No git? | Chega ao servidor | No backup diário? | Some quando |
|---|---|---|---|---|---|
| **`foundry-sistema/efeitos/`**, servido como `systems/cpr-fieldbook/efeitos/...` | O núcleo: as texturas de partícula, as sprite sheets próprias e os sons CC0, CC-BY e nossos, com o `CREDITOS` | **Sim** (público) | Pelo push no master (`atualizar-sistema.sh` → `instalar.mjs`) | Não precisa: o `instalar.mjs` apaga e recria a pasta do sistema a cada instalação, e o GitHub é a cópia | Nunca: o git guarda |
| **`Data/modules/<pacote>`** (JB2A, JB2A Patreon, Sequencer, PSFX, Make it Shiny) | Os módulos de terceiros, grátis ou pagos | Não | O mestre instala pelo Foundry (ou pelo manifesto do Patreon) | **Não.** O `backup.sh` deixa `modules/` de fora, menos a `modules/Mapas`. | Reinstala do Patreon ou do site. Com a assinatura cancelada, só a cópia baixada antes. |
| **`Data/efeitos-mesa/`**, uma pasta nova na raiz da Data do Foundry 14 | Os poucos sons e animações **pagos ou não redistribuíveis** escolhidos a dedo (Sonniss, Pixabay, Ghelfi baixado) | Não | O mestre envia pelo navegador de arquivos do Foundry | **Sim**: vai no `arquivos-<data>.tar` (tudo da raiz da Data menos `modules/`, `systems/` e `worlds/`). São **três pacotes guardados, sem compressão**, e o `baixar-backup.bat` os traz para o PC. | Não some: está no backup |

**O espaço:** o disco tem 49 GB; 6,7 GB estavam ocupados em 2026-10-12, e o primeiro pacote de arquivos soltos teve
722 MB.

- **O JB2A grátis** (~1,8 GB) cabe tranquilo em `modules/` e não pesa no backup.
- **O JB2A Patreon** (mais de 9 GB) cabe em `modules/`. **Nunca em `Data/efeitos-mesa/`**: lá entraria nos 3 pacotes
  guardados, cerca de 27 GB a mais, e encheria o disco e o download do backup no PC.
- **O teto para a `Data/efeitos-mesa/`:** 100 MB (3 × 100 MB nos pacotes).
- **A RAM de 1 GB do servidor não pesa aqui:** servir arquivo estático é barato, e o servidor não decodifica nada. Quem
  sofre é o PC fraco ou o celular do jogador, e por isso existe o orçamento abaixo.

**O orçamento de peso:**

| Fase | O que é | No git | O jogador baixa na 1ª sessão | Depois |
|---|---|---|---|---|
| 0 | Arrumar o `efeitos.mjs` e a escolha de qualidade (seção 8) | 0 | 0 | 0 |
| 1 | **Núcleo gerado no código + sons**: ~40 sons (3 variações por tipo: pistola, SMG, rifle de assalto, espingarda, sniper, laser, granada, explosão, soco, lâmina, impacto em carne, em metal e na parede, cápsula caindo, recarga, erro, glitch e bipes da NET) e ~10 texturas de partícula (clarão, faísca, fumaça, brasa, gota, anel) | **≤ 1,5 MB** (sons ~0,8 MB e texturas ~0,2 MB, com folga) | ~0,3 MB pré-carregados no `ready` (os 12 sons principais e as texturas); o resto no primeiro uso | 0: o navegador confirma pelo ETag (304) |
| 2 | **Sprite sheets próprias** no estilo 2077: explosão (2), bola de fogo, fumaça (2), sangue (2), faíscas elétricas, EMP, holograma e glitch, clarão de cano (3 ângulos), estilhaços | **≤ 4 MB** (~16 folhas × ~200 KB) | Só as folhas que o combate usa: ~1 a 2 MB | 0 |
| 3 | **Camada JB2A grátis** (opcional, fora do WebKit) | 0 (está em `modules/`) | 0,1 a 1 MB por efeito usado; um combate típico usa 5 a 10, ou seja, **2 a 6 MB** | 0 |
| 4 | **Pagos** (decisão do usuário) | 0 | Igual à fase 3 | 0 |
| **Teto no git** | | **≤ 6 MB no total**. Hoje o `foundry-sistema/` tem 5,4 MB. | | |

**Cuidado com o histórico do git:** cada versão de um binário fica nele para sempre. Feche o arquivo antes do commit e
não refaça um `.webp` dez vezes. Não use Git LFS: com estes tamanhos, não precisa, e o servidor teria de buscar o LFS.

## 6. Como montar: o núcleo próprio e a camada opcional

**A recomendação:**

- **O núcleo é nosso**, sem dependência: PIXI do próprio Foundry, mais as texturas e os sons em
  `foundry-sistema/efeitos/`.
- **A camada opcional** (Sequencer + JB2A, grátis ou Patreon) entra quando está ativa e o cliente não é WebKit.
- **Um catálogo lógico** liga as duas: o efeito `tiro.pistola` aponta para uma lista de candidatos, por exemplo
  `[jb2a_patreon/..., JB2A_DnD5e/.../Bullet_01..., 'proprio:tracer-amarelo']`. O `primeiroQueExiste` do
  `efeitos.mjs` já faz essa escolha. Cada efeito sempre termina num candidato `proprio:`, então nada some quando um
  módulo some.

**O que dá para fazer sem arquivo nenhum:**

| Efeito | Como | Precisa de arquivo? |
|---|---|---|
| Traçante, o rastro da bala | `PIXI.Graphics` (linha grossa com degradê de alfa, blend ADD) animada pelo GSAP: 80 a 150 ms | Não |
| Clarão de cano | Estrela de 5 a 7 pontas em `Graphics`, com glow (`BlurFilter`) e ADD por 2 a 3 quadros, mais a luz do Foundry por 100 ms | Não; fica melhor com 1 textura de clarão |
| Faíscas no metal, cápsulas | `PIXI.particles.Emitter` com uma textura gerada na hora (`renderer.generateTexture` de um `Graphics`) | Não |
| Onda de choque da granada | Anel em `Graphics` que cresce e some, mais o `DisplacementFilter` | Não |
| Tremor da tela | Deslocar o `canvas.stage` por 200 a 400 ms, com decaimento (o FX Bus faz o mesmo) | Não |
| Glitch (quickhack, EMP, cyberpsicose) | Um **filtro GLSL nosso**: as cores RGB separadas, faixas deslocadas e linhas de varredura. ~60 linhas, no molde dos filtros do Foundry. | Não |
| Sangue (gotas) | Partículas vermelhas com gravidade, mais uma mancha em `Graphics` que some em 2 a 5 s | Não; o respingo bonito pede sprite |
| Explosão realista, bola de fogo, fumaça volumosa | Partículas com uma textura de fumaça ficam aceitáveis; o bonito precisa de sprite sheet | **Sim** (fase 2) |
| Soco ou golpe (o "pow") | Anel com riscos em `Graphics`, o token afastado 4 px pelo `.motion()` ou pelo GSAP, e o texto flutuante | Não |
| Holograma e interface de NET | `Graphics` com linhas, `NoiseFilter` e o texto em fonte monoespaçada | Não |

## 7. Feito por nós: as ferramentas e as licenças

| Ferramenta | Para quê | Licença da ferramenta | De quem é o arquivo gerado | Custo |
|---|---|---|---|---|
| **Effekseer** ([site](https://effekseer.github.io/en/)) | Montar partículas 2D e 3D (explosão, faísca, laser, EMP) e exportar sequências de PNG, GIF ou vídeo para virar sprite sheet | Livre e de código aberto (MIT no GitHub) | Nosso | Grátis |
| **Blender** (simulação de fumaça e fogo no Mantaflow, render com fundo transparente) | Explosão e fumaça volumosas | GPL (o que se renderiza é do autor) | Nosso | Grátis, mas lento de aprender: G |
| **EmberGen** (JangaFX) | Fogo, fumaça e explosão em tempo real, com exportação direta de sprite sheet: o melhor resultado com o menor esforço | Comercial | Nosso | **~US$ 300 no 1º ano** (licença permanente indie, com atualização por 12 meses) e ~US$ 180 por ano depois (agregadores de 2026; [preços oficiais](https://jangafx.com/software/pricing), não confirmados). **Decisão do usuário.** |
| **Krita** ou **GIMP** | Desenhar as texturas de partícula (clarão, faísca, gota) | GPL | Nosso | Grátis |
| **free-tex-packer** ou o `ffmpeg` `tile=` | Juntar os PNG numa folha e gerar o `.json` do PIXI | MIT / LGPL-GPL | Nosso | Grátis |
| **jsfxr / sfxr.me** ([GitHub](https://github.com/chr15m/jsfxr)) | Bipes, laser, glitch e interface de NET (estilo chip) | Unlicense (domínio público) | Nosso | Grátis |
| **ChipTone** (SFB Games) | O mesmo, com mais controle | Ferramenta grátis na web. Os sons são de quem os faz (confira o aviso na página). | Nosso | Grátis |
| **Audacity** | Cortar, normalizar (−1 dBTP, pico em −3 dB), fade, mixar camadas (o tiro CC0 + o grave + a cauda) e exportar em Opus | GPL-3 | Nosso. Uma mixagem com CC0 é nossa; com CC-BY, mantém o crédito. | Grátis |
| **ffmpeg** | Converter em lote: `-c:a libopus -b:a 80k -ac 1`, e o `.webp` das folhas | LGPL / GPL | Nosso | Grátis |

**O estilo 2077:**

- Nas cores, use as do tema, que o `efeitos.mjs` já tem: vermelho `#ff2a4a`, ciano `#02d7f2` e o texto `#e8e6d9`.
- O clarão é branco-amarelado no centro, com franja ciano ou magenta. O blend ADD dá o brilho neon.
- No som, o tiro é "seco" e moderno, com uma camada eletrônica curta (um transiente de 20 ms feito no jsfxr) por baixo
  do disparo CC0. Os quickhacks soam digitais: bitcrush, glitch e varredura.

## 8. O desempenho: as escolhas por cliente

- Uma configuração de **cliente** (cada jogador escolhe a sua), ao lado da "Efeitos na mesa", que é do mundo:
  **"Qualidade dos efeitos: alta / leve / só texto"**.
  - Na "leve": menos partículas (1/3), sem filtro de glitch nem displacement, sem sprite sheet, só o núcleo gerado no
    código.
  - O padrão é "leve" quando o navegador é celular ou WebKit. É detectado uma vez e o jogador pode mudar.
- **O WebKit** (iPhone, iPad e o Safari do Mac): nunca `.webm` com alfa, porque vira quadrado preto. Use o núcleo
  próprio e as sprite sheets.
- **Teto de efeitos ao mesmo tempo:** cerca de 8 na tela. No autofogo de 10 balas, desenhe 3 traçantes e 1 som de
  rajada, não 10 de cada.
- **Pré-carga:**
  - no `ready`, o `AudioHelper.preloadSound` dos 12 sons principais e as texturas do núcleo (~0,3 MB);
  - no `canvasReady`, as folhas que a cena provavelmente usa (as das armas dos tokens na cena);
  - o resto no primeiro uso, com um cache em memória num `Map`, como o `existe` de hoje.
- **O volume:** use o canal de **efeitos** do Foundry (o `environment` ou o `interface` do `AudioHelper`). Assim cada
  jogador baixa o volume na própria barra de volume.

## 9. A manutenção: o risco de cada peça quebrar no Foundry 15

| Peça | Risco no próximo Foundry | Por quê | O que acontece quando some |
|---|---|---|---|
| O núcleo próprio (PIXI, GSAP, filtro nosso) | **Médio-baixo** | Depende da API do PIXI do Foundry. Se o Foundry trocar o PIXI 7 pelo PIXI 8, o filtro GLSL e o emissor de partículas precisam de ajuste. Nós controlamos e testamos no G4. | Cai para o texto flutuante, que já existe |
| Os arquivos próprios (`.webp`, `.ogg`) | **Muito baixo** | Formatos web padrão | Não somem |
| **Sequencer** | **Médio** | Mantido e rápido: verificou o 14 no primeiro mês. Mas cada versão grande quebra a API (a 4.0 tirou o `.from()` e o `.noLoop()`). | O catálogo cai no `proprio:` |
| **JB2A** grátis e Patreon | **Baixo** | São só arquivos; os nomes mudam pouco | O catálogo cai no `proprio:` |
| Token Magic FX | **Médio-alto** | Uma pessoa só. A 0.8.4 tem 5 meses e só funciona do 14 em diante. | Não usar no núcleo |
| FXMaster | Médio | Ativo (8.4.2), mas mexe fundo no canvas | Opcional, só para o clima da cena |
| Automated Animations | Médio, e **inútil aqui** | Não conhece o Cyberpunk RED | Não usar |
| Make it Shiny Cyberpunk | **Alto** | Sem atualização há 1 ano e 4 meses, verificado só no 13 | Não comprar antes de testar no 14 |
| Diwako | **Já quebrou** (sem v14) | | Tirar o ramo do código no ciclo dos efeitos |
| Dice So Nice | Baixo-médio | Ativo e verificado no 14.370 | Os dados voltam ao 2D |

**A regra:** o sistema **nunca exige** um módulo de terceiros. Cada efeito tem um candidato `proprio:` no fim da lista, e
um teste do G3 confere isso no catálogo.

## 10. As propostas, com o custo e o risco

| # | Proposta | Custo | Risco | Depende de |
|---|---|---|---|---|
| A0 | Trocar o `foundry.canvas.srcExists` pelo `foundry.utils.srcExists`; tirar o ramo do Diwako (ou deixá-lo explícito para o 12); pôr `efeitos` na lista do `instalar.mjs`; criar o `efeitos/CREDITOS` | **P** | Baixo | — |
| A1 | O catálogo lógico de efeitos (`tiro.pistola`, `impacto.carne`, `explosao.granada`, `glitch.quickhack`...) com os candidatos e o `proprio:` obrigatório, mais o teste do G3 | **P** | Baixo | fx-coreografia (a lista de momentos) |
| A2 | A configuração de cliente "Qualidade dos efeitos" e a detecção do WebKit e do celular | **P** | Baixo | fx-visual |
| A3 | A biblioteca de ~40 sons (CC0 do Kenney e da Free Firearm Sound Library, mais camadas feitas no jsfxr e mixadas no Audacity), em Opus, ≤ 1 MB, com o CREDITOS | **M** (~2 a 3 dias de curadoria e edição) | Baixo. **Licença:** guarde o link e a licença de cada arquivo na hora de baixar. | fx-audio |
| A4 | O núcleo gerado no código (traçante, clarão, faísca, onda de choque, tremor, gotas, soco) e o filtro de glitch | **M** | Médio: o desempenho no celular, que se testa num aparelho de verdade | fx-visual |
| A5 | As sprite sheets próprias no estilo 2077 (explosão, fumaça, sangue, EMP e holograma), ≤ 4 MB | **G** com o Blender e o Effekseer; **M** com o EmberGen | Médio: a qualidade artística | Decisão da ferramenta |
| A6 | A camada opcional Sequencer + JB2A grátis no catálogo, desligada no WebKit | **P** | Baixo | O JB2A grátis instalado no servidor (~1,8 GB em `modules/`) |
| A7 | Os efeitos do Dice So Nice no crítico do d10 (o 10 que explode e o 1) | **P** | Baixo | — |
| A8 | O JB2A Patreon no servidor (`modules/`, fora do git e do backup) | **P** de trabalho, mais a assinatura | Baixo técnico. Custo recorrente, e sem o Patreon não há atualização. | **Decisão do usuário** |
| A9 | Sons pagos ou não redistribuíveis escolhidos a dedo (Sonniss, Pixabay) em `Data/efeitos-mesa/`, ≤ 100 MB, com o catálogo apontando para eles antes do `proprio:` | **P** | Licença cinzenta (seção 3) | **Decisão do usuário** |

## 11. As decisões do usuário

1. **Assinar o JB2A Patreon?** Ele dá mais cores e variações dos mesmos tiros e explosões; o preço não foi confirmado
   (seção 2). A recomendação: **não por agora**. O grátis mais o núcleo próprio cobrem o tiro, o laser, a explosão e o
   impacto, e o Patreon não resolve o iPhone.
2. **Comprar o EmberGen** (~US$ 300 no 1º ano, não confirmado) para as sprite sheets da fase 2, ou fazer no Blender e
   no Effekseer (grátis, mais lento)? É gosto e dinheiro.
3. **Make it Shiny Cyberpunk** (Patreon): o único pacote com cara de 2077 (quickhack, monofio, railgun), mas parado no
   Foundry 13. Recomendação: só depois de alguém testar no 14.
4. **Usar som da Sonniss ou do Pixabay** no servidor, fora do git (área cinzenta, seção 3), ou ficar só com o CC0 e o
   nosso? Recomendação: **CC0 e nosso**; a Sonniss só se o CC0 não ficar bom no tiro.
5. **Os efeitos para todos ou só para os envolvidos:** hoje a animação sai para todos pelo Sequencer, e o texto segue o
   "Quem vê o cartão". O som do tiro deve tocar para a mesa inteira? É gosto: um tiro se ouve, mas o ataque escondido
   não deveria fazer barulho.
6. **O tom:** realista (sangue, tiro alto) ou estilizado neon (faíscas ciano, sem sangue)? Uma escolha "Sangue: sim /
   não" por cliente ajuda a segurança da mesa.
7. **Confirmar se o repositório é público ou privado** (seção 3). O plano já supõe público.

## Fontes

- Pacotes do Foundry: [Sequencer](https://foundryvtt.com/packages/sequencer) ·
  [as versões do Sequencer](https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases) ·
  [JB2A grátis](https://foundryvtt.com/packages/JB2A_DnD5e) · [o repositório do JB2A](https://github.com/Jules-Bens-Aa/JB2A_DnD5e)
  (as pastas e os tamanhos lidos pela API do GitHub) · [a wiki do JB2A, Patreon](https://jules-bens-aa.github.io/jb2a-wiki/getting-started/our-patreon/) ·
  [Automated Animations](https://foundryvtt.com/packages/autoanimations) · [FXMaster](https://foundryvtt.com/packages/fxmaster) ·
  [Token Magic FX](https://foundryvtt.com/packages/tokenmagic) · [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice) ·
  [Eskie Effects](https://foundryvtt.com/packages/eskie-effects-free) · [Jinker's](https://foundryvtt.com/packages/jaamod) ·
  [NRSAP](https://foundryvtt.com/packages/nrsap) · [Make it Shiny Cyberpunk](https://foundryvtt.com/packages/make-it-shiny-cyberpunk-animated-assets) ·
  [FX Bus](https://foundryvtt.com/packages/fxbus) · [PSFX](https://foundryvtt.com/packages/psfx) ·
  [Diwako CPRED](https://foundryvtt.com/packages/diwako-cpred-additions) · [Michael Ghelfi](https://foundryvtt.com/packages/michaelghelfi)
- Sons: [a licença da Sonniss](https://sonniss.com/gdc-bundle-license/) · [Kenney Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) ·
  [Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library) ·
  [a licença do Pixabay](https://pixabay.com/service/license-summary/) · [Tabletop Audio](https://tabletopaudio.com/about.html)
- Formatos: [Jake Archibald, vídeo com transparência](https://jakearchibald.com/2024/video-with-transparency/) ·
  [Rotato, 2026](https://rotato.app/blog/transparent-videos-for-the-web) · [caniuse, Vorbis](https://caniuse.com/vorbis) ·
  [Ogg Opus no Safari 18.4](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html)
- Ferramentas: [Effekseer](https://effekseer.github.io/en/) · [jsfxr](https://github.com/chr15m/jsfxr) ·
  [os preços da JangaFX](https://jangafx.com/software/pricing)
- O Foundry 14.369 local: `common/constants.mjs` (os formatos), `client/helpers/client-issues.mjs` (os navegadores
  mínimos), `dist/server/express.mjs` (o cache), `client/canvas/loader.mjs` (o `srcExists` obsoleto),
  `client/audio/helper.mjs` (a pré-carga) e `node_modules/@pixi/*` (o PIXI 7.4.3 com o particle-emitter).
