// Fluxo de Combate (foundry-fluxo-de-combate/): as regras do módulo (no Node, conferidas com a wiki) e, no Foundry de
// teste, o mestre e um jogador de verdade em dois navegadores. O cpr-2077 oferece ligar o módulo; o NPC atira e o
// jogador esquiva às cegas (empate dele), aguenta contra a DV, usa o escudo e não responde; o jogador dá um tiro mirado
// na cabeça com crítico (o mestre escolhe a defesa do NPC vendo o total) e rola o dano; o mestre desfaz; corpo a corpo,
// autofogo, granada na área, cartucho, fogo supressivo e Death Save; o Diwako fica calado; o Evasion Workflow é
// desligado pelo aviso. Os dados ficam fixos: u = 0,45 dá d10 = 6 e d6 = 4; u = 0,001 dá d10 = 10 e d6 = 6.
// A parte do Foundry só roda com a mesa do servidor vazia (a licença vale para uma mesa por vez).
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const foundry = require('../lib/foundry');
const { abrirEdge, sleep } = require('../lib/edge');

const MODULO = 'fluxo-de-combate';

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  const R = await import(pathToFileURL(path.join(raiz, 'foundry-fluxo-de-combate', 'scripts', 'regras.mjs')).href);

  // ---------- Sem Foundry ----------
  await r.passo('regras: o modo do ataque pela rolagem, pela arma e pela munição', async () => {
    const casos = [
      [{ rolagem: 'attack', aDistancia: false, tipoDeArma: 'lightMelee' }, 'corpo'],
      [{ rolagem: 'aimed', aDistancia: false, tipoDeArma: 'martialArts' }, 'corpo'],
      [{ rolagem: 'aimed', aDistancia: true, tipoDeArma: 'heavyPistol', municao: 'heavyPistol' }, 'tiro'],
      [{ rolagem: 'autofire', aDistancia: true, tipoDeArma: 'smg', municao: 'medPistol' }, 'autofogo'],
      [{ rolagem: 'suppressive', aDistancia: true, tipoDeArma: 'assaultRifle', municao: 'rifle' }, 'supressivo'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'shotgun', municao: 'shotgunShell' }, 'cartucho'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'shotgun', municao: 'shotgunSlug' }, 'tiro'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'grenadeLauncher', municao: 'grenade' }, 'explosivo'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'thrownWeapon', municao: 'grenade' }, 'explosivo'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'rocketLauncher' }, 'explosivo'],
      [{ rolagem: 'attack', aDistancia: true, tipoDeArma: 'bow', municao: 'arrow' }, 'tiro']
    ];
    const errados = casos.filter(([dados, esperado]) => R.classificar(dados) !== esperado).map(([dados, esperado]) => `${JSON.stringify(dados)} → ${R.classificar(dados)} (esperado ${esperado})`);
    return [!errados.length, errados.join(' · ') || `${casos.length} casos certos`];
  });

  await r.passo('regras: quem pode esquivar, as escolhas, o empate do defensor, autofogo e DV pela distância', async () => {
    const op = (modo, ref, extra = {}) => R.opcoesDeDefesa({ modo, esquiva: R.podeEsquivar({ modo, ref, semPerna: extra.semPerna }), escudo: extra.escudo }).join();
    const pistola = [[[0, 6], '13'], [[7, 12], '15'], [[13, 25], '20'], [[26, 50], '25'], [[51, 100], '30'], [[101, 200], '30'], [[201, 400], 'N/A']];
    const checagens = {
      'tiro REF 7': [op('tiro', 7), 'aguentar'],
      'tiro REF 8': [op('tiro', 8), 'esquivar,aguentar'],
      'tiro REF 8 com escudo': [op('tiro', 8, { escudo: true }), 'esquivar,aguentar,escudo'],
      'corpo a corpo REF 2': [op('corpo', 2), 'esquivar'],
      'corpo a corpo sem perna': [op('corpo', 9, { semPerna: true }), 'aguentar'],
      'supressivo': [op('supressivo', 9), 'concentrar'],
      'esquiva empatada': [R.acertou({ modo: 'tiro', escolha: 'esquivar', ataque: 20, defesa: 20 }), false],
      'DV empatada': [R.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 15, dv: 15 }), false],
      'DV passada': [R.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 16, dv: 15 }), true],
      'sem DV': [R.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 16, dv: null }), null],
      'explosivo, esquiva empatada fica': [R.acertou({ modo: 'explosivo', escolha: 'esquivar', ataque: 18, defesa: 18 }), true],
      'explosivo, esquiva maior sai': [R.acertou({ modo: 'explosivo', escolha: 'esquivar', ataque: 18, defesa: 19 }), false],
      'corpo a corpo sem esquiva pega': [R.acertou({ modo: 'corpo', escolha: 'aguentar', ataque: 3 }), true],
      'Concentração perdida': [R.acertou({ modo: 'supressivo', escolha: 'concentrar', ataque: 22, defesa: 14 }), true],
      'Concentração empatada': [R.acertou({ modo: 'supressivo', escolha: 'concentrar', ataque: 14, defesa: 14 }), false],
      'autofogo 22 contra 17': [R.multiplicadorDeAutofogo(22, 17), 5],
      'autofogo 18 contra 17': [R.multiplicadorDeAutofogo(18, 17), 1],
      'DV a 12 m': [R.dvPelaDistancia(pistola, 12).dv, 15],
      'DV a 6 m': [R.dvPelaDistancia(pistola, 6).dv, 13],
      'fora do alcance': [R.dvPelaDistancia(pistola, 300).fora, true],
      'tabela do autofogo': [R.tabelasCandidatas('DV SMG', 'autofogo')[0], 'DV SMG (Autofire)'],
      'padrão com escolha': [R.escolhaPadrao(['esquivar', 'aguentar']), 'aguentar'],
      'NPC no automático, esquiva fraca': [R.escolhaAutomatica({ opcoes: ['esquivar', 'aguentar'], modo: 'tiro', dv: 20, mediaEsquiva: 15.5 }), 'aguentar'],
      'NPC no automático, na área': [R.escolhaAutomatica({ opcoes: ['esquivar', 'aguentar'], modo: 'explosivo', dv: 20, mediaEsquiva: 9 }), 'esquivar']
    };
    const errados = Object.entries(checagens).filter(([, [obtido, esperado]]) => obtido !== esperado).map(([nome, [obtido, esperado]]) => `${nome}: ${obtido} (esperado ${esperado})`);
    return [!errados.length, errados.join(' · ') || `${Object.keys(checagens).length} checagens certas`];
  });

  await r.passo('regras do módulo iguais às da wiki: REF 8, empate, DV 13 e 6 m do cartucho, 25 m da supressão, 10 × 10 m do explosivo', async () => {
    const wiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
    const trechos = {
      'REF 8': /Alvo com <b>REF 8 ou mais<\/b> pode, em vez disso, se esquivar/,
      'empate': /Empate: defensor vence/,
      'DV do cartucho': new RegExp(`contra <b>DV${R.DV_CARTUCHO}</b>`),
      'alcance do cartucho': new RegExp(`até ${R.ALCANCE_CARTUCHO} m e à vista, sofre 3d6`),
      'raio da supressão': new RegExp(`até ${R.RAIO_SUPRESSAO} m, fora de cobertura`),
      'área do explosivo': new RegExp(`<b>${R.AREA_EXPLOSIVO} × ${R.AREA_EXPLOSIVO} m</b>`),
      'esquiva do explosivo': /rolando mais que o teste do atacante/,
      'autofogo': /2d6 × quanto passou da DV/,
      'lesão crítica': /dois ou mais dados de dano<\/b> de um ataque corpo a corpo ou à distância caem 6/,
      'cabeça só no tiro mirado': /Tabela da cabeça só em tiro mirado na cabeça/,
      'mortalmente ferido': /Mortalmente ferido sofre uma lesão crítica a cada ataque que o atinge/
    };
    const faltam = Object.entries(trechos).filter(([, padrao]) => !padrao.test(wiki)).map(([nome]) => nome);
    return [!faltam.length, faltam.length ? `a wiki não diz mais: ${faltam.join(', ')}` : `${Object.keys(trechos).length} regras conferidas`];
  });

  // ---------- Foundry de verdade ----------
  if (!foundry.disponivel()) { await r.passo('Foundry não instalado neste PC: parte do Foundry pulada', async () => [true, '']); return; }
  const ocupada = await foundry.mesaOcupada(raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): parte do Foundry pulada`, async () => [true, '']); return; }

  // Personagem do jogador feito na wiki (Tech: sem bônus de combate que mudem as contas).
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Teste Fluxo', role: 'tech', metodo: 'ratoderua', sorteio: { linha: 6 }, lingua: 'Portuguese', casa: 'Heywood', lifepath });
  await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
  await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
  for (let i = 0; i < 30 && !/Salvo/.test(await edge.evaluate(`(document.querySelector('#cc-save') || {}).textContent || ''`)); i++) await sleep(200);

  foundry.limparMundo();
  foundry.preparar();
  const extras = Object.fromEntries(['lib-wrapper', 'diwako-cpred-additions', 'socketlib', 'cpred-evasion-workflow'].map(id => [id, fs.existsSync(path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste', 'foundry', 'Data', 'modules', id, 'module.json'))]));
  const comDiwako = extras['lib-wrapper'] && extras['diwako-cpred-additions'];
  const comEvasion = extras.socketlib && extras['cpred-evasion-workflow'];
  const mesa = await foundry.subir();
  const saida = path.join(__dirname, '..', '.saida');
  const jogador = await abrirEdge({ porta: 9397, saida, prefixo: 'fluxo-jogador-', largura: 1400, altura: 900 });
  const errosAntes = edge.erros.length;
  const ids = {};
  const esperar = async (alvo, expressao, vezes = 60) => {
    for (let i = 0; i < vezes; i++) {
      const valor = await alvo.evaluate(expressao).catch(() => null);
      if (valor) return valor;
      await sleep(200);
    }
    return null;
  };
  const noJogador = expressao => jogador.evaluate(expressao);
  const dados = async u => { await edge.evaluate(`CONFIG.Dice.randomUniform = () => ${u}`); await noJogador(`CONFIG.Dice.randomUniform = () => ${u}`).catch(() => {}); };
  // O ataque pela rolagem do sistema, como a ficha e os HUDs fazem (createRoll → confirmRoll → roll → RenderRollCard).
  const ATACAR = `window.__atacar = async ({ token, item, tipo = 'attack', alvos = [], local = null }) => {
    const { default: CPRChat } = await import(foundry.utils.getRoute('systems/cyberpunk-red-core/modules/chat/cpr-chat.js'));
    const t = canvas.tokens.get(token);
    const actor = t.actor;
    const arma = actor.items.get(item);
    game.user.updateTokenTargets(alvos);
    let cprRoll = arma.createRoll(tipo, actor);
    if (local) cprRoll.location = local;
    cprRoll = await arma.confirmRoll(cprRoll);
    await cprRoll.roll();
    cprRoll.entityData = { actor: actor.id, token: t.document.actorLink ? null : t.id, tokens: [...game.user.targets], item: arma.id };
    await CPRChat.RenderRollCard(cprRoll);
    return cprRoll.resultTotal;
  }; 0`;
  const atacar = (alvo, pedido) => alvo.evaluate(`window.__atacar(${JSON.stringify(pedido)})`);
  const ultimo = () => edge.evaluate(`game.modules.get('${MODULO}').api.ultimo || null`);
  // Espera o resultado de um ataque novo (o mestre resolve no fim).
  const resultado = async (antes, vezes = 200) => esperar(edge, `(() => { const u = game.modules.get('${MODULO}').api.ultimo; return u && u.ataque !== ${JSON.stringify(antes)} ? u : null; })()`, vezes);
  const idDoUltimo = async () => ((await ultimo()) || {}).ataque || null;
  // Janela "Ataque!" e janela de rolagem do sistema.
  const opcoesDaJanela = (alvo, vezes = 60) => esperar(alvo, `(() => { const j = document.querySelector('.fluxo-defesa'); return j ? [...j.querySelectorAll('[data-escolha]')].map(b => b.dataset.escolha).join() : null; })()`, vezes);
  const escolher = (alvo, escolha) => alvo.evaluate(`(() => { const b = document.querySelector('.fluxo-defesa [data-escolha="${escolha}"]'); if (!b) return false; b.click(); return true; })()`);
  const tituloDaRolagem = (alvo, vezes = 60) => esperar(alvo, `(() => { const b = document.querySelector('.window-app.dialog .cpr-dialog-button[name="confirm"]'); return b ? ((b.closest('.window-app').querySelector('.window-title') || {}).textContent || '?') : null; })()`, vezes);
  const confirmar = async alvo => {
    const titulo = await tituloDaRolagem(alvo);
    if (titulo) await alvo.evaluate(`document.querySelector('.window-app.dialog .cpr-dialog-button[name="confirm"]').click()`);
    return titulo;
  };
  const ator = id => `game.actors.get(${JSON.stringify(id)})`;
  const hp = id => edge.evaluate(`${ator(id)}.system.derivedStats.hp.value`);
  const curar = id => edge.evaluate(`(async () => {
    const a = ${ator(id)};
    await a.update({ 'system.derivedStats.hp.value': a.system.derivedStats.hp.max, 'system.derivedStats.deathSave.penalty': 0 });
    const armaduras = a.itemTypes.armor.filter(i => !i.system.isShield).map(i => ({ _id: i.id, 'system.bodyLocation.ablation': 0, 'system.headLocation.ablation': 0 }));
    if (armaduras.length) await a.updateEmbeddedDocuments('Item', armaduras);
    return a.system.derivedStats.hp.value;
  })()`);
  const mover = (token, x, y) => edge.evaluate(`game.scenes.get(${JSON.stringify(ids.cena)}).tokens.get(${JSON.stringify(token)}).update({ x: ${x}, y: ${y} }, { animate: false }).then(() => true)`);
  let parou = '';
  const passo = async (nome, fn) => {
    if (parou) { await r.passo(nome, async () => [false, `não rodou: falhou antes "${parou}"`]); return; }
    await r.passo(nome, fn);
    if (!r.itens[r.itens.length - 1].ok) parou = nome;
  };
  const clicarNoDialogo = (alvo, texto, acao) => alvo.evaluate(`(() => { const d = [...document.querySelectorAll('dialog.application, .application.dialog')].find(e => ${JSON.stringify(texto)} && e.textContent.includes(${JSON.stringify(texto)})); const b = d && d.querySelector('button[data-action="${acao}"]'); if (!b) return false; b.click(); return true; })()`);

  try {
    await passo('mestre entra; o cpr-2077 oferece ligar o Fluxo de Combate num mundo que usava o Evasion Workflow, e liga', async () => {
      await foundry.entrarComoMestre(edge, mesa.url);
      await foundry.ativarModulo(edge, ['cpr-2077']);
      await edge.evaluate(`game.settings.set('cpr-2077', 'wikiUrl', ${JSON.stringify(wiki)})`);
      ids.config = await edge.evaluate(`game.settings.get('core', 'moduleConfiguration')`);
      // Como o servidor depois da publicação: o Fluxo de Combate instalado e desligado, o Evasion Workflow na lista.
      await edge.evaluate(`(async () => {
        await game.settings.set('cpr-2077', 'fluxoPerguntado', false);
        const config = { ...game.settings.get('core', 'moduleConfiguration'), '${MODULO}': false, 'cpred-evasion-workflow': false, 'socketlib': false, 'net-architect': false };
        if (${comDiwako}) Object.assign(config, { 'lib-wrapper': true, 'diwako-cpred-additions': true });
        await game.settings.set('core', 'moduleConfiguration', config);
      })()`);
      await edge.evaluate('location.reload()').catch(() => {});
      await sleep(1500);
      await foundry.esperarJogo(edge);
      const aviso = await esperar(edge, `[...document.querySelectorAll('dialog.application, .application.dialog')].some(e => e.textContent.includes('Fluxo de Combate'))`, 60);
      await edge.shot('aviso-cpr-2077');
      const clicou = await clicarNoDialogo(edge, 'Fluxo de Combate', 'yes');
      await sleep(2000);
      await foundry.esperarJogo(edge);
      const info = await esperar(edge, `(() => { const m = game.modules.get('${MODULO}'); return m && m.active && m.api ? { ativo: true, api: typeof m.api.atacar, status: CONFIG.statusEffects.some(s => s.id === '${MODULO}-suprimido'), diwako: !!game.modules.get('diwako-cpred-additions')?.active, perguntado: game.settings.get('cpr-2077', 'fluxoPerguntado') } : null; })()`, 60);
      // Uma rodada interrompida pode ter deixado o tempo curto.
      if (info) await edge.evaluate(`game.settings.set('${MODULO}', 'tempo', 60)`);
      return [aviso && clicou && info && info.api === 'function' && info.status && info.perguntado && (!comDiwako || info.diwako), `aviso ${aviso} · ligou ${JSON.stringify(info)} · Diwako no teste: ${comDiwako ? 'sim' : 'não (sem cópia no PC)'}`];
    });

    await passo('personagens: o do jogador (wiki, REF 8, Evasão 6) e dois NPCs do compêndio do cpr-2077, com armas, munição e armadura do sistema', async () => {
      const montado = await edge.evaluate(`(async () => {
        let etapa = 'início';
        try {
        for (const c of [...game.combats]) await c.delete();
        for (const velha of game.scenes.filter(s => s.name === 'Fluxo teste')) await velha.delete();
        let usuario = game.users.getName('Jogador Fluxo');
        if (!usuario) usuario = await User.create({ name: 'Jogador Fluxo', role: CONST.USER_ROLES.PLAYER });
        etapa = 'importar da wiki';
        const { actor: pc } = await game.modules.get('cpr-2077').api.importarPersonagem(${JSON.stringify(personagem.id)}, '');
        etapa = 'NPCs do compêndio';
        const pack = game.packs.get('cpr-2077.npcs-2077');
        const guarda = (await pack.getIndex()).find(i => i.name.startsWith('Guarda-costas'));
        const fonte = (await pack.getDocument(guarda._id)).toObject();
        delete fonte._id;
        const g = await Actor.create({ ...fonte, name: 'Guarda Fluxo', prototypeToken: { ...fonte.prototypeToken, name: 'Guarda Fluxo' } });
        const c = await Actor.create({ ...fonte, name: 'Capanga Fluxo', prototypeToken: { ...fonte.prototypeToken, name: 'Capanga Fluxo' } });
        const doPack = async (colecao, filtro) => { const p = game.packs.get(colecao); const e = (await p.getIndex({ fields: ['system.variety', 'system.type'] })).find(filtro); if (!e) throw new Error(colecao + ': não achei'); return (await p.getDocument(e._id)).toObject(); };
        const arma = nome => doPack('cyberpunk-red-core.core_weapons', i => i.name === nome);
        const municao = (variedade, tipo = 'basic') => doPack('cyberpunk-red-core.core_ammo', i => i.system?.variety === variedade && i.system?.type === tipo);
        const armadura = nome => doPack('cyberpunk-red-core.core_armor', i => i.name === nome);
        // Tudo de uma vez, como a migração do sistema faz (sem a janela "Confirm Container Delete" dos itens com
        // coisas instaladas: armas carregadas, cyberware com opções).
        const limpar = async a => {
          const fora = a.items.filter(i => ['weapon', 'armor', 'ammo', 'cyberware', 'drug', 'gear', 'clothing', 'itemUpgrade'].includes(i.type)).map(i => i.id);
          if (fora.length) await a.deleteEmbeddedDocuments('Item', fora, { cprIsMigrating: true });
        };
        const pericias = async (a, niveis) => { const mudar = []; for (const s of a.itemTypes.skill) mudar.push({ _id: s.id, 'system.level': niveis[s.name] ?? 0 }); await a.updateEmbeddedDocuments('Item', mudar); };
        const carregar = async (a, dadosDaArma, dadosDaMunicao, quantidade) => {
          const [w] = await a.createEmbeddedDocuments('Item', [dadosDaArma]);
          if (!dadosDaMunicao) return w.id;
          dadosDaMunicao.system.amount = quantidade;
          const [m] = await a.createEmbeddedDocuments('Item', [dadosDaMunicao]);
          await w.installItems([m]);
          await a.items.get(w.id).reload();
          return w.id;
        };
        const vestir = async (a, nomes) => { const criados = await a.createEmbeddedDocuments('Item', await Promise.all(nomes.map(armadura))); await a.updateEmbeddedDocuments('Item', criados.map(i => ({ _id: i.id, 'system.equipped': 'equipped' }))); return criados.map(i => i.id); };
        const stats = (valores) => Object.fromEntries(Object.entries(valores).map(([k, v]) => ['system.stats.' + k + '.value', v]));
        etapa = 'limpar ' + [pc, g, c].map(a => a && a.name).join();
        for (const a of [pc, g, c]) await limpar(a);
        etapa = 'stats e perícias';
        await pc.update(stats({ ref: 8, dex: 8, body: 8, will: 6, luck: 5, cool: 6 }));
        await g.update(stats({ ref: 8, dex: 6, body: 6, will: 4, luck: 0 }));
        await c.update(stats({ ref: 4, dex: 4, body: 6, will: 4, luck: 0 }));
        await pericias(pc, { Evasion: 6, Handgun: 6, Concentration: 2, 'Melee Weapon': 2 });
        await pericias(g, { Evasion: 2, Handgun: 6, 'Melee Weapon': 4, Autofire: 8, 'Heavy Weapons': 4, 'Shoulder Arms': 4 });
        await pericias(c, {});
        const ids = { pc: pc.id, g: g.id, c: c.id, usuario: usuario.id };
        etapa = 'armas do jogador';
        ids.pistolaPc = await carregar(pc, await arma('Heavy Pistol'), await municao('heavyPistol'), 16);
        ids.facaPc = await carregar(pc, await arma('Combat Knife'));
        ids.armaduraPc = await vestir(pc, ['Kevlar® (Body)', 'Kevlar® (Head)']);
        const [escudo] = await pc.createEmbeddedDocuments('Item', [await armadura('Bullet Proof Shield')]);
        ids.escudo = escudo.id;
        etapa = 'armas do NPC';
        ids.pistola = await carregar(g, await arma('Heavy Pistol'), await municao('heavyPistol'), 30);
        ids.faca = await carregar(g, await arma('Combat Knife'));
        ids.smg = await carregar(g, await arma('SMG'), await municao('medPistol'), 90);
        ids.lancador = await carregar(g, await arma('Grenade Launcher'), await municao('grenade', 'armorPiercing'), 4);
        ids.espingarda = await carregar(g, await arma('Shotgun'), await municao('shotgunShell'), 8);
        await vestir(g, ['Kevlar® (Body)', 'Kevlar® (Head)']);
        for (const a of [pc, g, c]) await a.update({ 'system.derivedStats.hp.value': a.system.derivedStats.hp.max, 'system.derivedStats.deathSave.penalty': 0 });
        await pc.update({ ownership: { default: 0, [usuario.id]: 3 } });
        await usuario.update({ character: pc.id });
        etapa = 'cena';
        const scene = await Scene.create({ name: 'Fluxo teste', width: 3000, height: 2000, padding: 0, grid: { size: 100, distance: 2, units: 'm' }, tokenVision: false, fog: { exploration: false } });
        const criados = await scene.createEmbeddedDocuments('Token', [
          { name: pc.name, actorId: pc.id, actorLink: true, x: 1000, y: 1000, texture: { src: pc.img || 'icons/svg/mystery-man.svg' } },
          { name: g.name, actorId: g.id, actorLink: true, x: 1600, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } },
          { name: c.name, actorId: c.id, actorLink: true, x: 1100, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } }
        ]);
        ids.tPc = criados.find(t => t.actorId === pc.id).id;
        ids.tG = criados.find(t => t.actorId === g.id).id;
        ids.tC = criados.find(t => t.actorId === c.id).id;
        ids.cena = scene.id;
        await scene.activate();
        await scene.view();
        const pericia = (a, n) => a.itemTypes.skill.find(s => s.name === n)?.system.level;
        ids.resumo = { hp: [pc, g, c].map(a => a.system.derivedStats.hp.max), evasao: pericia(pc, 'Evasion'), handgun: pericia(g, 'Handgun'), sp: pc.itemTypes.armor.filter(i => !i.system.isShield).map(i => i.system.bodyLocation.sp || i.system.headLocation.sp), carregada: g.items.get(ids.pistola).system.magazine.value, granadas: g.items.get(ids.lancador).system.magazine.value, cartucho: g.items.get(ids.espingarda)._getLoadedAmmoProp('variety'), tipos: [pc.type, g.type, c.type] };
        return ids;
        } catch (error) { return { erro: etapa + ': ' + String(error && error.stack || error).slice(0, 700) }; }
      })()`);
      if (montado.erro) return [false, montado.erro];
      Object.assign(ids, montado);
      await edge.evaluate(ATACAR);
      const s = ids.resumo;
      [ids.maxPc, ids.maxG, ids.maxC] = s.hp;
      return [s.evasao === 6 && s.handgun === 6 && s.sp.join() === '7,7' && s.carregada > 0 && s.granadas > 0 && s.cartucho === 'shotgunShell' && s.hp.every(v => v > 30), JSON.stringify(s)];
    });

    await passo('jogador entra e vê a cena', async () => {
      await foundry.entrarComo(jogador, mesa.url, 'Jogador Fluxo');
      await esperar(jogador, `canvas.ready && canvas.scene?.id === ${JSON.stringify(ids.cena)}`);
      await noJogador(`(() => { for (const app of Object.values(ui.windows)) app.close(); for (const app of foundry.applications.instances.values()) app.close(); })()`);
      await sleep(400);
      await noJogador(`(() => { window.__avisos = []; for (const tipo of ['info', 'warn']) { const f = ui.notifications[tipo].bind(ui.notifications); ui.notifications[tipo] = (m, o) => { window.__avisos.push(String(m)); return f(m, o); }; } })()`);
      await noJogador(ATACAR);
      await dados(0.45);
      const ok = await noJogador(`!!game.modules.get('${MODULO}')?.active && canvas.tokens.get(${JSON.stringify(ids.tPc)})?.isOwner`);
      return [ok, `ativo e dono do token: ${ok}`];
    });

    await passo('NPC atira (20) no jogador (REF 8): a janela "Ataque!" abre só para ele, sem o total, e o cartão do ataque fica escondido dele', async () => {
      const antes = await idDoUltimo();
      const cartoesAntes = await noJogador(`game.messages.contents.filter(m => m.getFlag('${MODULO}', 'ataque') && m.visible).length`);
      await atacar(edge, { token: ids.tG, item: ids.pistola, alvos: [ids.tPc] });
      const opcoes = await opcoesDaJanela(jogador);
      await jogador.shot('janela-ataque');
      const escondido = await noJogador(`game.messages.contents.filter(m => m.getFlag('${MODULO}', 'ataque') && m.visible).length`) === cartoesAntes;
      const sussurro = await edge.evaluate(`(() => { const m = game.messages.contents.filter(m => m.getFlag('${MODULO}', 'ataque')).pop(); return m ? m.whisper.map(id => game.users.get(id).name).join('+') : 'nenhum'; })()`);
      const mestreVe = await edge.evaluate(`game.messages.contents.filter(m => m.getFlag('${MODULO}', 'ataque')).length`);
      const texto = await noJogador(`document.querySelector('.fluxo-defesa')?.textContent.replace(/\\s+/g, ' ') || ''`);
      ids.antes = antes;
      return [opcoes === 'esquivar,aguentar' && escondido && mestreVe >= 1 && /DV 15/.test(texto) && !/Total do ataque/.test(texto), `opções ${opcoes} · escondido do jogador ${escondido} (sussurro: ${sussurro}) · janela: ${texto.slice(0, 400)}`];
    });

    await passo('Esquivar: a janela de rolagem do sistema abre no jogador; Evasão 20 empata com o ataque 20 e o empate é dele', async () => {
      await escolher(jogador, 'esquivar');
      const titulo = await confirmar(jogador);
      const u = await resultado(ids.antes);
      const linha = u && u.linhas[0];
      const visto = await esperar(jogador, `game.messages.contents.filter(m => m.getFlag('${MODULO}', 'ataque') && m.visible).length >= 1`, 40);
      const hpPc = await hp(ids.pc);
      return [/Evasão contra Heavy Pistol de Guarda Fluxo/.test(titulo || '') && linha && linha.resultado === 'esquivou' && linha.defesa === 20 && u.total === 20 && visto && hpPc === ids.maxPc,
        `janela "${titulo}" · ${JSON.stringify(linha)} · ataque ${u && u.total} · o jogador vê o cartão depois: ${visto} · HP ${hpPc}`];
    });

    await passo('Aguentar: 20 contra DV 15 (12 m) acerta; 3d6 = 12 menos SP 7 do Kevlar = 5 no HP e o colete perde 1 de SP; o cartão de dano não tem botão de aplicar', async () => {
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.pistola, alvos: [ids.tPc] });
      await opcoesDaJanela(jogador);
      await escolher(jogador, 'aguentar');
      const u = await resultado(antes);
      const linha = u && u.linhas[0];
      const estado = await edge.evaluate(`(() => { const a = ${ator(ids.pc)}; const corpo = a.itemTypes.armor.find(i => i.system.isBodyLocation && !i.system.isShield); const dano = game.messages.contents.filter(m => m.getFlag('${MODULO}', 'rolagem') && /Heavy Pistol/.test(m.content)).pop(); return { hp: a.system.derivedStats.hp.value, ablacao: corpo.system.bodyLocation.ablation, botao: dano ? /data-action="applyDamage"/.test(dano.content) : null }; })()`);
      return [linha && linha.resultado === 'acertou' && linha.dv === 15 && linha.dano && linha.dano.perdeu === 5 && estado.hp === ids.maxPc - 5 && estado.ablacao === 1 && estado.botao === false,
        `${JSON.stringify(linha && { resultado: linha.resultado, dv: linha.dv, dano: linha.dano })} · ${JSON.stringify(estado)}`];
    });

    await passo('tiro mirado na cabeça do jogador (10 + 10, total 26): o mestre escolhe a defesa do NPC vendo o total, o jogador rola o dano, crítico com lesão na ficha', async () => {
      await dados(0.001);
      const antes = await idDoUltimo();
      await atacar(jogador, { token: ids.tPc, item: ids.pistolaPc, tipo: 'aimed', alvos: [ids.tG], local: 'head' });
      const opcoes = await opcoesDaJanela(edge);
      const total = await edge.evaluate(`document.querySelector('.fluxo-defesa .fluxo-total')?.textContent || ''`);
      await edge.shot('janela-mestre');
      await escolher(edge, 'aguentar');
      const titulo = await confirmar(jogador);
      const u = await resultado(antes);
      await dados(0.45);
      const linha = u && u.linhas[0];
      const g = await edge.evaluate(`(() => { const a = ${ator(ids.g)}; const cabeca = a.itemTypes.armor.find(i => i.system.isHeadLocation); return { hp: a.system.derivedStats.hp.value, ablacao: cabeca.system.headLocation.ablation, lesoes: a.itemTypes.criticalInjury.map(i => i.name) }; })()`);
      ids.cartaoMirado = u && u.cartao;
      return [opcoes === 'esquivar,aguentar' && /26/.test(total) && /Heavy Pistol/.test(titulo || '') && u.total === 26 && linha.resultado === 'acertou' && linha.dano.critico && linha.dano.perdeu === 27 && g.hp === ids.maxG - 27 && g.ablacao === 1 && g.lesoes.length === 1 && linha.dano.lesoes.length === 1,
        `opções ${opcoes} · "${total}" · dano "${titulo}" · ${JSON.stringify(linha && linha.dano)} · NPC ${JSON.stringify(g)}`];
    });

    await passo('Desfazer (mestre): HP, SP da cabeça e a lesão crítica voltam como antes; o cartão fica marcado como desfeito', async () => {
      const clicou = await esperar(edge, `(() => { const b = document.querySelector('#chat-log [data-message-id="${ids.cartaoMirado}"] [data-fluxo-desfazer]'); if (!b) return false; b.click(); return true; })()`);
      const g = await esperar(edge, `(() => { const a = ${ator(ids.g)}; const cabeca = a.itemTypes.armor.find(i => i.system.isHeadLocation); return a.system.derivedStats.hp.value === ${ids.maxG} && !a.itemTypes.criticalInjury.length ? { hp: a.system.derivedStats.hp.value, ablacao: cabeca.system.headLocation.ablation } : null; })()`);
      const desfeito = await esperar(edge, `game.messages.get(${JSON.stringify(ids.cartaoMirado)})?.getFlag('${MODULO}', 'resultado')?.desfeito`);
      const jogadorSemBotao = await noJogador(`!document.querySelector('#chat-log [data-message-id="${ids.cartaoMirado}"] [data-fluxo-desfazer]')`);
      return [clicou && g && g.ablacao === 0 && desfeito && jogadorSemBotao, `clicou ${clicou} · ${JSON.stringify(g)} · desfeito ${desfeito} · o jogador não tem o botão: ${jogadorSemBotao}`];
    });

    await passo('corpo a corpo: a faca do NPC (16) vai direto para a janela de Evasão do jogador (sem escolha), e 20 esquiva', async () => {
      await curar(ids.pc);
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.faca, alvos: [ids.tPc] });
      const titulo = await tituloDaRolagem(jogador);
      const semJanela = await noJogador(`!document.querySelector('.fluxo-defesa')`);
      await confirmar(jogador);
      const u = await resultado(antes);
      const linha = u && u.linhas[0];
      return [/Evasão contra Combat Knife/.test(titulo || '') && semJanela && u.modo === 'corpo' && u.total === 16 && linha.resultado === 'esquivou' && linha.defesa === 20, `"${titulo}" · sem a janela de escolha ${semJanela} · ${JSON.stringify(linha)}`];
    });

    await passo('escudo: com o Bullet Proof Shield, a janela oferece usar o escudo; ele segura os 12 do tiro (10 HP do escudo) e o HP não muda', async () => {
      await edge.evaluate(`${ator(ids.pc)}.items.get(${JSON.stringify(ids.escudo)}).update({ 'system.equipped': 'equipped' })`);
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.pistola, alvos: [ids.tPc] });
      const opcoes = await opcoesDaJanela(jogador);
      await escolher(jogador, 'escudo');
      const u = await resultado(antes);
      const linha = u && u.linhas[0];
      const estado = await edge.evaluate(`(() => { const a = ${ator(ids.pc)}; return { hp: a.system.derivedStats.hp.value, escudo: a.items.get(${JSON.stringify(ids.escudo)}).system.shieldHitPoints.value }; })()`);
      await edge.evaluate(`${ator(ids.pc)}.items.get(${JSON.stringify(ids.escudo)}).update({ 'system.equipped': 'owned' })`);
      return [opcoes === 'esquivar,aguentar,escudo' && linha.resultado === 'acertou' && linha.escolha === 'escudo' && linha.dano.escudo === 10 && linha.dano.perdeu === 0 && estado.hp === ids.maxPc && estado.escudo === 0,
        `opções ${opcoes} · ${JSON.stringify(linha && linha.dano)} · ${JSON.stringify(estado)}`];
    });

    await passo('sem resposta: a janela do jogador fecha sozinha no tempo da configuração (10 s) e ele aguenta; o cartão avisa', async () => {
      await edge.evaluate(`game.settings.set('${MODULO}', 'tempo', 10)`);
      await esperar(jogador, `!document.querySelector('.fluxo-defesa')`, 15);
      const abertas = await noJogador(`[...document.querySelectorAll('.fluxo-defesa')].map(e => e.id + ':' + [...e.querySelectorAll('[data-escolha]')].map(b => b.dataset.escolha).join('/')).join(' ; ') || 'nenhuma'`);
      if (abertas !== 'nenhuma') return [false, `janela "Ataque!" ainda aberta antes do ataque: ${abertas}`];
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.pistola, alvos: [ids.tPc] });
      const abriu = await opcoesDaJanela(jogador);
      const u = await resultado(antes, 120);
      // A janela fecha com animação: espera um pouco.
      const fechou = await esperar(jogador, `!document.querySelector('.fluxo-defesa')`, 15);
      await edge.evaluate(`game.settings.set('${MODULO}', 'tempo', 60)`);
      const linha = u && u.linhas[0];
      return [abriu && fechou && linha && linha.escolha === 'aguentar' && linha.resultado === 'acertou' && u.notas.some(n => /não respondeu a tempo/.test(n)),
        `abriu ${abriu} · fechou ${fechou} · ${linha && linha.escolha} · notas: ${u && u.notas.join(' | ')}`];
    });

    await passo('autofogo: SMG do NPC (22) contra DV 17 do autofogo a 12 m passa por 5, mas a SMG limita a ×3: 2d6 = 8 × 3 = 24, menos SP 7 = 17', async () => {
      await curar(ids.pc);
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.smg, tipo: 'autofire', alvos: [ids.tPc] });
      await opcoesDaJanela(jogador);
      await escolher(jogador, 'aguentar');
      const u = await resultado(antes);
      const linha = u && u.linhas[0];
      return [u.modo === 'autofogo' && u.total === 22 && linha.dv === 17 && linha.dano && linha.dano.autofogo === 3 && linha.dano.rolado === 24 && linha.dano.perdeu === 17 && (await hp(ids.pc)) === ids.maxPc - 17,
        `${JSON.stringify(linha && { dv: linha.dv, dano: linha.dano })}`];
    });

    await passo('granada (18) contra a DV do lançador a 10 m: pega o capanga e todos na área de 10 × 10 m; o jogador (REF 8) esquiva para fora; o dano é rolado uma vez', async () => {
      await curar(ids.pc);
      const dv = await edge.evaluate(`(async () => { const p = game.packs.get('cyberpunk-red-core.internal_dv-tables'); const t = await p.getDocument((await p.getIndex()).getName('DV Grenade Launcher')._id); return t.results.contents.map(r => [r.range, r.text]); })()`);
      const dvEsperada = R.dvPelaDistancia(dv, 10).dv;
      const danosAntes = await edge.evaluate(`game.messages.contents.filter(m => m.getFlag('${MODULO}', 'rolagem') && /Aplicado pelo Fluxo de Combate/.test(m.content) && /Grenade Launcher/.test(m.content)).length`);
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.lancador, alvos: [ids.tC] });
      const opcoes = await opcoesDaJanela(jogador);
      await escolher(jogador, 'esquivar');
      await confirmar(jogador);
      const u = await resultado(antes);
      const porNome = Object.fromEntries((u ? u.linhas : []).map(l => [l.nome, l]));
      const danos = await edge.evaluate(`game.messages.contents.filter(m => m.getFlag('${MODULO}', 'rolagem') && /Aplicado pelo Fluxo de Combate/.test(m.content) && /Grenade Launcher/.test(m.content)).length`) - danosAntes;
      const c = porNome['Capanga Fluxo'];
      const p = porNome['Teste Fluxo'];
      const hpC = await hp(ids.c);
      return [u.modo === 'explosivo' && u.total === 18 && dvEsperada < 18 && opcoes === 'esquivar,aguentar' && c && c.resultado === 'acertou' && c.dano.perdeu === 24 && hpC === ids.maxC - 24 && p && p.resultado === 'esquivou' && p.defesa === 20 && !porNome['Guarda Fluxo'] && danos === 1,
        `DV ${dvEsperada} · ${u && u.cabecalho} · capanga ${JSON.stringify(c && { r: c.resultado, perdeu: c.dano && c.dano.perdeu })} · jogador ${JSON.stringify(p && { r: p.resultado, defesa: p.defesa })} · ${danos} rolagem de dano`];
    });

    await passo('espingarda com cartucho (18 contra DV 13): os dois na frente, até 6 m, levam os mesmos 3d6 = 12 (o jogador menos o SP 7)', async () => {
      await curar(ids.pc);
      await curar(ids.c);
      await mover(ids.tG, 1300, 1000);
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.espingarda, alvos: [ids.tPc, ids.tC] });
      await opcoesDaJanela(jogador);
      await escolher(jogador, 'aguentar');
      const u = await resultado(antes);
      const porNome = Object.fromEntries((u ? u.linhas : []).map(l => [l.nome, l]));
      const p = porNome['Teste Fluxo'];
      const c = porNome['Capanga Fluxo'];
      return [u.modo === 'cartucho' && p && p.dano && p.dano.rolado === 12 && p.dano.perdeu === 5 && c && c.dano && c.dano.perdeu === 12 && (await hp(ids.c)) === ids.maxC - 12,
        `${u && u.cabecalho} · jogador ${JSON.stringify(p && p.dano && { rolado: p.dano.rolado, perdeu: p.dano.perdeu })} · capanga ${JSON.stringify(c && c.dano && { perdeu: c.dano.perdeu })}`];
    });

    await passo('fogo supressivo sem alvo (22): pega os dois a até 25 m; o jogador rola a Concentração (14) na janela do sistema e os dois ficam Suprimidos', async () => {
      await curar(ids.pc);
      await edge.evaluate('game.user.updateTokenTargets([])');
      const antes = await idDoUltimo();
      await atacar(edge, { token: ids.tG, item: ids.smg, tipo: 'suppressive', alvos: [] });
      const titulo = await confirmar(jogador);
      const u = await resultado(antes);
      const porNome = Object.fromEntries((u ? u.linhas : []).map(l => [l.nome, l]));
      const status = await edge.evaluate(`[${JSON.stringify(ids.pc)}, ${JSON.stringify(ids.c)}].map(id => game.actors.get(id).statuses.has('${MODULO}-suprimido'))`);
      const p = porNome['Teste Fluxo'];
      const c = porNome['Capanga Fluxo'];
      return [/Concentração/.test(titulo || '') && u.modo === 'supressivo' && u.linhas.length === 2 && p && p.resultado === 'suprimido' && p.defesa === 14 && c && c.resultado === 'suprimido' && status.join() === 'true,true',
        `"${titulo}" · ${u && u.cabecalho} · ${JSON.stringify(u && u.linhas.map(l => [l.nome, l.resultado, l.defesa]))} · status ${status}`];
    });

    await passo('combate: o Suprimido sai no fim do próximo turno de quem foi suprimido', async () => {
      await edge.evaluate(`(async () => {
        const combate = await Combat.create({ scene: ${JSON.stringify(ids.cena)} });
        await combate.createEmbeddedDocuments('Combatant', [
          { tokenId: ${JSON.stringify(ids.tPc)}, sceneId: ${JSON.stringify(ids.cena)}, actorId: ${JSON.stringify(ids.pc)}, initiative: 20 },
          { tokenId: ${JSON.stringify(ids.tC)}, sceneId: ${JSON.stringify(ids.cena)}, actorId: ${JSON.stringify(ids.c)}, initiative: 10 }
        ]);
        await combate.activate();
        await combate.startCombat();
        await combate.nextTurn();
      })()`);
      const saiu = await esperar(edge, `!game.actors.get(${JSON.stringify(ids.pc)}).statuses.has('${MODULO}-suprimido')`, 40);
      const capanga = await edge.evaluate(`game.actors.get(${JSON.stringify(ids.c)}).statuses.has('${MODULO}-suprimido')`);
      return [saiu && capanga, `o jogador saiu do Suprimido: ${saiu} · o capanga continua: ${capanga}`];
    });

    await passo('Death Save no começo do turno: o jogador (HP 0) rola na janela do sistema e passa (6 < BODY 8); o capanga (HP 0, BODY 6) falha e morre', async () => {
      await edge.evaluate(`(async () => { await game.actors.get(${JSON.stringify(ids.pc)}).update({ 'system.derivedStats.hp.value': 0 }); await game.actors.get(${JSON.stringify(ids.c)}).update({ 'system.derivedStats.hp.value': 0 }); await game.combat.nextTurn(); })()`);
      const titulo = await confirmar(jogador);
      const penalidade = await esperar(edge, `game.actors.get(${JSON.stringify(ids.pc)}).system.derivedStats.deathSave.penalty === 1`, 40);
      await edge.evaluate('game.combat.nextTurn()');
      const morto = await esperar(edge, `(() => { const a = game.actors.get(${JSON.stringify(ids.c)}); const cb = game.combat.combatants.find(c => c.actorId === a.id); return a.statuses.has(CONFIG.specialStatusEffects.DEFEATED) && cb.isDefeated; })()`, 40);
      const vivo = await edge.evaluate(`!game.actors.get(${JSON.stringify(ids.pc)}).statuses.has(CONFIG.specialStatusEffects.DEFEATED)`);
      await edge.evaluate('game.combat && game.combat.delete()');
      return [Boolean(titulo) && penalidade && morto && vivo, `janela "${titulo}" · penalidade 1 depois de passar: ${penalidade} · capanga morto: ${morto} · jogador vivo: ${vivo}`];
    });

    await passo('o Diwako continua ligado, mas não anuncia acerto nem erro antes da defesa (nenhuma linha dele nos ataques)', async () => {
      if (!comDiwako) return [true, 'sem o Diwako no PC: pulado'];
      const linhas = await edge.evaluate(`game.messages.contents.filter(m => /padding:10px;background-color:var\\(--cpr-text-chat-/.test(m.content)).length`);
      const ativo = await edge.evaluate(`!!game.modules.get('diwako-cpred-additions')?.active`);
      return [ativo && linhas === 0, `Diwako ativo ${ativo} · linhas de acerto/erro dele: ${linhas}`];
    });

    await passo('Evasion Workflow ligado junto: o mestre recebe o aviso e desliga com um clique', async () => {
      if (!comEvasion) return [true, 'sem o Evasion Workflow no PC: pulado'];
      await edge.evaluate(`game.settings.set('core', 'moduleConfiguration', { ...game.settings.get('core', 'moduleConfiguration'), 'socketlib': true, 'cpred-evasion-workflow': true })`);
      await edge.evaluate('location.reload()').catch(() => {});
      await sleep(1500);
      await foundry.esperarJogo(edge);
      const aviso = await esperar(edge, `[...document.querySelectorAll('dialog.application, .application.dialog')].some(e => e.textContent.includes('Evasion Workflow'))`, 60);
      await edge.shot('aviso-evasion');
      const clicou = await clicarNoDialogo(edge, 'Evasion Workflow', 'yes');
      await sleep(2000);
      await foundry.esperarJogo(edge);
      const desligado = await esperar(edge, `game.ready && game.modules.get('cpred-evasion-workflow') && !game.modules.get('cpred-evasion-workflow').active && game.modules.get('${MODULO}').active`, 60);
      return [aviso && clicou && desligado, `aviso ${aviso} · clicou ${clicou} · desligado ${desligado}`];
    });
  } finally {
    // O mundo de teste volta como estava para os outros cenários (sem o Fluxo, o Diwako e o Evasion ligados).
    await edge.evaluate(`(async () => {
      await game.settings.set('cpr-2077', 'fluxoPerguntado', true);
      await game.settings.set('core', 'moduleConfiguration', { ...${JSON.stringify(ids.config || {})}, '${MODULO}': false, 'lib-wrapper': false, 'diwako-cpred-additions': false, 'socketlib': false, 'cpred-evasion-workflow': false });
    })()`).catch(() => {});
    for (const navegador of [edge, jogador]) await navegador.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
    await sleep(500);
    // Só contam os erros do módulo (o Foundry desligando, o Diwako e o lib-wrapper falam no console por conta própria).
    const doFoundry = edge.erros.splice(errosAntes);
    const doJogador = jogador.erros.splice(0);
    edge.erros.push(...[...doFoundry, ...doJogador].filter(erro => new RegExp(MODULO).test(erro)));
    await jogador.fechar().catch(() => {});
    await mesa.parar();
  }
};
