# Efeitos da mesa: o som (fx-audio)

Seção do especialista em som da equipe de Efeitos (fx-visual, fx-audio, fx-coreografia, fx-assets). Lido no
origin/master 725911b6 (ciclo 214) e no código do Foundry 14.369 (`%LOCALAPPDATA%\FieldbookTeste\foundry14-app`).
Nada no repositório foi alterado.

---

## 0. Em uma página

**O que proponho:**

1. **Um motor de som próprio do sistema,** sem depender de módulo:
   - o `scripts/sons.mjs` (Foundry) e o `scripts/regras-sons.mjs` (a conta pura, testável no G3);
   - o banco em `foundry-sistema/sons/`, com um índice `sons/banco.json`;
   - ele usa a API do núcleo do Foundry 14 (o `Sound`, os contextos `environment` e `interface`, o `PointSoundSource`
     para a distância e as paredes);
   - o Sequencer continua opcional, para a animação (fx-visual).
2. **Um barramento "Efeitos de combate"** em cada navegador:
   - um `GainNode` com o volume próprio, mais um compressor-limitador antes do volume "Ambiente" do Foundry;
   - um teto de vozes e o pitch aleatório;
   - a rajada e o supressivo montados tiro a tiro na cadência da arma, com uma cauda só, no último tiro.
3. **Um evento por socket, não um arquivo:** o mestre (ou quem atira) manda "tiro de pistola pesada aqui, com
   silenciador, para estes usuários". Cada navegador escolhe a variação, o volume dele, a distância e as paredes.
4. **O som conta o que aconteceu:**
   - o disparo sai no clique do ataque;
   - o impacto sai na resolução (carne, armadura, escudo, cobertura, vidro, veículo, erro), junto do texto
     "−12 HP" que já existe.
5. **Banco CC0 primeiro** (Kenney, Freesound filtrado por CC0, BigSoundBank):
   - CC-BY só com o arquivo de créditos;
   - o Sonniss GDC nunca no git, porque a licença proíbe redistribuir os arquivos soltos; ele só pode ir para o
     servidor, fora do repositório.
6. **Formato:**
   - Opus mono em `.webm`, a 64 kbps, normalizado por categoria;
   - para o Safari e o iPhone, uma cópia em `.m4a` (AAC), escolhida na hora;
   - o motivo está no item 7.1.
7. **Peso:**
   - o banco completo tem uns 420 arquivos: cerca de 5 MB em Opus, cerca de 12 MB com a cópia AAC;
   - o MVP tem uns 120 arquivos, cerca de 1,5 MB.

**O custo total:** **G**, em 6 fases. O código é M em cada fase. A curadoria dos sons (ouvir, escolher, cortar,
normalizar) é o maior trabalho, e é de ouvido: precisa do usuário.

---

## 1. O que já existe no sistema

- `foundry-sistema/scripts/efeitos.mjs:42-60` (`animar`) tem o único som de hoje: com o módulo Diwako ativo e os
  "hit-sounds" dele configurados, um som de acerto aleatório, a 0,35, pelo `AudioHelper.play(..., true)` (vai a todos,
  sem posição) (`efeitos.mjs:53-58`). Ele roda só no mestre, só no estilo `acerto`.
- `foundry-sistema/scripts/combate/cartao.mjs:77-89` (`mostrarNaMesa`):
  - para cada linha do resultado, monta o texto no token (`regras.mjs:887-895`, `textoNoToken`: estilos `acerto`,
    `defesa` e `erro`);
  - manda pelo socket do sistema (`CANAL`, `{tipo: 'texto'}`); o cliente o recebe em `combate/socket.mjs:123`;
  - chama `animar` no modo `auto`. **É aqui que o som de impacto entra.**
- O fluxo do ataque (onde cada som nasce):
  - `combate.mjs:63` (`atacar`), no navegador de quem ataca, passa por estes pontos:
    - o modo, por `R.classificar` (`regras.mjs:572-578`: `tiro`, `cartucho`, `explosivo`, `corpo`, `autofogo`,
      `supressivo`, `ricochete`, `arremesso`);
    - o "pente vazio" (`combate.mjs:148`): **o som do clique a seco**;
    - o gasto das balas (`combate.mjs:172`, `balasDoModo`, `regras.mjs:582-586`: 1, 10 no autofogo e no supressivo
      pelo `BALAS_RAJADA` de `regras.mjs:568`, 7 na Lexington pelo `documentos.mjs:1125`, 2 nos dois canos);
    - a rolagem (`combate.mjs:175`): **o som do disparo**;
    - o envio ao mestre (`combate.mjs:196-199`).
  - `combate/modos.mjs:134` (`resolver`), no mestre, despacha para `explosao` (716), `cartucho` (689), `supressao`
    (769) ou `individual` (613), e devolve o `cartaoDoResultado`. **Os impactos, a explosão e o "Suprimido!"**
    saem daqui.
  - A recarga é o `recarregar` (`documentos.mjs:1190`), e o Death Save é o de `documentos.mjs:537`.
- A configuração "Efeitos na mesa" (`configuracoes.mjs:71-74`, mundo: `auto`, `texto` ou `nao`) é a chave mestra de
  hoje.
- **O instalador copia só uma lista fixa de pastas** (`foundry-sistema/instalar.mjs:48`: `scripts`, `templates`,
  `styles`, `fontes`, `lang`, `icones`, `dados`, `packs`). Uma pasta `sons/` nova **tem de entrar nessa lista**, senão
  ela não chega ao Foundry da mesa. O teste do instalador precisa cobrir isso.
- O sistema é **GPL-3.0** (`system.json`), e o repositório é público: tudo em `foundry-sistema/sons/` é redistribuído.

---

## 2. A API de áudio do Foundry 14.369 (conferida no código)

| O que | Onde | O que importa para nós |
|---|---|---|
| Três contextos fixos: `music`, `environment`, `interface` | `client/audio/helper.mjs:46`; `common/constants.mjs:792` | Não há um quarto canal no núcleo. O nosso "Efeitos de combate" vira um barramento dentro de `environment` (item 4.1). |
| O volume de cada um é de cada cliente (`globalPlaylistVolume`, `globalAmbientVolume`, `globalInterfaceVolume`, padrão 0,5) | `helper.mjs:290-320`; cada contexto tem um `gainNode` (`helper.mjs:653-660`) | O volume que o jogador escolheu já vale. O nosso multiplica por cima. |
| Os contextos só existem depois do primeiro gesto (`contextmenu`, `auxclick`, `pointerdown`, `pointerup`, `keydown`) | `helper.mjs:259-268`, `629-650` | Antes disso, `game.audio.environment` é `undefined`. |
| O `Sound#load` **espera o desbloqueio**; o que pedir antes toca de uma vez no primeiro clique | `client/audio/sound.mjs:334-341` | **Armadilha:** 30 tiros acumulados tocam juntos no primeiro clique do jogador que chegou atrasado. Com `game.audio.locked`, o evento se descarta. |
| `AudioHelper.play(data, socketOptions)`: canal, volume, `recipients` | `helper.mjs:413-446`; socket `playAudio` em `381-385` | Serve para a interface. Não tem pitch nem posição, e manda o arquivo, não o evento: não usamos para combate. |
| `canvas.sounds.playAtPosition(src, origem, raio, opções)` e `emitAtPosition` (socket `playAudioPosition`) | `client/canvas/layers/sounds.mjs:349-365` | Cria um `Sound` novo por chamada, no contexto `environment`. |
| `Sound#playAtPosition`: `volume`, `easing`, `walls`, `gmAlways`, `baseEffect`, `muffledEffect`, `sourceData` (ângulo, rotação) | `sound.mjs:481-518` | A distância e as paredes, prontas. |
| Quem é o "ouvinte" | `sounds.mjs:170-196` (`getListenerPositions`) | São os tokens com visão ativa; no mestre sem visão, os tokens controlados; no jogador com a Visão do Token e sem fonte de visão, **ninguém** (não ouve nada posicional); no jogador sem token controlado, os tokens que ele observa. |
| A atenuação: cosseno pela distância, zero fora do raio ou fora do polígono do som | `client/canvas/sources/point-sound-source.mjs:92-109` | O raio está em unidades da cena (metros na nossa grade). |
| As paredes: `walls: true` **bloqueia** (o som não passa); `walls: false` + `muffledEffect` **abafa** (passa com o filtro) | `sounds.mjs:276-286` | O tiro e a explosão atravessam parede abafados: use `walls: false` com `muffledEffect: {type: 'lowpass', intensity: 6}`. |
| **Armadilha 1:** na posição exata do ouvinte, o volume vira 1, ignorando o `volume` pedido | `sounds.mjs:268-274` | Com `gmAlways` (padrão `true`), o mestre usa a própria origem como ouvinte: **o mestre ouve todo som posicional no máximo**. O token de quem atira também, porque o tiro sai do centro dele. Por isso calculamos o volume nós mesmos (item 4.2). |
| **Armadilha 2:** sem pan estéreo | `sound.mjs:481-518` | O posicional do núcleo só muda o volume. O pan entra como um efeito nosso. |
| A cadeia: `source → effects[] → gainNode → destination` | `sound.mjs:963-983` | `Sound#effects` é público (aceita `StereoPannerNode`, `BiquadFilterNode`, convolver). |
| `Sound#destination` público; se já existe, `_createNodes` não o troca | `sound.mjs:212-215`, `947-953` | Com ele, mandamos o som ao nosso barramento, sem mexer no núcleo. |
| Não há `playbackRate` nas opções de `play` | `client/audio/_types.mjs:23-33` | O pitch aleatório vai numa subclasse `SomDeEfeito extends Sound` que sobrescreve `_createNodes()` (protegido) e põe o `sourceNode.playbackRate`. |
| O `_load` cria primeiro um `<audio>` para saber a duração; com erro, falha | `sound.mjs:383-402`, `896-907` | **Safari:** se o `<audio>` não toca o formato, o som falha, mesmo que o `decodeAudioData` decodificasse (item 7.1). |
| O som curto (até 10 min) vira `AudioBuffer` em cache LRU de 1 GB por `src` | `sound.mjs:67`; `helper.mjs:59`; `client/audio/cache.mjs` | Decodificado uma vez, toca mil. O peso na memória é o PCM: 48 kHz × 4 bytes ≈ 190 KB por segundo, mono. |
| Os filtros permitidos | `client/audio/biquad.mjs:26` | `lowpass`, `highpass`, `bandpass`, `lowshelf`, `highshelf`, `peaking`, `notch`. Há também o reverb (`convolver.mjs`, com as respostas em `public/sounds/impulse-responses`). |
| As extensões aceitas | `common/constants.mjs:1674-1684` | `aac`, `flac`, `m4a`, `mid`, `mp3`, `ogg`, `opus`, `wav`, `webm`. |
| O tema de combate: `CONFIG.Combat.sounds` (`startEncounter`, `nextUp`, `yourTurn`), escolhido por cliente (`core.combatTheme`) | `client/config.mjs:300-312`; `client/documents/combat.mjs:548-558`; `client/game.mjs:1518` | Um tema "Night City" do sistema dá "é a sua vez" sem código de combate. Ele toca no `interface`. |
| A VFX do Foundry 14 (`positionalSound`, `singleAttack` com o som do disparo e do impacto, `SOUND_ALIGNMENT`) | `client/canvas/vfx/vfx-effect.mjs:166-175`; `components/vfx-positional-sound-component.mjs`; `vfx-single-attack-component.mjs:443-450`; `vfx-constants.mjs` | **Experimental, só com `CONFIG.Canvas.vfx.enabled`.** O `singleAttack` toca com `gmAlways: true` (a armadilha 1). Fica para o fx-visual decidir: o som deve continuar no nosso motor, para valer com ou sem a VFX. |

