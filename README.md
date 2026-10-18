# Night City Fieldbook

Wiki de mesa para as campanhas de Cyberpunk RED ambientadas em 2077: o Protocolo Morana e as que vierem, ao mesmo tempo, no mesmo universo (veja **Campanhas**).

## Wiki e mesa online

A wiki e o Foundry podem rodar num servidor gratuito (Oracle Cloud), sempre ligados, com endereço fixo: `https://wiki.SEUDOMINIO` para a wiki e `https://mesa.SEUDOMINIO` para o Foundry. O passo a passo da mudança está em [servidor/README.md](servidor/README.md).

- **Publicar uma mudança:** edite no PC e dê dois cliques em **`publicar.bat`**.
  - Ele recusa se o OneDrive tiver voltado algum arquivo para uma versão antiga.
  - Ele mostra o que mudou, pede uma descrição curta e manda para o GitHub.
  - Ele espera a versão nova aparecer na wiki online, o que leva até 1 minuto.
- **Mestre:** entra por `https://wiki.SEUDOMINIO/mestre`, com a senha. O aparelho fica lembrado por um ano.
  - No menu da conta (o botão **Mestre**, no canto de cima) ficam **Sair do modo mestre**, **Baixar backup** (o servidor faz um por dia) e a versão no ar.
- **Mesa:** a barra lateral das duas wikis mostra se a mesa está aberta e quantos estão conectados, e tem o botão **Entrar na mesa**. Com o mundo ligado a uma campanha, diz de qual campanha é a mesa, e só quem joga nela a vê aberta.
- **Servidor, para o mestre:** a barra lateral resume o último backup, o disco livre, se o módulo do Foundry está esperando a mesa vazia e as últimas publicações. Fica em vermelho com backup de mais de 2 dias ou disco com menos de 10% livre.
- **No celular, como app:** no menu da conta (canto de cima) aparece **Instalar no celular** (Android e computador; no iPhone, Compartilhar → Adicionar à Tela de Início).
  - Instalada ou não, a wiki guarda no aparelho as regras e o que o mestre publicou nas campanhas do jogador, e abre sem internet. Os personagens e a loja precisam de rede.
  - Com rede, ela sempre busca a versão nova primeiro.
  - A wiki do mestre nunca fica guardada no aparelho.
- **Dados ao vivo:** no servidor, ficam fora do git (`/srv/fieldbook/dados`).
  - São personagens (com as anotações), retratos, códigos e sessões, as preferências de cada conta, as campanhas (com o Publicar, as regras da loja e a mesa do mestre de cada uma) e as Notícias de Night City.
  - Use a wiki online para mexer neles: a wiki do PC vira um lugar de teste.

## Como abrir a wiki no PC

Nesta pasta, rode:

```
node server.js
```

e abra `http://localhost:8000`.

- Por padrão, só este computador acessa.
- Para os jogadores entrarem pela rede: no PowerShell, `$env:HOST='0.0.0.0'; node server.js`. O servidor mostra no terminal o endereço (`http://192.168.x.x:8000`) para passar aos jogadores.
- **Quem entra de outro aparelho só recebe a visão dos jogadores** (`jogadores.html`). A wiki do mestre, os documentos `.md`, os PDFs e os arquivos de dados ficam bloqueados para eles.
- Para usar a visão do mestre num tablet: `$env:HOST='0.0.0.0'; $env:GM_KEY='uma-senha'; node server.js` e, no tablet, abra uma vez `http://IP:8000/?mestre=uma-senha`. O tablet guarda um cookie e passa a abrir a wiki do mestre.
- Abrir o `index.html` com dois cliques funciona para as páginas de resumo, mas os **documentos completos** e a visão dos jogadores só funcionam pelo servidor.

## Jogar com gente de fora de casa (sem servidor)

Com a wiki e o Foundry no servidor (veja **Wiki e mesa online**), isto não é mais necessário. Sem o servidor, sem mexer no roteador: o `abrir-online.bat` abre o Foundry e a wiki dos jogadores pela internet, com um túnel do Cloudflare (`cloudflared`, instalado com `winget install --id Cloudflare.cloudflared`).

1. Abra o Foundry e **lance o mundo** (sem mundo aberto, quem chega pelo link cai na tela de configuração; o script avisa).
2. Dê dois cliques em `abrir-online.bat`. Ele liga a wiki, se ela não estiver rodando, e abre um túnel para o Foundry e outro para a wiki.
3. **Espere aparecer "Pronto: o link … funciona de fora"** para cada um. O script só mostra os links depois de testá-los pelo próprio Cloudflare. O do Foundry já fica copiado.
4. Mande os links aos jogadores. **Os links mudam cada vez que você abre o script**: link de outra sessão não funciona.
5. Deixe a janela aberta durante a sessão; Enter fecha o acesso. A cada minuto o script confere os túneis. Se um cair, ele abre outro e mostra o **link novo** em verde, para você mandar de novo.

Se alguém não conseguir entrar:

- **Teste você mesmo** no celular, com o Wi-Fi desligado (4G). Se abrir para você, o túnel está funcionando e o problema é do lado do jogador.
- **"Não é possível acessar este site" / "DNS_PROBE…":** o jogador abriu cedo demais ou usou um link antigo. Peça para esperar um minuto e abrir de novo, ou trocar de rede (4G).
- **Página de bloqueio ou de aviso do antivírus ou do navegador:** alguns antivírus, roteadores e DNS "seguros" bloqueiam todos os links `trycloudflare.com`. O jogador pode liberar o site no antivírus ou trocar o DNS do aparelho (por exemplo, para 1.1.1.1).
- **Abre o Foundry, mas não entra no jogo:** confira se o usuário dele existe no mundo e se a senha está certa.

Antes de usar:

- **Senha de administrador no Foundry.** Sem ela, qualquer um com o link entra na tela de configuração. O script avisa e pede confirmação se estiver faltando.
- **Senha em cada usuário do mundo**, principalmente no Gamemaster.

Pelo túnel, todo visitante recebe só a visão dos jogadores da wiki, mesmo parecendo vir deste computador. Os arquivos do mestre também nunca ficam no cache do Cloudflare. Para abrir a wiki do mestre por fora, ligue o servidor com `GM_KEY` e use `link-da-wiki/?mestre=senha`.

## Visão dos jogadores

Na wiki do mestre, **Campanha → Visão dos jogadores** é o painel do que os jogadores da campanha escolhida no menu podem ver:

- **O que o grupo sabe:** o resumo que aparece na página inicial deles.
- **Sessões:** o resumo de cada sessão, um por sessão, na ordem em que aconteceram. Os jogadores leem na página **Sessões**; a última também aparece no Resumo deles, com um botão que leva até ela.
- **Pessoas, Lugares no mapa, Notícias e handouts:** marque *Revelado* / *No mapa* / *Publicada* no que o grupo já descobriu. O resto fica guardado, mas não é enviado.
- **Notícias de Night City** (no fim do painel): o mural de **todas as campanhas** (boletins do N54, a eleição, apagões). Uma notícia publicada ali aparece para os jogadores de qualquer campanha; não conte nela o que é segredo de uma.
- **Nota do mestre** (campo tracejado em vermelho): lembretes seus, como o nome verdadeiro de um NPC. Nunca vai para os jogadores: o servidor tira as notas e o que não foi revelado antes de mandar.
- Clique em **Publicar**. A página dos jogadores se atualiza sozinha em até 15 segundos e avisa "O mestre publicou novidades". Trocar de campanha com alterações não publicadas pergunta antes.

Os jogadores entram com o código deles pelo botão **Entrar**, no canto de cima (ou na página inicial). Sem código, a pessoa vê só a aba **Regras**. Veja **Conta e navegação**.

