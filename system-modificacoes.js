// As modificações de armas: a regra da casa da mesa (as decisões do usuário de 2026-11-23, no foundry-sistema/ROADMAP.md,
// "As modificações de armas"), ligada à Invention Expertise do Tech (RED p. 147–148). Não está no RED nem no Mission Kit:
// os acessórios do livro (os 3 slots, as lunetas, os carregadores, o Smartgun Link, os Rebuilds) continuam como são.
// Esta lista (as 26 da proposta que o usuário aprovou em 2026-11-23) é a fonte única: a página da wiki, o catálogo do
// Foundry 14 (foundry-sistema/build/conteudo-mods.mjs, ids "mods-armas:<id>") e a loja (loja-do-14.mjs) leem daqui. O
// "regra" de cada uma é o que o sistema guarda na flag do item e confere (foundry-sistema/scripts/regras-modificacoes.mjs):
// o tipo, os slots, onde ela serve (o encaixe) e os efeitos (a condição e o que muda).
(() => {
  const table = (headers, rows) => `<div class="table-wrap dense"><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const section = (title, body) => `<div class="section" data-toc="${title}"><h3>${title}<span class="ref">Regra da casa</span></h3>${body}</div>`;
  const list = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  const button = (page, label) => `<button class="action" data-page="${page}" type="button">${label}</button>`;

  // As categorias de preço do RED (p. 385). A Cara (500eb) só se compra com um Fixer ou num Mercado Noturno
  // (system-rules.js: sem Fixer, só até Premium).
  const PRECOS = [[1000, 'Muito Caro'], [500, 'Caro'], [100, 'Premium'], [50, 'Oneroso']];
  const categoria = eb => (PRECOS.find(([valor]) => eb >= valor) || [0, 'Barato'])[1];
  const preco = eb => (eb ? `${eb.toLocaleString('pt-BR')}eb (${categoria(eb)})` : 'não se compra');

  // As condições de uso comum.
  const LONGE = { aDistancia: true };
  const TIRO = { modo: ['tiro'] };
  const ataque = valor => [{ alvo: 'ataque', valor }];
  const GRUPOS = {
    situacional: 'Táticas de situação', geral: 'Táticas gerais', sabor: 'Sabor', defeito: 'Defeitos'
  };
  // grupo: a seção da página (as duas primeiras são do tipo "tatica"). texto: a regra; mesa: o que o Foundry 14 faz com ela.
  const mod = (id, nome, grupo, { eb = 0, encaixe, efeitos = [], texto, mesa }) => ({
    id, nome, grupo, tipo: ['situacional', 'geral'].includes(grupo) ? 'tatica' : grupo, tamanho: grupo === 'defeito' ? 0 : 1, eb, encaixe, efeitos, texto,
    mesa: mesa || 'No Foundry, a regra fica no texto da modificação: quem aplica é a mesa.'
  });

  const mods = [
    mod('mira-holografica', 'Mira holográfica', 'situacional', {
      eb: 100, encaixe: LONGE,
      efeitos: [{ rotulo: 'tiro único ou mirado a até 12 m', quando: { todos: [TIRO, { metros: { max: 12 } }] }, entao: ataque(1) }],
      texto: '+1 no ataque em tiro único ou tiro mirado contra um alvo a até 12 m.',
      mesa: 'No Foundry, entra na janela de rolagem: ligada quando o primeiro alvo está a até 12 m, fora quando está mais longe.'
    }),
    mod('mira-medio-alcance', 'Mira de médio alcance', 'situacional', {
      eb: 100, encaixe: LONGE,
      efeitos: [{ rotulo: 'tiro único ou mirado de 13 a 50 m', quando: { todos: [TIRO, { metros: { min: 13, max: 50 } }] }, entao: ataque(1) }],
      texto: '+1 no ataque em tiro único ou tiro mirado contra um alvo de 13 a 50 m (a faixa da Kyubi). Não soma com outro +1 da mesma faixa.',
      mesa: 'No Foundry, entra na janela de rolagem: ligada quando o primeiro alvo está de 13 a 50 m.'
    }),
    mod('compensador', 'Compensador', 'situacional', {
      eb: 500, encaixe: LONGE,
      efeitos: [{ rotulo: 'autofogo', quando: { modo: ['autofogo'] }, entao: ataque(1) }, { rotulo: 'não se esconde', entao: [{ alvo: 'ocultavel', valor: false }] }],
      texto: '+1 no teste de Autofogo. Com ele, a arma não se esconde.',
      mesa: 'No Foundry, entra ligado na janela do autofogo, e a arma deixa de ser ocultável.'
    }),
    mod('bipe', 'Bipé', 'situacional', {
      eb: 100, encaixe: LONGE,
      efeitos: [{ rotulo: 'apoiada e sem ter se movido no turno', quando: { todos: [TIRO, { manual: 'a arma apoiada e sem ter se movido no turno' }] }, entao: ataque(1) }],
      texto: '+1 no ataque em tiro único ou tiro mirado com a arma apoiada, sem ter se movido no turno. Abrir o bipé custa a Ação de Movimento.',
      mesa: 'No Foundry, aparece desligado na janela de rolagem do tiro: quem atira liga quando a arma está apoiada.'
    }),
    mod('cano-de-alta-pressao', 'Cano de alta pressão', 'situacional', {
      eb: 500, encaixe: LONGE,
      efeitos: [{ rotulo: 'contra cobertura e objetos', quando: { alvo: ['cobertura', 'objeto'] }, entao: [{ alvo: 'dano', valor: '1d6' }] }],
      texto: '+1d6 no dano contra cobertura e objetos, nunca contra gente (como o 4Tify do Black Chrome).',
      mesa: 'No Foundry, o cartão do ataque lembra o +1d6: o mestre soma quando o alvo é a cobertura ou um objeto.'
    }),
    mod('lanterna-tatica', 'Lanterna tática', 'situacional', {
      eb: 50,
      texto: 'Anula o −1 de "Iluminação noturna ou fraca" nos ataques com esta arma. Quem procura o atirador no escuro o vê. Não soma com a luneta infravermelha.',
      mesa: 'No Foundry, desligue o −1 da iluminação na janela de rolagem.'
    }),
    mod('defletor-de-ricochete', 'Defletor de ricochete', 'situacional', {
      eb: 500, encaixe: { aDistancia: true, classe: 'power' },
      texto: 'O ricochete da arma Power fica com −3, no lugar de −4. Não soma com o Ballistic Coprocessor (−2).',
      mesa: 'No Foundry, só se instala numa arma Power; o ajuste do ricochete fica com a mesa.'
    }),
    mod('guarda-de-punho', 'Guarda de punho', 'situacional', {
      eb: 100, encaixe: { aDistancia: false },
      texto: 'Quem faz um ataque mirado na mão que segura esta arma tem −2.'
    }),
    mod('correia-de-retencao', 'Correia de retenção', 'geral', {
      eb: 50,
      texto: 'Quando uma lesão faz largar o que está na mão, a arma fica pendurada. Pegá-la de volta custa a Ação de Movimento.'
    }),
    mod('pente-de-troca-rapida', 'Pente de troca rápida', 'geral', {
      eb: 500, encaixe: LONGE,
      texto: 'Recarregar usa a Ação de Movimento, e não a Ação. Não vale em arma de tambor fixo nem de pente fixo.',
      mesa: 'No Foundry, a recarga continua igual (o sistema não conta as Ações): a mesa lembra que ela foi com a Ação de Movimento.'
    }),
    mod('supressor', 'Supressor', 'geral', {
      eb: 500, encaixe: LONGE,
      texto: 'O tiro não se ouve sozinho: quem está fora da linha de visão precisa de Percepção DV15 para ouvi-lo. O dano não muda. O RED não tem supressor: este é o da mesa.'
    }),
    mod('cabo-balanceado', 'Cabo balanceado', 'geral', {
      eb: 100, encaixe: { aDistancia: false, tipos: ['lightMelee', 'medMelee'] },
      texto: 'A arma branca leve ou média é feita para o arremesso (Atletismo), como a Tomahawk.'
    }),
    mod('carga-silenciosa', 'Carga silenciosa', 'geral', {
      eb: 100, encaixe: { aDistancia: true, classe: 'tech' },
      texto: 'Carregar a arma Tech não brilha nem zumbe: sem o −4 de "Tentando fazer em segredo" quando a carga é escondida.',
      mesa: 'No Foundry, só se instala numa arma Tech; a regra fica no texto.'
    }),
    mod('trava-biometrica', 'Trava biométrica', 'geral', {
      eb: 100,
      texto: 'Só dispara na mão do dono. Abrir sem a chave: Eletrônica/Segurança DV17 (como o DNA Lock).',
      mesa: 'No Foundry, a regra fica no texto: o dono da arma chega com a identidade dela.'
    }),
    mod('cano-de-troca', 'Cano de troca', 'geral', {
      eb: 500, encaixe: LONGE,
      texto: 'Trocar o cano custa 1 minuto. Depois da troca, a perícia forense e o rastreio não ligam a arma aos crimes antigos.'
    }),
    mod('coronha-oca', 'Coronha oca', 'sabor', {
      eb: 50, encaixe: LONGE,
      texto: 'Cabe um item pequeno dentro. Achar exige Percepção DV17.'
    }),
    mod('acabamento-de-grife', 'Acabamento de grife', 'sabor', {
      eb: 100,
      texto: '+2 em Guarda-roupa e Estilo com a arma à vista. Não soma com outro +2 de estilo.',
      mesa: 'No Foundry, some o +2 à mão no teste de Guarda-roupa e Estilo.'
    }),
    mod('marca-de-gangue-ou-de-lenda', 'Marca de gangue ou de lenda', 'sabor', {
      eb: 100,
      texto: '+2 em Intimidação ou Interrogatório contra quem reconhece a arma.',
      mesa: 'No Foundry, some o +2 à mão quando o alvo reconhece a arma.'
    }),
    mod('nome-gravado', 'Nome gravado', 'sabor', {
      eb: 50,
      texto: 'Sem número: a arma ganha um nome e uma história. É o começo do apego.'
    }),
    mod('afinacao-pessoal', 'Afinação pessoal', 'sabor', {
      eb: 100,
      texto: '1 ponto de Sorte por sessão que só vale em ataques com esta arma, na mão do dono. É o efeito mais forte da lista: o mestre decide se a mesa usa.'
    }),
    mod('gatilho-sensivel', 'Gatilho sensível', 'defeito', {
      encaixe: LONGE,
      efeitos: [{ rotulo: 'emperra no 1 e no 2', entao: [{ alvo: 'emperraAte', valor: 2 }] }],
      texto: 'A arma emperra no 1 e no 2 do dado, de qualquer qualidade. Desemperrar custa uma Ação.',
      mesa: 'No Foundry, automático: o d10 natural 1 ou 2 emperra a arma, e o cartão diz o defeito.'
    }),
    mod('mira-descalibrada-para-estranhos', 'Mira descalibrada para estranhos', 'defeito', {
      encaixe: LONGE,
      efeitos: [{ rotulo: 'quem não é o dono', quando: { dono: false }, entao: ataque(-2) }],
      texto: 'Quem não é o dono tem −2 no ataque. O defeito que vira um antirroubo.',
      mesa: 'No Foundry, o −2 entra quando quem atira não é quem carrega a arma.'
    }),
    mod('coice-brutal', 'Coice brutal', 'defeito', {
      encaixe: LONGE,
      efeitos: [{ rotulo: 'autofogo ou o segundo ataque com CDT 2', quando: { algum: [{ modo: ['autofogo'] }, { manual: 'o segundo ataque do turno, com CDT 2' }] }, entao: ataque(-1) }],
      texto: '−1 no autofogo e no segundo ataque do turno com CDT 2.',
      mesa: 'No Foundry, o −1 entra ligado no autofogo; no segundo ataque com CDT 2, quem atira liga na janela.'
    }),
    mod('superaquece', 'Superaquece', 'defeito', {
      encaixe: LONGE,
      texto: 'Depois de um autofogo, a arma não faz autofogo no turno seguinte.'
    }),
    mod('barulhenta-e-chamativa', 'Barulhenta e chamativa', 'defeito', {
      efeitos: [{ rotulo: 'não se esconde', entao: [{ alvo: 'ocultavel', valor: false }] }],
      texto: 'A arma não se esconde, e quem procura o dono tem +2 em Percepção.',
      mesa: 'No Foundry, a arma deixa de ser ocultável; o +2 de quem procura fica com a mesa.'
    }),
    mod('cano-serrado', 'Cano serrado', 'defeito', {
      encaixe: { aDistancia: true, tipos: ['shotgun'] },
      efeitos: [{ rotulo: 'se esconde', entao: [{ alvo: 'ocultavel', valor: true }] }, { rotulo: 'a 26 m ou mais', quando: { metros: { min: 26 } }, entao: ataque(-2) }],
      texto: 'Só na espingarda: a arma se esconde, com −2 no ataque a 26 m ou mais. Não é a "ocultável" do Upgrade Expertise do Tech, que não tem penalidade.',
      mesa: 'No Foundry, a espingarda passa a ser ocultável, e o −2 entra quando o primeiro alvo está a 26 m ou mais.'
    })
  ];

  // A regra que o sistema guarda (a flag "mod" do item no Foundry 14).
  const regra = item => ({ versao: 1, id: item.id, nome: item.nome, tipo: item.tipo, tamanho: item.tamanho, ...(item.encaixe ? { encaixe: item.encaixe } : {}), efeitos: item.efeitos });
  const TIPOS_DE_ARMA = { shotgun: 'espingarda', lightMelee: 'branca leve', medMelee: 'branca média' };
  const CLASSES = { power: 'Power', smart: 'Smart', tech: 'Tech' };
  // Onde ela serve, em palavras.
  function serveEm({ encaixe } = {}) {
    if (!encaixe) return 'qualquer arma';
    if (encaixe.classe) return `arma ${CLASSES[encaixe.classe]}`;
    if (encaixe.tipos) return encaixe.tipos.map(tipo => TIPOS_DE_ARMA[tipo] || tipo).join(' ou ');
    return encaixe.aDistancia ? 'arma de longo alcance' : 'arma branca';
  }
  const defeitos = mods.filter(item => item.grupo === 'defeito');

  const entrada = item => `<article class="entry" data-toc="${item.nome}"><header><h4>${item.nome}</h4><span class="entry-tag">${GRUPOS[item.grupo]}</span></header>`
    + `<div class="entry-stats"><span><b>Ocupa</b>${item.tamanho ? `${item.tamanho} slot` : 'nenhum slot (dá +1)'}</span><span><b>Serve em</b>${serveEm(item)}</span><span><b>Preço</b>${preco(item.eb)}</span></div>`
    + `<p>${item.texto}</p><p class="entry-tip"><b>Na mesa:</b> ${item.mesa}</p></article>`;
  const grade = grupo => `<div class="entry-grid">${mods.filter(item => item.grupo === grupo).map(entrada).join('')}</div>`;

  const pages = {
    modsArmas: {
      eyebrow: 'Catálogos / regra da casa', title: 'Modificações de armas',
      lede: 'Cada arma pode ficar única: modificações de oficina, nos slots delas, que dão vantagem em algumas situações. É uma regra da casa, com teto, para o +1 continuar valendo muito.',
      html: `<div class="callout"><b>Regra da casa.</b> Isto não está no RED nem no Mission Kit: é da mesa, e nasce da <b>Invention Expertise</b> do Tech (RED p. 147–148: o Tech inventa itens e upgrades novos, com a aprovação do mestre). As modificações abaixo são os upgrades que já foram inventados. Os acessórios do livro (os 3 slots, as lunetas, os carregadores, o Smartgun Link, os Rebuilds) continuam como são, nos slots deles (${button('gear', 'Armas e equipamento do RED')}).</div>
        ${section('Os slots de modificação', `<p>Cada arma tem slots de modificação, à parte dos slots de acessório:</p>
          ${table(['Arma', 'Slots de modificação'], [['Toda arma, de longo alcance ou branca', '<b>2</b>'], ['Exótica ou de qualidade ruim', '<b>1</b>']])}
          ${list(['Um <b>defeito</b> dá <b>+1 slot</b>, até 3. Cada arma tem no máximo um defeito.', 'Cada modificação ocupa 1 slot; o defeito não ocupa nenhum.', 'A mesma modificação duas vezes na mesma arma não vale.'])}`)}
        ${section('Para sempre', list(['A modificação é <b>permanente</b>: não sai da arma nem passa para outra.', 'Só o <b>mestre</b> tira (na história, o Tech), e tirar <b>destrói</b> a modificação. Ela também sai com a arma, quando a arma se vai.']))}
        ${section('A instalação', `<p>Quem instala é o <b>Tech</b>: <b>TECH + Tecnologia de Armas + Especialização de Upgrade + 1d10</b>, contra a DV da categoria de preço da modificação. Leva <b>1 hora</b>.</p>
          ${table(['Categoria', 'DV'], [['Oneroso (até 50eb)', '<b>13</b>'], ['Premium (100eb)', '<b>17</b>'], ['Caro (500eb), e a sem preço (a da oficina do mestre, a lendária)', '<b>21</b>']])}
          ${list(['Na falha, a modificação <b>não entra e não se perde</b>: o Tech tenta de novo outro dia.', 'Sem um Tech no grupo, um Tech NPC instala (o serviço se paga na história, à parte). O defeito não se instala: quem o põe na arma é o mestre.'])}`)}
        ${section('O teto', `${list(['Nenhuma modificação dá bônus fixo no ataque: o bônus geral continua sendo o da qualidade excelente e o da arma Smart.', 'Cada arma tem no máximo <b>uma modificação de ataque</b>, de <b>+1 numa situação</b>.', 'Numa rolagem, a arma soma no máximo <b>+3</b>: a qualidade, a arma Smart, os acessórios, a luneta e as modificações, juntos. O RED sozinho já chega a +3 (a excelente, o Smartgun Link e a luneta a 51 m).', 'Nenhuma dá dado de dano a mais contra gente, nem muda a CDT ou o SP.'])}`)}
        ${section('O preço', `${table(['Modificação', 'Categoria', 'Preço'], [['Sabor', 'Oneroso ou Premium', '50 ou 100eb'], ['+1 numa faixa estreita', 'Premium', '100eb'], ['+1 numa condição comum ou um efeito tático', 'Caro', '500eb']])}
          <p>As de 500eb (Caro) só se compram com um Fixer ou num Mercado Noturno: sem Fixer, a compra vai só até Premium (${button('economy', 'Economia')}). Os defeitos não se compram.</p>`)}
        ${section('Os defeitos', `<p>O defeito é <b>sorteado</b>, nunca escolhido: quando o mestre dá um defeito a uma arma, rola 1d6. Se o defeito não serve na arma (o gatilho numa arma branca), rola de novo.</p>
          ${table(['1d6', 'Defeito', 'O que faz'], defeitos.map((item, indice) => [`<b>${indice + 1}</b>`, item.nome, item.texto]))}
          <div class="roll-buttons"><button class="action" type="button" data-mods-defeito>Sortear um defeito (1d6)</button></div>`)}
        ${section('As marcas de história', '<p>A arma também guarda a história dela: um nome, o momento, o que aconteceu. A marca de história <b>só conta história</b>: não muda nenhum número.</p>')}
        ${section('Táticas de situação', grade('situacional'))}
        ${section('Táticas gerais', grade('geral'))}
        ${section('Sabor', grade('sabor'))}
        ${section('Defeitos', grade('defeito'))}
        ${section('No Foundry', list(['A modificação é um upgrade com a regra dela. Instalada numa arma, usa os slots de modificação, e o Foundry recusa, com o motivo, a segunda de ataque, o segundo defeito e a que não cabe.', 'No ataque, cada efeito entra na janela de rolagem pela situação (a distância do primeiro alvo, o modo, o tiro mirado). O que o sistema não sabe vem desligado, para quem atira ligar.', 'O teto de +3 é automático: o que passa vira a parte "Teto da arma (+3)".', 'Comprada na loja da wiki, a modificação chega solta no inventário. Na ficha dela, o jogador usa o "Pedir a instalação": o mestre escolhe o Tech da mesa, que rola o teste no cartão do pedido de teste (passou, ela entra na arma e o diário da arma anota quem instalou), ou instala direto, quando o Tech é um NPC.']))}`
    }
  };

  // O sorteio do defeito.
  pages.modsArmas.setup = (content, { rollDice, showRoll }) => {
    content.querySelectorAll('[data-mods-defeito]').forEach(botao => botao.addEventListener('click', () => {
      const valor = rollDice('1d6');
      const item = defeitos[valor - 1];
      showRoll(botao, `<p><span class="roll-value">1d6: ${valor}</span> <b>${item.nome}</b>: ${item.texto}</p>`);
    }));
  };

  // data.mods: a lista crua, lida pelo build do Foundry (foundry-sistema/build/conteudo-mods.mjs), pela loja e pelos testes.
  window.systemModificacoes = { pages, data: { mods }, regra, serveEm, preco, grupos: GRUPOS };
})();
