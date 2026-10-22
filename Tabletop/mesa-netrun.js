// A NET na mesa da wiki (M13), no servidor: as arquiteturas da campanha (o mestre cria, edita, gera pelas tabelas do
// CORE e importa do Foundry) e o netrunner de cada token (o rank de Interface, o cyberdeck, os programas e o hardware).
// As regras puras ficam em mesa-net.js (o navegador usa a mesma conta para o editor e para o mapa).
//
// As arquiteturas ficam no mesa.json da campanha (state.arquiteturas) e só o mestre recebe: os DVs, o Black ICE e o que
// cada arquivo e nó de controle guarda são segredo até o netrunner chegar lá.
//
// O netrun (a fase 2): o ponto de acesso é um marcador no mapa (scene.pontosNet) que aponta para uma arquitetura. O
// netrunner conecta pelo token (perto, sem parede no meio, com o deck e a Interface que o ponto pede) e anda pela
// arquitetura; o estado de cada ponto fica em scene.netrun[ponto] (mesa-net.js estadoNovo), e o token conectado ganha
// token.netConexao. O netrunner vê só o que achou (mesa-net.js vistaPublica); o mestre vê tudo. O que o arquivo e o nó
// revelam fica na janela da NET; o chat leva só a rolagem e o resultado.
'use strict';
const N = require('./mesa-net');

