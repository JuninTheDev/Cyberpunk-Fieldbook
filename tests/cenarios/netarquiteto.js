// NET Architect (foundry-net-architect/): a arquitetura lida do item do sistema e a tabela de Black ICE igual à da
// wiki (no Node); e, no Foundry de teste, o mestre e um jogador de verdade, em dois navegadores: o jogador clica no
// ponto de acesso, conecta, usa Pathfinder, Backdoor, Zap, programa, Eye-Dee e Control, desconecta e sai do alcance;
// o mestre resolve as rolagens pelo socket. Os dados ficam fixos (todo d10 = 6, todo d6 = 4) no cliente do mestre.
// A parte do Foundry só roda com a mesa do servidor vazia (a licença vale para uma mesa por vez).
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const foundry = require('../lib/foundry');
const { abrirEdge, sleep } = require('../lib/edge');

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  const modulo = arquivo => import(pathToFileURL(path.join(raiz, 'foundry-net-architect', 'scripts', arquivo)).href);
  const { lerArquitetura, revelarPathfinder, vizinhos, ehFundo, ENTRADA } = await modulo('arquitetura.mjs');
  const { BLACK_ICE } = await modulo('constantes.mjs');
  const { EXEMPLOS } = await modulo('compendio.mjs');
  const clinica = lerArquitetura(EXEMPLOS.find(item => /Clínica/.test(item.name)));
  const armazem = lerArquitetura(EXEMPLOS.find(item => /TLB/.test(item.name)));

  // ---------- Sem Foundry ----------
  await r.passo('arquitetura: o ramo B da clínica sai do andar 2, como o sistema desenha; fundos e vizinhos certos', async () => {
    const pais = Object.fromEntries(Object.values(clinica.nos).map(no => [no.id, no.pai]));
    const ok = pais['1a'] === ENTRADA && pais['3b'] === '2a' && pais['4b'] === '3b' && clinica.filhos['2a'].join() === '3a,3b'
      && ehFundo(clinica, '5a') && ehFundo(clinica, '5b') && !ehFundo(clinica, '3b') && vizinhos(clinica, '2a').join() === '1a,3a,3b' && clinica.dv === 10;
    return [ok, `pais ${JSON.stringify(pais)} · filhos de 2a ${clinica.filhos['2a']} · DV ${clinica.dv}`];
  });
  await r.passo('arquitetura: dois Black ICE no mesmo andar (o armazém do livro) viram um andar com dois conteúdos', async () => {
    const primeiro = armazem.nos['1a'];
    return [primeiro.conteudos.map(c => c.ice).join() === 'hellhound,killer' && armazem.nos['4a'].conteudos[0].tipo === 'controle' && armazem.dv === 8, JSON.stringify(primeiro.conteudos)];
  });
  await r.passo('Pathfinder: revela tantos andares quanto o resultado e não passa de senha com DV maior', async () => {
    const tudo = revelarPathfinder(clinica, ENTRADA, 20);
    const pouco = revelarPathfinder(clinica, ENTRADA, 3); // a senha DV8 do andar 1 aparece e barra o resto
    const medio = revelarPathfinder(clinica, ENTRADA, 9); // 4b (DV10) e 5a (DV10) aparecem; o 5b, atrás do 4b, não
    const barrado = revelarPathfinder(clinica, '3b', 9); // 4b é senha DV10: aparece, mas o 5b não
    return [tudo.length === 8 && pouco.join() === '1a' && medio.join() === '1a,2a,3a,3b,4a,4b,5a' && barrado.join() === '4b', `20: ${tudo.length} andares · 3: ${pouco} · 9: ${medio} · do 3b com 9: ${barrado}`];
  });
  await r.passo('Black ICE do módulo igual à tabela da wiki (classe, PER, SPD, ATK, DEF, REZ e efeito)', async () => {
    const fonte = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
    const linhas = [...fonte.matchAll(/\['(\w+)', '(Anti-[a-z]+)', '(\d+)', '(\d+)', '(\d+)', '(\d+)', '(\d+)', '([^']+)', '[^']+'\]/g)];
    const wiki = Object.fromEntries(linhas.map(([, nome, classe, per, spd, atk, def, rez, efeito]) => [nome.toLowerCase(), { classe, per: +per, spd: +spd, atk: +atk, def: +def, rez: +rez, efeito }]));
    const diferentes = Object.entries(BLACK_ICE).filter(([chave, ice]) => {
      const w = wiki[chave];
      return !w || w.classe !== ice.classe || w.per !== ice.per || w.spd !== ice.spd || w.atk !== ice.atk || w.def !== ice.def || w.rez !== ice.rez || w.efeito !== ice.efeito;
    }).map(([chave]) => chave);
    return [linhas.length === 12 && !diferentes.length, `${linhas.length} na wiki · diferentes: ${diferentes.join(', ') || 'nenhum'}`];
  });

  // ---------- Foundry de verdade ----------
  if (!foundry.disponivel()) { await r.passo('Foundry não instalado neste PC: parte do Foundry pulada', async () => [true, '']); return; }
  const ocupada = await foundry.mesaOcupada(raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): parte do Foundry pulada`, async () => [true, '']); return; }

  // Netrunner feito na wiki (o importador do cpr-2077 traz a Role, o cyberdeck e os programas).
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Teste NET', role: 'netrunner', metodo: 'ratoderua', sorteio: { linha: 6 }, lingua: 'Portuguese', casa: 'Heywood', lifepath });
  await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
  await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
  for (let i = 0; i < 30 && !/Salvo/.test(await edge.evaluate(`(document.querySelector('#cc-save') || {}).textContent || ''`)); i++) await sleep(200);

  foundry.limparMundo();
  foundry.preparar();
  const mesa = await foundry.subir();
  const saida = path.join(__dirname, '..', '.saida');
  const jogador = await abrirEdge({ porta: 9398, saida, prefixo: 'netarquiteto-jogador-', largura: 1400, altura: 900 });
  const errosAntes = edge.erros.length;
  const ids = {};
  // Espera uma condição no navegador (até ~12 s).
  const esperar = async (alvo, expressao, vezes = 60) => {
    for (let i = 0; i < vezes; i++) {
      const valor = await alvo.evaluate(expressao).catch(() => null);
      if (valor) return valor;
      await sleep(200);
    }
    return null;
  };
  const estado = alvo => alvo.evaluate(`game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}).getFlag('net-architect', 'estado') || null`);
  const noJogador = expressao => jogador.evaluate(expressao);
  // Clique de verdade (eventos de mouse do DevTools) no marcador do ponto de acesso, na tela do jogador.
  const clicarNoPonto = async () => {
    await noJogador(`(() => { const t = canvas.scene.tiles.get(${JSON.stringify(ids.tile)}); canvas.pan({ x: t.x + t.width / 2, y: t.y + t.height / 2, scale: 1 }); })()`);
    await sleep(400);
    const p = await noJogador(`(() => {
      const t = canvas.scene.tiles.get(${JSON.stringify(ids.tile)});
      const ponto = canvas.stage.worldTransform.apply(new PIXI.Point(t.x + t.width / 2, t.y + t.height / 2));
      const caixa = canvas.app.view.getBoundingClientRect();
      return { x: ponto.x + caixa.left, y: ponto.y + caixa.top };
    })()`);
    await sleep(300);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await jogador.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
  };
  // Botão da janela da NET do jogador; nós do mapa (SVG) recebem o clique por evento.
  const naJanela = (seletor, svg = false) => noJogador(`(() => { const el = document.querySelector('.net-janela ${seletor}'); if (!el) return false; ${svg ? "el.dispatchEvent(new MouseEvent('click', { bubbles: true }))" : 'el.click()'}; return true; })()`);
  const corredor = async () => ((await estado(edge)) || { corredores: [] }).corredores.find(item => item.token === ids.token) || null;
  const esperarEstado = async (teste, vezes = 75) => { for (let i = 0; i < vezes; i++) { const e = await estado(edge); if (e && teste(e)) return e; await sleep(200); } return estado(edge); };
  const ir = async no => { await naJanela(`[data-action="selecionar"][data-no="${no}"]`, true); await sleep(150); await naJanela(`[data-action="mover"][data-no="${no}"]`); return esperarEstado(e => (e.corredores.find(c => c.token === ids.token) || {}).no === no); };
  const usar = async (habilidade, teste) => { await esperar(jogador, `!!document.querySelector('.net-janela [data-habilidade="${habilidade}"]:not([disabled])')`, 25); await naJanela(`[data-habilidade="${habilidade}"]`); return esperarEstado(teste); };
  const ultimas = (e, n = 4) => e.log.slice(-n).map(linha => linha.texto).join(' | ');
  let parou = '';
  const passo = async (nome, fn) => {
    if (parou) { await r.passo(nome, async () => [false, `não rodou: falhou antes "${parou}"`]); return; }
    await r.passo(nome, fn);
    if (!r.itens[r.itens.length - 1].ok) parou = nome;
  };

  try {
    await passo('mestre entra com o cpr-2077 e o NET Architect; o compêndio “Arquiteturas da NET” nasce com os 3 exemplos', async () => {
      await foundry.entrarComoMestre(edge, mesa.url);
      await foundry.ativarModulo(edge, ['cpr-2077', 'net-architect']);
      await edge.evaluate(`game.settings.set('cpr-2077', 'wikiUrl', ${JSON.stringify(wiki)})`);
      const exemplos = await esperar(edge, `(async () => { const p = game.packs.get('world.arquiteturas-net'); if (!p) return 0; const i = await p.getIndex(); return i.size; })()`);
      const info = await edge.evaluate(`({ ativo: !!game.modules.get('net-architect')?.active, api: typeof game.modules.get('net-architect')?.api?.conectar, dono: game.packs.get('world.arquiteturas-net')?.ownership })`);
      return [info.ativo && info.api === 'function' && exemplos >= 3, `${exemplos} arquiteturas · ${JSON.stringify(info)}`];
    });

    await passo('netrunner da wiki importado com Interface, cyberdeck equipado e programas no deck', async () => {
      const resumo = await edge.evaluate(`(async () => {
        const { actor } = await game.modules.get('cpr-2077').api.importarPersonagem(${JSON.stringify(personagem.id)}, '');
        const deck = actor.itemTypes.cyberdeck[0];
        if (deck && deck.system.equipped !== 'equipped') await deck.update({ 'system.equipped': 'equipped' });
        const role = actor.itemTypes.role.find(r => r.id === actor.system.roleInfo.activeNetRole) || actor.itemTypes.role.find(r => /interface/i.test(r.system.mainRoleAbility));
        return { id: actor.id, role: role && [role.name, role.system.rank, role.system.mainRoleAbility], ativo: actor.system.roleInfo.activeNetRole, equipado: deck && deck.system.equipped, programas: (deck?.system.installedPrograms || []).map(p => [p.id, p.name, p.system.class]) };
      })()`);
      ids.ator = resumo.id;
      ids.ataque = (resumo.programas.find(p => p[2] === 'antiprogramattacker') || [])[0] || '';
      return [resumo.role && resumo.role[1] >= 4 && resumo.equipado === 'equipped' && resumo.programas.length > 0, JSON.stringify(resumo)];
    });

    await passo('cena de teste: Tile configurado pela janela do mestre (Clínica de ripperdoc, alcance 6 m)', async () => {
      const criado = await edge.evaluate(`(async () => {
        for (const velha of game.scenes.filter(s => s.name === 'NET teste')) await velha.delete();
        let usuario = game.users.getName('Jogador NET');
        if (!usuario) usuario = await User.create({ name: 'Jogador NET', role: CONST.USER_ROLES.PLAYER });
        return { usuario: usuario.id };
      })()`);
      ids.usuario = criado.usuario;
      const cena = await edge.evaluate(`(async () => {
        const netrunner = game.actors.get(${JSON.stringify(ids.ator)});
        let curioso = game.actors.getName('Curioso sem deck');
        if (!curioso) curioso = await Actor.create({ name: 'Curioso sem deck', type: 'character' });
        for (const a of [netrunner, curioso]) await a.update({ ownership: { default: 0, ${JSON.stringify(ids.usuario)}: 3 } });
        await game.users.get(${JSON.stringify(ids.usuario)}).update({ character: netrunner.id });
        const scene = await Scene.create({ name: 'NET teste', width: 3000, height: 2000, padding: 0, grid: { size: 100, distance: 2, units: 'm' }, tokenVision: false, fog: { exploration: false } });
        const [tile] = await scene.createEmbeddedDocuments('Tile', [{ x: 1400, y: 800, width: 200, height: 200, texture: { src: 'icons/svg/terminal.svg' } }]);
        const [t1, t2] = await scene.createEmbeddedDocuments('Token', [
          { name: netrunner.name, actorId: netrunner.id, actorLink: true, x: 1100, y: 800, texture: { src: netrunner.img || 'icons/svg/mystery-man.svg' } },
          { name: curioso.name, actorId: curioso.id, actorLink: true, x: 1100, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } }
        ]);
        await scene.activate();
        await scene.view();
        return { cena: scene.id, tile: tile.id, token: t1.id, curioso: t2.id };
      })()`);
      Object.assign(ids, cena);
      // A janela de configuração, como o mestre usa: escolhe a arquitetura, dá nome e salva.
      await edge.evaluate(`game.modules.get('net-architect').api.configurar(game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}))`);
      const aberta = await esperar(edge, `!!document.querySelector('.net-config select[name="arquitetura"] option[value*="Compendium.world.arquiteturas-net"]')`);
      await edge.shot('config');
      await edge.evaluate(`(() => {
        const form = document.querySelector('.net-config');
        const opcao = [...form.querySelectorAll('select[name="arquitetura"] option')].find(o => /Clínica/.test(o.textContent));
        form.querySelector('select[name="arquitetura"]').value = opcao.value;
        form.querySelector('input[name="nome"]').value = 'Terminal da clínica';
        form.requestSubmit();
      })()`);
      const ponto = await esperar(edge, `game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}).getFlag('net-architect', 'pontoDeAcesso')`);
      return [aberta && ponto && ponto.nome === 'Terminal da clínica' && /arquiteturas-net/.test(ponto.arquitetura) && ponto.alcance === 6 && ponto.exigeDeck, JSON.stringify(ponto)];
    });

    await passo('jogador entra e vê o marcador NET; o token sem cyberdeck não conecta', async () => {
      await foundry.entrarComo(jogador, mesa.url, 'Jogador NET');
      await esperar(jogador, `canvas.ready && canvas.scene?.id === ${JSON.stringify(ids.cena)}`);
      await noJogador(`(() => { for (const app of Object.values(ui.windows)) app.close(); for (const app of foundry.applications.instances.values()) app.close(); })()`);
      await sleep(400);
      await noJogador(`(() => { window.__avisos = []; const w = ui.notifications.warn.bind(ui.notifications); ui.notifications.warn = (m, o) => { window.__avisos.push(String(m)); return w(m, o); }; })()`);
      const marcadores = await esperar(jogador, `(canvas.interface.children.find(c => c.name === 'net-architect-pontos') || { children: [] }).children.length`);
      await noJogador(`canvas.tokens.get(${JSON.stringify(ids.curioso)}).control({ releaseOthers: true })`);
      await clicarNoPonto();
      const aviso = await esperar(jogador, `window.__avisos.join(' | ')`, 20);
      const e = await estado(edge);
      return [marcadores === 1 && /cyberdeck/.test(aviso || '') && !(e && e.corredores.length), `marcadores ${marcadores} · aviso: ${aviso}`];
    });

    await passo('clique no ponto conecta: janela da NET só para o jogador e o mestre; o token fica marcado para todos', async () => {
      await noJogador(`canvas.tokens.get(${JSON.stringify(ids.token)}).control({ releaseOthers: true })`);
      await clicarNoPonto();
      const janela = await esperar(jogador, `!!document.querySelector('#net-architect-${ids.tile}-${ids.token}')`);
      const painel = await esperar(edge, `!!document.querySelector('#net-architect-${ids.tile}-mestre')`);
      const status = `(() => { const t = game.scenes.get(${JSON.stringify(ids.cena)}).tokens.get(${JSON.stringify(ids.token)}); return t.actor.statuses.has('net-architect-conectado') && !!t.getFlag('net-architect', 'conexao'); })()`;
      const marcadoJogador = await esperar(jogador, status);
      const marcadoMestre = await esperar(edge, status);
      const anel = await esperar(jogador, `canvas.tokens.get(${JSON.stringify(ids.token)}).children.some(c => c['net-architect'])`);
      const c = await corredor();
      await sleep(400);
      await jogador.shot('janela');
      await edge.shot('painel-mestre');
      return [janela && painel && marcadoJogador && marcadoMestre && anel && c && c.no === ENTRADA && c.max === 3, `janela ${janela} · painel ${painel} · status ${marcadoJogador}/${marcadoMestre} · anel ${anel} · ${JSON.stringify(c)}`];
    });

    // Dados fixos no cliente do mestre (quem rola): d10 = 6, d6 = 4.
    await edge.evaluate('CONFIG.Dice.randomUniform = () => 0.55');

    await passo('Pathfinder (4 + 6 = 10) revela a clínica inteira; a rolagem sai no chat com o cartão do sistema', async () => {
      const chatAntes = await edge.evaluate('game.messages.size');
      const e = await usar('pathfinder', est => est.vistos.length >= 8);
      const chat = await edge.evaluate(`game.messages.contents.slice(${chatAntes}).map(m => m.content.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 60))`);
      const mapa = await esperar(jogador, `document.querySelectorAll('.net-janela .net-no:not(.net-no-oculto)').length`);
      return [e.vistos.length === 8 && chat.length >= 1 && mapa === 9, `vistos ${e.vistos.join(',')} · nós na tela ${mapa} · chat: ${chat.join(' / ')}`];
    });

    await passo('Backdoor (10 contra DV 8) quebra a senha do andar 1; antes disso a descida estava travada', async () => {
      await ir('1a');
      const avisos = await noJogador('window.__avisos.length');
      await naJanela(`[data-action="selecionar"][data-no="2a"]`, true);
      await sleep(150);
      await naJanela(`[data-action="mover"][data-no="2a"]`);
      const travado = await esperar(jogador, `window.__avisos.slice(${avisos}).join(' ')`, 30);
      const e = await usar('backdoor', est => est.feitos.includes('1a.0'));
      return [/trava a descida/.test(travado || '') && e.feitos.includes('1a.0'), `${travado} · ${ultimas(e, 2)}`];
    });

    await passo('Wisp no andar 2: empata na velocidade, ataca na hora e tira 4 do HP; Zap tira 4 de REZ', async () => {
      const hp = () => edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).system.derivedStats.hp.value`);
      const antes = await hp();
      let e = await ir('2a');
      e = await esperarEstado(est => /Wisp/.test(ultimas(est, 6)) && /cérebro/.test(ultimas(est, 6)));
      const depois = await hp();
      e = await usar('zap', est => (est.ices.find(i => i.chave === '2a.0') || {}).rez === 11);
      return [antes - depois === 4 && (e.ices.find(i => i.chave === '2a.0') || {}).rez === 11, `HP ${antes} → ${depois} · ${ultimas(e, 5)}`];
    });

    await passo('programa de ataque: ativar e atacar derruba o Wisp (ou Zap até cair); a descida libera', async () => {
      let e;
      if (ids.ataque) {
        await esperar(jogador, `!!document.querySelector('.net-janela [data-programa="${ids.ataque}"][data-acao="ativar"]')`, 25);
        await naJanela(`[data-programa="${ids.ataque}"][data-acao="ativar"]`);
        await esperar(edge, `game.actors.get(${JSON.stringify(ids.ator)}).items.get(${JSON.stringify(ids.ataque)}).system.isRezzed`);
        await esperar(jogador, `!!document.querySelector('.net-janela [data-programa="${ids.ataque}"][data-acao="atacar"]')`, 25);
        await naJanela(`[data-programa="${ids.ataque}"][data-acao="atacar"]`);
        e = await esperarEstado(est => (est.ices.find(i => i.chave === '2a.0') || {}).rez === 0);
      }
      for (let i = 0; i < 4 && !(e && (e.ices.find(ice => ice.chave === '2a.0') || {}).rez === 0); i++) e = await usar('zap', est => (est.ices.find(ice => ice.chave === '2a.0') || {}).rez < 11 - i * 4);
      await jogador.shot('wisp');
      const desceu = await ir('3a');
      return [(e.ices.find(i => i.chave === '2a.0') || {}).rez === 0 && (desceu.corredores.find(c => c.token === ids.token) || {}).no === '3a', `${ids.ataque ? 'com programa' : 'só Zap'} · ${ultimas(e, 3)}`];
    });

    await passo('Eye-Dee no 3a mostra o arquivo; no ramo B, Control toma o nó e um comando vai para o registro', async () => {
      let e = await usar('eyedee', est => est.feitos.includes('3a.0'));
      const arquivo = /Prontuários/.test(ultimas(e, 2));
      await ir('2a');
      await ir('3b');
      e = await usar('control', est => est.feitos.includes('3b.0'));
      await esperar(jogador, `!!document.querySelector('.net-janela [data-texto="comando"]')`, 25);
      await noJogador(`(() => { const i = document.querySelector('.net-janela [data-texto="comando"]'); i.value = 'abrir as portas do centro cirúrgico'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await naJanela('[data-action="comandar"]');
      e = await esperarEstado(est => /comanda o nó/.test(ultimas(est, 2)));
      const detalhe = await noJogador(`(document.querySelector('.net-janela .net-detalhe') || {}).textContent || ''`);
      return [arquivo && e.feitos.includes('3b.0') && /portas do centro/.test(ultimas(e, 1)), `${ultimas(e, 3)} · detalhe: ${detalhe.replace(/\s+/g, ' ').slice(0, 80)}`];
    });

    await passo('senha DV 10 no 4b: Backdoor com 10 não passa (empate perde)', async () => {
      await ir('4b');
      const e = await usar('backdoor', est => /não passou a senha/.test(ultimas(est, 1)));
      const c = await corredor();
      return [!e.feitos.includes('4b.0') && c.acoes >= 5, `${ultimas(e, 1)} · ações usadas ${c.acoes}/${c.max} (fora de combate não trava)`];
    });

    await passo('desconectar: a janela fecha, o efeito sai do token e, sem ninguém, a arquitetura reinicia as defesas', async () => {
      await naJanela('[data-action="desconectar"]:not([data-inseguro])');
      const fechou = await esperar(jogador, `!document.querySelector('#net-architect-${ids.tile}-${ids.token}')`);
      const e = await esperarEstado(est => !est.corredores.length);
      const limpo = await esperar(edge, `(() => { const t = game.scenes.get(${JSON.stringify(ids.cena)}).tokens.get(${JSON.stringify(ids.token)}); return !t.actor.statuses.has('net-architect-conectado') && !t.getFlag('net-architect', 'conexao'); })()`);
      const anel = await esperar(jogador, `!canvas.tokens.get(${JSON.stringify(ids.token)}).children.some(c => c['net-architect'])`);
      return [fechou && limpo && anel && !e.ices.length && e.feitos.join() === '3a.0', `janela fechou ${fechou} · token limpo ${limpo} · anel sumiu ${anel} · feitos ${e.feitos} · ${ultimas(e, 2)}`];
    });

    await passo('sair do alcance com a conexão aberta derruba da NET (desconexão insegura)', async () => {
      await clicarNoPonto();
      await esperarEstado(est => est.corredores.length === 1);
      await edge.evaluate(`game.scenes.get(${JSON.stringify(ids.cena)}).tokens.get(${JSON.stringify(ids.token)}).update({ x: 300, y: 300 }, { animate: false })`);
      const e = await esperarEstado(est => !est.corredores.length);
      const fechou = await esperar(jogador, `!document.querySelector('#net-architect-${ids.tile}-${ids.token}')`);
      return [!e.corredores.length && /insegura/.test(ultimas(e, 3)) && fechou, ultimas(e, 3)];
    });

    await passo('jogador não enxerga o compêndio de arquiteturas (os segredos ficam com o mestre)', async () => {
      const visivel = await noJogador(`!!game.packs.get('world.arquiteturas-net')?.visible`);
      return [!visivel, `compêndio visível para o jogador: ${visivel}`];
    });
  } finally {
    for (const navegador of [edge, jogador]) { await navegador.send('Page.navigate', { url: 'about:blank' }).catch(() => {}); }
    await sleep(500);
    const doFoundry = edge.erros.splice(errosAntes);
    const doJogador = jogador.erros.splice(0);
    edge.erros.push(...[...doFoundry, ...doJogador].filter(erro => /net-architect/.test(erro)));
    await jogador.fechar();
    await mesa.parar();
  }
};
