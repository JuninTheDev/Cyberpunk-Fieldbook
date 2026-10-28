// Wiki, system-rules.js:537 (p. 183–184): uma Ação a partir do agarrão; interpor no lugar da esquiva.
// Decisão do usuário no C41.2: a pessoa recebe armadura/lesões/munição normais; na área, recebe só uma vez.
// HP <= 0 ainda não é morte: o cadáver tem BODY de HP próprios somente com o status DEFEATED.
const AUXILIARES = `
  const S = 'cpr-fieldbook', agar = game.system.api.agarrao, combate = game.system.api.combate, humano = game.system.api.escudoHumano;
  const esperar = async f => {
    for (let i = 0; i < 160 && !f(); i++) await new Promise(resolve => setTimeout(resolve, 50));
    if (!f()) throw Error('C41.2: estado esperado não chegou.');
  };
  const janela = () => [...document.querySelectorAll('.application.cpr-fieldbook.janela-defesa:not(.minimizing)')]
    .find(d => d.textContent.includes('C41.2'));
  const vistaDaJanela = d => ({ titulo: d.querySelector('.window-title')?.textContent,
    texto: d.textContent.replace(/\\s+/g, ' ').trim(), opcoes: [...d.querySelectorAll('button.opcao')].map(b => b.dataset.escolha) });
  const efeitoDo = a => a.effects.find(e => e.statuses.has(S + '-agarrando'));
  const foto = f => ({ portador: f.portador.system.hp.value, vitima: f.vitima.system.hp.value,
    sp: f.vitima.items.getName('C41.2 Kevlar').system.sp.corpo.value,
    lesoesPortador: f.portador.items.filter(i => i.type === 'lesao').length,
    lesoesVitima: f.vitima.items.filter(i => i.type === 'lesao').length });
  const cartaoDo = r => game.messages.find(m => m.getFlag(S, 'ataque')?.id === r.id);
  const dadosDaPessoa = d => d && ({ ator: d.ator.uuid, token: d.token.uuid, morto: d.morto, pv: d.pv && { ...d.pv } });
`;

