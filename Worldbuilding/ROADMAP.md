# A base do mundo: o worldbuilding na wiki

**Pedido do usuário (2026-11-02):** melhorar o worldbuilding e a organização das informações do mundo, com inspiração
no Chronicler (`github.com/mak-kirkland/chronicler`). Na mesma conversa, a recomendação foi não trocar a linguagem do
projeto: o Foundry só roda JavaScript, a wiki divide código com o sistema, e a base da campanha que já existe é o ponto
de partida.

**Como usar este arquivo:**

- Cada item tem um código (B1, B2…). `[x]` é feito; `[~] (sessão, data)` é reservado, com push antes de começar; `[ ]`
  está livre.
- **A wiki é do usuário (AGENTS.md):** um item só começa quando ele pedir. As escolhas dele ficam em **Decisões do
  usuário**, e o item que depende de uma decisão espera por ela.
- A ordem é a recomendada: cada fase já muda o uso sozinha. A Fase 1 não depende de decisão.
- Cada item fecha com:
  - a regra pura em `campanha-base.js` (roda no Node), conferida em `tests/lib/base-estatica.js`
    (`node tests/validar.js base`);
  - o que roda na página, no cenário `tests/cenarios/base.js` (`node tests/rodar.js`, um teste com navegador por vez);
  - o que vai para os jogadores, num caso de `tests/isolados/api.test.js`: o servidor nunca manda o que não foi revelado;
  - as mutações que caem, e o README (**Arquivos** e **Consulta durante a sessão**).
- **O arquivo de hoje continua valendo:** a `base-da-campanha.md` do Morana é lida igual depois de cada item, sem mudar
  uma linha, e o teste dela passa sem mudar.
- **Segredo nunca no que os jogadores baixam:** o `campanha-base.js` só a wiki do mestre carrega. O que vai para os
  jogadores sai do servidor, já filtrado.
- **Sem dependências:** a wiki roda sem instalar nada. O grafo e a linha do tempo são SVG feitos aqui.
- **Do Chronicler, só as ideias:** a licença dele (PolyForm Shield 1.0.0) deixa ler o código, mas não deixa
  reaproveitá-lo num programa parecido.

## O que já existe

- **A base da campanha** (`documentos/morana/base-da-campanha.md`, lida pelo `campanha-base.js`): um registro `### Nome`
  para cada pessoa, facção, lugar, peça, relógio e segredo, com os campos em linhas `- **Campo:** valor` e o texto do
  mestre embaixo. Hoje são 20 registros.
- **Os nomes já viram link sozinhos** nos documentos (pelo nome e pelos `Também`), uma vez por seção, com o cartão ao
  passar o mouse: o lado, onde está e a situação de agora.
- **As citações:** `{{base:pecas}}` e as outras viram a tabela de agora; `{{doc:arquivo.md#secao}}` traz um trecho de
  outro documento.
- **O Estado da campanha:** o que muda na mesa (a situação, onde está, a atitude, os segredos revelados, os relógios)
  fica no servidor e aparece nos cartões e nas tabelas.
- **A conferência** (`conferir`): o nome repetido, a ficha de NPC e o ponto do mapa que não existem, o campo que falta.
- **A busca** acha cada seção `###` dos documentos, e o **Índice A–Z** lista os cartões.

## O que falta

- **O mesmo lugar em três lugares.** O Pachinko de Wakako está:
  - na base (`### Pachinko de Wakako`, com `Mapa: wakako-jig-jig`);
  - no `campaign-map.js`: o pino, com o título, o distrito e o resumo de novo;
  - no Publicar (Visão dos jogadores → Lugares no mapa), digitado outra vez, com X e Y.

  Com as pessoas é igual: o campo `Para os jogadores` da base e a lista Pessoas do Publicar.
- **Não há o caminho de volta:** o cartão não diz onde o nome aparece (nos documentos, nas sessões, nos outros
  registros).
- **As relações são texto solto** (`Mina Kuroda é a guarda dela; os Tyger Claws a respeitam`): o outro lado não fica
  sabendo, e não dá para montar um grafo.
- **A base é só do Morana:** o `index.html` fixa `documentos/morana/base-da-campanha.md`. As campanhas novas não têm
  base, e o mundo de todas (a lore dos anos 2070, o guia de 2077) é só texto corrido.
- **Um arquivo só:** com o mundo inteiro, a base fica longa. O Chronicler e o Obsidian trabalham com um arquivo por
  página.
- **Os jogadores não têm um arquivo do mundo:** veem as listas do Publicar, sem os links entre os nomes.

## Do Chronicler para cá

