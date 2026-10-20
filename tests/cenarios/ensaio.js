// Ensaio de uma sessão da Morana no Foundry 14 (o pedido do usuário, 2026-10-18: a campanha passa hoje para o sistema
// novo). Segue o "Procedimento da migração da campanha" do MIGRATION_STATUS e uma sessão de jogo, de ponta a ponta, num
// mundo só: o grupo na wiki de teste com a ficha da mesa do Foundry 12 (o estado do meio da campanha), o "Importar da
// mesa" pela janela "Personagens da wiki", a conferência das fichas, dois jogadores nos navegadores deles, a cena, o
// combate, a NET, o Death Save, o saque, o pagamento e a ficha que volta para a wiki. Não substitui o v14 (o G4): é o
// roteiro da mesa, com as capturas de cada ficha (tests/.saida/ensaio-*) para conferir o visual.
// Só roda chamado pelo nome: node tests/rodar.js ensaio
const path = require('path');
const foundry14 = require('../lib/foundry14');
const { mesaOcupada } = require('../lib/foundry');
const { abrirEdge } = require('../lib/edge');

// O que a ficha "Na mesa" do Foundry 14 tem e a do Foundry 12 (o tableSnapshot do cpr-2077) não tem.
const SO_DO_14 = ['catalogo', 'instaladoEm', 'carregada'];

