# Status da migração para o Foundry 14

**Origem:** Foundry 12 com o sistema Cyberpunk RED - CORE 0.92.4 e os módulos da mesa (cpr-2077, Fluxo de Combate, NET
Architect, Painel Tático).

**Destino:** Foundry 14 (verificado no 14.369) com este sistema, `cpr-fieldbook`.

A campanha real continua no Foundry 12, no servidor. Este status é do sistema, não da campanha. Migrar a campanha exige
os bloqueadores abaixo resolvidos, backup e autorização.

## Compatibilidade com o Foundry 14 (evidência)

- **Auditoria de 2026-10-11:** uma sessão no Foundry 14 de teste capturou todos os avisos de compatibilidade e erros, com
  a pilha. Ela passou por fichas (todas as abas e um item de cada tipo), testes, Death Save, tiro, mirado, supressivo com
  parede, combate com turnos, Desfazer e importação de compêndio. Resultado: **0 avisos e 0 erros**. A captura foi
  provada com um aviso de propósito (`CONST.ACTIVE_EFFECT_MODES`).
- **Fora da captura de avisos:** os fluxos com dois navegadores (defesa e dano do jogador) e a importação da wiki. Os
  testes cobrem esses fluxos, mas só pegam erros.
- **APIs do v14 usadas e conferidas no código-fonte da instalação:** `system.changes` e `isSuppressed` nos efeitos;
  `messageMode` nas mensagens; ApplicationV2 nas fichas e janelas; `Die.MODIFIERS`; `measurePath`;
  `polygonBackends.sight.testCollision`; `toggleStatusEffect`.

## O que já foi portado

| De onde | O quê | Estado |
| --- | --- | --- |
| CORE | ficha, atributos, perícias, armas, armaduras, munição, cyberware com efeitos, lesões críticas, tabelas de DV, dano com armadura | portado (conteúdo do CORE 0.92.4 convertido) |
| CORE | Humanidade máxima pelo cyberware | portado no ciclo 1 (10 × EMP, −2 por peça com perda, −4 por borgware) |
| CORE | habilidades de Role com efeito no combate (as do Solo) | falta (ciclo 3) |
| Fluxo de Combate | ataque, defesa às cegas, dano na ficha, mirado, autofogo, supressivo, cartucho, explosivo, Lesão Crítica, Death Save no turno, Desfazer, jogador rolando o dano | portado |
| Fluxo de Combate | quem vê o cartão, texto e animação no token, Reflex Tuner | falta |
| cpr-2077 | importação da wiki | parcial: armas, armaduras, munição e cyberware; o resto vira aviso |
| cpr-2077 | volta da ficha para a wiki, pedidos da loja, crossover entre campanhas, armas de 2077 | falta |
| NET Architect | tudo | falta |
| Painel Tático | tudo | falta |

## Bloqueadores para migrar a campanha

1. **O importador descarta** equipamento, roupas, programas, cyberdeck, drogas, upgrades e veículos (`scripts/wiki.mjs`).
2. **Sem volta da ficha para a wiki:** a wiki pararia de receber o estado da mesa.
3. **Sem migração de dados entre versões do sistema** (ainda não há mundo real para migrar).
4. **Faltam a NET e as armas de 2077,** que a campanha usa.

## Dúvidas de regra e discrepâncias

- **O criador da wiki mostra a Humanidade máxima como EMP × 10** (`humanity()` em criador.js), sem tirar 2 por peça.
  A página de regras da wiki e o CORE tiram. No Foundry 12, o importador antigo corrigia com o `setMaxHumanity()` do
  CORE. Este sistema segue a regra (a página da wiki e o CORE). O criador da wiki fica como está até você decidir.

- **Arma branca contra SP ímpar.** Decidido em 2026-10-11: SP 11 → 6, como o CORE e o Fluxo. A wiki permite a leitura 5.
  Ver o ROADMAP.

## Registro dos ciclos

### Ciclo 0 (2026-10-11): segurança e documentos

- **Implementado:**
  - `servidor/atualizar-modulo.sh` e `servidor/atualizar.sh` ignoram o `foundry-sistema/`;
  - `foundry-sistema/instalar.mjs` só instala num Foundry 14 (`tests/lib/foundry14.js` passa `FOUNDRY_VERSAO`);
  - ROADMAP, QUALITY_GATES e este arquivo.
- **Testes:**
  - `bash -n` nos dois scripts do servidor;
  - simulação do filtro (só `foundry-sistema` não marca o módulo; misturado com um módulo da mesa, marca; o loop pula
    o sistema);
  - trava do instalador em pastas de teste: Foundry 12 recusa (saída 1), sem log recusa (saída 1), Foundry 14 instala,
    pasta atualizada do 12 para o 14 instala, `FOUNDRY_VERSAO=14` instala;
  - G1: 0 erros. G4: 28 de 28.
- **Commits:** `ffb55c2` (servidor) e `f6e3473` (sistema e documentos), no branch `sistema-v14`.

### Ciclo 1 (2026-10-11): Humanidade máxima (P0, regra)

- **Implementado:** `regras.humanidadeMaxima(emp, cyberware)` e o máximo derivado das peças instaladas (`dados.mjs`).
- **Testes:**
  - G3, novo: `tests/sistema/regras.test.mjs`, 2 de 2 (os casos de referência da Humanidade e da EMP);
  - G1: 0 erros;
  - G4: 28 de 28. O Kerenzikov instalado e o Solo de exemplo ficam em 36/48. O Solo importado fica em 43/48: a
    Humanidade é a da wiki, e o máximo perde 2 pela peça com perda (as peças grátis de 2077 não reduzem).
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Ficou:** a discrepância do criador da wiki (acima).
- **Commit:** `a78d8db`.

### Ciclo 2 (2026-10-11): portões de qualidade (P1)

- **Implementado:**
  - G2: ESLint 10.12.0 pelo npx, com `eslint.config.mjs` na raiz (só o sistema e os testes dele);
  - G3: `tests/sistema/regras.test.mjs` com 19 testes. As regras puras saíram do cenário para cá, uma a uma. O
    conteúdo gerado é conferido contra a wiki: as 13 tabelas de DV faixa por faixa, as lesões pelo resultado do 2d6, o
    atributo, o x2 e o nome de cada perícia, e os itens da loja da wiki;
  - G4: o cenário captura avisos e erros com a pilha nos dois navegadores e falha com qualquer um vindo do sistema;
    passo novo da parede no fogo supressivo;
  - build: o commit da tag do CORE e o SHA-256 do js-yaml são conferidos; o foundryvtt-cli fica na 1.1.0.
- **Testes:**
  - G1: 0 erros;
  - G2: 21 arquivos, 0 erros. O lint foi provado com um código plantado: pegou a variável indefinida e a não usada;
  - G3: 19 de 19;
  - G4: 26 de 26, cerca de 27 s;
  - build: saída idêntica à de antes. Um js-yaml adulterado para o build sem executar nada.
  - G5 não rodou de novo: o ciclo não mexeu na wiki.
- **Achados no caminho:**
  - as tabelas de DV do CORE e a da wiki batem em todas as faixas;
  - três armas exóticas do CORE não têm dano (Air Pistol, Microwaver, Shrieker): o efeito delas é especial e não é
    automático nem no CORE.
- **Próximo:** ciclo 3, combate (habilidades do Solo, −6 MOVE do mortalmente ferido, munição depois de checar o mestre).
