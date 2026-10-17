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
  `polygonBackends.sight.testCollision`; `toggleStatusEffect`; no ciclo 50, o HUD do Tile (`TileHUD`, `bind`) e o
  movimento do token (o `_source` com o destino enquanto o token anda; QUALITY_GATES).

## O que já foi portado

| De onde | O quê | Estado |
| --- | --- | --- |
| CORE | ficha, atributos, perícias, armas, armaduras, munição, cyberware com efeitos, lesões críticas, tabelas de DV, dano com armadura | portado (conteúdo do CORE 0.92.4 convertido) |
| CORE e wiki | mãos livres (C12): impedir nova equipagem sem mãos, com os efeitos, BODY 8+ na arma branca e os escudos | portado no ciclo 87 (sessão Codex; a decisão nas dúvidas) |
| CORE | Humanidade máxima pelo cyberware | portado no ciclo 1 (10 × EMP, −2 por peça com perda, −4 por borgware) |
| CORE | Consciência de Combate do Solo | portada no ciclo 3, como a wiki descreve (o Ponto Fraco e a Deflexão uma vez por rodada; ver as dúvidas) |
| CORE | os bônus de Role nas perícias (o Moto do Nomad) | portado no ciclo 23. Com as Roles do RED (ciclo 33), saíram a especialização do Face e os situacionais de 2077 (o Investigator, o Netrunner) |
| CORE | as rolagens das Roles (Impacto Carismático, Credibilidade, Barganha, as do Tech, Cirurgia e Tecnologia Médica) | portadas nos ciclos 34 e 35, com as Roles do RED: pelo item de Role do CORE e pelo texto da wiki (a Barganha é a pechincha do Fixer; o Backup do Lawman, pela wiki). A Interface do Netrunner é o C5 |
| CORE | a janela de rolagem (modificador avulso, os modificadores comuns do livro, os efeitos situacionais; Ctrl pula) | portada nos ciclos 24 (os testes), 25 (o ataque e a iniciativa) e 27 (no computador do jogador, a defesa, o dano e o Death Save; na ficha, o dano e o Death Save) |
| CORE | Facedown | portado no ciclo 39, com a penalidade de ferimento, pela wiki (ver as dúvidas) |
| CORE | consertar a armadura; rolar lesão à mão; macros na barra; juntar itens iguais | falta |
| CORE | ficha de capanga (o mook) | portada nos ciclos 36 e 37: o tipo de ator com os dados do personagem, o token solto, a ficha de uma página, o item arrastado que entra equipado ou instalado e a ficha limitada |
| CORE | Black ICE e demônio como atores | o ciclo 43: os tipos, as fichas com as rolagens, o modelo da wiki, o token solto com a REZ e a iniciativa no topo da fila (ver as dúvidas); o dano no 44 (o do Black ICE no netrunner, o "em Black ICE" e o Zap na REZ, o Zap do demônio); os programas de Black ICE do netrunner no 45 (os 12 da wiki no compêndio de Netrunning); o token que o programa rezza no 46 (pelo mestre ativo) |
| CORE | contêiner (loja, saque, esconderijo) | falta |
| CORE | a Sorte na janela de rolagem | portada no ciclo 20: preparada na ficha (− e +), entra no próximo teste e sai da Sorte |
| CORE | o ledger de Eurodólares, IP e Reputação | portado no ciclo 21, o extrato: somar, subtrair e definir com o motivo, o histórico com quem mudou e o mestre tirando linhas; as diferenças estão nas dúvidas |
| Fluxo de Combate | ataque, defesa às cegas, dano na ficha, mirado, autofogo, supressivo, cartucho, explosivo, Lesão Crítica, Death Save no turno, Desfazer, jogador rolando o dano | portado |
| Fluxo de Combate | a janela "Ataque!" (a reação do alvo: quem ataca, a conta de cada escolha, a barra do tempo; o X e o tempo valem a escolha padrão) | portada no ciclo 28, no visual do sistema |
| Fluxo de Combate | um ataque por vez no mestre, quem vê o cartão do resultado, esconder ou não o total do ataque, texto e animação no token | portados no ciclo 29 (com diferenças: ver as dúvidas) |
| Fluxo de Combate | Reflex Tuner | portado no ciclo 30, pela wiki (ver as dúvidas) |
| cpr-2077 | importação da wiki | portada para os itens: tudo o que a loja da wiki vende (CORE e 2077), menos o Black Chrome, e os veículos da família, com a montagem (programas e hardware no deck, acessórios na arma, upgrades no veículo). Falta pôr as opções de cyberware na base |
| cpr-2077 | o conteúdo de 2077 (armas, cyberware, netrunning) | portado no ciclo 12, da própria wiki, com os números do módulo; no ciclo 31, com o Mission Kit (Neuroport, Rebuilds, munição Smart melhorada, Immunoblockers, quickhacks do Kit) |
| cpr-2077 | os modos das armas de 2077 (ricochete, carga e rajada Tech, teste Smart) e as três configurações | portados no ciclo 17, pelas regras do suplemento de fã. Com o Mission Kit (ciclo 31), a wiki trocou essas regras pelas do Kit, e os modos ainda não o seguem (ROADMAP, P0) |
| cpr-2077 | as regras de cada modelo: os dois canos da Palica, os dois alvos da Kappa, a coronha da Dian | portadas no ciclo 18, pelo suplemento de fã (com os dois cartuchos da Testera, que o Kit manteve). Com o Kit, a wiki mudou várias (a Lexington, a Yukimura, a Burya, a Omaha): ROADMAP, P0 |
| wiki | o Black Chrome (176 itens da loja) | falta |
| cpr-2077 | volta da ficha para a wiki ("Na mesa") | portada no ciclo 13, no mesmo formato |
| cpr-2077 | pedidos da loja | portada no ciclo 14: a entrega dos aprovados (a aprovação é na página do personagem na wiki) |
| cpr-2077 | janela "Personagens da wiki" | portada no ciclo 16: importar, importar da mesa, abrir a ficha, aprovar e recusar pedidos |
| cpr-2077 | a importação no Foundry 12 e no 14 ao mesmo tempo (cada um com o seu vínculo na wiki) | nova no ciclo 57 (o pedido do usuário; o módulo do 12 não muda; ver as dúvidas) |
| cpr-2077 | avisos de envio, a campanha da wiki de cada mundo, crossover entre campanhas, Atualizar da wiki, retrato | falta |
| CORE | a Interface do Netrunner (as 9 habilidades, a Defesa e a Velocidade, as Ações NET, os boosters ativos) | portada no ciclo 40 |
| CORE | os programas no combate da NET (a REZ, o ataque, o dano sem crítico; o dano no cérebro e num programa, pelo mestre) | portados nos ciclos 41 e 42 (o Shield e o Armor pela wiki) |
| NET Architect | a arquitetura (o item, os andares com os demônios e os netrunners inimigos, o mapa) | portada no ciclo 47 (o C8, parte 1) |
| NET Architect e cpr-2077 | o compêndio das arquiteturas (os exemplos do NET Architect; as da campanha, do documento da wiki, como o build do cpr-2077) | portado no ciclo 48 (o C8, parte 2) |
| CORE | a geração da arquitetura pelas tabelas (o lobby e as 4 dificuldades) | portada no ciclo 49 (o C8, parte 3), com um Black ICE por linha (ver as dúvidas) |
| NET Architect | o ponto de acesso nos tiles, a conexão do token (o alcance, os requisitos, o status, o anel) e a janela da NET mínima (quem está na NET, o mapa, o registro, o "Desconectar") | portados no ciclo 50 (o C8, parte 4), com o Range Upgrade (ver as dúvidas) |
| NET Architect | andar e as habilidades contra os andares (o Pathfinder, o Backdoor, o Eye-Dee, o Control com os comandos, o Cloak, o Virus), as Ações NET em combate, a janela com o mapa e o painel do mestre | portados no ciclo 51 (o C8, parte 5); por enquanto o mestre rola (ver as dúvidas) |
| NET Architect | os inimigos no andar (seguram a descida), o Zap e o Slide contra eles, a REZ deles (no painel do mestre) | portados no ciclo 52 (o C8, parte 6) |
| NET Architect | o encontro (a velocidade), o ataque dos inimigos pelo mestre, os efeitos de cada Black ICE na ficha (o fogo, as penalidades, os programas destruídos, o Kraken, o Wisp, o Skunk, o Giant), a desconexão insegura com o efeito | portados no ciclo 53 (o C8, parte 7; ver as dúvidas) |
| NET Architect | o deck na janela (ativar, desativar e atacar com os programas) | portado no ciclo 54 (o C8, parte 8; ver as dúvidas) |
| NET Architect | o combate na NET (os inimigos encontrados na iniciativa, com um token escondido; a vez deles pela janela do mestre; a REZ do token e a do estado juntas; a configuração "Inimigos da NET no combate") | portado no ciclo 55 (o C8, parte 9; ver as dúvidas) |
| NET Architect | as rolagens do jogador na janela de rolagem dele (a configuração "O jogador rola as rolagens da NET") | portado no ciclo 56 (o C8, parte 10; ver as dúvidas) |
| NET Architect | a janela da NET no visual novo (o topo com o netrunner e as Ações NET em losangos, o mapa com a cor de cada andar e os cabos, o painel ao lado, as habilidades com a base da rolagem, o registro com a hora) | refeita no ciclo 58 (o pedido do usuário, a partir da maquete dele, que não cobre tudo) |
| sistema | os cartões do chat no visual novo (a faixa e o tipo na linha de cima, os dados em caixas com o total grande, as etiquetas do resultado e a barra de HP) | refeitos no ciclo 59 (o pedido do usuário, pela maquete dele; os botões da maquete sem função no sistema ficaram de fora) |
| sistema | a ficha nas abas das maquetes (Combate, Equipamento, Cyberware, Role e NET em duas colunas, com os números em grande; a Vida em painéis) e as fichas dos itens (o tipo na cor, as abas, as células) | refeitas nos ciclos 60 a 62 (as funções das maquetes que o sistema não tem ficaram de fora) |
| NET Architect | os nós de controle ligados à cena (as portas, as luzes, os sons e os tokens: a configuração no ponto e os comandos na janela) | portados no ciclo 85 (o C8, parte 11) |
| NET Architect | os arquivos copiados, o Scanner, o editor visual | falta (o C8) |
| Painel Tático | tudo | falta |

## Bloqueadores para migrar a campanha

1. ~~O importador descarta itens~~: resolvido nos ciclos 8 a 12. Tudo o que a loja da wiki vende entra na ficha, e o
   que um dia não existir vira aviso, sem contar como entregue. Falta só pôr as opções de cyberware na base (P3).
2. ~~Volta da ficha e pedidos~~: resolvido nos ciclos 13 e 14.
3. ~~O estado de jogo da campanha~~: resolvido no ciclo 15 pelo "Importar da mesa" (decisão do usuário: pela ficha
   "Na mesa"). Veja o procedimento abaixo. O que valia antes da decisão: o importador trazia o personagem como foi
   criado na wiki (o `resultado` do criador). O que mudou jogando está nos atores do Foundry 12: o HP, as lesões, o dinheiro, os itens ganhos ou
   perdidos, a munição, o cyberware instalado depois. Dois caminhos, para decidir com o usuário (a migração da campanha
   exige backup e autorização):
   - **pela ficha "Na mesa" da wiki**, que o Foundry 12 já manda: tem HP, Humanidade, dinheiro, lesões, STATs,
     perícias e os itens com o uid da wiki. Os itens dados pelo mestre no Foundry 12 vêm só pelo nome (o catálogo usa
     os nomes do CORE, então quase sempre acha);
   - **pelos atores do Foundry 12** (a exportação do mundo, ou o envio de crossover que a wiki já recebe), convertidos
     do formato do CORE para este sistema: mais completo, e mais trabalho.
4. **Faltam a NET, as regras do Mission Kit nos modos das armas de 2077 e o Black Chrome,** que a campanha usa. Os
   modos de 2077 entraram nos ciclos 17 e 18 pelo suplemento de fã; com o Kit, a wiki trocou essas regras, e os modos
   precisam segui-lo. As macros Ricochete e Ataque Smart do mundo do Foundry 12 dependem dos modos de 2077 do cpr-2077.
5. ~~Sem migração de dados entre versões deste sistema~~: resolvido no ciclo 38 (o C1).

## Comparação com o CORE (2026-10-12)

Pedido do usuário: conferir o que o sistema do Foundry 12 ainda tem e este não. O "sistema do Foundry 12" da mesa é o
CORE 0.92.4 com os módulos (cpr-2077, Fluxo de Combate, NET Architect e Painel Tático).

- **Método:**
  - **o código do CORE** em `fvtt-cyberpunk-red-core-dev/` (fora do git): as fichas (personagem, capanga, contêiner,
    Black ICE, demônio), as rolagens e a janela de rolagem (`modules/rolls`, `modules/dialog`), os itens e os mixins,
    as configurações, os ganchos e os textos da interface (`lang/en.json`);
  - **a versão:** a pasta é a 0.93, de desenvolvimento. O que entrou depois da 0.92.4 veio do CHANGELOG (fica fora do
    plano, no ROADMAP). O comportamento da 0.92.4 se confere no GitLab, pela tag, e os compêndios dela estão no
    `.cache` do build;
  - **as Roles da mesa:** os itens de Role do CORE e os do cpr-2077 (`foundry-2077/build/roles.mjs`), que a importação
    do Foundry 12 põe na ficha, contra o texto da wiki (system-catalog.js, system-2077.js e system-criacao.js);
  - **os módulos:** os READMEs do Fluxo, do NET Architect e do Painel Tático.
- **O que muda número na mesa (P0):** os bônus de Role nas perícias. No CORE, o item de Role soma Rank ÷ `bonusRatio`
  nas perícias da lista dele, sempre ou marcado na janela de rolagem (`getRoleMods` em `cpr-role.js`). Na mesa: o
  Nomad soma 4 (Rank 4) nas seis perícias de veículo; o Face soma 4 nas duas da especialização; o Lawman marca o
  Investigator na janela. Aqui nada somava, e a especialização nem era guardada: os que valem sempre entraram no ciclo
  23.
- **O que o Foundry 12 faz e o sistema não:**

  | Área | No Foundry 12 | Aqui | ROADMAP |
  | --- | --- | --- | --- |
  | Rolagens | a janela de rolagem: o modificador avulso, os modificadores comuns do livro (RED p. 130, também na wiki), os efeitos situacionais e a Sorte; Ctrl pula | portada nos ciclos 24, 25 e 27 | feito |
  | Rolagens | Facedown (COOL + Reputação + 1d10) | no ciclo 39 | P2 |
  | Roles | os bônus nas perícias | os que valem sempre no ciclo 23; os situacionais, com a janela | P1 |
  | Roles | as rolagens (Impacto Carismático, Credibilidade, Barganha, as do Tech, Cirurgia e Tecnologia Médica) | nos ciclos 34 e 35 | P2 |
  | Combate | Briga e Artes Marciais (dano pelo BODY); o cyberware que é arma; a arma sob o cano e a baioneta | falta | P2 |
  | Ficha | consertar a armadura com um clique; rolar lesão crítica à mão; macros na barra | falta | P2 |
  | Inventário | usar droga; juntar itens iguais e dividir pilhas; mãos livres ao equipar | falta | P2 |
  | Munição | o EMP nos itens eletrônicos (a macro "Get EMP'd") | falta | P2 |
  | Cyberware | a base com os slots das opções | falta | P3 |
  | NET | Interface, programas com REZ, Black ICE e demônios como atores, as arquiteturas (as tabelas e a cena do CORE, o NET Architect) | a Interface e os programas nos ciclos 40 a 42; o Black ICE e o demônio como atores e o Black ICE próprio do netrunner nos ciclos 43 a 46; a arquitetura (o item e o mapa) no 47; falta o NET Architect (o C8) | P3 |
  | NPCs e mestre | a ficha de capanga; o contêiner (loja, saque, esconderijo); o Painel Tático | o capanga nos ciclos 36 e 37; o resto falta | P3 |
  | Conteúdo | o Black Chrome e os DLCs do CORE 0.92.4; as macros e as cenas | não convertidos (a loja da wiki não vende; a migração avisa) | P3 |
  | Mesa | a régua de DV e o DV no HUD do token; "Hardened" (fora da wiki) | falta | P4 |

- **Já está aqui e bate com o Foundry 12:** a ficha, os atributos e as perícias (com as de família), a iniciativa
  (1d10 + REF + bônus, sem crítico, como o padrão do CORE), os testes com o crítico do d10, o Death Save, o combate do
  Fluxo, a armadura (SP do local, ablação, pesada, arma branca), o escudo, as lesões, o cyberware com a Humanidade, as
  munições, os upgrades do livro básico (pente, ataque, SDP e assentos: os únicos modificadores que o conteúdo do CORE
  usa, fora a luneta e as armas sob o cano), os veículos, o cyberdeck com os programas (sem a NET), o extrato, a Sorte,
  o Lifepath e os efeitos pelo uso.

## Dúvidas de regra e discrepâncias

- **Mãos livres (C12, decidido em 2026-10-17):** a conta básica segue o CORE 0.92.4 (duas mãos mais os efeitos, menos
  as armas equipadas), com as duas regras da wiki confirmadas pelo usuário: BODY 8+ usa arma branca de duas mãos
  com uma; cada escudo equipado ocupa uma mão, inclusive sem HP. O CORE só avisa quando faltam mãos; o C12 impede
  a nova equipagem. A criação e a importação preservam o estado recebido, e a conferência individual não reserva
  mãos entre os itens de uma operação coletiva por macro.

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

- **Rajada Tech: muda o que a mesa vê.** O sistema lê a "rajada de N" como o multiplicador máximo, como o cpr-2077, e
  as balas pelo texto de cada arma: a Kenshin gasta 2, a Omaha 3, a Quasar 10 e a Senkoh as 30 do pente. No Foundry 12,
  toda rajada Tech gastava as 10 balas do autofogo do CORE. Com isso, a Senkoh precisa do pente cheio, e a Kenshin faz
  rajada com 2 balas no pente.

- **Teste Smart: substitui REF + perícia ou é uma alternativa?** A wiki manda combinar com a mesa. Isso virou uma
  configuração, com o padrão do Foundry 12 (substitui). Três escolhas do cpr-2077 seguidas aqui, que a wiki não
  detalha:
  - o tiro mirado e o autofogo da arma Smart continuam REF + perícia (o mirado com −8);
  - o teste Smart troca o atributo, a perícia e o bônus da perícia; o bônus da arma (+1 da excelente), as penalidades e
    o Ataque de Precisão continuam;
  - a espingarda Smart com cartucho (a Zhuo) faz o teste Smart contra a DV 13 do cartucho.

- **Carga Tech através de cobertura: o que se divide.** A fração vale para o dano rolado, com o Ponto Fraco dentro; o
  +5 do crítico entra inteiro, como no Fluxo do Foundry 12. A wiki não diz.

- **A carga esfria até R + 2.** "Uma rodada para esfriar" virou: carregou na rodada R, esfria na R + 1 e carrega de novo
  na R + 2, como o cpr-2077. A marca vale até se o tiro errar, porque a carga faz parte da Ação de ataque. Fora do
  combate, não conta.

- **Ricochete com cartucho ou explosivo: recusado.** O texto diz "um tiro único", e o sistema recusa o ricochete com
  cartucho de espingarda (a espingarda Power com balote ricocheteia). As que só disparam cartucho (a Igla e a Testera)
  nem mostram o botão. A carga Tech com cartucho também é recusada, mas por outro motivo: a Satara, a única Tech de
  cartucho, tem regra própria (os dois cartuchos, 4d6), que espera a mesa (abaixo).

- **Armas de 2077, regras de modelo que esperam a mesa.** O texto de cada uma admite mais de uma leitura. Até a mesa
  decidir, o sistema não faz nada próprio para elas, e a descrição da arma diz que é com o mestre:
  - **Satara:** "na carga Tech, dispara os dois cartuchos e causa 4d6". A carga é o ataque de área do cartucho (DV 13,
    todos à frente até 6 m), com a cobertura, a ablação e o esfriamento da carga? Ou vira um tiro único?
  - **Burya:** "todo disparo já é uma carga Tech". O "Atacar" vira carga (com a pergunta da cobertura)? E a arma esfria
    entre um tiro e outro, o que faz ela disparar uma rodada sim, outra não?
  - **Senkoh:** "na carga Tech (rajada), dispara as 30 balas do pente, o que permite usar fogo supressivo". O botão
    Supressivo comum (10 balas) continua? E o supressivo carregado esfria a arma?
  - **"Dispara três balas Smart"** (Yukimura, Chao, Kappa, Shingen) **e "só dispara em rajadas de três"** (Nowaki,
    Masamune): cada tiro gasta 3 balas? O Foundry 12 gasta 1, e o sistema também, por enquanto.

- **Sorte: preparada na ficha, não numa janela de rolagem.** O CORE pergunta a Sorte na janela de cada rolagem; aqui
  não há essa janela, e a regra da wiki ("antes de rolar, gaste pontos") virou os botões − e + no indicador da Sorte,
  que valem para o próximo teste (atributo, perícia, ataque ou defesa). O Death Save não usa Sorte: ele não passa pelo
  teste e rola contra o BODY (somar pioraria). O dano também não.

- **Pontos de Role por Rank: o Solo é uma leitura.** O Tech (2 por Rank) e o Medtech (1 por Rank) seguem as notas do
  criador da wiki; o Solo ficou com 1 por Rank, como os 4 do Rank 4 que a wiki dá, mas ela não diz a regra do Solo por
  Rank. O máximo em cada especialidade é o Rank (o "até 4 em cada" do Rank 4). A ficha só avisa: se a mesa ler
  diferente, é só trocar `PONTOS_DE_ROLE_POR_RANK` (regras.mjs).

- **Netrunner de 2077: quais testes são "técnicos"?** Saiu no ciclo 33: com o Mission Kit, a wiki levou essa regra para
  "Netrunning de 2077", que depende da rede de três camadas (o C9 do ROADMAP). A pergunta volta lá.

- **O Backup do Lawman: o "6" é o do d6.** A wiki: "rola 1d10 e obtém resposta se o resultado for igual ou inferior ao
  Rank. Um d6 determina em quantas rodadas chega o grupo; um 6 chama uma força um nível acima (no Rank 10, dois grupos)".
  O único dado antes do "um 6" que pode dar 6 é o d6, e o sistema lê assim: o grupo chega em 6 rodadas e é um nível
  acima. O nível (composição, equipamento, proteção) fica com o mestre, porque a wiki não traz a tabela. O item de Role do
  CORE não rola o Backup; aqui ele rola pelo texto da wiki.

- **As perícias do Medtech: pela conta da wiki, não pelo número digitado.** No CORE, o "Surgery Skill" e o "Medical Tech
  Skill" são Ranks digitados no item de Role. Aqui, como no criador da wiki (as `derivadas`), vêm das especialidades: a
  Cirurgia, 2 por ponto, até 10; a Tecnologia Médica, Farmacêutica + Criossistemas. Um Medtech migrado do CORE com os
  números fora dessa conta passa a rolar pela conta; o número antigo fica guardado na ficha, sem uso. Como na Consciência
  de Combate do Solo, os pontos das especialidades valem como estão na ficha: o criador da wiki corta cada um no máximo
  (4), e a ficha só avisa quando passam do Rank.

- **A iniciativa na NET (o C5): a de sempre, com a Velocidade contra o Black ICE.** O ROADMAP pedia "a iniciativa na
  NET". No CORE e na wiki, o netrunner usa a iniciativa de sempre (REF + 1d10). O que decide quem age primeiro ao
  encontrar um Black ICE à espreita é a Velocidade (Interface + bônus de velocidade + 1d10 contra SPD do ICE + 1d10), e
  depois o ICE entra no topo da fila. A iniciativa do Black ICE (SPD) e a do demônio (Interface) como atores, no CORE, são
  o C7.

- **O programa ativo veio antes do C6.** A wiki diz que os boosters somam "enquanto estiver ativo", e o CORE só aplica o
  efeito com o programa rezzado (`isRezzed`). Por isso o C5 trouxe o ativo simples (um botão, sem a REZ atual). O C6
  completa: a REZ atual, derrezzar no 0, as 2 Ações NET para religar.

- **O Shield e o Armor: pela wiki.** No conteúdo do CORE, os dois defensores não têm efeito (só o texto), e o CORE tem o
  bônus `brainDamageReduction` sem ninguém que o dê. Aqui o dano no cérebro olha os defensores ativos do alvo, pela
  wiki: o Shield anula o primeiro dano cerebral de programa que não é Black ICE e se desativa; o Armor reduz 4. O Zap é
  uma habilidade de Interface, não um programa: o Shield não o para, e o Armor reduz. O "uma vez por netrun" dos dois
  (quantas vezes se ativa numa corrida) fica com o mestre.

- **A defesa de um programa: DEF + 1d10, pela wiki.** A wiki dá o combate na NET como "Interface + ATK do programa +
  1d10 vs Interface + 1d10 (ou DEF do programa + 1d10)", e o CORE rola a defesa do programa como Interface + DEF + 1d10.
  Os programas do RED que o netrunner usa têm DEF 0, e o sistema ainda não rola a defesa deles; o Black ICE, que
  defende com DEF + 1d10, vem no C7.

- **A iniciativa do Black ICE e do demônio: o topo da fila, sem somar a SPD.** A wiki diz que o Black ICE "entra no topo
  da fila de iniciativa" (e o demônio, "no topo da iniciativa"), e o `CPRCombat` do CORE dá a ele 1 a mais que a maior
  iniciativa da fila (30 sem ninguém). Mas o `CPRInitiative` do CORE soma ainda o número do ator (a SPD do ICE, a
  Interface do demônio) a esse valor: um Hellhound (SPD 6) entra com a maior + 7, ou 36. Aqui fica a maior + 1 (ou 30),
  como dizem a wiki e o comentário do CORE; o ICE fica no topo do mesmo jeito. A diferença aparece entre vários ICE: no
  CORE, a SPD desempata; aqui, quem entra depois fica acima. No "rolar todos", o ICE e o demônio rolam depois dos outros,
  um de cada vez (no Foundry, as iniciativas de um `rollInitiative` só se gravam no fim).

- **O Black ICE pela tabela da wiki, não por um programa.** No CORE, o Black ICE se configura a partir de um programa de
  Black ICE do mundo (o "configure from program" da ficha), e o CORE 0.92.4 não traz nenhum: o mestre os faz à mão. Aqui a
  ficha preenche o nome e os números pela tabela da wiki (os 12 Black ICE e os 3 demônios do RED, que o build lê das
  regras da wiki), com o efeito e o dano do efeito. O programa de Black ICE do netrunner, que rezza um token, é a parte 3
  do C7.

- **O dano do Black ICE: o do efeito, pela wiki.** No CORE, o Black ICE rola o dano do programa ligado ao token (o
  programa de Black ICE que o rezzou); sem programa ligado, a ficha mostra "N/A" e não rola. Aqui, o dano é o do efeito da
  tabela da wiki (o "2d6 no cérebro" do Hellhound), que a ficha guarda e o mestre pode mudar; sem dano no efeito (o Asp,
  o Liche, o Scorpion, o Skunk), o efeito fica com o mestre.

- **O programa destruído pelo Black ICE anti-programa: o mestre apaga.** A wiki diz que, se o dano bastar para
  desativá-lo, o programa é destruído. O sistema não apaga: o cartão avisa, e o programa fica na ficha, desativado, para o
  mestre apagar (ou guardar, com um Backup Drive no deck).

- **O Zap no Black ICE e no demônio, e o Zap do demônio.** A wiki dá o Zap "no REZ de um programa ou direto no cérebro
  de um netrunner"; o Black ICE é um programa, e o NET Architect da mesa usa o Zap "contra qualquer inimigo", o demônio
  também. Por isso o Zap do netrunner tem o botão da REZ. O dano "em Black ICE" dos programas vale também no demônio
  (Black ICE inteligente), como no NET Architect. O demônio "só usa Zap e Control": o botão do Zap dele vai no intruso
  (no cérebro ou num programa), como o NET Architect (que o põe no cérebro).

- **Os programas de Black ICE: da tabela da wiki.** O CORE 0.92.4 não traz programas de Black ICE (o mestre os faz à
  mão), e a loja da wiki não os vende. Os 12 da tabela da wiki entram no compêndio de Netrunning como programas da classe
  Black ICE, com 2 slots (a wiki: "Black ICE próprio ocupa 2 slots no deck"), o efeito e o dano dele; o netrunner os
  recebe do mestre. O id no catálogo é "black-ice:<nome>", porque não há id da loja; a ficha da mesa manda os itens para a
  wiki pelo nome, e não pelo id.

- **O Black ICE rezzado: pelo mestre ativo.** No CORE, quem rezza o programa cria o token no próprio cliente; um
  jogador sem a permissão de criar tokens não consegue. Aqui quem cria e tira o token é o mestre ativo, quando o programa
  muda. Como no CORE, só a REZ do token volta para o programa (o contrário não); o mestre que apaga o token à mão deixa o
  programa ativo. Sem mestre na mesa, o token não entra, nem depois, quando o mestre chega: desative e ative de novo.

- **A arquitetura: o formato do sistema.** O `netarch` do CORE guarda os andares com textos de tradução ("CPR.netArchitecture.
  floor.options.password") e o DV como texto ("N/A", "8"), e o NET Architect da mesa põe os demônios e os netrunners
  inimigos nas flags do item. Aqui é uma lista só, um conteúdo por linha, com os valores simples (o tipo, o DV, o modelo
  do Black ICE e do demônio da wiki). As arquiteturas da mesa do Foundry 12 (o `netarch` com as flags) não se leem aqui
  direto: as da campanha vêm do documento da wiki, na parte 2 do C8.

- **A geração pelas tabelas: as do CORE, com um Black ICE por linha.** A wiki traz a tabela do lobby e a de
  dificuldades, e diz que os demais andares saem da tabela de 3d6 da dificuldade, no livro (p. 211). Essas tabelas vêm
  do CORE (o lobby dele é igual ao da wiki). Num resultado com vários Black ICE ("Raven, Wisp, Hellhound"), o CORE guarda
  só o texto na descrição e deixa o andar sem ICE escolhido; aqui cada um vira uma linha no mesmo andar, como o livro
  descreve o andar.

- **O alcance do ponto de acesso: o Range Upgrade soma 2; a parede no meio fica com o mestre.** A wiki: "Precisa estar
  a até 6 m de um ponto de acesso, sem parede no meio (8 m com o upgrade de alcance)". O NET Architect da mesa usa o
  alcance da configuração do ponto (6 m de partida), sem o upgrade e sem a parede. Aqui o Range Upgrade instalado no
  deck equipado soma 2 ao alcance do ponto (os 6 viram os 8 da wiki; um ponto com outro alcance ganha os mesmos 2). A
  parede não se confere ainda: o mestre ativo, que resolve a conexão, pode estar vendo outra cena, sem as paredes dela
  no canvas. Fica no ROADMAP (C8), com o Scanner.

- **Sair do alcance: a queda sem o efeito do Black ICE, por enquanto.** A wiki: "Sair do alcance conectado = desconexão
  insegura: sofre o efeito de todo Black ICE encontrado e ainda ativo". O sistema derruba o netrunner e registra a
  desconexão insegura, como o NET Architect. Encontrar o Black ICE vem com o andar e os inimigos (o C8); até lá, não
  há Black ICE encontrado para agir.

- **Quem rola na NET: o jogador, com o prazo da esquiva.** Como no NET Architect, desde o ciclo 56 a configuração "O
  jogador rola as rolagens da NET" (ligada de partida) abre a janela de rolagem no computador do dono do netrunner: as
  ações que ele pediu e as reações (a velocidade, a defesa). O prazo é o "Tempo para o jogador responder" da esquiva
  (60 s de partida, mais 15 s), e não os 120 s da configuração própria do NET Architect. A janela da reação fechada no
  jogador: o mestre rola (no NET Architect, o jogador rolava assim mesmo, sem os ajustes). A ação que o mestre faz pelo
  netrunner, pela janela dele, o mestre rola.

- **O Virus de muitas Ações NET.** A wiki: "Ações NET definidas pelo mestre", com exemplos de 1 a 10 Ações (RED p.
  200). O NET Architect gastava sempre 1. Aqui o mestre põe a DV e as Ações NET na hora; em combate elas saem do turno,
  e o vírus que pede mais do que sobra é recusado (o mestre divide por turnos, à mão, ou o netrunner o faz fora de
  combate, onde as Ações NET não contam). O sistema não guarda um vírus pela metade.

- **Os inimigos atacam na vez deles no combate e pelo painel do mestre.** Como no NET Architect, desde o ciclo 55 o
  Black ICE, o demônio e o netrunner inimigo com ficha encontrados entram na fila do combate (com um token escondido), e
  na vez de cada um a janela do mestre pergunta quem ele ataca. O botão "X ataca" do painel do mestre (ciclo 53)
  continua, para o ataque fora da fila (sem combate, ou com a configuração "Inimigos da NET no combate" desligada).

- **O empate na velocidade do encontro: do netrunner.** A wiki: "Se o ICE vencer, você sofre o efeito na hora"; o empate
  não é vitória do ICE. O NET Architect dava o empate ao ICE. No ataque, o empate é da defesa, nos dois.

- **A desconexão insegura: o Black ICE driblado também age.** A wiki: "sofre o efeito de todo Black ICE encontrado e
  ainda ativo". O NET Architect tirava da conta o Black ICE que o netrunner driblou com o Slide; aqui ele age, porque foi
  encontrado e segue ativo. Fica de fora o que causou a queda (o Giant).

- **O programa destruído na arquitetura: o mestre apaga.** O Asp e o anti-programa que zera a REZ destroem o programa;
  como o NET Architect, o sistema não apaga o item: ele sai do deck, desativado, com "(destruído)" no nome. Vale o mesmo
  do dano do anti-programa pela ficha do Black ICE (acima).

- **O fogo do Hellhound.** A wiki: "deck e roupa pegam fogo (2 no HP por turno)", até uma Ação Carnal apagar. O sistema
  põe o status "Em chamas" e, em combate, tira 2 do HP no fim do turno de quem está em chamas; fora de combate, o mestre
  narra. "Apagar o fogo" na janela da NET tira o status (a Ação Carnal não se conta). O Insulated Wiring no deck impede
  o fogo, como na wiki; o NET Architect também.

- **O Liche e o Scorpion: 1 hora no tempo do mundo.** O −1d6 vira um efeito na ficha com a duração de 1 hora; o Foundry
  o suprime quando o tempo do mundo passa da hora (o mestre também pode apagá-lo).

- **O programa de ataque desativa depois de usado; atacar é 1 Ação NET.** A wiki ("Programas: ataque", RED p. 203–204):
  "Desativam sozinhos depois de usados." O NET Architect deixava o programa ativo; na janela da NET, ele desativa depois
  do ataque, e para atacar de novo é preciso ativá-lo outra vez. A desativação sozinha não conta como a vez da rodada: o
  programa ativado numa rodada anterior pode ser ativado de novo na rodada do ataque; o ativado nesta rodada, só na
  seguinte. Atacar com o programa custa 1 Ação NET, como no NET Architect; a lista de Ações NET da wiki não o traz à
  parte. A aba NET da ficha (ciclo 41) ainda rola o ataque do programa sem pedir que ele esteja ativo, fora da janela da
  NET.

- **O anti-programa contra o netrunner inimigo: na janela, não.** A wiki: o anti-programa "só afeta programas". Os
  programas do netrunner inimigo não fazem parte da arquitetura, e a janela só dá o anti-programa no Black ICE e no
  demônio; o mestre resolve à mão o ataque aos programas do netrunner inimigo.

- **A vez do inimigo no combate: um ataque.** A wiki: o Black ICE "ataca uma vez por turno"; o demônio "só usa Zap com
  as ações que sobram" (2 a 4 Ações NET). Como no NET Architect, a janela da vez dá um ataque; os outros Zaps do
  demônio, o mestre faz pelo painel ("X ataca"), e os nós de controle, à mão.

- **O combate que a NET cria e o netrunner inimigo nele.** Como no NET Architect: com um combate ativo na cena, os
  inimigos encontrados entram nele; sem combate, o encontro cria um, sem começar (as Ações NET só passam a contar quando
  o mestre o começa). O Black ICE e o demônio caídos (REZ em 0) ficam no combate, derrotados, até a arquitetura
  reiniciar. A wiki não diz como o netrunner inimigo entra: o que tem ficha entra com a iniciativa dela (REF + 1d10,
  rolada pelo mestre); sem ficha, não entra. Fora da NET (o cérebro em 0), ele não fica derrotado sozinho: vale a
  ficha dele. A configuração "Inimigos da NET no combate" (padrão: ligada) desliga tudo isso.

- **O Foundry 12 não avisa o ator apagado.** O módulo cpr-2077 do 12 não mudou (a decisão do usuário: não há Foundry 12
  neste PC para testar de ponta a ponta). Ele grava o vínculo do 12 como antes, e no 12 importar de novo continua
  criando outro ator (o vínculo passa a ele). Só o 14 avisa a wiki quando o ator ligado é apagado.

- **Com os dois vínculos, a wiki segue o do 12.** O estado do personagem na wiki ("no Foundry", "mudou depois de
  importar"), o ator que ela mostra e o crossover seguem o vínculo do 12; o do 14 vale sozinho para quem só foi para
  ele. O mestre vê os dois no quadro "Levar para o Foundry". A ficha da mesa é a última que chegou (do 12 ou do 14: a
  mesa roda um por vez), e a janela do 14 diz de qual Foundry ela é.

- **O pedido aprovado entrega no primeiro Foundry que o pegar.** Com os dois ligados, o pedido da loja aprovado na wiki
  é entregue pelo Foundry que estiver aberto (o 12 ou o 14), e o outro não entrega de novo: os itens ficam no ator
  daquele Foundry.

- **O Slide: uma vez por turno, e só até sair do andar.** A wiki: "1 Ação NET (1×/turno)". O NET Architect não contava
  as vezes; aqui, em combate, o segundo Slide do turno é recusado (fora de combate, não há turno). Como no NET Architect,
  o Black ICE driblado volta a segurar quando o netrunner sai do andar e volta.

- **A arma não atinge o Black ICE nem o demônio.** No CORE, o "aplicar dano" do chat aceita o Black ICE e o demônio
  marcados, com qualquer dano (até o de uma arma), e tira da REZ. Aqui a arma ignora os atores da NET marcados (com só
  eles marcados, avisa e não rola nem gasta bala): eles ficam na NET, e o dano neles vem dos programas e do Zap (o C7,
  parte 2).

- **O Facedown leva a penalidade de ferimento: pela wiki, não pelo CORE.** O `CPRFacedownRoll` do CORE soma os
  modificadores de "todas as ações" das lesões (a Concussão, −2), mas não o do estado de ferimento. A wiki dá os dois com
  as mesmas palavras ("Gravemente Ferido: −2 em todas as ações"; "Concussão: −2 em todas as ações"), e aqui o Facedown leva
  os dois, como os outros testes. No Foundry 12, um personagem gravemente ferido tinha 2 a mais no Facedown. Se a mesa
  preferir o jeito do CORE, é tirar o ferimento em `partesDoFacedown` (documentos.mjs).

- **O capanga e a perda de Humanidade: sem a opção "nenhuma".** No CORE, instalar cyberware (também no item arrastado
  para o mook) pergunta a perda: rolada (a padrão), a média ou nenhuma. Aqui o capanga faz como o botão Instalar da ficha:
  rola, e com Shift usa a média. Para um capanga sem perda, a Humanidade se acerta na ficha.

- **Os opcionais de Role da wiki: com o mestre.** Com as Roles do RED, a wiki deixa como opcionais do suplemento de fã o
  Investigator do Lawman (no lugar do Backup) e o desconto do clã do Nomad. O sistema não os automatiza, porque a mesa não
  disse se usa. Até o ciclo 32, o Investigator aparecia como situacional (desligado) na janela de rolagem de todo Lawman.
  Se a mesa usar, ele volta como uma configuração do mundo.

- **Luneta de precisão: muda o que a mesa vê.** A wiki: "+1 em tiro único ou tiro mirado contra alvo a 51 m ou mais.
  Não acumula com cyberware óptico". No CORE, é um +1 situacional desligado, que o jogador marca na janela. Aqui (ciclo
  25), a regra da wiki decide pela distância do primeiro alvo: a janela a traz marcada quando vale, e o ataque sem a
  janela a soma sozinho. "Não acumula" virou: se o cyberware óptico já dá o bônus nesse tiro (o de tiro mirado ou o de
  tiro único), a luneta vem desmarcada.

- **TeleOptics: muda o que a mesa vê (decidido em 2026-10-12, pela wiki).** O CORE (a mesa do Foundry 12) dá +1 no
  tiro mirado e +1 no tiro único, sempre. Agora vale a wiki: o do RED dá "+1 em tiros mirados contra alvos a 51 m ou
  mais"; o de 2077, "+1 em tiro único ou mirado" a 51 m ou mais ("instalar mais de um não soma, e não acumula com a
  Sniping Scope da arma"). Os dois entram como a luneta, pela distância do primeiro alvo.
  - **Para a mesa saber:** a wiki de 2077 diz que, nos itens com o mesmo nome de um do RED (Kerenzikov, TeleOptics,
    Biomonitor), "vale a versão de 2077". A loja da wiki vende as duas versões, e o sistema segue a regra de cada uma.
    Se a mesa quiser só a de 2077, é tirar a do RED da loja.
  - **Um ator que já tinha o TeleOptics do RED** (importado antes do ciclo 26) guarda o efeito antigo do CORE (+1 no
    mirado, sempre) até ser importado de novo; os novos vêm sem ele.

- **Lexington e Testera: muda o que a mesa vê.** O autofogo da Lexington gasta 7 balas ("gastando só 7 balas por
  ataque"; no Foundry 12, as 10 do CORE). A Testera ganhou o botão dos dois cartuchos (4d6), que o Foundry 12 não tinha.
  Os dois canos da Palica são um botão, e não mais a pergunta antes de cada tiro Smart; a regra é a mesma.

- **Extrato: muda o que a mesa vê.** O extrato segue o ledger do CORE (o `CPRLedger` e o `_gainLedger`,
  `_loseLedger` e `_setLedger` da ficha): Subtrair sempre tira, e Somar soma o valor como veio. As diferenças:
  - **os valores não se editam mais no cabeçalho:** o botão de cada um abre o extrato;
  - **a mudança por fora entra no extrato,** como "mudança direta", com quem mudou. No CORE, uma macro que muda o valor
    não deixa linha;
  - **o motivo e quem mudou ficam em colunas separadas** (o CORE junta "motivo - usuário" no texto da linha);
  - **ao tirar uma linha,** o mestre escolhe entre desfazer a mudança (o saldo volta a diferença guardada na linha) e só
    tirar a linha. O CORE lê o primeiro número do texto e pergunta se soma ou subtrai;
  - **o aviso de quem perde mais do que tem** sai quando o saldo fica abaixo de 0. O CORE avisa também no 0 exato
    (`resultantValue > 0`), apesar do texto "Perdeu mais do que tem";
  - **o histórico do Foundry 12 não vem na migração:** a ficha "Na mesa" só manda o saldo, e o extrato começa com a
    linha "Migrado da ficha da mesa do Foundry 12". Trazer o histórico pede uma mudança no módulo da mesa (ROADMAP).

- **O fluxo de combate (ciclos 28 e 29): muda o que a mesa vê.** O sistema segue o Fluxo de Combate, com estas
  diferenças:
  - **o texto em cima do token segue quem vê o cartão do resultado.** No Fluxo, ele aparecia para todos na cena, mesmo
    com o cartão só para o mestre ou para os envolvidos, e contava o resultado (o HP perdido) a quem não via o cartão;
  - **o Desfazer não espera a fila.** No Fluxo, todo pedido ao mestre passava pela mesma fila, e o Desfazer esperava o
    ataque em curso (a defesa pode levar todo o tempo do jogador);
  - **com o total à vista** ("Esconder o total do ataque" desligado), a janela de reação do jogador mostra o total. No
    Fluxo, ela continuava dizendo que ele não o via, embora o cartão do ataque já fosse de todos;
  - **sem resposta no tempo, ou com a janela de reação fechada no X, a escolha padrão rola direto.** No Fluxo, com "O
    jogador rola os próprios dados", a janela de rolagem do sistema ainda abria depois;
  - **a janela do mestre fechada no X deixa o sistema escolher,** como a pergunta antiga deste sistema. No Fluxo, valia a
    escolha padrão (aguentar).

- **Reflex Tuner: o que é "ser atingido"?** A wiki: "depois de ser atingido, +1 para se esquivar pelo resto da rodada".
  O sistema segue o Fluxo: vale todo ataque que pega e rola o dano, mesmo quando a armadura ou o escudo seguram tudo.
  A rodada é a do combate de que o personagem participa; fora de combate, não vale. Duas diferenças do Fluxo:
  - **o "Desfazer" do ataque tira o +1,** como faz com o Ponto Fraco e a Deflexão. No Fluxo, a marca ficava;
  - **o +1 entra em toda Evasão da rodada:** na conta da janela de reação, na esquiva e na escolha automática dos NPCs.
    No Fluxo, entrava só na esquiva.

- **As maquetes do visual novo e as funções que o sistema não tem (ciclos 59 a 62): decidido em 2026-10-15, cada uma
  vira um item do ROADMAP** ("As funções das maquetes que o sistema não tem", ciclo 63). As maquetes de 2026-10-15
  mostram botões e campos sem função no sistema hoje. O visual seguiu as maquetes só com o que existe. Os três que
  contrariam a wiki ou o RED foram decididos pelo usuário em 2026-10-15 e **não entram**: a Sorte só antes de rolar
  (a wiki: "antes de rolar"); o acerto no corpo, e na cabeça só pelo tiro mirado (sem local aleatório); e sem "rolar
  de novo" (o RED não tem). Conferidos na wiki no mesmo dia: os slots de opção do cyberware estão no
  `system-catalog.js`; o conserto da armadura, só "até ser reparada" (p. 186), sem teste nem custo. **Decidido pelo
  usuário em 2026-10-16:** o botão "Consertar" volta o SP ao máximo e o chat diz que o personagem consertou a
  armadura; o mestre narra o conserto (ciclo 70). **Decididos pelo usuário em 2026-10-16, para os itens de regra que
  faltavam:** no Agarrar, o alvo resiste pela janela do dono, como a esquiva (o NPC, o mestre rola); no Proteger-se, só a
  marca "Em cobertura", e o cartão do ataque avisa o mestre, que decide (sem o HP da cobertura); na fundação e nas
  opções do cyberware, a migração encaixa cada opção já instalada na primeira fundação compatível do mesmo ator, e a que
  não couber fica "sem fundação", com aviso; e o "Largar" não entra (o botão do uso e o ✕ já cobrem). A lista:
  - **no chat:** "+ Luck" e "Reroll" no cartão do teste (a Sorte se prepara na ficha antes), "Add to tracker" na
    iniciativa, "Apply damage" e "Roll critical" no dano, "Apply" na perda de Humanidade (o fluxo do ataque e a
    instalação já aplicam);
  - **na ficha:** "Roll initiative" (a iniciativa rola pelo combate do Foundry), o local do acerto (Head, Body,
    Random), as ações Take Cover e Grapple, "Fix" na lesão, "Luck used" no cabeçalho (a ficha mostra a Sorte que resta),
    a quantidade com − e + e "Use" no equipamento, a hierarquia de fundação e opções no cyberware ("+ Foundation",
    "+ Option") e as notas de ciberpsicose (ciclo 60); as notas de Role, "Jack in" e "Jack out" na ficha, os slots do
    deck em barras, a arquitetura ao vivo na aba NET, o estado de cada programa (guardado, carregado, ativo) e "Run"
    (ciclo 61);
  - **na ficha do item** (ciclo 62): "Attack", "Reload", "Repair", "Ablate", "Install option", "Roll humanity", "Run",
    "Reset REZ", "Use", "Drop", "Quick fix" e "Treat", os "hits taken" e a trilha do SP da armadura.

- **Estrangular "abaixo de 0"** (ciclo 81). A wiki diz "Se levaria abaixo de 0, fica com 1 HP e desmaia", e o sistema
  segue a letra: o estrangular que leva o HP a exatamente 0 deixa em 0 (mortalmente ferido), sem desmaiar; abaixo de
  0, fica com 1 e desmaia. Se a mesa ler "abaixo de 1" (o estrangular nunca deixa mortalmente ferido), muda uma linha
  (`regras.danoDoAgarrao`) e o teste de referência. Quem já está abaixo de 1 não sobe para 1 (a wiki não diz; o
  estrangular não cura).

- **Os slots das fundações que a wiki não diz** (ciclo 82). Para o Artificial Shoulder Mount, o MultiOptic Mount e os
  Implanted Linear Frames, a wiki fala de braços e olhos a mais, não de slots de opção; o catálogo fica com os 3 do
  CORE, e nenhuma opção do catálogo encaixa neles (não há opção de borgware). O Meat Arm e a Meat Leg ficam com 3, e os
  de grau médico com 0, como no CORE; a Battleglove com 3 e os Smart Glasses com 2, idem. O Sensor Array é o único que
  diverge: 5 na wiki, 3 no CORE; vale a wiki.

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
- **Commit:** `6aa6850`.

### Ciclo 9 (2026-10-11): cyberdeck e programa (P2, bloqueador da migração)

- **Implementado:**
  - **Tipos novos:** `cyberdeck` (os slots, a qualidade e o uso) e `programa` (classe, ATK, DEF, REZ, o dano contra
    programa ou netrunner e contra Black ICE, o tamanho no deck). O campo `instaladoEm` liga o programa ao deck do mesmo
    ator. O item sabe os instalados num deck, os slots usados e o deck de um programa;
  - **Conversão:** os 3 cyberdecks do pack de equipamento do CORE e os 15 programas. Os efeitos dos boosters (+2 em
    Cloak, Pathfinder, Speed e Backdoor, que são habilidades da Interface) ficam de fora até existir a NET, e o build
    os lista;
  - **Compêndio:** Netrunning (decks e programas);
  - **Importação:** os programas entram no cyberdeck em que a montagem da wiki os pôs (`em`), pelo uid da wiki;
  - **Ficha:** na aba Equipamento, os cyberdecks (os slots usados e os programas de cada um) e a lista de programas (a
    classe, os números e o deck). As duas só aparecem para quem tem um deles. Na ficha do item, os campos do deck (com
    os instalados) e do programa (com o select "Instalado em").
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 28 de 28. Novos ou ampliados:
    - os decks e os programas do CORE que a loja da wiki vende existem no catálogo;
    - os 15 programas têm o ATK, a DEF, o REZ, a classe e o custo da página de NET da wiki;
    - os 3 decks têm os slots da loja;
  - G4: 41 de 41, cerca de 42 s. Passos novos:
    - um Netrunner (Rato de Rua) criado na wiki de teste: a montagem põe 5 programas no deck;
    - importado, o deck fica com 5 de 7 slots, os 5 programas dentro, o uso da wiki e nenhum aviso;
    - a ficha mostra a linha do deck e as 5 de programa, e a ficha do programa aponta para o deck;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achado na wiki:** o gerador da loja (`foundry-2077/build/loja.mjs`, `programData`) lê `s.rez?.max`, mas o `rez` dos
  programas do CORE 0.92.4 é um número. A loja mostra REZ 0 em todos os programas do RED; a página de NET e as regras
  da wiki têm os valores certos (Armor, REZ 7). O gerador precisa do Foundry 12 com o CORE para rodar, e por isso ficou
  como está. O sistema converte direto do CORE.
- **Ficou:** o hardware de deck e os acessórios (os upgrades), os veículos e o conteúdo de 2077 (P2); as regras da NET
  (P3).
- **Próximo:** ciclo 10, os upgrades (acessório de arma e hardware de cyberdeck) no lugar da montagem (P2, bloqueador
  da migração).
- **Commit:** `a96c825`.

### Ciclo 10 (2026-10-11): upgrades (P2, bloqueador da migração)

- **Implementado:**
  - **Tipo novo `upgrade`:** cobre o acessório de arma, o hardware de cyberdeck e o upgrade de veículo. Guarda onde
    instala, os slots, o item em que está (`instaladoEm`) e os modificadores do CORE que o sistema aplica: o pente do
    carregador (troca o tamanho), o bônus de ataque e, para o ciclo dos veículos, o SDP e os assentos;
  - **Na arma:** com um carregador instalado, o pente máximo é o dele (`DadosArma.prepareDerivedData`). Os acessórios
    com bônus de ataque entram no teste pelo nome, sem repetir o mesmo acessório (a wiki: "o mesmo acessório duas vezes
    não faz nada"). A arma ganhou os slots de acessório do CORE (3 na de longo alcance que não é exótica);
  - **Item:** `instalados` e `slotsUsados` valem para o deck e para a arma; `instaladoNo` dá o item onde algo está;
  - **Conversão:** os 51 upgrades do CORE (24 de arma, 6 de cyberdeck, 21 de veículo). O +1 da luneta de precisão é
    situacional e fica de fora, e o build lista;
  - **Compêndio:** Upgrades e acessórios;
  - **Importação:** cada programa, hardware e acessório vai para o deck ou a arma em que a montagem da wiki o pôs, antes
    da munição. Assim, a arma com o carregador maior entra com o pente maior cheio;
  - **Ficha:** os acessórios aparecem na linha da arma, e a lista de upgrades mostra onde cada um está. Na ficha do
    item, os campos do upgrade e o "Instalado em"; na da arma, os slots em uso.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 29 de 29. Novos ou ampliados:
    - a loja inteira de upgrades do CORE no catálogo, com os slots da loja;
    - a tabela de carregadores da wiki, nas 10 classes: o pente padrão de cada arma, o estendido e o tambor;
    - o +1 do Smartgun Link, e a luneta sem bônus automático;
    - os slots das armas da loja (3 nas de longo alcance que não são exóticas);
  - G4: 42 de 42, cerca de 42 s. Passo novo:
    - o carregador estendido põe o rifle em 35, e a recarga enche 35;
    - dois Smartgun Links dão +1 só;
    - tirados os acessórios, o pente volta a 25 e o bônus some;
    - o Backup Drive ocupa 2 slots do deck;
    - as fichas mostram tudo isso;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou** (ROADMAP, P2):
  - o limite de slots (a ficha mostra "5 de 3", mas não impede);
  - os plugs que o Smartgun Link exige;
  - a luneta de precisão (+1 a 51 m ou mais);
  - a arma sob o cano como segunda arma;
  - o pente acima do máximo quando o carregador sai;
  - os veículos.
- **Próximo:** ciclo 11, veículos: os da família do Nomad, com os upgrades (P2, bloqueador da migração).
- **Commit:** `54a258a`.

### Ciclo 11 (2026-10-11): veículos e o "entregues" da importação (P2, bloqueador da migração)

- **Implementado:**
  - **Tipo novo `veiculo`:** SDP (a wiki chama de PDE), assentos, MOVE (a velocidade de combate), a velocidade narrativa
    e a marca de veículo da família do Nomad. Os upgrades instalados nele somam SDP e assentos
    (`DadosVeiculo.prepareDerivedData`);
  - **Conversão:** os 14 veículos do CORE; compêndio Veículos;
  - **Importação:** os veículos da família (`resultado.veiculos`) entram com os upgrades instalados e o SDP cheio, já com
    os upgrades;
  - **Correção:** a lista `entregues` que a importação manda para a wiki tinha os uids de todos os itens e veículos,
    inclusive os que viraram aviso e não entraram. Isso faria um "Atualizar da wiki" futuro nunca trazer esses itens.
    Agora vai só o que entrou na ficha (os uids gravados nos itens). Os upgrades dos veículos, que antes não iam, agora
    vão;
  - **Ficha:** a lista de veículos (SDP, assentos, MOVE, da família e os upgrades). Na ficha do item, os campos do
    veículo, com o SDP e os assentos já somados aos upgrades.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 30 de 30. Novo:
    - os 5 veículos terrestres com o PDE, os assentos, o MOVE e o custo da tabela da wiki;
    - todo veículo e upgrade da Oficina da Família (system-criacao.js) existe no catálogo;
    - o Chassis pesado (+20 SDP) e o Upgrade de assento (+2) batem com a descrição da Oficina;
  - G4: 44 de 44, cerca de 45 s. Passos novos:
    - um Nomad criado na wiki de teste, com o carro compacto (Chassis pesado e Upgrade de assento), a moto e uma arma de
      2077 comprada na loja;
    - importado, o carro fica com SDP 70/70 e 6 assentos e a moto com 35/35, os dois da família;
    - a arma de 2077 vira aviso e não aparece em `entregues`, e os veículos e os upgrades aparecem;
    - sem a correção, o passo falhou: o 2077 entrava em `entregues`, e os upgrades ficavam de fora;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - o conteúdo de 2077 que a loja vende (o último pedaço deste bloqueador);
  - os veículos no combate: o dano no SDP, as armas instaladas, o vidro blindado e um veículo da família por vez.
- **Próximo:** o conteúdo de 2077 (armas-2077, netrunning-2077 e cyberware-2077), que vem dos compêndios do cpr-2077, ou
  o próximo bloqueador da migração, a volta da ficha para a wiki.
- **Commit:** `f110198`.

### Ciclo 12 (2026-10-11): o conteúdo de 2077 (P2, bloqueador da migração)

- **Implementado:**
  - **`build/conteudo-2077.mjs`:** converte o suplemento de fã "Cyberpunk 2077" da própria wiki (`system-2077.js` e
    `system-net.js`). São os mesmos dados de que o módulo cpr-2077 gera os compêndios do Foundry 12, e as regras de
    conversão foram portadas do build dele (`foundry-2077/build`): o tipo, a perícia, o dano, o pente, a munição, o
    autofogo, os slots e o +1 da qualidade excelente de cada arma; o tipo, a base, os slots e a perda de Humanidade
    (com a rolagem equivalente) de cada cyberware; a RAM, os slots e o Cooling de cada deck. Os ids são os da loja da wiki;
  - **o que entra:** 46 armas e as 5 flechettes das armas Tech; 57 cyberwares (os do suplemento, a neuralware de
    netrunning, Berserk e Sandevistan); 21 cyberdecks, 16 quickhacks e 5 daemons;
  - **as armas de 2077:** a classe (Power, Tech ou Smart) e as opções (várias balas Smart, dois alvos, dois canos, a
    rajada da carga Tech, sem ricochete, coronha retrátil) ficam na flag `arma2077`, para quando os modos de 2077
    existirem. A ficha mostra a classe na linha da arma;
  - **modelo:** o deck ganhou a RAM e o Cooling (os de 2077), e o programa ganhou o custo em RAM (o quickhack). As
    classes Quickhack e Daemon entram junto com as do RED;
  - **compêndios:** Armas de 2077, Cyberware de 2077 e Netrunning de 2077. Cada compêndio agora escolhe os itens pela
    origem (o prefixo do id) e pelo tipo.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 31 de 31. Novo: os 150 itens de 2077 que a loja da wiki vende existem no catálogo, com os números que a loja
    registra dos compêndios do cpr-2077:
    - das armas: tipo, perícia, dano, CDT, pente, mãos, ocultável, munição, slots e preço;
    - do cyberware: tipo, base, tamanho, Humanidade e rolagem, instalação e preço;
    - dos decks: slots, RAM e preço;
    - dos daemons: o REZ.

    O teste dos programas do RED (ciclo 9) passou a olhar só os do RED;
  - G4: 45 de 45, cerca de 45 s. Ampliados ou novos:
    - os 3 compêndios de 2077;
    - o Nomad importa a Yukimura (Smart, pente 30, +1 de excelente) sem aviso, e tudo conta como entregue;
    - num personagem sintético da wiki de teste, um item de id desconhecido vira aviso e fica fora de `entregues`. É a
      prova do ciclo 11, que o Nomad não fazia mais;
  - G5 não rodou de novo: o ciclo leu os arquivos da wiki, sem mudar nenhum.
- **Diferença conhecida:** o campo `exotica` da loja não é o "exótica" do suplemento: a loja marca a arma de classe fora
  das do RED. Ele não entra na comparação.
- **Ficou:**
  - os modos das armas de 2077 (P2);
  - o cyberware que é arma, de 2077 e do RED, que ainda não ataca (P2);
  - as opções de cyberware na base (P3);
  - a NET de 2077: RAM, Cooling, quickhacks e daemons (P3).
- **Próximo:** o próximo bloqueador da migração: a volta da ficha para a wiki (HP, munição, dinheiro, lesões) e a entrega
  dos pedidos da loja.
- **Commit:** `f3de672`.

### Ciclo 13 (2026-10-11): a ficha volta para a wiki ("Na mesa") (P2, bloqueador da migração)

- **Implementado:**
  - **`fichaParaAWiki(ator)`:** o retrato da ficha no formato que o módulo cpr-2077 manda no Foundry 12. Leva os tipos e
    os usos do CORE (`weapon`, `equipped`...) e as perícias pelo nome em inglês. Leva também os STATs como estão na mesa
    (com a armadura pesada e o ferimento descontados, a EMP de agora), HP, Humanidade, Sorte, SP, dinheiro, IP,
    reputação, a Role com as habilidades, as lesões e os itens: a arma com o pente e a munição, a armadura com o SP, o
    cyberware instalado, o que está dentro do deck, da arma e do veículo, e o uid da wiki. A wiki mostra isso sem mudar;
  - **a volta:** a cada mudança num ator importado (ator ou item criado, mudado ou apagado), o mestre ativo manda a
    ficha 4 s depois da última mudança (`PUT /api/personagens/<id>/mesa`). Ao entrar, manda todos os atores da wiki uma
    vez. Um erro avisa no console uma vez, até a próxima volta dar certo. Para a macro: `mandarFicha(ator)` e
    `mandarPendentes()`;
  - **configuração** "Mandar a ficha para a wiki", de cada navegador, ligada por padrão.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 31 de 31;
  - G4: 46 de 46, cerca de 50 s. Passo novo: o Solo importado perde 15 HP e gasta 100eb, e 4 s depois a wiki de teste
    tem a ficha da mesa com:
    - HP 30/45 e 400eb;
    - o rifle equipado, com o pente 25 e a munição;
    - a armadura com SP 11, o cyberware instalado, o Agent carregando e as roupas equipadas;
    - os STATs, a Evasão pelo nome do CORE com DEX, a Reação de Iniciativa 2 da Role, e o uid de todo item.

    O passo dos erros da importação manda antes as voltas pendentes, para nenhuma cair na wiki "fora do ar" do teste;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - a entrega dos pedidos da loja (a outra metade deste bloqueador);
  - o crossover entre campanhas: o sistema ainda não manda a campanha, e a wiki só recusa a ficha do mundo antigo
    quando a campanha vem junto;
  - o "Atualizar da wiki", os avisos de envio e o retrato.
- **Próximo:** a entrega dos pedidos da loja aprovados.
- **Commit:** `b9ca7ef`.

### Ciclo 14 (2026-10-11): a entrega dos pedidos da loja (P2, bloqueador da migração)

- **Implementado:**
  - **`entregarPedido(ator, wikiId, pedido)`:**
    - cria os itens do pedido como a importação, guardados (carregando) e com o cyberware sem instalar;
    - põe cada um no lugar e com a munição que o jogador pediu (o `em` e a `municao` da wiki, que apontam para um item da
      ficha ou para outra linha do pedido);
    - desconta o dinheiro e marca o pedido como entregue na wiki;
    - os itens levam o uid `pedido:<id>:<n>` da wiki: com eles já na ficha, a entrega não cria nada de novo;
    - sem dinheiro na mesa, grava o erro na wiki e não entrega;
  - **`entregarPedidos()`:** os pedidos aprovados dos personagens que estão neste mundo. O mestre ativo chama a cada
    minuto, e 5 s depois de entrar, sem avisar quando a wiki não responde. Avisa o mestre de cada entrega e de cada
    pedido que não deu. A aprovação continua na página do personagem na wiki, como hoje;
  - o lint ganhou `setInterval` e `clearInterval` nos globais do navegador.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 31 de 31;
  - G4: 47 de 47, cerca de 52 s. Passo novo, no Solo importado:
    - um pedido aprovado na wiki de teste (o carregador estendido no rifle e 10 balas, 110eb) entra na ficha, com o
      carregador no rifle (pente 35) e as balas, desconta 110eb e fica "entregue";
    - um segundo pedido, de 5.000eb, fica "aprovado" com "Dinheiro insuficiente na mesa: 290eb de 5000eb.";
    - entregar de novo o primeiro, inteiro, não cria nada nem desconta, e a wiki recusa marcar outra vez;
    - sem a guarda do uid, o passo falhou: dois itens a mais e 110eb cobrados de novo;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - a janela "Personagens da wiki" no Foundry, para aprovar ali e para os avisos de envio;
  - o crossover entre campanhas: o sistema não manda a campanha nos pedidos nem na ficha da mesa.
- **Bloqueador que ficou à vista:** o estado de jogo da campanha. Está descrito no bloqueador 3, com os dois caminhos,
  para o usuário decidir.
- **Commit:** `2f62c77`.

### Ciclo 15 (2026-10-11): Importar da mesa, a migração do estado de jogo (P2, bloqueador da migração)

O usuário decidiu migrar pela ficha "Na mesa" (ROADMAP, decisões).

- **Implementado:** `importarDaMesa(id, donoId)` monta o ator pela ficha da mesa que a wiki guarda.
  - **Da mesa:** HP, Humanidade, Sorte, dinheiro, IP, reputação, a Role com as habilidades e as perícias pelo nome do
    CORE, inclusive as de família;
  - **as lesões:** pelo nome do CORE, que é o original das traduzidas ("Broken Leg" vira "Perna quebrada");
  - **os STATs base:** vêm da criação, porque a mesa manda os de agora (com a armadura e as lesões), e aqui eles voltam
    pelos itens;
  - **cada item acha o catálogo:** pelo uid da wiki (da criação, de um pedido, da família do Nomad) ou, sem uid (o que o
    mestre deu no Foundry 12), pelo nome do CORE e pelo tipo;
  - **o estado de cada item:** equipado ou guardado, o pente e a munição carregada (pelo nome), o SP que sobrou na
    armadura, o cyberware instalado (sem descontar a Humanidade de novo) e o que está dentro do deck, da arma e do
    veículo (pelos nomes de `dentro`). As opções de cyberware entram instaladas, mas sem a ligação com a base (aviso);
  - o que não achar vira aviso, e a wiki passa a apontar para o ator novo (com o `entregues` só do que entrou).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 31 de 31;
  - G4: 49 de 49, cerca de 52 s. Passos novos:
    - **uma ficha da mesa escrita no formato do Foundry 12:** itens com e sem uid, a pistola com 5 balas, a armadura com
      SP 10, o deck com dois programas, o Kerenzikov instalado, "Broken Leg" e um item desconhecido. Resultado:
      - HP 20/40 e Humanidade 41/48, com 1.234eb, IP 12 e reputação 2;
      - MOVE 2 (6 da criação, menos 4 da Perna quebrada) e REF 8;
      - a pistola equipada com 5 balas, carregada da munição de 17; a faca carregando; o Agent carregando; SP 10;
      - Sword e Worm no deck, o Kerenzikov instalado, e um aviso só, o do item desconhecido;
    - **ida e volta:** o Solo importado, depois dos pedidos, sai da ficha da mesa igual ao original (HP, dinheiro,
      Humanidade, os 23 itens, o rifle com o carregador e o pente);
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Limitações:**
  - com duas pilhas da mesma munição, a carregada é a primeira pelo nome;
  - um STAT mudado à mão no Foundry 12 não vem (vale o da criação);
  - as notas do ator, os efeitos ligados à mão e os itens renomeados no Foundry 12 sem uid não acham o catálogo pelo
    nome e viram aviso.

- **Commit:** `b58df95`.

### Ciclo 16 (2026-10-11): a janela "Personagens da wiki" (P2)

- **Implementado:**
  - **a janela** (`scripts/janela-wiki.mjs` e `templates/wiki.hbs`, só o mestre), aberta pelo botão no alto da aba de
    Atores, lista:
    - **cada personagem da wiki,** com a situação neste mundo: o ator, a ficha da mesa do Foundry 12 com o HP e a data,
      importado em outro mundo, ou ainda não. Os botões são Importar e Importar da mesa, com o dono no Foundry escolhido
      na linha (o sugerido é o usuário com o nome do dono na wiki), ou Abrir ficha;
    - **os pedidos da loja que esperam o mestre,** com Aprovar (aprova na wiki e entrega na hora) ou "Tentar de novo"
      no aprovado que deu erro, e Recusar, que pede o motivo;
    - **os avisos da última ação,** no alto;
  - na API: `abrirJanelaDaWiki()`, `wiki.personagensDaWiki()`, `wiki.aprovarPedido()` e `wiki.recusarPedido()`.
- **Bug achado e corrigido** no "Importar da mesa" (ciclo 15). O código supunha que `createEmbeddedDocuments` devolve
  os itens na ordem dos dados. Numa rodada não devolveu, e o "Worm" foi parar dentro do "Sword", fora do deck. Agora
  cada item é criado com o `_id` escolhido antes (`keepId`). Dois passos do cenário que pegavam `[arma, municao]` pela
  ordem passaram a pegar pelo tipo, e a regra foi para o QUALITY_GATES.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 31 de 31;
  - G4: 50 de 50 em três rodadas seguidas, cerca de 50 s. Passo novo:
    - o botão aparece na aba de Atores e abre a janela;
    - o Solo mostra "Abrir ficha", e o Netrunner (cujo ator foi apagado) mostra "Importar";
    - "Aprovar" entrega o Agent e desconta 100eb, e a wiki marca "entregue";
    - "Recusar" pergunta o motivo, e a wiki guarda "recusado" com ele;
    - "Importar" traz o Netrunner com o Jogador de dono, e a linha vira "Abrir ficha";
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:**
  - os avisos de envio (quando o jogador clica em "Enviar para o mestre" na wiki);
  - a campanha da wiki de cada mundo: a janela lista os personagens de todas;
  - o "Atualizar da wiki" e o retrato.
- **Próximo:** os modos das armas de 2077 (o ricochete da Power, a carga Tech, o teste Smart), que a campanha usa e são
  o bloqueador 4 da migração, com a NET.
- **Commit:** `c0a5c7e`.

### Ciclo 17 (2026-10-11): armas de 2077, os modos de cada classe (P2, bloqueador da migração)

As regras vêm da página de 2077 da wiki (system-2077.js: "Os três tipos", "Ricochete (Power)", "Carga Tech" e "Armas
Smart"). Onde o texto não diz, valem as escolhas do cpr-2077 do Foundry 12 (`foundry-2077/scripts/armas2077.mjs`), que
a mesa já usa.

- **Implementado:**
  - **Ricochete (Power):** o botão Ricochete na linha da arma. É um tiro único com a perícia da arma, e a DV vem da
    tabela de autofogo: pistolas e SMGs usam a da SMG; as outras, a do rifle de assalto. O dano tem um dado a menos, e o
    Ballistic Coprocessor instalado dá +2. As que só disparam rajadas (Nowaki, Masamune) e as de Disparo Automático não
    ricocheteiam; o aviso sai antes de gastar a bala;
  - **Carga Tech:** os botões Carga e "Rajada ×N" (nas que fazem rajada). A janela pergunta a quem atira a cobertura
    do alvo (sem cobertura, fina ou grossa; na rajada, a grossa nem aparece).
    - Chega ao alvo a fração do dano rolado, para baixo: na carga, tudo, metade ou um quarto; na rajada, tudo ou um
      quarto. O resto fica na cobertura, e o cartão diz quanto atravessou.
    - Se o dano passar da armadura, ela perde 4 de SP sem cobertura e 2 através dela, no lugar da ablação da munição.
    - A rajada é o autofogo carregado: perícia Disparo Automático, tabela de autofogo da SMG e multiplicador até o N da
      arma. Gasta as balas que cada arma diz no texto (Kenshin 2, Omaha 3, Quasar 10, Senkoh as 30 do pente), lidas
      pelo conversor (`techBalas`).
    - Depois de uma carga (tiro ou rajada), a arma esfria uma rodada: a marca fica na arma, no combate do dono; a ficha
      mostra "esfriando: carga na rodada N", e o ataque é recusado com aviso até lá. O "Desfazer" do mestre tira a
      marca;
  - **teste Smart:** sem o Smart Link instalado, a arma Smart não dispara (aviso e "sem Smart Link" na ficha). Com ele,
    o tiro é 10 + 1d10 (12 + 1d10 nos modelos de várias balas) no lugar de REF + perícia; o bônus da arma, as
    penalidades e o Ataque de Precisão continuam. O autofogo e o mirado continuam REF + perícia;
  - **as três configurações do cpr-2077, com os mesmos padrões:** "Ataque das armas Smart" (substitui, ou alternativa
    com o botão Smart), "Arma Smart sem o Smart Link" (não dispara, ou dispara como comum) e "A carga Tech esfria uma
    rodada" (ligada);
  - **na ficha:** a classe ao lado do nome, os botões dos modos, os avisos e o total do ataque com o teste Smart. A
    descrição de cada arma de 2077 passou a dizer o que os botões fazem e que as regras próprias do modelo ficam com o
    mestre;
  - **redesenho da ficha quando o combate acaba:** o Foundry 14 já redesenha as fichas de quem está no combate a cada
    rodada (`Combat#updateCombatantActors`), mas não quando o combate é apagado. Sem isso, o "esfriando" ficava na ficha
    aberta.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 36 de 36. Cinco testes novos de referência:
    - o perfil de cada classe pela flag do catálogo, com a rajada e as balas de cada Tech lidas do texto da wiki;
    - o ricochete: a DV a 10 m comparada com a linha de autofogo da tabela de alcance da wiki;
    - a carga e a rajada Tech: a fração, a ablação, as tabelas e o que impede;
    - o esfriamento;
    - o teste Smart;
  - G4: 53 de 53, cerca de 54 s, em duas rodadas seguidas (e 54 de 54 numa terceira, com um passo temporário só para
    a captura da ficha, tirado depois). Três passos novos, com os dados fixos:
    - **Smart (Yukimura):**
      - sem o Smart Link não dispara nem gasta bala, e a ficha avisa;
      - com ele, 12 + 1 + 5 = 18 (a fórmula `1d10crit + 12 + 1`, sem REF nem perícia);
      - o mirado na cabeça é REF + perícia − 8;
      - na configuração "alternativa", o "Atacar" é REF + perícia e o botão Smart é o teste Smart;
    - **Ricochete (Liberty):** DV 17 a 10 m (a da SMG de autofogo), 2d6 em vez de 3d6 (o terceiro dado da fila sobra),
      +2 com o Ballistic Coprocessor; o rifle do CORE recusa o ricochete sem gastar bala;
    - **Carga Tech (Kenshin, com flechettes):**
      - rodada 1: pela janela, através da cobertura fina, chegam 5 dos 11, e a armadura perde 2;
      - nas rodadas 1 e 2 a arma está esfriando (aviso, nada gasto);
      - rodada 3: pelo botão da ficha, no alvo marcado, sem cobertura, a armadura perde 4 (não o 2 da flechette);
      - o Desfazer devolve o HP e o SP e tira a marca;
      - a rajada através da fina: ×2 (o máximo da Kenshin), 2 balas, chegam 4 dos 18, e a janela não oferece a grossa;
      - com o combate apagado, a ficha deixa de mostrar "esfriando";
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado em seguida:
    - G3: a fração da cobertura fina, o "+ 1" do esfriamento e o 12 + 1d10;
    - G4: a ablação da carga, a troca de REF + perícia pelo teste Smart (o total dá 18 dos dois jeitos: quem pegou foi a
      fórmula) e o redesenho no fim do combate;
  - **conferência visual:** a linha das três armas na ficha (os botões quebram em duas linhas, sem estourar a coluna);
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achado do teste:** o Foundry 14 deixa a janela que fecha no DOM por até 1 s, com a classe `minimizing`, e o teste
  clicou na janela velha. O seletor agora pula a que fecha, e o passo limpa o que criou num `finally`; a falha tinha
  arrastado outros três passos. A regra foi para o QUALITY_GATES.
- **Ficou:**
  - as opções de cada modelo (ROADMAP): Palica, Kappa, Dian, Satara, Burya, o supressivo da Senkoh, Lexington, o +1 da
    Nowaki, da Masamune e da Kyubi, e os dois cartuchos da Testera;
  - o cyberware que é arma;
  - a NET.
- **Próximo:** as opções de cada modelo de 2077, que completam as armas da campanha, ou a NET, o último bloqueador.
- **Commit:** `22a6fb9`.

### Ciclo 18 (2026-10-11): armas de 2077, as regras de cada modelo (P2, bloqueador da migração)

O texto de cada arma vem da wiki (system-2077.js). Entraram as regras que o Foundry 12 já fazia (a Palica, a Kappa e a
Dian, no cpr-2077 e no Fluxo de Combate) e as que o texto deixa claras (a Testera e a Lexington). As que admitem mais
de uma leitura viraram dúvidas.

- **Implementado:**
  - **os dois canos:** o botão "Dois canos" dispara os dois de uma vez e gasta 2 cartuchos; com 1 no pente, não dá. A
    Palica sobe o teste Smart para 12 + 1d10 (só com o Smart Link). A Testera causa 4d6 no cartucho, no lugar de 3d6;
  - **os dois alvos da Kappa,** no tiro Smart, como o Fluxo do Foundry 12: o tiro vai no primeiro alvo marcado; se não
    pegar, as balas vão para o segundo, se ele estiver a até 4 m do primeiro. Os outros marcados ficam de fora, com uma
    nota no cartão. A dica do ataque na ficha explica;
  - **a coronha da Dian:** o botão "Recolher" (depois, "Estender") na linha da arma. Recolhida, a ficha avisa
    "coronha recolhida (−1)", e todo ataque com ela leva −1;
  - **o autofogo da Lexington** gasta 7 balas, e com menos no pente não dá. A dica do botão Autofogo mostra as balas;
  - **as que só disparam cartucho** (a Igla e a Testera) não mostram o Ricochete;
  - **no conversor:** as flags `doisCartuchosDano` (Testera) e `balasDoAutofogo` (Lexington), e a descrição de cada
    arma de 2077 diz o que o sistema faz das regras dela.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 37 de 37. Um teste de referência novo, com o perfil de cada modelo pelo texto da wiki, os 2 cartuchos, o 12 da
    Palica, o alcance dos dois alvos e o que impede;
  - G4: 56 de 56, cerca de 58 s, em três rodadas (a última depois dos ajustes da revisão), e 57 de 57 numa quarta, com
    um passo temporário só para a captura da ficha, tirado depois. Três passos novos, com os dados fixos:
    - **os dois canos:** a Palica faz 12 + 3 = 15 contra a DV 13 do cartucho e gasta os 2; a Testera rola 4d6 (o quinto
      dado da fila sobra) e, com 1 cartucho, recusa; nenhuma das duas mostra o Ricochete;
    - **Dian e Lexington:** o botão recolhe a coronha (o ataque na ficha vai de +11 a +10, o aviso aparece, a fórmula
      tem o −1) e estende de volta; o autofogo da Lexington gasta 7 (21 → 14), ×2 no máximo, e com 5 balas recusa;
    - **Kappa:** o Alvo (REF 8) esquiva pela janela do mestre (20 contra 19), e as balas vão para o Capanga, a 2 m dele
      (7 de dano). Com o Longe, a 18 m do Alvo, não mudam. Com três marcados, o terceiro fica de fora;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado em seguida:
    - G3: o 12 da Palica, o alcance dos dois alvos e os 2 cartuchos;
    - G4: o redirecionamento da Kappa, o 4d6 da Testera e o −1 da coronha;
  - **conferência visual:** a ficha com as seis armas (os botões Dois canos, Estender e Ricochete onde cabem, e o aviso
    da coronha);
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achado do teste:** sem o redirecionamento (a mutação), o teste da Kappa travou em vez de falhar. Os alvos passavam a
  ser resolvidos juntos, e a janela de defesa do Alvo, que é NPC, esperava o mestre, sem prazo. O passo agora fecha
  sozinho uma janela de defesa que não devia aparecer e a anota, e assim falha em 58 s. Também espera a janela clicada
  começar a fechar antes de vigiar. As duas regras foram para o QUALITY_GATES.
- **Ficou:**
  - as regras de modelo que esperam a mesa (Satara, Burya, Senkoh e as três balas, nas dúvidas);
  - o +1 entre 13 e 50 m (Nowaki, Masamune, Kyubi), com a luneta;
  - o BODY mínimo e a recarga de duas Ações;
  - o cyberware que é arma;
  - a NET.
- **Próximo:** pela ordem do ROADMAP, o resto do P2: o cyberware que é arma e, na rolagem, a Sorte, a Briga e as
  Artes Marciais. A NET (P3) é o último bloqueador da migração. O que a mesa decidir sobre as dúvidas de 2077 entra
  antes.
- **Commit:** `1ca9dda`.

### Ciclo 19 (2026-10-12): a ficha nova, no visual do modelo da mesa (P2)

O usuário trouxe um modelo de ficha (`Modelo de ficha/`, HTML e CSS estáticos, no visual de Cyberpunk 2077) e pediu a
ficha do sistema por ele, com o que faltava. O modelo virou a base. A ficha antiga (cabeçalho com os vitais e cinco
abas) saiu.

- **Implementado:**
  - **o visual do modelo:**
    - a paleta (amarelo, ciano e vermelho sobre o escuro), os painéis com o canto cortado, as linhas de varredura e as
      abas amarelas;
    - as fontes Rajdhani e Share Tech Mono, embutidas em `fontes/` (SIL OFL, com a licença e o SHA-256 de cada
      arquivo), para funcionar sem internet;
    - a ficha fica sempre no tema escuro do Foundry (`themed theme-dark`), qualquer que seja o tema da interface. A
      ficha do item ganhou o mesmo tema;
  - **o cabeçalho:** o retrato, a linha "ATOR:// Role // RANK" (a Role com a lista das nove Roles de 2077 da wiki), o
    nome e o apelido, e os indicadores HP, Sorte, Eurodólares, IP e Reputação, editáveis;
  - **a aba Perícias, o painel geral do modelo, em três colunas:**
    - à esquerda, os atributos e os vitais (as barras de HP e Humanidade, a EMP, o limite de gravemente ferido, o
      Death Save e o estado);
    - no centro, as perícias com nível, das mais altas para as mais baixas, com as seis primeiras em destaque, ou todas
      (o botão "Ver todas"). Na lista completa, "+ perícia de família" acrescenta uma Linguagem, um Especialista
      Local, uma Ciência, uma Arte Marcial ou um Instrumento, com a mesma chave da importação (`language-japones`), e
      o ✕ tira;
    - à direita, a armadura (o SP de cada local), as armas equipadas com Atacar, o cyberware instalado e as lesões,
      com o paliativo e o tratamento;
  - **as outras abas:**
    - **Combate:** a tabela das armas com todos os modos, a armadura vestida, a Iniciativa, a esquiva, o Death Save e a
      munição;
    - **Equipamento** e **Cyberware:** em painéis;
    - **Role:** a Role de 2077 da wiki (a habilidade e o resumo) e, para o Solo, o Tech e o Medtech, as especialidades
      com os nomes e as descrições em português, os pontos editáveis e, no Solo, o efeito de agora;
    - **NET:** o cyberdeck e os programas, que saíram de Equipamento;
    - **Vida:** os 17 campos do Lifepath e as notas;
  - **dados novos:**
    - no personagem, o `apelido` e o `lifepath` (texto);
    - no build, as Roles e as especialidades saem do criador da wiki (`system-criacao.js`) para o `gerado.mjs`;
    - a importação da wiki (criar e "Importar da mesa") traz o apelido e o Lifepath que o criador monta;
  - **janela estreita:** o painel geral passa a duas colunas e depois a uma (container query).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 39 de 39. Dois testes de referência novos:
    - as Roles e as especialidades geradas são as do criador da wiki, e as chaves da Consciência de Combate são as
      que as regras leem;
    - o Lifepath tem os campos e os rótulos do criador (`criador.js`);
  - G4: 57 de 57, cerca de 61 s, em duas rodadas seguidas da versão final, e 58 de 58 numa rodada com um passo
    temporário de captura da ficha do item, tirado depois. O que mudou:
    - **o passo da ficha:** confere o tema escuro, as três fontes carregadas, as 7 abas, os 10 atributos, as 3 perícias
      com nível da Atiradora e as 61 ou mais depois de "Ver todas";
    - **um passo novo, com o Solo importado da wiki:**
      - o cabeçalho (Solo, Rank 4, o nome e o apelido "Lab");
      - a aba Role, com as seis habilidades do Solo em português, os pontos 2 e 2 e os efeitos "+2 na Iniciativa" e
        "+2 em Percepção";
      - a aba Vida, com o Lifepath igual ao da wiki;
      - o painel geral, com as armas equipadas, o SP e a barra de HP;
      - a perícia de família criada e tirada pela ficha;
    - **a importação do Netrunner** procura os programas na aba NET;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado em seguida:
    - G3: um rótulo do Lifepath e um nome de especialidade gerado;
    - G4: a importação do apelido e o efeito da Reação de Iniciativa;
  - **conferência visual:** as capturas de todas as abas e das duas fichas de item. Elas levaram a três ajustes: os
    campos com a altura de linha do Foundry (as perícias ficavam altas demais); o cabeçalho, com os campos do tamanho do
    texto (`field-sizing: content`, que precisa de `width: auto`); e o título das perícias, mais curto;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Escolhas e dúvidas:**
  - **os pontos de Role por Rank:** a wiki dá os números do Rank 4 (o Solo, 4 pontos; o Tech, 8; o Medtech, 4) e diz
    como o Tech e o Medtech ganham pontos por Rank, mas não diz isso do Solo. A ficha mostra quantos pontos estão
    distribuídos e a nota da wiki, sem conferir o total nem travar;
  - **o apelido e o Lifepath** vêm da wiki na importação e não voltam na ficha "Na mesa" (a wiki já os tem);
  - **a pasta `Modelo de ficha/`** é do usuário e ficou fora do commit.
- **Ficou:**
  - a conferência dos pontos de Role por Rank;
  - os cartões do chat no visual novo;
  - um botão para gastar Sorte;
  - a NET em ação.
- **Próximo:** pela ordem do ROADMAP, o resto do P2: o cyberware que é arma e, na rolagem, a Sorte, a Briga e as
  Artes Marciais.
- **Commit:** `3cf87a7`.

### Ciclo 20 (2026-10-12): os cartões do chat, a Sorte e a conferência dos pontos de Role (P2)

Pedidos do usuário depois da ficha nova, com o extrato de Eurodólares, que ficou para o ciclo 21.

- **Implementado:**
  - **os cartões do chat no visual da ficha:** o gancho que desenha as mensagens põe `cprf-mensagem` e o tipo do cartão
    (teste, ataque, dano, Death Save, espera, morte) na mensagem que tem um cartão do sistema. Ela fica escura, com a
    borda amarela (vermelha no dano, na morte e no Death Save que falhou), quem falou em amarelo, as partes do teste em
    etiquetas, a fórmula em mono e o total grande. As mensagens que não são do sistema não mudam. O estilo do tema foi
    para `styles/tema.css` (antes `ficha.css`), que agora cobre as fichas e o chat;
  - **a Sorte** (RED p. 130, wiki: "antes de rolar, gaste pontos de LUCK: +1 no teste por ponto"):
    - os botões − e + no indicador da Sorte preparam pontos para o próximo teste, de 0 até a Sorte que resta;
    - o teste (atributo, perícia, ataque ou defesa) soma a "Sorte +N" nas partes e tira os pontos da Sorte;
    - o ↺ é o começo da sessão: a Sorte volta ao máximo (a LUCK);
  - **a conferência dos pontos de Role** (`pontosDeRole`): na aba Role, "X DE Y PONTOS" no título, em vermelho
    quando passa do total do Rank. Abaixo, o aviso do que passou ou do que sobra, e a especialidade acima do Rank fica
    vermelha. Só avisa.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 41 de 41. Dois testes novos:
    - a Sorte que dá para preparar;
    - os pontos de Role, que no Rank 4 dão os números do criador da wiki;
  - G4: 58 de 58, cerca de 63 s, em duas rodadas (e 59 de 59 numa terceira, com um passo temporário só para a
    captura do chat com os ataques, tirado depois). O que mudou:
    - **um passo novo, a Sorte e o visual do chat:**
      - + + − + na ficha deixam 2 pontos preparados, e o pedido de 99 fica nos 5 que restam;
      - o teste de Armas de uma Mão, pelo nome na ficha, dá 8 + 4 + 2 + 5 = 19, com "Sorte +2" nas partes, e a Sorte
        vai de 5 a 3;
      - o teste e o dano do rifle saem com o visual do tema na mensagem inteira;
      - o ↺ volta a Sorte a 6;
    - **no passo da ficha nova:** um ponto a mais no Ponto Fraco dá "5 DE 4 PONTOS" em vermelho e o aviso "PASSOU DO
      TOTAL DO RANK 4"; tirado, volta a 4 de 4;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado em seguida:
    - G3: o teto da Sorte e os 2 por Rank do Tech;
    - G4: o gasto da Sorte no teste e a classe do visual nas mensagens;
  - **conferência visual:** as capturas do chat com os testes, o dano e os ataques;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Escolhas:** a Sorte preparada na ficha e os pontos do Solo por Rank (nas dúvidas, acima).
- **Próximo:** ciclo 21, o extrato de Eurodólares, IP e Reputação, como o ledger do CORE.
- **Commit:** `be9b2af`.

### Ciclo 21 (2026-10-12): o extrato de Eurodólares, IP e Reputação (P2)

O último dos pedidos do usuário depois da ficha nova: o histórico de gastos de Eurodólares e o menu para somar e
subtrair, como no sistema do Foundry 12.

- **Implementado:**
  - **o extrato** (`scripts/extrato.mjs` e `templates/extrato.hbs`), como o ledger do CORE:
    - no cabeçalho da ficha, Eurodólares, IP e Reputação viram botões que abrem a janela de cada um;
    - **o menu:** a quantia e o motivo, com Somar, Subtrair (sempre tira) e Definir (`regras.novoSaldo`). Sem a
      quantia, avisa; perder mais do que tem deixa o saldo negativo, com um aviso;
    - **o histórico,** do mais novo para o mais antigo: a data, a mudança, o saldo depois, o motivo e quem mudou
      (`regras.linhaDoExtrato`), guardado em `system.extratos` (campo novo no modelo do personagem);
    - **a mudança feita por fora** (`AtorCPR._preUpdate`) entra como "mudança direta";
    - **o mestre tira uma linha:** a pergunta, como a do CORE, deixa desfazer a mudança ou só tirar a linha. A linha é
      procurada de novo depois da resposta, caso o extrato tenha mudado no meio;
    - **a janela entra nas janelas do ator** (`ator.apps`), como a ficha: muda junto com ele, também no ator do token,
      e fecha se ele for apagado;
  - **a aba Equipamento** mostra os Eurodólares, as cinco últimas mudanças e o botão do extrato;
  - **as linhas que entram sozinhas** (`AtorCPR.mudarComExtrato`):
    - a importação da wiki: "Dinheiro inicial (criador da wiki)", como o cpr-2077;
    - a migração: "Migrado da ficha da mesa do Foundry 12", no dinheiro, no IP e na reputação;
    - a loja da wiki: "Compra na wiki: " e os itens, o texto do cpr-2077.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 42 de 42. Um teste novo: somar, subtrair (também com valor negativo) e definir como o CORE, só inteiros, e a
    linha do extrato;
  - G4: 59 de 59, cerca de 63 s. O que mudou:
    - **um passo novo, o extrato,** pela ficha da Atiradora:
      - o botão de Eurodólares abre a janela;
      - Somar 100, Subtrair 30 e Definir 50, cada um com o motivo e "Gamemaster";
      - sem quantia, só o aviso;
      - Subtrair 80 deixa −30, em vermelho, com o aviso;
      - um `update` direto vira a linha "= 200 (+230) · mudança direta";
      - o mestre tira a linha da munição só tirando (o saldo fica em 200) e a do pagamento desfazendo (vai para 100),
        com o texto e os botões da pergunta conferidos;
      - o cabeçalho e a aba Equipamento acompanham;
      - o IP tem o extrato dele;
    - **na importação do Solo:** a linha do dinheiro inicial;
    - **nos pedidos da loja:** a mudança da mesa no passo anterior (−100 por fora, sem motivo) e a compra com os itens;
    - **na migração:** as três linhas da mesa;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - **G3:** subtrair sem o valor absoluto;
    - **G4, no passo do extrato:**
      - a janela fora de `ator.apps`;
      - tirar a linha sem tirar;
      - desfazer sem desfazer;
      - sem o aviso do saldo negativo;
    - **G4, em outros passos:**
      - a mudança por fora sem linha (o extrato e os pedidos);
      - a wiki sem o extrato inicial (a importação, os pedidos e a migração);
      - a loja sem o extrato (os pedidos);
  - **conferência visual:**
    - a captura da janela do extrato (o −30 do histórico em vermelho, conferido pela cor do pixel);
    - o cabeçalho e a aba Equipamento;
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Escolhas:** as diferenças do CORE (nas dúvidas, acima).
- **Ficou:** o histórico do ledger do Foundry 12 na migração (ROADMAP; mexe no módulo da mesa, decisão do usuário).
- **Próximo:** pela ordem do ROADMAP, o resto do P2: o cyberware que é arma, e a Briga e as Artes Marciais na
  rolagem.
- **Commit:** `8fa9390`.

### Ciclo 22 (2026-10-12): a comparação com o CORE (documentação)

O usuário pôs o CORE inteiro na pasta `fvtt-cyberpunk-red-core-dev/` e pediu para conferir o que falta.

- **Feito:** a comparação (seção acima), com o plano no ROADMAP: um item novo no P0 (os bônus de Role nas perícias),
  um no P1 (a janela de rolagem), quatro no P2 (as rolagens das Roles, o que falta na ficha e no inventário, o EMP) e
  os do P3 e do P4; e o que só existe na 0.93, fora do plano.
- **Testes:** não se aplicam (só documentos). O código não mudou.
- **Próximo:** o P0 novo, os bônus de Role nas perícias (o Moto do Nomad e a especialização do Face), com a
  especialização guardada pela importação e pela migração. Depois, a janela de rolagem (P1), que os bônus situacionais
  pedem.
- **Commit:** `eaf019f`.

### Ciclo 23 (2026-10-12): os bônus de Role nas perícias (P0, regra)

O P0 achado na comparação com o CORE: no Foundry 12, o item de Role soma o Rank em perícias (`getRoleMods`), e aqui
nada somava.

- **Implementado:**
  - **a regra** (`regras.bonusDeRole`), com a fonte de cada uma:
    - o Moto do Nomad soma o Rank nas seis perícias de veículo (`PERICIAS_DO_MOTO`; wiki: "soma o Rank a Dirigir,
      Pilotar e Tech de veículos terrestres, aéreos e marítimos");
    - a especialização do Face soma o Rank nas duas perícias dela (system-2077.js: "Soma o Rank de Impacto Carismático
      em"). O Rockerboy soma na família Tocar Instrumento, em todo instrumento;
    - o Lawman soma nada sozinho: a especialização dele é o "bônus de caso", com pista de caso ativo, e entra com a
      janela de rolagem;
  - **as especializações vêm da wiki:** o build tira do criador (system-criacao.js) as do Face e do Lawman, com as
    perícias pelos ids daqui (`ROLES` em gerado.mjs). Uma perícia que não existir para o build;
  - **o modelo:** `system.role.especializacao` (o id da wiki) e o bônus na perícia (`pericia(id).role`), na própria
    perícia ou na família dela;
  - **o teste e a ficha:** o bônus entra como uma parte ("Moto +4", "Siren +4") e no total da perícia; a aba Role ganhou
    o painel "Bônus nas perícias", com a escolha da especialização e o que soma;
  - **a importação e a migração** guardam a especialização da criação na wiki (a ficha "Na mesa" não a manda).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 44 de 44. Dois testes novos:
    - o bônus de cada Role (Nomad no Rank 4 e no 6, as três do Face, o Lawman e as outras sem nada);
    - as perícias contra a wiki: o Moto é o conjunto das perícias de veículo do CORE, com a frase da wiki; as
      especializações geradas são as do criador; o texto de 2077 diz que a do Face soma e a do Lawman é bônus de caso;
  - G4: 60 de 60, cerca de 66 s. O que mudou:
    - **no passo do Nomad:** o Moto 4 nas seis perícias de veículo, e "Moto 4" nas partes do teste de Conduzir;
    - **um passo novo, a especialização,** com um Face sintético na wiki de teste:
      - a importação e a migração guardam a Siren;
      - o teste de Conversação dá EMP 7 + 4 + Siren 4 + 5 = 20, com "Siren +4" no cartão, e a ficha mostra 15;
      - na aba Role, a troca para Rockerboy soma no violão (família) e em Malandragem, e tira da Conversação;
      - como Lawman, a Street Cop fica guardada e nada soma;
  - **mutações:** cada uma derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - G3: o Moto sem bônus;
    - G4: a perícia sem o bônus (o Nomad e o Face), a wiki sem a especialização, o teste sem a parte da Role (o Nomad e
      o Face), o total da ficha sem a Role, o bônus sem a família e a migração sem a especialização;
  - **conferência visual:** a captura da aba Role do Face (`v14-role-face.png`).
- **Ficou:** os bônus situacionais (o Investigator do Lawman e o Netrunner de 2077), com a janela de rolagem (P1).
- **Próximo:** a janela de rolagem (P1).
- **Commit:** `0df785f`.

### Ciclo 24 (2026-10-12): a janela de rolagem nos testes (P1)

A janela de rolagem do CORE, que no Foundry 12 todo teste abre e da qual os módulos da mesa dependem.

- **Implementado:**
  - **a janela** (`scripts/janela-rolagem.mjs`, `templates/janela-rolagem.hbs`): o clique no atributo ou na perícia, na
    ficha, abre a janela antes do teste. Ela mostra as partes fixas e o total sem o dado, que acompanha o que se marca, e
    oferece:
    - os situacionais, ligados ou não por padrão, como no CORE (`AtorCPR.situacionaisDoTeste`): os efeitos dos itens
      em uso na perícia, na família dela ou em todas as ações, e os da Role (`regras.situacionaisDeRole`: o
      Investigator do Lawman em Educação, Percepção e nas perícias da especialização; o Netrunner de 2077 em todo teste
      de perícia, dúvida acima);
    - os 12 modificadores comuns do livro, pela tabela da wiki (`regras.MODIFICADORES_COMUNS`, RED p. 130);
    - o modificador do mestre e a Sorte, que vem com a preparada na ficha e sai da Sorte ao rolar;
  - **Ctrl + clique** rola direto, com a Sorte preparada e os situacionais ligados por padrão (o rolar direto do CORE).
    A configuração "Rolar direto, sem a janela de rolagem", deste navegador, inverte (o `invertRollCtrlFunction` do
    CORE). Fechar ou cancelar a janela não rola;
  - **os situacionais do CORE no catálogo:** o build converte cada mudança situacional num efeito à parte
    (`system.situacional`, com o alvo e o "ligado por padrão"), que não soma sozinho (`DadosEfeito.isSuppressed`).
    São 11 mudanças em 9 itens: Amplified Hearing, Image Enhance, o Agent e seis lesões. O que vale sempre continua no
    efeito de sempre (o −4 nos tiros do Olho perdido). A iniciativa do Sandevistan e a luneta ficam de fora até a janela
    chegar na iniciativa e no ataque;
  - **o resto que usa a perícia** (o ataque, a esquiva, a Concentração) leva os situacionais ligados por padrão, como o
    teste direto.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 47 de 47. Três testes novos:
    - os modificadores comuns contra a tabela da wiki;
    - os situacionais de Role;
    - os situacionais do catálogo: cada um com o alvo, o valor e o "ligado por padrão" do CORE, e o que vale sempre no
      efeito de sempre;
  - G4: 61 de 61, cerca de 68 s. O que mudou:
    - **um passo novo, a janela,** com um Lawman com Amplified Hearing, Olho danificado e Dedos esmagados:
      - a janela da Percepção traz as partes, os quatro situacionais (o Olho danificado já marcado), os 12 comuns, a
        Sorte preparada (1) e o total 9;
      - marcar a audição e o Investigator, desmarcar a visão, marcar pouca luz, somar 2 e pôr Sorte 2 dá 19, e o teste
        sai com essas partes: 24 com o dado 5, e a Sorte vai de 3 a 1;
      - cancelar não rola;
      - Ctrl + clique rola direto, com o Olho danificado: 14;
      - no atributo, a janela só traz os Dedos esmagados;
      - com "Rolar direto", o clique rola e Ctrl + clique abre a janela;
    - **o passo da ficha e o da Sorte** rolam com Ctrl + clique, como antes;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - G3: um modificador comum com o valor errado;
    - G4: o situacional somando sozinho, a janela sem os situacionais da Role, o teste direto com todos os
      situacionais, a ficha sem abrir a janela, a Sorte da janela ignorada, os situacionais sem "todas as ações" e o total
      parado;
  - **conferência visual:** a captura da janela (`v14-janela-rolagem.png`).
- **Ficou:** a janela no ataque, na defesa, no dano, no Death Save e na iniciativa (com o Sandevistan e a luneta).
- **Próximo:** a janela de rolagem no resto (P1).
- **Commit:** `0ff2227`.

### Ciclo 25 (2026-10-12): a janela de rolagem no ataque e na iniciativa (P1)

- **Implementado:**
  - **o ataque** (`combate.atacar`, com `perguntar`): os botões de ataque da ficha (Atacar, os modos, Mirar) abrem a
    janela, com as partes do ataque, os situacionais e o resto da janela. Ela vem antes de gastar a bala e de marcar a
    carga Tech: fechada ou cancelada, não ataca. Ctrl + clique, as macros e os testes atacam direto, com os
    situacionais ligados por padrão;
  - **os situacionais do ataque** (`AtorCPR.situacionaisDoAtaque`): os efeitos na perícia da arma e em todas as ações
    (os de Role ficam nos testes) e a luneta de precisão instalada na arma, num tiro único ou mirado, marcada quando
    vale (`regras.lunetaVale`: o primeiro alvo a 51 m ou mais e o cyberware óptico sem bônus nesse tiro; dúvida acima);
  - **a iniciativa** (`scripts/iniciativa.mjs`, `CombateCPR` e `CombatenteCPR`): como o CORE, quem tem um situacional
    de iniciativa vê a janela ao rolar (as partes: o REF, o cyberware, a Reação de Iniciativa), e a Sorte escolhida sai
    da Sorte dele. Sem a janela ("Rolar direto"), entram os ligados por padrão;
  - **o Sandevistan:** o build converte o +3 de iniciativa dele (situacional, ligado por padrão no CORE) num efeito à
    parte.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros (o `Combatant` entrou nos globais do Foundry na configuração do lint);
  - G3: 48 de 48. Um teste novo, a luneta (o tiro único, a distância, o óptico e o texto da wiki); o do catálogo agora
    confere o Sandevistan;
  - G4: 62 de 62, cerca de 74 s. O que mudou:
    - **um passo novo, a janela no ataque e na iniciativa,** com atores e tokens só dele (apagados no fim): um atirador
      com rifle, luneta e Sandevistan, um alvo a 4 m e outro a 52,9 m (10 m no chão e 52 m acima):
      - o Atacar abre a janela com a luneta marcada contra o alvo distante (total 13) e desmarcada contra o perto
        (12); cancelar não rola nem gasta bala;
      - pela janela, contra o perto, o modificador do mestre (+2) e a Sorte (1) entram no ataque, e a luneta não: 20
        com o dado 5; a bala e a Sorte saem;
      - sem a janela, contra o distante, a luneta entra sozinha: 19 com o dado 6;
      - a iniciativa abre a janela com o Sandevistan (+3) marcado: 17 com o dado 6; com "Rolar direto", 18 com o 7;
    - **o passo da carga Tech** clica no botão da ficha com Ctrl (rola direto), como antes;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - G3: a luneta a 50 m;
    - G4: o ataque sem a janela, a bala saindo também antes da janela (o passo novo pegou o gasto no cancelar, e os
      passos de combate, as balas a mais), a luneta nunca marcada, a iniciativa sem os ligados por padrão, a iniciativa
      sem a janela e o que se marca fora do ataque;
- **Ficou:** a janela na defesa do jogador, no dano e no Death Save; o TeleOptics (dúvida acima).
- **Próximo:** a janela de rolagem no resto (P1).
- **Commit:** `a9f0447`.

### Ciclo 26 (2026-10-12): o TeleOptics pela wiki (decisão do usuário)

- **Decisão:** o usuário escolheu a regra da wiki para o TeleOptics, no lugar da do CORE.
- **Implementado:**
  - **a regra** (`regras.TELEOPTICS`, `tipoDeTeleOptics`, `teleopticsNoTiro`, `deLonge`): o do RED serve no tiro
    mirado; o de 2077, no tiro único e no mirado; cada tipo uma vez; o bônus vale com o alvo a 51 m ou mais;
  - **no ataque** (`AtorCPR.situacionaisDoAtaque`): os TeleOptics instalados que servem no tiro entram como os
    situacionais de longe, marcados quando o alvo está a 51 m ou mais; a luneta não acumula com eles;
  - **no catálogo:** o build tira os efeitos do CORE do TeleOptics do RED (+1 no mirado e no tiro único, sempre);
    `REGRA_DA_WIKI` lista o item e o motivo.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 49 de 49. Um teste novo: o TeleOptics contra o texto da wiki (os dois), as regras e o catálogo sem o efeito do
    CORE;
  - G4: 62 de 62, cerca de 90 s. No passo da janela no ataque, uma fase nova, contra o alvo a 52,9 m:
    - com o TeleOptics do RED, o Mirar traz o TeleOptics marcado e a luneta desmarcada (não acumula), e o tiro único só
      a luneta;
    - com o de 2077, o tiro único traz o TeleOptics marcado e a luneta desmarcada;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - G3: o TeleOptics do RED no tiro único;
    - G4: a luneta acumulando com o TeleOptics e o TeleOptics nunca marcado.
- **Próximo:** a janela de rolagem na defesa do jogador, no dano e no Death Save (P1).
- **Commit:** `b517590`.

### Ciclo 27 (2026-10-12): a janela de rolagem do jogador: a defesa, o dano e o Death Save (P1)

O que o Fluxo de Combate fazia no Foundry 12: "O jogador rola os próprios dados na janela de rolagem do sistema, com
modificadores e Sorte: a esquiva, a Concentração, o dano (quem atacou) e o Death Save." Com este ciclo, o P1 fecha.

- **Implementado:**
  - **a defesa** (`combate.perguntarDefesa` e `rolarDefesa`): depois da escolha (Esquivar, Rolar Concentração), a
    janela de rolagem abre no computador do jogador, com os situacionais da perícia, os modificadores comuns, o do
    mestre e a Sorte. Pelos NPCs, o mestre rola direto;
  - **o prazo:** as janelas que o pedido do mestre abre no jogador (a da defesa, a do dano, a do Death Save) entram em
    `janelas` pelo id do pedido, e o mestre as fecha quando desiste de esperar ou responde por ele. Fechada, a resposta
    é nenhuma, e o mestre segue como antes (aguenta, rola o dano, rola o Death Save);
  - **o dano e o Death Save** (`janela-rolagem.perguntarModificador`): uma janela mais curta, como as do CORE, com o que
    vai ser rolado e o modificador do mestre (sem a Sorte, que é só dos testes, e sem os modificadores comuns). O
    modificador do dano entra depois do multiplicador do autofogo (`regras.expressaoDoDano`, como o CORE); o do Death
    Save aparece no cartão ("+1 (mestre)");
  - **na ficha:** o botão do dano da arma e o do Death Save abrem a mesma janela (Ctrl + clique pula);
  - **"Rolar direto"**, no navegador do jogador, vale também para esses pedidos.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 50 de 50. Um teste novo: a fórmula do dano com o modificador, antes e depois do multiplicador;
  - G4: 63 de 63, cerca de 82 s. O que mudou:
    - **um passo novo, a janela do jogador,** no navegador do jogador:
      - a esquiva pela janela, com +1 do mestre e Sorte 1: DEX 7 + Evasão 2 + 1 + 1 + 9 = 20, e a Sorte vai de 5 a 4;
      - o prazo: o jogador escolhe Esquivar e deixa a janela aberta; depois de 8 s, o mestre responde Aguentar, e a
        janela do jogador fecha;
      - o dano que o jogador rola com a pistola: a janela ("Heavy Pistol: 3d6"), com +2 do mestre, dá 4 + 4 + 4 + 2 = 14
        no alvo do passo;
      - o Death Save que o mestre pede: a janela, com +1 do mestre, dá 3 + 1 = 4 contra BODY 6 (passou);
      - o passo devolve o estado do começo (o pente da Atiradora, o HP e a Sorte do Alvo, a penalidade do Death Save) e
        apaga o alvo dele;
    - **o navegador do jogador entra com "Rolar direto"**: os passos do combate conferem as regras, e o passo da janela
      do jogador desliga e confere a janela;
    - **o passo da Sorte** rola o dano pela ficha com Ctrl + clique;
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado (conferido pelo md5):
    - G3: o modificador antes do multiplicador;
    - G4: a esquiva do jogador sem a janela, a janela da defesa fora do prazo (o mestre não a fecha), o dano do jogador
      sem a janela, o modificador fora do dano, o Death Save pedido sem a janela e a Sorte fora da esquiva.
- **Próximo:** o P1 fechou. Pela ordem do ROADMAP, o P2: as rolagens das Roles, a Briga e as Artes Marciais e o
  Facedown; depois, o cyberware que é arma.
- **Commit:** `bea4ea8`.

### Ciclo 28 (2026-10-12): a janela de reação do alvo, como a "Ataque!" do Fluxo (pedido do usuário)

O pedido: "Faça o mesmo estilo para a janela de reação do alvo (Esquivar / Aguentar). E também trabalhe melhor no fluxo
de combate. se precisar use como exemplo o foundry-fluxo-de-combate/". Este ciclo faz a janela. O resto do fluxo de
combate fica para o próximo (ROADMAP, P2, "Do Fluxo de Combate").

- **Implementado:**
  - **a janela** (`janela-defesa.mjs` e `templates/defesa.hbs`, no visual do sistema em `tema.css`), no lugar da pergunta
    do DialogV2. Ela mostra o título ("Você está sendo atacado!"; para o mestre, "Ataque em <alvo>"), os retratos de
    quem ataca e de quem é atacado, a arma, o modo e a distância. Cada escolha vem com a conta:
    - Esquivar: as partes da Evasão do alvo ("DEX 7 + Evasão 2 + 1d10") com a média, e o que ela faz (vira a DV, contra
      o golpe, sair da área);
    - Aguentar: a DV do alcance ("O tiro precisa passar da DV 16 (10 m)"), ou o que acontece na área e no corpo a corpo;
    - Usar o escudo: o escudo e os PV dele;
    - Rolar a Concentração (fogo supressivo): as partes, a média e o que acontece a quem perde (wiki, "Fogo
      supressivo");
  - **o tempo:** a barra mostra o que resta do "Tempo para o jogador responder". Quando ele acaba, ou quando o jogador
    fecha a janela no X, vale a escolha padrão, que o computador dele rola direto, sem a janela de rolagem. O cartão do
    resultado anota o caso ("Jogador fechou a janela: ...", "Jogador não respondeu a tempo: ..."). Antes, fechar dava
    "sem resposta", e o mestre só seguia quando acabava o prazo dele (o tempo mais 15 s);
  - **o total do ataque** continua fora da janela do jogador e nem vai no pedido. A janela do mestre, pelos NPCs, mostra
    o total e a DV, não tem tempo e, fechada no X, deixa o sistema escolher, como a pergunta antiga;
  - **o mestre desiste** (o prazo dele ou "Responder por ele"): a janela do jogador fecha sem resposta (`expirar`), e a
    janela de rolagem aberta depois dela também;
  - **`regras.contaDaDefesa`:** a conta da esquiva e da Concentração pelas partes do teste, com a penalidade e o sinal
    dela, e a média;
  - a ajuda da configuração "Tempo" diz o que vale quando o tempo acaba.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 51 de 51. Um teste novo: a conta da defesa (as partes, a penalidade com o sinal, o 1d10 e a média);
  - G4: 64 de 64, cerca de 95 s. O que mudou:
    - **os seletores** da pergunta (o `responder` do cenário, a Kappa, o corpo a corpo, o jogador) passaram para a janela
      nova;
    - **o passo do jogador** confere a janela: o título, o duelo, a arma e a distância, a nota sem o total (e nenhuma
      linha do total), a conta da esquiva com a média, a DV, o tempo e a barra andando;
    - **o passo do escudo** confere a janela do mestre (o título, o total com a DV, a nota do X, o escudo com os PV) e,
      num segundo ataque, o X: o sistema escolhe (sem a esquiva, o escudo; a escolha padrão do jogador seria aguentar);
    - **um passo novo**, no computador do jogador: o X e o tempo esgotado (10 s) valem a esquiva no corpo a corpo,
      rolada direto, sem a janela de rolagem, e o mestre anota cada caso;
    - **duas capturas novas:** `v14-jogador-defesa.png` (a janela do jogador) e `v14-defesa-mestre.png` (a do mestre),
      conferidas;
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a penalidade somando na conta da defesa;
    - G4, no passo novo: a janela de rolagem abrindo depois do X ou do tempo (o passo levou 50 s: as duas esperaram o
      prazo do mestre), o X do jogador sem resposta, o tempo acabando sem resposta (o passo esperou os 25 s do prazo do
      mestre) e o mestre sem a nota "fechou a janela";
    - G4, nos outros passos: o X do mestre valendo a escolha padrão do jogador (o passo do escudo), a janela do jogador
      aberta depois que o mestre desiste ("jogador demora") e a linha do total na janela do jogador (o passo do jogador
      e o passo novo);
  - **sem teste:** a janela respondida antes de terminar de abrir (o mestre desiste nesse instante) fecha assim que
    aparece. O cenário não reproduz esse instante. O retrato de quem ataca só aparece nas capturas.
- **Próximo:** o resto do fluxo de combate, pelo Fluxo: um ataque por vez no mestre; as configurações de quem vê o
  cartão do resultado e de esconder ou não o total do ataque; o texto e a animação no token; o Reflex Tuner.
- **Commit:** `3c443a7`. Foi o commit "att incompleta" do usuário, que levou o ciclo inteiro junto com o
  `Modelo de ficha/` e a cópia do CORE de desenvolvimento (`fvtt-cyberpunk-red-core-dev/`).

### Ciclo 29 (2026-10-12): o que a mesa vê do ataque, como o Fluxo (pedido do usuário)

O resto do pedido do ciclo 28 ("trabalhe melhor no fluxo de combate"), pelo Fluxo de Combate: a fila, as configurações
de quem vê o quê e o texto em cima do token. O Reflex Tuner fica para o próximo ciclo.

- **Implementado:**
  - **um ataque por vez no mestre** (`naFila` em `combate.mjs`, como o do Fluxo): o ataque que chega, do jogador pelo
    socket ou do próprio mestre, espera o anterior terminar (a defesa, o dano e o cartão). Antes, dois ataques ao mesmo
    tempo abriam duas janelas de reação e misturavam os pedidos. O Desfazer não entra na fila;
  - **"Esconder o total do ataque até a defesa"** (padrão: sim, como antes). Desligado, o cartão do ataque é de todos
    desde o começo, e a janela de reação do jogador mostra o total;
  - **"Quem vê o cartão do resultado":** todos (padrão, como antes), os envolvidos (o mestre, quem atacou e os donos
    dos alvos) ou só o mestre;
  - **"Efeitos na mesa"** (`efeitos.mjs`, como o `fx.mjs` do Fluxo):
    - o texto que sobe em cima de cada alvo, nas cores do tema e só para quem vê o cartão ("Esquivou!", "Errou",
      "−12 HP · crítico!", "A armadura segurou", "No escudo", "Suprimido!", "Firme");
    - com o Sequencer e o JB2A ativos, a animação do acerto e do erro; com o Diwako, o som do acerto;
    - as escolhas: texto e animação (padrão), só o texto, ou nada;
  - **`regras.textoNoToken`:** o texto e a cor de cada resultado.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 52 de 52. Um teste novo: o texto em cima do token (o HP perdido, o crítico, a armadura e o escudo que
    seguraram, cada resultado sem dano e o "sem DV", que não tem texto);
  - G4: 65 de 65, de 100 a 126 s. A diferença é do PC: o passo novo leva cerca de 5 s. Esse passo, com o mestre e o
    jogador, dá seis tiros que o Alvo aguenta e que erram:
    - a fila: o segundo tiro sai enquanto o primeiro espera a defesa; o jogador vê uma janela por vez, e os cartões
      saem na ordem;
    - o texto "Errou" em cima do Alvo nos dois navegadores;
    - só o mestre: o cartão vai só para ele, e o jogador não vê o conteúdo nem o texto;
    - os envolvidos: o cartão vai para o mestre e para o dono do Alvo, que vê o texto;
    - "Efeitos na mesa: Nenhum": nenhum texto;
    - o total à vista: o cartão do ataque é de todos antes da defesa, e a janela de reação mostra "Total do ataque: 14 ·
      DV 16";
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o "−0 HP" quando a armadura segura tudo;
    - G4: sem a fila (o jogador viu duas janelas juntas), o cartão sempre para todos, os envolvidos sem os donos dos
      alvos, o texto para quem não vê o cartão, o texto só no mestre (sem o socket), "Nenhum" sem efeito, o cartão do
      ataque sempre escondido e o total à vista fora da janela de reação;
  - **sem teste:** a animação do Sequencer com o JB2A e o som do Diwako. Os módulos não estão no Foundry 14 de teste.
- **Próximo:** o Reflex Tuner (wiki: depois de ser atingido, +1 para se esquivar pelo resto da rodada).
- **Commit:** `5a10d5f`.

### Ciclo 30 (2026-10-12): o Reflex Tuner (pedido do usuário, o fluxo de combate)

O último item do Fluxo de Combate que faltava. A regra é a da wiki (system-2077.js): "Coprocessador de emergência: depois
de ser atingido, +1 para se esquivar pelo resto da rodada".

- **Implementado:**
  - **a regra** (`regras.ehReflexTuner` e `REFLEX_TUNER`): o item pelo id do catálogo (`cyberware-2077:reflex-tuner`) ou
    pelo nome;
  - **no ator** (`AtorCPR.temReflexTuner` e `reflexTunerAtivo`): instalado, e com a marca "atingido" na rodada atual
    do combate dela, a Evasão ganha a parte "Reflex Tuner +1". Com isso o +1 aparece na conta da janela de reação, na
    janela de rolagem e na esquiva, e entra na escolha automática dos NPCs;
  - **no ataque** (`ferir`, em `combate.mjs`): quem tem o Reflex Tuner e é atingido ganha a marca da rodada, que vai
    para o cartão. O "Desfazer" a tira.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 53 de 53. Um teste novo: o texto da wiki, o item pelo catálogo e pelo nome e o +1;
  - G4: 66 de 66, cerca de 100 s. Um passo novo, no combate (com o mestre), com o Reflex Tuner no Capanga:
    - antes do tiro, a Evasão dele é DEX 5 + Evasão 0;
    - atingido pelo tiro, ganha o "Reflex Tuner 1";
    - o "Desfazer" do tiro tira o +1;
    - atingido de novo, esquiva o golpe de lâmina com o +1 (6 + d10 9 = 15 contra 12);
    - na rodada seguinte, o +1 acabou;
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o nome que pega o "Reflex Booster";
    - G4: o atingido sem a marca, o +1 em qualquer rodada, a marca fora do cartão (o "Desfazer" não a tira) e o +1 fora
      da Evasão.
- **Fica do Fluxo (opções, sem pressa):** três chaves que o sistema não tem. O comportamento padrão delas já é o do
  sistema (ROADMAP, P2):
  - "Resolver os ataques", que liga e desliga a automação;
  - "O jogador rola os próprios dados", em que, desligada, o mestre rola a defesa e o Death Save;
  - "Dano: manual".
- **Próximo:** o P2 pela ordem do ROADMAP: as rolagens das Roles, a Briga e as Artes Marciais e o Facedown; depois, o
  cyberware que é arma.
- **Commit:** `82e89b4`.

### Ciclo 31 (2026-10-12): o master na branch, o Mission Kit no catálogo, três correções e as ferramentas da migração

Da revisão de 2026-10-12, feita para o plano da migração da mesa para o Foundry 14, na branch `revisao-v14`, que partiu
do ciclo 15. Lá ele se chamava "ciclo 16"; na integração (ciclo 32), virou o 31.

- **Implementado:**
  - **Mescla do master:** o Mission Kit, o Black Chrome, o visual novo e os backups do servidor.
    - Teve um conflito, em `servidor/atualizar.sh`.
    - O gatilho do módulo do Foundry 12 ficou com os arquivos novos do master e com o filtro do `foundry-sistema/`.
  - **O conversor de 2077 segue o Mission Kit**, como o build do cpr-2077:
    - **Armas:** a origem e as regras próprias vão na flag `arma2077`. A arma comum tem 1 slot de acessório (o Rebuild
      ocupa 2 de 3), e a munição de cada arma segue as regras novas (só cartucho; balote e cartucho; pistola muito pesada);
    - **Itens novos do Kit:** os 3 Rebuilds (upgrades de 2 slots) e as 9 munições Smart melhorada;
    - **Cyberware:** o grupo Neuroport (o Neuroport é base, com 5 slots de opção) e as opções do Kit: Mantis Blade,
      Gorilla Arm, Berserk Implant e David's Experimental Sandevistan;
    - **Droga:** a Immunoblockers;
    - **Quickhacks:** os do Kit vêm sem preço (todo netrunner faz os do nível dele); os do suplemento, com o preço opcional;
    - **Flechettes:** saíram, como na wiki.

    O catálogo foi de 686 para 704 itens (168 de 2077). Os compêndios de 2077 passaram a incluir os upgrades e a droga.
  - **Editor de Dor:** tira só o −2 de gravemente ferido (`regras.penalidadeDoFerimento`).
  - **Desinstalar cyberware:** não devolve a Humanidade.
  - **Endereço da wiki:** deduzido de `mesa.<domínio>` (`wiki.enderecoPadraoDaWiki`). A configuração vem vazia.
  - **Ator antigo:**
    - a entrega e o erro dos pedidos mandam o ator;
    - só o ator ligado entrega (o `entregarPedidos` acha o ligado, mesmo com uma cópia antiga no mundo);
    - a ficha recusada como "ator antigo" para de ser mandada, sem aviso;
    - a wiki recusa os dois (commit `30692f7` no master).
  - **Pacote das cenas:** `migracao/pacote-das-cenas.mjs`. O lint passou a cobrir `migracao/`.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros. Com um erro plantado em `migracao/`, o lint pegou;
  - G3: 35 de 35.
    - **Novos:** o Editor de Dor (falhou com a regra antiga), o endereço padrão da wiki, a loja inteira (o que falta é só
      o Black Chrome) e os itens do Mission Kit.
    - **Ajustados:** os 157 itens de 2077 e os 35 acessórios da loja; a contagem de drogas conta só as do CORE;
  - **G4 não rodou: não há Foundry 14 instalado neste PC.** O cenário mudou sem rodar:
    - os compêndios de 2077 com 58, 62 e 48 itens (o build gerou esses números);
    - a Yukimura com bônus 0 (no Kit ela é de qualidade padrão);
    - um passo novo, o do desinstalar.

    Rode o G4 antes de confiar nesta versão;
  - **O pacote das cenas,** com o mundo `edgerunners-storys` tirado do backup completo de 2026-10-12:
    - saíram 13 cenas, 3 diários, 3 playlists e 48 arquivos (286 MB);
    - nenhum caminho antigo sobrou, e todo caminho novo existe;
    - importado no Foundry 12 de teste sem erro nem aviso: as paredes, as luzes, os tiles (com a flag do NET Architect),
      a playlist da Intro e os arquivos abrindo;
    - no Foundry 14, não foi testado;
  - G5 (a suíte da wiki no master, com a trava do ator antigo): tudo certo.
- **Ficou:**
  - o G4;
  - o Black Chrome;
  - as regras de 2077 do Kit;
  - o `importarDaMesa` avisar sem necessidade das bases de corpo do CORE (no ensaio com o Qyan, a "Internal (7 Option
    Slots)", que este sistema não usa).
- **Commit:** `3a73abd` (na `revisao-v14`), depois da mescla `edd0624`.

### Ciclo 32 (2026-10-12): a integração da revisão (pedido do usuário)

O pedido: integrar na `sistema-v14` a branch `revisao-v14` pelo guia dela (`INTEGRAR-REVISAO.md`). No conversor de
2077, seguir o Mission Kit (`raw.regras` e `raw.origem` da wiki) e manter os modos dos ciclos 17 e 18. Gerar o catálogo
de novo pelo build, registrar o ciclo da revisão como o próximo (o 31), mesclar o master de novo, rodar G1 a G5 e apagar
o guia.

- **Feito:**
  - **as mesclas:** `e274759`, a `revisao-v14` com o master até o `30692f7`; e `cbb7591`, o master `32f9c7b` (o
    `atualizar-modulo.sh` extrai o CORE de novo quando o extrator muda);
  - **os 8 conflitos, como o guia indica:**
    - o conversor de 2077 segue o Kit e mantém as opções que os modos dos ciclos 17 e 18 leem. Elas vêm das regras da
      wiki quando ela as tem (os dois alvos, os dois canos, as balas por tiro das Smart) e do texto quando não tem (a
      Testera, a Dian). A descrição de cada arma diz que os botões ainda seguem o suplemento de fã;
    - o catálogo e o `gerado.mjs` saíram do build: 704 itens, 168 de 2077, e os compêndios de 2077 com 58, 62 e 48;
    - os documentos foram juntados: o ciclo da revisão virou o 31, e o procedimento da migração foi para o fim, com a
      janela "Personagens da wiki" no passo 5;
  - **o ator ligado também na janela "Personagens da wiki"** (o item 6 do guia): o "Aprovar" confere o ator ligado antes
    de aprovar e, se no mundo só há uma cópia antiga, avisa e não entrega. Antes, os itens seriam criados na cópia, e
    depois a wiki recusaria o "entregue" (409);
  - **o `enderecoPadraoDaWiki` foi para o `config.mjs`:** neste ramo, o `wiki.mjs` importa o `dados.mjs`, que precisa
    do Foundry, e o teste de referência não carregava. O `wiki.mjs` o reexporta;
  - **no cenário:**
    - os passos que instalam e tiram cyberware (o `__tirarCyber` da Atiradora e o Reflex Tuner do Capanga) devolvem a
      Humanidade, porque desinstalar não a devolve mais;
    - o passo "ida e volta" (ciclo 15) devolve a ligação do Solo na wiki ao ator do começo. O "Importar da mesa" liga o
      personagem ao ator novo, que o passo apaga, e a wiki passou a recusar o resto, inclusive o pedido da janela
      (ciclo 16).
- **Achado da integração: a wiki do master mudou duas regras que o sistema segue:**
  - **as armas de 2077 seguem o Mission Kit.** A página diz que o teste Smart, a rajada carregada, o "esfriar" e as
    flechettes deram lugar às regras do Kit. Os dados das armas mudaram: a Yukimura é de qualidade padrão, a Kappa tem
    3d6, a Lexington não tem o autofogo de 7 balas, e as Tech não têm rajada nem flechettes;
  - **as Roles são as 10 do RED.** O Face e o Corpo viraram Rockerboy e Exec, e as especializações de 2077 saíram do
    criador. Ficam, como opcionais, o Investigator do Lawman e o desconto do clã do Nomad.

  O sistema ainda segue as regras antigas nos dois: os modos dos ciclos 17 e 18, mantidos como foi pedido, e os bônus e
  situacionais de Role do ciclo 23. Os testes de referência que conferem o sistema contra a wiki pegaram isso e falham.
  As falhas estão no QUALITY_GATES até o P0 do ROADMAP ("As armas de 2077 pelo Mission Kit" e "As Roles pelo RED").
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros (o lint cobre `migracao/`);
  - G3: 50 de 57. São 4 testes novos da revisão (o Editor de Dor, o endereço padrão, a loja inteira e o Mission Kit), que
    passam. As 7 falhas são as da troca de regra na wiki (QUALITY_GATES);
  - G4: 61 de 67, cerca de 106 s. A parte do cenário que a revisão mexeu, que ainda não tinha rodado, passa: os
    compêndios de 2077 com 58, 62 e 48, a Yukimura com bônus 0 na importação e o passo novo do desinstalar. A janela
    "Personagens da wiki" passa com o ator ligado. As 6 falhas são as da troca de regra (QUALITY_GATES). Na primeira
    rodada, antes de devolver a ligação do Solo, a janela também falhou (60 de 67);
  - G5: 25 dos 28 cenários verdes. O `fluxo` e o `sistema` falham pelas causas conhecidas deste PC (o
    `foundry-2077/.cache` do Foundry 12 e os PDFs), e o `v14` pelas 6 da troca de regra.
- **O guia** (`INTEGRAR-REVISAO.md`) saiu, como ele mesmo pedia.
- **Próximo (P0, desvio de regra):** as armas de 2077 pelo Mission Kit e as Roles pelo RED, com os testes delas.

### Ciclo 33 (2026-10-12): as Roles do RED (o C3, parte 1; sessão KouArt)

O primeiro ciclo do plano de paridade nesta sessão (o C3 do ROADMAP, com o C1 na sessão Junin). É o P0 "As Roles pelo
RED", achado na integração da revisão (ciclo 32): a wiki do master voltou às 10 Roles do RED.

- **Implementado:**
  - **as Roles:** as 10 do criador da wiki (`gerado.mjs`), sem as especializações de 2077, e as que saíram com o Mission
    Kit (Face e Corpo) pelo `roleAliases` da wiki (`ROLES_ANTIGAS`, gerado pelo build);
  - **`regras.acharRole`:** a Role pelo nome, pelo id ou pela antiga (Face é Rockerboy; Corpo, Exec). O
    `dados.roleDaWiki` a usa: a ficha que já tinha "Face" lê o Rockerboy;
  - **os bônus:** fica o Moto do Nomad (o texto do RED na wiki: "soma o Rank a Dirigir, Pilotar e Tech de veículos
    terrestres, aéreos e marítimos"; o item Nomad do CORE). Saem a especialização do Face (o campo
    `system.role.especializacao` e o select da aba Role) e os situacionais de Role de 2077 (o Investigator do Lawman e a
    Interface do Netrunner, `regras.situacionaisDeRole`);
  - **a importação e a migração** gravam a Role do RED: o personagem antigo da wiki, ou a ficha da mesa do Foundry 12 com
    "Face", entra como Rockerboy;
  - **a aba Role:** a habilidade e o resumo da Role do RED, e o Moto, quando é Nomad.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 53 de 57. Os três testes de Role foram reescritos pela regra nova, com a fonte:
    - o bônus de Role: das 10 do RED, só o Moto do Nomad soma, nas seis perícias de veículo;
    - as Roles do RED: as do criador, sem especialização; o `roleAliases` da wiki; a frase da wiki sobre Face e Corpo;
      a busca pelo nome, pelo id e pela antiga;
    - sem situacionais de Role: os textos da wiki sobre os opcionais e a Interface de 2077.

    As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 62 de 67, cerca de 122 s. O que mudou:
    - **a janela de rolagem** do Lawman de teste não tem mais o Investigator (o total marcado vai de 19 a 15, e o rolado
      de 24 a 20);
    - **um passo no lugar do da especialização do Face:**
      - o personagem antigo da wiki com a Role Face entra como Rockerboy pela importação e pela migração, sem o campo da
        especialização;
      - a ficha com "Face" lê o Rockerboy;
      - a aba Role mostra o Impacto Carismático, sem bônus;
      - o Nomad soma o Moto nas seis perícias (Conduzir Veículo Terrestre: REF 6 + 3 + Moto 4 = 13 na ficha);

    As 5 falhas são as das armas de 2077 (QUALITY_GATES). A captura `v14-role-rockerboy.png` foi conferida;
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a Role antiga que não vira a do RED, o Moto para toda Role e o build sem as Roles que saíram;
    - G4: a importação que guarda "Face".
- **Para o C1 (sessão Junin):** não há ator real com a Role Face no Foundry 14. A campanha ainda está no Foundry 12, e a
  importação já grava a do RED. Mesmo assim, se a migração quiser trocar o nome guardado nos mundos de teste, o
  `regras.acharRole` dá a Role certa.
- **Próximo:** o C3, parte 2: as rolagens de Role do RED, pelo item de Role do CORE e pelo texto da wiki (o Impacto
  Carismático, a Credibilidade, o Backup, a pechincha do Fixer); depois, a parte 3, as do Tech e do Medtech.
- **Commit:** `0686760`.

### Ciclo 34 (2026-10-12): as rolagens de Role do RED (o C3, parte 2; sessão KouArt)

As habilidades de Role que rolam, pelo item de Role do CORE (`_createRoleRoll` nas habilidades com `hasRoll`) e pelo
texto da wiki ("As dez Roles do RED", system-catalog.js).

- **Implementado:**
  - **`regras.ROLAGENS_DE_ROLE`:**
    - o Impacto Carismático do Rockerboy: Rank + 1d10, com a DV da wiki no cartão (8 para uma pessoa, 10 para até seis,
      12 para um grupo maior);
    - a Credibilidade da Media: Rank + 1d10 (os rumores);
    - a pechincha do Fixer: COOL + Negociação + Operator + 1d10, teste enfrentado (o "Haggle" do item do CORE);
    - o Backup do Lawman: 1d10 até o Rank (`regras.backup`). O item do CORE não rola o Backup; a wiki diz como;
  - **no ator:** `rolarRole(id)`, como o `_createRoleRoll` do CORE: o Rank, as penalidades de ferimento e os
    situacionais de todas as ações (e os da Negociação, na pechincha), pela janela de rolagem, com o modificador do mestre
    e a Sorte. O `rolarBackup()` rola o d10 e, vindo, o d6 das rodadas, e o cartão diz quem responde (a borda fica
    vermelha quando ninguém vem);
  - **na ficha:** os botões da habilidade na aba Role, com a fórmula. O clique abre a janela, e Ctrl + clique rola direto,
    como nas perícias. O Solo, o Exec e o Nomad não rolam a habilidade de Role. A Interface é o C5; o Tech e o Medtech, a
    parte 3.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 54 de 58. Um teste novo: as quatro rolagens contra o texto da wiki (as fórmulas, a DV do Impacto, a Negociação de
    COOL na pechincha) e o Backup (vem com o d10 até o Rank, o 6 do d6, os dois grupos do Rank 10). As 4 falhas são as das
    armas de 2077 (QUALITY_GATES);
  - G4: 63 de 68, cerca de 107 s. Um passo novo, pela aba Role de um personagem de teste:
    - o Rockerboy rola o Impacto Carismático pela janela: Rank 4 + d10 5 + 2 do mestre = 11, com a DV no cartão;
    - o Fixer pechincha com Ctrl + clique, sem janela: COOL 8 + Negociação 3 + Operator 4 + d10 7 = 22;
    - o Backup do Lawman vem (d10 3 até o Rank 4, e o d6 5: "Chega em 5 rodadas") e, depois, não vem (d10 6);
    - o Solo não tem botão.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o Backup só com o d10 menor que o Rank, e a pechincha com outra perícia;
    - G4: a pechincha sem o Rank de Operator (deu 18), e a rolagem de Role sem a janela.
- **Próximo:** o C3, parte 3: as rolagens do Tech (as quatro Expertises) e do Medtech (a Cirurgia e a Tecnologia Médica,
  pelas especialidades).
- **Commit:** `4628ce1`.

### Ciclo 35 (2026-10-12): as rolagens de Role do Tech e do Medtech (o C3, parte 3; sessão KouArt)

As habilidades do Tech e do Medtech que rolam no item de Role do CORE (`_createRoleRoll`, nas habilidades com `hasRoll`):
as quatro Expertises do Tech (`stat: tech`, `skill: varying`) e o "Surgery Skill" e o "Medical Tech Skill" do Medtech
(`stat: tech`). Os números vêm do texto da wiki ("As dez Roles do RED", system-catalog.js) e do criador
(system-criacao.js: as especialidades e as `derivadas`).

- **Implementado:**
  - **`regras.ROLAGENS_DE_ROLE`:**
    - o Tech: as Especializações de Campo, de Upgrade, de Fabricação e de Invenção, cada uma TECH + uma perícia de TECH a
      escolher + os pontos dela + 1d10 (o "varying" do CORE: as perícias do atributo);
    - o Medtech: a Cirurgia e a Tecnologia Médica, TECH + a perícia + 1d10. A Farmacêutica e os Criossistemas não rolam
      sozinhos, como no item do CORE: somam na Tecnologia Médica;
  - **`regras.periciasDerivadas`:** o nível das perícias que vêm das especialidades, pelas derivadas do criador (o
    `roleAbilityRanks` de criador.js): a Cirurgia, 2 por ponto, até 10; a Tecnologia Médica, Farmacêutica +
    Criossistemas. O build leva as derivadas para o `gerado.mjs`, e o ator calcula as duas na preparação
    (`system.periciasDeRole`);
  - **no ator:** o `rolarRole(id, { pericia })` e o `partesDaRole` somam os pontos da Expertise (com TECH, a perícia
    escolhida e o bônus e os situacionais dela) ou o nível da perícia do Medtech (com TECH). Sem a perícia, ou com uma de
    outro atributo, a Expertise não rola;
  - **na ficha:**
    - o botão da Expertise pergunta antes a perícia de TECH, da mais alta para a mais baixa, com as de família (Tocar
      Instrumento). Fechada a pergunta, não rola. Depois vem a janela de rolagem, como nas outras (Ctrl + clique, direto);
    - o painel de Medicina mostra as perícias que vêm das especialidades, com a conta;
    - a "Surgery Skill" e a "Medical Tech Skill" que vinham prontas da importação da wiki saem das outras habilidades,
      porque a ficha calcula. O valor guardado fica na ficha, sem uso.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 55 de 59. Um teste novo:
    - contra o texto da wiki (o Maker e a Medicine) e o criador (as Expertises com a chave e o nome dele; as derivadas
      iguais às do `gerado.mjs`);
    - as fórmulas, e o `periciasDerivadas`: Cirurgia 2 dá 4, e 6 dá 10; o ponto negativo vale 0; Farmacêutica 1 +
      Criossistemas 2 dá 3.

    O teste das rolagens de Role do ciclo 34 passou a esperar as seis Roles que rolam. As 4 falhas são as das armas de
    2077 (QUALITY_GATES);
  - G4: 64 de 69, cerca de 164 s. Um passo novo, pela aba Role de um personagem de teste:
    - o Tech: fechada a pergunta da perícia (16 opções, da mais alta para a mais baixa, com Tocar Instrumento), não rola;
      com Tecnologia de Armas, a janela rola TECH 7 + Tecnologia de Armas 5 + Campo 3 + d10 6 = 21;
    - o Medtech: a Cirurgia 6 (3 pontos) e a Tecnologia Médica 3 no painel. Com Ctrl + clique, a Cirurgia rola TECH 7 +
      6 + d10 4 = 17, sem usar a "Surgery Skill" 8 guardada, que também não aparece nas outras habilidades;
    - a captura `v14-role-medtech`.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES). Na primeira tentativa, o cenário pulou a parte do Foundry,
    porque havia uma pessoa na mesa do servidor (a licença vale para uma mesa por vez). Rodou de novo com a mesa vazia;
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a Cirurgia sem o máximo 10, e o ponto negativo contando;
    - G4: a Expertise com o Rank no lugar dos pontos dela; a ficha sem perguntar a perícia; a perícia importada de volta
      às outras habilidades; e a Cirurgia pelo valor guardado, não pelas especialidades.
- **O C3 fecha aqui** (ciclos 33 a 35).
- **Próximo:** o C2 (o capanga como tipo de ator), o próximo item livre do plano. O C1 está com a sessão Junin.
- **Commit:** `ce950fc`.

### Ciclo 36 (2026-10-12): o capanga como tipo de ator (o C2, parte 1; sessão KouArt)

O mook do CORE (`modules/actor/cpr-mook.js`, `sheet/cpr-mook-sheet.js`, `datamodels/actor/mook-datamodel.js` e o
`handleMookDraggedItem` de `cpr-actor.js`): o NPC descartável, com a ficha "de relance", o token solto e o item
arrastado que já entra em uso.

- **Implementado:**
  - **o tipo de ator "Capanga"** (`system.json` e `lang/pt-BR.json`), com os dados do personagem (`DadosPersonagem`),
    como no CORE, onde o mook e o character dividem o `CommonSchema`. As regras e o combate são os mesmos;
  - **o token:** o capanga novo nasce com o token solto (`actorLink` falso), o HP na barra e a visão ligada. Um capanga que
    já vem com o token (uma cópia, um compêndio) fica como veio;
  - **a ficha** (`ficha-capanga.mjs`, uma subclasse da ficha do personagem, com as mesmas ações), numa página só:
    - o cabeçalho: o retrato, o nome, o HP, a SP, a iniciativa e a esquiva, e se é a ficha do ator (o modelo dos tokens)
      ou a de um token;
    - o painel geral da ficha do personagem, sem as armas, e a tabela de armas da aba Combate. Os dois viraram blocos
      (`templates/personagem/bloco-geral.hbs` e `bloco-armas.hbs`), que as duas fichas usam;
    - os itens, com o botão de cada tipo (equipar, vestir, instalar, o uso), e as notas;
    - na ficha de um token, o nome é o do token, e mudar o nome muda o do token na cena (o `_changeMookName` do CORE);
  - **arrastar um item** para a ficha (`regras.AO_RECEBER_CAPANGA`): o cyberware é instalado, rolando a perda de
    Humanidade, como o botão Instalar (com Shift, a média). Arma, armadura, roupa, cyberdeck, droga e equipamento entram
    equipados (o "equippable" do CORE). O resto fica como veio;
  - **o Death Save no turno** vale também para o capanga (a configuração "Jogadores e NPCs", a padrão).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 56 de 60. Um teste novo: o tipo e o nome em português, e o que o capanga equipa ou instala (o "equippable" do
    CORE e o cyberware). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 65 de 70, cerca de 106 s. Um passo novo, no fim da parte de combate:
    - o token nasce solto, com o HP na barra; a ficha do ator abre sem abas, com o painel geral (sem as armas), as armas,
      os itens e as notas;
    - seis itens do compêndio arrastados para a ficha, pelo drop:
      - a pistola e a armadura entram equipadas, e o Medscanner, em uso;
      - o Kerenzikov é instalado com a perda rolada (12), e o Grip Foot, com Shift, com a média (3);
      - a Humanidade fica em 35 de 46, e a iniciativa, 8 (REF 6 + Kerenzikov 2);
      - a munição fica como veio;
    - dois capangas na cena:
      - o tiro no primeiro (DV 15 a 10 m, 16 de dano, a SP 11 segura 11) deixa só ele com HP 30 e SP 10;
      - o segundo recarrega e atira (DV 20 a 14 m, 12 de dano) com a pistola e a munição dele (pente 7, munição 2), sem
        mexer nas do outro nem nas do ator;
      - no combate, o Death Save no turno é só do primeiro, que caiu;
      - o nome novo na ficha do segundo vai para o token dele, e só para ele;
    - a captura `v14-capanga`.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a droga que não entra em uso, e o cyberware marcado como instalado sem a perda de Humanidade;
    - G4: o token que nasce ligado; o item arrastado como veio; o Death Save do turno só para o personagem; o Shift que
      não vale; e o painel geral do capanga com as armas.
- **Próximo:** o C2, parte 2: a ficha limitada (quem só tem a permissão Limitada vê a imagem, o nome e as notas, como no
  CORE).
- **Commit:** `461f219`.

### Ciclo 37 (2026-10-12): a ficha limitada do capanga (o C2, parte 2; sessão KouArt)

O `cpr-mook-sheet-limited.hbs` do CORE: o jogador que o mestre deixou só com a permissão Limitada vê o capanga sem ver
os números. No Foundry 14, a permissão mínima para abrir uma ficha é a Limitada (`viewPermission`), e antes ela mostrava
a ficha inteira, sem editar.

- **Implementado:**
  - **na ficha do capanga:** com só a permissão Limitada, a ficha troca as partes por uma (`templates/capanga/limitado.hbs`):
    o retrato, o nome (o do token, na ficha de um token) e as notas, numa janela de 560 px, da altura do que mostra. O
    mestre vê sempre a ficha inteira, e o Observador também, sem editar (o Foundry desliga os campos e os botões);
  - **o CSS** da ficha limitada.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 56 de 60 (as 4 falhas são as das armas de 2077, QUALITY_GATES);
  - G4: 66 de 71, cerca de 108 s. Um passo novo, no navegador do jogador, com dois capangas com uma pistola e notas:
    - com a permissão Limitada: só a imagem, o nome e as notas, nenhum campo, nenhuma arma, 560 px de largura;
    - com a de Observador: a ficha inteira (as notas e a arma), com todos os campos e botões desligados, 980 px;
    - a captura `v14-jogador-capanga-limitada`.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o passo novo, e o arquivo foi restaurado (conferido pelo md5): a ficha limitada
    que nunca aparece; a ficha limitada para todo jogador, até o Observador; e a janela limitada do tamanho da ficha
    inteira.
- **O C2 fecha aqui** (ciclos 36 e 37).
- **Próximo:** o C4 (o Facedown: COOL + Reputação + 1d10, o `CPRFacedownRoll` do CORE), o próximo item livre do plano.
  O C1 está com a sessão Junin.
- **Commit:** `72c9e66`.

### Ciclo 38 (2026-10-13): a migração dos dados entre versões do sistema (o C1; sessão Junin)

O C1 do plano de paridade: o `dataModelVersion` e o MigrationRunner do CORE (`modules/system/migrate`).

- **Feito:** `scripts/migracao.mjs`.
  - **A versão dos dados:** fica na configuração escondida `versaoDosDados` (0, de antes da migração existir). A versão
    do sistema é a do último passo (`VERSAO_DOS_DADOS`, hoje 2).
  - **No `ready`, só o mestre ativo:**
    - com os dados de uma versão anterior, confere os itens e os atores do mundo (com os itens deles), os tokens não
      ligados e os compêndios do mundo (Actor e Item);
    - se algum passo muda alguma coisa, pergunta: o que muda em cada grupo, os passos e o aviso do backup (Manage
      Backups, na tela de configuração do Foundry). "Depois" deixa os dados como estão;
    - se nada muda (o mundo novo), grava a versão sem perguntar;
    - com os dados de uma versão mais nova, só avisa.
  - **Como grava:**
    - de cada documento, sai o plano: os dados de antes (`toObject`) contra os de depois dos passos, com o que muda nos
      campos e, nas coleções embutidas (itens e efeitos), o que sai, o que entra e o que muda;
    - o campo que some vai como o `_del` do Foundry 14 (o `-=` saiu);
    - a ordem é a do CORE: itens do mundo, atores do mundo, os tokens não ligados e os compêndios. O plano de cada
      documento sai de novo na hora de gravar, porque o token mostra o ator do mundo, que já pode ter mudado;
    - o token que não guarda nada próprio (o delta vazio) é o ator do mundo e fica de fora;
    - o compêndio trancado abre só durante a migração;
    - os compêndios do sistema saem do build já no formato novo, e os dos módulos ficam como estão, como no CORE.
  - **No fim:** grava a versão, avisa quantos documentos mudaram e deixa no chat, só para os mestres, os passos e o que
    mudou (`flags.cpr-fieldbook.migracao`). Se um documento falha, para, avisa e não grava a versão: os passos só mexem
    no formato antigo, então rodam de novo sem estragar nada.
  - **Os dois primeiros passos:**
    1. o TeleOptics do RED sem o +1 de sempre do CORE no tiro mirado e no tiro único, que o catálogo trouxe até o
       ciclo 26 (vale a regra da wiki, pela distância). Só sai o efeito igual ao do CORE; o que o mestre mudou fica;
    2. o tipo do cyberware que a ficha do item trocava por Fashionware até o ciclo 7 volta ao do catálogo (Cyberolho,
       Cyberaudio, Interno e Externo, os quatro que a ficha não conhecia). O borgware e o Fashionware de verdade ficam.
  - **Passo novo e `migrateData`:** o começo do arquivo explica. Renomear ou mudar o formato de um campo do modelo vai
    no `migrateData` do modelo, que converte na leitura; os passos daqui são para o que precisa do catálogo, dos efeitos
    ou de outro documento. A Role antiga (Face, Corpo) não precisa de passo: o C3 já a lê como a do RED
    (`regras.acharRole`).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 61 de 65. São 5 testes novos em `tests/sistema/migracao.test.mjs`: os passos em ordem, cada um dos dois com os
    dados de antes e de depois, o ator com os itens e a segunda vez sem mudança, e o plano (os campos, a lista, o
    apagar e as coleções). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 67 de 72, cerca de 126 s, com os ciclos 33 a 37 da outra sessão já mesclados. O passo novo da migração passa.
    É o mundo novo sem pergunta, mais um mundo da versão 0 com o TeleOptics antigo
    num ator, num token não ligado e num compêndio trancado e um Cyberaudio que virou Fashionware. Ele confere a
    pergunta, o "Depois", o "Migrar agora", o compêndio trancado de novo, o registro no chat, a segunda vez sem
    pergunta e o aviso da versão mais nova. As 5 falhas são as conhecidas das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e o arquivo foi restaurado:
    - G3 (8): o passo 1 sem efeito e tirando qualquer efeito, o passo 2 sem efeito e trocando todo Fashionware, o
      `migrarDados` mudando a entrada, a diferença sem o apagar, os itens do ator sem os passos e o item novo sem `_id`
      fora do plano;
    - G4 (juntas, cada uma visível no estado do passo): os tokens fora da migração (o token ficou com o efeito), o
      compêndio sem trancar de novo e o mundo novo sem gravar a versão.
- **Achados do cenário** (no QUALITY_GATES):
  - sem cena ativa, o Foundry 14 liga a primeira cena criada, e o canvas desenhando o token quebra o core;
  - o token de personagem sai sempre ligado (`AtorCPR._preCreate`): o não ligado se pede no `getTokenDocument`.
- **Próximo:** o próximo item livre do plano (o C4 ou outro que a outra sessão não tenha pegado).

### Ciclo 39 (2026-10-13): o Facedown (o C4; sessão KouArt)

O `CPRFacedownRoll` do CORE (`_createFacedownRoll` em `cpr-actor.js`) e a wiki ("Reputação e facedown" e o cartão rápido
do Facedown, em system-rules.js; RED p. 194).

- **Implementado:**
  - **`regras.FACEDOWN`:** a fórmula (COOL + Reputação + 1d10) e o que a wiki diz do resultado, para o cartão: no empate,
    nada acontece; quem perde recua ou fica com −2 nas ações contra o outro até derrotá-lo uma vez;
  - **no ator:** `partesDoFacedown` e `rolarFacedown`, pela janela de rolagem, como os outros testes: o COOL, a Reputação,
    as penalidades de todas as ações (o ferimento e as lesões) e os situacionais delas. A Reputação de covarde conta
    negativa: a da ficha pode ser negativa;
  - **nas fichas:** o personagem rola pela linha "Facedown" da aba Combate (com a conta sem o dado), e o capanga pelo
    botão do cabeçalho, ao lado da Reputação, que ali se edita. O clique abre a janela, e Ctrl + clique rola direto.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 62 de 66, já com os 5 testes da migração (o ciclo 38). Um teste novo: a fórmula e o resultado contra o texto da
    wiki, e a penalidade de gravemente ferido e a da Concussão, que a wiki dá igualmente em "todas as ações". As 4 falhas
    são as das armas de 2077 (QUALITY_GATES);
  - G4: 68 de 73, cerca de 108 s, já com o passo da migração (o ciclo 38). Um passo novo:
    - o personagem (COOL 7, Reputação 3): a linha da aba Combate mostra 10 + 1d10; pela janela, com +2 do mestre, 18, e o
      cartão traz a regra do empate;
    - gravemente ferido, a linha cai para 8 + 1d10, e Ctrl + clique rola sem a janela: 7 + 3 − 2 + 5 = 13;
    - o capanga (COOL 6): a Reputação de covarde (−2) pelo cabeçalho; o botão mostra 4 e rola 6 − 2 + 4 = 8.

    O passo do capanga (ciclo 36) passou a esperar os dois indicadores novos do cabeçalho (a Reputação e o Facedown): na
    primeira rodada, ele acusou a mudança. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações** (antes de integrar o ciclo 38, com o mesmo código do Facedown): cada uma destas derrubou o teste dela, e
    os arquivos foram restaurados (conferido pelo md5):
    - G3: a fórmula sem a Reputação;
    - G4: o Facedown sem a Reputação; sem o ferimento (como o CORE); o clique sem a janela; e o capanga sem o botão.
- **O C4 fecha aqui.** Com ele, a fase 1 do plano fica pronta (o C1 fechou no ciclo 38, da sessão Junin, publicado antes;
  por isso o Facedown é o ciclo 39).
- **Próximo:** o C5 (a Interface do Netrunner: as 9 habilidades, as Ações de NET pelo Rank e a iniciativa na NET), o
  primeiro item da fase 2.
- **Commit:** `117c456`.

### Ciclo 40 (2026-10-13): a Interface do Netrunner (o C5; sessão KouArt)

O `CPRInterfaceRoll` do CORE (`_createInterfaceRoll` em `cpr-cyberdeck.js`, `CPR.interfaceAbilities`, o painel
`cpr-netActions.hbs`) e a página de Netrunning da wiki (system-rules.js: "Ações por turno", "Habilidades de Interface",
"Combate na NET" e "Black ICE"; RED p. 197–207).

- **Implementado:**
  - **`regras.HABILIDADES_DE_INTERFACE`:** as 9 habilidades do CORE, com o custo da tabela da wiki e o que cada uma faz,
    e as outras duas rolagens de Interface do CORE: a Defesa (contra o ATK do Black ICE ou do programa) e a Velocidade
    (contra o SPD do Black ICE à espreita; quem vence age primeiro);
  - **`regras.acoesDeNet`:** as Ações NET por turno pelo Rank de Interface, pela tabela da wiki (2, 3, 4 e 5);
  - **nos dados:** o Rank de Interface é o do Netrunner (só ele tem), com as Ações NET; os bônus de Interface
    (`system.bonus.interface`); e o programa ativo (rezzado, o `isRezzed` do CORE): os efeitos dele só valem ativo e
    instalado num deck;
  - **o build:** os boosters do CORE (Eraser no Cloak, See Ya no Pathfinder, Speedy Gonzalvez na Velocidade, Worm no
    Backdoor) entram com o efeito de +2, que antes ficava de fora. Só esses 4 itens do catálogo mudaram;
  - **no ator:** `partesDaInterface` e `rolarInterface`, pela janela de rolagem: o Rank de Interface, o bônus dos
    programas ativos naquela habilidade, as penalidades de todas as ações e os situacionais; e `rolarDanoDoZap` (1d6);
  - **na ficha (aba NET):** pelo cyberdeck equipado, como o CORE, as 11 rolagens com o valor sem o dado, o custo e o que
    faz, o dano do Zap e as Ações NET no título. Sem deck equipado, o aviso; sem Interface, "só o Netrunner". Na lista
    de programas, o botão Ativo dos que estão num deck;
  - **a migração (o passo 3):** o booster que veio do catálogo antes do efeito ganha o +2 na habilidade dele. O passo só
    mexe em quem não tem o efeito, e o efeito vem do catálogo.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 64 de 68. Dois testes novos:
    - a Interface contra a wiki e o CORE: as 9 habilidades na ordem do CORE, com o custo da tabela da wiki; a Defesa e
      a Velocidade; a fórmula e o teste contra o Black ICE; as Ações NET pela tabela; e os 4 boosters do catálogo com o +2
      na habilidade deles ("while Rezzed", no texto do CORE);
    - o passo 3 da migração: os 4 boosters sem o efeito ganham o dele; o que já tem, o Sword e o booster sem catálogo
      ficam; o efeito novo entra no plano como criado.

    As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 69 de 74, cerca de 106 s. Um passo novo, na aba NET de um Netrunner Rank 4 com um cyberdeck e dois boosters:
    - com o deck só carregando, o aviso e nenhuma rolagem; equipado, as 11 rolagens e "3 Ações NET por turno";
    - o Cloak pela janela (4 + 6 + 2 do mestre = 12), com o custo e o que faz no cartão;
    - o Eraser ativo: o Cloak sobe para 6 (o Pathfinder não), e Ctrl + clique rola 4 + 2 + 5 = 11;
    - o dano do Zap (1d6);
    - a Velocidade com o Speedy Gonzalvez ativo, gravemente ferido: 4 + 2 − 2 + 3 = 7;
    - o Eraser fora do deck não soma, mesmo ativo, e perde o botão;
    - um Solo com um deck equipado não tem Interface nem Ações NET;
    - a captura `v14-ficha-net-interface`.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: as Ações NET com a faixa errada; o custo do Slide sem o "1×/turno"; o passo 3 dando um segundo efeito a quem
      já tem;
    - G4: o efeito do programa sempre valendo; a Interface sem o deck equipado; sem a penalidade de ferimento; todo
      mundo com Interface; e a rolagem sem o bônus dos programas.
- **O C5 fecha aqui.**
- **Próximo:** o C6 (os programas no combate da NET: a REZ atual, o ataque de programa contra programa, Black ICE ou
  netrunner, com o dano no REZ ou no cérebro).
- **Commit:** `ad0708a`.

### Ciclo 41 (2026-10-13): os programas no combate da NET (o C6, parte 1; sessão KouArt)

O `_createCyberdeckRoll` do CORE (o ATK e o dano do programa), o `reduceRezProgram` e o `resetRezProgram` (a REZ),
e a wiki ("Como ler os cartões", "Programas: ataque" e a tabela dos programas em system-net.js e system-rules.js;
"Combate na NET"; RED p. 201–204).

- **Implementado:**
  - **`regras.DANO_DE_PROGRAMA`:** o anti-programa só afeta programas (o dano padrão em programa, o outro em Black ICE)
    e o anti-pessoal só netrunners (no cérebro), como a wiki; `programaDeAtaque`, `formulaDeDano` (o "0" não rola: o
    efeito do programa é outro, como o do DeckKRASH) e `rezAtual`;
  - **nos dados:** a REZ perdida do programa (`rezPerdida`): a atual é a do catálogo menos a perdida;
  - **no item:** `perderRez` (em 0, o programa desativa, como a wiki), `restaurarRez` e `rolarDanoDePrograma`: a fórmula
    contra o alvo, sem crítico (na NET não há, como no CORE), com o cartão de dano e uma flag (`danoDePrograma`) para a
    parte 2 aplicar;
  - **no ator:** `rolarAtaqueDePrograma` (Interface + ATK + 1d10, com as penalidades e os situacionais de todas as
    ações, pela janela de rolagem). Só os programas de ataque, num deck, de quem tem Interface;
  - **na ficha (aba NET):** o programa de ataque tem o ataque (com o total sem o dado) e os danos que valem; o que tem
    REZ (boosters e defensores) mostra a REZ atual, com −1 e ↺, e o Ativo. O de ataque não tem o Ativo: desativa sozinho
    depois de usado.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 65 de 69. Um teste novo: o texto da wiki (o ATK, a REZ em 0, quem cada classe afeta, o programa de ataque que
    desativa sozinho, a fórmula do combate na NET), o dano do catálogo igual ao da tabela da wiki (o Banhammer, o Sword,
    o Hellbolt e o Vrizzbolt), o "0" que não rola e a REZ atual. As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 70 de 75, cerca de 108 s. Um passo novo, na aba NET de um Netrunner Rank 4 com Sword, Hellbolt, Armor e
    DeckKRASH num deck equipado:
    - os botões de cada um: o Sword com ATK +5 e o dano em programa e em Black ICE; o Hellbolt com ATK +6 e o dano no
      cérebro; o DeckKRASH só com o ataque; o Armor com a REZ 7/7, o −1, o ↺ e o Ativo;
    - o ataque do Sword pela janela (4 + 1 + 7 = 12) e o dano em Black ICE (3d6 com dois 6 = 14, sem crítico);
    - o ataque do Hellbolt com Ctrl + clique (9) e o dano no cérebro (7);
    - o Armor ativo perde 1 de REZ (6/7), volta (7/7) e, perdendo tudo, fica em 0/7 e desativa;
    - a captura `v14-ficha-net-programas`.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a REZ perdida negativa aumentando a REZ; o "0" rolando como dano;
    - G4: o programa em 0 de REZ continuando ativo; o ataque sem o ATK do programa; o dano com crítico; e o programa de
      ataque com o Ativo.
- **Próximo:** o C6, parte 2: aplicar o dano da NET (no cérebro do netrunner, ignorando a armadura, e no REZ de um
  programa do alvo).
- **Commit:** `84219ce`.

### Ciclo 42 (2026-10-13): o dano da NET aplicado pelo mestre (o C6, parte 2; sessão KouArt)

O "apply damage" do CORE (`cpr-chat.js`, com o dano "brain" de `_applyDamage` em `cpr-actor.js`) e a wiki ("Combate na
NET", a tabela dos programas com os defensores e a do Zap; RED p. 201–204).

- **Implementado:**
  - **`regras.danoNoCerebro`:** o dano no cérebro vai direto no HP, sem a armadura e sem crítico; o Shield ativo anula o
    primeiro dano de programa que não é Black ICE (o Zap não é programa) e se desativa; o Armor ativo reduz 4 todo dano
    cerebral (`REDUCAO_DO_ARMOR`). `ONDE_O_DANO_ENTRA`: o anti-pessoal no cérebro, o anti-programa num programa, o Zap
    nos dois;
  - **no ator:** `programaAtivo` (o defensor ativo num deck, pelo id do catálogo ou pelo nome) e `receberDanoNoCerebro`;
  - **o cartão do dano** (o do programa e, agora, o do Zap) tem os botões do mestre (`net.mjs`, `aplicarDanoDeNet`): nos
    alvos marcados (T), no cérebro ou num programa ativo com REZ (escolhido na janela, se houver mais de um; sem nenhum,
    o cartão diz que o anti-programa caça o netrunner, e o mestre decide). O resultado vai num cartão;
  - o Zap passou do `roll.toMessage` ao cartão de dano do sistema, com os botões.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 66 de 70. Um teste novo: o texto da wiki (o Armor, o Shield, o Zap), o dano no cérebro (sem defensor, com o
    Armor, com o Shield, o Shield que não se gasta sem dano) e onde cada dano entra. As 4 falhas são as das armas de
    2077 (QUALITY_GATES);
  - G4: 71 de 76, cerca de 109 s. Um passo novo, com dois Netrunners (o alvo com um token marcado, HP 40, com o Armor e
    o Shield):
    - o Hellbolt no cérebro: 40 → 33; com o Armor ativo, 7 − 4 = 3 (33 → 30); com o Shield ativo, nada, e o Shield se
      desativa;
    - o Sword num programa: o Armor, o único ativo com REZ, perde 6 (7 → 1) e, de novo, vai a 0 e desativa;
    - o Zap no cérebro, com o Shield ativo: o Shield não para o Zap (30 → 25);
    - o passo da Interface (ciclo 40) passou a esperar o Zap no cartão de dano, com os botões.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o Armor reduzindo 2; o Shield se gastando sem dano;
    - G4: o Shield parando o Zap; o Shield sem se desativar; o dano num programa valendo também para os inativos; e o
      cartão do Zap sem os botões.
- **O C6 fecha aqui** (ciclos 40 a 42).
- **Próximo:** o C7 (o Black ICE e o demônio como atores: as fichas, o dano na REZ, o token que o programa rezza e a
  iniciativa pela SPD), com o dano em Black ICE.
- **Commit:** `3a96d50`.

### Ciclo 43 (2026-10-13): o Black ICE e o demônio como atores (o C7, parte 1; sessão KouArt)

O blackIce e o demon do CORE (`cpr-black-ice.js`, `cpr-demon.js`, as fichas deles e o `CPRCombat`) e a wiki ("Black
ICE", "Como ler os cartões" e "Demônios", com as tabelas; RED p. 204–212).

- **Implementado:**
  - **os tipos de ator `blackice` e `demonio`** (`DadosBlackIce`: o modelo, a classe, PER, SPD, ATK, DEF, a REZ, o
    efeito, o dano e o custo; `DadosDemonio`: o modelo, a REZ, a Interface, as Ações NET e o Valor de combate), sem
    atributos, HP nem Sorte. O token nasce solto, com a REZ na barra;
  - **as fichas** (`ficha-net.mjs`, no visual da ficha do personagem): os números rolam o número + 1d10
    (`AtorCPR.rolarDaNet`, `regras.NUMEROS_DA_NET`, com o que cada um enfrenta no cartão), pela janela do modificador do
    mestre (a do CORE para eles não tem a Sorte) ou com Ctrl + clique. Na ficha de um token, o nome vai para o token;
  - **o modelo da wiki:** o build lê as tabelas de Black ICE e de demônios das regras da wiki (`gerado.BLACK_ICE` e
    `DEMONIOS`, com o dano do efeito), e a lista da ficha preenche o nome e os números (`regras.fichaDoModelo`);
  - **a iniciativa** (`iniciativa.mjs`, `regras.iniciativaNoTopo`): o Black ICE e o demônio não rolam; ficam com 1 a mais
    que a maior dos outros (30, sem ninguém). No "rolar todos", rolam depois dos outros, um de cada vez;
  - **a arma não atinge os atores da NET** (`combate.atacar`): com só eles marcados, avisa e não rola nem gasta bala;
  - a Sorte preparada de quem não tem Sorte é 0 (o `testar` do Black ICE e do demônio);
  - o README tirou a Interface da lista do que falta (veio no ciclo 40) e o "as regras da NET ainda não estão aqui" do
    inventário.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 67 de 71. Um teste novo: as tabelas da wiki no gerado (as 12 linhas de Black ICE e as 3 de demônios, voltando
    iguais ao texto da wiki; o dano do efeito), a ficha pelo modelo, os números que rolam e a iniciativa no topo da fila.
    O teste do capanga passou a esperar os quatro tipos de ator do manifesto (com os nomes em português). As 4 falhas
    são as das armas de 2077 (QUALITY_GATES);
  - G4: 73 de 78, cerca de 113 s. Dois passos novos:
    - o Black ICE novo (o token solto, a REZ na barra, a REZ 10 e o custo 100 do CORE); o Hellhound pelo modelo da wiki
      (6/6/6/2, REZ 20, o efeito, o dano 2d6 e o custo 500); a SPD pela janela (6 + 7 + 1 do mestre = 14) e o ATK com
      Ctrl + clique (6 + 4 = 10); na ficha do token, a REZ (12) e o nome mudam só no token; o Efreet pelo modelo
      (REZ 25, Interface 4, 3 Ações NET, Valor de combate 14) e a Interface com Ctrl + clique (4 + 5 = 9);
    - a iniciativa: no "rolar todos" do começo da luta, o netrunner 13 (REF 6 + 7), o ICE 14 e o demônio 15 (a fila: o
      demônio, o ICE e o netrunner); sozinho noutro combate, 30; a pistola com só o Black ICE marcado avisa e não rola.
      Numa rodada, a fila saiu na ordem antiga logo depois de um `resetAll` do teste, com as iniciativas certas (ver o
      QUALITY_GATES); o passo passou a usar um combate para cada caso.

    As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o topo da fila sem o +1; o modelo com a REZ vazia;
    - G4: o token com o HP na barra; o "rolar todos" sem deixar o ICE e o demônio para depois; o modelo que não preenche a
      ficha; a arma com só o Black ICE marcado seguindo; e a Sorte do Black ICE (que não tem).
- **Próximo:** o C7, parte 2: o dano do Black ICE no netrunner (no cérebro, sem o Shield, ou num programa; o
  anti-programa que destrói o programa, só avisando o mestre) e o dos programas e do Zap na REZ do Black ICE e do
  demônio.
- **Commit:** `6903c7d`.

### Ciclo 44 (2026-10-13): o dano do Black ICE e na REZ dele (o C7, parte 2; sessão KouArt)

O "apply damage" do CORE (`cpr-chat.js`, que aceita o Black ICE e o demônio) e o `_applyDamage` deles (a REZ), o NET
Architect da mesa (o Zap "vale contra qualquer inimigo", o dano "em Black ICE" no demônio, o Zap do demônio no cérebro) e
a wiki ("Black ICE", "Como ler os cartões", os programas e os defensores; RED p. 202–212).

- **Implementado:**
  - **o dano do Black ICE** (`AtorCPR.rolarDanoDoIce`, o botão "Rolar o dano" da ficha): o do efeito da tabela da wiki,
    sem crítico, com os botões do mestre pela classe (`regras.ONDE_O_DANO_ENTRA.blackIce`): o anti-pessoal no cérebro
    dos alvos (o Shield não para Black ICE; o Armor reduz 4), o anti-programa num programa ativo deles. O programa que o
    anti-programa desativa é destruído: o cartão avisa, e o mestre apaga (o sistema não apaga nada). Um dano que não é
    rolagem (o campo é livre) avisa e não rola;
  - **o dano na REZ** (`AtorCPR.receberDanoNaRez`, `regras.rezDepoisDoDano`): o dano "em Black ICE" dos programas
    anti-programa (o Sword, o Banhammer) e o Zap do netrunner têm o botão da REZ do Black ICE ou do demônio marcado. A
    REZ vai até 0, e em 0 o cartão diz que ele foi desativado; o token solto perde a dele, e o ator fica como estava;
  - **o Zap do demônio** (o botão da ficha): 1d6 no intruso, no cérebro ou num programa (sem o botão da REZ).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 68 de 72. Um teste novo: o texto da wiki (o anti-programa que caça o netrunner, o Dragon que destrói, o Sword em
    Black ICE, o Shield "não Black ICE", o Zap, o demônio que só usa Zap e Control), onde cada dano entra e a REZ que não
    passa de 0. O teste do dano da NET (ciclo 42) passou a esperar o mapa novo de onde o dano entra. As 4 falhas são as
    das armas de 2077 (QUALITY_GATES);
  - G4: 74 de 79, cerca de 117 s. Um passo novo, com dois Netrunners (o defensor com o Armor e o Shield ativos), o
    Hellhound, o Killer e o Imp (o Hellhound e o Imp com o token na cena):
    - o Hellhound pelo botão da ficha (2d6 = 7) no cérebro: o Shield ativo não para Black ICE, e o Armor reduz 4
      (40 → 37);
    - o Killer (4d6 = 7) num programa: o Armor vai a 0 e desativa, e o cartão diz que o anti-programa o destrói; o
      programa continua na ficha;
    - o Sword em Black ICE (3d6 = 6) na REZ do Hellhound da cena (20 → 14; o ator fica com 20);
    - o Zap do netrunner (5) na REZ do Imp da cena (15 → 10), com os três botões;
    - o Zap do Imp (3), só com os dois botões, no cérebro (37 → 34);
    - os passos da Interface (ciclo 40) e do dano da NET (ciclo 42) passaram a esperar o Zap com os três botões.

    A primeira rodada contou os botões duas vezes (o passo novo procurava no documento inteiro, e a mensagem aparece no
    chat e na notificação: a lição do ciclo 42 no QUALITY_GATES); o passo passou a procurar dentro de uma mensagem. As 5
    falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a REZ passando de 0 para baixo; o Zap sem a REZ;
    - G4: o Shield parando o Black ICE; o anti-programa sem o aviso de que destrói; o dano na REZ que não muda a REZ; o
      Zap do demônio com os três botões; o cartão do Black ICE sem os botões; e o dano na REZ procurando os alvos com HP.
- **Próximo:** o C7, parte 3: o programa de Black ICE do netrunner, que rezza um token ao ser ativado (o CORE 0.92.4 e a
  loja da wiki não trazem nenhum: os 12 da tabela da wiki entrariam no compêndio de Netrunning; ver as dúvidas).
- **Commit:** `5c12cd3`.

### Ciclo 45 (2026-10-13): os programas de Black ICE do netrunner (o C7, parte 3a; sessão KouArt)

O programa da classe `blackice` do CORE (`program-datamodel.js`: o `blackIceType`, PER, SPD, ATK, DEF e a REZ) e a wiki
("Black ICE": a tabela e "Black ICE próprio ocupa 2 slots no deck"; RED p. 204–207).

- **Implementado:**
  - **o programa de Black ICE:** a classe `blackice` ("Black ICE") e, no `DadosPrograma`, o tipo (`tipoDeIce`: anti-pessoal,
    anti-programa ou outro), PER e SPD. O ATK, a DEF, a REZ, o dano e os slots são os de todo programa;
  - **os 12 da tabela da wiki** no catálogo (`black-ice:hellhound`...; o build, `programaDeBlackIce`) e no compêndio de
    Netrunning (que passou a aceitar mais de um prefixo do catálogo): 2 slots, o efeito na descrição, o dano do efeito, o
    custo e o ícone `ice-aura`. Os 704 itens que já estavam no catálogo não mudaram (conferido item a item);
  - **a ficha do item** mostra o tipo de Black ICE, PER e SPD (só na classe Black ICE); **a aba NET** mostra o tipo e os
    números na lista de programas, com a REZ e o botão Ativo;
  - a dica da aba NET deixou de dizer que o dano da NET e o Black ICE não estão no sistema (vieram nos ciclos 42 a 44);
  - **correção nos testes:** a falha que vinha e voltava no passo da iniciativa (ciclo 43) não era o `resetAll`: a
    lista que o `createEmbeddedDocuments` devolve nem sempre vem na ordem pedida, e o passo pegava os tokens e os
    combatentes pela posição (o ICE e o demônio trocavam de lugar). Numa das mutações deste ciclo, o passo do dano do
    Black ICE (ciclo 44) marcou o Imp no lugar do Hellhound pelo mesmo motivo. Os dois passos passaram a criar um por vez,
    e a lição do QUALITY_GATES foi corrigida.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 69 de 73. Um teste novo: os 12 programas do catálogo contra a tabela da wiki (na ordem dela: o tipo, os números,
    o dano, o custo, 2 slots, a descrição) e fora da loja da wiki. As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 75 de 80 (nas duas rodadas do fim), cerca de 118 s. Um passo novo: o Hellhound do compêndio de Netrunning instalado num deck com o
    Sword (3 de 7 slots); a aba NET mostra "Black ICE · Anti-pessoal · PER 6 · SPD 6 · ATK 6 · DEF 2", a REZ 20/20 e o botão
    Ativo; a ficha do item tem o tipo, PER e SPD, e a do Sword não. O passo dos compêndios passou a esperar 30 itens no de
    Netrunning (eram 18). As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o Hellhound do catálogo com 1 slot; a classe Black ICE sem rótulo;
    - G4: o compêndio de Netrunning sem os Black ICE; a aba NET mostrando o Black ICE como os outros programas; a ficha
      do item sem o tipo, PER e SPD; e o programa sem o campo PER.

    Na mutação da ficha do item, o passo do dano do Black ICE também caiu: foi a ordem dos tokens (acima), corrigida
    depois; as duas rodadas do G4 do fim do ciclo passaram nele.
- **Próximo:** o C7, parte 3b: ativar o programa de Black ICE num deck rezza o token dele ao lado do netrunner (e
  desativar tira), com a REZ do token voltando para o programa, como o CORE.
- **Commit:** `35130b3`.

### Ciclo 46 (2026-10-13): o Black ICE rezzado na cena (o C7, parte 3b; sessão KouArt)

O `_rezBlackIceToken` e o `_derezBlackIceToken` do cyberdeck do CORE (`cpr-cyberdeck.js`) e o `SyncBlackIceWithProgram`
(`sync-black-ice-with-program.js`).

- **Implementado** (`ice-rezzado.mjs`, no mestre ativo):
  - **ativar um programa de Black ICE num deck** põe o token dele ao lado do token do netrunner (na cena vista, ou na
    ativa), solto, com o nome, os números, o dano e a REZ do programa. O ator é o Black ICE do mundo com o nome do
    programa ou, sem ele, um novo na pasta "Black ICE rezzado". O programa guarda qual é o token;
  - **desativar, tirar do deck ou apagar o programa** (ou o netrunner) tira o token;
  - **a REZ que o token perde volta para o programa** (a REZ perdida); em 0, o programa desativa, e o token sai;
  - **quem faz é o mestre ativo:** no Foundry 14, o jogador não cria tokens (a permissão TOKEN_CREATE é de assistente para
    cima), e o `updateItem` do programa que o jogador ativa chega no cliente do mestre. Sem o token do netrunner na
    cena, o mestre recebe o aviso, e o programa fica ativo sem o token. As mudanças de um mesmo programa entram uma de
    cada vez;
  - na aba NET, a dica do botão Ativo do Black ICE diz o que acontece.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 69 de 73, sem teste novo (o ciclo é todo no Foundry). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 76 de 81, cerca de 119 s. Um passo novo, com o Hellhound do compêndio num deck:
    - ativado, o token entra a um quadrado do netrunner: solto, 6/6/6/2, REZ 20/20, o dano 2d6, a barra da REZ, e o ator
      na pasta "Black ICE rezzado";
    - 6 de dano na REZ do token deixam o programa com 14;
    - desativar tira o token e a marca;
    - de novo ativo, o token entra com 14; 20 de dano zeram a REZ: o programa desativa e o token sai;
    - no navegador do jogador (sem a permissão de criar tokens), ele ativa o Hellhound do netrunner dele, e o mestre põe
      o token.

    A primeira rodada caiu na limpeza do passo: o teste apagava o token do Black ICE que o mestre já tirava ao apagar o
    netrunner ("Token … does not exist"); a limpeza passou a tirar os tokens antes dos atores (QUALITY_GATES). Os avisos
    do passo "nenhum aviso" foram conferidos: só os dois da Lexington, os conhecidos. As 5 falhas são as das armas de 2077
    (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5): os ganchos
    não registrados; desativar sem tirar o token; a REZ do token sem voltar para o programa; só o cliente de quem mudou
    o programa agindo (o jogador ativa e ninguém põe o token); o token em cima do netrunner; e o token com os números do
    ator, e não os do programa.
- **O C7 fecha aqui** (ciclos 43 a 46).
- **Próximo:** o C8 (as arquiteturas e o NET Architect dentro do sistema), o próximo item aberto do plano.
- **Commit:** `33e05aa`.

### Ciclo 47 (2026-10-13): a arquitetura da NET como item (o C8, parte 1; sessão KouArt)

O `netarch` do CORE (`netarch-datamodel.js`, a ficha em `cpr-item-sheet.js`) e o NET Architect da mesa
(`arquitetura.mjs`: os nós, os pais, o Pathfinder; os demônios e os netrunners inimigos nos andares). O C8 é grande: vai
em partes (o ROADMAP lista).

- **Implementado:**
  - **o tipo de item `arquitetura`** (`DadosArquitetura`): uma linha por conteúdo, no andar (1 a 18) e no ramo (A a H);
    o tipo (senha, arquivo, nó de controle, Black ICE, demônio, netrunner inimigo, andar vazio); o DV da senha, do
    arquivo e do nó; o Black ICE e o demônio pelo modelo da wiki (`gerado.BLACK_ICE` e `DEMONIOS`); o netrunner
    inimigo pela ficha (o uuid); o nome e o que tem lá. O DV da arquitetura é o maior dos andares, ou o do item;
  - **a lógica do mapa** (`arquitetura.mjs`, sem Foundry): os nós (`lerArquitetura`), o pai de cada um (o andar de cima no
    mesmo ramo; senão, o do ramo à esquerda mais próximo; senão, o mais fundo acima, de preferência no mesmo ramo), os
    vizinhos, os fundos e o Pathfinder (revela até um DV maior que o resultado), como o NET Architect;
  - **a ficha** (`ficha-arquitetura.mjs`): a tabela dos andares (o andar novo, a linha tirada; o DV, a lista de Black ICE,
    de demônios ou de netrunners conforme o tipo) e o mapa, com o ponto de acesso no topo e, no nó de um ramo novo, de
    onde ele sai.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 70 de 74. Um teste novo (portado do cenário do NET Architect): a clínica de ripperdoc (os pais, os filhos, os
    fundos, os vizinhos, o DV 10), o ramo com buraco (o 4B sai do 3A, e não do 2B), o DV do item, o armazém da TLB (dois
    Black ICE num andar), o Pathfinder (com 3, 9 e 20, e do 3B), as linhas que não valem e a linha nova; e a tabela de
    dificuldades da wiki (o DV 6 da básica). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 77 de 82, cerca de 120 s. Um passo novo: a clínica de ripperdoc como item; a ficha (900 px) com as 8 linhas e o
    mapa ("3B de 2A"); "+ Andar" põe o 6A, uma senha DV 6; a linha que vira Black ICE perde o DV e ganha a lista (o
    Hellhound no mapa); tirar o Wisp do 2A faz o 3A e o 3B saírem do 1A. Os avisos do passo "nenhum aviso" foram
    conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações** (os arquivos foram restaurados, conferido pelo md5):
    - derrubaram o teste delas: no G3, sem a regra do ramo à esquerda, o Pathfinder passando pelos DVs maiores e o DV
      da arquitetura pelo menor; no G4, "+ Andar" sem a conta do andar seguinte e o mapa sem dizer de onde sai o nó do
      ramo novo;
    - uma passou: a ficha sem a conversão dos andares do formulário (do objeto { 0: …, 1: … } para a lista). O ArrayField
      do Foundry 14 já converte (`_cast`), então a conversão era código a mais e saiu; o G4 passou de novo sem ela.
- **Próximo:** o C8, parte 2: o compêndio das arquiteturas (as 4 da campanha, do documento da wiki, como o build do
  cpr-2077 faz, e os 3 exemplos do NET Architect) e a geração pelas tabelas do CORE.
- **Commit:** `e683cdd`.

### Ciclo 48 (2026-10-13): o compêndio "Arquiteturas da NET" (o C8, parte 2; sessão KouArt)

O build das arquiteturas da campanha do cpr-2077 (`foundry-2077/build/arquiteturas.mjs`, que lê
`documentos/morana/arquiteturas-da-campanha.md`) e o compêndio do mundo do NET Architect (`compendio.mjs`, com os três
exemplos).

- **Implementado:**
  - **`build/arquiteturas.mjs`:** lê o documento da campanha como o cpr-2077 (cada "## Nome" com a tabela Andar | Ramo |
    Conteúdo | DV | O que tem vira uma arquitetura; a seção sem tabela fica de fora; um andar que não vale para o RED
    para o build, com o nome da arquitetura e o andar), com a descrição da seção (o negrito vira `<b>`), e traz os 3
    exemplos do NET Architect no formato do sistema;
  - **o compêndio "Arquiteturas da NET"** (`packs/arquiteturas`, na pasta do sistema), escondido dos jogadores como o do
    NET Architect: as 4 da campanha (o RT-07, O Gatilho, A Coleira, O Núcleo) e os 3 exemplos, com o ícone `tower`;
  - **o instalador** gera os compêndios de novo também quando o build das arquiteturas ou o documento da campanha mudam.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 71 de 75. Um teste novo (com o que o cenário do NET Architect conferia das arquiteturas da campanha): as 4 da
    campanha, na ordem do documento; O Gatilho com os 6 andares (o Raven no 2, o Hellhound no 5, o arquivo DV 12 no 6, a
    senha do handout no 1); A Coleira com o 4B saindo do 3A e os fundos 8A e 5B; O Núcleo com o 6B saindo do 5A; a
    descrição com o negrito; a seção sem tabela de fora; os 3 exemplos; e os erros de um documento torto (o Black ICE
    desconhecido, o andar 19, o DV 3, o conteúdo desconhecido). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 78 de 83, cerca de 139 s. Um passo novo: o compêndio com as 7 arquiteturas, só de arquitetura, na pasta do
    sistema; O Gatilho no mapa (1A Senha DV 8 a 6A Arquivo DV 12); no navegador do jogador, o compêndio não aparece. Os
    avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077
    (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o ramo do documento ignorado; o DV do documento sem conferência; a descrição sem o negrito;
    - G4: o compêndio sem as arquiteturas; o compêndio à vista dos jogadores.
- **Próximo:** o C8, parte 3: a geração pelas tabelas do CORE (3d6 andares, os ramos, o lobby e a tabela da
  dificuldade, do compêndio de tabelas do CORE).
- **Commit:** `68dc398`.

### Ciclo 49 (2026-10-13): a arquitetura gerada pelas tabelas (o C8, parte 3; sessão KouArt)

O `_netarchGenerateFromTables` e o `_netarchDrawFromTableCustom` da ficha do item do CORE (`cpr-item-sheet.js`), as
tabelas de andares do CORE (`internal/net-rolltables`) e a wiki ("Montando uma arquitetura": os andares, o lobby e as
dificuldades; RED p. 210–211).

- **Implementado:**
  - **as tabelas no build** (`gerado.TABELAS_DA_NET`): o lobby (1d6) e as 4 dificuldades (3d6), cada resultado com os
    conteúdos do andar e o rótulo em português ("Password DV8" é a senha DV 8; "Hellhound x2, Liche" são três linhas
    de Black ICE);
  - **`arquitetura.gerarAndares`** (sem Foundry): 3d6 andares; o 1d10 de novo a cada 7+, um ramo a mais (até o H); os 2
    primeiros andares pelo lobby e os outros pela dificuldade, sem repetir um resultado (menos o arquivo e o nó de
    controle); os ramos entram como no CORE (o novo começa no andar 3, o seguinte no 4...); cada andar guarda a tabela,
    a rolagem e o resultado;
  - **o botão "Gerar pelas tabelas"** da ficha: a janela pergunta a dificuldade e avisa que os andares de agora saem; os
    dados rolam sem cartão, como as tabelas do CORE.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 72 de 76. Um teste novo: o lobby igual ao da wiki; as 4 dificuldades (de 3 a 18, com o DV da tabela de
    dificuldades); os vários Black ICE num resultado; a geração com os dados fixos (6 andares e um ramo, o 9 que não
    repete, o ramo B do 3 saindo do 2A, os dois Hellhound no mesmo andar, o DV 8); e o 1d10 sempre 7+, que para no H. As 4
    falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 79 de 84, cerca de 120 s. Um passo novo: o botão da ficha, a janela com as 4 dificuldades e o aviso, e a Padrão
    com os dados fixos (as 8 linhas e o mapa, com o "3B de 2A Hellhound Hellhound"). A primeira rodada caiu: o
    `evaluateSync` do Foundry 14 não rola dados (o gerador passou a esperar a rolagem; a lição está no QUALITY_GATES). A
    segunda caiu em dois detalhes do teste: a lista de botões pegou o controle do cabeçalho da janela (o QUALITY_GATES já
    avisava: agora só os do rodapé) e o texto de um andar com dois conteúdos saía grudado (o mapa ganhou um espaço entre
    eles). Os avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das armas de
    2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o mesmo resultado saindo de novo; o arquivo e o nó de controle sem poder repetir; o ramo novo no andar 2; só o
      primeiro Black ICE de um resultado;
    - G4: a janela sem o aviso; a dificuldade escolhida sem valer.
- **Próximo:** o C8, parte 4: o ponto de acesso nos tiles e a conexão do token (como o NET Architect: o marcador, o
  alcance, os requisitos, o status de conectado).

### Ciclo 50 (2026-10-14): o ponto de acesso, a conexão e a janela da NET (o C8, parte 4; sessão KouArt)

O NET Architect da mesa (`foundry-net-architect/`: o `ponto-de-acesso.mjs`, o `estado.mjs`, o `socket.mjs`, o
`token.mjs`, a `janela.mjs` e os ganchos do `net-architect.mjs`) e a wiki ("Netrunning": "Precisa estar a até 6 m de um
ponto de acesso, sem parede no meio (8 m com o upgrade de alcance)"; "Ações NET": conectar e desconectar, e "Sair do
alcance conectado = desconexão insegura"). O CORE não tem ponto de acesso. Commit anterior: `6caa47e` (ciclo 49).

- **Implementado** (a pasta nova `scripts/netrun/`):
  - **o ponto de acesso:** o botão no HUD do Tile (só o mestre) abre a configuração: a arquitetura (as do mundo e as dos
    compêndios de itens, por compêndio), o alcance, o DV, os requisitos (o cyberdeck equipado, a Interface mínima), o
    oculto (com o DV do Scanner, para a parte do Scanner), o reinício das defesas e a imagem de terminal para o Tile sem
    imagem; "Abrir a arquitetura", "Reiniciar" e "Tirar o ponto";
  - **o marcador** "NET" sobre o Tile, para todos (o oculto e o do Tile escondido, só para o mestre, mais apagado); o
    clique no marcador vem antes do Foundry (não seleciona nem arrasta);
  - **a conexão:** o jogador seleciona o token e clica no marcador; perto o bastante e com os requisitos, pede ao mestre
    ativo, que confere tudo de novo (o dono do token, a distância, o deck, a Interface) e grava no Tile o estado público
    (quem está na NET e onde, os andares que os jogadores enxergam, o registro). O mestre conecta qualquer token, sem os
    requisitos, como no NET Architect. O token ganha a flag da conexão, o status "Conectado à NET" e o anel ciano;
  - **o alcance pela wiki:** o Range Upgrade instalado no deck equipado soma 2 (ver as dúvidas);
  - **a janela da NET**, para o dono do token e para o mestre (a dele mostra todos): quem está na NET e onde, o mapa que
    os jogadores enxergam (o andar 1 como "?" a partir da entrada), o registro e o botão "Desconectar";
  - **a queda:** sair do alcance derruba da NET (a desconexão insegura, no registro), e a janela do jogador fecha; o token
    apagado sai da NET; o Tile apagado solta os tokens. Sem ninguém conectado, a arquitetura reinicia as defesas (RED p.
    198); o mestre reinicia a arquitetura pela configuração (o jogador, não);
  - **o socket da NET:** o canal do sistema, com os tipos próprios ("net-pedido", "net-resposta"); os pedidos entram um
    de cada vez no mestre ativo;
  - **as regras sem o Foundry** (`netrun/regras-da-net.mjs`): o netrunner do ator, o que falta para conectar, a
    distância, o alcance e o mapa visível.
- **Testes:**
  - G1: 0 erros (agora com a subpasta `scripts/netrun/`);
  - G2: 0 erros (o ESLint ganhou os globais `PIXI` e `performance`);
  - G3: 73 de 77. Um teste novo: a frase da wiki, a distância do centro do token à borda do Tile (e pelo `_source` do
    token que anda), o netrunner do ator (o deck equipado, os programas nele, o Range Upgrade pelo catálogo e pelo nome,
    só no deck equipado), o alcance (6, um quadrado sem alcance, 8 com o upgrade), o que falta para conectar e o mapa
    visível (vazio, a entrada com o 1A como "?", o 2A com a senha aberta e o Wisp com a REZ que sobrou, o mapa revelado com
    o demônio e o netrunner inimigo). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 80 de 85, cerca de 125 s. Um passo novo, nos dois navegadores: a configuração pelo botão do HUD do Tile (as 7
    arquiteturas do compêndio e a do mundo, a imagem de terminal), o marcador (o oculto some só para o jogador), o jogador a
    7 m que não conecta (o aviso, e o pedido direto ao mestre recusado), o Range Upgrade instalado e a conexão (a janela
    com o 1A como "?" e o registro; no mestre, o estado, a flag, o status, o anel e a janela dele), a queda ao sair do
    alcance (a janela fecha; o aviso do mestre é capturado no passo), o "Desconectar" da janela, o reinício recusado ao
    jogador e feito pelo mestre, o token apagado e o Tile apagado. A primeira rodada caiu: a queda só vinha no movimento
    seguinte. Um diagnóstico no passo mostrou o porquê: no Foundry 14, no gancho do movimento, o `token.x` do mestre
    ainda é o de antes, e o `_source` já é o destino; a distância passou a vir do `_source` (a lição está no
    QUALITY_GATES). A mesma rodada pegou o teste olhando a janela do mestre antes de ela acabar de fechar. Os avisos do
    passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o Range Upgrade sem somar; a distância do canto do token; os vizinhos de quem está na NET com o conteúdo; o
      Range Upgrade só pelo nome; o deck exigido no ponto que não exige; a distância pelo `token.x`, e não pelo `_source`;
    - G4: o mestre sem conferir a distância do pedido (conecta a 7 m); só o movimento em Y tirando do alcance; a janela do
      jogador sem fechar quando ele sai da NET; o ponto oculto visível ao jogador; o jogador reiniciando a arquitetura; a
      distância pelo `token.x` (a queda não vem).
- **Pendências:** andar e as habilidades contra os andares (a próxima parte); o efeito do Black ICE na desconexão
  insegura (com os inimigos); a parede entre o token e o ponto e o Scanner (ROADMAP, C8).
- **Próximo:** o C8, parte 5: o motor no mestre e o resto da janela da NET (andar, as habilidades contra os andares).

### Ciclo 51 (2026-10-14): andar e as habilidades contra os andares na NET (o C8, parte 5; sessão KouArt)

O NET Architect da mesa (o `mover`, o `habilidade`, o `comandar`, o `revelar` e o `zerarAcoes` do `estado.mjs`; a
`janela.mjs`; o gancho do turno no `net-architect.mjs`) e a wiki ("Ações NET" e "Habilidades de Interface", RED p.
198–201: Interface + 1d10 > DV; "Não são Ações NET: andar pela arquitetura (até a próxima obstrução)"; o custo de cada
habilidade; os exemplos de vírus da p. 200). Commit anterior: `1962f26` (ciclo 50).

- **Implementado:**
  - **andar:** na janela, o jogador clica num andar do mapa e em "Ir para cá" (só os vizinhos). Andar não é Ação NET; a
    senha que ainda não foi quebrada trava a descida; o andar a que chega fica visto, e o registro diz o que há nele;
  - **as habilidades contra os andares**, com o alvo no andar onde o netrunner está: o Pathfinder revela andares até a
    obstrução com DV maior que o total; o Backdoor quebra a senha; o Eye-Dee identifica o arquivo (o nome e a
    descrição aparecem só depois); o Control toma o nó de controle, que passa a aceitar comandos (1 Ação NET cada; o
    mestre narra); o Cloak põe o total como a DV dos rastros; o Virus, só no andar mais fundo, pergunta ao mestre a DV
    e as Ações NET (com os exemplos da wiki). Passa quem tira mais que a DV;
  - **as Ações NET:** em combate, as do Rank por turno (as habilidades, os comandos e o desconectar seguro gastam;
    sem Ação, recusa), de volta no começo do turno do netrunner (o mestre ativo, pelo combate); fora de combate, não
    contam. O mestre passa do limite;
  - **quem rola, por enquanto:** o mestre, pela rolagem de Interface do sistema (o cartão no chat, com a Sorte que o
    jogador preparou na ficha). A janela de rolagem no computador do jogador vem numa próxima parte (ver as dúvidas);
  - **a janela:** o mapa clicável (o andar onde o netrunner está, os vizinhos, o escolhido), o andar escolhido com o
    que tem e a situação de cada coisa, as habilidades que dão ali, a caixa do vírus e a do comando, as Ações NET que
    sobram, a Sorte preparada e a desconexão insegura (com a pergunta). O mestre vê a arquitetura inteira (o que os
    jogadores ainda não viram fica marcado), age pelo netrunner escolhido, revela um andar ou o mapa, zera as Ações NET,
    derruba da NET e reinicia a arquitetura vazia;
  - **as regras sem o Foundry** (`netrun/regras-da-net.mjs`): o que trava a descida, o alvo de cada habilidade, as
    Ações NET e o resultado de cada habilidade.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 74 de 78. Um teste novo: as frases da wiki; o resumo do andar; andar (só aos vizinhos, a senha travando a
    descida até o Backdoor, subir livre); o alvo de cada habilidade; o Backdoor com 6 contra a DV 6 (não passa) e 9
    (passa); o Eye-Dee e o que o mapa público mostra antes e depois; o Pathfinder com 7 (o 3A com DV 8 aparece e barra o
    4A); o Control, o Cloak e o Virus; as Ações NET fora e dentro de combate e o mestre passando do limite. As 4 falhas
    são as das armas de 2077 (QUALITY_GATES);
  - G4: 82 de 87, cerca de 130 s. Dois passos novos, nos dois navegadores:
    - andar e as habilidades: na janela do jogador, o "?" do andar 1 vira a senha DV 6 ao chegar; a senha trava a
      descida (o aviso); o Backdoor rola no mestre (o cartão no chat, com o nome do netrunner): 6 contra a DV 6 não
      passa, 9 passa; o Eye-Dee mostra o arquivo; o Pathfinder com 7 revela o 3A e o 3B e para no nó DV 8 (o 4A segue
      escondido); o Control toma o nó e o comando, pela caixa de texto, vai ao registro; o mestre, na janela dele, vê o 4A
      marcado como escondido e o revela; no 3B (o fundo), o Virus com a DV 10 e as 2 Ações NET que o mestre responde;
    - as Ações NET em combate: no começo do turno, 3 de 3; o Virus de 2 Ações e um Cloak gastam as 3; o Cloak seguinte e
      o desconectar seguro são recusados (os avisos); a rodada seguinte as devolve; a desconexão insegura, com a pergunta,
      sai sem gastar.
    Os dois passaram na primeira rodada; o passo das Ações NET ganhou depois o Virus em combate (para provar as Ações do
    mestre), e a segunda rodada passou com ele. As capturas da janela do jogador e da do mestre foram conferidas. Os
    avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077
    (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a senha sem travar a descida; o empate com a DV passando; o Pathfinder sem revelar; as Ações NET contando
      fora de combate; o mestre preso ao limite das Ações NET; o alvo podendo ser o que já foi feito; o que o arquivo é
      aparecendo antes do Eye-Dee;
    - G4: o começo do turno sem devolver as Ações NET; o andar a que se chega sem ficar visto; o Virus gastando 1 Ação NET,
      e não as do mestre; o desconectar seguro sem gastar Ação NET; a janela liberando o Backdoor sem senha no andar.
    Duas lições delas. A do Backdoor sobreviveu na primeira rodada: o passo só conferia os botões no andar 1, onde o
    Backdoor vale de todo jeito; ele passou a conferir também no andar 3, sem senha. A do andar sem ficar visto achou um
    erro de verdade na janela: o andar onde o netrunner está, fora do mapa (como na arquitetura editada no meio da
    corrida), quebrava a janela (`Cannot read properties of undefined`); agora a janela volta ao ponto de acesso. O
    ajudante do passo também passou a esperar a janela redesenhada sem o estado "ocupado".
- **Pendências:** os inimigos (o Black ICE e o demônio no andar ainda não seguram a descida nem atacam), o Zap, o
  Slide e os programas na janela (a parte 6); a janela de rolagem do jogador na NET; os nós de controle ligados à cena;
  os arquivos copiados; o Scanner e a parede (ROADMAP, C8).
- **Próximo:** o C8, parte 6: os inimigos e o combate na NET (o Black ICE e o demônio no andar, a velocidade, o
  ataque, os efeitos, o Zap, o Slide e os programas na janela).

### Ciclo 52 (2026-10-14): os inimigos no andar, o Zap e o Slide (o C8, parte 6; sessão KouArt)

O NET Architect da mesa (no `estado.mjs` dele: o `quemSegura`, a `defesaDo`, o `danoNoInimigo`, o Zap e o Slide do
`resolverHabilidade`, o `ajustarIce`; a REZ e os números do inimigo na `janela.mjs`) e a wiki ("Habilidades de
Interface": o Zap "contra DEF do programa + 1d10 ou Interface + 1d10", 1d6 de dano no REZ de um programa ou no cérebro; o
Slide "1 Ação NET (1×/turno)", "contra PER do Black ICE + 1d10"; andar "até a próxima obstrução"). Commit anterior:
`97590aa` (ciclo 51). A parte 6 do C8 ficou em três ciclos: este (o netrunner contra os inimigos), os ataques e os
efeitos dos inimigos, e o combate com o deck na janela.

- **Implementado:**
  - **os inimigos seguram a descida:** o Black ICE ativo, até cair ou até o Slide do netrunner (que vale até ele sair do
    andar), e o demônio, até cair; o netrunner inimigo não segura. Ao chegar num andar com inimigos ativos, o registro
    avisa;
  - **o Zap** contra qualquer inimigo do andar (com a escolha do alvo na janela, havendo mais de um): o mestre rola a
    defesa do inimigo no nome dele (a DEF + 1d10 do Black ICE, a Interface + 1d10 do demônio, a Interface da ficha do
    netrunner inimigo); acertando (o empate é da defesa), o 1d6 sai da REZ do Black ICE ou do demônio (em 0, ele cai e
    não segura mais) ou vai ao cérebro do netrunner inimigo (com o HP em 0, ele cai da NET);
  - **o Slide** contra o Black ICE: contra a PER + 1d10 dele (o empate é do ICE); uma vez por turno em combate;
  - **a REZ dos inimigos** no estado do Tile, de volta cheia quando a arquitetura reinicia as defesas, e no painel do
    mestre (−5, −1, +1, a REZ cheia);
  - **a janela:** o andar escolhido mostra os números da wiki do inimigo (a PER, a SPD, o ATK e a DEF do Black ICE; a
    Interface e as Ações do demônio), o efeito e a REZ (ou "derrubado"); o mapa também; os botões do Zap e do Slide;
  - **o cartão das rolagens dos inimigos:** o `testar` do sistema ganhou o `falante` (o nome no cartão de quem não é
    ator); o `rolarDanoDoZap` sai sem os botões do mestre quando o motor aplica o dano.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 75 de 79. Um teste novo: as frases da wiki; quem segura (o Hellhound sim, a Raposa não; o Hellhound driblado e
    o Imp derrubado, não); o alvo do Zap e do Slide; o Zap com o empate, o dano na REZ e no cérebro; o Slide com o
    empate; uma vez por turno; o demônio que não se dribla; a REZ que não passa de 0 nem da tabela; o mapa público com os
    números. Os testes dos ciclos 50 e 51 mudaram onde o comportamento mudou de propósito (os números no inimigo do mapa;
    o Zap, agora uma habilidade da NET). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 83 de 88, cerca de 130 s. Um passo novo, nos dois navegadores: no andar 1, o Hellhound com os números da wiki e
    a REZ (no andar escolhido e no mapa), o registro do encontro, os botões do Zap e do Slide, e o aviso de que ele segura
    a descida; o Zap (10 contra a DEF 2 + 3; o cartão da DEF no nome do Hellhound) tira 4 da REZ; o Slide (11 contra a PER
    6 + 2) passa e o netrunner desce; no andar 2, o Imp segura, e o Slide fica desligado; o mestre, pelo painel dele, põe
    a REZ do Imp em 0 (−5 três vezes); o mapa mostra o Imp derrubado e a descida fica livre; de volta ao andar 1, o
    Hellhound segura de novo. O passo passou na primeira rodada; a volta ao andar 1 entrou depois (para pegar o Slide que
    não acabava ao sair do andar), e a segunda rodada passou com ela. Os testes dos ciclos 50 e 51 mudaram onde o
    comportamento mudou de propósito (os botões do Zap e do Slide na lista). Os avisos do passo "nenhum aviso" foram
    conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o Slide sem livrar do Black ICE; o empate do Zap para o netrunner; a REZ sem limites; o empate do Slide para o
      netrunner; o Slide mais de uma vez por turno; o demônio sem segurar; o inimigo com a REZ em 0 ainda ativo;
    - G4: o Zap sem tirar dano; a defesa do inimigo sem o número dele; o mestre sem mudar a REZ; a janela liberando o Slide
      contra o demônio; o Slide valendo depois de sair do andar.
- **Pendências:** os ataques e os efeitos dos inimigos (a velocidade na chegada, o ataque na vez dele, o dano no
  cérebro e nos programas, o fogo do Hellhound, o Kraken, o Wisp, o Skunk, o Giant, a desconexão insegura com o efeito);
  o combate na NET e o deck na janela; a janela de rolagem do jogador na NET; os nós de controle ligados à cena; os
  arquivos copiados; o Scanner e a parede.
- **Próximo:** o C8, parte 7: os ataques e os efeitos dos inimigos.

### Ciclo 53 (2026-10-14): os ataques dos inimigos e os efeitos do Black ICE (o C8, parte 7; sessão KouArt)

O NET Architect da mesa (o `encontrarInimigos`, o `ataqueDoInimigo` e o `inimigoAtaca` do `estado.mjs`; o `efeitos.mjs`
com o efeito de cada Black ICE e o fogo; a desconexão insegura do `retirar`) e a wiki ("Black ICE", RED p. 204–207: "Ao
encontrar Black ICE à espreita: Interface + bônus de velocidade + 1d10 contra SPD do ICE + 1d10. Se o ICE vencer, você
sofre o efeito na hora"; o ataque "ATK + 1d10 contra Interface + 1d10"; a tabela com o efeito de cada um; "Demônios": o
Zap; o hardware do deck: o Insulated Wiring e a KRASH Barrier). Commit anterior: `cb6bfd7` (ciclo 52).

- **Implementado:**
  - **o encontro:** ao chegar num andar, o Black ICE ativo disputa a velocidade (a Interface + a velocidade + 1d10 do
    netrunner contra a SPD + 1d10 do ICE; o empate é do netrunner); vencendo, age na hora. O demônio sempre vence e só
    detecta; o netrunner inimigo só está ali;
  - **o ataque dos inimigos,** pelo painel do mestre ("X ataca", a vez dele): o Black ICE com o ATK + 1d10; o demônio e o
    netrunner inimigo com o Zap (a Interface + 1d10; acertando, 1d6 no cérebro); contra a Interface + 1d10 do netrunner (o
    empate é da defesa). O Black ICE driblado com o Slide não ataca quem o driblou;
  - **os efeitos da tabela da wiki,** na ficha, pelo mestre ativo: o dano no cérebro (o Armor ativo reduz 4; o Shield não
    para Black ICE); o Asp destrói um programa do deck; o Raven desativa um defensor ativo antes do dano; o Dragon, o
    Killer e o Sabertooth tiram da REZ de um programa ativo, que em 0 é destruído; o programa destruído fica na ficha,
    fora do deck e desativado, com "(destruído)" no nome (o mestre apaga); o Liche e o Scorpion, −1d6 em INT, REF e DEX
    ou no MOVE, um efeito de 1 hora na ficha; o Skunk, −2 no Slide enquanto estiver ativo (acumula; entra no cartão do
    Slide); o Kraken prende até o fim do próximo turno (não avança nem desconecta com segurança); o Wisp tira 1 Ação NET
    no começo do próximo turno (no mínimo 2 livres); o Giant derruba da NET (a KRASH Barrier no deck segura); o Hellhound
    põe fogo (o status "Em chamas"; o Insulated Wiring no deck impede);
  - **o fogo:** em combate, quem acaba o turno em chamas perde 2 no HP (o aviso no chat); "Apagar o fogo (Ação Carnal)" na
    janela da NET;
  - **a desconexão insegura** (a do jogador, a queda por sair do alcance, a do mestre e a do Giant): o Black ICE que o
    netrunner encontrou no andar e ainda está ativo age de graça, até o driblado com o Slide, menos o que causou a queda;
  - **a janela:** os avisos da situação do netrunner (o fogo com o botão, o Kraken, o Skunk, o Wisp) e, no painel do
    mestre, os botões da vez de cada inimigo que pode atacar o netrunner escolhido.
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 76 de 80. Um teste novo: as frases da wiki (o encontro, o ataque, o hardware); os 12 Black ICE da tabela com o
    efeito deles (a fórmula de dano onde há dano; o anti-programa no REZ de um programa); a velocidade e o ataque com os
    empates; quem pode atacar; a queda; o Skunk; o Kraken; o começo do turno (o Wisp e a prisão); o hardware do deck. As 4
    falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 85 de 90, cerca de 140 s. Dois passos novos, nos dois navegadores:
    - o encontro e o ataque: ao chegar, o Wisp vence a velocidade (6 contra 9) e age na hora (3 no cérebro e 1 Ação NET a
      menos, com o aviso na janela); o Hellhound e o Skunk perdem; o mestre faz o Hellhound atacar (11 contra 6: 7 no
      cérebro e o fogo) e o Skunk (−2 no Slide); o Slide no Wisp, com o alvo escolhido na janela, tira os 2 do Skunk (o
      cartão mostra o Skunk); em combate, o começo do turno começa com 1 Ação NET gasta (o Wisp) e a rodada seguinte
      queima 2 no HP (o aviso no chat); "Apagar o fogo" na janela tira o status;
    - os efeitos: o Killer zera a REZ do Armor ativo, que é destruído; o Asp destrói o Sword (os dois ficam na ficha, fora
      do deck, com "(destruído)"); o Liche tira 4 de INT, REF e DEX por 1 hora (o efeito na ficha); o Kraken dá 6 no
      cérebro e prende (descer e o desconectar seguro são recusados, com o aviso na janela); com a KRASH Barrier, o Giant
      dá o dano e não derruba; sem ela, derruba, e na queda o Asp e o Killer não acham programa, o Kraken e o Liche agem de
      novo; a janela do jogador fecha.
    Os dois passaram na primeira rodada. O passo dos inimigos do ciclo 52 caiu nela: a chegada ao Black ICE passou a rolar
    a velocidade, e ele não fixava esses dados; ganhou os dados fixos e o registro novo (a lição está no QUALITY_GATES), e
    a segunda rodada passou. Os avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são
    as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o empate da velocidade para o ICE; o empate do ataque para o inimigo; o Black ICE driblado atacando; o Wisp
      tirando a Ação NET abaixo das 2 livres; o Kraken sem segurar a descida; o Skunk derrubado tirando do Slide; o Black
      ICE que derrubou agindo na queda;
    - G4: sem o encontro na chegada; o Hellhound sem fogo; a KRASH Barrier sem segurar o Giant; o fogo sem queimar no fim
      do turno; o Slide sem o −2 do Skunk; o Kraken deixando desconectar com segurança; a desconexão insegura sem o efeito
      do Black ICE do andar.
- **Pendências:** o combate na NET (os inimigos na iniciativa, a vez deles pelo combate) e o deck na janela; a janela de
  rolagem do jogador na NET; os nós de controle ligados à cena; os arquivos copiados; o Scanner e a parede.
- **Próximo:** o C8, parte 8: o combate na NET (os inimigos na iniciativa) e o deck na janela (ativar, desativar e atacar
  com os programas).

### Ciclo 54 (2026-10-14): o deck na janela da NET (o C8, parte 8; sessão KouArt)

O NET Architect da mesa (o `programa` do `estado.mjs`: ativar, desativar e atacar; o deck na `janela.mjs`) e a wiki
("Ações NET": "Ativar ou desativar um programa: 1 Ação NET. Cada programa uma vez por rodada"; "Programas: ataque":
"Desativam sozinhos depois de usados"; "Combate na NET": "Interface + ATK do programa + 1d10 vs Interface + 1d10 (ou DEF
do programa + 1d10)" e "Programa anti-pessoal só afeta netrunners; anti-programa só afeta programas"). Commit anterior:
`73f70ad` (ciclo 53). A parte 8 do C8 ficou em dois ciclos: este (o deck) e o seguinte (o combate na NET).

- **Implementado:**
  - **o deck na janela:** os programas instalados no cyberdeck equipado (os destruídos ficam de fora), com a classe, o
    ATK, a DEF e a REZ; "Ativar" e "Desativar" (1 Ação NET; em combate, cada programa uma vez por rodada; o que tem REZ
    não ativa com ela em 0) e "Atacar" no programa de ataque ativo que tem alvo no andar;
  - **o ataque do programa** (1 Ação NET, como o NET Architect): o Interface + ATK + 1d10 do netrunner contra a defesa do
    alvo (a DEF + 1d10 do Black ICE, a Interface + 1d10 do demônio ou da ficha do netrunner inimigo; o empate é da
    defesa). O anti-programa só no Black ICE e no demônio (o dano "em Black ICE", na REZ deles); o anti-pessoal só no
    netrunner inimigo (o dano no cérebro da ficha dele, que cai da NET com o HP em 0); o alvo de outra classe é recusado.
    O cartão do dano sai no nome do netrunner, sem os botões do mestre (o motor aplica). Depois do ataque, o programa
    desativa (a wiki);
  - **o alvo** da janela vale para o Zap, o Slide e os programas;
  - **as regras sem o Foundry:** o que impede ativar ou desativar, o alvo do programa e o ataque (o mesmo cálculo do
    Zap).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 77 de 81. Um teste novo: as frases da wiki; uma vez por rodada em combate (fora dele, não); a REZ em 0 que não
    ativa (desativar, sim; o programa de ataque, sem REZ, ativa); o alvo do anti-programa (o Black ICE, o demônio) e do
    anti-pessoal (o netrunner inimigo), com o de outra classe recusado; o ataque com o empate e o dano na REZ. As 4 falhas
    são as das armas de 2077 (QUALITY_GATES);
  - G4: 86 de 91, cerca de 140 s. Um passo novo, nos dois navegadores: o deck em combate. O "Atacar" só aparece no
    programa ativo; o Sword ativado (1 Ação NET) ataca o Hellhound (12 contra 8) e tira 11 da REZ dele (o mapa mostra
    9/20); o Sword desativa e não religa na mesma rodada (o botão desligado e o pedido direto recusado); o Hellbolt,
    ativado com a 3ª Ação NET, não ataca sem Ação NET; na rodada seguinte, o Hellbolt acerta a Raposa, netrunner inimiga
    com ficha (14 contra 5), e tira 10 do HP dela; o Sword, ativado de novo, contra a Raposa é recusado (anti-programa),
    sem gastar a Ação NET. O passo passou na primeira rodada. Depois dela, ganhou a conferência de que o "Atacar" não
    aparece antes de ativar (para a mutação da janela), e a rodada limpa passou; depois das mutações, ganhou a captura
    do deck (`v14-jogador-janela-net-deck.png`: o Sword ativo, com "Atacar" e o "Desativar" apagado; o Hellbolt
    desativado, com "Ativar"), conferida, e a última rodada passou também. Os avisos do passo "nenhum aviso" foram
    conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: o programa mudando mais de uma vez por rodada; o programa com a REZ em 0 ativando; o programa de ataque
      atingindo qualquer inimigo; o alvo de outra classe sem ser recusado; o empate do golpe para o netrunner (derruba
      também o teste do Zap, que usa o mesmo cálculo);
    - G4: o programa de ataque sem desativar depois de usado; ativar sem gastar Ação NET; o dano do programa sem sair; o
      "Atacar" no programa desativado (pega pela conferência que o passo ganhou depois da primeira rodada); o
      anti-pessoal sem chegar ao cérebro do netrunner inimigo.
- **Pendências:** o combate na NET (os inimigos na iniciativa, a vez deles pelo combate); a janela de rolagem do jogador
  na NET; os nós de controle ligados à cena; os arquivos copiados; o Scanner e a parede. Vista na captura do deck: a
  frase da chegada ao andar (do ciclo 52) lista o netrunner inimigo junto de quem segura a descida ("Hellhound e Raposa
  estão neste andar: o Black ICE e o demônio seguram a descida até caírem."), e ele não segura (o `quemSegura`); fica
  para o ciclo 55, com os inimigos.
- **Próximo:** o C8, parte 9: o combate na NET (os inimigos encontrados na iniciativa, com um token; a vez deles pelo
  combate; a REZ do token e a do estado juntas).

### Ciclo 55 (2026-10-14): o combate na NET (o C8, parte 9; sessão KouArt)

O NET Architect da mesa (o `combate.mjs`: os inimigos encontrados na iniciativa, com um token escondido; a REZ no token;
a vez de cada um pelo mestre; os tokens que saem no reinício) e a wiki ("Black ICE", RED p. 204: "Depois ele entra no
topo da fila de iniciativa e ataca uma vez por turno (ATK + 1d10 contra Interface + 1d10) até ser desativado ou
driblado com Slide", e "O mestre joga todos os turnos do Black ICE"; "Demônios", p. 212: "Entra no topo da iniciativa
quando detecta um intruso"). Commit anterior: `db23c51` (ciclo 54).

- **Implementado:**
  - **os inimigos no combate** (o `netrun/combate.mjs`): ao chegar ao andar, o Black ICE, o demônio e o netrunner
    inimigo com ficha entram no combate ativo da cena (sem combate, um novo, sem começar), com o netrunner; cada inimigo
    ganha um token escondido no ponto de acesso (o Black ICE e o demônio com um ator por modelo da wiki, na pasta
    "Inimigos da NET"; o netrunner inimigo, com a ficha dele) e rola a iniciativa (a do sistema põe o Black ICE e o
    demônio no topo; o netrunner inimigo rola a dele). O inimigo que já tem token (de outro encontro) usa o dele;
  - **a REZ junta:** a do estado vai para o token (a barra) depois de cada operação, e em 0 o combatente fica
    derrotado; a mudada no token (a barra, o dano aplicado pelo cartão) volta para o estado ("A REZ do X mudou no
    token"); igual à do estado, nada muda;
  - **a vez do inimigo:** no turno dele, o mestre ativo vê a janela "A vez de X na NET" com "Atacar" para cada
    netrunner que ele pode atacar no andar dele (o Black ICE driblado com o Slide, não) e "Pular a vez"; o derrotado não
    tem a janela. O ataque é o mesmo do painel do mestre (o botão continua);
  - **a saída:** no reinício da arquitetura (ninguém mais na NET, ou o mestre) e com o Tile apagado, os inimigos saem do
    combate e da cena; os tokens que saíram da NET perdem a marca antes, para o turno que o Foundry acerta não chamar
    quem já saiu;
  - **a configuração "Inimigos da NET no combate"** (padrão: ligada, como no NET Architect) desliga tudo isso;
  - **a frase da chegada** só fala de quem segura a descida (o Black ICE e o demônio); o netrunner inimigo tem a linha
    do encontro (a pendência do ciclo 54).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 78 de 82. Um teste novo: as frases da wiki; a frase da chegada (o Hellhound sozinho, mesmo com a Raposa no
    andar; o Imp e o Wisp juntos; o andar só com o netrunner inimigo, sem frase); quem o inimigo ataca na vez dele (o
    netrunner do andar; não o de outro andar; o Black ICE driblado não ataca quem o driblou, o netrunner inimigo sim; o
    demônio com a REZ em 0 e o netrunner inimigo fora da NET, ninguém). As 4 falhas são as das armas de 2077
    (QUALITY_GATES);
  - G4: 87 de 92, cerca de 140 s. Um passo novo, nos dois navegadores, com a configuração ligada: a chegada ao andar do
    Hellhound e da Raposa (com ficha) dá só "Hellhound está neste andar" e a linha da Raposa; o combate é criado sem
    começar (as Ações NET seguem livres), com a fila Hellhound, Raposa e o netrunner; o token do Hellhound fica
    escondido no centro do ponto de acesso, com a REZ 20/20, o ator na pasta "Inimigos da NET"; o mestre começa o
    combate e, na vez do Hellhound, a janela dá "Atacar" o netrunner e "Pular a vez" (o ataque, 8 contra 13); na vez da
    Raposa, o mestre pula; na vez do netrunner, as Ações NET voltam e o Zap tira 4 da REZ (o token fica com 16); a REZ
    do token em 0 derruba o Hellhound no estado ("A REZ do Hellhound mudou no token: ele caiu.") e o deixa derrotado; na
    rodada seguinte, a vez dele não abre a janela, e a da Raposa, que o mestre marcou derrotada ainda na NET, também não;
    a desconexão reinicia a arquitetura e tira os dois do combate e da
    cena; de volta ao andar, eles entram de novo com a REZ cheia, e o Tile apagado os tira. Os passos da NET dos ciclos
    51 a 54 rodam com a configuração desligada (o `montarNet`; eles conferem a NET sem os inimigos na iniciativa), e a
    limpeza (`desmontarNet`) apaga o que sobrar dos inimigos e religa a configuração. Cinco rodadas: na primeira, o
    mundo de teste não ficou pronto no navegador (62 s; o ambiente: a segunda abriu sem mudança); na segunda, o passo
    caiu sem a janela da vez, e ele ganhou o diagnóstico (de quem é a vez e a fila); na terceira, o diagnóstico mostrou o
    combate que o passo dos turnos deixa na cena (o netrunner entrou nele, e a vez seguinte foi a da Atiradora), o 1 no
    dado fixo do ataque (falha crítica: "−2 contra 9") e os botões do cabeçalho na lista; o passo passou a apagar os
    combates da cena antes de começar, com o 2 no dado e os botões do rodapé, e a quarta passou (as lições estão no
    QUALITY_GATES); depois das mutações, o passo ganhou a Raposa marcada derrotada (ver as mutações), e a quinta, limpa,
    passou também. Os avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das
    armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a frase da chegada com o netrunner inimigo entre quem segura a descida; o Black ICE driblado atacando na vez
      dele;
    - G4: os inimigos fora do combate; o token do inimigo à vista dos jogadores; a REZ do estado sem ir para o token; o
      inimigo com a REZ em 0 sem ficar derrotado; a REZ do token sem voltar para o estado; a vez do inimigo sem a janela
      do mestre; o reinício e o Tile apagado deixando os inimigos no combate e na cena (duas mutações); a REZ do token
      igual à do estado entrando no registro; o inimigo derrotado com a janela da vez. Esta última sobreviveu à primeira
      versão do passo: o Hellhound com a REZ em 0 já não tem a quem atacar, e a janela não abre de qualquer jeito. O
      passo ganhou a Raposa, ainda na NET, marcada derrotada pelo mestre, e a mutação passou a cair (na vez dela, a
      janela abria).
- **Pendências:** a janela de rolagem do jogador na NET; os nós de controle ligados à cena (e o demônio que os opera);
  os arquivos copiados; o Scanner e a parede; o editor visual.
- **Próximo:** o C8, parte 10: o jogador rolando as próprias rolagens na NET, pela janela de rolagem dele (hoje o mestre
  rola, com a Sorte preparada na ficha).

### Ciclo 56 (2026-10-15): o jogador rola na NET (o C8, parte 10; sessão KouArt)

O NET Architect da mesa (o `rolagens.mjs`: a rolagem do netrunner na janela de rolagem do computador do jogador; o
`rolarNetrunner` do `estado.mjs`: quem rola e o prazo; a configuração "O jogador rola as próprias rolagens", ligada de
partida). Commit anterior: `9e5309d` (ciclo 55).

- **Implementado:**
  - **a configuração "O jogador rola as rolagens da NET"** (padrão: ligada, como no NET Architect). Desligada, o mestre
    rola sempre, com a Sorte preparada na ficha (como até o ciclo 55);
  - **quem rola:** o motor pede ao dono do netrunner as ações que ele mesmo pediu (as habilidades de Interface, o ataque
    dos programas) e as reações (a velocidade contra o Black ICE, a defesa), também quando quem provocou foi o mestre (o
    ataque do inimigo). No computador dele abre a janela de rolagem (os modificadores e a Sorte; com "Rolar direto",
    rola direto), com o aviso do que é ("Hellhound no andar: role a velocidade…", "Hellhound ataca (8): role a
    defesa…"), e o cartão sai no nome do netrunner, pelo jogador. A ação que o mestre faz pelo netrunner, o mestre rola;
  - **a resposta:** na ação, cancelar a janela desfaz a ação ("Rolagem cancelada: nada aconteceu.", sem gastar a Ação
    NET). Sem resposta no prazo (o "Tempo para o jogador responder", mais 15 s), ou com a janela da reação fechada, o
    mestre rola, o registro avisa ("Jogador não rolou a tempo: o mestre rolou por …") e a janela do jogador fecha;
  - **o pedido** é o mesmo da esquiva e do Death Save (o `pedir` do `combate.mjs`, com o tratador "net"). As rolagens do
    ator passam a janela ao pedido (para o mestre fechá-la no fim do prazo) e aceitam as partes da situação (o Skunk no
    Slide), no jogador e no mestre;
  - **as regras sem o Foundry:** quem rola (`quemRolaNaNet`) e o que fazer com a resposta (`respostaDoJogador`).
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 79 de 83. Um teste novo: quem rola (desligada, o mestre; a ação do jogador, ele; a do mestre, o mestre; a reação
    que o mestre provoca, o dono conectado; desconectado ou sem dono, o mestre) e a resposta (o total, até o 0; a ação
    cancelada recusada; a reação fechada e o prazo vencido, o mestre rola, com a linha do registro). As 4 falhas são as
    das armas de 2077 (QUALITY_GATES);
  - G4: 88 de 93, cerca de 175 s. Um passo novo, nos dois navegadores, com a configuração ligada: a velocidade ao chegar
    ao Hellhound sai da janela do jogador (o cartão é dele; 13 contra 8); o Zap cancelado na janela não acontece (o
    aviso, nada no registro); o Zap com 2 de Sorte na janela (12 contra 5; a Sorte sai da ficha, 6 → 4); o ataque do
    Sword pela janela (12 contra 8); e a defesa contra o ataque que o mestre provoca, que o jogador não rola no prazo (o
    "Tempo para o jogador responder" em 10 s): o mestre rola (8 contra 13), o registro avisa e a janela do jogador fecha.
    Os passos da NET dos ciclos 51 a 55 rodam com a configuração desligada (o `montarNet`; o mestre rola, com os dados
    fixos no navegador dele), e a limpeza fecha a janela de rolagem que sobrar no jogador e religa a configuração. Duas
    rodadas: a primeira esperou quase 1 hora a mesa do servidor esvaziar e, ao começar, o mundo de teste não ficou pronto
    no navegador (como na primeira rodada do ciclo 55; a lição está no QUALITY_GATES); a segunda, sem mudança no código,
    passou. Os avisos do passo "nenhum aviso" foram conferidos: só os dois da Lexington. As 5 falhas são as das armas de
    2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - G3: a configuração desligada pedindo ao jogador; a ação do mestre indo para o dono; o dono desconectado recebendo o
      pedido; a ação cancelada seguindo; o total 0 valendo como sem resposta;
    - G4: a rolagem no jogador sem a janela de rolagem; a janela que não chega ao pedido (o mestre não a fecha no fim do
      prazo); a defesa que o mestre provoca sem ir para o jogador; o Skunk fora da rolagem do mestre (pega pelo passo do
      ciclo 53, que roda com a configuração desligada); o ataque do programa sem ir para o jogador; a ação cancelada no
      jogador seguindo (o passo cai com a linha vazia que ela deixa no registro).
- **Pendências:** os nós de controle ligados à cena; os arquivos copiados; o Scanner e a parede; o editor visual.
- **Próximo:** o pedido do usuário de 2026-10-15: a importação dos personagens da wiki no Foundry 12 e no 14 (cada um
  com o seu vínculo; o Foundry 14 confere se o ator está no mundo e importa de novo quando ele sumiu). A parte da wiki
  fica no master; a do sistema é o ciclo 57. Depois, o C8, parte 11: os nós de controle ligados à cena.

### Ciclo 57 (2026-10-15): a importação da wiki no Foundry 12 e no 14 (o pedido do usuário; sessão KouArt)

O pedido do usuário (2026-10-15): os personagens da wiki podem ser importados tanto no Foundry 12 quanto no 14, com a
conferência de que o personagem ainda está na mesa e a importação de novo quando precisar. As decisões dele: só a wiki e
o Foundry 14 mudam (o módulo cpr-2077 do 12 fica como está: não há Foundry 12 neste PC para testar de ponta a ponta), e
"Importar de novo" aparece quando o ator não está no mundo (com o ator lá, abre a ficha). A causa: a wiki guardava um
vínculo só por personagem, e importar no 14 tornava o ator do 12 um "ator antigo" (a ficha da mesa e as entregas dele
eram recusadas), e vice-versa. Commit anterior: `1970c40` (ciclo 56).

- **Implementado:**
  - **na wiki** (o `api-personagens.js`, o mesmo no master, que o usuário publica): cada Foundry com o seu vínculo. O do
    12 continua em `doc.foundry` (o módulo cpr-2077 grava sem mudar); o do 14 em `doc.foundry14` (o sistema manda
    `geracao: 14`). A ficha da mesa e as entregas dos pedidos valem dos atores ligados nos dois; de um terceiro, não (o
    "ator antigo" continua valendo dentro de cada Foundry: reimportar no 14 só troca o do 14). O 14 avisa quando o ator
    ligado é apagado (`removido`, com a data; o aviso de outro ator não muda nada). A wiki mostra um vínculo só (o do
    12, ou o do 14 para quem só foi para ele: conta como importado, com pedidos e a ficha travada) e, ao mestre, os dois
    à parte (`foundry12`, `foundry14`), que o jogador não vê. O jogador salvar a ficha mantém o vínculo do 14. O quadro
    "Levar para o Foundry" mostra ao mestre o ator de cada Foundry e o aviso do apagado;
  - **no sistema:** a importação (da criação e da mesa), a ficha da mesa e o aviso do ator apagado vão com
    `geracao: 14`. A janela "Personagens da wiki" diz onde o personagem está (neste mundo; o ator do Foundry 14
    apagado, ou em outro mundo; no Foundry 12; a ficha da mesa e de qual Foundry ela veio) e, sem o ator neste mundo,
    oferece "Importar" ou, se ele já esteve no 14, "Importar de novo".
- **Testes:**
  - G1: 0 erros;
  - G2: 0 erros;
  - G3: 79 de 83 (sem teste novo: a regra nova é da API da wiki, testada no cenário dela). As 4 falhas são as das armas
    de 2077 (QUALITY_GATES);
  - **wiki** (o cenário `contas`, aqui e no master): 36 de 36. Um passo novo: o 14 importa com `geracao: 14` sem tirar o
    12; a ficha da mesa vale dos dois atores, não de um terceiro; reimportar no 14 torna antigo só o ator velho do 14; o
    aviso do apagado de outro ator não muda nada, e o do ator ligado marca a data; o jogador não vê os vínculos à parte, e
    salvar a ficha mantém o do 14; o personagem só do 14 conta como importado e faz pedidos. O passo do "ator antigo"
    (dentro do 12) continua passando;
  - G4: 89 de 94, cerca de 170 s. Um passo novo: o Netrunner, cujo ator do 14 o passo anterior apagou, ligado a um ator
    do Foundry 12 (como o módulo cpr-2077 grava): a wiki guardou o apagado; a janela diz "O ator do Foundry 14 (…) foi
    apagado em … No Foundry 12: …" e oferece "Importar de novo"; importado, cada Foundry fica com o seu vínculo (o do 14
    sem o apagado), a ficha da mesa chega com o Foundry 14, e a ficha do ator do 12 ainda vale (a de um terceiro, não).
    Duas rodadas: na primeira, o passo leu o "importado" que o passo anterior deixou no alto da janela (a mesma janela) e
    não esperou o ator novo; ele passou a esperar o ator, e a segunda passou. Os avisos do passo "nenhum aviso" foram
    conferidos: só os dois da Lexington. As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **mutações:** cada uma destas derrubou o teste dela, e os arquivos foram restaurados (conferido pelo md5):
    - wiki: a ficha da mesa só do ator do 12; a geracao ignorada (o 14 por cima do 12); o aviso do apagado sem conferir o
      ator; o salvamento do jogador perdendo o vínculo do 14; o jogador vendo os vínculos à parte;
    - G4: o ator apagado sem avisar a wiki; o Foundry 14 gravando como o 12 (o vínculo do 12 por cima); a janela sem
      "Importar de novo"; a janela sem dizer que o ator do 14 foi apagado; a ficha da mesa sem o Foundry. A última
      precisou de quatro rodadas: na primeira, a mesa do servidor estava em uso, e o G4 pulou a parte do Foundry (5
      passos; não vale); nas duas seguintes, o mundo de teste não ficou pronto (a corrida dos endereços, abaixo); na
      quarta, depois da correção do `entrarComo`, ela caiu no passo dela.
  - **o mundo de teste que não ficava pronto** (o ajudante dos testes, `tests/lib/foundry14.js`): nos ciclos 55, 56 e 57
    o G4 caiu algumas vezes no começo. O `servidor.log` do Foundry de teste mostra a causa: o Foundry 14 aceita a entrada
    antes de saber os próprios endereços, e o envio do mundo cai em `Express.getInvitationLinks` ("reading 'local'"). O
    `subir` já esperava 2 s por isso, e nem sempre basta (aqui, três rodadas seguidas). O `entrarComo` passa a entrar de
    novo uma vez quando o mundo não ficou pronto e o log tem esse erro, e avisa no relatório; outro motivo, ou a segunda
    vez, derruba o passo como antes. A segunda entrada ainda não foi exercida (as rodadas depois da correção abriram de
    primeira). A lição está no QUALITY_GATES;
- **Pendências:** a parte da wiki está no master sem commit: o usuário publica (o `api-personagens.js`, o `criador.js`,
  o cenário `contas` e o README da wiki). Os nós de controle ligados à cena; os arquivos copiados; o Scanner e a parede;
  o editor visual.
- **Próximo:** o C8, parte 11: os nós de controle ligados à cena.

### Ciclo 58 (2026-10-15): o visual novo da janela da NET (o pedido do usuário; sessão KouArt)

O pedido do usuário (2026-10-15), antes de seguir os ciclos: atualizar o visual da ficha, dos cartões do chat e da
janela da NET pelas maquetes dele (`Exemplos/`, fora do git: os cartões do chat, as abas Combate, Equipamento,
Cyberware, Role, NET e Lifepath, as fichas dos itens e a "Net Exemplo"), e "trabalhar melhor no visual da NET: o exemplo
não cobre todas as funcionalidades e ainda pode ser melhorado visualmente". Este ciclo é a janela da NET; os cartões do
chat e a ficha vêm depois. Nenhuma regra mudou, e os textos e os ganchos que os testes leem continuam os mesmos. Commit
anterior: `023f2c1` (ciclo 57).

- **Implementado** (`templates/netrun/janela.hbs`, `scripts/netrun/janela.mjs` e `styles/tema.css`):
  - **o topo:** o selo da conexão (piscando; "MESTRE" na janela do mestre; "SEM CONEXÃO" sem netrunner), o nome do
    ponto, a arquitetura com o DV (para o mestre, também quantos andares), a desconexão insegura (antes, no fim das
    habilidades) e a faixa do netrunner: onde está, a Interface, a Sorte preparada e as Ações NET, com um losango por
    ação (em combate, aceso o que sobra; fora dele, só o contorno);
  - **os avisos** (o fogo com "Apagar o fogo", o Kraken, o Skunk e o Wisp), lado a lado, logo abaixo do topo;
  - **o mapa:** a maquete põe os andares em posições fixas, com os cabos num SVG; aqui é uma grade (uma linha por andar,
    uma coluna por ramo), que serve a qualquer arquitetura. O fundo quadriculado; em cada andar, "ANDAR 1A", a etiqueta
    do que manda nele (HOSTIL, SENHA, CONTROLE, ARQUIVO, LIVRE, LIMPO, SEM SINAL; para o mestre, OCULTO) e a cor dela, o
    ícone de cada conteúdo, a barra de REZ dos inimigos e a etiqueta de quem está ali; o brilho onde o netrunner está, o
    contorno dos vizinhos e do escolhido, e o inimigo ativo pulsando. Os cabos vão de cada andar até o andar de onde se
    chega (o `pai` da arquitetura): retos no mesmo ramo ou do ponto de acesso, em degrau quando vêm de um ramo à
    esquerda, e só a ponta quando o andar de cima não está no mapa (um buraco na numeração). Os dados correm por eles
    (mais rápido e em vermelho até o inimigo; parados e em cinza até o desconhecido);
  - **ao lado** (rola por dentro): quem está na NET, o painel do mestre (antes, embaixo de tudo), o andar escolhido
    (cada conteúdo com o ícone, a situação numa etiqueta e a barra de REZ) e o deck (o "ATIVO" do programa ativo, o
    "Atacar" em vermelho);
  - **embaixo:** as habilidades de Interface numa grade de 4, cada uma com o ícone e a base da rolagem, que é a soma das
    partes que a rolagem usa (`partesDaInterface`, e o Skunk no Slide, como o `penalidadeDoSkunk`); o Zap e o Slide em
    vermelho. O registro, como um terminal: a hora de cada linha (do `t` que o estado já guardava), o cursor na mais
    nova e a cor das linhas do Black ICE (`ice`), das que passam (`ok`) e das que falham (`falha`);
  - **a janela:** 1060 × 780 (antes, 780 de largura e a altura do conteúdo); o mapa, o painel e o registro rolam por
    dentro, e o Foundry guarda a rolagem dos três. Estreita (menos de 860 px, por container query), fica tudo numa
    coluna. Com "reduzir movimento" no sistema, nada se anima. As regras do `.mapa-net` que a janela dividia com a ficha
    da arquitetura ficam só na ficha (que não mudou);
  - **os textos que os testes leem** não mudaram: os rótulos novos vêm do CSS (`::before`, `attr()`) ou de elementos
    vazios (os ícones, os losangos, as barras), e a hora vai no `data-hora` da linha (a lição está no QUALITY_GATES).
- **Testes:**
  - G1: 47 arquivos, 0 erros;
  - G2: 0 erros;
  - G3: 79 de 83 (sem teste novo: não há regra nova; a janela se testa no G4). As 4 falhas são as das armas de 2077
    (QUALITY_GATES);
  - G4: 89 de 94, de 170 a 205 s, em cinco rodadas: as duas primeiras com o visual antes dos testes novos, a terceira e a
    quarta com eles (a quarta, com a base do Slide e o painel do mestre no alto), e a quinta com o ajudante do Edge
    corrigido (abaixo), sem deixar Edge nem perfil para trás. Os avisos do passo "nenhum aviso" foram conferidos: só os
    dois da Lexington. Os passos da NET ganharam o visual: no do andar, a classe do andar (a senha, o netrunner ali, o cabo
    reto; depois do Backdoor, limpo), o cabo em degrau do 3B (do 2A, um salto), a base do Backdoor (1d10+4), as Ações NET
    livres fora de combate, a hora no registro e a fonte do botão de fechar da janela (o Font Awesome); no das Ações NET
    em combate, os losangos (um aceso depois do Virus, nenhum depois do Cloak, os três na rodada seguinte); no dos
    ataques, a base do Slide com o Skunk (1d10+2). As 5 falhas são as das armas de 2077 (QUALITY_GATES);
  - **as capturas** dos passos da NET (a janela do jogador, a do mestre, os avisos, o deck) foram conferidas a cada
    rodada. Entre as rodadas, uma prévia estática (o template com contextos de exemplo, o tema e o Font Awesome do
    Foundry, capturada pelo Edge sem janela, fora do repositório) serviu para ajustar o visual: ela mostrou o rodapé fora
    do lugar sem avisos e a janela estreita; o G4 mostrou os botões do cabeçalho;
  - **mutações:** cada uma destas derrubou um passo do G4, e os arquivos voltaram (conferido pelo md5): o andar sem a cor
    do que manda nele (M1); o cabo sempre reto (M2); a base sem a Interface (M3); os losangos que não apagam as Ações NET
    gastas (M4); a hora no texto da linha do registro (M5: caem o passo do ponto de acesso e o do andar, que leem a linha
    exata); a regra dos botões do tema valendo para o cabeçalho da janela (M6); os avisos que não aparecem (M7); o texto
    das Ações NET colado nos losangos (M8b); a base do Slide sem o Skunk (M9). A M8 tirava só um dos dois espaços entre
    "Ações NET:" e a frase, e o texto lido não mudava (uma mutação equivalente, não um buraco no teste): ela passou, e a
    M8b, que cola de verdade, caiu. Na rodada da M3 caiu também, fora da NET, o passo da esquiva do jogador (a barra de
    tempo da janela de defesa não foi lida); não se repetiu nas outras nove rodadas. A primeira rodada da M5 foi parada
    com o disco cheio (abaixo) e não vale; a M5 foi feita de novo e caiu.
- **Corrigido no caminho:**
  - os botões do cabeçalho da janela (fechar, o menu) sem os ícones ("▯"): a regra de botão do tema valia para a janela
    inteira, e o ícone deles é a fonte do próprio botão. As regras de botão e de campo ficam no corpo da janela, e o G4
    confere;
  - sem avisos, o meio caía na faixa do tamanho do conteúdo e o rodapé saía da janela (a grade contava as faixas pela
    ordem dos filhos): as faixas agora têm nome;
  - o `tema.css` perdeu o CRLF num `sed -i` do Git Bash e voltou (a lição está no QUALITY_GATES);
  - **o disco cheio e o Edge dos testes que não fechava** (`tests/lib/edge.js`): no meio das mutações, o disco do PC
    chegou a 0 bytes livres. A causa: o `fechar()` matava só o `msedge.exe` lançado, que já tinha passado o navegador
    para outro processo, e cada rodada (do G4, das mutações, da suíte da wiki) deixava os Edges abertos e os perfis em
    `%TEMP%\wiki-testes-edge-*`, crescendo: 49 perfis e 427 processos, uns 13 GB. A rodada da M5 foi parada (o arquivo
    mutado voltou à mão, pelo md5), só os processos com o perfil dos testes foram fechados (o Edge do usuário ficou), e
    os perfis foram apagados (dados descartáveis dos testes): 18,6 GB livres. O `fechar()` agora fecha pelo
    `Browser.close` do protocolo, mata o que ainda tiver o perfil na linha de comando e apaga o perfil tentando de novo;
    três aberturas com o ajudante antigo deixaram 47 processos e 3 perfis, com o novo, nenhum. A primeira tentativa (o
    `taskkill /T` no processo lançado) não bastava: cinco rodadas deixaram 90 processos. O master tem o mesmo
    `tests/lib/edge.js` (a suíte da wiki vaza igual): o arquivo corrigido fica no master sem commit, para o usuário
    publicar.
- **Pendências:** os cartões do chat e a ficha (as abas e as fichas dos itens), pelas maquetes. O `tests/lib/edge.js`
  corrigido no master (o usuário publica). Depois, o C8, parte 11: os nós de controle ligados à cena.
- **Próximo:** os cartões do chat no visual novo (ciclo 59).

### Ciclo 59 (2026-10-15): os cartões do chat no visual novo (o pedido do usuário; sessão KouArt)

A segunda parte do pedido de 2026-10-15 (ver o ciclo 58): os cartões do chat pela maquete "Chat Cards" do usuário. Os
textos e os ganchos que os testes leem continuam os mesmos (as partes, o título, a regra, o texto inteiro do Backup e do
dano da NET, as classes `cprf-` da mensagem). Commit anterior: `e7d11fa` (ciclo 58).

- **Implementado:**
  - **a mensagem é o cartão** (`styles/tema.css`, a seção dos cartões do chat refeita): o painel com o canto cortado e a
    faixa de cima na cor do tipo, num elemento à parte (a cor do jogador que o Foundry põe na borda não a troca). O tipo
    vem do cartão dentro da mensagem (`:has`) e o rótulo dele é do CSS: TESTE (amarelo), ATAQUE e DEFESA (os testes do
    ataque e da esquiva), NET (o teste da Interface e o dos inimigos da NET), RESULTADO, DANO, DANO NET, LESÃO e MORTE
    (vermelho), BACKUP e DEATH SAVE (ciano; o Backup que não vem e o Death Save que falha mudam de cor), DEFESA (a
    espera, cinza) e SISTEMA. Na linha de cima, o tipo e quem rolou ("TESTE // ATIRADORA"), com a hora;
  - **o corpo** (a ordem é do CSS, sem mudar o HTML): o título grande; o que soma ao d10 como subtítulo ("1D10 · REF +8 ·
    ARMAS DE UMA MÃO +4"); os dados; o crítico numa etiqueta; a frase do Death Save e do Backup na linha de baixo; a regra
    (o sabor); as notas; os botões;
  - **os dados em caixas** (`scripts/dados-do-cartao.mjs`, novo, sem Foundry: o G3 o importa), no lugar do bloco de
    rolagem do Foundry (a fórmula e a lista que abre no clique): cada dado numa caixa, o que soma além dos dados e o
    total grande. O 10 do crítico em amarelo; o 1 da falha crítica e o d10 que ele tira, em vermelho, com o menos (RED p.
    130, como o `registrarCritico` monta); no dano crítico, os 6 em amarelo; o × do autofogo, com o modificador depois
    dele (como o `expressaoDoDano`). O Death Save, a tabela da lesão e o Backup não marcam o crítico; o Backup mostra o
    d10 e o d6 lado a lado, sem total. O Roll continua na mensagem (`rolls`);
  - **o tipo do teste** (`testar`, a `categoria`): o ataque e a esquiva (`combate.mjs`) e os números dos inimigos da NET
    (`rolarDaNet`) dizem o tipo; sem ele, é da NET o teste de quem não é ator e o da Interface. O dano do Zap, do Black
    ICE, dos programas e o do motor da NET levam a marca da NET;
  - **o resultado do ataque:** o total do ataque grande, cada alvo com a etiqueta do que aconteceu (acertou cheia em
    vermelho; esquivou e ficou firme em ciano; o resto em cinza) e a barra de HP depois do dano (o HP do alvo sobre o
    máximo, só o desenho). O ataque desfeito fica desbotado, com "DESFEITO".
- **Fora, de propósito:** os botões da maquete que o sistema não tem ("+ LUCK", "REROLL", "ADD TO TRACKER", "APPLY
  DAMAGE", "ROLL CRITICAL", "APPLY"): a Sorte se prepara na ficha antes do teste, e o dano, a lesão e a iniciativa já
  entram pelo fluxo do ataque e pelo combate. Ficam como pergunta ao usuário, se ele quiser algum deles.
- **Testes:**
  - G1: 49 arquivos, 0 erros (com o `dados-do-cartao.mjs` e o `cartoes.test.mjs`);
  - G2: 0 erros;
  - G3: 83 de 87. Um arquivo novo, `tests/sistema/cartoes.test.mjs`, com 4 testes de referência dos dados (o teste
    comum, o crítico e a falha crítica do d10, sem o crítico, os 6 do dano crítico, o × do autofogo com o modificador, o
    Backup com dois Rolls e os dados descartados). As 4 falhas são as das armas de 2077 (QUALITY_GATES);
  - G4: 89 de 94, 170 s, de primeira. O passo da Sorte e do chat ganhou o visual: no cartão do teste e no do dano, os
    dados das caixas iguais aos do Roll, o total do cartão, o rótulo do tipo na linha de cima ("TESTE // ", "DANO // ",
    lido do `::before`), a faixa amarela e a vermelha e nenhum bloco de rolagem do Foundry. Os outros passos que leem os
    cartões (as partes, a regra, o texto do Backup e do dano da NET) passaram sem mudança. Os avisos do passo "nenhum
    aviso": só os dois da Lexington. As 5 falhas são as das armas de 2077;
  - **a captura do chat** do G4 foi conferida, e uma prévia estática (os templates com 14 cartões de exemplo, o tema e o
    CSS do Foundry) serviu para ajustar antes: ela mostrou o dado do crítico indo para depois do total (a classe da
    caixa batia com a do `p.critico`; as caixas passaram a usar `maximo` e `minimo`);
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5). No G3 (os testes de referência dos dados):
    sem as marcas do crítico (C1), sem o total (C2), o sinal do resto trocado (C3), o × do autofogo fora do resto (C8).
    No G4 (o passo da Sorte e do chat): o teste de volta ao bloco de rolagem do Foundry (C4), o tipo sem o rótulo na
    linha de cima (C5), o dano sem a cor e o rótulo dele (C6), o dano da arma de volta ao bloco do Foundry (C7). As
    rodadas do G4 não deixaram Edge nem perfil para trás (o ajudante corrigido no ciclo 58).
- **Pendências:** a ficha (as abas Combate, Equipamento, Cyberware, Role, NET e Vida, e as fichas dos itens), pelas
  maquetes. Os botões da maquete do chat, se o usuário quiser. Depois, o C8, parte 11: os nós de controle ligados à
  cena.
- **Próximo:** a ficha no visual novo (ciclo 60).

### Ciclo 60 (2026-10-15): a ficha no visual novo, parte 1: Combate, Equipamento e Cyberware (o pedido do usuário; sessão KouArt)

A terceira parte do pedido de 2026-10-15 (ver o ciclo 58): a ficha pelas maquetes "Fight Tab", "Gear Tab" e "Cyberware
Tab". O cabeçalho e as abas já estavam no visual das maquetes desde o ciclo 19 (o "Modelo de ficha" da mesa); o que as
maquetes mudam é a organização de cada aba: à esquerda, a coluna dos números (os painéis de resumo, com o número
principal em grande); à direita, as listas e as tabelas. A aba Perícias (o painel geral) não tem maquete e não mudou.
Commit anterior: `f8bd09a` (ciclo 59).

- **Implementado** (`templates/personagem/combate.hbs`, `equipamento.hbs`, `cyberware.hbs` e `styles/tema.css`):
  - **a grade das abas** (`.aba-colunas`): a coluna dos números com 290 px e o conteúdo ao lado; estreita (menos de 700
    px), uma coluna só. O número grande (`.numero-grande`) e o painel ciano;
  - **Combate:** à esquerda, a Iniciativa em grande (com a conta na dica), os vitais (o HP com a barra, o limite de
    gravemente ferido, a penalidade, o Death Save com o "zerar", o MOVE e o estado) e a defesa (a esquiva e o Facedown);
    à direita, as armas (a mesma tabela), a armadura vestida, as lesões críticas (as mesmas do painel geral, com o
    paliativo, o tratamento e "Tratada", que a maquete põe aqui) e a munição. O nome da arma ganhou largura mínima na
    tabela (na coluna mais estreita, o ícone ficava sozinho numa linha);
  - **Equipamento:** à esquerda, os Eurodólares em grande, com o extrato e as últimas mudanças, e a munição (a
    quantidade numa linha só); à direita, armas, armaduras, equipamento, roupas, drogas, upgrades e veículos;
  - **Cyberware:** à esquerda, a Humanidade em grande, com a barra e o EMP de agora e o de base; à direita, as peças.
  - Os ganchos que os testes usam (as linhas das armas, o Facedown, as listas do Equipamento, o histórico do extrato)
    continuam os mesmos, dentro da mesma aba.
- **Fora, de propósito (perguntas ao usuário):** as maquetes mostram coisas que o sistema não tem: "Roll initiative" na
  ficha (a iniciativa rola pelo combate do Foundry), o local do acerto (Head, Body, Random), as ações Take Cover e
  Grapple, "Fix" na lesão, "Luck used" no cabeçalho (a ficha mostra a Sorte que resta), quantidade com − e + e "Use" no
  equipamento, a hierarquia de fundação e opções no cyberware e "+ Foundation / + Option", e as notas de ciberpsicose.
  Nada disso foi inventado; cada um vira um item se o usuário quiser.
- **Testes:**
  - G1, G2 e G3: sem mudança de código JS (os templates e o CSS); G3 continua em 83 de 87;
  - G4: 89 de 94, de 170 a 171 s, em quatro rodadas: a primeira só com a Combate; a segunda com a Equipamento; a terceira
    com a Cyberware e as checagens novas; a quarta com a grade e a munição numa linha só. O passo da ficha nova (a do
    Solo importado) ganhou a ficha nas abas novas: a Iniciativa, o dinheiro e a Humanidade em grande iguais aos do ator,
    os três painéis da coluna dos números da aba Combate, todas as armas na tabela, o painel das lesões, a munição e o
    cyberware nas colunas certas e a grade (a coluna dos números com 290 px). As capturas das abas (agora também a
    Cyberware) foram conferidas. As 5 falhas são as das armas de 2077, e os avisos do passo "nenhum aviso", só os dois
    da Lexington. Depois da última rodada, só a descrição desse passo mudou: ela tinha ido, por engano, para o passo da
    importação (as mutações mostraram onde as checagens estão);
  - **mutações:** as 7 derrubaram o passo da ficha nova, e os arquivos voltaram (conferido pelo md5): a Iniciativa sem
    o número grande (F1), o dinheiro grande mostrando o IP (F2), a aba Combate sem as lesões (F3), a aba Equipamento sem
    a coluna dos números (F4), a Humanidade grande mostrando o EMP (F5), a grade desfeita no CSS (F6) e o cyberware fora
    da coluna do conteúdo (F7). Nenhuma rodada deixou Edge nem perfil para trás.
- **Pendências:** a ficha, parte 2 (as abas Role, NET e Vida, e as fichas dos itens); as perguntas acima; os botões da
  maquete do chat (ciclo 59). Depois, o C8, parte 11: os nós de controle ligados à cena.
- **Próximo:** a ficha, parte 2 (ciclo 61).

### Ciclo 61 (2026-10-15): a ficha no visual novo, parte 2: Role, NET e Vida (o pedido do usuário; sessão KouArt)

As maquetes "Role Tab", "Net Tab" e "Lifepath Tab", no mesmo padrão do ciclo 60. Commit anterior: `dbc1261` (ciclo 60).

- **Implementado** (`templates/personagem/role.hbs`, `net.hbs`, `vida.hbs`, `scripts/ficha-personagem.mjs` e
  `styles/tema.css`):
  - **Role:** à esquerda, a Role em grande (o nome e a habilidade, o Rank, os pontos distribuídos, o resumo e os botões
    da habilidade) e o bônus nas perícias; à direita, as especialidades e as outras habilidades. Cada especialidade
    mostra os pontos também em caixas, até o máximo do Rank (só o desenho; o número continua no campo, editável). A Role
    sem especialidades diz isso na coluna do conteúdo;
  - **NET:** à esquerda, a Interface em grande (o Rank; "—" para quem não é Netrunner), as Ações NET por turno e o deck
    equipado, e os cyberdecks; à direita, as habilidades de Interface em cartões (o nome, o valor sem o dado e o custo;
    o 1d6 do Zap no canto) e os programas;
  - **Vida:** o Lifepath em cinco painéis (as origens, os valores, a família, as metas e as pessoas, e o Lifepath da
    Role, largo), com os 17 campos de sempre (`GRUPOS_DO_LIFEPATH`, na ficha), e as notas. A grade antiga do Lifepath
    (um painel só) saiu do CSS.
  - **No teste,** o seletor do painel das especialidades da Role era a posição (`.painel:nth-of-type(2)`) e passou a ser
    a classe dele (`.painel.especialidades`): com as duas colunas, a posição mudou. O teste lê o mesmo título e confere
    o mesmo.
- **Fora, de propósito:** o que as maquetes destas abas mostram e o sistema não tem (as notas de Role, "Jack in" e
  "Jack out", os slots do deck em barras, a arquitetura ao vivo na aba NET, o estado de cada programa, "Run") ficou de
  fora, como as outras perguntas (ver as dúvidas).
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 89 de 94, 170 s, de primeira. O passo da ficha nova ganhou a Role (o nome na coluna dos números, as 6
    especialidades com as caixas iguais ao número de cada campo) e a Vida (os campos nos cinco painéis: 5, 4, 3, 4 e
    1); o da Interface do Netrunner, a Interface em grande (4) e os 11 cartões das habilidades na coluna do conteúdo. As
    5 falhas são as das armas de 2077, e os avisos do passo "nenhum aviso", só os dois da Lexington. As capturas das
    abas foram conferidas;
  - **mutações:** as 6 caíram, e os arquivos voltaram (conferido pelo md5). No passo da ficha nova: as especialidades
    sem a classe do painel (R1), as caixas sem os pontos (R2), a Vida sem um campo nos valores (R3) e a Role fora da
    coluna dos números (R6); no da Interface: a Interface grande mostrando as Ações NET (R4) e as habilidades fora da
    coluna do conteúdo (R5). Nenhuma rodada deixou Edge nem perfil para trás.
- **Pendências:** as fichas dos itens (a maquete "Item Sheets"); as perguntas das maquetes (ver as dúvidas). Depois, o
  C8, parte 11: os nós de controle ligados à cena.
- **Próximo:** as fichas dos itens (ciclo 62).

### Ciclo 62 (2026-10-15): as fichas dos itens no visual novo (o pedido do usuário; sessão KouArt)

A última parte do pedido de 2026-10-15: a maquete "Item Sheets". Commit anterior: `bea6c77` (ciclo 61).

- **Implementado** (`templates/item.hbs`, `scripts/ficha-item.mjs` e `styles/tema.css`; a ficha da arquitetura, com o
  mapa, não mudou):
  - **no alto:** o tipo na cor dele (vermelho na arma e na lesão; ciano no cyberware, no programa e no cyberdeck;
    amarelo no resto) e "FICHA DO ITEM"; o retrato, o nome, o resumo do item por tipo (`cabecalhoDoItem`: a perícia e o
    alcance da arma, o SP da armadura, o tipo e a perda de Humanidade do cyberware, a classe do programa e onde ele
    está...) e as etiquetas (a qualidade, a penalidade, o uso; cheias, as que valem agora: equipado, vestido,
    instalado, ativo);
  - **as abas** Detalhes, Descrição e Efeitos (as abas do `ApplicationV2`, `TABS`): os campos em células (o rótulo
    pequeno em cima, o valor grande embaixo, a borda na cor do tipo), os de marcar em caixas, e o uso (equipamento,
    roupa, droga, cyberdeck) em três botões lado a lado, no lugar da lista (grava igual, `system.uso`);
  - os campos e os botões que os testes usam continuam os mesmos, pelo `name` e pela ação.
- **Fora, de propósito:** os botões da maquete que a ficha do item não tem ("Attack", "Reload", "Repair", "Ablate",
  "Install option", "Roll humanity", "Run", "Reset REZ", "Use", "Drop", "Quick fix", "Treat"), os "hits taken" e a trilha
  do SP da armadura: o ataque, a recarga, a REZ e a instalação ficam na ficha do personagem. Ver as dúvidas.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 90 de 95, 171 s, de primeira (95 passos com o novo). As 5 falhas são as das armas de 2077, e os avisos do passo
    "nenhum aviso", só os dois da Lexington. Um passo novo, a ficha do item no jeito da maquete: numa pistola do catálogo, o tipo traduzido e na cor
    da arma, o resumo ("Armas de uma Mão // à distância", do catálogo), a etiqueta da qualidade ("Padrão"), as três abas
    com os Detalhes abertos, as células, e a troca para a Descrição pelo clique (os Detalhes somem); num cyberdeck, a cor
    dele, os três botões do uso e a troca pelo clique, que grava no item. As capturas das duas fichas foram
    conferidas;
  - **mutações:** as 6 derrubaram o passo da ficha do item, e os arquivos voltaram (conferido pelo md5): a ficha abrindo
    na Descrição (I1), a arma sem a cor dela (I2), o resumo da arma sem o alcance (I3), o uso com o nome errado, que não
    grava (I4), a etiqueta da qualidade sumindo (I5) e o tipo sem o rótulo traduzido (I6). Nenhuma rodada deixou Edge
    nem perfil para trás.
- **Pendências:** as perguntas das maquetes (ver as dúvidas). Com isto, o pedido do visual novo está feito; volta o C8,
  parte 11: os nós de controle ligados à cena.
- **Próximo:** o C8, parte 11 (ciclo 63).

### Ciclo 63 (2026-10-15): as funções das maquetes viram itens do ROADMAP (a decisão do usuário; sessão KouArt)

A resposta do usuário à dúvida das maquetes (2026-10-15): "cada um vira um item". Ciclo só de documentação. Commit
anterior: `c254a97` (ciclo 62).

- **Feito:** no ROADMAP, o item "As funções das maquetes que o sistema não tem", com 19 itens em três grupos (o chat,
  a ficha e a ficha do item), cada um marcado com o que precisa: só a interface (a ficha ou o cartão chamando o que o
  sistema já faz), a regra da wiki que ele segue (agarrar, p. 177; a cobertura, p. 182; a correção rápida da lesão, DV
  13; a tabela da lesão, p. 187) ou a decisão da mesa (a Sorte depois de rolar e o local aleatório do acerto, que
  contrariam a wiki; "rolar de novo", que o RED não tem). Duas regras ainda a conferir na wiki antes do ciclo delas: os
  slots de opção do cyberware e o conserto da armadura. A dúvida passou a "decidido".
- **Testes:** sem código. G1, G2 e G3 sem mudança (49 arquivos, 0 erros; 83 de 87); G4 e mutações não se aplicam.
- **Pendências:** a decisão da mesa nos itens que contrariam a wiki; os itens, um por ciclo.
- **Próximo:** o C8, parte 11 (os nós de controle ligados à cena), ou os itens das maquetes, na ordem que o usuário
  preferir; sem outra indicação, os itens das maquetes de interface primeiro (o fim do pedido do visual), começando
  por "Aplicar dano" e "Rolar a lesão" no cartão do dano.

### Ciclo 64 (2026-10-15): "Aplicar dano" e "Rolar a lesão" no cartão do dano (as maquetes; sessão KouArt)

As decisões do usuário (2026-10-15) nos itens que contrariavam a wiki: a Sorte só antes de rolar, o acerto no corpo (a
cabeça só pelo tiro mirado) e sem "rolar de novo"; os três não entram (o ROADMAP e as dúvidas dizem). Ele pediu também
conferir na wiki os slots de opção do cyberware (estão no `system-catalog.js`) e o conserto da armadura (só "até ser
reparada", p. 186: a proposta do botão espera ele). E os dois primeiros itens das maquetes. Commit anterior: `93040ce`
(ciclo 63).

- **Implementado:**
  - **o dano rolado à parte** (o botão "Dano" da ficha; `rolagens.rolarDano` com `paraAplicar`, que só a ficha usa: o
    dano rolado dentro do ataque não ganha os botões, porque o ataque já aplica): o cartão guarda o dano
    (`danoDeArma`) e tem os botões do mestre (o `dano.hbs` aceita a ação de cada botão);
  - **"Aplicar dano"** (`combate.aplicarDanoDoCartao`): nos alvos marcados (T) que têm HP, no corpo (a cabeça só pelo
    tiro mirado, a decisão do usuário), pelo mesmo `ferir` do ataque (a armadura, a ablação da munição, o +5 do
    crítico, a Deflexão do Solo, a borracha, o mortalmente ferido); o resultado sai no cartão do ataque ("15 de dano,
    no corpo", sem o total do ataque), com o "Desfazer". No crítico, a lesão não sai sozinha: o cartão avisa do botão;
  - **"Rolar a lesão"** (`combate.rolarLesaoDoCartao`, só no dano crítico): a tabela do corpo (p. 187) em cada alvo
    marcado, pela configuração "Lesão crítica" (desligada, avisa); uma vez por alvo naquele cartão (o cartão guarda
    quem já rolou, e o segundo clique avisa).
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 91 de 96, de primeira (181 s; a mesa do servidor estava em uso, e o G4 esperou 2 minutos), e de novo depois da
    limpeza no passo (abaixo), 197 s. A segunda rodada pode ter levado o botão da iniciativa do ciclo 65, que entrou e
    saiu da worktree enquanto ela copiava o sistema: é aditivo, e nenhum passo o usa. As 5 falhas são as das armas de
    2077, e os avisos do passo "nenhum aviso", só os dois da Lexington. Um passo novo, depois do "Desfazer" do ataque: sem crítico (3 × 5 = 15 contra SP 11), o cartão só com
    "Aplicar dano", o alvo de 45 para 41 HP e de 11 para 10 de SP, o cartão do resultado ("15 de dano, no corpo",
    acertou, 4 no corpo) e o "Desfazer" que devolve os dois; no crítico (6, 6, 2, 3, 4 = 21), os dois botões, 45 → 30
    HP (passam 10 e os +5) sem lesão e com o aviso no cartão, "Rolar a lesão" com 4 + 4 = 8 (Perna quebrada, a mesma
    tabela do passo do tiro) e o segundo clique recusado;
  - **mutações:** as 6 caíram no passo novo, e os arquivos voltaram (conferido pelo md5): o cartão sem os botões (D1),
    o dano aplicado na cabeça (D2), o crítico aplicado rolando a lesão sozinho (D3), a lesão rolando de novo no mesmo
    alvo (D4), o botão "Aplicar dano" sem efeito (D5) e o +5 do crítico fora do dano aplicado (D6). Duas correções no
    caminho:
    - **a D6 não valeu da primeira vez:** a mesa do servidor ficou ocupada entre uma mutação e outra, e o G4 pulou a
      parte do Foundry (5 passos, saída 0, como se a mutação passasse). Foi refeita com a mesa livre e caiu. O executor
      das mutações agora espera a mesa antes de cada uma e marca como inválida a rodada que pulou o Foundry (a lição
      está no QUALITY_GATES);
    - **o passo não se limpava quando falhava:** na D1 e na D5, o Alvo ficou marcado (T) e ferido, e três passos
      seguintes caíram junto (o fogo supressivo e os turnos). A limpeza (o HP, o SP, a lesão e a marca) foi para um
      `finally`; a D1 refeita derrubou só o passo dela.
  - Nenhuma rodada deixou Edge nem perfil para trás.
- **No master:** o usuário publicou o `tests/lib/edge.js` corrigido (`9ad764b`, a pendência do ciclo 58).
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura (o botão voltar
  o SP ao máximo).
- **Próximo:** os itens das maquetes de interface (ciclo 65).

### Ciclo 65 (2026-10-15): "Rolar iniciativa" na ficha (as maquetes; sessão KouArt)

Os itens "Rolar a iniciativa" (a ficha) e "Adicionar ao combate" (o cartão) das maquetes. Commit anterior: `ddda6ce`
(ciclo 64).

- **Implementado:**
  - **"Rolar iniciativa"** no painel da Iniciativa da aba Combate (`ficha-personagem.mjs`, `#rolarIniciativa`): o
    `Actor#rollInitiative` do Foundry 14 com `createCombatants`, que entra no combate (o do mestre cria um na cena, se
    não houver; o jogador dono do ator entra no combate que existe, pela permissão do Foundry, e sem combate recebe o
    aviso dele) e rola na fila, pela iniciativa do sistema (`iniciativa.mjs`: a janela dos situacionais, como o
    Sandevistan, e a Sorte). Quem já tem iniciativa naquele combate não rola de novo (o aviso diz o valor): o RED rola
    a iniciativa uma vez, no começo do combate;
  - **"Adicionar ao combate"** fica coberto por ele: a rolagem cai direto na fila, e não sobra uma iniciativa solta no
    chat para adicionar;
  - **o cartão do resultado** mostra "Ataque" só quando há o total do ataque (`ne ataque null`): no ciclo 64, o
    `{{#if ataque}}` esconderia um ataque de total 0 (possível com o −8 do mirado). Sem teste: nenhum passo chega a
    um ataque de total 0.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 92 de 97, 198 s, de primeira. As 5 falhas são as das armas de 2077, e os avisos do passo "nenhum aviso", só os
    dois da Lexington. Um passo novo, depois do dano rolado à parte: na ficha do Alvo (REF 6, sem situacionais de
    iniciativa), sem combate, o botão cria o combate na cena, põe o token na fila e rola 6 + 7 = 13; o segundo clique
    avisa "Alvo já tem iniciativa 13 neste combate." sem rolar nem pôr outro na fila; o combate criado sai no fim;
  - **mutações:** as 3 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5; o executor novo esperou
    a mesa antes de cada uma): o botão sem a ação (N1), a rolagem sem pôr o ator na fila (N2) e sem a conferência de
    quem já rolou (N3). Na N2, o combate criado sem combatente ficou no mundo de teste (o `finally` do passo só apagava
    o combate que tinha lido); não derrubou nada, e a limpeza foi corrigida no ciclo 66. Nenhuma rodada deixou Edge nem
    perfil para trás.
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura.
- **Próximo:** a Sorte usada na sessão, no cabeçalho (ciclo 66).

### Ciclo 66 (2026-10-16): a Sorte usada na sessão, no cabeçalho (as maquetes; sessão KouArt)

O item "Luck used" das maquetes. Commit anterior: `3de6383` (ciclo 65).

- **Implementado** (`templates/personagem/topo.hbs`, `scripts/ficha-personagem.mjs`, `styles/tema.css`): no
  indicador da Sorte, embaixo do rótulo, "USADA n": o máximo (o LUCK) menos a que resta, sem dado novo na ficha (a
  ficha guarda a que resta, e o ↺ do começo da sessão a devolve ao máximo, zerando a usada). Amarela quando já se
  gastou alguma.
- **No teste do ciclo 65:** o passo da iniciativa apaga o combate que o botão criou também quando falha antes de lê-lo
  (a sobra da mutação N2).
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 92 de 97, 179 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). O
    passo da Sorte e do chat lê a usada: 1 no começo (a Atiradora com 5 de 6), 3 depois do teste com os
    2 pontos preparados (amarela) e 0 depois do ↺ (sem a cor);
  - **mutações:** as 3 derrubaram só o passo da Sorte, e os arquivos voltaram (conferido pelo md5): a usada mostrando
    a que resta (U1), sem a cor de gasta (U2) e fora do cabeçalho (U3). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura.
- **Próximo:** a quantidade com − e + no inventário (ciclo 67).

### Ciclo 67 (2026-10-16): a quantidade com − e + no inventário (as maquetes; sessão KouArt)

O item "a quantidade com − e + e Usar" das maquetes, só a quantidade. Commit anterior: `0772b53` (ciclo 66).

- **Implementado** (`scripts/ficha-personagem.mjs`, `templates/personagem/equipamento.hbs`, `styles/tema.css`): nas
  linhas do inventário da aba Equipamento (equipamento, roupas e drogas), o controle com − e + e o número (nas drogas,
  as doses, na dica). Muda de 1 em 1, sem passar de 0 (o item fica na ficha, com 0). Quem segura o 0 é o modelo: o
  campo tem `min: 0`, e o Foundry 14 corta no mínimo ao limpar os dados (`NumberField._cleanType`), sem erro. A
  primeira versão tinha também um `Math.max(0, …)` na ficha, que repetia o modelo, e saiu.
- **A mutação do piso que sobrevivia** (três rodadas) ensinou duas coisas. Primeiro, o código do Foundry: a guarda da
  ficha repetia o `min: 0` do modelo (tirá-la não muda nada). Segundo, o meu teste: no clique do − com a quantidade já
  em 0, ele esperava "a quantidade é 0", que já era verdade antes de a mudança chegar, e lia o 0 antigo; nem tirar o
  `min: 0` do modelo ele via. O passo agora clica, espera a mudança assentar e só então lê o item e a ficha. A quantidade saiu do detalhe da
  linha (o "×2" do equipamento e da roupa, o "1 dose" da droga), que agora repetiria o controle.
- **O "Usar" separado:** a marca do ROADMAP estava errada. O "Usar" da droga não é só interface: a wiki manda rolar, ao
  tomar, WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário (falhar dá o efeito secundário e o
  vício), e algumas custam Humanidade (o Black Lace, 2d6); doses a mais estendem o primário. Virou um item de regra. O
  "Usar" do equipamento de ativação à mão ficou num item próprio (nenhum dos 46 do catálogo tem efeito; vale para os
  feitos à mão).
- **No teste:** o passo do inventário lia o detalhe da droga ("Boost | 1 dose | Carregando"); com a quantidade fora do
  detalhe, as linhas leem também o controle ("Boost |  | 1 | Carregando"), e as quatro linhas conferem o 1. O mesmo
  passo ganhou o − e o + no Boost: 1 → 2 → 1 → 0, e o − no 0 não desce (no item e na ficha, lidos depois de a mudança
  assentar) nem dá erro (nenhuma promessa rejeitada na página).
- **Corrigido no caminho:** um `sed -i` para trocar uma palavra no nome do passo tirou o CRLF do `v14.js` inteiro (o
  tropeço do ciclo 58, de novo); o CRLF voltou em todas as linhas e o diff ficou só com as do ciclo. A lição no
  QUALITY_GATES ficou mais forte: nada de `sed -i` na worktree.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 92 de 97 nas quatro rodadas (177 a 183 s), a última com o passo final. As 5 falhas são as das armas de 2077, e
    os avisos do passo "nenhum aviso", só os dois da Lexington;
  - **mutações:** as 3 derrubaram o passo do inventário, e os arquivos voltaram (conferido pelo md5): o − somando
    (Q1), a droga sem o `min: 0` no modelo (Q2: a quantidade foi a −1) e o controle fora da linha (Q3). A Q2 só caiu
    na terceira forma do passo (acima). Nenhuma rodada deixou Edge para trás; a mesa do servidor ficou ocupada antes
    da última, e o executor esperou.
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura.
- **Próximo:** os itens das maquetes (ciclo 68).

### Ciclo 68 (2026-10-16): as notas da Role e as de ciberpsicose (as maquetes; sessão KouArt)

O item "as notas de ciberpsicose e as notas da Role" das maquetes ("Role notes, free text" e "Notes, cyberpsychosis").
Commit anterior: `2c8068c` (ciclo 67).

- **Implementado:**
  - **o modelo do personagem** (`scripts/dados.mjs`) ganhou dois campos de texto, vazios por padrão:
    `system.role.notas` e `system.notasCiberpsicose`. Sem passo de migração: o Foundry preenche o padrão nas fichas que
    já existem, e nada mais lê esses campos (a volta da ficha para a wiki, a importação e a migração da mesa não mudam);
  - **os painéis** na coluna dos números: "Notas da Role" na aba Role (contatos, dívidas...) e "Notas · ciberpsicose"
    na aba Cyberware (vermelho, os episódios), cada um com um campo de texto que grava ao sair dele.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077; os testes da migração não leem o
    modelo, e passaram);
  - G4: 92 de 97, 180 s (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). O passo da
    ficha nova confere que os dois campos estão nas colunas dos números das abas Role e
    Cyberware, vazios no ator importado, escreve as duas notas pela ficha e confere no ator e na ficha de novo. A
    primeira rodada derrubou o passo "Role do RED", que confere a lista exata de campos da Role do ator importado (para
    a importação não trazer nada além do modelo): com o campo novo, a lista certa é "habilidades, nome, notas, rank", e
    a expectativa foi atualizada (a proteção contra um campo a mais continua);
  - **mutações:** as 3 derrubaram o passo da ficha nova, e os arquivos voltaram (conferido pelo md5): as notas da Role
    fora do modelo (T1; o Foundry descarta o que grava, e o passo "Role do RED" também caiu, pela lista de campos), o
    campo da ciberpsicose com o nome errado (T2) e o das notas da Role com o nome errado (T3). Nenhuma rodada deixou
    Edge para trás.
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura.
- **Próximo:** "Conectar" e "Desconectar" na aba NET (ciclo 69).

### Ciclo 69 (2026-10-16): "Conectar" e "Desconectar" na aba NET (as maquetes; sessão KouArt)

O item "Jack in" e "Jack out" das maquetes. Commit anterior: `8bfa990` (ciclo 68).

- **Implementado:**
  - **as conferências numa função só** (`netrun/ponto-de-acesso.mjs`, `conectarComAsRegras`): o que o clique do jogador
    no marcador já conferia (o token já conectado ali só abre a janela; em outro ponto, não; sem arquitetura; sem o
    que o ponto exige, o deck e o Rank; fora do alcance), com os mesmos avisos. O clique do jogador passou a usá-la;
  - **"Conectar" pela ficha** (`conectarPelaFicha`, na API da NET): o token do ator nesta cena (o selecionado, se
    houver) no ponto de acesso mais perto que quem clica vê, pelas mesmas conferências, para o jogador e para o mestre
    (o mestre que quiser passar por cima continua com o clique no marcador);
  - **a aba NET** (só para quem tem Interface): a conexão no painel da Interface ("desconectado", ou o nome do ponto,
    em ciano) e os botões "Conectar", ou "Abrir a NET" e "Desconectar" (a desconexão segura da janela, com as regras
    dela; o aviso, se ela recusar). A conexão fica no token, e a ficha se redesenha depois de cada botão.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 93 de 98, 181 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington; o
    passo do ponto de acesso, que usa as conferências extraídas no clique do jogador, passou). Um passo novo, depois do
    passo do ponto de acesso (com o ponto, a arquitetura, o netrunner e o token
    dele, todos do passo e apagados no fim): a 7 m de um ponto de alcance 6, "Conectar" avisa "longe demais" e o token
    não conecta; com o Range Upgrade no deck (alcance 8), conecta (a ficha mostra "Terminal da ficha", "Abrir a NET" e
    "Desconectar", e o ponto tem 1 netrunner); "Desconectar" sai, e a ficha volta a "desconectado";
  - **mutações:** as 4 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5): a ficha conectando
    sem as conferências (K1), sem ver a conexão (K2), "Desconectar" sem efeito (K3) e o botão "Conectar" sem a ação
    (K4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes; a confirmação do usuário sobre o conserto da armadura.
- **Próximo:** os itens das maquetes (ciclo 70).

### Ciclo 70 (2026-10-16): "Consertar" na armadura (a decisão do usuário; sessão KouArt)

A resposta do usuário (2026-10-16) à pergunta do conserto: "o botão volta o SP ao máximo; apenas faça aparecer no chat
que o personagem consertou a armadura". Commit anterior: `4fbdb02` (ciclo 69).

- **Implementado:**
  - **`ItemCPR.consertar`** (`scripts/documentos.mjs`): na armadura, o SP de cada local gasto (a cabeça e o corpo,
    onde há máximo) volta ao máximo, e o chat recebe o cartão "CONSERTO" (ciano): "<personagem> consertou <armadura>:
    o SP do corpo volta de 8 para 11.", com a flag do que mudou. Sem teste, custo ou tempo (a wiki não diz; o mestre
    narra). Inteira, só avisa, sem mensagem. O escudo (os PV dele) não entra: o pedido foi o SP;
  - **o botão** "Consertar" na aba Detalhes da ficha da armadura (para quem pode editar o item), no jeito dos botões
    das maquetes.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 94 de 99, 181 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). Um
    passo novo, antes do tiro mirado: a armadura do Alvo com 3 de SP gastos no corpo; o botão volta o
    SP ao máximo, a cabeça não muda, o cartão diz o texto inteiro e tem o tipo "CONSERTO"; de novo, inteira, o aviso e
    nenhuma mensagem nova;
  - **mutações:** as 4 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5): o SP que não volta
    ao máximo (X1), sem a mensagem (X2), a armadura inteira consertada de novo, com outra mensagem (X3) e o botão sem a
    ação (X4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** "Usar" no equipamento ligado à mão (ciclo 71).

### Ciclo 71 (2026-10-16): "Usar" no equipamento ligado à mão (as maquetes; sessão KouArt)

O item "Usar" do equipamento das maquetes (o "Use" do "Gear Tab"), na parte que é só interface. Commit anterior:
`df0c15b` (ciclo 70).

- **Implementado:**
  - **`ItemCPR.usar`** (`scripts/documentos.mjs`), com `usavelAMao` e `emUso`: no equipamento de ativação à mão que tem
    efeito, liga os efeitos dele, ou desliga, se algum está ligado. É o que a ficha do item já fazia efeito por
    efeito: no equipamento à mão, o efeito vale pelo liga e desliga, e não pelo uso (`dados.mjs`);
  - **o botão** "Usar" (ou "Em uso") na linha do inventário da aba Equipamento e "Usar" (ou "Desligar") entre as ações
    da ficha do item. Nenhum dos 46 equipamentos à mão do catálogo tem efeito: o botão aparece nos feitos à mão (a
    lanterna da mesa com +1 em Percepção, por exemplo).
  - O "Usar" da droga continua um item de regra (o efeito secundário da wiki).
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 94 de 99, 185 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). O
    passo do inventário ganhou uma lanterna feita à mão (+1 em Percepção, desligada): o "Usar" da linha
    liga (a Percepção vai de 0 a 1, e o botão diz "Em uso"); o da ficha do item desliga (de volta a 0); o Agent e o
    Medscanner, que não são à mão, não têm o botão;
  - **mutações:** as 4 derrubaram o passo do inventário, e os arquivos voltaram (conferido pelo md5): o "Usar" que só
    desliga (S1), o botão também no equipamento que não é à mão, o Agent (S2), o botão da linha sem a ação (S3) e a
    ficha do item sem o botão (S4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** os slots do deck em caixas e o estado de cada programa, na aba NET (ciclo 72).

### Ciclo 72 (2026-10-16): os slots do deck em caixas e o estado de cada programa (as maquetes; sessão KouArt)

O item "os slots do deck em barras e o estado de cada programa com Rodar" das maquetes ("Net Tab"). Commit anterior:
`344f767` (ciclo 71).

- **Implementado** (`scripts/ficha-personagem.mjs`, `templates/personagem/net.hbs`, `styles/tema.css`):
  - **os slots** do deck equipado no painel da Interface: uma caixa por slot, as usadas cheias em ciano, e o número
    ("2/7"). É a mesma régua das caixas dos pontos da Role (ciclo 61), que ganhou a cor por variável;
  - **o estado de cada programa** na lista: "guardado" (fora do deck), "carregado" (no deck, com a borda em ciano) e
    "ativo" (rezzado, cheio em amarelo). O "Rodar" das maquetes é o botão "Ativo" de sempre, que liga e desliga o
    programa no deck.
- **Testes:**
  - G1: 49 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 94 de 99, 187 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). O
    passo da Interface do Netrunner confere as caixas dos slots (2 de 7, os dois boosters, iguais aos do
    deck), os dois programas "carregado" e, com o Eraser ligado, o estado dele "ativo";
  - **mutações:** as 4 derrubaram o passo da Interface, e os arquivos voltaram (conferido pelo md5): o programa ativo
    como carregado (B1), as caixas sem os slots em uso (B2), as caixas fora do painel (B3) e a etiqueta do estado vazia
    (B4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** "Rolar Humanidade" no cyberware e "Aplicar" no cartão (ciclo 73).

### Ciclo 73 (2026-10-16): "Rolar Humanidade" no cyberware e "Aplicar" no cartão (as maquetes; sessão KouArt)

Os itens "Roll humanity" (a ficha do cyberware) e "Apply" (o cartão da perda) das maquetes. Commit anterior: `fc94f41`
(ciclo 72).

- **Implementado** (`scripts/humanidade.mjs`, novo; `documentos.mjs`, `combate.mjs`, `ficha-item.mjs`, `item.hbs`):
  - **"Rolar Humanidade"** na ficha do cyberware de um personagem (a peça precisa de dono e de fórmula): rola a perda
    sem instalar, num cartão "HUMANIDADE" (vermelho) com os dados, a fórmula e a média, e o botão "Aplicar";
  - **"Aplicar"** (só o mestre, como os outros botões dos cartões): tira o total da Humanidade atual do dono, sem passar
    de 0, uma vez; o cartão troca o botão por "Aplicada em <dono>: Humanidade 50 → 43." (a flag guarda o antes e o
    depois). O máximo não muda: ele vem das peças instaladas;
  - **a instalação continua igual:** rola e aplica sozinha. O caminho novo é para o que a mesa quiser rolar fora dela
    (uma peça que já veio instalada, um episódio narrado...).
- **Testes:**
  - G1: 50 arquivos, 0 erros (com o `humanidade.mjs`); G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 95 de 100, 182 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington).
    Um passo novo, antes do tiro mirado: um Neural Link (2d6) não instalado no Alvo; o botão rola 3 + 4 = 7
    sem instalar e sem mexer na Humanidade; o "Aplicar" tira 7 uma vez, e o cartão perde o botão e diz o que mudou;
  - **mutações:** as 4 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5): o "Aplicar" que não
    tira nada (H1), o cartão que fica com o botão depois de aplicar (H2), a ficha do cyberware sem o botão (H3) e o
    botão do cartão sem efeito (H4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** "Atacar" e "Recarregar" na ficha da arma, e o SP da armadura em caixas (ciclo 74).

### Ciclo 74 (2026-10-16): "Atacar" e "Recarregar" na arma e o SP da armadura na ficha do item (as maquetes; sessão KouArt)

Os botões da maquete "Item Sheets" para a arma ("Attack", "Reload") e a armadura (a trilha do SP e "Ablate −1").
Commit anterior: `e9b6d9a` (ciclo 73).

- **Implementado** (`scripts/ficha-item.mjs`, `templates/item.hbs`, `styles/tema.css`):
  - **na arma de um personagem**, "Atacar" e "Recarregar": o mesmo fluxo da ficha dele (o ataque com a janela de
    rolagem no clique, direto com Ctrl, e "Rolar direto" inverte; a recarga da munição carregada, ou da primeira
    compatível);
  - **na armadura**, o SP de cada local que tem máximo em caixas (a régua da Role e dos slots, que passou a valer também
    na ficha do item), com o número e o "−1", que tira um ponto sem passar de 0 (o modelo do SP não tem mínimo, então a
    guarda fica na ficha); o "Consertar" do ciclo 70 devolve.
- **Fora, de propósito:** os "acertos recebidos" da maquete: o sistema não conta acertos, e o SP gasto já diz.
- **Testes:**
  - G1: 50 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 96 de 101, 185 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington).
    Um passo novo, antes do tiro mirado: na ficha do rifle da Atiradora, os botões "Atacar" e "Recarregar";
    o clique pede o ataque com a janela, e o Ctrl + clique, direto (o ataque em si é o da ficha, conferido nos outros
    passos; aqui, o que o botão pede); com 5 a menos no pente, "Recarregar" enche (25/25) e gasta 5 da munição. Na
    armadura do Alvo com 1 de SP no corpo, as caixas mostram 1 de 11, o "−1" leva a 0, e o "−1" no 0 não desce (lido
    depois de assentar). O pente, a munição e o SP voltam no fim;
  - **mutações:** as 4 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5): o Ctrl + clique que
    também abre a janela (A1), a arma sem o "Recarregar" (A2), o "−1" que passa de 0 (A3) e as caixas mostrando o
    máximo (A4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** "Rodar" e "Restaurar REZ" na ficha do programa (ciclo 75).

### Ciclo 75 (2026-10-16): "Rodar" e "Restaurar REZ" na ficha do programa (as maquetes; sessão KouArt)

Os botões da maquete "Item Sheets" para o programa ("Run", "Reset REZ"). Commit anterior: `10ff856` (ciclo 74).

- **Implementado** (`scripts/ficha-item.mjs`, `templates/item.hbs`): na ficha do programa, a REZ atual ("REZ 4/7") e
  os botões "Rodar" (ou "Desligar"), só num deck e fora os de ataque, que liga e desliga o programa como o "Ativo" da
  aba NET, e "Restaurar REZ", que devolve a REZ perdida (os que têm REZ, fora o quickhack e o daemon, como a aba NET).
- **Testes:**
  - G1: 50 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 97 de 102, 184 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington).
    Um passo novo, antes do tiro mirado: um Eraser fora do deck só tem o "Restaurar REZ"; no deck, aparece
    o "Rodar", que liga ("Desligar") e desliga; com 3 de REZ perdidos (4/7), o "Restaurar REZ" volta a 7/7;
  - **mutações:** as 4 derrubaram só o passo novo, e os arquivos voltaram (conferido pelo md5): o "Rodar" que só liga
    (P1), o "Restaurar REZ" sem efeito (P2), o "Rodar" também fora do deck (P3) e a REZ mostrando o máximo (P4).
    Nenhuma rodada deixou Edge para trás.
- **Pendências:** os outros itens das maquetes.
- **Próximo:** a arquitetura onde o netrunner está, ao vivo, na aba NET (ciclo 76).

### Ciclo 76 (2026-10-16): a arquitetura ao vivo na aba NET (as maquetes; sessão KouArt)

O item "Architecture, live" da maquete "Net Tab". Commit anterior: `fdc9632` (ciclo 75).

- **Implementado:**
  - **`andaresConhecidos`** (`netrun/janela.mjs`, na API da NET): os andares como o netrunner os conhece (o estado
    público do ponto, o mesmo que a janela do jogador usa), em ordem, cada um com o rótulo ("1A"), o que há nele (o
    mesmo texto curto da janela, como "Senha DV 6") e o estado: hostil (um inimigo ativo), trancado (a senha, o arquivo
    ou o nó de controle por fazer), liberado (o que havia, feito), livre, ou "?" (ainda não visto). O mestre também vê
    só o que o netrunner sabe: o mapa inteiro continua na janela dele;
  - **a aba NET**, conectado: o painel "Arquitetura · ao vivo · N andares" na coluna dos números;
  - **ao vivo** (`netrun/index.mjs`): quando o estado do ponto muda, as fichas abertas de quem está conectado ali se
    redesenham, como a janela da NET já fazia.
- **Testes:**
  - G1: 50 arquivos, 0 erros; G2: 0 erros; G3: 83 de 87 (as 4 das armas de 2077);
  - G4: 97 de 102, 184 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). O
    passo do "Conectar" da ficha (ciclo 69) ganhou a arquitetura: conectado, "1A | ? | desconhecido";
    o netrunner desce para o andar 1 (a operação `mover` do motor), e a ficha aberta passa a "1A | Senha DV 6 |
    trancado" sem reabrir; desconectado, o painel some;
  - **mutações:** as 4 derrubaram o passo do "Conectar", e os arquivos voltaram (conferido pelo md5): o andar não visto
    mostrando o que há nele (V1), a ficha que não se redesenha quando o estado muda (V2), a senha por fazer como livre
    (V3) e o painel fora da aba (V4). Nenhuma rodada deixou Edge para trás.
- **Pendências:** os itens de regra das maquetes (Agarrar e Proteger-se, a correção rápida e o tratamento, "Usar" a
  droga, a fundação e as opções do cyberware) e o "Largar" (o que ele faz, a confirmar com o usuário).
- **Próximo:** os itens de regra das maquetes (ciclo 77).

### Ciclo 77 (2026-10-16): a correção rápida e o tratamento da lesão (um item de regra das maquetes; sessão KouArt)

Os itens "Quick fix" e "Treat" das maquetes, pela regra da wiki ("Dano e cura", p. 223; o teste básico, p. 128).
Commit anterior: `2456f61` (ciclo 76).

- **A regra (a wiki):** quem trata rola TECH + Primeiros Socorros ou Paramédico + 1d10 (no tratamento, Paramédico ou
  Cirurgia) e precisa **superar** a DV da lesão (empatar não basta). A correção rápida tira o efeito pelo resto do dia
  (1 minuto; pode ser em si mesmo); o tratamento tira de vez (4 horas; não em si mesmo). Na lesão em que "a correção
  rápida resolve de vez" (o Músculo rompido, o Objeto estranho alojado: as que não têm tratamento), a correção cura.
  As DVs são as que a lesão já guarda (paliativo e tratamento); nenhum campo novo.
- **Implementado** (`scripts/tratamento.mjs`, novo):
  - **a parte de regra em funções puras** (`opcoesDaLesao`, `resultadoDoTratamento`, `resolveDeVez`), que o G3 testa;
  - **o fluxo** (`tratarLesao`): a janela pergunta quem trata (os tokens selecionados de quem clica, o personagem dele
    e, na correção, o próprio ferido; no tratamento, nunca o ferido) e a perícia (as que a lesão aceita, com a DV); a
    rolagem é a perícia (ou a Cirurgia, a rolagem de Role do Medtech; quem não a tem recebe o aviso), direta, com a
    Sorte preparada; o resultado: curada (a lesão sai), corrigida (os efeitos desligam e a lesão fica marcada) ou
    falhou; o cartão "TRATAMENTO" diz quem tratou, o total e a DV;
  - **o "Voltou"** (`voltouALesao`): o sistema não tem relógio, então a lesão corrigida fica "CORRIGIDA" até alguém
    dizer que o dia acabou; aí os efeitos ligam de novo;
  - **os botões:** "Correção", "Tratar" e "Voltou" na linha da lesão da aba Combate (o painel geral continua só com o
    "Tratada", que também é o da ficha do capanga) e na ficha da lesão de um personagem.
- **Testes:**
  - G1: 52 arquivos, 0 erros (com o `tratamento.mjs` e o teste dele); G2: 0 erros;
  - G3: 85 de 89. Um arquivo novo, `tests/sistema/tratamento.test.mjs`, com 2 testes de referência: as perícias e as
    DVs da Perna quebrada, do Músculo rompido e do Braço desmembrado (a tabela da wiki), e o resultado (13 contra DV13
    falha; 14 corrige; no Músculo rompido, cura; o tratamento de 15 contra DV15 falha, o de 16 cura). As 4 falhas são
    as das armas de 2077;
  - G4: 98 de 103, 183 s, nas duas últimas rodadas (as 5 falhas são as das armas de 2077, e os avisos, só os dois da
    Lexington). Um passo novo, antes do tiro mirado: um Medtech de teste (TECH 8, Paramédico 4) selecionado e a Perna
    quebrada no Alvo (MOVE 1); na aba Combate, "Correção" abre a janela com o Medtech e o Alvo e só "Paramédico DV13";
    14 corrige (MOVE 5, "CORRIGIDA" e o "Voltou"); o "Voltou" devolve o MOVE 1; o "Tratar" oferece só o Medtech, com
    "Paramédico DV15" e "Cirurgia DV13"; 15 falha e a lesão fica; 16 a tira (MOVE 5), e o cartão diz "Teste Medtech
    tratou Perna quebrada de Alvo (Paramédico 16 contra DV15).". A primeira rodada caiu por defeito do passo: ele
    respondeu a janela do tratamento na da correção, que ainda saía com a animação, e a janela nova ficou aberta; ela
    derrubou depois o passo da ficha nova (que procura uma janela de confirmação). O passo agora espera cada janela
    sumir e fecha as que sobrarem no `finally` (a lição está no QUALITY_GATES). A mutação do "não em si mesmo" (L3)
    sobreviveu na segunda rodada: o Alvo nunca estava entre os tokens selecionados, então a guarda não era exercitada.
    O passo passou a selecionar também o token do Alvo (na correção ele aparece; no tratamento, não);
  - **mutações:** as 5 caíram, e o arquivo voltou (conferido pelo md5). No G3: empatar com a DV bastando (L1) e a lesão
    sem tratamento que não resolve de vez (L5). No G4: a correção que não desliga o efeito (L2), o tratamento também em
    si mesmo (L3, na terceira rodada, com o Alvo selecionado) e o "Voltou" que não liga o efeito (L4). Nenhuma rodada
    deixou Edge para trás.
- **Pendências:** "Usar" a droga, Agarrar e Proteger-se, a fundação e as opções do cyberware; o "Largar" (o que ele faz,
  a confirmar com o usuário).
- **Próximo:** "Usar" a droga (ciclo 78).

### Ciclo 78 (2026-10-16): "Usar" a droga (um item de regra das maquetes; sessão KouArt)

O item "Use" das drogas das maquetes, pela regra da wiki ("Humanidade e drogas", "Drogas de rua", p. 227–229).
Commit anterior: `9e69386` (ciclo 77).

- **A regra (a wiki):** tomar é uma Ação; o efeito primário vale na hora; doses a mais estendem o primário. Quando ele
  acaba, WILL + Resistir Tortura/Drogas + 1d10 contra a DV do efeito secundário, que precisa ser superada; falhar dá o
  efeito secundário permanente e o vício, até a terapia. A tabela: Black Lace DV17 (tira 2d6 de Humanidade, devolvidos
  se passar), Blue Glass 15, Boost 17, Smash 15, Synthcoke 15.
- **Implementado** (`scripts/drogas.mjs`, novo):
  - **a parte de regra pura** (`DROGAS_DE_RUA`, `efeitosDaDroga`, `resultadoDoSecundario`), que o G3 testa;
  - **"Usar"** (`usarDroga`): gasta a dose (sem dose, avisa), liga o efeito primário (o do "consumo" da droga) e marca
    a droga sob efeito; o Black Lace rola os 2d6 e os tira da Humanidade (guardados para devolver); sob efeito, a dose
    a mais só estende. O cartão "DROGA" diz o que foi tomado;
  - **"Acabou"** (`acabouOEfeito`): desliga o primário e, na droga de rua, rola o teste; superando, o Black Lace
    devolve a Humanidade; senão, o vício (o efeito "Addiction" do CORE) liga e fica, com a marca "VICIADO". Quem já é
    viciado rola também (a Humanidade pode voltar), mas segue viciado: só a terapia tira o vício;
  - **o vício fora do efeito:** a wiki diz que o −2 do vício do Black Lace e do Synthcoke vale "quando não está sob
    efeito": enquanto o primário dura, o vício dessas duas fica suspenso. O CORE faz essa conta no Synthcoke com um
    efeito "Addicted Primary" (+3); ele não é usado aqui (daria a conta dobrada). No Boost e no Smash, o vício vale
    sempre, como a wiki diz;
  - **as outras drogas** (Speedheal, Stim, Rapidetox, os antibióticos, o Surge, os imunobloqueadores): sem efeito
    secundário na wiki, "Usar" gasta a dose e liga o efeito, se houver. O que cada uma faz além disso (a cura do
    Speedheal, por exemplo) o mestre aplica;
  - **os botões** "Usar", "Acabou" e a marca "VICIADO" na linha do inventário, e "Usar" e "O efeito acabou" na ficha da
    droga de um personagem (a nota antiga, "ligue o efeito na aba Efeitos", saiu).
- **Testes:**
  - G1: 54 arquivos, 0 erros; G2: 0 erros;
  - G3: 88 de 92. Um arquivo novo, `tests/sistema/drogas.test.mjs`, com 3 testes de referência: a tabela das drogas de
    rua, o primário e o vício de cada droga do catálogo (no Synthcoke, o "Primary", não o "Addicted Primary") e o
    teste do secundário (empatar vicia). As 4 falhas são as das armas de 2077;
  - G4: 99 de 104, 184 s, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington).
    Um passo novo, antes do tiro mirado: num ator de teste (WILL 6, Resistir 4, INT 6), o Black Lace (2
    doses): "Usar" gasta 1, liga o primário e tira 7 (3 + 4) de Humanidade; "Acabou" rola 18 contra DV17, devolve os 7
    e desliga o primário, sem vício. O Boost: +2 INT (8); "Acabou" rola 15 contra DV17: o vício liga (INT 4), a marca
    aparece e o cartão diz "Teste Usuário ficou viciado em Boost (15 contra DV17): o efeito secundário fica, até a
    terapia.";
  - **mutações:** as 5 caíram, e o arquivo voltou (conferido pelo md5). No G3: empatar com a DV passando (R4) e a DV do
    Boost errada (R5). No G4: "Usar" sem gastar a dose (R1), o Black Lace que não devolve a Humanidade (R2) e o vício
    que não liga ao falhar (R3). Nenhuma rodada deixou Edge para trás.
- **Pendências:** Agarrar e Proteger-se, e a fundação e as opções do cyberware (as duas pedem escolhas de desenho: ver
  as perguntas ao usuário); o "Largar".
- **Próximo:** as perguntas ao usuário sobre os itens que faltam.

### Ciclo 79 (2026-10-16): "Proteger-se" (um item de regra das maquetes; sessão KouArt)

A ação "Take Cover" da maquete "Fight Tab", pela regra da wiki (a cobertura, p. 182) e pela decisão do usuário de
2026-10-16 ("só a marca"). Commit anterior: `0f8fa9a` (ciclo 78).

- **A regra (a wiki):** ir até a cobertura é a Ação de Movimento; atrás de algo que para a bala e fora da linha de
  visão, o tiro para na cobertura, que tem os próprios PV. O sistema não sabe o que há entre os tokens, e o usuário
  escolheu não guardar o HP da cobertura: o mestre decide.
- **Implementado:**
  - **a marca "Em cobertura"** (`STATUS_COBERTURA`, em `combate.mjs`), registrada nos efeitos de status do Foundry
    (`sistema.mjs`), com o ícone do escudo: aparece no HUD do token, e o mestre também a liga e desliga por lá;
  - **o botão "Proteger-se"** na Defesa da aba Combate (`ficha-personagem.mjs` e `combate.hbs`): liga a marca no ator
    (nos tokens dele); ligado, ele vira "EM COBERTURA", em ciano, e o clique tira a marca;
  - **o aviso no cartão do ataque:** na linha de cada alvo marcado, num ataque que não é corpo a corpo, a nota "<alvo>
    está em cobertura: se ela para a bala e o tira da linha de visão, o tiro para nela (o mestre decide; wiki, p.
    182)". O ataque segue como sempre (rola, acerta e fere): o mestre usa o "Desfazer" se a cobertura parou a bala.
- **Testes:**
  - G1: 54 arquivos, 0 erros; G2: 0 erros;
  - G3: 88 de 92 (as 4 falhas são as das armas de 2077);
  - G4: 100 de 105, de primeira (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). Um passo
    novo, antes do tiro mirado: na aba Combate do Alvo, "PROTEGER-SE" vira "EM COBERTURA", e a marca fica no token; o
    tiro do rifle contra ele acerta como sempre (a armadura segura), com a nota "Alvo está em cobertura ... o mestre
    decide"; o botão de novo tira a marca. O passo do corpo a corpo marca o Capanga em cobertura e confere que os dois
    golpes não ganham o aviso. Depois das mutações, o `#protegerSe` foi para depois do `#rolarIniciativa` (tinha entrado
    entre o comentário dele e a função); o G4 rodou de novo: 100 de 105;
  - **mutações:** as 5 caíram, e os arquivos voltaram (conferido pelo md5): o cartão sem o aviso (P1), o aviso também
    no corpo a corpo (P2, pelo passo do corpo a corpo), o botão que não liga a marca (P3), o botão que não mostra que
    está ligado (P4) e a marca fora dos efeitos de status do Foundry (P5: o `toggleStatusEffect` dá erro).
- **Pendências:** Agarrar (o próximo ciclo) e a fundação e as opções do cyberware.
- **Próximo:** o Agarrar.

### Ciclo 80 (2026-10-16): "Agarrar" e "Soltar" (um item de regra das maquetes; sessão KouArt)

A ação "Grapple" da maquete "Fight Tab", pela regra da wiki ("Agarrar e arremessar", p. 177) e pela decisão do usuário
de 2026-10-16 (o alvo resiste pela janela do dono, como a esquiva). Commit anterior: `0bbcec9` (a marca `[~]`).

- **A regra (a wiki):** "Agarrar (Ação, precisa de mão livre): os dois rolam DEX + Briga + 1d10. Quem vence agarra";
  "Agarrados: −2 em todas as ações; o defensor não usa Ação de Movimento e é arrastado; ninguém usa arma de duas mãos";
  "O atacante solta quando quiser". O empate é do defensor: "Teste resistido (p. 128) ... Empate: o defensor vence". O
  glossário da wiki confirma o −2 dos dois.
- **Implementado:**
  - **a regra pura** (`regras.mjs`: `AGARRAO`, `venceuOAgarrao`), que o G3 testa;
  - **o fluxo** (`scripts/agarrao.mjs`, novo): quem agarra marca o alvo (T), um só, e rola DEX + Briga + 1d10 (a
    janela de rolagem, com o total escondido como o do ataque); o mestre ativo pede a resistência pela mesma defesa
    do ataque (`combate.defesaContra`, novo: a janela de reação do dono, com o prazo, o "responder por ele" e a
    escolha padrão; pelo NPC, o mestre rola) e, vencendo, marca os dois. O cartão diz o resultado (e, no empate, que
    ele é do defensor) e lembra o que a regra proíbe, sem impedir. O jogador manda o pedido pelo socket, como o
    ataque, e os pedidos entram na mesma fila do mestre;
  - **a escolha "Resistir" na janela de reação** (`janela-defesa.mjs` e `combate.mjs`): o título "Estão agarrando
    você!", a conta da Briga (DEX + Briga, com as penalidades, e a média) e o texto do que acontece se perder;
  - **as marcas** "Agarrando" e "Agarrado" (efeitos de status, no HUD do token), cada uma com o outro ator. A marca
    apagada (o "Soltar" ou o HUD) leva a do outro junto (o mestre ativo apaga, pelo `deleteActiveEffect`);
  - **o −2** em todo teste de quem tem uma das marcas (a parte "Agarrão", junto das penalidades de ferimento e das
    lesões, em `documentos.mjs`);
  - **na ficha**, na Defesa da aba Combate: "AGARRAR" ao lado de "PROTEGER-SE" e, agarrando, "SOLTAR"; a linha
    "AGARRANDO" ou "AGARRADO POR", com o nome do outro e o −2.
- **Testes:**
  - G1: 55 arquivos, 0 erros; G2: 0 erros;
  - G3: 89 de 93. Um teste de referência novo em `regras.test.mjs`: o texto da wiki (os dois rolam DEX + Briga, o −2
    dos dois e o empate do defensor) e o `venceuOAgarrao` (14 contra 13 agarra; 13 contra 13, não). As 4 falhas são
    as das armas de 2077;
  - G4: 102 de 107 (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). Dois passos novos:
    - depois do corpo a corpo, a Atiradora (DEX 7, Briga 3) agarra o Capanga (NPC, DEX 5, Briga 2): pela API, 13
      contra 13, resistiu, sem marca; pelo botão da aba Combate, com o Capanga marcado, 18 contra 9: os dois
      marcados, o −2 na Evasão dos dois e a linha "AGARRANDO | Capanga · −2 em tudo"; "SOLTAR" tira as duas marcas,
      e o cartão diz "Atiradora soltou Capanga: o agarrão acabou.";
    - no jogador, depois da primeira esquiva: a janela "Estão agarrando você!" só com "Resistir" e o texto "DEX 7 +
      Briga 1 + 1d10 (média 13,5) contra o agarrão. Empate é seu.", sem o total, que só fica visível para ele depois;
      ele rola 12 contra 19 e fica agarrado, com o −2 no computador dele; o "Soltar" do mestre tira as marcas;
    - os dois passos rodaram três vezes até passar: na primeira, o teste lia `system.pericias.brawling` (que só existe
      depois de mexida; a ficha lê por `system.pericia(id)`); na segunda, a linha da ficha lida inteira juntava o
      `<span>` e o `<b>` ("AGARRANDOCapanga"). O código não mudou entre elas;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5). No G3: empatar agarra (A1). No G4:
    agarrados sem o −2 (A2), vencer sem marcar ninguém (A3), o "Soltar" que não tira a marca do outro (A4), a
    resistência pela Evasão (A5), a janela sem a conta da Briga (A6) e com o título do ataque (A7), a ficha sem o
    "SOLTAR" (A8) e o total de quem agarrou escondido depois da resistência (A9). A A4 sobreviveu na primeira rodada:
    o `__esperar` do teste devolve a condição e não falha quando o tempo acaba, e nada conferia as marcas depois do
    "Soltar". Os dois passos passaram a conferir; o G4 rodou de novo (102 de 107), e a A4 caiu.
- **Pendências:** o resto do agarrão (Estrangular, Derrubar, Escapar e o botão no capanga: o mestre agarra pelo NPC
  pela API), e a fundação e as opções do cyberware.
- **Próximo:** o resto do agarrão.

### Ciclo 81 (2026-10-16): o resto do agarrão: Estrangular, Derrubar e Escapar (sessão KouArt)

O resto da regra "Agarrar e arremessar" da wiki (p. 177), depois do ciclo 80. Commit anterior: `8bc077a` (a marca `[~]`).

- **A regra (a wiki):** "Estrangular (Ação): dano igual ao BODY direto no HP, ignorando armadura. Se levaria abaixo de 0,
  fica com 1 HP e desmaia. Três rodadas seguidas: desmaia."; "Derrubar (Ação): dano igual ao BODY direto no HP; o alvo
  cai e o agarrão acaba."; "o defensor escapa com um teste de agarrar vencido (Ação)". O "abaixo de 0" fica nas dúvidas.
- **Implementado:**
  - **a regra pura** (`regras.mjs`: `danoDoAgarrao`, com o motivo do desmaio, e `vezesEstrangulando`: no mesmo
    combate, a rodada de antes conta junto, pular uma recomeça, a mesma rodada não conta outra; fora de combate, toda
    vez conta), que o G3 testa;
  - **"Estrangular" e "Derrubar"** (`agarrao.mjs`), de quem agarra, sem rolagem: o mestre ativo tira o BODY do HP do
    outro. Estrangulando, as vezes seguidas ficam na marca de quem agarra, e o desmaio liga a marca de inconsciente do
    Foundry. Derrubando, o outro fica caído (a marca do Foundry), e o agarrão acaba. O cartão diz o dano, o HP de antes e
    o de depois, e por que desmaiou;
  - **"Escapar"**, de quem é agarrado: DEX + Briga + 1d10 (com o −2 do agarrão), e quem agarra resiste pela mesma
    defesa (a janela de reação do dono, "Estão escapando do seu agarrão!", com o texto "contra a fuga ... Perdeu: o
    agarrão acaba"; pelo NPC, o mestre rola). O empate é de quem segura. O token de quem segura precisa estar na cena;
  - **o pedido ao mestre** ficou um só para as quatro ações (`{ tipo: 'agarrao', acao }` pelo socket, na fila dos
    ataques);
  - **na ficha:** os botões saíram para um bloco (`bloco-agarrao.hbs`), na Defesa da aba Combate do personagem e num
    painel "AGARRÃO" da ficha do capanga: sem agarrão, "AGARRAR"; agarrando, "ESTRANGULAR", "DERRUBAR" e "SOLTAR";
    agarrado, "ESCAPAR".
- **Testes:**
  - G1: 55 arquivos, 0 erros; G2: 0 erros;
  - G3: 91 de 95. Dois testes de referência novos em `regras.test.mjs`: o texto da wiki (o Estrangular, o Derrubar e o
    "escapa com um teste de agarrar vencido") e o `danoDoAgarrao` (14, 8, 2 com o desmaio na terceira; 4 → 1 com o
    desmaio; 6 → 0 sem desmaio; quem está em 0 não sobe; o Derrubar sem o limite); e as vezes seguidas. As 4 falhas são
    as das armas de 2077;
  - G4: 104 de 109 (as 5 falhas são as das armas de 2077, e os avisos, só os dois da Lexington). Dois passos novos:
    - depois do Agarrar no Capanga, a Atiradora (BODY 6) agarra o Capanga e estrangula três vezes fora de combate (20 →
      14 → 8 → 2, e na terceira ele desmaia, com o cartão "é a 3ª rodada seguida"); com 4 de HP, o estrangular o deixa
      com 1 e desmaiado ("o dano o levaria abaixo de 0"); com 20, o Derrubar deixa 14, caído e sem as marcas. Agarrado
      de novo, os botões de cada lado ("ESCAPAR"; "ESTRANGULAR", "DERRUBAR", "SOLTAR"); a fuga empata (11 contra 11, os
      dois com o −2), e a Atiradora segura; depois, 14 contra 10, ele escapa, as marcas saem e volta o "AGARRAR";
    - no jogador: o Alvo agarra o Capanga, e a fuga do Capanga chega na janela de reação dele ("Estão escapando do seu
      agarrão!", "DEX 7 + Briga 1 − Agarrão 2 + 1d10 (média 11,5) contra a fuga. Empate é seu. Perdeu: o agarrão
      acaba."); 10 contra 10, ele segura;
    - o passo do capanga (o mook) confere o painel "AGARRÃO" na lista dos títulos e o botão "AGARRAR" nele;
    - rodou três vezes até passar, sem mudar o código: na primeira, a conta da fuga esqueceu que o Capanga, com 14 de
      35 depois do Derrubar, estava gravemente ferido (−2); o passo volta o HP dele ao máximo antes da fuga. Na segunda,
      a limpeza do passo novo do jogador apagava as duas marcas e corria contra o mestre, que já apaga a do outro lado
      ("ActiveEffect ... does not exist!"; e o erro no `finally` escondia o resultado do passo): a limpeza dos quatro
      passos do agarrão passou a tolerar essa corrida e a esperar as marcas sumirem;
  - **mutações:** as 11 caíram, e os arquivos voltaram (conferido pelo md5). No G3: chegar a 0 contar como abaixo de 0
    (B1) e pular uma rodada não recomeçar a conta (B2). No G4: o estrangular sem tirar o HP (B3), o desmaio sem a marca
    (B4), as rodadas seguidas sem guardar (B5), o Derrubar que não acaba o agarrão (B6) e que não deixa caído (B7), o
    empate da fuga para quem foge (B8), a fuga que não tira as marcas (B9), a janela da fuga com o título do agarrão
    (B10) e a ficha de quem é agarrado sem o "ESCAPAR" (B11).
- **Pendências:** a fundação e as opções do cyberware; o "abaixo de 0" do Estrangular, se a mesa ler diferente (ver as
  dúvidas).
- **Próximo:** a fundação e as opções do cyberware.

### Ciclo 82 (2026-10-16): a fundação e as opções do cyberware, parte 1 (um item das maquetes; sessão KouArt)

A hierarquia de fundação e opções da maquete "Cyberware Tab" (os slots usados de cada fundação, as opções logo abaixo),
pela regra da wiki. Commit anterior: `43316d3` (a marca `[~]`).

- **A regra (a wiki):** "Um implante-base abre slots para opções compatíveis; Fashionware, cyberware interno e externo usam
  slots de categoria" (`system-catalog.js`), com os slots de cada fundação: o Neural Link "oferece cinco slots de opção",
  o Cybereye "três slots de opção por olho", o Cyberaudio Suite "três slots de opção", o Cyberarm "quatro slots", o
  Cyberleg "três slots", e o Sensor Array "acrescenta cinco slots de opção ao Cyberaudio". De 2077 (`system-2077.js`): o
  Neuroport traz o Neural Link "com 5 slots de opção", as Basic Kiroshi Optics "dois slots de opção para cyberolho", o
  Skin Weave "dois slots de placa" e o Subdermal Armour "um slot de placa", que "não ocupam os slots de cyberware externo".
- **Implementado:**
  - **dois campos no cyberware** (`dados.mjs`): os slots de opção da fundação e, na opção, o id da fundação onde ela está
    (como o `instaladoEm` dos programas no deck); vazios por padrão;
  - **o catálogo** (`build/conteudo.mjs` e `conteudo-2077.mjs`): os slots de cada fundação pela wiki onde ela diz, e os do
    CORE (`installedItems.slots`) nas outras. O build continua reproduzindo o catálogo byte a byte antes da mudança
    (conferido pelo md5); depois dela, só o `catalogo.json` muda;
  - **a regra pura** (`regras.mjs`: `cabeNaFundacao`, `pedeFundacao`, `encaixeDaFundacao`, `encaixeDaOpcao`): a opção vai
    numa fundação do mesmo tipo; o Sensor Array recebe as opções do Cyberaudio; o Skin Weave e o Subdermal Armour, só as
    opções de placa (Carapace, Countershell, Nano-plating, ProxiShield, RangeGuard); a fashionware e o cyberware interno
    e externo não pedem fundação;
  - **a instalação** (`documentos.mjs`): a opção entra na fundação instalada em que cabe (a que já aponta, se ainda cabe;
    senão, a primeira); sem nenhuma, entra sem fundação, com um recado (`info`: a instalação deu certo, e a ficha marca).
    A fundação que sai deixa as opções dela instaladas, sem fundação, com o recado. A fundação conta as opções nos slots
    (`instalados`, como o deck);
  - **na ficha:** a aba Cyberware em árvore (cada fundação com "usados / slots" e as opções logo abaixo, com └; a opção
    sem a fundação que pede, marcada "SEM FUNDAÇÃO"); na ficha do cyberware, os slots da fundação ou os que a opção ocupa,
    e o alto com os slots usados ou com a fundação da opção.
- **Testes:**
  - G1: 55 arquivos, 0 erros; G2: 0 erros;
  - G3: 92 de 96. Um teste de referência novo em `regras.test.mjs`: os trechos da wiki, os slots das dez fundações no
    catálogo (o Sensor Array com os 5 da wiki) e o encaixe (o Kerenzikov no Neural Link até o quinto slot; o Dartgun, de
    3, não cabe no Cybereye com 2 usados; o Anti-Dazzle não encaixa no Neural Link; o Sensor Array recebe o Amplified
    Hearing; o Skin Weave, a Carapace e não o Hidden Holster; quem pede fundação). As 4 falhas são as das armas de 2077;
  - G4: 105 de 110 (as 5 falhas são as das armas de 2077). Um passo novo, antes do Proteger-se: num ator de teste, o
    Anti-Dazzle instalado antes do Cybereye entra sem fundação; o Kerenzikov entra no Neural Link (1 / 5); o Low
    Light/IR/UV (2) no Cybereye (2 / 3); o Dartgun (3) não cabe e entra sem fundação; o Techhair não pede fundação. A
    aba mostra o Kerenzikov logo abaixo do Neural Link e o Low Light logo abaixo do Cybereye, com os slots, e os dois sem
    fundação marcados; os recados são os dois do "entrou sem fundação" e o do Neural Link que sai ("Kerenzikov ficou sem
    fundação"), e o Kerenzikov continua instalado;
    - na primeira rodada, o recado era um `warn`, e a checagem de avisos pegou oito dele, dos passos que instalam uma
      opção sem fundação (o Kerenzikov no capanga, o Smart Link e o Ballistic Coprocessor nas armas de 2077, o Grip
      Foot): a instalação deu certo, e a ficha marca; o recado virou `info`;
    - nas duas rodadas, a checagem de avisos mostrou só um dos dois da Lexington. Um G4 de diagnóstico (com o passo da
      Dian instrumentado numa cópia, depois devolvida, conferida pelo md5) mostrou o fluxo de sempre: o tiro da Dian sai,
      a rajada da Lexington volta nula (a falha conhecida: a arma sem autofogo), e o aviso "não tem autofogo" sai, mas
      com 5 notificações na tela, o máximo do Foundry, ele fica na fila e não chega ao console (ver o QUALITY_GATES);
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5). No G3: a opção que cabe com o slot estourado
    (C1), o Sensor Array sem as opções do Cyberaudio (C2) e a opção de placa sem pedir fundação (C3). No G4: a opção que
    não procura a fundação (C4), sem o recado (C5), a fundação que sai sem soltar as opções (C6), a aba sem a árvore (C7)
    e a fundação sem contar as opções nos slots (C8). Os slots do catálogo, o build os gera, e o G3 os confere no
    catálogo gerado; uma mutação no build não vale (ela não roda o build).
- **Pendências:** a parte 2 (o "+ Opção" e o "Instalar opção", a migração e a importação da wiki); ver também as
  dúvidas (os slots das fundações que a wiki não diz).
- **Próximo:** a fundação e as opções do cyberware, parte 2.

### Ciclo 83 (2026-10-16): a fundação e as opções do cyberware, parte 2: a migração e a importação (sessão KouArt)

O cyberware que já está nas fichas e o que chega da wiki, com a fundação e as opções do ciclo 82. Commit anterior:
`c2eaa94` (a marca `[~]`).

- **A decisão do usuário (2026-10-16):** "A migração põe cada opção instalada na primeira fundação compatível do mesmo
  ator; a que não couber fica 'sem fundação', com aviso na ficha" (o aviso é a marca "SEM FUNDAÇÃO" do ciclo 82).
- **Implementado:**
  - **o quarto passo da migração** (`migracao.mjs`, a versão 4 dos dados): no ator, cada opção instalada e sem fundação
    (que pede uma) vai na primeira fundação instalada do mesmo ator em que cabe, na ordem dos itens, pela mesma regra do
    encaixe (`regras.cabeNaFundacao`), com os slots da fundação pelo catálogo quando ela ainda não os tem; no item, a
    fundação sem slots ganha os do catálogo. A opção desinstalada, a de categoria e a que não cabe ficam; a fundação
    feita à mão (sem o catálogo) fica com os slots dela; rodar de novo não muda nada;
  - **a importação da wiki** (`wiki.mjs`): pelo criador (a montagem: o "em" de cada item), a opção de cyberware entra na
    fundação em que a wiki a pôs; pela ficha "Na mesa" (o "dentro" de cada item), também. No cyberware só entra opção de
    cyberware, e nos outros (o deck, a arma, o veículo), o que não é cyberware. A nota "Opções de cyberware: entram
    instaladas, mas este sistema ainda não liga a opção à base" saiu. A ficha que o sistema manda para a wiki já levava o
    "dentro" de quem tem itens instalados; agora a fundação leva as opções dela, e a ida e volta se mantém.
- **Testes:**
  - G1: 55 arquivos, 0 erros; G2: 0 erros;
  - G3: 93 de 97. Um teste de referência novo em `migracao.test.mjs`: um ator de antes do ciclo 82 (o Cybereye guardado
    antes do instalado, o Neural Link, o Kerenzikov, o Low Light/IR/UV, o Dartgun, o Anti-Dazzle desinstalado, o
    Techhair e um Cyberarm feito à mão com a Grapple Hand): os slots 5, 3 e 3 pelo catálogo; o Kerenzikov no Neural Link;
    o Low Light no Cybereye instalado (não no guardado); o Dartgun (3) não cabe depois do Low Light (2); os outros ficam;
    rodar de novo, nada. As 4 falhas são as das armas de 2077;
  - G4: 105 de 110, de primeira (as 5 falhas são as das armas de 2077). Dois passos mudaram, com dados a mais:
    - a migração (C1, no começo): o ator de teste ganhou um Neural Link sem os slots e um Kerenzikov sem a fundação, os
      dois instalados; migrado, o Neural Link tem 5 slots e o Kerenzikov está nele, e a pergunta lista o passo novo. Os
      documentos mudados continuam 4 (o Neural Link e o Kerenzikov são do mesmo ator);
    - a importação "Na mesa": a ficha do Foundry 12 ganhou um Neural Link com o Kerenzikov dentro (e a Humanidade máxima
      46, com os dois); importado, o Neural Link está instalado, com 5 slots e o Kerenzikov dentro;
  - **mutações:** as 5 caíram, e os arquivos voltaram (conferido pelo md5). No G3: a migração que encaixa a opção
    desinstalada (D1), a fundação guardada que recebe (D2), os slots usados que não sobem a cada opção encaixada (D3) e a
    fundação sem os slots do catálogo (D4). No G4: a importação "Na mesa" sem ligar a opção à fundação (D5).
- **Sem teste no G4:** o caminho do criador (o "em" da montagem) usa a mesma regra do "Na mesa" (`entraEm`), mas os
  personagens de teste do criador vêm dos dados da wiki do master, sem cyberware montado numa base; e a regra de que o
  cyberware não entra no deck nem na arma (nem o contrário) não tem um caso nos dados de teste.
- **Pendências:** a parte 3 ("+ Opção" e "Instalar opção").
- **Próximo:** a parte 3.

### Ciclo 84 (2026-10-16): a fundação e as opções do cyberware, parte 3: o "+ Opção" e a fundação na ficha da opção (sessão KouArt)

O "+ Foundation" e o "+ Option" da maquete "Cyberware Tab" e o "Install option" da maquete "Item Sheets". Commit anterior:
`a6f6dbae` (a marca `[~]`).

- **Implementado:**
  - **no ator** (`documentos.mjs`): `fundacoesPara(opcao)` (as fundações instaladas em que ela cabe, sem contar a própria
    opção nos slots), `opcoesPara(fundacao)` (as opções do ator que cabem nela e ainda não estão nela) e
    `instalarOpcao(opcao, fundacao)` (a opção vai nela; a guardada se instala nela, com a perda de Humanidade). A
    instalação de sempre (`fundacaoPara`) passou a usar a mesma lista;
  - **"+ OPÇÃO"** na linha da fundação instalada, na aba Cyberware: a janela lista as opções que cabem (com os slots de
    cada uma e se já está instalada noutro lugar) e instala a escolhida nela (Shift: a perda pela média); sem nenhuma, o
    recado, sem a janela. O "+ Fundação" da maquete é o "Instalar" de cada fundação (não ganhou outro botão);
  - **o seletor "Fundação"** na ficha da opção instalada de um ator: a fundação de agora, as instaladas em que ela cabe e
    "Sem fundação". A opção guardada não tem o seletor (instalar escolhe a fundação, ou o "+ OPÇÃO").
- **Testes:**
  - G1: 55 arquivos, 0 erros; G2: 0 erros; G3: 93 de 97 (as 4 falhas são as das armas de 2077);
  - G4: 106 de 111 (as 5 falhas são as das armas de 2077). Um passo novo, antes do Proteger-se: num ator de teste, o
    Neural Link e dois Cybereyes instalados, um terceiro guardado (sem o "+ OPÇÃO"); o "+ OPÇÃO" do Neural Link (com Shift)
    lista só "Kerenzikov (1 slot)" e o instala nele, com a perda pela média; de novo, o recado "Nenhuma opção de ... cabe
    em Neural Link", sem a janela; o do segundo Cybereye põe o Anti-Dazzle nele, com o primeiro ainda com espaço; na ficha
    do Low Light/IR/UV (no primeiro), o seletor tem "Sem fundação" e os dois Cybereyes, e trocar o leva ao segundo (3 de
    3); a ficha do Chyron guardado não tem o seletor. A primeira versão do passo passou; antes das mutações, ele ganhou o
    Cybereye guardado e o Anti-Dazzle no segundo (sem eles, duas das mutações sobreviveriam), e passou de novo;
  - **mutações:** as 6 caíram, e os arquivos voltaram (conferido pelo md5): o "+ OPÇÃO" que lista a opção que já está na
    fundação (E1) e as que não cabem (E2), que não põe a opção na fundação escolhida (E3), o botão na fundação guardada
    (E4), o seletor na opção guardada (E5) e o seletor com todas as fundações (E6).
- **Pendências:** nenhuma da fundação e das opções. Das maquetes, segue a lista do ROADMAP.
- **Próximo:** o próximo item do ROADMAP.

### Ciclo 85 (2026-10-17): o C8, parte 11: os nós de controle ligados à cena (sessão KouArt)

O que o NET Architect da mesa faz com o nó de controle tomado (`foundry-net-architect/scripts/ligacoes.mjs`, com a
configuração no ponto de acesso e os comandos na janela), portado para o sistema. Commit anterior: `2fed950` (ciclo 84).

- **A referência (o NET Architect da mesa):** cada ponto de acesso diz, para cada nó de controle da arquitetura, que
  portas, luzes, sons e tokens ele comanda (as ligações ficam no ponto: a mesma arquitetura serve para cenas
  diferentes). Quem toma o nó (o Control) comanda pela janela, 1 Ação NET por comando: a porta abre, fecha e tranca; a
  luz e o som ligam e desligam; o token, o jogador assume até desconectar (vira dono dele), e ele volta ao dono de sempre
  quando o netrunner sai ou quando a arquitetura reinicia.
- **Implementado:**
  - **`scripts/netrun/ligacoes.mjs`** (novo, o port do da mesa): o que a cena tem para ligar, com um nome legível (a
    porta e a luz pela posição; os tokens dos inimigos da NET ficam de fora), as ligações de cada nó, a situação de cada
    coisa com os comandos, o comando (no mestre ativo) e a devolução dos tokens assumidos. A devolução troca a permissão
    inteira (`ForcedReplacement`, como a janela de permissões do Foundry 14): o "ownership.<id>" com o `_del` não passa na
    validação do Foundry 14 (foi o que o primeiro G4 mostrou);
  - **o motor** (`estado.mjs`): os tokens assumidos no estado do ponto; a operação `acionar` (o nó tem de estar no andar
    do netrunner e tomado; a ligação tem de ser daquele nó; a Ação NET em combate; o texto no registro); a devolução
    quando o netrunner sai (com segurança, de forma insegura, ou com o token apagado), quando as defesas reiniciam, no
    "Reiniciar" do mestre e com o Tile apagado;
  - **a configuração do ponto** (`ponto-de-acesso.mjs` e `ponto.hbs`): o campo "Nós de controle ligados à cena", com
    cada nó de controle da arquitetura salva (o andar, o ramo, o DV e a descrição), o que já está ligado (com "Mostrar
    na cena" e "Desligar") e a lista do que a cena tem, com "Ligar". O que já foi digitado na janela fica ao ligar e
    desligar (o rascunho, como no da mesa); trocar de arquitetura pede salvar antes de ligar;
  - **a janela da NET:** com o nó tomado no andar do netrunner, cada coisa ligada com a situação e os comandos (abaixo
    da caixa do comando narrado); a janela se redesenha também quando o mestre muda a porta, a luz ou o som pela cena.
- **Testes:**
  - G1: 57 arquivos (2 novos: o módulo e o teste), 0 erros; G2: 0 erros;
  - G3: 96 de 100. Um arquivo novo, `tests/sistema/ligacoes.test.mjs`, com 3 testes de referência sobre uma cena de
    mentira: o que a cena oferece e com que nome (só a parede com porta; sem os inimigos da NET), as ligações de cada nó
    na ordem e a situação de cada coisa com os comandos (a porta fechada, aberta e trancada; a luz; o som; o token com o
    dono e assumido; o objeto que saiu da cena). As 4 falhas são as das armas de 2077;
  - G4: 107 de 112 (as 5 falhas são as das armas de 2077). Um passo novo, depois do andar e das habilidades na NET: o
    andar 1 tem dois nós de controle (a portaria e a garagem). O mestre põe na cena uma porta, duas luzes e a torreta (um
    ator sem dono) e, na configuração do ponto, liga a porta, a primeira luz e a torreta à portaria e a segunda luz à
    garagem ("Nada ligado" antes; os chips "Porta 1 (1400, 1200)", "Luz 1 (1500, 1200)", "Teste Torreta" e a luz em
    (1600, 1200); salvo, as quatro no ponto, cada uma com o seu nó), e desmarca o reinício das defesas. No jogador, antes
    do Control, nenhuma ligação na janela; o Control (11 contra a DV 6) toma a portaria, e a janela mostra só as três
    dela com a situação e os comandos ("fechada Abrir Trancar", "ligada Desligar", "com o dono de sempre Assumir"; a luz
    da garagem, não). Abrir, Desligar e Assumir vão ao registro; a porta abre, a luz apaga e o jogador fica dono da
    torreta. Desconectado, a torreta volta ao dono de sempre (sem a permissão do jogador) e o estado fica sem nenhum token
    assumido: sem o reinício, quem devolve é a desconexão;
    - rodou cinco vezes: na primeira, a devolução com o `_del` falhou na validação do Foundry 14 (o erro no console, e o
      jogador continuou dono: um defeito de verdade, corrigido com o `ForcedReplacement`), e o teste lia a linha inteira
      da janela, que não tem espaço entre as partes; na segunda, só o teste: as regex do lado do Node com as barras
      dobradas, como se fossem para o navegador; a terceira passou, mas, com um nó só e o reinício ligado, duas mutações
      sobreviveram (ver abaixo); na quarta, com a garagem e sem o reinício, o passo novo passou, e um passo antigo, o do
      encontro com o Black ICE, falhou uma vez ("reading 'control'"): o `montarNet` do cenário dava o `control` no token
      do jogador sem esperar o token chegar ao canvas dele (o do mestre já esperava). O mesmo passo passou nas outras
      rodadas; agora o jogador espera o token e o Tile antes. A quinta passou;
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5). No G3: a porta que oferece o comando do estado
    em que já está (F1) e os inimigos da NET na lista do que ligar (F2). No G4: a janela que mostra as ligações do nó que
    ninguém tomou (F3) e quem desconecta sem devolver o token (F4), as duas só depois do reforço (com um nó por andar, a
    janela já esconde tudo antes do Control; com o reinício, a arquitetura devolve o token pelo outro caminho), o "Ligar"
    que não liga (F5), o salvar que perde as ligações novas (F6), o "Abrir" que tranca (F7) e o "Assumir" que não dá o
    token (F8).
- **Pendências:** o C8 segue com os arquivos do Eye-Dee e o editor visual, e o Scanner e a parede. O "Tirar o ponto" da
  configuração ainda apaga as flags com o "-=" (o Foundry 14 avisa que saiu; ver no próximo ciclo da NET).
- **Próximo:** o C8, parte 12.

### Ciclo 86 (2026-10-17): a sessão Codex, o AGENTS.md e a trava dos testes (sessão KouArt)

O pedido do usuário: o Codex ajuda no projeto, como uma terceira sessão, no VS Code deste PC (decisão do usuário,
2026-10-17). Commit anterior: `d462b348` (ciclo 85).

- **O que foi combinado com o usuário:**
  - a divisão é por item do ROADMAP, cada sessão com o ciclo inteiro do seu (código, testes, mutações, documentação e
    push);
  - a NET (C8 e C9) fica com a sessão KouArt, e a sessão Codex pega itens fora dela;
  - o Codex trabalha num clone próprio (`Cyberpunk-Fieldbook-codex`, na branch `sistema-v14`);
  - as regras dos agentes ficam num arquivo só.
- **O que ficou de fora:**
  - dividir por tipo de trabalho (uma IA na interface, outra nos testes e nos dados);
  - os agentes mudarem os arquivos de regra da wiki (`system-*.js`), os módulos do Foundry 12 da mesa e os scripts de
    publicar.
- **Implementado:**
  - **`AGENTS.md`** (novo, na raiz): as instruções para qualquer agente de IA, em seis partes:
    - o repositório (o master da wiki e a `sistema-v14`);
    - as sessões e a divisão;
    - o ciclo;
    - os portões;
    - o G4 neste PC;
    - o que nunca se toca;
  - **`CLAUDE.md`** (novo, na raiz): só importa o `AGENTS.md`. É uma fonte só, para o Claude Code e o Codex não lerem
    regras diferentes;
  - **`tests/lib/trava.js`** (novo) e o **`tests/rodar.js`:** um teste com navegador por vez no PC. As sessões deste PC
    dividem o Foundry 14 de teste, a pasta descartável e as portas (a 31014, a 8765 e as do Edge). O `rodar.js` pega a
    trava antes de subir os servidores. A trava é o arquivo `%LOCALAPPDATA%\FieldbookTeste\testes.trava`, com o
    processo, a pasta e a hora:
    - quem chega avisa ("Outro teste está rodando", com a pasta do outro) e espera;
    - a trava de um processo que já não existe (um teste interrompido) vale como solta;
    - a ilegível vale como solta depois de um minuto;
    - a trava sai na saída do processo, e só se ainda for dele;
  - **o G2** passa a incluir o `tests/lib/trava.js` (na configuração do ESLint, no bloco CommonJS, e nos comandos do
    README, do QUALITY_GATES e do `eslint.config.mjs`);
  - **o ROADMAP:** "As sessões no mesmo plano" (eram duas), com a divisão, uma pasta por sessão e a trava;
  - **o QUALITY_GATES:** a regra da trava, ao lado da da mesa do servidor em uso.
- **Testes:**
  - G1: 59 arquivos (2 novos: a trava e o teste dela), 0 erros; G2: 0 erros;
  - G3: 101 de 105. Um arquivo novo, `tests/sistema/trava.test.mjs`, com 5 testes, cada um sobre um arquivo numa pasta
    temporária (a trava de verdade não entra):
    - sem ninguém, pega a trava na hora e soltar apaga;
    - com a trava de um processo vivo, espera ela sair e avisa uma vez, com a pasta do outro;
    - a de um processo morto vale como solta, sem aviso;
    - a ilegível espera, e a de mais de um minuto vale como solta;
    - soltar não apaga a trava que já é de outro.

    As 4 falhas são as das armas de 2077;
  - G4: 107 de 112 (as 5 falhas são as das armas de 2077), na mesma rodada da prova abaixo;
  - **a prova da trava no `rodar.js`:**
    - um processo à parte pegou a trava por 60 s, e o G4 começou 3 s depois;
    - aos 30 s, a saída do G4 era só o aviso ("Outro teste está rodando", com a pasta e a hora do outro), e as portas
      8765 (a wiki de teste) e 31014 (o Foundry de teste) estavam fechadas;
    - com a trava solta, o G4 pegou a dele e rodou inteiro;
    - no fim, a trava tinha saído;
  - **mutações:** as 7 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - todo processo parece morto (T1);
      - sem o `wx`, quem chega escreve por cima (T2);
      - a trava ilegível vale como solta na hora (T3) ou nunca vale (T4: o teste estoura o prazo de 5 s e conta como
        falha, "cancelled", com a saída 1);
      - soltar apaga a trava de outro (T5);
      - o aviso a cada volta da espera (T6).
    - **À mão, a T7, o `rodar.js` sem a trava:** com a trava de outro processo vivo, a wiki de teste subiu na 8765 em
      6 s. Depois, só a árvore de processos dele parou (pelo PID: o `node server.js` da wiki do usuário tem a mesma linha
      de comando).
  - **Um G4 interrompido:** neste ciclo, o primeiro G4 do reforço do ciclo 85 foi parado no meio. Ficaram rodando o
    `rodar.js`, o Foundry de teste e os dois Edge, e foi preciso parar todos e apagar os perfis. A regra foi para o
    QUALITY_GATES e para o `AGENTS.md`.
- **Pendências:** nenhuma da trava.
- **Próximo:** o C8, parte 12, na sessão KouArt. A sessão Codex começa pelos itens fora da NET.

### Ciclo 87 (2026-10-17): mãos livres (o C12; sessão Codex)

O C12 do ROADMAP, reservado e enviado antes de começar (`4404fb3`). Commit anterior: `4404fb3` (a reserva).

- **A referência e a decisão do usuário:**
  - CORE 0.92.4, `modules/actor/cpr-actor.js`: `_getHands`, `_getFreeHands` e `canHoldWeapon`: duas mãos mais os
    efeitos, menos as mãos das armas equipadas; sem `handsReq`, não desconta. O CORE só avisa; o C12 pede impedir a
    equipagem sem mãos;
  - a wiki (`system-rules.js`, Corpo a corpo, p. 175–176, e Escudos, p. 183–184) permite arma branca de duas mãos com
    uma para BODY 8+ e diz que escudo ocupa uma mão. O usuário confirmou seguir a wiki nos dois casos, e o CORE na
    conta básica (2026-10-17). Não houve mudança nos arquivos de regra da wiki.
- **Implementado:**
  - `regras.mjs`: `maosDaArma` e `maosLivres`, com o limiar de BODY 8 só na arma branca de duas mãos, zero mãos
    preservado, os bônus dos efeitos e cada escudo equipado ocupando uma mão, inclusive sem HP;
  - `documentos.mjs`: `AtorCPR.maosLivres` e `podeEmpunhar`; no `ItemCPR._preUpdate`, a tentativa de equipar arma ou
    escudo que não cabe deixa o item guardado e avisa. Usa também as mãos propostas no mesmo formulário. Guardar,
    editar outro campo e salvar de novo uma arma já equipada continuam possíveis, inclusive em excesso;
  - `ficha-item.mjs`: depois do envio, a caixa Equipada volta ao estado gravado. O Foundry descarta um diff vazio
    depois do `_preUpdate`: a recusa sozinha deixava a caixa marcada e atrapalhava a próxima edição;
  - `ficha-personagem.mjs`: a arma ou o escudo arrastado já equipado chega por um clone efêmero guardado e tenta
    equipar pela mesma conferência, sem alterar a origem. No capanga (`ficha-capanga.mjs`), essa tentativa não se
    repete; o item do compêndio guardado continua tentando equipar ao chegar, e fica guardado se não couber.
- **Testes:**
  - G1: 60 arquivos, 0 erros; G2: 0 erros;
  - G3: 105 de 109 (as 4 falhas conhecidas das armas de 2077). O novo `tests/sistema/maos.test.mjs` tem 4 testes de
    referência: as duas mãos e as armas guardadas/equipadas, zero mãos e exigência ausente; os bônus e o excesso
    negativo; BODY 7 e 8 na arma branca, sem reduzir a de tiro; o escudo sozinho e com arma;
  - G4: 108 de 113 (as 5 falhas conhecidas das armas de 2077). O passo novo lê o estado depois de cada ação: duas
    pistolas aceitas, a terceira e o rifle recusados, guardar e equipar de novo; a caixa do item desmarcada após a
    recusa e o nome editado na mesma ficha; a atualização idempotente; a arma de zero mãos; o Artificial Shoulder
    Mount real do catálogo (+2 mãos), o rifle aceito, o cyberware desinstalado e as armas guardadas mesmo em excesso;
    o rifle arrastado para o capanga e a pistola recebida guardada; a lâmina de duas mãos recusada com BODY 7 e aceita
    com BODY 8; o escudo equipado e sem HP, o rifle recusado com ele e o escudo recusado com as mãos cheias; uma
    origem já equipada arrastada para personagem e capanga cheios, guardada nos dois e intacta na origem;
  - uma primeira rodada completa, antes das duas regras confirmadas pelo usuário, também ficou em 108 de 113.
    O passo ampliado passou sozinho no Foundry antes das mutações e na rodada completa final;
  - a primeira rodada final deu 107 de 113 por uma corrida no passo antigo de Agarrar: as marcas já tinham chegado,
    mas ele leu o cartão do empate anterior. O motor cria as marcas antes de publicar o cartão. A espera do teste
    passou a exigir também o segundo cartão, mantendo todas as asserções; a rodada completa foi repetida;
  - **mutações:** as 16 caíram, uma por vez, e os arquivos voltaram exatamente (md5 conferido):
    - no G3: três mãos de base (H1), ignorar os bônus (H2), descontar arma guardada (H3), exigir BODY 9 (H4),
      reduzir também a arma de tiro (H5), ignorar escudos (H6) e transformar zero mãos em uma (H7);
    - no Foundry: recusar o limite exato (H8), pular a conferência (H9), o ator ignorar o escudo (H10) ou o BODY
      (H11), deixar a caixa marcada (H12), receber a origem equipada sem o clone guardado (H13), tentar duas vezes no
      capanga (H14), o ator ignorar o bônus real (H15) e conferir de novo a arma já equipada (H16).
    O executor temporário usa o passo original, com o `rodar.js`, a trava e a checagem da mesa; uma rodada sem
    mutação passou antes. A saída antecipada atravessa o `finally` do cenário. Não substitui o G4 completo.
- **Limites:** a criação e a importação preservam o estado recebido dos itens, inclusive um excesso antigo; guardar
  permite resolvê-lo. A conferência é por item: operações coletivas de equipagem por macro não reservam mãos entre
  os itens. Lesões, agarrão e cyberarmas continuam com as automações que já tinham; as cyberarmas ficam no C11.
- **Pendências:** nenhuma do C12 nas fichas.
- **Próximo:** outro item fora da NET, conforme o ROADMAP.

## Procedimento da migração da campanha (a fazer numa pausa entre arcos, com o usuário)

O mundo antigo não abre no Foundry 14: o Cyberpunk RED - CORE 0.92.4 só vai até o Foundry 12. Por isso a campanha
passa para um mundo novo, e o Foundry 12 fica instalado ao lado, só para consulta.

1. **Backup completo:** com a mesa vazia, rode no servidor `sudo bash servidor/backup-completo.sh` (o Foundry para alguns
   segundos). Baixe o `.tar` para o PC e confira o `.sha256`. O primeiro foi feito em 2026-10-12.
2. **No Foundry 12:** confirme que "Mandar a ficha para a wiki" está ligado e abra o mundo como mestre. Ao entrar, o
   módulo manda a ficha de todos os atores da wiki. Confira na wiki que cada personagem mostra "Na mesa" com a data de
   hoje.
3. **Pacote das cenas:** `node foundry-sistema/migracao/pacote-das-cenas.mjs --data /srv/foundry/data/Data --mundo <id>
   --saida /srv/backups/pacote-das-cenas`. O script só lê o mundo.
4. **Feche o mundo do Foundry 12 e desligue nele o cpr-2077** (Gerenciar módulos), para ele não mandar mais a ficha nem
   entregar pedidos. Depois do passo 5, a wiki recusa a ficha e a entrega do ator antigo; desligar evita o resto.
5. **No Foundry 14, num mundo novo com este sistema,** de preferência com o mesmo id do antigo:
   - o endereço da wiki se deduz sozinho em `mesa.<domínio>`;
   - crie os usuários com os mesmos nomes;
   - na aba de Atores, abra "Personagens da wiki" e, para cada personagem, escolha o dono e clique em "Importar da mesa"
     (sem a janela: `game.system.api.wiki.importarDaMesa('<id na wiki>', '<id do usuário dono>')`, como mestre);
   - leia os avisos que a janela mostra no alto: um item que não achou o catálogo precisa ser criado à mão.
6. **As cenas:** copie o módulo `arquivo-da-mesa` para `Data/modules`, ligue-o no mundo novo e importe a Aventura do
   compêndio "Arquivo da mesa". Os tokens vêm sem ator: ponha os atores novos por cima.
7. **Confira cada ficha** contra a da mesa na wiki: HP, dinheiro, itens, munição, lesões e Humanidade.
8. **Fora deste procedimento:** os NPCs (atores do CORE), as arquiteturas da NET feitas à mão no mundo antigo (itens do
   CORE) e as macros do mundo antigo. Estão no backup completo, e o Foundry 12 os abre. Um NPC da campanha se refaz com o
   tipo Capanga (ciclo 36); as arquiteturas da campanha (as do documento da wiki) já vêm no compêndio "Arquiteturas da
   NET" (ciclo 48).
