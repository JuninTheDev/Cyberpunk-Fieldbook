# Cyberpunk RED — Fieldbook (sistema do Foundry VTT 14)

Sistema próprio de Cyberpunk RED para o **Foundry VTT 14**, feito em volta da wiki da mesa. Não depende do sistema **Cyberpunk RED - CORE**: as regras, a ficha e o combate são daqui, e os módulos da mesa vão virar parte dele.

**Esta é a versão 0.2.0, um protótipo.** O combate do Fluxo de Combate já está dentro do sistema. A campanha continua no Foundry 12 com o CORE 0.92.4 até este sistema estar provado na mesa.

## O que já faz

- **Ficha do personagem**, com estas partes:
  - cabeçalho com HP, Humanidade (e a EMP de agora), Sorte, SP da cabeça e do corpo e Death Save;
  - abas de atributos, armas e lesões, perícias, equipamento, cyberware e notas.
- **Rolagens nativas do Foundry 14**, com o crítico do d10 como o modificador `crit` (`1d10crit + 12`):
  - um 10 natural soma mais um d10;
  - um 1 natural tira um d10;
  - uma vez só.

  Funcionam no chat, em macros e no Dice So Nice.
- **Testes:** clique no atributo (STAT + 1d10) ou na perícia (STAT + perícia + 1d10). Entram:
  - o bônus dos efeitos;
  - a penalidade de ferimento (−2 gravemente; −4 mortalmente, que também tira 6 de MOVE, com mínimo 1);
  - as lesões (−2 em todas as ações da Concussão, por exemplo);
  - a armadura pesada, que tira de REF, DEX e MOVE.
- **Ataque, defesa e dano** (o Fluxo de Combate dentro do sistema). Marque os alvos (T) e use os botões da arma:
  - **Atacar:** tiro, ou corpo a corpo com arma branca.
  - **Mirar:** −8, na cabeça (o dano que passa dobra), na perna (se passar dano, Perna quebrada) ou no item na mão (o alvo larga).
  - **Autofogo:** a perícia Autofogo contra a tabela de autofogo. O dano é 2d6 × quanto passou, até o máximo da arma. Gasta 10 balas.
  - **Supressivo:** sem alvo marcado, pega todos a até 25 m e à vista. Cada um rola WILL + Concentração contra o ataque, e quem perde fica **Suprimido** até o fim do próximo turno dele. Gasta 10 balas.
  - **Espingarda com cartucho** (pela munição): um ataque contra DV 13. Se acertar, cada alvo a até 6 m leva 3d6, rolados uma vez.
  - **Explosivo** (lança-granadas, foguete ou granada no pente): o ataque contra a DV do alcance do alvo. Se acertar, todos na área de 10 × 10 m levam o mesmo dano, menos quem esquivar passando do ataque.
- **A defesa, como no Fluxo de Combate:**
  - o total do ataque fica só com o mestre e quem atacou até a defesa; depois aparece para todos;
  - quem controla cada alvo recebe a pergunta (Esquivar, Aguentar, Escudo) no computador dele e rola a própria Evasão;
  - de tiro, só esquiva quem tem REF 8+; no corpo a corpo, todos; sem perna, ninguém; empate é do defensor;
  - pelos NPCs, o mestre escolhe numa janela (vendo o total) ou o sistema decide pela esquiva média;
  - passados 8 s sem resposta, o mestre ganha um cartão para responder pelo jogador; passado o tempo, o alvo aguenta.
- **Dano na ficha**, com as regras do CORE:
  - **Quem rola:** quem atacou rola o dano no computador dele; se ele não responder, o mestre rola.
  - **SP:** vale a maior armadura equipada no local; arma branca ignora metade.
  - **Armadura segura:** se o dano não passa do SP, entra só o bônus do crítico.
  - **Cabeça:** o dano que passa conta ×2.
  - **Escudo:** recebe o ataque todo; só um explosivo passa de um escudo destruído.
  - **Ablação:** a armadura perde 1 de SP, ou a ablação da munição (a perfurante tira 2; a borracha, a biotoxina e a venenosa não tiram nada).
  - **Munição de borracha:** não mata (deixa o alvo com 1 HP), não tira SP e não causa lesão crítica.
  - **Munição que não causa dano** (biotoxina, veneno, EMP, flashbang, sonífera, fumaça e gás lacrimogêneo): o ataque e a área valem, mas ninguém leva o dano da arma. O cartão diz o efeito, com o texto da wiki, e o mestre resolve.
