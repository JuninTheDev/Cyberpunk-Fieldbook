# Cyberpunk RED: 2077 (módulo do Foundry VTT)

Módulo para o Foundry VTT 12 e o sistema **Cyberpunk RED - CORE** (v0.92.4). Traz o conteúdo do suplemento de fã "Cyberpunk 2077":

- **Compêndios:**
  - armas Power, Tech e Smart;
  - cyberware;
  - netrunning de 2077 (cyberdecks, quickhacks, daemons, White ICE);
  - veículos adaptados do jogo;
  - NPCs prontos (só o mestre vê);
  - regras em diários.
- **Economia de 2077:** uma configuração do módulo que troca as categorias de preço pelas do suplemento.
- **Armas de 2077 no menu de ataque do sistema:** veja a seção abaixo. As macros Ataque Smart, Ricochete e Carga Tech viraram atalhos para os mesmos modos.
- **Roles de 2077:** Face, Corpo e Lawman (com Investigator), no compêndio Roles de 2077.
- **Personagens da wiki:**
  - **Importar da wiki** (aba Atores, só o mestre) cria o ator a partir do criador de personagem da wiki.
    - O retrato do personagem é copiado para `worlds/<mundo>/retratos-wiki` e vai para a ficha e o token.
    - O equipamento chega montado como na wiki: equipado, carregando ou guardado; armas carregadas (a munição do pente sai do total); acessórios nas armas; programas e hardware no cyberdeck; opções de cyberware na base escolhida.
    - As sub-habilidades da Role (Solo, Tech, Medtech) chegam com os pontos da wiki.
    - Os veículos da família do Nomad chegam com os upgrades instalados.
    - Moradia, estilo de vida, Trauma Team e moda vão para o Estilo de vida da ficha.
  - **Avisos da wiki:** quando um jogador clica em **Enviar para o mestre** na wiki, o Foundry do mestre avisa (confere ao entrar e a cada minuto) e abre a janela **Personagens da wiki**, com Importar ou Atualizar. Cada envio avisa uma vez. Desliga em Configurações do módulo. Pela macro: `game.modules.get('cpr-2077').api.avisosDaWiki()`.
  - **Atualizar da wiki** (cabeçalho da ficha) traz o que mudou depois, inclusive um retrato novo (troca a imagem da ficha, do protótipo e dos tokens já no mapa) e a **Montagem** que falta na ficha (carregar armas, encaixar acessórios, instalar programas e opções). Pela macro: `api.montagemPendente(ator)` e `api.aplicarMontagem(ator)`.
  - **Pedidos da campanha:** os pedidos que os jogadores fazem na loja da wiki aparecem na janela **Personagens da wiki**, com Aprovar (entrega na hora) e Recusar. O mestre ativo entrega sozinho, a cada minuto, o que foi aprovado na wiki: cria os itens, carrega as armas, encaixa acessórios e programas e desconta o dinheiro. O cyberware chega sem instalar. Pela macro: `api.entregarPedidos()`.
  - **Na mesa:** a cada mudança num ator da wiki, o Foundry do mestre ativo manda a ficha de volta para a wiki (HP, Humanidade, dinheiro, Pontos de Melhoria, itens, munição…). Ao entrar, manda todos uma vez. Desliga em Configurações do módulo → Mandar a ficha para a wiki. Pela macro: `game.modules.get('cpr-2077').api.enviarParaWiki(ator)`.
  - **Quem importa:** o mestre importa do navegador em que entrou como mestre na wiki. Sem servidor, importa do computador onde a wiki roda.
  - **Endereço da wiki:** fica em Configurações do módulo e vale para o mundo todo. Vazio, ele usa `wiki.SEUDOMINIO` quando a mesa abre em `mesa.SEUDOMINIO`, ou `http://localhost:8000`.
  - **Campanha da wiki:** cada mundo joga uma campanha da wiki. O importador, a ficha na wiki, os avisos e os pedidos ficam só com os personagens dela.
    - **Como o mundo descobre:** a configuração **Campanha da wiki** (o id da campanha, que aparece na página Campanhas da wiki); vazia, a campanha cujo **Mundo do Foundry** é este mundo; com uma campanha só na wiki, ela (e o módulo grava na configuração, para o mundo continuar nela quando a segunda aparecer).
    - **Sem saber qual** (duas campanhas e o mundo sem ligação): o mestre recebe um aviso, o importador mostra todas as campanhas e nenhum pedido é entregue até ligar.
    - Pela macro: `game.modules.get('cpr-2077').api.campanhaDaWiki()`.
  - **Crossover** (o mestre moveu o personagem para outra campanha na wiki):
    - **No mundo da campanha antiga,** na primeira vez que abrir depois da mudança, o módulo manda a ficha do ator para a wiki e para de mandar a ficha da mesa. O ator fica no mundo, parado. A wiki também recusa o que esse mundo tentar gravar no personagem.
    - **No mundo da campanha nova,** o personagem aparece nos avisos ("veio de outra campanha") e **Importar da wiki** cria o ator igual ao da mesa antiga: itens, montagem, HP, dinheiro, lesões e o que mais tiver. Os ids dos itens ficam, então cyberware instalado e munição no pente continuam no lugar. O dono é escolhido na hora, e o retrato é copiado para a pasta deste mundo.
    - Se a ficha da mesa antiga ainda não chegou, o importador avisa e cria o ator como foi feito na wiki.
  - **No servidor online,** o módulo é gerado lá mesmo a cada publicação, assim que a mesa estiver vazia (veja `servidor/README.md`).

