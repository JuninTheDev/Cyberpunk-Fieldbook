# Instruções para os agentes de IA (Codex, Claude Code)

Valem para qualquer agente neste repositório. O `CLAUDE.md` só importa este arquivo: uma fonte só, para as duas IAs não
lerem regras diferentes. Mudou uma regra aqui, mudou para todas.

## O repositório

- **`master`:** a wiki (o site do Night City Fieldbook) e o servidor. É do usuário: nenhum agente commita nele.
- **`sistema-v14`:** o sistema próprio do Cyberpunk RED para o Foundry 14 (`foundry-sistema/`) e os testes (`tests/`).
  Todo o trabalho dos agentes é aqui.
- **Os documentos do sistema** (leia antes de começar):
  - `foundry-sistema/ROADMAP.md`: o plano, os itens C1 a C28;
  - `foundry-sistema/QUALITY_GATES.md`: os portões e as lições dos ciclos;
  - `foundry-sistema/MIGRATION_STATUS.md`: o registro de cada ciclo e as dúvidas abertas;
  - `foundry-sistema/README.md`: o que o sistema faz.

## As sessões

- **Quem trabalha:**
  - **KouArt:** o Claude Code, numa worktree própria neste PC;
  - **Junin:** em outro PC;
  - **Codex:** um clone próprio neste PC (`C:\Users\gu774\Documents\GitHub\Cyberpunk-Fieldbook-codex`).
- **Uma pasta por sessão.** Nunca duas sessões na mesma pasta, e nenhuma na pasta do usuário (a do master).
- **A divisão é por item do ROADMAP, não por tipo de trabalho.** Quem pega um item faz o ciclo inteiro dele: o código,
  os testes, as mutações, a documentação e o push.
- **A NET (C8 e C9) é da sessão KouArt.** A sessão Codex pega itens fora da NET.
- **Pegar um item** (o protocolo do ROADMAP, "Duas sessões no mesmo plano"):
  1. `git pull`;
  2. marque o item `[~] em andamento (sessão Codex, AAAA-MM-DD)`;
  3. commite e faça o push antes de começar.
- **Não pegue um `[~]` de outra sessão** sem combinar com o usuário.

## O ciclo

1. **Examinar:** o que o CORE 0.92.4 faz (o código dele é a referência de comportamento) e o que a wiki diz (a fonte das
   regras: os `system-*.js` da raiz).
2. **O comportamento esperado e o teste de referência:**
   - a regra pura vai num teste do G3 (`tests/sistema/*.test.mjs`), com o valor esperado;
   - o que roda no Foundry vai num passo do G4 (`tests/cenarios/v14.js`), lendo o estado depois e conferindo no `ok`.
3. **A menor mudança** que faz o teste passar, no estilo do código ao redor: os nomes, os comentários e os textos em
   português.
4. **Os portões G1 a G4** (abaixo).
5. **As mutações:** para cada comportamento novo, quebre o código de propósito (uma mutação por vez) e confira que algum
   teste falha. Se a mutação sobrevive, o teste está fraco: reforce o teste, nunca o contrário. Os arquivos voltam
   exatamente como estavam (confira pelo md5).
6. **O diff:** só o que o item pede.
7. **A documentação:**
   - o README (o que o sistema faz agora);
   - o ROADMAP (`[x]` com o número do ciclo);
   - o MIGRATION_STATUS (o registro do ciclo, no formato dos anteriores);
   - o QUALITY_GATES (a lição, quando houver).
8. **`git fetch`, commit e push na `sistema-v14`, no fim de cada ciclo.** O número do ciclo segue o MIGRATION_STATUS. Se
   outra sessão já publicou o mesmo número, ela fica com ele, e o seu passa para o seguinte. Num conflito no ROADMAP ou no
   MIGRATION_STATUS, junte as duas versões: nada se apaga.

## Os portões

Rode da raiz do clone.

