// Wiki, Reputação (p. 193): reconhecimento é 1d10 estritamente abaixo do nível, sem crítico nem somas.
// Decisão do usuário no C41.3: má fama usa a magnitude, sem mudar o sinal guardado ou o Facedown.
const AUXILIARES = `
  const S = 'cpr-fieldbook', api = game.system.api.reputacao;
  const esperar = async f => {
    for (let i = 0; i < 100 && !f(); i++) await new Promise(resolve => setTimeout(resolve, 80));
    if (!f()) throw Error('C41.3 Reputação: estado esperado não chegou.');
  };
  const fonte = a => JSON.stringify(a.toObject());
  const mensagensDo = a => game.messages.filter(m => m.getFlag(S, 'reconhecimento')?.ator === a.uuid);
  const ler = r => {
    if (!r) return null;
    const m = r.mensagem, doc = new DOMParser().parseFromString(m.content, 'text/html');
    return { total: r.total, reputacao: r.reputacao, nivel: r.nivel, reconhecido: r.reconhecido,
      formula: r.roll.formula, dados: r.roll.dice.map(d => ({ faces: d.faces, resultados: d.results.map(x => x.result) })),
      flag: m.getFlag(S, 'reconhecimento'), id: m.id, speaker: { ...m.speaker }, autor: m.author.id,
      whisper: [...m.whisper].sort(), blind: m.blind, visivel: m.isContentVisible,
      cartao: Boolean(doc.querySelector('.cartao.teste.reputacao')), criticos: doc.querySelectorAll('.dado.maximo, .dado.minimo').length,
      caixas: doc.querySelectorAll('.dados-do-cartao .dado').length, texto: doc.body.textContent,
      escapado: !doc.querySelector('em') && m.content.includes('&lt;em&gt;') };
  };
  const abrir = async (a, aba = 'pericias') => {
    await a.sheet.render({ force: true });
    if (a.type === 'personagem') a.sheet.changeTab(aba, 'primary');
    const raiz = () => a.type === 'personagem' ? a.sheet.element?.querySelector('.tab[data-tab="' + aba + '"]') : a.sheet.element;
    await esperar(() => raiz()?.querySelector('[data-action="rolarReputacao"]'));
    return raiz;
  };
`;

const AMBIENTE = `${AUXILIARES}
  const atores = [], cenas = [], pendentes = new Set(), liberacoes = new Set(), avisos = [];
  const anterior = { random: CONFIG.Dice.randomUniform, avaliar: Roll.prototype.evaluate,
    avisar: ui.notifications.warn, avisoProprio: Object.hasOwn(ui.notifications, 'warn'),
    modo: game.settings.get('core', 'messageMode'), mensagens: new Set(game.messages.map(m => m.id)), vista: canvas.scene?.id ?? null };
  let fila = [], consumidos = 0;
  CONFIG.Dice.randomUniform = () => {
    const face = fila.shift(); if (!face) throw Error('C41.3: dado adicional ou não previsto.');
    consumidos++; return 1 - (face - .5) / 10;
  };
  ui.notifications.warn = texto => { avisos.push(String(texto)); return null; };
  const fixar = (...faces) => { fila = [...faces]; };
  const acompanhar = p => { pendentes.add(p); p.then(() => pendentes.delete(p), () => pendentes.delete(p)); return p; };
  const segurar = () => {
    let entrou = false, liberar;
    const original = Roll.prototype.evaluate;
    Roll.prototype.evaluate = async function (...args) {
      const r = await original.apply(this, args);
      if (!entrou) { entrou = true; await new Promise(resolve => { liberar = resolve; liberacoes.add(resolve); }); }
      return r;
    };
    const soltar = () => { if (liberar) { liberacoes.delete(liberar); liberar(); } Roll.prototype.evaluate = original; };
    return { entrou: () => entrou && Boolean(liberar), soltar };
  };
  const criar = async (nome, tipo = 'personagem', extras = {}) => {
    const a = await Actor.implementation.create({ name: nome, type: tipo,
      system: { reputacao: 5, atributos: { body: { valor: 6 }, will: { valor: 6 }, cool: { valor: 8 }, luck: { valor: 6 } },
        hp: { value: 10 }, sorte: { value: 6 }, dinheiro: 123, pontosDeMelhoria: 27 }, ...extras });
    atores.push(a); return a;
  };
  const limpar = async () => {
    for (const liberar of liberacoes) liberar(); liberacoes.clear();
    Roll.prototype.evaluate = anterior.avaliar;
    try {
      await Promise.allSettled([...pendentes]);
      for (const app of [...foundry.applications.instances.values()]) if (app.document?.name?.startsWith('C41.3')) await app.close({ animate: false });
      for (const cena of cenas.reverse()) if (game.scenes.has(cena.id)) await cena.delete();
      for (const a of atores.reverse()) if (game.actors.has(a.id)) await a.delete();
      const novas = game.messages.filter(m => !anterior.mensagens.has(m.id) && m.getFlag(S, 'reconhecimento'));
      if (novas.length) await ChatMessage.implementation.deleteDocuments(novas.map(m => m.id));
      await game.settings.set('core', 'messageMode', anterior.modo);
    } finally {
      CONFIG.Dice.randomUniform = anterior.random;
      if (anterior.avisoProprio) ui.notifications.warn = anterior.avisar; else delete ui.notifications.warn;
    }
  };
`;

