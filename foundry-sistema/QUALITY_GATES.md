# Portões de qualidade

Uma tarefa do [ROADMAP.md](ROADMAP.md) só fecha quando estes portões passam. Falha não se esconde nem se contorna
tirando teste: ou se corrige a causa, ou a tarefa fica aberta com a falha registrada no
[MIGRATION_STATUS.md](MIGRATION_STATUS.md).

| Portão | Como roda | Passa quando | Estado |
| --- | --- | --- | --- |
| G1 Sintaxe | `node --check` em cada `.mjs` do sistema (com as subpastas, como `scripts/netrun/`) e nos testes | nenhum erro | ativo |
| G2 Lint | `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/lib/trava.js tests/cenarios/v14.js` (configuração em `eslint.config.mjs`, na raiz, sem node_modules) | nenhum erro | ativo |
| G3 Regras | `node --test "tests/sistema/*.test.mjs"` (com a pasta no lugar do glob, o Node 24 tenta rodar a pasta como arquivo) | todos passam: as regras puras com os valores de referência, e o conteúdo gerado contra a própria wiki (tabelas de DV faixa por faixa, lesões pelo 2d6, perícias, os itens da loja) | ativo |
| G4 Foundry 14 | `node tests/rodar.js v14` (o Foundry 14 do PC, sem janela, pasta descartável) | todas as checagens passam, inclusive a de nenhum aviso de compatibilidade nem erro vindo do sistema (capturados com a pilha no navegador do mestre e no do jogador) | ativo |
| G5 Wiki | `node tests/rodar.js` (a suíte inteira) | nenhuma falha nova; as conhecidas estão listadas abaixo | ativo |
| G6 Revisão | `git diff` do lote | sem mudança fora da tarefa e nada que alcance o servidor ou a campanha real | ativo |
| G7 Documentação | README, ROADMAP e MIGRATION_STATUS | o que mudou está escrito, e as limitações também | ativo |

## Falhas conhecidas da suíte da wiki (deste PC, não do sistema)

- **`fluxo`, "armas de 2077 do compêndio":** precisa do sistema CORE extraído em `foundry-2077/.cache`, que só existe num
  PC com o Foundry 12 e o CORE instalados.
- **`sistema`, "sem erros de JS na página":** dois 404 dos PDFs dos livros, que ficam fora do git (`*.pdf`).

## Falhas conhecidas desde a integração da revisão (ciclo 32): nenhuma desde o ciclo 116

A wiki do master trocou as regras das armas de 2077 pelas do Mission Kit, e os modos dos ciclos 17 e 18 seguiam o
suplemento de fã. Os testes de referência que pegaram isso voltaram a passar com as armas de 2077 pelo Kit (C29, ciclos
110 a 116): a arma Smart e a Kappa no 110; o Ricochete no 114; o perfil das Tech e a carga Tech no 115; as regras de cada
modelo, a Dian e Lexington e a checagem de avisos no 116 (a checagem que vinha e ia eram os avisos do passo da
Lexington, que carregava munição de pistola média e tentava o autofogo que ela não tem mais).

As falhas das Roles (3 no G3 e 1 no G4) saíram no ciclo 33, com as Roles do RED.

## Falhas conhecidas desde a integração do master (ciclo 93)

A wiki do master passou a ter "uma regra só na mesa" (o Mission Kit sobre o RED, sem as regras do suplemento de fã) e
revisou os itens do suplemento. Os testes de referência pegaram cada diferença. Cada uma é uma parte do C29 do
ROADMAP, e os testes não se tiram nem se mudam para passar:
- **G3 e G4:** nenhuma desde o ciclo 110 (o C29 terminou no 116);
- **Já saíram:** a Interface do Netrunner e o ponto de acesso à NET (G3, ciclo 94); o catálogo de 2077, o efeito de
  falha das armas (G3) e os tamanhos dos compêndios (G4), no ciclo 106; o TeleOptics e o passo 1 da migração (G3) e a
  janela de rolagem (G4), no ciclo 107; a fundação e as opções do cyberware (G3), no ciclo 108; as Roles do RED e os
  situacionais de Role (G3), no ciclo 109; o teste Smart (G3), os dois canos de 2077 e o "sem erros de JS na página"
  (G4), no ciclo 110;
- **G5, da wiki do master:** também falham num clone limpo do master (ciclo 93): o `criador` (2), o `cyberware` (6) e
  o `reversao` (o clone com o `campaign-map.js` antigo).

## Regras

- **Barras e proteção derivada (C34.3, em revisão):** o SP mostrado vem da mesma peça usada pelo dano (maior valor
  atual, não maior máximo). O HUD escreve nos itens, sem gravar SP derivado no ator. Diminuir abla as camadas do local;
  aumentar restaura só a fonte exibida. A fila só libera após a gravação terminar e relê a permissão e a peça ao sair
  da espera. Os testes também provocam recusa e erro para provar a liberação. O G4 preparado observa o redesenho
  automático após mudanças dos itens, chamando o desenho original: não força um redesenho que esconderia um gatilho
  ausente. Configuração, eventos reais do HUD, token solto e permissões em dois clientes aguardam execução no Foundry.

- **Opção de criação e ficha aberta (C34.2):** esconder o botão não basta; a ação relê a opção e a permissão. O G4
  revoga a opção com o botão antigo ainda desenhado, clica no botão real das fichas de personagem e capanga e confere
  também o observador. Nas mutações de navegador, rode um controle sem mutação e confira que a falha é a esperada,
  não uma falha de ambiente: os quatro templates só podem mudar a quantidade de botões indevidos.