O conteúdo é gerado a partir da wiki da mesa (`system-2077.js`, `system-net.js`, `mestre-npcs.js`), então a wiki e o Foundry nunca divergem.

Para netrunning com arquiteturas no mapa (pontos de acesso nos Tiles, janela do netrunner e Black ICE resolvido pelo mestre), use junto o módulo **NET Architect**, da pasta `foundry-net-architect/`. O `atualizar-modulo.bat` instala os dois.

## Armas de 2077 no menu de ataque

A **classe de 2077** (Power, Tech ou Smart) é um campo da arma: na ficha do item, aba de configurações, logo abaixo do tipo de arma. Lá ficam também as opções de cada classe:

| Classe | Opções na ficha do item |
|---|---|
| **Smart** | várias balas Smart (12 + 1d10), trava em dois alvos, dois canos, coronha retrátil |
| **Tech** | o tamanho da rajada da carga (0: só tiro único) |
| **Power** | "não ricocheteia", para as que só disparam rajadas |

As armas do compêndio "Armas de 2077" já vêm com a classe e as opções certas. Qualquer outra arma, inclusive as do livro-base, ganha uma classe pela ficha.

Na ficha do personagem (aba de combate), cada arma de 2077 mostra a classe e ganha os modos dela, ao lado de mirar, autofogo e supressivo. O **Combat HUD** ganha os mesmos botões. O **Token Action HUD** não mostra os botões, mas ataca no modo escolhido na ficha ou no Combat HUD.

| Classe | Modo | Regra |
|---|---|---|
| **Power** | **Ricochete** | Tiro único num alvo atrás de cobertura. A DV vem da tabela de autofogo (pistolas e SMGs usam a da SMG). Alvos com REF 8+ esquivam. O dano tem um dado a menos. O Ballistic Coprocessor dá +2. As armas que só disparam rajadas de três não ricocheteiam. |
| **Tech** | **Carga** | Tiro único carregado. Através de cobertura fina chega metade do dano; através de grossa, um quarto. Se o dano passar, a armadura perde 4 de SP sem cobertura e 2 através dela. |
| **Tech** | **Rajada** | Autofogo carregado com a tabela da SMG, até o máximo da arma. Através de cobertura fina chega um quarto do dano; a grossa segura tudo. |
| **Smart** | (tiro comum) | **Só dispara com o cyberware Smart Link instalado.** O tiro único é o **teste Smart**, 10 + 1d10 no lugar de REF + perícia (12 + 1d10 nos modelos de várias balas, ou disparando os dois canos da Palica). Valem os modificadores da arma, a qualidade, os efeitos e os ferimentos. |

- **Esfriar:** no combate, depois de uma carga (tiro ou rajada), a arma Tech só carrega de novo duas rodadas depois. A ficha mostra "Esfriando".
- **Cobertura:** a carga e a rajada perguntam a cobertura do alvo antes da janela de rolagem.
- **Palica:** pergunta se dispara os dois canos (12 + 1d10, gasta os 2 cartuchos).
- **Kappa:** trava dois alvos a até 4 m um do outro. Com o Fluxo de Combate, se o ataque não pegar o primeiro, as balas vão para o segundo.
- **Dian:** a coronha recolhe pela pílula na linha da arma (−1 nos ataques até estender).
- **Qualidade excelente:** +1 no ataque, como as armas Excellent do livro-base. As armas importadas antes da correção ganham o +1 na rolagem.
- **Tudo passa pela rolagem do sistema:** a janela de rolagem, a munição, a Sorte e o cartão.
  - O cartão traz uma nota com a regra do modo.
  - O botão de dano do cartão rola o dano do modo (um dado a menos; a ablação certa).
  - Com o **Fluxo de Combate** e um alvo marcado, a defesa e o dano saem por ele, com a DV, a ablação e a cobertura de cada modo.