O Sequencer 4.x (Foundry 13 e 14) tem uma seção `.sound()` com `atLocation`, `radius`, `constrainedByWalls`,
`distanceEasing`, `panSound`, `muffledEffect`, `forUsers`, `audioChannel` e `volume`, mas sem pitch documentado. Ela
serviria como motor, mas torna o som dependente de um módulo opcional, e o sistema funciona sem ele hoje
(`efeitos.mjs:43-52`). **Recomendação:** o motor é do sistema; o Sequencer fica só na animação.

---

## 3. O banco de sons

### 3.1 Como um som de arma se monta (as camadas)

Um tiro não é um arquivo, são até quatro camadas, e cada uma tem as variações dela:

| Camada | O que é | Duração | Na rajada |
|---|---|---|---|
| **corpo** | o estampido seco, o "punch" | 0,15 a 0,4 s | um por bala |
| **cauda** | o eco e o reverb do lugar (externo, interno, rua) | 0,8 a 2 s | só no último tiro |
| **mecânica** | o ferrolho, a cápsula caindo, o zumbido Tech, o bip Smart | 0,2 a 0,8 s | a cápsula a cada 3 balas, no máximo |
| **impacto** | o que a bala encontrou | 0,2 a 0,8 s | no máximo 3 por alvo, espaçados |

Com isso, a rajada de 10 tiros não vira 10 caudas sobrepostas (o "estouro"): são 10 corpos curtos e uma cauda só.

### 3.2 O perfil de som de cada arma

A arma escolhe o perfil por esta ordem (a primeira que existir vale; item 9):

1. a flag da arma (o mestre escolheu);
2. o mapa por catálogo (`flags.cpr-fieldbook.catalogo`: `core_weapons:malorian-arms-3516` →
   `pistola-malorian`);
3. a classe de 2077 (`perfil2077.classe`, `config.mjs:61`) mais o tipo;
4. o tipo do RED (`system.tipo`);
5. o padrão por perícia.

Os tipos que existem no catálogo (198 armas): `medPistol` 7, `heavyPistol` 16, `vHeavyPistol` 18, `smg` 17,
`heavySmg` 2, `shotgun` 20, `assaultRifle` 20, `sniperRifle` 9, `bow` 7, `grenadeLauncher` 4, `rocketLauncher` 4,
`thrownWeapon` 8, `lightMelee` 9, `medMelee` 18, `heavyMelee` 15, `vHeavyMelee` 22, `martialArts` 1 e `unarmed` 1. De
2077 são 25 Power, 9 Smart e 7 Tech.

### 3.3 A tabela do banco

**As legendas:**

- **Canal:** `amb` é o contexto `environment` (o volume "Ambiente" do jogador), pelo barramento "Efeitos de combate";
  `ui` é o `interface`.
- **Vol.:** o volume da camada antes do barramento (0 a 1), já com a normalização da categoria (item 7.2). O
  barramento começa em 0,7.
- **Posição:** `P` mais o raio em metros (pela distância e as paredes, abafado através da parede); `G` (global, para
  todos na cena, sem posição); `U` (só para alguns usuários).
- **Fonte:** as siglas estão no item 10. "FS: termo" é a busca do Freesound já filtrada por CC0, e cada som se confere
  na página dele antes de baixar.
- **KB:** o total do evento em Opus 64 kbps mono (cerca de 8 KB por segundo), todas as variações somadas.

#### Armas de fogo do RED (o corpo do disparo; a cauda é comum, na tabela "Caudas e lugares")

| Evento | Var. | Canal | Vol. | Posição | Fonte sugerida | Licença | KB |
|---|---|---|---|---|---|---|---|
| `tiro.pistola-media` (9 mm) | 5 | amb | 0,55 | P 150 | FS: michorvath "9mm pistol shot" ([427592][fs-9mm]); [OGA-FFSL] | CC0 | 20 |
| `tiro.pistola-pesada` (.45 / 10 mm) | 5 | amb | 0,65 | P 180 | [OGA-FFSL]; [FS: pistol gunshot] | CC0 | 22 |
| `tiro.pistola-muito-pesada` (.50, revólver) | 4 | amb | 0,75 | P 220 | [FS: 44 magnum] (Jon285 "44_black_powder", [34708][fs-44]); [BSB] | CC0 | 20 |
| `tiro.smg` | 5 | amb | 0,5 | P 150 | [OGA-FFSL]; [FS: submachine gun] | CC0 | 15 |
| `tiro.smg-pesada` | 4 | amb | 0,6 | P 180 | [OGA-FFSL]; [FS: machine gun] (ShawnyBoy "Heavy Machine Gun", [165394][fs-hmg]) | CC0 | 14 |
| `tiro.espingarda` (cartucho) | 4 | amb | 0,8 | P 200 | FS: michorvath "20 gauge shotgun" ([427595][fs-20g]) | CC0 | 22 |
| `tiro.espingarda-slug` | 3 | amb | 0,8 | P 200 | a mesma, com o grave reforçado | CC0 | 16 |
| `tiro.rifle-assalto` | 5 | amb | 0,7 | P 300 | FS: michorvath "AR15" ([427598][fs-ar15]); mnslugger20 "M4" ([259758][fs-m4]) | CC0 | 20 |
| `tiro.rifle-precisao` | 3 | amb | 0,9 | P 500 | [OGA-FFSL]; [FS: sniper rifle] | CC0 | 24 |
| `tiro.arco` (soltar e zunir) | 4 | amb | 0,4 | P 40 | [K-RPG]; [FS: bow release] | CC0 | 12 |
| `tiro.besta` (se a mesa usar) | 3 | amb | 0,45 | P 40 | [FS: crossbow] | CC0 | 9 |
| `tiro.lanca-granadas` ("thunk") | 3 | amb | 0,6 | P 120 | [FS: grenade launcher]; [BSB] | CC0 | 9 |
| `tiro.lanca-foguetes` (partida e chiado) | 3 | amb | 0,85 | P 250 | [FS: rocket launch]; [K-SciFi] (`thrusterFire`) | CC0 | 30 |
| `tiro.foguete-voo` (loop curto até o impacto) | 2 | amb | 0,5 | P 150, segue o caminho | [FS: rocket flyby] | CC0 | 24 |
| `tiro.arremesso` (a arma branca e a granada) | 4 | amb | 0,35 | P 25 | [FS: whoosh throw]; [K-RPG] | CC0 | 8 |
| `tiro.pistola-de-ar` / paintball | 3 | amb | 0,3 | P 30 | [FS: air gun] | CC0 | 6 |
| `tiro.silenciado` (o corpo abafado; por tipo: pistola, smg, rifle) | 3 × 3 | amb | 0,35 | P 25 | [FS: silenced pistol] | CC0 | 22 |
| `tiro.veicular` (metralhadora montada) | 4 | amb | 0,85 | P 400 | [OGA-FFSL]; [FS: m60] | CC0 | 16 |
| `tiro.lanca-chamas` (loop e soltura) | 2 | amb | 0,7 | P 60 | [FS: flamethrower] | CC0 | 30 |

#### Armas de 2077 (as classes do Mission Kit)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `tiro.power.<tipo>` | o corpo do RED | | | | o mesmo do RED, com o pitch −4% e o grave um pouco mais forte | | 0 |
| `power.ricochete` ("ping" metálico na superfície, antes do impacto) | 5 | amb | 0,5 | P 60, no ponto do ricochete | [FS: ricochet]; [K-Imp] (`impactMetal`) | CC0 | 12 |
| `tech.carga` (zumbido subindo, ao carregar; **a modificação "Carga silenciosa" tira o som**: `mods-armas:carga-silenciosa`) | 3 | amb | 0,4 | P 20 | [K-SciFi] (`forceField`, `computerNoise`); [FS: charge up] | CC0 | 24 |
| `tech.disparo` (corpo elétrico, "railgun crack") | 4 | amb | 0,75 | P 250 | [K-Digital] (`laser`, `phaser`, `zap`); [FS: railgun] | CC0 | 18 |
| `tech.atravessa` (a bala passa pela cobertura: chiado e estalo) | 3 | amb | 0,5 | P 40 | [K-SciFi]; [FS: electric zap] | CC0 | 9 |
| `tech.esfriar` (a arma que esfria uma rodada: chiado de vapor) | 2 | amb | 0,3 | P 15 | [FS: steam hiss] | CC0 | 10 |
| `smart.trava` (bip de mira, por alvo) | 3 | ui, U (quem atira) | 0,35 | U | [K-Iface] (`select`, `confirmation`); [K-UI] | CC0 | 4 |
| `smart.disparo` (corpo mais leve e um "fsss" de micro-foguete) | 4 | amb | 0,55 | P 150 | [K-SciFi] (`laserSmall`); [FS: dart whoosh] | CC0 | 14 |
| `smart.curva` (zunido que vira até o alvo) | 3 | amb | 0,35 | P 30, no alvo | [FS: whoosh] | CC0 | 9 |
| `smart.sem-link` (a arma Smart sem o Smart Link: o erro) | 1 | ui, U | 0,4 | U | [K-Iface] (`error`) | CC0 | 1 |

