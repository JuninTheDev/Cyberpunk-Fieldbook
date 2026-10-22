// A NET na mesa da wiki (M13), no servidor: as arquiteturas da campanha (o mestre cria, edita, gera pelas tabelas do
// CORE e importa do Foundry) e o netrunner de cada token (o rank de Interface, o cyberdeck, os programas e o hardware).
// As regras puras ficam em mesa-net.js (o navegador usa a mesma conta para o editor e para o mapa).
//
// As arquiteturas ficam no mesa.json da campanha (state.arquiteturas) e só o mestre recebe: os DVs, o Black ICE e o que
// cada arquivo e nó de controle guarda são segredo até o netrunner chegar lá.
'use strict';
const N = require('./mesa-net');

const MAX_ARQUITETURAS = 100;

module.exports = function createNet(ctx) {
  const { fail, int, line, block, newId, pool } = ctx;

  // ---------------- As arquiteturas ----------------
  const arquiteturasDe = state => (Array.isArray(state.arquiteturas) ? state.arquiteturas : (state.arquiteturas = []));
  // Uma arquitetura conferida: o nome, a descrição, a DV (0: a maior dos andares) e os andares (mesa-net.js limparLinha).
  // atual: a de antes (editar troca só o que veio).
  function limparArquitetura(input = {}, atual = {}) {
    const nome = line(input.nome ?? atual.nome, 60);
    if (!nome) throw fail(400, 'Dê um nome à arquitetura.');
    const andares = input.andares !== undefined ? N.limparAndares(input.andares) : atual.andares || [];
    if (!andares.length) throw fail(400, 'A arquitetura precisa de pelo menos um andar.');
    return { nome, descricao: block(input.descricao ?? atual.descricao ?? '', 1000).trim(), dv: int(input.dv ?? atual.dv, 0, 20, 0), andares };
  }
  const cleanOrigem = input => (input && typeof input === 'object' && input.id ? { sistema: 'foundry', mundo: line(input.mundo, 80), id: line(input.id, 60) } : null);
  // A rolagem das tabelas ("3d6", "1d10"), pelos dados do servidor.
  const rolar = formula => {
    const [quantos, faces] = String(formula).split('d').map(Number);
    return pool(quantos, faces).reduce((soma, valor) => soma + valor, 0);
  };
  // O que o mestre recebe: cada arquitetura inteira (para editar e escolher).
  const arquiteturasFor = state => arquiteturasDe(state).map(arq => ({ ...arq, andares: arq.andares.map(linha => ({ ...linha })) }));

  const operations = {
    // Criar ou editar: { id (editar), arquitetura: { nome, descricao, dv, andares }, origem (a importação do Foundry: 409 se
    // já veio), substituir (troca a que veio, mantendo o id) }.
    'arquitetura.salvar': { mestre: true, run({ state, body }) {
      const lista = arquiteturasDe(state);
      const input = body.arquitetura && typeof body.arquitetura === 'object' ? body.arquitetura : {};
      const origem = cleanOrigem(body.origem);
      const atual = body.id ? lista.find(arq => arq.id === String(body.id))
        : origem ? lista.find(arq => arq.origem && arq.origem.id === origem.id && arq.origem.mundo === origem.mundo) : null;
      if (body.id && !atual) throw fail(404, 'Arquitetura não encontrada.');
      if (atual && !body.id && !body.substituir) throw fail(409, `${atual.nome} já foi importada.`);
      if (atual) {
        Object.assign(atual, body.id ? limparArquitetura(input, atual) : limparArquitetura(input));
        return { arquiteturas: true, resultado: { id: atual.id } };
      }
      if (lista.length >= MAX_ARQUITETURAS) throw fail(400, `Até ${MAX_ARQUITETURAS} arquiteturas: apague uma antes.`);
      const nova = { id: `arq:${newId()}`, ...limparArquitetura(input), ...(origem ? { origem } : {}) };
      lista.push(nova);
      return { arquiteturas: true, resultado: { id: nova.id } };
    } },
    'arquitetura.apagar': { mestre: true, run({ state, body }) {
      const lista = arquiteturasDe(state);
      const arq = lista.find(item => item.id === String(body.id || ''));
      if (!arq) throw fail(404, 'Arquitetura não encontrada.');
      state.arquiteturas = lista.filter(item => item !== arq);
      return { arquiteturas: true };
    } },
    // Gerar pelas tabelas do CORE: { dificuldade (basica, padrao, incomum, avancada), nome }. O servidor rola.
    'arquitetura.gerar': { mestre: true, run({ state, body }) {
      const lista = arquiteturasDe(state);
      if (!Object.hasOwn(N.DIFICULDADES, body.dificuldade)) throw fail(400, 'Escolha a dificuldade: básica, padrão, incomum ou avançada.');
      if (lista.length >= MAX_ARQUITETURAS) throw fail(400, `Até ${MAX_ARQUITETURAS} arquiteturas: apague uma antes.`);
      const { andares, total, ramosAMais } = N.gerarAndares({ dificuldade: body.dificuldade, rolar });
      const nome = line(body.nome, 60) || `Arquitetura ${N.DIFICULDADES[body.dificuldade].toLowerCase()} (${total} andares)`;
      const nova = { id: `arq:${newId()}`, nome, descricao: `Gerada pelas tabelas: ${total} andares, ${ramosAMais + 1} ${ramosAMais ? 'ramos' : 'ramo'}.`, dv: 0, andares };
      lista.push(nova);
      return { arquiteturas: true, resultado: { id: nova.id, total, ramosAMais } };
    } }
  };

  // ---------------- O netrunner ----------------
  // O do personagem, pela ficha (personagem-jogo.js ficha): o rank de Interface (roles: a lista das Roles com o rank), o
  // cyberdeck equipado (os slots pelo catálogo), os programas e o hardware dentro dele. null: nem netrunner, nem deck.
  function netrunnerDaFicha(roles, ficha, catalogo) {
    const rank = Number((roles.find(role => role.id === 'netrunner') || {}).rank) || 0;
    const deck = ficha.itens.find(item => item.tipo === 'deck' && item.uso === 'equipado') || null;
    if (!rank && !deck) return null;
    const dentro = deck ? ficha.noDeck.filter(item => item.em === deck.id) : [];
    const programas = dentro.filter(item => item.tipo === 'programa').map(item => {
      const p = N.programaDe(item) || { chave: '', classe: '', atk: 0, def: 0, rez: 0 };
      return { id: item.id, nome: item.nome, chave: p.chave, classe: p.classe, atk: p.atk, def: p.def, rez: p.rez, rezAtual: Math.max(0, p.rez - (item.rezPerdida || 0)),
        ativo: Boolean(item.ativo), qtd: item.qtd || 1, ...(item.destruido ? { destruido: true } : {}) };
    });
    const hardware = dentro.filter(item => item.tipo === 'hardware').map(({ id, nome, catalogo: cat }) => ({ id, nome, catalogo: cat }));
    const slots = deck ? Number(((catalogo.item(deck.catalogo) || {}).deck || {}).slots) || 0 : 0;
    return { rank, acoes: N.acoesPorRank(rank), deck: deck ? { id: deck.id, nome: deck.nome, slots } : null, programas, hardware, ...N.hardwareDe(hardware) };
  }
  // O do NPC: o rank pela perícia Interface da ficha (as do livro e as do mestre trazem o rank, não STAT + perícia).
  function netrunnerDoNpc(token) {
    const interface_ = (token.pericias || []).find(item => item.nome === 'Interface');
    const rank = interface_ ? Number(interface_.base) || 0 : 0;
    return rank ? { rank, acoes: N.acoesPorRank(rank), deck: null, programas: [], hardware: [] } : null;
  }

  return { operations, arquiteturasFor, netrunnerDaFicha, netrunnerDoNpc };
};
