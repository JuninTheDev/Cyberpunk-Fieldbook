# Efeitos na mesa: a coreografia e a arquitetura (fx-coreografia)

Base: a cópia do `origin/master` 725911b6 (ciclo 214; o último item do ROADMAP é o C76; o C75 está `[~]` com a KouArt) e
o Foundry 14.369 em `%LOCALAPPDATA%\FieldbookTeste\foundry14-app`. Os caminhos abaixo são relativos a
`foundry-sistema/scripts/`, menos quando digo outra coisa. Só li e pesquisei: nenhum arquivo do repositório mudou.

## 0. Em resumo

- **Hoje** o sistema só tem o texto em cima do token ("Esquivou!", "−12 HP") e, com o Sequencer e o JB2A (que não estão
  no Foundry 14 de teste), uma animação de acerto ou de erro e o som do Diwako. Tudo sai do `mostrarNaMesa` do cartão
  do ataque (`combate/cartao.mjs:78-89`). O agarrão, as Artes Marciais, a NET, o Neuroport, os perigos, o Death Save, a
  recarga e o cyberware não têm efeito nenhum. Os efeitos e os sons sintetizados do NET Architect do Foundry 12
  (`foundry-net-architect/scripts/fx.mjs`) não vieram para o sistema.
- **A proposta:** um motor de efeitos do sistema em quatro peças:
  1. a **regra pura** (`regras-coreografia.mjs`, sem o Foundry, testada no G3) transforma o resultado já resolvido do
     combate numa lista ordenada de passos com tempos;
  2. o **diretor** (`coreografia.mjs`) decide quem vê e quando;
  3. os **tocadores** (o PIXI do próprio sistema como base; o Sequencer com o JB2A como opção; o áudio do Foundry);
  4. as **configurações** (o teto do mundo e a escolha de cada jogador).
- **O transporte,** em quatro caminhos, cada um usado onde cabe:
  - **o cartão do resultado é o evento:** cada cliente toca o desfecho quando o cartão chega até ele. Assim o efeito vale
    para quem vê o cartão, sem socket, sem duplicar e sem confiar em ninguém;
  - **o socket, só do mestre:** para o disparo antes da defesa;
  - **a carona na operação do documento:** para o que o próprio dono faz, como recarregar ou usar um equipamento;
  - **um documento persistente:** para o que dura, como a fumaça de 1 minuto.
- **Duas falhas de segurança** do código de hoje, que o C78 resolve:
  - o tipo `'texto'` do socket é aceito de qualquer cliente (`combate/socket.mjs:122-123`);
  - o texto do resultado vai para todos os clientes, mesmo com "Quem vê o cartão: só o mestre" (`combate/cartao.mjs:86`).
- **A divisão:** do C77 ao C92, em cinco fases. A fase 1 (C77 a C80) já entrega o tiro e o impacto com som.

---

## 1. O que existe hoje

| O quê | Onde | Roda em | Observação |
| --- | --- | --- | --- |
| `textoFlutuante({cena, token, texto, estilo, para})` | `efeitos.mjs:30-40` | cada cliente | Filtra por `para`, pela cena vista e pelo token escondido (só o mestre vê). Usa o `canvas.interface.createScrollingText`, que respeita o `core.scrollingStatusText`. |
| `animar(token, estilo)` | `efeitos.mjs:43-60` | só o mestre ativo | Sequencer e JB2A (`Impact_07`, `Miss_02`), que o próprio Sequencer manda para todos; o som do Diwako vai para todos (`AudioHelper.play(..., true)`). |
| `mostrarNaMesa(ctx, para)` | `combate/cartao.mjs:78-89` | o mestre | Para cada linha: `R.textoNoToken` (`regras.mjs:887`), o texto local, o `emit({tipo:'texto'})` para todos e o `animar` se o token não está escondido. |
| A chamada | `combate/cartao.mjs:57` | o mestre | Logo depois do `ChatMessage.create` do cartão (`:56`); o `resolver` não espera. |
| A recepção | `combate/socket.mjs:122-123` | os outros clientes | **Sem conferir o remetente:** um jogador, pelo console, faz aparecer qualquer texto no token de qualquer um. O C56 conferiu os outros tipos, e este ficou de fora. |
| A configuração | `configuracoes.mjs:71-74` | o mundo | `animacoes`: `auto` (texto e animação), `texto` (só o texto), `nao` (nenhum). |
| O anel da NET | `netrun/token.mjs:22-56` | cada cliente, pela flag | Um precedente bom: o efeito persistente desenhado em cada cliente a partir de uma flag do documento, sem socket. |
| O texto no G4 | `tests/cenarios/v14.js:9100-9203` | os dois navegadores | Embrulha o `createScrollingText` e confere os textos por modo (público, só o mestre, os envolvidos, nenhum). Muitos passos põem `animacoes: 'nao'` (por exemplo `:6453`, `:13637`, `:16942`, `:17785`, `:21182`). |