#### A mecânica da arma

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `capsula.metal` (no chão duro) | 6 | amb | 0,25 | P 10 | FS: GryffDavid "Bouncing Shell Casings" ([318964][fs-casing1]); GrayJoy ([210102][fs-casing2]); Danwardvs ([205126][fs-casing3]) | CC0 | 18 |
| `capsula.espingarda` (plástico) | 3 | amb | 0,25 | P 10 | FS: JohnDelayniKIng "Shotgun shell ejection" ([147261][fs-shell]) | CC0 | 8 |
| `recarga.pistola` (pente sai e entra, ferrolho) | 3 | amb | 0,4 | P 15 | [FS: pistol reload]; FS: moosegravy ([431830][fs-mag]) | CC0 | 30 |
| `recarga.rifle` / `recarga.smg` | 3 + 3 | amb | 0,4 | P 15 | [FS: rifle reload] | CC0 | 50 |
| `recarga.espingarda` (cartucho a cartucho; o número de cartuchos pelo que entrou) | 4 | amb | 0,4 | P 15 | [FS: shotgun load shell] | CC0 | 20 |
| `recarga.revolver` | 2 | amb | 0,4 | P 15 | [FS: revolver reload] | CC0 | 16 |
| `recarga.tech` (bateria) e `recarga.lanca` | 2 + 2 | amb | 0,4 | P 15 | [K-SciFi]; [FS: battery click] | CC0 | 20 |
| `arma.vazia` (clique a seco: `combate.mjs:148`) | 3 | amb | 0,45 | P 8 (ouve quem está perto) | [FS: dry fire]; [K-RPG] (`metalClick`) | CC0 | 3 |
| `arma.emperrou` (a falha crítica da arma ruim: o clique e o "clunk") | 2 | amb | 0,45 | P 10 | [FS: gun jam] | CC0 | 4 |
| `arma.sacar` / `arma.guardar` (equipar) | 2 + 2 | amb | 0,25 | P 6 | [K-RPG] (`drawKnife`); [FS: holster] | CC0 | 8 |

#### Caudas e lugares (a cauda escolhe pela cena; padrão "externo urbano")

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `cauda.externo` (eco de rua, prédios) | 4 | amb | 0,45 | P (raio do tiro) | [OGA-FFSL] (as tomadas distantes); [FS: gunshot echo] | CC0 | 56 |
| `cauda.interno` (sala, curta) | 3 | amb | 0,4 | P | gerada com o reverb do Foundry (`public/sounds/impulse-responses`), sem arquivo; ou [FS: gunshot indoor] | CC0 | 0 a 30 |
| `cauda.galpao` (longa, metálica) | 3 | amb | 0,4 | P | [FS: warehouse gunshot] | CC0 | 40 |
| `cauda.distante` (fora do raio de quem ouve, com `lowpass`) | 2 | amb | 0,25 | P (2× o raio) | os mesmos, filtrados | | 0 |

#### Impactos e o resultado do ataque (na resolução, `cartao.mjs:77-89`)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `impacto.carne` (o dano passou do SP) | 6 | amb | 0,5 | P 25, no alvo | [FS: bullet impact flesh]; [K-Imp] (`impactSoft`) | CC0 | 18 |
| `impacto.armadura` ("A armadura segurou": kevlar e placa) | 5 | amb | 0,45 | P 25 | [K-Imp] (`impactPlate`, `impactGeneric`) | CC0 | 12 |
| `impacto.escudo` ("No escudo": escudo balístico) | 4 | amb | 0,5 | P 30 | [K-Imp] (`impactMetal`) | CC0 | 10 |
| `impacto.cobertura.concreto` | 4 | amb | 0,45 | P 30 | [FS: bullet concrete] | CC0 | 12 |
| `impacto.cobertura.madeira` | 3 | amb | 0,4 | P 30 | [K-Imp] (`impactWood`, `impactPlank`) | CC0 | 8 |
| `impacto.cobertura.metal` | 3 | amb | 0,45 | P 30 | [K-Imp] (`impactMetal`, `impactTin`) | CC0 | 8 |
| `impacto.vidro` (o vidro do veículo; o blindado que trinca) | 4 | amb | 0,5 | P 30 | [K-Imp] (`impactGlass`); [FS: glass break] | CC0 | 14 |
| `impacto.veiculo` (a lataria, o SDP) | 4 | amb | 0,55 | P 40 | [FS: bullet hit car] | CC0 | 12 |
| `erro.zunido` (a bala passa perto: o "whizz") | 5 | amb | 0,4 | P 15, **no alvo** (quem está perto do alvo ouve) | [FS: bullet whizz] | CC0 | 10 |
| `erro.ricochete` | 4 | amb | 0,4 | P 30 | [FS: ricochet] | CC0 | 12 |
| `erro.chao` (o tiro no concreto e no asfalto) | 4 | amb | 0,35 | P 25 | [FS: bullet ground hit] | CC0 | 8 |
| `esquivou` (o corpo se jogando, a roupa) | 3 | amb | 0,3 | P 10 | [K-RPG] (`cloth`); [FS: body dodge] | CC0 | 6 |
| `critico` (a Lesão Crítica: o osso que estala, o grave "hit-stop" e uma marca de interface curta) | 3 + 1 | amb + ui | 0,6 | P 30 + G | [FS: bone crack]; [K-Iface] | CC0 | 16 |
| `cabeca` (o tiro mirado na cabeça que entrou: o "ping" do capacete ou o estalo seco) | 3 | amb | 0,55 | P 25 | [K-Imp]; [FS: headshot] | CC0 | 8 |
| `suprimido` (a marca "Suprimido!") | 1 | ui, U (o suprimido e o mestre) | 0,35 | U | [K-Iface] | CC0 | 2 |

#### Granadas e explosivos (`explosao`, `modos.mjs:716`; os tipos da munição no catálogo)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `granada.pino` (o pino e a alavanca) | 3 | amb | 0,3 | P 6, em quem lança | [FS: grenade pin] | CC0 | 4 |
| `granada.quique` (1 a 2 batidas no ponto de queda) | 4 | amb | 0,35 | P 15 | [K-Imp] (`impactMetal_light`); [FS: grenade bounce] | CC0 | 6 |
| `explosao.fragmentacao` (estrondo, estilhaços e detritos caindo) | 4 | amb | 0,95 | P 400, abafa na parede | [FS: explosion] (tommccann "Explosion_01", [235968][fs-expl]); [BSB]; [K-SciFi] (`lowFrequency_explosion`) | CC0 | 100 |
| `explosao.grave` (camada de grave para todos na cena, baixa) | 2 | amb | 0,3 | G | gerada do estrondo (lowpass a 120 Hz) | | 0 |
| `explosao.incendiaria` ("whoomp" e o fogo estalando, 3 s) | 3 | amb | 0,85 | P 300 | [FS: fire whoosh]; [FS: fire crackle] | CC0 | 80 |
| `fogo.loop` (o alvo em chamas, `incendiar`; enquanto o efeito durar, fraco) | 2 | amb | 0,2 | P 10, segue o token | [FS: fire loop] | CC0 | 60 |
| `explosao.fumaca` (o "pop" e o chiado de 4 s) | 2 | amb | 0,5 | P 80 | [FS: smoke grenade hiss] | CC0 | 40 |
| `explosao.flashbang` (o estalo seco e agudo) | 3 | amb | 1,0 (limitado) | P 300 | [FS: flashbang]; [BSB] | CC0 | 30 |
| `flashbang.zumbido` (o zumbido de 3 a 6 s com o resto do mix abafado; **só para quem ficou com o Ouvido danificado**; quem tem proteção dos ouvidos não ouve) | 2 | ui, U | 0,35 | U | FS: Kinoton "Tinnitus 10kHz" ([419748][fs-tin1]); Klangkobold ([455304][fs-tin2]) | CC0 | 30 |
| `explosao.emp` (o estalo elétrico, o "power-down" e os eletrônicos chiando) | 3 | amb | 0,8 | P 200 | [K-SciFi]; [K-Digital]; [FS: emp] | CC0 | 50 |
| `emp.desligou` (o cyberware que ficou inoperante, no dono) | 2 | ui, U | 0,4 | U | [K-Digital] (`powerDown`) | CC0 | 6 |
| `explosao.gas` (lacrimogêneo, veneno, biotoxina, sonífera: o "pop" e o chiado) | 2 | amb | 0,45 | P 60 | [FS: gas hiss] | CC0 | 30 |
| `explosao.perfurante` (granada e foguete AP: estalo mais seco) | 2 | amb | 0,9 | P 400 | os da fragmentação, com o EQ | | 0 |
| `explosao.aracnideo` (Arachnid: as patinhas mecânicas) | 2 | amb | 0,5 | P 40 | [FS: mechanical skitter] | CC0 | 20 |
| `explosao.shuriken` (Shuriken Tornado: as lâminas girando) | 2 | amb | 0,6 | P 60 | [FS: spinning blades] | CC0 | 24 |
| `explosao.veiculo` (o veículo destruído) | 2 | amb | 1,0 | P 500 | [FS: car explosion] | CC0 | 60 |

