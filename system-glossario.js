// Glossário: termos das regras com definição curta e o lugar da regra na wiki.
// O wiki-app.js transforma a primeira menção de cada termo em cada seção num link para cá.
// Vai também para a visão dos jogadores: só termos de regra, nada da campanha.
(() => {
  // [termo, inglês, definição, página, seção, formas no texto, opções]
  //   formas: como o termo aparece nas páginas (o próprio termo entra sozinho);
  //   opções.exato: as formas só valem com as maiúsculas certas (siglas como MOVE e SP);
  //   opções.semLink: fica no glossário, mas não vira link automático (palavra comum demais).
  const t = (termo, en, def, pagina, secao, formas = [], opcoes = {}) => ({ termo, en, def, pagina, secao, formas, ...opcoes });
  const terms = [
    // ---------------- Testes ----------------
    t('DV', 'Difficulty Value', 'A Dificuldade que o teste precisa <b>superar</b>: Simples 9, Comum 13, Difícil 15, Profissional 17, Heroico 21, Incrível 24, Lendário 29.', 'checks', 'Escala de DV', [], { exato: true }),
    t('Teste de perícia', 'Skill Check', 'STAT + perícia + 1d10, que precisa superar a DV. O mestre escolhe a STAT e a perícia que representam a abordagem.', 'checks', 'Teste de perícia', ['testes de perícia']),
    t('Teste resistido', 'Opposed Check', 'Os dois lados rolam STAT + perícia + 1d10; o resultado de quem resiste vira a DV. Empate: o defensor vence.', 'checks', 'Teste resistido', ['testes resistidos', 'teste oposto']),
    t('Sucesso crítico', 'Critical Success', '10 natural no d10: role mais 1d10 e some. A rolagem extra acontece uma vez só.', 'checks', 'Críticos', ['sucessos críticos']),
    t('Falha crítica', 'Critical Failure', '1 natural no d10: role mais 1d10 e subtraia. Arma de qualidade ruim emperra.', 'checks', 'Críticos', ['falhas críticas']),
    t('LUCK', 'Luck', 'STAT de sorte. Antes de rolar, gaste pontos para ter +1 por ponto no teste; os pontos voltam no início de cada sessão.', 'checks', 'LUCK', [], { exato: true }),
    t('Perícia complementar', 'Complementary Skill', 'Um bom resultado numa perícia relacionada dá +1 na próxima tentativa. Uma vez só, não acumula.', 'checks', 'Bônus e novas tentativas', ['perícias complementares']),
    t('Perícia básica', 'Basic Skill', 'Perícias que todo personagem tem no mínimo no nível 2, como Atletismo, Briga, Concentração, Evasão e Percepção.', 'creation', 'Perícias básicas', ['perícias básicas']),
    t('STAT', 'Statistic', 'Os dez atributos do personagem: INT, REF, DEX, TECH, COOL, WILL, LUCK, MOVE, BODY e EMP.', 'creation', 'Pontos de STAT por nível', ['STATs'], { exato: true }),

    // ---------------- Combate ----------------
    t('Iniciativa', 'Initiative', 'REF + 1d10. A ordem dos turnos é da maior para a menor; empates rolam de novo.', 'combat', 'Iniciativa e turno'),
    t('Ação de Movimento', 'Move Action', 'Parte do turno usada para andar até MOVE × 2 metros. Cada turno tem 1 Ação de Movimento e 1 Ação.', 'combat', 'Ações', ['Ações de Movimento']),
    t('MOVE', 'Move', 'STAT de deslocamento: cada Ação de Movimento anda MOVE × 2 metros.', 'combat', 'Movimento', [], { exato: true }),
    t('CDT', 'ROF (Rate of Fire)', 'Cadência de tiro: quantos ataques a arma faz com uma Ação (1 ou 2). Com CDT 2, os ataques podem ser divididos ao longo do movimento.', 'combat', 'Iniciativa e turno', ['ROF'], { exato: true }),
    t('Ataque à distância', 'Ranged Attack', 'REF + perícia da arma + 1d10 contra a DV da distância. Alvos com REF 8+ podem esquivar.', 'combat', 'Ataque à distância', ['ataques à distância']),
    t('DV por alcance', 'Range DV', 'Tabela que dá a DV conforme a arma e a distância. O Escudo do mestre tem uma calculadora.', 'combat', 'DV por alcance'),
    t('Esquiva', 'Dodge', 'Quem tem REF 8+ pode trocar a DV de um ataque à distância por DEX + Evasão + 1d10. Contra corpo a corpo, qualquer um esquiva assim.', 'combat', 'Ataque à distância', ['esquivar', 'esquivam', 'esquivar-se']),
    t('Tiro mirado', 'Aimed Shot', 'Com a Ação inteira, −8 no ataque para acertar a cabeça (o dano que passa da armadura dobra), um item na mão ou uma perna.', 'combat', 'Tiro mirado', ['tiros mirados', 'Aimed Shot']),
    t('Autofogo', 'Autofire', '1 Ação e 10 balas: Disparo Automático contra a tabela de autofogo. Dano 2d6 × quanto passou da DV, até o multiplicador da arma.', 'combat', 'Autofogo', ['Autofire']),
    t('Fogo supressivo', 'Suppressive Fire', '1 Ação e 10 balas. Quem está a pé, a até 25 m e fora de cobertura disputa WILL + Concentração contra o seu REF + Disparo Automático, ou corre para a cobertura.', 'combat', 'Fogo supressivo', ['Suppressive Fire']),
    t('Cobertura', 'Cover', 'Algo que para a bala e tira o alvo da linha de visão. Não existe cobertura parcial; cada trecho de 2 × 2 m tem HP próprio.', 'combat', 'Cobertura'),
    t('Agarrar', 'Grab', 'Uma Ação com uma mão livre: os dois rolam DEX + Briga + 1d10. Agarrados, os dois sofrem −2 em todas as ações.', 'combat', 'Agarrar e arremessar', ['agarrado', 'agarrados']),
    t('Facedown', 'Facedown', 'Disputa de encarada: COOL + Reputação + 1d10. Quem perde recua ou sofre −2 nas ações contra o oponente até derrotá-lo uma vez.', 'combat', 'Reputação e facedown', ['facedowns']),
    t('Reputação', 'Reputation', 'Nível de 1 a 10 de quanto o personagem é conhecido; soma no facedown.', 'combat', 'Reputação e facedown'),

    // ---------------- Dano ----------------
    t('SP', 'Stopping Power', 'Proteção da armadura em cada local (cabeça e corpo). O dano até o SP não passa. SP não soma: vale o maior do local.', 'damage', 'Armaduras', [], { exato: true }),
    t('Ablação', 'Ablation', 'Sempre que o dano passa da armadura, ela perde 1 SP naquele local até ser reparada.', 'damage', 'Sofrendo dano', ['abla', 'ablam', 'ablar', 'ablado', 'ablada']),
    t('HP', 'Hit Points', 'Pontos de vida (PV): 10 + 5 × a média de BODY e WILL, arredondada para cima.', 'creation', 'Valores derivados', ['PV'], { exato: true }),
    t('Gravemente Ferido', 'Seriously Wounded', 'Abaixo da metade do HP: −2 em todas as ações. Estabilizar: DV13.', 'damage', 'Estados de ferimento', ['Gravemente Ferida', 'Seriously Wounded']),
    t('Mortalmente Ferido', 'Mortally Wounded', 'Abaixo de 1 HP: −4 em todas as ações, −6 MOVE e Death Save no início de cada turno. Estabilizar: DV15.', 'damage', 'Estados de ferimento', ['Mortalmente Ferida', 'Mortally Wounded']),
    t('Death Save', 'Death Save', 'Teste para não morrer quando Mortalmente Ferido: 1d10 + penalidade acumulada, menor que o BODY. 10 natural sempre falha; cada Death Save soma +1 aos próximos.', 'damage', 'Death Save', ['Death Saves', 'teste de morte']),
    t('Lesão crítica', 'Critical Injury', 'Quando dois ou mais dados de dano caem 6: role 2d6 na tabela (corpo, ou cabeça em tiro mirado na cabeça). Toda lesão causa +5 de dano direto no HP.', 'damage', 'Lesões críticas', ['lesões críticas', 'Critical Injury']),
    t('Estabilizar', 'Stabilize', 'Uma Ação: TECH + Primeiros Socorros ou Paramédico + 1d10 contra DV10, 13 ou 15, conforme o ferimento. Estabilizado, recupera HP igual ao BODY por dia de descanso.', 'damage', 'Estabilização e cura natural', ['estabilização', 'estabilizado', 'estabilizada']),
    t('Correção rápida', 'Quick Fix', 'Tira o efeito de uma lesão crítica pelo resto do dia (1 minuto por tentativa). O tratamento tira de vez, mas leva 4 horas e não dá para fazer em si mesmo.', 'damage', 'Correção rápida x tratamento', ['correções rápidas']),
    t('Trauma Team', 'Trauma Team', 'Serviço de resgate por assinatura: chega em 1d6 rodadas num AV-4, com 5 pessoas.', 'damage', 'Hospital, Trauma Team e instalação'),

    // ---------------- Humanidade ----------------
    t('Humanidade', 'Humanity', 'EMP × 10. Cai com cada cyberware instalado; a EMP efetiva é a dezena da Humanidade atual.', 'humanity', 'Humanidade e EMP'),
    t('Perda de Humanidade', 'Humanity Loss', 'O quanto de Humanidade um cyberware tira ao ser instalado (valor fixo ou rolado).', 'humanity', 'Humanidade e EMP'),
    t('Ciberpsicose', 'Cyberpsychosis', 'Transtorno dissociativo causado pelo cromo. Começa limítrofe na EMP 2; com EMP 0 é ciberpsicose, e com Humanidade negativa o personagem passa para o mestre.', 'humanity', 'Humanidade e EMP', ['ciberpsicótico', 'ciberpsicótica', 'cyberpsicose', 'Cyberpsychosis']),

    // ---------------- Netrunning do RED ----------------
    t('Interface', 'Interface', 'Habilidade de Role do Netrunner: dá as Ações NET e as habilidades Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Scanner, Slide, Virus e Zap.', 'netrunning', 'Habilidades de Interface'),
    t('Ações NET', 'NET Actions', 'Ações na rede por turno, conforme o Rank de Interface: 2 (1–3), 3 (4–6), 4 (7–9), 5 (10).', 'netrunning', 'Ações por turno', ['Ação NET', 'Ações de NET']),
    t('Ação Carnal', 'Meat Action', 'Ação no mundo físico. Quem a faz não faz Ações NET naquele turno.', 'netrunning', 'Ações por turno', ['Ações Carnais', 'Meat Action']),
    t('Arquitetura NET', 'NET Architecture', 'A rede de um prédio ou sistema, em andares, com senhas, arquivos, nós de controle e ICE.', 'netrunning', 'Montando uma arquitetura', ['arquiteturas NET', 'NET Architecture']),
    t('Ponto de acesso', 'Access Point', 'Onde o netrunner se conecta à arquitetura; precisa estar a até 6 m dele.', 'netrunning', 'Ações NET', ['pontos de acesso']),
    t('Black ICE', 'Black ICE', 'Programa hostil que vigia a arquitetura e ataca o netrunner ou os programas dele.', 'netrunning', 'Black ICE'),
    t('Demônio', 'Demon', 'Black ICE inteligente que opera os nós de controle (torretas, drones) contra a equipe.', 'netrunning', 'Demônios', ['demônios']),
    t('REZ', 'REZ', 'Os "pontos de vida" de um programa, ICE ou daemon.', 'netrunning', 'Combate na NET', [], { exato: true }),
    t('Cyberdeck', 'Cyberdeck', 'O computador do netrunner, com slots para programas e hardware. Em 2077, é um sistema operacional instalado no Neural Link.', 'net2077', 'Cyberdecks de 2077', ['cyberdecks']),

    // ---------------- Netrunning de 2077 ----------------
    t('RAM', 'RAM', 'Em 2077, cada ação NET e cada quickhack gasta RAM do deck: mais cara na LocalNet (+1) e na SubNet (+2).', 'net2077', 'Resolução, RAM e cooling', [], { exato: true }),
    t('Cooling', 'Cooling', 'Quanta RAM o deck recupera ao esfriar com uma Ação Carnal. Com um minuto de folga, esfria por completo.', 'net2077', 'Resolução, RAM e cooling'),
    t('Quickhack', 'Quickhack', 'Hack rápido de 2077 contra uma pessoa ou máquina: custa RAM, só resiste quem percebe, e o dano ignora a armadura.', 'quickhacks', 'Como funcionam os quickhacks', ['quickhacks']),
    t('Daemon', 'Daemon', 'Programa de 2077 instalado num alvo ou arquitetura para combater ou dar suporte (ICEpick, Datamine...).', 'quickhacks', 'Daemons', ['daemons']),
    t('Breach', 'Breach', 'Quebrar uma senha ou abrir conexão direta com um nó para invadir um aparelho ou uma pessoa.', 'net2077', 'Habilidades de Interface nas três camadas'),
    t('SubNet', 'SubNet', 'Camada da rede de 2077 que cobre de uma sala a uma torre inteira. Ações nela custam +2 de RAM até invadir o ponto de acesso.', 'net2077', 'As três camadas da rede', ['SubNets']),
    t('LocalNet', 'LocalNet', 'Camada da rede de 2077 entre pessoas, como uma VPN. Ações nela custam +1 de RAM.', 'net2077', 'As três camadas da rede', ['LocalNets']),
    t('White ICE', 'White ICE', 'ICE de defesa que soma o Rating nos testes NET de defesa (do Heaven Pup ao Kami Chip).', 'net2077', 'ICE em 2077'),

    // ---------------- Cyberware ----------------
    t('Neural Link', 'Neural Link', 'Implante-base que liga o cérebro ao cyberware. É exigido pelos Interface Plugs, pelo Chipware e pelo Speedware.', 'cyberware', 'Neuralware'),
    t('Speedware', 'Speedware', 'Neuralware de reflexos, como o Kerenzikov e o Sandevistan. Só um instalado por vez.', 'cyberware', 'Neuralware'),
    t('Kerenzikov', 'Kerenzikov', 'Speedware. No RED: +2 de iniciativa, sempre ligado. Em 2077: +1 em tiros mirados.', 'cyberware2077', 'Kerenzikov (2077)'),
    t('Sandevistan', 'Sandevistan', 'No RED: speedware de +3 de iniciativa por um minuto. Em 2077: sistema operacional que acelera o corpo (+2 a +3 em DEX, REF e MOVE).', 'os2077', 'Sandevistan', ['Sandevistans']),
    t('Berserk', 'Berserk', 'Sistema operacional de 2077 que aumenta BODY e MOVE e dá durabilidade e força brutal por algumas rodadas.', 'os2077', 'Berserk'),
    t('Chipware', 'Chipware', 'Chips instalados no Chipware Socket do Neural Link, que dão perícias ou efeitos.', 'cyberware', 'Neuralware'),
    t('Fashionware', 'Fashionware', 'Cyberware cosmético, de baixa perda de Humanidade.', 'cyberware2077', 'Fashionware'),
    t('Borgware', 'Borgware', 'Cyberware pesado que transforma o corpo, como o Linear Frame e os braços extras.', 'cyberware', 'Borgware'),
    t('Ripperdoc', 'Ripperdoc', 'Médico de rua que instala, conserta e troca cyberware.', 'cyberware2077', 'Antes de instalar', ['ripperdocs']),
    t('Smart Link', 'Smartgun Link', 'Cyberware de 2077 que permite usar armas Smart e liga a óptica ao sistema da arma. No RED, o Smartgun Link é um acessório de arma: +1 nos ataques à distância, com plugs de interface.', 'cyberware2077', 'Smart Link', ['smartgun link', 'Smartgun Link']),

    // ---------------- Armas de 2077 ----------------
    t('Arma Power', 'Power weapon', 'A arma de fogo clássica de 2077. Todas têm o modo Ricochete.', 'weapons2077', 'Os três tipos', ['armas Power']),
    t('Arma Tech', 'Tech weapon', 'Railgun miniaturizado de 2077: exótica, usa flechettes e tem a carga Tech.', 'weapons2077', 'Os três tipos', ['armas Tech']),
    t('Arma Smart', 'Smart weapon', 'Arma de balas guiadas de 2077. Só funciona com o Smart Link; o ataque Smart é 10 + 1d10 (12 + 1d10 com várias balas).', 'weapons2077', 'Armas Smart', ['armas Smart']),
    t('Ricochete', 'Ricochet', 'Modo das armas Power: tiro único contra um alvo atrás de cobertura, com a DV da tabela de autofogo e um dado a menos de dano.', 'weapons2077', 'Ricochete (Power)', ['ricochetear', 'ricocheteando']),
    t('Carga Tech', 'Tech Charge', 'Modo das armas Tech: atravessa cobertura e abla mais a armadura; depois a arma precisa de uma rodada para esfriar.', 'weapons2077', 'Carga Tech'),
    t('Qualidade da arma', 'Weapon Quality', 'Ruim: emperra numa falha crítica. Excelente: +1 no ataque. Armas exóticas são de qualidade padrão.', 'weapons2077', 'Qualidade das armas', ['qualidade ruim', 'qualidade excelente']),

    // ---------------- Economia e Roles ----------------
    t('Eurodólar', 'Eurodollar (eb)', 'A moeda de Night City, escrita "eb". Na rua: eddies.', 'economy', 'Categorias de preço', ['eurodólares', 'eddies']),
    t('Categoria de preço', 'Price Category', 'Faixas de preço dos itens. Em 2077: Barato 20eb, Cotidiano 50eb, Oneroso 100eb, Premium 500eb, Caro 1.000eb, Muito caro 5.000eb, Luxo 10.000eb, Super luxo 20.000eb ou mais.', 'economy', 'Categorias de preço', ['categorias de preço']),
    t('Estilo de vida', 'Lifestyle', 'Quanto o personagem gasta por mês com comida e cotidiano, além da moradia.', 'economy', 'Estilo de vida', ['estilos de vida']),
    t('Role', 'Role', 'A profissão do personagem (Solo, Netrunner, Fixer...), com uma habilidade especial que sobe por Rank, de 1 a 10.', 'roles', 'As dez Roles do RED', [], { semLink: true }),
    t('Rank', 'Rank', 'Nível da habilidade de Role, de 1 a 10.', 'roles', 'As dez Roles do RED', [], { exato: true }),
    t('Night Market', 'Night Market', 'Mercado improvisado, montado por um fixer, que vende duas categorias de itens. A Economia de 2077 tem o gerador.', 'economy', 'Night Market', ['Night Markets', 'mercado noturno', 'mercados noturnos']),
    t('Impacto Carismático', 'Charismatic Impact', 'Habilidade do Face em 2077 (do Rockerboy no RED): Rank + 1d10 contra DV 8 (uma pessoa), 10 (até 6) ou 12 (grupo enorme) para conseguir favores.', 'roles2077', 'Face', ['Charismatic Impact']),
    t('Investigator', 'Investigator', 'Habilidade do Lawman em 2077, no lugar de Backup: casos ativos e um bônus de caso em Educação e Percepção.', 'roles2077', 'Lawman'),

    // ---------------- Avanço e equipamento ----------------
    t('Pontos de Melhoria', 'Improvement Points (IP)', 'Ganhos no fim de cada sessão. Subir uma perícia custa 20 × o novo nível (×2 nas difíceis); subir o Rank da Role, 60 × o novo Rank.', 'advancement', 'Gastar Pontos de Melhoria', ['Ponto de Melhoria', 'Improvement Points']),
    t('Lifepath', 'Lifepath', 'As tabelas do passado do personagem: origem, personalidade, família, amigos, inimigos, amores trágicos e meta de vida.', 'lifepath', 'Origem cultural'),
    t('Munição perfurante', 'Armor-Piercing Ammo', '100eb por 10 balas. Quando acerta a armadura, a ablação é de 2 em vez de 1. Não existe para espingarda.', 'gear', 'Munição', ['munição anti-blindagem', 'munição Perfurante']),
    t('Slot de acessório', 'Attachment Slot', 'Toda arma de longo alcance não exótica tem 3 slots para acessórios, como luneta, baioneta ou carregador maior.', 'gear', 'Acessórios de arma', ['slots de acessório'])
  ];

  // Mesma normalização do endereço da wiki (#página/seção).
  const slug = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  terms.forEach(term => { term.id = slug(term.termo); });
  terms.sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR'));

  const letters = [...new Set(terms.map(term => slug(term.termo)[0].toUpperCase()))];
  const card = term => `<article class="entry glossary-entry" data-toc="${escapeHtml(term.termo)}" data-gloss-text="${escapeHtml(slug(`${term.termo} ${term.en} ${term.formas.join(' ')} ${term.def.replace(/<[^>]+>/g, '')}`))}">
      <header><h4>${escapeHtml(term.termo)}</h4><span class="entry-tag">${escapeHtml(term.en)}</span></header>
      <p>${term.def}</p>
      <p><button class="action" type="button" data-page="${term.pagina}" data-section="${slug(term.secao)}">Ver a regra: ${escapeHtml(term.secao)}</button></p>
    </article>`;
  const page = {
    eyebrow: 'Na mesa / termos das regras', title: 'Glossário',
    lede: `Os ${terms.length} termos que mais aparecem nas regras, com o que significam e onde está a regra. Nas outras páginas, a primeira menção de cada termo numa seção vira um link para cá: passe o mouse para ver a definição.`,
    html: `<div class="section" data-toc="Filtrar"><h3>Filtrar</h3><label class="skill-search"><input id="glossary-filter" type="search" placeholder="Termo em português ou inglês" autocomplete="off"></label><p class="note-status" id="glossary-count"></p></div>
      ${letters.map(letter => `<div class="section glossary-letter" data-toc="${letter}"><h3>${letter}</h3><div class="entry-grid">${terms.filter(term => slug(term.termo)[0].toUpperCase() === letter).map(card).join('')}</div></div>`).join('')}`,
    // Filtro da página (o wiki-app.js chama setup depois de montar a página).
    setup(content) {
      const input = content.querySelector('#glossary-filter');
      const count = content.querySelector('#glossary-count');
      const apply = () => {
        const needle = slug(input.value);
        let shown = 0;
        content.querySelectorAll('.glossary-letter').forEach(section => {
          let visible = 0;
          section.querySelectorAll('.glossary-entry').forEach(entry => {
            const match = !needle || entry.dataset.glossText.includes(needle);
            entry.hidden = !match;
            if (match) visible += 1;
          });
          section.hidden = !visible;
          shown += visible;
        });
        count.textContent = needle ? `${shown} de ${terms.length} termos` : `${terms.length} termos`;
      };
      input.addEventListener('input', apply);
      apply();
    }
  };

  window.systemGlossary = { terms, slug, pages: { glossary: page } };
})();
