// C34.2: confirmação de exclusão nas fichas reais e permissão revalidada depois dos diálogos.
module.exports = async function exclusaoItem(r, edge, jogador) {
  await r.passo('C34.2: apagar item pela ficha respeita confirmação atual, instalação e filhos; arma descarrega e contêiner mantém exclusão conjunta', async () => {
    const info = await edge.evaluate(`(async () => {
      const S = 'cpr-fieldbook', chave = 'confirmarExclusaoItem', anterior = game.settings.get(S, chave), atores = [];
      let cena;
      const esperar = async f => { for (let i = 0; i < 70 && !f(); i++) await new Promise(r => setTimeout(r, 100)); if (!f()) throw Error('C34 exclusão: espera'); };
      const dialogos = () => [...document.querySelectorAll('.application.dialog')].filter(d => d.querySelector('.window-title')?.textContent === 'Apagar item');
      const janela = () => dialogos()[0];
      const criarAtor = async type => { const a = await Actor.implementation.create({ name: 'C34 exclusão ' + type, type }); atores.push(a); return a; };
      const criar = async (a, type, name, system = {}) => (await a.createEmbeddedDocuments('Item', [{ type, name, system }]))[0];
      const abrir = async (a, aba = 'equipamento') => { await a.sheet.render({ force: true }); if (a.type === 'personagem') a.sheet.changeTab(aba, 'primary'); };
      const botao = (a, i) => a.sheet.element.querySelector('[data-item-id="' + i.id + '"] [data-action="apagarItem"]');
      const clicar = async (a, i, aba) => { await abrir(a, aba); await esperar(() => botao(a, i)); botao(a, i).click(); };
      const resposta = async acao => { await esperar(janela); const b = janela().querySelector('[data-action="' + acao + '"]'); if (!b) throw Error('C34 exclusão: botão ' + acao); b.click(); await esperar(() => !janela()); };
      try {
        await game.settings.set(S, chave, true);
        const a = await criarAtor('personagem');
        const comum = await criar(a, 'equipamento', 'Agent <em>próprio</em>');
        await clicar(a, comum); await esperar(janela);
        const perguntou = { texto: janela().textContent, html: Boolean(janela().querySelector('em')), quantidade: dialogos().length };
        await resposta('no'); const cancelou = a.items.has(comum.id);
        await clicar(a, comum); await esperar(janela); janela().querySelector('.window-header [data-action="close"]').click();
        await esperar(() => !janela()); const fechou = a.items.has(comum.id);
        await clicar(a, comum); await resposta('yes'); await esperar(() => !a.items.has(comum.id));
        await game.settings.set(S, chave, false);
        const direto = await criar(a, 'equipamento', 'Agent sem confirmação');
        await clicar(a, direto); await esperar(() => !a.items.has(direto.id)); const semJanela = !janela();
        const c = await criarAtor('capanga'), doCapanga = await criar(c, 'equipamento', 'Agent do capanga');
        await clicar(c, doCapanga); await esperar(() => !c.items.has(doCapanga.id)); const capanga = !janela();
        // A cena de teste não é ativada: a ficha do ator sintético resolve o UUID e altera só aquele token.
        const doModelo = await criar(c, 'equipamento', 'Agent preservado no modelo');
        const vistaAnterior = canvas.scene?.id ?? null;
        cena = await Scene.implementation.create({ name: 'C34 exclusão token solto', active: false, width: 1000, height: 1000, grid: { size: 100, distance: 2, units: 'm' } });
        const [token] = await cena.createEmbeddedDocuments('Token', [(await c.getTokenDocument({ actorLink: false, x: 100, y: 100 })).toObject()]);
        const sintetico = token.actor, itemDoToken = sintetico.items.get(doModelo.id);
        const identidadeAntes = fromUuidSync(sintetico.uuid) === sintetico;
        await clicar(sintetico, itemDoToken); await esperar(() => !token.actor.items.has(doModelo.id));
        const tokenSolto = { solto: token.actor.isToken, identidadeAntes, identidadeDepois: fromUuidSync(token.actor.uuid) === token.actor,
          apagou: !token.actor.items.has(doModelo.id), modeloIntacto: c.items.has(doModelo.id) && c.items.get(doModelo.id).name === 'Agent preservado no modelo',
          semJanela: !janela(), vistaPreservada: (canvas.scene?.id ?? null) === vistaAnterior };
        const funda = await criar(a, 'cyberware', 'Fundação instalada', { instalado: true, fundacional: true });
        await clicar(a, funda, 'cyberware'); await esperar(janela);
        const fundacao = { aviso: janela().textContent.includes('Instalado em: ' + a.name), simples: Boolean(janela().querySelector('[data-action="yes"]')) };
        await resposta('no'); fundacao.preservada = a.items.has(funda.id);
        const arma = await criar(a, 'arma', 'Pistola com acessório');
        const acessorio = await criar(a, 'upgrade', 'Acessório <em>instalado</em>', { instaladoEm: arma.id });
        await clicar(a, acessorio); await esperar(janela);
        const instalado = janela().textContent.includes('Instalado em: ' + arma.name);
        await resposta('no');
        await clicar(a, arma); await esperar(janela);
        const filhos = { escolha: janela().classList.contains('apagar-com-instalados'), simples: Boolean(janela().querySelector('[data-action="yes"]')), html: Boolean(janela().querySelector('em')), quantidade: dialogos().length };
        await resposta('cancelar'); filhos.cancelou = a.items.has(arma.id) && a.items.has(acessorio.id);
        await clicar(a, arma); await resposta('soltar');
        await esperar(() => !a.items.has(arma.id) && !acessorio.system.instaladoEm);
        filhos.solto = a.items.has(acessorio.id) && !acessorio.system.instaladoEm;
        const outra = await criar(a, 'arma', 'Arma e conteúdo juntos');
        const outro = await criar(a, 'upgrade', 'Conteúdo junto', { instaladoEm: outra.id });
        await clicar(a, outra); await resposta('junto'); await esperar(() => !a.items.has(outra.id) && !a.items.has(outro.id));
        filhos.juntos = !a.items.has(outro.id);
        const opcao = await criar(a, 'cyberware', 'Opção na fundação', { instaladoEm: funda.id });
        await clicar(a, funda, 'cyberware'); await esperar(janela);
        fundacao.comFilho = janela().classList.contains('apagar-com-instalados') && janela().textContent.includes('Instalado em: ' + a.name) && dialogos().length === 1;
        await resposta('cancelar'); fundacao.filhoPreservado = a.items.has(opcao.id);
        const balas = await criar(a, 'municao', 'Munição carregada', { quantidade: 7 });
        const carregada = await criar(a, 'arma', 'Arma carregada', { carregada: balas.id, pente: { value: 3, max: 8 } });
        await clicar(a, balas); await esperar(janela);
        const municao = { aviso: janela().textContent.includes('Instalado em: ' + carregada.name) };
        await resposta('no'); municao.preservada = a.items.has(balas.id) && carregada.system.pente.value === 3 && balas.system.quantidade === 7;
        await clicar(a, carregada); await esperar(() => !a.items.has(carregada.id));
        municao.devolvida = balas.system.quantidade;
        // A raiz instalada enquanto o C32 aguardava precisa mostrar seu novo receptor antes de permitir apagar.
        const receptor = await criar(a, 'veiculo', 'Veículo receptor posterior');
        const raizMovida = await criar(a, 'arma', 'Arma movida durante C32');
        const filhoDaMovida = await criar(a, 'upgrade', 'Filho da arma movida', { instaladoEm: raizMovida.id });
        await clicar(a, raizMovida); await esperar(() => janela()?.classList.contains('apagar-com-instalados'));
        const perguntaAntiga = janela();
        await raizMovida.update({ 'system.instaladoEm': receptor.id });
        perguntaAntiga.querySelector('[data-action="soltar"]').click();
        await esperar(() => janela() && janela() !== perguntaAntiga && janela().classList.contains('apagar-com-instalados') && janela().textContent.includes('Instalado em: ' + receptor.name));
        const montagemPosterior = { aviso: janela().textContent.includes('Instalado em: ' + receptor.name), quantidade: dialogos().length };
        await resposta('cancelar');
        montagemPosterior.preservou = a.items.has(raizMovida.id) && a.items.has(filhoDaMovida.id) && raizMovida.system.instaladoEm === receptor.id && filhoDaMovida.system.instaladoEm === raizMovida.id;
        // O filho que entrou enquanto a confirmação simples aguardava passa pelo diálogo C32 antes de apagar.
        await game.settings.set(S, chave, true);
        const tardia = await criar(a, 'arma', 'Instalação posterior');
        await clicar(a, tardia); await esperar(janela);
        const filhoTardio = await criar(a, 'upgrade', 'Entrou na pergunta', { instaladoEm: tardia.id });
        janela().querySelector('[data-action="yes"]').click();
        await esperar(() => janela()?.classList.contains('apagar-com-instalados'));
        await resposta('cancelar'); const concorrente = a.items.has(tardia.id) && a.items.has(filhoTardio.id);
        await game.settings.set(S, chave, false);
        const estoque = await criarAtor('conteiner');
        const solto = await criar(estoque, 'equipamento', 'Item comum do estoque');
        await clicar(estoque, solto); await esperar(() => !estoque.items.has(solto.id));
        const raiz = await criar(estoque, 'arma', 'Arma do estoque');
        const filho = await criar(estoque, 'upgrade', 'Acessório do estoque', { instaladoEm: raiz.id });
        await clicar(estoque, raiz); await esperar(janela);
        const conteiner = { aviso: janela().textContent.includes('O conteúdo instalado sai junto: ' + filho.name) };
        await resposta('no'); conteiner.cancelou = estoque.items.has(raiz.id) && estoque.items.has(filho.id);
        await clicar(estoque, raiz); await resposta('yes'); await esperar(() => !estoque.items.has(raiz.id) && !estoque.items.has(filho.id));
        conteiner.juntos = !estoque.items.has(filho.id);
        return { perguntou, cancelou, fechou, semJanela, capanga, tokenSolto, fundacao, instalado, filhos, municao, montagemPosterior, concorrente, conteiner };
      } finally {
        for (const d of dialogos()) d.querySelector('.window-header [data-action="close"]')?.click();
        await game.settings.set(S, chave, anterior);
        for (const token of cena?.tokens ?? []) if (token.actor?.sheet.rendered) await token.actor.sheet.close();
        await cena?.delete();
        for (const a of atores.reverse()) { if (a.sheet.rendered) await a.sheet.close(); await a.delete(); }
      }
    })()`);
    const ok = info.perguntou.texto.includes('Agent <em>próprio</em>') && !info.perguntou.html && info.perguntou.quantidade === 1
      && info.cancelou && info.fechou && info.semJanela && info.capanga && info.instalado && Object.values(info.tokenSolto).every(Boolean)
      && Object.values(info.fundacao).every(Boolean) && info.filhos.escolha && !info.filhos.simples && !info.filhos.html && info.filhos.quantidade === 1
      && info.filhos.cancelou && info.filhos.solto && info.filhos.juntos && info.municao.aviso && info.municao.preservada && info.municao.devolvida === 10
      && info.montagemPosterior.aviso && info.montagemPosterior.quantidade === 1 && info.montagemPosterior.preservou
      && info.concorrente && Object.values(info.conteiner).every(Boolean);
    return [ok, JSON.stringify(info)];
  });

  await r.passo('C34.2: confirmação de exclusão é deste cliente; dono usa a opção atual, observador não apaga e revogações durante a pergunta impedem a ação', async () => {
    let preparo;
    try {
      preparo = await edge.evaluate(`(async () => {
        const u = game.users.getName('Jogador'), S = 'cpr-fieldbook', chave = 'confirmarExclusaoItem', opcao = game.settings.get(S, chave);
        await game.settings.set(S, chave, false);
        const criar = async (name, type, nivel, system = {}) => Actor.implementation.create({ name, type, ownership: { default: 0, [u.id]: nivel }, system, items: [
          { name: name + ' primeiro', type: 'equipamento' }, { name: name + ' segundo', type: 'equipamento' }
        ] });
        const dono = await criar('C34 dono exclusão', 'personagem', 3), observador = await criar('C34 observador exclusão', 'personagem', 2);
        const estoque = await criar('C34 permissão estoque', 'conteiner', 3, { tipo: 'personalizado', permissoes: { apagar: true } });
        return { dono: dono.id, observador: observador.id, estoque: estoque.id, opcao };
      })()`);
      const inicio = await jogador.evaluate(`(async () => {
        const S = 'cpr-fieldbook', chave = 'confirmarExclusaoItem'; window.__c34ExclusaoOpcao = game.settings.get(S, chave);
        const esperar = async f => { for (let i = 0; i < 70 && !f(); i++) await new Promise(r => setTimeout(r, 100)); if (!f()) throw Error('C34 jogador: espera'); };
        await esperar(() => game.actors.has('${preparo.estoque}'));
        window.__c34ExclusaoJanela = () => [...document.querySelectorAll('.application.dialog')].find(d => d.querySelector('.window-title')?.textContent === 'Apagar item');
        window.__c34ExclusaoAbrir = async a => { await a.sheet.render({ force: true }); if (a.type === 'personagem') a.sheet.changeTab('equipamento', 'primary'); };
        window.__c34ExclusaoBotao = (a, i) => a.sheet.element.querySelector('[data-item-id="' + i.id + '"] [data-action="apagarItem"]');
        const a = game.actors.get('${preparo.dono}'); await game.settings.set(S, chave, true); await __c34ExclusaoAbrir(a);
        const i = a.items.contents[0]; __c34ExclusaoBotao(a, i).click(); await esperar(__c34ExclusaoJanela);
        __c34ExclusaoJanela().querySelector('[data-action="no"]').click(); await esperar(() => !__c34ExclusaoJanela());
        const cancelou = a.items.has(i.id); await game.settings.set(S, chave, false);
        await esperar(() => __c34ExclusaoBotao(a, i)); __c34ExclusaoBotao(a, i).click(); await esperar(() => !a.items.has(i.id));
        const direto = !__c34ExclusaoJanela();
        const obs = game.actors.get('${preparo.observador}'); await __c34ExclusaoAbrir(obs);
        const proibido = obs.items.contents[0], alvo = __c34ExclusaoBotao(obs, proibido);
        alvo?.click(); const recusou = await obs.sheet.options.actions.apagarItem.call(obs.sheet, {}, alvo ?? { closest: () => ({ dataset: { itemId: proibido.id } }) });
        const observador = { owner: obs.isOwner, preservou: obs.items.has(proibido.id), janela: Boolean(__c34ExclusaoJanela()), retorno: recusou === undefined };
        await game.settings.set(S, chave, true); await __c34ExclusaoAbrir(a);
        __c34ExclusaoBotao(a, a.items.contents[0]).click(); await esperar(__c34ExclusaoJanela);
        return { cancelou, direto, observador, opcao: game.settings.get(S, chave) };
      })()`);
      const gm = await edge.evaluate(`(async () => { const a = game.actors.get('${preparo.dono}'); const opcao = game.settings.get('cpr-fieldbook', 'confirmarExclusaoItem'); await a.update({ ownership: { [game.users.getName('Jogador').id]: 2 } }); return opcao; })()`);
      const revogada = await jogador.evaluate(`(async () => {
        const a = game.actors.get('${preparo.dono}'); for (let i = 0; i < 70 && a.isOwner; i++) await new Promise(r => setTimeout(r, 100));
        __c34ExclusaoJanela().querySelector('[data-action="yes"]').click(); for (let i = 0; i < 70 && __c34ExclusaoJanela(); i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 250));
        const estoque = game.actors.get('${preparo.estoque}'); await __c34ExclusaoAbrir(estoque);
        __c34ExclusaoBotao(estoque, estoque.items.contents[0]).click(); for (let i = 0; i < 70 && !__c34ExclusaoJanela(); i++) await new Promise(r => setTimeout(r, 100));
        return { owner: a.isOwner, itens: a.items.size, janela: Boolean(__c34ExclusaoJanela()) };
      })()`);
      await edge.evaluate(`game.actors.get('${preparo.estoque}').update({ 'system.permissoes.apagar': false }).then(() => true)`);
      const permissao = await jogador.evaluate(`(async () => {
        const a = game.actors.get('${preparo.estoque}'); for (let i = 0; i < 70 && a.system.permissoes.apagar; i++) await new Promise(r => setTimeout(r, 100));
        __c34ExclusaoJanela().querySelector('[data-action="yes"]').click(); for (let i = 0; i < 70 && __c34ExclusaoJanela(); i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 250));
        await game.settings.set('cpr-fieldbook', 'confirmarExclusaoItem', false);
        await a.sheet.options.actions.apagarItem.call(a.sheet, {}, { closest: () => ({ dataset: { itemId: a.items.contents[0].id } }) });
        return { apagar: a.system.permissoes.apagar, itens: a.items.size, janela: Boolean(__c34ExclusaoJanela()) };
      })()`);
      return [inicio.cancelou && inicio.direto && !inicio.observador.owner && inicio.observador.preservou && !inicio.observador.janela && inicio.observador.retorno
        && inicio.opcao && gm === false && !revogada.owner && revogada.itens === 1 && revogada.janela
        && !permissao.apagar && permissao.itens === 2 && !permissao.janela, JSON.stringify({ inicio, gm, revogada, permissao })];
    } finally {
      await jogador.evaluate(`(async () => {
        if (window.__c34ExclusaoJanela) __c34ExclusaoJanela()?.querySelector('.window-header [data-action="close"]')?.click();
        if (window.__c34ExclusaoOpcao !== undefined) await game.settings.set('cpr-fieldbook', 'confirmarExclusaoItem', window.__c34ExclusaoOpcao);
        delete window.__c34ExclusaoOpcao; delete window.__c34ExclusaoJanela; delete window.__c34ExclusaoAbrir; delete window.__c34ExclusaoBotao; return true;
      })()`);
      if (preparo) await edge.evaluate(`(async () => { for (const id of ${JSON.stringify([preparo.dono, preparo.observador, preparo.estoque])}) { const a = game.actors.get(id); if (a?.sheet.rendered) await a.sheet.close(); await a?.delete(); } await game.settings.set('cpr-fieldbook', 'confirmarExclusaoItem', ${JSON.stringify(preparo.opcao)}); return true; })()`);
    }
  });
};