#### Briga, armas brancas e cyberarmas

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `briga.soco-leve` / `briga.soco-forte` | 5 + 4 | amb | 0,45 / 0,55 | P 15 | [K-Imp] (`impactPunch_medium`, `impactPunch_heavy`); [FS: punch] | CC0 | 20 |
| `briga.chute` | 4 | amb | 0,5 | P 15 | [K-Imp]; [FS: kick body] | CC0 | 10 |
| `briga.golpe-no-ar` (o golpe que errou) | 4 | amb | 0,3 | P 10 | [K-RPG] (`swish`); [FS: whoosh punch] | CC0 | 6 |
| `briga.bloqueio` (antebraço e escudo) | 3 | amb | 0,45 | P 15 | [K-Imp] (`impactSoft_heavy`) | CC0 | 6 |
| `briga.agarrao` (a roupa, o tranco: `agarrao.mjs`) | 3 | amb | 0,35 | P 10 | [K-RPG] (`cloth`); [FS: grab struggle] | CC0 | 9 |
| `briga.queda` (arremessado ao chão, caído) | 4 | amb | 0,5 | P 20 | [FS: body fall] | CC0 | 14 |
| `briga.artes-marciais` (os movimentos: o soco e o chute com um "estalo" de pano mais limpo) | 4 | amb | 0,5 | P 15 | os mesmos, com o pitch e o EQ | | 0 |
| `lamina.corte` (faca, machete, katana: o "whoosh" e o corte) | 5 | amb | 0,5 | P 15 | [K-RPG] (`knifeSlice`, `chop`); [FS: sword slash flesh] | CC0 | 20 |
| `lamina.metal` (o corte que a armadura segurou: o clangor) | 4 | amb | 0,5 | P 20 | [FS: sword clang] | CC0 | 12 |
| `contundente.madeira` / `contundente.metal` (taco, cano, marreta) | 4 + 4 | amb | 0,55 | P 20 | [K-Imp] (`impactWood`, `impactMetal_heavy`) | CC0 | 20 |
| `motosserra` (o arranque e o corte, 1,5 s) | 2 | amb | 0,7 | P 60 | [FS: chainsaw] | CC0 | 30 |
| `bastao-eletrico` (Stun Baton: o zap) | 3 | amb | 0,5 | P 15 | [K-Digital] (`zap`) | CC0 | 8 |
| `mono.zumbido` (Kendachi Mono: o fio do monofilamento vibrando, e o corte limpo) | 3 | amb | 0,45 | P 15 | [K-SciFi]; [FS: high whoosh] | CC0 | 10 |
| `monowire` (o chicote que assobia e corta) | 4 | amb | 0,5 | P 20 | [FS: whip crack] + um agudo sintético | CC0 | 12 |
| `mantis.abrir` (as lâminas saem do antebraço: "shing" e o servo) | 2 | amb | 0,45 | P 15 | [FS: blade unsheath]; [K-SciFi] | CC0 | 8 |
| `mantis.corte` | 4 | amb | 0,55 | P 20 | `lamina.corte` com a camada metálica | | 8 |
| `gorilla.soco` (o servo zunindo e o impacto pesado e metálico) | 4 | amb | 0,65 | P 25 | [K-Imp] (`impactPunch_heavy` + `impactMetal_heavy`); [FS: servo] | CC0 | 16 |
| `projetil.cyberbraco` (Projectile Launch System: o "thunk") | 2 | amb | 0,55 | P 100 | `tiro.lanca-granadas` com o pitch acima | | 0 |
| `escudo-humano` (o refém puxado: a roupa e o gemido abafado; **sem voz**, decisão) | 2 | amb | 0,4 | P 15 | [K-RPG] (`cloth`) | CC0 | 6 |

#### Vida e morte, cura e drogas

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `morte.batimento` (Death Save rolado: 2 a 3 batidas, mais rápidas se a penalidade é alta) | 3 | ui, U (o dono e o mestre) | 0,45 | U | [FS: heartbeat] | CC0 | 20 |
| `morte.passou` (passou o Death Save: o fôlego e o bip estável) | 2 | ui, U | 0,35 | U | [FS: gasp breath]; [K-Iface] | CC0 | 8 |
| `morte.flatline` (morreu: o bip contínuo do monitor; a mesa inteira ouve) | 1 | ui, G | 0,4 | G | gerado (um seno de 1 kHz; sem licença) | próprio | 10 |
| `mortalmente-ferido.loop` (opcional: o batimento fraco enquanto o dono está Mortalmente Ferido) | 1 | ui, U | 0,15 | U | [FS: heartbeat slow] | CC0 | 40 |
| `cura.injetor` (Speedheal, Stim, airhypo: o chiado) | 3 | amb | 0,35 | P 8 | [FS: injection hiss] | CC0 | 9 |
| `cura.estabilizar` (o medscanner e o bip) | 2 | amb | 0,3 | P 8 | [K-Iface] (`confirmation`) | CC0 | 4 |
| `droga.usar` (Black Lace, Smash e as outras: o inalador e o comprimido) | 3 | amb | 0,3 | P 6 | [FS: inhaler]; [FS: pills] | CC0 | 9 |
| `cryo.estase` (a estase: o gelo e o compressor) | 1 | amb | 0,35 | P 10 | [FS: freezer hiss] | CC0 | 16 |

#### Cyberware

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `sandevistan.ligar` (o "whoom" descendo; **no dono**, o barramento cai 30% de pitch e abafa por 1,5 s; os outros ouvem só um "zip") | 2 + 2 | ui (U o dono) + amb (P 15) | 0,5 | U + P | [K-SciFi]; [FS: time slow] | CC0 | 30 |
| `sandevistan.desligar` (o tempo voltando) | 2 | ui, U | 0,4 | U | o mesmo, invertido | | 0 |
| `kerenzikov` (o tique e o "whoosh" curto da esquiva) | 2 | amb | 0,4 | P 15 | [K-SciFi]; [K-Iface] (`tick`) | CC0 | 6 |
| `berserk.ligar` (o batimento acelerado e o rugido distorcido, sem voz humana) | 2 | amb | 0,6 | P 30 | [FS: heartbeat fast]; [FS: distorted roar] | CC0 | 30 |
| `reflex-tuner` (o +1 na esquiva depois de atingido: um bip) | 1 | ui, U | 0,3 | U | [K-Iface] | CC0 | 2 |
| `camuflagem-otica` (o brilho que some) | 2 | amb | 0,3 | P 10 | [K-SciFi] | CC0 | 10 |
| `smartlink.conectar` (a arma Smart conectada) | 1 | ui, U | 0,3 | U | [K-Iface] | CC0 | 2 |

#### NET (`net.mjs`, `netrun/`)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `net.entrar` / `net.sair` (jack in e jack out) | 2 + 2 | ui, U (o netrunner e o mestre) | 0,4 | U | [K-Digital]; [K-SciFi] (`computerNoise`) | CC0 | 20 |
| `net.andar` (descer um andar) | 3 | ui, U | 0,3 | U | [K-Iface] (`scroll`) | CC0 | 4 |
| `net.programa` (rodar um programa, o ataque) | 4 | ui, U | 0,4 | U | [K-Digital] (`zap`, `phaser`) | CC0 | 10 |
| `net.quickhack` (no alvo, se for jogador: o chiado de "glitch" curto) | 3 | ui, U (o netrunner, o alvo e o mestre) | 0,4 | U | FS: funkymuskrat "Hackbreach" ([233079][fs-hack]); Alex_hears_things "Digital Data Stream" ([789056][fs-data]); [K-Iface] (`glitch`) | CC0 | 16 |
| `net.senha-ok` / `net.senha-falhou` (Backdoor, Eye-Dee: o sucesso e a falha) | 2 + 2 | ui, U | 0,35 | U | [K-Iface] (`confirmation`, `error`) | CC0 | 6 |
| `net.black-ice` (o Black ICE aparece: o alarme distorcido) | 2 | ui, U | 0,5 | U | [K-SciFi]; [FS: alarm glitch] | CC0 | 20 |
| `net.black-ice-ataca` (a estática e o "zap" no cérebro) | 3 | ui, U | 0,5 | U | [K-Digital]; [FS: static burst] | CC0 | 16 |
| `net.flatline` (o netrunner frito: o estouro de estática que cai num silêncio) | 1 | ui, U (+ o mestre) | 0,55 | U | gerado das duas acima | | 12 |
| `net.alarme` (o alarme do prédio quando a NET dispara: um loop de 6 s, posicional, até o mestre desligar; o mestre pode pôr um AmbientSound) | 2 | amb | 0,35 | P 40, no nó de controle | [FS: security alarm] | CC0 | 90 |
| `net.porta` / `net.camera` / `net.torre` (os nós de controle: `ROADMAP.md:134`, as portas e as luzes da cena) | 3 | amb | 0,35 | P 15 | [K-SciFi] (`doorOpen`); o núcleo também tem `public/sounds/doors` | CC0 / Foundry | 12 |

#### Veículos (o C15 e o C46)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `veiculo.partida` | 2 | amb | 0,5 | P 40 | [FS: car start] | CC0 | 30 |
| `veiculo.batida` (o dano no SDP pela colisão) | 3 | amb | 0,8 | P 150 | [FS: car crash] | CC0 | 50 |
| `veiculo.pneus` (a manobra, o "drift") | 2 | amb | 0,5 | P 80 | [FS: tire screech] | CC0 | 30 |
| `veiculo.motor-loop` (opcional, só no veículo em movimento) | 2 | amb | 0,25 | P 40 | [K-SciFi] (`engineCircular`); [FS: engine loop] | CC0 | 80 |

#### Interface (o `interface`; quase tudo sem posição)

| Evento | Var. | Canal | Vol. | Posição | Fonte | Licença | KB |
|---|---|---|---|---|---|---|---|
| `ui.sua-vez` / `ui.proximo` / `ui.inicio-combate` (o tema "Night City" em `CONFIG.Combat.sounds`) | 2 + 2 + 2 | ui | (o núcleo toca a 1; o arquivo já vem baixo) | G | [K-Iface]; [K-UI]; [K-Digital] | CC0 | 16 |
| `ui.ataque-recebido` (abriu a janela "Ataque!" do alvo: um alerta **só para o dono do alvo**) | 2 | ui, U | 0,4 | U | [K-Iface] (`question`, `bong`) | CC0 | 4 |
| `ui.dado` (a rolagem no chat: troca o `CONFIG.sounds.dice`; com o Dice So Nice, fica o som dele) | 3 | ui | 0,35 | G | [K-Iface]; o núcleo tem `public/sounds/dice.wav` | CC0 | 8 |
| `ui.critico-10` / `ui.falha-1` (o 10 e o 1 naturais) | 1 + 1 | ui | 0,35 | G (quem vê a rolagem) | [K-Iface] (`confirmation`, `error`) | CC0 | 3 |
| `ui.desfazer` (o "Desfazer" do mestre) | 1 | ui, U (o mestre) | 0,3 | U | [K-Iface] (`back`) | CC0 | 1 |
| `ui.loja` / `ui.eurodolar` (a compra, o extrato) | 2 | ui, U | 0,3 | U | [K-Casino] (o tilintar), [K-Iface] | CC0 | 4 |

**O total da tabela:** uns 130 eventos, cerca de 420 arquivos, cerca de 3,0 a 3,5 MB em Opus. Com a margem de 50% para
as caudas mais longas e os loops, a estimativa é de **cerca de 5 MB**. Com a cópia AAC (item 7.1), **cerca de 12 MB**.

### 3.4 Os modos de tiro

