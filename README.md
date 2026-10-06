# Night City Fieldbook — Protocolo Morana

Wiki de mesa para a campanha de Cyberpunk RED ambientada em 2077.

## Wiki e mesa online

A wiki e o Foundry podem rodar num servidor gratuito (Oracle Cloud), sempre ligados, com endereço fixo: `https://wiki.SEUDOMINIO` para a wiki e `https://mesa.SEUDOMINIO` para o Foundry. O passo a passo da mudança está em [servidor/README.md](servidor/README.md).

- **Publicar uma mudança:** edite no PC e dê dois cliques em **`publicar.bat`**.
  - Ele recusa se o OneDrive tiver voltado algum arquivo para uma versão antiga.
  - Ele mostra o que mudou, pede uma descrição curta e manda para o GitHub.
  - Ele espera a versão nova aparecer na wiki online, o que leva até 1 minuto.
- **Mestre:** entra por `https://wiki.SEUDOMINIO/mestre`, com a senha. O aparelho fica lembrado por um ano.
  - Na barra lateral ficam **Sair do modo mestre**, **Baixar backup** (o servidor faz um por dia) e a versão no ar.
- **Mesa:** a barra lateral das duas wikis mostra se a mesa está aberta e quantos estão conectados, e tem o botão **Entrar na mesa**.
- **Servidor, para o mestre:** a barra lateral resume o último backup, o disco livre, se o módulo do Foundry está esperando a mesa vazia e as últimas publicações. Fica em vermelho com backup de mais de 2 dias ou disco com menos de 10% livre.
- **No celular, como app:** na barra lateral aparece **Instalar no celular** (Android e computador; no iPhone, Compartilhar → Adicionar à Tela de Início).
  - Instalada ou não, a wiki guarda no aparelho as regras e o que o mestre publicou, e abre sem internet. Os personagens e a loja precisam de rede.
  - Com rede, ela sempre busca a versão nova primeiro.
  - A wiki do mestre nunca fica guardada no aparelho.
- **Dados ao vivo:** no servidor, ficam fora do git (`/srv/fieldbook/dados`).
  - São personagens, retratos, códigos, o painel Publicar e as regras da loja.
  - Use a wiki online para mexer neles: a wiki do PC vira um lugar de teste.

## Como abrir a wiki no PC

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
| `server.js` | Servidor da wiki, no PC ou no servidor online (`MODO=hospedado`). Decide quem vê a wiki do mestre e quem vê só a dos jogadores, mostra o estado da mesa e avisa se o OneDrive reverteu algum arquivo. |
| `mestre.html` | A tela "Entrar como mestre" (`/mestre`). |
| `revertidos.js` | Confere se o OneDrive voltou algum arquivo para uma versão antiga. Usado pelo servidor e pelo `publicar.bat`. |
| `publicar.bat`, `publicar.ps1` | Publicam a wiki no servidor online, pelo GitHub. |
| `manifest.webmanifest`, `sw.js`, `icones/` | A wiki instalada no celular: o manifesto, o service worker (guarda as regras para abrir sem internet) e os ícones (o `icone.svg` é a fonte dos PNG). |
| `servidor/` | Instalação e manutenção do servidor online (wiki, Foundry, HTTPS, atualização e backup). Veja o README da pasta. |
| `api-personagens.js` | A parte do servidor que guarda os personagens e os códigos dos jogadores. |
| `criador.js` | Personagens, ficha, criador e loja inicial (nas duas wikis). |
| `popup.js` | Os pop-ups da wiki (confirmar, escrever um motivo, copiar um código) e os avisos rápidos no canto, no lugar das caixas do navegador. |
| `system-criacao.js` | Regras de criação: Roles de 2077, tabelas de STAT, perícias e pacotes de cada Role. |
| `loja-catalogo.js` | Catálogo da loja, gerado pelo build do módulo. Não edite à mão. |
| `personagens/` | Um arquivo por personagem dos jogadores. Fica fora do git: no servidor, os de verdade estão em `/srv/fieldbook/dados/personagens`; no PC, só servem para teste. |
| `tests/` | Testes automáticos da wiki (`node tests/rodar.js`). |
| `foundry-2077/` | Módulo do Foundry VTT "Cyberpunk RED: 2077", gerado a partir dos dados da wiki. Veja o README da pasta. |
| `foundry-net-architect/` | Módulo do Foundry VTT "NET Architect": pontos de acesso à NET nos Tiles, com a janela do netrunner e o mapa da arquitetura. Veja o README da pasta. |
| `foundry-fluxo-de-combate/` | Módulo do Foundry VTT "Fluxo de Combate": ataque, esquiva às cegas e dano na ficha, com área, cartucho, fogo supressivo, lesão crítica e Death Save. Substitui o Evasion Workflow. Veja o README da pasta. |

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

