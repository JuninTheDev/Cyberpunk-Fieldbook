# Status da migração para o Foundry 14

**Origem:** Foundry 12 com o sistema Cyberpunk RED - CORE 0.92.4 e os módulos da mesa (cpr-2077, Fluxo de Combate, NET
Architect, Painel Tático).

**Destino:** Foundry 14 (verificado no 14.369) com este sistema, `cpr-fieldbook`.

A campanha real continua no Foundry 12, no servidor. Este status é do sistema, não da campanha. Migrar a campanha exige
os bloqueadores abaixo resolvidos, backup e autorização.

## Compatibilidade com o Foundry 14 (evidência)

- **Auditoria de 2026-10-11:** uma sessão no Foundry 14 de teste capturou todos os avisos de compatibilidade e erros, com
  a pilha. Ela passou por fichas (todas as abas e um item de cada tipo), testes, Death Save, tiro, mirado, supressivo com
  parede, combate com turnos, Desfazer e importação de compêndio. Resultado: **0 avisos e 0 erros**. A captura foi
  provada com um aviso de propósito (`CONST.ACTIVE_EFFECT_MODES`).
- **Captura de avisos no G4:** desde o ciclo 2, o cenário captura os avisos nos dois navegadores, o do mestre e o do
  jogador, e isso inclui a defesa e o dano do jogador e a importação da wiki. No ciclo 3, a captura pegou no navegador
  do jogador um aviso provocado de propósito (o do "sem mestre na mesa"), antes de o passo passar a conferi-lo ele mesmo.
- **APIs do v14 usadas e conferidas no código-fonte da instalação:** `system.changes` e `isSuppressed` nos efeitos;
  `messageMode` nas mensagens; ApplicationV2 nas fichas e janelas; `Die.MODIFIERS`; `measurePath`;
  `polygonBackends.sight.testCollision`; `toggleStatusEffect`.

## O que já foi portado

| De onde | O quê | Estado |
| --- | --- | --- |
| CORE | ficha, atributos, perícias, armas, armaduras, munição, cyberware com efeitos, lesões críticas, tabelas de DV, dano com armadura | portado (conteúdo do CORE 0.92.4 convertido) |
| CORE | Humanidade máxima pelo cyberware | portado no ciclo 1 (10 × EMP, −2 por peça com perda, −4 por borgware) |
| CORE | Consciência de Combate do Solo | portada no ciclo 3, como a wiki descreve (o Ponto Fraco e a Deflexão uma vez por rodada; ver as dúvidas) |
| CORE | habilidades das outras Roles | falta |
| Fluxo de Combate | ataque, defesa às cegas, dano na ficha, mirado, autofogo, supressivo, cartucho, explosivo, Lesão Crítica, Death Save no turno, Desfazer, jogador rolando o dano | portado |
| Fluxo de Combate | quem vê o cartão, texto e animação no token, Reflex Tuner | falta |
| cpr-2077 | importação da wiki | parcial: armas, armaduras, munição, cyberware, equipamento, roupas e drogas do CORE; o resto vira aviso |
| cpr-2077 | volta da ficha para a wiki, pedidos da loja, crossover entre campanhas, armas de 2077 | falta |
| NET Architect | tudo | falta |
| Painel Tático | tudo | falta |

## Bloqueadores para migrar a campanha

1. **O importador descarta** cyberdecks, programas, upgrades (acessórios e hardware), veículos e o conteúdo de 2077 da
   loja (armas, netrunning e cyberware) (`scripts/wiki.mjs`). Equipamento, roupas e drogas já entram (ciclo 8).
2. **Sem volta da ficha para a wiki:** a wiki pararia de receber o estado da mesa.
3. **Sem migração de dados entre versões do sistema** (ainda não há mundo real para migrar).
4. **Faltam a NET e as armas de 2077,** que a campanha usa.

## Dúvidas de regra e discrepâncias

