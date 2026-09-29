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
| `system-rules.js` | Regras do RED para consulta na mesa: Escudo do mestre, perícias, testes, combate, dano e cura, Humanidade e drogas, Netrunning, economia e criação. Cada seção indica a página do PDF traduzido. |
| `system-net.js` | Netrunning completo: arsenal do RED (programas, Black ICE, demônios, upgrades, defesas) e 2077 (regras, cyberdecks, ICE, neuralware, quickhacks, daemons, Berserk e Sandevistan), um cartão por item. |
| `system-2077.js` | Suplemento de 2077: as 46 armas (Power, Tech e Smart), os 42 cyberwares e o resumo do suplemento. |
| `system-catalog.js` | Catálogo de Roles, cyberware e equipamento do RED. |
| `mestre-npcs.js` | Fichas de NPC: as 10 fichas prontas do livro (capangas, tenentes, mini-chefes e o Cyberpsycho), a Trauma Team e variantes para as facções de 2077. Só a wiki do mestre carrega; os jogadores não recebem este arquivo. |
| `server.js` | Servidor local da wiki. Decide quem vê a wiki do mestre e quem vê só a dos jogadores. |
| `foundry-2077/` | Módulo do Foundry VTT "Cyberpunk RED: 2077", gerado a partir dos dados da wiki. Veja o README da pasta. |

Os arquivos de mapa em resolução máxima (`Map_*_Full.png`) e o `.zip` do cyberpunk-css foram movidos para `C:\Users\kouar\CyberpunkRPG-arquivos-grandes`, fora do OneDrive.

## Módulo do Foundry

A pasta `foundry-2077/` gera o módulo **Cyberpunk RED: 2077** para o Foundry VTT a partir dos mesmos dados desta wiki (`system-2077.js`, `system-net.js`, `mestre-npcs.js`). Depois de mudar armas, cyberware, netrunning ou fichas de NPC na wiki, feche o mundo no Foundry e rode, dentro de `foundry-2077`:

```
node build/build.mjs
```

O módulo é gravado direto na pasta de módulos do Foundry.

## Consulta durante a sessão

- **/** (ou Ctrl+K) coloca o cursor na busca. **Enter** abre o primeiro resultado já na seção certa, com o termo destacado. **Esc** volta para a página.
- A busca ignora acentos e aceita termos em inglês (por exemplo, "Evasion", "Death Save", "Shoulder Arms").
- Páginas longas têm a barra **Nesta página**, que fica presa no topo e pula entre as seções.
- O **Escudo do mestre** (aba Sistema) tem a calculadora de DV por alcance e o rolador de lesão crítica.
- **Fichas de NPC** (aba Sistema, logo abaixo) tem os inimigos prontos, com a conta de quantos usar por tamanho do grupo. Buscar uma gangue ("Tyger Claws") ou um implante ("Kerenzikov") abre a ficha certa.

## Fluxo de trabalho

1. Mude a lore nos `.md`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Se a mudança afetar um resumo (Dossiê, Pessoas, Sessão 01, mapa), atualize também o `index.html` ou o `campaign-map.js`.
   Depois de cada sessão, revele no painel **Visão dos jogadores** o que o grupo descobriu e clique em Publicar.
3. Salve uma versão no git: `git add -A` e `git commit -m "o que mudou"`. O histórico permite voltar atrás.
