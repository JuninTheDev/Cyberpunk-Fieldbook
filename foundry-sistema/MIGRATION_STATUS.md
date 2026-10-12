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
| CORE | os bônus de Role nas perícias (o Moto do Nomad; a especialização do Face; o Investigator do Lawman) | portados no ciclo 23 os que valem sempre (o Moto e a especialização do Face, com a especialização vinda da wiki); o Investigator do Lawman e o Netrunner de 2077 esperam a janela de rolagem |
| CORE | as rolagens das Roles (Impacto Carismático, Credibilidade, Barganha, as do Tech, Cirurgia e Tecnologia Médica) | falta |
| CORE | a janela de rolagem (modificador avulso, os modificadores comuns do livro, os efeitos situacionais; Ctrl pula) | portada nos ciclos 24 (os testes), 25 (o ataque e a iniciativa) e 27 (no computador do jogador, a defesa, o dano e o Death Save; na ficha, o dano e o Death Save) |
| CORE | Facedown; consertar a armadura; rolar lesão à mão; macros na barra; juntar itens iguais | falta |
| CORE | ficha de capanga, Black ICE, demônio e contêiner (loja, saque, esconderijo) | falta |
| CORE | a Sorte na janela de rolagem | portada no ciclo 20: preparada na ficha (− e +), entra no próximo teste e sai da Sorte |
| CORE | o ledger de Eurodólares, IP e Reputação | portado no ciclo 21, o extrato: somar, subtrair e definir com o motivo, o histórico com quem mudou e o mestre tirando linhas; as diferenças estão nas dúvidas |
| Fluxo de Combate | ataque, defesa às cegas, dano na ficha, mirado, autofogo, supressivo, cartucho, explosivo, Lesão Crítica, Death Save no turno, Desfazer, jogador rolando o dano | portado |
| Fluxo de Combate | quem vê o cartão, texto e animação no token, Reflex Tuner | falta |
| cpr-2077 | importação da wiki | portada para os itens: tudo o que a loja da wiki vende (CORE e 2077) e os veículos da família, com a montagem (programas e hardware no deck, acessórios na arma, upgrades no veículo). Falta pôr as opções de cyberware na base |
| cpr-2077 | o conteúdo de 2077 (armas, cyberware, netrunning) | portado no ciclo 12, da própria wiki, com os números do módulo |
| cpr-2077 | os modos das armas de 2077 (ricochete, carga e rajada Tech, teste Smart) e as três configurações | portados no ciclo 17 |
| cpr-2077 | as regras de cada modelo: os dois canos da Palica, os dois alvos da Kappa, a coronha da Dian | portadas no ciclo 18, com as que o Foundry 12 não tinha e o texto deixa claras (os dois cartuchos da Testera, o autofogo de 7 balas da Lexington); as que esperam a mesa estão nas dúvidas |
| cpr-2077 | volta da ficha para a wiki ("Na mesa") | portada no ciclo 13, no mesmo formato |
| cpr-2077 | pedidos da loja | portada no ciclo 14: a entrega dos aprovados (a aprovação é na página do personagem na wiki) |
| cpr-2077 | janela "Personagens da wiki" | portada no ciclo 16: importar, importar da mesa, abrir a ficha, aprovar e recusar pedidos |
| cpr-2077 | avisos de envio, a campanha da wiki de cada mundo, crossover entre campanhas, Atualizar da wiki, retrato | falta |
| NET Architect | tudo | falta |
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
4. **Falta a NET,** que a campanha usa. As armas de 2077 entraram nos ciclos 17 e 18 (os modos de cada classe e as
   regras de cada modelo que o Foundry 12 tinha); as de alguns modelos esperam a decisão da mesa (dúvidas abaixo).
