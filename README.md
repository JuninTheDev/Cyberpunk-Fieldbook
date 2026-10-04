# Night City Fieldbook — Protocolo Morana

Wiki local de mesa para a campanha de Cyberpunk RED ambientada em 2077.

## Como abrir a wiki

Nesta pasta, rode:

```
node server.js
```

e abra `http://localhost:8000`.

- Por padrão, só este computador acessa.
- Para os jogadores entrarem pela rede: no PowerShell, `$env:HOST='0.0.0.0'; node server.js`. O servidor mostra no terminal o endereço (`http://192.168.x.x:8000`) para passar aos jogadores.
- **Quem entra de outro aparelho só recebe a visão dos jogadores** (`jogadores.html`). A wiki do mestre, os `.md`, os PDFs e o `jogadores-mestre.json` ficam bloqueados para eles.
- Para usar a visão do mestre num tablet: `$env:HOST='0.0.0.0'; $env:GM_KEY='uma-senha'; node server.js` e, no tablet, abra uma vez `http://IP:8000/?mestre=uma-senha`. O tablet guarda um cookie e passa a abrir a wiki do mestre.
- Abrir o `index.html` com dois cliques funciona para as páginas de resumo, mas os **documentos completos** e a visão dos jogadores só funcionam pelo servidor.

## Jogar com gente de fora de casa

Sem mexer no roteador: o `abrir-online.bat` abre o Foundry e a wiki dos jogadores pela internet, com um túnel do Cloudflare (`cloudflared`, instalado com `winget install --id Cloudflare.cloudflared`).

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

Na wiki do mestre, **Campanha → Visão dos jogadores** é o painel do que os jogadores podem ver:

- **O que o grupo sabe:** o resumo que aparece na página inicial deles.
- **Pessoas, Lugares no mapa, Notícias e handouts:** marque *Revelado* / *No mapa* / *Publicada* no que o grupo já descobriu. O resto fica guardado, mas não é enviado.
- **Nota do mestre** (campo tracejado em vermelho): lembretes seus, como o nome verdadeiro de um NPC. Nunca vai para os jogadores.
- Clique em **Publicar**. A página dos jogadores se atualiza sozinha em até 15 segundos e avisa "O mestre publicou novidades".

Os jogadores também veem a aba **Regras** inteira (Escudo do mestre, combate, netrunning, armas, cyberware...), sem as notas de campanha. Nas páginas de regras da wiki do mestre, essas notas aparecem com **contorno tracejado vermelho**: é o que só você vê. Elas ficam no `index.html` (em `gmNotes`), e não nos arquivos `system-*.js`, que os jogadores baixam.

**Não escreva segredos** em `jogadores.html`, `wiki-app.js`, `wiki.css` ou `system-*.js`: esses arquivos vão para os aparelhos dos jogadores.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `fundacao-da-campanha.md` | Premissa, backstory, as três partes de Morana, atos, reviravoltas, relógio de Sato e finais. **Fonte principal da lore.** |
| `personagens-da-campanha.md` | NPCs: objetivos, segredos, falas e interpretação. |
| `ganchos-dos-personagens.md` | Sessão zero: transforma as respostas dos jogadores em ganchos pessoais ligados a Morana. |
| `sessao-01-a-maleta.md` | Roteiro da Sessão 1 e fichas de combate RED da equipe de Vega. |
| `sessao-02-o-hospital-queimado.md` | Sessão 2, com aberturas para cada desfecho da Sessão 1. |
| `guia-night-city-2077.md` | World building de 2077: linha do tempo, distritos, facções, NPCs do jogo, ganchos e tabelas. |
| `diario-da-campanha.md` | Estado dos relógios, onde está cada parte de Morana e registro das sessões. Atualize depois de cada sessão. |
| `index.html` | A wiki do mestre. As páginas de resumo e as notas de campanha nas regras (`gmNotes`) estão escritas aqui; os documentos completos são lidos dos `.md`. |
| `jogadores.html` | A visão dos jogadores: resumo, pessoas, mapa e notícias publicados pelo mestre, mais as regras. |
| `jogadores-painel.js` | O painel "Visão dos jogadores" da wiki do mestre. |
| `jogadores-mestre.json` | Tudo o que está no painel, inclusive o que ainda não foi revelado. Só o mestre acessa. |
| `jogadores.json` | Só o que foi publicado. É o que a página dos jogadores lê. Gerado pelo botão Publicar. |
| `wiki-app.js`, `wiki.css` | O motor e o visual da wiki, usados pelas duas páginas. |
| `campaign-map.js` | Pinos do mapa de operações. |
| `system-rules.js` | Regras do RED para consulta na mesa: Escudo do mestre, perícias, testes, combate, dano e cura, Humanidade e drogas, economia (com o Night Market), criação, Lifepath e Avanço. Cada seção indica a página do PDF traduzido. |
| `system-net.js` | Netrunning completo: arsenal do RED (programas, Black ICE, demônios, upgrades, defesas) e 2077 (regras, cyberdecks, ICE, neuralware, quickhacks, daemons, Berserk e Sandevistan), um cartão por item. |
| `system-2077.js` | Suplemento de 2077: as 46 armas (Power, Tech e Smart), os 42 cyberwares, as Roles de 2077 e o resumo do suplemento. |
| `system-catalog.js` | Catálogo do RED: Roles, cyberware, armas, armaduras, munição, acessórios, equipamento médico e a lista de equipamento. |
| `system-glossario.js` | O glossário: definição curta de cada termo de regra e onde está a regra. Vai também para os jogadores. |
| `mestre-npcs.js` | Fichas de NPC (as 10 fichas prontas do livro, a Trauma Team e variantes para as facções de 2077) e os Encontros de 2077. Só a wiki do mestre carrega; os jogadores não recebem este arquivo. |
| `server.js` | Servidor local da wiki. Decide quem vê a wiki do mestre e quem vê só a dos jogadores, e avisa se o OneDrive reverteu algum arquivo. |
| `api-personagens.js` | A parte do servidor que guarda os personagens e os códigos dos jogadores. |
| `criador.js` | Personagens, ficha, criador e loja inicial (nas duas wikis). |
| `system-criacao.js` | Regras de criação: Roles de 2077, tabelas de STAT, perícias e pacotes de cada Role. |
| `loja-catalogo.js` | Catálogo da loja, gerado pelo build do módulo. Não edite à mão. |
| `personagens/` | Um arquivo por personagem dos jogadores. |
| `tests/` | Testes automáticos da wiki (`node tests/rodar.js`). |
| `foundry-2077/` | Módulo do Foundry VTT "Cyberpunk RED: 2077", gerado a partir dos dados da wiki. Veja o README da pasta. |

