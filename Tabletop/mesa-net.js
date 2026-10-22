// A NET na mesa da wiki (M13): a arquitetura (RED p. 209–211; o netarch do CORE, com os demônios e os netrunners inimigos
// do NET Architect do Foundry), os números do Black ICE e dos demônios (RED p. 204–212, os da wiki: o teste confere) e as
// tabelas de andares do CORE (internal/net-rolltables, as mesmas que o sistema do Foundry 14 tira dele). Sem rede nem
// arquivo: vai para o servidor, para o navegador (o editor e o mapa da arquitetura) e para os testes.
//
// A arquitetura é uma lista de linhas, uma por conteúdo, como a do sistema do Foundry 14: { andar (1 a 18), ramo (a a h),
// tipo, dv, ice, demonio, npc, nome, descricao }. O andar 1 do ramo A sai do ponto de acesso (a entrada); um ramo novo sai
// do andar de cima do ramo à esquerda, como o CORE desenha a cena da arquitetura.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MesaNet = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const ENTRADA = 'entrada';
  const RAMOS = 'abcdefgh';
  const ANDAR_MAX = 18;
  const MAX_LINHAS = 120;
  // O que pode haver num andar, com o nome da wiki ("Montando uma arquitetura").
  const TIPOS_DE_ANDAR = { senha: 'Senha', arquivo: 'Arquivo', controle: 'Nó de controle', ice: 'Black ICE', demonio: 'Demônio', netrunner: 'Netrunner inimigo', vazio: 'Andar vazio' };
  // Os que têm DV, a do teste da habilidade: a senha (Breach), o arquivo (Eye-Dee) e o nó de controle (Control).
  const COM_DV = ['senha', 'arquivo', 'controle'];
  // A DV da arquitetura no RED: 6 (básica), 8 (padrão), 10 (incomum), 12 (avançada). Sem DV nos andares, básica.
  const DV_SEM_ANDARES = 6;
  const DIFICULDADES = { basica: 'Básica', padrao: 'Padrão', incomum: 'Incomum', avancada: 'Avançada' };

  // ---------------- O Black ICE e os demônios (a wiki, "Black ICE" e "Demônios") ----------------
  // dano: a rolagem do efeito (no cérebro, ou na REZ de um programa no anti-programa); vazio quando o efeito não tem dano.
  const BLACK_ICE = {
    asp: { nome: 'Asp', classe: 'Anti-pessoal', per: 4, spd: 6, atk: 2, def: 2, rez: 15, dano: '', efeito: 'Destrói um programa aleatório do deck.' },
    giant: { nome: 'Giant', classe: 'Anti-pessoal', per: 2, spd: 2, atk: 8, def: 4, rez: 25, dano: '3d6', efeito: '3d6 no cérebro e desconexão insegura (sofre os outros Black ICE ativos).' },
    hellhound: { nome: 'Hellhound', classe: 'Anti-pessoal', per: 6, spd: 6, atk: 6, def: 2, rez: 20, dano: '2d6', efeito: '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).' },
    kraken: { nome: 'Kraken', classe: 'Anti-pessoal', per: 6, spd: 2, atk: 8, def: 4, rez: 30, dano: '3d6', efeito: '3d6 no cérebro; até o fim do próximo turno, não avança nem desconecta com segurança.' },
    liche: { nome: 'Liche', classe: 'Anti-pessoal', per: 8, spd: 2, atk: 6, def: 2, rez: 25, dano: '', efeito: '−1d6 em INT, REF e DEX por 1 hora.' },
    raven: { nome: 'Raven', classe: 'Anti-pessoal', per: 6, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: 'Desativa um programa defensor aleatório e causa 1d6 no cérebro.' },
    scorpion: { nome: 'Scorpion', classe: 'Anti-pessoal', per: 2, spd: 6, atk: 2, def: 2, rez: 15, dano: '', efeito: '−1d6 no MOVE por 1 hora.' },
    skunk: { nome: 'Skunk', classe: 'Anti-pessoal', per: 2, spd: 4, atk: 4, def: 2, rez: 10, dano: '', efeito: '−2 em Slide até ser desativado (acumula entre Skunks).' },
    wisp: { nome: 'Wisp', classe: 'Anti-pessoal', per: 4, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: '1d6 no cérebro e −1 Ação NET no próximo turno (mínimo 2).' },
    dragon: { nome: 'Dragon', classe: 'Anti-programa', per: 6, spd: 4, atk: 6, def: 6, rez: 30, dano: '6d6', efeito: '6d6 na REZ de um programa; se desativar, destrói.' },
    killer: { nome: 'Killer', classe: 'Anti-programa', per: 4, spd: 8, atk: 6, def: 2, rez: 20, dano: '4d6', efeito: '4d6 na REZ de um programa; se desativar, destrói.' },
    sabertooth: { nome: 'Sabertooth', classe: 'Anti-programa', per: 8, spd: 6, atk: 6, def: 2, rez: 25, dano: '6d6', efeito: '6d6 na REZ de um programa; se desativar, destrói.' }
  };
  // O Black ICE sem modelo escolhido: o mestre ajusta a REZ na mesa.
  const ICE_GENERICO = { nome: 'Black ICE', classe: 'Anti-pessoal', per: 4, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: '1d6 no cérebro (o Black ICE sem modelo: o mestre ajusta).' };
  const iceDe = id => (id && Object.hasOwn(BLACK_ICE, id) ? BLACK_ICE[id] : ICE_GENERICO);
  // Os demônios: o Black ICE inteligente. Sempre vencem a velocidade, a senha não os para, não têm PER, SPD nem DEF
  // (defendem com Interface + 1d10, então não há Slide) e só usam Zap e Control.
  const DEMONIOS = {
    imp: { nome: 'Imp', rez: 15, interface: 3, acoes: 2, combate: 14 },
    efreet: { nome: 'Efreet', rez: 25, interface: 4, acoes: 3, combate: 14 },
    balron: { nome: 'Balron', rez: 30, interface: 7, acoes: 4, combate: 14 }
  };
  const demonioDe = id => (id && Object.hasOwn(DEMONIOS, id) ? DEMONIOS[id] : DEMONIOS.imp);

  // ---------------- As tabelas de andares do CORE ----------------
  // Cada resultado: "Hellhound ×2, Liche" (um Black ICE por linha no mesmo andar), "Senha DV 8", "Arquivo DV 6" ou "Nó de
  // controle DV 10". O lobby (os 2 primeiros andares) é 1d6; as outras, 3d6.
  const POR_NOME = Object.fromEntries(Object.entries(BLACK_ICE).map(([id, ice]) => [ice.nome, id]));
  function conteudosDoRotulo(rotulo) {
    return rotulo.split(', ').flatMap(parte => {
      const dv = parte.match(/^(Senha|Arquivo|Nó de controle) DV (\d+)$/);
      if (dv) return [{ tipo: { Senha: 'senha', Arquivo: 'arquivo', 'Nó de controle': 'controle' }[dv[1]], dv: Number(dv[2]) }];
      const [nome, vezes] = parte.split(' ×');
      return Array.from({ length: Number(vezes) || 1 }, () => ({ tipo: 'ice', ice: POR_NOME[nome] }));
    });
  }
  const tabela = (formula, linhas) => ({
    formula,
    resultados: linhas.split(' | ').map(linha => { const [n, rotulo] = linha.split(/:(.*)/); return { min: Number(n), max: Number(n), rotulo, conteudos: conteudosDoRotulo(rotulo) }; })
  });
  const TABELAS = {
    lobby: tabela('1d6', '1:Arquivo DV 6 | 2:Senha DV 6 | 3:Senha DV 8 | 4:Skunk | 5:Wisp | 6:Killer'),
    basica: tabela('3d6', '3:Hellhound | 4:Sabertooth | 5:Raven ×2 | 6:Hellhound | 7:Wisp | 8:Raven | 9:Senha DV 6 | 10:Arquivo DV 6 | 11:Nó de controle DV 6 | 12:Senha DV 6 | 13:Skunk | 14:Asp | 15:Scorpion | 16:Killer, Skunk | 17:Wisp ×3 | 18:Liche'),
    padrao: tabela('3d6', '3:Hellhound ×2 | 4:Hellhound, Killer | 5:Skunk ×2 | 6:Sabertooth | 7:Scorpion | 8:Hellhound | 9:Senha DV 8 | 10:Arquivo DV 8 | 11:Nó de controle DV 8 | 12:Senha DV 8 | 13:Asp | 14:Killer | 15:Liche | 16:Asp | 17:Raven ×3 | 18:Liche, Raven'),
    incomum: tabela('3d6', '3:Kraken | 4:Hellhound, Scorpion | 5:Hellhound, Killer | 6:Raven ×2 | 7:Sabertooth | 8:Hellhound | 9:Senha DV 10 | 10:Arquivo DV 10 | 11:Nó de controle DV 10 | 12:Senha DV 10 | 13:Killer | 14:Liche | 15:Dragon | 16:Asp, Raven | 17:Dragon, Wisp | 18:Giant'),
    avancada: tabela('3d6', '3:Hellhound ×3 | 4:Asp ×2 | 5:Hellhound, Liche | 6:Wisp ×3 | 7:Hellhound, Sabertooth | 8:Kraken | 9:Senha DV 12 | 10:Arquivo DV 12 | 11:Nó de controle DV 12 | 12:Senha DV 12 | 13:Giant | 14:Dragon | 15:Killer, Scorpion | 16:Kraken | 17:Raven, Wisp, Hellhound | 18:Dragon ×2')
  };

  // ---------------- A arquitetura ----------------
  const int = (valor, min, max, padrao) => { const n = Math.round(Number(valor)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao; };
  const texto = (valor, max) => String(valor ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max);
  // Uma linha conferida (o que vem do editor, da importação ou da geração). O DV: 4 a 20 na senha, no arquivo e no nó; o
  // Black ICE e o demônio pelo modelo da wiki; o netrunner inimigo pela ficha de NPC (npc: o id dela na mesa).
  function limparLinha(linha = {}) {
    const tipo = Object.hasOwn(TIPOS_DE_ANDAR, linha.tipo) ? linha.tipo : 'vazio';
    const ramo = String(linha.ramo || 'a').toLowerCase();
    return {
      andar: int(linha.andar, 1, ANDAR_MAX, 1), ramo: ramo.length === 1 && RAMOS.includes(ramo) ? ramo : 'a', tipo,
      dv: COM_DV.includes(tipo) ? int(linha.dv, 4, 20, DV_SEM_ANDARES) : 0,
      ice: tipo === 'ice' && Object.hasOwn(BLACK_ICE, linha.ice) ? linha.ice : '',
      demonio: tipo === 'demonio' ? (Object.hasOwn(DEMONIOS, linha.demonio) ? linha.demonio : 'imp') : '',
      npc: tipo === 'netrunner' ? texto(linha.npc, 60) : '',
      nome: texto(linha.nome, 60), descricao: texto(linha.descricao, 500)
    };
  }
  const limparAndares = andares => (Array.isArray(andares) ? andares : []).slice(0, MAX_LINHAS).map(limparLinha);

  // Os nós ({ id: "3b", andar, ramo, conteudos, pai }), os filhos de cada nó, o tamanho do mapa e a DV da arquitetura: a
  // dela (dv > 0) ou a maior dos andares. A chave de cada conteúdo ("3b.0") é a ordem dele no andar.
  function lerArquitetura({ nome = '', andares = [], dv = 0 } = {}) {
    const nos = {};
    const noEm = (andar, ramo) => {
      const id = `${andar}${ramo}`;
      return nos[id] || (nos[id] = { id, andar, ramo, conteudos: [] });
    };
    const ordenadas = limparAndares(andares).map((linha, indice) => ({ ...linha, indice }))
      .sort((a, b) => a.andar - b.andar || a.ramo.localeCompare(b.ramo) || a.indice - b.indice);
    for (const linha of ordenadas) {
      const no = noEm(linha.andar, linha.ramo);
      no.conteudos.push({ chave: `${no.id}.${no.conteudos.length}`, indice: linha.indice, tipo: linha.tipo, dv: linha.dv || null, ice: linha.ice || null, demonio: linha.demonio || null, npc: linha.npc || null, nome: linha.nome, descricao: linha.descricao });
    }
    const lista = Object.values(nos);
    for (const no of lista) no.pai = paiDe(no, nos, lista);
    const filhos = {};
    for (const no of lista) (filhos[no.pai] || (filhos[no.pai] = [])).push(no.id);
    for (const ids of Object.values(filhos)) ids.sort((a, b) => nos[a].ramo.localeCompare(nos[b].ramo) || nos[a].andar - nos[b].andar);
    const dvs = lista.flatMap(no => no.conteudos.map(conteudo => conteudo.dv)).filter(Boolean);
    return {
      nome, nos, filhos,
      dv: Number(dv) > 0 ? Number(dv) : dvs.length ? Math.max(...dvs) : DV_SEM_ANDARES,
      colunas: Math.max(1, ...lista.map(no => RAMOS.indexOf(no.ramo) + 1)),
      andares: Math.max(0, ...lista.map(no => no.andar))
    };
  }
  // O pai de um nó: o andar de cima no mesmo ramo; senão, o andar de cima do ramo à esquerda mais próximo; senão (um buraco
  // na numeração), o andar mais fundo acima dele, de preferência no mesmo ramo.
  function paiDe(no, nos, lista) {
    if (no.andar === 1) return ENTRADA;
    const acima = nos[`${no.andar - 1}${no.ramo}`];
    if (acima) return acima.id;
    for (let i = RAMOS.indexOf(no.ramo) - 1; i >= 0; i--) {
      const outro = nos[`${no.andar - 1}${RAMOS[i]}`];
      if (outro) return outro.id;
    }
    const candidatos = lista.filter(outro => outro.andar < no.andar && outro.ramo <= no.ramo)
      .sort((a, b) => (b.ramo === no.ramo) - (a.ramo === no.ramo) || b.andar - a.andar || b.ramo.localeCompare(a.ramo));
    return candidatos.length ? candidatos[0].id : ENTRADA;
  }
  const filhosDe = (arq, id) => arq.filhos[id] || [];
  const paiDoNo = (arq, id) => (id === ENTRADA ? null : (arq.nos[id] || {}).pai || null);
  const vizinhos = (arq, id) => [paiDoNo(arq, id), ...filhosDe(arq, id)].filter(Boolean);
  // O andar mais fundo de um ramo (onde o Virus pode ficar).
  const ehFundo = (arq, id) => id !== ENTRADA && Boolean(arq.nos[id]) && !filhosDe(arq, id).length;
  // Pathfinder (RED p. 199): revela tantos andares quanto o resultado, a partir de onde o netrunner está, descendo em
  // largura; um andar com uma DV maior que o resultado aparece, mas o que vem depois dele não.
  function revelarPathfinder(arq, origem, total) {
    const revelados = [];
    const fila = [...filhosDe(arq, origem)];
    while (fila.length && revelados.length < total) {
      const id = fila.shift();
      revelados.push(id);
      if (!arq.nos[id].conteudos.some(conteudo => conteudo.dv && conteudo.dv > total)) fila.push(...filhosDe(arq, id));
    }
    return revelados;
  }

  // A geração pelas tabelas (RED p. 210–211; o _netarchGenerateFromTables do CORE, como o sistema do Foundry 14): 3d6
  // andares; o 1d10 de novo enquanto der 7 ou mais, um ramo a mais a cada vez (até o H); os 2 primeiros andares pelo lobby
  // (1d6) e os outros pela tabela da dificuldade (3d6), sem repetir um resultado, menos os de arquivo e de nó de controle.
  // O ramo novo começa no andar 3 (o seguinte no 4...) quando o andar passa do total dividido pelos ramos que faltam mais
  // um, e nunca no último resultado. rolar(formula): o total ("3d6", "1d10").
  function gerarAndares({ dificuldade, rolar }) {
    if (!Object.hasOwn(DIFICULDADES, dificuldade)) throw new Error('Dificuldade desconhecida.');
    const total = rolar('3d6');
    let ramosAMais = 0;
    while (ramosAMais < RAMOS.length - 1 && rolar('1d10') >= 7) ramosAMais += 1;
    const sortear = (id, quantos) => {
      const t = TABELAS[id];
      const saidos = [];
      const vistos = new Set();
      for (let tentativa = 0; saidos.length < quantos && tentativa < 1000; tentativa++) {
        const rolagem = rolar(t.formula);
        const resultado = t.resultados.find(r => rolagem >= r.min && rolagem <= r.max);
        if (!resultado || vistos.has(rolagem)) continue;
        if (!resultado.conteudos.every(c => c.tipo === 'arquivo' || c.tipo === 'controle')) vistos.add(rolagem);
        saidos.push({ id, rolagem, resultado });
      }
      return saidos;
    };
    const resultados = [...sortear('lobby', 2), ...sortear(dificuldade, total - 2)];
    const andares = [];
    let andar = 1;
    let inicioDoRamo = 3;
    let ramo = 0;
    let faltam = ramosAMais;
    resultados.forEach(({ id, rolagem, resultado }, indice) => {
      if (faltam > 0 && andar > inicioDoRamo && andar > total / (faltam + 1) && indice !== total - 1) {
        andar = inicioDoRamo;
        inicioDoRamo += 1;
        ramo += 1;
        faltam -= 1;
      }
      const descricao = `${id === 'lobby' ? 'Lobby' : DIFICULDADES[id]}, ${rolagem}: ${resultado.rotulo}`;
      for (const conteudo of resultado.conteudos) andares.push(limparLinha({ andar, ramo: RAMOS[ramo], tipo: conteudo.tipo, dv: conteudo.dv, ice: conteudo.ice, descricao }));
      andar += 1;
    });
    return { andares, total, ramosAMais };
  }

  // ---------------- O editor (a grade de andares) ----------------
  // A linha nova: o andar seguinte ao mais fundo do ramo A (ou o 1), uma senha DV 6.
  function novaLinha(andares = []) {
    const doRamoA = andares.filter(linha => (linha.ramo || 'a') === 'a').map(linha => Number(linha.andar) || 0);
    return limparLinha({ andar: Math.min(ANDAR_MAX, (doRamoA.length ? Math.max(...doRamoA) : 0) + 1), ramo: 'a', tipo: 'senha', dv: DV_SEM_ANDARES });
  }
  // A posição na grade ("3b": o andar e o ramo), só dentro da arquitetura.
  function lerPosicao(posicao) {
    const t = String(posicao ?? '');
    const andar = Number(t.slice(0, -1));
    const ramo = t.slice(-1);
    return Number.isInteger(andar) && andar >= 1 && andar <= ANDAR_MAX && ramo && RAMOS.includes(ramo) ? { andar, ramo } : null;
  }
  const naPosicao = (linha, { andar, ramo }) => Number(linha.andar) === andar && (linha.ramo || 'a') === ramo;
  // Arrastar um andar: todas as linhas dele vão para a posição nova; em cima de outro andar, os dois trocam.
  function moverAndar(andares, de, para) {
    const origem = lerPosicao(de);
    const destino = lerPosicao(para);
    if (!origem || !destino || de === para || !andares.some(linha => naPosicao(linha, origem))) return andares;
    return andares.map(linha => (naPosicao(linha, origem) ? { ...linha, ...destino } : naPosicao(linha, destino) ? { ...linha, ...origem } : linha));
  }
  // O "+" de uma célula vazia: o andar novo ali, com uma senha DV 6.
  function criarAndar(andares, posicao) {
    const lugar = lerPosicao(posicao);
    if (!lugar || andares.some(linha => naPosicao(linha, lugar))) return andares;
    return [...andares, { ...novaLinha(andares), ...lugar }];
  }

  // ---------------- Os exemplos (os do NET Architect do Foundry) ----------------
  const linha = (andar, ramo, tipo, extra = {}) => limparLinha({ andar, ramo, tipo, ...extra });
  const EXEMPLOS = [
    { nome: 'Armazém da TLB (exemplo do livro)', descricao: 'O exemplo do livro-base (RED p. 218): quatro andares, 13.500eb.', andares: [
      linha(1, 'a', 'ice', { ice: 'hellhound' }), linha(1, 'a', 'ice', { ice: 'killer' }), linha(2, 'a', 'senha', { dv: 8 }), linha(3, 'a', 'ice', { ice: 'hellhound' }),
      linha(4, 'a', 'controle', { dv: 8, descricao: 'Torreta automática do armazém (e as câmeras do pátio).' })
    ] },
    { nome: 'Apartamento de um fixer', descricao: 'Arquitetura básica de uma casa: senha, a agenda do fixer e as câmeras.', andares: [
      linha(1, 'a', 'senha', { dv: 6 }), linha(2, 'a', 'arquivo', { dv: 6, descricao: 'Agenda de contatos: três clientes em Watson e um encontro marcado no Afterlife amanhã.' }),
      linha(3, 'a', 'controle', { dv: 6, descricao: 'Câmeras do corredor e a fechadura da porta.' })
    ] },
    { nome: 'Clínica de ripperdoc (ramificada)', descricao: 'Dois ramos: o administrativo (A) e o centro cirúrgico (B), que sai do andar 2.', andares: [
      linha(1, 'a', 'senha', { dv: 8 }), linha(2, 'a', 'ice', { ice: 'wisp' }), linha(3, 'a', 'arquivo', { dv: 8, descricao: 'Prontuários: quem instalou o quê nos últimos seis meses.' }),
      linha(4, 'a', 'ice', { ice: 'killer' }), linha(5, 'a', 'arquivo', { dv: 10, descricao: 'Lista de clientes com cyberware ilegal, com os pagamentos em dinheiro vivo.' }),
      linha(3, 'b', 'controle', { dv: 8, descricao: 'Portas do centro cirúrgico e o elevador de serviço.' }), linha(4, 'b', 'senha', { dv: 10 }),
      linha(5, 'b', 'controle', { dv: 10, descricao: 'Os dois drones de segurança da clínica.' })
    ] }
  ];

  // ---------------- O netrunner ----------------
  // As Ações NET por turno pelo rank de Interface (RED p. 197).
  const acoesPorRank = rank => (rank >= 10 ? 5 : rank >= 7 ? 4 : rank >= 4 ? 3 : 2);
  // Os programas do RED (a wiki, "Programas": o ATK, a DEF e a REZ dela; o dano do texto; o catálogo da loja só tem a
  // classe), pela chave do catálogo (core_programs:<chave>). bonus: a habilidade que o booster soma; dano: na REZ do Black
  // ICE (ice), na de um programa (programa) ou no cérebro; reduz: o que o Armor tira do dano no cérebro.
  const PROGRAMAS = {
    eraser: { nome: 'Eraser', classe: 'booster', atk: 0, def: 0, rez: 7, bonus: { cloak: 2 } },
    'see-ya': { nome: 'See Ya', classe: 'booster', atk: 0, def: 0, rez: 7, bonus: { pathfinder: 2 } },
    'speedy-gonzalvez': { nome: 'Speedy Gonzalvez', classe: 'booster', atk: 0, def: 0, rez: 7, bonus: { velocidade: 2 } },
    worm: { nome: 'Worm', classe: 'booster', atk: 0, def: 0, rez: 7, bonus: { backdoor: 2 } },
    armor: { nome: 'Armor', classe: 'defender', atk: 0, def: 0, rez: 7, reduz: 4 },
    flak: { nome: 'Flak', classe: 'defender', atk: 0, def: 0, rez: 7 },
    shield: { nome: 'Shield', classe: 'defender', atk: 0, def: 0, rez: 7 },
    banhammer: { nome: 'Banhammer', classe: 'antiprogramattacker', atk: 1, def: 0, rez: 0, dano: { programa: '3d6', ice: '2d6' } },
    sword: { nome: 'Sword', classe: 'antiprogramattacker', atk: 1, def: 0, rez: 0, dano: { programa: '2d6', ice: '3d6' } },
    deckkrash: { nome: 'DeckKRASH', classe: 'antipersonnelattacker', atk: 0, def: 0, rez: 0 },
    hellbolt: { nome: 'Hellbolt', classe: 'antipersonnelattacker', atk: 2, def: 0, rez: 0, dano: { cerebro: '2d6' }, fogo: true },
    nervescrub: { nome: 'Nervescrub', classe: 'antipersonnelattacker', atk: 0, def: 0, rez: 0 },
    'poison-flatline': { nome: 'Poison Flatline', classe: 'antipersonnelattacker', atk: 0, def: 0, rez: 0 },
    superglue: { nome: 'Superglue', classe: 'antipersonnelattacker', atk: 2, def: 0, rez: 0 },
    vrizzbolt: { nome: 'Vrizzbolt', classe: 'antipersonnelattacker', atk: 1, def: 0, rez: 0, dano: { cerebro: '1d6' }, menosAcoes: true }
  };
  const CLASSES_DE_PROGRAMA = { booster: 'Booster', defender: 'Defensor', antiprogramattacker: 'Ataque anti-programa', antipersonnelattacker: 'Ataque anti-pessoal' };
  const chaveDoNome = nome => String(nome || '').toLowerCase().replace(/\(.*\)/, '').trim().replace(/\s+/g, '-');
  // O programa pelo catálogo da loja ou pelo nome (o do Foundry); null: um programa que a mesa não conhece.
  function programaDe({ catalogo = '', nome = '' } = {}) {
    const chave = String(catalogo).startsWith('core_programs:') ? String(catalogo).slice('core_programs:'.length) : chaveDoNome(nome);
    return Object.hasOwn(PROGRAMAS, chave) ? { chave, ...PROGRAMAS[chave] } : null;
  }
  // O hardware do deck que a NET olha (o catálogo do CORE ou o nome): o Range Upgrade (+2 m no alcance), o Insulated
  // Wiring (o deck não pega fogo) e a KRASH Barrier (imune ao que força a desconexão).
  const HARDWARE = { rangeUpgrade: ['core_upgrades:range-upgrade', 'Range Upgrade'], isolado: ['core_upgrades:insulated-wiring', 'Insulated Wiring'], krash: ['core_upgrades:krash-barrier', 'KRASH Barrier'] };
  const hardwareDe = lista => Object.fromEntries(Object.entries(HARDWARE).map(([chave, [catalogo, nome]]) => [chave, lista.some(item => item.catalogo === catalogo || item.nome === nome)]));

  return {
    ENTRADA, RAMOS, ANDAR_MAX, MAX_LINHAS, TIPOS_DE_ANDAR, COM_DV, DV_SEM_ANDARES, DIFICULDADES, BLACK_ICE, ICE_GENERICO, iceDe, DEMONIOS, demonioDe, TABELAS,
    limparLinha, limparAndares, lerArquitetura, filhosDe, paiDoNo, vizinhos, ehFundo, revelarPathfinder, gerarAndares,
    novaLinha, lerPosicao, moverAndar, criarAndar, EXEMPLOS, acoesPorRank, PROGRAMAS, CLASSES_DE_PROGRAMA, programaDe, HARDWARE, hardwareDe
  };
});
