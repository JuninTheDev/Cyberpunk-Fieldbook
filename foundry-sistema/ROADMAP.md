# Roadmap do sistema Cyberpunk RED — Fieldbook (Foundry 14)

Ordem de trabalho: P0 → P4. Não começa uma prioridade enquanto houver problema crítico conhecido numa acima. Cada
tarefa só fecha com os portões de [QUALITY_GATES.md](QUALITY_GATES.md) passando e o [MIGRATION_STATUS.md](MIGRATION_STATUS.md)
atualizado. Os achados vêm da auditoria de 2026-10-11 e da comparação com o CORE de 2026-10-12 (o que o Foundry 12 da
mesa faz e o sistema não; método e evidências no MIGRATION_STATUS).

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
- [x] **Munição** (desvio de regra, achado ao escrever o teste da borracha): o conversor transformava a ablação 0 do
  CORE em 1 (borracha, biotoxina, veneno, fumaça, gás lacrimogêneo e paintball), e a borracha causava lesão crítica.
  Fonte: a tabela de munição da wiki (system-catalog.js): a borracha "não causa lesão crítica nem ablação", e a
  biotoxina e a venenosa "não causam ablação". (Ciclo 4)
- [x] **Tipo do cyberware trocado ao salvar a ficha do item** (dados, achado no ciclo 7): as chaves de
  `TIPOS_CYBERWARE` não eram as do catálogo (`cyberEye`, `cyberAudioSuite`, `cyberwareInternal`, `cyberwareExternal`).
  O select mostrava a primeira opção, e mudar qualquer campo gravava o tipo como `fashionware`. Agora as chaves batem, e
  a ficha do item garante o valor atual entre as opções de todo select. (Ciclo 7)
- [x] **Munição que não causa dano** (Ciclo 5): a wiki diz que biotoxina, veneno, EMP, flashbang, sonífera e gás
  lacrimogêneo "não causam dano", e a fumaça só cobre a área, mas o sistema aplicava o dano da arma. Agora quem é pego
  não leva dano, e o cartão diz o efeito com o texto da wiki. Os testes de resistência automáticos ficam para o P2.
- [x] **Bônus de Role nas perícias que valem sempre** (desvio de regra, achado na comparação com o CORE; Ciclo 23): no
  Foundry 12, o item de Role soma o Rank em perícias, e aqui nada somava. Quem migrasse ficava com essas perícias menores
  que na mesa. Fonte: a wiki (system-catalog.js e system-2077.js) e os itens de Role do CORE e do cpr-2077
  (`foundry-2077/build/roles.mjs`):
  - **Nomad, Moto:** o Rank em Conduzir Veículo Terrestre, Pilotar Veículo Aéreo e Marítimo, e Tecnologia de Veículos
    Terrestres, de Aeronaves e Marítimos;
  - **Face, a especialização:** o Rank em duas perícias (Siren: Conversação e Cuidados Pessoais; Rockerboy: Tocar
    Instrumento e Manha; Model: Atuação e Comércio);
  - **a especialização vem da wiki:** a importação e a migração guardam a escolhida (o `resultado.role.especializacao`
    do criador; a ficha "Na mesa" não a manda), e a aba Role a mostra e troca;
  - **ficam para a janela de rolagem (P1), porque são situacionais:** o Investigator do Lawman (o Rank em Educação e
    Percepção, e nas perícias da especialização, com pista de caso ativo) e o Netrunner de 2077 (o Rank de Interface nos
    testes técnicos enquanto corre a NET). No Foundry 12, o do Lawman se marca na janela de rolagem.

## P1: bugs, testes de regressão e confiabilidade

- [x] **Portões de qualidade** (Ciclo 2):
  - testes unitários das regras puras com `node --test`: rolagem, dano, armadura, lesão, Death Save, defesa, autofogo e área;
  - ESLint com versão exata pelo npx, sem node_modules;
  - o cenário do Foundry 14 falhar com aviso de compatibilidade vindo do sistema;
  - teste da parede no fogo supressivo;
  - versão exata e hash conferido do que o build baixa (js-yaml da CDN, foundryvtt-cli do npm).
