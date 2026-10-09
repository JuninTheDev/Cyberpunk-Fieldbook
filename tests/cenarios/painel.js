// Painel Tático (foundry-painel-tatico/): as contas do módulo (no Node) e, no Foundry de teste, o mestre e um jogador
// de verdade em dois navegadores. O painel mostra o token controlado; o retrato troca de PNG pelo estado de ferimento
// (com o efeito automático onde falta imagem e o FLATLINE do morto); HP, armadura e Sorte pelos botões; as rolagens
// saem pelo caminho da ficha (Ctrl pula a janela); os modos do sistema e os de 2077 gravam a flag da ficha; o ATK com
// alvo entra no Fluxo de Combate; a carga Tech do cpr-2077 pergunta a cobertura; sem alvo, a mira; o selo e o painel
// da NET com o NET Architect; o estilo de cada jogador (tema, ordem das seções, código PT1, posição arrastada) e a
// janela do retrato. O jogador vê o próprio personagem sem selecionar nada e tem o estilo dele.
// A parte do Foundry só roda com a mesa do servidor vazia (a licença vale para uma mesa por vez).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');
const foundry = require('../lib/foundry');
const { abrirEdge, sleep } = require('../lib/edge');

const MODULO = 'painel-tatico';

// PNG com fundo transparente: a silhueta de um personagem numa cor (o retrato de cada estado).
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buffer => { let c = 0xffffffff; for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const blocoPng = (tipo, dados) => {
  const tamanho = Buffer.alloc(4); tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
};
function silhueta([r, g, b], largura = 240, altura = 420) {
  const linha = largura * 4 + 1;
  const bruto = Buffer.alloc(linha * altura);
  const cx = largura / 2;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const cabeca = Math.hypot(x - cx, y - altura * 0.17) < largura * 0.15;
      const pescoco = y > altura * 0.27 && y < altura * 0.34 && Math.abs(x - cx) < largura * 0.07;
      const t = (y - altura * 0.33) / (altura * 0.67);
      const tronco = t >= 0 && Math.abs(x - cx) < largura * (0.44 - 0.12 * t);
      const visor = Math.abs(y - altura * 0.16) < altura * 0.02 && Math.abs(x - cx) < largura * 0.12;
      if (!(cabeca || pescoco || tronco)) continue;
      const i = y * linha + 1 + x * 4;
      const cor = visor ? [255, 255, 255] : [r, g, b];
      bruto[i] = cor[0]; bruto[i + 1] = cor[1]; bruto[i + 2] = cor[2]; bruto[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blocoPng('IHDR', ihdr), blocoPng('IDAT', zlib.deflateSync(bruto)), blocoPng('IEND', Buffer.alloc(0))]);
}

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  const L = await import(pathToFileURL(path.join(raiz, 'foundry-painel-tatico', 'scripts', 'logica.mjs')).href);
  const conferir = casos => {
    const errados = Object.entries(casos).filter(([, [obtido, esperado]]) => obtido !== esperado).map(([nome, [obtido, esperado]]) => `${nome}: ${obtido} (esperado ${esperado})`);
    return [!errados.length, errados.join(' · ') || `${Object.keys(casos).length} casos certos`];
  };

  // ---------- Sem Foundry ----------
  await r.passo('lógica: a imagem de cada estado (a do estado mais leve quando falta), o efeito automático e o morto', async () => {
    const imagens = { notWounded: 'ok.png', seriouslyWounded: 'grave.png', dead: 'morto.png' };
    return conferir({
      'sem ferimentos': [L.imagemDoEstado(imagens, 'notWounded', 'ator.png').src, 'ok.png'],
      'levemente usa a base': [L.imagemDoEstado(imagens, 'lightlyWounded', 'ator.png').src, 'ok.png'],
      'mortal usa a grave': [L.imagemDoEstado(imagens, 'mortallyWounded', 'ator.png').src, 'grave.png'],
      'morto tem a própria': [L.imagemDoEstado(imagens, 'dead', 'ator.png').propria, true],
      'sem imagens: a do ator': [L.imagemDoEstado({}, 'seriouslyWounded', 'ator.png').src, 'ator.png'],
      'efeito só sem imagem própria': [L.efeitoDoRetrato({ estado: 'seriouslyWounded', propria: true }), ''],
      'efeito na imagem emprestada': [L.efeitoDoRetrato({ estado: 'mortallyWounded', propria: false }), 'mortallyWounded'],
      'efeito sempre': [L.efeitoDoRetrato({ estado: 'dead', propria: true, modo: 'sempre' }), 'dead'],
      'efeito nunca': [L.efeitoDoRetrato({ estado: 'dead', propria: false, modo: 'nunca' }), ''],
      'derrotado é morto': [L.estadoDoRetrato({ estado: 'seriouslyWounded', morto: true }), 'dead'],
      'estado inválido do sistema': [L.estadoDoRetrato({ estado: 'invalidState' }), 'notWounded'],
      'sem imagens: moldura': [L.modoDoRetrato(L.normalizarRetrato({})), 'moldura'],
      'com imagem: livre': [L.modoDoRetrato(L.normalizarRetrato({ imagens: { dead: 'x.png' } })), 'livre'],
      'tamanho limitado': [L.normalizarRetrato({ escala: 999 }).escala, 250]
    });
  });

  await r.passo('lógica: estilo sempre válido, tema, código PT1 de ida e volta (sem a posição) e os botões de HP', async () => {
    const e = L.normalizarEstilo({ acento: '#FF0000', escala: 999, secoes: ['armas', 'xx'], ocultos: ['sorte', 'nada'], posicao: 'livre', x: 40, y: 30, fonte: 'comic' });
    const codigo = L.codigoDoEstilo(e);
    const lido = L.lerCodigo(codigo, { posicao: 'base' });
    let erro = '';
    try { L.lerCodigo('PT1:isso-nao-e-um-codigo'); } catch (error) { erro = error.message; }
    return conferir({
      'cor em minúsculas': [e.acento, '#ff0000'],
      'tamanho limitado': [e.escala, 160],
      'seções completas na ordem': [e.secoes.join(), 'armas,vitais,atributos,acoes'],
      'peça desconhecida fora': [e.ocultos.join(), 'sorte'],
      'fonte desconhecida: a padrão': [e.fonte, 'tektur'],
      'posição livre': [`${e.posicao} ${e.x} ${e.y}`, 'livre 40 30'],
      'código começa com PT1': [codigo.startsWith('PT1:'), true],
      'código traz a cor': [lido.acento, '#ff0000'],
      'código não traz a posição': [lido.posicao, 'base'],
      'código ruim avisa': [/não é válido/.test(erro), true],
      'tema Arasaka': [L.aplicarTema(e, 'arasaka').acento, L.TEMAS.arasaka.acento],
      'HP: na ordem, sem zero, sem lixo': [L.passosDeHp('-10, -1 +1 +10 0 abc 500').join(), '-10,-1,1,10'],
      'HP vazio: o padrão': [L.passosDeHp('').join(), '-5,-1,1,5'],
      'variável rgb': [L.variaveisDoEstilo(e)['--pt-acento-rgb'], '255, 0, 0'],
      'classe da posição': [L.classesDoEstilo(e).includes('pt-posicao-livre'), true],
      'cabe na tela': [JSON.stringify(L.dentroDaTela({ x: 5000, y: -50, largura: 800, altura: 150, telaL: 1400, telaA: 900 })), '{"x":1340,"y":0}']
    });
  });

  // ---------- Foundry de verdade ----------
  if (!foundry.disponivel()) { await r.passo('Foundry não instalado neste PC: parte do Foundry pulada', async () => [true, '']); return; }
  const ocupada = await foundry.mesaOcupada(raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): parte do Foundry pulada`, async () => [true, '']); return; }

  // Netrunner feito na wiki (o importador do cpr-2077 traz a Role de Interface e o cyberdeck).
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  const { personagem } = await api('/api/personagens', 'POST', { nome: 'Teste Painel', role: 'netrunner', metodo: 'ratoderua', sorteio: { linha: 6 }, lingua: 'Portuguese', casa: 'Heywood', lifepath });
  await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
  await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
  for (let i = 0; i < 30 && !/Salvo/.test(await edge.evaluate(`(document.querySelector('#cc-save') || {}).textContent || ''`)); i++) await sleep(200);

  foundry.limparMundo();
  foundry.preparar();
  // Os retratos do teste ficam na pasta Data do Foundry de teste (o Foundry serve em painel-teste/...).
  const pastaDosRetratos = path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste', 'foundry', 'Data', 'painel-teste');
  fs.mkdirSync(pastaDosRetratos, { recursive: true });
  for (const [nome, cor] of [['vex-ok', [0, 220, 190]], ['vex-grave', [255, 150, 40]], ['vex-morto', [130, 130, 130]]]) fs.writeFileSync(path.join(pastaDosRetratos, `${nome}.png`), silhueta(cor));
  const comHud = fs.existsSync(path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste', 'foundry', 'Data', 'modules', 'cpr-combat-hud', 'module.json'));
  const mesa = await foundry.subir();
  const saida = path.join(__dirname, '..', '.saida');
  const jogador = await abrirEdge({ porta: 9399, saida, prefixo: 'painel-jogador-', largura: 1500, altura: 900 });
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
  const no = expressao => edge.evaluate(expressao);
  const ator = () => `game.actors.get(${JSON.stringify(ids.pc)})`;
  // Clique de verdade no painel (com Ctrl, a janela de rolagem do sistema não abre).
  const clicar = (alvo, seletor, { ctrl = false, direito = false } = {}) => alvo.evaluate(`(() => {
    const b = document.querySelector(${JSON.stringify(seletor)});
    if (!b) return false;
    b.dispatchEvent(new MouseEvent(${direito ? "'contextmenu'" : "'click'"}, { bubbles: true, cancelable: true, ctrlKey: ${ctrl}, button: ${direito ? 2 : 0} }));
    return true;
  })()`);
  const mensagens = () => no('game.messages.size');
  let parou = '';
  const passo = async (nome, fn) => {
    if (parou) { await r.passo(nome, async () => [false, `não rodou: falhou antes "${parou}"`]); return; }
    await r.passo(nome, fn);
    if (!r.itens[r.itens.length - 1].ok) parou = nome;
  };

  try {
    await passo('mestre entra; liga o cpr-2077, o Fluxo de Combate, o NET Architect e o Painel Tático (vazio sem token)', async () => {
      await foundry.entrarComoMestre(edge, mesa.url);
      await foundry.ativarModulo(edge, ['cpr-2077']);
      ids.config = await no(`game.settings.get('core', 'moduleConfiguration')`);
      await no(`(async () => {
        await game.settings.set('cpr-2077', 'wikiUrl', ${JSON.stringify(wiki)});
        await game.settings.set('cpr-2077', 'fluxoPerguntado', true);
        const config = { ...game.settings.get('core', 'moduleConfiguration'), 'fluxo-de-combate': true, 'net-architect': true, '${MODULO}': true, 'cpred-evasion-workflow': false, 'socketlib': false };
        if (${comHud}) config['cpr-combat-hud'] = true;
        await game.settings.set('core', 'moduleConfiguration', config);
      })()`);
      await no('location.reload()').catch(() => {});
      await sleep(1500);
      await foundry.esperarJogo(edge);
      const info = await esperar(edge, `(() => { const m = game.modules.get('${MODULO}'); const p = document.querySelector('#painel-tatico'); return m && m.active && m.api && p ? { api: typeof m.api.estilo.abrir, vazio: p.classList.contains('pt-vazio'), fluxo: !!game.modules.get('fluxo-de-combate')?.active, net: !!game.modules.get('net-architect')?.active, hud: !!game.modules.get('cpr-combat-hud')?.active } : null; })()`);
      // Uma rodada interrompida pode ter deixado o estilo, o painel recolhido ou o Fluxo desligado.
      await no(`Promise.all([game.settings.set('${MODULO}', 'estilo', null), game.settings.set('${MODULO}', 'estiloDaMesa', null), game.settings.set('${MODULO}', 'recolhido', false), game.settings.set('fluxo-de-combate', 'ativo', true), game.settings.set('fluxo-de-combate', 'tempo', 60)])`);
      return [info && info.api === 'function' && info.vazio && info.fluxo && info.net && info.hud === comHud, JSON.stringify(info)];
    });

    await passo('personagens: o netrunner da wiki com pistola, armas de 2077 (Power, Tech e Smart), Kevlar e escudo; um NPC como alvo; cena com os dois', async () => {
      const montado = await no(`(async () => {
        let etapa = 'início';
        try {
          for (const c of [...game.combats]) await c.delete();
          for (const velha of game.scenes.filter(s => s.name === 'Painel teste')) await velha.delete();
          let usuario = game.users.getName('Jogador Painel');
          if (!usuario) usuario = await User.create({ name: 'Jogador Painel', role: CONST.USER_ROLES.PLAYER });
          etapa = 'importar da wiki';
          const { actor: pc } = await game.modules.get('cpr-2077').api.importarPersonagem(${JSON.stringify(personagem.id)}, '');
          etapa = 'NPC do compêndio';
          const pack = game.packs.get('cpr-2077.npcs-2077');
          const guarda = (await pack.getIndex()).find(i => i.name.startsWith('Guarda-costas'));
          const fonte = (await pack.getDocument(guarda._id)).toObject();
          delete fonte._id;
          const npc = await Actor.create({ ...fonte, name: 'Alvo Painel', prototypeToken: { ...fonte.prototypeToken, name: 'Alvo Painel' } });
          const doPack = async (colecao, filtro) => { const p = game.packs.get(colecao); const e = (await p.getIndex({ fields: ['system.variety', 'system.type'] })).find(filtro); if (!e) throw new Error(colecao + ': não achei'); return (await p.getDocument(e._id)).toObject(); };
          const arma = nome => doPack('cyberpunk-red-core.core_weapons', i => i.name === nome);
          const municao = (variedade, tipo = 'basic') => doPack('cyberpunk-red-core.core_ammo', i => i.system?.variety === variedade && i.system?.type === tipo);
          const armadura = nome => doPack('cyberpunk-red-core.core_armor', i => i.name === nome);
          const de2077 = nome => doPack('cpr-2077.armas-2077', i => i.name === nome);
          const carregar = async (a, dadosDaArma, dadosDaMunicao, quantidade) => {
            const [w] = await a.createEmbeddedDocuments('Item', [dadosDaArma]);
            dadosDaMunicao.system.amount = quantidade;
            const [m] = await a.createEmbeddedDocuments('Item', [dadosDaMunicao]);
            await w.installItems([m]);
            await a.items.get(w.id).reload();
            return w.id;
          };
          etapa = 'limpar o personagem';
          const fora = pc.items.filter(i => ['weapon', 'armor', 'ammo'].includes(i.type)).map(i => i.id);
          if (fora.length) await pc.deleteEmbeddedDocuments('Item', fora, { cprIsMigrating: true });
          etapa = 'armas';
          const ids = { pc: pc.id, npc: npc.id, usuario: usuario.id, nome: pc.name };
          ids.pistola = await carregar(pc, await arma('Heavy Pistol'), await municao('heavyPistol'), 16);
          ids.power = await carregar(pc, await de2077('Militech M-10AF Lexington'), await municao('medPistol'), 21);
          ids.tech = await carregar(pc, await de2077('Arasaka Senkoh LX'), await municao('medPistol'), 60);
          ids.smart = await carregar(pc, await de2077('Arasaka TKI-20 Shingen'), await municao('medPistol'), 30);
          etapa = 'armadura e escudo';
          const vestes = await pc.createEmbeddedDocuments('Item', await Promise.all(['Kevlar® (Body)', 'Kevlar® (Head)', 'Bullet Proof Shield'].map(armadura)));
          await pc.updateEmbeddedDocuments('Item', [ids.pistola, ids.power, ids.tech, ids.smart, ...vestes.map(i => i.id)].map(id => ({ _id: id, 'system.equipped': 'equipped' })));
          await pc.update({ 'system.derivedStats.hp.value': pc.system.derivedStats.hp.max, 'system.derivedStats.deathSave.penalty': 0, 'system.stats.luck.value': pc.system.stats.luck.max, ownership: { default: 0, [usuario.id]: 3 } });
          await usuario.update({ character: pc.id });
          etapa = 'cena';
          const scene = await Scene.create({ name: 'Painel teste', width: 3000, height: 2000, padding: 0, grid: { size: 100, distance: 2, units: 'm' }, tokenVision: false, fog: { exploration: false } });
          const criados = await scene.createEmbeddedDocuments('Token', [
            { name: pc.name, actorId: pc.id, actorLink: true, x: 1000, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } },
            { name: npc.name, actorId: npc.id, actorLink: true, x: 1500, y: 1000, texture: { src: 'icons/svg/mystery-man.svg' } }
          ]);
          ids.tPc = criados.find(t => t.actorId === pc.id).id;
          ids.tNpc = criados.find(t => t.actorId === npc.id).id;
          ids.cena = scene.id;
          await scene.activate();
          await scene.view();
          ids.hpMax = pc.system.derivedStats.hp.max;
          ids.grave = pc.system.derivedStats.seriouslyWounded;
          ids.deck = !!pc.itemTypes.cyberdeck.find(d => d.system.equipped === 'equipped');
          return ids;
        } catch (error) { return { erro: etapa + ': ' + String(error && error.stack || error).slice(0, 700) }; }
      })()`);
      if (montado.erro) return [false, montado.erro];
      Object.assign(ids, montado);
      return [ids.hpMax > 20 && ids.grave > 1 && ids.deck, JSON.stringify({ hp: ids.hpMax, grave: ids.grave, deck: ids.deck })];
    });

    await passo('o mestre controla o token: o painel mostra o netrunner (moldura com a imagem da ficha), HP, armadura, escudo, 10 atributos e as 4 armas com as classes de 2077', async () => {
      await sleep(800);
      await no(`canvas.tokens.get(${JSON.stringify(ids.tPc)}).control({ releaseOthers: true })`);
      const info = await esperar(edge, `(() => { const p = document.querySelector('#painel-tatico'); if (!p || p.classList.contains('pt-vazio') || p.querySelectorAll('.pt-arma').length < 4) return null; return {
        nome: p.querySelector('.pt-nome')?.textContent.trim(),
        hp: p.querySelector('.pt-hp-campo')?.value + '/' + (p.querySelector('.pt-hp-texto em')?.textContent || '').replace(/\\D/g, ''),
        retrato: p.querySelector('.pt-retrato')?.className,
        stats: p.querySelectorAll('.pt-stat').length,
        armas: p.querySelectorAll('.pt-arma').length,
        classes: [...p.querySelectorAll('.pt-pilula[class*="pt-classe-"]')].map(e => e.textContent.trim()).sort().join(),
        alertas: [...p.querySelectorAll('.pt-pilula.pt-alerta')].map(e => e.textContent.trim()).join(),
        modos2077: [...p.querySelectorAll('.pt-modo-2077')].map(b => b.dataset.modo).sort().join(),
        escudo: !!p.querySelector('[data-acao="armadura"][data-local="shield"]'),
        net: !!p.querySelector('[data-painel="net"]'),
        combatHud: (() => { const h = document.querySelector('#cpr-combat-hud'); return h ? getComputedStyle(h).display : 'sem'; })()
      }; })()`);
      await sleep(500);
      await edge.shot('mestre');
      const ok = info && info.nome === ids.nome && info.hp === `${ids.hpMax}/${ids.hpMax}` && info.stats === 10 && info.armas === 4 && info.classes === 'Power,Smart,Tech'
        && /sem Smart Link/.test(info.alertas) && info.modos2077 === 'cargaTech,rajadaTech,ricochete' && info.escudo && info.net && /pt-retrato-moldura/.test(info.retrato) && ['sem', 'none'].includes(info.combatHud);
      return [ok, JSON.stringify(info)];
    });

    await passo('retrato: PNG livre por estado; Levemente usa a base com efeito, Gravemente troca de imagem, Mortal usa a grave com efeito, derrotado vira Morto com FLATLINE', async () => {
      await no(`game.modules.get('${MODULO}').api.retrato.definir(${ator()}, { imagens: { notWounded: 'painel-teste/vex-ok.png', seriouslyWounded: 'painel-teste/vex-grave.png', dead: 'painel-teste/vex-morto.png' } })`);
      // Espera o painel redesenhar com o estado (e a imagem) esperados.
      const ler = (estado, imagem) => esperar(edge, `(() => { const r = document.querySelector('#painel-tatico .pt-retrato'); const img = r && r.querySelector('img'); if (!r || r.dataset.estado !== '${estado}' || !img.complete || !img.getAttribute('src').endsWith('${imagem}')) return null; return { src: img.getAttribute('src'), classe: r.className, flat: !!r.querySelector('.pt-flatline'), largura: img.naturalWidth, rotulo: document.querySelector('#painel-tatico .pt-estado')?.textContent.trim() }; })()`);
      const hp = valor => no(`${ator()}.update({ 'system.derivedStats.hp.value': ${valor} })`);
      const v = {};
      v.ok = await ler('notWounded', 'vex-ok.png');
      await sleep(300);
      await edge.shot('retrato-ok');
      await hp(ids.hpMax - 1);
      v.leve = await ler('lightlyWounded', 'vex-ok.png');
      await hp(Math.max(1, ids.grave - 1));
      v.grave = await ler('seriouslyWounded', 'vex-grave.png');
      await sleep(600);
      await edge.shot('retrato-grave');
      await hp(0);
      v.mortal = await ler('mortallyWounded', 'vex-grave.png');
      await edge.shot('retrato-mortal');
      await no(`${ator()}.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: true, overlay: true })`);
      v.morto = await ler('dead', 'vex-morto.png');
      await sleep(600);
      await edge.shot('retrato-morto');
      await no(`(async () => { const a = ${ator()}; await a.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { active: false }); await a.update({ 'system.derivedStats.hp.value': a.system.derivedStats.hp.max }); })()`);
      const ok = v.ok?.src.endsWith('vex-ok.png') && /pt-retrato-livre/.test(v.ok.classe) && !/pt-efeito/.test(v.ok.classe) && v.ok.largura === 240
        && v.leve?.src.endsWith('vex-ok.png') && /pt-efeito-lightlyWounded/.test(v.leve.classe)
        && v.grave?.src.endsWith('vex-grave.png') && !/pt-efeito/.test(v.grave.classe) && /pt-trocou/.test(v.grave.classe)
        && v.mortal?.src.endsWith('vex-grave.png') && /pt-efeito-mortallyWounded/.test(v.mortal.classe)
        && v.morto?.src.endsWith('vex-morto.png') && v.morto.flat && /Morto/.test(v.morto.rotulo);
      return [ok, JSON.stringify(v)];
    });

    await passo('vitais: −5 e +1 no HP, o número digitado, a ablação da armadura do corpo e o conserto, e a Sorte', async () => {
      await esperar(edge, `${ator()}.system.derivedStats.hp.value === ${ids.hpMax} && document.querySelector('#painel-tatico .pt-retrato')?.dataset.estado === 'notWounded'`);
      const valor = caminho => no(`${ator()}.${caminho}`);
      const r1 = {};
      await clicar(edge, '#painel-tatico .pt-passo[data-valor="-5"]');
      r1.menos5 = await esperar(edge, `${ator()}.system.derivedStats.hp.value === ${ids.hpMax - 5} ? ${ids.hpMax - 5} : null`);
      await sleep(200);
      await clicar(edge, '#painel-tatico .pt-passo[data-valor="1"]');
      r1.mais1 = await esperar(edge, `${ator()}.system.derivedStats.hp.value === ${ids.hpMax - 4} ? ${ids.hpMax - 4} : null`);
      await sleep(200);
      await no(`(() => { const c = document.querySelector('#painel-tatico .pt-hp-campo'); c.focus(); c.value = '12'; c.dispatchEvent(new Event('change', { bubbles: true })); c.blur(); })()`);
      r1.digitado = await esperar(edge, `${ator()}.system.derivedStats.hp.value === 12 ? 12 : null`);
      const corpo = `${ator()}.itemTypes.armor.find(i => i.system.isBodyLocation && !i.system.isShield)`;
      const sp = await no(`${corpo}.system.bodyLocation.sp`);
      const chip = () => no(`document.querySelector('#painel-tatico [data-acao="armadura"][data-local="body"]')?.closest('.pt-ficha').querySelector('.pt-ficha-valor').textContent.trim()`);
      r1.chipAntes = await chip();
      await sleep(200);
      await clicar(edge, '#painel-tatico [data-acao="armadura"][data-local="body"][data-valor="-1"]');
      r1.ablacao = await esperar(edge, `${corpo}.system.bodyLocation.ablation === 1 ? 'ablação 1' : null`);
      await sleep(300);
      r1.chipDepois = await chip();
      await sleep(200);
      await clicar(edge, '#painel-tatico [data-acao="armadura"][data-local="body"][data-valor="1"]');
      r1.conserto = await esperar(edge, `${corpo}.system.bodyLocation.ablation === 0 ? 'ok' : null`);
      const sorte = await valor('system.stats.luck.value');
      await sleep(200);
      await clicar(edge, '#painel-tatico [data-acao="sorte"][data-valor="-1"]');
      r1.sorte = await esperar(edge, `${ator()}.system.stats.luck.value === ${sorte - 1} ? '${sorte}→${sorte - 1}' : null`);
      await no(`${ator()}.update({ 'system.derivedStats.hp.value': ${ids.hpMax}, 'system.stats.luck.value': ${sorte} })`);
      return [r1.menos5 && r1.mais1 && r1.digitado && r1.ablacao && r1.conserto && r1.sorte && r1.chipAntes === `${sp}/${sp}` && r1.chipDepois === `${sp - 1}/${sp}`, JSON.stringify(r1)];
    });

    await passo('rolagens pelo caminho da ficha: REF com Ctrl (sem janela) e a Evasão achada na busca do painel de perícias; a estrela põe a Evasão na barra', async () => {
      const antes = await mensagens();
      await clicar(edge, '#painel-tatico .pt-stat[data-stat="ref"]', { ctrl: true });
      const stat = await esperar(edge, `game.messages.size > ${antes} ? game.messages.contents.at(-1).speaker.alias : null`);
      await clicar(edge, '#painel-tatico [data-acao="painel"][data-painel="pericias"]');
      await esperar(edge, `!!document.querySelector('#painel-tatico .pt-painel-pericias')`);
      await no(`(() => { const b = document.querySelector('#painel-tatico .pt-busca'); b.value = 'evas'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      const visiveis = await no(`[...document.querySelectorAll('#painel-tatico .pt-painel-pericias .pt-linha')].filter(l => !l.hidden && l.offsetParent).map(l => l.querySelector('.pt-linha-nome').textContent)`);
      await edge.shot('pericias');
      const meio = await mensagens();
      await clicar(edge, '#painel-tatico .pt-painel-pericias .pt-linha:not([hidden]) .pt-linha-nome', { ctrl: true });
      const pericia = await esperar(edge, `game.messages.size > ${meio} ? game.messages.contents.at(-1).speaker.alias : null`);
      await clicar(edge, '#painel-tatico .pt-painel-pericias .pt-linha:not([hidden]) .pt-estrela');
      const favorita = await esperar(edge, `[...document.querySelectorAll('#painel-tatico .pt-favorita')].map(b => b.textContent.trim()).join() || null`);
      await clicar(edge, '#painel-tatico [data-acao="fecharPainel"]');
      return [stat === ids.nome && visiveis.join() === 'Evasion' && pericia === ids.nome && /Evasion/.test(favorita || ''), `REF: ${stat} · busca: ${visiveis.join()} · perícia: ${pericia} · favoritas: ${favorita}`];
    });

    await passo('modos: o mirado grava a flag da ficha e o local (perna); o Ricochete do cpr-2077 liga e desliga na arma Power', async () => {
      const flag = id => no(`${ator()}.getFlag('cyberpunk-red-core', 'firetype-${id}') || ''`);
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="aimed"][data-item="${ids.pistola}"]`);
      const mirado = await esperar(edge, `${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.pistola}') === 'aimed' && document.querySelector('#painel-tatico .pt-local') ? true : null`);
      await no(`(() => { const s = document.querySelector('#painel-tatico .pt-local'); s.value = 'leg'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      const local = await esperar(edge, `${ator()}.getFlag('cyberpunk-red-core', 'aimedLocation') === 'leg' ? 'leg' : null`);
      await sleep(200);
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="aimed"][data-item="${ids.pistola}"]`);
      await esperar(edge, `!${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.pistola}')`);
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="ricochete"][data-item="${ids.power}"]`);
      const ricochete = await esperar(edge, `${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.power}') === 'ricochete' && document.querySelector('#painel-tatico .pt-modo[data-modo="ricochete"].pt-ativa') ? document.querySelector('#painel-tatico .pt-arma[data-item="${ids.power}"] .pt-modo-nome')?.textContent : null`);
      await edge.shot('modo-ricochete');
      await sleep(200);
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="ricochete"][data-item="${ids.power}"]`);
      await esperar(edge, `!${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.power}')`);
      const fim = [await flag(ids.pistola), await flag(ids.power)].join('|');
      return [mirado && local === 'leg' && ricochete === 'Ricochete' && fim === '|', `mirado ${mirado} · local ${local} · ricochete "${ricochete}" · depois "${fim}"`];
    });

    await passo('ATK com alvo marcado entra no Fluxo de Combate: o painel mostra o alvo ligado ao Fluxo, a defesa do NPC sai (escolhida pelo mestre ou pelo módulo) e o resultado vem no cartão', async () => {
      await no(`window.__uniforme = window.__uniforme || CONFIG.Dice.randomUniform; CONFIG.Dice.randomUniform = () => 0.99`);
      await no(`game.user.updateTokenTargets([${JSON.stringify(ids.tNpc)}])`);
      const alvo = await esperar(edge, `(() => { const a = document.querySelector('#painel-tatico .pt-alvo'); return a && a.classList.contains('pt-fluxo-pronto') ? a.querySelector('.pt-alvo-nomes').textContent : null; })()`);
      const antes = await no(`game.modules.get('fluxo-de-combate').api.ultimo?.ataque || null`);
      await clicar(edge, `#painel-tatico .pt-atk[data-item="${ids.pistola}"]`, { ctrl: true });
      // Com mais de uma defesa possível (REF 8+ esquiva), o mestre escolhe numa janela; com uma só, o Fluxo resolve.
      const u = await esperar(edge, `(() => {
        const janela = document.querySelector('.fluxo-defesa [data-escolha="aguentar"]');
        if (janela) { window.__defesaPeloMestre = true; janela.click(); }
        const u = game.modules.get('fluxo-de-combate').api.ultimo;
        return u && u.ataque !== ${JSON.stringify(antes)} ? { linhas: u.linhas.map(l => [l.token, l.resultado]) } : null;
      })()`, 150);
      const opcoes = (await no('window.__defesaPeloMestre || false')) ? 'o mestre escolheu' : 'automática';
      await no(`CONFIG.Dice.randomUniform = window.__uniforme`);
      await edge.shot('fluxo');
      const cartao = await no(`!!document.querySelector('#chat-log .fluxo-cartao')`);
      return [alvo === 'Alvo Painel' && u && u.linhas[0][0] === ids.tNpc && cartao, `alvo ${alvo} · defesa ${opcoes} · ${JSON.stringify(u)} · cartão do Fluxo ${cartao}`];
    });

    await passo('Carga Tech pelo painel: o cpr-2077 pergunta a cobertura antes da janela do sistema (fechar cancela sem rolar)', async () => {
      await sleep(500);
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="cargaTech"][data-item="${ids.tech}"]`);
      await esperar(edge, `${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.tech}') === 'cargaTech' && document.querySelector('#painel-tatico .pt-modo[data-modo="cargaTech"].pt-ativa')`);
      const antes = await mensagens();
      await clicar(edge, `#painel-tatico .pt-atk[data-item="${ids.tech}"]`);
      const pergunta = await esperar(edge, `(() => { const d = [...foundry.applications.instances.values()].find(a => /Carga Tech/.test(a.title || '') && a.rendered); return d ? d.title + ' | ' + (d.element.querySelector('select[name="cobertura"]') ? 'cobertura' : '') : null; })()`);
      await edge.shot('carga-tech');
      await no(`(() => { const d = [...foundry.applications.instances.values()].find(a => /Carga Tech/.test(a.title || '')); return d && d.close(); })()`);
      await sleep(800);
      const depois = await mensagens();
      await clicar(edge, `#painel-tatico .pt-modo[data-modo="cargaTech"][data-item="${ids.tech}"]`);
      await esperar(edge, `!${ator()}.getFlag('cyberpunk-red-core', 'firetype-${ids.tech}')`);
      return [/cobertura/.test(pergunta || '') && depois === antes, `pergunta "${pergunta}" · mensagens ${antes}→${depois}`];
    });

    await passo('sem alvo marcado, ATK vira mira no mapa; Esc (tecla de verdade) cancela sem rolar e sem soltar o token', async () => {
      await no(`game.user.updateTokenTargets([])`);
      await esperar(edge, `document.querySelector('#painel-tatico .pt-alvo-nomes')?.classList.contains('pt-apagado')`);
      const antes = await mensagens();
      await clicar(edge, `#painel-tatico .pt-atk[data-item="${ids.pistola}"]`);
      const mira = await esperar(edge, `!!document.querySelector('#painel-tatico-mira')`);
      await edge.shot('mira');
      await edge.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await edge.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      const sumiu = await esperar(edge, `!document.querySelector('#painel-tatico-mira')`);
      await sleep(500);
      const controlado = await no(`canvas.tokens.controlled.map(t => t.id).join()`);
      return [mira && sumiu && (await mensagens()) === antes && controlado === ids.tPc, `mira ${mira} · sumiu ${sumiu} · controlado ${controlado || 'nenhum'}`];
    });

    await passo('NET Architect: conectado num ponto de acesso, o painel ganha o selo NET (abre a janela da NET) e o painel NET desconecta', async () => {
      const controladoAntes = await no(`canvas.tokens.controlled.map(t => t.id).join()`);
      const ponto = await no(`(async () => {
        let pack = null;
        for (let i = 0; i < 40 && !(pack = game.packs.get('world.arquiteturas-net')); i++) await new Promise(r => setTimeout(r, 250));
        const indice = await pack.getIndex();
        const item = await pack.getDocument(indice.contents[0]._id);
        const cena = game.scenes.get(${JSON.stringify(ids.cena)});
        const [tile] = await cena.createEmbeddedDocuments('Tile', [{ x: 1100, y: 1100, width: 100, height: 100, texture: { src: 'icons/svg/net.svg' } }]);
        await tile.setFlag('net-architect', 'pontoDeAcesso', { ativo: true, nome: 'Servidor do teste', arquitetura: item.uuid, dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, dvScanner: 10, reiniciar: true, ligacoes: [], revelados: [] });
        try { await game.modules.get('net-architect').api.conectar(tile, canvas.tokens.get(${JSON.stringify(ids.tPc)})); } catch (error) { return { tile: tile.id, erro: error.message }; }
        return { tile: tile.id };
      })()`);
      ids.tile = ponto.tile;
      const selo = await esperar(edge, `document.querySelector('#painel-tatico .pt-selo-net')?.textContent.trim() || null`, 80);
      if (!selo) {
        const diag = await no(`(() => { const t = canvas.tokens.get(${JSON.stringify(ids.tPc)}); return { antes: ${JSON.stringify(controladoAntes)}, conectar: ${JSON.stringify(ponto)}, controlados: canvas.tokens.controlled.map(c => c.name), conexao: t?.document.getFlag('net-architect', 'conexao') || null, painel: document.querySelector('#painel-tatico .pt-nome')?.textContent || null, token: game.modules.get('${MODULO}').api.painel.token?.id || null, selos: [...document.querySelectorAll('#painel-tatico .pt-selo')].map(s => s.textContent.trim()) }; })()`);
        return [false, `sem o selo NET: ${JSON.stringify(diag)}`];
      }
      for (const janela of await no(`[...foundry.applications.instances.values()].filter(a => a.id.startsWith('net-architect-')).map(a => a.id)`)) await no(`foundry.applications.instances.get(${JSON.stringify(janela)})?.close({ animate: false })`);
      await sleep(400);
      await clicar(edge, '#painel-tatico .pt-selo-net');
      const janela = await esperar(edge, `!!document.querySelector('#net-architect-${ids.tile}-${ids.tPc}')`);
      await edge.shot('net');
      await clicar(edge, '#painel-tatico [data-acao="painel"][data-painel="net"]');
      const botoes = await esperar(edge, `[...document.querySelectorAll('#painel-tatico .pt-painel-net button')].map(b => b.textContent.trim()).filter(Boolean).join() || null`);
      await clicar(edge, '#painel-tatico .pt-painel-net [data-acao="desconectar"]');
      await esperar(edge, `!!document.querySelector('dialog.application, .application.dialog')`);
      await no(`(() => { const d = [...document.querySelectorAll('dialog.application, .application.dialog')].find(e => /Desconectar/.test(e.textContent)); d?.querySelector('[data-action="yes"]')?.click(); })()`);
      const saiu = await esperar(edge, `!canvas.tokens.get(${JSON.stringify(ids.tPc)}).document.getFlag('net-architect', 'conexao') && !document.querySelector('#painel-tatico .pt-selo-net')`, 80);
      return [/NET/.test(selo || '') && janela && /Janela da NET/.test(botoes || '') && /Desconectar/.test(botoes || '') && saiu, `selo "${selo}" · janela ${janela} · botões ${botoes} · desconectou ${saiu}`];
    });

    await passo('estilo: a janela troca o tema (Arasaka), muda a ordem das seções, aplica um código PT1 de outro jogador e volta ao padrão da mesa', async () => {
      await no(`for (const a of [...foundry.applications.instances.values()]) if (a.id.startsWith('net-architect-')) a.close({ animate: false })`);
      await clicar(edge, '#painel-tatico [data-acao="estilo"]');
      await esperar(edge, `!!document.querySelector('#painel-tatico-estilo .pt-temas')`);
      await no(`document.querySelector('#painel-tatico-estilo [data-action="tema"][data-tema="arasaka"]').click()`);
      const arasaka = await esperar(edge, `(() => { const p = document.querySelector('#painel-tatico'); return p.style.getPropertyValue('--pt-acento') === '#ff1f3d' && game.settings.get('${MODULO}', 'estilo')?.tema === 'arasaka' ? p.style.getPropertyValue('--pt-acento') : null; })()`);
      await sleep(300);
      await no(`document.querySelector('#painel-tatico-estilo [data-action="descer"][data-secao="vitais"]').click()`);
      const ordem = await esperar(edge, `(() => { const s = [...document.querySelectorAll('#painel-tatico .pt-corpo > .pt-secao')].map(e => [...e.classList].find(c => c !== 'pt-secao').slice(3)); return s[0] === 'atributos' ? s.join() : null; })()`);
      await sleep(300);
      await edge.shot('estilo-arasaka');
      const codigo = await no(`game.modules.get('${MODULO}').api.estilo.codigo({ ...game.modules.get('${MODULO}').api.estilo.atual(), tema: 'netrunner', acento: '#b26bff', acento2: '#29e5f5', destaque: '#ff5ec4', fundo: '#0a0614', texto: '#efe6ff', fonte: 'bruno' })`);
      await no(`(() => { const t = document.querySelector('#painel-tatico-estilo [name="colado"]'); t.value = ${JSON.stringify(codigo)}; document.querySelector('#painel-tatico-estilo [data-action="colar"]').click(); })()`);
      const colado = await esperar(edge, `(() => { const p = document.querySelector('#painel-tatico'); return p.style.getPropertyValue('--pt-acento') === '#b26bff' ? p.style.getPropertyValue('--pt-fonte') : null; })()`);
      await sleep(400);
      await edge.shot('estilo-netrunner');
      // Um campo do formulário: o tamanho do painel (arrastando muda na hora; soltando, salva).
      await no(`(() => { const f = document.querySelector('#painel-tatico-estilo input[name="escala"]'); f.value = '90'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      const tamanho = await esperar(edge, `document.querySelector('#painel-tatico').style.getPropertyValue('--pt-escala') === '0.9' && game.settings.get('${MODULO}', 'estilo')?.escala === 90 ? '90%' : null`);
      await no(`document.querySelector('#painel-tatico-estilo [data-action="padraoDaMesa"]').click()`);
      const padrao = await esperar(edge, `(() => { const p = document.querySelector('#painel-tatico'); return game.settings.get('${MODULO}', 'estilo') === null && p.style.getPropertyValue('--pt-acento') === '#00ffd2' && p.querySelector('.pt-corpo > .pt-secao')?.classList.contains('pt-vitais'); })()`);
      await no(`foundry.applications.instances.get('painel-tatico-estilo')?.close({ animate: false })`);
      return [arasaka && ordem === 'atributos,vitais,armas,acoes' && /Bruno Ace/.test(colado || '') && tamanho && padrao, `Arasaka ${arasaka} · ordem ${ordem} · colado ${colado} · tamanho ${tamanho} · padrão ${padrao}`];
    });

    await passo('posição: arrastar pela alça leva o painel para onde soltou (posição livre salva); dois cliques na alça voltam para a base', async () => {
      const antes = await no(`(() => { const r = document.querySelector('#painel-tatico').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) }; })()`);
      await no(`(() => {
        const alca = document.querySelector('#painel-tatico .pt-alca');
        const r = alca.getBoundingClientRect();
        const x = r.left + 4, y = r.top + 4;
        alca.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1 }));
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x - 200, clientY: y - 300, pointerId: 1 }));
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x - 200, clientY: y - 300, pointerId: 1 }));
      })()`);
      const salvo = await esperar(edge, `(() => { const e = game.settings.get('${MODULO}', 'estilo'); return e && e.posicao === 'livre' ? { x: e.x, y: e.y } : null; })()`);
      await sleep(300);
      const depois = await no(`(() => { const r = document.querySelector('#painel-tatico').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), livre: document.querySelector('#painel-tatico').classList.contains('pt-posicao-livre') }; })()`);
      await edge.shot('arrastado');
      await no(`document.querySelector('#painel-tatico .pt-alca').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
      const base = await esperar(edge, `game.settings.get('${MODULO}', 'estilo')?.posicao === 'base' && document.querySelector('#painel-tatico').classList.contains('pt-posicao-base')`);
      const ok = salvo && Math.abs(salvo.x - (antes.x - 200)) <= 2 && Math.abs(salvo.y - (antes.y - 300)) <= 2 && depois.livre && Math.abs(depois.x - salvo.x) <= 2 && base;
      await no(`game.settings.set('${MODULO}', 'estilo', null)`);
      return [ok, `antes ${JSON.stringify(antes)} · salvo ${JSON.stringify(salvo)} · depois ${JSON.stringify(depois)} · base ${base}`];
    });

    await passo('recolher e abrir: o botão deixa só a tira com o retrato e o HP; clicar nela abre de novo', async () => {
      await clicar(edge, '#painel-tatico .pt-ferramentas [data-acao="recolher"]');
      const mini = await esperar(edge, `document.querySelector('#painel-tatico .pt-mini-hp')?.textContent.trim() || null`);
      await edge.shot('recolhido');
      await clicar(edge, '#painel-tatico .pt-mini-botao');
      const aberto = await esperar(edge, `!!document.querySelector('#painel-tatico .pt-barra') && !game.settings.get('${MODULO}', 'recolhido')`);
      return [new RegExp(`${ids.hpMax}/${ids.hpMax}`).test(mini || '') && aberto, `tira "${mini}" · aberto ${aberto}`];
    });

    await passo('janela do retrato (botão direito no retrato): os 5 estados com a prévia; mudar o tamanho e salvar grava no ator', async () => {
      await clicar(edge, '#painel-tatico .pt-retrato-alvo', { direito: true });
      const linhas = await esperar(edge, `document.querySelectorAll('.pt-janela-retrato .pt-rc-linha').length || null`);
      const previa = await no(`document.querySelector('.pt-janela-retrato .pt-rc-palco .pt-retrato img')?.getAttribute('src') || ''`);
      await no(`(() => { const f = document.querySelector('.pt-janela-retrato input[name="escala"]'); f.value = '140'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await sleep(400);
      await no(`document.querySelector('.pt-janela-retrato [data-action="verEstado"][data-estado="dead"]').click()`);
      await sleep(500);
      await edge.shot('janela-retrato');
      await no(`document.querySelector('.pt-janela-retrato [data-action="salvar"]').click()`);
      const salvo = await esperar(edge, `(() => { const r = ${ator()}.getFlag('${MODULO}', 'retrato'); return r && r.escala === 140 ? [r.escala, r.imagens.notWounded, r.imagens.lightlyWounded === ''].join('|') : null; })()`);
      const noPainel = await esperar(edge, `/height: 140%/.test(document.querySelector('#painel-tatico .pt-retrato img')?.getAttribute('style') || '')`);
      return [linhas === 5 && previa.endsWith('vex-ok.png') && salvo === '140|painel-teste/vex-ok.png|true' && noPainel, `linhas ${linhas} · prévia ${previa} · salvo ${salvo} · no painel ${noPainel}`];
    });

    await passo('jogador entra: sem selecionar nada, vê o próprio personagem com o retrato; troca o tema dele (Militech) sem mudar o do mestre', async () => {
      await foundry.entrarComo(jogador, mesa.url, 'Jogador Painel');
      await jogador.evaluate(`(() => { for (const app of Object.values(ui.windows)) app.close(); for (const app of foundry.applications.instances.values()) app.close({ animate: false }); canvas.tokens.releaseAll(); })()`).catch(() => {});
      const visto = await esperar(jogador, `(() => { const p = document.querySelector('#painel-tatico'); return p && !p.classList.contains('pt-vazio') && p.querySelector('.pt-retrato img')?.complete ? { nome: p.querySelector('.pt-nome')?.textContent.trim(), src: p.querySelector('.pt-retrato img').getAttribute('src'), retratoBotao: !!p.querySelector('[data-acao="retrato"]') } : null; })()`, 100);
      await jogador.evaluate(`game.modules.get('${MODULO}').api.estilo.abrir()`);
      await esperar(jogador, `!!document.querySelector('#painel-tatico-estilo [data-tema="militech"]')`);
      await jogador.evaluate(`document.querySelector('#painel-tatico-estilo [data-tema="militech"]').click()`);
      const dele = await esperar(jogador, `document.querySelector('#painel-tatico').style.getPropertyValue('--pt-acento') === '#c8d64b' ? 'militech' : null`);
      await jogador.evaluate(`foundry.applications.instances.get('painel-tatico-estilo')?.close({ animate: false })`);
      await sleep(600);
      await jogador.shot('painel');
      const doMestre = await no(`game.modules.get('${MODULO}').api.estilo.atual().tema`);
      await jogador.evaluate(`game.settings.set('${MODULO}', 'estilo', null)`);
      return [visto && visto.nome === ids.nome && visto.src.endsWith('vex-ok.png') && visto.retratoBotao && dele === 'militech' && doMestre === 'morana', `${JSON.stringify(visto)} · jogador ${dele} · mestre ${doMestre}`];
    });
  } finally {
    // O mundo de teste volta com os módulos como estavam para os outros cenários.
    if (ids.config) await edge.evaluate(`game.settings.set('core', 'moduleConfiguration', ${JSON.stringify(ids.config)})`).catch(() => {});
    for (const navegador of [edge, jogador]) await navegador.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
    await sleep(500);
    // Só contam os erros deste módulo (o Foundry desligando e os outros módulos falam no console por conta própria).
    const doFoundry = edge.erros.splice(errosAntes);
    const doJogador = jogador.erros.splice(0);
    edge.erros.push(...[...doFoundry, ...doJogador].filter(erro => /painel-tatico/.test(erro)));
    await jogador.fechar().catch(() => {});
    await mesa.parar();
  }
};