- **O criador da wiki mostra a Humanidade máxima como EMP × 10** (`humanity()` em criador.js), sem tirar 2 por peça.
  A página de regras da wiki e o CORE tiram. No Foundry 12, o importador antigo corrigia com o `setMaxHumanity()` do
  CORE. Este sistema segue a regra (a página da wiki e o CORE). O criador da wiki fica como está até você decidir.

- **Arma branca contra SP ímpar.** Decidido em 2026-10-11: SP 11 → 6, como o CORE e o Fluxo. A wiki permite a leitura 5.
  Ver o ROADMAP.

- **Ponto Fraco e Deflexão de Dano: muda o que a mesa vê.** A wiki diz "primeiro acerto da rodada" e "primeiro dano
  sofrido na rodada" (system-criacao.js e system-catalog.js), e o sistema segue a wiki. No Foundry 12 os dois valem em
  todo dano:
  - a Deflexão, porque o Fluxo chama o `_applyDamage` do CORE com `damageReductionRole: true`;
  - o Ponto Fraco, porque no CORE ele é um bônus situacional, ligado por padrão (`isSituational: true` e
    `onByDefault: true` no role.solo.yaml).

  Duas escolhas do sistema, que a wiki não detalha:
  - a rodada é a do combate de que o personagem participa; fora de combate, os dois valem toda vez;
  - a Deflexão só se gasta quando entra dano: o que a armadura ou o escudo seguram inteiro não conta como dano sofrido.

  Se a mesa ler "rodada" como o turno de cada combatente, é só trocar a marca (`combate.mjs`, `primeiraNaRodada`).

- **Linear Frame vestido (equipamento): o HP sobe com o BODY?** O efeito do CORE troca o BODY por 12 ou 14 enquanto o
  item está equipado, e o HP máximo, que vem do BODY, sobe junto. A wiki diz "BODY vira 14 enquanto plugado" para o
  vestido; para o implantado (cyberware), diz que "atualiza HP, Seriously Wounded e Death Save". Ficou como o CORE.
  Se o vestido não deve mudar o HP, é preciso separar o BODY do HP.

- **Medscanner e Techscanner "não acumulam com outro"** (loja da wiki). Dois equipados somam +4 aqui, como no CORE.

- **Munição de borracha: muda o que a mesa vê.** A wiki diz que a borracha "não causa lesão crítica nem ablação". O
  Fluxo, no Foundry 12, rolava a lesão crítica com ela (só o "não letal" e a ablação vinham do CORE). Agora não sai
  lesão (nem a dos dois 6, nem a Perna quebrada do tiro na perna, nem a do mortalmente ferido), e o cartão avisa.
  **Dúvida:** o +5 do crítico continua entrando com a borracha. A wiki não diz se ele cai junto com a lesão, e o HP para
  em 1 de todo jeito.

- **Munição que não causa dano: muda o que a mesa vê.** A tabela de munição da wiki diz que biotoxina, veneno, EMP,
  flashbang, sonífera e gás lacrimogêneo "não causam dano", e que a fumaça só cobre a área. No Foundry 12, o Fluxo rola
  o dano pela arma (o `createRoll` do CORE) e o aplica na ficha, sem olhar o tipo da munição. Aqui, o ataque, a defesa
  e a área continuam valendo, mas quem é pego não leva dano. O cartão traz o efeito com o texto da wiki, e o mestre o
  resolve.

## Registro dos ciclos

### Ciclo 0 (2026-10-11): segurança e documentos

- **Implementado:**
  - `servidor/atualizar-modulo.sh` e `servidor/atualizar.sh` ignoram o `foundry-sistema/`;
  - `foundry-sistema/instalar.mjs` só instala num Foundry 14 (`tests/lib/foundry14.js` passa `FOUNDRY_VERSAO`);
  - ROADMAP, QUALITY_GATES e este arquivo.
- **Testes:**
  - `bash -n` nos dois scripts do servidor;
  - simulação do filtro (só `foundry-sistema` não marca o módulo; misturado com um módulo da mesa, marca; o loop pula
    o sistema);
  - trava do instalador em pastas de teste: Foundry 12 recusa (saída 1), sem log recusa (saída 1), Foundry 14 instala,
    pasta atualizada do 12 para o 14 instala, `FOUNDRY_VERSAO=14` instala;
  - G1: 0 erros. G4: 28 de 28.