module.exports = async ({ edge, servidores, r }) => {
  if (!process.argv.slice(2).includes('ensaio')) { await r.passo('ensaio: só roda chamado pelo nome (node tests/rodar.js ensaio)', async () => [true, '']); return; }
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)}) || {}).textContent || ''`);
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  const criar = async dados => {
    const { personagem } = await api('/api/personagens', 'POST', { metodo: 'ratoderua', lingua: 'Portuguese', casa: 'Heywood', lifepath, ...dados });
    await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
    await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
    for (let i = 0; i < 30 && !/Salvo/.test(await texto('#cc-save')); i++) await edge.sleep(200);
    return (await api(`/api/personagens/${personagem.id}`)).personagem;
  };

  // ---------- O grupo na wiki ----------
  const grupo = {};
  await r.passo('wiki: o grupo (um Solo, uma Netrunner e um Medtech, pelo criador, como os jogadores fizeram)', async () => {
    grupo.solo = await criar({ sorteio: { linha: 6 }, nome: 'Rafa', apelido: 'Grampo', role: 'solo', habilidades: { 'Initiative Reaction': 2, 'Threat Detection': 2 } });
    grupo.netrunner = await criar({ sorteio: { linha: 1 }, nome: 'Lia', apelido: 'Faísca', role: 'netrunner' });
    grupo.medtech = await criar({ sorteio: { linha: 1 }, nome: 'Nico', apelido: 'Agulha', role: 'medtech' });
    const resumo = Object.fromEntries(Object.entries(grupo).map(([chave, p]) => [chave, `${p.resultado?.itens?.length ?? 0} itens, HP ${p.resultado?.derivados?.hp}`]));
    return [Object.values(grupo).every(p => p.resultado?.itens?.length > 3), JSON.stringify(resumo)];
  });

  // ---------- Foundry 14 ----------
  if (!foundry14.disponivel()) { await r.passo(`${foundry14.motivoIndisponivel()}: o ensaio parou`, async () => [false, '']); return; }
  const ocupada = await mesaOcupada(servidores.raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): o ensaio parou`, async () => [false, '']); return; }
  foundry14.preparar();
  const mesa = await foundry14.subir();
  const errosAntes = edge.erros.length;
  const S = foundry14.SISTEMA;
  const jogadores = {};
  const fixar = (navegador, lados) => navegador.evaluate(`(() => {
    window.__fila = ${JSON.stringify(lados)};
    CONFIG.Dice.randomUniform = () => { const p = window.__fila.shift(); return p ? 1 - (p[0] - 0.5) / p[1] : foundry.dice.MersenneTwister.random(); };
    return true;
  })()`);
  const esperarJs = 'const esperar = async (condicao, vezes = 100) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };';
  try {
    await r.passo('Foundry 14: o mundo novo da campanha, com o sistema, os três jogadores e o endereço da wiki', async () => {
      await foundry14.capturarAvisos(edge);
      await foundry14.entrarComoMestre(edge, mesa.url);
      const info = await edge.evaluate(`(async () => {
        await game.settings.set('${S}', 'wikiUrl', ${JSON.stringify(wiki)});
        for (const name of ['Jogador Grampo', 'Jogadora Faísca', 'Jogador Agulha']) if (!game.users.getName(name)) await User.implementation.create({ name, role: CONST.USER_ROLES.PLAYER });
        return { sistema: game.system.id, versao: game.system.version, usuarios: game.users.map(u => u.name), wiki: game.settings.get('${S}', 'wikiUrl') };
      })()`);
      return [info.sistema === S && info.usuarios.length === 4 && info.wiki === wiki, JSON.stringify(info)];
    });

    // A ficha da mesa do Foundry 12 de cada um, no meio da campanha: o personagem como veio da wiki, com o que mudou
    // jogando (o HP, o dinheiro, a munição gasta, uma lesão, um item que o mestre deu e uma perícia do CORE fora do livro).
    // O Foundry 14 monta a ficha no mesmo formato (fichaParaAWiki); sai o que só ele manda, e ela vai para a wiki como a do
    // Foundry 12, ligada a um ator dele.
    const mesaDe = {};
    await r.passo('wiki: a ficha da mesa do Foundry 12 de cada um, no meio da campanha (o HP, o dinheiro, a munição, a lesão, o item do mestre, a perícia fora do livro)', async () => {
      const estados = {
        solo: { hp: 31, dinheiro: 2350, lesoes: ['Broken Arm'], extra: { nome: 'Flashlight', tipo: 'gear', qtd: 1, uso: 'carried', uid: '' }, pericia: null },
        netrunner: { hp: 22, dinheiro: 640, lesoes: [], extra: { nome: 'Agent', tipo: 'gear', qtd: 1, uso: 'carried', uid: '' }, pericia: null },
        medtech: { hp: null, dinheiro: 1180, lesoes: [], extra: { nome: 'Techtool', tipo: 'gear', qtd: 1, uso: 'carried', uid: '' }, pericia: { nome: 'Pilotar Drone', nivel: 2, stat: 'TECH' } }
      };
      const feitos = {};
      for (const [chave, estado] of Object.entries(estados)) {
        const p = grupo[chave];
        const ficha = await edge.evaluate(`(async () => {
          const { ator } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(p.id)}, '');
          try {
            // A munição gasta: metade de cada pilha; a arma carregada, com o pente pela metade.
            for (const municao of ator.items.filter(i => i.type === 'municao')) await municao.update({ 'system.quantidade': Math.ceil(municao.system.quantidade / 2) });
            const arma = ator.items.find(i => i.type === 'arma' && i.system.aDistancia && i.system.pente.max);
            if (arma) { await arma.update({ 'system.equipada': true }); await arma.recarregar().catch(() => null); await arma.update({ 'system.pente.value': Math.floor(arma.system.pente.max / 2) }); }
            if (${estado.hp ?? 'null'} !== null) await ator.update({ 'system.hp.value': ${estado.hp ?? 0} });
            await ator.update({ 'system.dinheiro': ${estado.dinheiro}, 'system.pontosDeMelhoria': 12, 'system.reputacao': 1 });
            return game.system.api.wiki.fichaParaAWiki(ator);
          } finally { await ator.delete(); }
        })()`);
        delete ficha.geracao;
        for (const item of ficha.itens) for (const chave of SO_DO_14) delete item[chave];
        ficha.ator = `f12-${chave}`;
        ficha.nomeAtor = p.apelido;
        ficha.quando = '2026-10-11T23:40:00.000Z';
        ficha.lesoes = estado.lesoes;
        ficha.itens.push(estado.extra);
        if (estado.pericia) ficha.pericias.push(estado.pericia);
        // O vínculo do Foundry 12 (o cpr-2077 grava sem a geração), e a ficha da mesa que ele mandou.
        for (let i = 0; i < 30 && !(await api(`/api/personagens/${p.id}`)).personagem?.foundry14?.removido; i++) await edge.sleep(200);
        const doc = (await api(`/api/personagens/${p.id}`)).personagem;
        await api(`/api/personagens/${p.id}/foundry`, 'PUT', { ator: ficha.ator, nomeAtor: ficha.nomeAtor, versao: doc.versao, entregues: doc.foundry?.entregues ?? [] });
        const resposta = await api(`/api/personagens/${p.id}/mesa`, 'PUT', ficha);
        mesaDe[chave] = (await api(`/api/personagens/${p.id}`)).personagem.mesa;
        feitos[chave] = { itens: ficha.itens.length, hp: ficha.hp, dinheiro: ficha.dinheiro, gravada: Boolean(mesaDe[chave]?.itens), erro: resposta?.erro ?? null };
      }
      return [Object.values(feitos).every(f => f.gravada && !f.erro), JSON.stringify(feitos)];
    });

    // ---------- O procedimento: o "Importar da mesa" pela janela, e a conferência ----------
    const donos = { solo: 'Jogador Grampo', netrunner: 'Jogadora Faísca', medtech: 'Jogador Agulha' };
    const atores = {};
    await r.passo('janela "Personagens da wiki": cada um com o dono e o "Importar da mesa" (o passo 5 do procedimento); os avisos que a janela mostra', async () => {
      const info = await edge.evaluate(`(async () => {
        ${esperarJs}
        await ui.sidebar.changeTab('actors', 'primary');
        await ui.actors.render({ force: true });
        await esperar(() => ui.actors.element?.querySelector('[data-cprf-wiki]'));
        ui.actors.element.querySelector('[data-cprf-wiki]').click();
        const janela = () => foundry.applications.instances.get('${S}-wiki')?.element;
        const linha = (id, seletor = '') => janela()?.querySelector('ol.personagens li[data-wiki-id="' + id + '"]' + seletor);
        const ultimo = () => janela()?.querySelector('.ultimo')?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
        const grupo = ${JSON.stringify(Object.fromEntries(Object.entries(grupo).map(([chave, p]) => [chave, { id: p.id, dono: donos[chave] }])))};
        const feitos = {};
        for (const [chave, p] of Object.entries(grupo)) {
          await esperar(() => linha(p.id, ' [data-action="importarDaMesa"]'));
          const botoes = [...(linha(p.id)?.querySelectorAll(':scope > button') ?? [])].map(b => b.dataset.action);
          const dono = game.users.getName(p.dono);
          linha(p.id, ' select').value = dono.id;
          linha(p.id, ' [data-action="importarDaMesa"]').click();
          await esperar(() => ultimo().includes('importado') && game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === p.id), 150);
          const ator = game.actors.find(a => a.getFlag('${S}', 'wiki')?.id === p.id);
          // O personagem do jogador (a configuração do usuário), para ele abrir a ficha e ser o dono do token.
          if (ator) await dono.update({ character: ator.id });
          feitos[chave] = { botoes, aviso: ultimo(), ator: ator?.id ?? null, nome: ator?.name ?? null, dono: ator?.testUserPermission(dono, 'OWNER') ?? false };
        }
        return feitos;
      })()`);
      Object.assign(atores, Object.fromEntries(Object.entries(info).map(([chave, f]) => [chave, f.ator])));
      await edge.shot('janela-da-wiki');
      await edge.evaluate(`foundry.applications.instances.get('${S}-wiki')?.close().then(() => true)`);
      // O aviso esperado: só o "importado" (o item que o mestre deu e a perícia fora do livro acham o catálogo).
      const ok = Object.values(info).every(f => f.ator && f.dono && f.botoes.includes('importarDaMesa') && /importado\.$/.test(f.aviso));
      return [ok, JSON.stringify(info)];
    });

    await r.passo('conferência de cada ficha contra a da mesa (o passo 7 do procedimento): HP, Humanidade, dinheiro, IP, os itens, a munição, o pente, a lesão, o cyberware instalado e os programas no deck', async () => {
      const info = await edge.evaluate(`(async () => {
        const atores = ${JSON.stringify(atores)};
        const mesas = ${JSON.stringify(mesaDe)};
        const nomeOriginal = item => item.getFlag('${S}', 'nomeOriginal') ?? item.name;
        const diferencas = {};
        for (const [chave, id] of Object.entries(atores)) {
          const a = game.actors.get(id), m = mesas[chave], s = a.system, d = [];
          const igual = (rotulo, aqui, la) => { if (JSON.stringify(aqui) !== JSON.stringify(la)) d.push(rotulo + ': ' + JSON.stringify(aqui) + ' (mesa ' + JSON.stringify(la) + ')'); };
          igual('HP', s.hp.value, m.hp.atual);
          igual('Humanidade', s.humanidade.value, m.humanidade.atual);
          igual('dinheiro', s.dinheiro, m.dinheiro);
          igual('IP', s.pontosDeMelhoria, m.ip);
          const daMesa = m.itens.map(i => i.nome).sort();
          const daqui = a.items.filter(i => i.type !== 'lesao').map(i => i.name).sort();
          igual('itens', daqui, daMesa);
          for (const linha of m.itens.filter(i => i.tipo === 'ammo')) igual('munição ' + linha.nome, a.items.getName(linha.nome)?.system.quantidade, linha.qtd);
          for (const linha of m.itens.filter(i => i.tipo === 'weapon' && i.pente)) {
            const arma = a.items.filter(i => i.name === linha.nome).find(i => i.system.pente.value === linha.pente.atual) ?? a.items.getName(linha.nome);
            igual('pente ' + linha.nome, arma?.system.pente.value, linha.pente.atual);
            if (linha.municao) igual('carregada ' + linha.nome, arma?.municaoCarregada?.name ?? '', linha.municao);
          }
          igual('lesões', a.items.filter(i => i.type === 'lesao').map(nomeOriginal).sort(), [...m.lesoes].sort());
          for (const linha of m.itens.filter(i => i.tipo === 'cyberware')) igual('instalado ' + linha.nome, a.items.filter(i => i.name === linha.nome).some(i => i.system.instalado === Boolean(linha.instalado)), true);
          for (const linha of m.itens.filter(i => i.tipo === 'cyberdeck' && i.dentro?.length)) igual('no deck ' + linha.nome, (a.items.getName(linha.nome)?.instalados ?? []).map(i => i.name).sort(), [...linha.dentro].sort());
          // As perícias, pela ficha que este ator mandaria de volta (o mesmo formato).
          igual('perícias', game.system.api.wiki.fichaParaAWiki(a).pericias.map(p => p.nome + ' ' + p.nivel).sort(), m.pericias.map(p => p.nome + ' ' + p.nivel).sort());
          diferencas[chave] = d;
        }
        return diferencas;
      })()`);
      return [Object.values(info).every(d => !d.length), JSON.stringify(info)];
    });

    // ---------- Os jogadores, nos navegadores deles ----------
    await r.passo('jogadores: o do Solo e a da Netrunner entram (o do Medtech faltou hoje); cada um abre a própria ficha, e cada aba desenha sem erro', async () => {
      const info = {};
      for (const [chave, nome, porta] of [['solo', 'Jogador Grampo', 9470], ['netrunner', 'Jogadora Faísca', 9471]]) {
        const navegador = await abrirEdge({ porta, saida: path.join(servidores.raiz, 'tests', '.saida'), prefixo: `ensaio-${chave}-` });
        jogadores[chave] = navegador;
        await foundry14.capturarAvisos(navegador);
        await foundry14.entrarComo(navegador, mesa.url, nome);
        await navegador.evaluate(`game.settings.set('${S}', 'rolarDireto', true).then(() => true)`);
        info[chave] = await navegador.evaluate(`(async () => {
          ${esperarJs}
          const a = game.user.character;
          if (!a) return { erro: 'sem personagem' };
          await a.sheet.render({ force: true });
          await esperar(() => a.sheet.element?.querySelector('nav.tabs'));
          const abas = [...a.sheet.element.querySelectorAll('nav.tabs [data-tab]')].map(b => b.dataset.tab);
          const vistas = {};
          for (const aba of abas) {
            a.sheet.changeTab(aba, 'primary');
            await new Promise(r => setTimeout(r, 250));
            const el = a.sheet.element.querySelector('.tab[data-tab="' + aba + '"]');
            vistas[aba] = Boolean(el?.classList.contains('active') && el.children.length);
          }
          a.sheet.changeTab('pericias', 'primary');
          return { nome: a.name, dono: a.isOwner, abas, vistas };
        })()`);
        for (const aba of info[chave].abas ?? []) {
          await navegador.evaluate(`(() => { game.user.character.sheet.changeTab(${JSON.stringify(aba)}, 'primary'); return true; })()`);
          await navegador.sleep(300);
          await navegador.shot(`ficha-${aba}`);
        }
        info[chave].avisos = await foundry14.avisosDoSistema(navegador);
      }
      const ok = Object.values(info).every(i => i.dono && i.abas?.length >= 6 && Object.values(i.vistas).every(Boolean) && !i.avisos.length);
      return [ok, JSON.stringify(info)];
    });

    // ---------- A sessão ----------
    const cena = {};
    await r.passo('cena: o mestre monta o pachinko da Wakako, com os três personagens e dois seguranças (capangas), e a ativa; os jogadores a recebem', async () => {
      Object.assign(cena, await edge.evaluate(`(async () => {
        ${esperarJs}
        const cat = await game.system.api.wiki.carregarCatalogo();
        const pegar = id => foundry.utils.deepClone(cat[id]);
        const s = await Scene.implementation.create({ name: 'Ensaio: o pachinko da Wakako', width: 3000, height: 2000, grid: { size: 100, distance: 2, units: 'm' } });
        await s.activate();
        await esperar(() => canvas.ready && canvas.scene?.id === s.id);
        const pistola = pegar('core_weapons:heavy-pistol');
        pistola.system.equipada = true;
        const balas = pegar('core_ammo:heavy-pistol-basic');
        balas.system.quantidade = 30;
        const colete = pegar('core_armor:light-armorjack-body');
        colete.system.equipada = true;
        const seguranca = await Actor.implementation.create({ name: 'Segurança da Wakako', type: 'capanga', system: { atributos: { ref: { valor: 6 }, dex: { valor: 6 }, body: { valor: 6 }, will: { valor: 5 } }, pericias: { handgun: { nivel: 4 }, evasion: { nivel: 3 } } }, items: [pistola, balas, colete] });
        await seguranca.items.find(i => i.type === 'arma').recarregar();
        const atores = ${JSON.stringify(atores)};
        const token = async (ator, x, y, name) => (await ator.getTokenDocument({ x, y, ...(name ? { name } : {}) })).toObject();
        const criados = await s.createEmbeddedDocuments('Token', [
          await token(game.actors.get(atores.solo), 500, 500), await token(game.actors.get(atores.netrunner), 500, 800), await token(game.actors.get(atores.medtech), 500, 1100),
          await token(seguranca, 1000, 600, 'Segurança 1'), await token(seguranca, 1000, 900, 'Segurança 2')
        ]);
        return { cena: s.id, seguranca: seguranca.id, tokens: Object.fromEntries(criados.map(t => [t.name, t.id])) };
      })()`));
      const vistos = {};
      for (const [chave, navegador] of Object.entries(jogadores)) {
        vistos[chave] = await navegador.evaluate(`(async () => {
          ${esperarJs}
          await esperar(() => canvas.ready && canvas.scene?.id === '${cena.cena}' && canvas.tokens.placeables.length === 5, 150);
          return { cena: canvas.scene?.name, tokens: canvas.tokens.placeables.length, meu: canvas.tokens.placeables.filter(t => t.document.isOwner).map(t => t.name) };
        })()`);
      }
      await edge.shot('cena');
      const ok = Object.keys(cena.tokens).length === 5 && Object.values(vistos).every(v => v.tokens === 5 && v.meu.length === 1);
      return [ok, JSON.stringify({ ...cena, vistos })];
    });

    await r.passo('combate: o mestre começa o combate com todos; cada jogador rola a iniciativa pela ficha; o mestre rola a dos seguranças e a do Medtech (o jogador faltou)', async () => {
      await edge.evaluate(`(async () => {
        const c = await Combat.implementation.create({ scene: '${cena.cena}', active: true });
        await c.createEmbeddedDocuments('Combatant', canvas.scene.tokens.map(t => ({ tokenId: t.id, sceneId: canvas.scene.id, actorId: t.actorId })));
        window.__combate = c.id;
        return true;
      })()`);
      const dosJogadores = {};
      for (const [chave, navegador] of Object.entries(jogadores)) {
        dosJogadores[chave] = await navegador.evaluate(`(async () => {
          ${esperarJs}
          const a = game.user.character;
          await esperar(() => game.combat?.combatants.some(c => c.actor?.id === a.id));
          a.sheet.changeTab('combate', 'primary');
          await esperar(() => a.sheet.element?.querySelector('[data-action="rolarIniciativa"]'));
          a.sheet.element.querySelector('[data-action="rolarIniciativa"]').click();
          await esperar(() => game.combat.combatants.find(c => c.actor?.id === a.id)?.initiative !== null);
          return game.combat.combatants.find(c => c.actor?.id === a.id)?.initiative ?? null;
        })()`);
      }
      const info = await edge.evaluate(`(async () => {
        ${esperarJs}
        const c = game.combats.get(window.__combate);
        await c.rollNPC();
        const nico = c.combatants.find(x => x.actorId === ${JSON.stringify(atores.medtech)});
        if (nico.initiative === null) await c.rollInitiative([nico.id]);
        await c.startCombat();
        await esperar(() => c.started && c.combatants.every(x => x.initiative !== null));
        return { ordem: c.turns.map(x => x.name + ' ' + x.initiative), vez: c.combatant?.name, rodada: c.round };
      })()`);
      await edge.shot('combate');
      const ok = Object.values(dosJogadores).every(v => Number.isFinite(v)) && info.ordem.length === 5 && info.rodada === 1;
      return [ok, JSON.stringify({ dosJogadores, ...info })];
    });

    await r.passo('o Solo atira: o jogador marca o Segurança 1 (a 10 m) e clica "Atacar" no rifle; o mestre resolve; o jogador rola o dano, e o HP do segurança cai (a SP 11 do colete segura parte)', async () => {
      const antes = await edge.evaluate(`canvas.scene.tokens.get('${cena.tokens['Segurança 1']}').actor.system.hp.value`);
      // d10 8 no ataque; 5d6 de dano, 4 em cada (20): 20 − 11 = 9.
      await fixar(jogadores.solo, [[8, 10], [4, 6], [4, 6], [4, 6], [4, 6], [4, 6]]);
      const tiro = await jogadores.solo.evaluate(`(async () => {
        ${esperarJs}
        const a = game.user.character;
        const rifle = a.items.getName('Assault Rifle');
        canvas.tokens.setTargets(['${cena.tokens['Segurança 1']}']);
        a.sheet.changeTab('combate', 'primary');
        await esperar(() => a.sheet.element?.querySelector('[data-item-id="' + rifle.id + '"] [data-action="atacar"]'));
        const pente = rifle.system.pente.value;
        const mensagens = game.messages.size;
        a.sheet.element.querySelector('[data-item-id="' + rifle.id + '"] [data-action="atacar"]').click();
        await esperar(() => game.messages.size > mensagens + 1, 150);
        return { gastou: pente - rifle.system.pente.value, mensagens: game.messages.size - mensagens };
      })()`);
      let depois = antes;
      for (let i = 0; i < 40 && depois === antes; i++) { await edge.sleep(250); depois = await edge.evaluate(`canvas.scene.tokens.get('${cena.tokens['Segurança 1']}').actor.system.hp.value`); }
      const outro = await edge.evaluate(`canvas.scene.tokens.get('${cena.tokens['Segurança 2']}').actor.system.hp.value`);
      await jogadores.solo.evaluate(`(() => { canvas.tokens.setTargets([]); return true; })()`);
      await edge.shot('tiro-do-solo');
      return [tiro.gastou === 1 && depois === antes - 9 && outro === antes, JSON.stringify({ tiro, antes, depois, outro })];
    });

    await r.passo('o segurança atira na Netrunner: se ela pode esquivar, a jogadora recebe a pergunta e aguenta; o dano entra no HP dela, no navegador do mestre e no dela', async () => {
      const lia = () => `game.actors.get(${JSON.stringify(atores.netrunner)}).system.hp.value`;
      const antes = await edge.evaluate(lia());
      // A SP de antes do tiro (o tiro que passa abla 1).
      const sp = await edge.evaluate(`game.actors.get(${JSON.stringify(atores.netrunner)}).system.armadura.corpo.sp`);
      // d10 9: REF 6 + Pistola 4 + 9 = 19 contra a DV 15 da pistola a 10 m (a 20 m seria 20, e erraria); dano 3d6, 5 em
      // cada (15): o HP cai o que passar da SP do colete dela.
      await fixar(edge, [[9, 10], [5, 6], [5, 6], [5, 6]]);
      await edge.evaluate(`(() => { const t = canvas.scene.tokens.get('${cena.tokens['Segurança 1']}'); window.__tiro = t.actor.items.find(i => i.type === 'arma').atacar({ alvo: canvas.scene.tokens.find(x => x.actorId === ${JSON.stringify(atores.netrunner)}) }); return true; })()`);
      const pergunta = await jogadores.netrunner.evaluate(`(async () => {
        ${esperarJs}
        const janela = () => document.querySelector('.application.cpr-fieldbook.janela-defesa:not(.minimizing)');
        await esperar(() => janela(), 50);
        if (!janela()) return null;
        const opcoes = [...janela().querySelectorAll('button.opcao')].map(b => b.dataset.escolha);
        janela().querySelector('button.opcao[data-escolha="aguentar"]')?.click();
        return opcoes;
      })()`);
      await edge.evaluate(`window.__tiro.then(() => true)`);
      let depois = antes;
      for (let i = 0; i < 40 && depois === antes; i++) { await edge.sleep(250); depois = await edge.evaluate(lia()); }
      const noNavegadorDela = await jogadores.netrunner.evaluate(`(async () => { ${esperarJs} await esperar(() => game.user.character.system.hp.value === ${depois}); return game.user.character.system.hp.value; })()`);
      const spDepois = await edge.evaluate(`game.actors.get(${JSON.stringify(atores.netrunner)}).system.armadura.corpo.sp`);
      await jogadores.netrunner.shot('tiro-na-netrunner');
      const ok = depois === antes - Math.max(0, 15 - sp) && noNavegadorDela === depois && spDepois === (15 > sp ? sp - 1 : sp);
      return [ok, JSON.stringify({ pergunta, antes, depois, sp, spDepois, noNavegadorDela })];
    });

    await r.passo('o Medtech cai (o jogador faltou): o mestre zera o HP dele e rola o Death Save pela ficha; o cartão fica no chat', async () => {
      await fixar(edge, [[3, 10]]);
      const info = await edge.evaluate(`(async () => {
        ${esperarJs}
        const a = game.actors.get(${JSON.stringify(atores.medtech)});
        await a.update({ 'system.hp.value': 0 });
        await a.sheet.render({ force: true });
        await esperar(() => a.sheet.element?.querySelector('[data-action="deathSave"]'));
        const mensagens = game.messages.size;
        a.sheet.element.querySelector('[data-action="deathSave"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
        await esperar(() => game.messages.size > mensagens);
        const m = game.messages.contents.at(-1);
        const resultado = { total: m.rolls[0]?.total, texto: m.content.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 160), penalidade: a.system.deathSave.penalidade };
        await a.sheet.close();
        return resultado;
      })()`);
      return [info.total === 3 && /Death Save/i.test(info.texto), JSON.stringify(info)];
    });

    await r.passo('NET: o mestre põe o terminal do pachinko com uma arquitetura do compêndio (o Apartamento de um fixer); a Netrunner conecta pela ficha, abre a janela da NET, desce ao primeiro andar e usa o Breach, que o mestre rola; depois desconecta', async () => {
      const ponto = await edge.evaluate(`(async () => {
        const { PONTO_PADRAO } = await import('/systems/${S}/scripts/netrun/constantes.mjs');
        const pack = game.packs.get('${S}.arquiteturas');
        const entrada = (await pack.getIndex()).contents.find(e => e.name === 'Apartamento de um fixer');
        const arq = await game.items.importFromCompendium(pack, entrada._id);
        const [tile] = await canvas.scene.createEmbeddedDocuments('Tile', [{ x: 600, y: 800, width: 100, height: 100, texture: { src: 'systems/${S}/icones/terminal.svg' }, flags: { '${S}': { pontoDeAcesso: { ...PONTO_PADRAO, nome: 'Terminal do pachinko', arquitetura: arq.uuid } } } }]);
        return { tile: tile.uuid, arquitetura: arq.name, andares: arq.system.andares.length, primeiro: arq.system.andares.find(a => a.andar === 1)?.tipo };
      })()`);
      // O Breach no mestre: d10 9.
      await fixar(edge, [[9, 10]]);
      const naNet = await jogadores.netrunner.evaluate(`(async () => {
        ${esperarJs}
        const a = game.user.character;
        const token = canvas.scene.tokens.find(t => t.actorId === a.id);
        a.sheet.changeTab('net', 'primary');
        await esperar(() => a.sheet.element?.querySelector('[data-action="conectarNaNet"]'));
        a.sheet.element.querySelector('[data-action="conectarNaNet"]').click();
        await esperar(() => token.getFlag('${S}', 'conexaoNaNet')?.tile === '${ponto.tile}' && a.sheet.element?.querySelector('[data-action="abrirNet"]'), 150);
        const conectou = token.getFlag('${S}', 'conexaoNaNet')?.tile === '${ponto.tile}';
        a.sheet.element.querySelector('[data-action="abrirNet"]')?.click();
        const janela = () => document.querySelector('.application.janela-net');
        await esperar(() => janela()?.querySelector('[data-no="1a"]'), 150);
        await game.system.api.netrun.pedir('mover', { tile: '${ponto.tile}', token: token.id, destino: '1a' });
        await esperar(() => game.system.api.netrun.estado(fromUuidSync('${ponto.tile}'))?.corredores?.find(c => c.token === token.id)?.no === '1a', 150);
        const registro = () => [...(janela()?.querySelectorAll('.registro li') ?? [])].map(li => li.textContent.replace(/\\s+/g, ' ').trim());
        const antes = registro().length;
        await esperar(() => janela()?.querySelector('button[data-action="habilidade"][data-habilidade="backdoor"]:not([disabled])'), 100);
        janela()?.querySelector('button[data-action="habilidade"][data-habilidade="backdoor"]')?.click();
        await esperar(() => registro().length > antes && registro().some(l => /Breach \\(/.test(l)), 150);
        return { conectou, janela: Boolean(janela()), no: game.system.api.netrun.estado(fromUuidSync('${ponto.tile}'))?.corredores?.find(c => c.token === token.id)?.no ?? null, breach: registro().filter(l => /Breach/.test(l)).slice(-1)[0] ?? null };
      })()`);
      await jogadores.netrunner.shot('janela-da-net');
      const saiu = await jogadores.netrunner.evaluate(`(async () => {
        ${esperarJs}
        const a = game.user.character;
        const token = canvas.scene.tokens.find(t => t.actorId === a.id);
        for (const app of [...foundry.applications.instances.values()]) if (app.options.classes?.includes('janela-net')) await app.close();
        await a.sheet.render({ force: true });
        await esperar(() => a.sheet.element?.querySelector('[data-action="desconectarDaNet"]'));
        a.sheet.element.querySelector('[data-action="desconectarDaNet"]')?.click();
        await esperar(() => !token.getFlag('${S}', 'conexaoNaNet'));
        return !token.getFlag('${S}', 'conexaoNaNet');
      })()`);
      const ok = naNet.conectou && naNet.janela && naNet.no === '1a' && Boolean(naNet.breach) && saiu;
      return [ok, JSON.stringify({ ponto, naNet, saiu })];
    });

    await r.passo('saque: o mestre põe o saque com a pistola de um segurança; o jogador do Solo abre o saque e pega a pistola para o Rafa', async () => {
      const saque = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const conteiner = await Actor.implementation.create({ name: 'Bolsa do segurança', type: 'conteiner', system: { tipo: 'saque' }, items: [foundry.utils.deepClone(cat['core_weapons:heavy-pistol']), { ...foundry.utils.deepClone(cat['core_ammo:heavy-pistol-basic']), system: { ...cat['core_ammo:heavy-pistol-basic'].system, quantidade: 12 } }] });
        const [token] = await canvas.scene.createEmbeddedDocuments('Token', [(await conteiner.getTokenDocument({ x: 1600, y: 600 })).toObject()]);
        return { conteiner: conteiner.id, token: token.id };
      })()`);
      const pegou = await jogadores.solo.evaluate(`(async () => {
        ${esperarJs}
        await esperar(() => game.actors.get('${saque.conteiner}')?.isOwner && canvas.scene.tokens.get('${saque.token}'));
        const conteiner = game.actors.get('${saque.conteiner}');
        const a = game.user.character;
        const antes = a.items.filter(i => i.name === 'Heavy Pistol').length;
        await conteiner.sheet.render({ force: true });
        await esperar(() => conteiner.sheet.element?.querySelector('[data-action="pegarTudo"]'));
        const pistola = conteiner.items.getName('Heavy Pistol');
        const escolhido = conteiner.sheet.element.querySelector('select.parceiro')?.selectedOptions[0]?.textContent.trim();
        conteiner.sheet.element.querySelector('li[data-item-id="' + pistola.id + '"] [data-action="pegarTudo"]').click();
        await esperar(() => a.items.filter(i => i.name === 'Heavy Pistol').length > antes && !conteiner.items.getName('Heavy Pistol'));
        const resultado = { escolhido, pistolas: a.items.filter(i => i.name === 'Heavy Pistol').length - antes, sobrou: conteiner.items.map(i => i.name) };
        await conteiner.sheet.close();
        return resultado;
      })()`);
      return [pegou.escolhido === 'Rafa' && pegou.pistolas === 1 && pegou.sobrou.join() === 'Heavy Pistol (Basic)', JSON.stringify({ saque, pegou })];
    });

    await r.passo('fim da cena: o mestre encerra o combate e paga 1.500eb a cada um pelo extrato ("Pagamento da Wakako"); a ficha de cada um volta para a wiki, agora do Foundry 14', async () => {
      const info = await edge.evaluate(`(async () => {
        const c = game.combats.get(window.__combate);
        await c?.delete();
        const atores = ${JSON.stringify(atores)};
        const saldos = {};
        for (const [chave, id] of Object.entries(atores)) {
          const a = game.actors.get(id);
          await a.mudarComExtrato('dinheiro', { acao: 'somar', valor: 1500, motivo: 'Pagamento da Wakako' });
          saldos[chave] = a.system.dinheiro;
        }
        await game.system.api.wiki.mandarPendentes();
        return { combate: game.combats.has(window.__combate), saldos };
      })()`);
      const naWiki = {};
      for (const [chave, p] of Object.entries(grupo)) {
        let doc = null;
        for (let i = 0; i < 30; i++) {
          doc = (await api(`/api/personagens/${p.id}`)).personagem;
          if (doc?.mesa?.dinheiro === info.saldos[chave]) break;
          await edge.sleep(300);
        }
        naWiki[chave] = { dinheiro: doc?.mesa?.dinheiro, ator: doc?.mesa?.ator, geracao: doc?.mesa?.geracao ?? null, hp: doc?.mesa?.hp?.atual };
      }
      const ok = !info.combate && Object.entries(naWiki).every(([chave, w]) => w.dinheiro === info.saldos[chave] && w.ator === atores[chave]);
      return [ok, JSON.stringify({ ...info, naWiki })];
    });

    await r.passo('nenhum aviso de compatibilidade nem erro vindo do sistema, no navegador do mestre e no dos jogadores', async () => {
      const lista = [['mestre', await foundry14.avisosDoSistema(edge)]];
      for (const [chave, navegador] of Object.entries(jogadores)) lista.push([chave, await foundry14.avisosDoSistema(navegador)]);
      return [lista.every(([, avisos]) => !avisos.length), lista.filter(([, avisos]) => avisos.length).map(([quem, avisos]) => `${quem}: ${avisos.join(' | ')}`).join(' || ')];
    });
  } finally {
    for (const [chave, navegador] of Object.entries(jogadores)) {
      await navegador.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
      edge.erros.push(...navegador.erros.filter(erro => /cpr-fieldbook/.test(erro)).map(erro => `${chave}: ${erro}`));
      await navegador.fechar();
    }
    await edge.send('Page.navigate', { url: 'about:blank' });
    await edge.sleep(500);
    const doFoundry = edge.erros.splice(errosAntes);
    edge.erros.push(...doFoundry.filter(erro => /cpr-fieldbook/.test(erro)));
    await mesa.parar();
  }
};
