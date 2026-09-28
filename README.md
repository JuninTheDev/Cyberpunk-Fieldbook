# Night City Fieldbook — Protocolo Morana

Wiki local de mesa para a campanha de Cyberpunk RED ambientada em 2077.

## Como abrir a wiki

Nesta pasta, rode:

```
node server.js
```

e abra `http://localhost:8000`.

- Por padrão, só este computador acessa (a wiki tem segredos do mestre).
- Para abrir num tablet na mesma rede: no PowerShell, `$env:HOST='0.0.0.0'; node server.js`, e acesse pelo IP do computador. Quem estiver na mesma rede também consegue ver.
- Abrir o `index.html` com dois cliques funciona para as páginas de resumo, mas os **documentos completos** só carregam pelo servidor.

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
| `index.html` | A wiki. As páginas de resumo estão escritas aqui; os documentos completos são lidos dos `.md`. |
| `campaign-map.js` | Pinos do mapa de operações. |
| `system-rules.js` | Regras do RED para consulta na mesa: Escudo do mestre, perícias, testes, combate, dano e cura, Humanidade e drogas, Netrunning, economia e criação. Cada seção indica a página do PDF traduzido. |
| `system-net.js` | Netrunning completo: arsenal do RED (programas, Black ICE, demônios, upgrades, defesas) e 2077 (regras, cyberdecks, ICE, neuralware, quickhacks, daemons, Berserk e Sandevistan), um cartão por item. |
| `system-catalog.js` | Catálogo de Roles, cyberware e equipamento do RED. |
| `server.js` | Servidor local da wiki. |

Os arquivos de mapa em resolução máxima (`Map_*_Full.png`) e o `.zip` do cyberpunk-css foram movidos para `C:\Users\kouar\CyberpunkRPG-arquivos-grandes`, fora do OneDrive.

## Consulta durante a sessão

- **/** (ou Ctrl+K) coloca o cursor na busca. **Enter** abre o primeiro resultado já na seção certa, com o termo destacado. **Esc** volta para a página.
- A busca ignora acentos e aceita termos em inglês (por exemplo, "Evasion", "Death Save", "Shoulder Arms").
- Páginas longas têm a barra **Nesta página**, que fica presa no topo e pula entre as seções.
- O **Escudo do mestre** (aba Sistema) tem a calculadora de DV por alcance e o rolador de lesão crítica.

## Fluxo de trabalho

1. Mude a lore nos `.md`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Se a mudança afetar um resumo (Dossiê, Pessoas, Sessão 01, mapa), atualize também o `index.html` ou o `campaign-map.js`.
3. Salve uma versão no git: `git add -A` e `git commit -m "o que mudou"`. O histórico permite voltar atrás.
