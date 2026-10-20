# Cyberpunk RED: 2077 (módulo do Foundry VTT)

Módulo para o Foundry VTT 12 e o sistema **Cyberpunk RED - CORE** (v0.92.4). Traz os anos 2070: as regras e os itens do **Cyberpunk Edgerunners Mission Kit** (oficial) e os itens do suplemento de fã "Cyberpunk 2077" que o mestre aprovou (revisão de 2026-10-13), com as regras do Kit:

- **Compêndios:**
  - armas Power, Tech e Smart (as 13 do Kit e 28 do suplemento), os Rebuilds e a munição Smart melhorada;
  - cyberware (o Neuroport e o cromo do Kit, o do suplemento e os Berserk e Sandevistan dos anos 2070, mais caros e mais fracos que no suplemento);
  - netrunning de 2077 (os quickhacks do Kit e do suplemento, de graça pelo Rank, e os cyberdecks com marca) e as arquiteturas NET do Protocolo Morana, quando a campanha tiver (lidas de `documentos/morana/arquiteturas-da-campanha.md`; o NET Architect as oferece nos pontos de acesso);
  - veículos adaptados do jogo;
  - NPCs prontos (só o mestre vê), com o elenco do Protocolo Morana na pasta própria;
  - regras em diários.
- **Preços:** valem as categorias do RED, como no Mission Kit (a economia do suplemento de fã saiu).
- **Armas de 2077 no menu de ataque do sistema:** as regras de Power, Smart e Tech do Kit; veja a seção abaixo. As macros Ricochete e Carregar arma Tech são atalhos para o mesmo caminho.
- **Roles:** as 10 do RED (os ajustes do Mission Kit são de compra de itens e de quickhack, sem mudar o item de Role). O compêndio Roles de 2077 saiu com o Lawman com Investigator do suplemento de fã.
- **Personagens da wiki:**
  - **Importar da wiki** (aba Atores, só o mestre) cria o ator a partir do criador de personagem da wiki.
    - O retrato do personagem é copiado para `worlds/<mundo>/retratos-wiki` e vai para a ficha e o token.
    - O equipamento chega montado como na wiki: equipado, carregando ou guardado; armas carregadas (a munição do pente sai do total); acessórios nas armas; programas e hardware no cyberdeck; opções de cyberware na base escolhida.
    - Pela regra da mesa, a ficha pode ter duas Roles, cada uma com seu Rank e sua distribuição de sub-habilidades (Solo, Tech, Medtech). O pacote e o orçamento inicial continuam únicos. A Role principal da wiki fica estável, e a Interface usa a Role Netrunner mesmo quando ela é a segunda.
    - Atualizar da wiki mostra os Ranks e as habilidades que mudaram. Só retira Roles criadas pelo importador e removidas da wiki, com a retirada listada na revisão; Roles acrescentadas manualmente no Foundry ficam preservadas. A ficha devolvida à wiki inclui todas as Roles do ator.
    - A importação de duas Roles exige este módulo atualizado no Foundry 12. O sistema v14 ainda não tem esse suporte; seus arquivos não foram alterados por esta implementação.
    - Os veículos da família do Nomad chegam com os upgrades instalados.
    - Moradia, estilo de vida, Trauma Team e moda vão para o Estilo de vida da ficha.
  - **Avisos da wiki:** quando um jogador clica em **Enviar para o mestre** na wiki, o Foundry do mestre avisa (confere ao entrar e a cada minuto) e abre a janela **Personagens da wiki**, com Importar ou Atualizar. Cada envio avisa uma vez. Desliga em Configurações do módulo. Pela macro: `game.modules.get('cpr-2077').api.avisosDaWiki()`.
  - **Atualizar da wiki** (cabeçalho da ficha) traz o que mudou depois, inclusive um retrato novo (troca a imagem da ficha, do protótipo e dos tokens já no mapa) e a **Montagem** que falta na ficha (carregar armas, encaixar acessórios, instalar programas e opções). Pela macro: `api.montagemPendente(ator)` e `api.aplicarMontagem(ator)`.
  - **Local do cyberware:** cyberbraços, cyberpernas e cyberolhos preservam o lado escolhido na wiki; bases recebem o local no nome para distingui-las na ficha. Opções usam o UID da base, inclusive bases manuais pelo ID do Foundry. O retorno da mesa informa local instalado e planejamento separadamente. Compras continuam sem cirurgia automática; mover uma peça já instalada exige ajuste manual no Foundry. Este suporte está no módulo v12; o importador v14 ainda não o oferece.
  - **Membro natural:** a peça única que a wiki pôs num braço ou numa perna natural (Wolvers, Talon Foot…) chega numa base **Meat Arm** ou **Meat Leg** do CORE, criada pelo importador no lado escolhido, de graça e sem Humanidade, como no CORE ("a única peça instalada"). O nome leva o lado: "Meat Arm — Braço direito". Na ficha da wiki, essa base aparece como o membro natural, não como um cyberbraço.
  - **Pedidos da campanha:** os pedidos que os jogadores fazem na loja da wiki aparecem na janela **Personagens da wiki**, com Aprovar (entrega na hora) e Recusar. O mestre ativo entrega sozinho, a cada minuto, o que foi aprovado na wiki: cria os itens, carrega as armas, encaixa acessórios e programas e desconta o dinheiro. O cyberware chega sem instalar. Pela macro: `api.entregarPedidos()`.
  - **Na mesa:** a cada mudança num ator da wiki, o Foundry do mestre ativo manda a ficha de volta para a wiki (HP, Humanidade, dinheiro, Pontos de Melhoria, itens, munição…). Ao entrar, manda todos uma vez. O cyberware vai com o tipo, o tamanho e os slots de cada peça (os da ficha, com upgrades): é o que a aba Cyberware da ficha da wiki desenha. Desliga em Configurações do módulo → Mandar a ficha para a wiki. Pela macro: `game.modules.get('cpr-2077').api.enviarParaWiki(ator)`.
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