- **Paliativo e efeitos anteriores (C19):** guarde os IDs dos efeitos ativos que a correção desliga. O "Voltou" só
  restaura esses IDs ainda existentes; religar todos altera efeitos desligados antes e os acrescentados depois. A
  marca antiga sem lista continua aceita. O G4 também confere o Death Save sem apagar a regra do item.
- **Janela e rolagem em andamento (C19):** releia permissão, documento e DV antes de rolar e depois de aguardar a
  rolagem. O G4 muda a DV nos dois momentos e confere que não se aplica o tratamento antigo. Criar item também pode
  devolver uma lista vazia: não anuncie lesão aplicada sem item. A fila no mesmo cliente e a releitura após o sorteio
  evitam duplicatas locais e recusam uma lesão que chegou por outra operação durante o await.
  Os chamadores também respeitam a recusa: o cartão de escolha do Monowire só registra a escolhida após a aplicação.
  Bloqueie outro tratamento da mesma lesão enquanto o primeiro aguarda: entre desligar os efeitos e gravar a marca,
  uma segunda correção poderia sobrescrever os IDs com lista vazia. O G4 segura essa gravação e confere a recusa;
  o `finally` precisa liberar a guarda também após cancelamento.

- **Ablação de camadas e Desfazer (C18):** escolher o maior SP não escolhe as únicas peças que perdem SP. Enumere todas
  as armaduras vestidas do local e guarde cada ID com a perda efetiva: uma camada com 1 SP atingida por perfurante perde
  só 1. Desfazer pela seleção atual ou pelo valor nominal restaura a peça errada ou SP demais. O G4 confere também
  peça retirada após o ataque, dano posterior, reparo antes de desfazer, token solto e estoque protegido no cliente do
  jogador. A permissão precisa estar na API, além de esconder os botões de quem só observa.

- **Estoque depois do `await` (C17):** criar uma pilha pode aguardar enquanto uma dose é consumida. Releia a quantidade
  antes de debitar; restaurar o valor de antes da criação recria a dose. O G4 consome uma droga pela API durante a
  criação e confere quantidade, efeito e flags. A fila serializa operações do mesmo cliente, sem prometer uma transação
  entre clientes.
- **Operação recusada e compensação (C17):** o Foundry pode devolver `[]` sem lançar erro, ou gravar só parte do pedido.
  Confira os IDs e as quantidades depois da criação, atualização e remoção; restaure a origem antes de apagar a cópia,
  e confira também a compensação. O G4 provoca cancelamentos, gravação parcial e remoção parcial da árvore.
  Um botão novo entra na lista exata de botões esperados do teste antigo, preservando a exigência dos demais.

- **Expiração nativa dos efeitos (C16):** `system.isSuppressed` devolve `true` quando suprime e `null` quando deixa o
  Foundry decidir. Devolver `false` substitui `duration.expired` e conserva o efeito vencido. O sinalizador é conferido
  nos dois clientes depois de avançar a hora, com a luz original do token preservada.
- **O relógio precisa ser o gatilho (C16):** leia o resultado automático antes de chamar a API de expiração no teste.
  Uma chamada manual logo depois de avançar o tempo esconderia a remoção do gancho `updateWorldTime` ou `ready`.

- **Montagem na ida e volta da wiki (C15):** exporte o vínculo por ID e também o `instaladoEm` vazio das cópias soltas.
  O fallback legado por nome precisa respeitar esse vazio; caso contrário, um segundo vidro homônimo entra junto e
  altera a proteção. O Foundry 12 já exporta o ID do item, portanto sua presença sozinha não identifica o formato novo.
  No teste de ida e volta, permute a ordem dos pais conservando a dos filhos e confira o UID da cópia solta. A ordem
  coincidente deixou sobreviver a mutação que removia todos os vínculos; os mesmos valores esperados devem passar por ID.
- **Cobertura e classes de arma (C15/C29):** o vidro que a carga Tech atravessa conserva HP e a defesa da pessoa.
  A espessura vem do máximo original (15 fino, 30 grosso), inclusive depois de o vidro sofrer dano.

- **Mudança de regra** só com a fonte (a página da wiki ou o código do CORE) e um teste de referência com o valor
  esperado.
- **Dúvida de regra** vira pergunta registrada no MIGRATION_STATUS.md, não interpretação nova.
- **Dados nos testes:** a conta fica com os dados fixos (`CONFIG.Dice.randomUniform` no cenário).
- **Passo novo no cenário** devolve o que mudou (balas, habilidades, HP, Sorte): os passos seguintes contam com o estado
  de antes. No ciclo 27, a bala de uma esquiva que o passo novo não devolveu fez a recarga do fogo supressivo, bem
  depois, avisar "sem munição compatível". Guarde o estado no começo e devolva no `finally`; os dados fixos que sobram
  também (`window.__fila = []`). Para trocar um objeto inteiro (as habilidades da Role, um `TypedObjectField`), use
  `_replace(...)`; o `update` só mescla.
- **Aviso esperado** (um `ui.notifications.warn` que o passo provoca de propósito) é capturado e conferido no próprio
  passo. Solto no console, o G4 o pegaria como problema.
- **Passo que quebra esconde o resto** (ciclo 110): um erro no meio do passo (o `rajada.ataque` da Lexington, que
  não faz mais autofogo e devolve `null`) tira do resultado o que já tinha dado certo (a Dian, no mesmo passo). Leia com
  `?.` o que pode não vir e deixe a checagem falhar: o passo falha mostrando os valores.
