// A bancada da arma (o C70 do plano das modificações de armas): o que a aba Arsenal da ficha desenha de cada arma (os
// slots de acessório e de modificação, as peças, o defeito, o teto do ataque e a identidade) e o que cabe num slot livre.
// Duas fontes: a ficha da mesa (o Foundry 14 manda a bancada pronta, com as regras dele: foundry-sistema/scripts/wiki.mjs,
// bancadaParaAWiki) e a criação (a montagem da wiki: os acessórios na arma; as modificações só entram pelo Tech, na mesa).
// O que cabe repete, para a lista da wiki, as regras do sistema (regras-modificacoes.modCabe e as dos acessórios da
// montagem); o teste tests/sistema/bancada.test.mjs confere que as duas batem.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.characterBench = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  // As regras da casa (system-modificacoes.js e regras-modificacoes.mjs): o máximo de slots de modificação, um defeito por
  // arma e o teto da arma na rolagem.
  const MAXIMO_DE_MODS = 3;
  const DEFEITOS = 1;
  const TETO = 3;
  const CLASSES = { power: 'Power', smart: 'Smart', tech: 'Tech' };
  const LANCADORES = ['grenadeLauncher', 'rocketLauncher'];

  // A silhueta do holograma pelo tipo da arma (os tipos do CORE).
  const silhueta = tipo => (/Pistol$/.test(tipo || '') ? 'pistola' : /Melee$|^martialArts$|^unarmed$|^thrownWeapon$/.test(tipo || '') ? 'branca' : 'longa');

  // Onde a peça fica no desenho (o RED não diz: os slots são da arma; é só para ver melhor). trilho: as miras e o link;
  // pente: os carregadores; cano: o resto (a baioneta, o que vai embaixo do cano, o Rebuild).
  const POSICOES = ['trilho', 'pente', 'cano'];
  const NOMES_DAS_POSICOES = { trilho: 'No trilho', pente: 'No pente', cano: 'No cano' };
  const posicaoDe = id => (/scope|smartgun/.test(id || '') ? 'trilho' : /magazine/.test(id || '') ? 'pente' : 'cano');

  // A sigla do chip (como os da aba Cyberware): as iniciais, sem acento.
  const PEQUENAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para']);
  function sigla(nome) {
    const palavras = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(p => p && !PEQUENAS.has(p.toLowerCase()));
    if (!palavras.length) return '?';
    const texto = palavras.length >= 3 ? palavras.slice(0, 3).map(p => p[0]).join('') : palavras.length === 2 ? palavras[0][0] + palavras[1].slice(0, 2) : palavras[0].slice(0, 3);
    return texto.toUpperCase();
  }

  // Os tipos das modificações (system-modificacoes.js): a tática, o sabor e o defeito.
  const ehDeAtaque = mod => (mod && mod.efeitos || []).some(efeito => (efeito.entao || []).some(m => m.alvo === 'ataque' && m.valor > 0));

  // O modelo pela ficha da mesa: a linha da arma que o Foundry 14 mandou (com a bancada e a identidade). mods: os de
  // system-modificacoes.js (o grupo e o texto de cada uma); catalogo(id): o item da loja.
  function daMesa(linha, { mods = [], catalogo = () => null } = {}) {
    const b = linha && linha.bancada;
    const cat = catalogo(linha && linha.catalogo) || {};
    const arma = cat.arma || {};
    const porId = new Map(mods.map(mod => [mod.id, mod]));
    const pecas = b ? (b.pecas || []).map(peca => {
      const mod = peca.mod ? porId.get(peca.mod) : null;
      return peca.mod
        ? { id: peca.id, nome: peca.nome, sigla: sigla(peca.nome), tipo: peca.tipo === 'defeito' ? 'defeito' : 'modificacao', mod: peca.mod, grupo: mod ? mod.grupo : '', tamanho: Number(peca.tamanho) || 0, texto: mod ? mod.texto : '', raridade: peca.raridade || '' }
        : { id: peca.id, nome: peca.nome, sigla: sigla(peca.nome), tipo: 'acessorio', catalogo: peca.catalogo || '', tamanho: Number(peca.tamanho) || 0, posicao: posicaoDe(peca.catalogo), texto: (catalogo(peca.catalogo) || {}).resumo || '' };
    }) : [];
    return montar({
      fonte: 'mesa', id: `foundry:${linha.id}`, modelo: linha.nome, identidade: linha.identidade || null,
      aDistancia: b ? Boolean(b.aDistancia) : Boolean(linha.distancia), tipo: (b && b.tipo) || arma.tipo || '', classeCore: arma.classe || '', maos: Number(linha.maos) || Number(arma.maos) || 1,
      classe: b ? b.classe || null : (arma.mods && arma.mods.classe) || null, exotica: Boolean(arma.exotica),
      acessorios: b ? b.acessorios : null, modificacoes: b ? b.modificacoes : null, pecas, ataque: b ? b.ataque || null : null, semBancada: !b,
      dano: linha.dano || arma.dano || '', cdt: linha.cdt || arma.cdt || 1
    });
  }

  // O modelo pela criação: a arma da montagem (row: { uid, nome, item }) e os acessórios montados nela.
  function daCriacao(row, acessorios = []) {
    const arma = (row && row.item && row.item.arma) || {};
    const pecas = acessorios.map(acc => ({ id: acc.uid, nome: acc.nome || acc.item.nome, sigla: sigla(acc.nome || acc.item.nome), tipo: 'acessorio', catalogo: acc.item.id, tamanho: (acc.item.acessorio || {}).tamanho || 0, posicao: posicaoDe(acc.item.id), texto: acc.item.resumo || '' }));
    const usados = pecas.reduce((soma, peca) => soma + peca.tamanho, 0);
    return montar({
      fonte: 'criacao', id: row.uid, modelo: row.nome || row.item.nome, identidade: null,
      aDistancia: Boolean(arma.distancia), tipo: (arma.mods && arma.mods.tipo) || arma.tipo || '', classeCore: arma.classe || '', maos: Number(arma.maos) || 1, classe: (arma.mods && arma.mods.classe) || null, exotica: Boolean(arma.exotica),
      acessorios: { usados, total: Number(arma.slots) || 0 }, modificacoes: { usados: 0, total: (arma.mods && arma.mods.slots) || 0 }, pecas, ataque: null, semBancada: false,
      dano: arma.dano || '', cdt: arma.cdt || 1
    });
  }

  // O modelo inteiro: os slots livres, as posições do desenho e o teto.
  function montar(base) {
    const acessorios = base.acessorios || { usados: 0, total: 0 };
    const modificacoes = base.modificacoes || { usados: 0, total: 0 };
    const deAcessorio = base.pecas.filter(peca => peca.tipo === 'acessorio');
    const deModificacao = base.pecas.filter(peca => peca.tipo === 'modificacao');
    const defeito = base.pecas.find(peca => peca.tipo === 'defeito') || null;
    // As peças nas posições: cada uma na dela; a segunda na mesma posição, e os slots livres, nas que sobram.
    const livresDeAcessorio = Math.max(0, acessorios.total - acessorios.usados);
    const usadas = new Set();
    const lugares = [];
    for (const peca of deAcessorio) {
      const posicao = usadas.has(peca.posicao) ? POSICOES.find(p => !usadas.has(p)) || peca.posicao : peca.posicao;
      usadas.add(posicao);
      lugares.push({ posicao, nomeDaPosicao: NOMES_DAS_POSICOES[posicao], peca });
    }
    for (let i = 0; i < livresDeAcessorio; i++) {
      const posicao = POSICOES.find(p => !usadas.has(p)) || 'cano';
      usadas.add(posicao);
      lugares.push({ posicao, nomeDaPosicao: NOMES_DAS_POSICOES[posicao], peca: null, livre: `acessorio:${i}` });
    }
    const livresDeModificacao = Math.max(0, modificacoes.total - modificacoes.usados);
    return {
      ...base, silhueta: silhueta(base.tipo), acessorios, modificacoes, lugares, deModificacao, defeito,
      livresDeModificacao: Array.from({ length: livresDeModificacao }, (_, i) => `modificacao:${i}`),
      apelido: (base.identidade && base.identidade.apelido) || '', teto: teto(base.ataque)
    };
  }

  // O teto da arma: os bônus fixos (a qualidade, a arma Smart, os acessórios) e os de uma situação (a modificação, a
  // luneta), que somam até +3 na rolagem. Os negativos (um defeito) ficam à parte.
  function teto(ataque) {
    if (!ataque) return null;
    const positivo = partes => (partes || []).filter(parte => Number(parte.valor) > 0);
    const soma = partes => partes.reduce((total, parte) => total + Number(parte.valor), 0);
    const fixo = soma(positivo(ataque.fixos));
    const situacional = soma(positivo(ataque.situacionais));
    const maximo = Number(ataque.teto) || TETO;
    return {
      fixo, situacional, maximo, melhor: Math.min(maximo, fixo + situacional),
      fixos: positivo(ataque.fixos), situacionais: positivo(ataque.situacionais), negativos: (ataque.fixos || []).filter(parte => Number(parte.valor) < 0)
    };
  }

  // A modificação nova cabe na arma? A mesma regra do regras-modificacoes.modCabe (sem validar a modificação: as da wiki
  // já são as do catálogo). instaladas: os mods (de system-modificacoes.js) que já estão nela.
  function modCabe(modelo, instaladas, nova) {
    const recusa = motivo => ({ cabe: false, motivo });
    const encaixe = nova.encaixe || {};
    if (encaixe.aDistancia !== undefined && Boolean(modelo.aDistancia) !== encaixe.aDistancia) return recusa(encaixe.aDistancia ? 'só serve em arma de longo alcance' : 'só serve em arma branca');
    if (encaixe.tipos && !encaixe.tipos.includes(modelo.tipo)) return recusa('não serve neste tipo de arma');
    if (encaixe.classe && modelo.classe !== encaixe.classe) return recusa(`só serve em arma ${CLASSES[encaixe.classe]}`);
    if (instaladas.some(mod => mod.id === nova.id)) return recusa('a arma já tem esta modificação');
    const defeitos = instaladas.filter(mod => mod.tipo === 'defeito').length + (nova.tipo === 'defeito' ? 1 : 0);
    if (defeitos > DEFEITOS) return recusa('só cabe um defeito por arma');
    if (ehDeAtaque(nova) && instaladas.some(ehDeAtaque)) return recusa('só cabe uma modificação de ataque por arma');
    const usados = instaladas.reduce((soma, mod) => soma + mod.tamanho, 0) + nova.tamanho;
    // O total do modelo já conta o defeito instalado; o defeito novo dá mais um.
    const total = Math.min(MAXIMO_DE_MODS, modelo.modificacoes.total + (nova.tipo === 'defeito' && defeitos === 1 && !instaladas.some(mod => mod.tipo === 'defeito') ? 1 : 0));
    if (usados > total) return recusa(`não há slot de modificação livre (a arma tem ${total})`);
    return { cabe: true, motivo: '' };
  }

  // O acessório novo cabe? As regras da montagem da wiki (criador.js, accessoryFits: arma de distância, que não seja
  // exótica, com slots; com classe no nome, só nela; o de baixo do cano só em arma de duas mãos), os slots livres e um
  // carregador por vez (regras.acessorioCabe); o Rebuild, as dele (regras.rebuildCabe).
  function acessorioCabe(modelo, item) {
    const recusa = motivo => ({ cabe: false, motivo });
    const acc = item.acessorio || {};
    const rebuild = /-rebuild$/.test(item.id || '');
    const instalados = modelo.pecas.filter(peca => peca.tipo === 'acessorio');
    if (!modelo.aDistancia) return recusa('acessório só em arma de longo alcance');
    // O Rebuild, na ordem do regras.rebuildCabe: a arma de 2077, um por arma, o Tech fora dos lançadores; depois os slots.
    if (rebuild) {
      if (modelo.classe) return recusa('a arma já é de 2077 e vem com o Rebuild dela');
      if (instalados.some(peca => /-rebuild$/.test(peca.catalogo || ''))) return recusa('só cabe um Rebuild por arma');
      if (/tech-rebuild$/.test(item.id) && LANCADORES.includes(modelo.tipo)) return recusa('o Tech Rebuild não serve em lança-granadas nem em lança-foguetes');
    } else if (modelo.exotica) return recusa('a arma exótica não leva acessório');
    if (!modelo.acessorios.total) return recusa('a arma não tem slots de acessório');
    if (acc.classe && acc.classe !== modelo.classeCore) return recusa(`só em ${acc.classe}`);
    if (/underbarrel/.test(item.id || '') && modelo.maos < 2) return recusa('só em arma de duas mãos');
    if (/magazine/.test(item.id || '') && instalados.some(peca => /magazine/.test(peca.catalogo || ''))) return recusa('só cabe um carregador por vez');
    if (modelo.acessorios.usados + (Number(acc.tamanho) || 0) > modelo.acessorios.total) return recusa(`${modelo.acessorios.usados} de ${modelo.acessorios.total} slots em uso`);
    return { cabe: true, motivo: '' };
  }

  // A primeira frase do texto da modificação (a lista do slot livre fica curta; a ficha da peça tem o texto inteiro).
  const primeiraFrase = texto => {
    const inteiro = String(texto || '');
    const fim = inteiro.search(/\.(\s|$)/);
    return fim < 0 ? inteiro : inteiro.slice(0, fim + 1);
  };

  // O que cabe num slot livre: as modificações à venda (o defeito é sorteado pelo mestre, não se compra) ou os acessórios
  // da loja. Devolve { cabem, naoCabem }, cada um com { id, nome, nota }.
  function cabeNoSlot(modelo, tipo, { mods = [], loja = [] } = {}) {
    const cabem = [];
    const naoCabem = [];
    if (tipo === 'modificacao') {
      const porId = new Map(mods.map(mod => [mod.id, mod]));
      const instaladas = modelo.pecas.filter(peca => peca.mod).map(peca => porId.get(peca.mod)).filter(Boolean);
      for (const mod of mods.filter(item => item.tipo !== 'defeito' && item.eb > 0)) {
        const { cabe, motivo } = modCabe(modelo, instaladas, mod);
        (cabe ? cabem : naoCabem).push({ id: `mods-armas:${mod.id}`, nome: mod.nome, nota: cabe ? `${mod.tamanho} slot · ${primeiraFrase(mod.texto)}` : motivo });
      }
    } else {
      for (const item of loja.filter(entrada => entrada.acessorio)) {
        const { cabe, motivo } = acessorioCabe(modelo, item);
        (cabe ? cabem : naoCabem).push({ id: item.id, nome: item.nome, nota: cabe ? item.resumo || '' : motivo });
      }
    }
    return { cabem, naoCabem };
  }

  // O diário da arma (o que o Foundry mandou: o regras-identidade.paraAWiki), os mais novos primeiro, numa linha cada (como
  // o regras-identidade.descreverEvento).
  function dataCurta(data) {
    const dia = new Date(data);
    return Number.isNaN(dia.getTime()) ? '' : `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}/${dia.getFullYear()}`;
  }
  function descrever(evento) {
    const linha = {
      origem: () => evento.texto || 'Origem',
      sessao: () => 'Lutou nesta sessão',
      primeiroSangue: () => `Primeiro sangue: ${evento.alvo || ''}`,
      abate: () => `Abate: ${evento.alvo || ''}`,
      critico: () => `Crítico em ${evento.alvo || ''}`,
      marco: () => `${evento.texto || ''}${evento.por ? ` (${evento.por})` : ''}`
    }[evento && evento.tipo];
    if (!linha) return '';
    const quando = dataCurta(evento.data);
    return quando ? `${quando}: ${linha()}` : linha();
  }
  const diario = (identidade, limite = Infinity) => ((identidade && identidade.diario) || []).slice().reverse().map(descrever).filter(Boolean).slice(0, limite);

  return { daMesa, daCriacao, cabeNoSlot, modCabe, acessorioCabe, ehDeAtaque, sigla, silhueta, posicaoDe, diario, TETO, NOMES_DAS_POSICOES };
});
