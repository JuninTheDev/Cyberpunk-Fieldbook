// Sistema Cyberpunk RED — Fieldbook no Foundry 14 de verdade (tests/lib/foundry14.js):
// - as regras puras, no Node;
// - no Foundry: ficha, crítico do d10, catálogo, cyberware que só vale instalado, recarregar, o ataque com a defesa
//   no cliente do jogador do alvo e o dano na ficha, e a importação de um personagem feito na wiki de teste.
// Os dados ficam fixos onde a conta importa: CONFIG.Dice.randomUniform devolve os lados pedidos, em ordem.
// Só roda com a mesa do servidor vazia: a licença do Foundry vale para uma mesa por vez.
const path = require('path');
const { pathToFileURL } = require('url');
const foundry14 = require('../lib/foundry14');
const { mesaOcupada } = require('../lib/foundry');
const { abrirEdge } = require('../lib/edge');

module.exports = async ({ edge, servidores, r }) => {
  // ---------- Regras, sem Foundry ----------
  const regras = await import(pathToFileURL(path.join(servidores.raiz, 'foundry-sistema', 'scripts', 'regras.mjs')).href);
  await r.passo('regras: HP, ferimentos e Humanidade', async () => {
    const hp = regras.hpMaximo(6, 7);
    const grave = regras.estadoDeFerimento(22, 45);
    const leve = regras.estadoDeFerimento(23, 45);
    const mortal = regras.estadoDeFerimento(0, 45);
    return [hp === 45 && grave.penalidade === -2 && leve.chave === 'leve' && mortal.penalidade === -4 && regras.empAtual(47, 5) === 4 && regras.empAtual(80, 5) === 5,
      `HP ${hp} · 22/45 ${grave.chave} · 23/45 ${leve.chave} · EMP ${regras.empAtual(47, 5)}`];
  });
  await r.passo('regras: dano contra armadura (só o bônus, cabeça ×2, arma branca, não letal, ignora abaixo de SP)', async () => {
    const segurou = regras.aplicarDano({ dano: 10, bonus: 5, sp: 11, hpAtual: 40 });
    const cabeca = regras.aplicarDano({ dano: 15, sp: 11, local: 'cabeca', hpAtual: 40 });
    const branca = regras.aplicarDano({ dano: 10, sp: 11, ignorarPct: 50, hpAtual: 40 });
    const naoLetal = regras.aplicarDano({ dano: 30, sp: 0, letal: false, hpAtual: 12 });
    const ignora = regras.aplicarDano({ dano: 5, sp: 7, ignorarAbaixo: 8, hpAtual: 40 });
    const ok = segurou.recebido === 5 && !segurou.ablar && cabeca.recebido === 8 && cabeca.ablar && branca.spEfetivo === 6 && branca.recebido === 4 && naoLetal.recebido === 11 && ignora.recebido === 5;
    return [ok, JSON.stringify({ segurou: segurou.recebido, cabeca: cabeca.recebido, branca: [branca.spEfetivo, branca.recebido], naoLetal: naoLetal.recebido, ignora: ignora.recebido })];
  });
  await r.passo('regras: defesa (tiro só com REF 8+, corpo a corpo sempre, empate do defensor, DV pela distância)', async () => {
    const tiroRef6 = regras.opcoesDeDefesa({ modo: 'tiro', esquiva: regras.podeEsquivar({ modo: 'tiro', ref: 6 }) });
    const tiroRef8 = regras.opcoesDeDefesa({ modo: 'tiro', esquiva: regras.podeEsquivar({ modo: 'tiro', ref: 8 }) });
    const corpo = regras.opcoesDeDefesa({ modo: 'corpo', esquiva: regras.podeEsquivar({ modo: 'corpo', ref: 2 }) });
    const empate = regras.acertou({ modo: 'tiro', escolha: 'esquivar', ataque: 15, defesa: 15 });
    const faixas = [[0, 6, 17], [7, 12, 16], [13, 25, 15]];
    const ok = tiroRef6.join() === 'aguentar' && tiroRef8.join() === 'esquivar,aguentar' && corpo.join() === 'esquivar' && empate === false
      && regras.dvPelaDistancia(faixas, 10).dv === 16 && regras.dvPelaDistancia(faixas, 30).fora && regras.danoCritico([6, 2, 6]) && !regras.danoCritico([6, 5, 4]);
    return [ok, JSON.stringify({ tiroRef6, tiroRef8, corpo, empate })];
  });

  await r.passo('regras: autofogo, Death Save, Lesão Crítica, modos, Concentração e a área do explosivo', async () => {
    const checagens = {
      'autofogo até o máximo': regras.multiplicadorDeAutofogo(31, 20, 4) === 4 && regras.multiplicadorDeAutofogo(21, 20, 4) === 1,
      'Death Save: menos que BODY, o 10 sempre falha': regras.passouNoDeathSave({ natural: 3, total: 3, body: 5 }) && !regras.passouNoDeathSave({ natural: 10, total: 10, body: 12 }) && !regras.passouNoDeathSave({ natural: 5, total: 5, body: 5 }),
      'tabela de lesão': regras.lesaoNaTabela([[2, 2, 'a'], [3, 4, 'b']], 4) === 'b',
      'modos pela munição e pelo botão': regras.classificar({ municao: 'grenade' }) === 'explosivo' && regras.classificar({ municao: 'shotgunShell' }) === 'cartucho' && regras.classificar({ aDistancia: false }) === 'corpo' && regras.classificar({ pedido: 'autofogo' }) === 'autofogo',
      'explosivo: empate na esquiva fica na área': regras.acertou({ modo: 'explosivo', escolha: 'esquivar', ataque: 15, defesa: 15 }) === true,
      'supressivo: só Concentração; perder é ser suprimido': regras.opcoesDeDefesa({ modo: 'supressivo', esquiva: true }).join() === 'concentrar' && regras.acertou({ modo: 'supressivo', escolha: 'concentrar', ataque: 15, defesa: 14 }) === true,
      'área de 10 × 10 m': regras.dentroDaArea({ x: 0, y: 0 }, { x: 250, y: -250 }, 250) && !regras.dentroDaArea({ x: 0, y: 0 }, { x: 251, y: 0 }, 250),
      'tabela de autofogo': regras.tabelasCandidatas('DV Pistol', 'autofogo')[0] === 'DV Pistol (Autofire)'
    };
    const falhas = Object.entries(checagens).filter(([, ok]) => !ok).map(([nome]) => nome);
    return [!falhas.length, falhas.join(' · ')];
  });

  // ---------- Personagem na wiki de teste (antes do Foundry: o criador roda neste navegador) ----------
  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)}) || {}).textContent || ''`);
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  let solo;
  await r.passo('wiki: Solo (Rato de Rua) com o resultado calculado pelo criador', async () => {
    const { personagem } = await api('/api/personagens', 'POST', { metodo: 'ratoderua', sorteio: { linha: 6 }, lingua: 'Portuguese', casa: 'Heywood', nome: 'Teste Sistema', apelido: 'Lab', role: 'solo', habilidades: { 'Initiative Reaction': 2, 'Threat Detection': 2 }, lifepath });
    await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
    await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
    for (let i = 0; i < 30 && !/Salvo/.test(await texto('#cc-save')); i++) await edge.sleep(200);
    solo = (await api(`/api/personagens/${personagem.id}`)).personagem;
    return [solo.resultado && solo.resultado.itens.length > 5, `${solo.resultado?.itens.length} itens · HP ${solo.resultado?.derivados?.hp}`];
  });

  // ---------- Foundry 14 ----------
  if (!foundry14.disponivel()) { await r.passo(`${foundry14.motivoIndisponivel()}: parte do Foundry pulada`, async () => [true, '']); return; }
  const ocupada = await mesaOcupada(servidores.raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): parte do Foundry pulada`, async () => [true, '']); return; }

  foundry14.preparar();
  const mesa = await foundry14.subir();
  const errosAntes = edge.erros.length;
  let jogador = null;
  // Fixa os próximos dados no navegador: cada par é [lado, faces]. Acabou a fila, volta o aleatório.
  const fixar = (navegador, lados) => navegador.evaluate(`(() => {
    window.__fila = ${JSON.stringify(lados)};
    CONFIG.Dice.randomUniform = () => { const p = window.__fila.shift(); return p ? 1 - (p[0] - 0.5) / p[1] : foundry.dice.MersenneTwister.random(); };
    return true;
  })()`);
  const S = foundry14.SISTEMA;
  try {
    await r.passo('Foundry 14 abre o mundo de teste com o sistema, como Gamemaster', async () => {
      await foundry14.entrarComoMestre(edge, mesa.url);
      const info = await edge.evaluate(`({ geracao: game.release.generation, build: game.release.build, sistema: game.system.id, versao: game.system.version, gm: game.user.isGM, api: Object.keys(game.system.api || {}) })`);
      return [info.geracao === 14 && info.sistema === S && info.gm && info.api.includes('combate'), JSON.stringify(info)];
    });

    await r.passo('compêndios: armas, armaduras, munição, cyberware, lesões e os personagens de exemplo; o Solo de exemplo entra pronto para o combate', async () => {
      const info = await edge.evaluate(`(async () => {
        const tamanhos = Object.fromEntries(game.packs.filter(p => p.metadata.packageName === '${S}').map(p => [p.metadata.name, p.index.size]));
        const pack = game.packs.get('${S}.exemplos');
        const entrada = pack.index.find(e => e.name === 'Solo (exemplo)');
        const ator = await game.actors.importFromCompendium(pack, entrada._id);
        const rifle = ator.items.getName('Assault Rifle');
        const resumo = { hp: ator.system.hp.value, ini: ator.system.iniciativa, sp: [ator.system.armadura.cabeca.sp, ator.system.armadura.corpo.sp], pente: rifle.system.pente.value, municao: rifle.municaoCarregada?.name, hum: ator.system.humanidade.value };
        await ator.delete();
        return { tamanhos, resumo };
      })()`);
      const t = info.tamanhos;
      const s = info.resumo;
      return [t.armas === 100 && t.armaduras === 18 && t.municao === 55 && t.cyberware === 105 && t.lesoes === 22 && t.exemplos === 2 && s.hp === 45 && s.ini === 10 && s.sp.join() === '11,11' && s.pente === 25 && s.municao === 'Rifle (Basic)' && s.hum === 36,
        JSON.stringify(info)];
    });

    await r.passo('personagem novo: HP 10 + 5 × (BODY + WILL) / 2, Humanidade EMP × 10, token ligado à ficha', async () => {
      const info = await edge.evaluate(`(async () => {
        const a = await Actor.implementation.create({ name: 'Atiradora', type: 'personagem', system: { atributos: { body: { valor: 6 }, will: { valor: 7 }, emp: { valor: 5 }, ref: { valor: 8 }, dex: { valor: 7 }, luck: { valor: 6 } }, hp: { value: 45 }, humanidade: { value: 50 }, pericias: { handgun: { nivel: 4 }, 'shoulder-arms': { nivel: 4 }, evasion: { nivel: 2 } } } });
        return { hp: a.system.hp.max, hum: a.system.humanidade.max, sorte: a.system.sorte.max, emp: a.system.empAtual, ligado: a.prototypeToken.actorLink, barra: a.prototypeToken.bar1.attribute, estado: a.system.ferimento.chave, ini: a.system.iniciativa };
      })()`);
      return [info.hp === 45 && info.hum === 50 && info.sorte === 6 && info.emp === 5 && info.ligado && info.barra === 'hp' && info.estado === 'ileso' && info.ini === 8, JSON.stringify(info)];
    });

    await r.passo('teste de perícia: REF 8 + Pistola 4 + 1d10; o 10 soma mais um d10 e o 1 tira um d10', async () => {
      await fixar(edge, [[10, 10], [3, 10]]);
      const alto = await edge.evaluate(`game.actors.getName('Atiradora').rolarPericia('handgun').then(t => ({ total: t.total, critico: t.critico, formula: t.roll.formula }))`);
      await fixar(edge, [[1, 10], [4, 10]]);
      const baixo = await edge.evaluate(`game.actors.getName('Atiradora').rolarPericia('handgun').then(t => ({ total: t.total, critico: t.critico }))`);
      await fixar(edge, [[5, 10]]);
      const normal = await edge.evaluate(`game.actors.getName('Atiradora').rolarPericia('handgun').then(t => ({ total: t.total, critico: t.critico, dados: t.roll.dice[0].results.length }))`);
      const cartao = await edge.evaluate(`(() => { const m = game.messages.contents.at(-3); return { teste: m.getFlag('${S}', 'teste')?.rotulo, rolagens: m.rolls.length }; })()`);
      return [alto.total === 25 && alto.critico === 'sucesso' && baixo.total === 9 && baixo.critico === 'falha' && normal.total === 17 && normal.dados === 1 && cartao.rolagens === 1,
        `10+3: ${alto.total} (${alto.formula}) · 1−4: ${baixo.total} · 5: ${normal.total} · cartão ${JSON.stringify(cartao)}`];
    });

    await r.passo('ficha: abre com as abas e rola pelo atributo', async () => {
      await edge.evaluate(`game.actors.getName('Atiradora').sheet.render({ force: true })`);
      let ficha = null;
      for (let i = 0; i < 30 && !ficha; i++) { await edge.sleep(200); ficha = await edge.evaluate(`(() => { const f = document.querySelector('.cpr-fieldbook.ficha-personagem'); return f && { abas: f.querySelectorAll('nav.tabs [data-tab]').length, atributos: f.querySelectorAll('.atributo').length, pericias: f.querySelectorAll('.pericia').length, hp: f.querySelector('.vital.hp .valor')?.textContent.trim() }; })()`); }
      const antes = await edge.evaluate('game.messages.size');
      await edge.evaluate(`document.querySelector('.cpr-fieldbook.ficha-personagem .atributo[data-atributo="ref"] .rolar').click()`);
      await edge.sleep(800);
      const depois = await edge.evaluate('game.messages.size');
      await edge.shot('ficha');
      return [ficha && ficha.abas === 5 && ficha.atributos === 10 && ficha.pericias >= 61 && depois === antes + 1, `${JSON.stringify(ficha)} · mensagens ${antes} → ${depois}`];
    });

    await r.passo('ficha: mudar o REF e o nível de Furtividade na ficha grava no ator', async () => {
      const mudar = (nome, valor) => edge.evaluate(`(() => {
        const campo = document.querySelector('.cpr-fieldbook.ficha-personagem input[name="${nome}"]');
        campo.value = ${valor};
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      await mudar('system.atributos.ref.valor', 9);
      await edge.sleep(600);
      await mudar('system.pericias.stealth.nivel', 3);
      await edge.sleep(600);
      const info = await edge.evaluate(`(() => { const a = game.actors.getName('Atiradora'); return { ref: a.system.atributos.ref.valor, furtividade: a.system.pericias.stealth?.nivel, total: a.system.pericia('stealth').nivel + a.system.atributos.dex.valor }; })()`);
      // Volta o REF para 8: os passos de combate contam com ele.
      await edge.evaluate(`game.actors.getName('Atiradora').update({ 'system.atributos.ref.valor': 8 }).then(() => true)`);
      return [info.ref === 9 && info.furtividade === 3 && info.total === 10, JSON.stringify(info)];
    });

    await r.passo('catálogo: rifle, armadura, munição e Kerenzikov entram na ficha; o efeito só vale instalado', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = game.actors.getName('Atiradora');
        const pegar = id => { const d = foundry.utils.deepClone(cat[id]); return d; };
        const municao = pegar('core_ammo:rifle-basic'); municao.system.quantidade = 50;
        await a.createEmbeddedDocuments('Item', [pegar('core_weapons:assault-rifle'), pegar('core_armor:light-armorjack-body'), municao, pegar('core_cyberware:kerenzikov')]);
        const ker = a.items.getName('Kerenzikov');
        const antes = { ini: a.system.iniciativa, efeitoAtivo: ker.effects.contents[0]?.active };
        await a.items.getName('Light Armorjack (Body)').update({ 'system.equipada': true });
        await a.instalarCyberware(ker, { rolar: false });
        return { antes, depois: { ini: a.system.iniciativa, efeitoAtivo: ker.effects.contents[0]?.active, hum: a.system.humanidade.value, emp: a.system.empAtual, sp: a.system.armadura.corpo.sp }, itens: a.items.size, tamanhoCatalogo: Object.keys(cat).length };
      })()`);
      return [info.antes.ini === 8 && info.antes.efeitoAtivo === false && info.depois.ini === 10 && info.depois.efeitoAtivo === true && info.depois.hum === 36 && info.depois.emp === 3 && info.depois.sp === 11 && info.itens === 4,
        JSON.stringify(info)];
    });

    await r.passo('recarregar: o pente do rifle enche (25) e sai da munição (sobram 25)', async () => {
      const info = await edge.evaluate(`(async () => {
        const a = game.actors.getName('Atiradora');
        const rifle = a.items.getName('Assault Rifle');
        await rifle.update({ 'system.equipada': true });
        const r = await rifle.recarregar();
        return { r, pente: rifle.system.pente.value, sobra: a.items.getName('Rifle (Basic)').system.quantidade, carregada: rifle.municaoCarregada?.name };
      })()`);
      return [info.pente === 25 && info.sobra === 25 && info.carregada === 'Rifle (Basic)', JSON.stringify(info)];
    });

    // ---------- Combate ----------
    // Ajudantes no navegador do mestre: o token e o ator pelo nome, o resumo de cada alvo do cartão e esperar.
    await edge.evaluate(`(() => {
      window.__token = nome => canvas.scene.tokens.find(t => t.name === nome);
      window.__ator = nome => game.actors.getName(nome);
      window.__linhas = r => r.linhas.map(l => ({ nome: l.nome, resultado: l.resultado, escolha: l.escolha, defesa: l.defesa, dv: l.dv, metros: l.metros, mult: l.multiplicador,
        dano: l.dano && { dano: l.dano.dano, critico: l.dano.critico, recebido: l.dano.recebido, ablado: l.dano.ablado, lesoes: l.dano.lesoes.map(x => x.nome) } }));
      window.__esperar = async (condicao, vezes = 100) => { for (let i = 0; i < vezes && !condicao(); i++) await new Promise(r => setTimeout(r, 100)); return condicao(); };
      return true;
    })()`);
    // No navegador de quem defende: espera a janela da defesa e clica na escolha.
    const responder = async (navegador, escolha) => {
      for (let i = 0; i < 60; i++) {
        await navegador.sleep(250);
        const ok = await navegador.evaluate(`(() => { const b = document.querySelector('.application.dialog.cpr-fieldbook.defesa .form-footer button[data-action="${escolha}"]'); if (!b) return false; b.click(); return true; })()`).catch(() => false);
        if (ok) return true;
      }
      return false;
    };

    // Cena: a Atiradora em x 300; o Alvo a 10 m (5 quadrados de 2 m); o Capanga a 2 m do Alvo; o Longe a 28 m.
    await r.passo('cena: Atiradora, Alvo (armadura SP 11, REF 6), Capanga ao lado do Alvo e um token longe', async () => {
      const info = await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const armadura = foundry.utils.deepClone(cat['core_armor:light-armorjack-body']);
        armadura.system.equipada = true;
        const alvo = await Actor.implementation.create({ name: 'Alvo', type: 'personagem', system: { atributos: { body: { valor: 6 }, will: { valor: 7 }, ref: { valor: 6 }, dex: { valor: 7 } }, hp: { value: 45 }, pericias: { evasion: { nivel: 2 } } }, items: [armadura] });
        const capanga = await Actor.implementation.create({ name: 'Capanga', type: 'personagem', system: { atributos: { body: { valor: 5 }, will: { valor: 5 }, ref: { valor: 6 } }, hp: { value: 35 } } });
        const longe = await Actor.implementation.create({ name: 'Longe', type: 'personagem', system: { hp: { value: 40 } } });
        const cena = await Scene.implementation.create({ name: 'Teste de combate', width: 2200, height: 1200, grid: { size: 100, distance: 2, units: 'm' } });
        // Espera o canvas desenhar a cena e os tokens: mexer num item com o token ainda sendo desenhado quebra o core
        // (RenderFlags.set em TokenDocument#_onRelatedUpdate).
        await cena.activate();
        await __esperar(() => canvas.ready && canvas.scene?.id === cena.id);
        const token = async (ator, x) => (await ator.getTokenDocument({ x, y: 500 })).toObject();
        await cena.createEmbeddedDocuments('Token', [await token(__ator('Atiradora'), 300), await token(alvo, 800), await token(capanga, 900), await token(longe, 1700)]);
        await __esperar(() => canvas.tokens.placeables.length === 4);
        await new Promise(r => setTimeout(r, 500));
        const d = nome => game.system.api.combate.distancia(__token('Atiradora'), __token(nome));
        return { tokens: cena.tokens.size, alvo: d('Alvo'), capanga: d('Capanga'), longe: d('Longe'), sp: alvo.system.armadura.corpo.sp };
      })()`);
      return [info.tokens === 4 && info.alvo === 10 && info.capanga === 12 && info.longe === 28 && info.sp === 11, JSON.stringify(info)];
    });

    await r.passo('tiro: 19 contra DV 16 a 10 m; dano 21 com crítico (SP 11 segura 11; entram 10 + 5); a armadura perde 1; Lesão Crítica 8: Perna quebrada (−4 MOVE)', async () => {
      // Ataque: d10 7 → REF 8 + Armas Longas 4 + 7 = 19. Dano 5d6: 6, 6, 2, 3, 4 = 21 (dois 6: crítico). Lesão: 2d6 4 + 4 = 8.
      await fixar(edge, [[7, 10], [6, 6], [6, 6], [2, 6], [3, 6], [4, 6], [4, 6], [4, 6]]);
      const info = await edge.evaluate(`(async () => {
        const rifle = __ator('Atiradora').items.getName('Assault Rifle');
        const r = await rifle.atacar({ alvo: __token('Alvo') });
        const alvo = __ator('Alvo');
        return { ataque: r.ataque, linhas: __linhas(r), hp: alvo.system.hp.value, sp: alvo.system.armadura.corpo.sp, move: alvo.system.atributos.move.valor,
          lesoes: alvo.items.filter(i => i.type === 'lesao').map(i => i.name), pente: rifle.system.pente.value, cartao: game.messages.contents.at(-1).getFlag('${S}', 'ataque')?.linhas[0]?.resultado };
      })()`);
      const [l] = info.linhas;
      await edge.evaluate('game.actors.getName("Atiradora").sheet.close().then(() => true)');
      await edge.sleep(400);
      await edge.shot('ataque');
      return [info.ataque === 19 && l.dv === 16 && l.resultado === 'acertou' && l.escolha === 'aguentar' && l.dano?.dano === 21 && l.dano.critico && l.dano.recebido === 15 && l.dano.lesoes.join() === 'Perna quebrada'
        && info.hp === 30 && info.sp === 10 && info.move === 1 && info.lesoes.join() === 'Perna quebrada' && info.pente === 24 && info.cartao === 'acertou', JSON.stringify(info)];
    });

    await r.passo('Desfazer: o botão do cartão (só do mestre) devolve o HP e o SP e tira a Perna quebrada', async () => {
      const info = await edge.evaluate(`(async () => {
        const m = game.messages.contents.findLast(msg => msg.getFlag('${S}', 'desfazer')?.length);
        const botao = document.querySelector(\`[data-message-id="\${m.id}"] [data-cprf-acao="desfazer"]\`);
        botao?.click();
        await __esperar(() => m.getFlag('${S}', 'desfeito'));
        const alvo = __ator('Alvo');
        return { botao: Boolean(botao), desfeito: Boolean(m.getFlag('${S}', 'desfeito')), hp: alvo.system.hp.value, sp: alvo.system.armadura.corpo.sp, move: alvo.system.atributos.move.valor, lesoes: alvo.items.filter(i => i.type === 'lesao').length };
      })()`);
      return [info.botao && info.desfeito && info.hp === 45 && info.sp === 11 && info.move === 5 && info.lesoes === 0, JSON.stringify(info)];
    });

    await r.passo('mirado na cabeça sem armadura na cabeça: −8 no ataque e o dano dobra', async () => {
      // Ataque: d10 10 + 9 (crítico) → 8 + 4 + 19 − 8 = 23 contra DV 16. Dano: 1, 2, 3, 4, 5 = 15 → ×2 = 30.
      await fixar(edge, [[10, 10], [9, 10], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6]]);
      const info = await edge.evaluate(`(async () => {
        const r = await __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo'), local: 'cabeca' });
        return { ataque: r.ataque, linhas: __linhas(r), hp: __ator('Alvo').system.hp.value };
      })()`);
      const [l] = info.linhas;
      return [info.ataque === 23 && l.resultado === 'acertou' && l.dano?.recebido === 30 && info.hp === 15, JSON.stringify(info)];
    });

    await r.passo('mirado na perna: o dano que passa da armadura do corpo dá Perna quebrada, sem rolar a tabela', async () => {
      // Ataque: d10 10 + 6 → 8 + 4 + 16 − 8 = 20 contra DV 16. Dano: 3 × 5 = 15 contra SP 11 (o corpo protege a perna): passam 4.
      await fixar(edge, [[10, 10], [6, 10], [3, 6], [3, 6], [3, 6], [3, 6], [3, 6]]);
      const info = await edge.evaluate(`(async () => {
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        const r = await __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo'), local: 'perna' });
        const alvo = __ator('Alvo');
        const lesoes = alvo.items.filter(i => i.type === 'lesao').map(i => i.name);
        await alvo.deleteEmbeddedDocuments('Item', alvo.items.filter(i => i.type === 'lesao').map(i => i.id));
        return { ataque: r.ataque, linhas: __linhas(r), hp: alvo.system.hp.value, lesoes };
      })()`);
      const [l] = info.linhas;
      return [info.ataque === 20 && l.dano?.recebido === 4 && info.hp === 41 && info.lesoes.join() === 'Perna quebrada' && l.dano.lesoes.join() === 'Perna quebrada', JSON.stringify(info)];
    });

    await r.passo('autofogo: REF 8 + Autofogo 4 + 19 = 31 contra DV 20 (tabela de autofogo): 2d6 × 4 (o máximo da arma), 10 balas', async () => {
      // Ataque: d10 10 + 9 → 31 contra DV 20 (Assault Rifle Autofire, 7–12 m). Multiplicador: 31 − 20 = 11, até 4. Dano 2d6: 3 + 4 = 7 → × 4 = 28.
      await fixar(edge, [[10, 10], [9, 10], [3, 6], [4, 6]]);
      const info = await edge.evaluate(`(async () => {
        const a = __ator('Atiradora');
        await a.update({ 'system.pericias.autofire.nivel': 4 });
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        const rifle = a.items.getName('Assault Rifle');
        const antes = rifle.system.pente.value;
        const sp = __ator('Alvo').system.armadura.corpo.sp;
        const r = await rifle.atacar({ alvo: __token('Alvo'), modo: 'autofogo' });
        return { ataque: r.ataque, linhas: __linhas(r), sp, hp: __ator('Alvo').system.hp.value, gastou: antes - rifle.system.pente.value };
      })()`);
      const [l] = info.linhas;
      return [info.ataque === 31 && l.dv === 20 && l.mult === 4 && l.dano?.dano === 28 && l.dano.recebido === 28 - info.sp && info.hp === 45 - (28 - info.sp) && info.gastou === 10, JSON.stringify(info)];
    });

    // ---------- O jogador do alvo defende no computador dele ----------
    await r.passo('jogador: entra no mesmo mundo, dono do Alvo (agora REF 8, pode esquivar de tiro)', async () => {
      await edge.evaluate(`(async () => {
        // Com o personagem já escolhido, o Foundry não abre a configuração do jogador na primeira entrada.
        const u = await User.implementation.create({ name: 'Jogador', role: CONST.USER_ROLES.PLAYER, character: __ator('Alvo').id });
        await __ator('Alvo').update({ ownership: { [u.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }, 'system.atributos.ref.valor': 8, 'system.hp.value': 45 });
      })()`);
      jogador = await abrirEdge({ porta: 9460, saida: path.join(servidores.raiz, 'tests', '.saida'), prefixo: 'v14-jogador-' });
      await foundry14.entrarComo(jogador, mesa.url, 'Jogador');
      const info = await jogador.evaluate(`({ nome: game.user.name, gm: game.user.isGM, dono: game.actors.getName('Alvo')?.isOwner })`);
      const ativo = await edge.evaluate(`game.users.getName('Jogador').active`);
      return [info.nome === 'Jogador' && !info.gm && info.dono && ativo, JSON.stringify({ ...info, ativo })];
    });

    await r.passo('jogador: recebe a pergunta sem ver o total do ataque, esquiva e vence (DEX 7 + Evasão 2 + 10 + 6); depois, o total aparece para ele', async () => {
      // Mestre: ataque d10 4 → 8 + 4 + 4 = 16. Jogador: esquiva d10 10 + 6 → 7 + 2 + 16 = 25.
      await fixar(edge, [[4, 10]]);
      await fixar(jogador, [[10, 10], [6, 10]]);
      await edge.evaluate(`(() => { window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ alvo: __token('Alvo') }); return true; })()`);
      let janela = null;
      for (let i = 0; i < 40 && !janela; i++) {
        await jogador.sleep(250);
        janela = await jogador.evaluate(`(() => { const d = document.querySelector('.application.dialog.cpr-fieldbook.defesa'); return d && { texto: d.textContent.replace(/\\s+/g, ' ').trim(), botoes: [...d.querySelectorAll('.form-footer button[data-action]')].map(b => b.dataset.action) }; })()`);
      }
      // O total do ataque (16) não aparece para o jogador antes da defesa: a rolagem foi só para o mestre. O Foundry mostra
      // que houve uma rolagem privada (visible), mas não o conteúdo (isContentVisible).
      const ultimoAtaque = `game.messages.contents.filter(m => m.getFlag('${S}', 'teste')?.ataque).at(-1)`;
      const antes = await jogador.evaluate(`Boolean(${ultimoAtaque}?.isContentVisible)`);
      await jogador.shot('defesa');
      await jogador.evaluate(`document.querySelector('.application.dialog.cpr-fieldbook.defesa button[data-action="esquivar"]').click()`);
      const info = await edge.evaluate(`window.__ataque.then(r => ({ ataque: r.ataque, linhas: __linhas(r), hp: __ator('Alvo').system.hp.value }))`);
      await jogador.sleep(500);
      const depois = await jogador.evaluate(`Boolean(${ultimoAtaque}?.isContentVisible)`);
      const [l] = info.linhas;
      return [janela && janela.botoes.join() === 'esquivar,aguentar' && !/\b16\b/.test(janela.texto) && !antes && depois && l.escolha === 'esquivar' && l.defesa === 25 && l.resultado === 'esquivou' && info.hp === 45,
        `janela ${JSON.stringify(janela)} · total visível ao jogador antes ${antes}, depois ${depois} · ${JSON.stringify(info)}`];
    });

    await r.passo('explosivo: lança-granadas (perfurante) contra DV 15; explode na área: o Alvo (aguentou) e o Capanga ao lado levam os mesmos 12; o Longe fica fora', async () => {
      // Ataque: d10 9 → REF 8 + Armas Pesadas 4 + 9 = 21 contra DV 15 (Grenade Launcher, 7–12 m). Dano 6d6: 1, 2, 3, 1, 2, 3 = 12.
      await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const granadas = foundry.utils.deepClone(cat['core_ammo:grenade-armor-piercing']);
        granadas.system.quantidade = 4;
        const lanca = foundry.utils.deepClone(cat['core_weapons:grenade-launcher']);
        lanca.system.equipada = true;
        await a.createEmbeddedDocuments('Item', [lanca, granadas]);
        await a.update({ 'system.pericias.heavy-weapons.nivel': 4 });
        await a.items.getName('Grenade Launcher').recarregar();
        await __ator('Alvo').update({ 'system.hp.value': 45 });
        return true;
      })()`);
      await fixar(edge, [[9, 10], [1, 6], [2, 6], [3, 6], [1, 6], [2, 6], [3, 6]]);
      const antes = await edge.evaluate(`({ alvoSp: __ator('Alvo').system.armadura.corpo.sp, capanga: __ator('Capanga').system.hp.value, longe: __ator('Longe').system.hp.value })`);
      await edge.evaluate(`(() => { window.__ataque = __ator('Atiradora').items.getName('Grenade Launcher').atacar({ alvo: __token('Alvo') }); return true; })()`);
      const clicou = await responder(jogador, 'aguentar');
      const info = await edge.evaluate(`window.__ataque.then(r => ({ cabecalho: r.cabecalho, linhas: __linhas(r), alvo: __ator('Alvo').system.hp.value, alvoSp: __ator('Alvo').system.armadura.corpo.sp, capanga: __ator('Capanga').system.hp.value, longe: __ator('Longe').system.hp.value }))`);
      const alvo = info.linhas.find(l => l.nome === 'Alvo');
      const capanga = info.linhas.find(l => l.nome === 'Capanga');
      return [clicou && info.linhas.length === 2 && alvo?.escolha === 'aguentar' && alvo.dano?.dano === 12 && capanga?.dano?.dano === 12 && info.capanga === antes.capanga - 12 && info.longe === antes.longe
        && info.alvo === 45 - Math.max(0, 12 - antes.alvoSp) && info.alvoSp === antes.alvoSp - 2, JSON.stringify({ antes, ...info })];
    });

    await r.passo('cartucho: espingarda contra DV 13; o Capanga a 4 m leva 3d6, o Alvo a 10 m fica fora dos 6 m', async () => {
      // O Capanga vai para x 500 (4 m). Ataque: d10 8 → REF 8 + Armas Longas 4 + 8 = 20 > 13. Dano 3d6: 2 + 2 + 2 = 6.
      await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const a = __ator('Atiradora');
        const cartuchos = foundry.utils.deepClone(cat['core_ammo:shotgun-shell-basic']);
        cartuchos.system.quantidade = 8;
        const espingarda = foundry.utils.deepClone(cat['core_weapons:shotgun']);
        espingarda.system.equipada = true;
        await a.createEmbeddedDocuments('Item', [espingarda, cartuchos]);
        await a.items.getName('Shotgun').recarregar();
        await __token('Capanga').update({ x: 500 }, { animate: false });
        await __esperar(() => canvas.tokens.get(__token('Capanga').id)?.document.x === 500);
        await new Promise(r => setTimeout(r, 300));
        return true;
      })()`);
      await fixar(edge, [[8, 10], [2, 6], [2, 6], [2, 6]]);
      const antes = await edge.evaluate(`({ capanga: __ator('Capanga').system.hp.value, alvo: __ator('Alvo').system.hp.value })`);
      const info = await edge.evaluate(`(async () => {
        const r = await __ator('Atiradora').items.getName('Shotgun').atacar({ alvos: [__token('Capanga'), __token('Alvo')] });
        return { modo: r.modo, cabecalho: r.cabecalho, linhas: __linhas(r), capanga: __ator('Capanga').system.hp.value, alvo: __ator('Alvo').system.hp.value };
      })()`);
      const capanga = info.linhas.find(l => l.nome === 'Capanga');
      const alvo = info.linhas.find(l => l.nome === 'Alvo');
      return [info.modo === 'cartucho' && /acertou/.test(info.cabecalho) && capanga?.dano?.dano === 6 && info.capanga === antes.capanga - 6 && alvo?.resultado === 'fora' && info.alvo === antes.alvo, JSON.stringify({ antes, ...info })];
    });

    await r.passo('jogador ataca: rola no computador dele, o mestre resolve e pede o dano, que o jogador rola (12)', async () => {
      // Alvo (do Jogador) com a pistola pesada: d10 9 → REF 8 + Pistola 3 + 9 = 20 contra DV 13 (Pistol, 0–6 m: o Capanga a 6 m). Dano 3d6: 4 + 4 + 4 = 12.
      await edge.evaluate(`(async () => {
        const cat = await game.system.api.wiki.carregarCatalogo();
        const alvo = __ator('Alvo');
        const balas = foundry.utils.deepClone(cat['core_ammo:heavy-pistol-basic']);
        balas.system.quantidade = 16;
        const pistola = foundry.utils.deepClone(cat['core_weapons:heavy-pistol']);
        pistola.system.equipada = true;
        await alvo.createEmbeddedDocuments('Item', [pistola, balas]);
        await alvo.update({ 'system.pericias.handgun.nivel': 3 });
        await alvo.items.getName('Heavy Pistol').recarregar();
        return true;
      })()`);
      const antes = await edge.evaluate(`__ator('Capanga').system.hp.value`);
      await fixar(jogador, [[9, 10], [4, 6], [4, 6], [4, 6]]);
      const pedido = await jogador.evaluate(`(async () => {
        const capanga = canvas.scene.tokens.find(t => t.name === 'Capanga');
        const p = await game.actors.getName('Alvo').items.getName('Heavy Pistol').atacar({ alvo: capanga });
        return p && { total: p.total, modo: p.modo };
      })()`);
      let depois = antes;
      for (let i = 0; i < 40 && depois === antes; i++) { await edge.sleep(250); depois = await edge.evaluate(`__ator('Capanga').system.hp.value`); }
      const autorDoDano = await edge.evaluate(`game.messages.contents.findLast(m => /Dano: Heavy Pistol/.test(m.content))?.author?.name ?? null`);
      return [pedido?.total === 20 && depois === antes - 12 && autorDoDano === 'Jogador', JSON.stringify({ pedido, antes, depois, autorDoDano })];
    });

    await r.passo('fogo supressivo sem alvo: pega quem está a até 25 m (Alvo e Capanga, não o Longe); quem perde a Concentração fica Suprimido', async () => {
      // Ataque: d10 10 + 9 → REF 8 + Autofogo 4 + 19 = 31. Capanga (mestre): WILL 5 + 2 − 2 (gravemente ferido) = 5. Jogador: WILL 7 + 1 − 4 = 4.
      await edge.evaluate(`__ator('Atiradora').items.getName('Assault Rifle').recarregar().then(() => true)`);
      await fixar(edge, [[10, 10], [9, 10], [2, 10]]);
      await fixar(jogador, [[1, 10], [4, 10]]);
      await edge.evaluate(`(() => { window.__ataque = __ator('Atiradora').items.getName('Assault Rifle').atacar({ modo: 'supressivo' }); return true; })()`);
      const clicou = await responder(jogador, 'concentrar');
      const info = await edge.evaluate(`window.__ataque.then(r => ({ cabecalho: r.cabecalho, linhas: __linhas(r), status: ['Alvo', 'Capanga', 'Longe'].map(n => __ator(n).statuses.has('${S}-suprimido')) }))`);
      const alvo = info.linhas.find(l => l.nome === 'Alvo');
      const capanga = info.linhas.find(l => l.nome === 'Capanga');
      await edge.sleep(400);
      await edge.shot('supressivo');
      return [clicou && info.linhas.length === 2 && alvo?.resultado === 'suprimido' && capanga?.resultado === 'suprimido' && info.status.join() === 'true,true,false', JSON.stringify(info)];
    });

    await r.passo('turnos: o Suprimido sai no fim do próximo turno; o Death Save do Capanga (HP 0) passa com 3 < BODY 5 e depois falha com o 10', async () => {
      // Iniciativas fixas: Atiradora 20, Alvo 15, Capanga 10.
      const passos = await edge.evaluate(`(async () => {
        await __ator('Capanga').update({ 'system.hp.value': 0 });
        const cena = canvas.scene;
        const combate = await Combat.implementation.create({ scene: cena.id, active: true });
        await combate.createEmbeddedDocuments('Combatant', ['Atiradora', 'Alvo', 'Capanga'].map(n => ({ tokenId: __token(n).id, sceneId: cena.id, actorId: __ator(n).id })));
        for (const [nome, valor] of [['Atiradora', 20], ['Alvo', 15], ['Capanga', 10]]) await combate.setInitiative(combate.combatants.find(c => c.name === nome).id, valor);
        const passos = [];
        await combate.startCombat();
        await combate.nextTurn();
        await new Promise(r => setTimeout(r, 400));
        window.__fila = [[3, 10]];
        await combate.nextTurn();
        await __esperar(() => __ator('Capanga').system.deathSave.penalidade === 1, 50);
        await __esperar(() => !__ator('Alvo').statuses.has('${S}-suprimido'), 30);
        passos.push({ vez: combate.combatant?.name, alvoSuprimido: __ator('Alvo').statuses.has('${S}-suprimido'), capangaSuprimido: __ator('Capanga').statuses.has('${S}-suprimido'), penalidade: __ator('Capanga').system.deathSave.penalidade });
        await combate.nextTurn();
        await __esperar(() => !__ator('Capanga').statuses.has('${S}-suprimido'), 50);
        passos.push({ vez: combate.combatant?.name, rodada: combate.round, capangaSuprimido: __ator('Capanga').statuses.has('${S}-suprimido') });
        await combate.nextTurn();
        await new Promise(r => setTimeout(r, 400));
        window.__fila = [[10, 10]];
        await combate.nextTurn();
        await __esperar(() => combate.combatants.find(c => c.name === 'Capanga').isDefeated, 50);
        passos.push({ vez: combate.combatant?.name, derrotado: combate.combatants.find(c => c.name === 'Capanga').isDefeated, morto: __ator('Capanga').statuses.has(CONFIG.specialStatusEffects.DEFEATED) });
        return passos;
      })()`);
      const [a, b, c] = passos;
      return [a.vez === 'Capanga' && !a.alvoSuprimido && a.capangaSuprimido && a.penalidade === 1 && b.rodada === 2 && !b.capangaSuprimido && c.derrotado && c.morto, JSON.stringify(passos)];
    });

    // ---------- Importar da wiki ----------
    await r.passo('wiki: importa o Solo com STATs, HP, perícias, Role, armas carregadas, armadura vestida e cyberware instalado', async () => {
      await edge.evaluate(`game.settings.set('${S}', 'wikiUrl', ${JSON.stringify(wiki)})`);
      const info = await edge.evaluate(`(async () => {
        const { ator, notas } = await game.system.api.wiki.importarPersonagem(${JSON.stringify(solo.id)}, '');
        const s = ator.system;
        return {
          nome: ator.name, stats: Object.fromEntries(Object.entries(s.atributos).map(([k, v]) => [k, v.valor])), hp: [s.hp.value, s.hp.max], hum: [s.humanidade.value, s.humanidade.max],
          role: [s.role.nome, s.role.rank, s.role.habilidades], pericias: Object.keys(s.pericias).length, evasao: s.pericias.evasion?.nivel, lingua: Object.keys(s.pericias).filter(k => k.startsWith('language-')),
          armas: ator.items.filter(i => i.type === 'arma').map(i => [i.name, i.system.equipada, i.system.pente.value, i.system.pente.max]),
          armaduras: ator.items.filter(i => i.type === 'armadura').map(i => [i.name, i.system.equipada]), sp: s.armadura.corpo.sp,
          cyber: ator.items.filter(i => i.type === 'cyberware').map(i => [i.name, i.system.instalado]), dinheiro: s.dinheiro, notas
        };
      })()`);
      const st = solo.resultado.stats;
      const statsOk = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'move', 'body'].every(k => info.stats[k] === st[k.toUpperCase()]);
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const armasOk = info.armas.length > 0 && info.armas.filter(([, , , max]) => max > 0).every(([, equipada, valor, max]) => equipada && valor === max);
      return [info.nome === 'Teste Sistema' && statsOk && info.hp[0] === solo.resultado.derivados.hp && info.hp[1] === solo.resultado.derivados.hp && info.role[0] === 'Solo' && info.role[1] === 4
        && info.role[2]['Initiative Reaction'] === 2 && info.evasao >= 2 && info.lingua.length >= 1 && armasOk && info.armaduras.every(([, v]) => v) && info.sp === 11 && info.cyber.every(([, inst]) => inst) && info.dinheiro === solo.resultado.dinheiro.saldo
        && doc.foundry?.ator, `${JSON.stringify(info)} · wiki: ${doc.estadoFoundry} ${doc.foundry?.ator || ''}`];
    });
    await edge.evaluate(`game.actors.find(a => a.getFlag('${S}', 'wiki'))?.sheet.render({ force: true })`);
    await edge.sleep(1200);
    await edge.shot('importado');
  } finally {
    if (jogador) {
      await jogador.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
      const doSistema = jogador.erros.filter(erro => /cpr-fieldbook/.test(erro));
      edge.erros.push(...doSistema.map(erro => `jogador: ${erro}`));
      await jogador.fechar();
    }
    // Sai do Foundry antes de desligar (senão a página reclama da conexão perdida).
    await edge.send('Page.navigate', { url: 'about:blank' });
    await edge.sleep(500);
    // Erros do próprio Foundry não contam; os do sistema, sim.
    const doFoundry = edge.erros.splice(errosAntes);
    edge.erros.push(...doFoundry.filter(erro => /cpr-fieldbook/.test(erro)));
    await mesa.parar();
  }
};