5. **Sem migração de dados entre versões deste sistema** (ainda não há mundo real para migrar).

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
  | Rolagens | Facedown (COOL + Reputação + 1d10) | falta | P2 |
  | Roles | os bônus nas perícias | os que valem sempre no ciclo 23; os situacionais, com a janela | P1 |
  | Roles | as rolagens (Impacto Carismático, Credibilidade, Barganha, as do Tech, Cirurgia e Tecnologia Médica) | falta | P2 |
  | Combate | Briga e Artes Marciais (dano pelo BODY); o cyberware que é arma; a arma sob o cano e a baioneta | falta | P2 |
  | Ficha | consertar a armadura com um clique; rolar lesão crítica à mão; macros na barra | falta | P2 |
  | Inventário | usar droga; juntar itens iguais e dividir pilhas; mãos livres ao equipar | falta | P2 |
  | Munição | o EMP nos itens eletrônicos (a macro "Get EMP'd") | falta | P2 |
  | Cyberware | a base com os slots das opções | falta | P3 |
  | NET | Interface, programas com REZ, Black ICE e demônios como atores, as arquiteturas (as tabelas e a cena do CORE, o NET Architect) | falta | P3 |
  | NPCs e mestre | a ficha de capanga; o contêiner (loja, saque, esconderijo); o Painel Tático | falta | P3 |
  | Conteúdo | o Black Chrome e os DLCs do CORE 0.92.4; as macros e as cenas | não convertidos (a loja da wiki não vende; a migração avisa) | P3 |
  | Mesa | a régua de DV e o DV no HUD do token; "Hardened" (fora da wiki) | falta | P4 |

- **Já está aqui e bate com o Foundry 12:** a ficha, os atributos e as perícias (com as de família), a iniciativa
  (1d10 + REF + bônus, sem crítico, como o padrão do CORE), os testes com o crítico do d10, o Death Save, o combate do
  Fluxo, a armadura (SP do local, ablação, pesada, arma branca), o escudo, as lesões, o cyberware com a Humanidade, as
  munições, os upgrades do livro básico (pente, ataque, SDP e assentos: os únicos modificadores que o conteúdo do CORE
  usa, fora a luneta e as armas sob o cano), os veículos, o cyberdeck com os programas (sem a NET), o extrato, a Sorte,
  o Lifepath e os efeitos pelo uso.

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

- **Netrunner de 2077: quais testes são "técnicos"?** A wiki diz que ele "soma o Rank de Interface em todos os testes
  técnicos enquanto estiver correndo a NET", mas não lista as perícias. A janela de rolagem oferece o bônus (desligado)
  em todo teste de perícia, e a mesa decide quando marcar. Se a mesa quiser uma lista (as perícias de TECH, por
  exemplo), é só trocar em `regras.situacionaisDeRole`.

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

## Procedimento da migração da campanha (a fazer numa pausa entre arcos, com o usuário)

1. **Backup:** o mundo do Foundry 12 inteiro (a pasta do mundo no servidor) e os dados da wiki (os personagens).
2. **No Foundry 12:** confirme que "Mandar a ficha para a wiki" está ligado e abra o mundo como mestre. Ao entrar, o
   módulo manda a ficha de todos os atores da wiki. Confira na wiki que cada personagem mostra "Na mesa" com a data de
   hoje.
3. **Feche o mundo do Foundry 12,** para ele não mandar mais a ficha da mesa.
4. **No Foundry 14, num mundo novo com este sistema:** crie os usuários dos jogadores e configure o endereço da wiki.
   Na aba de Atores, abra "Personagens da wiki" e, para cada personagem, escolha o dono e clique em "Importar da mesa".
   Leia os avisos que a janela mostra no alto: um item que não achou o catálogo precisa ser criado à mão. Sem a janela:
   `game.system.api.wiki.importarDaMesa('<id na wiki>', '<id do usuário dono>')`.
5. **Confira cada ficha** contra a da mesa na wiki: HP, dinheiro, itens, munição, lesões e Humanidade.
6. **Fora deste procedimento:** os NPCs, as cenas, os diários e as macros do mundo antigo (o Foundry 14 abre mundos do
   12, mas os atores e os itens do CORE não existem neste sistema).
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