| Modo (`R.classificar`) | O que toca | Detalhes |
|---|---|---|
| `tiro` / mirado | o corpo, a cauda e a cápsula (50% das vezes) | O mirado toca antes um "respiro" curto (opcional). |
| `ricochete` (Power) | o corpo, depois o `power.ricochete` no ponto e o impacto | O ricochete sai a cerca de 120 ms do disparo. |
| `cartucho` | o corpo da espingarda e o cartucho (plástico) | Os impactos de vários alvos no leque, espaçados de 30 ms. |
| dois canos (Palica, Testera) | dois corpos a 25 ms, uma cauda | |
| `autofogo` (10 balas; a Lexington, 7) | N corpos na **cadência da classe**, a cauda no último tiro, a cápsula a cada 3 | As cadências estão no item 5.2. |
| `supressivo` (10 balas, `modos.mjs:769`) | o mesmo do autofogo, **mais baixo e varrendo** | O item 5.3 explica. |
| `explosivo` | o disparo do lança (o "thunk" ou a partida do foguete), o voo (o foguete), o quique (a granada) e a explosão pelo tipo da munição | O tempo de voo segue a distância: a granada a 15 m/s (no máximo 1,5 s), o foguete a 60 m/s. |
| `arremesso` | o `granada.pino`, o `tiro.arremesso` e o quique, ou a arma branca girando | |
| Rajada Tech, carga Tech | o `tech.carga` ao carregar (`alternarCarga`, `combate.mjs:218`) e o `tech.disparo` | "Carga silenciosa" tira o `tech.carga`. |
| Smart | o `smart.trava` por alvo (só quem atira), o `smart.disparo` e o `smart.curva` no alvo | |
| `corpo` | o golpe no ar no clique; o impacto pelo resultado | No acerto, o golpe no ar não toca (o impacto o substitui). |

---

## 4. A arquitetura

### 4.1 O barramento "Efeitos de combate" em cada navegador

```
Sound (SomDeEfeito, com o playbackRate) → [StereoPanner] → [lowpass do muffled] → gainNode do Sound
   → destination = barramento.entrada (GainNode: o volume "Efeitos de combate" deste navegador)
   → DynamicsCompressor (limiar −14 dB, razão 4, ataque 3 ms, soltura 150 ms; um limitador)
   → [lowpass global, para o zumbido do flashbang e o Sandevistan]
   → game.audio.environment.gainNode (o volume "Ambiente" do jogador)
```

- O barramento nasce no primeiro gesto (`game.audio.unlock.then(...)`, `helper.mjs:27`) e tem uma cópia para o
  `interface` (a interface e a NET).
- O `Sound#destination` é público (`sound.mjs:212-215`) e o `_createNodes` não o troca se ele já existe
  (`sound.mjs:949`): basta pôr `som.destination = barramento.entrada` antes do `play`.
- **A configuração nova, de cada cliente** (as do Foundry continuam):
  - **"Volume dos efeitos de combate"** (`scope: 'client'`, `Number`, `range: {min: 0, max: 1, step: 0.05}`, padrão
    0,7); o `onChange` muda o ganho do barramento na hora;
  - **"Sons de combate"**: "Todos", "Sem os intensos" (sem o zumbido do flashbang, o filtro do Sandevistan e o
    batimento contínuo: acessibilidade, para quem tem hiperacusia ou zumbido de verdade) e "Nenhum";
  - **"Abaixar a música nas explosões"** (ducking): ligado ou desligado.
- **A configuração do mundo, do mestre:**
  - **"Sons na mesa"**: "Posicional (distância e paredes)", "Para todos (sem posição)" ou "Desligado". Ela fica junto
    de "Efeitos na mesa" (`configuracoes.mjs:71`), que hoje só fala do texto e da animação;
  - **"Os tiros dos tokens escondidos"**: "Só o mestre ouve" ou "Todos ouvem, sem a posição"; decisão do usuário,
    item 11.

### 4.2 O posicional sem as armadilhas do núcleo

O `Sound#playAtPosition` (`sound.mjs:481-518`) dá o volume 1 ao mestre e ao próprio atirador (a armadilha 1) e não
tem pan. A proposta reaproveita as peças dele, sem a função:

1. cria o `new CONFIG.Canvas.soundSourceClass({object: null})` e o `initialize({x, y, elevation, radius, walls:
   false})`, como `sound.mjs:487-495`;
2. ouvintes: `canvas.sounds.getListenerPositions()` (`sounds.mjs:170-196`); o mestre sem token controlado usa o
   centro da tela (`canvas.stage.pivot`), não a origem do som;
3. o volume: o maior `volume × source.getVolumeMultiplier(ouvinte)` (`point-sound-source.mjs:92-109`), **sem** o
   "volume 1 na posição exata"; o atirador ouve o próprio tiro a 100% do volume da camada, e nunca acima dele;
4. o abafado: `CONFIG.Canvas.polygonBackends.sound.testCollision(ouvinte, origem, {mode: 'closest', type:
   'sound'})`, como `sounds.mjs:283-286`; abafado, um `lowpass` de intensidade 6 e −4 dB;
5. o pan: `(origem.x − ouvinte.x) / raio`, limitado a ±0,6 (nunca o som todo num ouvido só);
6. o fallback, decisão do usuário: o jogador **sem ouvinte** (sem token na cena, ou a Visão do Token sem fonte de
   visão, `sounds.mjs:186`) ouve o tiro "para todos", a 50%, sem posição. Assim quem só assiste não fica no silêncio.

Esta é a única parte que copia lógica do núcleo. O risco é que um Foundry 14.x mude o `soundSourceClass`. O G4
confere o volume calculado (item 8).

### 4.3 O evento pelo socket

- O mestre e quem ataca mandam **o evento, não o arquivo**:
  `{tipo: 'som', evento: 'tiro', perfil: 'rifle-assalto', modo: 'autofogo', balas: 10, silenciada: false,
  origem: {cena, x, y, elevation}, alvo: {x, y}, resultado: 'carne', para: null | [ids], semente}`.
- Ele vai pelo socket do sistema (`CANAL`, o mesmo do `{tipo: 'texto'}` em `combate/socket.mjs:123`).
- Cada cliente:
  - confere a cena (`canvas.scene?.id === origem.cena`; quem está noutra cena não ouve, item 6.4);
  - confere o `para` e o `game.audio.locked` (travado, descarta);
  - escolhe a variação pela `semente` (todos ouvem a mesma variação, o que importa no "foi o mesmo tiro?");
  - aplica o volume dele, a distância e as paredes, e toca.
- **Quem manda o quê:**
  - **o disparo, a mecânica e a cápsula:** o navegador de quem ataca, em `atacar`, logo depois do `testar`
    (`combate.mjs:175`); ele toca local e emite. Assim o clique responde na hora, sem esperar o mestre nem a defesa;
  - **o impacto, a explosão, o "Suprimido!", o crítico e a morte:** o mestre, em `mostrarNaMesa`
    (`cartao.mjs:79-89`), ao lado do texto, porque só ele sabe o resultado.
  - **O vazio, a recarga e o equipar:** quem clica.
  - **A NET:** o mestre ou o netrunner, com o `para`.
- **O tempo entre o disparo e o impacto:** a janela de defesa do alvo (o Fluxo de Combate) pode levar segundos entre
  os dois. Decisão do usuário, item 11:
  - a) o disparo no clique e o impacto na resolução (recomendado: a mesa ouve que alguém atirou e espera o "Esquivou!");
  - b) os dois na resolução, sincronizados com a animação do fx-visual (mais cinema, mas o clique fica mudo).
- **Com "Esconder o total do ataque"** (`config('escondeAtaque')`), o disparo não revela nada; o impacto só sai com o
  cartão.

---

## 5. A mixagem

### 5.1 As vozes e a prioridade

- **O teto:** 16 vozes nossas tocando ao mesmo tempo, contadas numa lista própria (as do Foundry, a música e os
  AmbientSounds, ficam fora). No celular, 10.
- **O teto por categoria:** tiro 8, impacto 4, cápsula 2, explosão 2, interface 3, NET 3.
- **A prioridade**, quando falta voz: explosão > crítico e morte > tiro > impacto > a mecânica e a cápsula > a
  interface. Sai a voz mais antiga e de menor prioridade, com um fade de 30 ms (sem estalo).
- **A cauda:** no máximo 2 ao mesmo tempo. A terceira corta a mais antiga.
- **A repetição:** o mesmo evento até 2 vezes em 40 ms vira 1 (por exemplo, o socket e o local juntos).

### 5.2 O pitch, o volume e a variação aleatórios

- A variação é sorteada **sem repetir a última**, pela semente.
- O pitch (`playbackRate`) é por categoria:
  - tiro ±3% (cerca de ±0,5 semitom);
  - impacto e briga ±7%;
  - cápsula ±10%;
  - explosão ±2%;
  - a interface e a NET: 0 (a interface precisa ser previsível).
- O volume varia ±1,5 dB por toque.
- **As cadências do autofogo** (o intervalo entre os corpos, com ±8 ms de folga):

| Classe | Cadência | Intervalo | 10 balas duram |
|---|---|---|---|
| SMG | cerca de 900 tpm | 67 ms | 0,6 s |
| SMG pesada | cerca de 750 tpm | 80 ms | 0,7 s |
| Rifle de assalto | cerca de 650 tpm | 92 ms | 0,8 s |
| Espingarda automática | cerca de 300 tpm | 200 ms | 1,8 s |
| Metralhadora montada | cerca de 550 tpm | 110 ms | 1,0 s |
| A Power, a Tech e a Smart | a da classe, ×0,9 / ×1,1 / ×1,2 | | |
| Pistola com autofogo (a Lexington, 7) | 1100 tpm | 55 ms | |

- Na rajada, o corpo encurta (fade em 60 ms) para os tiros não se encavalarem, e só o último toca inteiro, com a
  cauda.
- O mesmo arquivo, com o pitch e o volume variados a cada bala, já não soa como máquina.

### 5.3 O fogo supressivo de 10 tiros

1. Ele usa a cadência do autofogo da arma, **−5 dB por tiro** em relação ao tiro único (10 corpos somados soam cerca
   de 6 dB mais altos que um).
2. O pan varre a área (de −0,5 a +0,5 em 10 passos), com 3 impactos espalhados no chão e no concreto
   (`erro.chao`, `impacto.cobertura.*`) nos 25 m (`R.RAIO_SUPRESSAO`).
3. Ele termina com uma cauda só, um pouco mais longa (o "galpão" ou o "externo").
4. O compressor do barramento segura o pico. O limitador não deixa passar de −1 dBFS.
5. O "Suprimido!" toca, para quem perdeu, só depois da rajada.

### 5.4 O ducking

- Uma explosão, um flashbang ou um crítico abaixam a **música** (o contexto `music`) em −6 dB por 1,2 s e a trazem de
  volta em 0,8 s.