Os jogadores também veem a aba **Regras** inteira (Escudo do mestre, combate, netrunning, armas, cyberware...), sem as notas de campanha. Nas páginas de regras da wiki do mestre, essas notas aparecem com **contorno tracejado vermelho**: é o que só você vê. Elas ficam no `index.html` (em `gmNotes`), e não nos arquivos `system-*.js`, que os jogadores baixam.

**Não escreva segredos** em `jogadores.html`, `wiki-app.js`, `wiki.css` ou `system-*.js`: esses arquivos vão para os aparelhos dos jogadores.

## Campanhas

Mais de uma campanha ao mesmo tempo, com o mesmo sistema, as mesmas regras e o mesmo universo. Na wiki do mestre, a página **Campanhas** (no menu de cada campanha) cria, renomeia e apaga; o seletor **Campanha ativa** no menu troca entre elas.

- **O que é de cada campanha:** os personagens, os jogadores, o Publicar, as regras da loja, os documentos e o mundo do Foundry. Trocar a campanha ativa troca tudo isso nas páginas (Personagens e códigos, Loja, Visão dos jogadores).
- **O que é de todas:** as regras do jogo, o catálogo, o mapa base, as fichas de NPC e as **Notícias de Night City**.
- **Quem vê o quê:** cada jogador só vê as campanhas em que joga. De outra campanha, não vê nem o nome: o servidor responde como se ela não existisse, também para quem tenta pelo endereço direto.
- **Nome para os jogadores:** o nome que eles veem no menu e no topo. O do mestre pode entregar um segredo; o Protocolo Morana aparece para os jogadores como "Night City, 2077", como antes.
- **Um jogador em duas campanhas:** o mesmo código. Em **Personagens e códigos** de uma campanha, **Adicionar jogador de outra campanha**; **Tirar desta campanha** tira o acesso (os personagens dele lá continuam salvos). O jogador troca de campanha no menu, como o mestre.
- **Crossover:** só o mestre leva um personagem para outra campanha, com **Mover** na lista de personagens. O dono passa a jogar na campanha nova também. No Foundry, veja o README do módulo: o mundo antigo manda a ficha do ator sozinho, e o mundo novo importa com tudo o que aconteceu na mesa antiga.
- **Regras da loja:** cada campanha tem as suas. A campanha nova começa com uma cópia das do Protocolo Morana.
- **Documentos:** os `.md` de `documentos/<id da campanha>/` (o id aparece na página Campanhas). O título é a primeira linha (`# Título`). Os de `documentos/night-city/` aparecem em todas. Publique com `publicar.bat`.
- **Mundo do Foundry:** o id da pasta do mundo (o nome em `Data/worlds/`). Com o Foundry aberto, a página Campanhas oferece **Usar o mundo aberto agora**. Com ele, a barra lateral diz de qual campanha é a mesa, e o módulo do mundo sabe a campanha dele. Uma licença abre um mundo por vez: sessões de campanhas diferentes precisam ser em horários diferentes.
- **Agenda das mesas** (no menu de cada campanha): as sessões marcadas de todas as campanhas numa lista só, com a cor de cada uma.
  - **Marcar sessão:** campanha, dia e hora (do aparelho), duração, título e uma nota para os jogadores. A data sugerida é uma semana depois da última sessão daquela campanha.
  - **Horário cruzado:** duas sessões que se sobrepõem ganham um aviso. De campanhas diferentes, uma precisa mudar (o Foundry abre um mundo por vez).
  - **Os jogadores** da campanha veem a **Próxima sessão** no Resumo (data, horário, quanto falta, título e nota) e as seguintes numa linha. **Adicionar ao calendário** baixa um `.ics` com lembrete uma hora antes. Marcar ou mudar uma sessão conta como novidade.
  - **O mestre** vê a próxima sessão no início ("Na mesa agora") e na visão geral de cada campanha.
  - As que já passaram ficam embaixo e saem sozinhas seis meses depois (`agenda.json`, na pasta de dados).