- **G1, sintaxe:** `node --check` em cada `.mjs` de `foundry-sistema/` (com as subpastas, sem `.cache/` e `packs/`), nos
  de `tests/sistema/`, no `tests/lib/foundry14.js`, no `tests/lib/trava.js` e no `tests/cenarios/v14.js`.
- **G2, lint:** `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/lib/trava.js tests/cenarios/v14.js`.
- **G3, regras:** `node --test "tests/sistema/*.test.mjs"`. São 4 falhas conhecidas, as das armas de 2077.
- **G4, Foundry 14:** `node tests/rodar.js v14`. São 5 falhas conhecidas, listadas no QUALITY_GATES.
- **O que conta como falha:** qualquer falha fora das conhecidas segura o commit. E uma falha conhecida não se tira nem se
  muda para passar.
- **O build** (`node build/conteudo.mjs`) gera `dados/catalogo.json` e `scripts/gerado.mjs`. Ele precisa do CORE
  extraído em `foundry-sistema/.cache/cpr-core-v0.92.4/src`, que fica fora do git.

## O G4 neste PC

- **O G4 usa coisas que as sessões dividem:**
  - o Foundry 14 instalado e a pasta descartável `%LOCALAPPDATA%\FieldbookTeste`;
  - a porta 31014 e as portas do Edge, a partir da 9340;
  - dois Edge sem janela.
- **Só um teste com navegador por vez.** O `tests/rodar.js` pega a trava (`%LOCALAPPDATA%\FieldbookTeste\testes.trava`,
  pelo `tests/lib/trava.js`). Se outro teste a tem, ele avisa ("Outro teste está rodando") e espera.
  - Não apague a trava de um teste vivo.
  - A de um teste interrompido vale como solta sozinha.
- **Não mexa nos arquivos do clone** enquanto o G4 ou as mutações rodam: cada rodada lê os arquivos de novo.
- **Com gente na mesa do servidor, o G4 pula a parte do Foundry.** A licença do Foundry vale para uma mesa por vez:
  - o resultado diz "parte do Foundry pulada" e "Tudo certo" com 5 passos, e não vale como portão;
  - espere a mesa esvaziar e rode de novo;
  - não contorne a checagem.
- **Se um G4 é interrompido no meio,** pare o que ele deixou rodando antes de começar outro:
  - o `node tests/rodar.js`;
  - o Foundry com `--dataPath=...FieldbookTeste...`;
  - os Edge com o perfil `wiki-testes-edge-*` (apague também esse perfil temporário).

## Nunca

- **A campanha real e o Foundry 12 da mesa.** Os módulos `foundry-fluxo-de-combate`, `foundry-net-architect`,
  `foundry-painel-tatico` e `foundry-2077` são do Foundry 12 da mesa: servem de referência, não se mexem.
- **O servidor:**
  - só o Foundry 14 da mesa nova, pelo `servidor/instalar-sistema-v14.sh`;
  - só quando o usuário pedir.
- **Publicar:** `publicar.ps1`, `publicar.bat`, `atualizar-modulo.bat` e `abrir-online.*` são do usuário.
- **As fontes das regras:**
  - os arquivos de regra da wiki (`system-rules.js`, `system-2077.js`, `system-net.js`, `system-criacao.js` e os outros
    `system-*.js`) não se mudam para um teste passar;
  - regra nova só com a fonte (a página da wiki ou o código do CORE) e um teste de referência;
  - uma dúvida sobre a regra vai para o MIGRATION_STATUS ("Dúvidas") e para o usuário.
- **Os testes:** nenhum teste se tira nem se afrouxa para passar.
- **Os testes fora da pasta descartável:** eles só usam `%LOCALAPPDATA%\FieldbookTeste`.
- **O `sed -i`:** ele troca o CRLF por LF. Edite com a ferramenta de edição ou com um script do Node. Mantenha o final de
  linha que cada arquivo tem e confira no diff: o diff de um arquivo inteiro, numa mudança pequena, é o sinal.