## Personagens dos jogadores

Os jogadores criam os personagens pela wiki, sem abrir o Foundry. Os personagens ficam salvos no servidor da wiki.

1. **Códigos:** na wiki do mestre, em **Campanha → Personagens e códigos**, crie um código para cada jogador (por exemplo, `NC-7F3K-9QAB`) e passe a ele.
2. **Criar:** o jogador abre a wiki dos jogadores, entra em **Personagens**, digita o código uma vez (o aparelho lembra) e clica em **Novo personagem**.
   - **Os passos:** identidade e Role, STATs, perícias, Lifepath, equipamento, moradia e revisão.
   - **Métodos:** os três do livro (Rato de Rua, Edgerunner e Pacote Completo), com as 9 Roles de 2077 e o cyberware grátis de 2077.
   - **Salvamento:** tudo é salvo sozinho. Os avisos mostram o que falta, mas não impedem de continuar.
   - **Ajuda:** cada passo tem um "Como funciona" com a página do livro, e um resumo fixo mostra pontos, HP, Humanidade, dinheiro e pendências. As perícias têm a descrição do livro, e os termos de regra levam ao glossário.
   - **Lifepath da Role:** no passo 4, as perguntas próprias da Role (livro p. 54–70), para rolar ou escolher. A Face usa as do Rockerboy, e o Corpo, as do Exec. As respostas vão para o campo Role Lifepath da ficha do Foundry, junto com as notas.
   - **Retrato:** no passo 1, o jogador envia uma imagem (PNG, JPEG ou WebP, reduzida para 512 px antes de sair do aparelho) ou cola um link `https`. Se houver imagem enviada, ela vale no lugar do link. O retrato aparece na ficha, em miniatura na lista de Personagens (inclusive para os outros jogadores) e vai para a ficha e o token no Foundry.
   - **Perícias sugeridas:** no Edgerunner e no Pacote Completo, **Distribuir sugerido** põe os níveis do Rato de Rua da Role (86 pontos certinhos). No Pacote Completo, as 20 perícias da Role aparecem primeiro.
   - **O que a Role ganha além do Rank** (passo 1). Tudo vai para o item de Role e para a ficha no Foundry.
     - **Solo:** os 4 pontos da Consciência de Combate (RED p. 146).
     - **Tech:** os 8 pontos das especialidades de Artífice, até 4 em cada (p. 147–148).
     - **Medtech:** os 4 pontos de Medicina (p. 149). As perícias Cirurgia (2 por ponto) e Tecnologia Médica são calculadas.
     - **Nomad:** as 4 escolhas da Oficina da Família (p. 161–165), entre veículos e upgrades. No Foundry, os veículos chegam com os upgrades instalados.
     - **Corpo:** no Pacote Completo, ganha o terno de negócios de graça (o bônus de assinatura do Teamwork). Nos outros métodos, o pacote já traz o terno.
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
   - **Netrunner de 2077:** no Rato de Rua e no Edgerunner, o Netrunner escolhe entre o kit do RED (cyberdeck e programas) e o de 2077 (Militech Hunter MK.1 e 3 quickhacks de 100eb). O resto do pacote não muda.
   - **Kit sugerido:** no Pacote Completo, um botão compra de uma vez o pacote de Rato de Rua da Role.