Configurações do módulo:

- **Ataque das armas Smart:** o suplemento não diz se o teste Smart troca REF + perícia ou se é uma opção.
  - **Substitui** (padrão): o tiro único da arma Smart é sempre o teste Smart.
  - **Alternativa:** o menu ganha o modo "Smart", e o tiro comum continua REF + perícia.
- **Arma Smart sem o Smart Link:** não dispara (padrão), ou dispara como arma comum.
- **A carga Tech esfria uma rodada:** ligado por padrão.

As macros **Ataque Smart**, **Ricochete** e **Carga Tech** do compêndio "Macros de 2077" são atalhos: escolhem a arma (e, na carga, tiro ou rajada) e atacam pelo mesmo caminho.

## Gerar ou atualizar o módulo

O jeito fácil: feche o Foundry e dê dois cliques em `atualizar-modulo.bat`, na pasta da wiki. Ele faz o mesmo que estes comandos, rodados nesta pasta com o Foundry fechado (ou sem nenhum mundo que use o módulo aberto):

```
node build/extract-core.mjs   # só na primeira vez ou quando o sistema atualizar
node build/build.mjs
```

- **`extract-core.mjs`:** lê os compêndios do sistema e guarda uma cópia em `.cache/`, fora do git. Dali vêm os moldes de cada tipo de item, as perícias, as tabelas de DV e as classes de veículo.
- **`build.mjs`:**
  - confere tudo contra os valores que o sistema aceita;
  - compila os compêndios com a ferramenta oficial `@foundryvtt/foundryvtt-cli` (via `npx`);
  - grava o módulo em `%LOCALAPPDATA%/FoundryVTT/Data/modules/cpr-2077`.

Depois é só ativar **Cyberpunk RED: 2077** em *Configurar módulos* no mundo.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `module.json` | Manifesto do módulo. |
| `scripts/cpr-2077.mjs` | Configuração da economia de 2077 e API das macros. |
| `scripts/armas2077.mjs` | Armas de 2077 no menu de ataque: classe na ficha do item, modos na ficha e no Combat HUD, regras Smart, Tech e Power. |
| `scripts/macros.mjs` | Atalhos Ataque Smart, Ricochete e Carga Tech. |
| `scripts/wiki.mjs` | Importar da wiki e Atualizar da wiki (personagens do criador). |
| `build/loja.mjs` | Gera o `loja-catalogo.js` da wiki (também roda sozinho). |
| `build/roles.mjs` | Face, Corpo e Lawman de 2077. |
| `data/loja-nomes.json` | Nomes em português dos itens do sistema na loja. |
| `styles/cpr-2077.css` | Visual dos diários e das mensagens no chat. |
| `data/veiculos-2077.json` | Veículos do jogo e a classe do RED usada em cada um. |
| `data/npcs-faccoes.json` | Variantes de facção sobre as fichas do livro. |
| `data/leia-primeiro.html` | O diário "Leia primeiro" do módulo. |
| `build/*.mjs` | Geração dos compêndios. |

## Adaptações

- **Veículos:** o suplemento não traz veículos. Os carros do jogo usam os números de uma classe do RED ou do Black Chrome, indicada na descrição de cada um.
- **Metralhadoras só de autofogo** (Defender, Mk.31): seguem a Tsunami Arms Helix do livro-base, com dano 2d6 × multiplicador de autofogo.
- **Ataque Smart** (10 + 1d10): regra inferida das descrições das armas. Se troca REF + perícia ou é uma opção fica na configuração "Ataque das armas Smart".
- **Kappa** ("redireciona as balas para o segundo alvo"): lido como "se o ataque não pegar o primeiro, vai para o segundo, a até 4 m dele".
- **Inconsistências do livro:** quando o livro se contradiz (dano, pente, perícia), o item usa o texto e a descrição mostra o valor da tabela.