const MAX_ARQUITETURAS = 100;
const MAX_PONTOS = 50;

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

  const netrunnerDe = token => (token.tipo === 'pj' ? token.netrunner || null : token.tipo === 'npc' ? netrunnerDoNpc(token) : null);

  // ---------------- Os pontos de acesso ----------------
  const pontosDe = scene => (Array.isArray(scene.pontosNet) ? scene.pontosNet : (scene.pontosNet = []));
  const runsDe = scene => (scene.netrun && typeof scene.netrun === 'object' ? scene.netrun : (scene.netrun = {}));
  // A configuração conferida (atual: a de antes; editar troca só o que veio).
  function limparPonto(state, input = {}, atual = N.PONTO_PADRAO) {
    const valor = (campo, padrao) => (input[campo] === undefined ? (atual[campo] === undefined ? padrao : atual[campo]) : input[campo]);
    const arquitetura = String(valor('arquitetura', ''));
    if (arquitetura && !(state.arquiteturas || []).some(arq => arq.id === arquitetura)) throw fail(400, 'Arquitetura não encontrada.');
    return {
      nome: line(valor('nome', N.PONTO_PADRAO.nome), 40) || N.PONTO_PADRAO.nome, arquitetura,
      alcance: Math.round(Math.min(100, Math.max(0, Number(valor('alcance', 6)) || 0)) * 10) / 10, dv: int(valor('dv', 0), 0, 20, 0),
      exigeDeck: Boolean(valor('exigeDeck', true)), rankMinimo: int(valor('rankMinimo', 1), 0, 10, 1),
      oculto: Boolean(valor('oculto', false)), dvScanner: int(valor('dvScanner', 10), 2, 30, 10), reiniciar: Boolean(valor('reiniciar', true)),
      revelados: Array.isArray(atual.revelados) ? atual.revelados : []
    };
  }
  // O ponto pelo id, na cena aberta (o mestre, em qualquer cena).
  function pontoArg(state, viewer, id) {
    for (const scene of state.cenas) {
      const ponto = pontosDe(scene).find(item => item.id === String(id || ''));
      if (!ponto) continue;
      if (!ctx.isGm(viewer) && scene.id !== state.cenaAtiva) break;
      return { scene, ponto };
    }
    throw fail(404, 'Ponto de acesso não encontrado.');
  }
  // A arquitetura do ponto, lida (com a DV do ponto por cima), e a crua.
  function arquiteturaDoPonto(state, ponto) {
    const crua = (state.arquiteturas || []).find(arq => arq.id === ponto.arquitetura);
    if (!crua) throw fail(409, 'Este ponto de acesso ainda não tem arquitetura: o mestre escolhe nas opções do ponto.');
    return { crua, arq: N.lerArquitetura({ ...crua, dv: Number(ponto.dv) || crua.dv }) };
  }
  // O estado do netrun no ponto: o de antes, ou um novo (a arquitetura trocou ou foi editada: recomeça).
  function estadoDe(scene, ponto, crua) {
    const runs = runsDe(scene);
    const atual = runs[ponto.id];
    if (atual && atual.arquitetura === crua.id && atual.assinatura === N.assinaturaDe(crua)) return atual;
    // Quem estava conectado à arquitetura velha cai fora.
    for (const corredor of (atual && atual.corredores) || []) { const token = scene.tokens.find(item => item.id === corredor.token); if (token) delete token.netConexao; }
    return (runs[ponto.id] = N.estadoNovo(crua));
  }
  const emCombate = (state, scene, token) => Boolean(state.combate && state.combate.cena === scene.id && state.combate.ordem.some(item => item.token === token.id));
  const nomeDaFicha = state => id => { const npc = (state.npcs || []).find(item => item.id === id); return npc ? npc.nome : ''; };
  // O netrunner conectado ao ponto: o token (de quem pede) e o corredor dele.
  function corredorArg(state, viewer, body) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const { token } = ctx.tokenArg(state, viewer, body.token);
    if (!ctx.canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
    const est = runsDe(scene)[ponto.id];
    const corredor = est && est.corredores.find(item => item.token === token.id);
    if (!corredor) throw fail(409, `${token.nome} não está conectado a este ponto de acesso.`);
    const { arq } = arquiteturaDoPonto(state, ponto);
    return { scene, ponto, token, est, corredor, arq };
  }
  // Tira o netrunner da NET (segura ou insegura). Sem ninguém conectado, as defesas reiniciam (os arquivos copiados ficam):
  // o Black ICE e os demônios voltam com a REZ cheia, as senhas e os nós trancam de novo.
  function retirar(scene, ponto, est, arq, corredor, { inseguro = false, motivo = '' } = {}) {
    est.corredores = est.corredores.filter(item => item !== corredor);
    const token = scene.tokens.find(item => item.id === corredor.token);
    if (token) delete token.netConexao;
    N.registrar(est, inseguro ? `${corredor.nome} caiu da NET${motivo ? ` (${motivo})` : ''}: desconexão insegura.` : `${corredor.nome} desconectou.`, inseguro ? 'falha' : 'info');
    if (!est.corredores.length && ponto.reiniciar !== false) {
      est.ices = [];
      est.fora = [];
      est.feitos = est.feitos.filter(chave => { const achado = N.acharConteudo(arq, chave); return achado && achado.conteudo.tipo === 'arquivo'; });
      N.registrar(est, 'Ninguém na NET: a arquitetura reiniciou as defesas.', 'info');
    }
  }
  // O cartão da NET no chat (para todos): a rolagem e o resultado, sem o que o arquivo e o nó revelam.
  const entradaDaNet = (state, viewer, color, { acao, titulo, quem, rolagens = [], frase, resultado = '' }) => ctx.addEntry(state, {
    tipo: 'net', autor: ctx.authorOf(viewer, color), quem, net: { acao, titulo, quem, alvo: null, rolagens, frase, notas: [], resultado }
  });
  // O teste de Interface: o rank + 1d10, com as penalidades (o ferimento, o agarrão), o modificador e a Sorte.
  function testeDeInterface(token, netrunner, { mod = 0, sorte = 0, extras = [] }, mudancas) {
    const { rolar, penalidadesDe, gastarSorte } = ctx.ajuda;
    const partes = [{ rotulo: 'Interface', valor: netrunner.rank }, ...extras, ...penalidadesDe(token)];
    const ajuste = int(mod, -30, 30, 0);
    if (ajuste) partes.push({ rotulo: 'Modificador', valor: ajuste });
    const gasto = gastarSorte(token, sorte, mudancas);
    if (gasto) partes.push(gasto);
    return rolar(partes);
  }

  operations['net.ponto.criar'] = { mestre: true, run({ state, body }) {
    const scene = ctx.sceneArg(state, body.cena);
    const pontos = pontosDe(scene);
    if (pontos.length >= MAX_PONTOS) throw fail(400, `Até ${MAX_PONTOS} pontos de acesso por cena.`);
    const ponto = { id: newId(), ...ctx.naCena(scene, Number(body.x) || 0, Number(body.y) || 0), ...limparPonto(state, body.ponto || {}) };
    pontos.push(ponto);
    return { net: scene.id, resultado: { ponto: ponto.id } };
  } };
  // Editar: { ponto, x, y, ...configuração }. Trocar a arquitetura recomeça o netrun (quem estava conectado cai fora).
  operations['net.ponto.editar'] = { mestre: true, run({ state, viewer, body }) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const novo = limparPonto(state, body, ponto);
    if (body.x !== undefined && body.y !== undefined) Object.assign(ponto, ctx.naCena(scene, Number(body.x) || 0, Number(body.y) || 0));
    Object.assign(ponto, novo);
    return { net: scene.id, tokens: true };
  } };
  operations['net.ponto.apagar'] = { mestre: true, run({ state, viewer, body }) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const est = runsDe(scene)[ponto.id];
    for (const corredor of (est && est.corredores) || []) { const token = scene.tokens.find(item => item.id === corredor.token); if (token) delete token.netConexao; }
    delete runsDe(scene)[ponto.id];
    scene.pontosNet = pontosDe(scene).filter(item => item !== ponto);
    return { net: scene.id, tokens: true };
  } };

  // Conectar: { ponto, token }. 1 Ação NET (em combate). O jogador: perto (o alcance do ponto, mais o Range Upgrade), sem
  // parede no meio, com o deck e a Interface que o ponto pede; o mestre conecta qualquer um.
  operations['net.conectar'] = { run({ state, viewer, body, color }) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const { token } = ctx.tokenArg(state, viewer, body.token);
    if (!ctx.canControl(viewer, token)) throw fail(403, 'Esse token não é seu.');
    if (!scene.tokens.includes(token)) throw fail(400, 'O token está em outra cena.');
    if (token.morto || token.inconsciente) throw fail(400, `${token.nome} não está em condição de conectar.`);
    if (!ctx.isGm(viewer) && ponto.oculto && !(ponto.revelados || []).includes(viewer.conta)) throw fail(404, 'Ponto de acesso não encontrado.');
    if (token.netConexao) {
      if (token.netConexao.ponto === ponto.id) return { resultado: { conectado: true } };
      throw fail(409, `${token.nome} já está conectado em outro ponto de acesso.`);
    }
    const { crua, arq } = arquiteturaDoPonto(state, ponto);
    const netrunner = netrunnerDe(token) || { rank: 0, deck: null };
    if (!ctx.isGm(viewer)) {
      const faltas = N.faltasPara(ponto, netrunner);
      if (faltas.length) throw fail(400, `Para conectar aqui falta: ${faltas.join(' e ')}.`);
      const longe = ctx.distanciaAoPonto(scene, token, ponto);
      const alcance = N.alcanceDoPonto(ponto, netrunner);
      if (longe > alcance) throw fail(400, `Longe demais do ponto de acesso: ${longe} m (alcance ${alcance} m).`);
      if (ctx.atravessa(scene.paredes || [], token, ponto)) throw fail(400, 'Uma parede fica entre o token e o ponto de acesso.');
    }
    const est = estadoDe(scene, ponto, crua);
    const corredor = N.novoCorredor({ token: token.id, nome: token.nome, dono: token.dono || null, rank: netrunner.rank });
    const motivo = N.gastarAcoes(corredor, { emCombate: emCombate(state, scene, token), mestre: ctx.isGm(viewer) });
    if (motivo) throw fail(409, motivo);
    est.corredores.push(corredor);
    token.netConexao = { ponto: ponto.id, desde: Date.now() };
    N.registrar(est, `${token.nome} conectou em ${ponto.nome}.`, 'info');
    const registro = entradaDaNet(state, viewer, color, { acao: 'conectar', titulo: 'Conectou na NET', quem: token.nome, frase: `${token.nome} conectou em ${ponto.nome} (${arq.nome}).`, resultado: 'ok' });
    return { net: scene.id, tokens: true, registro, resultado: { conectado: true } };
  } };
  // Desconectar: { ponto, token, inseguro }. A segura gasta 1 Ação NET (em combate); com o Kraken, só a insegura.
  operations['net.desconectar'] = { run({ state, viewer, body, color }) {
    const { scene, ponto, token, est, corredor, arq } = corredorArg(state, viewer, body);
    const inseguro = Boolean(body.inseguro);
    if (!inseguro && !ctx.isGm(viewer)) {
      const preso = N.motivoParaNaoDesconectar(corredor);
      if (preso) throw fail(409, preso);
      const motivo = N.gastarAcoes(corredor, { emCombate: emCombate(state, scene, token) });
      if (motivo) throw fail(409, motivo);
    }
    retirar(scene, ponto, est, arq, corredor, { inseguro, motivo: inseguro ? 'desconectou à força' : '' });
    const registro = entradaDaNet(state, viewer, color, { acao: 'desconectar', titulo: 'Desconectou da NET', quem: token.nome, frase: inseguro ? `${token.nome} desconectou de forma insegura.` : `${token.nome} desconectou da NET.`, resultado: inseguro ? 'inseguro' : 'ok' });
    return { net: scene.id, tokens: true, registro };
  } };
  // Andar: { ponto, token, destino }. Andar pela arquitetura não é Ação NET.
  operations['net.mover'] = { run({ state, viewer, body }) {
    const { scene, est, corredor, arq } = corredorArg(state, viewer, body);
    const destino = String(body.destino || '');
    const motivo = N.motivoParaNaoAndar(arq, est, corredor, destino);
    if (motivo) throw fail(409, motivo);
    const descendo = N.filhosDe(arq, corredor.no).includes(destino);
    Object.assign(corredor, { no: destino, engajado: [], escapou: [] });
    if (destino !== N.ENTRADA && !est.vistos.includes(destino)) est.vistos = [...est.vistos, destino];
    const no = arq.nos[destino];
    N.registrar(est, destino === N.ENTRADA ? `${corredor.nome} voltou ao ponto de acesso.`
      : `${corredor.nome} ${descendo ? 'desceu' : 'subiu'} para o andar ${no.andar}${no.ramo !== 'a' ? ` (ramo ${no.ramo.toUpperCase()})` : ''}: ${N.resumoDoAndar(arq, destino, nomeDaFicha(state))}.`, 'info');
    return { net: scene.id };
  } };
  // As habilidades contra os andares: { ponto, token, habilidade, alvo (a chave do conteúdo), texto (o vírus), mod, sorte }.
  // 1 Ação NET (em combate). O Zap e o Slide são contra os inimigos (a fase 3).
  operations['net.habilidade'] = { async run({ state, viewer, body, campaignId, color }) {
    const { scene, token, est, corredor, arq } = corredorArg(state, viewer, body);
    const chave = String(body.habilidade || '');
    if (!['pathfinder', 'backdoor', 'eyedee', 'control', 'cloak', 'virus'].includes(chave)) throw fail(400, N.HABILIDADES[chave] ? `${N.HABILIDADES[chave].nome} é contra os inimigos do andar.` : 'Habilidade desconhecida.');
    const { alvo, erro } = N.alvoDaHabilidade(arq, est, corredor, chave, String(body.alvo || ''));
    if (erro) throw fail(409, erro);
    const netrunner = netrunnerDe(token) || { rank: 0 };
    const motivo = N.gastarAcoes(corredor, { emCombate: emCombate(state, scene, token), mestre: ctx.isGm(viewer) });
    if (motivo) throw fail(409, motivo);
    const mudancas = {};
    const rolagem = testeDeInterface(token, netrunner, { mod: body.mod, sorte: body.sorte }, mudancas);
    if (Object.keys(mudancas).length) await ctx.writeSheet(campaignId, token, mudancas);
    const r = N.resolverHabilidade(arq, est, corredor, { chave, alvo, total: rolagem.total, texto: line(body.texto, 120) });
    N.registrar(est, r.segredo ? `${r.texto} ${r.segredo}` : r.texto, r.tipo);
    const info = N.HABILIDADES[chave];
    const registro = entradaDaNet(state, viewer, color, { acao: chave, titulo: info.nome, quem: corredor.nome, rolagens: [{ quem: corredor.nome, rotulo: info.nome, rolagem }], frase: r.texto, resultado: r.tipo === 'ok' ? 'passou' : 'falhou' });
    return { net: scene.id, tokens: Object.keys(mudancas).length > 0, registro, resultado: { total: rolagem.total, ok: r.tipo === 'ok' } };
  } };
  // Comandar o nó de controle tomado no andar: { ponto, token, texto }. 1 Ação NET; o mestre narra.
  operations['net.comandar'] = { run({ state, viewer, body }) {
    const { scene, token, est, corredor, arq } = corredorArg(state, viewer, body);
    const no = N.conteudosDoNo(arq, corredor.no).find(conteudo => conteudo.tipo === 'controle' && est.feitos.includes(conteudo.chave));
    if (!no) throw fail(409, 'Não há nó de controle tomado neste andar.');
    const texto = line(body.texto, 200);
    if (!texto) throw fail(400, 'Escreva o comando.');
    const motivo = N.gastarAcoes(corredor, { emCombate: emCombate(state, scene, token), mestre: ctx.isGm(viewer) });
    if (motivo) throw fail(409, motivo);
    N.registrar(est, `${corredor.nome} comanda o nó de controle: “${texto}”.`, 'info');
    return { net: scene.id };
  } };
  // O mestre revela o mapa todo ({ tudo }) ou um andar ({ no }), e reinicia o netrun (quem está conectado volta à entrada).
  operations['net.revelar'] = { mestre: true, run({ state, viewer, body }) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const { crua, arq } = arquiteturaDoPonto(state, ponto);
    const est = estadoDe(scene, ponto, crua);
    if (body.tudo) { est.mapa = true; N.registrar(est, 'O mestre revelou o mapa da arquitetura.', 'info'); }
    else if (arq.nos[body.no] && !est.vistos.includes(body.no)) { est.vistos = [...est.vistos, body.no]; N.registrar(est, `O mestre revelou o andar ${arq.nos[body.no].andar}.`, 'info'); }
    return { net: scene.id };
  } };
  operations['net.reiniciar'] = { mestre: true, run({ state, viewer, body }) {
    const { scene, ponto } = pontoArg(state, viewer, body.ponto);
    const { crua } = arquiteturaDoPonto(state, ponto);
    const antes = runsDe(scene)[ponto.id];
    const novo = N.estadoNovo(crua);
    novo.corredores = ((antes && antes.corredores) || []).map(corredor => ({ ...corredor, no: N.ENTRADA, engajado: [], escapou: [], skunks: [], acoes: 0, preso: 0, menosAcoes: 0, slides: 0, programasNaRodada: [] }));
    N.registrar(novo, 'O mestre reiniciou a arquitetura.', 'info');
    runsDe(scene)[ponto.id] = novo;
    return { net: scene.id };
  } };

  // A importação do Foundry: os pontos de acesso da cena, com a arquitetura que veio do mesmo item do mundo (arqOrigem: o
  // id do item; sem ela, o ponto fica sem arquitetura, e o mestre escolhe nas opções do ponto).
  function importarPontos(state, scene, lista, mundo) {
    return (Array.isArray(lista) ? lista : []).slice(0, MAX_PONTOS).map(input => {
      const arq = input && input.arqOrigem && (state.arquiteturas || []).find(item => item.origem && item.origem.mundo === mundo && item.origem.id === String(input.arqOrigem));
      return { id: newId(), ...ctx.naCena(scene, Number(input && input.x) || 0, Number(input && input.y) || 0), ...limparPonto(state, { ...(input || {}), arquitetura: arq ? arq.id : '' }) };
    });
  }

  // ---------------- Os ganchos da mesa ----------------
  // O começo da vez de alguém no combate: o netrunner dela ganha as Ações NET de volta (mesa-net.js comecoDoTurno).
  function aoPassarAVez(state) {
    const combat = state.combate;
    const scene = combat && state.cenas.find(item => item.id === combat.cena);
    const atual = combat && combat.ordem[combat.vez];
    if (!scene || !atual) return false;
    let mudou = false;
    for (const est of Object.values(runsDe(scene))) for (const corredor of est.corredores) if (corredor.token === atual.token) { N.comecoDoTurno(corredor); mudou = true; }
    return mudou;
  }
  // O token andou: fora do alcance do ponto, ou com uma parede no meio, cai da NET (desconexão insegura).
  function conferirAlcance(state, scene, token) {
    if (!token.netConexao) return false;
    const ponto = pontosDe(scene).find(item => item.id === token.netConexao.ponto);
    const est = ponto && runsDe(scene)[ponto.id];
    const corredor = est && est.corredores.find(item => item.token === token.id);
    if (!corredor) { delete token.netConexao; return true; }
    const longe = ctx.distanciaAoPonto(scene, token, ponto) > N.alcanceDoPonto(ponto, netrunnerDe(token));
    if (!longe && !ctx.atravessa(scene.paredes || [], token, ponto)) return false;
    const crua = (state.arquiteturas || []).find(arq => arq.id === ponto.arquitetura);
    retirar(scene, ponto, est, N.lerArquitetura(crua || { andares: [] }), corredor, { inseguro: true, motivo: longe ? 'saiu do alcance' : 'uma parede no meio' });
    return true;
  }
  // O token saiu da cena: cai da NET, como na desconexão insegura (sem ninguém, as defesas reiniciam).
  function tirarToken(state, scene, tokenId) {
    for (const [id, est] of Object.entries(runsDe(scene))) {
      const corredor = est.corredores.find(item => item.token === tokenId);
      const ponto = pontosDe(scene).find(item => item.id === id);
      if (!corredor || !ponto) continue;
      const crua = (state.arquiteturas || []).find(arq => arq.id === ponto.arquitetura);
      retirar(scene, ponto, est, N.lerArquitetura(crua || { andares: [] }), corredor, { inseguro: true, motivo: 'saiu da cena' });
    }
  }

  // ---------------- O que cada um vê ----------------
  // Os marcadores: o mestre, todos (com a configuração e quem está conectado); o jogador, os que vê (o oculto, só depois
  // do Scanner; a névoa e as paredes contam, como as notas) e o que tem um token dele conectado.
  function pontosFor(viewer, scene) {
    const gm = ctx.isGm(viewer);
    const runs = runsDe(scene);
    return pontosDe(scene).flatMap(ponto => {
      const est = runs[ponto.id];
      const corredores = est ? est.corredores : [];
      const meu = corredores.some(corredor => corredor.dono && corredor.dono === viewer.conta);
      if (!gm && !meu && ((ponto.oculto && !(ponto.revelados || []).includes(viewer.conta)) || !ctx.vePonto(viewer, scene, ponto))) return [];
      const base = { id: ponto.id, x: ponto.x, y: ponto.y, nome: ponto.nome, alcance: ponto.alcance, conectados: corredores.length, ...(meu ? { meu: true } : {}) };
      return [gm ? { ...base, ...ponto, conectados: corredores.map(corredor => corredor.nome) } : base];
    });
  }
  // Os netruns: o mestre recebe cada ponto com estado (a arquitetura inteira, o que já foi feito, os netrunners); o jogador,
  // os pontos em que tem um token conectado (o mapa que eles acharam, os netrunners e o registro).
  function netFor(viewer, state, scene) {
    const gm = ctx.isGm(viewer);
    const nomes = nomeDaFicha(state);
    return Object.entries(runsDe(scene)).flatMap(([id, est]) => {
      const ponto = pontosDe(scene).find(item => item.id === id);
      const crua = ponto && (state.arquiteturas || []).find(arq => arq.id === ponto.arquitetura && arq.id === est.arquitetura);
      if (!crua) return [];
      const meus = est.corredores.filter(corredor => corredor.dono && corredor.dono === viewer.conta);
      if (!gm && !meus.length) return [];
      const arq = N.lerArquitetura({ ...crua, dv: Number(ponto.dv) || crua.dv });
      const corredores = est.corredores.map(corredor => {
        const token = scene.tokens.find(item => item.id === corredor.token);
        return { token: corredor.token, nome: corredor.nome, no: corredor.no, acoes: corredor.acoes, max: corredor.max, preso: corredor.preso, rastro: corredor.rastro, meu: gm || meus.includes(corredor), emCombate: Boolean(token && emCombate(state, scene, token)) };
      });
      const run = { ponto: id, nome: ponto.nome, arquitetura: arq.nome, dv: arq.dv, nos: N.vistaPublica(arq, est, nomes), corredores, log: est.log.slice(-30) };
      if (!gm) return [run];
      const completa = Object.values(arq.nos).map(no => ({ id: no.id, andar: no.andar, ramo: no.ramo, pai: no.pai, conteudos: no.conteudos.map(c => ({ ...c, nomeInimigo: N.ehInimigo(c) ? N.nomeDoInimigo(c, nomes) : '', rezAtual: N.rezDe(est, c), feito: est.feitos.includes(c.chave) || (N.ehInimigo(c) && !N.inimigoAtivo(est, c)) })) }));
      return [{ ...run, completa, vistos: est.vistos, mapa: est.mapa }];
    });
  }

  return { operations, arquiteturasFor, netrunnerDaFicha, netrunnerDoNpc, netrunnerDe, importarPontos, aoPassarAVez, conferirAlcance, tirarToken, pontosFor, netFor };
};
