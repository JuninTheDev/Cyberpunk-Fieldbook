// C34.2: os modos de lesão repetida pelo sistema real, incluindo o botão do cartão do Monowire.
// Cada passo usa atores próprios; dados, avisos, configuração e cartões são devolvidos no finally.
const AMBIENTE = `
  const S = 'cpr-fieldbook', api = game.system.api.lesoes;
  const CERVICAL = 'core_critical-injuries-head:whiplash', OLHO = 'core_critical-injuries-head:damaged-eye';
  const cat = await game.system.api.wiki.carregarCatalogo();
  const configuracao = game.settings.get(S, 'lesoesRepetidas');
  const random = CONFIG.Dice.randomUniform, avisar = ui.notifications.warn;
  const avisoProprio = Object.hasOwn(ui.notifications, 'warn');
  const mensagensAnteriores = new Set(game.messages.map(m => m.id)), atores = [], avisos = [];
  let fila = [], dados = 0;
  const usarDados = (...valores) => { fila = valores; dados = 0; };
  CONFIG.Dice.randomUniform = () => {
    const valor = fila.shift();
    if (valor === undefined) throw Error('C34.2: dado D6 não previsto.');
    dados++;
    return 1 - (valor - .5) / 6;
  };
  ui.notifications.warn = texto => { avisos.push(String(texto)); return null; };
  const criar = async (nome, tipo, ids = []) => {
    const ator = await Actor.implementation.create({ name: nome, type: tipo,
      system: { hp: { value: 35 }, atributos: { body: { valor: 5 }, will: { valor: 5 } } },
      items: ids.map(id => foundry.utils.deepClone(cat[id])) });
    atores.push(ator);
    return ator;
  };
  const quantidade = (ator, id) => ator.items.filter(i => i.getFlag(S, 'catalogo') === id).length;
  const mensagensDo = ator => game.messages.filter(m => !mensagensAnteriores.has(m.id) && m.speaker.actor === ator.id);
  const esperar = async condicao => {
    for (let i = 0; i < 80 && !condicao(); i++) await new Promise(resolve => setTimeout(resolve, 100));
    if (!condicao()) throw Error('C34.2: estado esperado não chegou.');
  };
  const limpar = async () => {
    CONFIG.Dice.randomUniform = random;
    try {
      await game.settings.set(S, 'lesoesRepetidas', configuracao);
      const ids = new Set(atores.map(a => a.id));
      const mensagens = game.messages.filter(m => !mensagensAnteriores.has(m.id) && ids.has(m.speaker.actor));
      if (mensagens.length) await ChatMessage.implementation.deleteDocuments(mensagens.map(m => m.id));
      for (const ator of atores.reverse()) {
        if (ator.sheet.rendered) await ator.sheet.close();
        if (game.actors.has(ator.id)) await ator.delete();
      }
    } finally {
      if (avisoProprio) ui.notifications.warn = avisar;
      else delete ui.notifications.warn;
    }
  };
`;