**O que se perde e o que vaza hoje:**
- O `emit` de `cartao.mjs:86` manda o texto a **todos** os sockets, e o filtro do `para` só acontece no cliente que
  recebe: no modo "só o mestre", o jogador recebe o "−12 HP" no console. É a lição do ciclo 209 ("a mensagem sussurrada
  ao mestre não é segredo").
- O Sequencer toca para todos, também para quem não vê o token pela visão ou pela névoa. Só o token escondido fica de
  fora.

---

## 2. O mapa dos ganchos: onde cada efeito dispara

**Momento A (disparo):** quando o ataque já foi validado e o desfecho ainda não se sabe. **Momento B (desfecho):**
quando o resultado está pronto (o cartão). Em "Roda em", **M** é o mestre ativo e **D** é o dono, quem age.

### 2.1 O ataque com arma (o caminho do `atacar`)

| Evento | Arquivo:linha | Roda em | O que se sabe ali | Efeito proposto e momento |
| --- | --- | --- | --- | --- |
| Clique em atacar sem bala | `combate.mjs:137` (pente vazio, aviso) | D | a arma | O clique seco, **só local** (o som de quem tentou), sem socket. |
| Rolagem do ataque | `combate.mjs:176-179` (`testar`) | D (ou M) | o total, ainda escondido | Nada: o total pode estar escondido ("Esconder o total"). |
| O pedido chega ao mestre | `combate.mjs:196-197` → `combate/socket.mjs:107-109` | M | o pedido cru, sem validar | Nada ainda: o `contexto` pode recusar. |
| O ataque validado | `combate/modos.mjs:136-139` (o `contexto`, as conferências da arma montada e do pente de outro dono) | M | a arma, o modo, o token de quem ataca, os alvos, a cena | **Momento A:** o disparo, se o usuário quiser (a decisão U1). O clarão do cano e o som do tiro na origem, sem projétil, porque ainda não se sabe se acerta. |
| Os modos | `combate/modos.mjs:140-143` (`supressao`, `explosao`, `cartucho`, `individual`) | M | o modo final | Escolhe o "roteiro" (§3.4). |
| A defesa de cada alvo | `combate/modos.mjs:272-331` (o resultado na `:329`: `acertou`, `esquivou`, `errou`, `semDv`) | M (a janela de reação no D do alvo, `combate/socket.mjs:152`) | a escolha (esquivar, aguentar, escudo, escudo humano) | No desfecho: a esquiva vira um passo para o lado do alvo; o escudo, uma faísca no escudo; o escudo humano (`:294-303`), o impacto no token interposto (`linha.token` já trocado na `:401`). |
| A segunda chance (Smart melhorada, Inteligente) | `combate/modos.mjs:257-269`, `:551-559`, `:590` | M | o primeiro total e o segundo | No desfecho: uma curva no traçante (a bala que muda de direção) quando `linha.segundaTentativa` ou `segundaChance` existe. |
| A Smart de dois alvos | `combate/modos.mjs:597-609` | M | as balas que mudaram de alvo | O traçante desvia do primeiro alvo para o segundo. |
| O dano rolado | `combate/modos.mjs:352-373` | M (ou D) | o total, o crítico | Nada (o Dice So Nice já anima os dados). |
| **O dano aplicado** | `combate/modos.mjs:439-547` (`ferir`); `receberDano` na `:487-491`; a conta em `documentos.mjs:620-653` | M | `linha.dano` (`hpAntes`, `hpDepois`, `passou`, `sp`, `ablado`, `escudo`, `estase`, `lesoes`) | Momento B: o impacto (o sangue se o dano passou da armadura; a faísca se a armadura segurou; o ciano no escudo ou na estase), o texto. |
| A ablação da armadura | `documentos.mjs:642-648` (`resumo.ablado`) | M | o SP que caiu | Momento B: uma faísca e um "−1 SP" pequeno, opcional (nível completo). |
| A lesão crítica | `combate/modos.mjs:503-528`; `lesoes.mjs:19` (o cartão em `:73`) | M | o nome da lesão | Momento B: o "crítico!" (que já está no texto) com um som próprio e um clarão vermelho no token. |
| O tiro na perna, o item na mão | `combate/modos.mjs:527`, `:529` | M | Perna quebrada, largou o item | Um texto extra ("Perna quebrada", "Largou a arma"). |
| A Voadora derruba | `combate/modos.mjs:534-538` (`linha.derrubado`) | M | caído | O token tomba (§2.3). |
| Mortalmente ferido | `combate/modos.mjs:481` (`jaMortal`) e `linha.dano.hpAntes >= 1 && hpDepois < 1` | M | entrou abaixo de 1 HP agora | Momento B: o "MORTALMENTE FERIDO" e um batimento cardíaco, só para os envolvidos. |
| Já mortal e atingido de novo | `combate/modos.mjs:539-542` | M | a lesão a mais | O som da lesão. |
| Pôr fogo | `combate/modos.mjs:546` → `municoes.mjs:126-135` | M | o efeito "Em chamas" no ator | Persistente: as chamas no token enquanto o status vale (§3.5, caminho 4). |
| A munição sem dano (granada de efeito, dardo) | `combate/modos.mjs:681-686` → `municoes.mjs:67-124` (a fumaça na `:76`, a resistência na `:90-94`, a sonífera na `:108`, o flashbang e o gás lacrimogêneo na `:113`, o EMP na `:116`) | M | por alvo: resistiu ou falhou | Momento B (§2.2). |
| O cartão do resultado | `combate/cartao.mjs:33-59` (o `ChatMessage.create` na `:56`, as flags `ataque: resumo` e `desfazer`) | M | **tudo** | **O evento do desfecho nasce aqui:** uma flag `efeito` no cartão (§3.3). |
| O dano à parte pelo cartão | `combate/cartao.mjs:150-176` → `cartaoDoResultado` na `:175` | M | o dano nos alvos marcados | O mesmo desfecho, sem disparo (a origem é nula: só os impactos). |
| O "Desfazer" | `combate/cartao.mjs:94-140` | M | — | Nenhum efeito, e o "Rever" some do cartão desfeito. |
| O fim do turno com fogo | `municoes.mjs:148-161` (`fogoNoFimDoTurno`) | M | −2 HP | O texto "−2 HP (fogo)" e um estalo. |
| Suprimido que sai | `turnos.mjs:171-180` | M | — | Nada (só o ícone some). |
| **O Death Save** | `turnos.mjs:185-207` (pede ao jogador na `:198`; a morte na `:201-206`); `documentos.mjs:539-562` | M (ou D) | passou ou falhou | O batimento (passou) e o **flatline** (falhou e morreu, `:201`): o token sem cor e o som de linha reta, para todos que veem o token. |

Os modos, em detalhe (todos no M, no momento B, com o roteiro do §3.4):

| Modo | Onde | Os dados para o roteiro |
| --- | --- | --- |
| Tiro único, mirado, ricochete, carga Tech, dois canos | `combate/modos.mjs:613-640` (`individual`) | `local` (cabeça, perna, item), `pedido.ricochete`, `pedido.carga`, `pedido.doisCanos`, `perfil2077.classe` (smart, tech, power). |
| Autofogo (rajada) | `combate/modos.mjs:628-635` (`linha.multiplicador`) | As balas: `R.balasDoModo` (`regras.mjs:582`) ou `arma.balasDoAutofogo`; o multiplicador por alvo. |
| Fogo supressivo | `combate/modos.mjs:769-781`; quem fica sob fogo em `:754-765` (25 m, à vista) | `linha.resultado` `suprimido` ou `firme`; a origem é o token de quem atira (`ctx.tokenAtq`). |
| Espingarda com cartucho | `combate/modos.mjs:689-704` | A DV 13, o leque de 6 m (`R.ALCANCE_CARTUCHO`), quem ficou "fora". |
| Explosivo (granada no lança-granadas, foguete, arremesso) | `combate/modos.mjs:716-749` | Fora do alcance (`:721`). **Errou** (`:729-735`): "o mestre decide onde caiu", sem ponto de queda. Explodiu (`:737`): o centro é o `centroDe(principal)` e a área é de 10 × 10 m (`naArea`, `:708-712`). |
| Arremesso (arma branca, granada na Thrown Weapon, Molotov) | `arremessar.mjs:14` (`ehArremesso`); `combate.mjs:71`, `:101` | `pedido.arremesso`: o projétil vai em arco. |
| A Shuriken Tornado | `combate/modos.mjs:657` | O dano por alvo: os impactos um a um. |
| Lançadores | `regras.mjs:575` (`classificar`: `grenadeLauncher`, `rocketLauncher`; a munição `grenade` ou `rocket`); o Projectile Launch System com granada, `regras.mjs:1117` | A classe do lançador e a da munição. |

### 2.2 As granadas e as munições com efeito (o momento B e os persistentes)

| Munição (`system.efeito`) | Onde a regra vive | O efeito proposto |
| --- | --- | --- |
| Perfurante, básica, KTech | dano normal (`ferir`) | Explosão com estilhaços. |
| Incendiária | `municoes.mjs:126` (o status "Em chamas") | Explosão de fogo. Persistente: chamas no token enquanto o status vale; o estalo no fim do turno (`:148`). |
| Fumaça (`smoke`) | `municoes.mjs:76` ("A fumaça continua sendo uma área que o mestre resolve") e o texto em `regras.mjs:609` (10 × 10 m por 1 minuto) | Persistente: uma nuvem de 10 × 10 m na cena, pelo tempo do mundo (1 minuto). |
| Gás lacrimogêneo, biotoxina, veneno, sonífera | `municoes.mjs:90-112` | Persistente: uma nuvem colorida curta (o gás) e, em quem falhou, a tosse, o "Zzz" ou o verde. |
| Flashbang | `municoes.mjs:113-115` | O clarão branco **na tela de quem falhou** (o dono do ator) e um zumbido. Para os outros, o clarão na área. Respeitar o modo fotossensível (§4). |
| EMP | `municoes.mjs:116-119` (o mestre escolhe os itens depois, pelo botão; `municoes.mjs:163`) | A onda azul e as faíscas nos tokens atingidos; o "ícone inoperante" quando o mestre escolhe. |
| Arachnid (Black Chrome) | `regras.mjs:612` | A teia no token (persistente enquanto o agarrado da teia vale). |
| Smart melhorada (granada) | a segunda chance | A curva do projétil. |

### 2.3 O corpo a corpo, o desarmado, as Artes Marciais e as cyberarmas

Todos passam pelo `atacar` (`combate.mjs:63`) no modo `corpo` (`regras.mjs:574`) e se resolvem no `individual`. O
roteiro muda pela classe:

| Ataque | De onde vem | A classe do efeito |
| --- | --- | --- |
| Briga (soco), Artes Marciais | `desarmado.mjs:91-98` (`atacarDesarmado` → `arma.atacar`), com o tipo `unarmed` ou `martialArts` | Soco ou chute: o impacto contundente, sem lâmina. |
| Golpes das Artes Marciais com ataque | `artes-marciais.mjs:88-91` (`movimento: id`) | Pela forma, com os `R.MOVIMENTOS` (`regras.mjs:75`): a Voadora salta (`alcance`), o Golpe quebra-ossos estala. |
| Movimentos sem ataque (Recuperação, Desarme combinado, Aperto de ferro…) | `artes-marciais.mjs:93-97` → o cartão `:106-115` (flag `movimento: resumo`) | O cartão vira evento: o desarme faz o item voar; a recuperação levanta o token. |
| Armas brancas | os tipos `lightMelee`, `medMelee`, `heavyMelee`, `vHeavyMelee` (catálogo: 9, 18, 15 e 22 armas) | O corte (o arco da lâmina) ou o golpe contundente, pelo peso (o perfil do item, §5). |
| Cyberarmas (Wolvers, Mantis, Gorilla, Monowire) | `armas-cyberware.mjs` (a arma ligada ao cyberware; ataca pelo mesmo `atacar`); o Monowire em `combate/modos.mjs:577` (até 6 m) e `:511-516` (duas lesões) | Garras e lâmina (o arco com o brilho do cromo); o Monowire é um chicote em linha até o alvo; a Gorilla, um impacto pesado com tremor curto. |
| Arma branca arremessada | `arremessar.mjs:9-14` | A lâmina girando em arco. |

A coreografia do corpo a corpo: o token de quem ataca avança (cerca de 0,25 casa em direção ao alvo, por 120 ms, e
volta). Isso fica só no desenho (`mesh`), como o balanço do token dinâmico (`token-dinamico.mjs:278-296`), sem gravar
nada. Depois vem o golpe no meio do caminho e o impacto no alvo. A esquiva é o alvo saindo para o lado; o aguentar, o
tranco.

### 2.4 O agarrão e o "arremessar"

| Evento | Arquivo:linha | Roda em | O efeito |
| --- | --- | --- | --- |
| Agarrar ou tomar (o pedido) | `agarrao.mjs:77-94` → `pedirAoMestre` `:64-68` (o socket `agarrao`, conferido pelo remetente em `:311-316`) | D → M | Nada no pedido. |
| Agarrou ou resistiu | `agarrao.mjs:175-192` (o cartão `:163-171` com a flag `agarrao: resumo`) | M | Agarrou: os dois tokens se aproximam e um anel amarelo os prende. Resistiu: um empurrão. |
| Tomou o objeto | `agarrao.mjs:195-213` | M | O ícone do item salta de um token para o outro. |
| Escapou ou segurou | `agarrao.mjs:216-233` | M | O anel se rompe ou aperta. |
| Estrangular | `agarrao.mjs:237-266` (`estrangulou`; `desmaiou`) | M | Pulsos vermelhos e o texto "−BODY HP"; desmaiou: o "Zzz". |
| **Derrubar** (o "arremessar" da wiki, p. 177) | o mesmo `resolverDano` (`'derrubou'`, `prone`) | M | O token é jogado (um arco curto) e tomba, com o tremor. |
| O escudo humano | `agarrao.mjs:269-290` | M | O anel muda de cor. |
| Soltar | `agarrao.mjs:130-145` | D | O anel some (pelo efeito apagado: persistente, §3.5). |

Os cartões do agarrão e das Artes Marciais **não passam** pelo `mostrarNaMesa`: hoje não têm nem o texto. O C84 os liga
ao motor pelo mesmo caminho do cartão (a flag `efeito` ao lado da `agarrao` ou da `movimento`).

### 2.5 A recarga, a munição e as armas de 2077

| Evento | Arquivo:linha | Roda em | O efeito |
| --- | --- | --- | --- |
| Recarregar | `documentos.mjs:1190-1211` (o `update` na `:1209`); os botões em `ficha-item.mjs:333` e `ficha-personagem.mjs:740`, e o painel | D | O som da recarga, pela classe, positional, e o texto "Recarregando" no token. **Pela carona na operação** (§3.5, caminho 3): `this.update({...}, { [SISTEMA]: { efeito: 'recarga' } })`. |
| Descarregar | `documentos.mjs:1217` | D | O som curto de soltar o pente. |
| Pente vazio | `combate.mjs:137` | D | O clique seco, só local. |
| Carregar a arma Tech | `combate.mjs:218-229` (`alternarCarga`, a flag `cargaTech`) | D | O zumbido que sobe e o brilho azul no token, persistente enquanto a carga vale (pela flag). |
| O ferrolho da Grad | `combate.mjs:201-207` (`ferrolhoPendente`) | D/M | O "clack" ao manejar. |
| A arma quebra (C73) | `combate/cartao.mjs:53` (`marcarPelaFalha`) | M | O estalo metálico e o "EMPERROU" no token (no desfecho). |

### 2.6 O cyberware, o equipamento e as drogas

| Evento | Arquivo:linha | Roda em | O efeito |
| --- | --- | --- | --- |
| Usar o equipamento de ativação manual (a lanterna, o que tem efeito) | `documentos.mjs:967-978` (`usar`, `updateEmbeddedDocuments('ActiveEffect', ...)`) | D | A carona: o "bip" de ligar ou desligar e um brilho curto no token. |
| Ligar ou desligar um efeito do item (a droga) | `ficha-item.mjs:414-417`; `ficha-personagem.mjs:909-912` | D | A carona na operação do `ActiveEffect`: a seringa ou o inalador. |
| A arma de cyberware que aparece ao instalar | `armas-cyberware.mjs:136-151` (o `sincronizar`) | D | Nada no instalar. No ataque, o perfil "popup" (a lâmina saindo antes do golpe, no momento A). |
| O Sandevistan (o situacional da iniciativa) | `documentos.mjs:289`; `iniciativa.mjs` | D | O rastro (os fantasmas do token) quando a iniciativa rola com ele ligado. Fase 4, opcional. |
| Instalar cyberware | `documentos.mjs` (`instalarCyberware`) | M/D | Fora do combate: nada (o usuário decide se quer). |

### 2.7 A NET (`netrun/`) e o Neuroport

As operações da NET rodam no M (`netrun/socket.mjs:37-56`, com o remetente desde o C56). Todo o estado vai na flag do
tile, que todos recebem (`netrun/estado.mjs:53-57`), e cada operação registra uma linha tipada no log
(`netrun/estado.mjs:49-51`, com os tipos `info`, `ok`, `falha` e `ice`). Os pontos:

| Evento | Arquivo:linha | O efeito |
| --- | --- | --- |
| Conectar | `netrun/estado.mjs:412-438` (e o `marcarToken`, `:104-108`, que liga o anel) | Um feixe do token até o ponto de acesso e o som de subir, como o `conectar` do NET Architect (`foundry-net-architect/scripts/fx.mjs:10`, `:75`). |
| Desconectar (seguro ou inseguro) | `netrun/estado.mjs:440-451` → `retirar` `:92-102` | O som de descer; no inseguro, o choque vermelho. |
| Encontrar Black ICE (a velocidade) | `netrun/estado.mjs:243-252` | O alarme (`fx.mjs` do NET Architect: `alarme`). |
| O efeito do Black ICE | `netrun/estado.mjs:280-…` (`aplicarEfeito`) | O raio no token e o dano no cérebro. |
| Dano no cérebro | `netrun/estado.mjs:263-268` | O "−N HP" e o glitch no token do netrunner. |
| Ataque do inimigo da NET | `netrun/estado.mjs:591-605` | Pelo log. |
| Programa de ataque, Zap | `netrun/estado.mjs:612-663`; `zap` `:358-373` | No desfecho, pelo log. |
| Scanner | `netrun/estado.mjs:382-410` | O pulso radial do tamanho do alcance (o resultado × 10 m). |
| Jack In, Breach, quickhack, expulsão (o Neuroport) | `neuroport.mjs:314`, `:364`, `:446-478` (o cartão `:261`, a flag `resumo`), `:480` | O cartão é o evento: o quickhack faz o glitch no alvo; o Overheat, chamas (o fogo do quickhack). |

**O caminho da NET:** os efeitos nascem do **log novo** do tile, no `updateTile` de cada cliente. O cliente compara o
tamanho do `est.log` de antes e de depois e toca os tipos novos, como o `novos.includes('ice')` do NET Architect
(`foundry-net-architect/scripts/estado.mjs:271-273`). Isso não precisa de socket. Os sons da NET tocam só para quem está
nela (os donos dos corredores) e para o mestre; o glitch no mapa vale para quem vê o token (a decisão U10).

### 2.8 Os veículos

| Evento | Arquivo:linha | O efeito |
| --- | --- | --- |
| A arma montada | `tripulacao.mjs:108-112` (`atacarDoAssento` → `atacar` com `atirador` e `tokenAtirador`); `armas-veiculos.mjs:3-12` (metralhadora, lança-chamas, arma branca) | A origem do disparo é o **token do veículo** (`ctx.tokenAtq`); a metralhadora é sempre rajada; o lança-chamas, um cone de fogo. |
| Dano na estrutura | `combate/modos.mjs:457-466` (`receberDanoVeicular`, `veiculos.mjs:127`); `linha.veicular` | Faíscas metálicas e fumaça; o SDP em vez do HP. |
| Dano no vidro | `combate/modos.mjs:467-480` (`veiculos.mjs:109`) | O vidro estilhaçando; a carga Tech que atravessa (`:469-472`) é um furo limpo. |
| A batida (o perigo) | `perigos.mjs:356-367` (`baterOVeiculo`, 6d6) e `:370-…` (a lesão) | O tremor forte, o som da batida e os estilhaços nos dois tokens. |
| A manobra perdida | `direcao.mjs:109-125` (o cartão com `passou: false`) | O pneu cantando. |
| Os perigos (queda, eletrocução, radiação, sem ar) | `perigos.mjs:389-444` (`aplicar`), `:496-…` (os do fim do turno) | Fase 4: a queda faz o token cair; a eletrocução, os arcos azuis. |

---

## 3. A arquitetura do motor

### 3.1 Os princípios

1. **Uma fonte de verdade.** O efeito sai do resultado já resolvido (o `resumo` do cartão e as `ctx.linhas`), nunca de
   uma conta paralela. A regra pura só **lê** o resultado.
2. **Decidir é puro, tocar é do canvas.** Do evento à lista de passos com tempos é a regra pura (G3). Desenhar e tocar
   o som é o tocador (G4).
3. **Um cliente decide, cada um toca para si.** O mestre ativo monta o evento uma vez. Cada cliente toca a sua cópia, uma
   vez, pela visão dele. Nunca dois clientes tocam o mesmo efeito para um terceiro, e nunca um efeito vem de um cliente
   sem conferência.
4. **O efeito nunca segura o jogo.** Nada no `resolver`, no `ferir` ou no cartão espera o efeito (`void
   tocar(...).catch(contar)`). Uma falha no tocador vira um contador, não um erro.
5. **Desliga por inteiro.** No nível "nada", o motor não monta nem o evento (o custo é zero).
6. **Não grava nada para animar.** O avanço do corpo a corpo, o tremor e o token que tomba ficam só no desenho (o
   `mesh`), como o balanço do C52. O que dura (a fumaça, o fogo) é um documento ou uma flag que já existe, desenhado em
   cada cliente.

### 3.2 Os módulos novos

| Arquivo | Foundry? | O que faz |
| --- | --- | --- |
| `scripts/regras-coreografia.mjs` | não | Os perfis por classe (`PERFIS`), `perfilDaArma({tipo, classe2077, municao, origem, preset})`, `eventoDoAtaque(resumo, posicoes)`, `roteiro(evento, opcoes)` (a lista ordenada de passos com `t` em ms), `filtrarPeloNivel(passos, {nivel, sangue, tremor, fotossensivel})`, `nivelEfetivo(mundo, cliente)`, `validarEvento(evento)`, `srcPermitido(src)`, `comprimir(passos, teto)`, `NIVEIS` e `MAPA_DO_ANTIGO` (de `auto`, `texto` e `nao`). |
| `scripts/coreografia.mjs` | sim | O diretor: registra os ganchos (`createChatMessage`, `updateTile` da NET, `updateItem` e `updateActiveEffect` com a carona), o socket `efeito` (só do mestre), a fila deste cliente, a visibilidade (a cena, o token escondido, o `isVisible`), o Dice So Nice, e a API `game.system.api.efeitos` (`tocar`, `rever`, `falhas`, `registro` para o G4). |
| `scripts/efeitos/tocador-pixi.mjs` | sim | O tocador base, sem módulo: o clarão, o traçante (uma linha com brilho que anda, no `canvas.interface` ou numa camada própria sobre os tokens), o impacto (as partículas simples, o sangue, a faísca), a onda da explosão, a nuvem, o anel, o tremor (o `foundry.canvas.animation.CanvasShakeEffect` do core, `client/canvas/animation/shake.mjs`, que já para sozinho no modo fotossensível). A animação pelo `CanvasAnimation.animate` (`client/canvas/animation/canvas-animation.mjs:98`) ou pelo `canvas.app.ticker`, como o anel da NET. |
| `scripts/efeitos/tocador-sequencer.mjs` | sim | Opcional: com o Sequencer e o JB2A ativos e a configuração do tocador em "Sequencer", traduz os mesmos passos para `new Sequence(...)`, **local** (o `.locally()` do Sequencer, a conferir na versão do 14 com o fx-assets), porque o diretor já decide quem vê. |
| `scripts/efeitos/sons.mjs` | sim | O som: o positional pelo `canvas.sounds.playAtPosition(src, origem, raio, opcoes)` (`client/canvas/layers/sounds.mjs:349`, só local, com as paredes e o abafado) para o tiro, a explosão e o golpe; o de interface pelo `foundry.audio.AudioHelper.play({src, volume, channel: 'interface'}, false)` (`client/audio/helper.mjs:413`, sem socket) para o crítico, o flatline e o clique seco. O volume vezes a configuração do cliente; o pré-carregamento (`AudioHelper.preloadSound`, `:449`) no `canvasReady`. |
| `scripts/efeitos/persistentes.mjs` | sim | O desenho, em cada cliente, do que dura: a nuvem (a flag na cena ou uma Region do 14), as chamas no token com o status "Em chamas", a carga Tech, o anel do agarrão. Redesenha no `canvasReady` e nos `update*`, como o `desenharAnel` (`netrun/token.mjs:22`). |

O `efeitos.mjs` de hoje fica como o adaptador: o `textoFlutuante` continua (é o passo `texto` do tocador), e o `animar`
passa a ser o caminho do Sequencer. Nada some de uma vez.

### 3.3 O formato do evento (v1)

Montado no mestre a partir do `ctx` (ou de outro resumo) e guardado no cartão (`flags.cpr-fieldbook.efeito`) ou mandado
pelo socket. As posições são as da hora da decisão: o token pode andar ou sumir depois.

```js
{
  v: 1,
  id: 'pedido.id',                  // o mesmo id do ataque (o resumo.id do cartão)
  tipo: 'ataque',                   // 'ataque' | 'agarrao' | 'movimento' | 'net' | 'quickhack' | 'veiculo' | 'perigo' | 'corpo' (Death Save, morte) | 'recarga' | 'equipamento'
  fase: 'desfecho',                 // 'disparo' (o momento A) | 'desfecho' (o momento B)
  cena: 'sceneId',
  origem: { token: 'tokenId' | null, x, y, elevacao, tamanho },   // null no dano à parte pelo cartão
  arma: { perfil: 'fuzil', tipo: 'assaultRifle', classe2077: null, municao: { tipo: 'rifle', efeito: 'basic' },
          preset: null, montada: false, cyber: false },            // só chaves, nunca um caminho de arquivo
  modo: 'autofogo',                 // tiro | autofogo | supressivo | cartucho | explosivo | corpo | ricochete | doisCanos | arremesso
  local: 'corpo', arremesso: false, balas: 10,
  area: null,                       // { x, y, lado: 10 } no explosivo que explodiu; { x, y, raio: 25 } no supressivo
  queda: null,                      // { x, y } quando o mestre marca onde a granada caiu (o C81)
  alvos: [{
    token: 'tokenId', x, y, tamanho, escondido: false,
    resultado: 'acertou',           // acertou | errou | esquivou | fora | semDv | suprimido | firme | semDestino
    escolha: 'aguentar', interposto: null, segunda: false, multiplicador: 3,
    dano: { perdeu: 12, passou: true, critico: true, lesoes: 1, escudo: false, estase: false, ablado: 1, veicular: null },
    estados: { mortal: true, derrubado: false, fogo: false, suprimido: false },
    municao: null                   // 'smoke' | 'flashbang' | 'emp' ... e { resistiu: false }
  }],
  texto: [{ token: 'tokenId', texto: '−12 HP · crítico!', estilo: 'acerto' }]   // o R.textoNoToken de hoje, intacto
}
```

O tamanho máximo vem da validação: até 40 alvos (o supressivo de 25 m numa cena cheia), textos de até 80 caracteres e
números finitos.

### 3.4 A regra pura: do evento ao roteiro

`roteiro(evento, { nivel, sangue, tremor, fotossensivel, teto })` devolve
`[{ t, duracao, passo, de, para, alvo, chave, intensidade }]`, ordenado por `t`. Os passos: `clarao`, `som`, `tracante`,
`projetil`, `arco`, `impacto`, `sangue`, `faisca`, `esquiva`, `golpe`, `avanco`, `explosao`, `onda`, `tremor`, `nuvem`,
`texto`, `anel`, `tomba`, `glitch`, `feixe`, `tela` (o flash na tela de quem falhou).

**Os tempos de referência** (ms; o fx-visual afina a aparência, aqui é a ordem e o ritmo):

| Roteiro | Sequência |
| --- | --- |
| Tiro (acertou) | `clarao` 0 (80) + `som` 0 → `tracante` 40, com a duração pela distância (4 ms por metro, de 80 a 400) → `impacto` e `sangue` ou `faisca` na chegada → `texto` na chegada + 60. |
| Tiro (errou) | O traçante passa do alvo por 1 a 2 casas, de lado (o desvio do erro), e acaba numa faísca no chão; o `texto` "Errou" no alvo. |
| Esquivou | Como o errou, mais o `esquiva` (o alvo desliza 0,2 casa para o lado e volta, 160 ms) começando 60 ms antes da chegada. |
| Autofogo | N traçantes, com N = min(balas, 6), a cada 70 ms, num leque de ±4° em torno da linha; os que acertam = min(multiplicador, N); o `som` em rajada; os impactos nos alvos que pegaram, a cada 70 ms; o `texto` "−X HP (×3)" depois do último. |
| Supressivo | A varredura de 1,2 s: 8 traçantes distribuídos entre os ângulos dos afetados (sem alvo, numa faixa de 60°); os `texto` "Suprimido!" e "Firme" escalonados a cada 120 ms, por distância. Sem sangue. |
| Cartucho | Um `clarao` forte e um leque de 5 traçantes curtos (o cone de 6 m), chegando juntos (±30 ms); os impactos simultâneos. |
| Explosivo (lançador) | `projetil` reto, com a duração pela distância (de 300 a 600) → `explosao` no centro → `onda` até a borda da área (5 m, 250 ms) → `tremor` (300 ms; a força pela distância de quem olha, no reduzido nenhum) → os impactos dos atingidos por distância do centro (+20 ms por metro) → os `texto`. |
| Explosivo (arremesso) | O `arco` (a altura pela distância, de 600 a 900 ms) e o resto como no lançador. |
| Explosivo que errou | O `arco` ou o `projetil` até o alvo, que some com o "caiu fora" no texto: **sem explosão.** O cartão ganha o botão "Marcar onde caiu" (para o mestre); o clique na cena faz um evento `queda` que toca a explosão ali (o C81). |
| Granada sem dano | A explosão leve (o "puf") e a `nuvem` com `duracao` pelo tempo do mundo (60 s); a `tela` (o flash) só para os donos de quem falhou; os ícones de resistiu ou falhou. |
| Corpo a corpo | `avanco` 0 (120 ida, 120 volta) → `golpe` 80 (o arco da lâmina, o soco, a garra; pelo perfil) → `impacto` 120 → `texto` 180. Esquiva: o `esquiva` em 60. |
| Agarrão | O `avanco` dos dois → o `anel` (persistente enquanto há o efeito) → o `texto`. Derrubar: o `tomba` com um arco curto e o `tremor` leve. |
| Morte (Death Save falhou) | O `som` do flatline (interface, 1,5 s) → o `glitch` e o token sem cor (o desenho; o status já põe o ícone). |

**O teto por ataque** (`comprimir`): 3,5 s no completo e 1,5 s no reduzido. Passou disso (o supressivo com 20 alvos),
os passos se comprimem (o espaçamento cai) e os traçantes extras saem. Os `texto` nunca saem.

**Os níveis** (`filtrarPeloNivel`):
- **completo:** tudo.
- **reduzido:** um traçante por ataque, sem partículas, sem tremor, sem sangue (só a faísca), a nuvem só como contorno; o
  som continua.
- **texto:** só os passos `texto`, ou seja, o "Só o texto" de hoje.
- **nada:** a lista vazia.

À parte do nível:
- o sangue desligado troca `sangue` por `faisca`;
- o tremor desligado tira `tremor`;
- o `fotossensivel` (o `core.photosensitiveMode`, `client/game.mjs:1411`) tira `tremor`, `tela` e `clarao` forte.

**Os perfis por classe** (o `perfilDaArma`; o padrão quando o mestre não escolhe, §5). A tabela cobre todos os tipos do
catálogo, conferidos em `dados/catalogo.json`:

| Tipo do catálogo | Perfil |
| --- | --- |
| `medPistol`, `heavyPistol`, `vHeavyPistol` | `pistola-leve`, `pistola`, `pistola-pesada` |
| `smg`, `heavySmg` | `submetralhadora`, `submetralhadora-pesada` |
| `assaultRifle`, `sniperRifle` | `fuzil`, `fuzil-de-precisao` |
| `shotgun` | `espingarda` (com cartucho, o leque; com `shotgunSlug`, o tiro único pesado) |
| `bow` | `arco` (a flecha em arco baixo, sem clarão) |
| `grenadeLauncher`, `rocketLauncher` | `lanca-granadas`, `lanca-foguetes` (o rastro de fumaça) |
| `thrownWeapon` | `arremesso` (com granada, a `granada`; o Molotov, a `molotov`) |
| `lightMelee`, `medMelee`, `heavyMelee`, `vHeavyMelee` | `lamina-leve`, `lamina`, `contundente-pesado`, `contundente-muito-pesado`; o mestre troca no item (a faca e o taco não são iguais) |
| `unarmed`, `martialArts` | `soco`, `golpe-marcial` |

Os modificadores:
- a classe de 2077: `smart` (o traçante que curva e o retículo), `tech` (o feixe azul que atravessa) e `power` (o
  clarão maior);
- a origem do cyberware: `garra`, `mantis` e `chicote` (o Monowire);
- a munição: `incendiary` (o traçante laranja), `emp` (o azul), `rubber` (sem sangue) e `smart`.

### 3.5 Quem decide, quem toca e por onde

**Caminho 1: o cartão é o evento (o desfecho, o padrão).**
1. No mestre, o `cartaoDoResultado` (`combate/cartao.mjs:33-59`) monta o evento pela regra pura e o grava em
   `flags.cpr-fieldbook.efeito` do mesmo `ChatMessage.create` (`:56`). É uma linha a mais na criação, sem documento a
   mais.
2. Cada cliente, no `createChatMessage` (o padrão já usado em `defeito-escondido.mjs:126` e `pedido-teste.mjs:358`):
   - toca o evento se `mensagem.visible` (`client/documents/chat-message.mjs:101`) e se a flag é de um mestre
     (`mensagem.author?.isGM`);
   - confere a cena vista e a visibilidade de cada token (§3.7);
   - com o Dice So Nice e rolagens no cartão, espera o `diceSoNiceRollComplete` daquela mensagem (até 6 s) para o efeito
     não passar na frente dos dados.
3. O resultado:
   - **vale exatamente para quem vê o cartão** ("Quem vê o cartão do resultado": todos, os envolvidos, só o mestre),
     como o texto de hoje, e sem o vazamento do `emit` para todos;
   - **não duplica:** o `createChatMessage` roda uma vez por cliente, e ninguém retransmite;
   - **não confia em ninguém:** o jogador não cria um cartão com a flag de mestre (o `author` é dado pelo servidor);
   - o **"Rever o efeito"** no cartão vem de graça (o botão toca a flag local de novo).
4. O `emit({tipo:'texto'})` (`cartao.mjs:86`) e o ouvinte `'texto'` (`combate/socket.mjs:122-123`) saem: o texto vira o
   passo `texto` deste caminho.

**Caminho 2: o socket só do mestre (o disparo, o momento A).** No `resolver` (`combate/modos.mjs`, depois da `:139`):
1. o mestre monta o evento `fase: 'disparo'` e o manda num tipo novo `{ tipo: 'efeito', evento }`;
2. o ouvinte (no mesmo `registrarCombate`, `combate/socket.mjs:105`) só aceita com
   `game.users.get(remetente)?.isGM && remetente === game.users.activeGM?.id` e com o `validarEvento(evento)` passando;
3. o mestre toca o dele direto, porque o `broadcast` do servidor não volta para quem mandou
   (`dist/server/sockets.mjs`, `handleCustomSocket`: `this.broadcast.emit(e, t, this.user.id)`);
4. para restringir a quem recebe, o terceiro argumento `{ recipients: [ids] }` do `game.socket.emit` é respeitado pelo
   servidor (o mesmo `handleCustomSocket`; o `AudioHelper.play` usa assim, `client/audio/helper.mjs:428`). Assim o
   disparo de um atirador escondido só sai para o mestre.

**Caminho 3: a carona na operação (o que o próprio dono faz).** A recarga, o usar do equipamento e a droga já são
`update` que o dono faz e o servidor confere pela permissão. Uma opção a mais no `update`, por exemplo
`{ [SISTEMA]: { efeito: 'recarga' } }`, chega aos `updateItem` e `updateActiveEffect` de todos os clientes: o
`ClientDatabaseBackend` repassa as opções da operação (`client/data/client-backend.mjs:310-319`). O sistema já usa uma
opção assim, só local: `opcoes.cprfAcordar` em `municoes.mjs:259-260`. O receptor:
- só aceita chaves conhecidas (`'recarga'`, `'descarga'`, `'usar'`, `'droga'`);
- confere `userId` como dono do item (o servidor já recusou o resto);
- toca o som da classe da arma;
- nunca lê um caminho da opção.

O update que não muda nada não é transmitido, então não toca, e isso é o certo.

**Caminho 4: o documento persistente (o que dura).** A nuvem, as chamas, a carga Tech e o anel do agarrão:
- o estado já vive numa flag ou num efeito (o status "Em chamas", `municoes.mjs:132`; a flag `cargaTech`; os efeitos do
  agarrão);
- a nuvem nova vira uma flag na cena `{ id, x, y, lado, tipo, fim: worldTime + 60 }` ou uma Region do Foundry 14
  (decisão técnica do C82; a Region dá a área para o mestre e para as regras de visão), e o `expirarTemporarios`
  (`municoes.mjs:240-255`) a apaga;
- cada cliente desenha pelo `canvasReady` e pelo `update*`, como o anel da NET (`netrun/token.mjs:22-56`). Assim o
  efeito sobrevive ao recarregar a página e aparece para quem entra depois.

**O caminho da NET** é o caminho 4 com o log: `updateTile`, as linhas novas do `est.log` (§2.7).

**Com "Resolver os ataques" desligado** (`combate.mjs:80`, `:195`), não há resultado. A proposta: só o disparo, pelo
cliente de quem atira, pedido ao mestre num `{ tipo: 'efeito-pedido', arma, token }`, que o mestre confere (dono da
arma e do token) e toca pelo caminho 2. Ou nada (a decisão U12).

### 3.6 A segurança

- **O remetente, sempre.**
  - O ouvinte novo usa o segundo argumento do `game.socket.on` (como o C56), aceita só o mestre ativo e descarta o resto
    sem aviso.
  - O tipo `'texto'` sem conferência sai (hoje `combate/socket.mjs:122`).
  - O teste lexical do C56 (`tests/sistema/combate-alvos.test.mjs:41-62`) ganha a regra: "nenhum ouvinte toca um
    efeito sem conferir que o remetente é mestre".
- **Nenhum caminho de arquivo vindo do item.** O jogador dono edita as flags dos itens dele (a lição do ciclo 207).
  - O item guarda só a **chave** de um perfil (`'fuzil-pesado'`); os caminhos vivem numa configuração do mundo, que só o
    mestre muda (§5).
  - O `srcPermitido` confere de novo no cliente que toca: o caminho relativo dentro do servidor (`systems/cpr-fieldbook/`,
    `modules/`, `worlds/<id>/`), sem `http`, `//`, `..` nem `data:`, e com as extensões de mídia (`.ogg`, `.mp3`, `.wav`,
    `.webm`, `.webp`, `.png`).
  - Com isso, um jogador não faz a mesa toda baixar um som de um endereço dele (o que revelaria o IP de todos).
- **A validação do evento** (`validarEvento`, pura): o tipo e a fase conhecidos, até 40 alvos, as coordenadas finitas e
  dentro da cena (o cliente confere com a `canvas.dimensions`), os textos curtos e escapados (o `createScrollingText`
  aceita texto puro). O id do token é só lido na cena local; o evento nunca traz um uuid que o cliente resolva com
  `fromUuid`.
- **O disparo não revela o escondido:** o mestre manda pelo `recipients` só a quem pode ver o atirador (o atirador
  escondido: só os mestres), e cada cliente confere de novo.

### 3.7 A fila, o espaçamento e os casos difíceis

- **A fila deste cliente** (no diretor, separada da fila de ataques do mestre, `combate/socket.mjs:93-98`):
  - um evento por vez;
  - o próximo começa quando o anterior acaba, ou no teto dele;
  - **até 3 eventos esperando:** o quarto faz os mais velhos virarem "só o texto" na hora, para o efeito nunca ficar mais
    de uns 5 s atrás do jogo;
  - o "disparo" e o "desfecho" do mesmo `id` ficam juntos: o desfecho espera o disparo acabar.
- **O token escondido** (`document.hidden`): só o mestre vê o efeito dele. O impacto no alvo escondido não aparece para o
  jogador; o texto já fazia assim (`efeitos.mjs:34`).
- **O jogador sem visão do token** (a névoa, a visão, a luz):
  - cada passo ligado a um token confere o `token.isVisible` naquele cliente (`client/canvas/placeables/token.mjs:605-625`);
  - o traçante de um atirador invisível para um alvo visível sai da borda da visão, para não mostrar de onde veio (o
    completo; no reduzido, só o impacto);
  - **o som posicional** vale pela audição (o `playAtPosition` mede a distância e as paredes até quem ouve), então ouvir
    o tiro sem ver é o certo. É a lição do ciclo 214 aplicada ao efeito: o que o jogador vê depende do token que ele
    controla.
- **A cena diferente:** o cliente que vê outra cena não toca nada (`canvas.scene?.id !== evento.cena`) e não guarda para
  depois. O "Rever" do cartão funciona quando ele trocar.
- **Sem canvas** (`canvas.ready` falso, a cena sem fundo, o jogador com o canvas desligado nas configurações do core):
  - os passos de desenho saem;
  - os sons de interface continuam, se o nível permite;
  - o texto vai para nada, como hoje.
- **Os tokens que não são de personagem:**
  - o contêiner, o Black ICE e o demônio não são alvo de arma (`combate.mjs:85-90`; `ALVOS_DE_ARMA`), e a regra pura
    nunca os põe no evento;
  - o veículo usa o perfil `estrutura` (faísca, sem sangue);
  - o token sem ator (o desenho só): a origem pelo `x`/`y` guardado;
  - o Black ICE no topo do ponto de acesso (`netrun/combate.mjs`) recebe o glitch, não o sangue.
- **As instâncias do Foundry 14 que trocam** (a lição do C45 e do C52):
  - o tocador acha o token **no momento de tocar**, pelo id na cena (`canvas.tokens.get(id)`), e nunca guarda o objeto;
  - se o objeto foi trocado (`token.destroyed`) no meio de uma animação, o passo acaba ali;
  - as contas de posição usam o `x`/`y` do evento (o `_source` na hora da decisão), não o `token.x` que ainda anima.
- **O token dinâmico** troca a imagem para "ferido" uns 50 ms depois do HP mudar (`token-dinamico.mjs:77-89`), que é
  **antes** do cartão e do efeito: hoje o "ferido" aparece antes do tiro chegar. O C91 dá ao motor um
  `esperarImpacto(atorUuid)`, uma promessa que o `agendar` espera até o tempo do impacto daquele alvo (com teto de 3 s;
  sem efeito, nada muda). É a decisão U9.
- **O "Desfazer":** o efeito já tocado não volta; o cartão desfeito perde o "Rever".

### 3.8 A falha que não segura o combate

- Todo ponto de entrada do motor é `void motor.x(...).catch(registrarFalha)` (o padrão do `animar` de hoje,
  `cartao.mjs:87`).
- O `registrarFalha` conta em `game.system.api.efeitos.falhas` e **não** escreve no console por falha de arquivo. O G4
  conta os avisos do sistema em todas as páginas (o C60), e um arquivo que falta não pode derrubar o portão. Só um erro
  de programação (o TypeError) vai ao `console.error`, e o G4 o pega.
- O tocador confere o arquivo antes, com o `foundry.canvas.srcExists`, guardado num mapa como o `primeiroQueExiste`
  (`efeitos.mjs:20-26`). Sem o arquivo:
  - o passo cai para o desenho procedural do PIXI (o traçante e o impacto não precisam de arquivo);
  - ou cai para o silêncio (o som).
- Cada passo tem um prazo (o `duracao` mais 1 s): o passo preso é encerrado e destruído (`container.destroy({ children:
  true })`).
- O motor não lança nada dentro do `cartaoDoResultado`: montar o evento é puro e está num `try`. Se falha, o cartão sai
  sem a flag `efeito`.

---

## 4. As configurações

A configuração "Efeitos na mesa" (`animacoes`, `configuracoes.mjs:71-74`) **fica com a mesma chave e os mesmos valores**.
Os passos do G4 que a põem em `'nao'` (vários, §1) continuam valendo. Ela ganha um valor e o papel de **teto da mesa**.

| Chave | Escopo | Tipo e padrão | O que faz |
| --- | --- | --- | --- |
| `animacoes` (existe) | mundo | `auto` (rótulo novo: "Completo") · **`reduzido`** (novo) · `texto` · `nao`; padrão `auto` | O máximo da mesa. O `auto` antigo vira "completo" (o mesmo valor guardado, sem migrar). |
| `efeitosNivel` (nova) | cliente | `mesa` (segue o mestre, o padrão) · `completo` · `reduzido` · `texto` · `nada` | O de cada um. O que vale é o `nivelEfetivo(mundo, cliente)`: o menor dos dois (o jogador nunca passa do teto do mestre). |
| `efeitosSom` (nova) | mundo | Boolean, `true` | Os sons na mesa. Desligado, nenhum som do motor. |
| `efeitosVolume` (nova) | cliente | Number 0 a 1, passo 0,05, padrão 0,8 | O volume dos efeitos, que multiplica os canais do core (o ambiente e a interface, `client/audio/helper.mjs:315`, `:341-370`). |
| `efeitosSangue` (nova) | mundo, e cliente opcional | o mundo: `sim` · `nao` (padrão `sim`, a decisão U3); o cliente: Boolean, padrão `true` | O mundo é o teto; o cliente só tira. Sem sangue, a faísca. |
| `efeitosTremor` (nova) | cliente | Boolean, `true` | O tremor da explosão e do golpe pesado. Com o `core.photosensitiveMode`, desligado sempre (o `CanvasShakeEffect` do core já para sozinho). |
| `efeitosDisparo` (nova) | mundo | Boolean, padrão pela decisão U1 | O tiro sai na hora do ataque (o momento A), antes da defesa. |
| `efeitosTocador` (nova) | mundo | `sistema` (padrão) · `sequencer` (só aparece com o Sequencer ativo) | Quem desenha. |
| `efeitosPerfis` (nova) | mundo, `config: false` | Object, `{}` | Os perfis do mestre (§5), pela janela `registerMenu` (como os compêndios do navegador, `configuracoes.mjs:123-129`). |

- **O par mundo e cliente** já tem precedente: `painelEstiloDaMesa` (mundo) e `painelEstilo` (cliente),
  `painel/estilo.mjs:12-13`.
- **Os textos** seguem o tom de hoje. Por exemplo, para o "Efeitos neste navegador": "Neste navegador: Completo, Reduzido
  (sem partículas, tremor e sangue), Só o texto, ou Nada. Não passa do que o mestre escolheu em Efeitos na mesa."
- **O que não quebra quem já usa:**
  - os valores guardados de `animacoes` continuam válidos (a lista só ganha uma opção);
  - o padrão segue `auto`;
  - o texto em cima do token aparece nas mesmas condições, com as mesmas palavras (o `R.textoNoToken` não muda; o
    passo do ciclo 29 continua passando);
  - o Diwako some do caminho padrão (o som passa a ser do sistema); com o tocador "sequencer", o comportamento de hoje
    volta.

---

## 5. A personalização por arma, por munição e por granada

Em três camadas, da mais geral para a mais específica. A regra pura escolhe a primeira que existe, de baixo para cima:

1. **O padrão pela classe** (o `PERFIS` da regra pura, a tabela do §3.4). Toda arma do catálogo tem um; o G3 confere
   todas.
2. **O perfil do mestre por item do catálogo** (`efeitosPerfis` do mundo, chaveado pelo id do catálogo, por exemplo
   `core_weapons:assault-rifle`, `armas-2077:...`, `black-chrome_ammo:grenade-arachnid`). Vale para todo item com aquela
   flag `catalogo`. **Sobrevive à reimportação da wiki:** o `wiki.mjs` recria os itens a partir do catálogo, e a chave
   continua a mesma.
3. **O perfil do item** (a flag `flags.cpr-fieldbook.efeito = 'chave-de-um-perfil'` na arma, na munição ou no
   cyberware). Só uma **chave** da lista de perfis, nunca um caminho; quem grava é o mestre (a ficha do item mostra o
   campo só a ele) ou, pela decisão U11, o dono escolhe numa lista. A flag acompanha a identidade da arma (o C69, a
   `flags.cpr-fieldbook.arma`) na ida e na volta da wiki. Se o usuário quiser isso, o C89 confere no
   `wiki.mjs:208-211` e `:805-808`, onde a identidade já é copiada.

**Um perfil** (no `efeitosPerfis.perfis`, editado pela janela):

```js
'fuzil-pesado': {
  base: 'fuzil',                       // herda o resto do padrão
  disparo: { som: 'worlds/<mundo>/fx/ak-tiro.ogg', clarao: 'grande', raioDoSom: 60 },
  rajada:  { som: 'worlds/<mundo>/fx/ak-rajada.ogg' },
  projetil:{ cor: '#ffb347', tipo: 'tracante' },
  impacto: { som: null, particulas: 'padrao' },
  recarga: { som: 'worlds/<mundo>/fx/ak-recarga.ogg' }
}
```

- **Por munição:** o perfil da munição carregada soma por cima do da arma: a cor do traçante incendiário, o EMP azul, a
  borracha sem sangue.
- **Por tipo de granada:** a munição `grenade` com o `efeito` (`smoke`, `flashbang`, `emp`, `teargas`, `incendiary`,
  `arachnid`...) é a chave da explosão e da nuvem. O mestre troca a nuvem, a cor e a duração do desenho (a duração da
  **regra**, 1 minuto, não muda: ela é da wiki).
- **A janela do mestre** ("Efeitos da mesa", `registerMenu`, só o mestre):
  - a lista de perfis com o "Testar" (toca o perfil entre dois tokens selecionados, só no cliente do mestre);
  - o "padrão da classe" de cada tipo;
  - o campo do som com o `FilePicker`.
  
  O C71 (a oficina do mestre) tem o precedente da janela que cria sem programar.

---

## 6. Os testes

### 6.1 O G3 (`tests/sistema/coreografia.test.mjs`, novo, só a regra pura)

| # | O teste | O que confere |
| --- | --- | --- |
| 1 | Todo tipo de arma do catálogo tem perfil | Lê o `dados/catalogo.json` (como a lição do ciclo 208: a lista inteira, não uma amostra); nenhuma arma sem perfil; a `thrownWeapon` com granada é `granada`; o Molotov é `molotov`. |
| 2 | Tiro que acertou | A ordem `clarao` → `som` → `tracante` → `impacto` → `sangue` → `texto`; o impacto em `t` igual à chegada do traçante; o `t` nunca desce. |
| 3 | Errou, esquivou | Sem `impacto` nem `sangue` no alvo; o traçante passa do alvo (o fim fora do centro dele); o `esquiva` antes da chegada; o texto igual ao `R.textoNoToken` de hoje. |
| 4 | A armadura segurou, o escudo, a estase | A `faisca` (o estilo `defesa`) no lugar do sangue. |
| 5 | Autofogo de 10 balas | 6 traçantes a cada 70 ms; os que acertam = min(multiplicador, 6); o `texto` depois do último impacto. |
| 6 | Supressivo de 3 afetados | Os 3 textos escalonados a cada 120 ms pela distância; nenhum sangue; sem alvo, a faixa de 60°. |
| 7 | Cartucho | 5 traçantes que chegam juntos (±30 ms); os alvos "fora" sem impacto. |
| 8 | Explosivo que explodiu, explosivo que errou | Os impactos ordenados pela distância do centro; o `tremor` depois da `explosao`. Errou: nenhuma explosão, e o evento tem `queda: null` até o mestre marcar. |
| 9 | As granadas sem dano | A fumaça faz uma `nuvem` com `fim = agora + 60`; o flashbang põe a `tela` só nos alvos que falharam; o EMP, as faíscas; a incendiária, o fogo persistente. |
| 10 | O corpo a corpo pela classe | A lâmina, o contundente, o soco, o chicote do Monowire, a garra; o `avanco` sempre antes do `golpe`. |
| 11 | Os níveis | O reduzido tira as partículas, o tremor e o sangue e deixa um traçante; o texto deixa só os `texto`; o nada é vazio; o sangue desligado vira faísca; o fotossensível tira o tremor, a tela e o clarão forte. |
| 12 | O nível efetivo | O `nivelEfetivo` é o menor; o `mesa` segue o mundo; os valores antigos `auto`, `texto` e `nao` mapeiam para `completo`, `texto` e `nada`. |
| 13 | O teto | Nenhum roteiro passa de 3,5 s (completo) nem de 1,5 s (reduzido); o supressivo de 40 alvos comprime e não perde nenhum `texto`. |
| 14 | A validação do evento | Recusa o tipo desconhecido, mais de 40 alvos, `NaN`, texto longo, o `src` com `http:`, `//`, `..` e `data:`, e a extensão fora da lista; aceita os caminhos do sistema, dos módulos e do mundo. |
| 15 | Os perfis em camadas | Item > catálogo > classe; o perfil do item com um caminho (e não uma chave) é ignorado. |
| 16 | O evento a partir do resumo | Um `resumo` do cartão (o formato de `combate/cartao.mjs:41-44`) com as posições vira o evento esperado; o `texto` dele é o `R.textoNoToken` de cada linha. |
| 17 | Lexical (como `combate-alvos.test.mjs:41`) | Todo ouvinte do socket que toca efeito confere `remetente` e `isGM`; não sobra ouvinte `'texto'` sem conferência; o `cartaoDoResultado` não espera (`await`) o motor. |

### 6.2 O G4 (`tests/cenarios/v14.js`, a partir do C78)

Um passo novo **numa cena e com atores só dele** (a lição do ciclo 200), com um `comEfeitosC78` no molde do
`comFormulasC43` (`v14.js:16921-16977`):
- uma cena com `active: false`, depois o `activate()` e o `canvasReady` (a lição do ciclo 196);
- dois atores (o Atirador e o Alvo, o Alvo com dono no jogador);
- a visão do token do jogador com alcance e selecionado (a lição do ciclo 214);
- os dados fixos (o `fixar`, `v14.js:129`);
- o `finally` que devolve as configurações, apaga as mensagens, os atores e a cena e volta para a cena de antes (a lição
  do ciclo 199).

**O registro do tocador:** em vez de olhar pixels, o diretor guarda em `game.system.api.efeitos.registro` (só com uma
flag de teste ligada pelo passo) cada evento tocado: `{ id, fase, passos: [nomes], nivel }`. É o mesmo truque do
`createScrollingText` embrulhado (a lição do ciclo 29).

| # | O passo confere | Contra o quê |
| --- | --- | --- |
| a | Um tiro que acertou: os dois navegadores registram o evento **uma vez cada** (pelo id), com os passos na ordem da regra pura; o cartão existe antes do primeiro passo; o HP já mudou. | A duplicação, o efeito antes do resultado. |
| b | "Quem vê o cartão": só o mestre, e o jogador não registra nada **e não recebe nada pelo socket** (embrulhar o `game.socket.on`/`_callbacks` do canal e contar). Os envolvidos: o jogador dono do Alvo registra. | O vazamento de hoje (`cartao.mjs:86`). |
| c | `animacoes: 'nao'`: ninguém registra. `animacoes: 'auto'` e o `efeitosNivel` do jogador em `texto`: o jogador registra só `texto`, o mestre registra tudo. `reduzido`: sem `sangue` nem `tremor`. | O desligar e o teto. |
| d | O arquivo some: o passo troca o `foundry.audio.Sound.prototype.load` e o `foundry.canvas.loadTexture` por uma promessa que rejeita, e por uma que nunca resolve. O ataque termina (o cartão, o HP, a fila do mestre livre para o próximo ataque, em menos de 10 s), o `efeitos.falhas` sobe e não há erro do sistema no console. | O efeito que segura o combate. |
| e | O token do Atirador escondido: o jogador registra o impacto no Alvo, mas nenhum passo com origem no atirador; o mestre registra tudo. | O escondido. |
| f | O jogador vendo outra cena: nada; ao voltar, nada toca sozinho; o "Rever" toca. | A cena diferente. |
| g | O socket falso: o jogador manda pelo console `{ tipo: 'efeito', evento }` e `{ tipo: 'texto', ... }`; o mestre e o segundo cliente não registram nada. | A falta de conferência (a lição do ciclo 203: "um passo manda o aviso falso de propósito"). |
| h | (C81) A granada que erra: o cartão com "Marcar onde caiu"; o clique simulado do mestre toca a explosão ali, uma vez em cada cliente. | — |
| i | (C82) A fumaça: a nuvem aparece nos dois navegadores; recarregar a página do jogador a mantém; o `game.time.advance(60)` a apaga nos dois. | O persistente. |
| j | (C87) A recarga pelo jogador: o mestre registra a `recarga` uma vez; o `update` sem mudança não registra. | A carona. |
| k | (C79) Dez ataques seguidos em autofogo: a fila do cliente nunca passa de 3 esperando; o último evento começa em até 5 s depois do cartão dele. | O atraso que se acumula. |

**O cuidado com os passos antigos:**
- os que deixam `animacoes: 'auto'` (o do ciclo 29, `v14.js:9100`) passam a tocar o PIXI no Edge sem janela;
- o C79 roda o G4 inteiro duas vezes para ver se apareceu uma instável nova (a lição do ciclo 213: "um estado novo da
  arma passa pelos passos antigos que atiram com ela");
- o tocador não pode escrever aviso nenhum quando o canvas some no meio (a troca de cena dos passos).

### 6.3 As mutações (uma por vez; os arquivos de volta pelo md5)

| A mutação | Quem tem de cair |
| --- | --- |
| Trocar a ordem do `impacto` e do `tracante` no roteiro | G3 2 |
| Tirar o `filtrarPeloNivel` do diretor | G3 11 e G4 c |
| Tirar a conferência do remetente no ouvinte `efeito` | G4 g e G3 17 |
| O mestre também mandar o desfecho pelo socket (o efeito em dobro) | G4 a (dois registros) |
| O `cartaoDoResultado` esperar (`await`) o motor | G4 d (o tempo) e G3 17 |
| Tirar a conferência do `hidden` e do `isVisible` | G4 e |
| Tirar a conferência da cena | G4 f |
| Tirar o `comprimir` | G3 13 e G4 k |
| O perfil padrão de um tipo de arma apagado | G3 1 |
| Tirar o `srcPermitido` | G3 14 e 15 |
| Voltar o `emit('texto')` para todos | G4 b (o socket contado) |
| Gravar a nuvem sem o `fim` (o persistente sem prazo) | G4 i e G3 9 |
| O `mensagem.visible` trocado por `true` | G4 b |

---

## 7. A divisão em itens do ROADMAP (a partir do C77)

Num bloco novo, no formato dos atuais:

**Os efeitos na mesa** (pedido do usuário em 2026-11-26: "efeitos mais bonitos para o RPG, por exemplo, quando o
personagem atirar fazer um efeito de tiro com som, granadas com efeito, brigas e etc."). As decisões do usuário estão na
§8. Os números seguem o protocolo do ROADMAP: o C75 está `[~]` com a KouArt, e a sessão que pegar o C77 reserva antes.

### Fase 1: o tiro e o impacto com som (valor já no fim da fase)

- [ ] **C77. A regra pura da coreografia:** custo **M**; dependências: nenhuma; risco **baixo** (sem Foundry, sem
  mudança no comportamento).
  - O que entra: o `regras-coreografia.mjs` com os perfis por classe (todos os tipos do catálogo), o evento v1, o
    `roteiro` de todos os modos de arma (o tiro, o mirado, o autofogo, o supressivo, o cartucho, o explosivo e o
    corpo a corpo, mesmo os que só tocam nas fases seguintes), os níveis, o teto, a validação e o `srcPermitido`.
  - Testa: o G3 1 a 17 (§6.1).
- [ ] **C78. O diretor, o transporte e as configurações (com a segurança do socket):** custo **M**; dependências: C77;
  risco **médio** (mexe no texto que o passo do ciclo 29 confere, e no socket).
  - O que entra:
    - o `coreografia.mjs` com o caminho 1 (o cartão é o evento: a flag `efeito` em `combate/cartao.mjs:56`, o
      `createChatMessage`, o `mensagem.visible`, o Dice So Nice);
    - o caminho 2 (o tipo `efeito` só do mestre ativo, com `recipients`);
    - a fila deste cliente, o teto, a falha que vira contador;
    - o fim do `'texto'` sem conferência (`combate/socket.mjs:122`) e do `emit` para todos (`cartao.mjs:86`);
    - as configurações do §4 (o `reduzido` no `animacoes`, o nível, o volume, o tremor e o sangue do cliente);
    - o tocador só com o passo `texto` (a paridade com hoje: nada novo aparece ainda).
  - Testa: o G4 a, b, c, d, e, f, g; o passo do ciclo 29 sem mudança; o G3 17.
- [ ] **C79. O tiro, o impacto e o som:** custo **G**; dependências: C78 e os sons e desenhos do fx-audio, do fx-visual
  e do fx-assets (a lista e a licença); risco **médio** (o peso no PC fraco e no celular; o Edge sem janela do G4).
  - O que entra:
    - o `tocador-pixi.mjs` com o clarão, o traçante, o impacto (o sangue, a faísca, o ciano), a esquiva, a curva da
      Smart e o feixe Tech;
    - o autofogo e o supressivo com o espaçamento;
    - o cartucho em leque;
    - o `sons.mjs` (positional e de interface; o pré-carregamento no `canvasReady`);
    - o clique seco do pente vazio (só local, `combate.mjs:137`);
    - os sons e os desenhos das classes de arma de fogo;
    - o "Rever o efeito" no cartão.
  - Testa: o G4 a (os passos reais), d (o arquivo some), k (dez rajadas), e o G4 inteiro duas vezes.
- [ ] **C80. O tiro que sai antes da defesa** (só se a decisão U1 for "sim"): custo **P**; dependências: C79; risco
  **baixo**.
  - O que entra: o momento A no `resolver` (`combate/modos.mjs`, depois da `:139`): o clarão e o som na origem; o
    desfecho espera o disparo. A configuração `efeitosDisparo`.
  - Testa: o G4 (o disparo antes da janela de reação abrir no jogador; o atirador escondido só no mestre); o G3 (o
    desfecho sem um segundo clarão quando o disparo já tocou).

### Fase 2: as granadas

- [ ] **C81. O explosivo e os lançadores:** custo **M**; dependências: C79; risco **médio** (o "onde caiu" é uma
  ferramenta nova na cena).
  - O que entra:
    - o arco do arremesso e o projétil do lança-granadas e do foguete (o rastro de fumaça);
    - a explosão, a onda, o tremor, os impactos pela distância do centro;
    - o Molotov e a Shuriken Tornado;
    - no erro (`combate/modos.mjs:729-735`), o botão "Marcar onde caiu" no cartão (só o mestre): o clique na cena toca
      a explosão (o evento `queda`, pelo caminho 2).
    
    A regra (quem é atingido) não muda: a área depois do erro continua do mestre.
  - Testa: o G3 8; o G4 h.
- [ ] **C82. As granadas com efeito que dura:** custo **G**; dependências: C81; risco **médio** (uma Region ou uma flag
  da cena; o prazo pelo tempo do mundo no `expirarTemporarios`, `municoes.mjs:240`; o desenho que sobrevive ao recarregar).
  - O que entra:
    - a fumaça, o gás lacrimogêneo, a biotoxina, o veneno e a sonífera (a nuvem de 10 × 10 m por 1 minuto);
    - o flashbang (o clarão na tela de quem falhou, com o modo fotossensível);
    - o EMP (a onda e as faíscas, e o "inoperante" quando o mestre escolhe, `municoes.mjs:163`);
    - a incendiária (as chamas no token enquanto vale o "Em chamas"; o estalo no fim do turno, `municoes.mjs:148`);
    - a Arachnid (a teia).
  - Testa: o G3 9; o G4 i.

### Fase 3: a briga

- [ ] **C83. O corpo a corpo:** custo **M**; dependências: C79; risco **baixo**.
  - O que entra:
    - as armas brancas pelo peso (o corte e o contundente);
    - a Briga e as Artes Marciais (os golpes com ataque, a Voadora que salta e derruba, `combate/modos.mjs:534`);
    - as cyberarmas (a garra, a Mantis, o chicote do Monowire até 6 m, a Gorilla com o tremor);
    - a arma branca arremessada (a lâmina que gira);
    - o avanço do token só no desenho (o `mesh`, como o balanço do C52).
  - Testa: o G3 10; o G4 (um soco e um corte, os registros; o token com o `x`/`y` do documento sem mudar depois do
    avanço).
- [ ] **C84. O agarrão e os movimentos sem ataque:** custo **P**; dependências: C83; risco **baixo**.
  - O que entra:
    - os cartões do `agarrao.mjs` (`:163`) e do `artes-marciais.mjs` (`:106`) ganham a flag `efeito`;
    - agarrar, resistir, tomar o objeto, escapar, estrangular, derrubar (o "arremessar"), o escudo humano;
    - o anel do agarrão persistente pelos efeitos;
    - o desarme combinado e a recuperação;
    - **o texto em cima do token, que esses cartões não têm hoje.**
  - Testa: o G4 (agarrou e derrubou nos dois navegadores; o anel some no "Soltar").

### Fase 4: o corpo, a NET, o cyberware e os veículos

- [ ] **C85. O corpo:** custo **M**; dependências: C79; risco **baixo**.
  - O que entra:
    - o mortalmente ferido (o batimento, só os envolvidos);
    - a lesão crítica (o som e o clarão vermelho, também a do botão "Rolar a lesão", `combate/cartao.mjs:180`);
    - o Death Save (passou: o batimento; falhou: o flatline, `turnos.mjs:201`);
    - o fogo no fim do turno;
    - os perigos (a queda, a eletrocução, a batida; `perigos.mjs:389`, `:356`).
  - Testa: o G3 (os roteiros); o G4 (o Death Save que falha: o flatline nos dois).
- [ ] **C86. A NET e o Neuroport:** custo **M**; dependências: C78; risco **médio** (o log da NET no `updateTile`; os
  passos da NET no G4 são muitos e sensíveis).
  - O que entra:
    - conectar (o feixe ao ponto), desconectar (seguro e inseguro);
    - o Black ICE (o alarme, o raio), o dano no cérebro, o Zap, o programa de ataque, o Scanner (o pulso);
    - o Jack In, o Breach, o quickhack e a expulsão (os cartões do `neuroport.mjs`, `:261`);
    - os sons sintetizados do NET Architect (`foundry-net-architect/scripts/fx.mjs:75-120`) como a base, sem arquivo.
  - Testa: o G4 (as linhas novas do log tocam uma vez; os sons só para os donos do netrunner e o mestre).
- [ ] **C87. O cyberware, o equipamento e a munição:** custo **P**; dependências: C79; risco **baixo**.
  - O que entra: a carona na operação (§3.5, caminho 3):
    - a recarga e a descarga (`documentos.mjs:1209`, `:1217`);
    - o usar do equipamento (`documentos.mjs:967`) e a droga;
    - carregar a arma Tech (`combate.mjs:218`, o brilho persistente pela flag), o ferrolho;
    - a lâmina que sai da arma popup (o momento A);
    - o rastro do Sandevistan na iniciativa (opcional).
  - Testa: o G4 j; o G3 (as chaves aceitas da carona).
- [ ] **C88. Os veículos:** custo **M**; dependências: C79 e C81; risco **médio** (a origem no token do veículo; a
  tripulação do C46).
  - O que entra:
    - a arma montada (a origem no token do veículo; a metralhadora sempre rajada; o lança-chamas em cone);
    - o dano na estrutura (as faíscas, a fumaça) e no vidro (o estilhaço; a carga Tech que atravessa);
    - a batida (`perigos.mjs:356`) e a manobra perdida (`direcao.mjs:109`).
  - Testa: o G4 (o tiro do motorista: a origem é o veículo).

### Fase 5: a personalização e o polimento

- [ ] **C89. Os perfis do mestre:** custo **M**; dependências: C79 (e C81 e C82 para as granadas); risco **médio** (a
  ida e a volta da wiki).
  - O que entra:
    - a janela "Efeitos da mesa" (o `registerMenu`): os perfis, o "Testar", o padrão de cada classe;
    - o perfil por item do catálogo e por item (só a chave; a decisão U11);
    - por munição e por tipo de granada;
    - o `FilePicker` com o `srcPermitido`.
  - Testa: o G3 15; o G4 (o perfil do catálogo vale depois de reimportar o personagem da wiki; o jogador que põe um
    caminho na flag é ignorado).
- [ ] **C90. O Sequencer e o JB2A como tocador:** custo **P**; dependências: C79; risco **médio** (os módulos não estão
  no Foundry 14 de teste: o G4 não cobre, como hoje).
  - O que entra: a tradução dos passos para o `Sequence` local; a paridade com o `animar` de hoje.
  - Testa: o G3 (a tradução, com um `Sequence` falso); a nota de "sem teste no G4" no MIGRATION_STATUS, como no ciclo
    29.
- [ ] **C91. O polimento:** custo **P**; dependências: C79; risco **baixo**.
  - O que entra:
    - o token dinâmico que espera o impacto para trocar a imagem (o `esperarImpacto`; a decisão U9);
    - o reduzido automático no celular (a largura da tela, decisão do fx-visual);
    - o pré-carregamento por cena;
    - a medição do custo no PC fraco.
  - Testa: o G4 (o token dinâmico troca depois do impacto e nunca depois de 3 s; o C45 e o C52 sem novas instáveis).
- [ ] **C92. (só se o usuário quiser) O VFX experimental do Foundry 14:** custo **P** (uma prova); dependências: C79;
  risco **alto** (o core avisa que a API "is EXPERIMENTAL... likely to change": `client/config.mjs:1359-1365`; fica
  atrás do `CONFIG.Canvas.vfx.enabled`).
  - O que entra: um terceiro tocador com o `foundry.canvas.vfx.VFXEffect` (o `singleAttack` tem o charge, o
    projectile e o impact com som posicional; há o shake e o scrollingText), atrás de uma configuração desligada.
  - Testa: só o G4 de que, desligado, nada muda.

**A ordem que entrega valor cedo:**
- C77 → C78 → **C79** (o tiro com som e impacto está na mesa) → C81 → C82 (as granadas) → C83 → C84 (a briga) → C85,
  C86, C87, C88 → C89, C90, C91;
- o C80 entra logo depois do C79 se a resposta à U1 for "sim";
- o C86 (a NET) pode correr em paralelo depois do C78, na sessão KouArt, que é a dona da NET pelo `AGENTS.md`.

**Pronto, para cada item** (como o bloco de hoje): o G1 a G4 passando, com o teste de referência (G3) e o passo novo no
cenário (G4); as mutações do §6.3 que cabem ao item; o README, o ROADMAP, o MIGRATION_STATUS e o QUALITY_GATES (a lição,
quando houver); e o `system.json` na versão `0.3.<ciclo>`.

---

## 8. As decisões do usuário

| # | A pergunta | A minha recomendação |
| --- | --- | --- |
| U1 | **O tiro sai na hora do clique** (o clarão e o som antes da janela de defesa) **ou tudo depois do resultado?** | Na hora (o C80). O jogador clica e ouve o tiro; o impacto vem com o cartão. Sem isso, entre o clique e o efeito passam os segundos da defesa. |
| U2 | Quem vê e ouve o **disparo**: todos que veem o atirador na cena, ou só quem vê o cartão? | Todos que veem o atirador (um tiro se ouve); o desfecho, só quem vê o cartão. |
| U3 | **Sangue** ligado por padrão na mesa? | Ligado no mundo, e cada jogador desliga no navegador dele. |
| U4 | **Tremor de tela** na explosão e no golpe pesado, por padrão? | Ligado, cada um desliga; desligado sempre com o modo fotossensível do Foundry. |
| U5 | **A granada que erra:** o mestre clica onde caiu (o botão no cartão) ou uma regra de desvio? | O botão (a wiki hoje diz "o mestre decide onde caiu"). Uma regra de desvio seria regra nova: só com a fonte na wiki. |
| U6 | **Do que dependemos:** os efeitos do próprio sistema (sem módulo) como a base, e o Sequencer com o JB2A como opção? | Sim. O Foundry 14 de teste e o servidor de 1 GB não têm os módulos, e o sistema tem de funcionar sozinho. A escolha dos pacotes é do fx-assets. |
| U7 | Usar o **VFX experimental do Foundry 14**? | Agora não. Uma prova depois (o C92), atrás de uma configuração. |
| U8 | **Som posicional** (ouve quem tem o token perto, com as paredes) ou o som para todos na interface? | O posicional para o tiro, a explosão e o golpe; o de interface para o crítico, o flatline e o clique seco. O desenho do som é do fx-audio. |
| U9 | **O token dinâmico troca para "ferido" só depois do impacto** (até 1 s mais tarde)? | Sim (o C91). |
| U10 | **A NET no mapa:** o glitch no token do netrunner para todos que veem o token, ou só para quem está na NET? | O som só para quem está na NET e para o mestre; o glitch no mapa, para todos que veem o token. |
| U11 | **Quem escolhe o efeito da arma:** só o mestre, ou o jogador numa lista que o mestre aprovou? | O mestre cria os perfis, e o jogador escolhe numa lista (combina com o C69, a identidade da arma; nunca um arquivo). |
| U12 | Com **"Resolver os ataques" desligado**: só o disparo, ou nenhum efeito? | Só o disparo, pedido ao mestre e conferido por ele. |
| U13 | O nível novo **"Reduzido"** (sem partículas, tremor e sangue) e o **teto** de 3,5 s por ataque: servem? | Sim. O teto para o fogo supressivo numa cena cheia não atrasar a mesa. |

---

## 9. Os riscos

- **O peso no G4:** o Edge sem janela desenha o PIXI de verdade. Os passos antigos com `animacoes: 'auto'` passam a
  tocar, e uma instável nova pode aparecer (a lição do ciclo 213). Por isso o C79 roda o G4 duas vezes.
- **O vazamento continua por outros caminhos:** a flag `efeito` do cartão sussurrado chega ao cliente do jogador, como o
  resto do cartão (a lição do ciclo 209). O efeito não toca para ele, mas os dados estão lá, como hoje já estão no
  `flags.ataque`. Para segredo de verdade, o mestre usa "Só o mestre" e o caminho 2 com `recipients`, nunca o cartão.
  Isso fica escrito no README.
- **O Foundry 14 e a "carona":** a opção custom no `update` passa aos outros clientes
  (`client/data/client-backend.mjs:310-319`), mas é um detalhe interno. O C87 confere no G4, e o QUALITY_GATES registra a
  lição se quebrar numa atualização do 14.
- **As Regions do 14 para a fumaça:** o mestre pode apagar a Region à mão. O desenho tem de seguir o documento, nunca um
  estado guardado no cliente.
- **O celular e o PC fraco:** o teto de partículas e o reduzido automático (o C91) são do fx-visual e do fx-assets. O
  motor só garante que o nível "Só o texto" custa o mesmo que hoje.
