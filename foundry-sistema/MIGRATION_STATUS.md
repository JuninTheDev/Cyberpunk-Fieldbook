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
| CORE e wiki | falha crítica da arma (C13): os quatro efeitos configuráveis na arma ruim, informados no cartão do ataque | portado no ciclo 88 (sessão Codex) |
| CORE e wiki | usar droga com prazo, secundário e vício; scanners que não acumulam; lanterna e sinalizador no token (C16) | portado no ciclo 124 (sessão Codex), com os 100 m confirmados pelo usuário |
| CORE | juntar itens ao soltar e dividir pilhas de munição, equipamento, roupa e droga (C17) | portado no ciclo 129 (sessão Codex), com o critério literal do CORE confirmado pelo usuário |
| CORE | Humanidade máxima pelo cyberware | portado no ciclo 1 (10 × EMP, −2 por peça com perda, −4 por borgware) |
| CORE | Consciência de Combate do Solo | portada no ciclo 3, como a wiki descreve (o Ponto Fraco e a Deflexão uma vez por rodada; ver as dúvidas) |
| CORE | os bônus de Role nas perícias (o Moto do Nomad) | portado no ciclo 23. Com as Roles do RED (ciclo 33), saíram a especialização do Face e os situacionais de 2077 (o Investigator, o Netrunner) |
| CORE | as rolagens das Roles (Impacto Carismático, Credibilidade, Barganha, as do Tech, Cirurgia e Tecnologia Médica) | portadas nos ciclos 34 e 35, com as Roles do RED: pelo item de Role do CORE e pelo texto da wiki (a Barganha é a pechincha do Fixer; o Backup do Lawman, pela wiki). A Interface do Netrunner é o C5 |
| CORE | a janela de rolagem (modificador avulso, os modificadores comuns do livro, os efeitos situacionais; Ctrl pula) | portada nos ciclos 24 (os testes), 25 (o ataque e a iniciativa) e 27 (no computador do jogador, a defesa, o dano e o Death Save; na ficha, o dano e o Death Save) |
| CORE | Facedown | portado no ciclo 39, com a penalidade de ferimento, pela wiki (ver as dúvidas) |
| CORE e wiki | armadura por local, ablação de todas as camadas, Desfazer por item e conserto pela ficha (C18) | portado no ciclo 137 (sessão Codex); o conserto na ficha do item já existia desde o ciclo 70 |
| CORE | SP monitorado na barra, escolha da peça por local, árvore no diretório e imagens padrão por tipo (C34.3) | portados no ciclo 160 (sessão Codex); o track não muda a proteção do C18 |
| CORE e wiki | configurações de criação de itens, perícias do capanga, lesões repetidas e confirmação de exclusão (C34.2) | portadas nos ciclos 158, 159 e 161; reroll continua padrão pela wiki e a confirmação é por cliente |
| wiki e CORE | Correr pela ficha: Movimento extra pela Ação, com confirmação e cartão (C41, parte 1) | portado no ciclo 162 (sessão Codex); usa MOVE preparado, com o gasto de ações confirmado pela mesa |
| wiki e decisão do usuário | escudo humano a partir do agarrão, reação, dano no receptor e proteção de cadáver (C41, parte 2) | ciclo 163 (sessão Codex); vítima recebe uma vez na área, com Desfazer por UUID e PV de cadáver persistentes |
| wiki e decisão do usuário | reconhecimento por Reputação ao conhecer alguém (C41, parte 3) | ciclo 164 (sessão Codex); d10 simples estritamente abaixo do nível, má fama pela magnitude, sem mudar o Facedown |
| CORE e wiki | rolar lesão à mão; paliativo e tratamento nas fichas de personagem e capanga (C19) | portado no ciclo 142 (sessão Codex), com a decisão sobre Death Save nas dúvidas |
| wiki | os perigos do ambiente (C38): a queda, o fogo, a eletrocução, o afogamento e a asfixia, o veneno, a droga como arma e a radiação | portados no ciclo 156 (sessão Junin, com o Codex); o CORE 0.92.4 não tem nenhum (ver as dúvidas) |
| wiki | os veículos fora do dano (C40): a direção sob pressão, as manobras, a batida e desviar a pé; o tipo do veículo | portados no ciclo 157 (sessão Junin, com o Codex); o CORE 0.92.4 não automatiza nenhum (ver as dúvidas) |
| CORE e wiki | moradia, estilo de vida, moda e Trauma Team (o `lifestyle`; C22) | portados no ciclo 140: os campos, a importação da wiki e da mesa, a ficha "Na mesa" e o "Pagar o mês" (a regra do criador da wiki) |
| CORE | o `/red` no chat, a DV no HUD do token e na régua, a iniciativa crítica (C26, partes 1 a 3) | portados no ciclo 144 (o `/red` soma todos os modificadores; ver as dúvidas) |
| wiki e CORE | a terapia e a ciberpsicose (C21) | portadas no ciclo 145: a terapia pelo Medtech, o vício tirado por um ano, o estado mental e o aviso, a Humanidade negativa (ver as dúvidas) |
| cpr-2077 | a campanha da wiki de cada mundo e o crossover entre mundos do Foundry 14 (C27, parte 2) | portados no ciclo 146 (o crossover usa a rota da wiki com um envelope; ver as dúvidas) |
| CORE | macros na barra (a arma, a perícia e o item arrastados da ficha) e os favoritos (o alfinete do item e da perícia) | portados no ciclo 139 (C20): o favorito vai para o painel da aba Combate (ver as dúvidas) |
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
| cpr-2077 | os modos das armas de 2077 (ricochete, carga e rajada Tech, teste Smart) e as três configurações | portados no ciclo 17, pelas regras do suplemento de fã. Com o Mission Kit (ciclo 31), a wiki trocou essas regras pelas do Kit, e os modos ainda não o seguem (ROADMAP, C29). A arma Smart segue o Kit desde o ciclo 110 (a ligação e o +1), e as duas configurações do ataque Smart saíram; o Power, desde o 114 (o Ricochete do Kit e o crítico de 10); a Tech, desde o 115 (a carga do Kit), e saiu a última configuração; as regras de cada modelo, desde o 116 |
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
| NET Architect | os arquivos copiados pelo Eye-Dee (o diário, a permissão do dono, o aviso no chat, o "Abrir o arquivo") | portados no ciclo 89 (o C8, parte 12) |
| NET Architect | o editor visual (a grade, arrastar para mover e trocar, o "+" para criar) | portado no ciclo 90 (o C8, parte 13), no mapa da ficha da arquitetura: a tabela das linhas faz o papel do painel; sem o "Desfazer", porque cada mudança grava na hora, como o resto da ficha |
| NET Architect | o Scanner (o botão no HUD do token, o raio do resultado × 10 m, o oculto acima do DV do Scanner, quem achou passa a vê-lo) | portado no ciclo 91 (o C8, parte 14); a parede no meio, que o da mesa não conferia, barra a conexão pela wiki |
| CORE | o contêiner (a loja, o saque e o esconderijo: os tipos com as permissões, a ficha, pôr e pegar, a trava) | portado no ciclo 122 (o C24, parte 1); a loja que vende no 130 (parte 2); a loja que compra no 132 (parte 3): o C24 terminou |
| Painel Tático | tudo (o retrato por estado, os vitais, os atributos, as armas, as ações, os painéis, o estilo de cada jogador) | portado no ciclo 125 (o C25); o retrato do Foundry 12 não vem na migração (ver as dúvidas) |

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
  | Combate | Briga e Artes Marciais (dano pelo BODY); o cyberware que é arma; a arma sob o cano e a baioneta | a Briga e as Artes Marciais nos ciclos 131 (o dano pelo BODY) e 141 (os movimentos especiais; C10); o cyberware que é arma do CORE no ciclo 133 (C11, parte 1) e o do Kit no 134 (os números; as regras próprias faltam); o acessório que é arma (a baioneta e as armas sob o cano) no 135; os slots, o carregador e o Smartgun Link no 136; as regras do Kit que são conta no 138 (o C11 terminou); faltam os movimentos especiais | P2 |
  | Ficha | consertar a armadura com um clique; rolar lesão crítica à mão; macros na barra | falta | P2 |
  | Inventário | usar droga; juntar itens iguais e dividir pilhas; mãos livres ao equipar | falta | P2 |
  | Munição | o EMP nos itens eletrônicos (a macro "Get EMP'd") | falta | P2 |
  | Cyberware | a base com os slots das opções | falta | P3 |
  | NET | Interface, programas com REZ, Black ICE e demônios como atores, as arquiteturas (as tabelas e a cena do CORE, o NET Architect) | a Interface e os programas nos ciclos 40 a 42; o Black ICE e o demônio como atores e o Black ICE próprio do netrunner nos ciclos 43 a 46; a arquitetura (o item e o mapa) no 47; falta o NET Architect (o C8) | P3 |
  | NPCs e mestre | a ficha de capanga; o contêiner (loja, saque, esconderijo); o Painel Tático | o capanga nos ciclos 36 e 37; o contêiner desde o 122 (o C24, por partes); o Painel Tático no 125 | P3 |
  | Conteúdo | o Black Chrome e os DLCs do CORE 0.92.4; as macros e as cenas | não convertidos (a loja da wiki não vende; a migração avisa) | P3 |
  | Mesa | a régua de DV e o DV no HUD do token; "Hardened" (fora da wiki) | falta | P4 |

- **Já está aqui e bate com o Foundry 12:** a ficha, os atributos e as perícias (com as de família), a iniciativa
  (1d10 + REF + bônus, sem crítico, como o padrão do CORE), os testes com o crítico do d10, o Death Save, o combate do
  Fluxo, a armadura (SP do local, ablação, pesada, arma branca), o escudo, as lesões, o cyberware com a Humanidade, as
  munições, os upgrades do livro básico (pente, ataque, SDP e assentos: os únicos modificadores que o conteúdo do CORE
  usa, fora a luneta e as armas sob o cano), os veículos, o cyberdeck com os programas (sem a NET), o extrato, a Sorte,
  o Lifepath e os efeitos pelo uso.

## Dúvidas de regra e discrepâncias

- **C40, os veículos fora do dano (2026-10-23, sessão Junin, com o Codex):** a fonte é só a wiki (`system-rules.js:538`,
  "Veículos", p. 189–192): o CORE 0.92.4 não automatiza a direção, as manobras nem a batida. As decisões:
  - **do usuário (2026-10-23):** o Traumatismo Cervical da batida vem com os +5 direto no HP (como a Perna Quebrada da
    queda); a direção sob pressão é cobrada sozinha, no começo do turno de quem dirige, com o jogador rolando no
    computador dele; e a batida entra na janela de perigos: os tokens selecionados estão no veículo que bateu, e os alvos
    marcados (T) são o que foi atingido;
  - **o tipo do veículo** (terrestre, aéreo ou marítimo, para a perícia de controle e as manobras do aéreo) é um campo
    novo do item. Vazio, vale o nome em inglês dos 14 veículos do CORE (os da família do Nomad são os mesmos) e, sem
    nada, terrestre;
  - **a soma "REF + perícia"** é a do `partesDaPericia` (com as penalidades e os situacionais ligados, como a esquiva da
    ficha). O controle vem depois do Death Save e do "Sem ar" do turno, uma vez por turno;
  - **perder o controle** só dá o cartão, com o botão "Batida" do mestre: a wiki não diz o que acontece;
  - **a batida:** cada veículo e cada pessoa a pé rolam os próprios 6d6; o veículo pelo SDP menos o SP (como o C15); a
    pessoa a pé pela armadura (como a queda), depois de falhar o DEX + Evasão contra DV13. O passageiro (no veículo, sem
    dirigir) só ganha a lesão; quem já tem o Traumatismo Cervical não ganha outro nem os +5;
  - **um erro no meio** (o token apagado durante a rolagem de alguém) vira uma nota na linha dele; o cartão sai do mesmo
    jeito, com o Desfazer do que aconteceu. Vale também para os perigos do C38;
  - **fica de fora:** as mãos no volante e os Plugs de Interface, o topo da iniciativa e o MOVE do veículo (o C15 deixou
    com o mestre). E o Death Save do turno ainda não roda para o combatente sem token (só pelo ator), como antes do C38.

- **C38, os perigos do ambiente (2026-10-23, sessão Junin, com o Codex):** a fonte é só a wiki (`system-rules.js:555-563`,
  "Outras formas de se ferir", p. 180–181): o CORE 0.92.4 não tem nenhum destes perigos (só a munição de veneno). As
  decisões:
  - **do usuário (2026-10-23):** a Perna Quebrada da queda vem com os +5 direto no HP ("Toda lesão causa +5", p. 187); o
    fôlego (BODY minutos) não tem relógio: o mestre aperta "Sem ar" quando acaba; a janela abre pelo `/perigo` e pelo botão
    no HUD do token; e duas mudanças na NET (`netrun/index.mjs`, da sessão KouArt): o `queimar` sem o piso de zero (com o HP
    negativo, o fogo curava: −3 ia a 0) e lendo só o "Em chamas" ativo, e o fogo do perigo fora dele (queima no
    `perigos.mjs`, na fila do ator, com o cartão e o Desfazer);
  - **o fogo não acumula, vale o maior**, e a radiação também. O maior toma o lugar dos outros "Em chamas" (o da munição
    incendiária, o do Hellhound, o do Overheat), que o Desfazer recria. Um efeito desligado não conta;
  - **a ordem no turno:** no fim, o fogo da munição e depois o fogo do perigo, a eletrocução e a radiação; no começo, o
    Death Save de quem já estava mortalmente ferido e depois o "Sem ar";
  - **a eletrocução não é ataque:** sem lesão crítica pelos seis; aplicada de novo, os 6d6 entram de novo, sem um segundo
    estado;
  - **a queda:** 2d6 a cada 10 m inteiros (25 m = 4d6). A Meat Leg não conta como cyberperna; uma cyberperna inoperante
    (EMP) conta. A configuração "Lesão crítica" (a dos seis no dano do ataque) não vale para a Perna Quebrada da queda; já
    com ela, nem lesão nova nem os +5. O "Cai 40 m por turno" e o agarrar a borda ficam só no cartão;
  - **a resistência** (o veneno, a droga e o Atletismo da queda) usa o pedido da munição (o tratador `municao`): o dono rola
    no computador dele, com a janela, a Sorte e os situacionais; sem dono, o mestre;
  - **a radiação baixa** é só o cartão; a alta e a extrema saem só pelo "Saiu da zona", não pelo "Apagar fogo";
  - **fica de fora:** o fogo da NET que fica no lugar (o "manter": igual ou maior que o do perigo) ainda queima pelo
    `queimar`, fora da fila do ator; no mesmo fim de turno que um tick do perigo, um dos dois danos pode se perder. E a
    marca do turno é gravada antes do dano: um dano que o servidor recusar não se repete no mesmo turno.

- **C39, gastar IP (2026-10-22, worker do Codex da sessão KouArt):** o CORE 0.92.4 só tem o ledger do IP
  (`cpr-ledger-form.js:86-151`, `cpr-actor.js:754-795`), sem a compra do avanço: a regra é a da wiki (`system-rules.js:242-245`,
  a tabela dos níveis e Ranks 1 a 10, e `:712`, p. 411, o avanço um por vez, a perícia nova no nível 1 e os exemplos de
  100, 120 e 300 IP). A "Pistola" do exemplo da wiki é a perícia "Armas de uma Mão" do catálogo (`system-rules.js:97`).
  As dúvidas:
  - **o tempo no nível novo** ("passe um tempo no nível novo antes de subir de novo") fica com o mestre: a wiki não diz
    quanto;
  - **o teto da perícia** saiu da tabela de avanço, que termina no 10 (o Rank 10 é explícito na wiki, `:697`);
  - **os campos de nível continuam editáveis** para os ajustes à mão, sem passar pelo IP;
  - **a trava do clique duplo é deste cliente:** duas compras ao mesmo tempo em dois navegadores não se coordenam.

- **C32, a ficha do personagem (2026-10-22, worker da sessão KouArt):** as referências são o CORE 0.92.4: o "+"
  (`cpr-actor-sheet.js:1693-1702`, `en.json:16`, "New {item}"), a busca (`:1660-1683` e `register-helpers.js:977-987`),
  descarregar e trocar (`cpr-loadable.js:57-62`, `:107-113` e `:131-134`) e o apagar (`cpr-container.js:11-21`;
  `cpr-actor.js:288-335`, o `deleteEmbeddedDocuments` com o `uninstallItems` e o `unloadAmmo`; `cpr-actor-sheet.js:1042-1073`).
  As diferenças:
  - **a busca ignora os acentos e os espaços das pontas** (o CORE, só as maiúsculas) e fica no cabeçalho, para todas as
    abas: não se limpa ao trocar de aba, como no CORE (`cpr-character-sheet.js:69`). Enquanto há texto, o "VER TODAS /
    SÓ COM NÍVEL" não muda o que aparece;
  - **descarregar é um botão próprio** (o CORE põe "Descarregar" na lista da troca), e a troca segue o Painel: com uma
    munição só, recarrega sem perguntar. Sem a munição do pente na ficha, descarregar avisa e não mexe (não recria a
    munição: o sistema não tem os dados dela);
  - **a munição não é instalada na arma:** no CORE, a arma carregada faz a pergunta do contêiner, e "apagar junto" apaga
    o item de munição inteiro. Aqui a arma carregada sem mais nada instalado tem a confirmação simples (e as balas voltam
    ao estoque), e "apagar junto" não apaga o estoque: só as balas do pente saem com a arma;
  - **a ordem do "só tirar":** o item sai antes, e o que estava nele se desinstala depois (o CORE desinstala primeiro): o
    acessório que sai da arma faz o gancho acertar o pente dela, e a arma apagada no meio disso daria erro;
  - **sem as configurações** `deleteContainer` (o padrão do CORE, "só tirar", é o da pergunta) e `playersCreateInventory`
    (o "+" vale para quem pode editar a ficha), nem a imagem padrão de cada tipo (estas duas estão no C34). No capanga, a
    lista ITENS, de vários tipos, ficou sem "+" (pediria a escolha do tipo).

- **C31, o HP e a Humanidade dentro do máximo (2026-10-22, worker da sessão KouArt):** as referências são o CORE 0.92.4
  (`cpr-actor.js:370-380`, o limite na memória; `:1544-1556`, o `_reverseDamage`; `:1773-1788`, o `setMaxHumanity`;
  `cpr-character-sheet.js:162-169`, o `_setMaxHp`) e a wiki (`system-rules.js:576` e `:581`, a terapia até a máxima). As
  diferenças:
  - **o máximo é calculado sempre:** o CORE guarda o máximo e só o recalcula pela calculadora da ficha; aqui o máximo
    sai dos atributos e das peças a cada preparo, e o HP cheio acompanha sozinho;
  - **a gravação também é limitada:** o CORE só limita na memória e guarda o valor acima; aqui o `_preUpdate` do ator
    para no máximo de depois da mudança (menos na criação: a importação da mesa cria o ator antes dos itens, e o máximo
    sem eles é menor). "Cheio" é o gravado igual ao máximo de antes, como no CORE;
  - **a Humanidade não sobe junto:** o `setMaxHumanity` do CORE só leva a cheia quando a máxima desce, o que dá o mesmo
    que o limite;
  - **ficou de fora:** criar um item com efeito que sobe o máximo (um cyberware já instalado arrastado para a ficha, a
    importação) não faz o HP cheio acompanhar, para a importação não "curar" quem chega ferido; a Humanidade depois de uma
    peça criada já instalada aparece na máxima, mas o banco guarda o valor antigo até a próxima gravação; quando um item
    muda o máximo, o HP vai numa segunda gravação, sem esperar; digitar na ficha um HP acima do máximo com ele já cheio
    não grava nada, e o campo mostra o número digitado até a ficha se redesenhar.

- **C33, o modo de rolagem e "Mostrar aos jogadores" (2026-10-22, worker da sessão KouArt):** a referência é o
  `ChatDataSetup` do CORE 0.92.4 (`cpr-chat.js:21-50`: o `modeOverride` ou o `rollMode` do chat) e o
  `hide-blind-rolls.js:12-21`. No Foundry 14, o `applyRollMode` e o `CONFIG.Dice.rollModes` estão obsoletos
  (`chat-message.mjs:656-672`, `config.mjs:3039`): o sistema usa o `messageMode` das opções da criação e a configuração
  `core.messageMode`. As diferenças:
  - **quem não recebe vê que houve uma rolagem:** no CORE, os cartões não levam `rolls`, e o "às cegas" some para todo
    não-mestre, inclusive para quem rolou; aqui os cartões levam as rolagens, e o Foundry 14 mostra a mensagem
    "rolou dados em particular" com o total "?" (como o ataque escondido do sistema já fazia);
  - **sem as etiquetas do modo no cartão** ("Às cegas", "Para si", "Sussurro", `cpr-chat.js:418-445`);
  - **a NET não segue o modo:** no CORE, as rolagens das fichas do Black ICE e do demônio seguem; aqui a NET tem as
    configurações dela (o jogador que rola, o mestre que responde) e ficou como estava. Também ficaram públicos o ataque
    e a defesa (as configurações "Quem vê o cartão do resultado" e "esconder o total"), a droga, a terapia, o
    tratamento, o Death Save do começo do turno, as Artes Marciais, a resistência à munição e a lesão crítica;
  - **"Mostrar aos jogadores" só para o mestre e o dono:** no CORE, o menu entra para quem abre a ficha
    (`cpr-actor-sheet.js:397-399`), e na 0.92.4 os seletores só pegam o contêiner (`.bice-icon`, `.demon-icon` e
    `.item-image-block` não existem nos templates). O título é o nome do documento, como no CORE (os popouts nativos do
    Foundry 14 passam o `uuid`, e aí o nome some para quem não tem a permissão Limitada: útil para não revelar um NPC,
    se a mesa quiser);
  - **a ficha do token solto apagado:** o Foundry 14 já fecha (o `TokenDocument._onDelete`, `token.mjs:2196-2201`, chama
    o `_onDelete` do ator sintético, que fecha as janelas dele e as dos itens dele): o sistema não tem código para isso,
    só o passo do G4.

- **C27, campanha por mundo e crossover (2026-10-20, worker da sessão KouArt):** a resolução segue
  `foundry-2077/scripts/wiki.mjs`, `tableCampaign` e `ofTable`: configuração, mundo cadastrado, campanha única;
  sem correspondência com várias campanhas, lista completa e pedidos bloqueados. `sendMovedAway` e
  `importTransferred` são a referência do ator antigo parado e do ator novo com IDs incorporados e dono novo.
  A wiki (`api-personagens.js`, ramo `extra === 'ator'` de `route`) só aceita `type: 'character'`, e usa um único
  arquivo de transferência por personagem, sem geração. O sistema envia uma casca `character` identificada por
  `flags.cpr-fieldbook.crossover.geracao = 14`, com o ator nativo completo dentro de `crossover.ator`; a importação
  valida origem, destino e formato antes de criar. Um snapshot bruto do CORE 12 é recusado, com orientação para
  **Importar da mesa**; uma transferência já existente de outro formato não é sobrescrita. O importador do 12 não
  conhece esse envelope: não deve consumir esse crossover. Separar os transportes por geração exige mudar a API da
  wiki, fora deste trabalho. **Dúvida aberta:** a API deve ganhar armazenamento separado para crossover 12 e 14?
  Diferente da mesa antiga, o filtro considera `foundry14.campanha` mesmo quando o vínculo do 12 domina o
  `estadoFoundry` da wiki. A confirmação do vínculo novo é obrigatória antes de apagar a transferência; falhando,
  o ator incompleto é removido e o snapshot permanece para tentar de novo. O retrato conserva o caminho do ator
  antigo; copiar o arquivo para o mundo novo depende da parte do retrato do C27.
- **C27, atualização, retrato e avisos (2026-10-20, worker da sessão KouArt):** referências: `foundry-2077/scripts/wiki.mjs`,
  `atualizarDaWiki`, `applySkills`, `planRoles`, `pendingAssembly`, `copyPortrait`, `applyPortrait` e `avisosDaWiki`;
  `api-personagens.js`, `summary`, `foundryState` e as rotas `foundry`, `enviar` e `retrato`.
  A atualização do 14 mantém qualquer grupo desmarcado pendente; no módulo antigo, só as Roles e a montagem do cyberware
  tinham essa guarda explícita. Os STATs são comparados com a fonte do ator, sem os efeitos temporários preparados.
  Como as Roles são campos, só as marcadas pelo importador podem ser retiradas; uma Role manual que excederia os dois
  espaços bloqueia o grupo e pede ajuste pela ficha. A montagem encaixa itens soltos e carrega armas sem munição escolhida;
  não move peças já encaixadas nem reinstala cyberware retirado durante o jogo (a instalação fica com a ficha).
  Retrato retirado na wiki conserva a imagem da mesa, como no módulo antigo. Os avisos usam os hashes de envio e do
  vínculo `foundry14`: o `estadoFoundry` da API pode descrever o vínculo do 12; sem hash legado, vale a versão do envio.
  Os vistos ficam separados por mundo e navegador. Campanha e crossover ficam para a próxima parte do C27; nenhuma
  regra nova de RPG foi introduzida. A guarda de atualização cobre o mesmo cliente; a API existente não oferece uma
  transação entre a ficha, os itens e o vínculo da wiki. O G4 foi acrescentado ao cenário para a sessão KouArt executar.
- **C26, estados padrão e Ações (2026-10-20, worker da sessão KouArt):** o CORE 0.92.4 não registra
  `statusEffects` em `modules/`; a mesa usava os símbolos padrão do Foundry. A wiki (`system-rules.js`,
  `combat.html`, "Ações" e "Movimento", p. 168–169) define que Caído (`prone`) não usa Movimento até gastar a
  Ação Levantar-se. O sistema informa 0 m disponíveis, conserva o atributo MOVE e anuncia 1 Ação ao levantar.
  Pela orientação do usuário, o gancho `preMoveToken` recusa o movimento do jogador dono caído, com um recado de
  informação para usar Levantar-se; o mestre move sempre, inclusive nos deslocamentos forçados. Não há contador novo de Ações.
  O −2 dos dois lados do agarrão já existia; a restrição de Movimento do defensor agora também aparece na ficha.
  A Recuperação das Artes Marciais permanece no fluxo próprio. **Dúvidas deixadas ao mestre:** a wiki não define
  penalidade genérica de Cego, Surdo, Inconsciente, Atordoado, Paralisado ou dos outros símbolos. Não equiparamos
  Cego a escuridão (−4) nem às lesões de olho, Medo ao Facedown contra um oponente, ou Veneno/Fogo a uma intensidade
  fixa. As causas e durações específicas já implementadas continuam próprias de cada regra.
- **C26, dica e comportamento de "O jogador rola os próprios dados" (2026-10-20, worker da sessão KouArt):**
  `foundry-fluxo-de-combate/scripts/fluxo-de-combate.mjs`, no registro `rolagemManual`, diz que desligada o mestre
  rola por eles. Porém `mestre.mjs`, `pacoteDaPergunta`/`defender`, e `turnos.mjs`, `deathSave`, continuam enviando
  ao jogador com `janela: false`; `defesa.mjs`, `rolarEscolha`/`responderDeathSave`, rola direto nesse cliente.
  O porte conserva os textos e esse comportamento real: mantém a reação do dono, omite a janela pessoal de dados
  e deixa o dano com o mestre. `jogadorRolaDano` já existia e continua como filtro adicional para o dano;
  `netJogadorRola` continua exclusiva da NET, portanto nenhuma das duas substitui a chave geral do combate.

- **C19, paliativo e Death Save (2026-10-20, sessão Codex; respondida):** a wiki (`system-rules.js:215`) chama o +1
  no Death Save de permanente até tratamento, mas a correção rápida tira o efeito pelo resto do dia (`:554`). O CORE
  0.92.4 (`modules/actor/cpr-actor.js:356–365`) conta esse +1 enquanto o item existe. Pergunta enviada: a correção do
  Traumatismo cervical deve suspender temporariamente o +1 e o botão "Voltou" deve devolvê-lo?
  **Decisão do usuário:** "Sim, suspender até ‘Voltou’". A marca de paliativo suspende a contribuição sem apagar
  `aumentaDeathSave` do item; tratamento definitivo continua removendo a lesão.

- **C17, pilhas (2026-10-19, sessão Codex; respondida):** o CORE 0.92.4 junta pelo tipo e nome
  (`modules/actor/cpr-actor.js`, `automaticallyStackItems`, e a versão de `cpr-container.js`), sem comparar a variedade
  da munição, efeitos ou configurações. A condição de upgrades parece invertida; `_splitItem` avisa sobre upgrades,
  mas continua dividindo. A wiki não define esse algoritmo. Pergunta enviada: preservar variantes distintas e impedir
  juntar ou dividir itens com conteúdo instalado ou efeito temporário em andamento, seguindo o CORE na soma e divisão?
  **Decisão do usuário:** "Reproduzir literalmente o comportamento do CORE." Assim, tipo e nome são os critérios;
  equipamento e roupa só juntam se o destino tem upgrades (inclusive a condição invertida do CORE). A divisão copia
  sistema e efeitos, inclusive ligados, não os estados em flags; o catálogo do sistema é preservado para identificar
  as regras da cópia. Conteúdo instalado não é duplicado na divisão. Ao juntar a raiz com upgrades, ficam os upgrades
  do destino, e a árvore da origem é removida, como no CORE (`cpr-actor-sheet.js:1535–1564`). As quantidades continuam
  inteiras, como no modelo do CORE.
  O aviso de tirar upgrades também é preservado e não impede a divisão, inclusive em munição e droga, que no CORE
  não têm `installedUpgrades` (`undefined !== 0`).

- **Alcance da luz (C16, 2026-10-18, resolvida pelo usuário):** os efeitos Flashlight e Road Flare do CORE 0.92.4
  usam `ATL.light.bright = 50`. A wiki (`system-catalog.js`) diz facho de 100 m e iluminar 100 m, respectivamente.
  O usuário confirmou usar alcance de 100 m no token para ambos.

- **Dano no SDP dos veículos (C15, 2026-10-18, resolvida pelo usuário):** o CORE 0.92.4 guarda o SDP, mas não automatiza seu dano;
  a wiki define PDE, ausência de esquiva e vidro como cobertura, sem fórmula própria de SP e crítico contra SDP.
  O usuário confirmou: dano menos SP, ablação de 1 quando atravessa (a munição conserva sua
  ablação), Chassis blindado SP13 conforme a descrição do CORE, sem +5 ou lesão crítica no SDP. O vidro segue a
  cobertura da wiki: perde HP e segura o tiro inteiro; o explosivo que a destrói passa inteiro.

- **Munição Inteligente RED (C14, 2026-10-17):** o usuário confirmou que a margem de erro de até 4 é contra a defesa
  usada, inclusive a Evasão rolada; a segunda tentativa permite outra esquiva. A wiki (`system-catalog.js`, Munição)
  e as descrições `ammo.*.smart` do CORE dizem "tiro único", sem excluir explicitamente o mirado. O usuário confirmou
  incluir o mirado, conservando o local e usando só 10 + 1d10 + Sorte na nova conta, sem repetir a penalidade de −8.

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
  e a área continuam valendo, sem dano da arma. No C14, as resistências, o dano próprio das toxinas e os estados
  temporários passam a ser aplicados pelo sistema; a fumaça continua sendo resolvida pela mesa.

- **Rajada Tech: muda o que a mesa vê.** O sistema lê a "rajada de N" como o multiplicador máximo, como o cpr-2077, e
  as balas pelo texto de cada arma: a Kenshin gasta 2, a Omaha 3, a Quasar 10 e a Senkoh as 30 do pente. No Foundry 12,
  toda rajada Tech gastava as 10 balas do autofogo do CORE. Com isso, a Senkoh precisa do pente cheio, e a Kenshin faz
  rajada com 2 balas no pente.

- **Teste Smart: substitui REF + perícia ou é uma alternativa?** (Saiu no ciclo 110: o Mission Kit não tem teste Smart, e
  a arma Smart soma +1 a REF + perícia.) A wiki manda combinar com a mesa. Isso virou uma
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
  no canvas. Fica no ROADMAP (C8), com o Scanner. Desde o ciclo 91, a parede barra: a linha do centro do token ao
  centro do Tile contra as paredes do documento da cena (sem o canvas), e a porta aberta passa. O mestre conecta assim
  mesmo, como no alcance.

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
  - **Desde a wiki de 2026-10-17 (C29, ciclo 107):** a revisão do suplemento diz o contrário de antes: "Cyberware que
    repete um do RED (vale o do RED): o Kerenzikov, o TeleOptics, [...]". O de 2077 saiu da loja e do catálogo, e o
    sistema conta o que um ator ainda tenha (pelo id antigo ou pelo nome "TeleOptics (2077)") como o do RED: +1 só no
    mirado. Antes, a wiki dizia "vale a versão de 2077", e a loja vendia as duas.
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

- **O MOVE 0 dos quickhacks** (ciclo 98). Os cartões do Impair Movement e do Slow dizem "Com MOVE 0, ele não faz Ação
  de Movimento", e o sistema segue a wiki do mortalmente ferido: o MOVE tem mínimo 1 (`regras.moveFinal`, que vale
  também para o que as lesões e a armadura tiram). Assim, o MOVE do alvo cai pelo efeito do quickhack, mas não chega a
  0 na ficha; o cartão do quickhack traz a regra, e o mestre narra. Se a mesa quiser o MOVE 0 pelo quickhack, muda o
  `moveFinal` (o mínimo só para o ferimento, as lesões e a armadura) e o teste de referência.

- **As Ações NET no Neuroport e na arquitetura** (ciclo 100). A wiki dá as Ações NET por turno (as do Rank) sem separar
  a arquitetura do Neuroport. O sistema conta as do Neuroport (o Jack In, o Breach e o quickhack, em combate) na ficha
  do netrunner, e as da arquitetura na janela da NET, cada conta com o limite do Rank. Quem está numa arquitetura e num
  Neuroport na mesma rodada pode gastar nas duas; o mestre confere. Juntar as duas contas é mexer no estado da NET
  (`netrun/estado.mjs`) e na ficha.

- **O hardware da Bodyweight no deck na porta** (ciclo 101). A wiki: o deck da Neuroport Cyberdeck Port "não aceita
  hardware e usa o da sua Bodyweight (ou parecido)". O sistema não conta o hardware do deck na porta (o Range Upgrade,
  o Insulated Wiring e a KRASH Barrier), e não tem o slot de hardware que a Bodyweight Suit do CORE dá ao deck ligado a
  ela. Quem usa a Bodyweight com o deck na porta tem o hardware dela pelo mestre.

- **Os dois alvos da Kappa no tiro mirado** (ciclo 110). A wiki: "se o ataque errar o primeiro, as balas Smart vão
  para o segundo". O sistema muda as balas no tiro, não no mirado (que vai num ponto do primeiro alvo), como antes ficava
  fora do teste Smart. O mestre resolve o mirado que errar.

- **A segunda chance da munição Smart melhorada** (ciclo 112). A wiki: "se o ataque à distância errar a DV por 5 ou
  menos, você tenta de novo na hora, com 14 + 1d10 (dá para somar Sorte) no lugar de STAT + perícia + bônus, contra a
  mesma DV. As penalidades do primeiro tiro continuam valendo". O que o sistema escolheu, e a wiki não detalha:
  - "errar por 5 ou menos" é a DV menos o total, de 0 (o empate, que é da defesa) a 5;
  - contra a esquiva (que faz as vezes da DV, p. 172) também, contra a mesma esquiva, sem rolar de novo;
  - "bônus" são todos os positivos (o da arma, o +1 da Smart, a luneta, o TeleOptics, o Ataque de Precisão); ficam os
    negativos (o mirado, a coronha, as lesões, os modificadores escolhidos na janela);
  - no cartucho e no explosivo, a segunda chance é uma só, contra a DV da área; a esquiva de cada alvo, depois, não tem;
  - com vários alvos marcados no tiro, cada um que o ataque errou por 5 ou menos tem a sua;
  - quem rola é o jogador que atacou, no computador dele; sem resposta no tempo, o mestre rola, sem a Sorte; o ataque do
    mestre rola direto, com a Sorte preparada;
  - a falha crítica da arma (a ruim) vem do primeiro teste; a da segunda chance não muda nada;
  - a munição Inteligente do CORE numa arma Smart de 2077: a wiki diz "com outra munição, fica só o +1", e o sistema
    dá a segunda tentativa da Inteligente do ciclo 111 (com o Targeting Scope). O mestre decide.

- **As penalidades de visão que a munição Smart melhorada ignora** (ciclo 112). A wiki: "escuridão, fumaça, neblina e
  [...] qualquer outra coisa que atrapalhe a visão". O sistema tira as dos modificadores comuns da janela de rolagem que
  falam disso: "Iluminação noturna ou fraca" (−1) e "Tarefa encoberta por fumaça, escuridão etc." (−4). Um efeito
  situacional ou o modificador do mestre com uma penalidade de visão conta: o mestre tira.

- **O ricochete do cartucho** (ciclo 114). A wiki: "escolha uma superfície a até 6 m de você: ela vira a nova origem
  do leque, que atinge todos numa área de 6 m na direção que você escolher (com bom senso: o tiro não ricocheteia para
  trás da superfície)". O sistema não sabe da superfície: no cartucho que ricocheteia, ele não confere os 6 m de quem
  atira e pega os alvos marcados; o mestre confere quem está no leque e o caminho livre. A penalidade é a do ricochete
  (−4, −2 com o Ballistic Coprocessor), contra a DV 13 do cartucho.

- **A carga Tech e a cobertura** (ciclo 115). A wiki: "atravessa cobertura fina [...] A cobertura atravessada não perde
  HP". O sistema não sabe de que é a cobertura: o cartão do ataque carregado diz a regra, e o "Em cobertura" do alvo diz
  que a carga atravessa a fina e que a grossa para o tiro; o mestre decide. Também ficam com ele o CDT 1 (o sistema não
  conta os ataques da ação) e o contorno dos alvos que a mira vê através da cobertura fina.

- **As regras de cada modelo de 2077** (ciclo 116). O que o sistema escolheu, e a wiki não detalha:
  - a lesão de quem dispara a Carnage sem BODY 10 e a Burya sem cromo no braço segue a configuração "Lesão crítica" (na
    ficha, só anunciar; desligada, só a nota no cartão), e vale em todo disparo, mesmo o que erra; o "Desfazer" a tira.
    O cromo é o Grafted Muscle and Bone Lace, um esqueleto (Epimorphic, Titanium Bones) ou a fundação de um cyberbraço,
    como o `foundry-2077`;
  - o mirado da Unity causa 4d6 em qualquer ponto mirado (a cabeça, a perna, o item na mão);
  - a Omaha carregada, fora do combate, gasta a carga no primeiro tiro (não há turno); no combate, fica até o fim do
    turno em que disparou, e o CDT 2 o mestre confere;
  - o ferrolho da Grad (uma Ação) é um botão: o sistema não conta as Ações do turno.

- **O que a perícia própria guarda** (ciclo 120). O item de perícia do CORE tem também a categoria, a dificuldade e o
  tipo. A própria daqui guarda o nome, o STAT e o nível, que é o que a rolagem usa (STAT + nível + 1d10); a dificuldade
  (o ×2) só pesa no custo dos Pontos de Melhoria, que fica com a mesa, e ela entra no grupo Próprias, não numa categoria
  do livro.

- **O contêiner** (ciclo 122; o container do CORE 0.92.4):
  - **as configurações:** no CORE, o tipo e as permissões só mudam pela ficha do token ("Container settings should be made
    on the token"); aqui, nas duas: a do ator vale para os tokens que não mudaram, como no capanga;
  - **o preço da bateria:** o CORE divide por 10 toda munição que não é granada nem foguete; a loja da wiki vende a bateria
    "por 8" (50eb o pacote). Vale a da wiki: 6,25eb a unidade;
  - **a categoria abaixo de 10eb:** o CORE tem a "Dirt Cheap" (5eb), que a wiki não tem; abaixo de 10eb, a ficha mostra só
    o preço;
  - **o SP, o HP e o DV** do contêiner do CORE (o modelo os guarda; a ficha do CORE não os mostra) ficaram fora; o contêiner
    daqui tem as notas;
  - **arrastar entre as fichas:** no CORE, o item sai da origem (um personagem dá o item ao outro); aqui também, desde este
    ciclo (antes, a ficha não arrastava). Do contêiner, como no CORE, só o mestre arrasta, e o item sai mesmo com o estoque
    infinito; o jogador usa o "Pegar".

- **O Painel Tático dentro do sistema** (ciclo 125; o módulo painel-tatico da mesa do Foundry 12):
  - **o retrato de cada personagem** fica no ator (a flag do sistema). O do Foundry 12 não vem na migração (a ficha "Na
    mesa" não manda a flag do módulo): cada jogador escolhe as imagens de novo, pelo botão do retrato;
  - **o estilo** de cada jogador fica neste navegador, como no módulo; o código PT1 de lá vale aqui, e a fonte que não
    existe aqui (a Tektur, a Jost, a Rubik e a Bruno Ace do CORE) volta para a Rajdhani do tema da ficha;
  - **o modo de cada arma** (o tiro, o mirado com o local, o autofogo, o supressivo, o ricochete, os dois canos) fica no
    painel deste navegador: a ficha tem um botão por modo, sem o modo guardado no ator, como o CORE guardava;
  - **as perícias favoritas** ficam numa flag do ator (as perícias daqui não são itens, como no CORE);
  - **"Trocar a munição"** escolhe a munição da recarga; a ficha recarrega com a que está no pente (é o botão do painel);
  - **a ligação com o Combat HUD** saiu (ele não existe para este sistema); a do Fluxo, do cpr-2077 e do NET Architect é a
    do próprio sistema.

- **A loja que vende** (ciclo 130; o _purchaseItem do CORE 0.92.4):
  - **o preço da parte em eb inteiros:** o dinheiro daqui é inteiro; o que dá fração (a bateria, 6,25eb a unidade) arredonda
    para cima (3 baterias, 19eb). O CORE não arredonda;
  - **a ordem:** o item vai antes, e o dinheiro sai depois (no CORE, o dinheiro sai antes). Assim, um item que não pôde ir (o
    cyberware instalado, a ficha sem permissão) não cobra.

- **A loja que compra** (ciclo 132; o _sellItemTo e o _onDrop do CORE 0.92.4):
  - **a oferta para baixo:** o preço da pilha vezes a porcentagem dá fração (a bateria, 3 por 18,75eb): a loja paga para
    baixo (18eb), como o CORE (o parseInt dele). Na compra, a fração arredonda para cima (ciclo 130): a loja não perde
    nos dois sentidos;
  - **a pilha toda:** como no CORE, vende-se a pilha inteira (a parte, divida antes, pelo "Dividir" das pilhas);
  - **só pelo arrastar do jogador:** o mestre que arrasta põe o item na loja, sem venda (o CORE também); a venda é do
    jogador sem "Criar e pôr itens" e com "Vender itens";
  - **o estoque infinito:** a loja que já tem o item (o tipo e o nome) não fica com outro, e o de quem vende sai mesmo assim
    (o CORE compara só o nome);
  - **a munição da arma vendida:** as balas do pente voltam para a munição que estava nele (o unload do CORE).

- **O cyberware que é arma** (ciclo 133; o isWeapon do cyberware do CORE 0.92.4):
  - **as mãos:** a arma do cyberware não ocupa as mãos, como no CORE (o _getFreeHands só conta as armas empunhadas). A wiki
    diz das do Kit que "com a lâmina para fora, a mão desse braço não segura nada" (a Mantis Blade e o Projectile Launch
    System): fica para a parte delas (o C11, parte 2);
  - **os dados:** os do compêndio do CORE (o Big Knucks pela Briga, a arma branca com metade do SP). A Arma branca embutida
    e a Arma de distância embutida da wiki instalam a arma que o jogador escolhe: o mestre muda o dano, o CDT e o pente na
    ficha do cyberware (a Popup Melee Weapon vem como a leve do CORE, 1d6);
  - **a wiki:** a arma do cyberware não vai na ficha que volta para a wiki; ela volta do cyberware instalado. O pente da
    arma que vai e volta da wiki volta vazio.

- **O cyberware que é arma do Kit** (ciclo 134; a wiki, `system-2077.js`, e o módulo cpr-2077 da mesa):
  - **o que já ataca:** os números da arma de cada um, como a mesa do Foundry 12 os tem (o `foundry-2077/build/cyberware.mjs`
    do master): a Gorilla Arm e a Mantis Blade, arma branca pesada excelente (3d6, CDT 2, +1); o Monowire, arma branca
    pesada (3d6, CDT 2); o Projectile Launch System, lança-foguetes de um tiro (8d6, a DV do lança-foguetes) que carrega
    foguete ou granada;
  - **o que fica com o mestre (a parte 2b do C11):** a mão do braço que não segura nada com a Mantis Blade ou o Projectile
    Launch System para fora (e o sacar sem Ação); o BODY 11 da Gorilla Arm para empunhar e, com duas, para o Choke e o Slam;
    os 6 m e as duas rolagens de lesão crítica do Monowire; o Projectile Launch System com granada como lança-granadas (a
    DV e o dano da granada). O módulo da mesa também não as automatiza.

- **O acessório que é arma** (ciclo 135; o secondaryWeapon do itemUpgrade e o getWeapons do ator do CORE 0.92.4):
  - **pronta com a arma equipada:** a arma do acessório só ataca com a arma onde ele está equipada (o "equipped" do CORE; a
    wiki: "com as duas mãos, a arma também dispara como lança-granadas"). Não ocupa mãos a mais;
  - **o que a arma de baixo herda:** a descrição do CORE diz que a arma sob o cano "herda os modificadores da arma onde
    está, como os outros acessórios e a qualidade", mas o código do CORE não faz isso (o ataque do acessório usa só os
    números dele), e a wiki não fala disso. Aqui também não herda: o mestre soma, se quiser;
  - **ocultar:** com o acessório, a arma não se esconde sob a roupa (o CORE e a wiki dizem); a arma não guarda isso: fica
    com o mestre.

- **Os acessórios de arma** (ciclo 136; a wiki, Acessórios de arma, p. 342–344):
  - **o Smartgun Link pede a ligação** ("exige plugs de interface ou plug subdérmico, que exigem Neural Link"): sem ela, o +1
    não entra. É uma mudança em relação à mesa do Foundry 12: o CORE dá o +1 sempre. A ligação é a da arma Smart do ciclo
    110 (os Interface Plugs, o Neuroport, que já os traz, ou o Subdermal Grip). O +1 vale só nos ataques à distância;
  - **os slots e o carregador:** o acessório que não cabe nos slots da arma e o segundo carregador são recusados, com o
    aviso. A conferência é por item, como a das mãos (C12): uma mudança em lote (por macro) não soma os acessórios entre
    si. A montagem que vem da wiki (a importação, os pedidos e a migração da mesa) entra como veio;
  - **o pente:** tirado o carregador, o pente que passa do máximo volta a ele, e as balas a mais voltam para a munição
    que estava nele.

- **As regras próprias do cyberware que é arma do Kit** (ciclo 138; a wiki, `system-2077.js`). Decisão do usuário
  (2026-10-19): só o que é conta.
  - **automatizado:** o Projectile Launch System com granada no pente é lança-granadas (a DV e o dano do lança-granadas do
    RED, 6d6); com foguete, lança-foguetes. O Monowire, na lesão crítica da tabela, rola duas vezes: as duas vão num
    cartão, e o mestre aplica a que quem atacou escolher (como o "Rolar a lesão"); os 6 m do Monowire vão como nota no
    ataque (o corpo a corpo não confere o alcance);
  - **com o mestre:** a mão do braço que não segura nada com a Mantis Blade ou o Projectile Launch System para fora, o sacar
    sem Ação e o BODY 11 da Gorilla Arm (para empunhar e, com duas, para o Choke e o Slam);
  - **o Desfazer:** a lesão do Monowire, escolhida depois, fica fora do Desfazer do ataque (o mestre a tira na ficha).

- **As macros e os favoritos** (ciclo 139; o generate-item-macro, o CPRMacro e o `favorite` do CORE 0.92.4):
  - **o favorito na aba Combate:** no CORE, o alfinete deixa o item ou a perícia visível com a categoria fechada. A ficha
    daqui não fecha categorias: o favorito junta as perícias e os itens no painel Favoritos da aba Combate (o que o plano
    pedia), e a perícia favorita sem nível fica na lista curta do painel geral;
  - **o modo da arma:** fica só no texto da macro. O CORE guardava o último modo de tiro (o mirado, o autofogo, o
    supressivo) numa flag do ator, para a macro de dano rolar o dano daquele modo; aqui, o dano da macro é o do botão
    "Dano" da ficha, e o do autofogo sai do próprio ataque;
  - **a perícia pelo id:** a macro da perícia rola pelo id (`perception`), não pelo nome, porque as perícias daqui não são
    itens;
  - **o capanga:** a ficha dele tem a ★ das perícias (a do Painel Tático) e arrasta as perícias e as armas para a barra,
    mas não tem o painel Favoritos (é uma página só, sem a aba Combate).

- **Moradia, estilo de vida, moda e Trauma Team** (C22; o `lifestyle` do CORE 0.92.4, `foundry-2077/scripts/wiki.mjs`, `criador.js` e `system-rules.js`, "Estilo de vida e moradia"):
  - **o pagamento do mês:** o CORE só guarda e mostra os campos (`housing`, `lifeStyle`, `traumaTeam` com `cost` e `description`, e `fashion` só com `description`), sem somar nem cobrar. Aqui a aba Vida soma os três custos mensais ("POR MÊS: N eb, no dia 1º") e oferece **Pagar o mês**, que confirma antes e desconta do dinheiro pelo extrato (`Moradia e estilo de vida do mês`), como diz o passo 6 do criador da wiki; sem total (> 0), o botão não aparece;
  - **a moda na ficha "Na mesa":** o `fichaParaAWiki` manda `moradia: { housing, lifeStyle, traumaTeam }` com `{ custo, descricao }`, exatamente como o `cpr-2077` e o `criador.js` (`doc.mesa.moradia`). Como o `cpr-2077` não mandava a moda na ficha da mesa, o `importarDaMesa` aproveita a moda da criação da wiki (`resultado.moradia`) quando `mesa.moradia` não traz `moda`;
  - **com o mestre:** quando vira o mês (o sistema não cobra sozinho pelo relógio), os benefícios de Role (moradia e Trauma Team da Exec), a penalidade de dormir na rua ou no carro e o atendimento do Trauma Team.

- **As conveniências (o C26, partes 1 a 3; o CORE 0.92.4):**
  - **o `/red` no chat:** como o CORE (`parse-red-command.js`, `CPRChat.HandleCPRCommand` e `CPRRoll._processFormula`): o
    dado `XdY` opcional (`1d10` sem ele) e `# descrição` no fim; o d10 é um teste, no cartão de teste do sistema, com o
    crítico; o d6, um dano (o `CPRDamageRoll` do CORE: o crítico dos dois 6 e a ablação `aN`, 1 sem ela), no cartão de dano;
    outro dado rola sem crítico (o "generic" do CORE). **A diferença:** o CORE só lê o primeiro modificador (`/red +5 -2`
    rola +5); aqui todos somam (+3);
  - **a DV no HUD do token e na régua:** o botão do HUD escolhe a tabela entre as `TABELAS_DV` do catálogo (menos a `"DV Generic"`,
    como o `HudInterface.SetDvTable` do CORE) e grava o nome na flag `cprDvTable` do `TokenDocument` (também lê o objeto
    `{ name }` ou a flag `cyberpunk-red-core.cprDvTable` de um token antigo). No Foundry 14, o rótulo da régua vem de
    `TokenRuler.prototype._getWaypointLabelContext` (e `Ruler.prototype._getWaypointLabelContext`), mostrando `DV: <dv> <arma>`
    ao lado da unidade de distância quando a distância medida cai numa faixa da tabela;
  - **a iniciativa crítica (`iniciativaCritica`):** no CORE (`settings.js`, `criticalInitiative`), o padrão é `true` (a mesa
    do Foundry 12 explodia a iniciativa, se não mudou a configuração). Aqui o padrão é `false`, para manter o que o sistema
    fazia desde a virada para o Foundry 14 (`1d10 + @iniciativa`, sem explosão no 10 nem no 1); ligada, usa
    `1d10crit + @iniciativa`. **Pergunta ao usuário:** qual padrão a mesa quer.

- **A terapia e a ciberpsicose** (ciclo 145; a wiki, p. 229–232, e o `loseHumanityValue` do CORE 0.92.4):
  - **o custo e os materiais** (500eb e 100eb na padrão; 1.000eb e 500eb na extrema e na de dependência) vão no cartão: quem
    paga, e se paga (o Medtech da equipe), é a mesa. A semana também fica com a mesa;
  - **a Humanidade negativa:** a instalação do cyberware e o "Aplicar" do cartão deixam a Humanidade ficar abaixo de 0, como
    o CORE (antes, o sistema parava no 0); a ciberpsicose extrema da wiki precisa dela. O Black Lace continua tirando só o
    que há (o ciclo 124 guarda a Humanidade realmente perdida, para devolver);
  - **a extrema:** o cartão avisa que o personagem passa para o mestre; o sistema não troca o dono do ator nem dá o +2 dos
    Immunoblockers (a wiki diz que o mestre "pode dar"). Os Immunoblockers em si (a droga do Kit) ficam para depois;
  - **o aviso:** sai quando o estado piora (pela Humanidade ou pela EMP), num cartão só para o mestre e os donos; melhorar
    não avisa.

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

### Ciclo 88 (2026-10-17): a falha crítica de cada arma (o C13; sessão Codex)

O C13 do ROADMAP, reservado e enviado antes de começar (`08dc188`). Commit anterior: `08dc188` (a reserva).

- **A referência:**
  - CORE 0.92.4: `modules/datamodels/item/mixins/attackable-schema.js`, `config.attackableCritFailEffects` e
    `templates/item/settings/mixin/cpr-quality.hbs`: o `critFailEffect`, padrão `jammed`, com as quatro opções e o
    seletor só na arma de qualidade ruim. O CORE guarda e exibe esse campo, sem aplicá-lo no motor do ataque;
  - wiki, `system-catalog.js`, Qualidade das armas: a arma ruim emperra na falha crítica e exige uma Ação para
    desemperrar. `system-blackchrome.js`, Destruído e Destruído sem conserto: quebra reparável ou permanente.
    `system-rules.js`, a falha crítica do ataque ainda pode acertar; `system-criacao.js`, a Recuperação de Falhas do
    Solo a ignora. Os arquivos de regra da wiki não mudaram;
  - Cara ou coroa conserva a indicação do enum do CORE. Não se generaliza para ela a regra de uma arma específica.
- **Implementado:**
  - `DadosArma.falhaCritica`: texto persistido, padrão `jammed`, também nos itens anteriores sem o campo;
  - o build preserva `critFailEffect` nas 100 armas do CORE e usa o padrão nas 46 de 2077. No catálogo gerado, só
    entrou esse campo nas 146 armas; o restante do conteúdo ficou igual;
  - na ficha da arma ruim, "Na falha crítica": Emperra, Quebra, Quebra sem conserto e Cara ou coroa;
  - `regras.mjs`: a consequência só para qualidade ruim e crítico efetivo de falha, sem aceitar efeito desconhecido;
  - `combate.mjs` lê o crítico da mensagem original da rolagem, inclusive quando veio do jogador. O resumo, a flag
    e o cartão do resultado levam a consequência, mesmo acertando. O Solo que suprimiu a falha fica sem aviso.
- **Testes:**
  - G1: 61 arquivos, 0 erros; G2: 0 erros;
  - G3: 108 de 112 (as 4 falhas conhecidas das armas de 2077). O novo `falha-da-arma.test.mjs` tem 3 testes de
    referência: os quatro efeitos e seus textos, o padrão e o desconhecido; qualidade ruim e crítico efetivo;
    os campos das 100 armas CORE e das 46 de 2077;
  - G4: 109 de 114 (as 5 falhas conhecidas das armas de 2077). Antes das mutações, o passo original do C13 passou no
    Foundry com mestre e jogador, sem avisos ou erros; passou também na rodada completa final. Confere o padrão num
    item sem o campo, opções e seleção gravada na ficha; os quatro
    efeitos no resumo, flag e DOM; falha acertando com ataque 27, HP 50 → 44 e pente 8 → 7; qualidade padrão/excelente,
    rolagem comum e Recuperação de Falhas do Solo sem aviso. Um jogador ataca com o total escondido e efeito não
    padrão; os dois clientes conferem o autor da rolagem, o crítico e o mesmo aviso;
  - **mutações:** as 19 caíram, uma por vez, com restauração exata por md5:
    - G3: ignorar a qualidade (F1) ou o crítico (F2), trocar o padrão (F3), aceitar efeito desconhecido (F4) e trocar
      o texto de cada uma das quatro consequências (F5–F8);
    - build e G3: omitir o campo na conversão do CORE (F9) ou de 2077 (F10), reconstruindo o catálogo antes do teste
      e restaurando também os dois arquivos gerados;
    - Foundry: trocar o padrão do modelo (F11), mostrar uma seleção diferente da gravada (F12), mostrar o seletor
      nas outras qualidades (F13), ignorar o efeito escolhido (F14), descartar o crítico da mensagem (F15), omitir
      a consequência do resumo (F16) ou do cartão (F17), ler só o crítico do mestre (F18) e forçar a falha nos tiros
      comum e do Solo (F19).
    O executor temporário usa o passo original com o `rodar.js`, a trava e a checagem da mesa, e atravessa o `finally`
    do cenário ao sair. Uma rodada sem mutação passou antes; esse foco não substitui o G4 completo.
- **Limites:** o cartão informa; a mesa resolve a moeda e marca o estado da arma. Não há bloqueio automático da arma,
  conserto ou rolagem automática da moeda. Não entrou conteúdo dos DLCs nem do Black Chrome.
- **Pendências:** nenhuma do C13.
- **Próximo:** outro item fora da NET, conforme o ROADMAP.

### Ciclo 89 (2026-10-17): o C8, parte 12: os arquivos do Eye-Dee (sessão KouArt)

O que o NET Architect da mesa faz com o arquivo que o Eye-Dee identifica (`foundry-net-architect/scripts/arquivos.mjs`),
portado para o sistema. O editor visual fica para o próximo ciclo. Commit anterior: `421ef6c4` (ciclo 88, da sessão
Codex). Feito como o 87, virou o 89 ao integrar: a sessão Codex publicou antes os ciclos 87 e 88.

- **A referência:**
  - **o NET Architect da mesa:** o Eye-Dee que passa copia o arquivo para um diário na pasta "Arquivos da NET". Só o
    mestre e os donos do netrunner o abrem, e o chat avisa os dois com o link. A janela mostra "Abrir o arquivo" no
    andar. O mesmo arquivo identificado de novo (depois do "Reiniciar" do mestre) não faz outro diário: quem o
    identificou agora passa a abrir o de antes;
  - **a wiki, "Ações NET" (RED p. 198):** copiar arquivos para o deck não é Ação NET. A cópia vem junto com o Eye-Dee,
    sem gastar nada a mais.
- **Implementado:**
  - **`scripts/netrun/arquivos.mjs`** (novo, o port do da mesa), com duas partes:
    - **sem Foundry:** o lugar do arquivo (a arquitetura, o andar e o ramo), a página do diário (o nome do arquivo, o
      que ele é e de onde veio, com o HTML escapado) e o diário de cada arquivo no estado;
    - **no mestre ativo:** a cópia (a pasta, o diário com a permissão dos donos, o aviso no chat) e o diário que já
      existe.
  - **Diferente do da mesa:** se o mestre apaga o diário, o registro dele sai do estado, e o diário novo toma o lugar.
    No da mesa, o registro antigo ficava na frente, e o botão do diário novo não aparecia.
  - **o motor** (`estado.mjs`): os diários no estado do ponto; a cópia depois do Eye-Dee que passa, com a linha no
    registro ("copiou o arquivo para o deck (diário “...”)"). O "Reiniciar" do mestre guarda os diários; o reinício
    das defesas já guardava os arquivos identificados;
  - **a vista pública** (`regras-da-net.mjs`): o diário do arquivo identificado;
  - **a janela da NET:** "Abrir o arquivo" no andar escolhido, para quem pode abrir o diário. O mestre vê o mesmo na
    janela dele.
  - **o README:** o "Ainda não faz" ainda listava os nós de controle ligados à cena (feitos no ciclo 85). Agora lista
    só o Scanner e o editor visual.
- **Testes:**
  - os números abaixo são os da integração com os ciclos 87 e 88 da sessão Codex (antes dela: G1 com 61 arquivos, G3 com
    104 de 108 e G4 com 108 de 113, as mesmas falhas conhecidas);
  - G1: 63 arquivos (2 novos deste ciclo: o módulo e o teste), 0 erros; G2: 0 erros;
  - G3: 111 de 115. O arquivo novo, `tests/sistema/arquivos.test.mjs`, tem 3 testes de referência:
    - o lugar, com o ramo só fora do A;
    - a página, com o nome ou "Arquivo", o HTML escapado e o DV que falta como "—";
    - o diário de cada arquivo, e a vista pública com ele só no arquivo identificado.

    No `regras.test.mjs`, o arquivo identificado da vista pública ganha o `diario` (vazio: sem o motor, não há
    nenhum). As 4 falhas são as das armas de 2077;
  - G4: 110 de 115 (as 5 falhas são as das armas de 2077). Mudanças nos passos:
    - **o passo antigo do Eye-Dee:** lia a última linha do registro, e a última agora é a da cópia. Ele lê as duas linhas
      e confere o "Abrir o arquivo" no andar;
    - **um passo novo, depois dos nós de controle, sobre um andar com o arquivo "Agenda" (DV 6):**
      - o Eye-Dee (10 contra 6) dá as duas linhas no registro;
      - o diário fica na pasta "Arquivos da NET", sem permissão para os outros, com o Jogador como observador e a
        flag do conteúdo e da arquitetura;
      - o chat sussurra para o mestre e para o Jogador, com o link do diário;
      - o "Abrir o arquivo" do jogador abre o diário (o nome, a página "Agenda" e o texto de onde veio), e o mestre vê o
        mesmo botão na janela dele;
      - depois de desconectar (as defesas reiniciam) e do "Reiniciar" do mestre, o Eye-Dee de novo usa o mesmo diário,
        sem outro aviso no chat;
      - com o diário apagado pelo mestre, o próximo Eye-Dee faz outro, e o estado guarda só o novo;
    - **o passo do Agarrar (ciclo 80) falhou uma vez,** numa rodada das mutações: leu o cartão do empate no lugar do
      segundo. A sessão Codex achou e corrigiu a mesma corrida no ciclo 87 (a espera do segundo cartão), e a
      integração ficou com a correção dela;
  - **mutações:** as 10 caíram, e os arquivos voltaram (conferido pelo md5). Rodaram antes da integração; os arquivos
    deste ciclo não mudaram nela (a sessão Codex não mexeu na NET).
    - **No G3:**
      - a vista pública sem o diário (A1);
      - o nome de quem copiou sem escapar o HTML (A2);
      - o ramo A também no lugar (A3).
    - **No G4:**
      - o Eye-Dee que não copia (A4, que derruba também o passo antigo);
      - o dono sem permissão no diário (A5);
      - o chat sem o dono (A6);
      - o "Reiniciar" que perde os diários (A7);
      - o arquivo identificado de novo com outro diário (A8);
      - o registro do diário apagado que fica (A9);
      - a janela do mestre sem o diário (A10).
    - **Fica sem teste a conferência da permissão no botão** (só aparece a quem pode abrir o diário): o mundo de teste
      tem um jogador só, e ele é o dono do netrunner.
- **Pendências:** o C8 segue com o editor visual, e o Scanner e a parede.
- **Próximo:** o C8, parte 13 (o editor visual).

### Ciclo 90 (2026-10-17): o C8, parte 13: o editor visual da arquitetura (sessão KouArt)

O editor visual do NET Architect da mesa (`foundry-net-architect/scripts/editor.mjs`), feito no mapa da ficha da
arquitetura. Commit anterior: `236a070e` (ciclo 89).

- **A referência:** o editor da mesa é uma janela à parte, com cinco partes:
  - a grade dos andares (as linhas são os andares, as colunas são os ramos);
  - arrastar um andar move ele, e soltar em cima de outro troca os dois;
  - clicar num "+" cria um andar;
  - um painel ao lado tem os conteúdos do andar escolhido;
  - "Salvar" e "Desfazer" (as mudanças ficam na janela até salvar).
- **A diferença,** registrada na tabela de compatibilidade: a ficha da arquitetura do sistema já tem a tabela das
  linhas (que faz o papel do painel), o "Gerar pelas tabelas" e o mapa. O editor ficou no próprio mapa, e não numa
  segunda janela com os mesmos campos. Sem o "Salvar" e o "Desfazer": cada mudança grava na hora, como o resto da
  ficha.
- **Implementado:**
  - **`arquitetura.mjs`** (sem Foundry):
    - a posição no mapa (o andar de 1 a 18, o ramo de A a H);
    - arrastar: todas as linhas do andar vão para a célula nova, e em cima de outro andar os dois trocam (o resto de
      cada linha vai junto);
    - o "+": cria a senha DV 6 numa célula vazia;
    - o que não muda nada (o mesmo lugar, a origem vazia, a posição fora da arquitetura, o "+" na célula ocupada)
      devolve a mesma lista, e a ficha não grava;
  - **a ficha** (`ficha-arquitetura.mjs`, `arquitetura.hbs` e o tema):
    - quem pode editar vê o mapa com uma linha e uma coluna a mais;
    - cada célula vazia tem o "+", com a dica "Criar o andar N no ramo X";
    - os andares se arrastam, e a célula onde ele vai cair fica marcada;
    - a ficha só para ver (o compêndio trancado, o jogador) mostra o mapa de sempre.
- **Testes:**
  - G1: 64 arquivos (1 novo: o teste), 0 erros; G2: 0 erros;
  - G3: 115 de 119. Um arquivo novo, `tests/sistema/editor-visual.test.mjs`, com 4 testes de referência:
    - a posição (e as que não valem);
    - arrastar para o vazio e em cima de outro andar, com o resto da linha e a lista de antes intacta (o ramo sem letra
      conta como o A);
    - o arrastar sem efeito;
    - o "+".

    As 4 falhas são as das armas de 2077;
  - G4: 111 de 116 (as 5 falhas são as das armas de 2077). Um passo novo, depois do da ficha da arquitetura:
    - **a arquitetura de teste:** a senha DV 8 no 1A e, no 2A, o arquivo "Agenda" e o Wisp;
    - **antes:** o mapa com o "+" no 1B, 2B, 3A e 3B (a dica "Criar o andar 3 no ramo A") e os dois andares
      arrastáveis;
    - **o "+" do 2B:** cria a senha DV 6 ali; o 2B sai do 1A, e a coluna C aparece;
    - **arrastar** (com o `DataTransfer` de verdade: o `dragstart` põe a posição, o `drop` lê):
      - o 2A em cima do 1A troca os dois (o arquivo e o Wisp vão juntos);
      - o 2B no 3A vazio move;
      - soltar no mesmo lugar não grava;
    - **a ficha do compêndio trancado:** não pode editar, e não tem o "+" nem o arrastar;
    - passou na primeira rodada;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o andar 19 como posição (E1);
      - em cima de outro andar, sem a troca (E2);
      - o "+" na célula ocupada (E3);
      - a linha sem ramo fora do A (E4).
    - **No G4:**
      - sem a coluna a mais (E5);
      - soltar sem gravar (E6);
      - o "+" na ficha só para ver (E7);
      - o "+" que lê o atributo errado (E8);
      - os andares sem o `draggable` (E9).
- **Pendências:** o C8 segue com o Scanner (achar o ponto oculto) e a parede entre o token e o ponto (ver as dúvidas).
- **Próximo:** o C8, parte 14 (o Scanner e a parede).

### Ciclo 91 (2026-10-17): o C8, parte 14: a parede entre o token e o ponto e o Scanner; o C8 completo (sessão KouArt)

O que faltava do NET Architect da mesa (o Scanner, `foundry-net-architect/scripts/estado.mjs` e `ponto-de-acesso.mjs`) e
a parede que a wiki pede e o da mesa não conferia. Commit anterior: `fc0fccea` (ciclo 90).

- **A referência:**
  - **a wiki, "Netrunning" (o master, 2026-10-17):**
    - o deck externo conecta "a até 6 m do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade)";
    - no deck na Neuroport Cyberdeck Port (o Mission Kit), "paredes bloqueiam como sempre";
    - o Scanner é "1 Ação Carnal, Interface + 1d10: acha no mundo físico os pontos de acesso da área; quanto maior, mais
      longe";
  - **o NET Architect da mesa:** o botão Scanner no HUD do token, fora da NET. Ele acha os pontos até o resultado
    × 10 m, e o oculto só com o resultado acima do DV do Scanner do ponto (10 de partida). O oculto achado passa a
    aparecer para os donos do netrunner, e o chat conta só ao mestre e a eles. O da mesa não conferia a parede.
- **Implementado:**
  - **`regras-da-net.mjs`** (sem Foundry):
    - **a parede:** ela barra se barra o movimento, e a porta aberta não barra. A conferência traça a linha do centro do
      token (o destino, no `_source`, como na distância) ao centro do Tile. Só o cruzamento de verdade conta: encostar
      na ponta da parede ou correr junto dela passa. Usa as paredes do documento da cena, sem o canvas, e por isso vale
      também com o mestre ativo vendo outra cena (o motivo de a parede ter ficado para depois no ciclo 50);
    - **o que o Scanner acha:** os pontos até o resultado × 10, do mais perto ao mais longe, e o oculto só com o
      resultado acima do DV dele;
  - **o motor** (`estado.mjs`):
    - **a conexão:** com parede no meio, recusa ("Tem parede entre o netrunner e o ponto de acesso (a wiki: "sem parede
      no meio")."); o mestre conecta assim mesmo, como no alcance;
    - **a operação "scanner":** só fora da NET e com o cyberdeck e a Interface. A rolagem vai pela NET: o mestre rola,
      ou o jogador, pela configuração. O oculto achado ganha os donos do netrunner em "revelados", e o chat sussurra ao
      mestre e a eles;
  - **o cliente** (`ponto-de-acesso.mjs` e `index.mjs`):
    - o clique no marcador e o "Conectar" da ficha avisam da parede antes de pedir;
    - o botão **Scanner** no HUD do token: só do dono, de quem tem Interface e fora da NET. O resultado vai também ao
      aviso;
    - a API ganhou o `scanner(token)`.
- **Testes:**
  - G1: 65 arquivos (1 novo: o teste), 0 erros; G2: 0 erros;
  - G3: 119 de 123. O arquivo novo, `tests/sistema/parede-scanner.test.mjs`, tem 4 testes de referência:
    - **a parede que barra:** a comum e a porta fechada ou trancada; a porta aberta e a que não barra o movimento, não;
    - **a parede no meio:** atravessa, em diagonal; não chega, atrás ou ao lado; encosta na ponta ou corre junto; a
      porta aberta e a fechada; uma entre várias;
    - **a parede entre o token e o ponto:** pelo centro dos dois, e pelo destino do token que anda;
    - **o Scanner:** com 9, 10 e 11, contra o raio, o DV do oculto (tem de passar) e o DV que falta (o 10).

    As 4 falhas são as das armas de 2077;
  - G4: 112 de 117 (as 5 falhas são as das armas de 2077). Um passo novo, depois do dos arquivos do Eye-Dee, com 4
    partes:
    - **a porta fechada no meio:** fica entre o token e o Tile. O clique avisa, e a operação chamada direto recusa,
      com o mesmo texto;
    - **a porta aberta:** conecta;
    - **o Scanner do HUD do token, com 9 (4 + 5):** acha só o ponto a 3 m. O oculto, a 13 m e com o DV 10, não
      aparece;
    - **o Scanner com 12:** acha também o oculto ("estava oculto"), que passa a aparecer no mapa do jogador. O aviso
      no jogador e o chat (sussurrado ao mestre e ao jogador) dizem o mesmo, com o raio;

    o passo passou na primeira rodada;
  - **mutações:** as 10 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - a porta aberta que barra (P1);
      - encostar que conta como atravessar (P2);
      - o oculto com o resultado igual ao DV (P3);
      - o raio sem o × 10 (P4);
      - os achados fora da ordem (P5).
    - **No G4:**
      - a operação que conecta com a parede no meio (P6);
      - o clique que não avisa (P7);
      - o oculto achado que não aparece ao jogador (P8);
      - o chat só para o mestre (P9);
      - sem o botão no HUD (P10).
- **O C8 está completo** (os ciclos 47 a 56, 85 e 89 a 91). Pendências fora dele:
  - **o deck na Neuroport Cyberdeck Port** (o Mission Kit, na wiki do master: 20 m contra as arquiteturas e 50 m
    contra as Neuroports) é do C9, a NET de 2077;
  - **o "Tirar o ponto" da configuração** ainda apaga as flags com o "-=" (o Foundry 14 avisa que saiu).
- **Próximo:** o C9 (a NET de 2077), na sessão KouArt, que é a das partes da NET.

### Ciclo 92 (2026-10-17): "Tirar o ponto" sem o "-=" (sessão KouArt)

A pendência da NET dos ciclos 85 a 91: o "Tirar o ponto" da configuração apagava as flags com o "-=", que o Foundry 14
avisa que saiu. Commit anterior: `98056203` (ciclo 91).

- **Implementado:** `ponto-de-acesso.mjs` apaga o ponto e o estado do Tile com o `ForcedDeletion`, como o Foundry 14 pede
  (e como o `migracao.mjs` e a ficha já fazem).
- **Testes:**
  - G1: 65 arquivos, 0 erros; G2: 0 erros; G3: 119 de 123 (as 4 falhas são as das armas de 2077);
  - G4: 113 de 118 (as 5 falhas são as das armas de 2077). Um passo novo, depois do da parede e do Scanner:
    - **com o netrunner conectado:** o "Tirar o ponto" avisa ("Tem netrunner conectado aqui: desconecte antes."), e o
      ponto e o estado ficam;
    - **desconectado:** o Tile perde o ponto e o estado, a configuração fecha e o marcador some no jogador;
    - **o aviso de API:** o passo lê os avisos que o navegador do mestre registrou durante o clique (o
      `window.__avisos` do harness). A checagem "nenhum aviso" do fim já falha pelo aviso conhecido da Lexington, e um
      aviso a mais não a mudaria de "✗" para "✗";
  - **mutações:** as 2 caíram no G4, e o arquivo voltou (conferido pelo md5):
    - **a volta ao "-=" (Q1):** o passo pegou os dois avisos do Foundry 14 ("The {-=pontoDeAcesso: null} syntax for
      forced deletion ... is no longer supported");
    - **tirar com o netrunner conectado (Q2).**
- **Pendência (para a integração da wiki do master):** a wiki do master segue o Mission Kit na NET ("uma regra só na
  mesa"). O Scanner é 1 Ação NET (no RED e na cópia da wiki desta branch, 1 Ação Carnal), e o Backdoor se chama Breach.
  O sistema, a cópia da wiki desta branch e o NET Architect da mesa seguem o RED. A integração da wiki do master e o C9
  esperam o usuário.
- **Próximo:** o C9 (a NET de 2077), depois da decisão do usuário sobre a integração da wiki do master.

### Ciclo 93 (2026-10-17): a integração do master (o pedido do usuário; sessão KouArt)

O pedido (2026-10-17, depois do C8): integrar o master na `sistema-v14`, como no ciclo 32. A wiki do master passou a ter
"uma regra só na mesa" (o Mission Kit sobre o RED, sem as regras do suplemento de fã) e revisou os itens do
suplemento. O C9 (a NET de 2077) depende dessas regras. Commit anterior: `3608b8f9` (ciclo 92).

- **A mescla:** o master `5de1fbd0` (11 commits desde o `32f9c7b` do ciclo 32), com 85 arquivos:
  - a wiki (as duas Roles, o cyberware por local, o visual novo);
  - os arquivos de regra (`system-2077.js`, `system-net.js`, `system-rules.js` e os outros);
  - os scripts do servidor;
  - a suíte nova da wiki (`tests/isolados`, `tests/ui`, `tests/validar.js`).
- **Os 6 conflitos:** 5 no `api-personagens.js` e 1 no `criador.js`. Em todos ficou o lado do master:
  - nos 4 primeiros blocos do `api-personagens.js` e no do `criador.js`, a `sistema-v14` não tinha nada a mais (é o
    `roles` das duas Roles e o aviso de que o Foundry 14 ainda importa uma Role só);
  - no quinto, o do master é o mais novo e mais estrito: depois da importação, o campo travado que não existia não se
    cria.
- **O que não entrou:**
  - **o `foundry-sistema/.cache` e o `foundry-sistema/packs` do master** (1.696 arquivos que o `0219b29` levou para o
    master sem querer, ver a limpeza pendente do master). Na `sistema-v14`, os dois estão no `.gitignore`: são o build.
    Saíram do índice na mescla, e os da worktree voltaram do backup (conferidos pelo md5);
  - **`Oque falta/` e os 2 arquivos do `fvtt-cyberpunk-red-core-dev/`** entraram como estão no master, à espera da
    limpeza que o usuário vai decidir.
- **Os caminhos longos:** a primeira tentativa falhou ("Filename too long", pelos arquivos do `.cache` na pasta funda da
  worktree). Ela deixou 15 arquivos novos do master na worktree e o `.cache` e o `packs` trocados. Os 15 saíram e os
  dois voltaram do backup. A segunda tentativa usou o `git -c core.longpaths=true merge` (só naquele comando, sem mudar
  a configuração do repositório).
- **O build** (`build/conteudo-2077.mjs`), no jeito do `foundry-2077/build` do master:
  - **o que saiu:** a neuralware de netrunning, os daemons, os cyberópticos e as placas do suplemento;
  - **Berserk e Sandevistan:** vêm do grupo `osware` do cyberware (p. 24);
  - **as fundações:** os slots ficam só com os do Neuroport;
  - **os cyberdecks com marca:** são cyberdecks do RED da qualidade deles, sem a RAM e o Cooling;
  - **os quickhacks:** os 11 do Kit (p. 16) e os 5 do suplemento que a mesa aprovou (p. 17), de preço 0;
  - **o catálogo novo:** 53 armas de 2077, 38 cyberware de 2077 e 37 itens de netrunning de 2077 (21 decks e
    16 quickhacks); o `gerado.mjs` não mudou.
- **Testes:**
  - G1: 65 arquivos, 0 erros; G2: 0 erros;
  - **G3: 109 de 123.** As 4 falhas das armas de 2077 e 10 novas. Cada uma é um ponto em que a wiki mudou, e o sistema
    ainda segue a de antes (QUALITY_GATES, "Falhas conhecidas desde a integração do master"; ROADMAP, C29):
    - as Roles do RED e os situacionais de Role;
    - a Interface do Netrunner (10 habilidades, com o Scanner como 1 Ação NET e o Breach);
    - o ponto de acesso (o texto da wiki mudou);
    - o TeleOptics e o passo 1 da migração (o TeleOptics de 2077 saiu);
    - a fundação e as opções (saíram os cyberópticos e as placas de 2077);
    - o teste Smart (o Smart Link saiu);
    - o catálogo de 2077 (a loja da wiki);
    - o efeito de falha das armas;
  - **G5 (a suíte inteira, com o v14):**
    - **o v14:** 109 de 118. Às 5 conhecidas somam-se 4:
      - os tamanhos dos compêndios;
      - a janela de rolagem (o TeleOptics de 2077);
      - os dois canos de 2077;
      - o "sem erros de JS na página": o passo da arma Smart cria o Smart Link, que saiu, e o Foundry recusa o item
        vazio;
    - **as suítes da wiki falham assim também num clone limpo do master** (conferido com a trava dos testes): o
      `criador` (2), o `cyberware` (6) e o `reversao` (o clone com o `campaign-map.js` antigo). São do master, e não da
      integração;
    - **o "projeto real" do `reversao`** falhava só com a mescla ainda sem commit. Depois do commit, o `reversao` dá 6
      de 7, como no clone limpo do master;
    - **o `fluxo` e o `sistema`:** as falhas conhecidas de sempre.
- **Pendências:**
  - o C29 (novo no ROADMAP): uma parte por grupo de falhas. A da NET é da sessão KouArt, e as outras ficam abertas;
  - no C9, a RAM e o Cooling dos decks saíram da wiki;
  - **as armas de 2077 pelo Mission Kit:** o adiamento do usuário (2026-10-12) é de antes da "regra só na mesa".
    Perguntar ao usuário se ele ainda vale.
- **Próximo:** o C29, a parte da NET (o Scanner como 1 Ação NET, o Breach e a 10ª habilidade de Interface), e depois o
  C9.

### Ciclo 94 (2026-10-17): o C29, parte 1: a NET pela wiki do master (sessão KouArt)

A primeira das falhas da integração do ciclo 93: a NET. A wiki do master ("Habilidades de Interface", RED p. 198–201 e
Kit p. 26–27) segue o Mission Kit. Commit anterior: `6c987541` (ciclo 93).

- **A referência (a wiki):**
  - "Nos anos 2070 (Kit p. 26–27), o Backdoor do livro-base se chama Breach, e o Scanner deixou de ser Ação Carnal";
  - a tabela tem 10 habilidades: as 9 do CORE (o Breach no lugar do Backdoor, "contra a DV da senha ou do Passwall")
    e o Quickhack ("1 Ação NET, contra a DV do quickhack: hackeia o cyberware de quem tem Neuroport");
  - o alcance é "Deck externo: a até 6 m do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade)",
    e o deck na Neuroport Cyberdeck Port tem 20 m contra arquiteturas.
- **Implementado:**
  - **`regras.mjs`:**
    - o Backdoor aparece como Breach. A chave segue a do CORE (`backdoor`): o bônus do Worm, os dados das fichas e o
      `CPR.interfaceAbilities` não mudam;
    - o Scanner é 1 Ação NET;
    - entra o Quickhack, a 10ª habilidade, que a ficha rola (Interface + 1d10). O que ele faz no Neuroport é o C9;
  - **a NET** (`regras-da-net.mjs`): o registro diz "Breach (9 contra DV 6)", e o aviso da senha, "use Breach";
  - **o botão do Scanner no HUD** diz "(1 Ação NET)". Ele segue fora da arquitetura: as Ações NET fora dela (o Jack In,
    o Quickhack) são do C9.
- **Testes:**
  - G1: 65 arquivos, 0 erros; G2: 0 erros;
  - G3: 111 de 123 (as 4 das armas de 2077 e as 8 das outras partes do C29). Dois testes que falhavam desde a
    integração voltam a passar:
    - **a Interface do Netrunner:** as 10 da tabela da wiki, com o nome e o custo exatos, e a nota do Breach e do
      Scanner;
    - **o ponto de acesso:** o texto novo do deck externo e o do deck na porta;

    No mesmo arquivo, o registro do Breach e o aviso da senha;
  - G4: 109 de 118 (as falhas são as conhecidas da integração). Nos passos:
    - a aba NET da ficha com o Quickhack (as 12 rolagens);
    - o Breach no passo do andar e das habilidades (o registro, o aviso e o cartão do chat);
    - o "(1 Ação NET)" no botão do Scanner;
  - **mutações:** as 6 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o Breach com o nome do RED (B1);
      - o Scanner de volta à Ação Carnal (B2);
      - sem o Quickhack (B3);
      - o registro (B4) e o aviso da senha (B5) com o nome do RED.
    - **No G4:** o botão do HUD com a Ação Carnal (B6).
- **Pendências:** as outras partes do C29 (as Roles, o TeleOptics de 2077, a fundação e as opções, o catálogo de
  2077 e as armas de 2077) e o C9 (o Neuroport: o Jack In, o Breach nos Passwalls, os quickhacks e o deck na porta).
- **Próximo:** o C9, a NET de 2077.

### Ciclo 95 (2026-10-17): o C9, parte 1: o Jack In e o Jack Out no Neuroport (sessão KouArt)

A primeira parte da NET de 2077. Commit anterior: `52b1ef04` (a reserva do C9 e as duas decisões do usuário de
2026-10-17).

- **A referência:**
  - **a wiki, "Quickhacks no Neuroport"** (Kit p. 16–17 e 26–27): "Jack In: entra no Neuroport de um alvo à vista, no
    alcance: Interface + 1d10 contra WILL + 1d10 do alvo. Falhando, você entra assim mesmo, mas o alvo percebe. Cada
    Neuroport é uma Ação NET, e dá para ficar ligado em quantos quiser"; "Jack Out: sai do Neuroport do alvo com
    segurança";
  - **"Do que o netrunner precisa":** o deck externo, a até 6 m do alvo, 8 m com o Range Upgrade;
  - **nenhum módulo da mesa faz isso** (o do 2077 só tem os cartões dos quickhacks). O jeito é a decisão do usuário:
    "rolagens e efeitos simples", com o Jack In rolando como o Agarrar.
- **Implementado:**
  - **`regras.mjs`:** o alcance do Jack In (6 m, 8 m com o Range Upgrade) e quem percebe (o teste resistido: o empate é
    do alvo);
  - **`regras-da-net.mjs`:** a parede que barra a visão ("à vista"), além da do movimento (o ponto de acesso). A janela
    deixa ver;
  - **a defesa** (`combate.mjs` e `janela-defesa.mjs`): a escolha nova "Vontade" (WILL + 1d10, sem perícia), pela
    mesma janela de reação do agarrão ("Estão entrando no seu Neuroport!", com a conta e o que acontece em cada caso);
    pelo NPC, o mestre rola;
  - **o ator** (`documentos.mjs`): a rolagem do Jack In (Interface + 1d10, sem bônus de programa, com as penalidades e
    os situacionais);
  - **`neuroport.mjs`** (novo):
    - **o Jack In:** o alvo marcado, um só, com o Neuroport instalado, à vista e no alcance. O netrunner precisa ter
      Interface e o deck equipado;
    - **o Jack Out;**
    - **a resolução no mestre ativo** (pelo socket, como o agarrão);
    - **a ligação nas flags dos dois atores** (no netrunner, as ligações; no alvo, os invasores);
    - **o cartão:** vai ao mestre e aos donos do netrunner, e aos do alvo quando ele percebe;
  - **a ficha** (a aba NET): o painel "Neuroports", com o alcance, as ligações (quem percebeu), o "Jack Out" de cada
    uma e o "Jack In". Também mostra quem está no Neuroport deste ator: o jogador vê só quem ele percebeu, e o mestre,
    todos.
- **Testes:**
  - G1: 67 arquivos (2 novos: o módulo e o teste), 0 erros; G2: 0 erros;
  - G3: 114 de 126 (as 12 conhecidas). O arquivo novo, `tests/sistema/neuroport.test.mjs`, tem 3 testes de referência
    contra o texto da wiki:
    - quem percebe, com o empate do alvo;
    - o alcance com e sem o Range Upgrade;
    - a parede que barra a visão, a janela e a porta aberta;
  - G4: 110 de 119 (as 9 falhas são as conhecidas da integração). Um passo novo, na cena do combate, com o jogador na
    mesa, em quatro partes:
    - **o netrunner do mestre faz o Jack In no Alvo, o PC do jogador:** 4 + 2 = 6. O jogador recebe a janela "Estão
      entrando no seu Neuroport!", só com a Vontade e a conta dela. Ele rola a WILL 7 + 5 = 12 e percebe;
    - **o cartão e as fichas:** o cartão vai ao mestre e ao jogador, como dono do Alvo, que percebeu (o netrunner ainda
      não era dele). A ficha do Alvo mostra "No seu Neuroport: ...", sem o invasor que ele não percebeu;
    - **o netrunner passa a ser do jogador:** pela ficha, ele faz o Jack In no Capanga, 4 + 7 = 11 contra a WILL 5 + 2 =
      7, que o mestre rola, e não é percebido. A aba lista as duas ligações. O Jack Out do Capanga, pela ficha, tira dos
      dois lados;
    - **as recusas, sem rolar:** a Atiradora não tem Neuroport; o Capanga fica longe (16 m); e uma parede entre os dois
      barra a visão;
    - **rodou três vezes,** e as duas primeiras mostraram defeitos do teste:
      - na primeira, o netrunner caiu no mesmo quadrado do Capanga;
      - na segunda, a parede foi posta pelo lugar de antes do token, que ainda andava (o `x` do token é o de antes até a
        animação acabar);
      - a terceira passou;
  - **mutações:** as 10 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o empate do netrunner (N1);
      - o Range Upgrade que não soma (N2);
      - a parede que só barra a visão se barra o movimento (N3).
    - **No G4:**
      - o Jack In sem conferir o Neuroport (N4);
      - sem o alcance (N5);
      - sem ver o alvo (N6);
      - ninguém percebe (N7);
      - a ligação só no netrunner (N8);
      - o cartão sem o dono do alvo que percebeu (N9);
      - o jogador que vê quem ele não percebeu (N10).
- **Pendências** (as outras partes do C9, no ROADMAP):
  - o Breach nos Passwalls do Self-ICE;
  - os quickhacks e a expulsão;
  - as Ações NET fora da arquitetura (hoje o Jack In não as conta) e o Jack Out inseguro (sair do alcance, os 60
    minutos);
  - o deck na Neuroport Cyberdeck Port;
  - a ligação que sobra quando o token do netrunner ou do alvo é apagado.
- **Próximo:** o C9, parte 2 (o Breach nos Passwalls).

### Ciclo 96 (2026-10-17): o C9, parte 2: o Breach nos Passwalls (sessão KouArt)

Commit anterior: `760cc297` (ciclo 95).

- **A referência (a wiki):**
  - **"Quickhacks no Neuroport":** "Breach: passa um Passwall (um por Self-ICE do alvo), Interface contra a DV dele: 6
    com um Self-ICE, 8 com dois, 10 com três"; "Quickhack: depois de passar todos os Passwalls";
  - **o Self-ICE** (`system-2077.js`): "Cada instalação (até 3) põe um Passwall no seu Neuroport: quem tenta hackear você
    gasta uma Ação NET para passar por cada um (Breach). A DV de todos os Passwalls sobe com o número de Self-ICE".
- **Implementado:**
  - **`regras.mjs`:** os Passwalls pelo número de Self-ICE (até 3) e a DV de todos (6, 8 ou 10); passa quem tira mais que
    a DV;
  - **`neuroport.mjs`:**
    - **os Self-ICE instalados no alvo:** os do catálogo, ou os feitos à mão com o nome;
    - **o Breach:** a habilidade Breach + 1d10 (o bônus do Worm vale), na ligação com Passwall pela frente. O mestre
      ativo confere a DV pelo Self-ICE de agora e, passando, a ligação conta mais um;
    - **o cartão:** quantos faltam, ou "o Neuroport está aberto aos quickhacks". Ele vai ao mestre e aos donos do
      netrunner (o Breach não alerta o alvo);
  - **a ficha:** na ligação com Passwall, "PASSWALLS passados/quantos · DV" e o botão "Breach" enquanto falta algum. Sem
    Self-ICE, a linha fica como no ciclo 95.
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 115 de 127 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, um teste de referência contra os dois
    textos da wiki: a DV por número de Self-ICE (com o limite de 3) e o empate com a DV, que não passa;
  - G4: 111 de 120 (as 9 conhecidas da integração). Um passo novo, depois do Jack In, que passou na primeira rodada:
    - **a preparação:** o Capanga com o Neuroport e dois Self-ICE (DV 8). O netrunner do jogador faz o Jack In nele;
    - **a ficha:** "PASSWALLS 0/2 · DV 8 Breach";
    - **o Breach pela ficha:** com 7 não passa (a linha não muda), com 9 passa um ("falta 1") e com 10 passa o último ("o
      Neuroport está aberto aos quickhacks"). A linha fica "PASSWALLS 2/2 · DV 8", sem o botão;
    - **depois:** o Breach pela API avisa ("já passou os Passwalls");
  - **mutações:** as 7 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - a DV de dois Self-ICE (R1);
      - sem o limite de 3 (R2);
      - o empate que passa (R3).
    - **No G4:**
      - o mestre que não guarda o Passwall passado (R4);
      - o Self-ICE que não conta (R5);
      - o botão que fica depois do último (R6);
      - o Breach que não avisa (R7).
- **Pendências** (as outras partes do C9, no ROADMAP):
  - os quickhacks e a expulsão;
  - as Ações NET fora da arquitetura (o Breach também não as conta ainda) e o Jack Out inseguro;
  - o deck na Neuroport Cyberdeck Port.
- **Próximo:** o C9, parte 3 (os quickhacks).

### Ciclo 97 (2026-10-17): o C9, parte 3a: os quickhacks (sessão KouArt)

Commit anterior: `18754f05` (ciclo 96).

- **A referência (a wiki):**
  - **"Quickhacks no Neuroport":** "Quickhack: depois de passar todos os Passwalls, Interface contra a DV do quickhack.
    Um quickhack por alvo por turno: errou o Puppet, não dá para tentar o Overheat no mesmo alvo nesse turno";
    "Expulsar: o alvo que percebe (um quickhack que deu certo alerta, menos o Lure)";
  - **a tabela das habilidades:** "O Rank dá os níveis: DV6 no Rank 1, DV8 no 2, DV10 no 3 e DV12 no 4";
  - **os 16 cartões:** 11 do Kit e 5 do suplemento que a mesa aprovou, cada um com a DV, o Rank e o efeito. Dois do
    suplemento dizem "Alerta o alvo: não";
  - **a decisão do usuário:** "rolagens e efeitos simples". O sistema aplica o que é número, e o resto vai ao chat.
- **Implementado:**
  - **o build** (`conteudo-2077.mjs`): cada quickhack guarda a DV, o Rank e se alerta o alvo (a flag `quickhack`; não
    alertam o Lure, o Request Backup e o Memory Wipe);
  - **`regras.mjs`:**
    - o netrunner faz os quickhacks do Rank dele para baixo;
    - passa com o resultado acima da DV;
    - um por alvo por rodada de combate, errado ou certo; fora de combate, a vez não conta;
  - **`neuroport.mjs`:**
    - **os quickhacks do netrunner:** os do catálogo até o Rank dele;
    - **o quickhack:** com os Passwalls passados, a janela de escolha (o nome e a DV de cada um), a habilidade
      Quickhack + 1d10 e a vez daquela rodada;
    - **o mestre ativo:** confere tudo de novo e marca a vez;
    - **o alerta:** o quickhack que deu certo alerta o alvo (os dois lados da ligação passam a "percebido"), menos o que
      não alerta;
    - **o Synapse Burnout:** 3d6 direto no HP, sem a armadura;
    - **os outros:** o cartão traz o efeito ("O mestre aplica: ...");
  - **a ficha:** o botão "Quickhack" na ligação sem Passwall pela frente.
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 117 de 129 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 2 testes de referência:
    - **as regras pelo texto da wiki:** o Rank, a DV e a vez por rodada;
    - **o catálogo contra os 16 cartões:** a DV e o Rank de cada um, os 3 que não alertam e o nível pelo Rank;
  - G4: 111 de 120 (as 9 conhecidas da integração). O passo do Breach (ciclo 96) ganhou os quickhacks e passou na
    primeira rodada:
    - **antes dos Passwalls:** o quickhack avisa ("Passe antes os Passwalls de Capanga (o Breach).") e não rola;
    - **no Rank 2:** a lista tem só os 8 dos Ranks 1 e 2;
    - **depois dos Passwalls, fora de combate:**
      - o Lure (12 contra DV 10) passa sem alertar, com o efeito no cartão para o mestre narrar;
      - o Synapse Burnout, pela janela da ficha, que lista os 16, passa (11 contra 10): o mestre rola os 3d6 (12), o HP
        do Capanga cai 12, e a ligação passa a "percebeu" dos dois lados;
      - o Puppet (6 contra DV 12) não passa;
    - **a linha da ligação:** o botão "Quickhack" está nela, e por isso os passos do Jack In e do Breach têm o texto
      novo;
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o Rank igual que não faz (Q1);
      - o empate com a DV que passa (Q2);
      - a vez sem a rodada (Q3).
    - **No G4:**
      - nenhum quickhack alerta (Q5);
      - o Synapse Burnout sem o dano (Q6);
      - o quickhack sem os Passwalls passados (Q7);
      - o botão com Passwall pela frente (Q8);
      - a lista sem o Rank (Q9).
    - **Fica sem mutação a flag do build** (se o quickhack alerta): o G3 confere o catálogo gerado contra a wiki, e a
      mutação no build só valeria com o catálogo gerado de novo.
- **Pendências** (as outras partes do C9):
  - os outros efeitos simples (o fogo do Overheat, o MOVE do Impair Movement e do Slow, o System Reset);
  - a expulsão;
  - as Ações NET fora da arquitetura e o Jack Out inseguro;
  - o deck na Neuroport Cyberdeck Port.
- **Próximo:** o C9, parte 3b (os efeitos simples).

### Ciclo 98 (2026-10-17): o C9, parte 3b: os outros efeitos simples dos quickhacks (sessão KouArt)

Commit anterior: `87d3dc49` (ciclo 97).

- **A referência (a wiki, os cartões do Kit, p. 16):**
  - **Synapse Burnout:** "3d6 de dano direto no HP do alvo. Passa pela armadura sem ablar";
  - **Overheat:** "O alvo pega fogo: sofre 4 de dano direto no HP no fim de cada turno dele, até apagar o fogo. [...]
    Apagar é uma Ação (CDT 1), e só no turno do alvo";
  - **Impair Movement e Slow:** "O MOVE do alvo cai 1 [1d6] por 60 segundos (20 rodadas). Com MOVE 0, ele não faz Ação
    de Movimento";
  - **System Reset:** "O alvo cai inconsciente por 60 segundos (20 rodadas), ou até sofrer dano, e fica caído (Prone)";
  - **a decisão do usuário:** "rolagens e efeitos simples". O sistema aplica o que é número.
- **Implementado:**
  - **`regras.mjs`:** `EFEITOS_DE_QUICKHACK`, o que o sistema aplica de cada um, pelo id do catálogo (o dano, o fogo, o
    MOVE, o inconsciente e caído, e as 20 rodadas);
  - **`neuroport.mjs`, o quickhack que dá certo:**
    - **o Synapse Burnout:** como no ciclo 97, agora pela tabela;
    - **o Overheat:** o status "Em chamas" do Hellhound, com o dano 4 guardado no efeito;
    - **o Impair Movement e o Slow:** um efeito que tira 1 (e 1d6, que o mestre rola) do MOVE, por 20 rodadas (o
      Foundry acaba com ele sozinho);
    - **o System Reset:** o inconsciente, por 20 rodadas, e o caído;
    - **o dano acorda:** o HP que cai (o `preUpdateActor`, no cliente que muda o HP) apaga o inconsciente do System Reset;
      o caído fica. A cura não acorda;
  - **`netrun/index.mjs`, o fogo:** no fim do turno, queima o dano guardado no efeito (o do Hellhound continua 2), e o
    aviso do Overheat diz "Uma Ação, no turno dele, apaga o fogo" (o do Hellhound, a Ação Carnal).
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 118 de 130 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto dos 5
    cartões na wiki e a tabela do sistema, e cada id no catálogo;
  - G4: 112 de 121 (as 9 conhecidas da integração). O passo novo, "Os efeitos dos quickhacks", passou na primeira rodada,
    no Capanga só com o Neuroport (sem Passwall):
    - **o Impair Movement** (7 contra DV 6): o MOVE cai 1, pelo efeito "Impair Movement: MOVE −1" de 20 rodadas, e o
      Capanga percebe;
    - **o Slow** (11 contra DV 10; o mestre rola o 1d6: 2): o MOVE cai mais 2;
    - **o Overheat** (9 contra DV 8): o Capanga fica em chamas, com o dano 4 no efeito, e o HP não cai na hora;
    - **o fogo em combate:** na rodada seguinte, o fim do turno do Capanga queima 4, com o aviso no chat;
    - **o System Reset** (13 contra DV 12): inconsciente (o efeito de 20 rodadas) e caído;
    - **a cura e o dano:** o HP que sobe 1 não o acorda; o dano de 3 acorda, e o caído fica;
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o fogo do Overheat com o dano 2 (E1);
      - o System Reset sem as 20 rodadas (E2).
    - **No G4, todas no passo novo:**
      - o MOVE que sobe em vez de cair (E3);
      - o efeito do MOVE sem a duração (E4);
      - o fogo que não lê o dano do efeito (E5);
      - o gancho do dano fora (E6);
      - a cura que acorda (E7);
      - o System Reset sem o caído (E8).
- **Dúvida nova** (nas dúvidas de regra): o MOVE 0 dos cartões e o mínimo 1 da wiki.
- **Pendências** (as outras partes do C9):
  - a expulsão;
  - as Ações NET fora da arquitetura e o Jack Out inseguro;
  - o deck na Neuroport Cyberdeck Port.
- **Próximo:** o C9, parte 4 (a expulsão).

### Ciclo 99 (2026-10-17): o C9, parte 4: a expulsão (sessão KouArt)

Commit anterior: `4b558c2f` (ciclo 98).

- **A referência (a wiki, "Quickhacks no Neuroport"):**
  - **Expulsar:** "o alvo que percebe (um quickhack que deu certo alerta, menos o Lure) tenta te expulsar com uma Ação:
    WILL + Concentração + 1d10 contra a sua Interface + 1d10. Outro netrunner sempre sabe quando entraram no Neuroport
    dele";
  - **o empate:** "Teste contra outra pessoa: empate = defensor vence". Quem defende é o netrunner;
  - **a decisão do usuário:** "rolagens e efeitos simples": o outro lado rola pela janela de reação do dono, como no
    agarrão.
- **Implementado:**
  - **`regras.mjs`:**
    - `expulsou`: expulsa com o total acima da Interface do netrunner;
    - `sabeDoJackIn`: o alvo com Interface (o Netrunner) sabe do Jack In;
  - **`neuroport.mjs`:**
    - **o Expulsar:** só contra quem o alvo percebeu; a Concentração (WILL + Concentração + 1d10) do alvo vai ao
      mestre;
    - **o mestre ativo:** confere de novo e pede a Interface + 1d10 do netrunner pela janela de reação do dono (pelo
      NPC, o mestre rola). Expulso, a ligação some dos dois lados, e o cartão vai ao mestre e aos donos dos dois;
    - **o Jack In no netrunner:** sem a resistência; ele sempre percebe, e o cartão diz;
  - **`combate.mjs` e `janela-defesa.mjs`:** a defesa "interface" (o Rank + 1d10, sem o bônus de programa, com as
    penalidades), na janela "Estão expulsando você de um Neuroport!";
  - **a ficha:** o botão "Expulsar" ao lado de cada um que o alvo percebeu, em "No seu Neuroport".
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 119 de 131 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da
    wiki, o empate do defensor e o netrunner que sempre sabe;
  - G4: 113 de 122 (as 9 conhecidas da integração). O passo novo, "A expulsão do Neuroport", passou na segunda rodada
    (na primeira, o d10 fixo em 1 e em 10 fez crítico; a lição no QUALITY_GATES):
    - **o Capanga netrunner** (Rank 1, só no passo): o Jack In (4 + 6 = 10) entra sem a Vontade dele, e ele percebe ("é
      netrunner e sempre sabe");
    - **o mestre, pela ficha do Capanga:** o Expulsar com a Concentração (5 + 3 = 8); o netrunner do jogador resiste pela
      janela "Estão expulsando você de um Neuroport!" (só a Interface: "Interface 4 + 1d10 (média 9,5) contra a
      expulsão. Empate é seu"), com 4 + 4 = 8: o empate é dele, e a ligação fica;
    - **o Alvo, com o netrunner do mestre:** o mestre vê os dois invasores, e o Expulsar só no que o Alvo percebeu; o
      jogador vê só esse;
    - **o jogador, pela ficha do Alvo:** a Concentração (7 + 9 = 16) contra a Interface do netrunner (o mestre rola: 4 +
      2 = 6) expulsa; a ligação some dos dois lados, e o cartão vai ao mestre e ao jogador;
    - **quem o Alvo não percebeu:** o Expulsar avisa e não rola;
    - **o passo do Jack In (ciclo 95)** tem o texto novo da lista "No seu Neuroport" (o botão Expulsar);
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o empate que expulsa (X1);
      - o netrunner de Rank 1 que não sabe do Jack In (X2).
    - **No G4, todas no passo novo:**
      - o Jack In no netrunner com a resistência (X3);
      - o Expulsar sem a conferência de quem se percebeu (X4);
      - o expulso que fica (X5);
      - a defesa com a Vontade no lugar da Interface (X6);
      - o botão também para quem não se percebeu (X7, pego pela ficha do mestre);
      - a Interface da defesa pela WILL (X8).
- **Pendências** (as outras partes do C9):
  - as Ações NET fora da arquitetura e o Jack Out inseguro;
  - o deck na Neuroport Cyberdeck Port;
  - a ligação de quem saiu da cena (o token apagado).
- **Próximo:** o C9, parte 5 (as Ações NET fora da arquitetura e o Jack Out inseguro).

### Ciclo 100 (2026-10-17): o C9, parte 5: as Ações NET fora da arquitetura e o Jack Out inseguro (sessão KouArt)

Commit anterior: `e5972312` (ciclo 99).

- **A referência (a wiki, "Quickhacks no Neuroport"):**
  - **as Ações NET:** "Cada Neuroport é uma Ação NET, e dá para ficar ligado em quantos quiser"; o Breach e o quickhack
    custam 1 Ação NET (a tabela das habilidades); as Ações NET por turno são as do Rank ("Ações por turno");
  - **o Jack Out inseguro:** "Você fica ligado até ser expulso, sair do alcance, fazer o Jack Out ou o alvo morrer.
    Desligado de qualquer jeito que não o Jack Out, é um Jack Out inseguro, com as consequências de sempre, e você só
    entra de novo nesse alvo em 60 minutos".
- **Implementado:**
  - **`regras.mjs`:**
    - `acoesNetNaRodada` e `semAcaoNet`: em combate, as da rodada até as do Rank; fora de combate, não contam;
    - `JACK_OUT_INSEGURO` (3600 segundos) e `bloqueioDoAlvo`: o alvo bloqueado até o tempo do mundo passar;
  - **`neuroport.mjs`:**
    - **as Ações NET:** o Jack In, o Breach e o quickhack conferem a conta no cliente (sem Ação, o aviso, sem rolar) e
      no mestre, que a gasta (o mestre passa do limite, como na arquitetura); a conta fica no netrunner (a flag
      `neuroport.acoes`);
    - **o Jack Out inseguro:** expulso ou fora do alcance, a ligação some dos dois lados, e o netrunner fica bloqueado
      naquele alvo por 60 minutos (a flag `neuroport.bloqueios`); o cartão diz;
    - **o alcance:** o gancho do token que anda (o netrunner ou o alvo; no mestre ativo) confere cada ligação contra o
      alcance do deck;
    - **o bloqueio no Jack In:** o aviso com os minutos que faltam, sem rolar;
  - **a ficha:** em combate, o título do painel Neuroports mostra as Ações NET da rodada ("AÇÕES NET 2/2").
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 120 de 132 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da
    wiki, a conta por rodada e o bloqueio;
  - G4: 114 de 123 (as 9 conhecidas da integração). O passo novo, "As Ações NET fora da arquitetura e o Jack Out
    inseguro", passou na segunda rodada (na primeira, a conta do alcance usava o `token.x`, que no gancho ainda é o de
    antes: o Jack Out inseguro só caía quando o netrunner voltava; a lição no QUALITY_GATES):
    - **em combate, o netrunner de Rank 1** (2 Ações NET): o Jack In no Capanga e o Sonic Shock; a ficha mostra "AÇÕES
      NET 2/2", e o terceiro (o Jack In no Alvo) avisa "Sem Ações NET neste turno (2 de 2)." sem rolar;
    - **na rodada seguinte:** 0 de 2;
    - **o netrunner levado para longe:** o cartão do Jack Out inseguro (a distância e o alcance), a ligação some dos
      dois lados, e o bloqueio do Capanga fica em 3600 segundos;
    - **de volta ao lado:** o Jack In avisa os 60 minutos e não rola; com o bloqueio vencido, entra, e a rodada conta 1
      de 2;
    - **o alvo que anda:** o Capanga levado para longe também derruba o netrunner (e volta ao lugar no fim);
    - **o passo do Jack In (ciclo 95):** o netrunner levado para longe cai do Neuroport do Alvo (o cartão a mais);
    - **o passo da expulsão (ciclo 99):** o cartão traz o Jack Out inseguro, e o bloqueio do Alvo fica em 3600 segundos;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - uma Ação NET a mais que o Rank (A1);
      - a conta sem a rodada (A2);
      - o bloqueio que vale no segundo em que acaba (A3).
    - **No G4:**
      - a Ação NET que não se gasta (A4; o Jack In a mais abriu a janela do Alvo e derrubou também o passo seguinte);
      - o Jack In sem a conta no cliente (A5: rola, e o mestre recusa);
      - sem o gancho do alcance (A6: também o passo do Jack In);
      - o Jack Out inseguro sem o bloqueio (A7: também o passo da expulsão);
      - o Jack In sem a conferência do bloqueio no cliente (A8);
      - o alvo que anda não conta (A9).
    - **Fica sem mutação a conferência do mestre** (a conta e o bloqueio no `resolverJackIn`, no `resolverBreach` e no
      `resolverQuickhack`): o cliente confere antes, e o passo não manda o pedido por fora dele.
- **Dúvida nova** (nas dúvidas de regra): as Ações NET do Neuroport e as da arquitetura, em contas separadas.
- **Itens novos no ROADMAP** (regras da wiki que o sistema ainda não tem): o firewall de fábrica, o Neuroport como
  arquitetura NET, a conexão direta pelo Personal Link e o alvo que morre (com a ligação do token apagado).
- **Próximo:** o C9, parte 6 (o deck na Neuroport Cyberdeck Port).

### Ciclo 101 (2026-10-17): o C9, parte 6: o deck na Neuroport Cyberdeck Port (sessão KouArt)

Commit anterior: `30bc9e22` (ciclo 100).

- **A referência (a wiki):**
  - **"Do que o netrunner precisa":** "Deck na Neuroport Cyberdeck Port: 20 m contra arquiteturas NET e 50 m contra
    Neuroports. Paredes bloqueiam como sempre, e o Jack In precisa de linha de visão. Todo deck tem a versão para a porta
    pelo mesmo preço; ela não aceita hardware e usa o da sua Bodyweight (ou parecido). Encaixar ou tirar o deck da porta
    é uma Ação";
  - **o cartão da porta (o cyberware de 2077):** "Encaixado, você está totalmente conectado ao deck, que ganha o
    hardware da sua Bodyweight (ou parecida), e o alcance sobe para 20 m contra Arquiteturas NET e 50 m contra
    Neuroports".
- **Implementado:**
  - **`regras.mjs`:** `DECK_NA_PORTA` (20 e 50 m) e o `alcanceDoJackIn` com o deck na porta (50 m, sem o Range Upgrade);
  - **`netrun/regras-da-net.mjs`:**
    - `temPortaDoDeck`: a Neuroport Cyberdeck Port instalada (pelo catálogo ou pelo nome);
    - `netrunnerDo`: o deck na porta (a flag `naPorta` do cyberdeck equipado, com a porta instalada), e o hardware do
      deck não vale;
    - `alcanceDo`: com o deck na porta, os 20 m (ou o alcance do ponto, se for maior), sem o Range Upgrade;
  - **`neuroport.mjs`:** o Jack In e o gancho do alcance usam o alcance do deck na porta;
  - **a ficha (a aba NET):**
    - com a porta instalada, o cyberdeck equipado tem o botão "Externo" / "Na porta", que encaixa e tira o deck;
    - o "DECK EQUIPADO" diz "na porta";
    - o título dos Neuroports mostra o alcance (50 m).
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 121 de 133 (as 12 conhecidas):
    - no `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da wiki, o alcance do Jack In e o do
      ponto de acesso, o netrunner com o deck na porta (a flag e a porta) e o hardware que não vale;
    - no `tests/sistema/regras.test.mjs`, o teste do hardware do deck lia o `netrunnerDo` pela posição das chaves
      (`Object.values(...).slice(3)`); com a chave nova, lê pelo nome (a mesma conferência);
  - G4: 115 de 124 (as 9 conhecidas da integração). O passo novo, "O deck na Neuroport Cyberdeck Port", passou na
    primeira rodada:
    - **o deck externo, a 16 m do Capanga:** o Jack In avisa "longe demais (alcance 6 m)" e não rola; o deck não tem o
      botão da porta;
    - **a porta instalada (o mestre):** o botão "Externo"; encaixado pela ficha, "Na porta", o "DECK EQUIPADO" diz "na
      porta", e o título dos Neuroports, "ATÉ 50 M";
    - **na porta:** o Jack In a 16 m entra;
    - **andando um quadrado** (ainda a uns 16 m): continua ligado, sem o cartão do Jack Out inseguro;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o Jack In sem o alcance da porta (P1);
      - o ponto de acesso sem o alcance da porta (P2);
      - o hardware que vale também na porta (P3);
      - na porta sem a porta instalada (P4).
    - **No G4, todas no passo novo:**
      - o Jack In do cliente sem a porta (P5);
      - o alcance do gancho sem a porta (P6: o netrunner que anda cai);
      - o botão da porta sem a porta instalada (P7);
      - o botão que não encaixa (P8);
      - o título da ficha sem a porta (P9).
- **Dúvida nova** (nas dúvidas de regra): o hardware da Bodyweight no deck na porta.
- **Pendências do C9** (no ROADMAP): o firewall de fábrica, o Neuroport como arquitetura NET, a conexão direta pelo
  Personal Link e o alvo que morre (com a ligação do token apagado).
- **Próximo:** o C9, parte 7 (o firewall de fábrica).

### Ciclo 102 (2026-10-17): o C9, parte 7: o firewall de fábrica (sessão KouArt)

Commit anterior: `d23e318a` (ciclo 101).

- **A referência (a wiki, "Firewall de fábrica", Kit p. 26):** "Todo Neuroport tem um. Com Interface Rank 1 ou 2, o
  Jack In pede antes um teste de Interface contra DV6; falhar não alerta o alvo"; "Do Rank 3 em diante, o netrunner
  passa direto, sem teste"; "O firewall de fábrica não é um Passwall e não ocupa andar".
- **Implementado:**
  - **`regras.mjs`:** `FIREWALL_DE_FABRICA` (DV 6; sem teste do Rank 3 em diante), `pedeOFirewall` e `passouOFirewall`
    (com o total acima da DV);
  - **`documentos.mjs`:** o `rolarJackIn` aceita o rótulo, e o teste do firewall é a mesma conta (Interface + 1d10, sem
    o bônus de programa);
  - **`neuroport.mjs`:**
    - **o Jack In, no Rank 1 ou 2:** antes, o teste do firewall ("Firewall de fábrica"); falhando, não rola o Jack In;
    - **o mestre, no firewall que barrou:** gasta a Ação NET (em combate) e manda o cartão só a ele e aos donos do
      netrunner (o alvo não sabe);
    - **o mestre, no Jack In:** confere de novo o firewall passado.
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 122 de 134 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da
    wiki, o Rank que pede o teste e a DV;
  - G4: 116 de 125 (as 9 conhecidas da integração). O passo novo, "O firewall de fábrica", passou na primeira rodada:
    - **em combate, o netrunner de Rank 2:**
      - o firewall com 5 contra DV 6 não passa: o cartão só ao mestre e ao jogador, sem o Jack In, sem a Vontade do
        Capanga e sem ligação, e a Ação NET vai (1 de 2);
      - com 8, passa, e o Jack In (9 contra 7) entra (2 de 2);
    - **fora de combate, no Rank 3:** o Jack In rola sem o firewall;
    - **o passo das Ações NET (ciclo 100)**, com o netrunner de Rank 1: os dois Jack In passam antes pelo firewall (os
      dados fixos dos dois testes);
  - **mutações:** as 5 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - o Rank 3 que também pede o firewall (F1);
      - o empate com a DV que passa (F2).
    - **No G4:**
      - o cliente que não pede o firewall (F3: o mestre recusa o Jack In; também o passo das Ações NET);
      - o firewall que falhou e segue para o Jack In (F4);
      - o firewall que barrou sem gastar a Ação NET (F6).
    - **Ficam sem mutação:**
      - a conferência do mestre no Jack In (o cliente já confere);
      - o cartão do firewall só ao netrunner: o Capanga não tem dono jogador, e o teste não distingue quem o vê.
- **Pendências do C9** (no ROADMAP): o Neuroport como arquitetura NET, a conexão direta pelo Personal Link e o alvo que
  morre (com a ligação do token apagado).
- **Próximo:** o C9, parte 8 (o alvo que morre e o token apagado).

### Ciclo 103 (2026-10-17): o C9, parte 8: o alvo que morre e o token que sai da cena (sessão KouArt)

Commit anterior: `69e8a88a` (ciclo 102).

- **A referência (a wiki, "Quickhacks no Neuroport"):** "Você fica ligado até ser expulso, sair do alcance, fazer o
  Jack Out ou o alvo morrer. Desligado de qualquer jeito que não o Jack Out, é um Jack Out inseguro" (o teste de
  referência do ciclo 100 confere o texto).
- **Implementado (`neuroport.mjs`):**
  - **o alvo que morre:** o status de derrotado (o do Death Save que falhou, ou o do HUD), no mestre ativo, derruba
    quem está no Neuroport dele: o Jack Out inseguro (com o bloqueio de 60 minutos) e o cartão;
  - **o token que sai da cena:** a varredura do `deleteToken`, no mestre ativo:
    - as ligações que ficaram sem o alvo, ou sem o token do netrunner na cena do alvo, caem, com o cartão ("saiu da
      cena");
    - os invasores sem a ligação de volta saem do alvo.
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 122 de 134 (as 12 conhecidas; nenhuma regra pura nova);
  - G4: 117 de 126 (as 9 conhecidas da integração). O passo novo, "O alvo que morre e o token que sai da cena", passou
    na primeira rodada:
    - **o netrunner no Capanga e no "Alvo de Passagem"** (um personagem do mestre, ao lado);
    - **o token do netrunner apagado:** as duas ligações caem, um cartão cada ("saiu da cena"), e os invasores dos dois
      somem;
    - **de volta (um token novo), no Capanga, que morre** (o status): o cartão do Jack Out inseguro e o bloqueio de 3600
      segundos;
    - **o token do alvo de passagem apagado:** a ligação cai, com o cartão, e os invasores do ator (ligado) somem;
  - **mutações:** as 6 caíram no passo novo, e o arquivo voltou (conferido pelo md5):
    - sem o gancho da morte (M1);
    - a morte por outro status, o inconsciente (M2);
    - o alvo morto sem o Jack Out inseguro, só com o cartão (M3);
    - sem o gancho do token apagado (M4);
    - o netrunner sem token na cena que continua ligado (M5);
    - os invasores sem a ligação de volta que ficam (M6).
- **As limpezas dos passos do Neuroport** (os 7 de antes) tiram as flags do netrunner antes de apagar o token: senão a
  varredura manda o cartão do Jack Out inseguro no meio do passo seguinte (a lição no QUALITY_GATES).
- **Pendências do C9** (no ROADMAP): o Neuroport como arquitetura NET e a conexão direta pelo Personal Link.
- **Próximo:** o C9, parte 9 (a conexão direta pelo Personal Link).

### Ciclo 104 (2026-10-17): o C9, parte 9: a conexão direta pelo Personal Link (sessão KouArt)

Commit anterior: `a770475c` (ciclo 103).

- **A referência (a wiki, "Conexão direta", Kit p. 27):**
  - "Dá para entrar no Neuroport de alguém pelo Personal Link (Interface Plug). Num alvo que não quer, só se ele estiver
    inconsciente ou contido sem poder resistir. Acordado, ele sabe e pode tentar te expulsar";
  - "Ligado direto, você ganha uma Ação NET a mais por turno e passa direto por todos os Passwalls (o Black ICE, não)";
  - "Se você ou o alvo se afastar mais de 2 m (1 quadrado), ou o cabo for arrancado ou cortado, você é desligado à
    força".
- **As decisões do usuário (2026-10-17, a pergunta antes do ciclo):**
  - **a conexão direta:** sem rolar, com o alvo inconsciente ou agarrado, ou quando o dono aceita numa janela (o
    mestre, pelo NPC); o firewall de fábrica vale (não é um Passwall);
  - **o Neuroport como arquitetura** (a última parte do C9): simples. O painel com os andares e, no Jack Out inseguro, o
    cartão diz qual Black ICE do deck do alvo age; o mestre aplica, sem descer andares;
  - **o C29:** depois do C9, o catálogo de 2077 pela loja da wiki vem primeiro.
- **Implementado:**
  - **`regras.mjs`:** `CONEXAO_DIRETA` (o cabo de 2 m e a Ação NET a mais), `acoesNetComDireta` e `alcanceDaLigacao`
    (a direta, 2 m; a outra, o do deck);
  - **`neuroport.mjs`:**
    - **as conferências da entrada** (o Jack In e a conexão direta) e o firewall de fábrica, numa função cada;
    - **a "Conexão direta":** no alvo marcado a até 2 m (sem conferir a vista), com a Ação NET e o firewall;
    - **o mestre, na conexão direta:** inconsciente, liga sem o alvo perceber; agarrado, liga e ele percebe; senão, o
      dono aceita ou recusa (`combate.pedir`, o pedido "consentir"; pelo NPC, a janela do mestre). Ligada, os Passwalls
      ficam passados;
    - **as Ações NET:** uma a mais por turno com uma conexão direta;
    - **o alcance:** a direta cai a mais de 2 m (o gancho do movimento), com o cartão do Jack Out inseguro;
    - **"Arrancar o cabo":** na ficha do alvo, o netrunner ligado direto cai à força (o Jack Out inseguro);
  - **`combate.mjs`:** o pedido "consentir" (a janela de sim ou não no cliente do dono);
  - **a ficha:** o botão "Conexão direta" ao lado do Jack In; a marca "DIRETA" na ligação; o "Arrancar o cabo" em "No
    seu Neuroport".
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 123 de 135 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da
    wiki, a Ação NET a mais e o alcance de cada ligação;
  - G4: 118 de 127 (as 9 conhecidas da integração). O passo novo, "A conexão direta pelo Personal Link", passou na
    terceira rodada (na primeira, o teste chamava o `.then` do Jack Out, que no jogador não devolve uma promessa; na
    segunda, a janela de aceitar junta os dois botões no texto: "AceitarRecusar"). Em combate, com o netrunner do jogador
    a 2 m do Capanga (com um Self-ICE) e do Alvo:
    - **o Capanga acordado e solto:** a janela do mestre ("quer se ligar direto [...] Aceita?"), que recusa; o cartão, sem
      ligação, e a Ação NET vai (1 de 3);
    - **inconsciente:** liga sem ele perceber, com o Passwall passado ("DIRETA PASSWALLS 1/1 · DV 6 Quickhack Jack Out")
      e a Ação NET a mais (2 de 4);
    - **depois do Jack Out:** 2 de 3; **agarrado:** liga, e ele percebe (3 de 4);
    - **o netrunner a 6 m:** cai à força ("alcance 2 m"), com o Jack Out inseguro;
    - **na rodada seguinte, o Alvo do jogador:** a janela de aceitar no navegador dele, que aceita (1 de 4); pela ficha
      do Alvo ("Expulsar Arrancar o cabo"), o cabo arrancado derruba o netrunner, e os bloqueios do Alvo e do Capanga
      ficam;
  - **mutações:** as 10 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - sem a Ação NET a mais (D1);
      - a ligação direta com o alcance do deck (D2).
    - **No G4:**
      - sem pedir ao dono (D3: o acordado e solto liga; rodou de novo depois de esperar a trava do G4 da sessão Codex);
      - o inconsciente que percebe (D4);
      - os Passwalls que não ficam passados (D5);
      - sem a Ação NET a mais na conta do netrunner (D6);
      - o gancho do alcance sem os 2 m do cabo (D7);
      - o agarrado que não conta (D8: a janela do mestre fica esperando e derruba também o passo seguinte);
      - o "Arrancar o cabo" na ligação que não é direta (D9: os passos do Jack In e da expulsão, pela lista "No seu
        Neuroport");
      - o cabo arrancado sem a queda (D10).
- **Pendência do C9:** o Neuroport como arquitetura (a versão simples que o usuário escolheu).
- **Próximo:** o C9, parte 10 (o Neuroport como arquitetura, a versão simples).

### Ciclo 105 (2026-10-18): o C9, parte 10: o Neuroport como arquitetura; o C9 completo (sessão KouArt)

Commit anterior: `3abe0c2e` (ciclo 104).

- **A referência (a wiki, "O Neuroport como arquitetura NET", Kit p. 26–27):**
  - "O Neuroport funciona como uma arquitetura NET. Sem Self-ICE nem Black ICE, tem um andar só: o nó de controle do
    Holophone (DV10)"; "Cada Passwall (Self-ICE) e cada Black ICE é um andar a mais. O dono escolhe a ordem dos
    andares"; "O Neuroport não instala Black ICE: ele usa o Black ICE do cyberdeck ligado a ele";
  - **a tabela dos exemplos:** "1 Self-ICE e um deck com Hellhound: Black ICE: Hellhound (do deck) · Passwall (DV6) ·
    Nó de controle: Holophone (DV10)";
  - **o Jack Out inseguro:** "sofre o efeito de todo Black ICE encontrado e ainda ativo";
  - **a decisão do usuário (2026-10-17):** simples. O painel com os andares e, no Jack Out inseguro, o cartão diz qual
    Black ICE do deck do alvo age; o mestre aplica, sem descer andares.
- **Implementado:**
  - **`regras.mjs`:** `HOLOPHONE` (DV 10) e `andaresDoNeuroport`, os andares de cima para baixo, na ordem dos exemplos
    da wiki (o Black ICE do deck, os Passwalls e o Holophone);
  - **`neuroport.mjs`:**
    - `blackIceDoNeuroport`: os programas de Black ICE instalados no cyberdeck equipado do alvo; `andaresDe`, os
      andares dele;
    - **o Jack Out inseguro:** devolve as notas do cartão, com o Black ICE do deck do alvo que ainda tem REZ (o nome e o
      efeito, para o mestre aplicar); vale no alcance, na expulsão, no alvo que morre e no cabo arrancado;
  - **a ficha:** abaixo de cada ligação, a linha "ANDARES: ..." do Neuroport do alvo.
- **O C9 terminou** (ciclos 95 a 105): o Jack In e o Jack Out, o Breach, os quickhacks e os efeitos simples, a
  expulsão, as Ações NET fora da arquitetura e o Jack Out inseguro, o deck na Neuroport Cyberdeck Port, o firewall de
  fábrica, o alvo que morre e o token que sai, a conexão direta e o Neuroport como arquitetura.
- **Testes:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 124 de 136 (as 12 conhecidas). No `tests/sistema/neuroport.test.mjs`, 1 teste de referência novo: o texto da
    wiki e os quatro exemplos da tabela, cada um igual ao que o sistema monta;
  - G4: 119 de 128 (as 9 conhecidas da integração). O passo novo, "O Neuroport como arquitetura", passou na primeira
    rodada:
    - **o Capanga com um Self-ICE e um deck com o Hellhound:** depois do Jack In, a ficha do netrunner mostra "ANDARES:
      Black ICE: Hellhound (do deck) · Passwall (DV6) · Nó de controle: Holophone (DV10)", como no exemplo da wiki;
    - **o netrunner levado para longe:** o cartão do Jack Out inseguro traz a nota do Hellhound (o efeito, para o mestre
      aplicar);
    - **com o Hellhound sem REZ:** de novo no Neuroport e longe, o cartão traz só a nota do Jack Out inseguro;
  - **mutações:** as 6 caíram, e os arquivos voltaram (conferido pelo md5).
    - **No G3:**
      - os Passwalls antes do Black ICE (N1);
      - o Holophone com outra DV (N2).
    - **No G4, todas no passo novo:**
      - o Black ICE do deck por outra classe de programa (N3);
      - o Black ICE sem REZ que age também (N4);
      - o cartão do alcance sem as notas do Jack Out inseguro (N5);
      - a ficha sem os andares (N6).
- **Próximo:** o C29, parte 2: o catálogo de 2077 pela loja da wiki (a decisão do usuário de 2026-10-17).

### Ciclo 106 (2026-10-18): o C29, parte 2: o catálogo de 2077 pela loja da wiki (sessão KouArt)

Commit anterior: `2e8c159f` (a reserva; o ciclo 105 é o `c7ee93d5`).

- **A decisão do usuário (2026-10-17):** depois do C9, o C29 começa pelo catálogo de 2077 pela loja.
- **A referência (a wiki de 2026-10-17):** a loja (`loja-catalogo.js`) vende 112 itens de 2077 (53 de armas e munição,
  38 de cyberware e 21 de netrunning), o Mission Kit e o que a revisão do suplemento de fã deixou. Antes eram 157.
- **O que se achou:** o catálogo já era o da loja nova desde o build do ciclo 94 (o `build/conteudo-2077.mjs` segue o
  `foundry-2077/build` do master). A conferência item por item do teste (o preço, os números da arma e da munição, o
  cyberware, o deck e o programa) passa, com uma diferença só: os decks com marca não têm RAM desde a revisão de
  2026-10-16 (a loja: `null`), e o sistema guarda 0, que a ficha não mostra. Os testes de referência tinham os números
  da wiki antiga.
- **Testes (os números da wiki nova):**
  - **`tests/sistema/regras.test.mjs`, "Catálogo de 2077":**
    - a loja tem 112 itens de 2077 (eram 157);
    - **conferência nova:** o catálogo de 2077 é a loja mais os 16 quickhacks, que não se compram (nada mais fora dela);
    - a RAM do deck: a da loja, ou 0 quando ela não tem;
  - **`tests/sistema/falha-da-arma.test.mjs`:** 41 armas de 2077 (eram 46), todas com o efeito de falha padrão;
  - **`tests/cenarios/v14.js`, o passo dos compêndios:** os de 2077 com 53, 38 e 37 (eram 58, 62 e 48; o de netrunning
    tem também os 16 quickhacks).
- **Resultados:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 126 de 136 (2 das conhecidas passaram: o catálogo de 2077 e o efeito de falha das armas; ficam 10);
  - G4: 120 de 128 (o passo dos compêndios passou; ficam 8 conhecidas);
  - **mutações, no catálogo gerado** (o `dados/catalogo.json`; o ciclo não muda código): as 3 caíram no G3, e o arquivo
    voltou (conferido pelo md5):
    - um item da loja com outro id (C1: falta na loja e sobra fora dela; também o teste do Mission Kit);
    - um deck com marca com RAM (C2);
    - um quickhack que vira outro programa (C3: sobra fora da loja um que não é quickhack; também o teste do Mission
      Kit).
- **O QUALITY_GATES:** a lista das falhas conhecidas desde a integração do master estava com a NET, que saiu no ciclo
  94; agora tem 6 no G3 e 3 no G4.
- **Próximo:** outra parte do C29 (as armas de 2077 pelo Mission Kit, o TeleOptics de 2077, a fundação e as opções, ou
  as Roles).

### Ciclo 107 (2026-10-18): o C29, parte 3: o TeleOptics de 2077 vale o do RED (sessão KouArt)

Commit anterior: `c00c3857` (a reserva; o ciclo 106 é o `87c44b4b`).

- **A referência (a wiki de 2026-10-17):**
  - **o catálogo (`system-catalog.js`):** o TeleOptics dá "+1 em tiros mirados contra alvos a 51 m ou mais";
  - **a revisão do suplemento de fã (`system-2077.js`):** "Cyberware que repete um do RED (vale o do RED): o Kerenzikov,
    o TeleOptics, o Pain Editor, o Subdermal Armour e o Biomonitor de 2077 [...]". O TeleOptics de 2077 saiu da wiki e
    do catálogo (o ciclo 106). Antes, ele dava +1 também no tiro único.
- **Implementado (`regras.mjs`):**
  - **`TELEOPTICS`:** só o do RED;
  - **`tipoDeTeleOptics`:** o TeleOptics de 2077 que um ator ainda tenha (de antes da wiki de 2026-10-17), pelo id antigo
    do catálogo ou pelo nome "TeleOptics (2077)", é o do RED: +1 só no tiro mirado, e uma vez só com o outro.
- **Testes (a wiki nova):**
  - **`tests/sistema/regras.test.mjs`, o TeleOptics:** o texto da revisão ("vale o do RED") e a falta do de 2077 na wiki;
    só o do RED nas regras; o de 2077, pelo id e pelo nome, é o do RED; uma vez só; nada no tiro único; o catálogo sem
    o de 2077;
  - **`tests/sistema/migracao.test.mjs`, o passo 1:** o exemplo de "outro cyberóptico" era o de 2077, que saiu do
    catálogo; no lugar, o Targeting Scope (com o Anti-Dazzle, como antes);
  - **`tests/cenarios/v14.js`, a janela de rolagem:** o de 2077 (feito à mão, com o nome e o id antigo do catálogo) no
    tiro único só traz a luneta; no mirado, o TeleOptics marcado e a luneta desmarcada.
- **Resultados:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 128 de 136 (2 das conhecidas passaram: o TeleOptics e o passo 1 da migração; ficam 8);
  - G4: 121 de 128 (o passo da janela de rolagem passou; ficam 7 conhecidas);
  - **mutações:** as 4 caíram no G3 (a regra é pura), e o arquivo voltou (conferido pelo md5):
    - o de 2077 que não vale o do RED, nem pelo id nem pelo nome (T1);
    - o do RED também no tiro único (T2);
    - só pelo id antigo, sem o nome (T3);
    - só pelo nome, sem o id antigo (T4).
- **A dúvida do TeleOptics** (nas dúvidas de regra): a wiki de 2077 dizia "vale a versão de 2077" nos itens com o nome
  de um do RED; agora diz "vale o do RED". A dúvida ganhou a mudança.
- **Próximo:** outra parte do C29 (a fundação e as opções, as Roles ou as armas de 2077 pelo Mission Kit).

### Ciclo 108 (2026-10-18): o C29, parte 4: a fundação e as opções sem os cyberópticos e as placas de 2077 (sessão KouArt)

Commit anterior: `6f512fa3` (a reserva; o ciclo 107 é o `be5b988a`).

- **A referência (a revisão do suplemento na wiki de 2026-10-17, `system-2077.js`):**
  - "o Basic Kiroshi Optics (o Cybereye, com opções de graça)", na lista do "Cyberware que repete um do RED (vale o do
    RED)";
  - "Skin Weave de 2077 e as placas Carapace, Countershell, Nano-plating, ProxiShield e RangeGuard: o sistema de placas
    do suplemento, que o RED não tem", na lista do que sai;
  - o Neuroport continua "com 5 slots de opção". Os oito saíram da loja e do catálogo (o ciclo 106), e o Neuroport é a
    única fundação de 2077.
- **Implementado (`regras.mjs`):** sem o encaixe das placas. O Skin Weave e o Subdermal Armour de 2077 recebiam só as
  opções de placa, e as placas pediam fundação; agora a opção vai numa fundação do mesmo tipo (o Sensor Array recebe as
  do Cyberaudio, como antes), e as de categoria não pedem fundação. A placa que um ator ainda tenha (o catálogo a tinha
  como cyberware externo) fica sem pedir fundação, como o cyberware externo do RED.
- **Testes (`tests/sistema/regras.test.mjs`, a fundação e as opções, pela wiki nova):** os trechos da revisão (o Kiroshi
  e as placas); os oito fora do catálogo; os slots das fundações, com o Neuroport a única de 2077; o Neuroport recebe a
  neuralware e não a do Cyberaudio; a placa antiga não pede fundação.
- **Resultados:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 129 de 136 (1 das conhecidas passou: a fundação e as opções; ficam 7);
  - G4: 121 de 128 (as 7 conhecidas, na segunda rodada). Na primeira rodada, o passo do Neuroport como arquitetura (do
    ciclo 105) falhou sem relação com a mudança: ele pegava o deck do Capanga pela posição no que o
    `createEmbeddedDocuments` devolve, e o Hellhound foi
    instalado no id do Self-ICE. A lição já estava no QUALITY_GATES (ciclo 43), para tokens e combatentes; ela ganhou os
    itens, e o passo acha o deck pelo tipo;
  - **mutações:** as 3 caíram no G3 (a regra é pura), e o arquivo voltou (conferido pelo md5): a placa de antes de volta
    (F1), toda opção pedindo fundação (F2) e o Sensor Array sem as opções do Cyberaudio (F3).
- **Próximo:** o C29 que falta: as Roles e as armas de 2077 pelo Mission Kit (com o teste Smart).

### Ciclo 109 (2026-10-18): o C29, parte 5: as Roles pela wiki nova (sessão KouArt)

Commit anterior: `2befb77a` (a reserva; o ciclo 108 é o `d8b7a4c5`).

- **A referência (a wiki de 2026-10-17):**
  - **o criador (`system-criacao.js`):** as 10 Roles do RED, e as antigas Face e Corpo viram Rockerboy e Exec (o
    `roleAliases`), como antes;
  - **a revisão do suplemento (`system-2077.js`, "Regras que saíram"):** "Roles: o Face e o Corpo (valem as dez Roles do
    RED), o Lawman com Investigator e o desconto do clã do Nomad". Antes, a wiki dizia "Com o Mission Kit, valem as 10 do
    RED, e os personagens que eram Face ou Corpo viram Rockerboy e Exec" e guardava o Investigator numa seção de
    opcional, que saiu;
  - **"Duas Roles na criação" (`system-rules.js`, regra da mesa):** "escolha a Role principal e, se quiser, uma segunda
    Role diferente [...] Cada Role tem suas habilidades e seu Lifepath; a principal define os STATs, as perícias e o único
    pacote de equipamento". O criador guarda a segunda em `roleSecundaria` (o id, o Rank, as habilidades, o Lifepath e a
    oficina).
- **O que se achou:** o sistema já seguia o criador (as 10 Roles, as antigas, sem situacionais de Role); os testes de
  referência tinham as frases da wiki antiga. Não muda código.
- **A segunda Role vai com o C23** ("Mais de uma Role"): é o modelo de dados da ficha (hoje, uma Role só), o import pelo
  criador e os derivados de cada Role (a Interface do Netrunner, o Moto do Nomad, a Consciência de Combate do Solo).
- **Testes (`tests/sistema/regras.test.mjs`):**
  - **as Roles do RED:** a linha das "Regras que saíram", com o resto como antes (o criador, as antigas, o Moto);
  - **os situacionais de Role:** o Investigator nas "Regras que saíram", sem a seção de opcional.
- **Resultados:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 131 de 136 (2 das conhecidas passaram: as Roles e os situacionais; ficam as 5 das armas de 2077);
  - G4: sem rodar de novo: o ciclo só muda `tests/sistema`, e o sistema e o cenário são os do G4 do ciclo 108 (121 de
    128, as 7 conhecidas, todas das armas de 2077);
  - **mutações:** as 2 caíram no G3, e os arquivos voltaram (conferido pelo md5): o Face que vira outra Role (R1) e os
    situacionais de Role de volta (R2).
- **Próximo:** o que falta do C29, as armas de 2077 pelo Mission Kit (com o teste Smart); ou o C23, com a segunda Role.

### Ciclo 110 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 1: a arma Smart (sessão KouArt)

Commit anterior: `abb5cb85` (a reserva, em partes; o ciclo 109 é o `f4ccaaec`).

- **A referência (a wiki de 2026-10-17):**
  - **`system-2077.js`, "Smart" (Kit p. 32):** "A arma precisa estar conectada a você por um Personal Link (o Interface
    Plug que vem no Neuroport) ou por um Subdermal Grip. Sem conexão, não dispara." e "+1 nos ataques à distância com a
    arma." A munição Smart melhorada dá a segunda chance (fica para a parte 2);
  - **a revisão do suplemento:** o Smart Link de 2077 saiu ("vale o do RED": o Smart Link (o Subdermal Grip)), e o teste
    Smart (10 ou 12 + 1d10 no lugar de REF + perícia) não está mais na página;
  - **`system-rules.js`:** o Neuroport "já traz o Neural Link, o Personal Link (os Plugs de Interface)";
  - **as armas:** a Palica, "disparar os dois canos de uma vez gasta os 2 cartuchos e o dano sobe para 4d6" (antes, o
    teste Smart subia para 12 + 1d10); a Kappa, "trava em dois alvos a até 4 m um do outro: se o ataque errar o primeiro,
    as balas Smart vão para o segundo".
- **O que muda (`regras.mjs`, `combate.mjs`, `documentos.mjs`, `ficha-personagem.mjs`, `configuracoes.mjs`,
  `build/conteudo-2077.mjs`):**
  - **a ligação:** `ehLigacaoSmart` (o Neuroport, os Interface Plugs, o Subdermal Grip e o Smart Link de um ator de
    antes, pelo id do catálogo ou pelo nome; o Smartgun Link do CORE é acessório de arma, não conta) e o
    `temLigacaoSmart` do ator, no lugar do `temSmartLink`. Sem ela, a arma Smart não dispara em modo nenhum nem gasta
    bala ("arma Smart, só dispara ligada pelo Personal Link (o Interface Plug do Neuroport) ou pelo Subdermal Grip."), e
    a ficha avisa "sem ligação";
  - **o +1:** `BONUS_SMART`, a parte "Arma Smart +1" de todo ataque à distância da arma (o tiro, o mirado, o autofogo,
    os dois canos), somada a REF + perícia; a dica do "Atacar" diz o +1;
  - **o teste Smart saiu:** o `testeSmart`, o modo "smart" (o botão Smart), a nota do cartão, o "(Smart)" da descrição e
    as duas configurações ("Ataque das armas Smart" e "Arma Smart sem o Smart Link"). Os valores que um mundo guardou
    delas ficam sem uso;
  - **os dois canos da Palica:** pelo dano, 4d6, como a Testera (o build lê "os dois canos de uma vez: 4d6"; saíram as
    flags `smartVariasBalas`, `smartDoisAlvos` e `smartDoisCanos`, e a Kappa guarda `doisAlvos`);
  - **os dois alvos da Kappa:** no tiro (não no mirado), com dois alvos marcados; antes, só no teste Smart;
  - **o texto "Neste sistema" das armas Smart:** o sistema aplica a ligação e o +1; a munição Smart melhorada, o mestre.
- **Testes:**
  - **G3 (`tests/sistema/regras.test.mjs`):** o teste novo da arma Smart (o texto da wiki, o +1, sem o `testeSmart`, a
    ligação pelo id e pelo nome, o Smart Link fora do catálogo, os dois canos 4d6 e os dois alvos pelo perfil, nenhuma
    flag do teste Smart no catálogo), no lugar do "Teste Smart (wiki)"; o do perfil e o das regras de cada modelo sem as
    linhas do teste Smart;
  - **G4 (`tests/cenarios/v14.js`):**
    - **a arma Smart:** a Yukimura (padrão, DV da SMG) sem ligação não dispara nem gasta bala e a ficha avisa; com o
      Subdermal Grip, o tiro é REF + perícia + 1 (18, a fórmula e a parte "Arma Smart +1") e o mirado também (12, erra);
    - **os dois canos:** a Palica sem ligação não dispara; com o Neuroport, os dois canos dão 16 e 4d6;
    - **a Dian:** com o Subdermal Grip, +14 na ficha, e 20 com a coronha recolhida. O passo quebrava (`TypeError`) na
      rajada da Lexington, que não sai (ela não tem mais autofogo): agora a checagem falha e o resultado mostra a Dian;
    - **a Kappa:** ligada pelos Interface Plugs, os dois alvos no tiro, com o ataque 20 e o dano 3d6.
- **Resultados:**
  - G1: 67 arquivos, 0 erros; G2: 0 erros;
  - G3: 132 de 136 (saiu a falha conhecida do teste Smart; ficam as 4 das partes seguintes: o perfil das Tech, o
    Ricochete, a Carga Tech e as regras de cada modelo);
  - G4: 125 de 128 (saíram 4 das conhecidas: a arma Smart, a Kappa, os dois canos e o "sem erros de JS na
    página"; ficam 3, da Tech e da Lexington: a carga Tech, a Dian e Lexington, que agora mostra a Dian certa, e a
    checagem de avisos). A primeira rodada pegou um erro do passo novo (a parte é "REF +8", não "REF 8");
  - **mutações:** as 8 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (131 de 136 cada): o +2 (S1), o Subdermal Grip fora da ligação (S2), a arma Smart que dispara sem ligação
      (S3) e a Palica sem os dois canos pelo dano (S4);
    - no G4: o ataque que não procura a ligação (S5: a Yukimura, a Palica, a Dian e a Kappa), sem o +1 (S6: as mesmas
      quatro), os dois alvos da Kappa só no modo Smart que saiu (S7: a Kappa) e a ficha sem o aviso "sem ligação" (S8: a
      Yukimura).
- **Próximo:** a parte 2 do C29, a munição Smart melhorada (a segunda chance com 14 + 1d10, sem as penalidades de visão).

### Ciclo 111 (2026-10-18): C14, munições especiais (sessão Codex)

Commit anterior: `522fa62` (ciclo 110). Item reservado antes da implementação (`b4823bb`); os ciclos 89 a 110 das
outras sessões foram integrados antes do fechamento, preservando os registros e as implementações delas.

- **Fontes:** `system-catalog.js`, Munição (p. 344–347); os itens `core/ammo` e o cyberware do CORE 0.92.4; a API
  `modules/api/actor/empable-items.js` e a macro Get EMP'd. O CORE sorteia nomes na macro; a escolha EMP pelo mestre
  segue a wiki. Os arquivos de regra da wiki não mudaram.
- **Decisões do usuário:** a margem da Inteligente RED é contra a defesa usada, inclusive a Evasão rolada; a segunda
  tentativa permite outra esquiva. Inclui o tiro mirado, mantendo local e consequências: a repetição usa somente
  10 + 1d10 + Sorte, sem repetir −8 nem bônus de mira.
- **Implementado:**
  - resistências por alvo, no navegador do dono; sem resposta, o mestre rola. Empate na DV falha;
  - biotoxina (DV15, 3d6) e veneno (DV13, 2d6) com dano próprio direto no HP, sem SP, ablação ou crítico;
  - sonífera (DV13): inconsciente e caído, acordar com dano ou Ação, sem levantar; flashbang (DV15) e gás (DV13) com
    lesões temporárias, sem bônus de dano e preservando as anteriores. Proteções parciais, Anti-Dazzle em par,
    proteção dos ouvidos, olhos de carne e filtros são conferidos separadamente;
  - incendiária só quando o dano passa da SP, 2 HP no fim do turno, sem acumular com outro ataque nem com o fogo da
    NET; apagar com uma Ação. Expansiva acrescenta outra lesão diferente ao Objeto estranho, sem segundo +5,
    inclusive no modo Anunciar;
  - Inteligente RED com Luneta de Mira instalada e operante, margem de até 4, nova conta e outra esquiva, sem gastar
    outro projétil, incluindo míssil. A segunda tentativa é rolada pelo atacante no próprio navegador;
  - EMP (Cybertech DV15): o mestre ativo escolhe até dois eletrônicos vulneráveis em uso. A proteção considera
    fundação, opções e conjunto. Os itens ficam inoperantes, com efeitos, opções, programas e bônus manuais
    interrompidos, sem mudar instalação, uso ou Humanidade. O cartão encerra por alvo e desfaz só o que criou;
  - sono, lesões temporárias e EMP expiram após 60 segundos do mundo. O rastreador avança três segundos por rodada
    por `Combat#getTimeDelta`, sem mudar a apresentação dos efeitos antigos em rodadas fora de combate.
- **Integração com a NET e os ciclos 95 a 110:** deck, hardware, programas, porta implantada, Neuroport e Self-ICE
  respeitam EMP. O deck parado bloqueia ações, inclusive do mestre e nas conexões já abertas; guardar o deck não
  contorna a parada. Não rezza outro Black ICE. Jack Out continua livre. Cliente e mestre revalidam o equipamento
  depois de rolagem, resistência, catálogo, escolha e consentimento. Quando o Self-ICE volta, o Personal Link
  conserva o acesso aos quickhacks, com a mesma conta nos portões e na ficha; as flags da ligação permanecem.
  A ligação da arma Smart do Kit também é reconferida se o EMP chegar com a janela do tiro aberta.
- **Dados:** seis tipos de item recebem Eletrônico/Protege contra EMP. Os 320 itens CORE do catálogo mudam somente
  nesses campos e no marcador da migração; o restante é idêntico ao ciclo 110. O passo 5 recupera os metadados antigos
  e preserva a edição já migrada e o Eletrônico antigo do equipamento.
- **Testes e resultados:**
  - G1: 70 arquivos, nenhum erro; G2: nenhum erro;
  - G3: 144 de 148, com as quatro falhas conhecidas das armas de 2077; os 12 testes novos passam;
  - G4: 135 de 137, com as falhas conhecidas de Carga Tech e Dian/Lexington. A checagem de avisos passou nesta
    rodada; a falha conhecida dos avisos da Lexington continua registrada no QUALITY_GATES. Nenhum erro de JS;
  - os nove passos C14 passam: regras, estado posterior, cartões, botões, autoria das rolagens, dois navegadores,
    minuto, avanço real das rodadas, Desfazer e esperas interrompidas por EMP. As capturas de EMP e do jogador foram
    revisadas. O teste entre clientes usa o token da cena criada pelo passo, sem depender da cena vista no canvas;
  - as duas regressões da integração foram reproduzidas antes das correções: o Self-ICE restaurado retirava o botão
    Quickhack da ligação direta, e a arma Smart gastava bala e Sorte após perder a ligação durante a janela.
- **Mutações:** 83 distintas, todas detectadas, uma por vez: 15 de regras, três de build e 65 com navegador. Os bytes
  originais voltaram exatamente, conferidos por MD5, incluindo catálogo e arquivo gerado nas de build. Depois da
  integração foram repetidas as 17 anteriores de regras/build e as de bônus manual, resistência do jogador e autoria
  da segunda tentativa. As cinco novas provam o acesso direto após o retorno do Self-ICE (regra, cliente, mestre e
  ficha) e a recusa da Smart do Kit durante a janela. A trava compartilhada e a checagem de mesa vazia foram mantidas.
- **Limites:** fumaça continua manual; o cybermembro parado é narrado como pendurado pelo cartão. A segunda chance
  da munição Smart melhorada do Kit (14 + 1d10) fica no C29. A campanha real e o servidor não foram alterados.

### Ciclo 112 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 2: a munição Smart melhorada (sessão KouArt)

Commit anterior: `20a21c33` (a reserva do C15 da sessão Codex). O ciclo 111 é o `011deca0` (o C14 da sessão Codex), e o
ciclo 110, o `522fa62a`.

- **A referência (a wiki de 2026-10-17, `system-2077.js`, "Munição Smart melhorada", Kit p. 32):** "Só funciona em arma
  Smart; uma arma com Smartgun Link não conta."; "Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra
  coisa que atrapalhe a visão."; "Segunda chance: se o ataque à distância errar a DV por 5 ou menos, você tenta de novo
  na hora, com 14 + 1d10 (dá para somar Sorte) no lugar de STAT + perícia + bônus, contra a mesma DV. As penalidades do
  primeiro tiro continuam valendo." E, na arma Smart: "Com outra munição, fica só o +1."
- **O que muda:**
  - **`regras.mjs`:** `SEGUNDA_CHANCE` (14, a margem 5), `smartMelhoradaVale` (a arma Smart com a munição de flag
    `smartMelhorada`; a Smart do CORE não tem), `ehPenalidadeDeVisao` (dos modificadores comuns, a pouca luz e a tarefa
    encoberta), `cabeSegundaChance` (a DV, ou a esquiva, menos o total, de 0 a 5) e `partesDaSegundaChance` (14 e as
    penalidades do primeiro tiro);
  - **`combate.mjs`:**
    - **no ataque:** as penalidades de visão escolhidas na janela de rolagem saem do teste, e o cartão diz quais; as
      outras penalidades vão no pedido, para a segunda chance;
    - **no mestre:** o alvo que o ataque errou por 5 ou menos (o tiro, o mirado, o autofogo) ganha a segunda chance,
      contra a mesma DV ou a mesma esquiva; no cartucho e no explosivo, a segunda chance é contra a DV da área, e as
      esquivas dos alvos são contra o total novo. A linha e o cartão guardam o total (`segundaChance`) e dizem quanto
      faltou;
    - **quem rola:** o jogador que atacou, no computador dele (o pedido `segundaChance`, pela janela de rolagem, com a
      Sorte, menos com "Rolar direto"); sem resposta, o mestre rola, sem a Sorte. O ataque do mestre rola direto;
    - **na ficha:** a dica do "Atacar" da arma Smart com a munição melhorada carregada;
  - **o build:** a munição Smart melhorada diz o que o sistema faz, e o Rebuild fica com o "ainda não"; o texto "Neste
    sistema" das armas Smart.
- **Testes:**
  - **G3 (`tests/sistema/regras.test.mjs`):** o teste novo da munição (o texto da wiki, a base e a margem, só na arma
    Smart, as penalidades de visão, a conta da margem, as partes da segunda chance e o texto das 9 munições do Kit);
  - **G4 (`tests/cenarios/v14.js`):**
    - **a munição Smart melhorada:** a Yukimura ligada pelo Subdermal Grip erra o Longe por 4 e pega na segunda chance
      (21, com o dano); erra por 5 e de novo (19); o mirado erra por 4 e a segunda chance leva o −8; por 6, não tem; pela
      janela, a pouca luz e a tarefa encoberta saem e o Exausto fica, nos dois testes; a pistola do CORE com a mesma
      munição não tem; a Palica com o cartucho melhorado erra a DV 13 por 2 e passa na segunda chance (a área);
    - **o jogador:** o Alvo (dele) atira com a munição melhorada, erra por 4, e a segunda chance rola no computador
      dele (o autor da mensagem é o Jogador), como o dano.
- **Resultados:**
  - **antes da integração com o ciclo 111 da sessão Codex:** G1 67 arquivos e G2 sem erros; G3 133 de 137 (as 4
    conhecidas, das partes seguintes); G4 127 de 130 (as 3 conhecidas, da Tech e da Lexington; os 2 passos novos
    passaram);
  - **a integração:** o ciclo 111 do Codex trouxe a munição Inteligente do RED (a do CORE, com o Targeting Scope: errou
    por 4 ou menos, a segunda tentativa com 10 + 1d10), que deixa de fora a munição de 2077. As duas não se somam: a
    Smart melhorada não é a Inteligente, e a Inteligente não é a melhorada. Os conflitos no `combate.mjs` (o ataque,
    o explosivo e o cartão) ficaram com as duas; a segunda chance na área passou a devolver uma cópia do contexto com o
    total novo, como a segunda tentativa do Codex (no lugar de um `ctx.ataque`, que a cópia dele não veria). O
    catálogo saiu do build de novo (só mudam as 9 armas Smart, os 3 Rebuilds e as 9 munições do Kit);
  - **depois dela:** G1 70 arquivos (corrigido no ciclo 113) e G2 sem erros; G3 145 de 149 (as 4 conhecidas); G4 137 de 139 (a carga Tech e a
    Dian e Lexington; a checagem de avisos passou nesta rodada, como no ciclo 111: ela vem e vai, pela fila das
    notificações);
  - **mutações:** as 10 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (132 de 137 cada): a base 12 (M1), a margem 4 (M2), a segunda chance com os bônus (M3), a pouca luz fora
      das penalidades de visão (M4) e a munição em qualquer arma (M5);
    - no G4: as penalidades de visão no ataque (M6) e sem a segunda chance no alvo (M7), no passo da munição; o mestre
      que rola pelo jogador (M8), no passo do jogador; sem a segunda chance na área (M9) e a ficha sem a dica (M10), no
      passo da munição;
    - depois da integração, a M7 e a M9 de novo no G4: caíram as duas (a M7 no passo da munição e no do jogador; a M9 no da munição), e os arquivos voltaram.
- **Próximo:** a parte 3 do C29, as balas por tiro (as 3 balas e o dano com menos; a Zhuo).

### Ciclo 113 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 3: as balas por tiro (sessão KouArt)

Commit anterior: `f547f6ff` (o ciclo 112).

- **A referência:**
  - **a wiki de 2026-10-17 (`system-2077.js`):** a Yukimura, "no tiro único, gasta 3 balas e causa 3d6; com menos de 3 no
    pente, dispara o que tem e causa 2d6"; a Shingen, a Chao e a Kappa, o mesmo; a Masamune e a Nowaki, 5d6 (com menos,
    "esvazia e causa 4d6"); a Zhuo, "só aceita cartucho Smart melhorado e gasta 8 cartuchos por ataque; com menos de 8,
    a trava de segurança não deixa disparar. Pelo tanto de munição, causa 4d6 em vez dos 3d6 do cartucho". As regras
    `balas`, `danoComMenos`, `minimoDeBalas`, `danoFixo` e `soSmartMelhorada` da flag `arma2077`;
  - **o `foundry-2077` do master (o Foundry 12, `scripts/armas2077.mjs`):** o tiro único é o tiro, o mirado e o
    ricochete; gasta `min(balas, pente)` com o dano com menos, ou as balas todas; a trava e o "só aceita munição Smart
    melhorada" bloqueiam o ataque; o dano fixo vale fora do autofogo.
- **O que muda:**
  - **`regras.mjs`:** o perfil ganha `balasPorTiro`, `danoComMenos`, `minimoDeBalas`, `danoFixo` e `soSmartMelhorada`;
    `balasPorTiro` (o tiro único: o tiro e o mirado, o ricochete e o cartucho, que é o tiro da Zhuo; os dois canos, o
    autofogo e o supressivo gastam o de sempre); o `impedimento2077` com a trava ("só dispara com 8 no pente (tem 7): é a
    trava de segurança.") e a munição ("só aceita munição Smart melhorada.");
  - **`combate.mjs`:** o ataque gasta as balas do tiro e leva a conta ao mestre; o cartão diz "Gasta 3 balas no tiro." ou
    "Só 2 balas no pente: dispara o que tem e causa 2d6."; o dano com menos balas e o dano fixo (os 4d6 do cartucho da
    Zhuo); na ficha, a dica do "Atacar" diz as balas por tiro, e a Zhuo com outro cartucho carregado avisa "só Smart
    melhorada";
  - **`documentos.mjs`:** a Zhuo só recarrega com a munição Smart melhorada;
  - **o build:** o texto "Neste sistema" das nove armas.
- **Testes:**
  - **G3 (`tests/sistema/regras.test.mjs`):** o teste novo das balas por tiro (o texto da wiki, o perfil das nove,
    `balasPorTiro` com 30, 3, 2, 1 e 0 no pente e em cada modo, a trava e a munição da Zhuo, o texto do build);
  - **G4 (`tests/cenarios/v14.js`):** o passo novo (a Yukimura gasta 3, e com 2 dispara as 2 e causa 2d6; a Zhuo não
    carrega o cartucho comum, gasta 8 cartuchos melhorados e causa 4d6, com 7 não dispara, e com o comum carregado a ficha
    avisa e o ataque não sai); nos passos da arma Smart e da munição Smart melhorada, a Yukimura gasta 3 por tiro e a
    dica diz isso.
- **Correção do ciclo 112:** o G1 de depois da integração contou 72 arquivos, mas o `git ls-files` do rebase em conflito
  listava o `combate.mjs` uma vez por estágio. São 70 (o registro do 112 foi corrigido).
- **Resultados:**
  - G1: 70 arquivos, 0 erros; G2: 0 erros;
  - G3: 146 de 150 (as 4 conhecidas, das partes seguintes);
  - G4: 138 de 140 (a carga Tech e a Dian e Lexington; a checagem de avisos passou nesta rodada);
  - **mutações:** as 12 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (145 de 150 cada): com menos no pente gasta as 3 (B1), o cartucho fora do tiro único (B2), sem a trava
      (B3), o perfil sem as balas da flag (B4) e a Zhuo com qualquer cartucho (B5);
    - no G4, no passo novo (e nos da arma Smart e da munição, quando gastam balas): o ataque que gasta o de sempre (B6),
      o dano cheio com menos balas (B7), os 3d6 no cartucho da Zhuo (B8), a Zhuo que recarrega o cartucho comum (B9), a
      ficha sem o "só Smart melhorada" (B10), o impedimento sem a munição carregada (B11) e o cartão sem a nota (B12).
- **Próximo:** a parte 4 do C29, Power (o ricochete com −4, −2 com o Ballistic Coprocessor, e a lesão crítica com 10 de
  dano bônus).

### Ciclo 114 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 4: Power (sessão KouArt)

Commit anterior: `ed5aacc1` (o ciclo 113).

- **A referência:**
  - **a wiki de 2026-10-17 (`system-2077.js`, "Power", Kit p. 31–32):** "Quando a arma causa uma lesão crítica, o dano
    bônus da lesão sobe 5: 10 em vez de 5."; "Ricochete: você acerta um alvo que sabe onde está, mas que fica atrás de
    cobertura ou fora da linha de visão, ricocheteando o tiro numa superfície. O ataque tem −4; num tiro mirado, vale só
    a penalidade do tiro mirado. Precisa de um caminho livre entre o ponto do ricochete e o alvo."; "O alcance continua
    sendo a distância entre você e o alvo."; "Para ricochetear um cartucho, escolha uma superfície a até 6 m de você:
    ela vira a nova origem do leque, que atinge todos numa área de 6 m na direção que você escolher"; "O Ballistic
    Coprocessor reduz a penalidade do ricochete para −2.";
  - **o `foundry-2077` do master:** ricocheteia a Power de longo alcance, menos a de Disparo Automático (as de três
    balas e as de cartucho também); −4 ou −2 no ataque; o dano bônus 10.
- **O que muda:**
  - **`regras.mjs`:** `BONUS_CRITICO_POWER` e `bonusDoCritico`; `PENALIDADE_RICOCHETE` (−4),
    `PENALIDADE_RICOCHETE_COM_COPROCESSADOR` (−2) e `penalidadeDoRicochete` (0 no mirado); a DV do ricochete pela tabela
    da arma; quem ricocheteia (saíram o `semRicochete` e a exclusão das que só disparam cartucho); a descrição do mirado
    e do cartucho que ricocheteiam; o aviso ("só as armas Power de longo alcance ricocheteiam.", e o explosivo, não).
    Saíram `tabelaDoRicochete`, `umDadoAMenos` e `BONUS_COPROCESSADOR` (o ricochete do suplemento);
  - **`combate.mjs`:** a penalidade no ataque ("Ricochete −4" ou "Ricochete (Ballistic Coprocessor) −2"); o dano de
    sempre; o cartucho que ricocheteia continua cartucho, sem a conta dos 6 m de quem atira (o leque sai da superfície),
    e o cartão diz isso; na ficha, a dica do botão e a do "Atacar" (o crítico de 10);
  - **`rolagens.mjs`:** o dano bônus do crítico pela arma (10 na Power), no ataque e no botão de dano da ficha;
  - **o build:** o texto "Neste sistema" das Power; saiu o `semRicochete` da flag.
- **Testes:**
  - **G3:** o teste do Ricochete do suplemento virou o do Power do Kit (o texto da wiki, o crítico, a penalidade, a DV
    da arma, a descrição, as 25 Power do catálogo que ricocheteiam, o aviso, o texto do build); no do perfil e no das
    regras de cada modelo, a Nowaki, a Masamune, a Testera e a Igla ricocheteiam;
  - **G4:** o passo do ricochete reescrito (a Liberty: −4, −2 com o coprocessador, o mirado só com o −8, a DV 15 da
    pistola e o dano de sempre; o tiro com dois 6 soma 10; a Tactician ricocheteia o cartucho no Capanga a 12 m; o fuzil
    do CORE não ricocheteia); no passo dos dois canos, a Testera também tem o Ricochete.
- **Resultados:**
  - G1: 70 arquivos, 0 erros; G2: 0 erros;
  - G3: 147 de 150 (saiu a falha conhecida do Ricochete; ficam as 3 da Tech e da Lexington);
  - G4: 137 de 140 (a carga Tech, a Dian e Lexington e, nesta rodada, a checagem de avisos da Lexington);
  - **mutações:** as 11 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (146 de 150 cada): o crítico da Power de 5 (P1), o ricochete com −3 (P2), a DV da tabela de autofogo (P3),
      as de cartucho sem ricochete (P4) e o explosivo que ricocheteia (P5);
    - no G4, no passo do Power: o ataque sem a penalidade (P6), o crítico de 5 (P7), o cartucho com a conta dos 6 m
      (P8), o ricochete do cartucho como tiro (P9), a ficha sem o coprocessador (P10) e sem a dica do crítico (P11).
- **Próximo:** a parte 5 do C29, Tech (carregar na Ação de Movimento, CDT 1, a cobertura fina e a metade do SP).

### Ciclo 115 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 5: Tech (sessão KouArt)

Commit anterior: `4b8b7080` (o ciclo 114).

- **A referência:**
  - **a wiki de 2026-10-17 (`system-2077.js`, "Tech", Kit p. 32):** "A mira vê o contorno dos alvos através de cobertura
    fina."; "Carregar: você gasta a Ação de Movimento, e a arma fica carregada até disparar ou por 60 segundos (20
    rodadas)."; "Carregada, o próximo ataque que não seja explosivo é de CDT 1, atravessa cobertura fina e ignora metade
    do SP do alvo (arredondado para cima). A cobertura atravessada não perde HP". Nenhuma arma de 2077 faz mais a
    rajada carregada (a Quasar saiu da wiki);
  - **o `foundry-2077` do master:** a carga é um estado da arma (o botão Carregar/Carregada), que fica até disparar ou
    20 rodadas no mesmo combate (fora dele, até disparar); o ataque carregado (menos o supressivo) ignora 50% do SP.
- **O que muda:**
  - **`regras.mjs`:** `CARGA_TECH` (20 rodadas, 50% do SP; o `aplicarDano` arredonda a metade para cima: SP 11 conta 6),
    `cargaValida` e `gastaACarga` (todos os ataques menos o explosivo e o fogo supressivo); a descrição "…, carregado";
    saíram os modos "carga" e "rajadaTech", as `COBERTURAS` (o que a cobertura segurava e a ablação de 4 e 2),
    `atravessarCobertura`, `rodadaDaProximaCarga`, a tabela da rajada e a rajada do perfil;
  - **`combate.mjs`:** `cargaDa` (a flag `cargaTech` da arma, se ainda vale) e `alternarCarga` (o botão da ficha: carrega,
    com o aviso no chat de que gasta a Ação de Movimento, ou descarrega); o ataque carregado gasta a carga, ignora
    metade do SP, e o cartão diz a regra (CDT 1, a cobertura fina); o "Em cobertura" do alvo diz que a carga atravessa a
    fina; o "Desfazer" devolve a carga (a lista `devolver` do cartão). Saíram a janela da cobertura, a arma que esfria e
    o dano que ficava na cobertura;
  - **`configuracoes.mjs`:** saiu "A carga Tech esfria uma rodada";
  - **`ficha-personagem.mjs`:** a ação `alternarCarga`;
  - **o build:** o texto "Neste sistema" das Tech; saíram as flags `techRajada` e `techBalas`.
- **Testes:**
  - **G3:** os testes da carga e do esfriar do suplemento viraram o do Tech do Kit (o texto da wiki, a metade do SP, a
    validade da carga, os ataques que a gastam, a descrição, o que saiu, as 7 Tech do catálogo, o texto do build); o do
    perfil perdeu a rajada;
  - **G4:** o passo da carga reescrito (a Kenshin: o botão Carregar e o aviso no chat; o tiro carregado no Alvo em
    cobertura, 5 dos 11 passam pela metade do SP; a carga gasta; o Desfazer a devolve; aos 19 rodadas vale, aos 20 não, e
    o tiro é o de sempre; fora do combate fica; o botão descarrega; o fuzil do CORE não carrega).
- **Resultados:**
  - G1: 70 arquivos, 0 erros; G2: 0 erros;
  - G3: 148 de 149 (saíram as falhas conhecidas do perfil e da Carga Tech; fica a das regras de cada modelo, a última
    parte);
  - G4: 139 de 140 (saiu a da carga Tech; fica a da Dian e Lexington; a checagem de avisos passou nesta rodada);
  - **mutações:** as 12 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (147 de 149 cada): a carga com 40% (T1), com 10 rodadas (T2), valendo na rodada 20 (T3), gasta no fogo
      supressivo (T4) e sem valer fora do combate (T5);
    - no G4, no passo do Tech: o ataque que não gasta a carga (T6), o dano sem a metade do SP (T7), o Desfazer que não a
      devolve (T8), o "Em cobertura" sem a nota da carga (T9), o botão que não carrega (T10), a ficha sempre com o
      "Carregar" (T11) e o cartão sem a regra (T12).
- **Próximo:** a parte 6 do C29, o resto das regras de cada modelo (a Unity, a Carnage, a Burya, a Grad, a Nekomata, a
  Omaha e a Lexington).

### Ciclo 116 (2026-10-18): o C29, as armas de 2077 pelo Kit, parte 6: as regras de cada modelo (sessão KouArt)

Commit anterior: `43bb94d0` (o ciclo 115). Com este, o C29 termina.

- **A referência (a wiki de 2026-10-17, o texto de cada arma, e o `foundry-2077` do master):**
  - **a Unity:** "No tiro mirado, o dano sobe para 4d6.";
  - **a Carnage:** "Quem dispara sem BODY 10 ou mais sofre a lesão crítica Músculo Rompido (se ainda não tiver).";
  - **a Burya:** "Carrega sem gastar a Ação de Movimento. Quem dispara sem Grafted Muscle and Bone Lace ou um cyberbraço
    sofre a lesão crítica Braço Quebrado (se ainda não tiver).";
  - **a Grad:** "Depois de cada disparo, é preciso uma Ação para manejar o ferrolho antes de atirar de novo.";
  - **a Nekomata:** "Carregado, vê o contorno dos alvos e atira através de cobertura fina e grossa.";
  - **a Omaha:** "Carregada, fica assim até o fim do turno em que disparou, continua com CDT 2 e gasta até 3 balas por
    ataque (com menos de 3 no pente, esvazia).";
  - **a Lexington:** no Kit, sem regra própria e sem autofogo (o suplemento dava "autofogo (2) gastando só 7 balas").
    No Foundry 12, o `foundry-2077` faz o ferrolho, a carga da Omaha e da Burya e a fórmula do mirado; a lesão de quem
    dispara, ele só anuncia.
- **O que muda:**
  - **`regras.mjs`:** o perfil com as regras de cada modelo (`danoMirado`, `exigeBody`, `lesao`, `lesaoSemCromo`,
    `ferrolho`, `cargaSemMovimento`, `cargaAteFimDoTurno`, `balasNaCarga`, `cdtNaCarga`, `cargaGrossa`); a carga da Omaha
    (`cargaValida` com o turno em que disparou; `balasDaCarga`); `coberturaDaCarga`; as lesões de quem dispara
    (`lesoesDoAtirador`, `idDaLesao2077`, `nomeDaLesao2077`, `ehCromoNoBraco`: o Grafted Muscle and Bone Lace, um
    esqueleto ou a fundação do cyberbraço); o ferrolho no impedimento;
  - **`combate.mjs`:** o mirado da Unity com 4d6; a lesão de quem dispara, pela configuração "Lesão crítica" (na ficha,
    só anunciar; desligada, a nota), que o "Desfazer" tira; o ferrolho depois do tiro, que bloqueia o próximo até o
    botão "Manejar o ferrolho" (o "Desfazer" o libera); a carga da Omaha até o fim do turno, com até 3 balas por ataque;
    a da Burya sem a Ação de Movimento; a da Nekomata pela cobertura grossa também. O "Desfazer" agora põe de volta o
    que estava (a carga de antes do tiro da Omaha) e tira o que o ataque pôs (o ferrolho);
  - **`ficha-personagem.mjs`:** a ação `manejarFerrolho`;
  - **o build:** o texto "Neste sistema" de cada modelo.
- **Testes:**
  - **G3:** o teste novo das regras de cada modelo do Kit (o texto da wiki de cada uma, o perfil, as lesões e o cromo, o
    ferrolho, a carga da Omaha e da Nekomata, o texto do build); no das regras de cada modelo, a Lexington do Kit, sem
    autofogo. Uma mutação sobreviveu na primeira rodada (o cyberbraço, que o nome "Cyberarm" já reconhecia): o teste
    ganhou um cyberbraço de outro nome e uma opção do braço;
  - **G4:** o passo novo (a Unity no item na mão do Capanga; a Carnage rompe o músculo uma vez só, e o "Desfazer" do
    primeiro tiro tira a lesão; a Burya carrega sem a Ação de Movimento e, sem o Grafted Muscle and Bone Lace, quebra o
    braço; a Grad e o ferrolho, com o botão e o "Desfazer"; a Omaha carregada dá dois tiros de 3 balas no mesmo turno, e
    no seguinte a carga acabou; as dicas da ficha); o passo da Dian e Lexington com a Lexington do Kit. Na primeira
    rodada, o passo novo gastou a munição de rifle do fuzil da Atiradora (o recarregar pega a primeira compatível da
    ficha) e quebrou o passo da linha de visão, depois: cada arma do passo carrega agora da própria munição.
- **Resultados:**
  - G1: 70 arquivos, 0 erros; G2: 0 erros;
  - G3: 150 de 150 (saiu a última falha conhecida do C29);
  - G4: 141 de 141 (saíram a da Dian e Lexington e a checagem de avisos, que eram os avisos da Lexington);
  - **mutações:** as 16 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (149 de 150 cada): a carga da Omaha a rodada toda (M1), as 3 balas com menos no pente (M2), o músculo
      rompido com BODY 10 (M3), o cyberbraço que não conta (M4, depois do teste novo), sem o ferrolho no impedimento (M5) e
      a Nekomata só pela fina (M6);
    - no G4, no passo novo: o mirado da Unity com o dano de sempre (M7), sem a lesão de quem dispara (M8), o Desfazer que
      não a tira (M9), a Grad sem o ferrolho (M10), a Omaha que gasta a carga no primeiro tiro (M11) e 1 bala (M12), a
      Burya que gasta a Ação de Movimento (M13), a ficha sem o botão do ferrolho (M14), o cromo que não é procurado (M15)
      e o Desfazer que não tira o ferrolho (M16).
- **Próximo:** o C29 terminou (as armas de 2077 nos ciclos 110 a 116). A sessão de teste com a mesa, quando o usuário
  marcar; no plano, o C23 (a segunda Role) ou o que o usuário escolher.

### Ciclo 117 (2026-10-18): C15, veículos no combate (sessão Codex)

Commit anterior: `76833a8` (reserva do C23, após o ciclo 116). Item reservado em `20a21c3`, antes da implementação.
Os ciclos 112 a 116 do C29 e a reserva do C23 da sessão KouArt foram integrados, preservando código e registros.

- **Fontes:** CORE 0.92.4, `CPRVehicleItem`, modelo e ficha de veículo, contêiner e upgrades de veículo; os itens
  Armored Chassis, Bulletproof Glass, Heavy Chassis e Onboard Weapon. Wiki: `system-criacao.js`, Nomad/Moto e upgrades
  (p. 161–164); `system-rules.js`, cobertura, explosivos e veículos (p. 174, 182–183, 189–192); `system-2077.js`, Tech
  e Nekomata. O CORE guarda o SDP e descreve as proteções, mas não automatiza seu dano. As regras da wiki não mudaram.
- **Decisão do usuário:** dano menos SP, ablação normal da munição quando atravessa e Chassis blindado SP13. O SDP
  não recebe bônus de crítico nem lesão crítica. A dúvida e a resposta estão registradas acima.
- **Implementado:**
  - veículo único em uso na ficha, com o ID do item; trocar ou devolver encerra a direção, preservando a frota;
  - SP base, ablação própria e proteção do Chassis blindado; dano no SDP, limite zero e Desfazer pela diferença;
  - janelas com identidade, nome e HP próprios. Uma instalação dá 15 HP e a segunda 30; Ajustar vidros conserva o
    dano. Tiro que destrói a cobertura perde a sobra; explosivo que a destrói alcança o ocupante com o dano inteiro;
  - escolha explícita de pessoa, veículo ou janela ao atacar o token. A estrutura não esquiva nem recebe efeitos
    humanos; no corpo a corpo, o mestre define a DV. O destino é reconferido após as janelas e no mestre;
  - Preparar arma no upgrade instalado cria uma única arma: metralhadora de 30 balas (só Autofogo e frontal),
    lança-chamas ou arma branca muito pesada. A preparação simultânea usa fila; mover o upgrade reaproveita a arma
    e conserva pente e munição. As montadas ficam sob o veículo e fora das mãos. Metralhadora e lança-chamas não
    recarregam dirigindo. Perder o veículo ou a instalação, inclusive durante a rolagem, impede o disparo;
  - cartão com SDP, SP e vidro, e Desfazer diferencial. Dano avulso não contorna a restrição de Autofogo;
  - ida e volta da wiki com IDs exatos de montagem, munição e upgrade da arma; SDP atual e máximo base, proteção,
    ablação, janelas e direção. O máximo base evita duplicar Chassis pesado. O vínculo vazio conserva a cópia solta;
    snapshots do Foundry 12 continuam aceitando os nomes antigos.
- **Integração com C29:** carga Tech atravessa vidro fino sem retirar HP da cobertura; a Nekomata também atravessa
  o grosso, pela flag do catálogo. A espessura usa o máximo original, e a pessoa conserva sua defesa e armadura.
  Smart melhorada, balas por tiro, ferrolho, marcas de carga, dano mirado e lesões de quem dispara foram preservados.
- **Portões:** G1, 75 arquivos sem erro; G2, nenhum erro; G3, 168/168; G4 completo, 147/147, incluindo os seis passos
  C15 e a checagem dos dois navegadores sem avisos ou erros de JS. As falhas conhecidas de 2077 saíram com o C29.
- **Mutações:** 65 distintas detectadas (28 de regras e 37 com navegador), uma por vez, com os bytes restaurados por
  MD5 nos sete arquivos. A remoção de todos os vínculos de instalação sobreviveu na primeira tentativa: a ordem dos
  pais e filhos mascarava o erro. O teste foi reforçado permutando apenas os veículos e conferindo o UID da cópia
  solta, mantendo todos os valores esperados. A repetição detectou a mutação. Foram 66 execuções, nenhuma restauração
  incorreta; as mutações de combate e o G4 completo final rodaram após a integração do ciclo 116.
- **Limites:** Dirigir controla a recarga; mãos no volante, iniciativa, MOVE, manobras, orientação e condições
  descritivas de instalação continuam com o mestre. As janelas são registradas e ajustadas pela ficha. A campanha
  real e o servidor não foram alterados.

### Ciclo 118 (2026-10-18): o C23, parte 1: a segunda Role no modelo, nos derivados e na wiki (sessão KouArt)

Commit anterior: `a913dee3` (a reserva do C16 da sessão Codex). O ciclo 117 é o `dfaac5ce` (o C15 da sessão Codex), e a
reserva do C23, o `76833a8d`.

- **A referência:**
  - **a wiki de 2026-10-17 (`system-rules.js`, "Duas Roles na criação", regra da mesa):** "No criador, escolha a Role
    principal e, se quiser, uma segunda Role diferente. Combine com o mestre os Ranks de cada uma, de 1 a 10. Cada Role
    tem suas habilidades e seu Lifepath; a principal define os STATs, as perícias e o único pacote de equipamento e
    orçamento inicial." E "O padrão de um personagem antigo continua sendo uma Role no Rank 4.";
  - **o `personagem-roles.js` e o `criador.js` da wiki:** a segunda fica na `roleSecundaria` (o id, o Rank, as
    habilidades, o Lifepath e a oficina); o resultado manda a lista `roles` (a principal primeiro) e a `role`; a ficha da
    mesa volta com a lista `roles`;
  - **a API da wiki (`api-personagens.js`):** a um Foundry, a ficha de um personagem de duas Roles só sai com o
    `?roles=2` ("a importação de duas Roles no Foundry 14 ainda não está disponível", sem ele);
  - **o `foundry-2077` do master:** pede `?roles=2` em todo GET da ficha, importa as duas (uma por item de Role do CORE,
    a principal como a ativa) e manda a lista `roles` na ficha da mesa.
- **O que muda:**
  - **`dados.mjs`:** a `roleSecundaria` (o nome, o Rank e as habilidades; o nome vazio é nenhuma); `system.roles` (as
    que têm nome); os derivados pelas duas (a principal conta sempre, mesmo sem o nome, como antes);
  - **`regras.mjs`:** `derivadosDasRoles` (a Consciência de Combate do Solo, o Moto do Nomad, as perícias do Medtech e a
    Interface do Netrunner, de qualquer uma das duas);
  - **`wiki.mjs`:** o `?roles=2` em todo GET da ficha (o import, a entrega dos pedidos, a migração da mesa); o import
    com as duas Roles do resultado; o envio da ficha com a lista `roles` (e a `role`, para quem só lê uma); a migração
    da mesa com a lista `roles` do Foundry 12.
- **Fica para as partes seguintes:** a aba Role da ficha com as duas e as rolagens de habilidade da segunda (hoje, a
  aba mostra a principal); a Role ativa, como no CORE; as perícias novas. Fica de fora do C23 o `?locais=1` (os locais de
  instalação do cyberware): a wiki ainda recusa ao Foundry 14 o personagem que tem local escolhido.
- **Testes:**
  - **G3:** o teste novo das duas Roles (o texto da wiki; o `personagem-roles.js` da wiki: a lista das duas, a segunda
    diferente da principal, a de antes no Rank 4; os derivados do Solo com o Netrunner, do Netrunner com o Solo, do
    Medtech com o Nomad; uma Role só dá o de antes; sem Role, nada);
  - **G4:** o personagem de duas Roles criado na wiki (Solo 5 e Netrunner 3) e o passo do import (a segunda Role, a
    Interface 3 e as Ações NET dela, a Consciência de Combate do Solo; a ficha manda as duas para a wiki; a migração da
    mesa as traz de volta). Na primeira rodada, 4 passos do Solo e das munições quebraram: eles põem as habilidades do
    Solo na Atiradora sem o nome da Role, e os derivados só contavam as Roles com nome. A principal voltou a contar
    sempre.
- **Resultados:**
  - antes da integração com o ciclo 117 da sessão Codex (o C15, veículos no combate): G1 70 arquivos e G2 sem erros;
    G3 151 de 151; G4 143 de 143. Ele publicou o 117 enquanto este rodava, e este passou a 118; a mescla foi automática
    no código (o `wiki.mjs` e o `dados.mjs` dos dois) e só o registro conflitou;
  - depois dela: G1 75 arquivos e G2 sem erros; G3 169 de 169; G4 149 de 149;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (150 de 151 cada): a Interface só do Netrunner principal (R1), o Moto só do Nomad principal (R2) e a
      Consciência de Combate só pela principal (R3);
    - no G4, no passo do import: sem o `?roles=2` (R4: a wiki recusa), o import sem a segunda (R5), a ficha sem a lista
      `roles` (R6), a migração da mesa só com a primeira (R7) e a ficha sem os derivados da segunda (R8); a principal só
      com o nome (R9) caiu nos 4 passos que tinham quebrado na primeira rodada.
- **Próximo:** a parte 2 do C23, a ficha (a aba Role com as duas, as rolagens de cada uma e o cabeçalho).

### Ciclo 119 (2026-10-18): o C23, parte 2: a ficha com as duas Roles (sessão KouArt)

Commit anterior: `23bb94fc` (o ciclo 118).

- **A referência:** a regra da mesa "Duas Roles na criação" (a wiki de 2026-10-17): "Cada Role tem suas habilidades e seu
  Lifepath". No Foundry 12, cada Role é um item na ficha do CORE, com o Rank e as habilidades dele, e as rolagens de
  habilidade usam o item da Role.
- **O que muda:**
  - **`ficha-personagem.mjs`:** a aba Role monta um bloco por Role (`#contextoDaRole`: a Role do RED da wiki, as
    rolagens, as especialidades com os pontos e a conferência do Rank, as outras habilidades e o bônus nas perícias, com
    os campos gravando na Role certa); a ação "Tirar" (o nome, o Rank e as habilidades da segunda, com o
    `ForcedReplacement`);
  - **`role.hbs`:** o bloco da segunda abaixo do da principal, com o nome e o Rank no título; sem ela, o painel "Segunda
    Role" para acrescentar (o nome, com a lista das Roles, e o Rank). As notas ficam só na principal;
  - **`topo.hbs`:** o cabeçalho diz a segunda ("// Medtech 2");
  - **`documentos.mjs`:** as rolagens de habilidade procuram nas duas Roles (cada rolagem é de uma Role) e usam o Rank e
    as habilidades da Role que a tem; o Backup usa o Rank do Lawman, seja a principal ou a segunda;
  - **`tema.css`:** o espaço entre os blocos e os campos do painel.
- **Testes (G4):** o passo novo das duas Roles na ficha (a principal Rockerboy 4 e a segunda Medtech 2: os dois blocos,
  as rolagens e os campos de cada um, o cabeçalho; o Impacto Carismático pelo Rank da principal e a Cirurgia pela perícia
  do Medtech segundo; o "Tirar", que limpa as habilidades; o painel acrescenta a Media, e a Credibilidade rola com o Rank 3
  dela, não o 4 da principal). A primeira versão do passo acrescentava um Netrunner, que não tem rolagem: a mutação da
  rolagem com o Rank da principal teria sobrevivido (a Cirurgia sai da perícia derivada, que não depende disso).
- **Resultados:**
  - G1: 75 arquivos, 0 erros; G2: 0 erros;
  - G3: 169 de 169 (o ciclo não muda as regras);
  - G4: 150 de 150;
  - **mutações:** as 8 caíram no passo novo, e os arquivos voltaram (conferido pelo md5): a aba só com a principal (F1), o
    bloco da segunda com os dados da principal (F2), as rolagens só da principal (F3), a rolagem da segunda com o Rank da
    principal (F4), o "Tirar" que deixa as habilidades (F5), o cabeçalho sem a segunda (F6), sem o painel de acrescentar
    (F7) e as habilidades da segunda gravando na principal (F8).
- **Próximo:** a parte 3 do C23, a Role ativa (como no CORE), ou a 4, as perícias novas.

### Ciclo 120 (2026-10-18): o C23, parte 4: as perícias próprias, como no CORE (sessão KouArt)

Commit anterior: `3854dcb1` (o ciclo 119). Com este, o C23 termina.

- **A decisão do usuário (2026-10-18):** a parte 3, a Role ativa como no CORE, não precisa: a principal fica no
  cabeçalho, as duas na aba Role, e a Interface vem do Netrunner, seja ele a principal ou a segunda (sem o seletor). A
  parte 4, as perícias novas, "como no CORE".
- **A referência (o CORE 0.92.4, `src/modules/datamodels/item/skill-datamodel.js`, pela tag no GitLab):** a perícia é um
  item `skill` com o `level`, o `stat`, a `category`, a `difficulty` e o `skillType`. A ficha da mesa do Foundry 12
  (o `foundry-2077`) manda cada perícia com o nome, o nível e o STAT; a que não era do livro nem de família virava só um
  aviso na migração ("Perícia X não existe neste sistema").
- **O que muda:**
  - **`regras.mjs`:** `periciaPropria` (a chave `propria-<nome>`, o nome, o STAT e o nível; sem nome ou com um STAT que
    não existe, null);
  - **`dados.mjs`:** o `atributo` da perícia (o STAT da própria; nas outras, vazio); a perícia própria rola com o STAT e
    o nome dela;
  - **`ficha-personagem.mjs` e `bloco-geral.hbs`:** o "+ PERÍCIA" cria a de família ou a própria (o nome e o STAT); a
    própria aparece no grupo Próprias, com o STAT, e sai pelo ✕, como a de família;
  - **`wiki.mjs`:** a migração da mesa cria a perícia própria da que não é do livro nem de família (com o STAT que o
    Foundry 12 mandou); o envio da ficha a manda pelo nome.
- **Testes:**
  - **G3:** o teste novo da perícia própria (a chave, o STAT, o nível, o nome vazio e o STAT que não existe; nenhuma do
    livro ou de família com a mesma chave);
  - **G4:** o passo novo da ficha (o "+ PERÍCIA" cria a própria com o STAT, no grupo Próprias; ela rola TECH + nível +
    1d10 e sai pelo ✕); no passo da migração da mesa, a "Hacking de Drones" (TECH) do Foundry 12 entra como própria.
- **Resultados:**
  - G1: 75 arquivos, 0 erros; G2: 0 erros;
  - G3: 170 de 170;
  - G4: 151 de 151;
  - **mutações:** as 9 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (169 de 170 cada): qualquer STAT (K1), o nível negativo (K2) e o STAT em maiúscula do Foundry 12 (K3);
    - no G4: a própria com INT (K4), o nome dela como o de família (K5, também na migração), a lista sem as próprias
      (K6), sem o grupo Próprias (K7), a migração da mesa sem elas (K8) e o diálogo sem a opção (K9).
- **Próximo:** o C23 terminou (ciclos 118 a 120). No plano, o C24 (o contêiner) ou o que o usuário escolher; a sessão de
  teste com a mesa, quando ele marcar.

### Ciclo 121 (2026-10-18): o C30, parte 1: o lado do cyberware (sessão Junin)

Commit anterior: `85a95b38` (o ciclo 120). O C30 é um item novo, pedido do usuário em 2026-10-18: a wiki do master
ganhou o lado de cyberbraço, cyberperna e cyberolho (5de1fbd, sessão KouArt) e a peça única no membro natural
(46eb94a, sessão Junin), e a API recusa (409) mandar ao Foundry 14 o personagem com lado até o importador declarar o
`locais=1`. Na mesa da campanha, já no Foundry 14, quatro personagens têm lado e ainda não foram importados.
- **A referência:**
  - a wiki, `personagem-cyberware.js`: os lados de cada tipo, com os ids e os nomes; a opção herda o lado da base;
  - o cpr-2077 do Foundry 12: o lado na flag `wikiLocal`; na ficha da mesa, `local` (o instalado) e `localPlanejado`
    (o que espera instalar), o `cyber` (tipo, tamanho e slots) e os ids de dentro.
  - O CORE não tem lado.
- **O que muda:**
  - **`regras.mjs`:** `LADOS_DO_CYBERWARE` (os ids e os nomes da wiki), `ladosDoTipo`, `nomeDoLado`, `ladoValido` (o lado
    que vale para o tipo) e `ladoEfetivo` (a opção numa fundação fica no lado dela);
  - **`dados.mjs`:** o `lado` do cyberware;
  - **`documentos.mjs`:** o `ladoDoCyberware` do item (o efetivo);
  - **`ficha-item.mjs` e `item.hbs`:** o seletor "Lado" na fundação e na peça solta; na opção numa fundação, o lado dela
    ("o da fundação"), sem seletor; o lado no alto da ficha;
  - **`ficha-personagem.mjs` e `cyberware.hbs`:** o lado na linha de cada peça da aba Cyberware;
  - **`wiki.mjs`:**
    - a leitura pede `?roles=2&locais=1`;
    - a importação e a entrega dos pedidos põem o lado da montagem da wiki;
    - a migração da mesa põe o `local` ou, sem ele, o `localPlanejado`;
    - o envio da ficha manda o `local` (ou o `localPlanejado`), o `cyber` e os `dentroIds`.
- **Testes:**
  - **G3:** o arquivo novo `tests/sistema/lados.test.mjs` (3 testes):
    - os lados iguais aos do `personagem-cyberware.js` da wiki, carregado como na API;
    - o lado que só vale para o tipo dele;
    - a opção que fica no lado da fundação (e a fundação sem lados, o Sensor Array, que não dá lado).
  - **G4:** dois passos novos:
    - na wiki de teste, um Solo com o cyberbraço no braço esquerdo, a Mão de ferramentas nele e o cyberolho no direito;
    - no Foundry: a importação, que antes caía no 409. Ele confere o lado de cada peça, o seletor e o "o da fundação"
      na ficha do item, o lado na aba Cyberware, o envio (o `local`, o `cyber` e os `dentroIds`), a ficha da mesa na
      wiki, a troca do lado da fundação levando a opção junto e a migração da mesa com os lados.
- **Resultados:**
  - G1: 76 arquivos, 0 erros; G2: 0 erros;
  - G3: 173 de 173;
  - G4: 153 de 153;
  - **mutações:** as 13 caíram, nenhuma rodada pulou o Foundry, e os arquivos voltaram (conferido pelo md5):
    - no G3 (172 de 173 cada): o lado para qualquer tipo (K1), a opção no próprio lado (K2) e os nomes do braço
      trocados (K3);
    - no G4 (152 de 153 cada): a leitura sem o `locais=1` (K4), a importação sem o lado (K5), a migração da mesa sem o
      lado (K6), o envio com o lado só como planejado (K7), sem os `dentroIds` (K8), sem o `cyber` (K9), a ficha do item
      sem o seletor (K10), a opção sem o lado da fundação (K11), a aba Cyberware sem o lado (K12) e o lado que ignora a
      fundação (K13).
- **Próximo:** o C30, parte 2: o membro natural.
  - **O que é:** a peça única num braço ou numa perna sem cyberbraço daquele lado. A wiki manda `natural: true`, e o
    `pedeFundacao` passa a aceitar a peça única com lado.
  - **Antes:** a wiki do master do 46eb94a precisa entrar nesta branch.

### Ciclo 122 (2026-10-18): o C24, parte 1: o contêiner (a loja, o saque e o esconderijo), a ficha e a trava (sessão KouArt)

Commit anterior: `b726af20` (o ciclo 121, da sessão Junin; a reserva do C24 é o `8b64a496`). O C24 vai em três partes: esta (o ator, a ficha, pôr e pegar de graça e
a trava), a loja que vende (comprar pelo preço, com o extrato dos dois) e a loja que compra (vender para ela).

- **A referência (o CORE 0.92.4, pela tag no GitLab):** `modules/actor/cpr-container.js` (o `setContainerType`: o tipo
  liga e desliga os flags; o `create`: o token neutro e todos os jogadores donos; o `automaticallyStackItems`),
  `modules/actor/sheet/cpr-container-sheet.js` (o "Trade with", o `_purchaseItem` com o "items-free" e o
  "infinite-stock", o `_onDrop` com o "players-create"), `templates/actor/cpr-container-sheet.hbs` e
  `container/cpr-container-actions.hbs` (as configurações do mestre por tipo, a lista por categoria, o "Single | All" do
  preço, os botões), `modules/datamodels/actor/container-datamodel.js` e
  `modules/hooks/token/warn-on-moving-locked-container.js` (a trava: o "players-move"). A "trava" do ROADMAP é esta. O
  preço: a loja da wiki (`loja-catalogo.js`, o lote de cada munição) e o glossário (as categorias de preço, RED p. 385).
- **O que muda:**
  - **`regras.mjs`:** `permissoesDoTipo` (o `setContainerType`), `EMPILHAVEIS` e `quantidadeDe`, `parteValida` e
    `parteSugerida`, `precoDaUnidade` (o lote da munição: `LOTE_DA_MUNICAO`), `CATEGORIAS_DE_PRECO`, `categoriaDoPreco`
    e `precoNaLista`;
  - **`config.mjs`, `dados.mjs`, `system.json` e `pt-BR.json`:** o tipo de ator `conteiner` (`DadosConteiner`: o tipo, as
    permissões, os Eurodólares com o extrato e as notas);
  - **`documentos.mjs`:** o contêiner novo nasce com o token solto e neutro, os jogadores donos e as permissões do tipo;
    o tipo novo liga as permissões dele; o dinheiro tem o extrato;
  - **`conteiner.mjs` (novo):** `levarItem` (o item vai com o que está instalado nele, soma na pilha, guardado, e sai da
    origem), `pegarDoConteiner` e a trava (o `preMoveToken`);
  - **`ficha-conteiner.mjs` e `conteiner.hbs` (novos):** a ficha; **`ficha-item.mjs`:** o item do contêiner abre só para
    ler sem "Mudar os itens"; **`ficha-personagem.mjs` e `equipamento.hbs`:** as linhas da aba Equipamento arrastam, e o
    item que chega de outra ficha vai (sai de lá); do contêiner, só o mestre arrasta.
- **Testes:**
  - **G3:** o teste novo do contêiner (as permissões de cada tipo, o preço da unidade de cada munição do catálogo contra o
    lote da loja da wiki, as categorias contra o glossário, o texto da lista, a pilha e a parte); o teste do capanga
    passa a esperar o tipo de ator novo;
  - **G4:** dois passos novos: o do mestre (o ator novo, os tipos, o extrato, a ficha de cada tipo, o compêndio e a ficha
    do personagem arrastados para o contêiner, a pilha, o preço, pegar uma parte e tudo, o estoque infinito e o arrastar
    entre as fichas) e o do jogador (a trava no saque e no esconderijo, a ficha sem as configurações, as recusas, o item
    só para ler, o "Pegar", e no esconderijo pôr, criar e apagar).
- **Resultados:**
  - G1: 78 arquivos (os 2 novos: `conteiner.mjs` e `ficha-conteiner.mjs`), 0 erros; G2: 0 erros;
  - G3: 171 de 171; depois de juntar o ciclo 121 da sessão Junin, 174 de 174;
  - G4: 153 de 153 (e de novo com o arrastar de verdade da linha da ficha); depois da junção, 155 de 155;
  - **mutações:** as 21 caíram, e os arquivos voltaram (conferido pelo md5):
    - no G3 (170 de 171 cada): a loja que desliga o estoque infinito (N1), o esconderijo sem mover (N2), a bateria por 10
      (N3), a faixa de preço só acima do piso (N4) e a parte que pode ser a pilha toda (N5);
    - no G4: o ator novo sem os jogadores donos (N6, nos dois passos), o tipo que não liga as permissões (N7), levar sem
      tirar da origem (N8), sem a pilha (N9), o carregador que fica para trás (N10), o item que chega equipado (N11), o
      estoque infinito que não segura (N12), sem a trava (N13), o jogador que tira arrastando (N14) e que põe sem a
      permissão (N15), o item do saque que abre para mudar (N16), as configurações para o jogador (N17), a loja sem o
      estoque infinito para marcar (N18), o "Trocar com" que não muda (N19), a parte que começa em 1 (N20) e a arma da
      aba Equipamento que não arrasta (N21).
- **Próximo:** o C24, parte 2 (a loja que vende: comprar pelo preço, com o dinheiro de quem compra e o registro nos dois
  extratos).

### Ciclo 123 (2026-10-18): o ensaio de uma sessão da Morana no Foundry 14 (sessão KouArt)

Commit anterior: `834b33a9` (o ciclo 122). O pedido do usuário (2026-10-18): a campanha passa hoje para o Foundry 14,
com a Morana continuando (o estado do Foundry 12 pelo "Importar da mesa"), e o essencial é o ensaio de uma sessão. O
C24, partes 2 e 3, fica para depois.

- **O que muda:** só o teste. O `tests/cenarios/ensaio.js` (novo; só roda chamado pelo nome: `node tests/rodar.js
  ensaio`) segue o "Procedimento da migração da campanha" e uma sessão, num mundo só, com o mestre e dois jogadores em
  navegadores próprios:
  - **a wiki:** o grupo (um Solo, uma Netrunner e um Medtech, pelo criador) e a ficha da mesa do Foundry 12 de cada um,
    no meio da campanha (o HP, o dinheiro, a munição gasta, a lesão, o item que o mestre deu e uma perícia do CORE fora
    do livro). A ficha sai do formato da ficha "Na mesa" deste sistema (o mesmo do `tableSnapshot` do cpr-2077), sem o
    que só o Foundry 14 manda, ligada a um ator do Foundry 12;
  - **o procedimento:** os usuários, o endereço da wiki, a janela "Personagens da wiki" com o dono e o "Importar da mesa"
    de cada um, e a conferência de cada ficha contra a da mesa (o HP, a Humanidade, o dinheiro, o IP, os itens, a
    munição, o pente, a lesão, o cyberware, os programas no deck e as perícias): nenhuma diferença;
  - **a sessão:** os dois jogadores com as fichas (cada aba, com as capturas em `tests/.saida/ensaio-*`); a cena com os
    três e dois seguranças (capangas); o combate (a iniciativa dos jogadores pela ficha, a dos seguranças e a do Medtech
    pelo mestre); o tiro do Solo pela ficha (o mestre resolve, o jogador rola o dano, a SP do colete segura parte); o
    tiro do segurança na Netrunner (a janela de reação no navegador dela, o dano nos dois navegadores, a ablação); o
    Death Save do Medtech, cujo jogador faltou; a NET (o terminal com "A Coleira", do compêndio da campanha; conectar pela
    ficha, a janela da NET, o andar 1, o Breach e desconectar); o saque (o jogador pega a pistola para o personagem
    dele); o fim do combate, o pagamento pelo extrato e a ficha de cada um de volta na wiki, agora do Foundry 14.
- **O que o ensaio mostrou:** nenhum erro nem aviso do sistema nos três navegadores. As duas falhas das primeiras rodadas
  eram do roteiro (o segurança a 20 m, onde a DV da pistola é 20; a SP lida depois da ablação). Para a mesa: o Foundry abre
  o mundo pausado, e os jogadores só movem os tokens depois que o mestre tira a pausa.
- **Resultados:** G1 e G2 sem mudança no que eles conferem (o ensaio passou no `node --check` e no ESLint); G3 174 de 174;
  o G4 não muda (o cenário v14 e o sistema são os do ciclo 122: 155 de 155); o ensaio, 16 de 16.
- **Próximo:** a primeira sessão da Morana no Foundry 14; depois, o C24, parte 2 (a loja que vende).

### Ciclo 124 (2026-10-18): C16, drogas com prazo, scanners e luz no token (sessão Codex)

Commit anterior: `d4bbb69` (ciclo 123). Item reservado e enviado em `a913dee`, antes da implementação.
Os ciclos 118 a 122 das outras sessões foram integrados, conservando as Roles, os lados do cyberware e o contêiner.
O ensaio do ciclo 123 foi integrado ao fechar: só documentos e um cenário chamado pelo nome, sem mudar os fontes
nem o cenário v14 que passaram nos portões. O número já publicado ficou com a sessão KouArt.

- **Fontes:** CORE 0.92.4, `modules/item/types/cpr-drug.js`, `snort` (dose e ativação do primário); os packs de drogas,
  scanners, Flashlight e Road Flare. Wiki: `system-rules.js`, Drogas de rua, p. 227–229; `system-catalog.js`, os dois
  scanners, a lanterna e o sinalizador. O Stim dura uma hora pela descrição `drug.stim`, p. 150 do CORE.
- **Decisão do usuário:** alcance de 100 m para lanterna e sinalizador. A divergência com os 50 m do efeito ATL do
  CORE e a confirmação estão nas dúvidas acima. As fontes da wiki não foram alteradas.
- **Implementado:**
  - prazo persistido por tomada: Black Lace e Boost, 24 h; Blue Glass, Smash e Synthcoke, 4 h; Stim, 1 h. Cada dose
    adicional estende o fim sem duplicar o bônus. A conta aceita relógio negativo e prazo anterior igual a zero;
  - o efeito recebe a duração nativa do v14. O mestre ativo encerra automaticamente pelo relógio e ao voltar ao
    mundo, incluindo os capangas soltos de todas as cenas. A nova dose resolve primeiro um prazo já vencido;
  - uso e encerramento em fila por ator no mesmo cliente; secundário e vício conservados do ciclo 78. A Humanidade
    devolvida pelo Black Lace limita-se à perda real, inclusive quando os dados excedem o saldo restante;
  - Medscanner e Techscanner não acumulam com outro do mesmo tipo, inclusive o cyberware renomeado. Guardar,
    desinstalar ou desligar a primeira origem deixa a outra valer, preservando os outros bônus;
  - luz nativa no token, com alcance de 100 m, sem somar fontes ou reduzir uma luz original maior. Cor, ângulo e
    dados salvos da cena são preservados. Lanternas anteriores ao C16 ganham seu efeito ao usar;
  - sinalizador de uso único: gasta uma unidade, ilumina por uma hora e não pode ser reutilizado esgotado;
  - `DadosEfeito.isSuppressed` devolve `null` quando não suprime, deixando o Foundry aplicar `duration.expired`.
    O build conserva os dois efeitos de luz antes descartados. O estoque de um contêiner não toma drogas.
- **Referências:** G3 com os valores da wiki, a duração e extensão, identificação e substituição dos scanners e os
  efeitos nativos do catálogo; seis passos G4 independentes, incluindo retorno real à página do mundo, estado lido
  depois do relógio, dois capangas e dois clientes para a luz. O teste lê o resultado automático antes da chamada
  manual que poderia mascarar a ausência do gancho.
- **Portões:** G1, 80 arquivos sem erro; G2, nenhum erro; G3, 178/178; G4 completo, 161/161, sem avisos de
  compatibilidade ou erros de JS. A primeira rodada completa passou em 340 s; a final, após o ajuste da conta, em 346 s.
- **Mutações:** 38 distintas detectadas, uma por vez: 12 de regras, 2 de build e 24 com navegador. Foram 39 execuções,
  incluindo a repetição da extensão após ajustar o relógio negativo; nenhuma sobreviveu. Os sete arquivos envolvidos
  foram restaurados byte a byte, com MD5 conferido em cada execução e nenhuma restauração incorreta.
- **Limites:** a carga da bateria da lanterna, os efeitos narrativos das drogas, as curas e as restrições médicas
  continuam com o mestre. Tomadas antigas sem prazo continuam usando Acabou. A fila é do cliente, como as outras
  filas do sistema. O guia Morana e os demais arquivos locais ficaram fora do ciclo. Servidor e campanha real intactos.
- **Próximo fora da NET:** C17, pilhas, pelo protocolo de reserva do ROADMAP.

### Ciclo 125 (2026-10-18): o C25, o Painel Tático dentro do sistema (sessão KouArt)

Commit anterior: `917f57c5` (a reserva do C25). O pedido do usuário (2026-10-18), para a primeira sessão da Morana no
Foundry 14: o Painel Tático da mesa no Foundry 14. Com este ciclo, o C25 termina.

- **A referência:** o módulo `foundry-painel-tatico/` (o painel-tatico 1.0.0 da mesa do Foundry 12) e o teste dele
  (`tests/cenarios/painel.js`). A parte que não depende do CORE vem quase igual (as contas, o estilo, o retrato, a mira e
  o CSS); as ações chamam o sistema, pelo mesmo caminho da ficha.
- **O que muda:**
  - **`scripts/painel/` (novo):** `logica.mjs` (as contas do módulo, com as fontes do tema da ficha e o estado de
    ferimento do sistema nos estados do retrato), `estilo.mjs` e `retrato.mjs` (as configurações e a flag no espaço do
    sistema), `alvo.mjs` (a mira), `acoes.mjs` (as rolagens, o ataque, o dano, a recarga, a munição, os botões de 2077, a
    iniciativa, o fim do turno, os vitais e o equipamento, pelo sistema), `painel.mjs` (a barra, com os dados daqui) e
    `index.mjs` (as configurações, a tecla H e os ganchos); **`styles/painel-tatico.css`** (o do módulo);
  - **`documentos.mjs`:** `municaoCompativel` e `recarregar({ municao })`: o "Trocar a munição" do painel escolhe a
    munição (a ficha só recarregava a que estava no pente);
  - **`sistema.mjs` e `system.json`:** o registro do painel e o CSS.
- **Testes:**
  - **G3:** o `tests/sistema/painel.test.mjs` (novo): os casos do teste do módulo (as imagens de cada estado, o efeito, o
    morto, o estilo, o código PT1, os botões de HP, a posição), com as fontes daqui, e o estado de ferimento do sistema
    (regras.estadoDeFerimento) nos estados do retrato;
  - **G4:** sete passos novos: a barra vazia sem token e a do token controlado (o nome, o apelido, a Role, o estado, o
    HP, a armadura, os 10 atributos, as armas com os modos, a pílula Power e o pente); o retrato por estado (o Levemente
    com o efeito, o Gravemente com a imagem dele, o Mortalmente com a do Gravemente e o efeito, o Morto com o FLATLINE);
    os vitais (os botões do HP, o número digitado, a ablação e o conserto, a Sorte); as rolagens (REF com Ctrl, a busca
    das perícias, a favorita na barra), o tiro mirado na perna com o alvo marcado e o "Trocar a munição"; o painel de
    Equipamento e o de Role; o estilo (o tema, o código PT1, o padrão) e recolher; e o painel do jogador, com o personagem
    dele.
- **O que o teste mostrou:** o `createEmbeddedDocuments` do Foundry 14 não devolve os tokens na ordem pedida (o teste
  pega cada um pelo ator); o `control()` só vale na camada de tokens ativa.
- **Resultados:**
  - G1: 88 arquivos, 0 erros; G2: 0 erros;
  - G3: 181 de 181;
  - G4: 168 de 168;
  - **mutações:** as 3 do G3 caíram (180 de 181 cada): o Gravemente que vira Levemente no retrato (P1), a fonte do CORE que
    fica (P2) e o código PT1 com a posição (P3). As do G4 rodaram depois (2026-10-19, com a mesa vazia): caíram a P4 (o
    retrato pelo rótulo do ferimento), a P5 (a armadura do outro local), a P6 (o mirado sem o local), a P7 (a recarga que
    ignora a escolhida), a P8 (só o capanga tem o painel), a P9 (a favorita que não grava) e a P11 (o equipar que não
    muda). A P10 (o jogador sem "mostrar o meu personagem") passava: a barra do jogador era a de um desenho anterior, e o
    passo agora pede o redesenho (ciclo 130); com isso, ela caiu.
- **Próximo:** o C24, partes 2 e 3 (a loja que vende e a que compra), ou o que o usuário escolher.

### Ciclo 126 (2026-10-18): o C30, parte 2: o membro natural (sessão Junin)

Commit anterior: `b750fb6` (o ciclo 125). Antes, a integração do master `3ee9020` (`git merge -X no-renames`): a wiki
com a peça única no membro natural (46eb94a), a base sem lado que ocupa a vaga de um membro natural na aba Cyberware
da wiki e o cache do CORE fora do git (4c7362b). A integração não mudou nada no sistema; os portões passaram com ela.
- **A referência:**
  - a wiki, `personagem-cyberware.js` (`pecaUnica`, `baseNatural`) e o criador: a peça única com lado e sem base do
    mesmo tipo naquele lado fica no membro natural (`natural: true` no resultado); uma por membro (a segunda é
    pendência); a base escolhida nunca vira outra em silêncio;
  - o cpr-2077 do Foundry 12: põe a peça na base Meat Arm ou Meat Leg do CORE (de graça, sem Humanidade, "a única
    peça instalada"), com o uid `natural:<lado>`.
- **O que muda:**
  - **`regras.mjs`:** `PECAS_UNICAS` (a lista da wiki, pelo id do catálogo da loja), `ehPecaUnica`,
    `ficaNoMembroNatural`, `fundacaoDoLado` (a opção com lado só aceita a fundação do mesmo lado, ou uma sem lado) e
    `ehBaseNatural` (a Meat Arm e a Meat Leg do Foundry 12, pelo uid ou pelo nome);
  - **`documentos.mjs`:**
    - o `noMembroNatural` do item: a primeira peça única de cada membro, na ordem da ficha;
    - o `semFundacao` não marca a peça no membro natural;
    - o `fundacaoPara` respeita o lado;
    - instalar avisa "ficou no membro natural (braço direito)";
  - **`ficha-personagem.mjs`, `cyberware.hbs` e `ficha-item.mjs`:** "braço natural" ou "perna natural" na aba
    Cyberware, no lugar do SEM FUNDAÇÃO; "no membro natural" no alto da ficha do item;
  - **`wiki.mjs`:** o envio da ficha manda `natural: true`; a migração da mesa deixa a Meat Arm e a Meat Leg de fora.
- **Testes:**
  - **G3:** três testes novos em `tests/sistema/lados.test.mjs`:
    - a lista das peças únicas é a da wiki (o catálogo da loja com o `pecaUnica` do `personagem-cyberware.js`);
    - quando a peça fica no membro natural;
    - a fundação do lado e a base natural do Foundry 12.
  - **G4:** três passos novos:
    - na wiki de teste, um Solo com o cyberbraço no braço esquerdo, os Wolvers e as Rippers no braço direito natural e
      o Talon Foot na perna esquerda natural;
    - no Foundry, a importação:
      - os Wolvers e o Talon Foot ficam no natural; as Rippers, a segunda do braço, pedem fundação;
      - o cyberbraço do outro lado não recebe a peça;
      - a aba Cyberware, a ficha do item, o recado da instalação, o envio e a ficha da mesa na wiki;
      - o cyberbraço levado para o braço direito tira os Wolvers do natural, e a fundação deles passa a ser a dele;
    - a migração da mesa no formato do cpr-2077, com os Wolvers na Meat Arm (pelo uid) e o Talon Foot na Meat Leg
      (só pelo nome).
- **Resultados:**
  - antes de integrar o ciclo 125 (o Painel Tático, que a KouArt mandou no meio deste): G1 80 arquivos, 0 erros; G2 0
    erros; G3 181 de 181; G4 164 de 164;
  - depois, com o ciclo 125: G1 88 arquivos, 0 erros; G2 0 erros; G3 184 de 184. O G4 pulou o Foundry no
    commit (a mesa do servidor em uso) e rodou quando ela esvaziou: 171 de 171 (commit de registro);
  - **mutações:** as 12 caíram, nenhuma rodada pulou o Foundry, e os arquivos voltaram (conferido pelo md5):
    - no G3 (180 de 181 cada): a lista sem a Lynx Paws, diferente da wiki (L1); a peça no natural com a fundação do
      lado (L2); a fundação de qualquer lado (L3); a base natural só pelo uid (L4);
    - no G4: a instalação que ignora o lado (L5), a peça no natural ainda sem fundação (L6, 162 de 164: também a
      migração), duas peças no mesmo membro (L7), a instalação sem o recado (L8), o envio sem o `natural` (L9), a
      migração com a Meat Arm e a Meat Leg (L10), a aba Cyberware (L11) e a ficha do item (L12) sem o membro natural;
      163 de 164 cada, menos o L6 e o L7. No L7 caiu também o passo do Jack In no Neuroport, que não passa pelo membro
      natural (instável, como os dois abaixo).
- **O número:** o trabalho começou como o ciclo 125; a KouArt mandou o 125 antes, e este passou a 126 (a mescla do master
  refeita sobre o 125, igual à anterior fora dos arquivos do 125).
- **O que apareceu nas rodadas:**
  - uma vez o Foundry de teste não abriu o mundo (`servidor.log` vazio); subiu à mão e nas rodadas seguintes;
  - uma vez o passo "jogador ataca" (de outro ciclo) parou com `reading 'system'`: o jogador procurou a pistola recém
    criada pelo mestre antes de ela chegar. Passou nas rodadas seguintes, sem mudança; fica anotado para quem cuida
    do passo.
- **Próximo:** o C30 terminou. Para valer na mesa, o sistema precisa ser instalado de novo no servidor (só quando o
  usuário pedir).

### Ciclo 127 (2026-10-18): o ponto de acesso sem a imagem de terminal (o pedido do usuário; sessão KouArt)

Commit anterior: `44a8d777` (o ciclo 126, da sessão Junin; o nosso anterior é o `b750fb61`, o 125).

- **O problema (o usuário, na primeira sessão da Morana no Foundry 14):** o ponto de acesso criado num Tile sem imagem
  ganhava a de terminal do sistema (`icones/terminal.svg`) no tamanho do Tile: um quadrado grande no mapa, que todos
  viam, mesmo com o ponto oculto (o oculto esconde o marcador NET, não o Tile).
- **A causa:** a configuração do ponto (ciclo 50) punha a imagem, porque o Foundry não mostra aos jogadores um Tile sem
  imagem. Mas o marcador NET e o clique nele vêm do documento do Tile, não da imagem: o ponto não precisa dela.
- **O que muda:** a configuração não põe mais a imagem; no Tile com a de terminal do sistema, oferece tirar (marcado). O
  que o usuário fez na hora, na mesa: tirar a imagem pela configuração do Tile.
- **Testes:** no G4, o passo da configuração do ponto: o Tile sem imagem fica sem (e sem o aviso da imagem); o Tile com a
  de terminal do sistema mostra o "tirar" marcado, e a imagem sai.
- **Resultados:** G1 88/0, G2 0 e G3 181/181 (184/184 depois de juntar o ciclo 126 da sessão Junin). O G4 rodou depois, no ciclo 128 (172 de 172, com a mesa vazia), e as mutações T1 (a
  imagem que fica), T2 (sem o "tirar") e T3 (a imagem de volta no Tile sem imagem) caíram (2026-10-19).
- **Próximo:** a entrega dos pedidos da wiki no personagem que veio do Foundry 12 (o ciclo 128).

### Ciclo 128 (2026-10-19): a entrega dos pedidos da wiki no personagem que veio do Foundry 12 (o pedido do usuário; sessão KouArt)

Commit anterior: `2657f14b` (o recorte dos retratos, na wiki).

- **O problema (o usuário, jogando a Morana no Foundry 14):** a entrega dos itens da wiki para o Foundry 14 não
  funcionava. Os pedidos aprovados na wiki não chegavam à ficha.
- **A causa:** a entrega (a de cada minuto e o "Aprovar" da janela) só vai ao "ator ligado", e o sistema o procurava no
  `foundry` da wiki. Desde que a wiki guarda o vínculo de cada Foundry à parte (o `foundry12` e o `foundry14`), o
  `foundry` que ela mostra é o do 12 quando o personagem está nos dois, como os da Morana, que vieram pelo "Importar da
  mesa". O sistema achava o ator do 14, via que não era o do 12 e pulava a entrega, sem aviso. O G4 não pegava: o pedido
  dele era de um personagem só do Foundry 14.
- **O que muda (`wiki.mjs`, `atorLigado`):** como a wiki na entrega, vale o ator deste mundo que é um dos ligados (o
  vínculo do 14, o do 12 ou o que ela mostra); com vínculo e sem nenhum deles aqui, é uma cópia, e não entrega; sem
  vínculo nenhum, o que tiver a flag do personagem.
- **Testes:** no G4, o passo novo do personagem ligado aos dois Foundry (o Netrunner, com o ator do 12 e o do 14): o
  "foundry" que a wiki mostra é o do 12, e o pedido aprovado na wiki chega na ficha do 14 pela entrega de cada minuto
  (o Agent, 100eb a menos, o pedido entregue). O "Aprovar" da janela continua (o Solo religado pelo endpoint do 12).
- **Resultados:** G1 88/0, G2 0, G3 184/184 e G4 172/172. Este G4 também é o do conjunto que estava pendente (o Painel
  Tático do 125, o ponto de acesso do 127 e o ciclo 126 da sessão Junin).
- **Mutações** (2026-10-19, com a mesa vazia): a E1 (só o vínculo que a wiki mostra) e a E2 (sem o vínculo do 14)
  caíram. A E3 (a cópia que recebe o pedido) passava, porque nenhum passo conferia a cópia; o passo agora confere (ciclo
  130), e ela caiu.
- **Próximo:** o C24, parte 2 (a loja que vende).

### Ciclo 129 (2026-10-19): o C17, pilhas no inventário (sessão Codex)

Commit anterior: `953a1c5` (a reserva do C10 da sessão Junin, incorporada sem mudar o código). O C17 foi reservado e
publicado antes de começar em `20f09cb`; a base de comportamento é o ciclo 128, `d4325e5`.

- **Referência e decisão:** CORE 0.92.4, `modules/actor/cpr-actor.js:1252–1279` e `cpr-container.js:154–181`
  (`automaticallyStackItems`), `modules/actor/sheet/cpr-actor-sheet.js:1535–1638` (transferência e divisão), os quatro
  datamodels `ammo`, `gear`, `clothing`, `drug` e o `mixins/stackable-schema.js`. A wiki (`system-catalog.js` e
  `system-rules.js`) define unidades e preço por lote ou dose, sem algoritmo de pilhas. O usuário decidiu
  **"Reproduzir literalmente o comportamento do CORE."** As peculiaridades e a resposta estão nas dúvidas acima.
- **O que muda:**
  - `regras-inventario.mjs`: divisão inteira entre 1 e total menos 1; comparação só por tipo e nome, com a condição
    invertida dos upgrades do destino para equipamento e roupa;
  - `pilhas.mjs` e `ItemCPR.dividirPilha`: fila por inventário no mesmo cliente, permissão, criação com outro ID,
    cópia de nome, imagem, sistema e efeitos, preservando só o catálogo nas flags da cópia; o UID fica no original;
  - fichas de personagem, capanga e contêiner: **Dividir**, quantidade sugerida pela metade para cima e cancelamento.
    O jogador precisa ser dono; no contêiner, precisa também de "Mudar os itens". O aviso de upgrades não interrompe;
  - drops explícitos do diretório e compêndio passam pela mesma junção das transferências. Reordenar a própria ficha
    não junta. Criação direta e importação conservam documentos separados, necessários aos UIDs e à divisão;
  - `conteiner.mjs`: o primeiro homônimo mantém seus dados e soma só quantidade. Com conteúdo instalado, o CORE
    conserva apenas os upgrades do destino e remove os da origem. Sem junção, a transferência conserva a árvore;
  - quantidades e IDs são conferidos após cada gravação. Cancelamento, criação parcial, débito recusado ou remoção
    parcial tentam restaurar o estoque. Consumo durante a criação é relido, sem recriar unidades.
- **Testes de referência:** 13 novos no G3 (`pilhas.test.mjs`), com contas de unidades e doses, limites, tipos,
  nomes exatos e critérios literais. Nove passos independentes no G4: drops reais e reordenação, janela e cancelamento,
  falhas, quatro tipos e concorrência local, capanga/contêiner, metadados e efeitos, permissões no cliente do jogador,
  consumo real de droga durante a criação e compensações de transferência (inclusive árvore e upgrades).
  A lista exata de botões do C24 passou a exigir também o novo **Dividir**; as demais exigências foram mantidas.
- **Resultados:** G1 90 arquivos/0 erros; G2 0 erros; G3 **197/197**; G4 completo **181/181**, no Foundry 14.369,
  sem pular a parte do Foundry. A captura da aba Equipamento também foi conferida.
- **Mutações:** **31/31 caíram**, uma por vez: M01–M05 no G3, M06–M31 no G4 focado. Cobrem contas, nomes e upgrades,
  drops, fila, IDs/flags, sugestão e cancelamento, permissões, efeitos, botões das três fichas, consumo durante a
  criação, operações canceladas, compensações e o tratamento literal da árvore instalada. Cada rodada restaurou os
  bytes por MD5; os sete arquivos mutados também terminaram com os mesmos MD5 da base aprovada.
  Uma tentativa M24 foi interrompida ainda na espera da trava, sem aplicar mutação; a tentativa válida posterior caiu.
  Os registros locais estão em `tests/.saida/c17-mutacoes.json`, com logs e controles de restauração por rodada.
- **Limites:** a fila é do mesmo cliente; o Foundry não oferece uma transação atômica entre clientes nessa operação.
  Se também recusar a compensação, o sistema interrompe com erro explícito para conferir o estado real do estoque.
- **Próximo:** C18, armadura. C10 segue reservado à sessão Junin e C24 à sessão KouArt.

### Ciclo 130 (2026-10-19): o C24, parte 2: a loja que vende (sessão KouArt)

Commit anterior: `c310e66e` (a reserva do C18, da sessão Codex; o 129 é o C17, as pilhas, do Codex). O usuário mandou seguir para o próximo depois das
mutações pendentes (2026-10-19): o C24, que ficou para depois por causa da primeira sessão da Morana no Foundry 14.

- **A referência:** o `_purchaseItem` do CORE 0.92.4 (`modules/actor/sheet/cpr-container-sheet.js`): o preço da
  unidade (a munição que não é granada nem foguete por 10), vezes a pilha toda ou a parte; sem o "items-free", o
  dinheiro de quem compra precisa cobrir ("tradePriceWarn"), sai dele e entra no contêiner, com a linha no ledger dos
  dois ("Purchased…" e "Sold…"); o estoque infinito fica com o item.
- **O que muda:**
  - **`regras.mjs`:** `custoDaCompra` (o preço da unidade vezes a quantidade; a fração arredonda para cima, porque o
    dinheiro daqui é em eb inteiros);
  - **`conteiner.mjs`:** `pegarDoConteiner` compra na loja: sem o dinheiro, avisa e não leva; com ele, o item vai e os eb
    saem de quem compra e entram na loja, com a linha no extrato dos dois ("Comprou … em …" e "Vendeu … para …");
  - **`ficha-conteiner.mjs` e `conteiner.hbs`:** na loja, "Comprar" e "Comprar parte" (com o custo na dica e o preço da
    unidade na janela da parte).
- **Testes:**
  - **G3:** o teste novo do custo (a pilha, a parte, a munição pelo lote, a granada, a bateria que arredonda, o ponto
    flutuante, o grátis);
  - **G4:** dois passos novos: o do mestre (comprar a pistola, sem o dinheiro, uma parte das balas, o estoque infinito) e
    o do jogador (ele compra para o personagem dele, e o nome dele fica no extrato da loja).
- **Reforço dos testes** (as mutações sobreviventes dos ciclos 125 e 128): o passo do painel do jogador solta o token e
  pede o redesenho antes de ler a barra (o P10, sem a opção "mostrar o meu personagem", passava porque a barra era a de um
  desenho anterior); o passo dos
  pedidos do personagem dos dois Foundry confere a cópia (o ator do 14 apagado, uma cópia com a flag no mundo: o pedido
  fica aprovado; o E3, a cópia que recebe, passava).
- **Resultados:**
  - G1: 88 arquivos, 0 erros; G2: 0 erros;
  - G3: 185 de 185; depois de juntar o ciclo 129 do Codex (as pilhas), 198 de 198, e o G1, 90 arquivos;
  - G4: 174 de 174; depois da junção, 183 de 183 (o passo da loja espera o "Dividir" das pilhas na lista do mestre);
  - **mutações:** as 6 caíram, e os arquivos voltaram (conferido pelo md5): no G3 (184 de 185 cada), a fração que não
    arredonda (C1) e a parte que custa a pilha toda (C2); no G4, a loja de graça (C3), sem a conferência do dinheiro (C4),
    a loja que não recebe (C5) e sem os botões de comprar (C6). As duas dos reforços também caíram: a P10 e a E3.
- **Próximo:** o C24, parte 3 (a loja que compra: vender para ela, pela porcentagem de cada tipo).

### Ciclo 131 (2026-10-19): o C10, parte 1: a Briga e as Artes Marciais com o dano pelo BODY (sessão Junin)

Commit anterior: `a0abb71` (o ciclo 130, da sessão KouArt). O trabalho começou como o ciclo 129; a Codex publicou o 129 e a
KouArt o 130 antes, e este passou a 131 (integrado com o código igual ao que passou nos portões). O C10 é o próximo item aberto do ROADMAP (a fase 3, combate); o pedido do
usuário foi seguir o ROADMAP.
- **A referência:**
  - a wiki, `system-rules.js`, "Briga e artes marciais" (p. 176–178):
    - a tabela do BODY: 1d6 até 4, 2d6 até 6 (ou até 4 com cyberbraço), 3d6 até 10 e 4d6 de 11 para cima;
    - "Briga não ignora armadura. Com Cyberbraço, o dano mínimo é 2d6";
    - "Artes marciais ignoram metade do SP, têm CDT 2 e exigem pelo menos 1 ponto na perícia";
  - o CORE 0.92.4: o `getWeaponDamage` (com o `unarmedAutomaticCalculation`, ligado por padrão) calcula o dano das
    armas `unarmed` e `martialArts` pelo BODY; o cyberbraço só conta no `unarmed`.
- **Antes:** as armas "Unarmed" e "Martial Arts" do catálogo davam 1d6 fixo. A de Artes Marciais apontava para a família
  toda (`martial-arts`), e o ataque saía com 0 na perícia.
- **O que muda:**
  - **`regras.mjs`:** `DANO_PELO_BODY`, `danoDesarmado` (o cyberbraço só na Briga), `ehDesarmada`,
    `formaDasArtesMarciais` (a forma de mais pontos, quando a arma é da família toda) e `artesMarciaisLiberadas`;
  - **`dados.mjs`:** o `danoPeloBody` da arma, ligado por padrão (o `unarmedAutomaticCalculation`);
  - **`documentos.mjs`:**
    - o `danoDaArma` do item: o dano da tabela, com a fundação de cyberbraço instalada;
    - o `periciaDaArma`, que o ataque passa a usar;
    - o `motivoSemAtaque`: as Artes Marciais sem ponto;
  - **`combate.mjs`:** o ataque recusa as Artes Marciais sem ponto, com o aviso;
  - **`rolagens.mjs`:** o dano rolado é o `danoDaArma`;
  - **a tabela de armas da aba Combate e do capanga, o inventário, o Painel Tático e a ficha da mesa** mostram e mandam o
    dano pelo BODY;
  - **a ficha do item:**
    - a caixa "Dano pelo BODY", com o dano de agora;
    - no seletor da perícia, as Artes Marciais (a família e as formas do dono);
    - no cabeçalho, a forma e o dano.
  - O Ataque de Precisão e a Recuperação de Falhas já valiam em todo ataque de arma; com as duas armas, passam a valer
    na Briga e nas Artes Marciais.
- **Testes:**
  - **G3:** o arquivo novo `tests/sistema/desarmado.test.mjs` (5 testes):
    - a tabela igual à da wiki, lida do `system-rules.js`;
    - as bordas da tabela e o cyberbraço só na Briga;
    - a forma das Artes Marciais;
    - o ponto mínimo;
    - as duas armas do catálogo: a metade do SP e a CDT 2.
  - **G4:** um passo novo, depois do agarrão:
    - o dano com BODY 4, com e sem cyberbraço, e com BODY 8; a caixa desligada;
    - a recusa das Artes Marciais sem ponto;
    - as partes do ataque: a perícia (Briga, ou Artes Marciais com a forma Karatê) e o Ataque de Precisão;
    - a tabela da aba Combate, o inventário, a ficha da mesa e a ficha do item;
    - um soco com a Recuperação de Falhas (o 1 no d10 sem a falha crítica) contra o Capanga de Light Armorjack (15
      contra SP 11: 4);
    - um golpe de Artes Marciais pela metade do SP (15 contra 10, que conta 5: 10).
- **Resultados:**
  - antes de integrar os ciclos 129 (Codex) e 130 (KouArt): G1 89 arquivos, 0 erros; G2 0 erros; G3 189 de 189; G4 173 de 173;
  - com o 129: G1 91 arquivos, 0 erros; G2 0 erros; G3 202 de 202; G4 182 de 182;
  - com o 130: G1 91 arquivos, 0 erros; G2 0 erros; G3 203 de 203. G4 184 de 184, depois do push (o número não correu de novo; commit de registro);
  - **mutações:** as 12 caíram, nenhuma rodada pulou o Foundry, e os arquivos voltaram (conferido pelo md5):
    - no G3: a tabela diferente da wiki (B1, 187 de 189), o cyberbraço nas Artes Marciais (B2), a forma de menos pontos
      (B3) e as Artes Marciais sem ponto (B4), 188 de 189 cada;
    - no G4 (172 de 173 cada, sempre o passo novo): o dano sem o BODY (B5), a arma sem a forma do dono (B6), o ataque sem
      a recusa (B7), o dano rolado do item (B8), a tabela da aba Combate (B9), a ficha do item (B10), a ficha da mesa (B11)
      e o inventário (B12).
- **O que apareceu na rodada:** a primeira rodada do G4 deu 172 de 173. O aviso da recusa, provocado de propósito, foi ao
  console pelo `warn` original e derrubou a checagem global "nenhum aviso do sistema". O passo passou a só guardar a
  mensagem, e a lição foi para o QUALITY_GATES.
- **Fica para a parte 2:** os movimentos especiais de cada forma (p. 178–180).
- **Próximo:** o C10, parte 2.

### Ciclo 132 (2026-10-19): o C24, parte 3: a loja que compra (sessão KouArt)

Commit anterior: `68e2915d` (o ciclo 131, da sessão Junin; o C24, parte 2, foi o 130). Com este, o C24 termina.

- **A referência:** o CORE 0.92.4: o `_onDrop` da ficha do contêiner (o jogador sem o "players-create" e com o
  "players-sell" vende o que arrasta, se a loja compra o tipo), o `_sellItemTo` (o preço vezes a pilha vezes a
  porcentagem do tipo, para baixo, até o dinheiro da loja; a janela "Ok, Choom, … is offering you … eddies (…%) for your …
  Deal?"; a arma descarregada; o estoque infinito que não repete o item; o dinheiro e o ledger dos dois), o
  `_configureSellTo` ("Configurar a loja": cada tipo, se compra e a porcentagem) e o `vendor.itemTypes` do
  `container-datamodel.js` (os dez tipos, todos comprando a 100%).
- **O que muda:**
  - **`config.mjs` e `dados.mjs`:** `TIPOS_QUE_A_LOJA_COMPRA` (os dez do CORE, com os nomes daqui) e `system.compra` do
    contêiner (cada tipo: se compra e a porcentagem; na loja nova, todos a 100%);
  - **`regras.mjs`:** `ofertaDaLoja` (o preço da unidade vezes a pilha vezes a porcentagem, para baixo, até o dinheiro da
    loja);
  - **`conteiner.mjs`:** `venderParaALoja` (as conferências, a janela da oferta, a arma descarregada, o estoque infinito,
    o item que vai, o dinheiro e o extrato dos dois);
  - **`ficha-conteiner.mjs` e `conteiner.hbs`:** o arrastar do jogador que vende, o "Configurar a compra" do mestre e a
    dica para o jogador.
- **Testes:**
  - **G3:** o teste novo da oferta (a porcentagem, para baixo, o limite do dinheiro, a pilha, a munição pelo lote, a
    bateria, o ponto flutuante) e dos tipos (os dez do CORE);
  - **G4:** dois passos novos: o do mestre (o "Configurar a compra": os dez tipos a 100%, o equipamento a 50% e a arma
    fora; o botão some no personalizado sem "Vender itens") e o do jogador (ele vende o Agent a 50%, a pistola carregada,
    que vai descarregada, o Techtool para a loja de 30eb, que paga o que tem, e a faca, que a loja que não compra arma
    recusa sem abrir a janela).
- **Portões** (com o ciclo 131 da sessão Junin integrado): G1, 91 arquivos sem erro; G2, nenhum erro; G3, 204/204; G4
  completo, 186/186, com a checagem dos dois navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido):
  - no G3: a oferta sem o limite do dinheiro da loja (V1) e a oferta arredondada para cima (V2);
  - no Foundry: sem a porcentagem do tipo (V3), a arma que vai carregada (V4), a loja que compra qualquer tipo (V5), o
    arrastar do jogador que não vende (V6), quem vende sem receber (V7) e o "Configurar a compra" que não grava (V8).
  - A V5 parou o G4 na primeira rodada: a loja passou a comprar a faca, e a janela da venda ficou esperando o clique
    (o passo só terminou com o "No" dado à mão). O passo agora espera a janela por 2 s e, se ela abrir, fecha pelo "No"
    e falha. A V5 rodou de novo assim, com o passo novo, e caiu sozinha.
- **Próximo:** o C24 terminou. No plano, o que o usuário escolher (os itens livres do ROADMAP; o C10 está com a sessão
  Junin e o C18 com o Codex).

### Ciclo 133 (2026-10-19): o C11, parte 1: o cyberware que é arma do CORE (sessão KouArt)

Commit anterior: `e297c492` (a reserva do C11, depois do ciclo 132).

- **A referência:** o CORE 0.92.4: o `cyberware-datamodel.js` (o `isWeapon`, com o `attackable-schema.js` e o
  `loadable-schema.js`), o `cpr-cyberware.js` (as ações de arma do cyberware vão para as da arma) e os packs
  `core/cyberware`: os doze com `isWeapon: true` (Big Knucks, Cybersnake, Dartgun, Popup Grenade Launcher, Popup Melee
  Weapon, Popup Ranged Weapon, Rippers, Scratchers, Slice 'N Dice, Talon Foot, Vampyres e Wolvers). A wiki
  (`system-catalog.js`, Cybermembros) dá os mesmos como arma branca leve, média ou pesada, e a Arma branca e a de
  distância embutidas instalam a arma escolhida. O CORE mostra o cyberware que é arma instalado na aba de combate.
- **O que muda:**
  - **o catálogo** (`build/conteudo.mjs`, `dados/catalogo.json`): os doze trazem `system.arma` (o `ataca` e os campos de
    arma, como os da arma do CORE); os outros 664 itens ficaram iguais;
  - **`dados.mjs`:** `system.arma` no cyberware (o "É arma" e os campos);
  - **`armas-cyberware.mjs`** (novo): a arma ligada ao cyberware (a flag `armaDoCyberware` e o `instaladoEm`, como a
    arma montada num veículo do ciclo 117), criada, acertada ou tirada no cliente de quem instala, tira, muda ou apaga o
    cyberware, numa fila por ator; as balas do pente voltam; o motivo do ataque recusado (fora da ficha, não instalado,
    EMP);
  - **`documentos.mjs`:** o `instaladoNo` da arma do cyberware e o `motivoVeicular` que vai para o motivo dela (o ataque
    e a recarga já conferem a arma montada antes e depois da rolagem, e gastam o pente só no fim);
  - **as fichas:** a aba Combate (o `armasDeCombate`: as de mão e as do cyberware, prontas, com a marca "Cyberware"), o
    resumo de armas prontas, a lista de itens do capanga sem ela, a ficha do item (a arma diz de que cyberware é; o
    cyberware tem o "É arma" e os campos) e o Painel Tático;
  - **`wiki.mjs`:** a ficha que volta para a wiki sem a arma do cyberware;
  - **`migracao.mjs`:** o passo 6 (o cyberware que veio do catálogo antes deste ciclo ganha a arma, uma vez).
- **Testes:**
  - **G3:** `armas-cyberware.test.mjs`, novo: o catálogo (os doze, e nenhum outro, com os números de quatro), a arma do
    cyberware (sem mãos, montada nele, a cópia das munições), o que muda nela e o passo 6 da migração;
  - **G4:** três passos novos: o do mestre (os Wolvers e a Popup Ranged Weapon na Atiradora: a aba Combate, as mãos, o
    inventário, a wiki, o golpe de 3d6, o EMP, a recarga, o dano novo, tirar, desligar e apagar), o do capanga e o do
    jogador (ele instala as Rippers no computador dele, e só uma arma aparece). A lista de armas do Painel Tático (as
    equipadas e as do cyberware) não tem passo próprio.
- **Portões:** G1, 93 arquivos sem erro; G2, nenhum erro; G3, 208/208; G4 completo, 189/189, com a checagem dos dois
  navegadores sem avisos ou erros de JS. A primeira rodada do G4 falhou só no rótulo do teste (a perícia é "Armas
  Brancas"); corrigido, o passo do capanga entrou, e o G4 rodou de novo inteiro.
- **Mutações:** as 14 caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido):
  - no G3: a arma que ocupa uma mão (A1), a migração sem a marca (A2) e o pente do cyberware que não chega à arma (A3);
  - no Foundry: o cyberware que não ataca dando arma (A4, dez passos), a arma que não acompanha o cyberware (A5), o
    cyberware apagado que deixa a arma (A6), as balas que não voltam (A7), a conferência do veículo na arma do cyberware
    (A8), o EMP que não a para (A9), a aba Combate sem ela (A10), os dois computadores criando a arma (A11: o jogador
    ficou com duas), a arma que vai para a wiki (A12), a arma guardada na aba Combate (A13) e a lista do capanga com
    ela (A14).
- **Limites:** os quatro do Kit (Gorilla Arm, Mantis Blade, Monowire e Projectile Launch System) ainda não atacam (o C11,
  parte 2). A arma do cyberware não ocupa a mão do braço (o CORE também não). Acessórios na arma do cyberware: ela não
  tem slots.
- **Próximo:** o C11, parte 2: o cyberware que é arma do Kit.

### Ciclo 134 (2026-10-19): o C11, parte 2a: o cyberware que é arma do Kit (sessão KouArt)

Commit anterior: `de78fdaf` (o ciclo 133).

- **A referência:** a wiki (`system-2077.js`, os Cybermembros do Mission Kit: a Gorilla Arm, a Mantis Blade, o Monowire e o
  Projectile Launch System, com os números da arma no texto) e o módulo cpr-2077 da mesa do Foundry 12
  (`foundry-2077/build/cyberware.mjs` do master: os mesmos números, nos moldes Wolvers, Rippers, Big Knucks e Popup Grenade
  Launcher do CORE, e o +1 da qualidade excelente na Gorilla Arm e na Mantis Blade). O módulo não automatiza as regras
  próprias de cada um.
- **O que muda:**
  - **o catálogo** (`build/conteudo-2077.mjs`, `dados/catalogo.json`): os quatro trazem `system.arma` (a Gorilla Arm e a
    Mantis Blade, arma branca pesada excelente, 3d6, CDT 2, +1; o Monowire, 3d6, CDT 2; o Projectile Launch System,
    lança-foguetes de um tiro, 8d6, foguete ou granada, a DV do lança-foguetes); os outros 672 itens ficaram iguais;
  - **`migracao.mjs`:** o passo 7 (a mesma conta do 6, `armaDoCatalogo`), para o mundo que já passou do 6.
- **Testes:**
  - **G3:** em `armas-cyberware.test.mjs`, o catálogo com os dezesseis (e nenhum outro), os números dos quatro do Kit e o
    passo 7 (sozinho e com o 6, uma vez só);
  - **G4:** um passo novo: a Mantis Blade instalada na Atiradora (a arma excelente, o golpe de 19 com o +1, 3d6 no
    Capanga) e o Projectile Launch System (o lança-foguetes de um tiro, que carrega a granada).
- **Portões:** G1, 93 arquivos sem erro; G2, nenhum erro; G3, 210/210; G4 completo, 190/190, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as três caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido): o passo 7 que não faz nada
  (K1, no G3), a Mantis Blade sem o +1 (K2) e o Projectile Launch System só com foguete (K3), as duas no G3 e no Foundry.
- **Limites:** as regras próprias do Kit ficam com o mestre (a parte 2b; ver as dúvidas).
- **Próximo:** o C11, parte 2b (as regras próprias do Kit), ou a parte 3 (a arma sob o cano e a baioneta).

### Ciclo 135 (2026-10-19): o C11, parte 3: o acessório que é arma (sessão KouArt)

Commit anterior: `77976061` (o ciclo 134).

- **A referência:** o CORE 0.92.4: o `itemUpgrade-datamodel.js` (o `modifiers.secondaryWeapon.configured`, com o
  `attackable-schema.js` e o `loadable-schema.js`), o `weapons-schema.js` do ator (o `getWeapons`: a arma secundária do
  acessório conta como equipada quando a arma onde ele está instalado está equipada) e os três acessórios dos packs
  `core/upgrades` com a arma secundária: a Bayonet (arma branca leve, 1d6, ROF 2), o Grenade Launcher Underbarrel (6d6,
  uma granada) e o Shotgun Underbarrel (5d6, dois cartuchos). A wiki (`system-catalog.js`, Acessórios de arma): "a arma
  também serve de arma branca leve"; "com as duas mãos, a arma também dispara como lança-granadas, com 1 granada"; "como
  espingarda, com 2 cartuchos".
- **O que muda:**
  - **o catálogo** (`build/conteudo.mjs`: o `armaMontada`, agora do cyberware e do acessório): os três trazem
    `system.arma`; os outros 673 itens ficaram iguais;
  - **`dados.mjs`:** o `armaMontada()`, o mesmo campo `arma` no cyberware e no upgrade;
  - **`armas-cyberware.mjs`:** o acessório instalado numa arma do ator também tem a sua arma (a flag `armaDoUpgrade`),
    pronta com a arma onde ele está equipada (`armaMontadaPronta`); o motivo do ataque recusado ("Equipe … para usar …");
    a arma que sai leva a arma dos acessórios dela; os nomes ficaram gerais (`dadosDaArmaMontada`,
    `sincronizarArmaMontada`, `idDaOrigem`);
  - **`documentos.mjs`:** o `instaladoNo` da arma do acessório e o motivo dela;
  - **as fichas:** a aba Combate com a arma do acessório ("Em <a arma>", guardada com a arma guardada), a lista do capanga,
    a ficha do item (o "É arma" do acessório de arma; a arma diz de onde vem), o Painel Tático;
  - **`wiki.mjs`:** a ficha que volta para a wiki sem ela;
  - **`migracao.mjs`:** o passo 8 (a mesma conta, agora também do acessório).
- **Testes:**
  - **G3:** em `armas-cyberware.test.mjs`, os três acessórios do catálogo (e nenhum outro), a arma da baioneta (a flag do
    acessório) e o passo 8;
  - **G4:** um passo novo: a baioneta e o lança-granadas sob o cano no fuzil equipado da Atiradora (a aba Combate, as mãos,
    os slots, o inventário, a wiki, o golpe de 1d6, a recarga, o fuzil guardado, a baioneta tirada e o fuzil apagado).
    Na primeira rodada, o passo passou, mas oito dos seguintes caíram: a limpeza apagava pelo nome, e a Atiradora já tinha
    um Assault Rifle dos passos do tiro. A limpeza agora apaga só o que o passo criou (e a arma ligada a ele), também nos
    passos dos ciclos 133 e 134.
- **Portões:** G1, 93 arquivos sem erro; G2, nenhum erro; G3, 212/212; G4 completo, 191/191, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido): no G3, o acessório que não dá
  arma (U1) e a migração só do cyberware (U2); no Foundry, o acessório instalado que não conta como montado (U3), a arma
  de baixo que ataca com a arma guardada (U4), a arma apagada que deixa a dos acessórios (U5), a arma do acessório sempre
  guardada (U6), instalar o acessório sem chegar à arma dele (U7) e o `instaladoNo` que não acha o acessório (U8).
- **Limites:** a arma de baixo não herda a qualidade nem os acessórios da arma onde está (ver as dúvidas); ocultar a arma
  com o acessório fica com o mestre.
- **Próximo:** o C11, parte 2b (as regras próprias do Kit: pede a decisão do usuário, ver as dúvidas) ou a parte 4 (os
  acessórios: o limite de slots, os plugs do Smartgun Link e o pente acima do máximo).

### Ciclo 136 (2026-10-19): o C11, parte 4: os acessórios de arma (sessão KouArt)

Commit anterior: `f3387ed0` (o ciclo 135).

- **A referência:** a wiki (`system-catalog.js`, Acessórios de arma, p. 342–344): "toda arma de longo alcance não exótica
  tem 3 slots de acessório"; "só um carregador por vez"; o Smartgun Link, "+1 nos ataques à distância", que "exige plugs de
  interface ou plug subdérmico, que exigem Neural Link"; a Tabela de carregadores. O CORE 0.92.4 dá o +1 do Smartgun Link
  sem conferir a ligação (ver as dúvidas).
- **O que muda:**
  - **`regras.mjs`:** `acessorioCabe` (os slots e o carregador), `ehSmartgunLink` e `smartgunLinkVale`,
    `penteComCarregador` (agora também o do `prepareDerivedData` da arma) e `sobraDoPente`;
  - **`documentos.mjs`:** o acessório que entra numa arma passa pela conferência (recusado, com o aviso), menos a montagem
    da wiki (a opção `montagemDaWiki`); o +1 do Smartgun Link só à distância e com a ligação (`temLigacaoSmart`);
  - **`armas-cyberware.mjs`:** `acertarPentes` (tirado ou apagado um acessório, o pente que passa do máximo volta a ele,
    e a sobra volta para a munição);
  - **`wiki.mjs`:** as duas montagens da importação com a opção `montagemDaWiki`.
- **Testes:**
  - **G3:** em `regras.test.mjs`, o teste novo dos acessórios (os slots, o carregador, o Smartgun Link, o pente);
  - **G4:** o passo dos acessórios do ciclo 26 com as regras da wiki: o rifle com 5 slots (o mestre os dá) para os dois
    Smartgun Links ainda mostrarem que não somam; o +1 só com os plugs de interface; tirados, o pente volta a 25 e as 10
    balas voltam (antes, o passo esperava o +1 sem a ligação e não olhava o pente). E um passo novo: no rifle de 3 slots,
    o estendido entra, o tambor não, o Smartgun Link enche os 3, a baioneta não cabe, e a montagem da wiki entra como veio.
    E outro, como o "C15 Legado": a ficha antiga da mesa com o rifle e dois carregadores dentro volta com os dois pelo
    "Importar da mesa", sem aviso (entrou depois que a P10 sobreviveu: nenhum teste importava uma montagem acima das regras).
- **Portões:** G1, 93 arquivos sem erro; G2, nenhum erro; G3, 213/213; G4 completo, 193/193, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** caíram 9 de 10, uma por vez, e os arquivos voltaram exatos (md5 conferido): no G3, o segundo carregador
  que entra (P1), o último slot que não cabe (P2), o Smartgun Link sem a ligação (P3) e a sobra do pente que não conta
  (P4); no Foundry, a conferência também na montagem da wiki (P5), o que não cabe entrando (P6), o Smartgun Link sem a
  ligação na ficha (P7), o pente que não se acerta (P8) e as balas que não voltam (P9). A P10 (a importação da mesa sem
  a opção `montagemDaWiki`) sobreviveu duas vezes, também com o passo novo: a importação monta tudo num lote só, e a
  conferência é por item (cada acessório olha a arma como estava antes do lote), então ali a opção não muda o resultado
  (a mutação é equivalente). A opção fica para o pedido da wiki que entra numa arma que já tem acessórios.
- **Limites:** a conferência é por item (a mudança em lote não soma os acessórios entre si, como as mãos do C12); o tipo de
  arma de cada acessório ("cada acessório é feito para certos tipos de arma") fica com o mestre.
- **Próximo:** do C11, só a parte 2b (as regras próprias do Kit), que pede a decisão do usuário (ver as dúvidas do ciclo
  134). Fora dela, o próximo item livre do ROADMAP.

### Ciclo 137 (2026-10-20): o C18, armadura por local e todas as camadas (sessão Codex)

Commit anterior: `5c95079` (ciclo 136). O C18 foi reservado e publicado em `c310e66`. Os ciclos 130 a 136 das outras
sessões foram incorporados antes do fechamento, preservando o trabalho das três sessões.

- **Referência:** CORE 0.92.4, `modules/actor/cpr-actor.js:943–961` (armaduras vestidas), `:1377–1388` (maior SP atual)
  e `:1564–1627` (`_ablateArmor`, todas as camadas do local). Wiki: `system-rules.js`, Armadura, p. 186, e
  `system-catalog.js:88–89`, Skin Weave e Subdermal Armor, sem soma e com ablação de todas as fontes. Para consertar,
  permanece a decisão do usuário de 2026-10-16, registrada no ciclo 70: voltar ao máximo e anunciar quem consertou;
  o mestre narra tempo e condições.
- **O que muda:**
  - `regras-armadura.mjs`: seleção do maior SP atual, enumeração das armaduras vestidas que cobrem o local e limites
    de zero ao máximo; escudos e armaduras guardadas ficam fora;
  - o dano e a ablação pelo local atingem todas as camadas vestidas, inclusive os itens de armadura dos implantes;
    o Painel Tático usa a mesma operação para ablar;
  - o cartão guarda os IDs e a perda efetiva de cada camada. Desfazer restaura cada diferença sem ultrapassar o
    máximo, conserva dano posterior, aceita a peça retirada depois e ignora IDs removidos. Cartões antigos conservam
    o formato de uma só armadura;
  - as fichas de personagem e capanga mostram a fonte do SP e os botões **−1 SP** por local e **Consertar** por item.
    O conserto restaura ambos os locais daquela peça; inteira, só informa, sem novo cartão;
  - APIs de ablação e conserto conferem propriedade e a permissão de mudar o estoque do contêiner. A revisão pegou a
    guarda que faltava para ablar o estoque protegido; o teste do jogador e a mutação M23 a conferem.
- **Testes de referência:** sete novos no G3 (`armadura.test.mjs`): SP atual, locais, empate, fontes, todas as camadas,
  limites e os dois implantes do catálogo como itens de armadura separados do cyberware. Quatro passos independentes
  no G4: contas e Desfazer, cliques nas duas fichas, ataque perfurante em capanga de token solto e permissões no
  navegador do jogador. A lista exata de painéis do capanga passou a exigir também o novo painel ARMADURA,
  preservando os anteriores. As capturas das fichas foram conferidas.
- **Resultados:** antes da integração, G1 92 arquivos/0 erros, G2 0, G3 **204/204** e G4 completo **185/185**. Depois
  de incorporar os ciclos 130 a 136: G1 95 arquivos/0 erros, G2 0, G3 **220/220** e G4 completo **197/197**, no
  Foundry 14.369, sem pular a parte do Foundry e sem avisos ou erros do sistema nos dois navegadores.
- **Mutações:** **23/23 caíram**, uma por vez: seis no G3 e dezessete no G4 focado, conferindo seleção, limites,
  persistência, todas as camadas, perdas efetivas, cartões antigos e novos, cabeça e corpo, botões nas duas fichas,
  Painel Tático e permissões. As 23 rodadas restauraram os bytes por MD5. Depois da integração, a bateria foi repetida
  no conjunto final, também com 23/23 e restauração por MD5. Registros locais em `tests/.saida/c18-mutacoes.json`,
  com log e controle de restauração por rodada.
- **Limites:** Skin Weave e Subdermal Armor continuam usando os itens de armadura separados do CORE; não houve
  mudança de schema, build ou recuperação diária automática. O conserto não calcula teste, custo ou tempo.
- **Próximo:** C19, lesão crítica fora do ataque. C10 segue reservado à sessão Junin e C11 à sessão KouArt.

### Ciclo 138 (2026-10-20): o C11, parte 2b: as regras do Kit que são conta (sessão KouArt)

Commit anterior: `87cf787d` (a reserva do C19 da sessão Codex, depois do ciclo 137 dela, o C18). O C11 ficou com os ciclos 133 a 136 e 138. Com este, o C11 termina.

- **Decisões do usuário (2026-10-19):** "vamos focar todas as atualizações do sistema e etc apenas para o foundry 14" (o
  ROADMAP, nas sessões do plano: o Foundry 12 não recebe mais mudanças); e, das regras próprias dos quatro do Kit, "só o
  que é conta" (ver as dúvidas).
- **A referência:** a wiki (`system-2077.js`): o Projectile Launch System, "lança-foguetes ou lança-granadas de uma mão com
  um tiro no pente: com foguete, é lança-foguetes; com granada, lança-granadas"; o Monowire, que "ataca a até 6 m" e,
  "quando causa uma lesão crítica, quem atacou rola duas vezes na tabela e escolhe a que a vítima sofre". Os números do
  lança-granadas são os do RED no catálogo (`core_weapons:grenade-launcher`: 6d6, a DV do lança-granadas).
- **O que muda:**
  - **`regras.mjs`:** `perfilPelaMunicao` (a granada no Projectile Launch System), `MONOWIRE` e `notaDoMonowire`;
  - **`documentos.mjs`:** na arma, `origemDaArma` (o catálogo do cyberware ou do acessório de onde ela vem),
    `perfilPelaMunicao` e `tabelaDaArma`; o `danoDaArma` com a munição que muda a arma;
  - **`combate.mjs`:** a DV pela `tabelaDaArma` e o tipo pela munição; a nota dos 6 m do Monowire em cada alvo; no
    crítico do Monowire, as duas lesões no cartão delas (a lesão certa, como a Perna quebrada, entra direto); o botão
    "Esta" (do mestre);
  - **`lesoes.mjs` e `templates/chat/lesao-escolha.hbs`:** `escolhaDeLesao` (as duas rolagens, sem aplicar, num cartão) e
    `escolherLesao` (o mestre aplica a escolhida, pela configuração "Lesão crítica", e o cartão diz qual).
- **Testes:**
  - **G3:** em `armas-cyberware.test.mjs`, o perfil pela munição (o do lança-granadas do catálogo; com foguete e nas outras
    armas, nada) e a nota do Monowire;
  - **G4:** um passo novo: o Projectile Launch System com granada (6d6, a DV do lança-granadas no cabeçalho do ataque que
    erra) e com foguete (8d6, a DV do lança-foguetes); o Monowire, com a nota dos 6 m e, no crítico, o cartão das duas
    lesões, o botão do mestre e a lesão escolhida na ficha do Capanga. Na primeira rodada, tudo deu certo menos a conta dos
    botões (4 para 2 lesões): a mensagem aparece duas vezes na página, no histórico e no aviso do chat; o passo agora conta
    numa delas.
- **Portões** (com o ciclo 137 da sessão Codex, o C18, integrado: o meu era o 137 e virou o 138, pela regra do plano):
  G1, 95 arquivos sem erro; G2, nenhum erro; G3, 221/221; G4 completo, 198/198, com a checagem dos dois navegadores sem
  avisos ou erros de JS. Antes da integração: G3 214/214 e G4 194/194.
- **Mutações** (rodadas antes da integração; o código delas não mudou com ela): as oito caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido): no G3, a granada que não muda
  o lançador (M1) e a nota sem a distância (M2); no Foundry, o dano sem a munição (M3), a tabela de DV sem ela (M4), o
  Monowire com uma lesão só (M5), o botão "Esta" sem efeito (M6), a escolhida fora da ficha (M7) e o ataque sem a nota
  dos 6 m (M8).
- **Limites:** a mão do braço com a Mantis Blade ou o Projectile Launch System para fora e o BODY 11 da Gorilla Arm ficam
  com o mestre; a lesão do Monowire, escolhida depois, fica fora do Desfazer do ataque.
- **Próximo:** o C11 terminou. O próximo item livre do ROADMAP (a sessão Junin está no C10 e a Codex no C18).

### Ciclo 139 (2026-10-20): o C20, as macros na barra e os favoritos (sessão KouArt)

Commit anterior: `f6e40ffc` (a reserva do C20). O C20 inteiro neste ciclo.

- **A referência:** o CORE 0.92.4 (`modules/hooks/hotbar/generate-item-macro.js`, `modules/utils/cpr-macros.js` e o
  `favorite` do `common-schema.js`, com o alfinete das listas da ficha). No CORE, arrastar para a barra a arma (e o
  cyberware ou o acessório que são arma) cria a macro do ataque, com o `rollType` escolhido no texto dela (o ataque, o
  dano, o mirado, o autofogo e o supressivo) e o `skipPrompt`; a perícia (um item, lá), a macro do teste; o outro item,
  a que abre e fecha a ficha. A macro acha o item pelo nome no ator do token controlado (ou no personagem do jogador), e o
  nome dela leva o do usuário. O alfinete (`favorite`) deixa o item ou a perícia visível com a categoria fechada.
- **O que muda:**
  - **`scripts/macros.mjs` (novo):** o gancho `hotbarDrop` (`aoSoltarNaBarra`): a arma vira a macro do ataque (o texto
    lista os modos dela: o ataque, o mirado, o autofogo e o supressivo que ela tem, os modos de 2077 de
    `combate.acoesDe2077` e o dano), a perícia arrastada (o tipo `PericiaCPR`), a do teste, e o outro item, a que abre a
    ficha, com a imagem do item, como no CORE; a mesma macro do usuário vai de novo para a barra, sem outra. A API das
    macros: `usarArma(nome, { pularJanela, modo })` e `rolarPericia(id, { pularJanela })`, com a janela de rolagem do
    clique (o "Rolar direto" deste navegador inverte; `pularJanela`, o `skipPrompt` do CORE, rola direto). As estrelas
    (`alternarPericiaFavorita`, `alternarItemFavorito`) e a pergunta do local do mirado (`perguntarLocalMirado`), que a
    ficha também usa;
  - **a ficha do personagem:** a ★ em cada perícia (a mesma flag `periciasFavoritas` do Painel Tático) e nas armas,
    armaduras e itens do inventário (a flag `favorito`); o painel **Favoritos** na aba Combate, na coluna das listas, com
    as perícias (o total; o clique rola) e os itens (a arma com "Atacar", a droga e o equipamento ligado à mão com
    "Usar"); a perícia favorita sem nível fica também na lista curta do painel geral; o nome da perícia, a linha da arma
    na aba Combate e os itens favoritos se arrastam para a barra (`_onDragStart`);
  - **o Painel Tático:** a estrela dele passa pela mesma função da ficha.
- **Testes:**
  - **G3:** `macros.test.mjs` (novo): os modos de cada arma, o texto da macro (rodado num contexto com a API falsa: o nome
    com aspas e barra invertida chega inteiro, e trocar as escolhas no alto muda a chamada), a janela e a lista curta;
  - **G4:** dois passos novos. No mestre: a ★ da Percepção (sem nível) na lista curta e no painel Favoritos, que rola; a ★
    do rifle e da droga, com Atacar e Usar no painel; o arrastar de verdade (o `dragstart` na ficha e o `drop` na vaga da
    barra) da perícia, da linha da arma (de novo: a mesma macro) e da droga (a que abre a ficha); a macro da perícia e a do
    dano rodando com o token controlado; o mirado pergunta o local; sem token nem personagem, com o modo que a arma não tem
    e com a arma que não existe, só o aviso. No jogador: ele arrasta a Evasão da ficha do personagem dele, a macro é dele
    e, sem token, rola com o personagem dele. Na primeira rodada, o painel Favoritos estava na coluna dos números, e o
    passo da "ficha nova" (que conta os 3 painéis dela, a forma da maquete) falhou: o painel é uma lista e foi para a
    coluna da direita; e o `User#getHotbarMacro`, que o Foundry 14 não tem, virou o `game.user.hotbar`.
- **Portões:** G1, 97 arquivos sem erro; G2, nenhum erro; G3, 226/226; G4 completo, 200/200, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as treze caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: a macro sem o
  autofogo (M1), o nome sem escapar (M2), a janela sem o "Rolar direto" (M3) e a favorita fora da lista curta (M4). No G4:
  o gancho não registrado (M5) e a perícia que não se arrasta (M6), nos dois passos; o "dano" que ataca (M7) e o ator sem
  o token (M8), também na checagem de avisos; a macro repetida (M9), o painel sem os itens (M10), as duas estrelas sem
  efeito (M11, M12) e o mirado sem a pergunta (M13). A primeira rodada parou na M5, porque o PC ficou sem memória: o
  arquivo dela foi restaurado à mão (md5 conferido), e a rodada inteira foi de novo.
- **Próximo:** o C21 (a terapia e a ciberpsicose).

### Ciclo 140 (2026-10-20): o C22, moradia, estilo de vida, moda e Trauma Team (sessão KouArt, com o Antigravity)

Commit anterior: `464d7bab` (o ciclo 139, o C20). O C22 inteiro neste ciclo. O código e os testes saíram de um worker do
Antigravity (o `agy`, numa worktree própria, sem commit); a sessão KouArt revisou, corrigiu, rodou os portões e as
mutações (ver a lição no QUALITY_GATES).

- **A referência:** o CORE 0.92.4 (`modules/datamodels/actor/character-datamodel.js` e `components/lifestyle-schema.js`:
  o `lifestyle`, com `housing`, `lifeStyle` e `traumaTeam`, cada um com o custo e a descrição, e `fashion`, só a descrição;
  o CORE só guarda os campos); a mesa antiga (`foundry-2077/scripts/wiki.mjs`: o `lifestyleUpdate` da importação e a
  `moradia` da ficha "Na mesa", `{ housing, lifeStyle, traumaTeam }` com `{ custo, descricao }`); a wiki (`criador.js`,
  `housing`, o `resultado.moradia`, e o passo 6: "No dia 1º de cada mês, o aluguel, o estilo de vida e o Trauma Team").
- **O que muda:**
  - **`dados.mjs`:** os campos `moradia`, `estiloDeVida` e `traumaTeam` (o custo mensal e a descrição) e `moda`;
  - **`regras.mjs`:** `moradiaDaWiki`, `moradiaDaMesa`, `moradiaParaAWiki` e `custoMensalDeMoradia`;
  - **`wiki.mjs`:** a moradia na importação da wiki e na da mesa, e na ficha "Na mesa" que volta (o formato do cpr-2077,
    que a wiki já mostra);
  - **a aba Vida:** o painel "MORADIA E ESTILO DE VIDA" (os campos, o total por mês) e o "PAGAR O MÊS", que pergunta e
    desconta pelo extrato.
- **A revisão do trabalho do worker:** duas citações do CORE inventadas (um `_payForLifestyle` e um modelo
  `cpr-lifestyle.hbs`, que não existem) saíram; o teste do G3 lia a tabela da wiki por chaves que não existem (`HOUSING`,
  `homes`, `lifestyles`) e esperava nomes inventados ("Ração (Kibble)", "Bag Lady Chic"): agora lê o `housing` real
  (`moradias`, `estilos`, `traumaTeam`, `modas`); o passo do G4 esperava os mesmos nomes, procurava um `.custo-mensal` que o
  modelo não tinha e quebrava sem moda: agora as expectativas vêm do `resultado.moradia` do Nomad, o modelo tem o elemento
  e o dinheiro é posto antes do pagamento (ficar negativo avisaria).
- **Testes:**
  - **G3:** `moradia.test.mjs` (novo): a moradia da wiki (pela tabela real do criador), a ida e a volta da ficha "Na mesa" e
    o total do mês;
  - **G4:** um passo novo: o Nomad importado da wiki com a moradia na aba Vida; o Trauma Team mudado pela ficha; "Pagar o
    mês" (a confirmação, o dinheiro e a linha no extrato); a `moradia` na ficha "Na mesa" e na wiki; a importação da mesa
    que a traz de volta; o botão que some com o total 0.
- **Portões:** G1, 98 arquivos sem erro; G2, nenhum erro; G3, 229/229; G4 completo, 201/201, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as nove caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: o aluguel da wiki
  fora (M1), o Trauma Team fora do total (M2), a chave do estilo de vida trocada (M3) e a migração sem o Trauma Team da
  mesa (M4). No G4: a importação sem a moradia (M5), a ficha da mesa sem ela (M6), o "Pagar o mês" que soma (M7), o botão
  com o total 0 (M8) e a migração sem a ficha da mesa (M9). A rodada de fundo parou na M8 (o PC sem memória: o arquivo
  dela foi restaurado e conferido); a M8 e a M9 rodaram de novo em primeiro plano.
- **Próximo:** o C26, partes 1 a 3 (ciclo 141), e o C21 (ciclo 142).

### Ciclo 141 (2026-10-20): o C10, parte 2: os movimentos especiais das Artes Marciais (sessão Junin)

Commit anterior: `4d87b30` (o ciclo 140, da sessão KouArt). A decisão do usuário (2026-10-19): a rolagem e o efeito automáticos. O sistema confere os
requisitos simples (WILL 8+, MOVE 8+, o agarrão, o "caído"); o "neste turno" o jogador confirma na janela. Nesta mesma
conversa, o usuário pediu a instalação no servidor, feita do `5c95079` (o ciclo 136), com o backup do mundo antes.
- **A referência:** a wiki, `system-rules.js`, "Movimentos de artes marciais" (p. 178–180):
  - **o teste:** "DEX + Artes Marciais + 1d10 contra DEX + Evasão + 1d10 ou contra uma DV", e "precisa superar a DV";
  - **a Recuperação** (todas as formas), mais dois movimentos de cada forma:
    - Aikido: o Desarme combinado e o Aperto de ferro;
    - Karatê: a Combinação quebra-armadura e o Golpe quebra-ossos;
    - Judô: a Contra-queda e o Escape de agarrão;
    - Taekwondo: o Ponto de pressão e a Voadora.
  - O CORE não tem os movimentos.
- **O que muda:**
  - **`regras.mjs`:**
    - `MOVIMENTOS`, com a forma, a DV ou o golpe, os requisitos e as lesões dos golpes;
    - `formaDaPericia`: a forma pelo nome da perícia ("Karate", "Karatê", "Caratê");
    - `movimentosDisponiveis` (o bloqueio do WILL e do MOVE) e `passouNoMovimento` (superar a DV);
  - **`artes-marciais.mjs`** (novo): os testes contra a DV vão como o agarrão (quem age rola; o mestre ativo aplica o
    efeito e manda o cartão). Os golpes vão pelo `atacar`, com a arma de Artes Marciais e a perícia da forma do
    movimento;
  - **`combate.mjs`:**
    - o `atacar` com o movimento e a perícia, e o nome do golpe no rótulo;
    - o Aperto de ferro proíbe o ataque à distância;
    - no acerto, a lesão do golpe (a da cabeça, no mirado) e a queda da Voadora, que o "Desfazer" levanta;
  - **`agarrao.mjs`:** a fuga no Aperto de ferro leva −2 a mais (o `rolarPericia` aceita `extras`);
  - **a ficha:** o bloco "Artes Marciais" na aba Combate e no capanga, um botão por movimento, travado com o motivo
    quando falta WILL ou MOVE;
  - **o `game.system.api.artesMarciais`** (`usarMovimento`, `movimentosDe`).
- **Testes:**
  - **G3:** o arquivo novo `tests/sistema/artes-marciais.test.mjs` (5 testes):
    - a lista igual à tabela da wiki, lida do `system-rules.js`;
    - as formas pelo nome;
    - os movimentos de quem tem a forma, com o bloqueio;
    - o empate, que não passa;
    - as lesões dos golpes no catálogo, na tabela certa.
  - **G4:** dois passos novos.
    - Os testes contra a DV:
      - os botões da aba Combate;
      - a Recuperação, recusada sem estar caído e passando caído;
      - a Combinação quebra-armadura (11 → 9);
      - a Contra-queda, falhando e depois derrubando;
      - o Desarme combinado, que leva a pistola;
      - o Aperto de ferro: a marca, recusado de novo, o tiro recusado e a fuga com −2. A segunda tentativa e o tiro vão
        num `semTravar`: se a recusa falhar, a janela de defesa (que não tem prazo) fecha sozinha e o passo falha em vez
        de travar;
      - o Escape de agarrão: livres, e o Braço quebrado.
    - Os golpes:
      - o WILL, a arma e o MOVE que faltam;
      - as Costelas quebradas;
      - o Ponto de pressão na cabeça, com a Lesão cerebral e o Taekwondo (1) no lugar do Karatê (3);
      - a Voadora fora do alcance e, ao lado, derrubando; o "Desfazer" levanta.
- **Resultados:**
  - G1: 100 arquivos sem erro; G2: 0 erros;
  - G3: 234/234;
  - G4: 202/202 (437 s) na árvore sobre o ciclo 139. O ciclo 140 entrou enquanto o G4 rodava; integrado sem conflito,
    com G1–G3 de novo. O G4 da árvore final (o b5a27a3, sobre o 140): 203 de 203, depois do push (commit de registro).
    Na primeira rodada deu 202 de 203: o passo "jogador ataca" com o `reading 'system'`, a instabilidade já vista, que
    passou na rodada seguinte;
  - **mutações:** as 20 caíram. D1–D6 no G3. D7–D20 no G4, no passo certo (as Artes Marciais): a D11 e a D12 na árvore
    integrada; as outras antes da integração (os ciclos 137–140 não tocam no que elas mudam).
- **O que apareceu nas rodadas:** a primeira rodada do G4 deu 193 de 195, com dois erros do próprio teste:
  - as regex com a barra dobrada fora do template;
  - o token movido sem o `animate: false`: a Voadora viu o alvo ainda a 12 m e recusou, o que confirmou o alcance.
  - Os dois foram corrigidos no teste.
- **A integração sobre os ciclos 137–139:** quatro conflitos, todos de acréscimo dos dois lados na mesma linha. Ficou a soma:
  - o `game.system.api` com as `macros` (C20) e as `artesMarciais`;
  - a ficha e o capanga com o bloco da armadura (C18) e o das Artes Marciais;
  - o "Desfazer" do ataque com as `armaduras` (C18) e o `derrubado` (a Voadora).
- **As mutações que travavam (a D11 e a D12):** sem a marca do Aperto de ferro, ou sem o bloqueio do tiro, o ataque à
  distância saía e abria a janela de defesa da Atiradora, que não tem prazo. O G4 só parava no limite de 30 minutos do
  executor, sem resultado. Com o `semTravar`, as duas caem no passo certo (201/202 e 200/202).
- **Instável, visto uma vez:** na primeira rodada do G4 da árvore sobre o 139, o passo "pedidos da loja" deu 201/202, com
  o carregador estendido entregue em dobro. Ele não passa pelo código deste ciclo e passou na rodada seguinte (202/202).
  A D12 e a D15 também derrubaram, junto, o passo do Jack In no Neuroport, que este ciclo não toca.
- **O C10 terminou.**

### Ciclo 142 (2026-10-20): o C19, lesão crítica fora do ataque e tratamento nas duas fichas (sessão Codex)

Commit anterior: `19503fd` (registro do ciclo 141; código em `b5a27a3`). O C19 foi reservado em `87cf787`, antes de implementar; a base de comportamento
é `1c73bd7`, ciclo 137. Os ciclos 138 a 141 das outras sessões foram incorporados antes do fechamento.

- **Referência:** CORE 0.92.4, `modules/actor/sheet/cpr-actor-sheet.js:1133–1305`: escolha da tabela, criação do item
  e cartão sem descontar HP, conferência de esgotamento e limite de novas tentativas. Wiki: `system-rules.js:28–54`
  e `:549–554`, tabelas do corpo e da cabeça, repetição, paliativo, tratamento e Cybertecnologia na mesma DV em parte
  cibernética. A suspensão do aumento do Death Save durante o paliativo foi confirmada pelo usuário em 2026-10-20,
  com o retorno no "Voltou"; a discrepância e a resposta estão nas dúvidas.
- **O que muda:**
  - **Rolar lesão** nas abas Perícias e Combate e no capanga: corpo ou cabeça, 2d6, item com efeitos e cartão; sem
    perda de HP e com cancelamento sem efeitos;
  - `regras-lesoes.mjs`: lesões disponíveis, sem existentes ou excluídas, tabela esgotada antes da rolagem e até mil
    tentativas. Não anuncia uma lesão repetida se nenhuma nova saiu;
  - `lesoes.mjs`: fila por documento de ator no mesmo cliente, releitura antes de criar e recusa de colisão externa,
    proprietário, tipos personagem/capanga e catálogo de lesão. O ID forçado, `naFicha` e `falar` continuam aceitos;
    uma criação recusada não anuncia aplicação. A revisão encontrou o ID de arma aceito como lesão e a guarda entrou
    com teste e mutação. Na escolha do Monowire, criação recusada conserva o cartão disponível para nova tentativa;
  - painel compartilhado de lesões nas duas fichas, com correção, tratamento, "Voltou" e ações só para quem edita;
  - **Parte cibernética** na janela: Cybertecnologia substitui a perícia escolhida, conservando a DV, sem deduzir
    anatomia. Inclusive a opção de Cirurgia pode ser feita com Cybertecnologia na DV dela;
  - paliativo suspende o +1 dessa lesão no Death Save e só os efeitos ativos, guardando seus IDs. "Voltou" restaura apenas esses IDs
    existentes, preservando efeitos desligados antes ou adicionados depois, e aceita a marca legada sem lista;
  - correção já ativa não se repete; tratamento definitivo continua permitido. Permissão, documento e DV são
    revalidados após a janela e após a rolagem. Uma operação em andamento bloqueia outro tratamento da mesma lesão
    no cliente, para não sobrescrever os IDs antes de gravar a marca; sucesso, cancelamento e erro liberam a guarda.
    O tratamento do ciclo 77 permanece com suas referências e testes.
- **Testes:** treze novos no G3: nove de sorteio/API e quatro de Cybertecnologia, suspensão do aumento do Death Save e guardas.
  Sete passos independentes no G4: cliques nas duas fichas e cancelamento; repetição além de 40 tentativas e tabela
  esgotada; capanga de token solto com paliativo, efeitos e tratamento; fila, colisão, criação recusada e DV alterada
  durante awaits; escolha do Monowire recusada e repetida; navegador do jogador proprietário/observador, APIs e contêiner
  recusado; correções simultâneas com a gravação da marca suspensa, retorno e nova tentativa após cancelar.
- **Resultados:** antes da integração: G1 **97/0**, G2 **0**, G3 **233/233**, foco **8/8** e G4 completo **202/202**.
  Com os ciclos 138 a 140: G1 **100 arquivos/0 erros**, G2 **0**, G3 **242/242** e G4 completo **208/208**.
  No conjunto final com o ciclo 141: G1 **102 arquivos/0 erros**, G2 **0**, G3 **247/247** e G4 completo **210/210**,
  no Foundry 14.369, sem pular a parte do Foundry e sem avisos ou erros do sistema nos dois navegadores.
- **Mutações:** **41/41 caíram**, uma por vez: sete no G3 e trinta e quatro no G4 focado. Cobrem tabelas, dados, limites,
  cancelamento, HP intacto, fichas, permissões, IDs e tipos, fila e colisão externa, criação recusada, opções da API,
  Death Save, Cybertecnologia, efeitos anteriores, marca legada, repetição de correção e validação antes/depois de
  rolar. Cada rodada restaurou os bytes por MD5. Após a integração, as 38 mutações anteriores foram repetidas e também
  caíram. A M39 confere que criação recusada não consome a escolha do Monowire; M40 e M41 conferem a guarda de tratamento
  simultâneo e sua liberação após concluir ou cancelar. Os nove arquivos de código e templates terminaram
  com os MD5 da base integrada. Evidência local em `tests/.saida/c19-mutacoes.json`, com logs e controles por rodada.
  Após incorporar o C10, M13 e M15 foram repetidas por atingirem a ficha alterada, e caíram com MD5 restaurado;
  os outros arquivos mutados permaneceram com os mesmos bytes. O G4 final conferiu também os partials das duas fichas.
- **Limites:** a fila serializa o mesmo cliente; não há transação atômica entre clientes. Parte cibernética e fim do
  dia são decisões da mesa. Sem relógio novo, schema, build ou recuperação automática de lesão.
- **Pendência do C11 integrado:** cliques simultâneos em opções diferentes do cartão do Monowire podem aplicar ambas;
  a fila por ator não serializa a escolha por mensagem. Esse comportamento anterior ficou fora do C19.
- **Coordenação:** C20 e C22 da sessão KouArt e C10 da sessão Junin foram incorporados; as demais reservas do ROADMAP
  foram preservadas. Os conflitos nas fichas somaram os partials de Artes Marciais e de lesões.

### Ciclo 143 (2026-10-20): as arquiteturas da campanha ficam opcionais (sessão Junin)

Commit anterior: `0d61dcd` (o ciclo 142, da sessão Codex). A decisão do usuário (2026-10-20): as arquiteturas NET da
trama antiga do Protocolo Morana (o retransmissor RT-07, O Gatilho, A Coleira e O Núcleo) saem, e "entrarão novas no
futuro". O master já tirou o documento (`documentos/morana/arquiteturas-da-campanha.md`, no 03d94e5), e o
`servidor/instalar-sistema-v14.sh` só copia o documento quando ele existe. Sem este ciclo, a próxima instalação no
servidor quebraria no build dos compêndios.
- **O que muda:**
  - **`build/arquiteturas.mjs`:** sem o documento, `arquiteturasDaCampanha` não devolve nenhuma, e o compêndio
    "Arquiteturas da NET" fica com os 3 exemplos do NET Architect;
  - **`build/fontes.mjs`** (novo): o `precisaGerar` que o `instalar.mjs` usa. Os compêndios são gerados de novo sem a
    marca, com uma fonte mais nova que ela ou com uma fonte que falta (não dá para saber se ela saiu depois da última
    geração). Antes, o `statSync` parava a instalação;
  - **a cópia do documento nesta branch fica**, com as 4 antigas: a wiki da branch ainda o pede (a aba "Arquiteturas
    NET"). Ela sai na próxima mescla do master. Recriar o arquivo no mesmo formato traz as novas.
- **Testes:**
  - **G3:**
    - o teste das arquiteturas lê um documento de exemplo (uma em linha, com 6 andares; uma com o ramo B saindo do
      andar 3; uma seção sem tabela) e confere que sem o documento não há nenhuma. Continuam cobertos os andares, os
      ramos, os fundos, a descrição com o negrito, a seção sem tabela fora e os andares errados;
    - um teste novo do `precisaGerar`: sem a marca, a fonte mais nova, a fonte que falta e a marca mais nova.
  - **G4:** o compêndio e a configuração do ponto de acesso esperam as arquiteturas do documento, se ele existir, mais
    os 3 exemplos (hoje, 7; depois da mescla do master, 3); o mapa conferido passa a ser o do Apartamento de um fixer;
  - **o ensaio:** o terminal do pachinko usa o Apartamento de um fixer pelo nome (antes, a primeira do compêndio).
- **O que apareceu:** na primeira forma, a cópia do documento saía também da branch. O G4 deu 201 de 203: a wiki da
  branch pedia o arquivo (o 404 nos "erros de JS"), e o ponto de acesso contava 3 arquiteturas no lugar de 7.
- **Resultados:**
  - G1: 104 arquivos sem erro; G2: 0 erros; G3: 248/248 (235/235 antes da integração);
  - G4: 203/203 (451 s) na árvore sobre o 141. O ciclo 142 (Codex) entrou depois; integrado (o conflito foi só neste
    registro), com G1–G3 de novo. O G4 da árvore final (o fb9cd3e, sobre o 142): 210 de 210, depois do push (commit de
    registro);
  - **mutações:** as 4 caíram. No G3: o build sem conferir o documento (A1), o `precisaGerar` sem a fonte que falta (A2) e o build
    que ignora o documento que existe (A3). No G4: o compêndio sem as do documento (A4), pego no passo do compêndio e no do
    ponto de acesso.

### Ciclo 144 (2026-10-20): o C26, partes 1 a 3: o `/red`, a DV no HUD e na régua e a iniciativa crítica (sessão KouArt, com o Antigravity)

Commit anterior: `f87fd22d` (a reserva do C27). Renumerado: as sessões Junin (141 e 143) e Codex (142) publicaram antes.
O código e os testes saíram de um worker do Antigravity, revisado aqui (ver abaixo).

- **A referência:** o CORE 0.92.4:
  - o `/red`: `modules/hooks/chat/parse-red-command.js` e `CPRChat.HandleCPRCommand` (`modules/chat/cpr-chat.js`): o dado
    `XdY` (sem ele, `1d10`), o primeiro modificador, a descrição depois do `#`; o d6 vira um `CPRDamageRoll` (a ablação
    `aN`), e outro dado que não seja d6 nem d10 rola sem crítico;
  - a DV: `modules/hooks/token/add-dv-token-hud.js` e `HudInterface.SetDvTable` (`modules/hud/interface.js`: o botão no HUD
    do token, as tabelas menos a "DV Generic", a flag `cprDvTable`) e `modules/system/overrides.js` (o rótulo da régua com
    a DV da distância);
  - a iniciativa: `modules/system/settings.js` (`criticalInitiative`, padrão `true`).
- **O que muda:**
  - **`regras.mjs`:** `lerComandoRed` (o tipo pelo dado e a ablação), `opcoesDeTabelaDv`, `nomeCurtoDaTabelaDv`,
    `rotuloDvDaRegua` (pelo `dvPelaDistancia` e as `TABELAS_DV` que já existiam) e `formulaDaIniciativa`;
  - **`rolagens.mjs`:** o gancho `chatMessage` do `/red` e o `executarComandoRed` (o teste, o dano ou a soma); o `testar`
    aceita o dado (`dado`), e o cartão de teste mostra o dado que não é o `1d10`;
  - **`regua-dv.mjs` (novo):** o botão "Medir DV" no HUD do token (a janela das tabelas) e o rótulo da `TokenRuler` (e da
    `Ruler`) do Foundry 14 com a DV ao lado da unidade;
  - **`configuracoes.mjs` e `iniciativa.mjs`:** "Iniciativa explode no 10 e no 1?" (padrão: não), no combatente.
- **A revisão do trabalho do worker:** o `/red` dele fazia todo dado explodir no valor máximo (e mexia no `criticoDo`):
  agora segue o CORE (o d6 é dano, outro dado não tem crítico) e o `criticoDo` voltou; uma DV esperada no teste (a da SMG
  no autofogo a 10 m) era um palpite: agora é a da tabela (17); o passo do G4 fixava os dados com o `fixar` errado e
  dependia do token e da cena de passos anteriores: agora fixa pelo `window.__fila`, cria a cena da régua (2 m por 100 px),
  o ator e o token, e apaga no fim. Na primeira rodada, o HUD usava o `clear()`, obsoleto no Foundry 14 (o aviso de
  compatibilidade): virou `close()`; e a régua montada à mão sai com o custo "∞" (sem o movimento do token): o passo confere
  a DV ao lado da unidade.
- **Testes:**
  - **G3:** em `regras.test.mjs`, o `/red` (os tipos, os modificadores, a ablação, a descrição e o que não é `/red`), as
    tabelas do HUD, o rótulo da régua por distância e a fórmula da iniciativa;
  - **G4:** um passo novo: os quatro `/red` pelo `ui.chat.processMessage` (17 com o crítico; −8 com a falha; o dano 2d6 com
    os dois 6 e a ablação 2; o d20 sem crítico); a DV Pistol escolhida no HUD (sem a "DV Generic") e o rótulo a 4 m (DV 13) e
    a 10 m (DV 15); a iniciativa desligada (10 + 7), e ligada (10 + 4 + 7; 1 − 6 + 7).
- **Portões** (antes da integração dos ciclos 141 a 143): G1, 99 arquivos sem erro; G2, nenhum erro; G3, 230/230; G4,
  202/202. Depois da integração: G1, 104 arquivos sem erro; G2, nenhum
  erro; G3, 249/249; G4, 211/211, com a checagem dos dois navegadores sem avisos ou erros de JS.
- **Mutações** (antes da integração; o código delas não mudou com ela): as dez caíram, uma por vez, e os arquivos voltaram
  exatos (md5 conferido). No G3: os modificadores sem o sinal (M1), o d6 como teste (M2), a "DV Generic" no seletor (M3), a
  DV com 1 a mais (M4) e a iniciativa crítica que nunca liga (M5). No G4: o `/red` que não é interceptado (M6), o dano sem
  o crítico dos dois 6 (M7), a tabela que não grava no token (M8), a régua sem a DV (M9) e o combatente sem a configuração
  (M10).
- **Pergunta ao usuário:** a iniciativa crítica ligada ou desligada por padrão (o CORE liga).
- **Próximo:** o C21 (a terapia e a ciberpsicose), e o resto do C26 e o C27 com os workers do Codex.

### Ciclo 145 (2026-10-20): o C21, a terapia e a ciberpsicose (sessão KouArt)

Commit anterior: `08b46e6a` (o ciclo 144, o C26, partes 1 a 3). Com este, o C21 termina (a base com os slots das opções é
dos ciclos 82 a 84).

- **A referência:** a wiki ("Humanidade, terapia e drogas", `system-rules.js`): a Terapia (p. 229–230: a de dependência,
  DV15, livra de um vício e, por um ano, quem se tratou falha sozinho no teste contra o efeito secundário daquela droga; a
  de perda de Humanidade padrão, DV15, recupera 2d6; a extrema, DV17, 4d6; o teste é a Tecnologia Médica do Medtech, que
  não faz em si mesmo; uma semana; falhou, a semana e os materiais se perdem; o máximo da Humanidade cai 2 por peça) e a
  Ciberpsicose (p. 230–232: o estado pela EMP de agora, 3 ou mais nenhum, 2 limítrofe, 1 ciberpsicose limítrofe com 3
  traços, 0 ciberpsicose com 5 traços, e a Humanidade negativa, a extrema, em que o personagem passa para o mestre). O CORE
  0.92.4 só avisa ao instalar ("Cyberpsychosis has set in", o `loseHumanityValue`), e a Humanidade dele fica negativa.
- **O que muda:**
  - **`scripts/terapia.mjs` (novo):** as contas (a tabela das terapias, o teste que supera a DV, o ganho até a máxima, a
    dependência tratada por um ano, o estado mental e o "piorou") e, no Foundry, a terapia (quem trata: o token selecionado
    ou o personagem de quem clica, com a Tecnologia Médica, e não o paciente), o vício tirado e o aviso da ciberpsicose;
  - **`documentos.mjs`:** o estado mental de antes no `_preUpdate` e o aviso no `_onUpdate`, no cliente de quem mudou (um
    cartão para o mestre e os donos, quando o estado piora); a instalação do cyberware deixa a Humanidade ficar negativa;
  - **`humanidade.mjs`:** o "Aplicar" do cartão também deixa;
  - **`drogas.mjs`:** com a dependência tratada, o teste do efeito secundário falha sozinho (o cartão diz por quê);
  - **a aba Cyberware:** o estado mental (com os traços de Hare na dica) e o botão "Terapia".
- **Testes:**
  - **G3:** `terapia.test.mjs` (novo): a tabela, o empate que falha, o ganho até a máxima, a dependência de um ano e os
    estados pela EMP de agora;
  - **G4:** um passo novo: a Doutora (Medtech, Tecnologia Médica 4) trata o Paciente pelo botão (padrão: 18 contra DV15,
    2d6 = 7, de 15 para 22; extrema: 12 contra DV17, nada muda); a Humanidade a 3 avisa a ciberpsicose; o Kerenzikov pela
    média a leva a −11 (a extrema, com o aviso e o estado na aba); a dependência tira o vício do Boost, e o teste seguinte
    falha sozinho, sem rolar; o Medtech em si mesmo, só o aviso.
- **Portões:** G1, 106 arquivos sem erro; G2, nenhum erro; G3, 254/254; G4 completo, 212/212, com a checagem dos dois
  navegadores sem avisos ou erros de JS. Na primeira rodada, 211/212: um aviso de "dinheiro insuficiente" da entrega dos
  pedidos da wiki, do passo dos pedidos da loja (ver a lição no QUALITY_GATES); a segunda rodada passou inteira.
- **Mutações:** as onze caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: o empate que passa (M1),
  o ganho acima da máxima (M2), a Humanidade negativa sem a extrema (M3), a dependência sem o prazo (M4) e a extrema com
  2d6 (M5). No G4: o Medtech em si mesmo (M6), a dependência que não tira o vício (M7), o teste que ignora a terapia (M8), o
  aviso que não sai (M9), a instalação que para no 0 (M10) e o ganho que não grava (M11).
- **Próximo:** o resto do C26 (os estados e as chaves do Fluxo) e o C27.

### Ciclo 146 (2026-10-21): o C27, parte 2: a campanha da wiki de cada mundo e o crossover (sessão KouArt, com o Codex)

Commit anterior: `35bd9eab` (o ciclo 145, o C21). O código e os testes saíram de um worker do Codex (pelo Alethe), revisado
aqui.

- **A referência:** o cpr-2077 da mesa (`foundry-2077/scripts/wiki.mjs`): a configuração `wikiCampanha`, o
  `tableCampaign` (a escolhida, a do Mundo do Foundry cadastrado na wiki, a única; o cache) e o `ofTable` (a lista e os
  pedidos da campanha), o `sendMovedAway` e o `importTransferred` (o crossover); a API da wiki (`api-personagens.js` e
  `api-campanhas.js`, só lidas).
- **O que muda:**
  - **`scripts/wiki-campanha.mjs` (novo):** as contas: a resolução da campanha, o filtro, o vínculo do Foundry 14, o
    "mudou de campanha" e a preparação do ator que chega (o envelope `character` da rota `/ator` com o ator nativo dentro,
    as conferências de origem e destino, o dono novo, os IDs dos itens preservados);
  - **`wiki.mjs`:** a configuração "Campanha da wiki"; o filtro na importação, na da mesa, na entrega dos pedidos e na
    ficha que volta (com a `campanha`); o ator que foi para outra campanha manda a ficha completa uma vez e fica parado (a
    flag `saiu`: sem mandar a ficha nem receber pedidos); na campanha nova, "Importar" traz o ator inteiro e só apaga a
    transferência depois do vínculo novo;
  - **a janela "Personagens da wiki":** o nome da campanha, a ajuda quando o mundo não está ligado e a situação do
    personagem que veio de outra campanha.
- **A revisão:** o passo do G4 do worker esperava que o mestre não ficasse dono do ator que chega (o Foundry dá dono a
  quem cria: agora o passo confere que nenhum jogador do mundo antigo ficou dono) e um texto da nota que não é o do código.
- **Atenção ao instalar no servidor:** com mais de uma campanha na wiki e nenhuma ligada a este mundo, o sistema não manda
  a ficha para a wiki nem entrega pedidos (como o cpr-2077): escolha a "Campanha da wiki" nas configurações do mundo do
  Foundry 14, ou cadastre o Mundo do Foundry na página da campanha, antes de jogar.
- **Testes:**
  - **G3:** `wiki-campanha.test.mjs` (novo): a resolução, o filtro, o "mudou de campanha" e a preparação do ator;
  - **G4:** um passo novo: a campanha explícita e pelo mundo; o personagem de outra campanha recusado; a lista e os
    pedidos filtrados; a ambiguidade (a ajuda, os pedidos bloqueados, a campanha que não existe); a saída (uma vez, o ator
    parado, a ficha na wiki); a falha do vínculo (sem cópia, a transferência fica); a entrada (o estado inteiro, os IDs,
    o dono novo); sem a ficha antiga, a criação da wiki; a ficha do CORE recusada.
- **Portões:** G1, 108 arquivos sem erro; G2, nenhum erro; G3, 266/266; G4 completo, 213/213, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as dez caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: a campanha sem o mundo
  (M1), todo personagem desta campanha (M2), ninguém muda de campanha (M3), o ator que chega com a marca de saída (M4) e
  com os donos antigos (M5). No G4: os pedidos sem o filtro (M6), o ator que não fica parado (M7), a ficha do ator parado
  que continua indo (M8), a cópia que fica na falha do vínculo (M9) e o personagem de outra campanha que entra (M10).
- **Próximo:** o C27, parte 1 (o "Atualizar da wiki", o retrato e os avisos), e o C26, partes 4 e 5.

### Ciclo 147 (2026-10-21): o C27, parte 1: o "Atualizar da wiki", o retrato e os avisos de envio (sessão KouArt, com o Codex)

Commit anterior: `df7088dc` (o ciclo 146, o C27, parte 2). O código e os testes saíram de um worker do Codex (pelo Alethe),
revisado e integrado aqui. Com este, o C27 termina na parte do Foundry 14 (o histórico do ledger pede mudar o cpr-2077).

- **A referência:** o cpr-2077 da mesa (`foundry-2077/scripts/wiki.mjs`): o `atualizarDaWiki` (com o `applySkills`, o
  `planRoles` e o `pendingAssembly`), o retrato (`portraitOf`, `copyPortrait` e `applyPortrait`) e os avisos (`wikiAvisos`,
  `sendKey` e `avisosDaWiki`); a API da wiki (`api-personagens.js`: o `summary`, o `foundryState` e as rotas `foundry`,
  `enviar` e `retrato`, só lidas).
- **O que muda:**
  - **`scripts/wiki-atualizacao.mjs` (novo):** o plano da revisão por grupos (os STATs pela fonte do ator, as perícias, as
    Roles, os itens novos, o Lifepath, a moradia), sem os recursos de jogo (HP, Humanidade, dinheiro, Sorte) e sem repor
    o que foi gasto (o histórico dos UIDs entregues);
  - **`scripts/wiki-retrato.mjs` (novo):** a imagem da wiki copiada para a pasta do mundo, na ficha, no protótipo e nos
    tokens ligados; o link HTTPS de imagem como reserva; tirar o retrato na wiki conserva a imagem da mesa;
  - **`scripts/wiki-avisos.mjs` (novo):** o aviso do envio e dos pedidos, uma vez por envio em cada mundo e navegador, pelo
    vínculo do Foundry 14; a consulta manual;
  - **`wiki.mjs`:** o `atualizarDaWiki` (a revisão, os grupos marcados, a guarda contra a ficha que mudou no meio); o
    retrato e o histórico dos entregues na importação e na da mesa;
  - **a janela "Personagens da wiki" e o topo da ficha:** o botão "Atualizar da wiki", o "Avisos de envio" e a situação do
    personagem enviado.
- **A integração com o ciclo 146:** o cherry-pick juntou a campanha (no corpo do vínculo, na lista e no retorno da janela)
  com o retrato e os entregues. O "Atualizar da wiki" ganhou as guardas da campanha: o ator parado (o que foi para outra
  campanha) e o personagem de outra campanha recusam a atualização; e o vínculo que ela grava leva a campanha do mundo,
  como a importação (sem ela, a wiki gravaria o vínculo na campanha nova e apagaria o estado do crossover).
- **A revisão:** o passo do G4 do retrato chamava o `fetch` guardado sem a `window` (o Edge recusa: "Illegal invocation");
  e o passo antigo da janela "Personagens da wiki" passou a esperar os dois pedidos que ele cria, porque os avisos novos
  podem ter aberto a janela antes, com a lista antiga (o passo registra isso no `jaAberta`; nesta rodada, aberta).
- **Testes:**
  - **G3:** `wiki-atualizacao.test.mjs`, `wiki-avisos.test.mjs` e `wiki-retrato.test.mjs` (novos): o plano de cada
    grupo, as Roles manuais, os itens gastos, o estado do envio pelo vínculo do 14, os vistos e o retrato (a fonte, a
    troca, o cookie só na wiki, os tipos de imagem, o link direto);
  - **G4:** três passos novos: o "Atualizar da wiki" (cancelar, aplicar só os STATs, concluir; os recursos e o item gasto
    ficam); o retrato (a cópia, a troca no token ligado, a retirada, a reserva, o HTML recusado); os avisos (desligados,
    manual, uma vez por envio, o vínculo do 12); e o passo do crossover do ciclo 146 confere a recusa do ator parado, sem
    gravar o vínculo.
- **Portões:** G1, 114 arquivos sem erro; G2, nenhum erro; G3, 287/287; G4 completo, 216/216, com a checagem dos dois
  navegadores sem avisos ou erros de JS. A primeira rodada (de fundo) o Claude Code parou por falta de memória; a segunda
  deu 214/216 (os dois passos da revisão, acima); a terceira passou inteira.
- **Mutações:** as doze caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: os STATs preparados no
  lugar da fonte (M1), a Role manual tratada como importada (M2), sem o histórico dos entregues (M3), o aviso pelo vínculo
  do 12 (M4), os vistos que não contam (M5) e o retrato tirado na wiki como troca (M6). No G4: a consulta manual que
  respeita os vistos (M7), os grupos desmarcados aplicados (M8), o retrato fora do token ligado (M9), sem o link direto
  (M10), o ator parado que atualiza (M11) e a importação sem o retrato (M12).
- **Próximo:** o C26, partes 4 e 5 (os estados e as chaves do Fluxo, já feitas pelo Codex numa worktree).

### Ciclo 148 (2026-10-21): o C26, partes 4 e 5: os estados e as chaves do Fluxo (sessão KouArt, com o Codex)

Commit anterior: `60874315` (o ciclo 147, o C27, parte 1). O código e os testes saíram de um worker do Codex (pelo
Alethe), revisado e integrado aqui. Com este, o C26 termina (as partes 1 a 3 são do ciclo 144).

- **A referência:** os estados: o CORE 0.92.4 não registra `statusEffects` (a mesa usava os do Foundry); a wiki
  (`system-rules.js`, "Ações" e "Movimento", p. 168–169, e "Agarrar e arremessar", p. 177): Caído não usa o Movimento até
  gastar a Ação Levantar-se, e o agarrado não usa o Movimento. As chaves: o Fluxo de Combate da mesa
  (`foundry-fluxo-de-combate/scripts/fluxo-de-combate.mjs`, o registro no `init`; `captura.mjs`, `lerAtaque`; `mestre.mjs`,
  `pacoteDaPergunta`, `rolarDanoDoAtaque`, `individual` e `danoNaArea`; `turnos.mjs`, `deathSave`; `defesa.mjs`).
- **O que muda:**
  - **`scripts/regras-estados.mjs` (novo):** a conta da Ação de Movimento (Caído e agarrado com 0 m, sem mudar o MOVE;
    levantar custa 1 Ação);
  - **`scripts/estados.mjs` (novo):** o `preMoveToken` que não deixa o jogador mover o token caído (um recado; o mestre
    move sempre) e o "Levantar-se", que tira o Caído e anuncia a Ação no chat (`game.system.api.estados`);
  - **as fichas:** a Ação de Movimento nos vitais e o botão "Levantar-se (1 Ação)" no painel Defesa (no capanga, nos
    vitais);
  - **`configuracoes.mjs`:** "Resolver os ataques" (`ativo`), "O jogador rola os próprios dados" (`rolagemManual`) e
    "Dano" (`dano`: automático ou manual), com os nomes, as dicas e os padrões do Fluxo da mesa;
  - **`combate.mjs`:** desligada a resolução, o ataque só rola (e gasta a bala), sem pedir alvo, mestre, defesa nem dano;
    sem a janela dos dados, a reação continua com o dono, sem a janela pessoal, e o dano fica com o mestre (o
    `jogadorRolaDano` continua como o segundo filtro); no dano manual, só a defesa, e o dano fica com o botão da ficha.
- **A revisão:** as dicas são as da mesa (inclusive o "o módulo" da dica do Dano); a dica de "O jogador rola os próprios
  dados" não descreve o que o código da mesa fazia, e o sistema segue o código (a dúvida no MIGRATION_STATUS).
- **Testes:**
  - **G3:** `estados.test.mjs` (novo): o Movimento por estado, o custo de levantar, a composição com o agarrão, a recusa
    sem permissão e o gancho que trava o jogador e libera o mestre; `configuracoes-fluxo.test.mjs` (novo): o registro das
    três chaves igual ao do Fluxo da mesa (lido do arquivo dele) e as chaves que já existiam;
  - **G4:** dois passos novos: os estados (o personagem e o capanga caídos: 0 m, o MOVE e a DEX iguais, o botão, o cartão
    de 1 Ação; agarrado sem Movimento e o −2 uma vez; o mestre move o caído; o jogador dono não move, recebe o recado e
    move depois de levantar) e as chaves (desligada, o ataque sem alvo nem mestre rola e gasta uma bala; o dano manual no
    tiro e no cartucho; a esquiva, a Concentração e o Death Save sem a janela; os dois filtros do dano).
- **Portões:** G1, 118 arquivos sem erro; G2, nenhum erro; G3, 296/296; G4 completo, 218/218, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as onze caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: ninguém caído (M1),
  levantar por 2 Ações (M2), o gancho que não trava (M3) e o dano manual como padrão (M4). No G4: o "Levantar-se" que não
  tira o Caído (M5), a resolução sempre ligada (M6), o dano manual trocado pelo automático no tiro (M7) e na área (M8; as
  duas derrubam também o resto do combate), o jogador que rola o dano sem a chave (M9) e a janela sem a chave no Death
  Save (M10) e na esquiva e na Concentração (M11).
- **Próximo:** o C28 (a sistema-v14 no master: decisão do usuário) e a P4 (a acessibilidade das fichas, com o Codex).

### Ciclo 149 (2026-10-21): a P4, o `combate.mjs` dividido (sessão KouArt, com o Codex)

Commit anterior: `65f6c82f` (o ciclo 148, o C26, partes 4 e 5). O código e o teste saíram de um worker do Codex (pelo
Alethe), revisado e integrado aqui. Uma refatoração pura: nenhum comportamento, texto, flag, configuração ou mensagem de
socket muda.

- **O que muda:** o `scripts/combate.mjs` (de 1.275 para 262 linhas) fica com o `atacar`, a carga e as ações de 2077, e
  é a porta: reexporta os mesmos 24 nomes de antes, e os outros módulos continuam importando dele. O resto vai para
  `scripts/combate/`:
  - **`apoio.mjs`:** o canal, os estados, a distância, o token na cena, o dono, as conferências da arma veicular e dos
    destinos;
  - **`socket.mjs`:** os pedidos pelo socket (`pedir`, `desistir`, os tratadores, as janelas registradas), a fila do
    mestre (`naFila`), o `registrarCombate`, a defesa (`perguntarDefesa`, `rolarDefesa`) e a segunda chance;
  - **`modos.mjs`:** o `resolver` e a resolução de cada modo (o individual, a área, o autofogo, o supressivo, os dois
    alvos, a munição do ataque, o `ferir`);
  - **`cartao.mjs`:** o cartão do resultado e os botões dele (os destinatários, o Desfazer, o aplicar dano, a lesão).
  Os ciclos de import (`modos` ↔ `cartao` ↔ `socket`) só se usam dentro de funções; o estado (os `Map`, a fila) fica num
  módulo só.
- **Notado e não mudado** (o worker só relatou; sem reprodução): o `linha.pegou` é gravado e ninguém lê; o "Rolar a lesão"
  do cartão marca o alvo mesmo quando a lesão não foi criada; o Desfazer confere o `desfeito` no começo e grava no fim.
  Os dois últimos ficam no P1 do ROADMAP, para conferir.
- **Testes:**
  - **G3:** `combate-modulos.test.mjs` (novo): a porta exporta exatamente os 24 nomes de antes, os módulos novos existem
    e nenhum usa o `game`, o `canvas`, o `ui` ou o `foundry` no topo;
  - **G4:** nenhum passo novo: o cenário inteiro, sem mudança, é o teste de referência.
- **Portões:** G1, 123 arquivos sem erro; G2, nenhum erro; G3, 302/302; G4 completo, 218/218, com a checagem dos dois
  navegadores sem avisos ou erros de JS (a primeira rodada parou com a sessão; a segunda passou inteira).
- **Mutações:** as nove caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: a porta sem o
  `suprimir` (M1). No G4, uma ou mais em cada módulo novo: a fila do mestre que não espera (M2) e a janela do jogador que
  não fecha (M3), no `socket.mjs`; o autofogo com um a mais (M4), a munição sem dano que não chega à área (M5) e o
  supressivo trocado (M6), no `modos.mjs`; o Desfazer sem o HP (M7) e a lesão do cartão que não marca (M8), no
  `cartao.mjs`; a distância dobrada (M9), no `apoio.mjs`.
- **Próximo:** a acessibilidade das fichas (a P4, com o Codex).

### Ciclo 150 (2026-10-21): a P4, a acessibilidade das fichas (sessão KouArt, com o Codex)

Commit anterior: `11d46c42` (o ciclo 149, o `combate.mjs` dividido). O código e os testes saíram de um worker do Codex
(pelo Alethe), revisado e integrado aqui (o worker partiu do ciclo 146; o cherry-pick juntou o Facedown e o Proteger-se
com o "Levantar-se" do ciclo 148).

- **O que muda:**
  - **`scripts/acessibilidade.mjs` (novo):** um ouvinte de teclado por ficha: Enter e espaço num controle com `role` e
    `tabindex="0"` disparam o mesmo clique do `data-action` (com o Ctrl, o Shift e os outros modificadores), sem
    capturar os botões, os campos e a edição, e sem repetir ao segurar a tecla; e o nome das notas chega ao botão de
    editar e ao campo do editor de texto;
  - **as fichas do personagem, do capanga e do item:** os controles que só respondiam ao clique (os nomes que rolam, as
    estrelas dos favoritos, os retratos, os atalhos de edição) entram no Tab; os ícones ganham nome para o leitor de
    tela; os favoritos, a arma equipada e o cyberware instalado dizem o estado (`aria-pressed`); as abas próprias do item
    dizem a selecionada; os campos sem rótulo visível têm nome;
  - **`tema.css`:** o contorno ciano do foco de teclado nessas fichas e nas janelas de rolagem e de defesa (sem mudar
    nada para o mouse).
- **Fica de fora:** as outras janelas (a NET, a wiki, o extrato, o contêiner, a arquitetura) ficam como estavam; a
  janela de rolagem e a de defesa já usavam controles nativos com texto; o tema escuro e o contraste não mudam.
- **Testes:**
  - **G3:** `acessibilidade.test.mjs` (novo): os templates das fichas sem nenhum `data-action` fora do teclado e sem
    botão de ícone sem nome; o ouvinte (Enter e espaço com o mesmo alvo e os modificadores, nada nos controles nativos e
    na edição, sem repetir, sem duplicar ao redesenhar); o nome das notas no editor; os estados expostos;
  - **G4:** um passo novo: na ficha, a estrela da Percepção por Enter, espaço e clique (a flag e o `aria-pressed`), com o
    contorno do foco (um Tab de verdade pelo protocolo do Edge: o evento sintético não liga o `:focus-visible`); a
    Percepção abre a mesma janela de rolagem pelos três caminhos; os nomes do retrato, da Sorte e do HP; na ficha do
    item, as abas por teclado e clique, com a seleção, e o nome do editor da descrição.
- **Portões:** G1, 125 arquivos sem erro; G2, nenhum erro; G3, 328/328; G4 completo, 219/219, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as nove caíram, uma por vez, e os arquivos voltaram exatos (md5 conferido). No G3: o Facedown fora do
  teclado (M1), o ✕ do capanga sem nome (M2), a barra de espaço que não aciona (M3), a tecla segurada que repete (M4), o
  Enter que segue o padrão do navegador (M5) e o editor sem o nome no botão (M9). No G4: o contorno mais fino (M6), as
  abas do item sem a seleção (M7) e a ficha do personagem sem o ouvinte (M8).
- **Próximo:** o C28 (a sistema-v14 no master: decisão do usuário).

### Ciclo 151 (2026-10-22): o P1, o clique duplo nos botões do cartão e a lesão recusada (sessão KouArt)

Commit anterior: `15baf260` (a Fase 7 no ROADMAP). As duas suspeitas que o worker do ciclo 149 deixou no P1, confirmadas
lendo o código antes de mudar.

- **O que estava errado:**
  - o `desfazer` (`scripts/combate/cartao.mjs`) confere a marca `desfeito` no começo e só a grava no fim, e o
    `desfazerDano` soma o HP perdido ao HP de agora. O segundo clique que chega depois de o HP voltar e antes da marca
    (o clique duplo de verdade) devolvia o HP outra vez: no passo do G4, com a mutação, o Alvo foi a 60 de HP com o
    máximo 45;
  - o `rolarLesaoDoCartao` gravava em `lesoesRoladas` todos os alvos que tentou, também o que voltou `null` (a ficha
    recusou a criação, ou o sorteio pediu "Role novamente"): aquele cartão não deixava tentar de novo, e o aviso dizia
    para rolar de novo.
- **O que muda:**
  - **um clique por vez:** no `ligarBotoes`, cada botão de cada cartão (a mensagem e a ação) fica travado neste cliente
    enquanto a ação corre, e solta no `finally`. Vale para todos os botões do mestre (o Desfazer, o aplicar dano, a lesão,
    a escolha do Monowire, a Humanidade, o EMP, o fogo). O segundo clique no meio do primeiro não faz nada e não avisa; um
    clique depois de terminar segue a regra de sempre (o "já foi desfeito");
  - **a lesão recusada:** só o alvo cuja lesão saiu fica marcado no cartão.
- **Fica de fora:** dois mestres clicando no mesmo cartão ao mesmo tempo (a trava é do cliente); as chamadas pela API
  (`game.system.api.combate.desfazer`) não passam pela trava, como antes.
- **Testes:**
  - **G3:** nenhum novo (o que mudou é o clique no chat);
  - **G4:** dois passos mudaram: o do Desfazer dá o segundo clique no meio do primeiro (quando ele vai tirar a Perna
    quebrada, depois de o HP voltar) e confere o HP 45, o SP, o MOVE, a lesão e nenhum aviso; o do dano rolado à parte
    recusa a primeira lesão (a ficha não aceita), confere o aviso, nenhum alvo marcado e nenhuma lesão, e o botão rola de
    novo e acrescenta a Perna quebrada.
- **Portões:** G1, 85 arquivos do sistema sem erro; G2, nenhum erro; G3, 328/328; G4 completo, 219/219, com a checagem
  dos dois navegadores sem avisos ou erros de JS.
- **Mutações:** as três caíram, uma por vez, e os arquivos voltaram exatos: sem a trava (M1; na primeira versão do passo,
  os dois cliques no mesmo instante, ela sobreviveu: os dois liam o HP antigo e gravavam o mesmo 45; o passo passou a
  clicar no meio do primeiro, e ela caiu com o HP 60), a trava que nunca solta (M2) e a lesão recusada que marca o alvo
  (M3).
- **Próximo:** os C31 a C33 da Fase 7, com os workers.

### Ciclo 152 (2026-10-22): o C33, a mesa e o chat (sessão KouArt, com um worker)

Commit anterior: `3f0be39e` (a reserva do C39). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `15baf260`, revisados e integrados aqui pelo patch.

- **O que muda:**
  - **`scripts/mesa.mjs` (novo),** ligado no `init`: `modoDoCartao` (o modo pedido pelo fluxo vale; sem ele, o do
    seletor do chat; sem nenhum, público) e `modoDaMesa` (lê o `core.messageMode`); o "Mostrar aos jogadores", um
    `ContextMenu` fixo no `img.retrato` das fichas (pelos ganchos `render` de cada classe de ficha, que valem também
    para as filhas), que abre o `ImagePopout` com o nome e chama o `shareImage`, só para o mestre e o dono;
  - **as rolagens avulsas no modo do chat:** o atributo, o Facedown, a perícia, a Role e o Backup, o Death Save da
    ficha (`documentos.mjs`), o dano rolado à parte e a Humanidade rolada à parte do item (`humanidade.mjs`) e os dois
    ramos do `/red` (`rolagens.mjs`). O `testar` e o `rolarDano` compartilhados não mudam (sem modo, públicos);
  - **os fluxos que continuam públicos** passam o `modo: 'public'` explícito (antes, públicos por omissão): as Artes
    Marciais, a resistência à munição, o efeito secundário da droga, a terapia, o tratamento e o Death Save do turno (o
    do mestre e o do jogador).
- **Fica de fora:** ver as dúvidas (as etiquetas do modo, a NET, o ataque e a defesa).
- **Testes:**
  - **G3:** `mesa.test.mjs` (novo, 6 testes): o `modoDoCartao` em cada modo, com o trecho do CORE lido do arquivo; cada
    rolagem avulsa com o `modoDaMesa`; a varredura de `scripts/`, em que toda chamada das rolagens avulsas fora das
    fichas, do Painel e das macros passa um `modo:` (a contagem por arquivo), e o combate e a NET não usam o
    `modoDaMesa`; a regra do mestre e do dono; o gancho do menu com globais de mentira; o `sistema.mjs` liga a mesa;
  - **G4:** três passos novos, depois do passo das conveniências do C26: o mestre e o jogador escolhem o modo pelo botão
    do chat e rolam a Percepção nos quatro modos (o `whisper`, o `blind`, o `isContentVisible` e o total "?" de quem
    não recebe, nos dois navegadores), e o jogador, às cegas, rola o atributo, o Facedown, os dois `/red`, o dano à
    parte, o Death Save e a Humanidade; "Mostrar aos jogadores" em cada ficha do mestre e no jogador (a imagem do Alvo
    abre no navegador dele; a ficha que ele só observa não tem a opção); o token solto de um capanga apagado fecha a
    ficha dele e a de um item dele nos dois navegadores.
- **Antes de integrar:** a worktree desta sessão tinha o sparse checkout sem a pasta `cyberpunk-red-core/` (rastreada na
  `sistema-v14`), e o G3 novo, que lê o CORE, falhou aqui; com a pasta de volta no checkout, passou.
- **Portões:** G1, 181 arquivos sem erro (o sistema e os testes); G2, nenhum erro; G3, 334/334; G4 completo, 222/222,
  com a checagem dos dois navegadores sem avisos ou erros de JS.
- **Mutações:** as nove do worker caíram no G3, uma por vez (o modo do chat por cima do pedido, M1; o seletor ignorado,
  M2; o Death Save e o `/red` sem o modo, M3 e M4; os fluxos sem o `public` explícito, M5 e M9; só o mestre mostra a
  imagem, M6; a imagem que não vai para a mesa, M7; o menu sem o `fixed`, M8). No G4, a M2, a M3 e a M7 caíram também
  (o passo do modo e o do "Mostrar aos jogadores").
- **Próximo:** o C31 (HP e Humanidade dentro do máximo), o C32 (a ficha) e o C39 (gastar IP, com o Codex).

### Ciclo 153 (2026-10-22): o C31, o HP e a Humanidade dentro do máximo (sessão KouArt, com um worker)

Commit anterior: `28d99769` (o ciclo 152, o C33). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `15baf260`, revisados e integrados aqui pelo patch, sem conflito com o C33.

- **O que muda:**
  - **`regras.hpDepoisDoMaximo`:** com o HP cheio (o atual igual ao máximo de antes), vai para o máximo novo; senão,
    fica, limitado ao máximo;
  - **na memória** (`dados.mjs`, o `prepareDerivedData`): o HP e a Humanidade atuais nunca acima do máximo, antes do
    `empAtual` e do ferimento; vale para o que se lê (a ficha, a barra do token, o Painel, o ferimento);
  - **no que se grava** (`documentos.mjs`, o `_preUpdate` do personagem e do capanga): o HP e a Humanidade param no
    máximo de depois da mudança, e o BODY ou a WILL que mudam levam junto o HP cheio. O máximo de depois sai de uma cópia
    temporária do ator (`this.clone(..., { parent: null })`), que aplica os efeitos como o original;
  - **nos itens e efeitos** (os ganchos `_pre/_onUpdateDescendantDocuments` e `_pre/_onDeleteDescendantDocuments`): o
    item que muda o máximo (o Grafted Muscle instalado ou tirado, o efeito ligado) leva o HP cheio, e o que passa do
    máximo novo para nele, gravado só no cliente de quem mudou;
  - **a instalação do cyberware:** a perda sai da Humanidade de antes da peça (`Math.min(_source, máxima de antes) −
    perda`), como no CORE; com o limite na memória, descontar da atual tiraria os 2 da máxima duas vezes.
- **Fica de fora:** ver as dúvidas (criar um item, a Humanidade da peça criada já instalada, a segunda gravação).
- **Testes:**
  - **G3:** `hp-maximo.test.mjs` (novo, 4 casos): cheio sobe e desce; ferido fica e só é limitado; o gravado acima do
    máximo não conta como cheio; o mesmo máximo não muda nada;
  - **G4:** um passo novo, depois do "mortalmente ferido: −6 MOVE": o criado com 99/99 mostra 40 e 50; o Grafted Muscle
    instalado com o HP cheio leva a 45 (a Humanidade 36/48) e, tirado, a 40; o BODY 8 cheio leva junto, o ferido fica, o
    42 com o BODY 4 para nos 35; 99 pelo `update` e pela ficha param nos 35; o Desfazer depois da cura à mão fica em 35;
    a Humanidade pela EMP (desce, a leva; sobe, não; −5 fica, com o cartão da extrema); o capanga de token solto;
  - **seis atores de teste antigos** nasciam com o HP acima do máximo (o C18 Camadas e Modelo, o Saco de Pancadas, o C15
    Ocupante, o alvo das munições e o da área do míssil): o BODY e a WILL subiram para o máximo ser o HP que eles usam;
    nenhum número esperado mudou.
- **Portões:** G1, 182 arquivos sem erro; G2, nenhum erro; G3, 338/338; G4 completo, 223/223, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos: no G3, o gravado acima que conta como cheio
  (M1) e o cheio que não acompanha (M2); no G4, sem o limite na memória (M3: também caem o ataque do Black ICE e as
  chaves do Fluxo), o HP gravado sem o limite (M4), os ganchos dos itens sem o estado de antes (M5), a instalação que
  desconta da Humanidade já limitada (M6: caem também o catálogo, o desinstalar e o capanga), o máximo de depois sem a
  cópia (M7) e a Humanidade gravada sem o limite (M8).
- **Próximo:** o C32 (a ficha) e o C39 (gastar IP, com o Codex).

### Ciclo 154 (2026-10-22): o C32, a ficha do personagem (sessão KouArt, com um worker)

Commit anterior: `ea479907` (o ciclo 153, o C31). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `15baf260`, em duas rodadas: na revisão, o "só tirar" passou a desinstalar o que estava
dentro e a arma passou a descarregar antes de sair, como o `deleteEmbeddedDocuments` do CORE. Integrado aqui pelo patch,
sem conflito com os ciclos 152 e 153.

- **Antes de mudar, o que acontecia ao apagar pela ficha:** só o item saía. O acessório ficava com o `instaladoEm`
  apontando para um id que não existe (a ficha o mostrava "não instalado"); as opções de uma fundação ficavam instaladas,
  "SEM FUNDAÇÃO", tirando da Humanidade máxima; os programas de um deck ficavam "fora do deck", e um Black ICE ativo
  deixava o token na cena; as armas de um veículo iam para "Veículo ausente"; as balas do pente se perdiam.
- **O que muda:**
  - **`regras-inventario.mjs`:** `nomeDoItemNovo` ("Arma nova", "Equipamento novo"), `passaNaBusca` (sem maiúsculas,
    acentos e os espaços das pontas), `descarga` (o pente a 0, as balas no estoque), `descarregaAoApagar` (a arma com bala
    no pente e a munição na ficha, menos no "apagar junto") e `apagarComInstalados` (o que se apaga e o que fica solto; a
    arma do cyberware ou do acessório fica fora, e o gancho a tira com as balas de volta);
  - **`ItemCPR.descarregar`** (`documentos.mjs`): o pente a 0, as balas na munição carregada e a arma sem munição, como a
    vendida para a loja; sem a munição na ficha, avisa e não mexe;
  - **a ficha** (`ficha-personagem.mjs` e os templates): o "+" em cada lista (`criarItem`), a busca no cabeçalho (o texto
    na janela, reaplicado a cada desenho; o começo e o fim da busca redesenham, para o painel geral mostrar todas as
    perícias), trocar a munição (o mesmo do Painel Tático) e descarregar na tabela de armas, e o apagar: sem nada
    instalado, a confirmação de sempre; com algo, "Só tirar" (o padrão), "Apagar junto" ou "Cancelar", com a montagem
    relida depois da pergunta. "Só tirar" desinstala o cyberware pelo `desinstalarCyberware` (sem devolver a Humanidade
    atual, o ciclo 31), desativa o programa e solta o resto; a arma descarrega antes, na confirmação simples e no "Só tirar";
  - **o capanga:** a busca, as armas, as lesões e o apagar iguais; o estilo do "+" e da busca no `tema.css`.
- **Fica de fora:** ver as dúvidas.
- **Testes:**
  - **G3:** `inventario.test.mjs` (5 testes novos): os nomes de todos os tipos (lendo o `en.json` do CORE e o `pt-BR.json`),
    a busca, a descarga (lendo o unload do CORE), o descarregar ao apagar (lendo o `unloadAmmo` e o `uninstallItems` do
    `cpr-actor.js`) e o apagar (a arma com acessório e baioneta, o deck, a fundação, o veículo, um laço nos dados);
  - **G4:** dois passos novos, depois do dos acessórios do C11: o "+" (11 na ficha; o clique em três cria o item com o
    nome certo, a ficha aberta e a linha na lista) e a busca ("pist" deixa só a Heavy Pistol nas duas abas, com as perícias
    todas à vista; "EVASAO" acha a Evasão, sem nenhum `updateActor`; continua depois de mudar o apelido; vazia, volta
    tudo); a troca e a descarga da munição (a sobra e as balas no estoque; sem a munição na ficha, o aviso); o apagar ("Só
    tirar" devolve as balas e solta o Smartgun Link; "Apagar junto" leva o rifle, a baioneta e a arma dela, sem o estoque;
    o deck solta o programa desativado; a fundação desinstala a opção, com a Humanidade máxima de volta; a arma carregada
    pela confirmação simples devolve as balas).
- **Portões:** G1, 182 arquivos sem erro; G2, nenhum erro; G3, 343/343; G4 completo, 225/225, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as doze caíram, uma por vez, e os arquivos voltaram exatos: no G3, a busca sem tirar os acentos (M1), a
  descarga sem as balas (M2), a arma do acessório na lista do que se solta (M3) e o "apagar junto" que descarrega (M10);
  no G4, o "só tirar" que apaga junto (M4), o programa solto ativo (M5), a arma descarregada com a munição carregada (M6),
  o item novo só com o nome do tipo (M7), a busca sem todas as perícias (M8), o cyberware que não se desinstala (M9) e as
  duas descargas ao apagar (M11 e M12).
- **Próximo:** o C39 (gastar IP, com o Codex).

### Ciclo 155 (2026-10-22): o C39, gastar IP (sessão KouArt, com o Codex)

Commit anterior: `e1343552` (o ciclo 154, o C32). O código e os testes saíram do Codex (`codex exec`, numa worktree
própria a partir do `3f0be39e`), revisados e integrados aqui pelo patch. Na revisão, o "+IP" da perícia trocou a classe
`tirar` (a do ✕ que tira a perícia: vermelha no hover, e os passos antigos do G4 acham o ✕ por `.tirar[data-pericia]`)
pela `subir-ip`, com o estilo próprio no `tema.css`.

- **O que muda:**
  - **`scripts/regras-avanco.mjs` (novo):** `avancoComIp`, a conta pura: o custo pelo nível novo (20 × na perícia, 40 ×
    na difícil, 60 × no Rank), um nível por vez, o teto 10 e o saldo;
  - **`scripts/avanco.mjs` (novo):** `avancarComIp(ator, { pericia | role })`, um por ator neste cliente: a confirmação
    com o custo e o saldo, a releitura depois dela (a perícia, a Role ou o saldo que mudou recusa), o nível, o débito e a
    linha do extrato numa gravação só (como o `mudarComExtrato`), o cartão no chat; uma gravação que um gancho cortou
    volta inteira (`compensarAvanco`, sem apagar o que mudou depois). A dificuldade vem de `system.pericia(id).dificil`
    (o catálogo e as famílias), sem lista nova. O capanga é recusado (não tem extrato de IP);
  - **a ficha:** o "+IP" de cada perícia (abaixo do nível 10) e o "SUBIR RANK COM IP" das duas Roles, para quem edita a
    ficha; a ação `avancarComIp`; a API em `game.system.api.avanco`.
- **Fica de fora:** ver as dúvidas. A tabela de ganho de IP por sessão (`system-rules.js:248` e `:713`) continua com o
  mestre, pelo extrato.
- **Testes:**
  - **G3:** `avanco.test.mjs` (7 testes: os 30 custos contra a tabela da própria wiki, os exemplos, a perícia nova, o
    saldo exato e o que falta, os saltos, o teto, a dificuldade do catálogo e das famílias) e `avanco-aplicacao.test.mjs`
    (com o Foundry de mentira: as duas Roles, as permissões, o cancelar, a confirmação desatualizada, o clique duplo e a
    gravação parcial desfeita);
  - **G4:** um passo novo, depois do extrato: Armas de uma Mão 4 → 5 → 6 por 100 e 120 (saldos 130 e 10), a recusa sem
    saldo, o Solo e o Fixer 4 → 5 por 300 cada, a confirmação, o extrato e os quatro cartões, o cancelar, o clique duplo,
    o saldo mudado durante a confirmação e o gancho que grava o débito sem o nível, com a compra desfeita.
- **Portões:** G1, 186 arquivos sem erro; G2, nenhum erro; G3, 388/388; G4 completo, 226/226, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito do Codex caíram no G3, uma por vez (a perícia pela metade, M1; a difícil sem o dobro, M2; a Role
  pelo preço da perícia, M3; sem saldo, M4; o salto, M5; o teto, M6; o extrato que soma, M7; a compra recusada que não
  volta, M8), e a M7 e a M8 também no G4.
- **Próximo:** os itens abertos da Fase 7 (C34 a C38, C40 a C44); o C28 e as perguntas abertas são do usuário.

### Ciclo 156 (2026-10-23): o C38, os perigos do ambiente (sessão Junin, com o Codex)

Commit anterior: `594ccd7` (a reserva do C38, sobre o `ec4b6d2`, o ciclo 155 e as reservas da KouArt). O código e os
testes saíram de um worker do Claude, numa worktree própria e sem commit; o Codex (`codex exec`, só leitura) revisou três
vezes; a sessão Junin conferiu, rodou os portões e as mutações e fez o commit.

- **Referência:** a wiki, `system-rules.js:555-563` ("Outras formas de se ferir", p. 180–181) e `:549` (os +5 da lesão).
  O CORE 0.92.4 não tem estes perigos.
- **O que muda:**
  - **`scripts/regras-perigos.mjs` (novo):** as contas puras: o catálogo dos perigos e dos níveis, o fogo e a radiação por
    turno, o "vale o maior", o veneno e a droga pela DV, a queda pelos metros e pelas cyberpernas e os argumentos do
    `/perigo`;
  - **`scripts/perigos.mjs` (novo):** a janela "Perigo do ambiente" (só o mestre), o `/perigo` (com os argumentos:
    `/perigo fogo intenso`, `/perigo queda 25`), o botão no HUD do token, o `aplicar` (a API `game.system.api.perigos`),
    os cartões com o Desfazer e os botões "Sem ar", "Respirou", "Afastou-se", "Saiu da zona" e "Apagar fogo", os três
    estados novos ("Sem ar", "Eletrocutado", "Na radiação") e os ticks dos turnos. Uma fila por ator (a aplicação, os
    ticks e o Desfazer) e uma por cartão (os botões); o tick marca o turno no efeito e relê o ator pelo uuid;
  - **`scripts/turnos.mjs`:** o momento do turno tirado na entrada do `updateCombat` (quem acabou, quem começa e o
    combatente do Death Save, pelo combatente: vale no combate sem cena), os ticks dos perigos, e o Death Save que não
    roda se o combate acabou no meio (falhou, morre; o combatente só se ainda existe);
  - **`scripts/netrun/index.mjs` (autorizado pelo usuário):** o `queimar` sem o piso de zero e lendo o "Em chamas" ativo;
    o gancho pula o fogo do perigo;
  - **`scripts/sistema.mjs`:** o registro e a API.
- **Testes:**
  - **G3:** `perigos.test.mjs` (9 testes: os números contra a tabela da própria wiki, o fogo e a radiação, o "vale o
    maior", a queda de 9 a 40 m com 0, 1 e 2 cyberpernas e a Meat Leg, o veneno, a droga e os argumentos do `/perigo`);
  - **G4:** 7 passos novos, antes do "nenhum aviso": o fogo (o maior, o da munição, o desligado, o HP negativo, dois ao
    mesmo tempo, a NET); a eletrocução, o "Sem ar" e a radiação; os ticks (a corrida, a repetição, a ordem com o Death
    Save, o ator apagado, o capanga, o uuid); a queda e o veneno (o Desfazer, os sucessos e as falhas, a Sonífera); a
    janela (o `/perigo`, o HUD, "Aplicar" e "Cancelar"; o jogador que rola no computador dele e não vê os botões do
    mestre); o combate sem cena com o Desfazer junto de um tick; e o Death Save pendente com o combate apagado.
- **Portões:** G1, 189 arquivos sem erro; G2, nenhum erro; G3, 397/397; G4 completo, 233/233 (509 s), com a checagem dos dois navegadores sem avisos ou erros de JS.
- **Mutações:** 41 caíram, uma por vez, com o arquivo devolvido pelo md5:
  - **11 no G3:** os números da wiki, o "vale o maior", os limites da queda e das cyberpernas, a Meat Leg, o empate com a DV
    e os argumentos do `/perigo`;
  - **30 no G4 focado** (uma cópia do v14.js só com a abertura do mundo, um jogador e os passos do C38, em cerca de 52 s):
    - o fogo da munição que não sai;
    - o Desfazer: o fogo trocado, duas vezes, o que mudou no meio da queda, fora da fila;
    - os ticks: sem eles, o efeito errado, a metade do BODY, o combate de agora no lugar do momento, sem a marca do turno, o
      ator apagado, os efeitos desligados, o Death Save do combatente certo e do combate apagado, o combate sem cena;
    - as filas;
    - a NET: o piso de zero, o fogo do perigo em dobro, o efeito desligado;
    - o mestre e o jogador: o botão do HUD, os botões do cartão, o `aplicar` e a rolagem no computador do dono;
    - a resistência que nunca passa.
  - **Uma sobreviveu:** tirar a reserva em memória do `marcar`. Com os ticks na fila do ator, ela não protegia mais nada,
    e saiu do código.
- **A revisão do Codex:** a primeira achou 11 problemas (o piso de zero da NET, o Desfazer da queda, o turno lido depois
  dos `await`, a marca concorrente, as aplicações e os botões concorrentes, os efeitos desligados e quatro testes
  fracos); a segunda, o dano perdido entre o fogo da NET e os ticks e três falhas do G4; a terceira, o combate sem cena,
  o Desfazer fora da fila e o Death Save depois do fim do combate. Todos corrigidos, menos o que está em "fica de fora"
  nas dúvidas.
- **Próximo:** os itens abertos da Fase 7 (o C34, partes 2 e 3, o C35 e o C40 a C44); o C28 e as perguntas abertas são
  do usuário.

### Ciclo 157 (2026-10-23): o C40, os veículos fora do dano (sessão Junin, com o Codex)

Commit anterior: `aa0b24a` (a reserva do C40, sobre o `06568c8`, o ciclo 156). O código e os testes saíram de um worker
do Claude, numa worktree própria e sem commit; o Codex (`codex exec`, só leitura) revisou duas vezes; a sessão Junin
conferiu, rodou os portões e fez o commit.

- **Referência:** a wiki, `system-rules.js:538` ("Veículos", p. 189–192). O CORE 0.92.4 não automatiza nada disto.
- **O que muda:**
  - **`scripts/regras-veiculos.mjs`:** as contas puras: o tipo do veículo (o campo ou os 14 nomes do CORE), a perícia de
    controle pelo tipo, a direção sob pressão (9 ou menos rola DV10), as manobras e as DVs (o pouso e a acrobacia só no
    aéreo), o 6d6 da batida, o Traumatismo Cervical e a DV13 de desviar;
  - **`scripts/direcao.mjs` (novo):** o controle no começo do turno (na fila do ator, com a marca do turno; o jogador rola
    no computador dele), a manobra (a janela, conferida de novo antes e depois de rolar), os cartões com o botão
    "Batida" do mestre e a API `game.system.api.veiculos`;
  - **`scripts/perigos.mjs`:** a "Batida de veículo" na janela (as listas "No veículo" e "Atingidos", o `aplicar` com
    `atingidos`, o Desfazer do SDP e da ablação pela diferença); cada ator protegido por um `try/catch`, relido depois
    das rolagens; o `momentoDoTurno` também pelo ator do combatente sem token;
  - **`dados.mjs`, `ficha-item.mjs` e o `item.hbs`:** o campo `tipo` do veículo ("Pelo nome", "Terrestre", "Aéreo",
    "Marítimo"), sem migração;
  - **`ficha-personagem.mjs` e o `equipamento.hbs`:** o botão "Manobra", ao lado do "Dirigir";
  - **`turnos.mjs` e `sistema.mjs`:** o controle no começo do turno e a API.
- **Testes:**
  - **G3:** `direcao.test.mjs` (6 testes: o tipo pelos 14 nomes e pelo campo, a perícia, o 9 e o 10, as manobras contra
    a tabela da própria wiki, a batida e o desvio) e um em `perigos.test.mjs` (o `/perigo batida`). O inventário do
    `mesa.test.mjs` ganhou o `direcao.mjs` (a manobra rola com o modo);
  - **G4:** 6 passos novos, depois dos do C38: a direção sob pressão (o 9 e o 10, passa e falha, uma vez por turno, o botão
    Batida); a manobra pela ficha (o botão, o aéreo e o terrestre, o "Dirigir" desligado com a janela aberta); a batida (o
    SDP com o SP, os +5, a lesão repetida, a pessoa a pé que desvia e a que não, o erro no meio, o Desfazer diferencial); a
    batida pela janela; o momento do turno (o combate que anda durante um tick, o combatente sem token); e o jogador (o
    controle, o desvio e a manobra no computador dele, com a janela; o personagem apagado com a janela da Evasão aberta).
- **Portões:** G1, 191 arquivos sem erro; G2, nenhum erro; G3, 404/404; G4 completo, 239/239 (570 s), com a checagem dos
  dois navegadores sem avisos ou erros de JS.
- **Mutações:** 54 caíram, uma por vez, com o arquivo devolvido pelo md5: 20 no G3 (o limite 9 e 10, a DV10, os tipos
  pelos nomes, o campo, as perícias, as DVs das manobras, o 6d6, a DV13, a lesão e a Evasão) e 34 no G4 focado (o
  controle, a manobra, a batida, a janela, o jogador, o `try/catch`, o `aindaNaMesa`, o `oMesmoControle`, o combatente
  sem token, o momento capturado, os atingidos pela janela e o Desfazer diferencial). Uma sobreviveu: o "uma vez por
  veículo" da batida. O veículo é item do próprio ator, e a lista já não repete o ator, então o trecho saiu do código.
- **A revisão do Codex:**
  - a primeira não achou erro de regra. Ela achou o ator apagado durante a Evasão (a aplicação parava sem cartão), a
    manobra com o controle vencido, o combatente sem token e quatro testes fracos (os atingidos pela janela, o jogador
    com a janela, o momento capturado e o Desfazer diferencial);
  - a segunda: a segunda confirmou seis dos sete e achou um passo do G4 que podia esperar sem fim pela janela do jogador (ganhou
  o prazo de 10 s). O que fica: o controle e o desvio do jogador são testados com o "Rolar direto" (eles usam o pedido da
  resistência da munição; a janela é testada pela manobra), e uma falha dentro do `receberDano` depois de gravar o HP (o
  servidor recusando a ablação) fica sem Desfazer, como em qualquer dano.
- **Próximo:** os itens abertos da Fase 7 (o C34, partes 2 e 3, o C35, o C41 a C44); o C28 e as perguntas abertas são do
  usuário.

### Ciclo 158 (2026-10-23): C34.2, jogadores podem criar itens (sessão Codex)

Commit anterior: `03953bb` (a reserva do C34.2, sobre o ciclo 157). Trabalho numa worktree própria; revisão por outro
agente, sem editar os arquivos durante as rodadas de G4 e mutações.

- **Referência:** CORE 0.92.4, `modules/system/settings.js:139`, `playersCreateInventory` (mundo, Boolean, false), e os
  botões em `templates/actor/character/right-pane/cpr-gear.hbs` e `bottom-pane/fight/cpr-criticalInjuries.hbs`.
- **O que muda:** a opção `jogadoresCriamItens`, o contexto `podeCriarItem` e a ação em `scripts/criar-item.mjs`.
  Exige dono e ator personagem ou capanga; o mestre dispensa a opção, preservando o botão do C32 (o CORE esconde também
  o dele quando desligada). A ação relê a configuração em cada chamada e recusa tipos de item inexistentes ou herdados
  de Object. Mantém os nomes e a abertura da ficha do C32. Contêineres continuam com as permissões próprias do C25.
- **Portões:** G1, 139 arquivos sem erro; G2, nenhum erro; G3, 406/406 no Node 24; G4 completo, 240/240 em 538 s, sem
  avisos de compatibilidade nem erros do sistema nos dois navegadores. A rodada anterior também deu 240/240 em 569 s.
  As execuções anteriores puladas com a mesa ocupada não contaram como portão.
- **G4 novo:** o jogador clica no botão real de lesão das fichas de personagem e capanga; desligada, nem botão nem
  criação; ligada, cria e abre o item. O observador não recebe botão nem cria. Revogar com as fichas abertas e os botões
  antigos ainda desenhados recusa a ação. O mestre cria nos dois tipos mesmo com a opção desligada. Documentos de teste
  são separados dos atores de combate e removidos ao final.
- **Mutações:** 11 caíram, com os arquivos restaurados pelo SHA-256: 7 na lógica (dono, tipo de ator, opção ligada e
  desligada, mestre, proteção da ação e tipo herdado) e 4 no navegador, voltando cada template a mostrar o botão só por
  ser editável (`bloco-lesoes`, `equipamento`, `cyberware` e `net`). As de navegador usam as cópias instaladas na pasta
  descartável e o mesmo passo do G4, com controle sem mutação aprovado; a única diferença permitida é o botão indevido.
- **Revisão:** sem falha funcional encontrada; o cenário foi reforçado para manter a ficha aberta na revogação,
  executar a ação herdada do capanga e conferir a permissão de observador. A exceção do mestre ficou explícita.
- **Próximo:** C34.2 continua reservado para a sessão Codex: lesão repetida, perícias do capanga por nível/base/total e
  confirmação ao apagar item. Esta entrega fecha só a opção de criação de itens.

### Ciclo 159 (2026-10-24): C34.2, exibição das perícias do capanga (sessão Codex)

Commit anterior: `cdb49d5` (reserva do C34.3 por outra sessão, a única mudança publicada desde o ciclo 158). A reserva
foi integrada antes de começar; o C34.3 não foi alterado. O C34.2 já estava reservado para esta sessão.

- **Referência:** CORE 0.92.4, `modules/system/settings.js:183–198` (`mookSheetSkillDisplay`, client, default base),
  `templates/actor/mook/cpr-mook-skills.hbs:35–42` e `modules/system/register-helpers.js:1106–1125` (bônus persistentes).
- **O que muda:** `periciasDoCapanga` escolhe Nível, Base ou Total por navegador, com Base por padrão. O cálculo puro
  fica em `scripts/regras-pericias-capanga.mjs`; a ficha acrescenta valor e dica de exibição às linhas e o bloco
  compartilhado muda só a coluna do capanga. Cabeçalho, tooltip e valor acompanham a escolha ao redesenhar ou reabrir.
  A lista completa preserva as linhas de grupo; o nível editável, a ordenação e a ficha do personagem ficam como eram.
- **A conta:** Nível é o nível; Base soma o atributo preparado (com a armadura já aplicada); Total soma o bônus
  persistente de `pericia().bonus`. Não soma Role calculada separadamente, ferimento, Sorte ou situacionais na coluna,
  como o template do CORE. O Fieldbook mantém os bônus que já derivava em `pericia().bonus`, inclusive família e a
  Detecção de Ameaça do Solo. O total interno da ficha e as rolagens mantêm todos os modificadores anteriores.
- **G4 novo:** com REF de fonte 8, armadura −2, nível 4, bônus persistente +2, Moto +3 e ferimento −2, a coluna mostra
  4 / 10 / 12; o total interno permanece 13 e o d10 5 dá 18 nos três modos. O campo de nível continua 4 e a ordem é
  preservada. A lista completa desenha os grupos. O personagem continua mostrando 13. Mestre em Total e jogador em
  Base veem 12 e 10 no mesmo capanga; mudar o jogador para Nível não muda o mestre.
- **Portões:** G1, 141 arquivos sem erro; G2, nenhum erro; G3, 409/409 no Node 24; G4 completo, 241/241 em 559 s, sem
  avisos de compatibilidade nem erros do sistema nos dois navegadores. O cenário focado também passou sem avisos.
  A primeira tentativa focada parou na abertura lenta do app, antes do cenário; a repetição passou sem mudar os prazos
  do runner nem contornar a checagem de mesa ocupada.
- **Mutações:** 16 caíram, com MD5 original restaurado: 10 no G3 (nível, atributo, pontos, bônus, bônus negativo,
  padrão da função, rótulo, escopo, padrão registrado e escolhas); 6 no G4 focado (atributo da fonte, bônus ausente,
  sobrescrever o total interno, valor e rótulo errados no template e tratar grupo como perícia). As de navegador
  alteram somente a cópia instalada no Foundry descartável, com controle aprovado antes e depois e falha pelo motivo
  esperado em cada mutante. O G4 completo foi executado depois da restauração.
- **Revisão:** outro agente conferiu a fonte e o diff, sem achados impeditivos, sem editar ou rodar navegador.
- **Próximo:** no C34.2, lesão repetida e confirmação ao apagar item; o C34.3 continua reservado pela outra sessão.

### Ciclo 160 (2026-10-24): C34.3, os detalhes da mesa (sessão Codex)

Commit anterior: `f1453ad` (retomada da reserva do C34.3 a pedido do usuário). Trabalho numa worktree própria;
as reservas das partes 1 e 2 foram preservadas.

- **Referência:** CORE 0.92.4, `modules/actor/cpr-actor.js:968–1006` (track), `:1377–1387` (maior SP no dano),
  `:1565–1625` (ablação), `hooks/actor/sync-tracked-armor.js` (edição pela barra),
  `hooks/foundry/ui/item-folder-upgraded-display.js` (árvore) e `utils/cpr-systemUtils.js:523` (imagens).
  No Foundry 14.369, foram conferidos `TokenDocument.getBarAttribute`, a descoberta de atributos pelo schema,
  `Actor.modifyTokenAttribute` e `getDefaultArtwork`. O C18 continua seguindo a armadura da wiki (p. 186).
- **SP na barra:** personagem e capanga acompanham corpo ou cabeça, com escolha automática pelo maior SP atual,
  uma peça vestida ou nenhuma. Peça apagada, guardada ou incompatível usa a automática. A escolha só muda a barra:
  o combate conserva o C18. Baixar o SP abla todas as camadas do local; subir repara só a monitorada. Os valores são
  derivados dos itens, sem manter outro estoque de SP. A fila serializa edições do mesmo ator neste cliente.
- **Tokens e permissão:** novos personagens e capangas usam o corpo na segunda barra; uma barra explícita é
  preservada. “Mostrar na barra” muda o protótipo e os tokens ligados da cena atual; no token solto, muda só ele.
  As APIs exigem dono e usam o ator sintético. O G4 rebaixa o jogador de dono para observador e confere a recusa.
- **Árvore:** apresenta `instaladoEm` recursivamente, com prioridades do CORE, sem alterar vínculos ou pastas.
  Respeita visibilidade, abre fichas e guarda expansão por usuário. A busca usa as linhas nativas. Órfãos e ciclos
  conservam cada item uma vez; a montagem profunda usa iteração. Munição carregada continua sendo referência ao
  estoque compartilhado, sem ser reparentada como instalação única.
- **Imagens:** padrões locais para os cinco tipos de ator e treze de item, inclusive itens da ficha e inventário
  aninhado na criação. Imagens explícitas, cópias e texturas próprias são preservadas. Os 16 SVGs são idênticos aos
  do CORE, com origem e licença registradas; o sistema não depende de o CORE estar instalado.
- **Portões:** G1, 151 arquivos sem erro; G2, nenhum erro, incluindo as duas bibliotecas novas do G4 no lint;
  G3, 419/419 no Node 24; G4 completo, 245/245 em 488 s, sem avisos de compatibilidade nem erros
  do sistema nos dois navegadores. Os quatro passos focados também passaram sem avisos, inclusive sem cena prévia.
  A primeira rodada completa deu 244/245: o teste novo de SP dependia da cena removida por casos anteriores.
  O caso passou a criar e limpar a própria cena, restaurando a anterior quando existir. A segunda rodada também
  deu 244/245: a checagem de imagens assumia ordem no retorno de criação em lote. No mesmo mundo, reproduziu duas
  falhas e um acerto com as imagens sempre corretas; identificar cada item por nome retirou a dependência de ordem.
  As comparações individuais foram mantidas. Na terceira rodada, os quatro casos novos passaram e só o caso antigo
  de lesões C19 falhou: também supunha a ordem de dois tokens e confundia médico com ferido. O teste passou a
  identificar cada token pelo `actorId`, conservando todas as verificações. Nenhuma regra do sistema mudou nessas
  correções dos testes; os casos de imagens e de C19 passaram três vezes no mundo preservado após as correções.
  A quarta rodada passou C34.3 e C19, mas capturou `saiu` antes de terminar uma transferência C27 iniciada pela
  entrega periódica. O teste agora aguarda essa marca por até 6 s e mantém todas as expectativas de transporte;
  o código da wiki não mudou. A revisão confirmou a corrida pelo `transferenciasEmCurso` e pelo log completo.
- **Mutações:** 29 caíram, com MD5 original restaurado: 19 no G3 (escolha, fallback, ablação, reparo, delta,
  permissão, tipo, fila, visibilidade, vínculos, ciclos, prioridade, raízes e imagens) e 10 no navegador (artwork de
  ator e item, rota do HUD, escolha no derivado, barra inicial, nome como HTML, CSS da busca, expansão salva,
  atualização da montagem e limpeza ao redesenhar). As de navegador alteram só a instalação descartável, com
  controles aprovados antes e depois e falha pelo motivo esperado. O G4 completo rodou após a restauração.
- **Revisão e limites:** revisões separadas de armadura, árvore e imagens não encontraram bloqueios. A fila não é
  uma transação entre clientes. Os padrões não substituem imagens já gravadas nos documentos.
- **Próximo:** no C34.2, lesão repetida e confirmação ao apagar item; os demais itens abertos do ROADMAP.

### Ciclo 161 (2026-10-24): C34.2, lesões repetidas e confirmação ao apagar item (sessão Codex)

Commit anterior: `572e9e9` (ciclo 160, C34.3). A continuação conferiu o remoto e manteve a reserva desta sessão para
o C34.2. Trabalho numa worktree própria, sem mudar o master da wiki ou instalar na campanha real.

- **Referências:** CORE 0.92.4, `modules/system/settings.js:117-129` (`preventDuplicateCriticalInjuries`, mundo,
  off/warn/reroll, padrão off), `:152-159` (`deleteItemConfirmation`, cliente, padrão true),
  `modules/actor/sheet/cpr-actor-sheet.js:980-1074` (exclusão de itens) e `:1191-1278` (tabela de lesões).
  Wiki `system-rules.js:549`, não repetir a lesão na tabela. Conferidos no código local de referência.
- **Lesões repetidas:** nova opção do mundo, `lesoesRepetidas`. Off cria outra cópia sem aviso; warn cria e avisa;
  reroll procura uma lesão ausente. O padrão fica reroll, preservando a wiki e o comportamento anterior do Fieldbook,
  diferença intencional em relação ao padrão off do CORE. A tabela cheia só impede reroll; `excluir` continua absoluto.
  A API relê as lesões e a opção após as esperas, mantém as filas por ator e não altera HP. IDs certos de golpes,
  quedas, batidas e outras consequências continuam idempotentes nos três modos. O Monowire distingue seu resultado
  de tabela do ID certo: prévias silenciosas não avisam nem criam; a escolha permite duplicata em off/warn e a
  colisão em reroll conserva o cartão disponível para outra escolha, sem inventar uma terceira rolagem.
- **Excluir itens:** `confirmarExclusaoItem`, cliente, ligada por padrão. Nas fichas de personagem, capanga e
  contêiner, desligar dispensa a pergunta do item comum. Instalados, cyberware no ator e munição carregada continuam
  exigindo aviso. O C32 conserva uma única escolha sobre os filhos (soltar/apagar junto/cancelar); o contêiner
  conserva a exclusão conjunta com aviso obrigatório. Na exclusão simples e em Só tirar, a arma descarrega se a
  munição está na ficha; Apagar junto descarta as balas do pente. A montagem é relida, e dono,
  edição, presença e permissão do contêiner são reconferidos depois das esperas. O UUID resolve também o ator
  sintético: apagar no token solto preserva o modelo. A configuração se limita à exclusão manual de Item nessas
  fichas; ações automáticas e exclusões de outros modelos mantêm seus fluxos próprios.
- **Revisão:** a revisão independente confirmou a resolução do UUID e a separação entre lesão certa e Monowire.
  Encontrou o aviso de local antigo quando a própria raiz era instalada em outro item enquanto o C32 aguardava.
  Corrigido: reabre a escolha mostrando o novo receptor antes de apagar. O G4 instala a arma num veículo durante o
  diálogo, cancela a nova pergunta e confere toda a montagem intacta.
- **Portões:** G1, 156 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 431/431 no Node 24;
  G4 completo, 250/250 em 573 s no Foundry 14.369, sem avisos de compatibilidade nem erros do sistema nos navegadores
  do mestre e do jogador. Os cinco passos novos passaram também em execução focada; a extensão de exclusão com
  token solto e montagem concorrente passou antes da rodada completa. Revisão independente do código e dos textos.
- **Mutações:** 49 detectadas, com bytes restaurados por MD5: 39 no G3 (21 de lesões/configurações e 18 dos auxiliares
  de exclusão) e 10 no Foundry real. As de navegador alteraram somente a instalação descartável: opção de lesões
  ignorada, aviso ausente, origem do Monowire, preferência de confirmação ignorada, instalação sem aviso, escolha C32
  ausente, contêiner sem respeitar a preferência, permissão congelada, escopo world incorreto e aviso com local antigo.
  Controles aprovados antes e depois; a última mutação e seus controles já incluem o token solto e a montagem concorrente.
- **Próximo:** C34.2 concluído; C34.1 e os demais itens reservados continuam com seus responsáveis. Seguem os itens
  abertos do ROADMAP.

### Ciclo 162 (2026-10-24): C41, parte 1, Correr (sessão Codex)

Commit anterior: `71ab2bd` (reserva de C41.1, sobre o ciclo 161). Conferido o remoto antes de começar e antes de fechar;
nenhuma mudança concorrente. Trabalho na worktree própria; o master da wiki e a campanha real não foram alterados.

- **Referências:** wiki, `system-rules.js:497`, `:499`, `:501` e `:514`, p. 168–169: uma Ação de Movimento e uma Ação;
  Correr usa a Ação para outro Movimento, só depois do Movimento normal. `:535`, agarrado não usa Movimento; `:538`,
  quem dirige também não. CORE 0.92.4, `modules/actor/cpr-actor.js:349-351`, deriva walk = MOVE × 2 e run = MOVE × 4;
  não tem uma ação Correr. A integração de faixas de `drag-ruler.js:20-27` continua no C44.
- **Regra e API:** `corridaPorEstado` separa o extra (MOVE × 2) do limite total do turno (MOVE × 4), com custo de
  uma Ação. `corridaDe` usa o MOVE já preparado com armadura, efeitos e ferimento; não reaplica penalidades. Caído,
  agarrado e quem efetivamente dirige um veículo são recusados. Um ponteiro de veículo ausente não bloqueia.
  `game.system.api.estados.correr` exige dono, personagem/capanga e identidade atual resolvida pelo UUID, inclusive
  no ator sintético. A API não grava atributos, recursos, efeitos ou posição.
- **Ficha e cartão:** botão nas abas Perícias e Combate do personagem e no capanga, com extra e limite à vista.
  A pergunta confirma Movimento já usado e Ação disponível; Ctrl e Rolar direto não pulam esse requisito.
  Depois da espera, relê permissão, presença, MOVE e impedimentos. Mudança de combate, rodada, turno ou identidade
  do combatente ativo cancela a confirmação antiga. No mesmo cliente, o clique duplo produz uma pergunta e um cartão; cancelar,
  fechar, erro ou recusa de criação liberam a trava. Nomes são escapados, e o cartão do token solto tem seu speaker.
- **Limites:** como Levantar-se e a carga Tech, a Ação é registrada no chat, sem um orçamento automático de ações.
  O jogador confirma o Movimento prévio e a Ação disponível; uma macro pode confirmar explicitamente com
  `{ confirmado: true }`. O deslocamento do token e sua distância são conduzidos pela mesa. Não há estado
  persistente de corrida nem alteração temporária de MOVE. A régua Andar/Correr é o C44.
- **Portões:** G1, 158 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros, incluindo o helper C41;
  G3, 444/444 no Node 24; G4 completo, 253/253 em 545 s no Foundry 14.369. Nenhum aviso de compatibilidade nem erro
  do sistema nos navegadores do mestre e jogador. Os três passos novos passaram também em execução focada: três
  vistas da ficha, MOVE 10 com −4 de lesão e −2 de armadura, cancelamentos, clique duplo, bloqueios, releitura após
  a espera, dono/observador, revogação da permissão e token solto com modelo, posição, HP e Sorte intactos.
- **Mutações:** 31 detectadas, com bytes restaurados por MD5: 10 da regra pura, 15 da API e seis no Foundry real
  (confirmação ignorada, MOVE da fonte, permissão não revalidada, motorista liberado, turno ignorado e botão de Combate
  desligado). Controles reais aprovados antes e depois; o G4 completo rodou após a restauração. A primeira tentativa
  da bateria de navegador parou antes dos cenários, na abertura do mundo; a repetição passou sem alterar os prazos.
- **Revisão:** auditorias separadas da wiki/CORE e da integração existente orientaram o escopo; a revisão independente
  do código confirmou as guardas e sugeriu incluir a identidade do combatente no snapshot, incorporada e testada.
- **Próximo:** os demais itens do C41 (escudo humano, Reputação, hospital/instalação e Cryopump/Cryotank); as reservas
  das outras sessões e os itens abertos do ROADMAP continuam preservados.

### Ciclo 163 (2026-10-24): C41, parte 2, escudo humano (sessão Codex)

- **Fontes:** wiki, `system-rules.js:535–537`, agarrão, cobertura e escudos (p. 177 e 182–184). O CORE 0.92.4 não
  automatiza escudo humano; o dano de seu escudo comum soma dano e bônus antes de consumir os PV. Mortalmente ferido
  não é morto: `turnos.mjs` marca DEFEATED na falha do Death Save. A FAQ oficial não acrescenta uma resolução deste
  caso; as lacunas foram levadas ao usuário antes da implementação.
- **Dúvidas resolvidas pelo usuário em 2026-10-24:** interpor é uma escolha na reação, em lugar da esquiva. A pessoa
  agarrada recebe dano, armadura e lesões normais e não pode esquivar de tiros enquanto é escudo. Se ela e o portador
  estiverem na mesma área de explosão ou cartucho, a interposição protege o portador e a vítima recebe uma única vez.
- **Ativação:** o botão na ficha de personagem e capanga usa uma Ação, sem novo teste, a partir de agarrão recíproco
  válido. O mestre confere dono, identidade dos efeitos e tokens, e ausência de outro escudo equipado; marca manual
  ou unilateral não basta. A marca de uso fica no efeito Agarrando e sai com Soltar, fuga ou Derrubar. Os UUIDs dos
  tokens tornam o vínculo explícito, inclusive em atores sintéticos; vínculos antigos só usam fallback sem ambiguidade.
- **Combate:** uma escolha própria de reação identifica o alvo original e o receptor real. O redirecionamento ocorre
  antes da munição sem dano, para resistências, estados, lesões, ablação, Reflex Tuner, visibilidade e Desfazer pertencerem
  à vítima. Corpo a corpo, tiro mirado na cabeça e supressão não oferecem a interposição. O vínculo é relido após
  esperas; se mudou, o cartão pede resolver a defesa novamente. Na área, a linha interposta prevalece sobre a linha
  direta da vítima, sem um segundo dano ou efeito.
- **Cadáver:** somente morte marcada permite iniciar os PV iguais ao BODY preparado. A captura ocorre na primeira
  consulta ou resolução nesse estado, uma vez; não há snapshot no hook da morte. A trilha pertence à vítima e
  persiste depois de soltar e agarrar novamente; mudar BODY não a recarrega. Um tiro destruidor não transfere sobra;
  uma explosão destruidora aplica o dano inteiro ao portador, como no escudo comum. Desfazer devolve apenas a perda
  daquele impacto, preservando danos posteriores. Soltar vivo é livre; largar o cadáver registra uma Ação.
- **Limites:** a mesa conduz o orçamento de ações. O dano rolado à parte continua aplicando nos tokens marcados
  pelo mestre; a defesa manual orienta marcar a vítima interposta uma única vez, sem repetir a reação.
- **Portões:** G1, 162 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 473/473 no Node 24.
  G4 completo, 260/260 em 565 s no Foundry 14.369; nenhum aviso de compatibilidade nem erro do sistema
  no mestre ou jogador. Os sete cenários novos passaram também em execuções focadas e nos controles restaurados: UI
  de personagem/capanga, dano 15 contra SP 7, Desfazer com dano posterior, corpo/cabeça, área, sonífera, lesão crítica,
  vínculos rompidos durante reação, HP zero, cadáver destruído por tiro/explosão, dono/observador e tokens soltos.
- **Regressões corrigidas:** a primeira execução deu 256/260 em 577 s. Soltar comum e dano manual sem interposição
  voltaram aos textos e flags anteriores; a lista exata dos botões passou a exigir a nova ação. No C38, o HP já
  chegava antes do cartão do mesmo tick: o teste agora aguarda a fila antes de ler mensagens, mantendo as mesmas
  expectativas de dano e ordem entre Death Save e Sem ar. A suíte completa foi repetida após os ajustes.
- **Mutações:** 60 detectadas, com bytes restaurados por MD5: 14 da regra pura, 38 do estado/ativação/permissões
  e oito no Foundry real (receptor do tiro, área duplicada, UUID do Desfazer, esquiva da vítima, cadáver tratado
  como vivo, receptor da munição, explosão destruidora e botão desligado). Controles aprovados antes e depois;
  as 38 de API foram repetidas sobre o Soltar final. O G4 completo final rodou após a restauração.
- **Revisão:** auditorias separadas de fontes, estado, combate e testes; as guardas de identidade/permissão após
  esperas e a leitura de ator apagado foram incorporadas. A revisão final aprovou o diff e os ajustes de regressão.
- **Próximo:** Reputação, hospital/instalação de cyberware e Cryopump/Cryotank; as reservas das outras sessões
  continuam preservadas.

### Ciclo 164 (2026-10-24): C41, parte 3, reconhecimento por Reputação (sessão Codex)

- **Fontes:** wiki, `system-rules.js:539`, Reputação e facedown (p. 193–194): ao conhecer alguém novo, role um d10
  abaixo da própria Reputação para a pessoa já ter ouvido falar de você, para o bem ou para o mal. CORE 0.92.4,
  `cpr-actor.js:1017` e `:1085`, a fábrica de rolagens e o Facedown, e o ledger da ficha; o reconhecimento segue
  a regra da wiki, separado desses fluxos existentes.
- **Dúvida resolvida pelo usuário em 2026-10-24:** má fama conta pela magnitude no reconhecimento. Reputação −5
  equivale ao nível 5 para este d10; o valor persistido continua −5, inclusive no Facedown e no extrato.
- **Entrega:** botão Reconhecimento nas abas Perícias e Combate e no capanga; API `ator.rolarReputacao()` e
  `game.system.api.reputacao.rolarReputacao(ator)`. Um único `1d10`, sem crítico, atributos, penalidades,
  modificadores ou Sorte; sucesso estrito abaixo do nível, inclusive empate falho. O cartão exibe valor assinado,
  nível e resultado e usa o modo selecionado do chat, ou o `modo` pedido pela macro.
- **Guardas:** só dono de personagem/capanga; identidade por UUID, permissões, usuário, nome e Reputação relidos
  depois da rolagem e da renderização. Alteração durante a espera cancela o cartão e pede outra rolagem. A trava
  por ator impede duplicação pelo clique duplo e é liberada também em erros. Não escreve no ator nem no alvo;
  Sorte preparada, recursos, efeitos, extrato e modelos de tokens soltos ficam preservados.
- **Limites:** a mesa escolhe quando há um encontro novo e narra o sentido da fama. Não há memória automática de
  conhecidos, alvo obrigatório ou gasto de Ação. O campo assinado continua sem alteração de schema ou importação;
  para este reconhecimento, valores não inteiros ou fora dos níveis da tabela (magnitude 0–10) avisam antes do dado,
  sem coerção, arredondamento ou limitação silenciosa do campo.
- **Portões:** G1, 167 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 491/491 no Node 24.
  G4 completo, 264/264 em 538 s no Foundry 14.369; nenhum aviso de compatibilidade nem erro do sistema
  nos navegadores do mestre e jogador. Os quatro passos novos passaram também em execução focada e nos controles
  restaurados: três botões reais com clique duplo, dado 1/10 sem crítico ou Sorte, empate, má fama, limites,
  snapshot alterado durante evaluate, dono/observador, revogação, ator apagado, token solto e os quatro modos do chat.
  O teste antigo do cabeçalho do capanga continua exato e passa a exigir também o indicador de Reconhecimento.
- **Mutações:** 50 detectadas e restauradas por MD5: 16 da regra pura, 28 da API (guardas após rolar/renderizar,
  integridade do cartão, modo capturado, concorrência e erros liberando a trava) e seis no Foundry real (delegar
  ao Facedown, marcar crítico, forçar público, speaker do modelo, retirar trava e desligar botão de Combate).
  Controles aprovados antes e depois; o G4 completo rodou após a restauração.
- **Revisão:** auditorias independentes de fonte, arquitetura, UI e API; nomes escapados, UUID sintético e
  preservação dos recursos conferidos. A decisão de magnitude veio do usuário antes da implementação final.
- **Próximo:** hospital/instalação de cyberware e Cryopump/Cryotank; reservas das outras sessões preservadas.

### Ciclo 165 (2026-10-25): o C36, estabilizar e a cura natural (sessão KouArt, com um worker)

Commit anterior: `1c4be022` (o ciclo 164, da sessão Codex). O código e os testes saíram de um worker (`workers:artesao`),
numa worktree própria a partir do `1c4be022`, revisados e integrados aqui pelo patch. A primeira tentativa (de
2026-10-22) se perdeu com a limpeza da pasta de rascunho, antes de ser integrada; esta foi feita do zero, já com os
ciclos 156 a 164.

- **A fonte:** só a wiki (`system-rules.js:552`, "Estabilização e cura natural", p. 222–223; a coluna Estabilizar dos
  estados de ferimento, `:208-212`; o Death Save de base, `:215`; "Quem cura o quê", `:553`; o catálogo,
  `system-catalog.js:74`, `:88` e `:89`). O CORE 0.92.4 não tem estabilizar nem a cura natural.
- **O que muda:**
  - **`scripts/regras-estabilizar.mjs` (novo, sem Foundry):** a DV pelo ferimento (leve 10, grave 13, mortal 15); as
    perícias (Primeiros Socorros e Paramédico, as do tratamento); `resultadoDeEstabilizar` (o empate falha; o mortal que
    passa volta a 1 HP, fica inconsciente e o Death Save volta ao de base); `curaNatural` (BODY por dia, × 2 com os
    anticorpos, até o máximo); `spDepoisDoDescanso`; os implantes (`ehAnticorpos`, `implanteDeSp`) e `curaNaFicha`;
  - **`scripts/estabilizar.mjs` (novo):** `estabilizar(ator)` (uma vez por ator neste cliente; a janela escolhe quem
    estabiliza, os tokens selecionados, o personagem de quem clica e o próprio ferido, e a perícia com a DV; relê o
    estado antes e depois de rolar; a gravação da marca, do HP e do Death Save numa vez só, na fila do ator do C38,
    `perigos.naVezDoAtor`; o inconsciente de 60 segundos no relógio do mundo; o cartão), `descansar(ator)` (os dias, o
    HP e o SP dos implantes, o cartão; sem a marca, recusa) e o gancho `preUpdateActor` que tira a marca quando o HP cai;
  - **a ficha:** a marca ESTABILIZADO e os botões Estabilizar e Descansar junto do estado, na aba Combate do personagem e
    no painel do capanga; a API em `game.system.api.estabilizacao`.
- **Dúvidas** (a wiki não define; ficou assim): estabilizar a si mesmo é permitido (como a correção rápida); qualquer HP
  que cai tira a marca, também a edição à mão e o limite do C31, e o Desfazer não a devolve; o dano não acorda o
  inconsciente (no combate, o efeito acaba pelas rodadas, a expiração do Foundry); o Death Save só volta ao de base no
  mortal; o descanso pede a marca até para o SP, e a marca não sai quando o HP chega ao máximo; o SP sobe 1 por dia em
  cada local, no item de armadura do implante; o descanso não avança o relógio do mundo; a Ação não é cobrada; o +1 do
  Trauma Team MedScan (`system-blackchrome.js:52`) não entra; o Blood Pump de 2077 não conta como anticorpo (saiu da
  wiki).
- **Testes:**
  - **G3:** `estabilizar.test.mjs` (novo, 7 testes: as DVs lidas da própria wiki contra o `estadoDeFerimento`, as
    perícias, o empate e o mortal, o BODY e os anticorpos, o SP, os implantes no catálogo e na loja, os botões da
    ficha); o `mesa.test.mjs` ganha o `estabilizar.mjs` na lista exata dos fluxos que chamam a perícia com o modo
    público (o C33);
  - **G4:** um passo novo, depois da correção rápida e do tratamento: o descanso recusado sem estabilizar; o empate 13
    contra DV13 falha e 14 passa no gravemente ferido; 2 dias levam o HP a 31 e o SP do Skin Weave a 7 e 6; o capanga
    mortalmente ferido de token solto rola o Death Save no combate, é estabilizado a 1 HP (penalidade 0, inconsciente
    de 60 segundos) e não rola no turno seguinte; 2 dias o levam a 13; o dano até 0 tira a marca e o Death Save volta;
    fora do combate, aos 59 s está inconsciente e aos 60 s, não.
- **Portões:** G1, 223 arquivos sem erro; G2, nenhum erro; G3, 498/498; G4 completo, 265/265, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos: no G3, o empate que passa (M1), os
  anticorpos que não dobram (M2) e a DV do mortal (M3); no G4, o dano que não tira a marca (M4), o mortal que não volta
  a 1 HP (M5), o Death Save que não volta ao de base (M6), o inconsciente de 10 minutos (M7) e o SP dos implantes que
  não volta (M8).
- **Próximo:** o C34 parte 1 (a ficha) e o C37 (arremessar), da mesma rodada.

### Ciclo 166 (2026-10-25): o C34, parte 1, a ficha: a aba Efeitos, o +1 do Death Save e as listas que recolhem (sessão KouArt, com um worker)

Commit anterior: `7e7b7c69` (o ciclo 165, o C36). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `1c4be022`, revisados e integrados aqui pelo patch, sem conflito com o C36. Como o C36, a
primeira tentativa (de 2026-10-22) se perdeu com a limpeza da pasta de rascunho; esta foi feita do zero, com as partes 2
e 3 do C34 (os ciclos 158 a 161 da sessão Codex) já na branch. Com ela, o C34 está completo.

- **As fontes (o CORE 0.92.4):** os três grupos (`cpr-actor-sheet.js:213-306`, `prepareActiveEffectCategories`); a
  origem com o uso e o apagar só no efeito do ator (`cpr-effects.hbs:54-60` e `:74-85`); o ligar do próprio ator (a
  primeira condição de `register-helpers.js:1035-1040`); as ações (`cpr-character-sheet.js:503-524`; criar,
  `cpr-actor.js:1675-1686`; apagar, `:1699-1715`); o +1 (`cpr-actor.js:668-675`, `cpr-actor-sheet.js:686-694`,
  `cpr-left-pane-info.hbs:115` e `cpr-mook-sheet.hbs:61`); recolher (`cpr-actor-sheet.js:433-453`, a favorita à vista
  em `:441`; a configuração escondida `userSettings`, `settings.js:243-249`, e `persist-section-views.js:12-21`). A regra
  de ligar e desligar e o estado vêm deste sistema (`ficha-item.mjs`, o `alternarEfeito`; `dados.mjs`, o `DadosEfeito`).
- **O que muda:**
  - **`scripts/regras-efeitos.mjs` (novo, sem Foundry):** `ligaAMao` (a regra que estava na ficha do item, agora num
    lugar só), `resumoDasMudancas`, `usoQueLiga`, `estadoDoEfeito` (na ordem: desligado, fora de uso ou inoperante pelo
    EMP, situacional, vencido, suprimido, valendo) e `controlesDoEfeito`;
  - **a aba Efeitos** (`templates/personagem/efeitos.hbs`, a oitava aba da ficha): à esquerda a contagem por grupo e o
    "+ EFEITO"; à direita os três grupos, cada linha com a imagem, o nome (abre a ficha do efeito), as mudanças, a origem
    com o uso, a etiqueta do estado, e "Ligar/Desligar" e ✕ para quem edita (relendo a permissão e o efeito);
  - **o +1 do Death Save:** `AtorCPR.subirDeathSave` e o botão logo depois do "zerar", na aba Combate e no painel geral
    (também no capanga), só para quem edita;
  - **recolher e expandir:** o `bloco-recolher.hbs` (o nome da lista, com o `aria-expanded`; um `<a>` com o papel de
    botão, porque o `DocumentSheetV2` desliga os botões do formulário na ficha de quem só vê), as seis listas da aba
    Equipamento e os grupos de perícias da lista completa; `regras-inventario.alternarRecolhida`, `listaDoGrupo` e
    `marcarRecolhidas`; a flag do usuário `listasRecolhidas`, `{ [id do ator]: [listas] }`, como a árvore do C34.3.
- **As diferenças em relação ao CORE:**
  - ligar e desligar vale só para o efeito do personagem e o do item ligado à mão: o CORE também deixa desligar o do item
    em uso (o cyberware instalado); aqui ele vale pelo uso, como a ficha do item manda. O "copiar efeito" ficou de fora;
  - apagar efeito pergunta sempre (o CORE segue a `deleteItemConfirmation`; aqui não segue a `confirmarExclusaoItem` do
    C34.2: fica para a mesa decidir), e o "+ EFEITO" não depende de "Jogadores podem criar itens" (o `createEffect` do
    CORE também não);
  - o situacional é por efeito (`DadosEfeito.situacional`), então o efeito fica num grupo só; no CORE, é por mudança;
  - as recolhidas ficam por ator e por usuário, numa flag, gravadas a cada clique; no CORE, por ficha, no navegador,
    gravadas ao fechar (aqui a ficha do token solto e a do ator dividem a escolha). Recolhem só as listas da aba
    Equipamento e os grupos de perícias (no CORE, também a aba de Role); a busca não abre o grupo recolhido, como o CORE
    (`cpr-skills-category.hbs:35-36`);
  - os efeitos de status (a cobertura, o caído) aparecem como efeitos do personagem, como no CORE com a
    `displayStatusAsActiveEffects` ligada (o padrão). A wiki não tem o +1 à mão: segue o CORE.
- **Testes:**
  - **G3:** `detalhes-da-ficha.test.mjs` (novo, 8 testes: os grupos e a ordem dos estados, lendo o CORE e o sistema; o uso
    de cada tipo; os controles; o +1 nos dois templates; recolher e expandir, a favorita e a busca; a varredura dos
    templates); o `acessibilidade.test.mjs` passa a exigir o `aria-pressed` no `alternarEfeito` e o `aria-expanded` no
    `recolherLista`;
  - **G4:** um passo novo (`tests/lib/c34-ficha.js`, depois do da exclusão do C34.2): a aba com um efeito próprio e quatro
    itens com efeito (as linhas, os botões, a origem, a Percepção +2), ligar e desligar o do item (a Furtividade 2 e 0),
    criar, desligar, ligar e apagar um efeito; o +1 das duas abas e o zerar; recolher a lista e o grupo (os favoritos à
    vista), a busca, fechar e reabrir; o jogador, que recolhe na flag dele sem mudar a do mestre; o passo antigo das abas
    passa de 7 para 8.
- **Junto, no README:** a linha do C32 tinha os acentos quebrados por outra edição ("exclus?o", "S? tirar",
  "muni??o", "est?"); foram corrigidos.
- **Portões:** G1, 226 arquivos sem erro; G2, nenhum erro (com os `tests/lib/c34-*.js` e `c41-*.js`); G3, 508/508; G4
  completo, 266/266, com a checagem dos dois navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos: no G3, o efeito do item que se apaga (M1), a
  favorita escondida (M2), o situacional fora de uso no grupo errado (M3), o +2 (M4) e o CSS que esconde o favorito (M8);
  no G4, a aba sem o fora de uso (M5), a ficha que não lê as recolhidas (M6) e o efeito novo desligado (M7).
- **Próximo:** o C37 (arremessar, com o Codex), da mesma rodada.
### Ciclo 167 (2026-10-25): C41, parte 4, a instalação e a retirada do cyberware com a cirurgia (sessão Junin)

- **Fontes:** wiki, `system-rules.js:564`, "Hospital, Trauma Team e instalação" (p. 223–226): instalar na loja (DV13,
  100eb), na clínica (DV15, 500eb) ou no hospital (DV17, 1.000eb); retirar sem destruir é a mesma DV da instalação, em 4
  horas, e falhar destrói a peça. A ficha da wiki (`personagem-jogo.js`, `instalacao`, no master): o lugar no mínimo o
  da peça, o custo pelo extrato com a opção de não cobrar, e a recusa sem dinheiro. O CORE 0.92.4 não tem cirurgia nem
  custo (`cpr-actor.js:448`, `installCyberware`, só a perda de Humanidade); o `installLocation` dele já vinha no
  `system.local` do cyberware (mall, clinic, hospital; notApplicable nos chips e boosts).
- **Decisões do usuário (2026-10-25):** instalar como a wiki ou com um Medtech do grupo, que rola TECH + Cirurgia contra
  a DV do lugar em vez de pagar; a cirurgia que falha não instala e a peça fica inteira. A retirada pergunta: só tirar
  (como antes) ou a cirurgia de um Medtech, que destrói a peça se falhar. A parte 4 vai em três ciclos: este, a conta do
  hospital e o Cryopump e o Cryotank.
- **Entrega:** `regras-cirurgia.mjs` (a regra pura: os lugares, `planoDaInstalacao`, `planoDaRetirada`,
  `cirurgiaDeuCerto`) e `cirurgia.mjs` (as janelas `instalar-cyberware` e `retirar-cyberware`, a rolagem e o cartão com a
  flag `cirurgia`). O "Instalar" e o "+ OPÇÃO" (a opção ainda não instalada) da aba Cyberware passam pela janela; o
  "Instalado" abre a retirada. Quem opera: os tokens selecionados, o personagem do usuário e, para o mestre, os
  personagens do mundo, só os que têm a Cirurgia e nunca o paciente. O `instalarCyberware` guarda o lugar
  (`flags.cpr-fieldbook.cirurgia.lugar`; vazio sem cirurgia), e a retirada usa a DV dele (um lugar guardado abaixo do da
  peça não vale). O teste do Medtech sai público, como o do tratamento (o C33).
- **O que não muda:** o Shift pula a janela (instala pela média, sem cirurgia; tira sem cirurgia), e a peça sem lugar
  instala direto, rolando a perda; o capanga (arrastar instala), a importação da wiki, o pedido da loja e a API
  `instalarCyberware`/`desinstalarCyberware` seguem sem cirurgia. Os passos antigos do G4 que instalam pela API e o do
  "+ OPÇÃO" com Shift ficaram iguais.
- **Limites:** sem relógio, as 4 horas da retirada só aparecem no texto. Não há Desfazer da cirurgia (o dinheiro sai
  pelo extrato, e o mestre tira a linha se quiser); a peça destruída sai da ficha. O jogador Medtech só opera em quem é
  dele (como o tratamento); no paciente de outro jogador, quem faz é o mestre.
- **Integração:** a sessão KouArt publicou os ciclos 165 (o C36) e 166 (o C34, parte 1) enquanto este rodava os portões; o
  ciclo passou de 165 para 167. Três conflitos de acréscimo, com as duas versões: o passo do G4 (o do C36 perdeu o fim,
  que o Git deixou só no meu; refeito), o MIGRATION_STATUS e a contagem do C33 em `mesa.test.mjs` (`estabilizar.mjs` e
  `cirurgia.mjs`). Lição: a worktree só buscava o `master` (`remote.origin.fetch`), e o `git fetch` não trazia a
  `sistema-v14`; busque com `git fetch origin +refs/heads/sistema-v14:refs/remotes/origin/sistema-v14`.
- **Portões:** G1, 175 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 513/513 depois da integração (5 testes novos em
  `tests/sistema/cirurgia.test.mjs`, que conferem as DVs e os custos com a tabela da wiki; o teste do C33 em
  `mesa.test.mjs` passou a contar as duas rolagens da cirurgia). G4 completo antes da integração, 265/265 em 575 s no Foundry 14.369 (uma rodada antes deu 263/265: o "jogador ataca" com o `reading 'system'` e o "o que a mesa vê do ataque" com a janela de reação, os dois instáveis já vistos e fora da cirurgia; passaram na rodada seguinte, sem mudança), com o passo novo
  (a janela, o ripperdoc no hospital, o "+ OPÇÃO", a recusa sem dinheiro, o empate do Medtech, a retirada que destrói e
  a que guarda, o Shift, o só tirar e a peça sem lugar); nenhum aviso de compatibilidade nem erro do sistema. O G4 completo da árvore integrada (632a27f1): 267/267 em 572 s, sem aviso nem erro do sistema.
- **Mutações:** 27 caíram, todas restauradas pelo md5: 10 da regra pura (G3) e 17 no Foundry (G4 focado: a abertura, um
  jogador e o passo novo, ~36 s). Duas sobreviveram na primeira rodada (a retirada que falha sem destruir e o "Só
  tirar" que não tira): o passo esperava o estado certo, mas não o conferia no fim (a lição do ciclo 80 no
  QUALITY_GATES: o `__esperar` não falha); o passo passou a conferir, e as duas caíram.
- **Próximo:** a conta do hospital (parte 4, segundo ciclo).

### Ciclo 168 (2026-10-25): o C37, arremessar (sessão KouArt, com o Codex)

Commit anterior: `50a6869d` (o ciclo 166, o C34 parte 1). O código e os testes saíram do Codex (`codex exec`, numa
worktree própria a partir do `1c4be022`), revisados e integrados aqui pelo patch. A primeira tentativa (de 2026-10-22)
se perdeu com a limpeza da pasta de rascunho: ela passava no G1 a G3, mas um passo do G4 falhava, e o relatório do G4
cortava o JSON antes do motivo. Desta vez o passo devolve só os campos que confere, e o motivo apareceu de primeira (ver
abaixo).

- **As fontes:** a wiki (`system-rules.js:16-24`, as faixas e a linha `grenade`; `:516`, o teto de 25 m; `:535`, DEX +
  Atletismo e o SP inteiro da arma branca arremessada; `:522`, a faca leve 1d6; `:521`, a explosão de 10 × 10 m, o dano
  rolado uma vez e a esquiva de cada um; `system-catalog.js:153`, o lança-granadas 6d6; `:188-201`, as munições de
  granada) e o CORE 0.92.4 (`cpr-attackable.js:95-102`, a Thrown Weapon com DEX; o item
  `weapon.thrown.weapon.yaml` dos compêndios, a granada de mão com 6d6, a Atletismo e a munição de granada).
- **O que muda:**
  - **`scripts/arremesso-regras.mjs` (novo, sem Foundry):** a base DEX + Atletismo, a DV pela distância na linha do
    arremesso e o teto de 25 m;
  - **`scripts/arremessar.mjs` (novo):** `podeArremessar` (a arma branca solta, fora de cyberware, acessório e veículo),
    `ehArremesso` (também a Thrown Weapon), a DV, o SP inteiro e o "Dano do arremesso" do cartão manual (recusa a
    munição sem dano);
  - **o fluxo do ataque** (`combate.mjs`, `combate/modos.mjs`, `combate/cartao.mjs`, `documentos.mjs`): o modo
    `arremesso` ataca com DEX + Atletismo e os modificadores de ataque à distância, pela DV e pelo alcance do arremesso,
    com o SP inteiro no dano; a granada usa a área e a munição do explosivo; o Aperto de ferro também impede o
    arremesso; o cartão guarda o arremesso para o dano manual (`rolagens.mjs` leva o contexto no cartão do dano);
  - **a ficha:** o botão Arremessar na linha da arma branca (`data-action="atacar" data-modo="arremesso"`).
- **Na integração:** a descrição do ataque passou de "arremesso" para "Arremesso", como as outras ("Tiro",
  "Autofogo"); os três passos novos do G4 chamavam `game.user.updateTokenTargets`, que não existe no Foundry 14, e
  passaram a marcar o alvo pelo `canvas.tokens.setTargets` (`client/canvas/layers/tokens.mjs:341`). Era a falha que a
  primeira tentativa não deixou ver.
- **Dúvidas** (a fonte não define): onde a arma arremessada vai parar, se volta ou se perde, fica com o mestre (ela
  continua na ficha); a granada que erra cai onde o mestre decidir, pelo fluxo do explosivo; nenhum dano foi inventado
  para objetos que não são armas. A Thrown Weapon do CORE aponta para a tabela `DV Thrown Weapon`, que até 25 m é a mesma
  linha do lança-granadas da wiki.
- **Testes:**
  - **G3:** `arremessar.test.mjs` (novo, 15 testes: a soma, as faixas lidas da própria wiki, o teto de 25 m, as entradas
    inválidas, quem pode arremessar, o SP inteiro, o golpe normal intacto, o contexto do dano manual, a recusa das sete
    munições sem dano, a arma relida depois da espera);
  - **G4:** três passos novos, depois do "corpo a corpo: DEX + Arma Branca": a faca pelo botão da ficha a 5 m (DV16) e
    pela API a 20 m (DV15) e a 30 m (fora), 6 contra SP 3 (3 de HP e 1 de SP) e o Desfazer; o dano manual pelos botões
    do chat, com o SP inteiro e o Desfazer; a granada de mão (a Thrown Weapon com munição perfurante), 6d6 na área, o
    alvo dentro, o de fora intacto, o que esquiva saindo, o consumo e o Desfazer.
- **Portões:** G1, 229 arquivos sem erro; G2, nenhum erro; G3, 523/523; G4 completo, 269/269, com a checagem dos dois
  navegadores sem avisos ou erros de JS. Depois de juntar o ciclo 167 da sessão Junin (publicado enquanto este rodava; por isso este é o 168),
  de novo na árvore juntada: G1, 232 arquivos; G2, nenhum erro; G3, 528/528; G4, 270/270.
- **Mutações:** as oito do Codex caíram, uma por vez, e os arquivos voltaram exatos: no G3, a base que subtrai o
  Atletismo (M1), os 25 m fora (M2), a tabela da pistola (M3) e a metade do SP (M5); no G4, o arremesso com REF (M4), o
  dano manual que perde o arremesso (M6), o botão que ataca como tiro (M7) e a granada sem a área (M8).
- **Próximo:** os itens abertos da Fase 7: o C35 (a cena da arquitetura), o C41 parte 4 (com a sessão Junin) e o
  C42 a C44 (o bom de ter).

### Ciclo 169 (2026-10-25): C41, parte 4, a conta do hospital (sessão Junin)

- **Fontes:** wiki, `system-rules.js:564`, "Hospital, Trauma Team e instalação" (p. 223–226): a maior DV da visita dá o
  custo (DV10 50eb, DV13 100eb, DV15 500eb, DV17 ou mais 1.000eb; o membro clonado e o cyberware médico de reposição
  incluídos), e o leito é 100eb por noite; o Trauma Team Prata (500eb/mês) cobra as cirurgias pelo preço do hospital, e
  o Executivo (1.000eb/mês) as inclui. Os planos vêm da criação da wiki (`system-criacao.js`, `traumaTeam`) e chegam à
  ficha pela moradia (o C22, `system.traumaTeam`). O CORE 0.92.4 não tem conta de hospital.
- **Decisão do usuário (2026-10-25):** uma janela do mestre que cobra pelo extrato, com cartão e Desfazer.
- **Entrega:** `regras-hospital.mjs` (`custoDaVisita`, `planoDoTraumaTeam`, `contaDoHospital`) e `hospital.mjs` (a janela
  `conta-hospital`, a cobrança, o cartão e o `desfazerContaDoHospital`). O botão "HOSPITAL" fica nas lesões críticas da
  ficha do personagem, só para o mestre; a janela traz a maior DV, as noites (0 a 365) e o plano da ficha (que o mestre
  pode trocar), com o total na hora. "Cobrar" tira pelo extrato ("Hospital: visita DV15: 500eb; 1 noite no leito:
  100eb"); sair mais do que tem só avisa, como o extrato. O cartão vai para o mestre e os donos; o Desfazer (o
  `desfazerHospital` em `combate/cartao.mjs`) devolve uma vez e marca o cartão. API: `game.system.api.hospital`.
- **Leitura da regra (minha):** "cirurgia incluída" do Executivo zera a visita, não o leito; entre as linhas da tabela
  (DV11, 12, 14, 16) vale a de baixo, e abaixo de DV10 a visita não custa nada.
- **Limites:** o Trauma Team que chega (1d6 rodadas, a chamada sozinha com Agent e Biomonitor) fica fora; a conta não
  olha as lesões da ficha (o mestre escolhe a maior DV). O capanga não tem o botão.
- **Portões:** G1, 181 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 531/531 depois da integração (3
  testes novos em `tests/sistema/hospital.test.mjs`, que conferem os custos e o leito com a tabela da wiki e os planos
  com a criação). G4 completo, 271/271 em 595 s no Foundry 14.369, sem aviso nem erro do sistema, com o passo novo no fim (antes do "nenhum aviso"), onde o navegador do jogador já
  existe: o Executivo da ficha (só o leito), o Prata, o saldo negativo, o Desfazer pelo botão do cartão e o segundo
  Desfazer recusado, o "nada a cobrar" e, no jogador, nem o botão nem a janela.
- **Mutações:** 20 caíram, restauradas pelo md5: 9 da regra pura (G3) e 11 no Foundry (G4 focado, ~35 s). Uma travou
  na primeira rodada em vez de cair (o jogador que abre a janela: a chamada esperava o clique para sempre); a checagem
  do jogador passou a correr contra 5 s e fechar a janela que abrir (a "janela sem prazo" do QUALITY_GATES), e a
  mutação caiu.
- **Integração:** a KouArt publicou o ciclo 168 (o C37) e a reserva do C35, do C44 e do C43 parte 1; o ciclo passou de
  168 para 169, sem conflito.
- **Próximo:** o Cryopump e o Cryotank (parte 4, terceiro ciclo).

### Ciclo 170 (2026-10-25): C41, parte 4, o Cryopump e o Cryotank (sessão Junin)

- **Fontes:** wiki, `system-catalog.js:218-228` ("Equipamento médico": o Cryopump, uma Ação e 1 carga, sem Death Saves
  enquanto a bolsa tiver 1 HP ou mais, cobertura de 15 HP, recarga 50eb por carga; o Cryotank, Tecnologia Médica DV13,
  1 pessoa, cura no dobro, cobertura de 30 HP; só o Medtech opera) e o "Criossistema do Medtech, por Rank" (no 4, o
  Cryopump passa a 2 cargas e 2 pessoas; no 5, a 3 cargas). A cobertura pela regra da wiki (p. 182–183, a mesma do
  escudo e do vidro). O CORE 0.92.4 não tem nenhum dos dois (os itens `core_gear:cryopump` e `core_gear:cryotank` são
  só equipamento).
- **Decisão do usuário (2026-10-25):** a estase completa, com as cargas e a cobertura; a cura em dobro esperava o C36,
  que a KouArt fechou no ciclo 165.
- **Entrega:** `regras-cryo.mjs` (os dispositivos, os pontos de Criossistemas, `planoDaEstase`, `coberturaDaEstase`,
  `multiplicadorDaCura`) e `cryo.mjs` (a janela `por-em-estase`, as cargas no item, a recarga pelo extrato do Medtech, o
  teste do Cryotank, o efeito "Em estase" com o HP da cobertura, a saída e o cartão). Fora dos meus arquivos, pequenas
  mudanças: o `receberDano` (a cobertura leva o dano antes do escudo) e o `desfazerDano` (devolve), o Desfazer do ataque
  (`combate/cartao.mjs`) e o cartão (`ataque.hbs`, "a cobertura da estase levou N"; o texto no token, "Na estase"); o
  Death Save do turno (`turnos.mjs`); e, no C36 da KouArt, o "Descansar" vale no Cryotank sem a marca de estabilizado e
  o `curaNatural` ganhou o `multiplicador` (o padrão 1 não muda nada do C36).
- **Limites:** sem relógio, a semana do Cryopump fica no texto, e a carga gasta não volta sozinha. "Que aceita ou está
  inconsciente" é do mestre. O botão fica só na ficha do personagem; o capanga entra pela API
  (`game.system.api.cryo.porEmEstase`). O dano do perigo do ambiente que não passa pelo `receberDano` (o fogo, a
  asfixia) não para na cobertura. O cartão do ataque com a linha da estase e o Desfazer pelo botão do ataque não têm
  passo próprio no G4: o passo chama o `receberDano` e o `desfazerDano` direto (o caminho que o ataque usa).
- **Portões:** G1, 184 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 537/537 (6 testes novos em
  `tests/sistema/cryo.test.mjs`, que conferem a cobertura, a DV, a recarga e os pontos com o texto da wiki; o teste do
  C33 em `mesa.test.mjs` passou a contar o teste do Cryotank). G4 completo, 272/272 em 580 s no Foundry 14.369, sem aviso nem erro do sistema, com o passo novo: a janela e a carga,
  o dano na bolsa e o Desfazer, o explosivo que a destrói, a saída, o Cryopump vazio e a recarga, o turno sem Death Save
  e depois com ele, o Cryotank que empata e o que passa, o descanso em dobro e o tanque cheio.
- **Mutações:** 27 caíram, restauradas pelo md5: 13 da regra pura (G3, inclusive o multiplicador do C36) e 14 no Foundry (G4 focado, ~40 s). Uma sobreviveu na primeira rodada (listar o dispositivo de quem não é Medtech): no passo só o Medtech tinha um; um personagem sem a Role com um Cryopump entrou no passo, e ela caiu.
- **No G4 focado:** o passo novo precisa de uma cena ativa; a do G4 completo depende dos atores dos passos de antes, e o
  focado cria uma vazia. Um passo que usa dados fixos chama o `fixar` antes, mesmo com a fila vazia: sem ele, a primeira
  rodada deste passo passou com um dado aleatório que caiu no número certo (o 13 do empate).
- **No G4 completo:** o passo falhou duas vezes antes de passar, pelo que os passos de antes deixam: nenhuma cena ativa (o passo cria a dele e devolve a anterior) e a permissão padrão mudada, que dava dono ao capanga novo e mandava o Death Save para o navegador do jogador, que espera o prazo (o capanga nasce com `ownership: { default: 0 }`, como no passo do C38). Os dois só aparecem no G4 completo.
- **O C41 está `[x]`** (as partes 1 a 3 da sessão Codex, a 4 desta).

### Ciclo 171 (2026-10-25): C43, parte 2, da 0.93 do CORE, a mesa (sessão Junin)

- **Fontes:** o CHANGELOG da 0.93 (`fvtt-cyberpunk-red-core-dev/CHANGELOG.md:43-44`): "Item upgrades may now be
  configured with negative modifiers" e "Add 4 new CPR default Turn Marker options that can be selected via the system
  settings menu". O código: o `tokenMarker` (`src/modules/system/settings.js:46-66`) e o `CONFIG.Combat.fallbackTurnMarker`
  no init (`src/cpr.js:307`), com os SVGs `src/icons/hud/turn-marker_*.svg`; o `getTotalUpgradeValues`
  (`src/modules/item/mixins/cpr-upgradable.js:46-80`), que passou a somar o modificador diferente de 0 (antes, só o
  maior que 0). O Foundry 14 tem o mesmo ponto (`client/config.mjs:299`, o marcador de reserva; o das configurações do
  combate vale por cima).
- **Entrega:**
  - **O marcador de turno:** `marcador-de-turno.mjs` e a configuração do mundo "Marcador de turno" (padrão: o do sistema),
    com os quatro do CORE e o do Foundry; o init aplica, e trocar redesenha a cena. Os SVGs vão em `icones/marcadores`,
    cópias sem alteração (GPL v3, `ORIGEM.md`).
  - **O upgrade negativo:** no sistema, o ataque, o SDP e os assentos já aceitavam o negativo (sem mínimo no modelo), e o
    ataque já entrava com o sinal. Faltava o limite: o `somaDeUpgrades` (regras.mjs) soma os do veículo sem passar abaixo
    de 0, e o SDP de agora não passa do máximo (o guardado não muda: tirado o upgrade, volta). A ficha do upgrade diz
    "+ ou −"; o pente do carregador continua sem mínimo negativo, porque troca o pente da arma (o "override" do CORE),
    não soma, e a dica diz isso.
- **Limites:** o CORE 0.93 aplica upgrades em mais pontos (SP de armadura, slots do cyberdeck...); o sistema tem só os
  quatro do modelo, e esses ficam como estão.
- **Portões:** G1, 186 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 539/539 (2 testes novos em
  `tests/sistema/mesa-093.test.mjs`: as cinco escolhas, os SVGs iguais aos do CORE, byte a byte, e a soma dos upgrades);
  G4 completo, 273/273 em 606 s no Foundry 14.369, sem aviso nem erro do sistema, com o passo novo: cada escolha troca o marcador de reserva e o arquivo carrega como textura; o −2
  no ataque; o veículo com −60 de SDP e −1 assento (0 e 1) e depois +20 (10, com o guardado em 50); os rótulos da ficha.
- **Mutações:** 10 caíram, restauradas pelo md5: 3 da regra pura (G3) e 7 no Foundry (G4 focado), entre elas a volta ao comportamento de antes da 0.93 (o ataque só com o modificador positivo).
- **Próximo:** o C43, parte 3 (o navegador de itens e atores; o tema no resto do Foundry), ou o C42.

### Ciclo 172 (2026-10-25): o C43, parte 1, as fórmulas: o `red`, o `dmg` e o crítico por arma e munição (sessão KouArt, com o Codex)

Commit anterior: `10fad5ce` (o ciclo 171, o C43 parte 2, da sessão Junin). O código e os testes saíram do Codex (`codex
exec`, numa worktree própria a partir do `7ad7e05b`), revisados e integrados aqui pelo patch. Era o ciclo 171; a sessão
Junin publicou o 171 durante o G4 deste, e o número passou para o 172.

- **As fontes:** a 0.93 do CORE, que a mesa não usava (`fvtt-cyberpunk-red-core-dev/src/modules/`:
  `rolls/cpr-die-extended.js:255-294`, o `red`, e `:303-377`, a gramática do `dmg`, `ab` e `cd`;
  `hooks/chat/add-damage-application.js:19-44`, a ablação 1 e o bônus 5 do marcador;
  `datamodels/item/mixins/attackable-schema.js:29-53` e `datamodels/item/ammo-datamodel.js:60-85`, os campos e a
  quantidade zero; `item/mixins/cpr-attackable.js:280-296`, a munição que substitui a configuração inteira;
  `rolls/sanitize-damage-formula.js:27-55`, os marcadores tirados da fórmula). A regra continua a da wiki: o crítico do
  d10 (`system-rules.js:457` e `:487`), dois ou mais 6 dão +5 (`:463` e `:549`; a Power de 2077, +10,
  `system-2077.js:156`), a borracha sem lesão nem ablação (`system-catalog.js:197`). A API do Foundry 14:
  `client/documents/chat-message.mjs:518-561` (o `_preCreate` que pode esperar) e `client/dice/terms/term.mjs:183-185`.
- **O que muda:**
  - **`scripts/regras-formulas.mjs` (novo, sem Foundry):** o `red`, o `dmg` com `ab` e `cd`, o crítico configurável (a
    quantidade de 6 e o bônus), a precedência da munição e os marcadores tirados da fórmula da arma;
  - **`scripts/dado-red.mjs` (novo):** o dado do sistema (`CONFIG.Dice.terms.d` passa a ser o `DadoRED`, uma classe filha
    do `Die`, também registrada em `termTypes` para a reconstrução do chat e das macros), com os modificadores `red`,
    `crit` (o mesmo), `dmg`, `ab` e `cd`; o dado extra do `red` não explode, não é rerrolado e acompanha o original no
    keep e no drop;
  - **o chat:** a classe das mensagens (`CONFIG.ChatMessage.documentClass`) ganha o `_preCreate` que transforma a
    rolagem com `dmg` no cartão de dano do sistema (o mesmo do dano à parte: "Aplicar dano", "Rolar a lesão", o
    Desfazer); o `/red` de dano passa pelo mesmo cartão, com o título, a descrição, o total e a ablação de antes;
  - **a arma e a munição:** `system.critico` na arma (`seis`, padrão 2; `bonus`, vazio = o padrão do perfil) e na
    munição (`substitui`, `seis`, `bonus`), os campos na ficha do item e o cartão do dano com a regra efetiva do crítico.
    Sem passo de migração: os padrões do `DataModel` servem aos itens antigos.
- **As dúvidas e as diferenças:**
  - **a borracha:** o campo novo não absorve o veto da lesão da borracha (a 0.93 migrou a borracha para "nunca crítico",
    `seis: 0`); aqui o passo antigo do G4 espera o crítico com +5 e nenhuma lesão, então a borracha continua com o
    crítico e o +5 e sem a lesão, como antes. A relação entre esse +5 e a borracha fica para a mesa;
  - o bônus vazio da arma é o padrão do perfil (+5 do RED, +10 da Power); na 0.93 o campo começa em 5;
  - o `/red` e o `crit` continuam (a 0.93 tirou o `/red`); os marcadores saem da fórmula da arma ao rolar, sem regravar
    o campo de dano; o `dmg` avulso conta o máximo do dado (no d6, o 6), como a 0.93.
- **Testes:**
  - **G3:** `formulas.test.mjs` (14 testes, com métodos reais do CORE), `critico-itens.test.mjs` (2, os campos e os
    padrões) e `rolagens-formulas.test.mjs` (9, a integração dos campos, da rolagem e da criação da mensagem); o Codex
    conferiu também 11 casos com o código real do `Die` do Foundry 14, inclusive a serialização;
  - **G4:** três passos novos, depois das conveniências do C26: `/r 1d10red` (10 + 10 = 20 e 1 − 1 = 0, sem cadeia) e o
    `crit`; `/r 2d6dmgab2cd10` com dois 6 (12, bônus 10, ablação 2, os dois botões, o "Aplicar dano" no alvo marcado, o
    HP e o SP, o Desfazer e a lesão); a arma com crítico em três 6 e bônus 9 pela ficha, o campo vazio de volta ao padrão,
    a munição que troca para dois 6 e bônus 7, o ataque de verdade, a quantidade 0 e a borracha.
- **Portões:** G1, 243 arquivos sem erro; G2, nenhum erro; G3, 562/562; G4 completo, 275/275, com a checagem dos dois
  navegadores sem avisos ou erros de JS (o dado e a mensagem novos passaram por todos os passos antigos). Depois de juntar o ciclo 171 (o C43 parte 2,
  da sessão Junin), na árvore juntada: G1, 245 arquivos; G2, nenhum erro; G3, 564/564; G4, 276/276.
- **Mutações:** as oito do Codex caíram, uma por vez, e os arquivos voltaram exatos: no G3, o `red` que subtrai no 10
  (M1), o `cd` ignorado (M2), a quantidade 0 com crítico (M3), a munição que substitui ao contrário (M4) e o bônus da arma
  que nasce 5 (M7); no G4, o 1 do `red` que soma (M5: caem também o teste de perícia, a falha crítica da arma, o `/red`,
  os veículos e a checagem de avisos), o cartão com a ablação 1 (M6) e o campo da munição gravado em outro lugar (M8).
- **Próximo:** o C44 (a régua com Andar e Correr) e o C35 (a cena da arquitetura), da mesma rodada.

### Ciclo 173 (2026-10-25): o C44, a régua com Andar e Correr (sessão KouArt, com um worker)

Commit anterior: `d8941fdf` (o ciclo 172, o C43 parte 1). O código e os testes saíram de um worker (`workers:artesao`),
numa worktree própria a partir do `7ad7e05b`, revisados e integrados aqui pelo patch. Na integração, a configuração nova
e o passo do G4 caíram nos mesmos lugares da configuração do marcador de turno (o ciclo 171) e dos passos do C43 parte 1
(o ciclo 172): os dois lados ficaram.

- **As fontes:** o CORE 0.92.4 (`modules/hooks/external/drag-ruler.js:13-30`, as faixas "walk" e "run" com as cores
  0x00ff00 e 0xff8000; `modules/actor/cpr-actor.js:349-351`, walk = MOVE × 2 e run = MOVE × 4), a wiki
  (`system-rules.js:499`, "anda até MOVE × 2 m"; `:501`, correr; `:514`, o movimento e o caído; `:535`, o agarrado;
  `:538`, o motorista) e as contas que o sistema já tem (`regras-estados.mjs`, `estados.mjs`: `movimentoDe` e
  `corridaDe`, o C41 parte 1). No Foundry 14, a `TokenRuler` (`client/canvas/placeables/tokens/ruler.mjs`: o
  `_shouldRenderWaypoint`, o rótulo, o `_getSegmentStyle` e o `_getGridHighlightStyle`) e o custo do movimento
  (`placeables/token.mjs:5767`; o histórico do turno, `documents/token.mjs:3178` e `documents/combat.mjs:1137`).
- **O que muda:**
  - **`scripts/regras-regua.mjs` (novo, sem Foundry):** as cores (as do CORE e o vermelho de longe demais), os rótulos,
    `faixasDaRegua` (pelo `movimentoPorEstado` e pelo `corridaPorEstado`, sem outra conta do MOVE) e `faixaDoGasto` (o
    limite dentro da faixa, arredondado como o rótulo);
  - **`scripts/regua-movimento.mjs` (novo):** `registrarReguaMovimento` embrulha a `TokenRuler`, como o `regua-dv.mjs`:
    a cor da linha e dos quadrados pela faixa do gasto até cada ponto, o ponto da divisa desenhado (a linha muda de cor
    ali) e "Andar" ou "Correr" no rótulo; só o personagem e o capanga, com a configuração ligada;
  - **a configuração** "Andar e Correr na régua do token" (deste navegador, ligada), registrada antes da DV do C26, para
    o rótulo ficar "12 m · Correr · DV: 15 Pistol".
- **As diferenças e as dúvidas:** não precisa do módulo Drag Ruler; as cores são fixas (no Drag Ruler o usuário podia
  mudar); o vermelho não vem do CORE nem do Foundry 14 (que não tem faixas de velocidade; o "unreachable" dele é o caminho
  bloqueado); não há os `bonuses.walk` e `bonuses.run` do CORE (os efeitos que mudam o MOVE entram pelo MOVE preparado);
  o caído e o agarrado não têm faixa nenhuma (o CORE não olhava estado); a conta é pelo custo do Foundry (escalar e
  saltar já custam o dobro, como `:514`; nadar não); o motorista fica com Andar (a wiki `:538` diz que ele não usa mais
  Ações de Movimento, mas o `movimentoDe` não sabe de veículo: mudar isso é fora deste item); além de Correr, o rótulo só
  mostra os metros; a configuração é do navegador (podia ser do mundo, se o mestre deve decidir por todos).
- **Testes:**
  - **G3:** `regua-movimento.test.mjs` (novo, 6 testes: as cores lidas do `drag-ruler.js`; o walk e o run do trecho do
    `cpr-actor.js` contra as faixas para MOVE 1 a 10; os textos da wiki; os estados; a faixa nos limites; a configuração;
    os embrulhos sobre uma `TokenRuler` falsa);
  - **G4:** um passo novo, depois das conveniências do C26: a régua montada com o movimento planejado como o do arrasto
    (o caminho completo e o custo de cada trecho, para o rótulo não sair "∞"), o personagem com MOVE 4 numa cena de 2 m
    por quadrado a 6, 12 e 20 m (a cor de cada trecho e quadrado e o rótulo), o caído e a configuração desligada.
- **Portões:** G1, 248 arquivos sem erro; G2, nenhum erro; G3, 570/570; G4 completo, 277/277, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos: no G3, a cor de Correr (M1), o limite de
  Andar de fora (M2), Correr pela própria conta (M3), a linha que não muda na divisa (M4), a configuração ao contrário
  (M5), o rótulo sem a faixa (M7) e a grade sem a cor (M8); no G4, a régua registrada depois da DV (M6, que só o G4 pega)
  e a M4 também.
- **Próximo:** o C35 (a cena da arquitetura), da mesma rodada.

### Ciclo 174 (2026-10-25): o C35, a cena da arquitetura (sessão KouArt, com um worker)

Commit anterior: `e8030d1d` (o ciclo 173, o C44). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `7ad7e05b`, revisados e integrados aqui pelo patch, sem conflito.

- **As fontes:** o CORE 0.92.4, `modules/item/types/cpr-netarch.js` (as medidas, `:19-30`: a grade de 110 px, a ligação
  de 1, o andar de 3 × 3 e a margem de 2; a posição do andar, `:151-164`; a seta antes de cada andar, `:181-201`; o
  cotovelo do primeiro andar de cada ramo, `:203-338`; achar a cena pelo nome e apagar os Tiles, `:98-121` e `:387-393`;
  copiar o modelo, `:353-366`; mostrar a cena ao mestre, `:340`), o botão (`cpr-item-sheet.js:330-350`, só o mestre; o
  `cpr-netarch.hbs`) e o modelo da cena nos compêndios (`scene.netarch.template.yaml`: a grade de 110 e 8 "bit", 3840 ×
  2160, fora da navegação, sem margem). No sistema, as cores dos tipos (`tema.css`) e a ordem de quem manda no andar
  (`netrun/janela.mjs:52-55`).
- **As imagens:** o `CREDITS.md` do CORE (`fvtt-cyberpunk-red-core-dev/CREDITS.md:27`) diz que as imagens dos andares e a
  cena são do SolutionMaps (Patreon), sem dizer a licença: nada delas foi copiado. O andar é um ícone do Foundry
  (`icons/svg/*`, CC-BY 3.0, citado pelo caminho, como o sistema já faz) tingido na cor do tipo, com um rótulo.
- **O que muda:**
  - **`scripts/arquitetura.mjs`:** `CENA` (as medidas do CORE), `QUEM_MANDA` (o inimigo, a senha, o nó de controle e o
    arquivo, nessa ordem, como a cor do andar na janela da NET) e `desenhoDaCena(arq)` (sem Foundry: cada andar com a
    posição, o tamanho e o tipo; cada ligação com os pontos da linha; o tamanho da cena);
  - **`scripts/ficha-arquitetura.mjs`:** `gerarCena(item)` (só o mestre; a trava do clique duplo; um Tile por andar, um
    Drawing com o rótulo e uma linha por ligação; a cena achada pela flag da arquitetura e atualizada, tirando só o que
    a geração pôs; criada fora da navegação e sem ativar; no fim, o mestre a vê) e o botão "Gerar a cena" no mapa (um
    link com o papel de botão, porque a ficha só de leitura do compêndio desliga os botões do formulário).
- **As diferenças em relação ao CORE:** um Tile por andar, não por linha; o ícone tingido e o rótulo no lugar das imagens
  do SolutionMaps; uma linha por ligação, que passa pelo centro das setas de 110 px do CORE; os ramos fora do caso
  simples (um buraco no ramo, um pai fora da linha de cima, um ramo que começa no andar 1) seguem o pai do mapa da ficha
  (o CORE deixa uma seta solta ou desenha o cotovelo fora da cena, e ordena os andares como texto); a cena é achada pela
  arquitetura, não pelo nome (o CORE apagaria os Tiles de qualquer cena com o mesmo nome); a cena não é ativada (o modelo
  do CORE vem ativo) e cresce até o andar 18 e o ramo H (o modelo fixo do CORE corta no andar 8 e no ramo D); o fundo é a
  cor do tema; o botão é só do mestre (no CORE aparece para todos e dá erro). Ficou de fora o "Customize Scene
  generation" (medidas próprias, cena existente, a versão animada).
- **Dúvidas para a mesa:** a grade de 8 "bit" é a do modelo do CORE, e a régua do C44 e o alcance de um ponto de acesso
  nessa cena mostram números sem sentido (os 2 m do sistema seriam a alternativa); a visão dos tokens fica ligada, como
  no CORE (o jogador sem token na cena não vê nada; para mostrar o mapa à mesa, talvez desligar); um andar gerado que vire
  ponto de acesso sai ao gerar de novo (o ponto deve ficar num Tile próprio do mestre); os ícones do demônio e do
  netrunner foram escolhidos aqui.
- **Testes:**
  - **G3:** `cena-arquitetura.test.mjs` (novo, 6 testes: as medidas lidas no código do CORE; a Clínica de ripperdoc do
    compêndio com os 8 andares nos lugares do CORE e as 8 ligações; o centro de cada uma das 12 setas do CORE numa linha,
    e nenhuma linha fora delas; quem manda no andar, os ramos com buraco, o ramo que começa no andar 1 e a cena do andar
    18 e do ramo H; o botão só para o mestre);
  - **G4:** um passo novo, depois do "arquitetura pelas tabelas": a ficha trancada da Clínica com o clique duplo (uma
    cena só), os 8 Tiles, os 8 rótulos e as 8 linhas com os pontos do CORE, a cena (o tamanho, a grade, sem margem, não
    ativa, fora da navegação, vista pelo mestre), um Tile do mestre que fica ao gerar de novo, a arquitetura sem andares
    e o jogador sem o botão.
- **Portões:** G1, 249 arquivos sem erro; G2, nenhum erro; G3, 576/576; G4 completo, 278/278, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos: no G3, o cotovelo errado (M1), a cena que não
  cresce (M2), quem manda ao contrário (M3) e o botão para todos (M8); no G4, a segunda cena (M4), o Tile do mestre
  apagado (M5), sem a trava do clique duplo (M6) e o desenho do vazio em todo andar (M7).
- **Próximo:** na Fase 7, o C42 (Dice So Nice: esperando a decisão do usuário) e o C43 parte 3 (o navegador de itens e
  atores; o tema no resto do Foundry). O C45 (tokens dinâmicos) está com a sessão Junin.

### Ciclo 175 (2026-10-25): o C46, parte 1, o ator e a ficha do veículo (sessão KouArt, com o Codex)

Commit anterior: `ca1e63d2` (a reserva do C46). Pedido do usuário (2026-10-25): o veículo com token próprio, no modelo
híbrido (o ator na cena guarda o estado físico; o item na ficha do personagem continua como a posse, e a wiki e a loja não
mudam). O código e os testes saíram do Codex (`codex exec`, numa worktree própria a partir do `ca1e63d2`), revisados e
integrados aqui pelo patch.

- **As fontes:** o CORE 0.92.4 tem o veículo só como item (`modules/item/types/cpr-vehicle.js:7`; os padrões em
  `datamodels/item/vehicle-datamodel.js:18-41`: SDP 50, 2 assentos, MOVE 20); a recusa da iniciativa segue a do
  contêiner (`combat/cpr-combat.js:68-78`); a mesa da wiki do master (`Tabletop/README.md:104` e `:109`, o SDP na barra,
  2 quadrados e o veículo fora da iniciativa; `Tabletop/mesa-api.js:1589-1590`); a conta do dano é a do C15
  (`regras-veiculos.mjs:27-35`, confirmada pelo usuário em 2026-10-18), sem mudança nem cópia; a wiki
  (`system-rules.js:515`, `:518`, `:521` e `:538`; `system-2077.js:41`, a Tech); o Foundry 14
  (`client/documents/actor.mjs:492-529`, `combatant.mjs:228-232`, `token.mjs:1545-1549`).
- **O que muda:**
  - **o tipo de ator `veiculo`** (`system.json`, `lang/pt-BR.json`, `scripts/dados.mjs`): um pedaço de esquema comum ao
    item e ao ator (o SDP, o SP e a ablação do chassis, os assentos, as velocidades, o tipo), com os nomes e os padrões
    do item, que não muda; o ator prepara o SDP dentro do máximo e a blindagem atual e máxima pela ablação;
  - **`scripts/regras-ator-veiculo.mjs` (novo, sem Foundry):** os números e a imagem do catálogo para o ator e o padrão do
    token (solto, 2 × 2, o SDP na barra);
  - **`scripts/ficha-veiculo.mjs` e `templates/veiculo/` (novos):** a ficha (o catálogo, o SDP, o SP com o "−1" e o
    "Consertar", os assentos, as velocidades, o tipo, as notas; o observador só lê; as ações conferem o dono e a edição, e
    o catálogo relê a permissão e a escolha depois de carregar);
  - **a iniciativa** (`scripts/iniciativa.mjs`, `scripts/regras-iniciativa.mjs`): o veículo não entra (o rastreador, o
    combatente, a rolagem pelo combatente e a rolagem em lote), com um recado `info`; um registro antigo de veículo é
    pulado sem impedir os outros;
  - **o ataque** (`scripts/combate/`): o token do veículo vira o destino "veículo" do C15 sozinho, sem ler atributos de
    pessoa e sem esquiva; o tiro, o autofogo, o corpo a corpo e a área usam a conta do C15; o supressivo direto é recusado
    e o automático ignora veículos; as munições sem dano do C14 não fazem nada na estrutura; o Desfazer e o "Aplicar
    dano" manual alcançam o ator;
  - **os filtros:** a wiki (o envio, a transferência, os vínculos), o Painel Tático e o botão dos perigos do C38 ficam
    só com quem tem HP; a imagem padrão do tipo (o C34.3, o `Default_Vehicle` do CORE).
- **Na integração:** a ficha tinha o cabeçalho, o corpo e o rodapé numa parte só, e o Foundry 14 recusa desenhá-la
  ("Template part must render a single HTML element", `client/applications/api/handlebars-application.mjs:172`): o G4
  pegou ("Failed to render Application"), o G3 não. A ficha passou para três partes (`topo`, `corpo` e `rodape`), como a
  do capanga, e o `partes-da-ficha-veiculo.test.mjs` (novo) confere um elemento raiz por parte.
- **Dúvidas e diferenças:** o ator não se liga ao item do personagem nem há migração (a parte 2); a mesa da wiki deixa o
  mestre pôr o veículo na iniciativa à mão, e aqui a recusa é geral; o corpo a corpo contra a estrutura pede a DV ao
  mestre, como o C15; escolher um veículo do catálogo põe o SDP cheio e o chassis sem ablação e conserva as notas.
- **Testes:**
  - **G3:** `ator-veiculo.test.mjs` (6: o catálogo, o esquema, a preparação, o token, as permissões e a seleção, os
    controles do SP), `veiculo-ator-combate.test.mjs` (8, com o resolver e o cartão de verdade: o tiro crítico e a AP, a
    Tech, a arma branca, o autofogo, a área, o C14, o supressivo, o dano manual, o Desfazer pela diferença),
    `veiculo-iniciativa-guardas.test.mjs` (8: a iniciativa, a migração, a wiki, o Painel, os perigos) e
    `partes-da-ficha-veiculo.test.mjs` (1); o `acessibilidade.test.mjs` varre os templates do veículo; o
    `imagens-padrao.test.mjs` e o `regras.test.mjs` ganham o tipo novo;
  - **G4:** seis passos novos, depois do "veículos (C15), combate e Desfazer": a ficha e o token (o catálogo, o SP, a
    barra, o 2 × 2, os tokens independentes, a iniciativa recusada por quatro caminhos, o observador); o tiro a 10 m (DV16,
    24 − SP13 = 11 SDP, a AP abla 2, sem +5 nem lesão) e o Desfazer pelo cartão, que conserva o dano posterior; a granada
    marcada numa pessoa que alcança o veículo; o autofogo, a arma branca e a Tech; o dano manual; o EMP e o supressivo.
- **Portões:** G1, 256 arquivos sem erro; G2, nenhum erro; G3, 602/602; G4 completo, 284/284, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as nove caíram no G3, uma por vez, e os arquivos voltaram exatos: o catálogo sem o SDP (M1), a blindagem
  sem a ablação (M2), o token ligado e pequeno (M3), o SP sem dono (M4), o veículo no rastreador (M5), o +5 no SDP (M6),
  o Desfazer sem o ator (M7), o dano manual sem o veículo (M8) e a ficha numa parte só (M9).
- **Próximo:** o C46, parte 2 (a ligação com o item do personagem e a migração dos veículos que já existem).
### Ciclo 176 (2026-10-25): C45, parte 1, os tokens dinâmicos: o conjunto, a escolha da imagem e a gravação no token (sessão Junin)

- **Pedido do usuário (2026-10-25), fora da comparação com o CORE:** a imagem do token muda pela direção, pela arma
  equipada, pelo ferimento e por caído/inconsciente. Decisões dele, pela folha de exemplo (8 direções em vista de cima 3/4,
  com as linhas Parado, Caminhando e Mirando e as poses Ferido leve, Ferido grave, Incapacitado e Morto): armado ou não;
  parado e ferido, a pose de ferido; andando ou mirando, as 8 direções; mortal, inconsciente e estase, Incapacitado; o
  Caminhando só durante o movimento; a pasta com nomes padronizados e a janela; um cortador de folha. Fora por agora:
  Correndo, Salto, Agachado e Levantando.
- **O Foundry 14 (estudado no código, 14.369):** o giro automático no movimento é do núcleo (`core.tokenAutoRotate`, padrão
  ligado; `TokenDocument#_preUpdateMovement` grava o `rotation` no arrasto e no teclado); o `_preUpdate` roda antes do hook
  `preUpdateToken` (`client/data/client-backend.mjs:238-239`), então o hook já vê o giro novo; o `lockRotation` deixa a
  imagem em pé (`mesh.angle = 0`); trocar o `texture.src` anima com o filtro de transição (fade, glitch, hologram...). Os
  módulos Swapper (direção) e Visage (estado) escrevem a mesma textura e não conhecem o sistema: o mecanismo é próprio.
- **Entrega:** `regras-token-dinamico.mjs` (a regra pura: as 29 chaves, `poseDoToken`, `direcaoDaArte` com a calibração,
  `imagemDoToken` com os recuos, `chaveDoArquivo` e `imagensDaPasta` para os nomes, `conjuntoValido`) e
  `token-dinamico.mjs` (o estado do ator, a imagem para o token, o `preUpdateToken` que põe a imagem no mesmo update do
  giro, o `preCreateToken`, os ganchos do ator, dos itens e dos efeitos que agendam a gravação pelo mestre ativo, a janela
  `token-dinamico` e o botão no HUD do token). O conjunto fica em `flags.cpr-fieldbook.tokenDinamico` (sempre completo),
  com a imagem de antes (`base`) e o giro de antes (`travaAntes`) guardados da primeira vez. O `wiki-retrato.mjs`, com o
  conjunto ligado, troca a base (import dinâmico, para o teste do G3 continuar sem Foundry).
- **Leitura minha:** caído sem a pose Caído usa a Incapacitado; Morto sem imagem também; o último recurso é o Parado, e
  sem nada, a base. A direção que falta usa a mais perto, e no empate a do sentido horário.
- **Limites:** parado e ferido, o token fica na pose de ferido também logo depois de andar (a direção andando é da parte 2,
  na tela de cada um). Num movimento com vários pontos, vale a direção do último trecho (o Foundry grava um giro só). Ler a
  pasta pede a permissão de procurar arquivos (o mestre). A troca do retrato da wiki com o conjunto ligado não tem passo
  no G4.
- **Integração:** a KouArt publicou os ciclos 173 (o C44), 174 (o C35) e 175 (o C46, parte 1, o veículo como ator) no
  meio; o ciclo passou de 173 para 176, com um conflito de acréscimo no MIGRATION_STATUS (as duas versões).
- **Portões:** G1, 205 arquivos com sintaxe válida depois da integração; G2, ESLint 10.12.0 sem erros; G3, 607/607 (5 testes
  novos em `tests/sistema/token-dinamico.test.mjs`); G4 completo antes da integração, 278/278 em 586 s ; o da árvore
  integrada (3ace7e33), 285/285 em 624 s, sem aviso nem erro do sistema no Foundry 14.369, sem aviso nem erro do sistema, com o passo novo: a pasta com imagens de teste (enviadas
  pelo `FilePicker.upload`), "Ler a pasta" (10 das 29), ligar, o token novo em pé, o movimento em quatro direções (a
  diagonal sem imagem cai no 0), a arma (Mirando a 270), o ferimento (leve, e o grave no leve), parado e ferido depois de
  andar, caído e estase (Incapacitado), morto, a calibração no sentido contrário, o capanga de token solto e desligar.
- **Mutações:** 25 caíram, restauradas pelo md5: 12 da regra pura (G3) e 13 no Foundry (G4 focado). Duas sobreviveram na primeira rodada: o desempate da direção (o empate do teste caía igual sem ele; entrou um empate em que a ordem da lista e o sentido horário discordam) e o preCreateToken (o protótipo já tinha a imagem; o token passou a nascer com a arma já equipada depois de salvar).
- **No G4 completo, o Foundry 14 gravou e não preparou:** ao desligar, o token ficou com o `_source.texture.src` certo (a base) e o `texture.src` preparado com a imagem de antes, sem efeito, override ou erro (o `reset()` à mão acertava). Só aparecia no G4 completo, e quatro rodadas instrumentadas mostraram isso. O `gravarNoToken` confere depois de gravar: se o campo preparado não bate com o gravado, `reset()` e redesenha o token na tela. O passo também relê o token e a cena pelo `game.scenes` (as instâncias trocam no G4 completo).
- **No caminho:** o `getDependentTokens` sem `concreteOnly` traz as cópias de prévia do token, e o update delas falha ("You
  must provide an _id..."): os tokens do ator são só os concretos.

### Ciclo 177 (2026-10-25): o C46, parte 2, o veículo do personagem ligado ao ator (sessão KouArt, com o Codex)

Commit anterior: `19d8c624` (o registro do ciclo 176, o C45 parte 1, da sessão Junin). O código e os testes saíram do
Codex (`codex exec`, numa worktree própria a partir do `c1d8b42b`), revisados e integrados aqui pelo patch, sem conflito.

- **A decisão de desenho** (2026-10-25, para não migrar nada; o ROADMAP, C46): o item `veiculo` na ficha do personagem
  continua sendo o lugar do estado (o SDP, a blindagem, os vidros, os upgrades e as armas montadas, que a wiki, a loja e
  o C15/C40 usam), e o ator Veículo ligado é o espelho dele na cena. Não há passo de migração: o veículo que já existe
  ganha o ator quando for posto na cena. O ator de NPC (a parte 1) continua com o próprio estado.
- **As fontes:** o CORE tem o veículo só como item (`modules/item/types/cpr-vehicle.js:7`; os campos em
  `datamodels/item/vehicle-datamodel.js:18-39`; a soma dos upgrades em `item/mixins/cpr-upgradable.js:32-43`); a conta do
  dano é a do C15 (`regras-veiculos.mjs:27-35`), sem mudança; o Foundry 14 (`client/documents/actor.mjs:337-373`, o token
  na cena explícita; `client/data/client-backend.mjs:238-250` e `:500-543`, o `_preUpdate` e o `dryRun`).
- **O que muda:**
  - **`scripts/regras-vinculo-veiculo.mjs` (novo, sem Foundry):** os números do item para o ator (os máximos com os
    upgrades, sem somar duas vezes), a edição dos máximos no ator devolvida à base do item (sem o bônus dos upgrades) e a
    ligação válida só quando os dois documentos e o dono concordam;
  - **`scripts/vinculo-veiculo.mjs` (novo):** "Pôr na cena" (o mestre ativo cria, uma vez por item, o ator ligado com os
    donos do personagem, na pasta "Veículos dos personagens", e o token ligado perto do personagem; reaproveita o ator e
    o token da cena; o jogador pede pelo socket do sistema, com 15 segundos de espera; sem mestre, recusa); o espelho (o
    mestre ativo copia o estado do item para o ator e os tokens, a cada mudança do personagem e dos itens dele e na
    entrada; as gravações no ator ligado vão primeiro ao item, pelo `_preUpdate`, com uma marca contra o laço); a cópia do
    personagem, o arrasto do item e o crossover sem a ligação; apagar o ator desliga o item, e apagar o item ou o
    personagem deixa o ator como NPC com o último estado;
  - **`scripts/veiculos.mjs`:** o dano e o Desfazer no ator ligado usam o item e a mesma fila, para não perder dano
    enquanto o espelho atualiza;
  - **as fichas:** o botão na linha do veículo e na ficha do item; a ficha do ator ligado com o dono e o link, sem o
    catálogo; o `token-dinamico.mjs` (o C45 parte 1) deixa o veículo fora das poses.
- **Dúvidas:** o espelho depende do mestre ativo e se acerta na entrada dele; apagar a posse sem mestre e sem permissão
  no espelho deixa o ator com o último estado gravado, que o mestre acerta ao entrar. A atualização da wiki com o id do
  item preservado foi conferida pelo `item.update`; o fluxo HTTP inteiro do "Atualizar da wiki" fica para a sessão de
  teste com a mesa.
- **Testes:**
  - **G3:** `vinculo-veiculo.test.mjs` (6, a conta pura) e `vinculo-veiculo-aplicacao.test.mjs` (17, o código de verdade com
    documentos de mentira: os upgrades sem soma dupla, a edição dos máximos, as permissões, a ligação recíproca, a criação
    concorrente, o socket, as cópias, as exclusões, o `dryRun`, o C45 e o dano com o espelho atrasado); o
    `ator-veiculo.test.mjs` ganha 2 da ficha ligada;
  - **G4:** quatro passos novos, depois do "veículo ator (C46.1), C14 e supressivo": Pôr na cena (os botões, os donos, a
    pasta, o token ligado perto, de novo sem duplicar, o SP13 e o vidro, o link, fora do C45); o dano e o espelho (o tiro
    direto, o Desfazer pelo cartão, o C15 pelo ocupante, a ablação, o conserto e a edição, lidos nos dois navegadores); o
    jogador dono (o pedido ao mestre, sem permissão no ator no começo, e a recusa sem mestre); a ligação e as exclusões (a
    cópia e o crossover, o item com o id preservado, o máximo 70 pelo upgrade).
- **Portões:** G1, 263 arquivos sem erro; G2, nenhum erro; G3, 632/632; G4 completo, 289/289, com a checagem dos dois
  navegadores sem avisos ou erros de JS.
- **Mutações:** as oito do Codex caíram no G3, uma por vez, e os arquivos voltaram exatos (o item preparado que soma os
  upgrades de novo, M1; a edição do máximo com o bônus na base, M2; a ligação sem o dono, M3; o dano no ator fora do item,
  M4; a edição no ator que não grava no item, M5; o token que não se reaproveita, M6; a cópia que leva a ligação, M7; o
  ator apagado que não desliga o item, M8); a M6 caiu também no G4.
- **Próximo:** o C46, parte 3 (a tripulação: embarcar, descer, o motorista e mover junto).

### Ciclo 178 (2026-10-25): C45, parte 2, os tokens dinâmicos: o Caminhando no movimento, as transições e a pré-carga (sessão Junin)

- **Decisões do usuário (2026-10-25):** o Caminhando só durante o movimento, na tela de cada um, sem gravar; andando ou
  mirando, as 8 direções.
- **O Foundry 14 (no código, 14.369):** na animação do movimento com o giro automático, o `Token` anima o `rotation`
  trecho a trecho (`#onUpdateAnimation`, o `animate({rotation})` encadeado por trecho, mesmo com o `lockRotation`), e o
  `Token#_animate` põe os valores animados no próprio documento (`mergeObject(this.document, #animationData)`, linha 2379)
  e chama o `_onAnimationUpdate` a cada quadro. **Isso explica o achado do ciclo 176:** a textura de uma transição que não
  acabou fica no `texture.src` preparado; com o Edge sem janela, que atrasa as animações, o token parecia gravado e não
  preparado.
- **Entrega:** a classe do token do sistema (`classeDoToken`, sobre o `CONFIG.Token.objectClass`) só acrescenta ao
  `_onAnimationUpdate` o quadro do movimento: a imagem da pose com `andando` (o Caminhando; armado, o Mirando) na
  direção do giro daquele quadro, trocando só o desenho (`texture` e `mesh.texture`, quando o quadro muda) e, quando a
  promessa do movimento acaba, o `redraw` com a imagem gravada. O `preUpdateToken` grava a troca pela direção sem
  transição (`animation.duration` 0); o `gravarNoToken` usa a configuração do mundo "Token dinâmico: transição" (glitch,
  esmaecer, holograma ou nenhuma). A pré-carga (`TextureLoader.loader.load`) das imagens dos conjuntos ligados ao salvar
  (o conjunto em si), no `canvasReady` e no `createToken`. Regras puras novas: `TRANSICOES`, `animacaoDaTroca`,
  `ANIMACAO_DA_DIRECAO`, `imagensDoConjunto`.
- **Limites:** o quadro do Caminhando é um só por direção (sem a animação de passos); a pose de ferido, parado, volta no
  fim do movimento. O vídeo (webm) como quadro não foi testado.
- **Portões:** G1, 209 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 633/633 (1 teste novo em
  `tests/sistema/token-dinamico.test.mjs`); G4 completo da árvore integrada, 290/290 em 605 s no Foundry 14.369, sem aviso nem erro do sistema (uma rodada antes deu 289/290: o passo "veículo ator (C46.2), jogador dono" da KouArt, sem o ator do veículo; passou na rodada seguinte, sem mudança), com o passo novo: a classe, a pré-carga, dois trechos
  (o Caminhando a 90 e depois a 180) no mestre e no jogador (gravados pela atualização da animação nos dois navegadores),
  a imagem gravada de volta no fim, o Mirando andando armado, a troca da direção sem transição e a do estado com glitch e
  com nenhuma.
- **Mutações:** 11 de 12 caíram, restauradas pelo md5: 4 da regra pura (G3) e 7 no Foundry (G4 focado). Sobreviveu o "não volta ao gravado" (o redraw do sistema no fim do movimento): o próprio Foundry redesenha o token no fim da animação do movimento (a última atualização da animação leva a textura), também no movimento ferido em que a imagem gravada não muda, que entrou no passo para isso; o redraw do sistema fica como garantia.
- **No caminho:** o primeiro jeito de ver o quadro no teste (o ticker do canvas) perdia o primeiro trecho no mestre, com
  o Edge sem janela; a atualização da animação, não. A pré-carga ao salvar passava pelos tokens do ator, que ainda não
  existiam: passou a carregar o conjunto em si.
- **Integração:** a KouArt publicou o ciclo 177 (o C46, parte 2, o veículo como ator, com mudanças no `token-dinamico.mjs`: o veículo recusa o conjunto, a janela e o botão) no meio; o teste dela registra os ganchos do token dinâmico num ambiente sem `game.settings`, e a configuração e a classe do token passaram para um `registrarTelaDoTokenDinamico` à parte, no init. O ciclo passou de 177 para 178.
- **Próximo:** o cortador da folha (a parte 3).

### Ciclo 179 (2026-10-25): C45, parte 3, os tokens dinâmicos: o cortador da folha (sessão Junin); o C45 fecha

- **Decisão do usuário (2026-10-25):** as imagens chegam como a folha inteira (como a de exemplo) e um cortador separa a
  grade em arquivos; a folha precisa ter fundo transparente (a de exemplo tem fundo escuro e rótulos).
- **Entrega:** `regras-cortador.mjs` (a regra pura: a disposição da folha de exemplo, `disposicaoValida`, `celulasDaGrade`
  com a faixa do rótulo, `quadrosDaFolha` com os nomes que a janela do conjunto lê, `caixaOpaca`, `caixaComum`,
  `temFundo`, `nomeBase`) e `cortador-de-folha.mjs` (a janela `cortador-de-folha`, aberta pelo botão "Cortar uma folha"
  da janela do token dinâmico, com a prévia da grade, as linhas e as poses de cada coluna; o `cortarFolha`, que desenha a
  folha num canvas, recusa a de cantos opacos, acha a caixa comum, corta cada quadro, grava em WebP pelo
  `FilePicker.upload` e põe os quadros no conjunto pelo `salvarConjunto`). A API ganhou `abrirCortador` e `cortarFolha`.
- **Limites:** os 5 retratos redondos da folha de exemplo (fora da grade) não entram: o retrato de cada estado continua no
  Painel Tático. Tirar o fundo de uma folha opaca não é feito (só a recusa). Enviar arquivos pede a permissão de upload.
- **Portões:** G1, 212 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 637/637 (4 testes novos em
  `tests/sistema/cortador.test.mjs`); G4 completo, 291/291 em 608 s no Foundry 14.369, sem aviso nem erro do sistema, com o passo novo: uma folha 800 × 400 gerada no navegador (as
  cores por linha, a célula do Caminhando a 0° mais larga, o traço branco do rótulo), o botão da janela do token
  dinâmico, os valores padrão do cortador, a prévia, os 28 quadros com os nomes, todos 64 × 64 (a caixa comum com a
  margem), opacos no centro, com a cor da linha e sem o branco do rótulo, o conjunto preenchido e ligado, a folha com
  fundo recusada e o jogador sem a permissão de envio recusado.
- **Mutações:** 14 caíram, restauradas pelo md5: 7 da regra pura (G3) e 7 no Foundry (G4 focado). A faixa dos acentos do `nomeBase` tinha ficado escrita com os caracteres combinantes em vez do escape `\u0300-\u036f` (a mutação não achava o trecho): reescrita com o escape, e a mutação caiu.
- **No passo da parte 1:** com a transição da parte 2 (glitch), a textura preparada do token fica com a animada por um tempo, e uma leitura do passo pegou a de antes (290/291); o passo passou a ler a gravada (`_source.texture`), que é o que ele confere.
- **O C45 está `[x]`** (as partes 1 a 3 desta sessão).

### Ciclo 180 (2026-10-25): o C46, parte 3, a tripulação do veículo (sessão KouArt, com o Codex)

Commit anterior: `518f716f` (o registro do ciclo 179, o C45 parte 3, da sessão Junin). O código e os testes saíram do
Codex (`codex exec`, numa worktree própria a partir do `104ee361`), revisados e integrados aqui pelo patch. O Codex parou
no limite de uso do plano depois de terminar o código e os testes e antes do relatório: a revisão, as mutações e esta
documentação foram feitas aqui, a partir do código.

- **A referência:** a mesa da wiki do master, o M17 (`Tabletop/mesa-api.js:691-706` e `:1302-1345`: embarcar, o primeiro
  dirige, assumir, descer pelos quatro lados e depois as diagonais; `Tabletop/mesa.js:1346-1358`: a metade do tamanho e
  por cima). O CORE não tem tripulação.
- **O que muda:**
  - **`scripts/regras-tripulacao.mjs` (novo, sem Foundry):** `motivoEmbarque` (só personagem e capanga, o dono, o veículo
    visível, não estar em outro, os assentos, até 2 quadrados da borda; o mestre de longe), `ordemMotorista` (o primeiro
    dirige; assumir só troca a ordem), `posicaoEmbarcada` (no centro do veículo, metade do tamanho, por cima) e
    `posicoesDeSaida` (os quatro lados e depois as diagonais);
  - **`scripts/tripulacao.mjs` (novo):** a tripulação no token do veículo (a ordem) e a marca no token de quem embarcou
    (com o tamanho e a ordem originais); embarcar, descer e dirigir pelo mestre ativo, com o pedido do jogador pelo socket
    (relido quando chega à fila: o dono, a cena ativa, o veículo visível pela visão do jogador, sem usar a do mestre); o
    arrasto para cima do veículo embarca, e o do ocupante para fora desce; só o motorista move o veículo, e o mestre leva
    os ocupantes junto, sem custo de MOVE; a saída confere as paredes da cena do veículo e os outros tokens; apagar o
    token do veículo desembarca todos, e apagar o de um ocupante o tira da tripulação; copiar tokens não leva a
    tripulação nem o tamanho reduzido; os botões Entrar, Dirigir e Descer no HUD; o motorista do próprio veículo ligado (a
    parte 2) seleciona o item e liga o "Dirigindo" do C40, e descer ou passar a direção desliga; o motorista de um NPC ganha
    o controle do token, sem mudar a propriedade;
  - **o ataque** (`scripts/combate/apoio.mjs`, `modos.mjs`, `cartao.mjs`, `combate.mjs`): o tiro em quem está dentro
    oferece a escolha do C15 com o veículo em que ele está (o token e, no ligado, o item com as janelas), mesmo com outro
    veículo em uso; o destino é relido depois da janela de ataque.
- **Na integração:** o ajudante comum dos cinco passos do G4 devolvia `{ ...ids }` de dentro do código que roda no
  navegador, onde `ids` não existe ("ReferenceError: ids is not defined" nos cinco); ele passou a devolver só os ids novos,
  juntados do lado do Node.
- **Dúvidas:** a direção pelo ator (a direção sob pressão, as manobras e a batida do motorista de um veículo que não é o
  dele), as armas pelo assento e a régua pelo MOVE do veículo ficam para a parte 4; o jogador pode embarcar num veículo de
  NPC ou de outro dono que ele vê (a decisão desta parte; o M17 também deixa).
- **Testes:**
  - **G3:** `tripulacao.test.mjs` (a conta pura), `tripulacao-aplicacao.test.mjs` (17, o código de verdade com
    documentos de mentira: os embarques concorrentes, mover o carro, descer, o C40, apagar o token, o socket e o pedido
    relido, as cópias, o veículo oculto, a disposição secreta, a cena que deixou de ser ativa, o arrasto, o controle do
    motorista, as paredes da cena do veículo, a visão do jogador) e `tripulacao-combate.test.mjs` (o tiro no ocupante);
  - **G4:** cinco passos novos, depois dos do C46 parte 2: embarcar e o motorista (dois pelo arrasto num NPC de 2
    assentos, o terceiro recusado pelo HUD, o Dirigir, a iniciativa e o C45 no ocupante menor); o jogador no NPC (a
    distância da origem, o veículo oculto, entrar sem ser dono, dirigir e arrastar o carro pelo mestre, levando o
    capanga); mover e descer (os dois juntos, a parede, o ocupante que não anda sozinho, descer pelo arrasto e pelo HUD,
    com o tamanho, a ordem e a altura de volta); o próprio ligado e o C40 (o Dirigindo ao embarcar primeiro, ao passar e
    devolver a direção e ao descer); a proteção e a exclusão (o tiro no passageiro com o veículo dele e a janela, o SDP do
    item ligado e o Desfazer, apagar o token com a tripulação ao lado).
- **Portões:** G1 e G2 sem erro; G3, 666/666; G4 completo, 295/295, com a checagem dos dois navegadores sem avisos ou erros
  de JS. Depois de juntar os ciclos 178 e 179 da sessão Junin (o C45 partes 2 e 3), na árvore juntada:
  G1, 271 arquivos; G2, nenhum erro; G3, 670/670; G4, 296/296.
- **Mutações:** as oito caíram no G3, uma por vez, e os arquivos voltaram exatos (um a mais que os assentos, M1; embarcar
  de 4 quadrados, M2; o Dirigir que não troca, M3; o ocupante no tamanho dele, M4; mover o veículo sem a tripulação, M5; o
  ocupante que anda sozinho, M6; apagar o veículo sem tirar quem está dentro, M7; o tiro no ocupante sem o veículo dele,
  M8); a M5 e a M7 caíram também no G4.
- **Próximo:** o C46, parte 4 (as armas pelo assento, a direção, as manobras e a batida pelo ator, e a régua pelo MOVE do
  veículo).

### Ciclo 181 (2026-10-26): o C46, parte 4, o resto pelo ator: a direção, as armas pelo assento e a régua do veículo (sessão KouArt, com um worker)

Commit anterior: `b5ca8118` (a reserva da parte 4). O código e os testes saíram de um worker (`workers:artesao`), numa
worktree própria a partir do `b5ca8118`, revisados e integrados aqui pelo patch, sem conflito. Com ela, o C46 está
completo.

- **As fontes:** a wiki (`system-rules.js:538`: "o MOVE do veículo passa a ser o dele e ele não usa mais Ações de
  Movimento", e a tabela com o MOVE; `:499`, MOVE × 2 m; `:501`, Correr; `system-criacao.js:266-268`: o NOS, "uma Ação de
  Movimento a mais ao dirigir", e o lança-chamas, "o motorista dispara com a Ação"); o CORE 0.92.4
  (`cyberpunk-red-core/babele/en/cyberpunk-red-core.core_upgrades.json:166`, `:170` e `:174`: "The driver may fire it
  using an Action" e "The driver may attack with it"; `:162`, o NOS); a mesa do master (`Tabletop/README.md:161`, a
  velocidade de combate no MOVE; `mesa.js:1617-1624`, que usava × 2 e × 4 também no veículo).
- **O que muda:**
  - **a direção pelo ator** (`regras-tripulacao.veiculoDaDirecao`, `tripulacao.veiculoDirigidoPor`, `direcao.mjs`,
    `perigos.mjs`, `estados.mjs`): dentro de um token de veículo, o primeiro da tripulação dirige aquele veículo pelo
    C40, também o de NPC e o de outro dono (a direção sob pressão no começo do turno dele, pelo token do combatente; a
    **Manobra** no HUD, com a perícia pelo tipo do veículo do token); o passageiro não dirige; fora de um token de veículo,
    vale o C40 de antes, a não ser que o veículo próprio tenha token na cena; quem dirige não corre. A batida guarda o
    token de cada um: quem está num token de veículo não está a pé, e os 6d6 vão no veículo daquele token, uma vez por
    veículo (no ligado, no item), com o Desfazer pelo uuid;
  - **as armas pelo assento** (`regras-tripulacao.motivoDoAssento`, `tripulacao.atacarDoAssento`, `combate.mjs`,
    `combate/apoio.mjs`, `combate/modos.mjs`, `veiculos.mjs`, `documentos.mjs`): no carro ligado com arma montada, o
    botão **Armas do veículo** fica no HUD do motorista; só o motorista dispara (o CORE), também quem não é o dono, com a
    perícia dele e o pente da arma montada no item do dono (o mestre gasta as balas, uma vez só, as 10 do Autofogo); com
    o token do veículo na cena, a arma montada só se usa de dentro; sem ele, como o C15; quem dirige qualquer veículo não
    recarrega a metralhadora nem o lança-chamas; a arma do cyberware de outro dono continua fechada;
  - **a régua do veículo** (`regras-regua.faixasDoVeiculo`, `regua-movimento.mjs`): o token do veículo pinta a régua
    pela velocidade de combate (`system.velocidade.combate`, que no ligado vem do item), verde até MOVE × 2 m (MOVE 20:
    40 m), com "Velocidade de combate" no rótulo, e vermelha além; o C44 da pessoa não muda.
- **Decisões e dúvidas:**
  - **quem dispara:** o pedido sugeria o passageiro; o CORE diz "the driver" nas três armas montadas, e a wiki o diz do
    lança-chamas: segue o CORE, e o passageiro é recusado (confirmado pelo usuário em 2026-10-26);
  - **a régua:** a wiki não diz quantos metros o veículo anda por turno; usa MOVE × 2 m (`:538`, `:499` e o NOS), uma
    faixa só, sem Correr (`:538` e `:501`; a mesa do master usava × 2 e × 4). A Ação de Movimento a mais do NOS e o
    histórico do turno ficam com o mestre (o veículo não é combatente, e o Foundry só guarda o histórico de quem é: cada
    arrasto mede do zero);
  - **o que mudou de comportamento:** com o token do carro na cena e o dono fora dele, o dono não dirige nem dispara a arma
    montada; a batida atinge o veículo também quando só o passageiro está na lista;
  - **a origem do tiro** é o token de quem atira, que fica no centro do veículo (a parte 3): a distância e a linha de
    visão são as do carro; o cartão do dano da arma de outro dono sai com o dono como orador; o motorista que não é o dono
    não recarrega (não tem permissão nos itens do dono);
  - **ficam para depois:** as armas no veículo de NPC (o ator não tem inventário nem instalação de upgrades: pede uma
    decisão de desenho) e o `speedCombat` dos upgrades do CORE (o sistema não tem esse modificador, uma lacuna antiga).
- **Testes:**
  - **G3:** `veiculo-pelo-ator.test.mjs` (novo, 4 testes: os textos da wiki e do CORE, a direção, o assento e a régua,
    MOVE 20/40/60 dá 40/80/120 m); mais 5 em `tripulacao-aplicacao.test.mjs` (a direção do NPC e do ligado, o C40 com
    token na cena, a metralhadora pelo assento, os botões do HUD, não correr), 1 em `tripulacao-combate.test.mjs` (o
    atirador: o passageiro recusado, o motorista com o pente 30 → 20 pelo mestre, sem descontar duas vezes, o pente
    curto, o tiro único, a arma do cyberware de outro dono) e 1 em `regua-movimento.test.mjs`;
  - **G4:** cinco passos novos, depois do "veículo ator (C46.3), proteção e exclusão": a direção pelo carro de NPC (o
    começo do turno do capanga que assumiu a direção, 6 + 2 = 8, perdeu, com o botão Batida; a passageira não rola; a
    Manobra pelo HUD, 14 contra DV13; o carro aéreo, o pouso por Pilotar, 11; o passageiro recusado; o motorista não
    corre); a batida (o NPC de 50 a 33, a blindagem 12, uma vez só, o Desfazer; no ligado, o item de 43 a 32); a
    metralhadora montada (a personagem "Passageira", ao volante do carro de outra dona, atira em Autofogo no navegador do
    jogador, 14 a 6 m contra DV22, e o pente vai de 30 a 20 pelo mestre; a dona, no banco de trás, é recusada);
    recarregar dirigindo (recusado ao volante do próprio carro, recarrega como passageira, recusado ao volante do NPC); a
    régua (o NPC com MOVE 5, verde até 10 m e vermelho além; o ligado com MOVE 4 no item, 8 m; a pessoa continua com 10
    e 20).
- **Na integração:** o passo da metralhadora conferia a distância como 6, e ela é do centro do carro ao do alvo (6,3 m
  nesta cena): a conta usa os metros arredondados, e a faixa de DV continua a dos 6 m. Cinco passos antigos esperavam um
  lado da mudança e liam o outro logo depois, e falharam nas rodadas do G4 desta parte (os dois primeiros sempre, os
  outros três em uma ou duas de três): o fogo do netrunner na NET (a última mensagem "está em chamas" era a do Overheat do Capanga, de antes; agora
  só contam as da rodada), o aviso "o veículo ficou como NPC" do C46.2 (sai depois de soltar os tokens da cena), o
  cartão do vício do C16 no relógio, o dinheiro da loja do C24 (no "Comprar parte" e no estoque infinito) e o cartão de sair da estase do C41.4. Os cinco passam a
  esperar os dois lados; o código do sistema não mudou por eles.
- **Portões:** G1, 210 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 681/681; G4 completo, 301/301,
  com a checagem dos dois navegadores sem avisos ou erros de JS (as três rodadas anteriores, antes de todas as correções
  dos passos: 296, 297 e 299 de 301).
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos. No G3: todo ocupante dirige (M1, 2
  testes), o passageiro dispara a arma montada (M2, 3), a régua do veículo com Andar e Correr da pessoa (M3), o mestre
  que não gasta o pente de quem atira sem ser o dono (M6) e o motorista de token que corre (M7). No G4, um G4 inteiro
  cada: a batida no veículo próprio e não no do token (M4: o passo da batida e um aviso do sistema no navegador do
  mestre), os 6d6 duas vezes no mesmo veículo (M5: o passo da batida) e o motorista de um NPC que recarrega dirigindo
  (M11: o passo de recarregar dirigindo).
- **Próximo:** na Fase 7, o C42 (Dice So Nice: falta saber se a mesa usa) e o C43 parte 3 (o navegador de itens e o tema
  no resto do Foundry).

### Ciclo 182 (2026-10-26): C47, o Rebuild do Mission Kit (sessão Junin)

- **Pedido do usuário (2026-10-26):** "As armas de 2077 pelo Mission Kit". As armas e as classes já seguiam o Kit (o C29,
  ciclos 110 a 116, sessão KouArt); a entrada do P0 só não estava marcada. Faltava o Rebuild, que o README listava em "Ainda
  não faz".
- **Fontes:** a wiki, `system-2077.js`, Rebuilds (o Kit, p. 31–32): o Rebuild transforma uma arma de fogo do RED em Power,
  Smart ou Tech; 1.000eb, 2 slots de acessório, 1 hora para pôr ou tirar; só um por arma; serve em qualquer arma de longo
  alcance que não seja exótica, e o Tech não em lança-granadas nem em lança-foguetes; numa arma exótica, um slot só, se
  houver um livre; as armas de 2077 já vêm com o Rebuild. O catálogo já trazia os três (`armas-2077:*-rebuild`, upgrade
  de 2 slots, com `arma2077.rebuild`).
- **Entrega:** a regra pura (`regras.mjs`: `classeDoRebuild`, `armaExotica` pelos slots, que é a regra dos acessórios
  da wiki, "toda arma de longo alcance não exótica tem 3 slots"; `tamanhoDoRebuild`, `rebuildCabe` e `flagComRebuild`) e,
  no item, o `rebuild` da arma (instalado e funcionando: o EMP para), o `perfil2077` com a classe dele (a própria da arma
  de 2077 manda), o `tamanhoNaArma` (1 na exótica) nos slots usados e na conferência ao instalar, e o `_preUpdate` que
  recusa com o motivo. Todo o resto (o +1 da Smart, o ricochete da Power, a carga da Tech, as janelas e os cartões) lê o
  `perfil2077` e passa a valer sozinho.
- **Limites:** a hora para pôr ou tirar fica com o mestre (sem relógio). A arma exótica com um slot livre não existe no
  catálogo (as exóticas do CORE têm 0), então o caso de 1 slot só tem o teste da regra pura.
- **Portões:** G1, 219 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 684 testes, 0 falhas (3 testes novos em
  `tests/sistema/rebuild.test.mjs`, que conferem o texto da wiki e os três Rebuilds do catálogo); G4 completo em três rodadas (300/302, 299/302 e 302/304 com dois passos de diagnóstico, que não entram), com o
  passo novo: o Power Rebuild na pistola média (Power, ricocheteia, 2 slots), as quatro recusas com o motivo (o segundo
  Rebuild, o Tech no lança-granadas, a Air Pistol, a Lexington), o EMP e a retirada (a pistola volta a ser do RED) e o
  Smart Rebuild (Smart). As falhas mudaram de uma rodada para outra, todas em passos da KouArt, e cada uma passou em
  outra rodada: o ator do veículo do jogador dono (C46.2, na 1ª e na 3ª), as chaves do Fluxo (C26, na 1ª e na 2ª; sozinho
  e com o passo dos estados antes, 12/12 e 13/13), os estados (C26) e o tokens dinâmicos parte 2 (na 2ª). A ponta da
  branch sem o C47 deu 301/301 numa rodada.
- **Mutações:** as 12 caíram (R1 a R7 no G3; S1, S2, S3, S5 e S6 no G4). R4 sobreviveu na primeira rodada (faltava o caso da arma de 2 slots, que também é exótica) e caiu com ele.

### Ciclo 183 (2026-10-26): C48 parte 1, os itens do Black Chrome (sessão Junin)

- **Pedido do usuário (2026-10-26):** "Os 176 itens do Black Chrome como conteúdo de compêndio", com as regras novas
  (decisão do usuário: os itens e as regras, um ciclo por parte). Até aqui, o importador e os pedidos avisavam ("ainda
  não existe neste sistema") e não entregavam.
- **Fontes:** os pacotes do CORE 0.92.4 (`black-chrome/*` e `dlc/black-chrome-plus`, a mesma tag e o mesmo commit
  conferido do build), a loja da wiki (`loja-catalogo.js`: os 176 com a etiqueta `blackchrome` e o id do CORE) e as
  páginas da wiki (`system-blackchrome.js`).
- **Entrega:** o build (`build/conteudo.mjs`) lê os pacotes do Black Chrome com os conversores de sempre (o Black Chrome
  Plus, de tipos misturados, pelo tipo de cada documento), e o id curto sai do caminho do pacote (`black-chrome_weapons:`,
  `dlc_black-chrome-plus:`), que é o da loja: os 176 batem sem mapa. São 179 itens (os três fora da loja: os outros dois
  modos da ModFire e as pedras da funda). Três compêndios novos, na pasta do sistema: Armas do Black Chrome (82, com a
  munição e os acessórios), Cyberware do Black Chrome (42) e Moda e equipamento do Black Chrome (55). A munição ganhou o
  `lote` (o pacote do CORE), e o preço da unidade sai dele: a sucata em 50, a caça pequena em 100, a rede e o ácido em 1;
  a sem lote, de antes, segue pela variedade. Os cinco cyberwares do Black Chrome que são arma (a espingarda e o
  lança-redes embutidos, três cyberdedos) trazem a arma, como os do CORE.
- **Limites:** as regras próprias ficam para as partes 2 e 3 (a Combinação, o dano direto no HP, a sucata, a Pepper
  Shaker, os cyberdedos, os quadros lineares), e os 31 veículos para a 4 (o tipo de cada um não vem do CORE). Até lá,
  o efeito que não é automático fica no texto do item. A droga do Black Chrome Plus não tem a duração das do CORE.
- **Portões:** G1, 259 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 687 testes, 0 falhas (3 testes novos em
  `tests/sistema/blackchrome.test.mjs`: a contagem por pacote, os 176 da loja, os compêndios e o manifesto, o lote; e os
  testes da loja inteira e das armas do cyberware passam a contar com o Black Chrome); G4 completo, 303/303 em 629 s, com o passo
  novo: os três compêndios com 82, 42 e 55; o personagem da wiki com itens do Black Chrome importado sem aviso; o pedido
  do ChipVault e de 50 balas sucata entregue, com 110eb e a unidade a 0,2eb. Na primeira rodada (302/303), o passo novo
  falhou pela ordem esperada da lista ("arma:" vem antes de "armadura:"); corrigida, e com o endereço da wiki posto no
  próprio passo para valer sozinho, 12/12 focado e 303/303 completo.
- **Mutações:** as 8 caíram: B1 a B7 no G3 (o preço sem o lote, o lote de 1 na munição sem lote, o Black Chrome Plus, a droga e o
  Black Chrome no compêndio de armas do livro, o compêndio fora da pasta e sem caminho) e S1 no G4 (o lote fora do modelo
  de dados: a sucata entregue sai a 1eb a unidade).

### Ciclo 184 (2026-10-26): o C43, parte 3, o tema do sistema no resto do Foundry (sessão KouArt)

Commit anterior: `ab9086d5` (o ciclo 183, o C48 parte 1, da sessão Junin). Antes dele, desta sessão, o `02a16196` (a
reserva da parte 3 e a confirmação do usuário de que só o motorista dispara a arma montada do veículo, a decisão do ciclo
181). Era o 182: a sessão Junin publicou o 182 e o 183 durante o G4 deste; renumerado, juntado sem conflito e com o G4 de
novo na árvore juntada. A outra metade da parte 3, o navegador de itens e atores, está com um worker, numa worktree
própria: é o ciclo 185.

- **A fonte:** o CORE 0.93 (`fvtt-cyberpunk-red-core-dev/CHANGELOG.md:40`, "an optional client setting to extend the
  Cyberpunk RED theme to Foundry's interface and ApplicationV2 windows using Foundry's supported theme tokens; legacy
  ApplicationV1 windows retain their Foundry appearance"; a configuração `themeFoundry` em `src/modules/system/settings.js:34-44`,
  de cada navegador e ligada por padrão; o atributo no `<html>` em `src/modules/utils/cpr-systemUtils.js:110-143`; as
  variáveis trocadas em `src/css/variables/foundry.css`).
- **O que muda:**
  - **a configuração "O tema do sistema no Foundry"** (`scripts/configuracoes.mjs`, de cada navegador, ligada por
    padrão, como no CORE): o init a aplica (`scripts/sistema.mjs`), e a troca vale na hora (`scripts/tema-foundry.mjs`
    liga ou desliga o atributo `data-cprf-tema-foundry` no `<html>`);
  - **`styles/tema-foundry.css`** (novo, na camada `system`, logo depois do `tema.css`): as mesmas 109 variáveis de tema
    do Foundry que o CORE troca (o texto, a fonte, os fundos, a barra lateral, as tabelas, os campos, as caixas de
    marcar, o menu de contexto, os controles da cena e o HUD, a barra de macros, o campo do chat, a lista de jogadores,
    o combate, as câmeras, o autocompletar e os botões), com a paleta do `tema.css` (o fundo `#0b0b10`, o texto
    `#e8e6d9`, o poço dos campos `#0d0d14`, o amarelo nos destaques e no passar do mouse, o ciano no foco, a Rajdhani nas
    variáveis de fonte); fora das janelas ApplicationV1 (`.window-app`), como no CORE. A camada `system` vem depois das de
    variáveis e de aplicações do Foundry (`foundry2.css`), e a troca vale sem depender da especificidade;
  - **o `tema.css`:** o bloco da paleta vale também no `<html>` com o atributo.
- **Decisões e dúvidas:**
  - **ligado por padrão**, como no CORE (`settings.js:40`): para quem atualizar, a barra lateral e o resto do Foundry
    mudam de cara; cada um desliga em Configurações → Sistema;
  - **a paleta é sempre a escura** do modelo de ficha: o CORE tem tema claro e escuro e, com o tema dele escolhido à
    mão, também troca o esquema de cores do Foundry (`core.uiConfig`, `cpr-systemUtils.js:145-163`); o nosso não tem
    escolha e não mexe na configuração do Foundry de ninguém;
  - **as fichas e as janelas do sistema** continuam com o tema delas sempre; o CORE também aplica as variáveis às
    janelas dele sempre, e aqui elas só entram com a configuração ligada (os botões e os campos que as fichas não
    pintam à mão seguem o Foundry com ela desligada);
  - **a fonte:** as variáveis de fonte vão para a Rajdhani, como no CORE, mas o Foundry 14 põe a fonte uma vez no corpo
    da página (`--font-body` em `foundry2.css`), fora dos elementos do tema: a barra lateral e quase todo o resto herdam
    a Signika com o tema ligado (o G4 viu isso na barra). Fica como no CORE; levar a fonte ao corpo da página seria ir
    além dele;
  - **ficam de fora:** o tema dos cartões do chat que não são do sistema (as rolagens do Foundry e das tabelas: o CORE
    0.93 faz em outro item, `CHANGELOG.md:70`) e as janelas destacadas do módulo PopOut! (`hooks/external/popout.js`).
- **Testes:**
  - **G3:** `tema-foundry.test.mjs` (novo, 4 testes: a configuração igual à do CORE e o init; ligar e desligar o atributo;
    as 109 variáveis do `foundry.css` do CORE, nem uma a mais nem a menos, e cada cor usada existe na paleta do
    `tema.css`, que vale no `<html>`; cada seletor só com o atributo e fora das janelas ApplicationV1, e o arquivo no
    `system.json` logo depois do `tema.css`, na camada do sistema);
  - **G4:** um passo novo, depois do "da 0.93 do CORE, a mesa (o C43, parte 2)": com a configuração ligada, a barra
    lateral (o texto `#e8e6d9` e a variável da fonte com a Rajdhani), o campo do chat (`#0d0d14`) e um DialogV2 do
    Foundry (o fundo e o campo); desligada, as do Foundry de volta na hora; as capturas
    `tests/.saida/v14-tema-foundry-ligado.png` e `v14-tema-foundry-desligado.png`. Na primeira rodada, o passo conferia a
    fonte desenhada na barra lateral, e ela continuava a Signika (veja "a fonte"): passou a conferir a variável.
- **Portões:** na árvore juntada com o 182 e o 183 da sessão Junin: G1, 214 arquivos com sintaxe válida; G2, ESLint
  10.12.0 sem erros; G3, 691/691; G4 completo, 304/304, com a checagem dos dois navegadores sem avisos ou erros de JS.
  Antes da junção, 302/302 (a primeira rodada, 301/302, é a da fonte, acima).
- **Mutações:** as seis caíram, uma por vez, e os arquivos voltaram exatos. No G3: o tema desligado por padrão (M1),
  as janelas ApplicationV1 também com o tema (M2), o init que não aplica (M3) e a paleta que não vale no `<html>` (M5).
  No G4, um G4 inteiro cada: desligar que não tira o tema na hora (M4) e o campo fora do poço escuro (M6), os dois no
  passo do tema.
- **Próximo:** o ciclo 185, o navegador de itens e atores (a outra metade da parte 3, com o worker) e, na Fase 7, o C42 (Dice So
  Nice: falta saber se a mesa usa).

### Ciclo 185 (2026-10-26): o C43, parte 3, o navegador de itens e atores (sessão KouArt, com um worker)

Commit anterior: `f225d5d8` (o ciclo 184, o tema no resto do Foundry, a outra metade da parte 3). O código e os testes
saíram de um worker (`workers:artesao`), numa worktree própria a partir do `02a16196`, revisados e integrados aqui pelo
patch, com dois conflitos resolvidos à mão: a lista de janelas do topo do `tema.css` (as do navegador junto do
`html[data-cprf-tema-foundry]` do 184) e os passos do G4 (os do tema e os do navegador depois do mesmo passo, com o fecho
em comum). Com ela, o C43 está completo.

- **A fonte:** o CORE 0.93 (`fvtt-cyberpunk-red-core-dev/CHANGELOG.md:25`, "a document browser for items and actors:
  search and filter the world and enabled compendia in one window, then click to open or drag to copy onto a sheet"; a
  janela em `src/modules/apps/browser/cpr-document-browser.js`, o índice em `cpr-browser-index.js`, os números da linha
  em `src/modules/item/item-chips.js`, os filtros por tipo no `CPR.browserFilters` de `src/modules/system/config.js:956`,
  o menu dos compêndios em `src/modules/apps/settings/cpr-browser-compendia-settings.js` e `settings.js:124-148`, os
  botões em `src/modules/hooks/foundry/ui/directory-browser-buttons.js:19-43`).
- **O que muda:**
  - **`scripts/regras-navegador.mjs` (novo, sem Foundry):** os filtros (o nome, o preço mínimo e máximo, a origem, o
    tipo e os filtros de cada tipo do `CPR.browserFilters` que têm campo no nosso modelo: a arma pelo tipo, a CDT, o
    autofogo, os dados do dano, o ocultável e as mãos; a munição pelo efeito e pela variedade (o "type" do CORE é o nosso
    `efeito`, e o "variety", o nosso `tipo`); o cyberware pelo tipo, a fundação, o endurecido e a arma do cyberware; a
    roupa pelo tipo e o estilo; a armadura pelo local e pelo SP; o cyberdeck pelos slots; a droga, de rua ou
    farmacêutica, pelo preço; o programa pela classe; o upgrade por onde instala), o tristate do CORE (incluídos, só
    estes, excluídos) com a promoção do tipo pelo filtro de dentro, a ordem (os tipos na ordem do `system.json`, o nome;
    os upgrades por onde instalam), os lotes de 50 com o cabeçalho do grupo, os números de cada linha e os campos que o
    índice pede ao compêndio;
  - **`scripts/navegador.mjs` (novo):** o índice da sessão (os itens do mundo que o usuário vê e o `getIndex({ fields })`
    dos compêndios ligados e visíveis, sem carregar os documentos; o `fromUuid` só ao abrir ou arrastar), mantido pelos
    ganchos de criar, mudar e apagar e refeito pelo botão de atualizar e pela configuração; a janela `Navegador` (a busca,
    os filtros e a lista, uma parte cada); o menu "Compêndios do navegador", só do mestre; os botões no pé dos diretórios
    (Itens para todos, Atores só para o mestre);
  - **`templates/navegador/*.hbs`**, **`styles/navegador.css`** (registrado no `system.json`) e a lista de janelas do
    tema no `tema.css`; o registro escondido `navegadorCompendios` (do mundo: `{ id: false }` para os desmarcados) em
    `configuracoes.mjs`, numa função à parte (`registrarCompendiosDoNavegador`), chamada pelo `navegador.mjs` no init.
- **Decisões e dúvidas:**
  - **fora, como pedia o ROADMAP:** o carrinho do jogador (a loja da wiki já é o carrinho);
  - **só o mestre arrasta**, como no CORE (`cpr-document-browser.js:308-310` e `:1537-1549`): o jogador abre a ficha e
    compra pela loja; para o jogador arrastar, basta trocar o `podeArrastar`;
  - **as lesões críticas** ficam de fora (o tipo e o compêndio), como no CORE (`config.js:1097` e `:1105-1118`);
  - **o `ignoredByBrowser`** do CORE (a migração 043) esconde dez itens "Achievements & Loot Boxes", que o nosso
    catálogo não tem: não foi adaptado;
  - **filtros do CORE que ficaram de fora:** a categoria de preço e a qualidade (fáceis de pôr: o `categoriaDoPreco` já
    existe), a marca (o modelo não tem), o livro-fonte (o nosso é um só, não uma lista) e o dano que a munição substitui
    (não existe aqui);
  - **diferenças na linha:** o nome do compêndio no lugar do "Compêndio / livro" do CORE; os tipos de arma e de munição
    com o valor do catálogo ("vHeavyPistol"), como a ficha do item mostra hoje (o sistema não tem rótulos para eles);
    Slots com o total; sem a árvore dos instalados, a descrição na dica e os botões no diretório de compêndios.
- **Na integração:** os passos do G4 contavam as Very Heavy Pistols do catálogo só pelo prefixo `core_`; o C48 da
  sessão Junin (os compêndios do Black Chrome, no ciclo 183) traz mais duas munições com esse nome, que o navegador
  também lista: a conta passou a usar os prefixos dos compêndios de itens (o `PACKS_DE_ITENS` de
  `build/compendios.mjs`).
- **Testes:**
  - **G3:** `navegador.test.mjs` (novo, 11 testes: o lote, o ciclo do tristate, os tipos de fora e o `CPR.browserFilters`
    lidos do CORE e comparados tipo a tipo e filtro a filtro; para cada item do catálogo, os números e os filtros com só
    os campos do índice iguais aos do item inteiro, e nenhum campo pedido que é o começo de outro; os casos dos testes do
    CORE: o "só estes", a promoção que volta, o "só estes" do clique que fica, a ordem dos upgrades, o preço, a origem, o
    SP da armadura sem o 0 do local que ela não usa, os lotes; um elemento raiz por parte; o registro do menu);
  - **G4:** dois passos novos, depois do "o tema no resto do Foundry (o C43, parte 3)": no mestre, o botão no pé do
    diretório, a lista sem as lesões, a arquitetura do compêndio, a busca "very heavy pistol" (as 13 do catálogo e a do
    mundo), a origem, o tipo em "só estes", a linha com "Armas", o preço e os números, o clique que abre a ficha do
    compêndio, o arrasto que cria o item no personagem (com o `compendiumSource`), as Armas desmarcadas no menu que somem e
    o navegador de atores; no navegador do jogador, sem o botão de Atores (pedir o de atores abre o de itens), o item do
    mundo com permissão Limitada, sem o compêndio de arquiteturas, sem arrastar e sem o menu.
- **Portões:** G1, 217 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 702/702; G4 completo, 306/306,
  com a checagem dos dois navegadores sem avisos ou erros de JS (na primeira rodada também, 306/306). O passo do mestre
  ganhou a captura `tests/.saida/v14-navegador.png` (o de atores por cima do de itens).
- **Mutações:** as oito caíram, uma por vez, e os arquivos voltaram exatos. No G3: a promoção do tipo que não volta (M1,
  2 testes), o índice do compêndio sem a CDT (M2), o SP 0 do local que a armadura não usa na faixa (M3), o cabeçalho
  repetido no lote seguinte (M4) e o jogador que arrasta (M5, 2 testes). No G4, um G4 inteiro cada: o compêndio
  desmarcado que continua na lista (M6) e o mestre que não arrasta (M7), no passo do mestre; o botão de Atores para o
  jogador (M8), no passo do jogador.
- **Próximo:** na Fase 7, o C42 (Dice So Nice: falta saber se a mesa usa).

### Ciclo 186 (2026-10-26): o C42, o Dice So Nice (sessão KouArt)

Commit anterior: `63f011ca` (a reserva do C42; o usuário confirmou em 2026-10-26 que a mesa usa o Dice So Nice).

- **As fontes:** o CORE 0.92.4, o que a mesa usava (`cyberpunk-red-core/modules/hooks/external/dice-so-nice-preset.js`:
  no `diceSoNiceReady`, dois conjuntos de faces da Q-Workshop, "CRPQWL" e "CRPQWN", e três cores; e
  `cyberpunk-red-core/modules/extern/cpr-dice-handler.js`: os cartões do CORE não levavam o roll, e o `showForRoll`
  mostrava os dados à parte, pelo modo de rolagem); o CORE 0.93 (`fvtt-cyberpunk-red-core-dev/CHANGELOG.md`: as rolagens
  passaram a ser as do Foundry, "with automatic Dice So Nice support"); os nomes no `lang/en.json` do CORE
  (`CPR.module.dsn.*`); o `CREDITS.md` da 0.93 ("Permission to use CyberpunkRED branded dice themes are graciously
  provided by Q-Workshop and R Talsorian Games").
- **O que muda:**
  - **`scripts/dice-so-nice.mjs` (novo):** no `diceSoNiceReady`, as três cores do CORE 0.92.4, com os mesmos nomes,
    fundos, bordas, material (vidro) e modos: a do jogador (`game.user.color`), a preferida até ele escolher outra;
    "Blood over Chrome" (`#E64539`) e "Wet Work" (`#FFF300`), no grupo "Cyberpunk RED". O init a registra
    (`scripts/sistema.mjs`);
  - **os cartões:** um mapa de todas as rolagens do sistema (47 lugares: o combate, as defesas, o dano do jogador e do
    mestre, a área, as lesões, os perigos, a direção, a iniciativa, o Death Save, os testes avulsos, os tratamentos, as
    drogas, a NET e o Neuroport, o agarrão e as Artes Marciais) achou cada rolagem já na sua própria mensagem, com o
    `rolls`, no cliente de quem rola e na hora da rolagem, e nenhuma em duas mensagens: é o que o Dice So Nice anima
    sozinho, como na 0.93, sem o `showForRoll` da 0.92.4. Faltava uma: a Humanidade da droga de rua (o 2d6 do Black
    Lace), que só ia no texto do cartão: agora vai no cartão (`scripts/drogas.mjs`).
- **Decisões e dúvidas:**
  - **as faces da Q-Workshop ficam de fora:** a permissão é do projeto do CORE, não uma licença das imagens (como as
    imagens de andar do SolutionMaps no C35); a 0.93 também mudou as três cores para metal, com o número preto e a fonte
    Bruno Ace: aqui ficam as da 0.92.4, o que a mesa via;
  - **a geração da arquitetura da NET** rola sem cartão no chat (é assim desde o C35): continua sem dados no DSN;
  - **não testado com o módulo:** o Dice So Nice não está no Foundry de teste deste PC, e baixá-lo pede a permissão do
    usuário; o passo do G4 confere o que o DSN usa (o gancho, com um `dice3d` de mentira, e as mensagens com o roll), não
    a animação. A conferir na mesa: os dados aparecem para quem vê cada mensagem (o modo do mestre, o secreto e o
    sussurro, pelas regras do próprio DSN);
  - **o que o mapa achou e não é do DSN** (os cartões já mostram isso no chat hoje, com ou sem o módulo): o "(×N)" do
    dano de autofogo rolado pelo jogador sai público com "Esconder o total do ataque até a defesa" ligado
    (`rolagens.mjs:125`), e N é o ataque menos a defesa. Parecia revelar o total escondido; conferido depois, a pedido do
    usuário, não revela: o dano só é rolado depois das defesas de todos os alvos (`combate/modos.mjs:563` e `:582-584`),
    e o cartão do ataque fica público logo em seguida (`:116-118`); a segunda chance da munição Smart melhorada também
    vem depois da defesa daquele alvo e contra ela (`:282-292`). Nada mudou no código. Ficam para o usuário decidir: o
    Breach, o quickhack e o ataque de programa saem públicos (`combate/socket.mjs:136`, `neuroport.mjs:174` e `:232`,
    `netrun/estado.mjs:638`); a iniciativa e as rolagens dos inimigos da NET mostram o nome e o número
    (`netrun/combate.mjs:57-59`, `netrun/estado.mjs:206-217`).
- **Na primeira rodada do G4** (306/307), a checagem dos avisos pegou "Wiki: o pedido de Teste Netrunner não foi
  entregue. Este pedido já foi resolvido.": a entrega automática dos pedidos da wiki (a cada minuto, `wiki.mjs:601-603`)
  e a entrega de um passo do G4 pegaram o mesmo pedido ao mesmo tempo, e a que chegou depois avisou. Nada do C42 (que não
  mexe na wiki); na mesa, o mesmo aviso falso pode aparecer se o mestre entregar um pedido no minuto da entrega
  automática. Fica anotado para o usuário decidir.
- **Testes:**
  - **G3:** `dice-so-nice.test.mjs` (novo, 2 testes: as três cores lidas do `dice-so-nice-preset.js` do CORE 0.92.4,
    os nomes do lang dele; o registro no `diceSoNiceReady`, com a cor do jogador e sem conjunto de faces);
  - **G4:** um passo novo, depois do "o navegador de itens e atores (o C43, parte 3) no jogador": o `diceSoNiceReady`
    com um `dice3d` de mentira (as três cores, a do mestre como a preferida, nenhum conjunto de faces); o cartão do Black
    Lace com o roll (2d6, 4 + 3 = 7, e a Humanidade 7 a menos); o teste de perícia e o dano da arma com o roll na
    mensagem.
- **Portões:** G1, 219 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 704/704; G4 completo, 307/307,
  com a checagem dos dois navegadores sem avisos ou erros de JS (a primeira rodada, 306/307, é a da corrida da wiki, acima).
- **Mutações:** as seis caíram, uma por vez, e os arquivos voltaram exatos. No G3: a cor do jogador que deixa de ser a
  preferida (M1, 2 testes), o Blood over Chrome com outra cor (M2, 2), o metal da 0.93 no lugar do vidro (M3) e o gancho
  errado do DSN (M4). No G4, um G4 inteiro cada, no passo do C42: o cartão do Black Lace sem a rolagem (M5) e o init sem o
  registro (M6).
- **Próximo:** a Fase 7 está completa. Abertos no ROADMAP: o C28 (do usuário) e os C48 e C49 (sessão Junin).
### Ciclo 187 (2026-10-26): C48 parte 2, as armas do Black Chrome (sessão Junin)

- **Pedido do usuário (2026-10-26):** o Black Chrome com os itens e as regras novas, um ciclo por parte; esta é a das
  armas. Fonte: a wiki (`system-blackchrome.js`: as armas, p. 85–124, a munição do Black Chrome Plus e as
  palavras-chave, p. 9), com os pacotes do CORE 0.92.4 da parte 1.
- **Entrega:**
  - **A Combinação** (as seis da wiki: a Bouncer, a Survivalist, a TechHammer, a Mastiff, a Sternmeyer M-04 e a
    Tommyknocker). O CORE traz só o primeiro modo; o build (`build/conteudo-blackchrome.mjs`) põe o outro no campo novo
    `combinacao` da arma, a partir da arma do RED (o Microwaver, o rifle de assalto, o lança-foguetes, a espingarda, o
    lança-granadas), com o que a wiki muda (o pente, a qualidade, a Survivalist sem autofogo). O modo vira uma arma ligada à
    principal, pelo mesmo mecanismo da arma do cyberware e do acessório (`armas-cyberware.mjs`, a flag
    `armaDaCombinacao`): fica na aba Combate, marcada "Modo", com o pente e a munição dele, sem mãos a mais, pronta com a
    arma equipada, fora dos acessórios dela, do inventário e da wiki; apagada a arma, o modo sai e as balas voltam.
    Trocar de modo é atacar com o outro (sem gastar Ação). Na falha da arma ruim, o emperramento é só do modo que disparou;
    na Sternmeyer, "emperram os dois modos".
  - **A Pepper Shaker:** só autofogo e fogo supressivo (o tiro único e o mirado recusam, com o motivo), e o autofogo gasta
    6 balas (o `balasDoAutofogo` da arma, que também serve às de 2077); o dano do CORE (0) vira o 2d6 da wiki.
  - **As de arremesso que "continuam reduzindo o SP à metade"** (o Boomerang, a Mono-Star e a Tomahawk). A Mono-Star e a
    Tomahawk, só de arremesso no CORE, são armas brancas (média e pesada) que também se arremessam, como na wiki.
  - **O dano direto no HP** (`aplicarDano` com `direto`): a armadura não reduz nem se desgasta, e o lugar do corpo não
    multiplica.
  - **A munição sucata** (o efeito `junk`, das seis do Black Chrome Plus): o 1d6, rolado uma vez por ataque, sai do dano
    de quem tem SP 1 ou mais no local, antes da armadura, com a nota no cartão.
  - **Os explosivos** (o KillChip, o Door Cracker, o OUTLet, o Micro Hydrogen Combustor e o TR-4) não atacam: o dano
    rolado pelo botão Dano se aplica pelo cartão, com a regra de cada um. O KillChip vai direto no HP, com a Lesão
    cerebral; o OUTLet, o Combustor e o TR-4 são granada perfurante (ablação 2), e o TR-4 no veículo vai no ponto fraco
    (sem a blindagem e com o dano dobrado); o Door Cracker só atinge a cobertura e recusa ferir alguém. O "ignora metade do
    SP" que o CORE copiou neles sai.
  - **As granadas:** a Shuriken Tornado rola o dano separado para cada alvo e, como a expansiva, o objeto estranho vira
    duas lesões; a Arachnid não causa dano (o efeito `arachnid`, com a teia no cartão).
- **Limites:** ficam com a mesa o CDT 2 do arremesso (o sistema não conta os ataques da rodada), a munição de caça pequena
  (e a SportMaster, que só a aceita), a teia da Arachnid como agarrão, a cobertura que a granada KTech não fura, os
  fluidos da Weeping Reaver e as regras de cada arma que são texto (a chave biométrica das monolâminas, a segunda lesão
  da Mono-Star e do Mono-Guard, o foguete Smart da TechHammer sem a Luneta de Mira, a bateria da Bouncer). O cromo
  (cyberdedos, quadros lineares, moda) é a parte 3; os veículos, a 4.
- **Portões:** na árvore juntada com o 186 da sessão KouArt (o Dice So Nice): G3, 714/714; G4 completo, 308/308 em
  685 s. Antes da junção: G1, 228 arquivos com sintaxe válida (o conjunto do G2); G2, ESLint 10.12.0 sem erros; G3, 712 testes, 0
  falhas (10 testes novos em `tests/sistema/blackchrome-armas.test.mjs`: os seis modos da Combinação, conferidos com as
  armas "Combinação:" da wiki; o modo como arma ligada; o emperramento; o dano direto; a sucata; a Pepper Shaker; o
  arremesso; os explosivos, conferidos com os da wiki; as granadas; e os perfis no catálogo. A munição sem dano conta a
  Arachnid; a Pepper Shaker saiu das armas sem dano; o teste do schema do C43 conhece o `armaMontada`); G4 completo,
  307/307 em 630 s, com o passo novo: a Mastiff ganha o modo espingarda (pente 3, sem mãos, fora dos acessórios), que recusa
  com a Mastiff guardada e, equipada, acerta (20 contra SP 11: 9) e gasta o pente dele; apagada a Mastiff, o modo sai e
  os 2 balotes voltam; a sucata na pistola pesada tira 3 (15 − 3 contra SP 11: 1); a Pepper Shaker recusa o tiro e o
  autofogo gasta 6 balas; a Tomahawk arremessada pega SP 6 (9 de dano); o KillChip recusa o ataque e, pelo cartão, dá 20
  direto no HP, sem ablar a jaqueta, com a Lesão cerebral; o Door Cracker recusa ferir. No foco, 12/12.
- **O passo do veículo ator (C46.2), jogador dono:** falhou em 5 das 6 rodadas completas com este ciclo, antes do conserto (a base sem ele
  passou na única rodada; antes, já falhava de vez em quando, nos ciclos 178 e 182). O diagnóstico: o pedido do jogador
  leva a cena dele, e na hora do clique ele ainda estava na cena do passo anterior (já apagada): o mestre recusava ("O
  veículo, a cena ou a permissão mudou"), e logo depois o jogador chegava à cena certa. É uma corrida do teste, não do
  sistema. O passo agora espera o jogador estar na cena dele antes de clicar.
- **Mutações:** as 11 caíram: B1 a B7 no G3 (o direto que passa pela armadura, a sucata em quem não tem SP, o arremesso
  com o SP inteiro, a Pepper Shaker com tiro único, a arma da Combinação sem o modo, a Sternmeyer com um modo só e, no
  build, a Pepper Shaker sem dano) e S1 a S4 no G4 (o ataque sem o 1d6 da sucata, o cartão sem a regra do explosivo, o
  modo que ataca com a arma guardada, o autofogo da Pepper Shaker com 10 balas).

### Ciclo 188 (2026-10-26): o conserto da pasta do cortador dos tokens dinâmicos (o C45, parte 3; sessão Junin)

- **O relato do usuário (2026-10-26, no servidor):** o cortador da folha do Qyan ligou o token dinâmico, mas o console
  mostrava 404 em todos os quadros (`tokens/qyan/qyan_parado_090.webp`...) e o Foundry dizia "Target directory
  /srv/foundry14/data/Data/tokens/qyan does not exist".
- **A causa:** o cortador criava a pasta com um `createDirectory` só, e o do Foundry 14 não cria a pasta-mãe: sem
  `tokens` nos dados do servidor, "tokens/qyan" falhava, e o `catch` tratava como "a pasta já existe". Cada upload
  seguinte respondia com o erro (o `upload` devolve `false`), e o cortador não conferia: punha no conjunto do ator os 28
  caminhos que não existiam. O G4 do C45 não pegou porque criava a pasta-mãe (`teste-c45c`) antes.
- **O conserto:** `scripts/pastas.mjs` (`niveisDaPasta` e `garantirPasta`) cria cada nível, do de fora para o de dentro,
  e só dá erro se a pasta continuar faltando. O cortador avisa se não conseguir a pasta e confere cada upload: se o
  Foundry não gravar um quadro, avisa ("O Foundry não gravou ... : o conjunto do token não mudou.") e o conjunto fica como
  estava. O retrato da wiki (`wiki-retrato.mjs`), que tinha o mesmo `garantirPasta` de um nível, passa a usar este.
- **No servidor, até a instalação:** criar a pasta `tokens/qyan` (pelo navegador de arquivos do Foundry, ou no
  servidor) e cortar a folha de novo.
- **Portões:** G1, 231 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 715 testes, 0 falhas (1 teste novo
  em `tests/sistema/cortador.test.mjs`: os níveis da pasta); G4 completo, 309/309 em 687 s, com o passo novo: numa pasta de
  dois níveis novos (a mãe não existia), o cortador grava os 28 quadros e liga o conjunto; com o upload falhando, avisa
  e o conjunto não muda. No foco, 13/13.
- **Mutações:** as 3 caíram: P1 no G3 (só o último nível) e P2 e P3 no G4 (o cortador com o `createDirectory` de um
  nível, calado; o upload sem conferir).

### Ciclo 189 (2026-10-26): C48 parte 3, o cromo do Black Chrome (sessão Junin)

- **Fonte:** a wiki (`system-blackchrome.js`: os cyberdedos, p. 23–26; a moda e a armadura, p. 27–35; os quadros
  lineares, p. 51–55; as palavras-chave; e `system-catalog.js`, os quadros do RED). **Decisões do usuário (2026-10-26):**
  o quadro linear externo (o vestido, inclusive o Sigma e o Beta do RED) segue a wiki: o BODY sobe para tudo, menos o HP e
  o Death Save (o C31 fazia o quadro vestido subir o HP, como o CORE); os cyberdedos ficam no cyberbraço, como na wiki e
  na loja (que só aceitam opção numa base do mesmo tipo), mas não gastam os slots dele, e a mão modular dá as vagas.
- **Entrega:**
  - **Os cyberdedos** (os 16 da wiki): o dedo não gasta slot do cyberbraço (`slotsNaFundacao`); entra no braço onde a
    Modular Finger Cyberhand (5 vagas) ou a Dynalar Enthusiast (8) tem dedo livre (o par de alicate/tesoura conta 2), ou
    fica no membro natural do lado dele, com a mão modular de lá. Sem vaga, entra sem mão, com o recado e a marca "sem
    fundação" na ficha. O dedo padrão que vem com a mão não conta.
  - **Os quadros lineares:** o efeito do quadro vestido passa para `body.quadro` (o build e a migração 9 dos itens dos
    mundos), e o personagem usa esse BODY para tudo, menos o HP e o Death Save, que ficam pelo BODY sem ele
    (`corpoComQuadro`). Ligar o quadro vestido pede os Interface Plugs instalados (o Sigma, 1; o Beta e os do Black Chrome,
    2; o EL-F4-NT, nenhum). Instalar o implantado pede BODY (6 no Sigma, 8 nos outros) e os Grafted Muscle and Bone Lace
    (1 ou 2), e ele muda o HP, como o cromo. O Fūma Kotarō, vestido ou implantado, dá +2 em Furtividade.
  - **A aparência de moda:** a armadura ganha o campo `moda` (o estilo que parece, dos estilos de roupa): as 15 do
    catálogo (a Dirk, a Laser Light, a Montage, a Executive, a Corporate Island e as 10 Mimic). A ficha mostra "PARECE
    ...", e na armadura de um ator há os dois testes de quem observa (o token selecionado ou o personagem do usuário):
    Percepção contra DV15 ou Guarda-roupa e Estilo contra DV13, com a rolagem e o resultado só para o mestre
    (`black-chrome.mjs`; API `game.system.api.blackChrome.perceberArmadura`).
- **Limites:** ficam com a mesa o laser de quatro ou oito cyberdedos, as armas do Fūma Kotarō, o escalar, o nadar e o
  saltar dos quadros, o Skate Foot do Vermilion e os Techtools do EL-F4-NT. A wiki e a loja continuam pondo os dedos no
  cyberbraço (a importação e a ficha que volta não mudam). Os veículos são a parte 4.
- **Portões:** G1, 233 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 720 testes, 0 falhas (5
  testes novos em `tests/sistema/blackchrome-cromo.test.mjs`: os 16 cyberdedos da wiki e as duas mãos; as vagas e os
  slots; os quadros, o `body.quadro`, os plugs, o BODY e os enxertos, o Fūma; a migração 9; a aparência de moda,
  conferida com a wiki, e as DVs; e o teste dos fluxos de rolagem conta o da moda); G4 completo, 310/310 em 609 s, com o
  passo novo: a mão no cyberbraço e cinco dedos nele (1 slot usado), o sexto sem mão; a mão e o dedo no braço natural; o
  Beta recusa sem os plugs e, com dois, põe o BODY 14 com o HP 40 e o Death Save 6; o Fūma dá BODY 12 e +2 em
  Furtividade; o Vermilion implantado recusa com BODY 6 e, com BODY 8 e dois enxertos, instala (BODY 12, HP 55); a Dirk
  mostra "PARECE ROUPA DE LAZER" e os dois testes, e a Percepção 19 a percebe, só para o mestre. No foco, 12/12.
- **Mutações:** as 8 caíram: C1 a C4 no G3 (o dedo que gasta slot, a mão sem limite, o quadro externo no HP e, no
  build, o quadro externo no BODY de sempre) e C5 a C8 no G4 (o dedo como opção comum do braço, o HP pelo BODY do
  quadro, o quadro que liga sem os plugs, o dedo fora do membro natural).

### Ciclo 190 (2026-10-26): C48 parte 4, os veículos do Black Chrome (sessão Junin)

- **Fonte:** a wiki (`system-blackchrome.js`: os veículos, p. 57–84, com o Acesso Nômade de cada um; o Acesso Nômade, p.
  9) e o pacote `black-chrome/vehicles` do CORE 0.92.4 (o SDP, os assentos, o MOVE e a velocidade).
- **Entrega:**
  - **Os 31 veículos** no catálogo e num compêndio novo, "Veículos do Black Chrome" (na pasta do sistema). O build
    (`build/conteudo-blackchrome.mjs`) põe o que o CORE não diz: o tipo (os 8 aéreos: os girocópteros, o helicóptero e os
    AV-4; os outros 23, terrestres), o Acesso Nômade e o que vem de fábrica: o chassi blindado no SP do veículo (13) e os
    vidros à prova de balas no campo novo `vidros`, que conta como o upgrade instalado (`protecoesDoVeiculo`: a janela
    nova tem 15 HP, ou 30 com dois). O SDP e os assentos do CORE já trazem o chassi pesado e os upgrades de assentos.
  - **O "não aceita o upgrade":** o upgrade de assentos nos girocópteros e no Range Trike, o chassi pesado no Ebi e
    qualquer upgrade no JetBoy são recusados ao instalar, com o motivo (`upgradeNoVeiculo`). A montagem da wiki entra
    como veio.
  - **O Acesso Nômade:** o campo `acessoNomade` do veículo, na ficha e na etiqueta ("ACESSO NÔMADE 4"). Marcar o veículo
    do Black Chrome como da família pede o Moto (o Rank da Role Nomad) igual ou maior que o Acesso; o JetBoy ("—") não
    entra na frota (`naFrotaDaFamilia`). Os veículos do RED continuam sem a regra.
- **Limites:** ficam com a mesa o "não aceita alguns upgrades" do EconoCompact, do Destination e do Molly (as páginas
  faltam no PDF do projeto), as armas e os equipamentos do "Vem com" (a metralhadora, o lança-foguetes, o NOS, o arado, a
  habitação; quem quiser a arma preparada instala o upgrade dela), o modo corrida da Artemis e as manobras do JetBoy por
  Atletismo. A loja da wiki não vende estes veículos (ficam no compêndio). Com esta parte, o C48 está feito.
- **Portões:** G1, 234 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 724 testes, 0 falhas (4
  testes novos em `tests/sistema/blackchrome-veiculos.test.mjs`, conferidos com a tabela da wiki: os 31 com o tipo e o
  Acesso; o chassi blindado e os vidros do "Vem com"; o upgrade recusado; a frota da família. Os testes do Black Chrome
  contam os veículos e o quarto compêndio; os do C46 contam os 45 veículos do catálogo, e os 14 do CORE pelo nome); G4
  completo, 311/311 em 630 s, com o passo novo: o compêndio com 31; o Gorgon com o SP 13 e a janela de 15 HP; o SH-45 aéreo,
  que recusa os assentos e aceita o chassi blindado; a Nomad de Rank 5 põe o Grundy na frota, e o Paladin e o JetBoy
  recusam; a Roadbike do RED entra. No foco, 12/12.
- **Mutações:** as 7 caíram: V1 a V4 no G3 (os vidros de fábrica fora da conta, o JetBoy com upgrade, a frota sem o
  Rank e, no build, todo veículo terrestre) e V5 a V7 no G4 (o veículo que aceita qualquer upgrade, a frota sem o
  Acesso, o veículo sem os vidros de fábrica).

### Ciclo 191 (2026-10-26): C49 parte 1, os ícones neon dos estados e das imagens padrão (sessão Junin)

- **Pedido e decisão do usuário (2026-10-26):** ícones próprios no lugar dos genéricos do Foundry, para os estados no
  token, os botões do HUD e da ficha e as imagens padrão dos itens, no estilo neon de 2077 (traço fino em ciano, vermelho
  e amarelo, com brilho, como o NetWire da wiki). Esta é a parte dos estados e das imagens padrão; os botões são a parte 2.
- **Entrega:**
  - **O conjunto neon:** `build/icones.mjs` desenha cada ícone em traços simples (64 × 64) e o põe num molde comum: o
    fundo escuro (`#0b0b10`) com o canto cortado, a moldura e o traço na cor do grupo (ciano, vermelho ou amarelo, as do
    tema), o acento na outra cor e o brilho. São 62 SVGs em `icones/neon` (`node build/icones.mjs` refaz).
  - **Os estados no token:** os 34 do Foundry 14 e os 9 do sistema (suprimido, em cobertura, agarrando, agarrado, em
    chamas, conectado à NET, sem ar, eletrocutado, radiação) têm o ícone neon, pelo id (`regras-icones.mjs`;
    `icones.mjs` troca no setup e no ready, e os do sistema já se registram com ele), e o derrotado do rastreador de
    combate também. Os efeitos que o sistema cria (a estase, a Sonífera, o fogo, as penalidades da NET e do Neuroport, o
    efeito novo da ficha) levam o ícone deles.
  - **As imagens padrão:** o ator e o item em branco (o getDefaultArtwork) usam o ícone neon do tipo, no lugar dos do CORE
    do C34.3 (que ficam em `icones/padrao` para os documentos antigos); o build põe o ícone do tipo nos itens do
    catálogo (e o do Black ICE nos programas dele), nos efeitos deles, nos personagens de exemplo e nas arquiteturas.
  - **A migração 10:** o documento com a imagem padrão do CORE de antes e o item do catálogo com a genérica do Foundry
    que o build punha ganham o ícone neon; o efeito de um estado no token (de um id só) com outra imagem, o do estado. A
    imagem que o mestre escolheu fica.
- **Limites:** os retratos (o mystery-man de quem não tem imagem própria fica como fallback neon), a ficha da arquitetura
  e o d10 das macros são da parte 2, com os botões.
- **Portões:** G1, 238 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 728 testes, 0 falhas (4
  testes novos em `tests/sistema/icones.test.mjs`: os SVGs iguais aos do gerador e só nas cores do tema; os 34 estados
  do Foundry e os 9 do sistema; o catálogo sem os genéricos; a migração 10. O teste do C34.3 passa a conferir os ícones
  neon e a troca dos antigos; os da arma do cyberware, do Black ICE e das arquiteturas, o ícone novo); G4 completo,
  312/312 em 670 s (a primeira rodada, 310/312, achou o C34.3 e o C34.1 da sessão KouArt ainda esperando a imagem antiga da arma em branco e do efeito novo; a segunda não abriu o mundo de teste, falha do ambiente), com o passo novo: os 43 estados e o derrotado com o ícone neon, que o Foundry carrega como textura; o
  Caído e o Suprimido ligados levam o ícone; o ator, o token e o item em branco e a arma do compêndio com o ícone do
  tipo. O passo do C34.3 (`tests/lib/c34-imagens.js`), o do C34.1 (`tests/lib/c34-ficha.js`, o efeito novo) e os do veículo e do Black ICE esperam os ícones neon. No foco,
  12/12.
- **Mutações:** as 6 caíram: I1 a I3 no G3 (o Caído sem ícone, a migração sem os estados e, no build, a munição com a
  imagem genérica) e I4 a I6 no G4 (os estados do Foundry com os ícones dele, o documento em branco sem a imagem neon,
  o derrotado com o ícone do Foundry).

### Ciclo 192 (2026-10-26): C49 parte 2, os glifos neon dos botões (sessão Junin)

- **Pedido e decisão do usuário (2026-10-26):** a parte dos botões do HUD e da ficha do C49 (o neon de 2077).
- **Entrega:**
  - **Os glifos:** `build/icones.mjs` desenha 47 glifos no mesmo traço dos ícones da parte 1, sem o fundo, numa cor só
    (`icones/neon/glifos`), e gera `styles/icones.css` (no manifesto): para cada uma das 48 classes do Font Awesome de
    ação do jogo que o sistema usa (rolar, os dados, atacar, mirar, recarregar, a vida, a NET, o favorito, plugar,
    consertar, a briga, o fogo, o chip, os eddies, o netrunner, a rota, o livro, o retrato, cortar, o mapa, buscar...), o
    glifo neon entra no lugar do do FA pela máscara CSS, na cor do botão (a do tema), com o brilho (drop-shadow).
  - **Onde vale:** nos elementos do sistema (a classe `cpr-fieldbook`: as fichas, os cartões, as janelas) e nos botões
    que o sistema põe no HUD do token (o perigo, a régua de DV, o token dinâmico, o scanner da NET, os da tripulação),
    que ficam ciano. Os botões do Foundry e dos módulos não mudam.
  - **Os genéricos de interface** (fechar, mais, menos, setas, salvar, a lixeira...) ficam com o glifo do FA, só com o
    brilho: a parte de ícones próprios é a das ações.
- **Limites:** a cena da arquitetura da NET continua com as imagens de andar dela (são peças de mapa tingidas pela cor
  do andar), e a macro de perícia com o d10 do Foundry.
- **Portões:** G1, 238 arquivos com sintaxe válida; G2, ESLint 10.12.0 sem erros; G3, 729 testes, 0 falhas (1
  teste novo em `tests/sistema/icones.test.mjs`: os SVGs dos glifos e o CSS iguais aos do gerador, o CSS no manifesto,
  cada classe do mapa usada pelo sistema e cada glifo usado; e as comparações dos SVGs passam a ignorar o fim de linha,
  que o git troca na cópia de outro PC); G4 completo, 313/313 em 707 s, com o passo novo: a estrela do favorito na ficha do
  personagem com o glifo neon e o brilho; o botão do perigo no HUD com o glifo dele, ciano; o fechar com o glifo do FA;
  os 47 glifos servidos. No foco, 12/12.
- **Mutações:** as 3 caíram: G1 e G2 no G3 (a estrela sem o glifo, o CSS fora do gerador) e G3 no G4 (o manifesto sem
  o CSS).

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