- **O que existia antes** é do Protocolo Morana: os códigos, os personagens, o Publicar (`jogadores.json` e `jogadores-mestre.json`, que ficam no git só como ponto de partida de um servidor novo) e as regras da loja. Os jogadores não percebem a mudança, e os códigos continuam os mesmos.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `documentos/morana/base-da-campanha.md` | **A base da campanha: a fonte única.** Um registro para cada pessoa, facção, lugar, peça de Morana, relógio e segredo. Pessoas e facções, Lugares e peças, o Estado da campanha, o Dossiê, as tabelas citadas nos documentos (`{{base:pecas}}`), os cartões dos nomes e o texto dos atores do elenco no Foundry saem daqui. |
| `documentos/morana/dossie-da-campanha.md` | O Dossiê: só citações (`{{doc:fundacao-da-campanha.md#premissa}}`, `{{base:faccoes}}`). Mude a ordem aqui; o texto, na fonte. |
| `documentos/morana/fundacao-da-campanha.md` | Premissa, backstory, as três partes de Morana, atos, reviravoltas, relógio de Sato e finais. **Fonte principal da lore.** |
| `documentos/morana/personagens-da-campanha.md` | NPCs: objetivos, segredos, falas e interpretação. |
| `documentos/morana/ganchos-dos-personagens.md` | Sessão zero: transforma as respostas dos jogadores em ganchos pessoais ligados a Morana. |
| `documentos/morana/sessao-01-a-maleta.md` | Roteiro da Sessão 1 e fichas de combate RED da equipe de Vega. |
| `documentos/morana/sessao-02-o-hospital-queimado.md` | Sessão 2, com aberturas para cada desfecho da Sessão 1. |
| `documentos/morana/sessao-03-a-coleira.md` | Sessão 3: o datafort da Militech em Arroyo, Meredith Stout, a oferta de Sato e o preço do antídoto. |
| `documentos/morana/handouts-da-campanha.md` | Os 30 handouts (H-01 a H-30), os textos para ler em voz alta e como criar um handout na hora. Na wiki, cada citação tem os botões **Entregar aos jogadores** e **Só preparar**. |
| `documentos/morana/sessao-zero.md` | Linhas e véus, a carta X, o que Morana pode fazer com cada personagem, as regras da casa e as perguntas. |
| `documentos/morana/roteiro-da-campanha.md` | A campanha numa tabela: ato, sessão, fase da cidade, relógio de Sato, estágio de Morana, revelações e recompensas. |
| `documentos/morana/arquiteturas-da-campanha.md` | As arquiteturas NET da campanha. As tabelas são a fonte dos itens do Foundry (o build do cpr-2077 lê este arquivo). |
| `documentos/morana/guia-night-city-2077.md` | World building de 2077: linha do tempo, distritos, facções, NPCs do jogo, ganchos e tabelas (com os ganchos de Morana). |
| `documentos/morana/diario-da-campanha.md` | O registro das sessões, as respostas da sessão zero e os ganchos escolhidos. A foto do estado de agora (peças, pessoas, segredos) vem do Estado da campanha. |
| `documentos/<campanha>/`, `documentos/night-city/` | Os documentos de cada campanha nova, e os de todas. Veja **Campanhas**. |
| `index.html` | A wiki do mestre. As páginas de resumo do Protocolo Morana e as notas de campanha nas regras (`gmNotes`) estão escritas aqui; os documentos completos são lidos dos `.md`. |
| `campanhas-painel.js` | A página Campanhas e as páginas das campanhas novas (visão geral, notas, documentos) na wiki do mestre. |
| `jogadores.html` | A visão dos jogadores: resumo, pessoas, mapa e notícias publicados pelo mestre na campanha do jogador, as Notícias de Night City e as regras. |
| `jogadores-painel.js` | O painel "Visão dos jogadores" da wiki do mestre (o Publicar de cada campanha e as Notícias de Night City). |
| `jogadores-mestre.json`, `jogadores.json` | O Publicar de antes das campanhas. Ficam no git como ponto de partida do Protocolo Morana num servidor novo; o Publicar de agora grava em `campanhas/<id>/publicar.json`, na pasta de dados. |
| `wiki-app.js`, `wiki.css` | O motor e o visual da wiki, usados pelas duas páginas. As últimas camadas do `wiki.css` são o visual de 2026. A parte 1 é o padrão da Loja: fundo quase preto, amarelo, ciano e vermelho, Oxanium no texto e Share Tech Mono nos rótulos (as duas do Google Fonts, licença OFL, em `cyberpunk-css-main/cyberpunk-css-main/fonts/`). A parte 2 segue os exemplos do Resumo, de Personagens, da Ficha e do Escudo: a barra de cima de ponta a ponta, a barra lateral em caixa normal (com as abas Campanhas e Sistema), os títulos em caixa normal e os botões vazados para o que só navega. |
| `campaign-map.js` | Pinos do mapa de operações. Os lugares da base apontam para eles (`#campaignMap/<ponto>` abre o mapa já no ponto). |
| `campanha-base.js` | Lê a base da campanha e monta as visões dela; liga os nomes nos documentos, com o cartão; grava o Estado da campanha na mesa do servidor. Só a wiki do mestre carrega; os testes e o build do Foundry também usam. |
| `nightcity-map-base.webp`, `nightcity-map-reference.webp` | Os mapas (WebP, 2,7 MB cada; eram JPEG de 5,3 MB). O dos jogadores fica guardado no aparelho depois da primeira vez. |
| `system-rules.js` | As regras da mesa para consulta: uma regra só, com o Mission Kit valendo sobre o RED quando os dois conflitam. Escudo do mestre, perícias, testes, combate, dano e cura, Humanidade (a tabela da ciberpsicose e as de perda e ganho do Kit), terapia e drogas, netrunning (o do RED com os quickhacks no Neuroport do Kit), economia (com o Night Market), criação, Lifepath e Avanço. Cada seção indica a página do PDF traduzido ou do Kit. |
| `system-net.js` | O Arsenal da NET (programas, Black ICE, demônios, upgrades, defesas e os 21 cyberdecks com marca, que são cyberdecks do RED da qualidade de cada um) e os quickhacks: os 11 do Mission Kit e os 5 do suplemento de fã que a mesa aprovou, todos de graça pelo Rank de Interface. Um cartão por item. |
| `system-2077.js` | Os anos 2070: as regras de Power, Smart e Tech e os Rebuilds do Cyberpunk Edgerunners Mission Kit; as 41 armas (13 do Kit e 28 do suplemento de fã aprovados); os 37 implantes (o Neuroport e o cromo do Kit, os do suplemento aprovados e os 8 Berserk e Sandevistan dos anos 2070, mais caros e mais fracos que no suplemento e à venda em todo Night Market de cyberware); e a página **Suplemento de fã: o que saiu**, com o motivo de cada item recusado na revisão de 2026-10-13. As listas cruas (`data`) vão para o módulo do Foundry e a loja. |
| `system-catalog.js` | Catálogo do RED: Roles, cyberware, armas, armaduras, munição, acessórios, equipamento médico e a lista de equipamento. |
| `system-glossario.js` | O glossário: definição curta de cada termo de regra e onde está a regra. Vai também para os jogadores. |
| `mestre-npcs.js` | Fichas de NPC (as 10 fichas prontas do livro, a Trauma Team, variantes para as facções de 2077 e o elenco do Protocolo Morana) e os Encontros de 2077. Só a wiki do mestre carrega; os jogadores não recebem este arquivo. |
| `server.js` | Servidor da wiki, no PC ou no servidor online (`MODO=hospedado`). Decide quem vê a wiki do mestre e quem vê só a dos jogadores, mostra o estado da mesa e avisa se o OneDrive reverteu algum arquivo. |
| `mestre.html` | A tela "Entrar como mestre" (`/mestre`). |
| `revertidos.js` | Confere se o OneDrive voltou algum arquivo para uma versão antiga. Usado pelo servidor e pelo `publicar.bat`. |
| `publicar.bat`, `publicar.ps1` | Publicam a wiki no servidor online, pelo GitHub. |
| `manifest.webmanifest`, `sw.js`, `icones/` | A wiki instalada no celular: o manifesto, o service worker (guarda as regras para abrir sem internet) e os ícones (o `icone.svg` é a fonte dos PNG). |
| `servidor/` | Instalação e manutenção do servidor online (wiki, Foundry, HTTPS, atualização e backup). Veja o README da pasta. |
| `api-personagens.js` | A parte do servidor que guarda os personagens e os códigos dos jogadores e decide quem vê o quê em cada campanha. |
| `api-contas.js` | As sessões de login (o cookie leva só um identificador; sair de todos, desconectar, último acesso) e as preferências de cada conta (`sessoes-jogadores.json`, `preferencias/`, na pasta de dados). |
| `api-campanhas.js` | A lista de campanhas, o Publicar, as regras da loja e a mesa do mestre de cada uma, as Notícias de Night City e a Agenda das mesas (`campanhas.json`, `campanhas/`, `noticias-night-city.json`, `agenda.json`, na pasta de dados, fora do git). |
| `criador.js` | Personagens, ficha, criador e loja inicial (nas duas wikis). |
| `conta.js` | O botão da conta no canto de cima (as duas wikis): entrar, o personagem em uso, novo personagem, trocar de campanha e sair; para o mestre, atalhos, versão, backup e sair. |
| `popup.js` | Os pop-ups da wiki (confirmar, escrever um motivo, copiar um código) e os avisos rápidos no canto, no lugar das caixas do navegador. |
| `system-criacao.js` | Regras de criação: as 10 Roles do RED com os ajustes do Mission Kit, tabelas de STAT, perícias, pacotes e Lifepath de cada Role e o Neuroport de graça. |
| `personagem-roles.js` | As duas Roles pela regra da mesa: Ranks, habilidades, compatibilidade com personagens antigos e retorno da ficha do Foundry. Compartilhado pela wiki e pela API. |
| `personagem-cyberware.js` | Locais de instalação de cyberbraços, cyberpernas e cyberolhos, com os lados separados e validação compartilhada entre a wiki e a API. |
| `loja-catalogo.js` | Catálogo da loja, gerado pelo build do módulo. Não edite à mão. |
| `personagens/` | Um arquivo por personagem dos jogadores. Fica fora do git: no servidor, os de verdade estão em `/srv/fieldbook/dados/personagens`; no PC, só servem para teste. |
| `tests/` | Testes automáticos da wiki (`node tests/rodar.js`). Os do sistema do Foundry 14: `tests/sistema/` (`node --test`), `tests/cenarios/v14.js`. |
| `eslint.config.mjs` | Lint só do sistema do Foundry 14 e dos testes dele (`npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/lib/trava.js tests/cenarios/v14.js`). |
| `foundry-2077/` | Módulo do Foundry VTT "Cyberpunk RED: 2077", gerado a partir dos dados da wiki. Veja o README da pasta. |
| `foundry-net-architect/` | Módulo do Foundry VTT "NET Architect": pontos de acesso à NET nos Tiles, com a janela do netrunner e o mapa da arquitetura. Veja o README da pasta. |
| `foundry-fluxo-de-combate/` | Módulo do Foundry VTT "Fluxo de Combate": ataque, esquiva às cegas e dano na ficha, com área, cartucho, fogo supressivo, lesão crítica e Death Save. Substitui o Evasion Workflow. Veja o README da pasta. |
| `foundry-painel-tatico/` | Módulo do Foundry VTT "Painel Tático": o HUD de combate com o retrato grande do personagem (um PNG por estado de ferimento) e o estilo de cada jogador, ligado ao cpr-2077, ao Fluxo de Combate e ao NET Architect. Veja o README da pasta. |
| `foundry-sistema/` | Protótipo do sistema próprio "Cyberpunk RED — Fieldbook" para o Foundry VTT 14: ficha, crítico do d10, o combate do Fluxo de Combate (tiro, mirado, autofogo, supressivo, cartucho e explosivo, com a esquiva às cegas e o dano na ficha), Lesão Crítica, Death Save, as habilidades do Solo, cyberware e importação da wiki. A mesa continua no Foundry 12 por enquanto. Veja o README da pasta. |

