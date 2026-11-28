# O inventário em grade, o mesmo na wiki e no Foundry 14 (o plano)

Pedido do usuário (2026-11-28): um inventário de quadrados, como os de jogo, em que o jogador organiza o que carrega. Os
itens do personagem aparecem iguais na wiki e no Foundry, e o que se mexe num lado muda no outro.

Base lida: `origin/master` b69a9c6c (a pasta do usuário estava 86 commits atrás). O usuário aprovou em
2026-11-28 ("Sim, comece"), e os itens C107 a C114 estão no ROADMAP. O C107 foi feito no ciclo 231.

## 1. O resumo

- **Um módulo só, em três lugares.** As regras da grade (o que cabe, o que colide, girar, pilhas, o uso que cada lugar dá)
  ficam num arquivo puro do sistema, `foundry-sistema/scripts/compartilhado/regras-grade.mjs`. O Foundry usa, o servidor
  da wiki usa (para conferir o pedido do jogador) e a página da wiki usa. A tela da grade também é uma só
  (`compartilhado/grade-ui.mjs`), sem framework, que a ficha do Foundry e a página da wiki embrulham.
- **O lugar na grade decide o uso.** O sistema já tem `equipado`, `carregando` e `guardado` (`config.mjs`, `USOS`). O
  corpo é o equipado; os bolsos, o cinto e a mochila são o carregando; o esconderijo da moradia e o porta-malas são o
  guardado. Nenhuma regra de combate muda: elas continuam lendo o uso.
