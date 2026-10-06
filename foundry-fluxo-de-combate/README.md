# Fluxo de Combate (módulo do Foundry VTT)

Ataque, defesa e dano automáticos para o Foundry VTT 12 (a API usada também existe no 13) e o sistema **Cyberpunk RED - CORE** (v0.92.4). Substitui o **Evasion Workflow** (cpred-evasion-workflow), que faz a mesma coisa com menos regras.

- **Todo ataque com alvo marcado** entra no fluxo: pela ficha, pelo Token Action HUD ou pelo Combat HUD. O módulo pega a rolagem do próprio sistema, com o total, o modo (tiro, mirado, autofogo, supressivo), a arma e a munição. Ele não lê o HTML do chat.
- **O alvo decide às cegas.** O cartão do ataque fica só com o mestre e quem atacou até a defesa. Depois aparece para todos.
- **A janela "Ataque!"** abre no computador do jogador do alvo. Ela mostra quem ataca, com que arma, a distância e as escolhas, cada uma com a conta que vale:
  - **Esquivar:** DEX + Evasão + 1d10 vira a DV (a média aparece). Empate é do defensor.
  - **Aguentar:** o tiro precisa passar da DV do alcance.
  - **Usar o escudo:** o escudo recebe o ataque todo, sem esquiva.
- **O jogador rola os próprios dados** na janela de rolagem do sistema, com modificadores e Sorte: a esquiva, a Concentração, o dano (quem atacou) e o Death Save.
- **O mestre resolve tudo** pelo socket: DV, comparação, dano na ficha e lesões. Pelos NPCs, ele escolhe numa janela que mostra o total do ataque.
- **O dano sai pela ficha do alvo,** com as contas do próprio sistema: armadura do local, cabeça ×2, escudo, ablação, armas brancas ignorando metade do SP, munição não letal.
- **O cartão do resultado** traz, para cada alvo:
  - a defesa e se pegou;
  - o dano no HP e o SP antes e depois;
  - as lesões críticas e o ferimento grave.
  - O mestre tem o botão **Desfazer**.

## Instalar e ativar

- **No PC:** feche o Foundry e rode o `atualizar-modulo.bat` da wiki. Ele instala os três módulos (cpr-2077, NET Architect e Fluxo de Combate). Só este módulo: `node instalar.mjs`, nesta pasta.
- **No servidor:** é instalado sozinho quando a mesa está vazia depois de uma publicação.
- **O Evasion Workflow sai:** o `instalar.mjs` apaga a pasta `cpred-evasion-workflow` dos módulos, para não haver dois módulos pedindo a esquiva no mesmo ataque.
- **Ativar:**
  - Num mundo que usava o Evasion Workflow, o cpr-2077 pergunta ao mestre, ao entrar, se quer ligar o Fluxo de Combate. Um clique liga e recarrega.
  - Ou pelo caminho de sempre: *Configurar módulos* → **Fluxo de Combate**.
- **Se o Evasion Workflow continuar ligado,** o Fluxo de Combate avisa o mestre e desliga o outro com um clique.

## Como funciona na mesa

1. **Quem ataca** marca o alvo (T) e rola o ataque como sempre. O botão de rolar dano do cartão vira a marca do módulo: o dano sai sozinho.
2. **O alvo:**
   - **Jogador:** a janela "Ataque!" abre para ele. Sem escolha (corpo a corpo, fogo supressivo), vai direto para a janela de rolagem do sistema.
   - **NPC:** a janela abre para o mestre, com o total do ataque, ou o módulo escolhe sozinho (configuração).
   - **Sem resposta** no tempo da configuração (60 s), o alvo aguenta. Depois de 8 s de espera, o mestre ganha um cartão com botões para responder pelo jogador.
3. **Se pegou,** quem atacou rola o dano (o jogador na janela de dano do sistema, com o local do tiro mirado e o multiplicador do autofogo já preenchidos; o NPC pelo mestre). O mestre aplica na ficha do alvo.
4. **Na mesa,** sobe um texto em cima do token ("Esquivou!", "−12 HP"). Com o Sequencer e o JB2A ativos, toca a animação do acerto ou do erro. Com o Diwako, toca o som de acerto que estiver configurado nele.

## Regras implementadas (RED p. 170–187)

As mesmas da wiki da mesa (o teste confere o texto da wiki):

| Ataque | Defesa | Dano |
|---|---|---|
| **Tiro** | REF 8+: esquivar (a Evasão vira a DV) ou aguentar contra a DV do alcance. Abaixo de REF 8, só aguentar. Fora do alcance: erra. | O da arma. |
| **Tiro mirado** (−8, já no ataque) | Como o tiro. | Cabeça: o que passa da armadura ×2. Perna: Perna Quebrada se passar da armadura. Item na mão: o alvo larga o item. |
| **Corpo a corpo** | Sempre a Evasão, para qualquer um. | O da arma. Armas brancas e artes marciais ignoram metade do SP. |
| **Autofogo** | Como o tiro, com a tabela de autofogo da arma (ou a da SMG, para as pistolas de 2077). | 2d6 × quanto o ataque passou da DV (ou da esquiva), até o máximo da arma (×3 SMG, ×4 rifle). |
| **Espingarda com cartucho** | Um ataque contra DV 13. Se acertar, cada alvo marcado à frente, até 6 m, esquiva (REF 8+) ou aguenta. | 3d6, rolado uma vez para todos. |
| **Explosivo** (granada, lançador, foguete) | O ataque contra a DV do alcance do alvo. Se errar, o mestre decide onde caiu. Se acertar, todos na área de 10 × 10 m em volta do alvo. Quem tem REF 8+ pode esquivar para fora, com a Evasão maior que o ataque. | Rolado uma vez para todos. O escudo segura até quebrar. |
| **Fogo supressivo** | Sem alvo marcado, todos a até 25 m e sem parede no meio. Cada um rola WILL + Concentração + 1d10 contra o ataque. | Sem dano. Quem perde fica **Suprimido**: gasta a próxima Ação de Movimento indo para a cobertura. O status sai sozinho no fim do próximo turno dele. |