Os arquivos de mapa em resolução máxima (`Map_*_Full.png`) e o `.zip` do cyberpunk-css foram movidos para `C:\Users\kouar\CyberpunkRPG-arquivos-grandes`, fora do OneDrive.

## Módulo do Foundry

A pasta `foundry-2077/` gera o módulo **Cyberpunk RED: 2077** para o Foundry VTT a partir dos mesmos dados desta wiki (`system-2077.js`, `system-net.js`, `mestre-npcs.js`).

**Para instalar ou atualizar:** feche o Foundry e dê dois cliques em `atualizar-modulo.bat`. Faça isso depois de mudar armas, cyberware, netrunning ou fichas de NPC na wiki, e sempre que o importador de personagens mudar. Ele roda, dentro de `foundry-2077`:

```
node build/build.mjs
```

O módulo é gravado direto na pasta de módulos do Foundry. O build também gera o `loja-catalogo.js`, o catálogo da loja da wiki, com os itens do sistema e os de 2077. Para gerar só o catálogo, sem fechar o Foundry: `node build/loja.mjs`.

O mesmo `atualizar-modulo.bat` instala o **NET Architect** (`foundry-net-architect/`): qualquer Tile vira um ponto de acesso à NET. O netrunner conecta pelo token, vê o mapa ramificado da arquitetura e usa as habilidades de Interface; o mestre resolve as rolagens e o Black ICE. As arquiteturas ficam no compêndio do mundo "Arquiteturas da NET". Veja o README da pasta.

Ele também instala o **Fluxo de Combate** (`foundry-fluxo-de-combate/`), no lugar do Evasion Workflow (a pasta dele é apagada):

- **O alvo de um ataque decide sem ver o total:** esquivar, aguentar ou usar o escudo. Ele rola a própria Evasão.
- **Quem atacou rola o dano.** O mestre aplica na ficha, com a armadura e as lesões críticas.
- **Explosivos, espingarda com cartucho e fogo supressivo** valem como na wiki. Quem está mortalmente ferido rola o Death Save no começo do turno.

Veja o README da pasta.

E instala o **Painel Tático** (`foundry-painel-tatico/`), um HUD de combate na base da tela:

- **O retrato do personagem** é um PNG grande, em pé sobre a barra. Cada estado de ferimento pode ter o seu (do Sem ferimentos ao Morto), e o dono troca pela própria barra. Sem imagem para um estado, entra um efeito automático.
- **Cada jogador escolhe o visual** no próprio navegador: tema, cores, fonte, tamanho, posição e a ordem das seções. Um código `PT1:…` passa o visual de um jogador para outro.
- **Rola pela ficha do sistema:** os modos de 2077 do cpr-2077 e o Fluxo de Combate funcionam pelo ATK do painel. O token conectado na NET ganha o selo do NET Architect.
- **Com o Combat HUD também ligado,** o painel o esconde.

Veja o README da pasta.

## Personagens dos jogadores

Os jogadores criam os personagens pela wiki, sem abrir o Foundry. Os personagens ficam salvos no servidor da wiki.

1. **Códigos:** na wiki do mestre, em **Campanha → Personagens e códigos**, crie um código para cada jogador (por exemplo, `NC-7F3K-9QAB`) e passe a ele. O código já entra na campanha escolhida no menu.
2. **Criar:** o jogador abre a wiki dos jogadores, clica em **Entrar** (canto de cima), digita o código uma vez (o aparelho lembra) e, no mesmo menu, clica em **Novo personagem**.
   - **Os passos:** identidade e Role, STATs, perícias, Lifepath, equipamento, moradia e revisão.
   - **Métodos:** os três do livro (Rato de Rua, Edgerunner e Pacote Completo), com as 10 Roles do RED (os ajustes dos anos 2070 do Mission Kit) e o Neuroport de graça. Personagens antigos com as Roles do suplemento de fã viram Rockerboy (o Face) e Exec (o Corpo).
   - **Duas Roles na criação (regra da mesa):** no passo 1, escolha a principal e, se quiser, uma segunda Role diferente. Defina o Rank de cada uma (1 a 10) com o mestre. Personagens antigos continuam com uma Role no Rank 4. Cada Role tem sua própria distribuição de habilidades e Lifepath; a principal continua definindo STATs, perícias e o único pacote/orçamento inicial. Esta escolha não cobra IP.
     - A ficha, a lista de personagens e o menu da conta mostram as duas Roles e seus Ranks.
     - Para importar as duas, use o módulo atualizado do **Foundry 12**. O sistema **v14 ainda aceita uma Role**; a wiki avisa e recusa a leitura de importadores antigos que não declaram suporte, antes de criarem um ator incompleto.
   - **Salvamento:** tudo é salvo sozinho. Os avisos mostram o que falta, mas não impedem de continuar.
   - **Ajuda:** cada passo tem um "Como funciona" com a página do livro, e um resumo fixo mostra pontos, HP, Humanidade, dinheiro e pendências. As perícias têm a descrição do livro, e os termos de regra levam ao glossário.
   - **Lifepath da Role:** no passo 4, as perguntas próprias da Role (livro p. 54–70), para rolar ou escolher. As respostas vão para o campo Role Lifepath da ficha do Foundry, junto com as notas.
   - **Retrato:** no passo 1, o jogador envia uma imagem (PNG, JPEG ou WebP), arrasta para escolher o enquadramento e ajusta o zoom antes de **Salvar recorte**. O resultado é quadrado, com 512×512 px, e a imagem inteira fica guardada, reduzida para até 1536 px, para usar **Ajustar recorte** depois. O editor funciona com mouse, toque e setas do teclado; cancelar conserva a foto anterior. Só o dono e o mestre acessam a imagem inteira. Também é possível colar um link `https`; para recortá-lo, o site da imagem precisa permitir o acesso (caso contrário, envie o arquivo). Se houver imagem enviada, ela vale no lugar do link. O mesmo enquadramento aparece na ficha e nas miniaturas de Personagens e vai para a ficha e o token no Foundry.
   - **Perícias sugeridas:** no Edgerunner e no Pacote Completo, **Distribuir sugerido** põe os níveis do Rato de Rua da Role (86 pontos certinhos). No Pacote Completo, as 20 perícias da Role aparecem primeiro.
   - **O que a Role ganha além do Rank** (passo 1). Tudo vai para o item de Role e para a ficha no Foundry.
     - **Solo:** um ponto de Consciência de Combate por Rank (RED p. 146).
     - **Tech:** dois pontos por Rank nas especialidades de Artífice, até o Rank em cada uma (p. 147–148).
     - **Medtech:** um ponto de Medicina por Rank (p. 149). As perícias Cirurgia (2 por ponto, até 10) e Tecnologia Médica são calculadas.
     - **Nomad:** uma escolha da Oficina da Família por Rank (p. 161–165), entre veículos e upgrades. O catálogo do criador oferece os veículos básicos e upgrades de Rank 1; combine opções avançadas com o mestre. No Foundry, os veículos escolhidos chegam com os upgrades instalados.
     - **Exec:** recebe o terno de negócios sem duplicar peças do pacote principal. A moradia corporativa fica disponível a partir do Rank 2, também quando Exec é a segunda Role.
   - **Montagem** (passo 5, no fim): o equipamento como ele chega no Foundry, em abas (Armas, Armadura e roupa, Cyberware, Netrunning e Outros).
     - Já vem montado: arma carregada com a munição compatível, a armadura de maior SP vestida em cada local, as opções de cyberware nas bases e os programas no cyberdeck.
     - O jogador muda o que quiser: descarregar ou trocar a munição, encaixar um acessório (só nas armas em que ele serve), escolher em qual cyberbraço vai cada opção, tirar um programa do deck, deixar um item guardado.
     - A wiki confere os slots de cada arma, deck e base.
     - A ficha mostra a munição de cada arma, o que está dentro de cada item, o SP na cabeça e no corpo e a penalidade de armadura pesada.
     - Armas, armaduras, cyberdecks e bases de cyberware compradas na loja entram uma por linha, para cada uma ter a sua montagem.
   - **Moradia e estilo de vida** (passo 6): a moradia (da rua à cobertura de luxo), o estilo de vida, o Trauma Team (Prata ou Executivo) e o estilo de moda de 2077.
     - O padrão da Role tem o primeiro mês de graça.
     - Escolher melhor paga a diferença do primeiro mês com o dinheiro inicial; o Trauma Team paga o mês inteiro.
     - Escolher pior não devolve.
     - O custo por mês aparece no resumo, e tudo vai para o Estilo de vida da ficha do Foundry.