- **Commits:** `ffb55c2` (servidor) e `f6e3473` (sistema e documentos), no branch `sistema-v14`.

### Ciclo 1 (2026-10-11): Humanidade máxima (P0, regra)

- **Implementado:** `regras.humanidadeMaxima(emp, cyberware)` e o máximo derivado das peças instaladas (`dados.mjs`).
- **Testes:**
  - G3, novo: `tests/sistema/regras.test.mjs`, 2 de 2 (os casos de referência da Humanidade e da EMP);
  - G1: 0 erros;
  - G4: 28 de 28. O Kerenzikov instalado e o Solo de exemplo ficam em 36/48. O Solo importado fica em 43/48: a
    Humanidade é a da wiki, e o máximo perde 2 pela peça com perda (as peças grátis de 2077 não reduzem).
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:** a discrepância do criador da wiki (acima).
- **Commit:** `a78d8db`.

### Ciclo 2 (2026-10-11): portões de qualidade (P1)

- **Implementado:**
  - G2: ESLint 10.12.0 pelo npx, com `eslint.config.mjs` na raiz (só o sistema e os testes dele);
  - G3: `tests/sistema/regras.test.mjs` com 19 testes. As regras puras saíram do cenário para cá, uma a uma. O
    conteúdo gerado é conferido contra a wiki: as 13 tabelas de DV faixa por faixa, as lesões pelo resultado do 2d6, o
    atributo, o x2 e o nome de cada perícia, e os itens da loja da wiki;
  - G4: o cenário captura avisos e erros com a pilha nos dois navegadores e falha com qualquer um vindo do sistema;
    passo novo da parede no fogo supressivo;
  - build: o commit da tag do CORE e o SHA-256 do js-yaml são conferidos; o foundryvtt-cli fica na 1.1.0.
- **Testes:**
  - G1: 0 erros;
  - G2: 21 arquivos, 0 erros. O lint foi provado com um código plantado: pegou a variável indefinida e a não usada;
  - G3: 19 de 19;
  - G4: 26 de 26, cerca de 27 s;
  - build: saída idêntica à de antes. Um js-yaml adulterado para o build sem executar nada.
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achados no caminho:**
  - as tabelas de DV do CORE e a da wiki batem em todas as faixas;
  - três armas exóticas do CORE não têm dano (Air Pistol, Microwaver, Shrieker): o efeito delas é especial e não é
    automático nem no CORE.
- **Próximo:** ciclo 3, combate (habilidades do Solo, −6 MOVE do mortalmente ferido, munição depois de checar o mestre).

### Ciclo 3 (2026-10-11): combate (P1)

- **Implementado:**
  - **Consciência de Combate do Solo**, pelos pontos de cada habilidade (`regras.consciencia`), como a wiki descreve:
    - Reação de Iniciativa: +1 na iniciativa por ponto;
    - Ataque de Precisão: +1 em todo ataque a cada 3 pontos (entra como parte do ataque);
    - Detecção de Ameaça: +1 em Percepção por ponto;
    - Ponto Fraco: +1 no dano (antes da armadura) do primeiro acerto da rodada, por ponto;
    - Deflexão de Dano: −1 no primeiro dano sofrido na rodada a cada 2 pontos, até 5;
    - Recuperação de Falhas: com 4 pontos, o 1 natural do ataque não tira um d10 (`1d10xo`; o 10 ainda soma).
  - **As marcas da rodada** ficam no ator, pelo combate de que ele participa. Vão para o cartão do ataque, e o Desfazer
    as devolve se ainda forem da mesma rodada. O cartão mostra as linhas do Ponto Fraco e da Deflexão.
  - **Mortalmente ferido:** −6 MOVE, mínimo 1 (`regras.moveFinal`), como em system-rules.js. O mínimo 1 vale também
    para o que as lesões e a armadura tiram, como antes.
  - **Ataque de jogador sem mestre na mesa:** avisa e para antes de gastar a bala e de rolar. Antes, a bala saía, o
    ataque era rolado e ficava sem resolução.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 22 de 22. Novos: o MOVE do mortal, a Consciência pelos pontos (com o teto da Deflexão) e a redução no dano que
    entra;
  - G4: 29 de 29, cerca de 27 s. Passos novos:
    - o MOVE do mortalmente ferido;
    - a Consciência: iniciativa 12, Percepção +2, e o ataque com o 1 natural somando 1, sem falha crítica;
    - o Ponto Fraco e a Deflexão numa rodada, com um Desfazer no meio, e de novo na rodada seguinte;
    - o ataque do jogador sem mestre: nenhuma bala gasta, nenhuma rolagem, e o aviso conferido.
  - O teste do Desfazer foi provado: sem a devolução das marcas, o passo falhou (28 de 29).
  - O Solo de exemplo passou de iniciativa 10 para 12, porque os 2 pontos de Reação de Iniciativa dele agora contam. O
    teste mudou junto.
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - redistribuir os pontos na ficha (P2);
  - a Briga e as Artes Marciais, que ainda não existem, vão precisar do Ataque de Precisão e da Recuperação de Falhas
    (P2);
  - as habilidades das outras Roles.
