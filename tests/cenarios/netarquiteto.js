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
  const { lerArquitetura, revelarPathfinder, vizinhos, ehFundo, ENTRADA, andaresDoItem, itemDosAndares } = await modulo('arquitetura.mjs');
  const { BLACK_ICE, DEMONIOS } = await modulo('constantes.mjs');
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

  await r.passo('demônios do módulo iguais aos da wiki (REZ, Interface, Ações NET, valor de combate)', async () => {
    const fonte = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
    const linhas = [...fonte.matchAll(/\['(Imp|Efreet|Balron)', '(\d+)', '(\d+)', '(\d+)', '(\d+)'\]/g)];
    const diferentes = linhas.filter(([, nome, rez, inter, acoes, combate]) => { const d = DEMONIOS[nome.toLowerCase()]; return !d || d.rez !== +rez || d.interface !== +inter || d.acoes !== +acoes || d.combate !== +combate; }).map(l => l[1]);
    return [linhas.length === 3 && !diferentes.length, `${linhas.length} na wiki · diferentes: ${diferentes.join(', ') || 'nenhum'}`];
  });
  await r.passo('editor: ida e volta do item do sistema sem perder nada; demônios e netrunners vão para as flags', async () => {
    const item = EXEMPLOS.find(i => /Clínica/.test(i.name));
    const volta = itemDosAndares(andaresDoItem(item));
    const chave = f => [f.floor, f.branch, f.content, f.dv, f.blackice, f.description].join('|');
    const igual = JSON.stringify(volta.floors.map(chave)) === JSON.stringify([...item.system.floors].sort((a, b) => a.floor - b.floor || a.branch.localeCompare(b.branch)).map(chave));
    const comDefensores = itemDosAndares([{ andar: 2, ramo: 'a', conteudos: [{ tipo: 'demonio', demonio: 'efreet' }, { tipo: 'senha', dv: 8 }] }, { andar: 3, ramo: 'b', conteudos: [{ tipo: 'netrunner', ator: 'Actor.x', nome: 'Rival' }] }]);
    const lido = lerArquitetura({ name: 'X', system: { floors: comDefensores.floors }, flags: { 'net-architect': { defensores: comDefensores.defensores } } });
    return [igual && comDefensores.floors.length === 1 && comDefensores.defensores.length === 2 && lido.nos['3b'].conteudos[0].tipo === 'netrunner' && lido.nos['2a'].conteudos.map(c => c.tipo).join() === 'senha,demonio',
      `ida e volta ${igual} · ${JSON.stringify(comDefensores.defensores.map(d => d.tipo))} · 2a ${lido.nos['2a'].conteudos.map(c => c.tipo)}`];
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
      const x = ponto.x + caixa.left;
      const y = ponto.y + caixa.top;
      const el = document.elementFromPoint(x, y);
      return { x, y, alvo: el ? \`\${el.tagName}#\${el.id}.\${String(el.className).slice(0, 40)}\` : 'nada', tela: [innerWidth, innerHeight] };
    })()`);
    await sleep(300);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await jogador.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    return p;
  };
  // Botão da janela da NET do jogador; nós do mapa (SVG) recebem o clique por evento.
  const naJanela = (seletor, svg = false) => noJogador(`(() => { const el = document.querySelector('.net-janela ${seletor}'); if (!el) return false; ${svg ? "el.dispatchEvent(new MouseEvent('click', { bubbles: true }))" : 'el.click()'}; return true; })()`);
  const corredor = async () => ((await estado(edge)) || { corredores: [] }).corredores.find(item => item.token === ids.token) || null;
  const esperarEstado = async (teste, vezes = 75) => { for (let i = 0; i < vezes; i++) { const e = await estado(edge); if (e && teste(e)) return e; await sleep(200); } return estado(edge); };
  // Escolhe o andar no mapa e clica em "Ir para cá" quando o botão aparecer (o redesenho é assíncrono).
  const pedirIda = async no => {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      await naJanela(`[data-action="selecionar"][data-no="${no}"]`, true);
      if (await esperar(jogador, `!!document.querySelector('.net-janela [data-action="mover"][data-no="${no}"]:not([disabled])')`, 20)) return naJanela(`[data-action="mover"][data-no="${no}"]`);
    }
    return false;
  };
  const ir = async no => { await pedirIda(no); return esperarEstado(e => (e.corredores.find(c => c.token === ids.token) || {}).no === no); };
  const usar = async (habilidade, teste) => { await esperar(jogador, `!!document.querySelector('.net-janela [data-habilidade="${habilidade}"]:not([disabled])')`); await naJanela(`[data-habilidade="${habilidade}"]`); return esperarEstado(teste); };
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
      ids.seeya = (resumo.programas.find(p => p[1] === 'See Ya') || [])[0] || '';
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
        // Sem imagem, como um Tile vazio que o mestre põe só para marcar o lugar.
        const [tile] = await scene.createEmbeddedDocuments('Tile', [{ x: 1400, y: 800, width: 200, height: 200 }]);
        const criados = await scene.createEmbeddedDocuments('Token', [
          { name: netrunner.name, actorId: netrunner.id, actorLink: true, x: 1100, y: 800, texture: { src: netrunner.img || 'icons/svg/mystery-man.svg' } },
          { name: curioso.name, actorId: curioso.id, actorLink: true, x: 1100, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } }
        ]);
        // A ordem da resposta não é a do pedido: cada token pelo ator.
        const t1 = criados.find(t => t.actorId === netrunner.id);
        const t2 = criados.find(t => t.actorId === curioso.id);
        const [porta] = await scene.createEmbeddedDocuments('Wall', [{ c: [1700, 700, 1700, 900], door: 1, ds: 0 }]);
        const [luz] = await scene.createEmbeddedDocuments('AmbientLight', [{ x: 1900, y: 800, config: { dim: 6, bright: 3 } }]);
        await scene.activate();
        await scene.view();
        return { cena: scene.id, tile: tile.id, token: t1.id, curioso: t2.id, porta: porta.id, luz: luz.id };
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
      const imagem = await esperar(edge, `game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}).texture.src`);
      // Segunda vez na configuração: liga o nó de controle do ramo B à porta e à luz da cena.
      await edge.evaluate(`game.modules.get('net-architect').api.configurar(game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}))`);
      const secao = await esperar(edge, `!!document.querySelector('.net-config [data-escolha="3b.0"]')`);
      for (const valor of [`porta:${ids.porta}`, `luz:${ids.luz}`]) {
        await edge.evaluate(`(() => { const s = document.querySelector('.net-config [data-escolha="3b.0"]'); s.value = ${JSON.stringify(valor)}; document.querySelector('.net-config [data-action="ligar"][data-controle="3b.0"]').click(); })()`);
        await esperar(edge, `document.querySelectorAll('.net-config .net-chips li button[data-action="desligar"]').length >= ${valor.startsWith('porta') ? 1 : 2}`);
      }
      await edge.shot('config-ligacoes');
      await edge.evaluate("document.querySelector('.net-config').requestSubmit()");
      const ligado = await esperar(edge, `(game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}).getFlag('net-architect', 'pontoDeAcesso').ligacoes || []).filter(l => l.controle === '3b.0').length === 2 && game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile)}).getFlag('net-architect', 'pontoDeAcesso')`);
      return [aberta && secao && ligado && /net-architect\/icones\/terminal\.svg$/.test(imagem || '') && ligado.nome === 'Terminal da clínica' && /arquiteturas-net/.test(ligado.arquitetura) && ligado.alcance === 6 && ligado.exigeDeck, `${JSON.stringify(ligado && ligado.ligacoes)} · alcance ${ligado && ligado.alcance} · imagem do Tile sem imagem: ${imagem}`];
    });

    await passo('jogador entra e vê o marcador NET; o token sem cyberdeck não conecta', async () => {
      await foundry.entrarComo(jogador, mesa.url, 'Jogador NET');
      await esperar(jogador, `canvas.ready && canvas.scene?.id === ${JSON.stringify(ids.cena)}`);
      await noJogador(`(() => { for (const app of Object.values(ui.windows)) app.close(); for (const app of foundry.applications.instances.values()) app.close(); })()`);
      await sleep(400);
      await noJogador(`(() => { window.__avisos = []; const w = ui.notifications.warn.bind(ui.notifications); ui.notifications.warn = (m, o) => { window.__avisos.push(String(m)); return w(m, o); }; })()`);
      const marcadores = await esperar(jogador, `(canvas.interface.children.find(c => c.name === 'net-architect-pontos') || { children: [] }).children.length`);
      const selecionados = await noJogador(`(() => { canvas.tokens.releaseAll(); canvas.tokens.get(${JSON.stringify(ids.curioso)}).control({ releaseOthers: true }); return canvas.tokens.controlled.map(t => t.name); })()`);
      const clique = await clicarNoPonto();
      const aviso = await esperar(jogador, `window.__avisos.join(' | ')`, 20);
      const e = await estado(edge);
      return [marcadores === 1 && selecionados.join() === 'Curioso sem deck' && /cyberdeck/.test(aviso || '') && !(e && e.corredores.length), `marcadores ${marcadores} · selecionados ${selecionados} · aviso: ${aviso} · clique ${JSON.stringify(clique)}`];
    });

    await passo('clique no ponto conecta: janela da NET só para o jogador e o mestre; o token fica marcado para todos', async () => {
      await noJogador(`(() => { canvas.tokens.releaseAll(); canvas.tokens.get(${JSON.stringify(ids.token)}).control({ releaseOthers: true }); })()`);
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

    // Dados fixos no cliente do mestre (quem rola). O Foundry 12 tira a face com ceil((1 − u) × faces): u = 0,45 dá d10 = 6 e d6 = 4.
    await edge.evaluate('CONFIG.Dice.randomUniform = () => 0.45');

    await passo('See Ya ativo soma +2: Pathfinder (4 + 6 + 2 = 12) revela a clínica inteira; o cartão do sistema vai para o chat', async () => {
      if (ids.seeya) {
        await esperar(jogador, `!!document.querySelector('.net-janela [data-programa="${ids.seeya}"][data-acao="ativar"]')`);
        await naJanela(`[data-programa="${ids.seeya}"][data-acao="ativar"]`);
        await esperar(edge, `game.actors.get(${JSON.stringify(ids.ator)}).items.get(${JSON.stringify(ids.seeya)}).system.isRezzed`);
      }
      const chatAntes = await edge.evaluate('game.messages.size');
      const e = await usar('pathfinder', est => est.vistos.length >= 8);
      const chat = await edge.evaluate(`game.messages.contents.slice(${chatAntes}).map(m => m.content.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 60))`);
      const mapa = await esperar(jogador, `document.querySelectorAll('.net-janela .net-no:not(.net-tipo-oculto)').length`);
      await jogador.shot('mapa-revelado');
      const total = ((ultimas(e, 1).match(/Pathfinder \((\d+)\)/) || [])[1]) | 0;
      return [e.vistos.length === 8 && chat.length >= 1 && mapa === 9 && total === (ids.seeya ? 12 : 10), `Pathfinder ${total} · vistos ${e.vistos.join(',')} · nós na tela ${mapa} · chat: ${chat.join(' / ')}`];
    });

    await passo('Backdoor (10 contra DV 8) quebra a senha do andar 1; antes disso a descida estava travada', async () => {
      await ir('1a');
      const avisos = await noJogador('window.__avisos.length');
      await pedirIda('2a');
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
      const combate = await edge.evaluate(`(() => { const c = game.combats.find(c => c.combatants.some(cb => cb.actor && cb.actor.type === 'blackIce')); if (!c) return null; const ice = c.combatants.find(cb => cb.actor && cb.actor.type === 'blackIce'); return { ice: ice.name, escondido: ice.token.hidden, iniciativa: ice.initiative, netrunner: c.combatants.some(cb => cb.tokenId === ${JSON.stringify(ids.token)}) }; })()`);
      const visto = await noJogador(`canvas.tokens.placeables.filter(t => t.document.getFlag('net-architect', 'chave')).map(t => t.visible).join()`);
      return [antes - depois === 4 && (e.ices.find(i => i.chave === '2a.0') || {}).rez === 11 && combate && combate.ice === 'Wisp' && combate.escondido && combate.netrunner && !/true/.test(visto),
        `HP ${antes} → ${depois} · combate ${JSON.stringify(combate)} · token do ICE visível para o jogador: ${visto || 'não'} · ${ultimas(e, 3)}`];
    });

    await passo('programa de ataque: ativar e atacar derruba o Wisp (ou Zap até cair); a descida libera', async () => {
      let e;
      if (ids.ataque) {
        await esperar(jogador, `!!document.querySelector('.net-janela [data-programa="${ids.ataque}"][data-acao="ativar"]')`);
        await naJanela(`[data-programa="${ids.ataque}"][data-acao="ativar"]`);
        await esperar(edge, `game.actors.get(${JSON.stringify(ids.ator)}).items.get(${JSON.stringify(ids.ataque)}).system.isRezzed`);
        await esperar(jogador, `!!document.querySelector('.net-janela [data-programa="${ids.ataque}"][data-acao="atacar"]')`);
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
      await esperar(jogador, `!!document.querySelector('.net-janela [data-texto="comando"]')`);
      const campo = await esperar(jogador, `!!document.querySelector('.net-janela [data-texto="comando"]')`);
      if (!campo) return [false, `o campo de comando do nó não apareceu · ${ultimas(e, 2)}`];
      await noJogador(`(() => { const i = document.querySelector('.net-janela [data-texto="comando"]'); i.value = 'abrir as portas do centro cirúrgico'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await naJanela('[data-action="comandar"]');
      e = await esperarEstado(est => /comanda o nó/.test(ultimas(est, 2)));
      const detalhe = await noJogador(`(document.querySelector('.net-janela .net-detalhe') || {}).textContent || ''`);
      return [arquivo && e.feitos.includes('3b.0') && /portas do centro/.test(ultimas(e, 1)), `${ultimas(e, 3)} · detalhe: ${detalhe.replace(/\s+/g, ' ').slice(0, 80)}`];
    });

    await passo('nó de controle ligado à cena: abrir a porta e desligar a luz pela janela', async () => {
      const botoes = await esperar(jogador, `document.querySelectorAll('.net-janela [data-action="acionar"]').length`);
      await naJanela('[data-action="acionar"][data-acao="abrir"]');
      const porta = await esperar(edge, `game.scenes.get(${JSON.stringify(ids.cena)}).walls.get(${JSON.stringify(ids.porta)}).ds === 1`);
      await esperar(jogador, `!!document.querySelector('.net-janela [data-action="acionar"][data-acao="desligar"]:not([disabled])')`);
      await naJanela('[data-action="acionar"][data-acao="desligar"]');
      const luz = await esperar(edge, `game.scenes.get(${JSON.stringify(ids.cena)}).lights.get(${JSON.stringify(ids.luz)}).hidden`);
      const e = await esperarEstado(est => /Luz 1.*desligada/.test(ultimas(est, 1)));
      await jogador.shot('no-de-controle');
      return [botoes >= 2 && porta && luz, `botões ${botoes} · porta aberta ${porta} · luz desligada ${luz} · ${ultimas(e, 2)}`];
    });

    await passo('o arquivo do Eye-Dee vira um diário que o jogador abre pela janela', async () => {
      const diario = await edge.evaluate(`(() => { const j = game.journal.find(j => j.getFlag('net-architect', 'arquivo') === '3a.0'); return j ? { nome: j.name, dono: j.ownership[${JSON.stringify(ids.usuario)}], texto: j.pages.contents[0].text.content } : null; })()`);
      await naJanela('[data-action="selecionar"][data-no="3a"]', true);
      const botao = await esperar(jogador, `!!document.querySelector('.net-janela [data-action="abrirArquivo"]')`);
      if (botao) await naJanela('[data-action="abrirArquivo"]');
      const aberto = await esperar(jogador, `Object.values(ui.windows).some(w => w.document && /^Arquivo/.test(w.document.name)) || [...foundry.applications.instances.values()].some(w => w.document && /^Arquivo/.test(w.document.name))`);
      await jogador.shot('arquivo');
      await noJogador(`(() => { for (const w of Object.values(ui.windows)) if (w.document && /^Arquivo/.test(w.document.name)) w.close(); })()`);
      return [diario && diario.dono === 2 && /Prontuários/.test(diario.texto) && botao && aberto, `${JSON.stringify(diario && { nome: diario.nome, dono: diario.dono })} · botão ${botao} · abriu ${aberto}`];
    });

    await passo('senha DV 10 no 4b: Backdoor com 10 não passa (empate perde)', async () => {
      await ir('4b');
      const e = await usar('backdoor', est => /não passou a senha/.test(ultimas(est, 1)));
      const c = await corredor();
      const livres = await noJogador(`/livres/.test((document.querySelector('.net-janela .net-numeros') || {}).textContent || '')`);
      return [!e.feitos.includes('4b.0') && c.acoes === 0 && livres, `${ultimas(e, 1)} · fora de combate as ações não contam (${c.acoes}); a barra diz "livres": ${livres}`];
    });

    await passo('em combate: 3 Ações NET por turno; a quarta é recusada e o turno seguinte devolve', async () => {
      const idCombate = await edge.evaluate(`(async () => {
        for (const velho of game.combats.filter(c => c.scene && c.scene.id === ${JSON.stringify(ids.cena)})) await velho.delete();
        const combate = await Combat.create({ scene: ${JSON.stringify(ids.cena)}, active: true });
        await combate.createEmbeddedDocuments('Combatant', [{ tokenId: ${JSON.stringify(ids.token)}, sceneId: ${JSON.stringify(ids.cena)}, actorId: ${JSON.stringify(ids.ator)} }]);
        await combate.startCombat();
        return combate.id;
      })()`);
      await sleep(600);
      for (let i = 1; i <= 3; i++) await usar('cloak', est => (est.corredores.find(c => c.token === ids.token) || {}).acoes === i);
      const pips = await noJogador(`document.querySelectorAll('.net-janela .net-pip.net-pip-usado').length`);
      const avisos = await noJogador('window.__avisos.length');
      await naJanela('[data-habilidade="cloak"]');
      const recusa = await esperar(jogador, `window.__avisos.slice(${avisos}).join(' ')`, 30);
      await edge.evaluate(`game.combats.get('${idCombate}').nextRound()`);
      const e = await esperarEstado(est => (est.corredores.find(c => c.token === ids.token) || {}).acoes === 0);
      const devolvidas = (e.corredores.find(c => c.token === ids.token) || {}).acoes === 0;
      await edge.evaluate(`game.combats.get('${idCombate}').delete()`);
      await sleep(300);
      return [pips === 3 && /Sem Ações NET/.test(recusa || '') && devolvidas, `bolinhas usadas ${pips} · quarta: ${recusa} · nova rodada devolveu: ${devolvidas}`];
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
    // ================= Parte avançada: editor, Scanner, combate, demônio, netrunner inimigo, efeitos =================
    await passo('editor visual: cria andares, troca os tipos, arrasta um andar e salva (Hellhound, Imp, netrunner inimigo, Liche, Killer)', async () => {
      const preparo = await edge.evaluate(`(async () => {
        const base = game.actors.get(${JSON.stringify(ids.ator)});
        const rival = await base.clone({ name: 'Netrunner da Arasaka', ownership: { default: 0 } }, { save: true });
        const pack = game.packs.get('world.arquiteturas-net');
        const item = await Item.create({ name: 'Teste avançado', type: 'netarch' }, { pack: pack.collection });
        game.modules.get('net-architect').api.editor(item);
        return { rival: rival.id, rivalUuid: rival.uuid, item: item.uuid };
      })()`);
      Object.assign(ids, preparo);
      const ed = seletor => `document.querySelector('.net-editor ${seletor}')`;
      const mudar = (campo, valor, i = 0) => edge.evaluate(`(() => { const s = ${ed(`[data-conteudo="${i}"][data-campo="${campo}"]`)}; s.value = ${JSON.stringify(valor)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      const criar = async (pos, tipo) => {
        await esperar(edge, `!!${ed(`[data-action="novo"][data-pos="${pos}"]`)}`);
        await edge.evaluate(`${ed(`[data-action="novo"][data-pos="${pos}"]`)}.click()`);
        await esperar(edge, `!!${ed(`.net-ed-no[data-pos="${pos}"].net-ed-sel`)}`);
        await mudar('tipo', tipo);
        await esperar(edge, `${ed('[data-conteudo="0"][data-campo="tipo"]')}.value === ${JSON.stringify(tipo)}`);
      };
      await criar('1a', 'ice');
      await criar('2a', 'demonio');
      await criar('2b', 'netrunner');
      await mudar('ator', ids.rivalUuid);
      await esperar(edge, `!!${ed('[data-conteudo="0"][data-campo="nome"]')}`);
      await edge.evaluate(`(() => { const i = ${ed('[data-conteudo="0"][data-campo="nome"]')}; i.value = 'Netrunner da Arasaka'; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await criar('3b', 'ice');
      await mudar('ice', 'liche');
      // Arrasta o Liche do 3B para o 3A (eventos de arrastar de verdade, com DataTransfer).
      await edge.evaluate(`(() => {
        const de = ${ed('.net-ed-no[data-pos="3b"]')};
        const para = ${ed('[data-alvo="3a"]')};
        const dt = new DataTransfer();
        de.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
        para.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
        para.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      })()`);
      const moveu = await esperar(edge, `!!${ed('.net-ed-no[data-pos="3a"]')} && !${ed('.net-ed-no[data-pos="3b"]')}`);
      await criar('4a', 'ice');
      await mudar('ice', 'killer');
      await edge.shot('editor');
      await edge.evaluate(`${ed('[data-action="salvar"]')}.click()`);
      const salvo = await esperar(edge, `(async () => { const i = await fromUuid(${JSON.stringify(ids.item)}); const d = i.getFlag('net-architect', 'defensores') || []; return i.system.floors.length === 3 && d.length === 2 ? { andares: i.system.floors.map(f => f.floor + f.branch + ':' + f.blackice.split('.').pop()), defensores: d.map(x => x.andar + x.ramo + ':' + x.tipo) } : null; })()`);
      await edge.evaluate(`(() => { const e = foundry.applications.instances.get('net-architect-editor-' + ${JSON.stringify(ids.item.split('.').pop())}); if (e) e.close(); })()`);
      return [moveu && salvo && salvo.andares.join() === '1a:hellhound,3a:liche,4a:killer' && salvo.defensores.join() === '2a:demonio,2b:netrunner', JSON.stringify(salvo)];
    });

    await passo('Scanner no HUD do token acha o ponto oculto; o marcador aparece só para quem achou', async () => {
      const criado = await edge.evaluate(`(async () => {
        const scene = game.scenes.get(${JSON.stringify(ids.cena)});
        const novos = await scene.createEmbeddedDocuments('Tile', [
          { x: 500, y: 250, width: 200, height: 200, texture: { src: 'icons/svg/net.svg' } },
          { x: 300, y: 700, width: 100, height: 100, texture: { src: 'icons/svg/net.svg' } }
        ]);
        // A ordem da resposta não é a do pedido: cada Tile pela posição.
        const t2 = novos.find(t => t.x === 500);
        const t3 = novos.find(t => t.x === 300);
        const base = { ativo: true, alcance: 6, exigeDeck: true, rankMinimo: 1, reiniciar: true, ligacoes: [], revelados: [], dvScanner: 8 };
        await t2.setFlag('net-architect', 'pontoDeAcesso', { ...base, nome: 'Servidor avançado', arquitetura: ${JSON.stringify(ids.item)}, oculto: false });
        await t3.setFlag('net-architect', 'pontoDeAcesso', { ...base, nome: 'Terminal escondido', arquitetura: ${JSON.stringify(ids.item)}, oculto: true });
        return { tile2: t2.id, tile3: t3.id };
      })()`);
      Object.assign(ids, criado);
      const contar = () => esperar(jogador, `(canvas.interface.children.find(c => c.name === 'net-architect-pontos') || { children: [] }).children.length`);
      await sleep(600);
      const antes = await contar();
      await noJogador(`(() => { const t = canvas.tokens.get(${JSON.stringify(ids.token)}); canvas.tokens.releaseAll(); t.control({ releaseOthers: true }); canvas.tokens.hud.bind(t); })()`);
      const botao = await esperar(jogador, `!!document.querySelector('#token-hud .net-architect-hud[title^="Scanner"]')`);
      if (botao) await noJogador(`document.querySelector('#token-hud .net-architect-hud[title^="Scanner"]').click()`);
      const revelado = await esperar(edge, `(game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile3)}).getFlag('net-architect', 'pontoDeAcesso').revelados || []).includes(${JSON.stringify(ids.usuario)})`);
      await sleep(500);
      const depois = await contar();
      await noJogador('canvas.tokens.hud.clear()');
      return [botao && revelado && depois === antes + 1, `marcadores ${antes} → ${depois} · botão ${botao} · revelado ${revelado}`];
    });

    // Daqui em diante, o ponto de acesso é o "Servidor avançado".
    await passo('Hellhound no andar 1: ganha na velocidade, 2d6 no cérebro e põe fogo; a janela mostra o aviso', async () => {
      ids.tileClinica = ids.tile;
      ids.tile = ids.tile2;
      // O token ao lado do segundo ponto (a 1 m dele).
      await edge.evaluate(`game.scenes.get(${JSON.stringify(ids.cena)}).tokens.get(${JSON.stringify(ids.token)}).update({ x: 400, y: 300 }, { animate: false })`);
      await sleep(500);
      await noJogador(`(() => { canvas.tokens.releaseAll(); canvas.tokens.get(${JSON.stringify(ids.token)}).control({ releaseOthers: true }); })()`);
      const avisosAntes = await noJogador('window.__avisos.length');
      const clique = await clicarNoPonto();
      const conectado = await esperarEstado(est => est.corredores.length === 1);
      if (!conectado) return [false, `não conectou ao segundo ponto · avisos: ${await noJogador(`window.__avisos.slice(${avisosAntes}).join(' | ')`)} · clique ${JSON.stringify(clique)}`];
      await esperar(jogador, `!!document.querySelector('#net-architect-${ids.tile2}-${ids.token}')`);
      const hp = () => edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).system.derivedStats.hp.value`);
      const antes = await hp();
      const e = await ir('1a');
      await esperarEstado(est => /cérebro/.test(ultimas(est, 4)));
      const depois = await hp();
      const fogo = await esperar(edge, `game.actors.get(${JSON.stringify(ids.ator)}).statuses.has('net-architect-fogo')`);
      const aviso = await esperar(jogador, `!!document.querySelector('.net-janela .net-aviso-fogo [data-action="apagarFogo"]')`);
      await jogador.shot('hellhound');
      return [antes - depois === 8 && fogo && aviso, `HP ${antes} → ${depois} · fogo ${fogo} · aviso ${aviso} · ${ultimas(await estado(edge), 4)}`];
    });

    await passo('combate: o Hellhound está no topo; na vez dele o mestre escolhe o alvo; o fogo queima no fim do turno do netrunner', async () => {
      const hp = () => edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).system.derivedStats.hp.value`);
      const info = await edge.evaluate(`(async () => {
        const c = game.combats.find(c => c.combatants.some(cb => cb.actor && cb.actor.type === 'blackIce' && cb.name === 'Hellhound'));
        const ordem = c.turns.map(t => t.name);
        await c.startCombat();
        return { id: c.id, ordem };
      })()`);
      ids.combateHellhound = info.id;
      const dialogo = await esperar(edge, `!!document.querySelector('.application.dialog [data-action="${ids.token}"]')`);
      const antes = await hp();
      if (dialogo) await edge.evaluate(`document.querySelector('.application.dialog [data-action="${ids.token}"]').click()`);
      await esperarEstado(est => /acertou Teste NET/.test(ultimas(est, 5)));
      const depoisAtaque = await hp();
      await edge.evaluate(`game.combats.get('${info.id}').nextTurn()`);
      await sleep(800);
      await edge.evaluate(`game.combats.get('${info.id}').nextTurn()`);
      const dialogo2 = await esperar(edge, `!!document.querySelector('.application.dialog [data-action="pular"]')`);
      const depoisFogo = await hp();
      if (dialogo2) await edge.evaluate(`document.querySelector('.application.dialog [data-action="pular"]').click()`);
      return [info.ordem[0] === 'Hellhound' && dialogo && antes - depoisAtaque === 8 && depoisAtaque - depoisFogo === 2 && dialogo2,
        `ordem ${info.ordem} · ataque ${antes} → ${depoisAtaque} · fogo no fim do turno ${depoisAtaque} → ${depoisFogo}`];
    });

    await passo('apagar o fogo (Ação Carnal) pela janela; o mestre zera o Hellhound e o combatente fica derrotado', async () => {
      await esperar(jogador, `!!document.querySelector('.net-janela [data-action="apagarFogo"]:not([disabled])')`);
      await naJanela('[data-action="apagarFogo"]');
      const apagou = await esperar(edge, `!game.actors.get(${JSON.stringify(ids.ator)}).statuses.has('net-architect-fogo')`);
      await edge.evaluate(`game.modules.get('net-architect').api.pedir('ajustarIce', { tile: game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile2)}).uuid, alvo: '1a.0', delta: -99 })`);
      const derrotado = await esperar(edge, `game.combats.some(c => c.combatants.some(cb => cb.name === 'Hellhound' && cb.defeated))`);
      return [apagou && derrotado, `fogo apagado ${apagou} · Hellhound derrotado no combate ${derrotado}`];
    });

    await passo('demônio Imp no 2a: sem disputa de velocidade; Zap tira 4 de REZ; Slide fica desligado; o Zap do mestre erra', async () => {
      // HP cheio: abaixo da metade o sistema dá −2 em tudo (Seriamente Ferido), e as contas abaixo contam sem isso.
      await edge.evaluate(`(() => { const a = game.actors.get(${JSON.stringify(ids.ator)}); return a.update({ 'system.derivedStats.hp.value': a.system.derivedStats.hp.max }); })()`);
      // Sem combate em andamento daqui para a frente (em combate, as Ações NET contam e acabariam).
      await edge.evaluate(`game.combats.get('${ids.combateHellhound}').delete()`);
      let e = await ir('2a');
      const detectou = /detectou Teste NET/.test(ultimas(e, 3));
      e = await usar('zap', est => (est.ices.find(i => i.chave === 'def:2a-1') || {}).rez === 11);
      const slide = await noJogador(`document.querySelector('.net-janela [data-habilidade="slide"]').disabled`);
      await edge.evaluate(`game.modules.get('net-architect').api.pedir('inimigoAtaca', { tile: game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile2)}).uuid, token: ${JSON.stringify(ids.token)}, alvo: 'def:2a-1' })`);
      e = await esperarEstado(est => /se defendeu do Imp/.test(ultimas(est, 2)));
      return [detectou && (e.ices.find(i => i.chave === 'def:2a-1') || {}).rez === 11 && slide && /se defendeu do Imp/.test(ultimas(e, 2)), `detectou ${detectou} · Slide desligado ${slide} · ${ultimas(e, 3)}`];
    });

    await passo('netrunner inimigo no 2b: Zap com 1 de Sorte (11 contra 10) tira 4 do HP dele e a Sorte sai da ficha', async () => {
      await ir('1a');
      await ir('2b');
      const hpRival = () => edge.evaluate(`game.actors.get(${JSON.stringify(ids.rival)}).system.derivedStats.hp.value`);
      const sorte = () => edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).system.stats.luck.value`);
      const [hpAntes, sorteAntes] = [await hpRival(), await sorte()];
      await noJogador(`(() => { const i = document.querySelector('.net-janela [data-campo="sorte"]'); i.value = '1'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      const e = await usar('zap', est => /Zap (acertou|errou) o Netrunner da Arasaka/.test(ultimas(est, 1)));
      const [hpDepois, sorteDepois] = [await hpRival(), await sorte()];
      return [hpAntes - hpDepois === 4 && sorteAntes - sorteDepois === 1 && /acertou/.test(ultimas(e, 1)), `HP do rival ${hpAntes} → ${hpDepois} · Sorte ${sorteAntes} → ${sorteDepois} · ${ultimas(e, 1)}`];
    });

    await passo('Liche no 3a: o mestre ataca e a ficha ganha −4 em INT, REF e DEX por 1 hora (efeito ativo)', async () => {
      const tile = `game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile2)}).uuid`;
      await edge.evaluate(`game.modules.get('net-architect').api.pedir('ajustarIce', { tile: ${tile}, alvo: 'def:2a-1', delta: -99 })`);
      await ir('1a');
      await ir('2a');
      await ir('3a');
      const stats = () => edge.evaluate(`(() => { const s = game.actors.get(${JSON.stringify(ids.ator)}).system.stats; return [s.int.value, s.ref.value, s.dex.value]; })()`);
      const antes = await stats();
      await edge.evaluate(`game.modules.get('net-architect').api.pedir('inimigoAtaca', { tile: ${tile}, token: ${JSON.stringify(ids.token)}, alvo: '3a.0' })`);
      await esperarEstado(est => /por 1 hora/.test(ultimas(est, 2)));
      const depois = await stats();
      const efeito = await edge.evaluate(`(() => { const e = game.actors.get(${JSON.stringify(ids.ator)}).effects.find(e => e.getFlag('net-architect', 'efeito') === 'liche'); return e ? { nome: e.name, segundos: e.duration.seconds } : null; })()`);
      return [antes.every((v, i) => v - depois[i] === 4) && efeito && efeito.segundos === 3600, `INT/REF/DEX ${antes} → ${depois} · ${JSON.stringify(efeito)}`];
    });

    await passo('Killer no 4a: vence na velocidade e destrói um programa ativo (sai do deck com "(destruído)")', async () => {
      const tile = `game.scenes.get(${JSON.stringify(ids.cena)}).tiles.get(${JSON.stringify(ids.tile2)}).uuid`;
      await edge.evaluate(`game.modules.get('net-architect').api.pedir('ajustarIce', { tile: ${tile}, alvo: '3a.0', delta: -99 })`);
      const ativos = await edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).itemTypes.program.filter(p => p.system.isRezzed).map(p => p.name)`);
      const e = await ir('4a');
      await esperarEstado(est => /destruído|não achou programa/.test(ultimas(est, 3)));
      const destruidos = await edge.evaluate(`game.actors.get(${JSON.stringify(ids.ator)}).itemTypes.program.filter(p => p.getFlag('net-architect', 'destruido')).map(p => p.name)`);
      const noDeck = await edge.evaluate(`(() => { const deck = game.actors.get(${JSON.stringify(ids.ator)}).itemTypes.cyberdeck[0]; return deck.system.installedPrograms.map(p => p.name); })()`);
      return [ativos.length > 0 && destruidos.length === 1 && !noDeck.some(nome => /destruído/.test(nome)), `ativos antes ${ativos} · destruídos ${destruidos} · no deck ${noDeck} · ${ultimas(await estado(edge), 2)}`];
    });

    await passo('desconectar: os tokens dos inimigos saem da cena e do combate', async () => {
      await naJanela('[data-action="desconectar"]:not([data-inseguro])');
      await esperarEstado(est => !est.corredores.length);
      const sobrou = await esperar(edge, `game.scenes.get(${JSON.stringify(ids.cena)}).tokens.filter(t => t.getFlag('net-architect', 'chave')).length === 0`);
      return [sobrou, `tokens de inimigos na cena: ${await edge.evaluate(`game.scenes.get(${JSON.stringify(ids.cena)}).tokens.filter(t => t.getFlag('net-architect', 'chave')).map(t => t.name).join(', ') || 'nenhum'`)}`];
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