module.exports = async (r, edge, jogador) => {
  const executar = codigo => edge.evaluate(`(async () => { ${AMBIENTE} try { ${codigo} } finally { await limpar(); } })()`);
  const simples = (d, face, rep, reconhecido) => d && d.total === face && d.reputacao === rep && d.nivel === Math.abs(rep)
    && d.reconhecido === reconhecido && d.formula === '1d10' && d.dados.length === 1 && d.dados[0].faces === 10
    && d.dados[0].resultados.join() === String(face) && d.caixas === 1 && d.criticos === 0 && d.cartao
    && d.flag.total === face && d.flag.reputacao === rep && d.flag.nivel === Math.abs(rep) && d.flag.reconhecido === reconhecido;

  await r.passo('C41.3 Reputação: botões de Perícias, Combate e capanga rolam um d10 cru; 4 reconhece nível 5, empate 5 não; faces 1/10 sem crítico, má fama usa magnitude e preserva recursos, extrato e Facedown', async () => {
    const info = await executar(`
      await game.settings.set('core', 'messageMode', 'public');
      const a = await criar('C41.3 <em>Fama</em>'), b = await criar('C41.3 <em>Capanga</em>', 'capanga');
      await a.prepararSorte(3); await b.prepararSorte(3);
      const ui = [];
      for (const [ator, aba, face] of [[a, 'pericias', 4], [a, 'combate', 5], [b, 'pericias', 4]]) {
        const raiz = await abrir(ator, aba), antes = fonte(ator), facedown = JSON.stringify(ator.partesDoFacedown()),
          quantidade = mensagensDo(ator).length, original = ator.rolarReputacao, proprMetodo = Object.hasOwn(ator, 'rolarReputacao');
        const chamadas = [];
        ator.rolarReputacao = function (...args) { const p = acompanhar(original.apply(this, args)); chamadas.push(p); return p; };
        try {
          fixar(face); const trava = segurar(), botao = raiz().querySelector('[data-action="rolarReputacao"]'); botao.click();
          await esperar(trava.entrou); botao.click(); await esperar(() => chamadas.length === 2);
          const duplo = await chamadas[1] === null; trava.soltar();
          await esperar(() => mensagensDo(ator).length === quantidade + 1); await Promise.all(chamadas);
          const resultado = await chamadas[0];
          ui.push({ tipo: ator.type, aba, face, chamada: chamadas.length, duplo, cartoes: mensagensDo(ator).length - quantidade, resultado: ler(resultado),
            igual: fonte(ator) === antes, facedown: JSON.stringify(ator.partesDoFacedown()) === facedown,
            penalidade: ator.system.penalidade, sorte: ator.system.sorte.value, preparada: ator.sortePreparada, fila: fila.length,
            semJanela: !document.querySelector('.application.janela-rolagem') });
        } finally { if (proprMetodo) ator.rolarReputacao = original; else delete ator.rolarReputacao; }
      }
      const casos = [];
      for (const [rep, face] of [[5, 1], [5, 10], [-5, 4], [-5, 5], [0, 1], [10, 10]]) {
        await a.update({ 'system.reputacao': rep });
        const antes = fonte(a), partes = JSON.stringify(a.partesDoFacedown()), usado = consumidos;
        fixar(face); const resultado = await a.rolarReputacao({ sorte: 6, extras: [{ valor: 20 }], modificador: 30, perguntar: true });
        casos.push({ rep, face, resultado: ler(resultado), igual: fonte(a) === antes,
          facedown: JSON.stringify(a.partesDoFacedown()) === partes, sorte: a.system.sorte.value, preparada: a.sortePreparada,
          consumidos: consumidos - usado, fila: fila.length, semJanela: !document.querySelector('.application.janela-rolagem') });
      }
      return { ui, casos, avisos, vistaIgual: (canvas.scene?.id ?? null) === anterior.vista };
    `);
    const ok = info.ui.length === 3 && info.ui.every((v, i) => simples(v.resultado, v.face, 5, i !== 1)
      && v.chamada === 2 && v.duplo && v.cartoes === 1 && v.igual && v.facedown && v.penalidade < 0 && v.sorte === 6 && v.preparada === 3
      && v.fila === 0 && v.semJanela && v.resultado.escapado)
      && info.casos.length === 6 && info.casos.every(v => simples(v.resultado, v.face, v.rep, v.face < Math.abs(v.rep))
        && v.igual && v.facedown && v.sorte === 6 && v.preparada === 3 && v.consumidos === 1 && v.fila === 0 && v.semJanela)
      && info.avisos.length === 0 && info.vistaIgual;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.3 Reputação: fora de ±10 recusa sem dado; mudar nível ou nome e excluir ator durante evaluate cancela sem cartão; clique duplo mantém uma rolagem e libera a próxima', async () => {
    const info = await executar(`
      const a = await criar('C41.3 Revalidar'), invalidos = [];
      for (const rep of [-11, 11]) {
        await a.update({ 'system.reputacao': rep }); const antes = consumidos, mensagens = mensagensDo(a).length, aviso = avisos.length;
        fixar(); const r = await api.rolarReputacao(a);
        invalidos.push({ rep, recusou: r === null, dados: consumidos - antes, cartoes: mensagensDo(a).length - mensagens, avisos: avisos.length - aviso });
      }
      await a.update({ 'system.reputacao': 5 }); const cancelados = [];
      for (const mudanca of [{ 'system.reputacao': -5 }, { name: 'C41.3 Nome novo' }]) {
        const q = mensagensDo(a).length, aviso = avisos.length, trava = segurar(); fixar(4);
        const p = acompanhar(a.rolarReputacao()); await esperar(trava.entrou);
        await a.update(mudanca); const fonteNova = fonte(a); trava.soltar();
        cancelados.push({ recusou: await p === null, cartoes: mensagensDo(a).length - q, avisos: avisos.length - aviso, igual: fonte(a) === fonteNova });
      }
      const apagado = await criar('C41.3 Apagado no dado'), q = mensagensDo(apagado).length, trava = segurar(); fixar(4);
      const p = acompanhar(apagado.rolarReputacao()); await esperar(trava.entrou); await apagado.delete(); trava.soltar();
      const excluido = { recusou: await p === null, cartoes: mensagensDo(apagado).length - q };
      await a.update({ 'system.reputacao': 5 }); const antes = fonte(a), cartas = mensagensDo(a).length, dadosAntes = consumidos, gate = segurar(); fixar(4);
      const primeiro = acompanhar(a.rolarReputacao()); await esperar(gate.entrou);
      const segundo = await api.rolarReputacao(a); gate.soltar(); const resultado = await primeiro;
      const duplo = { recusou: segundo === null, cartoes: mensagensDo(a).length - cartas, dados: consumidos - dadosAntes,
        resultado: ler(resultado), igual: fonte(a) === antes };
      fixar(5); const seguinte = await a.rolarReputacao();
      return { invalidos, cancelados, excluido, duplo, seguinte: ler(seguinte), fila: fila.length };
    `);
    const ok = info.invalidos.length === 2 && info.invalidos.every(v => v.recusou && v.dados === 0 && v.cartoes === 0 && v.avisos > 0)
      && info.cancelados.length === 2 && info.cancelados.every(v => v.recusou && v.cartoes === 0 && v.avisos > 0 && v.igual)
      && info.excluido.recusou && info.excluido.cartoes === 0 && info.duplo.recusou && info.duplo.cartoes === 1
      && info.duplo.dados === 1 && info.duplo.igual && simples(info.duplo.resultado, 4, 5, true)
      && simples(info.seguinte, 5, 5, false) && info.fila === 0;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.3 Reputação: jogador dono rola, observador não recebe botão; revogar OWNER ou apagar durante evaluate recusa; token sintético usa speaker exato e preserva modelo e gêmeo', async () => {
    if (!jogador) return [false, 'C41.3: navegador do jogador ausente.'];
    let ids;
    try {
      ids = await edge.evaluate(`(async () => { ${AMBIENTE}
        window.__c413GM = { limpar };
        const usuario = game.users.getName('Jogador'), owner = { default: 0, [usuario.id]: 3 };
        const a = await criar('C41.3 Dono', 'personagem', { ownership: owner }), observado = await criar('C41.3 Observado', 'personagem', { ownership: { default: 0, [usuario.id]: 2 } }),
          apagado = await criar('C41.3 Excluir jogador', 'personagem', { ownership: owner }), modelo = await criar('C41.3 Modelo', 'capanga', { ownership: owner });
        const cena = await Scene.implementation.create({ name: 'C41.3 Cena sem ativar', active: false, ownership: { default: 0, [usuario.id]: 2 }, grid: { size: 100, distance: 2 }, width: 1000, height: 1000 }); cenas.push(cena);
        await cena.createEmbeddedDocuments('Token', [
          (await modelo.getTokenDocument({ actorLink: false, name: 'C41.3 Token próprio', x: 200, y: 300 })).toObject(),
          (await modelo.getTokenDocument({ actorLink: false, name: 'C41.3 Gêmeo', x: 600, y: 300 })).toObject()
        ]);
        const token = cena.tokens.find(t => t.name === 'C41.3 Token próprio'), gemeo = cena.tokens.find(t => t.name === 'C41.3 Gêmeo');
        await token.actor.update({ 'system.reputacao': -5 });
        Object.assign(window.__c413GM, { modelo: fonte(modelo), token: JSON.stringify(token.toObject()), gemeo: JSON.stringify(gemeo.toObject()), vista: canvas.scene?.id ?? null });
        return { dono: a.id, observado: observado.id, apagado: apagado.id, modelo: modelo.id, cena: cena.id, token: token.id, gemeo: gemeo.id, jogador: usuario.id };
      })()`);
      const inicio = await jogador.evaluate(`(async () => { ${AMBIENTE}
        window.__c413Cliente = { limpar };
        const ids = ${JSON.stringify(ids)}; await esperar(() => game.actors.get(ids.dono)?.isOwner && game.scenes.get(ids.cena)?.tokens.size === 2);
        const a = game.actors.get(ids.dono), observado = game.actors.get(ids.observado), antes = fonte(a); fixar(4);
        const feita = ler(await a.rolarReputacao({ modo: 'public' }));
        await observado.sheet.render({ force: true }); observado.sheet.changeTab('pericias', 'primary');
        const dadosAntes = consumidos, cartas = mensagensDo(observado).length;
        const observador = { owner: observado.isOwner, editavel: observado.sheet.isEditable,
          botoes: observado.sheet.element.querySelectorAll('[data-action="rolarReputacao"]').length,
          recusou: await api.rolarReputacao(observado) === null, dados: consumidos - dadosAntes, cartoes: mensagensDo(observado).length - cartas };
        const trava = segurar(); fixar(4); const pendente = acompanhar(a.rolarReputacao()); await esperar(trava.entrou);
        Object.assign(window.__c413Cliente, { trava, pendente, fonte: antes });
        return { feita, igual: fonte(a) === antes, observador };
      })()`);
      await edge.evaluate(`game.actors.get('${ids.dono}').update({ 'ownership.${ids.jogador}': 2 }).then(() => true)`);
      const revogou = await jogador.evaluate(`(async () => { ${AUXILIARES}
        const ids = ${JSON.stringify(ids)}, s = window.__c413Cliente, a = game.actors.get(ids.dono); await esperar(() => !a.isOwner);
        const antes = mensagensDo(a).length; s.trava.soltar();
        const revogada = { recusou: await s.pendente === null, cartoes: mensagensDo(a).length - antes };
        return revogada;
      })()`);
      await jogador.evaluate(`(async () => {
        const s = window.__c413Cliente; await s.limpar(); delete window.__c413Cliente; return true;
      })()`);
      const solto = await jogador.evaluate(`(async () => { ${AMBIENTE}
        window.__c413Cliente = { limpar };
        const ids = ${JSON.stringify(ids)}, cena = game.scenes.get(ids.cena), token = cena.tokens.get(ids.token), gemeo = cena.tokens.get(ids.gemeo),
          a = token.actor, modelo = game.actors.get(ids.modelo), antes = fonte(a), modeloAntes = fonte(modelo), tokenAntes = JSON.stringify(token.toObject()), gemeoAntes = JSON.stringify(gemeo.toObject());
        fixar(4); const resultado = ler(await a.rolarReputacao({ modo: 'public' }));
        const estado = { resultado, isToken: a.isToken, identidade: fromUuidSync(a.uuid) === a, uuid: a.uuid,
          igual: fonte(a) === antes, modeloIgual: fonte(modelo) === modeloAntes, tokenIgual: JSON.stringify(token.toObject()) === tokenAntes, gemeoIgual: JSON.stringify(gemeo.toObject()) === gemeoAntes };
        const apagar = game.actors.get(ids.apagado), trava = segurar(); fixar(4);
        const pendente = acompanhar(apagar.rolarReputacao()); await esperar(trava.entrou);
        Object.assign(window.__c413Cliente, { trava, pendente, apagado: apagar }); return estado;
      })()`);
      await edge.evaluate(`game.actors.get('${ids.apagado}').delete().then(() => true)`);
      const exclusao = await jogador.evaluate(`(async () => { ${AUXILIARES}
        const s = window.__c413Cliente, ids = ${JSON.stringify(ids)}; await esperar(() => !game.actors.has(ids.apagado));
        const antes = mensagensDo(s.apagado).length; s.trava.soltar();
        return { recusou: await s.pendente === null, cartoes: mensagensDo(s.apagado).length - antes };
      })()`);
      const mestre = await edge.evaluate(`(() => {
        const s = window.__c413GM, ids = ${JSON.stringify(ids)}, cena = game.scenes.get(ids.cena);
        return { modeloIgual: JSON.stringify(game.actors.get(ids.modelo).toObject()) === s.modelo,
          tokenIgual: JSON.stringify(cena.tokens.get(ids.token).toObject()) === s.token, gemeoIgual: JSON.stringify(cena.tokens.get(ids.gemeo).toObject()) === s.gemeo,
          vistaIgual: (canvas.scene?.id ?? null) === s.vista };
      })()`);
      const ok = simples(inicio.feita, 4, 5, true) && inicio.feita.autor === ids.jogador && inicio.igual
        && !inicio.observador.owner && !inicio.observador.editavel && inicio.observador.botoes === 0 && inicio.observador.recusou && inicio.observador.dados === 0 && inicio.observador.cartoes === 0
        && revogou.recusou && revogou.cartoes === 0 && exclusao.recusou && exclusao.cartoes === 0
        && simples(solto.resultado, 4, -5, true) && solto.isToken && solto.identidade && solto.igual && solto.modeloIgual && solto.tokenIgual && solto.gemeoIgual
        && solto.resultado.flag.ator === solto.uuid && solto.resultado.speaker.scene === ids.cena && solto.resultado.speaker.token === ids.token
        && solto.resultado.speaker.actor === ids.modelo && solto.resultado.speaker.alias === 'C41.3 Token próprio'
        && Object.values(mestre).every(Boolean);
      return [ok, JSON.stringify({ inicio, revogou, solto, exclusao, mestre })];
    } finally {
      try { await jogador.evaluate(`(async () => { const s = window.__c413Cliente; try { if (s) await s.limpar(); } finally { delete window.__c413Cliente; } return true; })()`); }
      finally { await edge.evaluate(`(async () => { const s = window.__c413GM; try { if (s) await s.limpar(); } finally { delete window.__c413GM; } return true; })()`); }
    }
  });

  await r.passo('C41.3 Reputação: os quatro modos do seletor do chat e a opção explícita conservam destinatários e ocultam o resultado às cegas', async () => {
    if (!jogador) return [false, 'C41.3: navegador do jogador ausente.'];
    let ids;
    try {
      ids = await edge.evaluate(`(async () => { ${AMBIENTE} window.__c413GM = { limpar };
        const u = game.users.getName('Jogador'), a = await criar('C41.3 Modos', 'personagem', { ownership: { default: 0, [u.id]: 3 } });
        return { ator: a.id, jogador: u.id, mestres: game.users.filter(u => u.isGM).map(u => u.id).sort() };
      })()`);
      const testes = [];
      for (const modo of ['public', 'gm', 'blind', 'self']) {
        const teste = await jogador.evaluate(`(async () => { ${AMBIENTE}
          try {
            const ids = ${JSON.stringify(ids)}; await esperar(() => game.actors.get(ids.ator)?.isOwner);
            const botao = document.querySelector('#message-modes button[data-mode="${modo}"]'); if (!botao) throw Error('C41.3: seletor de chat ausente.');
            botao.click(); await esperar(() => game.settings.get('core', 'messageMode') === '${modo}');
            fixar(4); const r = await game.actors.get(ids.ator).rolarReputacao(); return { resultado: ler(r), fila: fila.length };
          } finally {
            CONFIG.Dice.randomUniform = anterior.random; Roll.prototype.evaluate = anterior.avaliar;
            if (anterior.avisoProprio) ui.notifications.warn = anterior.avisar; else delete ui.notifications.warn;
            await game.settings.set('core', 'messageMode', anterior.modo);
          }
        })()`);
        const mestre = await edge.evaluate(`(async () => { ${AUXILIARES}
          await esperar(() => game.messages.get('${teste.resultado.id}')); const m = game.messages.get('${teste.resultado.id}');
          return { visivel: m.isContentVisible, whisper: [...m.whisper].sort(), blind: m.blind };
        })()`);
        const esperado = modo === 'public' ? [] : modo === 'self' ? [ids.jogador] : ids.mestres;
        testes.push({ modo, ...teste, mestre, ok: simples(teste.resultado, 4, 5, true) && teste.resultado.whisper.join() === esperado.join()
          && teste.resultado.blind === (modo === 'blind') && teste.resultado.visivel === (modo !== 'blind')
          && mestre.visivel === (modo !== 'self') && mestre.whisper.join() === esperado.join() && mestre.blind === (modo === 'blind') && teste.fila === 0 });
      }
      const override = await jogador.evaluate(`(async () => { ${AMBIENTE}
        try { await game.settings.set('core', 'messageMode', 'blind'); fixar(5);
          return ler(await game.actors.get('${ids.ator}').rolarReputacao({ modo: 'public' }));
        } finally { CONFIG.Dice.randomUniform = anterior.random; Roll.prototype.evaluate = anterior.avaliar;
          if (anterior.avisoProprio) ui.notifications.warn = anterior.avisar; else delete ui.notifications.warn;
          await game.settings.set('core', 'messageMode', anterior.modo); }
      })()`);
      return [testes.length === 4 && testes.every(t => t.ok) && simples(override, 5, 5, false)
        && !override.blind && override.whisper.length === 0 && override.visivel, JSON.stringify({ testes, override })];
    } finally { await edge.evaluate(`(async () => { const s = window.__c413GM; try { if (s) await s.limpar(); } finally { delete window.__c413GM; } return true; })()`); }
  });
};