- Faz-se pelo `game.audio.music.gainNode.gain.setTargetAtTime(...)`. A volta lê de novo o
  `game.settings.get('core', 'globalPlaylistVolume')`, para não desfazer uma mudança que o jogador fez no meio.
- Os tiros não abaixam a música: num tiroteio de 3 rodadas, a música pulsaria.
- O ducking é de cada cliente e desligável (item 4.1).

### 5.5 Os níveis (a sensação, com o barramento a 0,7)

| Grupo | O pico | Comentário |
|---|---|---|
| Explosão, flashbang | o mais alto (o limitador segura) | Nunca acima do primeiro tiro de rifle mais 3 dB. |
| Os tiros | cerca de −6 dB da explosão | O rifle e a muito pesada no topo; a pistola média e a smg 3 dB abaixo. |
| Os impactos, a briga | cerca de −10 dB | |
| A mecânica, a cápsula | cerca de −20 dB | Um detalhe, não um evento. |
| A interface, a NET | cerca de −18 dB | Abaixo da voz do mestre no Discord. |

- **O alvo:** a explosão no pico não deve ficar mais alta que a voz do mestre na chamada.
- A mesa joga com voz (Discord ou o A/V do Foundry): o volume padrão é **baixo de propósito**. Melhor o jogador subir
  do que tirar o fone na primeira granada.

### 5.6 O volume de cada jogador, em resumo

Volume final = a camada (a tabela) × a variação × a distância e o abafado × **"Efeitos de combate"** (nosso, do
cliente) × **"Ambiente"** ou **"Interface"** (os do Foundry, do cliente) × o mudo geral do Foundry
(`game.audio.globalMute`, `helper.mjs:162-176`).

---

## 6. Quem ouve

### 6.1 Global ou posicional

- **Posicional** (o padrão do mundo): os tiros, os impactos, as explosões, a briga, os veículos e o alarme. O raio de
  cada um está na tabela. A grade da mesa é em metros, e o `radius` do `initialize` se multiplica por
  `canvas.dimensions.distancePixels` (`sound.mjs:492`).
- **Global** (para todos na cena): a camada de grave da explosão (`explosao.grave`), o flatline da morte e a
  interface do combate.
- **Só alguns usuários** (`para`): a NET, o zumbido do flashbang, o batimento do Death Save, o Sandevistan (do dono), a
  trava Smart, o "Ataque!" do alvo e o "Suprimido!".

### 6.2 As paredes

- O tiro e a explosão **atravessam abafados** (`walls: false` com o `lowpass`).
- A briga, a cápsula e a recarga **param na parede** (`walls: true`: são baixos, não se ouvem do outro lado).
- As portas do Foundry entram no teste de colisão do som: a porta fechada abafa.

### 6.3 O silenciador

- **O RED não tem um acessório de silenciador no catálogo.** A única coisa parecida é a "Carga silenciosa"
  (`mods-armas:carga-silenciosa`), que só tira o brilho e o zumbido da carga Tech.
- O silencioso fica então como **um campo de som na arma** ("Silenciada"), ou como um acessório novo. A regra é do
  rpg-mecanicas e do usuário: decisão, item 11.
- **O som:** ele troca o corpo por `tiro.silenciado.<tipo>`, a cauda vira 20% e o raio cai para 25 m (de 150 a 500). A
  cápsula e o ferrolho continuam (o mecanismo faz barulho).

### 6.4 O jogador fora da cena e o token escondido

- **Fora da cena:** o jogador que está noutra cena (`canvas.scene.id`) não ouve os sons dela, nem os posicionais nem
  os globais. Só a NET e o batimento dele chegam (o `para`), porque são dele.
- **O token escondido:** o token escondido do mestre (o atirador de tocaia) é decisão do usuário, item 11:
  - padrão: só o mestre ouve o disparo, e os jogadores ouvem o impacto onde a bala chegou;
  - opção: todos ouvem o disparo **sem posição e abafado** (sabem que alguém atirou, mas não de onde).
  - O `animar` de hoje já pula o token escondido (`cartao.mjs:87`).

### 6.5 A NET, só para o netrunner

- O `para` leva o dono do netrunner, o mestre e, no quickhack, o dono do alvo.
- O resto da mesa ouve no máximo o `net.alarme`, quando o prédio dispara (posicional, no nó de controle da cena).

---

## 7. O formato, a normalização e o peso

### 7.1 O formato

- **Os masters:** WAV 48 kHz, 24 bits, mono, **fora do git**. Eles ficam numa pasta do usuário, por exemplo
  `Documentos\Cyberpunk RPG\sons-masters\`, com um `fontes.csv` (o arquivo, o autor, o link, a licença e a data da
  conferência).
- **No sistema:** Opus mono, 64 kbps, em `.webm` (`audio/webm`). Para as caudas e os loops, 48 kbps bastam.
  - Por que mono: o posicional e o pan são nossos; o estéreo dobraria o peso e brigaria com o pan.
  - Por que Opus e não MP3: o MP3 tem 25 a 50 ms de silêncio no começo (o "padding" do codificador), e o tiro atrasa;
    o Opus não.
- **A cópia `.m4a` (AAC, 80 kbps)** é para o Safari:
  - o `Sound#_load` do Foundry abre primeiro um `<audio>` para ler a duração (`sound.mjs:390-392`, `896-907`), e falha
    se ele não toca o formato;
  - o Opus no Safari só ficou consistente no WebM a partir do Safari 17.4, e o Ogg Opus continua sem garantia;
  - o motor escolhe uma vez: `new Audio().canPlayType('audio/webm; codecs="opus"')` vazio, vai o `.m4a`.
  - **Se ninguém da mesa joga no iPhone nem no Mac com o Safari, a cópia AAC sai** (decisão, item 11). A mesa joga no
    Foundry 14, que já é ruim no celular.
- **O nome dos arquivos:** `sons/<grupo>/<evento>-<n>.webm`, por exemplo `sons/tiro/rifle-assalto-corpo-3.webm`. O
  `sons/banco.json` diz as camadas, as variações, o volume, a categoria e o raio de cada evento (o `regras-sons.mjs`
  lê esse índice; o G3 confere que todo arquivo citado existe e que todo arquivo da pasta está citado).

### 7.2 A normalização

Ela é por categoria, não "tudo igual". O pico de verdade fica em **−1 dBTP** em todos. O LUFS integrado não serve para
um tiro de 0,3 s, então a medida é o **pico de loudness momentânea (LUFS-M máx.)**, com o `ffmpeg -af ebur128=peak=true`:

| Categoria | LUFS-M máx. | Comentário |
|---|---|---|
| explosão | −10 | |
| tiro (o corpo) | −12 | |
| a cauda | −20 | |
| impacto, briga | −16 | |
| mecânica, cápsula | −24 | |
| interface | −24 | |
| NET | −20 | |
| os loops (alarme, fogo, batimento) | −24 LUFS integrado | |

- **O roteiro:** um `build/sons.mjs` (Node), rodado no PC do usuário com o ffmpeg dele:
  - lê os masters e o `fontes.csv`;
  - aplica o filtro passa-alta de 40 Hz, o corte do silêncio (`silenceremove`), o fade de 5 ms, o mono e o ganho até
    o alvo da categoria;
  - gera o `.webm` (com `-application audio`, e `-frame_duration 10` nos tiros, para o ataque ficar preciso) e o `.m4a`;
  - escreve o `banco.json`.
- O ffmpeg não entra no repositório nem no servidor: o servidor só recebe os arquivos prontos pelo git.

### 7.3 A pré-carga

- **Antes do gesto:** o motor faz o `fetch()` dos arquivos para o cache HTTP do navegador; o `fetch` não precisa de
  gesto. O decode espera o `game.audio.unlock`, porque o `Sound#load` aguarda o desbloqueio (`sound.mjs:338-341`).
- **Ao abrir a cena** (`canvasReady`): o motor pré-carrega o núcleo dela:
  - as armas **equipadas** pelos atores com token na cena (o perfil de cada uma: o corpo e a cauda);
  - os impactos comuns, o vazio e a interface.
  - São cerca de 40 a 70 arquivos, uns 0,5 a 0,9 MB de download e uns 8 a 14 MB de PCM decodificado na memória (o
    cache do Foundry aceita 1 GB, `helper.mjs:59`). As explosões entram quando há granada ou lança carregado.
- **O resto** carrega no primeiro uso. O primeiro tiro de uma arma rara pode atrasar uns 100 a 300 ms; o motor toca
  então o corpo genérico da classe, que já está carregado.
- **Não use o `game.audio.preload(src)`** (`helper.mjs:275-279`): ele emite um `preloadAudio` a todos os clientes, por
  arquivo.

### 7.4 O peso e a banda

| Conjunto | Arquivos | Opus | Com a cópia AAC |
|---|---|---|---|
| MVP (fase A) | cerca de 120 | cerca de 1,5 MB | cerca de 3,5 MB |
| Completo | cerca de 420 | cerca de 5 MB | cerca de 12 MB |
| O que um jogador baixa numa sessão típica | | cerca de 1 a 2 MB (o cache do navegador guarda) | |

- **O servidor** (Oracle, 1 GB de RAM): os arquivos são estáticos, servidos pelo Foundry. Não pesam na RAM; no disco,
  ocupam os 5 a 12 MB.
- **O git:** os 5 a 12 MB de binário estão bem, mas cada troca de som soma no histórico. Por isso os masters não entram
  nele, e só a versão final de cada som entra.
- O sistema hoje tem 5,4 MB: o banco dobra o tamanho dele.

### 7.5 O autoplay bloqueado e o iPhone

- O Foundry já trata o bloqueio: os contextos nascem no primeiro gesto (`helper.mjs:629-650`).
- O nosso motor:
  - com `game.audio.locked`, **descarta** o evento (não deixa enfileirar: a armadilha do item 2);
  - mostra, uma vez, no canto: "Clique na mesa para ligar o som" (o jogador que entrou e não clicou ainda);
  - ouve o `statechange` de cada `AudioContext` e chama o `resume()` no próximo `pointerdown`, quando o contexto
    está `suspended` ou `interrupted`. No iOS isso acontece depois de uma ligação ou da aba em segundo plano.