- **Lesão Crítica** (dois 6 no dano):
  - **Tabelas:** 2d6 na tabela do corpo, ou na da cabeça no tiro mirado na cabeça, sem repetir uma que o alvo já tem.
  - **Na ficha:** a lesão entra com os efeitos (Perna quebrada: −4 MOVE, mínimo 1) e o texto da wiki, com o paliativo e o tratamento.
  - **Mortalmente ferido:** quem já está com HP abaixo de 1 ganha uma lesão a cada acerto.
- **Death Save:** 1d10 + penalidades contra BODY.
  - **Penalidades:** a de base vem das lesões; a outra sobe 1 a cada sucesso e se zera na ficha quando o personagem estabiliza.
  - **Quando:** no combate, no começo do turno de quem está mortalmente ferido. O jogador rola no computador dele.
  - **Falhou:** morto, com o status e o combatente derrotado.
- **Consciência de Combate do Solo**, pelos pontos de cada habilidade da Role, como a wiki descreve:
  - **Reação de Iniciativa:** +1 na iniciativa por ponto.
  - **Ataque de Precisão:** +1 em todo ataque a cada 3 pontos.
  - **Detecção de Ameaça:** +1 em Percepção por ponto.
  - **Ponto Fraco:** +1 no dano (antes da armadura) do primeiro acerto da rodada, por ponto.
  - **Deflexão de Dano:** −1 no primeiro dano sofrido na rodada a cada 2 pontos, até 5.
  - **Recuperação de Falhas:** com 4 pontos, o 1 natural do ataque não tira um d10.

  A rodada é a do combate de que o personagem participa. Fora de combate, o Ponto Fraco e a Deflexão valem toda vez.
- **Desfazer:** o cartão do resultado tem o botão, só para o mestre. Devolve o HP, o SP e o escudo, tira as lesões e o Suprimido, e devolve o Ponto Fraco e a Deflexão que o ataque gastou.
- **Munição:** cada tiro sai do pente, e **↻** recarrega com a munição compatível da ficha. O ataque de um jogador sem mestre na mesa para antes de gastar a bala.
- **Inventário** (aba Equipamento): equipamento, roupas e drogas, com a quantidade e o uso (equipado, carregando ou guardado; o botão da linha passa de um para o outro).
  - **Efeitos do equipamento** valem conforme o uso, como no CORE: o Agent (+2 em Pesquisa em Biblioteca) e o Techscanner valem equipados ou carregando; o Medscanner e o Linear Frame, só equipados.
  - **Drogas** vêm com os efeitos desligados. Quem usa liga o efeito na ficha do item (o Boost dá +2 INT).
  - **Roupas** guardam o tipo e o estilo, com os nomes da loja da wiki.
  - **Netrunning:** o cyberdeck (os slots, com os programas instalados nele e quantos slots ocupam) e os programas (classe, ATK, DEF, REZ, o dano e o deck onde estão). Só aparece na ficha de quem tem um dos dois. As regras da NET (a corrida, o Black ICE) ainda não estão aqui.
  - **Upgrades e acessórios:** cada um diz onde instala (arma, cyberdeck ou veículo), quantos slots ocupa e em que item está. Instalado numa arma, o carregador estendido ou tambor troca o tamanho do pente (o rifle de assalto vai de 25 a 35 ou 45, como a tabela de carregadores da wiki), e o Smartgun Link dá +1 no ataque (o mesmo acessório duas vezes não soma). O hardware ocupa slots do deck.
