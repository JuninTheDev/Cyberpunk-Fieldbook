// Wiki, system-rules.js:497, 499, 501 e 514: Correr usa a Ação para outro MOVE × 2 m, após o Movimento normal.
// CORE 0.92.4, cpr-actor.js:349-351: o total do turno é MOVE × 4. A régua é o C44, fora deste teste.
const AUXILIARES = `
  const S = 'cpr-fieldbook', api = game.system.api.estados;
  const esperar = async f => {
    for (let i = 0; i < 80 && !f(); i++) await new Promise(resolve => setTimeout(resolve, 100));
    if (!f()) throw Error('C41 Correr: estado esperado não chegou.');
  };
  const dialogos = () => [...document.querySelectorAll('.application.dialog.correr')];
  const dialogo = () => dialogos()[0];
  const responder = async acao => {
    await esperar(dialogo);
    const botao = acao === 'close' ? dialogo().querySelector('.window-header [data-action="close"]')
      : dialogo().querySelector('button[data-action="' + acao + '"]');
    if (!botao) throw Error('C41 Correr: botão da confirmação ausente: ' + acao);
    botao.click();
    await esperar(() => !dialogo());
  };
  const mensagensDo = ator => game.messages.filter(m => m.speaker.actor === ator.id && m.getFlag(S, 'estado')?.acao === 'correr');
  const dadosDo = mensagem => ({ ...mensagem.getFlag(S, 'estado'), speaker: { ...mensagem.speaker },
    autor: mensagem.author.id, rolls: mensagem.rolls.length, conteudo: mensagem.content });
  const fonte = ator => JSON.stringify(ator.toObject());
  const abrir = async (ator, aba = 'pericias') => {
    await ator.sheet.render({ force: true });
    if (ator.type === 'personagem') ator.sheet.changeTab(aba, 'primary');
    const raiz = () => ator.type === 'personagem' ? ator.sheet.element?.querySelector('[data-tab="' + aba + '"].tab') : ator.sheet.element;
    await esperar(() => raiz()?.querySelector('[data-action="correr"]'));
    return raiz;
  };
`;

const AMBIENTE = `${AUXILIARES}
  const atores = [], combates = [], cenas = [], avisos = [];
  const random = CONFIG.Dice.randomUniform, avisar = ui.notifications.warn;
  const avisoProprio = Object.hasOwn(ui.notifications, 'warn');
  const mensagensAnteriores = new Set(game.messages.map(m => m.id));
  const combateAnterior = ui.combat.viewed?.id ?? null;
  const ativosAnteriores = new Map(game.combats.map(c => [c.id, c.active]));
  let rolagens = 0;
  CONFIG.Dice.randomUniform = () => { rolagens++; return .5; };
  ui.notifications.warn = texto => { avisos.push(String(texto)); return null; };
  const criar = async (nome, tipo = 'personagem', dados = {}) => {
    const ator = await Actor.implementation.create({ name: nome, type: tipo,
      system: { atributos: { body: { valor: 5 }, will: { valor: 5 }, move: { valor: 5 }, luck: { valor: 5 } }, hp: { value: 35 }, sorte: { value: 5 } },
      ...dados });
    atores.push(ator);
    return ator;
  };
  const limpar = async () => {
    CONFIG.Dice.randomUniform = random;
    try {
      for (const app of [...foundry.applications.instances.values()]) {
        if (app.element?.matches('.application.dialog.correr')) await app.close();
      }
      for (const ator of atores) if (ator.sheet.rendered) await ator.sheet.close();
      if (combates.length) {
        ui.combat.viewed = null;
        for (const combate of combates.reverse()) if (game.combats.has(combate.id)) await combate.delete();
        for (const [id, ativo] of ativosAnteriores) {
          const combate = game.combats.get(id);
          if (combate && combate.active !== ativo) await combate.update({ active: ativo });
        }
        ui.combat.viewed = game.combats.get(combateAnterior) ?? null;
        await ui.combat.render({ force: true });
      }
      const ids = new Set(atores.map(a => a.id));
      const mensagens = game.messages.filter(m => !mensagensAnteriores.has(m.id) && ids.has(m.speaker.actor));
      if (mensagens.length) await ChatMessage.implementation.deleteDocuments(mensagens.map(m => m.id));
      for (const cena of cenas.reverse()) if (game.scenes.has(cena.id)) await cena.delete();
      for (const ator of atores.reverse()) if (game.actors.has(ator.id)) await ator.delete();
    } finally {
      if (avisoProprio) ui.notifications.warn = avisar;
      else delete ui.notifications.warn;
    }
  };
`;