- **Próximo:** ciclo 4, lacunas de teste (escudo, "responder pelo jogador", corpo a corpo com esquiva, munição de
  borracha, armadura pesada, a janela do mestre para NPC, os erros da importação).
- **Commit:** `b8b430c`.

### Ciclo 4 (2026-10-11): munição (P0, regra)

O ciclo começou pelas lacunas de teste (P1). O teste da munição de borracha achou dois desvios de regra, e o ciclo
virou P0: o P1 espera enquanto houver problema conhecido de regra.

- **Achado:**
  - o conversor gravava `ablacao: Number(s.ablationValue) || 1`, e o 0 do CORE virava 1 em 13 munições: as 6 de
    borracha, as 2 de biotoxina, as 2 venenosas, a fumaça, o gás lacrimogêneo e o paintball básico;
  - a borracha causava lesão crítica.
- **Implementado:**
  - o conversor guarda o 0 (`Number(s.ablationValue ?? 1)`). O catálogo gerado de novo mudou só nessas 13 munições, só
    na ablação; as perícias e as tabelas saíram iguais;
  - munição de borracha não causa lesão crítica (`combate.mjs`, `ferir`), e o cartão diz quando uma teria saído.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 23 de 23. Novo: a ablação de cada munição do catálogo contra a tabela de munição da wiki (perfurante 2;
    borracha, biotoxina e venenosa 0). Com o catálogo antigo, falhou na Arrow (Biotoxin);
  - G4: 30 de 30. Passo novo: a pistola pesada com borracha, com dois 6 no dano, contra o Alvo com 10 HP. Ele fica com
    1 HP e com o mesmo SP, e não ganha lesão. Sem a correção, o passo falhou (a lesão entrou);
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - o +5 do crítico com a borracha (ver as dúvidas);
  - as munições que não causam dano (ciclo 5).
- **Próximo:** ciclo 5, munição que não causa dano (P0).
- **Commit:** `5e90fe1`.

### Ciclo 5 (2026-10-11): munição que não causa dano (P0, regra)

- **Implementado:**
  - `regras.MUNICAO_SEM_DANO`: as sete munições e o efeito de cada uma, com o texto da tabela de munição da wiki;
  - no tiro, no autofogo, no explosivo e no cartucho, quem é pego por uma delas não leva dano: nada de rolagem de dano,
    lesão, Ponto Fraco ou Deflexão. A linha do cartão diz o efeito, e o mestre resolve. Sem dano, o cartão não tem o
    Desfazer.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 24 de 24. Novo: as munições sem dano são as mesmas da wiki (toda linha "Não causa dano", mais a fumaça), o
    texto do sistema está dentro da linha da wiki, e cada uma existe no catálogo;
  - G4: 31 de 31. Passo novo: o lança-granadas com a granada venenosa explode no Alvo e pega o Capanga. Ninguém perde
    HP, nenhum dado de dano é rolado, e as duas linhas têm o efeito. Sem a correção, o passo falhou: a granada tirou 27
    HP do Alvo, com crítico;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:** os testes de resistência automáticos e os outros efeitos das munições especiais (P2).