3. **Loja inicial:** o Pacote Completo compra tudo na loja (2.550eb, mais 800eb só para moda). Rato de Rua e Edgerunner recebem o pacote da Role e mais 500eb. Devolver um item reembolsa.
   - **Só itens de criação:** até 1.000eb, sem armas exóticas, qualidade excelente, borgware, munição rara (inteligente, biotoxina, EMP, sonífera), Linear Frame, Cryotank e Cryopump.
   - **O mestre ajusta** na página **Loja**, no botão **Regras da loja** (a engrenagem): muda o teto e as categorias escondidas. Item por item, libera ou esconde direto na lista.
   - **Netrunner:** o pacote é o do RED (cyberdeck e programas). Os quickhacks do Mission Kit ele faz pelo Rank de Interface; o kit de 2077 do suplemento de fã saiu com as regras dele.
   - **Kit sugerido:** no Pacote Completo, um botão compra de uma vez o pacote de Rato de Rua da Role.
4. **Enviar para o mestre:** quando o personagem estiver pronto, o jogador clica em **Enviar para o mestre**. O botão fica na revisão do criador e na ficha. O quadro **Levar para o Foundry** mostra em que pé está: não enviado, esperando o mestre, no Foundry, ou mudou depois de importar (aí aparece **Avisar o mestre de novo**). Na lista de Personagens, o mestre vê quem está esperando.
5. **Importar no Foundry:** no Foundry aberto **neste computador**, o mestre recebe um aviso, até um minuto depois do envio, e a janela **Personagens da wiki** com **Importar**. Também dá para importar a qualquer hora: aba Atores, botão **Importar da wiki**. Escolha o personagem e o dono (vem marcado o jogador com o mesmo nome), e o módulo cria o ator com STATs, perícias, Role, equipamento, cyberware instalado, Humanidade, Lifepath, dinheiro e retrato.
   - **Retrato:** o módulo copia a imagem para a pasta do mundo (`worlds/<mundo>/retratos-wiki`), para os jogadores também verem, e a põe na ficha e no token. Um link de outro site que não deixa baixar entra como link, se terminar em `.png`, `.jpg` ou `.webp`; senão, o aviso do chat pede para pôr a imagem à mão.
   - **Não aparece o botão nem o aviso?** O módulo instalado está velho: feche o Foundry e rode `atualizar-modulo.bat`.
   - O aviso pode ser desligado em Configurações do módulo → Avisos da wiki.
   - Depois disso, a loja inicial daquele personagem fecha, e a Loja vira a **loja da campanha** (veja abaixo).
   - **No Foundry 12 e no 14:** cada Foundry tem o seu vínculo com o personagem. Importar no 14 não tira o do 12: a ficha da mesa e as entregas dos pedidos valem dos dois atores ligados (de um terceiro, não). Na janela **Personagens da wiki** do Foundry 14, cada personagem diz onde está (neste mundo, no Foundry 12, ou o ator do 14 apagado) e, sem o ator no mundo, oferece **Importar** (ou **Importar de novo**). Na wiki, o quadro **Levar para o Foundry** mostra ao mestre o ator de cada Foundry e avisa quando o do 14 foi apagado.
6. **Depois de importado, o Foundry manda.**
   - **Na wiki:** o criador avisa e trava STATs, perícias, Role, equipamento e moradia; o servidor faz o mesmo.
   - **O que o jogador ainda muda:** o nome, o retrato, a aparência, as notas e o Lifepath.
   - **Lifepath ou retrato mudou?** O jogador avisa de novo, e a janela de avisos traz **Atualizar**. O mesmo botão fica no topo da ficha do ator: **Atualizar da wiki**. Ele mostra o que mudou e aplica o que você marcar, sem apagar nada da ficha.
   - **Montagem:** o **Atualizar da wiki** também mostra o que da montagem da wiki falta na ficha (arma sem munição carregada, acessório, programa ou opção fora do lugar) e aplica. Serve para os atores importados antes da montagem existir, que chegaram com as armas descarregadas.
   - **Retrato:** tirar o retrato na wiki não apaga a imagem do Foundry.
7. **Na mesa: a ficha do Foundry volta para a wiki.**
   - **Como chega:** a cada mudança num ator que veio da wiki, o Foundry do mestre manda a ficha para a wiki, uns 4 segundos depois da última mudança. Isso vale para HP, Humanidade, Sorte, dinheiro, Pontos de Melhoria, reputação, lesões críticas, itens, munição no pente e o que está instalado.
   - **O que aparece:** a ficha da wiki passa a mostrar a mesa ("Na mesa", com a hora) e se atualiza sozinha a cada 30 segundos. Na lista de Personagens aparece o HP da mesa.
   - **Ao entrar no mundo,** o Foundry manda a ficha de todos os atores da wiki uma vez, inclusive os importados antes.
   - **Para desligar:** Configurações do módulo → Mandar a ficha para a wiki.
8. **Loja da campanha (compras durante o jogo).** Depois da importação, a página Loja do personagem vira uma loja de pedidos.
   - **O jogador** escolhe qualquer item do catálogo e monta o pedido.
     - Escolhe a munição de cada arma (a da ficha ou a do próprio pedido) e onde encaixar acessórios e programas.
     - Deixa um recado e envia. A barra da loja mostra o dinheiro da mesa e dois botões: **Seu pedido** (o que está montando, com o total) e **Pedidos** (os enviados, com o status).
   - **Você aprova ou recusa:**
     - na Loja do personagem na wiki (a lista de Personagens mostra o quadro **Pedidos da campanha**);
     - ou na janela **Personagens da wiki** do Foundry.
   - **O Foundry entrega** o aprovado, até um minuto depois, com o mundo aberto: cria os itens na ficha, carrega as armas, encaixa acessórios e programas e desconta o dinheiro no livro-caixa.
   - **O servidor confere tudo:** cada item no catálogo e o total, que sai sempre do catálogo; nada sai em dobro.
   - **Cyberware** chega sem instalar: instale pela ficha do Foundry, que cobra a instalação e rola a perda de Humanidade.
   - **Sem dinheiro na mesa:** o pedido fica aprovado com o motivo. Depois de ajustar, clique em **Tentar de novo**.