module.exports = async (r, edge, jogador) => {
  const executar = codigo => edge.evaluate(`(async () => { ${AMBIENTE} try { ${codigo} } finally { await limpar(); } })()`);
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const corrida = (d, metros, total) => d?.acao === 'correr' && d.acoes === 1 && d.metros === metros && d.total === total && d.rolls === 0;

  await r.passo('C41 Correr: botões de Perícias, Combate e capanga confirmam Movimento prévio; MOVE preparado, um cartão no clique duplo, cancelar e fechar sem gasto nem rolagem', async () => {
    const info = await executar(`
      const cat = await game.system.api.wiki.carregarCatalogo();
      const itens = [foundry.utils.deepClone(cat['core_critical-injuries-body:broken-leg']),
        { name: 'C41 Armadura pesada', type: 'armadura', system: { equipada: true, penalidade: 2, sp: { corpo: { value: 13, max: 13 } } } }];
      const dados = { system: { atributos: { body: { valor: 5 }, will: { valor: 5 }, move: { valor: 10 }, luck: { valor: 5 } },
        hp: { value: 35 }, sorte: { value: 5 } }, items: itens };
      const personagem = await criar('C41 <em>Personagem</em>', 'personagem', dados);
      const capanga = await criar('C41 <em>Capanga</em>', 'capanga', foundry.utils.deepClone(dados));
      await personagem.prepararSorte(3); await capanga.prepararSorte(3);
      const resultados = [];
      for (const [ator, aba] of [[personagem, 'pericias'], [personagem, 'combate'], [capanga, 'pericias']]) {
        const raiz = await abrir(ator, aba), antes = fonte(ator), quantidade = mensagensDo(ator).length;
        const botao = raiz().querySelector('[data-action="correr"]'), vista = api.corridaDe(ator);
        const texto = raiz().querySelector('.dica.corrida')?.textContent.replace(/\\s+/g, ' ').trim();
        botao.click(); await esperar(dialogo);
        const pergunta = { titulo: dialogo().querySelector('.window-title')?.textContent,
          texto: dialogo().textContent, html: Boolean(dialogo().querySelector('em')), quantidade: dialogos().length };
        botao.click();
        const outra = await api.correr(ator, { confirmado: true });
        const duplo = { recusado: outra === null, quantidade: dialogos().length, cartoes: mensagensDo(ator).length - quantidade };
        await responder('yes'); await esperar(() => mensagensDo(ator).length === quantidade + 1);
        const cartao = mensagensDo(ator).at(-1);
        resultados.push({ tipo: ator.type, aba, nome: ator.name, moveFonte: ator._source.system.atributos.move.valor,
          move: ator.system.atributos.move.valor, vista, texto, pergunta, duplo, cartao: dadosDo(cartao),
          fonteIgual: antes === fonte(ator), hp: ator.system.hp.value, sorte: ator.system.sorte.value, preparada: ator.sortePreparada,
          escapado: !new DOMParser().parseFromString(cartao.content, 'text/html').querySelector('em') && cartao.content.includes('&lt;em&gt;') });
      }
      const antesCancelar = fonte(personagem), cartoesAntes = mensagensDo(personagem).length;
      const nao = api.correr(personagem); await esperar(dialogo); await responder('no');
      const cancelou = await nao === null;
      const fechar = api.correr(personagem); await esperar(dialogo); await responder('close');
      const fechou = await fechar === null;
      const falsa = await api.correr(personagem, { confirmado: false });
      const cancelamentos = { cancelou, fechou, falsa: falsa === null, semDialogo: !dialogo(),
        semCartao: mensagensDo(personagem).length === cartoesAntes, fonteIgual: fonte(personagem) === antesCancelar };
      const retorno = await api.correr(personagem, { confirmado: true });
      return { resultados, cancelamentos, retomou: retorno?.metros === 8 && mensagensDo(personagem).length === cartoesAntes + 1,
        rolagens, avisos };
    `);
    const ok = info.resultados.length === 3 && info.resultados.every(v => v.moveFonte === 10 && v.move === 4
      && v.vista.metros === 8 && v.vista.total === 16 && v.vista.acoes === 1 && !v.vista.bloqueio
      && v.texto === '+8 m · 16 m no turno.' && v.pergunta.titulo === 'Correr (1 Ação)'
      && v.pergunta.texto.includes('já usou sua Ação de Movimento') && v.pergunta.texto.includes('1 Ação')
      && v.pergunta.texto.includes('16 m no turno') && !v.pergunta.html && v.pergunta.quantidade === 1
      && v.duplo.recusado && v.duplo.quantidade === 1 && v.duplo.cartoes === 0 && corrida(v.cartao, 8, 16)
      && v.cartao.speaker.alias === v.nome && v.cartao.conteudo.includes('Confirmou que já usou a Ação de Movimento')
      && v.fonteIgual && v.hp === 35 && v.sorte === 5 && v.preparada === 3 && v.escapado)
      && Object.values(info.cancelamentos).every(Boolean) && info.retomou && info.rolagens === 0 && igual(info.avisos, []);
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41 Correr: caído, agarrado e dirigindo bloqueiam; números, estado, presença e turno são relidos depois da confirmação', async () => {
    const info = await executar(`
      const ator = await criar('C41 Revalidar'), outro = await criar('C41 Outro turno');
      const [veiculo] = await ator.createEmbeddedDocuments('Item', [{ name: 'C41 Veículo', type: 'veiculo' }]);
      const guardas = [];
      for (const estado of ['prone', S + '-agarrado', 'dirigindo']) {
        if (estado === 'dirigindo') await ator.update({ 'system.veiculo': veiculo.id, 'system.dirigindo': true });
        else await ator.toggleStatusEffect(estado, { active: true });
        const antes = mensagensDo(ator).length, a = avisos.length, vista = api.corridaDe(ator), raiz = await abrir(ator);
        const recusada = await api.correr(ator, { confirmado: true });
        guardas.push({ estado, bloqueio: vista.bloqueio, metros: vista.metros, total: vista.total,
          disabled: raiz().querySelector('[data-action="correr"]').disabled, recusada: recusada === null,
          semDialogo: !dialogo(), semCartao: mensagensDo(ator).length === antes, avisos: avisos.slice(a) });
        if (estado === 'dirigindo') await ator.update({ 'system.dirigindo': false });
        else await ator.toggleStatusEffect(estado, { active: false });
      }
      await ator.update({ 'system.veiculo': 'ausenteC41', 'system.dirigindo': true });
      const veiculoAusente = !api.corridaDe(ator).bloqueio;
      await ator.update({ 'system.dirigindo': false, 'system.veiculo': '' });
      const pendente = api.correr(ator); await esperar(dialogo);
      const textoAntigo = dialogo().textContent;
      await ator.update({ 'system.atributos.move.valor': 7 });
      await responder('yes'); const numerica = await pendente;
      const numeros = { antiga: textoAntigo.includes('10 m') && textoAntigo.includes('20 m no turno'),
        resultado: numerica, cartao: dadosDo(mensagensDo(ator).at(-1)), move: ator.system.atributos.move.valor };
      const posteriores = [];
      for (const estado of ['prone', S + '-agarrado', 'dirigindo']) {
        const antes = mensagensDo(ator).length, a = avisos.length;
        const promessa = api.correr(ator); await esperar(dialogo);
        if (estado === 'dirigindo') await ator.update({ 'system.veiculo': veiculo.id, 'system.dirigindo': true });
        else await ator.toggleStatusEffect(estado, { active: true });
        await responder('yes'); const resultado = await promessa;
        posteriores.push({ estado, recusada: resultado === null, semCartao: mensagensDo(ator).length === antes,
          avisos: avisos.slice(a), bloqueio: api.corridaDe(ator).bloqueio });
        if (estado === 'dirigindo') await ator.update({ 'system.dirigindo': false });
        else await ator.toggleStatusEffect(estado, { active: false });
      }
      const apagado = await criar('C41 Apagado na pergunta');
      const apagar = api.correr(apagado); await esperar(dialogo); await apagado.delete();
      await responder('yes'); const recusouApagado = await apagar === null && !mensagensDo(apagado).length;
      const conteiner = await criar('C41 Não corre', 'conteiner');
      const tipos = await api.correr(conteiner, { confirmado: true }) === null && await api.correr(null, { confirmado: true }) === null && !dialogo();
      const combate = await Combat.implementation.create({ scene: null, active: false, round: 1, turn: 0,
        combatants: [{ actorId: ator.id, name: ator.name, initiative: 20 }, { actorId: outro.id, name: outro.name, initiative: 10 }] });
      combates.push(combate); ui.combat.viewed = combate; await ui.combat.render({ force: true });
      if (game.combat?.id !== combate.id) throw Error('C41: combate próprio não foi selecionado.');
      const antesTurno = mensagensDo(ator).length, avisosTurno = avisos.length;
      const turno = api.correr(ator); await esperar(dialogo); await combate.update({ turn: 1 });
      await responder('yes'); const turnoRecusado = await turno;
      const mudouTurno = { recusada: turnoRecusado === null, semCartao: mensagensDo(ator).length === antesTurno,
        avisos: avisos.slice(avisosTurno), turno: combate.turn, cena: combate.scene?.id ?? null };
      const rodada = api.correr(ator); await esperar(dialogo); const avisosRodada = avisos.length;
      await combate.update({ round: 2 }); await responder('yes');
      const mudouRodada = { recusada: await rodada === null, semCartao: mensagensDo(ator).length === antesTurno,
        avisos: avisos.slice(avisosRodada), rodada: combate.round };
      return { guardas, veiculoAusente, numeros, posteriores, recusouApagado, tipos, mudouTurno, mudouRodada, rolagens };
    `);
    const avisoTurno = 'O turno mudou enquanto a confirmação de Correr estava aberta. Confirme novamente no turno atual.';
    const ok = info.guardas.length === 3 && info.guardas.every(v => Boolean(v.bloqueio) && v.metros === 0 && v.total === 0 && v.disabled
      && v.recusada && v.semDialogo && v.semCartao && igual(v.avisos, ['C41 Revalidar: ' + v.bloqueio]))
      && info.veiculoAusente && info.numeros.antiga && info.numeros.move === 7 && info.numeros.resultado.metros === 14
      && info.numeros.resultado.total === 28 && corrida(info.numeros.cartao, 14, 28)
      && info.posteriores.length === 3 && info.posteriores.every(v => v.recusada && v.semCartao && Boolean(v.bloqueio)
        && igual(v.avisos, ['C41 Revalidar: ' + v.bloqueio]))
      && info.recusouApagado && info.tipos && info.rolagens === 0
      && info.mudouTurno.recusada && info.mudouTurno.semCartao && info.mudouTurno.turno === 1 && info.mudouTurno.cena === null
      && igual(info.mudouTurno.avisos, [avisoTurno]) && info.mudouRodada.recusada && info.mudouRodada.semCartao
      && info.mudouRodada.rodada === 2 && igual(info.mudouRodada.avisos, [avisoTurno]);
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C41 Correr: jogador dono confirma, observador não recebe botão; revogar permissão durante a janela recusa e o capanga solto preserva modelo e posição', async () => {
    if (!jogador) return [false, 'C41: navegador do jogador ausente.'];
    let preparado;
    try {
      preparado = await edge.evaluate(`(async () => {
        const S = 'cpr-fieldbook', usuario = game.users.getName('Jogador');
        const salvo = window.__c41CorridaJogador = { atores: [], mensagens: game.messages.map(m => m.id), cena: null };
        const criar = async (nome, tipo, nivel) => {
          const a = await Actor.implementation.create({ name: nome, type: tipo, ownership: { default: 0, [usuario.id]: nivel },
            system: { atributos: { body: { valor: 5 }, will: { valor: 5 }, move: { valor: 6 }, luck: { valor: 5 } }, hp: { value: 35 }, sorte: { value: 5 } } });
          salvo.atores.push(a.id); return a;
        };
        const dono = await criar('C41 Dono do jogador', 'personagem', 3), observado = await criar('C41 Observado', 'personagem', 2);
        const modelo = await criar('C41 Modelo do jogador', 'capanga', 3);
        await dono.prepararSorte(2); await modelo.prepararSorte(2);
        const cena = await Scene.implementation.create({ name: 'C41 Corrida sem ativar cena', active: false, width: 1000, height: 1000,
          ownership: { default: 0, [usuario.id]: 2 }, grid: { size: 100, distance: 2, units: 'm' } });
        salvo.cena = cena.id;
        const [token] = await cena.createEmbeddedDocuments('Token', [(await modelo.getTokenDocument({ actorLink: false, name: 'C41 Token do jogador', x: 200, y: 300 })).toObject()]);
        await token.actor.update({ 'system.atributos.move.valor': 4 });
        salvo.modelo = JSON.stringify(modelo.toObject()); salvo.token = JSON.stringify(token.toObject());
        salvo.vista = canvas.scene?.id ?? null;
        return { dono: dono.id, observado: observado.id, modelo: modelo.id, cena: cena.id, token: token.id, usuario: usuario.id };
      })()`);
      const antes = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        const ids = ${JSON.stringify(preparado)};
        await esperar(() => game.actors.get(ids.dono)?.isOwner && game.actors.get(ids.observado) && game.scenes.get(ids.cena)?.tokens.has(ids.token));
        const salvo = window.__c41ClienteCorrida = { random: CONFIG.Dice.randomUniform, avisar: ui.notifications.warn,
          avisoProprio: Object.hasOwn(ui.notifications, 'warn'), avisos: [], rolagens: 0 };
        CONFIG.Dice.randomUniform = () => { salvo.rolagens++; return .5; };
        ui.notifications.warn = texto => { salvo.avisos.push(String(texto)); return null; };
        const dono = game.actors.get(ids.dono), observado = game.actors.get(ids.observado);
        const anterior = fonte(dono), raiz = await abrir(dono), botao = raiz().querySelector('[data-action="correr"]');
        const quantidade = mensagensDo(dono).length;
        botao.click(); await esperar(dialogo); await responder('yes');
        await esperar(() => mensagensDo(dono).length === quantidade + 1);
        const feita = { cartao: dadosDo(mensagensDo(dono).at(-1)), fonteIgual: fonte(dono) === anterior,
          hp: dono.system.hp.value, sorte: dono.system.sorte.value, preparada: dono.sortePreparada };
        await observado.sheet.render({ force: true }); observado.sheet.changeTab('pericias', 'primary');
        const observador = { editavel: observado.sheet.isEditable, botoes: observado.sheet.element.querySelectorAll('[data-action="correr"]').length,
          recusou: await api.correr(observado, { confirmado: true }) === null, cartoes: mensagensDo(observado).length, semDialogo: !dialogo() };
        salvo.pendente = api.correr(dono); await esperar(dialogo);
        return { feita, observador, aberta: Boolean(dialogo()) };
      })()`);
      await edge.evaluate(`game.actors.get('${preparado.dono}').update({ 'ownership.${preparado.usuario}': 2 }).then(() => true)`);
      const depois = await jogador.evaluate(`(async () => {
        ${AUXILIARES}
        const ids = ${JSON.stringify(preparado)}, salvo = window.__c41ClienteCorrida, dono = game.actors.get(ids.dono);
        await esperar(() => !dono.isOwner); const antes = mensagensDo(dono).length;
        await responder('yes');
        const revogada = { recusou: await salvo.pendente === null, cartoesIguais: mensagensDo(dono).length === antes, owner: dono.isOwner };
        const token = game.scenes.get(ids.cena).tokens.get(ids.token), sintetico = token.actor, modelo = game.actors.get(ids.modelo);
        await esperar(() => sintetico.isOwner && fromUuidSync(sintetico.uuid) === sintetico);
        const anterior = fonte(sintetico), modeloAntes = fonte(modelo), tokenAntes = JSON.stringify(token.toObject());
        const raiz = await abrir(sintetico), quantidade = mensagensDo(sintetico).length;
        const texto = raiz().querySelector('.dica.corrida')?.textContent.replace(/\\s+/g, ' ').trim();
        raiz().querySelector('[data-action="correr"]').click(); await esperar(dialogo); await responder('yes');
        await esperar(() => mensagensDo(sintetico).length === quantidade + 1);
        const mensagem = mensagensDo(sintetico).at(-1);
        return { revogada, solto: { isToken: sintetico.isToken, identidade: fromUuidSync(sintetico.uuid) === sintetico,
          fonteIgual: fonte(sintetico) === anterior, modeloIgual: fonte(modelo) === modeloAntes, tokenIgual: JSON.stringify(token.toObject()) === tokenAntes,
          texto, move: sintetico.system.atributos.move.valor, modeloMove: modelo.system.atributos.move.valor,
          hp: sintetico.system.hp.value, sorte: sintetico.system.sorte.value, preparada: sintetico.sortePreparada,
          x: token.x, y: token.y, cartao: dadosDo(mensagem) }, avisos: salvo.avisos, rolagens: salvo.rolagens };
      })()`);
      const mestre = await edge.evaluate(`(async () => {
        const s = window.__c41CorridaJogador, ids = ${JSON.stringify(preparado)};
        const modelo = game.actors.get(ids.modelo), token = game.scenes.get(ids.cena).tokens.get(ids.token);
        return { modeloIgual: JSON.stringify(modelo.toObject()) === s.modelo, tokenIgual: JSON.stringify(token.toObject()) === s.token,
          vistaIgual: (canvas.scene?.id ?? null) === s.vista };
      })()`);
      const ok = antes.aberta && corrida(antes.feita.cartao, 12, 24) && antes.feita.cartao.autor === preparado.usuario
        && antes.feita.fonteIgual && antes.feita.hp === 35 && antes.feita.sorte === 5 && antes.feita.preparada === 2
        && !antes.observador.editavel && antes.observador.botoes === 0 && antes.observador.recusou && antes.observador.cartoes === 0 && antes.observador.semDialogo
        && depois.revogada.recusou && depois.revogada.cartoesIguais && !depois.revogada.owner
        && depois.solto.isToken && depois.solto.identidade && depois.solto.fonteIgual && depois.solto.modeloIgual && depois.solto.tokenIgual
        && depois.solto.texto === '+8 m · 16 m no turno.' && depois.solto.move === 4 && depois.solto.modeloMove === 6
        && depois.solto.hp === 35 && depois.solto.sorte === 5 && depois.solto.preparada === 2 && depois.solto.x === 200 && depois.solto.y === 300
        && corrida(depois.solto.cartao, 8, 16) && depois.solto.cartao.autor === preparado.usuario
        && depois.solto.cartao.speaker.scene === preparado.cena && depois.solto.cartao.speaker.token === preparado.token
        && depois.solto.cartao.speaker.actor === preparado.modelo && depois.solto.cartao.speaker.alias === 'C41 Token do jogador'
        && igual(depois.avisos, []) && depois.rolagens === 0 && mestre.modeloIgual && mestre.tokenIgual && mestre.vistaIgual;
      return [ok, JSON.stringify({ antes, depois, mestre })];
    } finally {
      try {
        await jogador.evaluate(`(async () => {
        const s = window.__c41ClienteCorrida;
        try {
          for (const app of [...foundry.applications.instances.values()]) {
            if (app.element?.matches('.application.dialog.correr') || app.document?.name?.startsWith('C41 ')) await app.close();
          }
          if (s?.pendente) await s.pendente;
        } finally {
          if (s) { CONFIG.Dice.randomUniform = s.random; if (s.avisoProprio) ui.notifications.warn = s.avisar; else delete ui.notifications.warn; }
          delete window.__c41ClienteCorrida;
        }
        return true;
        })()`);
      } finally {
        await edge.evaluate(`(async () => {
        const s = window.__c41CorridaJogador;
        if (!s) return true;
        try {
          const mensagens = game.messages.filter(m => !s.mensagens.includes(m.id) && s.atores.includes(m.speaker.actor));
          if (mensagens.length) await ChatMessage.implementation.deleteDocuments(mensagens.map(m => m.id));
          for (const id of s.atores) { const a = game.actors.get(id); if (a?.sheet.rendered) await a.sheet.close(); }
          if (game.scenes.has(s.cena)) await game.scenes.get(s.cena).delete();
          for (const id of s.atores.reverse()) await game.actors.get(id)?.delete();
        } finally { delete window.__c41CorridaJogador; }
        return true;
        })()`);
      }
    }
  });
};
