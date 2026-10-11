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
| CORE | Humanidade máxima pelo cyberware | **desvio**: hoje é EMP × 10 (corrigir no ciclo 1) |
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

## Dúvidas de regra

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
  - G1 e G4 (resultado no commit do ciclo).
- **Próximo:** ciclo 1, Humanidade máxima.