- **O iPhone:**
  - a chave de silencioso do iPhone corta o Web Audio;
  - o `navigator.audioSession.type = 'playback'` (Safari 16.4+, a conferir no aparelho) faz o som tocar mesmo com o
    silencioso ligado; deixe opcional, porque é exatamente o que um jogador com o silencioso **não** quer;
  - o PCM decodificado pesa no celular: lá, o teto de vozes cai para 10 e a pré-carga, para as armas da cena.

---

## 8. Os testes (os portões do AGENTS.md)

- **G3 (`tests/sistema/sons.test.mjs`):**
  - o `regras-sons.mjs` puro escolhe o perfil (a flag, o catálogo, a classe de 2077, o tipo, a perícia) e as camadas
    pelo modo, o resultado e a munição;
  - ele calcula a cadência (10 balas a 92 ms no rifle), o "−5 dB por tiro" do supressivo, a variação sem repetir e o
    pitch dentro da faixa;
  - ele monta o `para` (a NET, o flashbang com e sem a proteção dos ouvidos), o descarte com o áudio travado e o teto
    de vozes com a prioridade;
  - ele confere que todo arquivo do `banco.json` existe e que toda licença do `sons/LICENCAS.csv` é CC0 ou CC-BY.
  - **A mutação:** por exemplo, a cauda em todos os tiros da rajada, ou o silenciador sem mudar o raio; algum teste
    tem de cair.
- **G4 (`tests/cenarios/v14.js`):**
  - um ataque de autofogo, uma granada e um corpo a corpo;
  - a leitura de um registro de depuração do motor (`game.system.api.sons.historico`: o evento, os arquivos, o volume
    calculado, o pan e o `para`), sem precisar ouvir;
  - a conferência de que o mestre não recebe o volume 1 na posição exata (a armadilha 1), de que a parede abafa e de
    que o jogador em outra cena não toca nada.
  - **O Edge do G4** (`tests/lib/edge.js:50`) roda com o `--headless=new`, sem o `--autoplay-policy`. O motor espera o
    gesto; o teste precisa de um clique do CDP antes, ou do `--autoplay-policy=no-user-gesture-required
    --mute-audio`. Mudar o `edge.js` mexe em todos os testes, então a primeira opção é melhor.
- **O instalador:** a pasta `sons` entra em `instalar.mjs:48`, e o teste do instalador confere que ela chega ao
  destino.

---

## 9. O mestre troca o som de uma arma

### 9.1 O campo no item

- Na ficha da arma, na aba **Bancada** (C74) ou em Detalhes, entra um bloco **"Som"**, só para o mestre editar.
- O bloco grava numa flag `flags.cpr-fieldbook.som`, sem mexer no `system`, para não precisar de migração:

| Campo | O que é |
|---|---|
| `perfil` | uma lista com os perfis do `banco.json`: "Pelo tipo (padrão)", "Pistola média"... "Malorian", "Tech (railgun)", "Smart"... |
| `silenciada` | sim ou não (item 6.3) |
| `arquivo` | um caminho personalizado pelo FilePicker do Foundry (pode ser uma pasta com coringa, `sons-da-mesa/minha-arma/*.webm`: cada arquivo vira uma variação) |
| `volume` | de −6 a +6 dB |
| `cadencia` | opcional, em tpm, para o autofogo |
| `cauda` | "Pela cena", "Curta" ou "Nenhuma" |

- Um botão "▶ Ouvir" toca o perfil **só no navegador do mestre**.
- **A ordem:** a flag do item vence o mapa por catálogo, que vence a classe de 2077, que vence o tipo, que vence a
  perícia (item 3.2).
- **Um risco:** quando a wiki reimporta a ficha de um personagem, as flags da arma podem se perder. É preciso conferir
  se a importação (`wiki*.mjs`, a "Na mesa") preserva `flags.cpr-fieldbook.som`. Senão, o mapa por catálogo cobre os
  casos fixos, e a flag fica para os casos de uma arma só.

### 9.2 O mapa por catálogo (uma configuração do mundo)

- A configuração `sonsPorCatalogo` (`scope: 'world'`, `config: false`, `Object`) diz o perfil de um id de catálogo.
  Toda cópia da arma recebe o som, sem editar arma por arma.
- O sistema já vem com o padrão:
  - `core_weapons:malorian-arms-3516` → `pistola-malorian`;
  - `armas-2077:malorian-overture` → `pistola-malorian`;
  - as do Black Chrome com mecanismo próprio, por exemplo a Pepper Shaker.
- Uma janela do mestre ("Sons das armas": a arma, o perfil e o "Ouvir") edita o mapa. Custo: P, se a tabela simples
  bastar.

### 9.3 A Malorian e as armas únicas

- O perfil `pistola-malorian` tem camadas próprias:
  - um corpo grave e enorme (a muito pesada, com o pitch −10% e uma camada de "boom" sintético);
  - um "clank" metálico do ferrolho;
  - uma cauda longa;
  - 3 variações e o volume 0,85.
- Não use o som do jogo Cyberpunk 2077: é da CD Projekt, não se redistribui e não entra no repositório público.
- Arquivos que o usuário comprou (Boom, Soundsnap, Sonniss) e quer usar numa arma única: vão para uma pasta do
  servidor **fora do git**, como a `Data/sons-da-mesa/` do Foundry 14 (que o backup diário precisa levar; conferir no
  `servidor/backup.sh`), e se apontam pelo campo `arquivo` da arma.

---

## 10. As fontes e as licenças