- **A munição do mesmo tipo na ficha** (ciclo 116): o `recarregar` pega a primeira munição compatível da ficha. Uma
  arma que o passo cria com o calibre de uma arma da ficha (o rifle da Grad e o do fuzil da Atiradora) carrega da munição
  dela, e um passo depois fica sem bala. Crie a munição junto, aponte o `system.carregada` da arma para ela e só então
  recarregue.
- **O G1 depois de um rebase** (ciclo 113): com um conflito aberto, o `git ls-files` lista o arquivo uma vez por estágio
  (no ciclo 112, o `combate.mjs` três vezes: 72 em vez de 70). Conte os arquivos depois de resolver.
- **Teste de uma correção** é provado falhando sem ela. A mutação é desfeita antes do commit.
- **Código para o navegador** (`edge.evaluate`) vai dentro de um template literal do Node: escreva `\\s` para chegar
  `\s` ao navegador. Um `\s` sozinho vira `s`. Ao editar o cenário por `node -e` ou por heredoc no Git Bash, as barras
  invertidas chegam pela metade: edite essas linhas no editor, ou escreva o script num arquivo.
- **Ordem do que se cria:** o Foundry não garante que `createEmbeddedDocuments` devolva os documentos na ordem dos dados.
  Ache cada um pelo tipo, pelo nome ou por um `_id` escolhido antes (`keepId: true`).
- **Janela fechando:** no Edge sem janela, uma janela do Foundry fica no DOM com a classe `minimizing` por até 1 s
  depois do clique (o `close` espera a animação). Para contar janelas abertas, e para achar a que vai receber o
  clique, use `:not(.minimizing)`: a janela que fecha também tem os botões, e o clique nela se perde.
- **G4 com a mesa do servidor em uso:** o cenário pergunta à wiki online (`/api/estado`) se há gente na mesa do servidor
  e, havendo, pula a parte do Foundry ("parte do Foundry pulada"), porque a licença vale para uma mesa por vez. Esse G4 dá
  "Tudo certo" com 5 passos e não vale como portão: espere a mesa esvaziar e rode de novo (no ciclo 35, um laço conferiu
  a mesa a cada 2 minutos). Não contorne a checagem. Para mudar o código durante a espera, pare o laço só antes de ele
  começar o G4; se já começou, deixe terminar. O instalador copia o sistema no começo do G4, e a rodada fica com a versão
  de antes: serve de pista, não de portão (ciclo 36). **Nas mutações, o mesmo vale para cada uma:** a mutação rodada com
  a mesa ocupada "passa" (5 passos, saída 0) sem testar nada, e parece um buraco no teste. No ciclo 64, a D6 rodou assim
  (a mesa ficou ocupada entre uma mutação e outra) e foi refeita. O executor das mutações espera a mesa antes de cada
  uma e marca como inválida a rodada que pulou o Foundry. E não mexa na worktree enquanto as mutações rodam: cada
  rodada copia o sistema no começo, e a mudança entraria nela.
- **Um teste com navegador por vez** (ciclo 86): as sessões deste PC (a worktree e o clone de cada agente) dividem o
  Foundry 14 de teste, a pasta descartável e as portas. O `tests/rodar.js` pega a trava
  (`%LOCALAPPDATA%\FieldbookTeste\testes.trava`, pelo `tests/lib/trava.js`) antes de subir os servidores; se outro teste
  a tem, avisa ("Outro teste está rodando", com a pasta do outro) e espera. A trava de um processo que já não existe
  vale como solta, e a que ficou ilegível também, depois de um minuto. Não apague a trava de um teste vivo. Um G4
  interrompido no meio deixa o Foundry de teste e os Edge rodando: pare-os (e apague o perfil `wiki-testes-edge-*`)
  antes de começar outro.
- **O mundo de teste que não fica pronto:** o Foundry 14 aceita a entrada antes de saber os próprios endereços (logo
  depois de "Server started"), e quem entra nesse intervalo derruba o envio do mundo: o `servidor.log` do Foundry de
  teste (`%LOCALAPPDATA%\FieldbookTeste\foundry14`) mostra "Cannot read properties of null (reading 'local')" em
  `Express.getInvitationLinks`, e o navegador fica sem o mundo ("O mundo de teste não ficou pronto no navegador"; os
  passos seguintes caem todos). A espera de 2 s depois de subir nem sempre basta: aconteceu nos ciclos 55, 56 e 57 (no
  57, em três rodadas seguidas). Desde o ciclo 57, o `entrarComo` entra de novo uma vez quando o log tem esse erro, e
  o relatório avisa; outro motivo, ou a segunda vez, derruba o passo como antes.
- **O Edge dos testes que não fechava** (ciclo 58): o `msedge.exe` lançado passa o navegador para outro processo e sai,
  e o `proc.kill()` do `fechar()` não fechava nada. Cada rodada deixava dois Edges inteiros (uns 13 processos cada) e os
  perfis em `%TEMP%\wiki-testes-edge-*`, que continuavam crescendo. No ciclo 58 eram 49 perfis e 427 processos (uns 13 GB),
  e o disco encheu no meio das mutações (a rodada daquela hora não vale). Desde então o `tests/lib/edge.js` fecha pelo
  `Browser.close` do protocolo, mata o que ainda tiver o perfil na linha de comando e apaga o perfil (tentando de novo),
  avisando se ele ficar. Matar a árvore do processo lançado (`taskkill /T`) não basta: ele já saiu (a primeira tentativa,
  e cinco rodadas deixaram 90 processos). Conferido: com o ajudante antigo, três aberturas deixaram 47 processos e 3
  perfis; com o novo, nenhum, também depois de duas rodadas inteiras do G4. Uma rodada parada à força (o `fechar()` não
  roda) ainda deixa o Edge aberto; confira com `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object
  { $_.CommandLine -like '*wiki-testes-edge-*' }` e feche só esses (os outros são o Edge do usuário).
