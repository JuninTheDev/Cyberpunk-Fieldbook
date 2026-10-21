// O estado de jogo do personagem que a mesa da wiki guarda (doc.jogo): HP, SP (com a ablação), Sorte, Humanidade,
// dinheiro, Pontos de Melhoria, reputação, a munição no pente (e a carga, o ferrolho e a coronha das armas de 2077), o
// uso e a quantidade de cada item, as lesões críticas e o Death Save. Compartilhado pela wiki (a ficha), pela API (os
// números da lista de Personagens) e pela mesa da wiki (Tabletop/mesa-api.js).
//
// Até a mesa da wiki substituir o Foundry, ele também manda a ficha (doc.mesa, a cada mudança no ator): vale o mais
// recente dos dois, pela hora do servidor (doc.jogo.quando contra doc.mesa.recebido). Quando o Foundry é o mais
// recente, nada de doc.jogo vale; quando a mesa grava de novo, ela parte do que vale agora (não ressuscita o antigo).
// Os máximos são sempre os da ficha: a do Foundry, se ele já mandou; senão, a da criação (doc.resultado).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.characterGame = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const instante = valor => { const t = Date.parse(valor || ''); return Number.isFinite(t) ? t : 0; };
  const numero = valor => { const n = Number.parseInt(valor && typeof valor === 'object' ? valor.value : valor, 10); return Number.isFinite(n) ? n : 0; };
  // Um número gravado (null, vazio e ausente não contam: Number(null) seria 0).
  const definido = valor => valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
  const fichaDoFoundry = doc => (doc && doc.mesa && (Array.isArray(doc.mesa.itens) || (doc.mesa.hp && Number(doc.mesa.hp.max))) ? doc.mesa : null);
  // doc.jogo vale? (a mesa da wiki mexeu depois da última ficha do Foundry)
  const jogoValido = doc => {
    if (!doc || !doc.jogo || typeof doc.jogo !== 'object') return null;
    const mesa = fichaDoFoundry(doc);
    return !mesa || instante(doc.jogo.quando) >= instante(mesa.recebido) ? doc.jogo : null;
  };

  function hp(doc) {
    if (!doc) return null;
    const mesa = doc.mesa && doc.mesa.hp && Number(doc.mesa.hp.max) ? doc.mesa : null;
    const criado = Number(doc.resultado && doc.resultado.derivados && doc.resultado.derivados.hp) || 0;
    const max = mesa ? Number(mesa.hp.max) : criado;
    if (!max) return null;
    let atual = mesa ? Number(mesa.hp.atual) || 0 : max;
    const jogo = jogoValido(doc);
    if (jogo && jogo.hp && Number.isFinite(Number(jogo.hp.atual))) atual = Number(jogo.hp.atual);
    return { atual: Math.min(atual, max), max };
  }

  // Os números que só o mestre muda: o dinheiro, os Pontos de Melhoria e a reputação. null: a ficha não diz. Sem o
  // Foundry, o IP é o que o mestre deu na wiki menos o que o avanço gastou.
  const ganhosDeIp = doc => ((doc.ip && doc.ip.ganhos) || []).reduce((soma, item) => soma + (Number(item.qtd) || 0), 0);
  const gastosDeIp = doc => (Array.isArray(doc.avanco) ? doc.avanco : []).reduce((soma, item) => soma + Math.max(0, Number(item.custo) || 0), 0);
  function valores(doc) {
    if (!doc) return { dinheiro: null, ip: null, reputacao: null };
    const mesa = doc.mesa && typeof doc.mesa === 'object' ? doc.mesa : null;
    const criado = doc.resultado || {};
    const jogo = jogoValido(doc) || {};
    const daFicha = {
      dinheiro: mesa && definido(mesa.dinheiro) ? Number(mesa.dinheiro) : criado.dinheiro && definido(criado.dinheiro.saldo) ? Number(criado.dinheiro.saldo) : null,
      ip: mesa && definido(mesa.ip) ? Number(mesa.ip) : ganhosDeIp(doc) - gastosDeIp(doc),
      reputacao: mesa && definido(mesa.reputacao) ? Number(mesa.reputacao) : null
    };
    return Object.fromEntries(Object.entries(daFicha).map(([campo, valor]) => [campo, definido(jogo[campo]) ? Number(jogo[campo]) : valor]));
  }

  // O uso de cada item, como no criador (doc.resultado.itens) e no Foundry (equipped, carried, owned). A mesa mostra e
  // muda o uso das armas, armaduras, equipamento, roupa e cyberdecks, e a quantidade de tudo (a munição gasta na
  // recarga). O cyberware, os acessórios e os programas ficam na ficha da wiki: estão instalados em alguma coisa.
  const USOS = ['equipado', 'carregando', 'guardado'];
  const USO_DO_FOUNDRY = { equipped: 'equipado', carried: 'carregando', owned: 'guardado' };
  const COM_USO = new Set(['arma', 'armadura', 'item', 'roupa', 'deck']);
  const TIPO_DO_FOUNDRY = { weapon: 'arma', armor: 'armadura', ammo: 'municao', gear: 'item', drug: 'item', clothing: 'roupa', cyberdeck: 'deck' };
  // As compras que a loja entregou na mesa da wiki (o personagem sem o Foundry): linhas como as da criação.
  const comprasDe = jogo => (Array.isArray(jogo && jogo.compras) ? jogo.compras.filter(linha => linha && linha.uid && linha.id) : []);
  // Na ordem do kindOf do criador.
  const tipoDoCatalogo = cat => (cat.arma ? 'arma' : cat.municao ? 'municao' : cat.armadura ? 'armadura' : cat.acessorio ? '' : cat.deck ? 'deck'
    : cat.programa || cat.hardware || cat.cyber ? '' : cat.roupa ? 'roupa' : 'item');
  const LOCAIS = ['cabeca', 'corpo'];

  // A ficha de jogo inteira. catalogo: { item(id), porNome(nome) } da loja (loja-catalogo.js), para as armas, a munição
  // e as armaduras da criação e para a classe das armas que vieram do Foundry.
  function ficha(doc, catalogo = {}) {
    const mesa = fichaDoFoundry(doc);
    const criado = (doc && doc.resultado) || {};
    const jogo = jogoValido(doc) || {};
    const stats = {};
    for (const [chave, valor] of Object.entries((mesa && mesa.stats) || criado.stats || (doc && doc.stats) || {})) stats[chave.toUpperCase()] = numero(valor);
    const item = id => (catalogo.item ? catalogo.item(id) : null);
    const porNome = nome => (nome && catalogo.porNome ? catalogo.porNome(nome) : null);

    // O inventário. Os ids são os da mesa: o uid da criação ou foundry:<id do item>. aceita: as variedades de munição de
    // cada arma (o catálogo diz; sem ele, só a de mesmo nome da carregada).
    const itens = [];
    const aceita = new Map();
    if (mesa && Array.isArray(mesa.itens)) {
      for (const entrada of mesa.itens) {
        const tipo = entrada && TIPO_DO_FOUNDRY[entrada.tipo];
        if (!tipo) continue;
        const cat = porNome(entrada.nome);
        const linha = { id: `foundry:${entrada.id}`, nome: String(entrada.nome || ''), tipo, qtd: Math.max(0, numero(entrada.qtd ?? 1)), uso: tipo === 'municao' ? '' : USO_DO_FOUNDRY[entrada.uso] || 'carregando', catalogo: cat ? cat.id : '' };
        if (tipo === 'municao') linha.variedade = (cat && cat.municao && cat.municao.variedade) || '';
        // Do Foundry vem o SP de agora de cada armadura (o máximo não vem: fica o mesmo).
        if (tipo === 'armadura' && ('cabeca' in entrada || 'corpo' in entrada)) linha.sp = { cabeca: numero(entrada.cabeca), corpo: numero(entrada.corpo) };
        if (tipo === 'arma') {
          const carregada = (entrada.dentroIds || []).map(id => mesa.itens.find(outra => outra && outra.id === id && outra.tipo === 'ammo')).find(Boolean);
          linha.arma = { id: linha.id, nome: linha.nome, classe: (cat && cat.arma && cat.arma.tipo) || '', dano: String(entrada.dano || ''), cdt: Number(entrada.cdt) || 1,
            pericia: entrada.pericia || '', distancia: Boolean(entrada.distancia), pente: entrada.pente && Number(entrada.pente.max) ? { atual: Number(entrada.pente.atual) || 0, max: Number(entrada.pente.max) } : null,
            municao: entrada.municao || '', municaoId: carregada ? `foundry:${carregada.id}` : '' };
          if (cat && cat.arma && Array.isArray(cat.arma.municao)) aceita.set(linha.id, cat.arma.municao);
        }
        itens.push(linha);
      }
    } else {
      // O que veio da criação e o que a loja entregou na mesa da wiki (doc.jogo.compras, no mesmo formato).
      const compras = new Set(comprasDe(jogo).map(linha => linha.uid));
      const linhas = [...(Array.isArray(criado.itens) ? criado.itens : []), ...comprasDe(jogo)];
      for (const linha of linhas) {
        const cat = linha && item(linha.id);
        const tipo = cat ? tipoDoCatalogo(cat) : '';
        if (!tipo) continue;
        const entrada = { id: linha.uid || linha.id, nome: linha.renomear || linha.nome || cat.nome, tipo, qtd: Math.max(0, numero(linha.qtd ?? 1)), uso: tipo === 'municao' ? '' : USOS.includes(linha.uso) ? linha.uso : 'carregando', catalogo: cat.id, ...(compras.has(linha.uid) ? { compra: true } : {}) };
        if (tipo === 'municao') entrada.variedade = cat.municao.variedade || '';
        // O escudo é à parte (como no criador): não entra no SP.
        if (tipo === 'armadura') entrada.sp = cat.armadura.escudo ? { cabeca: 0, corpo: 0 } : { cabeca: numero(cat.armadura.cabeca), corpo: numero(cat.armadura.corpo) };
        if (tipo === 'arma') {
          const pente = Number(cat.arma.pente);
          entrada.arma = { id: entrada.id, nome: entrada.nome, classe: cat.arma.tipo || '', dano: String(cat.arma.dano || ''), cdt: Number(cat.arma.cdt) || 1,
            pericia: cat.arma.pericia || '', distancia: Boolean(cat.arma.distancia),
            // Na montagem, a arma já vem carregada com a munição escolhida.
            pente: cat.arma.distancia && pente ? { atual: linha.municao ? pente : 0, max: pente } : null,
            municao: linha.municao ? (linhas.find(outra => outra.uid === linha.municao) || {}).nome || '' : '', municaoId: linha.municao || '' };
          if (Array.isArray(cat.arma.municao)) aceita.set(entrada.id, cat.arma.municao);
        }
        itens.push(entrada);
      }
      // A munição que a montagem pôs no pente saiu da caixa (como o Foundry faz na importação).
      for (const { arma } of itens.filter(entrada => entrada.arma && entrada.arma.pente && entrada.arma.municaoId)) {
        const caixa = itens.find(entrada => entrada.id === arma.municaoId && entrada.tipo === 'municao');
        if (caixa) caixa.qtd = Math.max(0, caixa.qtd - arma.pente.max);
      }
    }
    // O que a mesa mudou em cada item: o uso e a quantidade.
    const salvos = jogo.itens && typeof jogo.itens === 'object' ? jogo.itens : {};
    for (const entrada of itens) {
      const salvo = salvos[entrada.id];
      if (!salvo || typeof salvo !== 'object') continue;
      if (COM_USO.has(entrada.tipo) && USOS.includes(salvo.uso)) entrada.uso = salvo.uso;
      if (definido(salvo.qtd)) entrada.qtd = Math.max(0, Math.round(Number(salvo.qtd)));
    }
    // O que a mesa guarda de cada arma: a munição no pente (e qual), a carga da arma Tech, o ferrolho por manejar e a
    // coronha recolhida. E a munição que o personagem tem e serve nela (para recarregar).
    const salvas = (jogo.armas && typeof jogo.armas === 'object') ? jogo.armas : {};
    for (const { arma } of itens.filter(entrada => entrada.arma)) {
      const salva = salvas[arma.id];
      if (salva && typeof salva === 'object') {
        if (arma.pente && definido(salva.pente)) arma.pente.atual = Math.max(0, Math.min(arma.pente.max, Number(salva.pente)));
        if (typeof salva.municao === 'string') {
          const caixa = itens.find(entrada => entrada.id === salva.municao && entrada.tipo === 'municao');
          arma.municaoId = caixa ? caixa.id : '';
          arma.municao = caixa ? caixa.nome : '';
        }
        if (salva.carga && typeof salva.carga === 'object') arma.carga = salva.carga;
        if (salva.ferrolho) arma.ferrolho = true;
        if (salva.coronha) arma.coronha = true;
      }
      if (arma.pente) {
        // A munição que o catálogo não conhece (renomeada no Foundry) serve na arma em que já está.
        const serve = aceita.get(arma.id);
        const carregada = entrada => entrada.id === arma.municaoId || (Boolean(arma.municao) && entrada.nome === arma.municao);
        arma.municoes = itens.filter(entrada => entrada.tipo === 'municao' && (serve && entrada.variedade ? serve.includes(entrada.variedade) : carregada(entrada)))
          .map(entrada => ({ id: entrada.id, nome: entrada.nome, qtd: entrada.qtd }));
      }
    }
    // Armas à mão (equipadas ou carregadas; guardada não vai para a mesa).
    const armas = itens.filter(entrada => entrada.arma && entrada.uso !== 'guardado').map(entrada => entrada.arma);

    // Armadura: o SP de cada local é o da armadura vestida (a maior, se houver duas). Do Foundry antigo, sem o SP de
    // cada armadura, vale o SP que ele mandou.
    let base = { cabeca: 0, corpo: 0 };
    const vestidas = itens.filter(entrada => entrada.tipo === 'armadura' && entrada.uso === 'equipado' && entrada.sp);
    if (mesa && mesa.sp && !itens.some(entrada => entrada.tipo === 'armadura' && entrada.sp)) base = { cabeca: numero(mesa.sp.cabeca), corpo: numero(mesa.sp.corpo) };
    else for (const entrada of vestidas) base = { cabeca: Math.max(base.cabeca, entrada.sp.cabeca), corpo: Math.max(base.corpo, entrada.sp.corpo) };
    const spAgora = jogo.sp && typeof jogo.sp === 'object' ? jogo.sp : {};
    const sp = Object.fromEntries(LOCAIS.map(local => [local, { atual: definido(spAgora[local]) ? Math.max(0, Math.min(base[local], Number(spAgora[local]))) : base[local], max: base[local] }]));
    // A penalidade da armadura pesada (RED p. 97): a maior das vestidas, em REF, DEX e MOVE. Só na ficha da criação: a
    // do Foundry já vem com os STATs dele.
    const penalidade = mesa ? 0 : Math.max(0, ...vestidas.map(entrada => numero(((item(entrada.catalogo) || {}).armadura || {}).penalidade)));
    if (penalidade) for (const chave of ['REF', 'DEX', 'MOVE']) if (chave in stats) stats[chave] = Math.max(0, stats[chave] - penalidade);

    const sorteMax = (mesa && mesa.sorte && numero(mesa.sorte.max)) || stats.LUCK || 0;
    const sorteBase = mesa && mesa.sorte ? numero(mesa.sorte.atual) : sorteMax;
    // A Humanidade (sem ela na ficha, EMP × 10) e o EMP de agora, a Humanidade ÷ 10 para baixo (como o CORE do Foundry).
    const fonte = (mesa && mesa.humanidade) || criado.humanidade || (stats.EMP ? { atual: stats.EMP * 10, max: stats.EMP * 10 } : null);
    const humanidade = fonte ? { atual: definido(jogo.humanidade) ? Number(jogo.humanidade) : numero(fonte.atual), max: numero(fonte.max) } : null;
    if (humanidade && (!mesa || definido(jogo.humanidade))) stats.EMP = Math.max(0, Math.floor(humanidade.atual / 10));
    return {
      stats, hp: hp(doc), sp, armas, penalidade,
      sorte: { atual: definido(jogo.sorte) ? Math.max(0, Math.min(sorteMax, Number(jogo.sorte))) : sorteBase, max: sorteMax },
      humanidade, ...valores(doc),
      // O inventário como a mesa mostra: a arma leva o pente e a munição carregada.
      itens: itens.map(({ arma, ...resto }) => (arma ? { ...resto, pente: arma.pente, municao: arma.municao } : resto)),
      extrato: Array.isArray(jogo.extrato) ? jogo.extrato.slice(-30) : [],
      lesoes: Array.isArray(jogo.lesoes) ? jogo.lesoes.map(String) : ((mesa && Array.isArray(mesa.lesoes)) ? mesa.lesoes.map(String) : []),
      deathSave: Number(jogo.deathSave) || 0,
      morto: Boolean(jogo.morto)
    };
  }

  // O que a mesa grava em doc.jogo: parte do que vale agora e troca só os campos mudados. hp é o atual (número).
  function comJogo(doc, mudancas, quando = new Date().toISOString()) {
    const base = { ...(jogoValido(doc) || {}) };
    const novo = { ...base, ...mudancas, quando };
    if (mudancas.hp !== undefined && typeof mudancas.hp !== 'object') novo.hp = { atual: Math.round(Number(mudancas.hp) || 0) };
    // Cada arma e cada item misturam com o que já tinham: gravar a carga não apaga o pente, nem o uso a quantidade.
    for (const campo of ['armas', 'itens']) {
      if (!mudancas[campo]) continue;
      novo[campo] = { ...(base[campo] || {}) };
      for (const [id, valor] of Object.entries(mudancas[campo])) novo[campo][id] = { ...(novo[campo][id] || {}), ...valor };
    }
    return novo;
  }
  // O HP mudou na mesa (o atalho de antes).
  const comHp = (doc, atual, quando) => comJogo(doc, { hp: atual }, quando);

  // Trocar o uso de um item (equipar, carregar, guardar). Cada local do corpo veste uma armadura (vestir outra tira a
  // que estava), e só um cyberdeck fica ativo. A armadura que sai guarda o SP de agora (a ablação), e a que entra volta
  // com o dela: trocar de armadura não conserta nenhuma. Devolve { mudancas } para o comJogo, ou { erro }.
  function comUso(doc, catalogo, id, uso) {
    if (!USOS.includes(uso)) return { erro: 'Uso desconhecido: equipado, carregando ou guardado.' };
    const atual = ficha(doc, catalogo);
    const alvo = atual.itens.find(entrada => entrada.id === id);
    if (!alvo || !COM_USO.has(alvo.tipo)) return { erro: 'Esse item não está na ficha.' };
    const itens = { [id]: { uso } };
    const cobre = (entrada, local) => Boolean(entrada.sp && entrada.sp[local] > 0);
    if (uso === 'equipado') {
      for (const outra of atual.itens) {
        if (outra.id === id || outra.uso !== 'equipado') continue;
        if ((alvo.tipo === 'deck' && outra.tipo === 'deck') || (alvo.tipo === 'armadura' && outra.tipo === 'armadura' && LOCAIS.some(local => cobre(alvo, local) && cobre(outra, local)))) itens[outra.id] = { uso: 'carregando' };
      }
    }
    if (alvo.tipo !== 'armadura') return { mudancas: { itens } };
    const jogo = jogoValido(doc) || {};
    const guardado = entrada => ((jogo.itens || {})[entrada.id] || {}).sp || {};
    const vestida = (lista, local) => lista.filter(entrada => entrada.tipo === 'armadura' && entrada.uso === 'equipado' && cobre(entrada, local)).sort((a, b) => b.sp[local] - a.sp[local])[0] || null;
    const depois = atual.itens.map(entrada => (itens[entrada.id] ? { ...entrada, ...itens[entrada.id] } : entrada));
    const sp = {};
    for (const local of LOCAIS) {
      const antes = vestida(atual.itens, local);
      const agora = vestida(depois, local);
      if ((antes && antes.id) === (agora && agora.id)) {
        if (jogo.sp && definido(jogo.sp[local])) sp[local] = Number(jogo.sp[local]);
        continue;
      }
      if (antes) itens[antes.id] = { ...(itens[antes.id] || {}), sp: { ...guardado(antes), ...((itens[antes.id] || {}).sp || {}), [local]: atual.sp[local].atual } };
      if (agora && definido(guardado(agora)[local])) sp[local] = Math.min(agora.sp[local], Number(guardado(agora)[local]));
    }
    return { mudancas: { itens, sp } };
  }

  // Recarregar uma arma com a munição que o personagem tem. municaoId: a caixa escolhida (sem ela, a que já está na
  // arma, ou a primeira que serve e tem bala). Trocar de munição devolve o que estava no pente para a caixa dele.
  function recarga(doc, catalogo, armaId, municaoId = '') {
    const atual = ficha(doc, catalogo);
    const arma = atual.armas.find(item => item.id === armaId);
    if (!arma || !arma.pente) return { erro: 'Essa arma não tem pente.' };
    const opcoes = arma.municoes || [];
    const escolhida = municaoId ? opcoes.find(item => item.id === municaoId)
      : opcoes.find(item => item.id === arma.municaoId && item.qtd > 0) || opcoes.find(item => item.qtd > 0);
    if (municaoId && !escolhida) return { erro: `Essa munição não serve em ${arma.nome}.` };
    if (!escolhida || escolhida.qtd <= 0) return { erro: `Sem munição para ${arma.nome} na ficha.` };
    const troca = Boolean(arma.municaoId) && arma.municaoId !== escolhida.id;
    const itens = {};
    let noPente = arma.pente.atual;
    if (troca) {
      const velha = atual.itens.find(item => item.id === arma.municaoId);
      if (velha && noPente) itens[velha.id] = { qtd: velha.qtd + noPente };
      noPente = 0;
    }
    const entra = Math.min(arma.pente.max - noPente, escolhida.qtd);
    if (entra <= 0 && !troca) return { erro: `${arma.nome} já está com o pente cheio.` };
    itens[escolhida.id] = { qtd: escolhida.qtd - entra };
    return { mudancas: { armas: { [arma.id]: { pente: noPente + entra, municao: escolhida.id } }, itens }, arma: arma.nome, municao: escolhida.nome, entrou: entra, sobra: escolhida.qtd - entra };
  }

  // O mestre muda o dinheiro, o IP, a reputação (0 a 10) ou a Humanidade (até a máxima) pela mesa: delta soma, valor
  // troca. Cada mudança vai para o extrato (as últimas 30). Devolve { mudancas, antes, depois } ou { erro }.
  const LIMITES = { dinheiro: [0, 99999999], ip: [0, 99999], reputacao: [0, 10], humanidade: [-99, 999] };
  function ajuste(doc, campo, { delta = 0, valor, motivo = '', quando = new Date().toISOString() } = {}) {
    if (!LIMITES[campo]) return { erro: 'Só dinheiro, ip, reputacao ou humanidade.' };
    const humanidade = campo === 'humanidade' ? ficha(doc).humanidade : null;
    if (campo === 'humanidade' && !humanidade) return { erro: 'Esta ficha não tem Humanidade nem EMP.' };
    const antes = (campo === 'humanidade' ? humanidade.atual : valores(doc)[campo]) || 0;
    const pedido = definido(valor) ? Math.round(Number(valor)) : antes + Math.round(Number(delta) || 0);
    if (campo === 'dinheiro' && pedido < 0) return { erro: `Só tem ${antes}eb.` };
    const [min, max] = campo === 'humanidade' ? [LIMITES.humanidade[0], humanidade.max] : LIMITES[campo];
    const depois = Math.max(min, Math.min(max, pedido));
    if (depois === antes) return { erro: 'Nada mudou.' };
    const linha = { quando, campo, antes, depois, ...(String(motivo).trim() ? { motivo: String(motivo).trim().slice(0, 200) } : {}) };
    const extrato = [...((jogoValido(doc) || {}).extrato || []), linha].slice(-30);
    return { mudancas: { [campo]: depois, extrato }, antes, depois };
  }

  // A entrega de um pedido da loja aprovado na mesa da wiki (o personagem sem o Foundry; com ele, quem entrega é o
  // Foundry): os itens entram como compras, com o lugar e a munição que o jogador escolheu (a arma pedida com munição
  // vem carregada, e o pente sai da caixa), e o dinheiro sai, com a linha no extrato. pedido: o do api-personagens.js
  // (id, total e itens com uid, id, nome, qtd, em, municao, local, cyber). Devolve { mudancas, avisos } ou { erro }.
  function entrega(doc, pedido, quando = new Date().toISOString()) {
    const itens = Array.isArray(pedido && pedido.itens) ? pedido.itens : [];
    if (!itens.length) return { erro: 'O pedido está vazio.' };
    const total = Math.max(0, Math.round(Number(pedido.total) || 0));
    const dinheiro = valores(doc).dinheiro;
    if (dinheiro === null) return { erro: 'A ficha não diz quanto dinheiro o personagem tem.' };
    if (total > dinheiro) return { erro: `Dinheiro insuficiente: tem ${dinheiro}eb, e o pedido custa ${total}eb.` };
    const jogo = jogoValido(doc) || {};
    const novas = itens.map(linha => ({
      uid: String(linha.uid), id: String(linha.id), nome: String(linha.nome || ''), qtd: Math.max(1, Math.round(Number(linha.qtd) || 1)), uso: '',
      ...(linha.municao ? { municao: String(linha.municao) } : {}), ...(linha.em ? { em: String(linha.em) } : {}), ...(linha.local ? { local: String(linha.local) } : {}),
      ...(linha.cyber ? { cyber: true } : {}), pedido: String(pedido.id || '')
    }));
    const motivo = `Compra na loja: ${itens.map(item => `${item.nome}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')}`.slice(0, 200);
    const linha = { quando, campo: 'dinheiro', antes: dinheiro, depois: dinheiro - total, motivo };
    const avisos = itens.some(item => item.cyber) ? ['Cyberware: o mestre instala pela mesa (a instalação cobra a Humanidade).'] : [];
    return { mudancas: { compras: [...comprasDe(jogo), ...novas], dinheiro: dinheiro - total, extrato: [...(jogo.extrato || []), linha].slice(-30) }, avisos };
  }

  return { hp, ficha, valores, comJogo, comHp, comUso, recarga, ajuste, entrega, jogoValido, USOS };
});
