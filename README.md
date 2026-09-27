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
| `sessao-01-a-maleta.md` | Roteiro da Sessão 1 e fichas de combate RED da equipe de Vega. |
| `sessao-02-o-hospital-queimado.md` | Sessão 2, com aberturas para cada desfecho da Sessão 1. |
| `guia-night-city-2077.md` | World building de 2077: linha do tempo, distritos, facções, NPCs do jogo, ganchos e tabelas. |
| `diario-da-campanha.md` | Estado dos relógios, onde está cada parte de Morana e registro das sessões. Atualize depois de cada sessão. |
| `index.html` | A wiki. As páginas de resumo estão escritas aqui; os documentos completos são lidos dos `.md`. |
| `campaign-map.js` | Pinos do mapa de operações. |
| `system-catalog.js` | Catálogo de Roles, cyberware e equipamento do RED. |
| `server.js` | Servidor local da wiki. |

Os arquivos de mapa em resolução máxima (`Map_*_Full.png`) e o `.zip` do cyberpunk-css foram movidos para `C:\Users\kouar\CyberpunkRPG-arquivos-grandes`, fora do OneDrive.

## Fluxo de trabalho

1. Mude a lore nos `.md`. A página "Documentos completos" da wiki acompanha na hora (recarregue a página).
2. Se a mudança afetar um resumo (Dossiê, Pessoas, Sessão 01, mapa), atualize também o `index.html` ou o `campaign-map.js`.
3. Salve uma versão no git: `git add -A` e `git commit -m "o que mudou"`. O histórico permite voltar atrás.