| No Chronicler | Aqui |
|---|---|
| `[[Wikilinks]]` | O link automático pelo nome já existe; o `[[Nome]]` explícito é o B2. |
| Backlinks | "Citado em" (B1). |
| Infobox e modelos por tipo | O cartão e os campos de cada tipo já existem; a imagem é o B15. |
| Spoilers | O mestre e os jogadores já são separados pelo servidor; B6 e B7 levam a base para os jogadores. |
| Tags em níveis | B10. |
| Diagnóstico do cofre | A conferência já existe; a saúde da base é o B4. |
| Mapa com pinos ligados às páginas | B5. |
| Linha do tempo com calendário próprio | B13. |
| Árvore de família | O grafo de relações (B14). |
| Importar do Obsidian, um arquivo por página | B11 e B12. |

## Fase 1: ligar o que já existe

- [ ] **B1 · Citado em:** cada cartão em Pessoas e facções e em Lugares e peças ganha a lista "Citado em": os
  documentos e as seções (`###`) onde o nome aparece, e os outros registros que citam esse. Cada linha leva à seção.
  - A regra é a mesma dos links: o nome e os `Também`. Entram os documentos da campanha e os de `night-city`.
  - Regra pura: `citacoes(base, documentos)` em `campanha-base.js`.
  - Teste: um nome citado em dois documentos aparece com as duas seções; o `Também` conta; o próprio cartão não conta.
- [ ] **B2 · O link explícito `[[Nome]]`:** nos `.md`, `[[Nome]]` e `[[Nome|texto]]` viram o link do registro, com o
  cartão, como o link automático.
  - Serve onde o automático não liga: a segunda menção na mesma seção, ou uma forma diferente do nome.
  - É também a forma que o Obsidian entende (B12).
  - Um `[[...]]` sem registro é erro na conferência, e a página mostra o texto sem link.
- [ ] **B3 · As relações com nome e papel:** `- **Relações:** Mina Kuroda (guarda); Tyger Claws (respeitam)`.
  - Cada nome vira link, com o papel ao lado.
  - O cartão do outro registro mostra a relação de volta ("Wakako Okada: guarda").
  - O texto que não segue o formato continua aparecendo como hoje, e a conferência avisa do nome que não existe.
- [ ] **B4 · A saúde da base:** a conferência ganha:
  - **erros**, que seguram o `validar.js`: o `[[link]]` quebrado (B2) e o `{{base:item:x}}` sem registro;
  - **avisos**, numa seção "Conferência da base" no Estado da campanha, para o mestre: o registro que nenhum documento
    cita e a relação com um nome que não existe (B3).

## Fase 2: uma fonte só para o mestre, o mapa e os jogadores

Depende das decisões 1 e 2.

- [ ] **B5 · O pino do mapa mostra o lugar da base:**
  - o pino de um ponto que está no `Mapa:` de um registro abre o cartão do lugar: a situação de agora, o Estado e o
    "Citado em";
  - o título, o distrito e o resumo saem do `campaign-map.js`, e o pino fica com a posição, a categoria e o código;
  - o que só o pino tem (o gancho, o encontro, a pista) fica nele até a decisão 1.

  Teste: o pino do Pachinko de Wakako mostra o distrito da base, e mudar a situação no Estado muda o pino.
- [ ] **B6 · A Visão dos jogadores lê da base:**
  - em Pessoas e em Lugares no mapa, o mestre escolhe um registro da base e marca Revelado;
  - o texto que vai é o `Para os jogadores` do registro, e a posição vem do ponto do mapa;
  - os itens digitados que já existem no Publicar continuam e se ligam ao registro pelo nome. Um item sem registro
    continua possível.

  **Segurança:** o servidor monta o que vai para os jogadores a partir da base (o `api-netwire-ia.js` já lê a base no
  servidor) e manda só os campos públicos dos registros revelados. Teste em `tests/isolados/api.test.js`: nunca chegam
  ao jogador um registro não revelado, o texto do mestre, o `Lado`, as relações nem os segredos.
- [ ] **B7 · O arquivo dos jogadores:**
  - na visão dos jogadores, os nomes revelados viram link nos resumos das sessões, nas notícias e nos handouts, com um
    cartão que mostra só o que o grupo sabe;
  - uma página com as pessoas, os lugares e as facções reveladas, com o "Citado em" nas sessões;
  - o nome não revelado fica como texto: o cartão não pode entregar quem é quem;
  - o código que liga os nomes vai para um arquivo que as duas wikis carregam, sem dados. Os dados dos jogadores vêm do
    servidor, já filtrados.

## Fase 3: o mundo de todas as campanhas

Depende das decisões 3 e 4.