9. **A ficha da wiki** tem o desenho da ficha do Foundry e o botão **Imprimir ou salvar em PDF** (só a ficha, em fundo branco).
   - **Vitais:** HP e Humanidade com barra, SP na cabeça e no corpo, dinheiro.
   - **Combate:** a base de ataque já somada (STAT + perícia), dano, CDT, pente e munição.
   - **Cyberware:** a aba no jeito da tela de cyberware do Cyberpunk 2077, com os grupos do RED. Mostra o corpo em holograma (desenho da wiki) e um quadrado por slot: a sigla do implante instalado, o + no slot livre. O + abre a loja do personagem só com o que serve ali. Detalhes abaixo, em Personagens e Ficha.
   - **O resto:** perícias pelos grupos do Foundry, o cyberdeck e o equipamento.

Notas:

- **Onde importar:**
  - **Com o servidor online:** de qualquer computador, no navegador em que você entrou como mestre na wiki. Com a mesa em `mesa.SEUDOMINIO`, o módulo acha a wiki em `wiki.SEUDOMINIO` sozinho.
  - **Sem o servidor:** importe do computador onde a wiki roda, e o Foundry fala com a wiki em `http://localhost:8000`.
  - O endereço pode ser trocado em Configurações do módulo → Endereço da wiki (vale para o mundo todo).
  - Se abrir o Foundry por outro endereço, ligue a wiki com `$env:FOUNDRY_ORIGIN='http://esse-endereco'`.
- **Pelo túnel**, o link muda a cada sessão, e o jogador digita o código de novo.
- **Onde ficam os dados:**
  - Os códigos ficam em `contas-jogadores.json`, fora do git.
  - Os personagens ficam em `personagens/`, e os retratos enviados, em `personagens/retratos/`.
  - No servidor online, tudo isso fica em `/srv/fieldbook/dados`.
  - Apagar um personagem move o arquivo para `personagens/apagados/`.
  - Cada gravação relê o arquivo e grava na vez dela (uma fila por arquivo): a ficha do Foundry chegando enquanto o jogador salva não apaga uma à outra.
- **Personagens e Ficha:**
  - a lista mostra um cartão por personagem: o retrato (ou as iniciais), a Role e o Rank, o HP, o IP e os eurodólares (os da mesa, quando o Foundry já mandou a ficha, ou os da criação) e os botões; o último cartão, tracejado, cria um novo;
  - a **Ficha** tem duas colunas: o retrato, os STATs e os vitais do lado; e as abas **Resumo**, **Perícias** (da maior base para a menor), **Equipamento**, **Cyberware**, **Compras** (os pedidos da loja, com a situação) e **Anotações**;
  - a aba **Cyberware** é a tela de cyberware do Cyberpunk 2077 com os grupos do RED:
    - **Os grupos:** Neuralware, Cyberolhos, Cyberaudio, Borgware e Cyberbraços à esquerda; Cyberware interno, Cyberware externo, Fashionware e Cyberpernas à direita.
    - **Os slots:** cada base mostra os slots dela (o Neural Link e o Neuroport têm 5, o cyberolho 3, a Cyberaudio Suite 3, o cyberbraço 4, a cyberperna 3). O corpo tem 7 para o cyberware interno, 7 para o externo e 7 para o fashionware.
    - **O corpo:** a parte com cromo acende em ciano no holograma, e uma linha liga cada grupo a ela.
    - **Local de instalação:** cyberbraços, cyberpernas e cyberolhos distinguem os lados esquerdo e direito. Escolha o local ao comprar ou na **Montagem**, aba **Cyberware**. Cada opção fica ligada ao identificador da base escolhida e herda seu local. Implantes antigos aparecem como **Local não definido**, até a escolha ser feita; a wiki não adivinha o lado. Na tela, a base sem lado ocupa a vaga de um membro natural (o corpo não fica com três braços) e acende tracejada, em amarelo.
    - **Membro natural:** o braço ou a perna sem cyberbraço ou cyberperna aceita uma peça única, como no RED ("peça única num braço orgânico"). No braço: Big Knucks, Mão de ferramentas, Rippers, Scratchers, Slice 'N Dice, Wolvers, Modular Finger Cyberhand e Ballistic Coprocessor. Na perna: Pé de garra e Lynx Paws.
      - **Como escolher:** compre a peça com o lado do membro natural (o + desse membro na tela abre a loja só com elas), ou mude o lado na **Montagem**.
      - **Uma por membro:** a segunda peça no mesmo lado vira pendência, e a loja de criação recusa.
      - **No Foundry 12:** o importador faz a base **Meat Arm** ou **Meat Leg** do CORE (de graça, sem Humanidade), com o lado no nome, e instala a peça nela.
      - **No Foundry 14:** o importador ainda não faz.
    - **Tocar:** num slot ou num nome, abre a ficha do implante (Humanidade, instalação, slots, preço, descrição). Num +, abre a loja do personagem só com o que serve ali, levando o local e a base específicos: as opções daquele tipo, ou as bases quando o membro é natural. O chip **Para o slot** tira o filtro.
    - **Compra durante a campanha:** o pedido registra o local desejado e a base. O cyberware entregue continua aguardando instalação na ficha do Foundry pelo mestre, que aplica a perda de Humanidade. O retorno da mesa distingue o local instalado do planejamento.
    - **De onde vem:** antes do Foundry, a tela sai da montagem do criador, e embaixo aparece o que ficou sem base. Na mesa, sai da ficha que o Foundry manda (o tipo e os slots de cada peça), e embaixo aparece o que espera o mestre instalar.
    - **Celular:** o corpo vai para cima, menor, e os grupos ficam um embaixo do outro, sem as linhas.
    - **A revisão do criador** (passo 7) mostra a mesma tela;
  - o título da página é o nome do personagem, e a aba escolhida fica lembrada no aparelho. **Imprimir** sai com tudo.
- **Anotações:** a ficha tem a aba **Anotações** (pistas, contatos, dívidas, o que o NPC prometeu), que salva sozinho. Só o dono e o mestre leem; na página Personagens, o mestre vê o quadro **Anotações dos jogadores**, com as de todos, as mais novas primeiro.
- **Histórico de versões (mestre):** antes de cada rodada de edição, a wiki guarda como o personagem estava (no máximo uma a cada 10 minutos; ficam as últimas 30, em `personagens/historico/`). Na **Ficha**, aba **Anotações**, o quadro **Histórico de versões** lista cada uma com o que ela tem de diferente da de agora, e **Restaurar** volta o que o jogador preenche (STATs, perícias, itens, Lifepath...). Foundry, ficha da mesa, pedidos, Pontos de Melhoria, retrato e anotações ficam como estão, e a versão de agora também vai para o histórico (dá para desfazer).
- **Códigos:** a tabela mostra o **último acesso** e quantos aparelhos cada jogador tem. **Desconectar** tira o jogador de todos os aparelhos (ele volta com o mesmo código); **Novo código** troca o código (o antigo para de valer, e os personagens ficam).
- **Sessões de login:** entrar com o código cria uma sessão; o cookie guarda só um identificador aleatório dela, não o código. No servidor online o cookie só vai por https. Uma sessão sem uso por seis meses acaba (o aparelho esquecido não fica entrando).
- **Quem vê o quê:** cada jogador vê e edita só os dele; dos outros jogadores da mesma campanha, só nome, apelido, Role e retrato. De outra campanha, nada. Sem código, nenhum personagem. O mestre vê e edita todos.

## Conta e navegação