module.exports = async (r, edge, jogador) => {
  const executar = fonte => edge.evaluate(`(async () => { ${AMBIENTE} try { ${fonte} } finally { await limpar(); } })()`);
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  await r.passo('C34.2: lesão repetida em personagem e capanga; off e warn criam outra cópia com Death Save próprio, reroll escolhe outra e a lesão certa continua idempotente', async () => {
    const info = await executar(`
      const registro = game.settings.settings.get(S + '.lesoesRepetidas'), resultados = [];
      for (const tipo of ['personagem', 'capanga']) for (const modo of ['off', 'warn', 'reroll']) {
        await game.settings.set(S, 'lesoesRepetidas', modo);
        const ator = await criar('C34 Lesão ' + tipo + ' ' + modo, tipo, [CERVICAL]);
        const antes = avisos.length;
        usarDados(...(modo === 'reroll' ? [4, 4, 2, 2] : [4, 4]));
        const feita = await api.lesaoCritica(ator, { cabeca: true });
        const cartoes = mensagensDo(ator), cartao = cartoes[0];
        const primeiro = { tipo, modo, nome: ator.name, id: feita?.id, total: feita?.roll?.total,
          itemCriado: Boolean(feita?.item && ator.items.has(feita.item.id)), itens: ator.items.size,
          cervical: quantidade(ator, CERVICAL), olho: quantidade(ator, OLHO), base: ator.system.deathSave.base,
          hp: ator.system.hp.value, distancia: ator.system.bonus.distancia, dados, fila: fila.length,
          avisos: avisos.slice(antes), cartoes: cartoes.length, idNoCartao: cartao?.getFlag(S, 'lesao')?.id,
          totalNoCartao: cartao?.rolls[0]?.total, repetidaNoCartao: cartao?.content.includes(ator.name + ' já tinha esta lesão.') };
        const itensAntes = ator.items.size, mensagensAntes = mensagensDo(ator).length, avisosAntes = avisos.length;
        usarDados();
        const certa = await api.lesaoCritica(ator, { id: CERVICAL, falar: false });
        primeiro.forcada = { id: certa?.id, item: certa?.item ?? null, roll: certa?.roll ?? null,
          itensIguais: ator.items.size === itensAntes, mensagensIguais: mensagensDo(ator).length === mensagensAntes,
          avisosIguais: avisos.length === avisosAntes, dados };
        resultados.push(primeiro);
      }
      return { registro: { scope: registro.scope, default: registro.default, choices: Object.keys(registro.choices) }, resultados };
    `);
    const CERVICAL = 'core_critical-injuries-head:whiplash', OLHO = 'core_critical-injuries-head:damaged-eye';
    const ok = info.registro.scope === 'world' && info.registro.default === 'reroll' && igual(info.registro.choices, ['off', 'warn', 'reroll'])
      && info.resultados.length === 6 && info.resultados.every(v => {
        const reroll = v.modo === 'reroll', id = reroll ? OLHO : CERVICAL;
        return v.itemCriado && v.itens === 2 && v.id === id && v.total === (reroll ? 4 : 8)
          && v.cervical === (reroll ? 1 : 2) && v.olho === (reroll ? 1 : 0) && v.base === (reroll ? 1 : 2)
          && v.hp === 35 && v.distancia === (reroll ? -2 : 0) && v.dados === (reroll ? 4 : 2) && v.fila === 0
          && igual(v.avisos, v.modo === 'warn' ? [v.nome + ' já tem a lesão Traumatismo cervical.'] : [])
          && v.cartoes === 1 && v.idNoCartao === id && v.totalNoCartao === v.total && v.repetidaNoCartao === !reroll
          && v.forcada.id === CERVICAL && v.forcada.item === null && v.forcada.roll === null
          && v.forcada.itensIguais && v.forcada.mensagensIguais && v.forcada.avisosIguais && v.forcada.dados === 0;
      });
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C34.2: tabela cheia só impede reroll; off e warn respeitam exclusão, e anunciar a repetida não cria item nem altera HP', async () => {
    const info = await executar(`
      const { TABELAS_LESAO } = await import('/systems/' + S + '/scripts/gerado.mjs');
      const todas = [...new Set(TABELAS_LESAO.cabeca.map(f => f[2]))], resultados = [];
      for (const modo of ['off', 'warn', 'reroll']) {
        await game.settings.set(S, 'lesoesRepetidas', modo);
        const ator = await criar('C34 Tabela cheia ' + modo, 'capanga', todas), avisosAntes = avisos.length;
        usarDados(...(modo === 'reroll' ? [] : [4, 4]));
        const feita = await api.lesaoCritica(ator, { cabeca: true });
        const cheio = { modo, nome: ator.name, nulo: feita === null, id: feita?.id ?? null,
          cervical: quantidade(ator, CERVICAL), itens: ator.items.size, dados, fila: fila.length,
          cartoes: mensagensDo(ator).length, avisos: avisos.slice(avisosAntes), hp: ator.system.hp.value };
        if (modo !== 'reroll') {
          const antesExclusao = avisos.length;
          usarDados(4, 4, 2, 2);
          const outra = await api.lesaoCritica(ator, { cabeca: true, excluir: [CERVICAL] });
          cheio.exclusao = { id: outra?.id, olho: quantidade(ator, OLHO), cervical: quantidade(ator, CERVICAL),
            itens: ator.items.size, dados, fila: fila.length, avisos: avisos.slice(antesExclusao), cartoes: mensagensDo(ator).length };
          const antesAnuncio = { itens: ator.items.size, avisos: avisos.length, base: ator.system.deathSave.base };
          usarDados(4, 4);
          const anuncio = await api.lesaoCritica(ator, { cabeca: true, naFicha: false });
          const cartao = mensagensDo(ator).at(-1);
          cheio.anuncio = { id: anuncio?.id, item: anuncio?.item ?? null, itensIguais: ator.items.size === antesAnuncio.itens,
            baseIgual: ator.system.deathSave.base === antesAnuncio.base, hp: ator.system.hp.value, dados, fila: fila.length,
            avisos: avisos.slice(antesAnuncio.avisos), cartoes: mensagensDo(ator).length,
            idNoCartao: cartao?.getFlag(S, 'lesao')?.id, totalNoCartao: cartao?.rolls[0]?.total,
            repetidaNoCartao: cartao?.content.includes(ator.name + ' já tinha esta lesão.') };
        }
        resultados.push(cheio);
      }
      return resultados;
    `);
    const CERVICAL = 'core_critical-injuries-head:whiplash', OLHO = 'core_critical-injuries-head:damaged-eye';
    const ok = info.length === 3 && info.every(v => {
      if (v.modo === 'reroll') return v.nulo && v.id === null && v.cervical === 1 && v.itens === 11 && v.dados === 0 && v.fila === 0
        && v.cartoes === 0 && v.hp === 35 && igual(v.avisos, [v.nome + ': não há lesão disponível na tabela da cabeça.']);
      const aviso = nome => v.modo === 'warn' ? [v.nome + ' já tem a lesão ' + nome + '.'] : [];
      return !v.nulo && v.id === CERVICAL && v.cervical === 2 && v.itens === 12 && v.dados === 2 && v.fila === 0 && v.cartoes === 1 && v.hp === 35
        && igual(v.avisos, aviso('Traumatismo cervical')) && v.exclusao.id === OLHO && v.exclusao.olho === 2 && v.exclusao.cervical === 2
        && v.exclusao.itens === 13 && v.exclusao.dados === 4 && v.exclusao.fila === 0 && v.exclusao.cartoes === 2 && igual(v.exclusao.avisos, aviso('Olho danificado'))
        && v.anuncio.id === CERVICAL && v.anuncio.item === null && v.anuncio.itensIguais && v.anuncio.baseIgual && v.anuncio.hp === 35
        && v.anuncio.dados === 2 && v.anuncio.fila === 0 && v.anuncio.cartoes === 3 && igual(v.anuncio.avisos, aviso('Traumatismo cervical'))
        && v.anuncio.idNoCartao === CERVICAL && v.anuncio.totalNoCartao === 8 && v.anuncio.repetidaNoCartao;
    });
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C34.2: botão real do Monowire aplica duplicata em warn com aviso só na escolha; colisão em reroll conserva o cartão para escolher a outra lesão', async () => {
    const info = await executar(`
      const botao = (cartao, id) => document.querySelector('[data-message-id="' + cartao.id + '"] [data-cprf-acao="escolherLesao"][data-lesao="' + id + '"]');
      await game.settings.set(S, 'lesoesRepetidas', 'warn');
      const ator = await criar('C34 Monowire warn', 'personagem', [CERVICAL]);
      usarDados(4, 4, 4, 4);
      const inicioAvisos = avisos.length;
      const opcoes = await api.escolhaDeLesao(ator, { cabeca: true, atacante: 'C34', arma: 'Monowire' });
      const cartao = mensagensDo(ator).find(m => m.getFlag(S, 'escolhaDeLesao'));
      const previa = { opcoes: opcoes.map(o => o.id), itens: ator.items.size, avisos: avisos.slice(inicioAvisos),
        dados, fila: fila.length, cartoes: mensagensDo(ator).length, totais: cartao.rolls.map(r => r.total) };
      await esperar(() => botao(cartao, CERVICAL));
      botao(cartao, CERVICAL).click();
      await esperar(() => cartao.getFlag(S, 'escolhaDeLesao').escolhida === 'Traumatismo cervical' && quantidade(ator, CERVICAL) === 2);
      const aplicada = { escolhida: cartao.getFlag(S, 'escolhaDeLesao').escolhida, cervical: quantidade(ator, CERVICAL),
        itens: ator.items.size, base: ator.system.deathSave.base, hp: ator.system.hp.value,
        avisos: avisos.slice(inicioAvisos), cartoes: mensagensDo(ator).length,
        idNoCartao: mensagensDo(ator).find(m => m.getFlag(S, 'lesao'))?.getFlag(S, 'lesao').id,
        conteudo: cartao.content.includes('Escolhida: Traumatismo cervical.') };
      await game.settings.set(S, 'lesoesRepetidas', 'reroll');
      const outro = await criar('C34 Monowire colisão', 'capanga');
      usarDados(4, 4, 2, 2);
      const antesColisao = avisos.length;
      await api.escolhaDeLesao(outro, { cabeca: true, atacante: 'C34', arma: 'Monowire' });
      const escolha = mensagensDo(outro).find(m => m.getFlag(S, 'escolhaDeLesao'));
      await outro.createEmbeddedDocuments('Item', [foundry.utils.deepClone(cat[CERVICAL])]);
      await esperar(() => botao(escolha, CERVICAL));
      botao(escolha, CERVICAL).click();
      await esperar(() => avisos.length > antesColisao);
      const recusada = { escolhida: escolha.getFlag(S, 'escolhaDeLesao').escolhida, itens: outro.items.size,
        cervical: quantidade(outro, CERVICAL), olho: quantidade(outro, OLHO), hp: outro.system.hp.value,
        cartoes: mensagensDo(outro).length, avisos: avisos.slice(antesColisao), disponivel: Boolean(botao(escolha, OLHO)), dados, fila: fila.length };
      // O handler do clique recusado libera sua trava no finally antes da nova escolha.
      await new Promise(resolve => setTimeout(resolve, 50));
      botao(escolha, OLHO).click();
      await esperar(() => escolha.getFlag(S, 'escolhaDeLesao').escolhida === 'Olho danificado' && quantidade(outro, OLHO) === 1);
      const recuperada = { escolhida: escolha.getFlag(S, 'escolhaDeLesao').escolhida, itens: outro.items.size,
        cervical: quantidade(outro, CERVICAL), olho: quantidade(outro, OLHO), hp: outro.system.hp.value,
        base: outro.system.deathSave.base, distancia: outro.system.bonus.distancia,
        cartoes: mensagensDo(outro).length, avisos: avisos.slice(antesColisao), dados, fila: fila.length };
      return { previa, aplicada, recusada, recuperada };
    `);
    const CERVICAL = 'core_critical-injuries-head:whiplash';
    const aviso = 'C34 Monowire colisão passou a ter Traumatismo cervical durante a rolagem. Role novamente.';
    const ok = igual(info.previa.opcoes, [CERVICAL]) && info.previa.itens === 1 && igual(info.previa.avisos, []) && info.previa.dados === 4
      && info.previa.fila === 0 && info.previa.cartoes === 1 && igual(info.previa.totais, [8, 8])
      && info.aplicada.escolhida === 'Traumatismo cervical' && info.aplicada.cervical === 2 && info.aplicada.itens === 2 && info.aplicada.base === 2
      && info.aplicada.hp === 35 && igual(info.aplicada.avisos, ['C34 Monowire warn já tem a lesão Traumatismo cervical.'])
      && info.aplicada.cartoes === 2 && info.aplicada.idNoCartao === CERVICAL && info.aplicada.conteudo
      && info.recusada.escolhida === '' && info.recusada.itens === 1 && info.recusada.cervical === 1 && info.recusada.olho === 0 && info.recusada.hp === 35
      && info.recusada.cartoes === 1 && igual(info.recusada.avisos, [aviso]) && info.recusada.disponivel && info.recusada.dados === 4 && info.recusada.fila === 0
      && info.recuperada.escolhida === 'Olho danificado' && info.recuperada.itens === 2 && info.recuperada.cervical === 1 && info.recuperada.olho === 1
      && info.recuperada.hp === 35 && info.recuperada.base === 1 && info.recuperada.distancia === -2 && info.recuperada.cartoes === 2
      && igual(info.recuperada.avisos, [aviso]) && info.recuperada.dados === 4 && info.recuperada.fila === 0;
    return [ok, JSON.stringify(info)];
  });
  void jogador;
};