- [ ] **B8 · A base em toda campanha:** a base deixa de ser fixa no Morana (`index.html`).
  - Toda campanha com `documentos/<id>/base-da-campanha.md` ganha Pessoas e facções, Lugares, o Estado e os links.
  - A seção "Peças de Morana" continua do Morana; nas outras campanhas, a seção é "Peças".
  - Teste: uma campanha de teste com uma base pequena.
- [ ] **B9 · A base de Night City:** `documentos/night-city/base-do-mundo.md`, no mesmo formato, com o que vale para
  todas as campanhas: os distritos, as corporações, as gangues e a gente conhecida da cidade.
  - Tipos novos: Distrito (com os bairros dentro: Kabuki em Watson) e Evento (B13).
  - **A base da campanha soma por cima:** um registro com o mesmo nome completa o do mundo. A Arasaka do Morana
    acrescenta o `Aparece` e o texto do mestre; o `Lado`, a situação e o Estado são da campanha.
  - O guia e a lore continuam como texto, e os nomes deles viram link. Os registros do mundo saem do que eles já dizem,
    sem inventar: o que a lore não diz fica em branco.
  - Conferência: o mesmo nome em dois registros do mundo é erro; um registro da campanha que completa um do mundo não é.
- [ ] **B10 · Etiquetas:** `- **Etiquetas:** watson/kabuki; tyger-claws` em qualquer registro.
  - As etiquetas têm níveis: `watson/kabuki` está dentro de `watson`.
  - O filtro fica no Índice A–Z e nas páginas da base, e a etiqueta vira um termo da busca.
- [ ] **B11 · A base em pasta, um arquivo por registro:** além do arquivo único, a pasta `documentos/<id>/base/`, com um
  `.md` por registro: o título `# Nome`, o campo `- **Tipo:** Pessoa`, os outros campos e o texto.
  - Os dois formatos valem juntos. O servidor junta a pasta numa resposta só, e a wiki lê como lê o arquivo de hoje.
  - Um script converte o arquivo único em pasta, quando o usuário quiser. Ele confere que a base lida antes e depois é
    a mesma.
- [ ] **B12 · O Obsidian como editor (só documentação):** com o B2 e o B11, abrir `documentos/` como cofre no Obsidian dá
  no PC o editor, o painel de backlinks e o grafo, sem programa novo.
  - O `publicar.bat` publica como hoje.
  - Uma seção no README traz o passo a passo, e a pasta `.obsidian/` vai para o `.gitignore`.

## Fase 4: ver o mundo

- [ ] **B13 · A linha do tempo:** registros "Evento" com data (`- **Data:** 2077-03`, ou só o ano), na base do mundo e
  na da campanha.
  - Uma página mostra a linha do tempo do mundo (a lore dos anos 2070) com a da campanha por cima, e as sessões do
    Diário entram como eventos.
  - Os nomes de cada evento viram link, e o "Citado em" do registro mostra os eventos.
- [ ] **B14 · O grafo de relações:** uma página do mestre com quem se liga a quem (pelo B3), em SVG.
  - O filtro é por facção, lugar ou etiqueta, e clicar num nó abre o cartão.
  - Precisa do B3.
- [ ] **B15 · A imagem no cartão:** o campo `- **Imagem:**` pode ser um arquivo em `assets/`, o retrato do ator no
  Foundry ou o token feito no cortador do sistema. A imagem aparece no cartão, no cartão flutuante e, para o que foi
  revelado, no arquivo dos jogadores.

## Fora da ordem

- [ ] **B16 · (só se o usuário quiser) Editar um registro na própria wiki:**
  - antes, é preciso decidir onde a base mora: hoje ela vem do git (pelo `publicar.bat`), e uma edição feita no servidor
    teria de voltar para o git;
  - o Obsidian (B12) cobre a edição no PC sem isso.

## Decisões do usuário

1. **O mapa (B5):** o pino passa a mostrar o lugar da base, e os textos repetidos saem do `campaign-map.js`? O gancho, o
   encontro e a pista do pino viram campos do registro (`- **Gancho:**`…)?
2. **A Visão dos jogadores (B6):** as listas digitadas de Pessoas e Lugares passam a vir da base, e o mestre só marca
   Revelado?
3. **O mundo e a campanha (B9):** o que é do mundo (a Arasaka, os distritos, os NPCs do jogo) e o que é só da
   campanha? A base do mundo sai do guia de 2077 do Morana, da lore dos anos 2070 ou das duas?
4. **Um arquivo por registro (B11) e o editor:** a base vira pasta? O Obsidian no PC (B12) basta, ou vale o editor na
   wiki (B16)?
5. **A ordem:** a recomendada é Fase 1, Fase 2, Fase 3 e Fase 4.