- **Próximo:** ciclo 6, lacunas de teste (P1): escudo, "responder pelo jogador", corpo a corpo com esquiva, armadura
  pesada, janela do mestre para NPC e os erros da importação.
- **Commit:** `7cc2e09`.

### Ciclo 6 (2026-10-11): lacunas de teste (P1)

- **Implementado:** só testes. Nenhum bug do sistema apareceu; o comportamento coberto bate com a wiki.
- **Testes** (G4, 6 passos novos):
  - **Escudo e a janela do mestre:** o Capanga (NPC) pode aguentar ou usar o escudo. A janela do mestre mostra "Total
    do ataque: 20 · DV 16"; o escudo leva os 10 PV dele, o resto do tiro se perde, e o Desfazer devolve os PV;
  - **Escudo destruído** (`receberDano` direto, sem dados): o resto do tiro se perde, o explosivo que destrói o escudo
    passa inteiro (12 de 12), e o que não destrói não passa;
  - **Corpo a corpo:** DEX + Arma Branca. O Capanga, com REF 6, esquiva assim mesmo e sem janela. O empate é dele, e o
    golpe que acerta tira os 7 do 2d6;
  - **Armadura pesada:** com Heavy Armorjack (−2) e Metalgear (−4) vale o −4 em REF, DEX, MOVE e na iniciativa; sem a
    Metalgear, o −2. O SP é o maior de cada local;
  - **Jogador que demora:** depois de 8 s, o mestre ganha o cartão, responde "Aguentar", a janela do jogador fecha, o
    cartão de espera some, e a nota "O mestre respondeu por Jogador" entra no resultado. São cerca de 9 s;
  - **Erros da importação:** o personagem que não existe dá a mensagem da wiki, a wiki fora do ar dá "Não consegui
    falar com a wiki em …", e o jogador ouve "Só o mestre importa…". Nenhum ator é criado.
- **Resultados:** G1 0 erros; G2 0 erros; G3 24 de 24; G4 37 de 37, cerca de 37 s. G5 não rodou de novo: o ciclo não
  mexeu na wiki.
- **Achados do harness**, registrados no QUALITY_GATES:
  - o `\s` dentro do template literal do cenário vira `s` no navegador;
  - o `node -e` no Git Bash corta as barras invertidas pela metade;
  - a janela que fecha fica no DOM com `minimizing` por um tempo.
- **Ficou:** com isto, o P0 e o P1 do ROADMAP estão fechados, até onde se sabe.
- **Próximo:** P2. O primeiro item são os tipos de item que o importador descarta (equipamento, roupa, programa,
  cyberdeck, droga, upgrade e veículo), bloqueador da migração da campanha.
- **Commit:** `ad9396b`.

### Ciclo 7 (2026-10-11): tipo do cyberware na ficha do item (P0, dados)

O ciclo 8 (P2) começou pelo exame dos tipos de cyberware do catálogo e achou um problema de dados, que passou na frente.

- **Achado:** as chaves de `TIPOS_CYBERWARE` (`cyberOptic`, `cyberAudio`, `internalBodyCyberware` e
  `externalBodyCyberware`) não são as do catálogo (`cyberEye`, `cyberAudioSuite`, `cyberwareInternal` e
  `cyberwareExternal`). Na ficha do item, o select do tipo não achava o valor e mostrava a primeira opção. Ao mudar
  qualquer campo, a ficha gravava o tipo como `fashionware`. Reproduzido no G4: o Cyberaudio Suite virou `fashionware`
  só de mudar o preço. Hoje o tipo só aparece na ficha, mas é dado perdido, e a base e os slots do cyberware vão
  depender dele.
