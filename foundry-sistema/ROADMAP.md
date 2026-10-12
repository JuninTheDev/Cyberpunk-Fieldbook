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
- [x] **Editor de Dor** (desvio de regra, achado na revisão de 2026-10-12): zerava também o −4 de mortalmente ferido.
  Fonte: a wiki ("Pain Editor: Ignora penalidades de Seriously Wounded", system-catalog.js) e o CORE
  (`getWoundStateMods`). Agora tira só o −2 de gravemente ferido. (Ciclo 16)
- [x] **Desinstalar cyberware devolvia a Humanidade** (desvio de regra, achado na revisão de 2026-10-12): dava para
  tirar e pôr de novo para rolar a perda outra vez. Fonte: a wiki ("Humanidade, terapia e drogas": cada peça reduz o
  máximo, e a Humanidade volta pela terapia) e o CORE (`uninstallCyberware` só recalcula o máximo). (Ciclo 16)
- [x] **O master na branch** (Mission Kit, Black Chrome, visual novo): o build quebrava no grupo `neuroport` do Kit, e
  os testes de regra caíam para 29 de 31. Agora o conversor de 2077 segue o Kit. (Ciclo 16)

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
- [x] **A mesa no servidor e a migração** (Ciclo 16):
  - o endereço da wiki deduzido de `mesa.<domínio>`, como o cpr-2077;
  - só o ator ligado ao personagem entrega pedidos e manda a ficha (a wiki recusa o "ator antigo");
  - o pacote das cenas: as cenas, os diários e as playlists do mundo do Foundry 12 num módulo, com os arquivos.
- [ ] **Black Chrome** (bloqueador da migração para quem tiver os itens): os 176 itens da loja.
  - Converter dos compêndios do CORE (`black-chrome_*` e `dlc_black-chrome-plus`): armas com Combinação, cyberdedos, Linear Frames, moda, equipamento e veículos.
  - Mais as regras novas (dano direto no HP, Combinação).
  - Hoje o importador e os pedidos avisam e não entregam.
- [ ] **Da wiki:** a janela "Personagens da wiki" (Importar, Importar da mesa, aprovar pedidos) na barra dos atores; "Atualizar da wiki" (hoje, importar de novo cria outro
  ator); retrato.
- [ ] **Inventário:** usar uma droga (gasta a dose, liga o efeito pela duração e pede o teste de vício); o Medscanner
  e o Techscanner que, pela wiki, não acumulam com outro; a luz da lanterna e do sinalizador no token.
- [ ] **Na rolagem:** Sorte; Briga e Artes Marciais (dano pelo BODY), com o Ataque de Precisão e a Recuperação de
  Falhas do Solo; Facedown.
- [ ] **Consciência de Combate na ficha:** redistribuir os pontos (a wiki permite antes do combate ou com uma ação) e
  mostrar os nomes em português. Hoje a ficha só lista as habilidades, com os nomes do CORE, e os pontos vêm da
  importação.
- [ ] **Do Fluxo de Combate:** quem vê o cartão do resultado; texto e animação no token.
- [ ] **Acessórios:** o limite de slots (hoje a ficha só mostra "5 de 3"); os plugs que o Smartgun Link exige; a luneta
  de precisão (+1 em tiro único ou mirado a 51 m ou mais); a arma sob o cano (lança-granadas e espingarda) como
  segunda arma; o pente que fica acima do máximo quando o carregador sai.
- [ ] **Veículos no combate:** o dano no SDP, as armas instaladas (metralhadora, lança-chamas), o vidro blindado como
  cobertura, e a regra de que só um veículo da família fica com o Nomad por vez.
- [ ] **Armas de 2077, pelo Mission Kit:**
  - os modos de cada classe: a Power (+5 na lesão crítica e o Ricochete), a Smart (+1 e a conexão pelo Personal Link) e a Tech (Carregar);
  - os Rebuilds e a segunda chance da munição Smart melhorada.

  As armas já entram com a classe, a origem e as regras próprias na flag `arma2077` (Ciclos 12 e 16).
- [ ] **Cyberware que é arma** (Wolvers, Mantis Blade, Gorilla Arm, o lança-granadas embutido): hoje é só cyberware e
  não ataca.
- [ ] **Efeitos das munições especiais:** os testes de resistência da biotoxina, do veneno, da sonífera, do flashbang e
  do gás; o fogo da incendiária; a segunda lesão da expansiva; a munição inteligente.

## P3: Netrunning, cyberware, NPCs e ferramentas do mestre

- [ ] **NET:** o NET Architect dentro do sistema (Interface, programas, Black ICE, dano no cérebro).
- [ ] **Cyberware:** base e slots ao instalar (com as opções na base, como a montagem da wiki), terapia e ciberpsicose.
- [ ] **NET de 2077:** a RAM e o Cooling do deck, os quickhacks e os daemons.
- [ ] **NPCs:** ficha de capanga (mook), Black ICE e demônios como atores.
- [ ] **Ferramentas do mestre:** o Painel Tático dentro do sistema.

## P4: refatoração, desempenho, acessibilidade e documentação

- [ ] Dividir o `combate.mjs` (pedidos pelo socket, modos, cartão).
- [ ] Tradução para inglês (hoje, o arquivo `en` aponta para o português).
- [ ] Acessibilidade das fichas: teclado e contraste no tema claro.
- [ ] Ícones próprios no lugar dos genéricos do Foundry.

## Decisões tomadas

- **2026-10-11, migração da campanha:** pela ficha "Na mesa" que o Foundry 12 manda para a wiki ("Importar da
  mesa"), e não pela conversão dos atores do Foundry 12. Decisão do usuário.

- **2026-10-11, arma branca contra SP ímpar:** vale SP efetivo 6 para SP 11, como o CORE e o Fluxo de Combate (o que a
  mesa usa hoje). A wiki diz "ignoram metade do SP (arredondado p/ cima)", e o texto também cabe na leitura 5.
  Decisão do usuário.