- **O botão da conta** fica no canto de cima, à direita, nas duas wikis.
  - **Sem código:** **Entrar**, com o código que o mestre passou (o aparelho lembra).
  - **Jogador:** mostra o retrato (ou as iniciais) do **personagem em uso**. O menu troca de personagem, cria um novo, abre Ficha, Editar e Loja, troca de campanha (quem joga em mais de uma) e tem **Sair**.
  - **Pedidos da loja:** quando o mestre aprova ou recusa um pedido (ou o Foundry entrega), o botão ganha um número e aparece um aviso rápido; o menu diz qual personagem. Abrir a Loja daquele personagem tira o número. Com a wiki aberta, confere a cada minuto.
  - **O personagem em uso** é um por campanha, lembrado no aparelho. A **Ficha** e a **Loja** do menu lateral abrem nele, o **Resumo** mostra o cartão "Seu personagem" e a lista de Personagens marca "Em uso" (o botão **Usar** troca).
  - **Mestre:** a campanha ativa, os atalhos (Personagens e códigos, Visão dos jogadores, Campanhas, Agenda das mesas), abrir a visão dos jogadores, a versão no ar, o backup e **Sair do modo mestre**.
  - **Sair de todos os aparelhos** (no menu do jogador): a conta sai do celular, do computador, de tudo. Para voltar, o código de novo. Bom para celular perdido ou computador emprestado.