- **Implementado:**
  - as chaves certas, com os rótulos da loja da wiki ("Cyberolho" no lugar de "Cyberóptico");
  - na ficha do item, todo select (perícia e qualidade da arma, tipo do cyberware, local da lesão) garante o valor
    atual entre as opções. Um valor que a lista não conhece, como o de um conteúdo de 2077, não é trocado.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 25 de 25. Novo: todo tipo de cyberware do catálogo tem rótulo. Antes da correção, faltavam quatro;
  - G4: 38 de 38. Passo novo: mudar o preço na ficha do Cyberaudio Suite e de um cyberware com um tipo inventado; os
    dois mantêm o tipo. Antes da correção, o primeiro virou `fashionware`;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Atenção:** num mundo em que a ficha de um desses cyberwares já foi editada, o tipo pode estar como `fashionware`.
  Confira à mão. Não há migração, porque ainda não existe mundo real deste sistema.
- **Próximo:** ciclo 8, equipamento, roupa e droga no catálogo, na ficha e na importação (P2).
- **Commit:** `a3abc1c`.

### Ciclo 8 (2026-10-11): equipamento, roupa e droga (P2, bloqueador da migração)

- **Implementado:**
  - **Tipos novos:** `equipamento`, `roupa` e `droga`, com a quantidade e o uso da montagem da wiki (equipado,
    carregando ou guardado). O equipamento tem a ativação dos efeitos, que vem do `usage` do CORE: só equipado (Medscanner,
    Linear Frame), equipado ou carregando (Agent, Techscanner), ou ligado à mão (lanterna). A roupa tem o tipo e o
    estilo; a droga, o nome do efeito principal;
  - **Efeitos:** os do equipamento valem conforme o uso (`regras.efeitoValeNoUso`, no `isSuppressed` do efeito). Os da
    droga vêm desligados, como no CORE, e um botão na ficha do item liga e desliga os efeitos de ligar à mão;
  - **Conversão:** os packs de equipamento, roupas e drogas do CORE. O catálogo foi de 300 para 453 itens: 51 de
    equipamento, 90 roupas, 10 drogas e 2 cyberwares do pack de equipamento (Battleglove e Smart Glasses, bases
    externas sem perda de Humanidade). Nenhum item que já existia mudou. Os 3 cyberdecks ficaram de fora, e o build os
    lista. Os efeitos de luz da lanterna, do bastão de luz e do sinalizador (chaves do Active Token Lighting) também
    ficaram de fora, e o build lista;
  - **Compêndios:** Equipamento, Roupas e Drogas;
  - **Importação:** os três tipos entram em pilha, com a quantidade e o uso da wiki. O Solo do teste não gera mais
    nenhum aviso;
  - **Ficha:** a aba Equipamento lista os três, com o uso num botão (equipado → carregando → guardado), e a ficha do
    item tem os campos de cada tipo.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 27 de 27. Novos ou ampliados:
    - toda peça da loja da wiki de equipamento, moda e drogas existe no catálogo;
    - a tabela da ativação pelo uso;
    - a ativação pelo `usage` do CORE, os efeitos da droga desligados e com o efeito principal existente, e os
      rótulos de tipo e estilo de toda roupa;
  - G4: 39 de 39, cerca de 38 s (49 s na rodada que gerou os compêndios de novo). Novo passo do inventário:
    - o Agent vale carregando (+2) e não guardado;
    - o Medscanner vale só equipado;
    - o botão da ficha do item liga o Boost (+2 INT);
    - a ficha lista os três tipos e troca o uso.

    Na importação do Solo, o Agent e as cinco peças de roupa da wiki entram com o uso da montagem, e nenhum aviso sobra.
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achado na wiki:** a loja mostra o tipo de roupa "hats" sem tradução (aqui, "Chapéu").
- **Ficou:** cyberdeck e programa, os upgrades (acessório e hardware), os veículos e o conteúdo de 2077 (P2); usar a
  droga (dose, duração, vício); o não acumular do Medscanner e do Techscanner; a luz no token.
- **Próximo:** ciclo 9, cyberdeck e programa, com os programas no deck (P2, bloqueador da migração).