- **Compêndios**, na pasta "Cyberpunk RED — Fieldbook": Armas, Armaduras, Munição, Cyberware, Equipamento, Roupas, Drogas, Netrunning (cyberdecks e programas), Upgrades e acessórios, Lesões críticas e Personagens de exemplo. Os exemplos são um Solo e um Capanga, com armas carregadas, armadura vestida e cyberware instalado, prontos para testar o combate.
- **Cyberware:**
  - **Instalar** desconta a Humanidade pela perda rolada (Shift: pela média).
  - **Humanidade máxima:** 10 × EMP, menos 2 por peça instalada que tem perda de Humanidade (borgware, menos 4). Peça sem perda, como o cyberware grátis de 2077, não reduz.
  - Os efeitos do cyberware só valem instalado. O Kerenzikov, por exemplo, dá +2 na iniciativa.
  - **Tirar** devolve a Humanidade.
- **Importar da wiki:** `game.system.api.wiki.importarPersonagem(id)` cria o ator a partir do personagem feito no criador da wiki:
  - STATs, HP, Humanidade, perícias (com Linguagem e Especialista Local), Role com as sub-habilidades e dinheiro;
  - armas carregadas, armaduras vestidas e cyberware instalado;
  - equipamento, roupas e drogas, com a quantidade e o uso da montagem da wiki (equipado, carregando ou guardado);
  - o cyberdeck, com os programas e o hardware instalados nele, e os acessórios nas armas, como a montagem da wiki (com o carregador maior, a arma entra com o pente maior cheio).

  A wiki marca o personagem como "no Foundry". O que ainda não existe aqui (veículos e o conteúdo de 2077) vira aviso.

## Configurações (Configurações → Sistema)

As mesmas do Fluxo de Combate, com os mesmos padrões:
- **Esquivar de tiros exige REF 8+** (padrão: sim).
- **Quem atacou rola o dano** (padrão: sim).
- **Tempo para o jogador responder** (padrão: 60 s).
- **Defesa dos NPCs:** o mestre escolhe, ou automática (padrão: o mestre).
- **Lesão crítica:** na ficha, só anunciar, ou desligada (padrão: na ficha).
- **Mortalmente ferido sofre lesão a cada acerto** (padrão: sim).
- **Death Save no começo do turno:** jogadores e NPCs, só jogadores, ou desligado (padrão: todos).
- **Explosivos pegam toda a área** (padrão: sim).
- **Fogo supressivo sem alvo pega todos à vista** (padrão: sim).
- **Endereço da wiki** (padrão: `http://localhost:8000`).

## Ainda não faz

- **Do Fluxo de Combate:**
  - a animação e o texto em cima do token;
  - quem vê o cartão do resultado (hoje, todos);
  - as armas de 2077 (Smart, ricochete, carga Tech);
  - o Reflex Tuner;
  - a Sorte na rolagem.
- **NPCs e Black ICE**, a NET (o NET Architect) e o Painel Tático.
- **Tipos de item:** equipamento, roupa, programa, cyberdeck, droga, upgrade e veículo.
- **Volta da ficha para a wiki** (HP, munição, dinheiro) e entrega dos pedidos da loja.
- **Da wiki:** o retrato e o "Atualizar da wiki". Importar de novo hoje cria outro ator.
- **Interface:** botão "Importar da wiki" na barra dos atores e ícones próprios (hoje, os genéricos do Foundry).
- **Regras de lesão que não são números:** o Crânio rachado (×3 na cabeça) e o dano de novo das Costelas quebradas. Por enquanto, estão só no texto da lesão.

## Instalar

- **No PC, para experimentar:** `node instalar.mjs`, nesta pasta.
  - **Onde instala:** em `%LOCALAPPDATA%\FoundryVTT\Data\systems\cpr-fieldbook` (`FOUNDRY_DATA=...` troca a pasta).
  - **Compêndios:** na primeira vez, ou quando o catálogo muda, o instalador gera os compêndios em `packs/` (fora do git) com o npx, e para isso precisa de internet.
  - **Foundry aberto:** feche e abra de novo para ele ver o sistema. Depois, crie um mundo novo com o sistema **Cyberpunk RED — Fieldbook**.