- **O que acompanha a conta:** as páginas fixadas, os grupos recolhidos, a barra compacta, as páginas recentes, o personagem em uso e o que já foi visto (selos de novidade e de pedidos) ficam no servidor, na conta do jogador (ou na do mestre). Entrar no celular mostra tudo como estava no computador. Sem código, fica só no aparelho, como antes.
- **Páginas com abas (wiki do mestre):** cada assunto da campanha é uma entrada só na barra lateral, com abas no topo da página. **A campanha:** Dossiê, Fundação, Roteiro, Diário e Base. **Elenco:** Pessoas e facções, Personagens e Fichas. **Night City:** Mapa, Lugares e peças, Guia de 2077 e Arquiteturas NET. **Sessão zero:** a conversa e os ganchos. **Cada sessão:** Resumo ou Roteiro, Handouts (os da sessão, com os botões de entregar), NPCs (as fichas que você escolhe num seletor com todas as fichas da wiki) e Notas (o que aconteceu, com o modelo do diário). As fichas e as notas ficam na mesa do servidor, por campanha. Os endereços de antes (`#docSessao01/cena-3-o-mensageiro`) continuam valendo, e a busca acha o texto de todas as abas.
- **Barra de cima:** de ponta a ponta, com a marca, a busca (tecla **/**), a campanha e o botão da conta.
- **Barra lateral:**
  - **Duas áreas:** as abas **Campanhas** e **Sistema** (na wiki dos jogadores, **Campanha** e **Regras**). Campanhas tem os grupos da campanha (o primeiro com o nome dela); Sistema, os das regras (Na mesa, Regras, Netrunning, Catálogos, Black Chrome e Fontes). Abrir uma página da outra área troca a aba.
  - **Fixadas:** o botão **☆ Fixar**, ao lado do título de qualquer página (Combate, Escudo do mestre, a Ficha…), põe a página no grupo **Fixadas**, no topo da barra lateral, nas duas abas. Até 8, lembradas no aparelho; **★ Fixada** tira.
  - **Grupos que recolhem:** clique no nome do grupo. O grupo fechado vira uma linha com quantas páginas tem. Em Sistema, Netrunning, Catálogos, Black Chrome e Fontes começam fechados; o que cada um abre ou fecha a conta lembra. Abrir uma página de um grupo recolhido mostra o grupo.
  - **Barra compacta:** o botão ☰ (ou a tecla **[**) deixa só os ícones; parar o mouse num ícone mostra o nome. O aparelho lembra.
  - **No celular,** a barra lateral é uma gaveta: o ☰ abre, escolher uma página fecha. O conteúdo começa logo abaixo da barra de cima.
  - **Mesa:** o quadro no pé da barra, sempre à vista, diz se a mesa está aberta (e de qual campanha) e quantos estão conectados, com **Entrar na mesa**; para o mestre, também a saúde do servidor.
- **Novidades (visão dos jogadores):** sessões, pessoas, lugares e notícias que o mestre publicou desde a última visita ganham um selo no menu e a etiqueta **novo** na página. No mapa, os lugares novos aparecem em outra cor, com "(novo)" e a legenda explicando. Abrir a página tira o selo.
- **Voltar ao topo:** nas páginas longas, um botão no canto de baixo.

## Consulta durante a sessão

- **A base da campanha (mestre):** cada pessoa, facção, lugar, peça de Morana, relógio e segredo tem um registro só, em `documentos/morana/base-da-campanha.md`.
  - **Sai dela:** Pessoas e facções (com a tabela Quem é quem), Lugares e peças, o Dossiê (que junta trechos da fundação e do roteiro), o Resumo da Sessão 01 (tirado do próprio documento) e o texto dos atores do elenco no Foundry.
  - **Nos documentos:** os nomes viram link, e passar o mouse mostra o cartão com o lado, onde está e a situação de agora. Uma linha `{{base:pecas}}`, `{{base:faccoes}}`, `{{base:pessoas}}`, `{{base:segredos}}` ou `{{base:relogio:sato}}` vira a tabela de agora.
  - **Endereços antigos:** `#docQuemEQuem` abre a tabela em Pessoas e facções.
- **Estado da campanha (mestre):** o que muda na mesa, salvo no servidor, por campanha: entra no backup e aparece igual no PC e no tablet.
  - **O que guarda:** os relógios, com quem está cada peça de Morana, a situação, onde está e a atitude de cada pessoa com o grupo, os segredos revelados e o bloco de mesa.
  - **Onde aparece:** nas páginas da base, nas tabelas citadas nos documentos (o diário mostra a foto de agora) e nos cartões dos nomes.
  - **Mostrar aos jogadores**, embaixo de cada relógio, põe esse relógio no Resumo dos jogadores (só leitura). Bom para o relógio da cidade.
  - **Estágio de Morana** (Protocolo Morana): o terceiro relógio. Dois segmentos por estágio (Programa, Enxame, Entidade), com a DV do teste de resistência e os gatilhos para marcar e desmarcar.
  - **Handouts** (Protocolo Morana → Sessões → Handouts e textos, ou a aba Handouts de cada sessão): embaixo de cada documento, **Entregar aos jogadores** publica na hora em Notícias e handouts, com o título que os jogadores devem ver; **Só preparar** deixa no Publicar sem publicar, para editar antes (os campos entre colchetes). O código H-xx fica na nota do mestre, e a página mostra o que já foi preparado ou entregue.
  - **Virar rascunho de sessão** cria, com o texto do bloco, uma sessão **não publicada** em Visão dos jogadores → Sessões. Revise (o bloco tem segredos) e marque Publicada.
- **Início do mestre:** a faixa **Na mesa agora** tem atalhos (Escudo, Fichas de NPC, Encontros, Combate, Glossário, Índice, sessões), as últimas páginas abertas e o estado dos relógios de Sato e da cidade.
- **Endereço por página:** cada página e seção tem endereço próprio (`#combat/cobertura`). O **Voltar** do navegador volta para a página anterior, recarregar mantém o lugar, e dá para mandar o link de uma regra para alguém. As páginas que viraram parte de outra quando as regras foram unificadas continuam abrindo: `#net2077` vai para Netrunning, `#roles2077` para Roles e `#os2077` para Berserk e Sandevistan, em Cyberware de 2077.
- **Busca:** **/** (ou Ctrl+K) coloca o cursor na busca.
  - Nos documentos .md, cada seção `###` (uma cena, um NPC, uma regra) também é um resultado, e tem endereço próprio (`#docSessao01/a-trava-e-a-maleta-regras`).
  - As palavras podem vir em qualquer ordem ("smg smart" acha a Yukimura). A busca ignora acentos e aceita termos em inglês e sinônimos (CDT/ROF, HP/PV, eb/eddies, Death Save...).
  - **↑ ↓** escolhem o resultado, **Enter** abre já na seção certa, com os termos destacados, e **Esc** volta para a página.
  - Os chips **Tudo / Regras / Campanha** filtram os resultados.
- **Glossário** (aba Sistema → Na mesa): termos como DV, SP, Death Save e Smartgun Link viram links nas páginas de regras. Passe o mouse para ler a definição; clique para abrir o glossário, que tem o botão "Ver a regra".
- **Índice A–Z:** todos os cartões e fichas da wiki em ordem alfabética, com filtro.
- **Armas e Cyberware de 2077:** o seletor **Cartões | Tabela** mostra tudo numa tabela que ordena (clique no cabeçalho) e filtra por origem (Mission Kit ou suplemento de fã), classe, tipo, categoria ou instalação.
- Páginas longas têm a barra **Nesta página**, que fica presa no topo e pula entre as seções.
- O **Escudo do mestre** tem a calculadora de DV por alcance e o rolador de lesão crítica.
- **Links nos documentos .md:** `[texto](#pagina/secao)` abre uma página da wiki; `[texto](arquivo.md)` e o nome de um documento entre crases abrem o documento; `[texto](https://...)` abre fora, em outra aba.
- **Fichas de NPC** tem os inimigos prontos, com a conta de quantos usar por tamanho do grupo, e o **elenco do Protocolo Morana** (Wakako, Mina, Endo, Sato, Iskra, Vega, Brakk, Tamsin e Tomas). Buscar uma gangue ("Tyger Claws") ou um implante ("Kerenzikov") abre a ficha certa.
- **Roladores:** o **Lifepath** rola cada tabela ou o passado inteiro de uma vez. A **Economia** gera um Night Market (o de cyberware sempre traz um Berserk ou Sandevistan dos anos 2070). Os **Encontros de 2077** (só na wiki do mestre) rolam dia, noite ou madrugada, e cada resultado leva à ficha do NPC.
- **Avanço e Pontos de Melhoria** traz os custos, a tabela de quanto dar no fim da sessão e o questionário de estilo de jogo.

## Alerta de arquivo revertido

O OneDrive já voltou arquivos da lore para versões antigas mais de uma vez. O `server.js` confere isso sozinho: se um arquivo modificado for igual a uma versão antiga do git, ele avisa em vermelho no terminal, e a wiki do mestre mostra uma faixa vermelha no topo.

Quando a faixa aparecer, **não edite o arquivo**. Restaure a versão certa com `git checkout HEAD -- nome-do-arquivo` e confira se nada se perdeu.

O `publicar.bat` faz a mesma conferência e não publica enquanto houver arquivo revertido. Assim, a versão antiga nunca chega ao servidor.

## Testes

Para conferir o código, os documentos e a API enquanto outras sessões trabalham, rode:

```
node tests/validar.js
```

Esse comando não abre navegador, não reserva portas e não inicia o Foundry. Confere a sintaxe, os JSONs,
os documentos e a base da campanha; também executa regressões da API em memória, com dados temporários
próprios. Os cenários de documentos e base reutilizam essas mesmas verificações.
Para escolher uma parte: `node tests/validar.js documentos base` ou `node tests/validar.js regressoes`.
Os detalhes e os limites estão em [tests/README.md](tests/README.md).

Para conferir se a wiki continua funcionando depois de uma mudança, rode:

```
node tests/rodar.js
```

Os testes abrem o Edge escondido e sobem servidores próprios (portas 8765 a 8774), sem mexer no da porta 8000. Eles testam a busca, o endereço, o glossário, as tabelas, os roladores, a visão dos jogadores, as campanhas (cada jogador só lê a dele, nem pelo endereço direto; Notícias de Night City; crossover), a conta e a barra lateral (personagem em uso, pedidos resolvidos, sessões, páginas fixadas, barra compacta, gaveta do celular), o alerta de reversão, o modo hospedado (login do mestre, mesa, backup) e mais. No fim, aparece ✓ ou ✗ para cada coisa.

Rode essa suíte uma sessão por vez: as portas de teste e depuração do Edge e a pasta do Foundry de teste
são compartilhadas entre worktrees. O `tests/validar.js` pode rodar em paralelo.

**Teste dos documentos** (`node tests/rodar.js documentos`): confere os `.md` da campanha. Acusa termos fora do padrão da wiki ("Seriamente Ferido", "Canal", "Cybertech", "Enganação"), palavras comuns sem acento, nomes de perícia que não existem, arquivos citados que não existem, documentos fora da wiki e links para fichas que não existem.

**Teste do Foundry** (`node tests/rodar.js foundry`): importa personagens feitos na wiki de teste num Foundry de verdade e confere o ator.
- **Onde roda:** usa o Foundry instalado no PC, sem janela, na porta 30999. Os dados ficam numa pasta própria, `%LOCALAPPDATA%\FieldbookTeste\foundry`, que nunca toca nos seus mundos.
- **O que confere:** STATs, Role e sub-habilidades, cyberware instalado, armas, moradia, veículos e o crossover entre campanhas (o mundo antigo manda a ficha; o novo cria o ator igual).
- **Licença:** ela vale para uma mesa por vez, então o teste confere antes, na wiki online, se a mesa do servidor está vazia. Se houver alguém, o teste é pulado.
- **Módulo:** os scripts do módulo são copiados a cada rodada. Os compêndios só são gerados de novo na primeira vez ou com `$env:FOUNDRY_BUILD=1`.

**Teste do sistema no Foundry 14** (`node tests/rodar.js v14`): o protótipo `foundry-sistema/` num Foundry 14 de verdade.
- **Onde roda:** o Foundry 14 do PC (`%LOCALAPPDATA%\Programs\Foundry Virtual Tabletop`), sem janela, na porta 31014, numa pasta própria (`%LOCALAPPDATA%\FieldbookTeste\foundry14`). O mundo começa vazio a cada rodada.
- **O que confere:**
  - ficha e crítico do d10, com os dados fixos;
  - cyberware que só vale instalado e recarga;
  - os modos de ataque (tiro, mirado, autofogo, explosivo, cartucho e supressivo), com Lesão Crítica, Desfazer e os turnos (Suprimido e Death Save);
  - as habilidades do Solo (Consciência de Combate) e o MOVE do mortalmente ferido;
  - um segundo navegador fazendo o jogador que esquiva e que ataca rolando o próprio dano (e que, sem mestre na mesa, não gasta bala);
  - importação de um personagem do criador.
- **Licença:** só a licença sai da pasta de dados do Foundry do PC. Como no teste do Foundry 12, o teste é pulado com a mesa do servidor ocupada.

- Para rodar uma parte só, passe o nome: `node tests/rodar.js busca`. Os nomes são os arquivos de `tests/cenarios/`.
- `$env:DETALHES=1` mostra o detalhe de cada checagem.
- As capturas de tela ficam em `tests/.saida/`.

## Fluxo de trabalho

1. Mude a lore nos `.md` de `documentos/<campanha>/`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Um nome, um lado, um lugar ou uma peça mudou? Mude o registro na base da campanha (`base-da-campanha.md`): as páginas, as tabelas dos documentos e os cartões mudam juntos. Nos documentos, cite a base (`{{base:pecas}}`) em vez de copiar. O que mudou na mesa vai em Estado da campanha, na wiki. O ponto no mapa fica no `campaign-map.js`.
   Depois de cada sessão, revele no painel **Visão dos jogadores** o que o grupo descobriu e clique em Publicar.
3. Dê dois cliques em **`publicar.bat`**. Ele salva uma versão no git, o que permite voltar atrás, e põe a wiki online no ar.
   - O `iniciar serv.txt` (com a senha do mestre) fica fora do git.
   - Com o servidor online, o painel **Visão dos jogadores** é usado na wiki online, e não na do PC.