Os arquivos de mapa em resolução máxima (`Map_*_Full.png`) e o `.zip` do cyberpunk-css foram movidos para `C:\Users\kouar\CyberpunkRPG-arquivos-grandes`, fora do OneDrive.

## Módulo do Foundry

A pasta `foundry-2077/` gera o módulo **Cyberpunk RED: 2077** para o Foundry VTT a partir dos mesmos dados desta wiki (`system-2077.js`, `system-net.js`, `mestre-npcs.js`). Depois de mudar armas, cyberware, netrunning ou fichas de NPC na wiki, feche o mundo no Foundry e rode, dentro de `foundry-2077`:

```
node build/build.mjs
```

O módulo é gravado direto na pasta de módulos do Foundry. O build também gera o `loja-catalogo.js`, o catálogo da loja da wiki, com os itens do sistema e os de 2077. Para gerar só o catálogo, sem fechar o Foundry: `node build/loja.mjs`.

## Personagens dos jogadores

Os jogadores criam os personagens pela wiki, sem abrir o Foundry. Os personagens ficam salvos no servidor da wiki.

1. **Códigos:** na wiki do mestre, em **Campanha → Personagens e códigos**, crie um código para cada jogador (por exemplo, `NC-7F3K-9QAB`) e passe a ele.
2. **Criar:** o jogador abre a wiki dos jogadores, entra em **Personagens**, digita o código uma vez (o aparelho lembra) e clica em **Novo personagem**.
   - **Os passos:** identidade e Role, STATs, perícias, Lifepath, equipamento, moradia e revisão.
   - **Métodos:** os três do livro (Rato de Rua, Edgerunner e Pacote Completo), com as 9 Roles de 2077 e o cyberware grátis de 2077.
   - **Salvamento:** tudo é salvo sozinho. Os avisos mostram o que falta, mas não impedem de continuar.
3. **Loja inicial:** o Pacote Completo compra tudo na loja (2.550eb, mais 800eb só para moda). Rato de Rua e Edgerunner recebem o pacote da Role e mais 500eb. Devolver um item reembolsa.
4. **Levar para o Foundry:** no Foundry aberto **neste computador**, aba Atores, botão **Importar da wiki**. Escolha o personagem e o dono, e o módulo cria o ator com STATs, perícias, Role, equipamento, cyberware instalado, Humanidade, Lifepath e dinheiro.
   - Depois disso, a loja inicial daquele personagem fecha. As compras durante a sessão vêm numa próxima versão, pelo mesmo caminho.
5. **Mudou algo na wiki depois?** Na ficha do ator, botão **Atualizar da wiki**. Ele mostra o que mudou e aplica o que você marcar, sem apagar nada da ficha.

Notas:

- **Onde importar:** importe do computador onde a wiki roda. O Foundry fala com a wiki em `http://localhost:8000` (dá para trocar em Configurações do módulo → Endereço da wiki). Se abrir o Foundry por outro endereço que não `localhost:30000`, ligue o servidor com `$env:FOUNDRY_ORIGIN='http://esse-endereco'`.
- **Pelo túnel**, o link muda a cada sessão, e o jogador digita o código de novo.
- **Onde ficam os dados:** os códigos ficam em `contas-jogadores.json`, fora do git. Os personagens ficam em `personagens/`. Apagar um personagem move o arquivo para `personagens/apagados/`.
- **Quem vê o quê:** cada jogador vê e edita só os dele; dos outros, só nome, apelido e Role. O mestre vê e edita todos.

## Consulta durante a sessão

- **Início do mestre:** a faixa **Na mesa agora** tem atalhos (Escudo, Fichas de NPC, Encontros, Combate, Glossário, Índice, sessões), as últimas páginas abertas e o estado dos relógios de Sato e da cidade.
- **Endereço por página:** cada página e seção tem endereço próprio (`#combat/cobertura`). O **Voltar** do navegador volta para a página anterior, recarregar mantém o lugar, e dá para mandar o link de uma regra para alguém.
- **Busca:** **/** (ou Ctrl+K) coloca o cursor na busca.
  - As palavras podem vir em qualquer ordem ("pistola smart" acha a Yukimura). A busca ignora acentos e aceita termos em inglês e sinônimos (CDT/ROF, HP/PV, eb/eddies, Death Save...).
  - **↑ ↓** escolhem o resultado, **Enter** abre já na seção certa, com os termos destacados, e **Esc** volta para a página.
  - Os chips **Tudo / Regras / Campanha** filtram os resultados.
- **Glossário** (aba Sistema → Na mesa): termos como DV, SP, Death Save e Smart Link viram links nas páginas de regras. Passe o mouse para ler a definição; clique para abrir o glossário, que tem o botão "Ver a regra".
- **Índice A–Z:** todos os cartões e fichas da wiki em ordem alfabética, com filtro.
- **Armas e Cyberware de 2077:** o seletor **Cartões | Tabela** mostra tudo numa tabela que ordena (clique no cabeçalho) e filtra por classe, tipo ou instalação.
- Páginas longas têm a barra **Nesta página**, que fica presa no topo e pula entre as seções.
- O **Escudo do mestre** tem a calculadora de DV por alcance e o rolador de lesão crítica.
- **Fichas de NPC** tem os inimigos prontos, com a conta de quantos usar por tamanho do grupo. Buscar uma gangue ("Tyger Claws") ou um implante ("Kerenzikov") abre a ficha certa.
- **Roladores:** o **Lifepath** rola cada tabela ou o passado inteiro de uma vez. A **Economia de 2077** gera um Night Market. Os **Encontros de 2077** (só na wiki do mestre) rolam dia, noite ou madrugada, e cada resultado leva à ficha do NPC.
- **Avanço e Pontos de Melhoria** traz os custos, a tabela de quanto dar no fim da sessão e o questionário de estilo de jogo.

## Alerta de arquivo revertido

O OneDrive já voltou arquivos da lore para versões antigas mais de uma vez. O `server.js` confere isso sozinho: se um arquivo modificado for igual a uma versão antiga do git, ele avisa em vermelho no terminal, e a wiki do mestre mostra uma faixa vermelha no topo.

Quando a faixa aparecer, **não edite o arquivo**. Restaure a versão certa com `git checkout HEAD -- nome-do-arquivo` e confira se nada se perdeu.

## Testes

Para conferir se a wiki continua funcionando depois de uma mudança, rode:

```
node tests/rodar.js
```

Os testes abrem o Edge escondido, sobem servidores próprios (portas 8765 a 8767, sem mexer no da porta 8000) e testam a busca, o endereço, o glossário, as tabelas, os roladores, a visão dos jogadores, o alerta de reversão e mais. No fim, aparece ✓ ou ✗ para cada coisa.

- Para rodar uma parte só, passe o nome: `node tests/rodar.js busca`. Os nomes são os arquivos de `tests/cenarios/`.
- `$env:DETALHES=1` mostra o detalhe de cada checagem.
- As capturas de tela ficam em `tests/.saida/`.

## Fluxo de trabalho

1. Mude a lore nos `.md`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Se a mudança afetar um resumo (Dossiê, Pessoas, Sessão 01, mapa), atualize também o `index.html` ou o `campaign-map.js`.
   Depois de cada sessão, revele no painel **Visão dos jogadores** o que o grupo descobriu e clique em Publicar.
3. Salve uma versão no git: `git add -A` e `git commit -m "o que mudou"`. O histórico permite voltar atrás.
   O `iniciar serv.txt` pode ter a senha do mestre: tire-o do commit com `git restore --staged "iniciar serv.txt"` antes de `git commit`.