4. **Enviar para o mestre:** quando o personagem estiver pronto, o jogador clica em **Enviar para o mestre**. O botão fica na revisão do criador e na ficha. O quadro **Levar para o Foundry** mostra em que pé está: não enviado, esperando o mestre, no Foundry, ou mudou depois de importar (aí aparece **Avisar o mestre de novo**). Na lista de Personagens, o mestre vê quem está esperando.
5. **Importar no Foundry:** no Foundry aberto **neste computador**, o mestre recebe um aviso, até um minuto depois do envio, e a janela **Personagens da wiki** com **Importar**. Também dá para importar a qualquer hora: aba Atores, botão **Importar da wiki**. Escolha o personagem e o dono (vem marcado o jogador com o mesmo nome), e o módulo cria o ator com STATs, perícias, Role, equipamento, cyberware instalado, Humanidade, Lifepath, dinheiro e retrato.
   - **Retrato:** o módulo copia a imagem para a pasta do mundo (`worlds/<mundo>/retratos-wiki`), para os jogadores também verem, e a põe na ficha e no token. Um link de outro site que não deixa baixar entra como link, se terminar em `.png`, `.jpg` ou `.webp`; senão, o aviso do chat pede para pôr a imagem à mão.
   - **Não aparece o botão nem o aviso?** O módulo instalado está velho: feche o Foundry e rode `atualizar-modulo.bat`.
   - O aviso pode ser desligado em Configurações do módulo → Avisos da wiki.
   - Depois disso, a loja inicial daquele personagem fecha, e a Loja vira a **loja da campanha** (veja abaixo).
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
   - **O resto:** perícias pelos grupos do Foundry, a árvore de cyberware, o cyberdeck e o equipamento.

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
- **Quem vê o quê:** cada jogador vê e edita só os dele; dos outros, só nome, apelido, Role e retrato. O mestre vê e edita todos.

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

O `publicar.bat` faz a mesma conferência e não publica enquanto houver arquivo revertido. Assim, a versão antiga nunca chega ao servidor.

## Testes

Para conferir se a wiki continua funcionando depois de uma mudança, rode:

```
node tests/rodar.js
```

Os testes abrem o Edge escondido e sobem servidores próprios (portas 8765 a 8769), sem mexer no da porta 8000. Eles testam a busca, o endereço, o glossário, as tabelas, os roladores, a visão dos jogadores, o alerta de reversão, o modo hospedado (login do mestre, mesa, backup) e mais. No fim, aparece ✓ ou ✗ para cada coisa.

**Teste do Foundry** (`node tests/rodar.js foundry`): importa personagens feitos na wiki de teste num Foundry de verdade e confere o ator.
- **Onde roda:** usa o Foundry instalado no PC, sem janela, na porta 30999. Os dados ficam numa pasta própria, `%LOCALAPPDATA%\FieldbookTeste\foundry`, que nunca toca nos seus mundos.
- **O que confere:** STATs, Role e sub-habilidades, cyberware instalado, armas, moradia e veículos.
- **Licença:** ela vale para uma mesa por vez, então o teste confere antes, na wiki online, se a mesa do servidor está vazia. Se houver alguém, o teste é pulado.
- **Módulo:** os scripts do módulo são copiados a cada rodada. Os compêndios só são gerados de novo na primeira vez ou com `$env:FOUNDRY_BUILD=1`.

- Para rodar uma parte só, passe o nome: `node tests/rodar.js busca`. Os nomes são os arquivos de `tests/cenarios/`.
- `$env:DETALHES=1` mostra o detalhe de cada checagem.
- As capturas de tela ficam em `tests/.saida/`.

## Fluxo de trabalho

1. Mude a lore nos `.md`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Se a mudança afetar um resumo (Dossiê, Pessoas, Sessão 01, mapa), atualize também o `index.html` ou o `campaign-map.js`.
   Depois de cada sessão, revele no painel **Visão dos jogadores** o que o grupo descobriu e clique em Publicar.
3. Dê dois cliques em **`publicar.bat`**. Ele salva uma versão no git, o que permite voltar atrás, e põe a wiki online no ar.
   - O `iniciar serv.txt` (com a senha do mestre) fica fora do git.
   - Com o servidor online, o painel **Visão dos jogadores** é usado na wiki online, e não na do PC.