| Sigla | Fonte | Licença | Serve para | Peso do download |
|---|---|---|---|---|
| [K-Imp] | [Kenney, Impact Sounds](https://kenney.nl/assets/impact-sounds), 130 arquivos | CC0 | soco, metal, vidro, madeira, placa | cerca de 5 MB |
| [K-SciFi] | [Kenney, Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds), 70 arquivos | CC0 | laser, motor, explosão de baixa frequência, campo de força | cerca de 3 MB |
| [K-Iface] | [Kenney, Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 | a interface, o erro, o glitch, a confirmação | cerca de 1 MB |
| [K-UI] | [Kenney, UI Audio](https://kenney.nl/assets/ui-audio) | CC0 | os cliques | menos de 1 MB |
| [K-Digital] | [Kenney, Digital Audio](https://kenney.nl/assets/digital-audio) | CC0 | o zap, o phaser, o power-down: Tech, Smart e NET | cerca de 1 MB |
| [K-RPG] | [Kenney, RPG Audio](https://kenney.nl/assets/rpg-audio) | CC0 | a faca, a roupa, o metal, o corte | cerca de 2 MB |
| [K-Casino] | [Kenney, Casino Audio](https://kenney.nl/assets/casino-audio) | CC0 | as moedas, a loja | menos de 1 MB |
| [BSB] | [BigSoundBank (Joseph Sardin)](https://bigsoundbank.com), a [licença](https://bigsoundbank.com/droit.html) | CC0 (o crédito é sugerido, não obrigatório) | gravações de campo: armas, explosões, veículos | por arquivo |
| [OGA-FFSL] | [The Free Firearm Sound Library, no OpenGameArt](https://opengameart.org/content/the-free-firearm-sound-library) (Still North Media, Ben Jaszczak et al.) | **CC0 na listagem do OpenGameArt; conferir** a página e o texto do pacote antes de usar (o site original saiu do ar) | armas reais, de perto e de longe | grande (WAV, centenas de MB) |
| FS | [Freesound](https://freesound.org), **só com o filtro de licença CC0**; o filtro: `https://freesound.org/search/?q=TERMO&f=license:%22Creative+Commons+0%22` | CC0 (cada som se confere na página dele; o filtro mostrou CC0 em 2026-11-26) | tudo; os exemplos estão abaixo | por arquivo |
| CC-BY (Freesound, OpenGameArt) | | CC-BY 3.0/4.0: **pode**, com o crédito em `sons/LICENCAS.csv`, exibido nos créditos do sistema | o que faltar | |
| ~~CC-BY-NC, Sampling+~~ | | **não**: a NC não combina com a GPL do sistema, e a Sampling+ restringe | | |
| ~~Sonniss GDC Bundle~~ | [a licença](https://sonniss.com/gdc-bundle-license/) | royalty-free, sem crédito, uso comercial liberado, mas **proíbe distribuir os sons "como efeitos sonoros"**, isto é, os arquivos soltos | **fora do git.** Pode ir na pasta do servidor (o jogo é o "projeto"), nunca no repositório público | dezenas de GB |
| ~~Pixabay, Mixkit, ZapSplat~~ | | as licenças proíbem redistribuir o arquivo sozinho (ou pedem o crédito e a conta) | não no repositório | |
| ~~Cyberpunk 2077 (o jogo)~~ | | da CD Projekt | nunca | |
| Gerado | o próprio `build/sons.mjs` (o bip do monitor, o seno do flatline, o grave da explosão, o reverb) | próprio (GPL, junto do sistema) | | 0 |
| IA (ElevenLabs Sound Effects e afins) | | depende do plano e dos termos de cada serviço: **conferir** se o arquivo gerado se redistribui | as lacunas (o Sandevistan, o Black ICE) | |

**Os sons do Freesound citados na tabela** (CC0 pelo filtro, 2026-11-26; conferir cada um ao baixar):

[fs-9mm]: https://freesound.org/people/michorvath/sounds/427592/
[fs-20g]: https://freesound.org/people/michorvath/sounds/427595/
[fs-ar15]: https://freesound.org/people/michorvath/sounds/427598/
[fs-m4]: https://freesound.org/people/mnslugger20/sounds/259758/
[fs-hmg]: https://freesound.org/people/ShawnyBoy/sounds/165394/
[fs-44]: https://freesound.org/people/Jon285/sounds/34708/
[fs-expl]: https://freesound.org/people/tommccann/sounds/235968/
[fs-casing1]: https://freesound.org/people/GryffDavid/sounds/318964/
[fs-casing2]: https://freesound.org/people/GrayJoy/sounds/210102/
[fs-casing3]: https://freesound.org/people/Danwardvs/sounds/205126/
[fs-shell]: https://freesound.org/people/JohnDelayniKIng/sounds/147261/
[fs-mag]: https://freesound.org/people/moosegravy/sounds/431830/
[fs-tin1]: https://freesound.org/people/Kinoton/sounds/419748/
[fs-tin2]: https://freesound.org/people/Klangkobold/sounds/455304/
[fs-hack]: https://freesound.org/people/funkymuskrat/sounds/233079/
[fs-data]: https://freesound.org/people/Alex_hears_things/sounds/789056/

- 9 mm: [michorvath, 9mm pistol shot][fs-9mm]
- espingarda: [michorvath, 20 gauge][fs-20g]
- AR15: [michorvath][fs-ar15]
- M4: [mnslugger20][fs-m4]
- metralhadora: [ShawnyBoy][fs-hmg]
- .44: [Jon285][fs-44]
- explosão: [tommccann][fs-expl]
- cápsulas: [GryffDavid][fs-casing1], [GrayJoy][fs-casing2], [Danwardvs][fs-casing3]
- cartucho: [JohnDelayniKIng][fs-shell]
- pente: [moosegravy][fs-mag]
- zumbido: [Kinoton][fs-tin1], [Klangkobold][fs-tin2]
- NET: [funkymuskrat, Hackbreach][fs-hack], [Alex_hears_things][fs-data]

**O arquivo de licenças:** `sons/LICENCAS.csv`, com o arquivo, a fonte, o autor, o link, a licença e a data. É o
mínimo para um repositório público, mesmo com CC0, para saber de onde veio cada som se alguém perguntar. O G3 o
confere.

**Os módulos do Foundry 14 (as referências, não as dependências):**

- [Sequencer 4.x](https://www.patreon.com/fantasycomputerworks/posts/sequencer-4-0-0-156207671): Foundry 13 e 14; o
  som posicional com as paredes, o pan e o `forUsers`
  ([a documentação da seção de som](https://raw.githubusercontent.com/fantasycalendar/FoundryVTT-Sequencer/master/docs/api/sound.md));
  ele já é opcional no sistema (`efeitos.mjs:43-52`).
- [Automated Animations](https://foundryvtt.com/packages/autoanimations): verificado no 14; o som por item, mas pensado
  nos sistemas de D&D; não precisamos dele.
- [GGG: Sequencer Sound DB Collection](https://foundryvtt.com/packages/ggg): verificado no 14; as onomatopeias de
  mangá, não as armas; a licença dos sons não está na página.
- O Dice So Nice: o som dos dados dele vale quando ativo (`dice-so-nice.mjs`); o `ui.dado` só troca o
  `CONFIG.sounds.dice` sem ele.
- A [API de VFX do Foundry 14](https://foundryvtt.com/api/v14/modules/foundry.canvas.vfx.html): experimental, item 2.

**O Safari e o Opus:** [caniuse, Opus](https://caniuse.com/opus); o WebKit
[bug 238546](https://bugs.webkit.org/show_bug.cgi?id=238546) (o WebM Opus consistente só a partir do Safari 17.4); o
[ogg-polyfill](https://npmjs.com/package/@web-media/ogg-polyfill) (o motivo de não usar o Ogg).

---

## 11. As decisões do usuário

1. **Quando o tiro soa:** no clique, com o impacto na resolução (a recomendação), ou tudo na resolução, junto da
   animação? Combinar com o fx-coreografia.
2. **O silenciador existe na mesa?** Como acessório (a regra: o rpg-mecanicas), ou como um campo "Silenciada" que o
   mestre marca? O RED não tem um no catálogo.
3. **O tiro do token escondido:** só o mestre ouve (a recomendação), ou todos ouvem sem a posição?
4. **Quem não tem ouvinte na cena** (o espectador, a Visão do Token sem visão): silêncio, ou tudo "para todos" a 50%
   (a recomendação)?
5. **A morte:** o flatline para a mesa toda (a recomendação), e o batimento do Death Save só para o dono? O loop do
   Mortalmente Ferido fica desligado por padrão?
6. **Os sons "intensos"** (o zumbido do flashbang, o tempo lento do Sandevistan): ligados por padrão, com a opção
   "Sem os intensos" em cada navegador? Alguém da mesa tem zumbido ou sensibilidade a som?
7. **Alguém joga no iPhone ou no Mac com o Safari?** Se ninguém, sai a cópia AAC (−7 MB, −1 etapa no build).
8. **Comprar som?**
   - Um pacote pago (Boom, Soundsnap, o Sonniss gratuito) dá um tiro mais "de cinema", mas fica **só no servidor**,
     fora do git e fora do backup do repositório (o `servidor/backup.sh` precisa levar a pasta).
   - Ou ficar 100% CC0 no repositório (a recomendação para o MVP).
9. **Os sons gerados por IA para as lacunas** (o Sandevistan, o Black ICE, a Malorian): sim ou não, depois de
   conferir os termos.
10. **A voz humana** (os gemidos, os gritos e os grunhidos na briga e na morte): a proposta é **sem voz** (fica
    repetitivo rápido e é o que mais cansa); o usuário decide.
11. **Quem faz a curadoria:** escolher os sons é de ouvido. O agente pode baixar, cortar e normalizar por roteiro, mas
    o "esse tiro soa como uma Malorian" é do mestre. Uma sessão de 1 a 2 horas de audição por fase.
12. **O tema de combate "Night City"** (a sua vez, o próximo, o início) substitui o "Épico" do Foundry? Ele é de cada
    jogador (`core.combatTheme`); o sistema pode só oferecê-lo.

---

## 12. O plano por fases (o custo, o peso e o risco)

| Fase | O que entra | Custo (código) | Curadoria | Peso | Risco |
|---|---|---|---|---|---|
| **A, o motor e o tiro** | o `sons.mjs` e o `regras-sons.mjs`; o barramento, as configurações, o socket do evento, as vozes, o pitch; o `instalar.mjs:48` com a pasta `sons`; o tiro único por tipo do RED (11 perfis), a cauda externa, os impactos genéricos (carne, armadura, erro), o vazio, a recarga; troca o som do Diwako (`efeitos.mjs:53-58`) pelo nosso, deixando o Diwako como opção | **M** | M (uns 120 arquivos) | cerca de 1,5 MB | Baixo. A regra do combate não muda; só se acrescentam chamadas em `combate.mjs:148/175` e em `cartao.mjs:85`. |
| **B, a rajada e as explosões** | o autofogo com a cadência, o supressivo de 10, a cápsula, a granada (o pino, o quique, a explosão por tipo de munição), o lança-granadas, o foguete com o voo, o ducking, o zumbido do flashbang pelo efeito | **M** | M (uns 100) | +1,4 MB | Médio: o tempo e a mixagem precisam de ajuste de ouvido, e o supressivo pode "estourar" sem o limitador. |
| **C, a briga e os materiais** | o soco, o chute, o agarrão, a queda, as lâminas, o contundente, o Mantis, o Gorilla, o Monowire, a motosserra; o impacto por material (escudo, vidro, veículo, cobertura, por `STATUS_COBERTURA` em `combate/apoio.mjs:12` e pelo destino veicular) | **M** | M (uns 80) | +0,8 MB | Baixo a médio: o sistema nem sempre sabe o material da cobertura; o padrão é o concreto. |
| **D, 2077 e as armas únicas** | Power (o ricochete), Tech (a carga, a "Carga silenciosa", o railgun), Smart (a trava, a curva); o campo "Som" na ficha da arma; o mapa por catálogo; a Malorian | **M** | P a M (uns 40) | +0,5 MB | Médio: a flag pode se perder na reimportação da wiki (item 9.1). |
| **E, quem ouve** | o posicional próprio (item 4.2), as paredes e o abafado, o pan, o silenciador, o token escondido, o fallback sem ouvinte; a NET só para o netrunner; o Death Save e o flatline; o cyberware (Sandevistan, Kerenzikov, Berserk); os veículos; o tema de combate; o "Ataque!" do alvo | **G** | M (uns 80) | +0,8 MB | Médio a alto: o posicional copia lógica do núcleo (`sound.mjs:487-507`), e um 14.x novo pode mudar; o G4 o confere. |
| **F, a entrega no navegador** | a cópia AAC e a escolha do formato, o aviso "clique para ligar o som", o `resume()` do iOS, a pré-carga por cena, o modo "Sem os intensos", o teto de vozes no celular | **P** | 0 | +7 MB (se houver AAC) | Baixo. |
| **O roteiro do build** (`build/sons.mjs`: os masters, a normalização, o Opus, o AAC, o `banco.json`, o `LICENCAS.csv`) | junto da fase A | **P** | | | Baixo: o ffmpeg fica no PC do usuário, fora do servidor. |

**No total:** o código é **G** (6 fases M, mais a E, que é G). A curadoria é **G** de horas humanas: cerca de 420
arquivos escolhidos, cortados e nomeados, em 6 a 10 horas de audição com o usuário. O peso fica em **5 MB** em Opus,
ou **12 MB** com a cópia AAC.

---

## 13. Os riscos

1. **O mestre ouvindo tudo no máximo:** a armadilha do `sounds.mjs:268-274` com o `gmAlways`. Ela vale também para a
   VFX nativa (`vfx-single-attack-component.mjs:447`). A correção é o posicional próprio (item 4.2).
2. **A fila do autoplay:** o som pedido antes do primeiro clique toca de uma vez depois (`sound.mjs:338-341`). A
   correção é descartar com `game.audio.locked`.
3. **O Safari:** o formato que o `<audio>` não toca derruba o `Sound#load` (`sound.mjs:390-392`). A correção é a cópia
   AAC, ou a decisão 7.
4. **A licença:** o repositório é público. Um único som do Sonniss, do Pixabay ou do jogo no git é um problema de
   redistribuição. A correção é o `LICENCAS.csv` conferido pelo G3; nenhum arquivo entra sem a linha dele.
5. **O cansaço:** o som demais em toda rolagem cansa em 20 minutos. A correção:
   - o volume padrão baixo;
   - nada de som em cada rolagem de perícia (só no combate, na NET e no crítico);
   - o modo "Nenhum" em cada navegador;
   - a interface quase muda.
6. **A voz da mesa:** a mesa conversa por voz, e a explosão alta por cima do mestre atrapalha. A correção é o limitador
   do barramento e o padrão 0,7 × 0,5 do "Ambiente".
7. **O desempenho no celular:** o PCM decodificado e as muitas vozes. A correção é a pré-carga por cena e o teto de 10.
8. **A mudança no núcleo:** o `soundSourceClass`, o `getListenerPositions` e o `Sound#destination` são do 14.369. A
   correção é o G4 conferir o volume calculado a cada atualização do Foundry.
9. **A flag do som perdida na reimportação da wiki** (item 9.1). A correção é o mapa por catálogo como rede.
10. **O instalador:** sem a pasta `sons` na lista de `instalar.mjs:48`, nada chega à mesa, e o erro só aparece no
    servidor. A correção é o teste do instalador.
11. **O tamanho do git:** trocar som muitas vezes infla o histórico. A correção são os masters fora do git e um ciclo
    só para cada leva de sons.