- **Escudo:** com um escudo equipado e com HP, a janela oferece usá-lo. Ele recebe o ataque todo (sem esquiva). Contra explosivos, o que sobra passa quando ele quebra.
- **Lesão crítica:** dois ou mais 6 no dano.
  - O módulo rola na tabela do sistema (a da cabeça só em tiro mirado na cabeça), sem repetir uma lesão que o alvo já tem.
  - A lesão vai para a ficha, com os efeitos dela, e o cartão de lesão do sistema vai para o chat.
  - O +5 de dano direto vem do próprio sistema.
- **Mortalmente ferido** (HP abaixo de 1): cada ataque que pega dá mais uma lesão crítica. No começo do turno dele, no combate, ele rola o Death Save. Falhou: morto (status e combatente derrotado).
- **Perna desmembrada:** quem tem essa lesão não esquiva.
- **Reflex Tuner** (2077): depois de ser atingido, +1 na esquiva pelo resto da rodada.
- **Empate:** o defensor vence, na esquiva e na DV.

## Configurações do módulo

- **Resolver os ataques:** liga e desliga o módulo inteiro.
- **O jogador rola os próprios dados:** ligado por padrão. Desligado, o mestre rola por eles, sem janela.
- **Esquivar de tiros exige REF 8+:** a regra do livro, ligada por padrão.
- **Defesa dos NPCs:** o mestre escolhe numa janela (padrão), ou automática, pela esquiva média contra a DV.
- **Tempo para o jogador responder:** de 10 a 300 segundos (padrão 60).
- **Esconder o total do ataque até a defesa:** ligado por padrão.
- **Dano:** automático (padrão), ou manual (o módulo só resolve a defesa; o dano fica com o botão do sistema).
- **Lesão crítica:** na ficha (padrão), só anunciar, ou desligada.
- **Mortalmente ferido sofre lesão a cada acerto:** ligado por padrão.
- **Death Save no começo do turno:** jogadores e NPCs (padrão), só os jogadores, ou desligado.
- **Explosivos pegam toda a área:** ligado por padrão. Desligado, só os alvos marcados.
- **Fogo supressivo sem alvo pega todos à vista:** ligado por padrão.
- **Quem vê o cartão do resultado:** todos (padrão), os envolvidos, ou só o mestre.
- **Mostrar também o cartão de dano do sistema:** desligado (o cartão do módulo já traz tudo).
- **Efeitos na mesa:** texto e animação, só o texto, ou nenhum.

## Com os outros módulos da mesa

- **Diwako (cpred-additions):** continua ligado (DV no token, cobertura, armas ruins). Nos ataques que o Fluxo de Combate resolve, ele não anuncia acerto nem erro antes da defesa, nem toca a animação de sangue: o cartão do ataque não tem mais o botão que ele procura. O som de acerto configurado nele toca na hora do resultado.
- **Token Action HUD e Combat HUD:** os ataques deles entram no fluxo, como os da ficha.
- **NET Architect:** não interfere (as rolagens da NET não são ataques de arma). Os tokens escondidos dos inimigos da NET não entram em área nem em supressão.

## Macros

`game.modules.get('fluxo-de-combate').api` tem:

- `atacar(dados)`: o mesmo pedido que o cartão do ataque faz ao mestre (`cena`, `token`, `arma`, `rolagem`, `total`, `alvos`, `local`);
- `desfazer(mensagem)`: desfaz o cartão de resultado;
- `ultimo` (no mestre): o último ataque resolvido, com o resultado de cada alvo;
- `regras`: as funções de regra (modo, escolhas, DV pela distância, autofogo).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `scripts/fluxo-de-combate.mjs` | Entrada: configurações, status Suprimido, ganchos, aviso do Evasion Workflow, API. |
| `scripts/captura.mjs` | No cliente de quem ataca: pega a rolagem do sistema, esconde o total, tira o botão de dano e pede ao mestre. |
| `scripts/mestre.mjs` | O motor (só no mestre): DV, defesa de cada alvo, área, cartucho, supressão, dano, lesões, desfazer. |
| `scripts/defesa.mjs` | A janela "Ataque!" e as rolagens no cliente de quem rola (esquiva, Concentração, dano, Death Save). |
| `scripts/sistema.mjs` | O que vem do sistema: classes de rolagem, janela de rolagem, cartões, aplicar e desfazer dano, lesão crítica, tabelas de DV. |
| `scripts/regras.mjs` | As regras puras (modo, escolhas, quem acertou, autofogo, DV pela distância). Sem Foundry: o teste roda no Node. |
| `scripts/cartao.mjs` | O cartão do resultado e os botões dele. |
| `scripts/turnos.mjs` | No combate: o Suprimido sai e o Death Save de quem está mortalmente ferido. |
| `scripts/fx.mjs` | Texto em cima do token, animação (Sequencer e JB2A) e o som do Diwako. |
| `scripts/socket.mjs` | Pedidos ao mestre ativo, um de cada vez, e as perguntas do mestre aos jogadores. |
| `instalar.mjs` | Copia o módulo para a pasta do Foundry e tira o Evasion Workflow. |