const AMBIENTE = `${AUXILIARES}
  const chaves = ['ativo', 'dano', 'defesaDosNpcs', 'lesaoCritica', 'lesoesRepetidas', 'mortalmenteFerido',
    'rolagemManual', 'jogadorRolaDano', 'escondeAtaque', 'resultado', 'animacoes', 'area', 'exigeRef8', 'rolarDireto'];
  const anterior = { config: Object.fromEntries(chaves.map(k => [k, game.settings.get(S, k)])),
    random: CONFIG.Dice.randomUniform, mensagens: new Set(game.messages.map(m => m.id)), vista: canvas.scene?.id ?? null,
    avisar: ui.notifications.warn, avisoProprio: Object.hasOwn(ui.notifications, 'warn') };
  const atores = [], cenas = [], avisos = [], emCurso = new Set();
  let fila = [], consumidos = 0;
  CONFIG.Dice.randomUniform = () => {
    const dado = fila.shift();
    if (!dado) throw Error('C41.2: rolagem não prevista.');
    consumidos++;
    return 1 - (dado[0] - .5) / dado[1];
  };
  ui.notifications.warn = texto => { avisos.push(String(texto)); return null; };
  const fixar = dados => { fila = dados.map(d => [...d]); };
  const dados = (quantidade, face = 3, lados = 6) => Array.from({ length: quantidade }, () => [face, lados]);
  const criar = async (nome, tipo = 'personagem', extras = {}) => {
    const a = await Actor.implementation.create({ name: nome, type: tipo,
      system: { atributos: { body: { valor: 6 }, will: { valor: 6 }, ref: { valor: 6 }, dex: { valor: 4 } }, hp: { value: 40 } }, ...extras });
    atores.push(a); return a;
  };
  const montar = async ({ sintetico = false, jogador = false } = {}) => {
    for (const [k, v] of Object.entries({ ativo: true, dano: 'automatico', defesaDosNpcs: 'mestre', lesaoCritica: 'ficha',
      lesoesRepetidas: 'reroll', mortalmenteFerido: false, rolagemManual: false, jogadorRolaDano: false,
      escondeAtaque: true, resultado: 'envolvidos', animacoes: 'nao', area: false, exigeRef8: true, rolarDireto: true })) await game.settings.set(S, k, v);
    const usuario = game.users.getName('Jogador'), cat = await game.system.api.wiki.carregarCatalogo();
    const modeloAtq = await criar('C41.2 Atirador');
    const modeloPortador = await criar('C41.2 Portador', 'personagem', {
      ownership: { default: 0, ...(jogador ? { [usuario.id]: 3 } : {}) },
      system: { atributos: { body: { valor: 6 }, will: { valor: 6 }, ref: { valor: 6 }, dex: { valor: 10 } },
        hp: { value: 40 }, pericias: { brawling: { nivel: 10 } } } });
    const modeloVitima = await criar('C41.2 Vítima', 'capanga', {
      ownership: { default: 0 }, system: { atributos: { body: { valor: 6 }, will: { valor: 6 }, ref: { valor: 8 }, dex: { valor: 4 } }, hp: { value: 40 } },
      items: [{ name: 'C41.2 Kevlar', type: 'armadura', system: { equipada: true,
        sp: { corpo: { value: 7, max: 7 }, cabeca: { value: 0, max: 0 } } } }] });
    const idsArmas = ['core_weapons:assault-rifle', 'core_weapons:grenade-launcher', 'core_weapons:heavy-melee',
      'core_weapons:bow', 'core_ammo:arrow-sleep'];
    await modeloAtq.createEmbeddedDocuments('Item', idsArmas.map(id => foundry.utils.deepClone(cat[id])));
    const porCatalogo = id => modeloAtq.items.find(i => i.getFlag(S, 'catalogo') === id);
    const rifle = porCatalogo(idsArmas[0]), lancador = porCatalogo(idsArmas[1]), branca = porCatalogo(idsArmas[2]),
      arco = porCatalogo(idsArmas[3]), sonifera = porCatalogo(idsArmas[4]);
    await arco.update({ 'system.carregada': sonifera.id });
    const cena = await Scene.implementation.create({ name: 'C41.2 Cena própria sem ativar', active: false, width: 1600, height: 1000,
      ownership: { default: 0, ...(jogador ? { [usuario.id]: 2 } : {}) }, grid: { size: 100, distance: 2, units: 'm' } });
    cenas.push(cena);
    await cena.createEmbeddedDocuments('Token', [
      (await modeloAtq.getTokenDocument({ actorLink: true, x: 100, y: 100 })).toObject(),
      (await modeloPortador.getTokenDocument({ actorLink: !sintetico, x: 700, y: 100 })).toObject(),
      (await modeloVitima.getTokenDocument({ actorLink: !sintetico, x: 800, y: 100 })).toObject()
    ]);
    const tokenAtq = cena.tokens.find(t => t.actorId === modeloAtq.id), tokenPortador = cena.tokens.find(t => t.actorId === modeloPortador.id),
      tokenVitima = cena.tokens.find(t => t.actorId === modeloVitima.id);
    let gemeo = null;
    if (sintetico) [gemeo] = await cena.createEmbeddedDocuments('Token', [
      (await modeloVitima.getTokenDocument({ actorLink: false, name: 'C41.2 Vítima gêmea', x: 1200, y: 500 })).toObject()
    ]);
    const f = { cena, usuario, modeloAtq, modeloPortador, modeloVitima, portador: tokenPortador.actor, vitima: tokenVitima.actor,
      tokenAtq, tokenPortador, tokenVitima, gemeo, rifle, lancador, branca, arco, sonifera, cat };
    f.modelos = [modeloPortador, modeloVitima].map(a => JSON.stringify(a.toObject()));
    f.gemeoAntes = gemeo ? JSON.stringify(gemeo.actor.toObject()) : null;
    fixar([[5, 10], [5, 10]]);
    const agarrou = await agar.agarrar(f.portador, { alvo: tokenVitima });
    if (agarrou?.resultado !== 'agarrou' || fila.length) throw Error('C41.2: o agarrão real da preparação falhou.');
    return f;
  };
  const ativar = async f => {
    const r = await agar.usarEscudoHumano(f.portador);
    await esperar(() => efeitoDo(f.portador)?.getFlag(S, 'escudoHumano') === true);
    return r;
  };
  const pedido = (f, extras = {}) => ({ id: foundry.utils.randomID(), arma: f.rifle.uuid, token: f.tokenAtq.uuid,
    alvos: [f.tokenPortador.uuid], total: 30, modo: 'tiro', local: 'corpo', mensagem: null, ...extras });
  const atacar = async (f, { escolha = 'escudoHumano', antesDeResponder = null, ...extras } = {}) => {
    let terminou = false, resposta, erro;
    const vistas = [];
    const p = combate.resolver(pedido(f, extras)).then(r => { resposta = r; terminou = true; }, e => { erro = e; terminou = true; });
    emCurso.add(p);
    try {
      for (let i = 0; i < 180 && !terminou; i++) {
        const d = janela();
        if (d) {
          vistas.push(vistaDaJanela(d));
          if (antesDeResponder) { const agir = antesDeResponder; antesDeResponder = null; await agir(); }
          const b = d.querySelector('button.opcao[data-escolha="' + escolha + '"]')
            ?? d.querySelector('button.opcao[data-escolha="aguentar"]') ?? d.querySelector('button.opcao');
          b.click();
        }
        if (!terminou) await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!terminou) throw Error('C41.2: o ataque não terminou depois da reação.');
      await p; if (erro) throw erro;
      return { resultado: resposta, janelas: vistas };
    } finally { if (terminou) emCurso.delete(p); }
  };
  const desfazer = async r => {
    const m = cartaoDo(r);
    await esperar(() => document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="desfazer"]'));
    document.querySelector('[data-message-id="' + m.id + '"] [data-cprf-acao="desfazer"]').click();
    await esperar(() => m.getFlag(S, 'desfeito') === true);
    return true;
  };
  const limpar = async () => {
    try {
      for (const app of [...foundry.applications.instances.values()]) {
        if (app.document?.name?.startsWith('C41.2') || (app.element?.matches('.janela-defesa') && app.element.textContent.includes('C41.2'))) await app.close({ animate: false });
      }
      await Promise.all([...emCurso]);
      for (const cena of cenas) for (const t of cena.tokens) if (t.actor?.sheet.rendered) await t.actor.sheet.close();
      for (const cena of cenas.reverse()) if (game.scenes.has(cena.id)) await cena.delete();
      for (const a of atores.reverse()) if (game.actors.has(a.id)) await a.delete();
      const novas = game.messages.filter(m => !anterior.mensagens.has(m.id));
      if (novas.length) await ChatMessage.implementation.deleteDocuments(novas.map(m => m.id));
      for (const [k, v] of Object.entries(anterior.config)) await game.settings.set(S, k, v);
    } finally {
      CONFIG.Dice.randomUniform = anterior.random;
      if (anterior.avisoProprio) ui.notifications.warn = anterior.avisar;
      else delete ui.notifications.warn;
    }
  };
`;