- **A mesa continua mandando, e a wiki pede.** O que o jogador mexe na wiki vira uma operação ("mover a pistola para o
  cinto, x 2, y 0") numa fila no servidor da wiki. O Foundry aberto recebe na hora (SSE), confere, aplica e confirma. Com
  o Foundry fechado, a fila espera, e a wiki mostra o estado já com as mudanças pendentes.

## 2. O que existe hoje

| Caminho | Arquivo | Como funciona |
|---|---|---|
| Wiki → Foundry, na importação | `foundry-sistema/scripts/wiki.mjs` (importar) | O mestre importa; cada item ganha a flag `wikiUid`. Depois disso a wiki trava `itens` e `montagem` (`LOCKED_AFTER_IMPORT`, `api-personagens.js:300`). |
| Foundry → wiki, o "Na mesa" | `wiki.mjs`, `fichaParaAWiki` e `registrarVoltaParaWiki` | A cada `createItem`/`updateItem`/`deleteItem`/`updateActor`, o mestre ativo manda a ficha inteira 4 s depois (`PUT /api/personagens/:id/mesa`). A wiki guarda em `doc.mesa` e desenha pelo `tableModel` (`criador.js:1090`). Só lê. |
| Wiki → Foundry, os pedidos da loja | `wiki.mjs`, `entregarPedidos` | O jogador pede, o mestre aprova, e o mestre ativo entrega a cada 60 s, com o uid `pedido:<id>:<n>` para não criar em dobro. |
| Entre fichas no Foundry | `conteiner.mjs`, `levarItem` | O CORE: arrastar entre atores, o saque e o esconderijo, com a fila `naFilaDoInventario` (`pilhas.mjs`). |
| Tempo real na wiki | `api-netwire.js:111`, `netwire.js:96` | Já há SSE no servidor (o NetWire); o padrão serve aqui. |

O que falta para o pedido: **posição** (nada guarda onde o item está), **tamanho** (nenhum item tem), **o caminho de
volta** (a wiki não muda nada no Foundry depois da importação, fora os pedidos) e a **velocidade** (a volta do Foundry
espera 4 s e manda a ficha inteira; os pedidos esperam até 60 s).

O RED não tem peso nem carga. A grade é regra da casa: o espaço é o limite.

## 3. A grade

### 3.1 Os lugares

Cada personagem tem estes lugares. Os tamanhos foram aceitos para começar e se ajustam depois da primeira sessão (decisão 3).

| Lugar | Uso | Tamanho | De onde vem |
|---|---|---|---|
| **Corpo** (não é grade: são encaixes) | equipado | mão principal, mão secundária, cabeça (armadura), corpo (armadura), cyberdeck ativo, roupa | Sempre. A arma de duas mãos ocupa as duas mãos (`maosDaArma`, `documentos.mjs`). |
| **Coldre** | carregando | 1 encaixe, arma de uma mão | Sempre. |
| **Costas** | carregando | 1 encaixe, arma de ombro ou pesada | Sempre. |
| **Bolsos** | carregando | 4×2 | Sempre (a roupa do corpo). |
| **Cinto** | carregando | 6×1 | Sempre; só munição, granada, droga e o que tiver 1 de altura. |
| **Mochila** | carregando | P 4×4, M 6×5, G 8×6 | O item Carryall (20eb, "de bolsa carteiro a mochilão") no corpo. Sem ele, não há mochila. |
| **Esconderijo** | guardado | pela moradia: rua 0, cápsula 4×3, contêiner 10×6, quitinete 8×6, dois quartos 10×8, conapt 12×8, cobertura 12×10 | A moradia do personagem (`system-criacao.js`, `moradias`; no sistema, `moradiaDaMesa`). |
| **Porta-malas** | guardado | pelo tipo do veículo (moto 4×2, carro 8×4, van 10×8…; a tabela no C107) | Cada veículo do personagem (`regras-veiculos.mjs`, o `tipo`). |
| **Para organizar** | o que o item já tinha | sem limite, fora da grade | O que chegou e não coube (pedido da loja, saque, importação, mochila tirada). Nada some: o item fica aqui até alguém arrumar, e a ficha avisa. |

O cyberware instalado e o programa no deck não aparecem na grade: já têm a aba Cyberware e o deck. O veículo também
não: ele é um lugar (o porta-malas), não um item.

### 3.2 Os tamanhos

Uma tabela por categoria, com exceção por item no catálogo (`grade: { l, a, pilha }` em `dados/`). O G3 confere que todo
item do catálogo tem tamanho.

| Categoria | Tamanho (largura × altura) |
|---|---|
| Pistola leve e média | 2×1 |
| Pistola pesada e muito pesada, SMG | 2×2 |
| SMG pesada | 3×2 |
| Escopeta, arco, besta, lança-granadas | 4×2 |
| Rifle de assalto | 5×2 |
| Rifle de precisão, lança-foguetes | 6×2 |
| Arma branca leve, média, pesada, muito pesada | 1×2, 1×3, 1×4, 2×4 |
| Granada | 1×1, pilha de 4 |
| Munição | 1×1; pilha por quadrado: 30 de pistola e SMG, 20 de rifle, 10 de escopeta e precisão, 1 foguete (2×1) |
| Droga e remédio | 1×1, pilha de 10 |
| Agent, chip de programa solto, equipamento pequeno | 1×1 |
| Cyberdeck, equipamento médio | 2×2 |
| Equipamento grande | 3×3 |
| Armadura guardada: leve, média, pesada | 3×3, 3×4, 4×4 |
| Roupa guardada | 2×2 |
| Cyberware sem instalar: opção, base de membro | 1×1, 2×4 |

### 3.3 Como se mexe

- **Arrastar** (mouse e dedo, pelos Pointer Events), com a sombra verde onde cabe e vermelha onde não cabe.
- **Girar:** a tecla R durante o arraste, ou o botão de girar no toque longo.
- **No celular:** tocar no item e tocar no destino (o arraste de dedo em tela pequena erra muito).
- **Pelo teclado:** as setas andam, Enter pega e solta, R gira (acessibilidade, como o resto da ficha).
- **Pilhas:** soltar uma pilha na outra junta (`mesmaPilha`, `regras-inventario.mjs`); Shift (ou o botão "Dividir")
  pergunta quanto (`divisaoDaPilha`). A pilha cheia não junta além do limite do quadrado.
- **Arrumar sozinho:** um botão por lugar, que reorganiza do maior para o menor (sempre o mesmo resultado para os
  mesmos itens). É o mesmo algoritmo da migração.

## 4. Os dados

- **No Foundry, na flag do item:** `flags.cpr-fieldbook.grade = { lugar, x, y, girado, rev }`.
  - `lugar`: `corpo:maoPrincipal`, `coldre`, `bolsos`, `cinto`, `mochila`, `esconderijo`, `veiculo:<id do item>`,
    `organizar`.
  - `rev`: um contador que sobe a cada mudança de lugar do item, de quem quer que seja.
  - No ator: `flags.cpr-fieldbook.inventario = { seq }`, a última operação da wiki aplicada (para não aplicar duas vezes,
    como o uid dos pedidos).
- **No "Na mesa":** cada linha de `fichaParaAWiki(ator).itens` ganha `grade` e `tamanho`, e a ficha ganha `lugares` (os
  lugares do personagem e o tamanho de cada um) e `emCombate`.
- **Na wiki, a fila:** um arquivo por personagem, `personagens/inventario/<id>.json`, gravado pela fila `update()` (como
  as outras rotas do `api-personagens.js`: ler o corpo antes, mudar dentro). Não muda a `versao` do personagem, como as anotações.
  - Cada operação: `{ id, seq, autor, quando, tipo, item, base, para, qtd, estado, motivo }`.
  - `tipo`: `mover` (equipar e guardar são mover para o lugar certo), `girar`, `dividir`, `juntar`.
  - `estado`: `pendente`, `aplicada` ou `recusada` (com o `motivo`, que a wiki mostra). As aplicadas e recusadas saem
    da fila depois de 24 h.

## 5. A sincronia

### 5.1 Do Foundry para a wiki

1. O jogador ou o mestre arrasta na ficha do Foundry. O item ganha a `grade` nova e o `rev + 1`.
2. O mestre ativo manda só o inventário (`PUT /api/personagens/:id/inventario/estado`), 500 ms depois da última mudança,
   sem esperar os 4 s da ficha inteira. A ficha inteira continua indo como hoje.
3. O servidor da wiki guarda em `doc.mesa` e avisa a página aberta pelo SSE. Meta: menos de 2 s.

### 5.2 Da wiki para o Foundry

1. O jogador arrasta na wiki. A página confere com `regras-grade.mjs` e mostra o item já no lugar novo, marcado
   "pendente".
2. A página manda a operação (`POST /api/personagens/:id/inventario/ops`). O servidor confere de novo, com o mesmo
   arquivo, contra o estado projetado (o "Na mesa" mais as pendentes). Sem dono, recusa (403); fora das regras, recusa
   (409). Nunca confie na página.
3. O servidor avisa o Foundry pelo SSE (`/api/inventario/eventos?campanha=…`, com o cookie do mestre, como o resto do
   `wikiFetch`). Sem SSE (rede ruim), o Foundry pergunta a cada 15 s.
4. Quem aplica no Foundry (5.4) confere com as regras e com o estado real do ator:
   - o item ainda existe e o `rev` é o mesmo da `base`: aplica;
   - o `rev` mudou, mas o destino continua livre: aplica por cima (o item foi mexido, mas o pedido ainda faz sentido);
   - senão: recusa, com o motivo ("a pistola mudou na mesa", "o cinto está cheio").
5. Confirma (`POST …/ops/:id/aplicada` ou `/recusada`), grava o `seq` no ator, e a volta de 5.1 leva o estado novo. A
   página tira o "pendente" ou desfaz o movimento com o aviso.

### 5.3 Com o Foundry fechado

A maior parte do tempo, entre as sessões, ninguém está no Foundry. A wiki aceita as operações, guarda na fila e mostra o
estado projetado, com o aviso "A mesa está fechada: as mudanças entram quando o mundo abrir". Quando o mestre abre o
mundo, o Foundry esvazia a fila na ordem do `seq`. Como ninguém mexe no Foundry fechado, o conflito é raro. Teto de 200
operações pendentes por personagem.

### 5.4 Quem aplica no Foundry

- **Fase 1:** só o mestre ativo, como os pedidos (`souOMestreAtivo`).
- **Fase 2 (C114):** sem o mestre, o primeiro jogador dono do ator que estiver conectado (o de menor id, para não serem
  dois). No navegador do jogador, o `wikiFetch` vai com o cookie dele, e a wiki aceita a confirmação só do dono.

### 5.5 Os conflitos

A mesa ganha. O `rev` de cada item decide; a operação que perde volta para o jogador com o motivo. Ninguém perde item:
no pior caso, ele vai para "Para organizar".

## 6. O código compartilhado

- `foundry-sistema/scripts/compartilhado/regras-grade.mjs` (puro, sem `game`, sem DOM): `cabe`, `colide`, `girar`,
  `lugaresDoPersonagem`, `usoDoLugar`, `tamanhoDoItem`, `arrumar`, `aplicarOperacao`, `projetar(estado, ops)`,
  `conferirOperacao` (o motivo da recusa em português).
- `foundry-sistema/scripts/compartilhado/grade-ui.mjs` (DOM, sem framework): desenha e devolve intenções
  (`onIntencao(op)`); as cores por variáveis CSS, para o tema do Foundry e o visual 2077 da wiki.
- **No Foundry:** importa direto. O `instalar.mjs` já copia `scripts/`; conferir se a subpasta entra.
- **No servidor da wiki:** `api-inventario.js` carrega com `import()` (o servidor é CommonJS; o `import()` dinâmico vale
  no Node 20 do servidor).
- **Na página da wiki:** uma rota que serve só a pasta `compartilhado/` (`/sistema/compartilhado/*.mjs`), carregada por
  `<script type="module">`, e o `sw.js` guarda para o modo offline.

Assim a regra que a página usa para mostrar, a que o servidor usa para aceitar e a que o Foundry usa para aplicar são o
mesmo arquivo, e o G3 testa as três de uma vez.

## 7. As telas

- **Foundry:** uma aba "Inventário" na ficha do personagem (`ficha-personagem.mjs`), com o corpo à esquerda (os
  encaixes) e os lugares à direita. As listas de hoje ficam, atrás de um botão "Grade / Lista", porque o mestre às vezes
  quer só procurar. A ficha do contêiner (`ficha-conteiner.mjs`, o saque e o esconderijo do mundo) ganha a grade, e
  arrastar dela para o personagem usa o `levarItem` de sempre, com a posição de destino.
- **Wiki:** a aba "Inventário" na página do personagem, para o dono e para o mestre, com o mesmo desenho, no visual da
  wiki. No celular, os lugares viram abas (Corpo, Bolsos e cinto, Mochila, Esconderijo, Veículos).
- **O selo do estado:** "Na mesa agora" (o Foundry confirmou há pouco), "A mesa está fechada" ou "Pendente (3)".

## 8. As travas

- **Em combate** (o ator num combate ativo no Foundry, o `emCombate` da ficha): a wiki recusa as mudanças de uso (sacar e
  guardar arma custam Ação na mesa). Mudar de lugar dentro do mesmo uso continua valendo.
- **Esconderijo e porta-malas pela wiki:** trocar entre o corpo e o esconderijo é ir para casa. Pela wiki, só com o
  Foundry fechado (entre as sessões); durante a sessão, na mesa (decisão 6).
- **O que a wiki não faz:** apagar, dar a outro personagem, usar droga, recarregar. Isso mexe em regra e fica no Foundry.
- **O que não vaza:** as flags só do mestre (a nota do mestre da arma) continuam fora da ficha que vai para a wiki. O
  item do mundo que o mestre ainda não entregou não aparece.
- **O Foundry 12 e o cpr-2077:** nada disto passa por eles. Só a geração 14.

## 9. Os itens (provisórios)

Cada um é um ciclo inteiro (código, testes, mutações, documentação), no protocolo do AGENTS.md. As partes da wiki
(páginas, `server.js`, `api-*.js`) são do usuário: este pedido autoriza, mas cada fase que mexe na wiki se confirma com ele
antes.

| Item | O quê | Testes |
|---|---|---|
| **C107** | As decisões (seção 10) e as tabelas: os tamanhos por categoria, as exceções do catálogo, os lugares por moradia e por veículo. O `regras-grade.mjs` puro. | G3 `grade.test.mjs`: cabe, colide, borda, girar, pilha, dividir, juntar, o uso de cada lugar, `arrumar` sempre igual, todo item do catálogo com tamanho. |
| **C108** | A grade no ator: a flag, o `rev`, o uso que segue o lugar (mover para o corpo equipa, com a conferência das mãos), "Para organizar". A migração (numerada, como a 9 e a 10): todo ator ganha lugar pelo `arrumar`, sem mudar o uso. | G3 da migração; G4: um ator antigo abre arrumado, com o mesmo uso. |
| **C109** | A aba Inventário no Foundry, o `grade-ui.mjs`, o contêiner e o saque com a grade, o arrastar entre fichas com posição. | G4: arrastar muda a flag e o uso; girar; dividir; o item que não cabe vai para "Para organizar". |
| **C110** | A volta rápida para a wiki (`/inventario/estado`), a `grade` e os `lugares` no "Na mesa", e a grade só de leitura na wiki. | G4: mexer no Foundry e ver a wiki mudar em menos de 2 s. |
| **C111** | O caminho da wiki para o Foundry: `api-inventario.js` (a fila, a conferência no servidor, o SSE), o Foundry que aplica, confirma e recusa. | Cenário da wiki para a API (dono, não dono, regra quebrada, teto da fila); G4: operação aplicada, operação recusada pelo `rev`, aplicada duas vezes só uma. |
| **C112** | A grade que se mexe na wiki: o estado projetado, o "pendente", a recusa que volta com o motivo, o celular e o teclado. | Cenário da wiki no celular (375 px); G4 de ponta a ponta. |
| **C113** | O Foundry fechado (a fila esvazia ao abrir), a importação que leva o lugar da montagem e o pedido da loja que chega em "Para organizar". | G4: fila com o Foundry fechado, abrir, conferir a ordem. |
| **C114** | Quem aplica sem o mestre (o jogador dono), a trava do combate e a do esconderijo. | G4 com o jogador sozinho; G4 em combate. |

Cerca de oito ciclos. A ordem permite parar no C110 com algo útil (a grade no Foundry e a wiki mostrando) antes do
caminho de volta, que é a parte difícil.

## 10. As decisões do usuário

**Decidido em 2026-11-28 ("Aceito todas"): as 10 recomendações abaixo.** Fica em aberto só o preço da mochila M e da
G (decisão 4), que o mestre diz no C107.

1. **A grade é limite de verdade?** Recomendo que sim, sem peso: o que não cabe vai para "Para organizar", sem penalidade,
   e o mestre resolve na história.
2. **Penalidade por carregar demais?** Recomendo nenhuma agora (o RED não tem). Dá para pôr depois, lendo "Para
   organizar" cheio.
3. **Os tamanhos e os lugares das tabelas 3.1 e 3.2?** Recomendo começar com elas e ajustar depois da primeira sessão.
4. **A mochila:** o Carryall vira três tamanhos na loja (P, M, G, com preços diferentes) ou um só? Recomendo três, com
   o preço de 20eb no P e mais nos outros (o mestre diz quanto).
5. **O que o jogador faz pela wiki:** mover, girar, equipar, guardar, dividir e juntar. Recomendo que sim, e que apagar,
   dar, usar e recarregar fiquem só no Foundry.
6. **O esconderijo e o porta-malas pela wiki:** só com a mesa fechada? Recomendo que sim.
7. **Em combate, a wiki trava as mudanças de uso?** Recomendo que sim.
8. **Sem o mestre conectado, o Foundry do jogador aplica as mudanças da wiki?** Recomendo que sim, no C114.
9. **No conflito, a mesa ganha?** Recomendo que sim.
10. **O personagem antes da importação** (ainda no criador) também tem grade? Recomendo que sim, no C113, guardada na
    montagem e levada na importação.

## 11. Os riscos

- **O SSE atrás do proxy:** o servidor fecha conexão parada; o batimento a cada 30 s (como o NetWire) e a pergunta a cada
  15 s como reserva.
- **O servidor de 1 GB:** poucas conexões SSE (o mestre e os jogadores com a página aberta); o arquivo da fila é pequeno.
- **Duas pessoas mexendo ao mesmo tempo:** o `rev` e a fila do inventário no Foundry (`naFilaDoInventario`) resolvem; o
  G4 testa os dois lados no mesmo item.
- **A ficha do Foundry pesada:** muitos itens na grade (o esconderijo de 12×10). Desenhar só o lugar aberto.
- **O OneDrive e a pasta do usuário atrás do master:** trabalhar numa worktree fora do OneDrive, como os outros ciclos.
- **O G4 dividido com as outras sessões:** a trava de sempre; e as quatro instáveis conhecidas do QUALITY_GATES.

## 12. Fora deste plano

- O peso e a carga.
- A troca entre jogadores pela wiki (dar, vender).
- O inventário dos capangas e dos NPCs do mestre.
- O Foundry 12 e a mesa da wiki (descontinuada).
