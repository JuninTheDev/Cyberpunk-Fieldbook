# Integrar a revisão de 2026-10-12 (branch `revisao-v14`) na `sistema-v14`

Para a sessão que desenvolve a `sistema-v14` (os ciclos 16 a 30 em diante). Apague este arquivo depois de integrar.

## O que é

A revisão foi feita para o plano da migração da mesa para o Foundry 14. Ela partiu da `sistema-v14` no ciclo 15
(`b58df95`), antes dos ciclos 16 a 30, e tem dois commits:

- **`edd0624`, mescla do master:** traz o Mission Kit, o Black Chrome, o visual novo, os backups do servidor e a trava do
  "ator antigo" na wiki.
  - O conflito em `servidor/atualizar.sh` já está resolvido: o gatilho do módulo do Foundry 12 ficou com os arquivos novos
    do master (`campanha-base.js` e a base da campanha) e com o filtro do `foundry-sistema/`.
- **`3a73abd`, o "ciclo 16" da revisão:** não é o ciclo 16 de vocês. Ao integrar, registre-o como o próximo ciclo.

Ao mesclar `revisao-v14` em cima do ciclo 30, conflitam 8 arquivos:
- `MIGRATION_STATUS.md`, `README.md` e `ROADMAP.md`;
- `build/conteudo-2077.mjs`, `dados/catalogo.json` e `scripts/dados.mjs`;
- `tests/cenarios/v14.js` e `tests/sistema/regras.test.mjs`.

O resto mescla sozinho.

## Arquivo por arquivo

1. **`build/conteudo-2077.mjs`:** reescrito para o Mission Kit, espelhando o build do cpr-2077 no master
   (`foundry-2077/build/armas.mjs`, `cyberware.mjs` e `net.mjs`). Conflita com os ciclos 17 e 18 (os modos e as regras
   de cada arma).
   - **Dados das armas:** a wiki do master traz as regras de cada arma do Kit em `raw.regras` e a origem em `raw.origem`
     (`'kit'` ou `'fa'`). A revisão guarda as chaves de `REGRAS` na flag `arma2077`, como o cpr-2077. Se o ciclo 18 lia as
     regras do texto, prefira `raw.regras`.
   - **Slots e munição:** a arma comum tem 1 slot de acessório (o Rebuild ocupa 2 de 3). A munição de cada arma segue as
     regras novas: `soCartucho`, balote e cartucho, pistola muito pesada.
   - **Itens novos:**
     - os 3 Rebuilds (upgrades de 2 slots, 1.000eb);
     - as 9 munições Smart melhorada (o molde é a munição do CORE do calibre);
     - a categoria `Neuroport (base)` (base de 5 slots);
     - a droga Immunoblockers (tipo `droga`, prefixo `cyberware-2077:`);
     - os quickhacks do Kit, sem preço.
   - **Flechettes:** saíram, porque o Kit não usa.
   - **Regras das classes:** as do Kit mudaram.
     - **Power:** +5 de dano na lesão crítica, e o Ricochete a −4.
     - **Smart:** +1, e só dispara conectada pelo Personal Link ou pelo Subdermal Grip.
     - **Tech:** Carregar gasta a Ação de Movimento; carregada, faz CDT 1, atravessa cobertura fina e ignora metade do SP.

     Os modos dos ciclos 17 e 18 precisam seguir o Kit. O `foundry-2077/scripts/armas2077.mjs` do master tem a
     implementação do Foundry 12.
2. **`build/compendios.mjs`:** os compêndios de 2077 incluem `upgrade` (os Rebuilds) e `droga` (a Immunoblockers).
3. **`dados/catalogo.json` e `scripts/gerado.mjs`:** não junte à mão. Depois de resolver o resto, rode
   `node build/conteudo.mjs` e `node build/compendios.mjs`. A revisão gerou 704 itens, 168 deles de 2077.
4. **`scripts/dados.mjs` e `scripts/regras.mjs`, o Editor de Dor:** a linha é
   `this.penalidade = regras.penalidadeDoFerimento(this.ferimento, this.bonus.supressaoDeDor)`.
   - O Editor tira só o −2 de gravemente ferido; o −4 de mortalmente ferido continua.
   - Fontes: a wiki ("Pain Editor: Ignora penalidades de Seriously Wounded") e o CORE (`getWoundStateMods`).
5. **`scripts/documentos.mjs`:** `desinstalarCyberware` não devolve a Humanidade.
   - O máximo volta a subir; a Humanidade perdida, só com terapia.
   - Fontes: a wiki ("Humanidade, terapia e drogas") e o CORE (`uninstallCyberware`).
6. **`scripts/wiki.mjs`:**
   - **Endereço da wiki:** `enderecoPadraoDaWiki` deduz `mesa.X → wiki.X`, e a configuração `wikiUrl` vem vazia.
   - **Ator antigo:** a wiki responde 409 desde o master `30692f7`.
     - `entregarPedido` manda o `ator`;
     - `entregarPedidos` entrega só pelo ator ligado (`resumo.foundry.ator`), mesmo com uma cópia antiga no mundo;
     - `mandarAgora` para de mandar a ficha recusada como "ator antigo", sem aviso, porque o G4 pega avisos.

     Se a janela "Personagens da wiki" (o ciclo 16 de vocês) também entrega pedidos, aplique a mesma regra nela.
7. **`tests/sistema/regras.test.mjs`:**
   - **Testes novos:** o Editor de Dor, o endereço padrão da wiki, "a loja inteira: o que falta é só o Black Chrome" e os
     itens do Mission Kit.
   - **Ajustes:** 157 itens de 2077, 35 acessórios (com os Rebuilds), e as drogas contadas só do CORE.
8. **`tests/cenarios/v14.js`:** esta parte **não rodou**, porque o PC da revisão não tem Foundry 14.
   - os compêndios de 2077 com 58, 62 e 48 itens (recalcule depois do build);
   - a Yukimura com bônus 0, porque no Kit ela é de qualidade padrão;
   - um passo novo, o do desinstalar, que devolve o estado de antes.
9. **`eslint.config.mjs`:** o lint cobre `foundry-sistema/migracao/`.
10. **`migracao/pacote-das-cenas.mjs`:** é novo e não conflita.
    - Gera um módulo `arquivo-da-mesa` com as cenas, os diários e as playlists de um mundo do Foundry 12 numa Aventura,
      mais os arquivos que elas usam.
    - Foi testado com o mundo real: 13 cenas, 48 arquivos.
    - Foi importado no Foundry 12 do laboratório sem erro. No Foundry 14, ainda não.
11. **README, ROADMAP e MIGRATION_STATUS:**
    - o registro "Ciclo 16 (2026-10-12)" da revisão vira o próximo ciclo de vocês;
    - o resto entra: o Black Chrome pendente, as duas correções de regra e o procedimento da migração com o backup
      completo e o pacote das cenas.

## Depois de juntar

1. Mescle o master de novo: depois da revisão entrou o `32f9c7b` (o `atualizar-modulo.sh` extrai o CORE de novo quando o
   extrator muda).
2. Rode G1, G2, G3, o G4 (`node tests/rodar.js v14`) e o G5.
3. Apague este arquivo.
