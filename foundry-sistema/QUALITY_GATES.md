# Portões de qualidade

Uma tarefa do [ROADMAP.md](ROADMAP.md) só fecha quando estes portões passam. Falha não se esconde nem se contorna
tirando teste: ou se corrige a causa, ou a tarefa fica aberta com a falha registrada no
[MIGRATION_STATUS.md](MIGRATION_STATUS.md).

| Portão | Como roda | Passa quando | Estado |
| --- | --- | --- | --- |
| G1 Sintaxe | `node --check` em cada `.mjs` do sistema e nos testes | nenhum erro | ativo |
| G2 Lint | `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/cenarios/v14.js` (configuração em `eslint.config.mjs`, na raiz, sem node_modules) | nenhum erro | ativo |
| G3 Regras | `node --test "tests/sistema/*.test.mjs"` (com a pasta no lugar do glob, o Node 24 tenta rodar a pasta como arquivo) | todos passam: as regras puras com os valores de referência, e o conteúdo gerado contra a própria wiki (tabelas de DV faixa por faixa, lesões pelo 2d6, perícias, os itens da loja) | ativo |
| G4 Foundry 14 | `node tests/rodar.js v14` (o Foundry 14 do PC, sem janela, pasta descartável) | todas as checagens passam, inclusive a de nenhum aviso de compatibilidade nem erro vindo do sistema (capturados com a pilha no navegador do mestre e no do jogador) | ativo |
| G5 Wiki | `node tests/rodar.js` (a suíte inteira) | nenhuma falha nova; as conhecidas estão listadas abaixo | ativo |
| G6 Revisão | `git diff` do lote | sem mudança fora da tarefa e nada que alcance o servidor ou a campanha real | ativo |
| G7 Documentação | README, ROADMAP e MIGRATION_STATUS | o que mudou está escrito, e as limitações também | ativo |

## Falhas conhecidas da suíte da wiki (deste PC, não do sistema)

- **`fluxo`, "armas de 2077 do compêndio":** precisa do sistema CORE extraído em `foundry-2077/.cache`, que só existe num
  PC com o Foundry 12 e o CORE instalados.
- **`sistema`, "sem erros de JS na página":** dois 404 dos PDFs dos livros, que ficam fora do git (`*.pdf`).

## Regras

- **Mudança de regra** só com a fonte (a página da wiki ou o código do CORE) e um teste de referência com o valor
  esperado.
- **Dúvida de regra** vira pergunta registrada no MIGRATION_STATUS.md, não interpretação nova.
- **Dados nos testes:** a conta fica com os dados fixos (`CONFIG.Dice.randomUniform` no cenário).
- **Passo novo no cenário** devolve o que mudou (balas, habilidades, HP): os passos seguintes contam com o estado de
  antes. Para trocar um objeto inteiro (as habilidades da Role, um `TypedObjectField`), use `_replace(...)`; o `update`
  só mescla.
- **Aviso esperado** (um `ui.notifications.warn` que o passo provoca de propósito) é capturado e conferido no próprio
  passo. Solto no console, o G4 o pegaria como problema.
- **Teste de uma correção** é provado falhando sem ela. A mutação é desfeita antes do commit.
- **Código para o navegador** (`edge.evaluate`) vai dentro de um template literal do Node: escreva `\\s` para chegar
  `\s` ao navegador. Um `\s` sozinho vira `s`. Ao editar o cenário por `node -e` ou por heredoc no Git Bash, as barras
  invertidas chegam pela metade: edite essas linhas no editor, ou escreva o script num arquivo.
- **Ordem do que se cria:** o Foundry não garante que `createEmbeddedDocuments` devolva os documentos na ordem dos dados.
  Ache cada um pelo tipo, pelo nome ou por um `_id` escolhido antes (`keepId: true`).
- **Janela fechando:** no Edge sem janela, uma janela do Foundry fica no DOM com a classe `minimizing` por até 1 s
  depois do clique (o `close` espera a animação). Para contar janelas abertas, e para achar a que vai receber o
  clique, use `:not(.minimizing)`: a janela que fecha também tem os botões, e o clique nela se perde.
- **Limpeza no `finally`:** o passo que cria combate, marca alvo ou abre janela desfaz isso num `finally`. Uma falha no
  meio não pode arrastar os passos seguintes: no ciclo 17, um combate e um alvo marcado que sobraram derrubaram três
  passos de fogo supressivo e de turnos.
- **Janela sem prazo:** a janela de defesa de NPC do mestre espera o clique para sempre. O passo em que um defeito
  pode abrir uma dessas janelas fora da vez fecha e anota a janela inesperada, e confere a lista vazia. Assim ele falha
  em vez de travar a suíte: no ciclo 18, uma mutação travou o G4 por mais de 10 minutos. Depois de clicar numa janela,
  espere ela sair do estado desenhado (`!app.rendered`), porque o fechamento só começa depois do clique.

## Build

- **O que o build baixa é conferido.** A tag do CORE tem de ser do commit `75b8c9d…`, e o js-yaml (código que roda no
  build) tem de ter o SHA-256 registrado em `build/conteudo.mjs`. Qualquer diferença para o build sem executar nada.
- **Versões exatas:** `@foundryvtt/foundryvtt-cli@1.1.0` e `eslint@10.12.0`.

## Segurança

- **Instalar** só num Foundry 14 (o `instalar.mjs` confere), e nunca na mesa do servidor.
- **Testes** usam só a pasta descartável `%LOCALAPPDATA%\FieldbookTeste`; da pasta do Foundry do PC sai só a licença.
- **Git:** sem push nem publicação. Commits no branch `sistema-v14`.