- **A janela que sai com animação** (ciclo 77): o `DialogV2` fecha com uma animação, e o elemento fica no DOM por um
  instante. Um passo que abre uma janela atrás da outra precisa esperar a anterior sumir antes do próximo clique; senão,
  a resposta vai para a velha, a nova fica aberta e o passo lê o que não aconteceu. E uma janela que sobra aberta
  derruba outros passos (o `.application.dialog` que eles procuram acha a sobra): o `finally` do passo fecha as janelas
  que ele abriu.
- **O `__esperar` não falha** (ciclo 80): ele devolve a condição quando o tempo acaba, sem erro. Esperar não é conferir:
  o passo lê o estado depois da espera e confere no `ok`. No ciclo 80, a mutação "o Soltar não tira a marca do outro"
  sobreviveu porque o passo só esperava as marcas sumirem.
- **O d10 fixo em 1 ou em 10 é crítico** (ciclo 99): o teste rola mais um dado (a falha tira, o sucesso soma), e o
  dado a mais não é o que o passo fixou. Para conferir um total, fixe de 2 a 9. No ciclo 99, o mestre com o 1 deu −5
  na Interface (4 + 1 − 10), e o jogador com o 10 deu 20 na Concentração.
- **A limpeza que dispara o sistema** (ciclo 103): apagar o token do netrunner ainda ligado a um Neuroport dispara a
  varredura do `deleteToken`, que manda o cartão do Jack Out inseguro. Se o cartão chega no passo seguinte, ele conta
  como o daquele passo (os passos esperam o número de cartões). A limpeza tira antes as flags do netrunner e dos alvos.
- **O crítico efetivo e os dois clientes** (ciclo 88): o Solo pode suprimir a falha do 1 natural. A consequência da
  arma lê o crítico já resolvido na mensagem da rolagem. Como o mestre usa essa mensagem para montar o resultado,
  o G4 também cria um ataque no navegador do jogador e confere flag e cartão nos dois, com o ataque escondido.
  A mutação que só lê o crítico do mestre cai nesse caso; os tiros comum e do Solo pegam a falha forçada.
- **Um erro no `finally` esconde o resultado do passo** (ciclo 81): ele substitui o que o `try` devolveu. Na limpeza de
  coisas que um gancho do sistema apaga em par (as duas marcas do agarrão: o mestre apaga a do outro lado), apagar as
  duas corre contra o gancho ("does not exist"); a limpeza tolera a corrida (`.catch`) e espera o estado final.