module.exports = async (r, edge, jogador) => {
  const executar = codigo => edge.evaluate(`(async () => { ${AMBIENTE} try { const f = await montar(); ${codigo} } finally { await limpar(); } })()`);

  await r.passo('C41.2 escudo humano: botões de personagem e capanga gastam uma Ação sem repetir; reação real redireciona 15 contra SP 7 e Desfazer conserva outro dano', async () => {
    const info = await executar(`
      await f.portador.sheet.render({ force: true }); f.portador.sheet.changeTab('combate', 'primary');
      const botao = () => f.portador.sheet.element?.querySelector('[data-action="usarEscudoHumano"]');
      await esperar(botao); const antes = game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length;
      botao().click(); await esperar(() => efeitoDo(f.portador)?.getFlag(S, 'escudoHumano') === true);
      await esperar(() => game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length === antes + 1);
      const acao = game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').at(-1).getFlag(S, 'agarrao');
      const repetida = await agar.usarEscudoHumano(f.portador);
      const ativacao = { acao: acao.acao, acoes: acao.acoes, repetida: repetida === null,
        quantidade: game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length - antes,
        vitima: (await humano.escudoHumanoDe(f.portador, { cena: f.cena }))?.ator.uuid === f.vitima.uuid };
      fixar(dados(5)); const tiro = await atacar(f), m = cartaoDo(tiro.resultado);
      const depois = foto(f), undo = m.getFlag(S, 'desfazer'), linha = tiro.resultado.linhas.find(l => l.dano);
      await f.vitima.receberDano({ dano: 9 }); const posterior = foto(f);
      await desfazer(tiro.resultado);
      const desfeito = foto(f);
      await agar.soltar(f.portador); await esperar(() => !f.vitima.statuses.has(S + '-agarrado'));
      const capanga = await criar('C41.2 Portador capanga', 'capanga', { system: {
        atributos: { body: { valor: 6 }, will: { valor: 6 }, dex: { valor: 10 } }, hp: { value: 40 }, pericias: { brawling: { nivel: 10 } } } });
      await f.cena.createEmbeddedDocuments('Token', [(await capanga.getTokenDocument({ actorLink: true, x: 700, y: 300 })).toObject()]);
      fixar([[5, 10], [5, 10]]); await agar.agarrar(capanga, { alvo: f.tokenVitima });
      await capanga.sheet.render({ force: true });
      const botaoCapanga = () => capanga.sheet.element?.querySelector('[data-action="usarEscudoHumano"]');
      await esperar(botaoCapanga);
      const capAntes = game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length;
      botaoCapanga().click(); await esperar(() => efeitoDo(capanga)?.getFlag(S, 'escudoHumano') === true);
      await esperar(() => game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length === capAntes + 1);
      const peloCapanga = { ativo: efeitoDo(capanga).getFlag(S, 'escudoHumano'),
        acoes: game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').at(-1).getFlag(S, 'agarrao').acoes };
      return { ativacao, peloCapanga, depois, posterior, desfeito, janelas: tiro.janelas, fila: fila.length,
        linha: { escolha: linha.escolha, receptor: linha.receptor, alvo: linha.alvoOriginal?.uuid, recebido: linha.dano.recebido },
        uuids: { portador: f.tokenPortador.uuid, vitima: f.vitima.uuid },
        undo: undo.map(u => ({ ator: u.ator, perdeu: u.dano?.perdeu })),
        cartao: m.content.includes(f.vitima.name) && m.content.includes(f.portador.name), vistaIgual: (canvas.scene?.id ?? null) === anterior.vista };
    `);
    const ok = info.ativacao.acao === 'escudoHumano' && info.ativacao.acoes === 1 && info.ativacao.repetida && info.ativacao.quantidade === 1 && info.ativacao.vitima
      && info.depois.portador === 40 && info.depois.vitima === 32 && info.depois.sp === 6
      && info.posterior.vitima === 29 && info.posterior.sp === 5 && info.desfeito.portador === 40 && info.desfeito.vitima === 37 && info.desfeito.sp === 6
      && info.janelas.length === 1 && info.janelas[0].opcoes.includes('escudoHumano') && info.janelas[0].texto.includes('C41.2 Vítima')
      && info.linha.escolha === 'escudoHumano' && info.linha.recebido === 8 && info.linha.receptor === info.uuids.vitima && info.linha.alvo === info.uuids.portador
      && info.undo.length === 1 && info.undo[0].ator === info.uuids.vitima && info.undo[0].perdeu === 8 && info.cartao && info.fila === 0 && info.vistaIgual
      && info.peloCapanga.ativo && info.peloCapanga.acoes === 1;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.2 escudo humano: cabeça e corpo a corpo não oferecem interposição; escudo comum continua; a pessoa usada não esquiva', async () => {
    const info = await executar(`
      await ativar(f); await f.portador.update({ 'system.atributos.ref.valor': 8 });
      const escudo = foundry.utils.deepClone(f.cat['core_armor:bullet-proof-shield']); escudo.system.equipada = true;
      const [comum] = await f.portador.createEmbeddedDocuments('Item', [escudo]);
      fixar(dados(5)); const cabeca = await atacar(f, { local: 'cabeca', escolha: 'aguentar' });
      const naCabeca = { janelas: cabeca.janelas, estado: foto(f), pv: comum.system.pvEscudo.value };
      await f.portador.update({ 'system.hp.value': 40 });
      fixar([[2, 10], ...dados(3, 5)]); const corpo = await atacar(f, { arma: f.branca.uuid, modo: 'corpo', escolha: 'esquivar' });
      const noCorpo = { janelas: corpo.janelas, estado: foto(f), pv: comum.system.pvEscudo.value };
      await comum.delete(); await f.portador.update({ 'system.hp.value': 40 });
      fixar(dados(5)); const direto = await atacar(f, { alvos: [f.tokenVitima.uuid], escolha: 'aguentar' });
      const naVitima = { janelas: direto.janelas, estado: foto(f), escolhas: direto.resultado.linhas.map(l => l.escolha) };
      fixar(dados(5)); const diretoCabeca = await atacar(f, { alvos: [f.tokenVitima.uuid], local: 'cabeca', escolha: 'aguentar' });
      return { naCabeca, noCorpo, direto: naVitima,
        diretoCabeca: { janelas: diretoCabeca.janelas, estado: foto(f), escolhas: diretoCabeca.resultado.linhas.map(l => l.escolha) }, fila: fila.length };
    `);
    const semHumano = d => d.janelas.length === 1 && !d.janelas[0].opcoes.includes('escudoHumano') && d.janelas[0].opcoes.includes('escudo');
    const ok = semHumano(info.naCabeca) && semHumano(info.noCorpo)
      && info.naCabeca.estado.portador === 10 && info.naCabeca.estado.vitima === 40 && info.naCabeca.estado.sp === 7 && info.naCabeca.pv === 10
      && info.noCorpo.estado.portador === 25 && info.noCorpo.estado.vitima === 40 && info.noCorpo.estado.sp === 7 && info.noCorpo.pv === 10
      && info.direto.janelas.every(j => !j.opcoes.includes('esquivar')) && info.direto.escolhas.join() === 'aguentar'
      && info.direto.estado.portador === 40 && info.direto.estado.vitima === 32 && info.direto.estado.sp === 6
      && info.diretoCabeca.janelas.every(j => !j.opcoes.includes('esquivar')) && info.diretoCabeca.escolhas.join() === 'aguentar'
      && info.diretoCabeca.estado.portador === 40 && info.diretoCabeca.estado.vitima === 2 && info.diretoCabeca.estado.sp === 6 && info.fila === 0;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.2 escudo humano: explosão com os dois na área aplica uma vez; sonífera e lesão crítica chegam à vítima e voltam pelo Desfazer', async () => {
    const info = await executar(`
      await ativar(f); await game.settings.set(S, 'area', true);
      fixar(dados(6)); const explosao = await atacar(f, { arma: f.lancador.uuid, modo: 'explosivo', alvos: [f.tokenPortador.uuid, f.tokenVitima.uuid] });
      const area = { estado: foto(f), duplicatas: explosao.resultado.linhas.filter(l => l.resultado === 'semRepeticao').length,
        undo: cartaoDo(explosao.resultado).getFlag(S, 'desfazer').filter(u => u.ator === f.vitima.uuid).length,
        recebido: explosao.resultado.linhas.filter(l => l.dano).map(l => l.dano.recebido), fila: fila.length };
      await desfazer(explosao.resultado); area.desfeito = foto(f);
      await game.settings.set(S, 'area', false);
      fixar([[2, 10]]); const sono = await atacar(f, { arma: f.arco.uuid });
      const municao = { portador: f.portador.statuses.has('unconscious'), vitima: f.vitima.statuses.has('unconscious'),
        caido: f.vitima.statuses.has('prone'), estado: foto(f),
        receptor: sono.resultado.linhas.find(l => l.municao)?.municao.ator, vitimaUuid: f.vitima.uuid, fila: fila.length };
      await desfazer(sono.resultado); municao.desfeito = !f.vitima.statuses.has('unconscious') && !f.vitima.statuses.has('prone');
      fixar([[6, 6], [6, 6], [1, 6], [1, 6], [1, 6], [2, 6], [3, 6]]);
      const critico = await atacar(f), lesoes = f.vitima.items.filter(i => i.type === 'lesao').map(i => i.id);
      const lesao = { estado: foto(f), ids: lesoes, undo: cartaoDo(critico.resultado).getFlag(S, 'desfazer').find(u => u.ator === f.vitima.uuid)?.lesoes,
        critico: critico.resultado.linhas.find(l => l.dano)?.dano.critico, fila: fila.length };
      await desfazer(critico.resultado); lesao.desfeito = foto(f);
      return { area, municao, lesao };
    `);
    const ok = info.area.estado.portador === 40 && info.area.estado.vitima === 29 && info.area.estado.sp === 6 && info.area.duplicatas === 1 && info.area.undo === 1
      && info.area.recebido.join() === '11' && info.area.fila === 0 && info.area.desfeito.vitima === 40 && info.area.desfeito.sp === 7
      && !info.municao.portador && info.municao.vitima && info.municao.caido && info.municao.estado.portador === 40 && info.municao.estado.vitima === 40 && info.municao.estado.sp === 7
      && info.municao.receptor === info.municao.vitimaUuid && info.municao.fila === 0 && info.municao.desfeito
      && info.lesao.critico && info.lesao.ids.length === 1 && JSON.stringify(info.lesao.ids) === JSON.stringify(info.lesao.undo)
      && info.lesao.estado.portador === 40 && info.lesao.estado.lesoesPortador === 0 && info.lesao.estado.vitima === 27 && info.lesao.estado.sp === 6 && info.lesao.fila === 0
      && info.lesao.desfeito.vitima === 40 && info.lesao.desfeito.sp === 7 && info.lesao.desfeito.lesoesVitima === 0;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.2 escudo humano: Soltar, ativar durante Esquivar e apagar a vítima invalidam respostas antigas sem dano nem erro de ator ausente', async () => {
    const info = await executar(`
      await ativar(f); const antes = foto(f); fixar(dados(5));
      const corrida = await atacar(f, { antesDeResponder: async () => {
        await agar.soltar(f.portador);
        await esperar(() => !f.vitima.statuses.has(S + '-agarrado'));
      } });
      const soltou = { antes, depois: foto(f), janelas: corrida.janelas, resultados: corrida.resultado.linhas.map(l => l.resultado),
        semDano: corrida.resultado.linhas.every(l => !l.dano && !l.municao && !l.cadaver),
        semLigacao: await humano.escudoHumanoDe(f.portador, { cena: f.cena }) === null,
        naoUsado: !await humano.usadoComoEscudo(f.vitima, { cena: f.cena }),
        marcas: [f.portador, f.vitima].some(a => a.statuses.has(S + '-agarrando') || a.statuses.has(S + '-agarrado')) };
      fixar([[5, 10], [5, 10]]); await agar.agarrar(f.portador, { alvo: f.tokenVitima });
      await f.vitima.update({ 'system.atributos.dex.valor': 10, 'system.pericias.evasion.nivel': 10 });
      const antesDeAtivar = foto(f); fixar([[9, 10]]);
      const ativando = await atacar(f, { alvos: [f.tokenVitima.uuid], total: 20, escolha: 'esquivar', antesDeResponder: () => ativar(f) });
      const ativacaoTardia = { antes: antesDeAtivar, depois: foto(f), janelas: ativando.janelas,
        resultados: ativando.resultado.linhas.map(l => l.resultado),
        semDano: ativando.resultado.linhas.every(l => !l.dano && !l.municao && !l.cadaver),
        usado: await humano.usadoComoEscudo(f.vitima, { cena: f.cena }) };
      const antesDeApagar = foto(f); fixar(dados(5));
      const apagando = await atacar(f, { antesDeResponder: () => f.vitima.delete() });
      return { soltou, ativacaoTardia, apagada: { antes: antesDeApagar, portador: f.portador.system.hp.value,
        existe: game.actors.has(f.vitima.id), resultados: apagando.resultado.linhas.map(l => l.resultado),
        semDano: apagando.resultado.linhas.every(l => !l.dano && !l.municao && !l.cadaver),
        semLigacao: await humano.escudoHumanoDe(f.portador, { cena: f.cena }) === null } };
    `);
    const a = info.soltou, b = info.ativacaoTardia, c = info.apagada;
    const ok = JSON.stringify(a.antes) === JSON.stringify(a.depois) && a.janelas.length === 1 && a.janelas[0].opcoes.includes('escudoHumano')
      && a.resultados.join() === 'semDestino' && a.semDano && a.semLigacao && a.naoUsado && !a.marcas
      && JSON.stringify(b.antes) === JSON.stringify(b.depois) && b.janelas.length === 1 && b.janelas[0].opcoes.includes('esquivar')
      && b.resultados.join() === 'semDestino' && b.semDano && b.usado
      && !c.existe && c.portador === c.antes.portador && c.resultados.join() === 'semDestino' && c.semDano && c.semLigacao;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.2 escudo humano: HP zero continua vivo; morte cria BODY de HP separados uma vez, preserva perdas ao soltar e Desfazer soma só o ataque', async () => {
    const info = await executar(`
      await ativar(f); await f.vitima.update({ 'system.hp.value': 0 });
      const vivo = dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena }));
      fixar(dados(5)); const mortal = await atacar(f);
      const aindaVivo = { estado: foto(f), flag: f.vitima.getFlag(S, 'escudoHumanoCadaver') ?? null, cadaver: Boolean(mortal.resultado.linhas.find(l => l.cadaver)) };
      await f.vitima.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true });
      const morto = dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena }));
      await f.vitima.update({ 'system.atributos.body.valor': 10 });
      const bodyMudou = dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena }));
      await f.rifle.update({ 'system.dano': '1d6' });
      const hpDeCarne = foto(f); fixar(dados(1)); const tiro = await atacar(f);
      const aposTiro = { estado: foto(f), pv: f.vitima.getFlag(S, 'escudoHumanoCadaver'), linha: tiro.resultado.linhas.find(l => l.cadaver)?.cadaver };
      await humano.danoNoEscudoHumano(f.vitima, 2, { explosivo: false });
      const posterior = f.vitima.getFlag(S, 'escudoHumanoCadaver').value;
      await desfazer(tiro.resultado); const desfeito = f.vitima.getFlag(S, 'escudoHumanoCadaver').value;
      await agar.soltar(f.portador); await esperar(() => !f.vitima.statuses.has(S + '-agarrado'));
      fixar([[5, 10], [5, 10]]); await agar.agarrar(f.portador, { alvo: f.tokenVitima }); await ativar(f);
      const deNovo = dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena }));
      await humano.danoNoEscudoHumano(f.vitima, 99, { explosivo: false });
      const vazio = dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena }));
      fixar(dados(1)); const semProtecao = await atacar(f, { escolha: 'aguentar' });
      return { vivo, aindaVivo, morto, bodyMudou, hpDeCarne, aposTiro, posterior, desfeito, deNovo, vazio,
        semProtecao: { janelas: semProtecao.janelas, estado: foto(f), escolhas: semProtecao.resultado.linhas.map(l => l.escolha) }, fila: fila.length };
    `);
    const ok = !info.vivo.morto && info.vivo.pv === null && info.aindaVivo.estado.vitima === -8 && info.aindaVivo.estado.sp === 6 && !info.aindaVivo.flag && !info.aindaVivo.cadaver
      && info.morto.morto && info.morto.pv.value === 6 && info.morto.pv.max === 6 && info.bodyMudou.pv.value === 6 && info.bodyMudou.pv.max === 6
      && JSON.stringify(info.hpDeCarne) === JSON.stringify(info.aposTiro.estado) && info.aposTiro.pv.value === 3 && info.aposTiro.pv.max === 6
      && info.aposTiro.linha.antes === 6 && info.aposTiro.linha.depois === 3 && info.aposTiro.linha.perdeu === 3
      && info.posterior === 1 && info.desfeito === 4 && info.deNovo.pv.value === 4 && info.deNovo.pv.max === 6 && info.vazio.morto && info.vazio.pv.value === 0
      && info.semProtecao.janelas.every(j => !j.opcoes.includes('escudoHumano')) && info.semProtecao.escolhas.join() === 'aguentar'
      && info.semProtecao.estado.portador === 37 && info.semProtecao.estado.vitima === -8 && info.semProtecao.estado.sp === 6 && info.fila === 0;
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41.2 escudo humano: jogador dono ativa e interpõe vítima de outro dono; observador recusa e tokens soltos preservam modelos, gêmeo e Desfazer', async () => {
    if (!jogador) return [false, 'C41.2: navegador do jogador ausente.'];
    let preparado;
    try {
      preparado = await edge.evaluate(`(async () => {
        ${AMBIENTE}
        window.__c412 = { limpar };
        const f = await montar({ sintetico: true, jogador: true });
        Object.assign(window.__c412, { f, pedido, fixar, dados, foto, cartaoDo, desfazer, anterior });
        await f.modeloPortador.update({ ['ownership.' + f.usuario.id]: 2 });
        return { cena: f.cena.id, portador: f.portador.uuid, vitima: f.vitima.uuid,
          modeloPortador: f.modeloPortador.id, usuario: f.usuario.id, token: f.tokenPortador.uuid };
      })()`);
      const observado = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        const ids = ${JSON.stringify(preparado)};
        await esperar(() => game.scenes.get(ids.cena)?.tokens.size === 4 && !fromUuidSync(ids.portador)?.isOwner);
        const a = await fromUuid(ids.portador); await a.sheet.render({ force: true }); a.sheet.changeTab('combate', 'primary');
        const antes = game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length;
        const resposta = await agar.usarEscudoHumano(a);
        return { owner: a.isOwner, editavel: a.sheet.isEditable, recusou: resposta === null,
          ativo: efeitoDo(a)?.getFlag(S, 'escudoHumano') === true,
          cartoes: game.messages.filter(m => m.getFlag(S, 'agarrao')?.acao === 'escudoHumano').length - antes };
      })()`);
      await edge.evaluate(`(async () => { const f = __c412.f; await f.modeloPortador.update({ ['ownership.' + f.usuario.id]: 3 });
        f.modelos = [f.modeloPortador, f.modeloVitima].map(a => JSON.stringify(a.toObject())); return true; })()`);
      const ativou = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        const ids = ${JSON.stringify(preparado)};
        await esperar(() => fromUuidSync(ids.portador)?.isOwner);
        const a = await fromUuid(ids.portador), vitima = await fromUuid(ids.vitima);
        await a.sheet.render({ force: true }); a.sheet.changeTab('combate', 'primary');
        const botao = () => a.sheet.element?.querySelector('[data-action="usarEscudoHumano"]');
        await esperar(() => botao() && !botao().disabled); botao().click();
        await esperar(() => efeitoDo(a)?.getFlag(S, 'escudoHumano') === true);
        return { owner: a.isOwner, outroOwner: vitima.isOwner, sintetico: a.isToken && vitima.isToken,
          identidade: fromUuidSync(a.uuid) === a && fromUuidSync(vitima.uuid) === vitima };
      })()`);
      await edge.evaluate(`(() => { const s = __c412; s.fixar(s.dados(5)); s.pendente = game.system.api.combate.resolver(s.pedido(s.f)); return true; })()`);
      const defesa = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        await esperar(janela); const d = janela(), vista = vistaDaJanela(d);
        const b = d.querySelector('button.opcao[data-escolha="escudoHumano"]');
        if (!b) { d.querySelector('button.opcao')?.click(); return { ...vista, clicou: false }; }
        b.click(); await esperar(() => !janela()); return { ...vista, clicou: true };
      })()`);
      const mestre = await edge.evaluate(`(async () => {
        const s = __c412, f = s.f, resultado = await s.pendente, m = s.cartaoDo(resultado);
        const depois = s.foto(f), undo = m.getFlag('cpr-fieldbook', 'desfazer');
        const modelosIguais = () => [f.modeloPortador, f.modeloVitima].every((a, i) => JSON.stringify(a.toObject()) === f.modelos[i]);
        const isolado = modelosIguais() && JSON.stringify(f.gemeo.actor.toObject()) === f.gemeoAntes;
        await s.desfazer(resultado);
        return { depois, desfeito: s.foto(f), isolado, modelosIguais: modelosIguais(),
          gemeoIgual: JSON.stringify(f.gemeo.actor.toObject()) === f.gemeoAntes,
          undo: undo.map(u => u.ator), vitima: f.vitima.uuid, envolvidos: m.whisper.includes(f.usuario.id),
          vistaIgual: (canvas.scene?.id ?? null) === s.anterior.vista };
      })()`);
      const cliente = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        const ids = ${JSON.stringify(preparado)}, p = await fromUuid(ids.portador), v = await fromUuid(ids.vitima);
        await esperar(() => v.system.hp.value === 40 && v.items.getName('C41.2 Kevlar').system.sp.corpo.value === 7);
        const m = game.messages.contents.findLast(m => m.getFlag(S, 'ataque')?.linhas.some(l => l.receptor === v.uuid));
        const html = document.querySelector('[data-message-id="' + m.id + '"]');
        return { hp: v.system.hp.value, portador: p.system.hp.value, cartao: Boolean(m),
          semBotaoMestre: !html?.querySelector('[data-cprf-acao="desfazer"]') };
      })()`);
      const ok = !observado.owner && !observado.editavel && observado.recusou && !observado.ativo && observado.cartoes === 0
        && ativou.owner && !ativou.outroOwner && ativou.sintetico && ativou.identidade
        && defesa.clicou && defesa.opcoes.includes('escudoHumano') && defesa.texto.includes('C41.2 Vítima') && !defesa.texto.includes('Total do ataque:')
        && mestre.depois.portador === 40 && mestre.depois.vitima === 32 && mestre.depois.sp === 6 && mestre.desfeito.vitima === 40 && mestre.desfeito.sp === 7
        && mestre.isolado && mestre.modelosIguais && mestre.gemeoIgual && mestre.undo.join() === mestre.vitima && mestre.envolvidos && mestre.vistaIgual
        && cliente.hp === 40 && cliente.portador === 40 && cliente.cartao && cliente.semBotaoMestre;
      return [ok, JSON.stringify({ observado, ativou, defesa, mestre, cliente })];
    } finally {
      try {
        if (preparado) await jogador.evaluate(`(async () => {
          for (const app of [...foundry.applications.instances.values()]) if (app.document?.name?.startsWith('C41.2')
            || (app.element?.matches('.janela-defesa') && app.element.textContent.includes('C41.2'))) await app.close({ animate: false });
          return true;
        })()`);
      } finally {
        await edge.evaluate(`(async () => { const s = window.__c412; try { if (s) { if (s.pendente) await s.pendente; await s.limpar(); } } finally { delete window.__c412; } return true; })()`);
      }
    }
  });

  await r.passo('C41.2 escudo humano: tiro destrói o cadáver sem sobra; explosão destruidora na área passa inteira ao portador uma vez e Desfazer restaura os dois', async () => {
    const info = await executar(`
      await f.vitima.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true });
      await ativar(f);
      const inicial = { estado: foto(f), body: f.vitima.system.atributos.body.valor,
        escudo: dadosDaPessoa(await humano.escudoHumanoDe(f.portador, { cena: f.cena })) };
      fixar(dados(5)); const tiro = await atacar(f), cartaoTiro = cartaoDo(tiro.resultado);
      const tiroDestruidor = { estado: foto(f), pv: { ...f.vitima.getFlag(S, 'escudoHumanoCadaver') },
        cadaveres: tiro.resultado.linhas.filter(l => l.cadaver).map(l => ({ receptor: l.receptor, ...l.cadaver })),
        danos: tiro.resultado.linhas.filter(l => l.dano).length,
        undo: cartaoTiro.getFlag(S, 'desfazer').map(u => ({ ator: u.ator, cadaver: u.cadaver, dano: u.dano })), fila: fila.length };
      await desfazer(tiro.resultado);
      tiroDestruidor.desfeito = { estado: foto(f), pv: { ...f.vitima.getFlag(S, 'escudoHumanoCadaver') } };
      await game.settings.set(S, 'area', true);
      fixar(dados(6)); const explosao = await atacar(f, {
        arma: f.lancador.uuid, modo: 'explosivo', alvos: [f.tokenPortador.uuid, f.tokenVitima.uuid]
      });
      const cartaoExplosao = cartaoDo(explosao.resultado);
      const explosaoDestruidora = { estado: foto(f), pv: { ...f.vitima.getFlag(S, 'escudoHumanoCadaver') },
        cadaveres: explosao.resultado.linhas.filter(l => l.cadaver).map(l => ({ receptor: l.receptor, ...l.cadaver })),
        danos: explosao.resultado.linhas.filter(l => l.dano).map(l => ({ receptor: l.receptor, recebido: l.dano.recebido })),
        duplicatas: explosao.resultado.linhas.filter(l => l.resultado === 'semRepeticao').length,
        undo: cartaoExplosao.getFlag(S, 'desfazer').map(u => ({ ator: u.ator, cadaver: u.cadaver, perdeu: u.dano?.perdeu ?? 0 })), fila: fila.length };
      await desfazer(explosao.resultado);
      explosaoDestruidora.desfeito = { estado: foto(f), pv: { ...f.vitima.getFlag(S, 'escudoHumanoCadaver') } };
      return { inicial, tiroDestruidor, explosaoDestruidora, vitima: f.vitima.uuid, portador: f.portador.uuid };
    `);
    const { inicial, tiroDestruidor: tiro, explosaoDestruidora: explosao } = info;
    const intacto = estado => estado.portador === 40 && estado.vitima === 40 && estado.sp === 7
      && estado.lesoesPortador === 0 && estado.lesoesVitima === 0;
    const unicoCadaver = (caso, passou) => caso.cadaveres.length === 1 && caso.cadaveres[0].receptor === info.vitima
      && caso.cadaveres[0].antes === 6 && caso.cadaveres[0].depois === 0 && caso.cadaveres[0].perdeu === 6
      && caso.cadaveres[0].max === 6 && caso.cadaveres[0].passou === passou;
    const ok = inicial.body === 6 && inicial.escudo.morto && inicial.escudo.pv.value === 6 && inicial.escudo.pv.max === 6 && intacto(inicial.estado)
      && intacto(tiro.estado) && tiro.pv.value === 0 && tiro.pv.max === 6 && unicoCadaver(tiro, false) && tiro.danos === 0 && tiro.fila === 0
      && tiro.undo.length === 1 && tiro.undo[0].ator === info.vitima && tiro.undo[0].cadaver === 6 && tiro.undo[0].dano === null
      && intacto(tiro.desfeito.estado) && tiro.desfeito.pv.value === 6 && tiro.desfeito.pv.max === 6
      && explosao.estado.portador === 22 && explosao.estado.vitima === 40 && explosao.estado.sp === 7
      && explosao.estado.lesoesPortador === 0 && explosao.estado.lesoesVitima === 0 && explosao.pv.value === 0 && explosao.pv.max === 6
      && unicoCadaver(explosao, true) && explosao.danos.length === 1 && explosao.danos[0].receptor === info.portador && explosao.danos[0].recebido === 18
      && explosao.duplicatas === 1 && explosao.fila === 0 && explosao.undo.length === 2
      && explosao.undo.filter(u => u.ator === info.vitima && u.cadaver === 6 && u.perdeu === 0).length === 1
      && explosao.undo.filter(u => u.ator === info.portador && u.cadaver === 0 && u.perdeu === 18).length === 1
      && intacto(explosao.desfeito.estado) && explosao.desfeito.pv.value === 6 && explosao.desfeito.pv.max === 6;
    return [ok, JSON.stringify(info)];
  });
};