- [x] **Combate** (Ciclo 3):
  - as habilidades do Solo (Consciência de Combate) como a wiki descreve: Reação de Iniciativa, Ataque de Precisão,
    Ponto Fraco, Deflexão de Dano, Recuperação de Falhas e Detecção de Ameaça. O Ponto Fraco e a Deflexão valem uma vez
    por rodada do combate, e o Desfazer devolve o que o ataque gastou;
  - −6 MOVE (mínimo 1) do mortalmente ferido;
  - o ataque de um jogador sem mestre na mesa para antes de gastar a bala e de rolar.
- [x] **Lacunas de teste** (Ciclo 6): escudo (com o explosivo que passa do escudo destruído), "responder pelo
  jogador", corpo a corpo com esquiva, armadura pesada, janela do mestre para a defesa de NPC e os erros da importação.
  A munição de borracha ganhou teste no ciclo 4.
- [ ] **A janela de rolagem** (achado na comparação com o CORE): no Foundry 12, todo teste passa pela janela do CORE, e
  os três módulos da mesa dependem dela (o Fluxo, o NET Architect e o Painel Tático: "confere os modificadores, põe
  Sorte e confirma"; Ctrl pula). Aqui o teste rola direto. Falta:
  - o modificador avulso (o que o mestre manda somar);
  - os modificadores comuns do livro, pela tabela da wiki (RED p. 130, system-rules.js): noite ou pouca luz e nunca fez
    antes (−1); tarefa complexa, sem as ferramentas certas, dormiu mal e tensão extrema (−2); exausto, muito bêbado ou
    sedado, em segredo e encoberta por fumaça ou escuridão (−4); perícia complementar e tempo extra (+1);
  - os efeitos situacionais, ligados ou não na hora: os que hoje ficam de fora (Audição Amplificada, Image Enhance, o
    Sandevistan ligado, Dedos esmagados), o Investigator do Lawman e o Netrunner de 2077 (P0, acima);
  - a Sorte na própria janela (hoje, preparada na ficha, ciclo 20), para o jogador que prefere assim.

## P2: fichas, inventário, equipamento, armas e combate

- [x] **Tipos de item que o importador descartava** (bloqueador da migração da campanha):
  - [x] equipamento, roupa e droga, com a quantidade, o uso da montagem da wiki e os efeitos do equipamento pelo uso
    (Ciclo 8);
  - [x] cyberdeck e programa, com os programas no deck (Ciclo 9);
  - [x] acessório de arma e hardware de cyberdeck (os upgrades), no lugar da montagem (Ciclo 10);
  - [x] veículo (os da família do Nomad, com os upgrades) (Ciclo 11);
  - [x] o conteúdo de 2077 que a loja da wiki vende: armas-2077, netrunning-2077 e cyberware-2077 (Ciclo 12).
- [x] **Volta da ficha para a wiki e pedidos da loja** (bloqueador da migração):
  - [x] a ficha volta para a wiki a cada mudança ("Na mesa"), no formato do cpr-2077 (Ciclo 13);
  - [x] a entrega dos pedidos da loja aprovados pelo mestre (Ciclo 14).
- [x] **O estado de jogo da campanha** (bloqueador da migração): "Importar da mesa" monta o ator pela ficha que o
  Foundry 12 manda para a wiki (Ciclo 15). Procedimento no MIGRATION_STATUS.
- [x] **Da wiki, a janela "Personagens da wiki"** (botão na aba de Atores): Importar, Importar da mesa, abrir a ficha,
  aprovar e recusar pedidos (Ciclo 16).
- [ ] **Da wiki, o resto:** "Atualizar da wiki" (hoje, importar de novo cria outro ator), os avisos de envio, o retrato e
  a campanha da wiki de cada mundo (a janela lista os personagens de todas as campanhas).
- [ ] **Inventário:** usar uma droga (gasta a dose, liga o efeito pela duração e pede o teste de vício); o Medscanner
  e o Techscanner que, pela wiki, não acumulam com outro; a luz da lanterna e do sinalizador no token.
- [x] **Na rolagem, a Sorte** (Ciclo 20): os pontos preparados na ficha entram no próximo teste, +1 cada, e saem da
  Sorte; o ↺ do começo da sessão.
- [ ] **Na rolagem, o resto:** Briga e Artes Marciais (dano pelo BODY), com o Ataque de Precisão e a Recuperação de
  Falhas do Solo; Facedown (COOL + Reputação + 1d10, como o CORE).
- [ ] **As rolagens das Roles** (o CORE rola pelo item de Role; aqui só o Solo tem efeito):
  - Impacto Carismático do Face (Rank + 1d10 contra DV 8, 10 ou 12) e Credibilidade da Media (Rank + 1d10);
  - Barganha do Corpo (o Operator do Fixer: COOL + Comércio + Rank + 1d10, teste enfrentado);
  - as especialidades do Tech (Field, Upgrade, Fabrication e Invention Expertise);
  - Cirurgia e Tecnologia Médica do Medtech: só ele tem as duas perícias, que hoje não existem para rolar (TECH + 2 por
    ponto de Cirurgia; TECH + os pontos de Farmacêutica e de Criossistemas, como a wiki e o CORE 0.92.3).
- [ ] **Na ficha, o que o CORE e o Painel Tático têm:** consertar a armadura com um clique (hoje, só editando o SP na
  ficha do item); rolar uma lesão crítica à mão (uma queda, uma explosão fora do ataque); macros na barra (arrastar
  uma arma ou uma perícia).
- [ ] **Inventário, o resto do CORE:** juntar itens iguais ao soltar na ficha (munição, equipamento) e dividir uma
  pilha; avisar quando as armas equipadas pedem mais mãos do que há.
- [x] **A ficha nova** (Ciclo 19), no visual do modelo de ficha da mesa: o painel geral em três colunas, as abas
  Combate, Equipamento, Cyberware, Role, NET e Vida, o apelido e o Lifepath (com a importação da wiki), as perícias de
  família pela ficha e o tema escuro com as fontes embutidas, também na ficha do item. A aba Role mostra as
  especialidades (Solo, Tech, Medtech) com os nomes em português e os pontos editáveis, o que dá para redistribuir a
  Consciência de Combate.
- [x] **A ficha, o resto do visual e da Role** (Ciclo 20): os cartões do chat no visual da ficha e a conferência dos
  pontos de Role pelo Rank.
- [x] **Extrato de Eurodólares, IP e Reputação** (Ciclo 21), como o ledger do CORE no Foundry 12: o botão de cada um no
  cabeçalho abre a janela com o menu (somar, subtrair, definir, com o motivo) e o histórico (quem mudou, a mudança
  direta); o mestre tira linhas, desfazendo ou não a mudança; a importação, a migração e a loja da wiki escrevem as
  linhas delas.
- [ ] **Na migração, o histórico do ledger do Foundry 12:** a ficha "Na mesa" só manda o saldo, e o extrato começa com
  ele. Trazer o histórico exige que o módulo da mesa (cpr-2077) mande as `transactions`, o que mexe no Foundry 12 da
  campanha (decisão do usuário).
- [ ] **Do Fluxo de Combate:** quem vê o cartão do resultado; texto e animação no token.
- [ ] **Acessórios:** o limite de slots (hoje a ficha só mostra "5 de 3"); os plugs que o Smartgun Link exige; a luneta
  de precisão (+1 em tiro único ou mirado a 51 m ou mais); a arma sob o cano (lança-granadas e espingarda) como
  segunda arma; o pente que fica acima do máximo quando o carregador sai.
- [ ] **Veículos no combate:** o dano no SDP, as armas instaladas (metralhadora, lança-chamas), o vidro blindado como
  cobertura, e a regra de que só um veículo da família fica com o Nomad por vez.
- [x] **Armas de 2077, os modos de cada classe** (bloqueador da migração, Ciclo 17): o Ricochete da Power (DV da tabela
  de autofogo, um dado a menos, +2 do Ballistic Coprocessor); a Carga e a Rajada Tech (a janela pergunta a cobertura, o
  que atravessa, a ablação 4 ou 2, as balas da rajada de cada arma, a arma que esfria uma rodada); o teste Smart (10 ou
  12 + 1d10, só com o Smart Link), com as três configurações do cpr-2077 (os mesmos padrões).
- [x] **Armas de 2077, as regras de cada modelo que o texto deixa claras** (Ciclo 18): os dois canos da Palica (teste
  Smart 12 + 1d10) e da Testera (4d6), com 2 cartuchos; os dois alvos da Kappa; a coronha recolhida da Dian (−1, pelo
  botão da ficha); as 7 balas do autofogo da Lexington. As que só disparam cartucho não mostram o Ricochete.
- [ ] **Armas de 2077, o resto das regras de cada modelo:**
  - **esperam a decisão da mesa** (MIGRATION_STATUS, dúvidas): a carga da Satara (os dois cartuchos, 4d6), a Burya
    (todo tiro é carga), o supressivo da Senkoh pela carga (as 30 balas), e se "dispara três balas" e "só dispara em
    rajadas de três" gastam 3 balas por tiro;
  - **o +1 em tiro único entre 13 e 50 m** da Nowaki, da Masamune e da Kyubi: um bônus pela distância de cada alvo,
    como a luneta de precisão (Acessórios);
  - **o que não é regra de ataque:** o BODY mínimo (Burya, Grad, SOR-22) e a recarga de duas Ações.

  A descrição de cada arma diz o que o sistema faz e que o resto é com o mestre, e a carga com cartucho é recusada com
  aviso.
- [ ] **Cyberware que é arma** (Wolvers, Mantis Blades, Gorilla Arms, o lança-granadas embutido): hoje é só cyberware e
  não ataca.
- [ ] **Efeitos das munições especiais:** os testes de resistência da biotoxina, do veneno, da sonífera, do flashbang e
  do gás; o fogo da incendiária; a segunda lesão da expansiva; a munição inteligente; o EMP, que desliga os itens
  eletrônicos (o CORE marca cada item e tem a macro "Get EMP'd").

## P3: Netrunning, cyberware, NPCs e ferramentas do mestre

- [ ] **NET:** o NET Architect dentro do sistema (Interface, programas, Black ICE, dano no cérebro).
- [ ] **Cyberware:** base e slots ao instalar (com as opções na base, como a montagem da wiki), terapia e ciberpsicose.
- [ ] **NET de 2077:** a RAM e o Cooling do deck, os quickhacks e os daemons.
- [ ] **NPCs:** ficha de capanga (mook), Black ICE e demônios como atores.
- [ ] **Ferramentas do mestre:** o Painel Tático dentro do sistema; o contêiner do CORE (loja, saque e esconderijo, com
  o registro das trocas).
- [ ] **Conteúdo fora do livro básico:** o Black Chrome e os DLCs do CORE 0.92.4, as tabelas de arquitetura da NET e as
  macros e cenas do CORE. A loja da wiki não vende esses itens; se o mestre deu algum no Foundry 12, a migração avisa
  item a item. Converter o que a mesa usar.

## P4: refatoração, desempenho, acessibilidade e documentação

- [ ] Dividir o `combate.mjs` (pedidos pelo socket, modos, cartão).
- [ ] Tradução para inglês (hoje, o arquivo `en` aponta para o português).
- [ ] Acessibilidade das fichas: teclado e leitor de tela (desde o ciclo 19, a ficha é sempre escura).
- [ ] Ícones próprios no lugar dos genéricos do Foundry.
- [ ] Conveniências do CORE: a régua que mostra o DV da arma pela distância e o DV no HUD do token (o ataque já calcula
  o DV sozinho); "Hardened" (Danger Gal Dossier p. 150, fora da wiki: só se a mesa quiser).

## Fora do plano: o que só existe no CORE 0.93

A pasta `fvtt-cyberpunk-red-core-dev/` é a 0.93, de desenvolvimento; a mesa usa a 0.92.4. Pelo CHANGELOG, isto entrou
depois e a mesa não tem: o navegador de documentos com o carrinho de compras (a loja da wiki faz esse papel), os
modificadores `red` e `dmg` nas fórmulas, o crítico configurável por arma e munição (aqui a munição já diz o que não
causa lesão), a Sorte caseira do JonJon, os marcadores de turno e o tema estendido ao Foundry. Entram só se o usuário
pedir.

## Decisões tomadas

- **2026-10-11, migração da campanha:** pela ficha "Na mesa" que o Foundry 12 manda para a wiki ("Importar da
  mesa"), e não pela conversão dos atores do Foundry 12. Decisão do usuário.

- **2026-10-11, arma branca contra SP ímpar:** vale SP efetivo 6 para SP 11, como o CORE e o Fluxo de Combate (o que a
  mesa usa hoje). A wiki diz "ignoram metade do SP (arredondado p/ cima)", e o texto também cabe na leitura 5.
  Decisão do usuário.