As regras são as do **Mission Kit** (p. 31–35). A **classe de 2077** (Power, Tech ou Smart) é um campo da arma: na ficha do item, aba de configurações, logo abaixo do tipo de arma. Um **Rebuild** instalado numa arma comum também dá a classe. Na mesma aba ficam as balas por tiro, o dano com menos balas, o dano do tiro mirado, os dois alvos (Smart), carregar sem a Ação de Movimento (Tech) e a coronha retrátil.

As armas do compêndio "Armas de 2077" já vêm com a classe e as regras de cada modelo. Qualquer outra arma, inclusive as do livro-base, ganha uma classe pela ficha ou por um Rebuild.

| Classe | Na ficha e nos HUDs | Regra |
|---|---|---|
| **Power** | Modo **Ricochete** | A lesão crítica causa 10 de dano bônus em vez de 5 (o botão de dano e o Fluxo de Combate já usam). Ricochete: −4 no ataque (−2 com o Ballistic Coprocessor), com a tabela de DV da própria arma. Num tiro mirado, use o modo mirado: vale só a penalidade dele. |
| **Smart** | Pílula da classe; aviso "sem conexão Smart" | +1 nos ataques à distância. **Só dispara conectada:** o Neuroport (Personal Link), Interface Plugs ou Subdermal Grip. Com a **munição Smart melhorada** carregada, a nota do cartão traz a segunda chance, que o Fluxo de Combate rola: errou a DV (ou a esquiva) por 5 ou menos, 14 + 1d10 com as penalidades do primeiro tiro. |
| **Tech** | Botão **Carregar** | Carregar gasta a Ação de Movimento e anuncia no chat. Carregada (até disparar ou 20 rodadas), o próximo ataque ignora metade do SP do alvo (o botão de dano e o Fluxo de Combate já usam) e atravessa cobertura fina; disparar descarrega. |

As regras de cada modelo (flags do compêndio):