- **A fila das notificações** (ciclo 82): o Foundry 14 mostra no máximo 5 ao mesmo tempo, por 5 s cada, e só manda para o
  console (onde a checagem de avisos as pega) quando a notificação aparece. Um recado a mais num passo (o "entrou sem
  fundação" de cada opção instalada sem fundação) pode deixar o aviso de outro passo na fila. Antes de concluir que um
  aviso sumiu, confira o fluxo (no ciclo 82, um G4 de diagnóstico mostrou que a rajada da Lexington voltava nula, com 5
  notificações na tela, como antes). E o recado que não é problema (a instalação deu certo) vai como `info`, que o
  console registra como `info`, fora da checagem.
- **O lugar livre na cena do combate e o token que acabou de andar** (ciclo 95):
  - a cena "Teste de combate" já tem os tokens dos passos de antes (o Capanga a 2 m do Alvo). Um token novo "ao lado" de
    um deles vai para um quadrado livre, conferido pelo passo: no ciclo 95, o netrunner caiu no mesmo quadrado do
    Capanga, e a parede entre os dois não tinha linha para cortar;
  - logo depois do `update` de x e y, o `token.x` ainda é o de antes, enquanto o token anda (o destino está no
    `_source`). A conta que usa o lugar novo (onde pôr a parede) usa o lugar pedido, e o outro navegador espera o token
    chegar antes de agir;
  - o gancho do `updateToken` também vê o `token.x` de antes (ciclo 100): a conta do alcance do Neuroport, no gancho,
    usa o `_source`, como a da arquitetura (`netrun/regras-da-net.mjs`). Com o `token.x`, o Jack Out inseguro do
    netrunner levado para longe só caía quando ele voltava.
- **Aviso novo com a checagem de avisos já falhando** (ciclo 92): a checagem "nenhum aviso" do fim do G4 falha pelo
  aviso conhecido da Lexington, e um aviso a mais (o de uma API que saiu, por exemplo) não muda o resultado dela. O
  passo que pode gerar um aviso lê o `window.__avisos` do navegador antes e depois da ação e confere os novos.
- **Um caminho de reserva esconde a mutação** (ciclo 85): quando o mesmo efeito vem por dois caminhos (o token
  assumido volta na desconexão e também no reinício das defesas; a lista da janela some pelo filtro do código e pela
  condição do modelo), o passo monta o caso em que só um deles vale: o ponto sem o reinício, dois nós de controle no
  andar e só um tomado. No ciclo 85, com um nó só e o reinício ligado, as duas mutações sobreviveram.
- **A segunda lesão sem criar a primeira na ficha** (ciclo 111): a expansiva precisa excluir Objeto estranho da nova
  rolagem também no modo "Anunciar". No modo "Na ficha", a proteção geral contra repetir uma lesão já existente
  pode esconder a falta dessa exclusão. O passo confere os dois modos, com a primeira repetição forçada nos dados.
- **Uma pergunta aberta não reserva o estado** (ciclo 111): ao confirmar a escolha EMP, releia o cartão e os itens antes
  de desligá-los. O ataque pode ter sido desfeito enquanto a janela estava aberta. O passo também tenta uma segunda
  escolha simultânea e fecha janelas extras inesperadas, para falhar sem ficar esperando uma resposta humana.
- **Equipamento depois de uma espera** (ciclo 111): o EMP pode chegar durante uma rolagem, consentimento, escolha ou
  carregamento do catálogo. Reconferir antes do dado no cliente e antes de resolver no mestre. O cenário interrompe
  cada espera separadamente, inclusive a ligação da arma Smart do Kit, e confere dados, Sorte e munição preservados.
- **Os Passwalls de uma ligação direta** (ciclo 111): o Self-ICE que volta de um EMP não revoga o acesso do Personal
  Link. A conta efetiva é a mesma nos portões e na ficha; o G4 confere o botão Quickhack e o resultado depois de
  Desfazer e do minuto, sem alterar os Passwalls guardados na ligação.
- **Relógio do combate e duração do efeito** (ciclo 111): o minuto precisa de 20 rodadas reais de 3 segundos. Alterar
  `CONFIG.time.roundTime` também muda a apresentação dos efeitos antigos em rodadas fora de combate. O sistema usa
  `Combat#getTimeDelta`; o G4 avança a fila e confere 3, 57 e 60 segundos, mantendo os testes dos quickhacks anteriores.
- **A rolagem da segunda tentativa** (ciclo 111): tanto o primeiro tiro como a Inteligente têm `teste.ataque`. Para
  distinguir as contas e os autores, filtre por `teste.inteligente`; o mirado conserva a penalidade só no primeiro tiro.
- **A ordem do que o `createEmbeddedDocuments` devolve:** criando vários documentos de uma vez (tokens, combatentes), a
  lista que volta nem sempre vem na ordem pedida. Pegar cada um pela posição dá falhas que vêm e vão: no ciclo 43, o passo
  da iniciativa trocou o ICE e o demônio (e pareceu, errado, que a fila de turnos saía na ordem antiga depois do
  `resetAll`; a lição registrada naquele ciclo foi corrigida no 45); no ciclo 45, o do dano do Black ICE marcou o Imp
  no lugar do Hellhound. Crie um por vez, ou ache cada um pelo `actorId` (o token) e pelo `tokenId` (o combatente). Vale
  também para os itens: no ciclo 108, o passo do Neuroport como arquitetura (do ciclo 105) pegou o deck do Capanga pela
  posição, e o Hellhound foi parar no id do Self-ICE; o passo acha o deck pelo tipo.
- **A limpeza de um passo com os ganchos do sistema:** apagar um ator pode fazer o mestre apagar outras coisas (apagar
  o netrunner tira o token do Black ICE rezzado dele). Na limpeza, tire os tokens antes dos atores; senão, a limpeza e o
  gancho apagam o mesmo token, e o passo cai com "Token … does not exist" (ciclo 46).
- **O passo "nenhum aviso" falhando pelos avisos conhecidos:** enquanto os avisos da Lexington (2077) o derrubam, um erro
  novo do sistema ficaria escondido nele. Confira o detalhe a cada G4: tem de ter só os dois da Lexington.
- **Rolagem síncrona no Foundry 14:** `new Roll('3d6').evaluateSync()` lança erro ("This Roll contains terms that cannot be
  synchronously evaluated"): os dados não rolam síncronos no modo estrito. Use `await roll.evaluate()` (ciclo 49).
- **Token andando no Foundry 14:** no gancho `updateToken` de um movimento, e enquanto o token anda, o `token.x` e o
  `token.y` ainda são os de antes (visto no mestre, com o token movido pelo jogador); o `_source` e as mudanças do
  gancho já têm o destino. Conta de distância vai pelo `_source`. No ciclo 50, o mestre media o netrunner que saiu do
  alcance na posição antiga, e a queda só vinha no movimento seguinte: o diagnóstico registrou no gancho o `x` de antes
  e o `x` novo nas mudanças.
- **Dados fixos em toda rolagem do passo:** o passo fixa os dados de tudo o que ele provoca, até do que ele não confere.
  No ciclo 53, a chegada ao andar com Black ICE passou a rolar a velocidade, e o passo dos inimigos do ciclo 52, que não
  fixava esses dados, caiu (a velocidade saiu "24 contra 21" e mudou o registro); ele ganhou os dados fixos. No d10 de
  um teste do sistema, o 1 tira outro d10 (o próximo da fila) e o 10 soma outro: o dado fixo vai de 2 a 9 (no ciclo 55,
  o ataque do Hellhound com o 1 saiu "−2 contra 9", e a defesa rolou fora da fila).
- **O combate que sobra na cena:** o passo dos turnos deixa o combate dele (a Atiradora, o Alvo e o Capanga) ativo até
  o fim do cenário. O passo que depende do combate da cena (os inimigos da NET entram no combate ativo dela) apaga os
  combates da cena antes de começar: no ciclo 55, o netrunner e os inimigos entraram no combate da Atiradora, e a vez
  seguinte à do Hellhound foi a dela.
- **Pergunta (DialogV2) no cenário:** ache a janela nas instâncias (`foundry.applications.instances`) pela classe
  (`options.classes`) ou pelo título (`options.window.title`) e clique no botão pelo `data-action` (`ok`, `yes`). Quando
  a pergunta abre no mestre por causa de um clique do jogador (o vírus na NET), o clique do jogador não espera: o passo
  responde no navegador do mestre e depois espera o resultado no do jogador (ciclo 51).
- **Mensagem do chat na página:** ela aparece duas vezes (no chat e na notificação), cada uma com os botões ligados.
  Para contar os botões de um cartão, procure dentro de uma das duas (`document.querySelector('[data-message-id=...]')`);
  no documento inteiro, a lista vem dobrada (ciclo 42).
- **Mudança na ficha:** o cenário captura cada aba da ficha (`tests/.saida/v14-ficha-*.png`). Confira as capturas antes
  do commit: o teste pega o que a ficha mostra, não se ficou bonita. No ciclo 19 as capturas acharam as linhas de
  perícia altas demais e o cabeçalho quebrado, com todos os testes passando.
- **Limpeza no `finally`:** o passo que cria combate, marca alvo ou abre janela desfaz isso num `finally`. Uma falha no
  meio não pode arrastar os passos seguintes: no ciclo 17, um combate e um alvo marcado que sobraram derrubaram três
  passos de fogo supressivo e de turnos.
- **Janela sem prazo:** a janela de defesa de NPC do mestre espera o clique para sempre. O passo em que um defeito
  pode abrir uma dessas janelas fora da vez fecha e anota a janela inesperada, e confere a lista vazia. Assim ele falha
  em vez de travar a suíte: no ciclo 18, uma mutação travou o G4 por mais de 10 minutos. Depois de clicar numa janela,
  espere ela sair do estado desenhado (`!app.rendered`), porque o fechamento só começa depois do clique.
- **Janela que redesenha:** depois de um clique que muda um documento, espere a janela mostrar o estado novo (a linha
  nova, o saldo novo), e não só o dado do documento. O redesenho vem depois e troca os campos: preencher a janela antes
  dele perde o que foi escrito. Por isso a janela que acompanha um documento entra em `documento.apps`, como as fichas,
  e não num gancho com um `render()` a mais: dois redesenhos por mudança abrem essa brecha entre um e outro.
- **Estado do ator no cenário:** leia `ator.system` a cada vez. O Foundry monta um objeto novo a cada mudança, e o que
  ficou guardado numa variável mostra o estado de antes (no ciclo 23, uma espera esgotou e a checagem leu a
  especialização antiga, com o sistema certo).
- **Clique com Ctrl no cenário:** o `.click()` não leva tecla. Para o Ctrl + clique (rolar direto, sem a janela de
  rolagem), use `dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))`. O passo
  que clica num botão de rolar (atributo, perícia, ataque) e não testa a janela usa o Ctrl + clique: o clique comum
  abre a janela, que fica esperando e derruba passos seguintes (no ciclo 25, a carga Tech deixou a janela aberta, e o
  passo da ficha nova, bem depois, achou essa janela no lugar da pergunta dele). O navegador do jogador entra com "Rolar
  direto" ligado (a esquiva, o dano e o Death Save que o mestre pede rolam direto); o passo da janela do jogador
  desliga e volta.
- **Pergunta do DialogV2:** o texto fica em `.dialog-content`, e os botões em `.form-footer`. O `.window-content` e um
  `button[data-action]` solto pegam também os botões e os controles do cabeçalho (no ciclo 21, duas rodadas do G4
  falharam por isso, com o sistema certo).
- **Janela de reação do alvo** (ciclo 28): não é DialogV2. As escolhas são `button.opcao[data-escolha="..."]` em
  `.application.cpr-fieldbook.janela-defesa`, e o X é `.window-header [data-action="close"]`. Fechar a janela do jogador
  vale a escolha padrão e responde ao mestre: o `finally` que fecha uma janela de reação que sobrou manda essa resposta
  (o mestre que já não espera a ignora). O passo que espera o tempo acabar baixa a configuração "Tempo" (o mínimo é
  10 s) e a devolve no `finally`. Para responder a uma segunda janela logo depois da primeira, espere uma janela com
  outro `id`: a que acabou de ser respondida pode ainda estar no DOM, e o clique nela se perde.
- **Texto em cima do token** (ciclo 29): o cenário grava o que o `canvas.interface.createScrollingText` mostra, com uma
  função posta no próprio objeto que chama a do protótipo. O `finally` apaga essa função (`delete`), e a do protótipo
  volta.
- **Cena no cenário** (ciclo 38): crie com `active: false`. Sem cena ativa, o Foundry 14 liga a primeira que se cria
  (`Scene._preCreateOperation`), o canvas começa a desenhar, e mexer no token durante o desenho quebra o core
  (`canvas.pendingRenderFlags` ainda não existe). O passo que precisa do canvas ativa a cena e espera o `canvas.ready`.
- **Token não ligado de personagem** (ciclo 38): o protótipo do personagem sai sempre ligado (`AtorCPR._preCreate`).
  Peça o token solto na criação: `ator.getTokenDocument({ x, y, actorLink: false })`. O capanga já sai solto.
- **O tema de uma janela e os botões do cabeçalho** (ciclo 58): os controles do cabeçalho do Foundry 14 (fechar, o menu)
  são `<button>` com o ícone na classe do próprio botão (`fa-solid fa-xmark`). Uma regra como `.janela-net button
  { font: … }` troca a fonte deles e o ícone vira "▯". As regras de botão e de campo do tema ficam no corpo da janela
  (`.janela-net .janela-net-corpo button`); o G4 confere a fonte do botão de fechar da janela da NET.
- **Texto que os testes leem e o visual** (ciclo 58): os passos leem o `textContent` (o mapa, o andar escolhido, as Ações
  NET, os avisos, o deck) e, no registro, o texto exato da linha. Rótulos e enfeites novos vêm do CSS (`::before`,
  `::after`, `attr()`) ou de elementos vazios (os ícones, os losangos, a barra de REZ); a hora do registro vai no
  `data-hora` da linha, desenhada pelo CSS.
- **Finais de linha:** o `sed -i` do Git Bash troca o CRLF de um arquivo por LF (no ciclo 58, o `tema.css` inteiro; no
  ciclo 67, de novo, o `tests/cenarios/v14.js`, para trocar uma palavra no nome de um passo). Não use `sed -i` nos
  arquivos da worktree: edite com a ferramenta de edição ou com um script do Node, e confira os finais de linha de cada
  arquivo mexido (o diff de um arquivo inteiro, numa mudança pequena, é o sinal).

- **A caixa marcada sem equipar e o drop já equipado** (ciclo 87): corrigir a equipagem no `_preUpdate` pode deixar
  o diff vazio, que o Foundry descarta sem redesenhar a ficha. O envio do formulário reconcilia a caixa com o estado
  gravado; o G4 lê o documento e a caixa e edita outro campo na mesma ficha. E arrastar um item copia a equipagem da
  origem: a conferência só na transição guardado → equipado não vê quem já nasce equipado. O drop usa um clone
  efêmero guardado e tenta equipar uma vez; o G4 confere também a origem intacta e um só aviso no capanga.
  Na mesma rodada, Agarrar mostrou outra ordem assíncrona: as marcas chegam antes do cartão. O passo espera também
  a mensagem nova antes de ler o resultado, mantendo a conferência dos valores.

- **O que a wiki ainda recusa** (ciclo 121): a API do master manda 409 ao Foundry que não declara um suporte (`roles=2`, as
  duas Roles; `locais=1`, o lado do cyberware), para um importador antigo não criar um ator pela metade. O sistema só
  declara o suporte no mesmo ciclo em que passa a guardar o dado, e o passo do G4 importa um personagem com ele: sem a
  declaração, a importação cai no 409 e o passo falha.
- **Integrar o master nesta branch** (ciclo 126): `git merge -X no-renames master`. Sem o `no-renames`, o git vê
  renomeações entre o CORE de referência (`fvtt-cyberpunk-red-core-dev`) e os arquivos do sistema e abre centenas de
  conflitos falsos de renomear e apagar. Depois, os portões inteiros: a wiki nova muda a referência dos testes.
- **Um aviso esperado num passo do G4** (ciclo 131): o G4 confere que nenhum aviso do sistema chegou ao console. O passo
  que provoca um aviso de propósito (uma recusa) troca o `ui.notifications.warn` por um que só guarda a mensagem, e o
  devolve com `delete`, como o passo do ataque sem mestre. Chamar o original deixa o aviso no console, e a checagem
  global falha.
- **A barra de macros no G4** (ciclo 139): o Foundry 14 não tem o `User#getHotbarMacro`; a macro da vaga se lê por
  `game.macros.get(game.user.hotbar[n])`. O arrastar de verdade, sem mouse: um `new DataTransfer()` no `DragEvent`
  "dragstart" da linha da ficha e no "drop" da vaga (`#hotbar .slot[data-slot]`): passa pelo DragDrop da ficha, pelo da
  barra e pelo gancho `hotbarDrop`, como o mouse.
- **Um painel novo numa aba das maquetes** (ciclo 139): o passo da "ficha nova" conta os painéis da coluna dos números
  (3 na aba Combate: a iniciativa, os vitais e a defesa), a forma da maquete "Fight Tab". Uma lista nova (o painel
  Favoritos) vai para a coluna da direita, com as outras listas, e a conta fica.
- **Uma rodada interrompida no meio** (ciclo 139): o executor das mutações volta o arquivo no `finally`, que não roda
  quando o processo é morto (o PC sem memória matou a rodada da M5). Depois de uma interrupção, confira o md5 dos
  arquivos mutados antes de qualquer outra coisa e volte o que ficou mutado.
- **O trabalho de um worker do Antigravity** (ciclo 140): o worker (o `agy`, numa worktree própria, sem comandos de
  terminal) escreve código no estilo do sistema, mas inventa referências: no C22, uma função e um modelo do CORE que não
  existem, as chaves da tabela de moradia da wiki e os nomes esperados nos testes; no C26, a DV de uma faixa e o `fixar`
  do cenário. Antes dos portões, confira cada citação no arquivo (a cópia do CORE, os `system-*.js`) e cada valor
  esperado na fonte (a tabela da wiki, o `resultado` do personagem). Um teste que lê a fonte é melhor que um número escrito.
- **As mutações com o PC sem memória** (ciclos 139 e 140): o Claude Code mata o processo de fundo quando a memória fica
  crítica, e o `finally` do executor não roda. Com pouca memória, rode uma mutação por vez em primeiro plano (cada G4
  cabe nos 10 minutos do comando), e confira o md5 depois de cada uma.
- **A régua montada à mão no G4** (ciclo 144): a `TokenRuler` criada pelo passo (`new CONFIG.Token.rulerClass(token)` e o
  `refresh` com os waypoints) mede a distância, mas o custo do movimento sai "∞" (sem o movimento planejado do token):
  confira o que o sistema põe no rótulo (a DV), não o número de metros do custo.
- **O aviso intermitente dos pedidos da loja** (ciclo 145): a entrega dos pedidos da wiki roda sozinha a cada minuto, e
  pode cair junto com a do passo "pedidos da loja" (o pedido caro demais, sem dinheiro): o aviso dela sai depois que o
  passo devolveu o `warn`, e a checagem final falha. Numa rodada, rode de novo antes de procurar a causa no ciclo.
- **A janela aberta pelos avisos** (ciclo 147): os avisos de envio (`wikiAvisos`, ligados por padrão) abrem sozinhos a
  janela "Personagens da wiki", a cada minuto, quando há envio ou pedido novo. Um passo que abre a janela pode achá-la já
  aberta, com a lista de antes: espere o elemento que vai clicar (o pedido criado no passo), não uma linha que já existia.
  E o `window.fetch` guardado para devolver no fim se chama com `.call(window, ...)`: solto, o Edge recusa ("Illegal
  invocation").
- **O foco visível no G4** (ciclo 150): um `KeyboardEvent` sintético não põe o navegador no modo de teclado, e o
  `:focus-visible` não liga. Para conferir o contorno do foco, mande um Tab de verdade pelo protocolo do Edge
  (`edge.send('Input.dispatchKeyEvent', ...)`) antes de focar o controle.
- **Dois danos no mesmo ator, no mesmo fim de turno** (ciclo 156): os ganchos do `updateCombat` rodam ao mesmo tempo, e
  cada `ator.update` parte do HP que o cliente tinha antes da resposta do servidor: o fogo da NET e a radiação do perigo
  liam o mesmo HP, e um dos danos sumia (80 com 4 e 2 dava 76 ou 78). Ponha o que grava o HP do mesmo ator numa fila (o
  `naFila` de `perigos.mjs`), com o Desfazer junto, e tire o turno (`combate.previous`, `combate.combatant`) antes do
  primeiro `await`: o Death Save do jogador espera o prazo inteiro, e o combate anda.
- **O Codex no Windows** (ciclo 156): a revisão roda com `codex exec -s read-only -c 'windows.sandbox="unelevated"' -c
  model_reasoning_effort=high`. Sem o `windows.sandbox`, o `workspace-write` cai para só leitura e recusa até o
  `Get-Content`; o esforço padrão é "none". No sandbox, o G3 dá `spawn EPERM`: os portões rodam fora dele.
- **Uma aplicação para várias pessoas** (ciclo 157): um erro no meio (o token apagado durante a rolagem de alguém) parava
  tudo antes do cartão, e o dano de quem já tinha passado ficava sem Desfazer. Proteja cada pessoa (`try/catch`, com a nota
  na linha), grave o Desfazer logo depois de cada dano e crie o cartão sempre. E o que se escolhe numa janela envelhece com
  ela aberta: confira de novo o estado (o veículo, o "Dirigir") antes e depois de rolar.

## Build

- **O que o build baixa é conferido.** A tag do CORE tem de ser do commit `75b8c9d…`, e o js-yaml (código que roda no
  build) tem de ter o SHA-256 registrado em `build/conteudo.mjs`. Qualquer diferença para o build sem executar nada.
- **Versões exatas:** `@foundryvtt/foundryvtt-cli@1.1.0` e `eslint@10.12.0`.

## G4 num PC sem o instalador do Foundry 14

O cenário procura o Foundry 14 do instalador do Windows. Sem ele, dá para usar o app do servidor (a parte de servidor do
Foundry é a mesma em todo sistema operacional), todo dentro da pasta descartável:
- **O app:** `resources/app` do zip do Linux (no servidor, `/srv/foundry14/app/resources/app`) em
  `%LOCALAPPDATA%\FieldbookTeste\foundry14-app`.
  - O único módulo nativo dele é o `classic-level` 3.0.0, que vem só com o binário do Linux.
  - Copie para `node_modules/classic-level/prebuilds/win32-x64/` o `classic-level.node` da mesma versão. O do npx da
    foundryvtt-cli 3.x serve.
- **O Node 24:** o Foundry 14 pede `>=24.13.1 <25`. Use o Node portátil oficial em `%LOCALAPPDATA%\FieldbookTeste\node24`,
  conferido pelo SHA-256 do site do Node.
- **Rodar:** `FOUNDRY14_APP=%LOCALAPPDATA%\FieldbookTeste\foundry14-app %LOCALAPPDATA%\FieldbookTeste\node24\node.exe tests/rodar.js v14`.
- **Prova:** montado assim em 2026-10-12, o G4 deu os mesmos 61 de 67 do PC com o instalador; as 6 falhas são as
  conhecidas.

## Segurança

- **Instalar:**
  - só num Foundry 14 (o `instalar.mjs` confere);
  - no servidor, só no Foundry 14 da mesa nova (`/srv/foundry14`), pelo `servidor/instalar-sistema-v14.sh` (decisão do
    usuário, 2026-10-12);
  - no Foundry 12 da mesa, nunca.
- **Testes:** usam só a pasta descartável `%LOCALAPPDATA%\FieldbookTeste`. Da pasta do Foundry do PC sai só a licença.
- **Git:**
  - commits no branch `sistema-v14`, com push no fim de cada ciclo: as sessões trabalham no mesmo plano (o de paridade,
    no ROADMAP; decisão do usuário, 2026-10-12; três desde 2026-10-17, com a sessão Codex);
  - os agentes de IA seguem o `AGENTS.md` da raiz (o `CLAUDE.md` só importa ele);
  - o master é da wiki e do servidor.
