# Validação durante o trabalho em paralelo

Use Node.js 24, sem instalar dependências:

```powershell
node tests/validar.js
```

O comando retorna código 0 quando tudo passa e 1 se alguma verificação falha. Para ver cada detalhe,
use `$env:DETALHES=1`. Também é possível escolher grupos:

```powershell
node tests/validar.js sintaxe
node tests/validar.js documentos base
node tests/validar.js regressoes
node --test tests/isolados/api.test.js
```

| Grupo | O que verifica |
| --- | --- |
| `sintaxe` | JavaScript e módulos, JSON e manifesto, scripts executáveis embutidos nos HTMLs. Só analisa a sintaxe; não executa esses scripts. |
| `documentos` | Termos, acentos, perícias, arquivos citados, links de seção e fichas, handouts e documentos registrados na wiki. |
| `base` | Registros da campanha, citações, fichas, mapa e texto que alimenta os atores do elenco. |
| `regressoes` | Casos isolados da API e dos próprios validadores, incluindo cookies malformados, autoria da ficha, conflito de versões e referências entre campanhas; também as duas Roles, seus controles de criação e a importação/sincronização com mocks do Foundry. |

A descoberta de fontes inclui arquivos novos, mesmo antes de adicioná-los ao Git. Bibliotecas de terceiros,
caches, compêndios gerados, exemplos de design, ícones e dados locais das contas/personagens ficam fora
da checagem de sintaxe. Links simbólicos não são percorridos. Os blocos de dados dos HTMLs exportados
(`__bundler/*`, por exemplo) não são tratados como JavaScript.

As verificações de documentos e base são as mesmas usadas em `tests/cenarios/documentos.js` e
`tests/cenarios/base.js`. Seus carregamentos de dados da wiki usam contextos próprios de `vm`, sem
alterar `global.window` ou `global.document` dos outros cenários. Nomes de documento sem diretório
são resolvidos primeiro na campanha de origem e depois em `night-city`; a biblioteca `night-city`
preserva referências antigas a campanhas somente quando o nome tem um único destino.

Nas regressões da API, `tests/lib/servidor-isolado.js` carrega o atendimento real de `server.js` e os
módulos reais da API. Substitui apenas o transporte HTTP, a consulta ao Git e o início de processos.
As requisições são streams em memória. Cada instância recebe uma pasta temporária criada para ela,
removida ao terminar. Não usa dados locais dos jogadores, portas, Edge, Foundry ou serviços externos.

Essas verificações não cobrem renderização, comportamento visual, transporte HTTP real nem integração
com o Foundry. Para esses casos, use a suíte de navegador já existente:

```powershell
node tests/rodar.js
```

Combine uma rodada por vez com as outras sessões: essa suíte compartilha portas 8765 a 8774,
portas de depuração do Edge a partir de 9340 e `%LOCALAPPDATA%\FieldbookTeste\foundry` entre worktrees.
Uma worktree separada, por si só, não isola esses recursos. O novo comando não altera esse runner.

## Conferência das duas Roles no navegador

```powershell
node --test tests/ui/roles.test.js
```

Este teste opcional usa o Edge instalado no Windows. Cria um perfil temporário próprio e pede ao sistema
portas livres para HTTP e DevTools. Não usa as portas ou a pasta do Foundry dos testes antigos. Confere
seleção da segunda Role, Rank, distribuição de habilidade, gravação na API, ficha e largura de celular.
Fecha o navegador pelo seu próprio endereço de depuração e remove apenas o perfil e os dados que criou.
Não faz parte de `node tests/validar.js`, que continua sem navegador ou portas.

## Conferência do Cyberware no navegador

```powershell
node --test tests/ui/cyberware.test.js
```

Usa o mesmo isolamento de portas e dados, com perfil exclusivo no Edge. Confere a compra por local,
a montagem por base, a gravação e os lados exibidos na ficha, além da largura em computador e celular.
As capturas de revisão visual ficam em `tests/.saida/`, fora do versionamento.
