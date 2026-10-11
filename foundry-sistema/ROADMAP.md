# Roadmap do sistema Cyberpunk RED — Fieldbook (Foundry 14)

Ordem de trabalho: P0 → P4. Não começa uma prioridade enquanto houver problema crítico conhecido numa acima. Cada
tarefa só fecha com os portões de [QUALITY_GATES.md](QUALITY_GATES.md) passando e o [MIGRATION_STATUS.md](MIGRATION_STATUS.md)
atualizado. Os achados vêm da auditoria de 2026-10-11.

## P0: dados, integridade das regras e compatibilidade básica

- [x] **Servidor da mesa real fora do alcance do sistema v14.** O `servidor/atualizar-modulo.sh` rodava todo
  `foundry-*/instalar.mjs` com a pasta de dados do Foundry 12 do servidor, e o `servidor/atualizar.sh` disparava isso a
  cada mudança em `foundry-*/`. Agora os dois ignoram o `foundry-sistema/`. (Ciclo 0)
- [x] **`instalar.mjs` só instala num Foundry 14**, pela versão no log do Foundry ao lado da pasta Data (ou
  `FOUNDRY_VERSAO=14`). (Ciclo 0)
- [x] **Trabalho guardado no branch `sistema-v14`**, sem push. (Ciclo 0)
- [x] **Humanidade máxima pelo cyberware instalado** (desvio de regra): 10 × EMP, menos 2 por peça com perda de
  Humanidade maior que 0, menos 4 por borgware. Fonte: wiki (system-rules.js, "cada peça reduz o máximo em 2") e o
  CORE (`_calcMaxHumanity`). (Ciclo 1)

## P1: bugs, testes de regressão e confiabilidade

- [x] **Portões de qualidade** (Ciclo 2):
  - testes unitários das regras puras com `node --test`: rolagem, dano, armadura, lesão, Death Save, defesa, autofogo e área;
  - ESLint com versão exata pelo npx, sem node_modules;
  - o cenário do Foundry 14 falhar com aviso de compatibilidade vindo do sistema;
  - teste da parede no fogo supressivo;
  - versão exata e hash conferido do que o build baixa (js-yaml da CDN, foundryvtt-cli do npm).
- [ ] **Combate** (Ciclo 3):
  - as habilidades do Solo (Consciência de Combate) que a wiki descreve: Reação de Iniciativa, Ataque de Precisão,
    Ponto Fraco, Deflexão de Dano, Recuperação de Falhas e Detecção de Ameaça;
  - −6 MOVE (mínimo 1) do mortalmente ferido;
  - a munição só sai do pente depois de conferir que há mestre na mesa.
- [ ] **Lacunas de teste** (Ciclo 4): escudo, "responder pelo jogador", corpo a corpo com esquiva, munição de borracha,
  armadura pesada, janela do mestre para a defesa de NPC e os erros da importação.

## P2: fichas, inventário, equipamento, armas e combate

- [ ] **Tipos de item que o importador hoje descarta:** equipamento, roupa, programa, cyberdeck, droga, upgrade e
  veículo. É bloqueador da migração da campanha.
- [ ] **Volta da ficha para a wiki** (HP, munição, dinheiro, lesões) e entrega dos pedidos da loja. Bloqueador da migração.
- [ ] **Da wiki:** botão "Importar da wiki" na barra dos atores; "Atualizar da wiki" (hoje, importar de novo cria outro
  ator); retrato.
- [ ] **Na rolagem:** Sorte; Briga e Artes Marciais (dano pelo BODY); Facedown.
- [ ] **Do Fluxo de Combate:** quem vê o cartão do resultado; texto e animação no token.
- [ ] **Armas de 2077** (Smart, ricochete, carga Tech) e o conteúdo do cpr-2077.

## P3: Netrunning, cyberware, NPCs e ferramentas do mestre

- [ ] **NET:** o NET Architect dentro do sistema (Interface, programas, Black ICE, dano no cérebro).
- [ ] **Cyberware:** base e slots ao instalar, terapia e ciberpsicose.
- [ ] **NPCs:** ficha de capanga (mook), Black ICE e demônios como atores.
- [ ] **Ferramentas do mestre:** o Painel Tático dentro do sistema.

## P4: refatoração, desempenho, acessibilidade e documentação

- [ ] Dividir o `combate.mjs` (pedidos pelo socket, modos, cartão).
- [ ] Tradução para inglês (hoje, o arquivo `en` aponta para o português).
- [ ] Acessibilidade das fichas: teclado e contraste no tema claro.
- [ ] Ícones próprios no lugar dos genéricos do Foundry.

## Decisões tomadas

- **2026-10-11, arma branca contra SP ímpar:** vale SP efetivo 6 para SP 11, como o CORE e o Fluxo de Combate (o que a
  mesa usa hoje). A wiki diz "ignoram metade do SP (arredondado p/ cima)", e o texto também cabe na leitura 5.
  Decisão do usuário.