- **Balas por tiro** (Yukimura, Shingen, Masamune, Chao, Kappa, Nowaki, Zhuo): o tiro único gasta o tanto de balas da regra; com menos no pente, dispara o que tem com o dano menor (a Zhuo não dispara com menos de 8).
- **Unity:** 4d6 no tiro mirado. **Zhuo:** 4d6 e só aceita munição Smart melhorada.
- **Omaha:** carregada até o fim do turno em que disparou, com CDT 2 e até 3 balas por ataque. **Burya:** carrega sem a Ação de Movimento. **Nekomata:** carregada, atravessa cobertura fina e grossa.
- **Carnage** (BODY menor que 10) e **Burya** (sem Grafted Muscle and Bone Lace nem cyberbraço): o cartão e um aviso dizem que o atirador sofre a lesão crítica.
- **Grad:** depois do tiro, o botão "Manejar o ferrolho" trava o próximo ataque até gastar a Ação.
- **Palica:** pergunta se dispara os dois canos (gasta os 2 cartuchos, 4d6).
- **Kappa:** trava dois alvos a até 4 m um do outro. Com o Fluxo de Combate, se o ataque não pegar o primeiro, as balas vão para o segundo.
- **Dian:** a coronha recolhe pela pílula na linha da arma (−1 nos ataques até estender).
- **Qualidade excelente:** +1 no ataque, como as armas Excellent do livro-base. As armas importadas antes da correção ganham o +1 na rolagem.
- **Tudo passa pela rolagem do sistema:** a janela de rolagem, a munição, a Sorte e o cartão.
  - O cartão traz uma nota com cada regra que valeu no tiro.
  - O botão de dano do cartão leva os ajustes do tiro (o dano com menos balas, os dois canos, a metade do SP da carga).
  - Com o **Fluxo de Combate** e um alvo marcado, a defesa e o dano saem por ele.

Configuração do módulo: **Conexão das armas Smart** (exige a conexão instalada, o padrão; ou "todo mundo tem o Neuroport", que não confere).

As macros **Ricochete** e **Carregar arma Tech** do compêndio "Macros de 2077" são atalhos: escolhem a arma e atacam (ou carregam) pelo mesmo caminho.

Armas importadas antes desta versão guardam as opções antigas do suplemento de fã (teste Smart, rajada da carga): troque-as pelas do compêndio para ter as regras do Kit.

## Gerar ou atualizar o módulo

O jeito fácil: feche o Foundry e dê dois cliques em `atualizar-modulo.bat`, na pasta da wiki. Ele faz o mesmo que estes comandos, rodados nesta pasta com o Foundry fechado (ou sem nenhum mundo que use o módulo aberto):

```
node build/extract-core.mjs   # na primeira vez, quando o sistema atualizar e quando a lista de pacotes mudar (o Black Chrome entrou em 2026-10)
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
| `scripts/cpr-2077.mjs` | Entrada do módulo: as configurações e a API das macros. |
| `scripts/armas2077.mjs` | Armas de 2077 no menu de ataque: classe na ficha do item (ou pelo Rebuild), o Ricochete e o Carregar na ficha e no Combat HUD, as regras de Power, Smart e Tech do Mission Kit e as de cada arma. |
| `scripts/macros.mjs` | Atalhos Ricochete e Carregar arma Tech. |
| `scripts/wiki.mjs` | Importar da wiki e Atualizar da wiki (personagens do criador). |
| `build/loja.mjs` | Gera o `loja-catalogo.js` da wiki (também roda sozinho): os itens do RED, do Black Chrome e do Black Chrome Plus (compêndios do sistema, com o nome e a descrição das páginas Black Chrome da wiki) e os de 2077 do módulo. |
| `data/loja-nomes.json` | Nomes em português dos itens do sistema na loja. |
| `styles/cpr-2077.css` | Visual dos diários e das mensagens no chat. |
| `data/veiculos-2077.json` | Veículos do jogo e a classe do RED usada em cada um. |
| `data/npcs-faccoes.json` | Variantes de facção sobre as fichas do livro. |
| `data/leia-primeiro.html` | O diário "Leia primeiro" do módulo. |
| `build/*.mjs` | Geração dos compêndios. |

## Adaptações

- **Veículos:** nem o Mission Kit nem o suplemento de fã trazem veículos. Os carros do jogo usam os números de uma classe do RED ou do Black Chrome, indicada na descrição de cada um.
- **Metralhadoras só de autofogo** (Defender, Mk.31): seguem a Tsunami Arms Helix do livro-base, com dano 2d6 × multiplicador de autofogo.
- **Armas do suplemento de fã:** seguem as regras de Power, Smart e Tech do Kit. O que o suplemento fazia de outro jeito (o teste Smart de 10 ou 12 + 1d10, a rajada carregada, o "esfriar", as flechettes) saiu; as armas de várias balas Smart passaram a gastar 3 balas e causar mais dano, como a Yukimura do Kit. A dica "Na mesa" de cada arma diz o que mudou.
- **Kappa** ("redireciona as balas para o segundo alvo"): lido como "se o ataque não pegar o primeiro, vai para o segundo, a até 4 m dele".
- **Inconsistências do livro:** quando o livro se contradiz (dano, pente, perícia), o item usa o texto e a descrição mostra o valor da tabela.