- **Endereço da wiki:** em *Configurações → Sistema → Endereço da wiki*.

## Conteúdo

`dados/catalogo.json` e `scripts/gerado.mjs` são gerados por `node build/conteudo.mjs`. Não edite à mão.

- **Fonte:** o build baixa os compêndios-fonte do CORE **v0.92.4** do GitLab para `.cache/` (fora do git) e converte para este sistema:
  - 100 armas, 18 armaduras, 55 munições e 105 cyberwares, com os efeitos;
  - 22 lesões críticas e as duas tabelas, com o nome e o texto em português das tabelas da wiki;
  - as 61 perícias, com os nomes em português da tabela da wiki;
  - as 13 tabelas de DV.
- **Os mesmos ids da loja da wiki** (`core_weapons:assault-rifle`): é por eles que o importador acha cada item.
- **Efeitos situacionais** (Audição Amplificada, Image Enhance, o Sandevistan ligado, Dedos esmagados) ficam de fora por enquanto: aplicados sempre, dariam bônus errado. O build lista quais são.

## Teste

- **Regras (rápido, sem Foundry):** `node --test "tests/sistema/*.test.mjs"`. Inclui o conteúdo gerado conferido contra as tabelas da própria wiki.
- **Lint:** `npx --yes eslint@10.12.0 foundry-sistema tests/sistema tests/lib/foundry14.js tests/cenarios/v14.js`.
- **No Foundry 14:** `node tests/rodar.js v14`, na raiz da wiki. Sobe o Foundry 14 do PC sem janela, num mundo vazio e numa pasta própria (`%LOCALAPPDATA%\FieldbookTeste\foundry14`), e confere estes pontos, com dados fixos onde a conta importa:
  - os compêndios, a ficha e o crítico do d10;
  - o catálogo, o cyberware e a recarga, e o inventário (o efeito do equipamento pelo uso, a droga ligada na ficha do item, os acessórios na arma e o hardware no deck);
  - o tiro com crítico, ablação e Lesão Crítica, e o Desfazer;
  - o mirado na cabeça e na perna;
  - o autofogo, o explosivo em área, o cartucho, a munição de borracha e a que não causa dano;
  - o escudo (com a janela do mestre para a defesa de um NPC e o explosivo que passa do escudo destruído), o corpo a corpo com esquiva e a armadura pesada;
  - a Consciência de Combate do Solo (com o Ponto Fraco e a Deflexão por rodada e o Desfazer) e o MOVE do mortalmente ferido;
  - a defesa e o ataque de um jogador num segundo navegador, com o dano rolado por ele, o ataque dele sem mestre na mesa e o mestre respondendo por ele quando demora;
  - o fogo supressivo, a parede que bloqueia a linha de visão e os turnos (o Suprimido saindo e o Death Save que passa e depois falha);
  - a importação de um Solo e de um Netrunner (com os programas no deck) feitos no criador da wiki de teste, e os erros dela (personagem que não existe, wiki fora do ar, jogador tentando importar);
  - nenhum aviso de compatibilidade do Foundry 14 nem erro vindo do sistema, nos dois navegadores.

Da pasta de dados do Foundry do PC só sai a licença. `FOUNDRY14_APP=...` e `FOUNDRY14_DADOS=...` trocam o programa e a pasta de onde vem a licença.

## Licença

As regras de dano, o conteúdo convertido e as tabelas vêm do [Cyberpunk RED - CORE](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) (The Project Red Team), que é GPL-3. Por isso este sistema também é GPL-3: se um dia for publicado, vai com o código-fonte e a mesma licença. O ícone do Suprimido veio do Fluxo de Combate.

Cyberpunk RED é da R. Talsorian Games. Este é conteúdo de fã sem fins comerciais, dentro da Homebrew Content Policy da R. Talsorian, não endossado por ela.
